(function () {
  "use strict";

  const STORAGE_KEY = "bestellrechner_v1";
  const STATS_KEY = "bestellrechner_stats_v1";

  /** @type {ReturnType<typeof defaultState>} */
  let state = loadState();
  /** @type {ReturnType<typeof defaultStats>} */
  let stats = loadStats();

  let chartInstance = null;

  function defaultState() {
    const s = {
      button_numbers: 0,
      shot_active: false,
      savedpfand: "",
      savedgegeben: "",
      savedgeld_zurück: "",
      savedpfand_anzahl: "",
      gesamt_preis: 0,
    };
    for (let i = 1; i <= 13; i++) {
      s["savedProduct" + i] = i === 13 ? "Schuss" : "";
      s["savedpreis" + i] = "";
      s["number" + i] = "";
    }
    return s;
  }

  function defaultStats() {
    const o = { total_money: 0, total_pfand: 0 };
    for (let i = 0; i < 12; i++) o["prod_qty_" + i] = 0;
    return o;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (!raw) return defaultStats();
      const parsed = JSON.parse(raw);
      return { ...defaultStats(), ...parsed };
    } catch {
      return defaultStats();
    }
  }

  function saveStats() {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  function parseLocaleFloat(str) {
    if (str == null || String(str).trim() === "") return 0;
    const n = String(str).replace(",", ".").replace(/[^\d.-]/g, "");
    const v = parseFloat(n);
    return Number.isFinite(v) ? v : 0;
  }

  function parseQty(str) {
    const n = parseInt(String(str || "").trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function formatMoney(n) {
    return n.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function getQty(index) {
    return parseQty(state["number" + index]);
  }

  function setQty(index, value) {
    state["number" + index] = value === 0 ? "" : String(value);
  }

  function computeTotal() {
    const pfand = parseLocaleFloat(state.savedpfand);
    let total = 0;
    for (let i = 1; i <= 12; i++) {
      const preis = parseLocaleFloat(state["savedpreis" + i]);
      total += getQty(i) * (preis + pfand);
    }
    const p13 = parseLocaleFloat(state.savedpreis13);
    total += getQty(13) * p13;
    return total;
  }

  function updateStatistics(orderTotal, orderPfand, quantities12) {
    stats.total_money += orderTotal;
    stats.total_pfand += orderPfand;
    for (let i = 0; i < 12; i++) {
      const k = "prod_qty_" + i;
      stats[k] = (stats[k] || 0) + quantities12[i];
    }
    saveStats();
  }

  // ——— DOM refs ———
  const views = {
    order: document.getElementById("view-order"),
    change: document.getElementById("view-change"),
    settings: document.getElementById("view-settings"),
    stats: document.getElementById("view-stats"),
  };

  const orderGrid = document.getElementById("order-grid");
  const orderEmpty = document.getElementById("order-empty");
  const orderFooter = document.getElementById("order-footer");
  const totalDisplay = document.getElementById("total-display");
  const btnResetOrder = document.getElementById("btn-reset-order");
  const btnCheckout = document.getElementById("btn-checkout");

  const changeOrderTotal = document.getElementById("change-order-total");
  const inputGegeben = document.getElementById("input-gegeben");
  const inputBecher = document.getElementById("input-becher");
  const changeResult = document.getElementById("change-result");
  const btnCalcChange = document.getElementById("btn-calc-change");

  const settingsProducts = document.getElementById("settings-products");
  const linesCount = document.getElementById("lines-count");
  const btnLinesPlus = document.getElementById("btn-lines-plus");
  const btnLinesMinus = document.getElementById("btn-lines-minus");
  const settingPfand = document.getElementById("setting-pfand");
  const toggleShot = document.getElementById("toggle-shot");
  const shotBlock = document.getElementById("shot-block");
  const settingName13 = document.getElementById("setting-name-13");
  const settingPreis13 = document.getElementById("setting-preis-13");
  const cardPfandShot = document.getElementById("card-pfand-shot");
  const btnFactoryReset = document.getElementById("btn-factory-reset");

  const statsUmsatz = document.getElementById("stats-umsatz");
  const statsPfand = document.getElementById("stats-pfand");
  const statsChartCanvas = document.getElementById("stats-chart");
  const btnShareStats = document.getElementById("btn-share-stats");
  const btnResetStats = document.getElementById("btn-reset-stats");
  const statsPanel = document.getElementById("stats-panel");

  const toastEl = document.getElementById("toast");

  function showToast(message, options) {
    const withUndo = options && typeof options.undo === "function";
    toastEl.hidden = false;
    toastEl.textContent = "";
    toastEl.className = "toast" + (withUndo ? " has-action" : "");

    if (withUndo) {
      const span = document.createElement("span");
      span.textContent = message;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Rückgängig";
      btn.addEventListener("click", () => {
        options.undo();
        hideToast();
      });
      toastEl.appendChild(span);
      toastEl.appendChild(btn);
    } else {
      toastEl.textContent = message;
    }

    clearTimeout(showToast._t);
    showToast._t = setTimeout(hideToast, withUndo ? 6000 : 2600);
  }

  function hideToast() {
    toastEl.hidden = true;
  }

  function setActiveView(name) {
    Object.keys(views).forEach((k) => {
      views[k].classList.toggle("is-visible", k === name);
    });
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.view === name);
    });
    if (name === "change") {
      loadChangeFields();
    }
    if (name === "stats") {
      requestAnimationFrame(() => renderStatsChart());
    }
  }

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      saveState();
      setActiveView(btn.dataset.view);
    });
  });

  function renderOrder() {
    orderGrid.innerHTML = "";
    const n = state.button_numbers;
    const hasLines = n >= 1;

    orderEmpty.hidden = hasLines;
    orderFooter.hidden = !hasLines;

    if (!hasLines) {
      return;
    }

    for (let i = 1; i <= 12; i++) {
      if (i > n) continue;
      const row = document.createElement("div");
      row.className = "product-row";
      row.dataset.index = String(i);

      const nameBtn = document.createElement("button");
      nameBtn.type = "button";
      nameBtn.className = "btn-product";
      nameBtn.textContent = state["savedProduct" + i] || "Produkt " + i;
      nameBtn.addEventListener("click", () => {
        setQty(i, getQty(i) + 1);
        syncQtyInput(row, i);
        updateTotalDisplay();
        saveState();
      });

      const qtyInput = document.createElement("input");
      qtyInput.type = "text";
      qtyInput.className = "qty";
      qtyInput.readOnly = true;
      qtyInput.setAttribute("inputmode", "none");
      qtyInput.value = state["number" + i] || "";

      const dec = document.createElement("button");
      dec.type = "button";
      dec.className = "btn-reduce";
      dec.setAttribute("aria-label", "Eins weniger");
      dec.textContent = "−";
      dec.addEventListener("click", () => {
        const q = getQty(i);
        if (q > 0) setQty(i, q - 1);
        syncQtyInput(row, i);
        updateTotalDisplay();
        saveState();
      });

      row.appendChild(nameBtn);
      row.appendChild(qtyInput);
      row.appendChild(dec);
      orderGrid.appendChild(row);
    }

    if (state.shot_active) {
      const row = document.createElement("div");
      row.className = "product-row";
      row.dataset.index = "13";

      const nameBtn = document.createElement("button");
      nameBtn.type = "button";
      nameBtn.className = "btn-product";
      nameBtn.textContent = state.savedProduct13 || "Schuss";
      nameBtn.addEventListener("click", () => {
        setQty(13, getQty(13) + 1);
        syncQtyInput(row, 13);
        updateTotalDisplay();
        saveState();
      });

      const qtyInput = document.createElement("input");
      qtyInput.type = "text";
      qtyInput.className = "qty";
      qtyInput.readOnly = true;
      qtyInput.value = state.number13 || "";

      const dec = document.createElement("button");
      dec.type = "button";
      dec.className = "btn-reduce";
      dec.textContent = "−";
      dec.addEventListener("click", () => {
        const q = getQty(13);
        if (q > 0) setQty(13, q - 1);
        syncQtyInput(row, 13);
        updateTotalDisplay();
        saveState();
      });

      row.appendChild(nameBtn);
      row.appendChild(qtyInput);
      row.appendChild(dec);
      orderGrid.appendChild(row);
    }

    updateTotalDisplay();
  }

  function syncQtyInput(row, index) {
    const input = row.querySelector(".qty");
    if (input) input.value = state["number" + index] || "";
  }

  function updateTotalDisplay() {
    const t = computeTotal();
    state.gesamt_preis = t;
    totalDisplay.textContent = formatMoney(t);
    changeOrderTotal.textContent = formatMoney(t) + " €";
  }

  function renderSettings() {
    linesCount.textContent = String(state.button_numbers);
    btnLinesPlus.disabled = state.button_numbers >= 12;
    btnLinesMinus.disabled = state.button_numbers <= 0;

    settingPfand.value = state.savedpfand;

    const showPfandCard = state.button_numbers > 0;
    cardPfandShot.hidden = !showPfandCard;
    if (!showPfandCard) {
      toggleShot.setAttribute("aria-checked", "false");
    } else {
      toggleShot.setAttribute("aria-checked", state.shot_active ? "true" : "false");
      shotBlock.hidden = !state.shot_active;
    }

    settingName13.value = state.savedProduct13 || "Schuss";
    settingPreis13.value = state.savedpreis13;

    settingsProducts.innerHTML = "";
    for (let i = 1; i <= 12; i++) {
      if (i > state.button_numbers) continue;
      const wrap = document.createElement("div");
      wrap.className = "card settings-line";
      wrap.innerHTML =
        "<h4>Zeile " +
        i +
        "</h4>" +
        '<div class="grid-two">' +
        '<div class="field-row"><label>Name</label><input type="text" data-k="name" data-i="' +
        i +
        '" /></div>' +
        '<div class="field-row"><label>Preis (€)</label><input type="text" data-k="preis" data-i="' +
        i +
        '" inputmode="decimal" /></div>' +
        "</div>";
      wrap.querySelector('[data-k="name"]').value = state["savedProduct" + i] || "";
      wrap.querySelector('[data-k="preis"]').value = state["savedpreis" + i] || "";
      settingsProducts.appendChild(wrap);
    }

    settingsProducts.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("change", onSettingsInput);
      inp.addEventListener("blur", onSettingsInput);
    });
  }

  function onSettingsInput(e) {
    const el = e.target;
    const i = el.dataset.i;
    const k = el.dataset.k;
    if (!i || !k) return;
    if (k === "name") state["savedProduct" + i] = el.value;
    if (k === "preis") state["savedpreis" + i] = el.value;
    saveState();
    renderOrder();
  }

  settingPfand.addEventListener("change", () => {
    state.savedpfand = settingPfand.value;
    saveState();
    updateTotalDisplay();
  });
  settingPfand.addEventListener("blur", () => {
    state.savedpfand = settingPfand.value;
    saveState();
    updateTotalDisplay();
  });

  btnLinesPlus.addEventListener("click", () => {
    if (state.button_numbers < 12) {
      state.button_numbers++;
      saveState();
      renderSettings();
      renderOrder();
    }
  });

  btnLinesMinus.addEventListener("click", () => {
    if (state.button_numbers > 0) {
      state.button_numbers--;
      saveState();
      renderSettings();
      renderOrder();
    }
  });

  toggleShot.addEventListener("click", () => {
    state.shot_active = !state.shot_active;
    toggleShot.setAttribute("aria-checked", state.shot_active ? "true" : "false");
    shotBlock.hidden = !state.shot_active;
    saveState();
    renderOrder();
  });

  settingName13.addEventListener("change", () => {
    state.savedProduct13 = settingName13.value;
    saveState();
    renderOrder();
  });
  settingPreis13.addEventListener("change", () => {
    state.savedpreis13 = settingPreis13.value;
    saveState();
    updateTotalDisplay();
  });

  btnResetOrder.addEventListener("click", () => {
    const backup = {
      numbers: {},
      savedgegeben: state.savedgegeben,
      savedgeld_zurück: state.savedgeld_zurück,
      savedpfand_anzahl: state.savedpfand_anzahl,
    };
    for (let i = 1; i <= 13; i++) {
      backup.numbers[i] = state["number" + i];
    }
    for (let i = 1; i <= 13; i++) {
      state["number" + i] = "";
    }
    state.savedgegeben = "";
    state.savedgeld_zurück = "";
    state.savedpfand_anzahl = "";
    saveState();
    renderOrder();
    inputGegeben.value = "";
    inputBecher.value = "";
    changeResult.value = "0,00";

    showToast("Alle Werte wurden zurückgesetzt", {
      undo: () => {
        for (let i = 1; i <= 13; i++) state["number" + i] = backup.numbers[i] || "";
        state.savedgegeben = backup.savedgegeben;
        state.savedgeld_zurück = backup.savedgeld_zurück;
        state.savedpfand_anzahl = backup.savedpfand_anzahl;
        saveState();
        renderOrder();
        inputGegeben.value = state.savedgegeben;
        inputBecher.value = state.savedpfand_anzahl;
        changeResult.value = state.savedgeld_zurück || "0,00";
        showToast("Wiederhergestellt");
      },
    });
  });

  btnCheckout.addEventListener("click", () => {
    const t = computeTotal();
    state.gesamt_preis = t;
    saveState();

    let sum12 = 0;
    const q12 = [];
    for (let i = 1; i <= 12; i++) {
      const q = getQty(i);
      q12.push(q);
      sum12 += q;
    }
    const pfand = parseLocaleFloat(state.savedpfand);
    const pfandSumme = sum12 * pfand;
    updateStatistics(t, pfandSumme, q12);

    setActiveView("change");
    changeOrderTotal.textContent = formatMoney(t) + " €";
    inputGegeben.focus();
  });

  function loadChangeFields() {
    const t = computeTotal();
    state.gesamt_preis = t;
    inputGegeben.value = state.savedgegeben || "";
    inputBecher.value = state.savedpfand_anzahl || "";
    changeResult.value = state.savedgeld_zurück || "0,00";
    changeOrderTotal.textContent = formatMoney(t) + " €";
  }

  btnCalcChange.addEventListener("click", () => {
    const finalTotal = computeTotal();
    state.gesamt_preis = finalTotal;
    const gegebenStr = inputGegeben.value.trim();
    const becherStr = inputBecher.value;
    const pfandStr = state.savedpfand;

    if (gegebenStr === "") {
      showToast("Bitte gültigen Betrag bei „Gegeben“ eingeben!");
      return;
    }

    const gegebenVal = parseLocaleFloat(gegebenStr);
    if (!Number.isFinite(gegebenVal)) {
      showToast("Bitte gültigen Betrag bei „Gegeben“ eingeben!");
      return;
    }

    let becherVal = 0;
    if (becherStr.trim() !== "") {
      const b = parseInt(becherStr, 10);
      becherVal = Number.isFinite(b) && b >= 0 ? b : 0;
    }

    const pfandVal = parseLocaleFloat(pfandStr);
    const gesamtPfand = pfandVal * becherVal;
    const rueckgeld = gegebenVal - (finalTotal - gesamtPfand);

    changeResult.value = formatMoney(rueckgeld);
    state.savedgegeben = inputGegeben.value;
    state.savedgeld_zurück = changeResult.value;
    state.savedpfand_anzahl = inputBecher.value;
    saveState();
  });

  btnFactoryReset.addEventListener("click", () => {
    if (!confirm("Sind Sie sicher, dass Sie alles auf Werkseinstellungen ZURÜCKSETZEN möchten?")) return;
    state = defaultState();
    saveState();
    if (confirm("Möchten Sie wirklich die Statistik löschen?")) {
      stats = defaultStats();
      saveStats();
      showToast("Alle Einstellungen und Statistik zurückgesetzt");
    } else {
      showToast("Alle Einstellungen wurden auf Werkseinstellungen zurückgesetzt");
    }
    renderSettings();
    renderOrder();
    loadChangeFields();
    renderStatsChart();
  });

  function renderStatsChart() {
    statsUmsatz.textContent = "Gesamtumsatz: " + formatMoney(stats.total_money) + " €";
    statsPfand.textContent = "Pfand gesamt: " + formatMoney(stats.total_pfand) + " €";

    const labels = [];
    const values = [];
    for (let i = 0; i < 12; i++) {
      const name =
        state["savedProduct" + (i + 1)] || "Produkt " + (i + 1);
      labels.push(name);
      values.push(stats["prod_qty_" + i] || 0);
    }
    labels.reverse();
    values.reverse();

    const data = {
      labels,
      datasets: [
        {
          label: "Verkaufte Einheiten",
          data: values,
          backgroundColor: "rgba(255, 215, 0, 0.75)",
          borderColor: "rgba(255, 215, 0, 1)",
          borderWidth: 1,
        },
      ],
    };

    const options = {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#e8eef2" },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: "#e8eef2",
            precision: 0,
            stepSize: 1,
          },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          ticks: { color: "#e8eef2" },
          grid: { display: false },
        },
      },
    };

    if (typeof Chart === "undefined") return;

    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = values;
      chartInstance.update();
    } else {
      chartInstance = new Chart(statsChartCanvas, {
        type: "bar",
        data,
        options,
      });
    }
  }

  btnResetStats.addEventListener("click", () => {
    if (!confirm("Möchten Sie wirklich die Statistik löschen?")) return;
    stats = defaultStats();
    saveStats();
    renderStatsChart();
    showToast("Statistik zurückgesetzt");
  });

  btnShareStats.addEventListener("click", async () => {
    if (typeof html2canvas === "undefined") {
      shareStatsText();
      return;
    }
    try {
      btnShareStats.disabled = true;
      const canvas = await html2canvas(statsPanel, {
        backgroundColor: "#122433",
        scale: window.devicePixelRatio > 1 ? 2 : 1.5,
      });
      canvas.toBlob(async (blob) => {
        btnShareStats.disabled = false;
        if (!blob) {
          shareStatsText();
          return;
        }
        const file = new File([blob], "bestellrechner-statistik.png", { type: "image/png" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Bestellrechner Statistik",
            });
            return;
          } catch (e) {
            if (e.name === "AbortError") return;
          }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bestellrechner-statistik.png";
        a.click();
        URL.revokeObjectURL(url);
        showToast("Bild wurde heruntergeladen");
      }, "image/png");
    } catch {
      btnShareStats.disabled = false;
      shareStatsText();
    }
  });

  function shareStatsText() {
    const lines = [
      statsUmsatz.textContent,
      statsPfand.textContent,
      "",
      "Produkte:",
    ];
    for (let i = 0; i < 12; i++) {
      const name = state["savedProduct" + (i + 1)] || "Produkt " + (i + 1);
      lines.push(name + ": " + (stats["prod_qty_" + i] || 0));
    }
    const text = lines.join("\n");
    if (navigator.share) {
      navigator.share({ title: "Bestellrechner", text }).catch(() => {
        copyToClipboard(text);
      });
    } else {
      copyToClipboard(text);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(
      () => showToast("In Zwischenablage kopiert"),
      () => showToast("Teilen nicht möglich")
    );
  }

  window.addEventListener("beforeunload", () => saveState());

  // Init
  renderSettings();
  renderOrder();
  loadChangeFields();
  updateTotalDisplay();

  inputGegeben.addEventListener("blur", () => {
    state.savedgegeben = inputGegeben.value;
    saveState();
  });
  inputBecher.addEventListener("blur", () => {
    state.savedpfand_anzahl = inputBecher.value;
    saveState();
  });
})();
