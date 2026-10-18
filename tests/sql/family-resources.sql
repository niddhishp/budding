begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('f1000000-0000-4000-8000-000000000001','care-a@example.invalid',now()),('f1000000-0000-4000-8000-000000000002','care-b@example.invalid',now());
insert into public.consents(user_id,policy_version) values('f1000000-0000-4000-8000-000000000001','2026-10-05');
insert into public.children(id,user_id,name,dob) values
 ('f1000000-0000-4000-8000-000000000011','f1000000-0000-4000-8000-000000000001','Care infant','2026-01-01'),
 ('f1000000-0000-4000-8000-000000000012','f1000000-0000-4000-8000-000000000002','Other infant','2026-01-01');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare payload jsonb:='{"id":"f1000000-0000-4000-8000-000000000021","child_id":"f1000000-0000-4000-8000-000000000011","revision":0,"measured_on":"2026-01-02","weight_kg":3.5,"length_cm":null,"head_cm":null,"method":"lying","note":"Synthetic"}'; a jsonb; b jsonb;
begin
 a:=public.save_child_care('f1000000-0000-4000-8000-000000000011',0,'{"reminders":true}');
 if a->>'revision'<>'1' then raise exception 'Wrong care revision'; end if;
 begin perform public.save_child_care('f1000000-0000-4000-8000-000000000011',0,'{}');raise exception 'Stale care accepted';exception when serialization_failure then null;end;
 begin perform public.save_child_care('f1000000-0000-4000-8000-000000000012',0,'{}');raise exception 'Foreign child accepted';exception when insufficient_privilege then null;end;
 a:=public.save_growth_entry(payload);b:=public.save_growth_entry(payload);
 if a<>b then raise exception 'Create retry changed measurement';end if;
 a:=public.save_growth_entry(payload||'{"revision":1,"archived":true}');
 if a->>'revision'<>'2' or a->>'archived'<>'true' then raise exception 'Archive failed';end if;
 begin perform public.save_growth_entry(payload||'{"revision":1,"weight_kg":4}');raise exception 'Stale growth accepted';exception when serialization_failure then null;end;
 a:=public.save_growth_entry(payload||'{"revision":2,"archived":false}');
 if a->>'revision'<>'3' or a->>'archived'<>'false' then raise exception 'Undo failed';end if;
 begin perform public.save_growth_entry(payload||'{"revision":3,"weight_kg":-1}');raise exception 'Invalid weight accepted';exception when check_violation then null;end;
 begin insert into public.growth_entries(id,child_id,user_id,measured_on,weight_kg,method) values(gen_random_uuid(),'f1000000-0000-4000-8000-000000000011',auth.uid(),'2026-01-02',4,'lying');raise exception 'Direct insert allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.growth_entries) or exists(select 1 from public.child_care_state) then raise exception 'Family data leaked';end if;
 begin perform public.save_child_care('f1000000-0000-4000-8000-000000000012',0,'{}');raise exception 'Missing consent accepted';exception when insufficient_privilege then null;end;
 begin perform public.record_billing_event('bad','sub_test','subscription.charged',1,'active',now(),true);raise exception 'Parent billing write allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into public.subscriptions(user_id,interval,status,razorpay_subscription_id) values('f1000000-0000-4000-8000-000000000001','monthly','created','sub_test');
set local role service_role;
do $$ declare result text; s public.subscriptions; stamp bigint:=extract(epoch from now())::bigint; paid timestamptz:=now()+interval '1 month';
begin
 result:=public.record_billing_event('auth','sub_test','subscription.authenticated',stamp-10,'authenticated',paid,false);
 select * into s from public.subscriptions where razorpay_subscription_id='sub_test';if s.paid_through is not null then raise exception 'Mandate grants paid access';end if;
 perform public.record_billing_event('cancel','sub_test','subscription.cancelled',stamp,'cancelled',paid,false);
 perform public.record_billing_event('charge','sub_test','subscription.charged',stamp-5,'active',paid,true);
 select * into s from public.subscriptions where razorpay_subscription_id='sub_test';if s.status<>'cancelled' or s.paid_through<>paid then raise exception 'Out of order handling failed';end if;
 result:=public.record_billing_event('charge','sub_test','subscription.charged',stamp-5,'active',paid+interval '1 month',true);if result<>'duplicate' then raise exception 'Duplicate not recognized';end if;
 select * into s from public.subscriptions where razorpay_subscription_id='sub_test';if s.paid_through<>paid then raise exception 'Replay mutated access';end if;
 perform public.record_billing_event('same-second','sub_test','subscription.activated',stamp,'active',paid,false);
 select * into s from public.subscriptions where razorpay_subscription_id='sub_test';if s.status<>'cancelled' then raise exception 'Tie resurrected cancelled plan';end if;
 result:=public.record_billing_event('unknown','sub_old','subscription.charged',stamp,'active',paid,true);if result<>'unmatched' then raise exception 'Unknown subscription replaced ownership';end if;
end $$;
do $$ declare a jsonb;b jsonb; begin
 a:=public.reserve_billing_checkout('f1000000-0000-4000-8000-000000000001');
 b:=public.reserve_billing_checkout('f1000000-0000-4000-8000-000000000001');
 if a->>'state'<>'reserved' or b->>'state'<>'review' then raise exception 'Repeated provider creation allowed';end if;
end $$;
reset role;
delete from auth.users where id='f1000000-0000-4000-8000-000000000001';
do $$ begin if exists(select 1 from public.growth_entries) or exists(select 1 from public.child_care_state) or exists(select 1 from public.billing_event_receipts) or exists(select 1 from public.billing_checkout_attempts) then raise exception 'Erasure incomplete';end if;end $$;
rollback;
