let _pupEditId=null;
function _pupWkDone(skillId){const{mon,sun}=getWkBounds(0);const monDs=d2s(mon),sunDs=d2s(sun);return(st.pupSessions||[]).filter(s=>String(s.skill_id)===String(skillId)&&s.day_date>=monDs&&s.day_date<=sunDs&&s.done).length;}
function _pupWkSessTotal(skillId){const{mon,sun}=getWkBounds(0);const monDs=d2s(mon),sunDs=d2s(sun);return(st.pupSessions||[]).filter(s=>String(s.skill_id)===String(skillId)&&s.day_date>=monDs&&s.day_date<=sunDs).length;}
function _pupAllSess(skillId){return(st.pupSessions||[]).filter(s=>String(s.skill_id)===String(skillId));}
function _pupAllDone(skillId){return _pupAllSess(skillId).filter(s=>s.done).length;}
function _pupAllTotal(skillId){return _pupAllSess(skillId).length;}
function _pupLastPracticed(skillId){const done=_pupAllSess(skillId).filter(s=>s.done).map(s=>s.day_date).sort();return done.length?done[done.length-1]:null;}
function _pupCountBadge(skill){const done=_pupAllDone(skill.id);const total=_pupAllTotal(skill.id);if(!done&&!total)return'';return`<span style="font-size:10px;font-weight:600;color:var(--muted)">${done}/${total}</span>`;}
async function setPupWkDone(skillId,newDone){
  if(newDone<0)newDone=0;
  const{mon,sun}=getWkBounds(0);const monDs=d2s(mon),sunDs=d2s(sun);
  const wkSess=(st.pupSessions||[]).filter(s=>String(s.skill_id)===String(skillId)&&s.day_date>=monDs&&s.day_date<=sunDs);
  const doneSess=wkSess.filter(s=>s.done);
  const today=d2s(new Date());
  if(newDone>doneSess.length){
    const toAdd=newDone-doneSess.length;
    for(let i=0;i<toAdd;i++){
      const undone=wkSess.find(s=>!s.done);
      if(undone){undone.done=true;await sbReqSilent('PATCH','pup_skill_sessions',{done:true},`?id=eq.${undone.id}`);}
      else{const tmp='pss-tmp-'+Date.now()+'-'+i;st.pupSessions.push({id:tmp,skill_id:skillId,day_date:today,done:true});const sv=await sbReqSilent('POST','pup_skill_sessions',{skill_id:skillId,day_date:today,done:true});if(sv&&sv[0]){const ix=st.pupSessions.findIndex(s=>s.id===tmp);if(ix>-1)st.pupSessions[ix]=sv[0];}}
    }
  } else if(newDone<doneSess.length){
    const sorted=[...doneSess].sort((a,b)=>b.day_date.localeCompare(a.day_date));
    const toRemove=doneSess.length-newDone;
    for(let i=0;i<toRemove&&i<sorted.length;i++){const s=sorted[i];st.pupSessions=st.pupSessions.filter(x=>String(x.id)!==String(s.id));await sbReqSilent('DELETE','pup_skill_sessions',null,`?id=eq.${s.id}`);}
  }
  save();renderPupSkillsHighlight();if(document.getElementById('page-pups')?.classList.contains('active'))renderPupsPage();renderToday();renderWkCal();
}
function openPupCountEdit(skillId,anchorEl){
  let pop=document.getElementById('_pupCountPop');
  if(!pop){pop=document.createElement('div');pop.id='_pupCountPop';pop.style.cssText='position:fixed;z-index:9999;background:var(--bg);border:1px solid var(--border);border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.14);padding:10px 12px;font-size:12px;font-family:inherit;min-width:172px';document.body.appendChild(pop);}
  const skill=(st.pup_skills||[]).find(x=>String(x.id)===String(skillId));if(!skill)return;
  const allDone=_pupAllDone(skillId),allTotal=_pupAllTotal(skillId);
  const wkDone=_pupWkDone(skillId),wkTotal=_pupWkSessTotal(skillId);
  const last=_pupLastPracticed(skillId);
  const lastStr=last?new Date(last+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'never';
  const rowS='display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 0';
  const labelS='color:var(--muted);font-size:11px';
  const valS='font-weight:600;font-size:11px;color:var(--text)';
  const divS='border-top:1px solid var(--border);margin:6px 0';
  const inpS='width:44px;padding:2px 5px;border:1px solid var(--border);border-radius:5px;font-family:inherit;font-size:11px;background:var(--bg);color:var(--text);outline:none;text-align:center';
  pop.innerHTML=`<div style="font-size:10px;font-weight:700;color:var(--muted);margin-bottom:7px;text-transform:uppercase;letter-spacing:.05em">${skill.skill}</div><div style="${rowS}"><span style="${labelS}">Total done</span><span style="${valS}">${allDone}</span></div><div style="${rowS}"><span style="${labelS}">Total sessions</span><span style="${valS}">${allTotal}</span></div><div style="${rowS}"><span style="${labelS}">Last practiced</span><span style="${valS}">${lastStr}</span></div><div style="${divS}"></div><div style="${rowS}"><span style="${labelS}">This week</span><span style="${valS}">${wkDone}/${wkTotal}</span></div><div style="${divS}"></div><div style="${rowS}"><span style="${labelS}">Edit this wk done</span><input id="_pcDone" type="number" min="0" value="${wkDone}" style="${inpS}" onkeydown="if(event.key==='Enter'){event.preventDefault();_savePupCountEdit('${skillId}');}if(event.key==='Escape'){event.preventDefault();document.getElementById('_pupCountPop').style.display='none';}"></div><div style="display:flex;gap:5px;margin-top:7px"><button onclick="_savePupCountEdit('${skillId}')" style="flex:1;padding:3px 0;border-radius:6px;border:1px solid var(--border);background:rgba(139,92,246,.12);cursor:pointer;font-size:11px;color:var(--text)">Save</button><button onclick="document.getElementById('_pupCountPop').style.display='none'" style="flex:1;padding:3px 0;border-radius:6px;border:1px solid var(--border);background:transparent;cursor:pointer;font-size:11px;color:var(--muted)">Close</button></div>`;
  pop.style.display='block';
  const rect=anchorEl.getBoundingClientRect?anchorEl.getBoundingClientRect():{left:200,bottom:200};
  let left=rect.left,top=rect.bottom+4;
  if(left+180>window.innerWidth-6)left=window.innerWidth-186;
  if(top+200>window.innerHeight-6)top=rect.top-204;
  pop.style.left=left+'px';pop.style.top=top+'px';
  if(!pop._outsideClick){pop._outsideClick=e=>{if(!pop.contains(e.target)&&e.target!==anchorEl)pop.style.display='none';};document.addEventListener('mousedown',pop._outsideClick);}
}
async function _savePupCountEdit(skillId){
  const doneEl=document.getElementById('_pcDone');
  document.getElementById('_pupCountPop').style.display='none';
  if(doneEl)await setPupWkDone(skillId,parseInt(doneEl.value)||0);
}
let _selSkillKeys=new Set(),_lastSelKey=null,_selPupIds=new Set(),_copiedPups=[],_pupCtxId=null;
let _pupSortCol=null,_pupSortDir=1,_pupFilter=null;
let _pupUndoStack=[],_pupRedoStack=[],_pupHdrClickTimer=null,_pupUndoDirty=false;
let _pupPendingIds=new Set();
function pupSnapshot(){_pupUndoStack.push(JSON.parse(JSON.stringify(st.pup_skills)));if(_pupUndoStack.length>20)_pupUndoStack.shift();_pupRedoStack=[];}
function _pupSyncToServer(prev,next){
  const pm=new Map(prev.map(s=>[String(s.id),s]));
  const nm=new Map(next.map(s=>[String(s.id),s]));
  for(const[id,s]of pm)if(!nm.has(id)&&!id.startsWith('l-'))sbReqSilent('DELETE','pup_skills',null,`?id=eq.${id}`);
  for(const[id,s]of nm){
    if(!pm.has(id)){const d={pup:s.pup,skill:s.skill,level:s.level,stage:s.stage,focus:s.focus,next_step:s.next_step,word:s.word,signal:s.signal,comments:s.comments};_pupPendingIds.add(id);sbReqSilent('POST','pup_skills',d).then(()=>_pupPendingIds.delete(id));}
    else if(!id.startsWith('l-')){const p=pm.get(id);const flds=['pup','skill','level','stage','focus','next_step','word','signal','comments'];if(flds.some(f=>String(p[f]??'')!==String(s[f]??''))){_pupPendingIds.add(id);sbReqSilent('PATCH','pup_skills',{pup:s.pup,skill:s.skill,level:s.level,stage:s.stage,focus:s.focus,next_step:s.next_step,word:s.word,signal:s.signal,comments:s.comments},`?id=eq.${id}`).then(()=>_pupPendingIds.delete(id));}}
  }
}
function pupUndo(){if(!_pupUndoStack.length){showToast('Nothing to undo','#888');return;}const prev=JSON.parse(JSON.stringify(st.pup_skills));_pupUndoDirty=true;_pupRedoStack.push(prev);st.pup_skills=_pupUndoStack.pop();save();renderPupsPage();showToast('Undone','#6d5fe6',1500);_pupSyncToServer(prev,st.pup_skills);}
function pupRedo(){if(!_pupRedoStack.length){showToast('Nothing to redo','#888');return;}const prev=JSON.parse(JSON.stringify(st.pup_skills));_pupUndoDirty=true;_pupUndoStack.push(prev);st.pup_skills=_pupRedoStack.pop();save();renderPupsPage();showToast('Redone','#6d5fe6',1500);_pupSyncToServer(prev,st.pup_skills);}
function pupHdrClick(col){clearTimeout(_pupHdrClickTimer);_pupHdrClickTimer=setTimeout(()=>{_pupHdrClickTimer=null;pupSortBy(col);},250);}
function pupHdrDbl(e,col){clearTimeout(_pupHdrClickTimer);_pupHdrClickTimer=null;pupFilterBy(e,col);}
function setPupModalDog(val){
  document.getElementById('pmPup').value=val;
  document.getElementById('pmDogMochi').classList.toggle('active',val==='Mochi');
  document.getElementById('pmDogSunny').classList.toggle('active',val==='Sunny');
  if(_pupEditId){
    const curRec=st.pup_skills.find(x=>x.id==_pupEditId);
    if(curRec&&curRec.pup!==val){
      const other=st.pup_skills.find(s=>s.pup===val&&s.skill===curRec.skill);
      if(other){
        _pupEditId=other.id;
        document.getElementById('pmSkill').value=other.skill||'';
        document.getElementById('pmCategory').value=other.category||'';
        document.getElementById('pmLevel').value=other.level||'';
        document.getElementById('pmStage').value=other.stage||'Not Started';
        document.getElementById('pmOrder').value=other.skill_order||'';
        document.getElementById('pmFocus').checked=(other.focus===true||other.focus==='true');
        document.getElementById('pmNextStep').value=other.next_step||'';
        document.getElementById('pmWord').value=other.word||'';
        document.getElementById('pmSignal').value=other.signal||'';
        document.getElementById('pmComments').value=other.comments||'';
        document.getElementById('pmSkip').checked=(other.skip===true||other.skip==='true');
      }
    }
  }
}
function openPupAddModal(){
  _pupEditId=null;
  document.getElementById('pmPup').value='Mochi';
  document.getElementById('pmDogMochi').classList.add('active');
  document.getElementById('pmDogSunny').classList.remove('active');
  document.getElementById('pmDogToggle').style.display='none';
  document.getElementById('pmBothLabel').style.display='';
  document.getElementById('pmSkipRow').style.display='none';
  document.getElementById('pmSkill').value='';
  document.getElementById('pmCategory').value='';
  document.getElementById('pmLevel').value='';
  document.getElementById('pmStage').value='Not Started';
  document.getElementById('pmOrder').value='';
  document.getElementById('pmFocus').checked=false;
  document.getElementById('pmNextStep').value='';
  document.getElementById('pmWord').value='';
  document.getElementById('pmSignal').value='';
  document.getElementById('pmComments').value='';
  document.getElementById('pmSkip').checked=false;
  document.getElementById('pupModal').classList.add('open');
  setTimeout(()=>document.getElementById('pmSkill').focus(),80);
}
function openPupEditModal(id){
  const s=st.pup_skills.find(x=>x.id==id);if(!s)return;
  _pupEditId=id;
  document.getElementById('pmDogToggle').style.display='';
  document.getElementById('pmBothLabel').style.display='none';
  document.getElementById('pmSkipRow').style.display='';
  setPupModalDog(s.pup||'Mochi');
  document.getElementById('pmSkill').value=s.skill||'';
  document.getElementById('pmCategory').value=s.category||'';
  document.getElementById('pmLevel').value=s.level||'';
  document.getElementById('pmStage').value=s.stage||'Not Started';
  document.getElementById('pmOrder').value=s.skill_order||'';
  document.getElementById('pmFocus').checked=(s.focus===true||s.focus==='true');
  document.getElementById('pmNextStep').value=s.next_step||'';
  document.getElementById('pmWord').value=s.word||'';
  document.getElementById('pmSignal').value=s.signal||'';
  document.getElementById('pmComments').value=s.comments||'';
  document.getElementById('pmSkip').checked=(s.skip===true||s.skip==='true');
  document.getElementById('pupModal').classList.add('open');
  setTimeout(()=>{const _el=document.getElementById('pmSkill');if(_el){_el.focus();const _l=_el.value.length;_el.setSelectionRange(_l,_l);}},80);
}
async function savePupModal(){
  const data={
    pup:document.getElementById('pmPup').value,
    skill:document.getElementById('pmSkill').value.trim(),
    category:document.getElementById('pmCategory').value||null,
    level:document.getElementById('pmLevel').value||null,
    stage:document.getElementById('pmStage').value,
    skill_order:document.getElementById('pmOrder').value?parseInt(document.getElementById('pmOrder').value):null,
    focus:document.getElementById('pmFocus').checked,
    next_step:document.getElementById('pmNextStep').value||null,
    word:document.getElementById('pmWord').value.trim()||null,
    signal:document.getElementById('pmSignal').value.trim()||null,
    comments:document.getElementById('pmComments').value.trim()||null,
    skip:document.getElementById('pmSkip').checked||false,
  };
  if(!data.skill){closeMod('pupModal');return;}
  if(data.focus&&data.stage!=='Mastered')data.stage='In Progress';
  pupSnapshot();
  closeMod('pupModal');
  if(!_pupEditId){
    const tmp=Date.now();
    const recs=[{...data,pup:'Mochi',skip:false,id:'l-'+tmp+'-M'},{...data,pup:'Sunny',skip:false,id:'l-'+tmp+'-S'}];
    recs.forEach(s=>st.pup_skills.push(s));
    save();renderPupsPage();renderPupSkillsHighlight();
    for(const s of recs){
      const sv=await sbReq('POST','pup_skills',{...data,pup:s.pup,skip:false});
      if(sv&&sv[0]){const i=st.pup_skills.findIndex(x=>x.id===s.id);if(i>-1)st.pup_skills[i]=sv[0];save();}
    }
    renderPupsPage();renderPupSkillsHighlight();renderToday();renderWkCal();
  } else {
    const idx=st.pup_skills.findIndex(x=>x.id==_pupEditId);if(idx<0)return;
    const oldSkill=st.pup_skills[idx].skill;
    const prevData={...st.pup_skills[idx]};
    Object.assign(st.pup_skills[idx],data);
    if(data.skill&&data.skill!==oldSkill){st.blocks.filter(b=>b.cat==='pup_session'&&b.title===oldSkill).forEach(b=>{b.title=data.skill;});}
    save();
    if(!document.getElementById('page-pups')?.classList.contains('active')){
      const editId=_pupEditId;
      pushUndo(()=>{
        const i=st.pup_skills.findIndex(x=>String(x.id)===String(editId));if(i<0)return;
        const curSkill=st.pup_skills[i].skill;
        Object.assign(st.pup_skills[i],prevData);
        if(curSkill!==prevData.skill){st.blocks.filter(b=>b.cat==='pup_session'&&b.title===curSkill).forEach(b=>{b.title=prevData.skill;});}
        save();renderPupsPage();renderPupSkillsHighlight();renderToday();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();
        sbReqSilent('PATCH','pup_skills',prevData,`?id=eq.${editId}`);
      },'Edited pup skill');
    }
    await sbReqSilent('PATCH','pup_skills',data,`?id=eq.${_pupEditId}`);
    renderPupsPage();renderPupSkillsHighlight();renderToday();renderWkCal();if(document.getElementById('tbGrid'))renderDayTB();
  }
}
async function setPupField(id,field,val,origVal){
  const normVal=val===''?null:val;
  if(origVal!==undefined&&String(normVal)===String(origVal??''))return;
  const idx=st.pup_skills.findIndex(x=>x.id==id);if(idx<0)return;
  pupSnapshot();
  let sv=val;
  if(field==='success_rate')sv=(val===''||val===null||val===undefined)?null:parseFloat(val)/100;
  else if(field==='focus')sv=!!val;
  else if(val==='')sv=null;
  st.pup_skills[idx][field]=sv;
  const patch={[field]:sv};
  if(field==='focus'&&sv===true&&st.pup_skills[idx].stage!=='Mastered'){
    st.pup_skills[idx].stage='In Progress';patch.stage='In Progress';
  }
  save();
  _pupPendingIds.add(String(id));
  await sbReqSilent('PATCH','pup_skills',patch,`?id=eq.${id}`);
  _pupPendingIds.delete(String(id));
  renderPupsPage();
}
function _syncSelPupIds(){
  _selPupIds.clear();
  [..._selSkillKeys].forEach(key=>{st.pup_skills.filter(s=>s.skill===key).forEach(s=>_selPupIds.add(String(s.id)));});
}
function pupRowClick(e,key){
  if(e.target.closest('input,button'))return;
  if(e.metaKey||e.ctrlKey){
    if(_selSkillKeys.has(key))_selSkillKeys.delete(key);else _selSkillKeys.add(key);
    _lastSelKey=key;
  } else if(e.shiftKey&&_lastSelKey){
    const rows=[...document.querySelectorAll('#pupTblBody tr[data-skillkey]')].map(r=>r.dataset.skillkey);
    const a=rows.indexOf(_lastSelKey),b=rows.indexOf(key);
    if(a>-1&&b>-1){const lo=Math.min(a,b),hi=Math.max(a,b);rows.slice(lo,hi+1).forEach(k=>_selSkillKeys.add(k));}
    else _selSkillKeys.add(key);
    _lastSelKey=key;
  } else {
    if(_selSkillKeys.size===1&&_selSkillKeys.has(key)){_selSkillKeys.clear();_lastSelKey=null;}
    else{_selSkillKeys.clear();_selSkillKeys.add(key);_lastSelKey=key;}
  }
  _syncSelPupIds();applyPupSelHighlight();
}
function applyPupSelHighlight(){
  document.querySelectorAll('#pupTblBody tr[data-skillkey]').forEach(tr=>{
    tr.classList.toggle('pup-sel',_selSkillKeys.has(tr.dataset.skillkey));
  });
}
function pupMoveSelected(dir){
  if(!_selSkillKeys.size||_pupSortCol)return;
  const ordered=[...document.querySelectorAll('#pupTblBody tr[data-skillkey]')].map(r=>r.dataset.skillkey);
  if(!ordered.length)return;
  pupSnapshot();
  const arr=[...ordered];
  if(dir<0){for(let i=0;i<arr.length;i++){if(_selSkillKeys.has(arr[i])&&i>0&&!_selSkillKeys.has(arr[i-1])){[arr[i-1],arr[i]]=[arr[i],arr[i-1]];}}}
  else{for(let i=arr.length-1;i>=0;i--){if(_selSkillKeys.has(arr[i])&&i<arr.length-1&&!_selSkillKeys.has(arr[i+1])){[arr[i],arr[i+1]]=[arr[i+1],arr[i]];}}}
  arr.forEach((key,i)=>{st.pup_skills.forEach(s=>{if(s.skill===key)s.skill_order=i;});});
  save();renderPupTable();
  arr.forEach((key,i)=>{st.pup_skills.forEach(s=>{if(s.skill===key)sbReqSilent('PATCH','pup_skills',{skill_order:i},`?id=eq.${s.id}`);});});
}
function showPupCtx(e,sid){
  e.preventDefault();e.stopPropagation();
  _pupCtxId=sid;
  if(!_selPupIds.has(sid)){_selPupIds.clear();_selPupIds.add(sid);_lastSelPupId=sid;applyPupSelHighlight();}
  const m=document.getElementById('pupCtxMenu');
  const multi=_selPupIds.size>1;
  m.querySelector('.ctx-item:nth-child(1)').style.display=multi?'none':'';
  m.style.display='block';
  const x=Math.min(e.clientX,window.innerWidth-170),y=Math.min(e.clientY,window.innerHeight-130);
  m.style.left=x+'px';m.style.top=y+'px';
}
function hidePupCtx(){document.getElementById('pupCtxMenu').style.display='none';}
function pupCtxEdit(){hidePupCtx();if(_pupCtxId)openPupEditModal(_pupCtxId);}
async function pupCtxDuplicate(){
  hidePupCtx();
  pupSnapshot();
  const ids=_selPupIds.size?[..._selPupIds]:[_pupCtxId].filter(Boolean);
  for(const id of ids){
    const s=st.pup_skills.find(x=>String(x.id)===String(id));if(!s)continue;
    const copy={...s,id:'l-'+Date.now(),skill:s.skill+' (copy)'};
    st.pup_skills.push(copy);
    const sv=await sbReq('POST','pup_skills',{pup:copy.pup,skill:copy.skill,category:copy.category,level:copy.level,stage:copy.stage,focus:copy.focus,next_step:copy.next_step,comments:copy.comments});
    if(sv&&sv[0]){const i=st.pup_skills.findIndex(x=>x.id===copy.id);if(i>-1)st.pup_skills[i]=sv[0];}
  }
  save();renderPupsPage();
}
async function pupCtxDelete(){
  hidePupCtx();
  pupSnapshot();
  const ids=_selPupIds.size?[..._selPupIds]:[_pupCtxId].filter(Boolean);
  st.pup_skills=st.pup_skills.filter(x=>!ids.includes(String(x.id)));
  _selPupIds.clear();_pupCtxId=null;save();renderPupsPage();
  for(const id of ids)sbReqSilent('DELETE','pup_skills',null,`?id=eq.${id}`);
}
// Tooltip for Next Step
function showPupTip(e,text){
  const t=document.getElementById('pupTooltip');
  t.textContent=text;t.style.display='block';
  const x=Math.min(e.clientX+12,window.innerWidth-230),y=e.clientY-28;
  t.style.left=x+'px';t.style.top=y+'px';
}
function showPupStageTip(e,text,color){
  const t=document.getElementById('pupTooltip');
  t.innerHTML=`<span style="color:${color};font-weight:600">${text}</span>`;
  t.style.display='block';
  const x=Math.min(e.clientX+12,window.innerWidth-230),y=e.clientY-28;
  t.style.left=x+'px';t.style.top=y+'px';
}
function hidePupTip(){document.getElementById('pupTooltip').style.display='none';}
function pupSortBy(col){
  if(_pupSortCol!==col){_pupSortCol=col;_pupSortDir=1;}
  else if(_pupSortDir===1){_pupSortDir=-1;}
  else{_pupSortCol=null;_pupSortDir=1;}
  renderPupTable();
}
function pupFilterBy(e,col){
  e.stopPropagation();
  const pop=document.getElementById('pupFilterPop');
  if(pop.dataset.col===col&&pop.classList.contains('pfopen')){pop.classList.remove('pfopen');return;}
  pop.dataset.col=col;
  const skills=st.pup_skills||[];
  const curFilter=_pupFilter&&_pupFilter.col===col?_pupFilter:null;
  const inp_s='width:100%;padding:5px 8px;border-radius:8px;border:1px solid var(--border);font-family:inherit;font-size:12px;background:var(--bg);color:var(--text);outline:none;box-sizing:border-box';
  let html='';
  if(col==='skill'||col==='next_step'){
    const curText=curFilter?.text||'';
    html=`<input id="pfText" placeholder="Search…" value="${curText.replace(/"/g,'&quot;')}" style="${inp_s}">
    <div style="display:flex;gap:6px;margin-top:8px">
      <button onclick="applyPupTextFilter()" style="flex:1;padding:4px;border-radius:6px;border:1px solid var(--border);background:rgba(139,92,246,.12);cursor:pointer;font-size:12px;color:var(--text)">Apply</button>
      <button onclick="clearPupFilter()" style="flex:1;padding:4px;border-radius:6px;border:1px solid var(--border);background:transparent;cursor:pointer;font-size:12px;color:var(--muted)">Clear</button>
    </div>`;
  } else {
    const rawVals=[...new Set(skills.map(s=>String(s[col]||'—')))].sort();
    const vals=[...rawVals.filter(v=>v==='—'),...rawVals.filter(v=>v!=='—')];
    const curVals=curFilter?.vals||new Set(vals);
    const allChk=!curFilter||curVals.size===vals.length;
    const displayVal=v=>col==='category'&&v!=='—'?(v.charAt(0).toUpperCase()+v.slice(1)):v;
    html=`<div id="pfList" style="max-height:200px;overflow-y:auto;margin-bottom:8px">
      <label class="pf-cb-row"><input type="checkbox" id="pfAll" ${allChk?'checked':''} onchange="togglePupFilterAll()" style="margin-right:6px;accent-color:#8b5cf6"><em style="font-size:11px">(Select All)</em></label>
      ${vals.map(v=>`<label class="pf-cb-row"><input type="checkbox" class="pf-cb" data-val="${v.replace(/"/g,'&quot;')}" ${curVals.has(v)?'checked':''} onchange="syncPupFilterAll()" style="margin-right:6px;accent-color:#8b5cf6"> ${displayVal(v)}</label>`).join('')}
    </div>
    <div style="display:flex;gap:6px">
      <button onclick="applyPupCheckFilter('${col}')" style="flex:1;padding:4px;border-radius:6px;border:1px solid var(--border);background:rgba(139,92,246,.12);cursor:pointer;font-size:12px;color:var(--text)">Apply</button>
      <button onclick="clearPupFilter()" style="flex:1;padding:4px;border-radius:6px;border:1px solid var(--border);background:transparent;cursor:pointer;font-size:12px;color:var(--muted)">Clear</button>
    </div>`;
  }
  document.getElementById('pfContent').innerHTML=html;
  // Always query the live th from DOM — e.currentTarget may be detached if sort re-rendered thead
  const colIdx={skill:0,word:1}[col]??0;
  const liveTh=document.getElementById('pupTblHead')?.querySelectorAll('th')[colIdx];
  const rect=liveTh?liveTh.getBoundingClientRect():{left:200,bottom:200,right:200};
  let left=rect.left,pw=200;
  if(left+pw>window.innerWidth-6)left=window.innerWidth-pw-6;
  pop.style.left=left+'px';pop.style.top=(rect.bottom+4)+'px';
  pop.classList.add('pfopen');
  if(col==='skill'||col==='next_step'){
    setTimeout(()=>{
      const inp=document.getElementById('pfText');if(!inp)return;inp.focus();inp.select();
      inp.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();applyPupTextFilter();}if(ev.key==='Escape')pop.classList.remove('pfopen');};
    },50);
  }
}
function togglePupFilterAll(){
  const allCb=document.getElementById('pfAll');
  const cbs=document.querySelectorAll('.pf-cb');
  cbs.forEach(c=>c.checked=allCb.checked);
}
function syncPupFilterAll(){
  const allCb=document.getElementById('pfAll');
  const cbs=[...document.querySelectorAll('.pf-cb')];
  allCb.checked=cbs.every(c=>c.checked);
}
function applyPupCheckFilter(col){
  const cbs=[...document.querySelectorAll('.pf-cb')];
  const checked=new Set(cbs.filter(c=>c.checked).map(c=>c.dataset.val));
  const all=cbs.every(c=>c.checked);
  _pupFilter=all?null:{col,vals:checked,type:'set'};
  document.getElementById('pupFilterPop').classList.remove('pfopen');
  renderPupTable();
}
function clearPupFilter(){
  _pupFilter=null;
  document.getElementById('pupFilterPop').classList.remove('pfopen');
  renderPupTable();
}
function applyPupTextFilter(){
  const col=document.getElementById('pupFilterPop').dataset.col;
  const val=(document.getElementById('pfText')?.value||'').trim();
  _pupFilter=val?{col,text:val,type:'text'}:null;
  document.getElementById('pupFilterPop').classList.remove('pfopen');
  renderPupTable();
}
function pupCellEdit(td,id,field){
  if(td._editing)return;
  const s=st.pup_skills.find(x=>String(x.id)===String(id));if(!s)return;
  td._editing=true;
  let el;
  const elStyle='width:100%;font-size:11px;border:1px solid var(--border);border-radius:4px;padding:2px 4px;background:var(--bg);color:var(--text);outline:none;font-family:inherit;box-sizing:border-box';
  if(field==='pup'){el=document.createElement('select');['Mochi','Sunny'].forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;if(s.pup===v)o.selected=true;el.appendChild(o);});}
  else if(field==='category'){el=document.createElement('select');[['','—'],['commands','Commands'],['manners','Manners'],['fun','Fun']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;if((s.category||'')===v)o.selected=true;el.appendChild(o);});}
  else if(field==='level'){el=document.createElement('select');['','Easy','Medium','Hard'].forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v||'—';if((s.level||'')===v)o.selected=true;el.appendChild(o);});}
  else if(field==='stage'){el=document.createElement('select');['Not Started','In Progress','Mastered'].forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;if(s.stage===v)o.selected=true;el.appendChild(o);});}
  else if(field==='next_step'){el=document.createElement('select');[['','—'],['1. Duration','1. Duration'],['2. Distance','2. Distance'],['3. Distraction','3. Distraction']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;if((s.next_step||'')===v)o.selected=true;el.appendChild(o);});}
  else{el=document.createElement('input');el.value=s[field]||'';}
  el.style.cssText=elStyle;
  const origTxt=td.textContent;
  td.textContent='';td.appendChild(el);
  requestAnimationFrame(()=>{el.focus();if(el.tagName==='INPUT'){const _l=el.value.length;el.setSelectionRange(_l,_l);}});
  let saved=false;
  const origFieldVal=s[field]??null;
  const doSave=async()=>{if(saved)return;saved=true;td._editing=false;await setPupField(id,field,el.value,origFieldVal);renderPupTable();};
  el.onblur=doSave;
  el.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();el.blur();}if(ev.key==='Escape'){saved=true;td._editing=false;td.textContent=origTxt;}};
  if(el.tagName==='SELECT')el.onchange=async()=>{saved=true;td._editing=false;el.onblur=null;await setPupField(id,field,el.value,origFieldVal);renderPupTable();};
}
async function togglePupMastered(id,checked){
  const idx=st.pup_skills.findIndex(x=>String(x.id)===String(id));if(idx<0)return;
  pupSnapshot();
  const stage=checked?'Mastered':'In Progress';
  st.pup_skills[idx].stage=stage;
  save();renderPupsPage();
  sbReqSilent('PATCH','pup_skills',{stage},`?id=eq.${id}`);
}
async function pupStageClick(sid){
  const idx=st.pup_skills.findIndex(x=>String(x.id)===String(sid));if(idx<0)return;
  const s=st.pup_skills[idx];
  if(s.stage==='Not Started'||!s.stage){pupSnapshot();s.stage='In Progress';save();renderPupTable();sbReqSilent('PATCH','pup_skills',{stage:'In Progress'},`?id=eq.${sid}`);}
}
async function pupStageCheck(sid,checked){
  const idx=st.pup_skills.findIndex(x=>String(x.id)===String(sid));if(idx<0)return;
  pupSnapshot();
  const stage=checked?'Mastered':'In Progress';
  st.pup_skills[idx].stage=stage;
  save();renderPupTable();renderPupsPage();
  sbReqSilent('PATCH','pup_skills',{stage},`?id=eq.${sid}`);
}
async function deletePupGroup(skillName){
  // Delete clicked skill + any other selected skills
  const toDelete=new Set(_selSkillKeys.size>1&&_selSkillKeys.has(skillName)?[..._selSkillKeys]:[skillName]);
  pupSnapshot();
  const ids=st.pup_skills.filter(s=>toDelete.has(s.skill)).map(s=>String(s.id));
  st.pup_skills=st.pup_skills.filter(s=>!toDelete.has(s.skill));
  _selSkillKeys.clear();_lastSelKey=null;_selPupIds.clear();
  save();renderPupsPage();renderPupSkillsHighlight();
  for(const id of ids)sbReqSilent('DELETE','pup_skills',null,`?id=eq.${id}`);
}
function renderPupTable(){
  const thead=document.getElementById('pupTblHead');
  const tbody=document.getElementById('pupTblBody');if(!thead||!tbody)return;
  const skills=st.pup_skills||[];
  function esc(v){return(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  const LDEG={Easy:0,Medium:1,Hard:2};
  const CATO={commands:0,manners:1,fun:2};
  const PUP_ORDER=['Mochi','Sunny'];
  const pups=PUP_ORDER.filter(p=>skills.some(s=>s.pup===p));
  const pupColor={Mochi:'#8b5cf6',Sunny:'#fbbf24'};
  // Group skills by name — each unique skill name = one row
  const groupMap={};
  skills.forEach(s=>{
    const key=s.skill||'';
    if(!groupMap[key]){groupMap[key]={skill:s.skill,word:s.word,level:s.level,category:s.category,skill_order:s.skill_order,byPup:{}};}
    groupMap[key].byPup[s.pup]=s;
  });
  let groups=Object.values(groupMap);
  // "all done" = every pup that has a record is either Mastered or marked skip
  const allMastered=g=>pups.length>0&&pups.every(p=>g.byPup[p]&&(g.byPup[p].stage==='Mastered'||(g.byPup[p].skip===true||g.byPup[p].skip==='true')));
  // Filter
  if(_pupFilter){
    const sharedCols=new Set(['skill','word','level','category']);
    if(_pupFilter.type==='text'){const fv=_pupFilter.text.toLowerCase();const col=_pupFilter.col;groups=groups.filter(g=>{if(sharedCols.has(col))return String(g[col]||'').toLowerCase().includes(fv);return pups.some(p=>g.byPup[p]&&String(g.byPup[p][col]||'').toLowerCase().includes(fv));});}
    else if(_pupFilter.type==='set'){const col=_pupFilter.col;groups=groups.filter(g=>{if(sharedCols.has(col))return _pupFilter.vals.has(String(g[col]||'—'));return pups.some(p=>g.byPup[p]&&_pupFilter.vals.has(String(g.byPup[p][col]||'—')));});}
  }
  // Sort
  if(_pupSortCol){
    groups.sort((a,b)=>{
      if(_pupSortCol==='level')return _pupSortDir*((LDEG[a.level]??9)-(LDEG[b.level]??9));
      return _pupSortDir*String(a[_pupSortCol]||'').toLowerCase().localeCompare(String(b[_pupSortCol]||'').toLowerCase());
    });
  } else {
    groups.sort((a,b)=>{
      const ma=allMastered(a)?1:0,mb=allMastered(b)?1:0;if(ma!==mb)return ma-mb;
      return (a.skill_order??9999)-(b.skill_order??9999);
    });
  }
  const arrow=col=>_pupSortCol===col?(_pupSortDir>0?' ↑':' ↓'):'';
  const fdot=col=>(_pupFilter&&_pupFilter.col===col)?'<span style="color:#f97316;font-size:9px;margin-left:2px">▼</span>':'';
  const ths='cursor:pointer;user-select:none;white-space:nowrap;padding:5px 6px;font-size:11px';
  const thsS='user-select:none;white-space:nowrap;padding:5px 6px;font-size:11px';
  const tdE='user-select:none;cursor:default;font-size:11px';
  const totalCols=2+pups.length*3+1;
  thead.innerHTML=`<tr>
    <th onclick="pupHdrClick('skill')" ondblclick="pupHdrDbl(event,'skill')" rowspan="2" style="${ths};max-width:140px;width:140px">Skill${arrow('skill')}${fdot('skill')}</th>
    <th onclick="pupHdrClick('word')" ondblclick="pupHdrDbl(event,'word')" rowspan="2" style="${ths};width:72px">Word${arrow('word')}</th>
    ${pups.map(p=>`<th colspan="3" style="${thsS};text-align:center;color:${pupColor[p]||'var(--text)'};border-left:2px solid ${pupColor[p]||'var(--border)'}33">${p}</th>`).join('')}
    <th rowspan="2" style="width:44px"></th>
  </tr><tr>
    ${pups.map(p=>`<th style="${thsS};width:50px;text-align:center;border-left:2px solid ${pupColor[p]||'var(--border)'}33">Stage</th><th style="${thsS};width:72px">Next</th><th style="${thsS};width:50px;text-align:center">Sess</th>`).join('')}
  </tr>`;
  let lastMasteredSec=null;
  const rowsHtml=[];
  groups.forEach(g=>{
    const isMasteredAll=allMastered(g);
    if(!_pupSortCol&&isMasteredAll&&lastMasteredSec===false){
      rowsHtml.push(`<tr class="pup-cat-sep"><td colspan="${totalCols}" style="padding:8px 8px 3px;font-size:9px;font-weight:700;color:#16a34a;border-top:2px solid rgba(34,197,94,.15);border-bottom:1px solid rgba(34,197,94,.1)">Mastered</td></tr>`);
    }
    lastMasteredSec=isMasteredAll;
    const anyRec=pups.map(p=>g.byPup[p]).find(Boolean);
    const anyId=anyRec?String(anyRec.id):'';
    const word=g.word&&g.word!=='None'?esc(g.word):'';
    // Collect notes from any pup for tooltip on skill cell
    const allNotes=pups.map(p=>{const s=g.byPup[p];return s&&s.comments&&s.comments!=='None'?`${p}: ${esc(s.comments)}`:null;}).filter(Boolean).join(' | ');
    const pupCells=pups.map(p=>{
      const s=g.byPup[p];
      const borderL=`border-left:2px solid ${pupColor[p]||'var(--border)'}33`;
      if(!s)return`<td colspan="3" style="padding:4px 6px;color:var(--muted);font-size:10px;${borderL}">—</td>`;
      if(s.skip===true||s.skip==='true'){return`<td colspan="3" style="text-align:center;color:var(--muted);opacity:.3;font-size:14px;letter-spacing:2px;${borderL}">— —</td>`;}
      const sid=String(s.id);
      const nextStep=s.next_step&&s.next_step!=='None'?esc(s.next_step):'';
      const comment=s.comments&&s.comments!=='None'?esc(s.comments):'';
      let stageCell;
      if(!s.stage||s.stage==='Not Started'){
        stageCell=`<td onclick="event.stopPropagation();pupStageClick('${sid}')" style="padding:4px 6px;cursor:pointer;text-align:center;${borderL}" title="Click to start"></td>`;
      } else if(s.stage==='In Progress'){
        stageCell=`<td style="padding:4px 6px;text-align:center;${borderL}"><input type="checkbox" onclick="event.stopPropagation();pupStageCheck('${sid}',this.checked)" style="width:13px;height:13px;cursor:pointer;accent-color:${pupColor[p]||'#8b5cf6'}" title="Mark mastered"></td>`;
      } else {
        stageCell=`<td style="padding:4px 6px;text-align:center;${borderL}"><input type="checkbox" checked onclick="event.stopPropagation();pupStageCheck('${sid}',this.checked)" style="width:13px;height:13px;cursor:pointer;accent-color:#22c55e;opacity:.75" title="Mastered — click to revert"></td>`;
      }
      const nextTip=comment?` onmouseenter="showPupTip(event,'${comment}')" onmouseleave="hidePupTip()" style="padding:4px 6px;${tdE};cursor:help"`:` style="padding:4px 6px;${tdE}"`;
      return`${stageCell}<td ondblclick="pupCellEdit(this,'${sid}','next_step')"${nextTip}>${nextStep||''}</td><td onclick="event.stopPropagation();openPupCountEdit('${sid}',this)" style="padding:4px 4px;text-align:center;cursor:pointer;${tdE}" title="Click for session details">${_pupCountBadge(s)}</td>`;
    }).join('');
    const firstRec=pups.map(p=>g.byPup[p]).find(Boolean);
    const skillTip=allNotes?` onmouseenter="showPupTip(event,'${allNotes}')" onmouseleave="hidePupTip()" style="padding:4px 8px;${tdE};cursor:help"`:` style="padding:4px 8px;${tdE}"`;
    const rowSel=_selSkillKeys.has(g.skill)?'pup-sel':'';
    rowsHtml.push(`<tr data-skillkey="${esc(g.skill)}" class="${rowSel}" onclick="pupRowClick(event,'${esc(g.skill)}')" ondblclick="openPupEditModal('${firstRec?String(firstRec.id):''}')"${!_pupSortCol?' style="cursor:grab"':''}>
      <td${skillTip} style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.skill)}</td>
      <td style="width:72px;padding:4px 6px;${tdE};font-style:${word?'italic':'normal'};color:${word?'var(--text)':'var(--muted)'}">${word||'—'}</td>
      ${pupCells}
      <td style="width:28px;padding:2px 4px;text-align:right"><button class="pup-del" data-skillkey="${esc(g.skill)}" onclick="event.stopPropagation();deletePupGroup(this.dataset.skillkey)" title="Delete">×</button></td>
    </tr>`);
  });
  tbody.innerHTML=rowsHtml.join('');
  if(!_pupSortCol){
    [...tbody.querySelectorAll('tr[data-skillkey]')].forEach(row=>{
      row.addEventListener('mousedown',e=>{
        if(e.button!==0||e.target.closest('input,button'))return;
        let dragging=false;const startY=e.clientY;let ph=null;
        // rows being moved: this row + other selected rows if this row is part of selection
        const dragKeys=(_selSkillKeys.has(row.dataset.skillkey)&&_selSkillKeys.size>1)
          ?[...tbody.querySelectorAll('tr[data-skillkey]')].filter(r=>_selSkillKeys.has(r.dataset.skillkey)).map(r=>r.dataset.skillkey)
          :[row.dataset.skillkey];
        const onMove=ev=>{
          const dy=ev.clientY-startY;
          if(!dragging&&Math.abs(dy)<5)return;
          if(!dragging){
            window.getSelection()?.removeAllRanges();dragging=true;
            [...tbody.querySelectorAll('tr[data-skillkey]')].filter(r=>dragKeys.includes(r.dataset.skillkey)).forEach(r=>r.style.opacity='.3');
            ph=document.createElement('tr');
            ph.innerHTML=`<td colspan="100" style="padding:0;height:0;border-top:2px dashed rgba(139,92,246,.65);pointer-events:none"></td>`;
          }
          ev.preventDefault();
          const refs=[...tbody.querySelectorAll('tr[data-skillkey]')].filter(r=>!dragKeys.includes(r.dataset.skillkey));
          let ins=false;
          for(const r of refs){const rc=r.getBoundingClientRect();if(ev.clientY<rc.top+rc.height/2){tbody.insertBefore(ph,r);ins=true;break;}}
          if(!ins){if(refs.length)refs[refs.length-1].after(ph);else tbody.appendChild(ph);}
        };
        const onUp=()=>{
          document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);
          [...tbody.querySelectorAll('tr[data-skillkey]')].forEach(r=>r.style.opacity='');
          if(dragging&&ph){
            // insert all dragged rows at ph in their original relative order
            const dRows=[...tbody.querySelectorAll('tr[data-skillkey]')].filter(r=>dragKeys.includes(r.dataset.skillkey));
            if(dRows.length){tbody.insertBefore(dRows[0],ph);for(let i=1;i<dRows.length;i++)dRows[i-1].after(dRows[i]);}
            ph.remove();
            const ordered=[...tbody.querySelectorAll('tr[data-skillkey]')];
            pupSnapshot();
            ordered.forEach((r,i)=>{const key=r.dataset.skillkey;st.pup_skills.forEach(s=>{if(s.skill===key)s.skill_order=i;});});
            save();renderPupTable();
            ordered.forEach((r,i)=>{const key=r.dataset.skillkey;st.pup_skills.forEach(s=>{if(s.skill===key)sbReqSilent('PATCH','pup_skills',{skill_order:i},`?id=eq.${s.id}`);});});
          }else if(dragging){if(ph)ph.remove();}
        };
        document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
      });
    });
  }
}
function renderPupsPage(){
  const page=document.getElementById('page-pups');if(!page)return;
  const skills=st.pup_skills||[];
  function esc(v){return(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
  function lvlPill(s){return s.level?`<span class="pup-pill">${s.level}</span>`:'';}
  function skillCardRow(s,cls){
    const isMastered=s.stage==='Mastered';
    const ns=!isMastered&&s.next_step&&s.next_step!=='None'?s.next_step:'';
    const cm=!isMastered&&s.comments&&s.comments!=='None'?s.comments:'';
    const wd=(s.word&&s.word!=='None'&&s.word.toLowerCase()!==s.skill.toLowerCase())?esc(s.word):'';
    const sig=s.signal&&s.signal!=='None'?esc(s.signal):'';
    const sid=String(s.id);
    const sigTip=sig?` onmouseenter="showPupTip(event,'${sig}')" onmouseleave="hidePupTip()" style="cursor:help"`:' style=""';
    return`<div class="pup-skill-row ${cls}" data-pupid="${sid}" style="flex-direction:column;align-items:stretch;${sig?'cursor:pointer':''}"${sig?` onmouseenter="showPupTip(event,'${sig}')" onmouseleave="hidePupTip()"`:''}>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
        <div style="display:flex;align-items:center;gap:5px;flex:1;min-width:0;overflow:hidden">
          <input type="checkbox" ${isMastered?'checked':''} onclick="event.stopPropagation();togglePupMastered('${sid}',this.checked)" title="Mark mastered" style="width:13px;height:13px;cursor:pointer;accent-color:#8b5cf6;flex-shrink:0">
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isMastered?'opacity:.5;text-decoration:line-through':''}"><span class="pup-skill-name">${s.skill}</span>${wd?`<span style="font-size:10px;color:var(--muted);margin-left:4px">"${wd}"</span>`:''}</span>${sig?`<span style="font-size:9px;color:var(--muted);opacity:.6;flex-shrink:0;margin-left:2px">☞</span>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">${ns?`<span style="font-size:10px;color:var(--muted);white-space:nowrap">${ns}</span>`:''}${!isMastered?`<span onclick="event.stopPropagation();openPupCountEdit('${sid}',this)" title="Click for session details" style="font-size:10px;font-weight:600;color:var(--muted);cursor:pointer;padding:1px 4px;border-radius:4px;background:rgba(0,0,0,.04)">${_pupAllDone(sid)}/${_pupAllTotal(sid)}</span>`:''}</div>
      </div>
      ${cm?`<div style="font-size:10px;color:var(--subtle);margin-top:2px;padding-left:18px">${esc(cm)}</div>`:''}
    </div>`;
  }
  const PUP_CAT_ORDER=['commands','manners','fun'];
  const PUP_CAT_LABELS={commands:'Commands',manners:'Manners',fun:'Fun'};
  const CATO_CARD={commands:0,manners:1,fun:2};
  const LVLO_CARD={Easy:0,Medium:1,Hard:2};
  function sortCardSkills(list){
    return [...list].sort((a,b)=>{
      const fa=(a.focus===true||a.focus==='true'?0:1),fb=(b.focus===true||b.focus==='true'?0:1);if(fa!==fb)return fa-fb;
      const ca=CATO_CARD[a.category]??9,cb=CATO_CARD[b.category]??9;if(ca!==cb)return ca-cb;
      const la=LVLO_CARD[a.level]??9,lb=LVLO_CARD[b.level]??9;if(la!==lb)return la-lb;
      return (a.skill_order??9999)-(b.skill_order??9999);
    });
  }
  function groupedCardRows(list,cls){
    const sorted=sortCardSkills(list);
    const grouped={};
    sorted.forEach(s=>{const k=s.category||'other';(grouped[k]=grouped[k]||[]).push(s);});
    const order=[...PUP_CAT_ORDER,...Object.keys(grouped).filter(k=>!PUP_CAT_ORDER.includes(k))];
    return order.filter(k=>grouped[k]).map(k=>{
      const label=PUP_CAT_LABELS[k]||(k.charAt(0).toUpperCase()+k.slice(1));
      return`<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:6px 0 3px">${label}</div>${grouped[k].map(s=>skillCardRow(s,cls)).join('')}`;
    }).join('');
  }
  function pupCol(pup,color){
    const ps=skills.filter(s=>s.pup===pup);
    const mastered=ps.filter(s=>s.stage==='Mastered');
    const inProgress=ps.filter(s=>s.stage==='In Progress');
    const notStarted=ps.filter(s=>!s.stage||s.stage==='Not Started');
    const total=ps.length||1;
    const pMastered=mastered.length/total*100,pInProg=inProgress.length/total*100,pNot=notStarted.length/total*100;
    const progressBar=`<div style="height:8px;border-radius:0 0 var(--r) var(--r);overflow:hidden;background:rgba(210,205,228,.2);display:flex;flex-shrink:0">${pMastered>0?`<div onmouseenter="showPupStageTip(event,'Mastered: ${mastered.length}','#22c55e')" onmouseleave="hidePupTip()" style="width:${pMastered}%;background:#22c55e;cursor:default;transition:width .3s"></div>`:''} ${pInProg>0?`<div onmouseenter="showPupStageTip(event,'In Progress: ${inProgress.length}','#eab308')" onmouseleave="hidePupTip()" style="width:${pInProg}%;background:#eab308;cursor:default;transition:width .3s"></div>`:''} ${pNot>0?`<div onmouseenter="showPupStageTip(event,'Not Started: ${notStarted.length}','#94a3b8')" onmouseleave="hidePupTip()" style="width:${pNot}%;background:rgba(210,205,228,.4);cursor:default;transition:width .3s"></div>`:''}</div>`;
    const isSkip=s=>s.skip===true||s.skip==='true';
    const trainWeek=ps.filter(s=>!isSkip(s)&&(s.focus===true||s.focus==='true'));
    const upNext=inProgress.filter(s=>!isSkip(s)&&!(s.focus===true||s.focus==='true'));
    const img=pup==='Mochi'?'./mochi_headshot.png':'./sunny_headshot.png';
    const glowColor=pup==='Mochi'?'rgba(139,92,246,0.2)':'rgba(251,191,36,0.24)';
    const themeBg=pup==='Mochi'?'rgba(139,92,246,0.05)':'rgba(251,191,36,0.07)';
    const themeBorder=pup==='Mochi'?'rgba(139,92,246,0.12)':'rgba(251,191,36,0.18)';
    return`<div class="pup-col card" style="display:flex;flex-direction:column;overflow:visible;position:relative;background:rgba(255,255,255,.92);border:1.5px solid rgba(210,205,228,.5);border-radius:18px"><img src="${img}" style="position:absolute;top:-44px;left:50%;transform:translateX(-50%);width:92px;height:92px;border-radius:50%;object-fit:cover;object-position:top;border:3px solid rgba(255,255,255,.9);box-shadow:0 0 18px 6px ${glowColor},0 4px 14px rgba(0,0,0,.1)"><div style="display:grid;grid-template-columns:1fr 92px 1fr;align-items:center;min-height:52px;border-bottom:1px solid rgba(210,205,228,.22);flex-shrink:0"><span style="font-weight:700;font-size:13px;color:var(--text);padding-left:13px">${pup}</span><span></span><span style="font-size:11px;color:var(--muted);font-weight:500;padding-right:13px;text-align:right">${inProgress.length} in progress</span></div><div style="padding:8px;overflow-y:auto;flex:1;min-height:0;display:flex;flex-direction:column;gap:12px">${trainWeek.length?`<div style="background:${themeBg};border:1px solid ${themeBorder};border-radius:10px;padding:10px 8px"><div class="pup-section-label">Train This Week</div>${trainWeek.map(s=>skillCardRow(s,'pup-focus-row')).join('')}</div>`:''} ${upNext.length?`<div><div class="pup-section-label" style="color:var(--text);font-weight:800">Up Next</div>${groupedCardRows(upNext,'pup-skill-emphasis')}</div>`:''} ${ps.length===0?'<div style="font-size:11px;color:var(--muted);text-align:center;padding:20px 0">No skills yet</div>':''}</div>${progressBar}</div>`;
  }
  const tableCol=`<div class="pup-col card" style="overflow:hidden"><div class="ch"><span style="font-weight:700;font-size:13px;color:var(--text)">All Skills</span><button class="btn-plus" onclick="openPupAddModal()" style="margin-left:auto;padding:2px 8px;font-size:13px;border-radius:8px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--text)">+</button></div><div style="overflow:auto;flex:1;min-height:0"><table class="pup-tbl"><thead id="pupTblHead"></thead><tbody id="pupTblBody"></tbody></table></div></div>`;
  page.innerHTML=`<div class="ov-topbar"><div class="ov-topbar-left"><span class="ov-topbar-label">Pups</span><span class="ov-topbar-dot"></span></div><span class="ov-topbar-date topbar-date"></span><div class="ov-topbar-right"><span class="ov-topbar-dot"></span><span class="ov-topbar-time topbar-time"></span></div></div><div style="display:grid;grid-template-columns:1fr 1fr 2.2fr;gap:14px;height:calc(100vh - 80px);padding-top:26px;width:100%;box-sizing:border-box">${pupCol('Mochi','#8b5cf6')}${pupCol('Sunny','#fbbf24')}${tableCol}</div>`;
  if(!page._pupDblClick){
    page._pupDblClick=true;
    page.addEventListener('dblclick',e=>{
      const row=e.target.closest('[data-pupid]');
      if(!row)return;
      e.preventDefault();
      openPupEditModal(row.dataset.pupid);
    });
  }
  if(window._pupOutsideClick)document.removeEventListener('click',window._pupOutsideClick);
  window._pupOutsideClick=e=>{
    const pg=document.getElementById('page-pups');
    if(!pg||!pg.classList.contains('active'))return;
    if(!e.target.closest('#pupTblBody')){_selSkillKeys.clear();_lastSelKey=null;_selPupIds.clear();applyPupSelHighlight();}
  };
  document.addEventListener('click',window._pupOutsideClick);
  renderPupTable();
  const now=new Date();document.querySelectorAll('#page-pups .topbar-date').forEach(e=>e.textContent=now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));document.querySelectorAll('#page-pups .topbar-time').forEach(e=>e.textContent=new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}));
}
