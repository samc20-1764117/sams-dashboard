// ── Render all ─────────────────────────────────────────────────────────────────
function renderAll(){renderOv();renderWeeklyPage();renderShopFull();renderTravelPage();renderBdayPage();renderPupsPage();renderRecipesPage();save();requestAnimationFrame(applySelHighlight);}

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
  const ovCount=st.tasks.filter(t=>!t.done&&isOv(t.due_date)).length+st.shopping.filter(s=>!s.done&&s.due_date&&isOv(s.due_date)).length;
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
    if(!t.due_date)return false;
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
  // Weekly reset tasks pinned to today via _dateOverrides (current week only)
  const _wkKeyNow=getWkKey(wkOff);
  const wrecToday=st.recurring
    .filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&!(r._doneByWk&&r._doneByWk[_wkKeyNow])&&r._dateOverrides&&(
      r._dateOverrides[_wkKeyNow]===ds||(dayOff===0&&r._dateOverrides[_wkKeyNow]&&r._dateOverrides[_wkKeyNow]<ds)
    ))
    .map(r=>({id:'rec-virt-'+r.id,name:r.name,category:'Recurring',due_date:r._dateOverrides[_wkKeyNow],done:!!(r._doneByWk&&r._doneByWk[_wkKeyNow]),_recId:r.id,_virtual:true,_wkKey:_wkKeyNow,_isWrec:true}));
  // Shopping items due today (or overdue when viewing today)
  const shopToday=st.shopping
    .filter(s=>!s.done&&s.due_date&&(s.due_date===ds||(dayOff===0&&isOv(s.due_date))))
    .map(s=>({id:'shop-cal-'+s.id,name:s.name,category:'Shopping',due_date:s.due_date,done:!!s.done,_shopId:s.id,_virtual:true,_type:'shop',store:s.store}));
  const virtToday=[
    ...allRecVirt.filter(v=>v.due_date===ds||(dayOff===0&&isOv(v.due_date)&&!v.done)),
    ...wrecToday,
    ...shopToday,
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
    if(t._recId)return st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&String(b.recId)===String(t._recId));
    if(!t._virtual)return st.blocks.some(b=>(b.ds===_todDs||isOvToday)&&String(b.taskId)===String(t.id));
    return true;
  }
  document.getElementById('todList').innerHTML=sorted.map(t=>{
    const arr=!t.done&&!_hasTBToday(t);
    return t._type==='travel'||t._type==='birthday'?tRowExtra(t):t._type==='shop'?tRowShopVirt(t,true,arr,true):t._virtual?tRowTodayVirt(t,arr,true):tRow(t,{cat:true,drag:true,noDate:true,tbArrow:arr,noColor:true});
  }).join('');
  updateOvBanner();
}
// Type priority for sorting: regular=1, recurring=2, shopping=3, travel/birthday=4
function taskTypePri(t){
  if(t._type==='travel'||t._type==='birthday')return 4;
  if(t._type==='shop')return 3;
  if(t._virtual)return 2;
  return 1;
}
function sortByTypeOrder(tasks){
  return[...tasks].sort((a,b)=>{
    if(a.done&&!b.done)return 1;if(!a.done&&b.done)return -1;
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
    else if(t._recId)b=blks.find(x=>String(x.recId)===String(t._recId));
    else if(!t._virtual)b=blks.find(x=>String(x.taskId)===String(t.id));
    return b?b.sm:null;
  }
  return[...tasks].sort((a,b)=>{
    if(a.done&&!b.done)return 1;if(!a.done&&b.done)return -1;
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
  const s=gc(t._isWrec?'weekly_reset':'recurring');
  const ov=isOv(t.due_date)&&!t.done;
  const ps=ov?OV:s;
  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''}" style="${!ov&&!noColor?`background:${s.bg}`:''}" id="ti-${t.id}" draggable="true" ondragstart="dragId='${t._isWrec?`wrec::${t._recId}`:`rec::${t._recId}::${t.due_date||''}`}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);" ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);" onclick="selTask(event,'${t.id}')" ondblclick="tiDblRec(event,'${t._recId}')" oncontextmenu="showCtx(event,'${t.id}',true,'${t._recId}')">
    <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="${t._isWrec?`togRec('${t._recId}',this.checked)`:`togRecVirt('${t._recId}',this.checked,'${t._wkKey||getWkKey(wkOff)}')`}"></label>
    <span class="tn">${t.name}</span>
    <span class="cpill" style="background:${ps.bg};color:${ps.t};border-color:${ps.b}">Recurring</span>
    ${tbArrow?'<span class="tb-arrow">›</span>':''}
    <button class="delbtn" onclick="event.stopPropagation();${t._isWrec?`unscheduleWRec('${t._recId}','${t._wkKey||getWkKey(wkOff)}')`:`skipRecVirtThisWk('${t._recId}','${t._wkKey||getWkKey(wkOff)}')`}">✕</button>
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
    <span class="cpill" style="background:${ps.bg};color:${ps.t};border-color:${ps.b}">Shopping</span>
    ${!noDate&&t.due_date?`<span class="dlbl ${ov?'ov':''}">${fmtD(t.due_date)}</span>`:''}
    ${tbArrow?'<span class="tb-arrow">›</span>':''}
    <button class="delbtn" onclick="event.stopPropagation();unscheduleShop('${t._shopId}')">✕</button>
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
  setTimeout(()=>{
    const wrap=document.getElementById('wkcWrap');
    if(!wrap)return;
    const colEls=[...document.querySelectorAll('#wkcCols .wkc-col')];
    if(colEls.length!==7)return;
    const wrapRect=wrap.getBoundingClientRect();
    const today2=tod();
    colEls.forEach(c=>c.style.paddingTop='0');

    // Lane tracking: for each column, which row-lanes are occupied
    const colLanes=Array.from({length:7},()=>new Set());
    function pickLane(si,ei){for(let lane=0;;lane++){let ok=true;for(let i=si;i<=ei;i++){if(colLanes[i].has(lane)){ok=false;break;}}if(ok)return lane;}}

    function addBanner(label,startDs,endDs,s,onClick,isPast){
      const si=Math.max(0,wkDss.indexOf(wkDss.find(d=>d>=startDs)));
      const ei=Math.min(6,wkDss.findIndex(d=>d>=(endDs||startDs)));
      if(si<0||si>6)return;
      const colStart=colEls[si],colEnd=colEls[ei];
      if(!colStart||!colEnd)return;
      const sr=colStart.getBoundingClientRect(),er=colEnd.getBoundingClientRect();
      const left=sr.left-wrapRect.left,right=er.right-wrapRect.left;
      const lane=pickLane(si,ei);
      for(let i=si;i<=ei;i++)colLanes[i].add(lane);
      const ban=document.createElement('div');ban.className='wkc-banner';
      ban.style.cssText=`left:${left+2}px;top:${2+lane*22}px;width:${right-left-4}px;background:${s.bg};color:${s.t};border-color:${s.b}${isPast?';opacity:.35':''}`;
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
      const modeIconHtml=tv.travel_mode==='plane'?'✈️ ':tv.travel_mode==='drive'?_CAR_SVG:'';
      const label=tv.destination?`${modeIconHtml}${escHtml(tv.name)} → ${escHtml(tv.destination)}`:`${modeIconHtml}${escHtml(tv.name)}`;
      const tripsEndsThisWeek=!ed||ed<=wkDss[6];
      const ban=addBanner(label,sd,ed,s,null,isPast);
      if(!ban)return;
      const tvSid='tv-'+tv.id;
      ban.dataset.tvid=String(tv.id);
      const del=document.createElement('button');del.className='ban-del';del.textContent='✕';
      del.addEventListener('click',e=>{e.stopPropagation();delTravel(tv.id);});
      ban.appendChild(del);
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

    // Set per-column padding and banner container height based on lanes used
    let maxLane=-1;
    colEls.forEach((c,i)=>{
      const ml=colLanes[i].size?Math.max(...colLanes[i]):-1;
      c.style.paddingTop=ml>=0?`${(ml+1)*22}px`:'0';
      if(ml>maxLane)maxLane=ml;
    });
    if(maxLane>=0)bannerEl.style.height=`${(maxLane+1)*22+4}px`;
  },10);

  // ── Render per-day columns ───────────────────────────────────────────────────
  const cols=document.getElementById('wkcCols');cols.innerHTML='';
  dates.forEach((date,di)=>{
    const ds=d2s(date);
    const col=document.createElement('div');col.className='wkc-col';
    col.dataset.ds=ds;

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
      if(wr){const rr=wr.getBoundingClientRect();if(e.clientX-rr.left<44||rr.right-e.clientX<44){col.classList.remove('drop-here');return;}}
      e.preventDefault();
      if(tvDragStart!==null){
        // Travel drag-select mode
        tvDragEnd=di;
        highlightTvDrag(dates);
      } else {
        col.classList.add('drop-here');showWkcEdges(false);
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
      if(dragId.startsWith('rec::')){
        const [,recId,origDate]=dragId.split('::');
        const r=st.recurring.find(x=>String(x.id)===String(recId));
        if(r&&ds!==origDate){
          const wkKey=origDate?getWkKey(wkOff):getWkKey(wkOff);
          if(!r._dateOverrides)r._dateOverrides={};
          const prevOverride=r._dateOverrides[wkKey];
          r._dateOverrides[wkKey]=ds;
          removeTBBlocksForDate(ds,{recId:r.id});
          save();dragId=null;renderAll();
          sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
          pushUndo(()=>{
            if(prevOverride)r._dateOverrides[wkKey]=prevOverride;
            else delete r._dateOverrides[wkKey];
            save();renderAll();
            sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
          },'Moved recurring task');
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
          sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
          pushUndo(()=>{
            if(prev)r._dateOverrides[wkKey]=prev;
            else delete r._dateOverrides[wkKey];
            save();renderAll();renderWkCal();
            sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
          },'Pinned weekly task to '+ds);
        }
        dragId=null;return;
      }
      // Shopping item dragged onto calendar
      if(dragId.startsWith('shop::')){
        const shopId=dragId.split('::')[1];
        const s=st.shopping.find(x=>String(x.id)===String(shopId));
        if(s){
          const prev=s.due_date;
          s.due_date=ds;
          removeTBBlocksForDate(ds,{shopId:s.id});
          save();dragId=null;renderAll();renderWkCal();
          sbReqNullable('PATCH','shopping_list',{due_date:ds},`?id=eq.${s.id}`);
          pushUndo(()=>{
            s.due_date=prev;save();renderAll();renderWkCal();
            sbReqNullable('PATCH','shopping_list',{due_date:prev||null},`?id=eq.${s.id}`);
          },'Assigned shopping item to '+ds);
        }
        dragId=null;return;
      }
      const t=st.tasks.find(x=>String(x.id)===String(dragId));
      if(t){
        const prev={due_date:t.due_date};
        const sid=String(t.id);
        const prevDs=(prev.due_date||'').split('T')[0];
        localOverrides[sid]={due_date:ds};pendingLocal.add(sid);save();
        t.due_date=ds;dragId=null;
        removeTBBlocksForDate(ds,{taskId:t.id,oldDs:prevDs});
        renderAll();
        pushUndo(()=>{
          t.due_date=prev.due_date;
          localOverrides[sid]={due_date:prev.due_date};pendingLocal.add(sid);save();
          renderAll();
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
    // Add shopping items assigned to this date
    const shopForDay=st.shopping.filter(s=>s.due_date===ds&&!s.done).map(s=>({id:'shop-cal-'+s.id,name:s.name+(s.store?' ('+s.store+')':''),category:'Shopping',due_date:ds,done:false,_shopId:s.id,_virtual:true,_type:'shop'}));
    const shopForDayDone=st.shopping.filter(s=>s.due_date===ds&&s.done).map(s=>({id:'shop-cal-done-'+s.id,name:s.name+(s.store?' ('+s.store+')':''),category:'Shopping',due_date:ds,done:true,_shopId:s.id,_virtual:true,_type:'shop'}));
    const undoneDay=sortTasksForDay([
      ...st.tasks.filter(t=>t.due_date&&t.due_date.split('T')[0]===ds&&!t.done),
      ...virtForDay,
      ...wrecForDay,
      ...shopForDay
    ],ds);
    const doneDay=[
      ...st.tasks.filter(t=>t.due_date&&t.due_date.split('T')[0]===ds&&t.done),
      ...virtForDayDone,
      ...wrecForDayDone,
      ...shopForDayDone
    ];
    let dayTasks=[...undoneDay,...doneDay];
    dayTasks.forEach(t=>{
      const ov=isOv(t.due_date)&&!t.done,imp=t.important&&!ov&&!t.done;
      const _chipCat=t._isWrec?'weekly_reset':(t._virtual&&t._recId?'recurring':t.category);
      const s=ov?OV:imp?IMP:gc(_chipCat);
      const chip=document.createElement('div');chip.className='chip'+(t.done?' done-chip':'');
      chip.style.cssText=`background:${s.bg};color:${s.t};border-color:${s.b}`;
      if(!t._virtual)chip.dataset.tid=String(t.id);
      else if(t._type==='shop')chip.dataset.tid='shop-cal-'+t._shopId;
      else if(t._isWrec)chip.dataset.tid='wrec-'+t._recId;
      else if(t._recId)chip.dataset.tid='rec-virt-'+t._recId;
      chip.draggable=true;
      chip.addEventListener('dragstart',e2=>{
        if(t._type==='shop'){dragId='shop::'+t._shopId;}
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
        if(t._type==='shop'){togShop(t._shopId,chk.checked);}
        else if(t._isWrec){togRec(t._recId,chk.checked);}
        else if(t._virtual){togRecVirt(t._recId,chk.checked,t._wkKey||getWkKey(wkOff));}
        else{toggleTask(t.id,chk.checked,'week');}
      });
      const nm=document.createElement('span');nm.className='chip-name';nm.innerHTML=tmIcon(t)+escHtml(t.name);
      // name click handled by chip click→selTask, dblclick→openEditTask
      chip.appendChild(chk);chip.appendChild(nm);
      chip.addEventListener('contextmenu',e=>{if(!t._virtual)showCtx(e,t.id);});
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
          const allChips=col?[...col.querySelectorAll('.chip[data-tid]')]:[...document.querySelectorAll('#moCal .mcell-t[data-tid]')];
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
      chip.addEventListener('dblclick',e=>{e.stopPropagation();if(!t._virtual)openEditTask(t.id);else tiDblRec(e,t._recId);});
      const dx=document.createElement('button');dx.className='chip-del';dx.textContent='✕';
      dx.title=t._type==='shop'?'Remove from calendar':t._isWrec?'Remove from calendar':t._virtual?'Delete recurring task':'Delete task';
      dx.addEventListener('click',e2=>{
        e2.stopPropagation();
        if(t._type==='shop'){
          const s=st.shopping.find(x=>String(x.id)===String(t._shopId));
          if(s){const prev=s.due_date;s.due_date=null;save();renderAll();renderWkCal();
            sbReqNullable('PATCH','shopping_list',{due_date:null},`?id=eq.${s.id}`);
            pushUndo(()=>{s.due_date=prev;save();renderAll();renderWkCal();sbReqNullable('PATCH','shopping_list',{due_date:prev||null},`?id=eq.${s.id}`);},'Removed from calendar');}
        } else if(t._isWrec){
          const r=st.recurring.find(x=>String(x.id)===String(t._recId));
          if(r&&r._dateOverrides){const wkKey=getWkKey(wkOff);const prev=r._dateOverrides[wkKey];
            delete r._dateOverrides[wkKey];save();renderAll();renderWkCal();
            sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
            pushUndo(()=>{if(!r._dateOverrides)r._dateOverrides={};r._dateOverrides[wkKey]=prev;save();renderAll();renderWkCal();sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));},'Removed from calendar');}
        } else if(t._virtual){skipRecVirtThisWk(t._recId,t._wkKey||getWkKey(wkOff));}
        else{delTask(t.id,e2);}
      });
      chip.appendChild(dx);
      col.appendChild(chip);
    });


    cols.appendChild(col);
  });
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
function showWkcEdges(show){
  document.getElementById('wkcEdgeL').classList.toggle('active',show);
  document.getElementById('wkcEdgeR').classList.toggle('active',show);
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
    const fl=e.clientX-r.left<EDGE,fr=r.right-e.clientX<EDGE;
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
    const fl=e.clientX-r.left<EDGE,fr=r.right-e.clientX<EDGE;
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
        sbReq('PATCH','recurring_tasks',{date_overrides:rec._dateOverrides},recQs(rec.id));
        pushUndo(()=>{if(prev)rec._dateOverrides[wkKey]=prev;else delete rec._dateOverrides[wkKey];save();renderAll();sbReq('PATCH','recurring_tasks',{date_overrides:rec._dateOverrides},recQs(rec.id));},'Moved to other week');
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
        sbReq('PATCH','recurring_tasks',{date_overrides:rec._dateOverrides},recQs(rec.id));
        pushUndo(()=>{if(prev)rec._dateOverrides[wkKey]=prev;else delete rec._dateOverrides[wkKey];save();renderAll();sbReq('PATCH','recurring_tasks',{date_overrides:rec._dateOverrides},recQs(rec.id));},'Moved to other week');
      }
      dragId=null;return;
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
        sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
        pushUndo(()=>{if(prev)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];save();renderAll();sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));},'Moved to other week');
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
        sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
        pushUndo(()=>{if(prev)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];save();renderAll();sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));},'Moved to other week');
      }
      dragId=null;return;
    }
    // Regular task
    const t=st.tasks.find(x=>String(x.id)===String(dragId));if(!t){dragId=null;return;}
    const prev={due_date:t.due_date};
    t.due_date=newDs;dragId=null;
    shiftWk(dir);renderAll();
    pushUndo(()=>{t.due_date=prev.due_date;renderAll();sbReq('PATCH','tasks',{due_date:prev.due_date},`?id=eq.${t.id}`);},'Moved to other week');
    await sbReq('PATCH','tasks',{due_date:newDs},`?id=eq.${t.id}`);
  });
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

