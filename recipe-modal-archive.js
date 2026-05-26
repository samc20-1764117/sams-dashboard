// Recipe Add/Edit Modal Code — archived for potential future use
// These functions were removed from features.js when recipes switched to inline editing.
// To restore: move these back into features.js and ensure the recipeModal HTML exists in index.html.

let _recipeEditId=null,_rmIngredients=[];

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
  el.innerHTML=_rmIngredients.map((ing,i)=>`<div class="rm-ing-row" id="rmIngRow${i}"><div class="rm-ing-dot"></div><input class="rm-ing-amt" placeholder="amount" value="${_e(ing.amount)}" oninput="_rmIngredients[${i}].amount=this.value" onkeydown="rmIngKey(event,${i},'amt')"><input class="rm-ing-name" placeholder="ingredient" value="${_e(ing.name)}" oninput="_rmIngredients[${i}].name=this.value" onkeydown="rmIngKey(event,${i},'name')"><button type="button" class="rm-ing-pantry${ing.is_pantry?' active':''}" onclick="_rmIngredients[${i}].is_pantry=!_rmIngredients[${i}].is_pantry;this.classList.toggle('active')" title="Pantry staple (won't add to grocery list)">🏠</button><button type="button" class="rm-ing-del" onclick="rmIngDel(${i})" title="Remove">✕</button></div>`).join('');
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
  } else if(e.key==='Tab'&&!e.shiftKey&&field==='name'&&i===_rmIngredients.length-1){
    e.preventDefault();_rmIngredients[i].name=e.target.value;rmIngAdd(false);
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
  ['rmName','rmMealType','rmCuisine','rmTime','rmServings','rmInstructions'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  _rmIngredients=[];renderIngList();
  document.getElementById('recipeModal').classList.add('open');
  _recModalKeyBind();
  setTimeout(()=>document.getElementById('rmName').focus(),80);
}
function _recModalKeyBind(){
  if(_recModalKeyFn)return;
  _recModalKeyFn=e=>{
    const modal=document.getElementById('recipeModal');
    if(!modal||!modal.classList.contains('open'))return;
    if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'&&e.target.tagName!=='BUTTON'&&!e.target.closest('.rm-ing-row,.rm-ing-add-btn')){
      e.preventDefault();const n=document.getElementById('rmName').value.trim();
      if(n)saveRecipeModal();else closeMod('recipeModal');
    }
  };
  document.addEventListener('keydown',_recModalKeyFn);
}
let _recModalKeyFn=null;
function openRecipeEditModal(id){
  const r=st.recipes.find(x=>String(x.id)===String(id));if(!r)return;
  _recipeEditId=id;
  document.getElementById('recipeMTitle').textContent='Edit Recipe';
  document.getElementById('rmName').value=r.name||'';
  document.getElementById('rmMealType').value=r.meal_type||'';
  document.getElementById('rmCuisine').value=r.cuisine||'';
  document.getElementById('rmTime').value=r.time||'';
  document.getElementById('rmServings').value=r.servings||'';
  document.getElementById('rmInstructions').value=r.instructions||'';
  _rmIngredients=_sortIngredients(_parseIngredients(r.ingredients));renderIngList();
  document.getElementById('recipeModal').classList.add('open');
  _recModalKeyBind();
  setTimeout(()=>{const _el=document.getElementById('rmName');if(_el){_el.focus();const _l=_el.value.length;_el.setSelectionRange(_l,_l);}},80);
}
async function saveRecipeModal(){
  const name=document.getElementById('rmName').value.trim();
  if(!name){showToast('Recipe name required');return;}
  _flushIngInputs();
  _rmIngredients=_rmIngredients.filter(x=>(x.name||'').trim()||(x.amount||'').trim());
  const data={
    name,
    meal_type:document.getElementById('rmMealType').value||null,
    cuisine:document.getElementById('rmCuisine').value||null,
    time:parseInt(document.getElementById('rmTime').value)||null,
    servings:parseInt(document.getElementById('rmServings').value)||null,
    ingredients:_serializeIngredients(_rmIngredients),
    instructions:document.getElementById('rmInstructions').value.trim()||null,
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
