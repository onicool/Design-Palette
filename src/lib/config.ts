// lib/config.ts
export interface ParticleEarthConfig {
  rotationSpeed: number;
  particleSize: number;
  earthRadius: number;
  backgroundColor: string;
  particleColor: string;
}

/**
 * デフォルト設定
 */
export const defaultConfig: ParticleEarthConfig = {
  rotationSpeed: 0.001,
  particleSize: 0.05,
  earthRadius: 5,
  backgroundColor: '#000814',
  particleColor: '#00d4ff',
};