// ── Weekly Reset card (only is_weekly_reset=true items due this week) ─────────
function renderRecOv(){
  const wkKey=getWkKey(wkOff);
  const items=st.recurring.filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&isWRecDueThisWeek(r,wkOff));
  const done=items.filter(r=>!!(r._doneByWk&&r._doneByWk[wkKey])).length;
  const pct=items.length?Math.round(done/items.length*100):0;
  const _rb=document.getElementById('recBadge');if(_rb)_rb.textContent=items.length-done;
  if(document.getElementById('recPL'))document.getElementById('recPL').textContent=done+'/'+items.length;const _recP=document.getElementById('recPct2');if(_recP)_recP.textContent=pct+'%';
  document.getElementById('recPB').style.width=pct+'%';
  const elReg=document.getElementById('recList');if(elReg)elReg.innerHTML='';
  function recOvOrder(r){
    const isPup=r.pup_related===true||r.pup_related==='true';
    if(isPup)return 10;
    const c=r.cadence||'weekly';
    return c==='weekly'?0:c==='biweekly'?1:c==='monthly'?2:3;
  }
  const sorted=[...items].sort((a,b)=>{
    const aDone=!!(a._doneByWk&&a._doneByWk[wkKey]),bDone=!!(b._doneByWk&&b._doneByWk[wkKey]);
    if(aDone&&!bDone)return 1;if(!aDone&&bDone)return -1;
    return recOvOrder(a)-recOvOrder(b);
  });
  function makePawEl(rid,isDone){
    const col=isDone?'#a3c41a':'rgba(255,255,255,.8)';
    const str=isDone?'#a3c41a':'rgba(180,170,210,.5)';
    const wrap=document.createElement('label');
    wrap.className='chk-wrap';
    wrap.style.cssText='cursor:pointer;flex-shrink:0';
    wrap.title='Toggle';
    wrap.innerHTML=`<svg viewBox="0 0 100 100" width="10" height="10" xmlns="http://www.w3.org/2000/svg" style="display:block"><ellipse cx="22" cy="18" rx="10" ry="12" fill="${col}" stroke="${str}" stroke-width="8"/><ellipse cx="46" cy="11" rx="10" ry="12" fill="${col}" stroke="${str}" stroke-width="8"/><ellipse cx="70" cy="14" rx="10" ry="12" fill="${col}" stroke="${str}" stroke-width="8"/><ellipse cx="85" cy="36" rx="9" ry="11" fill="${col}" stroke="${str}" stroke-width="8"/><path d="M18 58 Q14 42 28 36 Q46 28 68 34 Q82 40 82 56 Q80 76 50 82 Q20 76 18 58Z" fill="${col}" stroke="${str}" stroke-width="8"/></svg>`;
    wrap.addEventListener('click',e=>{e.stopPropagation();togRec(rid,!isDone);});
    wrap.addEventListener('mousedown',e=>e.stopPropagation());
    return wrap;
  }
  sorted.forEach(r=>{
    const rid=String(r.id);
    const isDone=!!(r._doneByWk&&r._doneByWk[wkKey]);
    const isPup=r.pup_related===true||r.pup_related==='true';
    const row=document.createElement('div');
    const virtId='rec-virt-'+rid;
    row.id='ti-'+virtId;
    row.className='ti'+(isDone?' done':'');
    row.style.cssText='cursor:pointer;break-inside:avoid';
    if(isPup){
      row.appendChild(makePawEl(rid,isDone));
    } else {
      const chkWrap1=document.createElement('label');chkWrap1.className='chk-wrap';chkWrap1.addEventListener('click',e=>e.stopPropagation());
      const chk=document.createElement('input');chk.type='checkbox';chk.className='chk';chk.checked=isDone;
      chk.addEventListener('change',function(){togRec(rid,this.checked);});
      chkWrap1.appendChild(chk);row.appendChild(chkWrap1);
    }
    const nm=document.createElement('span');nm.className='tn';
    if(isDone)nm.style.cssText='text-decoration:line-through;color:var(--muted)';
    nm.textContent=r.name;
    const del=document.createElement('button');del.className='delbtn';del.textContent='✕';
    del.addEventListener('mousedown',e=>e.stopPropagation());
    del.addEventListener('click',function(e){e.stopPropagation();unscheduleWRec(rid,getWkKey(wkOff));});
    row.addEventListener('click',e=>selTask(e,virtId));
    row.addEventListener('dblclick',function(e){
      if(e.target.closest('button'))return;
      e.stopPropagation();clearSelection();openRecEditModal(rid);
    });
    row.addEventListener('contextmenu',e=>showCtx(e,virtId,true,rid));
    row.draggable=true;
    row.addEventListener('dragstart',e=>{
      dragId='wrec::'+rid;e.dataTransfer.effectAllowed='move';
      row.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);
    });
    row.addEventListener('dragend',e=>{
      row.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);
    });
    row.appendChild(nm);row.appendChild(del);if(elReg)elReg.appendChild(row);
  });
  requestAnimationFrame(applySelHighlight);
}

