// ── YouTube Analytics ────────────────────────────────────────────────────────
let _ytData=null,_ytMatch=null,_ytFetched=false;
function _ytEsc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function _ytDur(iso){var m=iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);if(!m)return'0:00';var h=m[1]?parseInt(m[1]):0,min=m[2]?parseInt(m[2]):0,s=m[3]?parseInt(m[3]):0;if(h)return h+':'+String(min).padStart(2,'0')+':'+String(s).padStart(2,'0');return min+':'+String(s).padStart(2,'0');}
function _ytNum(n){if(n>=1000000)return(n/1000000).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'K';return String(n);}
function _ytBuildMatch(){
  if(!_ytData||!_ytData.videos||!st.videos){console.log('[YT] _ytBuildMatch bail:',!_ytData,!_ytData?.videos,!st.videos);return;}
  _ytMatch={};
  var ytVids=_ytData.videos;
  var dbVids=(st.videos||[]).filter(function(v){return!v.is_deleted;});
  var usedYt=new Set();
  console.log('[YT] Matching',dbVids.length,'db videos against',ytVids.length,'yt videos');
  // Log first 3 of each for date format check
  console.log('[YT] Sample DB dates:',dbVids.slice(0,3).map(v=>v.post_date));
  console.log('[YT] Sample YT dates:',ytVids.slice(0,3).map(v=>v.publishedAt));
  // Pass 1: match by post_date = publishedAt date
  var matched=0;
  for(var i=0;i<dbVids.length;i++){
    var dv=dbVids[i];
    if(!dv.post_date)continue;
    for(var j=0;j<ytVids.length;j++){
      if(usedYt.has(j))continue;
      var yt=ytVids[j];
      var ytDate=yt.publishedAt.slice(0,10);
      if(dv.post_date===ytDate){
        _ytMatch[String(dv.id)]={views:yt.views,likes:yt.likes,comments:yt.comments,ytId:yt.id};
        usedYt.add(j);
        matched++;
        break;
      }
    }
  }
  console.log('[YT] Matched',matched,'videos. _ytMatch keys:',Object.keys(_ytMatch).length);
  if(matched===0&&dbVids.length>0&&ytVids.length>0){
    // Debug: show why first db video didn't match
    var first=dbVids.find(v=>v.post_date);
    if(first)console.log('[YT] No match debug - DB:',first.post_date,'(type:'+typeof first.post_date+') vs YT dates:',ytVids.slice(0,5).map(v=>v.publishedAt.slice(0,10)));
  }
}
function _ytForVid(id){return _ytMatch?_ytMatch[String(id)]:null;}

// ── Videos Page ─────────────────────────────────────────────────────────────
let _vidMode='add',_vidEditId=null;
let _vidSelected=new Set(),_vidChildSelected=new Set(),_vidLastSel=null,_vidCopied=[];
let _vidCtxId=null;
let _vidFilter='all';
let _vidGroupFilter='all';
let _vidSearch='';
let _vidView='dashboard'; // dashboard | table | board | groups
let _vidSortCol=null,_vidSortDir=1,_vidShowCompleted=false;
let _vidMonthOffset=0; // 0=current month, -1=last month, etc

