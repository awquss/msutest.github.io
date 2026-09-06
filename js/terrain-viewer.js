import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const DEFAULT_VERTICAL_EXAGGERATION = 2.2;
const OBJECT_LIFT_M = 120;
const METERS_PER_DEG_LAT = 111320;

export function createSampleTerrain() {
  const width = 65;
  const height = 65;
  const cellSizeMeters = 1000;
  const xMin = -32000;
  const yMin = -32000;
  const elevations = [];

  for (let row = 0; row < height; row += 1) {
    const yNorm = row / Math.max(1, height - 1);
    const rowValues = [];
    for (let col = 0; col < width; col += 1) {
      const xNorm = col / Math.max(1, width - 1);
      const ridge = Math.sin(xNorm * Math.PI * 2.4 + 0.4) * 180;
      const valley = Math.cos(yNorm * Math.PI * 3.1) * 120;
      const hillA = gaussian2d(xNorm, yNorm, 0.32, 0.36, 0.08, 700);
      const hillB = gaussian2d(xNorm, yNorm, 0.72, 0.64, 0.13, 520);
      const basin = gaussian2d(xNorm, yNorm, 0.58, 0.28, 0.16, -260);
      rowValues.push(Math.round(900 + ridge + valley + hillA + hillB + basin));
    }
    elevations.push(rowValues);
  }

  return normalizeTerrain({
    type: "dted-grid",
    name: "Ornek DTED Arazi",
    source: "generated-sample",
    origin: { x: xMin, y: yMin },
    cellSizeMeters,
    cellSizeXMeters: cellSizeMeters,
    cellSizeYMeters: cellSizeMeters,
    rowsNorthToSouth: true,
    elevations
  });
}

export function normalizeTerrain(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Arazi verisi JSON nesnesi olmali.");
  }

  const matrix = readElevationMatrix(raw);
  const height = matrix.length;
  const width = matrix[0]?.length || 0;
  if (width < 2 || height < 2) {
    throw new Error("Arazi grid'i en az 2x2 olmalidir.");
  }

  const cellSizeMeters = positiveNumber(raw.cellSizeMeters ?? raw.cellSize ?? raw.resolutionMeters ?? raw.resolution, 1000);
  const cellSizeXMeters = positiveNumber(raw.cellSizeXMeters ?? raw.cellSizeX ?? raw.xResolutionMeters, cellSizeMeters);
  const cellSizeYMeters = positiveNumber(raw.cellSizeYMeters ?? raw.cellSizeY ?? raw.yResolutionMeters, cellSizeMeters);
  const origin = raw.origin && typeof raw.origin === "object" ? raw.origin : {};
  const xMin = finiteNumber(raw.xMin ?? origin.x ?? 0);
  const yMin = finiteNumber(raw.yMin ?? origin.y ?? 0);
  const xMax = finiteNumber(raw.xMax ?? (xMin + (width - 1) * cellSizeXMeters));
  const yMax = finiteNumber(raw.yMax ?? (yMin + (height - 1) * cellSizeYMeters));
  const stats = computeElevationStats(matrix);

  return {
    type: "dted-grid",
    name: String(raw.name || raw.id || "DTED Arazi"),
    source: String(raw.source || raw.fileName || ""),
    origin: {
      x: xMin,
      y: yMin,
      lat: numberOrNull(origin.lat ?? raw.latOrigin),
      lon: numberOrNull(origin.lon ?? raw.lonOrigin)
    },
    width,
    height,
    cellSizeMeters,
    cellSizeXMeters,
    cellSizeYMeters,
    rowsNorthToSouth: raw.rowsNorthToSouth !== false,
    xMin,
    xMax,
    yMin,
    yMax,
    minElevationM: stats.min,
    maxElevationM: stats.max,
    crs: raw.crs || null,
    geo: raw.geo || null,
    elevations: matrix
  };
}

export function buildTerrainExport(terrain) {
  if (!terrain) {
    return null;
  }

  return {
    type: terrain.type,
    name: terrain.name,
    source: terrain.source,
    origin: terrain.origin,
    width: terrain.width,
    height: terrain.height,
    cellSizeMeters: terrain.cellSizeMeters,
    cellSizeXMeters: terrain.cellSizeXMeters,
    cellSizeYMeters: terrain.cellSizeYMeters,
    extent: {
      xMin: terrain.xMin,
      xMax: terrain.xMax,
      yMin: terrain.yMin,
      yMax: terrain.yMax
    },
    elevationM: {
      min: terrain.minElevationM,
      max: terrain.maxElevationM
    },
    crs: terrain.crs,
    geo: terrain.geo
  };
}

