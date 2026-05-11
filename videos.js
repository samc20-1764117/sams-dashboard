// ── Videos Page ─────────────────────────────────────────────────────────────
let _vidMode='add',_vidEditId=null;
let _vidSelected=new Set(),_vidLastSel=null,_vidCopied=[];
let _vidCtxId=null;
let _vidFilter='all';
let _vidGroupFilter='all';
let _vidSearch='';
let _vidView='dashboard'; // dashboard | table | board | groups

const VID_STEPS=['step_build','step_record','step_film','step_cut','step_thumbnail','step_description','step_tableau_public','step_upload_tableau','step_answer_comments','step_short'];
const VID_STEP_LABELS={step_build:'Build',step_record:'Rec',step_film:'Film',step_cut:'Cut',step_thumbnail:'Thumb',step_description:'Desc',step_tableau_public:'Tab Pub',step_upload_tableau:'Upload',step_answer_comments:'Ans',step_short:'Short'};
const VID_STATUS_COLORS={published:'#10b981',in_progress:'#f59e0b',idea:'#8b5cf6',backup:'#94a3b8'};
const VID_STEP_COLORS={done:'#10b981',in_progress:'#f59e0b',not_started:'transparent',na:'#d1d5db',backup:'#94a3b8',issue:'#ef4444'};

function _vidFiltered(){
  let vids=(st.videos||[]).filter(v=>!v.is_deleted);
  if(_vidFilter!=='all')vids=vids.filter(v=>v.status===_vidFilter);
  if(_vidGroupFilter!=='all')vids=vids.filter(v=>v.group_name===_vidGroupFilter);
  if(_vidSearch){const q=_vidSearch.toLowerCase();vids=vids.filter(v=>(v.title||'').toLowerCase().includes(q)||(v.topic||'').toLowerCase().includes(q)||(v.group_name||'').toLowerCase().includes(q));}
  return vids;
}

function _vidGroups(){
  const groups=new Set();
  (st.videos||[]).forEach(v=>{if(v.group_name&&!v.is_deleted)groups.add(v.group_name);});
  return[...groups].sort();
}

function _vidStats(){
  const vids=(st.videos||[]).filter(v=>!v.is_deleted);
  return{total:vids.length,published:vids.filter(v=>v.status==='published').length,in_progress:vids.filter(v=>v.status==='in_progress').length,idea:vids.filter(v=>v.status==='idea').length,backup:vids.filter(v=>v.status==='backup').length};
}

function _vidPostStr(d){
  if(!d)return'';
  const dt=new Date(d+'T12:00:00');
  return(dt.getMonth()+1)+'/'+dt.getDate();
}

