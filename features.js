// ── Cat-select helpers ──────────────────────────────────────────────────────────
function _catStyle(v){return CATS[(v||'').toLowerCase()]||{bg:'#f1f5f9',t:'#334155',b:'rgba(148,163,184,.2)'};}
function toggleCatDrop(id){const d=document.getElementById(id+'Drop');if(!d)return;const o=d.classList.contains('open');document.querySelectorAll('.cat-sel-drop.open').forEach(el=>el.classList.remove('open'));if(!o)d.classList.add('open');}
function _applyCatTrigger(id,v){const s=_catStyle(v);const tr=document.getElementById(id+'Trigger');if(tr){tr.style.background=s.bg;tr.style.color=s.t;tr.style.borderColor=s.b;}const lbl=document.getElementById(id+'Lbl');if(lbl)lbl.textContent=v;}
function pickCat(id,v){const inp=document.getElementById(id);if(inp)inp.value=v;_applyCatTrigger(id,v);const drop=document.getElementById(id+'Drop');if(drop)drop.classList.remove('open');const nameId=id==='tCat'?'tName':'qaName';const nm=document.getElementById(nameId);if(nm){nm.focus();const l=nm.value.length;nm.setSelectionRange(l,l);}}
function setCatSel(id,v){const inp=document.getElementById(id);if(inp)inp.value=v;_applyCatTrigger(id,v);}
const _CAT_OPT_LIST=[{v:'Home'},{v:'My work'},{v:'Work'},{v:'Social'},{v:'Long term'}];
function catSelHTML(id,def){const ds=_catStyle(def);const opts=_CAT_OPT_LIST.map(c=>{const s=_catStyle(c.v);return`<div class="cat-sel-opt" style="background:${s.bg};color:${s.t}" onclick="pickCat('${id}','${c.v}')">${c.v}</div>`;}).join('');return `<div class="cat-sel-wrap" id="${id}Wrap"><input type="hidden" id="${id}" value="${def}"><div class="cat-sel-trigger" id="${id}Trigger" style="background:${ds.bg};color:${ds.t};border-color:${ds.b}" onclick="toggleCatDrop('${id}')"><span id="${id}Lbl">${def}</span><span style="opacity:.5;font-size:9px;margin-left:2px">▾</span></div><div class="cat-sel-drop" id="${id}Drop">${opts}</div></div>`;}
document.addEventListener('click',e=>{if(!e.target.closest('.cat-sel-wrap'))document.querySelectorAll('.cat-sel-drop.open').forEach(d=>d.classList.remove('open'));});

// ── Quick-add popup ────────────────────────────────────────────────────────────
function openQA(ctx,btn,ds='',kcat=''){
  closeQA();qaCtx=ctx;qaDsTarget=ds;qaKCat=kcat;
  const p=document.getElementById('qaPopup');
  let title='Add Task',extra='';
  if(ctx==='pup'){
    title='Add Skill';
    const selStyle='width:100%;padding:5px 7px;border-radius:8px;border:1px solid var(--border);font-family:inherit;font-size:12px;background:rgba(255,255,255,.8);color:var(--text);outline:none';
    extra=`<div class="qa-field"><label>Pup</label><select id="qaPup" style="${selStyle}"><option value="Mochi">Mochi</option><option value="Sunny">Sunny</option></select></div>
    <div class="qa-field"><label>Level</label><select id="qaLevel" style="${selStyle}"><option value="">—</option><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select></div>
    <div class="qa-field"><label>Stage</label><select id="qaStage" style="${selStyle}"><option value="Not Started">Not Started</option><option value="In Progress">In Progress</option><option value="Mastered">Mastered</option></select></div>`;
  } else if(ctx==='shop'){
    title='Add Item';
    extra=`<div class="qa-field"><label>Store</label><input id="qaStore" list="storeList" placeholder="HEB, Ikea, Online…" style="width:100%;padding:5px 7px;border-radius:8px;border:1px solid var(--border);font-family:inherit;font-size:12px;background:rgba(255,255,255,.8);color:var(--text);outline:none" ><datalist id="storeList">${[...new Set(st.shopping.map(x=>x.store).filter(Boolean))].sort().map(s=>`<option value="${s}">`).join('')}<option value="HEB"><option value="Ikea"><option value="Online"><option value="Other"></datalist></div>`;
  } else if(ctx==='rec'){
    title='Add Recurring Task';extra='';
  } else {
    const def=ctx==='kanban'?kcat:'Home';
    const defaultDate=ctx==='today'?d2s(getDayDate(dayOff)):(ds||'');
    extra=`<div class="qa-field"><label>Category</label>${catSelHTML('qaCat',def)}</div>
    <div class="qa-field"><label>Due date <span style="opacity:.45">(optional)</span></label><input id="qaDue" type="date" value="${defaultDate}" style="width:100%;padding:5px 7px;border-radius:8px;border:1px solid var(--border);font-family:inherit;font-size:12px;background:rgba(255,255,255,.8);color:var(--text);outline:none"></div>
    <div class="qa-imp-row"><input type="checkbox" id="qaImp" style="width:13px;height:13px;cursor:pointer;accent-color:#eab308"><label for="qaImp">⭐ Important</label></div>
    <div class="qa-field" style="margin-top:6px"><label>Notes <span style="opacity:.45;font-weight:400">(optional)</span></label><textarea id="qaNotes" placeholder="Add notes…" style="resize:vertical;min-height:44px;width:100%;font-family:inherit;font-size:12px;padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,.6);color:var(--text);outline:none;box-sizing:border-box"></textarea></div>`;
  }
  document.getElementById('qaTitle').textContent=title;
  document.getElementById('qaExtra').innerHTML=extra;
  document.getElementById('qaName').placeholder=ctx==='pup'?'Skill name…':ctx==='shop'?'Item name…':'Task name…';
  document.getElementById('qaName').value='';
  p.classList.add('open');
  if(btn){const r=btn.getBoundingClientRect();let top=r.bottom+5,left=r.left,pw=270;if(left+pw>window.innerWidth-6)left=window.innerWidth-pw-6;if(top+340>window.innerHeight)top=r.top-344;p.style.top=top+'px';p.style.left=left+'px';p.style.transform='';}
  else{p.style.top='50%';p.style.left='50%';p.style.transform='translate(-50%,-50%)';}
  setTimeout(()=>document.getElementById('qaName').focus(),50);
}
function closeQA(){const p=document.getElementById('qaPopup');p.classList.remove('open');p.style.transform='';}
async function submitQA(){
  const n=document.getElementById('qaName').value.trim();if(!n){closeQA();return;}
  closeQA();
  if(qaCtx==='pup'){
    const pup=document.getElementById('qaPup')?.value||'Mochi';
    const level=document.getElementById('qaLevel')?.value||null;
    const stage=document.getElementById('qaStage')?.value||'Not Started';
    const s={id:'l-'+Date.now(),pup,skill:n,level:level||null,stage,focus:false,success_rate:null,next_step:null,comments:null};
    st.pup_skills.push(s);save();renderPupsPage();
    const sv=await sbReq('POST','pup_skills',{pup,skill:n,level:level||null,stage,focus:false});
    if(sv&&sv[0]){const i=st.pup_skills.findIndex(x=>x.id===s.id);if(i>-1)st.pup_skills[i]=sv[0];save();renderPupTable();}
    return;
  }
  if(qaCtx==='shop'){
    const store=(document.getElementById('qaStore')?.value||'').trim()||'Other';
    const s={id:'l-'+Date.now(),name:n,store,done:false};st.shopping.push(s);renderAll();
    let shopServerId=null;
    pushUndo(()=>{const rid=shopServerId||s.id;st.shopping=st.shopping.filter(x=>String(x.id)!==String(rid));renderAll();if(shopServerId)sbReq('DELETE','shopping_list',null,`?id=eq.${shopServerId}`);},'Added item');
    const sv=await sbReq('POST','shopping_list',{name:n,store,done:false});
    if(sv&&sv[0]){const i=st.shopping.findIndex(x=>x.id===s.id);if(i>-1)st.shopping[i]=sv[0];shopServerId=String(sv[0].id);save();}
    return;
  }
  if(qaCtx==='rec'){openWrRuleAddModal();return;}
  const cat=document.getElementById('qaCat')?.value||'Home';
  const due=document.getElementById('qaDue')?.value||null;
  const imp=document.getElementById('qaImp')?.checked||false;
  const notes=document.getElementById('qaNotes')?.value.trim()||null;
  let ds=due;
  if(!ds){if(qaCtx==='today')ds=d2s(getDayDate(dayOff));else if(qaCtx==='week')ds=d2s(getWkDates(wkOff)[0]);else if(qaCtx==='wkc')ds=qaDsTarget||null;else ds=null;}
  const t={id:'l-'+Date.now(),name:n,category:cat,due_date:ds,done:false,important:imp,notes:notes||null};
  st.tasks.push(t);renderAll();
  let taskServerId=null;
  pushUndo(()=>{const rid=taskServerId||t.id;st.tasks=st.tasks.filter(x=>String(x.id)!==String(rid));renderAll();if(taskServerId)sbReq('DELETE','tasks',null,`?id=eq.${taskServerId}`);},'Added task');
  const sv=await sbReq('POST','tasks',{name:n,category:cat,due_date:ds,done:false,important:imp,notes:notes||null});
  if(sv&&sv[0]){const i=st.tasks.findIndex(x=>x.id===t.id);if(i>-1){st.tasks[i]=sv[0];}taskServerId=String(sv[0].id);renderAll();}
}
document.addEventListener('click',e=>{
  const p=document.getElementById('qaPopup');if(!p.classList.contains('open'))return;
  if(!p.contains(e.target)&&!e.target.classList.contains('btn-plus')&&!e.target.classList.contains('wkc-add-btn'))closeQA();
});
document.addEventListener('click',e=>{
  const pop=document.getElementById('pupFilterPop');if(!pop||!pop.classList.contains('pfopen'))return;
  if(!pop.contains(e.target)&&!e.target.closest('th[ondblclick]'))pop.classList.remove('pfopen');
});

// ── Task CRUD ──────────────────────────────────────────────────────────────────
async function toggleTask(id,done,mode=''){
  const t=st.tasks.find(x=>String(x.id)===String(id));if(!t)return;const prev=t.done;t.done=done;
  const sid=String(id);pendingLocal.add(sid);
  // Sync linked TB blocks _done state
  if(st.blocks)st.blocks.filter(b=>String(b.taskId)===String(id)).forEach(b=>b._done=done);
  const rerender=()=>{
    if(mode==='wk'||mode==='week'){renderWkCal();renderWkSummary();renderToday();renderKanban();renderUnassigned();save();}
    else renderAll();
    if(document.getElementById('tbGrid'))renderDayTB();
  };
  rerender();
  const linkedBlocks=st.blocks?st.blocks.filter(b=>String(b.taskId)===String(id)):[];
  pushUndo(()=>{t.done=prev;pendingLocal.add(sid);if(st.blocks)st.blocks.filter(b=>String(b.taskId)===String(id)).forEach(b=>b._done=prev);rerender();sbReq('PATCH','tasks',{done:prev},`?id=eq.${id}`).then(()=>pendingLocal.delete(sid));linkedBlocks.forEach(b=>sbUpdateBlock(b.id,{done:prev}));},(done?'Checked':'Unchecked')+' task');
  await sbReq('PATCH','tasks',{done},`?id=eq.${id}`);
  pendingLocal.delete(sid);
  linkedBlocks.forEach(b=>sbUpdateBlock(b.id,{done}));
}
async function clearTaskDate(id,e){
  e&&e.stopPropagation();
  const t=st.tasks.find(x=>String(x.id)===String(id));if(!t||!t.due_date)return;
  const prev=t.due_date;
  const sid=String(id);
  // Store override immediately so sync can never bring the old date back
  localOverrides[sid]={due_date:null};
  pendingLocal.add(sid);
  save();
  t.due_date=null;renderAll();
  pushUndo(()=>{
    t.due_date=prev;
    localOverrides[sid]={due_date:prev};
    pendingLocal.add(sid);
    renderAll();
    sbReqNullable('PATCH','tasks',{due_date:prev},`?id=eq.${sid}`)
      .then(()=>{ delete localOverrides[sid]; pendingLocal.delete(sid); });
  },'Cleared date');
  // Fire PATCH — override stays until syncAll confirms DB has null
  await sbReqNullable('PATCH','tasks',{due_date:null},`?id=eq.${sid}`);
  // pendingLocal can be cleared now — localOverrides will protect on future syncs
  pendingLocal.delete(sid);
}
async function delTask(id,e){
  e&&e.stopPropagation();
  const t=st.tasks.find(x=>String(x.id)===String(id));if(!t)return;
  const copy={...t};
  // Remove from local state immediately so UI feels fast
  st.tasks=st.tasks.filter(x=>String(x.id)!==String(id));
  // Remove any time blocks linked to this task
  const linkedBlocks=st.blocks?st.blocks.filter(b=>String(b.taskId)===String(id)):[];
  if(st.blocks)st.blocks=st.blocks.filter(b=>String(b.taskId)!==String(id));
  renderAll();if(document.getElementById('tbGrid'))renderDayTB();save();
  // DELETE from DB first, then push undo — so undo always has clean DB state
  await sbReq('DELETE','tasks',null,`?id=eq.${id}`);
  linkedBlocks.forEach(b=>sbDeleteBlock(b.id));
  pushUndo(async()=>{
    // Re-insert into DB and get back the real id
    const sv=await sbReq('POST','tasks',{name:copy.name,category:copy.category,due_date:copy.due_date,done:copy.done,important:copy.important||false});
    if(sv&&sv[0]){
      st.tasks.push(sv[0]);
      // Restore linked blocks with new task id
      linkedBlocks.forEach(b=>{b.taskId=String(sv[0].id);if(st.blocks)st.blocks.push(b);sbSaveBlock(b);});
    } else {
      st.tasks.push(copy);
      linkedBlocks.forEach(b=>{if(st.blocks)st.blocks.push(b);sbSaveBlock(b);});
    }
    renderAll();if(document.getElementById('tbGrid'))renderDayTB();save();
  },'Deleted task');
}
function openTModal(cat=''){
  tMode='add';tId=null;
  document.getElementById('tMTitle').textContent='Add Task';document.getElementById('tSaveBtn').textContent='Add';
  document.getElementById('tName').value='';setCatSel('tCat',cat||'Home');
  document.getElementById('tDue').value=tPreDate||'';document.getElementById('tImp').checked=false;document.getElementById('tNotes').value='';tPreDate=null;
  document.getElementById('tModal').classList.add('open');setTimeout(()=>{const _el=document.getElementById('tName');if(_el){_el.focus();const _l=_el.value.length;_el.setSelectionRange(_l,_l);}},80);
}
function openEditTask(id){
  const t=st.tasks.find(x=>String(x.id)===String(id));if(!t)return;
  tMode='edit';tId=id;
  document.getElementById('tMTitle').textContent='Edit Task';document.getElementById('tSaveBtn').textContent='Save';
  document.getElementById('tName').value=t.name;setCatSel('tCat',t.category||'Home');
  document.getElementById('tDue').value=t.due_date||'';document.getElementById('tImp').checked=!!t.important;document.getElementById('tNotes').value=t.notes||'';
  document.getElementById('tModal').classList.add('open');setTimeout(()=>{const _el=document.getElementById('tName');if(_el){_el.focus();const _l=_el.value.length;_el.setSelectionRange(_l,_l);}},80);
}
async function saveTModal(){
  const n=document.getElementById('tName').value.trim();if(!n){closeMod('tModal');return;}
  const c=document.getElementById('tCat').value,d=document.getElementById('tDue').value.trim()||null,imp=document.getElementById('tImp').checked;
  const notes=document.getElementById('tNotes').value.trim()||null;
  closeMod('tModal');
  if(tMode==='edit'&&tId){
    const t=st.tasks.find(x=>String(x.id)===String(tId));if(!t)return;
    const prev={name:t.name,category:t.category,due_date:t.due_date,important:t.important,notes:t.notes};
    const stid=String(tId);
    localOverrides[stid]={name:n,category:c,due_date:d,important:imp};
    pendingLocal.add(stid);save();
    t.name=n;t.category=c;t.important=imp;t.notes=notes;
    if(t.due_date!==d){
      // Remove blocks on the old date since task is moving to a new date
      const oldDs=(t.due_date||'').split('T')[0];
      if(oldDs){const blksToKill=st.blocks.filter(b=>String(b.taskId)===stid&&b.ds===oldDs);blksToKill.forEach(b=>sbDeleteBlock(b.id));st.blocks=st.blocks.filter(b=>!(String(b.taskId)===stid&&b.ds===oldDs));}
    }
    t.due_date=d;renderAll();
    pushUndo(()=>{
      t.name=prev.name;t.category=prev.category;t.due_date=prev.due_date;t.important=prev.important;t.notes=prev.notes;
      localOverrides[stid]={...prev};pendingLocal.add(stid);renderAll();
      sbReqNullable('PATCH','tasks',{name:prev.name,category:prev.category,due_date:prev.due_date,important:prev.important,notes:prev.notes||null},`?id=eq.${stid}`)
        .then(()=>{ delete localOverrides[stid]; pendingLocal.delete(stid); });
    },'Edited task');
    await sbReqNullable('PATCH','tasks',{name:n,category:c,due_date:d,important:imp,notes:notes||null},`?id=eq.${stid}`);
    pendingLocal.delete(stid);
    // localOverrides[stid] stays until syncAll confirms DB matches
  } else {
    const t={id:'l-'+Date.now(),name:n,category:c,due_date:d,done:false,important:imp,notes};st.tasks.push(t);renderAll();
    pushUndo(()=>{st.tasks=st.tasks.filter(x=>x.id!==t.id);renderAll();sbReq('DELETE','tasks',null,`?id=eq.${t.id}`);},'Added task');
    const sv=await sbReq('POST','tasks',{name:n,category:c,due_date:d,done:false,important:imp,notes:notes||null});if(sv&&sv[0]){const i=st.tasks.findIndex(x=>x.id===t.id);if(i>-1)st.tasks[i]=sv[0];}
  }
}
async function addTask(){
  const n=document.getElementById('ntN').value.trim();if(!n)return;
  const c=document.getElementById('ntC').value,d=document.getElementById('ntD').value||null;
  const t={id:'l-'+Date.now(),name:n,category:c,due_date:d,done:false,important:false};st.tasks.push(t);renderAll();document.getElementById('ntN').value='';
  pushUndo(()=>{st.tasks=st.tasks.filter(x=>x.id!==t.id);renderAll();sbReq('DELETE','tasks',null,`?id=eq.${t.id}`);},'Added task');
  const sv=await sbReq('POST','tasks',{name:n,category:c,due_date:d,done:false});if(sv&&sv[0]){const i=st.tasks.findIndex(x=>x.id===t.id);if(i>-1)st.tasks[i]=sv[0];}
}

// ── Tasks page ─────────────────────────────────────────────────────────────────
function renderTasksPage(){
  const cf=document.getElementById('fCat')?.value||'',df=document.getElementById('fDone')?.value;
  let ts=[...st.tasks];if(cf)ts=ts.filter(t=>t.category===cf);if(df!==''&&df!==undefined)ts=ts.filter(t=>String(t.done)===df);
  ts=sortTasks(ts);
  document.getElementById('allList').innerHTML=ts.map(t=>tRow(t,{cat:true,due:true,...(!t.due_date&&{flag:true})})).join('');
}

// ── Recurring Tasks page ────────────────────────────────────────────────────────
function renderWeeklyPage(){
  renderRecurringPage();
  // Keep hidden compat elements in sync
  const wkKey=getWkKey(wkOff);
  const dueRules=(st.wrRules||[]).filter(r=>r.is_enabled!==false&&isWRRuleDueThisWeek(r,wkOff));
  const doneCount=dueRules.filter(r=>(st.wrOverrides||[]).some(o=>String(o.rule_id)===String(r.id)&&o.wk_key===wkKey&&o.override_type==='complete'&&o.done)).length;
  const total=dueRules.length;
  const pct=total?Math.round(doneCount/total*100):0;
  const elPL=document.getElementById('wrPL');if(elPL)elPL.textContent=doneCount+'/'+total;
  const elPct=document.getElementById('wrPct2');if(elPct)elPct.textContent=pct+'%';
  const elBar=document.getElementById('wrBar');if(elBar)elBar.style.width=pct+'%';
}

function renderRecurringPage(){
  const KNOWN=['weekly','biweekly','monthly'];
  const schTasks=st.recurring.filter(r=>!(r.is_weekly_reset===true||r.is_weekly_reset==='true'));
  ['weekly','biweekly','monthly','other'].forEach(cad=>{
    const isOther=cad==='other';
    const OTHER_CADS=['quarterly','biannual','annual'];
    const wrRules=(st.wrRules||[]).filter(r=>isOther?OTHER_CADS.includes(r.cadence):r.cadence===cad);
    renderRtWrGroup('rt-wr-'+cad, wrRules, cad);
    renderRtGroup('rt-sch-'+cad, isOther?schTasks.filter(r=>OTHER_CADS.includes(r.cadence)):schTasks.filter(r=>r.cadence===cad), cad);
  });
}

function wrRuleScheduleStr(rule){
  const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const NTHS=['1st','2nd','3rd','4th','Last'];
  const NTH_VALS=[1,2,3,4,-1];
  const cad=rule.cadence||'weekly';
  if(cad==='weekly')return DAYS[rule.day_of_week]??'—';
  if(cad==='biweekly')return (DAYS[rule.day_of_week]??'—')+' (biweekly)';
  if(cad==='monthly'){
    if(rule.monthly_rule_type==='nth_weekday'&&rule.monthly_nth!=null&&rule.monthly_weekday!=null){
      const ni=NTH_VALS.indexOf(rule.monthly_nth);
      return (NTHS[ni]??rule.monthly_nth)+' '+(DAYS[rule.monthly_weekday]??'—');
    }
    if(rule.monthly_rule_type==='date_of_month'&&rule.monthly_date!=null){
      const n=rule.monthly_date;
      return n+(n===1?'st':n===2?'nd':n===3?'rd':'th');
    }
    return 'Monthly';
  }
  return 'Manual';
}

function renderRtWrGroup(containerId, rules, cadence){
  const el=document.getElementById(containerId);if(!el)return;
  const cadLabel={weekly:'Weekly',biweekly:'Biweekly',monthly:'Monthly',other:'Other'}[cadence]||cadence;
  const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const thead=`<tr><th style="text-align:left">Name</th><th style="width:36px">Pup</th><th style="width:40px"></th></tr>`;
  let tbody='';
  rules.forEach(r=>{
    const rid=String(r.id);
    const isPup=r.pup_related===true||r.pup_related==='true';
    tbody+=`<tr class="rt-row" id="ti-rt-wrrule-${rid}"
      ondblclick="if(!event.target.closest('[data-pup]')&&!event.target.closest('.delbtn')&&!event.target.closest('.btn-xs')){event.stopPropagation();openWrEditModal('${rid}',null,'all');}"
      oncontextmenu="showWrRuleCtx(event,'${rid}',getWkKey(wkOff))"
      onclick="event.stopPropagation()">
      <td class="rt-editable">${esc(r.name)}${cadence==='other'?(()=>{const _KB=['weekly','biweekly','monthly'];const _CB={quarterly:'Q',biannual:'BA',annual:'A',bimonthly:'B',monthly:'M'};const _bl=_CB[r.cadence];return _bl?`<span style="float:right;font-size:9px;font-weight:700;letter-spacing:.3px;padding:1px 3px;border-radius:3px;background:rgba(0,0,0,.11);color:var(--subtle);margin-left:4px">${_bl}</span>`:''})():''}</td>
      <td data-pup="1" style="text-align:center;cursor:pointer;font-size:13px" onclick="event.stopPropagation();rtToggleWrPup('${rid}')" ondblclick="event.stopPropagation()" title="Toggle pup related">${isPup?'🐾':''}</td>
      <td onclick="event.stopPropagation()" ondblclick="event.stopPropagation()"><button class="delbtn" onclick="delWrRule('${rid}')">✕</button></td>
    </tr>`;
  });
  const tableHtml=rules.length
    ?`<table class="rt-tbl"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`
    :`<div style="padding:6px 4px;font-size:11px;color:var(--subtle);font-style:italic">None</div>`;
  el.innerHTML=`<div class="card" style="padding:8px 12px;box-shadow:none">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;padding:0 2px">
      <span style="font-size:12px;font-weight:800;color:var(--text)">${cadLabel}${rules.length?' <span style="opacity:.45;font-weight:400;font-size:11px">· '+rules.length+'</span>':''}</span>
      <button class="btn-plus" style="padding:0px 5px;font-size:10px;line-height:1.4" onclick="openWrRuleAddModal('${cadence==='other'?'quarterly':cadence}','wr')">+</button>
    </div>
    ${tableHtml}
  </div>`;
}

function rtToggleWrPup(rid){
  const rule=(st.wrRules||[]).find(r=>String(r.id)===String(rid));if(!rule)return;
  const prev=rule.pup_related;
  rule.pup_related=!(rule.pup_related===true||rule.pup_related==='true');
  renderRecurringPage();renderRecOv();
  sbReqSilent('PATCH','wr_recurring_rules',{pup_related:rule.pup_related},`?id=eq.${rid}`);
  pushUndo(()=>{rule.pup_related=prev;renderRecurringPage();renderRecOv();},'Toggled pup');
}