const VID_STEPS=['step_build','step_vo','step_cut','step_thumbnail','step_description','step_tableau_public','step_upload_tableau'];
const VID_STEP_LABELS={step_build:'Build',step_vo:'Vo',step_film:'Film',step_cut:'Cut',step_thumbnail:'Th',step_description:'Des',step_tableau_public:'Tab',step_upload_tableau:'Up'};
const VID_STATUS_COLORS={published:'#10b981',in_progress:'#f59e0b',up_next:'#0ea5e9',idea:'#8b5cf6',backup:'#94a3b8'};
const VID_STATUS_LABELS={published:'Complete',in_progress:'In Progress',up_next:'Up Next',idea:'Idea',backup:'Backup'};
const VID_STATUS_ORDER={published:0,up_next:1,in_progress:2,backup:3,idea:4};
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
  return{total:vids.length,published:vids.filter(v=>v.status==='published').length,in_progress:vids.filter(v=>v.status==='in_progress').length,up_next:vids.filter(v=>v.status==='up_next').length,idea:vids.filter(v=>v.status==='idea').length,backup:vids.filter(v=>v.status==='backup').length};
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
  const dl=document.getElementById('vidDashLeft');const dlTop=dl?dl.scrollTop:0;
  const dr=document.getElementById('vidDashRight');const drTop=dr?dr.scrollTop:0;
  renderVideosPage();
  const se2=_vidScrollEl();if(se2)se2.scrollTop=top;
  requestAnimationFrame(()=>{
    const dl2=document.getElementById('vidDashLeft');if(dl2)dl2.scrollTop=dlTop;
    const dr2=document.getElementById('vidDashRight');if(dr2)dr2.scrollTop=drTop;
  });
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
  // Enforce: B videos cannot have big_video_id
  bVids.forEach(v=>{if(v.big_video_id){v.big_video_id=null;if(!String(v.id).startsWith('l-'))sbReqSilent('PATCH','videos',{big_video_id:null},`?id=eq.${v.id}`);}});
  // Enforce: L videos without a valid big parent can't be in_progress/up_next
  const _activeBigIds=new Set(bVids.map(v=>String(v.id)));
  const _fixedIds=[];
  st.videos.forEach(v=>{
    if(v.is_deleted||v.video_type==='B')return;
    const hasValidParent=v.big_video_id&&_activeBigIds.has(String(v.big_video_id));
    if(!hasValidParent&&(v.status==='in_progress'||v.status==='up_next')){v.status='idea';_fixedIds.push(v.id);}
  });
  if(_fixedIds.length){save();_fixedIds.forEach(id=>{if(!String(id).startsWith('l-'))sbReqSilent('PATCH','videos',{status:'idea'},`?id=eq.${id}`);});}
  // Push any local-only videos to Supabase
  _vidSyncLocalVideos();
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
  el.style.cssText='padding:41px clamp(12px,3vw,56px) 24px clamp(12px,3vw,56px);display:flex;flex-direction:column;height:100vh;box-sizing:border-box;width:100%';
  el.innerHTML=`
    <div class="ov-topbar"><div class="ov-topbar-left"><span class="ov-topbar-label">Videos</span><span class="ov-topbar-dot"></span></div><span class="ov-topbar-date topbar-date"></span><div class="ov-topbar-right"><span class="ov-topbar-dot"></span><span class="ov-topbar-time topbar-time"></span></div></div>
    <div style="padding-top:4px">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:4px;flex-wrap:wrap">
        <div style="display:flex;gap:2px;background:var(--glass);border:1px solid var(--border);border-radius:8px;padding:2px">
          <button class="${viewBtnS('dashboard')}" onclick="_vidSetView('dashboard')">Current</button>
          <button class="${viewBtnS('table')}" onclick="_vidSetView('table')">All Details</button>
          <button class="${viewBtnS('board')}" onclick="_vidSetView('board')">Videos by Progress</button>
          <button class="${viewBtnS('monthly')}" onclick="_vidSetView('monthly')">Monthly</button>
        </div>
        <input id="vidSearchInput" type="text" placeholder="Search videos..." value="${_vidSearch.replace(/"/g,'&quot;')}" oninput="_vidSetSearch(this.value)" style="padding:5px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:12px;background:var(--bg);color:var(--text);outline:none;width:180px">
        <div style="flex:1"></div>
        <div style="display:flex;gap:6px;align-items:center">
          ${_ytData&&_ytData.channelStats?`
          <div style="background:rgba(120,113,145,.06);border-radius:20px;padding:4px 10px 4px 8px;display:flex;align-items:center;gap:4px;font-size:12px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span style="font-weight:600;color:#555">${_ytNum(_ytData.channelStats.subscribers)}</span>
          </div>
          <div style="background:rgba(120,113,145,.06);border-radius:20px;padding:4px 10px 4px 8px;display:flex;align-items:center;gap:4px;font-size:12px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <span style="font-weight:600;color:#555">${_ytNum(_ytData.channelStats.totalViews)}</span>
          </div>
          <div style="width:1px;height:16px;background:rgba(210,205,228,.4);margin:0 2px"></div>
          `:''}
          <div style="background:rgba(139,92,246,.06);border-radius:20px;padding:4px 10px 4px 8px;display:flex;align-items:center;gap:4px;font-size:12px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/></svg>
            <span style="font-weight:600;color:#8b5cf6">${stats.idea}</span>
          </div>
          <div style="background:rgba(245,158,11,.06);border-radius:20px;padding:4px 10px 4px 8px;display:flex;align-items:center;gap:4px;font-size:12px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span style="font-weight:600;color:#f59e0b">${stats.up_next+stats.in_progress}</span>
          </div>
          <div style="background:rgba(16,185,129,.06);border-radius:20px;padding:4px 10px 4px 8px;display:flex;align-items:center;gap:4px;font-size:12px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span style="font-weight:600;color:#10b981">${stats.published}</span>
          </div>
        </div>
        <button onclick="openVidModal()" style="background:transparent;border:1.5px solid rgba(255,255,255,.45);border-radius:20px;padding:4px 8px;display:flex;align-items:center;cursor:pointer;margin-right:90px" title="Add video">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    </div>
    <div id="yt-analytics-slot" style="display:none"></div>
    <div class="card" style="overflow:${_vidView==='dashboard'?'hidden':'auto'};flex:1;min-height:0;background:rgba(255,255,255,0.32);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px)">
        ${bodyHtml}
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
    el.addEventListener('contextmenu',function(e){
      const dot=e.target.closest('.vid-step-dot');
      if(dot){e.preventDefault();e.stopPropagation();const vid=dot.dataset.vid;const step=dot.dataset.step;if(vid&&step)_vidToggleStepNa(vid,step);return;}
    });
  }
  const _rvpSe2=_vidScrollEl();if(_rvpSe2)_rvpSe2.scrollTop=_rvpTop;
  // Load cached YT data from localStorage on first run
  if(!_ytData){try{var _lsc=JSON.parse(localStorage.getItem('_ytCache')||'null');if(_lsc&&_lsc.channelStats){_ytData=_lsc;_ytBuildMatch();}}catch(e){}}
  if(!_ytFetched){
    _ytFetched=true;
    fetch('/api/yt?_='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();}).then(function(d){
      if(d.error)return;
      _ytData=d;
      try{localStorage.setItem('_ytCache',JSON.stringify(d));}catch(e){}
      _ytBuildMatch();
      renderVideosPageKeepScroll();
    }).catch(function(){});
  }
  // Render YT stats from _ytData (either fresh or cached)
  if(_ytData){
    var ytSlot=document.getElementById('yt-analytics-slot');
    if(ytSlot&&!ytSlot.innerHTML){
      var c=_ytData.channelStats;
      var h='<div style="display:flex;gap:12px;flex-wrap:wrap;margin:8px 0">';
      h+='<div style="background:var(--glass);border:1px solid var(--border);border-radius:10px;padding:8px 14px"><div style="font-size:10px;color:var(--muted)">Subscribers</div><div style="font-size:16px;font-weight:600">'+_ytNum(c.subscribers)+'</div></div>';
      h+='<div style="background:var(--glass);border:1px solid var(--border);border-radius:10px;padding:8px 14px"><div style="font-size:10px;color:var(--muted)">Total Views</div><div style="font-size:16px;font-weight:600">'+_ytNum(c.totalViews)+'</div></div>';
      h+='<div style="background:var(--glass);border:1px solid var(--border);border-radius:10px;padding:8px 14px"><div style="font-size:10px;color:var(--muted)">Published on YT</div><div style="font-size:16px;font-weight:600">'+c.totalVideos+'</div></div>';
      h+='</div>';
      ytSlot.innerHTML=h;
    }
  }
}

// ── DASHBOARD VIEW (default — In Progress + Ideas) ───────────────────────────
function _vidRenderDashboard(){
  const all=(st.videos||[]).filter(v=>!v.is_deleted);
  let upNext=all.filter(v=>v.status==='up_next');
  let inProgress=all.filter(v=>v.status==='in_progress');
  let ideas=all.filter(v=>v.status==='idea');
  if(_vidSearch){
    const q=_vidSearch.toLowerCase();
    const match=v=>(v.title||'').toLowerCase().includes(q)||(v.topic||'').toLowerCase().includes(q);
    upNext=upNext.filter(match);inProgress=inProgress.filter(match);ideas=ideas.filter(match);
  }
  _vidDashVids=all.filter(v=>v.status!=='idea');
  const _colHdr=`<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;padding-right:0">
            <div style="display:flex;gap:0">${VID_STEPS.map(s=>`<div style="width:28px;text-align:center;font-size:9px" title="${VID_STEP_LABELS[s]}">${VID_STEP_LABELS[s].length<=5?VID_STEP_LABELS[s]:VID_STEP_LABELS[s].slice(0,2)}</div>`).join('')}</div>
            <span style="width:52px;text-align:right;font-size:9px;display:inline-block">Posted</span>
            <span style="width:36px;text-align:right;font-size:9px;display:inline-block">Duration</span>
            <span style="width:28px;display:inline-block"></span>
            <button class="vid-del" style="visibility:hidden">✕</button>
          </div>`;
  const ideasHtml=(()=>{
    const bigIdeas=ideas.filter(v=>v.video_type==='B').sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
    const littleIdeas=ideas.filter(v=>v.video_type!=='B').sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
    let h='';
    if(bigIdeas.length||littleIdeas.length){
      h+=`<div class="vid-idea-section" data-idea-type="B" ondragover="_vidIdeaTypeDragOver(event)" ondragleave="_vidIdeaTypeDragLeave(event)" ondrop="_vidIdeaTypeDrop(event,'B')">`;
      h+=`<div style="font-size:9px;font-weight:600;color:var(--muted);padding:6px 6px 6px 16px;letter-spacing:.03em;background:#fff;display:flex;align-items:center">Big</div>`;
      h+=bigIdeas.length?bigIdeas.map(v=>_vidDashRow(v,false,true)).join(''):'<div style="color:var(--muted);font-size:11px;padding:4px 10px;opacity:.5">None</div>';
      h+=`</div>`;
      h+=`<div class="vid-idea-section" data-idea-type="L" ondragover="_vidIdeaTypeDragOver(event)" ondragleave="_vidIdeaTypeDragLeave(event)" ondrop="_vidIdeaTypeDrop(event,'L')">`;
      h+=`<div style="font-size:9px;font-weight:600;color:var(--muted);padding:6px 6px 6px 16px;letter-spacing:.03em;border-top:1px solid rgba(210,205,228,.15);margin-top:4px;background:#fff;display:flex;align-items:center">Little</div>`;
      h+=littleIdeas.length?littleIdeas.map(v=>_vidDashRow(v,false,true)).join(''):'<div style="color:var(--muted);font-size:11px;padding:4px 10px;opacity:.5">None</div>';
      h+=`</div>`;
    }else{
      h='<div style="color:var(--muted);font-size:12px;padding:16px 10px">No ideas yet</div>';
    }
    return h;
  })();
  return`
    <div onclick="_vidClearSel(event)" style="display:grid;grid-template-columns:3fr 1fr;grid-template-rows:auto 1fr;position:absolute;top:0;left:0;right:0;bottom:0">
      <div class="vid-dash-header" style="grid-column:1;grid-row:1;border-right:1px solid var(--border)">
        <div style="flex:1;min-width:0;padding-left:10px">Current</div>
        ${(upNext.length||inProgress.length)?_colHdr:''}
      </div>
      <div class="vid-dash-header" style="grid-column:2;grid-row:1">
        <div style="padding-left:10px">Ideas <span class="vid-count">${ideas.length}</span></div>
      </div>
      <div id="vidDashLeft" style="grid-column:1;grid-row:2;min-height:0;overflow-y:auto;overflow-x:hidden;border-right:1px solid var(--border)">
        <div class="vid-drop-zone" data-drop-status="up_next" ondragover="_vidDashDragOver(event)" ondragleave="_vidDashDragLeave(event)" ondrop="_vidDashDrop(event,'up_next')" style="min-height:40px;padding-bottom:8px">
          <div style="font-size:9px;font-weight:600;color:var(--muted);padding:6px 6px 6px 16px;letter-spacing:.03em;background:#fff;display:flex;align-items:center">Up Next</div>
          ${upNext.length?_vidDashList(upNext,false):'<div style="color:var(--muted);font-size:11px;padding:8px 10px;opacity:.5">Drag ideas here</div>'}
        </div>
        <div class="vid-drop-zone" data-drop-status="in_progress" ondragover="_vidDashDragOver(event)" ondragleave="_vidDashDragLeave(event)" ondrop="_vidDashDrop(event,'in_progress')" style="min-height:40px;padding-bottom:8px">
          <div style="font-size:9px;font-weight:600;color:var(--muted);padding:6px 6px 6px 16px;letter-spacing:.03em;border-top:1px solid rgba(210,205,228,.15);margin-top:4px;background:#fff;display:flex;align-items:center">In Progress</div>
          ${inProgress.length?_vidDashList(inProgress,false):'<div style="color:var(--muted);font-size:11px;padding:8px 10px;opacity:.5">Drag up next here to start</div>'}
        </div>
      </div>
      <div id="vidDashRight" style="grid-column:2;grid-row:2;min-height:0;overflow-y:auto" ondragover="_vidDashDragOver(event)" ondragleave="_vidDashDragLeave(event)" ondrop="_vidDashDrop(event,'idea')">
        ${ideasHtml}
      </div>
    </div>`;
}

function _vidDashList(vids,simple){
  // Sort by vid_order, then group B→L
  const sorted=[...vids].sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
  const seen=new Set();
  let html='';
  const bVids=sorted.filter(v=>v.video_type==='B');
  const lVids=sorted.filter(v=>v.video_type!=='B');
  // Interleave: B videos and standalone L in vid_order, children under their B
  sorted.forEach(v=>{
    if(seen.has(String(v.id)))return;
    if(v.video_type==='B'){
      seen.add(String(v.id));
      html+=_vidDashRow(v,false,simple);
      const children=lVids.filter(l=>l.big_video_id&&String(l.big_video_id)===String(v.id)).sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
      children.forEach((l,ci)=>{seen.add(String(l.id));html+=_vidDashRow(l,true,simple);if(!simple&&ci<children.length-1){const oA=l.vid_order??ci;const oB=children[ci+1].vid_order??(ci+1);html+=`<div class="vid-insert-zone" onclick="event.stopPropagation();openVidModalBetween('${String(v.id)}',${oA},${oB})"><button class="vid-insert-btn">+</button></div>`;}});
    }else if(!v.big_video_id||!bVids.find(b=>String(b.id)===String(v.big_video_id))){
      // Standalone L (no parent in this list)
      seen.add(String(v.id));
      html+=_vidDashRow(v,false,simple);
    }
  });
  // Any remaining children whose B parent wasn't in this status
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
  const childMark=isChild?'<span style="color:#fff;font-size:10px;margin-right:4px">└</span>':'';
  const titleStyle=isSmall?'color:var(--muted)':'';
  const postNum=_vidDashPostMap[sid];
  const numHtml=postNum?`<span style="color:var(--muted);font-size:10px;margin-right:6px;min-width:18px;display:inline-block">${postNum}</span>`:'';
  const titleCls='vid-title-text';
  const isComplete=v.status==='published';
  const topic=v.topic||'';
  const showTopicTitle=(v.status==='in_progress'||v.status==='up_next')&&topic;
  const _titleSuffix=v.title?'- '+_esc(v.title):'';
  const primary=isComplete?v.title:(topic||v.title);
  const secondary=showTopicTitle?v.title:'';
  const _addBtn=simple?'':v.video_type==='B'?'<button onclick="event.stopPropagation();openVidModalForBig(\''+sid+'\')" style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:14px;text-align:center;border-radius:3px;border:1px solid var(--border);background:var(--bg);color:var(--muted);cursor:pointer;margin-right:4px" title="Add child video">+</button>':(!isChild?'<button style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:14px;text-align:center;border-radius:3px;border:1px solid transparent;background:transparent;color:transparent;margin-right:4px;pointer-events:none">+</button>':'');
  const _kidCount=v.video_type==='B'?(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===sid).length:0;
  const _kidBadge=_kidCount?'<span style="font-size:9px;color:var(--muted);font-weight:400;margin-left:4px">'+_kidCount+'</span>':'';
  const _tHtml=(showTopicTitle?'<span class="'+titleCls+'">'+_esc(topic)+'</span><span style="font-size:10px;color:var(--muted);margin-left:4px;font-weight:400">'+_titleSuffix+'</span>':'<span class="'+titleCls+'">'+_esc(primary)+'</span>')+_kidBadge;
  if(simple){
    let hasGroup=false;
    if(v.video_type==='B'){
      const kids=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===sid);
      if(kids.length)hasGroup=true;
    }else if(v.big_video_id){
      hasGroup=true;
    }
    const bulletColor=hasGroup?'rgba(139,92,246,.45)':'#fff';
    const bulletAttr=hasGroup?`onmouseenter="_vidBulletTipShow(event,'${sid}')" onmouseleave="_vidBulletTipHide()"`:''
    return`<div class="vid-dash-row${sel?' vid-sel':''}" draggable="true" ondragstart="_vidDashDragStart(event,'${sid}')" data-vid="${sid}" onclick="vidRowClick(event,'${sid}')" ondblclick="openVidEdit('${sid}')" oncontextmenu="showVidCtx(event,'${sid}')" onmouseenter="_vidIdeaRowEnter('${sid}')" onmouseleave="_vidIdeaRowLeave()">
      <div style="flex:1;min-width:0;padding-left:10px;${indent}${!isChild?'font-weight:600;':''}${titleStyle}"><span style="color:${bulletColor};font-size:8px;margin-right:6px;cursor:default" ${bulletAttr}>●</span>${_addBtn}${childMark}${numHtml}${_tHtml}</div>
      <button class="vid-del" data-vid="${sid}">✕</button>
    </div>`;
  }
  const postStr=_vidPostStr(v.post_date);
  const durStr=v.duration_minutes?v.duration_minutes.toFixed(2):'';
  const isBig=v.video_type==='B';
  const bigRowStyle=isBig?'background:rgba(255,255,255,.50);':'';
  const _applicable=VID_STEPS.filter(s=>v[s]!=='na');
  const _done=_applicable.filter(s=>v[s]==='done').length;
  const _pct=_applicable.length?Math.round((_done/_applicable.length)*100):0;
  const _pctVal=(v.status==='in_progress'||v.status==='up_next')&&_pct>0&&_pct<100?_pct+'%':'';
  const _dropParent=v.video_type==='B'?sid:(v.big_video_id?String(v.big_video_id):null);
  const dropAttrs=_dropParent?'ondragover="_vidGroupDragOver(event)" ondragleave="_vidGroupDragLeave(event)" ondrop="_vidGroupDrop(event,\''+_dropParent+'\')"':'';
  return`<div class="vid-dash-row${sel?' vid-sel':''}${_vidChildSelected.has(sid)?' vid-child-sel':''}" draggable="true" ondragstart="_vidDashDragStart(event,'${sid}')" ${dropAttrs} data-vid="${sid}" onclick="vidRowClick(event,'${sid}')" ondblclick="_vidDashDblClick(event,'${sid}')" oncontextmenu="showVidCtx(event,'${sid}')" style="${bigRowStyle}">
    <div style="flex:1;min-width:0;padding-left:10px;${indent}${!isChild?'font-weight:600;':''}${titleStyle}">
      ${_addBtn}${childMark}${numHtml}${_tHtml}
    </div>
    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
      <div style="display:flex;gap:0">${VID_STEPS.map(s=>`<div style="width:28px;text-align:center"><div class="vid-step-dot${v[s]==='done'?' done':v[s]==='na'?' na':''}" data-vid="${sid}" data-step="${s}" title="${VID_STEP_LABELS[s]}"></div></div>`).join('')}</div>
      <span data-field="post_date" style="width:52px;text-align:right;font-size:11px;color:${_vidDateColor(v.post_date,v)};cursor:pointer;min-height:16px;display:inline-block">${postStr||''}</span>
      <span data-field="duration_minutes" style="width:36px;text-align:right;font-size:11px;color:var(--muted);cursor:pointer;min-height:16px;display:inline-block">${durStr||''}</span>
      ${(()=>{const ym=_ytForVid(sid);return ym?'<span style="width:42px;text-align:right;font-size:10px;color:#8b5cf6;display:inline-block" title="'+ym.views+' views / '+ym.likes+' likes">'+_ytNum(ym.views)+'</span>':'';})()}
      <span style="width:28px;text-align:right;font-size:9px;color:var(--muted);font-weight:500;display:inline-block">${_pctVal}</span>
      <button class="vid-del" data-vid="${sid}">✕</button>
    </div>
  </div>`;
}

async function _vidPromoteChildren(parentId,newStatus){
  if(newStatus!=='in_progress'&&newStatus!=='up_next')return;
  const children=(st.videos||[]).filter(v=>!v.is_deleted&&String(v.big_video_id)===String(parentId)&&(v.status==='idea'||(newStatus==='in_progress'&&v.status==='up_next')));
  children.forEach(c=>{c.status=newStatus;});
  if(children.length){save();renderVideosPageKeepScroll();for(const c of children)await sbReqSilent('PATCH','videos',{status:newStatus},`?id=eq.${c.id}`);}
}

function _vidGroupDragOver(e){e.preventDefault();}
function _vidGroupDragLeave(e){const row=e.currentTarget;row.style.boxShadow='';row.style.borderColor='';}
async function _vidGroupDrop(e,parentId){
  e.preventDefault();
  const row=e.currentTarget;row.style.boxShadow='';row.style.borderColor='';
  if(!_vidDashDragId)return;
  const parent=(st.videos||[]).find(x=>String(x.id)===parentId);if(!parent||parent.video_type!=='B')return;
  const ids=_vidDashDragIds.length?[..._vidDashDragIds]:[_vidDashDragId];
  // If dragging a B video (with children), don't intercept — let _vidDashDrop handle it
  const hasBDrag=ids.some(id=>{const v=(st.videos||[]).find(x=>String(x.id)===String(id));return v&&v.video_type==='B';});
  if(hasBDrag)return;
  // Filter to videos that can nest (not B, not self, not already child of this parent)
  const toNest=ids.map(id=>(st.videos||[]).find(x=>String(x.id)===String(id))).filter(v=>v&&v.video_type!=='B'&&String(v.id)!==String(parentId));
  if(!toNest.length)return;
  e.stopPropagation();

  // Find drop position among existing children using zone placeholder
  const zone=row.closest('.vid-drop-zone')||row.closest('[ondrop]');
  const ph=zone?zone.querySelector('.vid-reorder-ph'):null;
  const existingKids=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===parentId&&c.status===parent.status).sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));

  // Determine insert position from placeholder
  let insertOrder=parent.vid_order!=null?(parent.vid_order+0.01):0.01;
  if(ph&&zone){
    const kidRows=[...zone.querySelectorAll('.vid-dash-row[data-vid]')].filter(r=>{
      const v=(st.videos||[]).find(x=>String(x.id)===r.dataset.vid);
      return v&&String(v.big_video_id)===parentId;
    });
    const zoneChildren=[...zone.children];
    const phIdx=zoneChildren.indexOf(ph);
    const kidsAfter=kidRows.filter(r=>zoneChildren.indexOf(r)>phIdx);
    if(kidsAfter.length){
      const afterVid=(st.videos||[]).find(x=>String(x.id)===kidsAfter[0].dataset.vid);
      if(afterVid)insertOrder=(afterVid.vid_order??0)-0.01;
    }else if(existingKids.length){
      insertOrder=(existingKids[existingKids.length-1].vid_order??0)+0.01;
    }
  }else if(existingKids.length){
    insertOrder=(existingKids[existingKids.length-1].vid_order??0)+0.01;
  }
  if(ph)ph.remove();

  const undoData=toNest.map(v=>({v,prevParent:v.big_video_id,prevStatus:v.status,prevType:v.video_type,prevOrder:v.vid_order}));
  toNest.forEach((v,i)=>{
    v.big_video_id=parseInt(parentId)||parentId;
    v.video_type='L';
    if(v.status!==parent.status&&v.status!=='published')v.status=parent.status;
    v.vid_order=insertOrder+(i*0.01);
  });
  save();renderVideosPageKeepScroll();
  pushUndo(async()=>{
    undoData.forEach(d=>{d.v.big_video_id=d.prevParent;d.v.video_type=d.prevType;d.v.status=d.prevStatus;d.v.vid_order=d.prevOrder;});
    save();renderVideosPageKeepScroll();
    for(const d of undoData)await sbReqSilent('PATCH','videos',{big_video_id:d.prevParent,video_type:d.prevType,status:d.prevStatus,vid_order:d.prevOrder??null},`?id=eq.${d.v.id}`);
  },'Group change');
  for(const v of toNest){
    await _vidEnsureSynced(v);
    await sbReqSilent('PATCH','videos',{big_video_id:v.big_video_id,video_type:'L',status:v.status,vid_order:v.vid_order},`?id=eq.${v.id}`);
  }
  _vidDashDragId=null;_vidDashDragIds=[];
}

let _vidDashDragId=null;
function _vidDashDragStart(e,id){
  const sid=String(id);
  _vidDashDragId=sid;
  // If dragging a selected video, include all selected; otherwise just this one
  if(_vidSelected.has(sid)){
    _vidDashDragIds=[..._vidSelected,..._vidChildSelected];
  }else{
    // Not selected — clear selection, select this one, drag just it
    _vidSelected.clear();_vidSelected.add(sid);
    _vidUpdateChildSel();_applyVidSel();
    _vidDashDragIds=[sid,..._vidChildSelected];
  }
  e.dataTransfer.effectAllowed='move';
  e.target.style.opacity='.4';
  const _dragEnd=()=>{e.target.style.opacity='';e.target.removeEventListener('dragend',_dragEnd);document.querySelectorAll('.vid-reorder-ph').forEach(p=>p.remove());document.querySelectorAll('.vid-dash-row[data-vid]').forEach(r=>r.style.opacity='');};
  e.target.addEventListener('dragend',_dragEnd);
}
let _vidDashDragIds=[];

let _vidDragScrollRAF=null,_vidDragScrollSpeed=0,_vidDragScrollEl=null;
function _vidDragAutoScroll(e){
  const scrollEl=e.currentTarget.closest('[style*="overflow-y"]')||e.currentTarget;
  if(scrollEl.scrollHeight<=scrollEl.clientHeight){_vidDragScrollSpeed=0;return;}
  const rect=scrollEl.getBoundingClientRect();
  const edge=40;
  const y=e.clientY;
  _vidDragScrollSpeed=0;_vidDragScrollEl=scrollEl;
  if(y>rect.bottom-edge)_vidDragScrollSpeed=Math.min(12,(y-(rect.bottom-edge))/edge*12);
  else if(y<rect.top+edge)_vidDragScrollSpeed=-Math.min(12,((rect.top+edge)-y)/edge*12);
  if(_vidDragScrollSpeed!==0&&!_vidDragScrollRAF){
    (function scroll(){if(!_vidDragScrollSpeed||!_vidDragScrollEl){_vidDragScrollRAF=null;return;}_vidDragScrollEl.scrollTop+=_vidDragScrollSpeed;_vidDragScrollRAF=requestAnimationFrame(scroll);})();
  }
}
function _vidDashDragOver(e){
  if(!_vidDashDragId)return;
  e.preventDefault();
  _vidDragAutoScroll(e);
  const zone=e.currentTarget;
  const dragSet=new Set(_vidDashDragIds);
  const dragV=(st.videos||[]).find(x=>String(x.id)===_vidDashDragId);
  const dragIsB=dragV&&dragV.video_type==='B';
  let ph=zone.querySelector('.vid-reorder-ph');
  if(!ph){ph=document.createElement('div');ph.className='vid-reorder-ph';ph.style.cssText='height:2px;margin:2px 10px;border-radius:99px;background:#fff;pointer-events:none;flex-shrink:0';zone.appendChild(ph);}
  zone.querySelectorAll('.vid-dash-row[data-vid]').forEach(r=>{r.style.opacity=dragSet.has(r.dataset.vid)?'.3':'';});
  let rows=[...zone.querySelectorAll('.vid-dash-row[data-vid]')].filter(r=>!dragSet.has(r.dataset.vid));
  // If dragging B, only allow placement at B-level boundaries (not between children)
  if(dragIsB){
    rows=rows.filter(r=>{
      const rv=(st.videos||[]).find(x=>String(x.id)===r.dataset.vid);
      return rv&&(rv.video_type==='B'||!rv.big_video_id);
    });
  }
  let inserted=false;
  for(const r of rows){
    const rc=r.getBoundingClientRect();
    if(e.clientY<rc.top+rc.height/2){
      // If dragging B before a B row, place before the B row
      zone.insertBefore(ph,r);inserted=true;break;
    }
  }
  if(!inserted&&rows.length){
    // Place after last valid row's children
    const lastRow=rows[rows.length-1];
    const lastV=(st.videos||[]).find(x=>String(x.id)===lastRow.dataset.vid);
    if(dragIsB&&lastV&&lastV.video_type==='B'){
      // Find last child of this B in the DOM
      const allRows=[...zone.querySelectorAll('.vid-dash-row[data-vid]')];
      let lastChild=lastRow;
      for(const ar of allRows){
        const arv=(st.videos||[]).find(x=>String(x.id)===ar.dataset.vid);
        if(arv&&String(arv.big_video_id)===lastRow.dataset.vid&&!dragSet.has(ar.dataset.vid))lastChild=ar;
      }
      lastChild.after(ph);
    }else{
      lastRow.after(ph);
    }
  }
  else if(!rows.length){const hdr=zone.querySelector('[style*="font-size:9px"]');if(hdr)hdr.after(ph);}
}
function _vidDashDragLeave(e){
  if(!e.currentTarget.contains(e.relatedTarget)){const ph=e.currentTarget.querySelector('.vid-reorder-ph');if(ph)ph.remove();if(_vidDragScrollRAF){cancelAnimationFrame(_vidDragScrollRAF);_vidDragScrollRAF=null;}}
}
function _vidIdeaTypeDragOver(e){
  if(!_vidDashDragId)return;
  e.preventDefault();e.stopPropagation();
  const zone=e.currentTarget;
  const dragSet=new Set(_vidDashDragIds);
  let ph=zone.querySelector('.vid-reorder-ph');
  if(!ph){ph=document.createElement('div');ph.className='vid-reorder-ph';ph.style.cssText='height:2px;margin:2px 10px;border-radius:99px;background:#fff;pointer-events:none;flex-shrink:0';zone.appendChild(ph);}
  zone.querySelectorAll('.vid-dash-row[data-vid]').forEach(r=>{r.style.opacity=dragSet.has(r.dataset.vid)?'.3':'';});
  const rows=[...zone.querySelectorAll('.vid-dash-row[data-vid]')].filter(r=>!dragSet.has(r.dataset.vid));
  let inserted=false;
  for(const r of rows){
    const rc=r.getBoundingClientRect();
    if(e.clientY<rc.top+rc.height/2){zone.insertBefore(ph,r);inserted=true;break;}
  }
  if(!inserted&&rows.length)rows[rows.length-1].after(ph);
  else if(!rows.length){const hdr=zone.querySelector('[style*="font-size:9px"]');if(hdr)hdr.after(ph);}
}
function _vidIdeaTypeDragLeave(e){
  if(!e.currentTarget.contains(e.relatedTarget)){
    const ph=e.currentTarget.querySelector('.vid-reorder-ph');if(ph)ph.remove();
    e.currentTarget.querySelectorAll('.vid-dash-row[data-vid]').forEach(r=>r.style.opacity='');
  }
}
async function _vidIdeaTypeDrop(e,newType){
  e.preventDefault();e.stopPropagation();
  e.currentTarget.style.background='';
  if(_vidDragScrollRAF){cancelAnimationFrame(_vidDragScrollRAF);_vidDragScrollRAF=null;}
  const zone=e.currentTarget;
  const ph=zone.querySelector('.vid-reorder-ph');
  const dragIds=_vidDashDragIds.length?[..._vidDashDragIds]:(_vidDashDragId?[String(_vidDashDragId)]:[]);
  _vidDashDragId=null;_vidDashDragIds=[];
  if(!dragIds.length){if(ph)ph.remove();return;}
  const dragSet=new Set(dragIds);

  // Build insert order from placeholder position
  const rows=[...zone.querySelectorAll('.vid-dash-row[data-vid]')];
  const children=zone.children?[...zone.children]:[];
  const phIdx=ph?children.indexOf(ph):-1;
  if(ph)ph.remove();
  const zoneIds=rows.map(r=>r.dataset.vid).filter(id=>!dragSet.has(id));
  let insertIdx=zoneIds.length;
  if(phIdx>-1){
    const rowsAfterPh=rows.filter(r=>children.indexOf(r)>=phIdx&&!dragSet.has(r.dataset.vid));
    if(rowsAfterPh.length){const afterId=rowsAfterPh[0].dataset.vid;insertIdx=zoneIds.indexOf(afterId);if(insertIdx<0)insertIdx=zoneIds.length;}
  }

  // Find B videos being dragged — their children should keep type L
  const draggedBIds=new Set(dragIds.filter(id=>{const v=(st.videos||[]).find(x=>String(x.id)===id);return v&&v.video_type==='B';}));
  const undos=[];
  // Only insert top-level dragged items (matching newType) into order
  const topDragIds=dragIds.filter(id=>{
    const v=(st.videos||[]).find(x=>String(x.id)===id);
    if(!v)return false;
    const isChildOfDraggedB=v.big_video_id&&draggedBIds.has(String(v.big_video_id));
    return isChildOfDraggedB?false:(v.video_type===newType||(!isChildOfDraggedB));
  });
  const finalOrder=[...zoneIds];
  finalOrder.splice(insertIdx,0,...topDragIds);

  for(const sid of dragIds){
    const v=(st.videos||[]).find(x=>String(x.id)===sid);if(!v)continue;
    const prev={video_type:v.video_type,big_video_id:v.big_video_id,status:v.status,vid_order:v.vid_order};
    const isChildOfDraggedB=v.big_video_id&&draggedBIds.has(String(v.big_video_id));
    if(!isChildOfDraggedB){
      v.video_type=newType;
      if(newType==='B')v.big_video_id=null;
    }
    v.status='idea';
    undos.push({sid,prev});
  }
  // Also move children of dragged B videos to ideas (even if not in dragIds)
  for(const bId of draggedBIds){
    (st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===bId&&!dragSet.has(String(c.id))).forEach(c=>{
      const prev={video_type:c.video_type,big_video_id:c.big_video_id,status:c.status,vid_order:c.vid_order};
      if(c.status!=='published')c.status='idea';
      undos.push({sid:String(c.id),prev});
    });
  }
  // Assign vid_order from finalOrder and track all order changes
  const orderChanges=[];
  finalOrder.forEach((id,i)=>{
    const v=(st.videos||[]).find(x=>String(x.id)===id);
    if(v&&v.vid_order!==i){
      const prevOrder=v.vid_order;
      // Add to undos if not already there
      if(!undos.find(u=>u.sid===id))undos.push({sid:id,prev:{vid_order:prevOrder,video_type:v.video_type,big_video_id:v.big_video_id,status:v.status}});
      v.vid_order=i;
      orderChanges.push({id,order:i});
    }else if(v){v.vid_order=i;}
  });

  save();renderVideosPageKeepScroll();
  pushUndo(async()=>{
    undos.forEach(u=>{const v=(st.videos||[]).find(x=>String(x.id)===u.sid);if(v)Object.assign(v,u.prev);});
    save();renderVideosPageKeepScroll();
    for(const u of undos)await sbReqSilent('PATCH','videos',u.prev,`?id=eq.${u.sid}`);
  },'Changed video type');
  for(const u of undos){
    const v=(st.videos||[]).find(x=>String(x.id)===u.sid);
    if(v)await sbReqSilent('PATCH','videos',{video_type:v.video_type,status:v.status,big_video_id:v.big_video_id??null,vid_order:v.vid_order??null},`?id=eq.${u.sid}`);
  }
}

// Push a local-only video (l-xxx id) to Supabase and replace the temp id
const _VID_DB_COLS=['title','topic','status','post_date','duration_minutes','video_type','big_video_id','vid_order','comment',...VID_STEPS];
async function _vidEnsureSynced(v){
  if(!String(v.id).startsWith('l-'))return;
  // If parent is also local, sync parent first
  if(v.big_video_id&&String(v.big_video_id).startsWith('l-')){
    const parent=(st.videos||[]).find(x=>String(x.id)===String(v.big_video_id));
    if(parent)await _vidEnsureSynced(parent);
    // Update reference to real ID
    if(parent&&!String(parent.id).startsWith('l-'))v.big_video_id=parent.id;
  }
  const payload={};
  _VID_DB_COLS.forEach(k=>{
    if(v[k]===undefined)return;
    if(k==='big_video_id'&&v[k]&&String(v[k]).startsWith('l-'))return;
    payload[k]=v[k];
  });
  if(!payload.title)payload.title='';
  const sv=await sbReqSilent('POST','videos',payload);
  console.log('[vidSync] POST local→DB',v.id,JSON.stringify(payload),sv);
  if(sv&&sv[0]){
    const oldId=v.id;
    Object.assign(v,sv[0]);
    // Update any children pointing to old local ID
    (st.videos||[]).filter(c=>String(c.big_video_id)===String(oldId)).forEach(c=>{c.big_video_id=v.id;});
    save();
  }
}
let _vidSyncRan=false;
async function _vidSyncLocalVideos(){
  if(_vidSyncRan||!cfg.url||!cfg.key)return;
  _vidSyncRan=true;
  // Sync B types first so children get real parent IDs
  const locals=(st.videos||[]).filter(v=>String(v.id).startsWith('l-')&&!v.is_deleted);
  const bFirst=locals.filter(v=>v.video_type==='B');
  const rest=locals.filter(v=>v.video_type!=='B');
  for(const v of bFirst)await _vidEnsureSynced(v);
  for(const v of rest)await _vidEnsureSynced(v);
  if(locals.length)renderVideosPageKeepScroll();
}
async function _vidDashDrop(e,newStatus){
  e.preventDefault();e.currentTarget.style.background='';
  if(_vidDragScrollRAF){cancelAnimationFrame(_vidDragScrollRAF);_vidDragScrollRAF=null;}
  const zone=e.currentTarget;
  const ph=zone.querySelector('.vid-reorder-ph');
  const dragIds=_vidDashDragIds.length?[..._vidDashDragIds]:(_vidDashDragId?[String(_vidDashDragId)]:[]);
  _vidDashDragId=null;_vidDashDragIds=[];
  if(!dragIds.length){if(ph)ph.remove();return;}

  // Build reorder from placeholder position
  const rows=[...zone.querySelectorAll('.vid-dash-row[data-vid]')];
  const children=zone.children?[...zone.children]:[];
  const phIdx=ph?children.indexOf(ph):-1;
  if(ph)ph.remove();

  // Determine insert position from DOM order
  const dragSet=new Set(dragIds);
  const zoneIds=rows.map(r=>r.dataset.vid).filter(id=>!dragSet.has(id));
  let insertIdx=zoneIds.length;// default: end
  if(phIdx>-1){
    // Find which row comes after the placeholder
    const rowsAfterPh=rows.filter(r=>children.indexOf(r)>=phIdx&&!dragSet.has(r.dataset.vid));
    if(rowsAfterPh.length){
      const afterId=rowsAfterPh[0].dataset.vid;
      insertIdx=zoneIds.indexOf(afterId);
      if(insertIdx<0)insertIdx=zoneIds.length;
    }
  }

  // Capture all prev states BEFORE any modifications
  const undoData=[];
  for(const dragId of dragIds){
    const v=(st.videos||[]).find(x=>String(x.id)===String(dragId));
    if(!v)continue;
    const prev=v.status;const prevOrder=v.vid_order;
    const childPrevs=[];
    if(v.video_type==='B'){
      (st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(v.id)).forEach(c=>childPrevs.push({id:c.id,status:c.status,vid_order:c.vid_order}));
    }
    undoData.push({v,prev,prevOrder,childPrevs});
  }
  // Now apply status changes
  for(const d of undoData){
    const v=d.v;
    if(v.status!==newStatus&&v.status!=='published'){
      if(v.video_type==='L'&&!v.big_video_id&&(newStatus==='in_progress'||newStatus==='up_next'))v.status='idea';
      else v.status=newStatus;
    }
    // When moving a B to ideas, move its children to ideas too
    if(v.video_type==='B'&&newStatus==='idea'){
      d.childPrevs.forEach(cp=>{const c=(st.videos||[]).find(x=>String(x.id)===String(cp.id));if(c&&c.status!=='published')c.status='idea';});
    }
    // When moving a B from ideas to current, promote its children too
    if(v.video_type==='B'&&newStatus!=='idea'&&newStatus!=='published'){
      d.childPrevs.forEach(cp=>{const c=(st.videos||[]).find(x=>String(x.id)===String(cp.id));if(c&&c.status==='idea')c.status=newStatus;});
    }
  }

  // Build final order: zoneIds with dragIds spliced in at insertIdx
  // Only top-level (B or standalone) — children follow their parent
  const topDragIds=dragIds.filter(id=>{const v=(st.videos||[]).find(x=>String(x.id)===id);return v&&(v.video_type==='B'||!v.big_video_id||!dragSet.has(String(v.big_video_id)));});
  const finalOrder=[...zoneIds];
  finalOrder.splice(insertIdx,0,...topDragIds);

  // Assign vid_order to all videos in this status
  const allInStatus=(st.videos||[]).filter(v=>!v.is_deleted&&v.status===newStatus);
  finalOrder.forEach((id,i)=>{
    const v=allInStatus.find(x=>String(x.id)===id);
    if(v)v.vid_order=i;
    // Children get parent's order + fraction
    if(v&&v.video_type==='B'){
      const kids=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===id&&c.status===newStatus);
      kids.forEach((k,ki)=>{k.vid_order=i+((ki+1)*0.01);});
    }
  });
  // Standalone L not in finalOrder
  allInStatus.filter(v=>!finalOrder.includes(String(v.id))&&v.vid_order==null).forEach((v,i)=>{v.vid_order=finalOrder.length+i;});

  save();renderVideosPageKeepScroll();

  for(const d of undoData){
    await _vidEnsureSynced(d.v);
    // Sync children status changes to DB
    if(d.v.video_type==='B'){
      for(const cp of d.childPrevs){const c=(st.videos||[]).find(x=>String(x.id)===String(cp.id));if(c&&c.status!==cp.status)await sbReqSilent('PATCH','videos',{status:c.status,vid_order:c.vid_order??null},`?id=eq.${cp.id}`);}
    }
  }

  // Save vid_order + status to DB
  const prevOrders=allInStatus.map(v=>({id:v.id,order:v.vid_order}));
  pushUndo(async()=>{
    undoData.forEach(d=>{
      d.v.status=d.prev;d.v.vid_order=d.prevOrder;
      d.childPrevs.forEach(cp=>{const c=(st.videos||[]).find(x=>String(x.id)===String(cp.id));if(c){c.status=cp.status;c.vid_order=cp.vid_order;}});
    });
    save();renderVideosPageKeepScroll();
    for(const d of undoData){
      await sbReqSilent('PATCH','videos',{status:d.prev,vid_order:d.prevOrder??null},`?id=eq.${d.v.id}`);
      for(const cp of d.childPrevs)await sbReqSilent('PATCH','videos',{status:cp.status,vid_order:cp.vid_order??null},`?id=eq.${cp.id}`);
    }
  },'Reorder/move');
  for(const v of allInStatus)await sbReqSilent('PATCH','videos',{status:v.status,vid_order:v.vid_order},`?id=eq.${v.id}`);
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
      else if(col==='status'){av=VID_STATUS_ORDER[a.status]??99;bv=VID_STATUS_ORDER[b.status]??99;}
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
  let vids=_vidFiltered().filter(v=>v.status!=='idea');
  const today=d2s(new Date());
  if(!_vidShowCompleted){
    vids=vids.filter(v=>{
      // Hide published with past date; for B videos, only hide if ALL children also have past dates
      if(v.status==='published'&&v.post_date&&v.post_date<today){
        if(v.video_type==='B'){
          const kids=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(v.id));
          if(kids.some(k=>!k.post_date||k.post_date>=today))return true;
        }
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
        <th style="width:450px;${thStyle}" onclick="vidTblSort('title')">Title${_vidSortArrow('title')}</th>
        ${VID_STEPS.map(s=>`<th style="width:22px;text-align:center;font-size:9px" title="${VID_STEP_LABELS[s]}">${VID_STEP_LABELS[s].length<=5?VID_STEP_LABELS[s]:VID_STEP_LABELS[s].slice(0,2)}</th>`).join('')}
        <th style="width:62px;text-align:right;${thStyle}" onclick="vidTblSort('posted')">Posted${_vidSortArrow('posted')}</th>
        <th style="width:50px;text-align:right;${thStyle}" onclick="vidTblSort('duration')">Dur${_vidSortArrow('duration')}</th>
        <th style="width:28px"></th>
        <th style="width:80px;${thStyle}" onclick="vidTblSort('status')">Status${_vidSortArrow('status')}</th>
        ${_ytMatch?'<th style="width:80px;text-align:right;font-size:9px">Views</th><th style="width:50px;text-align:right;font-size:9px">Likes</th>':''}
        <th style="width:30px"><button onclick="_vidToggleCompleted()" style="font-size:12px;font-weight:700;width:20px;height:20px;line-height:18px;text-align:center;border-radius:5px;border:1.5px solid var(--border);background:${_vidShowCompleted?'rgba(14,165,233,.12)':'var(--bg)'};color:${_vidShowCompleted?'#0ea5e9':'var(--muted)'};cursor:pointer;vertical-align:middle" title="${_vidShowCompleted?'Hide':'Show'} Completed">${_vidShowCompleted?'−':'+'}</button></th>
      </tr></thead>
      <tbody>${groupedHtml}</tbody>
    </table>
  </div>`;
}