// ── Main Render ──────────────────────────────────────────────────────────────
function renderVideosPage(){
  const el=document.getElementById('page-videos');if(!el)return;
  if(!st.videos)st.videos=[];
  const stats=_vidStats();
  const groups=_vidGroups();
  const viewBtnS=v=>`vid-view-btn${_vidView===v?' active':''}`;

  let bodyHtml='';
  if(_vidView==='dashboard')bodyHtml=_vidRenderDashboard();
  else if(_vidView==='table')bodyHtml=_vidRenderTable();
  else if(_vidView==='board')bodyHtml=_vidRenderBoard();
  if(_vidView==='groups'){_vidView='dashboard';bodyHtml=_vidRenderDashboard();}

  // Use the exact same pattern as recipes page (features.js line 2130-2139)
  el.style.cssText='padding:60px 56px 0 56px';
  el.innerHTML=`
    <div class="ov-topbar"><div class="ov-topbar-left"><span class="ov-topbar-label">🎬 Videos</span><span class="ov-topbar-dot"></span></div><span class="ov-topbar-date topbar-date"></span><div class="ov-topbar-right"><span class="ov-topbar-dot"></span><span class="ov-topbar-time topbar-time"></span></div></div>
    <div style="padding-top:26px;position:relative;z-index:10">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
        <div style="display:flex;gap:2px;background:var(--glass);border:1px solid var(--border);border-radius:8px;padding:2px">
          <button class="${viewBtnS('dashboard')}" onclick="_vidSetView('dashboard')">Dashboard</button>
          <button class="${viewBtnS('table')}" onclick="_vidSetView('table')">All Details</button>
          <button class="${viewBtnS('board')}" onclick="_vidSetView('board')">Videos by Progress</button>
        </div>
        <input id="vidSearchInput" type="text" placeholder="Search videos..." value="${_vidSearch.replace(/"/g,'&quot;')}" oninput="_vidSetSearch(this.value)" style="padding:5px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:12px;background:var(--bg);color:var(--text);outline:none;width:180px">
        <div style="flex:1"></div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="vid-stat-card"><div class="vid-stat-num" style="color:#10b981">${stats.published}</div><div class="vid-stat-lbl">Published</div></div>
          <div class="vid-stat-card"><div class="vid-stat-num" style="color:#f59e0b">${stats.in_progress}</div><div class="vid-stat-lbl">In Progress</div></div>
          <div class="vid-stat-card"><div class="vid-stat-num" style="color:#8b5cf6">${stats.idea}</div><div class="vid-stat-lbl">Ideas</div></div>
          <div class="vid-stat-card"><div class="vid-stat-num">${stats.total}</div><div class="vid-stat-lbl">Total</div></div>
        </div>
        <button class="btn btn-dark" onclick="openVidModal()" style="padding:5px 14px;font-size:12px">+ Add Video</button>
      </div>
    </div>
    <div class="card" style="overflow:hidden">
      <div style="overflow-y:auto;flex:1;min-height:0;max-height:calc(100vh - 180px)">
        ${bodyHtml}
      </div>
    </div>`;
  const now=new Date();
  el.querySelectorAll('.topbar-date').forEach(e=>e.textContent=now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));
  el.querySelectorAll('.topbar-time').forEach(e=>e.textContent=now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}));
  // Bind step dot + delete clicks via delegation (only once)
  if(!el._vidClickBound){
    el._vidClickBound=true;
    el.addEventListener('click',function(e){
      const dot=e.target.closest('.vid-step-dot');
      if(dot){e.stopPropagation();const vid=dot.dataset.vid;const step=dot.dataset.step;if(vid&&step)cycleVidStep(vid,step);return;}
      const del=e.target.closest('.vid-del');
      if(del){e.stopPropagation();const vid=del.dataset.vid;if(vid)delVideo(vid);return;}
    });
  }
}

// ── DASHBOARD VIEW (default — In Progress + Ideas) ───────────────────────────
function _vidRenderDashboard(){
  const all=(st.videos||[]).filter(v=>!v.is_deleted);
  let inProgress=all.filter(v=>v.status==='in_progress');
  let ideas=all.filter(v=>v.status==='idea');
  if(_vidSearch){
    const q=_vidSearch.toLowerCase();
    const match=v=>(v.title||'').toLowerCase().includes(q)||(v.topic||'').toLowerCase().includes(q)||(v.group_name||'').toLowerCase().includes(q);
    inProgress=inProgress.filter(match);ideas=ideas.filter(match);
  }
  return`
    <div style="display:flex;gap:20px;align-items:flex-start;margin-top:10px">
      <div style="flex:2;min-width:0" ondragover="event.preventDefault()" ondrop="_vidDashDrop(event,'in_progress')">
        <div class="vid-dash-section">
          <div class="vid-dash-header" style="border-left-color:#f59e0b">In Progress <span class="vid-count">${inProgress.length}</span></div>
          ${inProgress.length?`
          <div style="display:flex;justify-content:flex-end;gap:2px;padding:0 8px 4px;margin-right:26px"><div style="display:flex;gap:2px">${VID_STEPS.map(s=>`<div style="width:14px;text-align:center;font-size:7px;color:var(--muted);font-weight:600" title="${VID_STEP_LABELS[s]}">${VID_STEP_LABELS[s].slice(0,2)}</div>`).join('')}</div></div>
          ${_vidDashList(inProgress,false)}`:'<div style="color:var(--muted);font-size:12px;padding:16px 0">Drag ideas here to start</div>'}
        </div>
      </div>
      <div style="flex:1;min-width:0" ondragover="event.preventDefault()" ondrop="_vidDashDrop(event,'idea')">
        <div class="vid-dash-section">
          <div class="vid-dash-header" style="border-left-color:#8b5cf6">Ideas <span class="vid-count">${ideas.length}</span></div>
          ${ideas.length?_vidDashList(ideas,true):'<div style="color:var(--muted);font-size:12px;padding:16px 0">No ideas yet</div>'}
        </div>
      </div>
    </div>`;
}

