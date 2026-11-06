import { gsap } from 'gsap';

const host = document.querySelector<HTMLElement>('[data-physics-scene]');
if (host) {
  host.dataset.sceneState = 'observing';
  const observer = new IntersectionObserver(async entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    try {
      host.dataset.sceneState = 'loading';
      const THREE = await import('three');
      startScene(THREE, host);
    } catch (error) {
      host.dataset.sceneState = 'fallback';
      console.warn('The motion studio could not start WebGL.', error);
      // The static illustration remains available when WebGL cannot start.
    }
  }, { rootMargin: '100px' });
  observer.observe(host);
}

function startScene(THREE: typeof import('three'), host: HTMLElement) {
  const canvas = host.querySelector<HTMLCanvasElement>('canvas')!;
  const stage = host.querySelector<HTMLElement>('.scene-stage')!;
  const pauseButton = host.querySelector<HTMLButtonElement>('.scene-pause')!;
  const buttons = [...host.querySelectorAll<HTMLButtonElement>('[data-scene]')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 40);
  camera.position.set(0, 1.4, 7.7);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x00a0e3, 3);
  rim.position.set(-4, 1, -2);
  scene.add(rim);
  const world = new THREE.Group();
  scene.add(world);
  const blue = new THREE.MeshPhysicalMaterial({ color: 0x00a0e3, metalness: .3, roughness: .16, clearcoat: 1 });
  const navy = new THREE.MeshPhysicalMaterial({ color: 0x2d5990, metalness: .35, roughness: .2, clearcoat: 1 });
  const amber = new THREE.MeshPhysicalMaterial({ color: 0xf4a100, metalness: .3, roughness: .18, clearcoat: 1 });
  const silver = new THREE.MeshStandardMaterial({ color: 0x8ca4c2, metalness: .6, roughness: .3 });
  const ball = (radius: number, material = blue) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 24), material);
    mesh.castShadow = true;
    return mesh;
  };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: .1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.65;
  floor.receiveShadow = true;
  scene.add(floor);

  const orbit = new THREE.Group();
  orbit.add(ball(.7));
  const paths = [new THREE.Group(), new THREE.Group()];
  const satellites = [ball(.2, amber), ball(.13, navy)];
  paths.forEach((path, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55 + index * .38, .018, 12, 120), silver);
    path.add(ring, satellites[index]);
    path.rotation.set(.55 + index * .8, index * .6, index * .3);
    orbit.add(path);
  });
  world.add(orbit);

  const wave = new THREE.Group();
  const beads = Array.from({ length: 25 }, (_, index) => {
    const bead = ball(index === 12 ? .16 : .09, index === 12 ? amber : blue);
    bead.position.x = -2.2 + index * 4.4 / 24;
    wave.add(bead);
    return bead;
  });
  const waveGeometry = new THREE.BufferGeometry();
  waveGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(75), 3));
  wave.add(new THREE.Line(waveGeometry, new THREE.LineBasicMaterial({ color: 0x2d5990 })));
  wave.visible = false;
  world.add(wave);

  const pendulum = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 2.6, 16), silver);
  beam.rotation.z = Math.PI / 2;
  beam.position.y = 1.45;
  pendulum.add(beam);
  [-1.2, 1.2].forEach(x => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, 3.05, 12), silver);
    leg.position.set(x, -.1, 0);
    pendulum.add(leg);
  });
  const swing = new THREE.Group();
  swing.position.y = 1.45;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 2.25, 12), silver);
  rod.position.y = -1.125;
  const bob = ball(.38, blue);
  bob.position.y = -2.25;
  swing.add(rod, bob);
  pendulum.add(swing);
  pendulum.visible = false;
  world.add(pendulum);
  const groups = { orbit, wave, pendulum };
  let mode: keyof typeof groups = 'orbit';
  let elapsed = 0;
  let lastTime = 0;
  let paused = reducedMotion.matches;
  let visible = true;
  let disposed = false;
  const render = () => renderer.render(scene, camera);
  function update() {
    satellites.forEach((satellite, index) => {
      const angle = elapsed * (.75 - index * .3) + index * 2;
      const radius = 1.55 + index * .38;
      satellite.position.set(radius * Math.cos(angle), radius * Math.sin(angle), 0);
    });
    beads.forEach((bead, index) => {
      bead.position.y = .65 * Math.sin(bead.position.x * 2 - elapsed * 2);
      waveGeometry.attributes.position.setXYZ(index, bead.position.x, bead.position.y, 0);
    });
    waveGeometry.attributes.position.needsUpdate = true;
    swing.rotation.z = .6 * Math.cos(elapsed * 1.6);
  }
  function schedule() {
    if (disposed) return;
    const animate = !paused && visible && !document.hidden;
    lastTime = 0;
    renderer.setAnimationLoop(animate ? (time: number) => {
      if (lastTime) elapsed += Math.min((time - lastTime) / 1000, .05);
      lastTime = time;
      update();
      render();
    } : null);
    pauseButton.textContent = paused ? '▶' : 'Ⅱ';
    pauseButton.setAttribute('aria-label', paused ? 'Play 3D animation' : 'Pause 3D animation');
    pauseButton.setAttribute('aria-pressed', String(paused));
    render();
  }
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    schedule();
  });
  visibilityObserver.observe(stage);
  pauseButton.addEventListener('click', () => { paused = !paused; schedule(); }, { signal: events.signal });
  buttons.forEach(button => button.addEventListener('click', () => {
    mode = button.dataset.scene as keyof typeof groups;
    Object.entries(groups).forEach(([name, group]) => { group.visible = name === mode; });
    buttons.forEach(item => {
      item.classList.toggle('active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    stage.setAttribute('aria-label', '3D ' + mode + ' illustration');
    if (!reducedMotion.matches) {
      gsap.fromTo(groups[mode].scale, { x: .75, y: .75, z: .75 }, { x: 1, y: 1, z: 1, duration: .7, ease: 'back.out(1.4)', overwrite: true, onUpdate: render });
    }
    update(); render();
  }, { signal: events.signal }));
  if (matchMedia('(hover: hover)').matches) {
    stage.addEventListener('pointermove', event => {
      if (reducedMotion.matches) return;
      const bounds = stage.getBoundingClientRect();
      gsap.to(world.rotation, { x: (event.clientY - bounds.top) / bounds.height * .25 - .125, y: (event.clientX - bounds.left) / bounds.width * .6 - .3, duration: .8, overwrite: true, onUpdate: render });
    }, { signal: events.signal });
    stage.addEventListener('pointerleave', () => {
      gsap.to(world.rotation, { x: 0, y: 0, duration: 1, overwrite: true, onUpdate: render });
    }, { signal: events.signal });
  }
  document.addEventListener('visibilitychange', schedule, { signal: events.signal });
  reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; schedule(); }, { signal: events.signal });
  update(); resize(); schedule();
  host.dataset.ready = 'true';
  host.dataset.sceneState = 'ready';
  window.addEventListener('pageshow', event => { if (event.persisted) schedule(); }, { signal: events.signal });
  window.addEventListener('pagehide', event => {
    if (event.persisted) { renderer.setAnimationLoop(null); return; }
    disposed = true;
    events.abort();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    renderer.setAnimationLoop(null);
    gsap.killTweensOf(world.rotation);
    Object.values(groups).forEach(group => gsap.killTweensOf(group.scale));
    const geometries = new Set<import('three').BufferGeometry>();
    const materials = new Set<import('three').Material>();
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
      geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach(material => materials.add(material));
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    renderer.dispose();
  });
}
