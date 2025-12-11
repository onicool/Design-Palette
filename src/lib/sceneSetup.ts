// lib/sceneSetup.ts
import * as THREE from 'three';

export interface SceneComponents {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

/**
 * Three.jsシーンを初期化
 */
export function initScene(
  canvas: HTMLCanvasElement,
  backgroundColor: string
): SceneComponents {
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

/**
 * シーンにライティングを追加
 */
export function setupLighting(scene: THREE.Scene): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 3, 5);
  scene.add(ambientLight, directionalLight);
}

/**
 * WebGLサポートをチェック
 */
export function isWebGLSupported(): boolean {
  const canvas = document.createElement('canvas');
  const context =
    canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  return !!context;
}// lib/sceneSetup.js

/**
 * Three.jsシーンを初期化
 */
export function initScene(THREE, canvas, backgroundColor) {
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

/**
 * シーンにライティングを追加
 */
export function setupLighting(THREE, scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 3, 5);
  scene.add(ambientLight, directionalLight);
}

/**
 * WebGLサポートをチェック
 */
export function isWebGLSupported() {
  const canvas = document.createElement('canvas');
  const context =
    canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  return !!context;
}