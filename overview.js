// ── Render all ─────────────────────────────────────────────────────────────────
function renderAll(){renderOv();renderWeeklyPage();renderShopFull();renderTravelPage();renderBdayPage();if(typeof renderPupsPage==='function')renderPupsPage();if(typeof renderRecipesPage==='function')renderRecipesPage();if(document.getElementById('mModal')?.classList.contains('open'))renderMoCal();if(document.getElementById('recMoModal')?.classList.contains('open'))renderRecMoCal();if(document.getElementById('woModal')?.classList.contains('open'))renderWOModal();save();requestAnimationFrame(applySelHighlight);const m=document.getElementById('main');if(m&&m.style.opacity==='0')m.style.opacity='1';}

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
  const allRecVirt=[];
  for(let w=0;w>=wkOff-4;w--){
    getRecurringWeekTasks(w).forEach(v=>{
      // If this task has been __skip__'d for its occurrence week or any later week up to today, don't show as overdue
      const _rec=st.recurring.find(x=>String(x.id)===String(v._recId));
      if(_rec&&_rec._dateOverrides){for(let sw=w;sw<=0;sw++){if(_rec._dateOverrides[getWkKey(sw)]==='__skip__')return;}}
      if(!allRecVirt.find(x=>x._recId===v._recId))allRecVirt.push(v);
    });
  }
  // Weekly reset tasks pinned to today/overdue via _dateOverrides (look back 4 weeks)
  const _wkKeyNow=getWkKey(wkOff);
  const _wrecSeen=new Set();const wrecToday=[];
  for(let _w=0;_w>=wkOff-4;_w--){const _wkKey=getWkKey(_w);st.recurring.filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&r._dateOverrides&&r._dateOverrides[_wkKey]&&r._dateOverrides[_wkKey]!=='__skip__'&&(r._dateOverrides[_wkKey]===ds||(dayOff===0&&r._dateOverrides[_wkKey]<ds))&&!_wrecSeen.has(String(r.id))).forEach(r=>{_wrecSeen.add(String(r.id));const _isDone=!!(r._doneByWk&&r._doneByWk[_wkKey]);wrecToday.push({id:'rec-virt-'+r.id,name:r.name,category:'Recurring',due_date:r._dateOverrides[_wkKey],done:_isDone,_recId:r.id,_virtual:true,_wkKey:_wkKey,_isWrec:true});});}
  // New-style WR rules pinned to today/overdue via _dateOverrides (look back 4 weeks)
  const _wrRulesSeen=new Set();const wrRulesToday=[];
  for(let _w=0;_w>=wkOff-4;_w--){const _wkKey=getWkKey(_w);st.wrRules.filter(r=>r._dateOverrides&&r._dateOverrides[_wkKey]&&r._dateOverrides[_wkKey]!=='__skip__'&&!(st.wrOverrides||[]).some(o=>String(o.rule_id)===String(r.id)&&o.wk_key===_wkKey&&o.override_type==='skip')&&(r._dateOverrides[_wkKey]===ds||(dayOff===0&&r._dateOverrides[_wkKey]<ds&&!isDoneWRRule(r.id,_wkKey)))&&!_wrRulesSeen.has(String(r.id))).forEach(r=>{_wrRulesSeen.add(String(r.id));const _isDone=isDoneWRRule(r.id,_wkKey);wrRulesToday.push({id:'wrrule-virt-'+r.id,name:r.name,category:'Recurring',due_date:r._dateOverrides[_wkKey],done:_isDone,_ruleId:r.id,_virtual:true,_wkKey:_wkKey,_isWrRule:true});});}
  // Shopping items due today (or overdue when viewing today)
  const shopToday=st.shopping
    .filter(s=>!s.done&&s.due_date&&(s.due_date===ds||(dayOff===0&&isOv(s.due_date))))
    .map(s=>({id:'shop-cal-'+s.id,name:s.name,category:'Shopping',due_date:s.due_date,done:!!s.done,_shopId:s.id,_virtual:true,_type:'shop',store:s.store}));
  const pupSessToday=(st.pupSessions||[])
    .filter(s=>s.day_date===ds||(dayOff===0&&s.day_date<ds&&!s.done))
    .map(s=>{const skill=(st.pup_skills||[]).find(x=>String(x.id)===String(s.skill_id));if(!skill)return null;return{id:'pup-sess-'+s.id,name:skill.skill,category:'Recurring',due_date:s.day_date,done:s.done,_pupSessId:s.id,_skillId:s.skill_id,_pup:skill.pup,_virtual:true,_type:'pup'};}).filter(Boolean);
  const virtToday=[
    ...allRecVirt.filter(v=>v.due_date===ds||(dayOff===0&&isOv(v.due_date)&&!v.done)),
    ...wrecToday,
    ...wrRulesToday,
    ...shopToday,
    ...pupSessToday,
    ...getExtrasForDate(ds)
  ];
  const allToday=[...ts,...virtToday];
  const sorted=sortTasksToday(allToday);
  const doneCount=sorted.filter(t=>t.done).length;
  // todBadge removed
  document.getElementById('todPL').textContent=`${doneCount}/${sorted.length}`;const _todP=document.getElementById('todPct');if(_todP)_todP.textContent=(sorted.length?Math.round(doneCount/sorted.length*100):0)+'%';
  document.getElementById('todPB').style.width=sorted.length?`${doneCount/sorted.length*100}%`:'0%';
  const _todDs=ds;
  function _hasTBToday(t){
    if(t._type==='travel'||t._type==='birthday')return true;
    const isOvToday=dayOff===0&&isOv(t.due_date)&&!t.done;
    if(t._shopId)return st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&String(b.shopId)===String(t._shopId));
    if(t._ruleId)return st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&(String(b.ruleId)===String(t._ruleId)||String(b.recId)===String(t._ruleId)));
    if(t._recId)return st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&String(b.recId)===String(t._recId));
    if(!t._virtual)return st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&String(b.taskId)===String(t.id));
    return true;
  }
  document.getElementById('todList').innerHTML=sorted.map(t=>{
    const arr=!t.done&&!_hasTBToday(t);
    return t._type==='travel'||t._type==='birthday'?tRowExtra(t):t._type==='shop'?tRowShopVirt(t,true,arr,true):t._type==='pup'?tRowPupSess(t,true):t._virtual?tRowTodayVirt(t,arr,true):tRow(t,{cat:true,catDot:true,drag:true,noDate:true,tbArrow:arr,noColor:true});
  }).join('');
  updateOvBanner();
  renderPupSkillsHighlight();
  renderDailyHabits();
}
// ── Pup Skills Highlight ───────────────────────────────────────────────────────
function _pupWkSessions(skillId){
  const{mon,sun}=getWkBounds(0);
  const monDs=d2s(mon),sunDs=d2s(sun);
  return(st.pupSessions||[]).filter(s=>String(s.skill_id)===String(skillId)&&s.day_date>=monDs&&s.day_date<=sunDs);
}
function renderPupSkillsHighlight(){
  const el=document.getElementById('pupSkillsHighlight');if(!el)return;
  const allSkills=(st.pup_skills||[]).filter(s=>(s.focus===true||s.focus==='true')&&s.stage!=='Mastered');
  if(!allSkills.length){el.style.cssText='display:none';return;}
  el.style.cssText='display:block;background:rgba(255,255,255,0.18);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.35);border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.06);margin:10px 14px;padding:4px 0';
  const skills=[...allSkills].sort((a,b)=>{
    const aSess=_pupWkSessions(a.id),bSess=_pupWkSessions(b.id);
    const aDone=aSess.length>0&&aSess.every(s=>s.done),bDone=bSess.length>0&&bSess.every(s=>s.done);
    if(aDone&&!bDone)return 1;if(!aDone&&bDone)return -1;
    const pupOrd=p=>p==='Mochi'?0:p==='Sunny'?1:2;
    return pupOrd(a.pup)-pupOrd(b.pup);
  });
  const rows=skills.map(s=>{
    const sess=_pupWkSessions(s.id);
    const total=sess.length,doneC=sess.filter(x=>x.done).length;
    const allDone=total>0&&doneC===total;
    const glow=s.pup==='Mochi'?'0 0 4px 2px rgba(167,139,250,.2)':s.pup==='Sunny'?'0 0 4px 2px rgba(253,224,71,.25)':'0 0 4px 1px rgba(148,163,184,.15)';
    const right=total>0
      ?`<span style="font-size:10px;font-weight:600;color:${allDone?'var(--muted)':'var(--accent)'};margin-left:auto;flex-shrink:0">${doneC}/${total}</span>`
      :`<label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" onchange="togPupSkillTrained('${s.id}',this.checked)" style="box-shadow:${glow}"></label>`;
    return`<div class="ti${allDone?' done':''}" draggable="true" style="${allDone?'opacity:.45':''}" ondragstart="dragId='pupskill::${s.id}';event.dataTransfer.effectAllowed='copy';this.style.opacity='.4';document.body.classList.add('body-dragging');showWkcEdges(true);" ondragend="this.style.opacity='';document.body.classList.remove('body-dragging');showWkcEdges(false);" ondblclick="openPupEditModal('${s.id}')" onmouseenter="showPupSkillTip(this,'${s.id}')" onmouseleave="hidePupSkillTip()">
      ${right}
      <span class="tn" style="color:var(--muted);font-size:11px;font-weight:400">${escHtml(s.skill)}</span>
    </div>`;
  }).join('');
  el.innerHTML=`<div style="display:flex;align-items:center;padding:4px 10px 5px;gap:8px;border-bottom:1px solid rgba(210,205,228,.3)">
    <button onclick="showPage('pups')" style="flex-shrink:0;text-align:left;background:rgba(255,255,255,.9);border:1px solid rgba(210,205,228,.6);border-radius:var(--rs);cursor:pointer;font-size:10px;font-weight:600;color:var(--text);font-family:inherit;padding:2px 6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.6);display:inline-flex;align-items:center">Pup Skills</button>
    <button class="btn-plus" onclick="openPupAddModal()" style="margin-left:auto">+</button>
  </div><div style="padding:2px 0 2px">${rows}</div>`;
}
async function togPupSkillTrained(id,checked){
  const today=d2s(new Date());
  const existing=st.pupSessions.find(s=>String(s.skill_id)===String(id)&&s.day_date===today);
  if(checked){
    if(existing){
      existing.done=true;
      save();renderPupSkillsHighlight();
      sbReqSilent('PATCH','pup_skill_sessions',{done:true},`?id=eq.${existing.id}`);
    } else {
      const tmp='pss-tmp-'+Date.now();
      st.pupSessions.push({id:tmp,skill_id:id,day_date:today,done:true});
      save();renderPupSkillsHighlight();
      const sv=await sbReqSilent('POST','pup_skill_sessions',{skill_id:id,day_date:today,done:true});
      if(sv&&sv[0]){const i=st.pupSessions.findIndex(s=>s.id===tmp);if(i>-1)st.pupSessions[i]=sv[0];}
      save();
    }
  } else {
    if(existing){
      existing.done=false;
      save();renderPupSkillsHighlight();
      sbReqSilent('PATCH','pup_skill_sessions',{done:false},`?id=eq.${existing.id}`);
    }
  }
}
async function togPupSessionDone(sessId,done){
  const sess=st.pupSessions.find(s=>String(s.id)===String(sessId));if(!sess)return;
  sess.done=done;
  save();renderPupSkillsHighlight();renderToday();renderWkCal();
  sbReqSilent('PATCH','pup_skill_sessions',{done},`?id=eq.${sessId}`);
}
async function removePupSession(sessId){
  st.pupSessions=st.pupSessions.filter(s=>String(s.id)!==String(sessId));
  save();renderPupSkillsHighlight();renderToday();renderWkCal();
  sbReqSilent('DELETE','pup_skill_sessions',null,`?id=eq.${sessId}`);
}
// ── Pup Skill Tooltip ────────────────────────────────────────────────────────
let _pupTipTimer=null;
function showPupSkillTip(el,id){
  clearTimeout(_pupTipTimer);
  const s=(st.pup_skills||[]).find(x=>String(x.id)===String(id));if(!s)return;
  let tip=document.getElementById('_pupSkillTip');
  if(!tip){tip=document.createElement('div');tip.id='_pupSkillTip';tip.style.cssText='position:fixed;z-index:9999;background:rgba(255,255,255,.97);border:1px solid rgba(210,205,228,.7);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.12);padding:8px 11px;font-size:11px;font-family:inherit;pointer-events:none;min-width:140px;max-width:200px';document.body.appendChild(tip);}
  const pupColor=s.pup==='Mochi'?'#a78bfa':s.pup==='Sunny'?'#ca8a04':'var(--muted)';
  const pupLetter=s.pup==='Mochi'?'M':s.pup==='Sunny'?'S':'?';
  const skillLine=s.skill?`<div style="display:flex;justify-content:space-between;align-items:baseline;line-height:1.4;margin-bottom:3px"><span style="color:var(--text);font-weight:700;font-size:12px">${escHtml(s.skill)}</span><span style="font-weight:700;font-size:11px;color:${pupColor};margin-left:10px">${pupLetter}</span></div>`:'';
  const nextLine=s.next_step?`<div style="line-height:1.4;margin-bottom:2px;font-size:11px;font-weight:500;color:rgba(44,24,16,.55)">${escHtml(s.next_step)}</div>`:'';
  const notesLine=s.comments?`<div style="line-height:1.4;font-size:10px;color:var(--subtle)">${escHtml(s.comments)}</div>`:'';
  tip.innerHTML=skillLine+nextLine+notesLine;
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
  el.innerHTML=`<div style="display:flex;align-items:center;padding:4px 10px 2px;gap:6px;border-top:1px solid rgba(0,0,0,.06);margin-top:2px">
    <span style="font-size:10px;font-weight:600;letter-spacing:.05em;color:rgba(60,60,80,.55);text-transform:uppercase;flex:1">Daily</span>
    ${habits.length?`<span style="font-size:10px;color:rgba(60,60,80,.45);font-weight:500">${doneCount}/${habits.length}</span>`:''}
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
// Type priority for sorting: regular=1, recurring=2, shopping=3, birthday=4 (travel sorts first via pre-check)
function taskTypePri(t){
  if(t._type==='birthday')return 4;
  if(t._type==='shop')return 3;
  if(t._type==='pup')return 2;
  if(t._virtual)return 2;
  return 1;
}
function sortByTypeOrder(tasks){
  return[...tasks].sort((a,b)=>{
    if(a.done&&!b.done)return 1;if(!a.done&&b.done)return -1;
    const aT=a._type==='travel'&&!a.done,bT=b._type==='travel'&&!b.done;
    if(aT&&!bT)return -1;if(!aT&&bT)return 1;
    const aO=isOv(a.due_date)&&!a.done,bO=isOv(b.due_date)&&!b.done;
    if(aO&&!bO)return -1;if(!aO&&bO)return 1;
    const aI=a.important&&!a.done,bI=b.important&&!b.done;
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
    if(t._shopId)b=blks.find(x=>String(x.shopId)===String(t._shopId));
    else if(t._ruleId)b=blks.find(x=>String(x.ruleId)===String(t._ruleId)||String(x.recId)===String(t._ruleId));
    else if(t._recId)b=blks.find(x=>String(x.recId)===String(t._recId));
    else if(!t._virtual)b=blks.find(x=>String(x.taskId)===String(t.id));
    return b?b.sm:null;
  }
  return[...tasks].sort((a,b)=>{
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
    if(t._shopId)b=st.blocks.find(x=>String(x.shopId)===String(t._shopId));
    else if(t._ruleId)b=st.blocks.find(x=>String(x.ruleId)===String(t._ruleId)||String(x.recId)===String(t._ruleId));
    else if(t._recId)b=st.blocks.find(x=>String(x.recId)===String(t._recId));
    else if(!t._virtual)b=st.blocks.find(x=>String(x.taskId)===String(t.id));
    return b?b.sm:null;
  }
  if(!tasks.some(t=>tbSmAny(t)!==null))return sortByTypeOrder(tasks);
  return[...tasks].sort((a,b)=>{
    if(a.done&&!b.done)return 1;if(!a.done&&b.done)return -1;
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
  const ps=ov?OV:s;
  const _dragId=t._isWrRule?`wrrule::${t._ruleId}`:t._isWrec?`wrec::${t._recId}`:`rec::${t._recId}::${t.due_date||''}`;
  const _chk=t._isWrRule?`togWrRule('${t._ruleId}',this.checked,'${t._wkKey||getWkKey(wkOff)}')`
    :t._isWrec?`togRec('${t._recId}',this.checked,'${t._wkKey||getWkKey(wkOff)}')`:`togRecVirt('${t._recId}',this.checked,'${t._wkKey||getWkKey(wkOff)}')`;
  const _xBtn=t._isWrRule?`showWrScopePicker(event,'⊘  Skip this week only','✕  Delete rule (all future)',()=>writeWrOverride('${t._ruleId}','${t._wkKey||getWkKey(wkOff)}',{override_type:'skip'},{undoLabel:'Skipped WR task this week'}),()=>wrCtxDeleteRule('${t._ruleId}'),'⊠  Remove from views',()=>unscheduleWrRule('${t._ruleId}','${t._wkKey||getWkKey(wkOff)}'))`
    :t._isWrec?`showWrScopePicker(event,'⊘  Skip this week only','✕  Delete recurring task',()=>skipWRec('${t._recId}','${t._wkKey||getWkKey(wkOff)}'),()=>delRec('${t._recId}'),'⊠  Remove from views',()=>unscheduleWRec('${t._recId}','${t._wkKey||getWkKey(wkOff)}'))`
    :`showWrScopePicker(event,'⊘  Skip this week only','✕  Delete recurring task',()=>skipRecVirtThisWk('${t._recId}','${t._wkKey||getWkKey(wkOff)}'),()=>delRec('${t._recId}'))`;
  const _recIdAttr=t._isWrRule?t._ruleId:t._recId;
  const _wkKeyAttr=t._wkKey||getWkKey(wkOff);
  const _dblClick=t._isWrRule?`event.stopPropagation();openWrEditModal('${t._ruleId}','${_wkKeyAttr}','all')`:`tiDblRec(event,'${_recIdAttr}')`;
  const _ctxMenu=t._isWrRule?`showWrRuleCtx(event,'${t._ruleId}','${_wkKeyAttr}')`:t._isWrec||t._virtual?`showWrRuleCtx(event,'${_recIdAttr}','${_wkKeyAttr}')`:`showCtx(event,'${t.id}',true,'${_recIdAttr}')`;

  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''}" style="${!ov&&!noColor?`background:${s.bg}`:''}" id="ti-${t.id}" draggable="true" ondragstart="dragId='${_dragId}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);" ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);" onclick="selTask(event,'${t.id}')" ondblclick="${_dblClick}" oncontextmenu="${_ctxMenu}">
    <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="${_chk}"></label>
    <span class="tn">${t.name}</span>
    <svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${ps.bg}" stroke="${ps.d}" stroke-opacity="0.4" stroke-width="1"/></svg>
    ${tbArrow?'<span class="tb-arrow">›</span>':''}
    <button class="delbtn" onclick="event.stopPropagation();${_xBtn}">✕</button>
  </div>`;
}