function delWrRule(rid){
  const rule=(st.wrRules||[]).find(r=>String(r.id)===String(rid));if(!rule)return;
  const prevRule={...rule};
  const sRid=String(rid);
  st.wrRules=st.wrRules.filter(r=>String(r.id)!==sRid);
  st.wrOverrides=(st.wrOverrides||[]).filter(o=>String(o.rule_id)!==sRid);
  sbReqSilent('DELETE','wr_recurring_rules',null,`?id=eq.${sRid}`);
  save();renderRecurringPage();renderRecOv();
  pushUndo(async()=>{
    const sv=await sbReqSilent('POST','wr_recurring_rules',{name:prevRule.name,cadence:prevRule.cadence,day_of_week:prevRule.day_of_week,starting_date:prevRule.starting_date,monthly_rule_type:prevRule.monthly_rule_type,monthly_nth:prevRule.monthly_nth,monthly_weekday:prevRule.monthly_weekday,monthly_date:prevRule.monthly_date,pup_related:prevRule.pup_related,notes:prevRule.notes,is_enabled:prevRule.is_enabled,sort_order:prevRule.sort_order},'');
    if(sv&&sv[0])st.wrRules.push(sv[0]);else st.wrRules.push(prevRule);
    save();renderRecurringPage();renderRecOv();
  },'Deleted WR rule');
}

function renderRtGroup(containerId, tasks, cadence){
  const el=document.getElementById(containerId);if(!el)return;
  const cadLabel={weekly:'Weekly',biweekly:'Biweekly',monthly:'Monthly',other:'Other'}[cadence]||cadence;
  const thead=`<tr><th style="width:120px;text-align:left">Name</th><th style="width:96px;text-align:center">Due On</th><th style="width:84px;text-align:right">Starting</th><th style="width:40px"></th></tr>`;
  let tbody='';
  tasks.forEach(r=>{
    const rid=String(r.id);
    const virtId='rec-virt-'+rid;
    const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const dayDisp=r.appears_on_date||'—';
    const _KB_RT=['weekly','biweekly','monthly'];const _CB_RT={quarterly:'Q',biannual:'BA',annual:'A',bimonthly:'B',monthly:'M'};
    const _rtBadge=(()=>{const _bl=!_KB_RT.includes(r.cadence)&&_CB_RT[r.cadence];return _bl?`<span style="float:right;font-size:9px;font-weight:700;letter-spacing:.3px;padding:1px 3px;border-radius:3px;background:rgba(0,0,0,.11);color:var(--subtle);margin-left:4px">${_bl}</span>`:''})();
    const tds=`<td class="rt-editable">${esc(r.name)}${cadence==='other'?_rtBadge:''}</td>
      <td class="rt-editable rt-meta" style="text-align:center" ondblclick="event.stopPropagation();rtDblEdit(this,'${rid}','appears_on_date')">${dayDisp}</td>
      <td class="rt-editable rt-meta" style="text-align:right" ondblclick="event.stopPropagation();rtDblEdit(this,'${rid}','starting_date')">${r.starting_date?fmtD(r.starting_date):'—'}</td>`;
    tbody+=`<tr class="rt-row" id="ti-rt-${rid}" onclick="selTask(event,'${virtId}')" ondblclick="if(!event.target.closest('.delbtn')&&!event.target.closest('.btn-xs')){event.stopPropagation();openRecEditModal('${rid}');}" oncontextmenu="showWrRuleCtx(event,'${rid}',getWkKey(wkOff))">
      ${tds}
      <td onclick="event.stopPropagation()" ondblclick="event.stopPropagation()"><button class="btn btn-xs btn-ghost" style="padding:1px 5px;font-size:10px;opacity:.55" onclick="duplicateRecDirect('${rid}')" title="Duplicate">⧉</button><button class="delbtn" onclick="delRec('${rid}')">✕</button></td>
    </tr>`;
  });
  const tableHtml=tasks.length
    ?`<table class="rt-tbl"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`
    :`<div style="padding:6px 4px;font-size:11px;color:var(--subtle);font-style:italic">None</div>`;
  el.innerHTML=`<div class="card" style="padding:8px 12px;box-shadow:none">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;padding:0 2px">
      <span style="font-size:12px;font-weight:800;color:var(--text)">${cadLabel}${tasks.length?' <span style="opacity:.45;font-weight:400;font-size:11px">· '+tasks.length+'</span>':''}</span>
      <button class="btn-plus" style="padding:0px 5px;font-size:10px;line-height:1.4" onclick="${cadence==='other'?`openWrRuleAddModal('quarterly','sch')`:`openRecModalForSection('scheduled','${cadence}')`}">+</button>
    </div>
    ${tableHtml}
  </div>`;
}

function rtDblEdit(td, rid, field){
  if(td.querySelector('input,select'))return;
  const r=st.recurring.find(x=>String(x.id)===String(rid));if(!r)return;
  const val=r[field]||'';
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const DAY_ADDED=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Previous Sunday','Previous Monday','Previous Saturday','Same day'];
  let widget;
  if(field==='name'){
    widget=document.createElement('input');widget.type='text';widget.value=val;
  } else if(field==='appears_on_date'){
    if(r.cadence==='monthly'){
      widget=document.createElement('input');widget.type='text';widget.value=val;widget.placeholder='e.g. 15 or 2nd Sunday';
    } else {
      widget=document.createElement('select');
      DAYS.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;if(d===val)o.selected=true;widget.appendChild(o);});
    }
  } else if(field==='starting_date'){
    widget=document.createElement('input');widget.type='date';widget.value=val;
  } else return;
  widget.className='rt-edit-input';
  const origHTML=td.innerHTML;
  td.innerHTML='';td.appendChild(widget);
  widget.focus();if(widget.tagName==='INPUT'&&widget.type==='text'){const _l=widget.value.length;widget.setSelectionRange(_l,_l);}
  function commit(){
    const newVal=widget.tagName==='SELECT'?widget.value:widget.value.trim();
    if(newVal!==String(val)){
      const prev=r[field];
      r[field]=newVal||null;
      renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();
      sbReq('PATCH','wr_recurring_rules',{[field]:r[field]},recQs(rid));
      pushUndo(()=>{r[field]=prev;renderRecOv();renderWeeklyPage();},'Edited '+field);
    } else {td.innerHTML=origHTML;}
  }
  widget.addEventListener('blur',commit);
  widget.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();widget.blur();}
    if(e.key==='Escape'){widget.removeEventListener('blur',commit);td.innerHTML=origHTML;}
  });
  if(widget.tagName==='SELECT')widget.addEventListener('change',()=>setTimeout(()=>widget.blur(),0));
}

function rtTogglePup(rid){
  const r=st.recurring.find(x=>String(x.id)===String(rid));if(!r)return;
  const prev=r.pup_related;
  r.pup_related=!(r.pup_related===true||r.pup_related==='true');
  renderRecOv();renderWeeklyPage();
  sbReq('PATCH','wr_recurring_rules',{pup_related:r.pup_related},recQs(rid));
  pushUndo(()=>{r.pup_related=prev;renderRecOv();renderWeeklyPage();},'Toggled pup');
}

function openRecModalForSection(type, cadence){
  if(type==='weekly_reset'){openWrRuleAddModal(cadence);return;}
  openRecModal(type);
  if(cadence&&cadence!=='other'){
    document.getElementById('recCadence').value=cadence;
    updateRecCadenceUI();
  }
}

async function addRecDirect(inputEl, cadence){
  const n=inputEl.value.trim();if(!n)return;
  inputEl.value='';
  const containerId=inputEl.id.replace(/^qa-/,'');
  const dayEl=document.getElementById('qa-day-'+containerId);
  const useCadence=cadence==='other'?'weekly':cadence;
  const appearsOn=cadence==='monthly'?(dayEl?dayEl.value:'1'):(cadence==='other'?'Friday':(dayEl?dayEl.value:'Friday'));
  const localId='rec-tmp-'+Date.now();
  const r={id:localId,name:n,is_weekly_reset:false,appears_on_date:appearsOn,starting_date:d2s(new Date()),cadence:useCadence,_doneByWk:{},_done:false,_dateOverrides:{}};
  st.recurring.push(r);save();renderWeeklyPage();renderWkSummary();renderWkCal();
  let serverId=null;
  pushUndo(()=>{const rid=serverId||localId;st.recurring=st.recurring.filter(x=>String(x.id)!==String(rid));save();renderWeeklyPage();renderWkSummary();renderWkCal();if(serverId)sbReq('DELETE','wr_recurring_rules',null,recQs(serverId));},'Added recurring task');
  const payload={name:n,is_weekly_reset:false,cadence:useCadence,appears_on_date:appearsOn,starting_date:r.starting_date};
  const sv=await sbReq('POST','wr_recurring_rules',payload);
  if(sv&&sv[0]){
    const i=st.recurring.findIndex(x=>x.id===localId);
    const entry={...sv[0],_doneByWk:{},_done:false,_dateOverrides:{}};
    if(i>-1)st.recurring[i]=entry;
    else if(!st.recurring.some(x=>String(x.id)===String(sv[0].id)))st.recurring.push(entry);
    serverId=String(sv[0].id);
    save();renderWeeklyPage();renderWkSummary();renderWkCal();
  }
}

async function duplicateRecDirect(rid){
  const r=st.recurring.find(x=>String(x.id)===String(rid));if(!r)return;
  const dupName=uniqueRecName(r.name);
  const todayDs=d2s(new Date());
  const tempId='rec-tmp-'+Date.now();
  const localCopy={...r,id:tempId,name:dupName,starting_date:todayDs,_doneByWk:{},_done:false,_dateOverrides:{}};
  st.recurring.push(localCopy);
  save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
  const payload={name:dupName,is_weekly_reset:r.is_weekly_reset||false,cadence:r.cadence||'weekly',starting_date:todayDs};
  if(r.appears_on_date)payload.appears_on_date=r.appears_on_date;
    const sv=await sbReq('POST','wr_recurring_rules',payload);
  if(sv&&sv[0]){
    const idx=st.recurring.findIndex(x=>x.id===tempId);
    if(idx>-1)st.recurring[idx]={...sv[0],_doneByWk:{},_done:false,_dateOverrides:{}};
    else if(!st.recurring.some(x=>String(x.id)===String(sv[0].id)))st.recurring.push({...sv[0],_doneByWk:{},_done:false,_dateOverrides:{}});
  } else {
    const idx=st.recurring.findIndex(x=>x.id===tempId);
    if(idx>-1)st.recurring[idx].id='rec-local-'+Date.now();
  }
  save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
  pushUndo(()=>{
    st.recurring=st.recurring.filter(x=>String(x.id)!==(sv&&sv[0]?String(sv[0].id):tempId));
    save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
    if(sv&&sv[0])sbReq('DELETE','wr_recurring_rules',null,recQs(sv[0].id));
  },'Duplicated recurring');
}
function togRec(id,done,wkKey){
  const r=st.recurring.find(x=>String(x.id)===String(id));
  if(!r)return;
  const prev=r._done;
  const prevByWk=r._doneByWk?{...r._doneByWk}:{};
  r._done=done;
  if(!r._doneByWk)r._doneByWk={};
  const wkKeyNow=wkKey||getWkKey(wkOff);
  if(done)r._doneByWk[wkKeyNow]=true;
  else delete r._doneByWk[wkKeyNow];
  const linkedRecBlocks=st.blocks.filter(b=>String(b.recId)===String(id));
  linkedRecBlocks.forEach(b=>{b._done=done;sbUpdateBlock(b.id,{done});});
  save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
  if(document.getElementById('tbGrid'))renderDayTB();
  sbReq('PATCH','wr_recurring_rules',{done_by_week:r._doneByWk},recQs(id));
  pushUndo(()=>{
    r._done=prev;
    r._doneByWk=prevByWk;
    st.blocks.filter(b=>String(b.recId)===String(id)).forEach(b=>{b._done=prev;sbUpdateBlock(b.id,{done:prev});});
    save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
    if(document.getElementById('tbGrid'))renderDayTB();
    sbReq('PATCH','wr_recurring_rules',{done_by_week:prevByWk},recQs(id));
  },(done?'Checked':'Unchecked')+' weekly reset task');
}
async function delRec(id){
  const sid=String(id);
  const copy=st.recurring.find(r=>String(r.id)===sid);if(!copy)return;
  deletedRecIds.add(sid);
  st.recurring=st.recurring.filter(r=>String(r.id)!==sid);
  save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
  if(document.getElementById('tbGrid'))renderDayTB();
  // DELETE from DB first, then undo is safe
  if(!sid.startsWith('rec-tmp-')&&!sid.startsWith('rec-local-'))await sbReq('DELETE','wr_recurring_rules',null,recQs(sid));
  // Keep sid in deletedRecIds until undo window expires, so sync can't resurrect it
  pushUndo(async()=>{
    deletedRecIds.delete(sid);save();
    const payload={name:copy.name,is_weekly_reset:copy.is_weekly_reset||false,cadence:copy.cadence||'weekly'};
    if(copy.appears_on_date)payload.appears_on_date=copy.appears_on_date;
    if(copy.starting_date)payload.starting_date=copy.starting_date;
    if(copy.repeat_date)payload.repeat_date=copy.repeat_date;
    const sv=await sbReq('POST','wr_recurring_rules',payload);
    st.recurring.push(sv&&sv[0]?{...sv[0],_doneByWk:copy._doneByWk||{},_done:copy._done||false}:copy);
    save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
  },'Deleted recurring task');
  // Note: don't clear deletedRecIds on expire — task is deleted from DB so sync
  // won't return it anyway. Only clear when undo is used (done inside undo fn above).
}
async function addRec(){
  openWrRuleAddModal();
}
function openRecModal(type='scheduled'){
  if(type==='weekly_reset'){openWrRuleAddModal();return;}
  document.getElementById('recMTitle').textContent='Add Scheduled Recurring Task';
  document.getElementById('recName').value='';
  document.getElementById('recType').value='scheduled';
  document.getElementById('recCadence').value='weekly';
  document.getElementById('recRepeatDay').value='Friday';
  const _da=document.getElementById('recDayAdded');if(_da)_da.value='Sunday';
  document.getElementById('recStartDate').value=d2s(new Date());
  const _pr=document.getElementById('recPupRelated');if(_pr)_pr.checked=false;
  updateRecTypeUI();
  document.getElementById('recModal').classList.add('open');
  setTimeout(()=>document.getElementById('recName').focus(),60);
}
function updateRecTypeUI(){
  updateRecCadenceUI();
  const isWr=document.getElementById('recType').value==='weekly_reset';
  const pf=document.getElementById('recPupField');if(pf)pf.style.display=isWr?'block':'none';
}
function updateRecCadenceUI(){
  const cad=document.getElementById('recCadence').value;
  const isMonthly=cad==='monthly';
  document.getElementById('recRepeatDayField').style.display=isMonthly?'none':'block';
  document.getElementById('recRepeatDateField').style.display=isMonthly?'block':'none';
  document.getElementById('recRepeatDayLabel').textContent=cad==='biweekly'?'Due on (every 2nd)':'Due on';
  if(isMonthly){
    const mode=document.querySelector('input[name="recMonthlyMode"]:checked')?.value||'dom';
    document.getElementById('recMonthlyDomField').style.display=mode==='dom'?'block':'none';
    document.getElementById('recMonthlyNwdField').style.display=mode==='nwd'?'flex':'none';
  }
}
async function saveRecModal(){
  const n=document.getElementById('recName').value.trim();if(!n){closeMod('recModal');return;}
  const type=document.getElementById('recType').value;
  if(type==='weekly_reset'){closeMod('recModal');openWrRuleAddModal();return;}
  const isWeekly=false;
  const cadence=document.getElementById('recCadence').value;
  const isMonthly=cadence==='monthly';
  let appearsOn;
  if(isMonthly){
    const mode=document.querySelector('input[name="recMonthlyMode"]:checked')?.value||'dom';
    if(mode==='nwd'){appearsOn=document.getElementById('recNthWd').value;}
    else{appearsOn=document.getElementById('recRepeatDate').value||'1';}
  } else {
    appearsOn=document.getElementById('recRepeatDay').value||'Friday';
  }
  const startDate=document.getElementById('recStartDate').value||null;
  const pupRelated=isWeekly&&!!(document.getElementById('recPupRelated')?.checked);
  const notes=document.getElementById('recNotes')?.value.trim()||null;
  closeMod('recModal');
  // Use rec-tmp- prefix so sync localPending keeps it if POST hasn't resolved yet
  const localId='rec-tmp-'+Date.now();
  const r={id:localId,name:n,is_weekly_reset:isWeekly,appears_on_date:appearsOn,starting_date:startDate,cadence,pup_related:pupRelated,notes,_doneByWk:{},_done:false,_dateOverrides:{}};
  st.recurring.push(r);save();renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();
  let recServerId=null;
  pushUndo(()=>{const rid=recServerId||localId;st.recurring=st.recurring.filter(x=>String(x.id)!==String(rid));save();renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();if(recServerId)sbReq('DELETE','wr_recurring_rules',null,recQs(recServerId));},'Added recurring task');
  const payload={name:n,is_weekly_reset:isWeekly,appears_on_date:appearsOn,cadence};
    if(startDate)payload.starting_date=startDate;
  if(pupRelated)payload.pup_related=true;
  if(notes)payload.notes=notes;
  const sv=await sbReq('POST','wr_recurring_rules',payload);
  if(sv&&sv[0]){
    const i=st.recurring.findIndex(x=>x.id===localId);
    const entry={...sv[0],_doneByWk:{},_done:false,_dateOverrides:{}};
    if(i>-1)st.recurring[i]=entry;
    else if(!st.recurring.some(x=>String(x.id)===String(sv[0].id)))st.recurring.push(entry);
    recServerId=String(sv[0].id);
    save();renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();
  }
}

// ── Shopping ───────────────────────────────────────────────────────────────────
function renderShopFull(){save();
  const mode=typeof shopSortMode!=='undefined'?shopSortMode:'store';
  const todo=st.shopping.filter(s=>!s.done),done=st.shopping.filter(s=>s.done);
  // Update count label
  const lbl=document.getElementById('shopCountLbl');
  if(lbl)lbl.textContent=todo.length?`Shopping (${todo.length} left)`:'Shopping ✓ All done!';
  let html='';
  if(mode==='alpha'){
    const all=[...todo,...done].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    html=all.map(s=>`<div class="ti ${s.done?'done':''}" id="ti-shop-cal-${s.id}" draggable="true" ondragstart="dragId='shop::${s.id}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);" ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);" onclick="tiClickShop(event,'${s.id}')" ondblclick="tiDblShop(event,'${s.id}')"><input type="checkbox" class="chk" ${s.done?'checked':''} onchange="togShop('${s.id}',this.checked)"><span class="tn">${s.name}</span><span class="cpill" style="background:rgba(241,245,249,.9);color:#64748b;border-color:rgba(148,163,184,.25);flex-shrink:0;margin-left:auto;margin-right:2px">${s.store||'Other'}</span><button class="delbtn" onclick="delShop('${s.id}')">✕</button></div>`).join('');
  } else {
    const g={};[...todo,...done].forEach(s=>{const k=s.store||'Other';if(!g[k])g[k]=[];g[k].push(s);});
    html=Object.entries(g).sort(([a],[b])=>a.localeCompare(b)).map(([store,items])=>
      `<div style="padding:5px 10px 2px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-top:2px">${store}</div>${items.map(s=>`<div class="ti ${s.done?'done':''}" id="ti-shop-cal-${s.id}" draggable="true" ondragstart="dragId='shop::${s.id}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);" ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);" onclick="tiClickShop(event,'${s.id}')" ondblclick="tiDblShop(event,'${s.id}')"><input type="checkbox" class="chk" ${s.done?'checked':''} onchange="togShop('${s.id}',this.checked)"><span class="tn">${s.name}</span><span class="cpill" style="background:rgba(241,245,249,.9);color:#64748b;border-color:rgba(148,163,184,.25);flex-shrink:0;margin-left:auto;margin-right:2px">${s.store||'Other'}</span><button class="delbtn" onclick="delShop('${s.id}')">✕</button></div>`).join('')}`
    ).join('');
  }
  const sf=document.getElementById('shopFull');if(sf)sf.innerHTML=html;
  renderShopOv();
}
// Remove shopping item from a specific view (clear due_date) but keep in shopping list and timeblocks
function unscheduleShop(id){
  const s=st.shopping.find(x=>String(x.id)===String(id));if(!s)return;
  const prev=s.due_date;s.due_date=null;
  const linkedBlocks=st.blocks?st.blocks.filter(b=>String(b.shopId)===String(id)):[];
  if(st.blocks)st.blocks=st.blocks.filter(b=>String(b.shopId)!==String(id));
  save();renderAll();
  linkedBlocks.forEach(b=>sbDeleteBlock(b.id));
  pushUndo(()=>{s.due_date=prev;linkedBlocks.forEach(b=>{if(st.blocks)st.blocks.push(b);sbSaveBlock(b);});save();renderAll();const _sid=String(id);pendingShopIds.add(_sid);sbReqNullable('PATCH','shopping_list',{due_date:prev||null},`?id=eq.${id}`).then(()=>pendingShopIds.delete(_sid));},'Removed shopping item from view');
  pendingShopIds.add(String(id));sbReqNullable('PATCH','shopping_list',{due_date:null},`?id=eq.${id}`).then(()=>pendingShopIds.delete(String(id)));
}
// Remove weekly reset task from a view by clearing its date override — keeps task active in weekly reset overview
function unscheduleWRec(rid,wkKey){
  const r=st.recurring.find(x=>String(x.id)===String(rid));if(!r||!r._dateOverrides)return;
  const prev=r._dateOverrides[wkKey];
  delete r._dateOverrides[wkKey];
  const linkedBlocks=st.blocks?st.blocks.filter(b=>String(b.recId)===String(rid)&&isInWk(b.ds,wkOff)):[];
  if(st.blocks)st.blocks=st.blocks.filter(b=>!(String(b.recId)===String(rid)&&isInWk(b.ds,wkOff)));
  save();renderAll();
  linkedBlocks.forEach(b=>sbDeleteBlock(b.id));
  pushUndo(()=>{
    if(!r._dateOverrides)r._dateOverrides={};
    r._dateOverrides[wkKey]=prev;
    linkedBlocks.forEach(b=>{if(st.blocks)st.blocks.push(b);sbSaveBlock(b);});
    save();renderAll();
    sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));
  },'Removed from view');
  sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));
}
function skipRecVirtThisWk(rid,wkKey){
  const r=st.recurring.find(x=>String(x.id)===String(rid));if(!r)return;
  // Safety: WR tasks must use unscheduleWRec, not __skip__
  if(r.is_weekly_reset===true||r.is_weekly_reset==='true'){unscheduleWRec(rid,wkKey);return;}
  if(!r._dateOverrides)r._dateOverrides={};
  const prev=r._dateOverrides[wkKey];
  r._dateOverrides[wkKey]='__skip__';
  const linkedBlocks=st.blocks?st.blocks.filter(b=>String(b.recId)===String(rid)&&isInWk(b.ds,wkOff)):[];
  if(st.blocks)st.blocks=st.blocks.filter(b=>!(String(b.recId)===String(rid)&&isInWk(b.ds,wkOff)));
  save();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
  if(document.getElementById('tbGrid'))renderDayTB();
  linkedBlocks.forEach(b=>sbDeleteBlock(b.id));
  sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));
  pushUndo(()=>{
    if(prev!==undefined)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];
    linkedBlocks.forEach(b=>{if(st.blocks)st.blocks.push(b);sbSaveBlock(b);});
    save();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
    if(document.getElementById('tbGrid'))renderDayTB();
    sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));
  },'Removed from week');
}
async function togShop(id,done){
  const s=st.shopping.find(x=>String(x.id)===String(id));if(!s)return;const prev=s.done;s.done=done;
  const linkedShopBlocks=st.blocks.filter(b=>String(b.shopId)===String(id));
  linkedShopBlocks.forEach(b=>{b._done=done;sbUpdateBlock(b.id,{done});});
  renderShopFull();renderToday();renderWkSummary();renderWkCal();
  if(document.getElementById('tbGrid'))renderDayTB();
  pushUndo(()=>{s.done=prev;st.blocks.filter(b=>String(b.shopId)===String(id)).forEach(b=>{b._done=prev;sbUpdateBlock(b.id,{done:prev});});renderShopFull();renderToday();renderWkSummary();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();sbReq('PATCH','shopping_list',{done:prev},`?id=eq.${id}`);},(done?'Checked':'Unchecked')+' item');
  await sbReq('PATCH','shopping_list',{done},`?id=eq.${id}`);
}
async function delShop(id){const s=st.shopping.find(x=>String(x.id)===String(id));if(!s)return;const copy={...s};st.shopping=st.shopping.filter(x=>String(x.id)!==String(id));renderShopFull();pushUndo(()=>{st.shopping.push(copy);renderShopFull();},'Deleted item');await sbReq('DELETE','shopping_list',null,`?id=eq.${id}`);}
async function addShopFull(){
  const n=document.getElementById('nsN').value.trim();if(!n)return;const s2=document.getElementById('nsS').value;
  const s={id:'l-'+Date.now(),name:n,store:s2,done:false};st.shopping.push(s);renderShopFull();document.getElementById('nsN').value='';
  const sv=await sbReq('POST','shopping_list',{name:n,store:s2,done:false});if(sv&&sv[0]){const i=st.shopping.findIndex(x=>x.id===s.id);if(i>-1)st.shopping[i]=sv[0];}
}