export class TerrainViewer {
  constructor(mount) {
    this.mount = mount;
    this.terrain = null;
    this.sceneData = null;
    this.onTerrainPoint = null;
    this.animationId = null;
    this.mesh = null;
    this.labels = [];
    this.pointerDown = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.objects = new THREE.Group();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07110d);
    this.scene.fog = new THREE.Fog(0x07110d, 50000, 220000);

    this.camera = new THREE.PerspectiveCamera(48, 1, 1, 500000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.mount.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI * 0.48;

    const hemi = new THREE.HemisphereLight(0xbfeedd, 0x16231d, 1.8);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-30000, 70000, 45000);
    this.scene.add(sun);
    this.scene.add(this.objects);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.mount);
    this.renderer.domElement.addEventListener("pointerdown", (event) => this.handlePointerDown(event));
    this.renderer.domElement.addEventListener("pointerup", (event) => this.handlePointerUp(event));
    this.resize();
    this.animate();
  }

  setTerrain(terrain) {
    this.terrain = terrain;
    this.buildTerrainMesh();
    this.buildObjects();
    this.fitCamera();
  }

  setSceneData(sceneData) {
    this.sceneData = sceneData || null;
    this.buildObjects();
  }

  zoomCamera(multiplier) {
    const factor = Number(multiplier) || 1;
    if (factor <= 0) {
      return;
    }
    const direction = this.camera.position.clone().sub(this.controls.target);
    direction.multiplyScalar(1 / factor);
    this.camera.position.copy(this.controls.target).add(direction);
    this.controls.update();
  }

  resetCamera() {
    this.fitCamera();
  }

  resize() {
    const rect = this.mount.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width || 1));
    const height = Math.max(320, Math.floor(rect.height || width * 0.54));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  render() {
    this.controls.update();
    for (const label of this.labels) {
      label.quaternion.copy(this.camera.quaternion);
    }
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
    disposeObject(this.mesh);
    disposeObject(this.objects);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  handlePointerDown(event) {
    this.pointerDown = { x: event.clientX, y: event.clientY };
  }

  handlePointerUp(event) {
    if (!this.pointerDown || !this.mesh || typeof this.onTerrainPoint !== "function") {
      this.pointerDown = null;
      return;
    }

    const dx = event.clientX - this.pointerDown.x;
    const dy = event.clientY - this.pointerDown.y;
    this.pointerDown = null;
    if (Math.hypot(dx, dy) > 5) {
      return;
    }

    const point = this.pickTerrainPoint(event);
    if (point) {
      this.onTerrainPoint(point);
    }
  }

  pickTerrainPoint(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hit = this.raycaster.intersectObject(this.mesh, false)[0];
    if (!hit) {
      return null;
    }

    const centerX = (this.terrain.xMin + this.terrain.xMax) / 2;
    const centerY = (this.terrain.yMin + this.terrain.yMax) / 2;
    const x = hit.point.x + centerX;
    const y = centerY - hit.point.z;
    const z = sampleElevation(this.terrain, x, y);
    return {
      x: Math.round(x),
      y: Math.round(y),
      z: Math.round(z),
      elevationM: z,
      geo: localPointToGeo(this.terrain, x, y)
    };
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.render();
  }

  buildTerrainMesh() {
    disposeObject(this.mesh);
    this.mesh = null;

    if (!this.terrain) {
      return;
    }

    const geometry = buildTerrainGeometry(this.terrain);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
  }

  buildObjects() {
    disposeObject(this.objects);
    this.objects = new THREE.Group();
    this.labels = [];
    this.scene.add(this.objects);

    if (!this.terrain || !this.sceneData) {
      return;
    }

    for (const region of this.sceneData.assets || []) {
      addRegionObject(this.objects, this.labels, this.terrain, region);
    }

    for (const ring of this.sceneData.coverageRings || []) {
      addCoverageRing(this.objects, this.terrain, ring);
    }

    for (const unit of this.sceneData.units || []) {
      addUnitObject(this.objects, this.labels, this.terrain, unit);
    }
  }

  fitCamera() {
    if (!this.terrain) {
      this.camera.position.set(0, 45000, 65000);
      this.controls.target.set(0, 0, 0);
      return;
    }

    const span = Math.max(this.terrain.xMax - this.terrain.xMin, this.terrain.yMax - this.terrain.yMin, 1000);
    this.controls.target.set(0, 0, 0);
    this.camera.near = 1;
    this.camera.far = span * 8;
    this.camera.position.set(-span * 0.45, span * 0.62, span * 0.88);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }
}

