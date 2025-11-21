// app.js - Minimal Port der Berechnungslogik aus deiner Android App
const ITEM_COUNT = 12;
const itemsContainer = document.getElementById('items');
const grandTotalEl = document.getElementById('grandTotal');
const modal = document.getElementById('modal');
const settingsList = document.getElementById('settingsList');
const pfandInput = document.getElementById('pfandInput');

let state = {
  prices: Array.from({length: ITEM_COUNT}, ()=>0.0),
  names: Array.from({length: ITEM_COUNT}, (v,i)=>`Artikel ${i+1}`),
  qtys: Array.from({length: ITEM_COUNT}, ()=>0),
  pfand: 0.0,
  visibleCount: ITEM_COUNT
};

// Helper: Format € with 2 decimals (DE style)
function fmt(n){ return n.toLocaleString('de-DE',{minimumFractionDigits:2, maximumFractionDigits:2}) + ' €'; }

function loadSettings(){
  try{
    const saved = JSON.parse(localStorage.getItem('bestell_settings') || '{}');
    if(saved.prices && saved.prices.length===ITEM_COUNT) state.prices = saved.prices;
    if(saved.names && saved.names.length===ITEM_COUNT) state.names = saved.names;
    if(typeof saved.pfand === 'number') state.pfand = saved.pfand;
    if (typeof saved.visibleCount === 'number') state.visibleCount = saved.visibleCount;

    // quantities stored separately
    const savedQty = JSON.parse(localStorage.getItem('bestell_qty') || '[]');
    if(Array.isArray(savedQty) && savedQty.length===ITEM_COUNT) state.qtys = savedQty;
  }catch(e){
    console.warn('loadSettings failed', e);
  }
}

function saveSettings(){
  const payload = { prices: state.prices, names: state.names, pfand: state.pfand, visibleCount: state.visibleCount };
  localStorage.setItem('bestell_settings', JSON.stringify(payload));
  localStorage.setItem('bestell_qty', JSON.stringify(state.qtys));
  render();
}

function resetQuantities(){
  state.qtys = state.qtys.map(()=>0);
  localStorage.setItem('bestell_qty', JSON.stringify(state.qtys));
  render();
}

// build UI
function buildUI(){
  itemsContainer.innerHTML = '';
  for(let i=0; i < state.visibleCount; i++){
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div class="name">${state.names[i]}</div>
      
        <button data-action="dec" data-i="${i}">−</button>
        <button data-action="inc" data-i="${i}">+</button>
      </div>
    `;
    itemsContainer.appendChild(el);
  }

  // attach handlers
  itemsContainer.querySelectorAll('button[data-action]').forEach(b=>{
    b.addEventListener('click', e=>{
      const i = +b.dataset.i;
      if(b.dataset.action==='inc'){ state.qtys[i] = (state.qtys[i]||0) + 1; }
      else { state.qtys[i] = Math.max(0, (state.qtys[i]||0) - 1); }
      localStorage.setItem('bestell_qty', JSON.stringify(state.qtys));
      render();
    });
  });
  itemsContainer.querySelectorAll('.qtyInput').forEach(inp=>{
    inp.addEventListener('change', e=>{
      const i = +inp.dataset.i;
      let v = parseInt(inp.value) || 0;
      v = Math.max(0, v);
      state.qtys[i] = v;
      localStorage.setItem('bestell_qty', JSON.stringify(state.qtys));
      render();
    });
  });
}

function updateTotalPrice(){
  // entspricht updateTotalPrice() in deiner Android App
  let grand = 0;
  for(let i=0;i<ITEM_COUNT;i++){
    const price = parseFloat(state.prices[i]||0) || 0;
    const qty = parseInt(state.qtys[i]||0) || 0;
    const subtotal = qty * (price + (state.pfand||0));
    grand += subtotal;
    const subEl = document.querySelector(`[data-subtotal="${i}"]`);
    if(subEl) subEl.textContent = fmt(subtotal);
  }
  grandTotalEl.textContent = fmt(grand);
}

function openSettings(){
  settingsList.innerHTML = '';
  for(let i=0;i<ITEM_COUNT;i++){
    const row = document.createElement('div');
    row.innerHTML = `
      <label>${i+1}. <input data-name="${i}" value="${state.names[i]}" style="width:45%"/> 
      Preis: <input data-price="${i}" type="number" step="0.01" value="${state.prices[i]}"/></label>
    `;
    settingsList.appendChild(row);
  }
  pfandInput.value = state.pfand;
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden','false');
  document.getElementById('visibleCountInput').value = state.visibleCount;

}

function closeSettings(){
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden','true');
}

function applySettingsFromModal(){
  // read inputs
  settingsList.querySelectorAll('input[data-price]').forEach(inp=>{
    const i = +inp.dataset.price;
    let v = parseFloat(inp.value) || 0;
    state.prices[i] = Math.max(0, v);
  });
  settingsList.querySelectorAll('input[data-name]').forEach(inp=>{
    const i = +inp.dataset.name;
    state.names[i] = inp.value || `Artikel ${i+1}`;
  });
  const pf = parseFloat(pfandInput.value) || 0;
  state.pfand = Math.max(0, pf);
  const vc = parseInt(document.getElementById('visibleCountInput').value) || ITEM_COUNT;
  state.visibleCount = Math.min(ITEM_COUNT, Math.max(1, vc));
  saveSettings();
  buildUI();
  render();
  closeSettings();
}

function render(){
  // fill names/prices into UI
  for(let i=0;i<ITEM_COUNT;i++){
    const nameEl = document.querySelectorAll('.name')[i];
    const priceEl = document.querySelector(`[data-price="${i}"]`);
    const qtyInp = document.querySelectorAll('.qtyInput')[i];
    if(nameEl) nameEl.textContent = state.names[i];
    if(priceEl) priceEl.textContent = fmt(state.prices[i]);
    if(qtyInp) qtyInp.value = state.qtys[i];
  }
  updateTotalPrice();
}

// setup
document.getElementById('btnSettings').addEventListener('click', openSettings);
document.getElementById('closeModalBtn').addEventListener('click', closeSettings);
document.getElementById('saveSettingsBtn').addEventListener('click', applySettingsFromModal);
document.getElementById('btnReset').addEventListener('click', ()=>{ resetQuantities(); });

window.addEventListener('click', (e)=>{
  if(e.target===modal) closeSettings();
});

// --- Privacy Modal ---
const modalPrivacy = document.getElementById("modalPrivacy");
document.getElementById("btnPrivacy").onclick = () => {
    modalPrivacy.style.display = "flex";
};
document.getElementById("closePrivacyBtn").onclick = () => {
    modalPrivacy.style.display = "none";
};
modalPrivacy.onclick = (e) => {
    if (e.target === modalPrivacy) modalPrivacy.style.display = "none";
};


// init
loadSettings();
buildUI();
render();