// ── Month modal ────────────────────────────────────────────────────────────────
let _moYrFilter=null;
let _moRecMap={};
function openMModal(){
  renderMoCal();
  scrollMoToday();
  const modal=document.getElementById('mModal');
  const bg=document.querySelector('.bg-canvas');if(bg)bg.classList.add('orbs-paused');
  requestAnimationFrame(()=>modal.classList.add('open'));
}
function moYearStep(dir){
  const cur=_moYrFilter!==null?_moYrFilter:new Date().getFullYear();
  jumpMoYear(String(cur+dir));
}
function jumpMoYear(yr){
  const parsed=parseInt(yr);
  _moYrFilter=(!yr||yr==='All'||isNaN(parsed))?null:parsed;
  const inp=document.getElementById('moYearSel');
  if(inp)inp.value=_moYrFilter!==null?String(_moYrFilter):'All';
  renderMoCal();
  if(_moYrFilter!==null){
    setTimeout(()=>{
      const mgrid=document.querySelector('#mModal .mgrid');
      const firstSep=[...document.querySelectorAll('#mCells .mo-sep')].find(s=>s.textContent.includes(String(_moYrFilter)));
      if(firstSep&&mgrid)mgrid.scrollTop=firstSep.offsetTop-mgrid.offsetTop-8;
    },30);
  }else{setTimeout(scrollMoToday,30);}
}
function shiftMo(n){moOff+=n;renderMoCal();}
function renderMoCal(){
  const today=tod();
  const todayDate=new Date(today);
  let weekStart,TOTAL;
  if(_moYrFilter!==null){
    const yrStart=new Date(_moYrFilter,0,1);
    const sd2=(yrStart.getDay()+6)%7;
    weekStart=new Date(yrStart);weekStart.setDate(yrStart.getDate()-sd2);
    const yrEnd=new Date(_moYrFilter,11,31);
    const ed2=(yrEnd.getDay()+6)%7;
    const wkMonEnd=new Date(yrEnd);wkMonEnd.setDate(yrEnd.getDate()-ed2);
    TOTAL=Math.round((wkMonEnd-weekStart)/(7*24*60*60*1000)/7)+1;
  }else{
    const PAST=8,FUTURE=26;TOTAL=PAST+FUTURE;
    const startDow=(todayDate.getDay()+6)%7;
    const thisMonday=new Date(todayDate);thisMonday.setDate(todayDate.getDate()-startDow);
    weekStart=new Date(thisMonday);weekStart.setDate(thisMonday.getDate()-PAST*7);
  }
  // Precompute non-WR recurring tasks map: ds → [virtual task, ...]
  _moRecMap={};
  const _rCurDow=(todayDate.getDay()+6)%7;
  const _rCurMon=new Date(todayDate);_rCurMon.setDate(todayDate.getDate()-_rCurDow);_rCurMon.setHours(0,0,0,0);
  for(let w=0;w<TOTAL;w++){
    const _rWkMon=new Date(weekStart);_rWkMon.setDate(weekStart.getDate()+w*7);
    const _rOff=Math.round((_rWkMon-_rCurMon)/(7*86400000));
    getRecurringWeekTasks(_rOff).forEach(t=>{if(!_moRecMap[t.due_date])_moRecMap[t.due_date]=[];_moRecMap[t.due_date].push(t);});
  }
  const dowEl=document.getElementById('mDow');
  if(!dowEl.children.length)['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(dn=>{const el=document.createElement('div');el.className='mdowl';el.textContent=dn;dowEl.appendChild(el);});
  const cells=document.getElementById('mCells');cells.innerHTML='';
  let curMo=-1;
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
      cells.appendChild(mkMCell(date,false,today));
    }
  }
  // Sync year dropdown
  const yrSel=document.getElementById('moYearSel');
  if(yrSel)yrSel.value=_moYrFilter!==null?String(_moYrFilter):'All';
  if(_moSearchQuery)setTimeout(()=>moSearch(_moSearchQuery),0);
  const mual=document.getElementById('mUAList');mual.innerHTML='';
  const CAT_ORDER=['Home','My work','Work','Social','Recurring'];
  const unassigned=st.tasks
    .filter(t=>!t.due_date&&!t.done&&t.category!=='Long term')
    .sort((a,b)=>{const ai=CAT_ORDER.indexOf(a.category),bi=CAT_ORDER.indexOf(b.category);return(ai<0?99:ai)-(bi<0?99:bi)||(a.name||'').localeCompare(b.name||'');});
  if(!unassigned.length){const empty=document.createElement('div');empty.style.cssText='font-size:10px;color:var(--subtle);padding:12px 8px;text-align:center';empty.textContent='All tasks assigned ✓';mual.appendChild(empty);}
  unassigned.forEach(t=>{
    const s=gc(t.category);
    const el=document.createElement('div');el.className='uitem';el.draggable=true;
    el.addEventListener('dragstart',e=>dStart(e,t.id));el.addEventListener('dragend',()=>el.style.opacity='');
    el.innerHTML=`<span class="udot" style="background:${s.d}"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px">${t.name}</span>`;
    mual.appendChild(el);
  });
}
function scrollMoToday(){
  const mgrid=document.querySelector('#mModal .mgrid');
  const tc=document.querySelector('#mCells .mcell.tc');
  if(tc&&mgrid){const mdow=document.getElementById('mDow');const mdowH=mdow?mdow.offsetHeight:0;mgrid.scrollTop=tc.offsetTop-mgrid.offsetTop-mdowH-8;}
}
function moGoToday(){
  if(_moYrFilter!==null){_moYrFilter=null;const yrSel=document.getElementById('moYearSel');if(yrSel)yrSel.value='All';renderMoCal();}
  setTimeout(scrollMoToday,30);
}
function mkMCell(date,om,today){
  const ds=d2s(date);const cell=document.createElement('div');
  cell.dataset.ds=ds;
  cell.className='mcell'+(om?' om':'')+(ds===today?' tc':'');
  // Header row with date + add btn
  const hdr=document.createElement('div');hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:2px';
  const dn=document.createElement('div');dn.className='mcell-n';dn.textContent=date.getDate();
  const addBtn=document.createElement('button');addBtn.style.cssText='background:none;border:none;cursor:pointer;font-size:11px;color:var(--subtle);padding:0 1px;line-height:1;border-radius:3px;opacity:0;transition:opacity .12s';addBtn.textContent='+';
  addBtn.addEventListener('click',e=>{e.stopPropagation();tPreDate=ds;openTModal();});
  cell.addEventListener('mouseenter',()=>addBtn.style.opacity='1');cell.addEventListener('mouseleave',()=>addBtn.style.opacity='0');
  hdr.appendChild(dn);hdr.appendChild(addBtn);cell.appendChild(hdr);
  const body=document.createElement('div');body.className='mcell-body';cell.appendChild(body);
  // Task chips — draggable
  const shopOnDay=st.shopping.filter(s=>s.due_date===ds&&!s.done).map(s=>({id:'shop-cal-'+s.id,name:s.name+(s.store?' ('+s.store+')':''),category:'Shopping',due_date:ds,done:false,_shopId:s.id,_virtual:true,_type:'shop'}));
  const shopOnDayDone=st.shopping.filter(s=>s.due_date===ds&&s.done).map(s=>({id:'shop-cal-done-'+s.id,name:s.name+(s.store?' ('+s.store+')':''),category:'Shopping',due_date:ds,done:true,_shopId:s.id,_virtual:true,_type:'shop'}));
  const wrecOnDay=st.recurring.filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&!r._done&&r._dateOverrides&&r._dateOverrides[getWkKey(0)]===ds).map(r=>({id:'rec-virt-'+r.id,name:r.name,category:'Recurring',due_date:ds,done:false,_recId:r.id,_virtual:true,_isWrec:true}));
  const recOnDay=(_moRecMap[ds]||[]).filter(t=>!t.done);
  const extras=getExtrasForDate(ds);
  const travelOnDay=extras.filter(t=>t._type==='travel');
  const undone=[...travelOnDay,...st.tasks.filter(t=>t.due_date&&t.due_date.split('T')[0]===ds&&!t.done),...extras.filter(t=>t._type!=='travel'),...shopOnDay,...wrecOnDay,...recOnDay];
  const done=[...st.tasks.filter(t=>t.due_date&&t.due_date.split('T')[0]===ds&&t.done),...shopOnDayDone];
  const tasks=[...undone,...done];
  tasks.slice(0,5).forEach(t=>{
    const s=t.important&&!t.done?IMP:gc((t._isWrec||t._isWrRule)?'weekly_reset':t.category);
    const isTravel=t._type==='travel';
    const isPast=isTravel&&t.end_date&&t.end_date<tod();
    const chip=document.createElement('div');chip.className='mcell-t';chip.draggable=!t.done;
    // Travel: compute visual span position to extend chip across cell gaps
    let travelSpanStyle='';
    let isVisualFirst=true,isVisualLast=true;
    if(isTravel){
      const dow=(new Date(ds+'T12:00:00').getDay()+6)%7; // 0=Mon,6=Sun
      isVisualFirst=t.due_date===ds||dow===0;
      isVisualLast=!t.end_date||t.end_date===ds||dow===6;
      // EXT bridges: cell padding(4)+border(1)+gap(3)+border(1)+padding(4) = 13px
      // Extend BOTH sides so chips fully overlap the gap from each direction
      const EXT=13;
      const leftExt=isVisualFirst?0:EXT;
      const rightExt=isVisualLast?0:EXT;
      const totalExt=leftExt+rightExt;
      const rl=isVisualFirst?'4px':'0';
      const rr=isVisualLast?'4px':'0';
      travelSpanStyle=`border-radius:${rl} ${rr} ${rr} ${rl};position:relative;z-index:1;`
        +(leftExt?`margin-left:-${leftExt}px;border-left:none;`:'')
        +(rightExt?`border-right:none;`:'')
        +(totalExt?`width:calc(100% + ${totalExt}px);`:'');
    }
    chip.style.cssText=`background:${s.bg};color:${s.t};border-color:${s.b};cursor:${t.done?'default':isTravel?'pointer':'grab'};${t.done?'opacity:.25;text-decoration:line-through;':''}${isPast?'opacity:.35;':''}${travelSpanStyle}`;
    if(!t._virtual&&!t._type)chip.dataset.tid=String(t.id);
    else if(isTravel)chip.dataset.tid='tv-'+t._srcId;
    else if(t._type==='shop')chip.dataset.tid='shop-cal-'+t._shopId;
    else if(t._isWrec)chip.dataset.tid='wrec-'+t._recId;
    else if(t._recId)chip.dataset.tid='rec-virt-'+t._recId;
    // Travel first cell shows label; all cells show delete button on hover
    if(isTravel&&!isVisualFirst){
      chip.innerHTML='<span style="flex:1"></span>';
    }else{
      chip.innerHTML=`<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tmIcon(t)}${escHtml(t.name)}</span>`;
      if(!isTravel){
        const _cw=document.createElement('label');_cw.className='chk-wrap';_cw.style.cssText='padding:2px 3px;margin:-2px -1px;flex-shrink:0';
        _cw.addEventListener('click',e=>e.stopPropagation());
        const _ck=document.createElement('input');_ck.type='checkbox';_ck.className='chk';_ck.style.cssText='width:8px;height:8px';_ck.checked=!!t.done;
        _ck.addEventListener('change',function(){
          if(t._isWrec)togRec(t._recId,this.checked);
          else if(t._recId)togRecVirt(t._recId,this.checked,dsToWkKey(ds));
          else if(t._type==='shop')togShop(t._shopId,this.checked);
          else if(!t._virtual)toggleTask(t.id,this.checked);
        });
        _cw.appendChild(_ck);chip.insertBefore(_cw,chip.firstChild);
      }
    }
    if(isTravel){
      const dx=document.createElement('button');dx.className='chip-del';dx.textContent='✕';
      dx.style.cssText='margin-right:2px';
      dx.addEventListener('click',e2=>{e2.stopPropagation();delTravel(t._srcId);});
      chip.appendChild(dx);
    }else{
      const dx=document.createElement('button');dx.className='chip-del';dx.textContent='✕';
      dx.addEventListener('click',e2=>{e2.stopPropagation();moChipDel(t,ds,e2);});
      chip.appendChild(dx);
    }
    chip.addEventListener('dragstart',e=>{e.stopPropagation();if(isTravel){dragId='travel::'+t._srcId+'::0';e.dataTransfer.effectAllowed='move';document.body.classList.add('body-dragging');}else{dStart(e,t.id);chip.style.opacity='.4';}});
    chip.addEventListener('dragend',()=>{document.body.classList.remove('body-dragging');if(isTravel){if(dragId&&dragId.startsWith('travel::'))dragId=null;}else chip.style.opacity='1';});
    chip.addEventListener('click',e=>{if(e.target.closest('.chip-del,.chk-wrap'))return;if(isTravel){e.stopPropagation();const tvSid='tv-'+t._srcId;selectedTasks.clear();selectedTasks.add(tvSid);lastSelectedId=tvSid;applySelHighlight();return;}const sid=chip.dataset.tid;if(!sid)return;selTask(e,sid);});
    chip.addEventListener('dblclick',e=>{e.stopPropagation();if(isTravel){openTravelModal(t._srcId);}else if(t._type==='shop')tiDblShop(e,t._shopId);else if(!t._virtual)tiDbl(e,t.id);else tiDblRec(e,t._recId);});
    chip.addEventListener('contextmenu',e=>{if(isTravel){e.preventDefault();e.stopPropagation();const tvSid='tv-'+t._srcId;selectedTasks.clear();selectedTasks.add(tvSid);lastSelectedId=tvSid;applySelHighlight();showCtx(e,null,false,null,null,null,t._srcId);}else if(t._type==='shop')showCtx(e,null,false,null,t._shopId);else if(t._isWrRule)showWrRuleCtx(e,String(t._ruleId),t._wkKey||getWkKey(wkOff));else if(t._isWrec||t._recId)showWrRuleCtx(e,String(t._recId),t._wkKey||getWkKey(wkOff));else if(!t._virtual)showCtx(e,t.id);});
    body.appendChild(chip);
  });
  if(tasks.length>5){const more=document.createElement('div');more.style.cssText='font-size:8px;color:var(--muted);cursor:pointer;padding:1px 2px;border-radius:3px';more.textContent=`+${tasks.length-5} more`;more.addEventListener('click',e=>{e.stopPropagation();showMcellMorePop(e,tasks,ds);});body.appendChild(more);}
  // Drop zone
  cell.addEventListener('dragover',e=>{e.preventDefault();cell.classList.add('dov');});
  cell.addEventListener('dragleave',()=>cell.classList.remove('dov'));
  cell.addEventListener('drop',async e=>{
    e.preventDefault();cell.classList.remove('dov');if(!dragId)return;
    if(dragId.startsWith('travel::')){
      const tvId=dragId.split('::')[1];
      const tv2=st.travel.find(x=>String(x.id)===String(tvId));
      if(tv2){const tvSd=(tv2.start_date||'').split('T')[0];const tvEd=(tv2.end_date||'').split('T')[0]||tvSd;const dur=Math.round((new Date(tvEd+'T00:00:00')-new Date(tvSd+'T00:00:00'))/86400000);const newStart=ds,newEnd=d2s(new Date(new Date(ds+'T00:00:00').getTime()+dur*86400000));const prevStart=tv2.start_date,prevEnd=tv2.end_date;tv2.start_date=newStart;tv2.end_date=newEnd;save();renderAll();renderMoCal();sbReq('PATCH','travel',{start_date:newStart,end_date:newEnd},`?id=eq.${tvId}`);pushUndo(()=>{tv2.start_date=prevStart;tv2.end_date=prevEnd;save();renderAll();renderMoCal();sbReq('PATCH','travel',{start_date:(prevStart||'').split('T')[0],end_date:(prevEnd||'').split('T')[0]},`?id=eq.${tvId}`);},'Moved trip');}
      dragId=null;return;
    }
    const t=st.tasks.find(x=>String(x.id)===String(dragId));
    if(dragId&&dragId.startsWith('wrec::')){
      const recId=dragId.split('::')[1];
      const r=st.recurring.find(x=>String(x.id)===String(recId));
      if(r){if(!r._dateOverrides)r._dateOverrides={};const wkKey=getWkKey(0);const prev=r._dateOverrides[wkKey];r._dateOverrides[wkKey]=ds;save();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));pushUndo(()=>{if(prev)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];save();renderAll();renderMoCal();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));},'Pinned weekly task');}
      dragId=null;renderAll();renderMoCal();return;
    }
    if(dragId&&dragId.startsWith('shop::')){
      const shopId=dragId.split('::')[1];
      const s=st.shopping.find(x=>String(x.id)===String(shopId));
      if(s){const prev=s.due_date;s.due_date=ds;save();sbReqNullable('PATCH','shopping_list',{due_date:ds},`?id=eq.${s.id}`);pushUndo(()=>{s.due_date=prev;save();renderAll();renderMoCal();sbReqNullable('PATCH','shopping_list',{due_date:prev||null},`?id=eq.${s.id}`);},'Assigned shopping item');}
      dragId=null;renderAll();renderMoCal();return;
    }
    if(t){const prev=t.due_date;const sid=String(t.id);localOverrides[sid]={due_date:ds};pendingLocal.add(sid);save();t.due_date=ds;dragId=null;renderAll();renderMoCal();pushUndo(()=>{t.due_date=prev;localOverrides[sid]={due_date:prev};pendingLocal.add(sid);save();renderAll();renderMoCal();sbReqNullable('PATCH','tasks',{due_date:prev},`?id=eq.${sid}`).then(()=>{delete localOverrides[sid];pendingLocal.delete(sid);});},'Moved task');sbReqNullable('PATCH','tasks',{due_date:ds},`?id=eq.${sid}`).then(()=>pendingLocal.delete(sid));return;}
    dragId=null;renderAll();renderMoCal();
  });
  // Double-click on cell (not chip) = add task
  cell.addEventListener('dblclick',e=>{if(e.target===cell||e.target===hdr||e.target===dn){tPreDate=ds;openTModal();}});
  // Mouse-drag to create travel spanning days
  cell.addEventListener('mousedown',e=>{
    if(e.button!==0)return;
    if(e.target.closest('.mcell-t,button'))return;
    calDrag={active:true,startDs:ds,endDs:ds,view:'mo',moved:false};
    cell.classList.add('travel-sel');
    e.preventDefault();
  });
  cell.addEventListener('mouseenter',()=>{
    if(!calDrag.active||calDrag.view!=='mo')return;
    if(ds!==calDrag.startDs)calDrag.moved=true;
    calDrag.endDs=ds;
    const s2=calDrag.startDs<=ds?calDrag.startDs:ds;
    const e2=calDrag.startDs<=ds?ds:calDrag.startDs;
    document.querySelectorAll('#mCells .mcell').forEach(c=>{
      c.classList.toggle('travel-sel',c.dataset.ds>=s2&&c.dataset.ds<=e2);
    });
  });
  return cell;
}
function moChipDel(t,ds,e){
  e&&e.stopPropagation();
  if(t._type==='shop'){
    const s=st.shopping.find(x=>String(x.id)===String(t._shopId));
    if(s){const prev=s.due_date;s.due_date=null;save();renderAll();renderMoCal();
      sbReqNullable('PATCH','shopping_list',{due_date:null},`?id=eq.${s.id}`);
      pushUndo(()=>{s.due_date=prev;save();renderAll();renderMoCal();sbReqNullable('PATCH','shopping_list',{due_date:prev||null},`?id=eq.${s.id}`);},'Removed from calendar');}
  } else if(t._isWrec){
    const r=st.recurring.find(x=>String(x.id)===String(t._recId));
    if(r){const wkKey=dsToWkKey(ds);if(!r._dateOverrides)r._dateOverrides={};const prev=r._dateOverrides[wkKey];
      delete r._dateOverrides[wkKey];save();renderAll();renderMoCal();
      sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
      pushUndo(()=>{if(!r._dateOverrides)r._dateOverrides={};r._dateOverrides[wkKey]=prev;save();renderAll();renderMoCal();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));},'Removed from calendar');}
  } else if(t._recId){
    const r=st.recurring.find(x=>String(x.id)===String(t._recId));
    if(r){const wkKey=dsToWkKey(ds);if(!r._dateOverrides)r._dateOverrides={};const prev=r._dateOverrides[wkKey];
      r._dateOverrides[wkKey]='__skip__';save();renderAll();renderMoCal();
      sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));
      pushUndo(()=>{if(prev!==undefined)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];save();renderAll();renderMoCal();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));},'Removed from calendar');}
  } else {
    delTask(t.id,e);renderMoCal();
  }
}
function showMcellMorePop(e,tasks,ds){
  document.querySelectorAll('.mcell-more-ov').forEach(p=>p.remove());
  const ov=document.createElement('div');ov.className='overlay mcell-more-ov';
  const dateObj=new Date(ds+'T12:00:00');
  const label=dateObj.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const modal=document.createElement('div');modal.className='modal task-modal';modal.style.cssText='width:280px;max-height:70vh;overflow-y:auto';
  modal.addEventListener('click',ev=>ev.stopPropagation());
  const title=document.createElement('div');title.className='mt';title.style.cssText='margin-bottom:10px';title.textContent=label;modal.appendChild(title);
  function closeMorePop(){ov.classList.remove('open');setTimeout(()=>ov.remove(),220);}
  tasks.forEach(t=>{
    const s=t.important&&!t.done?IMP:gc((t._isWrec||t._isWrRule)?'weekly_reset':t.category);
    const isTravel=t._type==='travel';
    const isPast=isTravel&&t.end_date&&t.end_date<tod();
    const chip=document.createElement('div');chip.className='mcell-t';chip.draggable=!t.done&&!isTravel;
    chip.style.cssText=`background:${s.bg};color:${s.t};border-color:${s.b};display:flex;align-items:center;gap:2px;margin-bottom:3px;cursor:${t.done?'default':isTravel?'pointer':'grab'};${t.done?'opacity:.25;text-decoration:line-through;':''}${isPast?'opacity:.35;':''}`;
    if(!t._virtual&&!t._type)chip.dataset.tid=String(t.id);
    else if(isTravel)chip.dataset.tid='tv-'+t._srcId;
    else if(t._type==='shop')chip.dataset.tid='shop-cal-'+t._shopId;
    else if(t._isWrec)chip.dataset.tid='wrec-'+t._recId;
    else if(t._recId)chip.dataset.tid='rec-virt-'+t._recId;
    chip.innerHTML=`<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tmIcon(t)}${escHtml(t.name)}</span>`;
    const mdx=document.createElement('button');mdx.className='chip-del';mdx.textContent='✕';
    mdx.addEventListener('click',e2=>{e2.stopPropagation();closeMorePop();if(isTravel)delTravel(t._srcId);else moChipDel(t,ds,e2);});
    chip.appendChild(mdx);
    chip.addEventListener('click',ev=>{if(ev.target.closest('.chip-del'))return;if(isTravel){closeMorePop();const tvSid='tv-'+t._srcId;selectedTasks.clear();selectedTasks.add(tvSid);lastSelectedId=tvSid;applySelHighlight();openTravelModal(t._srcId);return;}const sid=chip.dataset.tid;if(!sid)return;selTask(ev,sid);});
    chip.addEventListener('dblclick',ev=>{ev.stopPropagation();closeMorePop();if(isTravel){openTravelModal(t._srcId);}else if(t._type==='shop')tiDblShop(ev,t._shopId);else if(!t._virtual)tiDbl(ev,t.id);else tiDblRec(ev,t._recId);});
    chip.addEventListener('contextmenu',ev=>{if(isTravel){ev.preventDefault();ev.stopPropagation();closeMorePop();openTravelModal(t._srcId);}else if(t._type==='shop')showCtx(ev,null,false,null,t._shopId);else if(t._isWrRule)showWrRuleCtx(ev,String(t._ruleId),t._wkKey||getWkKey(wkOff));else if(t._isWrec||t._recId)showWrRuleCtx(ev,String(t._recId),t._wkKey||getWkKey(wkOff));else if(!t._virtual)showCtx(ev,t.id);});
    chip.addEventListener('dragstart',ev=>{ev.stopPropagation();dStart(ev,t.id);chip.style.opacity='.4';});
    chip.addEventListener('dragend',()=>{chip.style.opacity='1';});
    modal.appendChild(chip);
  });
  ov.appendChild(modal);
  document.body.appendChild(ov);
  ov.addEventListener('click',closeMorePop);
  const onKey=ev=>{if(ev.key==='Escape'||ev.key==='Enter'){closeMorePop();document.removeEventListener('keydown',onKey);}};
  document.addEventListener('keydown',onKey);
  ov.addEventListener('transitionend',()=>{if(!ov.classList.contains('open'))document.removeEventListener('keydown',onKey);},{once:true});
  requestAnimationFrame(()=>ov.classList.add('open'));
}