function _vidDashList(vids,simple){
  const seen=new Set();
  let html='';
  const bVids=vids.filter(v=>v.video_type==='B');
  const lVids=vids.filter(v=>v.video_type!=='B');
  bVids.forEach(b=>{
    seen.add(String(b.id));
    html+=_vidDashRow(b,false,simple);
    const children=lVids.filter(l=>l.group_name&&l.group_name===b.group_name);
    children.forEach(l=>{seen.add(String(l.id));html+=_vidDashRow(l,true,simple);});
  });
  lVids.filter(l=>!seen.has(String(l.id))).forEach(l=>{html+=_vidDashRow(l,false,simple);});
  return html;
}

function _vidDashRow(v,isChild,simple){
  const sid=String(v.id);
  const sel=_vidSelected.has(sid);
  const indent=isChild?'padding-left:20px;':'';
  const childMark=isChild?'<span style="color:var(--muted);font-size:10px;margin-right:4px">└</span>':'';
  if(simple){
    return`<div class="vid-dash-row${sel?' vid-sel':''}" draggable="true" ondragstart="_vidDashDragStart(event,'${sid}')" data-vid="${sid}" onclick="vidRowClick(event,'${sid}')" ondblclick="openVidEdit('${sid}')" oncontextmenu="showVidCtx(event,'${sid}')">
      <span class="vid-type-badge" style="background:${v.video_type==='B'?'#0ea5e9':'#a78bfa'};color:#fff">${v.video_type||'?'}</span>
      <div style="flex:1;min-width:0;${indent}">${childMark}<span class="vid-title-text">${_esc(v.title)}</span></div>
      <button class="vid-del" data-vid="${sid}">✕</button>
    </div>`;
  }
  return`<div class="vid-dash-row${sel?' vid-sel':''}" draggable="true" ondragstart="_vidDashDragStart(event,'${sid}')" data-vid="${sid}" onclick="vidRowClick(event,'${sid}')" ondblclick="openVidEdit('${sid}')" oncontextmenu="showVidCtx(event,'${sid}')">
    <span class="vid-type-badge" style="background:${v.video_type==='B'?'#0ea5e9':'#a78bfa'};color:#fff">${v.video_type||'?'}</span>
    <div style="flex:1;min-width:0;${indent}">
      ${childMark}<span class="vid-title-text">${_esc(v.title)}</span>
      ${v.group_name&&!isChild?`<span style="font-size:10px;color:var(--muted);margin-left:6px">${_esc(v.group_name)}</span>`:''}
    </div>
    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
      <div style="display:flex;gap:2px">${VID_STEPS.map(s=>`<div class="vid-step-dot${v[s]==='done'?' done':''}" data-vid="${sid}" data-step="${s}" title="${VID_STEP_LABELS[s]}"></div>`).join('')}</div>
      <button class="vid-del" data-vid="${sid}">✕</button>
    </div>
  </div>`;
}

let _vidDashDragId=null;
function _vidDashDragStart(e,id){_vidDashDragId=id;e.dataTransfer.effectAllowed='move';}
async function _vidDashDrop(e,newStatus){
  e.preventDefault();
  if(!_vidDashDragId)return;
  const v=(st.videos||[]).find(x=>String(x.id)===_vidDashDragId);if(!v)return;
  const prev=v.status;
  if(prev===newStatus){_vidDashDragId=null;return;}
  pushUndo();v.status=newStatus;save();renderVideosPage();
  await sbReqSilent('PATCH','videos',{status:newStatus},`?id=eq.${v.id}`);
  _vidDashDragId=null;
}

