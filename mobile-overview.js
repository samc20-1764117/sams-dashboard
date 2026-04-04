// mobile-overview.js
window._mobileMode=true;

// Override desktop login overlay functions — core.js calls these
function showLoginOverlay(){
  document.getElementById('mLogin').style.display='flex';
  document.getElementById('mApp').classList.remove('ready');
  setTimeout(()=>document.getElementById('mEmail')&&document.getElementById('mEmail').focus(),100);
}
function hideLoginOverlay(){
  document.getElementById('mLogin').style.display='none';
  document.getElementById('mApp').classList.add('ready');
}

// core.js renderAll hook
function renderAll(){
  mRenderToday();
}

// Stub desktop-only render functions called from features.js / core.js
function renderWkCal(){}
function renderWkSummary(){}
function renderRecOv(){}
function renderUnassigned(){}
function renderShopOv(){}
function renderKanban(){}
function renderSummaryMetrics(){}
function renderWeeklyPage(){}
function renderBdayPage(){}
function renderShopFull(){}
function renderDayTB(){}
function setBadge(){}

// Mobile login
async function mDoLogin(){
  const email=document.getElementById('mEmail').value.trim();
  const pass=document.getElementById('mPass').value;
  const err=document.getElementById('mLoginErr');
  err.style.display='none';
  if(!email||!pass){err.textContent='Enter email and password.';err.style.display='block';return;}
  await doLogin_m(email,pass);
}
async function doLogin_m(email,pass){
  const err=document.getElementById('mLoginErr');
  if(!_sbClient)_initSbClient();
  const{data,error}=await _sbClient.auth.signInWithPassword({email,password:pass});
  if(error){err.textContent=error.message;err.style.display='block';return;}
  _authToken=data.session.access_token;
  hideLoginOverlay();
  await syncAll();
}

// Date label
function _mSetDate(){
  const lbl=document.getElementById('mDateLbl');
  if(lbl)lbl.textContent=new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
}

// Init — called at bottom of this file after DOM ready
async function mInit(){
  load();
  _mSetDate();
  const authed=await checkAuth();
  if(!authed)return;
  hideLoginOverlay();
  await syncAll();
  setInterval(()=>{if(cfg.url&&cfg.key)syncAll(true);},30000);
}

// Today list — Step 2 will fill this in
function mRenderToday(){
  const el=document.getElementById('mTodayList');
  if(!el)return;
  el.innerHTML='<div class="m-empty">Connected ✓</div>';
}

document.addEventListener('DOMContentLoaded',mInit);
