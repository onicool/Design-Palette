// components/ParticleEarth.ts
import * as THREE from 'three';
import { initScene, setupLighting, isWebGLSupported } from '../lib/sceneSetup';
import {
  generateSpherePoints,
  createParticleSystem,
  createGlowLayer,
  getOptimalParticleCount,
} from '../lib/earthParticles';
import { AnimationController, PulseEffect } from '../lib/animationController';
import { ResizeHandler } from '../lib/resizeHandler';
import { MouseTracker, CameraController, HoverEffect } from '../lib/mouseController';
import { defaultConfig, ParticleEarthConfig } from '../lib/config';

/**
 * パーティクル地球の全体を管理するメインクラス
 */
export class ParticleEarth {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private earth!: THREE.Points;
  private glow!: THREE.Points;
  private animationController!: AnimationController;
  private resizeHandler!: ResizeHandler;
  private mouseTracker!: MouseTracker;
  private cameraController!: CameraController;
  private hoverEffect!: HoverEffect;
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.PointsMaterial[] = [];
  private config: ParticleEarthConfig;

  constructor(
    private canvas: HTMLCanvasElement,
    config?: Partial<ParticleEarthConfig>
  ) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * 初期化して描画開始
   */
  init(): boolean {
    if (!isWebGLSupported()) {
      document.body.classList.add('no-webgl');
      return false;
    }

    // シーン初期化
    const { scene, camera, renderer } = initScene(
      this.canvas,
      this.config.backgroundColor
    );
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    // ライティング設定
    setupLighting(this.scene);

    // パーティクル生成
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

    // グローレイヤー追加
    const { glow, glowGeometry, glowMaterial } = createGlowLayer(geometry, material);
    this.glow = glow;
    this.geometries.push(glowGeometry);
    this.materials.push(glowMaterial);

    this.scene.add(this.earth);
    this.scene.add(this.glow);

    // Phase 2: マウスコントローラー初期化
    this.mouseTracker = new MouseTracker();
    this.mouseTracker.init(document.body);

    this.cameraController = new CameraController();
    this.hoverEffect = new HoverEffect(this.config.particleSize);

    // アニメーション開始（Phase 2対応版）
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

    // リサイズハンドラー設定
    this.resizeHandler = new ResizeHandler(this.camera, this.renderer);
    this.resizeHandler.init();

    return true;
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this.animationController?.dispose();
    this.resizeHandler?.dispose();

    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.renderer?.dispose();
  }
}

/**
 * Phase 2: マウスインタラクション対応のアニメーションコントローラー
 */
class AnimationControllerWithMouse extends AnimationController {
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    earth: THREE.Points,
    pulseEffect: PulseEffect,
    private baseRotationSpeed: number,
    private mouseTracker: MouseTracker,
    private cameraController: CameraController,
    private hoverEffect: HoverEffect,
    private material: THREE.PointsMaterial
  ) {
    super(renderer, scene, camera, earth, pulseEffect, baseRotationSpeed);
  }

  start(): void {
    if ((this as any).animationId !== null) return;

    const animate = () => {
      (this as any).animationId = requestAnimationFrame(animate);

      const mouseState = this.mouseTracker.getState();

      // Phase 2: マウス位置に応じてカメラ（地球の回転）を更新
      this.cameraController.update(mouseState, (this as any).earth);

      // Phase 2: ホバーエフェクト
      this.hoverEffect.update(mouseState.isHovering, this.material);

      // Phase 2: マウスインタラクションに応じた回転速度調整
      const speedModifier = this.cameraController.getRotationSpeedModifier(mouseState);
      (this as any).earth.rotation.y += this.baseRotationSpeed * speedModifier;

      // パルスエフェクト
      (this as any).pulseEffect.update((this as any).earth);

      (this as any).renderer.render((this as any).scene, (this as any).camera);
    };

    animate();
    document.addEventListener('visibilitychange', (this as any).handleVisibility);
  }
}