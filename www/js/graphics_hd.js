(function () {
  class NusantaraGraphicsHD {
    constructor(canvas, callbacks = {}) {
      this.canvas = canvas;
      this.callbacks = callbacks;
      this.activeTool = null;
      this.onAtmosphereChange = null;
      this.zoomSpeedMult = 1.0;

      this.worldSize = 320;
      this.halfExtent = 160;
      this.segments = 128;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x7dd3fc);
      this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.002);

      this.camera = new THREE.PerspectiveCamera(
        46,
        window.innerWidth / window.innerHeight,
        0.5,
        950
      );

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: "high-performance"
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Kamera Orbit
      this.camTarget = new THREE.Vector3(0, 2, 0);
      this.camTheta = 0.65;
      this.camThetaGoal = 0.65;
      this.camPhi = 0.95;
      this.camPhiGoal = 0.95;
      this.camRadius = 92;
      this.camRadiusGoal = 92;
      this.isTopDown = false;

      // Pencahayaan HD
      this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x365314, 0.92);
      this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
      this.sunLight.position.set(95, 145, 75);
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(2048, 2048);
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 420;
      const d = 155;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
      this.scene.add(this.hemiLight, this.sunLight);

      // Grid Overlay
      this.gridHelper = new THREE.GridHelper(this.worldSize, 80, 0x38bdf8, 0x1e293b);
      this.gridHelper.position.y = 0.15;
      this.gridHelper.material.transparent = true;
      this.gridHelper.material.opacity = 0.25;
      this.gridHelper.visible = false;
      this.scene.add(this.gridHelper);

      this.terrainGeo = null;
      this.terrainMesh = null;
      this.waterMesh = null;
      this._waterTime = 0;

      // Grup Alam: Awan 3D, Pepohonan Detail, dan Hamparan Rumput Instanced
      this.cloudsGroup = new THREE.Group();
      this.treesGroup = new THREE.Group();
      this.grassInstanced = null;
      this.grassData = [];
      this._dummy = new THREE.Object3D();
      this.scene.add(this.cloudsGroup, this.treesGroup);

      this.raycaster = new THREE.Raycaster();
      this.pointerNDC = new THREE.Vector2();

      this._buildSharedNatureAssets();
      this._buildSkyClouds();
      this._initControls();
      window.addEventListener("resize", () => this._onResize());
    }

    _onResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    _buildSharedNatureAssets() {
      // Material berbagi pakai agar FPS tinggi di iPhone
      this.matTrunkDark = new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.92 });
      this.matTrunkPalm = new THREE.MeshStandardMaterial({ color: 0x6b4c35, roughness: 0.88 });
      this.matLeafDeep = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.78 });
      this.matLeafMid = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.74 });
      this.matLeafBright = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 });
      this.matPine = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.8 });
      this.matCloud = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xe2e8f0,
        emissiveIntensity: 0.12,
        roughness: 0.95,
        transparent: true,
        opacity: 0.92
      });

      // Geometri Rumpun Rumput 3 Helai Menyilang
      const bladeGeo = new THREE.ConeGeometry(0.14, 0.75, 4);
      bladeGeo.translate(0, 0.36, 0);
      this.grassBladeGeo = bladeGeo;
      this.grassBladeMat = new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        roughness: 0.82,
        side: THREE.DoubleSide
      });
    }

    _buildSkyClouds() {
      while (this.cloudsGroup.children.length > 0) {
        this.cloudsGroup.remove(this.cloudsGroup.children[0]);
      }

      const puffGeo = new THREE.DodecahedronGeometry(1, 1);
      for (let i = 0; i < 24; i++) {
        const cloud = new THREE.Group();
        const puffs = 4 + (i % 4);
        for (let p = 0; p < puffs; p++) {
          const m = new THREE.Mesh(puffGeo, this.matCloud);
          const rx = (p - puffs / 2) * 3.8 + (Math.random() - 0.5) * 2.2;
          const ry = (p % 2 === 0 ? 0.9 : 0) + Math.random() * 0.8;
          const rz = (Math.random() - 0.5) * 3.5;
          const sx = 4.2 + Math.random() * 3.2;
          const sy = 2.1 + Math.random() * 1.4;
          const sz = 3.4 + Math.random() * 2.6;
          m.position.set(rx, ry, rz);
          m.scale.set(sx, sy, sz);
          cloud.add(m);
        }
        cloud.position.set(
          (Math.random() - 0.5) * 340,
          56 + Math.random() * 22,
          (Math.random() - 0.5) * 340
        );
        cloud.userData.driftSpeed = 0.85 + Math.random() * 1.15;
        this.cloudsGroup.add(cloud);
      }
    }

    loadRegion(region) {
      this.currentRegion = region;
      this.scene.background = new THREE.Color(region.fogColor || 0xbae6fd);
      this.scene.fog = new THREE.FogExp2(region.fogColor || 0xbae6fd, 0.0019);

      if (this.terrainMesh) {
        this.scene.remove(this.terrainMesh);
        this.terrainGeo.dispose();
      }
      if (this.waterMesh) {
        this.scene.remove(this.waterMesh);
        this.waterMesh.geometry.dispose();
      }
      while (this.treesGroup.children.length > 0) {
        this.treesGroup.remove(this.treesGroup.children[0]);
      }
      if (this.grassInstanced) {
        this.scene.remove(this.grassInstanced);
        this.grassInstanced.dispose();
        this.grassInstanced = null;
      }

      this.terrainGeo = new THREE.PlaneGeometry(
        this.worldSize,
        this.worldSize,
        this.segments,
        this.segments
      );
      this.terrainGeo.rotateX(-Math.PI / 2);

      const pos = this.terrainGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const wx = pos.getX(i);
        const wz = pos.getZ(i);
        const h =
          typeof window.generateRegionHeight === "function"
            ? window.generateRegionHeight(region, wx, wz, this.halfExtent)
            : 1.0;
        pos.setY(i, h);
      }
      pos.needsUpdate = true;

      this._recolorAndNormals();

      const tMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.86,
        metalness: 0.03
      });
      this.terrainMesh = new THREE.Mesh(this.terrainGeo, tMat);
      this.terrainMesh.receiveShadow = true;
      this.scene.add(this.terrainMesh);

      const wGeo = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 48, 48);
      wGeo.rotateX(-Math.PI / 2);
      const wMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.14,
        metalness: 0.3,
        transparent: true,
        opacity: 0.86
      });
      this.waterMesh = new THREE.Mesh(wGeo, wMat);
      this.waterMesh.position.y = region.waterLevel !== undefined ? region.waterLevel : -0.25;
      this.scene.add(this.waterMesh);

      this._populateInitialVegetation(region);
      this.camTarget.set(0, 2, 0);
      this.camRadiusGoal = 92;
    }

    _recolorAndNormals() {
      const pos = this.terrainGeo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const c = new THREE.Color();

      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const y = pos.getY(i);
        const vz = pos.getZ(i);
        const wave = Math.sin(vx * 0.14) * Math.cos(vz * 0.14) * 0.03;

        if (y < -0.1) c.setHex(0x1e3a5f);
        else if (y < 0.55) c.setHex(0xe5d3a1);
        else if (y > 16.5) c.setHex(0x64748b);
        else if (y < 6.5) c.setHex(0x4d7c0f);
        else c.setHex(0x365314);

        c.offsetHSL(0, wave, wave * 0.6);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      this.terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      this.terrainGeo.computeVertexNormals();
    }

    getHeightAt(wx, wz) {
      if (!this.terrainGeo) return 0;
      const clampedX = Math.max(-this.halfExtent, Math.min(this.halfExtent, wx));
      const clampedZ = Math.max(-this.halfExtent, Math.min(this.halfExtent, wz));

      const fx = ((clampedX + this.halfExtent) / this.worldSize) * this.segments;
      const fz = ((clampedZ + this.halfExtent) / this.worldSize) * this.segments;

      const x0 = Math.floor(fx);
      const z0 = Math.floor(fz);
      const x1 = Math.min(this.segments, x0 + 1);
      const z1 = Math.min(this.segments, z0 + 1);
      const tx = fx - x0;
      const tz = fz - z0;

      const stride = this.segments + 1;
      const pos = this.terrainGeo.attributes.position;
      const h00 = pos.getY(z0 * stride + x0);
      const h10 = pos.getY(z0 * stride + x1);
      const h01 = pos.getY(z1 * stride + x0);
      const h11 = pos.getY(z1 * stride + x1);

      const h0 = h00 * (1 - tx) + h10 * tx;
      const h1 = h01 * (1 - tx) + h11 * tx;
      return h0 * (1 - tz) + h1 * tz;
    }

    sculptTerrain(wx, wz, mode, radius = 10) {
      if (!this.terrainGeo) return;
      const pos = this.terrainGeo.attributes.position;
      const targetY = this.getHeightAt(wx, wz);

      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        const dist = Math.hypot(vx - wx, vz - wz);
        if (dist <= radius) {
          const falloff = Math.cos((dist / radius) * (Math.PI / 2));
          let vy = pos.getY(i);
          if (mode === "raise") vy = Math.min(34, vy + 1.15 * falloff);
          else if (mode === "lower") vy = Math.max(-4.5, vy - 1.15 * falloff);
          else if (mode === "flatten") vy = vy + (targetY - vy) * 0.65 * falloff;
          pos.setY(i, vy);
        }
      }
      pos.needsUpdate = true;
      this._recolorAndNormals();
    }

    // =========================================================
    // POHON 3 SPESIES DETAIL (BERINGIN, CEMARA GUNUNG, PALEM PESISIR)
    // =========================================================
    _createTreeMesh(scale = 1, species = "beringin") {
      const g = new THREE.Group();

      if (species === "palm") {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11 * scale, 0.2 * scale, 3.2 * scale, 6),
          this.matTrunkPalm
        );
        trunk.position.y = 1.6 * scale;
        trunk.rotation.z = 0.08;
        trunk.castShadow = true;
        g.add(trunk);

        for (let f = 0; f < 6; f++) {
          const frond = new THREE.Mesh(
            new THREE.BoxGeometry(0.26 * scale, 0.06 * scale, 1.85 * scale),
            this.matLeafBright
          );
          const ang = (f / 6) * Math.PI * 2;
          frond.position.set(
            Math.sin(ang) * 0.72 * scale + 0.14 * scale,
            3.15 * scale,
            Math.cos(ang) * 0.72 * scale
          );
          frond.rotation.y = ang;
          frond.rotation.x = 0.42;
          frond.castShadow = true;
          g.add(frond);
        }
        return g;
      }

      if (species === "pine") {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14 * scale, 0.26 * scale, 1.8 * scale, 6),
          this.matTrunkDark
        );
        trunk.position.y = 0.9 * scale;
        trunk.castShadow = true;
        g.add(trunk);

        const tiers = [
          { r: 1.35, h: 1.7, y: 2.0 },
          { r: 1.05, h: 1.5, y: 2.95 },
          { r: 0.7, h: 1.3, y: 3.8 }
        ];
        tiers.forEach((t, idx) => {
          const cone = new THREE.Mesh(
            new THREE.ConeGeometry(t.r * scale, t.h * scale, 7),
            idx === 2 ? this.matLeafMid : this.matPine
          );
          cone.position.y = t.y * scale;
          cone.castShadow = true;
          g.add(cone);
        });
        return g;
      }

      // Default: Pohon Beringin / Trembesi Rindang Berlapis
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * scale, 0.34 * scale, 1.75 * scale, 7),
        this.matTrunkDark
      );
      trunk.position.y = 0.88 * scale;
      trunk.castShadow = true;
      g.add(trunk);

      const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25 * scale, 1), this.matLeafDeep);
      c1.position.set(-0.32 * scale, 2.15 * scale, 0.18 * scale);
      c1.castShadow = true;

      const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 * scale, 1), this.matLeafMid);
      c2.position.set(0.45 * scale, 2.35 * scale, -0.22 * scale);
      c2.castShadow = true;

      const c3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95 * scale, 1), this.matLeafBright);
      c3.position.set(0.05 * scale, 2.85 * scale, 0.08 * scale);
      c3.castShadow = true;

      g.add(c1, c2, c3);
      return g;
    }

    _populateInitialVegetation(region) {
      let seed = (region.id || "malang").split("").reduce((a, b) => a + b.charCodeAt(0), 0);
      const rand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      const hwX = region.highway ? region.highway.x : 0;

      // 1. Tanam 260 Pohon Bervariasi sesuai Ketinggian
      for (let i = 0; i < 260; i++) {
        const wx = (rand() - 0.5) * 298;
        const wz = (rand() - 0.5) * 298;
        if (Math.abs(wx - hwX) < 11) continue;
        const gy = this.getHeightAt(wx, wz);
        if (gy < 0.65 || gy > 19) continue;

        let species = "beringin";
        if (gy < 1.8 && rand() < 0.55) species = "palm";
        else if (gy > 7.5 && rand() < 0.65) species = "pine";

        const tree = this._createTreeMesh(0.85 + rand() * 0.55, species);
        tree.position.set(wx, gy, wz);
        tree.rotation.y = rand() * Math.PI * 2;
        this.treesGroup.add(tree);
      }

      // 2. Hamparan 3.600 Rumpun Rumput 3D (1 Draw Call Ringan!)
      const maxGrass = 3600;
      this.grassData = [];
      for (let i = 0; i < maxGrass; i++) {
        const wx = (rand() - 0.5) * 304;
        const wz = (rand() - 0.5) * 304;
        if (Math.abs(wx - hwX) < 7.5) continue;
        const gy = this.getHeightAt(wx, wz);
        if (gy < 0.6 || gy > 13.5) continue;

        this.grassData.push({
          x: wx,
          y: gy,
          z: wz,
          scale: 0.75 + rand() * 0.85,
          rotY: rand() * Math.PI * 2,
          active: true
        });
      }

      if (this.grassData.length > 0) {
        this.grassInstanced = new THREE.InstancedMesh(
          this.grassBladeGeo,
          this.grassBladeMat,
          this.grassData.length
        );
        const col = new THREE.Color();
        this.grassData.forEach((item, idx) => {
          this._dummy.position.set(item.x, item.y, item.z);
          this._dummy.rotation.set(0, item.rotY, 0);
          this._dummy.scale.set(item.scale, item.scale, item.scale);
          this._dummy.updateMatrix();
          this.grassInstanced.setMatrixAt(idx, this._dummy.matrix);

          col.setHSL(0.28 + (idx % 7) * 0.012, 0.68, 0.42 + (idx % 5) * 0.04);
          this.grassInstanced.setColorAt(idx, col);
        });
        this.grassInstanced.instanceMatrix.needsUpdate = true;
        if (this.grassInstanced.instanceColor) this.grassInstanced.instanceColor.needsUpdate = true;
        this.scene.add(this.grassInstanced);
      }
    }

    plantTreeAt(wx, wz) {
      const gy = this.getHeightAt(wx, wz);
      if (gy < 0.2) return;
      const species = gy < 1.8 ? "palm" : gy > 7.5 ? "pine" : "beringin";
      const tree = this._createTreeMesh(0.95 + Math.random() * 0.35, species);
      tree.position.set(wx, gy, wz);
      this.treesGroup.add(tree);
    }

    clearVegetationNear(wx, wz, radius = 2.6) {
      for (let i = this.treesGroup.children.length - 1; i >= 0; i--) {
        const t = this.treesGroup.children[i];
        if (Math.hypot(t.position.x - wx, t.position.z - wz) <= radius) {
          this.treesGroup.remove(t);
        }
      }

      if (this.grassInstanced && this.grassData.length > 0) {
        let dirty = false;
        for (let i = 0; i < this.grassData.length; i++) {
          const g = this.grassData[i];
          if (g.active && Math.hypot(g.x - wx, g.z - wz) <= radius) {
            g.active = false;
            this._dummy.position.set(g.x, -50, g.z);
            this._dummy.scale.set(0, 0, 0);
            this._dummy.updateMatrix();
            this.grassInstanced.setMatrixAt(i, this._dummy.matrix);
            dirty = true;
          }
        }
        if (dirty) this.grassInstanced.instanceMatrix.needsUpdate = true;
      }
    }

    setGridVisible(vis) {
      this.gridHelper.visible = Boolean(vis);
    }

    setZoomSpeed(mult) {
      this.zoomSpeedMult = mult || 1.0;
    }

    toggleCameraAngle() {
      this.isTopDown = !this.isTopDown;
      this.camPhiGoal = this.isTopDown ? 0.16 : 0.95;
      return this.isTopDown;
    }

    updateAtmosphere(hour) {
      const isNight = hour < 5.5 || hour > 18.5;
      const isDusk = (hour >= 5.5 && hour <= 7.0) || (hour >= 17.0 && hour <= 18.5);

      if (isNight) {
        this.scene.background.setHex(0x070d1f);
        this.scene.fog.color.setHex(0x070d1f);
        this.sunLight.intensity = 0.24;
        this.sunLight.color.setHex(0x93c5fd);
        this.hemiLight.intensity = 0.4;
        this.matCloud.color.setHex(0x1e293b);
        this.matCloud.emissive.setHex(0x0f172a);
      } else if (isDusk) {
        this.scene.background.setHex(0xfb923c);
        this.scene.fog.color.setHex(0xfdba74);
        this.sunLight.intensity = 0.88;
        this.sunLight.color.setHex(0xfed7aa);
        this.hemiLight.intensity = 0.68;
        this.matCloud.color.setHex(0xfed7aa);
        this.matCloud.emissive.setHex(0xf97316);
      } else {
        const sky = this.currentRegion?.fogColor || 0xbae6fd;
        this.scene.background.setHex(sky);
        this.scene.fog.color.setHex(sky);
        this.sunLight.intensity = 1.4;
        this.sunLight.color.setHex(0xfffbeb);
        this.hemiLight.intensity = 0.92;
        this.matCloud.color.setHex(0xffffff);
        this.matCloud.emissive.setHex(0xe2e8f0);
      }

      if (this.onAtmosphereChange) this.onAtmosphereChange(isNight);
    }

    _screenToWorld(clientX, clientY) {
      if (!this.terrainMesh) return null;
      const rect = this.canvas.getBoundingClientRect();
      this.pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);
      const hits = this.raycaster.intersectObject(this.terrainMesh);
      return hits.length > 0 ? hits[0].point : null;
    }

    _initControls() {
      let pointers = new Map();
      let isDraggingTool = false;
      let downPos = { x: 0, y: 0 };
      let lastPan = { x: 0, y: 0 };
      let lastPinchDist = 0;

      const handleToolDown = (clientX, clientY) => {
        const pt = this._screenToWorld(clientX, clientY);
        if (!pt) return;
        if (["raise", "lower", "flatten"].includes(this.activeTool)) {
          this.sculptTerrain(pt.x, pt.z, this.activeTool, 10);
          return;
        }
        if (this.activeTool === "tree") {
          this.plantTreeAt(pt.x, pt.z);
          return;
        }
        if (this.callbacks.onSelectionStart) {
          this.callbacks.onSelectionStart(pt.x, pt.z, this.activeTool);
        }
      };

      const handleToolMove = (clientX, clientY) => {
        const pt = this._screenToWorld(clientX, clientY);
        if (!pt) return;
        if (["raise", "lower", "flatten"].includes(this.activeTool)) {
          this.sculptTerrain(pt.x, pt.z, this.activeTool, 10);
          return;
        }
        if (this.activeTool === "tree") {
          this.plantTreeAt(pt.x, pt.z);
          return;
        }
        if (this.callbacks.onSelectionMove) {
          this.callbacks.onSelectionMove(pt.x, pt.z, this.activeTool);
        }
      };

      this.canvas.addEventListener("pointerdown", (e) => {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        downPos = { x: e.clientX, y: e.clientY };
        lastPan = { x: e.clientX, y: e.clientY };

        if (pointers.size === 1 && this.activeTool) {
          isDraggingTool = true;
          handleToolDown(e.clientX, e.clientY);
        } else if (pointers.size === 2) {
          isDraggingTool = false;
          const pts = Array.from(pointers.values());
          lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        }
      });

      this.canvas.addEventListener("pointermove", (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.size === 1) {
          if (isDraggingTool && this.activeTool) {
            handleToolMove(e.clientX, e.clientY);
          } else if (!this.activeTool) {
            const dx = e.clientX - lastPan.x;
            const dy = e.clientY - lastPan.y;
            lastPan = { x: e.clientX, y: e.clientY };

            const panScale = (this.camRadius / 95) * 0.24;
            const forwardX = -Math.sin(this.camTheta);
            const forwardZ = -Math.cos(this.camTheta);
            const rightX = Math.cos(this.camTheta);
            const rightZ = -Math.sin(this.camTheta);

            this.camTarget.x -= (rightX * dx + forwardX * dy) * panScale;
            this.camTarget.z -= (rightZ * dx + forwardZ * dy) * panScale;
            this.camTarget.x = Math.max(-135, Math.min(135, this.camTarget.x));
            this.camTarget.z = Math.max(-135, Math.min(135, this.camTarget.z));
          }
        } else if (pointers.size === 2) {
          const pts = Array.from(pointers.values());
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          const diff = lastPinchDist - dist;
          lastPinchDist = dist;
          this.camRadiusGoal = Math.max(
            24,
            Math.min(185, this.camRadiusGoal + diff * 0.22 * this.zoomSpeedMult)
          );
        }
      });

      const endPointer = (e) => {
        const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        if (pointers.size === 1) {
          if (isDraggingTool) {
            isDraggingTool = false;
            if (this.callbacks.onSelectionEnd) this.callbacks.onSelectionEnd();
          } else if (!this.activeTool && moved < 10) {
            const pt = this._screenToWorld(e.clientX, e.clientY);
            if (pt && this.callbacks.onTapInspect) {
              this.callbacks.onTapInspect(pt.x, pt.z);
            }
          }
        }
        pointers.delete(e.pointerId);
      };

      this.canvas.addEventListener("pointerup", endPointer);
      this.canvas.addEventListener("pointercancel", endPointer);

      this.canvas.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          this.camRadiusGoal = Math.max(
            24,
            Math.min(185, this.camRadiusGoal + e.deltaY * 0.06 * this.zoomSpeedMult)
          );
        },
        { passive: false }
      );
    }

    render(delta) {
      // Animasi Awan Berarak Pelan di Langit
      for (let i = 0; i < this.cloudsGroup.children.length; i++) {
        const cloud = this.cloudsGroup.children[i];
        cloud.position.x += (cloud.userData.driftSpeed || 1) * delta;
        if (cloud.position.x > 185) cloud.position.x = -185;
      }

      // Animasi Kilau Air Laut/Sungai Halus
      if (this.waterMesh) {
        this._waterTime += delta;
        this.waterMesh.material.roughness = 0.13 + Math.sin(this._waterTime * 1.8) * 0.03;
      }

      const smooth = Math.min(1, delta * 9);
      this.camTheta += (this.camThetaGoal - this.camTheta) * smooth;
      this.camPhi += (this.camPhiGoal - this.camPhi) * smooth;
      this.camRadius += (this.camRadiusGoal - this.camRadius) * smooth;

      const sinPhi = Math.sin(this.camPhi);
      const cosPhi = Math.cos(this.camPhi);
      this.camera.position.set(
        this.camTarget.x + this.camRadius * sinPhi * Math.sin(this.camTheta),
        this.camTarget.y + this.camRadius * cosPhi,
        this.camTarget.z + this.camRadius * sinPhi * Math.cos(this.camTheta)
      );
      this.camera.lookAt(this.camTarget);
      this.renderer.render(this.scene, this.camera);
    }
  }

  window.NusantaraGraphicsHD = NusantaraGraphicsHD;
})();
