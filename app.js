let artikel = [
  { name: "Glühwein", preis: 1.5, anzahl: 0 },
  { name: "Kinderpunsch", preis: 1.0, anzahl: 0 },
  { name: "Bier", preis: 2.5, anzahl: 0 }
];

let pfand = 0.5;

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.getElementById(id).style.display = "block";
  if (id === "bestellung") renderBestellung();
  if (id === "einstellungen") renderEinstellungen();
}

function renderBestellung() {
  const list = document.getElementById("artikelListe");
  list.innerHTML = "";
  artikel.forEach((a, i) => {
    const div = document.createElement("div");
    div.className = "artikel";
    div.innerHTML = `
      <span>${a.name}</span>
      <div>
        <button onclick="changeAnzahl(${i}, -1)">−</button>
        <span>${a.anzahl}</span>
        <button onclick="changeAnzahl(${i}, 1)">+</button>
      </div>
    `;
    list.appendChild(div);
  });
  updateGesamt();
}

function renderEinstellungen() {
  const container = document.getElementById("artikelEinstellungen");
  container.innerHTML = "";
  artikel.forEach((a, i) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <label>${a.name} Preis (€): </label>
      <input type="number" value="${a.preis}" step="0.1" onchange="setPreis(${i}, this.value)">
    `;
    container.appendChild(div);
  });
  document.getElementById("pfandInput").value = pfand;
}

function changeAnzahl(i, delta) {
  artikel[i].anzahl = Math.max(0, artikel[i].anzahl + delta);
  renderBestellung();
}

function setPreis(i, val) {
  artikel[i].preis = parseFloat(val);
}

function updateGesamt() {
  let summe = artikel.reduce((acc, a) => acc + a.preis * a.anzahl, 0);
  let pfandSumme = artikel.reduce((acc, a) => acc + a.anzahl, 0) * pfand;
  document.getElementById("gesamtBetrag").textContent = summe.toFixed(2) + " €";
  document.getElementById("pfandBetrag").textContent = pfandSumme.toFixed(2) + " €";
}

function saveSettings() {
  pfand = parseFloat(document.getElementById("pfandInput").value);
  showPage("bestellung");
}
