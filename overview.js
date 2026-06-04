const _dk=()=>document.body.classList.contains('dark');
const _OV=()=>_dk()?OV_DARK:OV;
const _IMP=()=>_dk()?IMP_DARK:IMP;
// ── Render all ─────────────────────────────────────────────────────────────────
function renderAll(){renderOv();renderWeeklyPage();renderShopFull();renderTravelPage();renderBdayPage();if(typeof renderIdeasPage==='function')renderIdeasPage();if(typeof renderPupsPage==='function')renderPupsPage();if(typeof renderRecipesPage==='function')renderRecipesPage();if(typeof renderVideosPageKeepScroll==='function'&&activePg==='videos')renderVideosPageKeepScroll();if(typeof renderFinancePage==='function')renderFinancePage();if(document.getElementById('mModal')?.classList.contains('open'))renderMoCal();if(document.getElementById('recMoModal')?.classList.contains('open'))renderRecMoCal();if(document.getElementById('woModal')?.classList.contains('open'))renderWOModal();save();requestAnimationFrame(applySelHighlight);const m=document.getElementById('main');if(m&&m.style.opacity==='0')m.style.opacity='1';}

// Multi-select helper: when dragging one item type, also move all OTHER selected items to same day
// excludePrefixes: optional array of prefixes to skip (e.g. ['shop-cal-'] when shop handler already moves its own)
function _moveOtherSelected(ds,excludeSid,undos,excludePrefixes){
  if(!selectedTasks.has(excludeSid)||selectedTasks.size<=1)return;
  const wkKey=getWkKey(wkOff);
  [...selectedTasks].forEach(sid=>{
    if(sid===excludeSid)return;
    if(excludePrefixes&&excludePrefixes.some(p=>sid.startsWith(p)))return;
    // WR rules
    if(sid.startsWith('wrrule-virt-')||sid.startsWith('wrrule-')){
      const rid=sid.replace('wrrule-virt-','').replace('wrrule-','');const r=st.wrRules.find(x=>String(x.id)===String(rid));
      if(r){if(!r._dateOverrides)r._dateOverrides={};const prev=r._dateOverrides[wkKey];r._dateOverrides[wkKey]=ds;sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${rid}`);
        undos.push(()=>{if(prev!==undefined)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${rid}`);});}
      return;
    }
    // WR recurring (legacy wrec)
    if(sid.startsWith('wrec-')){
      const rid=sid.replace('wrec-','');const r=st.recurring.find(x=>String(x.id)===String(rid));
      if(r){if(!r._dateOverrides)r._dateOverrides={};const prev=r._dateOverrides[wkKey];r._dateOverrides[wkKey]=ds;sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
        undos.push(()=>{if(prev!==undefined)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));});}
      return;
    }
    // Non-WR recurring
    if(sid.startsWith('rec-virt-')){
      const rid=sid.replace('rec-virt-','');const r=st.recurring.find(x=>String(x.id)===String(rid));
      if(r){if(!r._dateOverrides)r._dateOverrides={};const prev=r._dateOverrides[wkKey];r._dateOverrides[wkKey]=ds;sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
        undos.push(()=>{if(prev!==undefined)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));});}
      return;
    }
    // Pup sessions
    if(sid.startsWith('pup-sess-')){
      const sessId=sid.replace('pup-sess-','');const sess=st.pupSessions.find(s=>String(s.id)===String(sessId));
      if(sess){const prev=sess.day_date;sess.day_date=ds;sbReqSilent('PATCH','pup_skill_sessions',{day_date:ds},`?id=eq.${sessId}`);
        undos.push(()=>{sess.day_date=prev;sbReqSilent('PATCH','pup_skill_sessions',{day_date:prev},`?id=eq.${sessId}`);});}
      return;
    }
    // Videos
    if(sid.startsWith('vid-ov-')){
      const vidId=sid.replace('vid-ov-','');
      const prevDs=_vidDayMap()[vidId]||null;
      _vidAssignToDay(vidId,ds);
      undos.push(()=>{if(prevDs)_vidAssignToDay(vidId,prevDs);else _vidUnassignDay(vidId);});
      return;
    }
    // Video steps
    if(sid.startsWith('vidstep-')){
      const m=sid.match(/^vidstep-(.+)-(step_\w+)$/);
      if(m){const vidId=m[1],step=m[2];const prevDs=(_vidStepDayMap()[vidId+'::'+step]||{}).ds||null;_vidStepAssignToDay(vidId,step,ds);
        undos.push(()=>{if(prevDs)_vidStepAssignToDay(vidId,step,prevDs);else _vidStepUnassign(vidId,step);});}
      return;
    }
    // Shopping
    if(sid.startsWith('shop-cal-')){
      const shopId=sid.replace('shop-cal-','');const s=st.shopping.find(x=>String(x.id)===String(shopId));
      if(s){const prev=s.due_date;s.due_date=ds;sbReqNullable('PATCH','shopping_list',{due_date:ds},`?id=eq.${s.id}`);
        undos.push(()=>{s.due_date=prev;sbReqNullable('PATCH','shopping_list',{due_date:prev||null},`?id=eq.${s.id}`);});}
      return;
    }
    // Regular tasks (fallback — no known prefix)
    const t=st.tasks.find(x=>String(x.id)===sid);
    if(t&&!t._virtual){const prev=t.due_date;t.due_date=ds;localOverrides[sid]={due_date:ds};pendingLocal.add(sid);sbReqNullable('PATCH','tasks',{due_date:ds},`?id=eq.${t.id}`);
      undos.push(()=>{t.due_date=prev;localOverrides[sid]={due_date:prev};pendingLocal.add(sid);sbReqNullable('PATCH','tasks',{due_date:prev},`?id=eq.${t.id}`);});}
  });
}

function _hebBadge(name){if(!/\bheb\b/i.test(name||''))return'';return`<span class="heb-cnt" onclick="event.stopPropagation();openGroceryModal();"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span>`}
function _pupBadge(name){if(!/prep pup training/i.test(name||''))return'';return`<span class="pup-link-badge" onclick="event.stopPropagation();if(typeof _openPupFocusModal==='function')_openPupFocusModal(null);" title="Weekly pup skills"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>`}
function _recWkNote(r,wkKey){if(!r||!wkKey||!r._dateOverrides)return'';const ov=r._dateOverrides['name::'+wkKey];return(ov&&ov.notes)||'';}

function renderOv(){
  const n=new Date();
  // ovTitle is updated by renderToday() to reflect the selected day
  document.getElementById('sDate').textContent=n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  renderToday();if(document.getElementById("tbGrid"))renderDayTB();renderWkSummary();renderWkCal();renderUnassigned();renderShopOv();renderRecOv();renderKanban();
  renderSummaryMetrics();
}
function renderSummaryMetrics(){
  const ds=d2s(getDayDate(dayOff));
  const blocked=st.blocks.filter(b=>b.ds===ds).reduce((s,b)=>s+b.dur,0);
  const ovCount=st.tasks.filter(t=>!t.done&&isOv(t.due_date)&&t.category!=='Weekly Goals').length+st.shopping.filter(s=>!s.done&&s.due_date&&isOv(s.due_date)).length;
  const tpEl=document.getElementById('todPct'),wpEl=document.getElementById('wkPct');
  const el_tp=document.getElementById('smTodayPct'),el_wp=document.getElementById('smWkPct'),el_bl=document.getElementById('smBlocked'),el_ov=document.getElementById('smOverdue');
  if(el_tp&&tpEl)el_tp.textContent=tpEl.textContent||'0%';
  if(el_wp&&wpEl)el_wp.textContent=wpEl.textContent||'0%';
  if(el_bl)el_bl.textContent=blocked?`${Math.floor(blocked/60)}h${blocked%60?' '+blocked%60+'m':''}`:'-';
  if(el_ov){el_ov.textContent=ovCount;el_ov.style.color=ovCount>0?'#ef4444':'var(--text)';}
}

// ── Today tasks: real tasks for today + overdue + virtual recurring for today's DOW ──
function renderToday(){
  if(typeof _vidStepReconstructBlocks==='function')_vidStepReconstructBlocks();
  const dayDate=getDayDate(dayOff),ds=d2s(dayDate);
  const _fullDateStr=dayDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  document.getElementById('todTitle').textContent=isDateToday(dayDate)?`Today • ${_fullDateStr}`:_fullDateStr;
  const _ovEl=document.getElementById('ovTitle');if(_ovEl)_ovEl.textContent=_fullDateStr;
  const _isToday=dayOff===0;
  const _hdot=document.getElementById('headerDot');if(_hdot)_hdot.style.display='none';
  const _hclk=document.getElementById('liveClock');if(_hclk)_hclk.style.display='none';
  let ts=st.tasks.filter(t=>{
    if(!t.due_date||t.category==='Weekly Goals')return false;
    const tds=t.due_date.split('T')[0];
    if(tds===ds)return true;
    if(dayOff===0&&isOv(t.due_date)&&!t.done)return true;
    return false;
  });
  // Add virtual recurring tasks + travel + birthdays for today
  // Also pull overdue recurring from past weeks (up to 4 weeks back)
  // Include the week containing the viewed day so forward-navigated recurring tasks appear
  const _dayWkKey=dsToWkKey(ds);const _dayWkOff=Math.round((new Date(_dayWkKey+'T00:00:00')-new Date(getWkKey(0)+'T00:00:00'))/(7*86400000));
  const _wkHi=Math.max(0,_dayWkOff);
  const allRecVirt=[];
  for(let w=_wkHi;w>=Math.min(0,_dayWkOff)-4;w--){
    getRecurringWeekTasks(w).forEach(v=>{
      // If this task has been __skip__'d for its occurrence week or any later week up to today, don't show as overdue
      const _rec=st.recurring.find(x=>String(x.id)===String(v._recId));
      if(_rec&&_rec._dateOverrides){for(let sw=w;sw<=0;sw++){if(_rec._dateOverrides[getWkKey(sw)]==='__skip__')return;}}
      // Dedup: if current week has a future (not yet due) occurrence, suppress overdue from past weeks
      const existing=allRecVirt.findIndex(x=>x._recId===v._recId);
      if(existing>=0){
        const ev=allRecVirt[existing];
        const evFuture=!isOv(ev.due_date)&&!ev.done;
        const vFuture=!isOv(v.due_date)&&!v.done;
        // Keep the future/current-week one, skip the overdue past-week one
        if(vFuture&&!evFuture){allRecVirt[existing]=v;}
        // Don't add overdue if future already exists
      } else {allRecVirt.push(v);}
    });
  }
  // Weekly reset tasks pinned to today/overdue via _dateOverrides (look back 4 weeks)
  const _wkKeyNow=getWkKey(wkOff);
  const _wrecSeen=new Set();const wrecToday=[];
  for(let _w=_wkHi;_w>=Math.min(0,_dayWkOff)-4;_w--){const _wkKey=getWkKey(_w);st.recurring.filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&r._dateOverrides&&r._dateOverrides[_wkKey]&&r._dateOverrides[_wkKey]!=='__skip__'&&(r._dateOverrides[_wkKey]===ds||(dayOff===0&&r._dateOverrides[_wkKey]<ds))&&!_wrecSeen.has(String(r.id))).forEach(r=>{_wrecSeen.add(String(r.id));const _isDone=!!(r._doneByWk&&r._doneByWk[_wkKey]);wrecToday.push({id:'rec-virt-'+r.id,name:r.name,category:'Recurring',due_date:r._dateOverrides[_wkKey],done:_isDone,_recId:r.id,_virtual:true,_wkKey:_wkKey,_isWrec:true});});}
  // New-style WR rules pinned to today/overdue via _dateOverrides (look back 4 weeks)
  const _wrRulesSeen=new Set();const wrRulesToday=[];
  for(let _w=_wkHi;_w>=Math.min(0,_dayWkOff)-4;_w--){const _wkKey=getWkKey(_w);st.wrRules.filter(r=>r._dateOverrides&&r._dateOverrides[_wkKey]&&r._dateOverrides[_wkKey]!=='__skip__'&&!(st.wrOverrides||[]).some(o=>String(o.rule_id)===String(r.id)&&o.wk_key===_wkKey&&o.override_type==='skip')&&(r._dateOverrides[_wkKey]===ds||(dayOff===0&&r._dateOverrides[_wkKey]<ds&&!isDoneWRRule(r.id,_wkKey)))&&!_wrRulesSeen.has(String(r.id))).forEach(r=>{_wrRulesSeen.add(String(r.id));const _isDone=isDoneWRRule(r.id,_wkKey);wrRulesToday.push({id:'wrrule-virt-'+r.id,name:r.name,category:'Recurring',due_date:r._dateOverrides[_wkKey],done:_isDone,_ruleId:r.id,_virtual:true,_wkKey:_wkKey,_isWrRule:true});});}
  // Shopping items due today (or overdue when viewing today)
  const shopToday=st.shopping
    .filter(s=>!s.done&&s.due_date&&(s.due_date===ds||(dayOff===0&&isOv(s.due_date))))
    .map(s=>({id:'shop-cal-'+s.id,name:s.name,category:'Shopping',due_date:s.due_date,done:!!s.done,_shopId:s.id,_virtual:true,_type:'shop',store:s.store}));
  const pupSessToday=(st.pupSessions||[])
    .filter(s=>s.day_date===ds||(dayOff===0&&isOv(s.day_date)&&!s.done))
    .map(s=>{const skill=(st.pup_skills||[]).find(x=>String(x.id)===String(s.skill_id));if(!skill)return null;return{id:'pup-sess-'+s.id,name:skill.skill,category:'Recurring',due_date:s.day_date,done:s.done,_pupSessId:s.id,_skillId:s.skill_id,_pup:skill.pup,_virtual:true,_type:'pup'};}).filter(Boolean);
  // Videos assigned to today
  const _vdmToday=_vidDayMap();
  const _vidStillPending=v=>v.status==='published'&&typeof _vidGroupFullyComplete==='function'&&!_vidGroupFullyComplete(v);
  const _hasTabTask0=vid=>{const m='_vid:'+vid;return st.tasks.some(t=>t.notes&&t.notes.includes(m));};
  const _vidOnTBToday=new Set(st.blocks.filter(b=>(b.ds===ds||(dayOff===0&&b.ds&&b.ds<ds))&&b._vidId).map(b=>String(b._vidId)));
  const vidToday=(st.videos||[]).filter(v=>{if(v.is_deleted)return false;const vd=_vdmToday[String(v.id)];if(vd===ds)return true;if(dayOff===0&&vd&&vd<ds)return true;if(_vidOnTBToday.has(String(v.id)))return true;if(_vidStillPending(v)&&v.post_date&&(v.post_date===ds||(dayOff===0&&v.post_date<ds))&&!_hasTabTask0(v.id))return true;return false;}).map(v=>({id:'vid-ov-'+v.id,name:v.topic||v.title,category:'Videos',due_date:_vdmToday[String(v.id)]||v.post_date||ds,done:v.status==='published',_vidId:v.id,_virtual:true,_type:'vid'}));
  const vidStepToday=dayOff===0?_vidStepTasksForDayWithOverdue(ds):_vidStepTasksForDay(ds);
  const finCancelToday=typeof _finCancelTasksForDate==='function'?_finCancelTasksForDate(ds):[];
  const virtToday=[
    ...allRecVirt.filter(v=>v.due_date===ds||(dayOff===0&&isOv(v.due_date)&&!v.done)),
    ...wrecToday,
    ...wrRulesToday,
    ...shopToday,
    ...pupSessToday,
    ...vidToday,
    ...vidStepToday,
    ...finCancelToday,
    ...getExtrasForDate(ds).map(t=>{
      // Birthday done state: never grey out in today list
      return t;
    })
  ];
  const allToday=[...ts,...virtToday];
  const sorted=sortTasksToday(allToday);
  const doneCount=sorted.filter(t=>t.done&&t._type!=='birthday').length+sorted.filter(t=>t._type==='birthday'&&st.blocks.some(b=>b.cat==='Birthday'&&b.title===t.name&&b._done)).length;
  // todBadge removed
  document.getElementById('todPL').textContent=`${doneCount}/${sorted.length}`;const _todP=document.getElementById('todPct');if(_todP)_todP.textContent=(sorted.length?Math.round(doneCount/sorted.length*100):0)+'%';
  document.getElementById('todPB').style.width=sorted.length?`${doneCount/sorted.length*100}%`:'0%';
  renderTodDonut(doneCount,sorted.length);
  const _todDs=ds;
  function _hasTBToday(t){
    if(t._type==='travel')return true;
    if(t._type==='birthday')return st.blocks.some(b=>b.ds===_todDs&&b.cat==='Birthday'&&b.title===t.name);
    const isOvToday=dayOff===0&&isOv(t.due_date)&&!t.done;
    if(t._shopId)return st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&String(b.shopId)===String(t._shopId));
    if(t._ruleId){
      if(st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&(String(b.ruleId)===String(t._ruleId)||String(b.recId)===String(t._ruleId))))return true;
      const recAutos=getRecAutoTBForDate(_todDs);
      if(recAutos.some(a=>String(a._recId)===String(t._ruleId)))return true;
      if(isOvToday){const ov=getRecAutoTBForDate(t.due_date);if(ov.some(a=>String(a._recId)===String(t._ruleId)))return true;}
      return false;
    }
    if(t._recId){
      if(st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&String(b.recId)===String(t._recId)))return true;
      const recAutos=getRecAutoTBForDate(_todDs);
      if(recAutos.some(a=>String(a._recId)===String(t._recId)))return true;
      if(isOvToday){const ov=getRecAutoTBForDate(t.due_date);if(ov.some(a=>String(a._recId)===String(t._recId)))return true;}
      return false;
    }
    if(t._type==='vidstep')return st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&String(b._vidStepVid)===String(t._vidId)&&b._vidStepName===t._vidStep);
    if(t._vidId)return st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&String(b._vidId)===String(t._vidId));
    if(t._type==='pup')return st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&String(b._pupSessId)===String(t._pupSessId));
    if(t._type==='fin-cancel')return st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&String(b._finCancelSubId)===String(t._subId));
    if(!t._virtual)return st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&String(b.taskId)===String(t.id));
    return true;
  }
  document.getElementById('todList').innerHTML=sorted.map(t=>{
    const arr=!t.done&&!_hasTBToday(t);
    return t._type==='travel'||t._type==='birthday'?tRowExtra(t):t._type==='vid'?tRowVidVirt(t,arr):t._type==='vidstep'?tRowVidStepVirt(t,arr):t._type==='fin-cancel'?tRowFinCancel(t,arr):t._type==='shop'?tRowShopVirt(t,true,arr,true):t._type==='pup'?tRowPupSess(t,true,arr):t._virtual?tRowTodayVirt(t,arr,true):tRow(t,{cat:true,catDot:true,drag:true,noDate:true,tbArrow:arr,noColor:true});
  }).join('');
  updateOvBanner();
  renderPupSkillsHighlight();
  renderDailyHabits();
  _attachListRubberBand(document.getElementById('todList'));
  _attachTBEdgeRubberBand();
  _attachWkcRubberBand();
  requestAnimationFrame(()=>_updateOverflowBadge(document.getElementById('todList')));
}
function _updateOverflowBadge(el){
  if(!el)return;
  const existing=el.querySelector('.wkc-more-badge');
  if(existing)existing.remove();
  if(el.scrollHeight<=el.clientHeight+1)return;
  const items=el.querySelectorAll('.ti,.chip');
  let hidden=0;
  const bottom=el.scrollTop+el.clientHeight;
  items.forEach(c=>{if(c.offsetTop+c.offsetHeight/2>bottom)hidden++;});
  if(hidden<=0)return;
  const badge=document.createElement('div');badge.className='wkc-more-badge';badge.textContent='+'+hidden+' more';
  el.appendChild(badge);
  if(!el._overflowBound){el._overflowBound=true;el.addEventListener('scroll',()=>_updateOverflowBadge(el));}
}
// ── Pup Skills Highlight ───────────────────────────────────────────────────────
let _donutInited=false;
let _donutWas100=false;
function launchDonutConfetti(){
  const arc=document.getElementById('_donutArc');if(!arc)return;
  const svg=arc.closest('svg');
  const rect=svg.getBoundingClientRect();
  const ox=rect.left+rect.width/2, oy=rect.top+rect.height/2;
  // donut dance — single <g> per limb, line drawn in absolute SVG coords,
  // transformOrigin set to exact pivot so rotation stays anchored to ring.
  const NS='http://www.w3.org/2000/svg';
  const lc='#22c55e',lw='2.8';
  function makeLimb(cls,tx,ty,dx,dy){
    const g=document.createElementNS(NS,'g');
    g.classList.add(cls);
    g.style.transformOrigin=`${tx}px ${ty}px`;
    const line=document.createElementNS(NS,'line');
    line.setAttribute('x1',String(tx));line.setAttribute('y1',String(ty));
    line.setAttribute('x2',String(tx+dx));line.setAttribute('y2',String(ty+dy));
    line.setAttribute('stroke',lc);line.setAttribute('stroke-width',lw);
    line.setAttribute('stroke-linecap','round');
    const dot=document.createElementNS(NS,'circle');
    dot.setAttribute('cx',String(tx+dx));dot.setAttribute('cy',String(ty+dy));
    dot.setAttribute('r','3');dot.setAttribute('fill',lc);
    g.appendChild(line);g.appendChild(dot);
    return g;
  }
  function makeEye(cx,cy){
    const g=document.createElementNS(NS,'g');
    const w=document.createElementNS(NS,'circle');w.setAttribute('cx',String(cx));w.setAttribute('cy',String(cy));w.setAttribute('r','3.8');w.setAttribute('fill','white');
    const p=document.createElementNS(NS,'circle');p.setAttribute('cx',String(cx+0.7));p.setAttribute('cy',String(cy+0.8));p.setAttribute('r','2.3');p.setAttribute('fill','#1a1a1a');
    const s=document.createElementNS(NS,'circle');s.setAttribute('cx',String(cx+1.8));s.setAttribute('cy',String(cy-0.4));s.setAttribute('r','0.9');s.setAttribute('fill','white');
    g.appendChild(w);g.appendChild(p);g.appendChild(s);
    return g;
  }
  // Positions on the ring (r=22 from center 28,28):
  // right arm: 4 o'clock → (47,39), endpoint up-right (raised)
  // left arm:  8 o'clock → (9,39),  endpoint down-left (hanging)
  // legs: 5 o'clock → (39,47) and 7 o'clock → (17,47)
  const armR=makeLimb('d-arm-r',47,39, 11,-12);
  const armL=makeLimb('d-arm-l', 9,39,-11, 10);
  const legR=makeLimb('d-leg-r',39,47,  5, 13);
  const legL=makeLimb('d-leg-l',17,47, -5, 13);
  // eyes at ~10 o'clock and ~2 o'clock on the ring
  const eyeL=makeEye(20,8);
  const eyeR=makeEye(36,8);
  svg.style.overflow='visible';
  svg.classList.add('donut-dancing');
  [armR,armL,legR,legL,eyeL,eyeR].forEach(el=>svg.appendChild(el));
  setTimeout(()=>{
    svg.classList.remove('donut-dancing');
    svg.style.overflow='';
    [armR,armL,legR,legL,eyeL,eyeR].forEach(el=>el.remove());
  },3000);
  // sprinkles
  const colors=['#ffffff','#22c55e','#4ade80','#bbf7d0','#ffffff','#16a34a'];
  for(let i=0;i<42;i++){
    const delay=(Math.random()*150).toFixed(0)+'ms';
    const el=document.createElement('span');
    el.className='confetti-particle';
    // bias angle downward: more particles in lower half
    const angle=(Math.random()*360)*(Math.PI/180);
    const dist=60+Math.random()*90;
    const cx=Math.cos(angle)*dist;
    const cy=Math.sin(angle)*dist+20; // +20 pulls center of spread down
    const cr=(Math.random()-0.5)*600;
    const cd=(1.0+Math.random()*0.7).toFixed(2)+'s';
    const w=(2+Math.random()*3).toFixed(1)+'px';
    const h=(6+Math.random()*8).toFixed(1)+'px';
    const color=colors[Math.floor(Math.random()*colors.length)];
    el.style.cssText=`--cx:${cx.toFixed(1)}px;--cy:${cy.toFixed(1)}px;--cr:${cr.toFixed(1)}deg;--cd:${cd};--delay:${delay};left:${ox}px;top:${oy}px;width:${w};height:${h};background:${color};border-radius:2px;`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 2000);
  }
}
function renderTodDonut(done,total){
  const wrap=document.getElementById('todProgressDonut');if(!wrap)return;
  if(!total){wrap.style.display='none';_donutInited=false;_donutWas100=false;return;}
  wrap.style.display='flex';
  const C=2*Math.PI*22;
  const arc=document.getElementById('_donutArc');
  const pEl=document.getElementById('_donutPct');
  const fEl=document.getElementById('_donutFrac');
  const pct=done/total;
  if(pEl)pEl.textContent=Math.round(pct*100)+'%';
  if(fEl)fEl.textContent=`${done}/${total}`;
  const lbEl=document.getElementById('_donutLabel');
  if(lbEl){const dd=getDayDate(dayOff);lbEl.textContent=isDateToday(dd)?'done today':'done '+dd.toLocaleDateString('en-US',{month:'short',day:'numeric'});}
  if(!arc)return;
  const isNow100=pct>=1;
  if(!_donutInited){
    _donutInited=true;
    if(isNow100)_donutWas100=true;
    arc.style.transition='none';
    arc.setAttribute('stroke-dasharray',`0 ${C}`);
    const svg=arc.closest('svg');if(svg)svg.classList.remove('donut-glow');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      arc.style.transition='stroke-dasharray .9s cubic-bezier(.4,0,.2,1)';
      arc.setAttribute('stroke-dasharray',`${pct*C} ${C}`);
      if(isNow100&&!_donutWas100){_donutWas100=true;setTimeout(launchDonutConfetti,950);}
    }));
  } else {
    arc.style.transition='stroke-dasharray .45s cubic-bezier(.4,0,.2,1)';
    arc.setAttribute('stroke-dasharray',`${pct*C} ${C}`);
    if(isNow100&&!_donutWas100){_donutWas100=true;setTimeout(launchDonutConfetti,500);}
  }
  if(!isNow100)_donutWas100=false;
}
function _pupWkMonday(off=0){const{mon}=getWkBounds(off);return d2s(mon);}
function _pupWkFocusIds(pup,off=0){
  const wkStart=_pupWkMonday(off);
  return(st.pupWeeklyFocus||[]).filter(f=>f.week_start===wkStart).map(f=>String(f.skill_id)).filter(sid=>{
    const sk=(st.pup_skills||[]).find(x=>String(x.id)===sid);
    return sk&&sk.pup===pup&&sk.stage!=='Mastered';
  });
}
function _pupWkFocusSkills(pup,off=0){
  const ids=_pupWkFocusIds(pup,off);
  return ids.map(sid=>(st.pup_skills||[]).find(x=>String(x.id)===sid)).filter(Boolean);
}
function _pupWkSessions(skillId){
  const{mon,sun}=getWkBounds(wkOff);
  const monDs=d2s(mon),sunDs=d2s(sun);
  return(st.pupSessions||[]).filter(s=>String(s.skill_id)===String(skillId)&&s.day_date>=monDs&&s.day_date<=sunDs);
}
async function addPupWeeklyFocus(skillId,off=0){
  const wkStart=_pupWkMonday(off);
  if((st.pupWeeklyFocus||[]).some(f=>String(f.skill_id)===String(skillId)&&f.week_start===wkStart))return;
  const tmp='pwf-tmp-'+Date.now();
  st.pupWeeklyFocus.push({id:tmp,skill_id:String(skillId),week_start:wkStart});
  save();renderPupSkillsHighlight();renderToday();renderWkCal();
  const sv=await sbReqSilent('POST','pup_weekly_focus',{skill_id:String(skillId),week_start:wkStart});
  if(sv&&sv[0]){const i=st.pupWeeklyFocus.findIndex(f=>f.id===tmp);if(i>-1)st.pupWeeklyFocus[i]=sv[0];}
  save();
}
async function removePupWeeklyFocus(skillId,off=0){
  const wkStart=_pupWkMonday(off);
  const rec=(st.pupWeeklyFocus||[]).find(f=>String(f.skill_id)===String(skillId)&&f.week_start===wkStart);
  if(!rec)return;
  st.pupWeeklyFocus=st.pupWeeklyFocus.filter(f=>f!==rec);
  save();renderPupSkillsHighlight();renderToday();renderWkCal();
  if(!String(rec.id).startsWith('pwf-tmp-'))sbReqSilent('DELETE','pup_weekly_focus',null,`?id=eq.${rec.id}`);
}
let _pupWkFocusSeeding=new Set();
async function seedPupWeeklyFocus(off=0){
  const wkStart=_pupWkMonday(off);
  if(_pupWkFocusSeeding.has(wkStart))return;
  const existing=(st.pupWeeklyFocus||[]).filter(f=>f.week_start===wkStart);
  if(existing.length)return;
  _pupWkFocusSeeding.add(wkStart);
  // Inherit from previous week; fall back to focus skills if no previous week
  const prevWkStart=_pupWkMonday(off-1);
  const prevFocus=(st.pupWeeklyFocus||[]).filter(f=>f.week_start===prevWkStart);
  const skillIds=prevFocus.length
    ?prevFocus.map(f=>String(f.skill_id)).filter(sid=>{const sk=(st.pup_skills||[]).find(x=>String(x.id)===sid);return sk&&sk.stage!=='Mastered';})
    :(st.pup_skills||[]).filter(s=>(s.focus===true||s.focus==='true')&&s.stage!=='Mastered').map(s=>String(s.id));
  for(const sid of skillIds){
    const tmp='pwf-tmp-'+Date.now()+'-'+sid;
    st.pupWeeklyFocus.push({id:tmp,skill_id:sid,week_start:wkStart});
    sbReqSilent('POST','pup_weekly_focus',{skill_id:sid,week_start:wkStart}).then(sv=>{
      if(sv&&sv[0]){const i=st.pupWeeklyFocus.findIndex(f=>f.id===tmp);if(i>-1)st.pupWeeklyFocus[i]=sv[0];}
      save();
    });
  }
  save();
  _pupWkFocusSeeding.delete(wkStart);
}
function renderPupSkillsHighlight(){
  const wrap=document.getElementById('pupSkillsHighlight');if(!wrap)return;
  seedPupWeeklyFocus(wkOff);
  const mochiSkills=_pupWkFocusSkills('Mochi',wkOff);
  const sunnySkills=_pupWkFocusSkills('Sunny',wkOff);
  if(!mochiSkills.length&&!sunnySkills.length){wrap.innerHTML='';wrap.style.cssText='display:none';return;}
  wrap.style.cssText='display:flex;gap:7px;margin:7px;flex-shrink:0';
  const mkTile=(pup,skills,accentColor)=>{
    const wkDoneTotal=skills.reduce((a,s)=>a+_pupWkDone(s.id),0);
    const wkSessTotal=skills.reduce((a,s)=>a+_pupWkSessTotal(s.id),0);
    const pct=wkSessTotal?Math.round(wkDoneTotal/wkSessTotal*100):0;
    const sorted=[...skills].sort((a,b)=>{
      const aHasDone=_pupWkDone(a.id)>0?1:0;
      const bHasDone=_pupWkDone(b.id)>0?1:0;
      return aHasDone-bHasDone;
    });
    const rows=sorted.map(s=>{
      const doneC=_pupWkDone(s.id);
      const total=_pupWkSessTotal(s.id);
      const hasDoneThisWk=doneC>0;
      return`<div class="ti" draggable="true" style="${hasDoneThisWk?'opacity:.35':''}" ondragstart="dragId='pupskill::${s.id}';event.dataTransfer.effectAllowed='copy';this.style.opacity='.4';document.body.classList.add('body-dragging');showWkcEdges(true);" ondragend="this.style.opacity='';document.body.classList.remove('body-dragging');showWkcEdges(false);" ondblclick="openPupEditModal('${s.id}')" onmouseenter="showPupSkillTip(this,'${s.id}')" onmouseleave="hidePupSkillTip()">
        <span class="tn" style="color:var(--muted);font-size:9px;font-weight:500">${escHtml(s.skill)}</span>
        <span class="vid-num" onclick="event.stopPropagation();openPupCountEdit('${s.id}',this)" title="Session details" style="font-size:8px;font-weight:600;color:var(--muted);flex-shrink:0;cursor:pointer;margin-left:auto">${doneC}/${total}</span>
      </div>`;
    }).join('');
    const dk=_dk();
    const progressBar=`<div style="height:3px;background:${dk?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)'};margin:4px 10px 3px;border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:rgba(16,185,129,.7);border-radius:2px;transition:width .3s"></div></div>`;
    return`<div style="flex:1;display:flex;flex-direction:column;background:${dk?'rgba(255,255,255,.03)':'rgba(255,255,255,.55)'};border:1px solid ${dk?'rgba(255,255,255,.06)':'rgba(210,205,228,.3)'};border-radius:12px;padding:6px 0 5px;overflow:hidden;box-shadow:${dk?'none':'inset 0 1px 3px rgba(0,0,0,.04)'}">
      <div style="display:flex;align-items:center;padding:0 10px 2px;gap:4px">
        <span style="font-size:9px;font-weight:700;color:var(--muted);letter-spacing:.03em">${pup}</span>
        <span onclick="event.stopPropagation();openPupFocusPicker('${pup}')" style="cursor:pointer;font-size:7px;color:var(--muted);opacity:.4;line-height:1;margin-left:1px" title="Edit ${pup}'s skills for this week">✎</span>
        <span class="vid-num" style="font-size:8px;font-weight:600;color:var(--muted);margin-left:auto">${wkDoneTotal}/${wkSessTotal}</span>
      </div>
      ${rows}
      <div style="flex:1"></div>
      ${progressBar}
    </div>`;
  };
  let html='';
  if(mochiSkills.length)html+=mkTile('Mochi',mochiSkills,'#a78bfa');
  if(sunnySkills.length)html+=mkTile('Sunny',sunnySkills,'#d4a017');
  wrap.innerHTML=html;
  if(!wrap._dblBound){wrap._dblBound=true;wrap.addEventListener('dblclick',e=>{if(!e.target.closest('.ti'))_openPupFocusModal(null);});}
}
function openPupFocusPicker(pup){_openPupFocusModal(pup);}
let _pfpWkOff=0;
function _pfpClose(){const ov=document.getElementById('_pupFocusPicker');if(ov)ov.classList.remove('open');if(window._pfpKeyFn){document.removeEventListener('keydown',window._pfpKeyFn);window._pfpKeyFn=null;}}
function _pfpShiftWk(dir){
  _pfpWkOff+=dir;
  const ov=document.getElementById('_pupFocusPicker');if(!ov)return;
  _pfpRenderContent(ov.querySelector('.modal'));
}
function _pfpWkLabel(){return _pfpWkOff===0?'This Week':(_pfpWkOff>0?`+${_pfpWkOff} wks`:`${Math.abs(_pfpWkOff)}w ago`);}
function _pfpWkRange(){const m=new Date(_pupWkMonday(_pfpWkOff)+'T12:00:00');return m.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+(new Date(m.getTime()+6*86400000)).toLocaleDateString('en-US',{month:'short',day:'numeric'});}
function _openPupFocusModal(onlyPup){
  _pfpWkOff=wkOff;
  let ov=document.getElementById('_pupFocusPicker');
  if(!ov){
    ov=document.createElement('div');ov.id='_pupFocusPicker';ov.className='overlay';
    ov.onclick=e=>{if(e.target===ov)_pfpClose();};
    const modal=document.createElement('div');modal.className='modal';
    modal.style.cssText='padding:14px 16px 12px;min-width:480px;max-width:580px;max-height:75vh;overflow-y:auto';
    if(onlyPup)modal.style.cssText='padding:14px 16px 12px;min-width:260px;max-width:320px;max-height:75vh;overflow-y:auto';
    modal.dataset.onlyPup=onlyPup||'';
    ov.appendChild(modal);document.body.appendChild(ov);
  }
  const modal=ov.querySelector('.modal');
  modal.dataset.onlyPup=onlyPup||'';
  if(onlyPup){modal.style.minWidth='260px';modal.style.maxWidth='320px';}
  else{modal.style.minWidth='480px';modal.style.maxWidth='580px';}
  _pfpRenderContent(modal);
  requestAnimationFrame(()=>ov.classList.add('open'));
  // Keyboard handler
  if(window._pfpKeyFn)document.removeEventListener('keydown',window._pfpKeyFn);
  window._pfpKeyFn=e=>{
    if(!document.getElementById('_pupFocusPicker')?.classList.contains('open'))return;
    const inInput=e.target.matches('input,textarea,select,[contenteditable]');
    if(e.key==='Escape'){e.preventDefault();_pfpClose();return;}
    if(e.key==='Enter'&&!inInput){e.preventDefault();_pfpClose();return;}
    if(e.key==='ArrowLeft'&&!inInput){e.preventDefault();_pfpShiftWk(-1);return;}
    if(e.key==='ArrowRight'&&!inInput){e.preventDefault();_pfpShiftWk(1);return;}
    if(e.key==='t'&&!inInput){e.preventDefault();_pfpWkOff=0;const ov=document.getElementById('_pupFocusPicker');if(ov)_pfpRenderContent(ov.querySelector('.modal'));return;}
  };
  document.addEventListener('keydown',window._pfpKeyFn);
}
function _pfpRenderContent(modal){
  const onlyPup=modal.dataset.onlyPup||null;
  const pups=onlyPup?[onlyPup]:['Mochi','Sunny'];
  seedPupWeeklyFocus(_pfpWkOff);
  const wide=pups.length>1;
  const arrowBtn='cursor:pointer;font-size:14px;color:var(--muted);padding:2px 6px;border-radius:6px;user-select:none;line-height:1';
  modal.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <span onclick="_pfpShiftWk(-1)" style="${arrowBtn}" title="Previous week (←)">‹</span>
    <div style="text-align:center;flex:1">
      <div style="font-size:13px;font-weight:700;color:var(--text)">Weekly Skills</div>
      <div style="font-size:10px;color:var(--muted)">${_pfpWkLabel()} · ${_pfpWkRange()}</div>
    </div>
    <span onclick="_pfpShiftWk(1)" style="${arrowBtn}" title="Next week (→)">›</span>
  </div>
  <div style="display:${wide?'grid':'block'};grid-template-columns:1fr 1fr;gap:10px" id="_pfpCols"></div>`;
  const colsEl=modal.querySelector('#_pfpCols');
  pups.forEach(pup=>{
    const col=document.createElement('div');col.dataset.pup=pup;
    const themeBg=pup==='Mochi'?'rgba(139,92,246,0.06)':'rgba(251,191,36,0.07)';
    const themeBorder=pup==='Mochi'?'rgba(139,92,246,0.15)':'rgba(251,191,36,0.2)';
    const accentColor=pup==='Mochi'?'#8b5cf6':'#d97706';
    col.style.cssText=`background:${themeBg};border:1px solid ${themeBorder};border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;gap:2px`;
    col.innerHTML=`<div style="font-size:10px;font-weight:700;color:${accentColor};letter-spacing:.04em;margin-bottom:4px">${pup}</div>
      <div class="_pfpSkills"></div>
      <div style="margin-top:6px;border-top:1px solid ${themeBorder};padding-top:6px">
        <input type="text" placeholder="Add new skill…" class="_pfpNewInput" data-pup="${pup}" style="width:100%;padding:4px 7px;border:1px solid var(--subtle);border-radius:6px;font-size:10px;background:var(--bg);color:var(--text);box-sizing:border-box">
      </div>`;
    colsEl.appendChild(col);
    _pfpRenderCol(pup,col);
  });
  // New skill inputs
  colsEl.querySelectorAll('._pfpNewInput').forEach(inp=>{
    inp.addEventListener('keydown',async e=>{
      if(e.key!=='Enter')return;
      e.stopPropagation();
      const val=inp.value.trim();if(!val)return;
      const pup=inp.dataset.pup;inp.value='';
      let skill=(st.pup_skills||[]).find(s=>s.pup===pup&&s.skill.toLowerCase()===val.toLowerCase());
      if(!skill){
        const tmp='ps-tmp-'+Date.now();
        skill={id:tmp,pup,skill:val,stage:'Learning',focus:false};
        st.pup_skills.push(skill);save();
        const sv=await sbReqSilent('POST','pup_skills',{pup,skill:val,stage:'Learning',focus:false});
        if(sv&&sv[0]){const i=st.pup_skills.findIndex(s=>s.id===tmp);if(i>-1)st.pup_skills[i]=sv[0];skill=st.pup_skills[i];}
        save();
      }
      await addPupWeeklyFocus(skill.id,_pfpWkOff);
      const col=colsEl.querySelector(`[data-pup="${pup}"]`);
      if(col)_pfpRenderCol(pup,col);
      renderPupSkillsHighlight();renderToday();renderWkCal();
    });
  });
}
function _pfpRenderCol(pup,col){
  if(!col)col=document.querySelector(`#_pfpCols [data-pup="${pup}"]`);if(!col)return;
  const listEl=col.querySelector('._pfpSkills');
  const allSkills=(st.pup_skills||[]).filter(s=>s.pup===pup&&s.stage!=='Mastered').sort((a,b)=>(a.skill||'').localeCompare(b.skill||''));
  const curIds=_pupWkFocusIds(pup,_pfpWkOff);
  const active=allSkills.filter(s=>curIds.includes(String(s.id)));
  const inactive=allSkills.filter(s=>!curIds.includes(String(s.id)));
  const accentHex=pup==='Mochi'?'#8b5cf6':'#d97706';
  const renderSkill=(s,checked)=>{
    const sid=String(s.id);
    const done=_pupWkDone(sid,_pfpWkOff);const total=_pupWkSessTotal(sid,_pfpWkOff);
    const countStr=checked&&(done||total)?`<span class="vid-num" style="font-size:8px;font-weight:600;color:var(--muted);margin-left:auto;flex-shrink:0">${done}/${total}</span>`:'';
    return`<div style="display:flex;align-items:center;gap:6px;padding:3px 4px;border-radius:6px;${checked?`background:${_dk()?'rgba(255,255,255,.06)':'rgba(255,255,255,.7)'};border:1px solid ${_dk()?'rgba(255,255,255,.06)':'rgba(210,205,228,.2)'};margin-bottom:2px`:'opacity:.55;margin-bottom:1px'}" ondblclick="event.stopPropagation();openPupEditModal('${sid}')">
      <input type="checkbox" ${checked?'checked':''} onchange="_pfpToggle('${sid}','${pup}',this.checked)" style="width:12px;height:12px;accent-color:${accentHex};cursor:pointer;flex-shrink:0">
      <span style="font-size:10px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(s.skill)}</span>
      ${countStr}
    </div>`;
  };
  let html='';
  if(active.length)html+=active.map(s=>renderSkill(s,true)).join('');
  if(inactive.length){
    html+=`<div style="font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:5px 0 3px;padding-left:2px">Available</div>`;
    html+=inactive.map(s=>renderSkill(s,false)).join('');
  }
  if(!allSkills.length)html='<div style="font-size:10px;color:var(--muted);padding:8px 0;text-align:center">No skills yet</div>';
  listEl.innerHTML=html;
}
async function _pfpToggle(skillId,pup,checked){
  if(checked)await addPupWeeklyFocus(skillId,_pfpWkOff);
  else await removePupWeeklyFocus(skillId,_pfpWkOff);
  _pfpRenderCol(pup);
  renderPupSkillsHighlight();renderToday();renderWkCal();
}
async function togPupSkillTrained(id,checked){
  const today=d2s(new Date());
  const existing=st.pupSessions.find(s=>String(s.skill_id)===String(id)&&s.day_date===today);
  if(checked){
    if(existing){
      const prev=existing.done;
      existing.done=true;
      save();renderPupSkillsHighlight();renderToday();renderWkCal();
      sbReqSilent('PATCH','pup_skill_sessions',{done:true},`?id=eq.${existing.id}`);
      pushUndo(()=>{existing.done=prev;save();renderPupSkillsHighlight();renderToday();renderWkCal();sbReqSilent('PATCH','pup_skill_sessions',{done:prev},`?id=eq.${existing.id}`);},'Checked pup skill');
    } else {
      const tmp='pss-tmp-'+Date.now();
      st.pupSessions.push({id:tmp,skill_id:id,day_date:today,done:true});
      save();renderPupSkillsHighlight();renderToday();renderWkCal();
      const sv=await sbReqSilent('POST','pup_skill_sessions',{skill_id:id,day_date:today,done:true});
      if(sv&&sv[0]){const i=st.pupSessions.findIndex(s=>s.id===tmp);if(i>-1)st.pupSessions[i]=sv[0];}
      save();
      const realId=st.pupSessions.find(s=>String(s.skill_id)===String(id)&&s.day_date===today)?.id;
      pushUndo(()=>{st.pupSessions=st.pupSessions.filter(s=>!(String(s.skill_id)===String(id)&&s.day_date===today));save();renderPupSkillsHighlight();renderToday();renderWkCal();if(realId)sbReqSilent('DELETE','pup_skill_sessions',null,`?id=eq.${realId}`);},'Checked pup skill');
    }
  } else {
    if(existing){
      const prev=existing.done;
      existing.done=false;
      save();renderPupSkillsHighlight();renderToday();renderWkCal();
      sbReqSilent('PATCH','pup_skill_sessions',{done:false},`?id=eq.${existing.id}`);
      pushUndo(()=>{existing.done=prev;save();renderPupSkillsHighlight();renderToday();renderWkCal();sbReqSilent('PATCH','pup_skill_sessions',{done:prev},`?id=eq.${existing.id}`);},'Unchecked pup skill');
    }
  }
}
async function togPupSessionDone(sessId,done){
  const sess=st.pupSessions.find(s=>String(s.id)===String(sessId));if(!sess)return;
  const prev=sess.done;
  sess.done=done;
  save();renderPupSkillsHighlight();renderToday();renderWkCal();
  sbReqSilent('PATCH','pup_skill_sessions',{done},`?id=eq.${sessId}`);
  pushUndo(()=>{sess.done=prev;save();renderPupSkillsHighlight();renderToday();renderWkCal();sbReqSilent('PATCH','pup_skill_sessions',{done:prev},`?id=eq.${sessId}`);},done?'Checked pup skill':'Unchecked pup skill');
}
async function removePupSession(sessId){
  const removed=st.pupSessions.find(s=>String(s.id)===String(sessId));if(!removed)return;
  const skill=(st.pup_skills||[]).find(x=>String(x.id)===String(removed.skill_id));
  const removedBlocks=st.blocks.filter(b=>
    (b._pupSessId&&String(b._pupSessId)===String(sessId))||
    (b.cat==='pup_session'&&skill&&b.title===skill.skill&&b.ds===removed.day_date)||
    (skill&&b.title===skill.skill&&b.ds===removed.day_date&&!b.taskId&&!b.recId&&!b.shopId&&!b.ruleId)
  );
  st.pupSessions=st.pupSessions.filter(s=>String(s.id)!==String(sessId));
  st.blocks=st.blocks.filter(b=>!removedBlocks.includes(b));
  deletedPupSessIds.add(String(sessId));
  save();renderAll();renderPupSkillsHighlight();
  sbReqSilent('DELETE','pup_skill_sessions',null,`?id=eq.${sessId}`);
  removedBlocks.forEach(b=>sbDeleteBlock(b.id));
  pushUndo(()=>{
    st.pupSessions.push(removed);deletedPupSessIds.delete(String(sessId));
    removedBlocks.forEach(b=>st.blocks.push(b));
    save();renderAll();renderPupSkillsHighlight();
    sbReqSilent('POST','pup_skill_sessions',{skill_id:removed.skill_id,day_date:removed.day_date,done:removed.done},'');
    removedBlocks.forEach(b=>sbSaveBlock(b));
  },'Removed pup session');
}
// ── Seed "Prep Pup Training" recurring Sunday task ──────────────────────────
let _pupRecSeeded=false;
async function seedPupReviewTask(){
  if(_pupRecSeeded)return;_pupRecSeeded=true;
  const name='Prep pup training';
  if(st.recurring.some(r=>/prep pup training/i.test(r.name)))return;
  const tmp='rec-tmp-'+Date.now();
  const rec={id:tmp,name,cadence:'weekly',is_weekly_reset:false,is_enabled:true,appears_on_date:'Sunday',notes:'Review & set next week\'s focus skills for Mochi and Sunny',_doneByWk:{},_dateOverrides:{}};
  st.recurring.push(rec);save();renderToday();
  const res=await sbReqSilent('POST','wr_recurring_rules',{name:rec.name,cadence:rec.cadence,is_weekly_reset:false,is_enabled:true,appears_on_date:rec.appears_on_date,notes:rec.notes},'');
  if(res&&res[0]){const idx=st.recurring.findIndex(x=>x.id===tmp);if(idx>=0)st.recurring[idx]={...st.recurring[idx],...res[0],_doneByWk:{},_dateOverrides:{}};save();}
}
// ── Pup Skill Tooltip ────────────────────────────────────────────────────────
let _pupTipTimer=null;
function showPupSkillTip(el,id){
  clearTimeout(_pupTipTimer);
  const s=(st.pup_skills||[]).find(x=>String(x.id)===String(id));if(!s)return;
  let tip=document.getElementById('_pupSkillTip');
  if(!tip){tip=document.createElement('div');tip.id='_pupSkillTip';tip.style.cssText=`position:fixed;z-index:9999;background:${_dk()?'rgba(24,24,28,.97)':'rgba(255,255,255,.97)'};border:1px solid ${_dk()?'rgba(255,255,255,.10)':'rgba(210,205,228,.7)'};border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,${_dk()?'.35':'.12'});padding:8px 11px;font-size:11px;font-family:inherit;pointer-events:none;min-width:140px;max-width:200px`;document.body.appendChild(tip);}
  const pupColor=s.pup==='Mochi'?'#a78bfa':s.pup==='Sunny'?'#ca8a04':'var(--muted)';
  const pupLetter=s.pup==='Mochi'?'M':s.pup==='Sunny'?'S':'?';
  const skillLine=s.skill?`<div style="display:flex;justify-content:space-between;align-items:baseline;line-height:1.4;margin-bottom:3px"><span style="color:var(--text);font-weight:700;font-size:12px">${escHtml(s.skill)}</span><span style="font-weight:700;font-size:11px;color:${pupColor};margin-left:10px">${pupLetter}</span></div>`:'';
  const nextLine=s.next_step?`<div style="line-height:1.4;margin-bottom:2px;font-size:11px;font-weight:500;color:var(--muted)">${escHtml(s.next_step)}</div>`:'';
  const notesLine=s.comments?`<div style="line-height:1.4;font-size:10px;color:var(--subtle)">${escHtml(s.comments)}</div>`:'';
  const totalDone=_pupAllDone(id);const totalSess=_pupAllTotal(id);
  const totalLine=totalSess?`<div style="line-height:1.4;margin-top:3px;font-size:9px;color:var(--muted);border-top:1px solid ${_dk()?'rgba(255,255,255,.06)':'rgba(210,205,228,.25)'};padding-top:3px;font-variant-numeric:tabular-nums">${totalDone} done · ${totalSess} total sessions</div>`:'';
  tip.innerHTML=skillLine+nextLine+notesLine+totalLine;
  const r=el.getBoundingClientRect();
  const tw=tip.offsetWidth||200;
  let left=r.right+6;if(left+tw>window.innerWidth-8)left=r.left-tw-6;
  let top=r.top;if(top+tip.offsetHeight>window.innerHeight-8)top=window.innerHeight-tip.offsetHeight-8;
  tip.style.left=left+'px';tip.style.top=top+'px';tip.style.display='block';
}
function hidePupSkillTip(){
  _pupTipTimer=setTimeout(()=>{const t=document.getElementById('_pupSkillTip');if(t)t.style.display='none';},80);
}
// ── Daily Habits ──────────────────────────────────────────────────────────────
function renderDailyHabits(){
  const el=document.getElementById('dailyHabitsSection');if(!el)return;
  const ds=d2s(getDayDate(dayOff));
  const habits=[...st.recurring.filter(r=>r.cadence==='daily'&&r.is_weekly_reset===false)].sort((a,b)=>{
    const ad=!!(a._doneByWk&&a._doneByWk[ds]),bd=!!(b._doneByWk&&b._doneByWk[ds]);
    if(ad&&!bd)return 1;if(!ad&&bd)return -1;
    return(a.name||'').localeCompare(b.name||'');
  });
  const doneCount=habits.filter(r=>r._doneByWk&&r._doneByWk[ds]).length;
  const rows=habits.map(r=>{
    const done=!!(r._doneByWk&&r._doneByWk[ds]);
    return`<div class="ti${done?' done':''}" style="${done?'opacity:.5':''}">
      <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${done?'checked':''} onchange="togDailyHabit('${r.id}',this.checked,'${ds}')"></label>
      <span class="tn">${escHtml(r.name)}</span>
      <button class="delbtn" onclick="event.stopPropagation();delRec('${r.id}')">✕</button>
    </div>`;
  }).join('');
  const dk=_dk();
  el.innerHTML=`<div style="display:flex;align-items:center;padding:4px 10px 2px;gap:6px;border-top:1px solid ${dk?'rgba(255,255,255,.04)':'rgba(0,0,0,.06)'};margin-top:2px">
    <span style="font-size:10px;font-weight:600;letter-spacing:.05em;color:var(--muted);text-transform:uppercase;flex:1">Daily</span>
    ${habits.length?`<span style="font-size:10px;color:var(--muted);font-weight:500">${doneCount}/${habits.length}</span>`:''}
    <button class="btn btn-ghost btn-xs" onclick="openAddDailyHabit(this)" style="padding:1px 6px;font-size:11px;line-height:1.4">+</button>
  </div>${rows?`<div style="padding:0 0 4px">${rows}</div>`:''}`;
}
function togDailyHabit(recId,done,ds){
  const r=st.recurring.find(x=>String(x.id)===String(recId));if(!r)return;
  if(!r._doneByWk)r._doneByWk={};
  const prev=!!r._doneByWk[ds];
  if(done)r._doneByWk[ds]=true;else delete r._doneByWk[ds];
  save();renderDailyHabits();
  const _isTemp=String(recId).startsWith('rec-tmp-')||String(recId).startsWith('rec-local-');
  if(!_isTemp)sbReq('PATCH','wr_recurring_rules',{done_by_week:r._doneByWk},recQs(recId));
  pushUndo(()=>{
    if(!r._doneByWk)r._doneByWk={};
    if(prev)r._doneByWk[ds]=true;else delete r._doneByWk[ds];
    save();renderDailyHabits();
    if(!_isTemp)sbReq('PATCH','wr_recurring_rules',{done_by_week:r._doneByWk},recQs(recId));
  },(done?'Checked':'Unchecked')+' daily habit');
}
function openAddDailyHabit(btn){
  closeDailyHabitPopup();
  const p=document.getElementById('dailyHabitPopup');
  if(btn){const r=btn.getBoundingClientRect();let top=r.bottom+5,left=r.left,pw=220;if(left+pw>window.innerWidth-6)left=window.innerWidth-pw-6;if(top+120>window.innerHeight)top=r.top-124;p.style.top=top+'px';p.style.left=left+'px';p.style.transform='';}
  else{p.style.top='50%';p.style.left='50%';p.style.transform='translate(-50%,-50%)';}
  p.classList.add('open');
  document.getElementById('dhName').value='';
  setTimeout(()=>document.getElementById('dhName').focus(),50);
}
function closeDailyHabitPopup(){document.getElementById('dailyHabitPopup').classList.remove('open');}
async function submitDailyHabit(){
  const name=document.getElementById('dhName').value.trim();if(!name)return;
  const notes=(document.getElementById('dhNotes')?.value||'').trim()||null;
  closeDailyHabitPopup();
  const tmp='rec-tmp-'+Date.now();
  st.recurring.push({id:tmp,name,notes,cadence:'daily',is_weekly_reset:false,is_enabled:true,_doneByWk:{},_dateOverrides:{}});
  save();renderDailyHabits();
  const res=await sbReqSilent('POST','wr_recurring_rules',{name,notes,cadence:'daily',is_weekly_reset:false,is_enabled:true},'');
  if(res&&res[0]){const idx=st.recurring.findIndex(x=>x.id===tmp);if(idx>=0)st.recurring[idx]={...st.recurring[idx],...res[0],_doneByWk:{},_dateOverrides:{}};save();renderDailyHabits();}
}
// Type priority for untimed tasks: travel sorted first via pre-check; important via pre-check
// Order: birthday(1) home(2) my work(3) work(4) social(5) recurring(6) shopping(7) pup(8)
function taskTypePri(t){
  if(t._type==='birthday')return 1;
  const cat=(t.category||'').toLowerCase();
  if(cat==='home')return 2;
  if(cat==='my work')return 3;
  if(cat==='work')return 4;
  if(cat==='social')return 5;
  if(t._type==='vid')return 5.5;
  if(t._type==='vidstep')return 5.6;
  if(t._type==='fin-cancel')return 6.5;
  if(t._type==='shop')return 7;
  if(t._type==='pup')return 8;
  if(t._virtual)return 6; // recurring (WR + non-WR), checked after shop/pup
  return 5; // other regular tasks
}
function sortByTypeOrder(tasks){
  return[...tasks].sort((a,b)=>{
    const aB=a._type==='birthday',bB=b._type==='birthday';
    if(aB&&!bB)return -1;if(!aB&&bB)return 1;
    if(a.done&&!b.done)return 1;if(!a.done&&b.done)return -1;
    const aT=a._type==='travel'&&!a.done,bT=b._type==='travel'&&!b.done;
    if(aT&&!bT)return -1;if(!aT&&bT)return 1;
    const aO=isOv(a.due_date)&&!a.done,bO=isOv(b.due_date)&&!b.done;
    if(aO&&!bO)return -1;if(!aO&&bO)return 1;
    const aI=(a.important||a._type==='fin-cancel')&&!a.done,bI=(b.important||b._type==='fin-cancel')&&!b.done;
    if(aI&&!bI)return -1;if(!aI&&bI)return 1;
    return taskTypePri(a)-taskTypePri(b)||(a.name||'').localeCompare(b.name||'');
  });
}
// Sort for a specific day: blocked tasks first by start time, unblocked by type; fallback to type-only if no blocks
let _tiClickTimer;
function sortTasksForDay(tasks,ds){
  const blks=st.blocks.filter(b=>b.ds===ds);
  if(!blks.length)return sortByTypeOrder(tasks);
  function tbSm(t){
    let b=null;
    if(t._type==='pup'&&t._pupSessId)b=blks.find(x=>String(x._pupSessId)===String(t._pupSessId));
    else if(t._type==='vidstep')b=blks.find(x=>String(x._vidStepVid)===String(t._vidId)&&x._vidStepName===t._vidStep);
    else if(t._vidId)b=blks.find(x=>String(x._vidId)===String(t._vidId));
    else if(t._shopId)b=blks.find(x=>String(x.shopId)===String(t._shopId));
    else if(t._ruleId)b=blks.find(x=>String(x.ruleId)===String(t._ruleId)||String(x.recId)===String(t._ruleId));
    else if(t._recId)b=blks.find(x=>String(x.recId)===String(t._recId));
    else if(!t._virtual)b=blks.find(x=>String(x.taskId)===String(t.id));
    return b?b.sm:null;
  }
  return[...tasks].sort((a,b)=>{
    const aB=a._type==='birthday',bB=b._type==='birthday';
    if(aB&&!bB)return -1;if(!aB&&bB)return 1;
    if(a.done&&!b.done)return 1;if(!a.done&&b.done)return -1;
    const aT=a._type==='travel'&&!a.done,bT=b._type==='travel'&&!b.done;
    if(aT&&!bT)return -1;if(!aT&&bT)return 1;
    const aO=isOv(a.due_date)&&!a.done,bO=isOv(b.due_date)&&!b.done;
    if(aO&&!bO)return -1;if(!aO&&bO)return 1;
    const aSm=tbSm(a),bSm=tbSm(b);
    if(aSm!==null&&bSm===null)return -1;
    if(aSm===null&&bSm!==null)return 1;
    if(aSm!==null&&bSm!==null)return aSm-bSm;
    return taskTypePri(a)-taskTypePri(b)||(a.name||'').localeCompare(b.name||'');
  });
}
function sortTasksToday(tasks){return sortTasksForDay(tasks,d2s(getDayDate(dayOff)));}
function sortByTBWeek(tasks){
  function tbSmAny(t){
    let b=null;
    if(t._vidId)b=st.blocks.find(x=>String(x._vidId)===String(t._vidId));
    else if(t._shopId)b=st.blocks.find(x=>String(x.shopId)===String(t._shopId));
    else if(t._ruleId)b=st.blocks.find(x=>String(x.ruleId)===String(t._ruleId)||String(x.recId)===String(t._ruleId));
    else if(t._recId)b=st.blocks.find(x=>String(x.recId)===String(t._recId));
    else if(!t._virtual)b=st.blocks.find(x=>String(x.taskId)===String(t.id));
    return b?b.sm:null;
  }
  if(!tasks.some(t=>tbSmAny(t)!==null))return sortByTypeOrder(tasks);
  return[...tasks].sort((a,b)=>{
    const aB=a._type==='birthday',bB=b._type==='birthday';
    if(aB&&!bB)return -1;if(!aB&&bB)return 1;
    if(a.done&&!b.done)return 1;if(!a.done&&b.done)return -1;
    const aT=a._type==='travel'&&!a.done,bT=b._type==='travel'&&!b.done;
    if(aT&&!bT)return -1;if(!aT&&bT)return 1;
    const aO=isOv(a.due_date)&&!a.done,bO=isOv(b.due_date)&&!b.done;
    if(aO&&!bO)return -1;if(!aO&&bO)return 1;
    const aSm=tbSmAny(a),bSm=tbSmAny(b);
    if(aSm!==null&&bSm===null)return -1;
    if(aSm===null&&bSm!==null)return 1;
    if(aSm!==null&&bSm!==null)return aSm-bSm;
    return taskTypePri(a)-taskTypePri(b)||(a.name||'').localeCompare(b.name||'');
  });
}
// Virtual task row for today's list - done ones sink to bottom, greyed, uncheckable if done
function tRowTodayVirt(t,tbArrow=false,noColor=false){
  const s=gc((t._isWrec||t._isWrRule)?'weekly_reset':'recurring');
  const ov=isOv(t.due_date)&&!t.done;
  const ps=ov?_OV():s;
  const _dragId=t._isWrRule?`wrrule::${t._ruleId}`:t._isWrec?`wrec::${t._recId}`:`rec::${t._recId}::${t.due_date||''}`;
  const _chk=t._isWrRule?`togWrRule('${t._ruleId}',this.checked,'${t._wkKey||getWkKey(wkOff)}')`
    :t._isWrec?`togRec('${t._recId}',this.checked,'${t._wkKey||getWkKey(wkOff)}')`:`togRecVirt('${t._recId}',this.checked,'${t._wkKey||getWkKey(wkOff)}')`;
  const _xBtn=t._isWrRule?`showWrScopePicker(event,'⊘  Skip this week only','✕  Delete rule (all future)',()=>writeWrOverride('${t._ruleId}','${t._wkKey||getWkKey(wkOff)}',{override_type:'skip'},{undoLabel:'Skipped WR task this week'}),()=>wrCtxDeleteRule('${t._ruleId}'),'⊠  Remove from views',()=>unscheduleWrRule('${t._ruleId}','${t._wkKey||getWkKey(wkOff)}'))`
    :t._isWrec?`showWrScopePicker(event,'⊘  Skip this week only','✕  Delete recurring task',()=>skipWRec('${t._recId}','${t._wkKey||getWkKey(wkOff)}'),()=>delRec('${t._recId}'),'⊠  Remove from views',()=>unscheduleWRec('${t._recId}','${t._wkKey||getWkKey(wkOff)}'))`
    :`showWrScopePicker(event,'⊘  Skip this week only','✕  Delete recurring task',()=>skipRecVirtThisWk('${t._recId}','${t._wkKey||getWkKey(wkOff)}'),()=>delRec('${t._recId}'))`;
  const _recIdAttr=t._isWrRule?t._ruleId:t._recId;
  const _wkKeyAttr=t._wkKey||getWkKey(wkOff);
  const _dblClick=t._isWrRule?`event.stopPropagation();openWrEditModal('${t._ruleId}','${_wkKeyAttr}','this')`:`tiDblRec(event,'${_recIdAttr}','${_wkKeyAttr}')`;
  const _ctxMenu=t._isWrRule?`showWrRuleCtx(event,'${t._ruleId}','${_wkKeyAttr}')`:t._isWrec||t._virtual?`showWrRuleCtx(event,'${_recIdAttr}','${_wkKeyAttr}')`:`showCtx(event,'${t.id}',true,'${_recIdAttr}')`;

  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''}" style="${!ov&&!noColor?`background:${s.bg}`:''}" id="ti-${t.id}" draggable="true" ondragstart="dragId='${_dragId}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);" ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);" onclick="selTask(event,'${t.id}')" ondblclick="${_dblClick}" oncontextmenu="${_ctxMenu}">
    <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="${_chk}"></label>
    ${_hebBadge(t.name)}${_pupBadge(t.name)}<span class="tn">${t.name}${t._wkNote?` <span style="opacity:.5;font-size:9px">@${escHtml(t._wkNote)}</span>`:''}</span>
    ${!ov?`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${ps.bg}" stroke="${ps.d}" stroke-opacity="0.4" stroke-width="1"/></svg>`:''}
    ${tbArrow?'<span class="tb-arrow">›</span>':''}
    ${ov&&t.due_date?`<span class="dlbl ov">${['S','M','T','W','T','F','S'][new Date(t.due_date.split('T')[0]+'T12:00').getDay()]}</span>`:''}
    <button class="delbtn" onclick="event.stopPropagation();${_xBtn}">✕</button>
  </div>`;
}

function tRowShopVirt(t,noDate=false,tbArrow=false,noColor=false){
  const s=gc('shopping');
  const ov=isOv(t.due_date)&&!t.done;
  const ps=ov?_OV():s;
  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''}" style="${!ov&&!noColor?`background:${s.bg}`:''}" id="ti-${t.id}" draggable="true"
    ondragstart="dragId='shop::${t._shopId}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);"
    ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);"
    onclick="selTask(event,'${t.id}')" ondblclick="tiDblShop(event,'${t._shopId}')" oncontextmenu="showCtxShop(event,'${t._shopId}')">
    <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="togShop('${t._shopId}',this.checked)"></label>
    <span class="tn">${t.name}</span>
    ${!ov?`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${ps.bg}" stroke="${ps.d}" stroke-opacity="0.4" stroke-width="1"/></svg>`:''}
    ${tbArrow?'<span class="tb-arrow">›</span>':''}
    ${!noDate&&t.due_date?`<span class="dlbl ${ov?'ov':''}">${ov?['S','M','T','W','T','F','S'][new Date(t.due_date.split('T')[0]+'T12:00').getDay()]:fmtD(t.due_date)}</span>`:''}
    <button class="delbtn" onclick="event.stopPropagation();unscheduleShop('${t._shopId}')">✕</button>
  </div>`;
}
function tRowFinCancel(t,tbArrow=false){
  const s=_IMP();
  return`<div class="ti ${t.done?'done':'imp-row'}" id="ti-${t.id}" draggable="true"
    ondragstart="dragId='fin-cancel::${t._subId}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true)"
    ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false)"
    onclick="selTask(event,'${t.id}')" ondblclick="showPage('finance')">
    <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="togFinCancelDone('${t._subId}',this.checked)"></label>
    <span class="tn">${t.name}</span>
    <svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${s.bg}" stroke="${s.d}" stroke-opacity="0.4" stroke-width="1"/></svg>
    ${tbArrow?'<span class="tb-arrow">›</span>':''}
  </div>`;
}
function tRowVidVirt(t,arr){
  const ov=isOv(t.due_date)&&!t.done;
  const _vs=ov?_OV():gc('videos');const vid=String(t._vidId);
  const _v3=(st.videos||[]).find(x=>String(x.id)===String(vid));
  let _pct3='';
  if(_v3){const _steps3=typeof VID_STEPS_CORE!=='undefined'?VID_STEPS_CORE:(typeof VID_STEPS!=='undefined'?VID_STEPS:[]);const _app3=_steps3.filter(ss=>_v3[ss]!=='na');const _dn3=_app3.filter(ss=>_v3[ss]==='done').length;_pct3=_app3.length?Math.round(_dn3/_app3.length*100):0;}
  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''}" style="background:${_vs.bg}" id="ti-${t.id}" draggable="true"
    ondragstart="dragId='vid::${vid}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true)"
    ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false)"
    onclick="selTask(event,'${t.id}')" ondblclick="if(typeof openVidEdit==='function')openVidEdit('${vid}')">
    <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="if(this.checked)_vidCompleteFromOv('${vid}',this);else _vidUncompleteFromOv('${vid}')"></label>
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${_vs.t}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.6"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
    <span class="tn">${escHtml(t.name)}</span>
    ${ov&&t.due_date?`<span class="dlbl ov">${['S','M','T','W','T','F','S'][new Date(t.due_date.split('T')[0]+'T12:00').getDay()]}</span>`:''}
    ${!ov?`<span style="font-size:9px;opacity:.5;margin-left:auto;flex-shrink:0">${_pct3}%</span>`:''}
    ${arr?'<span class="tb-arrow">›</span>':''}
    <button class="delbtn" onclick="event.stopPropagation();_vidUnassignDay('${vid}')">✕</button>
  </div>`;
}
function tRowVidStepVirt(t,arr){
  const ov=isOv(t.due_date)&&!t.done;
  const _vs=gc('videos');
  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''}" id="ti-${t.id}" draggable="true"
    ondragstart="dragId='vidstep::${t._vidId}::${t._vidStep}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true)"
    ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false)"
    onclick="selTask(event,'${t.id}')"
    ondblclick="if(typeof openVidEdit==='function')openVidEdit('${t._vidId}')">
    <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="_vidStepToggleDone('${t._vidId}','${t._vidStep}',this.checked)"></label>
    <span class="tn">${escHtml(t.name)}</span>
    ${ov&&t.due_date?`<span class="dlbl ov">${['S','M','T','W','T','F','S'][new Date(t.due_date.split('T')[0]+'T12:00').getDay()]}</span>`:''}
    ${!ov?`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${_vs.bg}" stroke="${_vs.d}" stroke-opacity="0.4" stroke-width="1"/></svg>`:''}
    ${arr?'<span class="tb-arrow">›</span>':''}
    <button class="delbtn" onclick="event.stopPropagation();_vidStepUnassign('${t._vidId}','${t._vidStep}')">✕</button>
  </div>`;
}
function _pupSessStyle(){
  if(_dk())return{bg:'rgba(56,170,210,.10)',t:'#67e8f9',d:'#38aad2',dot:'rgba(56,170,210,.15)',b:'rgba(56,170,210,.18)'};
  return{bg:'#f6fafd',b:'rgba(56,170,210,.16)',t:'#18577a',d:'#38aad2',dot:'rgba(56,170,210,.18)'};
}
function _pupDisplayName(t){const p=t._pup;return p?(p+': '+(t.name||'')):(t.name||'');}
function tRowPupSess(t,noColor=false,tbArrow=false){
  const ov=isOv(t.due_date)&&!t.done;
  const ps=ov?_OV():_pupSessStyle();
  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''}" draggable="true" style="${!ov&&!noColor?`background:${ps.bg};border:1px solid ${ps.b}`:''}" id="ti-pup-sess-${t._pupSessId}" onclick="selTask(event,'pup-sess-${t._pupSessId}')" ondblclick="openPupEditModal('${t._skillId}')" ondragstart="dragId='pupsess::${t._pupSessId}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);" ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);">
    <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="togPupSessionDone('${t._pupSessId}',this.checked)"></label>
    <span class="tn">${escHtml(_pupDisplayName(t))}</span>
    ${ov&&t.due_date?`<span class="dlbl ov">${['S','M','T','W','T','F','S'][new Date(t.due_date.split('T')[0]+'T12:00').getDay()]}</span>`:''}
    ${!ov?`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="none" stroke="rgba(56,170,210,.35)" stroke-width="1.5"/></svg>`:''}
    ${tbArrow?'<span class="tb-arrow">›</span>':''}
    <button class="delbtn" onclick="event.stopPropagation();removePupSession('${t._pupSessId}')">✕</button>
  </div>`;
}
// ── Week summary (important→rest, NO overdue; + recurring tasks for this week) ─
function renderWkSummary(){
  const virtRec=getRecurringWeekTasks(wkOff);
  const virtExtras=getExtrasForWeek(wkOff);
  const _wkBdays=virtExtras.filter(t=>t._type==='birthday');
  const _wrecWkk=getWkKey(wkOff);
  const wrecThisWk=st.recurring
    .filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&r._dateOverrides&&r._dateOverrides[_wrecWkk]&&r._dateOverrides[_wrecWkk]!=='__skip__')
    .map(r=>{const ds=r._dateOverrides[_wrecWkk];return{id:'rec-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:!!(r._doneByWk&&r._doneByWk[_wrecWkk]),_recId:r.id,_virtual:true,_isWrec:true,_wkKey:_wrecWkk,_wkNote:_recWkNote(r,_wrecWkk)};})
    .filter(v=>v.due_date&&!v.done);
  const wrRulesThisWk=st.wrRules
    .filter(r=>r._dateOverrides&&r._dateOverrides[_wrecWkk]&&r._dateOverrides[_wrecWkk]!=='__skip__'&&!isDoneWRRule(r.id,_wrecWkk))
    .map(r=>{const ds=r._dateOverrides[_wrecWkk];return{id:'wrrule-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:false,_ruleId:r.id,_virtual:true,_isWrRule:true,_wkKey:_wrecWkk,_wkNote:_recWkNote(r,_wrecWkk)};})
    .filter(v=>v.due_date);
  const shopThisWk=st.shopping
    .filter(s=>s.due_date&&isInWk(s.due_date,wkOff)&&!s.done)
    .map(s=>({id:'shop-cal-'+s.id,name:s.name,category:'Shopping',due_date:s.due_date,done:false,_shopId:s.id,_virtual:true,_type:'shop',store:s.store}));
  const shopThisWkDone=st.shopping
    .filter(s=>s.due_date&&isInWk(s.due_date,wkOff)&&s.done)
    .map(s=>({id:'shop-cal-'+s.id,name:s.name,category:'Shopping',due_date:s.due_date,done:true,_shopId:s.id,_virtual:true,_type:'shop',store:s.store}));
  const doneThisWk=[
    ...st.tasks.filter(t=>isInWk(t.due_date,wkOff)&&t.done),
    ...virtRec.filter(v=>v.done),
    ...shopThisWkDone
  ];
  let ts=[
    ...sortByTBWeek([
      ...st.tasks.filter(t=>isInWk(t.due_date,wkOff)&&!t.done),
      ...virtRec.filter(v=>!v.done),
      ...wrecThisWk,
      ...wrRulesThisWk,
      ...shopThisWk,
      ...virtExtras.map(t=>{
        if(t._type==='birthday'){const blk=st.blocks.find(b=>b.cat==='Birthday'&&b.title===t.name);if(blk&&blk._done)return{...t,done:true};}
        return t;
      })
    ]),
    ...doneThisWk
  ];
  const allReal=st.tasks.filter(t=>isInWk(t.due_date,wkOff));
  const doneReal=allReal.filter(t=>t.done).length;
  const doneVirt=virtRec.filter(v=>v.done).length;
  const bdayDone=virtExtras.filter(t=>t._type==='birthday'&&st.blocks.some(b=>b.cat==='Birthday'&&b.title===t.name&&b._done)).length;
  const totalAll=allReal.length+virtRec.length+virtExtras.length;
  const totalDone=doneReal+doneVirt+bdayDone;
  // wkBadge removed
  document.getElementById('wkPL').textContent=`${totalDone}/${totalAll}`;const _wkP=document.getElementById('wkPct');if(_wkP)_wkP.textContent=(totalAll?Math.round(totalDone/totalAll*100):0)+'%';
  document.getElementById('wkPB').style.width=totalAll?`${totalDone/totalAll*100}%`:'0%';
  document.getElementById('wkList').innerHTML=ts.map(t=>t._type==='travel'||t._type==='birthday'?tRowExtra(t):t._type==='fin-cancel'?tRowFinCancel(t):t._type==='shop'?tRowShopVirt(t):tRowWk(t)).join('');
  _attachListRubberBand(document.getElementById('wkList'));
}

// ── Week calendar ──────────────────────────────────────────────────────────────
// Track drag-to-add-travel state
let tvDragStart=null,tvDragEnd=null;
let calDrag={active:false,startDs:null,endDs:null,view:null,moved:false};
let _pasteColDates=null;


function renderWkCal(){
  if(typeof _vidStepReconstructBlocks==='function')_vidStepReconstructBlocks();
  const dates=getWkDates(wkOff);
  document.getElementById('wkcLbl').textContent=`${dates[0].toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${dates[6].toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
  const head=document.getElementById('wkcHead');head.innerHTML='';
  dates.forEach(d=>{
    const ds=d2s(d);
    const viewingDs=d2s(getDayDate(dayOff));
    const isViewed=ds===viewingDs;
    const h=document.createElement('div');h.className='wkc-day-h'+(isViewed&&!isDateToday(d)?' wkc-day-sel':'');
    h.style.cursor='pointer';
    h.innerHTML=`<div class="wkc-dn">${DNAMES[d.getDay()===0?6:d.getDay()-1].slice(0,3)}</div><div class="wkc-dd ${isDateToday(d)?'tn2':''}">${d.getDate()}</div>`;
    let _wkcHClk=null;
    h.addEventListener('click',()=>{
      if(_wkcHClk){clearTimeout(_wkcHClk);_wkcHClk=null;return;}
      _wkcHClk=setTimeout(()=>{
        _wkcHClk=null;
        const todayDs=d2s(new Date());
        const diff=Math.round((new Date(ds+'T00:00:00')-new Date(todayDs+'T00:00:00'))/86400000);
        dayOff=diff;
        renderToday();renderDayTB();renderWkCal();
      },250);
    });
    h.addEventListener('dblclick',e=>{e.stopPropagation();if(_wkcHClk){clearTimeout(_wkcHClk);_wkcHClk=null;}openQA('wkc',null,ds);});
    head.appendChild(h);
  });
  const goalsH=document.createElement('div');goalsH.className='wkc-day-h wkc-goals-h';
  const _unCnt=st.tasks.filter(t=>!t.due_date&&!t.done&&t.category!=='Long term'&&t.category!=='Weekly Goals').length;
  goalsH.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><button class="wo-hdr-btn" onclick="openWOModal()" style="font-size:10px">Objectives</button><div style="display:flex;align-items:center;gap:3px"><button class="wo-hdr-btn" onclick="toggleUnMenu()" id="unBadge2" title="${_unCnt?_unCnt+' unassigned tasks':'No unassigned tasks'}" style="padding:3px 5px;position:relative"><span style="font-size:10px;font-weight:600">${_unCnt||''}</span><span id="unBadgeDot" style="display:none;position:absolute;top:0;right:0;width:7px;height:7px;border-radius:50%;background:rgba(139,92,246,.6)"></span></button></div></div>`;
  head.appendChild(goalsH);

  // ── Render travel banners ────────────────────────────────────────────────────
  const bannerEl=document.getElementById('wkcBanners');
  // Wait for cols to lay out, then position
  const wkDss=dates.map(d=>d2s(d));
  // Get travel trips that overlap this week
  const travelThisWk=st.travel.filter(tv=>{
    const s=tv.start_date?tv.start_date.split('T')[0]:null;
    const e=tv.end_date?tv.end_date.split('T')[0]:s;
    if(!s)return false;
    return s<=wkDss[6]&&(e||s)>=wkDss[0];
  });
  const bdayThisWk=getBirthdaysInRange(wkDss[0],wkDss[6]);
  // Pre-compute banner lane counts (no DOM needed) so paddingTop is set before chips render
  const _preLanes=Array.from({length:7},()=>new Set());
  function _prePickLane(si,ei){for(let lane=0;;lane++){let ok=true;for(let i=si;i<=ei;i++){if(_preLanes[i].has(lane)){ok=false;break;}}if(ok)return lane;}}
  function _preAddBanner(startDs,endDs){
    const si=Math.max(0,wkDss.indexOf(wkDss.find(d=>d>=startDs)));
    const _eiRaw=wkDss.findIndex(d=>d>=(endDs||startDs));
    const ei=_eiRaw<0?6:Math.min(6,_eiRaw);
    if(si<0||si>6)return;
    const lane=_prePickLane(si,ei);
    for(let i=si;i<=ei;i++)_preLanes[i].add(lane);
  }
  [...travelThisWk].sort((a,b)=>(a.start_date||'').localeCompare(b.start_date||'')).forEach(tv=>{
    const sd=tv.start_date?tv.start_date.split('T')[0]:null;
    const ed=tv.end_date?tv.end_date.split('T')[0]:sd;
    if(sd)_preAddBanner(sd,ed);
  });
  bdayThisWk.forEach(b=>_preAddBanner(b.due_date,b.due_date));
  const _colPaddingPre=_preLanes.map(lanes=>lanes.size?`${(Math.max(...lanes)+1)*20}px`:'0');
  setTimeout(()=>{
    bannerEl.innerHTML='';
    const wrap=document.getElementById('wkcWrap');
    if(!wrap)return;
    const colEls=[...document.querySelectorAll('#wkcCols .wkc-col')];
    if(colEls.length!==7)return;
    const wrapRect=wrap.getBoundingClientRect();
    const headEl=document.getElementById('wkcHead');
    const headH=headEl?headEl.offsetHeight:0;
    const today2=tod();

    // Lane tracking: for each column, which row-lanes are occupied
    const colLanes=Array.from({length:7},()=>new Set());
    function pickLane(si,ei){for(let lane=0;;lane++){let ok=true;for(let i=si;i<=ei;i++){if(colLanes[i].has(lane)){ok=false;break;}}if(ok)return lane;}}

    function addBanner(label,startDs,endDs,s,onClick,isPast){
      const si=Math.max(0,wkDss.indexOf(wkDss.find(d=>d>=startDs)));
      const _eiRaw=wkDss.findIndex(d=>d>=(endDs||startDs));
      const ei=_eiRaw<0?6:Math.min(6,_eiRaw);
      if(si<0||si>6)return;
      const colStart=colEls[si],colEnd=colEls[ei];
      if(!colStart||!colEnd)return;
      const sr=colStart.getBoundingClientRect(),er=colEnd.getBoundingClientRect();
      const left=sr.left-wrapRect.left,right=er.right-wrapRect.left;
      const lane=pickLane(si,ei);
      for(let i=si;i<=ei;i++)colLanes[i].add(lane);
      const ban=document.createElement('div');ban.className='wkc-banner';
      ban.style.cssText=`left:${left+2}px;top:${headH+lane*20}px;width:${right-left-4}px;background:${s.bg};color:${s.t};border-color:${s.b}${isPast?';opacity:.35':''}`;
      ban.innerHTML=label;
      if(onClick)ban.addEventListener('click',onClick);
      bannerEl.appendChild(ban);
      return ban;
    }

    travelThisWk.sort((a,b)=>(a.start_date||'').localeCompare(b.start_date||''));
    travelThisWk.forEach(tv=>{
      const s=gc('travel');
      const sd=tv.start_date?tv.start_date.split('T')[0]:null;
      const ed=tv.end_date?tv.end_date.split('T')[0]:sd;
      const isPast=!!(ed&&ed<today2);
      const modeIconHtml=tv.travel_mode==='plane'?_PLANE_SVG:tv.travel_mode==='drive'?_CAR_SVG:'';
      const packIcon=`<span class="ban-pack-inline" title="Packing list">${_PACK_SVG}</span>`;
      const label=tv.destination?`${packIcon}${modeIconHtml}${escHtml(tv.name)} → ${escHtml(tv.destination)}`:`${packIcon}${modeIconHtml}${escHtml(tv.name)}`;
      const tripsEndsThisWeek=!ed||ed<=wkDss[6];
      const ban=addBanner(label,sd,ed,s,null,isPast);
      if(!ban)return;
      const tvSid='tv-'+tv.id;
      ban.dataset.tvid=String(tv.id);
      const pkEl=ban.querySelector('.ban-pack-inline');
      if(pkEl)pkEl.addEventListener('click',e=>{e.stopPropagation();openPackingModal(tv.id);});
      const del=document.createElement('button');del.className='ban-del';del.textContent='✕';
      del.addEventListener('click',e=>{e.stopPropagation();delTravel(tv.id);});
      ban.appendChild(del);
      ban.draggable=true;
      ban.addEventListener('dragstart',e=>{
        e.stopPropagation();
        dragId='travel::'+tv.id+'::0';
        e.dataTransfer.effectAllowed='move';
        document.body.classList.add('body-dragging');
        showWkcEdges(true);
      });
      ban.addEventListener('dragend',()=>{document.body.classList.remove('body-dragging');showWkcEdges(false);if(dragId&&dragId.startsWith('travel::'))dragId=null;});
      ban.addEventListener('click',e=>{
        if(e.target.classList.contains('ban-del'))return;
        e.stopPropagation();
        selectedTasks.clear();selectedTasks.add(tvSid);lastSelectedId=tvSid;
        applySelHighlight();
      });
      ban.addEventListener('dblclick',e=>{e.stopPropagation();openTravelModal(tv.id);});
      ban.addEventListener('contextmenu',e=>{
        e.preventDefault();e.stopPropagation();
        selectedTasks.clear();selectedTasks.add(tvSid);lastSelectedId=tvSid;
        applySelHighlight();
        showCtx(e,null,false,null,null,null,tv.id);
      });
    });
    bdayThisWk.forEach(b=>{
      const s=gc('birthday');
      const bdDone=st.blocks.some(bl=>bl.cat==='Birthday'&&bl.title===b.name&&bl._done);
      const bdPast=!bdDone&&b.due_date<today2;
      addBanner(b.name,b.due_date,b.due_date,s,null,bdDone||bdPast);
    });

    // Set banner container height based on lanes used (paddingTop already set synchronously)
    let maxLane=-1;
    colLanes.forEach(lanes=>{const ml=lanes.size?Math.max(...lanes):-1;if(ml>maxLane)maxLane=ml;});
    if(maxLane>=0)bannerEl.style.height=`${headH+(maxLane+1)*20}px`;
  },10);

  // ── Render per-day columns ───────────────────────────────────────────────────
  const cols=document.getElementById('wkcCols');cols.innerHTML='';
  dates.forEach((date,di)=>{
    const ds=d2s(date);
    const col=document.createElement('div');col.className='wkc-col'+(ds===d2s(getDayDate(dayOff))&&!isDateToday(date)?' wkc-col-sel':'');
    col.dataset.ds=ds;
    col.style.paddingTop=_colPaddingPre[di];

    // Mouse-drag to create travel spanning days
    col.addEventListener('mousedown',e=>{
      if(e.button!==0)return;
      _pasteColDates=[ds];
      if(e.target.closest('.chip,.wkc-banner,button'))return;
      calDrag={active:true,startDs:ds,endDs:ds,view:'wkc',moved:false};
      tvDragStart=di;tvDragEnd=di;
      highlightTvDrag(dates);
      e.preventDefault();
    });
    col.addEventListener('mouseenter',()=>{
      if(!calDrag.active||calDrag.view!=='wkc')return;
      if(ds!==calDrag.startDs)calDrag.moved=true;
      calDrag.endDs=ds;
      tvDragEnd=di;
      highlightTvDrag(dates);
    });

    // Drag-over for task drop
    col.addEventListener('dragover',e=>{
      // Skip if cursor is in edge zone — let wkcWrap handle it
      const wr=document.getElementById('wkcWrap');
      if(wr){const rr=wr.getBoundingClientRect();const _sun=[...document.querySelectorAll('#wkcCols .wkc-col')].pop();const _sunR=_sun?_sun.getBoundingClientRect().right:rr.right;if(e.clientX-rr.left<44||e.clientX>_sunR-44){col.classList.remove('drop-here');return;}}
      if(dragId&&dragId.startsWith('wkgoal::'))return;
      e.preventDefault();
      if(tvDragStart!==null){
        // Travel drag-select mode
        tvDragEnd=di;
        highlightTvDrag(dates);
      } else {
        col.classList.add('drop-here');const _eL=document.getElementById('wkcEdgeL'),_eR=document.getElementById('wkcEdgeR');if(_eL)_eL.classList.remove('active');if(_eR)_eR.classList.remove('active');
      }
    });
    col.addEventListener('dragleave',()=>col.classList.remove('drop-here'));
    col.addEventListener('dblclick',e=>{
      if(e.target.classList.contains('chip')||e.target.closest('.chip'))return;
      openQA('wkc',null,ds);
    });
    col.addEventListener('drop',async e=>{
      // If in edge zone, let wkcWrap handle it
      const _wr=document.getElementById('wkcWrap');
      if(_wr){const _r=_wr.getBoundingClientRect();if(e.clientX-_r.left<44||_r.right-e.clientX<44)return;}
      e.preventDefault();col.classList.remove('drop-here');
      if(!dragId)return;
      if(dragId.startsWith('travel::')){
        const parts=dragId.split('::');const tvId=parts[1],offsetDays=parseInt(parts[2])||0;
        const tv2=st.travel.find(x=>String(x.id)===String(tvId));
        if(tv2){
          const tvSd=(tv2.start_date||'').split('T')[0];const tvEd=(tv2.end_date||'').split('T')[0]||tvSd;
          const dur=Math.round((new Date(tvEd+'T00:00:00')-new Date(tvSd+'T00:00:00'))/86400000);
          const newStart=ds,newEnd=d2s(new Date(new Date(ds+'T00:00:00').getTime()+dur*86400000));
          const prevStart=tv2.start_date,prevEnd=tv2.end_date;
          tv2.start_date=newStart;tv2.end_date=newEnd;dragId=null;save();renderAll();
          sbReq('PATCH','travel',{start_date:newStart,end_date:newEnd},`?id=eq.${tvId}`);
          pushUndo(()=>{tv2.start_date=prevStart;tv2.end_date=prevEnd;save();renderAll();sbReq('PATCH','travel',{start_date:(prevStart||'').split('T')[0],end_date:(prevEnd||'').split('T')[0]},`?id=eq.${tvId}`);},'Moved trip');
        }
        dragId=null;return;
      }
      if(dragId.startsWith('rec::')){
        const [,recId,origDate]=dragId.split('::');
        const r=st.recurring.find(x=>String(x.id)===String(recId));
        if(r&&ds!==origDate){
          const wkKey=origDate?getWkKey(wkOff):getWkKey(wkOff);
          if(!r._dateOverrides)r._dateOverrides={};
          const prevOverride=r._dateOverrides[wkKey];
          const savedBlocks=st.blocks.filter(b=>b.recId&&String(b.recId)===String(r.id)&&b.ds===origDate).map(b=>({...b}));
          r._dateOverrides[wkKey]=ds;
          removeTBBlocksForDate(ds,{recId:r.id,oldDs:origDate});
          const _recSid='rec-virt-'+recId;
          const _recOtherUndos=[];
          _moveOtherSelected(ds,_recSid,_recOtherUndos);
          save();dragId=null;renderAll();if(document.getElementById('tbGrid'))renderDayTB();
          sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
          pushUndo(()=>{
            if(prevOverride)r._dateOverrides[wkKey]=prevOverride;
            else delete r._dateOverrides[wkKey];
            st.blocks=st.blocks.filter(b=>!(b.recId&&String(b.recId)===String(r.id)&&b.ds===ds));
            savedBlocks.forEach(b=>{st.blocks.push(b);sbSaveBlock(b);});
            _recOtherUndos.forEach(fn=>fn());
            save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
            sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
          },'Moved recurring task'+(selectedTasks.size>1?'s':''));
        }
        dragId=null;return;
      }
      // New-style WR rule dragged onto weekly calendar
      if(dragId.startsWith('wrrule::')){
        const ruleId=dragId.split('::')[1];
        const newWkKey=dsToWkKey(ds);
        const _wrRuleSid=selectedTasks.has('wrrule-virt-'+ruleId)?'wrrule-virt-'+ruleId:'wrrule-'+ruleId;
        const _isMultiWR=selectedTasks.has(_wrRuleSid)&&selectedTasks.size>1;
        const _curWkKey=getWkKey(wkOff);
        const _wrMoveIds=_isMultiWR?[...selectedTasks].filter(sid=>sid.startsWith('wrrule-')||sid.startsWith('wrrule-virt-')).map(sid=>sid.replace('wrrule-virt-','').replace('wrrule-','')):[ruleId];
        const _wrMoves=_wrMoveIds.map(rid=>{const r=st.wrRules.find(x=>String(x.id)===String(rid));if(!r)return null;return{r,rid,prevCur:r._dateOverrides?.[_curWkKey],prevNew:r._dateOverrides?.[newWkKey]};}).filter(Boolean);
        _wrMoves.forEach(({r})=>{if(!r._dateOverrides)r._dateOverrides={};if(_curWkKey!==newWkKey&&r._dateOverrides[_curWkKey]!==undefined)delete r._dateOverrides[_curWkKey];r._dateOverrides[newWkKey]=ds;});
        const _wrUndos=[()=>{_wrMoves.forEach(({r,rid,prevCur,prevNew})=>{if(!r._dateOverrides)r._dateOverrides={};if(_curWkKey!==newWkKey){if(prevCur!==undefined)r._dateOverrides[_curWkKey]=prevCur;else delete r._dateOverrides[_curWkKey];}if(prevNew!==undefined)r._dateOverrides[newWkKey]=prevNew;else delete r._dateOverrides[newWkKey];sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${rid}`);});}];
        // Multi-select: also move all other selected items
        if(_isMultiWR){
          [...selectedTasks].forEach(sid=>{
            if(sid.startsWith('wrrule'))return;
            if(sid.startsWith('wrec-')){
              const rid=sid.replace('wrec-','');const r2=st.recurring.find(x=>String(x.id)===String(rid));
              if(r2){if(!r2._dateOverrides)r2._dateOverrides={};const p=r2._dateOverrides[wkKey];r2._dateOverrides[wkKey]=ds;sbReq('PATCH','wr_recurring_rules',{date_overrides:r2._dateOverrides},recQs(r2.id));
                _wrUndos.push(()=>{if(p)r2._dateOverrides[wkKey]=p;else delete r2._dateOverrides[wkKey];sbReq('PATCH','wr_recurring_rules',{date_overrides:r2._dateOverrides},recQs(r2.id));});}
            }else if(sid.startsWith('rec-virt-')){
              const rid=sid.replace('rec-virt-','');const r2=st.recurring.find(x=>String(x.id)===String(rid));
              if(r2){if(!r2._dateOverrides)r2._dateOverrides={};const p=r2._dateOverrides[wkKey];r2._dateOverrides[wkKey]=ds;sbReq('PATCH','wr_recurring_rules',{date_overrides:r2._dateOverrides},recQs(r2.id));
                _wrUndos.push(()=>{if(p!==undefined)r2._dateOverrides[wkKey]=p;else delete r2._dateOverrides[wkKey];sbReq('PATCH','wr_recurring_rules',{date_overrides:r2._dateOverrides},recQs(r2.id));});}
            }else if(sid.startsWith('pup-sess-')){
              const sessId=sid.replace('pup-sess-','');const sess=st.pupSessions.find(s=>String(s.id)===String(sessId));
              if(sess){const prev=sess.day_date;sess.day_date=ds;sbReqSilent('PATCH','pup_skill_sessions',{day_date:ds},`?id=eq.${sessId}`);
                _wrUndos.push(()=>{sess.day_date=prev;sbReqSilent('PATCH','pup_skill_sessions',{day_date:prev},`?id=eq.${sessId}`);});}
            }else if(sid.startsWith('vid-ov-')){
              const vidId=sid.replace('vid-ov-','');_vidAssignToDay(vidId,ds);
            }else if(sid.startsWith('shop-cal-')){
              const shopId=sid.replace('shop-cal-','');const s=st.shopping.find(x=>String(x.id)===String(shopId));
              if(s){const prev=s.due_date;s.due_date=ds;sbReqNullable('PATCH','shopping_list',{due_date:ds},`?id=eq.${s.id}`);
                _wrUndos.push(()=>{s.due_date=prev;sbReqNullable('PATCH','shopping_list',{due_date:prev||null},`?id=eq.${s.id}`);});}
            }else{
              const t=st.tasks.find(x=>String(x.id)===sid);
              if(t&&!t._virtual){const prev=t.due_date;t.due_date=ds;localOverrides[sid]={due_date:ds};pendingLocal.add(sid);sbReqNullable('PATCH','tasks',{due_date:ds},`?id=eq.${t.id}`);
                _wrUndos.push(()=>{t.due_date=prev;localOverrides[sid]={due_date:prev};pendingLocal.add(sid);sbReqNullable('PATCH','tasks',{due_date:prev},`?id=eq.${t.id}`);});}
            }
          });
        }
        save();dragId=null;renderAll();if(document.getElementById('tbGrid'))renderDayTB();
        _wrMoves.forEach(({r,rid})=>sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${rid}`));
        pushUndo(()=>{_wrUndos.forEach(fn=>fn());save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();},'Moved tasks to '+ds);
        dragId=null;return;
      }
      // Weekly reset task dragged onto calendar
      if(dragId.startsWith('wrec::')){
        const recId=dragId.split('::')[1];
        const r=st.recurring.find(x=>String(x.id)===String(recId));
        const newWkKey=dsToWkKey(ds);
        const _wrecSid='wrec-'+recId;
        const _isMultiWrec=selectedTasks.has(_wrecSid)&&selectedTasks.size>1;
        const _wrecUndos=[];
        // Helper: move a recurring rule's override from old week to new week
        const _curWkKey=getWkKey(wkOff);
        const _moveRecOv=(rec,qs)=>{
          if(!rec._dateOverrides)rec._dateOverrides={};
          const prevCur=rec._dateOverrides[_curWkKey];
          const prevNew=rec._dateOverrides[newWkKey];
          // Remove from current week if moving to a different week
          if(_curWkKey!==newWkKey&&prevCur!==undefined)delete rec._dateOverrides[_curWkKey];
          rec._dateOverrides[newWkKey]=ds;
          removeTBBlocksForDate(ds,{recId:rec.id});
          sbReq('PATCH','wr_recurring_rules',{date_overrides:rec._dateOverrides},qs);
          _wrecUndos.push(()=>{if(_curWkKey!==newWkKey&&prevCur!==undefined)rec._dateOverrides[_curWkKey]=prevCur;if(prevNew!==undefined)rec._dateOverrides[newWkKey]=prevNew;else delete rec._dateOverrides[newWkKey];sbReq('PATCH','wr_recurring_rules',{date_overrides:rec._dateOverrides},qs);});
        };
        if(r)_moveRecOv(r,recQs(r.id));
        // Multi-select: also move all other selected items
        if(_isMultiWrec){
          [...selectedTasks].forEach(sid=>{
            if(sid===_wrecSid)return;
            if(sid.startsWith('wrec-')){
              const rid=sid.replace('wrec-','');const r2=st.recurring.find(x=>String(x.id)===String(rid));
              if(r2)_moveRecOv(r2,recQs(r2.id));
            }else if(sid.startsWith('wrrule-virt-')||sid.startsWith('wrrule-')){
              const rid=sid.replace('wrrule-virt-','').replace('wrrule-','');const r2=st.wrRules.find(x=>String(x.id)===String(rid));
              if(r2)_moveRecOv(r2,`?id=eq.${rid}`);
            }else if(sid.startsWith('rec-virt-')){
              const rid=sid.replace('rec-virt-','');const r2=st.recurring.find(x=>String(x.id)===String(rid));
              if(r2){if(!r2._dateOverrides)r2._dateOverrides={};const wk=getWkKey(wkOff);const p=r2._dateOverrides[wk];r2._dateOverrides[wk]=ds;sbReq('PATCH','wr_recurring_rules',{date_overrides:r2._dateOverrides},recQs(r2.id));
                _wrecUndos.push(()=>{if(p!==undefined)r2._dateOverrides[wk]=p;else delete r2._dateOverrides[wk];sbReq('PATCH','wr_recurring_rules',{date_overrides:r2._dateOverrides},recQs(r2.id));});}
            }else if(sid.startsWith('pup-sess-')){
              const sessId=sid.replace('pup-sess-','');const sess=st.pupSessions.find(s=>String(s.id)===String(sessId));
              if(sess){const prev=sess.day_date;sess.day_date=ds;sbReqSilent('PATCH','pup_skill_sessions',{day_date:ds},`?id=eq.${sessId}`);
                _wrecUndos.push(()=>{sess.day_date=prev;sbReqSilent('PATCH','pup_skill_sessions',{day_date:prev},`?id=eq.${sessId}`);});}
            }else if(sid.startsWith('vid-ov-')){
              const vidId=sid.replace('vid-ov-','');_vidAssignToDay(vidId,ds);
            }else if(sid.startsWith('shop-cal-')){
              const shopId=sid.replace('shop-cal-','');const s=st.shopping.find(x=>String(x.id)===String(shopId));
              if(s){const prev=s.due_date;s.due_date=ds;sbReqNullable('PATCH','shopping_list',{due_date:ds},`?id=eq.${s.id}`);
                _wrecUndos.push(()=>{s.due_date=prev;sbReqNullable('PATCH','shopping_list',{due_date:prev||null},`?id=eq.${s.id}`);});}
            }else{
              const t=st.tasks.find(x=>String(x.id)===sid);
              if(t&&!t._virtual){const prev=t.due_date;t.due_date=ds;localOverrides[sid]={due_date:ds};pendingLocal.add(sid);sbReqNullable('PATCH','tasks',{due_date:ds},`?id=eq.${t.id}`);
                _wrecUndos.push(()=>{t.due_date=prev;localOverrides[sid]={due_date:prev};pendingLocal.add(sid);sbReqNullable('PATCH','tasks',{due_date:prev},`?id=eq.${t.id}`);});}
            }
          });
        }
        save();dragId=null;renderAll();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();
        pushUndo(()=>{_wrecUndos.forEach(fn=>fn());save();renderAll();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();},'Moved tasks to '+ds);
        dragId=null;return;
      }
      // Pup session chip dragged to a new day — move the session
      if(dragId.startsWith('pupsess::')){
        const[,sessId,origDs]=dragId.split('::');
        if(ds!==origDs){
          const sess=st.pupSessions.find(s=>String(s.id)===String(sessId));
          if(sess){
            const already=st.pupSessions.find(s=>String(s.skill_id)===String(sess.skill_id)&&s.day_date===ds&&String(s.id)!==String(sessId));
            if(!already){
              const prev=sess.day_date;
              sess.day_date=ds;
              const _pupSid='pup-sess-'+sessId;
              const _otherUndos=[];
              _moveOtherSelected(ds,_pupSid,_otherUndos);
              save();dragId=null;renderPupSkillsHighlight();setTimeout(()=>{renderAll();if(document.getElementById('tbGrid'))renderDayTB();},0);
              sbReqSilent('PATCH','pup_skill_sessions',{day_date:ds},`?id=eq.${sessId}`);
              pushUndo(()=>{sess.day_date=prev;_otherUndos.forEach(fn=>fn());save();renderPupSkillsHighlight();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbReqSilent('PATCH','pup_skill_sessions',{day_date:prev},`?id=eq.${sessId}`);},'Moved pup session'+(selectedTasks.size>1?'s':''));
            }
          }
        }
        dragId=null;return;
      }
      // Pup skill dragged onto calendar day — create a session
      if(dragId.startsWith('pupskill::')){
        const skillId=dragId.split('::')[1];const _capDragId=dragId;
        dragId=null;
        const already=st.pupSessions.find(s=>String(s.skill_id)===String(skillId)&&s.day_date===ds);
        if(!already){
          const tmp='pss-tmp-'+Date.now();
          st.pupSessions.push({id:tmp,skill_id:skillId,day_date:ds,done:false});
          save();setTimeout(()=>{renderPupSkillsHighlight();renderWkCal();renderToday();},0);
          const sv=await sbReqSilent('POST','pup_skill_sessions',{skill_id:skillId,day_date:ds,done:false});
          if(sv&&sv[0]){const i=st.pupSessions.findIndex(s=>s.id===tmp);if(i>-1)st.pupSessions[i]=sv[0];save();renderWkCal();renderToday();}else save();
          const realId=st.pupSessions.find(s=>String(s.skill_id)===String(skillId)&&s.day_date===ds)?.id;
          pushUndo(()=>{st.pupSessions=st.pupSessions.filter(s=>!(String(s.skill_id)===String(skillId)&&s.day_date===ds));save();renderPupSkillsHighlight();renderWkCal();renderToday();if(realId)sbReqSilent('DELETE','pup_skill_sessions',null,`?id=eq.${realId}`);},'Added pup session');
        }
        return;
      }
      // Shopping item dragged onto calendar
      if(dragId.startsWith('shop::')){
        const shopId=dragId.split('::')[1];
        const _isMultiShop=selectedTasks.has('shop-cal-'+shopId)&&selectedTasks.size>1;
        const _shopMoveIds=_isMultiShop?[...selectedTasks].filter(sid=>sid.startsWith('shop-cal-')).map(sid=>sid.replace('shop-cal-','')):[shopId];
        const _shopMoves=_shopMoveIds.map(sid=>{const s=st.shopping.find(x=>String(x.id)===String(sid));return s?{s,prev:s.due_date,prevOrder:s.shop_order,prevDs:(s.due_date||'').split('T')[0],savedTBs:st.blocks.filter(b=>b.shopId&&String(b.shopId)===String(sid)&&b.ds===(s.due_date||'').split('T')[0]).map(b=>({...b}))}:null;}).filter(Boolean);
        if(_shopMoves.length){
          const newOrder=_shopTopOrder(_shopMoves[0].s);
          _shopMoves.forEach(({s},i)=>{s.due_date=ds;s.shop_order=newOrder-i;removeTBBlocksForDate(ds,{shopId:s.id,oldDs:_shopMoves[i].prevDs});});
          const _shopOtherUndos=[];
          if(_isMultiShop)_moveOtherSelected(ds,'shop-cal-'+shopId,_shopOtherUndos,['shop-cal-']);
          save();dragId=null;renderAll();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();
          _shopMoves.forEach(({s})=>sbReqNullable('PATCH','shopping_list',{due_date:ds,shop_order:s.shop_order},`?id=eq.${s.id}`));
          pushUndo(()=>{
            _shopMoves.forEach(({s,prev,prevOrder,savedTBs})=>{s.due_date=prev;s.shop_order=prevOrder;savedTBs.forEach(b=>{if(!st.blocks.find(x=>x.id===b.id))st.blocks.push(b);sbSaveBlock(b);});sbReqNullable('PATCH','shopping_list',{due_date:prev||null,shop_order:prevOrder??null},`?id=eq.${s.id}`);});
            _shopOtherUndos.forEach(fn=>fn());
            save();renderAll();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();
          },'Assigned shopping item to '+ds);
        }
        dragId=null;return;
      }
      // Video dragged onto calendar
      if(dragId.startsWith('vid::')){
        const vidId=dragId.split('::')[1];
        const _vidSid='vid-ov-'+vidId;
        const _isMultiVid=selectedTasks.has(_vidSid)&&selectedTasks.size>1;
        _vidAssignToDay(vidId,ds);
        if(_isMultiVid){
          const _vidOtherUndos=[];
          _moveOtherSelected(ds,_vidSid,_vidOtherUndos);
          save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
          if(_vidOtherUndos.length)pushUndo(()=>{_vidOtherUndos.forEach(fn=>fn());save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();},'Moved tasks to '+ds);
        }
        dragId=null;return;
      }
      if(dragId.startsWith('vidstep::')){
        const parts=dragId.split('::');_vidStepAssignToDay(parts[1],parts[2],ds);dragId=null;return;
      }
      if(dragId.startsWith('fin-cancel::')){dragId=null;return;}
      const _dragSid=String(dragId);
      const _isMulti=selectedTasks.has(_dragSid)&&selectedTasks.size>1;
      // Also move all other selected items when multi-dragging
      const _mixedUndos=[];
      if(_isMulti){
        _moveOtherSelected(ds,_dragSid,_mixedUndos);
      }
      const _taskSids=_isMulti?[...selectedTasks].filter(sid=>{const _t=st.tasks.find(x=>String(x.id)===sid);return _t&&!_t._virtual;}):[_dragSid];
      const _moved=_taskSids.map(sid=>({t:st.tasks.find(x=>String(x.id)===sid),prev:null})).filter(x=>x.t);
      if(_moved.length){
        _moved.forEach(x=>{x.prev=x.t.due_date;});
        _moved.forEach(x=>{
          const prevDs=(x.prev||'').split('T')[0];
          x.savedTBs=st.blocks.filter(b=>String(b.taskId)===String(x.t.id)&&b.ds===prevDs).map(b=>({...b}));
          x.t.due_date=ds;
          localOverrides[String(x.t.id)]={due_date:ds};pendingLocal.add(String(x.t.id));
          removeTBBlocksForDate(ds,{taskId:x.t.id,oldDs:prevDs});
          // Auto-create timeblock on new day if task had one or has @time in name
          const _timeRx=/@(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i;
          const _tmM=x.t.name.match(_timeRx);
          let _newSm=null,_newDur=null;
          if(x.savedTBs.length){_newSm=x.savedTBs[0].sm;_newDur=x.savedTBs[0].dur;}
          else if(_tmM){const _eAp=(_tmM[6]||'').toLowerCase();const _sAp=(_tmM[3]||_tmM[6]||'').toLowerCase();let h=parseInt(_tmM[1]),mm=parseInt(_tmM[2]||'0');if(_sAp==='pm'&&h!==12)h+=12;else if(_sAp==='am'&&h===12)h=0;else if(!_sAp&&h>=1&&h<=8)h+=12;_newSm=h*60+mm;if(_tmM[4]){let eh=parseInt(_tmM[4]),emm=parseInt(_tmM[5]||'0');if(_eAp==='pm'&&eh!==12)eh+=12;else if(_eAp==='am'&&eh===12)eh=0;else if(!_eAp&&eh>=1&&eh<=8)eh+=12;const endSm=eh*60+emm;if(endSm>_newSm)_newDur=endSm-_newSm;}if(!_newDur){const lc=(x.t.category||'').toLowerCase();_newDur=lc==='social'?180:lc==='work'||lc==='my work'||lc==='recurring'?60:30;}}
          if(_newSm!==null){const _nb={id:crypto.randomUUID(),title:x.t.name,ds,sm:_newSm,dur:_newDur,cat:x.t.category||'',taskId:String(x.t.id)};st.blocks.push(_nb);sbSaveBlock(_nb);}
        });
        dragId=null;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
        pushUndo(()=>{
          _moved.forEach(x=>{x.t.due_date=x.prev;localOverrides[String(x.t.id)]={due_date:x.prev};pendingLocal.add(String(x.t.id));const _newBlks=st.blocks.filter(b=>String(b.taskId)===String(x.t.id)&&b.ds===ds);_newBlks.forEach(b=>sbDeleteBlock(b.id));st.blocks=st.blocks.filter(b=>!(String(b.taskId)===String(x.t.id)&&b.ds===ds));x.savedTBs.forEach(b=>{if(!st.blocks.find(y=>y.id===b.id))st.blocks.push(b);sbSaveBlock(b);});sbReqNullable('PATCH','tasks',{due_date:x.prev},`?id=eq.${x.t.id}`).then(()=>{delete localOverrides[String(x.t.id)];pendingLocal.delete(String(x.t.id));});});
          _mixedUndos.forEach(fn=>fn());
          save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
        },'Moved task'+(_moved.length>1?'s':''));
        await Promise.all(_moved.map(x=>sbReqNullable('PATCH','tasks',{due_date:ds},`?id=eq.${x.t.id}`).then(()=>pendingLocal.delete(String(x.t.id)))));
      } else { dragId=null; }
    });

    // Exclude travel+birthday from per-col chips (shown as banners instead)
    // Non-WR recurring: check current week + past weeks for overrides moved forward
    const _recSeenDay=new Set();const virtForDay=[];const virtForDayDone=[];
    for(let _pw=wkOff;_pw>=wkOff-4;_pw--){
      getRecurringWeekTasks(_pw).filter(v=>v.due_date===ds&&!_recSeenDay.has(String(v._recId))).forEach(v=>{
        _recSeenDay.add(String(v._recId));
        if(v.done)virtForDayDone.push(v);else virtForDay.push(v);
      });
    }
    const wkKey2=getWkKey(wkOff);
    // Add weekly reset tasks pinned to this date — check current week AND past weeks (overdue moved forward)
    const _wrecSeenDay=new Set();const wrecForDay=[];const wrecForDayDone=[];
    for(let _pw=wkOff;_pw>=wkOff-4;_pw--){const _pwk=getWkKey(_pw);
      st.recurring.filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&r._dateOverrides&&r._dateOverrides[_pwk]===ds&&!_wrecSeenDay.has(String(r.id))).forEach(r=>{
        _wrecSeenDay.add(String(r.id));const _isDone=!!(r._doneByWk&&r._doneByWk[_pwk]);
        const _wn=_recWkNote(r,_pwk);
        const item={id:'rec-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:_isDone,_recId:r.id,_virtual:true,_wkKey:_pwk,_isWrec:true,_wkNote:_wn};
        if(_isDone)wrecForDayDone.push(item);else wrecForDay.push(item);
      });
    }
    const _wrRuleSeenDay=new Set();const wrRulesForDay=[];const wrRulesForDayDone=[];
    for(let _pw=wkOff;_pw>=wkOff-4;_pw--){const _pwk=getWkKey(_pw);
      st.wrRules.filter(r=>r._dateOverrides&&r._dateOverrides[_pwk]===ds&&!_wrRuleSeenDay.has(String(r.id))&&!(st.wrOverrides||[]).some(o=>String(o.rule_id)===String(r.id)&&o.wk_key===_pwk&&o.override_type==='skip')).forEach(r=>{
        _wrRuleSeenDay.add(String(r.id));const _isDone=isDoneWRRule(r.id,_pwk);
        const _wnr=_recWkNote(r,_pwk);
        const item={id:'wrrule-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:_isDone,_ruleId:r.id,_virtual:true,_wkKey:_pwk,_isWrRule:true,_wkNote:_wnr};
        if(_isDone)wrRulesForDayDone.push(item);else wrRulesForDay.push(item);
      });
    }
    // Add shopping items assigned to this date
    const shopForDay=st.shopping.filter(s=>s.due_date===ds&&!s.done).map(s=>({id:'shop-cal-'+s.id,name:s.name,category:'Shopping',due_date:ds,done:false,_shopId:s.id,_virtual:true,_type:'shop'}));
    const shopForDayDone=st.shopping.filter(s=>s.due_date===ds&&s.done).map(s=>({id:'shop-cal-done-'+s.id,name:s.name,category:'Shopping',due_date:ds,done:true,_shopId:s.id,_virtual:true,_type:'shop'}));
    const _mkPupSessItem=(s,done)=>{const skill=(st.pup_skills||[]).find(x=>String(x.id)===String(s.skill_id));if(!skill)return null;return{id:'pup-sess-'+(done?'done-':'')+s.id,name:skill.skill,category:'Recurring',due_date:ds,done,_pupSessId:s.id,_skillId:s.skill_id,_pup:skill.pup,_virtual:true,_type:'pup'};};
    const pupSessForDay=(st.pupSessions||[]).filter(s=>s.day_date===ds&&!s.done).map(s=>_mkPupSessItem(s,false)).filter(Boolean);
    const pupSessForDayDone=(st.pupSessions||[]).filter(s=>s.day_date===ds&&s.done).map(s=>_mkPupSessItem(s,true)).filter(Boolean);
    // Add videos assigned to this date
    const _vdm=_vidDayMap();
    const _vPend=v=>v.status==='published'&&typeof _vidGroupFullyComplete==='function'&&!_vidGroupFullyComplete(v);
    const _hasTabTask=vid=>{const m='_vid:'+vid;return st.tasks.some(t=>t.notes&&t.notes.includes(m));};
    const _vidOnTB=new Set(st.blocks.filter(b=>b.ds===ds&&b._vidId).map(b=>String(b._vidId)));
    const vidForDay=(st.videos||[]).filter(v=>!v.is_deleted&&((_vdm[String(v.id)]===ds)||_vidOnTB.has(String(v.id))||(_vPend(v)&&v.post_date===ds&&!_hasTabTask(v.id)))).map(v=>({id:'vid-ov-'+v.id,name:v.topic||v.title,category:'Videos',due_date:ds,done:v.status==='published',_vidId:v.id,_virtual:true,_type:'vid'}));
    const vidStepForDay=_vidStepTasksForDay(ds);
    const vidStepDone=vidStepForDay.filter(t=>t.done);
    const vidStepUndone=vidStepForDay.filter(t=>!t.done);
    const finCancelForDay=typeof _finCancelTasksForDate==='function'?_finCancelTasksForDate(ds):[];
    const undoneDay=sortTasksForDay([
      ...st.tasks.filter(t=>t.due_date&&t.due_date.split('T')[0]===ds&&!t.done&&t.category!=='Weekly Goals'),
      ...virtForDay,
      ...wrecForDay,
      ...wrRulesForDay,
      ...shopForDay,
      ...pupSessForDay,
      ...vidForDay,
      ...vidStepUndone,
      ...finCancelForDay
    ],ds);
    const doneDay=sortTasksForDay([
      ...st.tasks.filter(t=>t.due_date&&t.due_date.split('T')[0]===ds&&t.done&&t.category!=='Weekly Goals'),
      ...virtForDayDone,
      ...wrecForDayDone,
      ...wrRulesForDayDone,
      ...shopForDayDone,
      ...pupSessForDayDone,
      ...vidStepDone
    ],ds);
    let dayTasks=[...undoneDay,...doneDay];
    dayTasks.forEach(t=>{
      const ov=isOv(t.due_date)&&!t.done,imp=t.important&&!ov&&!t.done;
      const _chipCat=(t._isWrec||t._isWrRule)?'weekly_reset':(t._virtual&&t._recId?'recurring':t.category);
      const s=ov?_OV():imp?_IMP():(t._type==='fin-cancel'&&!t.done)?_IMP():t._type==='vid'?gc('videos'):t._type==='vidstep'?gc('videos'):t._type==='pup'?_pupSessStyle():gc(_chipCat);
      const chip=document.createElement('div');chip.className='chip'+(t.done?' done-chip':'')+(t._type==='fin-cancel'&&!t.done?' imp-row':'');
      chip.style.cssText=`background:${s.bg};color:${s.t};border-color:${s.b}`;
      if(!t._virtual)chip.dataset.tid=String(t.id);
      else if(t._type==='shop')chip.dataset.tid='shop-cal-'+t._shopId;
      else if(t._isWrRule)chip.dataset.tid='wrrule-virt-'+t._ruleId;
      else if(t._isWrec)chip.dataset.tid='wrec-'+t._recId;
      else if(t._recId)chip.dataset.tid='rec-virt-'+t._recId;
      else if(t._type==='vid')chip.dataset.tid='vid-ov-'+t._vidId;
      else if(t._type==='vidstep')chip.dataset.tid=t.id;
      else if(t._type==='pup')chip.dataset.tid='pup-sess-'+t._pupSessId;
      else if(t._type==='fin-cancel')chip.dataset.tid='fin-cancel-'+t._subId;
      chip.draggable=true;
      chip.addEventListener('dragstart',e2=>{
        if(t._type==='fin-cancel'){dragId='fin-cancel::'+t._subId;}
        else if(t._type==='vid'){dragId='vid::'+t._vidId;}
        else if(t._type==='vidstep'){dragId='vidstep::'+t._vidId+'::'+t._vidStep;}
        else if(t._type==='pup'){dragId='pupsess::'+t._pupSessId+'::'+ds;}
        else if(t._type==='shop'){dragId='shop::'+t._shopId;}
        else if(t._isWrRule){dragId='wrrule::'+t._ruleId;}
        else if(t._isWrec){dragId='wrec::'+t._recId;}
        else if(t._virtual){dragId='rec::'+t._recId+'::'+t.due_date;}
        else{dragId=String(t.id);}
        document.body.classList.add('body-dragging');
        chip.style.opacity='.4';showWkcEdges(true);e2.stopPropagation();
      });
      chip.addEventListener('dragend',()=>{chip.style.opacity='1';document.body.classList.remove('body-dragging');showWkcEdges(false);});
      const chk=document.createElement('input');chk.type='checkbox';chk.className='wchk';chk.checked=t.done;
      chk.addEventListener('change',e2=>{
        e2.stopPropagation();
        if(t._type==='fin-cancel'){togFinCancelDone(t._subId,chk.checked);}
        else if(t._type==='vid'){if(chk.checked)_vidCompleteFromOv(t._vidId,chk);else _vidUncompleteFromOv(t._vidId);}
        else if(t._type==='vidstep'){_vidStepToggleDone(t._vidId,t._vidStep,chk.checked);}
        else if(t._type==='pup'){togPupSessionDone(t._pupSessId,chk.checked);}
        else if(t._type==='shop'){togShop(t._shopId,chk.checked);}
        else if(t._isWrRule){togWrRule(String(t._ruleId),chk.checked,t._wkKey||getWkKey(wkOff));}
        else if(t._isWrec){togRec(t._recId,chk.checked);}
        else if(t._virtual){togRecVirt(t._recId,chk.checked,t._wkKey||getWkKey(wkOff));}
        else{toggleTask(t.id,chk.checked,'week');}
      });
      const _chipPrefix=_hebBadge(t.name)+_pupBadge(t.name);
      const _wkNoteSuffix=t._wkNote?` <span style="opacity:.5;font-size:8px">@${escHtml(t._wkNote)}</span>`:'';
      const nm=document.createElement('span');nm.className='chip-name';nm.innerHTML=_chipPrefix+tmIcon(t)+escHtml(t._type==='pup'?_pupDisplayName(t):t.name)+_wkNoteSuffix;
      // name click handled by chip click→selTask, dblclick→openEditTask
      chip.appendChild(chk);chip.appendChild(nm);
      // Bind click handlers for inline badge icons
      const _hebEl=nm.querySelector('.heb-cnt');if(_hebEl)_hebEl.addEventListener('click',ev=>{ev.stopPropagation();openGroceryModal();});
      const _pupEl=nm.querySelector('.pup-link-badge');if(_pupEl)_pupEl.addEventListener('click',ev=>{ev.stopPropagation();if(typeof _openPupFocusModal==='function')_openPupFocusModal(null);});
      if(t._type==='vid'){
        const _v2=(st.videos||[]).find(x=>String(x.id)===String(t._vidId));
        if(_v2){const _steps2=typeof VID_STEPS_CORE!=='undefined'?VID_STEPS_CORE:(typeof VID_STEPS!=='undefined'?VID_STEPS:[]);const _app2=_steps2.filter(s=>_v2[s]!=='na');const _dn2=_app2.filter(s=>_v2[s]==='done').length;const _pct2=_app2.length?Math.round(_dn2/_app2.length*100):0;
          const pctEl=document.createElement('span');pctEl.style.cssText='font-size:8px;opacity:.5;flex-shrink:0;margin-left:auto';pctEl.textContent=_pct2+'%';chip.appendChild(pctEl);}
      }
      chip.addEventListener('contextmenu',e=>{
        if(t._isWrRule){showWrRuleCtx(e,String(t._ruleId),t._wkKey||getWkKey(wkOff));}
        else if((t._isWrec||t._virtual)&&t._recId){showWrRuleCtx(e,String(t._recId),t._wkKey||getWkKey(wkOff));}
        else if(!t._virtual)showCtx(e,t.id);
      });
      chip.addEventListener('click',e=>{
        if(e.target.closest('.wchk')||e.target.closest('.chip-del'))return;
        // Use data-tid as selection id (works for regular tasks, shop-cal-, and wrec- items)
        const sid=chip.dataset.tid||String(t.id);
        if(!sid)return;
        e.stopPropagation();
        if(e.metaKey||e.ctrlKey){
          if(selectedTasks.has(sid))selectedTasks.delete(sid);else selectedTasks.add(sid);
          lastSelectedId=sid;
        } else if(e.shiftKey&&lastSelectedId){
          const col=chip.closest('.wkc-col');
          const allChips=col?[...col.querySelectorAll('.chip[data-tid]')]:[...document.querySelectorAll('#mCells .mcell-t[data-tid]')];
          const ids=allChips.map(el=>el.dataset.tid);
          const a=ids.indexOf(lastSelectedId),b=ids.indexOf(sid);
          if(a>-1&&b>-1){const lo=Math.min(a,b),hi=Math.max(a,b);ids.slice(lo,hi+1).forEach(x=>selectedTasks.add(x));}
          else selectedTasks.add(sid);
          lastSelectedId=sid;
        } else {
          selectedTasks.clear();selectedTasks.add(sid);lastSelectedId=sid;
        }
        applySelHighlight();
      });
      chip.addEventListener('dblclick',e=>{e.stopPropagation();if(t._type==='fin-cancel'){showPage('finance');}else if(t._type==='vid'){if(typeof openVidEdit==='function')openVidEdit(t._vidId);}else if(t._type==='pup'){openPupEditModal(t._skillId);}else if(t._type==='shop')tiDblShop(e,t._shopId);else if(t.notes&&t.notes.startsWith('_vid:')){if(typeof openVidEdit==='function')openVidEdit(t.notes.replace('_vid:',''));}else if(!t._virtual)tiDbl(e,t.id);else tiDblRec(e,t._recId,t._wkKey||getWkKey(wkOff));});
      const dx=document.createElement('button');dx.className='chip-del';dx.textContent='✕';
      dx.title=(t._type==='vid'||t._type==='vidstep'||t._type==='shop'||t._isWrec||t._isWrRule)?'Remove from calendar':(t._virtual&&t._recId)?'Delete recurring task':'Delete task';
      dx.addEventListener('click',e2=>{
        e2.stopPropagation();
        if(t._type==='vid'){_vidUnassignDay(t._vidId);return;}
        if(t._type==='pup'){removePupSession(t._pupSessId);return;}
        if(t._type==='shop'){
          const s=st.shopping.find(x=>String(x.id)===String(t._shopId));
          if(s){const prev=s.due_date;const linkedShopBlks=st.blocks.filter(b=>b.shopId&&String(b.shopId)===String(t._shopId)).map(b=>({...b}));s.due_date=null;st.blocks=st.blocks.filter(b=>!(b.shopId&&String(b.shopId)===String(t._shopId)));linkedShopBlks.forEach(b=>sbDeleteBlock(b.id));save();renderAll();renderWkCal();
            sbReqNullable('PATCH','shopping_list',{due_date:null},`?id=eq.${s.id}`);
            pushUndo(()=>{s.due_date=prev;linkedShopBlks.forEach(b=>{if(!st.blocks.find(x=>x.id===b.id))st.blocks.push(b);sbSaveBlock(b);});save();renderAll();renderWkCal();sbReqNullable('PATCH','shopping_list',{due_date:prev||null},`?id=eq.${s.id}`);},'Removed from calendar');}
        } else if(t._isWrRule){
          const _rid=String(t._ruleId),_wk=t._wkKey||getWkKey(wkOff);
          showWrScopePicker(e2,'⊘  Skip this week only','✕  Delete rule (all future)',
            ()=>writeWrOverride(_rid,_wk,{override_type:'skip'},{undoLabel:'Skipped WR task this week'}),
            ()=>wrCtxDeleteRule(_rid),'⊠  Remove from views',()=>unscheduleWrRule(_rid,_wk));
        } else if(t._isWrec){
          const _rid=String(t._recId),_wk=t._wkKey||getWkKey(wkOff);
          showWrScopePicker(e2,'⊘  Skip this week only','✕  Delete recurring task',
            ()=>skipWRec(_rid,_wk),
            ()=>delRec(_rid),'⊠  Remove from views',()=>unscheduleWRec(_rid,_wk));
        } else if(t._type==='vidstep'){
          _vidStepUnassign(t._vidId,t._vidStep);
        } else if(t._type==='fin-cancel'){
          delTask(t.id,e2);
        } else if(t._virtual&&t._recId){
          const _rid=String(t._recId),_wk=t._wkKey||getWkKey(wkOff);
          showWrScopePicker(e2,'⊘  Skip this week only','✕  Delete recurring task',
            ()=>skipRecVirtThisWk(_rid,_wk),
            ()=>delRec(_rid));
        } else{delTask(t.id,e2);}
      });
      chip.appendChild(dx);
      col.appendChild(chip);
    });

    cols.appendChild(col);
  });

  // ── Goals This Week column ────────────────────────────────────────────────
  const wkStart=d2s(dates[0]),wkEnd=d2s(dates[6]);
  const goalsCol=document.createElement('div');goalsCol.className='wkc-goals-col';goalsCol.style.paddingTop='0';
  goalsCol.addEventListener('dblclick',e=>{
    if(e.target.classList.contains('chip')||e.target.closest('.chip'))return;
    openQA('wkc',null,d2s(getDayDate(0)),'Weekly Goals');
  });
  const goalsUndone=st.tasks.filter(t=>t.category==='Weekly Goals'&&!t.done&&t.due_date&&t.due_date.split('T')[0]>=wkStart&&t.due_date.split('T')[0]<=wkEnd).sort((a,b)=>{const aI=a.important?0:1,bI=b.important?0:1;if(aI!==bI)return aI-bI;return(a.goal_order??9999)-(b.goal_order??9999);});
  const goalsDone=st.tasks.filter(t=>t.category==='Weekly Goals'&&t.done&&t.due_date&&t.due_date.split('T')[0]>=wkStart&&t.due_date.split('T')[0]<=wkEnd).sort((a,b)=>(a.goal_order??9999)-(b.goal_order??9999));
  // Overdue goals from past weeks (only show on current/future weeks, not when viewing past)
  const _goalsOvFromPast=wkStart<=tod()?st.tasks.filter(t=>t.category==='Weekly Goals'&&!t.done&&t.due_date&&t.due_date.split('T')[0]<wkStart).sort((a,b)=>(a.goal_order??9999)-(b.goal_order??9999)):[];
  const _goalsPast=wkEnd<tod();
  // "Move overdue to this week" banner
  if(_goalsOvFromPast.length>0){
    const mvBanner=document.createElement('div');mvBanner.style.cssText='display:flex;flex-direction:column;align-items:center;padding:2px 4px;margin-bottom:2px';
    const mvTxt=document.createElement('span');mvTxt.textContent=`${_goalsOvFromPast.length} Overdue`;mvTxt.style.cssText=`font-size:8px;font-weight:600;color:${_dk()?'#fca5a5':'#b91c1c'}`;
    const mvBtn=document.createElement('button');mvBtn.textContent='Move to this week';mvBtn.style.cssText='background:#ef4444;color:#fff;border:none;border-radius:5px;padding:3px 6px;font-size:9px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:2px;width:100%';
    mvBtn.addEventListener('click',e=>{e.stopPropagation();const prevDates=_goalsOvFromPast.map(t=>({id:t.id,prev:t.due_date}));_goalsOvFromPast.forEach(t=>{t.due_date=wkStart;sbReq('PATCH','tasks',{due_date:wkStart},`?id=eq.${t.id}`);});save();renderWkCal();renderWkSummary();if(document.getElementById('woModal')?.classList.contains('open'))renderWOModal();pushUndo(()=>{prevDates.forEach(p=>{const t=st.tasks.find(x=>String(x.id)===String(p.id));if(t){t.due_date=p.prev;sbReq('PATCH','tasks',{due_date:p.prev},`?id=eq.${t.id}`);}});save();renderWkCal();renderWkSummary();if(document.getElementById('woModal')?.classList.contains('open'))renderWOModal();},'Moved overdue goals to this week');});
    mvBanner.appendChild(mvTxt);mvBanner.appendChild(mvBtn);
    goalsCol.appendChild(mvBanner);
  }
  [..._goalsOvFromPast,...goalsUndone,...goalsDone].forEach(t=>{
    const _goalOv=_goalsPast&&!t.done;
    const _goalOvCarried=!_goalOv&&_goalsOvFromPast.includes(t);
    const imp=t.important&&!t.done&&!_goalOv&&!_goalOvCarried;
    const s=(_goalOv||_goalOvCarried)?_OV():imp?_IMP():{bg:_dk()?'rgba(255,255,255,.04)':'rgba(255,255,255,.82)',t:_dk()?'var(--text)':'rgba(80,80,95,.75)',b:_dk()?'rgba(255,255,255,.06)':'rgba(255,255,255,.9)'};
    const chip=document.createElement('div');chip.className='chip'+(t.done?' done-chip':'')+(_goalOv||_goalOvCarried?' ov-row':'');
    chip.style.cssText=`background:${s.bg};color:${s.t};border-color:${s.b}`;
    chip.dataset.tid=String(t.id);
    chip.draggable=true;
    let _blockGoalDrag=false;
    chip.addEventListener('dragstart',e2=>{if(_blockGoalDrag){e2.preventDefault();e2.stopPropagation();return;}dragId='wkgoal::'+String(t.id);document.body.classList.add('body-dragging');chip.style.opacity='.4';showWkcEdges(true);e2.stopPropagation();});
    chip.addEventListener('dragend',()=>{chip.style.opacity='1';document.body.classList.remove('body-dragging');showWkcEdges(false);});
    const chk=document.createElement('input');chk.type='checkbox';chk.className='wchk';chk.checked=t.done;
    chk.addEventListener('change',e2=>{e2.stopPropagation();toggleTask(t.id,chk.checked,'week');});
    const nm=document.createElement('span');nm.className='chip-name';nm.innerHTML=tmIcon(t)+escHtml(t.name);
    chip.appendChild(chk);chip.appendChild(nm);
    chip.addEventListener('contextmenu',e=>{showGoalCtx(e,String(t.id));});
    chip.addEventListener('click',e=>{
      if(e.target.closest('.wchk')||e.target.closest('.chip-del'))return;
      const sid=String(t.id);e.stopPropagation();
      if(e.metaKey||e.ctrlKey){if(selectedTasks.has(sid))selectedTasks.delete(sid);else selectedTasks.add(sid);lastSelectedId=sid;}
      else if(e.shiftKey&&lastSelectedId){const allC=[...goalsCol.querySelectorAll('.chip[data-tid]')];const ids=allC.map(el=>el.dataset.tid);const a=ids.indexOf(lastSelectedId),b=ids.indexOf(sid);if(a>-1&&b>-1){const lo=Math.min(a,b),hi=Math.max(a,b);ids.slice(lo,hi+1).forEach(x=>selectedTasks.add(x));}else selectedTasks.add(sid);lastSelectedId=sid;}
      else{selectedTasks.clear();selectedTasks.add(sid);lastSelectedId=sid;}
      applySelHighlight();
    });
    chip.addEventListener('dblclick',e=>{e.stopPropagation();tiDbl(e,t.id);});
    const dx=document.createElement('button');dx.className='chip-del';dx.textContent='✕';dx.title='Delete task';
    dx.addEventListener('click',e2=>{e2.stopPropagation();delTask(t.id,e2);});
    chip.appendChild(dx);
    chip.addEventListener('mousedown',e=>{
      if(e.target.closest('.wchk')||e.target.closest('.chip-del'))return;
      _blockGoalDrag=true;chip.draggable=false;
      let dragging=false,mode=null,ph=null;
      const startX=e.clientX,startY=e.clientY;
      const onMove=ev=>{
        const ddx=ev.clientX-startX,ddy=ev.clientY-startY;
        const dist=Math.abs(ddx)+Math.abs(ddy);
        if(!dragging&&dist<5)return;
        if(!dragging){window.getSelection()?.removeAllRanges();dragging=true;}
        if(!mode&&dist>=15){
          mode=Math.abs(ddx)>Math.abs(ddy)?'horiz':'vert';
          if(mode==='vert'){ph=document.createElement('div');ph.style.cssText=`height:2px;margin:2px 4px;border-radius:99px;background:rgba(150,150,160,.5);pointer-events:none;flex-shrink:0`;goalsCol.insertBefore(ph,chip);chip.remove();}
          else chip.style.opacity='.4';
        }
        if(!mode)return;
        ev.preventDefault();
        if(mode==='vert'){
          const chips=[...goalsCol.querySelectorAll('.chip')];let inserted=false;
          for(const c of chips){const rc=c.getBoundingClientRect();if(ev.clientY<rc.top+rc.height/2){goalsCol.insertBefore(ph,c);inserted=true;break;}}
          if(!inserted&&chips.length)chips[chips.length-1].after(ph);
        }else{
          const dir=ddx<-30?-1:ddx>30?1:0;
          goalsCol.dataset.wkdir=String(dir);
          const eL=document.getElementById('wkcEdgeL'),eR=document.getElementById('wkcEdgeR');
          if(eL&&eR){
            const gc=document.querySelector('.wkc-goals-col'),wrap=document.querySelector('.wkc-cols-wrap');
            if(gc&&wrap){const gr=gc.getBoundingClientRect(),wr=wrap.getBoundingClientRect();eL.style.left=(gr.left-wr.left)+'px';eR.style.left='';eR.style.right='';eR.style.transform='';}
            eL.classList.toggle('active',dir===-1);eR.classList.toggle('active',dir===1);
          }
        }
      };
      const onUp=()=>{
        document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);
        _blockGoalDrag=false;chip.draggable=true;
        showWkcEdges(false);
        if(mode==='vert'&&ph){
          goalsCol.insertBefore(chip,ph);ph.remove();chip.style.opacity='';
          const allChips=[...goalsCol.querySelectorAll('.chip[data-tid]')];
          allChips.forEach((c,i)=>{const task=st.tasks.find(x=>String(x.id)===c.dataset.tid);if(task)task.goal_order=i;});
          save();allChips.forEach(c=>{const task=st.tasks.find(x=>String(x.id)===c.dataset.tid);if(task)sbReqNullable('PATCH','tasks',{goal_order:task.goal_order},`?id=eq.${task.id}`);});
        }else if(mode==='horiz'){
          chip.style.opacity='';
          const dir=parseInt(goalsCol.dataset.wkdir||'0');
          delete goalsCol.dataset.wkdir;
          if(dir!==0){
            const nd=new Date((t.due_date||d2s(dates[0]))+'T12:00');nd.setDate(nd.getDate()+dir*7);
            const nDs=d2s(nd);const prevDs=t.due_date;t.due_date=nDs;save();
            pushUndo(()=>{t.due_date=prevDs;save();renderWkCal();renderWkSummary();sbReqNullable('PATCH','tasks',{due_date:prevDs},`?id=eq.${t.id}`);},'Moved goal week');
            sbReqNullable('PATCH','tasks',{due_date:nDs},`?id=eq.${t.id}`);
            shiftWk(dir);
          }
        }else if(ph){const next=ph.nextSibling;ph.remove();goalsCol.insertBefore(chip,next);chip.style.opacity='';}
        else chip.style.opacity='';
      };
      document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
    });
    goalsCol.appendChild(chip);
  });
  // Unassigned badge now in wkc-nav header
  cols.appendChild(goalsCol);
  requestAnimationFrame(()=>{document.querySelectorAll('#wkcCols .wkc-col').forEach(c=>_updateOverflowBadge(c));});
  if(typeof renderMealRow==='function')renderMealRow();
}

function highlightTvDrag(dates){
  const colEls=[...document.querySelectorAll('#wkcCols .wkc-col')];
  const si=Math.min(tvDragStart,tvDragEnd??tvDragStart);
  const ei=Math.max(tvDragStart,tvDragEnd??tvDragStart);
  colEls.forEach((c,i)=>{
    c.classList.toggle('drag-sel',i>=si&&i<=ei);
  });
}
function clearTvHighlight(){
  document.querySelectorAll('#wkcCols .wkc-col').forEach(c=>c.classList.remove('drag-sel'));
}
function clearCalDrag(){
  calDrag={active:false,startDs:null,endDs:null,view:null,moved:false};
  clearTvHighlight();
  document.querySelectorAll('#mCells .mcell.travel-sel').forEach(c=>c.classList.remove('travel-sel'));
}
let _calDragShiftLock=false;
document.addEventListener('mousemove',e=>{
  if(!calDrag.active||calDrag.view!=='wkc'||_calDragShiftLock)return;
  const wrap=document.getElementById('wkcCols');if(!wrap)return;
  const r=wrap.getBoundingClientRect();
  const EDGE=30;
  if(e.clientX<r.left+EDGE){
    _calDragShiftLock=true;clearCalDrag();shiftWk(-1);
    setTimeout(()=>{_calDragShiftLock=false;},300);
  } else if(e.clientX>r.right-EDGE){
    _calDragShiftLock=true;clearCalDrag();shiftWk(1);
    setTimeout(()=>{_calDragShiftLock=false;},300);
  }
});
document.addEventListener('mouseup',()=>{
  if(!calDrag.active)return;
  const s=calDrag.startDs,e=calDrag.endDs,moved=calDrag.moved;
  clearCalDrag();
  if(moved&&s){
    const start=s<=e?s:e,end=s<=e?e:s;
    if(typeof _copiedTasks!=='undefined'&&_copiedTasks.length>0){
      // Build array of dates in the dragged range for paste
      const arr=[];
      let cur=new Date(start+'T00:00:00');
      const endD=new Date(end+'T00:00:00');
      while(cur<=endD){arr.push(d2s(cur));cur.setDate(cur.getDate()+1);}
      _pasteColDates=arr;
    } else {
      openTravelModal(null,start,end);
    }
  }
});
document.addEventListener('dragstart',()=>{if(calDrag.active)clearCalDrag();});

// Edge zones for dragging to next/prev week
// type='goals': left edge starts at goals col, right edge after goals col (default right:0)
// type='cal' (default): left edge before Mon, right edge stops before goals col
function showWkcEdges(show){
  const eL=document.getElementById('wkcEdgeL'),eR=document.getElementById('wkcEdgeR');
  if(!eL||!eR)return;
  if(show){
    const wrap=document.querySelector('.wkc-cols-wrap');
    const sunCol=[...document.querySelectorAll('#wkcCols .wkc-col')].pop();
    if(wrap&&sunCol){const sr=sunCol.getBoundingClientRect(),wr=wrap.getBoundingClientRect();eR.style.left=(sr.right-wr.left-32)+'px';eR.style.right='auto';}
    else{eR.style.left='';eR.style.right='';}
    eL.classList.add('active');eR.classList.add('active');
  }else{eR.style.left='';eR.style.right='';eL.classList.remove('active');eR.classList.remove('active');}
  const er=document.getElementById('wkListEdgeR');
  if(er)er.classList.toggle('active',show);
}
// Edge drop zones
document.addEventListener('DOMContentLoaded',()=>{
  setupWkcEdgeDrop();
  setupEdge('wkListEdgeR',1);
});
function setupWkcEdgeDrop(){
  const wrap=document.getElementById('wkcWrap');if(!wrap)return;
  const EDGE=44;
  const edgeL=document.getElementById('wkcEdgeL');
  const edgeR=document.getElementById('wkcEdgeR');
  wrap.addEventListener('dragover',e=>{
    if(!dragId)return;
    const r=wrap.getBoundingClientRect();
    const sunCol=[...document.querySelectorAll('#wkcCols .wkc-col')].pop();
    const sunRight=sunCol?sunCol.getBoundingClientRect().right:r.right;
    const fl=e.clientX-r.left<EDGE,fr=e.clientX>sunRight-EDGE;
    if(fl||fr){
      e.preventDefault();
      if(edgeL)edgeL.style.opacity=fl?'1':'0';
      if(edgeR)edgeR.style.opacity=fr?'1':'0';
    } else {
      if(edgeL)edgeL.style.opacity='0';
      if(edgeR)edgeR.style.opacity='0';
    }
  });
  wrap.addEventListener('dragleave',e=>{
    if(!e.relatedTarget||!wrap.contains(e.relatedTarget)){
      if(edgeL)edgeL.style.opacity='';
      if(edgeR)edgeR.style.opacity='';
    }
  });
  wrap.addEventListener('drop',async e=>{
    if(!dragId)return;
    const r=wrap.getBoundingClientRect();
    const sunCol2=[...document.querySelectorAll('#wkcCols .wkc-col')].pop();
    const sunRight2=sunCol2?sunCol2.getBoundingClientRect().right:r.right;
    const fl=e.clientX-r.left<EDGE,fr=e.clientX>sunRight2-EDGE;
    if(!fl&&!fr)return;
    e.preventDefault();
    if(edgeL)edgeL.style.opacity='';
    if(edgeR)edgeR.style.opacity='';
    showWkcEdges(false);
    const dir=fl?-1:1;
    dragId=String(dragId);
    const targetWkOff=wkOff+dir;
    const targetDates=getWkDates(targetWkOff);
    const newDs=dir===1?d2s(targetDates[0]):d2s(targetDates[6]);
    if(dragId.startsWith('wrec::')){
      const recId=dragId.split('::')[1];
      const rec=st.recurring.find(x=>String(x.id)===String(recId));
      if(rec){
        if(!rec._dateOverrides)rec._dateOverrides={};
        const curWkKey=getWkKey(wkOff);
        const tgtWkKey=getWkKey(targetWkOff);
        const prevCur=rec._dateOverrides[curWkKey];
        const prevTgt=rec._dateOverrides[tgtWkKey];
        if(curWkKey!==tgtWkKey&&prevCur!==undefined)delete rec._dateOverrides[curWkKey];
        rec._dateOverrides[tgtWkKey]=newDs;
        dragId=null;shiftWk(dir);save();renderAll();
        sbReq('PATCH','wr_recurring_rules',{date_overrides:rec._dateOverrides},recQs(rec.id));
        pushUndo(()=>{if(curWkKey!==tgtWkKey&&prevCur!==undefined)rec._dateOverrides[curWkKey]=prevCur;if(prevTgt!==undefined)rec._dateOverrides[tgtWkKey]=prevTgt;else delete rec._dateOverrides[tgtWkKey];save();renderAll();sbReq('PATCH','wr_recurring_rules',{date_overrides:rec._dateOverrides},recQs(rec.id));},'Moved to other week');
      }
      dragId=null;return;
    }
    if(dragId.startsWith('rec::')){
      const recId=dragId.split('::')[1];
      const rec=st.recurring.find(x=>String(x.id)===String(recId));
      if(rec){
        if(!rec._dateOverrides)rec._dateOverrides={};
        const curWkKey=getWkKey(wkOff);const tgtWkKey=getWkKey(targetWkOff);
        const prevCurOv=rec._dateOverrides[curWkKey];const prevTgtOv=rec._dateOverrides[tgtWkKey];
        const prevStart=rec.starting_date;
        // Skip current week, add override for target week
        rec._dateOverrides[curWkKey]='__skip__';
        // For target week, use the same day-of-week as natural occurrence
        const cadence=rec.cadence||'weekly';
        const dow=dayNameToIdx(rec.appears_on_date);
        const tgtDate=dow>=0?getDateForDow(dow,targetWkOff):null;
        rec._dateOverrides[tgtWkKey]=tgtDate?d2s(tgtDate):newDs;
        // For interval tasks, shift starting_date so all future weeks align
        if((cadence==='biweekly'||cadence==='quarterly'||cadence==='biannual'||cadence==='annual')&&rec.starting_date){
          const sd=new Date(rec.starting_date+'T00:00:00');sd.setDate(sd.getDate()+dir*7);rec.starting_date=d2s(sd);
        }
        dragId=null;shiftWk(dir);save();renderAll();
        sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:rec._dateOverrides,starting_date:rec.starting_date||null},`?id=eq.${rec.id}`);
        pushUndo(()=>{
          if(prevCurOv!==undefined)rec._dateOverrides[curWkKey]=prevCurOv;else delete rec._dateOverrides[curWkKey];
          if(prevTgtOv!==undefined)rec._dateOverrides[tgtWkKey]=prevTgtOv;else delete rec._dateOverrides[tgtWkKey];
          rec.starting_date=prevStart;save();renderAll();
          sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:rec._dateOverrides,starting_date:rec.starting_date||null},`?id=eq.${rec.id}`);
        },'Moved to other week');
      }
      dragId=null;return;
    }
    if(dragId.startsWith('vid::')){
      const vidId=dragId.split('::')[1];
      _vidAssignToDay(vidId,newDs);
      dragId=null;shiftWk(dir);return;
    }
    if(dragId.startsWith('vidstep::')){
      const parts=dragId.split('::');_vidStepAssignToDay(parts[1],parts[2],newDs);dragId=null;shiftWk(dir);return;
    }
    if(dragId.startsWith('travel::')){
      const parts=dragId.split('::');const tvId=parts[1],offsetDays=parseInt(parts[2])||0;
      const tv2=st.travel.find(x=>String(x.id)===String(tvId));
      if(tv2){
        const tvSd=(tv2.start_date||'').split('T')[0];const tvEd=(tv2.end_date||'').split('T')[0]||tvSd;
        const dur=Math.round((new Date(tvEd+'T00:00:00')-new Date(tvSd+'T00:00:00'))/86400000);
        const newStart=newDs,newEnd=d2s(new Date(new Date(newDs+'T00:00:00').getTime()+dur*86400000));
        const prevStart=tv2.start_date,prevEnd=tv2.end_date;
        tv2.start_date=newStart;tv2.end_date=newEnd;dragId=null;shiftWk(dir);save();renderAll();
        sbReq('PATCH','travel',{start_date:newStart,end_date:newEnd},`?id=eq.${tvId}`);
        pushUndo(()=>{tv2.start_date=prevStart;tv2.end_date=prevEnd;save();renderAll();sbReq('PATCH','travel',{start_date:(prevStart||'').split('T')[0],end_date:(prevEnd||'').split('T')[0]},`?id=eq.${tvId}`);},'Moved trip');
      }
      dragId=null;return;
    }
    if(dragId.startsWith('fin-cancel::')){dragId=null;return;}
    if(dragId.startsWith('wkgoal::')){
      const tid=dragId.split('::')[1];
      const gt=st.tasks.find(x=>String(x.id)===tid);dragId=null;
      if(gt){const prevDs=gt.due_date;const d=new Date((gt.due_date||d2s(new Date()))+'T12:00');d.setDate(d.getDate()+dir*7);const nDs=d2s(d);gt.due_date=nDs;shiftWk(dir);save();renderAll();pushUndo(()=>{gt.due_date=prevDs;save();renderAll();sbReqNullable('PATCH','tasks',{due_date:prevDs},`?id=eq.${tid}`);},'Moved goal week');await sbReqNullable('PATCH','tasks',{due_date:nDs},`?id=eq.${tid}`);}
      return;
    }
    // Multi-task move: if dragged task is in selectedTasks with others, move all selected real tasks
    const _dragSid=String(dragId);const _isMulti=selectedTasks.has(_dragSid)&&selectedTasks.size>1;
    const _taskSids=_isMulti?[..._dragSid?selectedTasks:[]].filter(sid=>{const _t=st.tasks.find(x=>String(x.id)===sid);return _t&&!_t._virtual;}):[_dragSid];
    const _moved=_taskSids.map(sid=>({t:st.tasks.find(x=>String(x.id)===sid),prev:null})).filter(x=>x.t);
    _moved.forEach(x=>x.prev=x.t.due_date);
    _moved.forEach(x=>{x.t.due_date=newDs;localOverrides[String(x.t.id)]={due_date:newDs};pendingLocal.add(String(x.t.id));});
    dragId=null;shiftWk(dir);save();renderAll();
    pushUndo(()=>{_moved.forEach(x=>{x.t.due_date=x.prev;localOverrides[String(x.t.id)]={due_date:x.prev};pendingLocal.add(String(x.t.id));sbReqNullable('PATCH','tasks',{due_date:x.prev},`?id=eq.${x.t.id}`).then(()=>pendingLocal.delete(String(x.t.id)));});renderAll();},'Moved to other week');
    await Promise.all(_moved.map(x=>sbReqNullable('PATCH','tasks',{due_date:newDs},`?id=eq.${x.t.id}`).then(()=>pendingLocal.delete(String(x.t.id)))));
  });
}
function setupEdge(id,dir){
  const el=document.getElementById(id);
  if(!el)return;
  el.addEventListener('dragover',e=>{e.preventDefault();el.style.opacity='1';});
  el.addEventListener('dragleave',()=>{el.style.opacity='';});
  el.addEventListener('drop',async e=>{
    e.preventDefault();el.style.opacity='';showWkcEdges(false);
    if(!dragId)return;
    dragId=String(dragId);
    // Target: first day of next week (Monday, dow=0) or last day of prev week (Sunday, dow=6)
    const targetWkOff=wkOff+dir;
    const targetDates=getWkDates(targetWkOff);
    const newDs=dir===1?d2s(targetDates[0]):d2s(targetDates[6]);
    // Handle wrec:: (weekly reset)
    if(dragId.startsWith('wrec::')){
      const recId=dragId.split('::')[1];
      const r=st.recurring.find(x=>String(x.id)===String(recId));
      if(r){
        if(!r._dateOverrides)r._dateOverrides={};
        const curWkKey=getWkKey(wkOff);
        const tgtWkKey=getWkKey(targetWkOff);
        const prevCur=r._dateOverrides[curWkKey];
        const prevTgt=r._dateOverrides[tgtWkKey];
        if(curWkKey!==tgtWkKey&&prevCur!==undefined)delete r._dateOverrides[curWkKey];
        r._dateOverrides[tgtWkKey]=newDs;
        dragId=null;shiftWk(dir);save();renderAll();
        sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
        pushUndo(()=>{if(curWkKey!==tgtWkKey&&prevCur!==undefined)r._dateOverrides[curWkKey]=prevCur;if(prevTgt!==undefined)r._dateOverrides[tgtWkKey]=prevTgt;else delete r._dateOverrides[tgtWkKey];save();renderAll();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));},'Moved to other week');
      }
      dragId=null;return;
    }
    // Handle rec:: (non-weekly recurring virtual)
    if(dragId.startsWith('rec::')){
      const recId=dragId.split('::')[1];
      const rec=st.recurring.find(x=>String(x.id)===String(recId));
      if(rec){
        if(!rec._dateOverrides)rec._dateOverrides={};
        const curWkKey=getWkKey(wkOff);const tgtWkKey=getWkKey(targetWkOff);
        const prevCurOv=rec._dateOverrides[curWkKey];const prevTgtOv=rec._dateOverrides[tgtWkKey];
        const prevStart=rec.starting_date;
        rec._dateOverrides[curWkKey]='__skip__';
        const cadence=rec.cadence||'weekly';
        const dow=dayNameToIdx(rec.appears_on_date);
        const tgtDate=dow>=0?getDateForDow(dow,targetWkOff):null;
        rec._dateOverrides[tgtWkKey]=tgtDate?d2s(tgtDate):newDs;
        if((cadence==='biweekly'||cadence==='quarterly'||cadence==='biannual'||cadence==='annual')&&rec.starting_date){
          const sd=new Date(rec.starting_date+'T00:00:00');sd.setDate(sd.getDate()+dir*7);rec.starting_date=d2s(sd);
        }
        dragId=null;shiftWk(dir);save();renderAll();
        sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:rec._dateOverrides,starting_date:rec.starting_date||null},`?id=eq.${rec.id}`);
        pushUndo(()=>{
          if(prevCurOv!==undefined)rec._dateOverrides[curWkKey]=prevCurOv;else delete rec._dateOverrides[curWkKey];
          if(prevTgtOv!==undefined)rec._dateOverrides[tgtWkKey]=prevTgtOv;else delete rec._dateOverrides[tgtWkKey];
          rec.starting_date=prevStart;save();renderAll();
          sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:rec._dateOverrides,starting_date:rec.starting_date||null},`?id=eq.${rec.id}`);
        },'Moved to other week');
      }
      dragId=null;return;
    }
    if(dragId.startsWith('vid::')){
      const vidId=dragId.split('::')[1];
      _vidAssignToDay(vidId,newDs);
      dragId=null;shiftWk(dir);return;
    }
    if(dragId.startsWith('vidstep::')){
      const parts=dragId.split('::');_vidStepAssignToDay(parts[1],parts[2],newDs);dragId=null;shiftWk(dir);return;
    }
    if(dragId.startsWith('travel::')){
      const parts=dragId.split('::');const tvId=parts[1],offsetDays=parseInt(parts[2])||0;
      const tv2=st.travel.find(x=>String(x.id)===String(tvId));
      if(tv2){
        const tvSd=(tv2.start_date||'').split('T')[0];const tvEd=(tv2.end_date||'').split('T')[0]||tvSd;
        const dur=Math.round((new Date(tvEd+'T00:00:00')-new Date(tvSd+'T00:00:00'))/86400000);
        const newStart=newDs,newEnd=d2s(new Date(new Date(newDs+'T00:00:00').getTime()+dur*86400000));
        const prevStart=tv2.start_date,prevEnd=tv2.end_date;
        tv2.start_date=newStart;tv2.end_date=newEnd;dragId=null;shiftWk(dir);save();renderAll();
        sbReq('PATCH','travel',{start_date:newStart,end_date:newEnd},`?id=eq.${tvId}`);
        pushUndo(()=>{tv2.start_date=prevStart;tv2.end_date=prevEnd;save();renderAll();sbReq('PATCH','travel',{start_date:(prevStart||'').split('T')[0],end_date:(prevEnd||'').split('T')[0]},`?id=eq.${tvId}`);},'Moved trip');
      }
      dragId=null;return;
    }
    // Regular task
    if(dragId.startsWith('fin-cancel::')){dragId=null;return;}
    if(dragId.startsWith('wkgoal::')){
      const tid=dragId.split('::')[1];
      const gt=st.tasks.find(x=>String(x.id)===tid);dragId=null;
      if(gt){const prevDs=gt.due_date;const d=new Date((gt.due_date||d2s(new Date()))+'T12:00');d.setDate(d.getDate()+dir*7);const nDs=d2s(d);gt.due_date=nDs;shiftWk(dir);save();renderAll();pushUndo(()=>{gt.due_date=prevDs;save();renderAll();sbReqNullable('PATCH','tasks',{due_date:prevDs},`?id=eq.${tid}`);},'Moved goal week');await sbReqNullable('PATCH','tasks',{due_date:nDs},`?id=eq.${tid}`);}
      return;
    }
    const _dragSid2=String(dragId);const _isMulti2=selectedTasks.has(_dragSid2)&&selectedTasks.size>1;
    const _taskSids2=_isMulti2?[..._dragSid2?selectedTasks:[]].filter(sid=>{const _t=st.tasks.find(x=>String(x.id)===sid);return _t&&!_t._virtual;}):[_dragSid2];
    const _moved2=_taskSids2.map(sid=>({t:st.tasks.find(x=>String(x.id)===sid),prev:null})).filter(x=>x.t);
    _moved2.forEach(x=>x.prev=x.t.due_date);
    _moved2.forEach(x=>{x.t.due_date=newDs;localOverrides[String(x.t.id)]={due_date:newDs};pendingLocal.add(String(x.t.id));});
    dragId=null;shiftWk(dir);save();renderAll();
    pushUndo(()=>{_moved2.forEach(x=>{x.t.due_date=x.prev;localOverrides[String(x.t.id)]={due_date:x.prev};pendingLocal.add(String(x.t.id));sbReqNullable('PATCH','tasks',{due_date:x.prev},`?id=eq.${x.t.id}`).then(()=>pendingLocal.delete(String(x.t.id)));});renderAll();},'Moved to other week');
    await Promise.all(_moved2.map(x=>sbReqNullable('PATCH','tasks',{due_date:newDs},`?id=eq.${x.t.id}`).then(()=>pendingLocal.delete(String(x.t.id)))));
  });
}

function moveGoalWeeks(taskId,delta){const t=st.tasks.find(x=>String(x.id)===taskId);if(!t)return;const prev=t.due_date;const d=new Date((t.due_date||d2s(new Date()))+'T12:00');d.setDate(d.getDate()+delta*7);const nDs=d2s(d);t.due_date=nDs;save();renderAll();renderRecMoCal();pushUndo(()=>{t.due_date=prev;save();renderAll();renderRecMoCal();sbReqNullable('PATCH','tasks',{due_date:prev},`?id=eq.${taskId}`);},'Moved goal week');sbReqNullable('PATCH','tasks',{due_date:nDs},`?id=eq.${taskId}`);}
function showGoalCtx(e,taskId){
  e.preventDefault();e.stopPropagation();
  showWrScopePicker(e,'← Previous week','→ Next week',
    ()=>moveGoalWeeks(taskId,-1),
    ()=>moveGoalWeeks(taskId,1),
    'Custom…',
    ()=>{const n=parseInt(prompt('Move how many weeks? (use negative for past)','1'));if(!isNaN(n)&&n!==0)moveGoalWeeks(taskId,n);}
  );
}
// ── Weekly Objectives Modal ────────────────────────────────────────────────────
let _woViewOff=0; // weeks offset relative to wkOff for the modal view start
function openWOModal(){
  _woViewOff=0;
  renderWOModal();
  document.getElementById('woModal').classList.add('open');
}
function closeWOModal(e){
  const el=document.getElementById('woModal');
  if(e&&e.target!==el)return;
  el.classList.remove('open');
}
function woShift(dir){_woViewOff+=dir;renderWOModal();}
function renderWOModal(){
  const cols=document.getElementById('woCols');if(!cols)return;
  cols.innerHTML='';
  const MON_ABBR=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for(let i=0;i<5;i++){
    const off=wkOff+_woViewOff+i;
    const{mon}=getWkBounds(off);
    const sun=new Date(mon);sun.setDate(mon.getDate()+6);
    const wkStart=d2s(mon),wkEnd=d2s(sun);
    const isCurrent=(off===wkOff);
    const isPast=off<wkOff;
    const col=document.createElement('div');
    col.className='wo-col'+(isCurrent?' wo-col-current':isPast?' wo-col-past':'');
    col.dataset.wkOff=String(off);col.dataset.wkStart=wkStart;col.dataset.wkEnd=wkEnd;
    const lbl=isCurrent?'This Week':(isPast?`${Math.abs(off-wkOff)}w ago`:(off-wkOff===1?'Next Week':`+${off-wkOff} wks`));
    const hdr=document.createElement('div');hdr.className='wo-col-h';
    hdr.innerHTML=`<div class="wo-col-lbl">${lbl}</div><div class="wo-col-range">${MON_ABBR[mon.getMonth()]} ${mon.getDate()} – ${MON_ABBR[sun.getMonth()]} ${sun.getDate()}</div>`;
    col.appendChild(hdr);
    const body=document.createElement('div');body.className='wo-col-body';body.dataset.wkOff=String(off);body.dataset.wkStart=wkStart;
    const goals=st.tasks.filter(t=>t.category==='Weekly Goals'&&t.due_date&&t.due_date.split('T')[0]>=wkStart&&t.due_date.split('T')[0]<=wkEnd)
      .sort((a,b)=>{const aI=a.important&&!a.done?0:1,bI=b.important&&!b.done?0:1;if(aI!==bI)return aI-bI;return(a.goal_order??9999)-(b.goal_order??9999);});
    // Overdue goals from past weeks carried into current week column only
    const _woOvGoals=isCurrent?st.tasks.filter(t=>t.category==='Weekly Goals'&&!t.done&&t.due_date&&t.due_date.split('T')[0]<wkStart):[];
    if(_woOvGoals.length>0){
      const woBanner=document.createElement('div');woBanner.style.cssText=`display:flex;flex-direction:column;align-items:center;padding:4px 6px;margin-bottom:3px;border-radius:4px;background:${_dk()?'rgba(239,68,68,.10)':'rgba(254,242,242,.9)'}`;
      const woTxt=document.createElement('span');woTxt.textContent=`${_woOvGoals.length} Overdue`;woTxt.style.cssText=`font-size:10px;font-weight:600;color:${_dk()?'#fca5a5':'#b91c1c'}`;
      const woBtn=document.createElement('button');woBtn.textContent='Move to this week';woBtn.style.cssText='background:#ef4444;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:9px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:2px;width:100%';
      woBtn.addEventListener('click',e=>{e.stopPropagation();const prevDates=_woOvGoals.map(t=>({id:t.id,prev:t.due_date}));_woOvGoals.forEach(t=>{t.due_date=wkStart;sbReq('PATCH','tasks',{due_date:wkStart},`?id=eq.${t.id}`);});save();renderWOModal();renderWkCal();renderWkSummary();pushUndo(()=>{prevDates.forEach(p=>{const t=st.tasks.find(x=>String(x.id)===String(p.id));if(t){t.due_date=p.prev;sbReq('PATCH','tasks',{due_date:p.prev},`?id=eq.${t.id}`);}});save();renderWOModal();renderWkCal();renderWkSummary();},'Moved overdue goals to this week');});
      woBanner.appendChild(woTxt);woBanner.appendChild(woBtn);
      body.appendChild(woBanner);
    }
    _woOvGoals.forEach(t=>{ body.appendChild(_woMakeChip(t,body,false,true,wkStart)); });
    goals.forEach(t=>{ body.appendChild(_woMakeChip(t,body,isPast,false,wkStart)); });
    body.addEventListener('dblclick',e=>{if(e.target===body)openQA('wkc',null,wkStart,'Weekly Goals');});
    col.appendChild(body);
    cols.appendChild(col);
  }
}
function _woMakeChip(t,body,isPastWk,isCarriedOv,targetWkStart){
  const ov=(isPastWk&&!t.done)||isCarriedOv;
  const imp=t.important&&!t.done&&!ov;
  const s=ov?_OV():imp?_IMP():{bg:_dk()?'rgba(255,255,255,.04)':'rgba(255,255,255,.82)',t:_dk()?'var(--text)':'rgba(80,80,95,.75)',b:_dk()?'rgba(255,255,255,.06)':'rgba(255,255,255,.9)'};
  const chip=document.createElement('div');
  chip.className='chip wo-chip'+(t.done?' done-chip':'')+(ov?' ov-row':'');chip.dataset.tid=String(t.id);
  chip.style.cssText=`background:${s.bg};color:${s.t};border-color:${s.b};width:100%;box-sizing:border-box`;
  // Checkbox
  const chk=document.createElement('input');chk.type='checkbox';chk.className='wchk';chk.checked=t.done;
  chk.addEventListener('change',e2=>{e2.stopPropagation();toggleTask(t.id,chk.checked,'week');});
  chip.appendChild(chk);
  // Name
  const nm=document.createElement('span');nm.className='chip-name';nm.innerHTML=tmIcon(t)+escHtml(t.name);
  chip.appendChild(nm);
  // Delete button
  const dx=document.createElement('button');dx.className='chip-del';dx.textContent='✕';dx.title='Delete task';
  dx.addEventListener('click',e2=>{e2.stopPropagation();delTask(t.id,e2);});
  chip.appendChild(dx);
  // Click = select
  chip.addEventListener('click',e=>{
    if(e.target.closest('.wchk,.chip-del'))return;
    const sid=String(t.id);e.stopPropagation();
    if(e.metaKey||e.ctrlKey){if(selectedTasks.has(sid))selectedTasks.delete(sid);else selectedTasks.add(sid);lastSelectedId=sid;}
    else if(e.shiftKey&&lastSelectedId){const allC=[...body.querySelectorAll('.chip[data-tid]')];const ids=allC.map(el=>el.dataset.tid);const a=ids.indexOf(lastSelectedId),b2=ids.indexOf(sid);if(a>-1&&b2>-1){const lo=Math.min(a,b2),hi=Math.max(a,b2);ids.slice(lo,hi+1).forEach(x=>selectedTasks.add(x));}else selectedTasks.add(sid);lastSelectedId=sid;}
    else{selectedTasks.clear();selectedTasks.add(sid);lastSelectedId=sid;}
    applySelHighlight();
  });
  // Double-click = edit
  chip.addEventListener('dblclick',e=>{e.stopPropagation();tiDbl(e,t.id);});
  // Right-click = full context menu (edit/duplicate/delete)
  chip.addEventListener('contextmenu',e=>{showCtx(e,String(t.id));});
  // Drag
  chip.addEventListener('mousedown',ev=>{
    if(ev.button!==0||ev.target.closest('.wchk,.chip-del'))return;
    ev.preventDefault();ev.stopPropagation();
    const srcBody=chip.parentElement||body,srcTid=String(t.id);
    let startX=ev.clientX,startY=ev.clientY,mode=null,ph=null,clone=null;
    const phStyle=`height:20px;margin:2px 0;border-radius:5px;background:${_dk()?'rgba(255,255,255,.04)':'rgba(255,255,255,.25)'};border:1.5px dashed ${_dk()?'rgba(255,255,255,.10)':'rgba(255,255,255,.7)'}`;
    const eL=document.getElementById('woEdgeL'),eR=document.getElementById('woEdgeR');
    const onMove=mv=>{
      const dx=mv.clientX-startX,dy=mv.clientY-startY;
      if(!mode&&Math.hypot(dx,dy)<15)return;
      if(!mode){
        mode=Math.abs(dy)>=Math.abs(dx)?'vert':'horiz';
        chip.style.opacity='.3';
        ph=document.createElement('div');ph.className='wo-ph';ph.style.cssText=phStyle;
        srcBody.insertBefore(ph,chip);
        if(mode==='horiz'){
          const cw=chip.getBoundingClientRect().width;
          clone=chip.cloneNode(true);
          clone.style.cssText+=`;position:fixed;pointer-events:none;z-index:9999;opacity:.85;cursor:grabbing;width:${cw}px`;
          document.body.appendChild(clone);
        }
      }
      if(mode==='vert'){
        const chips=[...srcBody.querySelectorAll('.wo-chip:not([data-tid="'+srcTid+'"])')];
        let ins=false;
        for(const c of chips){const rc=c.getBoundingClientRect();if(mv.clientY<rc.top+rc.height/2){srcBody.insertBefore(ph,c);ins=true;break;}}
        if(!ins)srcBody.appendChild(ph);
      } else {
        clone.style.left=(mv.clientX-40)+'px';clone.style.top=(mv.clientY-10)+'px';
        const wrap=document.getElementById('woColsWrap');
        const wr=wrap?wrap.getBoundingClientRect():null;
        const onLeft=wr&&mv.clientX<wr.left+44;
        const onRight=wr&&mv.clientX>wr.right-44;
        if(eL)eL.classList.toggle('active',onLeft);
        if(eR)eR.classList.toggle('active',onRight);
        if(!onLeft&&!onRight){
          const allBodies=[...document.querySelectorAll('.wo-col-body')];
          let overBody=null;
          for(const b of allBodies){const r=b.getBoundingClientRect();if(mv.clientX>=r.left&&mv.clientX<=r.right&&mv.clientY>=r.top&&mv.clientY<=r.bottom){overBody=b;break;}}
          if(overBody){
            const chips=[...overBody.querySelectorAll('.wo-chip:not([data-tid="'+srcTid+'"])')];
            let ins=false;
            for(const c of chips){const rc=c.getBoundingClientRect();if(mv.clientY<rc.top+rc.height/2){overBody.insertBefore(ph,c);ins=true;break;}}
            if(!ins)overBody.appendChild(ph);
          }
        }
      }
    };
    const onUp=async uv=>{
      document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);
      if(clone)clone.remove();
      chip.style.opacity='';
      if(eL)eL.classList.remove('active');
      if(eR)eR.classList.remove('active');
      if(!mode){return;}
      if(mode==='vert'){
        if(!ph){return;}
        srcBody.insertBefore(chip,ph);ph.remove();
        const allChips=[...srcBody.querySelectorAll('.wo-chip[data-tid]')];
        allChips.forEach((c,i)=>{const tk=st.tasks.find(x=>String(x.id)===c.dataset.tid);if(tk){tk.goal_order=i;sbReqNullable('PATCH','tasks',{goal_order:i},`?id=eq.${tk.id}`);}});
        save();return;
      }
      // horiz mode
      const wrap=document.getElementById('woColsWrap');
      const wr=wrap?wrap.getBoundingClientRect():null;
      const onLeft=wr&&uv.clientX<wr.left+44;
      const onRight=wr&&uv.clientX>wr.right-44;
      if(onLeft||onRight){
        if(ph)ph.remove();
        const dir=onLeft?-1:1;
        const targetOff=(onLeft?wkOff+_woViewOff-1:wkOff+_woViewOff+5);
        const{mon:tMon}=getWkBounds(targetOff);
        const nDs=d2s(tMon);const prev=t.due_date;t.due_date=nDs;save();
        sbReqNullable('PATCH','tasks',{due_date:nDs},`?id=eq.${t.id}`);
        pushUndo(()=>{t.due_date=prev;save();renderAll();renderWkCal();sbReqNullable('PATCH','tasks',{due_date:prev},`?id=eq.${t.id}`);},'Moved goal week');
        renderWkCal();renderWkSummary();
        _woViewOff+=dir;renderWOModal();
      } else {
        if(!ph){return;}
        const destBody=ph.parentElement;
        if(!destBody){ph.remove();return;}
        const destOff=parseInt(destBody.dataset.wkOff);
        const destWkStart=destBody.dataset.wkStart;
        ph.replaceWith(chip);
        if(destOff!==parseInt(srcBody.dataset.wkOff)){
          const nDs=destWkStart;const prev=t.due_date;t.due_date=nDs;save();
          sbReqNullable('PATCH','tasks',{due_date:nDs},`?id=eq.${t.id}`);
          pushUndo(()=>{t.due_date=prev;save();renderAll();renderWkCal();sbReqNullable('PATCH','tasks',{due_date:prev},`?id=eq.${t.id}`);},'Moved goal week');
          renderWkCal();renderWkSummary();
        }
        const allChips=[...destBody.querySelectorAll('.wo-chip[data-tid]')];
        allChips.forEach((c,i)=>{const tk=st.tasks.find(x=>String(x.id)===c.dataset.tid);if(tk){tk.goal_order=i;sbReqNullable('PATCH','tasks',{goal_order:i},`?id=eq.${tk.id}`);}});
        save();renderWOModal();
      }
    };
    document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
  });
  return chip;
}
const _wkcSw={d:0,t:null,lock:false};
function onWkcWheel(e){_hSwipe(_wkcSw,e,dir=>shiftWk(dir));}

// Returns true if a weekly-reset recurring task is scheduled during week `off`
function isWRecDueThisWeek(r,off=0){
  const cadence=r.cadence||'weekly';
  const wkDates=getWkDates(off);
  if(cadence==='monthly'){
    const sched=r.appears_on_date||'';
    const domNum=parseInt(sched,10);
    const isDomOnly=!isNaN(domNum)&&String(domNum)===String(sched).trim();
    if(isDomOnly){
      if(domNum<1||domNum>31)return false;
      const match=wkDates.find(d=>d.getDate()===domNum);if(!match)return false;
      if(r.starting_date){const sd=new Date(r.starting_date+'T00:00:00');if(match<sd)return false;}
      return true;
    } else {
      const nwdMatch=sched.match(/^(\d+)(?:st|nd|rd|th)?\s+(\w+)$/i);if(!nwdMatch)return false;
      const n=parseInt(nwdMatch[1],10);
      const DAYS2=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const dow=DAYS2.findIndex(d=>d.toLowerCase()===nwdMatch[2].toLowerCase());if(dow<0)return false;
      const refDate=wkDates[0];const year=refDate.getFullYear(),month=refDate.getMonth();
      let count=0,targetDate=null;
      for(let day=1;day<=31;day++){const d=new Date(year,month,day);if(d.getMonth()!==month)break;if(d.getDay()===dow){count++;if(count===n){targetDate=d;break;}}}
      if(!targetDate)return false;
      if(!wkDates.some(d=>d2s(d)===d2s(targetDate)))return false;
      if(r.starting_date){const sd=new Date(r.starting_date+'T00:00:00');if(targetDate<sd)return false;}
      return true;
    }
  } else if(cadence==='biweekly'){
    if(!r.starting_date)return false;
    const dow=dayNameToIdx(r.appears_on_date);if(dow<0)return false;
    const sd=new Date(r.starting_date+'T00:00:00');
    const sdDow=(sd.getDay()+6)%7;
    const sdMon=new Date(sd);sdMon.setDate(sd.getDate()-sdDow);sdMon.setHours(0,0,0,0);
    const tgtMon=new Date(wkDates[0]);tgtMon.setHours(0,0,0,0);
    const weekDiff=Math.round((tgtMon-sdMon)/(7*86400000));
    return weekDiff>=0&&weekDiff%2===0;
  }
  // weekly — always due
  return true;
}

// ── Recurring Monthly View ────────────────────────────────────────────────────
function openRecMoModal(){
  renderRecMoCal();
  scrollRecMoToday();
  const bg=document.querySelector('.bg-canvas');if(bg)bg.classList.add('orbs-paused');
  requestAnimationFrame(()=>document.getElementById('recMoModal').classList.add('open'));
}
function scrollRecMoToday(){
  const mgrid=document.querySelector('#recMoModal .mgrid');
  const tc=document.querySelector('#recMoCells .mcell.tc');
  if(tc&&mgrid){const mdow=document.getElementById('recMoDow');const mdowH=mdow?mdow.offsetHeight:0;mgrid.scrollTop=tc.offsetTop-mgrid.offsetTop-mdowH-8;}
}
function renderRecMoCal(){
  const today=tod();
  const todayDate=new Date(today);
  const PAST=8,FUTURE=14,TOTAL=PAST+FUTURE;
  const startDow=(todayDate.getDay()+6)%7;
  const thisMonday=new Date(todayDate);thisMonday.setDate(todayDate.getDate()-startDow);
  const weekStart=new Date(thisMonday);weekStart.setDate(thisMonday.getDate()-PAST*7);
  const dayMap={};
  function addToDay(ds,item){if(!dayMap[ds])dayMap[ds]=[];dayMap[ds].push(item);}
  const wrWeekMap={};
  for(let w=0;w<TOTAL;w++){
    const wkOff=w-PAST;
    const{mon,sun}=getWkBounds(wkOff);
    const monDs=d2s(mon),sunDs=d2s(sun);
    wrWeekMap[w]=[];
    st.wrRules.filter(r=>r.is_enabled&&isWRRuleDueThisWeek(r,wkOff)).forEach(r=>{
      const editOv=st.wrOverrides.find(o=>o.override_type==='edit'&&String(o.rule_id)===String(r.id)&&o.wk_key===monDs);
      const displayName=(editOv&&editOv.custom_name)||r.name;
      const edited=!!(editOv&&(editOv.custom_name||editOv.custom_notes));
      wrWeekMap[w].push({name:displayName,isPup:r.pup_related===true||r.pup_related==='true',isWR:true,ruleId:String(r.id),wkKey:monDs,edited,cadence:r.cadence});
    });
    getRecurringWeekTasks(wkOff).forEach(t=>{
      const r=st.recurring.find(x=>String(x.id)===String(t._recId));
      const wkKey=dsToWkKey(t.due_date);
      const hasMoveOverride=r&&r._dateOverrides&&r._dateOverrides[wkKey]&&r._dateOverrides[wkKey]!=='__skip__';
      addToDay(t.due_date,{name:t.name,isPup:r&&(r.pup_related===true||r.pup_related==='true'),isWR:false,recId:String(t._recId),moved:!!hasMoveOverride,cadence:r&&r.cadence});
    });
  }
  const dowEl=document.getElementById('recMoDow');dowEl.innerHTML='';
  if(!dowEl.children.length){
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(dn=>{const el=document.createElement('div');el.className='mdowl';el.textContent=dn;dowEl.appendChild(el);});
    const wrHdr=document.createElement('div');wrHdr.className='mdowl';wrHdr.textContent='Weekly Reset';wrHdr.style.cssText='color:#3b82f6;border-left:1px solid rgba(59,130,246,.2);padding-left:4px';dowEl.appendChild(wrHdr);
  }
  const cells=document.getElementById('recMoCells');cells.innerHTML='';
  let curMo=-1;
  const DAYNAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function makeChip(item,ds){
    const isWR=item.isWR;
    const wkKey=isWR?(item.wkKey||dsToWkKey(ds)):dsToWkKey(ds);
    // Compute done state
    let isDone=false;
    if(isWR){isDone=st.wrOverrides.some(o=>String(o.rule_id)===String(item.ruleId)&&o.wk_key===wkKey&&o.override_type==='complete'&&o.done===true);}
    else{const r=st.recurring.find(x=>String(x.id)===item.recId);isDone=!!(r&&r._doneByWk&&r._doneByWk[wkKey]);}
    const s=gc(isWR?'weekly_reset':'Recurring');
    const chip=document.createElement('div');chip.className='mcell-t';
    const tid=isWR?'wrrule-'+item.ruleId:'rec-virt-'+item.recId;
    chip.dataset.tid=tid;
    chip.style.cssText=`background:${s.bg};color:${s.t};border-color:${s.b};cursor:grab${isDone?';opacity:.5':''}`;
    // Checkbox
    const chkWrap=document.createElement('label');chkWrap.className='chk-wrap';chkWrap.style.cssText='padding:2px 3px;margin:-2px -1px;flex-shrink:0';
    chkWrap.addEventListener('click',e=>e.stopPropagation());
    const chk=document.createElement('input');chk.type='checkbox';chk.className='chk';chk.style.cssText='width:8px;height:8px';chk.checked=isDone;
    chk.addEventListener('change',function(){if(isWR)togWrRule(item.ruleId,this.checked,wkKey);else togRec(item.recId,this.checked,wkKey);});
    chkWrap.appendChild(chk);chip.appendChild(chkWrap);
    // Name
    // Prefix badges
    const _recBadgeHtml=_hebBadge(item.name)+_pupBadge(item.name);
    if(_recBadgeHtml){const bw=document.createElement('span');bw.style.cssText='display:inline-flex;align-items:center;flex-shrink:0';bw.innerHTML=_recBadgeHtml;chip.appendChild(bw);const _hb=bw.querySelector('.heb-cnt');if(_hb)_hb.addEventListener('click',ev=>{ev.stopPropagation();openGroceryModal();});const _pb=bw.querySelector('.pup-link-badge');if(_pb)_pb.addEventListener('click',ev=>{ev.stopPropagation();if(typeof _openPupFocusModal==='function')_openPupFocusModal(null);});}
    const nm=document.createElement('span');nm.style.cssText=`flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap${isDone?';text-decoration:line-through':''}`;
    nm.textContent=item.name;chip.appendChild(nm);
    // Indicator dot: moved (regular) or edited (WR)
    if((isWR&&item.edited)||(!isWR&&item.moved)){
      const dot=document.createElement('span');
      dot.style.cssText=`width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-left:2px;background:${s.d};box-shadow:0 0 0 1px rgba(0,0,0,.15)`;
      dot.title=isWR?'Edited this week only':'Moved this week only';chip.appendChild(dot);
    }
    // Cadence badge slot (non-WR, non-weekly only) with hover-to-reveal X
    const _CAD_BADGE_MO={biweekly:'B',monthly:'M',quarterly:'Q',biannual:'BA',annual:'A',bimonthly:'B'};
    const _badgeLetter=item.cadence!=='weekly'&&_CAD_BADGE_MO[item.cadence];
    const dx=document.createElement('button');dx.className='chip-del';dx.textContent='✕';
    dx.addEventListener('click',e=>{
      e.stopPropagation();
      if(isWR){
        const wkKey=item.wkKey||dsToWkKey(ds);
        showWrScopePicker(e,'⊞  Remove from views','⊘  Skip this week',
          ()=>unscheduleWrRule(item.ruleId,wkKey),
          ()=>{unscheduleWrRule(item.ruleId,wkKey);writeWrOverride(item.ruleId,wkKey,{override_type:'skip'},{undoLabel:'Skipped WR task this week'});});
      } else {
        const r=st.recurring.find(x=>String(x.id)===item.recId);if(!r)return;
        const wkKey=dsToWkKey(ds);
        showWrScopePicker(e,'⊘  Skip this week only','✕  Delete recurring task',
          ()=>{if(!r._dateOverrides)r._dateOverrides={};const prev=r._dateOverrides[wkKey];r._dateOverrides[wkKey]='__skip__';save();renderAll();renderRecMoCal();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));pushUndo(()=>{if(prev!==undefined)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];save();renderAll();renderRecMoCal();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));},'Skipped recurring this week');},
          ()=>delRec(item.recId));
      }
    });
    if(_badgeLetter){
      const slot=document.createElement('span');
      slot.style.cssText='flex-shrink:0;display:inline-flex;align-items:center;margin-left:2px;position:relative';
      const bdg=document.createElement('span');
      bdg.style.cssText='font-size:9px;font-weight:700;letter-spacing:.3px;padding:1px 3px;border-radius:3px;background:rgba(0,0,0,.13);color:inherit';
      bdg.textContent=_badgeLetter;
      dx.style.display='none';
      slot.appendChild(bdg);slot.appendChild(dx);
      slot.addEventListener('mouseenter',()=>{bdg.style.display='none';dx.style.display='';});
      slot.addEventListener('mouseleave',()=>{bdg.style.display='';dx.style.display='none';});
      chip.appendChild(slot);
    } else {
      chip.appendChild(dx);
    }
    // Click to select
    chip.addEventListener('click',e=>{if(e.target.closest('.chip-del,.chk-wrap'))return;selTask(e,tid);});
    // Double-click to edit
    chip.addEventListener('dblclick',e=>{
      e.stopPropagation();
      if(isWR){const wkKey=item.wkKey||dsToWkKey(ds);openWrEditModal(item.ruleId,wkKey,'all');}
      else tiDblRec(e,item.recId,getWkKey(wkOff));
    });
    // Drag
    chip.draggable=true;
    if(isWR){
      const srcWkKey=item.wkKey||dsToWkKey(ds);
      chip.addEventListener('dragstart',e=>{e.stopPropagation();dragId='recmo-wr::'+item.ruleId+'::'+srcWkKey;chip.style.opacity='.4';document.body.classList.add('body-dragging');});
      chip.addEventListener('dragend',()=>{chip.style.opacity='1';document.body.classList.remove('body-dragging');dragId=null;});
    } else {
      chip.addEventListener('dragstart',e=>{e.stopPropagation();dragId='recmo::'+item.recId+'::'+ds;chip.style.opacity='.4';document.body.classList.add('body-dragging');});
      chip.addEventListener('dragend',()=>{chip.style.opacity='1';document.body.classList.remove('body-dragging');dragId=null;});
    }
    return chip;
  }
  for(let w=0;w<TOTAL;w++){
    const wkMon=new Date(weekStart);wkMon.setDate(weekStart.getDate()+w*7);
    const mo=wkMon.getMonth();
    if(mo!==curMo){
      curMo=mo;
      const sep=document.createElement('div');sep.className='mo-sep';
      sep.textContent=wkMon.toLocaleDateString('en-US',{month:'long',year:'numeric'});
      cells.appendChild(sep);
    }
    for(let d=0;d<7;d++){
      const date=new Date(wkMon);date.setDate(wkMon.getDate()+d);
      const ds=d2s(date);
      const cell=document.createElement('div');
      cell.className='mcell'+(ds===today?' tc':'');
      const _MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      cell.dataset.tip=`${_MO[date.getMonth()]} ${date.getDate()}`;
      const hdr=document.createElement('div');hdr.style.cssText='display:flex;align-items:center;margin-bottom:2px';
      const dn=document.createElement('div');dn.className='mcell-n';dn.textContent=date.getDate();
      hdr.appendChild(dn);cell.appendChild(hdr);
      const body=document.createElement('div');body.className='mcell-body';cell.appendChild(body);
      (dayMap[ds]||[]).forEach(item=>body.appendChild(makeChip(item,ds)));
      // Drop target for recurring task drag (same week only)
      cell.addEventListener('dragover',e=>{if(dragId&&dragId.startsWith('recmo::'))e.preventDefault();cell.classList.add('dov');});
      cell.addEventListener('dragleave',()=>cell.classList.remove('dov'));
      cell.addEventListener('drop',e=>{
        e.preventDefault();cell.classList.remove('dov');
        if(!dragId||!dragId.startsWith('recmo::'))return;
        const parts=dragId.split('::');const recId=parts[1];const srcDs=parts[2];dragId=null;
        if(ds===srcDs)return;
        if(dsToWkKey(ds)!==dsToWkKey(srcDs))return;
        const r=st.recurring.find(x=>String(x.id)===recId);if(!r)return;
        const wkKey=dsToWkKey(ds);
        showWrScopePicker(e,
          '⊘  This week only',
          '↻  All future',
          ()=>{// this week only — date override
            if(!r._dateOverrides)r._dateOverrides={};const prev=r._dateOverrides[wkKey];
            r._dateOverrides[wkKey]=ds;save();renderAll();renderRecMoCal();
            sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
            pushUndo(()=>{if(prev!==undefined)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];save();renderAll();renderRecMoCal();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));},'Moved recurring task this week');
          },
          ()=>{// all future — update appears_on_date
            const prev=r.appears_on_date;
            const newVal=(r.cadence==='monthly')?String(new Date(ds+'T00:00:00').getDate()):DAYNAMES[new Date(ds+'T00:00:00').getDay()];
            r.appears_on_date=newVal;save();renderAll();renderRecMoCal();
            sbReq('PATCH','wr_recurring_rules',{appears_on_date:newVal},recQs(r.id));
            pushUndo(()=>{r.appears_on_date=prev;save();renderAll();renderRecMoCal();sbReq('PATCH','wr_recurring_rules',{appears_on_date:prev},recQs(r.id));},'Moved recurring task all future');
          }
        );
      });
      cells.appendChild(cell);
    }
    // 8th column: WR tasks for this week (2-column layout for overflow)
    const wrCell=document.createElement('div');
    wrCell.className='mcell';
    wrCell.style.cssText=`background:${_dk()?'rgba(255,255,255,.03)':'rgba(239,246,255,.4)'};border:none`;
    const wrBody=document.createElement('div');wrBody.className='mcell-body';
    wrBody.style.cssText='columns:2;column-gap:2px';
    (wrWeekMap[w]||[]).forEach(item=>wrBody.appendChild(makeChip(item,d2s(wkMon))));
    wrCell.appendChild(wrBody);
    // Drop target for WR chip drag (different weeks)
    const destWkKey=d2s(wkMon);
    wrCell.addEventListener('dragover',e=>{if(dragId&&dragId.startsWith('recmo-wr::'))e.preventDefault();wrCell.classList.add('dov');});
    wrCell.addEventListener('dragleave',()=>wrCell.classList.remove('dov'));
    wrCell.addEventListener('drop',e=>{
      e.preventDefault();wrCell.classList.remove('dov');
      if(!dragId||!dragId.startsWith('recmo-wr::'))return;
      const parts=dragId.split('::');const ruleId=parts[1];const srcWkKey=parts[2];dragId=null;
      if(destWkKey===srcWkKey)return;
      const rule=st.wrRules.find(r=>String(r.id)===ruleId);if(!rule)return;
      const deltaMs=new Date(destWkKey+'T12:00')-new Date(srcWkKey+'T12:00');
      const deltaWeeks=Math.round(deltaMs/(7*24*60*60*1000));
      showWrScopePicker(e,
        '↻  All future',
        '⊞  This week only',
        ()=>{// Shift anchor — affects all future occurrences
          const prevAnchor=rule.starting_date;
          const base=rule.starting_date?new Date(rule.starting_date+'T12:00'):new Date(srcWkKey+'T12:00');
          base.setDate(base.getDate()+deltaWeeks*7);
          const newAnchor=d2s(base);
          rule.starting_date=newAnchor;
          sbReqSilent('PATCH','wr_recurring_rules',{starting_date:newAnchor},`?id=eq.${ruleId}`);
          save();renderRecOv();renderWeeklyPage();renderRecMoCal();
          pushUndo(()=>{rule.starting_date=prevAnchor;sbReqSilent('PATCH','wr_recurring_rules',{starting_date:prevAnchor},`?id=eq.${ruleId}`);save();renderRecOv();renderWeeklyPage();renderRecMoCal();},'Shifted WR rule start');
        },
        ()=>{// Move override for this week only
          writeWrOverride(ruleId,srcWkKey,{override_type:'move',moved_to_wk_key:destWkKey},{undoLabel:'Moved WR task this week'});
          renderRecMoCal();
        }
      );
    });
    cells.appendChild(wrCell);
  }
}

// ── Weekly Reset card — generated from wr_recurring_rules for selected week ────
function shiftWrRec(n){wrRecOff+=n;renderRecOv();}

function renderRecOv(){
  const wkKey=getWkKey(wrRecOff);
  // Week label for nav bar
  const{mon,sun}=getWkBounds(wrRecOff);
  const lbl=document.getElementById('wrRecWkLbl');
  if(lbl){
    const _lnk=`<a href="#weekly" onclick="event.preventDefault();showPage('weekly')" class="wo-hdr-btn" style="text-decoration:none;width:auto;padding:4px 10px;font-size:10px">`;
    if(wrRecOff===0){lbl.innerHTML=_lnk+'Weekly Reset</a>';}
    else{const fmt=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});lbl.innerHTML=_lnk+fmt(mon)+' – '+fmt(sun)+'</a>';}
  }
  // ── Merge overrides into base list ─────────────────────────────────────────
  // 1. Base: rules that naturally fire this week
  const baseItems=st.wrRules.filter(r=>isWRRuleDueThisWeek(r,wrRecOff));
  // 2. Classify overrides for this wk_key
  const ovThisWk=st.wrOverrides.filter(o=>o.wk_key===wkKey);
  const skipIds=new Set(ovThisWk.filter(o=>o.override_type==='skip').map(o=>String(o.rule_id)));
  const movedAwayIds=new Set(ovThisWk.filter(o=>o.override_type==='move').map(o=>String(o.rule_id)));
  // 3. Remove skipped + moved-away items
  const filtered=baseItems.filter(r=>!skipIds.has(String(r.id))&&!movedAwayIds.has(String(r.id)));
  // 4. Add rules moved INTO this week from another week (but not if skipped)
  const movedIn=st.wrOverrides
    .filter(o=>o.override_type==='move'&&o.moved_to_wk_key===wkKey)
    .map(o=>{const rule=st.wrRules.find(r=>String(r.id)===String(o.rule_id));return rule?{...rule,_movedIn:true}:null;})
    .filter(Boolean)
    .filter(r=>!filtered.some(x=>String(x.id)===String(r.id))&&!skipIds.has(String(r.id)));
  // 5. Apply edit overrides (custom name for this week only)
  const items=[...filtered,...movedIn].map(r=>{
    const editOv=ovThisWk.find(o=>o.override_type==='edit'&&String(o.rule_id)===String(r.id));
    const hasChange=editOv&&((editOv.custom_name&&editOv.custom_name!==r.name)||(editOv.custom_notes!==undefined&&editOv.custom_notes!==r.notes));
    return{...r,_displayName:(editOv&&editOv.custom_name)||r.name,_edited:!!hasChange,_movedIn:r._movedIn||false};
  });
  // ── End merge ────────────────────────────────────────────────────────────────

  // Done state: look for a 'complete' override for this rule + wkKey
  function isDoneWR(ruleId){
    return st.wrOverrides.some(o=>String(o.rule_id)===String(ruleId)&&o.wk_key===wkKey&&o.override_type==='complete'&&o.done===true);
  }
  const doneCount=items.filter(r=>isDoneWR(r.id)).length;
  const pct=items.length?Math.round(doneCount/items.length*100):0;
  const _rb=document.getElementById('recBadge');if(_rb)_rb.textContent=items.length-doneCount;
  const elReg=document.getElementById('recList');if(elReg)elReg.innerHTML='';
  function recOvOrder(r){
    const isPup=r.pup_related===true||r.pup_related==='true';
    const c=r.cadence||'weekly';
    const cadOrd=c==='weekly'?0:c==='biweekly'?2:c==='monthly'?4:c==='quarterly'?6:c==='biannual'?8:c==='annual'?10:12;
    return cadOrd+(isPup?1:0);
  }
  const sorted=[...items].sort((a,b)=>{
    const aDone=isDoneWR(a.id),bDone=isDoneWR(b.id);
    if(aDone&&!bDone)return 1;if(!aDone&&bDone)return -1;
    // Unassigned (no day pinned) items first
    const aAsgn=!aDone&&a._dateOverrides&&a._dateOverrides[wkKey]&&a._dateOverrides[wkKey]!=='__skip__';
    const bAsgn=!bDone&&b._dateOverrides&&b._dateOverrides[wkKey]&&b._dateOverrides[wkKey]!=='__skip__';
    if(!aAsgn&&bAsgn)return -1;if(aAsgn&&!bAsgn)return 1;
    return recOvOrder(a)-recOvOrder(b);
  });
  function makePawEl(ruleId,isDone){
    const col=isDone?'rgba(200,195,210,.35)':'rgba(255,255,255,.8)';
    const str=isDone?'rgba(200,195,210,.35)':'rgba(180,170,210,.5)';
    const wrap=document.createElement('label');
    wrap.className='chk-wrap';
    wrap.style.cssText='cursor:pointer;flex-shrink:0';
    wrap.title='Toggle';
    wrap.innerHTML=`<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg" style="display:block;margin-left:-2px" fill="none" stroke="${str}" stroke-width="1.8"><rect x="8" y="10" width="8" height="4" rx="1.5" fill="${col}"/><circle cx="6.5" cy="8.5" r="2.8" fill="${col}"/><circle cx="6.5" cy="15.5" r="2.8" fill="${col}"/><circle cx="17.5" cy="8.5" r="2.8" fill="${col}"/><circle cx="17.5" cy="15.5" r="2.8" fill="${col}"/></svg>`;
    wrap.addEventListener('click',e=>{e.stopPropagation();togWrRule(ruleId,!isDone,wkKey);});
    wrap.addEventListener('mousedown',e=>e.stopPropagation());
    return wrap;
  }
  sorted.forEach(r=>{
    const rid=String(r.id);
    const isDone=isDoneWR(r.id);
    const isPup=r.pup_related===true||r.pup_related==='true';
    const selId='wrrule-'+rid;
    const row=document.createElement('div');
    row.id='ti-'+selId;
    row.className='ti'+(isDone?' done':'');
    row.style.cssText='cursor:pointer;break-inside:avoid;margin:0 6px;padding:3px 22px 3px 10px';
    row.draggable=true;
    row.addEventListener('dragstart',e=>{e.stopPropagation();dragId='wrrule::'+rid;e.dataTransfer.effectAllowed='move';row.style.opacity='.4';document.body.classList.add('body-dragging');showWkcEdges(true);});
    row.addEventListener('dragend',()=>{row.style.opacity='1';document.body.classList.remove('body-dragging');showWkcEdges(false);dragId=null;});
    row.addEventListener('click',e=>selTask(e,selId));
    row.addEventListener('dblclick',e=>{
      if(e.target.closest('button,label'))return;
      e.stopPropagation();clearSelection();
      openWrEditModal(rid,wkKey,'this');
    });
    row.addEventListener('contextmenu',e=>showWrRuleCtx(e,rid,wkKey));
    if(isPup){
      row.appendChild(makePawEl(rid,isDone));
    } else {
      const chkWrap=document.createElement('label');chkWrap.className='chk-wrap';chkWrap.addEventListener('click',e=>e.stopPropagation());
      const chk=document.createElement('input');chk.type='checkbox';chk.className='chk';chk.checked=isDone;
      chk.addEventListener('change',function(){togWrRule(rid,this.checked,wkKey);});
      chkWrap.appendChild(chk);row.appendChild(chkWrap);
    }
    const nm=document.createElement('span');nm.className='tn';
    if(isDone)nm.style.cssText='text-decoration:line-through;color:var(--muted)';
    nm.textContent=r._displayName;
    row.appendChild(nm);
    const hasDot=r._edited;
    const del=document.createElement('button');
    del.className='delbtn';del.textContent='✕';del.title='Remove…';
    del.addEventListener('mousedown',e=>e.stopPropagation());
    del.addEventListener('click',e=>{
      e.stopPropagation();
      showWrScopePicker(e,
        '⊘  Skip this week only',
        '✕  Delete rule (all future)',
        ()=>writeWrOverride(rid,wkKey,{override_type:'skip'},{undoLabel:'Skipped WR task this week'}),
        ()=>wrCtxDeleteRule(rid)
      );
    });
    const _WR_CAD_BADGE={biweekly:'B',monthly:'M',quarterly:'Q',biannual:'BA',annual:'A',bimonthly:'B'};
    const wrBadgeLetter=(r.cadence&&r.cadence!=='weekly')&&_WR_CAD_BADGE[r.cadence];
    // Unassigned indicator: WR rule not yet assigned to a day this week
    const _wrAssigned=!isDone&&r._dateOverrides&&r._dateOverrides[wkKey]&&r._dateOverrides[wkKey]!=='__skip__';
    if(!isDone&&!_wrAssigned){
      const uaDot=document.createElement('span');
      uaDot.className='wr-unassigned';
      uaDot.textContent='›';
      row.appendChild(uaDot);
    }
    if(wrBadgeLetter){
      row.classList.add('wr-has-cad');
      const bdg=document.createElement('span');
      bdg.className='wr-cad-badge'+(hasDot?' changed':'');
      bdg.title=hasDot?'Edited this week':'';
      bdg.textContent=wrBadgeLetter;
      row.appendChild(bdg);
    } else if(hasDot){
      const dot=document.createElement('span');
      dot.className='wr-dot';
      dot.title=r._movedIn?'Moved this week':'Edited this week';
      row.appendChild(dot);
    }
    row.appendChild(del);
    if(elReg)elReg.appendChild(row);
  });
  // Update skipped-this-week button
  const _skippedWrecCount=st.recurring.filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&r._dateOverrides&&r._dateOverrides[wkKey]==='__skip__').length;
  const _skCount=skipIds.size+_skippedWrecCount;
  const _skBtn=document.getElementById('wrSkippedBtn');
  if(_skBtn){_skBtn.style.display=_skCount?'':'none';_skBtn.textContent='↩ '+_skCount;}
  requestAnimationFrame(()=>{
    applySelHighlight();
    if(elReg){
      elReg.style.maxHeight='';
      const card=elReg.closest('.card');
      if(card){
        let taken=0;
        Array.from(card.children).forEach(c=>{if(c!==elReg&&c.id!=='recListPup'&&getComputedStyle(c).position!=='absolute')taken+=c.offsetHeight;});
        const avail=card.clientHeight-taken-1;
        if(avail>40)elReg.style.maxHeight=avail+'px';
      }
    }
  });
  if(document.getElementById('recMoModal')?.classList.contains('open'))renderRecMoCal();
  _attachListRubberBand(document.getElementById('recList'));
  requestAnimationFrame(()=>_updateOverflowBadge(document.getElementById('recList')));
}

// Upsert a wr_recurring_override — patches if one exists for (ruleId,wkKey), posts if not.
// payload should include override_type + any relevant fields. Nulls out unrelated fields.
function writeWrOverride(ruleId,wkKey,payload,{onDone,undoLabel='Changed WR task'}={}){
  const full={rule_id:ruleId,wk_key:wkKey,done:null,moved_to_wk_key:null,custom_name:null,custom_notes:null,...payload};
  const isSkip=payload.override_type==='skip';
  // Capture and remove timeblocks for this rule in the target week (skip only)
  const _skipRule=isSkip?st.wrRules.find(x=>String(x.id)===String(ruleId)):null;
  const _pinnedDs=_skipRule?._dateOverrides?.[wkKey];
  const linkedBlocks=isSkip&&st.blocks?st.blocks.filter(b=>dsToWkKey(b.ds)===wkKey&&(String(b.ruleId)===String(ruleId)||String(b.recId)===String(ruleId)||(!b.ruleId&&!b.recId&&_pinnedDs&&b.ds===_pinnedDs&&!b.taskId&&!b.shopId))):[];
  if(isSkip&&linkedBlocks.length){st.blocks=st.blocks.filter(b=>!linkedBlocks.some(lb=>lb.id===b.id));linkedBlocks.forEach(b=>sbDeleteBlock(b.id));}
  const _syncBlockDone=(isDone)=>{if(st.blocks)st.blocks.filter(b=>dsToWkKey(b.ds)===wkKey&&(String(b.ruleId)===String(ruleId)||String(b.recId)===String(ruleId))).forEach(b=>{b._done=isDone;});};
  const _rerender=()=>{renderRecOv();renderWkCal();renderWeeklyPage();renderToday();if(document.getElementById('tbGrid'))renderDayTB();};
  const existing=st.wrOverrides.find(o=>String(o.rule_id)===String(ruleId)&&o.wk_key===wkKey);
  if(existing){
    const prev={...existing};
    Object.assign(existing,full);
    sbReqSilent('PATCH','wr_recurring_overrides',full,`?id=eq.${existing.id}`);
    pushUndo(()=>{Object.assign(existing,prev);if(isSkip){linkedBlocks.forEach(b=>{if(st.blocks)st.blocks.push(b);sbSaveBlock(b);});}sbReqSilent('PATCH','wr_recurring_overrides',prev,`?id=eq.${existing.id}`);_syncBlockDone(prev.override_type==='complete'&&prev.done===true);_rerender();},undoLabel);
    if(payload.override_type==='complete')_syncBlockDone(payload.done===true);
    save();_rerender();if(onDone)onDone(existing);
  } else {
    const tmpId='wrov-tmp-'+Date.now();
    st.wrOverrides.push({...full,id:tmpId});
    let realId=null;
    sbReqSilent('POST','wr_recurring_overrides',full,'').then(res=>{
      if(res&&res[0]){realId=String(res[0].id);const idx=st.wrOverrides.findIndex(o=>String(o.id)===tmpId);if(idx>-1){st.wrOverrides[idx]=res[0];}save();if(onDone)onDone(res[0]);}
    });
    pushUndo(()=>{
      const id=realId||tmpId;
      st.wrOverrides=st.wrOverrides.filter(o=>String(o.id)!==id);
      if(isSkip){linkedBlocks.forEach(b=>{if(st.blocks)st.blocks.push(b);sbSaveBlock(b);});}
      if(realId)sbReqSilent('DELETE','wr_recurring_overrides',null,`?id=eq.${realId}`);
      _syncBlockDone(false);_rerender();
    },undoLabel);
    if(payload.override_type==='complete')_syncBlockDone(payload.done===true);
    save();_rerender();
  }
}

// Toggle done for a wr_recurring_rule via the overrides table
function togWrRule(ruleId,isDone,wkKey){
  if(isDone){
    writeWrOverride(ruleId,wkKey,{override_type:'complete',done:true},{undoLabel:'Toggled WR task'});
  } else {
    // Un-checking: remove the complete override entirely
    const existing=st.wrOverrides.find(o=>String(o.rule_id)===String(ruleId)&&o.wk_key===wkKey&&o.override_type==='complete');
    if(!existing)return;
    const prev={...existing};
    st.wrOverrides=st.wrOverrides.filter(o=>o!==existing);
    if(st.blocks)st.blocks.filter(b=>dsToWkKey(b.ds)===wkKey&&(String(b.ruleId)===String(ruleId)||String(b.recId)===String(ruleId))).forEach(b=>{b._done=false;});
    sbReqSilent('DELETE','wr_recurring_overrides',null,`?id=eq.${existing.id}`);
    pushUndo(()=>{st.wrOverrides.push(prev);if(st.blocks)st.blocks.filter(b=>dsToWkKey(b.ds)===wkKey&&(String(b.ruleId)===String(ruleId)||String(b.recId)===String(ruleId))).forEach(b=>{b._done=true;});sbReqSilent('POST','wr_recurring_overrides',prev,'');renderRecOv();renderWkCal();renderWeeklyPage();renderToday();if(document.getElementById('tbGrid'))renderDayTB();},'Toggled WR task');
    save();renderRecOv();renderWkCal();renderWeeklyPage();renderToday();if(document.getElementById('tbGrid'))renderDayTB();
  }
}

// ── WR Rule Context Menu ─────────────────────────────────────────────────────
let _wrCtxRuleId=null,_wrCtxWkKey=null,_wrCtxRecId=null;

function showWrRuleCtx(e,id,wkKey){
  e.preventDefault();e.stopPropagation();
  const isRule=st.wrRules.some(r=>String(r.id)===String(id));
  if(isRule){_wrCtxRuleId=String(id);_wrCtxRecId=null;}else{_wrCtxRecId=String(id);_wrCtxRuleId=null;}
  _wrCtxWkKey=wkKey;
  // Determine cadence
  const rule=isRule?st.wrRules.find(r=>String(r.id)===String(id)):st.recurring.find(r=>String(r.id)===String(id));
  const cad=rule?.cadence||'weekly';
  const isInterval=cad!=='weekly'&&cad!=='other';
  const m=document.getElementById('wrRuleCtxMenu');
  const _ico=(path,sz=12)=>`<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const _icoNext=_ico('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>');
  const _icoPrev=_ico('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>');
  const _icoEdit=_ico('<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>');
  const _icoSkip=_ico('<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>');
  const _icoX=_ico('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',10);
  let h=`<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px 2px">`;
  h+=`<span style="font-size:10px;font-weight:600;color:var(--muted)">${rule?.name||'Task'}</span>`;
  h+=`<button onclick="wrCtxDeleteRule()" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:2px;border-radius:4px;display:flex;align-items:center" title="Delete rule permanently">${_icoX}</button>`;
  h+=`</div>`;
  if(isInterval){
    h+=`<div class="ctx-item" onclick="wrCtxSkipThisWeek()">${_icoSkip} Skip this cycle</div>`;
    h+=`<div class="ctx-cols">`;
    h+=`<div class="ctx-col ctx-col-box">`;
    h+=`<div class="ctx-col-hdr">This time only</div>`;
    h+=`<div class="ctx-item" onclick="wrCtxMoveNextWeek()">${_icoNext} Next</div>`;
    h+=`<div class="ctx-item" onclick="wrCtxMovePrevWeek()">${_icoPrev} Prev</div>`;
    h+=`<div class="ctx-item" onclick="wrCtxEditThisWeek()">${_icoEdit} Edit</div>`;
    h+=`</div>`;
    h+=`<div class="ctx-col ctx-col-box">`;
    h+=`<div class="ctx-col-hdr">All future</div>`;
    h+=`<div class="ctx-item" onclick="wrCtxShiftSchedule(7)">${_icoNext} Next</div>`;
    h+=`<div class="ctx-item" onclick="wrCtxShiftSchedule(-7)">${_icoPrev} Prev</div>`;
    h+=`<div class="ctx-item" onclick="wrCtxEditRule()">${_icoEdit} Edit</div>`;
    h+=`</div>`;
    h+=`</div>`;
  }else{
    h+=`<div class="ctx-item" onclick="wrCtxSkipThisWeek()">${_icoSkip} Skip this week</div>`;
    h+=`<div class="ctx-divider"></div>`;
    h+=`<div class="ctx-item" onclick="wrCtxEditThisWeek()">${_icoEdit} Edit this week only</div>`;
    h+=`<div class="ctx-item" onclick="wrCtxEditRule()">${_icoEdit} Edit rule (all future)</div>`;
  }
  m.innerHTML=h;
  const x=Math.min(e.clientX,window.innerWidth-220),y=Math.min(e.clientY,window.innerHeight-260);
  m.style.left=x+'px';m.style.top=y+'px';m.style.display='block';
}
function hideWrRuleCtx(){const m=document.getElementById('wrRuleCtxMenu');if(m)m.style.display='none';}
document.addEventListener('mousedown',e=>{if(!e.target.closest('#wrRuleCtxMenu'))hideWrRuleCtx();},{capture:true,passive:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideWrRuleCtx();hideWrScopePicker();}});

// ── Scope picker (Apple Calendar style: this week only / all future) ───────────
let _wrScopeCbThis=null,_wrScopeCbAll=null,_wrScopeCbRemove=null;
function showWrScopePicker(e,thisLabel,allLabel,onThis,onAll,removeLabel,onRemove){
  e.preventDefault();e.stopPropagation();
  _wrScopeCbThis=onThis;_wrScopeCbAll=onAll;_wrScopeCbRemove=onRemove||null;
  document.getElementById('wrScopeThis').textContent=thisLabel;
  document.getElementById('wrScopeAll').textContent=allLabel;
  const removeEl=document.getElementById('wrScopeRemove');
  if(removeEl){removeEl.textContent=removeLabel||'';removeEl.style.display=onRemove?'':'none';}
  const m=document.getElementById('wrScopePicker');
  const x=Math.min(e.clientX,window.innerWidth-180),y=Math.min(e.clientY,window.innerHeight-120);
  m.style.left=x+'px';m.style.top=y+'px';m.style.display='block';
}
function hideWrScopePicker(){const m=document.getElementById('wrScopePicker');if(m)m.style.display='none';}
function wrScopeDoRemove(){hideWrScopePicker();if(_wrScopeCbRemove)_wrScopeCbRemove();}
function wrScopeDoThis(){hideWrScopePicker();if(_wrScopeCbThis)_wrScopeCbThis();}
function wrScopeDoAll(){hideWrScopePicker();if(_wrScopeCbAll)_wrScopeCbAll();}
document.addEventListener('mousedown',e=>{if(!e.target.closest('#wrScopePicker'))hideWrScopePicker();},{capture:true,passive:true});

/// ── Skipped-this-week popup ───────────────────────────────────────────────────
function openWrSkipped(e){
  e.stopPropagation();
  const wkKey=getWkKey(wrRecOff);
  const skippedRules=st.wrRules.filter(r=>(st.wrOverrides||[]).some(o=>String(o.rule_id)===String(r.id)&&o.wk_key===wkKey&&o.override_type==='skip'));
  const skippedWrec=st.recurring.filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&r._dateOverrides&&r._dateOverrides[wkKey]==='__skip__');
  const picker=document.getElementById('wrSkippedPicker');if(!picker)return;
  picker.innerHTML='';
  if(!skippedRules.length&&!skippedWrec.length){picker.style.display='none';return;}
  const hdr=document.createElement('div');
  hdr.style.cssText='padding:4px 10px 4px;font-size:10px;color:var(--muted);font-weight:600;letter-spacing:.05em;border-bottom:1px solid rgba(210,205,228,.25);margin-bottom:2px';
  hdr.textContent='SKIPPED THIS WEEK';picker.appendChild(hdr);
  skippedRules.forEach(r=>{
    const itm=document.createElement('div');itm.className='ctx-item';itm.textContent='↩  '+r.name;
    itm.addEventListener('click',()=>{hideWrSkipped();unSkipWrRule(r.id,wkKey);});picker.appendChild(itm);
  });
  skippedWrec.forEach(r=>{
    const itm=document.createElement('div');itm.className='ctx-item';itm.textContent='↩  '+r.name;
    itm.addEventListener('click',()=>{hideWrSkipped();unSkipWRec(r.id,wkKey);});picker.appendChild(itm);
  });
  const rect=e.currentTarget.getBoundingClientRect();
  picker.style.left=Math.min(rect.left,window.innerWidth-200)+'px';
  picker.style.top='-9999px';picker.style.display='block';
  requestAnimationFrame(()=>{picker.style.top=Math.max(rect.top-picker.offsetHeight-6,8)+'px';});
}
function hideWrSkipped(){const m=document.getElementById('wrSkippedPicker');if(m)m.style.display='none';}
document.addEventListener('mousedown',e=>{if(!e.target.closest('#wrSkippedPicker,#wrSkippedBtn'))hideWrSkipped();},{capture:true,passive:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideWrSkipped();});

function unSkipWrRule(ruleId,wkKey){
  const existing=st.wrOverrides.find(o=>String(o.rule_id)===String(ruleId)&&o.wk_key===wkKey&&o.override_type==='skip');
  if(!existing)return;
  const prev={...existing};
  // Also clear any date override so the rule returns to WR container only, not other views
  const r=st.wrRules.find(x=>String(x.id)===String(ruleId));
  const prevDateOv=r&&r._dateOverrides?{...r._dateOverrides}:null;
  if(r&&r._dateOverrides&&r._dateOverrides[wkKey]){delete r._dateOverrides[wkKey];sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${ruleId}`);}
  st.wrOverrides=st.wrOverrides.filter(o=>!(String(o.rule_id)===String(ruleId)&&o.wk_key===wkKey&&o.override_type==='skip'));
  sbReqSilent('DELETE','wr_recurring_overrides',null,`?id=eq.${existing.id}`);
  pushUndo(()=>{
    st.wrOverrides.push(prev);
    sbReqSilent('POST','wr_recurring_overrides',prev,'');
    if(r&&prevDateOv){r._dateOverrides=prevDateOv;sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${ruleId}`);}
    renderRecOv();renderWkCal();renderWeeklyPage();renderToday();if(document.getElementById('tbGrid'))renderDayTB();
  },'Restored WR task');
  renderRecOv();renderWkCal();renderWeeklyPage();renderToday();if(document.getElementById('tbGrid'))renderDayTB();
}
function unSkipWRec(rid,wkKey){
  const r=st.recurring.find(x=>String(x.id)===String(rid));if(!r||!r._dateOverrides)return;
  const prev=r._dateOverrides[wkKey];
  delete r._dateOverrides[wkKey];
  save();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));
  pushUndo(()=>{if(!r._dateOverrides)r._dateOverrides={};r._dateOverrides[wkKey]=prev;save();renderRecOv();renderWkCal();renderWeeklyPage();renderToday();},'Restored WR task');
  renderRecOv();renderWkCal();renderWeeklyPage();renderToday();
}

// Helper: check if a wr_recurring_rules item is done for a given wkKey
function isDoneWRRule(ruleId,wkKey){
  return st.wrOverrides.some(o=>String(o.rule_id)===String(ruleId)&&o.wk_key===wkKey&&o.override_type==='complete'&&o.done===true);
}
// Remove a wr_recurring_rules item from a view by clearing its _dateOverrides
function unscheduleWrRule(rid,wkKey){
  const r=st.wrRules.find(x=>String(x.id)===String(rid));if(!r||!r._dateOverrides)return;
  const prev=r._dateOverrides[wkKey];
  const _unschDs=prev&&prev!=='__skip__'?prev:null;
  delete r._dateOverrides[wkKey];
  const linkedBlocks=st.blocks?st.blocks.filter(b=>String(b.ruleId)===String(rid)||String(b.recId)===String(rid)||(!b.ruleId&&!b.recId&&_unschDs&&b.ds===_unschDs&&!b.taskId&&!b.shopId)):[];
  if(st.blocks)st.blocks=st.blocks.filter(b=>!linkedBlocks.some(lb=>lb.id===b.id));
  save();renderAll();
  linkedBlocks.forEach(b=>sbDeleteBlock(b.id));
  sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));
  pushUndo(()=>{if(!r._dateOverrides)r._dateOverrides={};r._dateOverrides[wkKey]=prev;linkedBlocks.forEach(b=>{if(st.blocks)st.blocks.push(b);sbSaveBlock(b);});save();renderAll();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));},'Removed WR task from calendar');
}
// X button on WR chips/rows outside the WR overlay: skip this week (+ clear date override) or delete rule
// Works for both old WR tasks (st.recurring) and new WR rules (st.wrRules)
function showWrXPicker(e,rid,wkKey){
  const isRule=st.wrRules.some(r=>String(r.id)===String(rid));
  showWrScopePicker(e,'⊞  Remove from views','⊘  Skip this week',
    ()=>{
      if(isRule){unscheduleWrRule(rid,wkKey);}
      else{unscheduleWRec(rid,wkKey);}
    },
    ()=>{
      if(isRule){unscheduleWrRule(rid,wkKey);writeWrOverride(rid,wkKey,{override_type:'skip'},{undoLabel:'Skipped WR task this week'});}
      else{unscheduleWRec(rid,wkKey);}
    }
  );
}

function wrCtxSkipThisWeek(){
  hideWrRuleCtx();if(!_wrCtxWkKey)return;
  if(_wrCtxRecId){
    const r=st.recurring.find(x=>String(x.id)===_wrCtxRecId);if(!r)return;
    if(r.is_weekly_reset===true||r.is_weekly_reset==='true')skipWRec(_wrCtxRecId,_wrCtxWkKey);
    else skipRecVirtThisWk(_wrCtxRecId,_wrCtxWkKey);
    return;
  }
  if(!_wrCtxRuleId)return;
  writeWrOverride(_wrCtxRuleId,_wrCtxWkKey,{override_type:'skip'},{undoLabel:'Skipped WR task this week'});
}
function _wkKeyToOff(wkKey){
  const mon=new Date(wkKey+'T12:00'),now=new Date(),dow=(now.getDay()+6)%7;
  const curMon=new Date(now);curMon.setDate(now.getDate()-dow);curMon.setHours(0,0,0,0);
  return Math.round((mon-curMon)/(7*864e5));
}
function _wrShiftAnchor(delta){
  hideWrRuleCtx();
  if(_wrCtxRecId){
    const r=st.recurring.find(x=>String(x.id)===_wrCtxRecId);if(!r||!_wrCtxWkKey)return;
    if(!r._dateOverrides)r._dateOverrides={};
    const srcMon=new Date(_wrCtxWkKey+'T12:00');
    srcMon.setDate(srcMon.getDate()+(delta>0?7:-7));
    const targetWkKey=d2s(srcMon);
    // Conflict guard: check if already in target week (naturally or moved-in)
    const tgtOv=r._dateOverrides[targetWkKey];
    if(tgtOv&&tgtOv!=='__skip__'){showToast('Already scheduled that week','#6b7280',2000);return;}
    const tgtOff=_wkKeyToOff(targetWkKey);
    const natDue=getRecurringWeekTasks(tgtOff).some(t=>String(t._recId)===_wrCtxRecId);
    if(natDue){showToast('Already scheduled that week','#6b7280',2000);return;}
    const prevCurrent=r._dateOverrides[_wrCtxWkKey];
    const prevTarget=r._dateOverrides[targetWkKey];
    const _natDow=dayNameToIdx(r.appears_on_date);
    const _natDate=_natDow>=0?getDateForDow(_natDow,wkOff):null;
    const base=prevCurrent&&prevCurrent!=='__skip__'?new Date(prevCurrent+'T12:00'):_natDate?new Date(d2s(_natDate)+'T12:00'):new Date();
    base.setDate(base.getDate()+delta);
    const next=d2s(base);
    r._dateOverrides[_wrCtxWkKey]='__skip__';
    r._dateOverrides[targetWkKey]=next;
    save();renderAll();renderWkCal();renderToday();
    sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(_wrCtxRecId));
    pushUndo(()=>{
      if(prevCurrent!==undefined)r._dateOverrides[_wrCtxWkKey]=prevCurrent;else delete r._dateOverrides[_wrCtxWkKey];
      if(prevTarget!==undefined)r._dateOverrides[targetWkKey]=prevTarget;else delete r._dateOverrides[targetWkKey];
      save();renderAll();renderWkCal();renderToday();
      sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(_wrCtxRecId));
    },'Moved recurring task');
    return;
  }
  if(!_wrCtxRuleId)return;
  const rule=st.wrRules.find(r=>String(r.id)===_wrCtxRuleId);if(!rule)return;
  if(!rule._dateOverrides)rule._dateOverrides={};
  const srcWkKey=_wrCtxWkKey||getWkKey(wkOff);
  const srcMon=new Date(srcWkKey+'T12:00');
  srcMon.setDate(srcMon.getDate()+(delta>0?7:-7));
  const targetWkKey=d2s(srcMon);
  // Conflict guard: check if naturally due in target week or has non-skip override
  const tgtOff=_wkKeyToOff(targetWkKey);
  const naturallyDue=isWRRuleDueThisWeek(rule,tgtOff);
  const tgtOv=rule._dateOverrides[targetWkKey];
  const movedInOv=st.wrOverrides.some(o=>o.override_type==='move'&&o.moved_to_wk_key===targetWkKey&&String(o.rule_id)===String(_wrCtxRuleId));
  if((naturallyDue||movedInOv)&&(!tgtOv||tgtOv==='__skip__')){/* naturally due and not skipped — conflict */showToast('Already scheduled that week','#6b7280',2000);return;}
  if(tgtOv&&tgtOv!=='__skip__'){showToast('Already scheduled that week','#6b7280',2000);return;}
  const prevSrc=rule._dateOverrides[srcWkKey];
  const prevTgt=rule._dateOverrides[targetWkKey];
  // Compute the target date: shift current pinned date (or natural day) by ±7
  const curDs=prevSrc&&prevSrc!=='__skip__'?prevSrc:null;
  const base=curDs?new Date(curDs+'T12:00'):new Date();
  base.setDate(base.getDate()+delta);
  const nextDs=d2s(base);
  // 1. Update _dateOverrides: remove from current week, pin to target week
  delete rule._dateOverrides[srcWkKey];
  rule._dateOverrides[targetWkKey]=nextDs;
  sbReq('PATCH','wr_recurring_rules',{date_overrides:rule._dateOverrides},`?id=eq.${_wrCtxRuleId}`);
  // 2. Create move override in wrOverrides so renderRecOv hides it from current week
  const _moveFull={rule_id:_wrCtxRuleId,wk_key:srcWkKey,override_type:'move',moved_to_wk_key:targetWkKey,done:null,custom_name:null,custom_notes:null};
  const _existingOv=st.wrOverrides.find(o=>String(o.rule_id)===String(_wrCtxRuleId)&&o.wk_key===srcWkKey);
  const _prevOv=_existingOv?{..._existingOv}:null;
  let _ovRealId=null;
  if(_existingOv){
    Object.assign(_existingOv,_moveFull);
    sbReqSilent('PATCH','wr_recurring_overrides',_moveFull,`?id=eq.${_existingOv.id}`);
  }else{
    const _tmpId='wrov-tmp-'+Date.now();
    st.wrOverrides.push({..._moveFull,id:_tmpId});
    sbReqSilent('POST','wr_recurring_overrides',_moveFull,'').then(res=>{if(res&&res[0]){_ovRealId=String(res[0].id);const idx=st.wrOverrides.findIndex(o=>String(o.id)===_tmpId);if(idx>-1)st.wrOverrides[idx]=res[0];}});
  }
  const _rerender=()=>{renderRecOv();renderWkCal();renderWeeklyPage();renderToday();if(document.getElementById('tbGrid'))renderDayTB();};
  save();_rerender();
  pushUndo(()=>{
    // Restore _dateOverrides
    if(prevSrc!==undefined)rule._dateOverrides[srcWkKey]=prevSrc;else delete rule._dateOverrides[srcWkKey];
    if(prevTgt!==undefined)rule._dateOverrides[targetWkKey]=prevTgt;else delete rule._dateOverrides[targetWkKey];
    sbReq('PATCH','wr_recurring_rules',{date_overrides:rule._dateOverrides},`?id=eq.${_wrCtxRuleId}`);
    // Restore wrOverride
    if(_prevOv){const ov=st.wrOverrides.find(o=>String(o.rule_id)===String(_wrCtxRuleId)&&o.wk_key===srcWkKey);if(ov)Object.assign(ov,_prevOv);sbReqSilent('PATCH','wr_recurring_overrides',_prevOv,`?id=eq.${ov?ov.id:_prevOv.id}`);}
    else{const id=_ovRealId||st.wrOverrides.find(o=>String(o.rule_id)===String(_wrCtxRuleId)&&o.wk_key===srcWkKey)?.id;st.wrOverrides=st.wrOverrides.filter(o=>String(o.rule_id)!==String(_wrCtxRuleId)||o.wk_key!==srcWkKey);if(id)sbReqSilent('DELETE','wr_recurring_overrides',null,`?id=eq.${id}`);}
    save();_rerender();
  },'Moved WR task to '+(delta>0?'next':'prev')+' week');
}
function wrCtxMovePrevWeek(){_wrShiftAnchor(-7);}
function wrCtxMoveNextWeek(){_wrShiftAnchor(7);}
function wrCtxShiftSchedule(delta){
  hideWrRuleCtx();
  const rid=_wrCtxRecId||_wrCtxRuleId;if(!rid)return;
  const isRec=!!_wrCtxRecId;
  const rule=isRec?st.recurring.find(r=>String(r.id)===rid):st.wrRules.find(r=>String(r.id)===rid);
  if(!rule||!rule.starting_date)return;
  const wkKey=_wrCtxWkKey;
  // Shift starting_date
  const prevStart=rule.starting_date;
  const newStart=new Date(prevStart+'T12:00');newStart.setDate(newStart.getDate()+delta);
  rule.starting_date=d2s(newStart);
  // Also move current week instance to adjacent week
  if(!rule._dateOverrides)rule._dateOverrides={};
  const srcMon=new Date(wkKey+'T12:00');
  srcMon.setDate(srcMon.getDate()+(delta>0?7:-7));
  const targetWkKey=d2s(srcMon);
  const prevSrcOv=rule._dateOverrides[wkKey];
  const prevTgtOv=rule._dateOverrides[targetWkKey];
  // Compute target date
  const curDs=prevSrcOv&&prevSrcOv!=='__skip__'?prevSrcOv:null;
  const base=curDs?new Date(curDs+'T12:00'):new Date();
  base.setDate(base.getDate()+delta);
  const nextDs=d2s(base);
  rule._dateOverrides[wkKey]='__skip__';
  rule._dateOverrides[targetWkKey]=nextDs;
  // Persist
  const patchData={starting_date:rule.starting_date,date_overrides:rule._dateOverrides};
  if(isRec){
    sbReq('PATCH','wr_recurring_rules',patchData,recQs(rid));
  }else{
    sbReq('PATCH','wr_recurring_rules',patchData,`?id=eq.${rid}`);
    // Write move override for WR rules
    const _moveFull={rule_id:rid,wk_key:wkKey,override_type:'move',moved_to_wk_key:targetWkKey,done:null,custom_name:null,custom_notes:null};
    const _existingOv=st.wrOverrides.find(o=>String(o.rule_id)===String(rid)&&o.wk_key===wkKey);
    const _prevOv=_existingOv?{..._existingOv}:null;
    let _ovRealId=null;
    if(_existingOv){Object.assign(_existingOv,_moveFull);sbReqSilent('PATCH','wr_recurring_overrides',_moveFull,`?id=eq.${_existingOv.id}`);}
    else{const _tmpId='wrov-tmp-'+Date.now();st.wrOverrides.push({..._moveFull,id:_tmpId});sbReqSilent('POST','wr_recurring_overrides',_moveFull,'').then(res=>{if(res&&res[0]){_ovRealId=String(res[0].id);const idx=st.wrOverrides.findIndex(o=>String(o.id)===_tmpId);if(idx>-1)st.wrOverrides[idx]=res[0];}});}
  }
  const _rerender=()=>{renderRecOv();renderWkCal();renderWeeklyPage();renderToday();if(document.getElementById('tbGrid'))renderDayTB();};
  save();_rerender();
  const dir=delta>0?'later':'earlier';
  pushUndo(()=>{
    rule.starting_date=prevStart;
    if(prevSrcOv!==undefined)rule._dateOverrides[wkKey]=prevSrcOv;else delete rule._dateOverrides[wkKey];
    if(prevTgtOv!==undefined)rule._dateOverrides[targetWkKey]=prevTgtOv;else delete rule._dateOverrides[targetWkKey];
    sbReq('PATCH','wr_recurring_rules',{starting_date:prevStart,date_overrides:rule._dateOverrides},isRec?recQs(rid):`?id=eq.${rid}`);
    if(!isRec){
      if(_prevOv){const ov=st.wrOverrides.find(o=>String(o.rule_id)===String(rid)&&o.wk_key===wkKey);if(ov)Object.assign(ov,_prevOv);sbReqSilent('PATCH','wr_recurring_overrides',_prevOv,`?id=eq.${ov?ov.id:_prevOv.id}`);}
      else{const id=_ovRealId||st.wrOverrides.find(o=>String(o.rule_id)===String(rid)&&o.wk_key===wkKey)?.id;st.wrOverrides=st.wrOverrides.filter(o=>String(o.rule_id)!==String(rid)||o.wk_key!==wkKey);if(id)sbReqSilent('DELETE','wr_recurring_overrides',null,`?id=eq.${id}`);}
    }
    save();_rerender();
  },'Shifted schedule '+dir);
}
function wrCtxEditThisWeek(){
  hideWrRuleCtx();
  if(_wrCtxRecId){openRecEditModal(_wrCtxRecId,_wrCtxWkKey,'this');return;}
  if(!_wrCtxRuleId||!_wrCtxWkKey)return;
  openWrEditModal(_wrCtxRuleId,_wrCtxWkKey,'this');
}
function wrCtxEditRule(){
  hideWrRuleCtx();
  if(_wrCtxRecId){openRecEditModal(_wrCtxRecId);return;}
  if(!_wrCtxRuleId)return;
  openWrEditModal(_wrCtxRuleId,_wrCtxWkKey,'all');
}
function wrCtxDeleteRule(ruleId){
  hideWrRuleCtx();
  if(!ruleId&&_wrCtxRecId){delRec(_wrCtxRecId);return;}
  const rid=ruleId||_wrCtxRuleId;if(!rid)return;
  const rule=st.wrRules.find(r=>String(r.id)===String(rid));if(!rule)return;
  const prevRule={...rule};
  const sRid=String(rid);
  st.wrRules=st.wrRules.filter(r=>String(r.id)!==sRid);
  st.wrOverrides=st.wrOverrides.filter(o=>String(o.rule_id)!==sRid);
  sbReqSilent('DELETE','wr_recurring_rules',null,`?id=eq.${sRid}`);
  save();renderRecOv();if(typeof renderRecurringPage==='function')renderRecurringPage();
  pushUndo(async()=>{
    const sv=await sbReqSilent('POST','wr_recurring_rules',{name:prevRule.name,cadence:prevRule.cadence,day_of_week:prevRule.day_of_week,starting_date:prevRule.starting_date,monthly_rule_type:prevRule.monthly_rule_type,monthly_nth:prevRule.monthly_nth,monthly_weekday:prevRule.monthly_weekday,monthly_date:prevRule.monthly_date,pup_related:prevRule.pup_related,notes:prevRule.notes,is_enabled:prevRule.is_enabled,sort_order:prevRule.sort_order},'');
    if(sv&&sv[0])st.wrRules.push(sv[0]);else st.wrRules.push(prevRule);
    save();renderRecOv();if(typeof renderRecurringPage==='function')renderRecurringPage();
  },'Deleted WR rule');
}

// ── WR rule modal shared helpers ──────────────────────────────────────────────
const _WR_DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const _WR_NTHS=['1st','2nd','3rd','4th','Last'];
const _WR_NTH_VALS=[1,2,3,4,-1];

// Populate nth-weekday and day-of-month selects (idempotent — safe to call on every open)
function _wrBuildSelects(px){
  const nthWd=document.getElementById(px+'NthWd');
  if(nthWd&&!nthWd.options.length){
    _WR_NTH_VALS.forEach((nth,ni)=>_WR_DAYS.forEach((day,di)=>{
      const o=document.createElement('option');
      o.value=nth+'-'+di;o.textContent=_WR_NTHS[ni]+' '+day;nthWd.appendChild(o);
    }));
  }
  const dom=document.getElementById(px+'Dom');
  if(dom&&!dom.options.length){
    const suf=n=>n===1?'1st':n===2?'2nd':n===3?'3rd':n+'th';
    for(let i=1;i<=28;i++){const o=document.createElement('option');o.value=i;o.textContent=suf(i);dom.appendChild(o);}
  }
}

// Show/hide cadence-dependent fields for the given modal prefix ('wrAdd' or 'wrEdit')
let _wrAddType='wr';
function updateWrRuleCadenceUI(px){
  const cadence=document.getElementById(px+'Cadence').value;
  document.getElementById(px+'AnchorField').style.display=(cadence!=='weekly'||(px==='wrAdd'&&_wrAddType==='sch'))?'block':'none';
  if(px==='wrAdd'){
    const isSch=_wrAddType==='sch';
    const isMonthly=cadence==='monthly';
    document.getElementById('wrAddAppearDayField').style.display=isSch&&!isMonthly?'block':'none';
    document.getElementById('wrAddAppearDateField').style.display=isSch&&isMonthly?'block':'none';
  }
}

// Read cadence-related fields from modal, return partial rule payload
function _wrReadCadenceFields(px){
  const cadence=document.getElementById(px+'Cadence').value;
  const anchorVal=document.getElementById(px+'Anchor').value;
  return {cadence,starting_date:(cadence!=='weekly'||(px==='wrAdd'&&_wrAddType==='sch'))?anchorVal||null:null};
}

function wrAddSetType(type){
  _wrAddType=type;
  const base='flex:1;padding:6px 0;font-size:11px;font-weight:600;border:none;cursor:pointer;transition:background .12s,color .12s';
  document.getElementById('wrAddTypeWR').style.cssText=base+(type==='wr'?';background:var(--accent);color:#fff':';background:transparent;color:var(--muted)');
  document.getElementById('wrAddTypeSch').style.cssText=base+(type==='sch'?';background:var(--accent);color:#fff':';background:transparent;color:var(--muted)');
  document.getElementById('wrAddPupField').style.display=type==='wr'?'block':'none';
  document.getElementById('wrAddTimeField').style.display=type==='sch'?'block':'none';
  updateWrRuleCadenceUI('wrAdd');
}

// ── Unified edit WR modal ─────────────────────────────────────────────────────
let _wrEditRuleId=null,_wrEditWkKey=null,_wrEditScope='this';

function setWrEditScope(scope){
  _wrEditScope=scope;
  const thisBtn=document.getElementById('wrEditScopeThis');
  const allBtn=document.getElementById('wrEditScopeAll');
  const base='flex:1;padding:6px 0;font-size:12px;font-weight:500;border:none;cursor:pointer;transition:background .15s,color .15s;';
  thisBtn.style.cssText=base+(scope==='this'?'background:var(--accent);color:#fff':'background:transparent;color:var(--muted)');
  allBtn.style.cssText=base+(scope==='all'?'background:var(--accent);color:#fff':'background:transparent;color:var(--muted)');
  document.getElementById('wrEditPanelThis').style.display=scope==='this'?'block':'none';
  document.getElementById('wrEditPanelAll').style.display=scope==='all'?'block':'none';
  const sb=document.getElementById('wrEditSaveBtn');
  if(sb)sb.textContent=scope==='this'?'Save this week':'Save';
}

function openWrEditModal(ruleId,wkKey,defaultScope='this'){
  _wrEditRuleId=String(ruleId);_wrEditWkKey=wkKey||null;
  const rule=st.wrRules.find(r=>String(r.id)===_wrEditRuleId);if(!rule)return;
  // Populate "this week only" fields
  const existingOv=wkKey?st.wrOverrides.find(o=>String(o.rule_id)===_wrEditRuleId&&o.wk_key===wkKey&&o.override_type==='edit'):null;
  document.getElementById('wrMOccName').value=(existingOv&&existingOv.custom_name)||rule.name;
  document.getElementById('wrMOccNotes').value=(existingOv&&existingOv.custom_notes)||rule.notes||'';
  // Populate "all future" fields
  _wrBuildSelects('wrEdit');
  document.getElementById('wrEditName').value=rule.name||'';
  document.getElementById('wrEditPup').checked=!!(rule.pup_related===true||rule.pup_related==='true');
  document.getElementById('wrEditCadence').value=rule.cadence||'weekly';
  document.getElementById('wrEditAnchor').value=rule.starting_date||d2s(new Date());
  document.getElementById('wrEditNotes').value=rule.notes||'';
  updateWrRuleCadenceUI('wrEdit');
  // Hide scope toggle when no week context (recurring page edits always go to "all future")
  const toggleEl=document.getElementById('wrEditScopeToggle');
  if(toggleEl)toggleEl.style.display=wkKey?'flex':'none';
  const scope=wkKey?defaultScope:'all';
  document.getElementById('wrEditModal').classList.add('open');
  setWrEditScope(scope);
  setTimeout(()=>{
    const el=scope==='this'?document.getElementById('wrMOccName'):document.getElementById('wrEditName');
    el.focus();const len=el.value.length;el.setSelectionRange(len,len);
  },50);
}

function wrEditSkipThisWeek(){
  if(!_wrEditRuleId||!_wrEditWkKey)return;
  closeMod('wrEditModal');
  writeWrOverride(_wrEditRuleId,_wrEditWkKey,{override_type:'skip'},{undoLabel:'Skipped WR task this week'});
}

function saveWrEditModal(){
  if(_wrEditScope==='this'){
    const name=document.getElementById('wrMOccName').value.trim();
    if(!name){closeMod('wrEditModal');return;}
    const notes=document.getElementById('wrMOccNotes').value.trim()||null;
    writeWrOverride(_wrEditRuleId,_wrEditWkKey,{override_type:'edit',custom_name:name,custom_notes:notes},{undoLabel:'Edited WR occurrence'});
  } else {
    const name=document.getElementById('wrEditName').value.trim();if(!name)return;
    const rule=st.wrRules.find(r=>String(r.id)===_wrEditRuleId);if(!rule)return;
    const prev={name:rule.name,cadence:rule.cadence,starting_date:rule.starting_date,pup_related:rule.pup_related,notes:rule.notes};
    const cadenceFields=_wrReadCadenceFields('wrEdit');
    const patch={name,pup_related:document.getElementById('wrEditPup').checked,notes:document.getElementById('wrEditNotes').value.trim()||null,...cadenceFields};
    Object.assign(rule,patch);
    sbReqSilent('PATCH','wr_recurring_rules',patch,`?id=eq.${_wrEditRuleId}`);
    save();renderAll();renderWeeklyPage();
    pushUndo(()=>{Object.assign(rule,prev);sbReqSilent('PATCH','wr_recurring_rules',prev,`?id=eq.${_wrEditRuleId}`);save();renderAll();renderWeeklyPage();},'Edited WR rule');
  }
  closeMod('wrEditModal');
}

// ── Add WR rule modal ─────────────────────────────────────────────────────────
function openWrRuleAddModal(cadence,type='wr'){
  _wrBuildSelects('wrAdd');
  document.getElementById('wrAddName').value='';
  document.getElementById('wrAddPup').checked=false;
  document.getElementById('wrAddCadence').value=cadence||'weekly';
  document.getElementById('wrAddAnchor').value=d2s(new Date());
  document.getElementById('wrAddAppearDay').value='Friday';
  document.getElementById('wrAddAppearDate').value='1';
  document.getElementById('wrAddNotes').value='';
  document.getElementById('wrAddStartTime').value='';
  document.getElementById('wrAddEndTime').value='';
  wrAddSetType(type);
  document.getElementById('wrRuleAddModal').classList.add('open');
  setTimeout(()=>document.getElementById('wrAddName').focus(),50);
}
async function saveWrRuleAdd(){
  const name=document.getElementById('wrAddName').value.trim();if(!name){closeMod('wrRuleAddModal');return;}
  const notes=document.getElementById('wrAddNotes').value.trim()||null;
  const cadenceFields=_wrReadCadenceFields('wrAdd');
  closeMod('wrRuleAddModal');
  if(_wrAddType==='sch'){
    const cadence=cadenceFields.cadence;
    const isMonthly=cadence==='monthly';
    const appearsOn=isMonthly?document.getElementById('wrAddAppearDate').value||'1':document.getElementById('wrAddAppearDay').value||'Friday';
    const defStart=document.getElementById('wrAddStartTime').value||null;
    const defEnd=document.getElementById('wrAddEndTime').value||null;
    const localId='rec-tmp-'+Date.now();
    const r={id:localId,name,is_weekly_reset:false,appears_on_date:appearsOn,starting_date:cadenceFields.starting_date,cadence,notes,default_start_time:defStart,default_end_time:defEnd,_doneByWk:{},_done:false,_dateOverrides:{}};
    st.recurring.push(r);save();renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();
    let recServerId=null;
    pushUndo(()=>{const rid=recServerId||localId;st.recurring=st.recurring.filter(x=>String(x.id)!==String(rid));save();renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();if(recServerId)sbReq('DELETE','wr_recurring_rules',null,recQs(recServerId));},'Added recurring task');
    const payload={name,is_weekly_reset:false,appears_on_date:appearsOn,cadence};
    if(cadenceFields.starting_date)payload.starting_date=cadenceFields.starting_date;
    if(notes)payload.notes=notes;
    if(defStart)payload.default_start_time=defStart;
    if(defEnd)payload.default_end_time=defEnd;
    const sv=await sbReq('POST','wr_recurring_rules',payload);
    if(sv&&sv[0]){const i=st.recurring.findIndex(x=>x.id===localId);const entry={...sv[0],_doneByWk:{},_done:false,_dateOverrides:{}};if(i>-1)st.recurring[i]=entry;else if(!st.recurring.some(x=>String(x.id)===String(sv[0].id)))st.recurring.push(entry);recServerId=String(sv[0].id);save();renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();}
    return;
  }
  const pup_related=document.getElementById('wrAddPup').checked;
  const payload={name,pup_related,notes,is_weekly_reset:true,is_enabled:true,sort_order:st.wrRules.length,...cadenceFields};
  const tmpId='wrrule-tmp-'+Date.now();
  st.wrRules.push({...payload,id:tmpId});
  save();renderRecOv();renderWeeklyPage();
  let realId=null;
  const sv=await sbReqSilent('POST','wr_recurring_rules',payload,'');
  if(sv&&sv[0]){
    realId=String(sv[0].id);
    const idx=st.wrRules.findIndex(r=>String(r.id)===tmpId);
    if(idx>-1)st.wrRules[idx]=sv[0];
    save();renderRecOv();renderWeeklyPage();
  }
  pushUndo(()=>{
    const id=realId||tmpId;
    st.wrRules=st.wrRules.filter(r=>String(r.id)!==id);
    if(realId)sbReqSilent('DELETE','wr_recurring_rules',null,`?id=eq.${realId}`);
    save();renderRecOv();renderWeeklyPage();
  },'Added WR rule');
}


// ── Unassigned badge ────────────────────────────────────────────────────────────
function renderUnassigned(){
  const ts=st.tasks.filter(t=>!t.due_date&&!t.done&&t.category!=='Long term'&&t.category!=='Weekly Goals');
  const badge=document.getElementById('unAssignedBadge');
  if(badge)badge.style.display='none';
  // Show count on objectives header button
  const btn2=document.getElementById('unBadge2');
  if(btn2){const _cnt=ts.length;btn2.innerHTML=`<span style="font-size:10px;font-weight:600">${_cnt||''}</span>`;btn2.title=_cnt?_cnt+' unassigned tasks':'No unassigned tasks';}
  if(!ts.length){closeUnMenu();}
  const menu=document.getElementById('unMenu');
  if(menu&&menu.style.display==='block'){
    menu.innerHTML=ts.length?ts.map(t=>tRow(t,{cat:true,drag:true,noColor:true})).join('')
      :`<div style="padding:12px;font-size:10px;color:var(--subtle);text-align:center">All assigned ✓</div>`;
  }
}
function toggleUnMenu(){
  const menu=document.getElementById('unMenu');
  const back=document.getElementById('unMenuBack');
  const btn=document.getElementById('unBadge2')||document.getElementById('unAssignedBadge');
  if(!menu||!btn)return;
  if(menu.style.display==='block'){closeUnMenu();return;}
  const ts=sortTasks(st.tasks.filter(t=>!t.due_date&&!t.done&&t.category!=='Long term'&&t.category!=='Weekly Goals'));
  menu.innerHTML=ts.length?ts.map(t=>tRow(t,{cat:true,drag:true,noColor:true})).join('')
    :`<div style="padding:12px;font-size:10px;color:var(--subtle);text-align:center">All assigned ✓</div>`;
  const r=btn.getBoundingClientRect();
  menu.style.left=Math.max(8,r.left-140)+'px';
  menu.style.bottom=(window.innerHeight-r.top+6)+'px';
  menu.style.top='auto';
  menu.style.display='block';
  back.style.display='block';
}
function closeUnMenu(){
  const menu=document.getElementById('unMenu');
  const back=document.getElementById('unMenuBack');
  if(menu)menu.style.display='none';
  if(back)back.style.display='none';
}

// ── Drop on Today List ─────────────────────────────────────────────────────────
function dropOnTodayList(e){
  if(!dragId)return;
  e.preventDefault();
  document.getElementById('todList').classList.remove('drop-here');
  const ds=d2s(getDayDate(dayOff));
  if(dragId.startsWith('wrrule::')){
    const ruleId=dragId.split('::')[1];
    const wkKey=getWkKey(wkOff);
    const _isMultiWR=(selectedTasks.has('wrrule-'+ruleId)||selectedTasks.has('wrrule-virt-'+ruleId))&&selectedTasks.size>1;
    const _wrMoveIds=_isMultiWR?[...selectedTasks].filter(sid=>sid.startsWith('wrrule-')||sid.startsWith('wrrule-virt-')).map(sid=>sid.replace('wrrule-virt-','').replace('wrrule-','')):[ruleId];
    const _wrMoves=_wrMoveIds.map(rid=>{const r=st.wrRules.find(x=>String(x.id)===String(rid));return r?{r,rid,prev:r._dateOverrides?.[wkKey]}:null;}).filter(Boolean);
    _wrMoves.forEach(({r})=>{if(!r._dateOverrides)r._dateOverrides={};r._dateOverrides[wkKey]=ds;});
    dragId=null;save();renderAll();
    _wrMoves.forEach(({r,rid})=>sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${rid}`));
    pushUndo(()=>{_wrMoves.forEach(({r,rid,prev})=>{if(!r._dateOverrides)r._dateOverrides={};if(prev)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${rid}`);});save();renderAll();},'Assigned WR task to today');
    dragId=null;return;
  }
  if(dragId.startsWith('wrec::')||dragId.startsWith('rec::')){
    const recId=dragId.startsWith('wrec::')?dragId.split('::')[1]:dragId.split('::')[1];
    const r=st.recurring.find(x=>String(x.id)===String(recId));
    if(r){
      const wkKey=getWkKey(wkOff);
      if(!r._dateOverrides)r._dateOverrides={};
      const prev=r._dateOverrides[wkKey];
      r._dateOverrides[wkKey]=ds;
      dragId=null;save();renderAll();
      sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
      pushUndo(()=>{
        if(prev)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];
        save();renderAll();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
      },'Assigned recurring to today');
    }
    dragId=null;return;
  }
  if(dragId.startsWith('shop::')){
    const shopId=dragId.split('::')[1];
    const _isMultiShop=selectedTasks.has('shop-cal-'+shopId)&&selectedTasks.size>1;
    const _shopMoveIds=_isMultiShop?[...selectedTasks].filter(sid=>sid.startsWith('shop-cal-')).map(sid=>sid.replace('shop-cal-','')):[shopId];
    const _shopMoves=_shopMoveIds.map(sid=>{const s=st.shopping.find(x=>String(x.id)===String(sid));return s?{s,prev:s.due_date,prevOrder:s.shop_order}:null;}).filter(Boolean);
    if(_shopMoves.length){
      const newOrder=_shopTopOrder(_shopMoves[0].s);
      _shopMoves.forEach(({s},i)=>{s.due_date=ds;s.shop_order=newOrder-i;});
      dragId=null;save();renderAll();
      _shopMoves.forEach(({s})=>sbReq('PATCH','shopping_list',{due_date:ds,shop_order:s.shop_order},`?id=eq.${s.id}`));
      pushUndo(()=>{_shopMoves.forEach(({s,prev,prevOrder})=>{s.due_date=prev;s.shop_order=prevOrder;sbReq('PATCH','shopping_list',{due_date:prev||null,shop_order:prevOrder??null},`?id=eq.${s.id}`);});save();renderAll();},'Assigned shopping to today');
    }
    dragId=null;return;
  }
  // Video dragged onto today
  if(dragId.startsWith('vid::')){
    const vidId=dragId.split('::')[1];
    _vidAssignToDay(vidId,ds);
    dragId=null;return;
  }
  if(dragId.startsWith('vidstep::')){
    const parts=dragId.split('::');_vidStepAssignToDay(parts[1],parts[2],ds);dragId=null;return;
  }
  if(dragId.startsWith('fin-cancel::')){dragId=null;return;}
}

// ── Shop overview ──────────────────────────────────────────────────────────────
function _shopTopOrder(s){const orders=st.shopping.filter(x=>String(x.id)!==String(s.id)&&x.shop_order!=null).map(x=>x.shop_order);return orders.length?Math.min(...orders)-1:0;}
function _shopOvSort(arr){
  return[...arr].sort((x,y)=>{
    const ad=x.due_date?1:0,bd=y.due_date?1:0;
    if(ad!==bd)return bd-ad;
    if(x.due_date&&y.due_date&&x.due_date!==y.due_date)return x.due_date<y.due_date?-1:1;
    return(x.shop_order??9999)-(y.shop_order??9999);
  });
}
// ── Videos on Overview ────────────────────────────────────────────────────────
function _vidDayMap(){try{return JSON.parse(localStorage._vidDayMap||'{}');}catch(e){return{};}}
function _vidDayMapSet(m){localStorage._vidDayMap=JSON.stringify(m);}
// Video step → day map: key="vidId::stepName", value={ds,done}
function _vidStepDayMap(){try{return JSON.parse(localStorage._vidStepDayMap||'{}');}catch(e){return{};}}
function _vidStepDayMapSet(m){localStorage._vidStepDayMap=JSON.stringify(m);}
const _VID_STEP_LABELS={step_build:'Build',step_vo:'VO',step_cut:'Cut',step_thumbnail:'Th',step_description:'Des'};
function _vidStepReconstructBlocks(){
  const m=_vidStepDayMap();let mapChanged=false;
  // 1. Tag untagged video blocks with vidstep metadata
  (st.blocks||[]).filter(bl=>!bl._vidStepVid&&bl.cat==='Videos'&&!bl._vidId).forEach(bl=>{
    for(const [key] of Object.entries(m)){
      const [vid,step]=key.split('::');
      const v=(st.videos||[]).find(x=>String(x.id)===vid&&!x.is_deleted);
      if(!v)continue;
      const lbl=(_VID_STEP_LABELS[step]||step.replace('step_',''))+': '+(v.topic||v.title);
      if(bl.title===lbl){bl._vidStepVid=vid;bl._vidStepName=step;sbUpdateBlock(bl.id,{vid_id:vid,rec_id:step});break;}
    }
  });
  // 2. Ensure map entries exist for any vidstep blocks on today
  const todayDs=d2s(new Date());
  const seen=new Set();
  (st.blocks||[]).filter(bl=>bl._vidStepVid&&bl._vidStepName&&bl.ds===todayDs).forEach(bl=>{
    const key=bl._vidStepVid+'::'+bl._vidStepName;
    if(seen.has(key))return;seen.add(key);
    if(!m[key]||m[key].ds!==todayDs){m[key]={ds:todayDs,done:m[key]?m[key].done:false};mapChanged=true;}
  });
  if(mapChanged)_vidStepDayMapSet(m);
}
function _vidStepAssignToDay(vidId,step,ds){
  _vidStepReconstructBlocks();
  const m=_vidStepDayMap();const key=vidId+'::'+step;
  const prev=m[key]||null;
  const prevDs=prev?prev.ds:null;
  m[key]={ds,done:prev?prev.done:false};_vidStepDayMapSet(m);
  // Move timeblock blocks to new day
  if(prevDs&&prevDs!==ds){
    (st.blocks||[]).filter(bl=>String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step&&bl.ds===prevDs).forEach(bl=>{
      bl.ds=ds;sbUpdateBlock(bl.id,{day_date:ds});
    });
  }
  save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
  const panel=document.getElementById('vidOvPanel');if(panel&&panel.style.display==='block')_renderVidOvMenu();
  pushUndo(()=>{_vidStepReconstructBlocks();const m2=_vidStepDayMap();if(prev)m2[key]=prev;else delete m2[key];_vidStepDayMapSet(m2);if(prevDs&&prevDs!==ds){(st.blocks||[]).filter(bl=>String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step&&bl.ds===ds).forEach(bl=>{bl.ds=prevDs;sbUpdateBlock(bl.id,{day_date:prevDs});});}save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();const p2=document.getElementById('vidOvPanel');if(p2&&p2.style.display==='block')_renderVidOvMenu();},'Moved step');
}
function _vidStepToggleDone(vidId,step,checked,_fromTB){
  _vidStepReconstructBlocks();
  const m=_vidStepDayMap();const key=vidId+'::'+step;
  if(!m[key])return;
  const ds=m[key].ds;
  // For Build/VO/Cut, done flag tracks whether ALL TB blocks for this stage are done
  if(step!=='step_thumbnail'&&step!=='step_description'){
    const stageBlocks=(st.blocks||[]).filter(bl=>String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step);
    if(_fromTB){
      // Called from TB checkbox — block already toggled, just check if all are done
      m[key].done=stageBlocks.length>0&&stageBlocks.every(bl=>bl._done);
    } else {
      // Called from today/weekly list — mark ALL blocks to match
      stageBlocks.forEach(bl=>{if(bl._done!==checked){bl._done=checked;sbUpdateBlock(bl.id,{done:checked});}});
      m[key].done=checked;
    }
  } else {
    m[key].done=checked;
  }
  _vidStepDayMapSet(m);
  // Thumbnail & Description sync to actual video stage
  if(step==='step_thumbnail'||step==='step_description'){
    const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));
    if(v){v[step]=checked?'done':'not_started';sbReqSilent('PATCH','videos',{[step]:v[step]},`?id=eq.${v.id}`);}
    // Also sync timeblock block done state
    const stBlk=(st.blocks||[]).find(bl=>String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step);
    if(stBlk){stBlk._done=checked;sbUpdateBlock(stBlk.id,{done:checked});}
  }
  save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
  const panel=document.getElementById('vidOvPanel');if(panel&&panel.style.display==='block')_renderVidOvMenu();
  if(_vidOvAllOpen)_vidOvRenderAll();
}
function _vidStepUnassign(vidId,step){
  const m=_vidStepDayMap();const key=vidId+'::'+step;
  const prev=m[key]||null;delete m[key];_vidStepDayMapSet(m);
  // Delete linked timeblock blocks
  const removedBlks=st.blocks.filter(bl=>String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step);
  st.blocks=st.blocks.filter(bl=>!(String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step));
  removedBlks.forEach(bl=>sbDeleteBlock(bl.id));
  save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
  const panel=document.getElementById('vidOvPanel');if(panel&&panel.style.display==='block')_renderVidOvMenu();
  if(prev||removedBlks.length)pushUndo(()=>{const m2=_vidStepDayMap();if(prev)m2[key]=prev;_vidStepDayMapSet(m2);removedBlks.forEach(bl=>{st.blocks.push(bl);sbSaveBlock(bl);});save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();const p2=document.getElementById('vidOvPanel');if(p2&&p2.style.display==='block')_renderVidOvMenu();},'Removed step from calendar');
}
function _vidStepComputeDone(vidId,step,ds,mapEntry){
  // For Build/VO/Cut: done only when ALL TB blocks for this stage are done (blocks are source of truth)
  // For Thumbnail/Description: use daymap done flag
  if(step!=='step_thumbnail'&&step!=='step_description'){
    const stageBlocks=(st.blocks||[]).filter(bl=>String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step);
    if(stageBlocks.length>0)return stageBlocks.every(bl=>bl._done);
  }
  return !!(mapEntry&&mapEntry.done);
}
function _vidStepTasksForDayWithOverdue(todayDs){
  const m=_vidStepDayMap();const tasks=[];let moved=false;
  Object.entries(m).forEach(([key,val])=>{
    if(val.ds>todayDs)return;// future — skip
    const [vidId,step]=key.split('::');
    const v=(st.videos||[]).find(x=>String(x.id)===String(vidId)&&!x.is_deleted);if(!v)return;
    if(v[step]==='na')return;
    // Auto-move overdue map entries to today (but do NOT move blocks — they stay on their original day)
    if(val.ds<todayDs){val.ds=todayDs;val.done=false;m[key]=val;moved=true;}
    const isDone=v[step]==='done'||_vidStepComputeDone(vidId,step,val.ds,val);
    const label=_VID_STEP_LABELS[step]||step.replace('step_','');
    tasks.push({id:'vidstep-'+key.replace('::','-'),name:label+': '+(v.topic||v.title),category:'Videos',due_date:todayDs,done:isDone,_vidId:vidId,_vidStep:step,_virtual:true,_type:'vidstep'});
  });
  if(moved)_vidStepDayMapSet(m);
  return tasks;
}
function _vidStepTasksForDay(ds){
  const m=_vidStepDayMap();const tasks=[];
  Object.entries(m).forEach(([key,val])=>{
    if(val.ds!==ds)return;
    const [vidId,step]=key.split('::');
    const v=(st.videos||[]).find(x=>String(x.id)===String(vidId)&&!x.is_deleted);if(!v)return;
    const label=_VID_STEP_LABELS[step]||step.replace('step_','');
    const isDone=v[step]==='done'||_vidStepComputeDone(vidId,step,ds,val);
    tasks.push({id:'vidstep-'+key.replace('::','-'),name:label+': '+(v.topic||v.title),category:'Videos',due_date:ds,done:isDone,_vidId:vidId,_vidStep:step,_virtual:true,_type:'vidstep'});
  });
  return tasks;
}

let _vidOvSelIdx=-1;
let _vidOvSelVid=null;
const _vidOvSelSet=new Set();
function _vidOvGetRows(){const p=document.getElementById('vidOvPanel');return p?Array.from(p.querySelectorAll('[data-vidrow]')):[]}
function _vidOvClickSelect(el,e){
  const rows=_vidOvGetRows();const idx=rows.indexOf(el);if(idx<0)return;
  const vid=el.dataset.vidrow||null;
  if(e&&e.shiftKey&&_vidOvSelIdx>=0){
    // Shift-click: range select
    const lo=Math.min(_vidOvSelIdx,idx),hi=Math.max(_vidOvSelIdx,idx);
    _vidOvSelSet.clear();
    for(let i=lo;i<=hi;i++){const r=rows[i];if(r&&r.dataset.vidrow)_vidOvSelSet.add(r.dataset.vidrow);}
    _vidOvSelIdx=idx;_vidOvSelVid=vid;
  }else if(e&&(e.metaKey||e.ctrlKey)){
    // Cmd-click: toggle in selection
    if(_vidOvSelSet.has(vid))_vidOvSelSet.delete(vid);else _vidOvSelSet.add(vid);
    _vidOvSelIdx=idx;_vidOvSelVid=vid;
  }else{
    _vidOvSelSet.clear();_vidOvSelSet.add(vid);
    _vidOvSelIdx=idx;_vidOvSelVid=vid;
  }
  _vidOvHighlight();if(typeof _vidCalHighlightChip==='function')_vidCalHighlightChip(_vidOvSelVid);
}
function _vidOvDeselect(e){if(!e.target.closest('[data-vidrow]')){_vidOvSelIdx=-1;_vidOvSelVid=null;_vidOvSelSet.clear();_vidOvHighlight();}}
function _vidOvHighlight(){const rows=_vidOvGetRows();rows.forEach(r=>{r.classList.toggle('vid-sel',_vidOvSelSet.has(r.dataset.vidrow));});if(typeof _vidCalHighlightChip==='function')_vidCalHighlightChip(_vidOvSelVid);}
function _vidOvRestoreSel(){
  if(!_vidOvSelVid&&!_vidOvSelSet.size)return;
  const rows=_vidOvGetRows();
  if(_vidOvSelVid){const idx=rows.findIndex(r=>r.dataset.vidrow===_vidOvSelVid);if(idx>=0)_vidOvSelIdx=idx;}
  _vidOvHighlight();
}
function _vidOvKeyNav(e){
  const panel=document.getElementById('vidOvPanel');
  if(!panel||panel.style.display!=='block')return false;
  // T always works for toggling toolbox
  if(e.key==='t'&&!e.metaKey&&!e.ctrlKey&&!_vidCalOpen){e.preventDefault();_vidOvToggleAll();return true;}
  if(_vidOvAllOpen)return false;
  if(_vidCalOpen&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))return false;
  const rows=_vidOvGetRows();if(!rows.length)return false;
  // Cmd+Up/Down: reorder videos
  if((e.metaKey||e.ctrlKey)&&(e.key==='ArrowUp'||e.key==='ArrowDown')&&_vidOvSelSet.size>0){
    e.preventDefault();const dir=e.key==='ArrowUp'?-1:1;
    // Check if any selected is a child video
    const selIds=[..._vidOvSelSet];
    const firstSel=(st.videos||[]).find(v=>String(v.id)===selIds[0]&&!v.is_deleted);
    if(firstSel&&firstSel.video_type!=='B'&&firstSel.big_video_id){
      // Reorder children within parent
      const parentId=String(firstSel.big_video_id);
      const children=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===parentId&&c.status!=='published').sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
      children.forEach((c,i)=>{if(c.vid_order==null)c.vid_order=i;});
      const selChildIds=selIds.filter(id=>children.some(c=>String(c.id)===id));
      if(selChildIds.length){
        const prevOrders=children.map(c=>({id:c.id,ord:c.vid_order}));
        const idxs=selChildIds.map(id=>children.findIndex(c=>String(c.id)===id)).filter(i=>i>=0).sort((a,b)=>a-b);
        if(dir===-1&&idxs[0]>0){const above=children[idxs[0]-1];idxs.forEach(i=>{children[i].vid_order--;});above.vid_order=children[idxs[idxs.length-1]].vid_order+1;}
        else if(dir===1&&idxs[idxs.length-1]<children.length-1){const below=children[idxs[idxs.length-1]+1];idxs.forEach(i=>{children[i].vid_order++;});below.vid_order=children[idxs[0]].vid_order-1;}
        children.sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));children.forEach((c,i)=>{c.vid_order=i;sbReqSilent('PATCH','videos',{vid_order:i},`?id=eq.${c.id}`);});
        save();_renderVidOvMenu();
        pushUndo(()=>{prevOrders.forEach(p=>{const c=(st.videos||[]).find(x=>String(x.id)===String(p.id));if(c){c.vid_order=p.ord;sbReqSilent('PATCH','videos',{vid_order:p.ord},`?id=eq.${p.id}`);}});save();_renderVidOvMenu();},'Reorder videos');
      }
    } else {
      // Reorder B videos — simple swap approach
      const bVids=(st.videos||[]).filter(v=>!v.is_deleted&&v.video_type==='B'&&v.status==='up_next').sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
      // Normalize vid_order for all B vids
      bVids.forEach((v,i)=>{v.vid_order=i;});
      const selBId=selIds[0];
      const idx=bVids.findIndex(v=>String(v.id)===selBId);
      if(idx>=0){
        const swapIdx=idx+dir;
        if(swapIdx>=0&&swapIdx<bVids.length){
          const prevOrders=bVids.map(v=>({id:v.id,ord:v.vid_order}));
          // Swap vid_order
          const tmp=bVids[idx].vid_order;bVids[idx].vid_order=bVids[swapIdx].vid_order;bVids[swapIdx].vid_order=tmp;
          bVids.forEach(v=>sbReqSilent('PATCH','videos',{vid_order:v.vid_order},`?id=eq.${v.id}`));
          save();_renderVidOvMenu();
          pushUndo(()=>{prevOrders.forEach(p=>{const v=(st.videos||[]).find(x=>String(x.id)===String(p.id));if(v){v.vid_order=p.ord;sbReqSilent('PATCH','videos',{vid_order:p.ord},`?id=eq.${p.id}`);}});save();_renderVidOvMenu();},'Reorder videos');
        }
      }
    }
    return true;
  }
  if(e.key==='ArrowDown'){e.preventDefault();_vidOvSelIdx=Math.min(_vidOvSelIdx+1,rows.length-1);const nv=rows[_vidOvSelIdx]?.dataset.vidrow;if(e.shiftKey&&nv){_vidOvSelSet.add(nv);}else{_vidOvSelSet.clear();if(nv)_vidOvSelSet.add(nv);}_vidOvSelVid=nv||null;_vidOvHighlight();return true;}
  if(e.key==='ArrowUp'){e.preventDefault();_vidOvSelIdx=Math.max(_vidOvSelIdx-1,0);const nv=rows[_vidOvSelIdx]?.dataset.vidrow;if(e.shiftKey&&nv){_vidOvSelSet.add(nv);}else{_vidOvSelSet.clear();if(nv)_vidOvSelSet.add(nv);}_vidOvSelVid=nv||null;_vidOvHighlight();return true;}
  if((e.key==='Delete'||e.key==='Backspace')&&_vidOvSelSet.size>0){
    e.preventDefault();
    const ids=[..._vidOvSelSet];
    const row=rows.find(r=>_vidOvSelSet.has(r.dataset.vidrow));
    _vidOvShowActionMenu(ids,row||null);
    return true;
  }
  if(e.key==='Enter'&&_vidOvSelIdx>=0&&_vidOvSelIdx<rows.length){
    e.preventDefault();const vid=rows[_vidOvSelIdx].dataset.vidrow;
    if(typeof openVidEdit==='function')openVidEdit(vid);return true;
  }
  if(e.key==='m'||e.key==='M'){e.preventDefault();_vidOvToggleCal();return true;}
  return false;
}
function toggleVidOvMenu(){
  if(typeof closeAutoTBManager==='function')closeAutoTBManager();
  const panel=document.getElementById('vidOvPanel');
  if(!panel)return;
  if(panel.style.display==='block'){closeVidOvMenu();return;}
  _renderVidOvMenu();
  panel.style.display='block';
  requestAnimationFrame(()=>{requestAnimationFrame(()=>{panel.style.opacity='1';panel.style.transform='translateX(0)';});});
}
function closeVidOvMenu(){
  const panel=document.getElementById('vidOvPanel');
  if(!panel||panel.style.display==='none')return;
  _vidOvSelIdx=-1;
  if(_vidCalOpen)_vidOvCloseCal();
  if(_vidOvAllOpen)_vidOvCloseAll();
  if(_vidOvAnOpen)_vidOvCloseAnalytics();
  panel.style.opacity='0';panel.style.transform='translateX(-12px)';
  setTimeout(()=>{panel.style.display='none';},250);
}
function _renderVidOvMenu(){
  const menu=document.getElementById('vidOvPanel');if(!menu)return;
  let vids=(st.videos||[]).filter(v=>!v.is_deleted&&v.video_type==='B'&&v.status==='up_next').sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
  if(window._vidOvFocusWk===undefined&&localStorage._vidOvFocusWk==='1')window._vidOvFocusWk=true;
  const _focusActive=!!window._vidOvFocusWk;
  // Focus mode: highlight (not filter) videos on calendar this week
  let _focusSet=null;
  if(_focusActive){
    _focusSet=new Set();
    const _wkStart=getWkKey(wkOff);
    const _wkEnd=d2s(new Date(new Date(_wkStart+'T00:00:00').getTime()+6*86400000));
    const _map=_vidDayMap();
    const _sMap=_vidStepDayMap();
    const _inWk=ds=>ds&&ds>=_wkStart&&ds<=_wkEnd;
    const _vidHasStepInWk=vid=>{for(const k in _sMap){if(k.startsWith(String(vid.id)+'::')&&_sMap[k]&&_inWk(_sMap[k].ds))return true;}return false;};
    vids.forEach(vid=>{
      const sid=String(vid.id);
      const dayDs=_map[sid];
      if(_inWk(dayDs)||_inWk(vid.post_date)||_vidHasStepInWk(vid))_focusSet.add(sid);
      (st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===sid).forEach(c=>{
        const csid=String(c.id);
        const cd=_map[csid];
        if(_inWk(cd)||_inWk(c.post_date)||_vidHasStepInWk(c)){_focusSet.add(sid);_focusSet.add(csid);}
      });
    });
  }
  const _moonColor=_focusActive?'#eab308':'var(--muted)';
  const _moonGlow=_focusActive?'filter:drop-shadow(0 0 4px rgba(234,179,8,.5))':'';
  const _ib='background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;width:20px;height:20px;flex-shrink:0';
  const _hdr=`<div class="tod-tb-header" style="position:relative"><button onclick="_vidOvToggleCal()" style="${_ib};color:${_vidCalOpen?'var(--accent)':'var(--muted)'}" title="Monthly schedule (M)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></button><button onclick="_vidOvToggleAll()" style="${_ib};color:${_vidOvAllOpen?'var(--accent)':'var(--muted)'}" title="All videos"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg></button><button onclick="_vidOvToggleFocusWk()" style="${_ib};color:${_moonColor};${_moonGlow}" title="Focus this week"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></button><span style="flex:1;text-align:center;font-size:12px;font-weight:700;color:var(--text);letter-spacing:-.1px">Videos</span><button onclick="_vidOvToggleAnalytics()" style="${_ib};color:${_vidOvAnOpen?'var(--accent)':'var(--muted)'}" title="Analytics"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></button><button onclick="closeVidOvMenu();showPage('videos')" style="${_ib};color:var(--muted)" title="Go to Videos page"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button><button onclick="closeVidOvMenu()" style="${_ib};color:var(--muted);font-size:14px" title="Close">✕</button></div>`;
  if(!vids.length){
    menu.innerHTML=_hdr+'<div style="padding:30px;font-size:12px;color:var(--subtle);text-align:center">No videos to add</div>';
    return;
  }
  const steps=typeof VID_STEPS_CORE!=='undefined'?VID_STEPS_CORE:(typeof VID_STEPS!=='undefined'?VID_STEPS:[]);
  const labels=typeof VID_STEP_LABELS!=='undefined'?VID_STEP_LABELS:{};
  let html=_hdr;
  html+='<div id="vidOvContent" style="padding:4px 10px 0;flex:1;min-height:0;overflow-y:auto" ondragover="event.preventDefault();_vidOvDragIndicator(event)" ondragleave="_vidOvClearIndicator()" ondrop="_vidOvContentDrop(event)">';
  // Column header row — [+btn 16px][name flex][stages+%][post 52px][x 18px]
  html+='<div style="display:flex;align-items:center;padding:2px 19px 2px 6px;gap:3px">';
  html+='<div style="width:16px;flex-shrink:0"></div>';
  html+='<span style="flex:1;min-width:0"></span>';
  html+='<div style="display:flex;gap:0;flex-shrink:0;align-items:center">';
  html+=steps.map(s=>`<div style="width:22px;text-align:center;font-size:9px;color:var(--muted);font-weight:700;flex-shrink:0">${(labels[s]||s).charAt(0)}</div>`).join('');
  html+='</div>';
  html+='<span style="width:28px;flex-shrink:0"></span>';
  html+='<span style="width:14px;flex-shrink:0;margin-left:12px"></span>';
  html+='</div>';

  vids.forEach(v=>{html+=_vidOvMenuItem(v,steps,_focusSet);});
  html+='</div>';
  menu.innerHTML=html;
  // Insert zone hover delay
  menu.querySelectorAll('.vid-insert-zone').forEach(iz=>{
    let _izT=null;
    iz.addEventListener('mouseenter',()=>{_izT=setTimeout(()=>{iz.classList.add('_iz-active');},500);});
    iz.addEventListener('mouseleave',()=>{clearTimeout(_izT);iz.classList.remove('_iz-active');});
  });
  // Post date click — delegate via mousedown on post spans
  menu.addEventListener('mousedown',e=>{
    const postEl=e.target.closest('[data-postvid]');
    if(postEl){e.stopPropagation();e.preventDefault();_vidOvEditPostDate(postEl.dataset.postvid,postEl);return;}
  });
  _vidOvRestoreSel();
  // Click empty space to deselect
  menu.onclick=e=>{if(!e.target.closest('[data-vidrow]')&&!e.target.closest('button')&&!e.target.closest('.vid-step-dot')&&!e.target.closest('.vid-insert-zone')&&!e.target.closest('[data-postvid]')){_vidOvSelIdx=-1;_vidOvSelVid=null;_vidOvSelSet.clear();_vidOvHighlight();}};
  menu.ondblclick=e=>{if(!e.target.closest('[data-vidrow]')&&!e.target.closest('button')&&!e.target.closest('.vid-step-dot')&&!e.target.closest('.vid-insert-zone')&&!e.target.closest('.tod-tb-header')){if(typeof openVidModal==='function'){openVidModal('B');const _ss=document.getElementById('vmStatus');if(_ss){_ss.value='up_next';if(typeof _vidSetStatusDisplay==='function')_vidSetStatusDisplay('up_next');}}}};
}
function _vidOvStepDots(vid,steps){
  const sid=String(vid.id);
  return steps.map(s=>{
    const val=vid[s]||'not_started';
    const cls=val==='done'?'done':val==='na'?'na':'';
    return`<div style="width:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><div class="vid-step-dot${cls?' '+cls:''}" draggable="true" style="width:12px;height:12px;border-radius:2px;cursor:pointer" onclick="event.stopPropagation();_vidOvToggleStep('${sid}','${s}',this)" oncontextmenu="event.preventDefault();event.stopPropagation();_vidOvNaStep('${sid}','${s}')" ondragstart="event.stopPropagation();dragId='vidstep::${sid}::${s}';event.dataTransfer.effectAllowed='move';document.body.classList.add('body-dragging');showWkcEdges(true)" ondragend="document.body.classList.remove('body-dragging');showWkcEdges(false)"></div></div>`;
  }).join('');
}
function _vidOvPct(vid,steps){const app=steps.filter(s=>vid[s]!=='na');const dn=app.filter(s=>vid[s]==='done').length;const p=app.length?Math.round(dn/app.length*100):0;return p||'';}
function _vidOvMenuItem(v,steps,focusSet){
  const sid=String(v.id);
  const _isFocused=focusSet&&focusSet.has(sid);
  const _dragAttr=`draggable="true" ondragstart="_vidOvSelVid='${sid}';_vidOvBDrag=event.currentTarget;dragId='vid::${sid}';event.dataTransfer.effectAllowed='move';document.body.classList.add('body-dragging');showWkcEdges(true);event.currentTarget.style.opacity='.4'" ondragend="_vidOvBDrag=null;event.currentTarget.style.opacity='1';document.body.classList.remove('body-dragging');showWkcEdges(false)"`;
  const _dblAttr=`ondblclick="event.stopPropagation();if(typeof openVidEdit==='function')openVidEdit('${sid}')"`;
  const _ctxAttr=`oncontextmenu="if(typeof showVidCtx==='function')showVidCtx(event,'${sid}')"`;
  const _hovBg=_dk()?'rgba(255,255,255,.04)':'rgba(0,0,0,.04)';
  const _hov=`onmouseenter="this.style.background='${_hovBg}'" onmouseleave="this.style.background='none'" onclick="_vidOvClickSelect(this,event)"`;
  const _map=_vidDayMap();const _onCal=!!_map[sid];
  const _addBtn=`<button onclick="event.stopPropagation();_vidOvInlineAdd('${sid}',null,null,this.closest('[data-vidrow]'))" style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:14px;text-align:center;border-radius:3px;border:1px solid ${_onCal?'var(--accent)':'var(--border)'};background:var(--bg);color:${_onCal?'var(--accent)':'var(--muted)'};cursor:pointer;padding:0;flex-shrink:0;box-sizing:border-box" title="Add small video">+</button>`;
  const _xBtn=`<button class="vid-ov-x" onclick="event.stopPropagation();_vidOvXClick('${sid}',this)" title="Actions">✕</button>`;
  const _postDate=v.post_date?_vidOvPostStr(v.post_date):'';
  const _postColor=v.post_date?_vidOvPostColor(v):'var(--muted)';
  const _postField=`<span class="vid-ov-post" data-postvid="${sid}" style="width:28px;flex-shrink:0;font-size:9px;text-align:right;font-variant-numeric:tabular-nums;font-family:system-ui,-apple-system,sans-serif;color:${_postColor};cursor:pointer;line-height:12px">${_postDate||''}</span>`;
  const _focusCls=_isFocused?' vid-ov-focus':'';
  let html=`<div data-vidrow="${sid}" ${_dragAttr} ${_dblAttr} ${_ctxAttr} ${_hov} class="${_focusCls}" style="padding:5px 19px 5px 6px;border-radius:6px;font-size:13px;font-weight:600;color:var(--text);cursor:grab;display:flex;align-items:center;gap:3px;transition:background .1s">${_addBtn}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(v.topic||v.title)}</span><div style="display:flex;gap:0;flex-shrink:0;align-items:center">${_vidOvStepDots(v,steps)}</div>${_postField}<div class="vid-ov-pctx" style="width:14px;flex-shrink:0;text-align:center;position:relative;margin-left:12px;display:flex;align-items:center;justify-content:center;line-height:12px"><span class="vid-ov-pct" style="font-size:9px;opacity:.5;font-variant-numeric:tabular-nums;font-family:system-ui,-apple-system,sans-serif;line-height:12px">${_vidOvPct(v,steps)?_vidOvPct(v,steps)+'%':''}</span>${_xBtn}</div></div>`;
  // Children (S/L videos)
  const children=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(v.id)&&c.status!=='published').sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
  children.forEach((c,ci)=>{
    const csid=String(c.id);
    const _cOnCal=!!_map[csid];
    const _cFocused=focusSet&&focusSet.has(csid);
    const _cFocusCls=_cFocused?' vid-ov-focus':'';
    const _cxBtn=`<button class="vid-ov-x" onclick="event.stopPropagation();_vidOvXClick('${csid}',this)" title="Actions">✕</button>`;
    const _cPostDate=c.post_date?_vidOvPostStr(c.post_date):'';
    const _cPostColor=c.post_date?_vidOvPostColor(c):'var(--muted)';
    const _cPostField=`<span class="vid-ov-post" data-postvid="${csid}" style="width:28px;flex-shrink:0;font-size:9px;text-align:right;font-variant-numeric:tabular-nums;font-family:system-ui,-apple-system,sans-serif;color:${_cPostColor};cursor:pointer;line-height:12px">${_cPostDate||''}</span>`;
    html+=`<div draggable="true" ondragstart="_vidOvSelVid='${csid}';_vidOvChildDrag=event.currentTarget;dragId='vid::${csid}';event.dataTransfer.effectAllowed='move';document.body.classList.add('body-dragging');showWkcEdges(true);event.currentTarget.style.opacity='.4'" ondragend="event.currentTarget.style.opacity='1';_vidOvChildDrag=null;document.body.classList.remove('body-dragging');showWkcEdges(false)" ondragover="event.preventDefault()" ${_hov} ondblclick="event.stopPropagation();if(typeof openVidEdit==='function')openVidEdit('${csid}')" oncontextmenu="if(typeof showVidCtx==='function')showVidCtx(event,'${csid}')" data-vidrow="${csid}" data-cvid="${csid}" class="${_cFocusCls}" style="padding:5px 19px 5px 6px;border-radius:6px;font-size:11px;font-weight:500;color:var(--muted);cursor:grab;display:flex;align-items:center;gap:3px;transition:background .1s"><div style="width:16px;flex-shrink:0;box-sizing:border-box;border:1px solid transparent;text-align:center;color:${_cOnCal?'var(--accent)':'rgba(140,135,160,.4)'};font-size:10px;font-weight:${_cOnCal?'700':'400'}">└</div><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.topic||c.title)}</span><div style="display:flex;gap:0;flex-shrink:0;align-items:center">${_vidOvStepDots(c,steps)}</div>${_cPostField}<div class="vid-ov-pctx" style="width:14px;flex-shrink:0;text-align:center;position:relative;margin-left:12px;display:flex;align-items:center;justify-content:center;line-height:12px"><span class="vid-ov-pct" style="font-size:9px;opacity:.4;font-variant-numeric:tabular-nums;font-family:system-ui,-apple-system,sans-serif;line-height:12px">${_vidOvPct(c,steps)?_vidOvPct(c,steps)+'%':''}</span>${_cxBtn}</div></div>`;
    if(ci<children.length-1){const oA=c.vid_order??ci;const oB=children[ci+1].vid_order??(ci+1);html+=`<div class="vid-insert-zone"><button class="vid-insert-btn" onclick="event.stopPropagation();_vidOvInlineAdd('${sid}',${oA},${oB},this.closest('.vid-insert-zone'))">+</button></div>`;}
  });
  return html;
}

function _vidOvInlineAdd(bigId,orderBefore,orderAfter,afterEl){
  // Remove any existing inline add
  const existing=document.querySelector('.vid-ov-inline-add');if(existing)existing.remove();
  const parent=(st.videos||[]).find(v=>String(v.id)===String(bigId));
  const insertOrder=orderBefore!=null&&orderAfter!=null?(orderBefore+orderAfter)/2:null;
  const row=document.createElement('div');
  row.className='vid-ov-inline-add';
  row.style.cssText='padding:3px 6px;display:flex;align-items:center;gap:5px';
  row.innerHTML=`<div style="width:16px;flex-shrink:0;box-sizing:border-box;border:1px solid transparent;text-align:center;color:rgba(140,135,160,.4);font-size:10px">└</div><input type="text" placeholder="Video topic..." style="flex:1;min-width:0;border:none;outline:none;background:transparent;font-size:11px;color:var(--text);font-weight:500;padding:3px 4px;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(14,165,233,.3)">`;
  const inp=row.querySelector('input');
  // For + on B video (no orderBefore), insert after last child row
  if(afterEl&&afterEl.parentNode&&orderBefore==null){
    let lastChild=afterEl;
    let next=afterEl.nextElementSibling;
    while(next&&(next.dataset.cvid||next.classList.contains('vid-insert-zone')||next.classList.contains('vid-ov-inline-add'))){lastChild=next;next=next.nextElementSibling;}
    lastChild.parentNode.insertBefore(row,lastChild.nextSibling);
  }else if(afterEl&&afterEl.parentNode){afterEl.parentNode.insertBefore(row,afterEl.nextSibling);}
  else{const panel=document.getElementById('vidOvPanel');if(panel){const content=panel.querySelector('div[style*="padding:4px 10px"]')||panel;content.appendChild(row);}}
  setTimeout(()=>inp.focus(),30);
  const _save=async()=>{
    const topic=inp.value.trim();row.remove();
    if(!topic)return;
    const siblings=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(bigId));
    const maxOrder=Math.max(0,...siblings.map(c=>c.vid_order??0));
    const data={topic,title:'',video_type:'L',status:parent&&parent.status!=='idea'?parent.status:'up_next',big_video_id:bigId,vid_order:insertOrder!=null?insertOrder:maxOrder+1,step_tableau_public:'na',step_upload_tableau:'na'};
    const tmp='l-'+Date.now();const rec={id:tmp,...data};
    st.videos.push(rec);save();_renderVidOvMenu();renderAll();
    if(_vidOvAllOpen)_vidOvRenderAll();
    pushUndo(async()=>{const v2=(st.videos||[]).find(x=>x.id===tmp||x.id===rec.id);if(v2){v2.is_deleted=true;save();_renderVidOvMenu();renderAll();if(_vidOvAllOpen)_vidOvRenderAll();const sid2=String(v2.id);if(!sid2.startsWith('l-'))await sbReqSilent('PATCH','videos',{is_deleted:true},`?id=eq.${sid2}`);};},'Added video');
    const sv=await sbReqSilent('POST','videos',data);
    if(sv&&sv[0]){rec.id=sv[0].id;const ix=st.videos.findIndex(x=>x.id===tmp);if(ix>-1)st.videos[ix]=sv[0];}
    save();_renderVidOvMenu();
  };
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();e.stopPropagation();_save();}
    if(e.key==='Escape'){e.stopPropagation();row.remove();}
  });
  inp.addEventListener('blur',()=>{setTimeout(()=>{if(document.body.contains(row))_save();},100);});
}
function _vidOvDemote(vidId){
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));if(!v)return;
  const prevStatus=v.status;
  const prevBigId=v.big_video_id;
  v.status='idea';
  const patch={status:'idea'};
  // For small videos, unlink from big video
  if(v.video_type!=='B'&&v.big_video_id){
    v.big_video_id=null;patch.big_video_id=null;
  }
  // Also demote children of B videos
  const childUndos=[];
  if(v.video_type==='B'){
    (st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(vidId)&&c.status!=='published').forEach(c=>{
      const cp=c.status;const cpBig=c.big_video_id;
      c.status='idea';c.big_video_id=null;
      childUndos.push({id:c.id,prevStatus:cp,prevBig:cpBig});
      sbReqSilent('PATCH','videos',{status:'idea',big_video_id:null},`?id=eq.${c.id}`);
    });
  }
  // Remove from day map if assigned
  const map=_vidDayMap();const prevDay=map[String(vidId)]||null;
  if(prevDay){delete map[String(vidId)];_vidDayMapSet(map);}
  save();_renderVidOvMenu();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
  sbReqSilent('PATCH','videos',patch,`?id=eq.${vidId}`);
  pushUndo(()=>{
    v.status=prevStatus;v.big_video_id=prevBigId;
    childUndos.forEach(cu=>{const c=(st.videos||[]).find(x=>String(x.id)===String(cu.id));if(c){c.status=cu.prevStatus;c.big_video_id=cu.prevBig;sbReqSilent('PATCH','videos',{status:cu.prevStatus,big_video_id:cu.prevBig},`?id=eq.${cu.id}`);}});
    if(prevDay){const m2=_vidDayMap();m2[String(vidId)]=prevDay;_vidDayMapSet(m2);}
    save();_renderVidOvMenu();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    sbReqSilent('PATCH','videos',{status:prevStatus,big_video_id:prevBigId},`?id=eq.${vidId}`);
  },'Moved to ideas');
}
function _vidOvBulkDemote(ids){
  const undoData=ids.map(vid=>{
    const v=(st.videos||[]).find(x=>String(x.id)===vid);if(!v)return null;
    const prevStatus=v.status;const prevBig=v.big_video_id;
    const map=_vidDayMap();const prevDay=map[vid]||null;
    const childData=v.video_type==='B'?(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===vid&&c.status!=='published').map(c=>({id:c.id,status:c.status,big:c.big_video_id})):[];
    return{vid,prevStatus,prevBig,prevDay,childData};
  }).filter(Boolean);
  ids.forEach(vid=>{
    const v=(st.videos||[]).find(x=>String(x.id)===vid);if(!v)return;
    v.status='idea';const patch={status:'idea'};
    if(v.video_type!=='B'&&v.big_video_id){v.big_video_id=null;patch.big_video_id=null;}
    if(v.video_type==='B'){(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===vid&&c.status!=='published').forEach(c=>{c.status='idea';c.big_video_id=null;sbReqSilent('PATCH','videos',{status:'idea',big_video_id:null},`?id=eq.${c.id}`);});}
    const map=_vidDayMap();if(map[vid]){delete map[vid];_vidDayMapSet(map);}
    sbReqSilent('PATCH','videos',patch,`?id=eq.${vid}`);
  });
  save();_renderVidOvMenu();renderAll();if(document.getElementById('tbGrid'))renderDayTB();if(_vidOvAllOpen&&typeof _vidOvRenderAll==='function')_vidOvRenderAll();
  pushUndo(()=>{
    undoData.forEach(u=>{
      const v=(st.videos||[]).find(x=>String(x.id)===u.vid);if(!v)return;
      v.status=u.prevStatus;v.big_video_id=u.prevBig;
      sbReqSilent('PATCH','videos',{status:u.prevStatus,big_video_id:u.prevBig},`?id=eq.${u.vid}`);
      u.childData.forEach(cu=>{const c=(st.videos||[]).find(x=>String(x.id)===String(cu.id));if(c){c.status=cu.status;c.big_video_id=cu.big;sbReqSilent('PATCH','videos',{status:cu.status,big_video_id:cu.big},`?id=eq.${cu.id}`);}});
      if(u.prevDay){const m=_vidDayMap();m[u.vid]=u.prevDay;_vidDayMapSet(m);}
    });
    save();_renderVidOvMenu();renderAll();if(document.getElementById('tbGrid'))renderDayTB();if(_vidOvAllOpen&&typeof _vidOvRenderAll==='function')_vidOvRenderAll();
  },'Moved to ideas');
}
function _vidOvBulkDelete(ids){
  const undoData=ids.map(vid=>{
    const v=(st.videos||[]).find(x=>String(x.id)===vid);if(!v)return null;
    return{vid,wasDeleted:v.is_deleted};
  }).filter(Boolean);
  ids.forEach(vid=>{
    const v=(st.videos||[]).find(x=>String(x.id)===vid);if(!v)return;
    v.is_deleted=true;
    if(typeof _vidSelected!=='undefined')_vidSelected.delete(vid);
    if(!vid.startsWith('l-'))sbReqSilent('PATCH','videos',{is_deleted:true},`?id=eq.${vid}`);
  });
  save();_renderVidOvMenu();renderAll();if(document.getElementById('tbGrid'))renderDayTB();if(_vidOvAllOpen&&typeof _vidOvRenderAll==='function')_vidOvRenderAll();
  pushUndo(()=>{
    undoData.forEach(u=>{
      const v=(st.videos||[]).find(x=>String(x.id)===u.vid);if(!v)return;
      v.is_deleted=u.wasDeleted;
      if(!u.vid.startsWith('l-'))sbReqSilent('PATCH','videos',{is_deleted:u.wasDeleted},`?id=eq.${u.vid}`);
    });
    save();_renderVidOvMenu();renderAll();if(document.getElementById('tbGrid'))renderDayTB();if(_vidOvAllOpen&&typeof _vidOvRenderAll==='function')_vidOvRenderAll();
  },'Deleted videos');
}
function _vidOvXClick(vid,btn){
  const ids=_vidOvSelSet.has(vid)&&_vidOvSelSet.size>1?[..._vidOvSelSet]:_voaSel.has(vid)&&_voaSel.size>1?[..._voaSel]:[vid];
  _vidOvShowActionMenu(ids,btn);
}
function _vidOvShowActionMenu(ids,anchorEl){
  const ex=document.querySelector('.vid-ov-action-menu');if(ex)ex.remove();
  if(!ids.length)return;
  const menu=document.createElement('div');menu.className='vid-ov-action-menu';
  let si=0;
  const opts=['Move to Ideas','Delete'];
  const render=()=>{menu.innerHTML=opts.map((o,i)=>`<div class="vid-ov-action-item${i===si?' sel':''}" data-i="${i}">${o}</div>`).join('');};
  render();
  if(anchorEl){const r=anchorEl.getBoundingClientRect();menu.style.position='fixed';menu.style.top=(r.bottom+2)+'px';menu.style.right=(window.innerWidth-r.right)+'px';}
  else{menu.style.position='fixed';menu.style.top='50%';menu.style.left='50%';menu.style.transform='translate(-50%,-50%)';}
  document.body.appendChild(menu);
  const close=()=>{menu.remove();document.removeEventListener('keydown',hk,true);document.removeEventListener('mousedown',hc,true);};
  const exec=()=>{
    const action=si;close();
    if(action===0)_vidOvBulkDemote(ids);
    else _vidOvBulkDelete(ids);
    _vidOvSelSet.clear();_vidOvSelIdx=-1;_vidOvSelVid=null;
    if(typeof _voaSel!=='undefined'&&_voaSel.size>0){_voaSel.clear();if(typeof _voaLast!=='undefined')_voaLast=null;if(typeof _voaApplySel==='function')_voaApplySel();}
  };
  const hk=e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();si=si===0?1:0;render();return;}
    if(e.key==='Enter'){e.preventDefault();e.stopPropagation();exec();return;}
  };
  const hc=e=>{
    const item=e.target.closest('.vid-ov-action-item');
    if(item){e.preventDefault();e.stopPropagation();si=parseInt(item.dataset.i);exec();return;}
    if(!e.target.closest('.vid-ov-action-menu'))close();
  };
  document.addEventListener('keydown',hk,true);
  document.addEventListener('mousedown',hc,true);
}
function _vidOvToggleStep(vidId,step,dotEl){
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));if(!v)return;
  if(v[step]==='na')return;
  const prev=v[step];const next=prev==='done'?'not_started':'done';
  v[step]=next;
  if(next==='done'&&dotEl)_vidStepCelebrate(dotEl);
  // Sync step_upload_tableau
  const linked=step==='step_tableau_public'?'step_upload_tableau':null;
  const linkedPrev=linked?v[linked]:null;
  if(linked)v[linked]=next;
  const prevStatus=v.status;
  // Core 5 done + post_date + topic + title → published
  const coreSteps=typeof VID_STEPS_CORE!=='undefined'?VID_STEPS_CORE:['step_build','step_vo','step_cut','step_thumbnail','step_description'];
  const coreDone=coreSteps.every(s=>v[s]==='done'||v[s]==='na');
  const _tabReqOv=v.step_tableau_public&&v.step_tableau_public!=='na'&&v.step_tableau_public!=='done';
  const _needsLinkOv=_tabReqOv&&!v.youtube_url;
  if(coreDone&&next==='done'&&coreSteps.includes(step)&&(!v.post_date||_needsLinkOv)){
    // Core 5 just completed — prompt for post_date/link if missing
    const patchOv={[step]:next};if(linked)patchOv[linked]=next;
    save();_renderVidOvMenu();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    sbReqSilent('PATCH','videos',patchOv,`?id=eq.${vidId}`);
    pushUndo(()=>{v[step]=prev;if(linked)v[linked]=linkedPrev;v.status=prevStatus;save();_renderVidOvMenu();renderAll();if(document.getElementById('tbGrid'))renderDayTB();const up={[step]:prev,status:prevStatus};if(linked)up[linked]=linkedPrev;sbReqSilent('PATCH','videos',up,`?id=eq.${vidId}`);},'Toggle step');
    _vidPromptPostDate(vidId);
    return;
  }
  if(coreDone&&v.topic&&v.title&&v.post_date&&v.status!=='published'){
    v.status='published';
    const tabReq=v.step_tableau_public&&v.step_tableau_public!=='na'&&v.step_tableau_public!=='done';
    if(tabReq&&typeof _vidCreateTabUpTask==='function')_vidCreateTabUpTask(vidId,v.post_date);
  }else if(!coreDone&&v.status==='published'){
    v.status='in_progress';
    if(typeof _vidDeleteTabTask==='function')_vidDeleteTabTask(vidId);
  }
  // If tab just completed, mark tab task done + remove from day map if group complete
  if(step==='step_tableau_public'&&next==='done'&&coreDone){
    const marker='_vid:'+vidId;
    const tabTask=st.tasks.find(t=>t.notes&&t.notes.includes(marker)&&!t.done);
    if(tabTask){tabTask.done=true;sbReqSilent('PATCH','tasks',{done:true},`?id=eq.${tabTask.id}`);}
    // Keep in day map — completed videos stay visible
  }
  // Sync daymap + timeblock blocks
  const _ovM=_vidStepDayMap();const _ovK=vidId+'::'+step;
  if(next==='done'){
    if(_ovM[_ovK]){_ovM[_ovK].done=true;_vidStepDayMapSet(_ovM);}
    (st.blocks||[]).forEach(bl=>{if(String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step&&!bl._done){bl._done=true;sbUpdateBlock(bl.id,{done:true});}});
  } else {
    if(_ovM[_ovK]){_ovM[_ovK].done=false;_vidStepDayMapSet(_ovM);}
    (st.blocks||[]).forEach(bl=>{if(String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step&&bl._done){bl._done=false;sbUpdateBlock(bl.id,{done:false});}});
  }
  save();_renderVidOvMenu();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
  const patch={[step]:next,status:v.status};if(linked)patch[linked]=next;
  sbReqSilent('PATCH','videos',patch,`?id=eq.${vidId}`);
  pushUndo(()=>{
    if(v.status==='published'&&prevStatus!=='published'&&typeof _vidDeleteTabTask==='function')_vidDeleteTabTask(vidId);
    v[step]=prev;if(linked)v[linked]=linkedPrev;v.status=prevStatus;
    // Reverse daymap + block sync
    const _uM=_vidStepDayMap();const _uK=vidId+'::'+step;
    if(prev==='done'){
      if(_uM[_uK]){_uM[_uK].done=true;_vidStepDayMapSet(_uM);}
      (st.blocks||[]).forEach(bl=>{if(String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step&&!bl._done){bl._done=true;sbUpdateBlock(bl.id,{done:true});}});
    } else {
      if(_uM[_uK]){_uM[_uK].done=false;_vidStepDayMapSet(_uM);}
      (st.blocks||[]).forEach(bl=>{if(String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step&&bl._done){bl._done=false;sbUpdateBlock(bl.id,{done:false});}});
    }
    save();_renderVidOvMenu();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    const up={[step]:prev,status:prevStatus};if(linked)up[linked]=linkedPrev;
    sbReqSilent('PATCH','videos',up,`?id=eq.${vidId}`);
  },'Toggle step');
}
function _vidOvNaStep(vidId,step){
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));if(!v)return;
  const prev=v[step];const next=prev==='na'?'not_started':'na';
  v[step]=next;
  // Toggle linked step (tab/up are paired)
  const linked=step==='step_tableau_public'?'step_upload_tableau':null;
  const linkedPrev=linked?v[linked]:null;
  if(linked)v[linked]=next;
  save();_renderVidOvMenu();renderAll();
  const patch={[step]:next};if(linked)patch[linked]=next;
  sbReqSilent('PATCH','videos',patch,`?id=eq.${vidId}`);
  pushUndo(()=>{v[step]=prev;if(linked)v[linked]=linkedPrev;save();_renderVidOvMenu();renderAll();const up={[step]:prev};if(linked)up[linked]=linkedPrev;sbReqSilent('PATCH','videos',up,`?id=eq.${vidId}`);},'Toggle n/a');
}
// ── Post date helpers ────────────────────────────────────────────────────────
function _vidOvPostStr(ds){if(!ds)return'';const d=new Date(ds+'T12:00:00');return(d.getMonth()+1)+'/'+d.getDate();}
function _vidOvPostColor(){return'var(--subtle)';}
function _vidOvEditPostDate(vidId,el){
  if(el.querySelector('input'))return;
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));if(!v)return;
  const inp=document.createElement('input');inp.type='text';
  inp.placeholder='m/d';
  inp.value=v.post_date?_vidOvPostStr(v.post_date):'';
  inp.style.cssText='width:28px;font-size:9px;padding:0;border:none;border-bottom:1px solid var(--accent);border-radius:0;background:transparent;outline:none;color:var(--text);text-align:right;font-variant-numeric:tabular-nums;font-family:system-ui,-apple-system,sans-serif;box-sizing:border-box;margin:0;line-height:1';
  const origHtml=el.innerHTML;
  const _restoreHtml=(txt)=>{el.textContent=txt||'';el.style.color=v.post_date?_vidOvPostColor(v):'var(--muted)';};
  el.innerHTML='';el.appendChild(inp);inp.focus();inp.select();
  let closed=false;
  const commitSilent=()=>{
    const raw=inp.value.trim();
    const parsed=raw?_vidParseShortDate(raw):null;
    if(parsed&&parsed!==v.post_date){
      const prev=v.post_date;v.post_date=parsed;
      save();if(_vidCalOpen)_vidOvRenderCal();
      sbReqSilent('PATCH','videos',{post_date:v.post_date},`?id=eq.${vidId}`);
      pushUndo(()=>{v.post_date=prev;save();_renderVidOvMenu();renderAll();if(_vidCalOpen)_vidOvRenderCal();sbReqSilent('PATCH','videos',{post_date:prev},`?id=eq.${vidId}`);},'Set post date');
      _restoreHtml(_vidOvPostStr(parsed));
    } else {
      el.innerHTML=origHtml;
    }
  };
  const doClose=(doSave,rerender)=>{
    if(closed)return;closed=true;
    if(doSave)commitSilent();
    else el.innerHTML=origHtml;
    if(rerender){save();_renderVidOvMenu();renderAll();}
  };
  inp.addEventListener('keydown',e=>{
    e.stopPropagation();
    if(e.key==='Escape')doClose(false,false);
    if(e.key==='Enter'){e.preventDefault();doClose(true,true);}
  });
  inp.addEventListener('dblclick',e=>e.stopPropagation());
  inp.addEventListener('click',e=>e.stopPropagation());
  inp.addEventListener('blur',()=>setTimeout(()=>doClose(true,false),100));
}
function _vidParseShortDate(s){
  // Accepts: m/d, m/d/yy, m/d/yyyy, m-d, m-d-yy, m-d-yyyy
  const parts=s.split(/[\/\-\.]/);
  if(parts.length<2)return null;
  const m=parseInt(parts[0],10),d=parseInt(parts[1],10);
  if(!m||!d||m<1||m>12||d<1||d>31)return null;
  let y=new Date().getFullYear();
  if(parts.length>=3&&parts[2]){
    let yp=parseInt(parts[2],10);
    if(yp<100)yp+=2000;
    y=yp;
  }
  return`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
// ── Step celebration ─────────────────────────────────────────────────────────
function _vidStepCelebrate(dotEl){
  if(!dotEl)return;
  const r=dotEl.getBoundingClientRect();
  const cx=r.left+r.width/2,cy=r.top+r.height/2;
  const colors=['#10b981','#34d399','#6ee7b7','#fbbf24','#60a5fa','#a78bfa'];
  for(let i=0;i<8;i++){
    const p=document.createElement('div');
    p.style.cssText=`position:fixed;z-index:9999;width:5px;height:5px;border-radius:50%;pointer-events:none;background:${colors[i%colors.length]}`;
    p.style.left=cx+'px';p.style.top=cy+'px';
    document.body.appendChild(p);
    const angle=(Math.PI*2/8)*i;const dist=18+Math.random()*14;
    const dx=Math.cos(angle)*dist,dy=Math.sin(angle)*dist;
    p.animate([
      {transform:'translate(-50%,-50%) scale(1)',opacity:1},
      {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(0)`,opacity:0}
    ],{duration:450+Math.random()*200,easing:'cubic-bezier(.2,1,.3,1)',fill:'forwards'});
    setTimeout(()=>p.remove(),700);
  }
}
// ── Monthly calendar panel ───────────────────────────────────────────────────
let _vidCalOpen=false,_vidCalMonth=null,_vidCalYear=null;
function _vidOvToggleCal(){
  if(_vidCalOpen){_vidOvCloseCal();return;}
  const now=new Date();_vidCalMonth=now.getMonth();_vidCalYear=now.getFullYear();
  _vidCalOpen=true;_vidOvRenderCal();
  // Close only on clicks truly outside both panels, Escape, or M key
  setTimeout(()=>{
    const _calClose=e=>{
      if(!_vidCalOpen)return;
      if(!document.body.contains(e.target))return;
      // Don't close if clicking inside calendar, video popup, card, overlays, or context menus
      const cal=document.getElementById('vidOvCalPanel');
      const vp=document.getElementById('vidOvPanel');
      const heroCard=vp?.closest('.card');
      if(cal&&cal.contains(e.target))return;
      if(vp&&vp.contains(e.target))return;
      if(heroCard&&heroCard.contains(e.target))return;
      if(e.target.closest('.overlay'))return;
      if(e.target.closest('#vidCtxMenu'))return;
      _vidOvCloseCal();document.removeEventListener('click',_calClose);document.removeEventListener('keydown',_calKey);
    };
    const _calKey=e=>{
      if(!_vidCalOpen){document.removeEventListener('click',_calClose);document.removeEventListener('keydown',_calKey);return;}
      const _ct=document.activeElement?.tagName;
      const _typing=_ct==='INPUT'||_ct==='TEXTAREA'||_ct==='SELECT'||document.activeElement?.isContentEditable;
      if(e.key==='Escape'){_vidOvCloseCal();document.removeEventListener('click',_calClose);document.removeEventListener('keydown',_calKey);return;}
      if(_typing)return;
      if(e.key==='ArrowLeft'){e.preventDefault();_vidCalMonth--;if(_vidCalMonth<0){_vidCalMonth=11;_vidCalYear--;}_vidOvRenderCal();}
      if(e.key==='ArrowRight'){e.preventDefault();_vidCalMonth++;if(_vidCalMonth>11){_vidCalMonth=0;_vidCalYear++;}_vidOvRenderCal();}
      if(e.key==='t'||e.key==='T'){e.preventDefault();const n=new Date();_vidCalMonth=n.getMonth();_vidCalYear=n.getFullYear();_vidOvRenderCal();}
      if(e.key==='y'||e.key==='Y'){e.preventDefault();_vidCalToggleYear();}
    };
    document.addEventListener('click',_calClose);
    document.addEventListener('keydown',_calKey);
  },100);
}
function _vidOvCloseCal(){
  _vidCalOpen=false;
  _vidOvSelVid=null;
  const panel=document.getElementById('vidOvPanel');
  if(panel)panel.querySelectorAll('[data-vidrow]').forEach(r=>r.classList.remove('vid-sel'));
  const el=document.getElementById('vidOvCalPanel');
  if(el){el.style.opacity='0';el.style.transform='translateX(12px)';setTimeout(()=>el.remove(),250);}
}
function _vidCalChipColor(v,ds,today){
  const isBig=v.video_type==='B';
  const isDone=v.status==='published';
  const isPast=ds<=today;
  if(isDone||isPast){
    return isBig?{bg:'rgba(16,185,129,.15)',fg:'#059669'}:{bg:'rgba(101,163,13,.10)',fg:'#65a30d'};
  }
  return isBig?{bg:'rgba(14,100,210,.14)',fg:'#1d4ed8'}:{bg:'rgba(14,165,233,.10)',fg:'#0ea5e9'};
}
function _vidCalRenderMonth(y,m,vidsByDate,today,search){
  const first=new Date(y,m,1);
  const daysInMonth=new Date(y,m+1,0).getDate();
  const mo=first.toLocaleDateString('en-US',{month:'short'});
  const now=new Date();const isCurMonth=y===now.getFullYear()&&m===now.getMonth();
  const isNewYear=m===0;
  const accentColor=isCurMonth?'var(--accent)':'var(--text)';
  // Glass container for each month
  let html=`<div style="display:flex;align-items:stretch;margin-bottom:4px;background:rgba(255,255,255,.5);backdrop-filter:blur(8px);border:1px solid rgba(210,205,228,.15);border-radius:8px;overflow:hidden${isNewYear?';margin-top:8px':''}">`;
  // Left label: month on top, divider, year below
  html+=`<div style="width:38px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 2px;background:${isCurMonth?'rgba(249,115,22,.06)':'rgba(120,113,145,.03)'};border-right:1px solid rgba(210,205,228,.1)">`;
  html+=`<span style="font-size:10px;font-weight:700;color:${accentColor};line-height:1.1">${mo}</span>`;
  html+=`<span style="font-size:8px;font-weight:500;color:var(--muted);line-height:1;margin-top:3px">${y}</span>`;
  html+='</div>';
  // Days grid
  html+='<div style="flex:1;display:grid;grid-template-columns:repeat(5,1fr);gap:1px;min-width:0;padding:2px">';
  const firstDow=first.getDay();
  const weekdayIdx=firstDow===0?-1:firstDow===6?-1:firstDow-1;
  if(weekdayIdx>0)for(let i=0;i<weekdayIdx;i++)html+='<div></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dt=new Date(y,m,d);
    const dow=dt.getDay();
    if(dow===0||dow===6)continue;
    const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=ds===today;
    const dayVids=vidsByDate[ds]||[];
    // Filter chips if searching
    let filteredVids=dayVids;
    if(search){const q=search.toLowerCase();filteredVids=dayVids.filter(v=>(v.topic||'').toLowerCase().includes(q)||(v.title||'').toLowerCase().includes(q));}
    const singleVid=filteredVids.length===1;
    const multiVid=filteredVids.length>1;
    html+=`<div class="vid-cal-day${isToday?' vid-cal-today':''}" data-caldate="${ds}" ondragover="event.preventDefault();this.classList.add('vid-cal-drop')" ondragleave="this.classList.remove('vid-cal-drop')" ondrop="_vidCalDrop(event,'${ds}')" style="padding:2px 4px;min-height:20px;overflow:hidden;display:flex;align-items:center;gap:3px${multiVid?';flex-wrap:wrap':''}">`;
    html+=`<span style="font-size:7px;font-weight:${isToday?'700':'500'};color:${isToday?'#f97316':'var(--subtle)'};line-height:1;flex-shrink:0;width:12px;text-align:right;font-family:'SF Mono',ui-monospace,monospace">${d}</span>`;
    filteredVids.forEach(v=>{
      const {bg,fg}=_vidCalChipColor(v,ds,today);
      const sid=String(v.id);
      html+=`<div draggable="true" ondragstart="event.dataTransfer.effectAllowed='move';_vidCalDragId='${sid}'" onclick="event.stopPropagation();_vidCalSelectChip('${sid}')" ondblclick="event.stopPropagation();event.preventDefault();if(typeof openVidEdit==='function')openVidEdit('${sid}')" class="vid-cal-chip" style="background:${bg};color:${fg};border-left:2px solid ${fg};flex:1;min-width:0${multiVid?';width:calc(100% - 13px)':''}" title="${escHtml(v.topic||v.title)}">${escHtml(v.topic||v.title)}</div>`;
    });
    html+='</div>';
  }
  html+='</div></div>';
  return html;
}
function _vidCalSelectChip(vidId){
  _vidOvSelVid=vidId;
  // Highlight in video popup
  const panel=document.getElementById('vidOvPanel');
  if(panel){
    panel.querySelectorAll('[data-vidrow]').forEach(r=>{r.classList.remove('vid-sel');});
    const row=panel.querySelector(`[data-vidrow="${vidId}"]`);
    if(row){row.classList.add('vid-sel');row.scrollIntoView({block:'nearest'});}
  }
  // Highlight in calendar
  _vidCalHighlightChip(vidId);
}
function _vidCalHighlightChip(vidId){
  const cal=document.getElementById('vidOvCalPanel');
  if(!cal)return;
  cal.querySelectorAll('.vid-cal-chip').forEach(c=>c.style.outline='');
  if(!vidId)return;
  cal.querySelectorAll('.vid-cal-chip').forEach(c=>{
    const oc=c.getAttribute('onclick')||'';
    if(oc.includes("'"+vidId+"'"))c.style.outline='1.5px solid rgba(14,165,233,.5)';
  });
}
// Yearly heatmap view
let _vidCalYearView=false;
function _vidCalToggleYear(){
  _vidCalYearView=!_vidCalYearView;
  _vidOvRenderCal();
}
function _vidCalClearSearch(){window._vidCalSearch='';const si=document.getElementById('vidCalSearchInput');if(si)si.value='';_vidOvRenderCal();}
function _vidCalRenderYearView(allVids,today){
  const byYM={};
  allVids.forEach(v=>{
    const ym=v.post_date.slice(0,7);
    if(!byYM[ym])byYM[ym]=[];
    byYM[ym].push(v);
  });
  const now=new Date();
  const pastYears=[...new Set(allVids.map(v=>v.post_date.slice(0,4)))].sort();
  // Always include current year + next year
  const futureYrs=[String(now.getFullYear()),String(now.getFullYear()+1)];
  const years=[...new Set([...pastYears,...futureYrs])].sort();
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const maxCount=Math.max(...Object.values(byYM).map(a=>a.length),1);
  let h='<div style="display:flex;gap:10px;padding:8px 12px;flex:1;overflow-y:auto;overflow-x:auto">';
  years.forEach(yr=>{
    h+=`<div style="flex:1;min-width:90px">`;
    h+=`<div style="font-size:11px;font-weight:700;color:var(--text);text-align:center;margin-bottom:6px">${yr}</div>`;
    let yrTotal=0;
    months.forEach((mo,mi)=>{
      const key=`${yr}-${String(mi+1).padStart(2,'0')}`;
      const vids=byYM[key]||[];
      yrTotal+=vids.length;
      const intensity=vids.length?Math.max(0.08,vids.length/maxCount*0.55):0;
      const big=vids.filter(v=>v.video_type==='B').length;
      const small=vids.length-big;
      const isFuture=parseInt(yr)>now.getFullYear()||(parseInt(yr)===now.getFullYear()&&mi>now.getMonth());
      const isCurMonth=parseInt(yr)===now.getFullYear()&&mi===now.getMonth();
      h+=`<div style="display:flex;align-items:center;gap:3px;padding:2px 4px;margin:1px 0;border-radius:3px;background:${vids.length?`rgba(14,165,233,${intensity})`:'transparent'};${isCurMonth?'border:1px solid rgba(249,115,22,.25)':'border:1px solid transparent'}" title="${mo} ${yr}: ${vids.length} videos (${big}B, ${small}L)">`;
      h+=`<span style="font-size:8px;color:${isCurMonth?'#f97316':'var(--muted)'};width:20px;flex-shrink:0;font-weight:${isCurMonth?'700':'400'}">${mo}</span>`;
      h+=`<div style="flex:1;height:10px;background:rgba(120,113,145,.06);border-radius:2px;overflow:hidden;display:flex">`;
      if(big)h+=`<div style="width:${big/maxCount*100}%;height:100%;background:#1d4ed8;border-radius:2px 0 0 2px"></div>`;
      if(small)h+=`<div style="width:${small/maxCount*100}%;height:100%;background:#0ea5e9;${big?'':'border-radius:2px 0 0 2px'}"></div>`;
      h+=`</div>`;
      h+=`<span style="font-size:8px;font-weight:600;color:${isFuture?'var(--subtle)':'var(--text)'};width:12px;text-align:right;flex-shrink:0">${vids.length||''}</span>`;
      h+='</div>';
    });
    h+=`<div style="text-align:center;font-size:9px;font-weight:700;color:var(--text);margin-top:4px;padding-top:4px;border-top:1px solid var(--border)">${yrTotal}</div>`;
    h+='</div>';
  });
  h+='</div>';
  return h;
}
function _vidOvRenderCal(){
  let panel=document.getElementById('vidOvCalPanel');
  if(!panel){
    panel=document.createElement('div');panel.id='vidOvCalPanel';
    const card=document.getElementById('vidOvPanel')?.closest('.card');
    const rightPanel=document.querySelector('.row1-right-panel');
    if(card){
      const cr=card.getBoundingClientRect();
      const rr=rightPanel?rightPanel.getBoundingClientRect():{left:cr.right+10,width:700,top:cr.top,height:cr.height};
      panel.style.cssText=`position:fixed;top:${cr.top}px;left:${rr.left}px;width:${rr.width}px;height:${cr.height}px;z-index:200;background:rgba(255,255,255,.98);backdrop-filter:blur(12px);border:1px solid rgba(210,205,228,.18);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);overflow:hidden;display:flex;flex-direction:column;opacity:0;transform:translateX(12px);transition:opacity .25s ease,transform .25s ease`;
    }else{
      panel.style.cssText='position:fixed;top:60px;right:20px;width:700px;bottom:20px;z-index:200;background:rgba(255,255,255,.98);backdrop-filter:blur(12px);border:1px solid rgba(210,205,228,.18);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);overflow:hidden;display:flex;flex-direction:column;opacity:0;transform:translateX(12px);transition:opacity .25s ease,transform .25s ease';
    }
    document.body.appendChild(panel);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{panel.style.opacity='1';panel.style.transform='translateX(0)';}));
  }
  const today=d2s(new Date());
  const allVids=(st.videos||[]).filter(v=>!v.is_deleted&&v.post_date);
  const vidsByDate={};
  allVids.forEach(v=>{const d=v.post_date;if(!vidsByDate[d])vidsByDate[d]=[];vidsByDate[d].push(v);});
  // Find earliest post date for scroll range
  const dates=allVids.map(v=>v.post_date).sort();
  const earliest=dates.length?dates[0]:today;
  const startY=parseInt(earliest.slice(0,4));
  const startM=parseInt(earliest.slice(5,7))-1;
  const now=new Date();
  // Extend to end of next year for future planning
  const endY=now.getFullYear()+1;const endM=11;
  const totalMonths=((endY*12+endM)-(startY*12+startM))+1;
  const _search=window._vidCalSearch||'';
  // Header
  const _ib='background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;width:20px;height:20px;flex-shrink:0';
  let html=`<div class="tod-tb-header" style="position:relative">
    <button onclick="_vidCalMonth--;if(_vidCalMonth<0){_vidCalMonth=11;_vidCalYear--};_vidOvRenderCal()" style="${_ib};color:var(--muted)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
    <button onclick="_vidCalToggleYear()" style="${_ib};color:${_vidCalYearView?'var(--accent)':'var(--muted)'}" title="Yearly overview (Y)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
    <span style="flex:1;text-align:center;font-size:12px;font-weight:700;color:var(--text);letter-spacing:-.1px">Schedule</span>
    <div style="position:relative;flex-shrink:0;display:flex;align-items:center"><input id="vidCalSearchInput" type="text" autocomplete="off" placeholder="Search..." value="${_search.replace(/"/g,'&quot;')}" oninput="window._vidCalSearch=this.value;_vidOvRenderCal()" onkeydown="event.stopPropagation();if(event.key==='Escape'){window._vidCalSearch='';this.value='';_vidOvRenderCal();}" style="padding:3px 8px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:10px;background:var(--bg);color:var(--text);outline:none;width:100px">${_search?'<button onclick="_vidCalClearSearch()" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:9px;color:var(--muted);padding:0">\u2715</button>':''}</div>
    <button onclick="var n=new Date();_vidCalMonth=n.getMonth();_vidCalYear=n.getFullYear();_vidOvRenderCal()" style="${_ib};font-size:9px;font-weight:600;color:var(--muted);width:auto;padding:0 4px" title="Back to today (T)">Today</button>
    <button onclick="_vidCalMonth++;if(_vidCalMonth>11){_vidCalMonth=0;_vidCalYear++};_vidOvRenderCal()" style="${_ib};color:var(--muted)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
  </div>`;
  if(_vidCalYearView){
    html+=_vidCalRenderYearView(allVids,today);
    panel.innerHTML=html;
    return;
  }
  // Fixed weekday row with left label spacer
  html+='<div style="display:flex;flex-shrink:0;padding:2px 10px 0"><div style="width:38px;flex-shrink:0"></div><div style="flex:1;display:grid;grid-template-columns:repeat(5,1fr);gap:1px;padding:0 2px">';
  ['Mon','Tue','Wed','Thu','Fri'].forEach(d=>{html+=`<div style="font-size:8px;font-weight:600;color:var(--muted);text-align:center;padding:1px 0">${d}</div>`;});
  html+='</div></div>';
  // Months in scrollable container from earliest to future
  html+='<div id="vidCalScroll" style="flex:1;overflow-y:auto;padding:2px 10px 6px" ondragover="event.preventDefault()">';
  for(let i=0;i<totalMonths;i++){
    let cm=startM+i,cy=startY;
    while(cm>11){cm-=12;cy++;}
    html+=_vidCalRenderMonth(cy,cm,vidsByDate,today,_search);
  }
  html+='</div>';
  panel.innerHTML=html;
  const scrollEl=document.getElementById('vidCalScroll');
  if(scrollEl&&!scrollEl._whlBound){
    scrollEl._whlBound=true;
    scrollEl.addEventListener('wheel',e=>{e.stopPropagation();},{passive:true});
  }
  // Scroll to current month at top
  if(scrollEl&&!_search){
    const curMonthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    // Find first day cell of current month
    const firstCell=scrollEl.querySelector(`[data-caldate^="${curMonthKey}"]`);
    if(firstCell){
      const monthContainer=firstCell.closest('[style*="display:flex;align-items:stretch"]');
      if(monthContainer)monthContainer.scrollIntoView({block:'start',behavior:'instant'});
      else firstCell.scrollIntoView({block:'start',behavior:'instant'});
    }
  }
  // Refocus search input if was searching
  if(_search){const si=document.getElementById('vidCalSearchInput');if(si){si.focus();si.setSelectionRange(si.value.length,si.value.length);}}
}
// ── Focus this week toggle ───────────────────────────────────────────────────
function _vidOvToggleFocusWk(){
  window._vidOvFocusWk=!window._vidOvFocusWk;
  localStorage._vidOvFocusWk=window._vidOvFocusWk?'1':'';
  _renderVidOvMenu();
}
// ── All Videos panel (In Progress + Ideas) ──────────────────────────────────
let _vidOvAllOpen=false;
let _voaSel=new Set(),_voaLast=null,_voaCopied=[];
function _voaGetRows(){const p=document.getElementById('vidOvAllPanel');return p?[...p.querySelectorAll('[data-alldrag]')]:[]}
function _voaApplySel(){_voaGetRows().forEach(r=>{r.classList.toggle('vid-sel',_voaSel.has(r.dataset.alldrag));});}
function _voaRowClick(e,sid){
  if(e.target.closest('.vid-step-dot')||e.target.closest('button'))return;
  if(e.metaKey||e.ctrlKey){if(_voaSel.has(sid))_voaSel.delete(sid);else _voaSel.add(sid);}
  else if(e.shiftKey&&_voaLast){const rows=_voaGetRows().map(r=>r.dataset.alldrag);const a=rows.indexOf(_voaLast),b=rows.indexOf(sid);if(a>-1&&b>-1){const[lo,hi]=[Math.min(a,b),Math.max(a,b)];for(let i=lo;i<=hi;i++)_voaSel.add(rows[i]);}}
  else{if(_voaSel.size===1&&_voaSel.has(sid))_voaSel.clear();else{_voaSel.clear();_voaSel.add(sid);}}
  _voaLast=sid;_voaApplySel();
}
function _vidOvToggleAll(){
  if(_vidOvAllOpen){_vidOvCloseAll();return;}
  if(_vidCalOpen)_vidOvCloseCal();
  if(_vidOvAnOpen)_vidOvCloseAnalytics();
  _vidOvAllOpen=true;_voaSel.clear();_voaLast=null;_vidOvRenderAll();
  setTimeout(()=>{
    const _allClose=e=>{
      const p=document.getElementById('vidOvAllPanel');const vp=document.getElementById('vidOvPanel');
      if(!p||!_vidOvAllOpen)return;
      if(!document.body.contains(e.target))return;
      const vm=document.getElementById('vidModal');const ctx=document.getElementById('vidCtxMenu');
      if(vm&&vm.classList.contains('open')&&vm.contains(e.target))return;
      if(ctx&&ctx.contains(e.target))return;
      if(e.type==='click'&&!p.contains(e.target)&&(!vp||!vp.contains(e.target))){_vidOvCloseAll();document.removeEventListener('click',_allClose);document.removeEventListener('keydown',_allKey);}
    };
    const _allKey=e=>{
      if(!_vidOvAllOpen){document.removeEventListener('click',_allClose);document.removeEventListener('keydown',_allKey);return;}
      const vm=document.getElementById('vidModal');
      if(vm&&vm.classList.contains('open'))return;
      const _ct=document.activeElement?.tagName;
      const _typing=_ct==='INPUT'||_ct==='TEXTAREA'||_ct==='SELECT'||document.activeElement?.isContentEditable;
      if(_typing)return;
      if(e.key==='Escape'){if(_voaSel.size){_voaSel.clear();_voaApplySel();e.preventDefault();return;}_vidOvCloseAll();document.removeEventListener('click',_allClose);document.removeEventListener('keydown',_allKey);return;}
      if(e.key==='n'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();if(typeof openVidModal==='function')openVidModal();return;}
      // Delete/Backspace — delete selected
      if((e.key==='Delete'||e.key==='Backspace')&&_voaSel.size>0){e.preventDefault();const ids=[..._voaSel];const row=document.querySelector('[data-alldrag].vid-sel');_vidOvShowActionMenu(ids,row||null);return;}
      // Cmd+C — copy
      if((e.metaKey||e.ctrlKey)&&e.key==='c'&&_voaSel.size>0){e.preventDefault();_voaCopied=[];_voaSel.forEach(id=>{const v=(st.videos||[]).find(x=>String(x.id)===id);if(v)_voaCopied.push({...v});});if(typeof showToast==='function')showToast('Copied '+_voaCopied.length+' video(s)','#0ea5e9',1500);return;}
      // Cmd+V — paste
      if((e.metaKey||e.ctrlKey)&&e.key==='v'&&_voaCopied.length>0){e.preventDefault();_voaCopied.forEach(v=>{if(typeof _vidDuplicate==='function')_vidDuplicate(v.id);});setTimeout(()=>{_vidOvRenderAll();_renderVidOvMenu();},50);return;}
      const rows=_voaGetRows().map(r=>r.dataset.alldrag);
      // Arrow Up/Down — navigate selection
      if(e.key==='ArrowUp'||e.key==='ArrowDown'){
        const dir=e.key==='ArrowUp'?-1:1;
        // Cmd+Up/Down — reorder within status
        if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&_voaSel.size>0){
          e.preventDefault();
          const selIds=[..._voaSel];
          const groups={};
          selIds.forEach(sid=>{const v=(st.videos||[]).find(x=>String(x.id)===sid);if(!v)return;const key=v.status+'|'+v.video_type;if(!groups[key])groups[key]=[];groups[key].push(v);});
          Object.values(groups).forEach(selVids=>{
            const sample=selVids[0];
            const siblings=(st.videos||[]).filter(x=>!x.is_deleted&&x.status===sample.status&&x.video_type===sample.video_type).sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
            siblings.forEach((s,i)=>{if(s.vid_order==null)s.vid_order=i;});
            const selSet=new Set(selVids.map(v=>String(v.id)));
            const selIdxs=siblings.map((s,i)=>selSet.has(String(s.id))?i:-1).filter(i=>i>=0).sort((a,b)=>a-b);
            if(!selIdxs.length)return;
            if(dir===-1&&selIdxs[0]===0)return;
            if(dir===1&&selIdxs[selIdxs.length-1]===siblings.length-1)return;
            if(dir===-1){const above=siblings[selIdxs[0]-1];selIdxs.forEach(i=>{siblings[i].vid_order--;});above.vid_order=siblings[selIdxs[selIdxs.length-1]].vid_order+1;}
            else{const below=siblings[selIdxs[selIdxs.length-1]+1];selIdxs.forEach(i=>{siblings[i].vid_order++;});below.vid_order=siblings[selIdxs[0]].vid_order-1;}
            siblings.forEach(s=>sbReqSilent('PATCH','videos',{vid_order:s.vid_order},`?id=eq.${s.id}`));
          });
          save();_vidOvRenderAll();_renderVidOvMenu();return;
        }
        // Shift+Up/Down — extend selection
        if(e.shiftKey&&!e.metaKey&&!e.ctrlKey){
          e.preventDefault();if(!rows.length)return;
          if(!_voaSel.size){const id=dir===-1?rows[rows.length-1]:rows[0];_voaSel.add(id);_voaLast=id;}
          else{const li=rows.indexOf(_voaLast);if(li===-1)return;const ni=li+dir;if(ni<0||ni>=rows.length)return;_voaSel.add(rows[ni]);_voaLast=rows[ni];}
          _voaApplySel();const sr=document.querySelector('[data-alldrag="'+_voaLast+'"]');if(sr)sr.scrollIntoView({block:'nearest'});return;
        }
        // Plain Up/Down — single navigate
        if(!e.metaKey&&!e.ctrlKey&&!e.shiftKey){
          e.preventDefault();if(!rows.length)return;
          if(!_voaSel.size){const id=dir===-1?rows[rows.length-1]:rows[0];_voaSel.clear();_voaSel.add(id);_voaLast=id;}
          else{const li=rows.indexOf(_voaLast);if(li===-1)return;const ni=li+dir;if(ni<0||ni>=rows.length)return;_voaSel.clear();_voaSel.add(rows[ni]);_voaLast=rows[ni];}
          _voaApplySel();const sr=document.querySelector('[data-alldrag="'+_voaLast+'"]');if(sr)sr.scrollIntoView({block:'nearest'});return;
        }
      }
      // Arrow Left/Right — move between statuses (idea ↔ in_progress ↔ up_next)
      // Works with toolbox selection OR video popup selection
      const _selIds=_voaSel.size>0?[..._voaSel]:(_vidOvSelVid?[_vidOvSelVid]:[]);
      if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&_selIds.length>0){
        e.preventDefault();
        const isRight=e.key==='ArrowRight';
        // Right: up_next→in_progress→idea, Left: idea→in_progress→up_next
        const statusMap=isRight?{up_next:'in_progress',in_progress:'idea'}:{idea:'in_progress',in_progress:'up_next'};
        const allIds=_selIds;
        const vids=allIds.map(id=>(st.videos||[]).find(x=>String(x.id)===id)).filter(Boolean);
        const toMove=vids.filter(v=>statusMap[v.status]);
        if(!toMove.length)return;
        const undos=toMove.map(v=>({id:v.id,prev:v.status,prevBig:v.big_video_id}));
        toMove.forEach(v=>{v.status=statusMap[v.status];});
        // When moving to idea, clear big_video_id for L videos
        toMove.forEach(v=>{if(v.video_type!=='B'&&v.status==='idea'&&v.big_video_id){v.big_video_id=null;}});
        // Move children of B videos
        const childUndos=[];
        toMove.filter(v=>v.video_type==='B').forEach(v=>{
          (st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(v.id)&&!_voaSel.has(String(c.id))).forEach(c=>{
            const ns=statusMap[c.status];if(ns){childUndos.push({id:c.id,prev:c.status,prevBig:c.big_video_id});c.status=ns;if(ns==='idea'){c.big_video_id=null;}}
          });
        });
        // Clear selections after move
        if(_voaSel.size===0&&_vidOvSelVid){_vidOvSelVid=null;_vidOvSelIdx=-1;}
        save();_vidOvRenderAll();_renderVidOvMenu();renderAll();
        pushUndo(()=>{[...undos,...childUndos].forEach(u=>{const v2=(st.videos||[]).find(x=>String(x.id)===u.id);if(v2){v2.status=u.prev;v2.big_video_id=u.prevBig;}});save();_vidOvRenderAll();_renderVidOvMenu();renderAll();[...undos,...childUndos].forEach(u=>sbReqSilent('PATCH','videos',{status:u.prev,big_video_id:u.prevBig??null},`?id=eq.${u.id}`));},'Move status');
        (async()=>{for(const v of toMove)await sbReqSilent('PATCH','videos',{status:v.status,big_video_id:v.big_video_id??null},`?id=eq.${v.id}`);for(const cm of childUndos){const c=(st.videos||[]).find(x=>String(x.id)===cm.id);if(c)await sbReqSilent('PATCH','videos',{status:c.status,big_video_id:c.big_video_id??null},`?id=eq.${c.id}`);}})();
        return;
      }
      // Enter — edit selected
      if(e.key==='Enter'&&_voaSel.size===1){e.preventDefault();const sid=[..._voaSel][0];if(typeof openVidEdit==='function')openVidEdit(sid);return;}
    };
    document.addEventListener('click',_allClose);
    document.addEventListener('keydown',_allKey);
  },100);
}
function _vidOvCloseAll(){
  _vidOvAllOpen=false;_voaSel.clear();_voaLast=null;
  const el=document.getElementById('vidOvAllPanel');
  if(el){el.style.opacity='0';el.style.transform='translateX(12px)';setTimeout(()=>el.remove(),250);}
}
function _vidOvAllProgRow(v,steps){
  const sid=String(v.id);
  const _hovBg=typeof _dk==='function'&&_dk()?'rgba(255,255,255,.04)':'rgba(0,0,0,.04)';
  const _sel=_voaSel.has(sid);
  const _addBtn=v.video_type==='B'?`<button onclick="event.stopPropagation();_vidOvInlineAdd('${sid}',null,null,this.closest('[data-alldrag]'))" style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:14px;text-align:center;border-radius:3px;border:1px solid var(--border);background:var(--bg);color:var(--muted);cursor:pointer;padding:0;flex-shrink:0;box-sizing:border-box" title="Add small video">+</button>`:'';
  let html=`<div data-alldrag="${sid}" draggable="true" ondragstart="dragId='vid::${sid}';event.dataTransfer.effectAllowed='move'" onclick="_voaRowClick(event,'${sid}')" ondblclick="if(typeof openVidEdit==='function')openVidEdit('${sid}')" oncontextmenu="if(typeof showVidCtx==='function')showVidCtx(event,'${sid}')" class="${_sel?'vid-sel':''}" style="padding:4px 6px;border-radius:6px;font-size:12px;font-weight:600;color:var(--text);cursor:grab;display:flex;align-items:center;gap:5px" onmouseenter="if(!this.classList.contains('vid-sel'))this.style.background='${_hovBg}'" onmouseleave="if(!this.classList.contains('vid-sel'))this.style.background=''">${_addBtn}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(v.topic||v.title)}</span><div style="display:flex;gap:0;flex-shrink:0;align-items:center">${_vidOvStepDots(v,steps)}<span style="font-size:9px;opacity:.5;width:30px;text-align:right;flex-shrink:0;margin-left:2px">${_vidOvPct(v,steps)?_vidOvPct(v,steps)+'%':''}</span></div></div>`;
  // Show children (small videos) with └ lines
  if(v.video_type==='B'){
    const children=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===sid&&(c.status==='in_progress'||c.status==='up_next')&&c.status===v.status).sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
    children.forEach(c=>{
      const csid=String(c.id);
      const _csel=_voaSel.has(csid);
      html+=`<div data-alldrag="${csid}" draggable="true" ondragstart="dragId='vid::${csid}';event.dataTransfer.effectAllowed='move'" onclick="_voaRowClick(event,'${csid}')" ondblclick="if(typeof openVidEdit==='function')openVidEdit('${csid}')" oncontextmenu="if(typeof showVidCtx==='function')showVidCtx(event,'${csid}')" class="${_csel?'vid-sel':''}" style="padding:3px 6px 3px 10px;border-radius:6px;font-size:11px;font-weight:500;color:var(--muted);cursor:grab;display:flex;align-items:center;gap:5px" onmouseenter="if(!this.classList.contains('vid-sel'))this.style.background='${_hovBg}'" onmouseleave="if(!this.classList.contains('vid-sel'))this.style.background=''"><span style="color:rgba(140,135,160,.4);font-size:10px;width:16px;flex-shrink:0;text-align:center">└</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.topic||c.title)}</span><div style="display:flex;gap:0;flex-shrink:0;align-items:center">${_vidOvStepDots(c,steps)}<span style="font-size:8px;opacity:.4;width:30px;text-align:right;flex-shrink:0;margin-left:2px">${_vidOvPct(c,steps)?_vidOvPct(c,steps)+'%':''}</span></div></div>`;
    });
  }
  return html;
}
function _vidOvAllIdeaRow(v){
  const sid=String(v.id);
  const _hovBg=typeof _dk==='function'&&_dk()?'rgba(255,255,255,.04)':'rgba(0,0,0,.04)';
  const _sel=_voaSel.has(sid);
  return`<div data-alldrag="${sid}" draggable="true" ondragstart="dragId='vid::${sid}';event.dataTransfer.effectAllowed='move'" onclick="_voaRowClick(event,'${sid}')" ondblclick="if(typeof openVidEdit==='function')openVidEdit('${sid}')" oncontextmenu="if(typeof showVidCtx==='function')showVidCtx(event,'${sid}')" class="${_sel?'vid-sel':''}" style="padding:4px 8px;border-radius:6px;font-size:11px;font-weight:500;color:var(--text);cursor:grab" onmouseenter="if(!this.classList.contains('vid-sel'))this.style.background='${_hovBg}'" onmouseleave="if(!this.classList.contains('vid-sel'))this.style.background=''"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block">${escHtml(v.topic||v.title)}</span></div>`;
}
function _vidOvRenderAll(){
  let panel=document.getElementById('vidOvAllPanel');
  if(!panel){
    panel=document.createElement('div');panel.id='vidOvAllPanel';
    const card=document.getElementById('vidOvPanel')?.closest('.card');
    const rightPanel=document.querySelector('.row1-right-panel');
    if(card){
      const cr=card.getBoundingClientRect();
      const rr=rightPanel?rightPanel.getBoundingClientRect():{left:cr.right+10,width:700,top:cr.top,height:cr.height};
      panel.style.cssText=`position:fixed;top:${cr.top}px;left:${rr.left}px;width:${rr.width}px;height:${cr.height}px;z-index:200;background:rgba(255,255,255,.98);backdrop-filter:blur(12px);border:1px solid rgba(210,205,228,.18);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);overflow:hidden;display:flex;flex-direction:column;opacity:0;transform:translateX(12px);transition:opacity .25s ease,transform .25s ease`;
    }else{
      panel.style.cssText='position:fixed;top:60px;right:20px;width:700px;bottom:20px;z-index:200;background:rgba(255,255,255,.98);backdrop-filter:blur(12px);border:1px solid rgba(210,205,228,.18);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);overflow:hidden;display:flex;flex-direction:column;opacity:0;transform:translateX(12px);transition:opacity .25s ease,transform .25s ease';
    }
    document.body.appendChild(panel);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{panel.style.opacity='1';panel.style.transform='translateX(0)';}));
  }
  const all=(st.videos||[]).filter(v=>!v.is_deleted);
  const steps=typeof VID_STEPS_CORE!=='undefined'?VID_STEPS_CORE:(typeof VID_STEPS!=='undefined'?VID_STEPS:[]);
  // In Progress — top-level B + standalone L (children shown under parent)
  const inProgAll=all.filter(v=>v.status==='in_progress').sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
  const inProg=inProgAll.filter(v=>v.video_type==='B'||!v.big_video_id||!inProgAll.find(p=>String(p.id)===String(v.big_video_id)));
  const bigIdeas=all.filter(v=>v.status==='idea'&&v.video_type==='B').sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
  const littleIdeas=all.filter(v=>v.status==='idea'&&v.video_type!=='B').sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
  // 2-column layout: In Progress | Ideas
  let h=`<div onclick="if(!event.target.closest('[data-alldrag]')&&!event.target.closest('button')){_voaSel.clear();_voaLast=null;_voaApplySel()}" style="display:grid;grid-template-columns:1.5fr 1fr;grid-template-rows:auto 1fr;position:absolute;top:0;left:0;right:0;bottom:0">`;
  // Column headers
  h+=`<div class="tod-tb-header" style="grid-column:1;grid-row:1;border-right:1px solid var(--border);justify-content:flex-start;padding-left:14px"><span style="font-size:9px;font-weight:600;color:#d97706;letter-spacing:.03em">In Progress</span></div>`;
  h+=`<div class="tod-tb-header" style="grid-column:2;grid-row:1;justify-content:flex-start;padding-left:14px;display:flex;align-items:center;gap:6px"><span style="font-size:9px;font-weight:600;color:var(--muted);letter-spacing:.03em;flex:1">Ideas</span><button onclick="event.stopPropagation();if(typeof openVidModal==='function')openVidModal()" style="font-size:10px;font-weight:700;width:18px;height:18px;line-height:16px;text-align:center;border-radius:4px;border:1px solid var(--border);background:var(--bg);color:var(--muted);cursor:pointer;padding:0;flex-shrink:0" title="Add idea (N)">+</button></div>`;
  // In Progress column
  h+=`<div style="grid-column:1;grid-row:2;min-height:0;overflow-y:auto;border-right:1px solid var(--border);padding:4px" ondragover="event.preventDefault();this.style.background='rgba(245,158,11,.03)'" ondragleave="this.style.background=''" ondrop="this.style.background='';_vidOvAllDrop(event,'in_progress')">`;
  if(inProg.length){inProg.forEach(v=>{h+=_vidOvAllProgRow(v,steps);});}
  else h+='<div style="color:var(--muted);font-size:11px;padding:12px 10px;opacity:.5">Drag ideas here to start</div>';
  h+='</div>';
  // Ideas column — matching videos page style
  h+=`<div style="grid-column:2;grid-row:2;min-height:0;overflow-y:auto" ondragover="event.preventDefault();this.style.background='rgba(139,92,246,.03)'" ondragleave="this.style.background=''" ondrop="this.style.background='';_vidOvAllDrop(event,'idea')">`;
  if(bigIdeas.length||littleIdeas.length){
    h+=`<div style="font-size:9px;font-weight:600;color:var(--muted);padding:6px 6px 6px 14px;letter-spacing:.03em">Big</div>`;
    if(bigIdeas.length)bigIdeas.forEach(v=>{h+=_vidOvAllIdeaRow(v);});
    else h+='<div style="color:var(--muted);font-size:10px;padding:4px 14px;opacity:.5">None</div>';
    h+=`<div style="font-size:9px;font-weight:600;color:var(--muted);padding:6px 6px 6px 14px;letter-spacing:.03em;border-top:1px solid rgba(210,205,228,.15);margin-top:4px">Little</div>`;
    if(littleIdeas.length)littleIdeas.forEach(v=>{h+=_vidOvAllIdeaRow(v);});
    else h+='<div style="color:var(--muted);font-size:10px;padding:4px 14px;opacity:.5">None</div>';
  }else{
    h+='<div style="color:var(--muted);font-size:11px;padding:12px 14px;opacity:.5">No ideas yet</div>';
  }
  h+='</div></div>';
  panel.innerHTML=h;
}
function _vidOvAllDrop(event,newStatus){
  event.preventDefault();
  const vidId=(typeof dragId==='string'&&dragId.startsWith('vid::'))?dragId.replace('vid::',''):null;
  if(!vidId)return;
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));if(!v)return;
  const prev=v.status;
  v.status=newStatus;
  // Promote/demote children when moving a B video
  const childUndos=[];
  if(v.video_type==='B'){
    (st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(vidId)&&c.status!=='published').forEach(c=>{
      const cp=c.status;c.status=newStatus;
      childUndos.push({id:c.id,prev:cp});
      sbReqSilent('PATCH','videos',{status:newStatus},`?id=eq.${c.id}`);
    });
  }
  save();_vidOvRenderAll();_renderVidOvMenu();renderAll();
  sbReqSilent('PATCH','videos',{status:newStatus},`?id=eq.${v.id}`);
  pushUndo(()=>{v.status=prev;childUndos.forEach(cu=>{const c=(st.videos||[]).find(x=>String(x.id)===String(cu.id));if(c){c.status=cu.prev;sbReqSilent('PATCH','videos',{status:cu.prev},`?id=eq.${cu.id}`);}});save();_vidOvRenderAll();_renderVidOvMenu();renderAll();sbReqSilent('PATCH','videos',{status:prev},`?id=eq.${v.id}`);},'Changed video status');
}
function _vidOvUpNextDrop(event){
  event.preventDefault();
  const vidId=(typeof dragId==='string'&&dragId.startsWith('vid::'))?dragId.replace('vid::',''):null;
  if(!vidId)return;
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));if(!v)return;
  if(v.status==='up_next')return;
  const prev=v.status;
  v.status='up_next';
  const childUndos=[];
  if(v.video_type==='B'){
    (st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(vidId)&&c.status!=='published').forEach(c=>{
      childUndos.push({id:c.id,prev:c.status});c.status='up_next';
      sbReqSilent('PATCH','videos',{status:'up_next'},`?id=eq.${c.id}`);
    });
  }
  save();if(_vidOvAllOpen)_vidOvRenderAll();_renderVidOvMenu();renderAll();
  sbReqSilent('PATCH','videos',{status:'up_next'},`?id=eq.${v.id}`);
  pushUndo(()=>{v.status=prev;childUndos.forEach(cu=>{const c=(st.videos||[]).find(x=>String(x.id)===String(cu.id));if(c){c.status=cu.prev;sbReqSilent('PATCH','videos',{status:cu.prev},`?id=eq.${cu.id}`);}});save();if(_vidOvAllOpen)_vidOvRenderAll();_renderVidOvMenu();renderAll();sbReqSilent('PATCH','videos',{status:prev},`?id=eq.${v.id}`);},'Moved to up next');
}
// ── Analytics panel ─────────────────────────────────────────────────────────
let _vidOvAnOpen=false;
function _vidOvToggleAnalytics(){
  if(_vidOvAnOpen){_vidOvCloseAnalytics();return;}
  if(_vidCalOpen)_vidOvCloseCal();
  if(_vidOvAllOpen)_vidOvCloseAll();
  _vidOvAnOpen=true;_vidOvRenderAnalyticsPanel();
  setTimeout(()=>{
    const _anClose=e=>{
      const p=document.getElementById('vidOvAnPanel');const vp=document.getElementById('vidOvPanel');
      if(!p||!_vidOvAnOpen)return;
      if(!document.body.contains(e.target))return;
      if(e.type==='click'&&!p.contains(e.target)&&(!vp||!vp.contains(e.target))){_vidOvCloseAnalytics();document.removeEventListener('click',_anClose);document.removeEventListener('keydown',_anKey);}
    };
    const _anKey=e=>{
      if(!_vidOvAnOpen){document.removeEventListener('click',_anClose);document.removeEventListener('keydown',_anKey);return;}
      if(e.key==='Escape'){_vidOvCloseAnalytics();document.removeEventListener('click',_anClose);document.removeEventListener('keydown',_anKey);}
    };
    document.addEventListener('click',_anClose);
    document.addEventListener('keydown',_anKey);
  },100);
}
function _vidOvCloseAnalytics(){
  _vidOvAnOpen=false;
  const el=document.getElementById('vidOvAnPanel');
  if(el){el.style.opacity='0';el.style.transform='translateX(12px)';setTimeout(()=>el.remove(),250);}
}
function _vidOvRenderAnalyticsPanel(){
  let panel=document.getElementById('vidOvAnPanel');
  if(!panel){
    panel=document.createElement('div');panel.id='vidOvAnPanel';
    const card=document.getElementById('vidOvPanel')?.closest('.card');
    const rightPanel=document.querySelector('.row1-right-panel');
    if(card){
      const cr=card.getBoundingClientRect();
      const rr=rightPanel?rightPanel.getBoundingClientRect():{left:cr.right+10,width:700,top:cr.top,height:cr.height};
      panel.style.cssText=`position:fixed;top:${cr.top}px;left:${rr.left}px;width:${rr.width}px;height:${cr.height}px;z-index:200;background:rgba(255,255,255,.98);backdrop-filter:blur(12px);border:1px solid rgba(210,205,228,.18);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);overflow:hidden;display:flex;flex-direction:column;opacity:0;transform:translateX(12px);transition:opacity .25s ease,transform .25s ease`;
    }else{
      panel.style.cssText='position:fixed;top:60px;right:20px;width:700px;bottom:20px;z-index:200;background:rgba(255,255,255,.98);backdrop-filter:blur(12px);border:1px solid rgba(210,205,228,.18);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);overflow:hidden;display:flex;flex-direction:column;opacity:0;transform:translateX(12px);transition:opacity .25s ease,transform .25s ease';
    }
    document.body.appendChild(panel);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{panel.style.opacity='1';panel.style.transform='translateX(0)';}));
  }
  // Ensure YT data is loaded (may not be if videos page hasn't been visited)
  if(typeof _ytData!=='undefined'&&!_ytData){
    try{const _lsc=JSON.parse(localStorage.getItem('_ytCache')||'null');
    if(_lsc&&_lsc.channelStats){_ytData=_lsc;if(typeof _ytBuildMatch==='function')_ytBuildMatch();}}catch(e){}
  }
  if(typeof _ytAnalytics!=='undefined'&&!_ytAnalytics){
    try{const _lac=JSON.parse(localStorage.getItem('_ytAnalyticsCache')||'null');
    if(_lac&&_lac.monthly)_ytAnalytics=_lac;}catch(e){}
  }
  // Reuse exact same analytics render from videos page
  if(typeof _vidRenderAnalytics==='function'){
    const content=_vidRenderAnalytics();
    panel.innerHTML=`<div style="position:relative;width:100%;height:100%;overflow-y:auto">${content}</div>`;
  }else{
    panel.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted);font-size:12px">Analytics not available</div>';
  }
}
let _vidCalDragId=null;
function _vidCalDrop(event,ds){
  event.preventDefault();event.currentTarget.classList.remove('vid-cal-drop');
  const vidId=_vidCalDragId||((typeof dragId==='string'&&dragId.startsWith('vid::'))?dragId.replace('vid::',''):null);
  _vidCalDragId=null;
  if(!vidId)return;
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));if(!v)return;
  const prev=v.post_date;
  v.post_date=ds;
  save();_vidOvRenderCal();_renderVidOvMenu();renderAll();
  sbReqSilent('PATCH','videos',{post_date:ds},`?id=eq.${vidId}`);
  pushUndo(()=>{v.post_date=prev;save();_vidOvRenderCal();_renderVidOvMenu();renderAll();sbReqSilent('PATCH','videos',{post_date:prev},`?id=eq.${vidId}`);},'Moved post date');
}
let _vidOvChildDrag=null;
let _vidOvBDrag=null;
function _vidOvReorder(event,bigId,targetId){
  event.preventDefault();event.currentTarget.style.borderTop='';
  if(!_vidOvChildDrag)return;
  const dragId2=_vidOvChildDrag.dataset.cvid;
  if(!dragId2||dragId2===targetId)return;
  const children=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(bigId)).sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
  const fromIdx=children.findIndex(c=>String(c.id)===dragId2);
  const toIdx=children.findIndex(c=>String(c.id)===targetId);
  if(fromIdx<0||toIdx<0)return;
  const [moved]=children.splice(fromIdx,1);
  children.splice(toIdx,0,moved);
  children.forEach((c,i)=>{c.vid_order=i;sbReqSilent('PATCH','videos',{vid_order:i},`?id=eq.${c.id}`);});
  save();_renderVidOvMenu();
  pushUndo(()=>{children.splice(toIdx,1);children.splice(fromIdx,0,moved);children.sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));children.forEach((c,i)=>{c.vid_order=i;sbReqSilent('PATCH','videos',{vid_order:i},`?id=eq.${c.id}`);});save();_renderVidOvMenu();},'Reordered video');
}
function _vidOvReorderAt(event,bigId,targetId){
  event.preventDefault();
  if(!_vidOvChildDrag)return;
  const dragId2=_vidOvChildDrag.dataset.cvid;
  if(!dragId2||dragId2===targetId)return;
  const children=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(bigId)).sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
  const fromIdx=children.findIndex(c=>String(c.id)===dragId2);
  let toIdx=children.findIndex(c=>String(c.id)===targetId);
  if(fromIdx<0||toIdx<0)return;
  // If mouse is below midpoint, insert after target
  const r=event.currentTarget.getBoundingClientRect();
  const insertAfter=event.clientY>=r.top+r.height/2;
  if(insertAfter)toIdx++;
  // Adjust for removal
  const [moved]=children.splice(fromIdx,1);
  if(fromIdx<toIdx)toIdx--;
  if(toIdx>children.length)toIdx=children.length;
  children.splice(toIdx,0,moved);
  children.forEach((c,i)=>{c.vid_order=i;sbReqSilent('PATCH','videos',{vid_order:i},`?id=eq.${c.id}`);});
  const savedFrom=fromIdx,savedTo=toIdx;
  save();_renderVidOvMenu();
  pushUndo(()=>{children.splice(savedTo,1);children.splice(savedFrom,0,moved);children.sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));children.forEach((c,i)=>{c.vid_order=i;sbReqSilent('PATCH','videos',{vid_order:i},`?id=eq.${c.id}`);});save();_renderVidOvMenu();},'Reordered video');
}
let _vidOvDropLine=null;
let _vidOvDropLastIdx=-1;
function _vidOvDragIndicator(e){
  if(!_vidOvChildDrag&&!_vidOvBDrag)return;
  const cont=document.getElementById('vidOvContent');if(!cont)return;
  let rows;
  let _dragMode='child';
  if(_vidOvBDrag){
    _dragMode='B';
    rows=[...cont.querySelectorAll('[data-vidrow]')].filter(r=>!r.dataset.cvid);
  } else {
    const dragVid=_vidOvChildDrag.dataset.cvid;
    const dragV=(st.videos||[]).find(x=>String(x.id)===dragVid);if(!dragV)return;
    const bigId=String(dragV.big_video_id);
    rows=[...cont.querySelectorAll('[data-cvid]')].filter(r=>{
      const rv=(st.videos||[]).find(x=>String(x.id)===r.dataset.cvid);
      return rv&&String(rv.big_video_id)===bigId;
    });
  }
  if(!rows.length)return;
  // Find nearest gap — use row centers so cursor anywhere in a row maps to above/below
  let bestIdx=0,bestDist=Infinity;
  rows.forEach((r,i)=>{
    const rect=r.getBoundingClientRect();
    const mid=rect.top+rect.height/2;
    if(e.clientY<mid){const d=mid-e.clientY;if(d<bestDist){bestDist=d;bestIdx=i;}}
    else{const d=e.clientY-mid;if(d<bestDist){bestDist=d;bestIdx=i+1;}}
  });
  // Hysteresis: only change position if cursor moved past 30% into another row's zone
  if(_vidOvDropLastIdx>=0&&_vidOvDropLastIdx!==bestIdx){
    const prevRow=rows[Math.min(_vidOvDropLastIdx,rows.length-1)];
    if(prevRow){const pr=prevRow.getBoundingClientRect();const threshold=pr.height*0.3;if(bestDist<threshold){bestIdx=_vidOvDropLastIdx;}}
  }
  // Show indicator line
  if(!_vidOvDropLine){_vidOvDropLine=document.createElement('div');_vidOvDropLine.style.cssText='height:2px;background:rgba(14,165,233,.6);border-radius:1px;pointer-events:none;margin:-1px 6px;box-shadow:0 0 4px rgba(14,165,233,.3);transition:transform .08s ease-out';}
  // Remove from old position
  if(_vidOvDropLine.parentNode)_vidOvDropLine.remove();
  // Insert at the gap
  const refRow=rows[bestIdx]||null;
  if(refRow)refRow.parentNode.insertBefore(_vidOvDropLine,refRow);
  else{const lastRow=rows[rows.length-1];if(lastRow&&lastRow.nextSibling)lastRow.parentNode.insertBefore(_vidOvDropLine,lastRow.nextSibling);else if(lastRow)lastRow.parentNode.appendChild(_vidOvDropLine);}
  _vidOvDropLine._dropIdx=bestIdx;_vidOvDropLine._dragMode=_dragMode;if(_dragMode==='child'){const dv2=_vidOvChildDrag.dataset.cvid;const dv3=(st.videos||[]).find(x=>String(x.id)===dv2);_vidOvDropLine._bigId=dv3?String(dv3.big_video_id):null;}else{_vidOvDropLine._bigId=null;}_vidOvDropLastIdx=bestIdx;
}
function _vidOvClearIndicator(){if(_vidOvDropLine&&_vidOvDropLine.parentNode)_vidOvDropLine.remove();_vidOvDropLastIdx=-1;}
function _vidOvContentDrop(event){
  event.preventDefault();
  // Child video drag reorder
  if(_vidOvChildDrag&&_vidOvDropLine&&_vidOvDropLine._bigId){
    const bigId=_vidOvDropLine._bigId;
    const toPos=_vidOvDropLine._dropIdx;
    _vidOvClearIndicator();
    const dragVid=_vidOvChildDrag.dataset.cvid;
    const children=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===bigId).sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
    const fromIdx=children.findIndex(c=>String(c.id)===dragVid);
    if(fromIdx<0)return;
    let toIdx=toPos;
    const prevOrders=children.map(c=>({id:c.id,ord:c.vid_order}));
    const [moved]=children.splice(fromIdx,1);
    if(fromIdx<toIdx)toIdx--;
    if(toIdx>children.length)toIdx=children.length;
    if(toIdx<0)toIdx=0;
    children.splice(toIdx,0,moved);
    children.forEach((c,i)=>{c.vid_order=i;sbReqSilent('PATCH','videos',{vid_order:i},`?id=eq.${c.id}`);});
    save();_renderVidOvMenu();
    pushUndo(()=>{prevOrders.forEach(p=>{const c=(st.videos||[]).find(x=>String(x.id)===String(p.id));if(c){c.vid_order=p.ord;sbReqSilent('PATCH','videos',{vid_order:p.ord},`?id=eq.${p.id}`);}});save();_renderVidOvMenu();},'Reordered video');
    return;
  }
  // B video drag reorder
  if(_vidOvBDrag&&_vidOvDropLine&&_vidOvDropLine._dragMode==='B'){
    const toPos=_vidOvDropLine._dropIdx;
    _vidOvClearIndicator();
    const dragVid=_vidOvBDrag.dataset.vidrow;
    const bVids=(st.videos||[]).filter(v=>!v.is_deleted&&v.video_type==='B'&&v.status==='up_next').sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
    bVids.forEach((v,i)=>{if(v.vid_order==null)v.vid_order=i;});
    const fromIdx=bVids.findIndex(v=>String(v.id)===dragVid);
    if(fromIdx<0){_vidOvBDrag=null;return;}
    const prevOrders=bVids.map(v=>({id:v.id,ord:v.vid_order}));
    let toIdx=toPos;
    const [moved]=bVids.splice(fromIdx,1);
    if(fromIdx<toIdx)toIdx--;
    if(toIdx>bVids.length)toIdx=bVids.length;
    if(toIdx<0)toIdx=0;
    bVids.splice(toIdx,0,moved);
    bVids.forEach((v,i)=>{v.vid_order=i;sbReqSilent('PATCH','videos',{vid_order:i},`?id=eq.${v.id}`);});
    _vidOvBDrag=null;save();_renderVidOvMenu();
    pushUndo(()=>{prevOrders.forEach(p=>{const v=(st.videos||[]).find(x=>String(x.id)===String(p.id));if(v){v.vid_order=p.ord;sbReqSilent('PATCH','videos',{vid_order:p.ord},`?id=eq.${p.id}`);}});save();_renderVidOvMenu();},'Reordered video');
    return;
  }
  _vidOvClearIndicator();
  // Fall through to up_next drop for non-child drags
  _vidOvUpNextDrop(event);
}
function _vidAssignToDay(vidId,ds){
  const map=_vidDayMap();
  const prev=map[String(vidId)]||null;
  map[String(vidId)]=ds;
  _vidDayMapSet(map);
  // Remove ALL timeblocks from old days (not just the first one)
  const _vidBlksRemoved=[];
  for(let i=st.blocks.length-1;i>=0;i--){const b=st.blocks[i];if(String(b._vidId)===String(vidId)&&b.ds!==ds){_vidBlksRemoved.push(st.blocks.splice(i,1)[0]);}}
  _vidBlksRemoved.forEach(b=>sbDeleteBlock(b.id));
  save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
  // Re-render panel if open
  const panel=document.getElementById('vidOvPanel');
  if(panel&&panel.style.display==='block')_renderVidOvMenu();
  pushUndo(()=>{const m2=_vidDayMap();if(prev)m2[String(vidId)]=prev;else delete m2[String(vidId)];_vidDayMapSet(m2);_vidBlksRemoved.forEach(b=>{st.blocks.push(b);sbSaveBlock(b);});save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();const p2=document.getElementById('vidOvPanel');if(p2&&p2.style.display==='block')_renderVidOvMenu();},'Added video to calendar');
}
function _vidUnassignDay(vidId){
  const map=_vidDayMap();
  const prev=map[String(vidId)]||null;
  delete map[String(vidId)];
  _vidDayMapSet(map);
  // Remove linked timeblock
  const _vidBlkIdx=st.blocks.findIndex(b=>String(b._vidId)===String(vidId));
  const _vidBlkRemoved=_vidBlkIdx>=0?st.blocks.splice(_vidBlkIdx,1)[0]:null;
  if(_vidBlkRemoved)sbDeleteBlock(_vidBlkRemoved.id);
  save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
  const panel=document.getElementById('vidOvPanel');
  if(panel&&panel.style.display==='block')_renderVidOvMenu();
  if(prev)pushUndo(()=>{const m2=_vidDayMap();m2[String(vidId)]=prev;_vidDayMapSet(m2);if(_vidBlkRemoved){st.blocks.push(_vidBlkRemoved);sbSaveBlock(_vidBlkRemoved);}save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();const p2=document.getElementById('vidOvPanel');if(p2&&p2.style.display==='block')_renderVidOvMenu();},'Removed video from calendar');
}
function _vidCompleteFromOv(vidId,anchorEl){
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));
  if(!v)return;
  const coreSteps=typeof VID_STEPS_CORE!=='undefined'?VID_STEPS_CORE:['step_build','step_vo','step_cut','step_thumbnail','step_description'];
  const tabRequired=v.step_tableau_public&&v.step_tableau_public!=='na'&&v.step_tableau_public!=='done';

  // Mark core 5 stages done
  const vidPatch={};
  coreSteps.forEach(s=>{
    if(v[s]==='na')return;
    v[s]='done';vidPatch[s]='done';
  });

  // Always set to published (tab pending videos still show on overview)
  v.status='published';vidPatch.status='published';
  sbReqSilent('PATCH','videos',vidPatch,`?id=eq.${v.id}`);

  // Keep in day map so completed videos stay visible on today/weekly

  // Prompt for post date (creates tab task if needed)
  _vidPromptPostDate(vidId,anchorEl);
  save();renderAll();
  if(typeof renderVideosPageKeepScroll==='function')renderVideosPageKeepScroll();
}

let _vidOvPromptOpen=false;
function _vidPromptPostDate(vidId,anchorEl){
  if(_vidOvPromptOpen)return;
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));if(!v)return;
  // If post_date already set AND link not needed, skip prompt
  const _tabReqP2=v.step_tableau_public&&v.step_tableau_public!=='na'&&v.step_tableau_public!=='done';
  if(v.post_date&&(!_tabReqP2||v.youtube_url)){_vidCreateTabUpTask(vidId,v.post_date);return;}
  _vidOvPromptOpen=true;
  // Prompt with a small popover near the anchor
  const ds=v.post_date||d2s(getDayDate(0));
  const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:600';
  const pop=document.createElement('div');
  pop.style.cssText=`position:fixed;width:260px;padding:14px;background:${_dk()?'rgba(24,24,28,.98)':'rgba(255,255,255,.98)'};border:1px solid ${_dk()?'rgba(255,255,255,.08)':'rgba(210,205,228,.4)'};border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,${_dk()?'.4':'.15'});backdrop-filter:blur(12px);z-index:601`;
  if(anchorEl){
    const r=anchorEl.getBoundingClientRect();
    pop.style.top=Math.min(r.bottom+6,window.innerHeight-200)+'px';
    pop.style.left=Math.max(8,Math.min(r.left,window.innerWidth-280))+'px';
  }else{pop.style.top='50%';pop.style.left='50%';pop.style.transform='translate(-50%,-50%)';}
  const _tabReq=v.step_tableau_public&&v.step_tableau_public!=='na'&&v.step_tableau_public!=='done';
  pop.innerHTML=`
    <div style="font-size:12px;font-weight:600;margin-bottom:6px">Post Date — ${escHtml(v.topic||v.title)}</div>
    <p style="font-size:10px;color:var(--muted);margin:0 0 10px">${_tabReq?'A tab task will be created for this date.':'Video will be marked complete.'}</p>
    <div style="margin-bottom:10px"><input id="_vidPostDateInp" type="date" value="${ds}" style="width:100%;font-size:12px;padding:4px 6px;border:1px solid var(--border);border-radius:6px"></div>
    ${_tabReq?`<div style="margin-bottom:10px"><input id="_vidYtUrlInp" type="text" placeholder="YouTube link (optional)" value="${v.youtube_url||''}" style="width:100%;font-size:11px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box"></div>`:''}
    <div style="display:flex;justify-content:flex-end;gap:6px"><button class="btn btn-ghost btn-xs" id="_vidPostCancel">Cancel</button><button class="btn btn-dark btn-xs" id="_vidPostSave">Set Date</button></div>`;
  document.body.appendChild(overlay);document.body.appendChild(pop);
  const _cleanup=()=>{_vidOvPromptOpen=false;overlay.remove();pop.remove();};
  overlay.addEventListener('click',_cleanup);
  document.getElementById('_vidPostCancel').addEventListener('click',_cleanup);
  document.getElementById('_vidPostSave').addEventListener('click',async()=>{
    const postDate=document.getElementById('_vidPostDateInp').value;
    if(!postDate){_cleanup();return;}
    v.post_date=postDate;
    v.status='published';
    const ytInp=document.getElementById('_vidYtUrlInp');
    const ytUrl=ytInp?ytInp.value.trim():'';
    if(ytUrl)v.youtube_url=ytUrl;
    const vidPatch={post_date:postDate,status:'published'};if(ytUrl)vidPatch.youtube_url=ytUrl;
    await sbReqSilent('PATCH','videos',vidPatch,`?id=eq.${v.id}`);
    _cleanup();
    const _tr=v.step_tableau_public&&v.step_tableau_public!=='na'&&v.step_tableau_public!=='done';
    if(_tr){_vidCreateTabUpTask(vidId,postDate);}
    // Keep in day map — completed videos stay visible
    save();renderAll();
    if(typeof renderVideosPageKeepScroll==='function')renderVideosPageKeepScroll();
  });
  pop.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById('_vidPostSave').click();}if(e.key==='Escape')_cleanup();});
  setTimeout(()=>document.getElementById('_vidPostDateInp')?.focus(),60);
}

const _vidTabCreating=new Set();
async function _vidCreateTabUpTask(vidId,postDate){
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));if(!v)return;
  // Check if task already exists or is being created
  const marker='_vid:'+vidId;
  if(_vidTabCreating.has(vidId))return;
  const existing=st.tasks.find(t=>t.notes&&t.notes.includes(marker));
  if(existing)return;
  _vidTabCreating.add(vidId);
  const name='Post Tab - '+(v.topic||v.title);
  const localId='l-'+Date.now();
  const t={id:localId,name,category:'Videos',due_date:postDate,done:false,important:false,notes:marker};
  st.tasks.push(t);
  // Create timeblock immediately with local task ID
  const tb={id:crypto.randomUUID(),title:name,ds:postDate,sm:450,dur:30,cat:'Videos',taskId:localId,_done:false};
  st.blocks.push(tb);
  save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
  const sv=await sbReq('POST','tasks',{name,category:'Videos',due_date:postDate,done:false,important:false,notes:marker});
  if(sv&&sv[0]){
    const i=st.tasks.findIndex(x=>x.id===localId);if(i>-1)st.tasks[i]=sv[0];
    tb.taskId=String(sv[0].id);
  }
  sbSaveBlock(tb);
  _vidTabCreating.delete(vidId);
}
function _vidCompleteTabUp(vidId){
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));
  if(!v)return;
  const vidPatch={};
  // Mark both tab fields done
  ['step_tableau_public','step_upload_tableau'].forEach(s=>{if(v[s]&&v[s]!=='na'&&v[s]!=='done'){v[s]='done';vidPatch[s]='done';}});
  // Mark the auto-created tab task as done
  const marker='_vid:'+vidId;
  const tabTask=st.tasks.find(t=>t.notes&&t.notes.includes(marker)&&!t.done);
  if(tabTask){tabTask.done=true;sbReqSilent('PATCH','tasks',{done:true},`?id=eq.${tabTask.id}`);}
  // Keep in day map so completed videos stay visible on today/weekly
  sbReqSilent('PATCH','videos',vidPatch,`?id=eq.${v.id}`);
  save();renderAll();
  if(typeof renderVideosPageKeepScroll==='function')renderVideosPageKeepScroll();
}
function _vidUncompleteTabUp(vidId){
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));
  if(!v)return;
  const vidPatch={};
  ['step_tableau_public','step_upload_tableau'].forEach(s=>{if(v[s]==='done'){v[s]='not_started';vidPatch[s]='not_started';}});
  if(Object.keys(vidPatch).length){
    sbReqSilent('PATCH','videos',vidPatch,`?id=eq.${v.id}`);
    save();renderAll();
    if(typeof renderVideosPageKeepScroll==='function')renderVideosPageKeepScroll();
  }
}
function _vidUncompleteFromOv(vidId){
  // Undo: set back to in_progress, clear steps
  const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));
  if(!v)return;
  const steps=typeof VID_STEPS!=='undefined'?VID_STEPS:[];
  steps.forEach(s=>{if(v[s]==='done'){v[s]='not_started';}});
  if(v.step_upload_tableau==='done')v.step_upload_tableau='not_started';
  v.status='in_progress';
  sbReqSilent('PATCH','videos',{status:'in_progress',step_upload_tableau:v.step_upload_tableau,...Object.fromEntries(steps.filter(s=>v[s]!=='na').map(s=>[s,'not_started']))},`?id=eq.${v.id}`);
  // Delete auto-created tab/up task if it exists
  const marker='_vid:'+vidId;
  const taskIdx=st.tasks.findIndex(t=>t.notes&&t.notes.includes(marker));
  if(taskIdx>-1){
    const task=st.tasks[taskIdx];
    st.tasks.splice(taskIdx,1);
    if(String(task.id).startsWith('l-')){}else{sbReqSilent('DELETE','tasks',null,`?id=eq.${task.id}`);}
  }
  save();renderAll();
  if(typeof renderVideosPageKeepScroll==='function')renderVideosPageKeepScroll();
}

function renderShopOv(){
  const shopSorted=_shopOvSort(st.shopping.filter(s=>!s.done));
  const container=document.getElementById('shopOv');
  container.style.maxHeight='';
  container.innerHTML='';
  // Set up container DnD for in-list reorder (once per container lifetime)
  if(!container._shopDnDSetup){
    container._shopDnDSetup=true;
    container.addEventListener('dragover',e=>{
      if(!dragId||!dragId.startsWith('shop::'))return;
      e.preventDefault();
      let ph=container.querySelector('.shop-ov-ph');
      if(!ph){ph=document.createElement('div');ph.className='shop-ov-ph';ph.style.cssText='height:2px;margin:2px 10px;border-radius:99px;background:rgba(150,150,160,.5);pointer-events:none;flex-shrink:0';container.appendChild(ph);}
      const rows=[...container.querySelectorAll('.ti')];
      let inserted=false;
      for(const r of rows){const rc=r.getBoundingClientRect();if(e.clientY<rc.top+rc.height/2){container.insertBefore(ph,r);inserted=true;break;}}
      if(!inserted&&rows.length)rows[rows.length-1].after(ph);
    });
    container.addEventListener('dragleave',e=>{
      if(!container.contains(e.relatedTarget)){const ph=container.querySelector('.shop-ov-ph');if(ph)ph.remove();}
    });
    container.addEventListener('drop',e=>{
      e.preventDefault();
      const ph=container.querySelector('.shop-ov-ph');
      if(!dragId||!dragId.startsWith('shop::'))return;
      const shopId=dragId.split('::')[1];
      const s=st.shopping.find(x=>String(x.id)===String(shopId));
      if(!s){if(ph)ph.remove();return;}
      if(!ph)return; // no placeholder means not a reorder drop
      const prevOrders=st.shopping.filter(x=>!x.done).map(x=>({id:x.id,shop_order:x.shop_order}));
      const allRows=[...container.querySelectorAll('.ti')];
      const children=[...container.children];
      const phIdx=children.indexOf(ph);
      const before=allRows.filter(r=>children.indexOf(r)<phIdx).map(r=>r.id.replace('ti-shop-cal-',''));
      const after=allRows.filter(r=>children.indexOf(r)>=phIdx&&r.id!=='ti-shop-cal-'+shopId).map(r=>r.id.replace('ti-shop-cal-',''));
      const orderedIds=[...before,shopId,...after];
      orderedIds.forEach((id,i)=>{const it=st.shopping.find(x=>String(x.id)===String(id));if(it)it.shop_order=i;});
      ph.remove();
      save();
      st.shopping.filter(x=>!x.done).forEach(it=>sbReqNullable('PATCH','shopping_list',{shop_order:it.shop_order??null},`?id=eq.${it.id}`));
      pushUndo(()=>{prevOrders.forEach(({id,shop_order})=>{const it=st.shopping.find(x=>String(x.id)===String(id));if(it){it.shop_order=shop_order;sbReqNullable('PATCH','shopping_list',{shop_order:shop_order??null},`?id=eq.${id}`);}});renderShopOv();},'Reorder shopping');
      renderShopOv();
    });
  }
  shopSorted.forEach(s=>{
    const el=document.createElement('div');
    el.className='ti';el.id='ti-shop-cal-'+s.id;el.style.cssText='margin:0 6px;padding:3px 22px 3px 10px';
    el.draggable=true;
    el.addEventListener('dragstart',e=>{if(e.target.closest('.chk-wrap,.delbtn'))return;e.stopPropagation();dragId='shop::'+s.id;e.dataTransfer.effectAllowed='move';el.style.opacity='.4';document.body.classList.add('body-dragging');showWkcEdges(true);});
    el.addEventListener('dragend',()=>{el.style.opacity='';document.body.classList.remove('body-dragging');showWkcEdges(false);const ph=container.querySelector('.shop-ov-ph');if(ph)ph.remove();dragId=null;});
    el.innerHTML=
      `<label class="chk-wrap"><input type="checkbox" class="chk"${s.done?' checked':''}></label>`+
      `<span class="tn">${escHtml(s.name)}</span>`+
      `<span class="cpill" style="background:none;color:var(--subtle);border:none;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;padding:0;flex-shrink:0">${escHtml(s.store||'')}</span>`+
      `<button class="delbtn">✕</button>`;
    el.addEventListener('click',e=>tiClickShop(e,s.id));
    el.addEventListener('dblclick',e=>tiDblShop(e,s.id));
    el.addEventListener('contextmenu',e=>showCtxShop(e,s.id));
    el.querySelector('.chk-wrap').addEventListener('click',e=>e.stopPropagation());
    el.querySelector('.chk').addEventListener('change',e=>togShop(s.id,e.target.checked));
    el.querySelector('.delbtn').addEventListener('click',e=>{e.stopPropagation();delShop(s.id);});
    container.appendChild(el);
  });
  _attachListRubberBand(container);
}

// ── Virtual recurring task row for This Week ─────────────────────────────────
function tRowWk(t){
  if(t._virtual){
    const s=gc((t._isWrec||t._isWrRule)?'weekly_reset':'recurring');
    const _wkCtxMenu=t._isWrRule?`showWrRuleCtx(event,'${t._ruleId}','${t._wkKey||getWkKey(wkOff)}')`:`showWrRuleCtx(event,'${t._recId}','${t._wkKey||getWkKey(wkOff)}')`;
    const _wkXBtn=t._isWrRule?`showWrScopePicker(event,'⊘  Skip this week only','✕  Delete rule (all future)',()=>writeWrOverride('${t._ruleId}','${t._wkKey||getWkKey(wkOff)}',{override_type:'skip'},{undoLabel:'Skipped WR task this week'}),()=>wrCtxDeleteRule('${t._ruleId}'),'⊠  Remove from views',()=>unscheduleWrRule('${t._ruleId}','${t._wkKey||getWkKey(wkOff)}'))`
      :t._isWrec?`showWrScopePicker(event,'⊘  Skip this week only','✕  Delete recurring task',()=>skipWRec('${t._recId}','${t._wkKey||getWkKey(wkOff)}'),()=>delRec('${t._recId}'),'⊠  Remove from views',()=>unscheduleWRec('${t._recId}','${t._wkKey||getWkKey(wkOff)}'))`
      :`showWrScopePicker(event,'⊘  Skip this week only','✕  Delete recurring task',()=>skipRecVirtThisWk('${t._recId}','${t._wkKey||getWkKey(wkOff)}'),()=>delRec('${t._recId}'))`;
    return`<div class="ti ${t.done?'done':''}" style="background:${s.bg}" id="ti-${t.id}" onclick="selTask(event,'${t.id}')" ondblclick="${t._isWrRule?`event.stopPropagation();openWrEditModal('${t._ruleId}','${t._wkKey||getWkKey(wkOff)}','this')`:`tiDblRec(event,'${t._recId}','${t._wkKey||getWkKey(wkOff)}')`}" oncontextmenu="${_wkCtxMenu}">
      <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="${t._isWrec?`togRec('${t._recId}',this.checked)`:`togRecVirt('${t._recId}',this.checked,'${t._wkKey||getWkKey(wkOff)}')`}"></label>
      ${_hebBadge(t.name)}${_pupBadge(t.name)}<span class="tn">${t.name}${t._wkNote?` <span style="opacity:.5;font-size:9px">@${escHtml(t._wkNote)}</span>`:''}</span>
      <span class="cpill" style="background:${s.bg};color:${s.t};border-color:${s.b}">Recurring</span>
      <span class="dlbl">${fmtD(t.due_date)}</span>
      <button class="delbtn" onclick="event.stopPropagation();${_wkXBtn}">✕</button>
    </div>`;
  }
  return tRow(t,{cat:true,due:true,drag:true});
}
function togRecVirt(recId,done,wkKey){
  const r=st.recurring.find(x=>String(x.id)===String(recId));if(!r)return;
  if(!r._doneByWk)r._doneByWk={};
  const prev=!!r._doneByWk[wkKey];
  if(done) r._doneByWk[wkKey]=true;
  else delete r._doneByWk[wkKey];
  r._done=false;
  st.blocks.filter(b=>String(b.recId)===String(recId)).forEach(b=>b._done=done);
  save();renderToday();renderWkSummary();renderRecOv();renderWkCal();
  if(document.getElementById('tbGrid'))renderDayTB();
  sbReq('PATCH','wr_recurring_rules',{done_by_week:r._doneByWk},recQs(recId));
  pushUndo(()=>{
    if(!r._doneByWk)r._doneByWk={};
    if(prev)r._doneByWk[wkKey]=true;else delete r._doneByWk[wkKey];
    st.blocks.filter(b=>String(b.recId)===String(recId)).forEach(b=>b._done=prev);
    save();renderToday();renderWkSummary();renderRecOv();renderWkCal();
    if(document.getElementById('tbGrid'))renderDayTB();
    sbReq('PATCH','wr_recurring_rules',{done_by_week:r._doneByWk},recQs(recId));
  },(done?'Checked':'Unchecked')+' recurring');
}

// ── Extra (travel/birthday) virtual row ──────────────────────────────────────
function tRowExtra(t){
  const s=gc(t.category);
  const sl=t.category.toLowerCase();
  const isTv=t._type==='travel';
  const isBd=t._type==='birthday';
  const sub=isTv&&t.end_date?` – ${fmtD(t.end_date)}`:'';
  const modeIcon=isTv?(t.travel_mode==='plane'?_PLANE_SVG:t.travel_mode==='drive'?_CAR_SVG:''):'';
  const bdDrag=isBd?`draggable="true" ondragstart="dStart(event,'bday::${t._srcId}::${t.due_date}')" ondragend="dEnd(event)"`:'';
  const _bdDone=isBd&&t.done;
  const _bdPast=isBd&&!_bdDone&&t.due_date&&t.due_date<tod();
  return`<div class="ti ti-${sl}${_bdDone?' done':''}" style="background:${s.bg}${_bdDone||_bdPast?';opacity:.45':''}" id="ti-${t.id}" ${bdDrag} onclick="selTask(event,'${t.id}')">
    ${isTv?`<button class="pack-icon-btn pack-seg" onclick="event.stopPropagation();openPackingModal('${t._srcId}')" title="Packing list">${_PACK_SVG}</button>`:''}
    <span class="tn" style="color:${s.t}${_bdDone||_bdPast?';text-decoration:line-through':''}">${modeIcon}${isBd?t.name.replace('🎂','<span class="bday-emoji">🎂</span>'):t.name}</span>
    ${isTv||isBd?'':`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${s.bg}" stroke="${s.d}" stroke-opacity="0.4" stroke-width="1"/></svg>`}
    ${isBd?'':`<span class="dlbl" style="${isTv?`margin-left:auto;color:${_dk()?'var(--muted)':'#475569'}`:''}">${fmtD(t.due_date)}${sub}</span>`}
    ${isTv?`<button class="delbtn" onclick="event.stopPropagation();delTravel('${t._srcId}')">✕</button>`:''}
  </div>`;
}

const _CAR_SVG=`<svg width="14" height="10" viewBox="0 0 24 16" fill="currentColor" style="display:inline-block;vertical-align:middle;margin-right:3px;margin-top:-2px"><path d="M22 9h-.8L18.9 4.1A2 2 0 0017.1 3H6.9a2 2 0 00-1.8 1.1L2.8 9H2a1 1 0 00-1 1v2a1 1 0 001 1h.8a2.5 2.5 0 004.4 0h9.6a2.5 2.5 0 004.4 0H22a1 1 0 001-1v-2a1 1 0 00-1-1zM6 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm12 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM4.4 9l2-4.5h11.2l2 4.5H4.4z"/></svg>`;
const _PLANE_SVG=`<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:middle;margin-right:3px;margin-top:-2px"><g transform="rotate(90,12,12)"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></g></svg>`;
function tmIcon(t){if(!t||t._virtual)return '';if(t.travel_mode==='plane')return _PLANE_SVG;if(t.travel_mode==='drive')return _CAR_SVG;return '';}

// ── Task row (overdue→imp→rest) ────────────────────────────────────────────────
function tRow(t,o={}){
  const ov=isOv(t.due_date)&&!t.done;
  const imp=t.important&&!ov&&!t.done;
  const _isPostTab=t.notes&&t.notes.startsWith('_vid:');
  const s=ov?_OV():imp?_IMP():_isPostTab?{bg:'rgba(22,163,74,.18)',t:'#166534',d:'#16a34a',b:'rgba(22,163,74,.35)'}:gc(t.category);
  const sl=ov?'ov':imp?'imp':slug(t.category);
  const _dblHandler=_isPostTab?`if(typeof openVidEdit==='function')openVidEdit('${t.notes.replace('_vid:','')}')`:`tiDbl(event,'${t.id}')`;
  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''} ${imp&&!ov?'imp-row':''}" style="${!ov&&!imp&&!o.noColor?`background:${s.bg}`:''}" id="ti-${t.id}" ${o.drag?`draggable="true" ondragstart="dStart(event,'${t.id}')" ondragend="dEnd(event)"`:''} onclick="selTask(event,'${t.id}')" ondblclick="${_dblHandler}" oncontextmenu="showCtx(event,'${t.id}')">
    <label class="chk-wrap" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="toggleTask('${t.id}',this.checked,'${o.drag?'wk':''}')"></label>
    <span class="tn">${tmIcon(t)}${t.name}</span>
    ${o.cat?(o.catDot&&!ov?`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${s.bg}" stroke="${s.d}" stroke-opacity="0.4" stroke-width="1"/></svg>`:(!o.catDot?`<span class="cpill" style="background:${s.bg};color:${s.t};border-color:${s.b}">${t.category||'?'}</span>`:'')):''}
    ${o.tbArrow?'<span class="tb-arrow">›</span>':''}
    ${o.flag?'<span class="flag-u">📅</span>':''}
    ${!o.flag&&(!o.noDate||ov)&&t.due_date?ov?`<span class="dlbl ov">${['S','M','T','W','T','F','S'][new Date(t.due_date.split('T')[0]+'T12:00').getDay()]}</span>`:`<span class="dlbl" style="cursor:pointer" onclick="openInlineDatePicker(event,'${t.id}','${t.due_date}')">${fmtD(t.due_date)} <span class="date-clr" title="Clear date" onclick="event.stopPropagation();clearTaskDate('${t.id}',event)">×</span></span>`:''}
    <button class="delbtn" onclick="delTask('${t.id}',event)">✕</button>
  </div>`;
}

function dStart(e,id){dragId=String(id);e.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);const _b=document.getElementById('unMenuBack');if(_b)_b.style.pointerEvents='none';}
function dEnd(e){e.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);closeUnMenu();const _b=document.getElementById('unMenuBack');if(_b)_b.style.pointerEvents='';}

// ── Kanban ─────────────────────────────────────────────────────────────────────
function renderKanban(){
  const kb=document.getElementById('kanban');kb.innerHTML='';
  KCATS.forEach(cat=>{
    if(cat==='Social+Travel'){
      // Stacked column: Travel on top, Social below
      const wrapper=document.createElement('div');wrapper.className='kol';const soc=gc('Social');wrapper.style.cssText=`flex:1;min-width:200px;max-width:300px`;
      ['Travel','Social'].forEach((subCat,si)=>{
        const isTv=subCat==='Travel';
        const s=gc(subCat);
        const tasks=isTv
          ?[...st.travel].sort((a,b)=>(a.start_date||'').localeCompare(b.start_date||'')).map(tv=>({
              id:'tv-'+tv.id,name:(tv.destination?`${tv.name} → ${tv.destination}`:tv.name),
              category:'Travel',due_date:tv.start_date,end_date:tv.end_date,
              done:false,_srcId:tv.id,_type:'travel'
            }))
          :sortTasks(st.tasks.filter(t=>t.category===subCat&&!t.done));
        const sub=document.createElement('div');sub.style.cssText=`flex:1;display:flex;flex-direction:column;overflow:hidden;background:color-mix(in srgb,${s.bg} 35%,${_dk()?'rgba(24,24,28,.92)':'rgba(255,255,255,.92)'})${!isTv?`;border-top:1px solid ${_dk()?'rgba(255,255,255,.06)':'rgba(210,205,228,.18)'}`:''}`;
        const head=document.createElement('div');head.className='kol-head';head.style.cssText='border-bottom:1px solid rgba(210,205,228,.2);background:transparent';
        head.innerHTML=`<div class="kol-title" style="color:${s.t}">${subCat}</div><div class="kol-cnt">${tasks.length}</div>`;
        if(!isTv){const hp=document.createElement('button');hp.className='btn-plus';hp.textContent='+';hp.addEventListener('click',()=>openQA('kanban',hp,'',subCat));head.appendChild(hp);}
        sub.appendChild(head);
        const body=document.createElement('div');body.className='kol-body dzone';body.id=`kb-${slug(subCat)}`;
        tasks.forEach(t=>{
          const ov2=isOv(t.due_date)&&!t.done&&!isTv,imp2=t.important&&!ov2&&!t.done;
          const row=document.createElement('div');row.className=`kol-item ${ov2?'ov-row':''} ${imp2?'imp-row':''}`.trim();
          if(isTv){
            const nm=document.createElement('span');nm.className='kn';nm.style.color=s.t;nm.textContent='✈ '+t.name;nm.addEventListener('click',()=>openTravelModal(t._srcId));row.appendChild(nm);
            if(t.due_date){const dl=document.createElement('span');dl.className='dlbl';dl.textContent=fmtD(t.due_date)+(t.end_date?' – '+fmtD(t.end_date):'');row.appendChild(dl);}
            const packBtn=document.createElement('button');packBtn.className='pack-icon-btn';packBtn.innerHTML=_PACK_SVG;packBtn.title='Packing list';packBtn.addEventListener('click',ev=>{ev.stopPropagation();openPackingModal(t._srcId);});row.appendChild(packBtn);
            const del=document.createElement('button');del.className='delbtn';del.textContent='✕';del.addEventListener('click',ev=>{ev.stopPropagation();delTravel(t._srcId);});row.appendChild(del);
          } else {
            row.dataset.tid=String(t.id);row.draggable=true;row.addEventListener('dragstart',e=>dStart(e,t.id));row.addEventListener('dragend',()=>row.classList.remove('dragging'));row.addEventListener('contextmenu',e=>showCtx(e,t.id));row.addEventListener('click',e=>selTask(e,t.id));row.addEventListener('dblclick',e=>tiDbl(e,t.id));
            const chkWrap=document.createElement('label');chkWrap.className='chk-wrap';chkWrap.addEventListener('click',e=>e.stopPropagation());const chk=document.createElement('input');chk.type='checkbox';chk.className='chk';chk.checked=!!t.done;chk.addEventListener('change',()=>toggleTask(t.id,chk.checked));chkWrap.appendChild(chk);row.appendChild(chkWrap);

            const nm=document.createElement('span');nm.className='kn';nm.textContent=t.name;row.appendChild(nm);
            if(t.due_date){const dl=document.createElement('span');dl.className=`dlbl ${ov2?'ov':''}`;dl.textContent=fmtD(t.due_date);row.appendChild(dl);}
            const del=document.createElement('button');del.className='delbtn';del.textContent='✕';del.addEventListener('click',e=>delTask(t.id,e));row.appendChild(del);
          }
          body.appendChild(row);
        });
        sub.appendChild(body);
        const addRow=document.createElement('div');addRow.className='kol-add';
        if(isTv){
          const tvBtn=document.createElement('button');tvBtn.className='btn btn-ghost btn-xs';tvBtn.style.cssText='flex:1;font-size:9px';tvBtn.textContent='+ Add Trip';
          tvBtn.addEventListener('click',()=>openTravelModal());addRow.appendChild(tvBtn);
          const plBtn=document.createElement('button');plBtn.className='btn btn-ghost btn-xs';plBtn.style.cssText='flex:1;font-size:9px';plBtn.innerHTML=_PACK_SVG+' Packing Lists';
          plBtn.addEventListener('click',()=>showPage('packing'));addRow.appendChild(plBtn);
        } else {
          const kinp=document.createElement('input');kinp.className='kol-input';kinp.placeholder='Add…';
          kinp.addEventListener('keydown',e=>{if(e.key==='Enter')addKanban(subCat,kinp);});
          const kabtn=document.createElement('button');kabtn.className='btn btn-ghost btn-xs';kabtn.textContent='+';kabtn.addEventListener('click',()=>addKanban(subCat,kinp));
          addRow.appendChild(kinp);addRow.appendChild(kabtn);
          body.addEventListener('dragover',e=>{e.preventDefault();body.classList.add('over');});
          body.addEventListener('dragleave',()=>body.classList.remove('over'));
          body.addEventListener('drop',e=>{e.preventDefault();body.classList.remove('over');reassignCat(dragId,subCat);});
        }
        sub.appendChild(addRow);wrapper.appendChild(sub);
      });
      kb.appendChild(wrapper);
      return;
    }
    // Regular column
    const s=gc(cat);
    const tasks=sortTasks(st.tasks.filter(t=>t.category===cat&&!t.done));
    const col=document.createElement('div');col.className='kol';
    col.style.cssText=`background:color-mix(in srgb,${s.bg} 35%,${_dk()?'rgba(24,24,28,.92)':'rgba(255,255,255,.92)'});border:1px solid ${s.b};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)`;
    const head=document.createElement('div');head.className='kol-head';head.style.cssText='border-bottom:1px solid rgba(210,205,228,.2);background:transparent';
    head.innerHTML=`<div class="kol-title" style="color:${s.t}">${cat}</div><div class="kol-cnt">${tasks.length}</div>`;
    const hplus=document.createElement('button');hplus.className='btn-plus';hplus.textContent='+';hplus.addEventListener('click',()=>openQA('kanban',hplus,'',cat));head.appendChild(hplus);
    col.appendChild(head);
    const body=document.createElement('div');body.className='kol-body dzone';body.id=`kb-${slug(cat)}`;
    tasks.forEach(t=>{
      const ov2=isOv(t.due_date)&&!t.done,imp2=t.important&&!ov2&&!t.done;
      const row=document.createElement('div');row.className=`kol-item ${ov2?'ov-row':''} ${imp2?'imp-row':''}`.trim();
      row.dataset.tid=String(t.id);row.draggable=true;row.addEventListener('dragstart',e=>dStart(e,t.id));row.addEventListener('dragend',()=>row.classList.remove('dragging'));row.addEventListener('contextmenu',e=>showCtx(e,t.id));row.addEventListener('click',e=>selTask(e,t.id));row.addEventListener('dblclick',e=>tiDbl(e,t.id));
      const chkWrap=document.createElement('label');chkWrap.className='chk-wrap';chkWrap.addEventListener('click',e=>e.stopPropagation());const chk=document.createElement('input');chk.type='checkbox';chk.className='chk';chk.checked=!!t.done;chk.addEventListener('change',()=>toggleTask(t.id,chk.checked));chkWrap.appendChild(chk);row.appendChild(chkWrap);

      const nm=document.createElement('span');nm.className='kn';nm.textContent=t.name;row.appendChild(nm);
      if(t.due_date){const dl=document.createElement('span');dl.className=`dlbl ${ov2?'ov':''}`;dl.textContent=fmtD(t.due_date);row.appendChild(dl);}
      const del=document.createElement('button');del.className='delbtn';del.textContent='✕';del.addEventListener('click',e=>delTask(t.id,e));row.appendChild(del);
      body.appendChild(row);
    });
    col.appendChild(body);
    const addRow=document.createElement('div');addRow.className='kol-add';
    const kinp=document.createElement('input');kinp.className='kol-input';kinp.placeholder='Add…';
    kinp.addEventListener('keydown',e=>{if(e.key==='Enter')addKanban(cat,kinp);});
    const kabtn=document.createElement('button');kabtn.className='btn btn-ghost btn-xs';kabtn.textContent='+';kabtn.addEventListener('click',()=>addKanban(cat,kinp));
    addRow.appendChild(kinp);addRow.appendChild(kabtn);
    body.addEventListener('dragover',e=>{e.preventDefault();body.classList.add('over');});
    body.addEventListener('dragleave',()=>body.classList.remove('over'));
    body.addEventListener('drop',e=>{e.preventDefault();body.classList.remove('over');reassignCat(dragId,cat);});
    col.appendChild(addRow);
    kb.appendChild(col);
  });
}
async function addKanban(cat,inp){const n=inp?.value.trim();if(!n)return;const t={id:'l-'+Date.now(),name:n,category:cat,due_date:null,done:false,important:false};st.tasks.push(t);renderAll();inp.value='';const sv=await sbReq('POST','tasks',{name:n,category:cat,due_date:null,done:false});if(sv&&sv[0]){const i=st.tasks.findIndex(x=>x.id===t.id);if(i>-1)st.tasks[i]=sv[0];}
  pushUndo(()=>{st.tasks=st.tasks.filter(x=>x.id!==t.id);renderAll();sbReq('DELETE','tasks',null,`?id=eq.${t.id}`);},'Added task');}
async function reassignCat(id,cat){if(!id)return;const t=st.tasks.find(x=>String(x.id)===String(id));if(!t)return;const prev=t.category;t.category=cat;renderAll();dragId=null;pushUndo(()=>{t.category=prev;renderAll();sbReq('PATCH','tasks',{category:prev},`?id=eq.${id}`);},'Moved category');await sbReq('PATCH','tasks',{category:cat},`?id=eq.${id}`);}

// ── Rubber-band drag-select for list containers ────────────────────────────────
function _attachListRubberBand(container){
  if(!container||container._rbSetup)return;
  container._rbSetup=true;
  container.addEventListener('mousedown',e=>{
    if(e.button!==0)return;
    if(e.target.closest('.chk-wrap,.delbtn,.btn,input,button,a'))return;
    if(e.target.closest('[draggable="true"]'))return;
    e.preventDefault();
    const startX=e.clientX,startY=e.clientY;
    let rbMoved=false,selBox=null;
    const onMove=ev=>{
      const dx=ev.clientX-startX,dy=ev.clientY-startY;
      if(!rbMoved&&Math.sqrt(dx*dx+dy*dy)>5){
        rbMoved=true;
        selBox=document.createElement('div');
        selBox.style.cssText='position:fixed;background:rgba(42,157,181,.12);border:1px solid rgba(42,157,181,.45);border-radius:3px;pointer-events:none;z-index:999;';
        document.body.appendChild(selBox);
      }
      if(selBox){
        const cr=container.getBoundingClientRect();
        const y1=Math.min(startY,ev.clientY),y2=Math.max(startY,ev.clientY);
        selBox.style.left=cr.left+'px';selBox.style.width=cr.width+'px';
        selBox.style.top=y1+'px';selBox.style.height=(y2-y1)+'px';
      }
    };
    const onUp=ev=>{
      document.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseup',onUp);
      if(selBox)selBox.remove();
      if(rbMoved){
        const x1=Math.min(startX,ev.clientX),y1=Math.min(startY,ev.clientY);
        const y2=Math.max(startY,ev.clientY);
        if(!ev.shiftKey)selectedTasks.clear();
        container.querySelectorAll('[id^="ti-"]').forEach(el=>{
          const r=el.getBoundingClientRect();
          if(r.bottom>y1&&r.top<y2){const sid=el.id.replace(/^ti-/,'');if(sid){selectedTasks.add(sid);lastSelectedId=sid;}}
        });
        applySelHighlight();
        container.addEventListener('click',ev2=>ev2.stopPropagation(),{capture:true,once:true});
      }
    };
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
  });
}

// ── Rubber-band from outside timeblock column — selects timeblock blocks ────────
function _attachTBEdgeRubberBand(){
  const cols=document.querySelector('.overview-cols');
  if(!cols||cols._tbEdgeRbSetup)return;
  cols._tbEdgeRbSetup=true;
  cols.addEventListener('mousedown',e=>{
    if(e.button!==0)return;
    if(e.target.closest('.overview-left'))return;
    if(e.target.closest('.card,.wkc-outer,.wkc-inner,.wkc-cols-wrap'))return;
    if(e.target.closest('button,a,input,textarea,select,.chip,.ti,.tb-block,.wkc-banner'))return;
    e.preventDefault();
    const startY=e.clientY;
    let rbMoved=false,selBox=null;
    const onMove=ev=>{
      if(!rbMoved&&Math.abs(ev.clientY-startY)>5){
        rbMoved=true;
        selBox=document.createElement('div');
        selBox.style.cssText='position:fixed;background:rgba(42,157,181,.10);border-top:1.5px solid rgba(42,157,181,.5);border-bottom:1.5px solid rgba(42,157,181,.5);pointer-events:none;z-index:999;';
        document.body.appendChild(selBox);
      }
      if(selBox){
        const y1=Math.min(startY,ev.clientY),y2=Math.max(startY,ev.clientY);
        const x1=Math.min(e.clientX,ev.clientX),x2=Math.max(e.clientX,ev.clientX);
        selBox.style.left=x1+'px';selBox.style.width=(x2-x1)+'px';
        selBox.style.top=y1+'px';selBox.style.height=(y2-y1)+'px';
      }
    };
    const onUp=ev=>{
      document.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseup',onUp);
      if(selBox)selBox.remove();
      if(!rbMoved)return;
      const y1=Math.min(startY,ev.clientY),y2=Math.max(startY,ev.clientY);
      const x1=Math.min(e.clientX,ev.clientX),x2=Math.max(e.clientX,ev.clientX);
      const tbCol=document.querySelector('.tb-col');
      if(!tbCol)return;
      const colRect=tbCol.getBoundingClientRect();
      const selTop=y1-colRect.top,selBot=y2-colRect.top;
      _lastTBRbRange={selTop,selBot};
      if(!ev.shiftKey)selectedTasks.clear();
      tbCol.querySelectorAll('.tb-block[data-bid]').forEach(be=>{
        const bl=st.blocks.find(x=>String(x.id)===String(be.dataset.bid));
        if(!bl)return;
        const br=be.getBoundingClientRect();
        if(br.bottom>y1&&br.top<y2&&br.right>x1&&br.left<x2){const sid=_getTBBlockSelId(bl);if(sid){selectedTasks.add(sid);lastSelectedId=sid;}}
      });
      // Also select auto-blocks in range
      tbCol.querySelectorAll('.atb-block[data-atb-id]').forEach(ae=>{
        const ar=ae.getBoundingClientRect();
        if(ar.bottom>y1&&ar.top<y2&&ar.right>x1&&ar.left<x2)selectedTasks.add('atb::'+ae.dataset.atbId);
      });
      applySelHighlight();
    };
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
  });
}

// ── Rubber-band from empty areas in weekly calendar — selects chips ────────────
function _attachWkcRubberBand(){
  const wrap=document.getElementById('wkcWrap');
  if(!wrap||wrap._wkcRbSetup)return;
  wrap._wkcRbSetup=true;
  wrap.addEventListener('mousedown',e=>{
    if(e.button!==0)return;
    if(e.target.closest('.chip,.ti,.tb-block,.wkc-banner,.wkc-goals-col,.meal-chip,.meal-cell'))return;
    if(e.target.closest('button,a,input,textarea,select'))return;
    const colsEl=document.getElementById('wkcCols');
    if(!colsEl)return;
    const colsRect=colsEl.getBoundingClientRect();
    if(e.clientX<colsRect.left||e.clientX>colsRect.right)return;
    const startX=e.clientX,startY=e.clientY;
    let rbMoved=false,selBox=null;
    const onMove=ev=>{
      const dx=Math.abs(ev.clientX-startX),dy=Math.abs(ev.clientY-startY);
      // Don't activate if drag is primarily horizontal (let calDrag handle travel)
      if(!rbMoved&&dy>5&&dy>dx*2){
        rbMoved=true;
        ev.preventDefault();
        selBox=document.createElement('div');
        selBox.style.cssText='position:fixed;background:rgba(42,157,181,.12);border:1px solid rgba(42,157,181,.45);border-radius:3px;pointer-events:none;z-index:999;';
        document.body.appendChild(selBox);
      }
      if(selBox){
        // Compute X span across covered columns only
        const x1v=Math.min(startX,ev.clientX),x2v=Math.max(startX,ev.clientX);
        const colEls=[...document.querySelectorAll('#wkcCols .wkc-col')];
        let boxLeft=Infinity,boxRight=-Infinity;
        colEls.forEach(c=>{const r=c.getBoundingClientRect();if(r.right>x1v&&r.left<x2v){boxLeft=Math.min(boxLeft,r.left);boxRight=Math.max(boxRight,r.right);}});
        if(boxLeft===Infinity){boxLeft=x1v;boxRight=x2v;}
        const y1=Math.min(startY,ev.clientY),y2=Math.max(startY,ev.clientY);
        selBox.style.left=boxLeft+'px';selBox.style.width=(boxRight-boxLeft)+'px';
        selBox.style.top=y1+'px';selBox.style.height=(y2-y1)+'px';
      }
    };
    const onUp=ev=>{
      document.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseup',onUp);
      if(selBox)selBox.remove();
      if(!rbMoved)return;
      const x1=Math.min(startX,ev.clientX),x2=Math.max(startX,ev.clientX);
      const y1=Math.min(startY,ev.clientY),y2=Math.max(startY,ev.clientY);
      if(!ev.shiftKey)selectedTasks.clear();
      document.querySelectorAll('#wkcCols .chip[data-tid]').forEach(chip=>{
        const r=chip.getBoundingClientRect();
        if(r.bottom>y1&&r.top<y2&&r.right>x1&&r.left<x2){
          const sid=chip.dataset.tid;
          if(sid){selectedTasks.add(sid);lastSelectedId=sid;}
        }
      });
      applySelHighlight();
    };
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
  });
}

// ── Recurring auto-timeblock ──────────────────────────────────────────────────
function getRecAutoTBForDate(ds){
  // Compute week offset from ds to get the right recurring tasks
  const dsDate=new Date(ds+'T00:00:00');
  const today=new Date();today.setHours(0,0,0,0);
  const dsDow=(dsDate.getDay()+6)%7;
  const todDow=(today.getDay()+6)%7;
  const dsMon=new Date(dsDate);dsMon.setDate(dsDate.getDate()-dsDow);
  const todMon=new Date(today);todMon.setDate(today.getDate()-todDow);
  const wOff=Math.round((dsMon-todMon)/(7*86400000));
  const virtTasks=getRecurringWeekTasks(wOff);
  const wkKey=dsToWkKey(ds);
  return virtTasks.filter(v=>{
    if(v.due_date!==ds)return false;
    const r=st.recurring.find(x=>String(x.id)===String(v._recId));
    if(!r||!r.default_start_time)return false;
    // Skip if already manually placed in timeblock
    if(st.blocks.some(b=>b.ds===ds&&String(b.recId)===String(r.id)))return false;
    // Skip if deleted for this week via tb override
    const tbOv=r._dateOverrides&&r._dateOverrides['tb::'+wkKey];
    if(tbOv==='__skip__')return false;
    return true;
  }).map(v=>{
    const r=st.recurring.find(x=>String(x.id)===String(v._recId));
    const wkKey2=dsToWkKey(ds);
    const tbOv=r._dateOverrides&&r._dateOverrides['tb::'+wkKey2];
    const startTime=tbOv&&tbOv.start?tbOv.start:r.default_start_time;
    const endTime=tbOv&&tbOv.end?tbOv.end:r.default_end_time;
    const [sh,sm2]=(startTime||'00:00').split(':');
    const startMinutes=parseInt(sh)*60+parseInt(sm2||0);
    let dur;
    if(endTime){const [eh,em]=endTime.split(':');dur=Math.max(15,parseInt(eh)*60+parseInt(em||0)-startMinutes);}
    else{dur=r.default_tb_duration||60;}
    return{_recAutoId:String(r.id),_recId:String(r.id),label:v.name,sm:startMinutes,dur,ds,_hasOv:!!tbOv};
  });
}
function delRecAutoTBForDay(recId,ds){
  const r=st.recurring.find(x=>String(x.id)===String(recId));if(!r)return;
  const wkKey=dsToWkKey(ds);
  if(!r._dateOverrides)r._dateOverrides={};
  const prev=r._dateOverrides['tb::'+wkKey];
  r._dateOverrides['tb::'+wkKey]='__skip__';
  sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${r.id}`);
  pushUndo(()=>{if(prev!==undefined)r._dateOverrides['tb::'+wkKey]=prev;else delete r._dateOverrides['tb::'+wkKey];sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${r.id}`);save();if(document.getElementById('tbGrid'))renderDayTB();},'Removed recurring from timeblock');
  save();if(document.getElementById('tbGrid'))renderDayTB();
}
function drawRecAutoTBBlock(col,ratb,ds){
  const top=(ratb.sm-HOURS[0]*60)*PX,ht=Math.max(ratb.dur*PX,16);
  const _rec=st.recurring.find(x=>String(x.id)===String(ratb._recId));
  const _wkKey=dsToWkKey(ds);
  const _isDone=!!(_rec&&_rec._doneByWk&&_rec._doneByWk[_wkKey]);
  const el=document.createElement('div');
  el.className='atb-block rec-atb-block'+(_isDone?' done-block':'');
  el.dataset.recAutoId=ratb._recAutoId;
  el.dataset.recId=String(ratb._recId);
  const ncols=ratb._ncols||1,col_i=ratb._col||0,colW=100/ncols,left2=col_i*colW;
  el.style.cssText=`top:${top}px;height:${ht}px;left:calc(${left2}% + 2px);right:calc(${100-left2-colW}% + 2px);width:auto`;
  const _showTime=ncols<=1;
  el.innerHTML=`<div class="tb-row"><input type="checkbox" class="tb-chk" ${_isDone?'checked':''}><span class="tb-bt${ratb.dur>=30?' wrap':''}">${ratb.label}</span><div class="tb-right">${_showTime?`<span class="tb-btime">${tStr(ratb.sm)}-${tStr(ratb.sm+ratb.dur)}</span>`:''}<button class="tb-bdel atb-del" onclick="event.stopPropagation();delRecAutoTBForDay('${ratb._recAutoId}','${ds}')">✕</button></div></div><div class="tb-resize atb-resize"></div>`;
  const _ratbChk=el.querySelector('.tb-chk');
  if(_ratbChk)_ratbChk.addEventListener('change',function(e2){
    e2.stopPropagation();this.blur();
    togRecVirt(String(ratb._recId),this.checked,_wkKey);
  });
  // Resize
  const resH=el.querySelector('.atb-resize');
  if(resH)resH.addEventListener('mousedown',e=>{
    e.stopPropagation();e.preventDefault();
    const startY=e.clientY,startDur=ratb.dur;
    const onResMove=ev=>{ratb.dur=Math.max(15,Math.round((startDur+(ev.clientY-startY)/PX)/15)*15);el.style.height=Math.max(ratb.dur*PX,16)+'px';const bt=el.querySelector('.tb-btime');if(bt)bt.textContent=tStr(ratb.sm)+'-'+tStr(ratb.sm+ratb.dur);const _c=el.closest('.tb-col');if(_c)_relayoutTBCol(_c,ds);};
    const onResUp=()=>{document.removeEventListener('mousemove',onResMove);document.removeEventListener('mouseup',onResUp);if(ratb.dur===startDur)return;_saveRecAutoTBOv(ratb,ds,startDur,ratb.sm);};
    document.addEventListener('mousemove',onResMove);document.addEventListener('mouseup',onResUp);
  });
  // Click for selection (shift/cmd)
  let _ratbDragged=false;
  el.addEventListener('click',e=>{
    if(e.target.classList.contains('atb-del')||e.target.classList.contains('atb-resize')||e.target.classList.contains('tb-chk'))return;
    if(_ratbDragged)return;
    e.stopPropagation();
    const ratbSid='rec-virt-'+ratb._recId;
    if(e.metaKey||e.ctrlKey){if(selectedTasks.has(ratbSid))selectedTasks.delete(ratbSid);else selectedTasks.add(ratbSid);lastSelectedId=ratbSid;}
    else if(e.shiftKey&&lastSelectedId){const col2=el.closest('.tb-col');if(col2){const ids=[];col2.querySelectorAll('.tb-block[data-bid]').forEach(be=>{const bl=st.blocks.find(x=>String(x.id)===String(be.dataset.bid));if(bl){const sid=_getTBBlockSelId(bl);if(sid)ids.push(sid);}});col2.querySelectorAll('.atb-block[data-atb-id]').forEach(ae=>ids.push('atb::'+ae.dataset.atbId));col2.querySelectorAll('.ratb-block[data-rec-id]').forEach(re=>ids.push('rec-virt-'+re.dataset.recId));const ai=ids.indexOf(lastSelectedId),bi2=ids.indexOf(ratbSid);if(ai>-1&&bi2>-1){const lo=Math.min(ai,bi2),hi=Math.max(ai,bi2);ids.slice(lo,hi+1).forEach(x=>selectedTasks.add(x));}else selectedTasks.add(ratbSid);}lastSelectedId=ratbSid;}
    else{selectedTasks.clear();selectedTasks.add(ratbSid);lastSelectedId=ratbSid;}
    applySelHighlight();
  });
  // Drag to move
  el.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('atb-del')||e.target.classList.contains('atb-resize')||e.target.classList.contains('tb-chk'))return;
    if(e.detail>=2){e.stopPropagation();openRecEditModal(ratb._recId,dsToWkKey(ds),'this');return;}
    e.preventDefault();e.stopPropagation();
    const startY=e.clientY,startSm=ratb.sm;
    _ratbDragged=false;let dragging=false;
    const onMove=ev=>{const dy=ev.clientY-startY;if(!dragging&&Math.abs(dy)<5)return;dragging=true;_ratbDragged=true;ratb.sm=Math.max(HOURS[0]*60,Math.round((startSm+dy/PX)/15)*15);el.style.top=(ratb.sm-HOURS[0]*60)*PX+'px';const bt=el.querySelector('.tb-btime');if(bt)bt.textContent=tStr(ratb.sm)+'-'+tStr(ratb.sm+ratb.dur);const _c=el.closest('.tb-col');if(_c)_relayoutTBCol(_c,ds);};
    const onUp=()=>{document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);if(!dragging||ratb.sm===startSm)return;_saveRecAutoTBOv(ratb,ds,ratb.dur,startSm);};
    document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
  });
  // Drop zone for tasks
  el.addEventListener('dragover',e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();el.classList.add('tb-drop-over');});
  el.addEventListener('dragleave',()=>el.classList.remove('tb-drop-over'));
  el.addEventListener('drop',e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();el.classList.remove('tb-drop-over');dropOnTB(e,ds,null,null,ratb.sm);});
  col.appendChild(el);
}
function _saveRecAutoTBOv(ratb,ds,prevDur,prevSm){
  const r=st.recurring.find(x=>String(x.id)===String(ratb._recId));if(!r)return;
  const wkKey=dsToWkKey(ds);
  if(!r._dateOverrides)r._dateOverrides={};
  const prevOv=r._dateOverrides['tb::'+wkKey];
  const newStart=`${String(Math.floor(ratb.sm/60)).padStart(2,'0')}:${String(ratb.sm%60).padStart(2,'0')}`;
  const endSm=ratb.sm+ratb.dur;
  const newEnd=`${String(Math.floor(endSm/60)).padStart(2,'0')}:${String(endSm%60).padStart(2,'0')}`;
  r._dateOverrides['tb::'+wkKey]={start:newStart,end:newEnd};
  sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${r.id}`);
  pushUndo(()=>{ratb.sm=prevSm;ratb.dur=prevDur;if(prevOv!==undefined)r._dateOverrides['tb::'+wkKey]=prevOv;else delete r._dateOverrides['tb::'+wkKey];sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${r.id}`);save();if(document.getElementById('tbGrid'))renderDayTB();},'Moved recurring block');
  save();if(document.getElementById('tbGrid'))renderDayTB();
}
// ── Time blocker ───────────────────────────────────────────────────────────────
function renderDayTB(){
  if(window._tbEditing)return;
  const date=getDayDate(dayOff),ds=d2s(date);
  const lbl=document.getElementById('dayLbl');if(lbl)lbl.textContent=isDateToday(date)?`Today ${date.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`:date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const grid=document.getElementById('tbGrid');if(!grid)return;grid.innerHTML='';
  // Ensure tb-scroll allows drag events through
  const tbSc=document.getElementById('tbScroll');
  if(tbSc&&!tbSc._dragBound){tbSc._dragBound=true;tbSc.addEventListener('dragover',e=>e.preventDefault(),{passive:false});}
  const gut=document.createElement('div');gut.className='tb-gutter';
  const _dow=new Date(ds+'T00:00:00').getDay(),_isWkday=_dow>=1&&_dow<=5;
  HOURS.forEach(h=>{const l=document.createElement('div');l.className='tb-tlbl';l.textContent=h===12?'12p':h>12?`${h-12}p`:`${h}a`;if(_isWkday&&(h===8||h===16)){l.style.color=_dk()?'rgba(255,220,200,.8)':'rgba(90,65,40,.95)';l.style.fontWeight='700';}gut.appendChild(l);});
  grid.appendChild(gut);
  const col=document.createElement('div');col.className='tb-col';
  HOURS.forEach(h=>{
    const row=document.createElement('div');row.className='tb-hour';
    row.addEventListener('dragover',e=>{e.preventDefault();row.classList.add('don');});
    row.addEventListener('dragleave',()=>row.classList.remove('don'));
    row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('don');dropOnTB(e,ds,h,row);});
    // Double-click: create 30min block instantly at that time slot
    row.addEventListener('dblclick',e=>{
      if(e.target.classList.contains('tb-block')||e.target.closest('.tb-block'))return;
      const rowRect2=row.getBoundingClientRect();
      const frac2=(e.clientY-rowRect2.top)/rowRect2.height;
      const minsInRow2=Math.round(frac2*60/15)*15;
      const sm=h*60+Math.max(0,Math.min(45,minsInRow2));
      const blk={id:crypto.randomUUID(),title:'',ds,sm,dur:30,cat:'Home'};
      st.blocks.push(blk);
      // Don't save() yet — block only persists after inline edit commits
      // Compute layout (handles overlap) then redraw all blocks in col
      computeTBLayout(ds);
      // Remove existing blocks from col and redraw all with correct positions
      col.querySelectorAll('.tb-block').forEach(el=>el.remove());
      getVisibleBlocks(ds).forEach(b=>drawTBBlock(col,b));
      startTBInlineEdit(blk.id,col,()=>{
        pushUndo(()=>{st.blocks=st.blocks.filter(b=>b.id!==blk.id);save();renderDayTB();},'Added block');
      });
    });
    col.appendChild(row);
  });
  // Auto-create birthday blocks at 7:30am if not already placed
  getBirthdayTasks(ds).forEach(bt=>{
    if(st.blocks.some(b=>b.ds===ds&&b.cat==='Birthday'&&b.title===bt.name))return;
    const blk={id:'bday-auto-'+bt._srcId+'-'+ds,title:bt.name,ds,sm:450,dur:30,cat:'Birthday'};
    st.blocks.push(blk);sbSaveBlock(blk);save();
  });
  // Compute layout then draw (auto blocks participate in overlap calc)
  const autoBlocks=getAutoTBForDate(ds);
  const recAutoBlocks=getRecAutoTBForDate(ds);
  computeTBLayout(ds,[...autoBlocks,...recAutoBlocks]);
  getVisibleBlocks(ds).forEach(b=>drawTBBlock(col,b));
  autoBlocks.forEach(a=>drawAutoTBBlock(col,a,ds));
  recAutoBlocks.forEach(a=>drawRecAutoTBBlock(col,a,ds));
  // autoTBToggle opacity no longer needed — button opens manager now
  if(isDateToday(date)){const nl=document.createElement('div');nl.className='nowline';nl.id='tbNowLine';const nm=new Date(),nmins=(nm.getHours()-HOURS[0])*60+nm.getMinutes();if(nmins>=0){nl.style.top=nmins*PX+'px';nl.innerHTML='<div class="nowdot"></div>';}col.appendChild(nl);}
  // Drag on empty space: DOWN = create new block, UP = select multiple blocks
  col.addEventListener('mousedown',e=>{
    if(e.button!==0||e.target.closest('.tb-block,.atb-block'))return;
    if(window._tbEditing){const ei=col.querySelector('.tb-edit');if(ei)ei.blur();return;}
    e.preventDefault();
    const colRect=col.getBoundingClientRect();
    const startRelY=Math.max(0,e.clientY-colRect.top);
    const startClientY=e.clientY,startClientX=e.clientX;
    const snap=y=>Math.round((HOURS[0]*60+y/PX)/15)*15;
    let mode=null; // null until threshold, then 'create' or 'select'
    let preview=null,selBox=null;
    const onMove=ev=>{
      const curClientY=ev.clientY;
      const curRelY=Math.max(0,curClientY-col.getBoundingClientRect().top);
      const dy=curClientY-startClientY;
      if(!mode&&Math.abs(dy)<5)return;
      if(!mode){
        mode=dy>0?'create':'select';
        if(mode==='create'){
          preview=document.createElement('div');
          preview.style.cssText='position:absolute;left:2px;right:2px;background:rgba(42,157,181,.18);border:1.5px dashed rgba(42,157,181,.7);border-radius:5px;pointer-events:none;z-index:50;box-sizing:border-box;';
          preview.style.top=startRelY+'px';preview.style.height='0px';
          col.appendChild(preview);
        } else {
          selBox=document.createElement('div');
          selBox.style.cssText='position:fixed;background:rgba(42,157,181,.10);border-top:1.5px solid rgba(42,157,181,.5);border-bottom:1.5px solid rgba(42,157,181,.5);pointer-events:none;z-index:999;left:0;right:0';
          document.body.appendChild(selBox);
        }
      }
      if(mode==='create'){
        const top2=Math.min(startRelY,curRelY),bot2=Math.max(startRelY,curRelY);
        const smSnap=snap(top2),emSnap=snap(bot2);
        const snappedTop=(smSnap-HOURS[0]*60)*PX,snappedBot=(emSnap-HOURS[0]*60)*PX;
        preview.style.top=snappedTop+'px';preview.style.height=Math.max(15*PX,snappedBot-snappedTop)+'px';
      } else {
        const y1=Math.min(startClientY,curClientY),y2=Math.max(startClientY,curClientY);
        const x1=Math.min(startClientX,ev.clientX),x2=Math.max(startClientX,ev.clientX);
        selBox.style.left=x1+'px';selBox.style.width=(x2-x1)+'px';
        selBox.style.top=y1+'px';selBox.style.height=(y2-y1)+'px';
      }
    };
    const onUp=ev=>{
      document.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseup',onUp);
      if(preview)preview.remove();
      if(selBox)selBox.remove();
      if(!mode){_tbPasteSm=snap(startRelY);return;}
      if(mode==='create'){
        const curRelY=Math.max(0,ev.clientY-col.getBoundingClientRect().top);
        const top2=Math.min(startRelY,curRelY),bot2=Math.max(startRelY,curRelY);
        const sm=snap(top2),em=snap(bot2);
        const dur=Math.max(15,em-sm);
        const blk={id:crypto.randomUUID(),title:'',ds,sm,dur,cat:'Home'};
        st.blocks.push(blk);
        computeTBLayout(ds);
        col.querySelectorAll('.tb-block').forEach(el=>el.remove());
        getVisibleBlocks(ds).forEach(b=>drawTBBlock(col,b));
        startTBInlineEdit(blk.id,col,()=>{
          pushUndo(()=>{st.blocks=st.blocks.filter(b=>b.id!==blk.id);save();renderDayTB();},'Added block');
        });
      } else {
        // Select blocks in range (check both X and Y overlap with actual element bounds)
        const y1=Math.min(startClientY,ev.clientY),y2=Math.max(startClientY,ev.clientY);
        const x1=Math.min(startClientX,ev.clientX),x2=Math.max(startClientX,ev.clientX);
        const colRect2=col.getBoundingClientRect();
        const selTop=y1-colRect2.top,selBot=y2-colRect2.top;
        _lastTBRbRange={selTop,selBot};
        if(!ev.shiftKey)selectedTasks.clear();
        col.querySelectorAll('.tb-block[data-bid]').forEach(be=>{
          const bl=st.blocks.find(x=>String(x.id)===String(be.dataset.bid));
          if(!bl)return;
          const br=be.getBoundingClientRect();
          if(br.bottom>y1&&br.top<y2&&br.right>x1&&br.left<x2){const sid=_getTBBlockSelId(bl);if(sid){selectedTasks.add(sid);lastSelectedId=sid;}}
        });
        // Also select auto-blocks in range
        col.querySelectorAll('.atb-block[data-atb-id]').forEach(ae=>{
          const ar=ae.getBoundingClientRect();
          if(ar.bottom>y1&&ar.top<y2&&ar.right>x1&&ar.left<x2)selectedTasks.add('atb::'+ae.dataset.atbId);
        });
        col.querySelectorAll('.ratb-block[data-rec-id]').forEach(re=>{
          const rr=re.getBoundingClientRect();
          if(rr.bottom>y1&&rr.top<y2&&rr.right>x1&&rr.left<x2)selectedTasks.add('rec-virt-'+re.dataset.recId);
        });
        applySelHighlight();
      }
    };
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
  });
  grid.appendChild(col);renderTBSum(ds);requestAnimationFrame(applySelHighlight);
  // Default scroll to current time minus 1 hour; reset when day changes but preserve position mid-session
  const tbSc2=document.getElementById('tbScroll');
  if(tbSc2&&tbSc2._scrollDay!==ds){const _scrollVal=Math.round((6.5-HOURS[0])*60*PX);tbSc2.scrollTop=_scrollVal;if(tbSc2.scrollTop===_scrollVal){tbSc2._scrollDay=ds;}else{tbSc2._scrollDay=null;}}
}
function getVisibleBlocks(ds){
  const isViewingToday=(ds===d2s(getDayDate(0)));
  return st.blocks.filter(b=>{
    if(b.ds!==ds)return false;
    if(b.taskId){
      const t=st.tasks.find(x=>String(x.id)===String(b.taskId));
      if(!t||t.category==='Weekly Goals')return false;
      const tds=(t.due_date||'').split('T')[0];if(tds&&tds!==ds&&!(isViewingToday&&isOv(t.due_date)&&!t.done))return false;
    } else if(b.recId){
      const rec=st.recurring.find(x=>String(x.id)===String(b.recId));
      if(rec){
        const wkk=dsToWkKey(ds);
        if(rec._dateOverrides&&rec._dateOverrides[wkk]!==undefined&&rec._dateOverrides[wkk]!==ds)return false;
      } else {
        const r=st.wrRules.find(x=>String(x.id)===String(b.recId));
        if(!r)return false;
        const wkk=dsToWkKey(ds);
        if(r._dateOverrides&&r._dateOverrides[wkk]!==undefined&&r._dateOverrides[wkk]!==ds)return false;
      }
    } else if(b.ruleId){
      const r=st.wrRules.find(x=>String(x.id)===String(b.ruleId));
      if(!r)return false;
      const wkk=dsToWkKey(ds);
      if(r._dateOverrides&&r._dateOverrides[wkk]!==undefined&&r._dateOverrides[wkk]!==ds)return false;
    } else {
      const t=st.tasks.find(x=>x.name===b.title&&!x.done);
      if(t){const tds=(t.due_date||'').split('T')[0];if(tds&&tds!==ds&&!(isViewingToday&&isOv(t.due_date)))return false;}
    }
    return true;
  });
}
function computeTBLayout(ds,extraBlocks=[]){
  const blocks=[...getVisibleBlocks(ds),...extraBlocks];
  const sorted=[...blocks].sort((a,b)=>a.sm-b.sm||(b.dur-a.dur));
  const colEnds=[];
  sorted.forEach(b=>{
    let placed=false;
    for(let i=0;i<colEnds.length;i++){
      if(b.sm>=colEnds[i]){colEnds[i]=b.sm+b.dur;b._col=i;placed=true;break;}
    }
    if(!placed){b._col=colEnds.length;colEnds.push(b.sm+b.dur);}
  });
  sorted.forEach(b=>{
    let maxCol=0;
    sorted.forEach(b2=>{if(b2.sm<b.sm+b.dur&&b2.sm+b2.dur>b.sm)maxCol=Math.max(maxCol,b2._col);});
    b._ncols=maxCol+1;
  });
}
function _relayoutTBCol(col,ds){
  const autoBlocks=getAutoTBForDate(ds);
  const recAutoBlocks=getRecAutoTBForDate(ds);
  computeTBLayout(ds,[...autoBlocks,...recAutoBlocks]);
  col.querySelectorAll('.tb-block[data-bid]').forEach(el=>{
    const b=st.blocks.find(x=>String(x.id)===el.dataset.bid);
    if(!b)return;
    const ncols=b._ncols||1,col_i=b._col||0,colW=100/ncols,left=col_i*colW;
    el.style.left=`calc(${left}% + 2px)`;el.style.right=`calc(${100-left-colW}% + 2px)`;
  });
  col.querySelectorAll('.atb-block[data-atb-id]').forEach(el=>{
    const a=[...autoBlocks,...recAutoBlocks].find(x=>x._atbId===el.dataset.atbId);
    if(!a)return;
    const ncols=a._ncols||1,col_i=a._col||0,colW=100/ncols,left=col_i*colW;
    el.style.left=`calc(${left}% + 2px)`;el.style.right=`calc(${100-left-colW}% + 2px)`;
  });
}
function _getTBBlockSelId(bl){if(bl.cat==='pup_session'&&bl._pupSessId)return'pup-sess-'+String(bl._pupSessId);if(bl._finCancelSubId)return'fin-cancel-'+String(bl._finCancelSubId);if(bl._vidStepVid)return'blk-'+bl.id;if(bl._vidId)return'blk-'+bl.id;if(bl.cat==='Birthday')return'blk-'+bl.id;if(bl.ruleId)return'blk-'+bl.id;if(bl.recId&&(st.wrRules||[]).some(x=>String(x.id)===String(bl.recId)))return'blk-'+bl.id;const r=bl.recId?st.recurring.find(x=>String(x.id)===String(bl.recId)):null;const iw=r&&(r.is_weekly_reset===true||r.is_weekly_reset==='true');return bl.taskId?'blk-'+bl.id:bl.recId?(iw?'wrec-':'rec-virt-')+bl.recId:bl.shopId?'blk-'+bl.id:'blk-'+bl.id;}
function drawTBBlock(col,b){
  // Reconstruct vidstep data from title if not set (after page refresh)
  if(!b._vidStepVid&&b.cat==='Videos'&&!b._vidId){
    const _vsm=_vidStepDayMap();
    for(const [key,val] of Object.entries(_vsm)){
      if(val.ds!==b.ds)continue;
      const [vid,step]=key.split('::');
      const v=(st.videos||[]).find(x=>String(x.id)===vid&&!x.is_deleted);
      if(!v)continue;
      const lbl=(_VID_STEP_LABELS[step]||step.replace('step_',''))+': '+(v.topic||v.title);
      if(b.title===lbl){b._vidStepVid=vid;b._vidStepName=step;break;}
    }
  }
  const top=(b.sm-HOURS[0]*60)*PX,ht=Math.max(b.dur*PX,16);
  const linkedTask=b.taskId?st.tasks.find(x=>String(x.id)===String(b.taskId)):null;
  const linkedRec=b.recId?(st.recurring.find(x=>String(x.id)===String(b.recId))||st.wrRules.find(x=>String(x.id)===String(b.recId))):null;
  const linkedShop=b.shopId?st.shopping.find(x=>String(x.id)===String(b.shopId)):null;
  // Derive done from linked item (authoritative) so stale block._done never causes mismatch
  const _wrRuleId=b.ruleId||(b.recId&&st.wrRules.some(x=>String(x.id)===String(b.recId))?b.recId:null);
  if(linkedTask)b._done=!!linkedTask.done;
  else if(_wrRuleId)b._done=isDoneWRRule(_wrRuleId,dsToWkKey(b.ds));
  else if(linkedRec)b._done=!!(linkedRec._doneByWk&&linkedRec._doneByWk[dsToWkKey(b.ds)]);
  else if(linkedShop)b._done=!!linkedShop.done;
  else if(b._vidId){const _vb2=(st.videos||[]).find(x=>String(x.id)===String(b._vidId));if(_vb2)b._done=_vb2.status==='published';}
  else if(b._finCancelSubId){b._done=typeof _finCancelDone!=='undefined'&&_finCancelDone.has(String(b._finCancelSubId));}
  const isImp=linkedTask&&linkedTask.important&&!linkedTask.done;
  const linkedRule=b.ruleId?st.wrRules.find(x=>String(x.id)===String(b.ruleId)):null;
  const recCat=linkedRec?(linkedRec.is_weekly_reset===false?'recurring':'weekly_reset'):null;
  const effectiveCat=linkedTask?linkedTask.category:recCat||(linkedRule?'weekly_reset':null)||(b.cat||'Home');
  const isPupBlock=b.cat==='pup_session';
  const isPostTab=linkedTask&&linkedTask.notes&&linkedTask.notes.startsWith('_vid:');
  const isFinCancel=!!b._finCancelSubId;
  const s=isFinCancel?_IMP():isImp?_IMP():isPupBlock?_pupSessStyle():isPostTab?(_dk()?{bg:'rgba(22,163,74,.12)',t:'#86efac',d:'#16a34a',b:'rgba(22,163,74,.20)'}:{bg:'rgba(22,163,74,.18)',t:'#166534',d:'#16a34a',b:'rgba(22,163,74,.35)'}):gc(effectiveCat);
  const el=document.createElement('div');
  el.className='tb-block'+(b._done?' done-block':'');el.dataset.bid=b.id;
  el.addEventListener('contextmenu',e=>{
    if(b.taskId)showCtx(e,b.taskId,false,null,null,b.id);
    else if(b.recId)showCtx(e,'rec-virt-'+b.recId,true,b.recId,null,b.id);
    else if(b.shopId){showCtxShop(e,b.shopId);document.getElementById('ctxMenu')._blockId=b.id;}
  });
  // Allow dragging tasks from Today list directly onto an existing block (creates overlap at same start time)
  el.addEventListener('dragover',e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();el.classList.add('tb-drop-over');});
  el.addEventListener('dragleave',()=>el.classList.remove('tb-drop-over'));
  el.addEventListener('drop',e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();el.classList.remove('tb-drop-over');dropOnTB(e,b.ds,null,null,b.sm);});
  const ncols=b._ncols||1,col_i=b._col||0;
  const colW=100/ncols;
  const left=col_i*colW;
  el.style.cssText=`top:${top}px;height:${ht}px;background:${s.bg};color:${s.t};border-color:${s.b};left:calc(${left}% + 2px);right:calc(${100-left-colW}% + 2px);width:auto`;
  const _showTime=(b._ncols||1)<=1;
  const _linkedTask=b.taskId?st.tasks.find(t=>String(t.id)===String(b.taskId)):null;
  const _linkedRec=b.recId?st.recurring.find(r=>String(r.id)===String(b.recId)):null;
  const _rawNotes=(_linkedTask&&_linkedTask.notes)||(_linkedRec&&_linkedRec.notes)||'';
  const _notes=(_rawNotes&&_rawNotes.startsWith('_vid:'))?'':_rawNotes;
  const _tbWkNote=_linkedRec?_recWkNote(_linkedRec,dsToWkKey(b.ds)):(linkedRule?_recWkNote(linkedRule,dsToWkKey(b.ds)):'');
  const _allNotes=[_notes,_tbWkNote].filter(Boolean).join('\n');
  const _notesHtml=_allNotes?`<div class="tb-notes">${_allNotes.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</div>`:'';
  let _displayTitle=(_linkedTask&&_linkedTask.name)||(_linkedRec&&_linkedRec.name)||(linkedShop&&linkedShop.name)||b.title;
  if(isPupBlock){const _ps=b._pupSessId?(st.pupSessions||[]).find(s=>String(s.id)===String(b._pupSessId)):null;const _sk=_ps?(st.pup_skills||[]).find(x=>String(x.id)===String(_ps.skill_id)):null;const _pup=_sk?.pup;if(_pup)_displayTitle=_pup+': '+_displayTitle;}
  let _vidStepsHtml='';let _vidWhiteBg=false;
  if(b._vidId&&b.dur>=60){
    const _vb=(st.videos||[]).find(x=>String(x.id)===String(b._vidId));
    if(_vb){const _steps=typeof VID_STEPS_CORE!=='undefined'?VID_STEPS_CORE:(typeof VID_STEPS!=='undefined'?VID_STEPS:[]);const _app=_steps.filter(s=>_vb[s]!=='na');
      const _lbls=typeof VID_STEP_LABELS!=='undefined'?VID_STEP_LABELS:{};
      _vidStepsHtml=`<div class="tb-vid-steps" style="display:flex;align-items:flex-end;gap:4px;padding:4px 8px 6px;flex-wrap:wrap;flex:1">${_app.map(s=>{const _dn=_vb[s]==='done';const _ltr=(_lbls[s]||s).charAt(0).toUpperCase();return`<div class="vid-step-dot tb-vsd${_dn?' done':''}" data-vid="${b._vidId}" data-step="${s}" title="${_lbls[s]||s}" style="width:13px;height:13px;cursor:pointer;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;line-height:1">${_dn?'':_ltr}</div>`;}).join('')}</div>`;
      _vidWhiteBg=true;
    }
  }
  if(_vidWhiteBg)el.style.cssText+=`;background:${_dk()?'rgba(34,197,94,.12)':'rgba(255,255,255,.88)'};color:${_dk()?'#86efac':'#15803d'};border-color:rgba(34,197,94,.25)`;
  // Vid step block: add stage complete square
  let _vidStepSquareHtml='';
  if(b._vidStepVid&&b._vidStepName&&b._vidStepName!=='step_thumbnail'&&b._vidStepName!=='step_description'){
    const _vsV2=(st.videos||[]).find(x=>String(x.id)===String(b._vidStepVid));
    const _vsDone=_vsV2&&_vsV2[b._vidStepName]==='done';
    _vidStepSquareHtml=`<div class="tb-vstep-sq${_vsDone?' done':''}" data-vid="${b._vidStepVid}" data-step="${b._vidStepName}" title="${_vsDone?'Stage complete':'Complete stage'}" style="width:9px;height:9px;border:1.5px solid rgba(34,197,94,.5);border-radius:1.5px;cursor:pointer;flex-shrink:0;margin-right:3px;margin-top:-1px;display:inline-flex;align-items:center;justify-content:center;background:${_vsDone?'#16a34a':'transparent'}"></div>`;
  }
  // Post Tab tasks: link button replaces time, double-click opens video edit
  let _copyLinkHtml='';let _ptVidId=null;
  if(isPostTab){
    _ptVidId=linkedTask.notes.replace('_vid:','');
    const _ptVid=(st.videos||[]).find(x=>String(x.id)===String(_ptVidId));
    if(_ptVid&&_ptVid.youtube_url)_copyLinkHtml=`<button class="tb-copy-link" data-url="${_ptVid.youtube_url.replace(/"/g,'&quot;')}" title="Copy YouTube link" style="background:none;border:none;cursor:pointer;padding:0;flex-shrink:0;display:inline-flex;align-items:center;margin-right:2px;color:#15803d;position:relative;top:-1px"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>`;
  }
  const _showTimeHere=_showTime&&!isPostTab&&!b._vidStepVid;
  const _tbBadgePrefix=_hebBadge(_displayTitle)+_pupBadge(_displayTitle);
  el.innerHTML=`<div class="tb-row"><input type="checkbox" class="tb-chk" ${b._done?'checked':''}>${_tbBadgePrefix}<span class="tb-bt${b.dur>=30?' wrap':''}">${_displayTitle}</span><div class="tb-right">${_vidStepSquareHtml}${_showTimeHere?`<span class="tb-btime">${tStr(b.sm)}-${tStr(b.sm+b.dur)}</span>`:''}${_copyLinkHtml}<button class="tb-bdel" onclick="delBlock('${b.id}',event)">✕</button></div></div>${_vidStepsHtml}${_notesHtml}<div class="tb-resize" data-id="${b.id}"></div>`;
  if(b._vidId)el.querySelectorAll('.vid-step-dot[data-step]').forEach(dot=>{
    dot.addEventListener('click',e=>{e.stopPropagation();if(typeof _vidOvToggleStep==='function')_vidOvToggleStep(dot.dataset.vid,dot.dataset.step);});
  });
  const _vstSq=el.querySelector('.tb-vstep-sq');
  if(_vstSq)_vstSq.addEventListener('click',e=>{
    e.stopPropagation();
    const vid=_vstSq.dataset.vid,step=_vstSq.dataset.step;
    const v=(st.videos||[]).find(x=>String(x.id)===String(vid));if(!v)return;
    const prevVal=v[step];const newVal=prevVal==='done'?'not_started':'done';
    v[step]=newVal;
    sbReqSilent('PATCH','videos',{[step]:newVal},`?id=eq.${v.id}`);
    // Sync daymap + timeblock blocks to match stage state
    // Stage square marks ALL instances (including later ones) done/undone
    const m=_vidStepDayMap();const key=vid+'::'+step;
    const _prevBlkStates=[];
    (st.blocks||[]).forEach(bl=>{if(String(bl._vidStepVid)===String(vid)&&bl._vidStepName===step){_prevBlkStates.push({id:bl.id,done:bl._done});const want=newVal==='done';if(bl._done!==want){bl._done=want;sbUpdateBlock(bl.id,{done:want});}}});
    if(newVal==='done'){
      if(m[key]){m[key].done=true;_vidStepDayMapSet(m);}
    } else {
      if(m[key]){m[key].done=false;_vidStepDayMapSet(m);}
    }
    pushUndo(()=>{v[step]=prevVal;sbReqSilent('PATCH','videos',{[step]:prevVal},`?id=eq.${v.id}`);_prevBlkStates.forEach(s=>{const bl2=st.blocks.find(x=>x.id===s.id);if(bl2){bl2._done=s.done;sbUpdateBlock(bl2.id,{done:s.done});}});const m2=_vidStepDayMap();if(m2[key]){m2[key].done=prevVal==='done';_vidStepDayMapSet(m2);}save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();},'Stage toggle');
    save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    const panel=document.getElementById('vidOvPanel');if(panel&&panel.style.display==='block')_renderVidOvMenu();
  });
  const _clBtn=el.querySelector('.tb-copy-link');
  if(_clBtn)_clBtn.addEventListener('click',e=>{e.stopPropagation();navigator.clipboard.writeText(_clBtn.dataset.url);_clBtn.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';setTimeout(()=>{_clBtn.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';},1500);});
  const _tbHebBtn=el.querySelector('.heb-cnt');
  if(_tbHebBtn)_tbHebBtn.addEventListener('click',e=>{e.stopPropagation();openGroceryModal();});
  const _tbPupBtn=el.querySelector('.pup-link-badge');
  if(_tbPupBtn)_tbPupBtn.addEventListener('click',e=>{e.stopPropagation();if(typeof _openPupFocusModal==='function')_openPupFocusModal(null);});
  const tbChk=el.querySelector('.tb-chk');
  if(tbChk)tbChk.addEventListener('change',function(e){
    e.stopPropagation();
    this.blur();
    const checked=this.checked;
    const _origDone=b._done;// capture BEFORE any mutation
    b._done=checked;
    el.classList.toggle('done-block',b._done);
    sbUpdateBlock(b.id,{done:checked});
    if(b.taskId){
      toggleTask(b.taskId,checked,'tb');
    } else if(b.ruleId||st.wrRules.some(x=>String(x.id)===String(b.recId))){
      togWrRule(String(b.ruleId||b.recId),checked,dsToWkKey(b.ds));
    } else if(b.recId){
      const _lr=st.recurring.find(x=>String(x.id)===String(b.recId));
      const _isWr=_lr&&(_lr.is_weekly_reset===true||_lr.is_weekly_reset==='true');
      const _bwk=dsToWkKey(b.ds);
      if(_isWr)togRec(String(b.recId),checked,_bwk);
      else togRecVirt(String(b.recId),checked,_bwk);
    } else if(b.shopId){
      togShop(String(b.shopId),checked);
    } else if(b._vidStepVid){
      // Block already toggled above; now sync daymap (only done when ALL same-day blocks done)
      _vidStepToggleDone(b._vidStepVid,b._vidStepName,checked,true);
      pushUndo(()=>{b._done=_origDone;sbUpdateBlock(b.id,{done:_origDone});_vidStepToggleDone(b._vidStepVid,b._vidStepName,!checked,true);save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();},'Step checkbox');
    } else if(b._vidId){
      b._done=checked;sbUpdateBlock(b.id,{done:checked});save();renderToday();renderWkSummary();renderWkCal();
    } else if(b.cat==='pup_session'&&b._pupSessId){
      togPupSessionDone(String(b._pupSessId),checked);
    } else if(b._finCancelSubId){
      togFinCancelDone(String(b._finCancelSubId),checked);
    } else {
      if(b.cat==='Birthday'){
        b._done=checked;sbUpdateBlock(b.id,{done:checked});save();renderToday();renderWkSummary();renderWkCal();
      } else {
        const mT=st.tasks.find(x=>x.name===b.title);
        const mR=st.recurring.find(x=>x.name===b.title);
        const mS=st.shopping.find(x=>x.name===b.title);
        if(mT)toggleTask(mT.id,checked,'tb');
        else if(mR)togRec(String(mR.id),checked);
        else if(mS)togShop(String(mS.id),checked);
        else save();
      }
    }
  });
  const tbRes=el.querySelector('.tb-resize');
  if(tbRes)tbRes.addEventListener('mousedown',e=>{
    e.stopPropagation();e.preventDefault();
    const tbSelId=_getTBBlockSelId(b);
    const multiIds=tbSelId&&selectedTasks.has(tbSelId)&&selectedTasks.size>1?[...selectedTasks].filter(s=>s.startsWith('blk-')).map(s=>s.replace('blk-','')):[];
    const others=multiIds.filter(id=>id!==b.id).map(id=>{const bl=st.blocks.find(x=>String(x.id)===id);return bl?{id,sd:bl.dur}:null;}).filter(Boolean);
    resizing={id:b.id,sy:e.clientY,sd:b.dur,others};
    document.addEventListener('mousemove',onRM);document.addEventListener('mouseup',onRU);
  });
  let tbDragging=false,tbOnMove=null,tbOnUp=null;
  function _tbSelId(){return _getTBBlockSelId(b);}
  function _tbBlockSelId(bl){return _getTBBlockSelId(bl);}
  el.addEventListener('click',e=>{
    if(e.target.classList.contains('tb-resize')||e.target.classList.contains('tb-bdel')||e.target.classList.contains('tb-chk')||e.target.classList.contains('vid-step-dot')||e.target.classList.contains('tb-copy-link'))return;
    if(tbDragging)return;
    e.stopPropagation();
    const tbSelId=_tbSelId();if(!tbSelId)return;
    if(e.metaKey||e.ctrlKey){if(selectedTasks.has(tbSelId))selectedTasks.delete(tbSelId);else selectedTasks.add(tbSelId);lastSelectedId=tbSelId;}
    else if(e.shiftKey&&lastSelectedId){const col2=el.closest('.tb-col')||document.getElementById('tbScroll');const ids=[];if(col2){col2.querySelectorAll('.tb-block[data-bid],.atb-block[data-atb-id]').forEach(be=>{if(be.dataset.bid){const bl=st.blocks.find(x=>String(x.id)===String(be.dataset.bid));if(bl){const sid=_tbBlockSelId(bl);if(sid)ids.push(sid);}}else if(be.dataset.atbId){ids.push('atb::'+be.dataset.atbId);}});}const ai=ids.indexOf(lastSelectedId),bi2=ids.indexOf(tbSelId);if(ai>-1&&bi2>-1){const lo=Math.min(ai,bi2),hi=Math.max(ai,bi2);ids.slice(lo,hi+1).forEach(x=>selectedTasks.add(x));}else selectedTasks.add(tbSelId);lastSelectedId=tbSelId;}
    else{selectedTasks.clear();selectedTasks.add(tbSelId);lastSelectedId=tbSelId;}
    applySelHighlight();
  });
  el.addEventListener('dblclick',e=>{
    if(e.target.classList.contains('tb-resize')||e.target.classList.contains('tb-bdel')||e.target.classList.contains('tb-chk')||e.target.classList.contains('vid-step-dot')||e.target.classList.contains('tb-copy-link'))return;
    e.stopPropagation();
    clearSelection();
    if(b.cat==='pup_session'){const _ps=b._pupSessId?(st.pupSessions||[]).find(s=>String(s.id)===String(b._pupSessId)):null;const _sk=_ps?(st.pup_skills||[]).find(x=>String(x.id)===String(_ps.skill_id)):((st.pup_skills||[]).find(x=>x.skill===b.title));if(_sk)openPupEditModal(_sk.id);}
    else if(b._vidStepVid){if(typeof openVidEdit==='function')openVidEdit(b._vidStepVid);}
    else if(b._vidId){if(typeof openVidEdit==='function')openVidEdit(b._vidId);}
    else if(isPostTab&&_ptVidId){if(typeof openVidEdit==='function')openVidEdit(_ptVidId);}
    else if(b.taskId){openEditTask(b.taskId);}
    else if(b.ruleId){openWrEditModal(String(b.ruleId),dsToWkKey(b.ds),'this');}
    else if(b.recId){openRecEditModal(String(b.recId),dsToWkKey(b.ds),'this');}
    else if(b._finCancelSubId){showPage('finance');}
    else{startTBInlineEdit(b.id,el.closest('.tb-col'));}
  });
  el.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('tb-resize')||e.target.classList.contains('tb-bdel')||e.target.classList.contains('tb-chk')||e.target.classList.contains('vid-step-dot')||e.target.classList.contains('tb-copy-link'))return;
    if(e.detail>=2)return;
    e.stopPropagation();
    const startY=e.clientY,startSm=b.sm;
    tbDragging=false;
    // Multi-select drag: if this block is in a multi-selection, move all selected blocks + selected auto-blocks
    const tbSelId=_tbSelId();
    const isMultiDrag=tbSelId&&selectedTasks.has(tbSelId)&&selectedTasks.size>1;
    let multiBlocks=null,multiAutoBlocks=null;
    if(isMultiDrag){
      const col2=el.closest('.tb-col');
      if(col2){
        multiBlocks=[...col2.querySelectorAll('.tb-block[data-bid]')].map(be=>{const bl=st.blocks.find(x=>String(x.id)===String(be.dataset.bid));if(!bl)return null;const sid=_getTBBlockSelId(bl);if(!sid||!selectedTasks.has(sid))return null;return{bl,el2:be,startSm2:bl.sm};}).filter(Boolean);
        const selAtbSet=new Set([...selectedTasks].filter(id=>id.startsWith('atb::')).map(id=>id.replace('atb::','')));
        if(selAtbSet.size){const atbs=getAutoTBForDate(b.ds||d2s(getDayDate(dayOff)));multiAutoBlocks=[];col2.querySelectorAll('.atb-block[data-atb-id]').forEach(ae=>{if(!selAtbSet.has(ae.dataset.atbId))return;const aa=atbs.find(a=>a._atbId===ae.dataset.atbId);if(aa)multiAutoBlocks.push({aa,el2:ae,startSm2:aa.sm});});if(!multiAutoBlocks.length)multiAutoBlocks=null;}
      }
    }
    const _sm2t=sm=>`${String(Math.floor(sm/60)).padStart(2,'0')}:${String(sm%60).padStart(2,'0')}:00`;
    tbOnMove=ev=>{
      const dy=ev.clientY-startY;
      if(!tbDragging&&Math.abs(dy)<5)return;
      tbDragging=true;
      const dm=Math.round(dy/PX/15)*15;
      if(multiBlocks){
        multiBlocks.forEach(({bl,el2,startSm2})=>{const ns=Math.max(HOURS[0]*60,Math.min(HOURS[HOURS.length-1]*60,startSm2+dm));bl.sm=ns;el2.style.top=(ns-HOURS[0]*60)*PX+'px';const bt2=el2.querySelector('.tb-btime');if(bt2)bt2.textContent=tStr(ns)+'-'+tStr(ns+bl.dur);});
        if(multiAutoBlocks)multiAutoBlocks.forEach(({aa,el2,startSm2})=>{const ns=Math.max(HOURS[0]*60,Math.min(HOURS[HOURS.length-1]*60,startSm2+dm));aa.sm=ns;el2.style.top=(ns-HOURS[0]*60)*PX+'px';const bt2=el2.querySelector('.tb-btime');if(bt2)bt2.textContent=tStr(ns)+'-'+tStr(ns+aa.dur);});
      } else {
        const newSm=Math.max(HOURS[0]*60,Math.min(HOURS[HOURS.length-1]*60,startSm+dm));
        b.sm=newSm;el.style.top=(b.sm-HOURS[0]*60)*PX+'px';
        const bt=el.querySelector('.tb-btime');if(bt)bt.textContent=tStr(b.sm)+'-'+tStr(b.sm+b.dur);
      }
      const _col2=el.closest('.tb-col');if(_col2)_relayoutTBCol(_col2,b.ds);
      el.classList.add('dragging-block');
    };
    tbOnUp=()=>{
      document.removeEventListener('mousemove',tbOnMove);
      document.removeEventListener('mouseup',tbOnUp);
      el.classList.remove('dragging-block');
      if(tbDragging){
        if(multiBlocks){
          const snaps=multiBlocks.map(({bl,startSm2})=>({bl,startSm2,newSm:bl.sm}));
          const atbSnaps=multiAutoBlocks?multiAutoBlocks.map(({aa,startSm2})=>({aa,startSm2,newSm:aa.sm,prevOvId:aa._ovId})):[];
          pushUndo(()=>{
            snaps.forEach(({bl,startSm2})=>{bl.sm=startSm2;sbUpdateBlock(bl.id,{start_minutes:startSm2});});
            atbSnaps.forEach(({aa,startSm2,prevOvId})=>{aa.sm=startSm2;const ps=_sm2t(startSm2),pe=_sm2t(startSm2+aa.dur);if(prevOvId){const ov=st.autoTBOverrides.find(o=>String(o.id)===prevOvId);if(ov){ov.start_time=ps;ov.end_time=pe;}sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:ps,end_time:pe},`?id=eq.${prevOvId}`);}else if(aa._ovId){const rid=aa._ovId;st.autoTBOverrides=st.autoTBOverrides.filter(o=>String(o.id)!==rid);sbReqSilent('DELETE','auto_timeblock_overrides',null,`?id=eq.${rid}`);aa._ovId=null;}});
            save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
          },'Moved blocks');
          // Update auto-block overrides in memory BEFORE rendering so renderDayTB sees new positions
          atbSnaps.forEach(({aa,newSm,prevOvId})=>{const ns2=_sm2t(newSm),ne2=_sm2t(newSm+aa.dur);if(prevOvId){const ov=st.autoTBOverrides.find(o=>String(o.id)===prevOvId);if(ov){ov.start_time=ns2;ov.end_time=ne2;}sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:ns2,end_time:ne2},`?id=eq.${prevOvId}`);}else{const pl={base_id:aa._atbId,date:aa.ds,start_time:ns2,end_time:ne2};const tmpId='atbov-tmp-'+Date.now();st.autoTBOverrides.push({...pl,id:tmpId});sbReqSilent('POST','auto_timeblock_overrides',pl,'').then(res=>{if(res&&res[0]){const idx=st.autoTBOverrides.findIndex(o=>String(o.id)===tmpId);if(idx>-1){st.autoTBOverrides[idx]=res[0];aa._ovId=String(res[0].id);}save();}});}});
          save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
          snaps.forEach(({bl,newSm})=>sbUpdateBlock(bl.id,{start_minutes:newSm}));
        } else {
          const newSm=b.sm;pushUndo(()=>{b.sm=startSm;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbUpdateBlock(b.id,{start_minutes:startSm});},'Moved block');save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbUpdateBlock(b.id,{start_minutes:newSm});
        }
      }
      tbDragging=false;
    };
    document.addEventListener('mousemove',tbOnMove);
    document.addEventListener('mouseup',tbOnUp);
  });
  col.appendChild(el);
}
function renderTBSum(ds){
  const c={};getVisibleBlocks(ds).forEach(b=>c[b.cat]=(c[b.cat]||0)+b.dur);
  getAutoTBForDate(ds).forEach(a=>c['Auto']=(c['Auto']||0)+a.dur);
  getRecAutoTBForDate(ds).forEach(a=>c['Recurring']=(c['Recurring']||0)+a.dur);
  const tot=Object.values(c).reduce((a,v)=>a+v,0);
  const dayMins=(HOURS[HOURS.length-1]-HOURS[0]+1)*60;
  const free=Math.max(0,dayMins-tot);
  const freeStr=free>=60?`${Math.floor(free/60)}h${free%60?` ${free%60}m`:''}`:` ${free}m`;
  document.getElementById('tbSum').innerHTML=`<div class="si"><span>Blocked:</span><span class="sv">${Math.floor(tot/60)}h ${tot%60}m</span><span class="tb-free">(${freeStr} free)</span></div><button class="btn btn-ghost btn-xs" id="autoTBToggle" onclick="openAutoTBManager()" title="Manage auto blocks" style="margin-left:auto;font-size:8px;flex-shrink:0">Auto</button><button class="btn btn-ghost btn-xs" onclick="toggleVidOvMenu()" title="Videos" style="font-size:8px;flex-shrink:0;padding:3px 5px;display:flex;align-items:center;gap:3px"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></button>`;
}
// ── Auto Timeblocks ────────────────────────────────────────────────────────────
function getAutoTBForDate(ds){
  if(!cfg.showAutoTB)return[];
  const dow=new Date(ds+'T00:00:00').getDay(); // 0=Sun,6=Sat
  return st.autoTimeblocks.filter(a=>a.is_enabled).flatMap(a=>{
    const days=a.days?a.days.split(',').map(Number):null;
    if(days){if(!days.includes(dow))return[];}
    else{if(dow<1||dow>5)return[];} // legacy weekday-only
    const ov=st.autoTBOverrides.find(o=>String(o.base_id)===String(a.id)&&o.date===ds);
    if(ov&&(ov.start_time===null||ov.start_time===undefined))return[]; // deleted for this day
    const startTime=ov?ov.start_time:a.start_time;
    const endTime=ov?ov.end_time:a.end_time;
    const[sh,sm2]=((startTime||'00:00').split(':'));
    const[eh,em]=((endTime||'00:30').split(':'));
    const startMinutes=parseInt(sh)*60+parseInt(sm2||0);
    const endMinutes=parseInt(eh)*60+parseInt(em||0);
    const dur=Math.max(15,endMinutes-startMinutes);
    return[{_atbId:String(a.id),_ovId:ov?String(ov.id):null,label:a.label||'',sm:startMinutes,dur,ds,_cat:a.category||null}];
  });
}
function delAutoTBForDay(atbId,ds,ovId){
  const prevOv=ovId?{...st.autoTBOverrides.find(o=>String(o.id)===ovId)}:null;
  if(ovId){
    const ov=st.autoTBOverrides.find(o=>String(o.id)===ovId);
    if(ov){ov.start_time=null;ov.end_time=null;}
    sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:null,end_time:null},`?id=eq.${ovId}`);
    pushUndo(()=>{
      const ov2=st.autoTBOverrides.find(o=>String(o.id)===ovId);
      if(ov2&&prevOv){ov2.start_time=prevOv.start_time;ov2.end_time=prevOv.end_time;}
      sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:prevOv.start_time,end_time:prevOv.end_time},`?id=eq.${ovId}`);
      save();if(document.getElementById('tbGrid'))renderDayTB();
    },'Deleted auto block');
  } else {
    const tmpId='atbov-tmp-'+Date.now();
    const payload={base_id:atbId,date:ds,start_time:null,end_time:null};
    st.autoTBOverrides.push({...payload,id:tmpId});
    let realId=null;
    sbReqSilent('POST','auto_timeblock_overrides',payload,'').then(res=>{
      if(res&&res[0]){
        realId=String(res[0].id);
        const idx=st.autoTBOverrides.findIndex(o=>String(o.id)===tmpId);
        if(idx>-1)st.autoTBOverrides[idx]=res[0];
        save();
      }
    });
    pushUndo(()=>{
      const id=realId||tmpId;
      st.autoTBOverrides=st.autoTBOverrides.filter(o=>String(o.id)!==id);
      if(realId)sbReqSilent('DELETE','auto_timeblock_overrides',null,`?id=eq.${realId}`);
      save();if(document.getElementById('tbGrid'))renderDayTB();
    },'Deleted auto block');
  }
  selAtbId=null;selAtbDs=null;
  save();if(document.getElementById('tbGrid'))renderDayTB();
}
function drawAutoTBBlock(col,atb,ds){
  const top=(atb.sm-HOURS[0]*60)*PX,ht=Math.max(atb.dur*PX,16);
  const el=document.createElement('div');
  el.className='atb-block'+(atb._cat?' atb-cat':'');
  el.dataset.atbId=atb._atbId;
  el.addEventListener('dragover',e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();el.classList.add('tb-drop-over');});
  el.addEventListener('dragleave',()=>el.classList.remove('tb-drop-over'));
  el.addEventListener('drop',e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();el.classList.remove('tb-drop-over');dropOnTB(e,ds,null,null,atb.sm);});
  const ncols=atb._ncols||1,col_i=atb._col||0,colW=100/ncols,left=col_i*colW;
  const _showTime=ncols<=1;
  let css=`top:${top}px;height:${ht}px;left:calc(${left}% + 2px);right:calc(${100-left-colW}% + 2px);width:auto`;
  if(atb._cat){const c=gc(atb._cat);const bg=`color-mix(in srgb,${c.bg} 18%,rgba(245,244,250,.28))`;const t=`color-mix(in srgb,${c.t} 30%,#b0aec0)`;const b=`color-mix(in srgb,${c.b} 20%,rgba(210,205,228,.18))`;css+=`;background:${bg};color:${t};border-color:${b};--_atb-bg:${bg};--_atb-t:${t};--_atb-b:${b}`;}
  el.style.cssText=css;
  el.innerHTML=`<div class="tb-row"><span class="tb-bt${atb.dur>=30?' wrap':''}">${atb.label}</span><div class="tb-right">${_showTime?`<span class="tb-btime">${tStr(atb.sm)}-${tStr(atb.sm+atb.dur)}</span>`:''}<button class="tb-bdel atb-del" onclick="event.stopPropagation();delAutoTBForDay('${atb._atbId}','${ds}',${atb._ovId?`'${atb._ovId}'`:'null'})">✕</button></div></div><div class="tb-resize atb-resize"></div>`;
  const atbRes=el.querySelector('.atb-resize');
  if(atbRes)atbRes.addEventListener('mousedown',e=>{
    e.stopPropagation();e.preventDefault();
    const startY=e.clientY,startDur=atb.dur;
    let atbResizing=true;
    const onResMove=ev=>{
      if(!atbResizing)return;
      atb.dur=Math.max(15,Math.round((startDur+(ev.clientY-startY)/PX)/15)*15);
      el.style.height=Math.max(atb.dur*PX,16)+'px';
      const bt=el.querySelector('.tb-btime');if(bt)bt.textContent=tStr(atb.sm)+'-'+tStr(atb.sm+atb.dur);
      const _col2=el.closest('.tb-col');if(_col2)_relayoutTBCol(_col2,ds);
    };
    const onResUp=()=>{
      atbResizing=false;
      document.removeEventListener('mousemove',onResMove);document.removeEventListener('mouseup',onResUp);
      const newDur=atb.dur;if(newDur===startDur)return;
      const endSm=atb.sm+newDur;
      const newStart=`${String(Math.floor(atb.sm/60)).padStart(2,'0')}:${String(atb.sm%60).padStart(2,'0')}:00`;
      const newEnd=`${String(Math.floor(endSm/60)).padStart(2,'0')}:${String(endSm%60).padStart(2,'0')}:00`;
      const prevEndSm=atb.sm+startDur;
      const prevEnd=`${String(Math.floor(prevEndSm/60)).padStart(2,'0')}:${String(prevEndSm%60).padStart(2,'0')}:00`;
      if(atb._ovId){
        const ov=st.autoTBOverrides.find(o=>String(o.id)===atb._ovId);if(ov)ov.end_time=newEnd;
        sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:newStart,end_time:newEnd},`?id=eq.${atb._ovId}`);
        const ovId=atb._ovId;
        pushUndo(()=>{atb.dur=startDur;const ov2=st.autoTBOverrides.find(o=>String(o.id)===ovId);if(ov2)ov2.end_time=prevEnd;sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:newStart,end_time:prevEnd},`?id=eq.${ovId}`);save();if(document.getElementById('tbGrid'))renderDayTB();},'Resized auto block');
      }else{
        const payload={base_id:atb._atbId,date:ds,start_time:newStart,end_time:newEnd};
        const tmpId='atbov-tmp-'+Date.now();
        st.autoTBOverrides.push({...payload,id:tmpId});
        sbReqSilent('POST','auto_timeblock_overrides',payload,'').then(res=>{if(res&&res[0]){const idx=st.autoTBOverrides.findIndex(o=>String(o.id)===tmpId);if(idx>-1){st.autoTBOverrides[idx]=res[0];atb._ovId=String(res[0].id);}save();}});
        pushUndo(()=>{atb.dur=startDur;const _realOvId=atb._ovId;st.autoTBOverrides=st.autoTBOverrides.filter(o=>String(o.id)!==tmpId&&(!_realOvId||String(o.id)!==String(_realOvId)));if(_realOvId)sbReqSilent('DELETE','auto_timeblock_overrides',null,`?id=eq.${_realOvId}`);atb._ovId=null;save();if(document.getElementById('tbGrid'))renderDayTB();},'Resized auto block');
      }
      save();if(document.getElementById('tbGrid'))renderDayTB();
    };
    document.addEventListener('mousemove',onResMove);document.addEventListener('mouseup',onResUp);
  });
  el.addEventListener('click',e=>{
    if(e.target.classList.contains('atb-del')||e.target.classList.contains('atb-resize'))return;
    if(atbDragging)return;
    e.stopPropagation();
    const atbSid='atb::'+atb._atbId;
    if(e.metaKey||e.ctrlKey){if(selectedTasks.has(atbSid))selectedTasks.delete(atbSid);else selectedTasks.add(atbSid);lastSelectedId=atbSid;}
    else if(e.shiftKey&&lastSelectedId){const col2=el.closest('.tb-col');if(col2){const ids=[];col2.querySelectorAll('.tb-block[data-bid]').forEach(be=>{const bl=st.blocks.find(x=>String(x.id)===String(be.dataset.bid));if(bl){const sid=_getTBBlockSelId(bl);if(sid)ids.push(sid);}});col2.querySelectorAll('.atb-block[data-atb-id]').forEach(ae=>ids.push('atb::'+ae.dataset.atbId));const ai=ids.indexOf(lastSelectedId),bi2=ids.indexOf(atbSid);if(ai>-1&&bi2>-1){const lo=Math.min(ai,bi2),hi=Math.max(ai,bi2);ids.slice(lo,hi+1).forEach(x=>selectedTasks.add(x));}else selectedTasks.add(atbSid);}lastSelectedId=atbSid;}
    else{if(selectedTasks.size===1&&selectedTasks.has(atbSid)){selectedTasks.clear();selAtbId=null;selAtbDs=null;lastSelectedId=null;}else{selectedTasks.clear();selectedTasks.add(atbSid);lastSelectedId=atbSid;}}
    applySelHighlight();
  });
  let atbDragging=false,atbOnMove=null,atbOnUp=null;
  el.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('atb-del')||e.target.classList.contains('atb-resize'))return;
    if(e.detail>=2)return;
    e.preventDefault();e.stopPropagation();
    selAtbId=atb._atbId;selAtbDs=ds;
    document.querySelectorAll('.atb-block.sel-atb').forEach(x=>x.classList.remove('sel-atb'));
    el.classList.add('sel-atb');
    const startY=e.clientY,startSm=atb.sm;
    atbDragging=false;
    // Multi-drag: collect any selected regular TB blocks AND other selected auto-blocks
    const _atbSm2t=sm=>`${String(Math.floor(sm/60)).padStart(2,'0')}:${String(sm%60).padStart(2,'0')}:00`;
    const _atbMultiSelId=selectedTasks.has('atb::'+atb._atbId);
    let atbMultiBlocks=null,otherSelAtbs=null;
    if(_atbMultiSelId&&selectedTasks.size>1){
      const col2=el.closest('.tb-col');
      if(col2){atbMultiBlocks=[...col2.querySelectorAll('.tb-block[data-bid]')].map(be=>{const bl=st.blocks.find(x=>String(x.id)===String(be.dataset.bid));if(!bl)return null;const sid=_getTBBlockSelId(bl);if(!sid||!selectedTasks.has(sid))return null;return{bl,el2:be,startSm2:bl.sm};}).filter(Boolean);if(!atbMultiBlocks.length)atbMultiBlocks=null;}
      // Collect other selected auto-blocks (not the one being dragged)
      const allAtbsNow=getAutoTBForDate(ds);
      const otherList=[];
      col2&&col2.querySelectorAll('.atb-block[data-atb-id]').forEach(ae=>{
        const aid=ae.dataset.atbId;
        if(aid===atb._atbId||!selectedTasks.has('atb::'+aid))return;
        const aa=allAtbsNow.find(a=>a._atbId===aid);
        if(aa)otherList.push({aa,el2:ae,startSm2:aa.sm});
      });
      if(otherList.length)otherSelAtbs=otherList;
    }
    atbOnMove=ev=>{
      const dy=ev.clientY-startY;
      if(!atbDragging&&Math.abs(dy)<5)return;
      atbDragging=true;
      const dm=Math.round(dy/PX/15)*15;
      const newSm=Math.max(HOURS[0]*60,Math.min(HOURS[HOURS.length-1]*60,startSm+dm));
      atb.sm=newSm;
      el.style.top=(atb.sm-HOURS[0]*60)*PX+'px';
      const bt=el.querySelector('.tb-btime');if(bt)bt.textContent=tStr(atb.sm)+'-'+tStr(atb.sm+atb.dur);
      if(atbMultiBlocks)atbMultiBlocks.forEach(({bl,el2,startSm2})=>{const ns=Math.max(HOURS[0]*60,Math.min(HOURS[HOURS.length-1]*60,startSm2+dm));bl.sm=ns;el2.style.top=(ns-HOURS[0]*60)*PX+'px';const bt2=el2.querySelector('.tb-btime');if(bt2)bt2.textContent=tStr(ns)+'-'+tStr(ns+bl.dur);});
      if(otherSelAtbs)otherSelAtbs.forEach(({aa,el2,startSm2})=>{const ns=Math.max(HOURS[0]*60,Math.min(HOURS[HOURS.length-1]*60,startSm2+dm));aa.sm=ns;el2.style.top=(ns-HOURS[0]*60)*PX+'px';const bt2=el2.querySelector('.tb-btime');if(bt2)bt2.textContent=tStr(ns)+'-'+tStr(ns+aa.dur);});
      const _col2=el.closest('.tb-col');if(_col2)_relayoutTBCol(_col2,ds);
      el.classList.add('dragging-block');
    };
    atbOnUp=()=>{
      document.removeEventListener('mousemove',atbOnMove);
      document.removeEventListener('mouseup',atbOnUp);
      el.classList.remove('dragging-block');
      if(atbDragging){
        atbDragging=false;
        const endSm=atb.sm+atb.dur;
        const newStart=`${String(Math.floor(atb.sm/60)).padStart(2,'0')}:${String(atb.sm%60).padStart(2,'0')}:00`;
        const newEnd=`${String(Math.floor(endSm/60)).padStart(2,'0')}:${String(endSm%60).padStart(2,'0')}:00`;
        const prevEndSm=startSm+atb.dur;
        const prevStart=`${String(Math.floor(startSm/60)).padStart(2,'0')}:${String(startSm%60).padStart(2,'0')}:00`;
        const prevEnd=`${String(Math.floor(prevEndSm/60)).padStart(2,'0')}:${String(prevEndSm%60).padStart(2,'0')}:00`;
        const mbSnaps=atbMultiBlocks?atbMultiBlocks.map(({bl,startSm2})=>({bl,startSm2,newSm:bl.sm})):[];
        const otherAtbSnaps=otherSelAtbs?otherSelAtbs.map(({aa,startSm2})=>({atbId:aa._atbId,prevSm:startSm2,dur:aa.dur,hadOv:!!st.autoTBOverrides.find(o=>String(o.base_id)===aa._atbId&&o.date===ds)})):[];
        const _undoOtherAtbs=()=>{otherAtbSnaps.forEach(({atbId,prevSm,dur,hadOv})=>{const ps2=_atbSm2t(prevSm),pe2=_atbSm2t(prevSm+dur);const curOv=st.autoTBOverrides.find(o=>String(o.base_id)===atbId&&o.date===ds);if(curOv){if(!hadOv){st.autoTBOverrides=st.autoTBOverrides.filter(o=>o!==curOv);sbReqSilent('DELETE','auto_timeblock_overrides',null,`?id=eq.${curOv.id}`);}else{curOv.start_time=ps2;curOv.end_time=pe2;sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:ps2,end_time:pe2},`?id=eq.${curOv.id}`);}}});};
        if(atb._ovId){
          const ov=st.autoTBOverrides.find(o=>String(o.id)===atb._ovId);
          if(ov){ov.start_time=newStart;ov.end_time=newEnd;}
          sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:newStart,end_time:newEnd},`?id=eq.${atb._ovId}`);
          const ovId=atb._ovId;
          pushUndo(()=>{atb.sm=startSm;const ov2=st.autoTBOverrides.find(o=>String(o.id)===ovId);if(ov2){ov2.start_time=prevStart;ov2.end_time=prevEnd;}sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:prevStart,end_time:prevEnd},`?id=eq.${ovId}`);mbSnaps.forEach(({bl,startSm2})=>{bl.sm=startSm2;sbUpdateBlock(bl.id,{start_minutes:startSm2});});_undoOtherAtbs();save();if(document.getElementById('tbGrid'))renderDayTB();},'Moved auto block');
        } else {
          const payload={base_id:atb._atbId,date:ds,start_time:newStart,end_time:newEnd};
          const tmpId='atbov-tmp-'+Date.now();
          st.autoTBOverrides.push({...payload,id:tmpId});
          sbReqSilent('POST','auto_timeblock_overrides',payload,'').then(res=>{
            if(res&&res[0]){
              const idx=st.autoTBOverrides.findIndex(o=>String(o.id)===tmpId);
              if(idx>-1){st.autoTBOverrides[idx]=res[0];atb._ovId=String(res[0].id);}
              save();
            }
          });
          pushUndo(()=>{atb.sm=startSm;const _realOvId=atb._ovId;st.autoTBOverrides=st.autoTBOverrides.filter(o=>String(o.id)!==tmpId&&(!_realOvId||String(o.id)!==String(_realOvId)));if(_realOvId)sbReqSilent('DELETE','auto_timeblock_overrides',null,`?id=eq.${_realOvId}`);atb._ovId=null;mbSnaps.forEach(({bl,startSm2})=>{bl.sm=startSm2;sbUpdateBlock(bl.id,{start_minutes:startSm2});});_undoOtherAtbs();save();if(document.getElementById('tbGrid'))renderDayTB();},'Moved auto block');
        }
        mbSnaps.forEach(({bl,newSm})=>sbUpdateBlock(bl.id,{start_minutes:newSm}));
        // Persist other selected auto-blocks
        if(otherSelAtbs)otherSelAtbs.forEach(({aa})=>{
          const ns=aa.sm,ne=aa.sm+aa.dur;
          const ns2=_atbSm2t(ns),ne2=_atbSm2t(ne);
          const curOv2=st.autoTBOverrides.find(o=>String(o.base_id)===aa._atbId&&o.date===ds);
          if(curOv2){curOv2.start_time=ns2;curOv2.end_time=ne2;sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:ns2,end_time:ne2},`?id=eq.${curOv2.id}`);}
          else{const pl={base_id:aa._atbId,date:ds,start_time:ns2,end_time:ne2};const tid='atbov-tmp-'+Date.now();st.autoTBOverrides.push({...pl,id:tid});sbReqSilent('POST','auto_timeblock_overrides',pl,'').then(res=>{if(res&&res[0]){const i=st.autoTBOverrides.findIndex(o=>String(o.id)===tid);if(i>-1){st.autoTBOverrides[i]=res[0];aa._ovId=String(res[0].id);}}save();});}
        });
        save();if(document.getElementById('tbGrid'))renderDayTB();
      }
    };
    document.addEventListener('mousemove',atbOnMove);
    document.addEventListener('mouseup',atbOnUp);
  });
  col.appendChild(el);
}
function toggleAutoTB(){
  cfg.showAutoTB=!cfg.showAutoTB;save();
  if(document.getElementById('tbGrid'))renderDayTB();
}
// ── Auto TB Manager ───────────────────────────────────────────────────────────
const _ATB_CATS=[{val:'',label:'None (grey)'},{val:'home',label:'Home'},{val:'my work',label:'My Work'},{val:'work',label:'Work'},{val:'social',label:'Social'}];
function _parseAtbTime(v){
  if(!v)return null;
  v=v.trim();
  // HH:MM or HH:MM:SS (24h)
  const m24=/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v);
  if(m24&&!(/[ap]/i.test(v))){const h=parseInt(m24[1]),m=parseInt(m24[2]);if(h>=0&&h<=23&&m>=0&&m<=59)return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00';}
  // 5:30pm, 5pm, 530pm, 5:30 pm
  const mx=/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/i.exec(v);
  if(!mx)return null;
  let h=parseInt(mx[1]),m=parseInt(mx[2]||'0');
  const ap=(mx[3]||'').toLowerCase();
  if(ap==='pm'&&h<12)h+=12;
  if(ap==='am'&&h===12)h=0;
  if(!ap){if(h>=1&&h<=8)h+=12;} // smart AM/PM like @time
  if(h<0||h>23||m<0||m>59)return null;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00';
}
function _fmtAtbTime(dbTime){
  if(!dbTime)return'';
  const[hh,mm]=(dbTime||'').split(':');
  return tStr(parseInt(hh)*60+parseInt(mm||0));
}
const _ATB_DAYS=[{d:1,l:'M'},{d:2,l:'T'},{d:3,l:'W'},{d:4,l:'Th'},{d:5,l:'F'},{d:6,l:'Sa'},{d:0,l:'Su'}];
let _atbMgrEl=null,_atbEditId=null;
function openAutoTBManager(){
  if(_atbMgrEl){closeAutoTBManager();return;}
  const sec=document.querySelector('.tod-section');if(!sec)return;
  _atbMgrEl=document.createElement('div');
  _atbMgrEl.className='atb-mgr';
  sec.appendChild(_atbMgrEl);
  _renderATBMgr();
  requestAnimationFrame(()=>requestAnimationFrame(()=>_atbMgrEl.classList.add('open')));
  _atbMgrEl.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeAutoTBManager();return;}
    if(e.key==='Enter'&&!e.target.closest('input')&&!e.target.classList.contains('day-tog')){closeAutoTBManager();}
  });
  setTimeout(()=>document.addEventListener('click',_atbOutsideClick,true),50);
}
function _atbOutsideClick(e){
  if(!_atbMgrEl)return document.removeEventListener('click',_atbOutsideClick,true);
  if(!_atbMgrEl.contains(e.target)&&!e.target.closest('.atb-mgr')&&!e.target.closest('[onclick*="openAutoTBManager"]')){closeAutoTBManager();}
}
function closeAutoTBManager(){
  if(!_atbMgrEl)return;
  document.removeEventListener('click',_atbOutsideClick,true);
  _atbMgrEl.classList.remove('open');
  const el=_atbMgrEl;_atbMgrEl=null;_atbEditId=null;
  setTimeout(()=>el.remove(),200);
}
function _renderATBMgr(){
  if(!_atbMgrEl)return;
  const items=st.autoTimeblocks||[];
  let h=`<div class="atb-mgr-head"><h3>Auto Blocks</h3><button onclick="closeAutoTBManager()" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--muted);padding:0 2px">✕</button></div>`;
  items.forEach(a=>{
    const c=a.category?gc(a.category):null;
    const barCol=c?c.d:'#c8c6d4';
    const days=a.days?a.days.split(',').map(Number):_ATB_DAYS.filter(x=>x.d>=1&&x.d<=5).map(x=>x.d);
    const tS=_fmtAtbTime(a.start_time);
    const tE=_fmtAtbTime(a.end_time);
    const onBg=c?c.bg:'rgba(180,175,200,.2)';
    const onTxt=c?c.t:'#6b6880';
    const onBdr=c?c.b:'rgba(180,175,200,.4)';
    h+=`<div class="atb-mgr-item" data-atb-id="${a.id}" style="border-left:2.5px solid ${barCol}"><div class="atb-mgr-catbar" onclick="_atbCycleCat(${a.id})" title="Change category"></div>`;
    h+=`<div class="atb-mgr-r1">`;
    h+=`<input class="atb-mgr-name" value="${a.label||''}" placeholder="Name" onchange="_atbInlineSave(${a.id},'label',this.value)" onkeydown="if(event.key==='Enter')this.blur();if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();_atbCycleCat(${a.id});}">`;
    h+=`<span class="atb-mgr-trange"><input class="atb-mgr-tinput" value="${tS}" onblur="_atbSaveTime(${a.id},'start_time',this)" onkeydown="if(event.key==='Enter')this.blur();if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();_atbCycleCat(${a.id});}"><span class="atb-mgr-tsep">-</span><input class="atb-mgr-tinput" value="${tE}" onblur="_atbSaveTime(${a.id},'end_time',this)" onkeydown="if(event.key==='Enter')this.blur();if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();_atbCycleCat(${a.id});}"></span>`;
    h+=`<button class="atb-mgr-x" onclick="_atbDelRule(${a.id})">✕</button>`;
    h+=`</div>`;
    h+=`<div class="atb-mgr-r2">`;
    _ATB_DAYS.forEach(dd=>{h+=`<span class="day-tog${days.includes(dd.d)?' on':''}" data-day="${dd.d}" tabindex="0" onclick="if(this._kbTog){this._kbTog=false;return;}_atbTogDay(${a.id},${dd.d},this)" onkeydown="_atbDayKey(event,this,${a.id})" style="${days.includes(dd.d)?`background:${onBg};color:${onTxt};border-color:${onBdr}`:''}">${dd.l}</span>`;});
    h+=`</div></div>`;
  });
  if(_atbEditId==='new'){
    h+=`<div class="atb-mgr-item atb-mgr-new" id="atbNewItem" style="border-left:2.5px solid #c8c6d4"><div class="atb-mgr-catbar" onclick="_atbCycleCatNew()" title="Change category"></div>`;
    h+=`<div class="atb-mgr-r1">`;
    h+=`<input class="atb-mgr-name" id="atbF_label" autofocus onkeydown="_atbNewInputKey(event,'label')">`;
    h+=`<span class="atb-mgr-trange"><input class="atb-mgr-tinput" id="atbF_start" value="" onkeydown="_atbNewInputKey(event,'start')"><span class="atb-mgr-tsep">-</span><input class="atb-mgr-tinput" id="atbF_end" value="" onkeydown="_atbNewInputKey(event,'end')"></span>`;
    h+=`<button class="atb-mgr-x" onclick="_atbCancelEdit()" style="opacity:1;color:var(--muted)">✕</button>`;
    h+=`</div>`;
    h+=`<div class="atb-mgr-r2">`;
    _ATB_DAYS.forEach(dd=>{h+=`<span class="day-tog${dd.d>=1&&dd.d<=5?' on':''}" data-day="${dd.d}" tabindex="0" onclick="if(this._kbTog){this._kbTog=false;return;}this.classList.toggle('on')" onkeydown="_atbDayKey(event,this)">${dd.l}</span>`;});
    h+=`</div></div>`;
  }
  h+=`<button class="atb-mgr-add" onclick="_atbStartEdit('new')">+ Add auto block</button>`;
  _atbMgrEl.innerHTML=h;
}
let _atbNewCatIdx=0;
function _atbStartEdit(id){_atbEditId=id;_atbNewCatIdx=0;_renderATBMgr();}
function _atbCancelEdit(){_atbEditId=null;_renderATBMgr();}
function _atbDayKey(e,el,id){
  if(e.key===' '){e.preventDefault();e.stopImmediatePropagation();el._kbTog=true;if(id!=null){_atbTogDay(id,+el.dataset.day,el);}else{el.classList.toggle('on');}return;}
  if(e.key==='Enter'){e.preventDefault();if(_atbEditId==='new')_atbSaveNew();else el.blur();return;}
  if(e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();const next=el.nextElementSibling;if(next&&next.classList.contains('day-tog'))next.focus();return;}
  if(e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();const prev=el.previousElementSibling;if(prev&&prev.classList.contains('day-tog'))prev.focus();return;}
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();if(id!=null)_atbCycleCat(id);else _atbCycleCatNew();return;}
  if(e.key==='Tab'&&!e.shiftKey){const next=el.nextElementSibling;if(!next||!next.classList.contains('day-tog')){e.preventDefault();if(_atbEditId==='new')_atbSaveNew();else closeAutoTBManager();}}
}
function _atbNewInputKey(e,field){
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();_atbCycleCatNew();return;}
  if(e.key==='Enter'){e.preventDefault();if(field==='label')document.getElementById('atbF_start').focus();else if(field==='start')document.getElementById('atbF_end').focus();else{const d=document.querySelector('.atb-mgr-new .day-tog');if(d)d.focus();else _atbSaveNew();}}
  if(e.key==='Tab'&&!e.shiftKey&&field==='end'){e.preventDefault();const d=document.querySelector('.atb-mgr-new .day-tog');if(d)d.focus();}
}
function _atbInlineSave(id,field,val){
  const a=st.autoTimeblocks.find(x=>x.id===id);if(!a)return;
  a[field]=val;
  const patch={};patch[field]=val;
  sbReqSilent('PATCH','auto_timeblocks',patch,`?id=eq.${id}`);
  save();if(document.getElementById('tbGrid'))renderDayTB();
}
function _atbSaveTime(id,field,el){
  const parsed=_parseAtbTime(el.value);
  if(!parsed){el.value=_fmtAtbTime((st.autoTimeblocks.find(x=>x.id===id)||{})[field]);return;}
  _atbInlineSave(id,field,parsed);
  el.value=_fmtAtbTime(parsed);
}
function _atbTogDay(id,day,el){
  const a=st.autoTimeblocks.find(x=>x.id===id);if(!a)return;
  const days=a.days?a.days.split(',').map(Number):_ATB_DAYS.filter(x=>x.d>=1&&x.d<=5).map(x=>x.d);
  const idx=days.indexOf(day);
  const adding=idx<0;
  if(idx>-1)days.splice(idx,1);else days.push(day);
  el.classList.toggle('on');
  const c=a.category?gc(a.category):null;
  if(adding&&c){el.style.background=c.bg;el.style.color=c.t;el.style.borderColor=c.b;}
  else if(adding){el.style.cssText='';}
  else{el.style.cssText='';}
  a.days=days.length?days.join(','):null;
  sbReqSilent('PATCH','auto_timeblocks',{days:a.days},`?id=eq.${id}`);
  save();if(document.getElementById('tbGrid'))renderDayTB();
}
function _atbCycleCat(id){
  const a=st.autoTimeblocks.find(x=>x.id===id);if(!a)return;
  const curIdx=_ATB_CATS.findIndex(c=>c.val===(a.category||''));
  const next=_ATB_CATS[(curIdx+1)%_ATB_CATS.length];
  a.category=next.val||null;
  sbReqSilent('PATCH','auto_timeblocks',{category:a.category},`?id=eq.${id}`);
  // Update DOM directly instead of full re-render
  const item=_atbMgrEl&&_atbMgrEl.querySelector(`[data-atb-id="${id}"]`);
  if(item){
    const c=a.category?gc(a.category):null;
    item.style.borderLeftColor=c?c.d:'#c8c6d4';
    const onBg=c?c.bg:'rgba(180,175,200,.2)',onTxt=c?c.t:'#6b6880',onBdr=c?c.b:'rgba(180,175,200,.4)';
    item.querySelectorAll('.day-tog.on').forEach(d=>{if(c){d.style.background=onBg;d.style.color=onTxt;d.style.borderColor=onBdr;}else{d.style.cssText='';}});
  }
  save();if(document.getElementById('tbGrid'))renderDayTB();
}
function _atbCycleCatNew(){
  _atbNewCatIdx=(_atbNewCatIdx+1)%_ATB_CATS.length;
  const c=_ATB_CATS[_atbNewCatIdx];
  const col=c.val?gc(c.val):null;
  const item=document.getElementById('atbNewItem');
  if(item)item.style.borderLeftColor=col?col.d:'#c8c6d4';
}
function _atbSaveNew(){
  const label=document.getElementById('atbF_label').value.trim();
  const startTime=_parseAtbTime(document.getElementById('atbF_start').value);
  const endTime=_parseAtbTime(document.getElementById('atbF_end').value);
  const cat=_ATB_CATS[_atbNewCatIdx].val||null;
  const dayEls=document.querySelectorAll('.atb-mgr-new .day-tog.on');
  const days=[...dayEls].map(e=>e.dataset.day).join(',');
  if(!label||!startTime||!endTime)return;
  const payload={label,start_time:startTime,end_time:endTime,is_enabled:true,sort_order:(st.autoTimeblocks.length+1),day_scope:'weekday'};
  if(cat)payload.category=cat;
  if(days)payload.days=days;
  const tmpId='atb-tmp-'+Date.now();
  st.autoTimeblocks.push({...payload,id:tmpId});
  sbReqSilent('POST','auto_timeblocks',payload,'').then(res=>{
    if(res&&res[0]){const idx=st.autoTimeblocks.findIndex(x=>x.id===tmpId);if(idx>-1)st.autoTimeblocks[idx]=res[0];save();_renderATBMgr();}
    else{console.error('Auto block save failed, payload:',payload,'response:',res);showToast('Auto block save failed — check console','error');}
  });
  _atbEditId=null;save();_renderATBMgr();
  if(document.getElementById('tbGrid'))renderDayTB();
}
function _atbTogEnabled(id){
  const a=st.autoTimeblocks.find(x=>x.id===id);if(!a)return;
  a.is_enabled=!a.is_enabled;
  sbReqSilent('PATCH','auto_timeblocks',{is_enabled:a.is_enabled},`?id=eq.${id}`);
  save();_renderATBMgr();if(document.getElementById('tbGrid'))renderDayTB();
}
function _atbDelRule(id){
  const a=st.autoTimeblocks.find(x=>x.id===id);if(!a)return;
  st.autoTimeblocks=st.autoTimeblocks.filter(x=>x.id!==id);
  st.autoTBOverrides=st.autoTBOverrides.filter(o=>String(o.base_id)!==String(id));
  sbReqSilent('DELETE','auto_timeblocks',null,`?id=eq.${id}`);
  sbReqSilent('DELETE','auto_timeblock_overrides',null,`?base_id=eq.${id}`);
  pushUndo(()=>{st.autoTimeblocks.push(a);save();_renderATBMgr();if(document.getElementById('tbGrid'))renderDayTB();sbReqSilent('POST','auto_timeblocks',{label:a.label,start_time:a.start_time,end_time:a.end_time,day_scope:a.day_scope,is_enabled:a.is_enabled,sort_order:a.sort_order,category:a.category,days:a.days},'');},'Deleted auto block');
  save();_renderATBMgr();if(document.getElementById('tbGrid'))renderDayTB();
}
function dropOnTB(e,ds,h,row,smOverride){
  if(!dragId)return;
  let sm;
  if(smOverride!==undefined){sm=smOverride;}else{
  // row = tb-hour div for hour h; its height = HOUR_PX = 1hr
  const rowRect=row.getBoundingClientRect();
  const fracInRow=(e.clientY-rowRect.top)/rowRect.height; // 0..1 within the hour
  const minsInRow=Math.round(fracInRow*60/15)*15;
  sm=h*60+Math.max(0,Math.min(45,minsInRow));}
  let title='New block',cat='Home',taskId=null;
  // Default duration by task name/category
  const autoDur=(name,category)=>{const c=(category||'').toLowerCase();const n=(name||'').toLowerCase();if(c==='social'||/social/.test(n))return 180;if(c==='work'||c==='my work'||c==='recurring'||/\bheb\b/.test(n)||/pilates/.test(n))return 60;return 30;};
  // helper: compute wkKey (Monday of the week) from a date string
  const wkKeyFromDs=d=>{const dt=new Date(d+'T00:00:00');const dow=(dt.getDay()+6)%7;const mon=new Date(dt);mon.setDate(dt.getDate()-dow);return d2s(mon);};
  if(dragId.startsWith('pupskill::')||dragId.startsWith('pupsess::')){
    const isPupSess=dragId.startsWith('pupsess::');
    let skillId;
    if(isPupSess){const sessId=dragId.split('::')[1];const sess=st.pupSessions.find(s=>String(s.id)===String(sessId));if(!sess){dragId=null;return;}skillId=sess.skill_id;}
    else{skillId=dragId.split('::')[1];}
    const skill=(st.pup_skills||[]).find(x=>String(x.id)===String(skillId));if(!skill){dragId=null;return;}
    // Check multi-select
    const _pupDragSid=isPupSess?'pup-sess-'+dragId.split('::')[1]:null;
    const _isMultiPup=_pupDragSid&&selectedTasks.has(_pupDragSid)&&selectedTasks.size>1;
    const _addedBlks=[];const _undoOps=[];
    let _curSm=sm;
    // Helper to add a single pup session block
    const _addPupBlock=(skId,curSm)=>{
      const sk=(st.pup_skills||[]).find(x=>String(x.id)===String(skId));
      if(!sk)return curSm;
      if(st.blocks.some(b=>b.ds===ds&&b.cat==='pup_session'&&String(b._pupSessId)&&(st.pupSessions.find(s=>String(s.id)===String(b._pupSessId)&&String(s.skill_id)===String(skId)))))return curSm;
      const sessAlr=st.pupSessions.find(s=>String(s.skill_id)===String(skId)&&s.day_date===ds);
      let newSess=false;let tmpId=null;
      if(!sessAlr){
        const tmp='pss-tmp-'+Date.now()+'-'+Math.random();tmpId=tmp;newSess=true;
        st.pupSessions.push({id:tmp,skill_id:skId,day_date:ds,done:false});
        sbReqSilent('POST','pup_skill_sessions',{skill_id:skId,day_date:ds,done:false}).then(sv=>{if(sv&&sv[0]){const i=st.pupSessions.findIndex(s=>s.id===tmp);if(i>-1){tmpId=sv[0].id;st.pupSessions[i]=sv[0];}const blkRef=st.blocks.find(b=>b._pupSessId===tmp);if(blkRef)blkRef._pupSessId=sv[0].id;}save();});
      }
      const sessRef=st.pupSessions.find(s=>String(s.skill_id)===String(skId)&&s.day_date===ds);
      const blk={id:crypto.randomUUID(),title:sk.skill,ds,sm:curSm,dur:30,cat:'pup_session',_pupSessId:(sessRef?.id||tmpId)||null};
      st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
      const _skId=skId,_tmpId=tmpId,_newSess=newSess;
      _undoOps.push(()=>{if(_newSess){st.pupSessions=st.pupSessions.filter(s=>!(String(s.skill_id)===String(_skId)&&s.day_date===ds));if(_tmpId)sbReqSilent('DELETE','pup_skill_sessions',null,`?id=eq.${_tmpId}`);}});
      return curSm+30;
    };
    _curSm=_addPupBlock(skillId,_curSm);
    // Multi-select: also add other selected items
    if(_isMultiPup){
      for(const sid of [...selectedTasks]){
        if(sid===_pupDragSid)continue;
        if(sid.startsWith('pup-sess-')){
          const sessId2=sid.replace('pup-sess-','');const sess2=st.pupSessions.find(s=>String(s.id)===String(sessId2));
          if(sess2)_curSm=_addPupBlock(sess2.skill_id,_curSm);
        } else if(sid.startsWith('wrrule-virt-')||sid.startsWith('wrrule-')){
          const rid=sid.replace('wrrule-virt-','').replace('wrrule-','');const r=st.wrRules.find(x=>String(x.id)===String(rid));
          if(r&&!st.blocks.some(b=>b.ds===ds&&(String(b.ruleId)===String(rid)||String(b.recId)===String(rid)))){
            const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};if(!r._dateOverrides)r._dateOverrides={};r._dateOverrides[wkKeyFromDs(ds)]=ds;
            const blk={id:crypto.randomUUID(),title:r.name,ds,sm:_curSm,dur:30,cat:'Recurring',ruleId:String(r.id),recId:String(r.id)};
            st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${rid}`);
            _undoOps.push(()=>{r._dateOverrides=prevDateOv;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv},`?id=eq.${rid}`);});_curSm+=30;}
        } else if(sid.startsWith('wrec-')){
          const rid=sid.replace('wrec-','');const r=st.recurring.find(x=>String(x.id)===String(rid));
          if(r&&!st.blocks.some(b=>b.ds===ds&&String(b.recId)===String(rid))){
            const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};if(!r._dateOverrides)r._dateOverrides={};r._dateOverrides[wkKeyFromDs(ds)]=ds;
            const _dur=r.default_tb_duration||autoDur(r.name,'Recurring');
            const blk={id:crypto.randomUUID(),title:r.name,ds,sm:_curSm,dur:_dur,cat:'Recurring',recId:String(r.id)};
            st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
            _undoOps.push(()=>{r._dateOverrides=prevDateOv;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv},recQs(r.id));});_curSm+=_dur;}
        } else if(sid.startsWith('rec-virt-')){
          const rid=sid.replace('rec-virt-','');const r=st.recurring.find(x=>String(x.id)===String(rid));
          if(r&&!st.blocks.some(b=>b.ds===ds&&String(b.recId)===String(rid))){
            const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};if(!r._dateOverrides)r._dateOverrides={};r._dateOverrides[wkKeyFromDs(ds)]=ds;
            const _dur=r.default_tb_duration||autoDur(r.name,'Recurring');
            const blk={id:crypto.randomUUID(),title:r.name,ds,sm:_curSm,dur:_dur,cat:'Recurring',recId:String(r.id)};
            st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
            _undoOps.push(()=>{r._dateOverrides=prevDateOv;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv},recQs(r.id));});_curSm+=_dur;}
        } else if(sid.startsWith('vid-ov-')){
          // skip — video TB has special handling
        } else if(sid.startsWith('vidstep-')){
          // skip — vidstep tasks are virtual
        } else if(sid.startsWith('shop-cal-')){
          const shopId2=sid.replace('shop-cal-','');const s=st.shopping.find(x=>String(x.id)===String(shopId2));
          if(s&&!st.blocks.some(b=>b.ds===ds&&String(b.shopId)===String(shopId2))){
            const prevDue=s.due_date;s.due_date=ds;
            const blk={id:crypto.randomUUID(),title:s.name,ds,sm:_curSm,dur:autoDur(s.name,'Shopping'),cat:'Shopping',shopId:String(s.id)};
            st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);sbReqNullable('PATCH','shopping_list',{due_date:ds},`?id=eq.${s.id}`);
            _undoOps.push(()=>{s.due_date=prevDue;sbReqNullable('PATCH','shopping_list',{due_date:prevDue||null},`?id=eq.${s.id}`);});_curSm+=autoDur(s.name,'Shopping');}
        } else {
          const t=st.tasks.find(x=>String(x.id)===sid);
          if(t&&!t._virtual&&!st.blocks.find(b=>b.taskId===String(t.id)&&b.ds===ds)){
            const _dur=autoDur(t.name,t.category||'Home');const prevDate=t.due_date;
            const blk={id:crypto.randomUUID(),title:t.name,ds,sm:_curSm,dur:_dur,cat:t.category||'Home',taskId:String(t.id)};
            if((t.due_date||'').split('T')[0]!==ds){t.due_date=ds;sbReq('PATCH','tasks',{due_date:ds},`?id=eq.${t.id}`);}
            st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
            _undoOps.push(()=>{t.due_date=prevDate||null;sbReq('PATCH','tasks',{due_date:prevDate||null},`?id=eq.${t.id}`);});_curSm+=_dur;}
        }
      }
    }
    if(!_addedBlks.length){dragId=null;return;}
    dragId=null;selectedTasks.clear();save();renderAll();renderPupSkillsHighlight();renderWkCal();renderToday();if(document.getElementById('tbGrid'))renderDayTB();
    const _blkIds=_addedBlks.map(b=>b.id);
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>!_blkIds.includes(b.id));_blkIds.forEach(id=>sbDeleteBlock(id));
      _undoOps.forEach(fn=>fn());
      save();renderAll();renderPupSkillsHighlight();renderWkCal();renderToday();if(document.getElementById('tbGrid'))renderDayTB();
    },_addedBlks.length>1?`Added ${_addedBlks.length} to time block`:'Added pup skill to time block');
    return;
  }
  if(dragId.startsWith('wrrule::')){
    const ruleId=dragId.split('::')[1];
    const _wrSid=selectedTasks.has('wrrule-'+ruleId)?'wrrule-'+ruleId:selectedTasks.has('wrrule-virt-'+ruleId)?'wrrule-virt-'+ruleId:'wrrule-'+ruleId;
    const _isMultiWR=selectedTasks.has(_wrSid)&&selectedTasks.size>1;
    const wkKey=wkKeyFromDs(ds);
    const _addedBlks=[];const _undoOps=[];
    let _curSm=sm;
    // Collect all selected items to add
    const _allSids=_isMultiWR?[...selectedTasks]:[_wrSid];
    for(const sid of _allSids){
      if(sid.startsWith('wrrule-')||sid.startsWith('wrrule-virt-')){
        const rid=sid.replace('wrrule-virt-','').replace('wrrule-','');
        const r=st.wrRules.find(x=>String(x.id)===String(rid));
        if(!r)continue;
        if(st.blocks.some(b=>b.ds===ds&&(String(b.ruleId)===String(rid)||String(b.recId)===String(rid))))continue;
        const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};
        if(!r._dateOverrides)r._dateOverrides={};
        r._dateOverrides[wkKey]=ds;
        const blk={id:crypto.randomUUID(),title:r.name,ds,sm:_curSm,dur:30,cat:'Recurring',ruleId:String(r.id),recId:String(r.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
        sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${rid}`);
        _undoOps.push(()=>{r._dateOverrides=prevDateOv;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv},`?id=eq.${rid}`);});
        _curSm+=30;
      } else if(sid.startsWith('wrec-')){
        const rid=sid.replace('wrec-','');
        const r=st.recurring.find(x=>String(x.id)===String(rid));
        if(!r)continue;
        if(st.blocks.some(b=>b.ds===ds&&String(b.recId)===String(rid)))continue;
        const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};
        if(!r._dateOverrides)r._dateOverrides={};
        r._dateOverrides[wkKey]=ds;
        const _dur=r.default_tb_duration||autoDur(r.name,'Recurring');
        const blk={id:crypto.randomUUID(),title:r.name,ds,sm:_curSm,dur:_dur,cat:'Recurring',recId:String(r.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
        sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
        _undoOps.push(()=>{r._dateOverrides=prevDateOv;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv},recQs(r.id));});
        _curSm+=_dur;
      } else if(sid.startsWith('pup-sess-')){
        const sessId2=sid.replace('pup-sess-','');const sess2=st.pupSessions.find(s=>String(s.id)===String(sessId2));
        if(!sess2)continue;const sk2=(st.pup_skills||[]).find(x=>String(x.id)===String(sess2.skill_id));if(!sk2)continue;
        const blk={id:crypto.randomUUID(),title:sk2.skill,ds,sm:_curSm,dur:30,cat:'pup_session',_pupSessId:String(sess2.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);_curSm+=30;
      } else if(sid.startsWith('shop-cal-')){
        const shopId2=sid.replace('shop-cal-','');const s2=st.shopping.find(x=>String(x.id)===String(shopId2));
        if(!s2||st.blocks.some(b=>b.ds===ds&&String(b.shopId)===String(shopId2)))continue;
        const prevDue=s2.due_date;s2.due_date=ds;
        const _dur=autoDur(s2.name,'Shopping');
        const blk={id:crypto.randomUUID(),title:s2.name,ds,sm:_curSm,dur:_dur,cat:'Shopping',shopId:String(s2.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);sbReqNullable('PATCH','shopping_list',{due_date:ds},`?id=eq.${s2.id}`);
        _undoOps.push(()=>{s2.due_date=prevDue;sbReqNullable('PATCH','shopping_list',{due_date:prevDue||null},`?id=eq.${s2.id}`);});_curSm+=_dur;
      } else if(sid.startsWith('rec-virt-')){
        const rid=sid.replace('rec-virt-','');const r2=st.recurring.find(x=>String(x.id)===String(rid));
        if(!r2||st.blocks.some(b=>b.ds===ds&&String(b.recId)===String(rid)))continue;
        const prevDateOv2=r2._dateOverrides?{...r2._dateOverrides}:{};if(!r2._dateOverrides)r2._dateOverrides={};r2._dateOverrides[wkKey]=ds;
        const _dur=r2.default_tb_duration||autoDur(r2.name,'Recurring');
        const blk={id:crypto.randomUUID(),title:r2.name,ds,sm:_curSm,dur:_dur,cat:'Recurring',recId:String(r2.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);sbReq('PATCH','wr_recurring_rules',{date_overrides:r2._dateOverrides},recQs(r2.id));
        _undoOps.push(()=>{r2._dateOverrides=prevDateOv2;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv2},recQs(r2.id));});_curSm+=_dur;
      } else {
        const t=st.tasks.find(x=>String(x.id)===sid);
        if(!t||t._virtual)continue;
        const _tid=String(t.id);
        if(st.blocks.find(b=>b.taskId===_tid&&b.ds===ds))continue;
        const _dur=autoDur(t.name,t.category||'Home');
        const prevDate=t.due_date;
        const blk={id:crypto.randomUUID(),title:t.name,ds,sm:_curSm,dur:_dur,cat:t.category||'Home',taskId:_tid};
        if((t.due_date||'').split('T')[0]!==ds){t.due_date=ds;sbReq('PATCH','tasks',{due_date:ds},`?id=eq.${t.id}`);}
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
        _undoOps.push(()=>{t.due_date=prevDate||null;sbReq('PATCH','tasks',{due_date:prevDate||null},`?id=eq.${t.id}`);});
        _curSm+=_dur;
      }
    }
    if(!_addedBlks.length){dragId=null;showToast('Already in time block','#6b7280',2000);return;}
    dragId=null;selectedTasks.clear();save();renderAll();renderRecOv();renderPupSkillsHighlight();
    const _blkIds=_addedBlks.map(b=>b.id);
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>!_blkIds.includes(b.id));
      _blkIds.forEach(id=>sbDeleteBlock(id));
      _undoOps.forEach(fn=>fn());
      save();renderAll();renderRecOv();renderPupSkillsHighlight();
    },_addedBlks.length>1?`Added ${_addedBlks.length} to time block`:'Added to time block');
    return;
  }
  if(dragId.startsWith('wrec::')){
    const recId=dragId.split('::')[1];
    const _wrecSid='wrec-'+recId;
    const _isMultiWrec=selectedTasks.has(_wrecSid)&&selectedTasks.size>1;
    const wkKey=wkKeyFromDs(ds);
    const _addedBlks=[];const _undoOps=[];
    let _curSm=sm;
    const _allSids=_isMultiWrec?[...selectedTasks]:[_wrecSid];
    for(const sid of _allSids){
      if(sid.startsWith('wrec-')){
        const rid=sid.replace('wrec-','');
        const r=st.recurring.find(x=>String(x.id)===String(rid));
        if(!r)continue;
        if(st.blocks.some(b=>b.ds===ds&&String(b.recId)===String(rid)))continue;
        const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};
        if(!r._dateOverrides)r._dateOverrides={};
        r._dateOverrides[wkKey]=ds;
        const _dur=r.default_tb_duration||autoDur(r.name,'Recurring');
        const blk={id:crypto.randomUUID(),title:r.name,ds,sm:_curSm,dur:_dur,cat:'Recurring',recId:String(r.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
        sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
        _undoOps.push(()=>{r._dateOverrides=prevDateOv;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv},recQs(r.id));});
        _curSm+=_dur;
      } else if(sid.startsWith('wrrule-')||sid.startsWith('wrrule-virt-')){
        const rid=sid.replace('wrrule-virt-','').replace('wrrule-','');
        const r=st.wrRules.find(x=>String(x.id)===String(rid));
        if(!r)continue;
        if(st.blocks.some(b=>b.ds===ds&&(String(b.ruleId)===String(rid)||String(b.recId)===String(rid))))continue;
        const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};
        if(!r._dateOverrides)r._dateOverrides={};
        r._dateOverrides[wkKey]=ds;
        const blk={id:crypto.randomUUID(),title:r.name,ds,sm:_curSm,dur:30,cat:'Recurring',ruleId:String(r.id),recId:String(r.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
        sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${rid}`);
        _undoOps.push(()=>{r._dateOverrides=prevDateOv;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv},`?id=eq.${rid}`);});
        _curSm+=30;
      } else if(sid.startsWith('pup-sess-')){
        const sessId2=sid.replace('pup-sess-','');const sess2=st.pupSessions.find(s=>String(s.id)===String(sessId2));
        if(!sess2)continue;const sk2=(st.pup_skills||[]).find(x=>String(x.id)===String(sess2.skill_id));if(!sk2)continue;
        const blk={id:crypto.randomUUID(),title:sk2.skill,ds,sm:_curSm,dur:30,cat:'pup_session',_pupSessId:String(sess2.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);_curSm+=30;
      } else if(sid.startsWith('rec-virt-')){
        const rid=sid.replace('rec-virt-','');const r2=st.recurring.find(x=>String(x.id)===String(rid));
        if(!r2||st.blocks.some(b=>b.ds===ds&&String(b.recId)===String(rid)))continue;
        const prevDateOv2=r2._dateOverrides?{...r2._dateOverrides}:{};if(!r2._dateOverrides)r2._dateOverrides={};r2._dateOverrides[wkKey]=ds;
        const _dur=r2.default_tb_duration||autoDur(r2.name,'Recurring');
        const blk={id:crypto.randomUUID(),title:r2.name,ds,sm:_curSm,dur:_dur,cat:'Recurring',recId:String(r2.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);sbReq('PATCH','wr_recurring_rules',{date_overrides:r2._dateOverrides},recQs(r2.id));
        _undoOps.push(()=>{r2._dateOverrides=prevDateOv2;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv2},recQs(r2.id));});_curSm+=_dur;
      } else if(sid.startsWith('shop-cal-')){
        const shopId2=sid.replace('shop-cal-','');const s2=st.shopping.find(x=>String(x.id)===String(shopId2));
        if(!s2||st.blocks.some(b=>b.ds===ds&&String(b.shopId)===String(shopId2)))continue;
        const prevDue=s2.due_date;s2.due_date=ds;
        const _dur=autoDur(s2.name,'Shopping');
        const blk={id:crypto.randomUUID(),title:s2.name,ds,sm:_curSm,dur:_dur,cat:'Shopping',shopId:String(s2.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);sbReqNullable('PATCH','shopping_list',{due_date:ds},`?id=eq.${s2.id}`);
        _undoOps.push(()=>{s2.due_date=prevDue;sbReqNullable('PATCH','shopping_list',{due_date:prevDue||null},`?id=eq.${s2.id}`);});_curSm+=_dur;
      } else {
        const t=st.tasks.find(x=>String(x.id)===sid);
        if(!t||t._virtual)continue;
        const _tid=String(t.id);
        if(st.blocks.find(b=>b.taskId===_tid&&b.ds===ds))continue;
        const _dur=autoDur(t.name,t.category||'Home');
        const prevDate=t.due_date;
        const blk={id:crypto.randomUUID(),title:t.name,ds,sm:_curSm,dur:_dur,cat:t.category||'Home',taskId:_tid};
        if((t.due_date||'').split('T')[0]!==ds){t.due_date=ds;sbReq('PATCH','tasks',{due_date:ds},`?id=eq.${t.id}`);}
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
        _undoOps.push(()=>{t.due_date=prevDate||null;sbReq('PATCH','tasks',{due_date:prevDate||null},`?id=eq.${t.id}`);});
        _curSm+=_dur;
      }
    }
    if(!_addedBlks.length){dragId=null;showToast('Already in time block','#6b7280',2000);return;}
    dragId=null;selectedTasks.clear();save();renderAll();renderRecOv();renderWeeklyPage();renderPupSkillsHighlight();
    const _blkIds=_addedBlks.map(b=>b.id);
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>!_blkIds.includes(b.id));
      _blkIds.forEach(id=>sbDeleteBlock(id));
      _undoOps.forEach(fn=>fn());
      save();renderAll();renderRecOv();renderWeeklyPage();renderPupSkillsHighlight();
    },_addedBlks.length>1?`Added ${_addedBlks.length} to time block`:'Added to time block');
    return;
  } else if(dragId.startsWith('shop::')){
    const shopId=dragId.split('::')[1];
    const s=st.shopping.find(x=>String(x.id)===String(shopId));
    if(!s){dragId=null;return;}
    if(st.blocks.some(b=>b.ds===ds&&String(b.shopId)===String(shopId))){dragId=null;showToast('Already in time block','#6b7280',2000);return;}
    const prevDue=s.due_date;const prevOrder=s.shop_order;
    const newOrder=_shopTopOrder(s);s.shop_order=newOrder;s.due_date=ds;
    const blk={id:crypto.randomUUID(),title:s.name,ds,sm,dur:autoDur(s.name,'Shopping'),cat:'Shopping',shopId:String(s.id)};
    st.blocks.push(blk);dragId=null;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    sbSaveBlock(blk);
    sbReq('PATCH','shopping_list',{due_date:ds,shop_order:newOrder},`?id=eq.${s.id}`);
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>b.id!==blk.id);
      s.due_date=prevDue;s.shop_order=prevOrder;
      sbReq('PATCH','shopping_list',{due_date:prevDue||null,shop_order:prevOrder??null},`?id=eq.${s.id}`);
      sbDeleteBlock(blk.id);save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    },'Added to time block');
    return;
  } else if(dragId.startsWith('rec::')){
    // recurring virtual task: rec::recId::date
    const recId=dragId.split('::')[1];
    const r=st.recurring.find(x=>String(x.id)===String(recId));
    if(!r){dragId=null;return;}
    const wkKey=wkKeyFromDs(ds);
    const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};
    if(!r._dateOverrides)r._dateOverrides={};
    r._dateOverrides[wkKey]=ds;
    const _recDur=r.default_tb_duration||autoDur(r.name,'Recurring');
    const blk={id:crypto.randomUUID(),title:r.name,ds,sm,dur:_recDur,cat:'Recurring',recId:String(r.id)};
    st.blocks.push(blk);dragId=null;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    sbSaveBlock(blk);
    sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>b.id!==blk.id);
      r._dateOverrides=prevDateOv;
      sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
      sbDeleteBlock(blk.id);save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    },'Added to time block');
    return;
  } else if(dragId.startsWith('bday::')){
    const parts=dragId.split('::');const bdayId=parts[1],bdayName=st.birthdays.find(x=>String(x.id)===String(bdayId));
    if(!bdayName){dragId=null;return;}
    const blk={id:crypto.randomUUID(),title:`${bdayName.name}'s Birthday 🎂`,ds,sm,dur:60,cat:'Birthday',_bdayId:bdayId};
    st.blocks.push(blk);dragId=null;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    sbSaveBlock(blk);
    pushUndo(()=>{st.blocks=st.blocks.filter(b=>b.id!==blk.id);sbDeleteBlock(blk.id);save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();},'Added birthday to time block');
    return;
  } else if(dragId.startsWith('fin-cancel::')){
    const subId=dragId.split('::')[1];
    const sub=st.finSubs.find(x=>String(x.id)===String(subId));
    if(!sub){dragId=null;return;}
    if(st.blocks.some(b=>b.ds===ds&&String(b._finCancelSubId)===String(subId))){dragId=null;showToast('Already in time block','#6b7280',2000);return;}
    const _fcTitle=(()=>{if(!sub.due_day)return'Cancel '+sub.name;const _m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const now=new Date(ds+'T00:00:00');const yr=now.getFullYear(),mo=now.getMonth();let dd;if(sub.due_month&&sub.due_month>=1&&sub.due_month<=12){dd=new Date(yr,sub.due_month-1,sub.due_day);if(dd<now)dd=new Date(yr+1,sub.due_month-1,sub.due_day);}else{dd=new Date(yr,mo,sub.due_day);if(dd<now)dd=new Date(yr,mo+1,sub.due_day);}return'Cancel '+sub.name+' by '+_m[dd.getMonth()]+' '+dd.getDate();})();
    const blk={id:crypto.randomUUID(),title:_fcTitle,ds,sm,dur:30,cat:'Home',_finCancelSubId:String(subId)};
    st.blocks.push(blk);dragId=null;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    sbSaveBlock(blk);
    pushUndo(()=>{st.blocks=st.blocks.filter(b=>b.id!==blk.id);sbDeleteBlock(blk.id);save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();},'Added to time block');
    return;
  } else if(dragId.startsWith('vid::')){
    const vidId=dragId.split('::')[1];
    const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));
    if(!v){dragId=null;return;}
    if(st.blocks.some(b=>b.ds===ds&&String(b._vidId)===String(vidId))){dragId=null;showToast('Already in time block','#6b7280',2000);return;}
    // Remove any existing block for this video on other days
    const _oldVidBlkIdx=st.blocks.findIndex(b=>String(b._vidId)===String(vidId));
    const _oldVidBlk=_oldVidBlkIdx>=0?st.blocks.splice(_oldVidBlkIdx,1)[0]:null;
    if(_oldVidBlk)sbDeleteBlock(_oldVidBlk.id);
    const blk={id:crypto.randomUUID(),title:v.topic||v.title||'Video',ds,sm,dur:60,cat:'Videos',_vidId:String(vidId)};
    // Assign video to this day if not already
    const _vdm=_vidDayMap();const prevDay=_vdm[String(vidId)];
    if(prevDay!==ds){_vdm[String(vidId)]=ds;_vidDayMapSet(_vdm);}
    st.blocks.push(blk);dragId=null;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    sbSaveBlock(blk);
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>b.id!==blk.id);sbDeleteBlock(blk.id);
      if(_oldVidBlk){st.blocks.push(_oldVidBlk);sbSaveBlock(_oldVidBlk);}
      if(prevDay!==ds){const m2=_vidDayMap();if(prevDay)m2[String(vidId)]=prevDay;else delete m2[String(vidId)];_vidDayMapSet(m2);}
      save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    },'Added video to time block');
    return;
  } else if(dragId.startsWith('vidstep::')){
    const parts=dragId.split('::');const _vsVidId=parts[1],_vsStep=parts[2];
    const _vsV=(st.videos||[]).find(x=>String(x.id)===String(_vsVidId));
    if(!_vsV){dragId=null;return;}
    // Th/Des: only allow one timeblock block total
    if(_vsStep==='step_thumbnail'||_vsStep==='step_description'){
      const existing=st.blocks.find(bl=>String(bl._vidStepVid)===String(_vsVidId)&&bl._vidStepName===_vsStep);
      if(existing){dragId=null;return;}
    }
    const _vsLabel=(_VID_STEP_LABELS[_vsStep]||_vsStep.replace('step_',''))+': '+(_vsV.topic||_vsV.title);
    _vidStepAssignToDay(_vsVidId,_vsStep,ds);
    const _vsDur=(_vsStep==='step_build'||_vsStep==='step_vo'||_vsStep==='step_cut')?60:30;
    const blk={id:crypto.randomUUID(),title:_vsLabel,ds,sm,dur:_vsDur,cat:'Videos',_vidStepVid:_vsVidId,_vidStepName:_vsStep};
    st.blocks.push(blk);dragId=null;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    sbSaveBlock(blk);
    pushUndo(()=>{st.blocks=st.blocks.filter(b=>b.id!==blk.id);sbDeleteBlock(blk.id);_vidStepUnassign(_vsVidId,_vsStep);save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();},'Added step to time block');
    return;
  } else {
    // Multi-select: if dragged task is in selectedTasks with others, add all selected items
    const _isMultiTB=selectedTasks.has(String(dragId))&&selectedTasks.size>1;
    const _allSids=_isMultiTB?[...selectedTasks]:[String(dragId)];
    const _addedBlks=[];const _undoOps=[];
    let _curSm=sm;
    const wkKey=wkKeyFromDs(ds);
    for(const sid of _allSids){
      if(sid.startsWith('wrec-')){
        const rid=sid.replace('wrec-','');
        const r=st.recurring.find(x=>String(x.id)===String(rid));
        if(!r)continue;
        if(st.blocks.some(b=>b.ds===ds&&String(b.recId)===String(rid)))continue;
        const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};
        if(!r._dateOverrides)r._dateOverrides={};
        r._dateOverrides[wkKey]=ds;
        const _dur=autoDur(r.name,'Recurring');
        const blk={id:crypto.randomUUID(),title:r.name,ds,sm:_curSm,dur:_dur,cat:'Recurring',recId:String(r.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
        sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
        _undoOps.push(()=>{r._dateOverrides=prevDateOv;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv},recQs(r.id));});
        _curSm+=_dur;
      } else if(sid.startsWith('wrrule-virt-')||sid.startsWith('wrrule-')){
        const rid=sid.replace('wrrule-virt-','').replace('wrrule-','');
        const r=st.wrRules.find(x=>String(x.id)===String(rid));
        if(!r)continue;
        if(st.blocks.some(b=>b.ds===ds&&(String(b.ruleId)===String(rid)||String(b.recId)===String(rid))))continue;
        const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};
        if(!r._dateOverrides)r._dateOverrides={};
        r._dateOverrides[wkKey]=ds;
        const blk={id:crypto.randomUUID(),title:r.name,ds,sm:_curSm,dur:30,cat:'Recurring',ruleId:String(r.id),recId:String(r.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
        sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${rid}`);
        _undoOps.push(()=>{r._dateOverrides=prevDateOv;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv},`?id=eq.${rid}`);});
        _curSm+=30;
      } else if(sid.startsWith('rec-virt-')){
        const rid=sid.replace('rec-virt-','');
        const r=st.recurring.find(x=>String(x.id)===String(rid));
        if(!r)continue;
        if(st.blocks.some(b=>b.ds===ds&&String(b.recId)===String(rid)))continue;
        const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};
        if(!r._dateOverrides)r._dateOverrides={};
        r._dateOverrides[wkKey]=ds;
        const _dur=autoDur(r.name,'Recurring');
        const blk={id:crypto.randomUUID(),title:r.name,ds,sm:_curSm,dur:_dur,cat:'Recurring',recId:String(r.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
        sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
        _undoOps.push(()=>{r._dateOverrides=prevDateOv;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv},recQs(r.id));});
        _curSm+=_dur;
      } else if(sid.startsWith('pup-sess-')){
        const sessId2=sid.replace('pup-sess-','');const sess2=st.pupSessions.find(s=>String(s.id)===String(sessId2));
        if(!sess2)continue;const sk2=(st.pup_skills||[]).find(x=>String(x.id)===String(sess2.skill_id));if(!sk2)continue;
        const blk={id:crypto.randomUUID(),title:sk2.skill,ds,sm:_curSm,dur:30,cat:'pup_session',_pupSessId:String(sess2.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);_curSm+=30;
      } else if(sid.startsWith('shop-cal-')){
        const shopId2=sid.replace('shop-cal-','');const s2=st.shopping.find(x=>String(x.id)===String(shopId2));
        if(!s2||st.blocks.some(b=>b.ds===ds&&String(b.shopId)===String(shopId2)))continue;
        const prevDue=s2.due_date;s2.due_date=ds;
        const _dur=autoDur(s2.name,'Shopping');
        const blk={id:crypto.randomUUID(),title:s2.name,ds,sm:_curSm,dur:_dur,cat:'Shopping',shopId:String(s2.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);sbReqNullable('PATCH','shopping_list',{due_date:ds},`?id=eq.${s2.id}`);
        _undoOps.push(()=>{s2.due_date=prevDue;sbReqNullable('PATCH','shopping_list',{due_date:prevDue||null},`?id=eq.${s2.id}`);});_curSm+=_dur;
      } else {
        const t=st.tasks.find(x=>String(x.id)===sid);
        if(!t||t._virtual)continue;
        const _tid=String(t.id);
        if(st.blocks.find(b=>b.taskId===_tid&&b.ds===ds))continue;
        const _dur=autoDur(t.name,t.category||'Home');
        const prevDate=t.due_date;
        const blk={id:crypto.randomUUID(),title:t.name,ds,sm:_curSm,dur:_dur,cat:t.category||'Home',taskId:_tid};
        if((t.due_date||'').split('T')[0]!==ds){t.due_date=ds;sbReq('PATCH','tasks',{due_date:ds},`?id=eq.${t.id}`);}
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
        _undoOps.push(()=>{t.due_date=prevDate||null;sbReq('PATCH','tasks',{due_date:prevDate||null},`?id=eq.${t.id}`);});
        _curSm+=_dur;
      }
    }
    if(!_addedBlks.length){dragId=null;showToast('Already in time block','#6b7280',2000);return;}
    dragId=null;selectedTasks.clear();save();renderAll();renderPupSkillsHighlight();if(document.getElementById('tbGrid'))renderDayTB();
    const _blkIds=_addedBlks.map(b=>b.id);
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>!_blkIds.includes(b.id));
      _blkIds.forEach(id=>sbDeleteBlock(id));
      _undoOps.forEach(fn=>fn());
      save();renderAll();renderPupSkillsHighlight();if(document.getElementById('tbGrid'))renderDayTB();
    },_addedBlks.length>1?`Added ${_addedBlks.length} tasks to time block`:'Added to time block');
    return;
  }
  const blk={id:crypto.randomUUID(),title,ds,sm,dur:30,cat,taskId};
  st.blocks.push(blk);dragId=null;save();renderAll();
  pushUndo(()=>{st.blocks=st.blocks.filter(b=>b.id!==blk.id);save();renderDayTB();},'Added block');
}
function startTBInlineEdit(blockId,col,onCommit){
  const el=(col||document).querySelector(`[data-bid="${blockId}"]`);
  if(!el){const el2=document.querySelector(`[data-bid="${blockId}"]`);if(!el2)return;return startTBInlineEdit(blockId,el2.closest('.tb-col'),onCommit);}
  const b=st.blocks.find(x=>x.id===blockId);
  if(!b)return;
  el.style.minHeight='22px';el.style.zIndex='10';
  // Category cycling — up/down arrows flip through KCATS, block color updates live
  const _cycleCats=['Home','My work','Work','Social'];
  let _catIdx=Math.max(0,_cycleCats.indexOf(b.cat||'Home'));
  function _applyColor(){
    const cs=gc(_cycleCats[_catIdx]);
    el.style.background=cs.bg;el.style.color=cs.t;el.style.borderColor=cs.b;
    if(_catLbl){_catLbl.textContent=_cycleCats[_catIdx];_catLbl.style.color=cs.t;}
  }
  // Small category label shown below the input while editing
  const _catLbl=document.createElement('div');
  _catLbl.style.cssText='font-size:7.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:1px 3px 0;opacity:.75;pointer-events:none;transition:color .15s';
  _catLbl.textContent=_cycleCats[_catIdx];
  const tbRow=el.querySelector('.tb-row');
  if(tbRow)tbRow.after(_catLbl);else el.appendChild(_catLbl);
  let btSpan=el.querySelector('.tb-bt');
  const inp=document.createElement('input');
  inp.className='tb-edit';
  inp.value=b.title||'';
  inp.placeholder='Name…';
  inp.style.cssText=`width:100%;font-size:9px;font-weight:600;background:${_dk()?'rgba(255,255,255,.06)':'rgba(255,255,255,.8)'};border:none;border-radius:3px;padding:1px 3px;outline:none;font-family:inherit;color:var(--text);min-width:0;box-sizing:border-box`;
  if(btSpan)btSpan.replaceWith(inp);else{if(tbRow)tbRow.prepend(inp);else el.prepend(inp);}
  _applyColor();
  window._tbEditing=true;
  let committed=false;
  let _tbImp=false;
  function _applyImpStyle(){
    if(_tbImp){const is=_IMP();el.style.background=is.bg;el.style.color=is.t;el.style.borderColor=is.b;if(_catLbl)_catLbl.style.color=is.t;}
    else _applyColor();
  }
  async function commit(){
    if(committed)return;committed=true;window._tbEditing=false;
    _catLbl.remove();
    const val=inp.value.trim();
    const chosenCat=_cycleCats[_catIdx];
    if(!val){st.blocks=st.blocks.filter(x=>x.id!==blockId);save();renderDayTB();return;}
    b.title=val;b.cat=chosenCat;
    if(!b.taskId){
      const newTask={id:'t-'+Date.now(),name:val,category:chosenCat,due_date:b.ds,done:false,important:_tbImp};
      st.tasks.push(newTask);b.taskId=String(newTask.id);
      if(onCommit)onCommit();
      save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
      const sv=await sbReq('POST','tasks',{name:val,category:chosenCat,due_date:b.ds,done:false,important:_tbImp});
      if(sv&&sv[0]){const ti=st.tasks.findIndex(x=>x.id===newTask.id);if(ti>-1)st.tasks[ti]={...sv[0]};b.taskId=String(sv[0].id);save();renderToday();renderWkSummary();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();}
      sbSaveBlock(b);
    } else {
      const lt=st.tasks.find(x=>String(x.id)===String(b.taskId));
      const prevTitle=b.title,prevCat=b.cat,prevImp=lt?lt.important:false,prevTCat=lt?lt.category:null;
      if(lt){lt.important=_tbImp;lt.category=chosenCat;}
      b.cat=chosenCat;
      if(onCommit)onCommit();
      save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
      sbUpdateBlock(b.id,{title:b.title,category:chosenCat});
      if(lt)sbReq('PATCH','tasks',{important:_tbImp,category:chosenCat},`?id=eq.${b.taskId}`);
      pushUndo(()=>{
        b.title=prevTitle;b.cat=prevCat;
        if(lt){lt.important=prevImp;lt.category=prevTCat;}
        save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
        sbUpdateBlock(b.id,{title:prevTitle,category:prevCat});
        if(lt)sbReq('PATCH','tasks',{important:prevImp,category:prevTCat},`?id=eq.${b.taskId}`);
      },'Edited block');
    }
  }
  inp.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){e.preventDefault();_catIdx=(_catIdx+1)%_cycleCats.length;_applyColor();}
    else if(e.key==='ArrowUp'){e.preventDefault();_catIdx=(_catIdx-1+_cycleCats.length)%_cycleCats.length;_applyColor();}
    else if((e.metaKey||e.ctrlKey)&&e.key==='i'){e.preventDefault();_tbImp=!_tbImp;_applyImpStyle();}
    else if(e.key==='Enter'){e.preventDefault();commit();}
    else if(e.key==='Escape'){committed=true;window._tbEditing=false;_catLbl.remove();st.blocks=st.blocks.filter(x=>x.id!==blockId);save();renderDayTB();}
  });
  inp.addEventListener('blur',commit);
  requestAnimationFrame(()=>{inp.focus();const _l=inp.value.length;inp.setSelectionRange(_l,_l);});
}

function updateNowLine(){
  const l=document.getElementById('tbNowLine');if(!l)return;
  const n=new Date(),m=(n.getHours()-HOURS[0])*60+n.getMinutes();
  if(m<0){l.style.display='none';return;}
  l.style.display='block';l.style.top=m*PX+'px';
  l.innerHTML='<div class="nowdot"></div>';
}
if(!window._nowLineInterval)window._nowLineInterval=setInterval(updateNowLine,60000);
function onRM(e){if(!resizing)return;const b=st.blocks.find(x=>x.id===resizing.id);if(!b)return;const delta=Math.round((e.clientY-resizing.sy)/PX/15)*15;b.dur=Math.max(15,resizing.sd+delta);if(resizing.others)resizing.others.forEach(o=>{const ob=st.blocks.find(x=>String(x.id)===o.id);if(ob)ob.dur=Math.max(15,o.sd+delta);});renderDayTB();}
function onRU(){if(!resizing)return;const bid=resizing.id;const prevDur=resizing.sd;const others=(resizing.others||[]).slice();resizing=null;document.removeEventListener('mousemove',onRM);document.removeEventListener('mouseup',onRU);const b=st.blocks.find(x=>x.id===bid);if(!b)return;const newDur=b.dur;const otherNewDurs=others.map(o=>{const ob=st.blocks.find(x=>String(x.id)===o.id);return{id:o.id,prev:o.sd,cur:ob?ob.dur:o.sd};});pushUndo(()=>{b.dur=prevDur;sbUpdateBlock(bid,{duration_minutes:prevDur});otherNewDurs.forEach(o=>{const ob=st.blocks.find(x=>String(x.id)===o.id);if(ob){ob.dur=o.prev;sbUpdateBlock(o.id,{duration_minutes:o.prev});}});save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();},'Resized block'+(others.length?'s':''));save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbUpdateBlock(bid,{duration_minutes:newDur});otherNewDurs.forEach(o=>sbUpdateBlock(o.id,{duration_minutes:o.cur}));}
function delBlock(id,e){
  e&&e.stopPropagation();
  const b=st.blocks.find(x=>x.id===id);if(!b)return;
  const copy={...b};
  let removedSess=null;
  if(b.cat==='pup_session'&&b._pupSessId){
    removedSess=st.pupSessions.find(s=>String(s.id)===String(b._pupSessId));
    if(removedSess){st.pupSessions=st.pupSessions.filter(s=>String(s.id)!==String(b._pupSessId));sbReqSilent('DELETE','pup_skill_sessions',null,`?id=eq.${b._pupSessId}`);}
  }
  pushUndo(()=>{
    st.blocks.push(copy);
    if(removedSess){st.pupSessions.push(removedSess);sbReqSilent('POST','pup_skill_sessions',{skill_id:removedSess.skill_id,day_date:removedSess.day_date,done:removedSess.done},'');}
    save();renderAll();renderPupSkillsHighlight();renderToday();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();sbSaveBlock(copy);
  },'Removed from time block');
  st.blocks=st.blocks.filter(x=>x.id!==id);
  save();renderAll();renderPupSkillsHighlight();renderToday();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();sbDeleteBlock(id);
}
// Shared horizontal swipe helper: one fire per swipe, rapid successive swipes allowed
function _hSwipe(state,e,cb){
  if(Math.abs(e.deltaX)<5&&!e.shiftKey)return false;
  e.preventDefault();
  const dx=e.shiftKey?e.deltaY:e.deltaX;
  // While locked, keep resetting d to 0 and extend lock until events stop
  if(state.lock){
    state.d=0;
    if(state.t)clearTimeout(state.t);
    state.t=setTimeout(()=>{state.lock=false;state.d=0;state.t=null;},100);
    return true;
  }
  state.d+=dx;
  if(state.t)clearTimeout(state.t);
  if(Math.abs(state.d)>30){cb(state.d>0?1:-1);state.d=0;state.lock=true;
    state.t=setTimeout(()=>{state.lock=false;state.d=0;state.t=null;},100);}
  else{state.t=setTimeout(()=>{state.d=0;state.t=null;},200);}
  return true;
}
const _wrRecSw={d:0,t:null,lock:false};
function onWrRecWheel(e){_hSwipe(_wrRecSw,e,dir=>shiftWrRec(dir));}
const _todSw={d:0,t:null,lock:false};
function onTodWheel(e){_hSwipe(_todSw,e,dir=>shiftDay(dir));}
const _tbSw={d:0,t:null,lock:false};
function onTBWheel(e){
  if(_hSwipe(_tbSw,e,dir=>shiftDay(dir)))return;
  const sc=document.getElementById('tbScroll');const atTop=sc.scrollTop<=0,atBot=sc.scrollTop+sc.clientHeight>=sc.scrollHeight-2;
  if(e.deltaY<0&&atTop){e.preventDefault();tbWD+=e.deltaY;if(tbWT)clearTimeout(tbWT);tbWT=setTimeout(()=>{if(tbWD<-40)shiftDay(-1);tbWD=0;tbWT=null;},100);}
  else if(e.deltaY>0&&atBot){e.preventDefault();tbWD+=e.deltaY;if(tbWT)clearTimeout(tbWT);tbWT=setTimeout(()=>{if(tbWD>40)shiftDay(1);tbWD=0;tbWT=null;},100);}
}
function shiftDay(n){const fl=document.getElementById('dayFlash');fl.textContent=n>0?'→':'←';fl.classList.add('show');setTimeout(()=>fl.classList.remove('show'),300);dayOff+=n;const _newDs=d2s(getDayDate(dayOff));const _newWkKey=dsToWkKey(_newDs);const _curWkKey=getWkKey(wkOff);if(_newWkKey!==_curWkKey){const _newWkOff=Math.round((new Date(_newWkKey+'T00:00:00')-new Date(getWkKey(0)+'T00:00:00'))/(7*86400000));wkOff=_newWkOff;renderWkSummary();}renderWkCal();renderDayTB();renderToday();}
function goToday(){dayOff=0;if(wkOff!==0){wkOff=0;renderWkSummary();}renderWkCal();renderDayTB();renderToday();}
function shiftWk(n){wkOff+=n;renderWkSummary();renderWkCal();renderUnassigned();renderPupSkillsHighlight();if(typeof renderMealRow==='function')renderMealRow();}
function goThisWk(){wkOff=0;renderWkSummary();renderWkCal();renderUnassigned();renderPupSkillsHighlight();if(typeof renderMealRow==='function')renderMealRow();}

// ── Notes expand on hover ────────────────────────────────────────────────────
(function(){
  function expandNotes(notesEl){
    const block=notesEl.closest('.tb-block');if(!block)return;
    if(notesEl.offsetTop+notesEl.offsetHeight<=block.clientHeight+2)return;
    if(block._expandOrig!==undefined)return;
    block._expandOrig=block.style.height;
    block.style.height=block.scrollHeight+'px';
    block.classList.add('tb-expanded');
  }
  function collapseNotes(block){
    if(!block||block._expandOrig===undefined)return;
    block.style.height=block._expandOrig;
    block.classList.remove('tb-expanded');
    delete block._expandOrig;
  }
  document.addEventListener('mouseover',e=>{const n=e.target.closest('.tb-notes');if(n)expandNotes(n);});
  document.addEventListener('mouseleave',e=>{const b=e.target.closest&&e.target.closest('.tb-block');if(b)collapseNotes(b);},true);
  document.addEventListener('mouseover',e=>{
    const b=e.target.closest('.tb-block');
    document.querySelectorAll('.tb-block.tb-expanded').forEach(bl=>{if(bl!==b)collapseNotes(bl);});
  });
})();
function openBModal(){document.getElementById('bModal').classList.add('open');}
function saveBlock(){
  const title=document.getElementById('bTitle').value.trim();if(!title)return;
  const[hh,mm]=document.getElementById('bStart').value.split(':').map(Number);
  const blk={id:crypto.randomUUID(),title,ds:d2s(getDayDate(dayOff)),sm:hh*60+(mm||0),dur:parseInt(document.getElementById('bDur').value),cat:document.getElementById('bCat').value};
  st.blocks.push(blk);document.getElementById('bTitle').value='';closeMod('bModal');save();renderDayTB();
  sbSaveBlock(blk);
  pushUndo(()=>{st.blocks=st.blocks.filter(b=>b.id!==blk.id);save();renderDayTB();sbDeleteBlock(blk.id);},'Added block');
}

