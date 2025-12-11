import { Hono } from 'hono';
import { html } from 'hono/html';

const app = new Hono();

app.get('/', (c) => {
  const page = html`<!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Particle Earth Background</title>
        <style>
          :root {
            color-scheme: dark;
          }

          body {
            margin: 0;
            padding: 0;
            background: radial-gradient(circle at 20% 20%, #001233, #000814 50%), #000814;
            color: #e0f2ff;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            min-height: 100vh;
            overflow: hidden;
            display: grid;
            place-items: center;
            position: relative;
          }

          main {
            position: relative;
            z-index: 1;
            text-align: center;
            padding: 2rem;
            max-width: 960px;
          }

          h1 {
            margin: 0 0 0.5rem;
            font-size: clamp(1.8rem, 3vw + 1rem, 3.25rem);
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          p {
            margin: 0;
            color: #9fb6d4;
            font-size: clamp(1rem, 2vw, 1.25rem);
            line-height: 1.6;
          }

          canvas#earth-canvas {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            display: block;
            pointer-events: none;
            z-index: 0;
          }

          .glass-card {
            background: rgba(0, 8, 20, 0.6);
            border: 1px solid rgba(0, 212, 255, 0.25);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.35);
            backdrop-filter: blur(10px);
            border-radius: 20px;
          }

          .no-webgl main::after {
            content: 'WebGLがサポートされていないため、背景エフェクトは表示されません。';
            display: block;
            margin-top: 1rem;
            color: #ff8c69;
          }
        </style>
      </head>
      <body>
        <canvas id="earth-canvas" aria-hidden="true"></canvas>
        <main class="glass-card">
          <h1>Particle Earth Background</h1>
          <p>
            フィボナッチ球面法で配置したパーティクルを Three.js でレンダリングし、
            ゆるやかに自転する地球のイメージを背景に描画します。
          </p>
        </main>
<script type="module">
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

// ========== Config ==========
const config = {
  particleCount: (() => {
    const width = window.innerWidth;
    if (width >= 1280) return 15000;
    if (width >= 768) return 10000;
    return 6000;
  })(),
  rotationSpeed: 0.001,
  particleSize: 0.05,  // サイズを小さく
  earthRadius: 9,
  backgroundColor: '#000814',
  particleColor: '#00d4ff'
};

// ========== Earth Particles ==========
const goldenRatio = (1 + Math.sqrt(5)) / 2;

function generateSpherePoints(count, radius) {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = (2 * Math.PI * i) / goldenRatio;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
}

function createParticleSystem(points, color, size) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));

  const material = new THREE.PointsMaterial({
    color: new THREE.Color(color),
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,  // 透明度を下げて粒感を出す
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particles = new THREE.Points(geometry, material);
  particles.frustumCulled = false;
  return { particles, geometry, material };
}

// ========== Scene Setup ==========
function initScene(targetCanvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.backgroundColor);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 15);

  const renderer = new THREE.WebGLRenderer({
    canvas: targetCanvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(new THREE.Color(config.backgroundColor), 1);

  return { scene, camera, renderer };
}

function setupLighting(scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 3, 5);
  scene.add(ambientLight, directionalLight);
}

function isWebGLSupported() {
  const canvasCheck = document.createElement('canvas');
  const context =
    canvasCheck.getContext('webgl') || canvasCheck.getContext('experimental-webgl');
  return !!context;
}

// ========== Animation ==========
class PulseEffect {
  constructor() {
    this.time = 0;
    this.pulseSpeed = 0.002;
    this.pulseAmplitude = 0.05;
  }

  update(target) {
    this.time += this.pulseSpeed;
    const scale = 1 + Math.sin(this.time) * this.pulseAmplitude;
    target.scale.set(scale, scale, scale);
  }
}

class AnimationController {
  constructor(renderer, scene, camera, earth, pulseEffect) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.earth = earth;
    this.pulseEffect = pulseEffect;
    this.animationId = null;
    this.handleVisibility = this.handleVisibility.bind(this);
  }

  start() {
    if (this.animationId !== null) return;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.earth.rotation.y += config.rotationSpeed;
      this.earth.rotation.x = Math.PI * 0.1;
      this.pulseEffect.update(this.earth);
      this.renderer.render(this.scene, this.camera);
    };

    animate();
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  handleVisibility() {
    if (document.visibilityState === 'hidden') {
      if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    } else if (this.animationId === null) {
      this.start();
    }
  }

  dispose() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }
}

// ========== Main ==========
function main() {
  const canvas = document.getElementById('earth-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Canvas element not found for particle earth background.');
  }

  if (!isWebGLSupported()) {
    document.body.classList.add('no-webgl');
    return;
  }

  const { scene, camera, renderer } = initScene(canvas);
  setupLighting(scene);

  const positions = generateSpherePoints(config.particleCount, config.earthRadius);
  const { particles, geometry, material } = createParticleSystem(
    positions,
    config.particleColor,
    config.particleSize
  );

  const glowGeometry = geometry.clone();
  const glowMaterial = material.clone();
  glowMaterial.size = material.size * 1.5;  // グローを控えめに
  glowMaterial.opacity = 0.15;  // グローの透明度を下げる
  glowMaterial.depthWrite = false;
  const glow = new THREE.Points(glowGeometry, glowMaterial);
  glow.scale.set(1.01, 1.01, 1.01);  // スケールも控えめに

  scene.add(particles);
  scene.add(glow);

  const pulse = new PulseEffect();
  const controller = new AnimationController(renderer, scene, camera, particles, pulse);
  controller.start();

  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  window.addEventListener('resize', handleResize);

  window.addEventListener('beforeunload', () => {
    controller.dispose();
    window.removeEventListener('resize', handleResize);
    geometry.dispose();
    material.dispose();
    glowGeometry.dispose();
    glowMaterial.dispose();
    renderer.dispose();
  });
}

main();
        </script>

      </body>
    </html>`;

  return c.html(page);
});

export default app;


