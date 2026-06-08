let _vidPageInit=false;
// ── Cat-select helpers ──────────────────────────────────────────────────────────
function _catStyle(v){return CATS[(v||'').toLowerCase()]||{bg:'#f1f5f9',t:'#334155',b:'rgba(148,163,184,.2)'};}
function toggleCatDrop(id){const d=document.getElementById(id+'Drop');if(!d)return;const o=d.classList.contains('open');document.querySelectorAll('.cat-sel-drop.open').forEach(el=>el.classList.remove('open'));if(!o)d.classList.add('open');}
function _applyCatTrigger(id,v){const s=_catStyle(v);const tr=document.getElementById(id+'Trigger');if(tr){tr.style.background=s.bg;tr.style.color=s.t;tr.style.borderColor=s.b;}const lbl=document.getElementById(id+'Lbl');if(lbl)lbl.textContent=v;}
function pickCat(id,v,_fromKb){const inp=document.getElementById(id);if(inp)inp.value=v;_applyCatTrigger(id,v);const drop=document.getElementById(id+'Drop');if(drop)drop.classList.remove('open');if(_fromKb){const nextId=id==='tCat'?'tDue':'qaDue';setTimeout(()=>{const n=document.getElementById(nextId);if(n)n.focus();},0);}else{const nameId=id==='tCat'?'tName':'qaName';const nm=document.getElementById(nameId);if(nm){nm.focus();const l=nm.value.length;nm.setSelectionRange(l,l);}}}
function setCatSel(id,v){const inp=document.getElementById(id);if(inp)inp.value=v;_applyCatTrigger(id,v);}
function _catSelKey(e,id){if(e.key==='ArrowDown'||e.key===' '||e.key==='Enter'){e.preventDefault();const drop=document.getElementById(id+'Drop');if(!drop.classList.contains('open')){document.querySelectorAll('.cat-sel-drop.open').forEach(d=>d.classList.remove('open'));drop.classList.add('open');}const opts=drop.querySelectorAll('.cat-sel-opt');if(opts[0])opts[0].focus();}else if(e.key==='Escape'){document.getElementById(id+'Drop').classList.remove('open');}}
function _catOptKey(e,id,idx){const drop=document.getElementById(id+'Drop');const opts=drop.querySelectorAll('.cat-sel-opt');if(e.key==='ArrowDown'){e.preventDefault();if(opts[idx+1])opts[idx+1].focus();}else if(e.key==='ArrowUp'){e.preventDefault();if(idx===0)document.getElementById(id+'Trigger').focus();else if(opts[idx-1])opts[idx-1].focus();}else if(e.key==='Enter'||e.key===' '){e.preventDefault();pickCat(id,opts[idx].dataset.val,true);}else if(e.key==='Escape'){drop.classList.remove('open');document.getElementById(id+'Trigger').focus();}else if(e.key==='Tab'){drop.classList.remove('open');}}
const _CAT_OPT_LIST=[{v:'Home'},{v:'My work'},{v:'Work'},{v:'Social'},{v:'Weekly Goals'}];
function catSelHTML(id,def){const ds=_catStyle(def);const opts=_CAT_OPT_LIST.map((c,i)=>{const s=_catStyle(c.v);return`<div class="cat-sel-opt" tabindex="-1" data-val="${c.v}" style="background:${s.bg};color:${s.t}" onclick="pickCat('${id}','${c.v}')" onkeydown="_catOptKey(event,'${id}',${i})">${c.v}</div>`;}).join('');return `<div class="cat-sel-wrap" id="${id}Wrap"><input type="hidden" id="${id}" value="${def}"><div class="cat-sel-trigger" id="${id}Trigger" tabindex="0" style="background:${ds.bg};color:${ds.t};border-color:${ds.b}" onclick="toggleCatDrop('${id}')" onkeydown="_catSelKey(event,'${id}')"><span id="${id}Lbl">${def}</span><span style="opacity:.5;font-size:9px;margin-left:2px">▾</span></div><div class="cat-sel-drop" id="${id}Drop">${opts}</div></div>`;}
document.addEventListener('click',e=>{if(!e.target.closest('.cat-sel-wrap'))document.querySelectorAll('.cat-sel-drop.open').forEach(d=>d.classList.remove('open'));if(!e.target.closest('#dailyHabitPopup')&&!e.target.closest('#dailyHabitsSection'))closeDailyHabitPopup();});

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
    const def=(ctx==='kanban'||ctx==='wkc')&&kcat?kcat:'Home';
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
    renderShopOv();return;
  }
  if(qaCtx==='rec'){openWrRuleAddModal();return;}
  const cat=document.getElementById('qaCat')?.value||'Home';
  const due=document.getElementById('qaDue')?.value||null;
  const imp=document.getElementById('qaImp')?.checked||false;
  const notes=document.getElementById('qaNotes')?.value.trim()||null;
  let ds=due;
  if(!ds){if(qaCtx==='today')ds=d2s(getDayDate(dayOff));else if(qaCtx==='week')ds=d2s(getWkDates(wkOff)[0]);else if(qaCtx==='wkc')ds=qaDsTarget||null;else ds=null;}
  // Parse @time or @time-time range from name (e.g. @1:30pm, @2pm, @3:30-6pm, @3-5pm)
  const _timeRx=/@(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i;
  const _tm=n.match(_timeRx);
  let _smAt=null,_durAt=null;
  if(_tm){const _endAp=(_tm[6]||'').toLowerCase();const _startAp=(_tm[3]||_tm[6]||'').toLowerCase();let h=parseInt(_tm[1]),mm=parseInt(_tm[2]||'0');if(_startAp==='pm'&&h!==12)h+=12;else if(_startAp==='am'&&h===12)h=0;else if(!_startAp&&h>=1&&h<=8)h+=12;_smAt=h*60+mm;if(_tm[4]){let eh=parseInt(_tm[4]),emm=parseInt(_tm[5]||'0');if(_endAp==='pm'&&eh!==12)eh+=12;else if(_endAp==='am'&&eh===12)eh=0;else if(!_endAp&&eh>=1&&eh<=8)eh+=12;const endSm=eh*60+emm;if(endSm>_smAt)_durAt=endSm-_smAt;}}
  if(_smAt!==null&&!ds)ds=d2s(getDayDate(dayOff));
  const taskName=n;
  const _adQA=(c)=>{const lc=(c||'').toLowerCase();if(lc==='social')return 180;if(lc==='work'||lc==='my work'||lc==='recurring')return 60;return 30;};
  const t={id:'l-'+Date.now(),name:taskName,category:cat,due_date:ds,done:false,important:imp,notes:notes||null};
  let _blk=null;
  if(_smAt!==null&&ds){_blk={id:crypto.randomUUID(),title:taskName,ds,sm:_smAt,dur:_durAt||_adQA(cat),cat,taskId:String(t.id)};st.blocks.push(_blk);}
  st.tasks.push(t);save();renderAll();if(_blk&&document.getElementById('tbGrid'))renderDayTB();
  let taskServerId=null;
  pushUndo(()=>{const rid=taskServerId||t.id;st.tasks=st.tasks.filter(x=>String(x.id)!==String(rid));if(_blk)st.blocks=st.blocks.filter(b=>b.id!==_blk.id);renderAll();if(taskServerId)sbReq('DELETE','tasks',null,`?id=eq.${taskServerId}`);if(_blk)sbDeleteBlock(_blk.id);},'Added task');
  const sv=await sbReq('POST','tasks',{name:taskName,category:cat,due_date:ds,done:false,important:imp,notes:notes||null});
  if(sv&&sv[0]){st.tasks=st.tasks.filter(x=>String(x.id)!==String(sv[0].id));const i=st.tasks.findIndex(x=>x.id===t.id);if(i>-1){st.tasks[i]=sv[0];}else st.tasks.push(sv[0]);taskServerId=String(sv[0].id);
    if(_blk){_blk.taskId=String(sv[0].id);sbSaveBlock(_blk);}
    renderAll();
  }
}
document.addEventListener('click',e=>{
  const p=document.getElementById('qaPopup');if(!p.classList.contains('open'))return;
  if(!p.contains(e.target)&&!e.target.closest('.btn-plus,#todPlusBtn,.wkc-add-btn'))closeQA();
});
document.addEventListener('click',e=>{
  const pop=document.getElementById('pupFilterPop');if(!pop||!pop.classList.contains('pfopen'))return;
  if(!pop.contains(e.target)&&!e.target.closest('th[ondblclick]'))pop.classList.remove('pfopen');
});

// ── Task CRUD ──────────────────────────────────────────────────────────────────
async function toggleTask(id,done,mode=''){
  const t=st.tasks.find(x=>String(x.id)===String(id));if(!t)return;const prev=t.done;t.done=done;
  const sid=String(id);localOverrides[sid]={...localOverrides[sid],done};pendingLocal.add(sid);
  // Sync linked TB blocks _done state
  if(st.blocks)st.blocks.filter(b=>String(b.taskId)===String(id)).forEach(b=>b._done=done);
  const rerender=()=>{
    if(mode==='wk'||mode==='week'){renderWkCal();renderWkSummary();renderToday();renderKanban();renderUnassigned();if(document.getElementById('woModal')?.classList.contains('open'))renderWOModal();save();}
    else renderAll();
    if(document.getElementById('tbGrid'))renderDayTB();
  };
  // If this is a vid tab task, sync tab stage on the video instantly
  if(t.notes&&t.notes.startsWith('_vid:')){
    const vidId=t.notes.replace('_vid:','');
    if(done&&typeof _vidCompleteTabUp==='function')_vidCompleteTabUp(vidId);
    if(!done&&typeof _vidUncompleteTabUp==='function')_vidUncompleteTabUp(vidId);
  }
  rerender();
  const linkedBlocks=st.blocks?st.blocks.filter(b=>String(b.taskId)===String(id)):[];
  pushUndo(()=>{t.done=prev;localOverrides[sid]={...localOverrides[sid],done:prev};pendingLocal.add(sid);if(st.blocks)st.blocks.filter(b=>String(b.taskId)===String(id)).forEach(b=>b._done=prev);rerender();sbReq('PATCH','tasks',{done:prev},`?id=eq.${id}`).then(()=>pendingLocal.delete(sid));linkedBlocks.forEach(b=>sbUpdateBlock(b.id,{done:prev}));},(done?'Checked':'Unchecked')+' task');
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
  // Remove any time blocks linked to this task (by taskId or title match for local-id blocks)
  const linkedBlocks=st.blocks?st.blocks.filter(b=>String(b.taskId)===String(id)||(b.title&&b.title===copy.name&&!b.taskId)):[];
  if(st.blocks)st.blocks=st.blocks.filter(b=>!(String(b.taskId)===String(id)||(b.title&&b.title===copy.name&&!b.taskId)));
  renderAll();if(document.getElementById('tbGrid'))renderDayTB();save();
  // DELETE from DB only if task has a real server ID (not a local temp ID)
  if(!String(id).startsWith('l-'))await sbReq('DELETE','tasks',null,`?id=eq.${id}`);
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
  document.getElementById('tDue').value=tPreDate||'';document.getElementById('tImp').checked=false;const _tnA=document.getElementById('tNotes');_tnA.value='';_tnA.style.height='';_tnA.style.overflowY='hidden';tPreDate=null;
  const _tEl2=document.getElementById('tTime');if(_tEl2)_tEl2.value='';const _tEndEl2=document.getElementById('tTimeEnd');if(_tEndEl2)_tEndEl2.value='';
  document.getElementById('tModal').classList.add('open');setTimeout(()=>{const _el=document.getElementById('tName');if(_el){_el.focus();const _l=_el.value.length;_el.setSelectionRange(_l,_l);}},80);
}
function openEditTask(id){
  const t=st.tasks.find(x=>String(x.id)===String(id));if(!t)return;
  tMode='edit';tId=id;
  document.getElementById('tMTitle').textContent='Edit Task';document.getElementById('tSaveBtn').textContent='Save';
  document.getElementById('tName').value=t.name;setCatSel('tCat',t.category||'Home');
  document.getElementById('tDue').value=t.due_date||'';document.getElementById('tImp').checked=!!t.important;const _tnE=document.getElementById('tNotes');_tnE.value=t.notes||'';_tnE.style.height='auto';_tnE.style.height=Math.min(_tnE.scrollHeight,160)+'px';_tnE.style.overflowY=_tnE.scrollHeight>=160?'auto':'hidden';
  const _tds=(t.due_date||'').split('T')[0];const _tblk=_tds?st.blocks.find(b=>String(b.taskId)===String(id)&&b.ds===_tds):null;const _tEl=document.getElementById('tTime');if(_tEl)_tEl.value=_tblk?`${String(Math.floor(_tblk.sm/60)).padStart(2,'0')}:${String(_tblk.sm%60).padStart(2,'0')}`:'';
  const _tEndEl=document.getElementById('tTimeEnd');if(_tEndEl)_tEndEl.value=_tblk?`${String(Math.floor((_tblk.sm+_tblk.dur)/60)).padStart(2,'0')}:${String((_tblk.sm+_tblk.dur)%60).padStart(2,'0')}`:'';
  document.getElementById('tModal').classList.add('open');setTimeout(()=>{const _el=document.getElementById('tName');if(_el){_el.focus();const _l=_el.value.length;_el.setSelectionRange(_l,_l);}},80);
}
async function saveTModal(){
  const n=document.getElementById('tName').value.trim();if(!n){closeMod('tModal');return;}
  const c=document.getElementById('tCat').value,imp=document.getElementById('tImp').checked;let d=document.getElementById('tDue').value.trim()||null;
  const notes=document.getElementById('tNotes').value.trim()||null;
  closeMod('tModal');
  const _adT=(cc)=>{const lc=(cc||'').toLowerCase();if(lc==='social')return 180;if(lc==='work'||lc==='my work'||lc==='recurring')return 60;return 30;};
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
    t.due_date=d;
    // Parse @time or @time-time range from name (e.g. @1:30pm, @2pm, @3:30-6pm)
    const _timeRx=/@(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i;
    const _tmMatch=n.match(_timeRx);
    let _smFromName=null,_durFromName=null;
    if(_tmMatch){const _endAp=(_tmMatch[6]||'').toLowerCase();const _startAp=(_tmMatch[3]||_tmMatch[6]||'').toLowerCase();let h=parseInt(_tmMatch[1]),mm=parseInt(_tmMatch[2]||'0');if(_startAp==='pm'&&h!==12)h+=12;else if(_startAp==='am'&&h===12)h=0;else if(!_startAp&&h>=1&&h<=8)h+=12;_smFromName=h*60+mm;if(_tmMatch[4]){let eh=parseInt(_tmMatch[4]),emm=parseInt(_tmMatch[5]||'0');if(_endAp==='pm'&&eh!==12)eh+=12;else if(_endAp==='am'&&eh===12)eh=0;else if(!_endAp&&eh>=1&&eh<=8)eh+=12;const endSm=eh*60+emm;if(endSm>_smFromName)_durFromName=endSm-_smFromName;}}
    // Handle time block from @time in name or tTime field
    const _ttVal=document.getElementById('tTime')?.value;
    const _ttEndVal=document.getElementById('tTimeEnd')?.value;
    const _parseDur=(startSm,endVal,cat)=>{if(endVal){const em=parseInt(endVal.split(':')[0])*60+parseInt(endVal.split(':')[1]);if(em>startSm)return em-startSm;}if(_durFromName)return _durFromName;return _adT(cat);};
    if(_smFromName!==null&&!d){d=d2s(getDayDate(dayOff));t.due_date=d;}
    if(d){const _ttDs=d;const _existBlk=st.blocks.find(b=>String(b.taskId)===stid&&b.ds===_ttDs);const _ttSmExplicit=_ttVal?parseInt(_ttVal.split(':')[0])*60+parseInt(_ttVal.split(':')[1]):null;const _ttSm=_ttSmExplicit!==null?_ttSmExplicit:(!_existBlk&&_smFromName!==null?_smFromName:null);if(_ttSm!==null){const _dur=_parseDur(_ttSm,_ttEndVal,c);if(_existBlk){_existBlk.sm=_ttSm;_existBlk.dur=_dur;_existBlk.title=n;_existBlk.cat=c;sbSaveBlock(_existBlk);}else{const _nb={id:crypto.randomUUID(),title:n,ds:_ttDs,sm:_ttSm,dur:_dur,cat:c,taskId:stid};st.blocks.push(_nb);sbSaveBlock(_nb);}}else if(_existBlk){_existBlk.title=n;_existBlk.cat=c;sbSaveBlock(_existBlk);}}
    renderAll();if(document.getElementById('tbGrid'))renderDayTB();
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
    const t={id:'l-'+Date.now(),name:n,category:c,due_date:d,done:false,important:imp,notes};st.tasks.push(t);
    // Create time block if start time provided
    const _ntTime=document.getElementById('tTime')?.value;const _ntTimeEnd=document.getElementById('tTimeEnd')?.value;
    if(_ntTime&&d){const _ntSm=parseInt(_ntTime.split(':')[0])*60+parseInt(_ntTime.split(':')[1]);const _ntDur=_ntTimeEnd?(() =>{const em=parseInt(_ntTimeEnd.split(':')[0])*60+parseInt(_ntTimeEnd.split(':')[1]);return em>_ntSm?em-_ntSm:_adT(c);})():_adT(c);const _nb={id:crypto.randomUUID(),title:n,ds:d,sm:_ntSm,dur:_ntDur,cat:c,taskId:String(t.id)};st.blocks.push(_nb);sbSaveBlock(_nb);}
    renderAll();
    pushUndo(()=>{st.tasks=st.tasks.filter(x=>x.id!==t.id);st.blocks=st.blocks.filter(b=>String(b.taskId)!==String(t.id));renderAll();sbReq('DELETE','tasks',null,`?id=eq.${t.id}`);},'Added task');
    const sv=await sbReq('POST','tasks',{name:n,category:c,due_date:d,done:false,important:imp,notes:notes||null});if(sv&&sv[0]){const i=st.tasks.findIndex(x=>x.id===t.id);if(i>-1){st.tasks[i]=sv[0];const _blk=st.blocks.find(b=>String(b.taskId)===String(t.id));if(_blk){_blk.taskId=String(sv[0].id);sbSaveBlock(_blk);}}}
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
  const sf=document.getElementById('shopFull');if(!sf){renderShopOv();return;}
  if(mode==='manual'){
    sf.innerHTML='';
    const sorted=[...[...todo].sort((a,b)=>(a.shop_order??9999)-(b.shop_order??9999)),...done];
    sorted.forEach(s=>{
      const el=document.createElement('div');
      el.className='ti'+(s.done?' done':'');el.id='ti-shop-cal-'+s.id;
      el.innerHTML=`<input type="checkbox" class="chk"${s.done?' checked':''}><span class="tn">${escHtml(s.name)}</span><span class="cpill" style="background:none;color:#94a3b8;border:none;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;padding:0;flex-shrink:0;margin-left:auto;margin-right:4px">${escHtml(s.store||'Other')}</span><button class="delbtn">✕</button>`;
      el.querySelector('.chk').addEventListener('change',e=>togShop(s.id,e.target.checked));
      el.querySelector('.delbtn').addEventListener('click',e=>{e.stopPropagation();delShop(s.id);});
      let _shopDragged=false;
      el.addEventListener('click',e=>{if(_shopDragged){_shopDragged=false;return;}tiClickShop(e,s.id);});
      el.addEventListener('dblclick',e=>tiDblShop(e,s.id));
      el.addEventListener('contextmenu',e=>showCtxShop(e,s.id));
      if(!s.done){
        el.addEventListener('mousedown',e=>{
          if(e.target.closest('.chk')||e.target.closest('.delbtn'))return;
          let dragging=false;const startY=e.clientY;let ph=null;
          const onMove=ev=>{
            const dy=ev.clientY-startY;
            if(!dragging&&Math.abs(dy)<5)return;
            if(!dragging){window.getSelection()?.removeAllRanges();dragging=true;el.style.opacity='.35';ph=document.createElement('div');ph.style.cssText=`height:${el.offsetHeight}px;margin:1px 6px;border-radius:7px;background:rgba(109,95,230,.12);border:2px dashed rgba(109,95,230,.45);box-sizing:border-box;pointer-events:none`;}
            ev.preventDefault();
            const rows=[...document.querySelectorAll('#shopFull .ti:not(.done)')].filter(r=>r!==el&&r!==ph);
            let inserted=false;
            for(const r of rows){const rc=r.getBoundingClientRect();if(ev.clientY<rc.top+rc.height/2){sf.insertBefore(ph,r);inserted=true;break;}}
            if(!inserted&&rows.length)rows[rows.length-1].after(ph);
          };
          const onUp=()=>{
            document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);
            el.style.opacity='';
            if(dragging&&ph){
              _shopDragged=true;sf.insertBefore(el,ph);ph.remove();
              const allRows=[...document.querySelectorAll('#shopFull .ti:not(.done)')];
              const items=[...todo].sort((a,b)=>(a.shop_order??9999)-(b.shop_order??9999));
              allRows.forEach((row,i)=>{const id=row.id.replace('ti-shop-cal-','');const item=items.find(x=>String(x.id)===id);if(item)item.shop_order=i;});
              save();renderShopOv();
              allRows.forEach(row=>{const id=row.id.replace('ti-shop-cal-','');const item=items.find(x=>String(x.id)===id);if(item)sbReqNullable('PATCH','shopping_list',{shop_order:item.shop_order},`?id=eq.${item.id}`);});
            }else if(dragging){_shopDragged=true;if(ph)ph.remove();}
          };
          document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
        });
      }
      sf.appendChild(el);
    });
    renderShopOv();return;
  }
  let html='';
  if(mode==='alpha'){
    const all=[...todo,...done].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    html=all.map(s=>`<div class="ti ${s.done?'done':''}" id="ti-shop-cal-${s.id}" draggable="true" ondragstart="dragId='shop::${s.id}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);" ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);" onclick="tiClickShop(event,'${s.id}')" ondblclick="tiDblShop(event,'${s.id}')"><input type="checkbox" class="chk" ${s.done?'checked':''} onchange="togShop('${s.id}',this.checked)"><span class="tn">${s.name}</span><span class="cpill" style="background:none;color:#94a3b8;border:none;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;padding:0;flex-shrink:0;margin-left:auto;margin-right:4px">${s.store||'Other'}</span><button class="delbtn" onclick="delShop('${s.id}')">✕</button></div>`).join('');
  } else {
    const g={};[...todo,...done].forEach(s=>{const k=s.store||'Other';if(!g[k])g[k]=[];g[k].push(s);});
    html=Object.entries(g).sort(([a],[b])=>a.localeCompare(b)).map(([store,items])=>
      `<div style="padding:5px 10px 2px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-top:2px">${store}</div>${items.map(s=>`<div class="ti ${s.done?'done':''}" id="ti-shop-cal-${s.id}" draggable="true" ondragstart="dragId='shop::${s.id}';event.dataTransfer.effectAllowed='move';event.currentTarget.classList.add('dragging');document.body.classList.add('body-dragging');showWkcEdges(true);" ondragend="event.currentTarget.classList.remove('dragging');document.body.classList.remove('body-dragging');showWkcEdges(false);" onclick="tiClickShop(event,'${s.id}')" ondblclick="tiDblShop(event,'${s.id}')"><input type="checkbox" class="chk" ${s.done?'checked':''} onchange="togShop('${s.id}',this.checked)"><span class="tn">${s.name}</span><span class="cpill" style="background:none;color:#94a3b8;border:none;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;padding:0;flex-shrink:0;margin-left:auto;margin-right:4px">${s.store||'Other'}</span><button class="delbtn" onclick="delShop('${s.id}')">✕</button></div>`).join('')}`
    ).join('');
  }
  sf.innerHTML=html;
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
function skipWRec(rid,wkKey){
  const r=st.recurring.find(x=>String(x.id)===String(rid));if(!r)return;
  if(!r._dateOverrides)r._dateOverrides={};
  const prev=r._dateOverrides[wkKey];
  r._dateOverrides[wkKey]='__skip__';
  const linkedBlocks=st.blocks?st.blocks.filter(b=>String(b.recId)===String(rid)&&isInWk(b.ds,wkOff)):[];
  if(st.blocks)st.blocks=st.blocks.filter(b=>!(String(b.recId)===String(rid)&&isInWk(b.ds,wkOff)));
  save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();
  linkedBlocks.forEach(b=>sbDeleteBlock(b.id));
  sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));
  pushUndo(()=>{if(!r._dateOverrides)r._dateOverrides={};if(prev!==undefined)r._dateOverrides[wkKey]=prev;else delete r._dateOverrides[wkKey];linkedBlocks.forEach(b=>{if(st.blocks)st.blocks.push(b);sbSaveBlock(b);});save();renderAll();if(document.getElementById('tbGrid'))renderDayTB();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));},'Skipped WR task this week');
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
let _moRecMap={};
let _moNavYear=new Date().getFullYear();
let _moExpandedCells=new Set();
function openMModal(){
  _moNavYear=new Date().getFullYear();
  const inp=document.getElementById('moYearSel');if(inp)inp.value=String(_moNavYear);
  const modal=document.getElementById('mModal');
  const bg=document.querySelector('.bg-canvas');if(bg)bg.classList.add('orbs-paused');
  modal.classList.add('open');
  requestAnimationFrame(()=>{renderMoCal();scrollMoToday();});
}
function moYearStep(dir){
  const inp=document.getElementById('moYearSel');
  const cur=parseInt(inp&&inp.value)||new Date().getFullYear();
  jumpMoYear(cur+dir);
}
function jumpMoYear(yr){
  const parsed=parseInt(yr);if(isNaN(parsed))return;
  _moNavYear=Math.max(2026,parsed);
  const inp=document.getElementById('moYearSel');if(inp)inp.value=String(_moNavYear);
  setTimeout(()=>{
    const mgrid=document.querySelector('#mModal .mgrid');
    const firstSep=[...document.querySelectorAll('#mCells .mo-sep')].find(s=>s.textContent.includes(String(parsed)));
    if(firstSep&&mgrid)mgrid.scrollTop=firstSep.offsetTop-mgrid.offsetTop-18;
  },30);
}
function shiftMo(n){moOff+=n;renderMoCal();}
function renderMoCal(){
  const today=tod();
  const todayDate=new Date(today);
  const curYr=todayDate.getFullYear();
  const rangeStart=new Date(curYr-3,0,1);
  const sd2=(rangeStart.getDay()+6)%7;
  const weekStart=new Date(rangeStart);weekStart.setDate(rangeStart.getDate()-sd2);
  const rangeEnd=new Date(curYr+2,11,31);
  const ed2=(rangeEnd.getDay()+6)%7;
  const wkMonEnd=new Date(rangeEnd);wkMonEnd.setDate(rangeEnd.getDate()-ed2);
  const TOTAL=Math.round((wkMonEnd-weekStart)/(7*86400000))+1;
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
  if(!dowEl.children.length){
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(dn=>{const el=document.createElement('div');el.className='mdowl';el.textContent=dn;dowEl.appendChild(el);});
    const gh=document.createElement('div');gh.className='mdowl';gh.style.cssText='border-left:2px solid rgba(255,255,255,.88);padding:1px 4px';const _ghBtn=document.createElement('button');_ghBtn.className='wo-hdr-btn';_ghBtn.innerHTML='Weekly<br>Objectives';_ghBtn.onclick=()=>{closeMod('mModal');openWOModal();};gh.appendChild(_ghBtn);dowEl.appendChild(gh);
  }
  const cells=document.getElementById('mCells');cells.innerHTML='';
  const _mgs=gc('weekly goals');
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
    // Goals This Week cell
    const wkMonDs=d2s(wkMon);
    const wkEndDate=new Date(wkMon);wkEndDate.setDate(wkMon.getDate()+6);const wkEndDs=d2s(wkEndDate);
    const goalTasks=st.tasks.filter(t=>t.category==='Weekly Goals'&&t.due_date&&t.due_date.split('T')[0]>=wkMonDs&&t.due_date.split('T')[0]<=wkEndDs).sort((a,b)=>{const aI=a.important&&!a.done?0:1,bI=b.important&&!b.done?0:1;if(aI!==bI)return aI-bI;return(a.goal_order??9999)-(b.goal_order??9999);});
    // Carried-over overdue goals from past weeks (current week only)
    const _moIsCurWk=(wkMonDs<=today&&wkEndDs>=today);
    const _moOvGoals=_moIsCurWk?st.tasks.filter(t=>t.category==='Weekly Goals'&&!t.done&&t.due_date&&t.due_date.split('T')[0]<wkMonDs):[];
    const _allGoalTasks=[..._moOvGoals,...goalTasks];
    const goalsCell=document.createElement('div');goalsCell.className='mcell mo-goals-cell';goalsCell.dataset.wkmon=wkMonDs;
    const gBody=document.createElement('div');gBody.className='mcell-body';
    // "Move overdue to this week" banner for monthly view
    if(_moOvGoals.length>0){
      const moBanner=document.createElement('div');moBanner.style.cssText='display:flex;align-items:center;gap:3px;padding:1px 3px;margin-bottom:1px;font-size:7px;font-weight:600;color:#b91c1c';
      const moTxt=document.createElement('span');moTxt.textContent=`${_moOvGoals.length} Overdue`;
      const moBtn=document.createElement('button');moBtn.textContent='Move';moBtn.style.cssText='margin-left:auto;background:#ef4444;color:#fff;border:none;border-radius:3px;padding:0 3px;font-size:6px;font-weight:600;cursor:pointer;font-family:inherit';
      moBtn.addEventListener('click',e=>{e.stopPropagation();const prevDates=_moOvGoals.map(t=>({id:t.id,prev:t.due_date}));_moOvGoals.forEach(t=>{t.due_date=wkMonDs;sbReq('PATCH','tasks',{due_date:wkMonDs},`?id=eq.${t.id}`);});save();renderMoCal();renderWkCal();renderWkSummary();pushUndo(()=>{prevDates.forEach(p=>{const t=st.tasks.find(x=>String(x.id)===String(p.id));if(t){t.due_date=p.prev;sbReq('PATCH','tasks',{due_date:p.prev},`?id=eq.${t.id}`);}});save();renderMoCal();renderWkCal();renderWkSummary();},'Moved overdue goals to this week');});
      moBanner.appendChild(moTxt);moBanner.appendChild(moBtn);
      gBody.appendChild(moBanner);
    }
    const _gCellH=Math.max(70,(window.innerHeight*0.94-100)/4-4);
    const _gAvailH=_gCellH-4;
    const _gMaxVis=_allGoalTasks.length<=Math.floor(_gAvailH/19)?_allGoalTasks.length:Math.max(1,Math.floor((_gAvailH-10)/19));
    const _gKey='goals-'+wkMonDs;const _gIsExp=_moExpandedCells.has(_gKey);const _gVisN=_gIsExp?_allGoalTasks.length:_gMaxVis;
    const _goalsPastMo=wkEndDs<today;
    _allGoalTasks.forEach((t,_gi)=>{
      const _isCarried=_moOvGoals.includes(t);
      const chip=document.createElement('div');chip.className='mcell-t';chip.dataset.tid=String(t.id);chip.draggable=true;
      const _goalOv=(_goalsPastMo&&!t.done)||_isCarried;
      const _imp=t.important&&!t.done&&!_goalOv;
      const _gs=_goalOv?OV:_imp?IMP:{bg:'rgba(255,255,255,.82)',t:'rgba(80,80,95,.75)',b:'rgba(255,255,255,.9)'};
      chip.style.cssText=`background:${_gs.bg};color:${_gs.t};border-color:${_gs.b};cursor:grab${t.done?';opacity:.5':''}`;
      if(_gi>=_gVisN){chip.style.display='none';chip.dataset.moreHidden='1';}
      let _blockMoDrag=false;
      chip.addEventListener('dragstart',e=>{if(_blockMoDrag){e.preventDefault();e.stopPropagation();return;}e.stopPropagation();dragId='wkgoal-mo::'+t.id+'::'+wkMonDs;chip.style.opacity='.4';document.body.classList.add('body-dragging');});
      chip.addEventListener('dragend',()=>{chip.style.opacity='1';document.body.classList.remove('body-dragging');dragId=null;});
      const chk=document.createElement('input');chk.type='checkbox';chk.className='chk';chk.style.cssText='width:8px;height:8px;pointer-events:auto';chk.checked=t.done;
      chk.addEventListener('click',function(e){e.stopPropagation();toggleTask(t.id,this.checked,'week');renderMoCal();});
      const nm=document.createElement('span');nm.style.cssText='flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';nm.textContent=t.name;
      const dx=document.createElement('button');dx.className='chip-del';dx.textContent='✕';dx.addEventListener('click',e2=>{e2.stopPropagation();delTask(t.id,e2);});
      chip.appendChild(chk);chip.appendChild(nm);
      chip.appendChild(dx);
      chip.addEventListener('mousedown',e=>{
        if(e.target.closest('.chk,.chip-del'))return;
        _blockMoDrag=true;chip.draggable=false;
        let dragging=false,mode=null,ph=null,targetCell=null;
        const startX=e.clientX,startY=e.clientY;
        const onMove=ev=>{
          const ddx=ev.clientX-startX,ddy=ev.clientY-startY;
          const dist=Math.abs(ddx)+Math.abs(ddy);
          if(!dragging&&dist<5)return;
          if(!dragging){window.getSelection()?.removeAllRanges();dragging=true;}
          if(!mode&&dist>=15){
            mode=Math.abs(ddx)>Math.abs(ddy)?'horiz':'vert';
            if(mode==='vert'){ph=document.createElement('div');ph.style.cssText=`height:2px;margin:1px 2px;border-radius:99px;background:rgba(150,150,160,.5);pointer-events:none`;gBody.insertBefore(ph,chip);chip.remove();}
            else chip.style.opacity='.4';
          }
          if(!mode)return;
          ev.preventDefault();
          if(mode==='vert'){
            const chips=[...gBody.querySelectorAll('.mcell-t')];let inserted=false;
            for(const c of chips){const rc=c.getBoundingClientRect();if(ev.clientY<rc.top+rc.height/2){gBody.insertBefore(ph,c);inserted=true;break;}}
            if(!inserted&&chips.length)chips[chips.length-1].after(ph);
          }else{
            const allGC=[...document.querySelectorAll('.mo-goals-cell')];
            const curIdx=allGC.indexOf(goalsCell);
            allGC.forEach(c=>c.classList.remove('dov'));
            if(ddx<-30&&curIdx>0){targetCell=allGC[curIdx-1];targetCell.classList.add('dov');}
            else if(ddx>30&&curIdx<allGC.length-1){targetCell=allGC[curIdx+1];targetCell.classList.add('dov');}
            else targetCell=null;
          }
        };
        const onUp=()=>{
          document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);
          _blockMoDrag=false;chip.draggable=true;
          if(mode==='vert'&&ph){
            gBody.insertBefore(chip,ph);ph.remove();chip.style.opacity='';
            const allChips=[...gBody.querySelectorAll('.mcell-t[data-tid]')];
            allChips.forEach((c,i)=>{const task=st.tasks.find(x=>String(x.id)===c.dataset.tid);if(task)task.goal_order=i;});
            save();allChips.forEach(c=>{const task=st.tasks.find(x=>String(x.id)===c.dataset.tid);if(task)sbReqNullable('PATCH','tasks',{goal_order:task.goal_order},`?id=eq.${task.id}`);});
          }else if(mode==='horiz'){
            chip.style.opacity='';document.querySelectorAll('.mo-goals-cell').forEach(c=>c.classList.remove('dov'));
            if(targetCell){
              const tgtWkMonDs=targetCell.dataset.wkmon;
              const gt=st.tasks.find(x=>String(x.id)===String(t.id));
              if(gt&&tgtWkMonDs){
                const prevDs=gt.due_date;
                const deltaMs=new Date(tgtWkMonDs+'T12:00')-new Date(wkMonDs+'T12:00');
                const deltaDays=Math.round(deltaMs/86400000);
                const nd=new Date((gt.due_date||wkMonDs)+'T12:00');nd.setDate(nd.getDate()+deltaDays);
                const nDs=d2s(nd);gt.due_date=nDs;save();renderMoCal();renderAll();
                pushUndo(()=>{gt.due_date=prevDs;save();renderMoCal();renderAll();sbReqNullable('PATCH','tasks',{due_date:prevDs},`?id=eq.${gt.id}`);},'Moved goal week');
                sbReqNullable('PATCH','tasks',{due_date:nDs},`?id=eq.${gt.id}`);
              }
            }
          }else if(ph){const next=ph.nextSibling;ph.remove();gBody.insertBefore(chip,next);chip.style.opacity='';}
          else chip.style.opacity='';
        };
        document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
      });
      gBody.appendChild(chip);
    });
    const _gHidden=_allGoalTasks.length-_gVisN;
    const _gTogStyle='font-size:8px;color:var(--muted);cursor:pointer;padding:1px 2px;border-radius:3px';
    if(_gHidden>0){const more=document.createElement('div');more.style.cssText=_gTogStyle;more.textContent=`+${_gHidden} more`;more.addEventListener('click',e=>{e.stopPropagation();_moExpandedCells.add(_gKey);renderMoCal();});gBody.appendChild(more);}
    if(_gIsExp&&goalTasks.length>_gMaxVis){const less=document.createElement('div');less.style.cssText=_gTogStyle;less.textContent='▴ less';less.addEventListener('click',e=>{e.stopPropagation();_moExpandedCells.delete(_gKey);renderMoCal();});gBody.appendChild(less);}
    goalsCell.appendChild(gBody);
    cells.appendChild(goalsCell);
  }
  // Sync year dropdown
  const yrSel=document.getElementById('moYearSel');
  if(yrSel)yrSel.value=String(_moNavYear);
  if(_moSearchQuery)setTimeout(()=>moSearch(_moSearchQuery),0);
  const mual=document.getElementById('mUAList');mual.innerHTML='';
  const CAT_ORDER=['Home','My work','Work','Social','Recurring'];
  const unassigned=st.tasks
    .filter(t=>!t.due_date&&!t.done&&t.category!=='Long term'&&t.category!=='Weekly Goals')
    .sort((a,b)=>{const ai=CAT_ORDER.indexOf(a.category),bi=CAT_ORDER.indexOf(b.category);return(ai<0?99:ai)-(bi<0?99:bi)||(a.name||'').localeCompare(b.name||'');});
  if(!unassigned.length){const empty=document.createElement('div');empty.style.cssText='font-size:10px;color:var(--subtle);padding:12px 8px;text-align:center';empty.textContent='All tasks assigned ✓';mual.appendChild(empty);}
  unassigned.forEach(t=>{
    const s=gc(t.category);
    const el=document.createElement('div');el.className='uitem';el.draggable=true;
    el.addEventListener('dragstart',e=>dStart(e,t.id));el.addEventListener('dragend',()=>el.style.opacity='');
    el.innerHTML=`<span class="udot" style="background:${s.d}"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name}</span>`;
    mual.appendChild(el);
  });
}
function scrollMoToday(){
  const mgrid=document.querySelector('#mModal .mgrid');
  const tc=document.querySelector('#mCells .mcell.tc');
  if(!tc||!mgrid)return;
  const mdow=document.getElementById('mDow');
  const mdowH=mdow?mdow.offsetHeight:0;
  let top=0,el=tc;
  while(el&&el!==mgrid){top+=el.offsetTop;el=el.offsetParent;}
  mgrid.scrollTop=top-mdowH-64;
}
function moGoToday(){
  _moNavYear=new Date().getFullYear();const yrSel2=document.getElementById('moYearSel');if(yrSel2)yrSel2.value=String(_moNavYear);
  setTimeout(scrollMoToday,30);
}
function mkMCell(date,om,today){
  const ds=d2s(date);const cell=document.createElement('div');
  cell.dataset.ds=ds;
  cell.className='mcell'+(om?' om':'')+(ds===today?' tc':'');
  const _MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  cell.dataset.tip=`${_MO[date.getMonth()]} ${date.getDate()}`;
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
  const finCancelOnDay=typeof _finCancelTasksForDate==='function'?_finCancelTasksForDate(ds):[];
  const undone=[...travelOnDay,...st.tasks.filter(t=>t.due_date&&t.due_date.split('T')[0]===ds&&!t.done&&t.category!=='Weekly Goals'),...extras.filter(t=>t._type!=='travel'),...shopOnDay,...wrecOnDay,...recOnDay,...finCancelOnDay];
  const done=[...st.tasks.filter(t=>t.due_date&&t.due_date.split('T')[0]===ds&&t.done&&t.category!=='Weekly Goals'),...shopOnDayDone];
  const tasks=typeof sortByTypeOrder==='function'?sortByTypeOrder([...undone,...done]):[...undone,...done];
  const _cellH=Math.max(70,(window.innerHeight*0.94-100)/4-4);
  const _availH=_cellH-20;
  const _maxVis=tasks.length<=Math.floor(_availH/19)?tasks.length:Math.max(1,Math.floor((_availH-10)/19));
  const _isExp=_moExpandedCells.has(ds);
  const _visN=_isExp?tasks.length:_maxVis;
  tasks.forEach((t,_ti)=>{
    const isBday=t._type==='birthday';
    const s=t.important&&!t.done?IMP:gc((t._isWrec||t._isWrRule)?'weekly_reset':t.category);
    const isTravel=t._type==='travel';
    const isPast=(isTravel&&t.end_date&&t.end_date<tod())||(isBday&&t.due_date&&t.due_date<tod());
    const chip=document.createElement('div');chip.className='mcell-t';chip.draggable=!t.done&&!isBday;
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
    if(_ti>=_visN){chip.style.display='none';chip.dataset.moreHidden='1';}
    if(!t._virtual&&!t._type)chip.dataset.tid=String(t.id);
    else if(isTravel)chip.dataset.tid='tv-'+t._srcId;
    else if(t._type==='shop')chip.dataset.tid='shop-cal-'+t._shopId;
    else if(t._isWrec)chip.dataset.tid='wrec-'+t._recId;
    else if(t._recId)chip.dataset.tid='rec-virt-'+t._recId;
    // Travel first cell shows label; all cells show delete button on hover
    if(isTravel&&!isVisualFirst){
      chip.innerHTML='<span style="flex:1"></span>';
    }else{
      chip.innerHTML=`<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tmIcon(t)}${escHtml(t._type==='pup'&&typeof _pupDisplayName==='function'?_pupDisplayName(t):t.name)}</span>`;
      if(!isTravel&&!isBday){
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
      const pk=document.createElement('button');pk.className='pack-icon-btn';pk.innerHTML=_PACK_SVG;pk.title='Packing list';pk.style.cssText='margin-right:2px';
      pk.addEventListener('click',e2=>{e2.stopPropagation();openPackingModal(t._srcId);});
      chip.appendChild(pk);
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
  const _hidden=tasks.length-_visN;
  const _toggleStyle='font-size:8px;color:var(--muted);cursor:pointer;padding:1px 2px;border-radius:3px';
  if(_hidden>0){const more=document.createElement('div');more.style.cssText=_toggleStyle;more.textContent=`+${_hidden} more`;more.addEventListener('click',e=>{e.stopPropagation();_moExpandedCells.add(ds);renderMoCal();});body.appendChild(more);}
  if(_isExp&&tasks.length>_maxVis){const less=document.createElement('div');less.style.cssText=_toggleStyle;less.textContent='▴ less';less.addEventListener('click',e=>{e.stopPropagation();_moExpandedCells.delete(ds);renderMoCal();});body.appendChild(less);}
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
      if(s){const prev=s.due_date;const prevOrder=s.shop_order;const prevDs=(prev||'').split('T')[0];const savedShopTBs=st.blocks.filter(b=>b.shopId&&String(b.shopId)===String(shopId)&&b.ds===prevDs).map(b=>({...b}));const newOrder=_shopTopOrder(s);s.shop_order=newOrder;s.due_date=ds;removeTBBlocksForDate(ds,{shopId:s.id,oldDs:prevDs});save();sbReqNullable('PATCH','shopping_list',{due_date:ds,shop_order:newOrder},`?id=eq.${s.id}`);pushUndo(()=>{s.due_date=prev;s.shop_order=prevOrder;savedShopTBs.forEach(b=>{if(!st.blocks.find(x=>x.id===b.id))st.blocks.push(b);sbSaveBlock(b);});save();renderAll();renderMoCal();sbReqNullable('PATCH','shopping_list',{due_date:prev||null,shop_order:prevOrder??null},`?id=eq.${s.id}`);},'Assigned shopping item');}
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
    if(s){const prev=s.due_date;const linkedShopBlks=st.blocks.filter(b=>b.shopId&&String(b.shopId)===String(t._shopId)).map(b=>({...b}));s.due_date=null;st.blocks=st.blocks.filter(b=>!(b.shopId&&String(b.shopId)===String(t._shopId)));linkedShopBlks.forEach(b=>sbDeleteBlock(b.id));save();renderAll();renderMoCal();
      sbReqNullable('PATCH','shopping_list',{due_date:null},`?id=eq.${s.id}`);
      pushUndo(()=>{s.due_date=prev;linkedShopBlks.forEach(b=>{if(!st.blocks.find(x=>x.id===b.id))st.blocks.push(b);sbSaveBlock(b);});save();renderAll();renderMoCal();sbReqNullable('PATCH','shopping_list',{due_date:prev||null},`?id=eq.${s.id}`);},'Removed from calendar');}
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
    const isBday=t._type==='birthday';
    const s=t.important&&!t.done?IMP:gc((t._isWrec||t._isWrRule)?'weekly_reset':t.category);
    const isTravel=t._type==='travel';
    const isPast=(isTravel&&t.end_date&&t.end_date<tod())||(isBday&&t.due_date&&t.due_date<tod());
    const chip=document.createElement('div');chip.className='mcell-t';chip.draggable=!t.done&&!isTravel&&!isBday;
    chip.style.cssText=`background:${s.bg};color:${s.t};border-color:${s.b};display:flex;align-items:center;gap:2px;margin-bottom:3px;cursor:${t.done?'default':isTravel?'pointer':'grab'};${t.done?'opacity:.25;text-decoration:line-through;':''}${isPast?'opacity:.35;':''}`;
    if(!t._virtual&&!t._type)chip.dataset.tid=String(t.id);
    else if(isTravel)chip.dataset.tid='tv-'+t._srcId;
    else if(t._type==='shop')chip.dataset.tid='shop-cal-'+t._shopId;
    else if(t._isWrec)chip.dataset.tid='wrec-'+t._recId;
    else if(t._recId)chip.dataset.tid='rec-virt-'+t._recId;
    chip.innerHTML=`<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tmIcon(t)}${escHtml(t._type==='pup'&&typeof _pupDisplayName==='function'?_pupDisplayName(t):t.name)}</span>`;
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
    const pb=document.getElementById('tvPackBtn');if(pb)pb.style.display='inline-flex';
  } else {
    document.getElementById('travelMTitle').textContent='Add Trip';
    document.getElementById('tvName').value='';document.getElementById('tvDest').value='';
    document.getElementById('tvStart').value=preStart||'';document.getElementById('tvEnd').value=preEnd||'';
    document.getElementById('tvTravelMode').value='';
    document.getElementById('tvNotes').value='';
    const pb=document.getElementById('tvPackBtn');if(pb)pb.style.display='none';
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

// ══════════════════════════════════════════════════════════════════════════════
// ── FINANCE PAGE ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const _FIN_ACCT_COLORS_MAP={'vti':['#10b981','rgba(16,185,129,.45)'],'checking':['#60a5fa','rgba(96,165,250,.45)'],'rsus':['#a78bfa','rgba(167,139,250,.45)'],'rsu':['#a78bfa','rgba(167,139,250,.45)'],'cc points':['#ec4899','rgba(236,72,153,.45)'],'credit card':['#ec4899','rgba(236,72,153,.45)']};
function _finAcctColor(name){const n=(name||'').toLowerCase();return _FIN_ACCT_COLORS_MAP[n]||Object.keys(_FIN_ACCT_COLORS_MAP).reduce((r,k)=>r||( n.includes(k)?_FIN_ACCT_COLORS_MAP[k]:null),null);}
const _FIN_COLORS_FALLBACK=[['#2a9db5','rgba(42,157,181,.45)'],['#eab308','rgba(234,179,8,.45)'],['#38bdf8','rgba(56,189,248,.45)'],['#f97316','rgba(249,115,22,.45)'],['#65a30d','rgba(101,163,13,.45)']];
function _finOf(type){return st.finance.filter(r=>r.type===type);}
function _finFmt(n){return n<0?'-$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function _finFmtRound(n){return n<0?'-$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0}):'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});}
function _finFmtPct(n){return(n>=0?'+':'')+n.toFixed(2)+'%';}
function _finParseNum(s){return parseFloat((s||'').replace(/[$,\s]/g,''))||0;}
function _finN(n,w){return`<span class="fin-mono" style="width:${w||80}px">${_finFmt(n)}</span>`;}
function _finDateFmt(d){if(!d)return'';const p=(d||'').split('-');if(p.length===3)return`<span class="fin-mono" style="width:70px">${p[1]}/${p[2]}/${p[0]}</span>`;return`<span class="fin-mono" style="width:70px">${d}</span>`;}
function _finDateNice(d){if(!d)return'';const p=(d||'').split('-');if(p.length!==3)return d;const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return`${m[parseInt(p[1],10)-1]} ${parseInt(p[2],10)}, ${p[0]}`;}
function _finSnap(){return{finance:JSON.parse(JSON.stringify(st.finance)),finSubs:JSON.parse(JSON.stringify(st.finSubs))};}
function _finRestore(snap){st.finance=snap.finance;st.finSubs=snap.finSubs;renderFinancePage();}
function _finFocusNew(id,field){setTimeout(()=>{const el=document.querySelector(`[data-fid="${id}"][data-field="${field}"]`);if(el){el.focus();const r=document.createRange();r.selectNodeContents(el);const s=window.getSelection();s.removeAllRanges();s.addRange(r);}},50);}

function renderFinancePage(){
  const el=document.getElementById('finPageContent');if(!el)return;
  const accs=_finOf('account').sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const netWorth=accs.filter(a=>!a.exclude).reduce((s,a)=>s+(a.amount||0),0);
  const totalAll=accs.reduce((s,a)=>s+(a.amount||0),0);
  const vtiAcc=accs.find(a=>(a.name||'')==='VTI');
  const purchases=_finOf('vti');
  const totalBought=purchases.reduce((s,p)=>s+Math.abs(p.amount||0),0);
  const currentVal=vtiAcc?vtiAcc.amount||0:0;
  const gain=currentVal-totalBought;
  const gainPct=totalBought?((gain/totalBought)*100):0;

  let html=`<div class="fin-layout">`;
  // Left column: Personal Finances (with KPIs inside) + Investments below
  html+=`<div class="fin-left">`;
  html+=_finRenderPersonal(accs,vtiAcc,currentVal,netWorth,totalAll);
  html+=_finRenderInvestments(purchases,totalBought,gain,gainPct,currentVal);
  html+=`</div>`;
  // Right column: Subscriptions (full height)
  html+=`<div class="fin-right" style="position:relative">`;
  html+=_finRenderSubs();
  html+=`</div>`;
  html+=`</div>`;
  el.innerHTML=html;
}

// ── Inline edit helpers ──────────────────────────────────────────────────────
async function _finEditField(id,field,el){
  const snap=_finSnap();
  const row=st.finance.find(r=>String(r.id)===String(id));if(!row)return;
  const val=field==='name'||field==='date'?el.textContent.trim():_finParseNum(el.textContent);
  if(row[field]===val){renderFinancePage();return;}
  const old=row[field];row[field]=val;
  renderFinancePage();
  pushUndo(()=>{row[field]=old;renderFinancePage();if(!String(id).startsWith('l-'))sbReqNullable('PATCH','finance',{[field]:old},`?id=eq.${id}`);},'Edited '+field);
  if(!String(id).startsWith('l-'))await sbReqNullable('PATCH','finance',{[field]:val},`?id=eq.${id}`);
}

function _finEditable(id,field,val,cls,round){
  const display=typeof val==='number'?(round?_finFmtRound(val):_finFmt(val)):escHtml(val||'');
  const raw=typeof val==='number'?(round?Math.round(val).toString():val.toFixed(2)):(val||'');
  return`<span class="fin-edit ${cls||''}" contenteditable="true" data-fid="${id}" data-field="${field}" onfocus="if(this.dataset.field!=='name'){this.textContent='${raw}';}" onblur="_finEditField('${id}','${field}',this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}">${display}</span>`;
}

// ── Left Top: Personal Finances (KPIs + donut + editable legend) ────────────
function _finRenderPersonal(accs,vtiAcc,currentVal,netWorth,totalAll){
  // Sort: non-excluded by amount desc, then excluded at bottom
  const included=[...accs.filter(a=>!a.exclude)].sort((a,b)=>(b.amount||0)-(a.amount||0));
  const excluded=[...accs.filter(a=>a.exclude)].sort((a,b)=>(b.amount||0)-(a.amount||0));
  const allAccs=[...included,...excluded];
  const chartItems=included.filter(a=>(a.amount||0)>0);
  const total=chartItems.reduce((s,a)=>s+(a.amount||0),0);
  const hasExcluded=excluded.length>0;

  let html=`<div class="card fin-card fin-personal-card" style="position:relative">
    <button class="fin-add-btn" onclick="addFinRow('account')" style="font-size:16px;padding:0 4px;line-height:1;position:absolute;top:12px;right:16px;z-index:1">+</button>
    <div class="fin-hero">
      `;
  // Donut in hero row (right of KPIs)
  let cum=0;let _fbIdx=0;
  const segs=total>0?chartItems.map((a,i)=>{
    const pct=(a.amount||0)/total;const start=cum;cum+=pct;
    const named=_finAcctColor(a.name);
    const fb=named?null:_FIN_COLORS_FALLBACK[_fbIdx++%_FIN_COLORS_FALLBACK.length];
    const color=named?named[0]:fb[0];
    const colorLight=named?named[1]:fb[1];
    return{id:a.id,name:a.name,amt:a.amount,pct,start,color,colorLight};
  }):[];
  // Right side: donut + legend
  html+=`<div class="fin-hero-right">`;
  if(segs.length){
    html+=`<div class="fin-donut-wrap"><svg class="fin-donut" viewBox="0 0 42 42">`;
    html+=`<defs>
      <filter id="finGlass" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur in="SourceAlpha" stdDeviation=".4" result="blur"/>
        <feOffset in="blur" dx="0" dy="-.4" result="topLight"/>
        <feFlood flood-color="white" flood-opacity=".7" result="w1"/>
        <feComposite in="w1" in2="topLight" operator="in" result="innerHighlight"/>
        <feOffset in="blur" dx="0" dy=".5" result="botShadow"/>
        <feFlood flood-color="rgba(0,0,0,.15)" result="dark"/>
        <feComposite in="dark" in2="botShadow" operator="in" result="innerShadow"/>
        <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="innerHighlight"/><feMergeNode in="innerShadow"/></feMerge>
      </filter></defs>`;
    // Rotate group so 0 starts at 12 o'clock
    html+=`<g transform="rotate(-90 21 21)">`;
    html+=`<circle cx="21" cy="21" r="15.9" fill="none" stroke="white" stroke-width="3.5" />`;
    segs.forEach(seg=>{
      const dashLen=seg.pct*100;const gap=0.6;const dashOff=100-(seg.start*100);
      const adjLen=Math.max(dashLen-gap,0.1);
      const adjOff=dashOff-gap/2;
      html+=`<circle cx="21" cy="21" r="15.9" fill="none" stroke="${seg.colorLight}" stroke-width="3" stroke-dasharray="${adjLen} ${100-adjLen}" stroke-dashoffset="${adjOff}" filter="url(#finGlass)" data-fin-seg="${seg.id}"/>`;
      html+=`<circle cx="21" cy="21" r="15.9" fill="none" stroke="transparent" stroke-width="3.5" stroke-dasharray="${adjLen} ${100-adjLen}" stroke-dashoffset="${adjOff}" style="pointer-events:stroke" data-fin-seg="${seg.id}" data-fin-tip-name="${seg.name}" data-fin-tip-amt="${_finFmtRound(seg.amt)}" onmouseenter="_finHover('${seg.id}')" onmouseleave="_finHover(null)"/>`;
    });
    html+=`</g></svg>`;
    html+=`<div class="fin-donut-center"><div class="fin-donut-label">Net Worth</div><div class="fin-donut-val">${_finFmtRound(netWorth)}</div>${hasExcluded?`<div style="font-size:10px;color:var(--text-secondary,#94a3b8)">All: ${_finFmtRound(totalAll)}</div>`:''}</div>`;
    html+=`</div>`;
  }
  html+=`<div class="fin-chart-legend">`;
  allAccs.forEach(a=>{
    const seg=segs.find(s=>s.id===a.id);
    const named=_finAcctColor(a.name);
    const colorSolid=a.exclude?'#cbd5e1':(seg?seg.color:(named?named[0]:'#cbd5e1'));
    const colorPastel=a.exclude?'#cbd5e1':(seg?seg.colorLight:(named?named[1]:'#cbd5e1'));
    const pctStr=seg?`${(seg.pct*100).toFixed(0)}%`:'';
    const excCls=a.exclude?' fin-legend-excluded':'';
    html+=`<div class="fin-legend-row${excCls}" data-fin-id="${a.id}" onmouseenter="_finHover('${a.id}')" onmouseleave="_finHover(null)">
      <span class="fin-legend-dot" style="background:${colorPastel};border:1.5px solid ${colorSolid}"></span>
      <span class="fin-legend-name">${_finEditable(a.id,'name',a.name,'fin-legend-edit-name')}</span>
      <span class="fin-legend-amt">${_finEditable(a.id,'amount',a.amount||0,'fin-legend-edit-amt',true)}</span><span class="fin-legend-pct">${pctStr}</span>
      ${a.exclude?`<button class="fin-excl-btn active" onclick="_finToggleExclude('${a.id}')" title="Include in total">&#x21a9;</button>`:`<button class="fin-excl-btn" onclick="_finToggleExclude('${a.id}')" title="Exclude from total">&#x2212;</button>`}
      <button class="delbtn fin-legend-del" onclick="delFin('${a.id}')">&#x2715;</button>
    </div>`;
  });
  html+=`</div></div>`;
  html+=`</div>`; // close fin-hero
  html+=`</div>`; // close fin-card
  return html;
}

// ── Left Bottom: Investments (VTI) — split: metrics+chart | line items ──────
function _finRenderInvestments(purchases,totalBought,gain,gainPct,currentVal){
  const valid=purchases.filter(p=>p.date&&Math.abs(p.amount||0)>0);
  const sorted=[...valid].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const chronological=[...valid].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const numPurchases=valid.length;
  const avgPurchase=numPurchases?totalBought/numPurchases:0;
  const lastPurchase=sorted.length?sorted[0]:null;

  let html=`<div class="card fin-card fin-inv-card">
    <div class="fin-card-hdr" style="position:relative"><span class="fin-card-title">Investments</span><div style="display:flex;gap:4px;align-items:center"><button class="fin-hist-btn" onclick="openFinInvDetails()">History</button><button class="fin-add-btn" onclick="openFinInvAdd(event)" style="font-size:16px;padding:0 4px;line-height:1">+</button></div></div>
    `;
  // Area chart fills card, KPI floats on top
  if(chronological.length>1){
    let cum=0;
    const dataPoints=chronological.map(p=>{const a=Math.abs(p.amount||0);cum+=a;return{date:p.date,amt:a,cum,ts:new Date(p.date).getTime()};});
    const max=Math.max(...dataPoints.map(d=>d.cum));
    const minTs=dataPoints[0].ts,maxTs=dataPoints[dataPoints.length-1].ts,tsRange=maxTs-minTs||1;
    const pad=5;
    const pts=dataPoints.map(d=>({
      px:pad+((d.ts-minTs)/tsRange)*(100-pad*2),
      py:5+(1-d.cum/max)*85,
      date:d.date,amt:d.amt,cum:d.cum
    }));
    const years=new Set();const yearLabels=[];
    const tsToPx=ts=>pad+((ts-minTs)/tsRange)*(100-pad*2);
    dataPoints.forEach(d=>{const y=(d.date||'').slice(0,4);if(y)years.add(y);});
    const maxYr=Math.max(...[...years].map(Number));
    years.add(String(maxYr+1));
    years.forEach(y=>{const jan1=new Date(y+'-01-01').getTime();const px=tsToPx(jan1);if(px>=-2&&px<=102)yearLabels.push({px,y});});
    const firstY=pts[0].py,lastY=pts[pts.length-1].py;
    const svgPolyFill=pts.map(p=>`${p.px},${p.py}`).join(' ');
    const svgPolyLine=`-5,${firstY} ${svgPolyFill} 105,${lastY}`;
    const svgFillPoly=`-5,${firstY} ${svgPolyFill} 105,${lastY} 105,100 -5,100`;
    html+=`<div class="fin-inv-chart-wrap" style="margin:0;padding:0;border-radius:0;border-top:none;position:relative;flex:1;min-height:0;overflow:hidden">
      <div class="fin-inv-kpi-float">
        <div style="font-size:11px;font-weight:600;color:#1e293b;margin-bottom:4px">Total Gain</div>
        <div style="font-size:22px;font-weight:700;color:#1e293b;line-height:1.1">${_finFmtRound(gain)}</div>
        <div style="font-size:12px;font-weight:600;color:#059669;margin-top:2px">${_finFmtPct(gainPct)}</div>
        <div style="margin-top:10px;display:flex;gap:12px">
          <div><div style="font-size:9px;font-weight:600;color:var(--text-secondary,#64748b)">VTI Value</div><div style="font-size:13px;font-weight:600;color:var(--text-primary,#334155);margin-top:1px">${_finFmtRound(currentVal)}</div></div>
          <div><div style="font-size:9px;font-weight:600;color:var(--text-secondary,#64748b)">Cost Basis</div><div style="font-size:13px;font-weight:600;color:var(--text-primary,#334155);margin-top:1px">${_finFmtRound(totalBought)}</div></div>
        </div>
      </div>
      <div class="fin-inv-chart" style="position:relative;height:100%;min-height:160px">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">
      <defs><linearGradient id="finAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10b981" stop-opacity=".18"/><stop offset="100%" stop-color="#10b981" stop-opacity=".02"/></linearGradient></defs>
      <polygon points="${svgFillPoly}" fill="url(#finAreaGrad)" stroke="none"/>
      <polyline points="${svgPolyLine}" fill="none" stroke="#10b981" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      </svg>`;
    pts.forEach((p,i)=>{
      html+=`<span class="fin-chart-dot" style="left:${p.px}%;top:${p.py}%"></span>`;
    });
    pts.forEach((p,i)=>{
      const prev=i>0?pts[i-1].px:p.px;const next=i<pts.length-1?pts[i+1].px:p.px;
      const left=((prev+p.px)/2);const right=((p.px+next)/2);
      const w=right-left;
      html+=`<span class="fin-chart-dot-hit" style="left:${left.toFixed(2)}%;width:${w.toFixed(2)}%" data-fin-tip-date="${_finDateNice(p.date)}" data-fin-tip-amt="${_finFmtRound(p.amt)}" data-fin-tip-cum="${_finFmtRound(p.cum)}" data-fin-date="${p.date}" data-fin-dot-top="${p.py}" onmouseenter="_finChartHover(this)" onmouseleave="_finChartHover(null)"></span>`;
    });
    yearLabels.forEach(yl=>{
      html+=`<span class="fin-chart-year" style="left:${yl.px.toFixed(1)}%">${yl.y}</span>`;
    });
    html+=`</div></div>`;
  }
  html+=`</div>`;
  return html;
}

// ── Column 3: Subscriptions (finance_subs table) ─────────────────────────────
function _finRenderSubs(){
  const _moAmt=s=>{const a=s.amount||0;const f=s.frequency||'monthly';return f==='yearly'?a/12:f==='6-month'?a/6:f==='weekly'?a*4.33:a;};
  const activeSubs=[...st.finSubs].filter(s=>!s.archived);
  const archivedSubs=[...st.finSubs].filter(s=>s.archived);
  const subs=activeSubs.sort((a,b)=>{if(a.cancel&&!b.cancel)return -1;if(!a.cancel&&b.cancel)return 1;return _moAmt(b)-_moAmt(a);});
  const monthlyTotal=subs.filter(s=>!s.cancel).reduce((s,sub)=>{
    const amt=sub.amount||0;
    if(sub.frequency==='yearly')return s+amt/12;
    if(sub.frequency==='6-month')return s+amt/6;
    if(sub.frequency==='weekly')return s+amt*4.33;
    return s+amt;
  },0);
  const yearlyTotal=monthlyTotal*12;

  let html=`<div class="card fin-card">
    <div class="fin-card-hdr"><span class="fin-card-title">Recurring Expenses</span><div style="display:flex;gap:4px;align-items:center">${archivedSubs.length?`<button class="fin-add-btn" onclick="toggleFinArchive()" style="font-size:11px;padding:1px 6px;line-height:1;opacity:.6" title="View archived">&#128451;</button>`:''}<button class="fin-add-btn" onclick="addFinSub()" style="font-size:16px;padding:0 4px;line-height:1">+</button></div></div>
    <div class="fin-sub-scroll">
    <table class="fin-tbl fin-sub-tbl"><colgroup><col class="fin-col-name"/><col class="fin-col-freq"/><col class="fin-col-due"/><col class="fin-col-amt"/><col class="fin-col-mo"/><col class="fin-col-del"/></colgroup><thead><tr><th style="padding-left:17px!important">Name</th><th style="text-align:center">Freq</th><th style="text-align:right;padding-right:16px!important">Due</th><th style="text-align:right;padding-right:16px!important">Amount</th><th class="fin-mo-adj" style="font-size:12px;font-weight:500;text-align:right;padding:4px 12px!important;font-variant-numeric:tabular-nums;white-space:nowrap">Per Month: ${_finFmt(monthlyTotal)}</th><th></th></tr></thead><tbody>`;
  subs.forEach(sub=>{
    const dueDisplay=_finDueDisplay(sub.due_month,sub.due_day);
    const dueRaw=(sub.due_month&&sub.due_month>=1&&sub.due_month<=12?_FIN_MONTHS[sub.due_month-1]+' ':'')+(sub.due_day||'');
    const amt=sub.amount||0;
    const freq=sub.frequency||'monthly';
    const moAdj=freq==='yearly'?amt/12:freq==='6-month'?amt/6:freq==='weekly'?amt*4.33:amt;
    html+=`<tr class="fin-row fin-sub-row${sub.cancel?' fin-cancel':''}">
      <td>
        <span class="fin-sub-name-wrap">
          <button class="fin-cancel-btn ${sub.cancel?'active':''}" onclick="toggleFinSubCancel('${sub.id}')" title="${sub.cancel?'Unmark cancel':'Flag to cancel'}">&#9873;</button>
          ${_finSubEditable(sub.id,'name',sub.name,'fin-name fin-sub-plain')}
        </span>
      </td>
      <td style="text-align:center">${_finFreqSelect(sub.id,sub.frequency||'monthly')}</td>
      <td style="text-align:right"><span class="fin-sub-plain fin-due-edit" contenteditable="true" data-fid="${sub.id}" data-field="due_day" onfocus="this.textContent='${dueRaw}';" onblur="_finSubEditDay('${sub.id}',this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}if(event.key==='Tab'){event.preventDefault();_finSubTabNext('${sub.id}','due_day');this.blur();}">${dueDisplay}</span></td>
      <td class="fin-num">${_finSubEditable(sub.id,'amount',amt,'fin-sub-plain')}</td>
      <td class="fin-mo-adj">${_finFmt(moAdj)}</td>
      <td><button class="delbtn" onclick="delFinSub('${sub.id}')">&#x2715;</button></td>
    </tr>`;
  });
  html+=`</tbody></table></div>`;
  // Archive section
  if(archivedSubs.length&&window._finArchiveOpen){
    html+=`<div class="fin-archive-section"><div class="fin-archive-hdr" onclick="toggleFinArchive()">Archived (${archivedSubs.length})</div>`;
    archivedSubs.forEach(sub=>{
      html+=`<div class="fin-archive-row"><span class="fin-archive-name">${sub.name}</span><span class="fin-archive-amt">${_finFmt(sub.amount||0)}/${(sub.frequency||'monthly').replace('6-month','6mo').replace('yearly','yr').replace('monthly','mo').replace('weekly','wk')}</span><button class="fin-add-btn" onclick="unarchiveFinSub('${sub.id}')" style="font-size:11px;padding:1px 6px" title="Restore">&#8634;</button></div>`;
    });
    html+=`</div>`;
  }
  html+=`</div>`;
  return html;
}

function _finOrdinal(n){const s=['th','st','nd','rd'];const v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
const _FIN_MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function _finDueDisplay(month,day){
  if(!day&&!month)return'—';
  let s='';
  if(month&&month>=1&&month<=12)s+=_FIN_MONTHS[month-1]+' ';
  if(day)s+=_finOrdinal(day);
  return s.trim()||'—';
}
function _finParseDue(raw){
  const t=raw.replace(/(?:st|nd|rd|th)\b/gi,'').trim();
  if(!t)return{due_month:null,due_day:null};
  // "4/26" or "04/26"
  const slash=t.match(/^(\d{1,2})\/(\d{1,2})$/);
  if(slash)return{due_month:parseInt(slash[1],10)||null,due_day:parseInt(slash[2],10)||null};
  // "Apr 26", "April 26", "april26"
  const alpha=t.match(/^([a-zA-Z]+)\s*(\d+)/);
  if(alpha){
    const mi=_FIN_MONTHS.findIndex(x=>alpha[1].slice(0,3).toLowerCase()===x.toLowerCase());
    return{due_month:mi>=0?mi+1:null,due_day:parseInt(alpha[2],10)||null};
  }
  // "26 Apr", "26 April"
  const dayFirst=t.match(/^(\d+)\s+([a-zA-Z]+)/);
  if(dayFirst){
    const mi=_FIN_MONTHS.findIndex(x=>dayFirst[2].slice(0,3).toLowerCase()===x.toLowerCase());
    return{due_month:mi>=0?mi+1:null,due_day:parseInt(dayFirst[1],10)||null};
  }
  // Just a number
  const d=parseInt(t,10);
  return{due_month:null,due_day:d||null};
}

function _finSubTabNext(fid,curField){
  setTimeout(()=>{
    const cur=document.querySelector(`[data-fid="${fid}"][data-field="${curField}"]`);
    if(!cur)return;
    const row=cur.closest('tr');if(!row)return;
    const focusable=[...row.querySelectorAll('[contenteditable="true"],select.fin-freq-sel')].sort((a,b)=>{
      const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();return ra.left-rb.left;
    });
    const idx=focusable.indexOf(cur);
    let nxt;
    if(idx>=0&&idx<focusable.length-1){nxt=focusable[idx+1];}
    else{const nextRow=row.nextElementSibling;if(nextRow){nxt=nextRow.querySelector('[contenteditable="true"]');}}
    if(nxt){nxt.focus();if(nxt.contentEditable==='true'){const r=document.createRange();r.selectNodeContents(nxt);const s=window.getSelection();s.removeAllRanges();s.addRange(r);}}
  },30);
}
function _finSubEditable(id,field,val,cls){
  const display=typeof val==='number'?_finFmt(val):escHtml(val||'');
  const raw=typeof val==='number'?val.toFixed(2):(val||'');
  return`<span class="${cls||'fin-edit'}" contenteditable="true" data-fid="${id}" data-field="${field}" onfocus="if('${field}'!=='name'){this.textContent='${raw}';}" onblur="_finSubEditField('${id}','${field}',this)" onkeydown="if(event.key==='Escape'){const _r=st.finSubs.find(r=>String(r.id)==='${id}');if(_r&&_r._unsaved){st.finSubs=st.finSubs.filter(r=>r.id!==_r.id);renderFinancePage();return;}}if(event.key==='Enter'){event.preventDefault();this.blur();}if(event.key==='Tab'){event.preventDefault();_finSubTabNext('${id}','${field}');this.blur();}">${display}</span>`;
}

async function _finSubEditField(id,field,el){
  const row=st.finSubs.find(r=>String(r.id)===String(id));if(!row)return;
  const val=field==='name'?el.textContent.trim():_finParseNum(el.textContent);
  // Unsaved row: commit if name provided, cancel if clicking away
  if(row._unsaved){
    row[field]=val;
    const name=field==='name'?val:(row.name||'').trim();
    if(!name){
      setTimeout(()=>{
        const ae=document.activeElement;
        if(ae?.dataset?.fid===String(id))return;
        st.finSubs=st.finSubs.filter(r=>r.id!==row.id);renderFinancePage();
      },50);
      return;
    }
    if(field==='name'){_finCommitNew(row);}
    return;
  }
  if(row[field]===val)return;
  const old=row[field];row[field]=val;
  renderFinancePage();
  pushUndo(()=>{row[field]=old;renderFinancePage();if(!String(id).startsWith('l-'))sbReqNullable('PATCH','finance_subs',{[field]:old},`?id=eq.${id}`);},'Edited '+field);
  if(!String(id).startsWith('l-'))await sbReqNullable('PATCH','finance_subs',{[field]:val},`?id=eq.${id}`);
}

async function _finSubEditDay(id,el){
  const row=st.finSubs.find(r=>String(r.id)===String(id));if(!row)return;
  const parsed=_finParseDue(el.textContent);
  if(row._unsaved){row.due_day=parsed.due_day;row.due_month=parsed.due_month;
    if(!(row.name||'').trim()){setTimeout(()=>{const ae=document.activeElement;if(ae?.dataset?.fid===String(id))return;st.finSubs=st.finSubs.filter(r=>r.id!==row.id);renderFinancePage();},50);}return;}
  if(row.due_day===parsed.due_day&&row.due_month===parsed.due_month){renderFinancePage();return;}
  const oldDay=row.due_day,oldMonth=row.due_month;
  row.due_day=parsed.due_day;row.due_month=parsed.due_month;
  renderFinancePage();
  pushUndo(()=>{row.due_day=oldDay;row.due_month=oldMonth;renderFinancePage();if(!String(id).startsWith('l-'))sbReqNullable('PATCH','finance_subs',{due_day:oldDay,due_month:oldMonth},`?id=eq.${id}`);},'Edited due date');
  if(!String(id).startsWith('l-'))await sbReqNullable('PATCH','finance_subs',{due_day:parsed.due_day,due_month:parsed.due_month},`?id=eq.${id}`);
}

function _finFreqSelect(id,val){
  return`<select class="fin-freq-sel" data-fid="${id}" data-field="frequency" onchange="_finSubEditFreq('${id}',this.value)" onkeydown="if(event.key==='Tab'){event.preventDefault();_finSubTabNext('${id}','frequency');}">
    <option value="monthly"${val==='monthly'?' selected':''}>Monthly</option>
    <option value="yearly"${val==='yearly'?' selected':''}>Yearly</option>
    <option value="6-month"${val==='6-month'?' selected':''}>6-Month</option>
    <option value="weekly"${val==='weekly'?' selected':''}>Weekly</option>
  </select>`;
}

async function _finSubEditFreq(id,val){
  const row=st.finSubs.find(r=>String(r.id)===String(id));if(!row)return;
  if(row._unsaved){row.frequency=val;
    if(!(row.name||'').trim()){setTimeout(()=>{const ae=document.activeElement;if(ae?.dataset?.fid===String(id))return;st.finSubs=st.finSubs.filter(r=>r.id!==row.id);renderFinancePage();},50);}return;}
  const old=row.frequency;row.frequency=val;
  renderFinancePage();
  pushUndo(()=>{row.frequency=old;renderFinancePage();if(!String(id).startsWith('l-'))sbReqNullable('PATCH','finance_subs',{frequency:old},`?id=eq.${id}`);},'Changed frequency');
  if(!String(id).startsWith('l-'))await sbReqNullable('PATCH','finance_subs',{frequency:val},`?id=eq.${id}`);
}

async function toggleFinSubCancel(id){
  const row=st.finSubs.find(r=>String(r.id)===String(id));if(!row)return;
  row.cancel=!row.cancel;
  renderFinancePage();
  pushUndo(()=>{row.cancel=!row.cancel;renderFinancePage();if(!String(id).startsWith('l-'))sbReqNullable('PATCH','finance_subs',{cancel:row.cancel},`?id=eq.${id}`);},'Toggled cancel');
  if(!String(id).startsWith('l-'))await sbReqNullable('PATCH','finance_subs',{cancel:row.cancel},`?id=eq.${id}`);
}

// Virtual cancel-reminder tasks for overview (3 days before due)
const _finCancelDone=new Set(JSON.parse(localStorage.getItem('_finCancelDone')||'[]'));
function _finCancelSave(){try{localStorage.setItem('_finCancelDone',JSON.stringify([..._finCancelDone]));}catch(e){}}
function togFinCancelDone(subId,checked){
  const sid=String(subId);
  const prev=_finCancelDone.has(sid);
  if(checked)_finCancelDone.add(sid);else _finCancelDone.delete(sid);
  _finCancelSave();
  // Also archive/unarchive the subscription
  const sub=st.finSubs.find(r=>String(r.id)===sid);
  if(sub){
    const prevState={archived:sub.archived||false,cancel:sub.cancel||false};
    if(checked){sub.archived=true;sub.cancel=false;}else{sub.archived=false;sub.cancel=true;}
    if(activePg==='finance')renderFinancePage();
    if(!sid.startsWith('l-'))sbReq('PATCH','finance_subs',{archived:sub.archived,cancel:sub.cancel},`?id=eq.${sid}`);
    pushUndo(()=>{
      if(prev)_finCancelDone.add(sid);else _finCancelDone.delete(sid);
      _finCancelSave();
      sub.archived=prevState.archived;sub.cancel=prevState.cancel;
      if(activePg==='finance')renderFinancePage();
      if(!sid.startsWith('l-'))sbReq('PATCH','finance_subs',{archived:prevState.archived,cancel:prevState.cancel},`?id=eq.${sid}`);
      _finCancelRender();
    },(checked?'Checked':'Unchecked')+' cancel task');
  } else {
    pushUndo(()=>{if(prev)_finCancelDone.add(sid);else _finCancelDone.delete(sid);_finCancelSave();_finCancelRender();},(checked?'Checked':'Unchecked')+' cancel task');
  }
  _finCancelRender();
}
function _finCancelRender(){
  if(typeof renderToday==='function')renderToday();if(typeof renderWkCal==='function')renderWkCal();
  if(typeof renderWkSummary==='function')renderWkSummary();
  if(document.getElementById('tbGrid')&&typeof renderDayTB==='function')renderDayTB();
}
function _finCancelTasksForDate(ds){
  if(!st.finSubs)return[];
  const tasks=[];
  const viewDate=new Date(ds+'T00:00:00');
  st.finSubs.filter(s=>(s.cancel&&!s.archived&&s.due_day)||(s.archived&&_finCancelDone.has(String(s.id))&&s.due_day)).forEach(s=>{
    // Calculate next due date from due_month+due_day
    const today=new Date(ds+'T00:00:00');
    const yr=today.getFullYear();const mo=today.getMonth();
    let dueDate;
    if(s.due_month&&s.due_month>=1&&s.due_month<=12){
      // Specific month — yearly/6-month subscription
      dueDate=new Date(yr,s.due_month-1,s.due_day);
      if(dueDate<new Date(yr,mo,today.getDate()-3))dueDate=new Date(yr+1,s.due_month-1,s.due_day);
    }else{
      // Monthly — next occurrence of this day
      dueDate=new Date(yr,mo,s.due_day);
      if(dueDate<new Date(yr,mo,today.getDate()-3))dueDate=new Date(yr,mo+1,s.due_day);
    }
    // Show exactly 3 days before due
    const reminderDate=new Date(dueDate);reminderDate.setDate(reminderDate.getDate()-3);
    const reminderStr=d2s(reminderDate);
    if(ds===reminderStr){
      const dueLabel=_FIN_MONTHS[dueDate.getMonth()]+' '+dueDate.getDate();
      tasks.push({id:'fin-cancel-'+s.id,name:'Cancel '+s.name+' by '+dueLabel,category:'Home',due_date:reminderStr,done:_finCancelDone.has(String(s.id)),_subId:s.id,_virtual:true,_type:'fin-cancel'});
    }
  });
  return tasks;
}

async function addFinSub(){
  const row={id:'l-'+Date.now(),name:'',amount:0,frequency:'monthly',due_day:null,due_month:null,cancel:false,sort_order:0,_unsaved:true};
  st.finSubs.unshift(row);renderFinancePage();
  _finFocusNew(row.id,'name');
}
async function _finCommitNew(row){
  if(!row._unsaved)return;
  delete row._unsaved;
  const{id,_unsaved,...fields}=row;
  pushUndo(()=>{st.finSubs=st.finSubs.filter(r=>r.id!==row.id);renderFinancePage();},'Added subscription');
  const sv=await sbReq('POST','finance_subs',fields);
  if(sv&&sv[0]){
    const i=st.finSubs.findIndex(x=>x.id===row.id);if(i<0)return;
    const cur=st.finSubs[i];const realId=sv[0].id;
    const ae=document.activeElement;
    const editFid=ae?.dataset?.fid===String(row.id)?ae.dataset.field:null;
    const editText=editFid?ae.textContent:'';
    cur.id=realId;renderFinancePage();
    if(editFid){const el=document.querySelector(`[data-fid="${realId}"][data-field="${editFid}"]`);if(el){el.textContent=editText;el.focus();const r=document.createRange();r.selectNodeContents(el);const s=window.getSelection();s.removeAllRanges();s.addRange(r);r.collapse(false);}}
    const{id:_,...body}=cur;sbReqNullable('PATCH','finance_subs',body,`?id=eq.${realId}`);
  }
}

async function delFinSub(id){
  const snap=_finSnap();
  const old=st.finSubs.find(r=>String(r.id)===String(id));
  st.finSubs=st.finSubs.filter(r=>String(r.id)!==String(id));renderFinancePage();
  if(typeof renderToday==='function')renderToday();if(typeof renderWkCal==='function')renderWkCal();
  pushUndo(()=>{if(old)st.finSubs.push(old);renderFinancePage();if(typeof renderToday==='function')renderToday();if(typeof renderWkCal==='function')renderWkCal();if(!String(id).startsWith('l-'))sbReq('POST','finance_subs',old);},'Deleted subscription');
  if(!String(id).startsWith('l-'))await sbReq('DELETE','finance_subs',null,`?id=eq.${id}`);
}

function toggleFinArchive(){window._finArchiveOpen=!window._finArchiveOpen;renderFinancePage();}

async function archiveFinSub(id,checked){
  const sub=st.finSubs.find(r=>String(r.id)===String(id));
  if(!sub)return;
  const prev={archived:sub.archived||false,cancel:sub.cancel||false};
  sub.archived=!!checked;sub.cancel=false;
  renderFinancePage();if(typeof renderToday==='function')renderToday();if(typeof renderWkCal==='function')renderWkCal();
  pushUndo(()=>{sub.archived=prev.archived;sub.cancel=prev.cancel;renderFinancePage();if(typeof renderToday==='function')renderToday();if(typeof renderWkCal==='function')renderWkCal();if(!String(id).startsWith('l-'))sbReq('PATCH','finance_subs',{archived:prev.archived,cancel:prev.cancel},`?id=eq.${id}`);},'Archived subscription');
  if(!String(id).startsWith('l-'))await sbReq('PATCH','finance_subs',{archived:true,cancel:false},`?id=eq.${id}`);
}

async function unarchiveFinSub(id){
  const sub=st.finSubs.find(r=>String(r.id)===String(id));
  if(!sub)return;
  sub.archived=false;sub.cancel=false;
  renderFinancePage();if(typeof renderToday==='function')renderToday();if(typeof renderWkCal==='function')renderWkCal();
  if(!String(id).startsWith('l-'))await sbReq('PATCH','finance_subs',{archived:false,cancel:false},`?id=eq.${id}`);
}

// ── Finance account Add / Delete ─────────────────────────────────────────────
async function addFinRow(type){
  let fields={type};
  if(type==='account')Object.assign(fields,{name:'New Account',amount:0});
  else Object.assign(fields,{name:'VTI Purchase',date:tod(),amount:0});
  const row={id:'l-'+Date.now(),sort_order:0,...fields};
  st.finance.unshift(row);renderFinancePage();
  _finFocusNew(row.id,type==='vti'?'amount':'name');
  pushUndo(()=>{st.finance=st.finance.filter(r=>r.id!==row.id);renderFinancePage();},'Added '+(type==='vti'?'purchase':'account'));
  const sv=await sbReq('POST','finance',{...fields,sort_order:row.sort_order});
  if(sv&&sv[0]){const i=st.finance.findIndex(x=>x.id===row.id);if(i>-1)st.finance[i]=sv[0];}
}

// ── Investment Quick-Add Dropdown ────────────────────────────────────────────
function openFinInvAdd(e){
  let pop=document.getElementById('finInvAddPop');
  if(pop){pop.remove();}
  const btn=e?.target?.closest?.('.fin-add-btn')||document.querySelector('.fin-inv-card .fin-add-btn:last-child');
  pop=document.createElement('div');pop.id='finInvAddPop';
  pop.className='fin-quick-add';
  pop.innerHTML=`
    <div style="display:flex;gap:6px;align-items:center">
      <input id="finInvDate" type="date" style="flex:1;padding:4px 6px;border:1px solid rgba(200,200,215,.25);border-radius:6px;font-size:12px;background:var(--card-bg,#fff);color:var(--text-primary,#334155)">
      <input id="finInvAmt" type="number" step="0.01" placeholder="$0.00" style="width:90px;padding:4px 6px;border:1px solid rgba(200,200,215,.25);border-radius:6px;font-size:12px;background:var(--card-bg,#fff);color:var(--text-primary,#334155)">
      <button onclick="saveFinInvAdd()" style="padding:4px 10px;border:none;border-radius:6px;background:#10b981;color:#fff;cursor:pointer;font-size:11px;font-weight:600;white-space:nowrap">Add</button>
    </div>`;
  btn.closest('.fin-card-hdr').appendChild(pop);
  document.getElementById('finInvDate').value=tod();
  setTimeout(()=>{
    const amt=document.getElementById('finInvAmt');amt.focus();
    const close=ev=>{if(!pop.contains(ev.target)&&!btn.contains(ev.target)){pop.remove();document.removeEventListener('mousedown',close);}};
    document.addEventListener('mousedown',close);
    amt.addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Enter')saveFinInvAdd();if(ev.key==='Escape')pop.remove();});
    document.getElementById('finInvDate').addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Escape')pop.remove();});
  },30);
}
async function saveFinInvAdd(){
  const dateEl=document.getElementById('finInvDate');const amtEl=document.getElementById('finInvAmt');
  const date=dateEl?.value||tod();const amt=parseFloat(amtEl?.value)||0;
  if(!amt){showToast('Enter an amount','#ef4444');return;}
  const pop=document.getElementById('finInvAddPop');if(pop)pop.remove();
  const fields={type:'vti',name:'VTI Purchase',date,amount:amt,sort_order:0};
  const row={id:'l-'+Date.now(),...fields};
  st.finance.unshift(row);renderFinancePage();
  const detPop=document.getElementById('finInvDetailsPop');
  if(detPop)_finRenderDetailsContent(detPop);
  pushUndo(()=>{st.finance=st.finance.filter(r=>r.id!==row.id);renderFinancePage();},'Added purchase');
  const sv=await sbReq('POST','finance',fields);
  if(sv&&sv[0]){const i=st.finance.findIndex(x=>x.id===row.id);if(i>-1)st.finance[i]=sv[0];}
}

// ── Investment Details Popup (overlays recurring expenses column) ────────────
function openFinInvDetails(){
  let pop=document.getElementById('finInvDetailsPop');
  if(pop){closeFinInvDetails();return;}
  const invCard=document.querySelector('.fin-inv-card');
  const rightCol=document.querySelector('.fin-right');
  if(!invCard||!rightCol)return;
  const invRect=invCard.getBoundingClientRect();
  const rightRect=rightCol.getBoundingClientRect();
  pop=document.createElement('div');pop.id='finInvDetailsPop';pop.className='fin-details-pop';
  pop.style.cssText=`position:fixed;top:${invRect.top}px;left:${rightRect.left}px;width:${rightRect.width}px;height:${invRect.height}px;z-index:100`;
  _finRenderDetailsContent(pop);
  document.body.appendChild(pop);
  requestAnimationFrame(()=>pop.classList.add('open'));
  const onKey=e=>{const t=e.target?.tagName;if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;if(e.key==='Escape'||e.key==='Enter'){closeFinInvDetails();}};
  const onClick=e=>{if(!pop.contains(e.target)&&!e.target.closest('.fin-hist-btn'))closeFinInvDetails();};
  document.addEventListener('keydown',onKey);
  setTimeout(()=>document.addEventListener('mousedown',onClick),10);
  pop._cleanup=()=>{document.removeEventListener('keydown',onKey);document.removeEventListener('mousedown',onClick);};
}
function closeFinInvDetails(){
  const pop=document.getElementById('finInvDetailsPop');
  if(!pop)return;
  if(pop._cleanup)pop._cleanup();
  pop.classList.remove('open');
  pop.addEventListener('transitionend',()=>pop.remove(),{once:true});
  setTimeout(()=>{if(pop.parentNode)pop.remove();},200);
}
function _finRenderDetailsContent(pop){
  const purchases=_finOf('vti').filter(p=>p.date&&Math.abs(p.amount||0)>0).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  let cum=0;const chron=[...purchases].reverse();
  const cumMap={};chron.forEach(p=>{cum+=Math.abs(p.amount||0);cumMap[p.id]=cum;});
  let html=`<div class="fin-card-hdr" style="position:relative"><span class="fin-card-title">Purchase History</span><div style="display:flex;gap:4px;align-items:center"><button class="fin-add-btn" onclick="openFinInvAdd(event)" style="font-size:16px;padding:0 4px;line-height:1">+</button><button class="fin-add-btn" onclick="closeFinInvDetails()" style="font-size:14px;padding:0 4px;line-height:1;opacity:.6" title="Close">&#x2715;</button></div></div>`;
  html+=`<div class="fin-details-scroll"><table class="fin-tbl"><thead><tr><th style="padding-left:12px!important;text-align:left">Date</th><th style="text-align:right;padding-right:12px!important">Amount</th><th style="text-align:right;padding-right:12px!important">Cumulative</th><th></th></tr></thead><tbody>`;
  purchases.forEach(p=>{
    const d=p.date?new Date(p.date+'T12:00'):null;
    const ds=d?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';
    html+=`<tr class="fin-row"><td style="padding-left:12px">${ds}</td><td style="text-align:right;padding-right:12px" class="fin-num">${_finFmt(Math.abs(p.amount||0))}</td><td style="text-align:right;padding-right:12px;color:var(--text-secondary)" class="fin-num">${_finFmt(cumMap[p.id]||0)}</td><td><button class="delbtn" onclick="delFinPurchase('${p.id}')">&#x2715;</button></td></tr>`;
  });
  html+=`</tbody></table></div>`;
  if(!purchases.length)html+=`<div style="text-align:center;color:var(--text-secondary);padding:20px;font-size:13px">No purchases yet</div>`;
  pop.innerHTML=html;
}
async function delFinPurchase(id){
  const old=st.finance.find(r=>String(r.id)===String(id));
  st.finance=st.finance.filter(r=>String(r.id)!==String(id));
  renderFinancePage();
  const pop=document.getElementById('finInvDetailsPop');
  if(pop)_finRenderDetailsContent(pop);
  pushUndo(()=>{if(old)st.finance.push(old);renderFinancePage();},'Deleted purchase');
  if(!String(id).startsWith('l-'))await sbReq('DELETE','finance',null,`?id=eq.${id}`);
}

// ── Finance hover interactions ──────────────────────────────────────────────
let _finTip=null;
function _finEnsureTip(){if(!_finTip){_finTip=document.createElement('div');_finTip.className='fin-tooltip';document.body.appendChild(_finTip);}return _finTip;}
function _finHover(id){
  document.querySelectorAll('.fin-legend-row').forEach(r=>r.classList.toggle('fin-legend-hover',id&&r.dataset.finId===id));
  document.querySelectorAll('[data-fin-seg]').forEach(c=>{
    if(!id){c.style.opacity='';return;}
    c.style.opacity=c.dataset.finSeg===id?'1':'0.3';
  });
  if(!id&&_finTip)_finTip.style.display='none';
  if(id){
    const hit=document.querySelector(`[data-fin-seg="${id}"][data-fin-tip-name]`);
    if(hit){const tip=_finEnsureTip();
      tip.innerHTML=`<div style="font-weight:600;font-size:12px">${hit.dataset.finTipName}</div><div style="font-size:11px;opacity:.7">${hit.dataset.finTipAmt}</div>`;
      tip.style.display='block';
      const r=hit.closest('.fin-donut-wrap').getBoundingClientRect();
      tip.style.left=r.left+r.width/2-tip.offsetWidth/2+'px';tip.style.top=r.top-tip.offsetHeight-6+'px';}
  }
}
function _finChartHover(el){
  const tip=_finEnsureTip();
  document.querySelectorAll('tr[data-fin-date]').forEach(r=>r.classList.remove('fin-legend-hover'));
  if(!el){tip.style.display='none';return;}
  tip.innerHTML=`<div style="font-weight:600;font-size:12px">${el.dataset.finTipDate}</div><div style="font-size:12px;margin-top:2px">+${el.dataset.finTipAmt}</div><div style="font-size:11px;opacity:.6;margin-top:1px">Total: ${el.dataset.finTipCum}</div>`;
  tip.style.display='block';
  const chart=el.closest('.fin-inv-chart');
  const cr=chart.getBoundingClientRect();
  const dotTop=parseFloat(el.dataset.finDotTop)/100*cr.height+cr.top;
  // Find the matching visible dot for positioning
  const hitRect=el.getBoundingClientRect();
  const dotLeft=hitRect.left+hitRect.width/2;
  tip.style.left=dotLeft-tip.offsetWidth/2+'px';tip.style.top=dotTop-tip.offsetHeight-10+'px';
  const date=el.dataset.finDate;
  document.querySelectorAll(`tr[data-fin-date="${date}"]`).forEach(r=>r.classList.add('fin-legend-hover'));
}

async function _finToggleExclude(id){
  const row=st.finance.find(r=>String(r.id)===String(id));if(!row)return;
  row.exclude=!row.exclude;renderFinancePage();
  pushUndo(()=>{row.exclude=!row.exclude;renderFinancePage();if(!String(id).startsWith('l-'))sbReqNullable('PATCH','finance',{exclude:row.exclude},`?id=eq.${id}`);},'Toggled exclude');
  if(!String(id).startsWith('l-'))await sbReqNullable('PATCH','finance',{exclude:row.exclude},`?id=eq.${id}`);
}

async function delFin(id){
  const old=st.finance.find(r=>String(r.id)===String(id));
  st.finance=st.finance.filter(r=>String(r.id)!==String(id));renderFinancePage();
  pushUndo(()=>{if(old)st.finance.push(old);renderFinancePage();if(!String(id).startsWith('l-'))sbReq('POST','finance',old);},'Deleted item');
  if(!String(id).startsWith('l-'))await sbReq('DELETE','finance',null,`?id=eq.${id}`);
}

// ── Ideas ─────────────────────────────────────────────────────────────────────
function _ideaFmtDisplay(text){
  return escHtml(text).replace(/^• /gm,'<span style="color:#64748b">•</span> ');
}
let _ideaDragId=null;
function renderIdeasPage(){
  save();
  const pg=document.getElementById('ideasPageContent');if(!pg)return;
  const dk=document.body.classList.contains('dark');
  const active=st.ideas.filter(i=>!i.archived).sort((a,b)=>(a.sort_order??9999)-(b.sort_order??9999));
  const archivedCount=st.ideas.filter(i=>i.archived).length;
  const cntEl=document.getElementById('ideasCount');if(cntEl)cntEl.textContent=active.length;
  const archBtn=document.getElementById('ideasArchiveBtn');if(archBtn)archBtn.style.display=archivedCount?'':'none';
  let html='<div id="ideasList" style="padding:12px 16px">';
  if(!active.length){html+='<div style="text-align:center;color:var(--muted);padding:40px 0;font-size:13px">No ideas yet. Click + to add one.</div></div>';pg.innerHTML=html;return;}
  active.forEach(idea=>{html+=_ideaCard(idea,dk);});
  html+='</div>';
  pg.innerHTML=html;
  _ideaSetupDrag();
}
function _ideaCard(idea,dk){
  const date=idea.created_at?new Date(idea.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
  const bg=dk?'rgba(255,255,255,.06)':'rgba(255,255,255,.85)';
  const bdr=dk?'rgba(255,255,255,.08)':'rgba(210,205,228,.3)';
  const hasIdea=idea.idea&&idea.idea.trim();
  const ideaHtml=hasIdea?`<div ondblclick="editIdeaInline(this,'${idea.id}')" style="font-size:12px;color:var(--muted);white-space:pre-wrap;line-height:1.5;cursor:text">${_ideaFmtDisplay(idea.idea)}</div>`:'';
  return`<div class="idea-row" draggable="true" data-idea-id="${idea.id}" ondragstart="_ideaDragStart(event,'${idea.id}')" ondragend="_ideaDragEnd(event)" style="padding:10px 12px;margin-bottom:8px;border-radius:8px;background:${bg};border:1px solid ${bdr};cursor:grab">
    <div style="display:flex;justify-content:space-between;align-items:center${hasIdea?';margin-bottom:4px':''}">
      <span ondblclick="editIdeaTopicInline(this,'${idea.id}')" style="font-size:12px;font-weight:600;color:var(--text);cursor:text">${escHtml(idea.topic)}</span>
      <div style="display:flex;gap:4px;align-items:center">
        <span style="font-size:10px;color:var(--muted)">${date}</span>
        <button onclick="toggleIdeaArchive('${idea.id}')" title="Archive" class="idea-x-btn" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--muted);padding:2px 4px;opacity:0;transition:opacity .15s">✕</button>
      </div>
    </div>
    ${ideaHtml}
  </div>`;
}
function openIdeasArchive(){
  const dk=document.body.classList.contains('dark');
  const archived=st.ideas.filter(i=>i.archived);
  const content=document.getElementById('ideasArchiveContent');if(!content)return;
  if(!archived.length){content.innerHTML='<div style="text-align:center;color:var(--muted);padding:24px 0;font-size:12px">No archived ideas</div>';}
  else{
    let html='';
    archived.forEach(idea=>{
      const date=idea.created_at?new Date(idea.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
      const hasIdea=idea.idea&&idea.idea.trim();
      const bg=dk?'rgba(255,255,255,.03)':'rgba(148,163,184,.06)';
      const bdr=dk?'rgba(255,255,255,.06)':'rgba(148,163,184,.15)';
      html+=`<div style="padding:10px 12px;margin-bottom:8px;border-radius:8px;background:${bg};border:1px solid ${bdr}">
        <div style="display:flex;justify-content:space-between;align-items:center${hasIdea?';margin-bottom:4px':''}">
          <span style="font-size:12px;font-weight:600;color:var(--muted)">${escHtml(idea.topic)}</span>
          <div style="display:flex;gap:4px;align-items:center">
            <span style="font-size:10px;color:var(--muted)">${date}</span>
            <button onclick="restoreIdea('${idea.id}')" title="Restore" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--accent);padding:2px 4px">↩</button>
          </div>
        </div>
        ${hasIdea?`<div style="font-size:12px;color:var(--muted);white-space:pre-wrap;line-height:1.5;opacity:.6">${_ideaFmtDisplay(idea.idea)}</div>`:''}
      </div>`;
    });
    content.innerHTML=html;
  }
  document.getElementById('ideasArchiveModal').classList.add('open');
}
function openIdeasAddForm(){
  const pg=document.getElementById('ideasPageContent');if(!pg)return;
  if(document.getElementById('ideaAddForm'))return;
  const dk=document.body.classList.contains('dark');
  const form=document.createElement('div');form.id='ideaAddForm';
  form.style.cssText=`padding:12px;margin:12px 16px 0;border-radius:8px;background:${dk?'rgba(168,85,247,.08)':'rgba(168,85,247,.06)'};border:1px solid ${dk?'rgba(168,85,247,.15)':'rgba(168,85,247,.18)'}`;
  const inputBg=dk?'rgba(255,255,255,.06)':'rgba(255,255,255,.6)';
  form.innerHTML=`<input id="ideaTopicInput" placeholder="Topic name (Enter to save, Tab for notes)" style="width:100%;box-sizing:border-box;padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:${inputBg};font-size:12px;font-family:inherit;color:var(--text);outline:none">
    <textarea id="ideaTextInput" placeholder="Notes (optional)" style="display:none;width:100%;box-sizing:border-box;padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:${inputBg};font-size:12px;font-family:inherit;color:var(--text);resize:vertical;min-height:60px;outline:none;line-height:1.5;margin-top:6px"></textarea>`;
  pg.prepend(form);
  const topicEl=document.getElementById('ideaTopicInput');
  const textEl=document.getElementById('ideaTextInput');
  topicEl.focus();
  topicEl.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();saveNewIdea();return;}
    if(e.key==='Tab'&&!e.shiftKey){e.preventDefault();textEl.style.display='';textEl.focus();return;}
    if(e.key==='Escape'){_ideaCancelAdd();return;}
    e.stopPropagation();
  });
  textEl.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&e.metaKey){e.preventDefault();saveNewIdea();return;}
    if(e.key==='Escape'){_ideaCancelAdd();return;}
    e.stopPropagation();
  });
}
function _ideaCancelAdd(){
  const f=document.getElementById('ideaAddForm');if(f)f.remove();
}
async function saveNewIdea(){
  const topic=(document.getElementById('ideaTopicInput')||{}).value?.trim()||'';
  const idea=(document.getElementById('ideaTextInput')||{}).value?.trim()||'';
  if(!topic){_ideaCancelAdd();return;}
  const localId='l-'+Date.now();
  const row={id:localId,topic,idea:idea||'',archived:false,created_at:new Date().toISOString()};
  st.ideas.unshift(row);renderIdeasPage();
  const sv=await sbReq('POST','ideas',{topic,idea:idea||'',archived:false});
  if(sv&&sv[0]){const idx=st.ideas.findIndex(i=>i.id===localId);if(idx>=0)st.ideas[idx]=sv[0];}
  save();
}
async function toggleIdeaArchive(id){
  const idea=st.ideas.find(i=>String(i.id)===String(id));if(!idea)return;
  idea.archived=true;renderIdeasPage();save();
  if(!String(id).startsWith('l-'))await sbReq('PATCH','ideas',{archived:true},`?id=eq.${id}`);
}
async function restoreIdea(id){
  const idea=st.ideas.find(i=>String(i.id)===String(id));if(!idea)return;
  idea.archived=false;renderIdeasPage();
  const archModal=document.getElementById('ideasArchiveModal');
  if(archModal&&archModal.classList.contains('open'))openIdeasArchive();
  save();
  if(!String(id).startsWith('l-'))await sbReq('PATCH','ideas',{archived:false},`?id=eq.${id}`);
}
function editIdeaInline(el,id){
  const idea=st.ideas.find(i=>String(i.id)===String(id));if(!idea)return;
  if(el.dataset.editing==='true')return;
  el.dataset.editing='true';
  const rect=el.getBoundingClientRect();
  const ta=document.createElement('textarea');
  ta.value=idea.idea||'';
  ta.style.cssText='width:100%;box-sizing:border-box;padding:0;margin:0;border:none;border-bottom:1px solid var(--accent);background:transparent;font-size:12px;font-family:inherit;color:var(--muted);resize:none;outline:none;line-height:1.5;overflow:hidden;white-space:pre-wrap';
  ta.style.height=Math.max(rect.height,20)+'px';
  el.textContent='';el.appendChild(ta);
  ta.focus();
  ta.setSelectionRange(ta.value.length,ta.value.length);
  const autoH=()=>{ta.style.height='auto';ta.style.height=ta.scrollHeight+'px';};
  ta.addEventListener('input',autoH);
  requestAnimationFrame(autoH);
  let saved=false;
  const commit=async()=>{
    if(saved)return;saved=true;
    const val=ta.value.trim();
    idea.idea=val||'';
    renderIdeasPage();save();
    if(!String(id).startsWith('l-'))await sbReq('PATCH','ideas',{idea:idea.idea},`?id=eq.${id}`);
  };
  ta.addEventListener('blur',commit);
  ta.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&e.metaKey){e.preventDefault();ta.blur();return;}
    if(e.key==='Escape'){ta.value=idea.idea||'';ta.blur();return;}
    e.stopPropagation();
  });
}
function editIdeaTopicInline(el,id){
  const idea=st.ideas.find(i=>String(i.id)===String(id));if(!idea)return;
  if(el.dataset.editing==='true')return;
  el.dataset.editing='true';
  const input=document.createElement('input');
  input.value=idea.topic;
  input.style.cssText='width:100%;box-sizing:border-box;padding:0;margin:0;border:none;border-bottom:1px solid var(--accent);background:transparent;font-size:12px;font-weight:600;font-family:inherit;color:var(--text);outline:none';
  el.textContent='';el.appendChild(input);
  input.focus();input.select();
  let saved=false;
  const commit=async()=>{
    if(saved)return;saved=true;
    const val=input.value.trim();if(val)idea.topic=val;
    renderIdeasPage();save();
    if(!String(id).startsWith('l-'))await sbReq('PATCH','ideas',{topic:idea.topic},`?id=eq.${id}`);
  };
  input.addEventListener('blur',commit);
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();input.blur();return;}
    if(e.key==='Escape'){input.value=idea.topic;input.blur();return;}
    e.stopPropagation();
  });
}
function _ideaDragStart(e,id){_ideaDragId=id;e.dataTransfer.effectAllowed='move';e.target.style.opacity='.4';}
function _ideaDragEnd(e){_ideaDragId=null;e.target.style.opacity='';}
function _ideaSetupDrag(){
  const list=document.getElementById('ideasList');if(!list)return;
  list.addEventListener('dragover',e=>{
    if(!_ideaDragId)return;e.preventDefault();
    const rows=[...list.querySelectorAll('.idea-row')];
    let ph=list.querySelector('.idea-drop-ph');
    if(!ph){ph=document.createElement('div');ph.className='idea-drop-ph';ph.style.cssText='height:2px;margin:4px 0;border-radius:99px;background:var(--accent);pointer-events:none';list.appendChild(ph);}
    let inserted=false;
    for(const r of rows){const rc=r.getBoundingClientRect();if(e.clientY<rc.top+rc.height/2){list.insertBefore(ph,r);inserted=true;break;}}
    if(!inserted){const last=rows[rows.length-1];if(last)last.after(ph);}
  });
  list.addEventListener('dragleave',e=>{if(!list.contains(e.relatedTarget)){const ph=list.querySelector('.idea-drop-ph');if(ph)ph.remove();}});
  list.addEventListener('drop',e=>{
    e.preventDefault();
    const ph=list.querySelector('.idea-drop-ph');if(ph)ph.remove();
    if(!_ideaDragId)return;
    const rows=[...list.querySelectorAll('.idea-row')];
    const ids=rows.map(r=>r.dataset.ideaId);
    // find drop index
    let dropIdx=ids.length;
    for(let i=0;i<rows.length;i++){const rc=rows[i].getBoundingClientRect();if(e.clientY<rc.top+rc.height/2){dropIdx=i;break;}}
    // reorder active ideas
    const active=st.ideas.filter(i=>!i.archived).sort((a,b)=>(a.sort_order??9999)-(b.sort_order??9999));
    const dragIdx=active.findIndex(i=>String(i.id)===String(_ideaDragId));
    if(dragIdx<0)return;
    const [moved]=active.splice(dragIdx,1);
    if(dropIdx>dragIdx)dropIdx--;
    active.splice(dropIdx,0,moved);
    active.forEach((idea,i)=>{idea.sort_order=i;});
    renderIdeasPage();save();
    active.forEach(idea=>{if(!String(idea.id).startsWith('l-'))sbReqSilent('PATCH','ideas',{sort_order:idea.sort_order},`?id=eq.${idea.id}`);});
    _ideaDragId=null;
  });
}

// ── Pages ──────────────────────────────────────────────────────────────────────
const PAGES=['overview','weekly','shopping','travel','birthdays','ideas','settings','pups','finance','recipes','notes','videos','packing','guide'];
// ══════════════════════════════════════════════════════════════════════════════
// ── RECIPES PAGE ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
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
  if(str.trim().startsWith('[')){try{const a=JSON.parse(str);if(Array.isArray(a))return a.map(x=>typeof x==='string'?{name:x,amount:''}:{name:x.name||'',amount:x.amount||'',is_pantry:!!x.is_pantry});}catch(e){}}
  return str.split('\n').map(s=>s.trim()).filter(Boolean).map(s=>({name:s,amount:''}));
}
const _SPICE_RE=/^(salt|pepper|paprika|cumin|cinnamon|oregano|thyme|rosemary|basil|parsley|cilantro|cayenne|chili powder|garlic powder|onion powder|turmeric|nutmeg|coriander|dill|bay leaf|bay leaves|red pepper flakes|italian seasoning|everything bagel seasoning|tajin|msg|seasoning salt|black pepper|white pepper|crushed red pepper|garam masala|curry powder|smoked paprika|chipotle|cloves|allspice|cardamom|fennel seed|mustard powder|sage|tarragon|chives)$/i;
function _sortIngredients(ings){
  return[...ings].sort((a,b)=>{
    const aSpice=_SPICE_RE.test((a.name||'').trim());
    const bSpice=_SPICE_RE.test((b.name||'').trim());
    const aPantry=!!a.is_pantry&&!aSpice;const bPantry=!!b.is_pantry&&!bSpice;
    const aGrp=aSpice?2:aPantry?1:0;const bGrp=bSpice?2:bPantry?1:0;
    if(aGrp!==bGrp)return aGrp-bGrp;
    return(a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase());
  });
}
function _groupIngredients(ings){
  // Group by type but preserve order within each group
  const regular=[],pantry=[],spices=[];
  ings.forEach(ing=>{
    const isSpice=_SPICE_RE.test((ing.name||'').trim());
    if(isSpice)spices.push(ing);
    else if(ing.is_pantry)pantry.push(ing);
    else regular.push(ing);
  });
  return[...regular,...pantry,...spices];
}
function _serializeIngredients(arr){
  const clean=(arr||[]).filter(x=>(x.name||'').trim()||(x.amount||'').trim());
  if(!clean.length)return null;
  return JSON.stringify(clean.map(x=>{const o={name:x.name.trim(),amount:(x.amount||'').trim()};if(x.is_pantry)o.is_pantry=true;return o;}));
}
async function setRecField(id,field,val,skipPanel=false){
  const idx=st.recipes.findIndex(x=>String(x.id)===String(id));if(idx<0)return;
  recSnapshot();
  st.recipes[idx][field]=val;
  save();
  sbReqSilent('PATCH','recipes',{[field]:val},`?id=eq.${id}`);
  renderRecipeTable();
  if(!skipPanel&&_recPanelId===String(id))renderRecipeDetail(id);
}

async function toggleRecFavorite(id,e){
  if(e){e.preventDefault();e.stopPropagation();}
  const r=st.recipes.find(x=>String(x.id)===String(id));if(!r)return;
  recSnapshot();
  r.favorite=!r.favorite;save();
  sbReqSilent('PATCH','recipes',{favorite:r.favorite},`?id=eq.${id}`);
  renderRecipeTable();
  if(_recPanelId===String(id))renderRecipeDetail(id);
}


function _recNavOffset(dir){
  const rows=_getFilteredRecipes();
  if(!rows.length)return;
  const curIdx=rows.findIndex(r=>String(r.id)===_recPanelId);
  let next=curIdx+dir;
  if(next<0)next=rows.length-1;
  if(next>=rows.length)next=0;
  _recPanelId=String(rows[next].id);
  renderRecipeDetail(_recPanelId);
  renderRecipeList();
  const el=document.querySelector(`.rec-list-item[data-rid="${_recPanelId}"]`);
  if(el)el.scrollIntoView({block:'nearest'});
}
function _recMoveSelected(dir){
  if(!_recPanelId)return;
  const rows=_getFilteredRecipes();
  const curIdx=rows.findIndex(r=>String(r.id)===_recPanelId);
  if(curIdx<0)return;
  const swapIdx=curIdx+dir;
  if(swapIdx<0||swapIdx>=rows.length)return;
  // Swap sort_order values
  recSnapshot();
  const a=rows[curIdx],b=rows[swapIdx];
  const aOrder=a.sort_order!=null?a.sort_order:curIdx;
  const bOrder=b.sort_order!=null?b.sort_order:swapIdx;
  a.sort_order=bOrder;b.sort_order=aOrder;
  save();renderRecipeList();
  // Persist both
  sbReqSilent('PATCH','recipes',{sort_order:a.sort_order},`?id=eq.${a.id}`);
  sbReqSilent('PATCH','recipes',{sort_order:b.sort_order},`?id=eq.${b.id}`);
  const el=document.querySelector(`.rec-list-item[data-rid="${_recPanelId}"]`);
  if(el)el.scrollIntoView({block:'nearest'});
}
function _recEnsureSortOrder(){
  // Assign sort_order to any recipes missing it
  const need=(st.recipes||[]).filter(r=>r.sort_order==null);
  if(!need.length)return;
  const sorted=[...(st.recipes||[])].sort((a,b)=>String(a.name||'').toLowerCase().localeCompare(String(b.name||'').toLowerCase()));
  sorted.forEach((r,i)=>{if(r.sort_order==null){r.sort_order=i;sbReqSilent('PATCH','recipes',{sort_order:i},`?id=eq.${r.id}`);}});
  save();
}

function selRecRow(e,sid){
  if(e.target.closest('button,input'))return;
  e.stopPropagation();
  _recPanelId=sid;
  renderRecipeDetail(sid);
  renderRecipeList();
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
  if(ids.includes(_recPanelId)){
    _recPanelId=st.recipes.length?String(st.recipes[0].id):null;
    if(_recPanelId)renderRecipeDetail(_recPanelId);
  }
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

function openRecSidePanel(id){
  _recPanelId=String(id);
  renderRecipeDetail(id);
}
function closeRecSidePanel(){
  _recPanelId=null;
  const panel=document.getElementById('recDetailPanel');
  if(panel)panel.innerHTML=`<div class="rec-detail-empty">Select a recipe to view</div>`;
}
function _recCtxDeletePanel(){
  if(!_recPanelId)return;
  _selRecIds.clear();_selRecIds.add(_recPanelId);_recCtxId=_recPanelId;
  recCtxDelete();
}

function renderRecipeTable(){renderRecipeList();if(_recPanelId)renderRecipeDetail(_recPanelId);}

function _getFilteredRecipes(){
  let rows=[...st.recipes||[]];
  if(_recSearch){const sv=_recSearch.toLowerCase();rows=rows.filter(r=>{const ingText=_parseIngredients(r.ingredients).map(x=>x.name+' '+x.amount).join(' ');return[r.name,r.meal_type,r.cuisine,r.instructions,ingText].some(f=>f&&f.toLowerCase().includes(sv));});}
  if(_recMealFilter)rows=rows.filter(r=>r.meal_type===_recMealFilter);
  if(_recCuisineFilter)rows=rows.filter(r=>(r.cuisine||'').toLowerCase().includes(_recCuisineFilter.toLowerCase()));
  if(_recFavFilter)rows=rows.filter(r=>r.favorite);
  if(_recTimeFilter){const max=parseInt(_recTimeFilter);rows=rows.filter(r=>r.time&&r.time<=max);}
  if(_recSortCol){
    rows.sort((a,b)=>{
      if(_recSortCol==='time'||_recSortCol==='servings')return _recSortDir*((a[_recSortCol]||9999)-(b[_recSortCol]||9999));
      if(_recSortCol==='favorite')return _recSortDir*((b.favorite?1:0)-(a.favorite?1:0));
      return _recSortDir*String(a[_recSortCol]||'').toLowerCase().localeCompare(String(b[_recSortCol]||'').toLowerCase());
    });
  } else {
    rows.sort((a,b)=>{
      const sa=(a.sort_order!=null)?a.sort_order:99999;
      const sb2=(b.sort_order!=null)?b.sort_order:99999;
      if(sa!==sb2)return sa-sb2;
      return String(a.name||'').toLowerCase().localeCompare(String(b.name||'').toLowerCase());
    });
  }
  return rows;
}

function renderRecipeList(){
  const container=document.getElementById('recListScroll');if(!container)return;
  const rows=_getFilteredRecipes();
  function esc(v){return(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
  container.innerHTML=rows.map(r=>{
    const sid=String(r.id);
    const isSel=_recPanelId===sid;
    return`<div class="rec-list-item${isSel?' active':''}" data-rid="${sid}" onclick="selRecRow(event,'${sid}')">
      ${isSel?'<div class="scoop-top"></div><div class="scoop-bot"></div>':''}
      <div class="rec-list-main">
        <span class="rec-list-fav${r.favorite?' on':''}" onclick="event.stopPropagation();toggleRecFavorite('${sid}',event)">♥</span>
        <span class="rec-list-name">${r.name?esc(r.name):'<em style="color:var(--muted)">New Recipe…</em>'}</span>
        <button class="rec-list-del" onclick="event.stopPropagation();_recCtxId='${sid}';_selRecIds.clear();_selRecIds.add('${sid}');recCtxDelete()">✕</button>
      </div>
    </div>`;
  }).join('')||`<div style="padding:28px;text-align:center;color:var(--muted);font-size:12px">No recipes yet</div>`;
}

function _recMetaSave(el,sid){
  const r=st.recipes.find(x=>String(x.id)===String(sid));if(!r)return;
  if(el.classList.contains('rec-detail-title-inp')){
    const v=el.value.trim();if(v&&v!==r.name){r.name=v;save();sbReqSilent('PATCH','recipes',{name:v},`?id=eq.${sid}`);renderRecipeList();}
  } else if(el.classList.contains('rec-meta-sel')){
    // selects save via onchange already
  } else if(el.classList.contains('rec-meta-inp')){
    const isTime=el.closest('.rec-meta-field')&&el.previousElementSibling&&el.previousElementSibling.textContent==='Time';
    const field=isTime?'time':'servings';
    const v=parseInt(el.value)||null;if(v!==r[field]){r[field]=v;save();sbReqSilent('PATCH','recipes',{[field]:v},`?id=eq.${sid}`);}
  }
}
function _recMetaTab(e){
  if(e.key==='Enter'){e.preventDefault();e.target.blur();return;}
  if(e.key!=='Tab')return;
  e.preventDefault();
  const panel=document.getElementById('recDetailPanel');if(!panel)return;
  const selectors='.rec-detail-title-inp,.rec-meta-sel,.rec-meta-inp';
  const fields=[...panel.querySelectorAll(selectors)];
  const idx=fields.indexOf(e.target);if(idx<0)return;
  const next=e.shiftKey?idx-1:idx+1;
  const sid=_recPanelId;if(!sid)return;
  // Save without re-rendering so we don't lose focus
  e.target.onblur=null;
  _recMetaSave(e.target,sid);
  if(next>=0&&next<fields.length){
    fields[next].focus();
  } else if(!e.shiftKey&&next>=fields.length){
    const firstAmt=panel.querySelector('#diRow0 .di-amt');
    if(firstAmt)firstAmt.focus();
    else _diAdd(sid);
  }
}
function renderRecipeDetail(id){
  const panel=document.getElementById('recDetailPanel');if(!panel)return;
  if(!id){panel.innerHTML=`<div class="rec-detail-empty">Select a recipe to view</div>`;return;}
  const r=st.recipes.find(x=>String(x.id)===String(id));
  if(!r){panel.innerHTML=`<div class="rec-detail-empty">Recipe not found</div>`;return;}
  _recPanelId=String(r.id);
  const esc=v=>(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const ings=_groupIngredients(_parseIngredients(r.ingredients));
  function fmtMin(m){if(!m)return'';return m>=60?`${Math.floor(m/60)}h${m%60?' '+m%60+'m':''}`:m+'m';}
  const sid=String(r.id);
  const escV=v=>(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  const mealOpts=['','Lunch','Dinner','Side','Snack'];
  const cuisineOpts=['','American','Mexican','Italian','Asian','Indian','Mediterranean','Other'];
  let html=`<div class="rec-detail-header">
    <div class="rec-detail-title-wrap">
      <input class="rec-detail-title-inp" value="${escV(r.name)}" placeholder="Recipe name"
        onblur="_recSaveField('${sid}','name',this.value.trim())"
        onkeydown="_recMetaTab(event)">
      <span class="rec-detail-fav${r.favorite?' on':''}" onclick="toggleRecFavorite('${r.id}');renderRecipeDetail('${r.id}');renderRecipeList()">♥</span>
    </div>
    <div class="rec-detail-flourish"></div>
    <div class="rec-detail-meta">
      <div class="rec-meta-field"><span class="rec-meta-label">Meal</span><select class="rec-meta-sel rec-meta-meal" onchange="_recSaveField('${sid}','meal_type',this.value||null)" onkeydown="_recMetaTab(event)">${mealOpts.map(m=>`<option value="${m}"${(r.meal_type||'')===m?' selected':''}>${m||'–'}</option>`).join('')}</select></div>
      <div class="rec-meta-field"><span class="rec-meta-label">Cuisine</span><select class="rec-meta-sel" onchange="_recSaveField('${sid}','cuisine',this.value||null)" onkeydown="_recMetaTab(event)">${cuisineOpts.map(c=>`<option value="${c}"${(r.cuisine||'')===c?' selected':''}>${c||'–'}</option>`).join('')}</select></div>
      <div class="rec-meta-field"><span class="rec-meta-label">Time</span><input class="rec-meta-inp" type="number" min="0" value="${r.time||''}" placeholder="–" onblur="_recSaveField('${sid}','time',parseInt(this.value)||null)" onkeydown="_recMetaTab(event)"></div>
      <div class="rec-meta-field"><span class="rec-meta-label">Serves</span><input class="rec-meta-inp" type="number" min="1" value="${r.servings||''}" placeholder="–" onblur="_recSaveField('${sid}','servings',parseInt(this.value)||null)" onkeydown="_recMetaTab(event)"></div>
    </div>
  </div>`;
  _detailIngs=_groupIngredients(_parseIngredients(r.ingredients));
  html+=`<div class="rec-detail-body">`;
  html+=`<div class="rec-detail-ings">`;
  html+=`<div class="rec-detail-section-title">Ingredients</div>`;
  html+=`<div id="recDetailIngList"></div>`;
  html+=`<button class="rec-detail-ing-add" onclick="_diAdd('${sid}')">+ Add ingredient</button>`;
  html+=`</div>`;
  html+=`<div class="rec-detail-inst">`;
  html+=`<div class="rec-detail-section-title">Instructions</div>`;
  html+=`<textarea class="rec-detail-inst-ta" placeholder="Add step-by-step instructions…" onblur="_recSaveField('${sid}','instructions',this.value.trim()||null)" onkeydown="if(event.key==='Escape'){event.preventDefault();this.blur();}">${esc(r.instructions||'')}</textarea>`;
  html+=`</div>`;
  html+=`</div>`;
  if(r.source){html+=`<a class="rec-detail-source" href="${escV(r.source)}" target="_blank" rel="noopener">Source ↗</a>`;}
  else{html+=`<div class="rec-detail-source-add" onclick="this.innerHTML='<input class=\\'rec-detail-source-inp\\' placeholder=\\'Paste recipe URL…\\' onblur=\\'_recSaveField(&quot;${sid}&quot;,&quot;source&quot;,this.value.trim()||null);renderRecipeDetail(&quot;${sid}&quot;)\\' onkeydown=\\'if(event.key===&quot;Enter&quot;){event.preventDefault();this.blur();}if(event.key===&quot;Escape&quot;){this.value=&quot;&quot;;this.blur();}\\'>';this.querySelector('input').focus()">+ Add source link</div>`;}
  html+=`<div class="rec-detail-nav"><button class="rec-detail-nav-btn" onclick="_recNavOffset(-1)" title="Previous recipe">←</button><button class="rec-detail-nav-btn" onclick="_recNavOffset(1)" title="Next recipe">→</button></div>`;
  panel.innerHTML=html;
  _diRender(sid);
}
// ── Detail ingredient system (modal-style: in-memory array, always-inputs) ──
let _detailIngs=[];
function _diFlush(){
  document.querySelectorAll('#recDetailIngList .di-row').forEach((row,i)=>{
    if(i<_detailIngs.length){
      const a=row.querySelector('.di-amt'),n=row.querySelector('.di-name');
      if(a)_detailIngs[i].amount=a.value;if(n)_detailIngs[i].name=n.value;
    }
  });
}
const _COMMON_INGS=['salt','pepper','black pepper','olive oil','butter','garlic','onion','sugar','brown sugar','flour','eggs','milk','water','vegetable oil','soy sauce','lemon juice','lime juice','vinegar','baking powder','baking soda','vanilla extract','cinnamon','paprika','cumin','oregano','basil','thyme','rosemary','red pepper flakes','cayenne','nutmeg','honey','maple syrup','cream cheese','sour cream','heavy cream','parmesan','mozzarella','cheddar','chicken broth','beef broth','tomato paste','tomato sauce','rice','pasta','bread crumbs','cornstarch','sesame oil','ginger','green onion','cilantro','parsley','bay leaf','chili powder','garlic powder','onion powder','mustard','ketchup','worcestershire sauce','hot sauce','ranch','mayo','dijon mustard'];
let _diSuggestIdx=-1,_diSuggestList=[];
function _ucFirst(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s;}
function _diRender(id){
  const el=document.getElementById('recDetailIngList');if(!el)return;
  const _e=v=>(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  el.innerHTML=_detailIngs.map((ing,i)=>{
    const pantryOn=ing.is_pantry?'on':'';
    return`<div class="di-row" id="diRow${i}" onmousedown="_diDragStart(event,'${id}',${i})"><span class="rec-detail-ing-grip">⠿</span><input class="di-amt" placeholder="" value="${_e(ing.amount)}" oninput="_detailIngs[${i}].amount=this.value" onkeydown="_diKey(event,${i},'amt','${id}')" onblur="_diBlur('${id}')" onmousedown="event.stopPropagation()"><input class="di-name" placeholder="ingredient" value="${_e(ing.name)}" oninput="_detailIngs[${i}].name=this.value;_diShowSuggest(this,${i},'${id}')" onkeydown="_diKey(event,${i},'name','${id}')" onblur="_diBlurName(this,${i},'${id}')" onfocus="_diShowSuggest(this,${i},'${id}')" onmousedown="event.stopPropagation()"><button class="di-staple-btn ${pantryOn}" tabindex="0" onmousedown="event.stopPropagation()" onclick="_diTogglePantry(${i},'${id}')" onkeydown="_diKey(event,${i},'staple','${id}')" title="Staple/pantry item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></button><button class="di-del-btn" tabindex="-1" onmousedown="event.stopPropagation();event.preventDefault();_diDel(${i},'${id}')" title="Remove">✕</button></div>`;
  }).join('')||'<div style="color:var(--muted);font-size:11px;padding:4px 0">No ingredients yet</div>';
}
function _diTogglePantry(i,id){
  _diFlush();
  const ing=_detailIngs[i];
  ing.is_pantry=!ing.is_pantry;
  // Propagate staple status to same ingredient in all other recipes
  const lname=(ing.name||'').trim().toLowerCase();
  if(lname)(st.recipes||[]).forEach(r=>{
    if(String(r.id)===String(id))return;
    const parsed=_parseIngredients(r.ingredients);
    let changed=false;
    parsed.forEach(p=>{if((p.name||'').trim().toLowerCase()===lname&&!!p.is_pantry!==!!ing.is_pantry){p.is_pantry=ing.is_pantry;changed=true;}});
    if(changed){r.ingredients=_serializeIngredients(parsed);save();sbReqSilent('PATCH','recipes',{ingredients:r.ingredients},`?id=eq.${r.id}`);}
  });
  _diSortStaples();
  const newIdx=_detailIngs.indexOf(ing);
  _diRender(id);_diSave(id);
  setTimeout(()=>{const btn=document.querySelector(`#diRow${newIdx} .di-staple-btn`);if(btn)btn.focus();},20);
}
function _diSortStaples(){
  // Sort: non-staple items first (preserve order), then staples (preserve order), empty rows last
  const regular=[],staples=[],empty=[];
  _detailIngs.forEach(ing=>{
    const hasContent=(ing.name||'').trim()||(ing.amount||'').trim();
    if(!hasContent)empty.push(ing);
    else if(ing.is_pantry)staples.push(ing);
    else regular.push(ing);
  });
  _detailIngs.length=0;
  _detailIngs.push(...regular,...staples,...empty);
}
function _diShowSuggest(inp,i,id){
  _diCloseSuggest();
  const v=(inp.value||'').trim().toLowerCase();
  const usedNames=new Set();
  (st.recipes||[]).forEach(r=>{_parseIngredients(r.ingredients).forEach(x=>{if(x.name)usedNames.add(x.name.toLowerCase());});});
  const allNames=[...new Set([..._COMMON_INGS,...usedNames])];
  _diSuggestList=allNames.filter(n=>n.includes(v)&&n!==v).slice(0,8);
  if(!_diSuggestList.length)return;
  _diSuggestIdx=-1;
  const drop=document.createElement('div');drop.className='di-suggest';drop.id='diSuggestDrop';
  // Position fixed relative to input
  const rect=inp.getBoundingClientRect();
  drop.style.position='fixed';
  drop.style.left=rect.left+'px';
  drop.style.top=(rect.bottom+2)+'px';
  drop.style.width=rect.width+'px';
  _diSuggestList.forEach((name,j)=>{
    const d=document.createElement('div');d.className='di-suggest-item';d.textContent=_ucFirst(name);
    d.onmousedown=e=>{e.preventDefault();_diPickSuggest(i,name,id);};
    drop.appendChild(d);
  });
  document.body.appendChild(drop);
}
function _diCloseSuggest(){const d=document.getElementById('diSuggestDrop');if(d)d.remove();_diSuggestIdx=-1;_diSuggestList=[];}
function _diPickSuggest(i,name,id){
  _detailIngs[i].name=_ucFirst(name);_diCloseSuggest();_diRender(id);
  // Focus next row's amount
  const nextAmt=document.querySelector(`#diRow${i+1} .di-amt`);
  if(nextAmt)setTimeout(()=>nextAmt.focus(),20);
  else{_diAdd(id);}
}
function _diBlurName(inp,i,id){
  setTimeout(()=>{_diCloseSuggest();_diBlur(id);},100);
}
function _diAdd(id){
  _diFlush();_detailIngs.push({name:'',amount:''});_diRender(id);
  const i=_detailIngs.length-1;
  setTimeout(()=>{const inp=document.querySelector(`#diRow${i} .di-amt`);if(inp)inp.focus();},20);
}
function _diDel(i,id){
  _diFlush();_detailIngs.splice(i,1);_diRender(id);_diSave(id);
  const prev=Math.max(0,i-1);
  setTimeout(()=>{const inp=_detailIngs.length?document.querySelector(`#diRow${prev} .di-name`):null;if(inp)inp.focus();},20);
}
function _diKey(e,i,field,id){
  // Autocomplete navigation for ingredient name
  if(field==='name'&&_diSuggestList.length){
    if(e.key==='ArrowDown'){e.preventDefault();_diSuggestIdx=Math.min(_diSuggestIdx+1,_diSuggestList.length-1);_diHighlightSuggest();return;}
    if(e.key==='ArrowUp'){e.preventDefault();_diSuggestIdx=Math.max(_diSuggestIdx-1,0);_diHighlightSuggest();return;}
    if(e.key==='Enter'&&_diSuggestIdx>=0){e.preventDefault();e.stopPropagation();_diPickSuggest(i,_diSuggestList[_diSuggestIdx],id);return;}
    if(e.key==='Escape'){e.preventDefault();_diCloseSuggest();return;}
  }
  if(e.key==='Enter'){
    e.preventDefault();e.stopPropagation();
    if(field==='amt'){const n=document.querySelector(`#diRow${i} .di-name`);if(n)n.focus();}
    else if(field==='name'){_detailIngs[i].name=e.target.value;_diCloseSuggest();_diAdd(id);}
    else if(field==='staple'){_diTogglePantry(i,id);}
  } else if(e.key===' '&&field==='staple'){
    e.preventDefault();_diTogglePantry(i,id);
  } else if(e.key==='Tab'&&!e.shiftKey&&field==='amt'){
    e.preventDefault();_detailIngs[i].amount=e.target.value;
    const n=document.querySelector(`#diRow${i} .di-name`);if(n)n.focus();
  } else if(e.key==='Tab'&&!e.shiftKey&&field==='name'){
    e.preventDefault();_detailIngs[i].name=e.target.value;_diCloseSuggest();
    const s=document.querySelector(`#diRow${i} .di-staple-btn`);if(s)s.focus();
  } else if(e.key==='Tab'&&!e.shiftKey&&field==='staple'){
    e.preventDefault();
    if(i<_detailIngs.length-1){
      const a=document.querySelector(`#diRow${i+1} .di-amt`);if(a)a.focus();
    } else {
      const isEmpty=!(_detailIngs[i].amount||'').trim()&&!(_detailIngs[i].name||'').trim();
      if(isEmpty){
        _detailIngs.splice(i,1);_diRender(id);_diSave(id);
        const ta=document.querySelector('.rec-detail-inst-ta');if(ta){ta.focus();ta.selectionStart=ta.selectionEnd=ta.value.length;}
      } else {
        _diAdd(id);
      }
    }
  } else if(e.key==='Tab'&&e.shiftKey&&field==='staple'){
    e.preventDefault();const n=document.querySelector(`#diRow${i} .di-name`);if(n)n.focus();
  } else if(e.key==='Tab'&&e.shiftKey&&field==='name'){
    e.preventDefault();const a=document.querySelector(`#diRow${i} .di-amt`);if(a)a.focus();
  } else if(e.key==='Tab'&&e.shiftKey&&field==='amt'&&i>0){
    e.preventDefault();const p=document.querySelector(`#diRow${i-1} .di-staple-btn`);if(p)p.focus();
  } else if(e.key==='Backspace'&&!e.target.value&&field!=='staple'&&_detailIngs.length>0){
    _diDel(i,id);
  }
}
function _diHighlightSuggest(){
  const drop=document.getElementById('diSuggestDrop');if(!drop)return;
  drop.querySelectorAll('.di-suggest-item').forEach((el,j)=>{el.classList.toggle('active',j===_diSuggestIdx);});
  const active=drop.querySelector('.di-suggest-item.active');if(active)active.scrollIntoView({block:'nearest'});
}
function _diSave(id){
  _diFlush();_diSortStaples();
  const clean=_detailIngs.filter(x=>(x.name||'').trim()||(x.amount||'').trim());
  const r=st.recipes.find(x=>String(x.id)===String(id));if(!r)return;
  r.ingredients=_serializeIngredients(clean);save();
  sbReqSilent('PATCH','recipes',{ingredients:r.ingredients},`?id=eq.${id}`);
}
function _diBlur(id){
  setTimeout(()=>{
    const list=document.getElementById('recDetailIngList');
    if(list&&list.contains(document.activeElement))return;
    const add=document.querySelector('.rec-detail-ing-add');
    if(add&&add===document.activeElement)return;
    _diSave(id);
  },50);
}
function _diDragStart(e,id,idx){
  if(e.button!==0)return;
  if(e.target.matches('input,button'))return;
  e.preventDefault();
  const list=document.getElementById('recDetailIngList');if(!list)return;
  const items=[...list.querySelectorAll('.di-row')];
  const dragged=items[idx];if(!dragged)return;
  let moved=false,dropIdx=idx;
  const startY=e.clientY;
  const onMove=ev=>{
    if(!moved&&Math.abs(ev.clientY-startY)<4)return;
    if(!moved){moved=true;dragged.style.opacity='.4';}
    let ph=list.querySelector('.rec-ing-drop-line');
    if(!ph){ph=document.createElement('div');ph.className='rec-ing-drop-line';list.appendChild(ph);}
    const rows=[...list.querySelectorAll('.di-row')];
    let inserted=false;dropIdx=rows.length;
    for(let i=0;i<rows.length;i++){
      const rc=rows[i].getBoundingClientRect();
      if(ev.clientY<rc.top+rc.height/2){list.insertBefore(ph,rows[i]);dropIdx=i;inserted=true;break;}
    }
    if(!inserted&&rows.length)rows[rows.length-1].after(ph);
  };
  const onUp=()=>{
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    dragged.style.opacity='';
    const ph=list.querySelector('.rec-ing-drop-line');if(ph)ph.remove();
    if(!moved||dropIdx===idx)return;
    _diFlush();
    const ing=_detailIngs.splice(idx,1)[0];
    if(dropIdx>idx)dropIdx--;
    _detailIngs.splice(dropIdx,0,ing);
    _diRender(id);_diSave(id);
  };
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onUp);
}
let _recAddingNew=false;
function _recAddInline(){
  const maxSort=Math.max(0,...(st.recipes||[]).map(r=>r.sort_order||0));
  const data={name:'',meal_type:null,cuisine:null,time:null,servings:null,ingredients:null,instructions:null,favorite:false,sort_order:maxSort+1};
  const local={id:'l-'+Date.now(),...data};
  st.recipes.push(local);save();
  _recPanelId=String(local.id);
  _recAddingNew=true;
  renderRecipeList();renderRecipeDetail(_recPanelId);
  _recFocusNewTitle(local);
}
function _recFocusNewTitle(local){
  setTimeout(()=>{
    const inp=document.querySelector('.rec-detail-title-inp');
    if(!inp)return;
    inp.focus();inp.select();
    inp.onblur=async function(){
      const name=this.value.trim();
      _recAddingNew=false;
      if(!name){
        // Discard — never posted to Supabase
        const i=st.recipes.findIndex(x=>x.id===local.id);
        if(i>-1)st.recipes.splice(i,1);
        save();
        _recPanelId=st.recipes.length?String(st.recipes[0].id):null;
        renderRecipeList();
        if(_recPanelId)renderRecipeDetail(_recPanelId);
        else{const p=document.getElementById('recDetailPanel');if(p)p.innerHTML='<div class="rec-detail-empty">Select a recipe to view</div>';}
        return;
      }
      // Now POST to Supabase for the first time
      local.name=name;save();
      const data={name:local.name,meal_type:local.meal_type,cuisine:local.cuisine,time:local.time,servings:local.servings,ingredients:local.ingredients,instructions:local.instructions,favorite:local.favorite,sort_order:local.sort_order};
      const sv=await sbReq('POST','recipes',data);
      if(sv&&sv[0]){const i=st.recipes.findIndex(x=>x.id===local.id);if(i>-1){st.recipes[i]=sv[0];_recPanelId=String(sv[0].id);save();renderRecipeList();renderRecipeDetail(_recPanelId);}}
    };
  },30);
}
function _recSaveField(id,field,val){
  setRecField(id,field,val);
  renderRecipeList();
}
function _recInlineEdit(el,id,field,type,opts){
  if(el.querySelector('input,select,textarea'))return;
  const r=st.recipes.find(x=>String(x.id)===String(id));if(!r)return;
  const val=r[field]||'';
  const save=newVal=>{
    let parsed=newVal;
    if(type==='number')parsed=parseInt(newVal)||null;
    else parsed=newVal.trim()||null;
    setRecField(id,field,parsed);
    renderRecipeDetail(id);renderRecipeList();
  };
  if(type==='textarea'){
    const h=el.offsetHeight;
    const ta=document.createElement('textarea');
    ta.value=val;ta.className='rec-inline-ta';
    ta.style.cssText='width:100%;height:'+Math.max(h,120)+'px;font-family:inherit;font-size:13px;line-height:1.7;border:1px solid var(--accent);border-radius:6px;padding:6px 8px;background:var(--bg);color:var(--text);outline:none;resize:none;box-sizing:border-box';
    el.innerHTML='';el.appendChild(ta);ta.focus();
    ta.addEventListener('blur',()=>save(ta.value));
    ta.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();renderRecipeDetail(id);}});
  } else if(type==='select'){
    const sel=document.createElement('select');
    sel.style.cssText='font-family:inherit;font-size:11px;border:1px solid var(--accent);border-radius:4px;padding:2px 4px;background:var(--bg);color:var(--text);outline:none';
    sel.innerHTML='<option value="">—</option>'+opts.map(o=>`<option value="${o}"${val===o?' selected':''}>${o}</option>`).join('');
    el.innerHTML='';el.appendChild(sel);sel.focus();
    sel.addEventListener('change',()=>{save(sel.value);});
    sel.addEventListener('blur',()=>{save(sel.value);});
    sel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();renderRecipeDetail(id);}});
  } else {
    const inp=document.createElement('input');
    inp.type=type==='number'?'number':'text';
    inp.value=val;
    inp.style.cssText='font-family:inherit;font-size:inherit;font-weight:inherit;border:none;border-bottom:1px solid var(--accent);background:transparent;color:var(--text);outline:none;width:100%;padding:0 0 2px';
    if(type==='number'){inp.style.width='60px';inp.min='0';}
    el.innerHTML='';el.appendChild(inp);inp.focus();inp.select();
    inp.addEventListener('blur',()=>save(inp.value));
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();inp.blur();}if(e.key==='Escape'){e.preventDefault();renderRecipeDetail(id);}});
  }
}

let _recSearchFilterFn=null;
function _recSetSearch(q){
  _recSearch=q;
  if(!q){_recSearchFilterFn=null;_recMealFilter='';_recCuisineFilter='';_recTimeFilter='';_recFavFilter=false;}
  renderRecipeTable();
  _recShowSuggestions(q);
  const inp=document.getElementById('recSearchInp');
  // show/hide clear button
  if(inp){
    let clr=inp.parentElement.querySelector('.rec-search-clear');
    if(q&&!clr){clr=document.createElement('button');clr.className='rec-search-clear';clr.style.cssText='position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:0 2px;font-size:10px;color:var(--muted);line-height:1;z-index:2';clr.title='Clear (Esc)';clr.textContent='✕';clr.onclick=_recClearSearch;inp.parentElement.appendChild(clr);}
    else if(!q&&clr)clr.remove();
  }
}
function _recClearSearch(){
  _recSearch='';_recSearchFilterFn=null;_recMealFilter='';_recCuisineFilter='';_recTimeFilter='';_recFavFilter=false;
  const inp=document.getElementById('recSearchInp');if(inp)inp.value='';
  const sg=document.getElementById('recSearchSuggestions');if(sg)sg.style.display='none';
  const clr=document.querySelector('.rec-search-clear');if(clr)clr.remove();
  renderRecipeTable();
}
function _recSearchKey(e){
  const sg=document.getElementById('recSearchSuggestions');
  const sgOpen=sg&&sg.style.display!=='none';
  if(e.key==='Escape'){e.preventDefault();_recClearSearch();return;}
  if(e.key==='Enter'){
    e.preventDefault();
    if(sgOpen){const act=sg.querySelector('.rec-sg-active');if(act){act.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));return;}sg.style.display='none';}
    return;
  }
  if(e.key==='ArrowDown'){
    e.preventDefault();
    if(sgOpen){const items=sg.querySelectorAll('.rec-sg-item');const act=sg.querySelector('.rec-sg-active');let idx=0;items.forEach((it,i)=>{if(it===act)idx=i+1;});if(idx>=items.length)idx=0;items.forEach(it=>it.classList.remove('rec-sg-active'));if(items[idx]){items[idx].classList.add('rec-sg-active');items[idx].scrollIntoView({block:'nearest'});}}
    return;
  }
  if(e.key==='ArrowUp'){
    e.preventDefault();
    if(sgOpen){const items=sg.querySelectorAll('.rec-sg-item');const act=sg.querySelector('.rec-sg-active');let idx=items.length-1;items.forEach((it,i)=>{if(it===act)idx=i-1;});if(idx<0)idx=items.length-1;items.forEach(it=>it.classList.remove('rec-sg-active'));if(items[idx]){items[idx].classList.add('rec-sg-active');items[idx].scrollIntoView({block:'nearest'});}}
    return;
  }
}
function _recSearchFocus(){if(_recSearch&&_recSearch.length>=1)_recShowSuggestions(_recSearch);}
function _recShowSuggestions(q){
  const sg=document.getElementById('recSearchSuggestions');if(!sg)return;
  if(!q||q.length<1){sg.style.display='none';return;}
  const lq=q.toLowerCase();
  const recs=st.recipes||[];
  const seen=new Set();const suggestions=[];
  const add=(type,text,icon)=>{const k=type+':'+text;if(seen.has(k))return;seen.add(k);suggestions.push({type,text,icon});};
  // Meal types
  ['Breakfast','Lunch','Dinner','Snack','Dessert','Drink','Side'].forEach(m=>{if(m.toLowerCase().includes(lq))add('meal',m,'');});
  // Cuisines (from existing recipes)
  const cuisines={};recs.forEach(r=>{if(r.cuisine)cuisines[r.cuisine]=(cuisines[r.cuisine]||0)+1;});
  Object.keys(cuisines).sort().forEach(c=>{if(c.toLowerCase().includes(lq))add('cuisine',c,'');});
  // Favorites
  if('favorites'.includes(lq)||'favs'.includes(lq)||'♥'.includes(lq))add('filter','Favorites','♥');
  // Time filters
  if('quick'.includes(lq)||'30'.includes(lq)||'30 min'.includes(lq))add('time','≤ 30 min','');
  if('under an hour'.includes(lq)||'60'.includes(lq)||'1 hour'.includes(lq)||'1h'.includes(lq))add('time','≤ 1 hour','');
  // Recipe name matches
  recs.forEach(r=>{
    if((r.name||'').toLowerCase().includes(lq))add('recipe',r.name,'');
  });
  // Ingredient matches
  recs.forEach(r=>{
    const ings=_parseIngredients(r.ingredients);
    ings.forEach(ing=>{if((ing.name||'').toLowerCase().includes(lq))add('ingredient',ing.name,'');});
  });
  if(!suggestions.length){sg.style.display='none';return;}
  const badgeColors={meal:'var(--accent)',cuisine:'#0ea5e9',filter:'#ef4444',time:'#f59e0b',recipe:'var(--text)',ingredient:'#22c55e'};
  sg.style.display='block';
  sg.innerHTML=suggestions.slice(0,10).map(s=>{
    const hl=_recHighlight(s.text,lq);
    const safe=s.text.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return'<div class="rec-sg-item" onmousedown="event.preventDefault();_recPickSuggestion(\''+safe+'\',\''+s.type+'\')" style="padding:6px 10px;font-size:12px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:4px;margin:2px 4px"><span style="font-size:9px;color:'+badgeColors[s.type]+';margin-right:6px;font-weight:600">'+s.type+'</span>'+hl+'</div>';
  }).join('');
}
function _recHighlight(text,q){
  if(!q)return(text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const t=(text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const idx=t.toLowerCase().indexOf(q.toLowerCase());
  if(idx===-1)return t;
  return t.slice(0,idx)+'<mark style="background:rgba(250,204,21,.4);padding:0 1px;border-radius:2px">'+t.slice(idx,idx+q.length)+'</mark>'+t.slice(idx+q.length);
}
function _recPickSuggestion(text,type){
  const sg=document.getElementById('recSearchSuggestions');if(sg)sg.style.display='none';
  const inp=document.getElementById('recSearchInp');
  _recSearchFilterFn=null;_recMealFilter='';_recCuisineFilter='';_recTimeFilter='';_recFavFilter=false;
  if(type==='meal'){
    _recMealFilter=text;_recSearch=text;if(inp)inp.value=text;
  } else if(type==='cuisine'){
    _recCuisineFilter=text;_recSearch=text;if(inp)inp.value=text;
  } else if(type==='filter'&&text==='Favorites'){
    _recFavFilter=true;_recSearch=text;if(inp)inp.value=text;
  } else if(type==='time'){
    _recTimeFilter=text.includes('30')?'30':'60';_recSearch=text;if(inp)inp.value=text;
  } else {
    _recSearch=text;if(inp)inp.value=text;
  }
  renderRecipeTable();
  // Auto-select first result
  const rows=_getFilteredRecipes();
  if(rows.length){_recPanelId=String(rows[0].id);renderRecipeDetail(_recPanelId);renderRecipeList();}
}

// ── Easy Meals ────────────────────────────────────────────────────────────────
let _editEasyIdx=-1,_emIngs=[];
function _closeEasyMeals(){
  const popup=document.querySelector('.easy-meals-popup');
  if(popup)popup.classList.remove('open');
  _editEasyIdx=-1;_emIngs=[];
  document.activeElement?.blur();
}
function toggleEasyMealsPopup(){
  let popup=document.querySelector('.easy-meals-popup');
  if(popup){
    if(popup.classList.contains('open')){_closeEasyMeals();return;}
    popup.classList.add('open');_editEasyIdx=-1;_emIngs=[];renderEasyMeals();return;
  }
  popup=document.createElement('div');popup.className='easy-meals-popup open';
  document.querySelector('.rec-book-wrap').appendChild(popup);
  // Click outside to close
  document.addEventListener('mousedown',e=>{
    const p=document.querySelector('.easy-meals-popup');
    if(!p||!p.classList.contains('open'))return;
    if(!p.contains(e.target)&&!e.target.closest('.easy-meals-btn'))_closeEasyMeals();
  });
  // Enter/Escape to close
  popup.addEventListener('keydown',e=>{
    e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();_closeEasyMeals();}
    if(e.key==='Enter'&&!e.target.matches('input,textarea,button')){e.preventDefault();_closeEasyMeals();}
  });
  renderEasyMeals();
}
function renderEasyMeals(){
  const popup=document.querySelector('.easy-meals-popup');if(!popup)return;
  const meals=st.easyMeals||[];
  const editing=_editEasyIdx>=0;
  let html=`<div class="easy-meals-hdr"><span>Easy Meals</span><button onclick="toggleEasyMealsPopup()">✕</button></div>`;
  if(!editing){
    html+=`<div class="easy-meals-list">`;
    if(!meals.length)html+=`<div style="padding:16px;text-align:center;color:var(--muted);font-size:11px">No easy meals yet</div>`;
    meals.forEach((m,i)=>{
      const ings=_emIngNames(m);
      html+=`<div class="easy-meal-row" onclick="editEasyMeal(${i})">
        <span class="easy-meal-name">${escHtml(m.name)}</span>
        <span class="easy-meal-ings">${escHtml(ings)}</span>
        <span style="color:var(--muted);font-size:10px">${m.servings||1}sv</span>
        <button class="easy-meal-del" onclick="event.stopPropagation();deleteEasyMeal(${i})" title="Delete">✕</button>
      </div>`;
    });
    html+=`</div>`;
    html+=`<div class="easy-meals-add"><button onclick="newEasyMeal()" style="width:100%;padding:6px;border:1px dashed var(--border);border-radius:8px;background:transparent;color:var(--accent);font-size:11px;font-weight:600;cursor:pointer">+ New Easy Meal</button></div>`;
  } else {
    const m=_editEasyIdx<meals.length?meals[_editEasyIdx]:null;
    html+=`<div class="easy-meals-add" style="flex:1;overflow-y:auto;border-top:none">`;
    html+=`<div class="easy-meals-add-row"><input id="easyMealName" placeholder="Meal name" value="${escHtml(m?m.name:'')}" onkeydown="if(event.key==='Enter'){event.preventDefault();document.getElementById('easyMealServings').focus()}"><input id="easyMealServings" type="number" min="1" placeholder="Sv" style="width:50px;flex:none" value="${m?m.servings||1:1}" onkeydown="if(event.key==='Enter'){event.preventDefault();_emFocusFirst()}"></div>`;
    html+=`<div style="font-size:10px;font-weight:700;color:var(--muted);margin:4px 0 2px">Ingredients</div>`;
    html+=`<div class="em-ing-list" id="emIngList">`;
    _emIngs.forEach((ing,i)=>{
      html+=`<div class="em-ing-row" id="emIng${i}"><input class="em-ing-name" placeholder="ingredient" value="${escHtml(ing.name||'')}" oninput="_emIngs[${i}].name=this.value" onkeydown="_emIngKey(event,${i})"><button class="em-ing-del" onclick="_emIngDel(${i})" title="Remove">✕</button></div>`;
    });
    html+=`</div>`;
    html+=`<button class="em-ing-add" onclick="_emIngAdd()">+ Add ingredient</button>`;
    html+=`<div style="display:flex;gap:6px;margin-top:4px"><button onclick="saveEasyMeal()" style="flex:1;padding:5px 12px;border:1px solid var(--accent);border-radius:6px;background:var(--accent);color:#fff;font-size:11px;font-weight:600;cursor:pointer">Save</button><button onclick="cancelEasyMealEdit()" style="padding:5px 12px;border:1px solid var(--border);border-radius:6px;background:transparent;color:var(--muted);font-size:11px;cursor:pointer">Cancel</button></div>`;
    html+=`</div>`;
  }
  popup.innerHTML=html;
}
function _emIngNames(m){
  const ings=_parseIngredients(m.ingredients);
  return ings.map(x=>x.name).filter(Boolean).join(', ');
}
function newEasyMeal(){
  _editEasyIdx=st.easyMeals?st.easyMeals.length:0;
  _emIngs=[{name:''}];
  renderEasyMeals();
  setTimeout(()=>{const inp=document.getElementById('easyMealName');if(inp)inp.focus();},20);
}
function editEasyMeal(i){
  _editEasyIdx=i;
  const m=(st.easyMeals||[])[i];if(!m)return;
  _emIngs=_parseIngredients(m.ingredients).map(x=>({name:x.name||''}));
  if(!_emIngs.length)_emIngs=[{name:''}];
  renderEasyMeals();
}
function cancelEasyMealEdit(){
  _editEasyIdx=-1;_emIngs=[];
  renderEasyMeals();
}
function _emIngAdd(){
  _emFlush();_emIngs.push({name:''});renderEasyMeals();
  const i=_emIngs.length-1;
  setTimeout(()=>{const inp=document.querySelector(`#emIng${i} .em-ing-name`);if(inp)inp.focus();},20);
}
function _emIngDel(i){
  _emFlush();_emIngs.splice(i,1);renderEasyMeals();
}
function _emFlush(){
  _emIngs.forEach((ing,i)=>{const el=document.querySelector(`#emIng${i} .em-ing-name`);if(el)ing.name=el.value;});
}
function _emFocusFirst(){
  const inp=document.querySelector('#emIng0 .em-ing-name');if(inp)inp.focus();
}
function _emIngKey(e,i){
  if(e.key==='Enter'){
    e.preventDefault();
    _emIngs[i].name=e.target.value;
    if(e.target.value.trim())_emIngAdd();
  } else if(e.key==='Backspace'&&!e.target.value&&_emIngs.length>1){
    _emIngDel(i);
    const prev=Math.max(0,i-1);
    setTimeout(()=>{const inp=document.querySelector(`#emIng${prev} .em-ing-name`);if(inp)inp.focus();},20);
  }
}
function saveEasyMeal(){
  _emFlush();
  const name=(document.getElementById('easyMealName')?.value||'').trim();
  if(!name)return;
  const servings=parseInt(document.getElementById('easyMealServings')?.value)||1;
  const clean=_emIngs.filter(x=>(x.name||'').trim());
  const ingredients=_serializeIngredients(clean.map(x=>({name:x.name.trim(),amount:''})));
  if(!st.easyMeals)st.easyMeals=[];
  if(_editEasyIdx>=0&&_editEasyIdx<st.easyMeals.length){
    st.easyMeals[_editEasyIdx]={...st.easyMeals[_editEasyIdx],name,servings,ingredients};
  } else {
    st.easyMeals.push({id:'em-'+Date.now(),name,servings,ingredients});
  }
  _editEasyIdx=-1;_emIngs=[];
  save();renderEasyMeals();
}
function deleteEasyMeal(i){
  if(!st.easyMeals)return;
  st.easyMeals.splice(i,1);
  save();renderEasyMeals();
}

function renderRecipesPage(){
  const page=document.getElementById('page-recipes');if(!page)return;
  if(!page._recInit){
    page._recInit=true;
    page.innerHTML=`<div class="ov-topbar"><div class="ov-topbar-left"><span class="ov-topbar-label">Recipes</span><span class="ov-topbar-dot"></span></div><span class="ov-topbar-date topbar-date"></span><div class="ov-topbar-right"><span class="ov-topbar-dot"></span><span class="ov-topbar-time topbar-time"></span></div></div>
    <div class="rec-book-wrap">
      <div class="rec-search-float">
        <div class="rec-search-cutout"></div>
        <div class="rec-search-inner">
          <div style="position:relative;display:flex;align-items:center">
            <input id="recSearchInp" type="text" autocomplete="off" placeholder="Search recipes…" value="" oninput="_recSetSearch(this.value)" onkeydown="event.stopPropagation();_recSearchKey(event)" onfocus="_recSearchFocus()" class="rec-search-inp">
          </div>
          <button class="rec-search-plus" onclick="_recAddInline()" title="Add Recipe">+</button>
        </div>
        <div id="recSearchSuggestions" class="rec-search-suggestions"></div>
      </div>
      <div class="easy-meals-float">
        <div class="easy-meals-cutout"></div>
        <button class="easy-meals-btn" onclick="toggleEasyMealsPopup()">Easy Meals</button>
      </div>
      <div class="rec-book">
        <div class="rec-book-left">
          <div class="rec-list-scroll" id="recListScroll"></div>
        </div>
        <div class="rec-book-right" id="recDetailPanel">
          <div class="rec-detail-empty">Select a recipe to view</div>
        </div>
      </div>
    </div>`;
    page.addEventListener('dblclick',e=>{
      if(!e.target.closest('.rec-list-item,button,input,textarea,select,.rec-book-right'))_recAddInline();
    });
    document.addEventListener('keydown',e=>{
      if(!document.getElementById('page-recipes')?.classList.contains('active'))return;
      if(e.target.matches('input,textarea,select'))return;
      if(document.getElementById('recipeModal')?.classList.contains('open'))return;
      if(e.key==='ArrowRight'){
        e.preventDefault();_recNavOffset(1);
      } else if(e.key==='ArrowLeft'){
        e.preventDefault();_recNavOffset(-1);
      } else if(e.key==='ArrowDown'){
        e.preventDefault();_recMoveSelected(1);
      } else if(e.key==='ArrowUp'){
        e.preventDefault();_recMoveSelected(-1);
      } else if(e.key==='f'&&_recPanelId){
        e.preventDefault();toggleRecFavorite(_recPanelId);renderRecipeDetail(_recPanelId);renderRecipeList();
      }
    });
    document.addEventListener('click',e=>{
      if(!e.target.closest('#recSearchInp')&&!e.target.closest('#recSearchSuggestions')){
        const sg=document.getElementById('recSearchSuggestions');if(sg)sg.style.display='none';
      }
    });
  }
  _recEnsureSortOrder();
  renderRecipeList();
  // Auto-select first recipe if none selected
  if(!_recPanelId&&st.recipes&&st.recipes.length){
    _recPanelId=String(st.recipes[0].id);
    renderRecipeDetail(_recPanelId);
  }
  const now=new Date();
  document.querySelectorAll('#page-recipes .topbar-date').forEach(e=>e.textContent=now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));
  document.querySelectorAll('#page-recipes .topbar-time').forEach(e=>e.textContent=now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}));
}
// ── END RECIPES PAGE ──────────────────────────────────────────────────────────

// ── GROCERY LIST ──────────────────────────────────────────────────────────────
function _groceryWeekOf(){const d=new Date();const dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow);return d.toISOString().split('T')[0];}

function _groceryForWeek(){const wk=_groceryWeekOf();return(st.groceryList||[]).filter(g=>g.week_of===wk);}

function _groceryCount(){return _groceryForWeek().filter(g=>!g.checked).length;}

async function generateGroceryStaples(){
  const wk=_groceryWeekOf();
  const existing=_groceryForWeek().filter(g=>g.source==='staple');
  const staples=(st.groceryStaples||[]).filter(s=>s.active!==false);
  const toAdd=staples.filter(s=>!existing.find(e=>String(e.source_id)===String(s.id)));
  for(const s of toAdd){
    const item={name:s.name,amount:s.amount||null,source:'staple',source_id:s.id,aisle:s.aisle||null,checked:false,week_of:wk};
    const sv=await sbReqSilent('POST','grocery_list',item);
    if(sv&&sv[0])st.groceryList.push(sv[0]);
  }
  save();
}

async function addRecipeToGrocery(recipeId){
  const r=(st.recipes||[]).find(x=>String(x.id)===String(recipeId));if(!r)return;
  const ings=_parseIngredients(r.ingredients).filter(i=>!i.is_pantry);
  const wk=_groceryWeekOf();
  for(const ing of ings){
    const dup=(st.groceryList||[]).find(g=>g.week_of===wk&&g.source==='recipe'&&g.source_id===r.id&&g.name.toLowerCase()===ing.name.toLowerCase());
    if(dup)continue;
    const item={name:ing.name,amount:ing.amount||null,source:'recipe',source_id:r.id,recipe_name:r.name,aisle:null,checked:false,week_of:wk};
    const sv=await sbReqSilent('POST','grocery_list',item);
    if(sv&&sv[0])st.groceryList.push(sv[0]);
  }
  save();renderGroceryModal();
}

async function addGroceryManual(name,amount){
  if(!name)return;
  const wk=_groceryWeekOf();
  const item={name,amount:amount||null,source:'manual',source_id:null,recipe_name:null,aisle:null,checked:false,week_of:wk};
  const sv=await sbReqSilent('POST','grocery_list',item);
  if(sv&&sv[0])st.groceryList.push(sv[0]);
  else{item.id='l-'+Date.now();st.groceryList.push(item);}
  save();renderGroceryModal();
}

async function togGroceryItem(id,checked){
  const item=(st.groceryList||[]).find(g=>String(g.id)===String(id));if(!item)return;
  item.checked=checked;save();renderGroceryModal();
  sbReqSilent('PATCH','grocery_list',{checked},`?id=eq.${id}`);
}

async function delGroceryItem(id){
  st.groceryList=st.groceryList.filter(g=>String(g.id)!==String(id));save();renderGroceryModal();
  sbReqSilent('DELETE','grocery_list',null,`?id=eq.${id}`);
}

function openGroceryModal(wkKeyOrOff){
  if(typeof wkKeyOrOff==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(wkKeyOrOff)){
    // Convert wkKey (Monday date) to offset from current week
    const thisMon=getWkKey(0);
    _grocWkOff=Math.round((new Date(wkKeyOrOff+'T00:00:00')-new Date(thisMon+'T00:00:00'))/604800000);
  } else {
    _grocWkOff=wkKeyOrOff||0;
  }
  _grocRecSearch='';
  generateGroceryStaples().then(()=>renderGroceryModal());
  let modal=document.getElementById('groceryModal');
  if(!modal){
    modal=document.createElement('dialog');modal.id='groceryModal';modal.className='overlay grocery-modal';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
    modal.addEventListener('close',()=>{modal.classList.remove('open');modal.blur();document.activeElement?.blur();});
    modal.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();modal.close();}
      if(e.key==='Enter'&&!e.target.matches('input,textarea,button')){e.preventDefault();e.stopPropagation();modal.close();}
      if(e.key==='s'&&!e.target.matches('input,textarea')){e.preventDefault();e.stopPropagation();modal.close();}
      if(e.key==='t'&&!e.target.matches('input,textarea')){e.preventDefault();e.stopPropagation();_grocWkOff=0;renderGroceryModal();modal.focus();}
      if(e.key==='ArrowLeft'&&!e.target.matches('input,textarea')){e.preventDefault();e.stopPropagation();_grocWkOff--;renderGroceryModal();modal.focus();}
      if(e.key==='ArrowRight'&&!e.target.matches('input,textarea')){e.preventDefault();e.stopPropagation();_grocWkOff++;renderGroceryModal();modal.focus();}
    });
  }
  modal.classList.add('open');modal.showModal();
  renderGroceryModal();
}

let _grocWkOff=0;
function _grocPeopleKey(weekMon){return'_grocPeople_'+weekMon;}
function _getGrocPeople(weekMon){const v=localStorage.getItem(_grocPeopleKey(weekMon));return v?parseInt(v):2;}
function setGrocPeople(n,weekMon){const prev=_getGrocPeople(weekMon);localStorage.setItem(_grocPeopleKey(weekMon),n);
  const nextMon=new Date(new Date(weekMon+'T12:00:00').getTime()+7*864e5).toISOString().split('T')[0];
  localStorage.setItem(_grocPeopleKey(nextMon),n);
  if(prev!==n)_adjustMealsForPeople(prev,n);renderGroceryModal();if(typeof renderMealRow==='function')renderMealRow();}
async function _adjustMealsForPeople(oldP,newP){
  // Adjust both menu week (this week) and plan week (next week)
  const menuMon=_grocWeekMonday(_grocWkOff);
  const planMon=_grocWeekMonday(_grocWkOff+1);
  for(const weekMon of [menuMon,planMon]){await _adjustMealsForPeopleWeek(weekMon,newP);}
  save();
}
async function _adjustMealsForPeopleWeek(weekMon,newP){
  const dates=_grocWeekDatesFor(weekMon);
  const weekMeals=(st.mealPlan||[]).filter(m=>dates.includes(m.meal_date));
  const byRecipe={};
  weekMeals.forEach(m=>{if(!m.recipe_id)return;const k=String(m.recipe_id);(byRecipe[k]=byRecipe[k]||[]).push(m);});
  for(const[rid,meals] of Object.entries(byRecipe)){
    const r=(st.recipes||[]).find(x=>String(x.id)===rid);if(!r)continue;
    const want=Math.ceil((r.servings||2)/newP);
    const have=meals.length;
    if(have>want){
      const remove=meals.slice(want);
      remove.forEach(m=>{st.mealPlan=st.mealPlan.filter(x=>String(x.id)!==String(m.id));sbReqSilent('DELETE','meal_plan',null,`?id=eq.${m.id}`);});
    } else if(have<want){
      const usedDays=new Set(meals.map(m=>m.meal_date));
      for(let i=0;i<want-have;i++){
        let ds=dates[0];
        for(const d of dates){if(!usedDays.has(d)&&(st.mealPlan||[]).filter(m=>m.meal_date===d).length<2){ds=d;break;}}
        usedDays.add(ds);
        const item={recipe_id:r.id,recipe_name:r.name,meal_date:ds,servings:r.servings||2,meal_type:r.meal_type||null};
        const sv=await sbReqSilent('POST','meal_plan',item);
        if(sv&&sv[0])st.mealPlan.push(sv[0]);else{item.id='l-'+(Date.now()+i);st.mealPlan.push(item);}
      }
    }
  }
}
function _grocWeekMonday(off){const d=new Date();const dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow+(off||0)*7);return d.toISOString().split('T')[0];}
function _grocWeekDatesFor(mon){const m=new Date(mon+'T12:00:00');return Array.from({length:7},(_,i)=>{const x=new Date(m);x.setDate(m.getDate()+i);return x.toISOString().split('T')[0];});}
function _grocWeekLabel(mon){const dates=_grocWeekDatesFor(mon);const m1=new Date(dates[0]+'T12:00:00');const m2=new Date(dates[6]+'T12:00:00');return`${m1.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${m2.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;}

let _grocRecSearch='';

function _inferAisle(name){
  const n=name.toLowerCase();
  const map=[
    ['Produce',/apple|banana|avocado|tomato|lettuce|onion|garlic|pepper|potato|carrot|celery|cucumber|spinach|kale|broccoli|mushroom|lemon|lime|orange|berr|grape|mango|cilantro|parsley|basil|ginger|jalape|zucchini|squash|corn|green bean|asparagus/],
    ['Meat',/chicken|beef|pork|steak|ground|turkey|bacon|sausage|shrimp|salmon|fish|tilapia|lamb|ribs/],
    ['Dairy',/milk|cheese|yogurt|butter|cream|egg|sour cream|cottage|half.*half/],
    ['Bakery',/bread|tortilla|bun|roll|bagel|croissant|pita|naan/],
    ['Frozen',/frozen|ice cream|popsicle|tater tot|french fries|waffle|dumpling|pizza roll|hot pocket|eggo/],
    ['Beverages',/water|juice|soda|coffee|tea|beer|wine|sparkling|kombucha|creamer/],
    ['Snacks',/chip|cracker|cookie|granola|bar|pretzel|popcorn|nut|trail mix/],
    ['Pantry',/rice|pasta|flour|sugar|oil|vinegar|sauce|broth|stock|can|bean|lentil|spice|seasoning|salt|pepper|soy|sriracha|mayo|mustard|ketchup|honey|syrup|cereal|oat/],
  ];
  for(const[aisle,rx]of map)if(rx.test(n))return aisle;
  return'Other';
}

function renderGroceryModal(){
  const modal=document.getElementById('groceryModal');if(!modal)return;
  const dayNames=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const today=new Date().toISOString().split('T')[0];

  // Menu week = what you're eating (offset), Plan week = next (offset+1)
  const menuMon=_grocWeekMonday(_grocWkOff);
  const menuDates=_grocWeekDatesFor(menuMon);

  const planMon=_grocWeekMonday(_grocWkOff+1);
  const planDates=_grocWeekDatesFor(planMon);
  const planMeals=(st.mealPlan||[]).filter(m=>planDates.includes(m.meal_date));
  const plannedRecipeIds=new Set(planMeals.map(m=>String(m.recipe_id)));
  const plannedEasyIds=new Set();
  (st.easyMeals||[]).forEach(em=>{
    if(planMeals.some(m=>m.easy_meal_id===em.id||(m.recipe_id===null&&m.recipe_name===em.name)))plannedEasyIds.add(em.id);
  });

  // ── Build combined shopping list ──
  // 1) Recipe ingredients from grocery_list
  const grocItems=(st.groceryList||[]).filter(g=>g.week_of===planMon);
  // 2) HEB-tagged overview shopping items (undone only)
  const hebShopItems=(st.shopping||[]).filter(s=>s.store&&s.store.toLowerCase()==='heb'&&!s.done);
  // 3) Weekly staples (active, not skipped this week)
  const staples=(st.groceryStaples||[]).filter(s=>s.active!==false);
  const skippedThisWeek=(st._grocStapleSkips||{})[planMon]||[];
  const activeStaples=staples.filter(s=>!skippedThisWeek.includes(String(s.id)));

  // Combine all into unified list, grouped by aisle
  const aisleOrder=['Produce','Meat','Dairy','Bakery','Frozen','Pantry','Beverages','Snacks','Other'];
  function getAisle(item){return item.aisle||'Other';}

  // Build combined items array
  let allItems=[];
  // Recipe items from grocery_list (non-checked)
  grocItems.filter(g=>!g.checked&&g.source==='recipe').forEach(g=>allItems.push({...g,_src:'recipe'}));
  // Manual items
  grocItems.filter(g=>!g.checked&&g.source==='manual').forEach(g=>allItems.push({...g,_src:'manual'}));
  // HEB overview items
  hebShopItems.forEach(s=>allItems.push({id:'heb-'+s.id,name:s.name,amount:null,aisle:s.aisle||_inferAisle(s.name),checked:false,_src:'overview',_shopId:s.id,_shopDone:!!s.done}));
  // Staples
  activeStaples.forEach(s=>{
    const alreadyInList=grocItems.find(g=>g.source==='staple'&&String(g.source_id)===String(s.id));
    if(!alreadyInList)allItems.push({id:'staple-'+s.id,name:s.name,amount:s.amount||null,aisle:s.aisle||_inferAisle(s.name),checked:false,_src:'staple',_stapleId:s.id});
    else if(!alreadyInList.checked)allItems.push({...alreadyInList,_src:'staple',_stapleId:s.id});
  });
  // Sort: undone first, then by aisle
  allItems.sort((a,b)=>{const da=(a._shopDone?1:0),db=(b._shopDone?1:0);if(da!==db)return da-db;const ai=aisleOrder.indexOf(getAisle(a)),bi=aisleOrder.indexOf(getAisle(b));return(ai===-1?99:ai)-(bi===-1?99:bi);});
  // Group by aisle
  const byAisle={};allItems.forEach(it=>{const a=getAisle(it);if(!byAisle[a])byAisle[a]=[];byAisle[a].push(it);});

  function itemRow(g){
    const display=g.amount?`${escHtml(g.amount)} ${escHtml(g.name)}`:escHtml(g.name);
    const chk=g._shopId?`<label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk"${g._shopDone?' checked':''} onchange="togShop('${g._shopId}',this.checked);renderGroceryModal()"></label>`:'';
    return`<div class="groc-item${g._shopDone?' groc-done':''}" data-id="${g.id}">
      ${chk}
      <span class="groc-name">${display}</span>
      <button class="groc-del" onclick="delGroceryItem('${g.id}')">✕</button>
    </div>`;}

  // ── HEADER ──
  let html=`<div class="groc-header" style="display:flex;align-items:center;justify-content:space-between">
    <button class="groc-nav-btn" onclick="document.getElementById('groceryModal').close();showPage('recipes')">Recipes</button>
    <div style="display:flex;align-items:center;gap:8px;flex:1;justify-content:center">
      <button class="groc-nav-btn" onclick="_grocWkOff--;renderGroceryModal();this.closest('dialog').focus()">←</button>
      <span style="font-size:12px;color:var(--muted)">${_grocWeekLabel(menuMon)}</span>
      <button class="groc-nav-btn" onclick="_grocWkOff++;renderGroceryModal();this.closest('dialog').focus()">→</button>
      <button class="groc-nav-btn" onclick="_grocWkOff=0;renderGroceryModal();this.closest('dialog').focus()"${_grocWkOff===0?' disabled style="opacity:.4;pointer-events:none"':''}>This Week</button>
      <span class="groc-people-toggle">People: <button onclick="setGrocPeople(1,'${menuMon}')"${_getGrocPeople(menuMon)===1?' class="active"':''}>1</button><button onclick="setGrocPeople(2,'${menuMon}')"${_getGrocPeople(menuMon)===2?' class="active"':''}>2</button></span>
    </div>
    <button class="groc-close" onclick="document.getElementById('groceryModal').close()">✕</button>
  </div>`;

  // ── TOP: This week's meals (menuMon) — driven by last week's recipe picks ──
  const menuMeals=(st.mealPlan||[]).filter(m=>menuDates.includes(m.meal_date));
  const menuRecipeIds=new Set(menuMeals.map(m=>String(m.recipe_id)));
  // Unplaced: recipes in grocery list (week_of=menuMon) with fewer entries on cal than expected
  const menuGrocIds=[...new Set((st.groceryList||[]).filter(g=>g.week_of===menuMon&&g.source==='recipe'&&g.source_id).map(g=>String(g.source_id)))];
  const unplacedMenu=[];
  menuGrocIds.forEach(rid=>{
    const r=(st.recipes||[]).find(x=>String(x.id)===rid);if(!r)return;
    const expected=Math.ceil((r.servings||2)/_getGrocPeople(menuMon));
    const actual=menuMeals.filter(m=>String(m.recipe_id)===rid).length;
    const missing=expected-actual;
    if(missing<=0)return;
    for(let i=0;i<missing;i++) unplacedMenu.push({recipe_id:rid,recipe_name:r.name});
  });
  html+=`<div class="groc-menu-strip">`;
  html+=`<div class="groc-menu-label">This Week <span style="font-size:9px;color:var(--muted);font-weight:400">${_grocWeekLabel(menuMon)}</span></div>`;
  html+=`<div class="groc-menu-cols">`;
  menuDates.forEach((ds,i)=>{
    const meals=(st.mealPlan||[]).filter(m=>m.meal_date===ds);
    meals.sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const isPast=ds<today;
    const isToday=ds===today;
    html+=`<div class="groc-menu-col${isToday?' groc-col-today':''}${isPast?' groc-col-past':''}" data-ds="${ds}">`;
    html+=`<div class="groc-col-hdr">${dayNames[i]}</div>`;
    meals.forEach(m=>{
      html+=`<span class="groc-meal-tag" draggable="true" data-mealid="${m.id}">${escHtml(m.recipe_name)}<button onclick="event.stopPropagation();removeMeal('${m.id}')">✕</button></span>`;
    });
    html+=`</div>`;
  });
  if(unplacedMenu.length){
    html+=`<div class="groc-menu-col groc-col-unassigned">`;
    html+=`<div class="groc-col-hdr" style="font-size:8px">Unplaced</div>`;
    unplacedMenu.forEach(m=>{
      html+=`<span class="groc-meal-tag groc-meal-unassigned" draggable="true" data-recipeid="${m.recipe_id}">${escHtml(m.recipe_name)}</span>`;
    });
    html+=`</div>`;
  }
  html+=`</div></div>`;

  // ��─ BOTTOM: Three columns ──
  html+=`<div class="groc-bottom">`;

  // Col 1: Search + recipe checkboxes
  html+=`<div class="groc-panel">`;
  html+=`<div class="groc-panel-title">Recipes</div>`;
  html+=`<div style="margin-bottom:6px;flex-shrink:0"><input type="text" id="grocRecipeSearch" placeholder="Search recipes…" oninput="_grocRecSearch=this.value;renderGroceryModal()" value="${escHtml(_grocRecSearch||'')}" style="width:100%;padding:6px 10px;border-radius:var(--rs);border:1px solid var(--gb);font-size:12px;font-family:inherit;color:var(--text);background:var(--glass);outline:none;box-sizing:border-box"></div>`;
  html+=`<div class="groc-recipe-list">`;
  let filteredRecipes=(st.recipes||[]);
  if(_grocRecSearch)filteredRecipes=filteredRecipes.filter(r=>r.name.toLowerCase().includes(_grocRecSearch.toLowerCase()));
  // Easy meals first
  let filteredEasy=(st.easyMeals||[]);
  if(_grocRecSearch)filteredEasy=filteredEasy.filter(m=>m.name.toLowerCase().includes(_grocRecSearch.toLowerCase()));
  if(filteredEasy.length){
    html+=`<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);padding:4px 6px 2px">Easy Meals</div>`;
    filteredEasy.forEach(m=>{
      const isPlanned=plannedEasyIds.has(m.id);
      html+=`<label class="groc-recipe-check${isPlanned?' active':''}">
        <input type="checkbox"${isPlanned?' checked':''} onchange="toggleEasyMealForWeek('${m.id}','${planMon}',this.checked)">
        <span>${escHtml(m.name)}</span>
        <span class="groc-recipe-type">1 meal</span>
      </label>`;
    });
  }
  if(filteredEasy.length&&filteredRecipes.length)html+=`<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);padding:6px 6px 2px">Recipes</div>`;
  filteredRecipes.forEach(r=>{
    const isPlanned=plannedRecipeIds.has(String(r.id));
    html+=`<label class="groc-recipe-check${isPlanned?' active':''}">
      <input type="checkbox"${isPlanned?' checked':''} onchange="toggleMealForWeek('${r.id}','${planMon}',this.checked)">
      <span>${escHtml(r.name)}</span>
      ${r.meal_type?`<span class="groc-recipe-type">${escHtml(r.meal_type)}</span>`:''}
      ${r.servings?`<span class="groc-recipe-type">${Math.ceil(r.servings/_getGrocPeople(menuMon))} meals</span>`:''}
    </label>`;
  });
  html+=`</div>`;
  html+=`</div>`;

  // Col 2: Selected meals with remove
  html+=`<div class="groc-panel">`;
  html+=`<div class="groc-panel-title">Planned Meals <span style="font-weight:400;color:var(--muted);font-size:10px">${_grocWeekLabel(planMon)}</span></div>`;
  if(planMeals.length){
    html+=`<div class="groc-selected-meals">`;
    planMeals.forEach(m=>{
      html+=`<div class="groc-selected-meal"><span>${escHtml(m.recipe_name)}</span><button onclick="removeMealFromWeek('${m.id}','${planMon}')">✕</button></div>`;
    });
    html+=`</div>`;
  } else {
    html+=`<div style="color:var(--muted);font-size:12px;padding:16px 0;text-align:center">Check recipes to plan meals</div>`;
  }
  html+=`</div>`;

  // Col 3: Complete shopping list sorted by aisle
  html+=`<div class="groc-panel">`;
  html+=`<div class="groc-panel-title" style="display:flex;align-items:center;justify-content:space-between">Shopping List <span style="font-weight:400;color:var(--muted);font-size:10px">(${allItems.length})</span><button class="groc-nav-btn" onclick="openGroceryStaplesEditor()" style="font-size:10px">Staples</button></div>`;
  html+=`<div class="groc-add"><input type="text" id="grocAddName" placeholder="Add item…" style="flex:1"><button onclick="addGroceryManualForWeek('${planMon}')">+</button></div>`;
  Object.entries(byAisle).forEach(([aisle,items])=>{
    html+=`<div class="groc-section"><div class="groc-section-title">${escHtml(aisle)}</div><div class="groc-section-grid">${items.map(itemRow).join('')}</div></div>`;
  });
  if(!allItems.length){html+=`<div style="color:var(--muted);font-size:12px;padding:16px 0;text-align:center">Select meals to generate list</div>`;}
  html+=`</div>`;

  html+=`</div>`; // end groc-bottom
  modal.innerHTML=html;
  const inp=document.getElementById('grocAddName');
  if(inp)inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addGroceryManualForWeek(planMon);}});
  const sInp=document.getElementById('grocRecipeSearch');
  if(sInp&&_grocRecSearch)setTimeout(()=>{sInp.focus();sInp.setSelectionRange(sInp.value.length,sInp.value.length);},10);
  // Bind drag/drop on meal columns in the top strip
  modal.querySelectorAll('.groc-menu-col[data-ds]').forEach(col=>{
    col.addEventListener('dragover',e=>{e.preventDefault();col.classList.add('groc-day-drop');});
    col.addEventListener('dragleave',()=>col.classList.remove('groc-day-drop'));
    col.addEventListener('drop',e=>{
      e.preventDefault();col.classList.remove('groc-day-drop');
      const data=e.dataTransfer.getData('text/plain');
      const ds=col.dataset.ds;
      if(data.startsWith('meal-new::')){
        const recipeId=data.replace('meal-new::','');
        const r=(st.recipes||[]).find(x=>String(x.id)===String(recipeId));if(!r)return;
        const item={recipe_id:r.id,recipe_name:r.name,meal_date:ds,servings:r.servings||1,meal_type:r.meal_type||null,sort_order:(st.mealPlan||[]).filter(m=>m.meal_date===ds).length};
        sbReqSilent('POST','meal_plan',item).then(sv=>{
          if(sv&&sv[0])st.mealPlan.push(sv[0]);
          else{item.id='l-'+Date.now();st.mealPlan.push(item);}
          save();renderGroceryModal();renderMealRow();
        });
      } else if(data.startsWith('meal::')){
        const id=data.replace('meal::','');
        const meal=(st.mealPlan||[]).find(m=>String(m.id)===String(id));if(!meal)return;
        meal.meal_date=ds;save();renderGroceryModal();renderMealRow();
        sbReqSilent('PATCH','meal_plan',{meal_date:ds},`?id=eq.${id}`);
      }
    });
  });
  // Bind drag on meal tags
  modal.querySelectorAll('.groc-meal-tag[data-mealid]').forEach(tag=>{
    tag.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('text/plain','meal::'+tag.dataset.mealid);
      e.dataTransfer.effectAllowed='move';
    });
  });
  // Bind drag on unassigned tags
  modal.querySelectorAll('.groc-meal-unassigned[data-recipeid]').forEach(tag=>{
    tag.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('text/plain','meal-new::'+tag.dataset.recipeid);
      e.dataTransfer.effectAllowed='move';
    });
  });
}

// Toggle a recipe on/off for a week
async function toggleMealForWeek(recipeId,weekMon,checked){
  const r=(st.recipes||[]).find(x=>String(x.id)===String(recipeId));if(!r)return;
  if(checked){
    // Calculate how many meal slots: ceil(servings / people)
    const recipeServings=r.servings||2;
    const mealSlots=Math.ceil(recipeServings/_getGrocPeople(weekMon));
    const dates=_grocWeekDatesFor(weekMon);
    // Find empty days for each slot
    const usedDays=new Set();
    for(let s=0;s<mealSlots;s++){
      let ds=dates[0];
      for(const d of dates){if(!usedDays.has(d)&&(st.mealPlan||[]).filter(m=>m.meal_date===d).length<2){ds=d;break;}}
      usedDays.add(ds);
      const item={recipe_id:r.id,recipe_name:r.name,meal_date:ds,servings:recipeServings,meal_type:r.meal_type||null};
      const sv=await sbReqSilent('POST','meal_plan',item);
      if(sv&&sv[0])st.mealPlan.push(sv[0]);
      else{item.id='l-'+(Date.now()+s);st.mealPlan.push(item);}
    }
    // Add ingredients to grocery list (exclude pantry + staples)
    const stapleNames=new Set((st.groceryStaples||[]).filter(s=>s.active!==false).map(s=>s.name.toLowerCase()));
    const ings=_parseIngredients(r.ingredients).filter(i=>!i.is_pantry&&!stapleNames.has(i.name.toLowerCase()));
    for(const ing of ings){
      const dup=(st.groceryList||[]).find(g=>g.week_of===weekMon&&g.source==='recipe'&&String(g.source_id)===String(r.id)&&g.name.toLowerCase()===ing.name.toLowerCase());
      if(dup)continue;
      const gi={name:ing.name,amount:ing.amount||null,source:'recipe',source_id:r.id,recipe_name:r.name,aisle:ing.aisle||_inferAisle(ing.name),checked:false,week_of:weekMon};
      const gsv=await sbReqSilent('POST','grocery_list',gi);
      if(gsv&&gsv[0])st.groceryList.push(gsv[0]);
      else{gi.id='l-'+Date.now();st.groceryList.push(gi);}
    }
  } else {
    // Remove all meals for this recipe this week
    const dates=_grocWeekDatesFor(weekMon);
    const toRemove=(st.mealPlan||[]).filter(m=>String(m.recipe_id)===String(recipeId)&&dates.includes(m.meal_date));
    toRemove.forEach(m=>{
      st.mealPlan=st.mealPlan.filter(x=>String(x.id)!==String(m.id));
      sbReqSilent('DELETE','meal_plan',null,`?id=eq.${m.id}`);
    });
    // Remove grocery items for this recipe this week
    const grocToRemove=(st.groceryList||[]).filter(g=>g.week_of===weekMon&&g.source==='recipe'&&String(g.source_id)===String(recipeId));
    grocToRemove.forEach(g=>{
      st.groceryList=st.groceryList.filter(x=>String(x.id)!==String(g.id));
      sbReqSilent('DELETE','grocery_list',null,`?id=eq.${g.id}`);
    });
  }
  save();renderGroceryModal();
  if(typeof renderMealRow==='function')renderMealRow();
}

// Toggle easy meal on/off for a week — always 1 slot, no division by people
async function toggleEasyMealForWeek(emId,weekMon,checked){
  const m=(st.easyMeals||[]).find(x=>x.id===emId);if(!m)return;
  if(checked){
    const dates=_grocWeekDatesFor(weekMon);
    let ds=dates[0];
    for(const d of dates){if((st.mealPlan||[]).filter(x=>x.meal_date===d).length<2){ds=d;break;}}
    const dbItem={recipe_id:null,recipe_name:m.name,meal_date:ds,servings:m.servings||1,meal_type:null};
    const sv=await sbReqSilent('POST','meal_plan',dbItem);
    if(sv&&sv[0]){sv[0].easy_meal_id=emId;st.mealPlan.push(sv[0]);}
    else{dbItem.id='l-'+Date.now();dbItem.easy_meal_id=emId;st.mealPlan.push(dbItem);}
    // Add ingredients to grocery list
    const stapleNames=new Set((st.groceryStaples||[]).filter(s=>s.active!==false).map(s=>s.name.toLowerCase()));
    const ings=_parseIngredients(m.ingredients).filter(i=>!i.is_pantry&&!stapleNames.has((i.name||'').toLowerCase()));
    for(const ing of ings){
      const dup=(st.groceryList||[]).find(g=>g.week_of===weekMon&&g.name.toLowerCase()===ing.name.toLowerCase());
      if(dup)continue;
      const gi={name:ing.name,amount:ing.amount||null,source:'recipe',source_id:null,recipe_name:m.name,aisle:_inferAisle(ing.name),checked:false,week_of:weekMon};
      const gsv=await sbReqSilent('POST','grocery_list',gi);
      if(gsv&&gsv[0])st.groceryList.push(gsv[0]);
      else{gi.id='l-'+Date.now();st.groceryList.push(gi);}
    }
  } else {
    const dates=_grocWeekDatesFor(weekMon);
    const toRemove=(st.mealPlan||[]).filter(x=>dates.includes(x.meal_date)&&(x.easy_meal_id===emId||(x.recipe_id===null&&x.recipe_name===m.name)));
    toRemove.forEach(x=>{
      st.mealPlan=st.mealPlan.filter(y=>String(y.id)!==String(x.id));
      sbReqSilent('DELETE','meal_plan',null,`?id=eq.${x.id}`);
    });
    const grocToRemove=(st.groceryList||[]).filter(g=>g.week_of===weekMon&&g.source==='recipe'&&g.recipe_name===m.name);
    grocToRemove.forEach(g=>{
      st.groceryList=st.groceryList.filter(x=>String(x.id)!==String(g.id));
      sbReqSilent('DELETE','grocery_list',null,`?id=eq.${g.id}`);
    });
  }
  save();renderGroceryModal();
  if(typeof renderMealRow==='function')renderMealRow();
}

// Remove a single meal entry and its groceries if no other instance exists
async function removeMealFromWeek(mealId,weekMon){
  const meal=(st.mealPlan||[]).find(m=>String(m.id)===String(mealId));if(!meal)return;
  st.mealPlan=st.mealPlan.filter(m=>String(m.id)!==String(mealId));
  sbReqSilent('DELETE','meal_plan',null,`?id=eq.${mealId}`);
  // If no other meals with same recipe this week, remove grocery items
  const dates=_grocWeekDatesFor(weekMon);
  const otherSameRecipe=(st.mealPlan||[]).filter(m=>String(m.recipe_id)===String(meal.recipe_id)&&dates.includes(m.meal_date));
  if(!otherSameRecipe.length){
    const grocToRemove=(st.groceryList||[]).filter(g=>g.week_of===weekMon&&g.source==='recipe'&&String(g.source_id)===String(meal.recipe_id));
    grocToRemove.forEach(g=>{
      st.groceryList=st.groceryList.filter(x=>String(x.id)!==String(g.id));
      sbReqSilent('DELETE','grocery_list',null,`?id=eq.${g.id}`);
    });
  }
  save();renderGroceryModal();
  if(typeof renderMealRow==='function')renderMealRow();
}

// Add manual grocery item for specific week
function addGroceryManualForWeek(weekMon){
  const name=(document.getElementById('grocAddName')?.value||'').trim();
  if(!name)return;
  const item={name,store:'HEB',done:false};
  sbReqSilent('POST','shopping_list',item).then(sv=>{
    if(sv&&sv[0])st.shopping.push(sv[0]);
    else{item.id='l-'+Date.now();st.shopping.push(item);}
    save();renderGroceryModal();
    if(typeof renderShopOv==='function')renderShopOv();
    if(typeof renderShoppingPage==='function')renderShoppingPage();
  });
}

function toggleGrocRecipePicker(){
  const el=document.getElementById('grocRecipeList');if(!el)return;
  if(el.style.display==='none'){
    el.style.display='block';
    el.innerHTML=(st.recipes||[]).map(r=>`<div class="groc-recipe-row" onclick="addRecipeToGrocery('${r.id}')">${escHtml(r.name)}</div>`).join('');
  }else{el.style.display='none';}
}

function removeMealAndGroceries(recipeId){
  // Remove all meals for this recipe this week and their grocery items
  const dates=_mealWeekDates();
  const mealsToRemove=(st.mealPlan||[]).filter(m=>String(m.recipe_id)===String(recipeId)&&dates.includes(m.meal_date));
  mealsToRemove.forEach(m=>{
    st.mealPlan=st.mealPlan.filter(x=>String(x.id)!==String(m.id));
    sbReqSilent('DELETE','meal_plan',null,`?id=eq.${m.id}`);
  });
  // Remove grocery items
  const wk=_groceryWeekOf();
  const toRemove=(st.groceryList||[]).filter(g=>g.week_of===wk&&g.source==='recipe'&&String(g.source_id)===String(recipeId));
  toRemove.forEach(g=>{
    st.groceryList=st.groceryList.filter(x=>String(x.id)!==String(g.id));
    sbReqSilent('DELETE','grocery_list',null,`?id=eq.${g.id}`);
  });
  save();renderGroceryModal();if(typeof renderMealRow==='function')renderMealRow();
}

function openMealPickerFromGrocery(){
  // Use today as default date
  _mealPickerDs=_groceryWeekOf();
  let modal=document.getElementById('mealPickerModal');
  if(!modal){
    modal=document.createElement('dialog');modal.id='mealPickerModal';modal.className='overlay grocery-modal';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
  }
  modal.classList.add('open');modal.showModal();
  renderMealPicker();
}

// ── Grocery staples management ────────────────────────────────────────────────
function openGroceryStaplesEditor(){
  const modal=document.getElementById('groceryModal');if(!modal)return;
  let panel=modal.querySelector('.groc-staples-drawer');
  if(!panel){
    panel=document.createElement('div');panel.className='groc-staples-drawer';
    modal.appendChild(panel);
  }
  panel.classList.toggle('open');
  if(panel.classList.contains('open'))renderGroceryStaples();
}

function renderGroceryStaples(){
  const modal=document.getElementById('groceryModal');if(!modal)return;
  const panel=modal.querySelector('.groc-staples-drawer');if(!panel)return;
  const planMon=_grocWeekMonday(_grocWkOff+1);
  const skipped=(st._grocStapleSkips||{})[planMon]||[];
  const staples=(st.groceryStaples||[]).filter(s=>s.active!==false);
  let html=`<div class="groc-staples-hdr"><span>Weekly Staples</span><button onclick="openGroceryStaplesEditor()">✕</button></div>`;
  html+=`<div class="groc-staples-add"><input type="text" id="stapleAddName" placeholder="Add staple…"><button onclick="addGroceryStaple()">+</button></div>`;
  html+=`<div class="groc-staples-list">`;
  html+=staples.map(s=>{
    const isSkipped=skipped.includes(String(s.id));
    return`<div class="groc-staple-row${isSkipped?' skipped':''}">
      <span>${escHtml(s.name)}${s.amount?' <em>'+escHtml(s.amount)+'</em>':''}</span>
      <div class="groc-staple-actions">
        <button onclick="toggleStapleSkip('${s.id}','${planMon}')" title="${isSkipped?'Include this week':'Skip this week'}">${isSkipped?'+':'−'}</button>
        <button onclick="delGroceryStaple('${s.id}')" title="Remove permanently">✕</button>
      </div>
    </div>`;
  }).join('');
  html+=`</div>`;
  panel.innerHTML=html;
  const inp=document.getElementById('stapleAddName');
  if(inp)inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addGroceryStaple();}});
}

async function addGroceryStaple(){
  const name=(document.getElementById('stapleAddName')?.value||'').trim();if(!name)return;
  const aisle=_inferAisle(name);
  const item={name,amount:null,aisle,active:true,sort_order:(st.groceryStaples||[]).length};
  const sv=await sbReqSilent('POST','grocery_staples',item);
  if(sv&&sv[0])st.groceryStaples.push(sv[0]);
  else{item.id='l-'+Date.now();st.groceryStaples.push(item);}
  save();renderGroceryStaples();
}

function toggleStapleSkip(stapleId,weekMon){
  if(!st._grocStapleSkips)st._grocStapleSkips={};
  if(!st._grocStapleSkips[weekMon])st._grocStapleSkips[weekMon]=[];
  const arr=st._grocStapleSkips[weekMon];
  const idx=arr.indexOf(String(stapleId));
  if(idx>-1)arr.splice(idx,1);else arr.push(String(stapleId));
  save();renderGroceryStaples();renderGroceryModal();
}

async function delGroceryStaple(id){
  st.groceryStaples=st.groceryStaples.filter(s=>String(s.id)!==String(id));save();renderGroceryStaples();
  sbReqSilent('DELETE','grocery_staples',null,`?id=eq.${id}`);
}
// ── MEAL PLANNING ─────────────────────────────────────────────────────────────
function _mealWeekDates(off){
  return _grocWeekDatesFor(_grocWeekMonday(off||wkOff||0));
}

function _mealsForWeek(){
  const dates=_mealWeekDates();
  return(st.mealPlan||[]).filter(m=>dates.includes(m.meal_date));
}

function _getRemovedMeals(){
  const dates=_mealWeekDates();
  // Use _grocWeekMonday for consistent format with grocery_list.week_of
  const displayedMon=_grocWeekMonday(wkOff||0);
  const onCal=(st.mealPlan||[]).filter(m=>dates.includes(m.meal_date));
  const grocRecipeIds=[...new Set((st.groceryList||[]).filter(g=>g.week_of===displayedMon&&g.source==='recipe'&&g.source_id).map(g=>String(g.source_id)))];
  const result=[];
  grocRecipeIds.forEach(rid=>{
    const r=(st.recipes||[]).find(x=>String(x.id)===rid);if(!r)return;
    const expected=Math.ceil((r.servings||2)/_getGrocPeople(displayedMon));
    const actual=onCal.filter(m=>String(m.recipe_id)===rid).length;
    const missing=expected-actual;
    if(missing<=0)return;
    for(let i=0;i<missing;i++) result.push({recipe_id:rid,recipe_name:r.name,meal_type:r.meal_type,servings:r.servings||1});
  });
  return result;
}
function renderMealRow(){
  const el=document.getElementById('mealRow');if(!el)return;
  const dates=_mealWeekDates();
  // Determine max meals across weekdays (cap at 2)
  let maxMeals=0;
  dates.forEach(ds=>{const c=(st.mealPlan||[]).filter(m=>m.meal_date===ds).length;if(c>maxMeals)maxMeals=c;});
  maxMeals=Math.min(maxMeals,2);
  const _mealToday=d2s(new Date());
  // No meals at all — hide meal row entirely
  if(maxMeals===0){el.innerHTML='';el.style.display='none';return;}
  el.style.display='';
  const showDivider=maxMeals>=2;
  let html=`<div class="meal-days${showDivider?' meal-two-rows':''}" style="grid-template-rows:repeat(${maxMeals},auto)">`;
  dates.forEach(ds=>{
    const meals=(st.mealPlan||[]).filter(m=>m.meal_date===ds);
    meals.sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    if(meals.length>2){meals.slice(2).forEach(m=>{st.mealPlan=st.mealPlan.filter(x=>String(x.id)!==String(m.id));sbReqSilent('DELETE','meal_plan',null,`?id=eq.${m.id}`);});}
    const _isPast=ds<_mealToday;
    html+=`<div class="meal-cell${_isPast?' meal-past':''}" data-ds="${ds}">`;
    if(maxMeals>=2){
      const slotMeals=[null,null];
      meals.slice(0,2).forEach(m=>{const idx=Math.min(m.sort_order||0,1);if(!slotMeals[idx])slotMeals[idx]=m;else slotMeals[slotMeals[0]?1:0]=m;});
      for(let si=0;si<2;si++){
        const m=slotMeals[si];
        if(m){const sid='meal-'+m.id;html+=`<div class="meal-chip" data-tid="${sid}" data-mealid="${m.id}" data-slot="${si}" draggable="true"><span class="meal-chip-name">${escHtml(m.recipe_name)}</span><button class="meal-chip-x" onclick="event.stopPropagation();removeMeal('${m.id}')">✕</button></div>`;}
        else{html+=`<div class="meal-slot-empty" data-ds="${ds}" data-slot="${si}"></div>`;}
      }
    } else {
      const m=meals[0];
      if(m){const sid='meal-'+m.id;html+=`<div class="meal-chip" data-tid="${sid}" data-mealid="${m.id}" data-slot="0" draggable="true"><span class="meal-chip-name">${escHtml(m.recipe_name)}</span><button class="meal-chip-x" onclick="event.stopPropagation();removeMeal('${m.id}')">✕</button></div>`;}
      else{html+=`<div class="meal-slot-empty" data-ds="${ds}" data-slot="0"></div>`;}
    }
    html+=`</div>`;
  });
  html+=`</div>`;
  el.innerHTML=html;
  // Render unassigned into separate wrapper (outside overflow:hidden)
  const uaWrap=document.getElementById('mealUnassignedWrap');
  if(uaWrap){
    const unassigned=_getRemovedMeals();
    let uaHtml='';
    unassigned.forEach(m=>{
      uaHtml+=`<div class="meal-chip meal-chip-unassigned" draggable="true" data-recipeid="${m.recipe_id}"><span class="meal-chip-name">${escHtml(m.recipe_name)}</span></div>`;
    });
    uaWrap.innerHTML=uaHtml;
    uaWrap.querySelectorAll('.meal-chip-unassigned').forEach(chip=>{
      chip.addEventListener('dragstart',e=>{
        e.dataTransfer.setData('text/plain','meal-new::'+chip.dataset.recipeid);
        e.dataTransfer.effectAllowed='move';
        chip.classList.add('meal-dragging');
      });
      chip.addEventListener('dragend',()=>chip.classList.remove('meal-dragging'));
    });
  }
  // Bind drag/drop on day cells
  el.querySelectorAll('.meal-cell[data-ds]').forEach(cell=>{
    cell.addEventListener('dragover',e=>{e.preventDefault();cell.classList.add('meal-drop');});
    cell.addEventListener('dragleave',()=>cell.classList.remove('meal-drop'));
    cell.addEventListener('drop',e=>{cell.classList.remove('meal-drop');dropMeal(e,cell.dataset.ds);});
    cell.addEventListener('dblclick',e=>{
      if(e.target.closest('.meal-chip'))return;
      e.stopPropagation();
      openGroceryModal();
    });
  });
  // Bind drop on empty meal slots
  el.querySelectorAll('.meal-slot-empty').forEach(slot=>{
    slot.addEventListener('dragover',e=>{e.preventDefault();slot.classList.add('meal-drop');});
    slot.addEventListener('dragleave',()=>slot.classList.remove('meal-drop'));
    slot.addEventListener('drop',e=>{
      e.preventDefault();e.stopPropagation();slot.classList.remove('meal-drop');
      const data=e.dataTransfer.getData('text/plain');
      const ds=slot.dataset.ds;const si=parseInt(slot.dataset.slot);
      if(data.startsWith('meal::')){
        const mealId=data.replace('meal::','');
        const m=(st.mealPlan||[]).find(x=>String(x.id)===String(mealId));
        if(m){m.meal_date=ds;m.sort_order=si;sbReqSilent('PATCH','meal_plan',{sort_order:si,meal_date:ds},`?id=eq.${m.id}`);save();renderMealRow();}
      } else if(data.startsWith('meal-new::')){
        dropMeal(e,ds,si);
      } else {dropMeal(e,ds,si);}
    });
  });
  // Bind click/dblclick/drag on placed chips
  _bindMealChips(el);
}
function _bindMealChips(el){
  el.querySelectorAll('.meal-chip[data-tid]').forEach(chip=>{
    chip.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('text/plain','meal::'+chip.dataset.mealid);
      e.dataTransfer.effectAllowed='move';
      chip.classList.add('meal-dragging');
    });
    chip.addEventListener('dragend',()=>chip.classList.remove('meal-dragging'));
    chip.addEventListener('dragover',e=>{
      e.preventDefault();e.stopPropagation();
      const rect=chip.getBoundingClientRect();
      const after=e.clientY>rect.top+rect.height/2;
      chip.classList.toggle('meal-drop-above',!after);
      chip.classList.toggle('meal-drop-below',after);
    });
    chip.addEventListener('dragleave',()=>{chip.classList.remove('meal-drop-above','meal-drop-below');});
    chip.addEventListener('drop',e=>{
      e.preventDefault();e.stopPropagation();
      chip.classList.remove('meal-drop-above','meal-drop-below');
      chip.closest('.meal-cell')?.classList.remove('meal-drop');
      const data=e.dataTransfer.getData('text/plain');
      if(data.startsWith('meal-new::')){
        const ds=chip.closest('.meal-cell').dataset.ds;
        dropMeal(e,ds);return;
      }
      if(!data.startsWith('meal::'))return;
      const draggedId=data.replace('meal::','');
      const targetId=chip.dataset.mealid;
      if(draggedId===targetId)return;
      const ds=chip.closest('.meal-cell').dataset.ds;
      _reorderMeal(draggedId,targetId,ds,e.clientY<chip.getBoundingClientRect().top+chip.getBoundingClientRect().height/2);
    });
    chip.addEventListener('click',e=>{
      if(e.target.closest('.meal-chip-x'))return;
      const sid=chip.dataset.tid;
      e.stopPropagation();
      if(e.metaKey||e.ctrlKey){
        if(selectedTasks.has(sid))selectedTasks.delete(sid);else selectedTasks.add(sid);
        lastSelectedId=sid;
      } else if(e.shiftKey&&lastSelectedId){
        const allC=[...el.querySelectorAll('.meal-chip[data-tid]')];
        const ids=allC.map(c=>c.dataset.tid);
        const a=ids.indexOf(lastSelectedId),b=ids.indexOf(sid);
        if(a>-1&&b>-1){const lo=Math.min(a,b),hi=Math.max(a,b);ids.slice(lo,hi+1).forEach(x=>selectedTasks.add(x));}
        else selectedTasks.add(sid);
        lastSelectedId=sid;
      } else {
        selectedTasks.clear();selectedTasks.add(sid);lastSelectedId=sid;
      }
      applySelHighlight();
    });
    chip.addEventListener('dblclick',e=>{
      e.stopPropagation();
      openGroceryModal();
    });
  });
}


function _reorderMeal(draggedId,targetId,ds,before){
  const dragged=(st.mealPlan||[]).find(m=>String(m.id)===String(draggedId));
  if(!dragged)return;
  // Move to this day if different
  dragged.meal_date=ds;
  // Get all meals for this day sorted
  const dayMeals=(st.mealPlan||[]).filter(m=>m.meal_date===ds).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  // Remove dragged from list, insert at target position
  const filtered=dayMeals.filter(m=>String(m.id)!==String(draggedId));
  const targetIdx=filtered.findIndex(m=>String(m.id)===String(targetId));
  const insertIdx=before?targetIdx:targetIdx+1;
  filtered.splice(insertIdx,0,dragged);
  // Assign sort_order
  filtered.forEach((m,i)=>{m.sort_order=i;sbReqSilent('PATCH','meal_plan',{sort_order:i,meal_date:m.meal_date},`?id=eq.${m.id}`);});
  save();renderMealRow();
}

function _inlineMealAdd(cell,ds){
  const inp=document.createElement('input');
  inp.className='meal-inline-inp';
  inp.placeholder='Add meal…';
  inp.style.cssText='width:100%;font-size:9px;padding:2px 6px;border:1px solid var(--accent);border-radius:6px;outline:none;font-family:inherit;background:var(--glass);color:var(--text);box-sizing:border-box';
  cell.appendChild(inp);
  inp.focus();
  const commit=async()=>{
    const name=inp.value.trim();
    inp.remove();
    if(!name)return;
    // Check if it matches an existing recipe
    const match=(st.recipes||[]).find(r=>r.name.toLowerCase()===name.toLowerCase());
    const item={recipe_id:match?match.id:null,recipe_name:match?match.name:name,meal_date:ds,servings:1,meal_type:match?match.meal_type:null,sort_order:(st.mealPlan||[]).filter(m=>m.meal_date===ds).length};
    const sv=await sbReqSilent('POST','meal_plan',item);
    if(sv&&sv[0])st.mealPlan.push(sv[0]);
    else{item.id='l-'+Date.now();st.mealPlan.push(item);}
    save();renderMealRow();
  };
  inp.addEventListener('blur',commit);
  inp.addEventListener('keydown',e=>{
    e.stopPropagation();
    if(e.key==='Enter'){e.preventDefault();inp.blur();}
    if(e.key==='Escape'){inp.value='';inp.blur();}
  });
}

function openMealRecipeModal(recipeId){
  const r=(st.recipes||[]).find(x=>String(x.id)===String(recipeId));
  if(!r){openMealEdit(recipeId);return;}
  let modal=document.getElementById('mealRecipeModal');
  if(!modal){
    modal=document.createElement('dialog');modal.id='mealRecipeModal';modal.className='overlay';
    modal.style.cssText='max-width:520px;width:90vw;border-radius:16px;padding:0;border:1px solid var(--border);background:var(--glass);backdrop-filter:blur(20px);box-shadow:0 24px 80px rgba(0,0,0,.18)';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
  }
  modal.showModal();
  _mealRecipeModalId=String(r.id);
  _renderMealRecipeModal();
}
let _mealRecipeModalId=null;
function _renderMealRecipeModal(){
  const modal=document.getElementById('mealRecipeModal');if(!modal)return;
  const r=st.recipes.find(x=>String(x.id)===String(_mealRecipeModalId));
  if(!r){modal.close();return;}
  const esc=v=>(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const escV=v=>(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  const sid=String(r.id);
  const mealOpts=['','Lunch','Dinner','Side','Snack'];
  const cuisineOpts=['','American','Mexican','Italian','Asian','Indian','Mediterranean','Other'];
  const ings=_parseIngredients(r.ingredients);
  let html=`<div style="padding:20px 24px 0;display:flex;justify-content:space-between;align-items:flex-start">
    <input class="rec-detail-title-inp" value="${escV(r.name)}" placeholder="Recipe name" style="font-size:18px;font-weight:700;border:none;background:none;color:var(--text);width:100%;outline:none;font-family:inherit"
      onblur="_mealRecSave('${sid}','name',this.value.trim())">
    <button onclick="document.getElementById('mealRecipeModal').close()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted);padding:0 0 0 8px">✕</button>
  </div>`;
  html+=`<div style="padding:8px 24px;display:flex;gap:12px;flex-wrap:wrap">
    <div class="rec-meta-field"><span class="rec-meta-label">Meal</span><select class="rec-meta-sel" onchange="_mealRecSave('${sid}','meal_type',this.value||null)">${mealOpts.map(m=>`<option value="${m}"${(r.meal_type||'')===m?' selected':''}>${m||'--'}</option>`).join('')}</select></div>
    <div class="rec-meta-field"><span class="rec-meta-label">Cuisine</span><select class="rec-meta-sel" onchange="_mealRecSave('${sid}','cuisine',this.value||null)">${cuisineOpts.map(c=>`<option value="${c}"${(r.cuisine||'')===c?' selected':''}>${c||'--'}</option>`).join('')}</select></div>
    <div class="rec-meta-field"><span class="rec-meta-label">Time</span><input class="rec-meta-inp" type="number" min="0" value="${r.time||''}" placeholder="--" onblur="_mealRecSave('${sid}','time',parseInt(this.value)||null)" style="width:50px"></div>
    <div class="rec-meta-field"><span class="rec-meta-label">Serves</span><input class="rec-meta-inp" type="number" min="1" value="${r.servings||''}" placeholder="--" onblur="_mealRecSave('${sid}','servings',parseInt(this.value)||null)" style="width:50px"></div>
  </div>`;
  html+=`<div style="padding:8px 24px"><div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px">Ingredients</div>`;
  if(ings.length){html+=`<div style="display:flex;flex-direction:column;gap:2px">`;ings.forEach(ing=>{html+=`<div style="font-size:12px;color:var(--text)">${ing.amount?esc(ing.amount)+' ':''}${esc(ing.name)}</div>`;});html+=`</div>`;}
  else html+=`<div style="font-size:11px;color:var(--muted)">No ingredients</div>`;
  html+=`</div>`;
  html+=`<div style="padding:8px 24px 20px"><div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px">Instructions</div>`;
  html+=`<textarea style="width:100%;min-height:100px;border:1px solid var(--border);border-radius:8px;padding:8px;font-size:12px;font-family:inherit;color:var(--text);background:transparent;resize:vertical;box-sizing:border-box" onblur="_mealRecSave('${sid}','instructions',this.value.trim()||null)">${esc(r.instructions||'')}</textarea>`;
  html+=`</div>`;
  if(r.source)html+=`<div style="padding:0 24px 16px"><a href="${escV(r.source)}" target="_blank" rel="noopener" style="font-size:11px;color:var(--accent)">Source ↗</a></div>`;
  modal.innerHTML=html;
}
function _mealRecSave(id,field,val){
  const r=st.recipes.find(x=>String(x.id)===String(id));if(!r)return;
  r[field]=val;save();
  sbReqSilent('PATCH','recipes',{[field]:val},`?id=eq.${id}`);
  _renderMealRecipeModal();
  renderMealRow();
}

let _mealPickerDs=null;
function openMealPicker(ds){
  _mealPickerDs=ds;
  let modal=document.getElementById('mealPickerModal');
  if(!modal){
    modal=document.createElement('dialog');modal.id='mealPickerModal';modal.className='overlay grocery-modal';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
  }
  modal.classList.add('open');modal.showModal();
  renderMealPicker();
}

let _mealPickerSearch='';
function renderMealPicker(){
  const modal=document.getElementById('mealPickerModal');if(!modal)return;
  const recipes=(st.recipes||[]).filter(r=>{
    if(!_mealPickerSearch)return true;
    return r.name.toLowerCase().includes(_mealPickerSearch.toLowerCase());
  });
  let html=`<div class="groc-header"><h3>Pick a Recipe</h3><button class="groc-close" onclick="document.getElementById('mealPickerModal').close()">✕</button></div>`;
  html+=`<div class="groc-add"><input type="text" id="mealPickerSearch" placeholder="Search recipes…" value="${escHtml(_mealPickerSearch)}" oninput="_mealPickerSearch=this.value;renderMealPicker()"></div>`;
  html+=`<div style="padding:8px 16px;max-height:50vh;overflow-y:auto">`;
  const easyFiltered=(st.easyMeals||[]).filter(m=>{
    if(!_mealPickerSearch)return true;
    const lq=_mealPickerSearch.toLowerCase();
    return m.name.toLowerCase().includes(lq)||_parseIngredients(m.ingredients).some(x=>(x.name||'').toLowerCase().includes(lq));
  });
  if(easyFiltered.length){
    html+=`<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);padding:4px 0 2px">Easy Meals</div>`;
    easyFiltered.forEach(m=>{
      html+=`<div class="groc-recipe-row" onclick="addEasyMealFromPicker('${m.id}')">${escHtml(m.name)} <span style="color:var(--muted);font-size:10px">${_parseIngredients(m.ingredients).length} items</span></div>`;
    });
  }
  if(recipes.length&&easyFiltered.length)html+=`<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);padding:8px 0 2px">Recipes</div>`;
  recipes.forEach(r=>{
    html+=`<div class="groc-recipe-row" onclick="addMealFromPicker('${r.id}')">${escHtml(r.name)}${r.meal_type?` <span style="color:var(--muted);font-size:10px">${escHtml(r.meal_type)}</span>`:''}</div>`;
  });
  if(!recipes.length&&!easyFiltered.length)html+=`<div style="color:var(--muted);font-size:12px;padding:12px">No meals found</div>`;
  html+=`</div>`;
  modal.innerHTML=html;
  const inp=document.getElementById('mealPickerSearch');
  if(inp)setTimeout(()=>inp.focus(),50);
}

async function addMealFromPicker(recipeId){
  const r=(st.recipes||[]).find(x=>String(x.id)===String(recipeId));if(!r)return;
  const ds=_mealPickerDs;if(!ds)return;
  const item={recipe_id:r.id,recipe_name:r.name,meal_date:ds,servings:1,meal_type:r.meal_type||null};
  const sv=await sbReqSilent('POST','meal_plan',item);
  if(sv&&sv[0])st.mealPlan.push(sv[0]);
  else{item.id='l-'+Date.now();st.mealPlan.push(item);}
  save();renderMealRow();
  // Auto-add ingredients to grocery list
  addRecipeToGrocery(recipeId);
  document.getElementById('mealPickerModal')?.close();
  _mealPickerSearch='';
  if(document.getElementById('groceryModal')?.open)renderGroceryModal();
}

async function addEasyMealFromPicker(emId){
  const m=(st.easyMeals||[]).find(x=>x.id===emId);if(!m)return;
  const ds=_mealPickerDs;if(!ds)return;
  const dbItem={recipe_id:null,recipe_name:m.name,meal_date:ds,servings:m.servings||1,meal_type:null};
  const sv=await sbReqSilent('POST','meal_plan',dbItem);
  if(sv&&sv[0]){sv[0].easy_meal_id=emId;st.mealPlan.push(sv[0]);}
  else{dbItem.id='l-'+Date.now();dbItem.easy_meal_id=emId;st.mealPlan.push(dbItem);}
  save();renderMealRow();
  // Add easy meal ingredients to grocery list (same format as recipes)
  const wk=_groceryWeekOf();
  const stapleNames=new Set((st.groceryStaples||[]).filter(s=>s.active!==false).map(s=>s.name.toLowerCase()));
  const ings=_parseIngredients(m.ingredients).filter(x=>!x.is_pantry&&!stapleNames.has((x.name||'').toLowerCase()));
  for(const ing of ings){
    const dup=(st.groceryList||[]).find(g=>g.week_of===wk&&g.name.toLowerCase()===ing.name.toLowerCase());
    if(dup)continue;
    const gi={name:ing.name,amount:ing.amount||null,source:'recipe',source_id:null,recipe_name:m.name,aisle:_inferAisle(ing.name),checked:false,week_of:wk};
    const gsv=await sbReqSilent('POST','grocery_list',gi);
    if(gsv&&gsv[0])st.groceryList.push(gsv[0]);
    else{gi.id='l-'+Date.now();st.groceryList.push(gi);}
  }
  save();
  document.getElementById('mealPickerModal')?.close();
  _mealPickerSearch='';
  if(document.getElementById('groceryModal')?.open)renderGroceryModal();
}

async function removeMeal(id){
  st.mealPlan=(st.mealPlan||[]).filter(m=>String(m.id)!==String(id));
  save();renderMealRow();
  if(document.getElementById('groceryModal')?.open)renderGroceryModal();
  sbReqSilent('DELETE','meal_plan',null,`?id=eq.${id}`);
}

function dropMeal(event,ds,slotIdx){
  event.preventDefault();
  const data=event.dataTransfer.getData('text/plain');
  const sortOrd=slotIdx!=null?slotIdx:(st.mealPlan||[]).filter(m=>m.meal_date===ds).length;
  if(data.startsWith('meal-new::')){
    const recipeId=data.replace('meal-new::','');
    const r=(st.recipes||[]).find(x=>String(x.id)===String(recipeId));if(!r)return;
    const item={recipe_id:r.id,recipe_name:r.name,meal_date:ds,servings:r.servings||1,meal_type:r.meal_type||null,sort_order:sortOrd};
    sbReqSilent('POST','meal_plan',item).then(sv=>{
      if(sv&&sv[0])st.mealPlan.push(sv[0]);
      else{item.id='l-'+Date.now();st.mealPlan.push(item);}
      save();renderMealRow();
      if(document.getElementById('groceryModal')?.open)renderGroceryModal();
    });
    return;
  }
  if(!data.startsWith('meal::'))return;
  const id=data.replace('meal::','');
  const meal=(st.mealPlan||[]).find(m=>String(m.id)===String(id));if(!meal)return;
  meal.meal_date=ds;meal.sort_order=sortOrd;save();renderMealRow();
  if(document.getElementById('groceryModal')?.open)renderGroceryModal();
  sbReqSilent('PATCH','meal_plan',{meal_date:ds,sort_order:sortOrd},`?id=eq.${id}`);
}

function openMealEdit(id){
  const meal=(st.mealPlan||[]).find(m=>String(m.id)===String(id));if(!meal)return;
  let modal=document.getElementById('mealEditModal');
  if(!modal){
    modal=document.createElement('dialog');modal.id='mealEditModal';modal.className='overlay grocery-modal';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
  }
  modal.classList.add('open');modal.showModal();
  modal.innerHTML=`
    <div class="groc-header"><h3>${escHtml(meal.recipe_name)}</h3><button class="groc-close" onclick="document.getElementById('mealEditModal').close()">✕</button></div>
    <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
      <label style="font-size:12px;color:var(--muted)">Servings (days of food)</label>
      <input type="number" id="mealEditServings" min="1" max="7" value="${meal.servings||1}" style="padding:8px;border-radius:var(--rs);border:1px solid var(--gb);font-size:14px;width:80px">
      <div style="display:flex;gap:8px;margin-top:8px">
        <button onclick="saveMealEdit('${id}')" style="padding:8px 16px;border-radius:var(--rs);border:none;background:var(--accent);color:#fff;font-weight:600;cursor:pointer">Save</button>
        <button onclick="removeMeal('${id}');document.getElementById('mealEditModal').close()" style="padding:8px 16px;border-radius:var(--rs);border:1px solid #ef4444;background:none;color:#ef4444;font-weight:600;cursor:pointer">Remove</button>
      </div>
    </div>`;
}

async function saveMealEdit(id){
  const meal=(st.mealPlan||[]).find(m=>String(m.id)===String(id));if(!meal)return;
  const servings=parseInt(document.getElementById('mealEditServings').value)||1;
  meal.servings=servings;save();renderMealRow();
  document.getElementById('mealEditModal')?.close();
  sbReqSilent('PATCH','meal_plan',{servings},`?id=eq.${id}`);
}
// ── END GROCERY & MEAL PLANNING ───────────────────────────────────────────────

// ── STYLE GUIDE PAGE ──────────────────────────────────────────────────────────
function renderGuidePage(){
  const el=document.getElementById('guideContent');if(!el)return;
  const dk=document.body.classList.contains('dark');
  const cats=CATS;const imp=IMP;const ov=OV;
  const pupS=typeof _pupSessStyle==='function'?_pupSessStyle():{bg:'#f6fafd',b:'rgba(56,170,210,.16)',t:'#18577a',d:'#38aad2'};
  const vidS={bg:'rgba(34,197,94,.1)',t:'#15803d',d:'#22c55e',b:'rgba(34,197,94,.2)'};
  // Dark-mode category colors (match CSS vars)
  const dkCats={
    'home':{bg:'rgba(59,130,246,.14)',t:'#93c5fd',d:'#3b82f6',b:'rgba(59,130,246,.18)'},
    'my work':{bg:'rgba(163,196,26,.12)',t:'#bef264',d:'#65a30d',b:'rgba(163,196,26,.18)'},
    'work':{bg:'rgba(236,72,153,.12)',t:'#f9a8d4',d:'#ec4899',b:'rgba(236,72,153,.18)'},
    'social':{bg:'rgba(147,51,234,.14)',t:'#d8b4fe',d:'#9333ea',b:'rgba(147,51,234,.18)'},
    'long term':{bg:'rgba(148,163,184,.10)',t:'#94a3b8',d:'#94a3b8',b:'rgba(148,163,184,.18)'},
    'recurring':{bg:'rgba(16,185,129,.12)',t:'#6ee7b7',d:'#2a9db5',b:'rgba(16,185,129,.18)'},
    'weekly_reset':{bg:'rgba(59,130,246,.14)',t:'#93c5fd',d:'#3b82f6',b:'rgba(59,130,246,.18)'},
    'buy':{bg:'rgba(234,179,8,.12)',t:'#fde68a',d:'#eab308',b:'rgba(234,179,8,.18)'},
    'travel':{bg:'rgba(20,184,166,.12)',t:'#5eead4',d:'#38bdf8',b:'rgba(20,184,166,.18)'},
    'birthday':{bg:'rgba(249,115,22,.12)',t:'#fdba74',d:'#f97316',b:'rgba(249,115,22,.18)'},
    'shopping':{bg:'rgba(249,115,22,.12)',t:'#fdba74',d:'#ea580c',b:'rgba(249,115,22,.18)'},
    'videos':{bg:'rgba(34,197,94,.12)',t:'#86efac',d:'#22c55e',b:'rgba(34,197,94,.18)'},
    'weekly goals':{bg:'rgba(255,255,255,.04)',t:'#e8e8ea',d:'rgba(200,200,215,.6)',b:'rgba(255,255,255,.06)'},
  };
  const dkImp={bg:'rgba(234,179,8,.12)',t:'#fde68a',d:'#eab308',b:'rgba(234,179,8,.25)'};
  const dkOv={bg:'rgba(239,68,68,.12)',t:'#fca5a5',d:'#ef4444',b:'rgba(239,68,68,.20)'};
  const dkPupS={bg:'rgba(56,170,210,.10)',t:'#67e8f9',d:'#38aad2',b:'rgba(56,170,210,.18)'};
  const dkVidS={bg:'rgba(34,197,94,.12)',t:'#86efac',d:'#22c55e',b:'rgba(34,197,94,.18)'};
  const _c=dk?dkCats:cats;const _imp=dk?dkImp:imp;const _ov=dk?dkOv:ov;
  const _pupS=dk?dkPupS:pupS;const _vidS=dk?dkVidS:vidS;
  const card=(label,s)=>`<div style="background:${s.bg};color:${s.t};border:1px solid ${s.b};border-radius:8px;padding:6px 12px;font-size:12px;font-weight:500;display:flex;align-items:center;gap:8px"><span style="width:7px;height:7px;border-radius:50%;background:${s.d};flex-shrink:0"></span>${label}</div>`;
  const secT=(t)=>`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:0 0 8px">${t}</div>`;
  const _bdr=dk?'rgba(255,255,255,.04)':'rgba(0,0,0,.04)';const _bdr2=dk?'rgba(255,255,255,.06)':'rgba(0,0,0,.08)';
  const _kbd=dk?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';
  const sRow=(k,d)=>`<tr><td style="padding:3px 8px;border-bottom:1px solid ${_bdr}"><span style="font-family:monospace;background:${_kbd};padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600">${k}</span></td><td style="padding:3px 8px;border-bottom:1px solid ${_bdr};font-size:12px">${d}</td></tr>`;
  const tHead=(c1,c2)=>`<tr><th style="text-align:left;padding:4px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:2px solid ${_bdr2}">${c1}</th><th style="text-align:left;padding:4px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:2px solid ${_bdr2}">${c2}</th></tr>`;
  const panel=dk?'background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px 16px':'background:rgba(255,255,255,.55);border:1px solid rgba(210,205,228,.3);border-radius:12px;padding:14px 16px;box-shadow:inset 0 1px 3px rgba(0,0,0,.04)';

  el.innerHTML=`
<div style="width:100%">
<div class="ov-topbar"><div class="ov-topbar-left"><span class="ov-topbar-label">Style Guide</span><span class="ov-topbar-dot"></span></div><span class="ov-topbar-date topbar-date"></span><div class="ov-topbar-right"><span class="ov-topbar-dot"></span><span class="ov-topbar-time topbar-time"></span></div></div>

<div style="display:grid;grid-template-columns:180px 1fr;gap:14px;margin-top:16px">

<div style="display:flex;flex-direction:column;gap:14px">
  <div style="${panel}">
    ${secT('Task Colors')}
    <div style="display:flex;flex-direction:column;gap:5px">
      ${card('Home',_c.home)}
      ${card('My Work',_c['my work'])}
      ${card('Work',_c.work)}
      ${card('Social',_c.social)}
      ${card('Long Term',_c['long term'])}
      ${card('Recurring',_c.recurring)}
      ${card('Weekly Reset',_c.weekly_reset)}
      ${card('Buy',_c.buy)}
      ${card('Travel',_c.travel)}
      ${card('Birthday',_c.birthday)}
      ${card('Shopping',_c.shopping)}
      ${card('Videos',_vidS)}
      ${card('Weekly Goals',_c['weekly goals'])}
      ${card('Pup Skills',_pupS)}
    </div>
  </div>
  <div style="${panel}">
    ${secT('Special States')}
    <div style="display:flex;flex-direction:column;gap:5px">
      ${card('Important',_imp)}
      ${card('Overdue',_ov)}
    </div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-content:start">
  <div style="${panel}">
    ${secT('Global Shortcuts')}
    <table style="width:100%;border-collapse:collapse;font-size:12px">
    ${tHead('Key','Action')}
    ${sRow('⌘ ←/→','Switch between pages')}
    ${sRow('O','Overview')}
    ${sRow('V','Videos')}
    ${sRow('F','Finance')}
    ${sRow('G','Grid lines (debug)')}
    ${sRow('GG','Help overlay')}
    ${sRow('L','Style Guide')}
    ${sRow('I','Ideas')}
    ${sRow('N','Quick Add task / New idea')}
    ${sRow('R','Reload page')}
    ${sRow('S','Sync all / HEB grocery')}
    ${sRow('D','Toggle dark mode')}
    ${sRow('Esc','Close modal / deselect')}
    ${sRow('⌘Z','Undo')}
    </table>
  </div>
  <div style="${panel}">
    ${secT('Overview Shortcuts')}
    <table style="width:100%;border-collapse:collapse;font-size:12px">
    ${tHead('Key','Action')}
    ${sRow('T','Jump to Today')}
    ${sRow('M','Month view toggle')}
    ${sRow('←/→','Previous / next day')}
    ${sRow('W + ←/→','Previous / next week')}
    ${sRow('←/→ (selected)','Move task ±1 day')}
    ${sRow('↑/↓ (TB)','Move block ±30 min')}
    ${sRow('⌘ ↑/↓ (TB)','Resize block ±30 min')}
    ${sRow('Space','Skip WR rule')}
    ${sRow('Delete / ⌫','Delete selected')}
    ${sRow('⌘C / ⌘V','Copy / paste tasks')}
    ${sRow('⌘I','Toggle important')}
    ${sRow('A','Add auto-blocks')}
    ${sRow('Click','Select')}
    ${sRow('⌘+Click','Toggle in selection')}
    ${sRow('Shift+Click','Range select')}
    </table>
  </div>
  <div style="${panel}">
    ${secT('Multi-Select & Drag')}
    <table style="width:100%;border-collapse:collapse;font-size:12px">
    ${tHead('Action','Behavior')}
    ${sRow('⌘/Ctrl + Click','Toggle item in selection')}
    ${sRow('Shift + Click','Range-select in same container')}
    ${sRow('Drag → day','Moves ALL selected to that day')}
    ${sRow('Drag → timeblock','Creates blocks for all selected')}
    ${sRow('Arrow keys','Move all selected ±1 day')}
    </table>
  </div>
  <div style="${panel}">
    ${secT('Videos Shortcuts')}
    <table style="width:100%;border-collapse:collapse;font-size:12px">
    ${tHead('Key','Action')}
    ${sRow('N','New video')}
    ${sRow('E / C','Toggle completed')}
    ${sRow('←/→','Switch tabs')}
    ${sRow('↑/↓','Scroll top / current')}
    ${sRow('Delete / ⌫','Delete selected')}
    </table>
  </div>
</div>

</div>
</div>`;
  const now=new Date();document.querySelectorAll('#page-guide .topbar-date').forEach(e=>e.textContent=now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));document.querySelectorAll('#page-guide .topbar-time').forEach(e=>e.textContent=now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}));
}

function showPage(id){
  if(id==='tasks')return;
  if(id==='shopping')id='weekly';// shopping merged into weekly page
  const detPop=document.getElementById('finInvDetailsPop');if(detPop)detPop.remove();
  // Close video overlay panels when leaving overview
  if(typeof _vidOvCloseCal==='function'&&typeof _vidCalOpen!=='undefined'&&_vidCalOpen)_vidOvCloseCal();
  if(typeof _vidOvCloseAll==='function'&&typeof _vidOvAllOpen!=='undefined'&&_vidOvAllOpen)_vidOvCloseAll();
  if(typeof _vidOvCloseAnalytics==='function'&&typeof _vidOvAnOpen!=='undefined'&&_vidOvAnOpen)_vidOvCloseAnalytics();
  if(typeof closeVidOvMenu==='function'){const _vp=document.getElementById('vidOvPanel');if(_vp&&_vp.style.display==='block')closeVidOvMenu();}
  const _prevPg=activePg;activePg=id;
  document.querySelectorAll('.page').forEach(p=>{p.classList.remove('active');});
  const vidPage=document.getElementById('page-videos');if(vidPage)vidPage.removeAttribute('style');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const pageEl=document.getElementById('page-'+id);if(pageEl)pageEl.classList.add('active');
  const idx=PAGES.indexOf(id);if(idx>-1&&document.querySelectorAll('.nav-item')[idx])document.querySelectorAll('.nav-item')[idx].classList.add('active');
  const mainEl=document.getElementById('main');if(mainEl){mainEl.scrollTop=0;}
  if(id==='weekly'){renderWeeklyPage();}if(id==='travel')renderTravelPage();if(id==='birthdays')renderBdayPage();if(id==='ideas')renderIdeasPage();if(id==='pups')renderPupsPage();if(id==='recipes')renderRecipesPage();if(id==='packing')renderPackingPage();if(id==='finance')renderFinancePage();if(id==='guide')renderGuidePage();if(id==='videos'){if(!_vidPageInit&&_prevPg!=='videos'){_vidView='dashboard';localStorage.setItem('_vidView','dashboard');}_vidPageInit=false;renderVideosPage();}if(id==='overview'){renderShopOv();renderRecOv();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();}else{const _tbSc=document.getElementById('tbScroll');if(_tbSc)_tbSc._scrollDay=null;}
  const backBtn=document.getElementById('backToOv');if(backBtn)backBtn.style.display=id==='overview'?'none':'flex';
  renderUnassigned();
  history.replaceState(null,'','#'+id);
}

// ── Modals ─────────────────────────────────────────────────────────────────────
let _modMousedownInside=false;
document.addEventListener('mousedown',e=>{_modMousedownInside=!!e.target.closest('.modal');});
document.addEventListener('mouseup',()=>{setTimeout(()=>{_modMousedownInside=false;},0);});
function closeMod(id,e){if(e&&e.target!==document.getElementById(id))return;if(e&&_modMousedownInside)return;document.getElementById(id).classList.remove('open');if(id==='mModal'||id==='recMoModal'){const bg=document.querySelector('.bg-canvas');if(bg)bg.classList.remove('orbs-paused');}if(id==='recipeModal'&&_recModalKeyFn){document.removeEventListener('keydown',_recModalKeyFn);_recModalKeyFn=null;}}

// ── Packing ────────────────────────────────────────────────────────────────────
const _PACK_SVG=`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;
const PACK_CATS=['Clothes','Toiletries','Must Haves','Pups','Other'];
let _packDragId=null;

function renderPackingPage(){save();
  const pg=document.getElementById('packingPageContent');if(!pg)return;
  // Templates (left) + Ad-hoc pool (right)
  const tpls=st.packTemplates.sort((a,b)=>(a.category||'').localeCompare(b.category||'')||(a.sort_order||0)-(b.sort_order||0));
  const grouped={};PACK_CATS.forEach(c=>grouped[c]=[]);
  tpls.forEach(t=>{const c=PACK_CATS.includes(t.category)?t.category:'Other';(grouped[c]=grouped[c]||[]).push(t);});

  let html=`<div style="display:flex;gap:24px;flex:1;min-height:0;overflow:hidden">`;
  // Left: Standard templates
  html+=`<div style="flex:1;overflow-y:auto;padding-right:8px">
    <h3 style="margin:0 0 12px;font-size:13px;font-weight:600;color:var(--text-primary,#334155)">Standard Packing Items</h3>`;
  PACK_CATS.forEach(cat=>{
    const items=grouped[cat]||[];
    html+=`<div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:600;color:var(--text-secondary,#64748b);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${cat}</div>`;
    items.forEach(t=>{
      html+=`<div class="pack-tpl-row" data-ptid="${t.id}">
        <span class="pack-tpl-name" contenteditable="true" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onblur="renamePackTpl('${t.id}',this.textContent.trim())">${t.name}</span>
        <button class="delbtn" onclick="delPackTpl('${t.id}')">✕</button>
      </div>`;
    });
    html+=`<div class="pack-add-row"><input class="pack-add-inp" placeholder="+ Add ${cat.toLowerCase()} item…" onkeydown="if(event.key==='Enter'){addPackTpl('${cat}',this.value.trim());this.value='';event.preventDefault();}"></div>`;
    html+=`</div>`;
  });
  html+=`</div>`;
  // Right: Ad-hoc items (not tied to a trip — a pool of reusable extras)
  const adhoc=st.packTemplates.filter(t=>t.category==='Ad-hoc').sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  html+=`<div style="flex:1;overflow-y:auto;padding-left:8px;border-left:1px solid rgba(200,200,215,.2)">
    <h3 style="margin:0 0 12px;font-size:13px;font-weight:600;color:var(--text-primary,#334155)">Ad-hoc Items</h3>
    <p style="font-size:11px;color:var(--text-secondary,#64748b);margin:0 0 12px">Extra items you sometimes need. Add to trips individually.</p>`;
  adhoc.forEach(t=>{
    html+=`<div class="pack-tpl-row" data-ptid="${t.id}">
      <span class="pack-tpl-name" contenteditable="true" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onblur="renamePackTpl('${t.id}',this.textContent.trim())">${t.name}</span>
      <button class="delbtn" onclick="delPackTpl('${t.id}')">✕</button>
    </div>`;
  });
  html+=`<div class="pack-add-row"><input class="pack-add-inp" placeholder="+ Add ad-hoc item…" onkeydown="if(event.key==='Enter'){addPackTpl('Ad-hoc',this.value.trim());this.value='';event.preventDefault();}"></div>`;
  html+=`</div></div>`;
  pg.innerHTML=html;
}

async function addPackTpl(category,name){
  if(!name)return;
  const t={id:'l-'+Date.now(),name,category,sort_order:st.packTemplates.filter(x=>x.category===category).length};
  st.packTemplates.push(t);renderPackingPage();
  const sv=await sbReqSilent('POST','packing_templates',{name,category,sort_order:t.sort_order});
  if(sv&&sv[0]){const i=st.packTemplates.findIndex(x=>x.id===t.id);if(i>-1)st.packTemplates[i]=sv[0];}
  save();
}

async function renamePackTpl(id,name){
  if(!name)return;
  const t=st.packTemplates.find(x=>String(x.id)===String(id));if(!t||t.name===name)return;
  t.name=name;save();
  if(!String(id).startsWith('l-'))await sbReqSilent('PATCH','packing_templates',{name},`?id=eq.${id}`);
}

async function delPackTpl(id){
  st.packTemplates=st.packTemplates.filter(x=>String(x.id)!==String(id));renderPackingPage();save();
  if(!String(id).startsWith('l-'))await sbReqSilent('DELETE','packing_templates',null,`?id=eq.${id}`);
}

// ── Trip Packing Modal (popup from overview) ───────────────────────────────────
function openPackingModal(travelId){
  const tv=st.travel.find(x=>String(x.id)===String(travelId));if(!tv)return;
  const modal=document.getElementById('packingModal');if(!modal)return;
  modal.dataset.travelId=travelId;
  _packModalView='trip';
  modal.classList.add('open');
  renderPackingModal(travelId);
  modal.focus();
}

let _packModalView='trip'; // 'trip' or 'standard'
function _packProgressBar(pct){
  const c='#10b981';
  return`<div style="display:flex;align-items:center;gap:8px;flex:1"><div style="flex:1;height:8px;border-radius:4px;background:rgba(0,0,0,.06);overflow:hidden"><div style="width:${pct}%;height:100%;border-radius:4px;background:${c};transition:width .3s"></div></div><span style="font-size:11px;font-weight:600;color:${c};white-space:nowrap">${pct}%</span></div>`;
}
function _packInpKeydown(e,travelId){
  const inp=e.target;
  if(e.key==='Tab'&&inp.value.trim()){
    e.preventDefault();
    const sel=document.getElementById('packModalCat');
    if(sel){sel.focus();sel.dataset.pendingName=inp.value.trim();}
    return;
  }
  if(e.key==='Enter'){
    e.preventDefault();
    const cat=document.getElementById('packModalCat');
    const catVal=cat?cat.value:'Other';
    addPackItem(travelId,inp.value.trim(),catVal);
    inp.value='';
  }
}
function _packCatKeydown(e,travelId){
  if(e.key==='Enter'){
    e.preventDefault();
    const sel=e.target;
    const name=sel.dataset.pendingName||'';
    if(name){addPackItem(travelId,name,sel.value);sel.dataset.pendingName='';const inp=document.getElementById('packModalInp');if(inp){inp.value='';inp.focus();}}
  }
}
function _packModalKeydown(e){
  if(e.key==='Escape'){e.stopPropagation();closeMod('packingModal');return;}
  const tag=document.activeElement?.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||document.activeElement?.contentEditable==='true')return;
  const modal=document.getElementById('packingModal');if(!modal||!modal.classList.contains('open'))return;
  const tid=modal.querySelector('[data-travel-id]')?.dataset.travelId||document.getElementById('packingModal')?.dataset?.travelId;
  if(!tid)return;
  if(e.key==='ArrowRight'&&_packModalView==='trip'){e.preventDefault();_packModalView='standard';renderPackingModal(tid);return;}
  if(e.key==='ArrowLeft'&&_packModalView==='standard'){e.preventDefault();_packModalView='trip';renderPackingModal(tid);return;}
}
function _renderPackHeader(travelId){
  const hdr=document.getElementById('packingModalHeader');if(!hdr)return;
  const tv=st.travel.find(x=>String(x.id)===String(travelId));
  const tripName=tv?`${tv.name}${tv.destination?' \u2192 '+tv.destination:''}`:'Trip';
  const items=st.packItems.filter(x=>String(x.travel_id)===String(travelId));
  const totalChecked=items.filter(x=>x.checked).length;
  const pct=items.length?Math.round(totalChecked/items.length*100):0;
  const isTrip=_packModalView==='trip';
  const tripStyle=isTrip?'font-weight:700;color:var(--text)':'font-weight:500;color:var(--muted);cursor:pointer';
  const stdStyle=!isTrip?'font-weight:700;color:var(--text)':'font-weight:500;color:var(--muted);cursor:pointer';
  let html=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px" data-travel-id="${travelId}">
    <span onclick="_packModalView='trip';renderPackingModal('${travelId}')" style="font-size:13px;${tripStyle}">${escHtml(tripName)}</span>
    <span style="color:var(--border);font-size:12px">/</span>
    <span onclick="_packModalView='standard';renderPackingModal('${travelId}')" style="font-size:13px;${stdStyle}">Standard List</span>
    <span style="flex:1"></span>
    <button onclick="closeMod('packingModal')" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--muted);padding:0 2px;line-height:1" title="Close">\u2715</button>
  </div>`;
  if(isTrip){
    html+=`<div style="display:flex;gap:6px;margin-bottom:8px;align-items:center">
      <input id="packModalInp" class="pack-add-inp" placeholder="Add item\u2026" style="flex:1" onkeydown="_packInpKeydown(event,'${travelId}')">
      <select id="packModalCat" onkeydown="_packCatKeydown(event,'${travelId}')" style="font-size:11px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--text)"><option>Other</option>`;
    PACK_CATS.filter(c=>c!=='Other').forEach(c=>{html+=`<option>${c}</option>`;});
    html+=`</select>
      <button class="btn btn-xs" onclick="loadStandardItems('${travelId}')" title="Add all standard items not yet in list">+ Load Standard</button>
    </div>`;
    // progress bar rendered at bottom
  }
  hdr.innerHTML=html;
}
function renderPackingModal(travelId){
  const tv=st.travel.find(x=>String(x.id)===String(travelId));if(!tv)return;
  const body=document.getElementById('packingModalBody');if(!body)return;
  const modal=document.getElementById('packingModal');if(modal)modal.dataset.travelId=travelId;
  _renderPackHeader(travelId);
  // Footer progress bar
  const _ft=document.getElementById('packingModalFooter');
  if(_ft){
    const _fitems=st.packItems.filter(x=>String(x.travel_id)===String(travelId));
    const _fchk=_fitems.filter(x=>x.checked).length;
    const _fpct=_fitems.length?Math.round(_fchk/_fitems.length*100):0;
    _ft.innerHTML=_packModalView==='trip'&&_fitems.length?_packProgressBar(_fpct):'';
    _ft.style.display=_packModalView==='trip'&&_fitems.length?'':'none';
  }
  if(_packModalView==='standard'){_renderPackStandardView(body,travelId);return;}

  const items=st.packItems.filter(x=>String(x.travel_id)===String(travelId));
  const extraCats=[...new Set(items.map(x=>x.category||'Other'))].filter(c=>!PACK_CATS.includes(c));
  const allCats=[...PACK_CATS,...extraCats];

  if(!items.length){
    body.innerHTML=`<p style="font-size:12px;color:var(--muted);text-align:center;padding:24px 0">No items yet. Add items or load standard packing list.</p>`;
    return;
  }
  const _cols=[['Must Haves'],['Clothes','Toiletries'],['Pups','Other']];
  let html=`<div style="display:flex;gap:12px">`;
  _cols.forEach(colCats=>{
    html+=`<div style="flex:1;min-width:0">`;
    colCats.forEach(cat=>{
      const catItems=items.filter(x=>(x.category||'Other')===cat);
      if(!catItems.length)return;
      const unchecked=catItems.filter(x=>!x.checked).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
      const checked=catItems.filter(x=>x.checked).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
      const sorted=[...unchecked,...checked];
      const catDone=checked.length,catTotal=catItems.length;
      const allChecked=catItems.every(x=>x.checked);
      html+=`<div style="margin-bottom:14px;position:relative;padding:0;border-radius:6px;transition:background .15s" onmouseenter="this.style.background='rgba(0,0,0,.02)';var c=this.querySelector('.pack-cat-chk');c.style.width='';c.style.opacity='1';c.style.position='';c.style.pointerEvents='';this.querySelector('.pack-cat-del').style.opacity='1'" onmouseleave="this.style.background='';var c=this.querySelector('.pack-cat-chk');c.style.opacity='0';c.style.position='absolute';c.style.pointerEvents='none';c.style.width='';this.querySelector('.pack-cat-del').style.opacity='0'"><div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:3px;display:flex;align-items:center;gap:6px;padding:4px 6px"><label class="chk-wrap pack-cat-chk" style="margin:-7px -6px;opacity:0;position:absolute;pointer-events:none;transition:opacity .2s ease;flex-shrink:0" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${allChecked?'checked':''} onchange="_packCheckAllCat('${travelId}','${cat}',this.checked)"></label><span>${escHtml(cat)}</span><button class="pack-cat-del" onclick="event.stopPropagation();_delPackCat('${travelId}','${cat}')" style="opacity:0;margin-left:auto;background:none;border:none;cursor:pointer;font-size:11px;color:var(--muted);padding:0 2px;transition:opacity .15s" title="Remove all ${cat} items from this trip">&#10005;</button></div>`;
      sorted.forEach((item,idx)=>{
        const ck=item.checked?'checked':'';
        const sty=item.checked?'opacity:.15;text-decoration:line-through;color:var(--muted)':'';
        const isManual=item.source==='manual';
        const saveBtn=isManual&&!item.checked?`<button class="delbtn" onclick="event.stopPropagation();_savePackToStandard('${item.id}','${travelId}')" title="Save to standard list" style="font-size:10px;opacity:.4">&#9733;</button>`:'';
        html+=`<div class="pack-item-row" draggable="true" data-piid="${item.id}" ondragstart="_packDragId='${item.id}'" ondragover="event.preventDefault()" ondrop="dropPackItem(event,'${item.id}','${travelId}')" >
          <label class="chk-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="chk" ${ck} onchange="togglePackItem('${item.id}','${travelId}',this.checked)"></label>
          <span style="flex:1;font-size:12px;${sty}">${escHtml(item.name)}</span>
          ${saveBtn}
          <button class="delbtn" onclick="delPackItem('${item.id}','${travelId}')">&#10005;</button>
        </div>`;
      });
      html+=`</div>`;
    });
    // Any extra cats in first available column
    html+=`</div>`;
  });
  html+=`</div>`;
  body.innerHTML=html;
}
function _renderPackStandardView(body,travelId){
  const tpls=st.packTemplates.sort((a,b)=>(a.category||'').localeCompare(b.category||'')||(a.sort_order||0)-(b.sort_order||0));
  const grouped={};PACK_CATS.forEach(c=>grouped[c]=[]);
  tpls.forEach(t=>{if(t.category==='Ad-hoc')return;const c=PACK_CATS.includes(t.category)?t.category:'Other';(grouped[c]=grouped[c]||[]).push(t);});

  const _cols=[['Must Haves'],['Clothes','Toiletries'],['Pups','Other']];
  let html=`<div style="display:flex;gap:12px">`;
  _cols.forEach(colCats=>{
    html+=`<div style="flex:1;min-width:0">`;
    colCats.forEach(cat=>{
      const items=grouped[cat]||[];
      html+=`<div style="margin-bottom:14px;padding:4px 6px"><div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:3px">${cat}</div>`;
      items.forEach((t,idx)=>{
        html+=`<div class="pack-item-row" style="padding:3px 4px"><span class="pack-tpl-name" contenteditable="true" style="flex:1;font-size:12px" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onblur="renamePackTpl('${t.id}',this.textContent.trim())">${escHtml(t.name)}</span><button class="delbtn" onclick="delPackTpl('${t.id}');_renderPackStandardView(document.getElementById('packingModalBody'),'${travelId}')">&#10005;</button></div>`;
      });
      html+=`<div style="padding:2px 4px"><input class="pack-add-inp" style="width:100%;font-size:11px" placeholder="+ Add ${cat.toLowerCase()} item\u2026" onkeydown="if(event.key==='Enter'){addPackTpl('${cat}',this.value.trim());this.value='';event.preventDefault();setTimeout(()=>{_renderPackHeader('${travelId}');_renderPackStandardView(document.getElementById('packingModalBody'),'${travelId}');},50);}"></div></div>`;
    });
    html+=`</div>`;
  });
  html+=`</div>`;
  body.innerHTML=html;
}

async function _packCheckAllCat(travelId,cat,checked){
  const items=st.packItems.filter(x=>String(x.travel_id)===String(travelId)&&(x.category||'Other')===cat);
  items.forEach(item=>{item.checked=checked;if(!String(item.id).startsWith('l-'))sbReqSilent('PATCH','packing_items',{checked},`?id=eq.${item.id}`);});
  renderPackingModal(travelId);save();
  _packCheckConfetti(travelId);
}
async function _savePackToStandard(id,travelId){
  const item=st.packItems.find(x=>String(x.id)===String(id));if(!item)return;
  const exists=st.packTemplates.find(t=>t.name.toLowerCase()===item.name.toLowerCase()&&t.category===item.category);
  if(exists)return;
  await addPackTpl(item.category||'Other',item.name);
  renderPackingModal(travelId);
}
function _packCheckConfetti(travelId){
  const items=st.packItems.filter(x=>String(x.travel_id)===String(travelId));
  if(!items.length)return;
  const allDone=items.every(x=>x.checked);
  if(allDone&&typeof launchDonutConfetti==='function')setTimeout(launchDonutConfetti,300);
}
async function _delPackCat(travelId,cat){
  const toDelete=st.packItems.filter(x=>String(x.travel_id)===String(travelId)&&(x.category||'Other')===cat);
  if(!toDelete.length)return;
  toDelete.forEach(item=>{
    st.packItems=st.packItems.filter(x=>x.id!==item.id);
    if(!String(item.id).startsWith('l-'))sbReqSilent('DELETE','packing_items',null,`?id=eq.${item.id}`);
  });
  renderPackingModal(travelId);save();
}
async function addPackItem(travelId,name,category,source){
  if(!name)return;
  const item={id:'l-'+Date.now(),travel_id:travelId,name,category:category||'Other',source:source||'manual',checked:false,sort_order:st.packItems.filter(x=>String(x.travel_id)===String(travelId)).length};
  st.packItems.push(item);renderPackingModal(travelId);save();
  const sv=await sbReqSilent('POST','packing_items',{travel_id:travelId,name:item.name,category:item.category,source:item.source,checked:false,sort_order:item.sort_order});
  if(sv&&sv[0]){const i=st.packItems.findIndex(x=>x.id===item.id);if(i>-1)st.packItems[i]=sv[0];}
  save();
}

async function togglePackItem(id,travelId,checked){
  const item=st.packItems.find(x=>String(x.id)===String(id));if(!item)return;
  item.checked=checked;renderPackingModal(travelId);save();
  _packCheckConfetti(travelId);
  if(!String(id).startsWith('l-'))await sbReqSilent('PATCH','packing_items',{checked},`?id=eq.${id}`);
}

async function delPackItem(id,travelId){
  st.packItems=st.packItems.filter(x=>String(x.id)!==String(id));renderPackingModal(travelId);save();
  if(!String(id).startsWith('l-'))await sbReqSilent('DELETE','packing_items',null,`?id=eq.${id}`);
}

function dropPackItem(e,targetId,travelId){
  e.preventDefault();if(!_packDragId||_packDragId===targetId)return;
  const items=st.packItems.filter(x=>String(x.travel_id)===String(travelId));
  const dragIdx=items.findIndex(x=>String(x.id)===String(_packDragId));
  const dropIdx=items.findIndex(x=>String(x.id)===String(targetId));
  if(dragIdx<0||dropIdx<0)return;
  const [moved]=items.splice(dragIdx,1);items.splice(dropIdx,0,moved);
  items.forEach((it,i)=>it.sort_order=i);
  _packDragId=null;renderPackingModal(travelId);save();
  items.forEach(it=>{if(!String(it.id).startsWith('l-'))sbReqSilent('PATCH','packing_items',{sort_order:it.sort_order},`?id=eq.${it.id}`);});
}

async function loadStandardItems(travelId){
  const existing=st.packItems.filter(x=>String(x.travel_id)===String(travelId));
  const existingNames=new Set(existing.map(x=>x.name.toLowerCase()));
  const templates=st.packTemplates.filter(t=>t.category!=='Ad-hoc');
  let added=0;
  for(const tpl of templates){
    if(existingNames.has(tpl.name.toLowerCase()))continue;
    await addPackItem(travelId,tpl.name,tpl.category,'standard');
    added++;
  }
  renderPackingModal(travelId);
}

async function loadAdhocItems(travelId){
  const existing=st.packItems.filter(x=>String(x.travel_id)===String(travelId));
  const existingNames=new Set(existing.map(x=>x.name.toLowerCase()));
  const adhocs=st.packTemplates.filter(t=>t.category==='Ad-hoc');
  for(const tpl of adhocs){
    if(existingNames.has(tpl.name.toLowerCase()))continue;
    await addPackItem(travelId,tpl.name,'Ad-hoc','adhoc');
  }
  renderPackingModal(travelId);
}

// ── Init ───────────────────────────────────────────────────────────────────────
let _firstSyncDone=false;
async function init(){
  document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="email"]):not([type="password"])').forEach(el=>{el.setAttribute('autocomplete','nope-'+el.id);});
  history.scrollRestoration='manual';
  load();
  // Apply dark mode and sidebar state immediately — before checkAuth await — to prevent flash
  if(cfg.dark){document.body.classList.add('dark');const ic=document.getElementById('darkToggleIcon');if(ic)ic.textContent='☀️';const dt=document.getElementById('darkToggle');if(dt)dt.textContent='☀️';}
  // Suppress left transition during init so sidebar positioning is instant (no squish glitch)
  const _initMain=document.getElementById('main');const _initMainT=_initMain.style.transition;_initMain.style.transition='none';
  if(!sbOpen){document.getElementById('sidebar').classList.add('closed');document.getElementById('main').style.left='0';document.getElementById('menuOpen').classList.add('visible');document.querySelectorAll('.ov-topbar').forEach(el=>el.style.left='0');}else{document.getElementById('sidebar').classList.remove('closed');document.getElementById('main').style.left='186px';document.getElementById('menuOpen').classList.remove('visible');document.querySelectorAll('.ov-topbar').forEach(el=>el.style.left='186px');}
  _initMain.offsetWidth;requestAnimationFrame(()=>{_initMain.style.transition=_initMainT;});
  // Restore page from URL hash immediately
  const initHash=location.hash.replace('#','');
  if(initHash==='videos')_vidPageInit=true;
  if(initHash&&PAGES.includes(initHash))showPage(initHash);
  // Render from localStorage before auth check so UI is populated instantly
  if(cfg.url&&cfg.key){document.getElementById('cfgUrl').value=cfg.url;document.getElementById('cfgKey').value=cfg.key;_firstSyncDone=true;renderAll();requestAnimationFrame(()=>requestAnimationFrame(()=>document.body.classList.remove('preload')));}
  const authed=await checkAuth();
  if(!authed){document.body.classList.remove('preload');return;}
  if(cfg.url&&cfg.key){
    deletedRecIds=new Set();save();
    syncAll(false).then(()=>{_firstSyncDone=true;});
  } else{_firstSyncDone=true;renderAll();setBadge('err','Not connected');requestAnimationFrame(()=>document.body.classList.remove('preload'));}
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
let _lastTBRbRange=null; // {selTop,selBot} last rubber-band range in tb-col coordinates, for 'a' key

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
    const woCol=e.currentTarget.closest('.wo-col');
    const moCal=e.currentTarget.closest('#mCells,#recMoCells');
    const list=e.currentTarget.closest('.tlist,.kol-body');
    if(woCol){
      ids=[...woCol.querySelectorAll('.chip[data-tid]')].map(el=>el.dataset.tid);
    } else if(wkcCol){
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
  // Resolve selected vid-ov- IDs
  const selVidIds=new Set();
  const selVidStepIds=new Set();
  const selFinCancelIds=new Set();
  selectedTasks.forEach(id=>{
    if(id.startsWith('vid-ov-'))selVidIds.add(id.replace('vid-ov-',''));
    if(id.startsWith('vidstep-'))selVidStepIds.add(id);
    if(id.startsWith('fin-cancel-'))selFinCancelIds.add(id.replace('fin-cancel-',''));
  });
  // Resolve selected timeblocks to their underlying task/shop/rec IDs for cross-view highlight
  const selTaskIds=new Set();
  selectedTasks.forEach(id=>{
    if(!id.startsWith('blk-'))return;
    const b=st.blocks.find(x=>String(x.id)===id.replace('blk-',''));
    if(!b)return;
    if(b.taskId)selTaskIds.add(String(b.taskId));
    if(b.shopId)selShopIds.add(String(b.shopId));
    if(b.ruleId)selWrRuleIds.add(String(b.ruleId));
    if(b.recId){const _isWrR=!b.ruleId&&(st.wrRules||[]).some(x=>String(x.id)===String(b.recId));if(_isWrR)selWrRuleIds.add(String(b.recId));else selRecIds.add(String(b.recId));}
    if(b._vidStepVid&&b._vidStepName)selVidStepIds.add('vidstep-'+String(b._vidStepVid)+'-'+String(b._vidStepName));
    if(b._vidId)selVidIds.add(String(b._vidId));
    if(b._finCancelSubId)selectedTasks.has('blk-'+String(b.id))&&selFinCancelIds.add(String(b._finCancelSubId));
  });
  function csForId(id){
    if(!id)return null;
    if(id.startsWith('tv-'))return gc('travel');
    if(id.startsWith('vid-ov-')||id.startsWith('vidstep-'))return{bg:'rgba(34,197,94,.1)',t:'#15803d',d:'#22c55e',b:'rgba(34,197,94,.2)'};
    if(id.startsWith('pup-sess-'))return typeof _pupSessStyle==='function'?_pupSessStyle():gc('recurring');
    if(id.startsWith('wrrule-'))return gc('weekly_reset');
    if(id.startsWith('wrec-')){const r=st.recurring.find(x=>String(x.id)===id.replace('wrec-',''));return gc(r&&(r.is_weekly_reset===true||r.is_weekly_reset==='true')?'weekly_reset':'recurring');}
    if(id.startsWith('rec-virt-'))return gc('recurring');
    if(id.startsWith('shop-cal-'))return gc('shopping');
    if(id.startsWith('fin-cancel-'))return IMP;
    const t=st.tasks.find(x=>String(x.id)===String(id));
    if(!t)return null;
    if(!t.done&&t.due_date&&t.due_date.split('T')[0]<tod())return OV;
    if(t.important)return IMP;
    if(t.notes&&t.notes.startsWith('_vid:'))return{bg:'rgba(22,163,74,.18)',t:'#166534',d:'#16a34a',b:'rgba(22,163,74,.35)'};
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
    if(!sel)sel=selTaskIds.has(id);
    if(!sel&&id.startsWith('vid-ov-')){sel=selVidIds.has(id.replace('vid-ov-',''));}
    if(!sel&&id.startsWith('rec-virt-')){sel=selRecIds.has(id.replace('rec-virt-',''));}
    if(!sel&&id.startsWith('shop-cal-')){sel=selShopIds.has(id.replace('shop-cal-',''));}
    if(!sel&&id.startsWith('wrrule-virt-')){sel=selWrRuleIds.has(id.replace('wrrule-virt-',''));}
    else if(!sel&&id.startsWith('wrrule-')){sel=selWrRuleIds.has(id.replace('wrrule-',''));}
    if(!sel&&id.startsWith('fin-cancel-')){sel=selFinCancelIds.has(id.replace('fin-cancel-',''));}
    if(!sel&&id.startsWith('vidstep-')){sel=selVidStepIds.has(id);}
    el.classList.toggle('sel-row',sel);
    if(sel)applySelVars(el,csForId(csId));
    else clearSelVars(el);
  });
  document.querySelectorAll('.kol-item,.chip,.mcell-t').forEach(el=>{
    const id=el.dataset.tid;
    if(!id)return;
    let sel=selectedTasks.has(id);
    if(!sel)sel=selTaskIds.has(id);
    if(!sel&&id.startsWith('vid-ov-'))sel=selVidIds.has(id.replace('vid-ov-',''));
    else if(!sel&&id.startsWith('rec-virt-'))sel=selRecIds.has(id.replace('rec-virt-',''));
    else if(!sel&&id.startsWith('wrec-'))sel=selRecIds.has(id.replace('wrec-',''));
    else if(!sel&&id.startsWith('shop-cal-'))sel=selShopIds.has(id.replace('shop-cal-',''));
    else if(!sel&&id.startsWith('wrrule-virt-'))sel=selWrRuleIds.has(id.replace('wrrule-virt-',''));
    else if(!sel&&id.startsWith('wrrule-'))sel=selWrRuleIds.has(id.replace('wrrule-',''));
    if(!sel&&id.startsWith('fin-cancel-'))sel=selFinCancelIds.has(id.replace('fin-cancel-',''));
    if(!sel&&id.startsWith('vidstep-'))sel=selVidStepIds.has(id);
    el.classList.toggle('sel-row',sel);
    if(sel)applySelVars(el,csForId(id));
    else clearSelVars(el);
  });
  document.querySelectorAll('.meal-chip[data-tid]').forEach(el=>{
    const id=el.dataset.tid;
    const sel=selectedTasks.has(id);
    el.classList.toggle('sel-row',sel);
    if(sel){el.style.outline='1px solid rgba(200,196,218,.7)';el.style.outlineOffset='-1px';el.style.boxShadow='0 3px 10px rgba(180,175,205,.28)';}
    else{el.style.outline='';el.style.outlineOffset='';el.style.boxShadow='';}
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
    if(b.cat==='pup_session'&&b._pupSessId){const psid='pup-sess-'+String(b._pupSessId);sel=selectedTasks.has(psid);csId=psid;}
    else if(b.taskId){const blkId='blk-'+String(b.id);sel=selectedTasks.has(blkId)||selectedTasks.has(String(b.taskId));csId=String(b.taskId);}
    else if(b.recId){const rid=String(b.recId);const _r=st.recurring.find(x=>String(x.id)===rid);const _isWrRule=!_r&&(st.wrRules||[]).some(x=>String(x.id)===rid);const _isWr=_r&&(_r.is_weekly_reset===true||_r.is_weekly_reset==='true');if(_isWrRule||b.ruleId){const blkId='blk-'+String(b.id);sel=selectedTasks.has(blkId)||selWrRuleIds.has(rid);csId='wrrule-'+rid;}else{sel=selectedTasks.has('rec-virt-'+rid)||selRecIds.has(rid)||selectedTasks.has('wrec-'+rid);csId=(_isWr?'wrec-':'rec-virt-')+rid;}}
    else if(b.ruleId){const blkId='blk-'+String(b.id);const rid=String(b.ruleId);sel=selectedTasks.has(blkId)||selWrRuleIds.has(rid);csId='wrrule-'+rid;}
    else if(b.shopId){const sid=String(b.shopId);const blkId='blk-'+String(b.id);sel=selectedTasks.has(blkId)||selectedTasks.has('shop-cal-'+sid)||selShopIds.has(sid);csId='shop-cal-'+sid;}
    else if(b._vidStepVid){const blkId='blk-'+String(b.id);const vsId='vidstep-'+String(b._vidStepVid)+'-'+String(b._vidStepName||'');sel=selectedTasks.has(blkId)||selectedTasks.has(vsId);csId=vsId;}
    else if(b._vidId){const vid=String(b._vidId);const blkId='blk-'+String(b.id);sel=selectedTasks.has(blkId)||selectedTasks.has('vid-ov-'+vid)||selVidIds.has(vid);csId='vid-ov-'+vid;}
    else if(b._finCancelSubId){const fcId=String(b._finCancelSubId);const blkId='blk-'+String(b.id);sel=selectedTasks.has(blkId)||selectedTasks.has('fin-cancel-'+fcId)||selFinCancelIds.has(fcId);csId='fin-cancel-'+fcId;}
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
  const selAtbIds=new Set([...selectedTasks].filter(id=>id.startsWith('atb::')).map(id=>id.replace('atb::','')));
  document.querySelectorAll('.atb-block[data-atb-id]').forEach(el=>{
    el.classList.toggle('sel-atb',selAtbIds.has(el.dataset.atbId));
  });
}

function clearSelection(){
  selectedTasks.clear();
  lastSelectedId=null;
  applySelHighlight();
}

// Keyboard shortcuts
let _copiedTasks=[];
let _copiedBlocks=[];
let _tbPasteSm=null; // set by clicking empty TB area
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();}},{capture:true});
let _wKeyHeld=false;
document.addEventListener('keydown',e=>{if(e.key==='w'&&!e.metaKey&&!e.ctrlKey){const _t=document.activeElement?.tagName;if(_t==='INPUT'||_t==='TEXTAREA'||_t==='SELECT'||document.activeElement?.isContentEditable)return;_wKeyHeld=true;}});
document.addEventListener('keyup',e=>{if(e.key==='w')_wKeyHeld=false;});
window.addEventListener('blur',()=>{_wKeyHeld=false;});
document.addEventListener('keydown',async e=>{
  const tag=document.activeElement?.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||document.activeElement?.isContentEditable)return;
  // q key: toggle quick notes
  if(e.key==='q'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!document.querySelector('.overlay.open')){e.preventDefault();if(typeof toggleQN==='function')toggleQN();return;}
  // t key: jump to today on overview
  if(e.key==='t'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&activePg==='overview'&&!document.querySelector('.overlay.open')&&!(typeof _vidCalOpen!=='undefined'&&_vidCalOpen)){const _vp=document.getElementById('vidOvPanel');if(_vp&&_vp.style.display==='block'){}else{e.preventDefault();document.activeElement?.blur();goToday();return;}}
  // A key: add selected today-list task to TB at current time
  if(e.key==='a'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&activePg==='overview'&&selectedTasks.size>0&&!document.querySelector('.overlay.open')&&!_qnOpen){
    // Only act on today-list items that have the tb-arrow (= NOT yet on TB)
    const todayList=document.getElementById('todList');if(!todayList){return;}
    const eligibleIds=new Set();
    todayList.querySelectorAll('.ti[id],.chip[data-tid]').forEach(el=>{
      if(!el.querySelector('.tb-arrow'))return; // no arrow = already on TB, skip
      const sid2=el.id?el.id.replace('ti-',''):(el.dataset.tid||'');
      if(sid2)eligibleIds.add(sid2);
    });
    const toAdd=[...selectedTasks].filter(sid=>eligibleIds.has(sid));
    if(!toAdd.length)return;
    e.preventDefault();
    if(typeof _addSelectedToTB==='function')_addSelectedToTB(toAdd);
    return;
  }
  // Video panel keyboard nav (arrow up/down, delete, enter)
  if(activePg==='overview'&&typeof _vidOvKeyNav==='function'&&_vidOvKeyNav(e))return;
  if(activePg==='overview'&&typeof _vidOvAllOpen!=='undefined'&&_vidOvAllOpen){
    // When toolbox open: block arrows (handled by toolbox), let other keys through
    if(e.key==='ArrowUp'||e.key==='ArrowDown'||e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='Delete'||e.key==='Backspace'||e.key==='n'||e.key==='Enter')return;
  }
  // w + Arrow: shift week on overview
  if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&_wKeyHeld&&activePg==='overview'&&!document.querySelector('.atb-mgr')){e.preventDefault();shiftWk(e.key==='ArrowLeft'?-1:1);return;}
  // Arrow left/right: shift day on overview when nothing selected
  if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&activePg==='overview'&&!document.querySelector('.overlay.open')&&!_qnOpen&&!document.querySelector('.atb-mgr')){
    if(!selectedTasks.size){e.preventDefault();shiftDay(e.key==='ArrowLeft'?-1:1);return;}
    // If a single auto-block is selected (not blk/vidstep which should move days), cycle like Tab
    if(selectedTasks.size===1&&lastSelectedId){
      const sid=lastSelectedId;
      const isTBCycleOnly=sid.startsWith('atb::')||sid.startsWith('pup-sess-');
      if(isTBCycleOnly&&typeof _tbTabCycle==='function'){e.preventDefault();_tbTabCycle(e.key==='ArrowLeft');return;}
    }
    // Move selected tasks ±1 day on weekly cal
    if(!document.querySelector('.tb-col')||document.querySelector('.tb-col')){
      const dir=e.key==='ArrowLeft'?-1:1;
      const _shiftDs=(ds,n)=>{const d=new Date(ds+'T12:00:00');d.setDate(d.getDate()+n);return d2s(d);};
      const undos=[];
      let moved=false;
      for(const sid of selectedTasks){
        // Regular task
        const rt=st.tasks.find(x=>String(x.id)===sid);
        if(rt&&!rt._virtual){
          const prev=rt.due_date;const prevDs=(prev||'').split('T')[0];if(!prevDs)continue;
          const newDs=_shiftDs(prevDs,dir);
          const savedTBs=st.blocks.filter(b=>String(b.taskId)===sid&&b.ds===prevDs).map(b=>({...b}));
          rt.due_date=newDs;
          removeTBBlocksForDate(newDs,{taskId:rt.id,oldDs:prevDs});
          // Re-create timeblock on new day
          if(savedTBs.length&&!st.blocks.some(b=>String(b.taskId)===sid&&b.ds===newDs)){const nb={id:crypto.randomUUID(),title:rt.name,ds:newDs,sm:savedTBs[0].sm,dur:savedTBs[0].dur,cat:rt.category||'',taskId:sid};st.blocks.push(nb);sbSaveBlock(nb);}
          sbReqNullable('PATCH','tasks',{due_date:newDs},`?id=eq.${sid}`);
          undos.push(()=>{rt.due_date=prev;const nBlks=st.blocks.filter(b=>String(b.taskId)===sid&&b.ds===newDs);nBlks.forEach(b=>sbDeleteBlock(b.id));st.blocks=st.blocks.filter(b=>!(String(b.taskId)===sid&&b.ds===newDs));savedTBs.forEach(b=>{if(!st.blocks.find(y=>y.id===b.id))st.blocks.push(b);sbSaveBlock(b);});sbReqNullable('PATCH','tasks',{due_date:prev},`?id=eq.${sid}`);});
          moved=true;continue;
        }
        // Recurring task
        if(sid.startsWith('rec-virt-')){
          const recId=sid.replace('rec-virt-','');
          const r=st.recurring.find(x=>String(x.id)===recId);if(!r)continue;
          const wkKey=getWkKey(wkOff);if(!r._dateOverrides)r._dateOverrides={};
          const curDs=r._dateOverrides[wkKey];if(!curDs||curDs==='__skip__')continue;
          const prev=curDs;const newDs=_shiftDs(curDs,dir);
          r._dateOverrides[wkKey]=newDs;
          sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${recId}`);
          undos.push(()=>{r._dateOverrides[wkKey]=prev;sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${recId}`);});
          moved=true;continue;
        }
        // Wrec (weekly reset recurring)
        if(sid.startsWith('wrec-')){
          const recId=sid.replace('wrec-','');
          const r=st.recurring.find(x=>String(x.id)===recId);if(!r)continue;
          const wkKey=getWkKey(wkOff);if(!r._dateOverrides)r._dateOverrides={};
          const curDs=r._dateOverrides[wkKey];if(!curDs||curDs==='__skip__')continue;
          const prev=curDs;const newDs=_shiftDs(curDs,dir);
          r._dateOverrides[wkKey]=newDs;
          sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${recId}`);
          undos.push(()=>{r._dateOverrides[wkKey]=prev;sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${recId}`);});
          moved=true;continue;
        }
        // WR rule
        if(sid.startsWith('wrrule-virt-')){
          const ruleId=sid.replace('wrrule-virt-','');
          const r=st.wrRules.find(x=>String(x.id)===ruleId);if(!r)continue;
          const wkKey=getWkKey(wkOff);if(!r._dateOverrides)r._dateOverrides={};
          const curDs=r._dateOverrides[wkKey];if(!curDs||curDs==='__skip__')continue;
          const prev=curDs;const newDs=_shiftDs(curDs,dir);
          r._dateOverrides[wkKey]=newDs;
          sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${ruleId}`);
          undos.push(()=>{r._dateOverrides[wkKey]=prev;sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${ruleId}`);});
          moved=true;continue;
        }
        // Shopping
        if(sid.startsWith('shop-cal-')){
          const shopId=sid.replace('shop-cal-','');
          const s=st.shopping.find(x=>String(x.id)===shopId);if(!s||!s.due_date)continue;
          const prevDs=(s.due_date||'').split('T')[0];const newDs=_shiftDs(prevDs,dir);
          const prev=s.due_date;s.due_date=newDs;
          sbReqNullable('PATCH','shopping_list',{due_date:newDs},`?id=eq.${shopId}`);
          undos.push(()=>{s.due_date=prev;sbReqNullable('PATCH','shopping_list',{due_date:prev},`?id=eq.${shopId}`);});
          moved=true;continue;
        }
        // Video overview chip (vid-ov-*)
        if(sid.startsWith('vid-ov-')){
          const vidId=sid.replace('vid-ov-','');
          const map=typeof _vidDayMap==='function'?_vidDayMap():null;if(!map)continue;
          const curDs=map[String(vidId)];if(!curDs)continue;
          const newDs=_shiftDs(curDs,dir);
          const prevDs=curDs;
          map[String(vidId)]=newDs;_vidDayMapSet(map);
          // Move linked timeblock blocks
          (st.blocks||[]).filter(b=>String(b._vidId)===String(vidId)&&b.ds===prevDs).forEach(b=>{b.ds=newDs;sbSaveBlock(b);});
          undos.push(()=>{const m2=_vidDayMap();m2[String(vidId)]=prevDs;_vidDayMapSet(m2);(st.blocks||[]).filter(b=>String(b._vidId)===String(vidId)&&b.ds===newDs).forEach(b=>{b.ds=prevDs;sbSaveBlock(b);});});
          moved=true;continue;
        }
        // Timeblock block (blk-*)
        if(sid.startsWith('blk-')){
          const blkId=sid.replace('blk-','');
          const b=st.blocks.find(x=>String(x.id)===blkId);if(!b||!b.ds)continue;
          const prevDs=b.ds;const newDs=_shiftDs(prevDs,dir);
          b.ds=newDs;sbSaveBlock(b);
          undos.push(()=>{b.ds=prevDs;sbSaveBlock(b);});
          moved=true;continue;
        }
        // Video step (vidstep-*) — ID may be vidstep-{vid}-{step} or vidstep-{vid}-{step}-{ds}
        if(sid.startsWith('vidstep-')){
          const m=sid.match(/^vidstep-(\d+)-(step_\w+)(?:-(\d{4}-\d{2}-\d{2}))?/);if(!m)continue;
          const vidId=m[1],step=m[2],chipDs=m[3]||null;
          const stepMap=typeof _vidStepDayMap==='function'?_vidStepDayMap():null;
          const key=vidId+'::'+step;
          const prevEntry=stepMap?stepMap[key]:null;
          const prevDs=chipDs||( prevEntry?prevEntry.ds:null);
          if(!prevDs){
            const blks=st.blocks.filter(bl=>String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step);
            if(!blks.length)continue;
            const prevDsList=blks.map(bl=>bl.ds);
            blks.forEach(bl=>{bl.ds=_shiftDs(bl.ds,dir);sbSaveBlock(bl);});
            undos.push(()=>{blks.forEach((bl,i)=>{bl.ds=prevDsList[i];sbSaveBlock(bl);});});
          } else {
            const newDs=_shiftDs(prevDs,dir);
            if(stepMap&&prevEntry){stepMap[key]={ds:newDs,done:prevEntry.done};_vidStepDayMapSet(stepMap);}
            (st.blocks||[]).filter(bl=>String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step&&bl.ds===prevDs).forEach(bl=>{bl.ds=newDs;sbUpdateBlock(bl.id,{day_date:newDs});});
            undos.push(()=>{if(stepMap&&prevEntry){const m2=_vidStepDayMap();m2[key]={ds:prevDs,done:prevEntry.done};_vidStepDayMapSet(m2);}(st.blocks||[]).filter(bl=>String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step&&bl.ds===newDs).forEach(bl=>{bl.ds=prevDs;sbUpdateBlock(bl.id,{day_date:prevDs});});});
          }
          moved=true;continue;
        }
      }
      if(moved){e.preventDefault();save();renderAll();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();
        pushUndo(()=>{undos.forEach(fn=>fn());save();renderAll();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();},'Moved tasks');
      }
    }
    return;
  }
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
    // Meal chips: remove meals
    const mealIds=ids.filter(id=>id.startsWith('meal-'));
    if(mealIds.length){
      mealIds.forEach(id=>{const mid=id.replace('meal-','');removeMeal(mid);});
      clearSelection();return;
    }
    // Auto-timeblock blocks: delete for that day
    const atbDelIds=ids.filter(id=>id.startsWith('atb::'));
    if(atbDelIds.length){
      const ds=d2s(getDayDate(dayOff));
      const restores=[];
      atbDelIds.forEach(id=>{
        const atbId=id.replace('atb::','');
        const atb=getAutoTBForDate(ds).find(a=>a._atbId===atbId);if(!atb)return;
        const ovId=atb._ovId||null;
        const prevOv=ovId?{...st.autoTBOverrides.find(o=>String(o.id)===ovId)}:null;
        if(ovId){
          const ov=st.autoTBOverrides.find(o=>String(o.id)===ovId);
          if(ov){ov.start_time=null;ov.end_time=null;}
          sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:null,end_time:null},`?id=eq.${ovId}`);
          restores.push(()=>{const ov2=st.autoTBOverrides.find(o=>String(o.id)===ovId);if(ov2&&prevOv){ov2.start_time=prevOv.start_time;ov2.end_time=prevOv.end_time;}sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:prevOv.start_time,end_time:prevOv.end_time},`?id=eq.${ovId}`);});
        } else {
          const tmpId='atbov-tmp-'+Date.now()+'-'+atbId;
          const payload={base_id:atbId,date:ds,start_time:null,end_time:null};
          st.autoTBOverrides.push({...payload,id:tmpId});
          let realId=null;
          sbReqSilent('POST','auto_timeblock_overrides',payload,'').then(res=>{if(res&&res[0]){realId=String(res[0].id);const idx=st.autoTBOverrides.findIndex(o=>String(o.id)===tmpId);if(idx>-1)st.autoTBOverrides[idx]=res[0];save();}});
          restores.push(()=>{const rid=realId||tmpId;st.autoTBOverrides=st.autoTBOverrides.filter(o=>String(o.id)!==rid);if(realId)sbReqSilent('DELETE','auto_timeblock_overrides',null,`?id=eq.${realId}`);});
        }
      });
      save();if(document.getElementById('tbGrid'))renderDayTB();
      pushUndo(()=>{restores.forEach(fn=>fn());save();if(document.getElementById('tbGrid'))renderDayTB();},`Deleted ${atbDelIds.length} auto block${atbDelIds.length>1?'s':''}`);
      clearSelection();return;
    }
    // Timeblock-only blocks (shop/WR rule/task): just remove from timeblock
    const blkOnlyIds=ids.filter(id=>id.startsWith('blk-'));
    if(blkOnlyIds.length){
      const _removed=blkOnlyIds.map(id=>{const bid=id.replace('blk-','');const b=st.blocks.find(x=>x.id===bid);return b?{...b}:null;}).filter(Boolean);
      const _removedPupSess=[];
      _removed.forEach(copy=>{
        if(copy.cat==='pup_session'&&copy._pupSessId){const s=st.pupSessions.find(x=>String(x.id)===String(copy._pupSessId));if(s){_removedPupSess.push({...s});st.pupSessions=st.pupSessions.filter(x=>String(x.id)!==String(copy._pupSessId));sbReqSilent('DELETE','pup_skill_sessions',null,`?id=eq.${copy._pupSessId}`);}}
        st.blocks=st.blocks.filter(x=>x.id!==copy.id);sbDeleteBlock(copy.id);
      });
      save();renderAll();renderPupSkillsHighlight();renderToday();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();
      pushUndo(()=>{
        _removed.forEach(copy=>{st.blocks.push(copy);sbSaveBlock(copy);});
        _removedPupSess.forEach(s=>{st.pupSessions.push(s);sbReqSilent('POST','pup_skill_sessions',{skill_id:s.skill_id,day_date:s.day_date,done:s.done},'');});
        save();renderAll();renderPupSkillsHighlight();renderToday();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();
      },_removed.length>1?`Removed ${_removed.length} from time block`:'Removed from time block');
      clearSelection();return;
    }
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
    renderAll();renderWkSummary();renderWkCal();renderRecOv();renderWeeklyPage();if(document.getElementById('tbGrid'))renderDayTB();save();
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
        const oldId=String(t.id);
        const sv=await sbReq('POST','tasks',{name:t.name,category:t.category,due_date:t.due_date,done:t.done,important:t.important||false});
        const newTask=sv&&sv[0]?sv[0]:t;
        st.tasks.push(newTask);
        // Re-link timeblock blocks that referenced the old task ID
        const newId=String(newTask.id);
        st.blocks.filter(b=>String(b.taskId)===oldId).forEach(b=>{b.taskId=newId;sbUpdateBlock(b.id,{task_id:newId});});
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
      renderAll();renderWkSummary();renderWkCal();renderRecOv();renderWeeklyPage();if(document.getElementById('tbGrid'))renderDayTB();save();
    },'Deleted '+(totalCount>1?totalCount+' items':'item'));
    clearSelection();
    return;
  }
  // Cmd+C: copy selected tasks or blocks
  if((e.metaKey||e.ctrlKey)&&e.key==='c'&&selectedTasks.size>0){
    // Check if any are TB blocks
    const blkIds=[...selectedTasks].filter(id=>id.startsWith('blk-'));
    if(blkIds.length){
      _copiedBlocks=[];
      const ds=d2s(getDayDate(dayOff));
      blkIds.forEach(sid=>{
        const bid=sid.replace('blk-','');
        const b=st.blocks.find(x=>String(x.id)===bid);
        if(b)_copiedBlocks.push({...b});
      });
      _copiedTasks=[];
      showToast(`Copied ${_copiedBlocks.length} block${_copiedBlocks.length>1?'s':''}`,'#6d5fe6',1500);
      return;
    }
    _copiedTasks=[];_copiedBlocks=[];
    selectedTasks.forEach(id=>{
      if(id.startsWith('rec-virt-')){
        const recId=id.replace('rec-virt-','');
        const r=st.recurring.find(x=>String(x.id)===recId);
        if(r)_copiedTasks.push({...r,_isRec:true});
      } else if(id.startsWith('wrrule-')){
        const rid=id.replace('wrrule-','');
        const r=st.wrRules.find(x=>String(x.id)===rid);
        if(r)_copiedTasks.push({...r,_isWrRule:true});
      } else if(id.startsWith('vidstep-')){
        const m=id.match(/^vidstep-(\d+)-(step_\w+)/);
        if(m){const vidId=m[1],step=m[2];const v=(st.videos||[]).find(x=>String(x.id)===String(vidId));if(v)_copiedTasks.push({_isVidStep:true,_vidId:vidId,_vidStep:step,name:(typeof _VID_STEP_LABELS!=='undefined'?_VID_STEP_LABELS[step]:step)+': '+(v.topic||v.title)});}
      } else {
        const t=st.tasks.find(x=>String(x.id)===id);
        if(t)_copiedTasks.push({...t});
      }
    });
    if(_copiedTasks.length)showToast(`Copied ${_copiedTasks.length} item${_copiedTasks.length>1?'s':''}`,'#6d5fe6',1500);
    return;
  }
  // Cmd+V: paste copied blocks
  if((e.metaKey||e.ctrlKey)&&e.key==='v'&&_copiedBlocks.length>0){
    e.preventDefault();
    const ds=d2s(getDayDate(dayOff));
    const sorted=[..._copiedBlocks].sort((a,b)=>a.sm-b.sm);
    let baseSm=_tbPasteSm!=null?_tbPasteSm:(sorted[0].sm+sorted[0].dur);
    const newBlks=[];
    const _pastePromises=[];
    sorted.forEach(ob=>{
      const nb={id:crypto.randomUUID(),title:ob.title,ds,sm:baseSm,dur:ob.dur,cat:ob.cat||'Home',
        taskId:null,recId:null,shopId:null,_vidId:ob._vidId||null,_done:false};
      // Duplicate linked task so dblclick opens edit modal for the new copy
      if(ob.taskId){
        const orig=st.tasks.find(t=>String(t.id)===String(ob.taskId));
        if(orig){
          const dup={name:orig.name,category:orig.category||'Home',due_date:ds,done:false,notes:orig.notes||null,important:false};
          const tmpId='t-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
          st.tasks.push({...dup,id:tmpId});nb.taskId=tmpId;
          _pastePromises.push(sbReq('POST','tasks',dup).then(sv=>{if(sv&&sv[0]){const idx=st.tasks.findIndex(x=>x.id===tmpId);if(idx>-1)st.tasks[idx]={...st.tasks[idx],...sv[0]};nb.taskId=String(sv[0].id);sbSaveBlock(nb);}}));
        }
      }
      st.blocks.push(nb);newBlks.push(nb);sbSaveBlock(nb);
      baseSm+=ob.dur;
    });
    _tbPasteSm=null;
    save();if(document.getElementById('tbGrid'))renderDayTB();renderToday();renderWkCal();
    const ids=newBlks.map(b=>b.id);
    pushUndo(()=>{st.blocks=st.blocks.filter(b=>!ids.includes(b.id));ids.forEach(id=>sbDeleteBlock(id));save();if(document.getElementById('tbGrid'))renderDayTB();renderToday();renderWkCal();},'Pasted blocks');
    showToast(`Pasted ${newBlks.length} block${newBlks.length>1?'s':''}`,'#6d5fe6',1500);
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
      } else if(t._isVidStep){
        // Only Build/VO/Cut can be pasted onto a day — Th/Des cannot
        if(t._vidStep==='step_thumbnail'||t._vidStep==='step_description'){if(typeof showToast==='function')showToast('Th/Des steps can\'t be pasted to a day','#ef4444',1500);return;}
        const pasteDate=(activePg==='overview'&&Array.isArray(_pasteColDates)&&_pasteColDates.length)?_pasteColDates[0]:d2s(getDayDate(dayOff));
        // Create a new TB block on the target day (Build/VO/Cut can span multiple days)
        if(typeof _vidStepAddBlock==='function')_vidStepAddBlock(t._vidId,t._vidStep,pasteDate);
      } else {
        const dates=(activePg==='overview'&&Array.isArray(_pasteColDates)&&_pasteColDates.length)?_pasteColDates:[t.due_date];
        for(const pasteDate of dates){
          const dup={id:'l-'+Date.now()+Math.random(),name:t.name,category:t.category,due_date:pasteDate,done:false,important:t.important||false};
          st.tasks.push(dup);renderAll();
          let pasteServerId=null;
          pushUndo(()=>{const rid=pasteServerId||dup.id;st.tasks=st.tasks.filter(x=>String(x.id)!==String(rid));renderAll();if(pasteServerId)sbReq('DELETE','tasks',null,`?id=eq.${pasteServerId}`);},'Pasted task');
          const sv=await sbReq('POST','tasks',{name:dup.name,category:dup.category,due_date:dup.due_date,done:false,important:dup.important});
          if(sv&&sv[0]){const i=st.tasks.findIndex(x=>x.id===dup.id);if(i>-1){st.tasks[i]=sv[0];}pasteServerId=String(sv[0].id);save();renderAll();}
        }
      }
    });
    _pasteColDates=null;
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
function tiDblRec(e,recId,wkKey){
  if(e.target.closest('.chk')||e.target.closest('.delbtn'))return;
  e.stopPropagation();
  clearSelection();
  openRecEditModal(recId,wkKey||'','this');
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
  const tf=document.getElementById('recEditTimeField');if(tf)tf.style.display=isWr?'none':'block';
  const df=document.getElementById('recEditDurField');if(df)df.style.display=isWr?'none':'block';
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
  const rst=document.getElementById('recEditStartTime');if(rst)rst.value=r.default_start_time||'';
  const ret=document.getElementById('recEditEndTime');if(ret)ret.value=r.default_end_time||'';
  const rdu=document.getElementById('recEditDur');if(rdu)rdu.value=String(r.default_tb_duration||60);
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
    save();renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();
    sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));
    pushUndo(()=>{if(prev!==undefined)r._dateOverrides[nameOvKey]=prev;else delete r._dateOverrides[nameOvKey];save();renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(rid));},'Edited recurring this week');
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
  const defStart=document.getElementById('recEditStartTime')?.value||null;
  const defEnd=document.getElementById('recEditEndTime')?.value||null;
  const defDur=parseInt(document.getElementById('recEditDur')?.value)||60;
  closeMod('recEditModal');
  const prev={name:r.name,is_weekly_reset:r.is_weekly_reset,cadence:r.cadence,appears_on_date:r.appears_on_date,starting_date:r.starting_date,pup_related:r.pup_related,notes:r.notes,default_start_time:r.default_start_time,default_end_time:r.default_end_time,default_tb_duration:r.default_tb_duration};
  r.name=name;r.is_weekly_reset=isWr;r.cadence=cadence;r.appears_on_date=appearsOn;r.starting_date=startDate;r.pup_related=pupRelated;r.notes=notes;r.default_start_time=defStart;r.default_end_time=defEnd;r.default_tb_duration=defDur;
  save();renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();
  const patch={name,is_weekly_reset:isWr,cadence,appears_on_date:appearsOn,pup_related:pupRelated,notes:notes||null,default_start_time:defStart,default_end_time:defEnd,default_tb_duration:defDur};
  if(startDate)patch.starting_date=startDate;
  sbReq('PATCH','wr_recurring_rules',patch,recQs(rid));
  pushUndo(()=>{Object.assign(r,prev);save();renderRecOv();renderWeeklyPage();renderWkSummary();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();},'Edited recurring');
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
// THEMES
// ══════════════════════════════════════════════════════════
const THEMES={
  peach:{name:'Peach',bg:'linear-gradient(135deg,#fef3ee 0%,#fffbf2 50%,#fdf0fb 100%)',body:'#fef6f0',orbs:['radial-gradient(circle,#fcd5ce,#f9b8ae)','radial-gradient(circle,#fed7aa,#fbbf7a)','radial-gradient(circle,#fbcfe8,#f9a8d4)','radial-gradient(circle,#fef3c7,#fde68a)','radial-gradient(circle,#e9d5ff,#d8b4fe)'],swatch:'linear-gradient(135deg,#fcd5ce,#fbbf7a,#f9a8d4)'},
  ocean:{name:'Ocean',bg:'linear-gradient(135deg,#e8f4f8 0%,#f0f7ff 40%,#e6f0f8 70%,#f0eef8 100%)',body:'#ecf4f8',orbs:['radial-gradient(circle,#bae6fd,#7dd3fc)','radial-gradient(circle,#a5f3fc,#67e8f9)','radial-gradient(circle,#c7d2fe,#a5b4fc)','radial-gradient(circle,#bae6fd,#93c5fd)','radial-gradient(circle,#a5f3fc,#67e8f9)'],swatch:'linear-gradient(135deg,#7dd3fc,#67e8f9,#a5b4fc)'},
  sage:{name:'Sage',bg:'linear-gradient(135deg,#f0f5ed 0%,#f5f7f0 40%,#eef3ea 70%,#f2f0e8 100%)',body:'#f1f5ee',orbs:['radial-gradient(circle,#bbf7d0,#86efac)','radial-gradient(circle,#d9f99d,#bef264)','radial-gradient(circle,#fef3c7,#fde68a)','radial-gradient(circle,#bbf7d0,#6ee7b7)','radial-gradient(circle,#d9f99d,#a3e635)'],swatch:'linear-gradient(135deg,#86efac,#bef264,#fde68a)'},
  lavender:{name:'Lavender',bg:'linear-gradient(135deg,#f5f0ff 0%,#faf5ff 40%,#f0eaff 70%,#f8f0ff 100%)',body:'#f5f0ff',orbs:['radial-gradient(circle,#e9d5ff,#d8b4fe)','radial-gradient(circle,#f0abfc,#e879f9)','radial-gradient(circle,#c4b5fd,#a78bfa)','radial-gradient(circle,#ddd6fe,#c4b5fd)','radial-gradient(circle,#f0abfc,#d946ef)'],swatch:'linear-gradient(135deg,#d8b4fe,#e879f9,#a78bfa)'},
  golden:{name:'Golden',bg:'linear-gradient(135deg,#fefce8 0%,#fff9e6 40%,#fef5e0 70%,#fefaf0 100%)',body:'#fefce8',orbs:['radial-gradient(circle,#fde68a,#fbbf24)','radial-gradient(circle,#fed7aa,#fb923c)','radial-gradient(circle,#fecaca,#fca5a5)','radial-gradient(circle,#fef3c7,#fcd34d)','radial-gradient(circle,#fed7aa,#f97316)'],swatch:'linear-gradient(135deg,#fbbf24,#fb923c,#fca5a5)'},
  frost:{name:'Frost',bg:'linear-gradient(160deg,#f8f9fc 0%,#f0f2f8 50%,#f5f4fa 100%)',body:'#f6f7fb',orbs:['radial-gradient(circle,rgba(200,210,240,.5),rgba(180,195,230,.3))','radial-gradient(circle,rgba(220,210,240,.4),rgba(200,190,230,.2))','radial-gradient(circle,rgba(200,215,240,.3),rgba(185,200,235,.15))','radial-gradient(circle,rgba(210,210,240,.3),rgba(190,195,230,.15))','radial-gradient(circle,rgba(200,210,235,.3),rgba(180,195,225,.15))'],swatch:'linear-gradient(135deg,#dce3f0,#d0d4e8,#e0ddf0)'},
  rose:{name:'Rose',bg:'linear-gradient(135deg,#fff1f2 0%,#fef2f8 40%,#fce7f3 70%,#fdf2f8 100%)',body:'#fff1f2',orbs:['radial-gradient(circle,#fda4af,#fb7185)','radial-gradient(circle,#f9a8d4,#f472b6)','radial-gradient(circle,#fecdd3,#fda4af)','radial-gradient(circle,#fbcfe8,#f9a8d4)','radial-gradient(circle,#fda4af,#e11d48)'],swatch:'linear-gradient(135deg,#fb7185,#f472b6,#fda4af)'},
  clay:{name:'Clay',bg:'linear-gradient(135deg,#faf5f0 0%,#f5ede4 40%,#f8f0ea 70%,#faf6f2 100%)',body:'#f8f4ef',orbs:['radial-gradient(circle,#e8c9a8,#d4a574)','radial-gradient(circle,#f5d0b0,#e8b68a)','radial-gradient(circle,#fde68a,#fbbf24)','radial-gradient(circle,#dfc4a8,#c9a57a)','radial-gradient(circle,#f0d4b8,#dbb88e)'],swatch:'linear-gradient(135deg,#d4a574,#e8b68a,#fbbf24)'},
  austin:{name:'Austin',bg:'linear-gradient(180deg,#9a82b4 0%,#d4899a 40%,#e8a090 100%)',body:'#b488a8',orbs:['none','none','none','none','none'],swatch:'linear-gradient(180deg,#9a82b4,#e09088,#d4899a)',scenic:'austin'},
};
function applyTheme(key,skipSave){
  const t=THEMES[key]||THEMES.peach;
  document.documentElement.style.setProperty('--bg',t.bg);
  if(!cfg.dark){document.body.style.background=t.body;document.body.style.backgroundAttachment='fixed';}
  const orbs=document.querySelectorAll('.bg-canvas .orb');
  orbs.forEach((o,i)=>{if(t.orbs[i])o.style.background=t.orbs[i];});
  const canvas=document.querySelector('.bg-canvas');
  if(canvas){
    canvas.classList.remove('theme-scenic');
    canvas.className.split(' ').filter(c=>c.startsWith('theme-')).forEach(c=>canvas.classList.remove(c));
    if(t.scenic){canvas.classList.add('theme-scenic','theme-'+t.scenic);}
  }
  document.querySelectorAll('.theme-swatch').forEach(s=>{s.classList.toggle('active',s.dataset.theme===key);});
  if(!skipSave){localStorage._dashTheme=key;}
}
function initTheme(){
  let key=localStorage._dashTheme||'peach';
  if(key==='mountains'){key='austin';localStorage._dashTheme=key;}
  applyTheme(key,true);
}
initTheme();
document.addEventListener('DOMContentLoaded',()=>{
  const picker=document.getElementById('themePicker');if(!picker)return;
  const cur=localStorage._dashTheme||'peach';
  Object.entries(THEMES).forEach(([key,t])=>{
    const s=document.createElement('div');s.className='theme-swatch'+(key===cur?' active':'');s.dataset.theme=key;
    s.style.background=t.swatch;
    s.innerHTML=`<span class="theme-swatch-tip">${t.name}</span>`;
    s.onclick=()=>applyTheme(key);
    picker.appendChild(s);
  });
});

// DARK MODE
// ══════════════════════════════════════════════════════════
function toggleDark(){
  const isDark=document.body.classList.toggle('dark');
  cfg.dark=isDark;save();
  if(!isDark){const key=localStorage._dashTheme||'peach';applyTheme(key,true);}
  else{document.body.style.background='';void document.body.offsetHeight;}
  const ic=document.getElementById('darkToggleIcon');if(ic)ic.textContent=isDark?'☀️':'🌙';
  const lb=document.getElementById('darkToggleLabel');if(lb)lb.textContent=isDark?'Light Mode':'Night Mode';
  if(typeof renderAll==='function')renderAll();
  if(typeof renderGuidePage==='function'&&activePg==='guide')renderGuidePage();
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
  // Separate "handled" sets for WR types: once a rule/rec is encountered in any week
  // (even if not overdue, e.g. already moved to today), stop checking older weeks for it
  const wrRuleHandled=new Set();
  const wrRecHandled=new Set();
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
    // Weekly reset tasks: check all past-week overrides
    {const wkKey=getWkKey(w);
    st.recurring.filter(r=>(r.is_weekly_reset===true||r.is_weekly_reset==='true')&&r._dateOverrides&&r._dateOverrides[wkKey]&&r._dateOverrides[wkKey]!=='__skip__'&&!wrRecHandled.has(String(r.id))).forEach(r=>{
      if(r._dateOverrides[wkKey]<=today)wrRecHandled.add(String(r.id));// only block older-week lookback when date is today or past (not future)
      if(!(r._doneByWk&&r._doneByWk[wkKey])&&r._dateOverrides[wkKey]<today&&!seen.has('wrec-'+r.id)){seen.add('wrec-'+r.id);out.push({id:'rec-virt-'+r.id,name:r.name,category:'Recurring',due_date:r._dateOverrides[wkKey],done:false,_recId:r.id,_virtual:true,_wkKey:wkKey,_isWrec:true});}
    });
    // WR rules: check all past-week overrides
    st.wrRules.filter(r=>r._dateOverrides&&r._dateOverrides[wkKey]&&r._dateOverrides[wkKey]!=='__skip__'&&!wrRuleHandled.has(String(r.id))&&!(st.wrOverrides||[]).some(o=>String(o.rule_id)===String(r.id)&&o.wk_key===wkKey&&o.override_type==='skip')).forEach(r=>{
      if(r._dateOverrides[wkKey]<=today)wrRuleHandled.add(String(r.id));// only block older-week lookback when date is today or past (not future)
      if(!isDoneWRRule(r.id,wkKey)&&r._dateOverrides[wkKey]<today&&!seen.has('wrrule-'+r.id)){seen.add('wrrule-'+r.id);out.push({id:'wrrule-virt-'+r.id,name:r.name,category:'Recurring',due_date:r._dateOverrides[wkKey],done:false,_ruleId:r.id,_virtual:true,_wkKey:wkKey,_isWrRule:true});}
    });}
  }
  return out;
}
function getOvShopping(){
  const today=tod();
  return st.shopping.filter(s=>!s.done&&s.due_date&&s.due_date.split('T')[0]<today);
}
function updateOvBanner(){
  if(!_firstSyncDone){document.getElementById('ovBanner').classList.remove('show');return;}
  if(dayOff!==0){document.getElementById('ovBanner').classList.remove('show');return;}
  const today=tod();
  const ovTasks=st.tasks.filter(t=>!t.done&&t.due_date&&t.due_date.split('T')[0]<today&&t.category!=='Weekly Goals');
  const ovRec=getOvRecurring();
  const ovShop=getOvShopping();
  const ovPup=(st.pupSessions||[]).filter(s=>!s.done&&s.day_date&&s.day_date<today);
  const _ovVdm=_vidDayMap();const ovVid=(st.videos||[]).filter(v=>!v.is_deleted&&v.status!=='published'&&_ovVdm[String(v.id)]&&_ovVdm[String(v.id)]<today);
  // Overdue vidsteps: daymap entries on past days + orphaned blocks on past days
  let ovVidStepCount=0;
  if(typeof _vidStepDayMap==='function'){
    const _ovsm=_vidStepDayMap();const _ovsSeen=new Set();
    Object.entries(_ovsm).forEach(([key,val])=>{if(val.ds>=today||val.done)return;const[vidId,step]=key.split('::');const v=(st.videos||[]).find(x=>String(x.id)===String(vidId)&&!x.is_deleted);if(!v||v[step]==='na'||v[step]==='done')return;ovVidStepCount++;_ovsSeen.add(key);});
    (st.blocks||[]).filter(bl=>bl._vidStepVid&&bl._vidStepName&&bl.ds<today&&!bl._done&&bl._vidStepName!=='step_thumbnail'&&bl._vidStepName!=='step_description').forEach(bl=>{const key=bl._vidStepVid+'::'+bl._vidStepName;if(_ovsSeen.has(key))return;_ovsSeen.add(key);const v=(st.videos||[]).find(x=>String(x.id)===String(bl._vidStepVid)&&!x.is_deleted);if(!v||v[bl._vidStepName]==='na'||v[bl._vidStepName]==='done')return;ovVidStepCount++;});
  }
  const total=ovTasks.length+ovRec.length+ovShop.length+ovPup.length+ovVid.length+ovVidStepCount;
  const banner=document.getElementById('ovBanner');
  if(total>0){
    document.getElementById('ovBannerTxt').textContent=`${total} Overdue`;
    banner.classList.add('show');
  } else {
    banner.classList.remove('show');
  }
}
async function rolloverOverdue(){
  const today=tod();
  const ovTasks=st.tasks.filter(t=>!t.done&&t.due_date&&t.due_date.split('T')[0]<today&&t.category!=='Weekly Goals');
  const ovRec=getOvRecurring();
  const ovShop=getOvShopping();
  const ovPup=(st.pupSessions||[]).filter(s=>!s.done&&s.day_date&&s.day_date<today);
  const _roVdm=_vidDayMap();const ovVid=(st.videos||[]).filter(v=>!v.is_deleted&&v.status!=='published'&&_roVdm[String(v.id)]&&_roVdm[String(v.id)]<today);
  // Overdue vidsteps: collect daymap entries + orphaned blocks on past days
  const _roVsm=typeof _vidStepDayMap==='function'?_vidStepDayMap():{};
  const _roVsKeys=[];const _roVsSeen=new Set();
  Object.entries(_roVsm).forEach(([key,val])=>{if(val.ds>=today||val.done)return;const[vidId,step]=key.split('::');const v=(st.videos||[]).find(x=>String(x.id)===String(vidId)&&!x.is_deleted);if(!v||v[step]==='na'||v[step]==='done')return;_roVsKeys.push(key);_roVsSeen.add(key);});
  const _roVsBlocks=(st.blocks||[]).filter(bl=>bl._vidStepVid&&bl._vidStepName&&bl.ds<today&&!bl._done).filter(bl=>{const key=bl._vidStepVid+'::'+bl._vidStepName;if(_roVsSeen.has(key))return false;const v=(st.videos||[]).find(x=>String(x.id)===String(bl._vidStepVid)&&!x.is_deleted);return v&&v[bl._vidStepName]!=='na'&&v[bl._vidStepName]!=='done';});
  if(!ovTasks.length&&!ovRec.length&&!ovShop.length&&!ovPup.length&&!ovVid.length&&!_roVsKeys.length&&!_roVsBlocks.length)return;
  const prevDates=ovTasks.map(t=>({id:String(t.id),date:t.due_date}));
  const prevRecWkKeys=ovRec.map(v=>{
    const prevDate=v._ruleId
      ?(st.wrRules.find(x=>String(x.id)===String(v._ruleId))?._dateOverrides?.[v._wkKey]||null)
      :(st.recurring.find(x=>String(x.id)===String(v._recId))?._dateOverrides?.[v._wkKey]||null);
    return{recId:v._recId,ruleId:v._ruleId,wkKey:v._wkKey,prevDate};
  });
  const prevShopDates=ovShop.map(s=>({id:String(s.id),date:s.due_date}));
  const prevPupDates=ovPup.map(s=>({id:String(s.id),date:s.day_date}));
  ovTasks.forEach(t=>{t.due_date=today;const sid=String(t.id);localOverrides[sid]={due_date:today};pendingLocal.add(sid);});
  ovRec.forEach(v=>{
    if(v._ruleId){const r=st.wrRules.find(x=>String(x.id)===String(v._ruleId));if(!r)return;if(!r._dateOverrides)r._dateOverrides={};r._dateOverrides[v._wkKey]=today;}
    else{const r=st.recurring.find(x=>String(x.id)===String(v._recId));if(!r)return;if(!r._dateOverrides)r._dateOverrides={};r._dateOverrides[v._wkKey]=today;}
  });
  ovShop.forEach(s=>{s.due_date=today;});
  ovPup.forEach(s=>{s.day_date=today;});
  const prevVidDates=ovVid.map(v=>({id:String(v.id),date:_roVdm[String(v.id)]}));
  ovVid.forEach(v=>{_roVdm[String(v.id)]=today;});_vidDayMapSet(_roVdm);
  // Rollover vidstep daymap entries to today
  const _prevVsMap=_roVsKeys.map(k=>({key:k,prev:{..._roVsm[k]}}));
  _roVsKeys.forEach(k=>{_roVsm[k].ds=today;});
  if(_roVsKeys.length&&typeof _vidStepDayMapSet==='function')_vidStepDayMapSet(_roVsm);
  // Rollover orphaned vidstep blocks to today
  const _prevVsBlks=_roVsBlocks.map(bl=>({id:bl.id,ds:bl.ds}));
  _roVsBlocks.forEach(bl=>{bl.ds=today;sbUpdateBlock(bl.id,{day_date:today});});
  // Also move blocks that match rolled-over daymap entries
  _roVsKeys.forEach(k=>{const[vidId,step]=k.split('::');(st.blocks||[]).filter(bl=>String(bl._vidStepVid)===String(vidId)&&bl._vidStepName===step&&bl.ds<today&&!bl._done).forEach(bl=>{_prevVsBlks.push({id:bl.id,ds:bl.ds});bl.ds=today;sbUpdateBlock(bl.id,{day_date:today});});});
  renderAll();
  const total=ovTasks.length+ovRec.length+ovShop.length+ovPup.length+ovVid.length+_roVsKeys.length+_roVsBlocks.length;
  pushUndo(()=>{
    prevDates.forEach(({id,date})=>{const t=st.tasks.find(x=>String(x.id)===id);if(t)t.due_date=date;});
    prevRecWkKeys.forEach(({recId,ruleId,wkKey,prevDate})=>{if(ruleId){const r=st.wrRules.find(x=>String(x.id)===String(ruleId));if(r){if(!r._dateOverrides)r._dateOverrides={};if(prevDate)r._dateOverrides[wkKey]=prevDate;else delete r._dateOverrides[wkKey];}}else{const r=st.recurring.find(x=>String(x.id)===String(recId));if(r){if(!r._dateOverrides)r._dateOverrides={};if(prevDate)r._dateOverrides[wkKey]=prevDate;else delete r._dateOverrides[wkKey];}}});
    prevShopDates.forEach(({id,date})=>{const s=st.shopping.find(x=>String(x.id)===id);if(s)s.due_date=date;});
    prevPupDates.forEach(({id,date})=>{const s=(st.pupSessions||[]).find(x=>String(x.id)===id);if(s)s.day_date=date;});
    prevVidDates.forEach(({id,date})=>{const m=_vidDayMap();if(date)m[id]=date;else delete m[id];_vidDayMapSet(m);});
    // Undo vidstep rollover
    if(_prevVsMap.length&&typeof _vidStepDayMap==='function'){const m=_vidStepDayMap();_prevVsMap.forEach(({key,prev})=>{m[key]=prev;});_vidStepDayMapSet(m);}
    _prevVsBlks.forEach(({id,ds})=>{const bl=st.blocks.find(x=>x.id===id);if(bl){bl.ds=ds;sbUpdateBlock(bl.id,{day_date:ds});}});
    renderAll();
    prevDates.forEach(({id,date})=>sbReq('PATCH','tasks',{due_date:date},`?id=eq.${id}`));
    prevShopDates.forEach(({id,date})=>sbReqNullable('PATCH','shopping_list',{due_date:date||null},`?id=eq.${id}`));
    prevPupDates.forEach(({id,date})=>sbReqSilent('PATCH','pup_skill_sessions',{day_date:date},`?id=eq.${id}`));
    const _undoRecsToPatch=[...new Set(prevRecWkKeys.filter(v=>!v.ruleId).map(v=>v.recId))];
    const _undoRulesToPatch=[...new Set(prevRecWkKeys.filter(v=>v.ruleId).map(v=>v.ruleId))];
    _undoRecsToPatch.forEach(rid=>{const r=st.recurring.find(x=>String(x.id)===String(rid));if(r)sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id));});
    _undoRulesToPatch.forEach(rid=>{const r=st.wrRules.find(x=>String(x.id)===String(rid));if(r)sbReqSilent('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},`?id=eq.${rid}`);});
  },'Rolled over '+total+' item'+(total>1?'s':''));
  save();
  const recsToPatch=[...new Set(ovRec.filter(v=>!v._ruleId).map(v=>v._recId))];
  const rulesToPatch=[...new Set(ovRec.filter(v=>v._ruleId).map(v=>v._ruleId))];
  await Promise.all([
    ...ovTasks.map(t=>sbReq('PATCH','tasks',{due_date:today},`?id=eq.${t.id}`).then(()=>{const sid=String(t.id);delete localOverrides[sid];pendingLocal.delete(sid);})),
    ...ovShop.map(s=>sbReqNullable('PATCH','shopping_list',{due_date:today},`?id=eq.${s.id}`)),
    ...recsToPatch.map(rid=>{const r=st.recurring.find(x=>String(x.id)===String(rid));return r?sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id)):Promise.resolve();}),
    ...rulesToPatch.map(rid=>{const r=st.wrRules.find(x=>String(x.id)===String(rid));return r?sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},recQs(r.id)):Promise.resolve();}),
    ...ovPup.map(s=>sbReqSilent('PATCH','pup_skill_sessions',{day_date:today},`?id=eq.${s.id}`))
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
  shopSortMode=shopSortMode==='store'?'alpha':shopSortMode==='alpha'?'manual':'store';
  document.getElementById('shopSortBtn').textContent=shopSortMode==='store'?'By store':shopSortMode==='alpha'?'A → Z':'Manual';
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

// ── Quick Notes (Supabase-backed) ──
let _qnOpen=false,_qnNotes=[],_qnLoaded=false,_qnSel=new Set(),_qnLastSel=null;
async function _qnFetch(){
  if(_qnLoaded)return;
  const rows=await sbReqSilent('GET','quick_notes',null,'?is_visible=is.true&order=sort_order.asc.nullslast,created_at.asc');
  if(rows&&Array.isArray(rows)){_qnNotes=rows;_qnLoaded=true;}
}
function toggleQN(){
  _qnOpen=!_qnOpen;
  document.getElementById('qnPanel').classList.toggle('open',_qnOpen);
  if(_qnOpen){_qnHistOpen=false;const hl=document.getElementById('qnHistList');if(hl)hl.style.display='none';const ql=document.getElementById('qnList');if(ql)ql.style.display='';const hb=document.querySelector('.qn-hist-btn');if(hb)hb.classList.remove('active');_qnFetch().then(()=>{renderQN();});requestAnimationFrame(()=>{const inp=document.getElementById('qnInput');if(inp)inp.focus();});}
  else{const inp=document.getElementById('qnInput');if(inp)inp.blur();}
}
function renderQN(){
  const el=document.getElementById('qnList');
  if(!el)return;
  if(!_qnNotes.length){el.innerHTML='<div class="qn-empty">No notes yet</div>';return;}
  el.innerHTML=_qnNotes.map((n,i)=>`
    <div class="qn-item${_qnSel.has(String(n.id))?' qn-selected':''}" data-qnid="${n.id}" data-qnidx="${i}" onmousedown="_qnDragStart(event,${i})" onclick="_qnSelect(event,'${n.id}')">
      <div class="qn-bullet"></div>
      <span class="qn-text" ondblclick="editQN(this,'${n.id}')">${escHtml(n.note_text)}</span>
      <button class="qn-del" onclick="event.stopPropagation();deleteQN('${n.id}')" title="Remove">✕</button>
    </div>`).join('');
}
function escHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}

// Auto-capitalize first letter + bullet formatting
document.addEventListener('input',e=>{
  const el=e.target;
  if(!el.matches('input[type="text"],input:not([type]),textarea'))return;
  // Skip search/filter inputs
  if(el.classList.contains('rec-search')||el.id==='grocRecipeSearch')return;
  const val=el.value;
  // Auto-capitalize: first char, after ". ", after newline
  if(val.length===1&&/[a-z]/.test(val)){el.value=val.toUpperCase();return;}
  if(el.tagName==='TEXTAREA'){
    const pos=el.selectionStart;
    // After newline — capitalize
    if(pos>=2&&val[pos-2]==='\n'&&/[a-z]/.test(val[pos-1])){
      el.value=val.slice(0,pos-1)+val[pos-1].toUpperCase()+val.slice(pos);
      el.setSelectionRange(pos,pos);
    }
    // After ". " — capitalize
    if(pos>=3&&val[pos-3]==='.'&&val[pos-2]===' '&&/[a-z]/.test(val[pos-1])){
      el.value=val.slice(0,pos-1)+val[pos-1].toUpperCase()+val.slice(pos);
      el.setSelectionRange(pos,pos);
    }
  }
},{capture:true});

// Bullet: "- " at start of line → "• " + auto-cap after bullet
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.tagName!=='TEXTAREA')return;
  const pos=el.selectionStart;
  let val=el.value;
  // Check if "- " was just typed at start of line
  if(pos>=2&&val[pos-2]==='-'&&val[pos-1]===' '){
    const lineStart=val.lastIndexOf('\n',pos-3)+1;
    if(pos-2===lineStart){
      el.value=val.slice(0,pos-2)+'• '+val.slice(pos);
      el.setSelectionRange(pos,pos);
      return;
    }
  }
  // Auto-capitalize after "• "
  val=el.value;
  if(pos>=3&&val[pos-3]==='•'&&val[pos-2]===' '&&/[a-z]/.test(val[pos-1])){
    el.value=val.slice(0,pos-1)+val[pos-1].toUpperCase()+val.slice(pos);
    el.setSelectionRange(pos,pos);
  }
},{capture:true});

// Bullet continuation: Enter after a bullet line creates new bullet
document.addEventListener('keydown',e=>{
  const el=e.target;
  if(el.tagName!=='TEXTAREA'||e.key!=='Enter')return;
  const pos=el.selectionStart;
  const val=el.value;
  const lineStart=val.lastIndexOf('\n',pos-1)+1;
  const line=val.slice(lineStart,pos);
  if(line.startsWith('• ')&&line.trim()!=='•'){
    e.preventDefault();
    el.value=val.slice(0,pos)+'\n• '+val.slice(pos);
    const np=pos+3;
    el.setSelectionRange(np,np);
    el.dispatchEvent(new Event('input',{bubbles:true}));
  } else if(line.trim()==='•'){
    // Empty bullet — remove it instead
    e.preventDefault();
    el.value=val.slice(0,lineStart)+val.slice(pos);
    el.setSelectionRange(lineStart,lineStart);
    el.dispatchEvent(new Event('input',{bubbles:true}));
  }
},{capture:true});

async function addQN(){
  const inp=document.getElementById('qnInput');
  const txt=(inp?.value||'').trim();
  if(!txt)return;
  inp.value='';inp.focus();
  const maxSort=_qnNotes.reduce((m,n)=>Math.max(m,n.sort_order||0),0);
  const tmp={id:'qn-'+Date.now(),note_text:txt,is_visible:true,sort_order:maxSort+1};
  _qnNotes.push(tmp);renderQN();
  const list=document.getElementById('qnList');if(list)list.scrollTop=9999;
  const sv=await sbReqSilent('POST','quick_notes',{note_text:txt,sort_order:maxSort+1});
  if(sv&&sv[0]){const ix=_qnNotes.findIndex(n=>n.id===tmp.id);if(ix>-1)_qnNotes[ix]=sv[0];
    renderQN();
    const realId=sv[0].id;
    pushUndo(()=>{_qnNotes=_qnNotes.filter(n=>String(n.id)!==String(realId));renderQN();sbReqSilent('PATCH','quick_notes',{is_visible:false},`?id=eq.${realId}`);},'Add note');
  } else {showToast('Note failed to save!','#ef4444',3000);}
}
function editQN(span,id){
  const orig=span.textContent;
  span.style.display='block';span.contentEditable='true';span.focus();
  const sel=window.getSelection();sel.selectAllChildren(span);sel.collapseToEnd();
  let saved=false;
  const done=()=>{
    if(saved)return;saved=true;
    span.contentEditable='false';span.style.display='';span.onblur=null;span.onkeydown=null;
    const txt=span.textContent.trim();
    if(!txt||txt===orig){span.textContent=orig;return;}
    const n=_qnNotes.find(n=>String(n.id)===String(id));
    if(n)n.note_text=txt;
    if(!String(id).startsWith('qn-')){sbReqSilent('PATCH','quick_notes',{note_text:txt},`?id=eq.${id}`).then(r=>{if(!r)showToast('Edit failed to save!','#ef4444',3000);});
      pushUndo(()=>{const n2=_qnNotes.find(x=>String(x.id)===String(id));if(n2)n2.note_text=orig;renderQN();sbReqSilent('PATCH','quick_notes',{note_text:orig},`?id=eq.${id}`);},'Edit note');
    } else {showToast('Note not saved yet — try again','#f59e0b',3000);}
  };
  span.onblur=done;
  span.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();span.blur();}if(e.key==='Escape'){span.textContent=orig;span.blur();}};
}
function _qnSelect(e,id){
  if(e.target.closest('.qn-del,.qn-text[contenteditable="true"]'))return;
  const inp=document.getElementById('qnInput');if(inp&&document.activeElement===inp)inp.blur();
  const sid=String(id);
  if(e.metaKey||e.ctrlKey){
    if(_qnSel.has(sid))_qnSel.delete(sid);else _qnSel.add(sid);
    _qnLastSel=sid;
  }else if(e.shiftKey&&_qnLastSel){
    const ids=_qnNotes.map(n=>String(n.id));
    const a=ids.indexOf(_qnLastSel),b=ids.indexOf(sid);
    if(a>-1&&b>-1){const lo=Math.min(a,b),hi=Math.max(a,b);ids.slice(lo,hi+1).forEach(x=>_qnSel.add(x));}
  }else{
    _qnSel.clear();_qnSel.add(sid);_qnLastSel=sid;
  }
  _qnApplySelHighlight();
}
function _qnApplySelHighlight(){
  document.querySelectorAll('.qn-item').forEach(el=>{
    el.classList.toggle('qn-selected',_qnSel.has(el.dataset.qnid));
  });
}
function _qnDeleteSelected(){
  if(!_qnSel.size)return;
  const removed=[];
  _qnSel.forEach(sid=>{
    const idx=_qnNotes.findIndex(n=>String(n.id)===sid);
    if(idx>-1){removed.push({note:_qnNotes[idx],idx});_qnNotes.splice(idx,1);}
    if(!sid.startsWith('qn-'))sbReqSilent('PATCH','quick_notes',{is_visible:false,hidden_at:new Date().toISOString()},`?id=eq.${sid}`);
  });
  _qnSel.clear();_qnLastSel=null;renderQN();
  if(removed.length)pushUndo(()=>{removed.sort((a,b)=>a.idx-b.idx).forEach(({note,idx})=>{_qnNotes.splice(idx,0,note);if(!String(note.id).startsWith('qn-'))sbReqSilent('PATCH','quick_notes',{is_visible:true,hidden_at:null},`?id=eq.${note.id}`);});renderQN();},'Delete notes');
}
function _qnDragStart(e,idx){
  if(e.target.closest('.qn-del,.qn-text[contenteditable="true"]'))return;
  e.preventDefault();
  const list=document.getElementById('qnList');
  const items=[...list.querySelectorAll('.qn-item')];
  const dragged=items[idx];
  let moved=false,dropIdx=idx;
  const startY=e.clientY;
  const onMove=ev=>{
    if(!moved&&Math.abs(ev.clientY-startY)<4)return;
    if(!moved){moved=true;dragged.classList.add('qn-dragging');}
    let ph=list.querySelector('.qn-drop-line');
    if(!ph){ph=document.createElement('div');ph.className='qn-drop-line';list.appendChild(ph);}
    const rows=[...list.querySelectorAll('.qn-item')];
    let inserted=false;dropIdx=rows.length;
    for(let i=0;i<rows.length;i++){
      const rc=rows[i].getBoundingClientRect();
      if(ev.clientY<rc.top+rc.height/2){list.insertBefore(ph,rows[i]);dropIdx=i;inserted=true;break;}
    }
    if(!inserted&&rows.length)rows[rows.length-1].after(ph);
  };
  const onUp=()=>{
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    dragged.classList.remove('qn-dragging');
    const ph=list.querySelector('.qn-drop-line');if(ph)ph.remove();
    if(!moved||dropIdx===idx)return;
    const prevOrder=_qnNotes.map(n=>({id:n.id,sort_order:n.sort_order}));
    const note=_qnNotes.splice(idx,1)[0];
    const ins=dropIdx>idx?dropIdx-1:dropIdx;
    _qnNotes.splice(ins,0,note);
    _qnNotes.forEach((n,i)=>{n.sort_order=i;});
    renderQN();
    _qnNotes.forEach(n=>{if(!String(n.id).startsWith('qn-'))sbReqSilent('PATCH','quick_notes',{sort_order:n.sort_order},`?id=eq.${n.id}`);});
    pushUndo(()=>{prevOrder.forEach(p=>{const n=_qnNotes.find(x=>String(x.id)===String(p.id));if(n)n.sort_order=p.sort_order;});_qnNotes.sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));renderQN();_qnNotes.forEach(n=>{if(!String(n.id).startsWith('qn-'))sbReqSilent('PATCH','quick_notes',{sort_order:n.sort_order},`?id=eq.${n.id}`);});},'Reorder note');
  };
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onUp);
}
async function deleteQN(id){
  const removed=_qnNotes.find(n=>String(n.id)===String(id));
  const removedIdx=_qnNotes.indexOf(removed);
  _qnNotes=_qnNotes.filter(n=>String(n.id)!==String(id));
  renderQN();
  if(!String(id).startsWith('qn-')){
    await sbReqSilent('PATCH','quick_notes',{is_visible:false,hidden_at:new Date().toISOString()},`?id=eq.${id}`);
    if(removed)pushUndo(()=>{_qnNotes.splice(removedIdx,0,removed);renderQN();sbReqSilent('PATCH','quick_notes',{is_visible:true,hidden_at:null},`?id=eq.${id}`);},'Delete note');
  }
}
let _qnHistOpen=false;
async function toggleQNHist(){
  _qnHistOpen=!_qnHistOpen;
  const list=document.getElementById('qnList');
  const hist=document.getElementById('qnHistList');
  const btn=document.querySelector('.qn-hist-btn');
  if(btn)btn.classList.toggle('active',_qnHistOpen);
  if(_qnHistOpen){
    list.style.display='none';hist.style.display='';
    const rows=await sbReqSilent('GET','quick_notes',null,'?is_visible=is.false&order=hidden_at.desc.nullslast&limit=50');
    if(!rows||!rows.length){hist.innerHTML='<div class="qn-empty">No history</div>';return;}
    hist.innerHTML=rows.map(n=>`
      <div class="qn-hist-item" onclick="restoreQN(${n.id})">
        <div class="qn-bullet"></div>
        <span class="qn-hist-text">${escHtml(n.note_text)}</span>
        <button class="qn-hist-restore" title="Restore">+ Add</button>
      </div>`).join('');
  }else{
    list.style.display='';hist.style.display='none';
  }
}
async function restoreQN(id){
  await sbReqSilent('PATCH','quick_notes',{is_visible:true,hidden_at:null},`?id=eq.${id}`);
  const rows=await sbReqSilent('GET','quick_notes',null,'?id=eq.'+id);
  if(rows&&rows[0]){
    const restored=rows[0];
    _qnNotes.push(restored);_qnNotes.sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));renderQN();
    pushUndo(()=>{
      _qnNotes=_qnNotes.filter(n=>String(n.id)!==String(id));renderQN();
      sbReqSilent('PATCH','quick_notes',{is_visible:false,hidden_at:new Date().toISOString()},`?id=eq.${id}`);
      if(_qnHistOpen)toggleQNHist().then(()=>toggleQNHist());
    },'Restore note');
  }
  // Remove from history list
  const el=document.querySelector(`.qn-hist-item[onclick="restoreQN(${id})"]`);
  if(el)el.remove();
  if(!document.querySelectorAll('.qn-hist-item').length){
    const hist=document.getElementById('qnHistList');if(hist)hist.innerHTML='<div class="qn-empty">No history</div>';
  }
  showToast('Note restored','var(--accent)',1500);
}
// Close panel on outside click; clear selection on click outside notes
document.addEventListener('click',function(e){
  if(_qnOpen&&!e.target.closest('#qnPanel')&&!e.target.closest('#qnBtn')){_qnOpen=false;_qnSel.clear();document.getElementById('qnPanel').classList.remove('open');const inp=document.getElementById('qnInput');if(inp)inp.blur();}
  if(_qnOpen&&_qnSel.size&&e.target.closest('#qnPanel')&&!e.target.closest('.qn-item')){_qnSel.clear();_qnApplySelHighlight();}
});
// Quick notes keyboard handlers
document.addEventListener('keydown',function(e){
  if(!_qnOpen)return;
  if(e.target.closest('.qn-text[contenteditable="true"]'))return;
  // Delete/Backspace: archive selected notes
  if((e.key==='Delete'||e.key==='Backspace')&&_qnSel.size&&document.activeElement?.id!=='qnInput'){e.preventDefault();_qnDeleteSelected();return;}
  // Cmd+C: copy selected notes
  if((e.metaKey||e.ctrlKey)&&e.key==='c'&&_qnSel.size){
    const txt=[..._qnSel].map(id=>{const n=_qnNotes.find(x=>String(x.id)===id);return n?n.note_text:'';}).filter(Boolean).join('\n');
    if(txt)navigator.clipboard.writeText(txt);return;
  }
  // Cmd+A: select all notes
  if((e.metaKey||e.ctrlKey)&&e.key==='a'&&document.activeElement?.id!=='qnInput'){e.preventDefault();_qnSel.clear();_qnNotes.forEach(n=>_qnSel.add(String(n.id)));_qnApplySelHighlight();return;}
  // Enter: close when input empty and not focused on input
  if(e.key==='Enter'){
    if(document.activeElement&&document.activeElement.id==='qnInput')return;
    e.preventDefault();_qnOpen=false;document.getElementById('qnPanel').classList.remove('open');
  }
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

// ── Keyboard shortcuts ──────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  const tag=document.activeElement?.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||document.activeElement?.isContentEditable)return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==='n'){if(typeof _vidOvAllOpen!=='undefined'&&_vidOvAllOpen)return;e.preventDefault();openQA('today',null,d2s(getDayDate(dayOff)));}
  if(e.key==='r'){e.preventDefault();location.reload();}
  if(e.key==='s'&&activePg==='overview'){e.preventDefault();const gm=document.getElementById('groceryModal');if(gm&&gm.open)gm.close();else openGroceryModal();}
});
// Arrow keys: move selected TB blocks ±30 min
window.addEventListener('keydown',e=>{
  if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;
  if(!document.querySelector('.tb-col')||!selectedTasks.size)return;
  const tag=document.activeElement?.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||document.activeElement?.isContentEditable)return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  e.preventDefault();
  const dm=e.key==='ArrowUp'?-30:30;
  const ds=d2s(getDayDate(dayOff));
  const _sm2t=sm=>`${String(Math.floor(sm/60)).padStart(2,'0')}:${String(sm%60).padStart(2,'0')}:00`;
  // Regular TB blocks
  const selBlks=(st.blocks||[]).filter(b=>{if(b.ds!==ds)return false;const sid=typeof _getTBBlockSelId==='function'?_getTBBlockSelId(b):null;return sid&&selectedTasks.has(sid);});
  // Auto-blocks
  const selAtbIds=[...selectedTasks].filter(id=>id.startsWith('atb::')).map(id=>id.replace('atb::',''));
  const allAtbs=typeof getAutoTBForDate==='function'?getAutoTBForDate(ds):[];
  const selAtbs=allAtbs.filter(a=>selAtbIds.includes(a._atbId));
  if(!selBlks.length&&!selAtbs.length)return;
  // Snapshots for undo (capture pre-move state)
  const blkSnaps=selBlks.map(b=>({b,prevSm:b.sm}));
  const atbSnaps=selAtbs.map(a=>({atbId:a._atbId,prevSm:a.sm,dur:a.dur,hadOv:!!st.autoTBOverrides.find(o=>String(o.base_id)===a._atbId&&o.date===ds)}));
  // Move regular blocks
  selBlks.forEach(b=>{b.sm=Math.max(HOURS[0]*60,Math.min(HOURS[HOURS.length-1]*60,b.sm+dm));sbUpdateBlock(b.id,{start_minutes:b.sm});});
  // Move auto-blocks via overrides
  selAtbs.forEach(a=>{
    a.sm=Math.max(HOURS[0]*60,Math.min(HOURS[HOURS.length-1]*60,a.sm+dm));
    const ns2=_sm2t(a.sm),ne2=_sm2t(a.sm+a.dur);
    const curOv=st.autoTBOverrides.find(o=>String(o.base_id)===a._atbId&&o.date===ds);
    if(curOv){curOv.start_time=ns2;curOv.end_time=ne2;sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:ns2,end_time:ne2},`?id=eq.${curOv.id}`);}
    else{const pl={base_id:a._atbId,date:ds,start_time:ns2,end_time:ne2};const tid='atbov-tmp-'+Date.now();st.autoTBOverrides.push({...pl,id:tid});sbReqSilent('POST','auto_timeblock_overrides',pl,'').then(res=>{if(res&&res[0]){const i=st.autoTBOverrides.findIndex(o=>String(o.id)===tid);if(i>-1)st.autoTBOverrides[i]=res[0];}save();});}
  });
  save();
  if(document.getElementById('tbGrid'))renderDayTB();
  // Undo: restore all positions using base_id+date lookup (works even after re-renders)
  pushUndo(()=>{
    blkSnaps.forEach(({b,prevSm})=>{b.sm=prevSm;sbUpdateBlock(b.id,{start_minutes:prevSm});});
    atbSnaps.forEach(({atbId,prevSm,dur,hadOv})=>{
      const ps2=_sm2t(prevSm),pe2=_sm2t(prevSm+dur);
      const curOv=st.autoTBOverrides.find(o=>String(o.base_id)===atbId&&o.date===ds);
      if(curOv){if(!hadOv){st.autoTBOverrides=st.autoTBOverrides.filter(o=>o!==curOv);sbReqSilent('DELETE','auto_timeblock_overrides',null,`?id=eq.${curOv.id}`);}else{curOv.start_time=ps2;curOv.end_time=pe2;sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:ps2,end_time:pe2},`?id=eq.${curOv.id}`);}}
    });
    save();
    if(document.getElementById('tbGrid'))renderDayTB();
  },'Moved blocks');
},{capture:true});
// Cmd/Ctrl+Arrow: resize selected TB blocks ±30 min
window.addEventListener('keydown',e=>{
  if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;
  if(!(e.metaKey||e.ctrlKey))return;
  if(!document.querySelector('.tb-col')||!selectedTasks.size)return;
  const tag=document.activeElement?.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||document.activeElement?.isContentEditable)return;
  e.preventDefault();
  const dd=e.key==='ArrowUp'?-30:30;
  const ds=d2s(getDayDate(dayOff));
  const _sm2t=sm=>`${String(Math.floor(sm/60)).padStart(2,'0')}:${String(sm%60).padStart(2,'0')}:00`;
  const selBlks=(st.blocks||[]).filter(b=>{if(b.ds!==ds)return false;const sid=typeof _getTBBlockSelId==='function'?_getTBBlockSelId(b):null;return sid&&selectedTasks.has(sid);});
  const selAtbIds=[...selectedTasks].filter(id=>id.startsWith('atb::')).map(id=>id.replace('atb::',''));
  const allAtbs=typeof getAutoTBForDate==='function'?getAutoTBForDate(ds):[];
  const selAtbs=allAtbs.filter(a=>selAtbIds.includes(a._atbId));
  if(!selBlks.length&&!selAtbs.length)return;
  const blkSnaps=selBlks.map(b=>({b,prevDur:b.dur}));
  const atbSnaps=selAtbs.map(a=>({atbId:a._atbId,prevDur:a.dur,hadOv:!!st.autoTBOverrides.find(o=>String(o.base_id)===a._atbId&&o.date===ds)}));
  selBlks.forEach(b=>{b.dur=Math.max(15,b.dur+dd);sbUpdateBlock(b.id,{duration_minutes:b.dur});});
  selAtbs.forEach(a=>{
    a.dur=Math.max(15,a.dur+dd);
    const ns2=_sm2t(a.sm),ne2=_sm2t(a.sm+a.dur);
    const curOv=st.autoTBOverrides.find(o=>String(o.base_id)===a._atbId&&o.date===ds);
    if(curOv){curOv.start_time=ns2;curOv.end_time=ne2;sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:ns2,end_time:ne2},`?id=eq.${curOv.id}`);}
    else{const pl={base_id:a._atbId,date:ds,start_time:ns2,end_time:ne2};const tid='atbov-tmp-'+Date.now();st.autoTBOverrides.push({...pl,id:tid});sbReqSilent('POST','auto_timeblock_overrides',pl,'').then(res=>{if(res&&res[0]){const i=st.autoTBOverrides.findIndex(o=>String(o.id)===tid);if(i>-1)st.autoTBOverrides[i]=res[0];}save();});}
  });
  save();
  if(document.getElementById('tbGrid'))renderDayTB();
  pushUndo(()=>{
    blkSnaps.forEach(({b,prevDur})=>{b.dur=prevDur;sbUpdateBlock(b.id,{duration_minutes:prevDur});});
    atbSnaps.forEach(({atbId,prevDur,hadOv})=>{
      const a2=allAtbs.find(x=>x._atbId===atbId);
      const ps2=_sm2t(a2?a2.sm:0),pe2=_sm2t((a2?a2.sm:0)+prevDur);
      const curOv=st.autoTBOverrides.find(o=>String(o.base_id)===atbId&&o.date===ds);
      if(curOv){if(!hadOv){st.autoTBOverrides=st.autoTBOverrides.filter(o=>o!==curOv);sbReqSilent('DELETE','auto_timeblock_overrides',null,`?id=eq.${curOv.id}`);}else{curOv.start_time=ps2;curOv.end_time=pe2;sbReqSilent('PATCH','auto_timeblock_overrides',{start_time:ps2,end_time:pe2},`?id=eq.${curOv.id}`);}}
    });
    save();if(document.getElementById('tbGrid'))renderDayTB();
  },'Resized blocks');
},{capture:true});
// 'A' key: add auto-blocks in rubber-band range (or all for today) to selection
window.addEventListener('keydown',e=>{
  if(e.key!=='a'&&e.key!=='A')return;
  const tag=document.activeElement?.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||document.activeElement?.isContentEditable)return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(!document.querySelector('.tb-col'))return;
  e.preventDefault();
  const ds=d2s(getDayDate(dayOff));
  const allAtbs=typeof getAutoTBForDate==='function'?getAutoTBForDate(ds):[];
  if(!allAtbs.length)return;
  let targets=allAtbs;
  if(_lastTBRbRange){
    const minSm=HOURS[0]*60+_lastTBRbRange.selTop/PX;
    const maxSm=HOURS[0]*60+_lastTBRbRange.selBot/PX;
    const inRange=allAtbs.filter(a=>a.sm+a.dur>minSm&&a.sm<maxSm);
    if(inRange.length)targets=inRange;
  }
  targets.forEach(a=>selectedTasks.add('atb::'+a._atbId));
  applySelHighlight();
},{capture:true});
