// ── Videos Page ─────────────────────────────────────────────────────────────
let _vidMode='add',_vidEditId=null;
let _vidSelected=new Set(),_vidLastSel=null,_vidCopied=[];
let _vidCtxId=null;
let _vidFilter='all';
let _vidGroupFilter='all';
let _vidSearch='';
let _vidView='dashboard'; // dashboard | table | board | groups
let _vidSortCol=null,_vidSortDir=1,_vidShowCompleted=false;
let _vidMonthOffset=0; // 0=current month, -1=last month, etc

const VID_STEPS=['step_build','step_record','step_film','step_cut','step_thumbnail','step_description','step_tableau_public','step_upload_tableau'];
const VID_STEP_LABELS={step_build:'Build',step_record:'Rec',step_film:'Film',step_cut:'Cut',step_thumbnail:'Thumb',step_description:'Desc',step_tableau_public:'Tab Pub',step_upload_tableau:'Upload'};
const VID_STATUS_COLORS={published:'#10b981',in_progress:'#f59e0b',idea:'#8b5cf6',backup:'#94a3b8'};
const VID_STEP_COLORS={done:'#10b981',in_progress:'#f59e0b',not_started:'transparent',na:'#d1d5db',backup:'#94a3b8',issue:'#ef4444'};

// Build numbering from an ordered array of videos (display order)
function _vidSeqMap(orderedIds){
  const map={};
  orderedIds.forEach((id,i)=>{map[String(id)]=i+1;});
  return map;
}
// Build display-order ID list: videos with post_date get numbers
function _vidOrderedIds(vids){
  const ids=[];
  const dated=vids.filter(v=>v.post_date);
  const sorted=_vidSortVids([...dated]);
  const seen=new Set();
  const lVids=sorted.filter(v=>v.video_type!=='B');
  sorted.forEach(v=>{
    if(seen.has(String(v.id)))return;
    seen.add(String(v.id));
    ids.push(v.id);
    if(v.video_type==='B'){
      lVids.filter(l=>String(l.big_video_id)===String(v.id)&&!seen.has(String(l.id)))
        .forEach(l=>{seen.add(String(l.id));ids.push(l.id);});
    }
  });
  return ids;
}

function _vidFiltered(){
  let vids=(st.videos||[]).filter(v=>!v.is_deleted);
  if(_vidFilter!=='all')vids=vids.filter(v=>v.status===_vidFilter);
  if(_vidGroupFilter!=='all')vids=vids.filter(v=>String(v.big_video_id)===String(_vidGroupFilter)||String(v.id)===String(_vidGroupFilter));
  if(_vidSearch){const q=_vidSearch.toLowerCase();vids=vids.filter(v=>(v.title||'').toLowerCase().includes(q)||(v.topic||'').toLowerCase().includes(q));}
  return vids;
}

function _vidGroups(){
  const groups=new Set();
  (st.videos||[]).forEach(v=>{if(v.big_video_id&&!v.is_deleted)groups.add(v.big_video_id);});
  return[...groups].sort();
}

function _vidStats(){
  const vids=(st.videos||[]).filter(v=>!v.is_deleted);
  return{total:vids.length,published:vids.filter(v=>v.status==='published').length,in_progress:vids.filter(v=>v.status==='in_progress').length,idea:vids.filter(v=>v.status==='idea').length,backup:vids.filter(v=>v.status==='backup').length};
}

function _vidPostStr(d,withYear){
  if(!d)return'';
  const dt=new Date(d+'T12:00:00');
  if(withYear)return(dt.getMonth()+1)+'/'+dt.getDate()+'/'+String(dt.getFullYear()).slice(2);
  return(dt.getMonth()+1)+'/'+dt.getDate();
}
function _vidDateColor(d,v){
  if(!d)return'var(--muted)';
  const today=d2s(new Date());
  if(v&&v.status==='published'){
    return d>=today?'#10b981':'var(--text)';
  }
  const allDone=v&&VID_STEPS.every(s=>v[s]==='done'||v[s]==='na');
  if(allDone)return'#10b981';
  return'#f59e0b';
}

