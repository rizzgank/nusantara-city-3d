class CityRCISystem {
  constructor(graphicsEngine) {
    this.gfx = graphicsEngine;
    this.gridSize = 36;
    this.cellSize = 3.5;
    this.offset = (this.gridSize * this.cellSize) / 2;

    this.grid = [];
    this.buildings = [];
    this.vehicles = [];
    this.nightWindowMats = [];
    this.lensMode = null; // null | 'pln' | 'pdam'

    this.demand = { R: 70, C: 45, I: 55 };
    this.stats = {
      roads: 0,
      plnCount: 0,
      pdamCount: 0,
      powerCap: 0,
      powerUsed: 0,
      waterCap: 0,
      waterUsed: 0,
      rBuildings: 0,
      cBuildings: 0,
      iBuildings: 0,
      unpoweredCount: 0,
      unwateredCount: 0
    };

    this.rootGroup = new THREE.Group();
    this.gfx.scene.add(this.rootGroup);

    this._initGrid();
  }

  _initGrid() {
    this.grid = [];
    for (let gx = 0; gx < this.gridSize; gx++) {
      const row = [];
      for (let gz = 0; gz < this.gridSize; gz++) {
        row.push({
          gx,
          gz,
          type: "empty", // empty | road_local | road_arterial | pln | pdam | starter_highway
          zone: null,    // null | 'R' | 'C' | 'I'
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

    // Tandai sel yang terhubung langsung dengan Gerbang Tol / Jalan Arteri Awal (x ~ 0, z = 9..35)
    for (let gx = 17; gx <= 18; gx++) {
      for (let gz = 20; gz <= 28; gz++) {
        const cell = this.grid[gx][gz];
        cell.type = "starter_highway";
        cell.connectedToGate = true;
      }
    }
  }

  resetCity() {
    while (this.rootGroup.children.length > 0) {
      this.rootGroup.remove(this.rootGroup.children[0]);
    }
    this.buildings = [];
    this.vehicles = [];
    this.nightWindowMats = [];
    this.lensMode = null;
    this.demand = { R: 75, C: 45, I: 55 };
    this._initGrid();
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

  isRoadType(type) {
    return type === "road_local" || type === "road_arterial" || type === "starter_highway";
  }

  applyToolAt(wx, wz, toolId, spendCallback) {
    const coord = this.worldToGrid(wx, wz);
    if (!coord) return false;
    const cell = this.getCell(coord.gx, coord.gz);
    if (!cell || cell.type === "starter_highway") return false;

    const pos = this.gridToWorld(coord.gx, coord.gz);
    const groundY = this.gfx.getHeightAt(pos.x, pos.z);

    if (toolId === "bulldoze") {
      return this._bulldozeCell(cell, spendCallback);
    }

    if (toolId === "zone_clear") {
      if (cell.zone || cell.building) {
        this._clearBuilding(cell);
        cell.zone = null;
        if (cell.zoneMesh) {
          this.rootGroup.remove(cell.zoneMesh);
          cell.zoneMesh = null;
        }
        this._recalculateNetworks();
        return true;
      }
      return false;
    }

    if (toolId === "road_local" || toolId === "road_arterial") {
      if (cell.type === toolId || cell.building || cell.type === "pln" || cell.type === "pdam") return false;
      if (groundY > 11.5) return false; // Terlalu curam di puncak gunung

      const isBridge = groundY < 0.15;
      const cost = (toolId === "road_arterial" ? 0.35 : 0.15) * (isBridge ? 2.2 : 1);
      if (!spendCallback(cost)) return false;

      if (cell.zone) {
        cell.zone = null;
        if (cell.zoneMesh) {
          this.rootGroup.remove(cell.zoneMesh);
          cell.zoneMesh = null;
        }
      }
      if (cell.mesh) this.rootGroup.remove(cell.mesh);

      cell.type = toolId;
      this._clearTreesNear(pos.x, pos.z, 2.2);
      this._rebuildRoadAndNeighbors(coord.gx, coord.gz);
      this._recalculateNetworks();
      return true;
    }

    if (toolId === "pln" || toolId === "pdam") {
      if (cell.type !== "empty" || cell.building || groundY < 0.2 || groundY > 10.5) return false;
      const cost = toolId === "pln" ? 4.5 : 3.5;
      if (!spendCallback(cost)) return false;

      if (cell.zoneMesh) {
        this.rootGroup.remove(cell.zoneMesh);
        cell.zoneMesh = null;
      }
      cell.zone = null;
      cell.type = toolId;
      this._clearTreesNear(pos.x, pos.z, 2.6);
      cell.mesh = toolId === "pln" ? this._createPLNMesh(pos.x, groundY, pos.z) : this._createPDAMMesh(pos.x, groundY, pos.z);
      this.rootGroup.add(cell.mesh);
      this._recalculateNetworks();
      return true;
    }

    if (toolId === "zone_r" || toolId === "zone_c" || toolId === "zone_i") {
      if (cell.type !== "empty" || groundY < 0.25 || groundY > 9.5) return false;
      const zCode = toolId === "zone_r" ? "R" : toolId === "zone_c" ? "C" : "I";
      if (cell.zone === zCode) return false;

      if (!spendCallback(0.05)) return false;
      if (cell.building && cell.building.zone !== zCode) {
        this._clearBuilding(cell);
      }
      cell.zone = zCode;
      this._updateZoneOverlay(cell, pos.x, groundY, pos.z);
      this._recalculateNetworks();
      return true;
    }

    return false;
  }

  _bulldozeCell(cell, spendCallback) {
    let didSomething = false;
    if (cell.building) {
      this._clearBuilding(cell);
      didSomething = true;
    }
    if (cell.zone) {
      cell.zone = null;
      if (cell.zoneMesh) {
        this.rootGroup.remove(cell.zoneMesh);
        cell.zoneMesh = null;
      }
      didSomething = true;
    }
    if (cell.type !== "empty" && cell.type !== "starter_highway") {
      const wasRoad = this.isRoadType(cell.type);
      if (cell.mesh) {
        this.rootGroup.remove(cell.mesh);
        cell.mesh = null;
      }
      cell.type = "empty";
      if (wasRoad) {
        this._rebuildRoadAndNeighbors(cell.gx, cell.gz);
      }
      didSomething = true;
    }
    if (didSomething) {
      spendCallback(0.05);
      this._recalculateNetworks();
    }
    return didSomething;
  }

  _clearBuilding(cell) {
    if (!cell.building) return;
    if (cell.building.mesh) {
      this.rootGroup.remove(cell.building.mesh);
    }
    const idx = this.buildings.indexOf(cell.building);
    if (idx !== -1) this.buildings.splice(idx, 1);
    cell.building = null;
  }

  _clearTreesNear(wx, wz, radius) {
    for (let i = this.gfx.trees.length - 1; i >= 0; i--) {
      const t = this.gfx.trees[i];
      if (Math.hypot(t.position.x - wx, t.position.z - wz) < radius) {
        this.gfx.scene.remove(t);
        this.gfx.trees.splice(i, 1);
      }
    }
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
      if (!c || (c.type !== "road_local" && c.type !== "road_arterial")) return;
      if (c.mesh) this.rootGroup.remove(c.mesh);
      const pos = this.gridToWorld(cx, cz);
      const y = this.gfx.getHeightAt(pos.x, pos.z);
      c.mesh = this._createRoadMesh(cx, cz, pos.x, y, pos.z, c.type);
      this.rootGroup.add(c.mesh);
    });
  }

  _createRoadMesh(gx, gz, wx, groundY, wz, roadType) {
    const group = new THREE.Group();
    const isArterial = roadType === "road_arterial";
    const isBridge = groundY < 0.15;
    const roadY = isBridge ? 0.85 : groundY + 0.06;
    const width = isArterial ? 2.55 : 1.75;
    const s = this.cellSize;

    const nUp = this.isRoadType(this.getCell(gx, gz - 1)?.type);
    const nDown = this.isRoadType(this.getCell(gx, gz + 1)?.type);
    const nLeft = this.isRoadType(this.getCell(gx - 1, gz)?.type);
    const nRight = this.isRoadType(this.getCell(gx + 1, gz)?.type);

    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
    const markMat = new THREE.MeshBasicMaterial({ color: isArterial ? 0xfacc15 : 0xf8fafc });

    // Trotoar / Dek Jembatan
    const base = new THREE.Mesh(new THREE.BoxGeometry(s, 0.1, s), sidewalkMat);
    base.position.set(wx, roadY - 0.02, wz);
    base.receiveShadow = true;
    group.add(base);

    // Inti Aspal Tengah
    const center = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, width), asphaltMat);
    center.position.set(wx, roadY, wz);
    center.receiveShadow = true;
    group.add(center);

    const halfS = s / 2;
    const armLen = (s - width) / 2 + 0.05;

    if (nUp) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, armLen), asphaltMat);
      arm.position.set(wx, roadY, wz - halfS + armLen / 2);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, halfS * 0.75), markMat);
      m.position.set(wx, roadY + 0.01, wz - halfS * 0.55);
      group.add(arm, m);
    }
    if (nDown) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, armLen), asphaltMat);
      arm.position.set(wx, roadY, wz + halfS - armLen / 2);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, halfS * 0.75), markMat);
      m.position.set(wx, roadY + 0.01, wz + halfS * 0.55);
      group.add(arm, m);
    }
    if (nLeft) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.12, width), asphaltMat);
      arm.position.set(wx - halfS + armLen / 2, roadY, wz);
      const m = new THREE.Mesh(new THREE.BoxGeometry(halfS * 0.75, 0.13, 0.11), markMat);
      m.position.set(wx - halfS * 0.55, roadY + 0.01, wz);
      group.add(arm, m);
    }
    if (nRight) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.12, width), asphaltMat);
      arm.position.set(wx + halfS - armLen / 2, roadY, wz);
      const m = new THREE.Mesh(new THREE.BoxGeometry(halfS * 0.75, 0.13, 0.11), markMat);
      m.position.set(wx + halfS * 0.55, roadY + 0.01, wz);
      group.add(arm, m);
    }

    // Pilar & Pagar Jembatan otomatis jika melewati air
    if (isBridge) {
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6 });
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 3.2, 8), pillarMat);
      pillar.position.set(wx, roadY - 1.6, wz);
      group.add(pillar);
    }

    return group;
  }

  _createPLNMesh(wx, groundY, wz) {
    const group = new THREE.Group();
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 0.2, 3.1),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 })
    );
    pad.position.set(wx, groundY + 0.1, wz);

    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.4, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
    );
    hall.position.set(wx - 0.4, groundY + 0.9, wz);
    hall.castShadow = true;

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.74, 0.28, 2.24),
      new THREE.MeshStandardMaterial({ color: 0x0284c7 })
    );
    stripe.position.set(wx - 0.4, groundY + 1.25, wz);

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.48, 2.9, 10),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.4, roughness: 0.4 })
    );
    tower.position.set(wx + 0.85, groundY + 1.55, wz - 0.4);
    tower.castShadow = true;

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    beacon.position.set(wx + 0.85, groundY + 3.1, wz - 0.4);

    group.add(pad, hall, stripe, tower, beacon);
    return group;
  }

  _createPDAMMesh(wx, groundY, wz) {
    const group = new THREE.Group();
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 0.2, 3.1),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 })
    );
    pad.position.set(wx, groundY + 0.1, wz);

    // Bak Penampungan Air Biru
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.65, 14),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    basin.position.set(wx - 0.5, groundY + 0.5, wz + 0.35);

    const waterDisk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 0.84, 0.68, 14),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.2 })
    );
    waterDisk.position.set(wx - 0.5, groundY + 0.51, wz + 0.35);

    // Menara Tandon PDAM
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.32, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1 })
    );
    leg.position.set(wx + 0.75, groundY + 1.2, wz - 0.55);

    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.62, 1.0, 12),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })
    );
    tank.position.set(wx + 0.75, groundY + 2.5, wz - 0.55);
    tank.castShadow = true;

    group.add(pad, basin, waterDisk, leg, tank);
    return group;
  }

  _updateZoneOverlay(cell, wx, groundY, wz) {
    if (cell.zoneMesh) this.rootGroup.remove(cell.zoneMesh);
    const colorMap = { R: 0x22c55e, C: 0x3b82f6, I: 0xeab308 };
    const geo = new THREE.PlaneGeometry(this.cellSize * 0.92, this.cellSize * 0.92);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: colorMap[cell.zone],
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(wx, groundY + 0.08, wz);
    cell.zoneMesh = mesh;
    this.rootGroup.add(mesh);
  }

  setSmartLens(mode) {
    this.lensMode = mode; // null | 'pln' | 'pdam'
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
          opacity: 0.58,
          depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, y + 0.14, pos.z);
        cell.lensMesh = mesh;
        this.rootGroup.add(mesh);
      }
    }
  }

  _recalculateNetworks() {
    // Reset status
    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        const c = this.grid[gx][gz];
        c.powered = false;
        c.watered = false;
        c.connectedToGate = c.type === "starter_highway";
      }
    }

    // 1. BFS Koneksi Jalan dari Gerbang Tol
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

    // 2. Radius Listrik PLN & Air PDAM
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

    // 3. Hitung Statistik
    let roads = 0;
    let rBuildings = 0;
    let cBuildings = 0;
    let iBuildings = 0;
    let unpoweredCount = 0;
    let unwateredCount = 0;

    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        const c = this.grid[gx][gz];
        if (c.type === "road_local" || c.type === "road_arterial") roads++;
        if (c.building) {
          if (c.building.zone === "R") rBuildings += c.building.level;
          if (c.building.zone === "C") cBuildings += c.building.level;
          if (c.building.zone === "I") iBuildings += c.building.level;
          if (!c.powered) unpoweredCount++;
          if (!c.watered) unwateredCount++;
        }
      }
    }

    this.stats = {
      roads,
      plnCount,
      pdamCount,
      powerCap: plnCount * 40,
      powerUsed: rBuildings + cBuildings * 2 + iBuildings * 3,
      waterCap: pdamCount * 45,
      waterUsed: rBuildings + cBuildings + iBuildings * 2,
      rBuildings,
      cBuildings,
      iBuildings,
      unpoweredCount,
      unwateredCount
    };

    if (this.lensMode) {
      this.setSmartLens(this.lensMode);
    }
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

  _hasConnectedRoadAdjacent(gx, gz) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    return dirs.some(([dx, dz]) => {
      const c = this.getCell(gx + dx, gz + dz);
      return c && this.isRoadType(c.type) && c.connectedToGate;
    });
  }

  _createBuildingMesh(zone, level, stage, wx, groundY, wz) {
    const group = new THREE.Group();

    // Tahap Konstruksi Berpagar
    if (stage === "construction") {
      const fence = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.45, 2.5),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 })
      );
      fence.position.set(wx, groundY + 0.22, wz);

      const scaffold = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 1.35, 1.7),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, wireframe: true })
      );
      scaffold.position.set(wx, groundY + 0.75, wz);
      group.add(fence, scaffold);
      return group;
    }

    const winMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    this.nightWindowMats.push(winMat);

    if (zone === "R") {
      if (level === 1) {
        // Rumah Kampung Indonesia (Dinding Krem + Genteng Terakota)
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.0, 1.15, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.75 })
        );
        body.position.set(wx, groundY + 0.58, wz);
        body.castShadow = true;

        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(1.65, 0.95, 4),
          new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 })
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.set(wx, groundY + 1.62, wz);
        roof.castShadow = true;

        const win = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.84), winMat);
        win.position.set(wx, groundY + 0.65, wz);
        group.add(body, roof, win);
      } else if (level === 2) {
        // Rumah Klaster Modern 2 Lantai
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 2.2, 2.1),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
        );
        body.position.set(wx, groundY + 1.1, wz);
        body.castShadow = true;

        const accent = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 2.25, 2.16),
          new THREE.MeshStandardMaterial({ color: 0x475569 })
        );
        accent.position.set(wx - 0.55, groundY + 1.12, wz);

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(2.4, 0.22, 2.3),
          new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        roof.position.set(wx, groundY + 2.28, wz);

        const win = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.3, 2.14), winMat);
        win.position.set(wx + 0.1, groundY + 1.15, wz);
        group.add(body, accent, roof, win);
      } else {
        // Rusunawa / Apartemen Tinggi
        const height = 4.8 + Math.random() * 1.4;
        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(2.3, height, 2.3),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 })
        );
        tower.position.set(wx, groundY + height / 2, wz);
        tower.castShadow = true;

        const win = new THREE.Mesh(new THREE.BoxGeometry(2.34, height * 0.78, 2.34), winMat);
        win.position.set(wx, groundY + height * 0.52, wz);
        group.add(tower, win);
      }
    } else if (zone === "C") {
      if (level === 1) {
        // Warung & Ruko Lokal dengan Kanopi
        const colors = [0xe0f2fe, 0xfef9c3, 0xdcfce7];
        const awningColors = [0x0284c7, 0xdc2626, 0x16a34a];
        const pick = Math.floor(Math.random() * 3);

        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.3, 1.55, 2.1),
          new THREE.MeshStandardMaterial({ color: colors[pick], roughness: 0.6 })
        );
        body.position.set(wx, groundY + 0.78, wz);
        body.castShadow = true;

        const awning = new THREE.Mesh(
          new THREE.BoxGeometry(2.45, 0.22, 0.65),
          new THREE.MeshStandardMaterial({ color: awningColors[pick] })
        );
        awning.position.set(wx, groundY + 0.95, wz + 1.15);

        const win = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 2.14), winMat);
        win.position.set(wx, groundY + 0.55, wz);
        group.add(body, awning, win);
      } else if (level === 2) {
        // Deretan Ruko 3 Lantai Modern
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.5, 3.1, 2.3),
          new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45 })
        );
        body.position.set(wx, groundY + 1.55, wz);
        body.castShadow = true;

        const banner = new THREE.Mesh(
          new THREE.BoxGeometry(2.56, 0.45, 2.36),
          new THREE.MeshStandardMaterial({ color: 0x2563eb })
        );
        banner.position.set(wx, groundY + 2.75, wz);

        const win = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.34), winMat);
        win.position.set(wx, groundY + 1.35, wz);
        group.add(body, banner, win);
      } else {
        // Menara Perkantoran Kaca / Mall
        const height = 6.2 + Math.random() * 2.2;
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.55, height, 2.55),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.65, roughness: 0.2 })
        );
        body.position.set(wx, groundY + height / 2, wz);
        body.castShadow = true;

        const glass = new THREE.Mesh(new THREE.BoxGeometry(2.59, height * 0.85, 2.59), winMat);
        glass.position.set(wx, groundY + height * 0.5, wz);
        group.add(body, glass);
      }
    } else if (zone === "I") {
      if (level === 1) {
        // Bengkel & Gudang Logistik
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.5, 1.35, 2.3),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.75 })
        );
        body.position.set(wx, groundY + 0.68, wz);
        body.castShadow = true;

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(2.65, 0.18, 2.45),
          new THREE.MeshStandardMaterial({ color: 0xd97706 })
        );
        roof.position.set(wx, groundY + 1.42, wz);
        group.add(body, roof);
      } else {
        // Pabrik Manufaktur + Cerobong
        const h = level === 2 ? 2.1 : 3.2;
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, h, 2.5),
          new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.65 })
        );
        body.position.set(wx, groundY + h / 2, wz);
        body.castShadow = true;

        const stack = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.3, h + 1.8, 8),
          new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        stack.position.set(wx + 0.85, groundY + (h + 1.8) / 2, wz - 0.75);
        stack.castShadow = true;
        group.add(body, stack);
      }
    }

    return group;
  }

  updateNightLighting(isNight) {
    this.nightWindowMats.forEach((mat) => {
      mat.color.setHex(isNight ? 0xfef08a : 0x1e293b);
    });
    this.vehicles.forEach((v) => {
      v.headlight.visible = isNight;
    });
  }

  _spawnVehicleIfNeeded() {
    if (this.vehicles.length >= 28) return;
    const roadCells = [];
    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        if (this.isRoadType(this.grid[gx][gz].type) && this.grid[gx][gz].connectedToGate) {
          roadCells.push(this.grid[gx][gz]);
        }
      }
    }
    if (roadCells.length < 4) return;

    const start = roadCells[Math.floor(Math.random() * roadCells.length)];
    const pos = this.gridToWorld(start.gx, start.gz);
    const y = Math.max(0.95, this.gfx.getHeightAt(pos.x, pos.z) + 0.22);

    const group = new THREE.Group();
    const roll = Math.random();
    let bodyColor = 0xf8fafc;
    let isAngkot = false;
    let isBike = false;

    if (roll < 0.32) {
      // Angkot Biru Khas Malang
      bodyColor = 0x0284c7;
      isAngkot = true;
    } else if (roll < 0.62) {
      // Motor
      bodyColor = 0x1e293b;
      isBike = true;
    } else {
      const carCols = [0xf8fafc, 0x94a3b8, 0x0f172a, 0xdc2626];
      bodyColor = carCols[Math.floor(Math.random() * carCols.length)];
    }

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(isBike ? 0.26 : 0.56, isBike ? 0.36 : 0.44, isBike ? 0.62 : 1.05),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35 })
    );
    mesh.position.y = 0.22;
    group.add(mesh);

    if (isAngkot) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.12, 1.07),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc })
      );
      stripe.position.y = 0.24;
      group.add(stripe);
    }

    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(isBike ? 0.18 : 0.44, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3 })
    );
    headlight.position.set(0, 0.2, isBike ? 0.33 : 0.54);
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
      speed: isBike ? 5.2 : 3.8
    });
  }

  _updateVehicles(delta) {
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const dx = v.targetX - v.mesh.position.x;
      const dz = v.targetZ - v.mesh.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.25) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const candidates = [];
        for (const [ox, oz] of dirs) {
          const nx = v.gx + ox;
          const nz = v.gz + oz;
          const nc = this.getCell(nx, nz);
          if (nc && this.isRoadType(nc.type) && !(nx === v.prevGx && nz === v.prevGz)) {
            candidates.push(nc);
          }
        }
        // Boleh putar balik kalau buntu
        if (candidates.length === 0) {
          const back = this.getCell(v.prevGx, v.prevGz);
          if (back && this.isRoadType(back.type)) candidates.push(back);
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
        v.mesh.position.y = Math.max(0.95, groundY + 0.16);
        v.mesh.lookAt(v.targetX, v.mesh.position.y, v.targetZ);
      }
    }
  }

  stepSimulation(delta, simSpeed) {
    if (simSpeed <= 0) return;

    // 1. Tumbuhkan & Evolusi Bangunan di Zona RCI
    if (Math.random() < 0.28 * simSpeed) {
      const gx = Math.floor(Math.random() * this.gridSize);
      const gz = Math.floor(Math.random() * this.gridSize);
      const cell = this.grid[gx][gz];

      if (cell && cell.zone && this._hasConnectedRoadAdjacent(gx, gz)) {
        const pos = this.gridToWorld(gx, gz);
        const y = this.gfx.getHeightAt(pos.x, pos.z);

        if (!cell.building) {
          // Mulai tahap konstruksi
          const mesh = this._createBuildingMesh(cell.zone, 1, "construction", pos.x, y, pos.z);
          this.rootGroup.add(mesh);
          const b = { zone: cell.zone, level: 1, stage: "construction", mesh };
          cell.building = b;
          this.buildings.push(b);
          this._clearTreesNear(pos.x, pos.z, 2.0);
          this._recalculateNetworks();
        } else if (cell.building.stage === "construction") {
          // Selesai dibangun menjadi Level 1
          this.rootGroup.remove(cell.building.mesh);
          const mesh = this._createBuildingMesh(cell.zone, 1, "built", pos.x, y, pos.z);
          this.rootGroup.add(mesh);
          cell.building.mesh = mesh;
          cell.building.stage = "built";
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
          // Evolusi naik ke Level 2 atau Level 3 jika listrik & air terpenuhi
          cell.building.level += 1;
          this.rootGroup.remove(cell.building.mesh);
          const mesh = this._createBuildingMesh(cell.zone, cell.building.level, "built", pos.x, y, pos.z);
          this.rootGroup.add(mesh);
          cell.building.mesh = mesh;
          this._recalculateNetworks();
        }
      }
    }

    // 2. Update Demand RCI Dinamis
    const r = this.stats.rBuildings;
    const c = this.stats.cBuildings;
    const i = this.stats.iBuildings;
    this.demand.R = Math.max(15, Math.min(95, 72 + (c + i) * 3 - r * 2));
    this.demand.C = Math.max(10, Math.min(95, 30 + r * 3 - c * 4));
    this.demand.I = Math.max(10, Math.min(95, 45 + r * 2 - i * 3));

    // 3. Lalu Lintas Kendaraan
    if (Math.random() < 0.08 * simSpeed) this._spawnVehicleIfNeeded();
    this._updateVehicles(delta * simSpeed);
  }
}
