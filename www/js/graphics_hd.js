class NusantaraGraphicsHD {
  constructor(canvas, onTerrainEdit) {
    this.canvas = canvas;
    this.onTerrainEdit = onTerrainEdit;

    this.gridSegments = 72;
    this.worldSize = 140;
    this.halfSize = this.worldSize / 2;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 450);

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

    // Kontrol Kamera Orbit & Pan
    this.camTarget = new THREE.Vector3(0, 1.5, 0);
    this.camRadius = 68;
    this.camTheta = Math.PI * 0.25;
    this.camPhi = Math.PI * 0.31;

    this.activeTool = null; // null | 'raise' | 'lower' | 'flatten' | 'tree' | 'road_preview' | 'bulldoze'
    this.trees = [];
    this.streetLights = [];
    this.clockHour = 7.25;

    this._setupLights();
    this._setupWaterShader();
    this._setupTerrainMesh();
    this._setupStarterHighway();
    this._setupTouchAndMouse();
    this._updateCameraPosition();

    window.addEventListener("resize", () => this._onResize());
  }

  _setupLights() {
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f6212, 0.72);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.55);
    this.sunLight.position.set(45, 65, 35);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 200;
    const d = 65;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
  }

  _setupWaterShader() {
    const waterGeo = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 64, 64);
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
          float w1 = sin(pos.x * 0.45 + uTime * 1.8) * 0.08;
          float w2 = cos(pos.z * 0.52 + uTime * 1.4) * 0.08;
          pos.y += w1 + w2;
          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPosition.xyz;
          vNormal = normalize(vec3(-cos(pos.x * 0.45 + uTime * 1.8) * 0.06, 1.0, sin(pos.z * 0.52 + uTime * 1.4) * 0.06));
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
          float spec = pow(max(dot(vNormal, halfVec), 0.0), 64.0) * 0.85;
          vec3 col = mix(uDeepColor, uShallowColor, 0.55);
          col = mix(col, uSkyColor, fresnel * 0.55) + vec3(spec);
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
      roughness: 0.86,
      metalness: 0.04,
      flatShading: false
    });

    this.terrainMesh = new THREE.Mesh(this.terrainGeo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.scene.add(this.terrainMesh);
  }

  _setupStarterHighway() {
    // Jalan Arteri Awal & Gerbang Tol Masuk Kota sebagai patokan skala
    const group = new THREE.Group();

    const roadGeo = new THREE.BoxGeometry(5.2, 0.16, 26);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 1.55, 22);
    road.receiveShadow = true;
    group.add(road);

    // Marka garis putih & kuning tajam
    const lineGeo = new THREE.BoxGeometry(0.18, 0.18, 25.5);
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const centerLine = new THREE.Mesh(lineGeo, yellowMat);
    centerLine.position.set(0, 1.56, 22);
    group.add(centerLine);

    // Gerbang Tol Nusantara
    const gatePillarGeo = new THREE.BoxGeometry(0.6, 3.2, 0.6);
    const gateMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const leftPillar = new THREE.Mesh(gatePillarGeo, gateMat);
    leftPillar.position.set(-2.7, 3.1, 33);
    leftPillar.castShadow = true;
    const rightPillar = new THREE.Mesh(gatePillarGeo, gateMat);
    rightPillar.position.set(2.7, 3.1, 33);
    rightPillar.castShadow = true;

    const roofGeo = new THREE.BoxGeometry(6.6, 0.75, 1.8);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 4.8, 33);
    roof.castShadow = true;

    group.add(leftPillar, rightPillar, roof);

    // Lampu Jalan PJU
    for (let z = 11; z <= 31; z += 6.5) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 2.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x64748b })
      );
      pole.position.set(2.8, 2.9, z);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      bulb.position.set(2.5, 4.25, z);
      group.add(pole, bulb);
      this.streetLights.push(bulb);
    }

    this.starterRoad = group;
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
      // Pastikan area sekitar gerbang tol awal tetap rata (y ~ 1.5)
      const distGate = Math.hypot(x, z - 22);
      let h = window.generateRegionHeight(region, x, z, this.halfSize);
      if (distGate < 14) {
        const blend = Math.max(0, (distGate - 7) / 7);
        h = 1.5 * (1 - blend) + h * blend;
      }
      pos.setY(i, h);
    }
    pos.needsUpdate = true;
    this._recolorAndNormals();
    this._populateInitialTrees();
  }

  _recolorAndNormals() {
    const pos = this.terrainGeo.attributes.position;
    const col = this.terrainGeo.attributes.color;
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < -0.3) {
        c.setHex(0x1e3a5f); // Dasar sungai / laut dalam
      } else if (y < 0.45) {
        c.setHex(0xd6c79c); // Pasir / tepian sungai
      } else if (y < 4.5) {
        c.setHex(0x4d7c0f); // Rumput hijau lembah subur
      } else if (y < 10.5) {
        c.setHex(0x365314); // Lereng hutan pinus gelap
      } else {
        c.setHex(0x64748b); // Puncak batu pegunungan
      }
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    this.terrainGeo.computeVertexNormals();
  }

  _populateInitialTrees() {
    this.trees.forEach((t) => this.scene.remove(t));
    this.trees = [];

    const pos = this.terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i += 7) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (y > 2.3 && y < 11.5 && Math.hypot(x, z - 22) > 13 && Math.random() > 0.35) {
        this.addTreeAt(x, y, z, true);
      }
    }
  }

  addTreeAt(x, y, z, silent = false) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.2, 0.9, 5),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
    );
    trunk.position.y = 0.45;

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 2.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 })
    );
    leaves.position.y = 1.9;
    leaves.castShadow = true;

    tree.add(trunk, leaves);
    const scale = 0.8 + Math.random() * 0.55;
    tree.scale.set(scale, scale, scale);
    tree.position.set(x, y, z);
    this.scene.add(tree);
    this.trees.push(tree);
    if (!silent && this.onTerrainEdit) this.onTerrainEdit("tree");
  }

  sculptAt(worldX, worldZ, mode) {
    if (mode === "tree") {
      const y = this.getHeightAt(worldX, worldZ);
      if (y > 0.4) {
        this.addTreeAt(worldX + (Math.random() - 0.5) * 1.4, y, worldZ + (Math.random() - 0.5) * 1.4);
      }
      return;
    }

    if (mode === "bulldoze") {
      for (let i = this.trees.length - 1; i >= 0; i--) {
        if (Math.hypot(this.trees[i].position.x - worldX, this.trees[i].position.z - worldZ) < 4.5) {
          this.scene.remove(this.trees[i]);
          this.trees.splice(i, 1);
        }
      }
      if (this.onTerrainEdit) this.onTerrainEdit("bulldoze");
      return;
    }

    const radius = 8.5;
    const pos = this.terrainGeo.attributes.position;
    let changed = false;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const dist = Math.hypot(vx - worldX, vz - worldZ);
      if (dist < radius) {
        const falloff = Math.cos((dist / radius) * (Math.PI / 2));
        let vy = pos.getY(i);
        if (mode === "raise") vy = Math.min(24, vy + 0.55 * falloff);
        if (mode === "lower") vy = Math.max(-4.5, vy - 0.55 * falloff);
        if (mode === "flatten") vy = vy + (1.55 - vy) * 0.35 * falloff;
        pos.setY(i, vy);
        changed = true;
      }
    }

    if (changed) {
      pos.needsUpdate = true;
      this._recolorAndNormals();
      if (this.onTerrainEdit) this.onTerrainEdit(mode);
    }
  }

  getHeightAt(worldX, worldZ) {
    const pos = this.terrainGeo.attributes.position;
    let bestY = 1.5;
    let minD = Infinity;
    for (let i = 0; i < pos.count; i++) {
      const d = Math.hypot(pos.getX(i) - worldX, pos.getZ(i) - worldZ);
      if (d < minD) {
        minD = d;
        bestY = pos.getY(i);
      }
    }
    return bestY;
  }

  updateAtmosphere(hour) {
    this.clockHour = hour;
    const isNight = hour < 5.5 || hour > 18.5;
    const isGolden = (hour >= 5.5 && hour <= 7.5) || (hour >= 16.5 && hour <= 18.5);

    const sunAngle = ((hour - 6) / 24) * Math.PI * 2;
    this.sunLight.position.set(Math.cos(sunAngle) * 70, Math.max(12, Math.sin(sunAngle) * 75), 35);
    this.waterUniforms.uSunDir.value.copy(this.sunLight.position).normalize();

    if (isNight) {
      this.sunLight.intensity = 0.25;
      this.sunLight.color.setHex(0x60a5fa);
      this.hemiLight.intensity = 0.35;
      this.scene.background.setHex(0x090f1d);
      if (this.scene.fog) this.scene.fog.color.setHex(0x090f1d);
      this.waterUniforms.uSkyColor.value.setHex(0x0f172a);
    } else if (isGolden) {
      this.sunLight.intensity = 1.35;
      this.sunLight.color.setHex(0xfdba74);
      this.hemiLight.intensity = 0.65;
      this.scene.background.setHex(0xfed7aa);
      if (this.scene.fog) this.scene.fog.color.setHex(0xfed7aa);
      this.waterUniforms.uSkyColor.value.setHex(0xfdba74);
    } else {
      this.sunLight.intensity = 1.6;
      this.sunLight.color.setHex(0xfffbeb);
      this.hemiLight.intensity = 0.78;
      const baseCol = this.currentRegion ? this.currentRegion.fogColor : 0xdbeafe;
      this.scene.background.setHex(baseCol);
      if (this.scene.fog) this.scene.fog.color.setHex(baseCol);
      this.waterUniforms.uSkyColor.value.setHex(baseCol);
    }

    this.streetLights.forEach((bulb) => {
      bulb.material.color.setHex(isNight || isGolden ? 0xfef08a : 0x475569);
    });
  }

  _updateCameraPosition() {
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

  _setupTouchAndMouse() {
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastPinchDist = 0;
    let lastPinchAngle = 0;

    const panCamera = (dx, dy) => {
      const panSpeed = this.camRadius * 0.0016;
      const forward = new THREE.Vector3(-Math.cos(this.camTheta), 0, -Math.sin(this.camTheta));
      const right = new THREE.Vector3(-Math.sin(this.camTheta), 0, Math.cos(this.camTheta));
      this.camTarget.addScaledVector(right, -dx * panSpeed);
      this.camTarget.addScaledVector(forward, dy * panSpeed);
      this.camTarget.x = Math.max(-52, Math.min(52, this.camTarget.x));
      this.camTarget.z = Math.max(-52, Math.min(52, this.camTarget.z));
      this._updateCameraPosition();
    };

    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        if (this.activeTool) {
          const pt = this._raycastTerrain(lastX, lastY);
          if (pt) this.sculptAt(pt.x, pt.z, this.activeTool);
        }
      } else if (e.touches.length === 2) {
        isDragging = false;
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        lastPinchDist = Math.hypot(dx, dy);
        lastPinchAngle = Math.atan2(dy, dx);
      }
    }, { passive: true });

    this.canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1 && isDragging) {
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        if (this.activeTool) {
          const pt = this._raycastTerrain(x, y);
          if (pt) this.sculptAt(pt.x, pt.z, this.activeTool);
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

        if (lastPinchDist > 0) {
          const zoomDelta = (lastPinchDist - dist) * 0.14;
          this.camRadius = Math.max(20, Math.min(115, this.camRadius + zoomDelta));
          this.camTheta += (angle - lastPinchAngle) * 0.9;
          this._updateCameraPosition();
        }
        lastPinchDist = dist;
        lastPinchAngle = angle;
      }
    }, { passive: true });

    this.canvas.addEventListener("touchend", () => {
      isDragging = false;
      lastPinchDist = 0;
    });

    // Dukungan Mouse (jika dites di PC)
    this.canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      if (this.activeTool && e.button === 0) {
        const pt = this._raycastTerrain(lastX, lastY);
        if (pt) this.sculptAt(pt.x, pt.z, this.activeTool);
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      if (this.activeTool && e.buttons === 1) {
        const pt = this._raycastTerrain(e.clientX, e.clientY);
        if (pt) this.sculptAt(pt.x, pt.z, this.activeTool);
      } else if (e.buttons === 2) {
        this.camTheta += (e.clientX - lastX) * 0.008;
        this._updateCameraPosition();
      } else {
        panCamera(e.clientX - lastX, e.clientY - lastY);
      }
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener("mouseup", () => { isDragging = false; });
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("wheel", (e) => {
      this.camRadius = Math.max(20, Math.min(115, this.camRadius + e.deltaY * 0.04));
      this._updateCameraPosition();
    }, { passive: true });
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(delta) {
    this.waterUniforms.uTime.value += delta;
    this.renderer.render(this.scene, this.camera);
  }
}
