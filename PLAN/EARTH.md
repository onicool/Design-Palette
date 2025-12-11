## プロジェクト設計書: パーティクル地球背景

### 1. 技術構成

**フロントエンド**
- Three.js (r128) - 3Dレンダリング
- TypeScript - 型安全性
- TSX - コンポーネント記述

**バックエンド**
- Hono - 軽量Webフレームワーク
- Cloudflare Workers - エッジデプロイ

### 2. アーキテクチャ設計

```
/project-root
├── /src
│   ├── /components
│   │   └── ParticleEarth.tsx       # 地球コンポーネント
│   ├── /lib
│   │   ├── earthParticles.ts       # パーティクル生成ロジック
│   │   └── sceneSetup.ts           # Three.jsシーン初期化
│   ├── /styles
│   │   └── global.css
│   └── index.tsx                    # Honoエントリーポイント
├── /public
│   └── /textures
│       └── earth-texture.jpg       # 地球テクスチャ(オプション)
├── wrangler.toml
├── tsconfig.json
└── package.json
```

### 3. コアコンポーネント設計

#### 3.1 ParticleEarth コンポーネント
**責務**: Three.jsシーンの管理とレンダリング

**主要機能**:
- Canvas要素の生成・管理
- アニメーションループの制御
- リサイズ対応
- パフォーマンス最適化

**Props**:
```typescript
interface ParticleEarthProps {
  particleCount?: number;      // デフォルト: 5000
  rotationSpeed?: number;       // デフォルト: 0.001
  particleSize?: number;        // デフォルト: 2
  earthRadius?: number;         // デフォルト: 5
  backgroundColor?: string;     // デフォルト: '#000814'
  particleColor?: string;       // デフォルト: '#00d4ff'
}
```

#### 3.2 earthParticles.ts
**責務**: パーティクルの位置計算とジオメトリ生成

**主要関数**:
```typescript
// フィボナッチ球面法でパーティクル配置
generateSpherePoints(count: number, radius: number): Float32Array

// パーティクルシステムの作成
createParticleSystem(
  points: Float32Array, 
  color: string, 
  size: number
): THREE.Points
```

#### 3.3 sceneSetup.ts
**責務**: Three.jsシーンの初期化

**主要関数**:
```typescript
initScene(canvas: HTMLCanvasElement): {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

setupLighting(scene: THREE.Scene): void
```

### 4. レンダリング戦略

#### フィボナッチ球面法を使用する理由
- 均等分布が可能なのだ
- 計算コストが低いのだ
- 美しいパターンが生成できるのだ

#### パフォーマンス最適化
1. **BufferGeometry使用**: 通常のGeometryより高速
2. **PointsMaterial**: シンプルで軽量
3. **requestAnimationFrame**: スムーズなアニメーション
4. **適応的品質**: デバイス性能に応じてパーティクル数を調整

### 5. アニメーション設計

**基本回転**:
- Y軸を中心に自動回転
- マウス位置に応じた微調整(オプション)

**インタラクション(拡張可能)**:
- マウスホバーで回転速度変化
- スクロールでズームイン/アウト
- クリックでカメラ視点変更

### 6. 統合フロー

```
1. Honoサーバー起動
   ↓
2. TSXでHTMLテンプレート生成
   ↓
3. ParticleEarthコンポーネントをマウント
   ↓
4. Three.jsシーン初期化
   ↓
5. パーティクル生成・配置
   ↓
6. アニメーションループ開始
```

### 7. 技術的考慮事項

**メモリ管理**:
- コンポーネントアンマウント時にジオメトリとマテリアルをdispose
- イベントリスナーの適切なクリーンアップ

**レスポンシブ対応**:
- ウィンドウリサイズイベントでcanvasとカメラを更新
- モバイルではパーティクル数を削減

**ブラウザ互換性**:
- WebGL対応チェック
- フォールバック画像の用意

### 8. 実装の優先順位

**Phase 1 (MVP)**:
- 基本的な球体パーティクル表示
- 自動回転アニメーション
- レスポンシブ対応

**Phase 2 (拡張)**:
- マウスインタラクション
- カラーバリエーション
- パフォーマンスチューニング

**Phase 3 (高度な機能)**:
- 地球テクスチャマッピング
- 大陸の形状表現
- 複数レイヤー(大気圏など)

実装する際の注意点なのだ:
- Three.jsのr128はCapsuleGeometryが使えないので注意するのだ
- Cloudflare Workersの制約(ファイルサイズ、実行時間)を考慮するのだ
- SSR時はthree.jsを読み込まず、クライアントサイドのみで実行するのだ