// ── Travel ────────────────────────────────────────────────────────────────────
let travelEditId=null;
function openTravelModal(id,preStart,preEnd){
  travelEditId=id||null;
  if(id){
    const tv=st.travel.find(x=>String(x.id)===String(id));if(!tv)return;
    document.getElementById('travelMTitle').textContent='Edit Trip';
    document.getElementById('tvName').value=tv.name||'';
    document.getElementById('tvDest').value=tv.destination||'';
    document.getElementById('tvStart').value=tv.start_date||'';
    document.getElementById('tvEnd').value=tv.end_date||'';
    document.getElementById('tvTravelMode').value=tv.travel_mode||'';
    document.getElementById('tvNotes').value=tv.notes||'';
  } else {
    document.getElementById('travelMTitle').textContent='Add Trip';
    document.getElementById('tvName').value='';document.getElementById('tvDest').value='';
    document.getElementById('tvStart').value=preStart||'';document.getElementById('tvEnd').value=preEnd||'';
    document.getElementById('tvTravelMode').value='';
    document.getElementById('tvNotes').value='';
  }
  document.getElementById('travelModal').classList.add('open');
  setTimeout(()=>{const _el=document.getElementById('tvName');if(_el){_el.focus();const _l=_el.value.length;_el.setSelectionRange(_l,_l);}},60);
}
async function saveTravelModal(){
  const name=document.getElementById('tvName').value.trim();if(!name){closeMod('travelModal');return;}
  const dest=document.getElementById('tvDest').value.trim()||null;
  const start=document.getElementById('tvStart').value||null;
  const end=document.getElementById('tvEnd').value||null;
  const tm=document.getElementById('tvTravelMode').value||null;
  const notes=document.getElementById('tvNotes').value.trim()||null;
  closeMod('travelModal');
  if(travelEditId){
    const tv=st.travel.find(x=>String(x.id)===String(travelEditId));if(!tv)return;
    const prev={name:tv.name,destination:tv.destination,start_date:tv.start_date,end_date:tv.end_date,travel_mode:tv.travel_mode,notes:tv.notes};
    Object.assign(tv,{name,destination:dest,start_date:start,end_date:end,travel_mode:tm,notes});
    renderAll();renderTravelPage();
    const _undoId=String(travelEditId);pushUndo(()=>{const _t=st.travel.find(x=>String(x.id)===_undoId);if(_t)Object.assign(_t,prev);renderAll();renderTravelPage();pendingTravelIds.add(_undoId);sbReq('PATCH','travel',prev,`?id=eq.${_undoId}`).then(()=>pendingTravelIds.delete(_undoId));},'Edited trip');
    const _tid=String(travelEditId);pendingTravelIds.add(_tid);
    await sbReq('PATCH','travel',{name,destination:dest,start_date:start,end_date:end,travel_mode:tm,notes},`?id=eq.${travelEditId}`);
    pendingTravelIds.delete(_tid);
  } else {
    const t={id:'l-'+Date.now(),name,destination:dest,start_date:start,end_date:end,travel_mode:tm,notes};
    st.travel.push(t);renderAll();renderTravelPage();
    const sv=await sbReq('POST','travel',{name,destination:dest,start_date:start,end_date:end,travel_mode:tm,notes});
    if(sv&&sv[0]){const i=st.travel.findIndex(x=>x.id===t.id);if(i>-1){st.travel[i]=sv[0];renderAll();renderTravelPage();}}
  }
}
async function delTravel(id){
  const tv=st.travel.find(x=>String(x.id)===String(id));if(!tv)return;
  const copy={...tv};
  const isLocal=String(id).startsWith('l-');
  st.travel=st.travel.filter(x=>String(x.id)!==String(id));renderAll();renderTravelPage();
  pushUndo(()=>{
    st.travel.push(copy);renderAll();renderTravelPage();
    if(!isLocal){
      sbReq('POST','travel',{name:copy.name,destination:copy.destination||null,start_date:copy.start_date||null,end_date:copy.end_date||null,notes:copy.notes||null})
        .then(sv=>{if(sv&&sv[0]){const i=st.travel.findIndex(x=>x.id===copy.id);if(i>-1)st.travel[i]=sv[0];}});
    }
  },'Deleted trip');
  if(!isLocal)await sbReq('DELETE','travel',null,`?id=eq.${id}`);
}
function renderTravelPage(){save();
  const s=gc('travel');
  const today2=tod();
  const sorted=[...st.travel]
    .filter(tv=>{const e=(tv.end_date||'').split('T')[0]||(tv.start_date||'').split('T')[0];return!e||e>=today2;})
    .sort((a,b)=>(a.start_date||'').localeCompare(b.start_date||''));
  document.getElementById('travelList').innerHTML=sorted.length
    ?sorted.map(tv=>`<div class="ti ti-travel">
        <span style="font-size:12px;flex-shrink:0">✈️</span>
        <span class="tn" onclick="openTravelModal('${tv.id}')" style="color:${s.t}">${tv.name}${tv.destination?' → '+tv.destination:''}</span>
        <span class="cpill" style="background:${s.bg};color:${s.t};border-color:${s.b}">Travel</span>
        <span class="dlbl">${tv.start_date?fmtD(tv.start_date):''}${tv.end_date?' – '+fmtD(tv.end_date):''}</span>
        <button class="delbtn" onclick="delTravel('${tv.id}')">✕</button>
      </div>`).join('')
    :'<div style="padding:14px;font-size:11px;color:var(--muted);text-align:center">No trips yet ✈️</div>';
}

// ── Birthdays ──────────────────────────────────────────────────────────────────
let bdayEditId=null;
function toggleBdayAddMenu(e){
  e.stopPropagation();
  const menu=document.getElementById('bdayAddMenu');
  if(!menu)return;
  if(menu.style.display!=='none'){menu.style.display='none';return;}
  menu.innerHTML=`<div class="bday-add-menu-item" onclick="closeBdayAddMenu();openBdayModal()">+ Add Birthday</div>
    <div class="bday-add-menu-fmt">
      <div class="bday-add-menu-fmt-title">Date Formats</div>
      <div class="bday-add-menu-fmt-row"><span class="bday-add-menu-fmt-eg">1/23</span><span>Jan 23 (no year)</span></div>
      <div class="bday-add-menu-fmt-row"><span class="bday-add-menu-fmt-eg">Jan 23</span><span>month name</span></div>
      <div class="bday-add-menu-fmt-row"><span class="bday-add-menu-fmt-eg">1/23/1990</span><span>with year</span></div>
      <div class="bday-add-menu-fmt-row"><span class="bday-add-menu-fmt-eg">Jan 23 1990</span><span>month + year</span></div>
    </div>`;
  const r=e.currentTarget.getBoundingClientRect();
  menu.style.display='block';
  menu.style.top=(r.bottom+6)+'px';
  menu.style.right=(window.innerWidth-r.right)+'px';
  menu.style.left='auto';
  setTimeout(()=>document.addEventListener('click',closeBdayAddMenu,{once:true}),0);
}
function closeBdayAddMenu(){const m=document.getElementById('bdayAddMenu');if(m)m.style.display='none';}
function openBdayModal(id,month){
  bdayEditId=id||null;
  const hint=document.getElementById('bdDateHint');if(hint)hint.textContent='';
  if(id){
    const b=st.birthdays.find(x=>String(x.id)===String(id));if(!b)return;
    document.getElementById('bdayMTitle').textContent='Edit Birthday';
    document.getElementById('bdName').value=b.name||'';
    document.getElementById('bdDate').value=_bdayEditFmt(b);
    document.getElementById('bdPresent').value='';
  } else {
    document.getElementById('bdayMTitle').textContent='Add Birthday';
    document.getElementById('bdName').value='';
    document.getElementById('bdDate').value=month?`${month}/`:'';
    document.getElementById('bdPresent').value='';
  }
  document.getElementById('bdayModal').classList.add('open');
  setTimeout(()=>{const _el=document.getElementById('bdName');if(_el){_el.focus();const _l=_el.value.length;_el.setSelectionRange(_l,_l);}},60);
}
async function saveBdayModal(){
  const name=document.getElementById('bdName').value.trim();if(!name){closeMod('bdayModal');return;}
  const raw=document.getElementById('bdDate').value;
  const bday=_normBdayDate(raw);
  const hint=document.getElementById('bdDateHint');
  if(!bday){if(hint)hint.textContent='Try 1/23, Jan 23, January 23, or MM/DD/YYYY.';if(hint)hint.style.color='#ef4444';return;}
  if(hint)hint.textContent='';
  const presentRaw=(document.getElementById('bdPresent').value||'').trim();
  closeMod('bdayModal');
  if(bdayEditId){
    bdaySnapshot();
    const b=st.birthdays.find(x=>String(x.id)===String(bdayEditId));if(!b)return;
    if(presentRaw){const list=_bdayPresentList(b);list.push(presentRaw);b.present_ideas=JSON.stringify(list);}
    Object.assign(b,{name,birthday:bday});renderAll();renderBdayPage();
    await sbReqNullable('PATCH','birthdays',{name,birthday:bday,...(presentRaw?{present_ideas:b.present_ideas}:{})},`?id=eq.${bdayEditId}`);
  } else {
    const present_ideas=presentRaw?JSON.stringify([presentRaw]):null;
    const b={id:'l-'+Date.now(),name,birthday:bday,...(present_ideas?{present_ideas}:{})};
    st.birthdays.push(b);renderAll();renderBdayPage();
    const sv=await sbReq('POST','birthdays',{name,birthday:bday,...(present_ideas?{present_ideas}:{})});
    if(sv&&sv[0]){const i=st.birthdays.findIndex(x=>x.id===b.id);if(i>-1){const local=st.birthdays[i];st.birthdays[i]={...sv[0],present_ideas:local.present_ideas||sv[0].present_ideas||null};}}
  }
}
async function delBday(id){
  bdaySnapshot();
  st.birthdays=st.birthdays.filter(x=>String(x.id)!==String(id));renderAll();renderBdayPage();
  if(String(id).startsWith('l-'))return;
  await sbReq('DELETE','birthdays',null,`?id=eq.${id}`);
}

// ── Birthday interaction state ─────────────────────────────────────────────────
let _bdaySelIds=new Set(),_lastBdaySelId=null,_copiedBdays=[],_bdayCtxId=null;
let _bdayUndoStack=[],_bdayRedoStack=[];
let _bdayPresentPopupId=null;

function bdaySnapshot(){
  _bdayUndoStack.push(JSON.parse(JSON.stringify(st.birthdays)));
  if(_bdayUndoStack.length>20)_bdayUndoStack.shift();
  _bdayRedoStack=[];
}
function _bdaySyncToServer(prev,next){
  const pm=new Map(prev.map(b=>[String(b.id),b]));
  const nm=new Map(next.map(b=>[String(b.id),b]));
  for(const[id]of pm)if(!nm.has(id)&&!id.startsWith('l-'))sbReqSilent('DELETE','birthdays',null,`?id=eq.${id}`);
  for(const[id,b]of nm){
    if(!pm.has(id)){sbReqSilent('POST','birthdays',{name:b.name,birthday:b.birthday,...(b.present_ideas?{present_ideas:b.present_ideas}:{})});}
    else if(!id.startsWith('l-')){
      const p=pm.get(id);
      if(['name','birthday','present_ideas'].some(f=>String(p[f]??'')!==String(b[f]??'')))
        sbReqSilent('PATCH','birthdays',{name:b.name,birthday:b.birthday,present_ideas:b.present_ideas??null},`?id=eq.${id}`);
    }
  }
}
function bdayUndo(){
  if(!_bdayUndoStack.length){showToast('Nothing to undo','#888');return;}
  const prev=JSON.parse(JSON.stringify(st.birthdays));
  _bdayRedoStack.push(prev);
  st.birthdays=_bdayUndoStack.pop();
  save();renderAll();renderBdayPage();
  showToast('Undone','#f97316',1500);
  _bdaySyncToServer(prev,st.birthdays);
}
function bdayRedo(){
  if(!_bdayRedoStack.length){showToast('Nothing to redo','#888');return;}
  const prev=JSON.parse(JSON.stringify(st.birthdays));
  _bdayUndoStack.push(prev);
  st.birthdays=_bdayRedoStack.pop();
  save();renderAll();renderBdayPage();
  showToast('Redone','#f97316',1500);
  _bdaySyncToServer(prev,st.birthdays);
}

function selBdayRow(e,id){
  if(e.target.closest('input,button,select'))return;
  e.stopPropagation();
  id=String(id);
  if(e.metaKey||e.ctrlKey){
    if(_bdaySelIds.has(id))_bdaySelIds.delete(id);else _bdaySelIds.add(id);
    _lastBdaySelId=id;
  } else if(e.shiftKey&&_lastBdaySelId){
    const rows=[...document.querySelectorAll('.bday-row[data-bid]')].map(r=>r.dataset.bid);
    const a=rows.indexOf(_lastBdaySelId),b=rows.indexOf(id);
    if(a>-1&&b>-1){const lo=Math.min(a,b),hi=Math.max(a,b);rows.slice(lo,hi+1).forEach(rid=>_bdaySelIds.add(rid));}
    else _bdaySelIds.add(id);
    _lastBdaySelId=id;
  } else {
    if(_bdaySelIds.size===1&&_bdaySelIds.has(id)){_bdaySelIds.clear();_lastBdaySelId=null;}
    else{_bdaySelIds.clear();_bdaySelIds.add(id);_lastBdaySelId=id;}
  }
  applyBdaySelHighlight();
}
function applyBdaySelHighlight(){
  document.querySelectorAll('.bday-row[data-bid]').forEach(row=>{
    row.classList.toggle('bday-sel',_bdaySelIds.has(row.dataset.bid));
  });
}
function showBdayCtx(e,id){
  e.preventDefault();e.stopPropagation();
  _bdayCtxId=String(id);
  if(!_bdaySelIds.has(_bdayCtxId)){_bdaySelIds.clear();_bdaySelIds.add(_bdayCtxId);_lastBdaySelId=_bdayCtxId;applyBdaySelHighlight();}
  const m=document.getElementById('bdayCtxMenu');
  const multi=_bdaySelIds.size>1;
  document.getElementById('bdayCtxEditItem').style.display=multi?'none':'';
  m.style.display='block';
  const x=Math.min(e.clientX,window.innerWidth-170),y=Math.min(e.clientY,window.innerHeight-130);
  m.style.left=x+'px';m.style.top=y+'px';
}
function hideBdayCtx(){document.getElementById('bdayCtxMenu').style.display='none';}
function bdayCtxEdit(){hideBdayCtx();if(_bdayCtxId)openBdayModal(_bdayCtxId);}
async function bdayCtxDuplicate(){
  hideBdayCtx();
  bdaySnapshot();
  const ids=_bdaySelIds.size?[..._bdaySelIds]:[_bdayCtxId].filter(Boolean);
  for(const id of ids){
    const b=st.birthdays.find(x=>String(x.id)===id);if(!b)continue;
    const copy={...b,id:'l-'+Date.now(),name:b.name+' (copy)'};
    st.birthdays.push(copy);
    const sv=await sbReq('POST','birthdays',{name:copy.name,birthday:copy.birthday,...(copy.present_ideas?{present_ideas:copy.present_ideas}:{})});
    if(sv&&sv[0]){const i=st.birthdays.findIndex(x=>x.id===copy.id);if(i>-1)st.birthdays[i]=sv[0];}
  }
  save();renderAll();renderBdayPage();
}
async function bdayCtxDelete(){
  hideBdayCtx();
  bdaySnapshot();
  const ids=_bdaySelIds.size?[..._bdaySelIds]:[_bdayCtxId].filter(Boolean);
  st.birthdays=st.birthdays.filter(x=>!ids.includes(String(x.id)));
  _bdaySelIds.clear();_bdayCtxId=null;
  save();renderAll();renderBdayPage();
  for(const id of ids)if(!id.startsWith('l-'))sbReqSilent('DELETE','birthdays',null,`?id=eq.${id}`);
}


function _bdayPresentList(b){try{return JSON.parse(b.present_ideas||'[]');}catch{return[];}}
// Returns MM-DD regardless of whether birthday is stored as MM-DD or YYYY-MM-DD
function _bdayMD(b){
  const bd=b.birthday||'';
  if(bd.length===5)return bd;        // legacy MM-DD
  if(bd.length===10)return bd.slice(5); // YYYY-MM-DD → MM-DD
  return '';
}
// True if birthday has a real birth year (not the 1900 sentinel and not legacy MM-DD)
function _bdayHasYear(b){const bd=b.birthday||'';return bd.length===10&&!bd.startsWith('1900-');}
// Normalize user-typed date string → always YYYY-MM-DD (1900 = no year sentinel)
function _normBdayDate(val){
  val=(val||'').trim();
  if(!val)return null;
  const noYr=(mm,dd)=>`1900-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  // YYYY-MM-DD passthrough
  if(/^\d{4}-\d{2}-\d{2}$/.test(val))return val;
  // Legacy MM-DD (already stored) → upgrade to 1900-MM-DD
  if(/^\d{2}-\d{2}$/.test(val))return`1900-${val}`;
  // M/D or M-D (no year) e.g. 1/23, 3/5
  const m1=val.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if(m1)return noYr(m1[1],m1[2]);
  // YYYY/M/D → YYYY-MM-DD
  const m2=val.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if(m2)return`${m2[1]}-${String(m2[2]).padStart(2,'0')}-${String(m2[3]).padStart(2,'0')}`;
  // M/D/YYYY → YYYY-MM-DD
  const m3=val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m3)return`${m3[3]}-${String(m3[1]).padStart(2,'0')}-${String(m3[2]).padStart(2,'0')}`;
  // M/D/YY → YYYY-MM-DD
  const m4=val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if(m4){const yr=parseInt(m4[3],10);return`${yr<=30?2000+yr:1900+yr}-${String(m4[1]).padStart(2,'0')}-${String(m4[2]).padStart(2,'0')}`;}
  // "Jan 23" / "January 23" / "Jan 23 1990" / "January 23, 1990"
  const MNAMES=['january','february','march','april','may','june','july','august','september','october','november','december'];
  const mn=val.toLowerCase().replace(/,/g,'');
  const mw=mn.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{2,4}))?$/);
  if(mw){
    let mo=MNAMES.findIndex(n=>n.startsWith(mw[1].slice(0,3)));
    if(mo>-1){const mm=String(mo+1).padStart(2,'0');const dd=String(mw[2]).padStart(2,'0');
      if(mw[3]){const yr=parseInt(mw[3],10);const full=yr<100?(yr<=30?2000+yr:1900+yr):yr;return`${full}-${mm}-${dd}`;}
      return noYr(mo+1,mw[2]);}
  }
  return null;
}
function _bdayEditFmt(b){
  if(!b.birthday)return'';
  const bd=b.birthday;
  if(bd.length===5){const[mo,dy]=bd.split('-').map(Number);return`${mo}/${dy}`;}
  const[yr,mo,dy]=bd.split('-').map(Number);
  if(yr===1900)return`${mo}/${dy}`;
  return`${mo}/${dy}/${String(yr).slice(2)}`;
}
function _bdayFmtDate(b){
  if(!b.birthday)return'';
  const bd=b.birthday;
  if(bd.length===5){const[mo,dy]=bd.split('-').map(Number);return`${mo}/${dy}`;}
  const[yr,mo,dy]=bd.split('-').map(Number);
  if(yr===1900)return`${mo}/${dy}`;  // sentinel — no year
  return`${mo}/${dy}/${yr}`;
}
function _bdayAge(b,forDate){
  if(!_bdayHasYear(b))return null;  // no real birth year
  const[yr]=b.birthday.split('-').map(Number);
  const occYear=parseInt((forDate||'').slice(0,4),10);
  if(!occYear||!yr)return null;
  return occYear-yr;
}
function toggleBdayPresents(id){
  const el=document.getElementById('bday-presents-'+id);if(!el)return;
  el.classList.toggle('open');
  if(el.classList.contains('open')){
    const inp=document.getElementById('bday-add-input-'+id);if(inp)setTimeout(()=>inp.focus(),60);
  }
}
function showBdayPresentTip(e,id){
  const b=st.birthdays.find(x=>String(x.id)===String(id));if(!b)return;
  const list=_bdayPresentList(b);if(!list.length)return;
  const t=document.getElementById('pupTooltip');
  t.innerHTML=list.map(p=>`• ${escHtml(p)}`).join('<br>');
  t.style.display='block';
  const x=Math.min(e.clientX+12,window.innerWidth-230),y=e.clientY-28;
  t.style.left=x+'px';t.style.top=y+'px';
}
function _renderBdayPresentPopup(pop,id){
  const b=st.birthdays.find(x=>String(x.id)===String(id));
  if(!b){pop.style.display='none';_bdayPresentPopupId=null;return;}
  const list=_bdayPresentList(b);
  pop.innerHTML=`<div style="font-size:10px;font-weight:700;color:#aaa;margin-bottom:7px;letter-spacing:.06em;text-transform:uppercase">Gift Ideas</div>`
    +(list.length?list.map((p,i)=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px"><span style="font-size:12px;flex:1;color:#444;line-height:1.3">${escHtml(p)}</span><button onclick="event.stopPropagation();delBdayPresent('${escHtml(id)}',${i})" style="background:none;border:none;cursor:pointer;font-size:10px;color:#ccc;padding:0 2px;flex-shrink:0" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#ccc'">✕</button></div>`).join('')
    :'<div style="font-size:11px;color:#bbb;margin-bottom:5px">No gift ideas yet</div>')
    +`<div style="display:flex;gap:4px;margin-top:7px;padding-top:7px;border-top:1px solid rgba(210,205,228,.3)"><input id="bdayPresPopInput" placeholder="Add gift idea…" style="flex:1;font-size:11px;padding:4px 7px;border:1px solid rgba(210,205,228,.5);border-radius:6px;outline:none;font-family:inherit;color:#444" onkeydown="if(event.key==='Enter'){event.stopPropagation();addBdayPresentFromPopup('${escHtml(id)}',this)}" onclick="event.stopPropagation()"><button onclick="event.stopPropagation();addBdayPresentFromPopup('${escHtml(id)}',document.getElementById('bdayPresPopInput'))" style="font-size:11px;padding:4px 9px;border-radius:6px;border:none;background:var(--accent);color:#fff;cursor:pointer;font-family:inherit;flex-shrink:0">Add</button></div>`;
}
function openBdayPresentPopup(e,id){
  hidePupTip();
  _bdayPresentPopupId=String(id);
  const pop=document.getElementById('bdayPresentPopup');if(!pop)return;
  _renderBdayPresentPopup(pop,id);
  pop.style.display='block';
  const btn=e.currentTarget;
  const rect=btn.getBoundingClientRect();
  const left=Math.min(rect.left,window.innerWidth-290);
  const top=Math.min(rect.bottom+4,window.innerHeight-200);
  pop.style.left=left+'px';pop.style.top=top+'px';
  setTimeout(()=>document.addEventListener('click',_closeBdayPresentPopupOutside,{once:true}),0);
}
function _closeBdayPresentPopupOutside(e){
  const pop=document.getElementById('bdayPresentPopup');
  if(pop&&pop.contains(e.target)){setTimeout(()=>document.addEventListener('click',_closeBdayPresentPopupOutside,{once:true}),0);return;}
  pop&&(pop.style.display='none');_bdayPresentPopupId=null;
}
async function addBdayPresentFromPopup(id,inp){
  const val=(inp.value||'').trim();if(!val)return;
  const b=st.birthdays.find(x=>String(x.id)===String(id));if(!b)return;
  bdaySnapshot();
  const list=_bdayPresentList(b);list.push(val);
  b.present_ideas=JSON.stringify(list);inp.value='';
  renderBdayPage();
  const pop=document.getElementById('bdayPresentPopup');
  if(pop&&pop.style.display!=='none'){_renderBdayPresentPopup(pop,id);setTimeout(()=>{const i=document.getElementById('bdayPresPopInput');if(i)i.focus();},30);}
  if(!String(id).startsWith('l-'))await sbReq('PATCH','birthdays',{present_ideas:b.present_ideas},`?id=eq.${id}`);
}
async function addBdayPresent(id,inp){
  const val=(inp.value||'').trim();if(!val)return;
  const b=st.birthdays.find(x=>String(x.id)===String(id));if(!b)return;
  bdaySnapshot();
  const list=_bdayPresentList(b);list.push(val);
  b.present_ideas=JSON.stringify(list);inp.value='';
  renderBdayPage();
  const el=document.getElementById('bday-presents-'+id);if(el){el.classList.add('open');}
  if(!String(id).startsWith('l-'))await sbReq('PATCH','birthdays',{present_ideas:b.present_ideas},`?id=eq.${id}`);
}
async function delBdayPresent(id,idx){
  const b=st.birthdays.find(x=>String(x.id)===String(id));if(!b)return;
  bdaySnapshot();
  const list=_bdayPresentList(b);list.splice(idx,1);
  b.present_ideas=JSON.stringify(list);
  renderBdayPage();
  const pop=document.getElementById('bdayPresentPopup');
  if(pop&&pop.style.display!=='none'&&String(_bdayPresentPopupId)===String(id))_renderBdayPresentPopup(pop,id);
  if(!String(id).startsWith('l-'))await sbReq('PATCH','birthdays',{present_ideas:b.present_ideas},`?id=eq.${id}`);
}
function renderBdayPage(){
  save();
  const today=tod();const todayMD=today.slice(5);
  const curYear=new Date().getFullYear();
  const curMonthIdx=new Date().getMonth();
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  // Group by month
  const byMonth=Array.from({length:12},()=>[]);
  [...st.birthdays].forEach(b=>{
    const md=_bdayMD(b);
    if(!md)return;
    const mo=parseInt(md.slice(0,2),10)-1;
    byMonth[mo].push(b);
  });
  byMonth.forEach(arr=>arr.sort((a,b)=>_bdayMD(a).localeCompare(_bdayMD(b))));

  function daysUntil(b){
    const md=_bdayMD(b);
    const isToday=md===todayMD;if(isToday)return 0;
    const isPast=md<todayMD;
    const nextDs=isPast?`${curYear+1}-${md}`:`${curYear}-${md}`;
    return Math.round((new Date(nextDs+'T12:00')-new Date(today+'T12:00'))/(1000*60*60*24));
  }
  function countdownHtml(b){
    const md=_bdayMD(b);
    if(md===todayMD)return`<span class="bday-countdown" style="background:rgba(249,115,22,.15);color:#c2410c;border-color:rgba(249,115,22,.3)">Today!</span>`;
    const days=daysUntil(b);
    if(days===1)return`<span class="bday-countdown" style="background:rgba(249,115,22,.1);color:#ea580c;border-color:rgba(249,115,22,.2)">Tmrw</span>`;
    if(days<=7)return`<span class="bday-countdown" style="background:rgba(234,179,8,.12);color:#a16207;border-color:rgba(234,179,8,.25)">${days}d</span>`;
    if(days<=30)return`<span class="bday-countdown" style="background:rgba(163,196,26,.1);color:#4a7c00;border-color:rgba(163,196,26,.2)">${days}d</span>`;
    return'';
  }
  function bdayRow(b){
    const md=_bdayMD(b);
    const isToday=md===todayMD;
    const isPast=md<todayMD;
    const presents=_bdayPresentList(b);
    const presentItems=presents.map((p,i)=>`<div class="bday-present-item"><span class="bday-present-dot"></span><span class="bday-present-text">${escHtml(p)}</span><button class="bday-present-del" onclick="delBdayPresent('${b.id}',${i})">✕</button></div>`).join('');
    const occDs=`${curYear}-${md}`;
    const age=_bdayAge(b,occDs);
    const ageHtml=age!==null?`<span class="bday-age-pill">${isPast?age:('turns '+age)}</span>`:'';
    const rightBadge=countdownHtml(b)||ageHtml||'<span></span>';
    const giftBtn=presents.length>0?`<button class="bday-gift-btn has-gifts" onclick="event.stopPropagation();openBdayPresentPopup(event,'${b.id}')" onmouseenter="showBdayPresentTip(event,'${b.id}')" onmouseleave="hidePupTip()">🎁 ${presents.length}</button>`:'';
    return`<div class="bday-row${isToday?' bday-today':''}${isPast?' bday-past':''}" id="bday-row-${b.id}" data-bid="${b.id}" onclick="selBdayRow(event,'${b.id}')" ondblclick="openBdayModal('${b.id}')" oncontextmenu="showBdayCtx(event,'${b.id}')">
      <div class="bday-name-cell"><span class="bday-name">${escHtml(b.name)}</span>${giftBtn}</div>
      ${rightBadge}
      <span class="bday-date-lbl">${_bdayFmtDate(b)}</span>
      <button class="bday-del-btn" onclick="event.stopPropagation();delBday('${b.id}')">✕</button>
    </div>`;
  }
  const content=document.getElementById('bdayPageContent');
  const countEl=document.getElementById('bdayCount');
  if(countEl)countEl.textContent=st.birthdays.length;
  if(!content)return;
  if(!st.birthdays.length){
    content.innerHTML='<div style="padding:28px;text-align:center;font-size:12px;color:var(--muted)">No birthdays added yet<br><br><button class="btn btn-dark" onclick="openBdayModal()" style="margin-top:4px">+ Add Birthday</button></div>';
    return;
  }
  const gridHtml=byMonth.map((items,mi)=>{
    const isCurrent=mi===curMonthIdx;
    return`<div class="bday-month-card${isCurrent?' bday-month-current':''}" ondblclick="if(!event.target.closest('.bday-row'))openBdayModal(null,${mi+1})">
      <div class="bday-month-name">${MONTHS[mi]}</div>
      ${items.length?`<div class="bday-tbl">${items.map(b=>bdayRow(b)).join('')}</div>`:'<div class="bday-month-empty"></div>'}
    </div>`;
  }).join('');
  content.innerHTML=`<div class="bday-grid">${gridHtml}</div>`;
  requestAnimationFrame(applyBdaySelHighlight);
  if(window._bdayOutsideClick)document.removeEventListener('click',window._bdayOutsideClick);
  window._bdayOutsideClick=ev=>{
    const pg=document.getElementById('page-birthdays');
    if(!pg||!pg.classList.contains('active'))return;
    if(!ev.target.closest('.bday-row')&&!ev.target.closest('#bdayCtxMenu')){_bdaySelIds.clear();_lastBdaySelId=null;applyBdaySelHighlight();}
  };
  document.addEventListener('click',window._bdayOutsideClick);
}

