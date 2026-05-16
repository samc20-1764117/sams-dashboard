// ── YouTube Analytics ────────────────────────────────────────────────────────
let _ytData=null,_ytMatch=null,_ytFetched=false;
let _ytAnalytics=null,_ytAnalyticsFetched=false;
function _ytEsc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function _ytDur(iso){var m=iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);if(!m)return'0:00';var h=m[1]?parseInt(m[1]):0,min=m[2]?parseInt(m[2]):0,s=m[3]?parseInt(m[3]):0;if(h)return h+':'+String(min).padStart(2,'0')+':'+String(s).padStart(2,'0');return min+':'+String(s).padStart(2,'0');}
function _ytNum(n){if(n>=1000000)return(n/1000000).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'K';return String(n);}
function _fmtDur(m){return m.toFixed(2);}
function _ytBuildMatch(){
  if(!_ytData||!_ytData.videos||!st.videos){console.log('[YT] _ytBuildMatch bail:',!_ytData,!_ytData?.videos,!st.videos);return;}
  _ytMatch={};
  var ytVids=_ytData.videos;
  var dbVids=(st.videos||[]).filter(function(v){return!v.is_deleted;});
  var usedYt=new Set();
  // Pass 1: match by post_date = publishedAt date
  // Group by date to handle same-day videos via title similarity
  var matched=0;
  var byDate={};
  for(var j=0;j<ytVids.length;j++){
    var ytDate=ytVids[j].publishedAt.slice(0,10);
    if(!byDate[ytDate])byDate[ytDate]=[];
    byDate[ytDate].push(j);
  }
  function _ytNorm(s){return(s||'').toLowerCase().replace(/[\u2018\u2019\u201C\u201D]/g,function(c){return c==='\u2018'||c==='\u2019'?"'":'"';}).replace(/[^\w\s]/g,'').trim();}
  function _ytTitleScore(dv,ytIdx){
    var words=_ytNorm((dv.title||'')+'  '+(dv.topic||'')).split(/\s+/).filter(Boolean);
    if(!words.length)return 0;
    var ytT=_ytNorm(ytVids[ytIdx].title||'');
    var score=0;
    for(var w=0;w<words.length;w++){if(words[w].length>2&&ytT.indexOf(words[w])>=0)score++;}
    return score;
  }
  // Pass 1a: exact date + exact title (case-insensitive)
  for(var i=0;i<dbVids.length;i++){
    var dv=dbVids[i];
    if(!dv.post_date||!dv.title)continue;
    var candidates=byDate[dv.post_date];
    if(!candidates)continue;
    var dbT=_ytNorm(dv.title);
    var exactJ=candidates.find(function(j){return!usedYt.has(j)&&_ytNorm(ytVids[j].title)===dbT;});
    if(exactJ!=null){
      var yt=ytVids[exactJ];
      _ytMatch[String(dv.id)]={views:yt.views,likes:yt.likes,comments:yt.comments,ytId:yt.id,publishedAt:yt.publishedAt,duration:yt.duration};
      usedYt.add(exactJ);matched++;
    }
  }
  // Pass 1b: exact date + best title score (must have score >= 2)
  for(var i=0;i<dbVids.length;i++){
    var dv=dbVids[i];
    if(!dv.post_date||_ytMatch[String(dv.id)])continue;
    var candidates=byDate[dv.post_date];
    if(!candidates)continue;
    var avail=candidates.filter(function(j){return!usedYt.has(j);});
    if(!avail.length)continue;
    var bestJ=avail[0],bestScore=-1;
    for(var k=0;k<avail.length;k++){
      var sc=_ytTitleScore(dv,avail[k]);
      if(sc>bestScore){bestScore=sc;bestJ=avail[k];}
    }
    if(bestScore>=2||(avail.length===1&&bestScore>=1)){
      var yt=ytVids[bestJ];
      _ytMatch[String(dv.id)]={views:yt.views,likes:yt.likes,comments:yt.comments,ytId:yt.id,publishedAt:yt.publishedAt,duration:yt.duration};
      usedYt.add(bestJ);matched++;
    }
  }
  // Pass 2: off-by-one date (UTC timezone shift) + title match
  for(var i2=0;i2<dbVids.length;i2++){
    var dv2=dbVids[i2];
    if(!dv2.post_date||_ytMatch[String(dv2.id)])continue;
    var d=new Date(dv2.post_date+'T12:00:00Z');
    var prev=new Date(d.getTime()-86400000).toISOString().slice(0,10);
    var next=new Date(d.getTime()+86400000).toISOString().slice(0,10);
    var nearby=(byDate[prev]||[]).concat(byDate[next]||[]).filter(function(j){return!usedYt.has(j);});
    if(!nearby.length)continue;
    var bestJ2=nearby[0],bestScore2=-1;
    for(var k2=0;k2<nearby.length;k2++){
      var sc2=_ytTitleScore(dv2,nearby[k2]);
      if(sc2>bestScore2){bestScore2=sc2;bestJ2=nearby[k2];}
    }
    if(bestScore2>0){
      var yt2=ytVids[bestJ2];
      _ytMatch[String(dv2.id)]={views:yt2.views,likes:yt2.likes,comments:yt2.comments,ytId:yt2.id,publishedAt:yt2.publishedAt,duration:yt2.duration};
      usedYt.add(bestJ2);
      matched++;
    }
  }
  // Pass 3: exact title match — steal back from wrong matches if needed
  var unmatchedBefore=dbVids.filter(v=>v.title&&v.status==='published'&&!_ytMatch[String(v.id)]);
  unmatchedBefore.forEach(function(dv3){
    var dbTitle=dv3.title?_ytNorm(dv3.title):'';
    if(!dbTitle)return;
    for(var j3=0;j3<ytVids.length;j3++){
      if(_ytNorm(ytVids[j3].title)!==dbTitle)continue;
      if(!usedYt.has(j3)){
        _ytMatch[String(dv3.id)]={views:ytVids[j3].views,likes:ytVids[j3].likes,comments:ytVids[j3].comments,ytId:ytVids[j3].id,publishedAt:ytVids[j3].publishedAt,duration:ytVids[j3].duration};
        usedYt.add(j3);matched++;break;
      }
      // Steal back: the thief doesn't have an exact title match, so we take it
      var thiefId=null;
      for(var d=0;d<dbVids.length;d++){var m=_ytMatch[String(dbVids[d].id)];if(m&&m.ytId===ytVids[j3].id){thiefId=String(dbVids[d].id);break;}}
      if(thiefId){
        var thiefV=dbVids.find(function(x){return String(x.id)===thiefId;});
        var thiefTitle=_ytNorm(thiefV&&thiefV.title||'');
        if(thiefTitle!==dbTitle){
          // Thief didn't have exact title — reassign to rightful owner
          delete _ytMatch[thiefId];
          _ytMatch[String(dv3.id)]={views:ytVids[j3].views,likes:ytVids[j3].likes,comments:ytVids[j3].comments,ytId:ytVids[j3].id,publishedAt:ytVids[j3].publishedAt,duration:ytVids[j3].duration};
          break;
        }
      }
    }
  });
  // Pass 4: re-match any videos that lost their match — try date±1 then best title across all
  dbVids.forEach(function(v){
    if(_ytMatch[String(v.id)]||v.status!=='published')return;
    // Try date-based first
    var candidates=v.post_date?(byDate[v.post_date]||[]).concat(byDate[new Date(new Date(v.post_date+'T12:00:00Z').getTime()-86400000).toISOString().slice(0,10)]||[]).concat(byDate[new Date(new Date(v.post_date+'T12:00:00Z').getTime()+86400000).toISOString().slice(0,10)]||[]).filter(function(j){return!usedYt.has(j);}):[];
    if(candidates.length){
      var bestJ=candidates[0],bestSc=-1;
      for(var k=0;k<candidates.length;k++){var s=_ytTitleScore(v,candidates[k]);if(s>bestSc){bestSc=s;bestJ=candidates[k];}}
      if(bestSc>=1){
        _ytMatch[String(v.id)]={views:ytVids[bestJ].views,likes:ytVids[bestJ].likes,comments:ytVids[bestJ].comments,ytId:ytVids[bestJ].id,publishedAt:ytVids[bestJ].publishedAt,duration:ytVids[bestJ].duration};
        usedYt.add(bestJ);matched++;return;
      }
    }
    // Try best title match across all unused YT videos
    var bestAll=-1,bestAllJ=-1;
    for(var j=0;j<ytVids.length;j++){
      if(usedYt.has(j))continue;
      var s2=_ytTitleScore(v,j);
      if(s2>bestAll){bestAll=s2;bestAllJ=j;}
    }
    if(bestAll>=3){
      _ytMatch[String(v.id)]={views:ytVids[bestAllJ].views,likes:ytVids[bestAllJ].likes,comments:ytVids[bestAllJ].comments,ytId:ytVids[bestAllJ].id,publishedAt:ytVids[bestAllJ].publishedAt,duration:ytVids[bestAllJ].duration};
      usedYt.add(bestAllJ);matched++;
    }
  });
  var unmatched=dbVids.filter(v=>v.status==='published'&&!_ytMatch[String(v.id)]);
  if(unmatched.length)console.log('[YT] Unmatched published:',unmatched.map(v=>v.title));
  // Debug rounded bars
  var rb=dbVids.find(v=>v.title&&v.title.includes('rounded bars bigger'));
  if(rb){
    var rbNorm=_ytNorm(rb.title);
    var ytMatch2=ytVids.find(function(y){return _ytNorm(y.title)===rbNorm;});
    console.log('[YT] RoundedBars: status='+rb.status+', id='+rb.id+', norm="'+rbNorm+'"');
    console.log('[YT] RoundedBars YT match:',ytMatch2?ytMatch2.title+' ('+ytMatch2.id+')':'NOT FOUND');
    if(ytMatch2){var idx=ytVids.indexOf(ytMatch2);console.log('[YT] RoundedBars usedYt:',usedYt.has(idx));}
  }
}
function _ytForVid(id){return _ytMatch?_ytMatch[String(id)]:null;}
function _ytDurMin(id){const m=_ytForVid(id);return m&&m.duration?Math.round(_ytDurSec(m.duration)/60*100)/100:null;}
function _ytPostDate(id){const m=_ytForVid(id);return m&&m.publishedAt?m.publishedAt.slice(0,10):null;}

let _ytDismissedSel=new Set();
let _ytCommentItems=[];  // current filtered list for shift-select
let _ytLastSelIdx=null;
function _ytGetDismissed(){return st._ytDismissed||[];}
function _ytSaveDismissed(arr){st._ytDismissed=arr;save();}

function _ytShowUnreplied(){
  _ytDismissedSel.clear();_ytLastSelIdx=null;
  const dismissed=_ytGetDismissed();
  const all=(_ytData&&_ytData.unrepliedComments)||[];
  const items=all.filter(c=>!dismissed.includes(c.id));
  items.sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''));
  _ytCommentItems=items;
  let html='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
  html+='<div style="font-size:14px;font-weight:700">Unreplied Comments ('+items.length+')</div>';
  html+='<button id="ytDismissSelBtn" onclick="_ytDismissSelected()" style="display:none;padding:4px 10px;border:1px solid rgba(239,68,68,.3);border-radius:6px;background:rgba(239,68,68,.06);color:#ef4444;font-size:11px;cursor:pointer;font-family:inherit;font-weight:600">Dismiss Selected</button>';
  html+='</div>';
  if(!items.length)html+='<div style="color:var(--muted);font-size:12px">All caught up!</div>';
  html+='<div style="max-height:60vh;overflow-y:auto">';
  items.forEach((c,idx)=>{
    const vidTitle=c.videoTitle||'';
    const _cd=c.publishedAt?new Date(c.publishedAt):null;
    const _cAgo=_cd?Math.max(0,Math.round((Date.now()-_cd)/86400000)):null;
    const date=_cAgo!==null?(_cAgo===0?'today':_cAgo===1?'yesterday':_cAgo+'d ago'):'';
    html+=`<div id="ytc-${c.id}" data-idx="${idx}" style="display:flex;align-items:flex-start;gap:8px;padding:6px 4px;border-bottom:1px solid rgba(210,205,228,.12);cursor:pointer;border-radius:6px" onclick="_ytToggleSel('${c.id}',${idx},event)">
      <div style="flex:1;min-width:0">
        <div style="font-size:10px;color:var(--muted);margin-bottom:2px">${_esc(vidTitle)}${date?' · '+date:''}</div>
        <div style="font-size:12px;color:var(--text)">${c.text}</div>
      </div>
    </div>`;
  });
  html+='</div>';
  let ov=document.getElementById('ytUnrepliedModal');
  if(!ov){
    ov=document.createElement('div');ov.id='ytUnrepliedModal';
    ov.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3)';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    document.body.appendChild(ov);
  }
  ov.innerHTML='<div style="background:var(--bg);border-radius:14px;padding:20px;max-width:520px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,.15);max-height:80vh;overflow:hidden;display:flex;flex-direction:column">'+html+'</div>';
  const _urKey=(e)=>{if((e.key==='Enter'&&!_ytDismissedSel.size)||e.key==='Escape'){const m=document.getElementById('ytUnrepliedModal');if(m)m.remove();document.removeEventListener('keydown',_urKey);}};
  document.addEventListener('keydown',_urKey);
}
function _ytToggleSel(id,idx,e){
  if(e.shiftKey&&_ytLastSelIdx!=null){
    // Shift: range select
    const lo=Math.min(_ytLastSelIdx,idx),hi=Math.max(_ytLastSelIdx,idx);
    for(let i=lo;i<=hi;i++)_ytDismissedSel.add(_ytCommentItems[i].id);
  }else if(e.metaKey||e.ctrlKey){
    // Cmd/Ctrl: toggle individual
    if(_ytDismissedSel.has(id))_ytDismissedSel.delete(id);else _ytDismissedSel.add(id);
  }else{
    // Plain click: select only this one
    _ytDismissedSel.clear();
    _ytDismissedSel.add(id);
  }
  _ytLastSelIdx=idx;
  // Update all row styles
  _ytCommentItems.forEach(c=>{
    const row=document.getElementById('ytc-'+c.id);
    if(row)row.style.background=_ytDismissedSel.has(c.id)?'rgba(239,68,68,.06)':'';
  });
  const btn=document.getElementById('ytDismissSelBtn');
  if(btn)btn.style.display=_ytDismissedSel.size?'block':'none';
}
function _ytDismissSelected(){
  const dismissed=_ytGetDismissed();
  _ytDismissedSel.forEach(id=>{if(!dismissed.includes(id))dismissed.push(id);});
  _ytSaveDismissed(dismissed);
  _ytShowUnreplied();
  renderVideosPageKeepScroll();
}

