(function () {
  const state = {
    region: window.INDONESIA_REGIONS[0],
    modeKey: "sandbox",
    money: Infinity,
    population: 0,
    happiness: 82,
    hour: 7.5,
    speed: 1,
    activeDockMenu: null,
    activeSubTool: null
  };

  let engine = null;
  let citySim = null;

  const TOOL_LABELS = {
    road_4lane: "Jalan Raya 4 Lajur",
    road_2lane: "Jalan Raya 2 Lajur",
    road_1way_1: "Jalan 1 Arah (1 Jalur)",
    road_1way_2: "Jalan 1 Arah (2 Jalur)",
    road_bike: "Jalur Sepeda",
    road_pedestrian: "Trotoar Pedestrian",
    zone_r: "Zona Hijau (Hunian)",
    zone_c: "Zona Biru (Komersial & Kafe)",
    zone_i: "Zona Kuning (Industri)",
    zone_clear: "Hapus Zona",
    pln: "Pembangkit PLN",
    pdam: "Instalasi Air PDAM",
    bulldoze: "Buldoser Hapus Objek"
  };

  const SUB_MENUS = {
    tata_kota: [
      { id: "road_4lane", label: "🛣️ Jalan Raya 4 Lajur (Rp 0,40M)" },
      { id: "road_2lane", label: "🛣️ Jalan Raya 2 Lajur (Rp 0,20M)" },
      { id: "road_1way_1", label: "⬆️ 1 Arah – 1 Jalur (Rp 0,15M)" },
      { id: "road_1way_2", label: "⏫ 1 Arah – 2 Jalur (Rp 0,28M)" },
      { id: "road_bike", label: "🚲 Jalur Sepeda (Rp 0,10M)" },
      { id: "road_pedestrian", label: "🚶 Jalan Trotoar Paving (Rp 0,12M)" },
      { id: "zone_r", label: "🟩 Zona Hijau: Hunian" },
      { id: "zone_c", label: "🟦 Zona Biru: Komersial & Kafe" },
      { id: "zone_i", label: "🟨 Zona Kuning: Industri" },
      { id: "zone_clear", label: "🧹 Hapus Zona" },
      { id: "raise", label: "🏔️ Naikkan Gunung" },
      { id: "lower", label: "🌊 Gali Sungai" },
      { id: "flatten", label: "📐 Ratakan Tanah" },
      { id: "tree", label: "🌳 Tanam Pohon Rindang" }
    ],
    layanan: [
      { id: "pln", label: "⚡ Pembangkit PLN (Rp 4,5M)" },
      { id: "pdam", label: "💧 Instalasi Air PDAM (Rp 3,5M)" },
      { id: "info_layanan", label: "🏫 SD–Univ, RSUD & Polsek (Paket B)" }
    ],
    perda: [
      { id: "info_perda", label: "📜 Pajak Hiburan Malam & Perda Ritel (Paket B)" }
    ],
    gebrakan: [
      { id: "info_gebrakan", label: "🚀 Studio Arsitek Kustom & AI Blueprint (Paket B)" }
    ],
    buldoser: [
      { id: "bulldoze", label: "🪓 Pilih Area Hapus (Tarik Kotak / Ketuk Objek)" }
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

  function updateBlueprintUI(bp) {
    const bar = document.getElementById("blueprint-bar");
    const info = document.getElementById("blueprint-info");
    const rotBtn = document.getElementById("btn-bp-rotate");
    const curveBtn = document.getElementById("btn-bp-curve");

    if (!bp) {
      bar.classList.add("hidden");
      return;
    }

    const name = TOOL_LABELS[bp.toolId] || bp.toolId;
    const sizeText =
      bp.shape === "roundabout"
        ? `Bundaran Alun-Alun (${bp.validCount} Petak)`
        : bp.toolId.startsWith("zone_") || bp.toolId === "bulldoze"
          ? `${bp.spanW}×${bp.spanH} (${bp.validCount} Petak)`
          : `${bp.validCount} Petak`;
    const costText = bp.totalCost > 0 ? ` • Rp ${bp.totalCost.toFixed(2)} M` : "";
    info.textContent = `${name}: ${sizeText}${costText}`;

    if (bp.toolId === "pln" || bp.toolId === "pdam") {
      rotBtn.classList.remove("hidden");
    } else {
      rotBtn.classList.add("hidden");
    }

    if (citySim && citySim.isRoadTool(bp.toolId) && bp.shape === "curved") {
      curveBtn.classList.remove("hidden");
    } else {
      curveBtn.classList.add("hidden");
    }

    bar.classList.remove("hidden");
  }

  function updateLensAndRoadBars(toolId) {
    const lensBanner = document.getElementById("lens-banner");
    const roadOptsBar = document.getElementById("road-options-bar");
    if (!citySim) return;

    if (toolId === "pln") {
      citySim.setSmartLens("pln");
      lensBanner.textContent = "⚡ Lensa Listrik PLN: Biru = Teraliri Listrik • Merah = Butuh PLN";
      lensBanner.classList.remove("hidden");
      roadOptsBar.classList.add("hidden");
    } else if (toolId === "pdam") {
      citySim.setSmartLens("pdam");
      lensBanner.textContent = "💧 Lensa Air PDAM: Biru = Teraliri Air • Merah = Butuh PDAM";
      lensBanner.classList.remove("hidden");
      roadOptsBar.classList.add("hidden");
    } else if (toolId && citySim.isRoadTool(toolId)) {
      citySim.setSmartLens(null);
      lensBanner.classList.add("hidden");
      roadOptsBar.classList.remove("hidden");
    } else {
      citySim.setSmartLens(null);
      lensBanner.classList.add("hidden");
      roadOptsBar.classList.add("hidden");
    }
  }

  function clearActiveTool() {
    state.activeSubTool = null;
    if (engine) {
      engine.activeTool = null;
      engine.setGridVisible(false);
    }
    if (citySim) citySim.clearBlueprint();
    updateBlueprintUI(null);
    updateLensAndRoadBars(null);
    document.querySelectorAll(".sub-btn").forEach((x) => x.classList.remove("active"));
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
      state.hour = 7.5;

      document.getElementById("launcher-screen").classList.add("hidden");
      document.getElementById("hud-layer").classList.remove("hidden");

      if (!engine) {
        engine = new NusantaraGraphicsHD(document.getElementById("game-canvas"), {
          onSelectionStart: (wx, wz, toolId) => {
            if (!citySim) return;
            const bp = citySim.beginSelection(wx, wz, toolId);
            updateBlueprintUI(bp);
          },
          onSelectionMove: (wx, wz, toolId) => {
            if (!citySim) return;
            const bp = citySim.updateSelection(wx, wz, toolId);
            updateBlueprintUI(bp);
          },
          onSelectionEnd: () => {
            if (citySim && citySim.pendingBlueprint) {
              updateBlueprintUI(citySim.pendingBlueprint);
            }
          }
        });
        citySim = new CityRCISystem(engine);
        engine.onAtmosphereChange = (isNight) => citySim.updateNightLighting(isNight);
        startLoop();
      }

      clearActiveTool();
      engine.loadRegion(state.region);
      citySim.resetCity(state.region);
      engine.updateAtmosphere(state.hour);
      updateHUD();
      resetChatWelcome();
      showToast(`Selamat menjabat di ${state.region.name}! Populasi mulai dari 0 jiwa.`);
    });
  }

  function updateHUD() {
    const reg = state.region;
    const isNight = state.hour < 5.5 || state.hour > 18.5;
    const liveTemp = isNight ? reg.baseTemp - 3 : reg.baseTemp + (state.hour > 11 && state.hour < 15 ? 2 : 0);

    if (citySim) {
      // Populasi HANYA dihitung dari rumah yang benar-benar sudah selesai dibangun (0 saat awal/konstruksi)
      state.population = citySim.stats.completedResPop;
      const penalty = citySim.stats.unpoweredCount * 3 + citySim.stats.unwateredCount * 3;
      const bonus = Math.min(12, citySim.stats.cBuildings + citySim.stats.cafeCount);
      state.happiness = Math.max(25, Math.min(96, 82 + bonus - penalty));

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
          clearActiveTool();
          dockBtns.forEach((b) => b.classList.remove("active"));
          subMenu.classList.add("hidden");
          return;
        }

        state.activeDockMenu = menuKey;
        clearActiveTool();
        dockBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        subMenu.innerHTML = "";
        (SUB_MENUS[menuKey] || []).forEach((item) => {
          const sb = document.createElement("button");
          sb.className = "sub-btn";
          sb.textContent = item.label;
          sb.addEventListener("click", () => {
            if (item.id.startsWith("info_")) {
              showToast("Fitur ini langsung hadir di Paket B berikutnya!");
              return;
            }
            if (state.activeSubTool === item.id) {
              clearActiveTool();
              showToast("Mode kamera bebas aktif.");
            } else {
              clearActiveTool();
              sb.classList.add("active");
              state.activeSubTool = item.id;
              if (engine) {
                engine.activeTool = item.id;
                const isSculpt = ["raise", "lower", "flatten", "tree"].includes(item.id);
                engine.setGridVisible(!isSculpt);
              }
              updateLensAndRoadBars(item.id);
              showToast(`Alat aktif: ${item.label}. Tarik di peta lalu tekan ✓ Bangun.`);
            }
          });
          subMenu.appendChild(sb);
        });

        subMenu.classList.remove("hidden");
      });
    });

    document.querySelectorAll(".ropt-btn[data-shape]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".ropt-btn[data-shape]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (citySim) {
          citySim.roadShape = btn.dataset.shape;
          citySim.clearBlueprint();
          updateBlueprintUI(null);
        }
        const label =
          btn.dataset.shape === "roundabout"
            ? "Mode Bundaran Alun-Alun: Sentuh pusat & tarik radius lingkaran."
            : btn.dataset.shape === "curved"
              ? "Mode Jalan Melengkung: Tarik dari titik awal ke tujuan."
              : "Mode Jalan Lurus Presisi aktif.";
        showToast(label);
      });
    });

    document.getElementById("btn-toggle-road-trees").addEventListener("click", (e) => {
      if (!citySim) return;
      citySim.roadTreesEnabled = !citySim.roadTreesEnabled;
      e.currentTarget.classList.toggle("active", citySim.roadTreesEnabled);
      e.currentTarget.textContent = citySim.roadTreesEnabled ? "🌳 Pohon Trotoar: ON" : "🌳 Pohon Trotoar: OFF";
    });

    document.getElementById("btn-bp-confirm").addEventListener("click", () => {
      if (!citySim) return;
      if (citySim.confirmBlueprint(spendBudget)) {
        updateBlueprintUI(null);
        updateHUD();
        showToast("Konstruksi selesai dibangun!");
      }
    });

    document.getElementById("btn-bp-curve").addEventListener("click", () => {
      if (!citySim) return;
      const bp = citySim.toggleCurveDirection();
      updateBlueprintUI(bp);
    });

    document.getElementById("btn-bp-rotate").addEventListener("click", () => {
      if (!citySim) return;
      const bp = citySim.rotateBlueprint();
      updateBlueprintUI(bp);
    });

    document.getElementById("btn-bp-cancel").addEventListener("click", () => {
      if (citySim) citySim.clearBlueprint();
      updateBlueprintUI(null);
    });

    document.getElementById("btn-cam-view").addEventListener("click", (e) => {
      if (!engine) return;
      const isTop = engine.toggleCameraAngle();
      e.currentTarget.textContent = isTop ? "📐 Sudut: Atas" : "📐 Sudut: 3D";
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
      `Halo Kepala Daerah! Selamat datang di <strong>${state.region.name}</strong>.<br><br>• <strong>Paket A Aktif:</strong> Pohon bercabang daun asli, rumput helai alami, air sungai/pantai beriak &amp; berbuih, jalan raya 100% menyambung mulus, rumah &amp; gedung bertekstur, kafe nongkrong <em>outdoor</em>, warga jalan kaki, serta <em>city light</em> malam.<br>• <strong>Populasi Realistis:</strong> Kota mulai dari <strong>0 jiwa</strong> dan warga baru pindah setelah rumah selesai dibangun.`
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

    if (s && (q.includes("progress") || q.includes("cek"))) {
      return `<strong>Laporan Kota ${reg.name}:</strong><br>• <strong>Populasi Nyata:</strong> ${state.population.toLocaleString("id-ID")} jiwa (Kepuasan ${state.happiness}%)<br>• <strong>Kafe Nongkrong Aktif:</strong> ${s.cafeCount} kafe <em>outdoor</em><br>• <strong>Jaringan Jalan:</strong> ${s.roads} petak | <strong>Utilitas:</strong> ${s.plnCount} PLN, ${s.pdamCount} PDAM<br>• <strong>Tingkat Bangunan (R/C/I):</strong> ${s.rBuildings} / ${s.cBuildings} / ${s.iBuildings}`;
    }

    if (q.includes("bundaran") || q.includes("melengkung")) {
      return `<strong>Cara Buat Jalan Melengkung &amp; Bundaran Alun-Alun:</strong><br>1. Pilih jenis jalan di <strong>🛣️ Tata Kota</strong>.<br>2. Pilih <strong>〰️ Melengkung</strong> atau <strong>⭕ Bundaran Alun-Alun</strong> di bilah kiri atas.<br>3. Tarik di peta lalu ketuk <strong>✓ Bangun</strong>.`;
    }

    return `Saya memantau <strong>${reg.name}</strong>. Sambungkan jalan dari <strong>${reg.highway.label}</strong>, buat zona <strong>Hijau (Hunian)</strong> &amp; <strong>Biru (Komersial &amp; Kafe)</strong>, lalu pasang PLN &amp; PDAM agar kota tumbuh menjadi gedung tinggi dan bercahaya indah di malam hari.`;
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
        // Kecepatan waktu realistis: 1 jam game = ~40 detik waktu nyata di mode 1x
        state.hour = (state.hour + delta * 0.025 * state.speed) % 24;
        if (engine) engine.updateAtmosphere(state.hour);
        if (citySim) citySim.stepSimulation(delta, state.speed);

        taxTimer += delta * state.speed;
        if (taxTimer >= 12 && citySim && state.money !== Infinity) {
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
