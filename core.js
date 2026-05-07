// ── Categories ─────────────────────────────────────────────────────────────────
const CATS={
  'home':     {bg:'#eff6ff',t:'#1e40af',d:'#3b82f6',dot:'#bfdbfe',b:'rgba(59,130,246,.2)'},
  'my work':  {bg:'#f3fde8',t:'#365314',d:'#65a30d',dot:'#bbf7d0',b:'rgba(101,163,13,.2)'},
  'work':     {bg:'#fdf2f8',t:'#9d174d',d:'#ec4899',dot:'#fbcfe8',b:'rgba(236,72,153,.2)'},
  'social':   {bg:'#faf5ff',t:'#6b21a8',d:'#9333ea',dot:'#e9d5ff',b:'rgba(147,51,234,.2)'},
  'long term':{bg:'#f8fafc',t:'#475569',d:'#94a3b8',dot:'#e2e8f0',b:'rgba(148,163,184,.25)'},
  'recurring':{bg:'#ddf4f0',t:'#0f6b7a',d:'#2a9db5',dot:'#99f6e4',b:'rgba(42,157,181,.25)'},
  'weekly_reset':{bg:'#eff6ff',t:'#1e40af',d:'#3b82f6',dot:'#bfdbfe',b:'rgba(59,130,246,.2)'},
  'buy':      {bg:'#fef9c3',t:'#713f12',d:'#eab308',dot:'#fef08a',b:'rgba(234,179,8,.25)'},
  'travel':   {bg:'#dcfce7',t:'#15803d',d:'#22c55e',dot:'#bbf7d0',b:'rgba(34,197,94,.3)'},
  'birthday': {bg:'#ffedd5',t:'#c2410c',d:'#f97316',dot:'#fed7aa',b:'rgba(249,115,22,.3)'},
  'shopping': {bg:'#fff7ed',t:'#9a3412',d:'#ea580c',dot:'#fed7aa',b:'rgba(234,88,12,.25)'},
  'weekly goals':{bg:'#ffffff',t:'rgba(80,80,95,.85)',d:'rgba(200,200,215,.8)',dot:'#e8e8f0',b:'rgba(200,200,215,.4)'},
};
const IMP={bg:'#fef9c3',t:'#854d0e',d:'#eab308',dot:'#fef08a',b:'rgba(234,179,8,.35)'};
const OV={bg:'#fff0f0',t:'#b91c1c',d:'#ef4444',dot:'#fecaca',b:'rgba(239,68,68,.28)'};
const KCATS=['Home','My work','Work','Social+Travel','Long term','Weekly Goals'];
let HOURS=[...Array(20)].map((_,i)=>i+4);
const DNAMES=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const PX=40/60, KEY='samdash_v7';

function gc(c){return CATS[(c||'').toLowerCase()]||{bg:'#f1f5f9',t:'#334155',d:'#94a3b8',b:'rgba(148,163,184,.2)'};}
function slug(c){return(c||'other').toLowerCase().replace(/\s+/g,'-');}

// ── State ──────────────────────────────────────────────────────────────────────
let cfg={url:'https://gtirvyrqfuuuxkkqaeap.supabase.co',key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aXJ2eXJxZnV1dXhra3FhZWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODY3NjAsImV4cCI6MjA4ODY2Mjc2MH0.6rtA0WeUUAcuV_sNVrxAbaaviPxPwNakh_bk7uylAOo',showAutoTB:true};
let st={tasks:[],recurring:[],shopping:[],blocks:[],travel:[],birthdays:[],pup_skills:[],pupSessions:[],recipes:[],autoTimeblocks:[],autoTBOverrides:[],wrRules:[],wrOverrides:[]};
let dayOff=0,wkOff=0,moOff=0,wrRecOff=0,sbOpen=true,activePg='overview';
let dragId=null,resizing=null,tMode='add',tId=null,tPreDate=null;
let qaCtx='today',qaDsTarget=null,qaKCat='';
let tbWD=0,tbWT=null,wkcWD=0,wkcWT=null;
let selAtbId=null,selAtbDs=null;
// Undo stack
let undoStack=[];let undoTimer=null;
let shopSortMode='store'; // 'store' or 'alpha'

// ── Storage ────────────────────────────────────────────────────────────────────
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');if(s.cfg)cfg={...cfg,...s.cfg};if(s.blocks)st.blocks=s.blocks.map(b=>{const{_col,_ncols,...rest}=b;return rest;});if(s.sb!==undefined)sbOpen=s.sb;if(s.overrides)localOverrides=s.overrides;if(s.delRec)deletedRecIds=new Set(s.delRec);if(s.delPupSess)deletedPupSessIds=new Set(s.delPupSess);if(s.tasks)st.tasks=s.tasks;if(s.recurring)st.recurring=s.recurring.map(r=>({...r,_doneByWk:r._doneByWk||{}}));if(s.shopping)st.shopping=s.shopping;if(s.travel)st.travel=s.travel;if(s.birthdays)st.birthdays=s.birthdays;if(s.pup_skills)st.pup_skills=s.pup_skills;if(s.pupSessions)st.pupSessions=s.pupSessions;if(s.recipes)st.recipes=s.recipes;if(s.autoTimeblocks)st.autoTimeblocks=s.autoTimeblocks;if(s.autoTBOverrides)st.autoTBOverrides=s.autoTBOverrides;if(s.wrRules)st.wrRules=s.wrRules;if(s.wrOverrides)st.wrOverrides=s.wrOverrides;}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify({cfg,blocks:st.blocks,sb:sbOpen,overrides:localOverrides,delRec:[...deletedRecIds],delPupSess:[...deletedPupSessIds],tasks:st.tasks,recurring:st.recurring,shopping:st.shopping,travel:st.travel,birthdays:st.birthdays,pup_skills:st.pup_skills,pupSessions:st.pupSessions,recipes:st.recipes,autoTimeblocks:st.autoTimeblocks,autoTBOverrides:st.autoTBOverrides,wrRules:st.wrRules,wrOverrides:st.wrOverrides}));}catch(e){}}

// ── Auth ───────────────────────────────────────────────────────────────────────
let _sbClient=null;
let _authToken=null;
let _userId=null;
function _getAuthToken(){return _authToken||cfg.key;}
function _initSbClient(){
  if(_sbClient||!cfg.url||!cfg.key)return;
  _sbClient=supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true}});
  _sbClient.auth.onAuthStateChange((event,session)=>{
    _authToken=session?session.access_token:null;
    _userId=session?.user?.id||null;
    if(!session&&event!=='INITIAL_SESSION'){showLoginOverlay();}
  });
}
function showLoginOverlay(){
  const el=document.getElementById('loginOverlay');
  if(el){el.style.display='flex';setTimeout(()=>document.getElementById('loginEmail')&&document.getElementById('loginEmail').focus(),100);}
}
function hideLoginOverlay(){const el=document.getElementById('loginOverlay');if(el)el.style.display='none';}
async function doLogin(){
  const email=(document.getElementById('loginEmail')||{}).value||'';
  const pass=(document.getElementById('loginPass')||{}).value||'';
  const errEl=document.getElementById('loginErr');
  if(errEl)errEl.style.display='none';
  if(!_sbClient)_initSbClient();
  const{data,error}=await _sbClient.auth.signInWithPassword({email,password:pass});
  if(error){if(errEl){errEl.textContent=error.message;errEl.style.display='block';}return;}
  _authToken=data.session.access_token;
  _userId=data.session.user?.id||null;
  hideLoginOverlay();
  await syncAll();
}
async function checkAuth(){
  _initSbClient();
  const{data:{session}}=await _sbClient.auth.getSession();
  if(session){_authToken=session.access_token;_userId=session.user?.id||null;return true;}
  showLoginOverlay();
  return false;
}