// ── Settings ───────────────────────────────────────────────────────────────────
async function testConn(){
  const url=document.getElementById('cfgUrl').value.trim(),key=document.getElementById('cfgKey').value.trim();
  const el=document.getElementById('cst');el.className='cst idle';el.textContent='Testing…';
  try{const r=await fetch(`${url}/rest/v1/tasks?limit=1`,{headers:{'apikey':key,'Authorization':`Bearer ${key}`}});const txt=await r.text();
    if(r.ok){el.className='cst ok';el.textContent='✅ Connected — '+JSON.parse(txt).length+' tasks';}
    else throw new Error(`HTTP ${r.status}: ${txt.slice(0,80)}`);
  }catch(e){el.className='cst err2';el.textContent=`❌ ${e.message}`;}
}
function saveSettings(){cfg.url=document.getElementById('cfgUrl').value.trim();cfg.key=document.getElementById('cfgKey').value.trim();save();syncAll();}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function closeSB(){sbOpen=false;document.getElementById('sidebar').classList.add('closed');document.getElementById('main').style.left='0';document.getElementById('menuOpen').classList.add('visible');document.querySelectorAll('.ov-topbar').forEach(el=>el.style.left='0');save();}
function openSB(){sbOpen=true;document.getElementById('sidebar').classList.remove('closed');document.getElementById('main').style.left='186px';document.getElementById('menuOpen').classList.remove('visible');document.querySelectorAll('.ov-topbar').forEach(el=>el.style.left='186px');save();}

// ── Pages ──────────────────────────────────────────────────────────────────────
const PAGES=['overview','weekly','shopping','travel','birthdays','settings','pups','finance','recipes','notes'];
// ══════════════════════════════════════════════════════════════════════════════
// ── RECIPES PAGE ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
let _recipeEditId=null,_rmIngredients=[],_panelIngredients=[];
let _selRecIds=new Set(),_lastSelRecId=null,_copiedRecs=[],_recCtxId=null;
let _recSortCol=null,_recSortDir=1,_recFilter=null;
let _recUndoStack=[],_recRedoStack=[],_recHdrClickTimer=null,_recUndoDirty=false;
let _recSearch='',_recMealFilter='',_recCuisineFilter='',_recTimeFilter='',_recFavFilter=false;
let _recPanelId=null;

function _recFields(r){
  return{name:r.name,meal_type:r.meal_type||null,cuisine:r.cuisine||null,time:r.time||null,servings:r.servings||null,notes:r.notes||null,favorite:!!r.favorite,ingredients:r.ingredients||null,instructions:r.instructions||null,source:r.source||null};
}
function recSnapshot(){_recUndoStack.push(JSON.parse(JSON.stringify(st.recipes)));if(_recUndoStack.length>20)_recUndoStack.shift();_recRedoStack=[];}
function _recSyncToServer(prev,next){
  const pm=new Map(prev.map(r=>[String(r.id),r]));
  const nm=new Map(next.map(r=>[String(r.id),r]));
  for(const[id]of pm)if(!nm.has(id)&&!id.startsWith('l-'))sbReqSilent('DELETE','recipes',null,`?id=eq.${id}`);
  for(const[id,r]of nm){
    if(!pm.has(id)){sbReqSilent('POST','recipes',_recFields(r));}
    else if(!id.startsWith('l-')){const p=pm.get(id);const flds=Object.keys(_recFields(r));if(flds.some(f=>String(p[f]??'')!==String(r[f]??'')))sbReqSilent('PATCH','recipes',_recFields(r),`?id=eq.${id}`);}
  }
}
function recUndo(){if(!_recUndoStack.length){showToast('Nothing to undo','#888');return;}const prev=JSON.parse(JSON.stringify(st.recipes));_recUndoDirty=true;_recRedoStack.push(prev);st.recipes=_recUndoStack.pop();save();renderRecipeTable();showToast('Undone','#f59e0b',1500);_recSyncToServer(prev,st.recipes);}
function recRedo(){if(!_recRedoStack.length){showToast('Nothing to redo','#888');return;}const prev=JSON.parse(JSON.stringify(st.recipes));_recUndoDirty=true;_recUndoStack.push(prev);st.recipes=_recRedoStack.pop();save();renderRecipeTable();showToast('Redone','#f59e0b',1500);_recSyncToServer(prev,st.recipes);}

