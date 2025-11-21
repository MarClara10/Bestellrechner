// app.js - Berechnungslogik
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

function fmt(n) {
  return n.toLocaleString('de-DE',{minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
}

function loadSettings(){
  try{
    const saved = JSON.parse(localStorage.getItem('bestell_settings') || '{}');
    if(saved.prices) state.prices = saved.prices;
    if(saved.names) state.names = saved.names;
    if(typeof saved.pfand === 'number') state.pfand = saved.pfand;
    if(typeof saved.visibleCount === 'number') state.visibleCount = saved.visibleCount;

    const savedQty = JSON.parse(localStorage.getItem('bestell_qty') || '[]');
    if(savedQty.length === ITEM_COUNT) state.qtys = savedQty;
  }catch(err){}
}

function saveSettings(){
  localStorage.setItem('bestell_settings', JSON.stringify(state));
  localStorage.setItem('bestell_qty', JSON.stringify(state.qtys));
}

function resetQuantities(){
  state.qtys = Array.from({length: ITEM_COUNT}, ()=>0);
  saveSettings();
  render();
}

function buildUI(){
  itemsContainer.innerHTML = '';

  for(let i=0;i<state.visibleCount;i++){
    const el = document.createElement('div');
    el.className = 'item';

    el.innerHTML = `
      <div class="name">${state.names[i]}</div>

      <div class="qty">
        <button data-action="dec" data-i="${i}">−</button>
        <span>${state.qtys[i]}</span>
        <button data-action="inc" data-i="${i}">+</button>
      </div>
    `;

    itemsContainer.appendChild(el);
  }

  itemsContainer.querySelectorAll('button[data-action]').forEach(btn=>{
    btn.onclick = ()=> {
      const i = +btn.dataset.i;
      if(btn.dataset.action === "inc") state.qtys[i]++;
      else state.qtys[i] = Math.max(0, state.qtys[i]-1);

      saveSettings();
      render();
    }
  });
}

function updateTotalPrice(){
  let sum = 0;
  for(let i=0;i<ITEM_COUNT;i++){
    const price = state.prices[i] + state.pfand;
    sum += state.qtys[i] * price;
  }
  grandTotalEl.textContent = fmt(sum);
}

function render(){
  buildUI();
  updateTotalPrice();
}

document.getElementById('btnSettings').onclick = openSettings;
document.getElementById('btnReset').onclick = resetQuantities;
document.getElementById('closeModalBtn').onclick = closeSettings;
document.getElementById('saveSettingsBtn').onclick = applySettingsFromModal;

function openSettings(){
  settingsList.innerHTML = '';
  for(let i=0;i<ITEM_COUNT;i++){
    const div = document.createElement('div');
    div.innerHTML = `
      <label>
        ${i+1}. 
        <input data-name="${i}" value="${state.names[i]}" placeholder="Name">
        <input data-price="${i}" type="number" step="0.01" value="${state.prices[i]}" placeholder="Preis">
      </label>
    `;
    settingsList.appendChild(div);
  }

  pfandInput.value = state.pfand;
  document.getElementById('visibleCountInput').value = state.visibleCount;

  modal.style.display = 'flex';
}

function closeSettings(){
  modal.style.display = 'none';
}

function applySettingsFromModal(){
  settingsList.querySelectorAll('input[data-name]').forEach(inp=>{
    state.names[inp.dataset.name] = inp.value;
  });
  settingsList.querySelectorAll('input[data-price]').forEach(inp=>{
    state.prices[inp.dataset.price] = parseFloat(inp.value) || 0;
  });

  state.pfand = parseFloat(pfandInput.value) || 0;
  state.visibleCount = Math.max(1, Math.min(ITEM_COUNT, parseInt(document.getElementById('visibleCountInput').value)));

  saveSettings();
  closeSettings();
  render();
}

loadSettings();
render();