// ── Videos Page ─────────────────────────────────────────────────────────────
let _vidMode='add',_vidEditId=null;
let _vidSelected=new Set(),_vidChildSelected=new Set(),_vidLastSel=null,_vidCopied=[];
let _vidCtxId=null;
let _vidFilter='all';
let _vidGroupFilter='all';
let _vidSearch='',_vidSearchFilterFn=null;
let _vidMatchIds=[],_vidMatchIdx=0;
let _vidView=localStorage.getItem('_vidView')||'dashboard'; // dashboard | table | board | groups
let _vidSortCol=null,_vidSortDir=1,_vidShowCompleted=true,_vidTableScrolledOnce=false,_vidSearchTs=0;
let _anTopicFilter='all',_anScatterX='views',_anScatterY='likes';
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
  if(_vidSearchFilterFn)vids=vids.filter(_vidSearchFilterFn);
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
  // Dashboard: card overflow=hidden, scroll happens in child divs
  // Table/other: card itself scrolls (overflow=auto)
  if(_vidView==='dashboard')return card.querySelector('div')||null;
  return card;
}
function renderVideosPageKeepScroll(){
  const se=_vidScrollEl();const top=se?se.scrollTop:0;
  const dl=document.getElementById('vidDashLeft');const dlTop=dl?dl.scrollTop:0;
  const dr=document.getElementById('vidDashRight');const drTop=dr?dr.scrollTop:0;
  const wasScrolled=top>0||dlTop>0||drTop>0;
  renderVideosPage();
  if(!wasScrolled)return; // let _vidScrollToDefault handle initial position
  const restore=()=>{
    const se2=_vidScrollEl();if(se2)se2.scrollTop=top;
    const dl2=document.getElementById('vidDashLeft');if(dl2)dl2.scrollTop=dlTop;
    const dr2=document.getElementById('vidDashRight');if(dr2)dr2.scrollTop=drTop;
  };
  restore();
  requestAnimationFrame(()=>{restore();requestAnimationFrame(restore);});
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
  else if(_vidView==='analytics')bodyHtml=_vidRenderAnalytics();
  else if(_vidView==='monthly')bodyHtml=_vidRenderMonthly();
  else if(_vidView==='board')bodyHtml=_vidRenderBoard();
  if(_vidView==='groups'){_vidView='dashboard';bodyHtml=_vidRenderDashboard();}

  // Use the exact same pattern as recipes page (features.js line 2130-2139)
  el.style.cssText='padding:41px clamp(12px,3vw,56px) 24px clamp(12px,3vw,56px);display:flex;flex-direction:column;height:100vh;box-sizing:border-box;width:100%';
  el.innerHTML=`
    <div class="ov-topbar"><div class="ov-topbar-left"><span class="ov-topbar-label">Videos</span><span class="ov-topbar-dot"></span></div><span class="ov-topbar-date topbar-date"></span><div class="ov-topbar-right"><span class="ov-topbar-dot"></span><span class="ov-topbar-time topbar-time"></span></div></div>
    <div style="padding-top:4px">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:4px;flex-wrap:wrap;position:relative;z-index:1000">
        <div style="display:flex;gap:2px;background:var(--glass);border:1px solid var(--border);border-radius:8px;padding:2px">
          <button class="${viewBtnS('dashboard')}" onclick="_vidSetView('dashboard')">Current</button>
          <button class="${viewBtnS('table')}" onclick="_vidSetView('table')">All Details</button>
          <button class="${viewBtnS('analytics')}" onclick="_vidSetView('analytics')">Analytics</button>
          <button class="${viewBtnS('monthly')}" onclick="_vidSetView('monthly')">Monthly</button>
        </div>
        <div style="position:relative">
          <input id="vidSearchInput" type="text" autocomplete="off" placeholder="Search videos..." value="${_vidSearch.replace(/"/g,'&quot;')}" oninput="_vidSetSearch(this.value)" onkeydown="event.stopPropagation();_vidSearchKey(event)" onfocus="_vidSearchFocus()" style="padding:5px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:12px;background:var(--bg);color:var(--text);outline:none;width:180px">
          ${_vidSearch?`<div style="display:flex;align-items:center;gap:1px;position:absolute;right:6px;top:50%;transform:translateY(-50%)">
            <span id="vidSearchCount" style="font-size:10px;color:var(--muted);white-space:nowrap;margin-right:2px">...</span>
            <button onclick="_vidSearchNav(-1)" style="background:none;border:none;cursor:pointer;padding:0 2px;font-size:10px;color:var(--muted);line-height:1" title="Previous (Shift+Enter)">▲</button>
            <button onclick="_vidSearchNav(1)" style="background:none;border:none;cursor:pointer;padding:0 2px;font-size:10px;color:var(--muted);line-height:1" title="Next (Enter)">▼</button>
            <button onclick="_vidSearch='';_vidMatchIds=[];_vidSearchFilterFn=null;_vidFilter='all';document.getElementById('vidSearchInput').value='';document.getElementById('vidSearchSuggestions').style.display='none';renderVideosPage();_vidScrollToDefault()" style="background:none;border:none;cursor:pointer;padding:0 2px;font-size:10px;color:var(--muted);line-height:1" title="Clear (Esc)">✕</button>
          </div>`:''}
          <div id="vidSearchSuggestions" style="display:none;position:absolute;top:100%;left:0;margin-top:4px;background:var(--bg);border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.1);z-index:1001;max-height:200px;overflow-y:auto;width:520px"></div>
        </div>
        <div style="flex:1"></div>
        <div style="display:flex;gap:6px;align-items:center">
          ${_ytData&&_ytData.channelStats?`
          <div style="background:rgba(120,113,145,.06);border-radius:20px;padding:4px 10px 4px 8px;display:flex;align-items:center;gap:4px;font-size:12px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span style="font-weight:600;color:#555">${_ytNum(_ytData.channelStats.subscribers)}</span>
          </div>
          <div style="background:rgba(120,113,145,.06);border-radius:20px;padding:4px 10px 4px 8px;display:flex;align-items:center;gap:4px;font-size:12px">
            <span style="font-weight:700;color:#999;font-size:13px">$</span>
            <span style="font-weight:600;color:#555">${_ytAnalytics&&_ytAnalytics.monthly?_ytNum(Math.round(_ytAnalytics.monthly.reduce((s,m)=>s+m.revenue,0))):'~'+_ytNum(Math.round(_ytData.channelStats.totalViews/1000*4))}</span>
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
        <button onclick="openVidModal()" style="background:rgba(255,255,255,.85);border:1px solid var(--border);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-right:56px" title="Add video">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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
  // On first render of any view, scroll to default position
  if(!_vidTableScrolledOnce&&_rvpTop===0){
    _vidTableScrolledOnce=true;
    _vidScrollToDefault();
  }
  if(_vidSearch)requestAnimationFrame(()=>_vidPostRenderMatches());
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
  // Fetch YouTube Analytics API data (actual revenue) — once per page load
  if(!_ytAnalyticsFetched){
    _ytAnalyticsFetched=true;
    try{var _lac=JSON.parse(localStorage.getItem('_ytAnalyticsCache')||'null');if(_lac&&_lac.monthly)_ytAnalytics=_lac;}catch(e){}
    fetch('/api/yt?mode=analytics&_='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();}).then(function(d){
      if(d.error)return;
      _ytAnalytics=d;
      try{localStorage.setItem('_ytAnalyticsCache',JSON.stringify(d));}catch(e){}
      if(_vidView==='analytics')renderVideosPageKeepScroll();
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
  // Auto-promote idea children whose parent B is active
  const _promoteQ=[];
  all.forEach(v=>{
    if(v.status==='idea'&&v.big_video_id){
      const par=all.find(p=>String(p.id)===String(v.big_video_id));
      if(par&&(par.status==='up_next'||par.status==='in_progress')){
        v.status=par.status;
        _promoteQ.push({id:v.id,status:par.status});
      }
    }
  });
  if(_promoteQ.length){save();for(const p of _promoteQ)sbReqSilent('PATCH','videos',{status:p.status},`?id=eq.${p.id}`);}
  let upNext=all.filter(v=>v.status==='up_next');
  let inProgress=all.filter(v=>v.status==='in_progress');
  let ideas=all.filter(v=>v.status==='idea');
  if(_vidSearch){
    const q=_vidSearch.toLowerCase();
    const match=v=>_vidSearchMatch(v,q);
    upNext=upNext.filter(match);inProgress=inProgress.filter(match);ideas=ideas.filter(match);
  }
  _vidDashVids=all.filter(v=>v.status!=='idea');
  const _hasYt=!!_ytMatch;
  const _colHdr=`<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <div style="display:flex;align-items:center;gap:0">${VID_STEPS.map(s=>`<div style="width:28px;text-align:center" title="${VID_STEP_LABELS[s]}">${VID_STEP_LABELS[s].length<=5?VID_STEP_LABELS[s]:VID_STEP_LABELS[s].slice(0,2)}</div>`).join('')}</div>
            <span style="width:52px;text-align:center;display:inline-block;font-size:10px;color:var(--muted);font-weight:600">Posted</span>
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
        <div style="padding-left:10px">Ideas</div>
      </div>
      <div id="vidDashLeft" style="grid-column:1;grid-row:2;min-height:0;overflow-y:auto;overflow-x:hidden;border-right:1px solid var(--border)">
        <div class="vid-drop-zone" data-drop-status="up_next" ondragover="_vidDashDragOver(event)" ondragleave="_vidDashDragLeave(event)" ondrop="_vidDashDrop(event,'up_next')" style="min-height:40px;background:rgba(14,165,233,.03);border-bottom:2px solid rgba(255,255,255,.9)">
          <div style="font-size:9px;font-weight:600;color:#0ea5e9;padding:6px 6px 6px 16px;letter-spacing:.03em;background:rgba(14,165,233,.06);display:flex;align-items:center;border-left:3px solid rgba(14,165,233,.4)">Up Next</div>
          ${upNext.length?_vidDashList(upNext,false):'<div style="color:var(--muted);font-size:11px;padding:8px 10px;opacity:.5">Drag ideas here</div>'}
        </div>
        <div class="vid-drop-zone" data-drop-status="in_progress" ondragover="_vidDashDragOver(event)" ondragleave="_vidDashDragLeave(event)" ondrop="_vidDashDrop(event,'in_progress')" style="min-height:40px;background:rgba(245,158,11,.03);border-bottom:2px solid rgba(255,255,255,.9)">
          <div style="font-size:9px;font-weight:600;color:#d97706;padding:6px 6px 6px 16px;letter-spacing:.03em;background:rgba(245,158,11,.06);display:flex;align-items:center;border-left:3px solid rgba(245,158,11,.4)">In Progress</div>
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
  const _escOrHl=t=>_vidSearch?_vidHighlight(t,_vidSearch):_esc(t);
  const _titleSuffix=v.title?'- '+_escOrHl(v.title):'';
  const primary=isComplete?v.title:(topic||v.title);
  const secondary=showTopicTitle?v.title:'';
  const _addBtn=simple?'':v.video_type==='B'?'<button onclick="event.stopPropagation();openVidModalForBig(\''+sid+'\')" style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:16px;text-align:center;border-radius:3px;border:1px solid var(--border);background:var(--bg);color:var(--muted);cursor:pointer;margin-right:8px;vertical-align:middle;padding:0;flex-shrink:0" title="Add child video">+</button>':(!isChild?'<button style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:16px;text-align:center;border-radius:3px;border:1px solid transparent;background:transparent;color:transparent;margin-right:8px;pointer-events:none;vertical-align:middle;padding:0;flex-shrink:0">+</button>':'');
  const _kidCount=v.video_type==='B'?(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===sid).length:0;
  const _kidBadge=_kidCount?'<span style="font-size:9px;color:rgba(140,135,160,.7);font-weight:400;margin-left:4px;position:relative;top:0.5px">('+_kidCount+')</span>':'';
  const _tHtml=(showTopicTitle?'<span class="'+titleCls+'">'+_escOrHl(topic)+'</span><span style="font-size:10px;color:var(--muted);margin-left:4px;font-weight:400">'+_titleSuffix+'</span>':'<span class="'+titleCls+'">'+_escOrHl(primary)+'</span>')+_kidBadge;
  if(simple){
    let hasGroup=false;
    if(v.video_type==='B'){
      const kids=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===sid);
      if(kids.length)hasGroup=true;
    }else if(v.big_video_id&&String(v.big_video_id)!==sid){
      const _par=(st.videos||[]).find(x=>!x.is_deleted&&String(x.id)===String(v.big_video_id));
      if(_par)hasGroup=true;
    }
    const bulletColor=hasGroup?'rgba(139,92,246,.45)':'#fff';
    const tipAttr=hasGroup?`onmouseenter="_vidBulletTipShow(event,'${sid}')" onmouseleave="_vidBulletTipHide()"`:'';
    return`<div class="vid-dash-row${sel?' vid-sel':''}" draggable="true" ondragstart="_vidDashDragStart(event,'${sid}')" data-vid="${sid}" onclick="vidRowClick(event,'${sid}')" ondblclick="openVidEdit('${sid}')" oncontextmenu="showVidCtx(event,'${sid}')" onmouseenter="_vidIdeaRowEnter('${sid}')" onmouseleave="_vidIdeaRowLeave()">
      <div style="flex:1;min-width:0;padding-left:10px;display:flex;align-items:center;${indent}${!isChild?'font-weight:600;':''}${titleStyle}" ${tipAttr}><span style="color:${bulletColor};font-size:8px;margin-right:6px;cursor:default">●</span>${_addBtn}${childMark}${numHtml}${_tHtml}</div>
      <button class="vid-del" data-vid="${sid}">✕</button>
    </div>`;
  }
  const _postSrc=_ytPostDate(sid)||v.post_date;
  const postStr=_vidPostStr(_postSrc);
  const isBig=v.video_type==='B';
  const bigRowStyle=isBig?'background:rgba(255,255,255,.50);':'';
  const _applicable=VID_STEPS.filter(s=>v[s]!=='na');
  const _done=_applicable.filter(s=>v[s]==='done').length;
  const _pct=_applicable.length?Math.round((_done/_applicable.length)*100):0;
  const _pctVal=(v.status==='in_progress'||v.status==='up_next')&&_pct>0&&_pct<100?_pct+'%':'';
  const _dropParent=v.video_type==='B'?sid:(v.big_video_id?String(v.big_video_id):null);
  const dropAttrs=_dropParent?'ondragover="_vidGroupDragOver(event)" ondragleave="_vidGroupDragLeave(event)" ondrop="_vidGroupDrop(event,\''+_dropParent+'\')"':'';
  return`<div class="vid-dash-row${sel?' vid-sel':''}${_vidChildSelected.has(sid)?' vid-child-sel':''}" draggable="true" ondragstart="_vidDashDragStart(event,'${sid}')" ${dropAttrs} data-vid="${sid}" onclick="vidRowClick(event,'${sid}')" ondblclick="_vidDashDblClick(event,'${sid}')" oncontextmenu="showVidCtx(event,'${sid}')" style="${bigRowStyle}">
    <div style="flex:1;min-width:0;padding-left:10px;display:flex;align-items:center;${indent}${!isChild?'font-weight:600;':''}${titleStyle}">
      ${_addBtn}${childMark}${numHtml}${_tHtml}
    </div>
    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
      <div style="display:flex;align-items:center;gap:0">${VID_STEPS.map(s=>`<div style="width:28px;text-align:center;display:flex;align-items:center;justify-content:center"><div class="vid-step-dot${v[s]==='done'?' done':v[s]==='na'?' na':''}" data-vid="${sid}" data-step="${s}" title="${VID_STEP_LABELS[s]}"></div></div>`).join('')}</div>
      <span class="vid-num" style="width:52px;text-align:right;font-size:11px;color:${_vidDateColor(_postSrc,v)};min-height:16px;display:inline-block">${postStr||''}</span>
      <span class="vid-num" style="width:28px;text-align:right;font-size:9px;color:var(--muted);font-weight:500;display:inline-block">${_pctVal}</span>
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
  renderVideosPageKeepScroll();
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
      else if(col==='duration'){av=_ytDurMin(String(a.id))||a.duration_minutes||0;bv=_ytDurMin(String(b.id))||b.duration_minutes||0;}
      else if(col==='posted'){av=_ytPostDate(String(a.id))||a.post_date||'';bv=_ytPostDate(String(b.id))||b.post_date||'';}
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
    <table class="vid-tbl" style="width:100%">
      <thead><tr>
        <th style="padding-left:16px;${thStyle}" onclick="vidTblSort('title')">Title${_vidSortArrow('title')}</th>
        <th style="width:${VID_STEPS.length*28}px;padding:0"><div style="display:flex;gap:0">${VID_STEPS.map(s=>`<div style="width:28px;text-align:center;font-size:10px" title="${VID_STEP_LABELS[s]}">${VID_STEP_LABELS[s].length<=5?VID_STEP_LABELS[s]:VID_STEP_LABELS[s].slice(0,2)}</div>`).join('')}</div></th>
        <th style="width:12px"></th>
        <th style="width:120px;${thStyle}" onclick="vidTblSort('status')">Status${_vidSortArrow('status')}</th>
        ${_ytMatch?'<th style="width:52px;text-align:right;'+thStyle+'" onclick="vidTblSort(\'posted\')">Posted'+_vidSortArrow('posted')+'</th><th style="width:46px;text-align:right;'+thStyle+'" onclick="vidTblSort(\'duration\')">Length'+_vidSortArrow('duration')+'</th><th style="width:44px;text-align:right">Views</th><th style="width:38px;text-align:right">Likes</th><th style="width:42px;text-align:right">Cmts</th>':''}
        <th style="width:30px"></th>
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
  const isSmall=v.video_type==='L'&&v.big_video_id;
  const indent=isChild?'padding-left:30px;':'padding-left:16px;';
  const childMark=isChild?'<span style="color:#fff;font-size:10px;margin-right:4px">└</span>':'';
  const titleColor=isSmall?'color:var(--muted);':'';
  const postNum=postMap&&postMap[sid];
  const numHtml=postNum?`<span style="color:var(--muted);font-size:10px;margin-right:6px;min-width:18px;display:inline-block">${postNum}</span>`:'';
  const addBtn=v.video_type==='B'?`<button onclick="event.stopPropagation();openVidModalForBig('${sid}')" style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:16px;text-align:center;border-radius:3px;border:1px solid var(--border);background:var(--bg);color:var(--muted);cursor:pointer;margin-right:8px;vertical-align:middle;padding:0;flex-shrink:0" title="Add child video">+</button>`:(!isChild?'<button style="font-size:10px;font-weight:700;width:16px;height:16px;line-height:16px;text-align:center;border-radius:3px;border:1px solid transparent;background:transparent;color:transparent;margin-right:8px;pointer-events:none;vertical-align:middle;padding:0;flex-shrink:0">+</button>':'');
  const _titleSuffix=v.title?'- '+_esc(v.title):'';
  const isBig=v.video_type==='B';
  const _tblApplicable=VID_STEPS.filter(s=>v[s]!=='na');
  const _tblDone=_tblApplicable.filter(s=>v[s]==='done').length;
  const _tblPct=_tblApplicable.length?Math.round((_tblDone/_tblApplicable.length)*100):0;
  return`<tr class="vid-row${sel?' vid-sel':''}" data-vid="${sid}" onclick="vidCellClick(event,'${sid}')" ondblclick="openVidEdit('${sid}')" oncontextmenu="showVidCtx(event,'${sid}')" style="${isBig?'background:rgba(255,255,255,.50)':''}">
    <td data-field="title" style="${indent}${!isChild?'font-weight:600;':''}${titleColor}overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${addBtn}${childMark}${numHtml}${(v.status==='in_progress'||v.status==='up_next')&&v.topic?`<span class="vid-title-text">${_esc(v.topic)}</span><span style="font-size:10px;color:var(--muted);margin-left:4px;font-weight:400">${_titleSuffix}</span>`:`<span class="vid-title-text">${_esc(v.title)}</span>`}${isBig?(()=>{const _kc=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===sid).length;return _kc?`<span style="font-size:9px;color:rgba(140,135,160,.7);font-weight:400;margin-left:4px;position:relative;top:0.5px">(${_kc})</span>`:''})():''}</td>
    <td style="padding:3px 0"><div style="display:flex;align-items:center;gap:0">${VID_STEPS.map(s=>`<div style="width:28px;text-align:center;display:flex;align-items:center;justify-content:center"><div class="vid-step-dot${v[s]==='done'?' done':v[s]==='na'?' na':''}" data-vid="${sid}" data-step="${s}" title="${VID_STEP_LABELS[s]}"></div></div>`).join('')}</div></td>
    <td></td>
    <td data-field="status" style="white-space:nowrap"><span class="vid-status-pill" style="background:${sc}12;color:${sc}">${VID_STATUS_LABELS[v.status]||v.status}${(v.status==='in_progress'||v.status==='up_next')&&_tblPct>0&&_tblPct<100?' · '+_tblPct+'%':''}</span></td>
    ${_ytMatch?(()=>{const ym=_ytForVid(sid);if(ym){const _ytPost=ym.publishedAt?_vidPostStr(ym.publishedAt.slice(0,10),true):'';const _ytLen=ym.duration?_fmtDur(Math.round(_ytDurSec(ym.duration)/60*100)/100):'';return'<td class="vid-num" style="text-align:right;font-size:11px;color:'+_vidDateColor(ym.publishedAt?ym.publishedAt.slice(0,10):null,v)+'">'+_ytPost+'</td><td class="vid-num" style="text-align:right;font-size:11px;color:var(--muted)">'+_ytLen+'</td><td class="vid-num" style="text-align:right;font-size:11px;color:var(--muted)">'+_ytNum(ym.views)+'</td><td class="vid-num" style="text-align:right;font-size:11px;color:var(--muted)">'+_ytNum(ym.likes)+'</td><td class="vid-num" style="text-align:right;font-size:11px;color:var(--muted)">'+_ytNum(ym.comments)+'</td>';}return'<td></td><td></td><td></td><td></td><td></td>';})():''}
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
      ${(()=>{const _d=v.duration_minutes||_ytDurMin(String(v.id));return _d?`<span class="vid-num">${_fmtDur(_d)}</span>`:'';})()}
      <div style="flex:1"></div>
      <div style="display:flex;align-items:center;gap:3px">
        <div style="width:36px;height:4px;background:var(--border);border-radius:2px;overflow:hidden"><div style="width:${pct}%;height:100%;background:#10b981;border-radius:2px"></div></div>
        <span class="vid-num" style="font-size:9px">${pct}%</span>
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
function _vidMonthNav(dir){_vidMonthOffset+=dir;renderVideosPageKeepScroll();}
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

// ── Analytics View ───────────────────────────────────────────────────────────
function _ytDurSec(iso){if(!iso)return 0;var m=iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);if(!m)return 0;return(parseInt(m[1])||0)*3600+(parseInt(m[2])||0)*60+(parseInt(m[3])||0);}
let _anTrendMetric='revenue';
let _anTrendPeriod='monthly';
let _anRevMode='earned'; // 'earned' = by month earned (real), 'posted' = by video post_date
function _anSetTrend(metric,period){if(metric)_anTrendMetric=metric;if(period)_anTrendPeriod=period;renderVideosPageKeepScroll();}
function _anToggleRevMode(){_anRevMode=_anRevMode==='earned'?'posted':'earned';renderVideosPageKeepScroll();}
function _anTopicInputChange(q){
  const list=document.getElementById('anTopicList');if(!list)return;
  const lq=q.toLowerCase();
  const all=(st.videos||[]).filter(v=>!v.is_deleted&&v.status==='published'&&v.topic);
  const topicCounts={};
  all.forEach(v=>{const t=v.topic;topicCounts[t]=(topicCounts[t]||0)+1;});
  const filtered=Object.entries(topicCounts).filter(([t])=>t.toLowerCase().includes(lq)).sort((a,b)=>b[1]-a[1]);
  if(!q){list.innerHTML='<div class="vid-sg-item" onmousedown="_anPickTopic(\'all\')" style="padding:5px 8px;font-size:11px;cursor:pointer;color:var(--muted)">All topics</div>'+filtered.map(([t,c])=>'<div class="vid-sg-item" onmousedown="_anPickTopic(\''+_esc(t.replace(/'/g,"\\'"))+'\')" style="padding:5px 8px;font-size:11px;cursor:pointer">'+_esc(t)+' <span style="color:var(--muted)">('+c+')</span></div>').join('');list.style.display='block';return;}
  if(!filtered.length){list.style.display='none';return;}
  list.style.display='block';
  list.innerHTML=filtered.map(([t,c])=>'<div class="vid-sg-item" onmousedown="_anPickTopic(\''+_esc(t.replace(/'/g,"\\'"))+'\')" style="padding:5px 8px;font-size:11px;cursor:pointer">'+_vidHighlight(t,lq)+' <span style="color:var(--muted)">('+c+')</span></div>').join('');
}
function _anTopicShowList(){_anTopicInputChange(document.getElementById('anTopicInput')?.value||'');}
function _anPickTopic(t){_anTopicFilter=t;const list=document.getElementById('anTopicList');if(list)list.style.display='none';renderVideosPageKeepScroll();}
let _anTipStore={};
function _anShowTip(e,key){
  _anHideTip();
  const data=_anTipStore[key];if(!data)return;
  const tip=document.createElement('div');tip.id='anStratTip';
  tip.style.cssText='position:fixed;z-index:9999;padding:10px 14px;border-radius:12px;background:rgba(255,252,248,.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(210,205,228,.3);box-shadow:0 8px 24px rgba(0,0,0,.12);max-width:300px;min-width:200px;pointer-events:none';
  tip.innerHTML='<div style="font-size:10px;font-weight:600;margin-bottom:6px;color:#333">'+data.title+'</div>'+data.html;
  document.body.appendChild(tip);
  const rect=e.currentTarget.getBoundingClientRect();
  const tr=tip.getBoundingClientRect();
  // Position to the left of the strategy panel (since it's on the right side)
  let left=rect.left-tr.width-8;
  if(left<8)left=rect.right+8;
  let top=rect.top;
  if(top+tr.height>window.innerHeight)top=window.innerHeight-tr.height-4;
  tip.style.left=left+'px';tip.style.top=top+'px';
}
function _anHideTip(){const t=document.getElementById('anStratTip');if(t)t.remove();}

function _anKpiModal(metric){
  const all=(st.videos||[]).filter(v=>!v.is_deleted);
  const published=all.filter(v=>v.status==='published'&&v.post_date);
  const ytVideoIds=new Set();
  if(_ytData&&_ytData.videos) _ytData.videos.forEach(v=>{if(_ytDurSec(v.duration)>60)ytVideoIds.add(v.id);});
  const merged=published.map(v=>{
    const yt=_ytForVid(v.id);if(!yt)return null;
    if(yt.ytId&&!ytVideoIds.has(yt.ytId))return null;
    return{...v,views:yt.views,likes:yt.likes,comments:yt.comments,ytId:yt.ytId};
  }).filter(v=>v&&v.views>0).sort((a,b)=>b.views-a.views);
  if(!merged.length)return;
  const rpm=4;
  const _moAbbr=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now=new Date();const _thisMonth=now.toISOString().slice(0,7);
  // Use real revenue from Analytics API if available
  const _hasReal=_ytAnalytics&&_ytAnalytics.monthly&&_ytAnalytics.monthly.length>0;
  const _realByMo={};if(_hasReal)_ytAnalytics.monthly.forEach(m=>{_realByMo[m.month]=m;});
  const months={};
  merged.forEach(v=>{
    if(!v.post_date)return;const k=v.post_date.slice(0,7);
    if(!months[k])months[k]={views:0,likes:0,comments:0,count:0,revenue:0};
    months[k].views+=v.views;months[k].likes+=v.likes;months[k].comments+=v.comments;months[k].count++;months[k].revenue+=Math.round(v.views/1000*rpm);
  });
  // For revenue drilldown, prefer real monthly revenue data
  if(_hasReal&&metric==='revenue'){
    // Replace with actual revenue by calendar month (real earnings per month)
    _ytAnalytics.monthly.forEach(m=>{
      if(!months[m.month])months[m.month]={views:0,likes:0,comments:0,count:0,revenue:0};
      months[m.month].realRevenue=Math.round(m.revenue);
    });
  }
  const sorted=Object.entries(months).sort((a,b)=>b[0].localeCompare(a[0]));
  const getVal=(d)=>{
    if(metric==='views')return{val:d.views,fmt:_ytNum(d.views)};
    if(metric==='avg')return{val:d.count?Math.round(d.views/d.count):0,fmt:_ytNum(d.count?Math.round(d.views/d.count):0)};
    if(metric==='videos')return{val:d.count,fmt:String(d.count)};
    if(metric==='revenue'){const v=d.realRevenue!=null?d.realRevenue:d.revenue;return{val:v,fmt:'$'+_ytNum(v)};}
    if(metric==='subscribers')return{val:d.views,fmt:_ytNum(d.views)};
    return{val:0,fmt:'0'};
  };
  const labels={views:'Total Views',avg:'Avg Views/Video',videos:'Videos Published',revenue:_hasReal?'Revenue (actual)':'Est. Revenue',subscribers:'Subscriber Growth'};
  const monthVals=sorted.map(([k,d])=>({key:k,...getVal(d)}));
  const best=monthVals.length?monthVals.reduce((a,b)=>a.val>b.val?a:b):null;
  const worst=monthVals.length>1?monthVals.reduce((a,b)=>a.val<b.val?a:b):null;
  let narrative='';
  if(sorted.length>=3){
    const recent3=sorted.slice(0,3).map(([,d])=>getVal(d).val);
    const older3=sorted.slice(3,6).map(([,d])=>getVal(d).val);
    if(recent3.length&&older3.length){
      const rAvg=recent3.reduce((s,v)=>s+v,0)/recent3.length;
      const oAvg=older3.reduce((s,v)=>s+v,0)/older3.length;
      if(oAvg>0){const pct=Math.round((rAvg-oAvg)/oAvg*100);narrative=pct>0?'Trending up '+pct+'% over last 3 months':'Down '+Math.abs(pct)+'% over last 3 months';}
    }
  }
  let html='<div style="padding:20px;max-height:70vh;overflow-y:auto">';
  html+='<div style="font-size:16px;font-weight:700;margin-bottom:4px">'+(labels[metric]||metric)+'</div>';
  if(narrative) html+='<div style="font-size:12px;color:var(--muted);margin-bottom:16px">'+narrative+'</div>';
  html+='<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px"><tr style="border-bottom:1px solid var(--border)"><th style="text-align:left;padding:4px 8px;font-weight:600">Month</th><th style="text-align:right;padding:4px 8px;font-weight:600">Value</th><th style="text-align:right;padding:4px 8px;font-weight:600">Change</th></tr>';
  sorted.forEach(([k,d],i)=>{
    const v=getVal(d);
    const prev=sorted[i+1]?getVal(sorted[i+1][1]):null;
    const pctChange=prev&&prev.val>0?Math.round((v.val-prev.val)/prev.val*100):null;
    const mo=parseInt(k.slice(5));const yr=k.slice(0,4);
    const label=_moAbbr[mo]+' '+yr;
    const isBest=best&&k===best.key;const isWorst=worst&&k===worst.key;const isCur=k===_thisMonth;
    html+='<tr style="border-bottom:1px solid var(--border);'+(isCur?'font-weight:600;':'')+(isBest?'background:rgba(22,163,74,.06);':'')+(isWorst?'background:rgba(220,38,38,.06);':'')+'">';
    html+='<td style="padding:4px 8px">'+label+(isBest?' (best)':'')+(isWorst?' (lowest)':'')+'</td>';
    html+='<td style="text-align:right;padding:4px 8px">'+v.fmt+'</td>';
    html+='<td style="text-align:right;padding:4px 8px;color:'+(pctChange>0?'#16a34a':pctChange<0?'#dc2626':'var(--muted)')+'">'+(pctChange!==null?(pctChange>0?'+':'')+pctChange+'%':'-')+'</td></tr>';
  });
  html+='</table>';
  // Top contributors
  let topContrib=[];
  const _vidRevMap={};if(_ytAnalytics&&_ytAnalytics.topVideos)_ytAnalytics.topVideos.forEach(v=>{_vidRevMap[v.videoId]=v.revenue;});
  if(metric==='revenue')topContrib=merged.map(v=>{const r=v.ytId&&_vidRevMap[v.ytId]!=null?_vidRevMap[v.ytId]:Math.round(v.views/1000*rpm);return{...v,_rev:r};}).sort((a,b)=>b._rev-a._rev).slice(0,5).map(v=>({...v,_fmt:(_hasReal?'':'~')+'$'+_ytNum(v._rev)}));
  else if(metric==='avg'||metric==='views'||metric==='subscribers')topContrib=merged.slice(0,5).map(v=>({...v,_fmt:_ytNum(v.views)+' views'}));
  else if(metric==='videos')topContrib=[];
  if(topContrib.length){
    html+='<div style="font-size:12px;font-weight:600;margin-bottom:8px">Top Contributors</div>';
    topContrib.forEach((v,i)=>{html+='<div style="display:flex;gap:6px;padding:3px 0;font-size:11px"><span style="color:var(--muted);width:14px">'+String(i+1)+'</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_ytEsc(v.title||'Untitled')+'</span><span style="color:var(--muted);flex-shrink:0">'+v._fmt+'</span></div>';});
  }
  html+='</div>';
  let ov=document.getElementById('kpiDrillModal');
  if(!ov){ov=document.createElement('div');ov.id='kpiDrillModal';ov.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3)';ov.onclick=function(e){if(e.target===ov)ov.remove();};document.body.appendChild(ov);}
  ov.innerHTML='<div style="background:var(--bg);border-radius:14px;padding:0;max-width:520px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,.15);max-height:80vh;overflow:hidden;display:flex;flex-direction:column"><div style="display:flex;justify-content:flex-end;padding:10px 14px 0"><button onclick="document.getElementById(\'kpiDrillModal\').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted);padding:0;line-height:1">&times;</button></div>'+html+'</div>';
  const _kpiKey=(e)=>{if(e.key==='Enter'||e.key==='Escape'){const m=document.getElementById('kpiDrillModal');if(m)m.remove();document.removeEventListener('keydown',_kpiKey);}};
  document.addEventListener('keydown',_kpiKey);
}

function _vidRenderAnalytics(){
  const all=(st.videos||[]).filter(v=>!v.is_deleted);
  const published=all.filter(v=>v.status==='published'&&v.post_date);
  const cs=_ytData?_ytData.channelStats:null;

  // Build a set of YT video IDs that are actual videos (>60s), not shorts/posts
  const ytVideoIds=new Set();
  if(_ytData&&_ytData.videos) _ytData.videos.forEach(v=>{if(_ytDurSec(v.duration)>60)ytVideoIds.add(v.id);});

  const merged=published.map(v=>{
    const yt=_ytForVid(v.id);
    if(!yt)return null;
    // Skip if the matched YT video is a short (<= 60s) or not in our long-form set
    if(yt.ytId&&!ytVideoIds.has(yt.ytId))return null;
    return{...v,views:yt.views,likes:yt.likes,comments:yt.comments,ytId:yt.ytId};
  }).filter(v=>v&&v.views>0).sort((a,b)=>b.views-a.views);

  if(!merged.length) return '<div style="padding:40px;text-align:center;color:var(--muted)">No YouTube data available yet. Publish videos and check back!</div>';

  const _mergedAll=merged; // keep unfiltered for topic list
  if(_anTopicFilter!=='all') merged=merged.filter(v=>v.topic===_anTopicFilter);

  const totalViews=merged.reduce((s,v)=>s+v.views,0);
  const totalLikes=merged.reduce((s,v)=>s+v.likes,0);
  const totalComments=merged.reduce((s,v)=>s+v.comments,0);
  const avgViews=Math.round(totalViews/merged.length);

  // Revenue estimate using $4 RPM midpoint
  const rpm=4;
  const estRevenue=Math.round(totalViews/1000*rpm);

  const engagements=merged.map(v=>({...v,engRate:v.views>0?((v.likes+v.comments)/v.views*100):0}));
  const avgEng=(engagements.reduce((s,v)=>s+v.engRate,0)/engagements.length);

  // Helpers
  function bar(val,max,color,label,sub,w){
    const pct=max?Math.round(val/max*100):0;
    return`<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
      <span style="font-size:11px;color:var(--muted);width:${w||'80px'};text-align:right;flex-shrink:0">${label}</span>
      <div style="flex:1;height:18px;background:rgba(120,113,145,.08);border-radius:4px;overflow:hidden">
        <div style="width:${Math.max(pct,2)}%;height:100%;background:${color};border-radius:4px"></div>
      </div>
      <span style="font-size:11px;font-weight:600;width:70px;flex-shrink:0">${sub}</span>
    </div>`;
  }
  function card(title,content){return`<div style="background:var(--glass);border:1px solid var(--border);border-radius:12px;padding:16px 18px">
    <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:10px">${title}</div>${content}</div>`;}
  function sparkline(vals){
    if(!vals||vals.length<2)return'';
    const max=Math.max(...vals),min=Math.min(...vals);
    const range=max-min||1;
    const up=vals[vals.length-1]>=vals[0];
    const c=up?'#16a34a':'#dc2626';
    const sw=44,sh=16;
    const pts=vals.map((v,i)=>`${(i/(vals.length-1)*sw).toFixed(1)},${(sh-((v-min)/range)*sh).toFixed(1)}`).join(' ');
    return`<svg width="${sw}" height="${sh}" style="flex-shrink:0"><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/></svg>`;
  }
  function stat(label,value,sub,spark){return`<div style="text-align:center;padding:6px 0">
    <div style="font-size:10px;color:var(--muted);margin-bottom:2px">${label}</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:6px">
      ${spark||''}<div style="font-size:20px;font-weight:700;color:var(--text)">${value}</div>
    </div>
    ${sub?'<div style="font-size:10px;color:var(--muted);margin-top:1px">'+sub+'</div>':''}</div>`;}

  const tBtn=(val,label,type)=>{
    const active=type==='metric'?_anTrendMetric===val:_anTrendPeriod===val;
    return`<button onclick="_anSetTrend(${type==='metric'?"'"+val+"',null":"null,'"+val+"'"})" style="padding:3px 8px;border:1px solid ${active?'rgba(120,113,145,.4)':'var(--border)'};border-radius:5px;background:${active?'rgba(120,113,145,.15)':'transparent'};color:${active?'var(--text)':'var(--muted)'};font-size:10px;font-family:inherit;font-weight:${active?'600':'400'};cursor:pointer">${label}</button>`;
  };

  let h='<div style="padding:16px 20px;overflow-y:auto">';

  // ── Build monthly buckets for KPI sparklines + this-month values ──
  const _kpiMonths={};
  merged.forEach(v=>{
    if(!v.post_date)return;
    const k=v.post_date.slice(0,7);
    if(!_kpiMonths[k])_kpiMonths[k]={views:0,likes:0,comments:0,count:0};
    _kpiMonths[k].views+=v.views;_kpiMonths[k].likes+=v.likes;_kpiMonths[k].comments+=v.comments;_kpiMonths[k].count++;
  });
  const _kpiSorted=Object.entries(_kpiMonths).sort((a,b)=>a[0].localeCompare(b[0]));
  const _kpiLast6=_kpiSorted.slice(-6);
  const now=new Date();
  const _thisMonth=now.toISOString().slice(0,7);
  const _tm=_kpiMonths[_thisMonth]||{views:0,likes:0,comments:0,count:0};
  // Real revenue from YouTube Analytics API (if available)
  const _hasRealRev=_ytAnalytics&&_ytAnalytics.monthly&&_ytAnalytics.monthly.length>0;
  const _realRevByMonth={};
  let _realRevTotal=0;
  if(_hasRealRev){
    _ytAnalytics.monthly.forEach(m=>{_realRevByMonth[m.month]=m.revenue;_realRevTotal+=m.revenue;});
  }
  const _realRevThisMonth=_hasRealRev?(_realRevByMonth[_thisMonth]||0):null;
  // Per-video real revenue map (ytId → revenue) from Analytics API topVideos
  const _vidRev={};
  if(_ytAnalytics&&_ytAnalytics.topVideos)_ytAnalytics.topVideos.forEach(v=>{_vidRev[v.videoId]=v.revenue;});
  // Attach real revenue to merged videos
  if(Object.keys(_vidRev).length) merged.forEach(v=>{if(v.ytId&&_vidRev[v.ytId]!=null)v.realRev=_vidRev[v.ytId];});
  // Revenue helper: real per-video revenue or RPM estimate
  const _vRev=(v)=>v.realRev!=null?v.realRev:Math.round(v.views/1000*rpm);
  const _revPfx=_hasRealRev?'':'~';
  const _spViews=_kpiLast6.map(([,d])=>d.views);
  const _spAvg=_kpiLast6.map(([,d])=>d.count?Math.round(d.views/d.count):0);
  const _spRev=_kpiLast6.map(([,d])=>Math.round(d.views/1000*rpm));
  const _spVids=_kpiLast6.map(([,d])=>d.count);
  const _spEng=_kpiLast6.map(([,d])=>d.views>0?((d.likes+d.comments)/d.views*100):0);

  // Show connect prompt if Analytics API not yet authorized
  if(!_ytAnalytics&&!_hasRealRev){
    h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;margin-bottom:12px;background:rgba(139,92,246,.04);border:1px solid rgba(139,92,246,.15);border-radius:10px;font-size:11px;color:var(--muted)"><span>Revenue shown is estimated (~$4 RPM).</span><a href="/api/yt?mode=auth-start" target="_blank" style="color:#8b5cf6;font-weight:600;text-decoration:none">Connect YouTube Analytics</a><span>for actual revenue data.</span></div>';
  }

  const _allTopics=[...new Set(_mergedAll.map(v=>v.topic).filter(Boolean))].sort();

  // ── KPIs (compact inline) ──
  const _dismissed=_ytGetDismissed();
  const _unrepliedAll=_ytData.unrepliedComments||[];
  const _unrepliedN=_unrepliedAll.filter(c=>!_dismissed.includes(c.id)).length;
  const _revLabel=_hasRealRev?'Revenue':'Est. Revenue';
  const _revValue=_hasRealRev?'$'+_ytNum(Math.round(_realRevTotal)):'$'+_ytNum(estRevenue);
  const _revSub=_hasRealRev?'$'+_ytNum(Math.round(_realRevThisMonth||0))+' this mo':'@ $'+rpm+' RPM';
  const _spRevReal=_hasRealRev?_kpiLast6.map(([k])=>Math.round(_realRevByMonth[k]||0)):_spRev;
  const _kc2=(fn,bg)=>`<div style="background:${bg||'var(--glass)'};border:1px solid var(--border);border-radius:10px;padding:18px 10px;cursor:pointer;display:flex;align-items:center;gap:8px;min-width:0;flex:1" onclick="${fn}">`;
  const _kStat=(label,val,spark)=>`${spark||''}<div style="min-width:0"><div style="font-size:9px;color:var(--muted);white-space:nowrap">${label}</div><div style="font-size:15px;font-weight:700;color:var(--text);white-space:nowrap">${val}</div></div>`;
  // ── TREND CHART + Strategy Insights ──
  const periodMap={};
  merged.forEach(v=>{
    if(!v.post_date)return;
    const key=_anTrendPeriod==='yearly'?v.post_date.slice(0,4):v.post_date.slice(0,7);
    if(!periodMap[key])periodMap[key]={views:0,likes:0,comments:0,count:0,vidRev:0};
    periodMap[key].views+=v.views;periodMap[key].likes+=v.likes;periodMap[key].comments+=v.comments;periodMap[key].count++;
    periodMap[key].vidRev+=_vRev(v);
  });
  // "By Month" mode: use real Analytics API monthly data (actual activity per calendar month)
  // "By Video" mode: attribute stats to the video's post_date
  const _useByMonth=_hasRealRev&&_anRevMode==='earned'&&_anTrendMetric!=='videos';
  let metricVals;
  if(_useByMonth){
    const moMap={};
    _ytAnalytics.monthly.forEach(m=>{
      const key=_anTrendPeriod==='yearly'?m.month.slice(0,4):m.month;
      if(!moMap[key])moMap[key]={views:0,revenue:0,likes:0,comments:0};
      moMap[key].views+=m.views;moMap[key].revenue+=m.revenue;moMap[key].likes+=m.likes;moMap[key].comments+=m.comments;
    });
    const moPeriods=Object.entries(moMap).sort((a,b)=>a[0].localeCompare(b[0]));
    const moSliced=_anTrendPeriod==='yearly'?moPeriods:moPeriods.slice(-12);
    metricVals=moSliced.map(([key,d])=>{
      if(_anTrendMetric==='revenue'){const v=Math.round(d.revenue);return{key,val:v,fmt:'$'+_ytNum(v)};}
      if(_anTrendMetric==='views')return{key,val:d.views,fmt:_ytNum(d.views)};
      if(_anTrendMetric==='likes')return{key,val:d.likes,fmt:_ytNum(d.likes)};
      if(_anTrendMetric==='engagement'){const r=d.views>0?((d.likes+d.comments)/d.views*100):0;return{key,val:r,fmt:r.toFixed(1)+'%'};}
      return{key,val:0,fmt:'0'};
    });
  } else {
    const periods=Object.entries(periodMap).sort((a,b)=>a[0].localeCompare(b[0]));
    const sliced=_anTrendPeriod==='yearly'?periods:periods.slice(-12);
    metricVals=sliced.map(([key,d])=>{
      if(_anTrendMetric==='revenue'){const v=Math.round(d.vidRev);return{key,val:v,fmt:'$'+_ytNum(v)};}
      if(_anTrendMetric==='views')return{key,val:d.views,fmt:_ytNum(d.views)};
      if(_anTrendMetric==='likes')return{key,val:d.likes,fmt:_ytNum(d.likes)};
      if(_anTrendMetric==='engagement'){const r=d.views>0?((d.likes+d.comments)/d.views*100):0;return{key,val:r,fmt:r.toFixed(1)+'%'};}
      if(_anTrendMetric==='videos')return{key,val:d.count,fmt:String(d.count)};
      return{key,val:0,fmt:'0'};
    });
  }
  const maxMetric=Math.max(...metricVals.map(m=>m.val),1);
  const _moAbbr=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const _curPeriod=_anTrendPeriod==='yearly'?String(now.getFullYear()):_thisMonth;
  const trendColor='rgba(120,113,145,.45)';
  const trendColorCur='rgba(120,113,145,.85)';
  const totalMetric=metricVals.reduce((s,m)=>s+m.val,0);
  const avgMetricVal=metricVals.length?totalMetric/metricVals.length:0;
  const perLabel=_anTrendPeriod==='yearly'?'yr':'mo';
  let summaryText='';
  if(_anTrendMetric==='engagement') summaryText='Avg: '+avgMetricVal.toFixed(1)+'%/'+perLabel;
  else if(_anTrendMetric==='revenue') summaryText='$'+_ytNum(totalMetric)+' total · $'+_ytNum(Math.round(avgMetricVal))+'/'+perLabel;
  else summaryText=_ytNum(totalMetric)+' total · '+_ytNum(Math.round(avgMetricVal))+'/'+perLabel;
  // Date perspective toggle — "By Month" (actual calendar month activity) vs "By Video" (attributed to post date)
  // Available for all metrics except "videos" (count is inherently by post date), requires Analytics API data
  const _showDateToggle=_hasRealRev&&_anTrendMetric!=='videos';
  const _dateToggle=_showDateToggle?`<div style="width:1px;height:18px;background:rgba(120,113,145,.3);margin:0 4px;flex-shrink:0"></div><div style="display:flex;gap:3px;align-items:center"><button onclick="_anToggleRevMode()" style="padding:3px 8px;border:1px solid ${_anRevMode==='earned'?'rgba(120,113,145,.4)':'var(--border)'};border-radius:5px;background:${_anRevMode==='earned'?'rgba(120,113,145,.15)':'transparent'};color:${_anRevMode==='earned'?'var(--text)':'var(--muted)'};font-size:10px;font-family:inherit;font-weight:${_anRevMode==='earned'?'600':'400'};cursor:pointer">Actual</button><button onclick="_anToggleRevMode()" style="padding:3px 8px;border:1px solid ${_anRevMode==='posted'?'rgba(120,113,145,.4)':'var(--border)'};border-radius:5px;background:${_anRevMode==='posted'?'rgba(120,113,145,.15)':'transparent'};color:${_anRevMode==='posted'?'var(--text)':'var(--muted)'};font-size:10px;font-family:inherit;font-weight:${_anRevMode==='posted'?'600':'400'};cursor:pointer">By Video</button></div>`:'';
  let trendHtml=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
    <div style="display:flex;gap:3px;align-items:center">${tBtn('revenue','Revenue','metric')}${tBtn('views','Views','metric')}${tBtn('likes','Likes','metric')}${tBtn('engagement','Engagement','metric')}${tBtn('videos','Videos','metric')}</div>
    <div style="width:1px;height:18px;background:rgba(120,113,145,.3);margin:0 4px;flex-shrink:0"></div>
    <div style="display:flex;gap:3px;align-items:center">${tBtn('monthly','Monthly','period')}${tBtn('yearly','Yearly','period')}</div>
    ${_dateToggle}
    <div style="flex:1"></div>
    <span style="font-size:11px;color:var(--muted);white-space:nowrap;line-height:1">${summaryText}</span>
  </div>`;
  // Forecast for current month: blend current pace with historical avg
  const _daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const _dayOfMonth=now.getDate();
  const _monthProgress=Math.max(_dayOfMonth/_daysInMonth,0.05);
  // Historical avg of completed months (exclude current)
  const _completedVals=metricVals.filter(m=>m.key!==_curPeriod);
  const _histAvg=_completedVals.length?_completedVals.reduce((s,m)=>s+m.val,0)/_completedVals.length:0;

  const _barH=350; // bar area height in px
  trendHtml+='<div style="display:flex;align-items:flex-end;gap:2px;height:'+(_barH+40)+'px;padding:0 8px">';
  metricVals.forEach(m=>{
    const isCur=m.key===_curPeriod&&_anTrendPeriod==='monthly';
    let forecast=0;
    if(isCur&&_monthProgress<0.95){
      const paceProj=m.val/_monthProgress;
      forecast=Math.round(paceProj*0.6+_histAvg*0.4);
      if(forecast<m.val)forecast=m.val;
    }
    const barPx=Math.max(Math.round(m.val/maxMetric*_barH),3);
    const label=_anTrendPeriod==='yearly'?m.key:(_moAbbr[parseInt(m.key.slice(5))]||m.key.slice(5));
    const fmtFn=(v)=>_anTrendMetric==='revenue'?'$'+_ytNum(v):_anTrendMetric==='engagement'?v.toFixed(1)+'%':_ytNum(v);
    if(isCur&&forecast>m.val){
      const forecastPx=Math.max(Math.round(forecast/maxMetric*_barH),3);
      const stripePx=forecastPx-barPx;
      trendHtml+=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end">
          <span style="font-size:11px;color:var(--muted);white-space:nowrap;margin-bottom:3px">${fmtFn(forecast)}</span>
          <div style="width:55%;display:flex;flex-direction:column;align-items:stretch">
            <div style="height:${stripePx}px;background:repeating-linear-gradient(135deg,${trendColorCur},${trendColorCur} 2px,transparent 2px,transparent 5px);border-radius:4px 4px 0 0;opacity:.5"></div>
            <div style="height:${barPx}px;background:${trendColorCur};border-radius:0 0 4px 4px;box-shadow:0 0 0 1.5px rgba(120,113,145,.3);display:flex;align-items:flex-start;justify-content:center;overflow:visible;position:relative">
              <span style="font-size:10px;color:#fff;font-weight:600;white-space:nowrap;position:absolute;top:2px">${m.fmt}</span>
            </div>
          </div>
        <span style="font-size:11px;margin-top:4px;font-weight:700;color:var(--text)">${label}</span>
      </div>`;
    } else {
      trendHtml+=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end">
          <span style="font-size:11px;color:var(--muted);white-space:nowrap;margin-bottom:3px">${m.fmt}</span>
          <div style="width:55%;height:${barPx}px;background:${isCur?trendColorCur:trendColor};border-radius:4px${isCur?';box-shadow:0 0 0 1.5px rgba(120,113,145,.3)':''}" title="${m.key+': '+m.fmt}"></div>
        <span style="font-size:11px;margin-top:4px;${isCur?'font-weight:700;color:var(--text)':'color:var(--muted)'}">${label}</span>
      </div>`;
    }
  });
  trendHtml+='</div>';
  // ── TREND (2/3) + Strategy Insights (1/3) ──
  // Duration sweet spot
  const durBuckets={'0-5 min':{min:0,max:5},'5-10 min':{min:5,max:10},'10-20 min':{min:10,max:20},'20-40 min':{min:20,max:40},'40+ min':{min:40,max:9999}};
  const durData={};
  merged.forEach(v=>{if(!v.duration_minutes)return;const mins=parseInt(String(v.duration_minutes).split('.')[0])||0;for(const[label,range] of Object.entries(durBuckets)){if(mins>=range.min&&mins<range.max){if(!durData[label])durData[label]={views:0,eng:0,count:0};durData[label].views+=v.views;durData[label].count++;break;}}});
  const durArr=Object.entries(durBuckets).map(([label])=>{const d=durData[label]||{views:0,count:0};return{label,avgViews:d.count?Math.round(d.views/d.count):0,count:d.count};}).filter(d=>d.count>0);
  const bestDur=durArr.length?durArr.reduce((a,b)=>a.avgViews>b.avgViews?a:b):null;

  // Best publish day
  const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayData=Array(7).fill(null).map(()=>({views:0,count:0}));
  merged.forEach(v=>{if(!v.post_date)return;const d=new Date(v.post_date+'T12:00:00');dayData[d.getDay()].views+=v.views;dayData[d.getDay()].count++;});
  const dayArr=dayData.map((d,i)=>({day:dayNames[i],avgViews:d.count?Math.round(d.views/d.count):0,count:d.count})).filter(d=>d.count>0);
  const bestDay=dayArr.length?dayArr.reduce((a,b)=>a.avgViews>b.avgViews?a:b):null;

  // Big vs Small
  const bigVids=merged.filter(v=>v.video_type==='B');
  const smallVids=merged.filter(v=>v.video_type!=='B');
  const bigAvg=bigVids.length?Math.round(bigVids.reduce((s,v)=>s+v.views,0)/bigVids.length):0;
  const smallAvg=smallVids.length?Math.round(smallVids.reduce((s,v)=>s+v.views,0)/smallVids.length):0;

  // Topic performance
  const topicMap={};
  merged.forEach(v=>{const t=v.topic||'Untitled';if(!topicMap[t])topicMap[t]={views:0,likes:0,comments:0,count:0};topicMap[t].views+=v.views;topicMap[t].likes+=v.likes;topicMap[t].comments+=v.comments;topicMap[t].count++;});
  const topics=Object.entries(topicMap).map(([t,d])=>({topic:t,avgViews:Math.round(d.views/d.count),avgEng:d.views>0?((d.likes+d.comments)/d.views*100):0,count:d.count})).sort((a,b)=>b.avgViews-a.avgViews);

  // Engagement by recency (first 30 days vs lifetime)
  const recent90=merged.filter(v=>{const d=Math.round((now-new Date(v.post_date+'T12:00:00'))/86400000);return d<=90;});
  const older=merged.filter(v=>{const d=Math.round((now-new Date(v.post_date+'T12:00:00'))/86400000);return d>90;});
  const recentAvg=recent90.length?Math.round(recent90.reduce((s,v)=>s+v.views,0)/recent90.length):0;
  const olderAvg=older.length?Math.round(older.reduce((s,v)=>s+v.views,0)/older.length):0;

  // Build strategy panel — organized by decision: what to make, when, how
  // Tooltip data store — each insight gets a key with bar chart data
  _anTipStore={};
  let _tipIdx=0;
  const _miniBar=(items,valKey,labelKey,fmt)=>{
    const max=Math.max(...items.map(i=>i[valKey]),1);
    return items.map(i=>{
      const pct=Math.max(Math.round(i[valKey]/max*100),2);
      const isBest=i[valKey]===max;
      return'<div style="display:flex;align-items:center;gap:6px;margin:2px 0"><span style="font-size:10px;width:70px;text-align:right;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'+(isBest?';font-weight:700':'')+'">'+_ytEsc(String(i[labelKey]))+'</span><div style="flex:1;height:14px;background:rgba(120,113,145,.08);border-radius:3px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:rgba(120,113,145,'+(isBest?'.7':'.35')+');border-radius:3px"></div></div><span style="font-size:10px;width:55px;flex-shrink:0;text-align:right'+(isBest?';font-weight:700':'')+'">'+(fmt?fmt(i[valKey]):_ytNum(i[valKey]))+'</span></div>';
    }).join('');
  };
  const _row=(text,tipKey)=>{
    const tid='_anTip'+(_tipIdx++);
    return`<div id="${tid}" style="padding:5px 0;font-size:11px;border-bottom:1px solid var(--border);cursor:default" ${tipKey?'onmouseenter="_anShowTip(event,\''+tipKey+'\')" onmouseleave="_anHideTip()"':''}>${text}</div>`;
  };
  const _secHead=(text)=>`<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-top:8px;margin-bottom:2px">${text}</div>`;
  let stratHtml='';

  // ── WHAT TO MAKE (topic + format) ──
  stratHtml+=_secHead('What to make');
  // Top earning topic
  if(topics.length){
    const topicsByRev=topics.map(t=>{const vids=merged.filter(v=>v.topic===t.topic);const totalRev=vids.reduce((s,v)=>s+_vRev(v),0);return{...t,estRev:totalRev,revPerVid:Math.round(totalRev/t.count)};}).sort((a,b)=>b.estRev-a.estRev);
    _anTipStore['topicRev']={title:(_hasRealRev?'':'Est. ')+'Revenue by topic (total)',html:_miniBar(topicsByRev.slice(0,8),'estRev','topic',v=>'$'+_ytNum(v))};
    if(topicsByRev[0]) stratHtml+=_row('<b>'+_ytEsc(topicsByRev[0].topic)+'</b> earns most ('+_revPfx+'$'+_ytNum(topicsByRev[0].estRev)+' total from '+topicsByRev[0].count+' vids)','topicRev');
    // Best per-video topic if different
    const topicsByPerVid=topicsByRev.filter(t=>t.count>=2).sort((a,b)=>b.revPerVid-a.revPerVid);
    _anTipStore['topicPerVid']={title:(_hasRealRev?'':'Est. ')+'Revenue per video by topic',html:_miniBar(topicsByPerVid.slice(0,8),'revPerVid','topic',v=>'$'+_ytNum(v))};
    if(topicsByPerVid[0]&&topicsByPerVid[0].topic!==topicsByRev[0].topic) stratHtml+=_row('<b>'+_ytEsc(topicsByPerVid[0].topic)+'</b> best per video ('+_revPfx+'$'+_ytNum(topicsByPerVid[0].revPerVid)+'/video)','topicPerVid');
  }
  if(bigAvg&&smallAvg){
    const bigRevAvg=Math.round(bigVids.reduce((s,v)=>s+_vRev(v),0)/bigVids.length);const smallRevAvg=Math.round(smallVids.reduce((s,v)=>s+_vRev(v),0)/smallVids.length);
    const r=(bigAvg/smallAvg).toFixed(1);
    _anTipStore['bigSmall']={title:'Big vs Small comparison',html:_miniBar([{label:'Big ('+bigVids.length+')',val:bigRevAvg},{label:'Small ('+smallVids.length+')',val:smallRevAvg}],'val','label',v=>'$'+_ytNum(v)+'/vid')};
    stratHtml+=_row('Big videos: <b>'+r+'x</b> more views, '+_revPfx+'$'+_ytNum(bigRevAvg)+'/vid vs '+_revPfx+'$'+_ytNum(smallRevAvg),'bigSmall');
  }
  // Best combo
  if(bestDur&&topics.length){
    const comboVids=merged.filter(v=>{if(!v.duration_minutes)return false;const mins=parseInt(String(v.duration_minutes).split('.')[0])||0;return mins>=durBuckets[bestDur.label].min&&mins<durBuckets[bestDur.label].max&&v.topic===topics[0].topic;});
    if(comboVids.length>=2){const comboRev=Math.round(comboVids.reduce((s,v)=>s+_vRev(v),0)/comboVids.length);stratHtml+=_row('Best combo: <b>'+_ytEsc(topics[0].topic)+' + '+bestDur.label+'</b> ('+_revPfx+'$'+_ytNum(comboRev)+'/vid)');}
  }

  // ── HOW TO MAKE IT (duration + format) ──
  stratHtml+=_secHead('How to make it');
  _anTipStore['duration']={title:'Avg views by duration (n = video count)',html:_miniBar(durArr.map(d=>({...d,label:d.label+' ('+d.count+')'})),'avgViews','label')};
  if(bestDur) stratHtml+=_row('Best length: <b>'+bestDur.label+'</b> ('+_ytNum(bestDur.avgViews)+' avg views)','duration');
  if(durArr.length){
    const durByRev=durArr.map(d=>{const vids=merged.filter(v=>{if(!v.duration_minutes)return false;const mins=parseInt(String(v.duration_minutes).split('.')[0])||0;return mins>=durBuckets[d.label].min&&mins<durBuckets[d.label].max;});const revPer=vids.length?Math.round(vids.reduce((s,v)=>s+_vRev(v),0)/vids.length):0;return{...d,revPerVid:revPer};}).sort((a,b)=>b.revPerVid-a.revPerVid);
    _anTipStore['durRev']={title:(_hasRealRev?'':'Est. ')+'Revenue per video by duration',html:_miniBar(durByRev,'revPerVid','label',v=>'$'+_ytNum(v))};
    if(durByRev[0]&&durByRev[0].label!==bestDur?.label) stratHtml+=_row('Best length for $: <b>'+durByRev[0].label+'</b> ('+_revPfx+'$'+_ytNum(durByRev[0].revPerVid)+'/vid)','durRev');
  }
  // Engagement sweet spot — do high-engagement videos earn more?
  const engSorted=engagements.filter(v=>v.views>=100).sort((a,b)=>b.engRate-a.engRate);
  if(engSorted.length>=6){
    const topHalf=engSorted.slice(0,Math.floor(engSorted.length/2));
    const botHalf=engSorted.slice(Math.floor(engSorted.length/2));
    const topAvg=Math.round(topHalf.reduce((s,v)=>s+v.views,0)/topHalf.length);
    const botAvg=Math.round(botHalf.reduce((s,v)=>s+v.views,0)/botHalf.length);
    _anTipStore['engCorr']={title:'Views by engagement half',html:_miniBar([{label:'High eng (top 50%)',val:topAvg},{label:'Low eng (bottom 50%)',val:botAvg}],'val','label')};
    if(topAvg>botAvg) stratHtml+=_row('High-engagement vids get <b>'+((topAvg/botAvg).toFixed(1))+'x</b> more views','engCorr');
    else stratHtml+=_row('Engagement doesn\'t correlate with views — focus on topics','engCorr');
  }

  // ── WHEN TO POST ──
  stratHtml+=_secHead('When to post');
  _anTipStore['dayOfWeek']={title:'Avg views by day of week (n = video count)',html:_miniBar(dayArr.map(d=>({...d,label:d.day+' ('+d.count+')'})),'avgViews','label')};
  if(bestDay) stratHtml+=_row('Best day: <b>'+bestDay.day+'</b> ('+_ytNum(bestDay.avgViews)+' avg views)','dayOfWeek');
  const pubMonths=Object.keys(_kpiMonths).length;
  if(pubMonths>=2){
    _anTipStore['pace']={title:'Videos published per month',html:_miniBar(_kpiSorted.slice(-12).map(([k,d])=>({label:_moAbbr[parseInt(k.slice(5))]+' '+k.slice(2,4),val:d.count})),'val','label')};
    const rate=(merged.length/pubMonths).toFixed(1);stratHtml+=_row('Your pace: <b>~'+rate+' videos/month</b> over '+pubMonths+' months','pace');
  }

  // ── MOMENTUM ──
  stratHtml+=_secHead('Channel health');
  if(recentAvg&&olderAvg){
    const dir=recentAvg>olderAvg?'up':'down';
    const pctChange=Math.round(Math.abs(recentAvg-olderAvg)/olderAvg*100);
    _anTipStore['momentum']={title:'Avg views: last 90 days vs older',html:_miniBar([{label:'Last 90 days ('+recent90.length+')',val:recentAvg},{label:'Older ('+older.length+')',val:olderAvg}],'val','label')};
    stratHtml+=_row('Momentum: <b>'+dir+' '+pctChange+'%</b> (last 90d: '+_ytNum(recentAvg)+' avg vs older: '+_ytNum(olderAvg)+')','momentum');
  }
  // Consistency — standard deviation of monthly output
  if(_kpiSorted.length>=3){
    const counts=_kpiSorted.map(([,d])=>d.count);
    const cAvg=counts.reduce((s,v)=>s+v,0)/counts.length;
    const cStd=Math.sqrt(counts.reduce((s,v)=>s+Math.pow(v-cAvg,2),0)/counts.length);
    const cv=cAvg>0?(cStd/cAvg*100):0;
    _anTipStore['consistency']={title:'Monthly video output',html:_miniBar(_kpiSorted.slice(-12).map(([k,d])=>({label:_moAbbr[parseInt(k.slice(5))]+' '+k.slice(2,4),val:d.count})),'val','label')};
    stratHtml+=_row('Consistency: '+(cv<30?'<b>Steady</b> — keep it up':'<b>Variable</b> — more regular posting helps growth')+' ('+cv.toFixed(0)+'% variation)','consistency');
  }
  // Engagement trend
  if(_kpiSorted.length>=4){
    const recent2=_kpiSorted.slice(-2);const older2=_kpiSorted.slice(-4,-2);
    const rEng=recent2.reduce((s,[,d])=>s+(d.views>0?((d.likes+d.comments)/d.views*100):0),0)/recent2.length;
    const oEng=older2.reduce((s,[,d])=>s+(d.views>0?((d.likes+d.comments)/d.views*100):0),0)/older2.length;
    if(oEng>0){
      const ePct=Math.round((rEng-oEng)/oEng*100);
      _anTipStore['engTrend']={title:'Engagement rate by month',html:_miniBar(_kpiSorted.slice(-6).map(([k,d])=>({label:_moAbbr[parseInt(k.slice(5))]+' '+k.slice(2,4),val:d.views>0?parseFloat(((d.likes+d.comments)/d.views*100).toFixed(1)):0})),'val','label',v=>v.toFixed(1)+'%')};
      stratHtml+=_row('Engagement: <b>'+(ePct>0?'up':'down')+' '+Math.abs(ePct)+'%</b> recent vs prior ('+rEng.toFixed(1)+'% vs '+oEng.toFixed(1)+'%)','engTrend');
    }
  }

  // KPI card helper — compact, label left, value right, sparkline
  const _kCard=(fn,label,val,spark,accent)=>{
    const bg=accent?accent+'08':'var(--glass)';
    const bdr=accent?accent+'30':'var(--border)';
    return`<div style="background:${bg};border:1px solid ${bdr};border-radius:10px;padding:16px 12px;cursor:pointer;min-width:0;flex:1;text-align:center" onclick="${fn}">
      <div style="font-size:10px;color:var(--muted);margin-bottom:3px">${label}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:5px">
        <div style="font-size:16px;font-weight:700;color:${accent||'var(--text)'};white-space:nowrap">${val}</div>
        ${spark||''}
      </div>
    </div>`;
  };
  // 2-col: KPIs + bar chart (left) | topic filter + insights (right)
  h+=`<div style="display:grid;grid-template-columns:2.5fr 1fr;gap:12px;margin-bottom:12px;align-items:stretch">`;
  // Left column: KPIs (single row) then bar chart
  h+=`<div style="display:flex;flex-direction:column;gap:10px">`;
  h+='<div style="display:flex;gap:8px;align-items:stretch">';
  h+=_kCard("_ytShowUnreplied()",'Unreplied',String(_unrepliedN),'','#ef4444');
  h+=_kCard("_anKpiModal('views')",'Views',_ytNum(totalViews),sparkline(_spViews));
  h+=_kCard("_anKpiModal('avg')",'Avg/Vid',_ytNum(avgViews),sparkline(_spAvg));
  h+=_kCard("_anKpiModal('videos')",'Videos',String(merged.length),sparkline(_spVids));
  h+=_kCard("_anKpiModal('revenue')",_revLabel,_revValue,sparkline(_spRevReal));
  h+=_kCard("_anKpiModal('subscribers')",'Subs',cs?_ytNum(cs.subscribers):'-');
  h+='</div>';
  h+=`<div style="background:var(--glass);border:1px solid var(--border);border-radius:12px;padding:16px 18px;display:flex;flex-direction:column">${trendHtml}</div>`;
  h+='</div>';
  // Right column: topic filter + insights
  h+=`<div style="display:flex;flex-direction:column;gap:10px">`;
  h+=`<div style="background:var(--glass);border:1px solid var(--border);border-radius:10px;padding:8px 14px;position:relative;flex-shrink:0">
    <input id="anTopicInput" type="text" placeholder="Filter by topic..." value="${_anTopicFilter==='all'?'':_esc(_anTopicFilter)}" oninput="_anTopicInputChange(this.value)" onfocus="_anTopicShowList()" style="width:100%;padding:4px 8px;border:1px solid ${_anTopicFilter!=='all'?'rgba(139,92,246,.4)':'var(--border)'};border-radius:6px;font-family:inherit;font-size:11px;background:${_anTopicFilter!=='all'?'rgba(139,92,246,.04)':'var(--bg)'};color:var(--text);outline:none;box-sizing:border-box">
    ${_anTopicFilter!=='all'?'<button onclick="_anTopicFilter=\'all\';renderVideosPageKeepScroll()" style="position:absolute;right:20px;bottom:10px;background:none;border:none;cursor:pointer;font-size:11px;color:var(--muted);line-height:1">✕</button>':''}
    <div id="anTopicList" style="display:none;position:absolute;top:100%;left:0;right:0;margin-top:2px;background:var(--bg);border:1px solid var(--border);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.1);z-index:100;max-height:150px;overflow-y:auto"></div>
  </div>`;
  h+=`<div style="background:var(--glass);border:1px solid var(--border);border-radius:12px;padding:14px 16px;overflow-y:auto;flex:1">
    <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px">Insights</div>${stratHtml}</div>`;
  h+='</div>';
  h+='</div>'; // close 2-col grid
  // Do More Like This + Try Next — full width below
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">';

  const scored=engagements.filter(v=>v.views>=100).map(v=>({...v,score:v.views*(1+v.engRate/100)})).sort((a,b)=>b.score-a.score).slice(0,8);
  let recHtml='<div style="font-size:10px;color:var(--muted);margin-bottom:6px">Scored by views x engagement</div>';
  scored.forEach((v,i)=>{
    const t=v.topic||'';
    const dur=v.duration_minutes?String(v.duration_minutes).split('.')[0]+'m':'';
    recHtml+=`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px;${i<3?'font-weight:600':''}">
      <span style="color:var(--muted);width:14px;flex-shrink:0">${i+1}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_ytEsc(v.title||'')}">${_ytEsc(v.title||'Untitled')}</span>
      ${t?'<span style="background:rgba(120,113,145,.1);border-radius:10px;padding:1px 6px;font-size:9px;color:var(--muted);flex-shrink:0">'+_ytEsc(t)+'</span>':''}
      ${dur?'<span style="color:var(--muted);font-size:10px;flex-shrink:0">'+dur+'</span>':''}
    </div>`;
  });
  h+=card('Do More Like This',recHtml);

  // Try Next — video ideas based on what works
  let tryHtml='<div style="font-size:10px;color:var(--muted);margin-bottom:6px">Based on your top-performing patterns</div>';
  const topicsSorted=topics.filter(t=>t.count>=2&&t.avgViews>=avgViews).sort((a,b)=>b.avgViews-a.avgViews);
  const topicLastPost={};
  merged.forEach(v=>{const t=v.topic||'Untitled';if(!topicLastPost[t]||v.post_date>topicLastPost[t])topicLastPost[t]=v.post_date;});
  const staleTopics=topicsSorted.filter(t=>{const lp=topicLastPost[t.topic];if(!lp)return false;const days=Math.round((now-new Date(lp+'T12:00:00'))/86400000);return days>60;});
  const underexplored=topics.filter(t=>t.count>=1&&t.count<=3&&t.avgViews>=avgViews*0.8).sort((a,b)=>b.avgViews-a.avgViews).slice(0,3);
  let ideaNum=0;
  staleTopics.slice(0,3).forEach(t=>{
    ideaNum++;
    const dayRec=bestDay?' on '+bestDay.day:'';
    const durRec=bestDur?' ('+bestDur.label+')':'';
    const daysSince=Math.round((now-new Date(topicLastPost[t.topic]+'T12:00:00'))/86400000);
    tryHtml+=`<div style="padding:4px 0;font-size:11px;border-bottom:1px solid var(--border)"><b>${ideaNum}.</b> Another <b>${_ytEsc(t.topic)}</b> video${durRec}${dayRec}<div style="font-size:10px;color:var(--muted);margin-top:1px">${_ytNum(t.avgViews)} avg views, ${t.count} vids — last posted ${daysSince}d ago</div></div>`;
  });
  underexplored.forEach(t=>{
    if(ideaNum>=5)return;
    if(staleTopics.find(s=>s.topic===t.topic))return;
    ideaNum++;
    tryHtml+=`<div style="padding:4px 0;font-size:11px;border-bottom:1px solid var(--border)"><b>${ideaNum}.</b> Explore more <b>${_ytEsc(t.topic)}</b><div style="font-size:10px;color:var(--muted);margin-top:1px">${_ytNum(t.avgViews)} avg from just ${t.count} video${t.count>1?'s':''} — underexplored</div></div>`;
  });
  if(ideaNum<3&&topicsSorted.length){
    topicsSorted.slice(0,3-ideaNum).forEach(t=>{
      ideaNum++;
      const durRec=bestDur?' ('+bestDur.label+')':'';
      tryHtml+=`<div style="padding:4px 0;font-size:11px;border-bottom:1px solid var(--border)"><b>${ideaNum}.</b> More <b>${_ytEsc(t.topic)}</b>${durRec}<div style="font-size:10px;color:var(--muted);margin-top:1px">${_ytNum(t.avgViews)} avg views across ${t.count} videos</div></div>`;
    });
  }
  if(!ideaNum) tryHtml+='<div style="font-size:11px;color:var(--muted)">Not enough data yet for suggestions</div>';
  h+=card('Try Next',tryHtml);
  h+='</div>'; // close Do More / Try Next grid

  // ── Scatterplot ──
  const _axOpts={views:'Views',likes:'Likes',comments:'Comments',engagement:'Engagement %',duration:'Duration (min)',revenue:(_hasRealRev?'':'Est. ')+'Revenue'};
  const _axSel=(id,cur)=>Object.entries(_axOpts).map(([k,l])=>`<option value="${k}"${k===cur?' selected':''}>${l}</option>`).join('');
  const _axVal=(v,ax)=>{
    if(ax==='views')return v.views;if(ax==='likes')return v.likes;if(ax==='comments')return v.comments;
    if(ax==='engagement')return v.views>0?((v.likes+v.comments)/v.views*100):0;
    if(ax==='duration')return v.duration_minutes||0;
    if(ax==='revenue')return _vRev(v);return 0;
  };
  const _scW=600,_scH=300,_scPad=40;
  const xVals=merged.map(v=>_axVal(v,_anScatterX)),yVals=merged.map(v=>_axVal(v,_anScatterY));
  const xMin=Math.min(...xVals,0),xMax=Math.max(...xVals,1),yMin=Math.min(...yVals,0),yMax=Math.max(...yVals,1);
  const xScale=v=>(v-xMin)/(xMax-xMin)*(_scW-_scPad*2)+_scPad;
  const yScale=v=>_scH-_scPad-(v-yMin)/(yMax-yMin)*(_scH-_scPad*2);
  const _fmtAx=(v,ax)=>ax==='engagement'?v.toFixed(1)+'%':ax==='revenue'?'$'+_ytNum(Math.round(v)):ax==='duration'?v.toFixed(1)+'m':_ytNum(Math.round(v));
  let scSvg=`<svg width="100%" viewBox="0 0 ${_scW} ${_scH}" style="display:block">`;
  // Grid lines
  for(let i=0;i<=4;i++){
    const y=_scPad+(_scH-_scPad*2)*i/4;
    const yv=yMax-(yMax-yMin)*i/4;
    scSvg+=`<line x1="${_scPad}" y1="${y}" x2="${_scW-_scPad}" y2="${y}" stroke="rgba(120,113,145,.1)" stroke-width="1"/>`;
    scSvg+=`<text x="${_scPad-4}" y="${y+3}" text-anchor="end" fill="var(--muted)" font-size="9">${_fmtAx(yv,_anScatterY)}</text>`;
  }
  for(let i=0;i<=4;i++){
    const x=_scPad+(_scW-_scPad*2)*i/4;
    const xv=xMin+(xMax-xMin)*i/4;
    scSvg+=`<line x1="${x}" y1="${_scPad}" x2="${x}" y2="${_scH-_scPad}" stroke="rgba(120,113,145,.1)" stroke-width="1"/>`;
    scSvg+=`<text x="${x}" y="${_scH-_scPad+14}" text-anchor="middle" fill="var(--muted)" font-size="9">${_fmtAx(xv,_anScatterX)}</text>`;
  }
  // Dots
  const topicColors=['#8b5cf6','#f59e0b','#10b981','#ef4444','#0ea5e9','#ec4899','#6366f1','#14b8a6','#f97316','#84cc16'];
  const topicList=[...new Set(merged.map(v=>v.topic||'Other'))];
  merged.forEach(v=>{
    const cx=xScale(_axVal(v,_anScatterX)),cy=yScale(_axVal(v,_anScatterY));
    const ti=topicList.indexOf(v.topic||'Other')%topicColors.length;
    scSvg+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" fill="${topicColors[ti]}" opacity=".7" stroke="#fff" stroke-width="1"><title>${_ytEsc(v.title||'')}\n${_axOpts[_anScatterX]}: ${_fmtAx(_axVal(v,_anScatterX),_anScatterX)}\n${_axOpts[_anScatterY]}: ${_fmtAx(_axVal(v,_anScatterY),_anScatterY)}</title></circle>`;
  });
  scSvg+='</svg>';
  // Legend
  let legHtml=topicList.slice(0,8).map((t,i)=>`<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;color:var(--muted);margin-right:10px"><span style="width:8px;height:8px;border-radius:50%;background:${topicColors[i%topicColors.length]};flex-shrink:0"></span>${_ytEsc(t)}</span>`).join('');
  let scHtml=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
    <span style="font-size:10px;color:var(--muted)">X:</span>
    <select onchange="_anScatterX=this.value;renderVideosPageKeepScroll()" style="font-size:10px;font-family:inherit;border:1px solid var(--border);border-radius:5px;padding:2px 6px;background:var(--bg);color:var(--text);outline:none">${_axSel('_scX',_anScatterX)}</select>
    <span style="font-size:10px;color:var(--muted)">Y:</span>
    <select onchange="_anScatterY=this.value;renderVideosPageKeepScroll()" style="font-size:10px;font-family:inherit;border:1px solid var(--border);border-radius:5px;padding:2px 6px;background:var(--bg);color:var(--text);outline:none">${_axSel('_scY',_anScatterY)}</select>
  </div>${scSvg}<div style="margin-top:6px">${legHtml}</div>`;
  h+=card('Video Explorer',scHtml);

  h+='</div>';
  return h;
}

// ── View / Filter ────────────────────────────────────────────────────────────
function _vidSetView(v){_vidView=v;localStorage.setItem('_vidView',v);renderVideosPage();_vidScrollToDefault();}
function _vidSetFilter(f){_vidFilter=f;renderVideosPageKeepScroll();}
function _vidSetGroup(g){_vidGroupFilter=g;renderVideosPageKeepScroll();}
function _vidSetSearch(q){
  _vidSearch=q;_vidMatchIdx=0;_vidSearchTs=Date.now();
  // If search cleared, reset any active filter
  if(!q){
    const hadFilter=_vidFilter!=='all'||_anTopicFilter!=='all'||_vidSearchFilterFn;
    _vidSearchFilterFn=null;
    if(_vidFilter!=='all'){_vidFilter='all';renderVideosPageKeepScroll();_vidScrollToDefault();return;}
    if(_anTopicFilter!=='all'){_anTopicFilter='all';renderVideosPageKeepScroll();_vidScrollToDefault();return;}
    if(hadFilter){renderVideosPageKeepScroll();_vidScrollToDefault();return;}
  }
  _vidPostRenderMatches();
  _vidShowSuggestions(q);
  const cnt=document.getElementById('vidSearchCount');
  if(cnt)cnt.textContent=(_vidMatchIds.length?(_vidMatchIdx+1):0)+'/'+_vidMatchIds.length;
}
function _vidDateMatch(d,q){
  if(!d)return false;
  // d is YYYY-MM-DD, q could be 4/20, 4/20/26, 4-20, 4.20, 4/20/2025, 2025-04, etc.
  if(d.includes(q))return true;
  const m=q.match(/^(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?$/);
  if(!m)return false;
  const mo=m[1].padStart(2,'0'),dy=m[2].padStart(2,'0');
  if(m[3]){
    const yr=m[3].length===2?'20'+m[3]:m[3];
    return d===yr+'-'+mo+'-'+dy;
  }
  return d.slice(5)===mo+'-'+dy;
}
function _vidSearchMatch(v,q){
  const statusLabel=(v.status==='published'?'complete':v.status||'').replace('_',' ').toLowerCase();
  return(v.title||'').toLowerCase().includes(q)||(v.topic||'').toLowerCase().includes(q)||statusLabel.includes(q)||_vidDateMatch(v.post_date,q);
}
function _vidBuildMatches(){
  _vidMatchIds=[];
  // Will be rebuilt from DOM after render
}
function _vidPostRenderMatches(){
  if(!_vidSearch){_vidMatchIds=[];return;}
  _vidMatchIds=[];
  const q=_vidSearch.toLowerCase();
  // Count only videos visible on current view/filter using DOM rows
  const rows=document.querySelectorAll('.vid-dash-row[data-vid],.vid-row[data-vid]');
  const visibleIds=new Set();
  rows.forEach(r=>visibleIds.add(r.dataset.vid));
  // Match visible videos
  (st.videos||[]).filter(v=>!v.is_deleted&&visibleIds.has(String(v.id))).forEach(v=>{
    if(_vidSearchMatch(v,q))_vidMatchIds.push(String(v.id));
  });
  if(_vidMatchIdx>=_vidMatchIds.length)_vidMatchIdx=0;
  const cnt=document.getElementById('vidSearchCount');
  if(cnt)cnt.textContent=(_vidMatchIds.length?(_vidMatchIdx+1):0)+'/'+_vidMatchIds.length;
}
function _vidSearchNav(dir){
  if(!_vidMatchIds.length)return;
  _vidMatchIdx=(_vidMatchIdx+dir+_vidMatchIds.length)%_vidMatchIds.length;
  _vidScrollToMatch();
  const cnt=document.getElementById('vidSearchCount');
  if(cnt)cnt.textContent=(_vidMatchIdx+1)+'/'+_vidMatchIds.length;
}
function _vidScrollToDefault(){
  setTimeout(()=>{
    const today=new Date().toISOString().slice(0,10);
    const publishedBigs=(st.videos||[]).filter(v=>!v.is_deleted&&v.status==='published'&&v.video_type==='B'&&v.post_date&&v.post_date<today);
    publishedBigs.sort((a,b)=>b.post_date.localeCompare(a.post_date));
    console.log('[scroll] bigs:',publishedBigs.length,'top3:',publishedBigs.slice(0,3).map(v=>v.post_date+' id:'+v.id+' '+v.title));
    const target=publishedBigs[2]||publishedBigs[publishedBigs.length-1];
    if(!target){console.log('[scroll] no target');return;}
    const row=document.querySelector('.vid-dash-row[data-vid="'+target.id+'"]')||document.querySelector('.vid-row[data-vid="'+target.id+'"]');
    console.log('[scroll] target:',target.id,target.title,'row found:',!!row);
    if(row)row.scrollIntoView({block:'start'});
  },50);
}
function _vidScrollToMatch(){
  const id=_vidMatchIds[_vidMatchIdx];if(!id)return;
  // Clear previous highlights
  document.querySelectorAll('.vid-dash-row,.vid-row').forEach(r=>{if(r._vidHl)r.style.background='';r._vidHl=false;});
  const row=document.querySelector('.vid-dash-row[data-vid="'+id+'"]')||document.querySelector('.vid-row[data-vid="'+id+'"]');
  if(row){row.scrollIntoView({block:'center',behavior:'smooth'});row.style.transition='background .2s';row.style.background='rgba(139,92,246,.12)';row._vidHl=true;setTimeout(()=>{if(row._vidHl){row.style.background='';row._vidHl=false;}},1200);}
}
function _vidSearchKey(e){
  const sg=document.getElementById('vidSearchSuggestions');
  const sgOpen=sg&&sg.style.display!=='none';
  if(e.key==='Escape'){_vidSearch='';_vidMatchIds=[];_vidSearchFilterFn=null;_vidFilter='all';document.getElementById('vidSearchInput').value='';if(sg)sg.style.display='none';renderVideosPage();_vidScrollToDefault();return;}
  if(e.key==='Enter'){e.preventDefault();if(sgOpen){const act=sg.querySelector('.vid-sg-active');if(act){act.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));return;}sg.style.display='none';}_vidSearchNav(e.shiftKey?-1:1);return;}
  if(e.key==='ArrowDown'){e.preventDefault();if(sgOpen){const items=sg.querySelectorAll('.vid-sg-item');const act=sg.querySelector('.vid-sg-active');let idx=0;items.forEach((it,i)=>{if(it===act)idx=i+1;});if(idx>=items.length)idx=0;items.forEach(it=>it.classList.remove('vid-sg-active'));if(items[idx]){items[idx].classList.add('vid-sg-active');_vidScrollToSuggestion(items[idx]);}}else{_vidSearchNav(1);}return;}
  if(e.key==='ArrowUp'){e.preventDefault();if(sgOpen){const items=sg.querySelectorAll('.vid-sg-item');const act=sg.querySelector('.vid-sg-active');let idx=items.length-1;items.forEach((it,i)=>{if(it===act)idx=i-1;});if(idx<0)idx=items.length-1;items.forEach(it=>it.classList.remove('vid-sg-active'));if(items[idx]){items[idx].classList.add('vid-sg-active');_vidScrollToSuggestion(items[idx]);}}else{_vidSearchNav(-1);}return;}
}
function _vidScrollToSuggestion(item){
  if(!item)return;
  const id=item.dataset.vidId;
  if(id){
    const row=document.querySelector('.vid-dash-row[data-vid="'+id+'"]')||document.querySelector('.vid-row[data-vid="'+id+'"]');
    if(row){document.querySelectorAll('.vid-dash-row,.vid-row').forEach(r=>{if(r._vidHl){r.style.background='';r._vidHl=false;}});row.scrollIntoView({block:'center',behavior:'smooth'});row.style.transition='background .2s';row.style.background='rgba(139,92,246,.12)';row._vidHl=true;}
  }
}
function _vidShowSuggestions(q){
  const sg=document.getElementById('vidSearchSuggestions');if(!sg)return;
  if(!q||q.length<2){sg.style.display='none';return;}
  const lq=q.toLowerCase();
  const vids=(st.videos||[]).filter(v=>!v.is_deleted);
  // Collect unique values by category
  const seen=new Set();
  const suggestions=[];
  const add=(type,text,id)=>{const k=type+':'+text;if(seen.has(k))return;seen.add(k);suggestions.push({type,text,id});};
  // Statuses first (exact-ish matches are most useful)
  const statusLabels=[{val:'idea',label:'idea'},{val:'up_next',label:'up next'},{val:'in_progress',label:'in progress'},{val:'published',label:'complete'},{val:'backup',label:'backup'}];
  statusLabels.forEach(s=>{if(s.label.includes(lq)||s.val.includes(lq))add('status',s.label);});
  // Mismatch filter
  if('mismatch'.includes(lq)||'unmatched'.includes(lq)||'no match'.includes(lq))add('filter','mismatch');
  // Topics (deduplicated, sorted by frequency)
  const topicCounts={};
  vids.forEach(v=>{if(v.topic&&v.topic.toLowerCase().includes(lq)){topicCounts[v.topic]=(topicCounts[v.topic]||0)+1;}});
  Object.entries(topicCounts).sort((a,b)=>b[1]-a[1]).slice(0,4).forEach(([t])=>add('topic',t));
  // Dates — collect unique post_dates that match, format as M/D/YYYY
  const dateCounts={};
  vids.forEach(v=>{if(v.post_date&&_vidDateMatch(v.post_date,q)){dateCounts[v.post_date]=(dateCounts[v.post_date]||0)+1;}});
  Object.entries(dateCounts).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,5).forEach(([d,n])=>{
    const [y,m,dy]=d.split('-');
    const label=parseInt(m)+'/'+parseInt(dy)+'/'+y;
    add('date',label);
  });
  // Titles (starts-with first, then contains) — deduplicate and exclude L children that duplicate B parent titles
  const titleSeen=new Set();
  const starts=[],contains=[];
  vids.forEach(v=>{
    if(!v.title||titleSeen.has(v.title))return;
    // Skip L children whose title matches their B parent
    if(v.video_type==='L'&&v.big_video_id){const par=vids.find(p=>String(p.id)===String(v.big_video_id));if(par&&par.title===v.title)return;}
    titleSeen.add(v.title);
    const lt=v.title.toLowerCase();
    if(lt.startsWith(lq))starts.push({title:v.title,id:v.id});
    else if(lt.includes(lq))contains.push({title:v.title,id:v.id});
  });
  [...starts,...contains].slice(0,5).forEach(t=>add('title',t.title,t.id));
  if(!suggestions.length){sg.style.display='none';return;}
  const badgeColors={status:'#8b5cf6',topic:'#f59e0b',date:'#0ea5e9',title:'var(--muted)',filter:'#ef4444'};
  sg.style.display='block';
  sg.innerHTML=suggestions.slice(0,8).map(s=>{
    const hl=_vidHighlight(s.text,lq);
    const safe=s.text.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    const action=s.id?'_vidGoToVideo(\''+s.id+'\')':'_vidPickSuggestion(\''+safe+'\',\''+s.type+'\')';
    return'<div class="vid-sg-item" data-action="'+s.type+'" '+(s.id?'data-vid-id="'+s.id+'"':'')+' onmousedown="event.preventDefault();'+action+'" style="padding:5px 10px;font-size:12px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><span style="font-size:9px;color:'+badgeColors[s.type]+';margin-right:6px">'+s.type+'</span>'+hl+'</div>';
  }).join('');
}
function _vidGoToVideo(id){
  const sg=document.getElementById('vidSearchSuggestions');if(sg)sg.style.display='none';
  const row=document.querySelector('.vid-dash-row[data-vid="'+id+'"]')||document.querySelector('.vid-row[data-vid="'+id+'"]');
  if(row){row.scrollIntoView({block:'center',behavior:'smooth'});row.style.transition='background .2s';row.style.background='rgba(139,92,246,.12)';setTimeout(()=>row.style.background='',1200);}
  const inp=document.getElementById('vidSearchInput');if(inp)inp.focus();
}
function _vidPickSuggestion(text,type){
  const sg=document.getElementById('vidSearchSuggestions');if(sg)sg.style.display='none';
  _vidSearchFilterFn=null;_vidFilter='all';_anTopicFilter='all';
  if(type==='status'){
    const statusMap={'idea':'idea','up next':'up_next','in progress':'in_progress','complete':'published','published':'published','backup':'backup'};
    const st2=statusMap[text.toLowerCase()]||text;
    _vidSearch=text;_vidMatchIds=[];_vidSearchTs=Date.now();
    const inp2=document.getElementById('vidSearchInput');if(inp2)inp2.value=text;
    _vidSetFilter(st2);
    return;
  }
  if(type==='topic'){
    _vidSearch=text;_vidMatchIds=[];_vidSearchTs=Date.now();
    const inp2=document.getElementById('vidSearchInput');if(inp2)inp2.value=text;
    if(_vidView==='analytics'){_anTopicFilter=text;}
    else{_vidSearchFilterFn=v=>(v.topic||'').toLowerCase()===text.toLowerCase();}
    renderVideosPageKeepScroll();return;
  }
  if(type==='date'){
    _vidSearch=text;_vidMatchIds=[];_vidSearchTs=Date.now();
    const inp2=document.getElementById('vidSearchInput');if(inp2)inp2.value=text;
    _vidSearchFilterFn=v=>_vidDateMatch(v.post_date,text);
    renderVideosPageKeepScroll();return;
  }
  if(type==='filter'&&text==='mismatch'){
    _vidSearch=text;_vidMatchIds=[];_vidSearchTs=Date.now();
    const inp2=document.getElementById('vidSearchInput');if(inp2)inp2.value=text;
    _vidSearchFilterFn=v=>v.post_date&&v.status==='published'&&!_ytForVid(String(v.id));
    renderVideosPageKeepScroll();return;
  }
  // Default: scroll to first match
  const inp=document.getElementById('vidSearchInput');if(inp){inp.value=text;inp.focus();}
  const lq=text.toLowerCase();
  const rows=document.querySelectorAll('.vid-dash-row[data-vid],.vid-row[data-vid]');
  for(const row of rows){
    const title=row.querySelector('[title]');
    if(title&&(title.getAttribute('title')||'').toLowerCase().includes(lq)){
      row.scrollIntoView({block:'center',behavior:'smooth'});row.style.transition='background .2s';row.style.background='rgba(139,92,246,.12)';setTimeout(()=>row.style.background='',1200);break;
    }
  }
}
function _vidSearchFocus(){if(_vidSearch&&_vidSearch.length>=2)_vidShowSuggestions(_vidSearch);}
function _vidHighlight(text,q){
  if(!q)return _esc(text);
  const idx=text.toLowerCase().indexOf(q.toLowerCase());
  if(idx===-1)return _esc(text);
  return _esc(text.slice(0,idx))+'<mark style="background:rgba(250,204,21,.4);padding:0 1px;border-radius:2px">'+_esc(text.slice(idx,idx+q.length))+'</mark>'+_esc(text.slice(idx+q.length));
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
  const _tipTarget=e.currentTarget;
  _vidBulletTimer=setTimeout(()=>{
    const v=(st.videos||[]).find(x=>String(x.id)===sid);if(!v)return;
    let html='';
    if(v.video_type==='B'){
      const kids=(st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===sid);
      html='<div style="font-size:10px;font-weight:600;margin-bottom:4px">'+kids.length+' Small Video'+(kids.length!==1?'s':'')+'</div>';
      html+=kids.map(c=>{
        return'<div style="padding:1px 0;font-size:11px;white-space:nowrap">• '+_esc(c.topic||c.title)+'</div>';
      }).join('');
    }else if(v.big_video_id&&String(v.big_video_id)!==sid){
      const parent=(st.videos||[]).find(x=>!x.is_deleted&&String(x.id)===String(v.big_video_id));
      if(parent){
        html='<div style="font-size:11px;white-space:nowrap">'+_esc(parent.topic||parent.title)+'</div>';
      }
    }
    if(!html)return;
    const tip=document.createElement('div');
    tip.id='vidBulletTip';
    tip.style.cssText='position:fixed;z-index:9999;padding:8px 12px;border-radius:12px;background:rgba(255,252,248,.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(210,205,228,.3);box-shadow:0 8px 24px rgba(0,0,0,.1),inset 0 1px 0 rgba(255,255,255,.7);pointer-events:none;max-width:260px';
    tip.innerHTML=html;
    document.body.appendChild(tip);
    const rect=_tipTarget.getBoundingClientRect();
    tip.style.left=rect.right+8+'px';
    tip.style.top=rect.top+'px';
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
  openVidEdit(id);
}
function _vidDashInlineEdit(){}
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
  const elStyle='width:100%;font-size:11px;border:none;border-bottom:1px solid var(--border);border-radius:0;padding:0;margin:0;background:transparent;color:var(--text);outline:none;font-family:inherit;box-sizing:border-box;line-height:inherit;text-align:inherit;height:100%';
  let el;
  if(field==='status'){
    el=document.createElement('select');
    ['idea','up_next','in_progress','published','backup'].forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;if(v.status===s)o.selected=true;el.appendChild(o);});
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
    if(field==='post_date')val=_vidParseDate(val);
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
  else if(event.key==='Enter'&&(event.metaKey||event.target.tagName!=='TEXTAREA')){
    // Close any open dropdowns first
    var sDrop=document.getElementById('vmStatusDrop');if(sDrop)sDrop.style.display='none';
    var bDrop=document.getElementById('vmBigVideoDrop');if(bDrop)bDrop.style.display='none';
    event.preventDefault();saveVidModal();
  }
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
  }else if(event.key==='Enter'){
    event.preventDefault();drop.style.display='none';saveVidModal();
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
  var inp=document.getElementById(type==='Status'?'vmStatusDisplay':'vm'+type);
  if(inp)inp.focus();
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
  if(!e.target.closest('#vidSearchInput')&&!e.target.closest('#vidSearchSuggestions')){
    const sg=document.getElementById('vidSearchSuggestions');if(sg)sg.style.display='none';
  }
  if(!e.target.closest('#anTopicInput')&&!e.target.closest('#anTopicList')){
    const tl=document.getElementById('anTopicList');if(tl)tl.style.display='none';
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
      const hasFields=v.topic&&v.title;
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
  const hasFields=v.topic&&v.title;
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

// ── Click outside to deselect ─────────────────────────────────────────────────
document.addEventListener('click',e=>{
  if(activePg!=='videos'||!_vidSelected.size)return;
  if(e.target.closest('.vid-dash-row,.vid-row,.vid-board-card,.vid-dash-header,.vid-del,.vid-step-dot,[data-field],.vm-overlay'))return;
  _vidSelected.clear();_vidChildSelected.clear();_applyVidSel();
});

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if(activePg!=='videos')return;
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT'||e.target.isContentEditable)return;
  if(_vidSearch||Date.now()-_vidSearchTs<300){const si=document.getElementById('vidSearchInput');if(si){si.focus();return;}}
  if((e.key==='Delete'||e.key==='Backspace')&&_vidSelected.size>0){e.preventDefault();const all=new Set([..._vidSelected,..._vidChildSelected]);all.forEach(id=>delVideo(id));_vidSelected.clear();_vidChildSelected.clear();return;}
  if((e.metaKey||e.ctrlKey)&&e.key==='c'&&_vidSelected.size>0){e.preventDefault();_vidCopied=[];_vidSelected.forEach(id=>{const v=(st.videos||[]).find(x=>String(x.id)===String(id));if(v)_vidCopied.push({...v});});showToast('Copied '+_vidCopied.length+' video(s)','#0ea5e9',1500);return;}
  if((e.metaKey||e.ctrlKey)&&e.key==='v'&&_vidCopied.length>0){e.preventDefault();_vidCopied.forEach(v=>_vidDuplicate(v.id));return;}
  if(e.key==='n'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();openVidModal();return;}
  // ── Dashboard arrow key actions ──
  if(_vidView==='dashboard'&&(e.key==='ArrowUp'||e.key==='ArrowDown'||e.key==='ArrowLeft'||e.key==='ArrowRight')){
    const rows=[...document.querySelectorAll('.vid-dash-row[data-vid]')].map(r=>r.dataset.vid);
    const dir=e.key==='ArrowUp'||e.key==='ArrowLeft'?-1:1;
    const isUpDown=e.key==='ArrowUp'||e.key==='ArrowDown';
    const isLeftRight=e.key==='ArrowLeft'||e.key==='ArrowRight';

    // Shift+Up/Down: extend multi-selection
    if(isUpDown&&e.shiftKey&&!e.metaKey&&!e.ctrlKey&&!e.altKey){
      e.preventDefault();
      if(!rows.length)return;
      if(!_vidSelected.size){
        const id=dir===-1?rows[rows.length-1]:rows[0];
        _vidSelected.add(id);_vidLastSel=id;
      }else{
        const lastIdx=rows.indexOf(_vidLastSel);if(lastIdx===-1)return;
        const nextIdx=lastIdx+dir;
        if(nextIdx<0||nextIdx>=rows.length)return;
        _vidSelected.add(rows[nextIdx]);_vidLastSel=rows[nextIdx];
      }
      _vidUpdateChildSel();_applyVidSel();return;
    }

    // Cmd+Left/Right: move between statuses (Left=promote, Right=demote)
    // Promote: idea → up_next → in_progress. Demote: in_progress → up_next → idea
    if(isLeftRight&&(e.metaKey||e.ctrlKey)&&!e.shiftKey&&_vidSelected.size>0){
      e.preventDefault();
      // Order: up_next → in_progress → idea. Left=toward up_next, Right=toward idea
      const map=e.key==='ArrowLeft'
        ?{idea:'in_progress',in_progress:'up_next'}
        :{up_next:'in_progress',in_progress:'idea'};
      const allIds=new Set([..._vidSelected,..._vidChildSelected]);
      const vids=[...allIds].map(id=>(st.videos||[]).find(x=>String(x.id)===id)).filter(Boolean);
      const toMove=vids.filter(v=>map[v.status]);
      if(!toMove.length)return;
      const undos=toMove.map(v=>({id:v.id,prev:v.status}));
      toMove.forEach(v=>{v.status=map[v.status];});
      const bigIds=toMove.filter(v=>v.video_type==='B').map(v=>String(v.id));
      const childrenMoved=[];
      bigIds.forEach(bid=>{
        (st.videos||[]).filter(c=>!c.is_deleted&&String(c.big_video_id)===bid&&!allIds.has(String(c.id))).forEach(c=>{
          const newSt=map[c.status];if(newSt){childrenMoved.push({id:c.id,prev:c.status});c.status=newSt;}
        });
      });
      save();renderVideosPageKeepScroll();
      pushUndo(async()=>{[...undos,...childrenMoved].forEach(u=>{const v2=(st.videos||[]).find(x=>String(x.id)===u.id);if(v2)v2.status=u.prev;});save();renderVideosPageKeepScroll();for(const u of[...undos,...childrenMoved])await sbReqSilent('PATCH','videos',{status:u.prev},`?id=eq.${u.id}`);},'Move status');
      (async()=>{for(const v of[...toMove,...childrenMoved.map(u=>(st.videos||[]).find(x=>String(x.id)===u.id)).filter(Boolean)])await sbReqSilent('PATCH','videos',{status:v.status},`?id=eq.${v.id}`);})();
      return;
    }

    // Cmd+Up/Down: reorder within column
    if(isUpDown&&(e.metaKey||e.ctrlKey)&&!e.shiftKey&&_vidSelected.size>0){
      e.preventDefault();
      const selIds=new Set([..._vidSelected]);
      const groups={};
      selIds.forEach(sid=>{
        const v=(st.videos||[]).find(x=>String(x.id)===sid);if(!v)return;
        const key=v.status+'|'+v.video_type;
        if(!groups[key])groups[key]=[];groups[key].push(v);
      });
      Object.values(groups).forEach(selVids=>{
        const sample=selVids[0];
        const siblings=(st.videos||[]).filter(x=>!x.is_deleted&&x.status===sample.status&&x.video_type===sample.video_type).sort((a,b)=>(a.vid_order??9999)-(b.vid_order??9999));
        siblings.forEach((s,i)=>{if(s.vid_order==null)s.vid_order=i;});
        const selSet=new Set(selVids.map(v=>String(v.id)));
        const selIdxs=siblings.map((s,i)=>selSet.has(String(s.id))?i:-1).filter(i=>i>=0).sort((a,b)=>a-b);
        if(!selIdxs.length)return;
        if(dir===-1&&selIdxs[0]===0)return;
        if(dir===1&&selIdxs[selIdxs.length-1]===siblings.length-1)return;
        if(dir===-1){
          const above=siblings[selIdxs[0]-1];
          selIdxs.forEach(i=>{siblings[i].vid_order=siblings[i].vid_order-1;});
          above.vid_order=siblings[selIdxs[selIdxs.length-1]].vid_order+1;
        }else{
          const below=siblings[selIdxs[selIdxs.length-1]+1];
          selIdxs.forEach(i=>{siblings[i].vid_order=siblings[i].vid_order+1;});
          below.vid_order=siblings[selIdxs[0]].vid_order-1;
        }
        siblings.forEach(s=>sbReqSilent('PATCH','videos',{vid_order:s.vid_order},`?id=eq.${s.id}`));
      });
      save();renderVideosPageKeepScroll();return;
    }

    // Plain Up/Down with selection: navigate (move single selection)
    if(isUpDown&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){
      e.preventDefault();
      if(!rows.length)return;
      if(!_vidSelected.size){
        const id=dir===-1?rows[rows.length-1]:rows[0];
        _vidSelected.clear();_vidSelected.add(id);_vidLastSel=id;
      }else{
        const lastIdx=rows.indexOf(_vidLastSel);if(lastIdx===-1)return;
        const nextIdx=lastIdx+dir;
        if(nextIdx<0||nextIdx>=rows.length)return;
        _vidSelected.clear();_vidSelected.add(rows[nextIdx]);_vidLastSel=rows[nextIdx];
      }
      _vidUpdateChildSel();_applyVidSel();
      // Scroll selected row into view
      const selRow=document.querySelector('.vid-dash-row[data-vid="'+_vidLastSel+'"]');
      if(selRow)selRow.scrollIntoView({block:'nearest'});
      return;
    }

    // Plain Left/Right no selection: tab switch
    if(isLeftRight&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&_vidSelected.size===0){
      e.preventDefault();
      const tabs=['dashboard','table','analytics','monthly'];const i=tabs.indexOf(_vidView);
      if(dir===-1&&i>0)_vidSetView(tabs[i-1]);
      if(dir===1&&i<tabs.length-1)_vidSetView(tabs[i+1]);
      return;
    }
    return;
  }
  // Non-dashboard: plain arrows for scroll/tab
  if(e.key==='ArrowLeft'&&!e.metaKey&&!e.ctrlKey&&_vidSelected.size===0){e.preventDefault();const tabs=['dashboard','table','analytics','monthly'];const i=tabs.indexOf(_vidView);if(i>0)_vidSetView(tabs[i-1]);return;}
  if(e.key==='ArrowRight'&&!e.metaKey&&!e.ctrlKey&&_vidSelected.size===0){e.preventDefault();const tabs=['dashboard','table','analytics','monthly'];const i=tabs.indexOf(_vidView);if(i<tabs.length-1)_vidSetView(tabs[i+1]);return;}
  if(e.key==='ArrowUp'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();const se=_vidScrollEl();if(se){se.scrollTop=0;}return;}
  if(e.key==='ArrowDown'&&!e.metaKey&&!e.ctrlKey){e.preventDefault();_vidScrollToDefault();return;}
  if(e.key==='e'&&!e.metaKey&&!e.ctrlKey&&_vidView==='table'){e.preventDefault();_vidShowCompleted=!_vidShowCompleted;renderVideosPageKeepScroll();return;}
  if(e.key==='c'&&!e.metaKey&&!e.ctrlKey&&_vidView==='table'){e.preventDefault();_vidShowCompleted=!_vidShowCompleted;renderVideosPageKeepScroll();return;}
});

// ── Close context menu on click elsewhere ─────────────────────────────────────
document.addEventListener('click',e=>{if(!e.target.closest('#vidCtxMenu'))document.getElementById('vidCtxMenu').style.display='none';});

function _esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