function _vidChildSort(a,b){
  // posted (has date) first, then in_progress, then ideas
  const order={published:0,in_progress:1,up_next:2,idea:3,backup:4};
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
    const aOrder={published:3,in_progress:0,up_next:1,idea:2,backup:4}[a.status]??9;
    const bOrder={published:3,in_progress:0,up_next:1,idea:2,backup:4}[b.status]??9;
    return aOrder-bOrder;
  });
  bSorted.forEach(b=>{
    seen.add(String(b.id));
    html+=_vidRow(b,false);
    const children=lVids.filter(l=>l.big_video_id&&String(l.big_video_id)===String(b.id)).sort(_vidChildSort);
    children.forEach((l,ci)=>{seen.add(String(l.id));html+=_vidRow(l,true);if(ci<children.length-1){const oA=l.vid_order??ci;const oB=children[ci+1].vid_order??(ci+1);html+=`<tr class="vid-insert-zone" onclick="event.stopPropagation();openVidModalBetween('${String(b.id)}',${oA},${oB})"><td colspan="99" style="padding:0;border:none"><button class="vid-insert-btn">+</button></td></tr>`;}});
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
  const childMark=isChild?'<span style="color:#fff;font-size:10px;margin-right:4px">└</span>':'';
  const titleColor=isSmall?'color:var(--muted);':'';
  const postNum=postMap&&postMap[sid];
  const numHtml=postNum?`<span style="color:var(--muted);font-size:10px;margin-right:6px;min-width:18px;display:inline-block">${postNum}</span>`:'';
  const addBtn=v.video_type==='B'?`<button onclick="event.stopPropagation();openVidModalForBig('${sid}')" style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:14px;text-align:center;border-radius:3px;border:1px solid var(--border);background:var(--bg);color:var(--muted);cursor:pointer;margin-right:4px;flex-shrink:0" title="Add child video">+</button>`:(!isChild?'<button style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:14px;text-align:center;border-radius:3px;border:1px solid transparent;background:transparent;color:transparent;margin-right:4px;pointer-events:none;flex-shrink:0">+</button>':'');
  const _titleSuffix=v.title?'- '+_esc(v.title):'';
  const isBig=v.video_type==='B';
  const _tblApplicable=VID_STEPS.filter(s=>v[s]!=='na');
  const _tblDone=_tblApplicable.filter(s=>v[s]==='done').length;
  const _tblPct=_tblApplicable.length?Math.round((_tblDone/_tblApplicable.length)*100):0;
  return`<tr class="vid-row${sel?' vid-sel':''}" data-vid="${sid}" onclick="vidCellClick(event,'${sid}')" ondblclick="openVidEdit('${sid}')" oncontextmenu="showVidCtx(event,'${sid}')" style="${isBig?'background:rgba(255,255,255,.50)':''}">
    <td data-field="title" style="${indent}${!isChild?'font-weight:600;':''}${titleColor}overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${addBtn}${childMark}${numHtml}${(v.status==='in_progress'||v.status==='up_next')&&v.topic?`<span class="vid-title-text">${_esc(v.topic)}</span><span style="font-size:10px;color:var(--muted);margin-left:4px;font-weight:400">${_titleSuffix}</span>`:`<span class="vid-title-text">${_esc(v.title)}</span>`}${isBig?`<span style="font-size:9px;color:var(--muted);font-weight:400;margin-left:4px">${(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===sid).length}</span>`:''}</td>
    ${VID_STEPS.map(s=>`<td style="text-align:center"><div class="vid-step-dot${v[s]==='done'?' done':v[s]==='na'?' na':''}" data-vid="${sid}" data-step="${s}" title="${VID_STEP_LABELS[s]}"></div></td>`).join('')}
    <td data-field="post_date" style="text-align:right;font-size:11px;color:${_vidDateColor(v.post_date,v)}">${postStr}</td>
    <td data-field="duration_minutes" style="text-align:right;font-size:11px;color:var(--muted)">${durStr}</td>
    <td style="text-align:right;font-size:9px;color:var(--muted);font-weight:500">${(v.status==='in_progress'||v.status==='up_next')&&_tblPct>0&&_tblPct<100?_tblPct+'%':''}</td>
    <td data-field="status"><span class="vid-status-pill" style="background:${sc}12;color:${sc}">${VID_STATUS_LABELS[v.status]||v.status}</span></td>
    ${_ytMatch?(()=>{const ym=_ytForVid(sid);return ym?'<td style="text-align:right;font-size:11px;color:var(--muted)">'+_ytNum(ym.views)+'</td><td style="text-align:right;font-size:11px;color:var(--muted)">'+_ytNum(ym.likes)+'</td>':'<td></td><td></td>';})():''}
    <td><button class="vid-del" data-vid="${sid}">✕</button></td>
  </tr>`;
}

// ── BOARD VIEW (Kanban by status) ────────────────────────────────────────────
function _vidRenderBoard(){
  const vids=_vidFiltered();
  const cols=[
    {key:'idea',label:'Ideas',color:'#8b5cf6'},
    {key:'up_next',label:'Up Next',color:'#0ea5e9'},
    {key:'in_progress',label:'In Progress',color:'#f59e0b'},
    {key:'published',label:'Complete',color:'#10b981'},
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
  if(v.video_type==='B')await _vidPromoteChildren(v.id,newStatus);
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
function _vidClearSel(e){
  if(e.target.closest('.vid-dash-row,.vid-row,.vid-board-card,.vid-dash-header,.vid-del,.vid-step-dot'))return;
  if(_vidSelected.size){_vidSelected.clear();_vidChildSelected.clear();_applyVidSel();}
}
function vidRowClick(e,id){
  if(e.target.closest('.vid-del')||e.target.closest('.vid-step-dot'))return;
  const sid=String(id);
  if(e.metaKey||e.ctrlKey){
    if(_vidSelected.has(sid))_vidSelected.delete(sid);else _vidSelected.add(sid);
  }else if(e.shiftKey&&_vidLastSel){
    // Use visible DOM rows for range select (works across all views)
    const rows=[...document.querySelectorAll('.vid-dash-row[data-vid],.vid-row[data-vid],.vid-board-card[data-vid]')];
    const ids=rows.map(r=>r.dataset.vid);
    const a=ids.indexOf(_vidLastSel),b=ids.indexOf(sid);
    if(a>-1&&b>-1){const[lo,hi]=[Math.min(a,b),Math.max(a,b)];for(let i=lo;i<=hi;i++)_vidSelected.add(ids[i]);}
  }else{
    if(_vidSelected.size===1&&_vidSelected.has(sid)){_vidSelected.clear();}
    else{_vidSelected.clear();_vidSelected.add(sid);}
  }
  _vidLastSel=sid;
  _vidUpdateChildSel();
  _applyVidSel();
}
// Bullet tooltip (liquid glass)
let _vidBulletTimer=null;
function _vidBulletTipShow(e,sid){
  _vidBulletTipHide();
  _vidBulletTimer=setTimeout(()=>{
    const v=(st.videos||[]).find(x=>String(x.id)===sid);if(!v)return;
    let html='';
    if(v.video_type==='B'){
      const kids=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===sid);
      const done=kids.filter(c=>VID_STEPS.every(s=>c[s]==='done'||c[s]==='na')&&c.post_date&&c.duration_minutes).length;
      html='<div style="font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px">'+kids.length+' Small Video'+(kids.length!==1?'s':'')+'</div>';
      html+='<div style="font-size:10px;color:var(--muted);margin-bottom:6px">'+done+' complete</div>';
      html+=kids.map(c=>{
        const cDone=VID_STEPS.every(s=>c[s]==='done'||c[s]==='na')&&c.post_date&&c.duration_minutes;
        return'<div style="padding:2px 0;font-size:11px;white-space:nowrap;display:flex;align-items:center;gap:4px"><span style="color:'+(cDone?'#10b981':'rgba(139,92,246,.4)')+'">●</span>'+_esc(c.topic||c.title)+'</div>';
      }).join('');
    }else if(v.big_video_id){
      const parent=(st.videos||[]).find(x=>!x.is_deleted&&String(x.id)===String(v.big_video_id));
      if(parent){
        html='<div style="font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px">Part of</div>';
        html+='<div style="padding:2px 0;font-size:11px;white-space:nowrap;font-weight:600">'+_esc(parent.topic||parent.title)+'</div>';
      }
    }
    if(!html)return;
    const tip=document.createElement('div');
    tip.id='vidBulletTip';
    tip.style.cssText='position:fixed;z-index:9999;padding:8px 12px;border-radius:12px;background:rgba(255,252,248,.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(210,205,228,.3);box-shadow:0 8px 24px rgba(0,0,0,.1),inset 0 1px 0 rgba(255,255,255,.7);pointer-events:none;max-width:260px';
    tip.innerHTML=html;
    document.body.appendChild(tip);
    const rect=e.target.getBoundingClientRect();
    tip.style.left=rect.right+6+'px';
    tip.style.top=rect.top-4+'px';
    const tr=tip.getBoundingClientRect();
    if(tr.right>window.innerWidth)tip.style.left=rect.left-tr.width-6+'px';
    if(tr.bottom>window.innerHeight)tip.style.top=window.innerHeight-tr.height-4+'px';
  },300);
}
function _vidBulletTipHide(){
  clearTimeout(_vidBulletTimer);_vidBulletTimer=null;
  const t=document.getElementById('vidBulletTip');if(t)t.remove();
}

// Row hover: highlight related ideas
function _vidIdeaRowEnter(sid){
  const v=(st.videos||[]).find(x=>String(x.id)===sid);if(!v)return;
  let relatedIds=[];
  if(v.video_type==='B'){
    relatedIds=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===sid&&c.status==='idea').map(c=>String(c.id));
  }else if(v.big_video_id){
    relatedIds=[String(v.big_video_id)];
  }
  relatedIds.forEach(id=>{
    const row=document.querySelector('.vid-dash-row[data-vid="'+id+'"]');
    if(row)row.style.boxShadow='inset 0 0 8px rgba(139,92,246,.2)';
  });
}
function _vidIdeaRowLeave(){
  document.querySelectorAll('.vid-dash-row[data-vid]').forEach(r=>r.style.boxShadow='');
}

function _vidParseDate(str){
  if(!str||!str.trim())return null;
  const parts=str.trim().split('/');
  if(parts.length<2)return null;
  const m=parseInt(parts[0]),d=parseInt(parts[1]);
  if(!m||!d)return null;
  let y=parts[2]?parseInt(parts[2]):new Date().getFullYear();
  if(y<100)y+=2000;
  return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function _vidDashDblClick(e,id){
  const span=e.target.closest('[data-field]');
  if(span&&_vidView==='dashboard'){
    e.stopPropagation();
    _vidDashInlineEdit(span,id,span.dataset.field);
    return;
  }
  openVidEdit(id);
}
function _vidDashInlineEdit(span,id,field){
  if(span._editing)return;
  const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(!v)return;
  span._editing=true;
  let el;
  if(field==='post_date'){
    el=document.createElement('input');el.type='text';el.placeholder='m/d';
    el.value=v.post_date?_vidPostStr(v.post_date,true):'';
    el.style.cssText='width:52px;font-size:10px;border:1px solid var(--border);border-radius:4px;padding:1px 2px;background:var(--bg);color:var(--text);outline:none;font-family:inherit;box-sizing:border-box;text-align:right';
  }else if(field==='duration_minutes'){
    el=document.createElement('input');el.type='number';el.step='0.01';el.value=v.duration_minutes||'';
    el.style.cssText='width:36px;font-size:10px;border:1px solid var(--border);border-radius:4px;padding:1px 2px;background:var(--bg);color:var(--text);outline:none;font-family:inherit;box-sizing:border-box;text-align:right';
  }else return;
  const orig=span.innerHTML;
  span.textContent='';span.appendChild(el);el.focus();el.select();
  const commit=()=>{
    if(!span._editing)return;span._editing=false;
    const prev={[field]:v[field]};
    if(field==='post_date')v.post_date=_vidParseDate(el.value);
    else if(field==='duration_minutes')v.duration_minutes=parseFloat(el.value)||null;
    save();renderVideosPageKeepScroll();
    pushUndo(async()=>{Object.assign(v,prev);save();renderVideosPageKeepScroll();await sbReqSilent('PATCH','videos',prev,`?id=eq.${v.id}`);},'Inline edit');
    sbReqSilent('PATCH','videos',{[field]:v[field]},`?id=eq.${v.id}`);
  };
  el.addEventListener('blur',commit);
  el.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();el.blur();}if(ev.key==='Escape'){span._editing=false;span.innerHTML=orig;}});
}
function _vidUpdateChildSel(){
  _vidChildSelected.clear();
  _vidSelected.forEach(sid=>{
    const v=(st.videos||[]).find(x=>String(x.id)===sid);
    if(v&&v.video_type==='B'){
      (st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===sid).forEach(c=>{
        const cid=String(c.id);
        if(!_vidSelected.has(cid))_vidChildSelected.add(cid);
      });
    }
  });
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
    ['idea','up_next','in_progress','published','backup'].forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;if(v.status===s)o.selected=true;el.appendChild(o);});
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
    if(!id)return;
    r.classList.toggle('vid-sel',_vidSelected.has(id));
    r.classList.toggle('vid-child-sel',_vidChildSelected.has(id));
  });
}

