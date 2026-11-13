class ProceduralHDTextures {
  static createAll() {
    const houseWin = this._makeWindowPair("#e2e8f0", "#fef08a", 4, 3, 0.42);
    const towerWin = this._makeWindowPair("#1e293b", "#fde68a", 8, 12, 0.46);
    return {
      grassDetail: this._makeGrassSoilTexture(),
      rockDetail: this._makeRockTexture(),
      treeLeafAlpha: this._makeBotanicalLeafAlpha("#14532d", "#22c55e", "#84cc16"),
      pineLeafAlpha: this._makePineNeedleAlpha(),
      palmFrondAlpha: this._makePalmFrondAlpha(),
      grassTuftAlpha: this._makeGrassBladeAlpha(),
      asphalt: this._makeAsphaltTexture(),
      bikeAsphalt: this._makeBikeLaneTexture(),
      pavingStone: this._makePavingTexture(),
      roofTile: this._makeRoofTileTexture(),
      wallPlaster: this._makePlasterTexture(),
      industrialMetal: this._makeCorrugatedMetalTexture(),
      windowHouse: houseWin.diffuse,
      windowHouseEmissive: houseWin.emissive,
      windowTower: towerWin.diffuse,
      windowTowerEmissive: towerWin.emissive
    };
  }

  static _makeGrassSoilTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#9db578";
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 16000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random();
      if (r < 0.42) {
        ctx.fillStyle = "rgba(63, 98, 18, 0.25)";
        ctx.fillRect(x, y, 2, 6);
      } else if (r < 0.78) {
        ctx.fillStyle = "rgba(132, 169, 76, 0.24)";
        ctx.fillRect(x, y, 2, 5);
      } else {
        ctx.fillStyle = "rgba(92, 71, 48, 0.2)";
        ctx.fillRect(x, y, 3, 3);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(42, 42);
    return tex;
  }

  static _makeRockTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#787c82";
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 9000; i++) {
      const v = 85 + Math.floor(Math.random() * 80);
      ctx.fillStyle = `rgb(${v},${v},${v + 3})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 5, 2);
    }
    ctx.strokeStyle = "rgba(25, 28, 34, 0.36)";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      const sx = Math.random() * 512;
      const sy = Math.random() * 512;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (Math.random() - 0.5) * 65, sy + (Math.random() - 0.5) * 45);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(30, 30);
    return tex;
  }

  // Tekstur Daun Organik Alpha-Cutout (Bukan Bola Poligon!)
  static _makeBotanicalLeafAlpha(darkHex, midHex, tipHex) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 256, 256);

    // Ranting kayu tipis di bagian bawah kluster
    ctx.strokeStyle = "#4a3525";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(128, 248);
    ctx.quadraticCurveTo(124, 185, 95, 135);
    ctx.moveTo(128, 225);
    ctx.quadraticCurveTo(136, 175, 165, 130);
    ctx.moveTo(128, 210);
    ctx.lineTo(128, 105);
    ctx.stroke();

    const palette = [darkHex, midHex, tipHex, "#15803d", "#4d7c0f"];
    for (let i = 0; i < 68; i++) {
      const angle = Math.random() * Math.PI * 2;
      const rad = Math.pow(Math.random(), 0.62) * 86;
      const lx = 128 + Math.cos(angle) * rad;
      const ly = 122 + Math.sin(angle) * rad * 0.88;
      const rot = angle + (Math.random() - 0.5) * 1.1;
      const len = 18 + Math.random() * 14;
      const wid = 8 + Math.random() * 6;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = palette[i % palette.length];
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.5);
      ctx.quadraticCurveTo(wid, 0, 0, len * 0.5);
      ctx.quadraticCurveTo(-wid, 0, 0, -len * 0.5);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.35);
      ctx.lineTo(0, len * 0.35);
      ctx.stroke();
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  static _makePineNeedleAlpha() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 256, 256);

    const cols = ["#064e3b", "#0f766e", "#115e59", "#15803d"];
    for (let i = 0; i < 85; i++) {
      const t = Math.random();
      const spread = 16 + t * 92;
      const lx = 128 + (Math.random() - 0.5) * spread * 2;
      const ly = 28 + t * 195;
      const rot = ((lx - 128) / 110) * 0.9 + (Math.random() - 0.5) * 0.5;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.strokeStyle = cols[i % cols.length];
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 24);
      ctx.moveTo(0, 8);
      ctx.lineTo(-9, 20);
      ctx.moveTo(0, 8);
      ctx.lineTo(9, 20);
      ctx.stroke();
      ctx.restore();
    }
    return new THREE.CanvasTexture(canvas);
  }

  static _makePalmFrondAlpha() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 256, 256);

    // Pelepah melengkung + helai daun kelapa menyirip
    ctx.strokeStyle = "#4d7c0f";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(18, 128);
    ctx.quadraticCurveTo(130, 82, 244, 156);
    ctx.stroke();

    for (let x = 32; x <= 232; x += 9) {
      const t = (x - 18) / 226;
      const spineY = (1 - t) * (1 - t) * 128 + 2 * (1 - t) * t * 82 + t * t * 156;
      const bladeLen = Math.sin(t * Math.PI) * 56 + 12;

      ctx.strokeStyle = t > 0.65 ? "#65a30d" : "#15803d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, spineY);
      ctx.quadraticCurveTo(x + 8, spineY - bladeLen * 0.6, x + 16, spineY - bladeLen);
      ctx.moveTo(x, spineY);
      ctx.quadraticCurveTo(x + 8, spineY + bladeLen * 0.6, x + 16, spineY + bladeLen);
      ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
  }

  // Tekstur Helai Rumput Lancip Alpha-Cutout (Bukan Kotak Persegi!)
  static _makeGrassBladeAlpha() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 256, 256);

    const greens = ["#3f6212", "#4d7c0f", "#65a30d", "#84cc16"];
    for (let i = 0; i < 24; i++) {
      const baseX = 28 + (i / 23) * 200 + (Math.random() - 0.5) * 10;
      const tipX = baseX + (Math.random() - 0.5) * 44;
      const tipY = 26 + Math.random() * 75;
      const ctrlX = (baseX + tipX) * 0.5 + (Math.random() - 0.5) * 22;

      ctx.fillStyle = greens[i % greens.length];
      ctx.beginPath();
      ctx.moveTo(baseX - 4, 256);
      ctx.quadraticCurveTo(ctrlX - 2, (256 + tipY) * 0.5, tipX, tipY);
      ctx.quadraticCurveTo(ctrlX + 2, (256 + tipY) * 0.5, baseX + 4, 256);
      ctx.closePath();
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }

  static _makeAsphaltTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 18000; i++) {
      const shade = 22 + Math.floor(Math.random() * 28);
      ctx.fillStyle = `rgb(${shade},${shade + 4},${shade + 9})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static _makeBikeLaneTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#15803d";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(22,101,52,0.42)" : "rgba(74,222,128,0.18)";
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(10, 0, 10, 256);
    ctx.fillRect(236, 0, 10, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static _makePavingTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#64748b";
    ctx.fillRect(0, 0, 256, 256);
    const tones = ["#cbd5e1", "#e2e8f0", "#b45309", "#94a3b8"];
    for (let y = 0; y < 256; y += 16) {
      const offset = (y / 16) % 2 === 0 ? 0 : 8;
      for (let x = -8; x < 256; x += 16) {
        ctx.fillStyle = tones[(Math.abs(x + y) / 16) % tones.length];
        ctx.fillRect(x + offset + 1, y + 1, 14, 14);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static _makeRoofTileTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#9a3412";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) {
      ctx.fillStyle = "rgba(41, 15, 4, 0.48)";
      ctx.fillRect(0, y + 12, 256, 4);
      for (let x = 0; x < 256; x += 16) {
        ctx.fillStyle = "rgba(251, 146, 60, 0.22)";
        ctx.fillRect(x + 2, y + 2, 11, 9);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  }

  static _makePlasterTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) {
      const v = 232 + Math.floor(Math.random() * 20);
      ctx.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static _makeCorrugatedMetalTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    for (let x = 0; x < 256; x += 8) {
      ctx.fillStyle = (x / 8) % 2 === 0 ? "#94a3b8" : "#64748b";
      ctx.fillRect(x, 0, 8, 256);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  static _makeWindowPair(frameHex, warmHex, cols, rows, litRatio) {
    const dCanvas = document.createElement("canvas");
    dCanvas.width = 512;
    dCanvas.height = 512;
    const dCtx = dCanvas.getContext("2d");

    const eCanvas = document.createElement("canvas");
    eCanvas.width = 512;
    eCanvas.height = 512;
    const eCtx = eCanvas.getContext("2d");

    dCtx.fillStyle = frameHex;
    dCtx.fillRect(0, 0, 512, 512);
    eCtx.fillStyle = "#000000";
    eCtx.fillRect(0, 0, 512, 512);

    const padX = 512 / cols;
    const padY = 512 / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = c * padX + padX * 0.16;
        const wy = r * padY + padY * 0.18;
        const ww = padX * 0.68;
        const wh = padY * 0.64;

        // Kaca siang dengan pantulan langit & kusen tengah
        const grad = dCtx.createLinearGradient(wx, wy, wx, wy + wh);
        grad.addColorStop(0, "#38bdf8");
        grad.addColorStop(0.55, "#0f172a");
        grad.addColorStop(1, "#1e293b");
        dCtx.fillStyle = grad;
        dCtx.fillRect(wx, wy, ww, wh);

        dCtx.fillStyle = "rgba(255,255,255,0.28)";
        dCtx.fillRect(wx + ww * 0.48, wy, 2, wh);

        // Pencahayaan malam bervariasi organik (sebagian hangat, sebagian putih, sebagian gelap)
        if (Math.random() < litRatio) {
          const glowCol = Math.random() > 0.28 ? warmHex : "#e0f2fe";
          eCtx.fillStyle = glowCol;
          eCtx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        }
      }
    }

    const diffuse = new THREE.CanvasTexture(dCanvas);
    const emissive = new THREE.CanvasTexture(eCanvas);
    diffuse.wrapS = THREE.RepeatWrapping;
    diffuse.wrapT = THREE.RepeatWrapping;
    emissive.wrapS = THREE.RepeatWrapping;
    emissive.wrapT = THREE.RepeatWrapping;
    return { diffuse, emissive };
  }
}

class NusantaraGraphicsHD {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks || {};

    this.gridSegments = 160;
    this.worldSize = 320;
    this.halfSize = this.worldSize / 2;
    this.cellSize = 4.0;
    this.gridCount = 80;

    this.textures = ProceduralHDTextures.createAll();
    this.windUniform = { value: 0 };

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.8, 820);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.camTarget = new THREE.Vector3(0, 1.8, 0);
    this.camTargetGoal = new THREE.Vector3(0, 1.8, 0);
    this.camRadius = 72;
    this.camRadiusGoal = 72;
    this.camTheta = Math.PI * 0.25;
    this.camThetaGoal = Math.PI * 0.25;
    this.camPhi = 0.68;
    this.camPhiGoal = 0.68;
    this.isTopDownView = false;

    this.activeTool = null;
    this.streetLights = [];
    this.clockHour = 7.5;
    this.onAtmosphereChange = null;

    this.highwayGroup = new THREE.Group();
    this.scene.add(this.highwayGroup);

    this.broadleafData = [];
    this.pineData = [];
    this.palmData = [];
    this.grassData = [];
    this.maxBroadleaf = 920;
    this.maxPines = 520;
    this.maxPalms = 260;
    this.maxGrass = 3800;

    this._setupLights();
    this._setupTerrainMesh();
    this._setupWaterShader();
    this._setupGridHelper();
    this._setupRealisticVegetation();
    this._setupFallingLeaves();
    this._setupTouchAndMouse();
    this._updateCameraPosition(1);

    window.addEventListener("resize", () => this._onResize());
  }

  _setupLights() {
    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x3f6212, 0.82);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.7);
    this.sunLight.position.set(85, 130, 65);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 15;
    this.sunLight.shadow.camera.far = 380;
    const d = 120;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
  }

  _setupTerrainMesh() {
    this.terrainGeo = new THREE.PlaneGeometry(
      this.worldSize,
      this.worldSize,
      this.gridSegments,
      this.gridSegments
    );
    this.terrainGeo.rotateX(-Math.PI / 2);

    const count = this.terrainGeo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    this.terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: this.textures.grassDetail,
      bumpMap: this.textures.rockDetail,
      bumpScale: 0.42,
      roughness: 0.9,
      metalness: 0.02
    });

    this.terrainMesh = new THREE.Mesh(this.terrainGeo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.scene.add(this.terrainMesh);
  }

  _setupWaterShader() {
    const dim = this.gridSegments + 1;
    this.waterDepthData = new Uint8Array(dim * dim * 4);
    this.waterDepthTex = new THREE.DataTexture(this.waterDepthData, dim, dim, THREE.RGBAFormat);
    this.waterDepthTex.minFilter = THREE.LinearFilter;
    this.waterDepthTex.magFilter = THREE.LinearFilter;
    this.waterDepthTex.needsUpdate = true;

    const waterGeo = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 128, 128);
    waterGeo.rotateX(-Math.PI / 2);

    this.waterUniforms = {
      uTime: { value: 0 },
      uDepthTex: { value: this.waterDepthTex },
      uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.4).normalize() },
      uShallowColor: { value: new THREE.Color(0x14b8a6) },
      uDeepColor: { value: new THREE.Color(0x0c4a6e) },
      uSkyColor: { value: new THREE.Color(0xe0f2fe) }
    };

    const waterMat = new THREE.ShaderMaterial({
      uniforms: this.waterUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec2 vWaterUv;
        varying vec3 vNormal;
        void main() {
          vWaterUv = vec2(uv.x, 1.0 - uv.y);
          vec3 pos = position;
          float w1 = sin(pos.x * 0.45 + uTime * 1.9) * 0.05;
          float w2 = cos(pos.z * 0.52 + uTime * 1.5) * 0.05;
          pos.y += w1 + w2;
          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPosition.xyz;
          vNormal = normalize(vec3(
            -cos(pos.x * 0.45 + uTime * 1.9) * 0.055,
            1.0,
            sin(pos.z * 0.52 + uTime * 1.5) * 0.055
          ));
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform sampler2D uDepthTex;
        uniform vec3 uSunDir;
        uniform vec3 uShallowColor;
        uniform vec3 uDeepColor;
        uniform vec3 uSkyColor;
        varying vec3 vWorldPos;
        varying vec2 vWaterUv;
        varying vec3 vNormal;
        void main() {
          float depthRaw = texture2D(uDepthTex, vWaterUv).r;
          if (depthRaw <= 0.01) discard;
          float depthMeters = depthRaw * 8.0;

          // Riak gelombang berlapis
          float r1 = sin(vWorldPos.x * 1.3 + vWorldPos.z * 0.9 + uTime * 2.4);
          float r2 = cos(vWorldPos.x * 0.8 - vWorldPos.z * 1.5 + uTime * 1.9);
          vec3 rippleNorm = normalize(vNormal + vec3(r1 * 0.08, 0.0, r2 * 0.08));

          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, rippleNorm), 0.0), 3.2);
          vec3 halfVec = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(rippleNorm, halfVec), 0.0), 96.0) * 1.1;

          float depthMix = clamp(depthMeters / 3.2, 0.0, 1.0);
          vec3 waterCol = mix(uShallowColor, uDeepColor, depthMix);
          waterCol = mix(waterCol, uSkyColor, fresnel * 0.52) + vec3(spec);

          // Buih ombak putih di tepian dangkal sungai & pantai
          float shoreWave = sin(depthMeters * 14.0 - uTime * 3.2 + r1 * 1.5);
          float foamMask = smoothstep(0.85, 0.08, depthMeters) * smoothstep(0.35, 0.85, shoreWave);
          waterCol = mix(waterCol, vec3(0.95, 0.98, 1.0), foamMask * 0.72);

          float alpha = clamp(0.45 + depthMeters * 0.45, 0.45, 0.92);
          gl_FragColor = vec4(waterCol, alpha);
        }
      `
    });

    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = 0.0;
    this.scene.add(this.waterMesh);
  }

  _updateWaterDepthTexture() {
    if (!this.terrainGeo || !this.waterDepthData) return;
    const pos = this.terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const depth = Math.max(0, 0.08 - y);
      const encoded = Math.min(255, Math.floor((depth / 8.0) * 255));
      this.waterDepthData[i * 4] = encoded;
      this.waterDepthData[i * 4 + 1] = encoded;
      this.waterDepthData[i * 4 + 2] = encoded;
      this.waterDepthData[i * 4 + 3] = 255;
    }
    this.waterDepthTex.needsUpdate = true;
  }

  _setupGridHelper() {
    this.gridHelper = new THREE.GridHelper(this.worldSize, this.gridCount, 0x38bdf8, 0x94a3b8);
    this.gridHelper.position.y = 1.72;
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = 0.2;
    this.gridHelper.visible = false;
    this.scene.add(this.gridHelper);
  }

  setGridVisible(visible) {
    this.gridHelper.visible = visible;
  }

  _applyWindShader(material, swayStrength) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = this.windUniform;
      shader.vertexShader = `uniform float uWindTime;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        float hFactor = clamp(position.y * 0.35, 0.0, 2.5);
        #ifdef USE_INSTANCING
          vec3 wOffset = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
        #else
          vec3 wOffset = vec3(0.0);
        #endif
        float gust = sin(uWindTime * 2.0 + wOffset.x * 0.25 + wOffset.z * 0.22) * 0.65
                   + cos(uWindTime * 3.1 + wOffset.z * 0.4) * 0.35;
        transformed.x += gust * ${swayStrength.toFixed(3)} * hFactor;
        transformed.z += gust * ${(swayStrength * 0.55).toFixed(3)} * hFactor;
        `
      );
    };
  }

  _mergeBufferGeometries(geos) {
    const merged = new THREE.BufferGeometry();
    const posArr = [];
    const normArr = [];
    const uvArr = [];
    const idxArr = [];
    let vertOffset = 0;

    geos.forEach((g) => {
      const p = g.attributes.position.array;
      const n = g.attributes.normal.array;
      const u = g.attributes.uv ? g.attributes.uv.array : null;
      const idx = g.index.array;
      for (let i = 0; i < p.length; i++) posArr.push(p[i]);
      for (let i = 0; i < n.length; i++) normArr.push(n[i]);
      if (u) {
        for (let i = 0; i < u.length; i++) uvArr.push(u[i]);
      } else {
        for (let i = 0; i < (p.length / 3) * 2; i++) uvArr.push(0);
      }
      for (let i = 0; i < idx.length; i++) idxArr.push(idx[i] + vertOffset);
      vertOffset += p.length / 3;
    });

    merged.setAttribute("position", new THREE.Float32BufferAttribute(posArr, 3));
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(normArr, 3));
    merged.setAttribute("uv", new THREE.Float32BufferAttribute(uvArr, 2));
    merged.setIndex(idxArr);
    return merged;
  }

  _setupRealisticVegetation() {
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.95 });

    // 1. POHON RINDANG REALISTIS (Batang Bercabang 3 + 12 Kluster Daun Alpha-Cutout)
    const mainTrunk = new THREE.CylinderGeometry(0.14, 0.28, 2.2, 7);
    mainTrunk.translate(0, 1.1, 0);
    const branch1 = new THREE.CylinderGeometry(0.07, 0.13, 1.45, 6);
    branch1.rotateZ(0.48);
    branch1.translate(-0.42, 2.45, 0.12);
    const branch2 = new THREE.CylinderGeometry(0.07, 0.13, 1.45, 6);
    branch2.rotateZ(-0.46);
    branch2.rotateX(0.28);
    branch2.translate(0.42, 2.45, -0.15);
    const branch3 = new THREE.CylinderGeometry(0.07, 0.12, 1.35, 6);
    branch3.rotateX(-0.45);
    branch3.translate(0.05, 2.55, 0.42);
    const blTrunkGeo = this._mergeBufferGeometries([mainTrunk, branch1, branch2, branch3]);

    const leafCards = [];
    const cardOffsets = [
      [0, 3.25, 0, 0, 0.1, 2.5],
      [0, 3.25, 0, Math.PI / 2, -0.1, 2.5],
      [-0.75, 2.75, 0.25, 0.4, 0.35, 2.1],
      [-0.75, 2.75, 0.25, 1.95, -0.25, 2.1],
      [0.75, 2.75, -0.22, -0.4, -0.35, 2.1],
      [0.75, 2.75, -0.22, 1.15, 0.25, 2.1],
      [0.1, 2.85, 0.72, 0.8, 0.3, 2.05],
      [0.1, 2.85, -0.72, -0.8, -0.3, 2.05],
      [0, 3.85, 0, 0.6, 0.15, 1.85],
      [0, 3.85, 0, 2.15, -0.15, 1.85]
    ];
    cardOffsets.forEach(([ox, oy, oz, ry, rx, sz]) => {
      const p = new THREE.PlaneGeometry(sz, sz);
      p.rotateX(rx);
      p.rotateY(ry);
      p.translate(ox, oy, oz);
      leafCards.push(p);
    });
    const blFoliageGeo = this._mergeBufferGeometries(leafCards);
    const blFoliageMat = new THREE.MeshStandardMaterial({
      map: this.textures.treeLeafAlpha,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.82
    });
    this._applyWindShader(blFoliageMat, 0.16);

    this.blTrunks = new THREE.InstancedMesh(blTrunkGeo, barkMat, this.maxBroadleaf);
    this.blFoliage = new THREE.InstancedMesh(blFoliageGeo, blFoliageMat, this.maxBroadleaf);
    this.blFoliage.castShadow = true;
    this.scene.add(this.blTrunks, this.blFoliage);

    // 2. POHON CEMARA / PINUS PEGUNUNGAN (Jarum Alpha-Cutout Bertingkat)
    const pineTrunkGeo = new THREE.CylinderGeometry(0.09, 0.22, 3.8, 6);
    pineTrunkGeo.translate(0, 1.9, 0);
    const pineCards = [];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.PlaneGeometry(2.5, 3.4);
      p.rotateY((i * Math.PI) / 3);
      p.translate(0, 2.6, 0);
      pineCards.push(p);
    }
    const pineFoliageGeo = this._mergeBufferGeometries(pineCards);
    const pineMat = new THREE.MeshStandardMaterial({
      map: this.textures.pineLeafAlpha,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.85
    });
    this._applyWindShader(pineMat, 0.12);

    this.pineTrunks = new THREE.InstancedMesh(pineTrunkGeo, barkMat, this.maxPines);
    this.pineFoliage = new THREE.InstancedMesh(pineFoliageGeo, pineMat, this.maxPines);
    this.pineFoliage.castShadow = true;
    this.scene.add(this.pineTrunks, this.pineFoliage);

    // 3. POHON KELAPA PESISIR (Untuk Kota Pantai: Jakarta, Surabaya, Bali, Makassar)
    const palmTrunkGeo = new THREE.CylinderGeometry(0.11, 0.2, 4.4, 7);
    palmTrunkGeo.translate(0, 2.2, 0);
    const palmCards = [];
    for (let i = 0; i < 7; i++) {
      const frond = new THREE.PlaneGeometry(2.4, 1.35);
      frond.translate(1.15, 0, 0);
      frond.rotateZ(-0.22 + (i % 2) * 0.14);
      frond.rotateY((i * Math.PI * 2) / 7);
      frond.translate(0, 4.35, 0);
      palmCards.push(frond);
    }
    const palmFoliageGeo = this._mergeBufferGeometries(palmCards);
    const palmMat = new THREE.MeshStandardMaterial({
      map: this.textures.palmFrondAlpha,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.78
    });
    this._applyWindShader(palmMat, 0.24);

    this.palmTrunks = new THREE.InstancedMesh(palmTrunkGeo, barkMat, this.maxPalms);
    this.palmFoliage = new THREE.InstancedMesh(palmFoliageGeo, palmMat, this.maxPalms);
    this.palmFoliage.castShadow = true;
    this.scene.add(this.palmTrunks, this.palmFoliage);

    // 4. RUMPUN RUMPUT HELAI ASLI (Alpha-Cutout Grass Blades, Bukan Persegi!)
    const g1 = new THREE.PlaneGeometry(0.95, 0.65);
    g1.translate(0, 0.31, 0);
    const g2 = g1.clone();
    g2.rotateY(Math.PI / 3);
    const g3 = g1.clone();
    g3.rotateY(-Math.PI / 3);
    const grassGeo = this._mergeBufferGeometries([g1, g2, g3]);
    const grassMat = new THREE.MeshStandardMaterial({
      map: this.textures.grassTuftAlpha,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.88
    });
    this._applyWindShader(grassMat, 0.28);

    this.grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, this.maxGrass);
    this.scene.add(this.grassMesh);
  }

  _setupFallingLeaves() {
    this.leafCount = 180;
    const leafGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.leafCount * 3);
    this.leafVelocities = [];

    for (let i = 0; i < this.leafCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 240;
      positions[i * 3 + 1] = 2 + Math.random() * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 240;
      this.leafVelocities.push({
        vy: 0.42 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2
      });
    }
    leafGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const leafMat = new THREE.PointsMaterial({
      color: 0xa3e635,
      size: 0.3,
      transparent: true,
      opacity: 0.85
    });
    this.fallingLeaves = new THREE.Points(leafGeo, leafMat);
    this.scene.add(this.fallingLeaves);
  }

  _updateFallingLeaves(delta, elapsed) {
    if (!this.fallingLeaves) return;
    const pos = this.fallingLeaves.geometry.attributes.position;
    for (let i = 0; i < this.leafCount; i++) {
      const v = this.leafVelocities[i];
      let x = pos.getX(i) + Math.sin(elapsed * 1.3 + v.phase) * 0.42 * delta;
      let y = pos.getY(i) - v.vy * delta;
      let z = pos.getZ(i) + Math.cos(elapsed * 1.0 + v.phase) * 0.32 * delta;

      const ground = this.getHeightAt(x, z);
      if (y <= Math.max(0.5, ground + 0.1)) {
        if (this.broadleafData.length > 0) {
          const anchor = this.broadleafData[Math.floor(Math.random() * this.broadleafData.length)];
          x = anchor.x + (Math.random() - 0.5) * 3.5;
          y = anchor.y + 3.0 + Math.random() * 1.4;
          z = anchor.z + (Math.random() - 0.5) * 3.5;
        } else {
          y = ground + 5.0;
        }
      }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  _syncVegetationInstances() {
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.maxBroadleaf; i++) {
      const t = this.broadleafData[i];
      if (!t || !t.active) {
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
      } else {
        dummy.position.set(t.x, t.y, t.z);
        dummy.rotation.y = t.rot;
        dummy.scale.set(t.scale, t.scale * t.stretch, t.scale);
      }
      dummy.updateMatrix();
      this.blTrunks.setMatrixAt(i, dummy.matrix);
      this.blFoliage.setMatrixAt(i, dummy.matrix);
    }
    this.blTrunks.instanceMatrix.needsUpdate = true;
    this.blFoliage.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.maxPines; i++) {
      const p = this.pineData[i];
      if (!p || !p.active) {
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
      } else {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.y = p.rot;
        dummy.scale.set(p.scale, p.scale * p.stretch, p.scale);
      }
      dummy.updateMatrix();
      this.pineTrunks.setMatrixAt(i, dummy.matrix);
      this.pineFoliage.setMatrixAt(i, dummy.matrix);
    }
    this.pineTrunks.instanceMatrix.needsUpdate = true;
    this.pineFoliage.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.maxPalms; i++) {
      const p = this.palmData[i];
      if (!p || !p.active) {
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
      } else {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.y = p.rot;
        dummy.scale.set(p.scale, p.scale * p.stretch, p.scale);
      }
      dummy.updateMatrix();
      this.palmTrunks.setMatrixAt(i, dummy.matrix);
      this.palmFoliage.setMatrixAt(i, dummy.matrix);
    }
    this.palmTrunks.instanceMatrix.needsUpdate = true;
    this.palmFoliage.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.maxGrass; i++) {
      const g = this.grassData[i];
      if (!g || !g.active) {
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
      } else {
        dummy.position.set(g.x, g.y, g.z);
        dummy.rotation.y = g.rot;
        dummy.scale.set(g.scale, g.scale, g.scale);
      }
      dummy.updateMatrix();
      this.grassMesh.setMatrixAt(i, dummy.matrix);
    }
    this.grassMesh.instanceMatrix.needsUpdate = true;
  }

  addTreeAt(x, y, z, scaleOverride = null) {
    if (this.broadleafData.length >= this.maxBroadleaf) return false;
    this.broadleafData.push({
      active: true,
      x,
      y,
      z,
      rot: Math.random() * Math.PI * 2,
      scale: scaleOverride || (0.85 + Math.random() * 0.5),
      stretch: 0.92 + Math.random() * 0.25
    });
    this._syncVegetationInstances();
    return true;
  }

  clearVegetationNear(wx, wz, radius) {
    let changed = false;
    const clearList = (arr, extra = 0) => {
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (item.active && Math.hypot(item.x - wx, item.z - wz) < radius + extra) {
          item.active = false;
          changed = true;
        }
      }
    };
    clearList(this.broadleafData, 0);
    clearList(this.pineData, 0);
    clearList(this.palmData, 0);
    clearList(this.grassData, 0.5);
    if (changed) this._syncVegetationInstances();
  }

  _isInsideStarterHighwayCorridor(region, x, z) {
    const hw = region.highway;
    const minX = -this.halfSize + hw.minGx * this.cellSize - 10;
    const maxX = -this.halfSize + (hw.maxGx + 1) * this.cellSize + 10;
    const minZ = -this.halfSize + hw.minGz * this.cellSize - 10;
    const maxZ = -this.halfSize + (hw.maxGz + 1) * this.cellSize + 10;
    return x >= minX && x <= maxX && z >= minZ && z <= maxZ;
  }

  _buildStarterHighwayForRegion(region) {
    while (this.highwayGroup.children.length > 0) {
      this.highwayGroup.remove(this.highwayGroup.children[0]);
    }
    this.streetLights = [];

    const hw = region.highway;
    const x0 = -this.halfSize + hw.minGx * this.cellSize;
    const x1 = -this.halfSize + (hw.maxGx + 1) * this.cellSize;
    const z0 = -this.halfSize + hw.minGz * this.cellSize;
    const z1 = -this.halfSize + (hw.maxGz + 1) * this.cellSize;

    const cx = (x0 + x1) * 0.5;
    const cz = (z0 + z1) * 0.5;
    const lenX = x1 - x0;
    const lenZ = z1 - z0;
    const roadY = 1.72;

    const roadMat = new THREE.MeshStandardMaterial({
      map: this.textures.asphalt,
      roughness: 0.78
    });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });

    const isNS = hw.dir === "NS";
    const roadW = isNS ? lenX - 0.3 : lenX;
    const roadD = isNS ? lenZ : lenZ - 0.3;

    const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(roadW, 0.18, roadD), roadMat);
    roadMesh.position.set(cx, roadY, cz);
    roadMesh.receiveShadow = true;
    this.highwayGroup.add(roadMesh);

    const m1 = new THREE.Mesh(
      new THREE.BoxGeometry(isNS ? 0.16 : roadD, 0.2, isNS ? roadD : 0.16),
      yellowMat
    );
    const m2 = m1.clone();
    if (isNS) {
      m1.position.set(cx - 0.22, roadY + 0.01, cz);
      m2.position.set(cx + 0.22, roadY + 0.01, cz);
    } else {
      m1.position.set(cx, roadY + 0.01, cz - 0.22);
      m2.position.set(cx, roadY + 0.01, cz + 0.22);
    }
    this.highwayGroup.add(m1, m2);

    const gxWorld = -this.halfSize + (hw.gateGx + 0.5) * this.cellSize;
    const gzWorld = -this.halfSize + (hw.gateGz + 0.5) * this.cellSize;
    const gateGroup = new THREE.Group();

    [-4.1, 0, 4.1].forEach((offset) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.8, 1.1), pillarMat);
      pillar.position.set(offset, 1.9, 0);
      pillar.castShadow = true;
      gateGroup.add(pillar);
    });

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.95, 2.8), canopyMat);
    canopy.position.set(0, 4.05, 0);
    canopy.castShadow = true;
    gateGroup.add(canopy);

    gateGroup.position.set(gxWorld, roadY, gzWorld);
    if (!isNS) gateGroup.rotation.y = Math.PI / 2;
    this.highwayGroup.add(gateGroup);

    const startSpan = isNS ? z0 + 6 : x0 + 6;
    const endSpan = isNS ? z1 - 6 : x1 - 6;
    for (let s = startSpan; s <= endSpan; s += 14) {
      [-4.1, 4.1].forEach((side) => {
        const px = isNS ? cx + side : s;
        const pz = isNS ? s : cz + side;
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.11, 3.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x64748b })
        );
        pole.position.set(px, roadY + 1.7, pz);
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xfef08a })
        );
        bulb.position.set(
          isNS ? cx + side * 0.88 : s,
          roadY + 3.35,
          isNS ? s : cz + side * 0.88
        );
        this.highwayGroup.add(pole, bulb);
        this.streetLights.push(bulb);
      });
    }
  }

  loadRegion(region) {
    this.currentRegion = region;
    this.scene.fog = new THREE.FogExp2(region.fogColor, region.fogDensity);
    this.scene.background = new THREE.Color(region.fogColor);

    const pos = this.terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      let h = window.generateRegionHeight(region, x, z, this.halfSize);
      if (this._isInsideStarterHighwayCorridor(region, x, z)) {
        h = 1.68;
      }
      pos.setY(i, h);
    }
    pos.needsUpdate = true;
    this._recolorAndNormals();
    this._updateWaterDepthTexture();
    this._buildStarterHighwayForRegion(region);
    this._populateInitialVegetation(region);

    const hw = region.highway;
    this.camTarget.set(hw.focusX, 1.8, hw.focusZ);
    this.camTargetGoal.set(hw.focusX, 1.8, hw.focusZ);
    this.camRadiusGoal = 72;
    this._updateCameraPosition(1);
  }

  _recolorAndNormals() {
    this.terrainGeo.computeVertexNormals();
    const pos = this.terrainGeo.attributes.position;
    const norm = this.terrainGeo.attributes.normal;
    const col = this.terrainGeo.attributes.color;
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const ny = norm.getY(i);

      if (y < -0.25) {
        c.setHex(0x1e3a5f);
      } else if (y < 0.55) {
        c.setHex(0xd6c79c);
      } else if (ny < 0.74 || y > 17.5) {
        c.setHex(0x525b66);
      } else if (y < 5.5) {
        c.setHex(0x659932);
      } else if (y < 12.5) {
        c.setHex(0x467326);
      } else {
        c.setHex(0x6b665f);
      }
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }

  _populateInitialVegetation(region) {
    this.broadleafData = [];
    this.pineData = [];
    this.palmData = [];
    this.grassData = [];

    const isCoastal = ["jakarta", "surabaya", "bali", "makassar"].includes(region.id);
    const pos = this.terrainGeo.attributes.position;
    const norm = this.terrainGeo.attributes.normal;

    for (let i = 0; i < pos.count; i += 5) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ny = norm.getY(i);

      if (this._isInsideStarterHighwayCorridor(region, x, z)) continue;
      if (y <= 0.65 || ny <= 0.75) continue;

      // Rumpun Rumput Helai Asli
      if (y < 9.0 && this.grassData.length < this.maxGrass && Math.random() > 0.22) {
        this.grassData.push({
          active: true,
          x: x + (Math.random() - 0.5) * 1.9,
          y: y - 0.03,
          z: z + (Math.random() - 0.5) * 1.9,
          rot: Math.random() * Math.PI * 2,
          scale: 0.75 + Math.random() * 0.75
        });
      }

      // Pohon Kelapa di zona pesisir rendah
      if (isCoastal && y >= 0.75 && y < 2.2 && this.palmData.length < this.maxPalms && Math.random() > 0.72) {
        this.palmData.push({
          active: true,
          x: x + (Math.random() - 0.5) * 1.8,
          y,
          z: z + (Math.random() - 0.5) * 1.8,
          rot: Math.random() * Math.PI * 2,
          scale: 0.85 + Math.random() * 0.45,
          stretch: 0.9 + Math.random() * 0.3
        });
      } else if (y >= 1.1 && y < 8.0 && this.broadleafData.length < 720 && Math.random() > 0.75) {
        // Pohon Rindang Bercabang di Lembah & Kota
        this.broadleafData.push({
          active: true,
          x: x + (Math.random() - 0.5) * 2.0,
          y,
          z: z + (Math.random() - 0.5) * 2.0,
          rot: Math.random() * Math.PI * 2,
          scale: 0.8 + Math.random() * 0.55,
          stretch: 0.9 + Math.random() * 0.28
        });
      } else if (y >= 8.0 && y < 19.0 && this.pineData.length < 480 && Math.random() > 0.66) {
        // Pohon Pinus / Cemara di Lereng Gunung Tinggi
        this.pineData.push({
          active: true,
          x: x + (Math.random() - 0.5) * 1.8,
          y,
          z: z + (Math.random() - 0.5) * 1.8,
          rot: Math.random() * Math.PI * 2,
          scale: 0.85 + Math.random() * 0.55,
          stretch: 0.92 + Math.random() * 0.32
        });
      }
    }

    this._syncVegetationInstances();
  }

  getHeightAt(wx, wz) {
    const step = this.worldSize / this.gridSegments;
    const fx = Math.max(0, Math.min(this.gridSegments - 1.001, (wx + this.halfSize) / step));
    const fz = Math.max(0, Math.min(this.gridSegments - 1.001, (wz + this.halfSize) / step));
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const tx = fx - ix;
    const tz = fz - iz;

    const stride = this.gridSegments + 1;
    const pos = this.terrainGeo.attributes.position;
    const y00 = pos.getY(iz * stride + ix);
    const y10 = pos.getY(iz * stride + ix + 1);
    const y01 = pos.getY((iz + 1) * stride + ix);
    const y11 = pos.getY((iz + 1) * stride + ix + 1);

    const y0 = y00 * (1 - tx) + y10 * tx;
    const y1 = y01 * (1 - tx) + y11 * tx;
    return y0 * (1 - tz) + y1 * tz;
  }

  // Perataan badan jalan mulus (Smooth Roadbed Grading) agar jalan tidak pernah putus/tembus tanah
  gradeTerrainForCells(cells) {
    const step = this.worldSize / this.gridSegments;
    const stride = this.gridSegments + 1;
    const pos = this.terrainGeo.attributes.position;
    let changed = false;

    cells.forEach((c) => {
      if (c.groundY < 0.25) return;
      const minIx = Math.max(0, Math.floor((c.wx - 2.6 + this.halfSize) / step));
      const maxIx = Math.min(this.gridSegments, Math.ceil((c.wx + 2.6 + this.halfSize) / step));
      const minIz = Math.max(0, Math.floor((c.wz - 2.6 + this.halfSize) / step));
      const maxIz = Math.min(this.gridSegments, Math.ceil((c.wz + 2.6 + this.halfSize) / step));

      for (let iz = minIz; iz <= maxIz; iz++) {
        for (let ix = minIx; ix <= maxIx; ix++) {
          const idx = iz * stride + ix;
          const vy = pos.getY(idx);
          if (vy >= 0.25) {
            pos.setY(idx, vy + (c.groundY - vy) * 0.72);
            changed = true;
          }
        }
      }
    });

    if (changed) {
      pos.needsUpdate = true;
      this._recolorAndNormals();
      this._updateWaterDepthTexture();
    }
  }

  sculptTerrainAt(worldX, worldZ, mode) {
    if (mode === "tree") {
      const y = this.getHeightAt(worldX, worldZ);
      if (y > 0.6) {
        this.addTreeAt(worldX + (Math.random() - 0.5) * 1.5, y, worldZ + (Math.random() - 0.5) * 1.5);
      }
      return;
    }

    const radius = 14.0;
    const step = this.worldSize / this.gridSegments;
    const stride = this.gridSegments + 1;
    const minIx = Math.max(0, Math.floor((worldX - radius + this.halfSize) / step));
    const maxIx = Math.min(this.gridSegments, Math.ceil((worldX + radius + this.halfSize) / step));
    const minIz = Math.max(0, Math.floor((worldZ - radius + this.halfSize) / step));
    const maxIz = Math.min(this.gridSegments, Math.ceil((worldZ + radius + this.halfSize) / step));

    const pos = this.terrainGeo.attributes.position;
    let changed = false;

    for (let iz = minIz; iz <= maxIz; iz++) {
      for (let ix = minIx; ix <= maxIx; ix++) {
        const idx = iz * stride + ix;
        const vx = pos.getX(idx);
        const vz = pos.getZ(idx);
        const dist = Math.hypot(vx - worldX, vz - worldZ);
        if (dist < radius) {
          const falloff = Math.cos((dist / radius) * (Math.PI / 2));
          let vy = pos.getY(idx);
          if (mode === "raise") vy = Math.min(40, vy + 0.85 * falloff);
          if (mode === "lower") vy = Math.max(-5.5, vy - 0.85 * falloff);
          if (mode === "flatten") vy = vy + (1.72 - vy) * 0.4 * falloff;
          pos.setY(idx, vy);
          changed = true;
        }
      }
    }

    if (changed) {
      pos.needsUpdate = true;
      this._recolorAndNormals();
      this._updateWaterDepthTexture();
    }
  }

  toggleCameraAngle() {
    this.isTopDownView = !this.isTopDownView;
    this.camPhiGoal = this.isTopDownView ? 0.12 : 0.68;
    return this.isTopDownView;
  }

  updateAtmosphere(hour) {
    this.clockHour = hour;
    const isNight = hour < 5.5 || hour > 18.5;
    const isGolden = (hour >= 5.5 && hour <= 7.5) || (hour >= 16.5 && hour <= 18.5);

    const sunAngle = ((hour - 6) / 24) * Math.PI * 2;
    this.sunLight.position.set(Math.cos(sunAngle) * 140, Math.max(20, Math.sin(sunAngle) * 150), 65);
    this.waterUniforms.uSunDir.value.copy(this.sunLight.position).normalize();

    if (isNight) {
      this.sunLight.intensity = 0.26;
      this.sunLight.color.setHex(0x60a5fa);
      this.hemiLight.intensity = 0.36;
      this.scene.background.setHex(0x070d19);
      if (this.scene.fog) this.scene.fog.color.setHex(0x070d19);
      this.waterUniforms.uSkyColor.value.setHex(0x0f172a);
    } else if (isGolden) {
      this.sunLight.intensity = 1.48;
      this.sunLight.color.setHex(0xfdba74);
      this.hemiLight.intensity = 0.68;
      this.scene.background.setHex(0xfed7aa);
      if (this.scene.fog) this.scene.fog.color.setHex(0xfed7aa);
      this.waterUniforms.uSkyColor.value.setHex(0xfdba74);
    } else {
      this.sunLight.intensity = 1.7;
      this.sunLight.color.setHex(0xfffbeb);
      this.hemiLight.intensity = 0.82;
      const baseCol = this.currentRegion ? this.currentRegion.fogColor : 0xdbeafe;
      this.scene.background.setHex(baseCol);
      if (this.scene.fog) this.scene.fog.color.setHex(baseCol);
      this.waterUniforms.uSkyColor.value.setHex(baseCol);
    }

    this.streetLights.forEach((bulb) => {
      bulb.material.color.setHex(isNight || isGolden ? 0xfef08a : 0x475569);
    });

    if (this.onAtmosphereChange) {
      this.onAtmosphereChange(isNight, isGolden);
    }
  }

  _updateCameraPosition(lerpFactor = 0.16) {
    this.camTarget.lerp(this.camTargetGoal, lerpFactor);
    this.camRadius += (this.camRadiusGoal - this.camRadius) * lerpFactor;
    this.camTheta += (this.camThetaGoal - this.camTheta) * lerpFactor;
    this.camPhi += (this.camPhiGoal - this.camPhi) * lerpFactor;

    const x = this.camTarget.x + this.camRadius * Math.sin(this.camPhi) * Math.cos(this.camTheta);
    const y = this.camTarget.y + this.camRadius * Math.cos(this.camPhi);
    const z = this.camTarget.z + this.camRadius * Math.sin(this.camPhi) * Math.sin(this.camTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.camTarget);
  }

  _raycastTerrain(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const hits = raycaster.intersectObject(this.terrainMesh);
    return hits.length > 0 ? hits[0].point : null;
  }

  _raycastGroundPlane(clientX, clientY, planeY) {
    const rect = this.canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const hit = new THREE.Vector3();
    return raycaster.ray.intersectPlane(groundPlane, hit) ? hit : null;
  }

  _isTerrainSculptTool(tool) {
    return tool === "raise" || tool === "lower" || tool === "flatten" || tool === "tree";
  }

  _setupTouchAndMouse() {
    let isOneFingerDown = false;
    let panAnchorWorld = null;
    let panPlaneY = 1.8;
    let lastPinchDist = 0;
    let lastPinchAngle = 0;
    let lastPinchMidY = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const beginGroundLockPan = (clientX, clientY) => {
      panPlaneY = this.camTarget.y;
      panAnchorWorld = this._raycastGroundPlane(clientX, clientY, panPlaneY);
    };

    const moveGroundLockPan = (clientX, clientY) => {
      if (!panAnchorWorld) return;
      const currentWorld = this._raycastGroundPlane(clientX, clientY, panPlaneY);
      if (!currentWorld) return;
      const deltaX = panAnchorWorld.x - currentWorld.x;
      const deltaZ = panAnchorWorld.z - currentWorld.z;
      this.camTargetGoal.x = Math.max(-135, Math.min(135, this.camTargetGoal.x + deltaX));
      this.camTargetGoal.z = Math.max(-135, Math.min(135, this.camTargetGoal.z + deltaZ));
      this.camTarget.x = this.camTargetGoal.x;
      this.camTarget.z = this.camTargetGoal.z;
      this._updateCameraPosition(1);
    };

    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        isOneFingerDown = true;
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;

        if (this.activeTool) {
          const pt = this._raycastTerrain(tx, ty);
          if (pt) {
            if (this._isTerrainSculptTool(this.activeTool)) {
              this.sculptTerrainAt(pt.x, pt.z, this.activeTool);
            } else if (this.callbacks.onSelectionStart) {
              this.callbacks.onSelectionStart(pt.x, pt.z, this.activeTool);
            }
          }
        } else {
          beginGroundLockPan(tx, ty);
        }
      } else if (e.touches.length === 2) {
        isOneFingerDown = false;
        panAnchorWorld = null;
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        lastPinchDist = Math.hypot(dx, dy);
        lastPinchAngle = Math.atan2(dy, dx);
        lastPinchMidY = (e.touches[0].clientY + e.touches[1].clientY) * 0.5;
      }
    }, { passive: true });

    this.canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1 && isOneFingerDown) {
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;
        if (this.activeTool) {
          const pt = this._raycastTerrain(tx, ty);
          if (pt) {
            if (this._isTerrainSculptTool(this.activeTool)) {
              this.sculptTerrainAt(pt.x, pt.z, this.activeTool);
            } else if (this.callbacks.onSelectionMove) {
              this.callbacks.onSelectionMove(pt.x, pt.z, this.activeTool);
            }
          }
        } else {
          moveGroundLockPan(tx, ty);
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const midY = (e.touches[0].clientY + e.touches[1].clientY) * 0.5;

        if (lastPinchDist > 0) {
          const zoomDelta = (lastPinchDist - dist) * 0.24;
          this.camRadiusGoal = Math.max(16, Math.min(220, this.camRadiusGoal + zoomDelta));

          let dAngle = angle - lastPinchAngle;
          if (dAngle > Math.PI) dAngle -= Math.PI * 2;
          if (dAngle < -Math.PI) dAngle += Math.PI * 2;
          this.camThetaGoal += dAngle * 0.95;

          const dMidY = midY - lastPinchMidY;
          this.camPhiGoal = Math.max(0.1, Math.min(1.22, this.camPhiGoal - dMidY * 0.0045));
        }
        lastPinchDist = dist;
        lastPinchAngle = angle;
        lastPinchMidY = midY;
      }
    }, { passive: true });

    this.canvas.addEventListener("touchend", () => {
      if (isOneFingerDown && this.activeTool && !this._isTerrainSculptTool(this.activeTool)) {
        if (this.callbacks.onSelectionEnd) this.callbacks.onSelectionEnd();
      }
      isOneFingerDown = false;
      panAnchorWorld = null;
      lastPinchDist = 0;
    });

    this.canvas.addEventListener("mousedown", (e) => {
      isOneFingerDown = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      if (this.activeTool && e.button === 0) {
        const pt = this._raycastTerrain(e.clientX, e.clientY);
        if (pt) {
          if (this._isTerrainSculptTool(this.activeTool)) {
            this.sculptTerrainAt(pt.x, pt.z, this.activeTool);
          } else if (this.callbacks.onSelectionStart) {
            this.callbacks.onSelectionStart(pt.x, pt.z, this.activeTool);
          }
        }
      } else if (e.button === 0) {
        beginGroundLockPan(e.clientX, e.clientY);
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!isOneFingerDown) return;
      if (this.activeTool && e.buttons === 1) {
        const pt = this._raycastTerrain(e.clientX, e.clientY);
        if (pt) {
          if (this._isTerrainSculptTool(this.activeTool)) {
            this.sculptTerrainAt(pt.x, pt.z, this.activeTool);
          } else if (this.callbacks.onSelectionMove) {
            this.callbacks.onSelectionMove(pt.x, pt.z, this.activeTool);
          }
        }
      } else if (e.buttons === 2) {
        this.camThetaGoal += (e.clientX - lastMouseX) * 0.008;
        this.camPhiGoal = Math.max(0.1, Math.min(1.22, this.camPhiGoal - (e.clientY - lastMouseY) * 0.006));
      } else if (e.buttons === 1) {
        moveGroundLockPan(e.clientX, e.clientY);
      }
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    window.addEventListener("mouseup", () => {
      if (isOneFingerDown && this.activeTool && !this._isTerrainSculptTool(this.activeTool)) {
        if (this.callbacks.onSelectionEnd) this.callbacks.onSelectionEnd();
      }
      isOneFingerDown = false;
      panAnchorWorld = null;
    });

    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("wheel", (e) => {
      this.camRadiusGoal = Math.max(16, Math.min(220, this.camRadiusGoal + e.deltaY * 0.06));
    }, { passive: true });
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(delta) {
    this.windUniform.value += delta;
    this._updateFallingLeaves(delta, this.windUniform.value);
    this._updateCameraPosition(Math.min(1, delta * 12));
    this.waterUniforms.uTime.value += delta;
    this.renderer.render(this.scene, this.camera);
  }
}
