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
          import * as THREE from 'https://unpkg.com/three@0.182.0/build/three.module.js';

          const config = {
            rotationSpeed: 0.001,
            particleSize: 0.05,
            earthRadius: 5,
            backgroundColor: '#000814',
            particleColor: '#00d4ff',
          };

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
              opacity: 0.6,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            });

            const particles = new THREE.Points(geometry, material);
            particles.frustumCulled = false;

            return { particles, geometry, material };
          }

          function createGlowLayer(baseGeometry, baseMaterial) {
            const glowGeometry = baseGeometry.clone();
            const glowMaterial = baseMaterial.clone();
            glowMaterial.size = baseMaterial.size * 1.5;
            glowMaterial.opacity = 0.15;
            glowMaterial.depthWrite = false;

            const glow = new THREE.Points(glowGeometry, glowMaterial);
            glow.scale.set(1.01, 1.01, 1.01);

            return { glow, glowGeometry, glowMaterial };
          }

          function getOptimalParticleCount() {
            const width = window.innerWidth;

            if (width >= 1280) return 15000;
            if (width >= 768) return 10000;
            return 6000;
          }

          function initScene(canvas, backgroundColor) {
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(backgroundColor);

            const camera = new THREE.PerspectiveCamera(
              60,
              window.innerWidth / window.innerHeight,
              0.1,
              1000
            );
            camera.position.set(0, 0, 15);

            const renderer = new THREE.WebGLRenderer({
              canvas,
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(new THREE.Color(backgroundColor), 1);

            return { scene, camera, renderer };
          }

          function setupLighting(scene) {
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 3, 5);
            scene.add(ambientLight, directionalLight);
          }

          function isWebGLSupported() {
            const canvas = document.createElement('canvas');
            const context =
              canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!context;
          }

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
            constructor(renderer, scene, camera, earth, pulseEffect, rotationSpeed = 0.001) {
              this.renderer = renderer;
              this.scene = scene;
              this.camera = camera;
              this.earth = earth;
              this.pulseEffect = pulseEffect;
              this.rotationSpeed = rotationSpeed;
              this.animationId = null;
              this.handleVisibility = this.onVisibilityChange.bind(this);
            }

            start() {
              if (this.animationId !== null) return;

              const animate = () => {
                this.animationId = requestAnimationFrame(animate);
                this.earth.rotation.y += this.rotationSpeed;
                this.earth.rotation.x = Math.PI * 0.1;
                this.pulseEffect.update(this.earth);
                this.renderer.render(this.scene, this.camera);
              };

              animate();
              document.addEventListener('visibilitychange', this.handleVisibility);
            }

            onVisibilityChange() {
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

          class MouseTracker {
            constructor() {
              this.state = {
                x: 0,
                y: 0,
                normalizedX: 0,
                normalizedY: 0,
                isMoving: false,
                isHovering: false,
              };
              this.movementTimeout = null;
            }

            init(element) {
              element.addEventListener('mousemove', (e) => {
                this.state.x = e.clientX;
                this.state.y = e.clientY;
                this.state.normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
                this.state.normalizedY = -(e.clientY / window.innerHeight) * 2 + 1;
                this.state.isMoving = true;

                if (this.movementTimeout) clearTimeout(this.movementTimeout);
                this.movementTimeout = window.setTimeout(() => {
                  this.state.isMoving = false;
                }, 150);
              });

              element.addEventListener('mouseenter', () => {
                this.state.isHovering = true;
              });

              element.addEventListener('mouseleave', () => {
                this.state.isHovering = false;
              });
            }

            getState() {
              return this.state;
            }
          }

          class CameraController {
            constructor() {
              this.targetRotation = { x: 0, y: 0 };
              this.currentRotation = { x: 0, y: 0 };
              this.smoothness = 0.05;
            }

            update(mouseState, earth) {
              if (!mouseState.isHovering) {
                this.targetRotation.x = 0;
                this.targetRotation.y = 0;
              } else {
                this.targetRotation.x = mouseState.normalizedY * 0.3;
                this.targetRotation.y = mouseState.normalizedX * 0.3;
              }

              this.currentRotation.x +=
                (this.targetRotation.x - this.currentRotation.x) * this.smoothness;
              this.currentRotation.y +=
                (this.targetRotation.y - this.currentRotation.y) * this.smoothness;

              earth.rotation.x = Math.PI * 0.1 + this.currentRotation.x;
            }

            getRotationSpeedModifier(mouseState) {
              if (mouseState.isHovering && mouseState.isMoving) {
                return 1.0 + Math.abs(this.currentRotation.y) * 2;
              }
              return 1.0;
            }
          }

          class HoverEffect {
            constructor(baseSize) {
              this.baseSize = baseSize;
              this.hoverSize = baseSize * 1.3;
              this.currentSize = baseSize;
            }

            update(isHovering, material) {
              const targetSize = isHovering ? this.hoverSize : this.baseSize;
              this.currentSize += (targetSize - this.currentSize) * 0.1;
              material.size = this.currentSize;
            }
          }

          class ResizeHandler {
            constructor(camera, renderer) {
              this.camera = camera;
              this.renderer = renderer;
              this.resizeTimeout = null;
              this.boundHandleResize = this.handleResize.bind(this);
            }

            init() {
              window.addEventListener('resize', this.boundHandleResize);
            }

            handleResize() {
              if (this.resizeTimeout !== null) {
                clearTimeout(this.resizeTimeout);
              }

              this.resizeTimeout = window.setTimeout(() => {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
              }, 100);
            }

            dispose() {
              window.removeEventListener('resize', this.boundHandleResize);
              if (this.resizeTimeout !== null) {
                clearTimeout(this.resizeTimeout);
              }
            }
          }

          class AnimationControllerWithMouse extends AnimationController {
            constructor(
              renderer,
              scene,
              camera,
              earth,
              pulseEffect,
              baseRotationSpeed,
              mouseTracker,
              cameraController,
              hoverEffect,
              material
            ) {
              super(renderer, scene, camera, earth, pulseEffect, baseRotationSpeed);
              this.baseRotationSpeed = baseRotationSpeed;
              this.mouseTracker = mouseTracker;
              this.cameraController = cameraController;
              this.hoverEffect = hoverEffect;
              this.material = material;
            }

            start() {
              if (this.animationId !== null) return;

              const animate = () => {
                this.animationId = requestAnimationFrame(animate);

                const mouseState = this.mouseTracker.getState();

                this.cameraController.update(mouseState, this.earth);
                this.hoverEffect.update(mouseState.isHovering, this.material);
                const speedModifier = this.cameraController.getRotationSpeedModifier(mouseState);
                this.earth.rotation.y += this.baseRotationSpeed * speedModifier;
                this.pulseEffect.update(this.earth);

                this.renderer.render(this.scene, this.camera);
              };

              animate();
              document.addEventListener('visibilitychange', this.handleVisibility);
            }
          }

          class ParticleEarth {
            constructor(canvas, customConfig) {
              this.canvas = canvas;
              this.config = { ...config, ...customConfig };
              this.geometries = [];
              this.materials = [];
            }

            init() {
              if (!isWebGLSupported()) {
                document.body.classList.add('no-webgl');
                return false;
              }

              const { scene, camera, renderer } = initScene(
                this.canvas,
                this.config.backgroundColor
              );
              this.scene = scene;
              this.camera = camera;
              this.renderer = renderer;

              setupLighting(this.scene);

              const particleCount = getOptimalParticleCount();
              const positions = generateSpherePoints(particleCount, this.config.earthRadius);
              const { particles, geometry, material } = createParticleSystem(
                positions,
                this.config.particleColor,
                this.config.particleSize
              );
              this.earth = particles;
              this.geometries.push(geometry);
              this.materials.push(material);

              const { glow, glowGeometry, glowMaterial } = createGlowLayer(geometry, material);
              this.glow = glow;
              this.geometries.push(glowGeometry);
              this.materials.push(glowMaterial);

              this.scene.add(this.earth);
              this.scene.add(this.glow);

              this.mouseTracker = new MouseTracker();
              this.mouseTracker.init(document.body);

              this.cameraController = new CameraController();
              this.hoverEffect = new HoverEffect(this.config.particleSize);

              const pulse = new PulseEffect();
              this.animationController = new AnimationControllerWithMouse(
                this.renderer,
                this.scene,
                this.camera,
                this.earth,
                pulse,
                this.config.rotationSpeed,
                this.mouseTracker,
                this.cameraController,
                this.hoverEffect,
                material
              );
              this.animationController.start();

              this.resizeHandler = new ResizeHandler(this.camera, this.renderer);
              this.resizeHandler.init();

              return true;
            }

            dispose() {
              this.animationController?.dispose();
              this.resizeHandler?.dispose();
              this.geometries.forEach((g) => g.dispose());
              this.materials.forEach((m) => m.dispose());
              this.renderer?.dispose();
            }
          }

          function main() {
            const canvas = document.getElementById('earth-canvas');
            if (!(canvas instanceof HTMLCanvasElement)) {
              throw new Error('Canvas element not found for particle earth background.');
            }

            const particleEarth = new ParticleEarth(canvas);
            const initialized = particleEarth.init();

            if (!initialized) {
              console.error('Failed to initialize ParticleEarth: WebGL not supported');
              return;
            }

            window.addEventListener('beforeunload', () => {
              particleEarth.dispose();
            });
          }

          main();
        </script>
      </body>
    </html>`;

  return c.html(page);
});

export default app;