// ── TABLE VIEW (All Details) ─────────────────────────────────────────────────
function _vidRenderTable(){
  const vids=_vidFiltered();
  const groupedHtml=_vidBuildRows(vids);
  return`<div style="overflow-x:auto;margin-top:4px">
    <table class="vid-tbl">
      <thead><tr>
        <th style="width:36px">Type</th>
        <th>Title</th>
        <th style="width:70px">Status</th>
        <th style="width:50px">Dur</th>
        <th style="width:52px">Posted</th>
        ${VID_STEPS.map(s=>`<th style="width:28px;text-align:center;font-size:9px" title="${VID_STEP_LABELS[s]}">${VID_STEP_LABELS[s].slice(0,2)}</th>`).join('')}
        <th style="width:28px"></th>
      </tr></thead>
      <tbody>${groupedHtml}</tbody>
    </table>
  </div>`;
}

function _vidBuildRows(vids){
  const seen=new Set();
  let html='';
  const bVids=vids.filter(v=>v.video_type==='B');
  const lVids=vids.filter(v=>v.video_type!=='B');
  bVids.forEach(b=>{
    seen.add(String(b.id));
    html+=_vidRow(b,false);
    const children=lVids.filter(l=>l.group_name&&l.group_name===b.group_name);
    children.forEach(l=>{seen.add(String(l.id));html+=_vidRow(l,true);});
  });
  lVids.filter(l=>!seen.has(String(l.id))).forEach(l=>{html+=_vidRow(l,false);});
  return html;
}

function _vidRow(v,isChild){
  const sid=String(v.id);
  const sel=_vidSelected.has(sid);
  const sc=VID_STATUS_COLORS[v.status]||'#94a3b8';
  const postStr=_vidPostStr(v.post_date);
  const durStr=v.duration_minutes?v.duration_minutes.toFixed(1):'';
  const indent=isChild?'padding-left:22px;':'';
  const childMark=isChild?'<span style="color:var(--muted);font-size:10px;margin-right:4px">└</span>':'';
  return`<tr class="vid-row${sel?' vid-sel':''}" data-vid="${sid}" onclick="vidRowClick(event,'${sid}')" ondblclick="openVidEdit('${sid}')" oncontextmenu="showVidCtx(event,'${sid}')">
    <td><span class="vid-type-badge" style="background:${v.video_type==='B'?'#0ea5e9':'#a78bfa'};color:#fff">${v.video_type||''}</span></td>
    <td style="${indent}">${childMark}<span class="vid-title-text">${_esc(v.title)}</span></td>
    <td><span class="vid-status-pill" style="background:${sc}20;color:${sc}">${v.status}</span></td>
    <td style="font-size:11px;color:var(--muted)">${durStr}</td>
    <td style="font-size:11px;color:var(--muted)">${postStr}</td>
    ${VID_STEPS.map(s=>`<td style="text-align:center"><div class="vid-step-dot${v[s]==='done'?' done':''}" data-vid="${sid}" data-step="${s}" title="${VID_STEP_LABELS[s]}"></div></td>`).join('')}
    <td><button class="vid-del" data-vid="${sid}">✕</button></td>
  </tr>`;
}

