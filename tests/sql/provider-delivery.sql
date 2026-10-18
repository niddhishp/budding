begin;
insert into auth.users(id,email,email_confirmed_at) values ('e1000000-0000-4000-8000-000000000001','transport-a@example.invalid',now()),('e1000000-0000-4000-8000-000000000002','transport-b@example.invalid',now());
insert into public.consents(user_id,policy_version) select id,'2026-10-05' from auth.users where email like 'transport-%';
insert into public.children(id,user_id,name,dob) values('e1000000-0000-4000-8000-000000000021','e1000000-0000-4000-8000-000000000001','Synthetic','2020-01-01');
insert into public.decodes(id,child_id,user_id,scenario,analysis,channel,created_at) values
 ('e1000000-0000-4000-8000-000000000031','e1000000-0000-4000-8000-000000000021','e1000000-0000-4000-8000-000000000001','Older synthetic','{}','whatsapp',now()-interval '1 hour'),
 ('e1000000-0000-4000-8000-000000000032','e1000000-0000-4000-8000-000000000021','e1000000-0000-4000-8000-000000000001','Newer synthetic','{}','whatsapp',now());
insert into public.whatsapp_link_codes(user_id,code,expires_at) values ('e1000000-0000-4000-8000-000000000001',repeat('A',32),now()+interval '15 minutes'),('e1000000-0000-4000-8000-000000000002',repeat('B',32),now()+interval '15 minutes');
set local role authenticated;
do $$ begin
 begin perform public.receive_whatsapp('SM'||repeat('1',32),'+19999999991','hello',false);raise exception 'Parent could enqueue arbitrary phone';exception when insufficient_privilege then null;end;
 begin perform 1 from public.whatsapp_jobs;raise exception 'Parent could read transport';exception when insufficient_privilege then null;end;
 begin perform public.record_email_delivery('x','y','email.delivered',now());raise exception 'Parent could forge receipt';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role service_role;
