import * as THREE from "./vendor/three.module.js";
const canvas = document.querySelector("#scene"),
  motion = document.querySelector("#motion"),
  wireButton = document.querySelector("#wire"),
  reduced = matchMedia("(prefers-reduced-motion: reduce)");
let paused = reduced.matches,
  wire = false,
  rx = -0.1,
  ry = -0.3,
  zoom = 1,
  drag = false,
  lx = 0,
  ly = 0;
function sync() {
  motion.textContent = paused ? "Riprendi" : "Pausa";
  motion.setAttribute("aria-pressed", String(paused));
}
sync();
motion.onclick = () => {
  paused = !paused;
  sync();
};
reduced.addEventListener("change", () => {
  paused = reduced.matches;
  sync();
});
function fallback() {
  canvas.hidden = true;
  document.querySelector("#fallback").hidden = false;
  document.querySelector(".scene-controls").hidden = true;
}
try {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 1.6, 10);
  camera.lookAt(0, 0, 0);
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x343538);
  function panel(color, intensity, x, y, z, w, h) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide,
      }),
    );
    p.position.set(x, y, z);
    p.lookAt(0, 0, 0);
    studio.add(p);
  }
  panel(0xffffff, 6, -4, 3, 5, 3, 8);
  panel(0xffffff, 4, 5, 4, 1, 3, 7);
  panel(0xffa278, 2, -1, -4, 2, 4, 3);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.05);
  scene.environment = environment.texture;
  pmrem.dispose();
  studio.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4c2d20, 1));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(-4, 7, 6);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.normalBias = 0.03;
  scene.add(light);
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xd8dadc,
    metalness: 1,
    roughness: 0.24,
    clearcoat: 1,
  });
  const orange = new THREE.MeshPhysicalMaterial({
    color: 0xff571c,
    metalness: 0.45,
    roughness: 0.28,
    clearcoat: 1,
  });
  const group = new THREE.Group();
  scene.add(group);
  function letter(points, x, material) {
    const s = new THREE.Shape();
    points.forEach(([px, py], i) => (i ? s.lineTo(px, py) : s.moveTo(px, py)));
    s.closePath();
    const geometry = new THREE.ExtrudeGeometry(s, {
      depth: 0.62,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.08,
      bevelSegments: 4,
      steps: 1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, -1.25, -0.3);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  letter(
    [
      [0, 0],
      [0.64, 0],
      [0.64, 1.02],
      [1.47, 1.02],
      [1.47, 1.61],
      [0.64, 1.61],
      [0.64, 2.03],
      [1.7, 2.03],
      [1.7, 2.65],
      [0, 2.65],
    ],
    -2.3,
    chrome,
  );
  letter(
    [
      [0, 0],
      [0.65, 0],
      [0.65, 1.5],
      [1.24, 0.58],
      [1.83, 1.5],
      [1.83, 0],
      [2.48, 0],
      [2.48, 2.65],
      [1.85, 2.65],
      [1.24, 1.62],
      [0.63, 2.65],
      [0, 2.65],
    ],
    -0.2,
    orange,
  );
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.ShadowMaterial({ opacity: 0.25 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.6;
  shadow.receiveShadow = true;
  scene.add(shadow);
  const grid = new THREE.GridHelper(16, 24, 0x555453, 0x333435);
  grid.position.y = -1.62;
  grid.material.transparent = true;
  grid.material.opacity = 0.25;
  scene.add(grid);
  function resize() {
    const w = canvas.parentElement.clientWidth,
      h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const dist = (w / h < 1 ? 11.3 : 10) / zoom;
    camera.position.set(0, 1.6, dist);
    camera.lookAt(0, 0, 0);
  }
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();
  wireButton.onclick = () => {
    wire = !wire;
    chrome.wireframe = orange.wireframe = wire;
    wireButton.textContent = wire ? "Vista solida" : "Wireframe";
    wireButton.setAttribute("aria-pressed", String(wire));
  };
  document.querySelector("#reset").onclick = () => {
    rx = -0.1;
    ry = -0.3;
    zoom = 1;
    wire = false;
    chrome.wireframe = orange.wireframe = false;
    wireButton.textContent = "Wireframe";
    wireButton.setAttribute("aria-pressed", "false");
    resize();
  };
  canvas.onpointerdown = (e) => {
    drag = true;
    lx = e.clientX;
    ly = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    if (!drag) return;
    ry += (e.clientX - lx) * 0.008;
    rx = THREE.MathUtils.clamp(rx + (e.clientY - ly) * 0.006, -0.65, 0.65);
    lx = e.clientX;
    ly = e.clientY;
  };
  canvas.onpointerup =
    canvas.onpointercancel =
    canvas.onlostpointercapture =
      () => (drag = false);
  canvas.onkeydown = (e) => {
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "=",
        "-",
      ].includes(e.key)
    )
      return;
    e.preventDefault();
    if (e.key === "ArrowLeft") ry -= 0.15;
    if (e.key === "ArrowRight") ry += 0.15;
    if (e.key === "ArrowUp") rx = Math.max(-0.65, rx - 0.12);
    if (e.key === "ArrowDown") rx = Math.min(0.65, rx + 0.12);
    if (e.key === "+" || e.key === "=") zoom = Math.min(1.25, zoom + 0.1);
    if (e.key === "-") zoom = Math.max(0.8, zoom - 0.1);
    resize();
  };
  let time = 0,
    previous = performance.now(),
    visible = true;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
  }).observe(canvas);
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - previous) / 1000, 0.04);
    previous = now;
    if (document.hidden || !visible) return;
    if (!paused && !drag) time += dt;
    group.rotation.set(
      rx + Math.sin(time * 0.45) * 0.035,
      ry + Math.sin(time * 0.3) * 0.2,
      Math.sin(time * 0.3) * 0.03,
    );
    group.position.y = Math.sin(time * 0.8) * 0.085;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    fallback();
  });
} catch (e) {
  fallback();
  console.error("3D non disponibile", e);
}
