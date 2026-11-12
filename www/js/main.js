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

  const SUB_MENUS = {
    tata_kota: [
      { id: "raise", label: "🏔️ Naikkan Gunung" },
      { id: "lower", label: "🌊 Gali Sungai" },
      { id: "flatten", label: "📐 Ratakan Tanah" },
      { id: "tree", label: "🌲 Tanam Pinus" },
      { id: "road_stage2", label: "🛣️ Jalan & Zona RCI (Tahap 2)" }
    ],
    layanan: [
      { id: "info_layanan", label: "🏛️ Balai Kota, PLN/PDAM, SD–Univ & RSUD (Siap di Tahap 2–3)" }
    ],
    perda: [
      { id: "info_perda", label: "📜 APBD, Pajak Hiburan Malam & Perda Ritel (Siap di Tahap 3)" }
    ],
    gebrakan: [
      { id: "info_gebrakan", label: "🚀 Kuas Distrik, Voting Warga & AI Auto-Blueprint (Siap di Tahap 4)" }
    ],
    buldoser: [
      { id: "bulldoze", label: "🪓 Aktifkan Buldoser (Usap Tanah untuk Hapus Pohon/Objek)" }
    ]
  };

  function showToast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => el.classList.add("hidden"), 2600);
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
      state.hour = 7.25;
      state.terrainEdits = 0;
      state.treesPlanted = 0;

      document.getElementById("launcher-screen").classList.add("hidden");
      document.getElementById("hud-layer").classList.remove("hidden");

      if (!engine) {
        engine = new NusantaraGraphicsHD(document.getElementById("game-canvas"), (action) => {
          if (action === "tree") state.treesPlanted++;
          else state.terrainEdits++;
        });
        startLoop();
      }

      engine.loadRegion(state.region);
      engine.updateAtmosphere(state.hour);
      updateHUD();
      resetChatWelcome();
      showToast(`Selamat menjabat di ${state.region.name} (${modeCfg.label})!`);
    });
  }

  function updateHUD() {
    const reg = state.region;
    const isNight = state.hour < 5.5 || state.hour > 18.5;
    const liveTemp = isNight ? reg.baseTemp - 3 : reg.baseTemp + (state.hour > 11 && state.hour < 15 ? 2 : 0);

    document.getElementById("hud-city-name").textContent = `📍 ${reg.name}`;
    document.getElementById("hud-weather").textContent = `${liveTemp}°C ${isNight ? "Malam Sejuk" : reg.weatherLabel}`;
    document.getElementById("hud-happiness").textContent = `😊 ${state.happiness}%`;

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
            if (item.id.startsWith("info_") || item.id === "road_stage2") {
              showToast("Fitur ini akan diaktifkan penuh pada Tahap 2–4 berikutnya!");
              return;
            }
            if (state.activeSubTool === item.id) {
              state.activeSubTool = null;
              if (engine) engine.activeTool = null;
              sb.classList.remove("active");
              showToast("Mode kamera bebas aktif (1 jari geser, 2 jari zoom/putar).");
            } else {
              document.querySelectorAll(".sub-btn").forEach((x) => x.classList.remove("active"));
              sb.classList.add("active");
              state.activeSubTool = item.id;
              if (engine) engine.activeTool = item.id;
              showToast(`Alat aktif: ${item.label}. Usap layar untuk membentuk medan!`);
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
      `Halo Kepala Daerah! Selamat datang di <strong>${state.region.name}</strong> (${state.region.biomeLabel}, suhu dasar ${state.region.baseTemp}°C).<br><br>Saat ini kita berada di <strong>Tahap 1 (Pondasi Geografis & Grafik 3D HD)</strong>. Anda sudah bisa mengetes pahat gunung, menggali sungai, menanam hutan pinus, serta memantau siklus siang–malam. Ketik pertanyaan apa saja kapan pun!`
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
    const modeLabel = window.GAME_MODES[state.modeKey].label;

    if (q.includes("progress") || q.includes("cek") || q.includes("kondisi")) {
      return `<strong>Laporan Pemindaian Real-Time (${reg.name}):</strong><br>• <strong>Mode:</strong> ${modeLabel}<br>• <strong>Cuaca & Suhu:</strong> ${reg.weatherLabel} (${reg.baseTemp}°C)<br>• <strong>Aktivitas Topografi:</strong> ${state.terrainEdits} kali pahat tanah & ${state.treesPlanted} pohon pinus baru ditanam.<br>• <strong>Status Infrastruktur:</strong> Gerbang Tol Arteri sudah berdiri di sisi selatan sebagai titik masuk utama kota.`;
    }

    if (q.includes("gunung") || q.includes("sungai") || q.includes("pahat")) {
      return `Untuk memahat gunung atau sungai:<br>1. Ketuk tombol <strong>🛣️ Tata Kota</strong> di bawah.<br>2. Pilih <strong>🏔️ Naikkan Gunung</strong>, <strong>🌊 Gali Sungai</strong>, atau <strong>📐 Ratakan Tanah</strong>.<br>3. Usap jari langsung di atas daratan 3D. Untuk memutar atau menggeser kamera lagi, ketuk ulang tombol alat yang aktif agar nonaktif.`;
    }

    if (q.includes("abis ini") || q.includes("selanjutnya") || q.includes("gimana")) {
      return `<strong>Saran Staf Ahli:</strong><br>1. Bentuk dulu kontur pegunungan, lembah, dan aliran sungai di <strong>${reg.name}</strong> sesuai selera Anda menggunakan menu <em>Tata Kota</em>.<br>2. Pastikan area sekitar Gerbang Tol memiliki lahan datar yang cukup luas untuk jalan protokol.<br>3. Setelah puas dengan kontur alamnya, lanjutkan ke <strong>Tahap 2</strong> untuk mengaktifkan jaringan jalan raya, listrik PLN, air PDAM, dan zonasi RCI otomatis!`;
    }

    return `Saya mencatat pertanyaan Anda terkait <strong>${reg.name}</strong>. Saat ini gerbang tol masuk kota sudah siap dan kontur ${reg.biomeLabel} telah terbentuk. Gunakan kuas di menu <strong>🛣️ Tata Kota</strong> untuk menyesuaikan gunung atau sungai sebelum kita membangun jaringan jalan & zona RCI di tahap berikutnya.`;
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

    function tick(now) {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (state.speed > 0) {
        state.hour = (state.hour + delta * 0.18 * state.speed) % 24;
        if (engine) engine.updateAtmosphere(state.hour);
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

  window.addEventListener("DOMContentLoaded", () => {
    initLauncher();
    initDock();
    initChat();
  });
})();