// ── Supabase ───────────────────────────────────────────────────────────────────
async function sbReq(method,table,body,qs=''){
  if(!cfg.url||!cfg.key)return null;
  try{
    const prefer=method==='DELETE'?'return=minimal':'return=representation';
    const r=await fetch(`${cfg.url}/rest/v1/${table}${qs}`,{method,headers:{'apikey':cfg.key,'Authorization':`Bearer ${_getAuthToken()}`,'Content-Type':'application/json','Prefer':prefer},body:body?JSON.stringify(body):null});
    if(!r.ok){
      const errText=await r.text();
      console.error('Supabase error',method,table,r.status,errText);
      let errMsg='';try{const ej=JSON.parse(errText);errMsg=ej.message||ej.details||'';}catch(x){errMsg=errText.slice(0,120);}
      showToast('⚠️ Save failed ('+r.status+'): '+errMsg,'#ef4444',8000);
      return null;
    }
    const t=await r.text();return t?JSON.parse(t):[];
  }catch(e){
    console.error('Supabase fetch error',method,table,e);
    showToast('⚠️ Save failed — check connection','#ef4444',4000);
    return null;
  }
}
// localOverrides: map of taskId -> partial fields that always win over DB on sync
// Persisted to localStorage so refreshes don't lose pending changes
let localOverrides={};

async function sbReqNullable(method,table,body,qs=''){
  if(!cfg.url||!cfg.key)return null;
  try{
    const payload=JSON.stringify(body);
    // Use Content-Type application/json - PostgREST will set NULL for explicit null values
    const r=await fetch(`${cfg.url}/rest/v1/${table}${qs}`,{
      method,
      headers:{
        'apikey':cfg.key,
        'Authorization':`Bearer ${_getAuthToken()}`,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      },
      body:payload
    });
    return r.ok;
  }catch(e){return null;}
}
// Track task ids that have pending local edits (cleared after confirmed DB write)
const pendingLocal=new Set();
const pendingTravelIds=new Set();
const pendingShopIds=new Set();
let deletedRecIds=new Set();
let deletedPupSessIds=new Set();
// ── Supabase silent request (no toast on failure) ────────────────────────────
async function sbReqSilent(method,table,body,qs=''){
  if(!cfg.url||!cfg.key)return null;
  try{
    const r=await fetch(`${cfg.url}/rest/v1/${table}${qs}`,{
      method,
      headers:{'apikey':cfg.key,'Authorization':`Bearer ${_getAuthToken()}`,'Content-Type':'application/json','Prefer':'return=representation'},
      body:body?JSON.stringify(body):null
    });
    if(!r.ok){const t=await r.text();console.warn('Supabase silent fail',method,table,r.status,t);return null;}
    const t=await r.text();return t?JSON.parse(t):[];
  }catch(e){console.warn('sbReqSilent error',method,table,e);return null;}
}

// ── Recurring task DB filter helper ─────────────────────────────────────────
// Some recurring tasks have numeric DB ids; others have local text fallback ids.
// Returns the correct query string to target the right row.
function recQs(id){return `?id=eq.${id}`;}

