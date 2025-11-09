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
      <label>Artikel ${i + 1}:</label>
      <input type="text" value="${a.name}" placeholder="Name" onchange="setName(${i}, this.value)">
      <input type="number" value="${a.preis}" step="0.1" placeholder="Preis" onchange="setPreis(${i}, this.value)">
    `;
    container.appendChild(div);
  });
  document.getElementById("pfandInput").value = pfand;
}

function changeAnzahl(i, delta) {
  artikel[i].anzahl = Math.max(0, artikel[i].anzahl + delta);
  renderBestellung();
}

function setName(i, val) {
  artikel[i].name = val;
}

function setPreis(i, val) {
  artikel[i].preis = parseFloat(val);
}

function updateArtikelCount() {
  const neueAnzahl = parseInt(document.getElementById("anzahlArtikel").value);
  if (neueAnzahl > artikel.length) {
    while (artikel.length < neueAnzahl) artikel.push({ name: "Neu", preis: 0, anzahl: 0 });
  } else {
    artikel = artikel.slice(0, neueAnzahl);
  }
  renderEinstellungen();
}

function updateGesamt() {
  let summe = artikel.reduce((acc, a) => acc + a.preis * a.anzahl, 0);
  document.getElementById("gesamtBetrag").textContent = summe.toFixed(2) + " €";
}

function saveSettings() {
  pfand = parseFloat(document.getElementById("pfandInput").value);
  showPage("bestellung");
}
