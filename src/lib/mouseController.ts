// lib/mouseController.ts
import * as THREE from 'three';

export interface MouseState {
  x: number;
  y: number;
  normalizedX: number;  // -1 to 1
  normalizedY: number;  // -1 to 1
  isMoving: boolean;
  isHovering: boolean;
}

/**
 * マウスの動きを追跡
 */
export class MouseTracker {
  private state: MouseState = {
    x: 0,
    y: 0,
    normalizedX: 0,
    normalizedY: 0,
    isMoving: false,
    isHovering: false,
  };

  private movementTimeout: number | null = null;

  init(element: HTMLElement): void {
    element.addEventListener('mousemove', (e) => {
      this.state.x = e.clientX;
      this.state.y = e.clientY;
      this.state.normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
      this.state.normalizedY = -(e.clientY / window.innerHeight) * 2 + 1;
      this.state.isMoving = true;

      // 移動停止検知
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

  getState(): MouseState {
    return this.state;
  }
}

/**
 * マウス位置に応じてカメラ（地球の回転）を制御
 */
export class CameraController {
  private targetRotation = { x: 0, y: 0 };
  private currentRotation = { x: 0, y: 0 };
  private smoothness = 0.05;  // 0-1の範囲、小さいほど滑らか

  update(mouseState: MouseState, earth: THREE.Points): void {
    if (!mouseState.isHovering) {
      // ホバーしていない時は元の位置に戻る
      this.targetRotation.x = 0;
      this.targetRotation.y = 0;
    } else {
      // マウス位置に基づく目標回転値を計算
      this.targetRotation.x = mouseState.normalizedY * 0.3;
      this.targetRotation.y = mouseState.normalizedX * 0.3;
    }

    // スムーズに補間
    this.currentRotation.x +=
      (this.targetRotation.x - this.currentRotation.x) * this.smoothness;
    this.currentRotation.y +=
      (this.targetRotation.y - this.currentRotation.y) * this.smoothness;

    // 地球に回転を適用(基本回転に追加)
    earth.rotation.x = Math.PI * 0.1 + this.currentRotation.x;
    // Y軸は自動回転があるので追加の回転は適用しない（代わりに回転速度を変更）
  }

  /**
   * マウスインタラクションに応じた回転速度の調整値を取得
   */
  getRotationSpeedModifier(mouseState: MouseState): number {
    if (mouseState.isHovering && mouseState.isMoving) {
      return 1.0 + Math.abs(this.currentRotation.y) * 2;
    }
    return 1.0;
  }
}

/**
 * ホバー時のエフェクト
 */
export class HoverEffect {
  private baseSize: number;
  private hoverSize: number;
  private currentSize: number;

  constructor(baseSize: number) {
    this.baseSize = baseSize;
    this.hoverSize = baseSize * 1.3;
    this.currentSize = baseSize;
  }

  update(isHovering: boolean, material: THREE.PointsMaterial): void {
    const targetSize = isHovering ? this.hoverSize : this.baseSize;
    this.currentSize += (targetSize - this.currentSize) * 0.1;
    material.size = this.currentSize;
  }
}