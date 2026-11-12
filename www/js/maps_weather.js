window.INDONESIA_REGIONS = [
  {
    id: "malang",
    name: "Kota Malang",
    biomeLabel: "Dataran Tinggi Cekungan",
    baseTemp: 18,
    weatherLabel: "Kabut Sejuk",
    terrainType: "basin_river",
    fogDensity: 0.0085,
    fogColor: 0xb9d3e8,
    desc: "Lembah subur dikelilingi cincin gunung berapi & dibelah Sungai Brantas."
  },
  {
    id: "bandung",
    name: "Kota Bandung",
    biomeLabel: "Cekungan Parahyangan",
    baseTemp: 19,
    weatherLabel: "Sejuk Berawan",
    terrainType: "basin_river",
    fogDensity: 0.008,
    fogColor: 0xc2d8ea,
    desc: "Dataran tinggi berkontur perbukitan sejuk di utara & lembah sungai di selatan."
  },
  {
    id: "jakarta",
    name: "DKI Jakarta",
    biomeLabel: "Pesisir Metropolitan",
    baseTemp: 33,
    weatherLabel: "Panas Terik",
    terrainType: "coastal_flat",
    fogDensity: 0.004,
    fogColor: 0xdbeafe,
    desc: "Dataran rendah luas berhadapan dengan Laut Jawa dan muara sungai besar."
  },
  {
    id: "surabaya",
    name: "Kota Surabaya",
    biomeLabel: "Pesisir & Selat",
    baseTemp: 34,
    weatherLabel: "Cerah Terik",
    terrainType: "coastal_flat",
    fogDensity: 0.0038,
    fogColor: 0xe0f2fe,
    desc: "Wilayah pelabuhan strategis di tepi selat dengan jaringan kanal sungai."
  },
  {
    id: "yogyakarta",
    name: "DI Yogyakarta",
    biomeLabel: "Lereng Gunung & Pesisir",
    baseTemp: 27,
    weatherLabel: "Hangat Tropis",
    terrainType: "slope_mountain",
    fogDensity: 0.0055,
    fogColor: 0xfef3c7,
    desc: "Gunung berapi megah di sisi utara yang melandai hingga samudra selatan."
  },
  {
    id: "ikn",
    name: "IKN Nusantara",
    biomeLabel: "Hutan Hujan Perbukitan",
    baseTemp: 28,
    weatherLabel: "Lembap Tropis",
    terrainType: "tropical_hills",
    fogDensity: 0.007,
    fogColor: 0xd1fae5,
    desc: "Perbukitan hijau bergelombang di Kalimantan dengan aliran sungai lebar."
  },
  {
    id: "bali",
    name: "Denpasar & Badung",
    biomeLabel: "Teluk & Tebing Pulau",
    baseTemp: 29,
    weatherLabel: "Angin Laut Cerah",
    terrainType: "island_bay",
    fogDensity: 0.0045,
    fogColor: 0xe0f2fe,
    desc: "Garis pantai melengkung indah dengan perbukitan kapur di bagian selatan."
  },
  {
    id: "makassar",
    name: "Kota Makassar",
    biomeLabel: "Pesisir & Perbukitan",
    baseTemp: 31,
    weatherLabel: "Cerah Berangin",
    terrainType: "coastal_flat",
    fogDensity: 0.0042,
    fogColor: 0xe0f2fe,
    desc: "Kota tepi pantai dengan garis laut barat dan perbukitan di sisi timur."
  }
];

window.GAME_MODES = {
  sandbox: { label: "Sandbox Mode", startMoney: Infinity, isSandbox: true },
  easy: { label: "Real: Easy", startMoney: 500, isSandbox: false },
  medium: { label: "Real: Medium", startMoney: 150, isSandbox: false },
  hard: { label: "Real: Hard", startMoney: 50, isSandbox: false }
};

window.generateRegionHeight = function (region, x, z, halfSize) {
  const nx = x / halfSize; // -1 .. 1
  const nz = z / halfSize; // -1 .. 1
  const distCenter = Math.sqrt(nx * nx + nz * nz);

  // Gelombang alami halus
  const wave1 = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 1.4;
  const wave2 = Math.sin(x * 0.21 + z * 0.17) * 0.5;

  if (region.terrainType === "basin_river") {
    // Cekungan datar di tengah + cincin gunung tinggi di pinggir + sungai berkelok
    const ring = Math.max(0, distCenter - 0.42);
    const mountain = Math.pow(ring * 1.65, 2.3) * 18.0 + wave1 * 1.6 + wave2;
    const riverCurve = Math.sin(z * 0.09) * 12;
    const distRiver = Math.abs(x - riverCurve);
    let h = 1.6 + mountain;
    if (distRiver < 5.5) {
      const riverFactor = 1 - distRiver / 5.5;
      h -= riverFactor * 4.2;
    }
    return h;
  }

  if (region.terrainType === "coastal_flat") {
    // Laut di sisi utara (nz < -0.45), dataran rendah luas di selatan, muara sungai
    if (nz < -0.45) {
      const seaDepth = (-0.45 - nz) * 14;
      return -1.5 - seaDepth + wave2 * 0.3;
    }
    const riverCurve = Math.sin(z * 0.07) * 10 + 8;
    const distRiver = Math.abs(x - riverCurve);
    let h = 1.4 + Math.max(0, nz + 0.3) * 2.2 + wave1 * 0.4;
    if (distRiver < 4.5) {
      h -= (1 - distRiver / 4.5) * 3.6;
    }
    return h;
  }

  if (region.terrainType === "slope_mountain") {
    // Gunung besar di utara (nz < -0.35), melandai ke pantai di selatan (nz > 0.72)
    if (nz > 0.72) {
      return -1.5 - (nz - 0.72) * 15;
    }
    const northPeak = Math.max(0, -0.25 - nz);
    const peakCone = Math.exp(-(nx * nx * 5 + Math.pow(nz + 0.75, 2) * 6)) * 26;
    return 1.5 + northPeak * 12 + peakCone + wave1 + wave2;
  }

  if (region.terrainType === "island_bay") {
    // Teluk melengkung di tengah-barat, bukit di timur
    const bayDist = Math.sqrt(Math.pow(nx + 0.55, 2) + Math.pow(nz, 2));
    if (bayDist < 0.62) {
      return -1.4 - (0.62 - bayDist) * 10;
    }
    const hill = Math.max(0, nx - 0.1) * 11 + wave1 * 1.2 + wave2;
    return 1.5 + hill;
  }

  // tropical_hills (IKN / Kalimantan)
  const riverCurve = Math.sin(x * 0.06) * 14 - 6;
  const distRiver = Math.abs(z - riverCurve);
  let h = 2.4 + Math.abs(wave1) * 2.6 + wave2 * 1.2;
  if (distRiver < 6.0) {
    h -= (1 - distRiver / 6.0) * 4.8;
  }
  return h;
};
