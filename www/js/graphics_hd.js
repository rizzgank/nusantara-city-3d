class ProceduralHDTextures {
  static createAll() {
    return {
      terrainBump: this._makeNoiseTexture(256, 256, 40),
      asphalt: this._makeAsphaltTexture(),
      roofTile: this._makeRoofTileTexture(),
      windowHouse: this._makeWindowTexture("#1e293b", "#fef08a", 4, 2),
      windowTower: this._makeWindowTexture("#0f172a", "#fde68a", 6, 10)
    };
  }

  static _makeNoiseTexture(w, h, intensity) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * intensity;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(28, 28);
    return tex;
  }

  static _makeAsphaltTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2400; i++) {
      const shade = 22 + Math.floor(Math.random() * 24);
      ctx.fillStyle = `rgb(${shade},${shade + 4},${shade + 10})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
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

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.8, 750);

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

    // Kontrol Kamera Pro (Target + Smooth Damping + Tilt Pitch)
    this.camTarget = new THREE.Vector3(0, 1.8, 36);
    this.camTargetGoal = new THREE.Vector3(0, 1.8, 36);
    this.camRadius = 78;
    this.camRadiusGoal = 78;
    this.camTheta = Math.PI * 0.25;
    this.camThetaGoal = Math.PI * 0.25;
    this.camPhi = 0.68; // ~39 derajat sudut 3D nyaman
    this.camPhiGoal = 0.68;
    this.isTopDownView = false;

    this.activeTool = null;
    this.streetLights = [];
    this.clockHour = 7.5;
    this.onAtmosphereChange = null;

    // Instanced Trees (1.600+ pohon rimbun berlapis)
    this.treeData = [];
    this.maxTrees = 1800;

    this._setupLights();
    this._setupWaterShader();
    this._setupTerrainMesh();
    this._setupGridHelper();
    this._setupInstancedTrees();
    this._setupStarterHighway();
    this._setupTouchAndMouse();
    this._updateCameraPosition(1);

    window.addEventListener("resize", () => this._onResize());
  }

  _setupLights() {
    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x3f6212, 0.78);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.65);
    this.sunLight.position.set(85, 130, 65);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 15;
    this.sunLight.shadow.camera.far = 360;
    const d = 115;
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
          float w1 = sin(pos.x * 0.35 + uTime * 1.7) * 0.09;
          float w2 = cos(pos.z * 0.42 + uTime * 1.3) * 0.09;
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
      bumpMap: this.textures.terrainBump,
      bumpScale: 0.25,
      roughness: 0.88,
      metalness: 0.03
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
    this.gridHelper.material.opacity = 0.22;
    this.gridHelper.visible = false;
    this.scene.add(this.gridHelper);
  }

  setGridVisible(visible) {
    this.gridHelper.visible = visible;
  }

  _setupInstancedTrees() {
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.24, 1.4, 6);
    trunkGeo.translate(0, 0.7, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.92 });

    const tier1Geo = new THREE.ConeGeometry(1.25, 2.0, 7);
    tier1Geo.translate(0, 2.1, 0);
    const tier1Mat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.82 });

    const tier2Geo = new THREE.ConeGeometry(0.92, 1.8, 7);
    tier2Geo.translate(0, 3.2, 0);
    const tier2Mat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });

    const tier3Geo = new THREE.ConeGeometry(0.58, 1.5, 7);
    tier3Geo.translate(0, 4.2, 0);
    const tier3Mat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });

    this.treeTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, this.maxTrees);
    this.treeTier1 = new THREE.InstancedMesh(tier1Geo, tier1Mat, this.maxTrees);
    this.treeTier2 = new THREE.InstancedMesh(tier2Geo, tier2Mat, this.maxTrees);
    this.treeTier3 = new THREE.InstancedMesh(tier3Geo, tier3Mat, this.maxTrees);

    [this.treeTier1, this.treeTier2].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
    });

    this.scene.add(this.treeTrunks, this.treeTier1, this.treeTier2, this.treeTier3);
  }

  _syncTreeInstances() {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.maxTrees; i++) {
      const t = this.treeData[i];
      if (!t || !t.active) {
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
      } else {
        dummy.position.set(t.x, t.y, t.z);
        dummy.rotation.y = t.rot;
        dummy.scale.set(t.scale, t.scale * t.heightStretch, t.scale);
      }
      dummy.updateMatrix();
      this.treeTrunks.setMatrixAt(i, dummy.matrix);
      this.treeTier1.setMatrixAt(i, dummy.matrix);
      this.treeTier2.setMatrixAt(i, dummy.matrix);
      this.treeTier3.setMatrixAt(i, dummy.matrix);
    }
    this.treeTrunks.instanceMatrix.needsUpdate = true;
    this.treeTier1.instanceMatrix.needsUpdate = true;
    this.treeTier2.instanceMatrix.needsUpdate = true;
    this.treeTier3.instanceMatrix.needsUpdate = true;
  }

  addTreeAt(x, y, z) {
    if (this.treeData.length >= this.maxTrees) return false;
    this.treeData.push({
      active: true,
      x,
      y,
      z,
      rot: Math.random() * Math.PI * 2,
      scale: 0.75 + Math.random() * 0.65,
      heightStretch: 0.85 + Math.random() * 0.45
    });
    this._syncTreeInstances();
    return true;
  }

  clearTreesNear(wx, wz, radius) {
    let changed = false;
    for (let i = 0; i < this.treeData.length; i++) {
      const t = this.treeData[i];
      if (t.active && Math.hypot(t.x - wx, t.z - wz) < radius) {
        t.active = false;
        changed = true;
      }
    }
    if (changed) this._syncTreeInstances();
  }

  _setupStarterHighway() {
    // Jalan Tol Arteri Nasional di Selatan (x = -4..+4, z = 64..160)
    const group = new THREE.Group();
    const roadLen = 96;
    const centerZ = 112;

    const roadMat = new THREE.MeshStandardMaterial({
      map: this.textures.asphalt,
      roughness: 0.78
    });
    const road = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.18, roadLen), roadMat);
    road.position.set(0, 1.72, centerZ);
    road.receiveShadow = true;
    group.add(road);

    // Pembatas Beton Median & Marka Kuning
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const lineL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, roadLen), yellowMat);
    lineL.position.set(-0.22, 1.73, centerZ);
    const lineR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, roadLen), yellowMat);
    lineR.position.set(0.22, 1.73, centerZ);
    group.add(lineL, lineR);

    // Gerbang Tol Nusantara Megah
    const gateZ = 136;
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    [-4.1, 0, 4.1].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.8, 1.1), pillarMat);
      pillar.position.set(px, 3.6, gateZ);
      pillar.castShadow = true;
      group.add(pillar);
    });

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(10.4, 0.95, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })
    );
    canopy.position.set(0, 5.75, gateZ);
    canopy.castShadow = true;
    group.add(canopy);

    // Lampu PJU sepanjang Jalan Tol Awal
    for (let z = 68; z <= 152; z += 12) {
      [-4.1, 4.1].forEach((lx) => {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.11, 3.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x64748b })
        );
        pole.position.set(lx, 3.4, z);
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xfef08a })
        );
        bulb.position.set(lx * 0.88, 5.05, z);
        group.add(pole, bulb);
        this.streetLights.push(bulb);
      });
    }

    this.scene.add(group);
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

      // Pastikan koridor Gerbang Tol & pintu masuk selatan tetap rata (y = 1.68)
      if (Math.abs(x) < 18 && z > 54) {
        const edgeX = Math.max(0, (Math.abs(x) - 10) / 8);
        const edgeZ = Math.max(0, (64 - z) / 10);
        const blend = Math.min(1, Math.max(edgeX, edgeZ));
        h = 1.68 * (1 - blend) + h * blend;
      }
      pos.setY(i, h);
    }
    pos.needsUpdate = true;
    this._recolorAndNormals();
    this._populateInitialTrees();

    this.camTarget.set(0, 1.8, 42);
    this.camTargetGoal.set(0, 1.8, 42);
    this.camRadiusGoal = 76;
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
      const ny = norm.getY(i); // 1.0 = datar, < 0.72 = tebing curam

      if (y < -0.25) {
        c.setHex(0x1e3a5f); // Dasar sungai / laut dalam
      } else if (y < 0.55) {
        c.setHex(0xd6c79c); // Pasir pantai / kerikil sungai
      } else if (ny < 0.74 || y > 17.5) {
        c.setHex(0x475569); // Tebing batu vulkanik terjal
      } else if (y < 5.5) {
        c.setHex(0x4d7c0f); // Rumput lembah subur
      } else if (y < 12.5) {
        c.setHex(0x365314); // Lereng pegunungan hijau tua
      } else {
        c.setHex(0x57534e); // Puncak gunung berbatu
      }
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }

  _populateInitialTrees() {
    this.treeData = [];
    const pos = this.terrainGeo.attributes.position;
    const norm = this.terrainGeo.attributes.normal;

    for (let i = 0; i < pos.count; i += 14) {
      if (this.treeData.length >= 1450) break;
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ny = norm.getY(i);

      // Hindari koridor jalan tol awal & area sungai/laut
      if (Math.abs(x) < 14 && z > 54) continue;
      if (y > 1.2 && y < 17.5 && ny > 0.76 && Math.random() > 0.35) {
        this.treeData.push({
          active: true,
          x: x + (Math.random() - 0.5) * 1.8,
          y,
          z: z + (Math.random() - 0.5) * 1.8,
          rot: Math.random() * Math.PI * 2,
          scale: 0.75 + Math.random() * 0.7,
          heightStretch: 0.85 + Math.random() * 0.45
        });
      }
    }
    this._syncTreeInstances();
  }

  // Pencarian ketinggian tanah O(1) dengan interpolasi bilinear
  getHeightAt(wx, wz) {
    const step = this.worldSize / this.gridSegments; // 2.0
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
      this.sunLight.intensity = 1.65;
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

  _isTerrainSculptTool(tool) {
    return tool === "raise" || tool === "lower" || tool === "flatten" || tool === "tree";
  }

  _setupTouchAndMouse() {
    let isOneFingerDown = false;
    let lastX = 0;
    let lastY = 0;
    let lastPinchDist = 0;
    let lastPinchAngle = 0;
    let lastPinchMidY = 0;

    const panCamera = (dx, dy) => {
      const panSpeed = this.camRadiusGoal * 0.00145;
      const forward = new THREE.Vector3(-Math.cos(this.camThetaGoal), 0, -Math.sin(this.camThetaGoal));
      const right = new THREE.Vector3(-Math.sin(this.camThetaGoal), 0, Math.cos(this.camThetaGoal));
      this.camTargetGoal.addScaledVector(right, -dx * panSpeed);
      this.camTargetGoal.addScaledVector(forward, dy * panSpeed);
      this.camTargetGoal.x = Math.max(-135, Math.min(135, this.camTargetGoal.x));
      this.camTargetGoal.z = Math.max(-135, Math.min(135, this.camTargetGoal.z));
    };

    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        isOneFingerDown = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;

        if (this.activeTool) {
          const pt = this._raycastTerrain(lastX, lastY);
          if (pt) {
            if (this._isTerrainSculptTool(this.activeTool)) {
              this.sculptTerrainAt(pt.x, pt.z, this.activeTool);
              if (this.callbacks.onTerrainSculpt) this.callbacks.onTerrainSculpt(this.activeTool);
            } else if (this.callbacks.onSelectionStart) {
              this.callbacks.onSelectionStart(pt.x, pt.z, this.activeTool);
            }
          }
        }
      } else if (e.touches.length === 2) {
        isOneFingerDown = false;
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        lastPinchDist = Math.hypot(dx, dy);
        lastPinchAngle = Math.atan2(dy, dx);
        lastPinchMidY = (e.touches[0].clientY + e.touches[1].clientY) * 0.5;
      }
    }, { passive: true });

    this.canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1 && isOneFingerDown) {
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        if (this.activeTool) {
          const pt = this._raycastTerrain(x, y);
          if (pt) {
            if (this._isTerrainSculptTool(this.activeTool)) {
              this.sculptTerrainAt(pt.x, pt.z, this.activeTool);
              if (this.callbacks.onTerrainSculpt) this.callbacks.onTerrainSculpt(this.activeTool);
            } else if (this.callbacks.onSelectionMove) {
              this.callbacks.onSelectionMove(pt.x, pt.z, this.activeTool);
            }
          }
        } else {
          panCamera(x - lastX, y - lastY);
        }
        lastX = x;
        lastY = y;
      } else if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const midY = (e.touches[0].clientY + e.touches[1].clientY) * 0.5;

        if (lastPinchDist > 0) {
          // 1. Pinch Zoom (22 sampai 220 unit)
          const zoomDelta = (lastPinchDist - dist) * 0.24;
          this.camRadiusGoal = Math.max(22, Math.min(220, this.camRadiusGoal + zoomDelta));

          // 2. Twist Orbit 360 derajat
          let dAngle = angle - lastPinchAngle;
          if (dAngle > Math.PI) dAngle -= Math.PI * 2;
          if (dAngle < -Math.PI) dAngle += Math.PI * 2;
          this.camThetaGoal += dAngle * 0.95;

          // 3. Two-finger vertical drag untuk Tilt Pitch (Top-down <-> Low-angle 3D)
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
      lastPinchDist = 0;
    });

    // Dukungan Mouse (jika dites di PC)
    this.canvas.addEventListener("mousedown", (e) => {
      isOneFingerDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
      if (this.activeTool && e.button === 0) {
        const pt = this._raycastTerrain(lastX, lastY);
        if (pt) {
          if (this._isTerrainSculptTool(this.activeTool)) {
            this.sculptTerrainAt(pt.x, pt.z, this.activeTool);
          } else if (this.callbacks.onSelectionStart) {
            this.callbacks.onSelectionStart(pt.x, pt.z, this.activeTool);
          }
        }
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
        this.camThetaGoal += (e.clientX - lastX) * 0.008;
        this.camPhiGoal = Math.max(0.1, Math.min(1.18, this.camPhiGoal - (e.clientY - lastY) * 0.006));
      } else {
        panCamera(e.clientX - lastX, e.clientY - lastY);
      }
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener("mouseup", () => {
      if (isOneFingerDown && this.activeTool && !this._isTerrainSculptTool(this.activeTool)) {
        if (this.callbacks.onSelectionEnd) this.callbacks.onSelectionEnd();
      }
      isOneFingerDown = false;
    });

    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("wheel", (e) => {
      this.camRadiusGoal = Math.max(22, Math.min(220, this.camRadiusGoal + e.deltaY * 0.06));
    }, { passive: true });
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(delta) {
    this._updateCameraPosition(Math.min(1, delta * 12));
    this.waterUniforms.uTime.value += delta;
    this.renderer.render(this.scene, this.camera);
  }
}
