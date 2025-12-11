# パーティクル地球 実装詳細仕様書

## Phase 1: MVP実装

### 1.1 パーティクル生成アルゴリズム

#### フィボナッチ球面法の実装

**数学的根拠**:
```
φ = (1 + √5) / 2  // 黄金比
θ_i = 2π * i / φ  // 方位角
φ_i = arccos(1 - 2(i + 0.5) / N)  // 仰角
x = r * sin(φ_i) * cos(θ_i)
y = r * sin(φ_i) * sin(θ_i)
z = r * cos(φ_i)
```

**実装仕様**:
```typescript
function generateSpherePoints(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  
  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  
  return positions;
}
```

**パラメータ設定**:
- デスクトップ: 8000-10000パーティクル
- タブレット: 5000パーティクル
- モバイル: 2000-3000パーティクル
- 地球半径: 5単位

### 1.2 Three.jsシーン初期化

#### カメラ設定
```typescript
interface CameraConfig {
  fov: 60,              // 視野角
  aspect: window.innerWidth / window.innerHeight,
  near: 0.1,            // 近クリップ面
  far: 1000,            // 遠クリップ面
  position: {
    x: 0,
    y: 0,
    z: 15              // 地球から15単位離れた位置
  }
}
```

#### レンダラー設定
```typescript
interface RendererConfig {
  antialias: true,      // アンチエイリアス有効
  alpha: true,          // 透明背景
  powerPreference: 'high-performance',
  pixelRatio: Math.min(window.devicePixelRatio, 2)  // 最大2倍まで
}
```

#### マテリアル設定
```typescript
interface ParticleMaterialConfig {
  color: 0x00d4ff,      // シアン系
  size: 2.0,            // パーティクルサイズ
  sizeAttenuation: true, // 距離による減衰
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,  // 加算合成
  depthWrite: false     // 深度バッファ無効(透明度のため)
}
```

### 1.3 アニメーションループ

#### 実装構造
```typescript
class AnimationController {
  private animationId: number | null = null;
  private rotationSpeed: number = 0.001;
  private earth: THREE.Points;
  
  start(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      // Y軸回転
      this.earth.rotation.y += this.rotationSpeed;
      
      // わずかなX軸傾斜回転(地球の自転軸を再現)
      this.earth.rotation.x = Math.PI * 0.1;
      
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }
  
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
```

#### FPS最適化
```typescript
interface FPSController {
  targetFPS: 60,
  frameInterval: 1000 / 60,
  lastFrameTime: 0,
  
  shouldRender(currentTime: number): boolean {
    const delta = currentTime - this.lastFrameTime;
    if (delta > this.frameInterval) {
      this.lastFrameTime = currentTime - (delta % this.frameInterval);
      return true;
    }
    return false;
  }
}
```

### 1.4 レスポンシブ対応

#### リサイズハンドラー
```typescript
function handleResize() {
  // カメラのアスペクト比更新
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  
  // レンダラーサイズ更新
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// デバウンス処理付き
let resizeTimeout: number;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handleResize, 100);
});
```

#### デバイス別パーティクル数調整
```typescript
function getOptimalParticleCount(): number {
  const width = window.innerWidth;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  if (isMobile) return 2500;
  if (width < 768) return 3000;
  if (width < 1440) return 6000;
  return 10000;
}
```

### 1.5 メモリ管理

#### クリーンアップ処理
```typescript
function dispose() {
  // ジオメトリの破棄
  earth.geometry.dispose();
  
  // マテリアルの破棄
  if (Array.isArray(earth.material)) {
    earth.material.forEach(mat => mat.dispose());
  } else {
    earth.material.dispose();
  }
  
  // レンダラーの破棄
  renderer.dispose();
  
  // イベントリスナーの削除
  window.removeEventListener('resize', handleResize);
}
```

---

## Phase 2: インタラクション拡張

### 2.1 マウスインタラクション

#### マウストラッキング実装
```typescript
interface MouseState {
  x: number;
  y: number;
  normalizedX: number;  // -1 to 1
  normalizedY: number;  // -1 to 1
  isMoving: boolean;
}

class MouseTracker {
  private state: MouseState = {
    x: 0, y: 0,
    normalizedX: 0, normalizedY: 0,
    isMoving: false
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
      this.movementTimeout = setTimeout(() => {
        this.state.isMoving = false;
      }, 150);
    });
  }
  
  getState(): MouseState {
    return this.state;
  }
}
```

