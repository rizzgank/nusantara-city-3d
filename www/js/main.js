(function () {
  const SAVE_STORAGE_KEY = "nusantara_city_saves_v1";

  const DIFFICULTY_CONFIG = {
    easy: { key: "easy", label: "Easy (Perintis)", startMoney: 250.0, upkeepMult: 0.7 },
    medium: { key: "medium", label: "Medium (Walikota)", startMoney: 120.0, upkeepMult: 1.0 },
    hard: { key: "hard", label: "Hard (Krisis APBD)", startMoney: 60.0, upkeepMult: 1.35 }
  };

  const state = {
    inGame: false,
    region: window.INDONESIA_REGIONS[0],
    modeKey: "sandbox",
    difficultyKey: "medium",
    money: Infinity,
    population: 0,
    happiness: 82,
    hour: 7.5,
    speed: 1,
    activeDockMenu: null,
    activeSubTool: null,
    settings: {
      quality: "high",
      zoomSpeed: 1.0,
      showGrid: true
    }
  };

  let engine = null;
  let citySim = null;
  let previewRenderer = null;
  let previewScene = null;
  let previewCamera = null;
  let previewMesh = null;
  let introTimers = [];

  const TOOL_LABELS = {
    road_4lane: "Jalan Raya 4 Lajur (2 Petak)",
    road_2lane: "Jalan Raya 2 Lajur",
    road_1way_1: "Jalan 1 Arah (1 Jalur)",
    road_1way_2: "Jalan 1 Arah (2 Jalur)",
    road_bike: "Jalur Sepeda",
    road_pedestrian: "Trotoar Pedestrian",
    zone_r: "Zona Hijau (Hunian)",
    zone_c: "Zona Biru (Komersial & Kafe)",
    zone_i: "Zona Kuning (Industri)",
    zone_clear: "Hapus Zona",
    pln: "Gardu & Pembangkit PLN",
    pdam: "Instalasi Air PDAM",
    worship: "Tempat Ibadah (Masjid Agung)",
    school: "Sekolah & Pendidikan",
    health: "Puskesmas & RSUD",
    safety: "Polsek & Pos Damkar",
    park: "Taman Kota",
    bulldoze: "Buldoser Hapus Objek"
  };

  // DOCK BAWAH TERPISAH: JALAN vs ZONA & LAHAN vs LAYANAN ALA THEOTOWN
  const SUB_MENUS = {
    jalan: [
      { id: "road_4lane", label: "🛣️ Jalan 4 Lajur [2 Petak] (Rp 0,40M)" },
      { id: "road_2lane", label: "🛣️ Jalan 2 Lajur (Rp 0,20M)" },
      { id: "road_1way_1", label: "⬆️ 1 Arah – 1 Jalur (Rp 0,15M)" },
      { id: "road_1way_2", label: "⏫ 1 Arah – 2 Jalur (Rp 0,28M)" },
      { id: "road_bike", label: "🚲 Jalur Sepeda (Rp 0,10M)" },
      { id: "road_pedestrian", label: "🚶 Trotoar Paving (Rp 0,12M)" }
    ],
    zona_lahan: [
      { id: "zone_r", label: "🟩 Zona Hijau: Hunian" },
      { id: "zone_c", label: "🟦 Zona Biru: Komersial & Kafe" },
      { id: "zone_i", label: "🟨 Zona Kuning: Industri" },
      { id: "zone_clear", label: "🧹 Hapus Zona" },
      { id: "raise", label: "🏔️ Naikkan Gunung" },
      { id: "lower", label: "🌊 Gali Sungai" },
      { id: "flatten", label: "📐 Ratakan Tanah" },
      { id: "tree", label: "🌳 Tanam Pohon" }
    ],
    layanan: [
      { id: "pln", label: "⚡ Listrik PLN (Rp 4,5M)" },
      { id: "pdam", label: "💧 Air PDAM (Rp 3,5M)" },
      { id: "worship", label: "🕌 Ibadah / Masjid (Rp 3,0M)" },
      { id: "school", label: "🏫 Pendidikan / Sekolah (Rp 4,0M)" },
      { id: "health", label: "🏥 Kesehatan / RSUD (Rp 4,2M)" },
      { id: "safety", label: "🚓 Polsek & Damkar (Rp 3,2M)" },
      { id: "park", label: "🌳 Taman Kota (Rp 1,8M)" }
    ],
    perda_gebrakan: [
      { id: "info_tahap3", label: "🚀 Studio Arsitek Kustom & 📜 Perda Pajak (Siap di Tahap 3)" }
    ],
    buldoser: [
      { id: "bulldoze", label: "🪓 Tarik / Ketuk untuk Menghapus Jalan, Zona, atau Bangunan" }
    ]
  };

  function getRegionLevelLabel(pop) {
    if (pop >= 75000) return "Lv.5 Megapolitan";
    if (pop >= 20000) return "Lv.4 Metropolitan";
    if (pop >= 5000) return "Lv.3 Kota Madya";
    if (pop >= 1000) return "Lv.2 Kota Kecil";
    return "Lv.1 Desa Rintisan";
  }

  function showToast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => el.classList.add("hidden"), 2700);
  }

  function hideAllScreens() {
    [
      "main-menu-screen",
      "mode-select-screen",
      "difficulty-select-screen",
      "map-select-screen",
      "hud-layer"
    ].forEach((id) => document.getElementById(id).classList.add("hidden"));
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

  // =========================================================
  // 1. INTRO SINEMATIK
  // =========================================================
  function playIntroCinematic(onComplete) {
    introTimers.forEach((t) => clearTimeout(t));
    introTimers = [];

    const splash = document.getElementById("intro-splash");
    const stageTitle = document.getElementById("splash-stage-title");
    const stageLogo = document.getElementById("splash-stage-logo");

    splash.classList.remove("hidden", "fade-out");
    stageTitle.classList.remove("play-cinematic");
    stageLogo.classList.remove("play-cinematic");
    void stageTitle.offsetWidth;

    stageTitle.classList.add("play-cinematic");

    introTimers.push(
      setTimeout(() => {
        stageTitle.classList.remove("play-cinematic");
        stageLogo.classList.add("play-cinematic");
      }, 2650)
    );

    const finishIntro = () => {
      introTimers.forEach((t) => clearTimeout(t));
      introTimers = [];
      splash.classList.add("fade-out");
      setTimeout(() => {
        splash.classList.add("hidden");
        if (onComplete) onComplete();
      }, 650);
    };

    introTimers.push(setTimeout(finishIntro, 5350));
    splash.onclick = finishIntro;
  }

  // =========================================================
  // 2. ENGINE 3D & KARTU INSPEKSI BANGUNAN
  // =========================================================
  function showInspectCard(info) {
    const card = document.getElementById("inspect-card");
    if (!info) {
      card.classList.add("hidden");
      return;
    }

    document.getElementById("ins-badge").textContent = info.badge;
    document.getElementById("ins-title").textContent = info.title;
    document.getElementById("ins-stats").textContent = info.stats;
    document.getElementById("ins-tip").textContent = info.tip;

    const needsGrid = document.getElementById("ins-needs");
    needsGrid.innerHTML = "";
    if (info.needs) {
      const items = [
        { k: "power", label: "⚡ PLN" },
        { k: "water", label: "💧 PDAM" },
        { k: "worship", label: "🕌 Ibadah" },
        { k: "school", label: "🏫 Sekolah" },
        { k: "health", label: "🏥 RSUD" },
        { k: "safety", label: "🚓 Polsek" }
      ];
      items.forEach((it) => {
        const ok = Boolean(info.needs[it.k]);
        const pill = document.createElement("div");
        pill.className = "need-pill " + (ok ? "need-ok" : "need-miss");
        pill.textContent = `${ok ? "✓" : "✕"} ${it.label}`;
        needsGrid.appendChild(pill);
      });
    }

    card.classList.remove("hidden");
  }

  function ensureMainEngine() {
    if (engine) return;
    engine = new NusantaraGraphicsHD(document.getElementById("game-canvas"), {
      onSelectionStart: (wx, wz, toolId) => {
        if (!citySim || !state.inGame) return;
        const bp = citySim.beginSelection(wx, wz, toolId);
        updateBlueprintUI(bp);
      },
      onSelectionMove: (wx, wz, toolId) => {
        if (!citySim || !state.inGame) return;
        const bp = citySim.updateSelection(wx, wz, toolId);
        updateBlueprintUI(bp);
      },
      onSelectionEnd: () => {
        if (citySim && citySim.pendingBlueprint && state.inGame) {
          updateBlueprintUI(citySim.pendingBlueprint);
        }
      },
      onTapInspect: (wx, wz) => {
        if (!citySim || !state.inGame) return;
        const info = citySim.inspectAtWorld(wx, wz);
        showInspectCard(info);
      }
    });
    citySim = new CityRCISystem(engine);
    engine.onAtmosphereChange = (isNight) => citySim.updateNightLighting(isNight);
    engine.loadRegion(state.region);
    citySim.resetCity(state.region);
    engine.updateAtmosphere(8.5);
    applyGraphicsSettings();
  }

  function applyGraphicsSettings() {
    if (!engine) return;
    const q = state.settings.quality;
    if (q === "low") {
      engine.renderer.setPixelRatio(1);
      engine.renderer.shadowMap.enabled = false;
    } else if (q === "medium") {
      engine.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      engine.renderer.shadowMap.enabled = true;
    } else {
      engine.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      engine.renderer.shadowMap.enabled = true;
    }
  }

  function update3DMapPreview(region) {
    const canvas = document.getElementById("map-preview-canvas");
    if (!canvas) return;

    if (!previewRenderer) {
      previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      previewScene = new THREE.Scene();
      previewCamera = new THREE.PerspectiveCamera(42, 1.6, 0.5, 300);
      previewCamera.position.set(0, 48, 56);
      previewCamera.lookAt(0, 2, 0);

      const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x3f6212, 0.9);
      const dir = new THREE.DirectionalLight(0xfffbeb, 1.35);
      dir.position.set(40, 70, 35);
      previewScene.add(hemi, dir);
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      previewRenderer.setSize(rect.width, rect.height, false);
      previewCamera.aspect = rect.width / rect.height;
      previewCamera.updateProjectionMatrix();
    }

    previewScene.background = new THREE.Color(region.fogColor);

    if (previewMesh) {
      previewScene.remove(previewMesh);
      previewMesh.geometry.dispose();
    }

    const segs = 64;
    const size = 64;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const pz = pos.getZ(i);
      const wx = (px / (size / 2)) * 160;
      const wz = (pz / (size / 2)) * 160;
      const h = window.generateRegionHeight(region, wx, wz, 160);
      pos.setY(i, h * 0.35);

      if (h < -0.1) c.setHex(0x0284c7);
      else if (h < 0.55) c.setHex(0xe2d2a4);
      else if (h > 16.5) c.setHex(0x64748b);
      else if (h < 6.0) c.setHex(0x4d7c0f);
      else c.setHex(0x365314);

      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    previewMesh = new THREE.Mesh(geo, mat);
    previewScene.add(previewMesh);
  }

  // =========================================================
  // 3. SISTEM SAVE & LOAD
  // =========================================================
  function loadAllSaveSlots() {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeAllSaveSlots(allData) {
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(allData));
      return true;
    } catch (e) {
      showToast("Gagal menyimpan ke memori perangkat.");
      return false;
    }
  }

  function captureCurrentCityData() {
    if (!engine || !citySim) return null;

    const pos = engine.terrainGeo.attributes.position;
    const heights = new Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      heights[i] = Math.round(pos.getY(i) * 100) / 100;
    }

    const cellsData = [];
    for (let gx = 0; gx < citySim.gridSize; gx++) {
      for (let gz = 0; gz < citySim.gridSize; gz++) {
        const c = citySim.grid[gx][gz];
        if ((c.type !== "empty" && c.type !== "starter_highway") || c.zone || c.building) {
          cellsData.push({
            gx,
            gz,
            type: c.type,
            parentRoad: c.parentRoad,
            isVertical: Boolean(c.isVertical),
            oneWayDir: c.oneWayDir,
            hasSidewalkTrees: c.hasSidewalkTrees,
            zone: c.zone,
            building: c.building
              ? {
                  zone: c.building.zone,
                  level: c.building.level
                }
              : null
          });
        }
      }
    }

    return {
      savedAt: new Date().toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }),
      regionId: state.region.id,
      regionName: state.region.name,
      modeKey: state.modeKey,
      difficultyKey: state.difficultyKey,
      money: state.money === Infinity ? "INFINITY" : state.money,
      population: state.population,
      happiness: state.happiness,
      hour: state.hour,
      levelLabel: getRegionLevelLabel(state.population),
      heights,
      cellsData
    };
  }

  function saveToSlot(slotKey, silent = false) {
    const data = captureCurrentCityData();
    if (!data) return;
    const all = loadAllSaveSlots();
    all[slotKey] = data;
    if (writeAllSaveSlots(all) && !silent) {
      showToast(`Kota ${data.regionName} berhasil disimpan!`);
      renderSaveSlotsModal();
    }
  }

  function loadFromSlot(slotKey) {
    const all = loadAllSaveSlots();
    const data = all[slotKey];
    if (!data) return;

    const reg = window.INDONESIA_REGIONS.find((r) => r.id === data.regionId) || window.INDONESIA_REGIONS[0];
    state.region = reg;
    state.modeKey = data.modeKey || "sandbox";
    state.difficultyKey = data.difficultyKey || "medium";
    state.money = data.money === "INFINITY" ? Infinity : Number(data.money);
    state.population = data.population || 0;
    state.happiness = data.happiness || 82;
    state.hour = data.hour || 7.5;

    ensureMainEngine();
    clearActiveTool();
    engine.loadRegion(reg);
    citySim.resetCity(reg);

    if (Array.isArray(data.heights)) {
      const pos = engine.terrainGeo.attributes.position;
      const len = Math.min(pos.count, data.heights.length);
      for (let i = 0; i < len; i++) pos.setY(i, data.heights[i]);
      pos.needsUpdate = true;
      engine._recolorAndNormals();
    }

    (data.cellsData || []).forEach((item) => {
      const cell = citySim.getCell(item.gx, item.gz);
      if (!cell || cell.type === "starter_highway") return;

      const wp = citySim.gridToWorld(item.gx, item.gz);
      const gy = engine.getHeightAt(wp.x, wp.z);
      cell.type = item.type || "empty";
      cell.parentRoad = item.parentRoad || null;
      cell.isVertical = Boolean(item.isVertical);
      cell.oneWayDir = item.oneWayDir || null;
      cell.hasSidewalkTrees = Boolean(item.hasSidewalkTrees);
      cell.zone = item.zone || null;

      if (cell.type === "road_4lane") {
        const cx = cell.isVertical ? wp.x + 2 : wp.x;
        const cz = cell.isVertical ? wp.z : wp.z + 2;
        const cgy = engine.getHeightAt(cx, cz);
        engine.clearVegetationNear(cx, cz, 4.8);
        cell.mesh = citySim._create4LaneRoadMesh(cx, cgy, cz, cell.isVertical, (item.gx + item.gz) % 5 === 0);
        citySim.rootGroup.add(cell.mesh);
      } else if (citySim.isRoadTool(cell.type)) {
        engine.clearVegetationNear(wp.x, wp.z, 2.5);
        cell.mesh = citySim._createSingleTileRoadMesh(cell, wp.x, gy, wp.z);
        citySim.rootGroup.add(cell.mesh);
      } else if (cell.type === "alun_plaza") {
        cell.mesh = citySim._createAlunPlazaMesh(wp.x, gy, wp.z);
        citySim.rootGroup.add(cell.mesh);
      } else if (citySim.isServiceTool(cell.type)) {
        engine.clearVegetationNear(wp.x, wp.z, 2.8);
        cell.mesh = citySim._createServiceBuildingMesh(cell.type, item.gx, item.gz, wp.x, gy, wp.z);
        citySim.rootGroup.add(cell.mesh);
      }

      if (cell.zone && !item.building) {
        citySim._updateZoneOverlay(cell, wp.x, gy, wp.z);
      }

      if (item.building) {
        engine.clearVegetationNear(wp.x, wp.z, 2.3);
        const built = citySim._createZoneBuildingMesh(
          item.gx,
          item.gz,
          item.building.zone,
          item.building.level,
          wp.x,
          gy,
          wp.z
        );
        citySim.rootGroup.add(built.mesh);
        const bObj = {
          zone: item.building.zone,
          level: item.building.level,
          stage: "done",
          mesh: built.mesh,
          isCafe: built.isCafe,
          isTerraced: built.isTerraced,
          pop: 18,
          needs: {},
          upgradeBlockedReason: ""
        };
        cell.building = bObj;
        citySim.buildings.push(bObj);
      }
    });

    citySim._recalculateNetworks();

    document.getElementById("saveload-modal").classList.add("hidden");
    document.getElementById("pause-modal").classList.add("hidden");
    enterActiveGameplay(false);
    showToast(`Berhasil memuat kota ${reg.name}!`);
  }

  function deleteSaveSlot(slotKey) {
    const all = loadAllSaveSlots();
    delete all[slotKey];
    writeAllSaveSlots(all);
    renderSaveSlotsModal();
    showToast("Slot penyimpanan dihapus.");
  }

  function renderSaveSlotsModal() {
    const list = document.getElementById("save-slots-list");
    const all = loadAllSaveSlots();
    const slots = [
      { key: "autosave", title: "⏱️ AUTO-SAVE (Otomatis tiap 3 Menit)", isAuto: true },
      { key: "slot_1", title: "💾 SLOT SIMPAN 1", isAuto: false },
      { key: "slot_2", title: "💾 SLOT SIMPAN 2", isAuto: false },
      { key: "slot_3", title: "💾 SLOT SIMPAN 3", isAuto: false },
      { key: "slot_4", title: "💾 SLOT SIMPAN 4", isAuto: false }
    ];

    list.innerHTML = "";
    slots.forEach((s) => {
      const data = all[s.key];
      const card = document.createElement("div");
      card.className = "save-slot-card";

      const modeBadge = data
        ? data.modeKey === "sandbox"
          ? "Sandbox (∞)"
          : `Real • ${DIFFICULTY_CONFIG[data.difficultyKey]?.label || "Medium"}`
        : "";

      card.innerHTML = `
        <div class="slot-meta">
          <h4>${s.title}</h4>
          ${
            data
              ? `<p><strong>${data.regionName}</strong> • ${data.levelLabel || "Lv.1 Desa"} • 👥 ${Number(data.population).toLocaleString("id-ID")} • ${modeBadge} (${data.savedAt})</p>`
              : `<p>Slot kosong — belum ada kota tersimpan</p>`
          }
        </div>
        <div class="slot-actions">
          ${state.inGame && !s.isAuto ? `<button class="slot-btn slot-save" data-act="save" data-slot="${s.key}">Simpan</button>` : ""}
          ${data ? `<button class="slot-btn slot-load" data-act="load" data-slot="${s.key}">▶ Lanjutkan</button>` : ""}
          ${data ? `<button class="slot-btn slot-del" data-act="del" data-slot="${s.key}">🗑️</button>` : ""}
        </div>
      `;
      list.appendChild(card);
    });

    list.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.act;
        const slot = btn.dataset.slot;
        if (act === "save") saveToSlot(slot, false);
        if (act === "load") loadFromSlot(slot);
        if (act === "del") deleteSaveSlot(slot);
      });
    });
  }

  // =========================================================
  // 4. ALUR MENU UTAMA -> MODE -> KESULITAN -> PETA -> GAME
  // =========================================================
  function showMainMenu() {
    state.inGame = false;
    clearActiveTool();
    hideAllScreens();
    document.getElementById("main-menu-screen").classList.remove("hidden");
  }

  function showModeSelect() {
    hideAllScreens();
    document.getElementById("mode-select-screen").classList.remove("hidden");
  }

  function showDifficultySelect() {
    hideAllScreens();
    document.getElementById("difficulty-select-screen").classList.remove("hidden");
  }

  function showMapSelect() {
    hideAllScreens();
    const badge = document.getElementById("map-mode-badge");
    if (state.modeKey === "sandbox") {
      badge.textContent = "Mode: 🏖️ Sandbox (Dana ∞)";
    } else {
      const diff = DIFFICULTY_CONFIG[state.difficultyKey];
      badge.textContent = `Mode: 🏛️ Real Mode • ${diff.label}`;
    }
    document.getElementById("map-select-screen").classList.remove("hidden");
    update3DMapPreview(state.region);
  }

  function enterActiveGameplay(isFreshNewCity = true) {
    state.inGame = true;
    hideAllScreens();
    document.getElementById("hud-layer").classList.remove("hidden");

    if (isFreshNewCity) {
      state.money = state.modeKey === "sandbox" ? Infinity : DIFFICULTY_CONFIG[state.difficultyKey].startMoney;
      state.population = 0;
      state.happiness = 82;
      state.hour = 7.5;

      ensureMainEngine();
      clearActiveTool();
      engine.loadRegion(state.region);
      citySim.resetCity(state.region);
      resetChatWelcome();
      showToast(`Selamat menjabat di ${state.region.name}! Populasi mulai dari 0 jiwa.`);
    }

    engine.updateAtmosphere(state.hour);
    updateHUD();
  }

  function initScreensAndFlows() {
    document.getElementById("btn-menu-play").addEventListener("click", showModeSelect);
    document.getElementById("btn-menu-saveload").addEventListener("click", () => {
      renderSaveSlotsModal();
      document.getElementById("saveload-modal").classList.remove("hidden");
    });
    document.getElementById("btn-menu-settings").addEventListener("click", () => {
      document.getElementById("settings-modal").classList.remove("hidden");
    });
    document.getElementById("btn-menu-exit").addEventListener("click", () => {
      document.getElementById("exit-modal").classList.remove("hidden");
    });

    document.getElementById("btn-back-to-menu").addEventListener("click", showMainMenu);
    document.getElementById("btn-choose-sandbox").addEventListener("click", () => {
      state.modeKey = "sandbox";
      showMapSelect();
    });
    document.getElementById("btn-choose-real").addEventListener("click", () => {
      state.modeKey = "real";
      showDifficultySelect();
    });

    document.getElementById("btn-back-to-mode").addEventListener("click", showModeSelect);
    document.querySelectorAll(".diff-card").forEach((card) => {
      card.addEventListener("click", () => {
        state.difficultyKey = card.dataset.diff;
        showMapSelect();
      });
    });

    const grid = document.getElementById("region-grid");
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

        document.getElementById("preview-reg-name").textContent = reg.name;
        document.getElementById("preview-reg-temp").textContent = `${reg.baseTemp}°C`;
        document.getElementById("preview-reg-biome").textContent = `${reg.biomeLabel} • ${reg.weatherLabel}`;
        document.getElementById("preview-reg-desc").textContent = reg.desc;
        update3DMapPreview(reg);
      });
      grid.appendChild(card);
    });

    document.getElementById("btn-back-from-map").addEventListener("click", () => {
      if (state.modeKey === "real") showDifficultySelect();
      else showModeSelect();
    });

    document.getElementById("btn-start-city").addEventListener("click", () => enterActiveGameplay(true));

    document.getElementById("btn-close-saveload").addEventListener("click", () => {
      document.getElementById("saveload-modal").classList.add("hidden");
    });
    document.getElementById("btn-close-settings").addEventListener("click", () => {
      document.getElementById("settings-modal").classList.add("hidden");
    });

    document.getElementById("set-graphics-quality").addEventListener("change", (e) => {
      state.settings.quality = e.target.value;
      applyGraphicsSettings();
    });

    document.getElementById("set-zoom-speed").addEventListener("change", (e) => {
      state.settings.zoomSpeed = Number(e.target.value);
      if (engine) engine.setZoomSpeed(state.settings.zoomSpeed);
    });

    document.getElementById("set-show-grid").addEventListener("change", (e) => {
      state.settings.showGrid = e.target.checked;
      if (engine && !state.settings.showGrid) engine.setGridVisible(false);
    });

    document.getElementById("btn-replay-intro").addEventListener("click", () => {
      document.getElementById("settings-modal").classList.add("hidden");
      hideAllScreens();
      playIntroCinematic(() => {
        if (state.inGame) document.getElementById("hud-layer").classList.remove("hidden");
        else showMainMenu();
      });
    });

    document.getElementById("btn-game-menu").addEventListener("click", () => {
      document.getElementById("pause-modal").classList.remove("hidden");
    });
    document.getElementById("btn-close-pause").addEventListener("click", () => {
      document.getElementById("pause-modal").classList.add("hidden");
    });
    document.getElementById("btn-pause-resume").addEventListener("click", () => {
      document.getElementById("pause-modal").classList.add("hidden");
    });
    document.getElementById("btn-pause-save").addEventListener("click", () => {
      document.getElementById("pause-modal").classList.add("hidden");
      renderSaveSlotsModal();
      document.getElementById("saveload-modal").classList.remove("hidden");
    });
    document.getElementById("btn-pause-load").addEventListener("click", () => {
      document.getElementById("pause-modal").classList.add("hidden");
      renderSaveSlotsModal();
      document.getElementById("saveload-modal").classList.remove("hidden");
    });
    document.getElementById("btn-pause-settings").addEventListener("click", () => {
      document.getElementById("pause-modal").classList.add("hidden");
      document.getElementById("settings-modal").classList.remove("hidden");
    });
    document.getElementById("btn-pause-mainmenu").addEventListener("click", () => {
      saveToSlot("autosave", true);
      document.getElementById("pause-modal").classList.add("hidden");
      showMainMenu();
      showToast("Progres disimpan otomatis ke Auto-Save.");
    });

    document.getElementById("btn-close-exit").addEventListener("click", () => {
      document.getElementById("exit-modal").classList.add("hidden");
    });
    document.getElementById("btn-cancel-exit").addEventListener("click", () => {
      document.getElementById("exit-modal").classList.add("hidden");
    });
    document.getElementById("btn-confirm-exit").addEventListener("click", () => {
      document.getElementById("exit-modal").classList.add("hidden");
      showToast("Silakan tutup jendela aplikasi untuk keluar sepenuhnya.");
    });

    document.getElementById("btn-close-inspect").addEventListener("click", () => {
      showInspectCard(null);
    });
  }

  // =========================================================
  // 5. KONTROL HUD, MENU JALAN TERPISAH & CHAT AI
  // =========================================================
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

    rotBtn.classList.add("hidden");
    curveBtn.classList.toggle("hidden", !(citySim && citySim.isRoadTool(bp.toolId) && bp.shape === "curved"));
    bar.classList.remove("hidden");
  }

  function updateLensAndRoadBars(toolId) {
    const lensBanner = document.getElementById("lens-banner");
    const roadOptsBar = document.getElementById("road-options-bar");
    if (!citySim) return;

    const lensLabels = {
      pln: "⚡ Lensa Listrik PLN: Biru = Teraliri Listrik • Merah = Butuh PLN",
      pdam: "💧 Lensa Air PDAM: Biru = Teraliri Air • Merah = Butuh PDAM",
      worship: "🕌 Lensa Tempat Ibadah: Biru = Terjangkau • Merah = Butuh Masjid/Ibadah",
      school: "🏫 Lensa Pendidikan: Biru = Terjangkau Sekolah • Merah = Butuh Sekolah",
      health: "🏥 Lensa Kesehatan: Biru = Terjangkau RSUD • Merah = Butuh Puskesmas/RSUD",
      safety: "🚓 Lensa Keamanan: Biru = Terjangkau Polsek • Merah = Butuh Polsek/Damkar",
      park: "🌳 Lensa Taman Kota: Biru = Terjangkau • Merah = Butuh Taman"
    };

    if (toolId && lensLabels[toolId]) {
      citySim.setSmartLens(toolId);
      lensBanner.textContent = lensLabels[toolId];
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

  function updateHUD() {
    const reg = state.region;
    const isNight = state.hour < 5.5 || state.hour > 18.5;
    const liveTemp = isNight ? reg.baseTemp - 3 : reg.baseTemp + (state.hour > 11 && state.hour < 15 ? 2 : 0);

    if (citySim) {
      state.population = citySim.stats.completedResPop;
      const penalty = citySim.stats.unpoweredCount * 3 + citySim.stats.unwateredCount * 3;
      const bonus = Math.min(15, citySim.stats.cBuildings + citySim.stats.worshipCount * 3 + citySim.stats.parkCount * 2);
      state.happiness = Math.max(25, Math.min(98, 80 + bonus - penalty));

      document.getElementById("bar-r").style.height = `${citySim.demand.R}%`;
      document.getElementById("bar-c").style.height = `${citySim.demand.C}%`;
      document.getElementById("bar-i").style.height = `${citySim.demand.I}%`;
    }

    document.getElementById("hud-city-name").textContent = `📍 ${reg.name}`;
    document.getElementById("hud-level-badge").textContent = getRegionLevelLabel(state.population);
    document.getElementById("hud-weather").textContent = `${liveTemp}°C`;
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
        showInspectCard(null);
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
              showToast("Studio Arsitek Kustom & Perda hadir di Update Tahap 3!");
              return;
            }
            if (state.activeSubTool === item.id) {
              clearActiveTool();
              showToast("Mode kamera bebas & inspeksi aktif.");
            } else {
              clearActiveTool();
              sb.classList.add("active");
              state.activeSubTool = item.id;
              if (engine) {
                engine.activeTool = item.id;
                const isSculpt = ["raise", "lower", "flatten", "tree"].includes(item.id);
                engine.setGridVisible(!isSculpt && state.settings.showGrid);
              }
              updateLensAndRoadBars(item.id);
              showToast(`Alat aktif: ${item.label}`);
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
      updateBlueprintUI(citySim.toggleCurveDirection());
    });

    document.getElementById("btn-bp-rotate").addEventListener("click", () => {
      if (!citySim) return;
      updateBlueprintUI(citySim.rotateBlueprint());
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
  }

  function resetChatWelcome() {
    const box = document.getElementById("chat-messages");
    box.innerHTML = "";
    appendChatMsg(
      "ai",
      `Selamat menjabat di <strong>${state.region.name}</strong> (${getRegionLevelLabel(state.population)})!<br>Mulai dari menu <strong>🛣️ Jalan</strong> (Jalan 4 Lajur selebar 2 petak), tarik zona di <strong>🗺️ Zona &amp; Lahan</strong>, lalu penuhi kebutuhan warga ala <em>TheoTown</em> di <strong>🏛️ Layanan</strong>.`
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
    const s = citySim ? citySim.stats : null;
    if (s && (q.includes("kebutuhan") || q.includes("cek"))) {
      return `<strong>Laporan Kebutuhan Warga (${getRegionLevelLabel(state.population)}):</strong><br>• Populasi: ${state.population.toLocaleString("id-ID")} jiwa<br>• PLN: ${s.plnCount} | PDAM: ${s.pdamCount} | Ibadah: ${s.worshipCount}<br>• Sekolah: ${s.schoolCount} | RSUD: ${s.healthCount} | Polsek: ${s.safetyCount}<br><em>Ketuk rumah/gedung mana saja saat mode bangun nonaktif untuk melihat status lengkapnya!</em>`;
    }
    if (q.includes("level")) {
      return `<strong>Jenjang Level Wilayah:</strong><br>• Lv.1 Desa Rintisan: 0–999 jiwa<br>• Lv.2 Kota Kecil: 1.000–4.999 jiwa (butuh PLN, PDAM, Ibadah)<br>• Lv.3 Kota Madya: 5.000–19.999 jiwa (butuh Sekolah, RSUD, Polsek)<br>• Lv.4 Metropolitan: 20.000–74.999 jiwa<br>• Lv.5 Megapolitan: 75.000+ jiwa`;
    }
    return `Pilih <strong>🛣️ Jalan</strong> untuk menarik jalan raya (Jalan 4 Lajur otomatis selebar 2 petak sejajar tol), lalu bangun hunian &amp; layanan publik agar kota naik level.`;
  }

  function initChat() {
    const drawer = document.getElementById("ai-chat-drawer");
    document.getElementById("btn-open-chat").addEventListener("click", () => drawer.classList.remove("closed"));
    document.getElementById("btn-close-chat").addEventListener("click", () => drawer.classList.add("closed"));

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

  // =========================================================
  // 6. MAIN RENDER & SIMULATION LOOP
  // =========================================================
  function startLoop() {
    let lastTime = performance.now();
    let hudTimer = 0;
    let taxTimer = 0;
    let autoSaveTimer = 0;

    function tick(now) {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!state.inGame && engine) {
        engine.camThetaGoal += delta * 0.08;
      }

      if (!document.getElementById("map-select-screen").classList.contains("hidden") && previewRenderer && previewMesh) {
        previewMesh.rotation.y += delta * 0.45;
        previewRenderer.render(previewScene, previewCamera);
      }

      if (state.inGame && state.speed > 0) {
        state.hour = (state.hour + delta * 0.025 * state.speed) % 24;
        if (engine) engine.updateAtmosphere(state.hour);
        if (citySim) citySim.stepSimulation(delta, state.speed);

        taxTimer += delta * state.speed;
        if (taxTimer >= 12 && citySim && state.money !== Infinity) {
          taxTimer = 0;
          const s = citySim.stats;
          const mult = DIFFICULTY_CONFIG[state.difficultyKey]?.upkeepMult || 1.0;
          const taxIncome = s.rBuildings * 0.28 + s.cBuildings * 0.5 + s.iBuildings * 0.6;
          const upkeep =
            (s.roads * 0.015 +
              s.plnCount * 0.32 +
              s.pdamCount * 0.25 +
              (s.worshipCount + s.schoolCount + s.healthCount + s.safetyCount) * 0.22) *
            mult;
          state.money = Math.max(0, state.money + taxIncome - upkeep);
        }

        autoSaveTimer += delta;
        if (autoSaveTimer >= 180) {
          autoSaveTimer = 0;
          saveToSlot("autosave", true);
        }
      }

      hudTimer += delta;
      if (state.inGame && hudTimer >= 0.4) {
        hudTimer = 0;
        updateHUD();
      }

      if (engine) engine.render(delta);
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function bootApp() {
    document.addEventListener("contextmenu", (e) => {
      if (!["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
        e.preventDefault();
      }
    });

    ensureMainEngine();
    initScreensAndFlows();
    initDock();
    initChat();
    startLoop();

    playIntroCinematic(() => {
      showMainMenu();
    });
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", bootApp);
  } else {
    bootApp();
  }
})();