// ── Time block DB helpers ────────────────────────────────────────────────────
async function sbSaveBlock(b){
  if(!cfg.url||!cfg.key)return;
  const smVal=b.sm||0;
  const startTime=`${String(Math.floor(smVal/60)).padStart(2,'0')}:${String(smVal%60).padStart(2,'0')}:00`;
  const payload={
    id:b.id,title:b.title||'',day_date:b.ds,
    start_time:startTime,start_minutes:smVal,
    duration_minutes:b.dur,category:b.cat||'Home',
    task_id:b.taskId||null,rec_id:b.recId||null,shop_id:b.shopId||null,
    done:b._done||false
  };
  try{
    const r=await fetch(`${cfg.url}/rest/v1/time_blocks?on_conflict=id`,{
      method:'POST',
      headers:{
        'apikey':cfg.key,'Authorization':`Bearer ${_getAuthToken()}`,
        'Content-Type':'application/json',
        'Prefer':'resolution=merge-duplicates,return=representation'
      },
      body:JSON.stringify(payload)
    });
    if(!r.ok){const _t=await r.text();console.error('sbSaveBlock error',r.status,_t);setBadge('err','Block save failed');}
  }catch(e){console.error('sbSaveBlock fetch error',e);}
}
async function sbDeleteBlock(id){
  if(!cfg.url||!cfg.key)return;
  try{
    const r=await fetch(`${cfg.url}/rest/v1/time_blocks?id=eq.${id}`,{method:'DELETE',headers:{'apikey':cfg.key,'Authorization':`Bearer ${_getAuthToken()}`,'Prefer':'return=minimal'}});
    if(!r.ok){const t=await r.text();console.error('sbDeleteBlock error',r.status,t);}
  }catch(e){console.error('sbDeleteBlock error',e);}
}
async function sbUpdateBlock(id,fields){
  if(!cfg.url||!cfg.key)return;
  try{
    const r=await fetch(`${cfg.url}/rest/v1/time_blocks?id=eq.${id}`,{method:'PATCH',headers:{'apikey':cfg.key,'Authorization':`Bearer ${_getAuthToken()}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(fields)});
    if(!r.ok){const t=await r.text();console.error('sbUpdateBlock error',r.status,t);}
  }catch(e){console.error('sbUpdateBlock error',e);}
}

async function manualBackup(){
  const btn=document.getElementById('backupTxt');
  btn.textContent='Saving…';
  try{
    const tables=['tasks','shopping_list','travel','birthdays','pup_skills','time_blocks','auto_timeblocks','auto_timeblock_overrides','wr_recurring_rules','wr_recurring_overrides'];
    const backup={exported_at:new Date().toISOString(),mode:'manual',tables:{}};
    await Promise.all(tables.map(async t=>{
      try{
        const r=await fetch(`${cfg.url}/rest/v1/${t}?select=*`,{headers:{'apikey':cfg.key,'Authorization':'Bearer '+cfg.key}});
        backup.tables[t]=await r.json();
      }catch(e){backup.tables[t]=null;}
    }));
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='backup_manual.json';
    a.click();
    URL.revokeObjectURL(a.href);
    btn.textContent='Saved!';
    setTimeout(()=>btn.textContent='Backup Sync',2000);
  }catch(e){
    btn.textContent='Failed';
    setTimeout(()=>btn.textContent='Backup Sync',2000);
  }
}

async function syncAll(silent=false){
  if(!cfg.url||!cfg.key){setBadge('err','Not connected');return;}
  if(_sbClient){const{data:{session}}=await _sbClient.auth.getSession();if(session)_authToken=session.access_token;}
  if(!silent)setBadge('loading','Syncing…');
  try{
    const[tasks,shop,trav,bdays,pupSkills,pupSessionsDb,recipes]=await Promise.all([
      sbReq('GET','tasks',null,'?order=due_date.asc.nullslast&select=*'),
      sbReq('GET','shopping_list',null,'?order=shop_order.asc.nullslast,store.asc,name.asc&select=*'),
      sbReq('GET','travel',null,'?order=start_date.asc&select=*'),
      sbReq('GET','birthdays',null,'?order=birthday.asc&select=*'),
      sbReqSilent('GET','pup_skills',null,'?order=pup.asc,skill_order.asc,skill.asc&select=*'),
      sbReqSilent('GET','pup_skill_sessions',null,'?order=day_date.asc&select=*'),
      sbReqSilent('GET','recipes',null,'?order=name.asc&select=*')
    ]);
    if(pupSessionsDb)st.pupSessions=pupSessionsDb.filter(s=>!deletedPupSessIds.has(String(s.id)));
    // Fetch time_blocks separately so a failure doesn't break the whole sync
    const blocks=await sbReqSilent('GET','time_blocks',null,'?order=day_date.asc,start_minutes.asc&select=*');
    // Fetch auto timeblocks
    const[autoTBs,autoTBOvs]=await Promise.all([
      sbReqSilent('GET','auto_timeblocks',null,'?is_enabled=eq.true&order=sort_order.asc&select=*'),
      sbReqSilent('GET','auto_timeblock_overrides',null,'?order=date.asc&select=*')
    ]);
    if(autoTBs)st.autoTimeblocks=autoTBs;
    if(autoTBOvs)st.autoTBOverrides=autoTBOvs;
    // Fetch WR recurring rules + overrides
    const[wrRules,wrOvs]=await Promise.all([
      sbReqSilent('GET','wr_recurring_rules',null,'?is_enabled=eq.true&order=sort_order.asc,name.asc&select=*'),
      sbReqSilent('GET','wr_recurring_overrides',null,'?order=wk_key.asc&select=*')
    ]);
    if(wrRules){
      const prevPins={};st.wrRules.forEach(r=>{if(r._dateOverrides)prevPins[String(r.id)]=r._dateOverrides;});
      const prevRecOvs={};st.recurring.forEach(r=>{if(r._dateOverrides)prevRecOvs[String(r.id)]=r._dateOverrides;});
      const _isWR=r=>r.is_weekly_reset===true||r.is_weekly_reset==='true';
      st.wrRules=wrRules.filter(_isWR);
      st.wrRules.forEach(r=>{const dbOvs={...(r.date_overrides||{})};const prevOvs=prevPins[String(r.id)];if(prevOvs){Object.keys(prevOvs).forEach(k=>{if(!dbOvs[k])dbOvs[k]=prevOvs[k];});}r._dateOverrides=dbOvs;});
      const nonWR=wrRules.filter(r=>!_isWR(r));
      const dbIds=new Set(nonWR.map(r=>String(r.id)));
      const localPending=st.recurring.filter(r=>{
        const sid=String(r.id);
        if(!sid.startsWith('rec-tmp-')&&!sid.startsWith('rec-local-'))return false;
        return !r._realId||!dbIds.has(String(r._realId));
      });
      st.recurring=[
        ...nonWR.filter(r=>!deletedRecIds.has(String(r.id))).map(r=>{
          const dbwk=r.done_by_week||{};
          const isDone=!!(dbwk[getWkKey(0)]);
          const dateOvs={...(r.date_overrides||{})};
          const prevOvs=prevRecOvs[String(r.id)];
          if(prevOvs){Object.keys(prevOvs).forEach(k=>{if(!dateOvs[k])dateOvs[k]=prevOvs[k];});}
          return{...r,_doneByWk:dbwk,_done:isDone,_dateOverrides:dateOvs};
        }),
        ...localPending
      ];
    }
    if(wrOvs)st.wrOverrides=wrOvs;
    if(tasks){
      const merged=tasks.map(dbT=>{
        const sid=String(dbT.id);
        const override=localOverrides[sid];
        if(override){
          const allMatch=Object.entries(override).every(([k,v])=>{
            const dbVal=dbT[k]===undefined?null:dbT[k];
            const ov=v===''?null:v;
            return dbVal===ov;
          });
          if(allMatch){delete localOverrides[sid];save();}
          else return{...dbT,...override};
        }
        if(pendingLocal.has(sid)){
          const local=st.tasks.find(lt=>String(lt.id)===sid);
          if(local) return local;
        }
        return dbT;
      });
      const dbIds=new Set(tasks.map(t=>String(t.id)));
      const localOnly=st.tasks.filter(lt=>{const sid=String(lt.id);return(sid.startsWith('l-')||sid.startsWith('t-'))&&!dbIds.has(sid);});
      st.tasks=[...merged,...localOnly];
    }
    if(shop){
      const dbShopIds=new Set(shop.map(s=>String(s.id)));
      const localOnlyShop=st.shopping.filter(s=>String(s.id).startsWith('l-')&&!dbShopIds.has(String(s.id)));
      if(pendingShopIds.size>0){
        st.shopping=[...shop.map(sv=>{const sid=String(sv.id);if(pendingShopIds.has(sid)){const loc=st.shopping.find(x=>String(x.id)===sid);if(loc)return loc;}return sv;}),...localOnlyShop];
      } else {
        st.shopping=[...shop,...localOnlyShop];
      }
    }
    if(trav){
      const localOnly=st.travel.filter(tv=>String(tv.id).startsWith('l-'));
      st.travel=trav.map(sv=>{
        const sid=String(sv.id);
        const local=st.travel.find(tv=>String(tv.id)===sid);
        if(pendingTravelIds.has(sid)&&local)return local;
        // Preserve travel_mode from local/localStorage since DB column may not exist
        return(local&&local.travel_mode)?{...sv,travel_mode:local.travel_mode}:sv;
      });
      localOnly.forEach(tv=>{if(!st.travel.find(x=>x.id===tv.id))st.travel.push(tv);});
    }
    if(bdays)st.birthdays=bdays.map(b=>{const loc=st.birthdays.find(x=>String(x.id)===String(b.id));return(loc&&loc.present_ideas&&!b.present_ideas)?{...b,present_ideas:loc.present_ideas}:b;});
    if(pupSkills){
      if(!silent){
        _pupUndoDirty=false;
        const prevMap=new Map(st.pup_skills.map(s=>[String(s.id),s]));
        const _mergePup=(dbS,prev)=>{const m={...dbS};if(prev?._trainedWk)m._trainedWk=prev._trainedWk;return m;};
        if(typeof _pupPendingIds!=='undefined'&&_pupPendingIds.size>0){
          st.pup_skills=pupSkills.map(dbS=>{
            const sid=String(dbS.id);
            const prev=prevMap.get(sid);
            if(_pupPendingIds.has(sid)){return prev||dbS;}
            return _mergePup(dbS,prev);
          });
        } else {
          st.pup_skills=pupSkills.map(dbS=>_mergePup(dbS,prevMap.get(String(dbS.id))));
        }
      } else if(!_pupUndoDirty){
        const prevMap=new Map(st.pup_skills.map(s=>[String(s.id),s]));
        const _mergePup2=(dbS,prev)=>{const m={...dbS};if(prev?._trainedWk)m._trainedWk=prev._trainedWk;return m;};
        st.pup_skills=pupSkills.map(dbS=>_mergePup2(dbS,prevMap.get(String(dbS.id))));
      }
    }
    if(recipes){
      if(!silent){_recUndoDirty=false;st.recipes=recipes;}
      else if(!_recUndoDirty){st.recipes=recipes;}
    }
    if(blocks){
      const dbIds=new Set(blocks.map(b=>String(b.id)));
      const localOnly=st.blocks.filter(b=>!dbIds.has(String(b.id)));
      st.blocks=[...blocks.map(b=>{
        let sm=b.start_minutes;
        if(sm==null&&b.start_time){const[hh,mm]=(b.start_time||'00:00').split(':');sm=parseInt(hh)*60+parseInt(mm);}
        let _pupSessId=null;
        if(b.category==='pup_session'){const _sk=(st.pup_skills||[]).find(x=>x.skill===b.title);if(_sk){const _ss=(st.pupSessions||[]).find(s=>String(s.skill_id)===String(_sk.id)&&s.day_date===b.day_date);if(_ss)_pupSessId=_ss.id;}}
        return{id:b.id,title:b.title||'',ds:b.day_date,sm:sm||0,
          dur:b.duration_minutes||30,cat:b.category||'Home',
          taskId:b.task_id||null,recId:b.rec_id||null,shopId:b.shop_id||null,ruleId:null,_done:b.done||false,_pupSessId};
      }),...localOnly];
    }
    save();
    const n=new Date();setBadge('',`Synced ${n.getHours()}:${String(n.getMinutes()).padStart(2,'0')}`);
    renderAll();
  }catch(e){console.error('syncAll error',e);setBadge('err','Error');}
}
function setBadge(t,x){
  ['','2','3','4','5','6'].forEach(s=>{
    const ic=document.getElementById('syncIcon'+(s?s:''));
    const bar=document.getElementById('syncBar'+s);
    if(ic){
      ic.style.animation=t==='loading'?'spin .8s linear infinite':'';
      ic.style.color=t==='err'?'#ef4444':t==='loading'?'#f59e0b':'';
    }
    if(bar)bar.dataset.tip=x||'Sync';
  });
}

// ── Date utils ─────────────────────────────────────────────────────────────────
const tod=()=>d2s(new Date());
const isOv=(d)=>d&&d.split('T')[0]<tod();
function getWkBounds(off=0){
  const n=new Date(),dow=(n.getDay()+6)%7;
  const mon=new Date(n);mon.setDate(n.getDate()-dow+off*7);mon.setHours(0,0,0,0);
  const sun=new Date(mon);sun.setDate(mon.getDate()+6);sun.setHours(23,59,59,999);
  return{mon,sun};
}
function isInWk(d,off=0){
  if(!d)return false;const dt=new Date(d+'T12:00');
  const{mon,sun}=getWkBounds(off);
  return dt>=mon&&dt<=sun;
}
function fmtD(d){if(!d)return'';return new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});}
function tStr(m){const h=Math.floor(m/60),mn=m%60,ap=h>=12?'pm':'am';return`${h>12?h-12:h===0?12:h}:${String(mn).padStart(2,'0')}${ap}`;}
function getDayDate(off=0){const d=new Date();d.setDate(d.getDate()+off);return d;}
function isDateToday(d){const t=new Date();return d.getDate()===t.getDate()&&d.getMonth()===t.getMonth()&&d.getFullYear()===t.getFullYear();}
function getWkDates(off=0){
  const n=new Date(),dow=(n.getDay()+6)%7,mon=new Date(n);
  mon.setDate(n.getDate()-dow+off*7);
  return DNAMES.map((_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});
}
function d2s(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

// ── Day name → 0-indexed Mon=0..Sun=6 ─────────────────────────────────────
const DAYIDX={'monday':0,'tuesday':1,'wednesday':2,'thursday':3,'friday':4,'saturday':5,'sunday':6};
function dayNameToIdx(n){return DAYIDX[(n||'').toLowerCase().trim()]??-1;}
// Given a week offset, get the date for a specific day-of-week (Mon=0..Sun=6)
function getDateForDow(dow,wkOff2=0){
  const dates=getWkDates(wkOff2);return dates[dow]||null;
}
// Build virtual task objects from recurring items that have appears_on_date
// is_weekly_reset=false items → appear in This Week on their appears_on_date day
// Respects cadence (weekly/biweekly/monthly) and starting_date
function getRecurringWeekTasks(off=0){
  const out=[];
  const wkDates=getWkDates(off);
  st.recurring.filter(r=>!r.is_weekly_reset&&r.appears_on_date&&r.cadence!=='daily').forEach(r=>{
    const cadence=r.cadence||'weekly';
    const wkKey=getWkKey(off);
    let date=null;

    if(cadence==='monthly'){
      const sched=r.appears_on_date||'';
      const domNum=parseInt(sched,10);
      const isDomOnly=!isNaN(domNum)&&String(domNum)===String(sched).trim();
      if(isDomOnly){
        if(domNum<1||domNum>31)return;
        const match=wkDates.find(d=>d.getDate()===domNum);
        if(!match)return;
        if(r.starting_date){const sd=new Date(r.starting_date+'T00:00:00');if(match<sd)return;}
        date=match;
      } else {
        // Nth weekday format: "2nd Sunday"
        const nwdMatch=sched.match(/^(\d+)(?:st|nd|rd|th)?\s+(\w+)$/i);
        if(!nwdMatch)return;
        const n=parseInt(nwdMatch[1],10);
        const DAYS2=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const dow=DAYS2.findIndex(d=>d.toLowerCase()===nwdMatch[2].toLowerCase());
        if(dow<0)return;
        const refDate=wkDates[0];
        const year=refDate.getFullYear(),month=refDate.getMonth();
        let count=0,targetDate=null;
        for(let day=1;day<=31;day++){const d=new Date(year,month,day);if(d.getMonth()!==month)break;if(d.getDay()===dow){count++;if(count===n){targetDate=d;break;}}}
        if(!targetDate)return;
        if(!wkDates.some(d=>d2s(d)===d2s(targetDate)))return;
        if(r.starting_date){const sd=new Date(r.starting_date+'T00:00:00');if(targetDate<sd)return;}
        date=targetDate;
      }
    } else {
      // weekly or biweekly — use appears_on_date day of week
      const dow=dayNameToIdx(r.appears_on_date);if(dow<0)return;
      date=getDateForDow(dow,off);if(!date)return;
      if(r.starting_date){const sd=new Date(r.starting_date+'T00:00:00');if(date<sd)return;}
      if(cadence==='biweekly'||cadence==='quarterly'||cadence==='biannual'||cadence==='annual'){
        if(r.starting_date){
          const interval=cadence==='quarterly'?13:cadence==='biannual'?26:cadence==='annual'?52:2;
          const sd=new Date(r.starting_date+'T00:00:00');
          const sdDow=(sd.getDay()+6)%7;
          const sdMon=new Date(sd);sdMon.setDate(sd.getDate()-sdDow);sdMon.setHours(0,0,0,0);
          const tgtMon=new Date(wkDates[0]);tgtMon.setHours(0,0,0,0);
          const weekDiff=Math.round((tgtMon-sdMon)/(7*86400000));
          // Allow if there's an explicit override for this week even if off-cycle
          if((weekDiff<0||weekDiff%interval!==0)&&!(r._dateOverrides&&r._dateOverrides[wkKey]&&r._dateOverrides[wkKey]!=='__skip__'))return;
        }
      }
    }

    // Skip tasks manually removed from this week via X button
    if(r._dateOverrides&&r._dateOverrides[wkKey]==='__skip__')return;
    // Check for a per-week date override (from dragging)
    const overrideDate=r._dateOverrides&&r._dateOverrides[wkKey];
    const ds=overrideDate||d2s(date);
    const isDone=r._doneByWk&&r._doneByWk[wkKey];
    const nameOv=r._dateOverrides&&r._dateOverrides['name::'+wkKey];
    const displayName=(nameOv&&nameOv.name)||r.name;
    out.push({id:'rec-virt-'+r.id,name:displayName,category:'Recurring',due_date:ds,done:!!isDone,_recId:r.id,_virtual:true,_wkKey:wkKey,_edited:!!(nameOv&&nameOv.name)});
  });
  return out;
}
// ── Travel + Birthday virtual tasks ─────────────────────────────────────────
// Travel: shows on start_date AND on any day within the trip (for today's list)
function getTravelTasks(filterDate, onlyStartDate=false){
  // filterDate = 'YYYY-MM-DD' to match, or null to get all upcoming
  // onlyStartDate = true: only include on start_date (for week summary list — show once)
  return st.travel.map(tv=>{
    const sd=tv.start_date?tv.start_date.split('T')[0]:null;
    const ed=tv.end_date?tv.end_date.split('T')[0]:null;
    const label=tv.destination?`${tv.name} → ${tv.destination}`:tv.name;
    return{
      id:'tv-'+tv.id, name:label, category:'Travel',
      due_date:sd, end_date:ed, done:false, travel_mode:tv.travel_mode||null,
      _srcId:tv.id, _srcTable:'travel', _virtual:true, _type:'travel'
    };
  }).filter(t=>{
    if(!t.due_date)return false;
    if(filterDate){
      if(onlyStartDate) return t.due_date===filterDate;
      // Show on start date OR if today is within trip
      if(t.due_date===filterDate)return true;
      if(t.end_date&&filterDate>=t.due_date&&filterDate<=t.end_date)return true;
      return false;
    }
    return true;
  });
}
// Birthday: recurs every year on month/day — always show current + next year's upcoming
function getBirthdayTasks(filterDate){
  const today=tod();
  const curYear=new Date().getFullYear();
  const out=[];
  st.birthdays.forEach(b=>{
    if(!b.birthday)return;
    const parts=b.birthday.split('-');
    // Support MM-DD (2 parts) and YYYY-MM-DD (3 parts)
    const mo=parts.length===2?parts[0]:parts[1];
    const day=parts.length===2?parts[1]:parts[2];
    [curYear,curYear+1].forEach(yr=>{
      const ds=`${yr}-${mo}-${day}`;
      // If filtering for a specific date, only return exact match
      if(filterDate){if(ds===filterDate)out.push(mkBdayTask(b,ds));return;}
      // Otherwise: skip past ones from this year, always include next year's
      if(yr===curYear&&ds<today)return;
      out.push(mkBdayTask(b,ds));
    });
  });
  return filterDate?out:out.sort((a,b2)=>a.due_date.localeCompare(b2.due_date));
}
function mkBdayTask(b,ds){
  return{
    id:`bd-${b.id}-${ds}`,
    name:`${b.name}'s Birthday 🎂`,
    category:'Birthday',
    due_date:ds,done:false,
    _srcId:b.id,_srcTable:'birthdays',_virtual:true,_type:'birthday'
  };
}
// Get all virtual extras for a given date string
function getExtrasForDate(ds){
  return[...getTravelTasks(ds),...getBirthdayTasks(ds)];
}
// Get all virtual extras for a week (used in week summary list)
// Travel shown ONCE (on start date), birthdays once on their day
function getExtrasForWeek(off=0){
  const dates=getWkDates(off);
  const wkDss=dates.map(d=>d2s(d));
  // Travel: show once — on start_date if in week, else on first day of week if trip spans
  const travelItems=st.travel.filter(tv=>{
    const s=tv.start_date?tv.start_date.split('T')[0]:null;
    const e=tv.end_date?tv.end_date.split('T')[0]:s;
    if(!s)return false;
    return s<=wkDss[6]&&(e||s)>=wkDss[0];
  }).map(tv=>{
    const sd=tv.start_date.split('T')[0];
    const ed=tv.end_date?tv.end_date.split('T')[0]:sd;
    const label=tv.destination?`${tv.name} → ${tv.destination}`:tv.name;
    return{id:'tv-'+tv.id,name:label,category:'Travel',due_date:sd,end_date:ed,done:false,travel_mode:tv.travel_mode||null,_virtual:true,_type:'travel'};
  });
  const bdayItems=dates.flatMap(d=>getBirthdayTasks(d2s(d)));
  return[...travelItems,...bdayItems];
}

// Stable key for a given week offset
function getWkKey(off=0){
  const{mon}=getWkBounds(off);return d2s(mon);
}
function dsToWkKey(ds){
  const d=new Date(ds+'T00:00:00'),day=d.getDay(),mon=new Date(d);
  mon.setDate(d.getDate()-(day===0?6:day-1));return d2s(mon);
}

// ── WR recurring rules schedule generation ────────────────────────────────────
// Returns the nth occurrence of `weekday` (0=Sun) in the given year/month.
// nth=-1 means "last".
function getNthWeekday(year,month,nth,weekday){
  if(nth===-1){
    const last=new Date(year,month+1,0);
    let off=last.getDay()-weekday;if(off<0)off+=7;
    return new Date(year,month,last.getDate()-off);
  }
  const first=new Date(year,month,1);
  let off=weekday-first.getDay();if(off<0)off+=7;
  return new Date(year,month,1+off+(nth-1)*7);
}

// Returns true if the wr_recurring_rule fires during week `off`.
function isWRRuleDueThisWeek(rule,off=0){
  if(!rule.is_enabled)return false;
  const cadence=rule.cadence||'weekly';
  if(cadence==='weekly'||cadence==='other')return true;
  const{mon,sun}=getWkBounds(off);
  if(cadence==='biweekly'){
    if(!rule.starting_date)return false;
    const anchor=new Date(rule.starting_date+'T12:00');
    const aDay=anchor.getDay();
    const aMon=new Date(anchor);aMon.setDate(anchor.getDate()-(aDay===0?6:aDay-1));
    const diffMs=mon-aMon;
    const diffWks=Math.round(diffMs/(7*24*60*60*1000));
    return diffWks%2===0;
  }
  if(cadence==='monthly'){
    if(!rule.starting_date)return false;
    const anchorDay=new Date(rule.starting_date+'T12:00').getDate();
    // Check both months that may overlap this Mon–Sun span
    const months=[];
    for(const dt of[mon,sun]){
      if(!months.some(x=>x.y===dt.getFullYear()&&x.m===dt.getMonth()))
        months.push({y:dt.getFullYear(),m:dt.getMonth()});
    }
    for(const{y,m}of months){
      const maxDay=new Date(y,m+1,0).getDate();
      const occ=new Date(y,m,Math.min(anchorDay,maxDay));
      if(occ>=mon&&occ<=sun)return true;
    }
    return false;
  }
  if(cadence==='quarterly'||cadence==='biannual'||cadence==='annual'){
    if(!rule.starting_date)return false;
    const intervalWks=cadence==='quarterly'?13:cadence==='biannual'?26:52;
    const anchor=new Date(rule.starting_date+'T12:00');
    const aDay=anchor.getDay();
    const aMon=new Date(anchor);aMon.setDate(anchor.getDate()-(aDay===0?6:aDay-1));
    const diffWks=Math.round((mon-aMon)/(7*24*60*60*1000));
    return diffWks>=0&&diffWks%intervalWks===0;
  }
  return false;
}

// Sort: overdue→important→rest, done last
function sortTasks(tasks){
  return [...tasks].sort((a,b)=>{
    if(a.done&&!b.done)return 1;if(!a.done&&b.done)return -1;
    const aO=isOv(a.due_date)&&!a.done,bO=isOv(b.due_date)&&!b.done;
    if(aO&&!bO)return -1;if(!aO&&bO)return 1;
    const aI=a.important&&!a.done,bI=b.important&&!b.done;
    if(aI&&!bI)return -1;if(!aI&&bI)return 1;
    return(a.due_date||'z').localeCompare(b.due_date||'z');
  });
}

// ── Remove linked TB blocks when task moves off a date ──────────────────────────
function removeTBBlocksForDate(ds, opts={}){
  // opts: {taskId, recId, shopId, oldDs}
  const fromDs=opts.oldDs||d2s(new Date());
  if(ds===fromDs)return; // moved to same day — don't remove
  if(opts.taskId){
    const removed=st.blocks.filter(b=>String(b.taskId)===String(opts.taskId)&&b.ds===fromDs);
    removed.forEach(b=>sbDeleteBlock(b.id));
    st.blocks=st.blocks.filter(b=>!(String(b.taskId)===String(opts.taskId)&&b.ds===fromDs));
  }
  if(opts.recId){
    const removedRec=st.blocks.filter(b=>b.recId&&String(b.recId)===String(opts.recId)&&b.ds===fromDs);
    removedRec.forEach(b=>sbDeleteBlock(b.id));
    st.blocks=st.blocks.filter(b=>!(b.recId&&String(b.recId)===String(opts.recId)&&b.ds===fromDs));
  }
  // shopping items: match by shopId
  if(opts.shopId){
    const removedShop=st.blocks.filter(b=>b.shopId&&String(b.shopId)===String(opts.shopId)&&b.ds===fromDs);
    removedShop.forEach(b=>sbDeleteBlock(b.id));
    st.blocks=st.blocks.filter(b=>!(b.shopId&&String(b.shopId)===String(opts.shopId)&&b.ds===fromDs));
  }
  save();
  if(document.getElementById('tbGrid'))renderDayTB();
}

// ── Undo / Redo ───────────────────────────────────────────────────────────────
// Each entry: {undoFn, redoFn, msg}
// pushUndo(undoFn, msg) - called by actions
// Before calling undoFn, we snapshot state so redoFn can restore it
let redoStack=[];

function _stateSnap(){
  return{
    tasks:JSON.parse(JSON.stringify(st.tasks)),
    recurring:JSON.parse(JSON.stringify(st.recurring)),
    shopping:JSON.parse(JSON.stringify(st.shopping)),
    travel:JSON.parse(JSON.stringify(st.travel)),
    birthdays:JSON.parse(JSON.stringify(st.birthdays)),
    blocks:JSON.parse(JSON.stringify(st.blocks||[])),
    wrRules:JSON.parse(JSON.stringify(st.wrRules||[])),
    wrOverrides:JSON.parse(JSON.stringify(st.wrOverrides||[])),
    autoTBOverrides:JSON.parse(JSON.stringify(st.autoTBOverrides||[])),
    pupSessions:JSON.parse(JSON.stringify(st.pupSessions||[])),
    pup_skills:JSON.parse(JSON.stringify(st.pup_skills||[]))
  };
}

function _stateRestore(snap){
  st.tasks=snap.tasks;
  st.recurring=snap.recurring;
  st.shopping=snap.shopping;
  st.travel=snap.travel;
  st.birthdays=snap.birthdays;
  st.blocks=snap.blocks;
  if(snap.wrRules)st.wrRules=snap.wrRules;
  if(snap.wrOverrides)st.wrOverrides=snap.wrOverrides;
  if(snap.autoTBOverrides)st.autoTBOverrides=snap.autoTBOverrides;
  if(snap.pupSessions)st.pupSessions=snap.pupSessions;
  if(snap.pup_skills)st.pup_skills=snap.pup_skills;
  save();
  renderAll();
  renderPupSkillsHighlight();
  if(document.getElementById('tbGrid'))renderDayTB();
  renderWkCal();renderRecOv();renderWeeklyPage();
}

function pushUndo(fn,msg,onExpire){
  // New action clears redo history
  redoStack=[];
  // Snapshot state NOW (before the undo fn runs) so we can redo later
  const snapBeforeUndo=_stateSnap();
  undoStack.push({fn,msg,onExpire,snapBeforeUndo});
  _showUndoToast(msg||'Action done');
  if(undoTimer)clearTimeout(undoTimer);
  undoTimer=setTimeout(()=>{
    document.getElementById('undoToast').classList.remove('show');
    const top=undoStack[undoStack.length-1];
    if(top&&top.onExpire)top.onExpire();
  },4000);
}

function showToast(msg,color,duration){
  // Create a temporary error toast
  let t=document.getElementById('errToast');
  if(!t){t=document.createElement('div');t.id='errToast';t.style.cssText='position:fixed;bottom:56px;left:50%;transform:translateX(-50%) translateY(60px);background:#ef4444;color:#fff;font-size:11px;font-weight:600;padding:7px 14px;border-radius:20px;box-shadow:0 4px 16px rgba(0,0,0,.2);transition:transform .22s ease,opacity .22s ease;opacity:0;z-index:901;white-space:nowrap';document.body.appendChild(t);}
  t.textContent=msg;
  if(color)t.style.background=color;
  t.style.transform='translateX(-50%) translateY(0)';t.style.opacity='1';
  clearTimeout(t._timer);
  t._timer=setTimeout(()=>{t.style.transform='translateX(-50%) translateY(60px)';t.style.opacity='0';},duration||3000);
}
function _showUndoToast(msg){
  const toast=document.getElementById('undoToast');
  document.getElementById('undoMsg').textContent=msg;
  const rb=document.getElementById('redoBtn');
  if(rb)rb.style.display='none';
  toast.classList.add('show');
}

function _showRedoToast(msg){
  const toast=document.getElementById('undoToast');
  document.getElementById('undoMsg').textContent='Redone: '+msg;
  const rb=document.getElementById('redoBtn');
  if(rb)rb.style.display='none';
  toast.classList.add('show');
  if(undoTimer)clearTimeout(undoTimer);
  undoTimer=setTimeout(()=>toast.classList.remove('show'),4000);
}

function doUndo(){
  if(!undoStack.length)return;
  const entry=undoStack.pop();
  // Snapshot state right before undo so redo can restore to this point
  const snapAfterUndo=entry.snapBeforeUndo; // this IS the pre-undo state
  const snapForRedo=_stateSnap(); // current state = what redo should restore to... wait, that's wrong
  // Actually: snapBeforeUndo = state before the action happened = what undo restores to
  // redoFn should restore to the state BEFORE we called doUndo = current state right now
  const currentSnap=_stateSnap();
  entry.fn();
  redoStack.push({snap:currentSnap,msg:entry.msg});
  document.getElementById('undoToast').classList.remove('show');
}

function _syncRedoDiff(before,after){
  const ps=[];
  const bT=before.tasks||[],aT=after.tasks||[];
  for(const t of aT){
    const p=bT.find(x=>String(x.id)===String(t.id));
    if(!p){ps.push(sbReq('POST','tasks',{name:t.name,category:t.category,due_date:t.due_date,done:t.done,important:t.important}));continue;}
    const ch={};
    if(t.due_date!==p.due_date)ch.due_date=t.due_date;
    if(t.done!==p.done)ch.done=t.done;
    if(t.category!==p.category)ch.category=t.category;
    if(t.important!==p.important)ch.important=t.important;
    if(Object.keys(ch).length)ps.push(sbReq('PATCH','tasks',ch,`?id=eq.${t.id}`));
  }
  for(const t of bT){if(!aT.find(x=>String(x.id)===String(t.id)))ps.push(sbReq('DELETE','tasks',null,`?id=eq.${t.id}`));}
  const bR=before.recurring||[],aR=after.recurring||[];
  for(const r of aR){
    const p=bR.find(x=>String(x.id)===String(r.id));
    if(p&&JSON.stringify(r._dateOverrides)!==JSON.stringify(p._dateOverrides))ps.push(sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id)));
  }
  const bWR=before.wrRules||[],aWR=after.wrRules||[];
  for(const r of aWR){
    const p=bWR.find(x=>String(x.id)===String(r.id));
    if(p&&JSON.stringify(r._dateOverrides)!==JSON.stringify(p._dateOverrides))ps.push(sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${r.id}`));
  }
  const bWO=before.wrOverrides||[],aWO=after.wrOverrides||[];
  for(const o of aWO){
    const p=bWO.find(x=>String(x.id)===String(o.id));
    if(!p)ps.push(sbReqSilent('POST','wr_recurring_overrides',o,''));
    else if(JSON.stringify(o)!==JSON.stringify(p))ps.push(sbReqSilent('PATCH','wr_recurring_overrides',o,`?id=eq.${o.id}`));
  }
  for(const o of bWO){if(!aWO.find(x=>String(x.id)===String(o.id)))ps.push(sbReqSilent('DELETE','wr_recurring_overrides',null,`?id=eq.${o.id}`));}
  const bS=before.shopping||[],aS=after.shopping||[];
  for(const s of aS){
    const p=bS.find(x=>String(x.id)===String(s.id));
    if(p&&s.due_date!==p.due_date)ps.push(sbReqNullable('PATCH','shopping_list',{due_date:s.due_date},`?id=eq.${s.id}`));
  }
  const bV=before.travel||[],aV=after.travel||[];
  for(const tv of aV){
    const p=bV.find(x=>String(x.id)===String(tv.id));
    if(p&&(tv.start_date!==p.start_date||tv.end_date!==p.end_date))ps.push(sbReq('PATCH','travel',{start_date:tv.start_date,end_date:tv.end_date},`?id=eq.${tv.id}`));
  }
  const bB=before.blocks||[],aB=after.blocks||[];
  for(const b of aB){
    const p=bB.find(x=>String(x.id)===String(b.id));
    if(!p){ps.push(sbSaveBlock(b));continue;}
    if(b.sm!==p.sm||b.dur!==p.dur)ps.push(sbSaveBlock(b));
  }
  for(const b of bB){if(!aB.find(x=>String(x.id)===String(b.id)))ps.push(sbDeleteBlock(b.id));}
  const bAO=before.autoTBOverrides||[],aAO=after.autoTBOverrides||[];
  for(const o of aAO){
    const p=bAO.find(x=>String(x.id)===String(o.id));
    if(!p){ps.push(sbReqSilent('POST','auto_timeblock_overrides',{base_id:o.base_id,date:o.date,start_time:o.start_time,end_time:o.end_time},''));continue;}
    if(o.start_time!==p.start_time||o.end_time!==p.end_time)ps.push(sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:o.start_time,end_time:o.end_time},`?id=eq.${o.id}`));
  }
  for(const o of bAO){if(!aAO.find(x=>String(x.id)===String(o.id)))ps.push(sbReqSilent('DELETE','auto_timeblock_overrides',null,`?id=eq.${o.id}`));}
  const bPS=before.pupSessions||[],aPS=after.pupSessions||[];
  for(const s of aPS){
    const p=bPS.find(x=>String(x.id)===String(s.id));
    if(!p){ps.push(sbReqSilent('POST','pup_skill_sessions',{skill_id:s.skill_id,day_date:s.day_date,done:s.done},''));continue;}
    const ch={};if(s.done!==p.done)ch.done=s.done;if(s.day_date!==p.day_date)ch.day_date=s.day_date;if(Object.keys(ch).length)ps.push(sbReqSilent('PATCH','pup_skill_sessions',ch,`?id=eq.${s.id}`));
  }
  for(const s of bPS){if(!aPS.find(x=>String(x.id)===String(s.id)))ps.push(sbReqSilent('DELETE','pup_skill_sessions',null,`?id=eq.${s.id}`));}
  const bPK=before.pup_skills||[],aPK=after.pup_skills||[];
  for(const s of aPK){
    const p=bPK.find(x=>String(x.id)===String(s.id));if(!p)continue;
    const ch={};
    const fields=['skill','pup','category','level','stage','focus','next_step','word','signal','comments','skill_order'];
    fields.forEach(f=>{if(String(s[f]??'')!==String(p[f]??''))ch[f]=s[f]??null;});
    if(Object.keys(ch).length)ps.push(sbReqSilent('PATCH','pup_skills',ch,`?id=eq.${s.id}`));
  }
  return Promise.all(ps);
}
async function doRedo(){
  if(!redoStack.length)return;
  const{snap,msg}=redoStack.pop();
  const beforeRedo=_stateSnap();
  _stateRestore(snap);
  await _syncRedoDiff(beforeRedo,snap);
  // undo-after-redo must also patch DB back to pre-redo state
  undoStack.push({fn:()=>{_stateRestore(beforeRedo);_syncRedoDiff(snap,beforeRedo);},msg,snapBeforeUndo:beforeRedo});
  _showRedoToast(msg||'Action');
}
document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key==='a'){const _ael=document.activeElement;const _isInput=_ael&&(_ael.tagName==='INPUT'||_ael.tagName==='TEXTAREA');if(!_isInput)e.preventDefault();return;}
  if((e.metaKey||e.ctrlKey)&&e.key==='z'){
    const _ael=document.activeElement;
    const _isInput=_ael&&(_ael.tagName==='INPUT'||_ael.tagName==='TEXTAREA'||_ael.tagName==='SELECT');
    const _focusedInput=_isInput&&!_ael.closest('.overlay:not(.open)');
    if(_focusedInput)return;
    e.preventDefault();
    const _onPupsZ=document.getElementById('page-pups')?.classList.contains('active');
    if(_onPupsZ){if(e.shiftKey){pupRedo();}else{pupUndo();}return;}
    const _onRecZ=document.getElementById('page-recipes')?.classList.contains('active');
    if(_onRecZ){if(e.shiftKey){recRedo();}else{recUndo();}return;}
    const _onBdayZ=document.getElementById('page-birthdays')?.classList.contains('active');
    if(_onBdayZ){if(e.shiftKey){bdayRedo();}else{bdayUndo();}return;}
    if(e.shiftKey){doRedo();}else{doUndo();}
    return;
  }
  if(e.key==='Escape'){const _mWasOpen=document.getElementById('mModal').classList.contains('open');const _recMoWasOpen=document.getElementById('recMoModal')?.classList.contains('open');const _bgModals=['mModal','recMoModal'];const _fgOpen=document.querySelectorAll('.overlay.open:not(#mModal):not(#recMoModal)');const _qaIsOpen=document.getElementById('qaPopup').classList.contains('open');const _dhIsOpen=!!document.getElementById('dailyHabitPopup')?.classList.contains('open');if(_fgOpen.length||_qaIsOpen||_dhIsOpen){_fgOpen.forEach(o=>o.classList.remove('open'));}else{document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open'));if(_mWasOpen)document.activeElement?.blur();}closeQA();closeDailyHabitPopup();const pfp=document.getElementById('pupFilterPop');if(pfp)pfp.classList.remove('pfopen');const rfp=document.getElementById('recFilterPop');if(rfp)rfp.classList.remove('rfopen');hidePupCtx();hidePupTip();hideBdayCtx();hideRecCtx();closeRecSidePanel();}
  if(document.getElementById('page-pups')?.classList.contains('active')&&!document.querySelector('input:focus,textarea:focus,select:focus,.overlay.open')){
    if((e.key==='ArrowUp'||e.key==='ArrowDown')&&_selSkillKeys?.size&&!_pupSortCol){e.preventDefault();pupMoveSelected(e.key==='ArrowUp'?-1:1);return;}
    if((e.key==='Delete'||e.key==='Backspace')&&_selSkillKeys?.size){e.preventDefault();const first=[..._selSkillKeys][0];if(first)deletePupGroup(first);return;}
  }
  if(document.getElementById('page-recipes')?.classList.contains('active')&&!document.querySelector('input:focus,textarea:focus,select:focus')){
    if((e.key==='Delete'||e.key==='Backspace')&&_selRecIds.size){e.preventDefault();recCtxDelete();return;}
    if((e.metaKey||e.ctrlKey)&&e.key==='c'&&_selRecIds.size){
      _copiedRecs=st.recipes.filter(r=>_selRecIds.has(String(r.id))).map(r=>({...r}));
      showToast(`Copied ${_copiedRecs.length}`,'#f59e0b',1200);return;
    }
    if((e.metaKey||e.ctrlKey)&&e.key==='v'&&_copiedRecs.length){
      e.preventDefault();
      recSnapshot();
      (async()=>{
        for(const r of _copiedRecs){
          const copy={...r,id:'l-'+Date.now(),name:r.name+' (copy)'};
          st.recipes.push(copy);
          const fields=_recFields(copy);
          const sv=await sbReq('POST','recipes',fields);
          if(sv&&sv[0]){const i=st.recipes.findIndex(x=>x.id===copy.id);if(i>-1)st.recipes[i]=sv[0];}
        }
        save();renderRecipeTable();
      })();
      return;
    }
  }
  // Birthdays page shortcuts
  if(document.getElementById('page-birthdays')?.classList.contains('active')&&!document.querySelector('input:focus,textarea:focus,select:focus')){
    if((e.key==='Delete'||e.key==='Backspace')&&_bdaySelIds.size){e.preventDefault();bdayCtxDelete();return;}
    if((e.metaKey||e.ctrlKey)&&e.key==='c'&&_bdaySelIds.size){
      _copiedBdays=st.birthdays.filter(b=>_bdaySelIds.has(String(b.id))).map(b=>({...b}));
      showToast(`Copied ${_copiedBdays.length}`,'#f97316',1200);return;
    }
    if((e.metaKey||e.ctrlKey)&&e.key==='v'&&_copiedBdays.length){
      e.preventDefault();
      (async()=>{
        bdaySnapshot();
        for(const b of _copiedBdays){
          const copy={...b,id:'l-'+Date.now(),name:b.name+' (copy)'};
          st.birthdays.push(copy);
          const sv=await sbReq('POST','birthdays',{name:copy.name,birthday:copy.birthday,...(copy.present_ideas?{present_ideas:copy.present_ideas}:{})});
          if(sv&&sv[0]){const i=st.birthdays.findIndex(x=>x.id===copy.id);if(i>-1)st.birthdays[i]=sv[0];}
        }
        save();renderAll();renderBdayPage();
      })();
      return;
    }
  }
  if((e.key==='Delete'||e.key==='Backspace')&&selAtbId&&selAtbDs&&!document.querySelector('input:focus,textarea:focus')){
    const atb=getAutoTBForDate(selAtbDs).find(a=>a._atbId===selAtbId);
    if(atb){e.preventDefault();delAutoTBForDay(selAtbId,selAtbDs,atb._ovId);}
  }
  if(e.key===' '&&!document.querySelector('input:focus,textarea:focus,select:focus,[contenteditable]:focus')&&document.getElementById('mModal').classList.contains('open')){e.preventDefault();closeMod('mModal');}
  if(e.key===' '&&!document.querySelector('input:focus,textarea:focus,select:focus,[contenteditable]:focus')&&document.getElementById('recMoModal').classList.contains('open')){e.preventDefault();closeMod('recMoModal');}
  if((e.metaKey||e.ctrlKey)&&e.key==='i'){
    const _tImp=document.getElementById('tImp');const _qaImp=document.getElementById('qaImp');
    if(_tImp&&document.getElementById('tModal').classList.contains('open')){e.preventDefault();_tImp.checked=!_tImp.checked;}
    else if(_qaImp&&document.getElementById('qaPopup').classList.contains('open')){e.preventDefault();_qaImp.checked=!_qaImp.checked;}
    else if(selectedTasks.size){
      e.preventDefault();
      const undos=[];
      for(const sid of selectedTasks){
        const t=st.tasks.find(x=>String(x.id)===sid);
        if(t){const prev=!!t.important;t.important=!prev;sbReqNullable('PATCH','tasks',{important:t.important},`?id=eq.${t.id}`);undos.push(()=>{t.important=prev;sbReqNullable('PATCH','tasks',{important:prev},`?id=eq.${t.id}`);});continue;}
        // Recurring
        const recId=sid.startsWith('rec-virt-')?sid.replace('rec-virt-',''):sid.startsWith('wrec-')?sid.replace('wrec-',''):null;
        if(recId){const r=st.recurring.find(x=>String(x.id)===recId);if(r){const prev=!!r.important;r.important=!prev;sbReqSilent('PATCH','wr_recurring_rules',{important:r.important},`?id=eq.${recId}`);undos.push(()=>{r.important=prev;sbReqSilent('PATCH','wr_recurring_rules',{important:prev},`?id=eq.${recId}`);});continue;}}
        // WR rule
        const wrId=sid.startsWith('wrrule-virt-')?sid.replace('wrrule-virt-',''):sid.startsWith('wrrule-')?sid.replace('wrrule-',''):null;
        if(wrId){const r=st.wrRules.find(x=>String(x.id)===wrId);if(r){const prev=!!r.important;r.important=!prev;sbReqSilent('PATCH','wr_recurring_rules',{important:r.important},`?id=eq.${wrId}`);undos.push(()=>{r.important=prev;sbReqSilent('PATCH','wr_recurring_rules',{important:prev},`?id=eq.${wrId}`);});continue;}}
        // Shopping
        if(sid.startsWith('shop-cal-')){const shopId=sid.replace('shop-cal-','');const s=st.shopping.find(x=>String(x.id)===shopId);if(s){const prev=!!s.important;s.important=!prev;sbReqNullable('PATCH','shopping_list',{important:s.important},`?id=eq.${shopId}`);undos.push(()=>{s.important=prev;sbReqNullable('PATCH','shopping_list',{important:prev},`?id=eq.${shopId}`);});continue;}}
      }
      save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
      pushUndo(()=>{undos.forEach(fn=>fn());save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();},'Toggled important');
    }
  }
  if(e.key==='Enter'&&!e.metaKey&&!e.ctrlKey){
    const qa=document.getElementById('qaPopup');
    const dhp=document.getElementById('dailyHabitPopup');
    if(dhp&&dhp.classList.contains('open')){if(document.activeElement?.tagName==='TEXTAREA')return;e.preventDefault();const _dhN=document.getElementById('dhName');if(!_dhN?.value.trim()){closeDailyHabitPopup();return;}submitDailyHabit();return;}
    if(qa.classList.contains('open')){e.preventDefault();submitQA();return;}
    if(document.activeElement?.tagName==='TEXTAREA') return;
    if(document.getElementById('tModal').classList.contains('open')){e.preventDefault();saveTModal();}
    else if(document.getElementById('shopEditModal').classList.contains('open')){e.preventDefault();saveShopEdit();}
    else if(document.getElementById('recEditModal').classList.contains('open')){e.preventDefault();saveRecEdit();}
    else if(document.getElementById('recModal').classList.contains('open')){e.preventDefault();saveRecModal();}
    else if(document.getElementById('bModal').classList.contains('open')){e.preventDefault();saveBlock();}
    else if(document.getElementById('mModal').classList.contains('open')&&!document.querySelector('input:focus,textarea:focus')){e.preventDefault();closeMod('mModal');document.activeElement?.blur();}
    else if(document.getElementById('recMoModal').classList.contains('open')&&!document.querySelector('input:focus,textarea:focus')&&!selectedTasks.size){e.preventDefault();closeMod('recMoModal');document.activeElement?.blur();}
  }
  if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){
    e.preventDefault();
    const qa=document.getElementById('qaPopup');
    const dhp2=document.getElementById('dailyHabitPopup');
    if(dhp2&&dhp2.classList.contains('open')){const _dhN2=document.getElementById('dhName');if(!_dhN2?.value.trim()){closeDailyHabitPopup();return;}submitDailyHabit();return;}
    if(qa.classList.contains('open')){submitQA();return;}
    if(document.getElementById('tModal').classList.contains('open')){saveTModal();}
    else if(document.getElementById('shopEditModal').classList.contains('open')){saveShopEdit();}
    else if(document.getElementById('recEditModal').classList.contains('open')){saveRecEdit();}
    else if(document.getElementById('recModal').classList.contains('open')){saveRecModal();}
    else if(document.getElementById('bModal').classList.contains('open')){saveBlock();}
    else if(document.getElementById('mModal').classList.contains('open')){closeMod('mModal');document.activeElement?.blur();}
    else if(document.getElementById('recMoModal').classList.contains('open')&&!selectedTasks.size){closeMod('recMoModal');document.activeElement?.blur();}
  }
  if(e.key==='o'&&!e.metaKey&&!e.ctrlKey&&!document.querySelector('input:focus,textarea:focus,select:focus')&&!document.querySelector('.overlay.open')){
    e.preventDefault();showPage('overview');
  }
});

// ── UI Tooltip ────────────────────────────────────────────────────────────────
(function(){
  const _t=()=>document.getElementById('uiTip');
  let _tipTimer=null,_tipEl=null;
  document.addEventListener('mousemove',e=>{
    const tip=_t();if(!tip)return;
    const el=e.target.closest('[data-tip]');
    if(el){
      tip.style.left=(e.clientX+14)+'px';tip.style.top=(e.clientY-36)+'px';
      if(el!==_tipEl){clearTimeout(_tipTimer);tip.style.opacity='0';_tipEl=el;_tipTimer=setTimeout(()=>{tip.textContent=el.dataset.tip;tip.style.opacity='1';},1000);}
    } else {
      clearTimeout(_tipTimer);_tipTimer=null;_tipEl=null;tip.style.opacity='0';
    }
  });
  document.addEventListener('mouseleave',()=>{clearTimeout(_tipTimer);_tipTimer=null;_tipEl=null;const tip=_t();if(tip)tip.style.opacity='0';});
})();

