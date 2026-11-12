window.INDONESIA_REGIONS = [
  {
    id: "malang",
    name: "Malang Raya",
    biomeLabel: "Lembah & Cincin Gunung Berapi",
    baseTemp: 18,
    weatherLabel: "Kabut Sejuk",
    terrainType: "malang_real",
    fogDensity: 0.0036,
    fogColor: 0xc2d9ec,
    desc: "Lembah luas dibelah Sungai Brantas; Gn. Arjuno di Utara, Bromo–Semeru di Timur, Kawi & Batu di Barat."
  },
  {
    id: "bandung",
    name: "Cekungan Bandung",
    biomeLabel: "Dataran Tinggi Parahyangan",
    baseTemp: 19,
    weatherLabel: "Sejuk Berawan",
    terrainType: "bandung_real",
    fogDensity: 0.0035,
    fogColor: 0xc8deef,
    desc: "Cekungan luas dikelilingi Gn. Tangkuban Perahu di Utara, Ciwidey di Selatan & Sungai Citarum."
  },
  {
    id: "jakarta",
    name: "DKI Jakarta",
    biomeLabel: "Pesisir Teluk & Delta",
    baseTemp: 33,
    weatherLabel: "Panas Terik",
    terrainType: "jakarta_real",
    fogDensity: 0.0022,
    fogColor: 0xdbeafe,
    desc: "Laut Jawa & Teluk Jakarta di Utara, dataran rendah luas Sungai Ciliwung hingga perbukitan Selatan."
  },
  {
    id: "surabaya",
    name: "Kota Surabaya",
    biomeLabel: "Pesisir Selat Madura",
    baseTemp: 34,
    weatherLabel: "Cerah Terik",
    terrainType: "surabaya_real",
    fogDensity: 0.002,
    fogColor: 0xe0f2fe,
    desc: "Selat Madura di Utara & Timur, muara Kalimas–Brantas serta dataran luas di Barat & Selatan."
  },
  {
    id: "yogyakarta",
    name: "DI Yogyakarta",
    biomeLabel: "Lereng Merapi – Pantai Selatan",
    baseTemp: 27,
    weatherLabel: "Hangat Tropis",
    terrainType: "yogya_real",
    fogDensity: 0.0028,
    fogColor: 0xfef3c7,
    desc: "Kerucut megah Gn. Merapi di Utara melandai sepanjang Kali Code menuju pantai pasir Parangtritis di Selatan."
  },
  {
    id: "ikn",
    name: "IKN Nusantara",
    biomeLabel: "Teluk & Perbukitan Hutan",
    baseTemp: 28,
    weatherLabel: "Lembap Tropis",
    terrainType: "ikn_real",
    fogDensity: 0.0032,
    fogColor: 0xd1fae5,
    desc: "Teluk Balikpapan di Tenggara dengan perbukitan hijau Sepaku dan sungai tropis lebar."
  },
  {
    id: "bali",
    name: "Denpasar & Badung",
    biomeLabel: "Teluk Pulau & Gn. Agung",
    baseTemp: 29,
    weatherLabel: "Angin Laut Cerah",
    terrainType: "bali_real",
    fogDensity: 0.0024,
    fogColor: 0xe0f2fe,
    desc: "Pegunungan Gn. Agung di Utara, dataran tengah subur, teluk Kuta–Sanur & tebing kapur Uluwatu di Selatan."
  },
  {
    id: "makassar",
    name: "Kota Makassar",
    biomeLabel: "Pesisir Barat & Karst Timur",
    baseTemp: 31,
    weatherLabel: "Cerah Berangin",
    terrainType: "makassar_real",
    fogDensity: 0.0022,
    fogColor: 0xe0f2fe,
    desc: "Pesisir Pantai Losari di Barat menghadap Selat Makassar dengan pegunungan kapur Maros–Gowa di Timur."
  }
];

window.GAME_MODES = {
  sandbox: { label: "Sandbox Mode", startMoney: Infinity, isSandbox: true },
  easy: { label: "Real: Easy", startMoney: 500, isSandbox: false },
  medium: { label: "Real: Medium", startMoney: 150, isSandbox: false },
  hard: { label: "Real: Hard", startMoney: 50, isSandbox: false }
};

function gaussianPeak(nx, nz, px, pz, radiusX, radiusZ, height) {
  const dx = (nx - px) / radiusX;
  const dz = (nz - pz) / radiusZ;
  return height * Math.exp(-(dx * dx + dz * dz));
}

function ridgeNoise(x, z) {
  const n1 = Math.sin(x * 0.045) * Math.cos(z * 0.045);
  const n2 = Math.sin(x * 0.11 + z * 0.09) * 0.5;
  const n3 = Math.cos(x * 0.23 - z * 0.19) * 0.25;
  return (1 - Math.abs(n1)) * 2.2 + n2 + n3;
}

