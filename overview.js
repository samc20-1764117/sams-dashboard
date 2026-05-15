// ── Render all ─────────────────────────────────────────────────────────────────
function renderAll(){renderOv();renderWeeklyPage();renderShopFull();renderTravelPage();renderBdayPage();if(typeof renderPupsPage==='function')renderPupsPage();if(typeof renderRecipesPage==='function')renderRecipesPage();if(typeof renderVideosPageKeepScroll==='function'&&activePg==='videos')renderVideosPageKeepScroll();if(document.getElementById('mModal')?.classList.contains('open'))renderMoCal();if(document.getElementById('recMoModal')?.classList.contains('open'))renderRecMoCal();if(document.getElementById('woModal')?.classList.contains('open'))renderWOModal();save();requestAnimationFrame(applySelHighlight);const m=document.getElementById('main');if(m&&m.style.opacity==='0')m.style.opacity='1';}

function _hebBadge(name){if(!/\bheb\b/i.test(name||''))return'';const c=st.shopping.filter(s=>!s.done&&s.store&&s.store.toLowerCase()==='heb').length;return c?`<span class="heb-cnt">${c}</span>`:''}

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
  // Include the week containing the viewed day so forward-navigated recurring tasks appear
  const _dayWkKey=dsToWkKey(ds);const _dayWkOff=Math.round((new Date(_dayWkKey+'T00:00:00')-new Date(getWkKey(0)+'T00:00:00'))/(7*86400000));
  const _wkHi=Math.max(0,_dayWkOff);
  const allRecVirt=[];
  for(let w=_wkHi;w>=Math.min(0,_dayWkOff)-4;w--){
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
  renderTodDonut(doneCount,sorted.length);
  const _todDs=ds;
  function _hasTBToday(t){
    if(t._type==='travel'||t._type==='birthday')return true;
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
let _pupSkillsOpen=false;
function togglePupSkillsOpen(){
  _pupSkillsOpen=!_pupSkillsOpen;
  const el=document.getElementById('pupSkillsHighlight');
  if(el){el.style.maxHeight=_pupSkillsOpen?'600px':'0';el.style.opacity=_pupSkillsOpen?'1':'0';el.style.margin=_pupSkillsOpen?'6px 14px':'0 14px';}
  const arr=document.getElementById('_pupSkillsArrow');
  if(arr)arr.textContent=_pupSkillsOpen?'▴':'▾';
}
function _pupWkSessions(skillId){
  const{mon,sun}=getWkBounds(0);
  const monDs=d2s(mon),sunDs=d2s(sun);
  return(st.pupSessions||[]).filter(s=>String(s.skill_id)===String(skillId)&&s.day_date>=monDs&&s.day_date<=sunDs);
}
function renderPupSkillsHighlight(){
  const el=document.getElementById('pupSkillsHighlight');if(!el)return;
  const btn=document.getElementById('_pupSkillsBtn');
  const allSkills=(st.pup_skills||[]).filter(s=>(s.focus===true||s.focus==='true')&&s.stage!=='Mastered');
  if(!allSkills.length){el.style.cssText='overflow:hidden;max-height:0;opacity:0;margin:0';if(btn)btn.style.display='none';return;}
  if(btn)btn.style.display='flex';
  el.style.cssText='overflow:hidden;transition:max-height .35s cubic-bezier(.4,0,.2,1),opacity .35s ease,margin .35s ease;background:rgba(255,255,255,0.18);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.35);border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.06);padding:2px 0 4px';
  const skills=[...allSkills].sort((a,b)=>{
    const aDone=_pupWkDone(a.id)>0&&_pupWkDone(a.id)===_pupWkSessTotal(a.id)&&_pupWkSessTotal(a.id)>0;
    const bDone=_pupWkDone(b.id)>0&&_pupWkDone(b.id)===_pupWkSessTotal(b.id)&&_pupWkSessTotal(b.id)>0;
    if(aDone&&!bDone)return 1;if(!aDone&&bDone)return -1;
    const pupOrd=p=>p==='Mochi'?0:p==='Sunny'?1:2;
    return pupOrd(a.pup)-pupOrd(b.pup);
  });
  const mkRow=s=>{
    const doneC=_pupWkDone(s.id);
    const total=_pupWkSessTotal(s.id);
    const allDone=total>0&&doneC===total;
    const right=`<span onclick="event.stopPropagation();openPupCountEdit('${s.id}',this)" title="Click to edit" style="font-size:9px;font-weight:600;color:var(--muted);margin-left:auto;flex-shrink:0;cursor:pointer;display:inline-block;width:26px;text-align:right">${doneC}/${total}</span>`;
    return`<div class="ti${allDone?' done':''}" draggable="true" style="padding:2px 10px;${allDone?'opacity:.45':''}" ondragstart="dragId='pupskill::${s.id}';event.dataTransfer.effectAllowed='copy';this.style.opacity='.4';document.body.classList.add('body-dragging');showWkcEdges(true);" ondragend="this.style.opacity='';document.body.classList.remove('body-dragging');showWkcEdges(false);" ondblclick="openPupEditModal('${s.id}')" onmouseenter="showPupSkillTip(this,'${s.id}')" onmouseleave="hidePupSkillTip()">
      ${right}
      <span class="tn" style="color:var(--muted);font-size:10px;font-weight:400">${escHtml(s.skill)}</span>
    </div>`;
  };
  const mochiSkills=skills.filter(s=>s.pup==='Mochi');
  const sunnySkills=skills.filter(s=>s.pup==='Sunny');
  const otherSkills=skills.filter(s=>s.pup!=='Mochi'&&s.pup!=='Sunny');
  const mkGroup=(label,color,items)=>{
    if(!items.length)return'';
    return`<div style="padding:3px 10px 1px;display:flex;align-items:center;gap:6px">
      <span style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${color}">${label}</span>
      <span style="flex:1;height:1px;background:${color};opacity:.25"></span>
    </div>${items.map(mkRow).join('')}`;
  };
  const hasBoth=mochiSkills.length>0&&sunnySkills.length>0;
  const rows=hasBoth
    ?mkGroup('Mochi','rgba(167,139,250,.8)',mochiSkills)+mkGroup('Sunny','rgba(202,138,4,.7)',sunnySkills)+otherSkills.map(mkRow).join('')
    :skills.map(mkRow).join('');
  el.innerHTML=`<div style="padding:2px 0 0">${rows}</div>`;
  el.style.maxHeight=_pupSkillsOpen?'600px':'0';
  el.style.opacity=_pupSkillsOpen?'1':'0';
  el.style.margin=_pupSkillsOpen?'6px 14px':'0 14px';
  const arr=document.getElementById('_pupSkillsArrow');
  if(arr)arr.textContent=_pupSkillsOpen?'▴':'▾';
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
// Type priority for untimed tasks: travel sorted first via pre-check; important via pre-check
// Order: birthday(1) home(2) my work(3) work(4) social(5) recurring(6) shopping(7) pup(8)
function taskTypePri(t){
  if(t._type==='birthday')return 1;
  const cat=(t.category||'').toLowerCase();
  if(cat==='home')return 2;
  if(cat==='my work')return 3;
  if(cat==='work')return 4;
  if(cat==='social')return 5;
  if(t._type==='shop')return 7;
  if(t._type==='pup')return 8;
  if(t._virtual)return 6; // recurring (WR + non-WR), checked after shop/pup
  return 5; // other regular tasks
}
function sortByTypeOrder(tasks){
  return[...tasks].sort((a,b)=>{
    if(a.done&&!b.done)return 1;if(!a.done&&b.done)return -1;
    const aT=a._type==='travel'&&!a.done,bT=b._type==='travel'&&!b.done;
    if(aT&&!bT)return -1;if(!aT&&bT)return 1;
    const aB=a._type==='birthday'&&!a.done,bB=b._type==='birthday'&&!b.done;
    if(aB&&!bB)return -1;if(!aB&&bB)return 1;
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
    const aB=a._type==='birthday'&&!a.done,bB=b._type==='birthday'&&!b.done;
    if(aB&&!bB)return -1;if(!aB&&bB)return 1;
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
    const aT=a._type==='travel'&&!a.done,bT=b._type==='travel'&&!b.done;
    if(aT&&!bT)return -1;if(!aT&&bT)return 1;
    const aB=a._type==='birthday'&&!a.done,bB=b._type==='birthday'&&!b.done;
    if(aB&&!bB)return -1;if(!aB&&bB)return 1;
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
    ${_hebBadge(t.name)}
    ${!ov?`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${ps.bg}" stroke="${ps.d}" stroke-opacity="0.4" stroke-width="1"/></svg>`:''}
    ${ov&&t.due_date?`<span class="dlbl ov">${['S','M','T','W','T','F','S'][new Date(t.due_date.split('T')[0]+'T12:00').getDay()]}</span>`:''}
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
    ${!ov?`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${ps.bg}" stroke="${ps.d}" stroke-opacity="0.4" stroke-width="1"/></svg>`:''}
    ${!noDate&&t.due_date?`<span class="dlbl ${ov?'ov':''}">${ov?['S','M','T','W','T','F','S'][new Date(t.due_date.split('T')[0]+'T12:00').getDay()]:fmtD(t.due_date)}</span>`:''}
    ${tbArrow?'<span class="tb-arrow">›</span>':''}
    <button class="delbtn" onclick="event.stopPropagation();unscheduleShop('${t._shopId}')">✕</button>
  </div>`;
}
function _pupSessStyle(){
  return{bg:'rgba(221,244,240,.38)',b:'rgba(42,157,181,.14)',t:'rgba(32,140,165,1)',d:'#2a9db5',dot:'rgba(42,157,181,.18)'};
}
function _pupDisplayName(t){const p=t._pup;return p?(p+': '+(t.name||'')):(t.name||'');}
function tRowPupSess(t,noColor=false){
  const ov=isOv(t.due_date)&&!t.done;
  const ps=ov?OV:_pupSessStyle();
  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''}" draggable="true" style="${!ov&&!noColor?`background:${ps.bg};border:1px solid ${ps.b}`:''}" id="ti-pup-sess-${t._pupSessId}" onclick="selTask(event,'pup-sess-${t._pupSessId}')" ondblclick="openPupEditModal('${t._skillId}')" ondragstart="dragId='pupsess::${t._pupSessId}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);" ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);">
    <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="togPupSessionDone('${t._pupSessId}',this.checked)"></label>
    <span class="tn">${escHtml(_pupDisplayName(t))}</span>
    ${ov&&t.due_date?`<span class="dlbl ov">${['S','M','T','W','T','F','S'][new Date(t.due_date.split('T')[0]+'T12:00').getDay()]}</span>`:''}
    ${!ov?`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="none" stroke="rgba(42,157,181,.35)" stroke-width="1.5"/></svg>`:''}
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
  _attachListRubberBand(document.getElementById('wkList'));
}

// ── Week calendar ──────────────────────────────────────────────────────────────
// Track drag-to-add-travel state
let tvDragStart=null,tvDragEnd=null;
let calDrag={active:false,startDs:null,endDs:null,view:null,moved:false};
let _pasteColDates=null;


function renderWkCal(){
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
    h.addEventListener('click',()=>{
      const todayDs=d2s(new Date());
      const diff=Math.round((new Date(ds+'T00:00:00')-new Date(todayDs+'T00:00:00'))/86400000);
      dayOff=diff;
      renderToday();renderDayTB();renderWkCal();
    });
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
      ban.style.cssText=`left:${left+2}px;top:${headH+lane*22}px;width:${right-left-4}px;background:${s.bg};color:${s.t};border-color:${s.b}${isPast?';opacity:.35':''}`;
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
    if(maxLane>=0)bannerEl.style.height=`${headH+(maxLane+1)*22}px`;
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
        const newWkKey=dsToWkKey(ds);
        const _wrRuleSid='wrrule-'+ruleId;
        const _isMultiWR=selectedTasks.has(_wrRuleSid)&&selectedTasks.size>1;
        const _curWkKey=getWkKey(wkOff);
        const _wrMoveIds=_isMultiWR?[...selectedTasks].filter(sid=>sid.startsWith('wrrule-')||sid.startsWith('wrrule-virt-')).map(sid=>sid.replace('wrrule-virt-','').replace('wrrule-','')):[ruleId];
        const _wrMoves=_wrMoveIds.map(rid=>{const r=st.wrRules.find(x=>String(x.id)===String(rid));if(!r)return null;return{r,rid,prevCur:r._dateOverrides?.[_curWkKey],prevNew:r._dateOverrides?.[newWkKey]};}).filter(Boolean);
        _wrMoves.forEach(({r})=>{if(!r._dateOverrides)r._dateOverrides={};if(_curWkKey!==newWkKey&&r._dateOverrides[_curWkKey]!==undefined)delete r._dateOverrides[_curWkKey];r._dateOverrides[newWkKey]=ds;});
        const _wrUndos=[()=>{_wrMoves.forEach(({r,rid,prevCur,prevNew})=>{if(!r._dateOverrides)r._dateOverrides={};if(_curWkKey!==newWkKey){if(prevCur!==undefined)r._dateOverrides[_curWkKey]=prevCur;else delete r._dateOverrides[_curWkKey];}if(prevNew!==undefined)r._dateOverrides[newWkKey]=prevNew;else delete r._dateOverrides[newWkKey];sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${rid}`);});}];
        // Multi-select: also move regular tasks + wrec items
        if(_isMultiWR){
          [...selectedTasks].forEach(sid=>{
            if(sid.startsWith('wrrule'))return;
            if(sid.startsWith('wrec-')){
              const rid=sid.replace('wrec-','');const r2=st.recurring.find(x=>String(x.id)===String(rid));
              if(r2){if(!r2._dateOverrides)r2._dateOverrides={};const p=r2._dateOverrides[wkKey];r2._dateOverrides[wkKey]=ds;sbReq('PATCH','wr_recurring_rules',{date_overrides:r2._dateOverrides},recQs(r2.id));
                _wrUndos.push(()=>{if(p)r2._dateOverrides[wkKey]=p;else delete r2._dateOverrides[wkKey];sbReq('PATCH','wr_recurring_rules',{date_overrides:r2._dateOverrides},recQs(r2.id));});}
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
        // Multi-select: also move regular tasks + other wrec/wrrule
        if(_isMultiWrec){
          [...selectedTasks].forEach(sid=>{
            if(sid===_wrecSid)return;
            if(sid.startsWith('wrec-')){
              const rid=sid.replace('wrec-','');const r2=st.recurring.find(x=>String(x.id)===String(rid));
              if(r2)_moveRecOv(r2,recQs(r2.id));
            }else if(sid.startsWith('wrrule-virt-')||sid.startsWith('wrrule-')){
              const rid=sid.replace('wrrule-virt-','').replace('wrrule-','');const r2=st.wrRules.find(x=>String(x.id)===String(rid));
              if(r2)_moveRecOv(r2,`?id=eq.${rid}`);
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
              save();dragId=null;renderPupSkillsHighlight();setTimeout(()=>{renderWkCal();renderToday();},0);
              sbReqSilent('PATCH','pup_skill_sessions',{day_date:ds},`?id=eq.${sessId}`);
              pushUndo(()=>{sess.day_date=prev;save();renderPupSkillsHighlight();renderWkCal();renderToday();sbReqSilent('PATCH','pup_skill_sessions',{day_date:prev},`?id=eq.${sessId}`);},'Moved pup session');
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
          save();dragId=null;renderAll();renderWkCal();
          _shopMoves.forEach(({s})=>sbReqNullable('PATCH','shopping_list',{due_date:ds,shop_order:s.shop_order},`?id=eq.${s.id}`));
          pushUndo(()=>{
            _shopMoves.forEach(({s,prev,prevOrder,savedTBs})=>{s.due_date=prev;s.shop_order=prevOrder;savedTBs.forEach(b=>{if(!st.blocks.find(x=>x.id===b.id))st.blocks.push(b);sbSaveBlock(b);});sbReqNullable('PATCH','shopping_list',{due_date:prev||null,shop_order:prevOrder??null},`?id=eq.${s.id}`);});
            save();renderAll();renderWkCal();
          },'Assigned shopping item to '+ds);
        }
        dragId=null;return;
      }
      const _dragSid=String(dragId);
      const _isMulti=selectedTasks.has(_dragSid)&&selectedTasks.size>1;
      // Also move selected wrec/wrrule items when multi-dragging
      const _mixedUndos=[];
      if(_isMulti){
        const wkKey=getWkKey(wkOff);
        [...selectedTasks].forEach(sid=>{
          if(sid.startsWith('wrec-')){
            const recId=sid.replace('wrec-','');
            const r=st.recurring.find(x=>String(x.id)===String(recId));
            if(r){if(!r._dateOverrides)r._dateOverrides={};const prev=r._dateOverrides[wkKey];r._dateOverrides[wkKey]=ds;sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
              _mixedUndos.push(()=>{if(prev)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));});}
          }else if(sid.startsWith('wrrule-virt-')||sid.startsWith('wrrule-')){
            const ruleId=sid.replace('wrrule-virt-','').replace('wrrule-','');
            const r=st.wrRules.find(x=>String(x.id)===String(ruleId));
            if(r){if(!r._dateOverrides)r._dateOverrides={};const prev=r._dateOverrides[wkKey];r._dateOverrides[wkKey]=ds;sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${ruleId}`);
              _mixedUndos.push(()=>{if(prev)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${ruleId}`);});}
          }
        });
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
          const _timeRx=/@(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
          const _tmM=x.t.name.match(_timeRx);
          let _newSm=null,_newDur=null;
          if(x.savedTBs.length){_newSm=x.savedTBs[0].sm;_newDur=x.savedTBs[0].dur;}
          else if(_tmM){let h=parseInt(_tmM[1]),mm=parseInt(_tmM[2]||'0');const ap=(_tmM[3]||'').toLowerCase();if(ap==='pm'&&h!==12)h+=12;else if(ap==='am'&&h===12)h=0;else if(!ap&&h>=1&&h<=6)h+=12;_newSm=h*60+mm;const lc=(x.t.category||'').toLowerCase();_newDur=lc==='social'?180:lc==='work'||lc==='my work'||lc==='recurring'?60:30;}
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
    const virtForDay=getRecurringWeekTasks(wkOff).filter(v=>v.due_date===ds&&!v.done);
    const virtForDayDone=getRecurringWeekTasks(wkOff).filter(v=>v.due_date===ds&&v.done);
    const wkKey2=getWkKey(wkOff);
    // Add weekly reset tasks pinned to this date — check current week AND past weeks (overdue moved forward)
    const _wrecSeenDay=new Set();const wrecForDay=[];const wrecForDayDone=[];
    for(let _pw=wkOff;_pw>=wkOff-4;_pw--){const _pwk=getWkKey(_pw);
      st.recurring.filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&r._dateOverrides&&r._dateOverrides[_pwk]===ds&&!_wrecSeenDay.has(String(r.id))).forEach(r=>{
        _wrecSeenDay.add(String(r.id));const _isDone=!!(r._doneByWk&&r._doneByWk[_pwk]);
        const item={id:'rec-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:_isDone,_recId:r.id,_virtual:true,_wkKey:_pwk,_isWrec:true};
        if(_isDone)wrecForDayDone.push(item);else wrecForDay.push(item);
      });
    }
    const _wrRuleSeenDay=new Set();const wrRulesForDay=[];const wrRulesForDayDone=[];
    for(let _pw=wkOff;_pw>=wkOff-4;_pw--){const _pwk=getWkKey(_pw);
      st.wrRules.filter(r=>r._dateOverrides&&r._dateOverrides[_pwk]===ds&&!_wrRuleSeenDay.has(String(r.id))&&!(st.wrOverrides||[]).some(o=>String(o.rule_id)===String(r.id)&&o.wk_key===_pwk&&o.override_type==='skip')).forEach(r=>{
        _wrRuleSeenDay.add(String(r.id));const _isDone=isDoneWRRule(r.id,_pwk);
        const item={id:'wrrule-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:_isDone,_ruleId:r.id,_virtual:true,_wkKey:_pwk,_isWrRule:true};
        if(_isDone)wrRulesForDayDone.push(item);else wrRulesForDay.push(item);
      });
    }
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
    const doneDay=sortTasksForDay([
      ...st.tasks.filter(t=>t.due_date&&t.due_date.split('T')[0]===ds&&t.done&&t.category!=='Weekly Goals'),
      ...virtForDayDone,
      ...wrecForDayDone,
      ...wrRulesForDayDone,
      ...shopForDayDone,
      ...pupSessForDayDone
    ],ds);
    let dayTasks=[...undoneDay,...doneDay];
    dayTasks.forEach(t=>{
      const ov=isOv(t.due_date)&&!t.done,imp=t.important&&!ov&&!t.done;
      const _chipCat=(t._isWrec||t._isWrRule)?'weekly_reset':(t._virtual&&t._recId?'recurring':t.category);
      const s=ov?OV:imp?IMP:t._type==='pup'?_pupSessStyle():gc(_chipCat);
      const chip=document.createElement('div');chip.className='chip'+(t.done?' done-chip':'');
      chip.style.cssText=`background:${s.bg};color:${s.t};border-color:${s.b}`;
      if(!t._virtual)chip.dataset.tid=String(t.id);
      else if(t._type==='shop')chip.dataset.tid='shop-cal-'+t._shopId;
      else if(t._isWrRule)chip.dataset.tid='wrrule-virt-'+t._ruleId;
      else if(t._isWrec)chip.dataset.tid='wrec-'+t._recId;
      else if(t._recId)chip.dataset.tid='rec-virt-'+t._recId;
      else if(t._type==='pup')chip.dataset.tid='pup-sess-'+t._pupSessId;
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
      const _chipHeb=/\bheb\b/i.test(t.name||'')?st.shopping.filter(s=>!s.done&&s.store&&s.store.toLowerCase()==='heb').length:0;
      const nm=document.createElement('span');nm.className='chip-name';nm.innerHTML=tmIcon(t)+escHtml(t._type==='pup'?_pupDisplayName(t):t.name)+(_chipHeb?`<span style="color:rgba(160,150,180,.85);margin-left:3px;font-weight:700">${_chipHeb}</span>`:'');
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
  requestAnimationFrame(()=>{document.querySelectorAll('#wkcCols .wkc-col').forEach(c=>_updateOverflowBadge(c));});
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
      const chk=document.createElement('input');chk.type='checkbox';chk.className='chk';chk.checked=isDone;chk.style.cssText='width:11px;height:11px';
      chk.addEventListener('change',function(){togWrRule(rid,this.checked,wkKey);});
      chkWrap.appendChild(chk);row.appendChild(chkWrap);
    }
    const nm=document.createElement('span');nm.className='tn';
    if(isDone)nm.style.cssText='text-decoration:line-through;color:var(--muted)';
    nm.textContent=r._displayName;
    row.appendChild(nm);
    const _hb=_hebBadge(r._displayName);
    if(_hb){const _hel=document.createElement('span');_hel.className='heb-cnt';_hel.textContent=st.shopping.filter(s=>!s.done&&s.store&&s.store.toLowerCase()==='heb').length;row.appendChild(_hel);}
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
    const srcMon=new Date(_wrCtxWkKey+'T12:00');
    srcMon.setDate(srcMon.getDate()+(delta>0?7:-7));
    const targetWkKey=d2s(srcMon);
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
    const wkKey=getWkKey(wkOff);
    const _isMultiWR=selectedTasks.has('wrrule-'+ruleId)&&selectedTasks.size>1;
    const _wrMoveIds=_isMultiWR?[...selectedTasks].filter(sid=>sid.startsWith('wrrule-')).map(sid=>sid.replace('wrrule-','')):[ruleId];
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
    return`<div class="ti ${t.done?'done':''}" style="background:${s.bg}" id="ti-${t.id}" onclick="selTask(event,'${t.id}')" ondblclick="${t._isWrRule?`event.stopPropagation();openWrEditModal('${t._ruleId}','${t._wkKey||getWkKey(wkOff)}','all')`:`tiDblRec(event,'${t._recId}')`}" oncontextmenu="${_wkCtxMenu}">
      <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="${t._isWrec?`togRec('${t._recId}',this.checked)`:`togRecVirt('${t._recId}',this.checked,'${t._wkKey||getWkKey(wkOff)}')`}"></label>
      <span class="tn">${t.name}</span>
      ${_hebBadge(t.name)}
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
  return`<div class="ti ti-${sl}" style="background:${s.bg}" id="ti-${t.id}" ${bdDrag} onclick="selTask(event,'${t.id}')">
    <span class="tn" style="color:${s.t};font-weight:600">${modeIcon}${t.name}</span>
    ${isTv||isBd?'':`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${s.bg}" stroke="${s.d}" stroke-opacity="0.4" stroke-width="1"/></svg>`}
    ${isBd?'':`<span class="dlbl">${fmtD(t.due_date)}${sub}</span>`}
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
    ${o.cat?(o.catDot&&!ov?`<svg class="cat-dot" width="9" height="9" viewBox="0 0 9 9"><circle cx="4.5" cy="4.5" r="3" fill="${s.bg}" stroke="${s.d}" stroke-opacity="0.4" stroke-width="1"/></svg>`:(!o.catDot?`<span class="cpill" style="background:${s.bg};color:${s.t};border-color:${s.b}">${t.category||'?'}</span>`:'')):''}
    ${o.flag?'<span class="flag-u">📅</span>':''}
    ${!o.flag&&(!o.noDate||ov)&&t.due_date?ov?`<span class="dlbl ov">${['S','M','T','W','T','F','S'][new Date(t.due_date.split('T')[0]+'T12:00').getDay()]}</span>`:`<span class="dlbl" style="cursor:pointer" onclick="openInlineDatePicker(event,'${t.id}','${t.due_date}')">${fmtD(t.due_date)} <span class="date-clr" title="Clear date" onclick="event.stopPropagation();clearTaskDate('${t.id}',event)">×</span></span>`:''}
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
      // Auto-select auto-blocks in range when no regular blocks were selected
      if(![...selectedTasks].some(id=>!id.startsWith('atb::'))){
        tbCol.querySelectorAll('.atb-block[data-atb-id]').forEach(ae=>{
          const ar=ae.getBoundingClientRect();
          if(ar.bottom>y1&&ar.top<y2&&ar.right>x1&&ar.left<x2)selectedTasks.add('atb::'+ae.dataset.atbId);
        });
      }
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
    if(e.target.closest('.chip,.ti,.tb-block,.wkc-banner,.wkc-goals-col'))return;
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
    const [eh,em]=(endTime||'00:30').split(':');
    const startMinutes=parseInt(sh)*60+parseInt(sm2||0);
    const endMinutes=parseInt(eh)*60+parseInt(em||0);
    const dur=Math.max(15,endMinutes-startMinutes);
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
    e2.stopPropagation();
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
  // Drag to move
  el.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('atb-del')||e.target.classList.contains('atb-resize')||e.target.classList.contains('tb-chk'))return;
    if(e.detail>=2){e.stopPropagation();openRecEditModal(ratb._recId);return;}
    e.preventDefault();e.stopPropagation();
    const startY=e.clientY,startSm=ratb.sm;
    let dragging=false;
    const onMove=ev=>{const dy=ev.clientY-startY;if(!dragging&&Math.abs(dy)<5)return;dragging=true;ratb.sm=Math.max(HOURS[0]*60,Math.round((startSm+dy/PX)/15)*15);el.style.top=(ratb.sm-HOURS[0]*60)*PX+'px';const bt=el.querySelector('.tb-btime');if(bt)bt.textContent=tStr(ratb.sm)+'-'+tStr(ratb.sm+ratb.dur);const _c=el.closest('.tb-col');if(_c)_relayoutTBCol(_c,ds);};
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
  // Compute layout then draw (auto blocks participate in overlap calc)
  const autoBlocks=getAutoTBForDate(ds);
  const recAutoBlocks=getRecAutoTBForDate(ds);
  computeTBLayout(ds,[...autoBlocks,...recAutoBlocks]);
  getVisibleBlocks(ds).forEach(b=>drawTBBlock(col,b));
  autoBlocks.forEach(a=>drawAutoTBBlock(col,a,ds));
  recAutoBlocks.forEach(a=>drawRecAutoTBBlock(col,a,ds));
  const autoBtn=document.getElementById('autoTBToggle');if(autoBtn)autoBtn.style.opacity=cfg.showAutoTB?'1':'0.4';
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
      if(!mode)return;
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
function _getTBBlockSelId(bl){if(bl.cat==='pup_session'&&bl._pupSessId)return'pup-sess-'+String(bl._pupSessId);if(bl.ruleId)return'blk-'+bl.id;if(bl.recId&&(st.wrRules||[]).some(x=>String(x.id)===String(bl.recId)))return'blk-'+bl.id;const r=bl.recId?st.recurring.find(x=>String(x.id)===String(bl.recId)):null;const iw=r&&(r.is_weekly_reset===true||r.is_weekly_reset==='true');return bl.taskId?'blk-'+bl.id:bl.recId?(iw?'wrec-':'rec-virt-')+bl.recId:bl.shopId?'blk-'+bl.id:null;}
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
  const isPupBlock=b.cat==='pup_session';
  const s=isImp?IMP:isPupBlock?_pupSessStyle():gc(effectiveCat);
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
  let _displayTitle=(_linkedTask&&_linkedTask.name)||(_linkedRec&&_linkedRec.name)||(linkedShop&&linkedShop.name)||b.title;
  if(isPupBlock){const _ps=b._pupSessId?(st.pupSessions||[]).find(s=>String(s.id)===String(b._pupSessId)):null;const _sk=_ps?(st.pup_skills||[]).find(x=>String(x.id)===String(_ps.skill_id)):null;const _pup=_sk?.pup;if(_pup)_displayTitle=_pup+': '+_displayTitle;}
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
  function _tbSelId(){return _getTBBlockSelId(b);}
  function _tbBlockSelId(bl){return _getTBBlockSelId(bl);}
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
    if(b.cat==='pup_session'){const _ps=b._pupSessId?(st.pupSessions||[]).find(s=>String(s.id)===String(b._pupSessId)):null;const _sk=_ps?(st.pup_skills||[]).find(x=>String(x.id)===String(_ps.skill_id)):((st.pup_skills||[]).find(x=>x.skill===b.title));if(_sk)openPupEditModal(_sk.id);}
    else if(b.taskId){openEditTask(b.taskId);}
    else if(b.recId){openRecEditModal(String(b.recId));}
    else{startTBInlineEdit(b.id,el.closest('.tb-col'));}
  });
  el.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('tb-resize')||e.target.classList.contains('tb-bdel')||e.target.classList.contains('tb-chk'))return;
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
  const autoDur=(name,category)=>{const c=(category||'').toLowerCase();const n=(name||'').toLowerCase();if(c==='social'||/social/.test(n))return 180;if(c==='work'||c==='my work'||c==='recurring'||/\bheb\b/.test(n)||/pilates/.test(n))return 60;return 30;};
  // helper: compute wkKey (Monday of the week) from a date string
  const wkKeyFromDs=d=>{const dt=new Date(d+'T00:00:00');const dow=(dt.getDay()+6)%7;const mon=new Date(dt);mon.setDate(dt.getDate()-dow);return d2s(mon);};
  if(dragId.startsWith('pupskill::')||dragId.startsWith('pupsess::')){
    const isPupSess=dragId.startsWith('pupsess::');
    let skillId;
    if(isPupSess){const sessId=dragId.split('::')[1];const sess=st.pupSessions.find(s=>String(s.id)===String(sessId));if(!sess){dragId=null;return;}skillId=sess.skill_id;}
    else{skillId=dragId.split('::')[1];}
    const skill=(st.pup_skills||[]).find(x=>String(x.id)===String(skillId));if(!skill){dragId=null;return;}
    const sessAlready=st.pupSessions.find(s=>String(s.skill_id)===String(skillId)&&s.day_date===ds);
    let newSessCreated=false;let tmpSessId=null;
    if(!sessAlready){
      const tmp='pss-tmp-'+Date.now();tmpSessId=tmp;newSessCreated=true;
      st.pupSessions.push({id:tmp,skill_id:skillId,day_date:ds,done:false});
      sbReqSilent('POST','pup_skill_sessions',{skill_id:skillId,day_date:ds,done:false}).then(sv=>{if(sv&&sv[0]){const i=st.pupSessions.findIndex(s=>s.id===tmp);if(i>-1){tmpSessId=sv[0].id;st.pupSessions[i]=sv[0];}const blkRef=st.blocks.find(b=>b._pupSessId===tmp);if(blkRef)blkRef._pupSessId=sv[0].id;}save();});
    }
    const sessRef=st.pupSessions.find(s=>String(s.skill_id)===String(skillId)&&s.day_date===ds);
    const blk={id:crypto.randomUUID(),title:skill.skill,ds,sm,dur:30,cat:'pup_session',_pupSessId:(sessRef?.id||tmpSessId)||null};
    st.blocks.push(blk);dragId=null;save();renderAll();sbSaveBlock(blk);
    renderPupSkillsHighlight();renderWkCal();renderToday();
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>b.id!==blk.id);sbDeleteBlock(blk.id);
      if(newSessCreated){st.pupSessions=st.pupSessions.filter(s=>!(String(s.skill_id)===String(skillId)&&s.day_date===ds));if(tmpSessId)sbReqSilent('DELETE','pup_skill_sessions',null,`?id=eq.${tmpSessId}`);}
      save();renderAll();renderPupSkillsHighlight();renderWkCal();renderToday();
    },'Added pup skill to time block');
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
        const _dur=autoDur(r.name,'Recurring');
        const blk={id:crypto.randomUUID(),title:r.name,ds,sm:_curSm,dur:_dur,cat:'Recurring',recId:String(r.id)};
        st.blocks.push(blk);_addedBlks.push(blk);sbSaveBlock(blk);
        sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
        _undoOps.push(()=>{r._dateOverrides=prevDateOv;sbReq('PATCH','wr_recurring_rules',{date_overrides:prevDateOv},recQs(r.id));});
        _curSm+=_dur;
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
    dragId=null;selectedTasks.clear();save();renderAll();renderRecOv();
    const _blkIds=_addedBlks.map(b=>b.id);
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>!_blkIds.includes(b.id));
      _blkIds.forEach(id=>sbDeleteBlock(id));
      _undoOps.forEach(fn=>fn());
      save();renderAll();renderRecOv();
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
        const _dur=autoDur(r.name,'Recurring');
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
    dragId=null;selectedTasks.clear();save();renderAll();renderRecOv();renderWeeklyPage();
    const _blkIds=_addedBlks.map(b=>b.id);
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>!_blkIds.includes(b.id));
      _blkIds.forEach(id=>sbDeleteBlock(id));
      _undoOps.forEach(fn=>fn());
      save();renderAll();renderRecOv();renderWeeklyPage();
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
  } else if(dragId.startsWith('bday::')){
    const parts=dragId.split('::');const bdayId=parts[1],bdayName=st.birthdays.find(x=>String(x.id)===String(bdayId));
    if(!bdayName){dragId=null;return;}
    const blk={id:crypto.randomUUID(),title:`${bdayName.name}'s Birthday 🎂`,ds,sm,dur:60,cat:'Birthday'};
    st.blocks.push(blk);dragId=null;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
    sbSaveBlock(blk);
    pushUndo(()=>{st.blocks=st.blocks.filter(b=>b.id!==blk.id);sbDeleteBlock(blk.id);save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();},'Added birthday to time block');
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
    dragId=null;selectedTasks.clear();save();renderAll();
    const _blkIds=_addedBlks.map(b=>b.id);
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>!_blkIds.includes(b.id));
      _blkIds.forEach(id=>sbDeleteBlock(id));
      _undoOps.forEach(fn=>fn());
      save();renderAll();
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
  inp.style.cssText='width:100%;font-size:9px;font-weight:600;background:rgba(255,255,255,.8);border:none;border-radius:3px;padding:1px 3px;outline:none;font-family:inherit;color:var(--text);min-width:0;box-sizing:border-box';
  if(btSpan)btSpan.replaceWith(inp);else{if(tbRow)tbRow.prepend(inp);else el.prepend(inp);}
  _applyColor();
  window._tbEditing=true;
  let committed=false;
  let _tbImp=false;
  function _applyImpStyle(){
    if(_tbImp){const is=IMP;el.style.background=is.bg;el.style.color=is.t;el.style.borderColor=is.b;if(_catLbl)_catLbl.style.color=is.t;}
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
      save();renderAll();
      const sv=await sbReq('POST','tasks',{name:val,category:chosenCat,due_date:b.ds,done:false,important:_tbImp});
      if(sv&&sv[0]){const ti=st.tasks.findIndex(x=>x.id===newTask.id);if(ti>-1)st.tasks[ti]={...sv[0]};b.taskId=String(sv[0].id);save();renderToday();renderWkSummary();renderWkCal();}
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
function onRM(e){if(!resizing)return;const b=st.blocks.find(x=>x.id===resizing.id);if(!b)return;b.dur=Math.max(15,Math.round((resizing.sd+(e.clientY-resizing.sy)/PX)/15)*15);renderDayTB();}
function onRU(){if(!resizing)return;const bid=resizing.id;const prevDur=resizing.sd;resizing=null;document.removeEventListener('mousemove',onRM);document.removeEventListener('mouseup',onRU);const b=st.blocks.find(x=>x.id===bid);if(!b)return;const newDur=b.dur;pushUndo(()=>{b.dur=prevDur;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbUpdateBlock(bid,{duration_minutes:prevDur});},'Resized block');save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbUpdateBlock(bid,{duration_minutes:newDur});}
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