// ── Unassigned badge ────────────────────────────────────────────────────────────
function renderUnassigned(){
  const ts=st.tasks.filter(t=>!t.due_date&&!t.done&&t.category!=='Long term');
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
  const ts=sortTasks(st.tasks.filter(t=>!t.due_date&&!t.done&&t.category!=='Long term'));
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
  if(dragId.startsWith('wrec::')||dragId.startsWith('rec::')){
    const recId=dragId.startsWith('wrec::')?dragId.split('::')[1]:dragId.split('::')[1];
    const r=st.recurring.find(x=>String(x.id)===String(recId));
    if(r){
      const wkKey=getWkKey(wkOff);
      if(!r._dateOverrides)r._dateOverrides={};
      const prev=r._dateOverrides[wkKey];
      r._dateOverrides[wkKey]=ds;
      dragId=null;save();renderAll();
      sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
      pushUndo(()=>{
        if(prev)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];
        save();renderAll();sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
      },'Assigned recurring to today');
    }
    dragId=null;return;
  }
  if(dragId.startsWith('shop::')){
    const shopId=dragId.split('::')[1];
    const s=st.shopping.find(x=>String(x.id)===String(shopId));
    if(s){
      const prev=s.due_date;
      s.due_date=ds;
      dragId=null;save();renderAll();
      sbReq('PATCH','shopping_list',{due_date:ds},`?id=eq.${s.id}`);
      pushUndo(()=>{s.due_date=prev;save();renderAll();sbReq('PATCH','shopping_list',{due_date:prev||null},`?id=eq.${s.id}`);},'Assigned shopping to today');
    }
    dragId=null;return;
  }
}