// ── Ingredient list helpers ────────────────────────────────────────────────
function _parseIngredients(str){
  if(!str||!str.trim())return[];
  if(str.trim().startsWith('[')){try{const a=JSON.parse(str);if(Array.isArray(a))return a.map(x=>typeof x==='string'?{name:x,amount:''}:{name:x.name||'',amount:x.amount||''});}catch(e){}}
  return str.split('\n').map(s=>s.trim()).filter(Boolean).map(s=>({name:s,amount:''}));
}
function _serializeIngredients(arr){
  const clean=(arr||[]).filter(x=>(x.name||'').trim()||(x.amount||'').trim());
  if(!clean.length)return null;
  return JSON.stringify(clean.map(x=>({name:x.name.trim(),amount:(x.amount||'').trim()})));
}
function _flushIngInputs(){
  document.querySelectorAll('#rmIngList .rm-ing-row').forEach((row,i)=>{
    if(i<_rmIngredients.length){
      const a=row.querySelector('.rm-ing-amt'),n=row.querySelector('.rm-ing-name');
      if(a)_rmIngredients[i].amount=a.value;if(n)_rmIngredients[i].name=n.value;
    }
  });
}
function renderIngList(){
  const el=document.getElementById('rmIngList');if(!el)return;
  const _e=v=>(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  el.innerHTML=_rmIngredients.map((ing,i)=>`<div class="rm-ing-row" id="rmIngRow${i}"><div class="rm-ing-dot"></div><input class="rm-ing-amt" placeholder="amount" value="${_e(ing.amount)}" oninput="_rmIngredients[${i}].amount=this.value" onkeydown="rmIngKey(event,${i},'amt')"><input class="rm-ing-name" placeholder="ingredient" value="${_e(ing.name)}" oninput="_rmIngredients[${i}].name=this.value" onkeydown="rmIngKey(event,${i},'name')"><button type="button" class="rm-ing-del" onclick="rmIngDel(${i})" title="Remove">✕</button></div>`).join('');
}
function rmIngAdd(focusName){
  _flushIngInputs();_rmIngredients.push({name:'',amount:''});renderIngList();
  const i=_rmIngredients.length-1;
  setTimeout(()=>{const inp=document.querySelector(focusName?`#rmIngRow${i} .rm-ing-name`:`#rmIngRow${i} .rm-ing-amt`);if(inp)inp.focus();},20);
}
function rmIngDel(i){
  _flushIngInputs();_rmIngredients.splice(i,1);renderIngList();
  const prev=Math.max(0,i-1);
  setTimeout(()=>{const inp=_rmIngredients.length?document.querySelector(`#rmIngRow${prev} .rm-ing-name`):document.querySelector('.rm-ing-add-btn');if(inp)inp.focus();},20);
}
function rmIngKey(e,i,field){
  if(e.key==='Enter'){
    e.preventDefault();e.stopPropagation();
    if(field==='amt'){const n=document.querySelector(`#rmIngRow${i} .rm-ing-name`);if(n)n.focus();}
    else{_rmIngredients[i].name=e.target.value;rmIngAdd(false);}
  } else if(e.key==='Backspace'&&!e.target.value&&_rmIngredients.length>0){
    rmIngDel(i);
  } else if(e.key==='ArrowUp'&&i>0){
    e.preventDefault();const p=document.querySelector(`#rmIngRow${i-1} .rm-ing-name`);if(p)p.focus();
  } else if(e.key==='ArrowDown'){
    e.preventDefault();
    if(i<_rmIngredients.length-1){const n=document.querySelector(`#rmIngRow${i+1} .rm-ing-amt`);if(n)n.focus();}
    else{const btn=document.querySelector('.rm-ing-add-btn');if(btn)btn.focus();}
  }
}

function openRecipeAddModal(){
  _recipeEditId=null;
  document.getElementById('recipeMTitle').textContent='Add Recipe';
  ['rmName','rmMealType','rmCuisine','rmTime','rmServings','rmNotes','rmInstructions'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  _rmIngredients=[];renderIngList();
  document.getElementById('recipeModal').classList.add('open');
  setTimeout(()=>document.getElementById('rmName').focus(),80);
}
function openRecipeEditModal(id){
  const r=st.recipes.find(x=>String(x.id)===String(id));if(!r)return;
  _recipeEditId=id;
  document.getElementById('recipeMTitle').textContent='Edit Recipe';
  document.getElementById('rmName').value=r.name||'';
  document.getElementById('rmMealType').value=r.meal_type||'';
  document.getElementById('rmCuisine').value=r.cuisine||'';
  document.getElementById('rmTime').value=r.time||'';
  document.getElementById('rmServings').value=r.servings||'';
  document.getElementById('rmNotes').value=r.notes||'';
  document.getElementById('rmInstructions').value=r.instructions||'';
  _rmIngredients=_parseIngredients(r.ingredients);renderIngList();
  document.getElementById('recipeModal').classList.add('open');
  setTimeout(()=>{const _el=document.getElementById('rmName');if(_el){_el.focus();const _l=_el.value.length;_el.setSelectionRange(_l,_l);}},80);
}
async function saveRecipeModal(){
  const name=document.getElementById('rmName').value.trim();
  if(!name){showToast('Recipe name required');return;}
  _flushIngInputs();
  const data={
    name,
    meal_type:document.getElementById('rmMealType').value||null,
    cuisine:document.getElementById('rmCuisine').value.trim()||null,
    time:parseInt(document.getElementById('rmTime').value)||null,
    servings:parseInt(document.getElementById('rmServings').value)||null,
    notes:document.getElementById('rmNotes').value.trim()||null,
    ingredients:_serializeIngredients(_rmIngredients),
    instructions:document.getElementById('rmInstructions').value.trim()||null,
    source:null,
  };
  recSnapshot();
  closeMod('recipeModal');
  if(!_recipeEditId){
    const r={id:'l-'+Date.now(),...data,favorite:false};
    st.recipes.push(r);save();renderRecipeTable();
    const sv=await sbReq('POST','recipes',data);
    if(sv&&sv[0]){const i=st.recipes.findIndex(x=>x.id===r.id);if(i>-1)st.recipes[i]=sv[0];save();renderRecipeTable();}
  } else {
    const idx=st.recipes.findIndex(x=>String(x.id)===String(_recipeEditId));if(idx<0)return;
    Object.assign(st.recipes[idx],data);save();
    await sbReqSilent('PATCH','recipes',data,`?id=eq.${_recipeEditId}`);
    renderRecipeTable();
    if(_recPanelId===String(_recipeEditId))renderRecSidePanel(_recipeEditId);
  }
}

async function setRecField(id,field,val,skipPanel=false){
  const idx=st.recipes.findIndex(x=>String(x.id)===String(id));if(idx<0)return;
  recSnapshot();
  st.recipes[idx][field]=val;
  save();
  sbReqSilent('PATCH','recipes',{[field]:val},`?id=eq.${id}`);
  renderRecipeTable();
  if(!skipPanel&&_recPanelId===String(id))renderRecSidePanel(id);
}

async function toggleRecFavorite(id,e){
  if(e){e.preventDefault();e.stopPropagation();}
  const r=st.recipes.find(x=>String(x.id)===String(id));if(!r)return;
  recSnapshot();
  r.favorite=!r.favorite;save();
  sbReqSilent('PATCH','recipes',{favorite:r.favorite},`?id=eq.${id}`);
  renderRecipeTable();
  if(_recPanelId===String(id))renderRecSidePanel(id);
}


function selRecRow(e,sid){
  if(e.target.closest('button,input'))return;
  e.stopPropagation();
  if(e.metaKey||e.ctrlKey){
    if(_selRecIds.has(sid))_selRecIds.delete(sid);else _selRecIds.add(sid);
    _lastSelRecId=sid;
  } else if(e.shiftKey&&_lastSelRecId){
    const rows=[...document.querySelectorAll('#recTblBody tr[data-rid]')].map(r=>r.dataset.rid);
    const a=rows.indexOf(_lastSelRecId),b=rows.indexOf(sid);
    if(a>-1&&b>-1){const lo=Math.min(a,b),hi=Math.max(a,b);rows.slice(lo,hi+1).forEach(id=>_selRecIds.add(id));}
    else _selRecIds.add(sid);
    _lastSelRecId=sid;
  } else {
    if(_selRecIds.size===1&&_selRecIds.has(sid)){_selRecIds.clear();_lastSelRecId=null;closeRecSidePanel();}
    else{_selRecIds.clear();_selRecIds.add(sid);_lastSelRecId=sid;}
  }
  applyRecSelHighlight();
}
function applyRecSelHighlight(){
  document.querySelectorAll('#recTblBody tr[data-rid]').forEach(tr=>{
    tr.classList.toggle('rec-sel',_selRecIds.has(tr.dataset.rid));
  });
}

function showRecCtx(e,sid){
  e.preventDefault();e.stopPropagation();
  _recCtxId=sid;
  if(!_selRecIds.has(sid)){_selRecIds.clear();_selRecIds.add(sid);_lastSelRecId=sid;applyRecSelHighlight();}
  const m=document.getElementById('recCtxMenu');
  const multi=_selRecIds.size>1;
  document.getElementById('recCtxViewItem').style.display=multi?'none':'';
  document.getElementById('recCtxEditItem').style.display=multi?'none':'';
  document.getElementById('recCtxFavItem').style.display=multi?'none':'';
  m.style.display='block';
  const x=Math.min(e.clientX,window.innerWidth-180),y=Math.min(e.clientY,window.innerHeight-200);
  m.style.left=x+'px';m.style.top=y+'px';
}
function hideRecCtx(){const m=document.getElementById('recCtxMenu');if(m)m.style.display='none';}
function recCtxView(){hideRecCtx();if(_recCtxId)openRecSidePanel(_recCtxId);}
function recCtxEdit(){hideRecCtx();if(_recCtxId)openRecSidePanel(_recCtxId);}
function recCtxToggleFav(){hideRecCtx();if(_recCtxId)toggleRecFavorite(_recCtxId,null);}
async function recCtxDuplicate(){
  hideRecCtx();recSnapshot();
  const ids=_selRecIds.size?[..._selRecIds]:[_recCtxId].filter(Boolean);
  for(const id of ids){
    const r=st.recipes.find(x=>String(x.id)===String(id));if(!r)continue;
    const copy={...r,id:'l-'+Date.now(),name:r.name+' (copy)'};
    st.recipes.push(copy);
    const sv=await sbReq('POST','recipes',_recFields(copy));
    if(sv&&sv[0]){const i=st.recipes.findIndex(x=>x.id===copy.id);if(i>-1)st.recipes[i]=sv[0];}
  }
  save();renderRecipeTable();
}
async function recCtxDelete(){
  hideRecCtx();recSnapshot();
  const ids=_selRecIds.size?[..._selRecIds]:[_recCtxId].filter(Boolean);
  st.recipes=st.recipes.filter(x=>!ids.includes(String(x.id)));
  _selRecIds.clear();_recCtxId=null;
  if(ids.includes(_recPanelId))closeRecSidePanel();
  save();renderRecipeTable();
  for(const id of ids)if(!id.startsWith('l-'))sbReqSilent('DELETE','recipes',null,`?id=eq.${id}`);
}

function recHdrClick(col){clearTimeout(_recHdrClickTimer);_recHdrClickTimer=setTimeout(()=>{_recHdrClickTimer=null;recSortBy(col);},250);}
function recHdrDbl(e,col){clearTimeout(_recHdrClickTimer);_recHdrClickTimer=null;recFilterBy(e,col);}
function recSortBy(col){
  if(_recSortCol===col){_recSortDir=_recSortDir===1?-1:(_recSortDir===-1?0:1);if(_recSortDir===0)_recSortCol=null;}
  else{_recSortCol=col;_recSortDir=1;}
  renderRecipeTable();
}
function recFilterBy(e,col){
  const thEl=document.querySelector(`th[data-reccol="${col}"]`);
  if(!thEl)return;
  const pop=document.getElementById('recFilterPop');
  const vals=[...new Set(st.recipes.map(r=>String(r[col]||'—')))].sort();
  const curFilter=_recFilter&&_recFilter.col===col?_recFilter:null;
  const checkedVals=curFilter&&curFilter.type==='set'?curFilter.vals:new Set(vals);
  let html=`<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:6px;padding:0 4px">${col.replace(/_/g,' ')}</div>`;
  html+=`<div style="max-height:180px;overflow-y:auto">`;
  vals.forEach(v=>{html+=`<label class="pf-cb-row"><input type="checkbox" ${checkedVals.has(v)?'checked':''} value="${v.replace(/"/g,'&quot;')}" style="margin-right:6px;cursor:pointer;accent-color:var(--accent)">${v}</label>`;});
  html+=`</div><div style="display:flex;gap:4px;margin-top:7px">`;
  html+=`<button class="btn btn-ghost btn-xs" style="flex:1" onclick="recFilterClear()">Clear</button>`;
  html+=`<button class="btn btn-dark btn-xs" style="flex:1" onclick="recFilterApplySet('${col}')">Apply</button></div>`;
  if(col==='name'||col==='cuisine'){
    html=`<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:5px;padding:0 4px">${col.replace(/_/g,' ')}</div>`;
    html+=`<input id="rfText" type="text" placeholder="Filter…" value="${curFilter&&curFilter.type==='text'?curFilter.text:''}" style="width:100%;padding:5px 7px;border-radius:6px;border:1px solid var(--border);font-family:inherit;font-size:12px;background:rgba(255,255,255,.8);color:var(--text);outline:none" onkeydown="if(event.key==='Enter')recFilterApplyText('${col}')">`;
    html+=`<div style="display:flex;gap:4px;margin-top:6px"><button class="btn btn-ghost btn-xs" style="flex:1" onclick="recFilterClear()">Clear</button><button class="btn btn-dark btn-xs" style="flex:1" onclick="recFilterApplyText('${col}')">Apply</button></div>`;
  }
  document.getElementById('rfContent').innerHTML=html;
  pop.dataset.col=col;
  const rect=thEl.getBoundingClientRect();
  pop.style.left=Math.min(rect.left,window.innerWidth-210)+'px';
  pop.style.top=(rect.bottom+4)+'px';
  pop.classList.add('rfopen');
  requestAnimationFrame(()=>{const inp=document.getElementById('rfText');if(inp){inp.focus();inp.select();}});
}
function recFilterApplySet(col){
  const boxes=[...document.querySelectorAll('#rfContent input[type=checkbox]')];
  const checked=new Set(boxes.filter(b=>b.checked).map(b=>b.value));
  const all=new Set(boxes.map(b=>b.value));
  _recFilter=checked.size===all.size?null:{col,vals:checked,type:'set'};
  document.getElementById('recFilterPop').classList.remove('rfopen');
  renderRecipeTable();
}
function recFilterApplyText(col){
  const val=(document.getElementById('rfText')?.value||'').trim();
  _recFilter=val?{col,text:val,type:'text'}:null;
  document.getElementById('recFilterPop').classList.remove('rfopen');
  renderRecipeTable();
}
function recFilterClear(){
  _recFilter=null;
  document.getElementById('recFilterPop').classList.remove('rfopen');
  renderRecipeTable();
}

// ── Side panel helpers ─────────────────────────────────────────────────────
function _saveSpField(id,field,val){setRecField(id,field,val,true);}
function _savePanelIngredients(){
  if(!_recPanelId)return;
  _flushPanelIngInputs();
  const ser=_serializeIngredients(_panelIngredients);
  setRecField(_recPanelId,'ingredients',ser,true);
}
function _flushPanelIngInputs(){
  document.querySelectorAll('#panIngList .rm-ing-row').forEach((row,i)=>{
    if(i<_panelIngredients.length){const a=row.querySelector('.rm-ing-amt'),n=row.querySelector('.rm-ing-name');if(a)_panelIngredients[i].amount=a.value;if(n)_panelIngredients[i].name=n.value;}
  });
}
function renderPanelIngList(){
  const el=document.getElementById('panIngList');if(!el)return;
  const _e=v=>(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  el.innerHTML=_panelIngredients.map((ing,i)=>`<div class="rm-ing-row" id="panIngRow${i}"><div class="rm-ing-dot"></div><input class="rm-ing-amt" placeholder="amount" value="${_e(ing.amount)}" oninput="_panelIngredients[${i}].amount=this.value" onkeydown="panIngKey(event,${i},'amt')" onblur="_savePanelIngredients()"><input class="rm-ing-name" placeholder="ingredient" value="${_e(ing.name)}" oninput="_panelIngredients[${i}].name=this.value" onkeydown="panIngKey(event,${i},'name')" onblur="_savePanelIngredients()"><button type="button" class="rm-ing-del" onclick="panIngDel(${i})" title="Remove">✕</button></div>`).join('');
}
function panIngAdd(){
  _flushPanelIngInputs();_panelIngredients.push({name:'',amount:''});renderPanelIngList();
  const i=_panelIngredients.length-1;
  setTimeout(()=>{const inp=document.querySelector(`#panIngRow${i} .rm-ing-amt`);if(inp)inp.focus();},20);
}
function panIngDel(i){
  _flushPanelIngInputs();_panelIngredients.splice(i,1);renderPanelIngList();_savePanelIngredients();
  const prev=Math.max(0,i-1);setTimeout(()=>{const inp=_panelIngredients.length?document.querySelector(`#panIngRow${prev} .rm-ing-name`):null;if(inp)inp.focus();},20);
}
function panIngKey(e,i,field){
  if(e.key==='Enter'){
    e.preventDefault();e.stopPropagation();
    if(field==='amt'){const n=document.querySelector(`#panIngRow${i} .rm-ing-name`);if(n)n.focus();}
    else{_panelIngredients[i].name=e.target.value;panIngAdd();}
  } else if(e.key==='Backspace'&&!e.target.value&&_panelIngredients.length>0){
    panIngDel(i);
  } else if(e.key==='ArrowUp'&&i>0){
    e.preventDefault();const p=document.querySelector(`#panIngRow${i-1} .rm-ing-name`);if(p)p.focus();
  } else if(e.key==='ArrowDown'){
    e.preventDefault();if(i<_panelIngredients.length-1){const n=document.querySelector(`#panIngRow${i+1} .rm-ing-amt`);if(n)n.focus();}
  }
}
function _applyRecFilterUI(){
  if(!document.getElementById('page-recipes')?.classList.contains('active'))return;
  document.querySelectorAll('[data-recmeal]').forEach(b=>b.classList.toggle('active',b.dataset.recmeal===_recMealFilter));
  const fav=document.querySelector('[data-recfav]');if(fav)fav.classList.toggle('active',_recFavFilter);
  document.querySelectorAll('[data-rectime]').forEach(b=>b.classList.toggle('active',b.dataset.rectime===_recTimeFilter));
  const si=document.getElementById('recSearchInp');if(si&&document.activeElement!==si)si.value=_recSearch;
}

function openRecSidePanel(id){
  _recPanelId=String(id);
  renderRecSidePanel(id);
  document.getElementById('recSidePanel').classList.add('open');
  document.getElementById('recTableWrap').style.marginRight='400px';
}
function closeRecSidePanel(){
  _recPanelId=null;
  const panel=document.getElementById('recSidePanel');
  if(panel)panel.classList.remove('open');
  const wrap=document.getElementById('recTableWrap');
  if(wrap)wrap.style.marginRight='0';
}
function renderRecSidePanel(id){
  const panel=document.getElementById('recSidePanel');if(!panel)return;
  const r=st.recipes.find(x=>String(x.id)===String(id));if(!r){closeRecSidePanel();return;}
  const sid=String(r.id);
  function esc(v){return(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function escV(v){return(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
  const favStyle=r.favorite?'color:#ef4444;opacity:1':'color:var(--muted)';
  const fav=r.favorite?'♥':'♡';
  const mealOpts=['','Breakfast','Lunch','Dinner','Snack','Dessert','Drink','Side'].map(m=>`<option value="${m}"${(r.meal_type||'')=== m?' selected':''}>${m||'— Meal type'}</option>`).join('');
  _panelIngredients=_parseIngredients(r.ingredients);
  panel.innerHTML=`
    <div class="rec-sp-header">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <input class="rec-sp-title-inp" value="${escV(r.name)}" placeholder="Recipe name"
          onblur="_saveSpField('${sid}','name',this.value.trim()||'${escV(r.name)}')"
          onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
        <div style="display:flex;gap:4px;flex-shrink:0;padding-top:2px">
          <button onclick="toggleRecFavorite('${sid}',event)" style="background:none;border:none;cursor:pointer;font-size:16px;${favStyle};padding:2px 4px;line-height:1" title="Favorite">${fav}</button>
          <button class="sb-close" onclick="closeRecSidePanel()" title="Close">✕</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap">
        <select class="rec-sp-sel" onchange="_saveSpField('${sid}','meal_type',this.value||null)">${mealOpts}</select>
        <input class="rec-sp-inp" value="${escV(r.cuisine)}" placeholder="Cuisine"
          onblur="_saveSpField('${sid}','cuisine',this.value.trim()||null)"
          onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
      </div>
      <div style="display:flex;gap:12px;margin-top:8px">
        <div style="display:flex;align-items:center;gap:5px">
          <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Time</span>
          <input class="rec-sp-inp" type="number" min="0" value="${r.time||''}" placeholder="min" style="width:48px"
            onblur="_saveSpField('${sid}','time',parseInt(this.value)||null)"
            onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
        </div>
        <div style="display:flex;align-items:center;gap:5px">
          <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Serves</span>
          <input class="rec-sp-inp" type="number" min="1" value="${r.servings||''}" placeholder="–" style="width:36px"
            onblur="_saveSpField('${sid}','servings',parseInt(this.value)||null)"
            onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">
        </div>
      </div>
    </div>
    <div class="rec-sp-body">
      <div class="rec-sp-section">
        <div class="rec-sp-section-title">Ingredients</div>
        <div class="rm-ing-wrap"><div id="panIngList"></div><button type="button" class="rm-ing-add-btn" onclick="panIngAdd()">+ Add ingredient</button></div>
      </div>
      <div class="rec-sp-section">
        <div class="rec-sp-section-title">Instructions</div>
        <textarea class="rec-sp-ta" placeholder="Step-by-step instructions…" rows="3"
          onblur="_saveSpField('${sid}','instructions',this.value.trim()||null)"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(r.instructions||'')}</textarea>
      </div>
      <div class="rec-sp-section">
        <div class="rec-sp-section-title" style="color:var(--muted)">Notes</div>
        <textarea class="rec-sp-ta" placeholder="Notes or tips…" rows="2"
          onblur="_saveSpField('${sid}','notes',this.value.trim()||null)"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(r.notes||'')}</textarea>
      </div>
    </div>
    <div class="rec-sp-actions">
      <button class="btn btn-ghost" style="color:#ef4444;border-color:rgba(239,68,68,.2)" onclick="_recCtxDeletePanel()">Delete</button>
    </div>`;
  renderPanelIngList();
  requestAnimationFrame(()=>{panel.querySelectorAll('.rec-sp-ta').forEach(ta=>{ta.style.height='auto';ta.style.height=ta.scrollHeight+'px';});});
}
function _recCtxDeletePanel(){
  if(!_recPanelId)return;
  _selRecIds.clear();_selRecIds.add(_recPanelId);_recCtxId=_recPanelId;
  recCtxDelete();
}

function renderRecipeTable(){
  const thead=document.getElementById('recTblHead');
  const tbody=document.getElementById('recTblBody');if(!thead||!tbody)return;
  function esc(v){return(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  let rows=[...st.recipes||[]];
  // Apply search
  if(_recSearch){const sv=_recSearch.toLowerCase();rows=rows.filter(r=>{const ingText=_parseIngredients(r.ingredients).map(x=>x.name+' '+x.amount).join(' ');return[r.name,r.meal_type,r.cuisine,r.notes,r.instructions,ingText].some(f=>f&&f.toLowerCase().includes(sv));});}
  // Apply filter chips
  if(_recMealFilter)rows=rows.filter(r=>r.meal_type===_recMealFilter);
  if(_recCuisineFilter)rows=rows.filter(r=>(r.cuisine||'').toLowerCase().includes(_recCuisineFilter.toLowerCase()));
  if(_recFavFilter)rows=rows.filter(r=>r.favorite);
  if(_recTimeFilter){const max=parseInt(_recTimeFilter);rows=rows.filter(r=>r.time&&r.time<=max);}
  // Apply column filter
  if(_recFilter){
    if(_recFilter.type==='text'){const fv=_recFilter.text.toLowerCase();rows=rows.filter(r=>String(r[_recFilter.col]||'').toLowerCase().includes(fv));}
    else if(_recFilter.type==='set'){rows=rows.filter(r=>_recFilter.vals.has(String(r[_recFilter.col]||'—')));}
  }
  // Sort
  if(_recSortCol){
    rows.sort((a,b)=>{
      if(_recSortCol==='time'||_recSortCol==='servings'){return _recSortDir*((a[_recSortCol]||9999)-(b[_recSortCol]||9999));}
      if(_recSortCol==='favorite')return _recSortDir*((b.favorite?1:0)-(a.favorite?1:0));
      return _recSortDir*String(a[_recSortCol]||'').toLowerCase().localeCompare(String(b[_recSortCol]||'').toLowerCase());
    });
  } else {
    rows.sort((a,b)=>{if(a.favorite&&!b.favorite)return -1;if(!a.favorite&&b.favorite)return 1;return String(a.name||'').toLowerCase().localeCompare(String(b.name||'').toLowerCase());});
  }
  function fmtMin(m){if(!m)return'';return m>=60?`${Math.floor(m/60)}h${m%60?' '+m%60+'m':''}`:m+'m';}
  const arr=c=>_recSortCol===c?(_recSortDir>0?' ↑':' ↓'):'';
  const fdot=c=>(_recFilter&&_recFilter.col===c)?'<span style="color:#f97316;font-size:9px;margin-left:2px">▼</span>':'';
  const ths='cursor:pointer;user-select:none;white-space:nowrap;padding:6px 8px';
  thead.innerHTML=`<tr>
    <th style="width:28px;padding:6px 6px;text-align:center" title="Favorite">♥</th>
    <th data-reccol="name" onclick="recHdrClick('name')" ondblclick="recHdrDbl(event,'name')" style="${ths}">Name${arr('name')}${fdot('name')}</th>
    <th data-reccol="meal_type" onclick="recHdrClick('meal_type')" ondblclick="recHdrDbl(event,'meal_type')" style="${ths};width:80px">Meal${arr('meal_type')}${fdot('meal_type')}</th>
    <th data-reccol="time" onclick="recHdrClick('time')" ondblclick="recHdrDbl(event,'time')" style="${ths};width:70px">Time${arr('time')}${fdot('time')}</th>
    <th data-reccol="servings" onclick="recHdrClick('servings')" ondblclick="recHdrDbl(event,'servings')" style="${ths};width:60px">Serves${arr('servings')}${fdot('servings')}</th>
    <th data-reccol="notes" onclick="recHdrClick('notes')" ondblclick="recHdrDbl(event,'notes')" style="${ths}">Notes${arr('notes')}${fdot('notes')}</th>
    <th style="width:28px"></th>
  </tr>`;
  const rowsHtml=rows.map(r=>{
    const sid=String(r.id);
    const isSel=_selRecIds.has(sid);
    const favStyle=r.favorite?'color:#ef4444;opacity:1':'';
    return`<tr data-rid="${sid}" class="${isSel?'rec-sel':''}" onclick="selRecRow(event,'${sid}')" ondblclick="openRecSidePanel('${sid}')" oncontextmenu="showRecCtx(event,'${sid}')">
      <td style="text-align:center;width:28px;padding:4px 4px"><button class="rec-fav${r.favorite?' active':''}" style="${favStyle}" onclick="toggleRecFavorite('${sid}',event)" title="${r.favorite?'Remove from favorites':'Add to favorites'}">♥</button></td>
      <td style="padding:5px 8px;font-weight:600;font-size:12px">${esc(r.name)}</td>
      <td style="padding:5px 8px">${r.meal_type?`<span class="rec-meal-pill">${esc(r.meal_type)}</span>`:''}</td>
      <td class="rec-time-lbl" style="padding:5px 8px">${fmtMin(r.time)}</td>
      <td style="padding:5px 8px;color:var(--muted);font-size:11px">${r.servings||''}</td>
      <td style="padding:5px 8px;font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px">${esc(r.notes||'')}</td>
      <td style="width:28px;padding:2px 4px;text-align:right"><button class="rec-dots" onclick="event.stopPropagation();openRecSidePanel('${sid}')" title="View">···</button></td>
    </tr>`;
  });
  tbody.innerHTML=rowsHtml.join('')||`<tr><td colspan="7" style="padding:28px;text-align:center;color:var(--subtle);font-size:12px">No recipes yet — double click or press + to add</td></tr>`;
  applyRecSelHighlight();
}

function _buildRecFilterBar(){
  const meals=['Breakfast','Lunch','Dinner','Snack','Dessert','Drink','Side'];
  let html=`<input class="rec-search" id="recSearchInp" placeholder="🔍 Search recipes…" value="${_recSearch.replace(/"/g,'&quot;')}" oninput="recSearchChange(this.value)" onchange="recSearchChange(this.value)">`;
  meals.forEach(m=>{html+=`<button class="rec-filter-chip${_recMealFilter===m?' active':''}" onclick="recToggleMealFilter('${m}')">${m}</button>`;});
  html+=`<button class="rec-filter-chip${_recFavFilter?' active':''}" onclick="recToggleFavFilter()">♥ Favs</button>`;
  html+=`<button class="rec-filter-chip${_recTimeFilter==='30'?' active':''}" onclick="recToggleTimeFilter('30')">≤30m</button>`;
  html+=`<button class="rec-filter-chip${_recTimeFilter==='60'?' active':''}" onclick="recToggleTimeFilter('60')">≤1h</button>`;
  return html;
}
function recSearchChange(v){_recSearch=v;renderRecipeTable();_applyRecFilterUI();}
function recToggleMealFilter(m){_recMealFilter=_recMealFilter===m?'':m;renderRecipeTable();_applyRecFilterUI();}
function recToggleFavFilter(){_recFavFilter=!_recFavFilter;renderRecipeTable();_applyRecFilterUI();}
function recToggleTimeFilter(t){_recTimeFilter=_recTimeFilter===t?'':t;renderRecipeTable();_applyRecFilterUI();}

function renderRecipesPage(){
  const page=document.getElementById('page-recipes');if(!page)return;
  if(!page._recInit){
    page._recInit=true;
    const mealChips=['Breakfast','Lunch','Dinner','Snack','Dessert','Drink','Side'].map(m=>`<button class="rec-filter-chip" data-recmeal="${m}" onclick="recToggleMealFilter('${m}')">${m}</button>`).join('');
    page.innerHTML=`<div class="ov-topbar"><div class="ov-topbar-left"><span class="ov-topbar-label">🍳 Recipes</span><span class="ov-topbar-dot"></span></div><span class="ov-topbar-date topbar-date"></span><div class="ov-topbar-right"><span class="ov-topbar-dot"></span><span class="ov-topbar-time topbar-time"></span></div></div>
    <div style="padding-top:26px;position:relative;z-index:10"><div class="rec-filter-bar"><input class="rec-search" id="recSearchInp" placeholder="🔍 Search recipes…" oninput="recSearchChange(this.value)">${mealChips}<button class="rec-filter-chip" data-recfav="1" onclick="recToggleFavFilter()">♥ Favs</button><button class="rec-filter-chip" data-rectime="30" onclick="recToggleTimeFilter('30')">≤30m</button><button class="rec-filter-chip" data-rectime="60" onclick="recToggleTimeFilter('60')">≤1h</button></div></div>
    <div id="recTableWrap" style="transition:margin-right .22s cubic-bezier(.4,0,.2,1)">
      <div class="card" style="overflow:hidden">
        <div class="ch" style="gap:8px">
          <span style="font-weight:700;font-size:13px;color:var(--text)">Recipes</span>
          <span id="recCount" style="font-size:10px;color:var(--muted)"></span>
          <button class="btn-plus" onclick="openRecipeAddModal()" style="margin-left:auto;padding:2px 8px;font-size:13px;border-radius:8px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--text)">+</button>
        </div>
        <div style="overflow-y:auto;flex:1;min-height:0;max-height:calc(100vh - 180px)">
          <table class="rec-tbl"><thead id="recTblHead"></thead><tbody id="recTblBody"></tbody></table>
        </div>
      </div>
    </div>
    <div id="recSidePanel" class="rec-side-panel"></div>`;
    // Attach search listener once
    document.getElementById('recSearchInp').addEventListener('input',e=>{_recSearch=e.target.value;renderRecipeTable();_applyRecFilterUI();});
    // double-click empty area to add
    page.addEventListener('dblclick',e=>{
      if(!e.target.closest('#recTblBody tr,button,input,textarea,select,.rec-side-panel'))openRecipeAddModal();
    });
    // outside click clears selection
    if(window._recOutsideClick)document.removeEventListener('click',window._recOutsideClick);
    window._recOutsideClick=e=>{
      if(!document.getElementById('page-recipes')?.classList.contains('active'))return;
      if(!e.target.closest('#recTblBody,#recSidePanel,[data-recmeal],[data-recfav],[data-rectime],#recSearchInp,.rec-filter-bar')){_selRecIds.clear();_lastSelRecId=null;closeRecSidePanel();applyRecSelHighlight();}
    };
    document.addEventListener('click',window._recOutsideClick);
  }
  _applyRecFilterUI();
  renderRecipeTable();
  const cnt=document.getElementById('recCount');if(cnt)cnt.textContent=`${st.recipes.length} recipe${st.recipes.length!==1?'s':''}`;
  const now=new Date();
  document.querySelectorAll('#page-recipes .topbar-date').forEach(e=>e.textContent=now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));
  document.querySelectorAll('#page-recipes .topbar-time').forEach(e=>e.textContent=new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}));
  if(_recPanelId){
    const sp=document.getElementById('recSidePanel');const tw=document.getElementById('recTableWrap');
    if(sp&&!sp.classList.contains('open')){sp.classList.add('open');if(tw)tw.style.marginRight='400px';}
    renderRecSidePanel(_recPanelId);
  }
}
// ── END RECIPES PAGE ──────────────────────────────────────────────────────────

function showPage(id){
  if(id==='tasks')return;
  if(id==='shopping')id='weekly';// shopping merged into weekly page
  activePg=id;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const pageEl=document.getElementById('page-'+id);if(pageEl)pageEl.classList.add('active');
  const idx=PAGES.indexOf(id);if(idx>-1&&document.querySelectorAll('.nav-item')[idx])document.querySelectorAll('.nav-item')[idx].classList.add('active');
  const mainEl=document.getElementById('main');if(mainEl)mainEl.scrollTop=0;
  if(id==='weekly'){renderWeeklyPage();}if(id==='travel')renderTravelPage();if(id==='birthdays')renderBdayPage();if(id==='pups')renderPupsPage();if(id==='recipes')renderRecipesPage();
  const backBtn=document.getElementById('backToOv');if(backBtn)backBtn.style.display=id==='overview'?'none':'flex';
  renderUnassigned();
  history.replaceState(null,'','#'+id);
}

// ── Modals ─────────────────────────────────────────────────────────────────────
function closeMod(id,e){if(e&&e.target!==document.getElementById(id))return;document.getElementById(id).classList.remove('open');if(id==='mModal'||id==='recMoModal'){const bg=document.querySelector('.bg-canvas');if(bg)bg.classList.remove('orbs-paused');}}

// ── Init ───────────────────────────────────────────────────────────────────────
async function init(){
  load();
  // Apply dark mode and sidebar state immediately — before checkAuth await — to prevent flash
  if(cfg.dark){document.body.classList.add('dark');const ic=document.getElementById('darkToggleIcon');if(ic)ic.textContent='☀️';const dt=document.getElementById('darkToggle');if(dt)dt.textContent='☀️';}
  if(!sbOpen){document.getElementById('sidebar').classList.add('closed');document.getElementById('main').style.left='0';document.getElementById('menuOpen').classList.add('visible');document.querySelectorAll('.ov-topbar').forEach(el=>el.style.left='0');}else{document.getElementById('sidebar').classList.remove('closed');document.getElementById('main').style.left='186px';document.getElementById('menuOpen').classList.remove('visible');document.querySelectorAll('.ov-topbar').forEach(el=>el.style.left='186px');}
  // Restore page from URL hash immediately
  const initHash=location.hash.replace('#','');
  if(initHash&&PAGES.includes(initHash))showPage(initHash);
  // Render from localStorage before auth check so UI is populated instantly
  if(cfg.url&&cfg.key){document.getElementById('cfgUrl').value=cfg.url;document.getElementById('cfgKey').value=cfg.key;renderAll();}
  const authed=await checkAuth();
  if(!authed)return;
  if(cfg.url&&cfg.key){
    deletedRecIds=new Set();save();
    syncAll(false);
  } else{renderAll();setBadge('err','Not connected');}
  setupWkcEdgeDrop();setupEdge('wkListEdgeR',1);
  setInterval(()=>{if(cfg.url&&cfg.key)syncAll(true);},30000);
}

function toggleKanban(){
  const wrap=document.getElementById('kanbanWrap');
  const chev=document.getElementById('kanbanChevron');
  const open=wrap.style.display==='none';
  wrap.style.display=open?'block':'none';
  chev.style.transform=open?'rotate(0deg)':'rotate(-90deg)';
  if(open&&!document.getElementById('kanban').children.length)renderKanban();
}

// ── Single click = toggle, double click = edit ────────────────────────────
// ── Selection System ─────────────────────────────────────────────────────────
const selectedTasks=new Set(); // set of task id strings
let lastSelectedId=null; // for shift-click range

function selTask(e,id){
  if(e.target.closest('.chk')||e.target.closest('.delbtn')||e.target.closest('.dlbl'))return;
  e.stopPropagation();
  const sid=String(id);
  if(e.metaKey||e.ctrlKey){
    if(selectedTasks.has(sid)){selectedTasks.delete(sid);}
    else{selectedTasks.add(sid);}
    lastSelectedId=sid;
  } else if(e.shiftKey&&lastSelectedId){
    // Collect ordered ids from whatever context we're in
    let ids=[];
    const wkcCol=e.currentTarget.closest('.wkc-col');
    const moCal=e.currentTarget.closest('#mCells,#recMoCells');
    const list=e.currentTarget.closest('.tlist,.kol-body');
    if(wkcCol){
      // Weekly calendar: all chips in this column
      ids=[...wkcCol.querySelectorAll('.chip[data-tid]')].map(el=>el.dataset.tid);
    } else if(moCal){
      // Monthly calendar: all chips across all cells in DOM order
      ids=[...moCal.querySelectorAll('.mcell-t[data-tid]')].map(el=>el.dataset.tid);
    } else if(list){
      ids=[...list.querySelectorAll('[id^="ti-"]')].map(r=>r.id.replace('ti-',''));
    }
    const a=ids.indexOf(lastSelectedId),b=ids.indexOf(sid);
    if(a>-1&&b>-1){
      const lo=Math.min(a,b),hi=Math.max(a,b);
      ids.slice(lo,hi+1).forEach(x=>selectedTasks.add(x));
    } else {
      selectedTasks.add(sid);
    }
    lastSelectedId=sid;
  } else {
    selectedTasks.clear();
    selectedTasks.add(sid);
    lastSelectedId=sid;
  }
  applySelHighlight();
}

function applySelHighlight(){
  const dark=document.body.classList.contains('dark');
  const selRecIds=new Set();
  selectedTasks.forEach(id=>{
    if(id.startsWith('rec-virt-'))selRecIds.add(id.replace('rec-virt-',''));
    else if(id.startsWith('wrec-'))selRecIds.add(id.replace('wrec-',''));
  });
  const selShopIds=new Set();
  selectedTasks.forEach(id=>{
    if(id.startsWith('shop-cal-'))selShopIds.add(id.replace('shop-cal-',''));
  });
  const selWrRuleIds=new Set();
  selectedTasks.forEach(id=>{
    if(id.startsWith('wrrule-virt-'))selWrRuleIds.add(id.replace('wrrule-virt-',''));
    else if(id.startsWith('wrrule-'))selWrRuleIds.add(id.replace('wrrule-',''));
  });
  // Resolve selected timeblocks to their underlying task/shop/rec IDs for cross-view highlight
  selectedTasks.forEach(id=>{
    if(!id.startsWith('blk-'))return;
    const b=st.blocks.find(x=>String(x.id)===id.replace('blk-',''));
    if(!b)return;
    if(b.shopId)selShopIds.add(String(b.shopId));
    if(b.ruleId)selWrRuleIds.add(String(b.ruleId));
    if(b.recId)selRecIds.add(String(b.recId));
  });
  function csForId(id){
    if(!id)return null;
    if(id.startsWith('tv-'))return gc('travel');
    if(id.startsWith('wrrule-'))return gc('weekly_reset');
    if(id.startsWith('wrec-')){const r=st.recurring.find(x=>String(x.id)===id.replace('wrec-',''));return gc(r&&(r.is_weekly_reset===true||r.is_weekly_reset==='true')?'weekly_reset':'recurring');}
    if(id.startsWith('rec-virt-'))return gc('recurring');
    if(id.startsWith('shop-cal-'))return gc('shopping');
    const t=st.tasks.find(x=>String(x.id)===String(id));
    if(!t)return null;
    if(!t.done&&t.due_date&&t.due_date.split('T')[0]<tod())return OV;
    if(t.important)return IMP;
    return gc(t.category);
  }
  function applySelVars(el,cs){
    if(!cs)return;
    el.style.setProperty('--sel-bg',cs.bg);
    el.style.setProperty('--sel-b',cs.b.replace(/[\d.]+\)$/,'0.55)'));
    el.style.setProperty('--sel-shadow',cs.d+'33');
    el.style.setProperty('--sel-bg-dark',cs.d+'22');
    el.style.setProperty('--sel-d',cs.d);
  }
  function clearSelVars(el){
    ['--sel-bg','--sel-b','--sel-shadow','--sel-bg-dark','--sel-d'].forEach(v=>el.style.removeProperty(v));
  }
  document.querySelectorAll('.ti').forEach(el=>{
    const id=el.id.replace('ti-','');
    let sel=selectedTasks.has(id);
    let csId=id;
    if(!sel&&id.startsWith('rec-virt-')){sel=selRecIds.has(id.replace('rec-virt-',''));}
    if(!sel&&id.startsWith('shop-cal-')){sel=selShopIds.has(id.replace('shop-cal-',''));}
    if(!sel&&id.startsWith('wrrule-virt-')){sel=selWrRuleIds.has(id.replace('wrrule-virt-',''));}
    el.classList.toggle('sel-row',sel);
    if(sel)applySelVars(el,csForId(csId));
    else clearSelVars(el);
  });
  document.querySelectorAll('.kol-item,.chip,.mcell-t').forEach(el=>{
    const id=el.dataset.tid;
    if(!id)return;
    let sel=selectedTasks.has(id);
    if(!sel&&id.startsWith('rec-virt-'))sel=selRecIds.has(id.replace('rec-virt-',''));
    else if(!sel&&id.startsWith('wrec-'))sel=selRecIds.has(id.replace('wrec-',''));
    else if(!sel&&id.startsWith('shop-cal-'))sel=selShopIds.has(id.replace('shop-cal-',''));
    else if(!sel&&id.startsWith('wrrule-virt-'))sel=selWrRuleIds.has(id.replace('wrrule-virt-',''));
    else if(!sel&&id.startsWith('wrrule-'))sel=selWrRuleIds.has(id.replace('wrrule-',''));
    el.classList.toggle('sel-row',sel);
    if(sel)applySelVars(el,csForId(id));
    else clearSelVars(el);
  });
  document.querySelectorAll('tr[id^="ti-rt-"]').forEach(el=>{
    const rid=el.id.replace('ti-rt-','');
    const sel=selectedTasks.has('rec-virt-'+rid)||selRecIds.has(rid);
    el.classList.toggle('sel-row',sel);
    if(sel)applySelVars(el,gc('recurring'));
    else clearSelVars(el);
  });
  document.querySelectorAll('.tb-block[data-bid]').forEach(el=>{
    const b=st.blocks.find(x=>String(x.id)===String(el.dataset.bid));
    if(!b){el.classList.remove('sel-row');clearSelVars(el);return;}
    let sel=false,csId=null;
    if(b.taskId){sel=selectedTasks.has(String(b.taskId));csId=String(b.taskId);}
    else if(b.recId){const rid=String(b.recId);const _r=st.recurring.find(x=>String(x.id)===rid);const _isWr=_r&&(_r.is_weekly_reset===true||_r.is_weekly_reset==='true');sel=selectedTasks.has('rec-virt-'+rid)||selRecIds.has(rid)||selectedTasks.has('wrec-'+rid);csId=(_isWr?'wrec-':'rec-virt-')+rid;}
    else if(b.ruleId){const blkId='blk-'+String(b.id);const rid=String(b.ruleId);sel=selectedTasks.has(blkId)||selWrRuleIds.has(rid);csId='wrrule-'+rid;}
    else if(b.shopId){const sid=String(b.shopId);const blkId='blk-'+String(b.id);sel=selectedTasks.has(blkId)||selectedTasks.has('shop-cal-'+sid)||selShopIds.has(sid);csId='shop-cal-'+sid;}
    el.classList.toggle('sel-row',sel);
    if(sel)applySelVars(el,csForId(csId));
    else clearSelVars(el);
  });
  document.querySelectorAll('.wkc-banner[data-tvid]').forEach(el=>{
    const tvSid='tv-'+el.dataset.tvid;
    const sel=selectedTasks.has(tvSid);
    el.classList.toggle('sel-row',sel);
    if(sel)applySelVars(el,gc('travel'));
    else clearSelVars(el);
  });
}

function clearSelection(){
  selectedTasks.clear();
  lastSelectedId=null;
  applySelHighlight();
}

// Keyboard shortcuts
let _copiedTasks=[];
document.addEventListener('keydown',async e=>{
  const tag=document.activeElement?.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
  // Pup skill shortcuts
  const onPups=document.getElementById('page-pups')?.classList.contains('active');
  if(onPups&&_selPupIds.size>0){
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();pupCtxDelete();return;}
    if((e.metaKey||e.ctrlKey)&&e.key==='c'){
      e.preventDefault();
      _copiedPups=([..._selPupIds]).map(id=>st.pup_skills.find(x=>String(x.id)===id)).filter(Boolean).map(s=>({...s}));
      return;
    }
    if((e.metaKey||e.ctrlKey)&&e.key==='v'&&_copiedPups.length){
      e.preventDefault();
      pupSnapshot();
      for(const s of _copiedPups){
        const copy={...s,id:'l-'+Date.now(),skill:s.skill+' (copy)'};
        st.pup_skills.push(copy);
        const sv=await sbReq('POST','pup_skills',{pup:copy.pup,skill:copy.skill,level:copy.level,stage:copy.stage,focus:copy.focus,next_step:copy.next_step,comments:copy.comments});
        if(sv&&sv[0]){const i=st.pup_skills.findIndex(x=>x.id===copy.id);if(i>-1)st.pup_skills[i]=sv[0];}
      }
      save();renderPupsPage();return;
    }
  }
  // Space bar: toggle done for selected WR rule rows
  if(e.key===' '&&selectedTasks.size>0&&[...selectedTasks].some(id=>id.startsWith('wrrule-'))){
    e.preventDefault();
    [...selectedTasks].filter(id=>id.startsWith('wrrule-')).forEach(id=>{
      const ruleId=id.replace('wrrule-','');
      const wkKey=getWkKey(wrRecOff);
      const isDone=st.wrOverrides.some(o=>String(o.rule_id)===String(ruleId)&&o.wk_key===wkKey&&o.override_type==='complete'&&o.done===true);
      togWrRule(ruleId,!isDone,wkKey);
    });
    return;
  }
  // Delete selected tasks
  if((e.key==='Delete'||e.key==='Backspace')&&selectedTasks.size>0){
    e.preventDefault();
    const ids=[...selectedTasks];
    // Timeblock-only blocks (shop/WR rule): just remove from timeblock
    const blkOnlyIds=ids.filter(id=>id.startsWith('blk-'));
    if(blkOnlyIds.length){blkOnlyIds.forEach(id=>delBlock(id.replace('blk-','')));clearSelection();return;}
    // WR rule rows: skip this week instead of permanent delete
    const wrRuleIds=ids.filter(id=>id.startsWith('wrrule-'));
    if(wrRuleIds.length){
      const wkKey=getWkKey(wrRecOff);
      wrRuleIds.forEach(id=>writeWrOverride(id.replace('wrrule-',''),wkKey,{override_type:'skip'},{undoLabel:'Skipped WR task this week'}));
      clearSelection();return;
    }
    // Collect everything to undo in one batch
    const shopRestores=[];   // {s, prev}
    const wrecRestores=[];   // {r, wkKey, prev}
    const taskCopies=[];
    const recCopies=[];
    const tvCopies=[];
    ids.forEach(id=>{
      if(id.startsWith('tv-')){
        const tvRealId=id.replace('tv-','');
        const tv=st.travel.find(x=>String(x.id)===String(tvRealId));
        if(tv)tvCopies.push({...tv});
      } else if(id.startsWith('shop-cal-')){
        const shopId=id.replace('shop-cal-','');
        const s=st.shopping.find(x=>String(x.id)===String(shopId));
        if(s){shopRestores.push({s,prev:s.due_date});s.due_date=null;}
      } else if(id.startsWith('wrec-')){
        const recId=id.replace('wrec-','');
        const r=st.recurring.find(x=>String(x.id)===String(recId));
        if(r){const wkKey=getWkKey(wkOff);const prev=r._dateOverrides&&r._dateOverrides[wkKey];wrecRestores.push({r,wkKey,prev});if(r._dateOverrides)delete r._dateOverrides[wkKey];}
      } else if(id.startsWith('rec-virt-')){
        const recId=id.replace('rec-virt-','');
        const r=st.recurring.find(x=>String(x.id)===recId);
        if(r){
          const _isWr=r.is_weekly_reset===true||r.is_weekly_reset==='true';
          if(_isWr){// WR task selected via rec-virt- prefix (e.g. from renderRecOv): unschedule, don't permanently delete
            const wkKey=getWkKey(wkOff);const prev=r._dateOverrides&&r._dateOverrides[wkKey];wrecRestores.push({r,wkKey,prev});if(r._dateOverrides)delete r._dateOverrides[wkKey];
          }else{recCopies.push({...r,_doneByWk:{...r._doneByWk}});}
        }
      } else {
        const t=st.tasks.find(x=>String(x.id)===id);
        if(t)taskCopies.push({...t});
      }
    });
    // Apply all changes
    const taskIds=taskCopies.map(t=>String(t.id));
    const recIds=recCopies.map(r=>String(r.id));
    const tvIds=tvCopies.map(tv=>String(tv.id));
    st.tasks=st.tasks.filter(t=>!taskIds.includes(String(t.id)));
    recIds.forEach(rid=>{deletedRecIds.add(rid);st.recurring=st.recurring.filter(r=>String(r.id)!==rid);});
    st.travel=st.travel.filter(tv=>!tvIds.includes(String(tv.id)));
    renderAll();renderWkSummary();renderWkCal();renderRecOv();renderWeeklyPage();save();
    // DB deletes
    await Promise.all([
      ...taskCopies.map(t=>sbReq('DELETE','tasks',null,`?id=eq.${t.id}`)),
      ...recIds.map(rid=>sbReq('DELETE','wr_recurring_rules',null,recQs(rid))),
      ...tvCopies.filter(tv=>!String(tv.id).startsWith('l-')).map(tv=>sbReq('DELETE','travel',null,`?id=eq.${tv.id}`))
    ]);
    recIds.forEach(rid=>{deletedRecIds.delete(rid);save();});
    // ONE undo for everything
    const totalCount=ids.length;
    pushUndo(async()=>{
      shopRestores.forEach(({s,prev})=>{s.due_date=prev;});
      wrecRestores.forEach(({r,wkKey,prev})=>{if(!r._dateOverrides)r._dateOverrides={};if(prev)r._dateOverrides[wkKey]=prev;});
      const taskPromises=taskCopies.map(async t=>{
        const sv=await sbReq('POST','tasks',{name:t.name,category:t.category,due_date:t.due_date,done:t.done,important:t.important||false});
        st.tasks.push(sv&&sv[0]?sv[0]:t);
      });
      const recPromises=recCopies.map(async r=>{
        deletedRecIds.delete(String(r.id));
        const payload={name:r.name};
        if(r.is_weekly_reset!==undefined)payload.is_weekly_reset=r.is_weekly_reset;
        if(r.cadence)payload.cadence=r.cadence;
              if(r.starting_date)payload.starting_date=r.starting_date;
        if(r.appears_on_date)payload.appears_on_date=r.appears_on_date;
        const sv=await sbReq('POST','wr_recurring_rules',payload);
        st.recurring.push(sv&&sv[0]?{...sv[0],_doneByWk:{},_done:false}:r);
      });
      const tvPromises=tvCopies.map(async tv=>{
        const sv=await sbReq('POST','travel',{name:tv.name,destination:tv.destination||null,start_date:tv.start_date||null,end_date:tv.end_date||null,notes:tv.notes||null});
        st.travel.push(sv&&sv[0]?sv[0]:tv);
      });
      await Promise.all([...taskPromises,...recPromises,...tvPromises]);
      renderAll();renderWkSummary();renderWkCal();renderRecOv();renderWeeklyPage();save();
    },'Deleted '+(totalCount>1?totalCount+' items':'item'));
    clearSelection();
    return;
  }
  // Cmd+C: copy selected tasks
  if((e.metaKey||e.ctrlKey)&&e.key==='c'&&selectedTasks.size>0){
    _copiedTasks=[];
    selectedTasks.forEach(id=>{
      if(id.startsWith('rec-virt-')){
        const recId=id.replace('rec-virt-','');
        const r=st.recurring.find(x=>String(x.id)===recId);
        if(r)_copiedTasks.push({...r,_isRec:true});
      } else if(id.startsWith('wrrule-')){
        const rid=id.replace('wrrule-','');
        const r=st.wrRules.find(x=>String(x.id)===rid);
        if(r)_copiedTasks.push({...r,_isWrRule:true});
      } else {
        const t=st.tasks.find(x=>String(x.id)===id);
        if(t)_copiedTasks.push({...t});
      }
    });
    return;
  }
  // Cmd+V: paste (duplicate) copied tasks
  if((e.metaKey||e.ctrlKey)&&e.key==='v'&&_copiedTasks.length>0){
    e.preventDefault();
    _copiedTasks.forEach(async t=>{
      if(t._isWrRule){
        const dupName=uniqueRecName(t.name);
        const tmpId='wrrule-tmp-'+Date.now();
        const payload={name:dupName,cadence:t.cadence||'weekly',day_of_week:t.day_of_week,starting_date:t.starting_date||null,monthly_rule_type:t.monthly_rule_type||null,monthly_nth:t.monthly_nth||null,monthly_weekday:t.monthly_weekday||null,monthly_date:t.monthly_date||null,pup_related:t.pup_related||false,notes:t.notes||null,is_enabled:true,sort_order:st.wrRules.length};
        st.wrRules.push({...payload,id:tmpId});
        save();renderRecOv();renderWeeklyPage();
        const sv=await sbReq('POST','wr_recurring_rules',payload);
        if(sv&&sv[0]){const idx=st.wrRules.findIndex(x=>x.id===tmpId);if(idx>-1)st.wrRules[idx]=sv[0];}
        save();renderRecOv();renderWeeklyPage();
        pushUndo(()=>{st.wrRules=st.wrRules.filter(x=>x.id!==tmpId&&!(sv&&sv[0]&&x.id===sv[0].id));save();renderRecOv();renderWeeklyPage();},'Duplicated WR rule');
      } else if(t._isRec){
        const dupName=uniqueRecName(t.name);
        const todayDs=d2s(new Date());
        const tempId='rec-tmp-'+Date.now();
        const localCopy={...t,id:tempId,name:dupName,starting_date:todayDs,_doneByWk:{},_done:false,_dateOverrides:{},_isRec:undefined};
        st.recurring.push(localCopy);
        save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
        const payload={name:dupName,is_weekly_reset:t.is_weekly_reset||false,cadence:t.cadence||'weekly',starting_date:todayDs};
        if(t.appears_on_date)payload.appears_on_date=t.appears_on_date;
        if(t.repeat_date)payload.repeat_date=t.repeat_date;
                      const sv=await sbReq('POST','wr_recurring_rules',payload);
        if(sv&&sv[0]){const idx=st.recurring.findIndex(x=>x.id===tempId);if(idx>-1)st.recurring[idx]={...sv[0],_doneByWk:{},_done:false,_dateOverrides:{}};}
        save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
        pushUndo(()=>{st.recurring=st.recurring.filter(x=>x.id!==tempId&&!(sv&&sv[0]&&x.id===sv[0].id));save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();},'Duplicated recurring');
      } else {
        const dup={id:'l-'+Date.now()+Math.random(),name:t.name,category:t.category,due_date:t.due_date,done:false,important:t.important||false};
        st.tasks.push(dup);renderAll();
        let pasteServerId=null;
        pushUndo(()=>{const rid=pasteServerId||dup.id;st.tasks=st.tasks.filter(x=>String(x.id)!==String(rid));renderAll();if(pasteServerId)sbReq('DELETE','tasks',null,`?id=eq.${pasteServerId}`);},'Pasted task');
        const sv=await sbReq('POST','tasks',{name:dup.name,category:dup.category,due_date:dup.due_date,done:false,important:dup.important});
        if(sv&&sv[0]){const i=st.tasks.findIndex(x=>x.id===dup.id);if(i>-1){st.tasks[i]=sv[0];}pasteServerId=String(sv[0].id);save();}
      }
    });
    return;
  }
  // Escape: clear selection
  if(e.key==='Escape'){clearSelection();}
});

// Click outside any task clears selection (use mousedown to not conflict with selTask)
document.addEventListener('mousedown',e=>{
  if(!e.target.closest('.ti')&&!e.target.closest('.kol-item')&&!e.target.closest('.chip')&&!e.target.closest('.mcell-t')&&!e.target.closest('.tb-block')&&!e.target.closest('.wkc-banner')&&!e.target.closest('#ctxMenu')){
    clearSelection();
  }
});

function tiDbl(e,id){
  if(e.target.closest('.chk')||e.target.closest('.delbtn')||e.target.closest('.dlbl'))return;
  e.stopPropagation();
  clearSelection();
  openEditTask(id);
}
function tiDblRec(e,recId){
  if(e.target.closest('.chk')||e.target.closest('.delbtn'))return;
  e.stopPropagation();
  clearSelection();
  openRecEditModal(recId);
}
function tiClickRecWR(e,rid){
  if(e.target.closest('.chk')||e.target.closest('.delbtn'))return;
  e.stopPropagation();
  clearTimeout(_tiClickTimer);
  _tiClickTimer=setTimeout(()=>{
    const r=st.recurring.find(x=>String(x.id)===String(rid));
    if(r){const isDone=!!(r._doneByWk&&r._doneByWk[getWkKey(wkOff)]);togRec(rid,!isDone);}
  },200);
}
function tiDblRecWR(e,rid){
  if(e.target.closest('.chk')||e.target.closest('.delbtn'))return;
  e.stopPropagation();
  clearTimeout(_tiClickTimer);
  openRecEditModal(rid);
}
function tiClickShop(e,id){
  if(e.target.closest('.chk')||e.target.closest('.delbtn'))return;
  selTask(e,'shop-cal-'+id);
}
function tiDblShop(e,id){
  if(e.target.closest('.chk')||e.target.closest('.delbtn'))return;
  e.stopPropagation();
  clearTimeout(_tiClickTimer);
  openEditShop(id);
}
let _shopEditId=null;
function openEditShop(id){
  const s=st.shopping.find(x=>String(x.id)===String(id));if(!s)return;
  _shopEditId=id;
  document.getElementById('shopEditName').value=s.name;
  document.getElementById('shopEditStore').value=s.store||'';
  document.getElementById('shopEditModal').classList.add('open');
  setTimeout(()=>{const _el=document.getElementById('shopEditName');if(_el){_el.focus();const _l=_el.value.length;_el.setSelectionRange(_l,_l);}},80);
}
function saveShopEdit(){
  const id=_shopEditId;if(!id)return;
  const s=st.shopping.find(x=>String(x.id)===String(id));if(!s)return;
  const name=document.getElementById('shopEditName').value.trim();
  const store=document.getElementById('shopEditStore').value.trim();
  if(!name){closeMod('shopEditModal');return;}
  closeMod('shopEditModal');
  const prev={name:s.name,store:s.store};
  s.name=name;s.store=store||prev.store;
  renderShopFull();
  sbReq('PATCH','shopping_list',{name:s.name,store:s.store},`?id=eq.${id}`);
  pushUndo(()=>{s.name=prev.name;s.store=prev.store;renderShopFull();sbReq('PATCH','shopping_list',{name:prev.name,store:prev.store},`?id=eq.${id}`);},'Edited item');
}
let _recEditId=null,_recEditWkKey=null,_recEditScope='all';
function setRecEditScope(scope){
  _recEditScope=scope;
  const isThis=scope==='this';
  document.getElementById('recEditPanelThis').style.display=isThis?'':'none';
  document.getElementById('recEditPanelAll').style.display=isThis?'none':'';
  const btnThis=document.getElementById('recEditScopeThis'),btnAll=document.getElementById('recEditScopeAll');
  btnThis.style.background=isThis?'var(--accent)':'';btnThis.style.color=isThis?'#fff':'';
  btnAll.style.background=!isThis?'var(--accent)':'';btnAll.style.color=!isThis?'#fff':'';
  setTimeout(()=>{
    const el=isThis?document.getElementById('recEditNameThis'):document.getElementById('recEditName');
    if(el){el.focus();const l=el.value.length;el.setSelectionRange(l,l);}
  },50);
}
function updateRecEditUI(){
  const isWr=document.getElementById('recEditType').value==='weekly_reset';
  const cad=document.getElementById('recEditCadence').value;
  const isMonthly=cad==='monthly';
  const pf=document.getElementById('recEditPupField');if(pf)pf.style.display=isWr?'block':'none';
  document.getElementById('recEditDayField').style.display=isMonthly?'none':'block';
  document.getElementById('recEditDateField').style.display=isMonthly?'block':'none';
  document.getElementById('recEditDayLabel').textContent=cad==='biweekly'?'Due on (every 2nd)':'Due on';
  if(isMonthly){
    const mode=document.querySelector('input[name="recEditMonthlyMode"]:checked')?.value||'dom';
    document.getElementById('recEditMonthlyDomField').style.display=mode==='dom'?'block':'none';
    document.getElementById('recEditMonthlyNwdField').style.display=mode==='nwd'?'flex':'none';
  }
}
function openRecEditModal(rid,wkKey='',scope='all'){
  const r=st.recurring.find(x=>String(x.id)===String(rid));if(!r)return;
  _recEditId=rid;_recEditWkKey=wkKey||'';
  const isWr=r.is_weekly_reset===true||r.is_weekly_reset==='true';
  document.getElementById('recEditName').value=r.name;
  document.getElementById('recEditType').value=isWr?'weekly_reset':'scheduled';
  document.getElementById('recEditCadence').value=r.cadence||'weekly';
  document.getElementById('recEditRepeatDay').value=(r.appears_on_date&&isNaN(parseInt(r.appears_on_date)))?r.appears_on_date:'Friday';
  const rdSel=document.getElementById('recEditRepeatDate');
  if(!rdSel.options.length)for(let i=1;i<=28;i++){const o=document.createElement('option');o.value=i;o.textContent=i;rdSel.appendChild(o);}
  // Parse monthly schedule from appears_on_date
  if(!isWr&&(r.cadence||'weekly')==='monthly'){
    const sched=r.appears_on_date||'';
    const domNum=parseInt(sched,10);
    const nwdMatch=sched.match(/^(\d+)(?:st|nd|rd|th)?\s+(\w+)$/i);
    if(!isNaN(domNum)&&String(domNum)===String(sched).trim()){
      document.getElementById('recEditMonthlyModeDom').checked=true;
      rdSel.value=String(domNum);
    } else if(nwdMatch){
      document.getElementById('recEditMonthlyModeNwd').checked=true;
      document.getElementById('recEditNthWd').value=sched;
    } else {
      document.getElementById('recEditMonthlyModeDom').checked=true;rdSel.value='1';
    }
  } else {
    document.getElementById('recEditMonthlyModeDom').checked=true;rdSel.value='1';
  }
  document.getElementById('recEditStartDate').value=r.starting_date||'';
  const pr=document.getElementById('recEditPupRelated');if(pr)pr.checked=!!(r.pup_related===true||r.pup_related==='true');
  const recEditNotesEl=document.getElementById('recEditNotes');if(recEditNotesEl)recEditNotesEl.value=r.notes||'';
  // Populate this-week override fields
  const nameOvKey='name::'+wkKey;
  const nameOv=(wkKey&&r._dateOverrides&&r._dateOverrides[nameOvKey])||null;
  document.getElementById('recEditNameThis').value=(nameOv&&nameOv.name)||r.name;
  document.getElementById('recEditNotesThis').value=(nameOv&&nameOv.notes)||'';
  // Show/hide scope toggle
  const toggleEl=document.getElementById('recEditScopeToggle');
  if(toggleEl)toggleEl.style.display=wkKey?'flex':'none';
  updateRecEditUI();
  document.getElementById('recEditModal').classList.add('open');
  setRecEditScope(wkKey?scope:'all');
}
function saveRecEdit(){
  const rid=_recEditId;if(!rid)return;
  const r=st.recurring.find(x=>String(x.id)===String(rid));if(!r)return;
  if(_recEditScope==='this'&&_recEditWkKey){
    const name=document.getElementById('recEditNameThis').value.trim();
    if(!name){closeMod('recEditModal');return;}
    const notes=document.getElementById('recEditNotesThis').value.trim()||null;
    if(!r._dateOverrides)r._dateOverrides={};
    const nameOvKey='name::'+_recEditWkKey;
    const prev=r._dateOverrides[nameOvKey];
    r._dateOverrides[nameOvKey]={name,notes};
    closeMod('recEditModal');
    renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();
    sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));
    pushUndo(()=>{if(prev!==undefined)r._dateOverrides[nameOvKey]=prev;else delete r._dateOverrides[nameOvKey];renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));},'Edited recurring this week');
    return;
  }
  const name=document.getElementById('recEditName').value.trim();
  if(!name){closeMod('recEditModal');return;}
  const isWr=document.getElementById('recEditType').value==='weekly_reset';
  const cadence=document.getElementById('recEditCadence').value;
  const isMonthly=cadence==='monthly';
  let appearsOn;
  if(isMonthly){
    const mode=document.querySelector('input[name="recEditMonthlyMode"]:checked')?.value||'dom';
    if(mode==='nwd'){appearsOn=document.getElementById('recEditNthWd').value;}
    else{appearsOn=document.getElementById('recEditRepeatDate').value||'1';}
  } else {
    appearsOn=document.getElementById('recEditRepeatDay').value;
  }
  const startDate=document.getElementById('recEditStartDate').value||null;
  const pupRelated=isWr&&!!(document.getElementById('recEditPupRelated')?.checked);
  const notes=document.getElementById('recEditNotes')?.value.trim()||null;
  closeMod('recEditModal');
  const prev={name:r.name,is_weekly_reset:r.is_weekly_reset,cadence:r.cadence,appears_on_date:r.appears_on_date,starting_date:r.starting_date,pup_related:r.pup_related,notes:r.notes};
  r.name=name;r.is_weekly_reset=isWr;r.cadence=cadence;r.appears_on_date=appearsOn;r.starting_date=startDate;r.pup_related=pupRelated;r.notes=notes;
  renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();
  const patch={name,is_weekly_reset:isWr,cadence,appears_on_date:appearsOn,pup_related:pupRelated,notes:notes||null};
  if(startDate)patch.starting_date=startDate;
  sbReq('PATCH','wr_recurring_rules',patch,recQs(rid));
  pushUndo(()=>{Object.assign(r,prev);renderRecOv();renderWeeklyPage();},'Edited recurring');
}