function readElevationMatrix(raw) {
  if (Array.isArray(raw.elevations) && Array.isArray(raw.elevations[0])) {
    return raw.elevations.map((row) => row.map((value) => finiteNumber(value)));
  }

  const width = Math.floor(positiveNumber(raw.width ?? raw.cols ?? raw.columns, 0));
  const height = Math.floor(positiveNumber(raw.height ?? raw.rows, 0));
  const flat = Array.isArray(raw.elevations) ? raw.elevations : (Array.isArray(raw.data) ? raw.data : null);
  if (!flat || width < 2 || height < 2 || flat.length < width * height) {
    throw new Error("Arazi verisi elevations matrisi veya width/height/data alani icermeli.");
  }

  const matrix = [];
  for (let row = 0; row < height; row += 1) {
    const start = row * width;
    matrix.push(flat.slice(start, start + width).map((value) => finiteNumber(value)));
  }
  return matrix;
}

function buildTerrainGeometry(terrain) {
  const width = terrain.width;
  const height = terrain.height;
  const positions = [];
  const colors = [];
  const indices = [];
  const centerX = (terrain.xMin + terrain.xMax) / 2;
  const centerY = (terrain.yMin + terrain.yMax) / 2;
  const color = new THREE.Color();
  const min = terrain.minElevationM;
  const max = terrain.maxElevationM;

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const worldX = terrain.xMin + col * terrain.cellSizeXMeters;
      const worldY = terrain.rowsNorthToSouth
        ? terrain.yMax - row * terrain.cellSizeYMeters
        : terrain.yMin + row * terrain.cellSizeYMeters;
      const elevation = terrain.elevations[row][col];
      const t = (elevation - min) / Math.max(1, max - min);
      positions.push(worldX - centerX, elevation * DEFAULT_VERTICAL_EXAGGERATION, -(worldY - centerY));
      color.set(getTerrainColor(t));
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let row = 0; row < height - 1; row += 1) {
    for (let col = 0; col < width - 1; col += 1) {
      const a = row * width + col;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addRegionObject(group, labels, terrain, region) {
  const points = Array.isArray(region?.points) ? region.points : [];
  if (!points.length) {
    return;
  }

  const color = region.assetClass === "eirsRadar" ? 0x7fd8ff : 0x5fe0a2;
  if (region.type === "area" && points.length >= 3) {
    const line = buildLineOnTerrain(terrain, [...points, points[0]], color, 5, OBJECT_LIFT_M);
    group.add(line);
  }

  const center = region.center || averagePoint(points);
  addMarker(group, terrain, center.x, center.y, color, 220, 620);
  addLabel(group, labels, terrain, center.x, center.y, String(region.name || region.id || "Varlik"), color, OBJECT_LIFT_M + 820);
}

function addUnitObject(group, labels, terrain, unit) {
  const color = parseThreeColor(unit.color || "#8fd6b9", 0x8fd6b9);
  addMarker(group, terrain, unit.x, unit.y, color, 260, 760);
  addLabel(group, labels, terrain, unit.x, unit.y, String(unit.label || unit.code || "HSS"), color, OBJECT_LIFT_M + 980);

  const components = unit.components || {};
  const componentPoints = [];
  for (const item of [components.radar, components.kkm, components.akr, components.eo, ...(components.ffs || [])]) {
    if (isFinitePoint(item)) {
      componentPoints.push(item);
      addMarker(group, terrain, item.x, item.y, color, 110, 320);
    }
  }
  if (componentPoints.length > 1) {
    group.add(buildLineOnTerrain(terrain, componentPoints, color, 2, OBJECT_LIFT_M + 80));
  }
}

function addCoverageRing(group, terrain, ring) {
  const radius = Number(ring?.radiusM) || 0;
  if (!isFinitePoint(ring) || radius <= 0) {
    return;
  }

  const color = parseThreeColor(ring.color || "#7fd8ff", 0x7fd8ff);
  const width = ring.type === "wez" ? 2 : 3;
  const opacity = ring.type === "wez" ? 0.62 : 0.42;
  const footprints = Array.isArray(ring.footprint) && ring.footprint.length
    ? ring.footprint
    : [buildCircularCoveragePoints(ring, radius)];

  for (const points of footprints) {
    if (!Array.isArray(points) || points.length < 2) {
      continue;
    }
    const line = buildLineOnTerrain(terrain, points, color, width, OBJECT_LIFT_M + 120);
    line.material.transparent = true;
    line.material.opacity = opacity;
    group.add(line);
  }
}

function buildCircularCoveragePoints(ring, radius) {
  const segments = 96;
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: ring.x + Math.cos(angle) * radius,
      y: ring.y + Math.sin(angle) * radius
    });
  }
  return points;
}

