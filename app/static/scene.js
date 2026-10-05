import * as THREE from "./vendor/three.module.js";
const dialog = document.querySelector("#scene-dialog");
const canvas = document.querySelector("#scene");
const stage = document.querySelector(".scene-stage");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let renderer, scene, camera, ring, material;
let frame = 0,
  running = false,
  dragging = false;
let paused = reduced.matches,
  rx = -0.24,
  ry = -0.8,
  zoom = 1;
let lastX = 0,
  lastY = 0,
  lastTime = 0;
const finishes = { yellow: 0xd8b05f, rose: 0xc88e7b, white: 0xd2d2cc };
function syncMotion() {
  const button = document.querySelector("#motion");
  button.textContent = paused ? "Riprendi rotazione" : "Pausa rotazione";
  button.setAttribute("aria-pressed", String(paused));
}
function ringGeometry() {
  const segments = 192,
    sides = 64,
    positions = [],
    normals = [],
    indices = [];
  const point = (u, v) => {
    const crown = (Math.sin(u) + 1) / 2;
    const radius =
      1.16 + (0.14 + 0.075 * crown) * Math.cos(v) + 0.035 * Math.sin(2 * u);
    return new THREE.Vector3(
      radius * Math.cos(u),
      radius * Math.sin(u),
      (0.2 + 0.48 * crown * crown) * Math.sin(v) + 0.17 * Math.sin(2 * u),
    );
  };
  for (let i = 0; i <= segments; i++) {
    const u = (i / segments) * Math.PI * 2;
    for (let j = 0; j <= sides; j++) {
      const v = (j / sides) * Math.PI * 2;
      const p = point(u, v),
        tangentU = point(u + 0.0001, v).sub(point(u - 0.0001, v));
      const tangentV = point(u, v + 0.0001).sub(point(u, v - 0.0001));
      const normal = tangentU.cross(tangentV).normalize();
      positions.push(p.x, p.y, p.z);
      normals.push(normal.x, normal.y, normal.z);
      if (i < segments && j < sides) {
        const a = i * (sides + 1) + j,
          b = a + sides + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}
function studioEnvironment() {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0xb8b3aa);
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(12, 10, 12),
    new THREE.MeshBasicMaterial({ color: 0xaaa59b, side: THREE.BackSide }),
  );
  studio.add(room);
  const panel = (width, height, x, y, z, ry, color, strength) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    mesh.material.color.multiplyScalar(strength);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    studio.add(mesh);
  };
  panel(3.5, 7, -4.5, 2, 0, Math.PI / 2, 0xfff8e6, 5);
  panel(1, 6, 4.5, 1, 1.5, -Math.PI / 2, 0xffffff, 8);
  panel(6, 1.3, 0, 3.5, -4, 0, 0xffe6bd, 3);
  panel(2, 7, 2.5, 0, -4.8, 0, 0x161616, 1);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.03);
  pmrem.dispose();
  studio.traverse((object) => {
    object.geometry?.dispose();
    if (object.material) object.material.dispose();
  });
  return environment.texture;
}
function resize() {
  if (!renderer || !dialog.open) return;
  const width = stage.clientWidth,
    height = stage.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  render();
}
function render() {
  if (!renderer) return;
  ring.rotation.set(rx, ry, 0.18);
  camera.position.z = 5.2 / zoom;
  renderer.render(scene, camera);
}
function tick(time) {
  if (!running) return;
  const delta = Math.min((time - lastTime) / 1000 || 0, 0.05);
  lastTime = time;
  if (!paused && !dragging) ry += delta * 0.22;
  render();
  frame = requestAnimationFrame(tick);
}
export function initialize() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xede8df);
  scene.environment = studioEnvironment();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
  camera.position.set(0, 0.08, 5.2);
  camera.lookAt(0, 0, 0);
  material = new THREE.MeshPhysicalMaterial({
    color: finishes.yellow,
    metalness: 1,
    roughness: 0.16,
    envMapIntensity: 1.1,
    clearcoat: 0.4,
    clearcoatRoughness: 0.18,
  });
  ring = new THREE.Mesh(ringGeometry(), material);
  ring.castShadow = true;
  scene.add(ring);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.13 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.47;
  floor.receiveShadow = true;
  scene.add(floor);
  const light = new THREE.DirectionalLight(0xfff6df, 4);
  light.position.set(-3, 6, 5);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = -3;
  light.shadow.camera.right = 3;
  light.shadow.camera.top = 3;
  light.shadow.camera.bottom = -3;
  light.shadow.bias = -0.0005;
  scene.add(light, new THREE.HemisphereLight(0xffffff, 0x62503c, 1.5));
  document.querySelector("#scene-fallback").hidden = true;
  canvas.hidden = false;
  new ResizeObserver(resize).observe(stage);
  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    ry += (event.clientX - lastX) * 0.009;
    rx = THREE.MathUtils.clamp(rx + (event.clientY - lastY) * 0.009, -1.5, 1.5);
    lastX = event.clientX;
    lastY = event.clientY;
    render();
  });
  canvas.addEventListener("pointerup", () => {
    dragging = false;
  });
  canvas.addEventListener("pointercancel", () => {
    dragging = false;
  });
  canvas.addEventListener("lostpointercapture", () => {
    dragging = false;
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoom = THREE.MathUtils.clamp(zoom - event.deltaY * 0.0006, 0.75, 1.45);
      render();
    },
    { passive: false },
  );
  canvas.addEventListener("keydown", (event) => {
    const movements = {
      ArrowLeft: [0, -0.15],
      ArrowRight: [0, 0.15],
      ArrowUp: [-0.15, 0],
      ArrowDown: [0.15, 0],
    };
    if (movements[event.key]) {
      event.preventDefault();
      rx = THREE.MathUtils.clamp(rx + movements[event.key][0], -1.5, 1.5);
      ry += movements[event.key][1];
    } else if (["+", "=", "-"].includes(event.key)) {
      event.preventDefault();
      zoom = THREE.MathUtils.clamp(
        zoom + (event.key === "-" ? -0.1 : 0.1),
        0.75,
        1.45,
      );
    }
    render();
  });
  document.querySelectorAll("[data-finish]").forEach((button) =>
    button.addEventListener("click", () => {
      material.color.setHex(finishes[button.dataset.finish]);
      document.querySelectorAll("[data-finish]").forEach((other) => {
        other.classList.toggle("selected", other === button);
        other.setAttribute("aria-pressed", String(other === button));
      });
      document.querySelector("#scene-status").textContent =
        "Finitura selezionata: " +
        button.textContent.trim() +
        ". Modello di design illustrativo.";
      render();
    }),
  );
  document.querySelector("#motion").addEventListener("click", () => {
    paused = !paused;
    syncMotion();
  });
  document.querySelector("#reset-scene").addEventListener("click", () => {
    rx = -0.24;
    ry = -0.8;
    zoom = 1;
    render();
  });
  reduced.addEventListener("change", () => {
    paused = reduced.matches;
    syncMotion();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspend();
    else if (dialog.open) resume();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    suspend();
    canvas.hidden = true;
    document.querySelector("#scene-fallback").hidden = false;
    dialog.classList.add("scene-error");
    document.querySelector("#scene-status").textContent =
      "La scena 3D è stata sospesa dal browser. Ricarica la pagina per riprovare.";
  });
  syncMotion();
  resize();
}
export function resume() {
  if (
    !renderer ||
    running ||
    document.hidden ||
    dialog.classList.contains("scene-error")
  )
    return;
  running = true;
  lastTime = performance.now();
  resize();
  frame = requestAnimationFrame(tick);
}
export function suspend() {
  running = false;
  dragging = false;
  cancelAnimationFrame(frame);
}