// ── Context Menu ─────────────────────────────────────────────────────────────
// ── Context Menu ─────────────────────────────────────────────────────────────
// Store ctx state on the menu element itself so onclick handlers can always read it
function showCtx(e,taskId,isRec,recId,shopId,blockId,tvId){
  e.preventDefault();e.stopPropagation();
  const m=document.getElementById('ctxMenu');
  m._tid=taskId?String(taskId):null;
  m._isRec=(isRec===true);
  m._recId=(recId!=null)?String(recId):null;
  m._shopId=(shopId!=null)?String(shopId):null;
  m._blockId=(blockId!=null)?String(blockId):null;
  m._tvId=(tvId!=null)?String(tvId):null;
  const isR=m._isRec,isSh=!!m._shopId,isBlk=!!m._blockId,isTv=!!m._tvId;
  m.querySelector('#ctxDuplicate').style.display=isTv?'none':'';
  m.querySelector('#ctxDuplicate').textContent=isSh&&!isBlk?'⧉  Duplicate item':isR?'⧉  Duplicate recurring':'⧉  Duplicate task';
  m.querySelector('#ctxEdit').textContent=isTv?'✏️  Edit trip':isSh&&!isBlk?'✏️  Edit item':isR?'✏️  Edit recurring':'✏️  Edit task';
  m.querySelector('#ctxDelete').textContent=isTv?'✕  Delete trip':isBlk?'✕  Remove from day':isSh?'✕  Delete item':isR?'✕  Delete recurring':'✕  Delete task';
  m.style.display='block';
  const x=Math.min(e.clientX,window.innerWidth-165),y=Math.min(e.clientY,window.innerHeight-120);
  m.style.left=x+'px';m.style.top=y+'px';
}
function showCtxShop(e,shopId){showCtx(e,null,false,null,shopId);}
function hideCtx(){document.getElementById('ctxMenu').style.display='none';}
document.addEventListener('click',e=>{if(!e.target.closest('#pupCtxMenu'))hidePupCtx();if(!e.target.closest('#bdayCtxMenu'))hideBdayCtx();if(!e.target.closest('#recCtxMenu'))hideRecCtx();});
document.addEventListener('click',e=>{const pop=document.getElementById('recFilterPop');if(!pop||!pop.classList.contains('rfopen'))return;if(!pop.contains(e.target)&&!e.target.closest('th[data-reccol]'))pop.classList.remove('rfopen');});
// Close on outside click or Escape
document.addEventListener('mousedown',e=>{
  if(!e.target.closest('#ctxMenu'))hideCtx();
},{capture:true,passive:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideCtx();});