#### カメラ追従実装
```typescript
class CameraController {
  private targetRotation = { x: 0, y: 0 };
  private currentRotation = { x: 0, y: 0 };
  private smoothness = 0.05;  // 0-1の範囲、小さいほど滑らか
  
  update(mouseState: MouseState, earth: THREE.Points): void {
    // マウス位置に基づく目標回転値を計算
    this.targetRotation.x = mouseState.normalizedY * 0.2;
    this.targetRotation.y = mouseState.normalizedX * 0.3;
    
    // スムーズに補間
    this.currentRotation.x += 
      (this.targetRotation.x - this.currentRotation.x) * this.smoothness;
    this.currentRotation.y += 
      (this.targetRotation.y - this.currentRotation.y) * this.smoothness;
    
    // 地球に回転を適用(基本回転に追加)
    earth.rotation.x = Math.PI * 0.1 + this.currentRotation.x;
    earth.rotation.y += 0.001 + this.currentRotation.y * 0.001;
  }
}
```

### 2.2 ホバーエフェクト

#### パーティクルサイズ変化
```typescript
class HoverEffect {
  private baseSize: number = 2.0;
  private hoverSize: number = 2.5;
  private currentSize: number = 2.0;
  
  update(isHovering: boolean, material: THREE.PointsMaterial): void {
    const targetSize = isHovering ? this.hoverSize : this.baseSize;
    this.currentSize += (targetSize - this.currentSize) * 0.1;
    material.size = this.currentSize;
  }
}
```

#### 回転速度変化
```typescript
interface RotationSpeedConfig {
  base: 0.001,
  hover: 0.003,
  transition: 0.05  // 補間速度
}

function updateRotationSpeed(
  isHovering: boolean, 
  currentSpeed: number,
  config: RotationSpeedConfig
): number {
  const target = isHovering ? config.hover : config.base;
  return currentSpeed + (target - currentSpeed) * config.transition;
}
```

### 2.3 スクロールインタラクション

#### ズームコントロール
```typescript
class ScrollZoomController {
  private minZoom = 10;
  private maxZoom = 25;
  private currentZoom = 15;
  private zoomSpeed = 0.5;
  
  init(camera: THREE.PerspectiveCamera): void {
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const delta = e.deltaY * 0.001 * this.zoomSpeed;
      this.currentZoom = Math.max(
        this.minZoom,
        Math.min(this.maxZoom, this.currentZoom + delta)
      );
      
      camera.position.z = this.currentZoom;
    }, { passive: false });
  }
}
```

### 2.4 カラーバリエーション

#### グラデーション実装
```typescript
interface ColorScheme {
  name: string;
  colors: number[];  // RGB値の配列
  weights: number[]; // 各色の分布比率
}

const colorSchemes: Record<string, ColorScheme> = {
  ocean: {
    name: 'Ocean Blue',
    colors: [0x0077be, 0x00d4ff, 0x4dd2ff],
    weights: [0.3, 0.5, 0.2]
  },
  sunset: {
    name: 'Sunset',
    colors: [0xff6b6b, 0xffa500, 0xffd700],
    weights: [0.4, 0.4, 0.2]
  },
  forest: {
    name: 'Forest',
    colors: [0x2d5016, 0x4a7c2c, 0x6ba542],
    weights: [0.3, 0.4, 0.3]
  }
};

function applyColorScheme(
  geometry: THREE.BufferGeometry,
  scheme: ColorScheme
): void {
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    // ランダムに色を選択(重み付き)
    const rand = Math.random();
    let colorIndex = 0;
    let cumulative = 0;
    
    for (let j = 0; j < scheme.weights.length; j++) {
      cumulative += scheme.weights[j];
      if (rand < cumulative) {
        colorIndex = j;
        break;
      }
    }
    
    const color = new THREE.Color(scheme.colors[colorIndex]);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
```

---

## Phase 3: 高度な機能

### 3.1 地球テクスチャマッピング