// ── BOARD VIEW (Kanban by status) ────────────────────────────────────────────
function _vidRenderBoard(){
  const vids=_vidFiltered();
  const cols=[
    {key:'idea',label:'Ideas',color:'#8b5cf6'},
    {key:'in_progress',label:'In Progress',color:'#f59e0b'},
    {key:'published',label:'Published',color:'#10b981'},
    {key:'backup',label:'Backup',color:'#94a3b8'}
  ];
  return`<div class="vid-board">${cols.map(col=>{
    const items=vids.filter(v=>v.status===col.key);
    return`<div class="vid-board-col" ondragover="event.preventDefault();this.classList.add('vid-board-dragover')" ondragleave="this.classList.remove('vid-board-dragover')" ondrop="_vidBoardDrop(event,'${col.key}');this.classList.remove('vid-board-dragover')">
      <div class="vid-board-header" style="border-bottom-color:${col.color}">
        <span style="color:${col.color};font-weight:700">${col.label}</span>
        <span class="vid-count">${items.length}</span>
      </div>
      <div class="vid-board-items">${items.map(v=>_vidBoardCard(v)).join('')}</div>
    </div>`;
  }).join('')}</div>`;
}

function _vidBoardCard(v){
  const sid=String(v.id);
  const sel=_vidSelected.has(sid);
  const postStr=_vidPostStr(v.post_date);
  const doneSteps=VID_STEPS.filter(s=>v[s]==='done').length;
  const totalSteps=VID_STEPS.filter(s=>v[s]!=='na').length;
  const pct=totalSteps?Math.round(doneSteps/totalSteps*100):0;
  return`<div class="vid-board-card${sel?' vid-sel':''}" draggable="true" ondragstart="_vidBoardDragStart(event,'${sid}')" onclick="vidRowClick(event,'${sid}')" ondblclick="openVidEdit('${sid}')" oncontextmenu="showVidCtx(event,'${sid}')">
    <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">
      <span class="vid-type-badge" style="background:${v.video_type==='B'?'#0ea5e9':'#a78bfa'};color:#fff;font-size:9px;padding:0 4px">${v.video_type||'?'}</span>
      ${v.group_name?`<span style="font-size:9px;color:var(--muted)">${_esc(v.group_name)}</span>`:''}
    </div>
    <div style="font-size:12px;font-weight:500;color:var(--text);line-height:1.35;margin-bottom:4px">${_esc(v.title)}</div>
    <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--muted)">
      ${postStr?`<span>${postStr}</span>`:''}
      ${v.duration_minutes?`<span>${v.duration_minutes.toFixed(1)}m</span>`:''}
      <div style="flex:1"></div>
      <div style="display:flex;align-items:center;gap:3px">
        <div style="width:36px;height:4px;background:var(--border);border-radius:2px;overflow:hidden"><div style="width:${pct}%;height:100%;background:#10b981;border-radius:2px"></div></div>
        <span style="font-size:9px">${pct}%</span>
      </div>
    </div>
  </div>`;
}

let _vidDragId=null;
function _vidBoardDragStart(e,id){_vidDragId=id;e.dataTransfer.effectAllowed='move';}
async function _vidBoardDrop(e,newStatus){
  e.preventDefault();
  if(!_vidDragId)return;
  const v=(st.videos||[]).find(x=>String(x.id)===_vidDragId);if(!v)return;
  const prev=v.status;
  if(prev===newStatus){_vidDragId=null;return;}
  v.status=newStatus;
  if(newStatus==='published'&&!v.post_date)v.post_date=d2s(new Date());
  save();renderVideosPage();
  const patch={status:newStatus};
  if(newStatus==='published'&&v.post_date)patch.post_date=v.post_date;
  pushUndo(async()=>{v.status=prev;save();renderVideosPage();await sbReqSilent('PATCH','videos',{status:prev},`?id=eq.${_vidDragId}`);},'Status change');
  await sbReqSilent('PATCH','videos',patch,`?id=eq.${_vidDragId}`);
  _vidDragId=null;
}

