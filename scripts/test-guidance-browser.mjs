// Disposable local integration adapter. Real Next routes, SQL functions and RLS;
// synthetic authentication and deterministic AI responses. Never deploy this process.
import http from 'node:http';
import pg from 'pg';
pg.types.setTypeParser(1082, value => value);
const url=process.env.TEST_DATABASE_URL;
if (!url || new URL(url).hostname!=='127.0.0.1' || !new URL(url).pathname.endsWith('/kahiye_guidance_test')) throw new Error('Requires the local guidance test database.');
const db=new pg.Client({connectionString:url}); await db.connect();
if ((await db.query('select count(*)::int n from auth.users')).rows[0].n) throw new Error('Fixtures require an empty synthetic auth database.');
await db.query('begin');
const uid='e0000000-0000-4000-8000-000000000001';
const child='e0000000-0000-4000-8000-000000000011';
await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'parent@example.invalid',now());",[uid]);
await db.query("insert into public.consents(user_id,policy_version) values($1,'2026-10-05')",[uid]);
await db.query("insert into public.children(id,user_id,name,dob) values($1,$2,'Mira','2020-01-01'),('e0000000-0000-4000-8000-000000000012',$2,'Dev','2021-01-01')",[child,uid]);
const user={id:uid,email:'parent@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
const claims={sub:uid,role:'authenticated',aal:'aal1',exp:Math.floor(Date.now()/1000)+14400};
const token=`${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.synthetic-only`;
const session={access_token:token,refresh_token:'synthetic-only',token_type:'bearer',expires_in:14400,expires_at:claims.exp,user};
const cookie='sb-127-auth-token=base64-'+Buffer.from(JSON.stringify(session)).toString('base64url');
const rpcs={reserve_guidance:['p_id','p_user','p_child','p_kind','p_fingerprint','p_refines','p_free'],complete_guidance:['p_id','p_lease','p_payload'],claim_guidance_job:['p_user'],finish_guidance_job:['p_decode','p_lease','p_memories'],record_decode_outcome:['p_id','p_outcome']};
const tables=new Set(['consents','children','subscriptions','decodes','context_logs','memories','guidance_requests','guidance_jobs','stories','reports','safety_events']);
let queue=Promise.resolve(), mode='ordinary', calls=0, lastGuidanceInput='';
const ident=s=>{if(!/^[a-z_]+$/.test(s))throw new Error('Invalid test identifier');return `"${s}"`;};
const backend=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json'); res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3011');
  res.setHeader('Access-Control-Allow-Headers','*'); res.setHeader('Access-Control-Expose-Headers','Content-Range');
  res.setHeader('Access-Control-Allow-Methods','GET,HEAD,POST,PATCH,OPTIONS');
  if(req.method==='OPTIONS'){res.end();return;}
  const u=new URL(req.url,'http://127.0.0.1');
  const chunks=[];for await(const c of req)chunks.push(c);const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');
  if(u.pathname==='/__test/mode'){mode=body.mode;calls=0;res.end('{}');return;}
  if(u.pathname==='/__test/status'){res.end(JSON.stringify({mode,calls,lastGuidanceInput}));return;}
  if(u.pathname==='/auth/v1/user'){res.end(JSON.stringify(user));return;}
  if(u.pathname==='/v1/messages'){
    calls++; const props=body.output_config?.format?.schema?.properties??{};
    if(props.sayThis)lastGuidanceInput=JSON.stringify(body.messages);
    if(mode==='classifier-outage' && props.level){res.statusCode=503;res.end(JSON.stringify({type:'error',error:{type:'overloaded_error',message:'Synthetic outage'}}));return;}
    const answer=props.level?{level:'none',category:'none',reason:'Synthetic everyday input'}:
      props.approved?{approved:mode!=='review-reject'}:
      props.clarifyNeeded?{modules:[props.modules.items.enum[0]],mode:'right_now',goal:'calm_now',clarifyNeeded:true,clarifyQuestion:'When does this happen?',clarifyOptions:['Before bed','After school']}:
      props.memories?{memories:[{kind:'preference',content:'Mira enjoys a quiet pause after the park.',source:'ai_inferred',confidence:0.6,sensitive:false}]}:
      props.title?{title:'Mira and the Moon',body:'Mira made room for a quiet moment before bed.',moral:'Small steps help.'}:
      props.message?{message:'Let us try a calm bedtime routine together.'}:
      {rightNow:'Pause and lower your voice.',sayThis:'I see that stopping is hard. I am here.',doThis:['Offer two calm choices.'],avoid:'Avoid threats.',hypotheses:[{text:'The transition may feel sudden.',likelihood:'possible'}],emotionalNeed:'A predictable transition',afterwards:'Plan the next transition together.',watchFor:'Notice which transition is hardest.',seekHelpIf:'',skillBeingBuilt:'Practising transitions',developmentalContext:'Transitions can take practice.',whyItWorks:'Predictability can help.',evidenceIds:[]};
    if(mode==='slow'&&!props.level&&!props.clarifyNeeded&&!props.memories) await new Promise(r=>setTimeout(r,3000));
    res.end(JSON.stringify({id:'synthetic',type:'message',role:'assistant',model:body.model,content:[{type:'text',text:JSON.stringify(answer)}],stop_reason:'end_turn',stop_sequence:null,usage:{input_tokens:1,output_tokens:1}}));return;
  }
  queue=queue.then(async()=>{
    await db.query('savepoint request');
    try{
      const service=req.headers.apikey==='synthetic-service';
      await db.query(`set local role ${service?'service_role':'authenticated'}`);
      await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]);
      const rpc=u.pathname.replace('/rest/v1/rpc/','');let result;
      if(rpc in rpcs){
        if(mode==='save-failure'&&rpc==='complete_guidance')throw new Error('Synthetic save failure');
        const values=rpcs[rpc].map(k=>body[k]??(k==='p_free'?false:null)).map(v=>v&&typeof v==='object'?JSON.stringify(v):v);
        result=(await db.query(`select public.${rpc}(${values.map((_,i)=>'$'+(i+1)).join(',')}) result`,values)).rows[0].result;
      }else{
        const table=u.pathname.replace('/rest/v1/','');if(!tables.has(table))throw new Error('Unsupported adapter route');
        const values=[],where=[];
        for(const[k,v]of u.searchParams){
          if(['select','order','limit','offset'].includes(k))continue;
          if(k==='or' && /^\(expires_at\.is\.null,expires_at\.gt\.[\dTZ:.+-]+\)$/.test(v)) { values.push(v.slice('(expires_at.is.null,expires_at.gt.'.length,-1)); where.push(`(expires_at is null or expires_at > $${values.length})`); continue; }
          const col=ident(k);let op,raw;
          if(v.startsWith('not.is.')){where.push(`${col} is not null`);continue;}
          if(v==='is.null'){where.push(`${col} is null`);continue;}
          for(const[p,sql]of [['eq.','='],['gte.','>=']])if(v.startsWith(p)){op=sql;raw=v.slice(p.length);}
          if(!op)throw new Error('Unsupported test filter');values.push(raw);where.push(`${col}${op}$${values.length}`);
        }
        if(mode==='profile-save-failure' && table==='children' && ['POST','PATCH'].includes(req.method))throw new Error('Synthetic profile save failure');
        if(mode==='memory-save-failure' && table==='memories' && ['POST','PATCH'].includes(req.method))throw new Error('Synthetic memory save failure');
        if(mode==='memory-load-failure' && table==='memories' && req.method==='GET')throw new Error('Synthetic memory read failure');
        if(req.method==='PATCH'){
          const updates=Object.entries(body).map(([k,v])=>{values.push(v);return `${ident(k)}=$${values.length}`;});
          result=(await db.query(`update public.${ident(table)} set ${updates.join(',')} ${where.length?'where '+where.join(' and '):''} returning *`,values)).rows;
        }else if(req.method==='POST'){
          const entries=Object.entries(body);result=(await db.query(`insert into public.${ident(table)}(${entries.map(([k])=>ident(k))}) values(${entries.map((_,i)=>'$'+(i+1))}) returning *`,entries.map(([,v])=>v))).rows;
        }else{
          let select=u.searchParams.get('select')??'*';
          select=select.includes('children(name,memory_enabled)')?"scenario,safety_category,(select jsonb_build_object('name',name,'memory_enabled',memory_enabled) from public.children where id=decodes.child_id) as children":select==='*'?'*':select.split(',').map(s=>ident(s.trim())).join(',');
          const order=(u.searchParams.get('order')??'').split(',').filter(Boolean).map(s=>{const[col,dir]=s.split('.');return `${ident(col)} ${dir==='desc'?'desc':'asc'}`;});
          const limit=Number(u.searchParams.get('limit')??100);
          const offset=Number(u.searchParams.get('offset')??0);
          if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<0)throw new Error('Invalid pagination');
          result=(await db.query(`select ${select} from public.${ident(table)} ${where.length?'where '+where.join(' and '):''} ${order.length?'order by '+order.join(','):''} limit ${Math.min(limit,100)} offset ${offset}`,values)).rows;
          res.setHeader('Content-Range',`0-${Math.max(0,result.length-1)}/${result.length}`);
          if(req.headers.accept?.includes('application/vnd.pgrst.object+json'))result=result[0]??null;
        }
      }
      if(req.headers.accept?.includes('application/vnd.pgrst.object+json') && Array.isArray(result))result=result[0]??null;
      await db.query('reset role');await db.query('release savepoint request');res.end(req.method==='HEAD'?'':JSON.stringify(result));
    }catch(e){await db.query('rollback to savepoint request');res.statusCode=503;res.end(JSON.stringify({code:e.code,message:e.message}));}
  });
});
const proxy=http.createServer((req,res)=>{
  const upstream=http.request({hostname:'127.0.0.1',port:3010,path:req.url,method:req.method,headers:{...req.headers,cookie}},response=>{
    res.writeHead(response.statusCode,{...response.headers,'set-cookie':`${cookie}; Path=/; SameSite=Lax`});response.pipe(res);
  });res.on('close',()=>{if(!res.writableEnded)upstream.destroy();});upstream.on('error',()=>{res.statusCode=502;res.end('Start local Next on 3010.');});req.pipe(upstream);
});
backend.listen(54329,'127.0.0.1');proxy.listen(3011,'127.0.0.1');
console.log('Synthetic guidance adapter 54329; browser http://127.0.0.1:3011/app. No real providers or family data.');
async function stop(){proxy.close();backend.close();await queue;await db.query('rollback');await db.end();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