function addMarker(group, terrain, x, y, color, radius, height) {
  const local = toLocal3d(terrain, x, y, OBJECT_LIFT_M);
  const geometry = new THREE.CylinderGeometry(radius, radius * 0.72, height, 18);
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12 });
  const marker = new THREE.Mesh(geometry, material);
  marker.position.set(local.x, local.y + height / 2, local.z);
  group.add(marker);
}

function addLabel(group, labels, terrain, x, y, text, color, lift) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createLabelTexture(text, color),
    transparent: true,
    depthWrite: false
  }));
  const local = toLocal3d(terrain, x, y, lift);
  sprite.position.set(local.x, local.y, local.z);
  sprite.scale.set(3600, 900, 1);
  group.add(sprite);
  labels.push(sprite);
}

function buildLineOnTerrain(terrain, points, color, width, lift) {
  const positions = [];
  for (const point of points) {
    if (!isFinitePoint(point)) {
      continue;
    }
    const local = toLocal3d(terrain, point.x, point.y, lift);
    positions.push(local.x, local.y, local.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, linewidth: width });
  return new THREE.Line(geometry, material);
}

function toLocal3d(terrain, x, y, lift = 0) {
  const centerX = (terrain.xMin + terrain.xMax) / 2;
  const centerY = (terrain.yMin + terrain.yMax) / 2;
  return {
    x: x - centerX,
    y: sampleElevation(terrain, x, y) * DEFAULT_VERTICAL_EXAGGERATION + lift,
    z: -(y - centerY)
  };
}

function sampleElevation(terrain, x, y) {
  const colFloat = (x - terrain.xMin) / terrain.cellSizeXMeters;
  const rowFloat = terrain.rowsNorthToSouth
    ? (terrain.yMax - y) / terrain.cellSizeYMeters
    : (y - terrain.yMin) / terrain.cellSizeYMeters;
  const col = Math.max(0, Math.min(terrain.width - 1, colFloat));
  const row = Math.max(0, Math.min(terrain.height - 1, rowFloat));
  const c0 = Math.floor(col);
  const r0 = Math.floor(row);
  const c1 = Math.min(terrain.width - 1, c0 + 1);
  const r1 = Math.min(terrain.height - 1, r0 + 1);
  const tx = col - c0;
  const ty = row - r0;
  const a = terrain.elevations[r0][c0];
  const b = terrain.elevations[r0][c1];
  const c = terrain.elevations[r1][c0];
  const d = terrain.elevations[r1][c1];
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

function localPointToGeo(terrain, x, y) {
  const center = terrain?.geo?.center;
  const lat = Number(center?.lat);
  const lon = Number(center?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  if (!Number.isFinite(metersPerDegLon) || Math.abs(metersPerDegLon) < 1e-6) {
    return null;
  }
  return {
    lat: lat + y / METERS_PER_DEG_LAT,
    lon: lon + x / metersPerDegLon
  };
}

function createLabelTexture(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(4, 10, 8, 0.82)";
  ctx.strokeStyle = `#${new THREE.Color(color).getHexString()}`;
  ctx.lineWidth = 8;
  ctx.fillRect(8, 24, 496, 72);
  ctx.strokeRect(8, 24, 496, 72);
  ctx.font = "700 38px Space Grotesk, sans-serif";
  ctx.fillStyle = "#def6e7";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.slice(0, 22), 256, 60, 460);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function disposeObject(object) {
  if (!object) {
    return;
  }
  object.traverse?.((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      for (const material of child.material) {
        material.map?.dispose?.();
        material.dispose?.();
      }
    } else {
      child.material?.map?.dispose?.();
      child.material?.dispose?.();
    }
  });
  object.parent?.remove(object);
}

function getTerrainColor(t) {
  if (t < 0.18) {
    return "#203d37";
  }
  if (t < 0.38) {
    return "#315f46";
  }
  if (t < 0.62) {
    return "#6f7b46";
  }
  if (t < 0.82) {
    return "#8b7352";
  }
  return "#c8c7aa";
}

function computeElevationStats(matrix) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const row of matrix) {
    for (const value of row) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  return {
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 0
  };
}

function parseThreeColor(value, fallback) {
  try {
    return new THREE.Color(value).getHex();
  } catch (_err) {
    return fallback;
  }
}

function averagePoint(points) {
  const sum = points.reduce((acc, point) => ({
    x: acc.x + (Number(point?.x) || 0),
    y: acc.y + (Number(point?.y) || 0)
  }), { x: 0, y: 0 });
  return {
    x: sum.x / Math.max(1, points.length),
    y: sum.y / Math.max(1, points.length)
  };
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function gaussian2d(x, y, cx, cy, sigma, amplitude) {
  const dx = x - cx;
  const dy = y - cy;
  return amplitude * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
}

function finiteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function positiveNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