// ── GROUPS VIEW ──────────────────────────────────────────────────────────────
function _vidRenderGroups(){
  const vids=_vidFiltered();
  const groupNames=_vidGroups();
  const ungrouped=vids.filter(v=>!v.group_name);
  let html='<div class="vid-groups-grid">';
  groupNames.forEach(gn=>{
    const gVids=vids.filter(v=>v.group_name===gn);
    const bVid=gVids.find(v=>v.video_type==='B');
    const lVids=gVids.filter(v=>v.video_type!=='B');
    const pub=gVids.filter(v=>v.status==='published').length;
    const total=gVids.length;
    const pct=total?Math.round(pub/total*100):0;
    const sc=pct===100?'#10b981':pct>0?'#f59e0b':'#8b5cf6';
    html+=`<div class="vid-group-card" onclick="_vidSetGroup('${_esc(gn)}');_vidSetView('table')">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:13px;font-weight:700;color:var(--text)">${_esc(gn)}</span>
        <span style="font-size:10px;font-weight:600;color:${sc}">${pub}/${total}</span>
      </div>
      ${bVid?`<div style="font-size:11px;color:var(--muted);margin-bottom:6px;line-height:1.3">${_esc(bVid.title)}</div>`:''}
      <div style="width:100%;height:5px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:6px"><div style="width:${pct}%;height:100%;background:${sc};border-radius:3px;transition:width .3s"></div></div>
      <div style="display:flex;flex-wrap:wrap;gap:3px">
        ${lVids.slice(0,8).map(l=>{const lsc=VID_STATUS_COLORS[l.status]||'#94a3b8';return`<span style="font-size:9px;padding:1px 5px;border-radius:4px;background:${lsc}15;color:${lsc}">${_esc((l.topic||l.title).slice(0,20))}</span>`;}).join('')}
        ${lVids.length>8?`<span style="font-size:9px;color:var(--muted)">+${lVids.length-8} more</span>`:''}
      </div>
    </div>`;
  });
  if(ungrouped.length){
    html+=`<div class="vid-group-card">
      <div style="font-size:13px;font-weight:700;color:var(--muted);margin-bottom:6px">Ungrouped</div>
      <div style="font-size:11px;color:var(--muted)">${ungrouped.length} video(s)</div>
    </div>`;
  }
  html+='</div>';
  return html;
}

// ── View / Filter ────────────────────────────────────────────────────────────
function _vidSetView(v){_vidView=v;renderVideosPage();}
function _vidSetFilter(f){_vidFilter=f;renderVideosPage();}
function _vidSetGroup(g){_vidGroupFilter=g;renderVideosPage();}
function _vidSetSearch(q){_vidSearch=q;renderVideosPage();
  requestAnimationFrame(()=>{const inp=document.getElementById('vidSearchInput');if(inp){inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);}});
}

// ── Selection ─────────────────────────────────────────────────────────────────
function vidRowClick(e,id){
  if(e.target.closest('.vid-del')||e.target.closest('.vid-step-dot'))return;
  const sid=String(id);
  if(e.metaKey||e.ctrlKey){
    if(_vidSelected.has(sid))_vidSelected.delete(sid);else _vidSelected.add(sid);
  }else if(e.shiftKey&&_vidLastSel){
    const vids=_vidFiltered();const ids=vids.map(v=>String(v.id));
    const a=ids.indexOf(_vidLastSel),b=ids.indexOf(sid);
    if(a>-1&&b>-1){const[lo,hi]=[Math.min(a,b),Math.max(a,b)];for(let i=lo;i<=hi;i++)_vidSelected.add(ids[i]);}
  }else{
    _vidSelected.clear();_vidSelected.add(sid);
  }
  _vidLastSel=sid;
  _applyVidSel();
}

function _applyVidSel(){
  document.querySelectorAll('.vid-row,.vid-board-card,.vid-dash-row').forEach(r=>{
    const id=r.dataset?.vid;
    if(id)r.classList.toggle('vid-sel',_vidSelected.has(id));
  });
}

