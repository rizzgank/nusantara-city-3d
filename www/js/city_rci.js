(function () {
  const TOOL_COSTS = {
    road_4lane: 0.4,
    road_2lane: 0.2,
    road_1way_1: 0.15,
    road_1way_2: 0.28,
    road_bike: 0.1,
    road_pedestrian: 0.12,
    pln: 4.5,
    pdam: 3.5,
    worship: 3.0,
    school: 4.0,
    health: 4.2,
    safety: 3.2,
    park: 1.8
  };

  const SERVICE_RADII = {
    pln: 15,
    pdam: 15,
    worship: 12,
    school: 12,
    health: 12,
    safety: 12,
    park: 9
  };

  const SERVICE_NAMES = {
    pln: "⚡ Gardu & Pembangkit PLN",
    pdam: "💧 Instalasi Air Bersih PDAM",
    worship: "🕌 Tempat Ibadah (Masjid Agung)",
    school: "🏫 Sekolah & Pusat Pendidikan",
    health: "🏥 Puskesmas & RSUD",
    safety: "🚓 Polsek & Pos Damkar",
    park: "🌳 Taman Kota & Ruang Hijau"
  };

  class CityRCISystem {
    constructor(engine) {
      this.engine = engine;
      this.gridSize = 80;
      this.cellSize = 4;
      this.halfExtent = 160;

      this.grid = [];
      this.buildings = [];
      this.vehicles = [];
      this.pedestrians = [];
      this.nightLights = [];

      this.roadShape = "straight";
      this.curveFlip = false;
      this.roadTreesEnabled = true;
      this.pendingBlueprint = null;
      this.smartLens = null;

      this.rootGroup = new THREE.Group();
      this.previewGroup = new THREE.Group();
      this.lensGroup = new THREE.Group();
      this.engine.scene.add(this.rootGroup, this.previewGroup, this.lensGroup);

      this.demand = { R: 75, C: 50, I: 55 };
      this.stats = {
        completedResPop: 0,
        rBuildings: 0,
        cBuildings: 0,
        iBuildings: 0,
        cafeCount: 0,
        roads: 0,
        plnCount: 0,
        pdamCount: 0,
        worshipCount: 0,
        schoolCount: 0,
        healthCount: 0,
        safetyCount: 0,
        parkCount: 0,
        unpoweredCount: 0,
        unwateredCount: 0
      };

      this._simAccum = 0;
    }

    isRoadTool(id) {
      return [
        "road_4lane",
        "road_2lane",
        "road_1way_1",
        "road_1way_2",
        "road_bike",
        "road_pedestrian"
      ].includes(id);
    }

    isServiceTool(id) {
      return ["pln", "pdam", "worship", "school", "health", "safety", "park"].includes(id);
    }

    worldToGrid(wx, wz) {
      const gx = Math.floor((wx + this.halfExtent) / this.cellSize);
      const gz = Math.floor((wz + this.halfExtent) / this.cellSize);
      return {
        gx: Math.max(0, Math.min(this.gridSize - 1, gx)),
        gz: Math.max(0, Math.min(this.gridSize - 1, gz))
      };
    }

    gridToWorld(gx, gz) {
      return {
        x: -this.halfExtent + (gx + 0.5) * this.cellSize,
        z: -this.halfExtent + (gz + 0.5) * this.cellSize
      };
    }

    getCell(gx, gz) {
      if (gx < 0 || gz < 0 || gx >= this.gridSize || gz >= this.gridSize) return null;
      return this.grid[gx][gz];
    }

    resetCity(region) {
      this.currentRegion = region;
      this.clearBlueprint();
      this.setSmartLens(null);

      while (this.rootGroup.children.length > 0) {
        this.rootGroup.remove(this.rootGroup.children[0]);
      }

      this.grid = Array.from({ length: this.gridSize }, (_, gx) =>
        Array.from({ length: this.gridSize }, (_, gz) => ({
          gx,
          gz,
          type: "empty",
          parentRoad: null,
          oneWayDir: null,
          hasSidewalkTrees: false,
          zone: null,
          zoneMesh: null,
          mesh: null,
          building: null,
          roadConnected: false,
          coverage: {
            power: false,
            water: false,
            worship: false,
            school: false,
            health: false,
            safety: false,
            park: false
          }
        }))
      );

      this.buildings = [];
      this.vehicles = [];
      this.pedestrians = [];
      this.nightLights = [];

      this._buildStarterHighway(region);
      this._recalculateNetworks();
    }

    _buildStarterHighway(region) {
      const hwWorldX = region.highway ? region.highway.x : 0;
      const gStart = this.worldToGrid(hwWorldX, 0).gx;
      const gx1 = Math.max(2, Math.min(this.gridSize - 4, gStart));
      const gx2 = gx1 + 1;

      for (let gz = 0; gz < this.gridSize; gz++) {
        const c1 = this.getCell(gx1, gz);
        const c2 = this.getCell(gx2, gz);
        c1.type = "starter_highway";
        c2.type = "road_4lane_sub";
        c2.parentRoad = { gx: gx1, gz };
        c1.roadConnected = true;
        c2.roadConnected = true;

        const wp1 = this.gridToWorld(gx1, gz);
        const gy = this.engine.getHeightAt(wp1.x + 2, wp1.z);
        this.engine.clearVegetationNear(wp1.x + 2, wp1.z, 5.2);

        const roadMesh = this._create4LaneRoadMesh(wp1.x + 2, gy, wp1.z, true, gz % 6 === 0);
        c1.mesh = roadMesh;
        this.rootGroup.add(roadMesh);

        if (gz === 18) {
          const gate = this._createTollGateMesh(wp1.x + 2, gy, wp1.z);
          this.rootGroup.add(gate);
        }
      }
    }

    _createTollGateMesh(wx, gy, wz) {
      const g = new THREE.Group();
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
      const archMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });

      [-4.1, 4.1].forEach((ox) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.6, 0.9), pillarMat);
        p.position.set(ox, 1.8, 0);
        p.castShadow = true;
        g.add(p);
      });

      const beam = new THREE.Mesh(new THREE.BoxGeometry(9.2, 1.15, 1.25), archMat);
      beam.position.set(0, 3.6, 0);
      beam.castShadow = true;
      g.add(beam);

      g.position.set(wx, gy, wz);
      return g;
    }

    // JALAN RAYA 4 LAJUR = 2 PETAK LEBAR (8 METER), SEJAJAR JALAN TOL
    _create4LaneRoadMesh(cx, gy, cz, isVertical, withLight = false) {
      const g = new THREE.Group();
      const width = 8.0;
      const length = 4.02;

      const asphalt = new THREE.Mesh(
        new THREE.BoxGeometry(isVertical ? width : length, 0.14, isVertical ? length : width),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 })
      );
      asphalt.position.y = 0.07;
      asphalt.receiveShadow = true;
      g.add(asphalt);

      // Trotoar kiri & kanan
      const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
      [-3.65, 3.65].forEach((off) => {
        const curb = new THREE.Mesh(
          new THREE.BoxGeometry(isVertical ? 0.7 : length, 0.22, isVertical ? length : 0.7),
          curbMat
        );
        curb.position.set(isVertical ? off : 0, 0.11, isVertical ? 0 : off);
        curb.receiveShadow = true;
        g.add(curb);
      });

      // Median ganda kuning di tengah
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      [-0.14, 0.14].forEach((off) => {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(isVertical ? 0.1 : length, 0.03, isVertical ? length : 0.1),
          lineMat
        );
        line.position.set(isVertical ? off : 0, 0.15, isVertical ? 0 : off);
        g.add(line);
      });

      // Garis putus-putus pembagi 2 lajur per arah
      const dashMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      [-1.85, 1.85].forEach((off) => {
        const dash = new THREE.Mesh(
          new THREE.BoxGeometry(isVertical ? 0.08 : 1.7, 0.03, isVertical ? 1.7 : 0.08),
          dashMat
        );
        dash.position.set(isVertical ? off : 0, 0.15, isVertical ? 0 : off);
        g.add(dash);
      });

      if (withLight) {
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        [-3.65, 3.65].forEach((off) => {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.1, 6), poleMat);
          pole.position.set(isVertical ? off : 0, 1.55, isVertical ? 0 : off);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), bulbMat);
          bulb.position.set(isVertical ? off * 0.86 : 0, 3.1, isVertical ? 0 : off * 0.86);
          g.add(pole, bulb);
        });
      }

      g.position.set(cx, gy, cz);
      return g;
    }

    _createSingleTileRoadMesh(cell, wx, gy, wz) {
      const g = new THREE.Group();
      const type = cell.type;

      let roadColor = 0x334155;
      if (type === "road_bike") roadColor = 0x15803d;
      else if (type === "road_pedestrian") roadColor = 0xb45309;

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(4.02, 0.14, 4.02),
        new THREE.MeshStandardMaterial({ color: roadColor, roughness: 0.85 })
      );
      base.position.y = 0.07;
      base.receiveShadow = true;
      g.add(base);

      if (type === "road_2lane" || type === "road_1way_2") {
        const markColor = type === "road_2lane" ? 0xfacc15 : 0xf8fafc;
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.03, 3.2),
          new THREE.MeshBasicMaterial({ color: markColor })
        );
        line.position.y = 0.15;
        g.add(line);
      }

      if (cell.hasSidewalkTrees && (cell.gx + cell.gz) % 3 === 0) {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.11, 1.0, 5),
          new THREE.MeshStandardMaterial({ color: 0x5c4033 })
        );
        trunk.position.set(1.68, 0.5, 0);
        const leaf = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.55, 0),
          new THREE.MeshStandardMaterial({ color: 0x22c55e })
        );
        leaf.position.set(1.68, 1.25, 0);
        g.add(trunk, leaf);
      }

      g.position.set(wx, gy, wz);
      return g;
    }

    // =========================================================
    // SELECTION & CETAK BIRU (TERMASUK JALAN 4 LAJUR 2 PETAK)
    // =========================================================
    beginSelection(wx, wz, toolId) {
      const g = this.worldToGrid(wx, wz);
      this._selStart = g;
      this._selEnd = g;
      this._selTool = toolId;
      this._selRot = 0;
      return this._buildBlueprint();
    }

    updateSelection(wx, wz, toolId) {
      if (!this._selStart) return this.beginSelection(wx, wz, toolId);
      this._selEnd = this.worldToGrid(wx, wz);
      return this._buildBlueprint();
    }

    toggleCurveDirection() {
      this.curveFlip = !this.curveFlip;
      return this._buildBlueprint();
    }

    rotateBlueprint() {
      this._selRot = ((this._selRot || 0) + 1) % 4;
      return this._buildBlueprint();
    }

    clearBlueprint() {
      this._selStart = null;
      this._selEnd = null;
      this.pendingBlueprint = null;
      while (this.previewGroup.children.length > 0) {
        this.previewGroup.remove(this.previewGroup.children[0]);
      }
    }

    _computeLineCells(a, b, shape) {
      const pts = [];
      if (shape === "roundabout") {
        const cx = b.gx;
        const cz = b.gz;
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            const dist = Math.hypot(dx, dz);
            if (dist >= 1.3 && dist <= 2.35) {
              pts.push({ gx: cx + dx, gz: cz + dz, isPlaza: false });
            } else if (dist < 1.3) {
              pts.push({ gx: cx + dx, gz: cz + dz, isPlaza: true });
            }
          }
        }
        return pts;
      }

      if (shape === "curved") {
        const corner = this.curveFlip ? { gx: a.gx, gz: b.gz } : { gx: b.gx, gz: a.gz };
        const steps = Math.max(Math.abs(b.gx - a.gx) + Math.abs(b.gz - a.gz), 1);
        const seen = new Set();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const gx = Math.round((1 - t) * (1 - t) * a.gx + 2 * (1 - t) * t * corner.gx + t * t * b.gx);
          const gz = Math.round((1 - t) * (1 - t) * a.gz + 2 * (1 - t) * t * corner.gz + t * t * b.gz);
          const key = `${gx},${gz}`;
          if (!seen.has(key)) {
            seen.add(key);
            pts.push({ gx, gz });
          }
        }
        return pts;
      }

      // Lurus ortogonal
      const dx = b.gx - a.gx;
      const dz = b.gz - a.gz;
      if (Math.abs(dx) >= Math.abs(dz)) {
        const step = dx >= 0 ? 1 : -1;
        for (let x = a.gx; x !== b.gx + step; x += step) {
          pts.push({ gx: x, gz: a.gz, dir: { dx: step, dz: 0 }, isVertical: false });
        }
      } else {
        const step = dz >= 0 ? 1 : -1;
        for (let z = a.gz; z !== b.gz + step; z += step) {
          pts.push({ gx: a.gx, gz: z, dir: { dx: 0, dz: step }, isVertical: true });
        }
      }
      return pts;
    }

    _buildBlueprint() {
      while (this.previewGroup.children.length > 0) {
        this.previewGroup.remove(this.previewGroup.children[0]);
      }
      if (!this._selStart || !this._selEnd || !this._selTool) return null;

      const tool = this._selTool;
      const a = this._selStart;
      const b = this._selEnd;
      const minX = Math.min(a.gx, b.gx);
      const maxX = Math.max(a.gx, b.gx);
      const minZ = Math.min(a.gz, b.gz);
      const maxZ = Math.max(a.gz, b.gz);

      const cells = [];
      let validCount = 0;

      if (this.isRoadTool(tool)) {
        const line = this._computeLineCells(a, b, this.roadShape);
        line.forEach((p) => {
          const c = this.getCell(p.gx, p.gz);
          if (!c || c.type === "starter_highway") return;

          if (tool === "road_4lane" && !p.isPlaza) {
            const subGx = p.isVertical ? p.gx + 1 : p.gx;
            const subGz = p.isVertical ? p.gz : p.gz + 1;
            const subC = this.getCell(subGx, subGz);
            if (!subC || subC.type === "starter_highway") return;
            cells.push({
              gx: p.gx,
              gz: p.gz,
              subGx,
              subGz,
              isVertical: Boolean(p.isVertical),
              isPlaza: false
            });
            validCount++;
          } else {
            cells.push({
              gx: p.gx,
              gz: p.gz,
              dir: p.dir || { dx: 1, dz: 0 },
              isPlaza: Boolean(p.isPlaza)
            });
            validCount++;
          }
        });
      } else if (this.isServiceTool(tool)) {
        const c = this.getCell(b.gx, b.gz);
        if (c && c.type === "empty" && !c.building) {
          cells.push({ gx: b.gx, gz: b.gz });
          validCount = 1;
        }
        // Tampilkan cincin radius jangkauan layanan!
        const wp = this.gridToWorld(b.gx, b.gz);
        const gy = this.engine.getHeightAt(wp.x, wp.z);
        const radWorld = (SERVICE_RADII[tool] || 12) * this.cellSize;
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(radWorld - 0.5, radWorld, 48),
          new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.65
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(wp.x, gy + 0.35, wp.z);
        this.previewGroup.add(ring);
      } else {
        for (let gx = minX; gx <= maxX; gx++) {
          for (let gz = minZ; gz <= maxZ; gz++) {
            const c = this.getCell(gx, gz);
            if (!c || c.type === "starter_highway") continue;
            cells.push({ gx, gz });
            validCount++;
          }
        }
      }

      const unitCost = TOOL_COSTS[tool] || 0;
      const totalCost = unitCost * validCount;

      const boxColor =
        tool === "bulldoze"
          ? 0xef4444
          : tool === "zone_r"
            ? 0x22c55e
            : tool === "zone_c"
              ? 0x3b82f6
              : tool === "zone_i"
                ? 0xeab308
                : 0x38bdf8;

      const mat = new THREE.MeshBasicMaterial({
        color: boxColor,
        transparent: true,
        opacity: 0.45
      });

      cells.forEach((item) => {
        const wp = this.gridToWorld(item.gx, item.gz);
        const gy = this.engine.getHeightAt(wp.x, wp.z);
        const isWide = tool === "road_4lane" && item.subGx !== undefined;
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(
            isWide && item.isVertical ? 7.8 : 3.8,
            0.35,
            isWide && !item.isVertical ? 7.8 : 3.8
          ),
          mat
        );
        m.position.set(
          isWide && item.isVertical ? wp.x + 2 : wp.x,
          gy + 0.25,
          isWide && !item.isVertical ? wp.z + 2 : wp.z
        );
        this.previewGroup.add(m);
      });

      this.pendingBlueprint = {
        toolId: tool,
        shape: this.roadShape,
        cells,
        validCount,
        spanW: maxX - minX + 1,
        spanH: maxZ - minZ + 1,
        totalCost
      };
      return this.pendingBlueprint;
    }

    confirmBlueprint(spendFn) {
      const bp = this.pendingBlueprint;
      if (!bp || bp.validCount === 0) return false;
      if (bp.totalCost > 0 && !spendFn(bp.totalCost)) return false;

      const tool = bp.toolId;

      bp.cells.forEach((item) => {
        const cell = this.getCell(item.gx, item.gz);
        if (!cell) return;
        const wp = this.gridToWorld(item.gx, item.gz);
        const gy = this.engine.getHeightAt(wp.x, wp.z);

        if (tool === "bulldoze") {
          this._bulldozeCell(cell);
          return;
        }

        if (this.isRoadTool(tool)) {
          this._bulldozeCell(cell);
          if (item.isPlaza) {
            cell.type = "alun_plaza";
            cell.mesh = this._createAlunPlazaMesh(wp.x, gy, wp.z);
            this.rootGroup.add(cell.mesh);
          } else if (tool === "road_4lane" && item.subGx !== undefined) {
            const subCell = this.getCell(item.subGx, item.subGz);
            if (subCell) this._bulldozeCell(subCell);

            cell.type = "road_4lane";
            cell.isVertical = item.isVertical;
            if (subCell) {
              subCell.type = "road_4lane_sub";
              subCell.parentRoad = { gx: item.gx, gz: item.gz };
            }

            const cx = item.isVertical ? wp.x + 2 : wp.x;
            const cz = item.isVertical ? wp.z : wp.z + 2;
            const cgy = this.engine.getHeightAt(cx, cz);
            this.engine.clearVegetationNear(cx, cz, 4.8);
            cell.mesh = this._create4LaneRoadMesh(
              cx,
              cgy,
              cz,
              item.isVertical,
              (item.gx + item.gz) % 5 === 0
            );
            this.rootGroup.add(cell.mesh);
          } else {
            cell.type = tool;
            cell.oneWayDir = item.dir || null;
            cell.hasSidewalkTrees = this.roadTreesEnabled;
            this.engine.clearVegetationNear(wp.x, wp.z, 2.5);
            cell.mesh = this._createSingleTileRoadMesh(cell, wp.x, gy, wp.z);
            this.rootGroup.add(cell.mesh);
          }
          return;
        }

        if (this.isServiceTool(tool)) {
          this._bulldozeCell(cell);
          cell.type = tool;
          this.engine.clearVegetationNear(wp.x, wp.z, 2.8);
          cell.mesh = this._createServiceBuildingMesh(tool, item.gx, item.gz, wp.x, gy, wp.z);
          this.rootGroup.add(cell.mesh);
          return;
        }

        if (tool === "zone_clear") {
          cell.zone = null;
          if (cell.zoneMesh) {
            this.rootGroup.remove(cell.zoneMesh);
            cell.zoneMesh = null;
          }
          return;
        }

        if (tool.startsWith("zone_") && cell.type === "empty" && !cell.building) {
          cell.zone = tool === "zone_r" ? "R" : tool === "zone_c" ? "C" : "I";
          this._updateZoneOverlay(cell, wp.x, gy, wp.z);
        }
      });

      this._recalculateNetworks();
      if (this.smartLens) this.setSmartLens(this.smartLens);
      this.clearBlueprint();
      return true;
    }

    _bulldozeCell(cell) {
      if (cell.type === "starter_highway") return;
      if (cell.type === "road_4lane_sub" && cell.parentRoad) {
        const parent = this.getCell(cell.parentRoad.gx, cell.parentRoad.gz);
        if (parent) this._bulldozeCell(parent);
        return;
      }

      if (cell.type === "road_4lane") {
        // Bersihkan petak pendampingnya juga
        for (const [dx, dz] of [[1, 0], [0, 1]]) {
          const nb = this.getCell(cell.gx + dx, cell.gz + dz);
          if (nb && nb.type === "road_4lane_sub" && nb.parentRoad?.gx === cell.gx && nb.parentRoad?.gz === cell.gz) {
            nb.type = "empty";
            nb.parentRoad = null;
          }
        }
      }

      if (cell.mesh) {
        this.rootGroup.remove(cell.mesh);
        cell.mesh = null;
      }
      if (cell.zoneMesh) {
        this.rootGroup.remove(cell.zoneMesh);
        cell.zoneMesh = null;
      }
      if (cell.building) {
        this.rootGroup.remove(cell.building.mesh);
        this.buildings = this.buildings.filter((b) => b !== cell.building);
        cell.building = null;
      }
      cell.type = "empty";
      cell.zone = null;
      cell.parentRoad = null;
    }

    _updateZoneOverlay(cell, wx, gy, wz) {
      if (cell.zoneMesh) {
        this.rootGroup.remove(cell.zoneMesh);
        cell.zoneMesh = null;
      }
      if (!cell.zone) return;

      const color = cell.zone === "R" ? 0x22c55e : cell.zone === "C" ? 0x3b82f6 : 0xeab308;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(3.75, 3.75),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.34,
          side: THREE.DoubleSide
        })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(wx, gy + 0.12, wz);
      cell.zoneMesh = m;
      this.rootGroup.add(m);
    }

    // =========================================================
    // SISTEM TERASERING & PONDASI BATU KALI OTOMATIS DI LERENG
    // =========================================================
    _buildTerracedPad(gx, gz, wx, gy, wz, lotHalf = 1.75) {
      const group = new THREE.Group();
      const h1 = this.engine.getHeightAt(wx - lotHalf, wz - lotHalf);
      const h2 = this.engine.getHeightAt(wx + lotHalf, wz - lotHalf);
      const h3 = this.engine.getHeightAt(wx - lotHalf, wz + lotHalf);
      const h4 = this.engine.getHeightAt(wx + lotHalf, wz + lotHalf);

      let roadY = gy;
      let roadDir = null;
      const dirs = [
        { dx: 0, dz: 1 },
        { dx: 0, dz: -1 },
        { dx: 1, dz: 0 },
        { dx: -1, dz: 0 }
      ];
      for (const d of dirs) {
        const nb = this.getCell(gx + d.dx, gz + d.dz);
        if (nb && (this.isRoadTool(nb.type) || nb.type === "road_4lane_sub" || nb.type === "starter_highway")) {
          const rwp = this.gridToWorld(nb.gx, nb.gz);
          roadY = this.engine.getHeightAt(rwp.x, rwp.z);
          roadDir = d;
          break;
        }
      }

      const maxY = Math.max(gy, h1, h2, h3, h4, roadY);
      const minY = Math.min(gy, h1, h2, h3, h4, roadY);
      const slopeDiff = maxY - minY;

      if (slopeDiff > 0.22) {
        const wallHeight = slopeDiff + 0.95;
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.92 });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.7 });

        const plinth = new THREE.Mesh(
          new THREE.BoxGeometry(lotHalf * 2, wallHeight, lotHalf * 2),
          stoneMat
        );
        plinth.position.set(wx, maxY - wallHeight / 2, wz);
        plinth.castShadow = true;
        plinth.receiveShadow = true;

        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(lotHalf * 2 + 0.12, 0.14, lotHalf * 2 + 0.12),
          trimMat
        );
        cap.position.set(wx, maxY - 0.05, wz);

        group.add(plinth, cap);

        // Tangga akses beton jika lantai terasering lebih tinggi dari jalan
        if (roadDir && maxY - roadY > 0.28) {
          const steps = Math.min(6, Math.max(2, Math.round((maxY - roadY) / 0.25)));
          for (let s = 0; s < steps; s++) {
            const t = (s + 0.5) / steps;
            const stepY = maxY - t * (maxY - roadY);
            const stepMesh = new THREE.Mesh(
              new THREE.BoxGeometry(0.95, 0.22, 0.35),
              trimMat
            );
            stepMesh.position.set(
              wx + roadDir.dx * (lotHalf + t * 0.45),
              stepY,
              wz + roadDir.dz * (lotHalf + t * 0.45)
            );
            group.add(stepMesh);
          }
        }
      }

      return { group, padY: maxY, isTerraced: slopeDiff > 0.22 };
    }

    _createAlunPlazaMesh(wx, gy, wz) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(3.9, 0.18, 3.9),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 })
      );
      base.position.y = 0.09;
      g.add(base);
      g.position.set(wx, gy, wz);
      return g;
    }

    _createServiceBuildingMesh(type, gx, gz, wx, gy, wz) {
      const { group, padY } = this._buildTerracedPad(gx, gz, wx, gy, wz, 1.8);

      if (type === "pln") {
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 1.8, 2.2),
          new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 })
        );
        body.position.set(wx, padY + 0.9, wz);
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.45, 3.6, 8),
          new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5 })
        );
        tower.position.set(wx + 0.7, padY + 1.8, wz - 0.5);
        group.add(body, tower);
      } else if (type === "pdam") {
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(1.15, 1.15, 1.7, 16),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })
        );
        tank.position.set(wx, padY + 2.1, wz);
        const legs = new THREE.Mesh(
          new THREE.CylinderGeometry(0.75, 0.95, 1.3, 8),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
        );
        legs.position.set(wx, padY + 0.65, wz);
        group.add(tank, legs);
      } else if (type === "worship") {
        // Masjid Agung / Rumah Ibadah Kubah Emas
        const hall = new THREE.Mesh(
          new THREE.BoxGeometry(2.8, 1.9, 2.8),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
        );
        hall.position.set(wx, padY + 0.95, wz);
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(1.05, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.25 })
        );
        dome.position.set(wx, padY + 1.9, wz);
        const minaret = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.24, 3.8, 8),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })
        );
        minaret.position.set(wx + 1.25, padY + 1.9, wz + 1.25);
        group.add(hall, dome, minaret);
      } else if (type === "school") {
        const wing = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 1.7, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.6 })
        );
        wing.position.set(wx, padY + 0.85, wz);
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(2.35, 0.9, 4),
          new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.75 })
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.set(wx, padY + 2.15, wz);
        group.add(wing, roof);
      } else if (type === "health") {
        const hosp = new THREE.Mesh(
          new THREE.BoxGeometry(2.9, 2.6, 2.4),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
        );
        hosp.position.set(wx, padY + 1.3, wz);
        const cross1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.28, 0.15),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        cross1.position.set(wx, padY + 1.9, wz + 1.22);
        const cross2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.9, 0.15),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        cross2.position.set(wx, padY + 1.9, wz + 1.22);
        group.add(hosp, cross1, cross2);
      } else if (type === "safety") {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(2.7, 1.8, 2.2),
          new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 })
        );
        post.position.set(wx, padY + 0.9, wz);
        const siren = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.25, 0.3),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        siren.position.set(wx, padY + 1.92, wz);
        group.add(post, siren);
      } else if (type === "park") {
        const lawn = new THREE.Mesh(
          new THREE.BoxGeometry(3.6, 0.16, 3.6),
          new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.85 })
        );
        lawn.position.set(wx, padY + 0.08, wz);
        const fountain = new THREE.Mesh(
          new THREE.CylinderGeometry(0.85, 0.95, 0.35, 14),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 })
        );
        fountain.position.set(wx, padY + 0.25, wz);
        group.add(lawn, fountain);
      }

      return group;
    }

    _createZoneBuildingMesh(gx, gz, zone, level, wx, gy, wz) {
      const { group, padY, isTerraced } = this._buildTerracedPad(gx, gz, wx, gy, wz, 1.72);
      let isCafe = false;
      let winMat = null;

      if (zone === "R") {
        if (level === 1) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 1.35, 2.0),
            new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.75 })
          );
          wall.position.set(wx, padY + 0.68, wz);
          wall.castShadow = true;
          const roof = new THREE.Mesh(
            new THREE.ConeGeometry(1.75, 0.95, 4),
            new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.8 })
          );
          roof.rotation.y = Math.PI / 4;
          roof.position.set(wx, padY + 1.82, wz);
          group.add(wall, roof);
        } else if (level === 2) {
          const house = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 2.8, 2.3),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55 })
          );
          house.position.set(wx, padY + 1.4, wz);
          house.castShadow = true;
          const roof = new THREE.Mesh(
            new THREE.BoxGeometry(2.7, 0.3, 2.5),
            new THREE.MeshStandardMaterial({ color: 0x334155 })
          );
          roof.position.set(wx, padY + 2.95, wz);
          group.add(house, roof);
        } else {
          const h = 7.5 + ((gx * 7 + gz * 13) % 6);
          winMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.15,
            roughness: 0.25
          });
          const apt = new THREE.Mesh(new THREE.BoxGeometry(2.8, h, 2.8), winMat);
          apt.position.set(wx, padY + h / 2, wz);
          apt.castShadow = true;
          group.add(apt);
        }
      } else if (zone === "C") {
        isCafe = (gx + gz) % 2 === 0;
        if (level === 1) {
          const shop = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 1.65, 2.2),
            new THREE.MeshStandardMaterial({ color: isCafe ? 0xf59e0b : 0x3b82f6, roughness: 0.55 })
          );
          shop.position.set(wx, padY + 0.82, wz);
          shop.castShadow = true;
          const canopy = new THREE.Mesh(
            new THREE.BoxGeometry(2.65, 0.18, 0.9),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc })
          );
          canopy.position.set(wx, padY + 1.15, wz + 1.35);
          group.add(shop, canopy);
        } else if (level === 2) {
          const ruko = new THREE.Mesh(
            new THREE.BoxGeometry(2.7, 3.6, 2.5),
            new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45 })
          );
          ruko.position.set(wx, padY + 1.8, wz);
          ruko.castShadow = true;
          group.add(ruko);
        } else {
          const h = 10.5 + ((gx * 11 + gz * 5) % 9);
          winMat = new THREE.MeshStandardMaterial({
            color: 0x0ea5e9,
            emissive: 0xfde047,
            emissiveIntensity: 0.18,
            metalness: 0.55,
            roughness: 0.2
          });
          const tower = new THREE.Mesh(new THREE.BoxGeometry(2.9, h, 2.9), winMat);
          tower.position.set(wx, padY + h / 2, wz);
          tower.castShadow = true;
          group.add(tower);
        }
      } else {
        const h = level === 1 ? 1.8 : level === 2 ? 3.0 : 4.8;
        const fac = new THREE.Mesh(
          new THREE.BoxGeometry(2.9, h, 2.6),
          new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.7 })
        );
        fac.position.set(wx, padY + h / 2, wz);
        fac.castShadow = true;
        group.add(fac);
      }

      if (winMat) this.nightLights.push(winMat);
      return { mesh: group, isCafe, isTerraced };
    }

    // =========================================================
    // JARINGAN JALAN & CAKUPAN LAYANAN ALA THEOTOWN
    // =========================================================
    _isTraversableRoad(cell) {
      if (!cell) return false;
      return (
        cell.type === "starter_highway" ||
        cell.type === "road_4lane" ||
        cell.type === "road_4lane_sub" ||
        cell.type === "road_2lane" ||
        cell.type === "road_1way_1" ||
        cell.type === "road_1way_2" ||
        cell.type === "alun_plaza"
      );
    }

    _recalculateNetworks() {
      const services = [];
      let roadCount = 0;

      for (let gx = 0; gx < this.gridSize; gx++) {
        for (let gz = 0; gz < this.gridSize; gz++) {
          const c = this.grid[gx][gz];
          c.roadConnected = c.type === "starter_highway" || c.type === "road_4lane_sub";
          c.coverage = {
            power: false,
            water: false,
            worship: false,
            school: false,
            health: false,
            safety: false,
            park: false
          };
          if (this.isRoadTool(c.type)) roadCount++;
          if (this.isServiceTool(c.type)) services.push(c);
        }
      }

      // BFS keterhubungan jalan dari Tol Antar-Kota
      const queue = [];
      for (let gx = 0; gx < this.gridSize; gx++) {
        for (let gz = 0; gz < this.gridSize; gz++) {
          if (this.grid[gx][gz].type === "starter_highway") {
            queue.push(this.grid[gx][gz]);
          }
        }
      }

      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      while (queue.length > 0) {
        const cur = queue.shift();
        for (const [dx, dz] of dirs) {
          const nb = this.getCell(cur.gx + dx, cur.gz + dz);
          if (nb && !nb.roadConnected && this._isTraversableRoad(nb)) {
            nb.roadConnected = true;
            queue.push(nb);
          }
        }
      }

      // Sebar radius cakupan layanan publik
      services.forEach((srv) => {
        const rad = SERVICE_RADII[srv.type] || 12;
        const keyMap = {
          pln: "power",
          pdam: "water",
          worship: "worship",
          school: "school",
          health: "health",
          safety: "safety",
          park: "park"
        };
        const covKey = keyMap[srv.type];
        if (!covKey) return;

        for (let gx = Math.max(0, srv.gx - rad); gx <= Math.min(this.gridSize - 1, srv.gx + rad); gx++) {
          for (let gz = Math.max(0, srv.gz - rad); gz <= Math.min(this.gridSize - 1, srv.gz + rad); gz++) {
            if (Math.hypot(gx - srv.gx, gz - srv.gz) <= rad) {
              this.grid[gx][gz].coverage[covKey] = true;
            }
          }
        }
      });

      this._updateStatsAndBuildings(roadCount, services);
    }

    _updateStatsAndBuildings(roadCount, services) {
      let pop = 0;
      let rCount = 0;
      let cCount = 0;
      let iCount = 0;
      let cafes = 0;
      let unpowered = 0;
      let unwatered = 0;

      for (let gx = 0; gx < this.gridSize; gx++) {
        for (let gz = 0; gz < this.gridSize; gz++) {
          const c = this.grid[gx][gz];
          const b = c.building;
          if (!b) continue;

          b.needs = { ...c.coverage };
          if (!c.coverage.power) unpowered++;
          if (!c.coverage.water) unwatered++;

          if (b.zone === "R") {
            rCount++;
            b.pop = b.level === 1 ? 18 : b.level === 2 ? 85 : 340;
            pop += b.pop;
          } else if (b.zone === "C") {
            cCount++;
            if (b.isCafe) cafes++;
          } else if (b.zone === "I") {
            iCount++;
          }

          // Evaluasi alasan tertahan naik level
          if (b.level === 1) {
            const miss = [];
            if (!c.coverage.power) miss.push("Listrik PLN");
            if (!c.coverage.water) miss.push("Air PDAM");
            if (!c.coverage.worship) miss.push("Tempat Ibadah");
            b.upgradeBlockedReason =
              miss.length > 0
                ? `Butuh ${miss.join(", ")} untuk naik ke Level 2.`
                : "Seluruh syarat Level 2 terpenuhi! Segera direnovasi.";
          } else if (b.level === 2) {
            const miss = [];
            if (!c.coverage.school) miss.push("Pendidikan/Sekolah");
            if (!c.coverage.health) miss.push("Kesehatan/RSUD");
            if (!c.coverage.safety) miss.push("Keamanan/Polsek");
            b.upgradeBlockedReason =
              miss.length > 0
                ? `Butuh ${miss.join(", ")} untuk naik ke Level 3.`
                : "Syarat kota modern lengkap! Siap menuju Level 3.";
          } else {
            b.upgradeBlockedReason = "Bangunan sudah mencapai tingkat maksimal (Level 3).";
          }
        }
      }

      this.stats = {
        completedResPop: pop,
        rBuildings: rCount,
        cBuildings: cCount,
        iBuildings: iCount,
        cafeCount: cafes,
        roads: roadCount,
        plnCount: services.filter((s) => s.type === "pln").length,
        pdamCount: services.filter((s) => s.type === "pdam").length,
        worshipCount: services.filter((s) => s.type === "worship").length,
        schoolCount: services.filter((s) => s.type === "school").length,
        healthCount: services.filter((s) => s.type === "health").length,
        safetyCount: services.filter((s) => s.type === "safety").length,
        parkCount: services.filter((s) => s.type === "park").length,
        unpoweredCount: unpowered,
        unwateredCount: unwatered
      };
    }

    setSmartLens(lensKey) {
      this.smartLens = lensKey;
      while (this.lensGroup.children.length > 0) {
        this.lensGroup.remove(this.lensGroup.children[0]);
      }
      if (!lensKey) return;

      const matOk = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.42 });
      const matNo = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.48 });

      for (let gx = 0; gx < this.gridSize; gx++) {
        for (let gz = 0; gz < this.gridSize; gz++) {
          const c = this.grid[gx][gz];
          if (!c.zone && !c.building) continue;
          const hasCov = Boolean(c.coverage[lensKey]);
          const wp = this.gridToWorld(gx, gz);
          const gy = this.engine.getHeightAt(wp.x, wp.z);
          const m = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.35, 3.7), hasCov ? matOk : matNo);
          m.position.set(wp.x, gy + 0.3, wp.z);
          this.lensGroup.add(m);
        }
      }
    }

    // =========================================================
    // INSPEKSI BANGUNAN SAAT DIKETUK (Tap to Inspect)
    // =========================================================
    inspectAtWorld(wx, wz) {
      const { gx, gz } = this.worldToGrid(wx, wz);
      const cell = this.getCell(gx, gz);
      if (!cell) return null;

      if (cell.building) {
        const b = cell.building;
        const zoneNames = {
          R: b.level === 1 ? "Rumah Tapak Perintis" : b.level === 2 ? "Rumah Cluster Modern" : "Apartemen Bertingkat",
          C: b.isCafe ? "Kafe Nongkrong Nusantara" : b.level === 1 ? "Warung & Toko Kelontong" : b.level === 2 ? "Ruko Komersial" : "Menara Perkantoran",
          I: b.level === 1 ? "Gudang Logistik Kecil" : b.level === 2 ? "Pabrik Manufaktur" : "Kawasan Industri Modern"
        };
        return {
          badge: `Zona ${b.zone} • Level ${b.level}`,
          title: zoneNames[b.zone],
          stats:
            b.zone === "R"
              ? `Penghuni: ${b.pop} Jiwa${b.isTerraced ? " • Pondasi Terasering" : ""}`
              : `Aktivitas Ekonomi Aktif${b.isTerraced ? " • Pondasi Terasering" : ""}`,
          needs: b.needs,
          tip: b.upgradeBlockedReason
        };
      }

      if (this.isServiceTool(cell.type)) {
        return {
          badge: "Fasilitas Layanan Publik",
          title: SERVICE_NAMES[cell.type] || cell.type,
          stats: `Radius Jangkauan: ${SERVICE_RADII[cell.type] * 4} Meter`,
          needs: null,
          tip: "Melayani seluruh hunian & usaha di dalam radius jangkauan."
        };
      }

      return null;
    }

    // =========================================================
    // SIMULASI PERTUMBUHAN & LALU LINTAS LAJUR KIRI INDONESIA
    // =========================================================
    stepSimulation(delta, speed) {
      this._simAccum += delta * speed;
      if (this._simAccum >= 1.4) {
        this._simAccum = 0;
        this._growZonesStep();
      }
      this._stepTraffic(delta * speed);
    }

    _hasConnectedRoadNeighbor(gx, gz) {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dz] of dirs) {
        const nb = this.getCell(gx + dx, gz + dz);
        if (nb && nb.roadConnected && this._isTraversableRoad(nb)) return true;
      }
      return false;
    }

    _growZonesStep() {
      const candidates = [];
      for (let gx = 0; gx < this.gridSize; gx++) {
        for (let gz = 0; gz < this.gridSize; gz++) {
          const c = this.grid[gx][gz];
          if (c.zone && c.type === "empty" && this._hasConnectedRoadNeighbor(gx, gz)) {
            candidates.push(c);
          }
        }
      }

      // Acak urutan agar pertumbuhan merata
      candidates.sort(() => Math.random() - 0.5);

      let builtThisTick = 0;
      for (const cell of candidates) {
        if (builtThisTick >= 4) break;
        const wp = this.gridToWorld(cell.gx, cell.gz);
        const gy = this.engine.getHeightAt(wp.x, wp.z);

        if (!cell.building) {
          this.engine.clearVegetationNear(wp.x, wp.z, 2.3);
          const built = this._createZoneBuildingMesh(cell.gx, cell.gz, cell.zone, 1, wp.x, gy, wp.z);
          this.rootGroup.add(built.mesh);
          const bObj = {
            zone: cell.zone,
            level: 1,
            stage: "done",
            mesh: built.mesh,
            isCafe: built.isCafe,
            isTerraced: built.isTerraced,
            pop: 18,
            needs: { ...cell.coverage },
            upgradeBlockedReason: ""
          };
          cell.building = bObj;
          this.buildings.push(bObj);
          builtThisTick++;
        } else {
          const b = cell.building;
          const canLv2 = b.level === 1 && cell.coverage.power && cell.coverage.water && cell.coverage.worship;
          const canLv3 =
            b.level === 2 &&
            canLv2 &&
            cell.coverage.school &&
            cell.coverage.health &&
            cell.coverage.safety;

          if (canLv2 || canLv3) {
            const nextLv = b.level + 1;
            this.rootGroup.remove(b.mesh);
            const built = this._createZoneBuildingMesh(cell.gx, cell.gz, cell.zone, nextLv, wp.x, gy, wp.z);
            this.rootGroup.add(built.mesh);
            b.level = nextLv;
            b.mesh = built.mesh;
            b.isCafe = built.isCafe;
            builtThisTick++;
          }
        }
      }

      if (builtThisTick > 0) {
        this._recalculateNetworks();
        if (this.smartLens) this.setSmartLens(this.smartLens);
      }
    }

    _spawnVehicle(highwayOnly = false) {
      const roadCells = [];
      for (let gx = 0; gx < this.gridSize; gx++) {
        for (let gz = 0; gz < this.gridSize; gz++) {
          const c = this.grid[gx][gz];
          if (highwayOnly) {
            if (c.type === "starter_highway") roadCells.push(c);
          } else if (c.roadConnected && this._isTraversableRoad(c) && c.type !== "road_4lane_sub") {
            roadCells.push(c);
          }
        }
      }
      if (roadCells.length === 0) return;

      const start = roadCells[Math.floor(Math.random() * roadCells.length)];
      const dirs = [
        { dx: 0, dz: 1 },
        { dx: 0, dz: -1 },
        { dx: 1, dz: 0 },
        { dx: -1, dz: 0 }
      ];
      const validDirs = dirs.filter((d) => this._isTraversableRoad(this.getCell(start.gx + d.dx, start.gz + d.dz)));
      if (validDirs.length === 0) return;

      const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
      const colors = [0xef4444, 0xf8fafc, 0x0284c7, 0xfacc15, 0x1e293b];
      const col = colors[Math.floor(Math.random() * colors.length)];

      const car = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.55, 1.45),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 })
      );
      car.castShadow = true;
      this.rootGroup.add(car);

      const isWide = start.type === "starter_highway" || start.type === "road_4lane";
      const laneOffset = isWide ? (Math.random() > 0.5 ? 1.15 : 2.55) : 0.95;

      this.vehicles.push({
        mesh: car,
        gx: start.gx,
        gz: start.gz,
        dirX: dir.dx,
        dirZ: dir.dz,
        progress: 0.1,
        laneOffset,
        speed: isWide ? 11 : 7.5,
        highwayOnly
      });
    }

    _stepTraffic(dt) {
      if (dt <= 0) return;
      const targetVehicles = Math.min(
        45,
        3 + Math.floor(this.stats.completedResPop / 55) + this.stats.cBuildings * 2
      );

      while (this.vehicles.length < targetVehicles) {
        this._spawnVehicle(this.stats.completedResPop === 0);
      }
      while (this.vehicles.length > targetVehicles) {
        const rem = this.vehicles.pop();
        this.rootGroup.remove(rem.mesh);
      }

      for (let i = this.vehicles.length - 1; i >= 0; i--) {
        const v = this.vehicles[i];
        const cell = this.getCell(v.gx, v.gz);
        if (!cell || !this._isTraversableRoad(cell)) {
          this.rootGroup.remove(v.mesh);
          this.vehicles.splice(i, 1);
          continue;
        }

        // Sensor anti-tabrakan dengan kendaraan di depan pada jalur sama
        let blocked = false;
        for (let j = 0; j < this.vehicles.length; j++) {
          if (i === j) continue;
          const other = this.vehicles[j];
          if (other.dirX === v.dirX && other.dirZ === v.dirZ && Math.abs(other.laneOffset - v.laneOffset) < 0.7) {
            const dist = v.mesh.position.distanceTo(other.mesh.position);
            if (dist < 2.9) {
              const toOtherX = other.mesh.position.x - v.mesh.position.x;
              const toOtherZ = other.mesh.position.z - v.mesh.position.z;
              if (toOtherX * v.dirX + toOtherZ * v.dirZ > 0) {
                blocked = true;
                break;
              }
            }
          }
        }

        if (!blocked) {
          v.progress += (v.speed * dt) / this.cellSize;
        }

        if (v.progress >= 1.0) {
          v.progress -= 1.0;
          v.gx += v.dirX;
          v.gz += v.dirZ;

          const nextCell = this.getCell(v.gx, v.gz);
          if (!nextCell || !this._isTraversableRoad(nextCell)) {
            this.rootGroup.remove(v.mesh);
            this.vehicles.splice(i, 1);
            continue;
          }

          // Pilih arah lanjutan (hindari putar balik langsung kecuali jalan buntu)
          const candDirs = [
            { dx: 0, dz: 1 },
            { dx: 0, dz: -1 },
            { dx: 1, dz: 0 },
            { dx: -1, dz: 0 }
          ].filter((d) => {
            if (d.dx === -v.dirX && d.dz === -v.dirZ) return false;
            return this._isTraversableRoad(this.getCell(v.gx + d.dx, v.gz + d.dz));
          });

          if (candDirs.length > 0) {
            const straight = candDirs.find((d) => d.dx === v.dirX && d.dz === v.dirZ);
            const chosen = straight && Math.random() < 0.75 ? straight : candDirs[Math.floor(Math.random() * candDirs.length)];
            v.dirX = chosen.dx;
            v.dirZ = chosen.dz;
          } else {
            v.dirX = -v.dirX;
            v.dirZ = -v.dirZ;
          }
        }

        // ATURAN LAJUR KIRI INDONESIA: left = (dirZ, -dirX)
        const wp = this.gridToWorld(v.gx, v.gz);
        const isWide = cell.type === "starter_highway" || cell.type === "road_4lane" || cell.type === "road_4lane_sub";
        const baseX = isWide && cell.type !== "road_4lane_sub" ? wp.x + 2 : wp.x;
        const baseZ = wp.z;

        const leftX = v.dirZ;
        const leftZ = -v.dirX;
        const wx = baseX + (v.progress - 0.5) * this.cellSize * v.dirX + leftX * v.laneOffset;
        const wz = baseZ + (v.progress - 0.5) * this.cellSize * v.dirZ + leftZ * v.laneOffset;
        const gy = this.engine.getHeightAt(wx, wz);

        v.mesh.position.set(wx, gy + 0.36, wz);
        v.mesh.rotation.y = Math.atan2(v.dirX, v.dirZ);
      }
    }

    updateNightLighting(isNight) {
      const intensity = isNight ? 0.9 : 0.14;
      for (const m of this.nightLights) {
        m.emissiveIntensity = intensity;
      }
    }
  }

  window.CityRCISystem = CityRCISystem;
})();