#### テクスチャベースのパーティクル配置
```typescript
interface TextureBasedParticleConfig {
  textureUrl: string;
  threshold: number;  // 0-255、この値以上の明度のピクセルにパーティクル配置
  sampleRate: number; // ピクセルのサンプリング間隔
}

async function generateTextureBasedPoints(
  config: TextureBasedParticleConfig,
  radius: number
): Promise<Float32Array> {
  // テクスチャ読み込み
  const texture = await loadTexture(config.textureUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = texture.image.width;
  canvas.height = texture.image.height;
  ctx.drawImage(texture.image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const points: number[] = [];
  
  // テクスチャをサンプリング
  for (let y = 0; y < canvas.height; y += config.sampleRate) {
    for (let x = 0; x < canvas.width; x += config.sampleRate) {
      const index = (y * canvas.width + x) * 4;
      const brightness = (
        imageData.data[index] +
        imageData.data[index + 1] +
        imageData.data[index + 2]
      ) / 3;
      
      if (brightness > config.threshold) {
        // UV座標を球面座標に変換
        const u = x / canvas.width;
        const v = y / canvas.height;
        
        const theta = u * Math.PI * 2;
        const phi = v * Math.PI;
        
        const px = radius * Math.sin(phi) * Math.cos(theta);
        const py = radius * Math.cos(phi);
        const pz = radius * Math.sin(phi) * Math.sin(theta);
        
        points.push(px, py, pz);
      }
    }
  }
  
  return new Float32Array(points);
}
```

### 3.2 大陸形状表現

#### 地理データの統合
```typescript
interface ContinentData {
  name: string;
  color: number;
  coordinates: Array<{ lat: number; lon: number }>;
}

function latLonToSphere(
  lat: number,
  lon: number,
  radius: number
): { x: number; y: number; z: number } {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta)
  };
}

function createContinentParticles(
  continents: ContinentData[],
  radius: number,
  density: number
): THREE.Points[] {
  return continents.map(continent => {
    const points: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color(continent.color);
    
    for (let i = 0; i < continent.coordinates.length - 1; i++) {
      const start = continent.coordinates[i];
      const end = continent.coordinates[i + 1];
      
      // 2点間を補間
      const steps = Math.floor(
        Math.sqrt(
          Math.pow(end.lat - start.lat, 2) +
          Math.pow(end.lon - start.lon, 2)
        ) * density
      );
      
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const lat = start.lat + (end.lat - start.lat) * t;
        const lon = start.lon + (end.lon - start.lon) * t;
        
        const pos = latLonToSphere(lat, lon, radius);
        points.push(pos.x, pos.y, pos.z);
        colors.push(color.r, color.g, color.b);
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', 
      new THREE.BufferAttribute(new Float32Array(points), 3));
    geometry.setAttribute('color',
      new THREE.BufferAttribute(new Float32Array(colors), 3));
    
    const material = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });
    
    return new THREE.Points(geometry, material);
  });
}
```

### 3.3 大気圏レイヤー

#### 多層パーティクルシステム
```typescript
interface AtmosphereConfig {
  layers: Array<{
    radius: number;
    particleCount: number;
    color: number;
    opacity: number;
    rotationSpeed: number;
  }>;
}

const atmosphereConfig: AtmosphereConfig = {
  layers: [
    // 地球表面
    {
      radius: 5,
      particleCount: 8000,
      color: 0x00d4ff,
      opacity: 0.8,
      rotationSpeed: 0.001
    },
    // 対流圏
    {
      radius: 5.3,
      particleCount: 3000,
      color: 0x4dd2ff,
      opacity: 0.4,
      rotationSpeed: 0.0015
    },
    // 成層圏
    {
      radius: 5.6,
      particleCount: 1500,
      color: 0x99e6ff,
      opacity: 0.2,
      rotationSpeed: 0.002
    }
  ]
};

class LayeredEarth {
  private layers: THREE.Points[] = [];
  
  create(config: AtmosphereConfig): void {
    config.layers.forEach(layerConfig => {
      const positions = generateSpherePoints(
        layerConfig.particleCount,
        layerConfig.radius
      );
      
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position',
        new THREE.BufferAttribute(positions, 3));
      
      const material = new THREE.PointsMaterial({
        color: layerConfig.color,
        size: 2.0,
        transparent: true,
        opacity: layerConfig.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const layer = new THREE.Points(geometry, material);
      this.layers.push(layer);
    });
  }
  
  animate(): void {
    this.layers.forEach((layer, index) => {
      const speed = atmosphereConfig.layers[index].rotationSpeed;
      layer.rotation.y += speed;
      
      // 各レイヤーでわずかに異なる回転を追加
      layer.rotation.x += speed * 0.1;
    });
  }
}
```

### 3.4 パフォーマンス最適化

