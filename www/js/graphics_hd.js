class ProceduralHDTextures {
  static createAll() {
    return {
      grassDetail: this._makeGrassSoilTexture(),
      rockDetail: this._makeRockTexture(),
      asphalt: this._makeAsphaltTexture(),
      bikeAsphalt: this._makeBikeLaneTexture(),
      pavingStone: this._makePavingTexture(),
      roofTile: this._makeRoofTileTexture(),
      windowHouse: this._makeWindowTexture("#1e293b", "#fef08a", 4, 2),
      windowTower: this._makeWindowTexture("#0f172a", "#fde68a", 6, 10)
    };
  }

  static _makeGrassSoilTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#b8c99a";
    ctx.fillRect(0, 0, 256, 256);

    // Bercak tanah & serat rumput berlapis
    for (let i = 0; i < 4800; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random();
      if (r < 0.45) {
        ctx.fillStyle = "rgba(74, 124, 42, 0.26)";
        ctx.fillRect(x, y, 2, 5);
      } else if (r < 0.8) {
        ctx.fillStyle = "rgba(163, 198, 92, 0.24)";
        ctx.fillRect(x, y, 2, 4);
      } else {
        ctx.fillStyle = "rgba(101, 78, 52, 0.22)";
        ctx.fillRect(x, y, 3, 3);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(36, 36);
    return tex;
  }

  static _makeRockTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 3200; i++) {
      const v = 90 + Math.floor(Math.random() * 75);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 4, 2);
    }
    ctx.strokeStyle = "rgba(30, 30, 35, 0.35)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 45; i++) {
      ctx.beginPath();
      const sx = Math.random() * 256;
      const sy = Math.random() * 256;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (Math.random() - 0.5) * 45, sy + (Math.random() - 0.5) * 35);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(28, 28);
    return tex;
  }

  static _makeAsphaltTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6500; i++) {
      const shade = 20 + Math.floor(Math.random() * 30);
      ctx.fillStyle = `rgb(${shade},${shade + 4},${shade + 9})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static _makeBikeLaneTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#15803d";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(22,101,52,0.4)" : "rgba(74,222,128,0.18)";
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(6, 0, 6, 128);
    ctx.fillRect(116, 0, 6, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static _makePavingTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(0, 0, 128, 128);
    const tones = ["#cbd5e1", "#e2e8f0", "#b45309", "#94a3b8"];
    for (let y = 0; y < 128; y += 16) {
      const offset = (y / 16) % 2 === 0 ? 0 : 8;
      for (let x = -8; x < 128; x += 16) {
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
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#b45309";
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) {
      ctx.fillStyle = "rgba(69, 26, 3, 0.35)";
      ctx.fillRect(0, y + 12, 128, 4);
      for (let x = 0; x < 128; x += 16) {
        ctx.fillStyle = "rgba(251, 191, 36, 0.14)";
        ctx.fillRect(x + 2, y + 2, 10, 8);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  static _makeWindowTexture(bgHex, glowHex, cols, rows) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 128, 128);

    const padX = 128 / cols;
    const padY = 128 / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = Math.random() > 0.25 ? glowHex : "#334155";
        ctx.fillRect(c * padX + padX * 0.22, r * padY + padY * 0.22, padX * 0.56, padY * 0.56);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
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
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.8, 780);

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

    // Kontrol Kamera Raycast Ground-Lock
    this.camTarget = new THREE.Vector3(0, 1.8, 0);
    this.camTargetGoal = new THREE.Vector3(0, 1.8, 0);
    this.camRadius = 74;
    this.camRadiusGoal = 74;
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

    // Koleksi Vegetasi Realistis
    this.broadleafData = [];
    this.pineData = [];
    this.grassData = [];
    this.maxBroadleaf = 950;
    this.maxPines = 550;
    this.maxGrass = 3600;

    this._setupLights();
    this._setupWaterShader();
    this._setupTerrainMesh();
    this._setupGridHelper();
    this._setupRealisticVegetation();
    this._setupFallingLeaves();
    this._setupTouchAndMouse();
    this._updateCameraPosition(1);

    window.addEventListener("resize", () => this._onResize());
  }

  _setupLights() {
    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x3f6212, 0.8);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.68);
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

  _setupWaterShader() {
    const waterGeo = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 96, 96);
    waterGeo.rotateX(-Math.PI / 2);

    this.waterUniforms = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.4).normalize() },
      uShallowColor: { value: new THREE.Color(0x0ea5e9) },
      uDeepColor: { value: new THREE.Color(0x0369a1) },
      uSkyColor: { value: new THREE.Color(0xe0f2fe) }
    };

    const waterMat = new THREE.ShaderMaterial({
      uniforms: this.waterUniforms,
      transparent: true,
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vec3 pos = position;
          float w1 = sin(pos.x * 0.35 + uTime * 1.7) * 0.08;
          float w2 = cos(pos.z * 0.42 + uTime * 1.3) * 0.08;
          pos.y += w1 + w2;
          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPosition.xyz;
          vNormal = normalize(vec3(-cos(pos.x * 0.35 + uTime * 1.7) * 0.06, 1.0, sin(pos.z * 0.42 + uTime * 1.3) * 0.06));
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 uShallowColor;
        uniform vec3 uDeepColor;
        uniform vec3 uSkyColor;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
          vec3 halfVec = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(vNormal, halfVec), 0.0), 72.0) * 0.9;
          vec3 col = mix(uDeepColor, uShallowColor, 0.55);
          col = mix(col, uSkyColor, fresnel * 0.58) + vec3(spec);
          gl_FragColor = vec4(col, 0.88);
        }
      `
    });

    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = 0.0;
    this.scene.add(this.waterMesh);
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
      bumpScale: 0.38,
      roughness: 0.9,
      metalness: 0.02
    });

    this.terrainMesh = new THREE.Mesh(this.terrainGeo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.scene.add(this.terrainMesh);
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
        float gust = sin(uWindTime * 2.1 + wOffset.x * 0.25 + wOffset.z * 0.22) * 0.65
                   + cos(uWindTime * 3.4 + wOffset.z * 0.4) * 0.35;
        transformed.x += gust * ${swayStrength.toFixed(3)} * hFactor;
        transformed.z += gust * ${(swayStrength * 0.55).toFixed(3)} * hFactor;
        `
      );
    };
  }

  _setupRealisticVegetation() {
    // 1. POHON RINDANG ORGANIK (Trembesi / Mahoni: Batang bercabang + 4 kluster daun bulat berlapis)
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.32, 2.1, 7);
    trunkGeo.translate(0, 1.05, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.94 });

    const leafMatMain = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.84 });
    const leafMatTop = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.78 });
    const leafMatShade = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.88 });
    this._applyWindShader(leafMatMain, 0.14);
    this._applyWindShader(leafMatTop, 0.18);
    this._applyWindShader(leafMatShade, 0.12);

    const canopyCenterGeo = new THREE.IcosahedronGeometry(1.38, 1);
    canopyCenterGeo.scale(1.15, 0.78, 1.15);
    canopyCenterGeo.translate(0, 2.95, 0);

    const canopyTopGeo = new THREE.IcosahedronGeometry(1.05, 1);
    canopyTopGeo.scale(1.1, 0.72, 1.1);
    canopyTopGeo.translate(0.18, 3.65, -0.12);

    const canopySideGeo = new THREE.IcosahedronGeometry(1.12, 1);
    canopySideGeo.scale(1.18, 0.72, 1.05);
    canopySideGeo.translate(-0.62, 2.55, 0.42);

    this.blTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, this.maxBroadleaf);
    this.blCanopy1 = new THREE.InstancedMesh(canopyCenterGeo, leafMatMain, this.maxBroadleaf);
    this.blCanopy2 = new THREE.InstancedMesh(canopyTopGeo, leafMatTop, this.maxBroadleaf);
    this.blCanopy3 = new THREE.InstancedMesh(canopySideGeo, leafMatShade, this.maxBroadleaf);

    [this.blCanopy1, this.blCanopy2].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
    });
    this.scene.add(this.blTrunks, this.blCanopy1, this.blCanopy2, this.blCanopy3);

    // 2. POHON CEMARA / PINUS PEGUNUNGAN (Khusus lereng tinggi)
    const pineTrunkGeo = new THREE.CylinderGeometry(0.11, 0.22, 1.8, 6);
    pineTrunkGeo.translate(0, 0.9, 0);
    const pineFoliageGeo = new THREE.DodecahedronGeometry(1.05, 0);
    pineFoliageGeo.scale(0.95, 1.85, 0.95);
    pineFoliageGeo.translate(0, 2.6, 0);
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x134e4a, roughness: 0.85 });
    this._applyWindShader(pineMat, 0.11);

    this.pineTrunks = new THREE.InstancedMesh(pineTrunkGeo, trunkMat, this.maxPines);
    this.pineCrowns = new THREE.InstancedMesh(pineFoliageGeo, pineMat, this.maxPines);
    this.pineCrowns.castShadow = true;
    this.scene.add(this.pineTrunks, this.pineCrowns);

    // 3. RUMPUN RUMPUT LIAR & ILALANG BERGOYANG (3.600 rumpun)
    const blade1 = new THREE.PlaneGeometry(0.75, 0.55);
    blade1.translate(0, 0.26, 0);
    const blade2 = blade1.clone();
    blade2.rotateY(Math.PI / 3);
    const blade3 = blade1.clone();
    blade3.rotateY(-Math.PI / 3);

    const grassGeo = this._mergeSimplePlanes([blade1, blade2, blade3]);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4d7c0f,
      side: THREE.DoubleSide,
      roughness: 0.85
    });
    this._applyWindShader(grassMat, 0.26);

    this.grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, this.maxGrass);
    this.scene.add(this.grassMesh);
  }

  _mergeSimplePlanes(geos) {
    const merged = new THREE.BufferGeometry();
    const posArr = [];
    const normArr = [];
    const idxArr = [];
    let vertOffset = 0;

    geos.forEach((g) => {
      const p = g.attributes.position.array;
      const n = g.attributes.normal.array;
      const idx = g.index.array;
      for (let i = 0; i < p.length; i++) posArr.push(p[i]);
      for (let i = 0; i < n.length; i++) normArr.push(n[i]);
      for (let i = 0; i < idx.length; i++) idxArr.push(idx[i] + vertOffset);
      vertOffset += p.length / 3;
    });

    merged.setAttribute("position", new THREE.Float32BufferAttribute(posArr, 3));
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(normArr, 3));
    merged.setIndex(idxArr);
    return merged;
  }

  _setupFallingLeaves() {
    this.leafCount = 220;
    const leafGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.leafCount * 3);
    this.leafVelocities = [];

    for (let i = 0; i < this.leafCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 240;
      positions[i * 3 + 1] = 2 + Math.random() * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 240;
      this.leafVelocities.push({
        vy: 0.45 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2
      });
    }
    leafGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const leafMat = new THREE.PointsMaterial({
      color: 0xa3e635,
      size: 0.34,
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
      let x = pos.getX(i) + Math.sin(elapsed * 1.4 + v.phase) * 0.45 * delta;
      let y = pos.getY(i) - v.vy * delta;
      let z = pos.getZ(i) + Math.cos(elapsed * 1.1 + v.phase) * 0.35 * delta;

      const ground = this.getHeightAt(x, z);
      if (y <= Math.max(0.5, ground + 0.1)) {
        if (this.broadleafData.length > 0) {
          const anchor = this.broadleafData[Math.floor(Math.random() * this.broadleafData.length)];
          x = anchor.x + (Math.random() - 0.5) * 4.0;
          y = anchor.y + 3.2 + Math.random() * 1.5;
          z = anchor.z + (Math.random() - 0.5) * 4.0;
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
      this.blCanopy1.setMatrixAt(i, dummy.matrix);
      this.blCanopy2.setMatrixAt(i, dummy.matrix);
      this.blCanopy3.setMatrixAt(i, dummy.matrix);
    }
    this.blTrunks.instanceMatrix.needsUpdate = true;
    this.blCanopy1.instanceMatrix.needsUpdate = true;
    this.blCanopy2.instanceMatrix.needsUpdate = true;
    this.blCanopy3.instanceMatrix.needsUpdate = true;

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
      this.pineCrowns.setMatrixAt(i, dummy.matrix);
    }
    this.pineTrunks.instanceMatrix.needsUpdate = true;
    this.pineCrowns.instanceMatrix.needsUpdate = true;

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
      scale: scaleOverride || (0.8 + Math.random() * 0.55),
      stretch: 0.9 + Math.random() * 0.3
    });
    this._syncVegetationInstances();
    return true;
  }

  clearVegetationNear(wx, wz, radius) {
    let changed = false;
    for (let i = 0; i < this.broadleafData.length; i++) {
      const t = this.broadleafData[i];
      if (t.active && Math.hypot(t.x - wx, t.z - wz) < radius) {
        t.active = false;
        changed = true;
      }
    }
    for (let i = 0; i < this.pineData.length; i++) {
      const p = this.pineData[i];
      if (p.active && Math.hypot(p.x - wx, p.z - wz) < radius) {
        p.active = false;
        changed = true;
      }
    }
    for (let i = 0; i < this.grassData.length; i++) {
      const g = this.grassData[i];
      if (g.active && Math.hypot(g.x - wx, g.z - wz) < radius + 0.5) {
        g.active = false;
        changed = true;
      }
    }
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

    // Marka Kuning Ganda Median Tol
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

    // Gerbang Tol Nasional di atas daratan kering
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

    // Lampu PJU sepanjang Jalan Tol
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

      // Ratakan koridor akses Jalan Tol di daratan kering masing-masing daerah
      if (this._isInsideStarterHighwayCorridor(region, x, z)) {
        h = 1.68;
      }
      pos.setY(i, h);
    }
    pos.needsUpdate = true;
    this._recolorAndNormals();
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
    this.grassData = [];

    const pos = this.terrainGeo.attributes.position;
    const norm = this.terrainGeo.attributes.normal;

    for (let i = 0; i < pos.count; i += 6) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ny = norm.getY(i);

      if (this._isInsideStarterHighwayCorridor(region, x, z)) continue;
      if (y <= 0.7 || ny <= 0.75) continue;

      // Rumpun Rumput Liar & Ilalang di Lembah dan Tepian Sungai
      if (y < 8.5 && this.grassData.length < this.maxGrass && Math.random() > 0.25) {
        this.grassData.push({
          active: true,
          x: x + (Math.random() - 0.5) * 1.9,
          y: y - 0.02,
          z: z + (Math.random() - 0.5) * 1.9,
          rot: Math.random() * Math.PI * 2,
          scale: 0.75 + Math.random() * 0.75
        });
      }

      // Pohon Rindang Organik di Lembah & Perbukitan Bawah
      if (y >= 1.1 && y < 7.8 && this.broadleafData.length < 720 && Math.random() > 0.74) {
        this.broadleafData.push({
          active: true,
          x: x + (Math.random() - 0.5) * 2.0,
          y,
          z: z + (Math.random() - 0.5) * 2.0,
          rot: Math.random() * Math.PI * 2,
          scale: 0.75 + Math.random() * 0.65,
          stretch: 0.88 + Math.random() * 0.35
        });
      }

      // Pohon Pinus / Cemara di Lereng Gunung Tinggi
      if (y >= 7.8 && y < 18.5 && this.pineData.length < 480 && Math.random() > 0.65) {
        this.pineData.push({
          active: true,
          x: x + (Math.random() - 0.5) * 1.8,
          y,
          z: z + (Math.random() - 0.5) * 1.8,
          rot: Math.random() * Math.PI * 2,
          scale: 0.8 + Math.random() * 0.65,
          stretch: 0.9 + Math.random() * 0.4
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

  // Meratakan secara halus dasar tanah di bawah badan jalan agar tidak miring tajam/renggang
  gradeTerrainForCells(cells) {
    const step = this.worldSize / this.gridSegments;
    const stride = this.gridSegments + 1;
    const pos = this.terrainGeo.attributes.position;
    let changed = false;

    cells.forEach((c) => {
      if (c.groundY < 0.25) return; // Jangan ubah dasar sungai/laut
      const minIx = Math.max(0, Math.floor((c.wx - 2.2 + this.halfSize) / step));
      const maxIx = Math.min(this.gridSegments, Math.ceil((c.wx + 2.2 + this.halfSize) / step));
      const minIz = Math.max(0, Math.floor((c.wz - 2.2 + this.halfSize) / step));
      const maxIz = Math.min(this.gridSegments, Math.ceil((c.wz + 2.2 + this.halfSize) / step));

      for (let iz = minIz; iz <= maxIz; iz++) {
        for (let ix = minIx; ix <= maxIx; ix++) {
          const idx = iz * stride + ix;
          const vy = pos.getY(idx);
          if (vy >= 0.25) {
            pos.setY(idx, vy + (c.groundY - vy) * 0.55);
            changed = true;
          }
        }
      }
    });

    if (changed) {
      pos.needsUpdate = true;
      this._recolorAndNormals();
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
      this.sunLight.intensity = 0.28;
      this.sunLight.color.setHex(0x60a5fa);
      this.hemiLight.intensity = 0.38;
      this.scene.background.setHex(0x090f1d);
      if (this.scene.fog) this.scene.fog.color.setHex(0x090f1d);
      this.waterUniforms.uSkyColor.value.setHex(0x0f172a);
    } else if (isGolden) {
      this.sunLight.intensity = 1.45;
      this.sunLight.color.setHex(0xfdba74);
      this.hemiLight.intensity = 0.68;
      this.scene.background.setHex(0xfed7aa);
      if (this.scene.fog) this.scene.fog.color.setHex(0xfed7aa);
      this.waterUniforms.uSkyColor.value.setHex(0xfdba74);
    } else {
      this.sunLight.intensity = 1.68;
      this.sunLight.color.setHex(0xfffbeb);
      this.hemiLight.intensity = 0.8;
      const baseCol = this.currentRegion ? this.currentRegion.fogColor : 0xdbeafe;
      this.scene.background.setHex(baseCol);
      if (this.scene.fog) this.scene.fog.color.setHex(baseCol);
      this.waterUniforms.uSkyColor.value.setHex(baseCol);
    }

    this.streetLights.forEach((bulb) => {
      bulb.material.color.setHex(isNight || isGolden ? 0xfef08a : 0x475569);
    });

    if (this.onAtmosphereChange) {
      this.onAtmosphereChange(isNight);
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

  // Raycast bidang datar untuk Kamera Ground-Lock agar menggeser ke belakang/samping 100% akurat
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
          this.camRadiusGoal = Math.max(20, Math.min(220, this.camRadiusGoal + zoomDelta));

          let dAngle = angle - lastPinchAngle;
          if (dAngle > Math.PI) dAngle -= Math.PI * 2;
          if (dAngle < -Math.PI) dAngle += Math.PI * 2;
          this.camThetaGoal += dAngle * 0.95;

          const dMidY = midY - lastPinchMidY;
          this.camPhiGoal = Math.max(0.1, Math.min(1.18, this.camPhiGoal - dMidY * 0.0045));
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

    // Dukungan Mouse Desktop
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
        this.camPhiGoal = Math.max(0.1, Math.min(1.18, this.camPhiGoal - (e.clientY - lastMouseY) * 0.006));
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
      this.camRadiusGoal = Math.max(20, Math.min(220, this.camRadiusGoal + e.deltaY * 0.06));
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
