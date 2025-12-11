import * as THREE from 'three';

/**
 * パルスエフェクトを管理
 */
export class PulseEffect {
  private time = 0;
  private pulseSpeed = 0.002;
  private pulseAmplitude = 0.05;

  update(target: THREE.Points): void {
    this.time += this.pulseSpeed;
    const scale = 1 + Math.sin(this.time) * this.pulseAmplitude;
    target.scale.set(scale, scale, scale);
  }
}

/**
 * アニメーションループを管理
 */
export class AnimationController {
  private animationId: number | null = null;
  private handleVisibility: () => void;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private earth: THREE.Points,
    private pulseEffect: PulseEffect,
    private rotationSpeed: number = 0.001
  ) {
    this.handleVisibility = this.onVisibilityChange.bind(this);
  }

  /**
   * アニメーションを開始
   */
  start(): void {
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

  /**
   * タブが非表示になったらアニメーションを停止
   */
  private onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    } else if (this.animationId === null) {
      this.start();
    }
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }
}