// ── Shop overview ──────────────────────────────────────────────────────────────
function _shopOvSort(arr){
  return[...arr].sort((x,y)=>(x.shop_order??9999)-(y.shop_order??9999));
}
function renderShopOv(){
  const shopSorted=_shopOvSort(st.shopping.filter(s=>!s.done));
  const container=document.getElementById('shopOv');
  container.innerHTML='';
  shopSorted.forEach(s=>{
    const el=document.createElement('div');
    el.className='ti';el.id='ti-shop-cal-'+s.id;
    el.innerHTML=
      `<label class="chk-wrap"><input type="checkbox" class="chk"${s.done?' checked':''}></label>`+
      `<span class="tn">${escHtml(s.name)}</span>`+
      `<span class="cpill" style="background:rgba(241,245,249,.9);color:#64748b;border-color:rgba(148,163,184,.25);flex-shrink:0">${escHtml(s.store||'')}</span>`+
      `<button class="delbtn">✕</button>`;
    el.addEventListener('click',e=>tiClickShop(e,s.id));
    el.addEventListener('dblclick',e=>tiDblShop(e,s.id));
    el.addEventListener('contextmenu',e=>showCtxShop(e,s.id));
    el.querySelector('.chk-wrap').addEventListener('click',e=>e.stopPropagation());
    el.querySelector('.chk').addEventListener('change',e=>togShop(s.id,e.target.checked));
    el.querySelector('.delbtn').addEventListener('click',e=>{e.stopPropagation();delShop(s.id);});
    el.addEventListener('mousedown',e=>{
      if(e.target.closest('.chk-wrap')||e.target.closest('.delbtn'))return;
      let dragging=false;
      const startY=e.clientY;
      const onMove=ev=>{
        const dy=ev.clientY-startY;
        if(!dragging&&Math.abs(dy)<5)return;
        if(!dragging)window.getSelection()?.removeAllRanges();
        dragging=true;
        ev.preventDefault();
        el.style.opacity='.4';
        const rows=[...document.querySelectorAll('#shopOv .ti')];
        rows.forEach(r=>r.classList.remove('shop-dov'));
        const over=rows.find(r=>{
          if(r===el)return false;
          const rc=r.getBoundingClientRect();
          return ev.clientY>=rc.top&&ev.clientY<=rc.bottom;
        });
        if(over)over.classList.add('shop-dov');
      };
      const onUp=()=>{
        document.removeEventListener('mousemove',onMove);
        document.removeEventListener('mouseup',onUp);
        el.style.opacity='';
        const rows=[...document.querySelectorAll('#shopOv .ti')];
        const target=rows.find(r=>r.classList.contains('shop-dov'));
        rows.forEach(r=>r.classList.remove('shop-dov'));
        if(dragging&&target){
          const targetId=target.id.replace('ti-shop-cal-','');
          const items=_shopOvSort(st.shopping.filter(x=>!x.done));
          const fi=items.findIndex(x=>String(x.id)===String(s.id));
          const ti=items.findIndex(x=>String(x.id)===String(targetId));
          if(fi>=0&&ti>=0){
            items.splice(ti,0,items.splice(fi,1)[0]);
            items.forEach((x,i)=>{x.shop_order=i;});
            renderShopOv();
            items.forEach(x=>sbReqNullable('PATCH','shopping_list',{shop_order:x.shop_order},`?id=eq.${x.id}`));
          }
        }
      };
      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    });
    container.appendChild(el);
  });
}

