(function () {
  const TOOL_COSTS = {
    road_4lane: 0.4,
    road_2lane: 0.2,
    road_1way_1: 0.15,
    road_1way_2: 0.28,
    road_bike: 0.1,
    road_pedestrian: 0.12,
    zone_r: 0.05,
    zone_c: 0.05,
    zone_i: 0.05,
    zone_clear: 0,
    pln: 4.5,
    pdam: 3.5,
    worship: 3.0,
    school: 4.0,
    health: 4.2,
    safety: 3.2,
    park: 1.8,
    bulldoze: 0.02
  };

  const SERVICE_RADII = {
    pln: 18,
    pdam: 18,
    worship: 15,
    school: 15,
    health: 16,
    safety: 16,
    park: 12
  };

  class CityRCISystem {
    constructor(engine) {
      this.engine = engine;
      this.gridSize = 80;
      this.tileSize = 4;
      this.halfWorld = (this.gridSize * this.tileSize) / 2;

      this.grid = [];
      this.buildings = [];
      this.vehicles = [];
      this.roadShape = "straight";
      this.roadTreesEnabled = true;
      this.curveFlip = false;
      this.rotateStep = 0;
      this.selStart = null;
      this.selEnd = null;
      this.pendingBlueprint = null;
      this.activeLens = null;
      this.simAccum = 0;

      this.demand = { R: 78, C: 48, I: 54 };
      this.stats = this._emptyStats();

      this.rootGroup = new THREE.Group();
      this.previewGroup = new THREE.Group();
      this.lensGroup = new THREE.Group();
      this.vehicleGroup = new THREE.Group();
      this.engine.scene.add(this.rootGroup, this.previewGroup, this.lensGroup, this.vehicleGroup);

      this._initSharedMaterials();
    }

    _emptyStats() {
      return {
        completedResPop: 0,
        unpoweredCount: 0,
        unwateredCount: 0,
        rBuildings: 0,
        cBuildings: 0,
        iBuildings: 0,
        roads: 0,
        plnCount: 0,
        pdamCount: 0,
        worshipCount: 0,
        schoolCount: 0,
        healthCount: 0,
        safetyCount: 0,
        parkCount: 0
      };
    }

    _initSharedMaterials() {
      this.matAsphalt = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
      this.matBike = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.8 });
      this.matPed = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.85 });
      this.matLineYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      this.matLineWhite = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      this.matZoneR = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.36 });
      this.matZoneC = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.36 });
      this.matZoneI = new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.36 });
      this.matBpValid = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 });
      this.matBpDelete = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.55 });
    }

    _clearGroup(group) {
      while (group.children.length > 0) {
        group.remove(group.children[0]);
      }
    }

    worldToGrid(wx, wz) {
      const gx = Math.max(0, Math.min(this.gridSize - 1, Math.floor((wx + this.halfWorld) / this.tileSize)));
      const gz = Math.max(0, Math.min(this.gridSize - 1, Math.floor((wz + this.halfWorld) / this.tileSize)));
      return { gx, gz };
    }

    gridToWorld(gx, gz) {
      return {
        x: (gx - this.gridSize / 2 + 0.5) * this.tileSize,
        z: (gz - this.gridSize / 2 + 0.5) * this.tileSize
      };
    }

    getCell(gx, gz) {
      if (gx < 0 || gx >= this.gridSize || gz < 0 || gz >= this.gridSize) return null;
      return this.grid[gx][gz];
    }

    isRoadTool(id) {
      return ["road_4lane", "road_2lane", "road_1way_1", "road_1way_2", "road_bike", "road_pedestrian"].includes(id);
    }

    isServiceTool(id) {
      return ["pln", "pdam", "worship", "school", "health", "safety", "park"].includes(id);
    }

    resetCity(region) {
      this._clearGroup(this.rootGroup);
      this._clearGroup(this.previewGroup);
      this._clearGroup(this.lensGroup);
      this._clearGroup(this.vehicleGroup);

      this.buildings = [];
      this.vehicles = [];
      this.pendingBlueprint = null;
      this.stats = this._emptyStats();
      this.demand = { R: 78, C: 48, I: 54 };

      this.grid = Array.from({ length: this.gridSize }, (_, gx) =>
        Array.from({ length: this.gridSize }, (__, gz) => ({
          gx,
          gz,
          type: "empty",
          parentRoad: null,
          isVertical: false,
          oneWayDir: null,
          hasSidewalkTrees: false,
          zone: null,
          zoneMesh: null,
          building: null,
          mesh: null
        }))
      );

      // Bangun Jalan Tol Akses Utama Masuk ke Wilayah
      const hwWorldX = region && region.highway ? region.highway.x : 0;
      const hwGrid = this.worldToGrid(hwWorldX, 0).gx;
      const leftGx = Math.max(2, Math.min(this.gridSize - 4, hwGrid));

      for (let gz = 0; gz < this.gridSize; gz++) {
        const c1 = this.grid[leftGx][gz];
        const c2 = this.grid[leftGx + 1][gz];
        c1.type = "starter_highway";
        c2.type = "starter_highway";
        c2.parentRoad = { gx: leftGx, gz };

        const wp = this.gridToWorld(leftGx, gz);
        const cx = wp.x + 2;
        const gy = this.engine.getHeightAt(cx, wp.z);
        this.engine.clearVegetationNear(cx, wp.z, 5.2);

        const seg = this._create4LaneRoadMesh(cx, gy, wp.z, true, gz % 5 === 0);
        c1.mesh = seg;
        this.rootGroup.add(seg);
      }

      this._spawnStarterTraffic(leftGx);
    }

    _spawnStarterTraffic(hwGx) {
      const wp = this.gridToWorld(hwGx, 10);
      const colors = [0xef4444, 0xf8fafc, 0x3b82f6, 0xfacc15, 0x10b981];
      for (let i = 0; i < 8; i++) {
        const car = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.65, 2.1),
          new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.4 })
        );
        const dir = i % 2 === 0 ? 1 : -1;
        const laneOffset = dir === 1 ? 0.8 : 3.2;
        const wz = -140 + i * 36;
        car.position.set(wp.x + laneOffset, this.engine.getHeightAt(wp.x + laneOffset, wz) + 0.42, wz);
        this.vehicleGroup.add(car);
        this.vehicles.push({ mesh: car, wx: wp.x + laneOffset, wz, dir, speed: 12 + (i % 3) * 3 });
      }
    }

    _create4LaneRoadMesh(cx, gy, cz, isVertical, hasLamp) {
      const g = new THREE.Group();
      const w = isVertical ? 7.8 : 4.0;
      const d = isVertical ? 4.0 : 7.8;

      const road = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), this.matAsphalt);
      road.receiveShadow = true;
      g.add(road);

      const div = new THREE.Mesh(
        new THREE.BoxGeometry(isVertical ? 0.24 : 4.0, 0.19, isVertical ? 4.0 : 0.24),
        this.matLineYellow
      );
      g.add(div);

      if (hasLamp) {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.1, 3.2, 5),
          new THREE.MeshStandardMaterial({ color: 0x64748b })
        );
        pole.position.set(isVertical ? -3.6 : 0, 1.6, isVertical ? 0 : -3.6);
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xfef08a })
        );
        bulb.position.set(isVertical ? -3.1 : 0, 3.15, isVertical ? 0 : -3.1);
        g.add(pole, bulb);
      }

      g.position.set(cx, gy + 0.08, cz);
      return g;
    }

    _createSingleTileRoadMesh(cell, wx, gy, wz) {
      const g = new THREE.Group();
      let mat = this.matAsphalt;
      let width = 3.9;
      if (cell.type === "road_bike") {
        mat = this.matBike;
        width = 2.4;
      } else if (cell.type === "road_pedestrian") {
        mat = this.matPed;
        width = 2.8;
      } else if (cell.type === "road_1way_1") {
        width = 2.8;
      }

      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(cell.isVertical ? width : 4.0, 0.15, cell.isVertical ? 4.0 : width),
        mat
      );
      slab.receiveShadow = true;
      g.add(slab);

      if (cell.type === "road_2lane" || cell.type === "road_1way_2") {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(cell.isVertical ? 0.14 : 2.2, 0.17, cell.isVertical ? 2.2 : 0.14),
          cell.type === "road_2lane" ? this.matLineYellow : this.matLineWhite
        );
        g.add(line);
      }

      if (cell.hasSidewalkTrees && (cell.gx + cell.gz) % 3 === 0) {
        const crown = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.55, 0),
          new THREE.MeshStandardMaterial({ color: 0x16a34a })
        );
        crown.position.set(1.65, 1.1, 1.65);
        g.add(crown);
      }

      g.position.set(wx, gy + 0.07, wz);
      return g;
    }

    _createAlunPlazaMesh(wx, gy, wz) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(3.95, 0.22, 3.95),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 })
      );
      const monumen = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.65, 2.8, 8),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.3 })
      );
      monumen.position.y = 1.4;
      g.add(base, monumen);
      g.position.set(wx, gy + 0.1, wz);
      return g;
    }

    _createServiceBuildingMesh(type, gx, gz, wx, gy, wz) {
      const g = new THREE.Group();
      const palette = {
        pln: { main: 0xf59e0b, roof: 0x334155, h: 3.4 },
        pdam: { main: 0x0284c7, roof: 0xe0f2fe, h: 3.0 },
        worship: { main: 0xf8fafc, roof: 0x10b981, h: 3.6 },
        school: { main: 0xfef3c7, roof: 0xdc2626, h: 2.8 },
        health: { main: 0xffffff, roof: 0xef4444, h: 3.8 },
        safety: { main: 0x1d4ed8, roof: 0x1e293b, h: 3.0 },
        park: { main: 0x22c55e, roof: 0x15803d, h: 0.4 }
      };
      const cfg = palette[type] || palette.pln;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(3.3, cfg.h, 3.3),
        new THREE.MeshStandardMaterial({ color: cfg.main, roughness: 0.7 })
      );
      body.position.y = cfg.h / 2;
      body.castShadow = true;
      g.add(body);

      if (type === "worship") {
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(1.25, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.35 })
        );
        dome.position.y = cfg.h + 0.4;
        g.add(dome);
      } else if (type !== "park") {
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(3.45, 0.35, 3.45),
          new THREE.MeshStandardMaterial({ color: cfg.roof })
        );
        roof.position.y = cfg.h + 0.15;
        g.add(roof);
      }

      g.position.set(wx, gy, wz);
      return g;
    }

    _updateZoneOverlay(cell, wx, gy, wz) {
      if (cell.zoneMesh) {
        this.rootGroup.remove(cell.zoneMesh);
        cell.zoneMesh = null;
      }
      if (!cell.zone || cell.building) return;

      const mat =
        cell.zone === "zone_r"
          ? this.matZoneR
          : cell.zone === "zone_c"
            ? this.matZoneC
            : this.matZoneI;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.75, 3.75), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(wx, gy + 0.11, wz);
      cell.zoneMesh = plane;
      this.rootGroup.add(plane);
    }

    _createZoneBuildingMesh(gx, gz, zone, level, wx, gy, wz) {
      const g = new THREE.Group();
      const seed = (gx * 31 + gz * 17) % 10;
      const isCafe = zone === "zone_c" && level === 1 && seed % 2 === 0;
      const isTerraced = zone === "zone_r" && level === 1 && seed % 3 === 0;

      const floors = level === 1 ? 1 : level === 2 ? 2 + (seed % 2) : 4 + (seed % 3);
      const h = floors * 1.9 + 0.6;
      const w = 2.8 + (seed % 3) * 0.2;

      const wallColors = {
        zone_r: [0xfef3c7, 0xe0f2fe, 0xf1f5f9, 0xfde68a],
        zone_c: [0x93c5fd, 0x38bdf8, 0xcbd5e1, 0xfed7aa],
        zone_i: [0xd97706, 0x78716c, 0x94a3b8, 0xb45309]
      };
      const cols = wallColors[zone] || wallColors.zone_r;
      const bodyMat = new THREE.MeshStandardMaterial({
        color: cols[seed % cols.length],
        roughness: 0.72
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), bodyMat);
      body.position.y = h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      if (zone === "zone_r" && level === 1) {
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(w * 0.76, 1.35, 4),
          new THREE.MeshStandardMaterial({ color: seed % 2 === 0 ? 0xb91c1c : 0x9a3412 })
        );
        roof.position.y = h + 0.65;
        roof.rotation.y = Math.PI / 4;
        g.add(roof);
      } else {
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.15, 0.25, w + 0.15),
          new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        cap.position.y = h + 0.12;
        g.add(cap);
      }

      g.position.set(wx, gy, wz);
      return { mesh: g, isCafe, isTerraced };
    }

    beginSelection(wx, wz, toolId) {
      if (!toolId) return null;
      this.selStart = this.worldToGrid(wx, wz);
      this.selEnd = { ...this.selStart };
      return this._buildBlueprint();
    }

    updateSelection(wx, wz, toolId) {
      if (!toolId || !this.selStart) return null;
      this.selEnd = this.worldToGrid(wx, wz);
      return this._buildBlueprint();
    }

    toggleCurveDirection() {
      this.curveFlip = !this.curveFlip;
      return this._buildBlueprint();
    }

    rotateBlueprint() {
      this.rotateStep = (this.rotateStep + 1) % 4;
      return this._buildBlueprint();
    }

    clearBlueprint() {
      this.selStart = null;
      this.selEnd = null;
      this.pendingBlueprint = null;
      this._clearGroup(this.previewGroup);
    }

    _buildBlueprint() {
      if (!this.selStart || !this.selEnd || !this.engine.activeTool) return null;
      const toolId = this.engine.activeTool;
      const s = this.selStart;
      const e = this.selEnd;
      const cells = [];

      if (this.isRoadTool(toolId) && this.roadShape === "roundabout") {
        // Bundaran Alun-Alun 3x3 di titik akhir
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            const c = this.getCell(e.gx + dx, e.gz + dz);
            if (c && c.type !== "starter_highway") {
              cells.push({
                gx: c.gx,
                gz: c.gz,
                isCenter: dx === 0 && dz === 0,
                isVertical: dx !== 0
              });
            }
          }
        }
      } else if (this.isRoadTool(toolId)) {
        const dx = Math.abs(e.gx - s.gx);
        const dz = Math.abs(e.gz - s.gz);
        const isVertical = dz >= dx;

        if (this.roadShape === "curved") {
          const steps = Math.max(dx, dz, 1);
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const curveOff = Math.round(Math.sin(t * Math.PI) * (this.curveFlip ? -3 : 3));
            const gx = Math.round(s.gx + (e.gx - s.gx) * t + (isVertical ? curveOff : 0));
            const gz = Math.round(s.gz + (e.gz - s.gz) * t + (isVertical ? 0 : curveOff));
            const c = this.getCell(gx, gz);
            if (c && c.type !== "starter_highway") cells.push({ gx, gz, isVertical });
          }
        } else if (isVertical) {
          const step = e.gz >= s.gz ? 1 : -1;
          for (let gz = s.gz; gz !== e.gz + step; gz += step) {
            const c = this.getCell(s.gx, gz);
            if (c && c.type !== "starter_highway") cells.push({ gx: s.gx, gz, isVertical: true });
          }
        } else {
          const step = e.gx >= s.gx ? 1 : -1;
          for (let gx = s.gx; gx !== e.gx + step; gx += step) {
            const c = this.getCell(gx, s.gz);
            if (c && c.type !== "starter_highway") cells.push({ gx, gz: s.gz, isVertical: false });
          }
        }
      } else if (this.isServiceTool(toolId)) {
        const c = this.getCell(e.gx, e.gz);
        if (c && c.type === "empty" && !c.building) {
          cells.push({ gx: e.gx, gz: e.gz, isVertical: false });
        }
      } else {
        const minX = Math.min(s.gx, e.gx);
        const maxX = Math.max(s.gx, e.gx);
        const minZ = Math.min(s.gz, e.gz);
        const maxZ = Math.max(s.gz, e.gz);
        for (let gx = minX; gx <= maxX; gx++) {
          for (let gz = minZ; gz <= maxZ; gz++) {
            const c = this.getCell(gx, gz);
            if (c && c.type !== "starter_highway") {
              cells.push({ gx, gz, isVertical: false });
            }
          }
        }
      }

      this._clearGroup(this.previewGroup);
      const prevMat = toolId === "bulldoze" ? this.matBpDelete : this.matBpValid;
      cells.forEach((item) => {
        const wp = this.gridToWorld(item.gx, item.gz);
        const gy = this.engine.getHeightAt(wp.x, wp.z);
        const box = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.35, 3.8), prevMat);
        box.position.set(wp.x, gy + 0.25, wp.z);
        this.previewGroup.add(box);
      });

      const unitCost = TOOL_COSTS[toolId] || 0;
      const spanW = Math.abs(e.gx - s.gx) + 1;
      const spanH = Math.abs(e.gz - s.gz) + 1;

      this.pendingBlueprint = {
        toolId,
        shape: this.roadShape,
        spanW,
        spanH,
        cells,
        validCount: cells.length,
        totalCost: Number((cells.length * unitCost).toFixed(2))
      };
      return this.pendingBlueprint;
    }

    confirmBlueprint(spendBudgetFn) {
      const bp = this.pendingBlueprint;
      if (!bp || bp.validCount === 0) return false;
      if (spendBudgetFn && !spendBudgetFn(bp.totalCost)) return false;

      const toolId = bp.toolId;

      bp.cells.forEach((item, idx) => {
        const cell = this.getCell(item.gx, item.gz);
        if (!cell || cell.type === "starter_highway") return;

        const wp = this.gridToWorld(item.gx, item.gz);
        const gy = this.engine.getHeightAt(wp.x, wp.z);

        if (toolId === "bulldoze") {
          if (cell.mesh) this.rootGroup.remove(cell.mesh);
          if (cell.zoneMesh) this.rootGroup.remove(cell.zoneMesh);
          if (cell.building) {
            this.rootGroup.remove(cell.building.mesh);
            this.buildings = this.buildings.filter((b) => b !== cell.building);
          }
          cell.type = "empty";
          cell.zone = null;
          cell.mesh = null;
          cell.zoneMesh = null;
          cell.building = null;
          return;
        }

        if (this.isRoadTool(toolId)) {
          if (cell.mesh) this.rootGroup.remove(cell.mesh);
          if (cell.zoneMesh) this.rootGroup.remove(cell.zoneMesh);
          cell.zone = null;
          cell.zoneMesh = null;

          if (bp.shape === "roundabout" && item.isCenter) {
            cell.type = "alun_plaza";
            this.engine.clearVegetationNear(wp.x, wp.z, 2.8);
            cell.mesh = this._createAlunPlazaMesh(wp.x, gy, wp.z);
            this.rootGroup.add(cell.mesh);
          } else if (toolId === "road_4lane") {
            cell.type = "road_4lane";
            cell.isVertical = item.isVertical;
            const cx = item.isVertical ? wp.x + 2 : wp.x;
            const cz = item.isVertical ? wp.z : wp.z + 2;
            const cgy = this.engine.getHeightAt(cx, cz);
            this.engine.clearVegetationNear(cx, cz, 4.6);
            cell.mesh = this._create4LaneRoadMesh(cx, cgy, cz, item.isVertical, idx % 4 === 0);
            this.rootGroup.add(cell.mesh);
          } else {
            cell.type = toolId;
            cell.isVertical = item.isVertical;
            cell.hasSidewalkTrees = this.roadTreesEnabled;
            this.engine.clearVegetationNear(wp.x, wp.z, 2.5);
            cell.mesh = this._createSingleTileRoadMesh(cell, wp.x, gy, wp.z);
            this.rootGroup.add(cell.mesh);
          }
          return;
        }

        if (toolId.startsWith("zone_")) {
          if (cell.type !== "empty") return;
          cell.zone = toolId === "zone_clear" ? null : toolId;
          this._updateZoneOverlay(cell, wp.x, gy, wp.z);
          return;
        }

        if (this.isServiceTool(toolId)) {
          if (cell.type !== "empty" || cell.building) return;
          if (cell.zoneMesh) this.rootGroup.remove(cell.zoneMesh);
          cell.zone = null;
          cell.zoneMesh = null;
          cell.type = toolId;
          this.engine.clearVegetationNear(wp.x, wp.z, 3.0);
          cell.mesh = this._createServiceBuildingMesh(toolId, item.gx, item.gz, wp.x, gy, wp.z);
          this.rootGroup.add(cell.mesh);
        }
      });

      this._recalculateNetworks();
      this.clearBlueprint();
      return true;
    }

    _recalculateNetworks() {
      const s = this._emptyStats();
      const serviceNodes = [];

      for (let gx = 0; gx < this.gridSize; gx++) {
        for (let gz = 0; gz < this.gridSize; gz++) {
          const c = this.grid[gx][gz];
          if (this.isRoadTool(c.type)) s.roads++;
          if (this.isServiceTool(c.type)) {
            serviceNodes.push({ gx, gz, type: c.type });
            if (c.type === "pln") s.plnCount++;
            if (c.type === "pdam") s.pdamCount++;
            if (c.type === "worship") s.worshipCount++;
            if (c.type === "school") s.schoolCount++;
            if (c.type === "health") s.healthCount++;
            if (c.type === "safety") s.safetyCount++;
            if (c.type === "park") s.parkCount++;
          }

          if (c.building) {
            const b = c.building;
            const needs = {
              power: false,
              water: false,
              worship: false,
              school: false,
              health: false,
              safety: false
            };
            for (let i = 0; i < serviceNodes.length; i++) {
              const srv = serviceNodes[i];
              const d = Math.hypot(srv.gx - gx, srv.gz - gz);
              if (srv.type === "pln" && d <= SERVICE_RADII.pln) needs.power = true;
              if (srv.type === "pdam" && d <= SERVICE_RADII.pdam) needs.water = true;
              if (srv.type === "worship" && d <= SERVICE_RADII.worship) needs.worship = true;
              if (srv.type === "school" && d <= SERVICE_RADII.school) needs.school = true;
              if (srv.type === "health" && d <= SERVICE_RADII.health) needs.health = true;
              if (srv.type === "safety" && d <= SERVICE_RADII.safety) needs.safety = true;
            }
            b.needs = needs;

            if (b.zone === "zone_r") {
              s.rBuildings++;
              const popPerBld = b.level === 1 ? 24 : b.level === 2 ? 95 : 280;
              b.pop = popPerBld;
              s.completedResPop += popPerBld;
            } else if (b.zone === "zone_c") {
              s.cBuildings++;
            } else if (b.zone === "zone_i") {
              s.iBuildings++;
            }

            if (!needs.power) s.unpoweredCount++;
            if (!needs.water) s.unwateredCount++;
          }
        }
      }

      this.stats = s;
      if (this.activeLens) this.setSmartLens(this.activeLens);
    }

    setSmartLens(lensType) {
      this.activeLens = lensType;
      this._clearGroup(this.lensGroup);
      if (!lensType) return;

      const rad = (SERVICE_RADII[lensType] || 15) * this.tileSize;
      for (let gx = 0; gx < this.gridSize; gx++) {
        for (let gz = 0; gz < this.gridSize; gz++) {
          const c = this.grid[gx][gz];
          if (c.type === lensType) {
            const wp = this.gridToWorld(gx, gz);
            const gy = this.engine.getHeightAt(wp.x, wp.z);
            const ring = new THREE.Mesh(
              new THREE.RingGeometry(rad - 0.6, rad, 36),
              new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(wp.x, gy + 0.35, wp.z);
            this.lensGroup.add(ring);
          }
        }
      }
    }

    inspectAtWorld(wx, wz) {
      const { gx, gz } = this.worldToGrid(wx, wz);
      const cell = this.getCell(gx, gz);
      if (!cell) return null;

      if (cell.building) {
        const b = cell.building;
        const label =
          b.zone === "zone_r"
            ? b.isTerraced
              ? "Perumahan Cluster"
              : "Hunian Warga"
            : b.zone === "zone_c"
              ? b.isCafe
                ? "Kafe & Kedai Lokal"
                : "Ruko Komersial"
              : "Kawasan Industri";
        return {
          badge: `Level ${b.level}`,
          title: label,
          stats: b.zone === "zone_r" ? `Penghuni: ${b.pop} Jiwa` : `Tenaga Kerja: ${b.level * 14} Orang`,
          needs: b.needs,
          tip:
            !b.needs.power || !b.needs.water
              ? "Segera bangun Gardu PLN dan Instalasi PDAM di dekat kawasan ini!"
              : "Penuhi Ibadah, Sekolah & RSUD agar bangunan otomatis naik level."
        };
      }

      if (this.isServiceTool(cell.type)) {
        return {
          badge: "Layanan Publik",
          title: `Fasilitas ${cell.type.toUpperCase()}`,
          stats: `Radius Cakupan: ${SERVICE_RADII[cell.type] * 4} meter`,
          needs: null,
          tip: "Melayani bangunan di sekitar radius jangkauan."
        };
      }

      return null;
    }

    _hasNearbyRoad(gx, gz, range = 3) {
      for (let dx = -range; dx <= range; dx++) {
        for (let dz = -range; dz <= range; dz++) {
          const c = this.getCell(gx + dx, gz + dz);
          if (c && (this.isRoadTool(c.type) || c.type === "starter_highway")) return true;
        }
      }
      return false;
    }

    stepSimulation(delta, speed) {
      // 1. Gerakkan kendaraan di tol
      for (let i = 0; i < this.vehicles.length; i++) {
        const v = this.vehicles[i];
        v.wz += v.dir * v.speed * delta * speed;
        if (v.wz > 152) v.wz = -152;
        if (v.wz < -152) v.wz = 152;
        const gy = this.engine.getHeightAt(v.wx, v.wz);
        v.mesh.position.set(v.wx, gy + 0.42, v.wz);
      }

      // 2. Pertumbuhan & Peningkatan Level Bangunan (berjalan tiap 1.4 detik)
      this.simAccum += delta * speed;
      if (this.simAccum < 1.4) return;
      this.simAccum = 0;

      let spawned = 0;
      for (let gx = 1; gx < this.gridSize - 1 && spawned < 3; gx++) {
        for (let gz = 1; gz < this.gridSize - 1 && spawned < 3; gz++) {
          const cell = this.grid[gx][gz];
          if (cell.zone && !cell.building && cell.type === "empty" && this._hasNearbyRoad(gx, gz, 3)) {
            if (Math.random() < 0.25) {
              const wp = this.gridToWorld(gx, gz);
              const gy = this.engine.getHeightAt(wp.x, wp.z);
              if (cell.zoneMesh) {
                this.rootGroup.remove(cell.zoneMesh);
                cell.zoneMesh = null;
              }
              this.engine.clearVegetationNear(wp.x, wp.z, 2.3);
              const built = this._createZoneBuildingMesh(gx, gz, cell.zone, 1, wp.x, gy, wp.z);
              this.rootGroup.add(built.mesh);
              const bObj = {
                zone: cell.zone,
                level: 1,
                mesh: built.mesh,
                isCafe: built.isCafe,
                isTerraced: built.isTerraced,
                pop: 24,
                needs: {}
              };
              cell.building = bObj;
              this.buildings.push(bObj);
              spawned++;
            }
          } else if (cell.building && cell.building.level < 3 && Math.random() < 0.06) {
            const b = cell.building;
            const okLv2 = b.needs.power && b.needs.water && b.needs.worship;
            const okLv3 = okLv2 && b.needs.school && b.needs.health && b.needs.safety;
            if ((b.level === 1 && okLv2) || (b.level === 2 && okLv3)) {
              b.level += 1;
              this.rootGroup.remove(b.mesh);
              const wp = this.gridToWorld(gx, gz);
              const gy = this.engine.getHeightAt(wp.x, wp.z);
              const upgraded = this._createZoneBuildingMesh(gx, gz, b.zone, b.level, wp.x, gy, wp.z);
              b.mesh = upgraded.mesh;
              this.rootGroup.add(b.mesh);
            }
          }
        }
      }

      this._recalculateNetworks();
      this.demand.R = Math.max(25, Math.min(95, 80 - this.stats.rBuildings * 2 + this.stats.iBuildings * 3));
      this.demand.C = Math.max(20, Math.min(90, 35 + Math.floor(this.stats.completedResPop / 60) - this.stats.cBuildings * 3));
      this.demand.I = Math.max(20, Math.min(90, 45 + Math.floor(this.stats.completedResPop / 80) - this.stats.iBuildings * 3));
    }

    updateNightLighting(isNight) {
      this.buildings.forEach((b) => {
        const body = b.mesh && b.mesh.children[0];
        if (body && body.material) {
          body.material.emissive = new THREE.Color(isNight ? 0xfef08a : 0x000000);
          body.material.emissiveIntensity = isNight ? 0.22 : 0;
        }
      });
    }
  }

  window.CityRCISystem = CityRCISystem;
})();