function uniqueRecName(base){
  const existing=new Set(st.recurring.map(r=>r.name));
  if(!existing.has(base))return base;
  let n=2;while(existing.has(base+' ('+n+')'))n++;
  return base+' ('+n+')';
}
async function ctxDoDuplicate(){
  const m=document.getElementById('ctxMenu');
  const id=m._tid,isRec=m._isRec,rId=m._recId,sId=m._shopId;
  hideCtx();
  if(sId){
    const s=st.shopping.find(x=>String(x.id)===sId);if(!s)return;
    const dup={id:'l-'+Date.now(),name:s.name,store:s.store,done:false};
    st.shopping.push(dup);renderShopFull();renderShopOv();
    pushUndo(()=>{st.shopping=st.shopping.filter(x=>x.id!==dup.id);renderShopFull();renderShopOv();},'Duplicated item');
    const sv=await sbReq('POST','shopping_list',{name:s.name,store:s.store,done:false});
    if(sv&&sv[0]){const i=st.shopping.findIndex(x=>x.id===dup.id);if(i>-1)st.shopping[i]=sv[0];}
    return;
  }
  if(isRec&&rId){
    const r=st.recurring.find(x=>String(x.id)===rId);
    if(!r){console.warn('Recurring not found:',rId,st.recurring.map(x=>x.id));return;}
    // Add locally first with a temp id so it appears immediately
    const dupName=uniqueRecName(r.name);
    const todayDs=d2s(new Date());
    const tempId='rec-tmp-'+Date.now();
    const localCopy={...r,id:tempId,name:dupName,starting_date:todayDs,_doneByWk:{},_done:false,_dateOverrides:{}};
    st.recurring.push(localCopy);
    save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
    // Push to DB
    const payload={name:dupName,is_weekly_reset:r.is_weekly_reset||false,cadence:r.cadence||'weekly',starting_date:todayDs};
    if(r.appears_on_date)payload.appears_on_date=r.appears_on_date;
    if(r.repeat_date)payload.repeat_date=r.repeat_date;
          const sv=await sbReq('POST','wr_recurring_rules',payload);
    if(sv&&sv[0]){
      // Replace temp with real DB entry
      const idx=st.recurring.findIndex(x=>x.id===tempId);
      if(idx>-1)st.recurring[idx]={...sv[0],_doneByWk:{},_done:false,_dateOverrides:{}};
      else st.recurring.push({...sv[0],_doneByWk:{},_done:false,_dateOverrides:{}});
    } else {
      // No DB (offline) — give stable local id
      const idx=st.recurring.findIndex(x=>x.id===tempId);
      if(idx>-1)st.recurring[idx].id='rec-local-'+Date.now();
    }
    save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
    pushUndo(()=>{
      st.recurring=st.recurring.filter(x=>String(x.id)!==(sv&&sv[0]?String(sv[0].id):tempId));
      save();renderRecOv();renderWeeklyPage();renderToday();renderWkSummary();renderWkCal();
      if(sv&&sv[0])sbReq('DELETE','wr_recurring_rules',null,recQs(sv[0].id));
    },'Duplicated recurring');
    return;
  }
  const t=st.tasks.find(x=>String(x.id)===id);if(!t)return;
  const dup={id:'l-'+Date.now(),name:t.name,category:t.category,due_date:t.due_date,done:false,important:t.important||false};
  st.tasks.push(dup);renderAll();
  let dupServerId=null;
  pushUndo(()=>{const rid=dupServerId||dup.id;st.tasks=st.tasks.filter(x=>String(x.id)!==String(rid));renderAll();if(dupServerId)sbReq('DELETE','tasks',null,`?id=eq.${dupServerId}`);},'Duplicated task');
  const sv=await sbReq('POST','tasks',{name:dup.name,category:dup.category,due_date:dup.due_date,done:false,important:dup.important});
  if(sv&&sv[0]){const i=st.tasks.findIndex(x=>x.id===dup.id);if(i>-1){st.tasks[i]=sv[0];}dupServerId=String(sv[0].id);save();}
}
function ctxDoEdit(){
  const m=document.getElementById('ctxMenu');
  const id=m._tid,isRec=m._isRec,rId=m._recId,sId=m._shopId,blkId=m._blockId,tvId=m._tvId;
  hideCtx();
  if(tvId){openTravelModal(tvId);return;}
  if(blkId){
    if(sId)tiDblShop(null,sId);else if(isRec&&rId)openRecEditModal(rId);else if(id)openEditTask(id);
  } else if(sId){tiDblShop(null,sId);}else if(isRec&&rId){openRecEditModal(rId);}else{openEditTask(id);}
}
function ctxDoDelete(){
  const m=document.getElementById('ctxMenu');
  const id=m._tid,isRec=m._isRec,rId=m._recId,sId=m._shopId,blkId=m._blockId,tvId=m._tvId;
  hideCtx();
  if(tvId){delTravel(tvId);clearSelection();return;}
  // If triggered from a timeblock, remove from day only (never delete the underlying item)
  if(blkId){delBlock(blkId);return;}
  const _isWrRuleItem=id&&String(id).startsWith('wrrule-');
  if(_isWrRuleItem){const _ruleId=String(id).replace('wrrule-virt-','').replace('wrrule-','');unscheduleWrRule(_ruleId,getWkKey(wkOff));}
  else if(sId){unscheduleShop(sId);}else if(isRec&&rId){const _cr=st.recurring.find(x=>String(x.id)===String(rId));const _isWr=_cr&&(_cr.is_weekly_reset===true||_cr.is_weekly_reset==='true');if(_isWr){unscheduleWRec(rId,getWkKey(wkOff));}else{skipRecVirtThisWk(rId,getWkKey(wkOff));}}else{delTask(id,null);}
}

// ══════════════════════════════════════════════════════════
// DARK MODE
// ══════════════════════════════════════════════════════════
function toggleDark(){
  const isDark=document.body.classList.toggle('dark');
  cfg.dark=isDark;save();
  const ic=document.getElementById('darkToggleIcon');if(ic)ic.textContent=isDark?'☀️':'🌙';
  const lb=document.getElementById('darkToggleLabel');if(lb)lb.textContent=isDark?'Light Mode':'Night Mode';
}
function toggleSettingsPopup(){
  const p=document.getElementById('settingsPopup');if(!p)return;
  const isOpen=p.classList.contains('open');
  if(!isOpen){
    const btn=document.getElementById('settingsBtn');
    const r=btn.getBoundingClientRect();
    p.style.top=(r.bottom+8)+'px';
    p.style.right=(window.innerWidth-r.right)+'px';
  }
  p.classList.toggle('open');
}
document.addEventListener('click',function(e){
  const popup=document.getElementById('settingsPopup');
  const btn=document.getElementById('settingsBtn');
  if(popup&&popup.classList.contains('open')&&!popup.contains(e.target)&&e.target!==btn&&!btn.contains(e.target))popup.classList.remove('open');
});
// Apply on load
if(cfg.dark){document.body.classList.add('dark');const ic=document.getElementById('darkToggleIcon');if(ic)ic.textContent='☀️';const lb=document.getElementById('darkToggleLabel');if(lb)lb.textContent='Light Mode';}

// ══════════════════════════════════════════════════════════
// OVERDUE ROLLOVER BANNER
// ══════════════════════════════════════════════════════════
function getOvRecurring(){
  // Overdue recurring virtual tasks — check current + past 4 weeks
  const today=tod();
  const seen=new Set();
  const out=[];
  for(let w=0;w>=wkOff-4;w--){
    getRecurringWeekTasks(w).forEach(v=>{
      if(seen.has(v._recId))return;
      // If skipped for this week or any later week up to now, don't count as overdue
      const _rec=st.recurring.find(x=>String(x.id)===String(v._recId));
      if(_rec&&_rec._dateOverrides){for(let sw=w;sw<=0;sw++){if(_rec._dateOverrides[getWkKey(sw)]==='__skip__')return;}}
      seen.add(v._recId);
      if(!v.done&&v.due_date<today){out.push(v);}
    });
    // Weekly reset tasks: only check current week key (past-week overrides are stale, not overdue)
    if(w===0){
      const wkKey=getWkKey(w);
      st.recurring.filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&!(r._doneByWk&&r._doneByWk[wkKey])&&r._dateOverrides&&r._dateOverrides[wkKey]&&r._dateOverrides[wkKey]<today&&!seen.has('wrec-'+r.id+'-'+wkKey)).forEach(r=>{
        seen.add('wrec-'+r.id+'-'+wkKey);
        out.push({id:'rec-virt-'+r.id,name:r.name,category:'Recurring',due_date:r._dateOverrides[wkKey],done:false,_recId:r.id,_virtual:true,_wkKey:wkKey,_isWrec:true});
      });
    }
  }
  return out;
}
function getOvShopping(){
  const today=tod();
  return st.shopping.filter(s=>!s.done&&s.due_date&&s.due_date.split('T')[0]<today);
}
function updateOvBanner(){
  if(dayOff!==0){document.getElementById('ovBanner').classList.remove('show');return;}
  const today=tod();
  const ovTasks=st.tasks.filter(t=>!t.done&&t.due_date&&t.due_date.split('T')[0]<today);
  const ovRec=getOvRecurring();
  const ovShop=getOvShopping();
  const total=ovTasks.length+ovRec.length+ovShop.length;
  const banner=document.getElementById('ovBanner');
  if(total>0){
    document.getElementById('ovBannerTxt').textContent=
      total===1?'1 overdue task — move to today?':`${total} overdue tasks — move all to today?`;
    banner.classList.add('show');
  } else {
    banner.classList.remove('show');
  }
}
async function rolloverOverdue(){
  const today=tod();
  const ovTasks=st.tasks.filter(t=>!t.done&&t.due_date&&t.due_date.split('T')[0]<today);
  const ovRec=getOvRecurring();
  const ovShop=getOvShopping();
  if(!ovTasks.length&&!ovRec.length&&!ovShop.length)return;
  const prevDates=ovTasks.map(t=>({id:String(t.id),date:t.due_date}));
  const prevRecWkKeys=ovRec.map(v=>({recId:v._recId,wkKey:v._wkKey}));
  const prevShopDates=ovShop.map(s=>({id:String(s.id),date:s.due_date}));
  ovTasks.forEach(t=>{t.due_date=today;const sid=String(t.id);localOverrides[sid]={due_date:today};pendingLocal.add(sid);});
  ovRec.forEach(v=>{
    const r=st.recurring.find(x=>String(x.id)===String(v._recId));
    if(!r)return;
    if(!r._dateOverrides)r._dateOverrides={};
    r._dateOverrides[v._wkKey]=today;
  });
  ovShop.forEach(s=>{s.due_date=today;});
  renderAll();
  const total=ovTasks.length+ovRec.length+ovShop.length;
  pushUndo(()=>{
    prevDates.forEach(({id,date})=>{const t=st.tasks.find(x=>String(x.id)===id);if(t)t.due_date=date;});
    prevRecWkKeys.forEach(({recId,wkKey})=>{const r=st.recurring.find(x=>String(x.id)===String(recId));if(r&&r._dateOverrides)delete r._dateOverrides[wkKey];});
    prevShopDates.forEach(({id,date})=>{const s=st.shopping.find(x=>String(x.id)===id);if(s)s.due_date=date;});
    renderAll();
    prevDates.forEach(({id,date})=>sbReq('PATCH','tasks',{due_date:date},`?id=eq.${id}`));
    prevShopDates.forEach(({id,date})=>sbReqNullable('PATCH','shopping_list',{due_date:date||null},`?id=eq.${id}`));
  },'Rolled over '+total+' item'+(total>1?'s':''));
  save();
  const recsToPatch=[...new Set(ovRec.map(v=>v._recId))];
  await Promise.all([
    ...ovTasks.map(t=>sbReq('PATCH','tasks',{due_date:today},`?id=eq.${t.id}`).then(()=>{const sid=String(t.id);delete localOverrides[sid];pendingLocal.delete(sid);})),
    ...ovShop.map(s=>sbReqNullable('PATCH','shopping_list',{due_date:today},`?id=eq.${s.id}`)),
    ...recsToPatch.map(rid=>{const r=st.recurring.find(x=>String(x.id)===String(rid));return r?sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id)):Promise.resolve();})
  ]);
}

// ══════════════════════════════════════════════════════════
// INLINE DATE PICKER
// ══════════════════════════════════════════════════════════
let _idpTaskId=null;
function openInlineDatePicker(e,taskId,currentDate){
  e.stopPropagation();e.preventDefault();
  _idpTaskId=String(taskId);
  const picker=document.getElementById('inlineDatePicker');
  document.getElementById('idpInput').value=currentDate||'';
  picker.classList.add('show');
  // Position near the clicked element
  const rect=e.target.closest('.dlbl').getBoundingClientRect();
  const x=Math.min(rect.left,window.innerWidth-200);
  const y=rect.bottom+4;
  picker.style.left=x+'px';picker.style.top=y+'px';
  picker.style.display='block';
  setTimeout(()=>document.getElementById('idpInput').focus(),50);
}
async function idpSave(){
  const newDate=document.getElementById('idpInput').value;
  const picker=document.getElementById('inlineDatePicker');
  picker.classList.remove('show');picker.style.display='none';
  if(!_idpTaskId)return;
  const t=st.tasks.find(x=>String(x.id)===_idpTaskId);if(!t)return;
  const prev=t.due_date;
  t.due_date=newDate||null;
  renderAll();
  pushUndo(()=>{t.due_date=prev;renderAll();sbReq('PATCH','tasks',{due_date:prev},`?id=eq.${_idpTaskId}`);},'Changed date');
  await sbReq('PATCH','tasks',{due_date:newDate||null},`?id=eq.${_idpTaskId}`);
  _idpTaskId=null;
}
async function idpClear(){
  document.getElementById('idpInput').value='';
  await idpSave();
}
// Close date picker on outside click
document.addEventListener('mousedown',e=>{
  const picker=document.getElementById('inlineDatePicker');
  if(picker.style.display==='block'&&!e.target.closest('#inlineDatePicker')&&!e.target.closest('.dlbl')){
    picker.classList.remove('show');picker.style.display='none';_idpTaskId=null;
  }
},{capture:false,passive:true});
// Enter key saves, Escape closes — guarded in case element not yet in DOM
document.addEventListener('DOMContentLoaded',()=>{
  const idpEl=document.getElementById('idpInput');
  if(idpEl)idpEl.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();idpSave();}
    if(e.key==='Escape'){document.getElementById('inlineDatePicker').style.display='none';_idpTaskId=null;}
  });
});

// ══════════════════════════════════════════════════════════
// SHOPPING: SORT TOGGLE + COPY LIST
// ══════════════════════════════════════════════════════════
function toggleShopSort(){
  shopSortMode=shopSortMode==='store'?'alpha':'store';
  document.getElementById('shopSortBtn').textContent=shopSortMode==='store'?'By store':'A → Z';
  renderShopFull();
}
function copyShopList(){
  const todo=st.shopping.filter(s=>!s.done);
  if(!todo.length){alert('Shopping list is empty!');return;}
  // Group by store
  const byStore={};
  todo.forEach(s=>{if(!byStore[s.store||'Other'])byStore[s.store||'Other']=[];byStore[s.store||'Other'].push(s.name);});
  let text='Shopping List\n'+'─'.repeat(20)+'\n';
  Object.entries(byStore).sort(([a],[b])=>a.localeCompare(b)).forEach(([store,items])=>{
    text+=`\n${store}:\n`;
    items.forEach(n=>{text+=`  • ${n}\n`;});
  });
  navigator.clipboard.writeText(text).then(()=>{
    const btn=document.querySelector('.ov-banner-btn'); // reuse style
    // Show brief feedback on copy button
    const copyBtn=document.querySelector('[onclick="copyShopList()"]');
    if(copyBtn){const orig=copyBtn.textContent;copyBtn.textContent='✓ Copied!';setTimeout(()=>copyBtn.textContent=orig,1800);}
  }).catch(()=>{
    // Fallback
    const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
  });
}

// ── Quick Notes ──
let _qnOpen=false,_qnNotes=[];
function toggleQN(){_qnOpen=!_qnOpen;document.getElementById('qnPanel').classList.toggle('open',_qnOpen);if(_qnOpen)loadQN();}
async function loadQN(){
  try{
    const data=await sbReq('GET','quick_notes',null,'?is_visible=eq.true&order=created_at.asc&select=*');
    _qnNotes=data||[];renderQN();
  }catch(e){console.warn('loadQN error',e);}
}
function renderQN(){
  const el=document.getElementById('qnList');
  if(!el)return;
  if(!_qnNotes.length){el.innerHTML='<div class="qn-empty">No notes yet</div>';return;}
  el.innerHTML=_qnNotes.map(n=>`
    <div class="qn-item">
      <div class="qn-bullet"></div>
      <span class="qn-text">${escHtml(n.note_text)}</span>
      <button class="qn-del" onclick="event.stopPropagation();deleteQN(${n.id})" title="Remove">✕</button>
    </div>`).join('');
}
function escHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
async function addQN(){
  const inp=document.getElementById('qnInput');
  const txt=(inp?.value||'').trim();
  if(!txt)return;
  inp.value='';
  try{
    const sv=await sbReq('POST','quick_notes',{note_text:txt,is_visible:true});
    if(sv&&sv[0])_qnNotes.push(sv[0]);
    renderQN();
    document.getElementById('qnList').scrollTop=9999;
  }catch(e){console.warn('addQN error',e);}
}
async function deleteQN(id){
  _qnNotes=_qnNotes.filter(n=>n.id!==id);renderQN();
  try{
    await sbReq('PATCH','quick_notes',{is_visible:false,hidden_at:new Date().toISOString()},`?id=eq.${id}`);
  }catch(e){console.warn('deleteQN error',e);}
}
// Close panel on outside click
document.addEventListener('click',function(e){
  if(_qnOpen&&!e.target.closest('#qnPanel')&&!e.target.closest('#qnBtn')){_qnOpen=false;document.getElementById('qnPanel').classList.remove('open');}
});


// ── Monthly Cal Search ──────────────────────────────────────────────
let _moSearchMatches=[],_moSearchIdx=0,_moSearchQuery='',_moSugIdx=-1;

function _moGetAllNames(){
  const seen=new Set(),names=[];
  document.querySelectorAll('#mCells .mcell-t').forEach(chip=>{
    const span=chip.querySelector('span[style*="flex:1"]');
    if(span){const t=span.textContent.trim();if(t&&!seen.has(t)){seen.add(t);names.push(t);}}
  });
  return names;
}

function moSearch(q){
  _moSearchQuery=q.trim().toLowerCase();
  _moSearchMatches=[];_moSearchIdx=0;_moSugIdx=-1;
  document.querySelectorAll('#mCells .mcell-t').forEach(c=>c.classList.remove('mo-search-hl','mo-search-hl-cur'));
  const countEl=document.getElementById('moSearchCount');
  const prevBtn=document.getElementById('moSearchPrev');
  const nextBtn=document.getElementById('moSearchNext');
  const clearBtn=document.getElementById('moSearchClear');
  clearBtn.style.display=q?'':'none';
  if(!_moSearchQuery){
    countEl.style.display='none';prevBtn.style.display='none';nextBtn.style.display='none';
    _moHideSug();return;
  }
  _moShowSug(q);
  document.querySelectorAll('#mCells .mcell-t').forEach(chip=>{
    const span=chip.querySelector('span[style*="flex:1"]');
    if(span&&span.textContent.toLowerCase().includes(_moSearchQuery)){
      chip.classList.add('mo-search-hl');_moSearchMatches.push(chip);
    }
  });
  if(!_moSearchMatches.length){countEl.textContent='0 results';countEl.style.display='';prevBtn.style.display='none';nextBtn.style.display='none';return;}
  _moSearchMatches[0].classList.add('mo-search-hl-cur');
  _moSearchIdx=0;_moScrollToMatch(0);
  countEl.textContent=`1 of ${_moSearchMatches.length}`;
  countEl.style.display='';prevBtn.style.display='';nextBtn.style.display='';
}

function moSearchNav(dir){
  if(!_moSearchMatches.length)return;
  _moSearchMatches[_moSearchIdx].classList.remove('mo-search-hl-cur');
  _moSearchIdx=(_moSearchIdx+dir+_moSearchMatches.length)%_moSearchMatches.length;
  _moSearchMatches[_moSearchIdx].classList.add('mo-search-hl-cur');
  _moScrollToMatch(_moSearchIdx);
  document.getElementById('moSearchCount').textContent=`${_moSearchIdx+1} of ${_moSearchMatches.length}`;
}

function moSearchKey(e){
  const sug=document.getElementById('moSearchSug');
  const items=[...sug.querySelectorAll('.mo-sug-item')];
  if(e.key==='ArrowDown'){e.preventDefault();_moSugIdx=Math.min(_moSugIdx+1,items.length-1);_moSugHighlight(items);}
  else if(e.key==='ArrowUp'){e.preventDefault();_moSugIdx=Math.max(_moSugIdx-1,0);_moSugHighlight(items);}
  else if(e.key==='Enter'){
    if(_moSugIdx>=0&&items[_moSugIdx]){_moPickSug(items[_moSugIdx].dataset.val);return;}
    _moHideSug();moSearchNav(e.shiftKey?-1:1);
  }
  else if(e.key==='Escape'){moSearchClear();}
}

function _moSugHighlight(items){
  items.forEach((el,i)=>{el.style.background=i===_moSugIdx?'rgba(167,139,250,.18)':'';});
  if(items[_moSugIdx])items[_moSugIdx].scrollIntoView({block:'nearest'});
}

function _moShowSug(q){
  const sug=document.getElementById('moSearchSug');
  const ql=q.toLowerCase();
  const matches=_moGetAllNames().filter(n=>n.toLowerCase().includes(ql)).slice(0,8);
  if(!matches.length){_moHideSug();return;}
  sug.innerHTML='';_moSugIdx=-1;
  matches.forEach(name=>{
    const item=document.createElement('div');item.className='mo-sug-item';item.dataset.val=name;
    const idx=name.toLowerCase().indexOf(ql);
    const before=escHtml(name.slice(0,idx));
    const match=`<strong style="color:#7c3aed">${escHtml(name.slice(idx,idx+q.length))}</strong>`;
    const after=escHtml(name.slice(idx+q.length));
    item.innerHTML=before+match+after;
    item.style.cssText='padding:6px 10px;font-size:10px;cursor:pointer;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    item.addEventListener('mousedown',e=>{e.preventDefault();_moPickSug(name);});
    item.addEventListener('mouseenter',()=>{_moSugIdx=matches.indexOf(name);_moSugHighlight([...sug.querySelectorAll('.mo-sug-item')]);});
    sug.appendChild(item);
  });
  sug.style.display='block';
}

function _moPickSug(name){
  const inp=document.getElementById('moSearchInput');
  inp.value=name;_moHideSug();moSearch(name);
}

function _moHideSug(){document.getElementById('moSearchSug').style.display='none';_moSugIdx=-1;}

function moSearchFocus(){if(_moSearchQuery)_moShowSug(document.getElementById('moSearchInput').value);}
function moSearchBlur(){setTimeout(_moHideSug,150);}

function moSearchClear(){
  const inp=document.getElementById('moSearchInput');inp.value='';
  moSearch('');inp.focus();
}

function _moScrollToMatch(i){
  const chip=_moSearchMatches[i];
  const mgrid=document.querySelector('#mModal .mgrid');
  if(!chip||!mgrid)return;
  const cell=chip.closest('.mcell');if(!cell)return;
  const mdow=document.getElementById('mDow');
  const mdowH=mdow?mdow.offsetHeight:0;
  mgrid.scrollTo({top:Math.max(0,cell.offsetTop-mgrid.offsetTop-mdowH-40),behavior:'smooth'});
}