// ── Virtual recurring task row for This Week ─────────────────────────────────
function tRowWk(t){
  if(t._virtual){
    const s=gc(t._isWrec?'weekly_reset':'recurring');
    return`<div class="ti ${t.done?'done':''}" style="background:${s.bg}" id="ti-${t.id}" onclick="selTask(event,'${t.id}')" ondblclick="tiDblRec(event,'${t._recId}')" oncontextmenu="showCtx(event,'${t.id}',true,'${t._recId}')">
      <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="${t._isWrec?`togRec('${t._recId}',this.checked)`:`togRecVirt('${t._recId}',this.checked,'${t._wkKey||getWkKey(wkOff)}')`}"></label>
      <span class="tn">${t.name}</span>
      <span class="cpill" style="background:${s.bg};color:${s.t};border-color:${s.b}">Recurring</span>
      <span class="dlbl">${fmtD(t.due_date)}</span>
      <button class="delbtn" onclick="event.stopPropagation();${t._isWrec?`unscheduleWRec('${t._recId}','${t._wkKey||getWkKey(wkOff)}')`:`skipRecVirtThisWk('${t._recId}','${t._wkKey||getWkKey(wkOff)}')`}">✕</button>
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
  sbReq('PATCH','recurring_tasks',{done_by_week:r._doneByWk},recQs(recId));
  pushUndo(()=>{
    if(!r._doneByWk)r._doneByWk={};
    if(prev)r._doneByWk[wkKey]=true;else delete r._doneByWk[wkKey];
    st.blocks.filter(b=>String(b.recId)===String(recId)).forEach(b=>b._done=prev);
    save();renderToday();renderWkSummary();renderRecOv();renderWkCal();
    if(document.getElementById('tbGrid'))renderDayTB();
    sbReq('PATCH','recurring_tasks',{done_by_week:r._doneByWk},recQs(recId));
  },(done?'Checked':'Unchecked')+' recurring');
}

// ── Extra (travel/birthday) virtual row ──────────────────────────────────────
function tRowExtra(t){
  const s=gc(t.category);
  const sl=t.category.toLowerCase();
  const isTv=t._type==='travel';
  const sub=isTv&&t.end_date?` – ${fmtD(t.end_date)}`:'';
  return`<div class="ti ti-${sl}" style="background:${s.bg}" id="ti-${t.id}" onclick="selTask(event,'${t.id}')">
    <span class="tn" style="color:${s.t};font-weight:600">${t.name}</span>
    <span class="cpill" style="background:${s.bg};color:${s.t};border-color:${s.b}">${t.category}</span>
    <span class="dlbl">${fmtD(t.due_date)}${sub}</span>
    ${isTv?`<button class="delbtn" onclick="event.stopPropagation();delTravel('${t._srcId}')">✕</button>`:''}
  </div>`;
}

const _CAR_SVG=`<svg width="14" height="10" viewBox="0 0 24 16" fill="currentColor" style="display:inline-block;vertical-align:middle;margin-right:3px;margin-top:-2px"><path d="M22 9h-.8L18.9 4.1A2 2 0 0017.1 3H6.9a2 2 0 00-1.8 1.1L2.8 9H2a1 1 0 00-1 1v2a1 1 0 001 1h.8a2.5 2.5 0 004.4 0h9.6a2.5 2.5 0 004.4 0H22a1 1 0 001-1v-2a1 1 0 00-1-1zM6 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm12 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM4.4 9l2-4.5h11.2l2 4.5H4.4z"/></svg>`;
function tmIcon(t){if(!t||t._virtual)return '';if(t.travel_mode==='plane')return '✈️ ';if(t.travel_mode==='drive')return _CAR_SVG;return '';}

// ── Task row (overdue→imp→rest) ────────────────────────────────────────────────
function tRow(t,o={}){
  const ov=isOv(t.due_date)&&!t.done;
  const imp=t.important&&!ov&&!t.done;
  const s=ov?OV:imp?IMP:gc(t.category);
  const sl=ov?'ov':imp?'imp':slug(t.category);
  return`<div class="ti ${t.done?'done':''} ${ov?'ov-row':''} ${imp&&!ov?'imp-row':''}" style="${!ov&&!imp&&!o.noColor?`background:${s.bg}`:''}" id="ti-${t.id}" ${o.drag?`draggable="true" ondragstart="dStart(event,'${t.id}')" ondragend="dEnd(event)"`:''} onclick="selTask(event,'${t.id}')" ondblclick="tiDbl(event,'${t.id}')" oncontextmenu="showCtx(event,'${t.id}')">
    <label class="chk-wrap" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()"><input type="checkbox" class="chk" ${t.done?'checked':''} onchange="toggleTask('${t.id}',this.checked,'${o.drag?'wk':''}')"></label>
    <span class="tn">${tmIcon(t)}${t.name}</span>
    ${o.cat?`<span class="cpill" style="background:${s.bg};color:${s.t};border-color:${s.b}">${t.category||'?'}</span>`:''}
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
            row.dataset.tid=String(t.id);row.draggable=true;row.addEventListener('dragstart',e=>dStart(e,t.id));row.addEventListener('dragend',()=>row.classList.remove('dragging'));row.addEventListener('contextmenu',e=>showCtx(e,t.id));row.addEventListener('click',e=>selTask(e,t.id));
            const chkWrap=document.createElement('label');chkWrap.className='chk-wrap';chkWrap.addEventListener('click',e=>e.stopPropagation());const chk=document.createElement('input');chk.type='checkbox';chk.className='chk';chk.checked=!!t.done;chk.addEventListener('change',()=>toggleTask(t.id,chk.checked));chkWrap.appendChild(chk);row.appendChild(chkWrap);

            const nm=document.createElement('span');nm.className='kn';nm.textContent=t.name;nm.addEventListener('dblclick',e=>{e.stopPropagation();openEditTask(t.id);});row.appendChild(nm);
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
      row.dataset.tid=String(t.id);row.draggable=true;row.addEventListener('dragstart',e=>dStart(e,t.id));row.addEventListener('dragend',()=>row.classList.remove('dragging'));row.addEventListener('contextmenu',e=>showCtx(e,t.id));row.addEventListener('click',e=>selTask(e,t.id));
      const chkWrap=document.createElement('label');chkWrap.className='chk-wrap';chkWrap.addEventListener('click',e=>e.stopPropagation());const chk=document.createElement('input');chk.type='checkbox';chk.className='chk';chk.checked=!!t.done;chk.addEventListener('change',()=>toggleTask(t.id,chk.checked));chkWrap.appendChild(chk);row.appendChild(chkWrap);

      const nm=document.createElement('span');nm.className='kn';nm.textContent=t.name;nm.addEventListener('dblclick',e=>{e.stopPropagation();openEditTask(t.id);});row.appendChild(nm);
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
  const date=getDayDate(dayOff),ds=d2s(date);
  const lbl=document.getElementById('dayLbl');if(lbl)lbl.textContent=isDateToday(date)?`Today ${date.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`:date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const grid=document.getElementById('tbGrid');if(!grid)return;grid.innerHTML='';
  // Ensure tb-scroll allows drag events through
  const tbSc=document.getElementById('tbScroll');
  if(tbSc&&!tbSc._dragBound){tbSc._dragBound=true;tbSc.addEventListener('dragover',e=>e.preventDefault(),{passive:false});}
  const gut=document.createElement('div');gut.className='tb-gutter';
  const _dow=new Date(ds+'T00:00:00').getDay(),_isWkday=_dow>=1&&_dow<=5;
  HOURS.forEach(h=>{const l=document.createElement('div');l.className='tb-tlbl';l.textContent=h===12?'12p':h>12?`${h-12}p`:`${h}a`;if(_isWkday&&(h===8||h===16)){l.style.position='relative';const d=document.createElement('span');d.style.cssText='position:absolute;left:8px;top:5px;width:3px;height:3px;border-radius:50%;background:rgba(180,175,200,.4)';l.appendChild(d);}gut.appendChild(l);});
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
      if(t){const tds=(t.due_date||'').split('T')[0];if(tds&&tds!==ds&&!(isViewingToday&&isOv(t.due_date)&&!t.done))return false;}
    } else if(b.recId){
      const r=st.recurring.find(x=>String(x.id)===String(b.recId));
      if(!r)return false;
    } else {
      const t=st.tasks.find(x=>x.name===b.title);
      if(t){const tds=(t.due_date||'').split('T')[0];if(tds&&tds!==ds&&!(isViewingToday&&isOv(t.due_date)&&!t.done))return false;}
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
  const linkedRec=b.recId?st.recurring.find(x=>String(x.id)===String(b.recId)):null;
  const linkedShop=b.shopId?st.shopping.find(x=>String(x.id)===String(b.shopId)):null;
  // Derive done from linked item (authoritative) so stale block._done never causes mismatch
  if(linkedTask)b._done=!!linkedTask.done;
  else if(linkedRec)b._done=!!(linkedRec._doneByWk&&linkedRec._doneByWk[dsToWkKey(b.ds)]);
  else if(linkedShop)b._done=!!linkedShop.done;
  const isImp=linkedTask&&linkedTask.important&&!linkedTask.done;
  const recCat=linkedRec?(linkedRec.is_weekly_reset===true||linkedRec.is_weekly_reset==='true'?'weekly_reset':'recurring'):null;
  const effectiveCat=linkedTask?linkedTask.category:recCat||(b.cat||'Home');
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
  const _notesHtml=_notes?`<div class="tb-notes">${_notes.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`:'';
  el.innerHTML=`<div class="tb-row"><input type="checkbox" class="tb-chk" ${b._done?'checked':''}><span class="tb-bt">${b.title}</span>${_showTime?`<span class="tb-btime">${tStr(b.sm)}-${tStr(b.sm+b.dur)}</span>`:''}<button class="tb-bdel" onclick="delBlock('${b.id}',event)">✕</button></div>${_notesHtml}<div class="tb-resize" data-id="${b.id}"></div>`;
  const tbChk=el.querySelector('.tb-chk');
  if(tbChk)tbChk.addEventListener('change',function(e){
    e.stopPropagation();
    const checked=this.checked;
    b._done=checked;
    el.classList.toggle('done-block',b._done);
    sbUpdateBlock(b.id,{done:checked});
    if(b.taskId){
      toggleTask(b.taskId,checked,'tb');
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
  function _tbSelId(){const _r2=b.recId?st.recurring.find(x=>String(x.id)===String(b.recId)):null;const _isWr2=_r2&&(_r2.is_weekly_reset===true||_r2.is_weekly_reset==='true');return b.taskId?String(b.taskId):b.recId?(_isWr2?'wrec-':'rec-virt-')+b.recId:b.shopId?'shop-cal-'+b.shopId:null;}
  function _tbBlockSelId(bl){const r3=bl.recId?st.recurring.find(x=>String(x.id)===String(bl.recId)):null;const iw=r3&&(r3.is_weekly_reset===true||r3.is_weekly_reset==='true');return bl.taskId?String(bl.taskId):bl.recId?(iw?'wrec-':'rec-virt-')+bl.recId:bl.shopId?'shop-cal-'+bl.shopId:null;}
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
      if(tbDragging){save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbUpdateBlock(b.id,{start_minutes:b.sm});}
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
  el.innerHTML=`<div class="tb-row"><span class="tb-bt">${atb.label}</span>${_showTime?`<span class="tb-btime">${tStr(atb.sm)}-${tStr(atb.sm+atb.dur)}</span>`:''}<button class="tb-bdel atb-del" onclick="event.stopPropagation();delAutoTBForDay('${atb._atbId}','${ds}',${atb._ovId?`'${atb._ovId}'`:'null'})">✕</button></div>`;
  let atbDragging=false,atbOnMove=null,atbOnUp=null;
  el.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('atb-del'))return;
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
        if(atb._ovId){
          const ov=st.autoTBOverrides.find(o=>String(o.id)===atb._ovId);
          if(ov){ov.start_time=newStart;ov.end_time=newEnd;}
          sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:newStart,end_time:newEnd},`?id=eq.${atb._ovId}`);
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
    sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>b.id!==blk.id);
      r._dateOverrides=prevDateOv;
      sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
      sbDeleteBlock(blk.id);save();renderAll();renderRecOv();renderWeeklyPage();
    },'Added to time block');
    return;
  } else if(dragId.startsWith('shop::')){
    const shopId=dragId.split('::')[1];
    const s=st.shopping.find(x=>String(x.id)===String(shopId));
    if(!s){dragId=null;return;}
    const prevDue=s.due_date;
    s.due_date=ds;
    const blk={id:crypto.randomUUID(),title:s.name,ds,sm,dur:autoDur(s.name,'Shopping'),cat:'Shopping',shopId:String(s.id)};
    st.blocks.push(blk);dragId=null;save();renderAll();
    sbSaveBlock(blk);
    sbReq('PATCH','shopping_list',{due_date:ds},`?id=eq.${s.id}`);
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>b.id!==blk.id);
      s.due_date=prevDue;
      sbReq('PATCH','shopping_list',{due_date:prevDue||null},`?id=eq.${s.id}`);
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
    sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
    pushUndo(()=>{
      st.blocks=st.blocks.filter(b=>b.id!==blk.id);
      r._dateOverrides=prevDateOv;
      sbReq('PATCH','recurring_tasks',{date_overrides:r._dateOverrides},recQs(r.id));
      sbDeleteBlock(blk.id);save();renderAll();
    },'Added to time block');
    return;
  } else {
    const t=st.tasks.find(x=>String(x.id)===String(dragId));
    if(!t){dragId=null;return;}
    title=t.name;cat=t.category||'Home';taskId=String(t.id);
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
  let committed=false;
  async function commit(){
    if(committed)return; committed=true;
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
        save();
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
    if(e.key==='Escape'){committed=true;st.blocks=st.blocks.filter(x=>x.id!==blockId);save();renderDayTB();}
  });
  inp.addEventListener('blur',commit);
  // Focus after a tick so the element is in the DOM
  requestAnimationFrame(()=>{inp.focus();});
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
function onRU(){if(!resizing)return;const bid=resizing.id;resizing=null;save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();document.removeEventListener('mousemove',onRM);document.removeEventListener('mouseup',onRU);const b=st.blocks.find(x=>x.id===bid);if(b)sbUpdateBlock(bid,{duration_minutes:b.dur});}
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
function shiftDay(n){const fl=document.getElementById('dayFlash');fl.textContent=n>0?'→':'←';fl.classList.add('show');setTimeout(()=>fl.classList.remove('show'),300);dayOff+=n;renderDayTB();renderToday();}
function goToday(){dayOff=0;renderDayTB();renderToday();}
function shiftWk(n){wkOff+=n;renderWkSummary();renderWkCal();}
function goThisWk(){wkOff=0;renderWkSummary();renderWkCal();}
function openBModal(){document.getElementById('bModal').classList.add('open');}
function saveBlock(){
  const title=document.getElementById('bTitle').value.trim();if(!title)return;
  const[hh,mm]=document.getElementById('bStart').value.split(':').map(Number);
  const blk={id:crypto.randomUUID(),title,ds:d2s(getDayDate(dayOff)),sm:hh*60+(mm||0),dur:parseInt(document.getElementById('bDur').value),cat:document.getElementById('bCat').value};
  st.blocks.push(blk);document.getElementById('bTitle').value='';closeMod('bModal');save();renderDayTB();
  sbSaveBlock(blk);
  pushUndo(()=>{st.blocks=st.blocks.filter(b=>b.id!==blk.id);save();renderDayTB();sbDeleteBlock(blk.id);},'Added block');
}