// ── Context Menu ──────────────────────────────────────────────────────────────
function showVidCtx(e,id){
  // Let step dot right-click handle na toggle instead of context menu
  const dot=e.target.closest('.vid-step-dot');
  if(dot){e.preventDefault();e.stopPropagation();const vid=dot.dataset.vid;const step=dot.dataset.step;if(vid&&step)_vidToggleStepNa(vid,step);return;}
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
function vidCtxDelete(){document.getElementById('vidCtxMenu').style.display='none';const all=new Set([..._vidSelected,..._vidChildSelected]);all.forEach(id=>delVideo(id));_vidSelected.clear();_vidChildSelected.clear();}

// ── Modal ─────────────────────────────────────────────────────────────────────
let _vidDropdownData={BigVideo:[]};

function _vidPopulateBigVideoSelect(selectedId){
  const inp=document.getElementById('vmBigVideo');
  const bVids=(st.videos||[]).filter(v=>!v.is_deleted&&v.video_type==='B').sort((a,b)=>(a.topic||'').localeCompare(b.topic||''));
  _vidDropdownData.BigVideo=bVids.map(v=>({id:v.id,label:v.topic||v.title}));
  if(selectedId){
    const match=bVids.find(v=>String(v.id)===String(selectedId));
    inp.value=match?(match.topic||match.title):'';
  }else{inp.value='';}
}
function _vidGetBigVideoId(){
  const val=document.getElementById('vmBigVideo').value.trim();
  if(!val)return null;
  const exact=(st.videos||[]).find(v=>!v.is_deleted&&v.video_type==='B'&&(v.topic===val||v.title===val));
  if(exact)return exact.id;
  const words=val.toLowerCase().split(/\s+/).filter(Boolean);
  const fuzzy=(st.videos||[]).find(v=>{
    if(v.is_deleted||v.video_type!=='B')return false;
    const l=((v.topic||'')+' '+(v.title||'')).toLowerCase();
    return words.every(w=>l.includes(w));
  });
  return fuzzy?fuzzy.id:null;
}

const _VID_STATUS_OPTIONS=[
  {value:'idea',label:'1. Idea'},{value:'up_next',label:'2. Up Next'},{value:'in_progress',label:'3. In Progress'},{value:'published',label:'4. Complete'},{value:'backup',label:'4. Backup'}
];
function _vidModalKey(event){
  if(event.key==='Escape'){event.stopPropagation();closeMod('vidModal');}
  else if(event.key==='Enter'&&(event.metaKey||event.target.tagName!=='TEXTAREA')&&!event.target.closest('#vmStatusDrop')&&!event.target.closest('#vmBigVideoDrop')){event.preventDefault();saveVidModal();}
}
function _vidShowDropdown(type){_vidFilterDropdown(type);}
function _vidToggleDropdown(type){
  const drop=document.getElementById('vm'+type+'Drop');
  if(drop.style.display==='block'){drop.style.display='none';return;}
  _vidRenderDropdown(type,false);
}
function _vidFilterDropdown(type){_vidRenderDropdown(type,true);}
function _vidRenderDropdown(type,useFilter){
  const drop=document.getElementById('vm'+type+'Drop');
  const itemStyle='padding:6px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid rgba(210,205,228,.1)';
  let html='';
  if(type==='Status'){
    html=_VID_STATUS_OPTIONS.map((o,i)=>`<div class="vm-drop-item" tabindex="-1" data-idx="${i}" onclick="_vidPickDropdown('Status','${o.value}')" onkeydown="_vidDropItemKey(event,'Status',${i})" style="${itemStyle}">${o.label}</div>`).join('');
  }else if(type==='BigVideo'){
    const inp=document.getElementById('vmBigVideo');
    const q=useFilter?(inp.value||'').toLowerCase():'';
    const words=q.split(/\s+/).filter(Boolean);
    const onCurrent=_vidView==='dashboard';
    const items=_vidDropdownData.BigVideo.filter(v=>{
      if(onCurrent){const bv=(st.videos||[]).find(x=>String(x.id)===String(v.id));if(bv&&(bv.status==='published'||bv.status==='backup'))return false;}
      if(!words.length)return true;
      const l=v.label.toLowerCase();
      return words.every(w=>l.includes(w));
    });
    html=`<div class="vm-drop-item" tabindex="-1" data-idx="0" onclick="_vidPickDropdown('BigVideo','')" onkeydown="_vidDropItemKey(event,'BigVideo',0)" style="${itemStyle};color:var(--muted);font-style:italic">None</div>`;
    html+=items.map((v,i)=>`<div class="vm-drop-item" tabindex="-1" data-idx="${i+1}" onclick="_vidPickDropdown('BigVideo','${_esc(v.label)}')" onkeydown="_vidDropItemKey(event,'BigVideo',${i+1})" style="${itemStyle}">${_esc(v.label)}</div>`).join('');
  }
  drop.innerHTML=html;
  drop.style.display='block';
  // Add hover styles
  drop.querySelectorAll('.vm-drop-item').forEach(el=>{
    el.addEventListener('mouseenter',()=>el.style.background='rgba(139,92,246,.08)');
    el.addEventListener('mouseleave',()=>el.style.background='transparent');
  });
}
function _vidDropKey(event,type){
  const drop=document.getElementById('vm'+type+'Drop');
  if(event.key==='ArrowDown'){
    event.preventDefault();
    if(drop.style.display!=='block')_vidRenderDropdown(type,false);
    const first=drop.querySelector('.vm-drop-item');
    if(first)first.focus();
  }else if(event.key==='ArrowUp'){
    event.preventDefault();
    if(drop.style.display!=='block')_vidRenderDropdown(type,false);
    const items=drop.querySelectorAll('.vm-drop-item');
    if(items.length)items[items.length-1].focus();
  }else if(event.key==='Escape'){
    drop.style.display='none';
  }else if(event.key==='Tab'){
    drop.style.display='none';
  }
}
function _vidDropItemKey(event,type,idx){
  const drop=document.getElementById('vm'+type+'Drop');
  const items=drop.querySelectorAll('.vm-drop-item');
  if(event.key==='ArrowDown'){
    event.preventDefault();event.stopPropagation();
    const next=items[idx+1]||items[0];
    if(next)next.focus();
  }else if(event.key==='ArrowUp'){
    event.preventDefault();event.stopPropagation();
    const prev=items[idx-1]||items[items.length-1];
    if(prev)prev.focus();
  }else if(event.key==='Enter'){
    event.preventDefault();event.stopPropagation();
    items[idx].click();
  }else if(event.key==='Escape'){
    event.stopPropagation();
    drop.style.display='none';
    document.getElementById(type==='Status'?'vmStatusDisplay':'vmBigVideo').focus();
  }else if(event.key==='Tab'){
    drop.style.display='none';
  }
}
function _vidPickDropdown(type,val){
  if(type==='Status'){
    document.getElementById('vmStatus').value=val;
    const opt=_VID_STATUS_OPTIONS.find(o=>o.value===val);
    document.getElementById('vmStatusDisplay').value=opt?opt.label:val;
  }else{
    document.getElementById('vm'+type).value=val;
  }
  document.getElementById('vm'+type+'Drop').style.display='none';
}
function _vidSetStatusDisplay(val){
  const opt=_VID_STATUS_OPTIONS.find(o=>o.value===val);
  document.getElementById('vmStatusDisplay').value=opt?opt.label:val;
}
document.addEventListener('click',e=>{
  if(!e.target.closest('#vmBigVideo')&&!e.target.closest('#vmBigVideoDrop')&&!e.target.closest('[onclick*="BigVideo"]')){
    const d=document.getElementById('vmBigVideoDrop');if(d)d.style.display='none';
  }
  if(!e.target.closest('#vmStatusDisplay')&&!e.target.closest('#vmStatusDrop')&&!e.target.closest('[onclick*="Status"]')){
    const d=document.getElementById('vmStatusDrop');if(d)d.style.display='none';
  }
});

let _vidInsertOrder=null;
function openVidModalForBig(bigId){
  _vidInsertOrder=null;
  openVidModal('L');
  document.getElementById('vmType').value='L';
  _vidPopulateBigVideoSelect(bigId);
}
function openVidModalBetween(bigId,orderBefore,orderAfter){
  openVidModal('L');
  _vidInsertOrder=(orderBefore+orderAfter)/2;
  document.getElementById('vmType').value='L';
  _vidPopulateBigVideoSelect(bigId);
  const parent=(st.videos||[]).find(v=>String(v.id)===String(bigId));
  if(parent&&parent.status!=='idea'){document.getElementById('vmStatus').value=parent.status;_vidSetStatusDisplay(parent.status);}
}

function openVidModal(type){
  _vidMode='add';_vidEditId=null;_vidInsertOrder=null;
  document.getElementById('vidMTitle').textContent='Add Video';
  document.getElementById('vmTitle').value='';
  document.getElementById('vmTopic').value='';
  const t=type||'L';
  document.getElementById('vmType').value=t;
  _vidSetType(t);
  document.getElementById('vmStatus').value='idea';
  _vidSetStatusDisplay('idea');
  document.getElementById('vmPostDate').value='';
  document.getElementById('vmDuration').value='';

  document.getElementById('vmComment').value='';
  document.getElementById('vmBigVideoWrap').style.display=t==='B'?'none':'';
  _vidPopulateBigVideoSelect('');
  const defaults={};
  if(t==='L'){defaults.step_tableau_public='na';defaults.step_upload_tableau='na';}
  _vidRenderSteps(defaults);
  document.getElementById('vidModal').classList.add('open');
  setTimeout(()=>{const inp=document.getElementById('vmTopic');inp.focus();inp.setSelectionRange(0,0);},80);
}

function openVidEdit(id){
  const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(!v)return;
  _vidMode='edit';_vidEditId=String(v.id);
  document.getElementById('vidMTitle').textContent='Edit Video';
  document.getElementById('vmTitle').value=v.title||'';
  document.getElementById('vmTopic').value=v.topic||'';
  document.getElementById('vmType').value=v.video_type||'L';
  _vidSetType(v.video_type||'L');
  document.getElementById('vmStatus').value=v.status||'idea';
  _vidSetStatusDisplay(v.status||'idea');
  const _pd=v.post_date;
  document.getElementById('vmPostDate').value=_pd?parseInt(_pd.slice(5,7))+'/'+parseInt(_pd.slice(8,10))+(_pd.slice(0,4)!==String(new Date().getFullYear())?'/'+_pd.slice(2,4):''):'';
  document.getElementById('vmDuration').value=v.duration_minutes||'';
  document.getElementById('vmComment').value=v.comment||'';

  document.getElementById('vmBigVideoWrap').style.display=(v.video_type||'L')==='B'?'none':'';
  _vidPopulateBigVideoSelect(v.big_video_id||'');
  const stepVals={};VID_STEPS.forEach(s=>{stepVals[s]=v[s]||'not_started';});
  _vidRenderSteps(stepVals);
  document.getElementById('vidModal').classList.add('open');
  setTimeout(()=>{const inp=document.getElementById('vmTopic');inp.focus();const len=inp.value.length;inp.setSelectionRange(len,len);},80);
}

function _vidRenderSteps(vals){
  const el=document.getElementById('vmSteps');
  el.innerHTML=VID_STEPS.map(s=>{
    const cur=vals[s]||'not_started';
    const tab=cur==='na'?-1:0;
    return`<div style="display:flex;flex-direction:column;gap:2px;align-items:center">
      <span style="font-size:9px;color:${cur==='na'?'var(--border)':'var(--muted)'}">${VID_STEP_LABELS[s]}</span>
      <div data-step="${s}" data-val="${cur}" tabindex="${tab}" onclick="_vidToggleModalStep(this)" oncontextmenu="_vidNaModalStep(event,this);return false" onkeydown="_vidStepKey(event,this)" style="${_vidModalStepCSS(cur)}"></div>
    </div>`;
  }).join('');
}
function _vidModalStepCSS(val){
  const base='width:22px;height:22px;border-radius:3px;cursor:pointer;display:flex;align-items:center;justify-content:center;user-select:none;transition:transform .1s;';
  if(val==='done')return base+'border:1.5px solid #10b981;background:#10b981';
  if(val==='na')return base+'border:1.5px solid var(--border);background:var(--border);opacity:.35';
  return base+'border:1.5px solid rgba(210,205,228,.4);background:transparent';
}
function _vidStepKey(event,el){
  if(event.key==='c'||event.key==='C'){
    event.preventDefault();
    _vidToggleModalStep(el);
  }
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
  const linked=_vidLinkedStep(el.dataset.step);
  if(linked){
    const lEl=document.querySelector(`[data-step="${linked}"]`);
    if(lEl){lEl.dataset.val=next;_vidUpdateModalStep(lEl,next);}
  }
}
function _vidSetType(type){
  document.getElementById('vmType').value=type;
  const bBtn=document.getElementById('vmTypeB');
  const lBtn=document.getElementById('vmTypeL');
  if(type==='B'){
    bBtn.style.background='var(--accent)';bBtn.style.color='#fff';
    lBtn.style.background='transparent';lBtn.style.color='var(--muted)';
  }else{
    lBtn.style.background='var(--accent)';lBtn.style.color='#fff';
    bBtn.style.background='transparent';bBtn.style.color='var(--muted)';
  }
  _vidTypeChanged(type);
}
function _vidTypeChanged(type){
  document.getElementById('vmBigVideoWrap').style.display=type==='B'?'none':'';
  if(type==='B'){document.getElementById('vmBigVideo').value='';}
  const els=document.querySelectorAll('#vmSteps [data-step]');
  els.forEach(el=>{
    const s=el.dataset.step;
    if(type==='L'&&(s==='step_tableau_public'||s==='step_upload_tableau')){
      el.dataset.val='na';_vidUpdateModalStep(el,'na');
    }else if(type==='B'&&el.dataset.val==='na'&&(s==='step_tableau_public'||s==='step_upload_tableau')){
      el.dataset.val='not_started';_vidUpdateModalStep(el,'not_started');
    }
  });
}
function _vidUpdateModalStep(el,val){
  el.style.cssText=_vidModalStepCSS(val);
  el.textContent='';
  el.tabIndex=val==='na'?-1:0;
  el.parentElement.querySelector('span').style.color=val==='na'?'var(--border)':'var(--muted)';
}

async function saveVidModal(){
  const topic=document.getElementById('vmTopic').value.trim();
  if(!topic){closeMod('vidModal');return;}
  const title=document.getElementById('vmTitle').value.trim();
  const data={
    title:title||'',
    topic,
    status:document.getElementById('vmStatus').value||'idea',
    post_date:_vidParseDate(document.getElementById('vmPostDate').value)||null,
    duration_minutes:parseFloat(document.getElementById('vmDuration').value)||null,

    big_video_id:_vidGetBigVideoId(),
    comment:document.getElementById('vmComment').value.trim()||null
  };
  if(_vidMode==='edit'&&_vidEditId){
    const _ev=(st.videos||[]).find(x=>String(x.id)===String(_vidEditId));
    data.video_type=document.getElementById('vmType').value||(_ev?_ev.video_type:'L');
  }else{
    data.video_type=data.big_video_id?'L':(document.getElementById('vmType').value||'L');
  }
  // B videos cannot have a parent
  if(data.video_type==='B')data.big_video_id=null;
  document.querySelectorAll('#vmSteps [data-step]').forEach(el=>{data[el.dataset.step]=el.dataset.val||'not_started';});
  // Default Tab Pub + Upload to na for L-type videos with a parent group (not standalone)
  if(_vidMode==='add'&&data.video_type==='L'&&data.big_video_id){
    if(!data.step_tableau_public||data.step_tableau_public==='not_started')data.step_tableau_public='na';
    if(!data.step_upload_tableau||data.step_upload_tableau==='not_started')data.step_upload_tableau='na';
  }
  // Match parent status when assigned to a big video
  if(data.big_video_id){
    const parent=(st.videos||[]).find(x=>String(x.id)===String(data.big_video_id));
    if(parent){
      // Inherit parent's status (idea parents → idea, active parents → their status)
      if(parent.status==='idea')data.status='idea';
      else if(parent.status!=='published'&&parent.status!=='backup')data.status=parent.status;
    }
    // Place at bottom of new group
    const siblings=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(data.big_video_id));
    const maxOrder=Math.max(0,...siblings.map(c=>c.vid_order??0));
    data.vid_order=maxOrder+1;
  }
  // L videos without a big parent can't be in_progress/up_next
  if(data.video_type==='L'&&!data.big_video_id&&(data.status==='in_progress'||data.status==='up_next'))data.status='idea';
  closeMod('vidModal');

  if(_vidMode==='edit'&&_vidEditId){
    const v=(st.videos||[]).find(x=>String(x.id)===String(_vidEditId));
    if(v){
      const prev={...v};
      // If changing from B to L, unparent all children (they stay as standalone L videos)
      const wasB=prev.video_type==='B';
      const nowL=data.video_type==='L';
      const orphans=[];
      if(wasB&&nowL){
        const maxOrder=Math.max(0,...(st.videos||[]).filter(x=>!x.is_deleted&&x.status==='idea').map(x=>x.vid_order??0));
        (st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(v.id)).forEach((c,i)=>{
          orphans.push({id:c.id,prevBigId:c.big_video_id,prevStatus:c.status,prevOrder:c.vid_order});
          c.big_video_id=null;
          c.status='idea';
          c.vid_order=maxOrder+1+i;
        });
      }
      Object.assign(v,data);
      const allStepsDone=VID_STEPS.every(s=>v[s]==='done'||v[s]==='na');
      const hasFields=v.post_date&&v.duration_minutes&&v.topic&&v.title;
      if(allStepsDone&&hasFields&&v.status!=='published'){v.status='published';data.status='published';}
      else if((!allStepsDone||!hasFields)&&v.status==='published'){v.status='in_progress';data.status='in_progress';}
      save();renderVideosPageKeepScroll();
      if(v.video_type==='B'&&v.status!==prev.status&&(v.status==='in_progress'||v.status==='up_next'))_vidPromoteChildren(v.id,v.status);
      pushUndo(async()=>{
        Object.assign(v,prev);
        orphans.forEach(o=>{const c=(st.videos||[]).find(x=>String(x.id)===String(o.id));if(c){c.big_video_id=o.prevBigId;c.status=o.prevStatus;c.vid_order=o.prevOrder;}});
        save();renderVideosPageKeepScroll();
        await sbReqSilent('PATCH','videos',prev,`?id=eq.${_vidEditId}`);
        for(const o of orphans)await sbReqSilent('PATCH','videos',{big_video_id:o.prevBigId,status:o.prevStatus,vid_order:o.prevOrder??null},`?id=eq.${o.id}`);
      },'Edited video');
      await sbReqSilent('PATCH','videos',data,`?id=eq.${_vidEditId}`);
      for(const o of orphans){const c=(st.videos||[]).find(x=>String(x.id)===String(o.id));await sbReqSilent('PATCH','videos',{big_video_id:null,status:'idea',vid_order:c?c.vid_order:null},`?id=eq.${o.id}`);}
    }
  }else{
    if(_vidInsertOrder!=null){data.vid_order=_vidInsertOrder;_vidInsertOrder=null;}
    const tmp='l-'+Date.now();
    const rec={id:tmp,...data};
    st.videos.push(rec);save();renderVideosPageKeepScroll();
    pushUndo(async()=>{
      const v=(st.videos||[]).find(x=>x.id===tmp||x.id===rec.id);
      if(v){v.is_deleted=true;save();renderVideosPageKeepScroll();const sid=String(v.id);if(!sid.startsWith('l-'))await sbReqSilent('PATCH','videos',{is_deleted:true},`?id=eq.${sid}`);}
    },'Added video');
    const sv=await sbReqSilent('POST','videos',data);
    if(sv&&sv[0]){rec.id=sv[0].id;const ix=st.videos.findIndex(x=>x.id===tmp);if(ix>-1)st.videos[ix]=sv[0];}
    save();renderVideosPageKeepScroll();
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function delVideo(id){
  const sid=String(id);
  const v=(st.videos||[]).find(x=>String(x.id)===sid);if(!v)return;
  const copy={...v};
  v.is_deleted=true;
  _vidSelected.delete(sid);
  save();renderVideosPageKeepScroll();
  pushUndo(async()=>{v.is_deleted=false;save();renderVideosPageKeepScroll();if(!sid.startsWith('l-'))await sbReqSilent('PATCH','videos',{is_deleted:false},`?id=eq.${sid}`);},'Deleted video');
  if(!sid.startsWith('l-')){
    const res=await sbReqSilent('PATCH','videos',{is_deleted:true},`?id=eq.${sid}`);
    if(!res){
      // Fallback: try hard delete
      await sbReqSilent('DELETE','videos',null,`?id=eq.${sid}`);
    }
  }
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
async function _vidToggleStepNa(id,step){
  const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(!v)return;
  const cur=v[step]||'not_started';
  const next=cur==='na'?'not_started':'na';
  const prev=cur;
  // Sync TA and Up — they always match na/required state
  const linked=_vidLinkedStep(step);
  const linkedPrev=linked?v[linked]:null;
  v[step]=next;
  if(linked)v[linked]=next;
  const patch={[step]:next};
  if(linked)patch[linked]=next;
  save();renderVideosPageKeepScroll();
  pushUndo(async()=>{v[step]=prev;if(linked)v[linked]=linkedPrev;save();renderVideosPageKeepScroll();const up={[step]:prev};if(linked)up[linked]=linkedPrev;await sbReqSilent('PATCH','videos',up,`?id=eq.${id}`);},'Toggle n/a');
  await sbReqSilent('PATCH','videos',patch,`?id=eq.${id}`);
}
function _vidLinkedStep(step){
  if(step==='step_tableau_public')return'step_upload_tableau';
  if(step==='step_upload_tableau')return'step_tableau_public';
  return null;
}
function _vidIsComplete(v){return VID_STEPS.every(s=>v[s]==='done'||v[s]==='na')&&v.post_date&&v.duration_minutes&&v.topic&&v.title;}
function _vidAllChildrenComplete(bigId){
  const kids=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(bigId));
  return kids.every(k=>_vidIsComplete(k));
}
async function cycleVidStep(id,step){
  const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(!v)return;
  const cur=v[step]||'not_started';
  const next=cur==='na'?'not_started':cur==='done'?'not_started':'done';
  const prev=cur;
  const prevStatus=v.status;
  v[step]=next;
  // Auto-complete: all required steps done/na + post_date + duration + topic + title → published
  // For B videos: all children must also be complete
  const allDone=VID_STEPS.every(s=>v[s]==='done'||v[s]==='na');
  const wasDone=VID_STEPS.every(s=>(s===step?cur:v[s]||'not_started')==='done'||(s===step?cur:v[s]||'not_started')==='na');
  const hasFields=v.post_date&&v.duration_minutes&&v.topic&&v.title;
  const selfComplete=allDone&&hasFields;
  const kidsComplete=v.video_type!=='B'||_vidAllChildrenComplete(v.id);
  if(selfComplete&&kidsComplete&&v.status!=='published'){
    v.status='published';
  }else if((!selfComplete||!kidsComplete)&&v.status==='published'&&prevStatus==='published'){
    v.status='in_progress';
  }
  // Big video build toggle → cascade to all children
  const childUpdates=[];
  if(step==='step_build'&&v.video_type==='B'){
    (st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===String(v.id)).forEach(c=>{
      const cPrev=c.step_build||'not_started';
      if(cPrev===next)return;
      const cPrevStatus=c.status;
      childUpdates.push({c,cPrev,cPrevStatus});
      c.step_build=next;
      const cAllDone=VID_STEPS.every(s=>c[s]==='done'||c[s]==='na');
      const cHasFields=c.post_date&&c.duration_minutes&&c.topic&&c.title;
      if(cAllDone&&cHasFields&&c.status!=='published')c.status='published';
      else if((!cAllDone||!cHasFields)&&c.status==='published')c.status='in_progress';
    });
  }
  const patch={[step]:next};
  if(v.status!==prevStatus)patch.status=v.status;
  save();renderVideosPageKeepScroll();
  if(selfComplete&&kidsComplete&&!wasDone)_vidCelebrate(id);
  pushUndo(async()=>{
    v[step]=prev;v.status=prevStatus;
    childUpdates.forEach(d=>{d.c.step_build=d.cPrev;d.c.status=d.cPrevStatus;});
    save();renderVideosPageKeepScroll();
    await sbReqSilent('PATCH','videos',{[step]:prev,status:prevStatus},`?id=eq.${id}`);
    for(const d of childUpdates)await sbReqSilent('PATCH','videos',{step_build:d.cPrev,status:d.cPrevStatus},`?id=eq.${d.c.id}`);
  },'Step change');
  await sbReqSilent('PATCH','videos',patch,`?id=eq.${id}`);
  for(const d of childUpdates)await sbReqSilent('PATCH','videos',{step_build:d.c.step_build,status:d.c.status},`?id=eq.${d.c.id}`);
}

function _vidCelebrate(id){
  const row=document.querySelector(`[data-vid="${id}"]`);if(!row)return;
  const rect=row.getBoundingClientRect();
  // Glow pulse (inset so it stays within the row)
  row.style.transition='box-shadow .4s';
  row.style.boxShadow='inset 0 0 12px rgba(16,185,129,.35)';
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
    setTimeout(()=>row.style.transition='',300);
  },1800);
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if(activePg!=='videos')return;
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT'||e.target.isContentEditable)return;
  if((e.key==='Delete'||e.key==='Backspace')&&_vidSelected.size>0){e.preventDefault();const all=new Set([..._vidSelected,..._vidChildSelected]);all.forEach(id=>delVideo(id));_vidSelected.clear();_vidChildSelected.clear();return;}
  if((e.metaKey||e.ctrlKey)&&e.key==='c'&&_vidSelected.size>0){e.preventDefault();_vidCopied=[];_vidSelected.forEach(id=>{const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(v)_vidCopied.push({...v});});showToast('Copied '+_vidCopied.length+' video(s)','#0ea5e9',1500);return;}
  if((e.metaKey||e.ctrlKey)&&e.key==='v'&&_vidCopied.length>0){e.preventDefault();_vidCopied.forEach(v=>_vidDuplicate(v.id));return;}
  if(e.key==='n'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();openVidModal();return;}
  if(e.key==='ArrowLeft'&&!e.metaKey&&!e.ctrlKey&&_vidSelected.size===0){e.preventDefault();const tabs=['dashboard','table','board','monthly'];const i=tabs.indexOf(_vidView);if(i>0)_vidSetView(tabs[i-1]);return;}
  if(e.key==='ArrowRight'&&!e.metaKey&&!e.ctrlKey&&_vidSelected.size===0){e.preventDefault();const tabs=['dashboard','table','board','monthly'];const i=tabs.indexOf(_vidView);if(i<tabs.length-1)_vidSetView(tabs[i+1]);return;}
  if(e.key==='ArrowUp'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();const se=_vidScrollEl();if(se)se.scrollTop=0;return;}
  if(e.key==='ArrowDown'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();const se=_vidScrollEl();if(se)se.scrollTop=se.scrollHeight;return;}
  if(e.key==='e'&&!e.metaKey&&!e.ctrlKey&&_vidView==='table'){e.preventDefault();_vidShowCompleted=!_vidShowCompleted;renderVideosPageKeepScroll();return;}
  if(e.key==='c'&&!e.metaKey&&!e.ctrlKey&&_vidView==='table'){e.preventDefault();_vidShowCompleted=!_vidShowCompleted;renderVideosPageKeepScroll();return;}
});

// ── Close context menu on click elsewhere ─────────────────────────────────────
document.addEventListener('click',e=>{if(!e.target.closest('#vidCtxMenu'))document.getElementById('vidCtxMenu').style.display='none';});

function _esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