// ── Main Render ──────────────────────────────────────────────────────────────
function _vidScrollEl(){
  const pg=document.getElementById('page-videos');if(!pg)return null;
  const card=pg.querySelector('.card');if(!card)return null;
  return card.querySelector('div')||null;
}
function renderVideosPageKeepScroll(){
  const se=_vidScrollEl();const top=se?se.scrollTop:0;
  renderVideosPage();
  const se2=_vidScrollEl();if(se2)se2.scrollTop=top;
}
function renderVideosPage(){
  const _rvpSe=_vidScrollEl();const _rvpTop=_rvpSe?_rvpSe.scrollTop:0;
  const el=document.getElementById('page-videos');if(!el)return;
  if(!st.videos)st.videos=[];
  // Auto-migrate group_name → big_video_id (client-side, until DB migration runs)
  const bVids=(st.videos||[]).filter(v=>v.video_type==='B'&&!v.is_deleted);
  st.videos.forEach(v=>{
    if(v.group_name&&!v.big_video_id){
      const parent=bVids.find(b=>(b.title||'')===v.group_name||(b.group_name||'')===v.group_name);
      if(parent)v.big_video_id=parent.id;
    }
  });
  _vidDashVids=null;_vidDashPostMap=null;
  const stats=_vidStats();
  const groups=_vidGroups();
  const viewBtnS=v=>`vid-view-btn${_vidView===v?' active':''}`;

  let bodyHtml='';
  if(_vidView==='dashboard')bodyHtml=_vidRenderDashboard();
  else if(_vidView==='table')bodyHtml=_vidRenderTable();
  else if(_vidView==='board')bodyHtml=_vidRenderBoard();
  else if(_vidView==='monthly')bodyHtml=_vidRenderMonthly();
  if(_vidView==='groups'){_vidView='dashboard';bodyHtml=_vidRenderDashboard();}

  // Use the exact same pattern as recipes page (features.js line 2130-2139)
  el.style.cssText='padding:60px 56px 0 56px;display:flex;flex-direction:column;height:100vh;box-sizing:border-box';
  el.innerHTML=`
    <div class="ov-topbar"><div class="ov-topbar-left"><span class="ov-topbar-label">Videos</span><span class="ov-topbar-dot"></span></div><span class="ov-topbar-date topbar-date"></span><div class="ov-topbar-right"><span class="ov-topbar-dot"></span><span class="ov-topbar-time topbar-time"></span></div></div>
    <div style="padding-top:26px;position:relative;z-index:10">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
        <div style="display:flex;gap:2px;background:var(--glass);border:1px solid var(--border);border-radius:8px;padding:2px">
          <button class="${viewBtnS('dashboard')}" onclick="_vidSetView('dashboard')">Dashboard</button>
          <button class="${viewBtnS('table')}" onclick="_vidSetView('table')">All Details</button>
          <button class="${viewBtnS('board')}" onclick="_vidSetView('board')">Videos by Progress</button>
          <button class="${viewBtnS('monthly')}" onclick="_vidSetView('monthly')">Monthly</button>
        </div>
        <input id="vidSearchInput" type="text" placeholder="Search videos..." value="${_vidSearch.replace(/"/g,'&quot;')}" oninput="_vidSetSearch(this.value)" style="padding:5px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:12px;background:var(--bg);color:var(--text);outline:none;width:180px">
        <div style="flex:1"></div>
        <div style="display:flex;gap:10px;align-items:center;font-size:12px;font-weight:500">
          <span style="color:#10b981">${stats.published} published</span>
          <span style="color:#f59e0b">${stats.in_progress} in progress</span>
          <span style="color:#8b5cf6">${stats.idea} ideas</span>
          <span style="color:var(--muted)">${stats.total} total</span>
        </div>
        <button onclick="openVidModal()" style="width:26px;height:26px;border-radius:8px;border:none;background:#334155;color:#fff;font-size:16px;font-weight:700;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center" title="Add video">+</button>
      </div>
    </div>
    <div class="card" style="overflow:hidden;flex:1;min-height:0">
      <div style="overflow:auto;flex:1;min-height:0">
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
  const _rvpSe2=_vidScrollEl();if(_rvpSe2)_rvpSe2.scrollTop=_rvpTop;
}

// ── DASHBOARD VIEW (default — In Progress + Ideas) ───────────────────────────
function _vidRenderDashboard(){
  const all=(st.videos||[]).filter(v=>!v.is_deleted);
  let inProgress=all.filter(v=>v.status==='in_progress');
  let ideas=all.filter(v=>v.status==='idea');
  if(_vidSearch){
    const q=_vidSearch.toLowerCase();
    const match=v=>(v.title||'').toLowerCase().includes(q)||(v.topic||'').toLowerCase().includes(q);
    inProgress=inProgress.filter(match);ideas=ideas.filter(match);
  }
  _vidDashVids=all.filter(v=>v.status!=='idea');
  return`
    <div style="display:flex;gap:0;padding:0;height:100%">
      <div style="flex:2;min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--border)" ondragover="event.preventDefault()" ondrop="_vidDashDrop(event,'in_progress')">
        <div class="vid-dash-header" style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;min-width:0;padding-left:10px">In Progress <span class="vid-count">${inProgress.length}</span></div>
          ${inProgress.length?`<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span style="width:36px;text-align:right;font-size:9px">Dur</span>
            <span style="width:52px;text-align:right;font-size:9px">Posted</span>
            <div style="display:flex;gap:0">${VID_STEPS.map(s=>`<span style="width:28px;text-align:center;font-size:9px" title="${VID_STEP_LABELS[s]}">${VID_STEP_LABELS[s].slice(0,2)}</span>`).join('')}</div>
            <button class="vid-del" style="visibility:hidden">✕</button>
          </div>`:''}
        </div>
        <div style="flex:1;min-height:0;overflow-y:auto">
          ${inProgress.length?_vidDashList(inProgress,false):'<div style="color:var(--muted);font-size:12px;padding:16px 10px">Drag ideas here to start</div>'}
        </div>
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column" ondragover="event.preventDefault()" ondrop="_vidDashDrop(event,'idea')">
        <div class="vid-dash-header">Ideas <span class="vid-count">${ideas.length}</span></div>
        <div style="flex:1;min-height:0;overflow-y:auto">
          ${ideas.length?_vidDashList(ideas,true):'<div style="color:var(--muted);font-size:12px;padding:16px 10px">No ideas yet</div>'}
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
    const children=lVids.filter(l=>l.big_video_id&&String(l.big_video_id)===String(b.id));
    children.forEach(l=>{seen.add(String(l.id));html+=_vidDashRow(l,true,simple);});
  });
  lVids.filter(l=>!seen.has(String(l.id))).forEach(l=>{html+=_vidDashRow(l,false,simple);});
  return html;
}

