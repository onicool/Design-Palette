// lib/earthParticles.ts
import * as THREE from 'three';

export const goldenRatio = (1 + Math.sqrt(5)) / 2;

/**
 * フィボナッチ球面法でパーティクルの位置を生成
 */
export function generateSpherePoints(count: number, radius: number): Float32Array {
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

/**
 * パーティクルシステムを作成
 */
export function createParticleSystem(
  points: Float32Array,
  color: string,
  size: number
): { particles: THREE.Points; geometry: THREE.BufferGeometry; material: THREE.PointsMaterial } {
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

/**
 * グローエフェクト用のパーティクルシステムを作成
 */
export function createGlowLayer(
  baseGeometry: THREE.BufferGeometry,
  baseMaterial: THREE.PointsMaterial
): { glow: THREE.Points; glowGeometry: THREE.BufferGeometry; glowMaterial: THREE.PointsMaterial } {
  const glowGeometry = baseGeometry.clone();
  const glowMaterial = baseMaterial.clone();
  glowMaterial.size = baseMaterial.size * 1.5;
  glowMaterial.opacity = 0.15;
  glowMaterial.depthWrite = false;

  const glow = new THREE.Points(glowGeometry, glowMaterial);
  glow.scale.set(1.01, 1.01, 1.01);

  return { glow, glowGeometry, glowMaterial };
}

/**
 * デバイスに応じた最適なパーティクル数を取得
 */
export function getOptimalParticleCount(): number {
  const width = window.innerWidth;
  
  if (width >= 1280) return 15000;
  if (width >= 768) return 10000;
  return 6000;
}// lib/earthParticles.js
export const goldenRatio = (1 + Math.sqrt(5)) / 2;

/**
 * フィボナッチ球面法でパーティクルの位置を生成
 */
export function generateSpherePoints(count, radius) {
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

/**
 * パーティクルシステムを作成
 */
export function createParticleSystem(THREE, points, color, size) {
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

/**
 * グローエフェクト用のパーティクルシステムを作成
 */
export function createGlowLayer(THREE, baseGeometry, baseMaterial) {
  const glowGeometry = baseGeometry.clone();
  const glowMaterial = baseMaterial.clone();
  glowMaterial.size = baseMaterial.size * 1.5;
  glowMaterial.opacity = 0.15;
  glowMaterial.depthWrite = false;

  const glow = new THREE.Points(glowGeometry, glowMaterial);
  glow.scale.set(1.01, 1.01, 1.01);

  return { glow, glowGeometry, glowMaterial };
}

/**
 * デバイスに応じた最適なパーティクル数を取得
 */
export function getOptimalParticleCount() {
  const width = window.innerWidth;
  
  if (width >= 1280) return 15000;
  if (width >= 768) return 10000;
  return 6000;
}