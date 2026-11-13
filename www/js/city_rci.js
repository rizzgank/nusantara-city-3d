class CityRCISystem {
  constructor(graphicsEngine) {
    this.gfx = graphicsEngine;
    this.gridSize = 80;
    this.cellSize = 4.0;
    this.offset = (this.gridSize * this.cellSize) / 2;

    this.grid = [];
    this.buildings = [];
    this.vehicles = [];
    this.pedestrians = [];
    this.cafeHangoutSpots = [];
    this.nightGlowMaterials = [];
    this.aviationBeacons = [];
    this.lensMode = null;

    this.roadShape = "straight";
    this.curveFlip = false;
    this.roadTreesEnabled = true;

    this.dragStart = null;
    this.dragEnd = null;
    this.pendingBlueprint = null;
    this.previewGroup = new THREE.Group();
    this.gfx.scene.add(this.previewGroup);

    this.demand = { R: 75, C: 45, I: 55 };
    this.stats = {
      roads: 0,
      plnCount: 0,
      pdamCount: 0,
      rBuildings: 0,
      cBuildings: 0,
      iBuildings: 0,
      completedResPop: 0,
      cafeCount: 0,
      unpoweredCount: 0,
      unwateredCount: 0
    };

    this.rootGroup = new THREE.Group();
    this.gfx.scene.add(this.rootGroup);

    this._initMaterials();
    this._initGrid();
  }

  _initMaterials() {
    const tex = this.gfx.textures;
    this.asphaltMat = new THREE.MeshStandardMaterial({ map: tex.asphalt, roughness: 0.78, side: THREE.DoubleSide });
    this.bikeMat = new THREE.MeshStandardMaterial({ map: tex.bikeAsphalt, roughness: 0.72, side: THREE.DoubleSide });
    this.pavingMat = new THREE.MeshStandardMaterial({ map: tex.pavingStone, roughness: 0.84, side: THREE.DoubleSide });
    this.sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.86, side: THREE.DoubleSide });
    this.whiteMarkMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, side: THREE.DoubleSide });
    this.yellowMarkMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
    this.roofTileMat = new THREE.MeshStandardMaterial({
      map: tex.roofTile,
      bumpMap: tex.roofTile,
      bumpScale: 0.08,
      roughness: 0.65
    });
    this.plasterMat = new THREE.MeshStandardMaterial({
      map: tex.wallPlaster,
      roughness: 0.75
    });
    this.indMetalMat = new THREE.MeshStandardMaterial({
      map: tex.industrialMetal,
      bumpMap: tex.industrialMetal,
      bumpScale: 0.06,
      metalness: 0.35,
      roughness: 0.55
    });

    this.houseWinMat = new THREE.MeshStandardMaterial({
      map: tex.windowHouse,
      emissive: new THREE.Color(0xfef08a),
      emissiveMap: tex.windowHouseEmissive,
      emissiveIntensity: 0.0,
      roughness: 0.22
    });

    this.towerWinMat = new THREE.MeshStandardMaterial({
      map: tex.windowTower,
      emissive: new THREE.Color(0xfde68a),
      emissiveMap: tex.windowTowerEmissive,
      emissiveIntensity: 0.0,
      metalness: 0.55,
      roughness: 0.18
    });

    this.cafeStringLightMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
  }

  _initGrid(region = null) {
    this.grid = [];
    for (let gx = 0; gx < this.gridSize; gx++) {
      const row = [];
      for (let gz = 0; gz < this.gridSize; gz++) {
        row.push({
          gx,
          gz,
          type: "empty",
          oneWayDir: null,
          hasSidewalkTrees: false,
          zone: null,
          powered: false,
          watered: false,
          connectedToGate: false,
          mesh: null,
          zoneMesh: null,
          lensMesh: null,
          building: null
        });
      }
      this.grid.push(row);
    }

    const activeReg = region || this.gfx.currentRegion || window.INDONESIA_REGIONS[0];
    const hw = activeReg.highway;
    for (let gx = hw.minGx; gx <= hw.maxGx; gx++) {
      for (let gz = hw.minGz; gz <= hw.maxGz; gz++) {
        const cell = this.getCell(gx, gz);
        if (cell) {
          cell.type = "starter_highway";
          cell.connectedToGate = true;
        }
      }
    }
  }

  resetCity(region = null) {
    while (this.rootGroup.children.length > 0) {
      this.rootGroup.remove(this.rootGroup.children[0]);
    }
    this.clearBlueprint();
    this.buildings = [];
    this.vehicles = [];
    this.pedestrians = [];
    this.cafeHangoutSpots = [];
    this.aviationBeacons = [];
    this.lensMode = null;
    this.demand = { R: 75, C: 45, I: 55 };
    this._initGrid(region);
    this._recalculateNetworks();
  }

  worldToGrid(wx, wz) {
    const gx = Math.floor((wx + this.offset) / this.cellSize);
    const gz = Math.floor((wz + this.offset) / this.cellSize);
    if (gx < 0 || gx >= this.gridSize || gz < 0 || gz >= this.gridSize) return null;
    return { gx, gz };
  }

  gridToWorld(gx, gz) {
    return {
      x: -this.offset + (gx + 0.5) * this.cellSize,
      z: -this.offset + (gz + 0.5) * this.cellSize
    };
  }

  getCell(gx, gz) {
    if (gx < 0 || gx >= this.gridSize || gz < 0 || gz >= this.gridSize) return null;
    return this.grid[gx][gz];
  }

  isRoadTool(toolId) {
    return [
      "road_4lane",
      "road_2lane",
      "road_1way_1",
      "road_1way_2",
      "road_bike",
      "road_pedestrian"
    ].includes(toolId);
  }

  isRoadType(type) {
    return [
      "road_4lane",
      "road_2lane",
      "road_1way_1",
      "road_1way_2",
      "road_bike",
      "road_pedestrian",
      "starter_highway"
    ].includes(type);
  }

  isDrivableRoad(type) {
    return [
      "road_4lane",
      "road_2lane",
      "road_1way_1",
      "road_1way_2",
      "starter_highway"
    ].includes(type);
  }

  beginSelection(wx, wz, toolId) {
    const coord = this.worldToGrid(wx, wz);
    if (!coord) return null;
    this.dragStart = coord;
    this.dragEnd = coord;
    return this._buildBlueprintFromDrag(toolId, 0);
  }

  updateSelection(wx, wz, toolId) {
    if (!this.dragStart) return this.beginSelection(wx, wz, toolId);
    const coord = this.worldToGrid(wx, wz);
    if (!coord) return this.pendingBlueprint;
    this.dragEnd = coord;
    const rot = this.pendingBlueprint ? this.pendingBlueprint.rotation : 0;
    return this._buildBlueprintFromDrag(toolId, rot);
  }

  toggleCurveDirection() {
    if (!this.pendingBlueprint) return null;
    this.curveFlip = !this.curveFlip;
    return this._buildBlueprintFromDrag(this.pendingBlueprint.toolId, this.pendingBlueprint.rotation);
  }

  rotateBlueprint() {
    if (!this.pendingBlueprint) return null;
    this.pendingBlueprint.rotation = (this.pendingBlueprint.rotation + 1) % 4;
    this._renderBlueprintPreview();
    return this.pendingBlueprint;
  }

  clearBlueprint() {
    this.dragStart = null;
    this.dragEnd = null;
    this.pendingBlueprint = null;
    while (this.previewGroup.children.length > 0) {
      this.previewGroup.remove(this.previewGroup.children[0]);
    }
  }

  _traceOrthogonalSegment(x0, z0, x1, z1, outList, seenSet) {
    let cx = x0;
    let cz = z0;
    const pushPoint = (px, pz, dx, dz) => {
      const key = `${px},${pz}`;
      if (!seenSet.has(key)) {
        seenSet.add(key);
        outList.push({ gx: px, gz: pz, dir: { dx, dz }, role: "road" });
      }
    };

    while (cx !== x1) {
      const step = x1 > cx ? 1 : -1;
      pushPoint(cx, cz, step, 0);
      cx += step;
    }
    while (cz !== z1) {
      const step = z1 > cz ? 1 : -1;
      pushPoint(cx, cz, 0, step);
      cz += step;
    }
    const lastDir = outList.length > 0 ? outList[outList.length - 1].dir : { dx: 1, dz: 0 };
    pushPoint(x1, z1, lastDir.dx, lastDir.dz);
  }

  _buildBlueprintFromDrag(toolId, rotation) {
    const s = this.dragStart;
    const e = this.dragEnd;
    const rawCells = [];

    if (this.isRoadTool(toolId)) {
      if (this.roadShape === "roundabout") {
        const dragDist = Math.round(Math.hypot(e.gx - s.gx, e.gz - s.gz));
        const R = Math.max(3, Math.min(6, dragDist || 3));
        for (let gx = s.gx - R - 1; gx <= s.gx + R + 1; gx++) {
          for (let gz = s.gz - R - 1; gz <= s.gz + R + 1; gz++) {
            const d = Math.hypot(gx - s.gx, gz - s.gz);
            if (Math.abs(d - R) <= 0.68) {
              const ang = Math.atan2(gz - s.gz, gx - s.gx);
              const tx = Math.round(Math.sin(ang));
              const tz = Math.round(-Math.cos(ang));
              rawCells.push({ gx, gz, dir: { dx: tx || 1, dz: tz }, role: "road" });
            } else if (d < R - 0.68) {
              const isCenter = gx === s.gx && gz === s.gz;
              rawCells.push({ gx, gz, dir: null, role: isCenter ? "tugu" : "plaza" });
            }
          }
        }
      } else if (this.roadShape === "curved") {
        const midX = (s.gx + e.gx) * 0.5;
        const midZ = (s.gz + e.gz) * 0.5;
        const dx = e.gx - s.gx;
        const dz = e.gz - s.gz;
        const sign = this.curveFlip ? -1 : 1;
        const ctrlX = midX - dz * 0.55 * sign;
        const ctrlZ = midZ + dx * 0.55 * sign;

        const steps = Math.max(12, Math.ceil(Math.hypot(dx, dz) * 3));
        const pts = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const bx = Math.round((1 - t) * (1 - t) * s.gx + 2 * (1 - t) * t * ctrlX + t * t * e.gx);
          const bz = Math.round((1 - t) * (1 - t) * s.gz + 2 * (1 - t) * t * ctrlZ + t * t * e.gz);
          if (pts.length === 0 || pts[pts.length - 1].gx !== bx || pts[pts.length - 1].gz !== bz) {
            pts.push({ gx: bx, gz: bz });
          }
        }
        const seen = new Set();
        for (let i = 0; i < pts.length - 1; i++) {
          this._traceOrthogonalSegment(pts[i].gx, pts[i].gz, pts[i + 1].gx, pts[i + 1].gz, rawCells, seen);
        }
        if (pts.length === 1) {
          rawCells.push({ gx: pts[0].gx, gz: pts[0].gz, dir: { dx: 1, dz: 0 }, role: "road" });
        }
      } else {
        const dx = e.gx - s.gx;
        const dz = e.gz - s.gz;
        if (Math.abs(dx) >= Math.abs(dz)) {
          const step = dx >= 0 ? 1 : -1;
          for (let x = s.gx; x !== e.gx + step; x += step) {
            rawCells.push({ gx: x, gz: s.gz, dir: { dx: step, dz: 0 }, role: "road" });
          }
        } else {
          const step = dz >= 0 ? 1 : -1;
          for (let z = s.gz; z !== e.gz + step; z += step) {
            rawCells.push({ gx: s.gx, gz: z, dir: { dx: 0, dz: step }, role: "road" });
          }
        }
      }
    } else if (toolId === "pln" || toolId === "pdam") {
      rawCells.push({ gx: e.gx, gz: e.gz, dir: null, role: "util" });
    } else {
      const minX = Math.min(s.gx, e.gx);
      const maxX = Math.max(s.gx, e.gx);
      const minZ = Math.min(s.gz, e.gz);
      const maxZ = Math.max(s.gz, e.gz);
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          rawCells.push({ gx: x, gz: z, dir: null, role: "zone" });
        }
      }
    }

    let totalCost = 0;
    const evaluatedCells = rawCells.map((item) => {
      const cell = this.getCell(item.gx, item.gz);
      const pos = this.gridToWorld(item.gx, item.gz);
      const y = this.gfx.getHeightAt(pos.x, pos.z);
      const valid = this._isCellValidForTool(cell, y, toolId);
      const cost = valid ? this._getCellToolCost(y, toolId) : 0;
      totalCost += cost;
      return {
        gx: item.gx,
        gz: item.gz,
        wx: pos.x,
        wz: pos.z,
        groundY: y,
        valid,
        cost,
        dir: item.dir,
        role: item.role
      };
    });

    const validCount = evaluatedCells.filter((c) => c.valid).length;
    const spanW = Math.abs(e.gx - s.gx) + 1;
    const spanH = Math.abs(e.gz - s.gz) + 1;

    this.pendingBlueprint = {
      toolId,
      shape: this.roadShape,
      cells: evaluatedCells,
      validCount,
      totalCost,
      spanW,
      spanH,
      rotation
    };

    this._renderBlueprintPreview();
    return this.pendingBlueprint;
  }

  _isCellValidForTool(cell, groundY, toolId) {
    if (!cell || cell.type === "starter_highway") return false;
    if (toolId === "bulldoze") {
      return Boolean(cell.building || cell.zone || cell.type !== "empty");
    }
    if (toolId === "zone_clear") {
      return Boolean(cell.zone || cell.building);
    }
    if (this.isRoadTool(toolId)) {
      return cell.type === "empty" && !cell.building && groundY <= 15.0;
    }
    if (toolId === "pln" || toolId === "pdam") {
      return cell.type === "empty" && !cell.building && groundY >= 0.35 && groundY <= 13.0;
    }
    if (toolId === "zone_r" || toolId === "zone_c" || toolId === "zone_i") {
      return cell.type === "empty" && groundY >= 0.4 && groundY <= 12.0;
    }
    return false;
  }

  _getCellToolCost(groundY, toolId) {
    if (toolId === "road_4lane") return groundY < 0.25 ? 0.85 : 0.4;
    if (toolId === "road_2lane") return groundY < 0.25 ? 0.5 : 0.2;
    if (toolId === "road_1way_1") return groundY < 0.25 ? 0.4 : 0.15;
    if (toolId === "road_1way_2") return groundY < 0.25 ? 0.65 : 0.28;
    if (toolId === "road_bike") return 0.1;
    if (toolId === "road_pedestrian") return 0.12;
    if (toolId === "pln") return 4.5;
    if (toolId === "pdam") return 3.5;
    if (toolId === "zone_r" || toolId === "zone_c" || toolId === "zone_i") return 0.05;
    if (toolId === "bulldoze") return 0.05;
    return 0;
  }

  _renderBlueprintPreview() {
    while (this.previewGroup.children.length > 0) {
      this.previewGroup.remove(this.previewGroup.children[0]);
    }
    const bp = this.pendingBlueprint;
    if (!bp) return;

    const tileGeo = new THREE.BoxGeometry(this.cellSize * 0.94, 0.22, this.cellSize * 0.94);
    const validMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.64 });
    const plazaMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.64 });
    const invalidMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.64 });

    bp.cells.forEach((c) => {
      const y = Math.max(0.95, c.groundY + 0.18);
      const mat = !c.valid ? invalidMat : c.role === "plaza" || c.role === "tugu" ? plazaMat : validMat;
      const box = new THREE.Mesh(tileGeo, mat);
      box.position.set(c.wx, y, c.wz);
      this.previewGroup.add(box);

      if ((bp.toolId === "pln" || bp.toolId === "pdam") && c.valid) {
        const ringGeo = new THREE.RingGeometry(11 * this.cellSize - 0.35, 11 * this.cellSize, 48);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(c.wx, y + 0.12, c.wz);
        this.previewGroup.add(ring);
      }
    });
  }

  confirmBlueprint(spendCallback) {
    const bp = this.pendingBlueprint;
    if (!bp || bp.validCount === 0) {
      this.clearBlueprint();
      return false;
    }

    if (!spendCallback(bp.totalCost)) {
      return false;
    }

    const validCells = bp.cells.filter((c) => c.valid);
    if (this.isRoadTool(bp.toolId)) {
      this.gfx.gradeTerrainForCells(validCells);
    }

    const modifiedRoads = [];

    validCells.forEach((c) => {
      const cell = this.getCell(c.gx, c.gz);

      if (bp.toolId === "bulldoze") {
        if (cell.building) this._clearBuilding(cell);
        if (cell.zone) {
          cell.zone = null;
          if (cell.zoneMesh) {
            this.rootGroup.remove(cell.zoneMesh);
            cell.zoneMesh = null;
          }
        }
        if (cell.type !== "empty" && cell.type !== "starter_highway") {
          const wasRoad = this.isRoadType(cell.type);
          if (cell.mesh) {
            this.rootGroup.remove(cell.mesh);
            cell.mesh = null;
          }
          cell.type = "empty";
          cell.oneWayDir = null;
          cell.hasSidewalkTrees = false;
          if (wasRoad) modifiedRoads.push([c.gx, c.gz]);
        }
      } else if (bp.toolId === "zone_clear") {
        this._clearBuilding(cell);
        cell.zone = null;
        if (cell.zoneMesh) {
          this.rootGroup.remove(cell.zoneMesh);
          cell.zoneMesh = null;
        }
      } else if (this.isRoadTool(bp.toolId)) {
        if (cell.zone) {
          cell.zone = null;
          if (cell.zoneMesh) {
            this.rootGroup.remove(cell.zoneMesh);
            cell.zoneMesh = null;
          }
        }
        this.gfx.clearVegetationNear(c.wx, c.wz, 2.4);

        if (c.role === "plaza" || c.role === "tugu") {
          cell.type = "alun_plaza";
          cell.mesh = this._createAlunPlazaMesh(c.wx, this.gfx.getHeightAt(c.wx, c.wz), c.wz, c.role === "tugu");
          this.rootGroup.add(cell.mesh);
        } else {
          cell.type = bp.toolId;
          cell.oneWayDir = c.dir || { dx: 1, dz: 0 };
          cell.hasSidewalkTrees = this.roadTreesEnabled;
          modifiedRoads.push([c.gx, c.gz]);
        }
      } else if (bp.toolId === "pln" || bp.toolId === "pdam") {
        if (cell.zoneMesh) {
          this.rootGroup.remove(cell.zoneMesh);
          cell.zoneMesh = null;
        }
        cell.zone = null;
        cell.type = bp.toolId;
        this.gfx.clearVegetationNear(c.wx, c.wz, 2.7);
        const gy = this.gfx.getHeightAt(c.wx, c.wz);
        cell.mesh =
          bp.toolId === "pln"
            ? this._createPLNMesh(c.wx, gy, c.wz, bp.rotation)
            : this._createPDAMMesh(c.wx, gy, c.wz, bp.rotation);
        this.rootGroup.add(cell.mesh);
      } else if (bp.toolId === "zone_r" || bp.toolId === "zone_c" || bp.toolId === "zone_i") {
        const zCode = bp.toolId === "zone_r" ? "R" : bp.toolId === "zone_c" ? "C" : "I";
        if (cell.building && cell.building.zone !== zCode) this._clearBuilding(cell);
        cell.zone = zCode;
        this._updateZoneOverlay(cell, c.wx, this.gfx.getHeightAt(c.wx, c.wz), c.wz);
      }
    });

    modifiedRoads.forEach(([gx, gz]) => this._rebuildRoadAndNeighbors(gx, gz));
    this._recalculateNetworks();
    this.clearBlueprint();
    return true;
  }

  _clearBuilding(cell) {
    if (!cell.building) return;
    if (cell.building.mesh) this.rootGroup.remove(cell.building.mesh);
    if (cell.building.beacon) {
      const bIdx = this.aviationBeacons.indexOf(cell.building.beacon);
      if (bIdx !== -1) this.aviationBeacons.splice(bIdx, 1);
    }
    this.cafeHangoutSpots = this.cafeHangoutSpots.filter((s) => s.gx !== cell.gx || s.gz !== cell.gz);
    const idx = this.buildings.indexOf(cell.building);
    if (idx !== -1) this.buildings.splice(idx, 1);
    cell.building = null;
  }

  _rebuildRoadAndNeighbors(gx, gz) {
    const coords = [
      [gx, gz],
      [gx - 1, gz],
      [gx + 1, gz],
      [gx, gz - 1],
      [gx, gz + 1]
    ];
    coords.forEach(([cx, cz]) => {
      const c = this.getCell(cx, cz);
      if (!c || !this.isRoadTool(c.type)) return;
      if (c.mesh) this.rootGroup.remove(c.mesh);
      const pos = this.gridToWorld(cx, cz);
      const y = this.gfx.getHeightAt(pos.x, pos.z);
      c.mesh = this._createSeamlessRoadMesh(cx, cz, pos.x, y, pos.z, c);
      this.rootGroup.add(c.mesh);
    });
  }

  // SUBDIVIDED TERRAIN-CONFORMING PATCH (4x4 sub-grid per petak -> 100% menyambung rapat tanpa pernah putus!)
  _makeSubdividedPatch(x0, z0, x1, z1, yOffset, mat, isBridge, segs = 4) {
    const geo = new THREE.BufferGeometry();
    const verts = [];
    const uvs = [];
    const indices = [];

    for (let iz = 0; iz <= segs; iz++) {
      const tz = iz / segs;
      const wz = z0 + (z1 - z0) * tz;
      for (let ix = 0; ix <= segs; ix++) {
        const tx = ix / segs;
        const wx = x0 + (x1 - x0) * tx;
        const wy = (isBridge ? 0.95 : this.gfx.getHeightAt(wx, wz)) + yOffset;
        verts.push(wx, wy, wz);
        uvs.push(tx, tz);
      }
    }

    const rowStride = segs + 1;
    for (let iz = 0; iz < segs; iz++) {
      for (let ix = 0; ix < segs; ix++) {
        const a = iz * rowStride + ix;
        const b = a + 1;
        const c = (iz + 1) * rowStride + ix;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
  }

  _createSeamlessRoadMesh(gx, gz, wx, groundY, wz, cell) {
    const group = new THREE.Group();
    const rType = cell.type;
    const isBridge = groundY < 0.25;
    const s = this.cellSize;
    const halfS = s / 2;

    const nUp = this.isRoadType(this.getCell(gx, gz - 1)?.type);
    const nDown = this.isRoadType(this.getCell(gx, gz + 1)?.type);
    const nLeft = this.isRoadType(this.getCell(gx - 1, gz)?.type);
    const nRight = this.isRoadType(this.getCell(gx + 1, gz)?.type);
    const connCount = [nUp, nDown, nLeft, nRight].filter(Boolean).length;

    if (rType === "road_pedestrian") {
      group.add(this._makeSubdividedPatch(wx - halfS, wz - halfS, wx + halfS, wz + halfS, 0.1, this.pavingMat, isBridge, 4));
      if (cell.hasSidewalkTrees && !isBridge && (gx + gz) % 3 === 0) {
        this._attachSidewalkPlanterTree(group, wx + 1.35, wz + 1.35);
      }
      return group;
    }

    if (rType === "road_bike") {
      group.add(this._makeSubdividedPatch(wx - halfS, wz - halfS, wx + halfS, wz + halfS, 0.09, this.sidewalkMat, isBridge, 4));
      const bw = 0.85;
      group.add(this._makeSubdividedPatch(wx - bw, wz - bw, wx + bw, wz + bw, 0.125, this.bikeMat, isBridge, 2));
      if (nUp) group.add(this._makeSubdividedPatch(wx - bw, wz - halfS, wx + bw, wz - bw, 0.125, this.bikeMat, isBridge, 2));
      if (nDown) group.add(this._makeSubdividedPatch(wx - bw, wz + bw, wx + bw, wz + halfS, 0.125, this.bikeMat, isBridge, 2));
      if (nLeft) group.add(this._makeSubdividedPatch(wx - halfS, wz - bw, wx - bw, wz + bw, 0.125, this.bikeMat, isBridge, 2));
      if (nRight) group.add(this._makeSubdividedPatch(wx + bw, wz - bw, wx + halfS, wz + bw, 0.125, this.bikeMat, isBridge, 2));
      return group;
    }

    const widthMap = {
      road_4lane: 3.3,
      road_1way_2: 2.8,
      road_2lane: 2.3,
      road_1way_1: 1.75
    };
    const roadW = widthMap[rType] || 2.3;
    const hw = roadW / 2;

    // Dasar Trotoar Beton Subdivided (4x4 segmen)
    group.add(this._makeSubdividedPatch(wx - halfS, wz - halfS, wx + halfS, wz + halfS, 0.09, this.sidewalkMat, isBridge, 4));

    // Inti Aspal Tengah Subdivided
    group.add(this._makeSubdividedPatch(wx - hw, wz - hw, wx + hw, wz + hw, 0.13, this.asphaltMat, isBridge, 2));

    if (nUp) {
      group.add(this._makeSubdividedPatch(wx - hw, wz - halfS, wx + hw, wz - hw, 0.13, this.asphaltMat, isBridge, 2));
      this._addLaneMarkings(group, wx, wz - halfS * 0.55, true, rType, cell.oneWayDir, isBridge);
    }
    if (nDown) {
      group.add(this._makeSubdividedPatch(wx - hw, wz + hw, wx + hw, wz + halfS, 0.13, this.asphaltMat, isBridge, 2));
      this._addLaneMarkings(group, wx, wz + halfS * 0.55, true, rType, cell.oneWayDir, isBridge);
    }
    if (nLeft) {
      group.add(this._makeSubdividedPatch(wx - halfS, wz - hw, wx - hw, wz + hw, 0.13, this.asphaltMat, isBridge, 2));
      this._addLaneMarkings(group, wx - halfS * 0.55, wz, false, rType, cell.oneWayDir, isBridge);
    }
    if (nRight) {
      group.add(this._makeSubdividedPatch(wx + hw, wz - hw, wx + halfS, wz + hw, 0.13, this.asphaltMat, isBridge, 2));
      this._addLaneMarkings(group, wx + halfS * 0.55, wz, false, rType, cell.oneWayDir, isBridge);
    }

    if (connCount >= 3 && nDown) {
      for (let sx = -hw * 0.72; sx <= hw * 0.72; sx += 0.38) {
        group.add(
          this._makeSubdividedPatch(wx + sx - 0.08, wz + hw + 0.05, wx + sx + 0.08, wz + hw + 0.48, 0.145, this.whiteMarkMat, isBridge, 1)
        );
      }
    }

    if (cell.hasSidewalkTrees && !isBridge && connCount <= 2 && (gx + gz) % 3 === 0) {
      const cornerX = !nRight ? wx + halfS - 0.28 : wx - halfS + 0.28;
      const cornerZ = !nDown ? wz + halfS - 0.28 : wz - halfS + 0.28;
      if ((!nRight || !nLeft) && (!nDown || !nUp)) {
        this._attachSidewalkPlanterTree(group, cornerX, cornerZ);
      }
    }

    if (isBridge) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 3.8, 10), this.sidewalkMat);
      pillar.position.set(wx, -0.95, wz);
      group.add(pillar);
    }

    return group;
  }

  _addLaneMarkings(group, mx, mz, isVertical, rType, oneWayDir, isBridge) {
    if (rType === "road_4lane") {
      if (isVertical) {
        group.add(this._makeSubdividedPatch(mx - 0.16, mz - 0.55, mx - 0.05, mz + 0.55, 0.145, this.yellowMarkMat, isBridge, 1));
        group.add(this._makeSubdividedPatch(mx + 0.05, mz - 0.55, mx + 0.16, mz + 0.55, 0.145, this.yellowMarkMat, isBridge, 1));
        group.add(this._makeSubdividedPatch(mx - 0.85, mz - 0.35, mx - 0.77, mz + 0.35, 0.145, this.whiteMarkMat, isBridge, 1));
        group.add(this._makeSubdividedPatch(mx + 0.77, mz - 0.35, mx + 0.85, mz + 0.35, 0.145, this.whiteMarkMat, isBridge, 1));
      } else {
        group.add(this._makeSubdividedPatch(mx - 0.55, mz - 0.16, mx + 0.55, mz - 0.05, 0.145, this.yellowMarkMat, isBridge, 1));
        group.add(this._makeSubdividedPatch(mx - 0.55, mz + 0.05, mx + 0.55, mz + 0.16, 0.145, this.yellowMarkMat, isBridge, 1));
        group.add(this._makeSubdividedPatch(mx - 0.35, mz - 0.85, mx + 0.35, mz - 0.77, 0.145, this.whiteMarkMat, isBridge, 1));
        group.add(this._makeSubdividedPatch(mx - 0.35, mz + 0.77, mx + 0.35, mz + 0.85, 0.145, this.whiteMarkMat, isBridge, 1));
      }
    } else if (rType === "road_2lane") {
      if (isVertical) {
        group.add(this._makeSubdividedPatch(mx - 0.06, mz - 0.45, mx + 0.06, mz + 0.45, 0.145, this.whiteMarkMat, isBridge, 1));
      } else {
        group.add(this._makeSubdividedPatch(mx - 0.45, mz - 0.06, mx + 0.45, mz + 0.06, 0.145, this.whiteMarkMat, isBridge, 1));
      }
    } else if (rType === "road_1way_1" || rType === "road_1way_2") {
      const py = (isBridge ? 0.95 : this.gfx.getHeightAt(mx, mz)) + 0.15;
      const arrowGroup = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.55), this.whiteMarkMat);
      const headL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.28), this.whiteMarkMat);
      headL.position.set(-0.08, 0, -0.18);
      headL.rotation.y = 0.6;
      const headR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.28), this.whiteMarkMat);
      headR.position.set(0.08, 0, -0.18);
      headR.rotation.y = -0.6;
      arrowGroup.add(shaft, headL, headR);

      if (oneWayDir) {
        arrowGroup.rotation.y = Math.atan2(-oneWayDir.dx, -oneWayDir.dz);
      }

      if (rType === "road_1way_2") {
        const a1 = arrowGroup.clone();
        const a2 = arrowGroup.clone();
        if (isVertical) {
          a1.position.set(mx - 0.55, py, mz);
          a2.position.set(mx + 0.55, py, mz);
        } else {
          a1.position.set(mx, py, mz - 0.55);
          a2.position.set(mx, py, mz + 0.55);
        }
        group.add(a1, a2);
      } else {
        arrowGroup.position.set(mx, py, mz);
        group.add(arrowGroup);
      }
    }
  }

  _attachSidewalkPlanterTree(group, tx, tz) {
    const gy = this.gfx.getHeightAt(tx, tz);
    const planter = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.2, 0.56),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 })
    );
    planter.position.set(tx, gy + 0.14, tz);
    group.add(planter);
    this.gfx.addTreeAt(tx, gy + 0.16, tz, 0.62);
  }

  _createAlunPlazaMesh(wx, groundY, wz, hasTugu) {
    const group = new THREE.Group();
    const s = this.cellSize;
    const halfS = s / 2;
    group.add(this._makeSubdividedPatch(wx - halfS, wz - halfS, wx + halfS, wz + halfS, 0.09, this.pavingMat, false, 3));

    const grassPatch = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.78, 0.16, s * 0.78),
      new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.85 })
    );
    grassPatch.position.set(wx, groundY + 0.12, wz);
    group.add(grassPatch);

    if (hasTugu) {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.3, 1.5, 0.5, 16),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
      );
      base.position.set(wx, groundY + 0.35, wz);

      const obelisk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.52, 4.2, 8),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35 })
      );
      obelisk.position.set(wx, groundY + 2.6, wz);
      obelisk.castShadow = true;

      const lotus = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45, 0),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.25 })
      );
      lotus.position.set(wx, groundY + 4.95, wz);
      group.add(base, obelisk, lotus);
    } else if (Math.random() > 0.45) {
      this.gfx.addTreeAt(wx, groundY + 0.16, wz, 0.72);
    }
    return group;
  }

  _createPLNMesh(wx, groundY, wz, rotation = 0) {
    const group = new THREE.Group();
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(3.7, 0.45, 3.7),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 })
    );
    pad.position.y = -0.05;

    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.75, 2.5),
      this.plasterMat
    );
    hall.position.set(-0.45, 1.05, 0);
    hall.castShadow = true;

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.06, 0.3, 2.56),
      new THREE.MeshStandardMaterial({ color: 0x0284c7 })
    );
    stripe.position.set(-0.45, 1.55, 0);

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.54, 3.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.45, roughness: 0.35 })
    );
    tower.position.set(1.0, 1.9, -0.45);
    tower.castShadow = true;

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    beacon.position.set(1.0, 3.8, -0.45);

    group.add(pad, hall, stripe, tower, beacon);
    group.position.set(wx, groundY, wz);
    group.rotation.y = rotation * (Math.PI / 2);
    return group;
  }

  _createPDAMMesh(wx, groundY, wz, rotation = 0) {
    const group = new THREE.Group();
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(3.7, 0.45, 3.7),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 })
    );
    pad.position.y = -0.05;

    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 1.12, 0.76, 16),
      this.plasterMat
    );
    basin.position.set(-0.55, 0.55, 0.4);

    const waterDisk = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 0.79, 16),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.2 })
    );
    waterDisk.position.set(-0.55, 0.56, 0.4);

    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.36, 2.6, 10),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1 })
    );
    leg.position.set(0.88, 1.4, -0.6);

    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.72, 1.15, 14),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })
    );
    tank.position.set(0.88, 2.9, -0.6);
    tank.castShadow = true;

    group.add(pad, basin, waterDisk, leg, tank);
    group.position.set(wx, groundY, wz);
    group.rotation.y = rotation * (Math.PI / 2);
    return group;
  }

  _updateZoneOverlay(cell, wx, groundY, wz) {
    if (cell.zoneMesh) this.rootGroup.remove(cell.zoneMesh);
    const colorMap = { R: 0x22c55e, C: 0x3b82f6, I: 0xeab308 };
    const mat = new THREE.MeshBasicMaterial({
      color: colorMap[cell.zone],
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const halfS = this.cellSize * 0.46;
    const mesh = this._makeSubdividedPatch(wx - halfS, wz - halfS, wx + halfS, wz + halfS, 0.1, mat, false, 2);
    cell.zoneMesh = mesh;
    this.rootGroup.add(mesh);
  }

  setSmartLens(mode) {
    this.lensMode = mode;
    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        const cell = this.grid[gx][gz];
        if (cell.lensMesh) {
          this.rootGroup.remove(cell.lensMesh);
          cell.lensMesh = null;
        }
        if (!mode) continue;

        const hasTarget = cell.zone || cell.building || cell.type === "pln" || cell.type === "pdam";
        if (!hasTarget) continue;

        const pos = this.gridToWorld(gx, gz);
        const y = this.gfx.getHeightAt(pos.x, pos.z);
        const isCovered = mode === "pln" ? cell.powered : cell.watered;
        const col = isCovered ? 0x38bdf8 : 0xef4444;

        const geo = new THREE.PlaneGeometry(this.cellSize * 0.95, this.cellSize * 0.95);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 0.6,
          depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, y + 0.18, pos.z);
        cell.lensMesh = mesh;
        this.rootGroup.add(mesh);
      }
    }
  }

  _recalculateNetworks() {
    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        const c = this.grid[gx][gz];
        c.powered = false;
        c.watered = false;
        c.connectedToGate = c.type === "starter_highway";
      }
    }

    const queue = [];
    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        if (this.grid[gx][gz].type === "starter_highway") queue.push([gx, gz]);
      }
    }
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    while (queue.length > 0) {
      const [cx, cz] = queue.shift();
      for (const [dx, dz] of dirs) {
        const nc = this.getCell(cx + dx, cz + dz);
        if (nc && this.isRoadType(nc.type) && !nc.connectedToGate) {
          nc.connectedToGate = true;
          queue.push([nc.gx, nc.gz]);
        }
      }
    }

    let plnCount = 0;
    let pdamCount = 0;
    const radius = 11;

    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        const src = this.grid[gx][gz];
        if (src.type === "pln") {
          plnCount++;
          this._markRadius(gx, gz, radius, "powered");
        } else if (src.type === "pdam") {
          pdamCount++;
          this._markRadius(gx, gz, radius, "watered");
        }
      }
    }

    let roads = 0;
    let rBuildings = 0;
    let cBuildings = 0;
    let iBuildings = 0;
    let completedResPop = 0;
    let cafeCount = 0;
    let unpoweredCount = 0;
    let unwateredCount = 0;

    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        const c = this.grid[gx][gz];
        if (this.isRoadTool(c.type)) roads++;
        if (c.building) {
          if (c.building.stage === "built") {
            if (c.building.zone === "R") {
              rBuildings += c.building.level;
              completedResPop += c.building.level === 1 ? 45 : c.building.level === 2 ? 150 : 580;
            }
            if (c.building.zone === "C") {
              cBuildings += c.building.level;
              if (c.building.isCafe) cafeCount++;
            }
            if (c.building.zone === "I") iBuildings += c.building.level;
          }
          if (!c.powered) unpoweredCount++;
          if (!c.watered) unwateredCount++;
        }
      }
    }

    this.stats = {
      roads,
      plnCount,
      pdamCount,
      rBuildings,
      cBuildings,
      iBuildings,
      completedResPop,
      cafeCount,
      unpoweredCount,
      unwateredCount
    };

    if (this.lensMode) this.setSmartLens(this.lensMode);
  }

  _markRadius(cx, cz, radius, prop) {
    for (let gx = Math.max(0, cx - radius); gx <= Math.min(this.gridSize - 1, cx + radius); gx++) {
      for (let gz = Math.max(0, cz - radius); gz <= Math.min(this.gridSize - 1, cz + radius); gz++) {
        if (Math.hypot(gx - cx, gz - cz) <= radius) {
          this.grid[gx][gz][prop] = true;
        }
      }
    }
  }

  _getRoadFacingYaw(gx, gz) {
    const checks = [
      [0, 1, 0],
      [0, -1, Math.PI],
      [1, 0, Math.PI / 2],
      [-1, 0, -Math.PI / 2]
    ];
    for (const [dx, dz, yaw] of checks) {
      const c = this.getCell(gx + dx, gz + dz);
      if (c && this.isRoadType(c.type) && c.connectedToGate) {
        return yaw;
      }
    }
    return null;
  }

  // BANGUNAN ARSITEKTUR DETAIL BERTEKSTUR + KAFE NONGKRONG OUTDOOR
  _createBuildingMesh(gx, gz, zone, level, stage, wx, groundY, wz, facingYaw, metaOut) {
    const group = new THREE.Group();

    // Pondasi kavling agar tidak pernah mengambang di tanah miring
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.55, 3.6),
      new THREE.MeshStandardMaterial({ color: zone === "R" ? 0x65a30d : 0x94a3b8, roughness: 0.85 })
    );
    plinth.position.y = -0.15;
    plinth.receiveShadow = true;
    group.add(plinth);

    if (stage === "construction") {
      const soilPad = new THREE.Mesh(
        new THREE.BoxGeometry(3.1, 0.2, 3.1),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 })
      );
      soilPad.position.y = 0.16;

      const scaffold = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.5, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, wireframe: true })
      );
      scaffold.position.y = 0.95;
      group.add(soilPad, scaffold);
      group.position.set(wx, groundY, wz);
      group.rotation.y = facingYaw;
      return group;
    }

    if (zone === "R") {
      if (level === 1) {
        // RUMAH TAPAK TROPIS REALISTIS (Pagar depan, teras pilar, dinding plester, genteng, carport & toren)
        const wallTones = [0xfef3c7, 0xf8fafc, 0xfde68a, 0xe0f2fe];
        const wallMat = new THREE.MeshStandardMaterial({
          map: this.gfx.textures.wallPlaster,
          color: wallTones[(gx + gz) % wallTones.length],
          roughness: 0.72
        });

        // Pagar rendah & pilar gerbang depan
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
        const fenceL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 0.12), fenceMat);
        fenceL.position.set(-1.1, 0.32, 1.65);
        const fenceR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 0.12), fenceMat);
        fenceR.position.set(1.1, 0.32, 1.65);
        group.add(fenceL, fenceR);

        // Badan rumah utama
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.45, 2.05), wallMat);
        body.position.set(-0.15, 0.85, -0.15);
        body.castShadow = true;
        body.receiveShadow = true;

        // Kusen jendela & pintu masuk kayu
        const winPanel = new THREE.Mesh(new THREE.BoxGeometry(2.49, 0.68, 2.09), this.houseWinMat);
        winPanel.position.set(-0.15, 0.88, -0.15);
        const door = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 0.95, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 })
        );
        door.position.set(-0.2, 0.6, 0.89);

        // Teras depan & 2 tiang penyangga
        const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.75), this.roofTileMat);
        porchRoof.position.set(-0.2, 1.45, 1.15);
        [-0.85, 0.45].forEach((px) => {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.3, 8), wallMat);
          col.position.set(px, 0.78, 1.42);
          group.add(col);
        });

        // Kanopi Carport samping
        const carport = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 0.08, 1.85),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
        );
        carport.position.set(1.22, 1.32, 0.15);

        // Atap Genteng Limas + Listplank
        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.05, 1.05, 4), this.roofTileMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.set(-0.15, 2.08, -0.15);
        roof.castShadow = true;

        // Toren air atap belakang
        const toren = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.42, 10),
          new THREE.MeshStandardMaterial({ color: (gx * gz) % 2 === 0 ? 0x0284c7 : 0xea580c })
        );
        toren.position.set(0.85, 1.75, -0.85);

        group.add(body, winPanel, door, porchRoof, carport, roof, toren);
      } else if (level === 2) {
        // RUMAH CLUSTER MODERN 2 LANTAI + BALKON KACA
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.65, 2.4), this.plasterMat);
        body.position.set(0, 1.45, -0.1);
        body.castShadow = true;

        const stoneWall = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 2.7, 2.48),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 })
        );
        stoneWall.position.set(-0.75, 1.47, -0.1);

        const win = new THREE.Mesh(new THREE.BoxGeometry(2.74, 1.85, 2.44), this.houseWinMat);
        win.position.set(0, 1.48, -0.1);

        const balcony = new THREE.Mesh(
          new THREE.BoxGeometry(1.55, 0.42, 0.62),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 })
        );
        balcony.position.set(0.45, 1.65, 1.25);

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(2.95, 0.24, 2.75),
          new THREE.MeshStandardMaterial({ color: 0x1e293b })
        );
        roof.position.set(0, 2.88, -0.05);
        group.add(body, stoneWall, win, balcony, roof);
      } else {
        // APARTEMEN & KONDOMINIUM BERTINGKAT
        const floors = 7.0 + ((gx + gz) % 4) * 1.1;
        const podium = new THREE.Mesh(
          new THREE.BoxGeometry(3.15, 1.4, 3.15),
          new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 })
        );
        podium.position.y = 0.8;

        const tower = new THREE.Mesh(new THREE.BoxGeometry(2.65, floors, 2.65), this.plasterMat);
        tower.position.y = 1.4 + floors / 2;
        tower.castShadow = true;

        const win = new THREE.Mesh(new THREE.BoxGeometry(2.69, floors * 0.9, 2.69), this.towerWinMat);
        win.position.y = 1.4 + floors / 2;

        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(2.85, 0.35, 2.85),
          new THREE.MeshStandardMaterial({ color: 0x0284c7 })
        );
        crown.position.y = 1.4 + floors + 0.15;
        group.add(podium, tower, win, crown);
      }
    } else if (zone === "C") {
      if (level === 1) {
        const isCafe = (gx * 7 + gz * 13) % 10 < 6; // ~60% jadi Kafe Nongkrong Outdoor!
        if (isCafe) {
          metaOut.isCafe = true;
          // KAFE NONGKRONG OUTDOOR (Bangunan kayu-kaca, meja kursi teras, payung taman & lampu gantung)
          const cafeDeck = new THREE.Mesh(
            new THREE.BoxGeometry(3.45, 0.14, 3.45),
            new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
          );
          cafeDeck.position.y = 0.16;

          const cafeCabin = new THREE.Mesh(
            new THREE.BoxGeometry(2.85, 1.75, 1.45),
            new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.65 })
          );
          cafeCabin.position.set(0, 1.05, -0.85);
          cafeCabin.castShadow = true;

          const glassFront = new THREE.Mesh(new THREE.BoxGeometry(2.88, 1.25, 1.48), this.houseWinMat);
          glassFront.position.set(0, 0.95, -0.85);

          const signBoard = new THREE.Mesh(
            new THREE.BoxGeometry(1.65, 0.36, 0.12),
            new THREE.MeshStandardMaterial({
              color: 0xf59e0b,
              emissive: new THREE.Color(0xfbbf24),
              emissiveIntensity: 0.75
            })
          );
          signBoard.position.set(0, 2.08, -0.15);

          // 3 Set Meja & Kursi Nongkrong + Payung Taman
          const umbrellaCols = [0xdc2626, 0x0284c7, 0x16a34a];
          [-0.95, 0.0, 0.95].forEach((tx, idx) => {
            const table = new THREE.Mesh(
              new THREE.CylinderGeometry(0.28, 0.28, 0.05, 10),
              new THREE.MeshStandardMaterial({ color: 0xfef3c7 })
            );
            table.position.set(tx, 0.56, 0.68);
            const leg = new THREE.Mesh(
              new THREE.CylinderGeometry(0.04, 0.04, 0.36, 6),
              new THREE.MeshStandardMaterial({ color: 0x1e293b })
            );
            leg.position.set(tx, 0.38, 0.68);
            group.add(table, leg);

            if (idx !== 1) {
              const pole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 1.45, 6),
                new THREE.MeshStandardMaterial({ color: 0xf8fafc })
              );
              pole.position.set(tx, 0.92, 0.68);
              const umbrella = new THREE.Mesh(
                new THREE.ConeGeometry(0.58, 0.28, 8),
                new THREE.MeshStandardMaterial({ color: umbrellaCols[(gx + idx) % 3] })
              );
              umbrella.position.set(tx, 1.65, 0.68);
              group.add(pole, umbrella);
            }
          });

          // Lampu gantung kafe hangat (warm string lights)
          [-1.1, -0.4, 0.4, 1.1].forEach((lx) => {
            const bulb = new THREE.Mesh(
              new THREE.SphereGeometry(0.09, 6, 6),
              new THREE.MeshBasicMaterial({ color: 0xfef08a })
            );
            bulb.position.set(lx, 1.85, 0.45);
            group.add(bulb);
          });

          group.add(cafeDeck, cafeCabin, glassFront, signBoard);
        } else {
          // RUKO LOKAL 2 LANTAI BERKANOPI
          const awningCols = [0x0284c7, 0xdc2626, 0x16a34a, 0xd97706];
          const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 2.45), this.plasterMat);
          body.position.set(0, 1.2, -0.15);
          body.castShadow = true;

          const win = new THREE.Mesh(new THREE.BoxGeometry(2.84, 1.45, 2.49), this.houseWinMat);
          win.position.set(0, 1.15, -0.15);

          const awning = new THREE.Mesh(
            new THREE.BoxGeometry(2.92, 0.24, 0.72),
            new THREE.MeshStandardMaterial({ color: awningCols[(gx + gz) % awningCols.length] })
          );
          awning.position.set(0, 1.25, 1.25);
          group.add(body, win, awning);
        }
      } else if (level === 2) {
        // MALL & HOTEL MENENGAH
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(3.0, 4.4, 2.8),
          new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.42 })
        );
        body.position.y = 2.3;
        body.castShadow = true;

        const win = new THREE.Mesh(new THREE.BoxGeometry(3.04, 3.3, 2.84), this.towerWinMat);
        win.position.y = 2.2;

        const neonBand = new THREE.Mesh(
          new THREE.BoxGeometry(3.08, 0.48, 2.88),
          new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            emissive: new THREE.Color(0x38bdf8),
            emissiveIntensity: 0.65
          })
        );
        neonBand.position.y = 4.15;
        group.add(body, win, neonBand);
      } else {
        // PENCAKAR LANGIT SCBD BERUNDANG + LAMPU MERCUSUAR
        const height = 10.5 + ((gx * 3 + gz * 5) % 6) * 1.4;
        const podium = new THREE.Mesh(
          new THREE.BoxGeometry(3.25, 1.8, 3.25),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
        );
        podium.position.y = 1.0;

        const tower = new THREE.Mesh(new THREE.BoxGeometry(2.75, height, 2.75), this.towerWinMat);
        tower.position.y = 1.8 + height / 2;
        tower.castShadow = true;

        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 1.1, 2.2),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.25 })
        );
        crown.position.y = 1.8 + height + 0.55;

        const spire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.12, 2.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
        );
        spire.position.y = 1.8 + height + 2.2;

        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        beacon.position.y = 1.8 + height + 3.45;
        this.aviationBeacons.push(beacon);
        metaOut.beacon = beacon;

        group.add(podium, tower, crown, spire, beacon);
      }
    } else if (zone === "I") {
      if (level === 1) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.75, 2.75), this.indMetalMat);
        body.position.y = 0.98;
        body.castShadow = true;

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(3.15, 0.22, 2.9),
          new THREE.MeshStandardMaterial({ color: 0xd97706 })
        );
        roof.position.y = 1.94;
        group.add(body, roof);
      } else {
        const h = level === 2 ? 2.6 : 3.8;
        const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, h, 2.95), this.indMetalMat);
        body.position.y = 0.1 + h / 2;
        body.castShadow = true;

        const stack = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.34, h + 2.4, 10),
          new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        stack.position.set(1.0, (h + 2.4) / 2, -0.9);
        stack.castShadow = true;
        group.add(body, stack);
      }
    }

    group.position.set(wx, groundY, wz);
    group.rotation.y = facingYaw;
    return group;
  }

  updateNightLighting(isNight) {
    this.houseWinMat.emissiveIntensity = isNight ? 1.15 : 0.0;
    this.towerWinMat.emissiveIntensity = isNight ? 1.25 : 0.0;
    this.vehicles.forEach((v) => {
      v.headlight.visible = isNight;
    });
  }

  // WARGA 3D JALAN KAKI & NONGKRONG DI KAFE
  _spawnPedestrianIfNeeded() {
    if (this.pedestrians.length >= 65) return;
    const walkCells = [];
    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        const t = this.grid[gx][gz].type;
        if (this.isRoadTool(t) && this.grid[gx][gz].connectedToGate) {
          walkCells.push(this.grid[gx][gz]);
        }
      }
    }
    if (walkCells.length < 3) return;

    const start = walkCells[Math.floor(Math.random() * walkCells.length)];
    const pos = this.gridToWorld(start.gx, start.gz);
    const sideOffset = (Math.random() > 0.5 ? 1 : -1) * 1.42;

    const pedGroup = new THREE.Group();
    const shirtCols = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981, 0xf8fafc, 0x8b5cf6];
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.34, 0.14),
      new THREE.MeshStandardMaterial({ color: shirtCols[Math.floor(Math.random() * shirtCols.length)] })
    );
    torso.position.y = 0.46;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xfdba74 })
    );
    head.position.y = 0.72;

    const legL = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.3, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    legL.position.set(-0.06, 0.16, 0);
    const legR = legL.clone();
    legR.position.set(0.06, 0.16, 0);

    pedGroup.add(torso, head, legL, legR);
    const gy = this.gfx.getHeightAt(pos.x + sideOffset, pos.z);
    pedGroup.position.set(pos.x + sideOffset, gy + 0.08, pos.z);
    this.rootGroup.add(pedGroup);

    this.pedestrians.push({
      mesh: pedGroup,
      legL,
      legR,
      gx: start.gx,
      gz: start.gz,
      prevGx: -1,
      prevGz: -1,
      sideOffset,
      targetX: pos.x + sideOffset,
      targetZ: pos.z,
      phase: Math.random() * Math.PI * 2,
      speed: 1.35 + Math.random() * 0.45
    });
  }

  _updatePedestrians(delta) {
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const p = this.pedestrians[i];
      const dx = p.targetX - p.mesh.position.x;
      const dz = p.targetZ - p.mesh.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.25) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const nextList = [];
        for (const [ox, oz] of dirs) {
          const nx = p.gx + ox;
          const nz = p.gz + oz;
          const nc = this.getCell(nx, nz);
          if (nc && this.isRoadTool(nc.type) && !(nx === p.prevGx && nz === p.prevGz)) {
            nextList.push(nc);
          }
        }
        if (nextList.length === 0) {
          const back = this.getCell(p.prevGx, p.prevGz);
          if (back && this.isRoadTool(back.type)) nextList.push(back);
        }
        if (nextList.length === 0) {
          this.rootGroup.remove(p.mesh);
          this.pedestrians.splice(i, 1);
          continue;
        }
        const chosen = nextList[Math.floor(Math.random() * nextList.length)];
        p.prevGx = p.gx;
        p.prevGz = p.gz;
        p.gx = chosen.gx;
        p.gz = chosen.gz;
        const wp = this.gridToWorld(chosen.gx, chosen.gz);
        p.targetX = wp.x + p.sideOffset;
        p.targetZ = wp.z + (Math.random() - 0.5) * 0.6;
      } else {
        const step = Math.min(dist, p.speed * delta);
        p.mesh.position.x += (dx / dist) * step;
        p.mesh.position.z += (dz / dist) * step;
        const gy = this.gfx.getHeightAt(p.mesh.position.x, p.mesh.position.z);
        p.mesh.position.y = Math.max(1.02, gy + 0.08);
        p.mesh.lookAt(p.targetX, p.mesh.position.y, p.targetZ);

        p.phase += delta * 11;
        p.legL.rotation.x = Math.sin(p.phase) * 0.55;
        p.legR.rotation.x = -Math.sin(p.phase) * 0.55;
      }
    }
  }

  _spawnVehicleIfNeeded() {
    if (this.vehicles.length >= 44) return;
    const roadCells = [];
    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        if (this.isDrivableRoad(this.grid[gx][gz].type) && this.grid[gx][gz].connectedToGate) {
          roadCells.push(this.grid[gx][gz]);
        }
      }
    }
    if (roadCells.length < 4) return;

    const start = roadCells[Math.floor(Math.random() * roadCells.length)];
    const pos = this.gridToWorld(start.gx, start.gz);
    const y = Math.max(1.05, this.gfx.getHeightAt(pos.x, pos.z) + 0.14);

    const group = new THREE.Group();
    const roll = Math.random();
    let bodyColor = 0xf8fafc;
    let isAngkot = false;
    let isBike = false;

    if (roll < 0.32) {
      bodyColor = 0x0284c7;
      isAngkot = true;
    } else if (roll < 0.6) {
      bodyColor = 0x1e293b;
      isBike = true;
    } else {
      const carCols = [0xf8fafc, 0x94a3b8, 0x0f172a, 0xdc2626];
      bodyColor = carCols[Math.floor(Math.random() * carCols.length)];
    }

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(isBike ? 0.24 : 0.64, isBike ? 0.34 : 0.34, isBike ? 0.68 : 1.24),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.3 })
    );
    body.position.y = 0.22;
    group.add(body);

    if (!isBike) {
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.26, isAngkot ? 0.96 : 0.66),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.6 })
      );
      cabin.position.set(0, 0.48, isAngkot ? -0.05 : -0.08);
      group.add(cabin);
    }

    if (isAngkot) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.66, 0.12, 1.26),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc })
      );
      stripe.position.y = 0.24;
      group.add(stripe);
    }

    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(isBike ? 0.18 : 0.48, 0.1, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3 })
    );
    headlight.position.set(0, 0.22, isBike ? 0.35 : 0.63);
    headlight.visible = this.gfx.clockHour < 5.5 || this.gfx.clockHour > 18.5;
    group.add(headlight);

    group.position.set(pos.x, y, pos.z);
    this.rootGroup.add(group);

    this.vehicles.push({
      mesh: group,
      headlight,
      gx: start.gx,
      gz: start.gz,
      prevGx: -1,
      prevGz: -1,
      targetX: pos.x,
      targetZ: pos.z,
      speed: isBike ? 5.8 : 4.2
    });
  }

  _updateVehicles(delta) {
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const dx = v.targetX - v.mesh.position.x;
      const dz = v.targetZ - v.mesh.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.28) {
        const currCell = this.getCell(v.gx, v.gz);
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const candidates = [];

        for (const [ox, oz] of dirs) {
          if (
            currCell &&
            (currCell.type === "road_1way_1" || currCell.type === "road_1way_2") &&
            currCell.oneWayDir
          ) {
            if (ox !== currCell.oneWayDir.dx || oz !== currCell.oneWayDir.dz) continue;
          }
          const nx = v.gx + ox;
          const nz = v.gz + oz;
          const nc = this.getCell(nx, nz);
          if (nc && this.isDrivableRoad(nc.type) && !(nx === v.prevGx && nz === v.prevGz)) {
            candidates.push(nc);
          }
        }

        if (candidates.length === 0) {
          const back = this.getCell(v.prevGx, v.prevGz);
          if (back && this.isDrivableRoad(back.type)) candidates.push(back);
        }
        if (candidates.length === 0) {
          this.rootGroup.remove(v.mesh);
          this.vehicles.splice(i, 1);
          continue;
        }

        const next = candidates[Math.floor(Math.random() * candidates.length)];
        v.prevGx = v.gx;
        v.prevGz = v.gz;
        v.gx = next.gx;
        v.gz = next.gz;
        const nextPos = this.gridToWorld(next.gx, next.gz);
        v.targetX = nextPos.x + (Math.random() - 0.5) * 0.35;
        v.targetZ = nextPos.z + (Math.random() - 0.5) * 0.35;
      } else {
        const step = Math.min(dist, v.speed * delta);
        v.mesh.position.x += (dx / dist) * step;
        v.mesh.position.z += (dz / dist) * step;
        const groundY = this.gfx.getHeightAt(v.mesh.position.x, v.mesh.position.z);
        v.mesh.position.y = Math.max(1.05, groundY + 0.14);
        v.mesh.lookAt(v.targetX, v.mesh.position.y, v.targetZ);
      }
    }
  }

  stepSimulation(delta, simSpeed) {
    if (simSpeed <= 0) return;

    // Kedip lampu puncak gedung pencakar langit
    const blinkOn = Math.sin(performance.now() * 0.006) > 0;
    this.aviationBeacons.forEach((b) => {
      b.visible = blinkOn;
    });

    for (let attempt = 0; attempt < 4; attempt++) {
      if (Math.random() >= 0.28 * simSpeed) continue;
      const gx = Math.floor(Math.random() * this.gridSize);
      const gz = Math.floor(Math.random() * this.gridSize);
      const cell = this.grid[gx][gz];
      const facingYaw = cell && cell.zone ? this._getRoadFacingYaw(gx, gz) : null;

      if (cell && cell.zone && facingYaw !== null) {
        const pos = this.gridToWorld(gx, gz);
        const y = this.gfx.getHeightAt(pos.x, pos.z);

        if (!cell.building) {
          const meta = {};
          const mesh = this._createBuildingMesh(gx, gz, cell.zone, 1, "construction", pos.x, y, pos.z, facingYaw, meta);
          this.rootGroup.add(mesh);
          const b = { zone: cell.zone, level: 1, stage: "construction", facingYaw, mesh };
          cell.building = b;
          this.buildings.push(b);
          this.gfx.clearVegetationNear(pos.x, pos.z, 2.4);
          this._recalculateNetworks();
        } else if (cell.building.stage === "construction") {
          this.rootGroup.remove(cell.building.mesh);
          const meta = {};
          const mesh = this._createBuildingMesh(gx, gz, cell.zone, 1, "built", pos.x, y, pos.z, cell.building.facingYaw, meta);
          this.rootGroup.add(mesh);
          cell.building.mesh = mesh;
          cell.building.stage = "built";
          cell.building.isCafe = Boolean(meta.isCafe);
          if (cell.zoneMesh) {
            this.rootGroup.remove(cell.zoneMesh);
            cell.zoneMesh = null;
          }
          this._recalculateNetworks();
        } else if (
          cell.building.stage === "built" &&
          cell.building.level < 3 &&
          cell.powered &&
          cell.watered &&
          Math.random() < 0.14
        ) {
          cell.building.level += 1;
          this.rootGroup.remove(cell.building.mesh);
          const meta = {};
          const mesh = this._createBuildingMesh(
            gx,
            gz,
            cell.zone,
            cell.building.level,
            "built",
            pos.x,
            y,
            pos.z,
            cell.building.facingYaw,
            meta
          );
          this.rootGroup.add(mesh);
          cell.building.mesh = mesh;
          cell.building.isCafe = false;
          cell.building.beacon = meta.beacon || null;
          this._recalculateNetworks();
        }
      }
    }

    const r = this.stats.rBuildings;
    const c = this.stats.cBuildings;
    const i = this.stats.iBuildings;
    this.demand.R = Math.max(15, Math.min(95, 72 + (c + i) * 3 - r * 2));
    this.demand.C = Math.max(10, Math.min(95, 30 + r * 3 - c * 4));
    this.demand.I = Math.max(10, Math.min(95, 45 + r * 2 - i * 3));

    if (Math.random() < 0.1 * simSpeed) this._spawnVehicleIfNeeded();
    if (Math.random() < 0.14 * simSpeed) this._spawnPedestrianIfNeeded();
    this._updateVehicles(delta * simSpeed);
    this._updatePedestrians(delta * simSpeed);
  }
}
