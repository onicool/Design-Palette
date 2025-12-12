// main.ts
import { ParticleEarth } from './src/components/ParticleEarth';

/**
 * アプリケーションのエントリーポイント
 */
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

  // クリーンアップ処理
  window.addEventListener('beforeunload', () => {
    particleEarth.dispose();
  });
}

main();