function tRowShopVirt(t,noDate=false,tbArrow=false,noColor=false){
  const s=gc('shopping');
  const ov=isOv(t.due_date)&&!t.done;
  const ps=ov?OV:s;
  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''}" style="${!ov&&!noColor?`background:${s.bg}`:''}" id="ti-${t.id}" draggable="true"
    ondragstart="dragId='shop::${t._shopId}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);"
    ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);"
    onclick="selTask(event,'${t.id}')" ondblclick="tiDblShop(event,'${t._shopId}')" oncontextmenu="showCtxShop(event,'${t._shopId}')">
    <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="togShop('${t._shopId}',this.checked)"></label>
    <span class="tn">${t.name}</span>
    <svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${ps.bg}" stroke="${ps.d}" stroke-opacity="0.4" stroke-width="1"/></svg>
    ${!noDate&&t.due_date?`<span class="dlbl ${ov?'ov':''}">${fmtD(t.due_date)}</span>`:''}
    ${tbArrow?'<span class="tb-arrow">›</span>':''}
    <button class="delbtn" onclick="event.stopPropagation();unscheduleShop('${t._shopId}')">✕</button>
  </div>`;
}
function tRowPupSess(t,noColor=false){
  const ov=isOv(t.due_date)&&!t.done;
  const s=gc('recurring');const ps=ov?OV:s;
  const pupGlow=t._pup==='Mochi'?'0 0 4px 2px rgba(167,139,250,.2)':t._pup==='Sunny'?'0 0 4px 2px rgba(253,224,71,.25)':'0 0 4px 1px rgba(148,163,184,.15)';
  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''}" style="${!ov&&!noColor?`background:${s.bg}`:''}" id="ti-pup-sess-${t._pupSessId}">
    <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="togPupSessionDone('${t._pupSessId}',this.checked)" style="box-shadow:${pupGlow}"></label>
    <span class="tn">${escHtml(t.name)}</span>
    <svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${ps.bg}" stroke="${ps.d}" stroke-opacity="0.4" stroke-width="1"/></svg>
    <button class="delbtn" onclick="event.stopPropagation();removePupSession('${t._pupSessId}')">✕</button>
  </div>`;
}
// ── Week summary (important→rest, NO overdue; + recurring tasks for this week) ─
function renderWkSummary(){
  const virtRec=getRecurringWeekTasks(wkOff);
  const virtExtras=getExtrasForWeek(wkOff);
  const _wrecWkk=getWkKey(wkOff);
  const wrecThisWk=st.recurring
    .filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&r._dateOverrides&&r._dateOverrides[_wrecWkk]&&r._dateOverrides[_wrecWkk]!=='__skip__')
    .map(r=>{const ds=r._dateOverrides[_wrecWkk];return{id:'rec-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:!!(r._doneByWk&&r._doneByWk[_wrecWkk]),_recId:r.id,_virtual:true,_isWrec:true,_wkKey:_wrecWkk};})
    .filter(v=>v.due_date&&!v.done);
  const wrRulesThisWk=st.wrRules
    .filter(r=>r._dateOverrides&&r._dateOverrides[_wrecWkk]&&r._dateOverrides[_wrecWkk]!=='__skip__'&&!isDoneWRRule(r.id,_wrecWkk))
    .map(r=>{const ds=r._dateOverrides[_wrecWkk];return{id:'wrrule-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:false,_ruleId:r.id,_virtual:true,_isWrRule:true,_wkKey:_wrecWkk};})
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
      ...virtExtras
    ]),
    ...doneThisWk
  ];
  const allReal=st.tasks.filter(t=>isInWk(t.due_date,wkOff));
  const doneReal=allReal.filter(t=>t.done).length;
  const doneVirt=virtRec.filter(v=>v.done).length;
  const totalAll=allReal.length+virtRec.length+virtExtras.length;
  const totalDone=doneReal+doneVirt;
  // wkBadge removed
  document.getElementById('wkPL').textContent=`${totalDone}/${totalAll}`;const _wkP=document.getElementById('wkPct');if(_wkP)_wkP.textContent=(totalAll?Math.round(totalDone/totalAll*100):0)+'%';
  document.getElementById('wkPB').style.width=totalAll?`${totalDone/totalAll*100}%`:'0%';
  document.getElementById('wkList').innerHTML=ts.map(t=>t._type==='travel'||t._type==='birthday'?tRowExtra(t):t._type==='shop'?tRowShopVirt(t):tRowWk(t)).join('');
}

// ── Week calendar ──────────────────────────────────────────────────────────────
// Track drag-to-add-travel state
let tvDragStart=null,tvDragEnd=null;
let calDrag={active:false,startDs:null,endDs:null,view:null,moved:false};


function renderWkCal(){
  const dates=getWkDates(wkOff);
  document.getElementById('wkcLbl').textContent=`${dates[0].toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${dates[6].toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
  const head=document.getElementById('wkcHead');head.innerHTML='';
  dates.forEach(d=>{
    const h=document.createElement('div');h.className='wkc-day-h';
    h.innerHTML=`<div class="wkc-dn">${DNAMES[d.getDay()===0?6:d.getDay()-1].slice(0,3)}</div><div class="wkc-dd ${isDateToday(d)?'tn2':''}">${d.getDate()}</div>`;
    head.appendChild(h);
  });
  const goalsH=document.createElement('div');goalsH.className='wkc-day-h wkc-goals-h';
  goalsH.innerHTML=`<button class="wo-hdr-btn" onclick="openWOModal()">Weekly<br>Objectives</button>`;
  head.appendChild(goalsH);

  // ── Render travel banners ────────────────────────────────────────────────────
  const bannerEl=document.getElementById('wkcBanners');bannerEl.innerHTML='';
  // Wait for cols to lay out, then position
  const wkDss=dates.map(d=>d2s(d));
  // Get travel trips that overlap this week
  const travelThisWk=st.travel.filter(tv=>{
    const s=tv.start_date?tv.start_date.split('T')[0]:null;
    const e=tv.end_date?tv.end_date.split('T')[0]:s;
    if(!s)return false;
    return s<=wkDss[6]&&(e||s)>=wkDss[0];
  });
  const bdayThisWk=getBirthdayTasks(null).filter(b=>wkDss.includes(b.due_date));
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
  const _colPaddingPre=_preLanes.map(lanes=>lanes.size?`${(Math.max(...lanes)+1)*22}px`:'0');
  setTimeout(()=>{
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
      ban.style.cssText=`left:${left+2}px;top:${headH+2+lane*22}px;width:${right-left-4}px;background:${s.bg};color:${s.t};border-color:${s.b}${isPast?';opacity:.35':''}`;
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
      const label=tv.destination?`${modeIconHtml}${escHtml(tv.name)} → ${escHtml(tv.destination)}`:`${modeIconHtml}${escHtml(tv.name)}`;
      const tripsEndsThisWeek=!ed||ed<=wkDss[6];
      const ban=addBanner(label,sd,ed,s,null,isPast);
      if(!ban)return;
      const tvSid='tv-'+tv.id;
      ban.dataset.tvid=String(tv.id);
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
      addBanner(b.name,b.due_date,b.due_date,s,null,b.due_date<today2);
    });

    // Set banner container height based on lanes used (paddingTop already set synchronously)
    let maxLane=-1;
    colLanes.forEach(lanes=>{const ml=lanes.size?Math.max(...lanes):-1;if(ml>maxLane)maxLane=ml;});
    if(maxLane>=0)bannerEl.style.height=`${headH+(maxLane+1)*22+4}px`;
  },10);

  // ── Render per-day columns ───────────────────────────────────────────────────
  const cols=document.getElementById('wkcCols');cols.innerHTML='';
  dates.forEach((date,di)=>{
    const ds=d2s(date);
    const col=document.createElement('div');col.className='wkc-col';
    col.dataset.ds=ds;
    col.style.paddingTop=_colPaddingPre[di];

    // Mouse-drag to create travel spanning days
    col.addEventListener('mousedown',e=>{
      if(e.button!==0)return;
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
          save();dragId=null;renderAll();if(document.getElementById('tbGrid'))renderDayTB();
          sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
          pushUndo(()=>{
            if(prevOverride)r._dateOverrides[wkKey]=prevOverride;
            else delete r._dateOverrides[wkKey];
            st.blocks=st.blocks.filter(b=>!(b.recId&&String(b.recId)===String(r.id)&&b.ds===ds));
            savedBlocks.forEach(b=>{st.blocks.push(b);sbSaveBlock(b);});
            save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
            sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
          },'Moved recurring task');
        }
        dragId=null;return;
      }
      // New-style WR rule dragged onto weekly calendar
      if(dragId.startsWith('wrrule::')){
        const ruleId=dragId.split('::')[1];
        const r=st.wrRules.find(x=>String(x.id)===String(ruleId));
        if(r){
          if(!r._dateOverrides)r._dateOverrides={};
          const wkKey=getWkKey(wkOff);
          const prev=r._dateOverrides[wkKey];
          r._dateOverrides[wkKey]=ds;
          save();dragId=null;renderAll();
          sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${ruleId}`);
          pushUndo(()=>{if(prev)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];save();renderAll();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${ruleId}`);},'Pinned WR task to '+ds);
        }
        dragId=null;return;
      }
      // Weekly reset task dragged onto calendar
      if(dragId.startsWith('wrec::')){
        const recId=dragId.split('::')[1];
        const r=st.recurring.find(x=>String(x.id)===String(recId));
        if(r){
          if(!r._dateOverrides)r._dateOverrides={};
          const wkKey=getWkKey(wkOff);
          const prev=r._dateOverrides[wkKey];
          r._dateOverrides[wkKey]=ds;
          removeTBBlocksForDate(ds,{recId:r.id});
          save();dragId=null;renderAll();renderWkCal();
          sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
          pushUndo(()=>{
            if(prev)r._dateOverrides[wkKey]=prev;
            else delete r._dateOverrides[wkKey];
            save();renderAll();renderWkCal();
            sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
          },'Pinned weekly task to '+ds);
        }
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
              save();dragId=null;renderPupSkillsHighlight();renderWkCal();renderToday();
              sbReqSilent('PATCH','pup_skill_sessions',{day_date:ds},`?id=eq.${sessId}`);
              pushUndo(()=>{sess.day_date=prev;save();renderPupSkillsHighlight();renderWkCal();renderToday();sbReqSilent('PATCH','pup_skill_sessions',{day_date:prev},`?id=eq.${sessId}`);},'Moved pup session');
            }
          }
        }
        dragId=null;return;
      }
      // Pup skill dragged onto calendar day — create a session
      if(dragId.startsWith('pupskill::')){
        const skillId=dragId.split('::')[1];
        const already=st.pupSessions.find(s=>String(s.skill_id)===String(skillId)&&s.day_date===ds);
        if(!already){
          const tmp='pss-tmp-'+Date.now();
          st.pupSessions.push({id:tmp,skill_id:skillId,day_date:ds,done:false});
          save();dragId=null;renderPupSkillsHighlight();
          const sv=await sbReqSilent('POST','pup_skill_sessions',{skill_id:skillId,day_date:ds,done:false});
          if(sv&&sv[0]){const i=st.pupSessions.findIndex(s=>s.id===tmp);if(i>-1)st.pupSessions[i]=sv[0];}
          save();
        }
        dragId=null;return;
      }
      // Shopping item dragged onto calendar
      if(dragId.startsWith('shop::')){
        const shopId=dragId.split('::')[1];
        const s=st.shopping.find(x=>String(x.id)===String(shopId));
        if(s){
          const prev=s.due_date;const prevOrder=s.shop_order;
          const newOrder=_shopTopOrder(s);s.shop_order=newOrder;s.due_date=ds;
          removeTBBlocksForDate(ds,{shopId:s.id});
          save();dragId=null;renderAll();renderWkCal();
          sbReqNullable('PATCH','shopping_list',{due_date:ds,shop_order:newOrder},`?id=eq.${s.id}`);
          pushUndo(()=>{
            s.due_date=prev;s.shop_order=prevOrder;save();renderAll();renderWkCal();
            sbReqNullable('PATCH','shopping_list',{due_date:prev||null,shop_order:prevOrder??null},`?id=eq.${s.id}`);
          },'Assigned shopping item to '+ds);
        }
        dragId=null;return;
      }
      const t=st.tasks.find(x=>String(x.id)===String(dragId));
      if(t){
        const prev={due_date:t.due_date};
        const sid=String(t.id);
        const prevDs=(prev.due_date||'').split('T')[0];
        const savedTBs=st.blocks.filter(b=>String(b.taskId)===String(t.id)&&b.ds===prevDs).map(b=>({...b}));
        localOverrides[sid]={due_date:ds};pendingLocal.add(sid);save();
        t.due_date=ds;dragId=null;
        removeTBBlocksForDate(ds,{taskId:t.id,oldDs:prevDs});
        renderAll();
        pushUndo(()=>{
          t.due_date=prev.due_date;
          localOverrides[sid]={due_date:prev.due_date};pendingLocal.add(sid);
          savedTBs.forEach(b=>{if(!st.blocks.find(x=>x.id===b.id))st.blocks.push(b);sbSaveBlock(b);});
          save();renderAll();
          sbReqNullable('PATCH','tasks',{due_date:prev.due_date},`?id=eq.${sid}`)
            .then(()=>{delete localOverrides[sid];pendingLocal.delete(sid);});
        },'Moved task');
        await sbReqNullable('PATCH','tasks',{due_date:ds},`?id=eq.${sid}`);
        pendingLocal.delete(sid);
      }
    });

    // Exclude travel+birthday from per-col chips (shown as banners instead)
    const virtForDay=getRecurringWeekTasks(wkOff).filter(v=>v.due_date===ds&&!v.done);
    const virtForDayDone=getRecurringWeekTasks(wkOff).filter(v=>v.due_date===ds&&v.done);
    const wkKey2=getWkKey(wkOff);
    // Add weekly reset tasks that have been pinned to this date via _dateOverrides
    const wrecForDay=st.recurring.filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&!(r._doneByWk&&r._doneByWk[wkKey2])&&r._dateOverrides&&r._dateOverrides[wkKey2]===ds).map(r=>({id:'rec-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:false,_recId:r.id,_virtual:true,_wkKey:wkKey2,_isWrec:true}));
    const wrecForDayDone=st.recurring.filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&!!(r._doneByWk&&r._doneByWk[wkKey2])&&r._dateOverrides&&r._dateOverrides[wkKey2]===ds).map(r=>({id:'rec-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:true,_recId:r.id,_virtual:true,_wkKey:wkKey2,_isWrec:true}));
    const wrRulesForDay=st.wrRules.filter(r=>r._dateOverrides&&r._dateOverrides[wkKey2]===ds&&!isDoneWRRule(r.id,wkKey2)&&!(st.wrOverrides||[]).some(o=>String(o.rule_id)===String(r.id)&&o.wk_key===wkKey2&&o.override_type==='skip')).map(r=>({id:'wrrule-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:false,_ruleId:r.id,_virtual:true,_wkKey:wkKey2,_isWrRule:true}));
    const wrRulesForDayDone=st.wrRules.filter(r=>r._dateOverrides&&r._dateOverrides[wkKey2]===ds&&isDoneWRRule(r.id,wkKey2)&&!(st.wrOverrides||[]).some(o=>String(o.rule_id)===String(r.id)&&o.wk_key===wkKey2&&o.override_type==='skip')).map(r=>({id:'wrrule-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:true,_ruleId:r.id,_virtual:true,_wkKey:wkKey2,_isWrRule:true}));
    // Add shopping items assigned to this date
    const shopForDay=st.shopping.filter(s=>s.due_date===ds&&!s.done).map(s=>({id:'shop-cal-'+s.id,name:s.name,category:'Shopping',due_date:ds,done:false,_shopId:s.id,_virtual:true,_type:'shop'}));
    const shopForDayDone=st.shopping.filter(s=>s.due_date===ds&&s.done).map(s=>({id:'shop-cal-done-'+s.id,name:s.name,category:'Shopping',due_date:ds,done:true,_shopId:s.id,_virtual:true,_type:'shop'}));
    const _mkPupSessItem=(s,done)=>{const skill=(st.pup_skills||[]).find(x=>String(x.id)===String(s.skill_id));if(!skill)return null;return{id:'pup-sess-'+(done?'done-':'')+s.id,name:skill.skill,category:'Recurring',due_date:ds,done,_pupSessId:s.id,_skillId:s.skill_id,_pup:skill.pup,_virtual:true,_type:'pup'};};
    const pupSessForDay=(st.pupSessions||[]).filter(s=>s.day_date===ds&&!s.done).map(s=>_mkPupSessItem(s,false)).filter(Boolean);
    const pupSessForDayDone=(st.pupSessions||[]).filter(s=>s.day_date===ds&&s.done).map(s=>_mkPupSessItem(s,true)).filter(Boolean);
    const undoneDay=sortTasksForDay([
      ...st.tasks.filter(t=>t.due_date&&t.due_date.split('T')[0]===ds&&!t.done&&t.category!=='Weekly Goals'),
      ...virtForDay,
      ...wrecForDay,
      ...wrRulesForDay,
      ...shopForDay,
      ...pupSessForDay
    ],ds);
    const doneDay=[
      ...st.tasks.filter(t=>t.due_date&&t.due_date.split('T')[0]===ds&&t.done&&t.category!=='Weekly Goals'),
      ...virtForDayDone,
      ...wrecForDayDone,
      ...wrRulesForDayDone,
      ...shopForDayDone,
      ...pupSessForDayDone
    ];
    let dayTasks=[...undoneDay,...doneDay];
    dayTasks.forEach(t=>{
      const ov=isOv(t.due_date)&&!t.done,imp=t.important&&!ov&&!t.done;
      const _chipCat=(t._isWrec||t._isWrRule)?'weekly_reset':(t._virtual&&t._recId?'recurring':t.category);
      const s=ov?OV:imp?IMP:gc(_chipCat);
      const chip=document.createElement('div');chip.className='chip'+(t.done?' done-chip':'');
      chip.style.cssText=`background:${s.bg};color:${s.t};border-color:${s.b}`;
      if(!t._virtual)chip.dataset.tid=String(t.id);
      else if(t._type==='shop')chip.dataset.tid='shop-cal-'+t._shopId;
      else if(t._isWrRule)chip.dataset.tid='wrrule-virt-'+t._ruleId;
      else if(t._isWrec)chip.dataset.tid='wrec-'+t._recId;
      else if(t._recId)chip.dataset.tid='rec-virt-'+t._recId;
      chip.draggable=true;
      chip.addEventListener('dragstart',e2=>{
        if(t._type==='pup'){dragId='pupsess::'+t._pupSessId+'::'+ds;}
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
        if(t._type==='pup'){togPupSessionDone(t._pupSessId,chk.checked);}
        else if(t._type==='shop'){togShop(t._shopId,chk.checked);}
        else if(t._isWrRule){togWrRule(String(t._ruleId),chk.checked,t._wkKey||getWkKey(wkOff));}
        else if(t._isWrec){togRec(t._recId,chk.checked);}
        else if(t._virtual){togRecVirt(t._recId,chk.checked,t._wkKey||getWkKey(wkOff));}
        else{toggleTask(t.id,chk.checked,'week');}
      });
      const nm=document.createElement('span');nm.className='chip-name';nm.innerHTML=tmIcon(t)+escHtml(t.name);
      // name click handled by chip click→selTask, dblclick→openEditTask
      chip.appendChild(chk);chip.appendChild(nm);
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
      chip.addEventListener('dblclick',e=>{e.stopPropagation();if(t._type==='pup'){openPupEditModal(t._skillId);}else if(t._type==='shop')tiDblShop(e,t._shopId);else if(!t._virtual)tiDbl(e,t.id);else tiDblRec(e,t._recId);});
      const dx=document.createElement('button');dx.className='chip-del';dx.textContent='✕';
      dx.title=(t._type==='shop'||t._isWrec||t._isWrRule)?'Remove from calendar':t._virtual?'Delete recurring task':'Delete task';
      dx.addEventListener('click',e2=>{
        e2.stopPropagation();
        if(t._type==='pup'){removePupSession(t._pupSessId);return;}
        if(t._type==='shop'){
          const s=st.shopping.find(x=>String(x.id)===String(t._shopId));
          if(s){const prev=s.due_date;s.due_date=null;save();renderAll();renderWkCal();
            sbReqNullable('PATCH','shopping_list',{due_date:null},`?id=eq.${s.id}`);
            pushUndo(()=>{s.due_date=prev;save();renderAll();renderWkCal();sbReqNullable('PATCH','shopping_list',{due_date:prev||null},`?id=eq.${s.id}`);},'Removed from calendar');}
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
        } else if(t._virtual){
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
  [...goalsUndone,...goalsDone].forEach(t=>{
    const imp=t.important&&!t.done;
    const s=imp?IMP:{bg:'rgba(255,255,255,.82)',t:'rgba(80,80,95,.75)',b:'rgba(255,255,255,.9)'};
    const chip=document.createElement('div');chip.className='chip'+(t.done?' done-chip':'');
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
  cols.appendChild(goalsCol);
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
document.addEventListener('mouseup',()=>{
  if(!calDrag.active)return;
  const s=calDrag.startDs,e=calDrag.endDs,moved=calDrag.moved;
  clearCalDrag();
  if(moved&&s){
    const start=s<=e?s:e,end=s<=e?e:s;
    openTravelModal(null,start,end);
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
        const wkKey=getWkKey(targetWkOff);
        const prev=rec._dateOverrides[wkKey];
        rec._dateOverrides[wkKey]=newDs;
        dragId=null;shiftWk(dir);save();renderAll();
        sbReq('PATCH','wr_recurring_rules',{date_overrides:rec._dateOverrides},recQs(rec.id));
        pushUndo(()=>{if(prev)rec._dateOverrides[wkKey]=prev;else delete rec._dateOverrides[wkKey];save();renderAll();sbReq('PATCH','wr_recurring_rules',{date_overrides:rec._dateOverrides},recQs(rec.id));},'Moved to other week');
      }
      dragId=null;return;
    }
    if(dragId.startsWith('rec::')){
      const recId=dragId.split('::')[1];
      const rec=st.recurring.find(x=>String(x.id)===String(recId));
      if(rec){
        if(!rec._dateOverrides)rec._dateOverrides={};
        const wkKey=getWkKey(targetWkOff);
        const prev=rec._dateOverrides[wkKey];
        rec._dateOverrides[wkKey]=newDs;
        dragId=null;shiftWk(dir);save();renderAll();
        sbReq('PATCH','wr_recurring_rules',{date_overrides:rec._dateOverrides},recQs(rec.id));
        pushUndo(()=>{if(prev)rec._dateOverrides[wkKey]=prev;else delete rec._dateOverrides[wkKey];save();renderAll();sbReq('PATCH','wr_recurring_rules',{date_overrides:rec._dateOverrides},recQs(rec.id));},'Moved to other week');
      }
      dragId=null;return;
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
    if(dragId.startsWith('wkgoal::')){
      const tid=dragId.split('::')[1];
      const gt=st.tasks.find(x=>String(x.id)===tid);dragId=null;
      if(gt){const prevDs=gt.due_date;const d=new Date((gt.due_date||d2s(new Date()))+'T12:00');d.setDate(d.getDate()+dir*7);const nDs=d2s(d);gt.due_date=nDs;shiftWk(dir);save();renderAll();pushUndo(()=>{gt.due_date=prevDs;save();renderAll();sbReqNullable('PATCH','tasks',{due_date:prevDs},`?id=eq.${tid}`);},'Moved goal week');await sbReqNullable('PATCH','tasks',{due_date:nDs},`?id=eq.${tid}`);}
      return;
    }
    const t=st.tasks.find(x=>String(x.id)===String(dragId));if(!t){dragId=null;return;}
    const prev={due_date:t.due_date};
    t.due_date=newDs;dragId=null;
    shiftWk(dir);renderAll();
    pushUndo(()=>{t.due_date=prev.due_date;renderAll();sbReq('PATCH','tasks',{due_date:prev.due_date},`?id=eq.${t.id}`);},'Moved to other week');
    await sbReq('PATCH','tasks',{due_date:newDs},`?id=eq.${t.id}`);
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
        const wkKey=getWkKey(targetWkOff);
        const prev=r._dateOverrides[wkKey];
        r._dateOverrides[wkKey]=newDs;
        dragId=null;shiftWk(dir);save();renderAll();
        sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
        pushUndo(()=>{if(prev)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];save();renderAll();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));},'Moved to other week');
      }
      dragId=null;return;
    }
    // Handle rec:: (non-weekly recurring virtual)
    if(dragId.startsWith('rec::')){
      const recId=dragId.split('::')[1];
      const r=st.recurring.find(x=>String(x.id)===String(recId));
      if(r){
        if(!r._dateOverrides)r._dateOverrides={};
        const wkKey=getWkKey(targetWkOff);
        const prev=r._dateOverrides[wkKey];
        r._dateOverrides[wkKey]=newDs;
        dragId=null;shiftWk(dir);save();renderAll();
        sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
        pushUndo(()=>{if(prev)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];save();renderAll();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));},'Moved to other week');
      }
      dragId=null;return;
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
    if(dragId.startsWith('wkgoal::')){
      const tid=dragId.split('::')[1];
      const gt=st.tasks.find(x=>String(x.id)===tid);dragId=null;
      if(gt){const prevDs=gt.due_date;const d=new Date((gt.due_date||d2s(new Date()))+'T12:00');d.setDate(d.getDate()+dir*7);const nDs=d2s(d);gt.due_date=nDs;shiftWk(dir);save();renderAll();pushUndo(()=>{gt.due_date=prevDs;save();renderAll();sbReqNullable('PATCH','tasks',{due_date:prevDs},`?id=eq.${tid}`);},'Moved goal week');await sbReqNullable('PATCH','tasks',{due_date:nDs},`?id=eq.${tid}`);}
      return;
    }
    const t=st.tasks.find(x=>String(x.id)===String(dragId));if(!t){dragId=null;return;}
    const prev={due_date:t.due_date};
    t.due_date=newDs;dragId=null;
    shiftWk(dir);renderAll();
    pushUndo(()=>{t.due_date=prev.due_date;renderAll();sbReq('PATCH','tasks',{due_date:prev.due_date},`?id=eq.${t.id}`);},'Moved to other week');
    await sbReq('PATCH','tasks',{due_date:newDs},`?id=eq.${t.id}`);
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
    goals.forEach(t=>{ body.appendChild(_woMakeChip(t,body)); });
    body.addEventListener('dblclick',e=>{if(e.target===body)openQA('wkc',null,wkStart,'Weekly Goals');});
    col.appendChild(body);
    cols.appendChild(col);
  }
}
function _woMakeChip(t,body){
  const imp=t.important&&!t.done;
  const s=imp?IMP:{bg:'rgba(255,255,255,.82)',t:'rgba(80,80,95,.75)',b:'rgba(255,255,255,.9)'};
  const chip=document.createElement('div');
  chip.className='chip wo-chip'+(t.done?' done-chip':'');chip.dataset.tid=String(t.id);
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
    const phStyle='height:20px;margin:2px 0;border-radius:5px;background:rgba(255,255,255,.25);border:1.5px dashed rgba(255,255,255,.7)';
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
function onWkcWheel(e){
  if(Math.abs(e.deltaX)<8&&!e.shiftKey)return;
  e.preventDefault();
  wkcWD+=(e.shiftKey?e.deltaY:e.deltaX);
  if(wkcWT)clearTimeout(wkcWT);
  wkcWT=setTimeout(()=>{if(Math.abs(wkcWD)>40)shiftWk(wkcWD>0?1:-1);wkcWD=0;wkcWT=null;},100);
}

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
      else tiDblRec(e,item.recId);
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
    wrCell.style.cssText='background:rgba(239,246,255,.4);border:none';
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
    const _lnk=`<a href="#weekly" onclick="event.preventDefault();showPage('weekly')" class="btn btn-ghost btn-xs" style="text-decoration:none;align-self:center;background:rgba(255,255,255,.9);color:var(--text);border-color:rgba(210,205,228,.6)">`;
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
  // 4. Add rules moved INTO this week from another week
  const movedIn=st.wrOverrides
    .filter(o=>o.override_type==='move'&&o.moved_to_wk_key===wkKey)
    .map(o=>{const rule=st.wrRules.find(r=>String(r.id)===String(o.rule_id));return rule?{...rule,_movedIn:true}:null;})
    .filter(Boolean)
    .filter(r=>!filtered.some(x=>String(x.id)===String(r.id)));
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
    return recOvOrder(a)-recOvOrder(b);
  });
  function makePawEl(ruleId,isDone){
    const col=isDone?'#a3c41a':'rgba(255,255,255,.8)';
    const str=isDone?'#a3c41a':'rgba(180,170,210,.5)';
    const wrap=document.createElement('label');
    wrap.className='chk-wrap';
    wrap.style.cssText='cursor:pointer;flex-shrink:0';
    wrap.title='Toggle';
    wrap.innerHTML=`<svg viewBox="0 0 100 100" width="10" height="10" xmlns="http://www.w3.org/2000/svg" style="display:block"><ellipse cx="22" cy="18" rx="10" ry="12" fill="${col}" stroke="${str}" stroke-width="8"/><ellipse cx="46" cy="11" rx="10" ry="12" fill="${col}" stroke="${str}" stroke-width="8"/><ellipse cx="70" cy="14" rx="10" ry="12" fill="${col}" stroke="${str}" stroke-width="8"/><ellipse cx="85" cy="36" rx="9" ry="11" fill="${col}" stroke="${str}" stroke-width="8"/><path d="M18 58 Q14 42 28 36 Q46 28 68 34 Q82 40 82 56 Q80 76 50 82 Q20 76 18 58Z" fill="${col}" stroke="${str}" stroke-width="8"/></svg>`;
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
      const chk=document.createElement('input');chk.type='checkbox';chk.className='chk';chk.checked=isDone;chk.style.cssText='width:11px;height:11px';
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
  requestAnimationFrame(()=>{applySelHighlight();const fi=elReg&&elReg.querySelector('.ti');if(fi)elReg.style.maxHeight=(4+7*fi.offsetHeight)+'px';});
  if(document.getElementById('recMoModal')?.classList.contains('open'))renderRecMoCal();
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
  const m=document.getElementById('wrRuleCtxMenu');
  const x=Math.min(e.clientX,window.innerWidth-185),y=Math.min(e.clientY,window.innerHeight-210);
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
    if(r.is_weekly_reset===true||r.is_weekly_reset==='true')unscheduleWRec(_wrCtxRecId,_wrCtxWkKey);
    else skipRecVirtThisWk(_wrCtxRecId,_wrCtxWkKey);
    return;
  }
  if(!_wrCtxRuleId)return;
  writeWrOverride(_wrCtxRuleId,_wrCtxWkKey,{override_type:'skip'},{undoLabel:'Skipped WR task this week'});
}
function _wrShiftAnchor(delta){
  hideWrRuleCtx();
  if(_wrCtxRecId){
    const r=st.recurring.find(x=>String(x.id)===_wrCtxRecId);if(!r||!_wrCtxWkKey)return;
    if(!r._dateOverrides)r._dateOverrides={};
    const dir=delta>0?1:-1;
    const targetWkKey=getWkKey(wkOff+dir);
    const prevCurrent=r._dateOverrides[_wrCtxWkKey];
    const prevTarget=r._dateOverrides[targetWkKey];
    const _natDow=dayNameToIdx(r.appears_on_date);
    const _natDate=_natDow>=0?getDateForDow(_natDow,wkOff):null;
    const base=prevCurrent&&prevCurrent!=='__skip__'?new Date(prevCurrent+'T12:00'):_natDate?new Date(d2s(_natDate)+'T12:00'):new Date();
    base.setDate(base.getDate()+delta);
    const next=d2s(base);
    r._dateOverrides[_wrCtxWkKey]='__skip__';
    r._dateOverrides[targetWkKey]=next;
    save();renderWeeklyPage();renderWkCal();renderToday();
    sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(_wrCtxRecId));
    pushUndo(()=>{
      if(prevCurrent!==undefined)r._dateOverrides[_wrCtxWkKey]=prevCurrent;else delete r._dateOverrides[_wrCtxWkKey];
      if(prevTarget!==undefined)r._dateOverrides[targetWkKey]=prevTarget;else delete r._dateOverrides[targetWkKey];
      save();renderWeeklyPage();renderWkCal();renderToday();
      sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(_wrCtxRecId));
    },'Moved recurring task');
    return;
  }
  if(!_wrCtxRuleId)return;
  const rule=st.wrRules.find(r=>String(r.id)===_wrCtxRuleId);if(!rule)return;
  const prev=rule.starting_date;
  const base=rule.starting_date?new Date(rule.starting_date+'T12:00'):new Date();
  base.setDate(base.getDate()+delta);
  const next=d2s(base);
  rule.starting_date=next;
  sbReqSilent('PATCH','wr_recurring_rules',{starting_date:next},`?id=eq.${_wrCtxRuleId}`);
  save();renderRecOv();renderWeeklyPage();
  pushUndo(()=>{rule.starting_date=prev;sbReqSilent('PATCH','wr_recurring_rules',{starting_date:prev},`?id=eq.${_wrCtxRuleId}`);save();renderRecOv();renderWeeklyPage();},'Moved WR start');
}
function wrCtxMovePrevWeek(){_wrShiftAnchor(-7);}
function wrCtxMoveNextWeek(){_wrShiftAnchor(7);}
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
    const localId='rec-tmp-'+Date.now();
    const r={id:localId,name,is_weekly_reset:false,appears_on_date:appearsOn,starting_date:cadenceFields.starting_date,cadence,notes,_doneByWk:{},_done:false,_dateOverrides:{}};
    st.recurring.push(r);save();renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();
    let recServerId=null;
    pushUndo(()=>{const rid=recServerId||localId;st.recurring=st.recurring.filter(x=>String(x.id)!==String(rid));save();renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();if(recServerId)sbReq('DELETE','wr_recurring_rules',null,recQs(recServerId));},'Added recurring task');
    const payload={name,is_weekly_reset:false,appears_on_date:appearsOn,cadence};
    if(cadenceFields.starting_date)payload.starting_date=cadenceFields.starting_date;
    if(notes)payload.notes=notes;
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
  if(!badge)return;
  if(ts.length>0){badge.textContent=ts.length;badge.style.display='flex';}
  else{badge.style.display='none';closeUnMenu();}
  const menu=document.getElementById('unMenu');
  if(menu&&menu.style.display==='block'){
    menu.innerHTML=ts.length?ts.map(t=>tRow(t,{cat:true,drag:true,noColor:true})).join('')
      :`<div style="padding:12px;font-size:10px;color:var(--subtle);text-align:center">All assigned ✓</div>`;
  }
}
function toggleUnMenu(){
  const menu=document.getElementById('unMenu');
  const back=document.getElementById('unMenuBack');
  const badge=document.getElementById('unAssignedBadge');
  if(!menu||!badge)return;
  if(menu.style.display==='block'){closeUnMenu();return;}
  const ts=sortTasks(st.tasks.filter(t=>!t.due_date&&!t.done&&t.category!=='Long term'&&t.category!=='Weekly Goals'));
  menu.innerHTML=ts.length?ts.map(t=>tRow(t,{cat:true,drag:true,noColor:true})).join('')
    :`<div style="padding:12px;font-size:10px;color:var(--subtle);text-align:center">All assigned ✓</div>`;
  const r=badge.getBoundingClientRect();
  menu.style.left=Math.max(8,r.right-300)+'px';
  menu.style.top='auto';
  menu.style.bottom=(window.innerHeight-r.top+6)+'px';
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
    const r=st.wrRules.find(x=>String(x.id)===String(ruleId));
    if(r){
      if(!r._dateOverrides)r._dateOverrides={};
      const wkKey=getWkKey(wkOff);
      const prev=r._dateOverrides[wkKey];
      r._dateOverrides[wkKey]=ds;
      dragId=null;save();renderAll();
      sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${ruleId}`);
      pushUndo(()=>{if(prev)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];save();renderAll();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${ruleId}`);},'Assigned WR task to today');
    }
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
    const s=st.shopping.find(x=>String(x.id)===String(shopId));
    if(s){
      const prev=s.due_date;const prevOrder=s.shop_order;
      const newOrder=_shopTopOrder(s);s.shop_order=newOrder;s.due_date=ds;
      dragId=null;save();renderAll();
      sbReq('PATCH','shopping_list',{due_date:ds,shop_order:newOrder},`?id=eq.${s.id}`);
      pushUndo(()=>{s.due_date=prev;s.shop_order=prevOrder;save();renderAll();sbReq('PATCH','shopping_list',{due_date:prev||null,shop_order:prevOrder??null},`?id=eq.${s.id}`);},'Assigned shopping to today');
    }
    dragId=null;return;
  }
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
      `<label class="chk-wrap"><input type="checkbox" class="chk" style="width:11px;height:11px"${s.done?' checked':''}></label>`+
      `<span class="tn">${escHtml(s.name)}</span>`+
      `<span class="cpill" style="background:none;color:#94a3b8;border:none;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;padding:0;flex-shrink:0">${escHtml(s.store||'')}</span>`+
      `<button class="delbtn">✕</button>`;
    el.addEventListener('click',e=>tiClickShop(e,s.id));
    el.addEventListener('dblclick',e=>tiDblShop(e,s.id));
    el.addEventListener('contextmenu',e=>showCtxShop(e,s.id));
    el.querySelector('.chk-wrap').addEventListener('click',e=>e.stopPropagation());
    el.querySelector('.chk').addEventListener('change',e=>togShop(s.id,e.target.checked));
    el.querySelector('.delbtn').addEventListener('click',e=>{e.stopPropagation();delShop(s.id);});
    container.appendChild(el);
  });
}

// ── Virtual recurring task row for This Week ─────────────────────────────────
function tRowWk(t){
  if(t._virtual){
    const s=gc((t._isWrec||t._isWrRule)?'weekly_reset':'recurring');
    const _wkCtxMenu=t._isWrRule?`showWrRuleCtx(event,'${t._ruleId}','${t._wkKey||getWkKey(wkOff)}')`:`showWrRuleCtx(event,'${t._recId}','${t._wkKey||getWkKey(wkOff)}')`;
    const _wkXBtn=t._isWrRule?`showWrScopePicker(event,'⊘  Skip this week only','✕  Delete rule (all future)',()=>writeWrOverride('${t._ruleId}','${t._wkKey||getWkKey(wkOff)}',{override_type:'skip'},{undoLabel:'Skipped WR task this week'}),()=>wrCtxDeleteRule('${t._ruleId}'),'⊠  Remove from views',()=>unscheduleWrRule('${t._ruleId}','${t._wkKey||getWkKey(wkOff)}'))`
      :t._isWrec?`showWrScopePicker(event,'⊘  Skip this week only','✕  Delete recurring task',()=>skipWRec('${t._recId}','${t._wkKey||getWkKey(wkOff)}'),()=>delRec('${t._recId}'),'⊠  Remove from views',()=>unscheduleWRec('${t._recId}','${t._wkKey||getWkKey(wkOff)}'))`
      :`showWrScopePicker(event,'⊘  Skip this week only','✕  Delete recurring task',()=>skipRecVirtThisWk('${t._recId}','${t._wkKey||getWkKey(wkOff)}'),()=>delRec('${t._recId}'))`;
    return`<div class="ti ${t.done?'done':''}" style="background:${s.bg}" id="ti-${t.id}" onclick="selTask(event,'${t.id}')" ondblclick="tiDblRec(event,'${t._recId}')" oncontextmenu="${_wkCtxMenu}">
      <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="${t._isWrec?`togRec('${t._recId}',this.checked)`:`togRecVirt('${t._recId}',this.checked,'${t._wkKey||getWkKey(wkOff)}')`}"></label>
      <span class="tn">${t.name}</span>
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
  const sub=isTv&&t.end_date?` – ${fmtD(t.end_date)}`:'';
  const modeIcon=isTv?(t.travel_mode==='plane'?_PLANE_SVG:t.travel_mode==='drive'?_CAR_SVG:''):'';
  return`<div class="ti ti-${sl}" style="background:${s.bg}" id="ti-${t.id}" onclick="selTask(event,'${t.id}')">
    <span class="tn" style="color:${s.t};font-weight:600">${modeIcon}${t.name}</span>
    ${isTv?'':`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${s.bg}" stroke="${s.d}" stroke-opacity="0.4" stroke-width="1"/></svg>`}
    <span class="dlbl">${fmtD(t.due_date)}${sub}</span>
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
  const s=ov?OV:imp?IMP:gc(t.category);
  const sl=ov?'ov':imp?'imp':slug(t.category);
  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''} ${imp&&!ov?'imp-row':''}" style="${!ov&&!imp&&!o.noColor?`background:${s.bg}`:''}" id="ti-${t.id}" ${o.drag?`draggable="true" ondragstart="dStart(event,'${t.id}')" ondragend="dEnd(event)"`:''} onclick="selTask(event,'${t.id}')" ondblclick="tiDbl(event,'${t.id}')" oncontextmenu="showCtx(event,'${t.id}')">
    <label class="chk-wrap" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="toggleTask('${t.id}',this.checked,'${o.drag?'wk':''}')"></label>
    <span class="tn">${tmIcon(t)}${t.name}</span>
    ${o.cat?(o.catDot?`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${s.bg}" stroke="${s.d}" stroke-opacity="0.4" stroke-width="1"/></svg>`:`<span class="cpill" style="background:${s.bg};color:${s.t};border-color:${s.b}">${t.category||'?'}</span>`):''}
    ${o.flag?'<span class="flag-u">📅</span>':''}
    ${!o.flag&&(!o.noDate||ov)&&t.due_date?`<span class="dlbl ${ov?'ov':''}" style="cursor:pointer" onclick="openInlineDatePicker(event,'${t.id}','${t.due_date}')">${fmtD(t.due_date)} <span class="date-clr" title="Clear date" onclick="event.stopPropagation();clearTaskDate('${t.id}',event)">×</span></span>`:''}
    ${o.tbArrow?'<span class="tb-arrow">›</span>':''}
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
      // Stacked column: Social on top, Travel below
      const wrapper=document.createElement('div');wrapper.className='kol';const soc=gc('Social');wrapper.style.cssText=`flex:1;min-width:200px;max-width:300px`;
      ['Social','Travel'].forEach((subCat,si)=>{
        const isTv=subCat==='Travel';
        const s=gc(subCat);
        const tasks=isTv
          ?[...st.travel].sort((a,b)=>(a.start_date||'').localeCompare(b.start_date||'')).map(tv=>({
              id:'tv-'+tv.id,name:(tv.destination?`${tv.name} → ${tv.destination}`:tv.name),
              category:'Travel',due_date:tv.start_date,end_date:tv.end_date,
              done:false,_srcId:tv.id,_type:'travel'
            }))
          :sortTasks(st.tasks.filter(t=>t.category===subCat&&!t.done));
        const sub=document.createElement('div');sub.style.cssText=`flex:1;display:flex;flex-direction:column;overflow:hidden;background:color-mix(in srgb,${s.bg} 35%,rgba(255,255,255,.92))${isTv?';border-top:1px solid rgba(210,205,228,.18)':''}`;
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
    col.style.cssText=`background:color-mix(in srgb,${s.bg} 35%,rgba(255,255,255,.92));border:1px solid ${s.b};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)`;
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
  HOURS.forEach(h=>{const l=document.createElement('div');l.className='tb-tlbl';l.textContent=h===12?'12p':h>12?`${h-12}p`:`${h}a`;if(_isWkday&&(h===8||h===16)){l.style.color='rgba(45,40,85,.95)';l.style.fontWeight='800';}gut.appendChild(l);});
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
      st.blocks.push(blk);save();
      // DB save happens after inline edit commits (in startTBInlineEdit)
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
  // Compute layout then draw (auto blocks participate in overlap calc)
  const autoBlocks=getAutoTBForDate(ds);
  computeTBLayout(ds,autoBlocks);
  getVisibleBlocks(ds).forEach(b=>drawTBBlock(col,b));
  autoBlocks.forEach(a=>drawAutoTBBlock(col,a,ds));
  const autoBtn=document.getElementById('autoTBToggle');if(autoBtn)autoBtn.style.opacity=cfg.showAutoTB?'1':'0.4';
  if(isDateToday(date)){const nl=document.createElement('div');nl.className='nowline';nl.id='tbNowLine';const nm=new Date(),nmins=(nm.getHours()-HOURS[0])*60+nm.getMinutes();if(nmins>=0){nl.style.top=nmins*PX+'px';nl.innerHTML='<div class="nowdot"></div>';}col.appendChild(nl);}
  grid.appendChild(col);renderTBSum(ds);requestAnimationFrame(applySelHighlight);
  // Default scroll to current time minus 1 hour; reset when day changes but preserve position mid-session
  const tbSc2=document.getElementById('tbScroll');
  if(tbSc2&&tbSc2._scrollDay!==ds){tbSc2._scrollDay=ds;tbSc2.scrollTop=Math.round((6.5-HOURS[0])*60*PX);}
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
  const sorted=[...blocks].sort((a,b)=>a.sm-b.sm);
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
function drawTBBlock(col,b){
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
  const isImp=linkedTask&&linkedTask.important&&!linkedTask.done;
  const linkedRule=b.ruleId?st.wrRules.find(x=>String(x.id)===String(b.ruleId)):null;
  const recCat=linkedRec?(linkedRec.is_weekly_reset===false?'recurring':'weekly_reset'):null;
  const effectiveCat=linkedTask?linkedTask.category:recCat||(linkedRule?'weekly_reset':null)||(b.cat||'Home');
  const s=isImp?IMP:gc(effectiveCat);
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
  const _notes=(_linkedTask&&_linkedTask.notes)||(_linkedRec&&_linkedRec.notes)||'';
  const _notesHtml=_notes?`<div class="tb-notes">${_notes.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</div>`:'';
  const _displayTitle=(_linkedTask&&_linkedTask.name)||(_linkedRec&&_linkedRec.name)||(linkedShop&&linkedShop.name)||b.title;
  el.innerHTML=`<div class="tb-row"><input type="checkbox" class="tb-chk" ${b._done?'checked':''}><span class="tb-bt${b.dur>=30?' wrap':''}">${_displayTitle}</span><div class="tb-right">${_showTime?`<span class="tb-btime">${tStr(b.sm)}-${tStr(b.sm+b.dur)}</span>`:''}<button class="tb-bdel" onclick="delBlock('${b.id}',event)">✕</button></div></div>${_notesHtml}<div class="tb-resize" data-id="${b.id}"></div>`;
  const tbChk=el.querySelector('.tb-chk');
  if(tbChk)tbChk.addEventListener('change',function(e){
    e.stopPropagation();
    const checked=this.checked;
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
    } else {
      const mT=st.tasks.find(x=>x.name===b.title);
      const mR=st.recurring.find(x=>x.name===b.title);
      const mS=st.shopping.find(x=>x.name===b.title);
      if(mT)toggleTask(mT.id,checked,'tb');
      else if(mR)togRec(String(mR.id),checked);
      else if(mS)togShop(String(mS.id),checked);
      else save();
    }
  });
  const tbRes=el.querySelector('.tb-resize');
  if(tbRes)tbRes.addEventListener('mousedown',e=>{
    e.stopPropagation();e.preventDefault();
    resizing={id:b.id,sy:e.clientY,sd:b.dur};
    document.addEventListener('mousemove',onRM);document.addEventListener('mouseup',onRU);
  });
  let tbDragging=false,tbOnMove=null,tbOnUp=null;
  function _tbSelId(){const _r2=b.recId?st.recurring.find(x=>String(x.id)===String(b.recId)):null;const _isWr2=_r2&&(_r2.is_weekly_reset===true||_r2.is_weekly_reset==='true');return b.taskId?String(b.taskId):b.recId?(_isWr2?'wrec-':'rec-virt-')+b.recId:(b.shopId||b.ruleId)?'blk-'+b.id:null;}
  function _tbBlockSelId(bl){const r3=bl.recId?st.recurring.find(x=>String(x.id)===String(bl.recId)):null;const iw=r3&&(r3.is_weekly_reset===true||r3.is_weekly_reset==='true');return bl.taskId?String(bl.taskId):bl.recId?(iw?'wrec-':'rec-virt-')+bl.recId:(bl.shopId||bl.ruleId)?'blk-'+bl.id:null;}
  el.addEventListener('click',e=>{
    if(e.target.classList.contains('tb-resize')||e.target.classList.contains('tb-bdel')||e.target.classList.contains('tb-chk'))return;
    if(tbDragging)return;
    e.stopPropagation();
    const tbSelId=_tbSelId();if(!tbSelId)return;
    if(e.metaKey||e.ctrlKey){if(selectedTasks.has(tbSelId))selectedTasks.delete(tbSelId);else selectedTasks.add(tbSelId);lastSelectedId=tbSelId;}
    else if(e.shiftKey&&lastSelectedId){const col2=el.closest('.tb-col')||document.getElementById('tbScroll');const ids=col2?[...col2.querySelectorAll('.tb-block[data-bid]')].map(be=>{const bl=st.blocks.find(x=>String(x.id)===String(be.dataset.bid));return bl?_tbBlockSelId(bl):null;}).filter(Boolean):[];const ai=ids.indexOf(lastSelectedId),bi2=ids.indexOf(tbSelId);if(ai>-1&&bi2>-1){const lo=Math.min(ai,bi2),hi=Math.max(ai,bi2);ids.slice(lo,hi+1).forEach(x=>selectedTasks.add(x));}else selectedTasks.add(tbSelId);lastSelectedId=tbSelId;}
    else{selectedTasks.clear();selectedTasks.add(tbSelId);lastSelectedId=tbSelId;}
    applySelHighlight();
  });
  el.addEventListener('dblclick',e=>{
    if(e.target.classList.contains('tb-resize')||e.target.classList.contains('tb-bdel')||e.target.classList.contains('tb-chk'))return;
    e.stopPropagation();
    clearSelection();
    if(b.taskId){openEditTask(b.taskId);}
    else if(b.recId){openRecEditModal(String(b.recId));}
    else{startTBInlineEdit(b.id,el.closest('.tb-col'));}
  });
  el.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('tb-resize')||e.target.classList.contains('tb-bdel')||e.target.classList.contains('tb-chk'))return;
    if(e.detail>=2)return;
    e.stopPropagation();
    const startY=e.clientY,startSm=b.sm;
    tbDragging=false;
    tbOnMove=ev=>{
      const dy=ev.clientY-startY;
      if(!tbDragging&&Math.abs(dy)<5)return;
      tbDragging=true;
      const dm=Math.round(dy/PX/15)*15;
      const newSm=Math.max(HOURS[0]*60,Math.min(HOURS[HOURS.length-1]*60,startSm+dm));
      b.sm=newSm;el.style.top=(b.sm-HOURS[0]*60)*PX+'px';
      const bt=el.querySelector('.tb-btime');if(bt)bt.textContent=tStr(b.sm)+'-'+tStr(b.sm+b.dur);
      el.classList.add('dragging-block');
    };
    tbOnUp=()=>{
      document.removeEventListener('mousemove',tbOnMove);
      document.removeEventListener('mouseup',tbOnUp);
      el.classList.remove('dragging-block');
      if(tbDragging){const newSm=b.sm;pushUndo(()=>{b.sm=startSm;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbUpdateBlock(b.id,{start_minutes:startSm});},'Moved block');save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbUpdateBlock(b.id,{start_minutes:newSm});}
      tbDragging=false;
    };
    document.addEventListener('mousemove',tbOnMove);
    document.addEventListener('mouseup',tbOnUp);
  });
  col.appendChild(el);
}
function renderTBSum(ds){
  const c={};st.blocks.filter(b=>b.ds===ds).forEach(b=>c[b.cat]=(c[b.cat]||0)+b.dur);
  const tot=Object.values(c).reduce((a,v)=>a+v,0);
  document.getElementById('tbSum').innerHTML=`<div class="si"><span>Blocked:</span><span class="sv">${Math.floor(tot/60)}h ${tot%60}m</span></div>`+Object.entries(c).map(([cat,min])=>{const s=gc(cat);return`<div class="si"><div class="sdotc" style="background:${s.d}"></div><span>${cat}</span><span class="sv">${Math.floor(min/60)}h${min%60?` ${min%60}m`:''}</span></div>`;}).join('');
}
// ── Auto Timeblocks ────────────────────────────────────────────────────────────
function getAutoTBForDate(ds){
  if(!cfg.showAutoTB)return[];
  const dow=new Date(ds+'T00:00:00').getDay(); // 0=Sun,6=Sat
  const isWeekday=dow>=1&&dow<=5;
  return st.autoTimeblocks.filter(a=>a.is_enabled).flatMap(a=>{
    if(!isWeekday)return[];
    const ov=st.autoTBOverrides.find(o=>String(o.base_id)===String(a.id)&&o.date===ds);
    if(ov&&(ov.start_time===null||ov.start_time===undefined))return[]; // deleted for this day
    const startTime=ov?ov.start_time:a.start_time;
    const endTime=ov?ov.end_time:a.end_time;
    const[sh,sm2]=((startTime||'00:00').split(':'));
    const[eh,em]=((endTime||'00:30').split(':'));
    const startMinutes=parseInt(sh)*60+parseInt(sm2||0);
    const endMinutes=parseInt(eh)*60+parseInt(em||0);
    const dur=Math.max(15,endMinutes-startMinutes);
    return[{_atbId:String(a.id),_ovId:ov?String(ov.id):null,label:a.label||'',sm:startMinutes,dur,ds}];
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
  el.className='atb-block';
  el.dataset.atbId=atb._atbId;
  el.addEventListener('dragover',e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();el.classList.add('tb-drop-over');});
  el.addEventListener('dragleave',()=>el.classList.remove('tb-drop-over'));
  el.addEventListener('drop',e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();el.classList.remove('tb-drop-over');dropOnTB(e,ds,null,null,atb.sm);});
  const ncols=atb._ncols||1,col_i=atb._col||0,colW=100/ncols,left=col_i*colW;
  const _showTime=ncols<=1;
  el.style.cssText=`top:${top}px;height:${ht}px;left:calc(${left}% + 2px);right:calc(${100-left-colW}% + 2px);width:auto`;
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
    atbOnMove=ev=>{
      const dy=ev.clientY-startY;
      if(!atbDragging&&Math.abs(dy)<5)return;
      atbDragging=true;
      const dm=Math.round(dy/PX/15)*15;
      const newSm=Math.max(HOURS[0]*60,Math.min(HOURS[HOURS.length-1]*60,startSm+dm));
      atb.sm=newSm;
      el.style.top=(atb.sm-HOURS[0]*60)*PX+'px';
      const bt=el.querySelector('.tb-btime');if(bt)bt.textContent=tStr(atb.sm)+'-'+tStr(atb.sm+atb.dur);
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
        if(atb._ovId){
          const ov=st.autoTBOverrides.find(o=>String(o.id)===atb._ovId);
          if(ov){ov.start_time=newStart;ov.end_time=newEnd;}
          sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:newStart,end_time:newEnd},`?id=eq.${atb._ovId}`);
          const ovId=atb._ovId;
          pushUndo(()=>{atb.sm=startSm;const ov2=st.autoTBOverrides.find(o=>String(o.id)===ovId);if(ov2){ov2.start_time=prevStart;ov2.end_time=prevEnd;}sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:prevStart,end_time:prevEnd},`?id=eq.${ovId}`);save();if(document.getElementById('tbGrid'))renderDayTB();},'Moved auto block');
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
          pushUndo(()=>{atb.sm=startSm;const _realOvId=atb._ovId;st.autoTBOverrides=st.autoTBOverrides.filter(o=>String(o.id)!==tmpId&&(!_realOvId||String(o.id)!==String(_realOvId)));if(_realOvId)sbReqSilent('DELETE','auto_timeblock_overrides',null,`?id=eq.${_realOvId}`);atb._ovId=null;save();if(document.getElementById('tbGrid'))renderDayTB();},'Moved auto block');
        }
        save();
      }
    };
    document.addEventListener('mousemove',atbOnMove);
    document.addEventListener('mouseup',atbOnUp);
  });
  col.appendChild(el);
}
function toggleAutoTB(){
  cfg.showAutoTB=!cfg.showAutoTB;save();
  const btn=document.getElementById('autoTBToggle');
  if(btn)btn.style.opacity=cfg.showAutoTB?'1':'0.4';
  if(document.getElementById('tbGrid'))renderDayTB();
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
  const autoDur=(name,category)=>{const n=(name||'').toLowerCase();if(/\bheb\b/.test(n)||/pilates/.test(n))return 60;if((category||'').toLowerCase()==='social'||/social/.test(n))return 120;return 30;};
  // helper: compute wkKey (Monday of the week) from a date string
  const wkKeyFromDs=d=>{const dt=new Date(d+'T00:00:00');const dow=(dt.getDay()+6)%7;const mon=new Date(dt);mon.setDate(dt.getDate()-dow);return d2s(mon);};
  if(dragId.startsWith('wrrule::')){
    const ruleId=dragId.split('::')[1];
    const r=st.wrRules.find(x=>String(x.id)===String(ruleId));
    if(!r){dragId=null;return;}
    const wkKey=wkKeyFromDs(ds);
    const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};
    if(!r._dateOverrides)r._dateOverrides={};
    r._dateOverrides[wkKey]=ds;
    const blk={id:crypto.randomUUID(),title:r.name,ds,sm,dur:autoDur(r.name,'Recurring'),cat:'Recurring',ruleId:String(r.id),recId:String(r.id)};
    st.blocks.push(blk);dragId=null;save();renderAll();renderRecOv();
    sbSaveBlock(blk);
    sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>b.id!==blk.id);
      r._dateOverrides=prevDateOv;
      sbDeleteBlock(blk.id);save();renderAll();renderRecOv();
      sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv},recQs(r.id));
    },'Added to time block');
    return;
  }
  if(dragId.startsWith('wrec::')){
    const recId=dragId.split('::')[1];
    const r=st.recurring.find(x=>String(x.id)===String(recId));
    if(!r){dragId=null;return;}
    const wkKey=wkKeyFromDs(ds);
    const prevDateOv=r._dateOverrides?{...r._dateOverrides}:{};
    if(!r._dateOverrides)r._dateOverrides={};
    r._dateOverrides[wkKey]=ds;
    const blk={id:crypto.randomUUID(),title:r.name,ds,sm,dur:autoDur(r.name,'Recurring'),cat:'Recurring',recId:String(r.id)};
    st.blocks.push(blk);dragId=null;save();renderAll();renderRecOv();renderWeeklyPage();
    sbSaveBlock(blk);
    sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>b.id!==blk.id);
      r._dateOverrides=prevDateOv;
      sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
      sbDeleteBlock(blk.id);save();renderAll();renderRecOv();renderWeeklyPage();
    },'Added to time block');
    return;
  } else if(dragId.startsWith('shop::')){
    const shopId=dragId.split('::')[1];
    const s=st.shopping.find(x=>String(x.id)===String(shopId));
    if(!s){dragId=null;return;}
    const prevDue=s.due_date;const prevOrder=s.shop_order;
    const newOrder=_shopTopOrder(s);s.shop_order=newOrder;s.due_date=ds;
    const blk={id:crypto.randomUUID(),title:s.name,ds,sm,dur:autoDur(s.name,'Shopping'),cat:'Shopping',shopId:String(s.id)};
    st.blocks.push(blk);dragId=null;save();renderAll();
    sbSaveBlock(blk);
    sbReq('PATCH','shopping_list',{due_date:ds,shop_order:newOrder},`?id=eq.${s.id}`);
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>b.id!==blk.id);
      s.due_date=prevDue;s.shop_order=prevOrder;
      sbReq('PATCH','shopping_list',{due_date:prevDue||null,shop_order:prevOrder??null},`?id=eq.${s.id}`);
      sbDeleteBlock(blk.id);save();renderAll();
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
    const blk={id:crypto.randomUUID(),title:r.name,ds,sm,dur:autoDur(r.name,'Recurring'),cat:'Recurring',recId:String(r.id)};
    st.blocks.push(blk);dragId=null;save();renderAll();
    sbSaveBlock(blk);
    sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>b.id!==blk.id);
      r._dateOverrides=prevDateOv;
      sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
      sbDeleteBlock(blk.id);save();renderAll();
    },'Added to time block');
    return;
  } else {
    const t=st.tasks.find(x=>String(x.id)===String(dragId));
    if(!t){dragId=null;return;}
    title=t.name;cat=t.category||'Home';taskId=String(t.id);
    // Prevent pulling same task into timeblock twice on same day
    if(st.blocks.find(b=>b.taskId===taskId&&b.ds===ds)){
      dragId=null;
      showToast('Already in time block','#6b7280',2000);
      return;
    }
    // Set task due_date to this day so it appears in Today/This Week/Calendar
    const prevDate=t.due_date;
    const blk={id:crypto.randomUUID(),title,ds,sm,dur:autoDur(title,cat),cat,taskId};
    if((t.due_date||'').split('T')[0]!==ds){
      t.due_date=ds;
      sbReq('PATCH','tasks',{due_date:ds},`?id=eq.${t.id}`);
    }
    st.blocks.push(blk);dragId=null;save();renderAll();
    sbSaveBlock(blk);
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>b.id!==blk.id);
      t.due_date=prevDate||null;
      sbReq('PATCH','tasks',{due_date:prevDate||null},`?id=eq.${t.id}`);
      sbDeleteBlock(blk.id);
      save();renderAll();
    },'Added to time block');
    return;
  }
  const blk={id:crypto.randomUUID(),title,ds,sm,dur:30,cat,taskId};
  st.blocks.push(blk);dragId=null;save();renderAll();
  pushUndo(()=>{st.blocks=st.blocks.filter(b=>b.id!==blk.id);save();renderDayTB();},'Added block');
}
function startTBInlineEdit(blockId,col,onCommit){
  // Find the block element — search whole document if col not found
  const el=(col||document).querySelector(`[data-bid="${blockId}"]`);
  if(!el){
    // Try document-wide fallback
    const el2=document.querySelector(`[data-bid="${blockId}"]`);
    if(!el2)return;
    return startTBInlineEdit(blockId,el2.closest('.tb-col'),onCommit);
  }
  const b=st.blocks.find(x=>x.id===blockId);
  if(!b)return;
  // Make block tall enough to show input while editing
  el.style.minHeight='22px';
  el.style.zIndex='10';
  // Replace the tb-bt span with an input (or create one if span is missing)
  let btSpan=el.querySelector('.tb-bt');
  const inp=document.createElement('input');
  inp.className='tb-edit';
  inp.value=b.title||'';
  inp.placeholder='Name…';
  inp.style.cssText='width:100%;font-size:9px;font-weight:600;background:rgba(255,255,255,.8);border:none;border-radius:3px;padding:1px 3px;outline:none;font-family:inherit;color:var(--text);min-width:0;box-sizing:border-box';
  if(btSpan) btSpan.replaceWith(inp); else {const tbRow=el.querySelector('.tb-row');if(tbRow)tbRow.prepend(inp);else el.prepend(inp);}
  window._tbEditing=true;
  let committed=false;
  async function commit(){
    if(committed)return; committed=true; window._tbEditing=false;
    const val=inp.value.trim();
    if(!val){
      st.blocks=st.blocks.filter(x=>x.id!==blockId);
      save();renderDayTB();
      return;
    }
    b.title=val;
    // Create a real task so it shows in Today/This Week/Calendar
    if(!b.taskId){
      const newTask={id:'t-'+Date.now(),name:val,category:'Home',due_date:b.ds,done:false,important:false};
      st.tasks.push(newTask);
      b.taskId=String(newTask.id);
      if(onCommit)onCommit();
      save();renderAll();
      // Persist task to DB
      const sv=await sbReq('POST','tasks',{name:val,category:'Home',due_date:b.ds,done:false,important:false});
      if(sv&&sv[0]){
        const ti=st.tasks.findIndex(x=>x.id===newTask.id);
        if(ti>-1)st.tasks[ti]={...sv[0]};
        b.taskId=String(sv[0].id);
        save();renderAll();
      }
      // Now save the block itself to DB
      sbSaveBlock(b);
    } else {
      if(onCommit)onCommit();
      save();renderDayTB();
      sbUpdateBlock(b.id,{title:b.title});
    }
  }
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();commit();}
    if(e.key==='Escape'){committed=true;window._tbEditing=false;st.blocks=st.blocks.filter(x=>x.id!==blockId);save();renderDayTB();}
  });
  inp.addEventListener('blur',commit);
  // Focus after a tick so the element is in the DOM
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
function onRM(e){if(!resizing)return;const b=st.blocks.find(x=>x.id===resizing.id);if(!b)return;b.dur=Math.max(15,Math.round((resizing.sd+(e.clientY-resizing.sy)/PX)/15)*15);renderDayTB();}
function onRU(){if(!resizing)return;const bid=resizing.id;const prevDur=resizing.sd;resizing=null;document.removeEventListener('mousemove',onRM);document.removeEventListener('mouseup',onRU);const b=st.blocks.find(x=>x.id===bid);if(!b)return;const newDur=b.dur;pushUndo(()=>{b.dur=prevDur;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbUpdateBlock(bid,{duration_minutes:prevDur});},'Resized block');save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbUpdateBlock(bid,{duration_minutes:newDur});}
function delBlock(id,e){
  e&&e.stopPropagation();
  const b=st.blocks.find(x=>x.id===id);if(!b)return;
  const copy={...b};
  // Removing from timeblock only — item stays in all other views (today list, shopping, etc.)
  pushUndo(()=>{st.blocks.push(copy);save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbSaveBlock(copy);},'Removed from time block');
  st.blocks=st.blocks.filter(x=>x.id!==id);
  save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbDeleteBlock(id);
}
function onTBWheel(e){
  const sc=document.getElementById('tbScroll');const atTop=sc.scrollTop<=0,atBot=sc.scrollTop+sc.clientHeight>=sc.scrollHeight-2;
  if(e.deltaY<0&&atTop){e.preventDefault();tbWD+=e.deltaY;if(tbWT)clearTimeout(tbWT);tbWT=setTimeout(()=>{if(tbWD<-40)shiftDay(-1);tbWD=0;tbWT=null;},100);}
  else if(e.deltaY>0&&atBot){e.preventDefault();tbWD+=e.deltaY;if(tbWT)clearTimeout(tbWT);tbWT=setTimeout(()=>{if(tbWD>40)shiftDay(1);tbWD=0;tbWT=null;},100);}
}
function shiftDay(n){const fl=document.getElementById('dayFlash');fl.textContent=n>0?'→':'←';fl.classList.add('show');setTimeout(()=>fl.classList.remove('show'),300);dayOff+=n;const _newDs=d2s(getDayDate(dayOff));const _newWkKey=dsToWkKey(_newDs);const _curWkKey=getWkKey(wkOff);if(_newWkKey!==_curWkKey){const _newWkOff=Math.round((new Date(_newWkKey+'T00:00:00')-new Date(getWkKey(0)+'T00:00:00'))/(7*86400000));wkOff=_newWkOff;renderWkSummary();renderWkCal();}renderDayTB();renderToday();}
function goToday(){dayOff=0;if(wkOff!==0){wkOff=0;renderWkSummary();renderWkCal();}renderDayTB();renderToday();}
function shiftWk(n){wkOff+=n;renderWkSummary();renderWkCal();}
function goThisWk(){wkOff=0;renderWkSummary();renderWkCal();}

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