window.generateRegionHeight = function (region, x, z, halfSize) {
  const nx = x / halfSize; // -1 .. 1 (West to East)
  const nz = z / halfSize; // -1 .. 1 (North to South)
  const detail = ridgeNoise(x, z);

  if (region.terrainType === "malang_real") {
    // Lembah tengah luas (y ~ 1.7), dikelilingi gunung-gunung nyata Malang Raya:
    // 1. Gunung Arjuno - Welirang di Utara (nx ~ -0.08, nz ~ -0.78)
    const arjuno = gaussianPeak(nx, nz, -0.08, -0.78, 0.34, 0.28, 34.0);
    const welirang = gaussianPeak(nx, nz, -0.32, -0.82, 0.24, 0.22, 27.0);
    // 2. Dataran Tinggi Kota Batu & Gunung Panderman di Barat Laut - Barat
    const batuHills = gaussianPeak(nx, nz, -0.58, -0.45, 0.32, 0.34, 15.5);
    const kawi = gaussianPeak(nx, nz, -0.82, 0.05, 0.28, 0.42, 26.0);
    // 3. Pegunungan Bromo - Tengger - Semeru di Timur - Tenggara
    const bromo = gaussianPeak(nx, nz, 0.82, -0.25, 0.26, 0.36, 25.0);
    const semeru = gaussianPeak(nx, nz, 0.84, 0.48, 0.32, 0.34, 38.0);
    // 4. Perbukitan Kapur Malang Selatan
    const southHills = Math.max(0, nz - 0.72) * 18.0;

    let h = 1.75 + arjuno + welirang + batuHills + kawi + bromo + semeru + southHills;
    const mountainFactor = Math.min(1, (h - 2.0) / 14.0);
    h += detail * (0.18 + mountainFactor * 2.1);

    // Sungai Brantas berkelok dari Barat Laut (Batu) membelah pusat kota ke Selatan
    const brantasX = -14 + Math.sin(z * 0.032) * 16 + Math.cos(z * 0.07) * 5;
    const distBrantas = Math.abs(x - brantasX);
    if (distBrantas < 7.5 && nz > -0.55) {
      const t = 1 - distBrantas / 7.5;
      h -= t * t * 4.4;
    }
    return h;
  }

  if (region.terrainType === "bandung_real") {
    // Cekungan Bandung luas di tengah, Tangkuban Perahu & Lembang di Utara, Ciwidey di Selatan
    const tangkuban = gaussianPeak(nx, nz, -0.1, -0.78, 0.45, 0.26, 30.0);
    const manglayang = gaussianPeak(nx, nz, 0.55, -0.68, 0.35, 0.28, 22.0);
    const ciwidey = gaussianPeak(nx, nz, -0.45, 0.78, 0.48, 0.28, 26.0);
    const pangalengan = gaussianPeak(nx, nz, 0.45, 0.8, 0.48, 0.28, 25.0);
    const westRim = Math.max(0, -0.68 - nx) * 22.0;
    const eastRim = Math.max(0, nx - 0.72) * 20.0;

    let h = 1.75 + tangkuban + manglayang + ciwidey + pangalengan + westRim + eastRim;
    const mFactor = Math.min(1, (h - 2.0) / 12.0);
    h += detail * (0.18 + mFactor * 1.9);

    // Sungai Citarum melintas Timur ke Barat di bagian Selatan lembah
    const citarumZ = 28 + Math.sin(x * 0.035) * 14;
    const distRiver = Math.abs(z - citarumZ);
    if (distRiver < 7.0) {
      const t = 1 - distRiver / 7.0;
      h -= t * t * 4.3;
    }
    return h;
  }

  if (region.terrainType === "jakarta_real") {
    // Laut Jawa di Utara (nz < -0.52), pulau kecil Kepulauan Seribu, dataran rendah luas, bukit Bogor di Selatan
    if (nz < -0.52) {
      const island1 = gaussianPeak(nx, nz, -0.35, -0.78, 0.09, 0.08, 4.6);
      const island2 = gaussianPeak(nx, nz, 0.25, -0.84, 0.07, 0.07, 4.2);
      return -2.2 - (-0.52 - nz) * 12.0 + island1 + island2 + detail * 0.2;
    }
    const bogorHills = Math.max(0, nz - 0.58) * 24.0 + gaussianPeak(nx, nz, 0.15, 0.88, 0.45, 0.25, 16.0);
    let h = 1.65 + bogorHills + detail * 0.22;

    // Sungai Ciliwung mengalir dari Selatan ke Teluk Jakarta di Utara
    const ciliwungX = 6 + Math.sin(z * 0.038) * 14;
    const distRiver = Math.abs(x - ciliwungX);
    if (distRiver < 6.8) {
      const t = 1 - distRiver / 6.8;
      h -= t * t * 4.1;
    }
    return h;
  }

  if (region.terrainType === "surabaya_real") {
    // Selat Madura di Utara (nz < -0.58) dan Timur (nx > 0.62)
    if (nz < -0.58 || nx > 0.62) {
      const seaN = Math.max(0, -0.58 - nz);
      const seaE = Math.max(0, nx - 0.62);
      return -2.0 - (seaN + seaE) * 14.0 + detail * 0.18;
    }
    const southHills = gaussianPeak(nx, nz, -0.3, 0.85, 0.55, 0.25, 12.0);
    let h = 1.65 + southHills + detail * 0.2;

    // Sungai Kalimas & Wonokromo membelah kota menuju Selat Madura
    const kalimasX = -8 + Math.sin(z * 0.035) * 12;
    const distRiver = Math.abs(x - kalimasX);
    if (distRiver < 6.5) {
      const t = 1 - distRiver / 6.5;
      h -= t * t * 4.0;
    }
    return h;
  }

  if (region.terrainType === "yogya_real") {
    // Gunung Merapi megah di Utara, melandai ke Selatan sampai Pantai Parangtritis (nz > 0.72)
    if (nz > 0.72) {
      return -2.2 - (nz - 0.72) * 16.0 + detail * 0.15;
    }
    const merapi = gaussianPeak(nx, nz, 0.04, -0.74, 0.36, 0.28, 36.0);
    const merbabu = gaussianPeak(nx, nz, -0.32, -0.84, 0.25, 0.22, 24.0);
    const menoreh = gaussianPeak(nx, nz, -0.82, -0.15, 0.25, 0.45, 15.0);
    const gunungKidul = gaussianPeak(nx, nz, 0.78, 0.42, 0.3, 0.35, 13.0);

    let h = 1.7 + merapi + merbabu + menoreh + gunungKidul;
    const mFactor = Math.min(1, (h - 2.0) / 14.0);
    h += detail * (0.18 + mFactor * 1.8);

    // Kali Code / Opak dari lereng Merapi menuju Laut Selatan
    const codeX = -4 + Math.sin(z * 0.04) * 9;
    const distRiver = Math.abs(x - codeX);
    if (distRiver < 5.5 && nz > -0.45) {
      const t = 1 - distRiver / 5.5;
      h -= t * t * 3.8;
    }
    return h;
  }

  if (region.terrainType === "ikn_real") {
    // Teluk Balikpapan di Tenggara (nx > 0.35 && nz > 0.35), perbukitan tropis hijau bergelombang
    const bayDist = Math.hypot((nx - 0.75) * 1.1, (nz - 0.75) * 1.1);
    if (bayDist < 0.58) {
      return -2.2 - (0.58 - bayDist) * 14.0;
    }
    const hills =
      gaussianPeak(nx, nz, -0.55, -0.55, 0.42, 0.42, 13.0) +
      gaussianPeak(nx, nz, 0.45, -0.48, 0.38, 0.35, 11.5) +
      gaussianPeak(nx, nz, -0.62, 0.42, 0.35, 0.38, 12.0);
    let h = 1.85 + hills + detail * 0.85;

    const riverZ = 10 + Math.sin(x * 0.03) * 18;
    const distRiver = Math.abs(z - riverZ);
    if (distRiver < 7.2) {
      const t = 1 - distRiver / 7.2;
      h -= t * t * 4.4;
    }
    return h;
  }

  if (region.terrainType === "bali_real") {
    // Gunung Agung & Batur di Utara, teluk pantai di Barat Daya & Tenggara, bukit kapur Uluwatu di ujung Selatan
    const agung = gaussianPeak(nx, nz, 0.25, -0.76, 0.36, 0.26, 31.0);
    const batukaru = gaussianPeak(nx, nz, -0.45, -0.68, 0.35, 0.28, 22.0);
    const uluwatu = gaussianPeak(nx, nz, -0.1, 0.88, 0.26, 0.14, 9.5);

    const westBay = Math.hypot((nx + 0.75) * 1.1, (nz - 0.45) * 0.95);
    const eastBay = Math.hypot((nx - 0.78) * 1.1, (nz - 0.38) * 0.95);
    if (westBay < 0.56 || eastBay < 0.56) {
      const d = Math.min(westBay, eastBay);
      return -2.0 - (0.56 - d) * 14.0;
    }

    let h = 1.75 + agung + batukaru + uluwatu;
    const mFactor = Math.min(1, (h - 2.0) / 12.0);
    h += detail * (0.2 + mFactor * 1.7);
    return h;
  }

  // makassar_real: Laut Selat Makassar di Barat (nx < -0.52), pegunungan karst Maros-Gowa di Timur
  if (nx < -0.52) {
    const pulauSamalona = gaussianPeak(nx, nz, -0.78, -0.25, 0.08, 0.08, 4.4);
    return -2.1 - (-0.52 - nx) * 14.0 + pulauSamalona + detail * 0.18;
  }
  const marosKarst =
    gaussianPeak(nx, nz, 0.75, -0.45, 0.32, 0.42, 23.0) +
    gaussianPeak(nx, nz, 0.78, 0.38, 0.34, 0.42, 25.0);
  let h = 1.7 + marosKarst + detail * 0.55;

  const jeneberangZ = 22 + Math.sin(x * 0.035) * 11;
  const distRiver = Math.abs(z - jeneberangZ);
  if (distRiver < 6.5) {
    const t = 1 - distRiver / 6.5;
    h -= t * t * 4.0;
  }
  return h;
};
