(function () {
  window.INDONESIA_REGIONS = [
    {
      id: "malang",
      name: "Malang Raya",
      baseTemp: 18,
      biomeLabel: "Lembah & Cincin Gunung Berapi",
      weatherLabel: "Kabut Sejuk",
      fogColor: 0xbae6fd,
      waterLevel: -0.25,
      highway: { x: 0, label: "Tol Pandaan–Malang" },
      desc: "Lembah luas dibelah Sungai Brantas; Tol Pandaan–Malang masuk dari Timur Laut di kaki Arjuno–Bromo."
    },
    {
      id: "bandung",
      name: "Cekungan Bandung",
      baseTemp: 19,
      biomeLabel: "Dataran Tinggi Parahyangan",
      weatherLabel: "Sejuk Berawan",
      fogColor: 0xcbd5e1,
      waterLevel: -0.2,
      highway: { x: -16, label: "Tol Padaleunyi" },
      desc: "Cekungan luas di Utara Sungai Citarum; Tol Padaleunyi masuk dari koridor dataran tinggi Barat."
    },
    {
      id: "jakarta",
      name: "DKI Jakarta",
      baseTemp: 33,
      biomeLabel: "Pesisir Teluk & Delta",
      weatherLabel: "Panas Terik",
      fogColor: 0x93c5fd,
      waterLevel: 0.1,
      highway: { x: 18, label: "Tol Jagorawi / Cikampek" },
      desc: "Teluk Jakarta di Utara, Sungai Ciliwung di tengah, akses Tol Jagorawi/Cikampek di daratan Tenggara."
    },
    {
      id: "surabaya",
      name: "Kota Surabaya",
      baseTemp: 34,
      biomeLabel: "Pesisir Selat Madura & Muara",
      weatherLabel: "Panas Pesisir",
      fogColor: 0x7dd3fc,
      waterLevel: 0.08,
      highway: { x: -12, label: "Tol Surabaya–Gempol" },
      desc: "Dataran rendah muara Kalimas yang menghadap Selat Madura di sisi Timur dan Utara."
    },
    {
      id: "ikn",
      name: "IKN Nusantara",
      baseTemp: 30,
      biomeLabel: "Perbukitan Hutan Tropis Kalimantan",
      weatherLabel: "Lembap Tropis",
      fogColor: 0xa7f3d0,
      waterLevel: -0.15,
      highway: { x: 8, label: "Tol Balikpapan–IKN" },
      desc: "Perbukitan hijau bergelombang di tepi Teluk Balikpapan dengan lembah sungai tropis."
    },
    {
      id: "bali",
      name: "Denpasar & Kuta",
      baseTemp: 31,
      biomeLabel: "Pesisir Selatan & Terasering",
      weatherLabel: "Cerah Tropis",
      fogColor: 0x7dd3fc,
      waterLevel: 0.05,
      highway: { x: 10, label: "Tol Bali Mandara" },
      desc: "Pantai pasir keemasan di sisi Selatan dan perbukitan terasering hijau di bagian Utara."
    },
    {
      id: "yogyakarta",
      name: "Yogyakarta",
      baseTemp: 29,
      biomeLabel: "Lereng Merapi hingga Pesisir",
      weatherLabel: "Cerah Berawan",
      fogColor: 0xbae6fd,
      waterLevel: -0.2,
      highway: { x: -8, label: "Jalur Lintas Selatan" },
      desc: "Puncak Gunung Merapi menjulang di Utara mengalirkan sungai membelah dataran subur menuju Selatan."
    }
  ];

  window.generateRegionHeight = function (region, wx, wz, halfExtent) {
    const id = region ? region.id : "malang";
    const nx = wx / halfExtent;
    const nz = wz / halfExtent;
    const radial = Math.hypot(nx, nz);

    let h = 2.0;

    if (id === "malang" || id === "bandung") {
      // Lembah tengah datar dengan cincin pegunungan di tepi
      const rim = Math.max(0, radial - 0.56) * 2.35;
      const peaks =
        Math.pow(rim, 1.85) * 22 +
        Math.sin(wx * 0.045) * Math.cos(wz * 0.045) * 1.4;
      const riverCurve = Math.sin(wz * 0.025) * 18 - 22;
      const distRiver = Math.abs(wx - riverCurve);
      const riverCut = distRiver < 8 ? (1 - distRiver / 8) * 3.8 : 0;
      h = 1.8 + peaks - riverCut;
    } else if (id === "jakarta" || id === "surabaya") {
      // Pesisir utara/timur laut dengan daratan datar luas
      const seaSlope = nz < -0.58 ? (nz + 0.58) * 14 : 0;
      const gentle = Math.sin(wx * 0.03) * Math.cos(wz * 0.03) * 0.65;
      const riverCurve = Math.sin(wz * 0.03) * 10 + 4;
      const distRiver = Math.abs(wx - riverCurve);
      const riverCut = distRiver < 6 ? (1 - distRiver / 6) * 2.8 : 0;
      h = 1.6 + seaSlope + gentle - riverCut;
    } else if (id === "bali") {
      // Pantai di selatan (nz > 0.58) dan bukit di utara
      const seaSlope = nz > 0.58 ? -(nz - 0.58) * 14 : 0;
      const northHills = nz < -0.25 ? Math.pow(-nz - 0.25, 1.5) * 16 : 0;
      h = 1.7 + seaSlope + northHills + Math.sin(wx * 0.05) * 0.9;
    } else if (id === "yogyakarta") {
      // Gunung Merapi besar di Utara (nz < -0.45)
      const distMerapi = Math.hypot(nx, nz + 0.78);
      const merapi = distMerapi < 0.48 ? Math.pow(1 - distMerapi / 0.48, 1.7) * 28 : 0;
      const seaSlope = nz > 0.72 ? -(nz - 0.72) * 15 : 0;
      h = 1.7 + merapi + seaSlope + Math.sin(wx * 0.04) * 0.8;
    } else {
      // IKN Nusantara: perbukitan tropis bergelombang + teluk barat daya
      const hills =
        (Math.sin(wx * 0.038) * Math.cos(wz * 0.034) + 1) * 3.4 +
        Math.sin(wx * 0.08 + wz * 0.06) * 1.1;
      const bay = nx < -0.62 && nz > 0.35 ? -4.2 : 0;
      h = 1.5 + hills + bay;
    }

    // Ratakan koridor akses jalan tol utama agar jalan tol masuk rapi tanpa menembus gunung
    const hwX = region && region.highway ? region.highway.x : 0;
    const distHw = Math.abs(wx - hwX);
    if (distHw < 14) {
      const blend = Math.max(0, Math.min(1, (distHw - 6) / 8));
      const smoothBlend = blend * blend * (3 - 2 * blend);
      h = 1.65 * (1 - smoothBlend) + h * smoothBlend;
    }

    return h;
  };
})();