let _vidDashVids=null,_vidDashPostMap=null;
function _vidDashRow(v,isChild,simple){
  if(!_vidDashPostMap)_vidDashPostMap=_vidSeqMap(_vidOrderedIds(_vidDashVids||[]));
  const sid=String(v.id);
  const sel=_vidSelected.has(sid);
  const isSmall=v.video_type==='L'&&v.big_video_id;
  const indent=isChild?'padding-left:20px;':'';
  const childMark=isChild?'<span style="color:var(--muted);font-size:10px;margin-right:4px">└</span>':'';
  const titleStyle=isSmall?'color:var(--muted)':'';
  const postNum=_vidDashPostMap[sid];
  const numHtml=postNum?`<span style="color:var(--muted);font-size:10px;margin-right:6px;min-width:18px;display:inline-block">${postNum}</span>`:'';
  const titleCls='vid-title-text';
  const isComplete=v.status==='published';
  const topic=v.topic||'';
  const showTopicTitle=v.status==='in_progress'&&topic;
  const primary=isComplete?v.title:(topic||v.title);
  const secondary=showTopicTitle?v.title:'';
  if(simple){
    return`<div class="vid-dash-row${sel?' vid-sel':''}" draggable="true" ondragstart="_vidDashDragStart(event,'${sid}')" data-vid="${sid}" onclick="vidRowClick(event,'${sid}')" ondblclick="openVidEdit('${sid}')" oncontextmenu="showVidCtx(event,'${sid}')">
      <div style="flex:1;min-width:0;padding-left:10px;${indent}${!isChild?'font-weight:600;':''}${titleStyle}">${v.video_type==='B'?`<button onclick="event.stopPropagation();openVidModalForBig('${sid}')" style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:14px;text-align:center;border-radius:3px;border:1px solid var(--border);background:var(--bg);color:var(--muted);cursor:pointer;margin-right:4px" title="Add child video">+</button>`:(!isChild?'<button style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:14px;text-align:center;border-radius:3px;border:1px solid transparent;background:transparent;color:transparent;margin-right:4px;pointer-events:none">+</button>':'')}${childMark}${numHtml}${showTopicTitle?`<span class="${titleCls}">${_esc(topic)}</span><span style="font-size:10px;color:var(--muted);margin-left:4px;font-weight:400">- ${_esc(v.title)}</span>`:`<span class="${titleCls}">${_esc(primary)}</span>`}</div>
      <button class="vid-del" data-vid="${sid}">✕</button>
    </div>`;
  }
  const postStr=_vidPostStr(v.post_date);
  const durStr=v.duration_minutes?v.duration_minutes.toFixed(2):'';
  return`<div class="vid-dash-row${sel?' vid-sel':''}" draggable="true" ondragstart="_vidDashDragStart(event,'${sid}')" data-vid="${sid}" onclick="vidRowClick(event,'${sid}')" ondblclick="openVidEdit('${sid}')" oncontextmenu="showVidCtx(event,'${sid}')">
    <div style="flex:1;min-width:0;padding-left:10px;${indent}${!isChild?'font-weight:600;':''}${titleStyle}">
      ${v.video_type==='B'?`<button onclick="event.stopPropagation();openVidModalForBig('${sid}')" style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:14px;text-align:center;border-radius:3px;border:1px solid var(--border);background:var(--bg);color:var(--muted);cursor:pointer;margin-right:4px" title="Add child video">+</button>`:(!isChild?'<button style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:14px;text-align:center;border-radius:3px;border:1px solid transparent;background:transparent;color:transparent;margin-right:4px;pointer-events:none">+</button>':'')}${childMark}${numHtml}${showTopicTitle?`<span class="${titleCls}">${_esc(topic)}</span><span style="font-size:10px;color:var(--muted);margin-left:4px;font-weight:400">- ${_esc(v.title)}</span>`:`<span class="${titleCls}">${_esc(primary)}</span>`}
    </div>
    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
      <span style="width:36px;text-align:right;font-size:11px;color:var(--muted)">${durStr}</span>
      <span style="width:52px;text-align:right;font-size:11px;color:${_vidDateColor(v.post_date,v)}">${postStr||''}</span>
      <div style="display:flex;gap:0">${VID_STEPS.map(s=>`<div style="width:28px;text-align:center"><div class="vid-step-dot${v[s]==='done'?' done':v[s]==='na'?' na':''}" data-vid="${sid}" data-step="${s}" title="${VID_STEP_LABELS[s]}"></div></div>`).join('')}</div>
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
  pushUndo();v.status=newStatus;save();renderVideosPageKeepScroll();
  await sbReqSilent('PATCH','videos',{status:newStatus},`?id=eq.${v.id}`);
  _vidDashDragId=null;
}

// ── TABLE VIEW (All Details) ─────────────────────────────────────────────────
function _vidSortArrow(col){if(_vidSortCol!==col)return'';return _vidSortDir===1?' ▲':' ▼';}
function vidTblSort(col){
  if(_vidSortCol!==col){_vidSortCol=col;_vidSortDir=1;}
  else if(_vidSortDir===1){_vidSortDir=-1;}
  else{_vidSortCol=null;_vidSortDir=1;}
  renderVideosPage();
}
function _vidSortVids(vids){
  const sorted=[...vids];
  if(_vidSortCol){
    const col=_vidSortCol,dir=_vidSortDir;
    sorted.sort((a,b)=>{
      let av,bv;
      if(col==='title'){av=(a.title||'').toLowerCase();bv=(b.title||'').toLowerCase();}
      else if(col==='group'){av=a.big_video_id||0;bv=b.big_video_id||0;}
      else if(col==='playlist'){av=(a.playlist||'').toLowerCase();bv=(b.playlist||'').toLowerCase();}
      else if(col==='status'){av=a.status||'';bv=b.status||'';}
      else if(col==='duration'){av=a.duration_minutes||0;bv=b.duration_minutes||0;}
      else if(col==='posted'){av=a.post_date||'';bv=b.post_date||'';}
      else{av='';bv='';}
      if(!av&&!bv)return 0;if(!av)return 1;if(!bv)return-1;
      return av<bv?-dir:av>bv?dir:0;
    });
  }else{
    // Default: group by big video, ordered by B video's id (creation order)
    // B video first, then its children by post_date. Standalone L by own post_date.
    const allVids=(st.videos||[]).filter(v=>!v.is_deleted);
    const bMap={};
    allVids.forEach(v=>{if(v.video_type==='B')bMap[String(v.id)]=v;});
    sorted.sort((a,b)=>{
      // Group key = parent B video's post_date
      const aParent=a.video_type==='B'?a:a.big_video_id?bMap[String(a.big_video_id)]:null;
      const bParent=b.video_type==='B'?b:b.big_video_id?bMap[String(b.big_video_id)]:null;
      const aGroupDate=aParent?aParent.post_date||'9999':a.post_date||'9999';
      const bGroupDate=bParent?bParent.post_date||'9999':b.post_date||'9999';
      // Different groups — sort by B video's post_date
      if(aGroupDate!==bGroupDate)return aGroupDate.localeCompare(bGroupDate);
      // Same group date but different groups (tie-break by B id)
      const aGroupId=aParent?aParent.id:99999;
      const bGroupId=bParent?bParent.id:99999;
      if(aGroupId!==bGroupId)return aGroupId-bGroupId;
      // Same group — B first, then children by post_date
      const aIsB=a.video_type==='B'?0:1;
      const bIsB=b.video_type==='B'?0:1;
      if(aIsB!==bIsB)return aIsB-bIsB;
      const ad=a.post_date||'9999',bd=b.post_date||'9999';
      return ad.localeCompare(bd);
    });
  }
  return sorted;
}
function _vidToggleCompleted(){_vidShowCompleted=!_vidShowCompleted;renderVideosPageKeepScroll();}
function _vidRenderTable(){
  let vids=_vidFiltered();
  const today=d2s(new Date());
  if(!_vidShowCompleted){
    // Find B groups that have L children with future/today post dates
    const keepGroups=new Set();
    vids.forEach(v=>{if(v.video_type==='L'&&v.big_video_id&&v.post_date&&v.post_date>=today)keepGroups.add(String(v.big_video_id));});
    vids=vids.filter(v=>{
      // Hide published with past date
      if(v.status==='published'&&v.post_date&&v.post_date<today){
        if(v.video_type==='B'&&keepGroups.has(String(v.id)))return true;
        return false;
      }
      // Hide backup if all steps done
      if(v.status==='backup'){
        const allDone=VID_STEPS.every(s=>v[s]==='done'||v[s]==='na');
        if(allDone)return false;
      }
      return true;
    });
  }
  const sorted=_vidSortVids(vids);
  const allNonIdea=(st.videos||[]).filter(v=>!v.is_deleted&&v.status!=='idea');
  const postMap=_vidSeqMap(_vidOrderedIds(allNonIdea));
  let groupedHtml;
  if(_vidSortCol){
    groupedHtml=sorted.map(v=>_vidRow(v,false,postMap)).join('');
  }else{
    // Group B→L while maintaining post_date sort
    const seen=new Set();
    let rows='';
    const lVids=sorted.filter(v=>v.video_type!=='B');
    sorted.forEach(v=>{
      if(seen.has(String(v.id)))return;
      seen.add(String(v.id));
      rows+=_vidRow(v,false,postMap);
      if(v.video_type==='B'){
        const children=lVids.filter(l=>String(l.big_video_id)===String(v.id)&&!seen.has(String(l.id)));
        children.forEach(l=>{seen.add(String(l.id));rows+=_vidRow(l,true,postMap);});
      }
    });
    groupedHtml=rows;
  }
  const thStyle='cursor:pointer;user-select:none';
  return`<div>
    <table class="vid-tbl" style="table-layout:fixed;width:100%">
      <thead><tr>
        <th style="${thStyle}" onclick="vidTblSort('title')">Title${_vidSortArrow('title')}</th>
        <th style="width:70px;${thStyle}" onclick="vidTblSort('status')">Status${_vidSortArrow('status')}</th>
        <th style="width:50px;text-align:right;${thStyle}" onclick="vidTblSort('duration')">Dur${_vidSortArrow('duration')}</th>
        <th style="width:62px;text-align:right;${thStyle}" onclick="vidTblSort('posted')">Posted${_vidSortArrow('posted')}</th>
        ${VID_STEPS.map(s=>`<th style="width:28px;text-align:center;font-size:9px" title="${VID_STEP_LABELS[s]}">${VID_STEP_LABELS[s].slice(0,2)}</th>`).join('')}
        <th style="width:36px"><button onclick="_vidToggleCompleted()" style="font-size:14px;font-weight:700;width:24px;height:24px;line-height:22px;text-align:center;border-radius:6px;border:1.5px solid var(--border);background:${_vidShowCompleted?'rgba(14,165,233,.12)':'var(--bg)'};color:${_vidShowCompleted?'#0ea5e9':'var(--muted)'};cursor:pointer" title="${_vidShowCompleted?'Hide':'Show'} Completed">${_vidShowCompleted?'−':'+'}</button></th>
      </tr></thead>
      <tbody>${groupedHtml}</tbody>
    </table>
  </div>`;
}

function _vidChildSort(a,b){
  // posted (has date) first, then in_progress, then ideas
  const order={published:0,in_progress:1,idea:2,backup:3};
  const sa=order[a.status]??9,sb=order[b.status]??9;
  if(sa!==sb)return sa-sb;
  if(a.post_date&&b.post_date)return a.post_date.localeCompare(b.post_date);
  if(a.post_date)return-1;if(b.post_date)return 1;
  return 0;
}
function _vidBuildRows(vids){
  const seen=new Set();
  let html='';
  const bVids=vids.filter(v=>v.video_type==='B');
  const lVids=vids.filter(v=>v.video_type!=='B');
  const bSorted=[...bVids].sort((a,b)=>{
    const aKids=lVids.filter(l=>l.big_video_id&&String(l.big_video_id)===String(a.id));
    const bKids=lVids.filter(l=>l.big_video_id&&String(l.big_video_id)===String(b.id));
    const aHasIP=a.status==='in_progress'||aKids.some(l=>l.status==='in_progress');
    const bHasIP=b.status==='in_progress'||bKids.some(l=>l.status==='in_progress');
    if(aHasIP&&!bHasIP)return-1;if(!aHasIP&&bHasIP)return 1;
    const aOrder={published:2,in_progress:0,idea:1,backup:3}[a.status]??9;
    const bOrder={published:2,in_progress:0,idea:1,backup:3}[b.status]??9;
    return aOrder-bOrder;
  });
  bSorted.forEach(b=>{
    seen.add(String(b.id));
    html+=_vidRow(b,false);
    const children=lVids.filter(l=>l.big_video_id&&String(l.big_video_id)===String(b.id)).sort(_vidChildSort);
    children.forEach(l=>{seen.add(String(l.id));html+=_vidRow(l,true);});
  });
  lVids.filter(l=>!seen.has(String(l.id))).sort(_vidChildSort).forEach(l=>{html+=_vidRow(l,false);});
  return html;
}

function _vidRow(v,isChild,postMap){
  const sid=String(v.id);
  const sel=_vidSelected.has(sid);
  const sc=VID_STATUS_COLORS[v.status]||'#94a3b8';
  const postStr=_vidPostStr(v.post_date,true);
  const durStr=v.duration_minutes?v.duration_minutes.toFixed(2):'';
  const isSmall=v.video_type==='L'&&v.big_video_id;
  const indent=isChild?'padding-left:32px;':'padding-left:16px;';
  const childMark=isChild?'<span style="color:var(--muted);font-size:10px;margin-right:4px">└</span>':'';
  const titleColor=isSmall?'color:var(--muted);':'';
  const postNum=postMap&&postMap[sid];
  const numHtml=postNum?`<span style="color:var(--muted);font-size:10px;margin-right:6px;min-width:18px;display:inline-block">${postNum}</span>`:'';
  const addBtn=v.video_type==='B'?`<button onclick="event.stopPropagation();openVidModalForBig('${sid}')" style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:14px;text-align:center;border-radius:3px;border:1px solid var(--border);background:var(--bg);color:var(--muted);cursor:pointer;margin-right:4px;flex-shrink:0" title="Add child video">+</button>`:(!isChild?'<button style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:14px;text-align:center;border-radius:3px;border:1px solid transparent;background:transparent;color:transparent;margin-right:4px;pointer-events:none;flex-shrink:0">+</button>':'');
  return`<tr class="vid-row${sel?' vid-sel':''}" data-vid="${sid}" onclick="vidCellClick(event,'${sid}')" ondblclick="openVidEdit('${sid}')" oncontextmenu="showVidCtx(event,'${sid}')">
    <td data-field="title" style="${indent}${!isChild?'font-weight:600;':''}${titleColor}overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${addBtn}${childMark}${numHtml}${v.status==='in_progress'&&v.topic?`<span class="vid-title-text">${_esc(v.topic)}</span><span style="font-size:10px;color:var(--muted);margin-left:4px;font-weight:400">- ${_esc(v.title)}</span>`:`<span class="vid-title-text">${_esc(v.title)}</span>`}</td>
    <td data-field="status"><span class="vid-status-pill" style="background:${sc}20;color:${sc}">${v.status}</span></td>
    <td data-field="duration_minutes" style="text-align:right;font-size:11px;color:var(--muted)">${durStr}</td>
    <td data-field="post_date" style="text-align:right;font-size:11px;color:${_vidDateColor(v.post_date,v)}">${postStr}</td>
    ${VID_STEPS.map(s=>`<td style="text-align:center"><div class="vid-step-dot${v[s]==='done'?' done':v[s]==='na'?' na':''}" data-vid="${sid}" data-step="${s}" title="${VID_STEP_LABELS[s]}"></div></td>`).join('')}
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
      ${v.big_video_id?`<span style="font-size:9px;color:var(--muted)">${_esc(((st.videos||[]).find(x=>x.id==v.big_video_id)||{}).title||'')}</span>`:''}
    </div>
    <div style="font-size:12px;font-weight:${v.video_type==='B'||!v.big_video_id?'500':'400'};color:${v.video_type==='L'&&v.big_video_id?'var(--muted)':'var(--text)'};line-height:1.35;margin-bottom:4px">${_esc(v.title)}</div>
    <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--muted)">
      ${postStr?`<span>${postStr}</span>`:''}
      ${v.duration_minutes?`<span>${v.duration_minutes.toFixed(2)}</span>`:''}
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
  save();renderVideosPageKeepScroll();
  const patch={status:newStatus};
  if(newStatus==='published'&&v.post_date)patch.post_date=v.post_date;
  pushUndo(async()=>{v.status=prev;save();renderVideosPageKeepScroll();await sbReqSilent('PATCH','videos',{status:prev},`?id=eq.${_vidDragId}`);},'Status change');
  await sbReqSilent('PATCH','videos',patch,`?id=eq.${_vidDragId}`);
  _vidDragId=null;
}

// ── GROUPS VIEW ──────────────────────────────────────────────────────────────
function _vidRenderGroups(){
  const vids=_vidFiltered();
  const groupNames=_vidGroups();
  const ungrouped=vids.filter(v=>!v.big_video_id);
  let html='<div class="vid-groups-grid">';
  groupNames.forEach(gn=>{
    const bVid=(st.videos||[]).find(v=>!v.is_deleted&&String(v.id)===String(gn));
    const bTitle=bVid?bVid.title:'Unknown';
    const gVids=vids.filter(v=>String(v.big_video_id)===String(gn)||String(v.id)===String(gn));
    const lVids=gVids.filter(v=>v.video_type!=='B');
    const pub=gVids.filter(v=>v.status==='published').length;
    const total=gVids.length;
    const pct=total?Math.round(pub/total*100):0;
    const sc=pct===100?'#10b981':pct>0?'#f59e0b':'#8b5cf6';
    html+=`<div class="vid-group-card" onclick="_vidSetGroup('${gn}');_vidSetView('table')">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:13px;font-weight:700;color:var(--text)">${_esc(bTitle)}</span>
        <span style="font-size:10px;font-weight:600;color:${sc}">${pub}/${total}</span>
      </div>
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

// ── MONTHLY VIEW ─────────────────────────────────────────────────────────────
function _vidMonthNav(dir){_vidMonthOffset+=dir;renderVideosPage();}
function _vidRenderMonthly(){
  const now=new Date();
  const viewDate=new Date(now.getFullYear(),now.getMonth()+_vidMonthOffset,1);
  const year=viewDate.getFullYear(),month=viewDate.getMonth();
  const monthStr=viewDate.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDow=new Date(year,month,1).getDay();

  const all=(st.videos||[]).filter(v=>!v.is_deleted&&v.post_date);
  // Videos posted this month
  const pad=n=>String(n).padStart(2,'0');
  const mKey=`${year}-${pad(month+1)}`;
  const monthVids=all.filter(v=>v.post_date.startsWith(mKey));
  const byDay={};
  monthVids.forEach(v=>{const d=parseInt(v.post_date.slice(8,10));(byDay[d]=byDay[d]||[]).push(v);});

  // Stats for this month
  const pubCount=monthVids.filter(v=>v.status==='published').length;
  const totalCount=monthVids.length;

  let cells='';
  // Day-of-week headers
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{
    cells+=`<div style="text-align:center;font-size:10px;font-weight:600;color:var(--muted);padding:4px 0">${d}</div>`;
  });
  // Empty cells before first day
  for(let i=0;i<firstDow;i++)cells+=`<div></div>`;
  // Day cells
  const todayStr=d2s(new Date());
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${year}-${pad(month+1)}-${pad(d)}`;
    const isToday=dateStr===todayStr;
    const vids=byDay[d]||[];
    const dayStyle=isToday?'border:1.5px solid #0ea5e9;':'border:1px solid var(--border);';
    cells+=`<div style="${dayStyle}border-radius:6px;min-height:60px;padding:3px;overflow:hidden">
      <div style="font-size:10px;font-weight:600;color:${isToday?'#0ea5e9':'var(--muted)'};margin-bottom:2px">${d}</div>
      ${vids.map(v=>{
        const sc=VID_STATUS_COLORS[v.status]||'#94a3b8';
        const isB=v.video_type==='B';
        const isSmallCal=v.video_type==='L'&&v.big_video_id;
        return`<div style="font-size:9px;padding:2px 3px;margin-bottom:1px;border-radius:3px;background:${sc}15;color:${sc};cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isB?'font-weight:600;':''}${isSmallCal?'opacity:.6;':''}" title="${_esc(v.title)}" ondblclick="openVidEdit('${v.id}')">${v.number?'#'+v.number+' ':''}${_esc(v.title)}</div>`;
      }).join('')}
    </div>`;
  }

  const totalCells=firstDow+daysInMonth;
  const numRows=Math.ceil(totalCells/7);
  return`<div style="padding:8px;display:flex;flex-direction:column;height:100%">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-shrink:0">
      <button class="vid-filter-btn" onclick="_vidMonthNav(-1)" style="padding:3px 10px">← Prev</button>
      <span style="font-size:14px;font-weight:700;color:var(--text)">${monthStr} <span style="font-size:11px;font-weight:400;color:var(--muted)">${pubCount} published · ${totalCount} total</span></span>
      <button class="vid-filter-btn" onclick="_vidMonthNav(1)" style="padding:3px 10px">Next →</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);grid-template-rows:auto repeat(${numRows},1fr);gap:3px;flex:1;min-height:0">${cells}</div>
  </div>`;
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

function vidCellClick(e,id){
  if(e.target.closest('.vid-del')||e.target.closest('.vid-step-dot'))return;
  const td=e.target.closest('td');
  const field=td&&td.dataset.field;
  if(field&&_vidView==='table'){vidCellEdit(td,id,field);return;}
  vidRowClick(e,id);
}

function vidCellEdit(td,id,field){
  if(td._editing)return;
  const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(!v)return;
  td._editing=true;
  const elStyle='width:100%;font-size:11px;border:1px solid var(--border);border-radius:4px;padding:2px 4px;background:var(--bg);color:var(--text);outline:none;font-family:inherit;box-sizing:border-box';
  let el;
  if(field==='status'){
    el=document.createElement('select');
    ['idea','in_progress','published','backup'].forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;if(v.status===s)o.selected=true;el.appendChild(o);});
  }else if(field==='duration_minutes'){
    el=document.createElement('input');el.type='number';el.step='0.01';el.value=v.duration_minutes||'';
  }else if(field==='post_date'){
    el=document.createElement('input');el.type='date';el.value=v.post_date||'';
  }else if(field==='title'){
    el=document.createElement('input');el.value=v.title||'';
  }else{return;}
  el.style.cssText=elStyle;
  const origHtml=td.innerHTML;
  td.textContent='';td.appendChild(el);
  requestAnimationFrame(()=>{el.focus();if(el.tagName==='INPUT'&&el.type==='text'){const l=el.value.length;el.setSelectionRange(l,l);}});
  let saved=false;
  const doSave=async()=>{
    if(saved)return;saved=true;td._editing=false;
    let val=el.value;
    if(field==='duration_minutes')val=val?parseFloat(val):null;
    if(field==='post_date')val=val||null;
    const prev=v[field]??null;
    if(val===prev){td.innerHTML=origHtml;return;}
    v[field]=val;save();
    pushUndo(async()=>{v[field]=prev;save();renderVideosPageKeepScroll();await sbReqSilent('PATCH','videos',{[field]:prev},`?id=eq.${id}`);},'Edit '+field);
    await sbReqSilent('PATCH','videos',{[field]:val},`?id=eq.${id}`);
    renderVideosPageKeepScroll();
  };
  el.onblur=doSave;
  el.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();el.blur();}if(ev.key==='Escape'){saved=true;td._editing=false;td.innerHTML=origHtml;}};
  if(el.tagName==='SELECT')el.onchange=()=>{el.blur();};
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
let _vidDropdownData={BigVideo:[],Playlist:[]};

function _vidPopulatePlaylistList(){
  const playlists=new Set();
  (st.videos||[]).forEach(v=>{if(v.playlist&&!v.is_deleted)playlists.add(v.playlist);});
  _vidDropdownData.Playlist=[...playlists].sort();
}
function _vidPopulateBigVideoSelect(selectedId){
  const inp=document.getElementById('vmBigVideo');
  const bVids=(st.videos||[]).filter(v=>!v.is_deleted&&v.video_type==='B').sort((a,b)=>(a.title||'').localeCompare(b.title||''));
  _vidDropdownData.BigVideo=bVids.map(v=>({id:v.id,label:v.title}));
  if(selectedId){
    const match=bVids.find(v=>String(v.id)===String(selectedId));
    inp.value=match?match.title:'';
  }else{inp.value='';}
}
function _vidGetBigVideoId(){
  const title=document.getElementById('vmBigVideo').value.trim();
  if(!title)return null;
  const match=(st.videos||[]).find(v=>!v.is_deleted&&v.video_type==='B'&&v.title===title);
  return match?match.id:null;
}

function _vidShowDropdown(type){_vidFilterDropdown(type);}
function _vidToggleDropdown(type){
  const drop=document.getElementById('vm'+type+'Drop');
  if(drop.style.display==='block'){drop.style.display='none';return;}
  _vidFilterDropdown(type);
}
function _vidFilterDropdown(type){
  const inp=document.getElementById('vm'+type);
  const drop=document.getElementById('vm'+type+'Drop');
  const q=(inp.value||'').toLowerCase();
  const itemStyle='padding:6px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid rgba(210,205,228,.1)';
  const hoverIn="this.style.background='rgba(139,92,246,.08)'";
  const hoverOut="this.style.background='transparent'";
  let html='';
  if(type==='BigVideo'){
    const items=_vidDropdownData.BigVideo.filter(v=>!q||v.label.toLowerCase().includes(q));
    html=`<div onclick="_vidPickDropdown('BigVideo','')" onmouseenter="${hoverIn}" onmouseleave="${hoverOut}" style="${itemStyle};color:var(--muted);font-style:italic">None</div>`;
    html+=items.map(v=>`<div onclick="_vidPickDropdown('BigVideo','${_esc(v.label)}')" onmouseenter="${hoverIn}" onmouseleave="${hoverOut}" style="${itemStyle}">${_esc(v.label)}</div>`).join('');
  }else{
    const items=_vidDropdownData.Playlist.filter(p=>!q||p.toLowerCase().includes(q));
    html=items.map(p=>`<div onclick="_vidPickDropdown('Playlist','${_esc(p)}')" onmouseenter="${hoverIn}" onmouseleave="${hoverOut}" style="${itemStyle}">${_esc(p)}</div>`).join('');
    if(!items.length)html=`<div style="${itemStyle};color:var(--muted);font-style:italic">Type to add new</div>`;
  }
  drop.innerHTML=html;
  drop.style.display='block';
}
function _vidPickDropdown(type,val){
  document.getElementById('vm'+type).value=val;
  document.getElementById('vm'+type+'Drop').style.display='none';
}
document.addEventListener('click',e=>{
  if(!e.target.closest('#vmBigVideo')&&!e.target.closest('#vmBigVideoDrop')&&!e.target.closest('[onclick*="BigVideo"]')){
    const d=document.getElementById('vmBigVideoDrop');if(d)d.style.display='none';
  }
});

function openVidModalForBig(bigId){
  openVidModal('L');
  document.getElementById('vmType').value='L';
  _vidPopulateBigVideoSelect(bigId);
}

function openVidModal(type){
  _vidMode='add';_vidEditId=null;
  document.getElementById('vidMTitle').textContent='Add Video';
  document.getElementById('vmTitle').value='';
  document.getElementById('vmTopic').value='';
  document.getElementById('vmType').value=type||'B';
  document.getElementById('vmStatus').value='idea';
  document.getElementById('vmPostDate').value='';
  document.getElementById('vmDuration').value='';

  document.getElementById('vmBigVideoWrap').style.display=(type||'B')==='B'?'none':'';
  _vidPopulateBigVideoSelect('');
  const defaults={};
  if(type==='L'){defaults.step_tableau_public='na';defaults.step_upload_tableau='na';}
  _vidRenderSteps(defaults);
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

  document.getElementById('vmBigVideoWrap').style.display=v.video_type==='B'?'none':'';
  _vidPopulateBigVideoSelect(v.big_video_id||'');
  const stepVals={};VID_STEPS.forEach(s=>{stepVals[s]=v[s]||'not_started';});
  _vidRenderSteps(stepVals);
  document.getElementById('vidModal').classList.add('open');
  setTimeout(()=>{const inp=document.getElementById('vmTitle');inp.focus();const len=inp.value.length;inp.setSelectionRange(len,len);},80);
}

function _vidRenderSteps(vals){
  const el=document.getElementById('vmSteps');
  el.innerHTML=VID_STEPS.map(s=>{
    const cur=vals[s]||'not_started';
    return`<div style="display:flex;flex-direction:column;gap:2px;align-items:center">
      <span style="font-size:9px;color:${cur==='na'?'var(--border)':'var(--muted)'}">${VID_STEP_LABELS[s]}</span>
      <div data-step="${s}" data-val="${cur}" onclick="_vidToggleModalStep(this)" oncontextmenu="_vidNaModalStep(event,this);return false" style="${_vidModalStepCSS(cur)}"></div>
    </div>`;
  }).join('');
}
function _vidModalStepCSS(val){
  const base='width:24px;height:24px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;user-select:none;';
  if(val==='done')return base+'border:2px solid #10b981;background:#10b981;color:#fff';
  if(val==='na')return base+'border:none;background:transparent;color:transparent';
  return base+'border:2px solid var(--border);background:transparent;color:transparent';
}
function _vidToggleModalStep(el){
  const cur=el.dataset.val;
  if(cur==='na')return;
  const next=cur==='done'?'not_started':'done';
  el.dataset.val=next;
  _vidUpdateModalStep(el,next);
}
function _vidNaModalStep(e,el){
  e.preventDefault();
  const cur=el.dataset.val;
  const next=cur==='na'?'not_started':'na';
  el.dataset.val=next;
  _vidUpdateModalStep(el,next);
}
function _vidTypeChanged(type){
  document.getElementById('vmBigVideoWrap').style.display=type==='B'?'none':'';
  if(type==='B'){document.getElementById('vmBigVideo').value='';}
  if(_vidMode!=='add')return;
  const els=document.querySelectorAll('#vmSteps [data-step]');
  els.forEach(el=>{
    const s=el.dataset.step;
    if(type==='L'&&(s==='step_tableau_public'||s==='step_upload_tableau')){
      el.dataset.val='na';_vidUpdateModalStep(el,'na');
    }else if(el.dataset.val==='na'&&(s==='step_tableau_public'||s==='step_upload_tableau')){
      el.dataset.val='not_started';_vidUpdateModalStep(el,'not_started');
    }
  });
}
function _vidUpdateModalStep(el,val){
  el.style.cssText=_vidModalStepCSS(val);
  el.textContent=val==='done'?'✓':'';
  el.parentElement.querySelector('span').style.color=val==='na'?'var(--border)':'var(--muted)';
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

    big_video_id:_vidGetBigVideoId(),
    playlist:null
  };
  document.querySelectorAll('#vmSteps [data-step]').forEach(el=>{data[el.dataset.step]=el.dataset.val||'not_started';});
  // Default Tab Pub + Upload to na for L-type videos with a parent group (not standalone)
  if(_vidMode==='add'&&data.video_type==='L'&&data.big_video_id){
    if(!data.step_tableau_public||data.step_tableau_public==='not_started')data.step_tableau_public='na';
    if(!data.step_upload_tableau||data.step_upload_tableau==='not_started')data.step_upload_tableau='na';
  }
  closeMod('vidModal');

  if(_vidMode==='edit'&&_vidEditId){
    const v=(st.videos||[]).find(x=>String(x.id)===String(_vidEditId));
    if(v){
      const prev={...v};
      Object.assign(v,data);
      const coreSteps=VID_STEPS.filter(s=>s!=='step_tableau_public'&&s!=='step_upload_tableau');
      const coreDone=coreSteps.every(s=>v[s]==='done'||v[s]==='na');
      if(coreDone&&v.post_date&&v.duration_minutes&&v.status!=='published'){v.status='published';data.status='published';}
      else if((!coreDone||!v.post_date||!v.duration_minutes)&&v.status==='published'){v.status='in_progress';data.status='in_progress';}
      save();renderVideosPageKeepScroll();
      pushUndo(async()=>{Object.assign(v,prev);save();renderVideosPageKeepScroll();await sbReqSilent('PATCH','videos',prev,`?id=eq.${_vidEditId}`);},'Edited video');
      await sbReqSilent('PATCH','videos',data,`?id=eq.${_vidEditId}`);
    }
  }else{
    const tmp='l-'+Date.now();
    const rec={id:tmp,...data};
    st.videos.push(rec);save();renderVideosPageKeepScroll();
    const sv=await sbReqSilent('POST','videos',data);
    if(sv&&sv[0]){const ix=st.videos.findIndex(x=>x.id===tmp);if(ix>-1)st.videos[ix]=sv[0];}
    save();renderVideosPageKeepScroll();
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function delVideo(id){
  const sid=String(id);
  const v=(st.videos||[]).find(x=>String(x.id)===sid);if(!v)return;
  const copy={...v};
  st.videos=st.videos.filter(x=>String(x.id)!==sid);
  _vidSelected.delete(sid);
  save();renderVideosPageKeepScroll();
  pushUndo(async()=>{st.videos.push(copy);save();renderVideosPageKeepScroll();await sbReqSilent('POST','videos',copy);},'Deleted video');
  if(!sid.startsWith('l-'))await sbReqSilent('DELETE','videos',null,`?id=eq.${sid}`);
}

// ── Duplicate ─────────────────────────────────────────────────────────────────
async function _vidDuplicate(id){
  const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(!v)return;
  const dup={...v,id:'l-'+Date.now(),number:null,post_date:null,status:'idea'};
  delete dup.created_at;
  st.videos.push(dup);save();renderVideosPageKeepScroll();
  const{id:_,...payload}=dup;
  const sv=await sbReqSilent('POST','videos',payload);
  if(sv&&sv[0]){const ix=st.videos.findIndex(x=>x.id===dup.id);if(ix>-1)st.videos[ix]=sv[0];}
  save();renderVideosPageKeepScroll();
}

// ── Cycle Step ────────────────────────────────────────────────────────────────
async function cycleVidStep(id,step){
  const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(!v)return;
  const cur=v[step]||'not_started';
  const next=cur==='na'?'not_started':cur==='done'?'not_started':'done';
  const prev=cur;
  const prevStatus=v.status;
  v[step]=next;
  // Auto-complete: core steps done + has date → published (Tab Pub & Upload excluded)
  const coreSteps=VID_STEPS.filter(s=>s!=='step_tableau_public'&&s!=='step_upload_tableau');
  const coreDone=coreSteps.every(s=>v[s]==='done'||v[s]==='na');
  const wasDone=coreSteps.every(s=>(s===step?cur:v[s]||'not_started')==='done'||(s===step?cur:v[s]||'not_started')==='na');
  if(coreDone&&v.post_date&&v.duration_minutes&&v.status!=='published'){
    v.status='published';
  }else if((!coreDone||!v.post_date||!v.duration_minutes)&&v.status==='published'&&prevStatus==='published'){
    v.status='in_progress';
  }
  const patch={[step]:next};
  if(v.status!==prevStatus)patch.status=v.status;
  save();renderVideosPageKeepScroll();
  if(coreDone&&v.post_date&&v.duration_minutes&&!wasDone)_vidCelebrate(id);
  pushUndo(async()=>{v[step]=prev;v.status=prevStatus;save();renderVideosPageKeepScroll();await sbReqSilent('PATCH','videos',{[step]:prev,status:prevStatus},`?id=eq.${id}`);},'Step change');
  await sbReqSilent('PATCH','videos',patch,`?id=eq.${id}`);
}

function _vidCelebrate(id){
  const row=document.querySelector(`[data-vid="${id}"]`);if(!row)return;
  const rect=row.getBoundingClientRect();
  // Glow pulse (inset so it stays within the row)
  row.style.transition='box-shadow .4s';
  row.style.boxShadow='inset 0 0 12px rgba(16,185,129,.35)';
  // Shimmer sweep
  const shimmer=document.createElement('div');
  shimmer.style.cssText='position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(16,185,129,.15),transparent);pointer-events:none;border-radius:inherit;z-index:5';
  const prevPos=row.style.position;const prevOvf=row.style.overflow;
  row.style.position='relative';row.style.overflow='hidden';
  row.appendChild(shimmer);
  shimmer.style.transition='left 1s ease-in-out';
  requestAnimationFrame(()=>requestAnimationFrame(()=>shimmer.style.left='140%'));
  // Green confetti around (not inside) the row
  const colors=['#10b981','#4ade80','#bbf7d0','#16a34a','#a7f3d0'];
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  for(let i=0;i<24;i++){
    const p=document.createElement('div');
    const sz=Math.random()*6+3;
    // Start from edges of row, not center
    const side=Math.floor(Math.random()*4);
    let sx,sy;
    if(side===0){sx=rect.left+Math.random()*rect.width;sy=rect.top-2;}
    else if(side===1){sx=rect.left+Math.random()*rect.width;sy=rect.bottom+2;}
    else if(side===2){sx=rect.left-2;sy=rect.top+Math.random()*rect.height;}
    else{sx=rect.right+2;sy=rect.top+Math.random()*rect.height;}
    const angle=Math.atan2(sy-cy,sx-cx);
    const dist=40+Math.random()*80;
    const dx=Math.cos(angle)*dist,dy=Math.sin(angle)*dist;
    p.style.cssText=`position:fixed;left:${sx}px;top:${sy}px;width:${sz}px;height:${sz}px;border-radius:${Math.random()>.4?'50%':'2px'};background:${colors[i%colors.length]};pointer-events:none;z-index:9999;opacity:1;transition:all .8s cubic-bezier(.15,.46,.45,.94)`;
    document.body.appendChild(p);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      p.style.left=sx+dx+'px';p.style.top=sy+dy+'px';p.style.opacity='0';
      p.style.transform=`scale(0.2) rotate(${Math.random()*360}deg)`;
    }));
    setTimeout(()=>p.remove(),900);
  }
  // Reset
  setTimeout(()=>{
    row.style.boxShadow='';
    shimmer.remove();row.style.position=prevPos;row.style.overflow=prevOvf;
    setTimeout(()=>row.style.transition='',300);
  },1800);
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if(activePg!=='videos')return;
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT'||e.target.isContentEditable)return;
  if((e.key==='Delete'||e.key==='Backspace')&&_vidSelected.size>0){e.preventDefault();[..._vidSelected].forEach(id=>delVideo(id));return;}
  if((e.metaKey||e.ctrlKey)&&e.key==='c'&&_vidSelected.size>0){e.preventDefault();_vidCopied=[];_vidSelected.forEach(id=>{const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(v)_vidCopied.push({...v});});showToast('Copied '+_vidCopied.length+' video(s)','#0ea5e9',1500);return;}
  if((e.metaKey||e.ctrlKey)&&e.key==='v'&&_vidCopied.length>0){e.preventDefault();_vidCopied.forEach(v=>_vidDuplicate(v.id));return;}
  if(e.key==='n'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();openVidModal();return;}
  if(e.key==='ArrowLeft'&&!e.metaKey&&!e.ctrlKey&&_vidSelected.size===0){e.preventDefault();const tabs=['dashboard','table','board','monthly'];const i=tabs.indexOf(_vidView);if(i>0)_vidSetView(tabs[i-1]);return;}
  if(e.key==='ArrowRight'&&!e.metaKey&&!e.ctrlKey&&_vidSelected.size===0){e.preventDefault();const tabs=['dashboard','table','board','monthly'];const i=tabs.indexOf(_vidView);if(i<tabs.length-1)_vidSetView(tabs[i+1]);return;}
  if(e.key==='ArrowUp'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();const se=_vidScrollEl();if(se)se.scrollTop=0;return;}
  if(e.key==='ArrowDown'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();const se=_vidScrollEl();if(se)se.scrollTop=se.scrollHeight;return;}
  if(e.key==='e'&&!e.metaKey&&!e.ctrlKey&&_vidView==='table'){e.preventDefault();if(!_vidShowCompleted){_vidShowCompleted=true;renderVideosPageKeepScroll();}return;}
  if(e.key==='c'&&!e.metaKey&&!e.ctrlKey&&_vidView==='table'){e.preventDefault();if(_vidShowCompleted){_vidShowCompleted=false;renderVideosPageKeepScroll();}return;}
});

// ── Close context menu on click elsewhere ─────────────────────────────────────
document.addEventListener('click',e=>{if(!e.target.closest('#vidCtxMenu'))document.getElementById('vidCtxMenu').style.display='none';});

function _esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