// ── Context Menu ──────────────────────────────────────────────────────────────
function showVidCtx(e,id){
  e.preventDefault();e.stopPropagation();
  _vidCtxId=String(id);
  if(!_vidSelected.has(_vidCtxId)){_vidSelected.clear();_vidSelected.add(_vidCtxId);_applyVidSel();}
  const menu=document.getElementById('vidCtxMenu');
  menu.style.display='block';
  menu.style.left=Math.min(e.clientX,window.innerWidth-165)+'px';
  menu.style.top=Math.min(e.clientY,window.innerHeight-120)+'px';
}
function vidCtxEdit(){document.getElementById('vidCtxMenu').style.display='none';if(_vidCtxId)openVidEdit(_vidCtxId);}
function vidCtxDuplicate(){document.getElementById('vidCtxMenu').style.display='none';_vidSelected.forEach(id=>_vidDuplicate(id));}
function vidCtxDelete(){document.getElementById('vidCtxMenu').style.display='none';[..._vidSelected].forEach(id=>delVideo(id));}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openVidModal(){
  _vidMode='add';_vidEditId=null;
  document.getElementById('vidMTitle').textContent='Add Video';
  document.getElementById('vmTitle').value='';
  document.getElementById('vmTopic').value='';
  document.getElementById('vmType').value='';
  document.getElementById('vmStatus').value='idea';
  document.getElementById('vmPostDate').value='';
  document.getElementById('vmDuration').value='';
  document.getElementById('vmBuildHours').value='';
  document.getElementById('vmGroup').value='';
  document.getElementById('vmPlaylist').value='';
  _vidRenderSteps({});
  document.getElementById('vidModal').classList.add('open');
  setTimeout(()=>{const inp=document.getElementById('vmTitle');inp.focus();inp.setSelectionRange(0,0);},80);
}

function openVidEdit(id){
  const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(!v)return;
  _vidMode='edit';_vidEditId=String(v.id);
  document.getElementById('vidMTitle').textContent='Edit Video';
  document.getElementById('vmTitle').value=v.title||'';
  document.getElementById('vmTopic').value=v.topic||'';
  document.getElementById('vmType').value=v.video_type||'';
  document.getElementById('vmStatus').value=v.status||'idea';
  document.getElementById('vmPostDate').value=v.post_date||'';
  document.getElementById('vmDuration').value=v.duration_minutes||'';
  document.getElementById('vmBuildHours').value=v.build_hours||'';
  document.getElementById('vmGroup').value=v.group_name||'';
  document.getElementById('vmPlaylist').value=v.playlist||'';
  const stepVals={};VID_STEPS.forEach(s=>{stepVals[s]=v[s]||'not_started';});
  _vidRenderSteps(stepVals);
  document.getElementById('vidModal').classList.add('open');
  setTimeout(()=>{const inp=document.getElementById('vmTitle');inp.focus();const len=inp.value.length;inp.setSelectionRange(len,len);},80);
}

function _vidRenderSteps(vals){
  const el=document.getElementById('vmSteps');
  const opts=['not_started','done','in_progress','na','backup','issue'];
  el.innerHTML=VID_STEPS.map(s=>{
    const cur=vals[s]||'not_started';
    return`<div style="display:flex;flex-direction:column;gap:2px;align-items:center">
      <span style="font-size:9px;color:var(--muted)">${VID_STEP_LABELS[s]}</span>
      <select data-step="${s}" style="width:100%;padding:3px 2px;border:1px solid var(--border);border-radius:5px;font-size:10px;background:var(--bg);color:var(--text);outline:none">
        ${opts.map(o=>`<option value="${o}"${o===cur?' selected':''}>${o.replace('_',' ')}</option>`).join('')}
      </select>
    </div>`;
  }).join('');
}