#### LOD (Level of Detail) システム
```typescript
class LODController {
  private levels = [
    { distance: 15, particleCount: 10000, particleSize: 2.0 },
    { distance: 25, particleCount: 6000, particleSize: 2.5 },
    { distance: 40, particleCount: 3000, particleSize: 3.0 }
  ];
  
  getCurrentLOD(cameraDistance: number): typeof this.levels[0] {
    for (const level of this.levels) {
      if (cameraDistance <= level.distance) {
        return level;
      }
    }
    return this.levels[this.levels.length - 1];
  }
  
  updateParticles(
    camera: THREE.PerspectiveCamera,
    earth: THREE.Points
  ): void {
    const distance = camera.position.distanceTo(earth.position);
    const lod = this.getCurrentLOD(distance);
    
    // マテリアルのサイズ更新
    (earth.material as THREE.PointsMaterial).size = lod.particleSize;
    
    // 必要に応じてパーティクル数を調整(ジオメトリ再生成)
    // 注: 頻繁な再生成はコストが高いため、距離の大幅な変化時のみ実行
  }
}
```

#### フラスタムカリング最適化
```typescript
// Three.jsのデフォルトのフラスタムカリングを活用
// ただし、球体全体が常に表示される場合は無効化してパフォーマンス向上
earth.frustumCulled = false;

// 代わりに手動で可視性チェック
function isEarthVisible(
  camera: THREE.PerspectiveCamera,
  earth: THREE.Points
): boolean {
  const distance = camera.position.distanceTo(earth.position);
  const earthRadius = 5; // 地球の半径
  
  // カメラの視野角から可視範囲を計算
  const fovRadians = camera.fov * Math.PI / 180;
  const visibleDistance = earthRadius / Math.tan(fovRadians / 2);
  
  return distance < visibleDistance * 2;
}
```

### 3.5 エフェクト拡張

#### グローエフェクト
```typescript
// UnrealBloomPassの代替として、シンプルなグロー実装
class GlowEffect {
  create(earth: THREE.Points): THREE.Points {
    // グローレイヤー用のコピーを作成
    const glowGeometry = earth.geometry.clone();
    const glowMaterial = new THREE.PointsMaterial({
      color: 0x00d4ff,
      size: 4.0,  // 元のサイズより大きく
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const glow = new THREE.Points(glowGeometry, glowMaterial);
    glow.scale.set(1.02, 1.02, 1.02);  // わずかに大きく
    
    return glow;
  }
}
```

#### パルスエフェクト
```typescript
class PulseEffect {
  private time = 0;
  private pulseSpeed = 0.002;
  private pulseAmplitude = 0.05;
  
  update(earth: THREE.Points): void {
    this.time += this.pulseSpeed;
    const scale = 1 + Math.sin(this.time) * this.pulseAmplitude;
    earth.scale.set(scale, scale, scale);
  }
}
```

---

## 統合実装チェックリスト

### Phase 1
- [ ] フィボナッチ球面法によるパーティクル生成
- [ ] Three.jsシーン初期化
- [ ] 基本的な自動回転アニメーション
- [ ] レスポンシブ対応(リサイズハンドラー)
- [ ] デバイス別パーティクル数最適化
- [ ] メモリ管理(dispose処理)

### Phase 2
- [ ] マウストラッキングシステム
- [ ] カメラ追従機能
- [ ] ホバーエフェクト(サイズ・速度変化)
- [ ] スクロールズーム機能
- [ ] カラースキーム切り替え
- [ ] グラデーションカラー実装

### Phase 3
- [ ] テクスチャベースのパーティクル配置
- [ ] 大陸形状の表現
- [ ] 多層大気圏システム
- [ ] LODシステム
- [ ] グローエフェクト
- [ ] パルスアニメーション

## パフォーマンス目標値

| メトリクス | 目標値 | 測定方法 |
|----------|--------|---------|
| FPS | 60fps (最低50fps) | requestAnimationFrame |
| 初期ロード時間 | < 2秒 | performance.now() |
| メモリ使用量 | < 150MB | performance.memory |
| インタラクション応答 | < 16ms | イベント→描画更新 |

## ブラウザ互換性マトリックス

| ブラウザ | 最小バージョン | 注意点 |
|---------|--------------|-------|
| Chrome | 90+ | フル機能サポート |
| Firefox | 88+ | フル機能サポート |
| Safari | 14+ | WebGL制限あり |
| Edge | 90+ | フル機能サポート |
| Mobile Safari | iOS 14+ | パーティクル数削減推奨 |
| Chrome Mobile | 90+ | パーティクル数削減推奨 |