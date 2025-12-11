// lib/resizeHandler.ts
import * as THREE from 'three';

/**
 * ウィンドウリサイズを管理
 */
export class ResizeHandler {
  private resizeTimeout: number | null = null;
  private boundHandleResize: () => void;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private renderer: THREE.WebGLRenderer
  ) {
    this.boundHandleResize = this.handleResize.bind(this);
  }

  /**
   * リサイズハンドラーを初期化
   */
  init(): void {
    window.addEventListener('resize', this.boundHandleResize);
  }

  /**
   * リサイズ処理(デバウンス付き)
   */
  private handleResize(): void {
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

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    window.removeEventListener('resize', this.boundHandleResize);
    if (this.resizeTimeout !== null) {
      clearTimeout(this.resizeTimeout);
    }
  }
}