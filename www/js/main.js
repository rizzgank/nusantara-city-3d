(function () {
  const state = {
    region: window.INDONESIA_REGIONS[0],
    modeKey: "sandbox",
    money: Infinity,
    population: 0,
    happiness: 82,
    hour: 7.25,
    speed: 1,
    activeDockMenu: null,
    activeSubTool: null,
    terrainEdits: 0,
    treesPlanted: 0
  };

  let engine = null;
  let citySim = null;

  const SUB_MENUS = {
    tata_kota: [
      { id: "road_local", label: "🛣️ Jalan Lingkungan (Rp 0,15M)" },
      { id: "road_arterial", label: "🛣️ Jalan Arteri 4 Lajur (Rp 0,35M)" },
      { id: "zone_r", label: "🟩 Zona Hijau: Hunian" },
      { id: "zone_c", label: "🟦 Zona Biru: Komersial" },
      { id: "zone_i", label: "🟨 Zona Kuning: Industri" },
      { id: "zone_clear", label: "🧹 Hapus Zona" },
      { id: "raise", label: "🏔️ Naikkan Gunung" },
      { id: "lower", label: "🌊 Gali Sungai" },
      { id: "flatten", label: "📐 Ratakan Tanah" },
      { id: "tree", label: "🌲 Tanam Pinus" }
    ],
    layanan: [
      { id: "pln", label: "⚡ Pembangkit PLN (Rp 4,5M)" },
      { id: "pdam", label: "💧 Instalasi Air PDAM (Rp 3,5M)" },
      { id: "info_layanan", label: "🏫 SD–Univ, RSUD & Polsek (Tahap 3)" }
    ],
    perda: [
      { id: "info_perda", label: "📜 Pajak Hiburan Malam & Perda Ritel (Tahap 3)" }
    ],
    gebrakan: [
      { id: "info_gebrakan", label: "🚀 Kuas Distrik, Voting & AI Blueprint (Tahap 4)" }
    ],
    buldoser: [
      { id: "bulldoze", label: "🪓 Aktifkan Buldoser (Usap untuk Hapus Objek)" }
    ]
  };

  function showToast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => el.classList.add("hidden"), 2700);
  }

  function spendBudget(amount) {
    if (state.money === Infinity) return true;
    if (state.money < amount) {
      showToast(`APBD tidak cukup! Butuh Rp ${amount.toFixed(2)} M.`);
      return false;
    }
    state.money -= amount;
    return true;
  }

  function updateLensBanner(toolId) {
    const banner = document.getElementById("lens-banner");
    if (!citySim) return;

    if (toolId === "pln") {
      citySim.setSmartLens("pln");
      banner.textContent = "⚡ Lensa Listrik PLN: Biru = Teraliri Listrik • Merah = Butuh Gardu/Pembangkit PLN";
      banner.classList.remove("hidden");
    } else if (toolId === "pdam") {
      citySim.setSmartLens("pdam");
      banner.textContent = "💧 Lensa Air PDAM: Biru = Teraliri Air Bersih • Merah = Butuh Instalasi PDAM";
      banner.classList.remove("hidden");
    } else {
      citySim.setSmartLens(null);
      banner.classList.add("hidden");
    }
  }

  function initLauncher() {
    const grid = document.getElementById("region-grid");
    const summary = document.getElementById("selected-summary");

    window.INDONESIA_REGIONS.forEach((reg, idx) => {
      const card = document.createElement("button");
      card.className = "region-card" + (idx === 0 ? " active" : "");
      card.innerHTML = `
        <div class="reg-top">
          <span>${reg.name}</span>
          <span class="reg-temp">${reg.baseTemp}°C</span>
        </div>
        <div class="reg-biome">${reg.biomeLabel} • ${reg.weatherLabel}</div>
        <div class="reg-desc">${reg.desc}</div>
      `;
      card.addEventListener("click", () => {
        document.querySelectorAll(".region-card").forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        state.region = reg;
        summary.innerHTML = `Terpilih: <strong>${reg.name}</strong> • ${reg.biomeLabel} (${reg.baseTemp}°C)`;
      });
      grid.appendChild(card);
    });

    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.modeKey = btn.dataset.mode;
      });
    });

    document.getElementById("btn-start-city").addEventListener("click", () => {
      const modeCfg = window.GAME_MODES[state.modeKey];
      state.money = modeCfg.startMoney;
      state.population = 0;
      state.happiness = 82;
      state.hour = 7.25;
      state.terrainEdits = 0;
      state.treesPlanted = 0;

      document.getElementById("launcher-screen").classList.add("hidden");
      document.getElementById("hud-layer").classList.remove("hidden");

      if (!engine) {
        engine = new NusantaraGraphicsHD(document.getElementById("game-canvas"), (wx, wz, toolId) => {
          if (toolId === "tree") {
            state.treesPlanted++;
            return;
          }
          if (toolId === "raise" || toolId === "lower" || toolId === "flatten") {
            state.terrainEdits++;
            return;
          }
          if (citySim) {
            citySim.applyToolAt(wx, wz, toolId, spendBudget);
          }
        });
        citySim = new CityRCISystem(engine);
        engine.onAtmosphereChange = (isNight) => citySim.updateNightLighting(isNight);
        startLoop();
      }

      engine.loadRegion(state.region);
      citySim.resetCity();
      engine.updateAtmosphere(state.hour);
      updateHUD();
      resetChatWelcome();
      showToast(`Selamat menjabat di ${state.region.name}! Tarik jalan dari Gerbang Tol lalu warnai Zona RCI.`);
    });
  }

  function updateHUD() {
    const reg = state.region;
    const isNight = state.hour < 5.5 || state.hour > 18.5;
    const liveTemp = isNight ? reg.baseTemp - 3 : reg.baseTemp + (state.hour > 11 && state.hour < 15 ? 2 : 0);

    if (citySim) {
      state.population = citySim.stats.rBuildings * 140;
      const penalty = citySim.stats.unpoweredCount * 3 + citySim.stats.unwateredCount * 3;
      state.happiness = Math.max(25, Math.min(96, 82 + Math.min(12, citySim.stats.cBuildings) - penalty));

      document.getElementById("bar-r").style.height = `${citySim.demand.R}%`;
      document.getElementById("bar-c").style.height = `${citySim.demand.C}%`;
      document.getElementById("bar-i").style.height = `${citySim.demand.I}%`;
    }

    document.getElementById("hud-city-name").textContent = `📍 ${reg.name}`;
    document.getElementById("hud-weather").textContent = `${liveTemp}°C ${isNight ? "Malam Sejuk" : reg.weatherLabel}`;
    document.getElementById("hud-happiness").textContent = `${state.happiness >= 65 ? "😊" : "😠"} ${state.happiness}%`;

    const budgetText = state.money === Infinity ? "💰 ∞ Sandbox" : `💰 Rp ${state.money.toFixed(1)} M`;
    document.getElementById("hud-budget").textContent = budgetText;
    document.getElementById("hud-pop").textContent = `👥 ${state.population.toLocaleString("id-ID")}`;

    const hh = String(Math.floor(state.hour)).padStart(2, "0");
    const mm = String(Math.floor((state.hour % 1) * 60)).padStart(2, "0");
    document.getElementById("hud-clock").textContent = `${hh}:${mm}`;
  }

  function initDock() {
    const subMenu = document.getElementById("sub-menu");
    const dockBtns = document.querySelectorAll(".dock-btn");

    dockBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const menuKey = btn.dataset.menu;
        if (state.activeDockMenu === menuKey) {
          state.activeDockMenu = null;
          state.activeSubTool = null;
          if (engine) engine.activeTool = null;
          updateLensBanner(null);
          dockBtns.forEach((b) => b.classList.remove("active"));
          subMenu.classList.add("hidden");
          return;
        }

        state.activeDockMenu = menuKey;
        dockBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        subMenu.innerHTML = "";
        (SUB_MENUS[menuKey] || []).forEach((item) => {
          const sb = document.createElement("button");
          sb.className = "sub-btn" + (state.activeSubTool === item.id ? " active" : "");
          sb.textContent = item.label;
          sb.addEventListener("click", () => {
            if (item.id.startsWith("info_")) {
              showToast("Fitur ini akan aktif di Tahap 3–4 berikutnya!");
              return;
            }
            if (state.activeSubTool === item.id) {
              state.activeSubTool = null;
              if (engine) engine.activeTool = null;
              updateLensBanner(null);
              sb.classList.remove("active");
              showToast("Mode kamera bebas aktif (1 jari geser, 2 jari zoom/putar).");
            } else {
              document.querySelectorAll(".sub-btn").forEach((x) => x.classList.remove("active"));
              sb.classList.add("active");
              state.activeSubTool = item.id;
              if (engine) engine.activeTool = item.id;
              updateLensBanner(item.id);
              showToast(`Alat aktif: ${item.label}. Usap layar untuk membangun!`);
            }
          });
          subMenu.appendChild(sb);
        });

        subMenu.classList.remove("hidden");
      });
    });

    document.querySelectorAll(".speed-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".speed-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.speed = Number(btn.dataset.speed);
      });
    });

    document.getElementById("btn-city-menu").addEventListener("click", () => {
      document.getElementById("launcher-screen").classList.remove("hidden");
    });
  }

  function resetChatWelcome() {
    const box = document.getElementById("chat-messages");
    box.innerHTML = "";
    appendChatMsg(
      "ai",
      `Halo Kepala Daerah! Selamat datang di <strong>${state.region.name}</strong>.<br><br><strong>Tahap 2 sudah aktif:</strong><br>1. Buka <strong>🛣️ Tata Kota</strong> lalu tarik jalan dari ujung <em>Gerbang Tol</em>.<br>2. Warnai <strong>🟩 Zona Hijau</strong>, <strong>🟦 Zona Biru</strong>, dan <strong>🟨 Zona Kuning</strong> di pinggir jalan.<br>3. Bangun <strong>⚡ PLN</strong> dan <strong>💧 PDAM</strong> di menu <strong>🏛️ Layanan</strong> agar bangunan berevolusi menjadi gedung modern!`
    );
  }

  function appendChatMsg(sender, html) {
    const box = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = "msg-bubble " + (sender === "ai" ? "msg-ai" : "msg-user");
    div.innerHTML = html;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function generateSmartAIResponse(query) {
    const q = query.toLowerCase();
    const reg = state.region;
    const s = citySim ? citySim.stats : null;

    if (q.includes("belum tumbuh") || q.includes("kenapa rumah")) {
      return `<strong>Syarat Bangunan Tumbuh Otomatis:</strong><br>1. Zona (Hijau/Biru/Kuning) wajib menempel tepat di samping petak jalan.<br>2. Jalan tersebut harus <strong>tersambung ke Jalan Tol Awal (Gerbang Biru)</strong> di selatan agar truk material & warga pendatang bisa masuk.<br>3. Kecepatan waktu tidak dalam kondisi <em>Pause (⏸️)</em>.`;
    }

    if (s && (q.includes("progress") || q.includes("cek") || q.includes("abis ini") || q.includes("gimana"))) {
      const tips = [];
      if (s.roads === 0) tips.push("• Tarik jaringan jalan baru menyambung dari ujung jalan Gerbang Tol di selatan.");
      if (s.rBuildings === 0) tips.push("• Warnai <strong>🟩 Zona Hijau</strong> di pinggir jalan agar warga pendatang mulai membangun rumah.");
      if (s.rBuildings > 0 && s.cBuildings === 0) tips.push("• Warga sudah mulai tinggal! Warnai <strong>🟦 Zona Biru</strong> agar ruko & warung tumbuh.");
      if (s.rBuildings > 0 && s.iBuildings === 0) tips.push("• Warnai <strong>🟨 Zona Kuning</strong> agak terpisah dari perumahan untuk membuka lapangan kerja.");
      if (s.plnCount === 0 || s.unpoweredCount > 0) tips.push("• Bangun <strong>⚡ Pembangkit PLN</strong> di menu <em>Layanan</em> karena ada bangunan yang belum mendapat listrik.");
      if (s.pdamCount === 0 || s.unwateredCount > 0) tips.push("• Bangun <strong>💧 Instalasi PDAM</strong> di menu <em>Layanan</em> agar bangunan bisa naik ke Level 2 & 3.");
      if (tips.length === 0) tips.push("• Infrastruktur dasar sangat sehat! Perluas jalan arteri dan tambah zona RCI untuk memperbesar populasi & pemasukan pajak.");

      return `<strong>Hasil Pemindaian Kota ${reg.name}:</strong><br>• <strong>Populasi:</strong> ${state.population.toLocaleString("id-ID")} jiwa (Kepuasan ${state.happiness}%)<br>• <strong>Jalan Dibangun:</strong> ${s.roads} petak | <strong>Utilitas:</strong> ${s.plnCount} PLN, ${s.pdamCount} PDAM<br>• <strong>Tingkat Bangunan (R/C/I):</strong> ${s.rBuildings} / ${s.cBuildings} / ${s.iBuildings}<br><br><strong>Rekomendasi Langkah Berikutnya:</strong><br>${tips.join("<br>")}`;
    }

    return `Saya memantau <strong>${reg.name}</strong> secara langsung. Gunakan kuas di <strong>🛣️ Tata Kota</strong> untuk menyambung jalan dari Gerbang Tol dan mewarnai zona RCI, serta <strong>🏛️ Layanan</strong> untuk memasang PLN & PDAM. Ketuk chip <em>"Cek progress kotaku sekarang"</em> kapan pun untuk audit otomatis!`;
  }

  function initChat() {
    const drawer = document.getElementById("ai-chat-drawer");
    document.getElementById("btn-open-chat").addEventListener("click", () => {
      drawer.classList.remove("closed");
    });
    document.getElementById("btn-close-chat").addEventListener("click", () => {
      drawer.classList.add("closed");
    });

    document.querySelectorAll(".chip-btn").forEach((chip) => {
      chip.addEventListener("click", () => {
        const text = chip.dataset.q;
        appendChatMsg("user", text);
        setTimeout(() => appendChatMsg("ai", generateSmartAIResponse(text)), 220);
      });
    });

    document.getElementById("chat-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("chat-input");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      appendChatMsg("user", text);
      setTimeout(() => appendChatMsg("ai", generateSmartAIResponse(text)), 240);
    });
  }

  function startLoop() {
    let lastTime = performance.now();
    let hudTimer = 0;
    let taxTimer = 0;

    function tick(now) {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (state.speed > 0) {
        state.hour = (state.hour + delta * 0.18 * state.speed) % 24;
        if (engine) engine.updateAtmosphere(state.hour);
        if (citySim) citySim.stepSimulation(delta, state.speed);

        // Siklus Pemasukan Pajak & Biaya Operasional Harian (Real Mode)
        taxTimer += delta * state.speed;
        if (taxTimer >= 8 && citySim && state.money !== Infinity) {
          taxTimer = 0;
          const s = citySim.stats;
          const taxIncome = s.rBuildings * 0.25 + s.cBuildings * 0.45 + s.iBuildings * 0.55;
          const upkeep = s.roads * 0.015 + s.plnCount * 0.35 + s.pdamCount * 0.28;
          state.money = Math.max(0, state.money + taxIncome - upkeep);
        }
      }

      hudTimer += delta;
      if (hudTimer >= 0.4) {
        hudTimer = 0;
        updateHUD();
      }

      if (engine) engine.render(delta);
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function bootApp() {
    initLauncher();
    initDock();
    initChat();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", bootApp);
  } else {
    bootApp();
  }
})();