do $$ declare r text; j jsonb; token uuid; begin
 r:=public.receive_whatsapp('SM'||repeat('1',32),'+19999999991','LINK '||repeat('A',32),false);
 if r<>'recorded' or not exists(select 1 from public.whatsapp_links where phone='+19999999991' and user_id='e1000000-0000-4000-8000-000000000001') then raise exception 'Link failed'; end if;
 if exists(select 1 from public.whatsapp_link_codes where code=repeat('A',32)) then raise exception 'Token not consumed';end if;
 r:=public.receive_whatsapp('SM'||repeat('1',32),'+19999999991','STOP',false);if r<>'duplicate' then raise exception 'Replay altered receipt';end if;
 perform public.receive_whatsapp('SM'||repeat('2',32),'+19999999991','LINK '||repeat('B',32),false);
 if exists(select 1 from public.whatsapp_links where user_id='e1000000-0000-4000-8000-000000000002') then raise exception 'Silent takeover allowed';end if;
 update public.whatsapp_links set last_child_id='e1000000-0000-4000-8000-000000000021' where phone='+19999999991';
 perform public.receive_whatsapp('SM'||repeat('8',32),'+19999999991','1',false);
 j:=public.claim_whatsapp('SM'||repeat('8',32),false);
 perform public.record_whatsapp_feedback('SM'||repeat('8',32),'worked');
 if public.claim_whatsapp('SM'||repeat('8',32),false) is not null then raise exception 'Feedback repeated after preparation crash';end if;
 if (select count(*) from public.decodes where user_id='e1000000-0000-4000-8000-000000000001' and outcome='worked')<>1 then raise exception 'Feedback affected more than latest decode';end if;
 perform public.receive_whatsapp('SM'||repeat('3',32),'+19999999991','A parenting moment',false);
 j:=public.claim_whatsapp('SM'||repeat('3',32),false); token:=(j->>'lease')::uuid;
 if j is null or public.claim_whatsapp('SM'||repeat('3',32),false) is not null then raise exception 'Preparation lease duplicated';end if;
 if public.finish_whatsapp('SM'||repeat('3',32),gen_random_uuid(),'wrong',null,null) then raise exception 'Wrong lease accepted';end if;
 perform public.finish_whatsapp('SM'||repeat('3',32),token,'A prepared reply',null,null);
 j:=public.claim_whatsapp('SM'||repeat('3',32),true);token:=(j->>'lease')::uuid;
 if public.claim_whatsapp('SM'||repeat('3',32),true) is not null then raise exception 'Send lease duplicated';end if;
 -- Callback races the HTTP response; late acceptance cannot regress delivery.
 perform public.record_whatsapp_status('SM'||repeat('3',32),'SM'||repeat('9',32),'delivered',null);
 perform public.finish_whatsapp('SM'||repeat('3',32),token,null,'SM'||repeat('9',32),null);
 perform public.record_whatsapp_status('SM'||repeat('3',32),'SM'||repeat('9',32),'sent',null);
 if not exists(select 1 from public.whatsapp_jobs where id='SM'||repeat('3',32) and delivery_status='delivered' and body='' and response is null) then raise exception 'Delivery regressed or text retained';end if;
 -- Ambiguous external send must never be blindly retried.
 j:=public.claim_whatsapp('SM'||repeat('1',32),true);
 perform public.finish_whatsapp('SM'||repeat('1',32),(j->>'lease')::uuid,null,null,'Uncertain');
 if public.claim_whatsapp('SM'||repeat('1',32),true) is not null then raise exception 'Ambiguous send retried';end if;
 -- STOP cancels queued work immediately, even if generation is running.
 perform public.receive_whatsapp('SM'||repeat('4',32),'+19999999991','Another moment',false);
 j:=public.claim_whatsapp('SM'||repeat('4',32),false);
 perform public.receive_whatsapp('SM'||repeat('5',32),'+19999999991','STOP',false);
 perform public.finish_whatsapp('SM'||repeat('4',32),(j->>'lease')::uuid,'Late private reply',null,null);
 if public.claim_whatsapp('SM'||repeat('4',32),true) is not null or exists(select 1 from public.whatsapp_links where phone='+19999999991') then raise exception 'STOP failed';end if;
 -- Revoked consent and expired reply windows suppress sending.
 perform public.receive_whatsapp('SM'||repeat('6',32),'+19999999992','LINK '||repeat('B',32),false);
 delete from public.consents where user_id='e1000000-0000-4000-8000-000000000002';
 if public.claim_whatsapp('SM'||repeat('6',32),true) is not null then raise exception 'Revoked consent sent';end if;
 update public.whatsapp_jobs set created_at=now()-interval '24 hours' where id='SM'||repeat('5',32);
 if public.claim_whatsapp('SM'||repeat('5',32),true) is not null then raise exception 'Expired reply sent';end if;
end $$;
reset role;
insert into public.expert_requests(id,user_id,concern,phone) values('e1000000-0000-4000-8000-000000000011','e1000000-0000-4000-8000-000000000001','Synthetic','1234567890');
set local role service_role;
do $$ declare j jsonb;begin
 perform public.record_email_delivery('event1','email-1','email.delivered',now());
 j:=public.claim_consultation_alert('e1000000-0000-4000-8000-000000000011','{"text":"Synthetic"}');
 perform public.finish_consultation_alert('e1000000-0000-4000-8000-000000000011',(j->>'lease')::uuid,'email-1',null);
 if not exists(select 1 from public.consultation_alerts where provider_id='email-1' and delivery_status='email.delivered') then raise exception 'Early email receipt lost';end if;
 perform public.record_email_delivery('event2','email-1','email.bounced',now());
 perform public.record_email_delivery('event1','email-1','email.delivered',now());
 if not exists(select 1 from public.consultation_alerts where provider_id='email-1' and delivery_status='email.bounced') then raise exception 'Bounce hidden by replay';end if;
 if (select count(*) from public.email_delivery_receipts where provider_id='email-1')<>2 then raise exception 'Email receipt duplicated';end if;
end $$;
reset role;
delete from auth.users where email like 'transport-%';
do $$ begin if exists(select 1 from public.whatsapp_jobs where user_id is not null) then raise exception 'Account erasure left jobs';end if;end $$;
rollback;
