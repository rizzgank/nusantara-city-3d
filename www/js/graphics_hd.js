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
      this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.0022);

      this.camera = new THREE.PerspectiveCamera(
        46,
        window.innerWidth / window.innerHeight,
        0.5,
        900
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

      // Pencahayaan
      this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x365314, 0.85);
      this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
      this.sunLight.position.set(95, 140, 75);
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
      this.treesGroup = new THREE.Group();
      this.scene.add(this.treesGroup);

      this.raycaster = new THREE.Raycaster();
      this.pointerNDC = new THREE.Vector2();

      this._initControls();
      window.addEventListener("resize", () => this._onResize());
    }

    _onResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    loadRegion(region) {
      this.currentRegion = region;
      this.scene.background = new THREE.Color(region.fogColor || 0xbae6fd);
      this.scene.fog = new THREE.FogExp2(region.fogColor || 0xbae6fd, 0.0021);

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
        const h = window.generateRegionHeight
          ? window.generateRegionHeight(region, wx, wz, this.halfExtent)
          : 1.0;
        pos.setY(i, h);
      }
      pos.needsUpdate = true;

      this._recolorAndNormals();

      const tMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.04
      });
      this.terrainMesh = new THREE.Mesh(this.terrainGeo, tMat);
      this.terrainMesh.receiveShadow = true;
      this.scene.add(this.terrainMesh);

      const wGeo = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
      wGeo.rotateX(-Math.PI / 2);
      const wMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.18,
        metalness: 0.25,
        transparent: true,
        opacity: 0.84
      });
      this.waterMesh = new THREE.Mesh(wGeo, wMat);
      this.waterMesh.position.y = region.waterLevel !== undefined ? region.waterLevel : -0.25;
      this.scene.add(this.waterMesh);

      this._populateInitialTrees(region);
      this.camTarget.set(0, 2, 0);
      this.camRadiusGoal = 92;
    }

    _recolorAndNormals() {
      const pos = this.terrainGeo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const c = new THREE.Color();

      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < -0.1) c.setHex(0x1e3a5f);
        else if (y < 0.55) c.setHex(0xd6c79c);
        else if (y > 16.5) c.setHex(0x64748b);
        else if (y < 6.0) c.setHex(0x4d7c0f);
        else c.setHex(0x365314);

        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      this.terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      this.terrainGeo.computeVertexNormals();
    }

    _updateWaterDepthTexture() {
      // Placeholder hook untuk sinkronisasi ketinggian air
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

    _createTreeMesh(scale = 1) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16 * scale, 0.25 * scale, 1.5 * scale, 6),
        new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
      );
      trunk.position.y = 0.75 * scale;
      trunk.castShadow = true;

      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.15 * scale, 1),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 })
      );
      crown.position.y = 2.0 * scale;
      crown.castShadow = true;

      g.add(trunk, crown);
      return g;
    }

    _populateInitialTrees(region) {
      let seed = (region.id || "malang").split("").reduce((a, b) => a + b.charCodeAt(0), 0);
      const rand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      const hwX = region.highway ? region.highway.x : 0;
      for (let i = 0; i < 230; i++) {
        const wx = (rand() - 0.5) * 296;
        const wz = (rand() - 0.5) * 296;
        if (Math.abs(wx - hwX) < 11) continue;
        const gy = this.getHeightAt(wx, wz);
        if (gy < 0.7 || gy > 18) continue;

        const tree = this._createTreeMesh(0.85 + rand() * 0.55);
        tree.position.set(wx, gy, wz);
        this.treesGroup.add(tree);
      }
    }

    plantTreeAt(wx, wz) {
      const gy = this.getHeightAt(wx, wz);
      if (gy < 0.2) return;
      const tree = this._createTreeMesh(0.95 + Math.random() * 0.35);
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
        this.sunLight.intensity = 0.22;
        this.sunLight.color.setHex(0x93c5fd);
        this.hemiLight.intensity = 0.38;
      } else if (isDusk) {
        this.scene.background.setHex(0xfb923c);
        this.scene.fog.color.setHex(0xfdba74);
        this.sunLight.intensity = 0.85;
        this.sunLight.color.setHex(0xfed7aa);
        this.hemiLight.intensity = 0.65;
      } else {
        const sky = this.currentRegion?.fogColor || 0xbae6fd;
        this.scene.background.setHex(sky);
        this.scene.fog.color.setHex(sky);
        this.sunLight.intensity = 1.35;
        this.sunLight.color.setHex(0xfffbeb);
        this.hemiLight.intensity = 0.85;
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
            // Ketukan singkat tanpa alat aktif -> Inspeksi Bangunan!
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