async function saveVidModal(){
  const title=document.getElementById('vmTitle').value.trim();
  if(!title){closeMod('vidModal');return;}
  const data={
    title,
    topic:document.getElementById('vmTopic').value.trim()||null,
    video_type:document.getElementById('vmType').value||null,
    status:document.getElementById('vmStatus').value||'idea',
    post_date:document.getElementById('vmPostDate').value||null,
    duration_minutes:parseFloat(document.getElementById('vmDuration').value)||null,
    build_hours:parseFloat(document.getElementById('vmBuildHours').value)||null,
    group_name:document.getElementById('vmGroup').value.trim()||null,
    playlist:document.getElementById('vmPlaylist').value.trim()||null
  };
  document.querySelectorAll('#vmSteps select[data-step]').forEach(sel=>{data[sel.dataset.step]=sel.value;});
  closeMod('vidModal');

  if(_vidMode==='edit'&&_vidEditId){
    const v=(st.videos||[]).find(x=>String(x.id)===String(_vidEditId));
    if(v){
      const prev={...v};
      Object.assign(v,data);
      save();renderVideosPage();
      pushUndo(async()=>{Object.assign(v,prev);save();renderVideosPage();await sbReqSilent('PATCH','videos',prev,`?id=eq.${_vidEditId}`);},'Edited video');
      await sbReqSilent('PATCH','videos',data,`?id=eq.${_vidEditId}`);
    }
  }else{
    const tmp='l-'+Date.now();
    const rec={id:tmp,...data};
    st.videos.push(rec);save();renderVideosPage();
    const sv=await sbReqSilent('POST','videos',data);
    if(sv&&sv[0]){const ix=st.videos.findIndex(x=>x.id===tmp);if(ix>-1)st.videos[ix]=sv[0];}
    save();renderVideosPage();
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function delVideo(id){
  const sid=String(id);
  const v=(st.videos||[]).find(x=>String(x.id)===sid);if(!v)return;
  const copy={...v};
  st.videos=st.videos.filter(x=>String(x.id)!==sid);
  _vidSelected.delete(sid);
  save();renderVideosPage();
  pushUndo(async()=>{st.videos.push(copy);save();renderVideosPage();await sbReqSilent('POST','videos',copy);},'Deleted video');
  if(!sid.startsWith('l-'))await sbReqSilent('DELETE','videos',null,`?id=eq.${sid}`);
}

// ── Duplicate ─────────────────────────────────────────────────────────────────
async function _vidDuplicate(id){
  const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(!v)return;
  const dup={...v,id:'l-'+Date.now(),number:null,post_date:null,status:'idea'};
  delete dup.created_at;
  st.videos.push(dup);save();renderVideosPage();
  const{id:_,...payload}=dup;
  const sv=await sbReqSilent('POST','videos',payload);
  if(sv&&sv[0]){const ix=st.videos.findIndex(x=>x.id===dup.id);if(ix>-1)st.videos[ix]=sv[0];}
  save();renderVideosPage();
}

// ── Cycle Step ────────────────────────────────────────────────────────────────
async function cycleVidStep(id,step){
  const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(!v)return;
  const cur=v[step]||'not_started';
  const next=cur==='done'?'not_started':'done';
  const prev=cur;
  v[step]=next;
  save();renderVideosPage();
  pushUndo(async()=>{v[step]=prev;save();renderVideosPage();await sbReqSilent('PATCH','videos',{[step]:prev},`?id=eq.${id}`);},'Step change');
  await sbReqSilent('PATCH','videos',{[step]:next},`?id=eq.${id}`);
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if(activePg!=='videos')return;
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT'||e.target.isContentEditable)return;
  if((e.key==='Delete'||e.key==='Backspace')&&_vidSelected.size>0){e.preventDefault();[..._vidSelected].forEach(id=>delVideo(id));return;}
  if((e.metaKey||e.ctrlKey)&&e.key==='c'&&_vidSelected.size>0){e.preventDefault();_vidCopied=[];_vidSelected.forEach(id=>{const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(v)_vidCopied.push({...v});});showToast('Copied '+_vidCopied.length+' video(s)','#0ea5e9',1500);return;}
  if((e.metaKey||e.ctrlKey)&&e.key==='v'&&_vidCopied.length>0){e.preventDefault();_vidCopied.forEach(v=>_vidDuplicate(v.id));return;}
  if(e.key==='n'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();openVidModal();return;}
});

// ── Close context menu on click elsewhere ─────────────────────────────────────
document.addEventListener('click',e=>{if(!e.target.closest('#vidCtxMenu'))document.getElementById('vidCtxMenu').style.display='none';});

function _esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
