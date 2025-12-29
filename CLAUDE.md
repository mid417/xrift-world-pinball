# XRift World Template - AI向けガイド

このドキュメントは、AI（Claude、ChatGPTなど）がこのプロジェクトを理解し、適切にコードを生成・修正するためのガイドです。

## プロジェクト概要

このプロジェクトは、XRiftプラットフォームで動作するWebXRワールドを作成するためのテンプレートです。Module Federationを使用して、フロントエンド側から動的にロードされます。

## 重要な制約事項

### 1. アセット読み込みは必ず `@xrift/world-components` の `useXRift` を使用

**理由**: ワールドはCDNにアップロードされ、フロントエンド側から動的にロードされるため、アセットのベースURLが実行時に決まります。

**正しい実装**:
```typescript
import { useXRift } from '@xrift/world-components'
import { useGLTF } from '@react-three/drei'

function MyModel() {
  const { baseUrl } = useXRift()
  const { scene } = useGLTF(`${baseUrl}models/robot.glb`)
  return <primitive object={scene} />
}
```

**間違った実装**:
```typescript
// ❌ 絶対パスや相対パスを直接指定してはいけない
import { useGLTF } from '@react-three/drei'

function MyModel() {
  const { scene } = useGLTF('/models/robot.glb')  // ❌
  const { scene } = useGLTF('./models/robot.glb') // ❌
  return <primitive object={scene} />
}
```

### 2. アセットファイルは `public/` ディレクトリに配置

- GLBモデル、テクスチャ画像などは`public/`に配置
- `public/`内のファイルはビルド時にCDNにアップロードされる
- `baseUrl`は末尾に`/`を含むため、パス結合時に`/`を重複させない

**例**:
```typescript
// ✅ 正しい（baseUrlは "https://cdn.example.com/worlds/xxx/" のように末尾に/を含む）
const model = useGLTF(`${baseUrl}models/robot.glb`)

// ❌ 間違い（//models/robot.glb となってしまう）
const model = useGLTF(`${baseUrl}/models/robot.glb`)
```

### 3. ローカル開発環境では `XRiftProvider` でラップ

開発時（`npm run dev`）は、`XRiftProvider`でワールドをラップしてベースURLを提供する必要があります。

**src/dev.tsx の例**:
```typescript
import { XRiftProvider } from '@xrift/world-components'
import { World } from './World'

createRoot(rootElement).render(
  <XRiftProvider baseUrl="/public/">
    <Canvas>
      <Physics>
        <World />
      </Physics>
    </Canvas>
  </XRiftProvider>
)
```

### 4. 本番環境では `XRiftProvider` は不要

本番環境（XRiftプラットフォーム上）では、フロントエンド側が自動的に`XRiftProvider`でワールドコンポーネントをラップします。

## よくある実装パターン

### GLBモデルの読み込み

```typescript
import { useXRift } from '@xrift/world-components'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'

export const MyModel = () => {
  const { baseUrl } = useXRift()
  const { scene } = useGLTF(`${baseUrl}models/robot.glb`)

  return (
    <RigidBody type="fixed">
      <primitive object={scene} />
    </RigidBody>
  )
}
```

### テクスチャの読み込み

```typescript
import { useXRift } from '@xrift/world-components'
import { useTexture } from '@react-three/drei'

export const MyMaterial = () => {
  const { baseUrl } = useXRift()
  const texture = useTexture(`${baseUrl}textures/albedo.png`)

  return <meshStandardMaterial map={texture} />
}
```

### 複数テクスチャの読み込み

```typescript
import { useXRift } from '@xrift/world-components'
import { useTexture } from '@react-three/drei'

export const MyPBRMaterial = () => {
  const { baseUrl } = useXRift()
  const [albedo, normal, roughness] = useTexture([
    `${baseUrl}textures/albedo.png`,
    `${baseUrl}textures/normal.png`,
    `${baseUrl}textures/roughness.png`,
  ])

  return (
    <meshStandardMaterial
      map={albedo}
      normalMap={normal}
      roughnessMap={roughness}
    />
  )
}
```

### Skybox（360度パノラマ背景）

```typescript
import { useXRift } from '@xrift/world-components'
import { useTexture } from '@react-three/drei'
import { BackSide } from 'three'

export const Skybox = ({ radius = 500 }) => {
  const { baseUrl } = useXRift()
  const texture = useTexture(`${baseUrl}skybox.jpg`)

  return (
    <mesh>
      <sphereGeometry args={[radius, 60, 40]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  )
}
```

## プロジェクト構造

```
xrift-world-template/
├── public/              # アセットファイル（GLB, テクスチャなど）
│   ├── models/
│   ├── textures/
│   └── *.jpg, *.png
├── src/
│   ├── components/      # 3Dコンポーネント
│   ├── World.tsx        # メインワールドコンポーネント
│   ├── dev.tsx          # 開発用エントリーポイント
│   └── index.tsx        # 本番用エクスポート
├── .triplex/            # Triplex（3Dエディタ）設定
│   ├── config.json
│   └── provider.tsx
├── vite.config.ts       # Module Federation設定
└── package.json
```

## 依存パッケージ

### 必須パッケージ
- `@xrift/world-components`: XRift固有の機能（useXRift等）を提供
- `@react-three/fiber`: React Three Fiber
- `@react-three/drei`: Three.js用ヘルパー
- `@react-three/rapier`: 物理エンジン
- `three`: Three.js本体

### 開発用パッケージ
- `@originjs/vite-plugin-federation`: Module Federation
- `vite`: ビルドツール
- `typescript`: TypeScript

## ビルドとデプロイ

1. **開発**: `npm run dev` → http://localhost:5173
2. **ビルド**: `npm run build` → `dist/`にModule Federation形式で出力
3. **型チェック**: `npm run typecheck`

## AI向けの注意事項

1. **必ず `useXRift` を使用**: アセット読み込みで絶対パスや相対パスを直接使わない
2. **`public/` にアセット配置**: アセットは`public/`ディレクトリに配置
3. **パス結合時の `/` に注意**: `baseUrl`は末尾に`/`を含むため、`${baseUrl}path`と結合
4. **ローカル開発環境の設定**: `src/dev.tsx`で`XRiftProvider`を使用
5. **Module Federation**: このプロジェクトはライブラリとしてビルドされ、フロントエンドから動的ロードされる

## トラブルシューティング

### エラー: "useXRift must be used within XRiftProvider"

**原因**: `XRiftProvider`でラップされていない

**解決方法**:
- ローカル開発環境: `src/dev.tsx`で`XRiftProvider`を使用しているか確認
- Triplex: `.triplex/provider.tsx`で`XRiftProvider`を使用しているか確認

### アセットが読み込めない

**原因**: `baseUrl`を使用していない、またはパスの結合が間違っている

**解決方法**:
```typescript
// ✅ 正しい
const { baseUrl } = useXRift()
const model = useGLTF(`${baseUrl}models/robot.glb`)

// ❌ 間違い
const model = useGLTF('/models/robot.glb')
const model = useGLTF(`${baseUrl}/models/robot.glb`) // 余分な/
```

## 実装例の参照先

- Duck（GLBモデル）: `src/components/Duck/index.tsx`
- Skybox（360度背景）: `src/components/Skybox/index.tsx`
- メインワールド: `src/World.tsx`
- 開発環境設定: `src/dev.tsx`

## ワールドの座標について

- Y軸: +Yが上方向、-Yが下方向
- X軸: +Xが東（右）方向、-Xが西（左）方向
- Z軸: +Zが南（手前）方向、-Zが北（奥）方向

## ルール

- コードを修正した場合、必ず `npm run typecheck` を実行して型エラーがないことを確認し、エラーがあった場合は解決してください。


---

# XRift World Template - AI Instructions
### 5. カスタマイズ

- `src/World.tsx`: メインのワールドコンポーネント
- `src/components/`: 各種3Dオブジェクトのコンポーネント
- `vite.config.ts`: ビルド設定
- `package.json`: プロジェクト情報

詳細なカスタマイズ方法は [TEMPLATE.md](./TEMPLATE.md) を参照してください。

#### アセット（GLTFモデル、テクスチャ）の読み込み

XRiftでは、ワールドのアセットは自動的にCDNにアップロードされ、適切なベースURLが注入されます。アセットを読み込む際は、`@xrift/world-components`パッケージの`useXRift`フックを使用してベースURLを取得してください。

```typescript
import { useXRift } from '@xrift/world-components'
import { useGLTF, useTexture } from '@react-three/drei'

function MyModel() {
  const { baseUrl } = useXRift()

  // ベースURLと相対パスを結合してGLTFモデルを読み込む
  const gltf = useGLTF(`${baseUrl}models/robot.gltf`)

  return <primitive object={gltf.scene} />
}

function MyMaterial() {
  const { baseUrl } = useXRift()

  // テクスチャを読み込む
  const texture = useTexture(`${baseUrl}textures/albedo.png`)

  return <meshStandardMaterial map={texture} />
}

function MyPBRMaterial() {
  const { baseUrl } = useXRift()

  // 複数のテクスチャを同時に読み込む
  const [albedo, normal, roughness] = useTexture([
    `${baseUrl}textures/albedo.png`,
    `${baseUrl}textures/normal.png`,
    `${baseUrl}textures/roughness.png`,
  ])

  return (
    <meshStandardMaterial
      map={albedo}
      normalMap={normal}
      roughnessMap={roughness}
    />
  )
}
```

**重要**: アセットパスを指定する際は、必ず`useXRift()`で取得した`baseUrl`を使用してください。これにより、XRiftプラットフォーム上で正しくアセットが読み込まれます。

##### アセットファイルの配置

アセットファイル（GLBモデル、テクスチャ画像など）は`public/`ディレクトリに配置してください。

```
your-world-project/
├── public/
│   ├── models/
│   │   └── robot.glb
│   ├── textures/
│   │   ├── albedo.png
│   │   ├── normal.png
│   │   └── roughness.png
│   └── skybox.jpg
├── src/
│   └── World.tsx
└── package.json
```

`public/`内のファイルは、ビルド時に自動的にCDNにアップロードされ、`baseUrl`経由でアクセスできるようになります。

##### ローカル開発環境での設定

ローカルで開発する際は、`@xrift/world-components`の`XRiftProvider`を使用してベースURLを設定してください。

```typescript
// src/dev.tsx（開発用エントリーポイント）
import { XRiftProvider } from '@xrift/world-components'
import { World } from './World'

function App() {
  return (
    <XRiftProvider baseUrl="/">
      <Canvas>
        <Physics>
          <World />
        </Physics>
      </Canvas>
    </XRiftProvider>
  )
}
```

本番環境（XRiftプラットフォーム上）では、フロントエンド側が自動的に`XRiftProvider`でワールドコンポーネントをラップするため、ワールド側で`XRiftProvider`を使用する必要はありません。

#### インタラクティブなオブジェクトの作成

`@xrift/world-components`の`Interactable`コンポーネントを使用すると、ユーザーがクリック（インタラクト）できる3Dオブジェクトを簡単に作成できます。

```typescript
import { Interactable } from '@xrift/world-components'
import { RigidBody } from '@react-three/rapier'

function InteractiveButton() {
  const handleClick = (id: string) => {
    console.log(`${id} がクリックされました！`)
    // クリック時の処理をここに記述
  }

  return (
    <Interactable
      id="my-button"
      onInteract={handleClick}
      interactionText="ボタンをクリック"
    >
      <RigidBody type="fixed">
        <mesh position={[0, 1, -3]}>
          <boxGeometry args={[1, 0.3, 1]} />
          <meshStandardMaterial color="#4a9eff" />
        </mesh>
      </RigidBody>
    </Interactable>
  )
}
```

##### Interactableのプロパティ

- `id` (必須): オブジェクトの一意な識別子
- `onInteract` (必須): クリック時に呼ばれるコールバック関数。オブジェクトのIDが引数として渡されます
- `interactionText` (任意): インタラクション時に表示されるテキスト。省略時は「クリックする」が表示されます
- `enabled` (任意): インタラクションの有効/無効を切り替え。デフォルトは`true`
- `children` (必須): インタラクション可能にしたい3Dオブジェクト

##### 使用例

このテンプレートには、`src/components/InteractableButton/`に実装例が含まれています：

- クリック回数をカウント
- クリック数に応じて色が変化
- ボタンを押すアニメーション効果

詳細な実装は`src/components/InteractableButton/index.tsx`と`src/World.tsx`を参照してください。

#### インスタンス全体で同期される状態管理（useInstanceState）

`@xrift/world-components`の`useInstanceState`フックを使用すると、同じワールドインスタンス内の全ユーザー間で状態を同期できます。これにより、マルチユーザー対応のインタラクティブなワールドを簡単に作成できます。

```typescript
import { useInstanceState } from '@xrift/world-components'

function GlobalCounter() {
  // インスタンス全体で同期されるカウンター
  const [count, setCount] = useInstanceState<number>('global-counter', 0)

  const handleClick = () => {
    setCount((prev) => prev + 1)
  }

  return (
    <Interactable id="counter" onInteract={handleClick}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={count > 5 ? 'green' : 'blue'} />
      </mesh>
    </Interactable>
  )
}
```

##### useInstanceStateの使い方

```typescript
const [state, setState] = useInstanceState<T>(stateId, initialState)
```

**パラメータ:**
- `stateId`: 状態の一意識別子（インスタンス内で一意である必要があります）
- `initialState`: 初期状態値
- `setState`: 状態を更新する関数（Reactの`useState`と同じAPI）

**更新パターン:**
```typescript
// 直接値を設定
setState({ enabled: true })

// 関数型アップデート
setState(prev => ({ enabled: !prev.enabled }))
```

**重要な注意点:**
- 状態はJSON形式でシリアライズ可能である必要があります
- プラットフォーム側がWebSocketを通じて全クライアント間の同期を実現します
- ローカル開発環境（Context未設定時）では通常の`useState`として動作します

##### ローカルステートとグローバルステートの使い分け

このテンプレートの`InteractableButton`コンポーネントは、`useGlobalState`プロパティで動作を切り替えられる実装例を提供しています：

```typescript
// ローカルステート（各ユーザーごとに独立）
<InteractableButton
  id="local-button"
  label="ローカル"
  useGlobalState={false}
/>

// グローバルステート（全ユーザー間で同期）
<InteractableButton
  id="global-button"
  label="グローバル"
  useGlobalState={true}
/>
```

実装の詳細は`src/components/InteractableButton/index.tsx`を参照してください。

## .xriftディレクトリについて

`.xrift/`ディレクトリには、ワールドの設定情報（ワールドIDなど）がローカル環境固有の情報として保存されます。このディレクトリは`.gitignore`に含まれており、リポジトリにコミットされません。

```.xrift/
└── world.json  # ワールドID、名前などの情報
```

このファイルは、XRift CLIでワールドをデプロイする際に自動的に作成・更新されます。開発者が手動で編集する必要はありません。

### 6. ビルド

```bash
npm run build
```

Module Federation形式でビルドされ、XRiftプラットフォームで読み込み可能な形式で `dist/` に出力されます。

## 開発コマンド

```bash# 開発サーバー起動（ホットリロード有効）
npm run dev

# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview

# TypeScript型チェック
npm run typecheck
```

## 技術スタック

- **React**: 19.x
- **Three.js**: 0.176.x
- **@react-three/fiber**: 9.3.x
- **@react-three/rapier**: 2.1.x（物理エンジン）
- **@react-three/drei**: 10.7.x（Three.js用ヘルパー）
- **TypeScript**: 5.x
- **Vite**: 6.x（ビルドツール）

## プロジェクト設定（xrift.json）

プロジェクトルートの`xrift.json`で、XRift CLIの動作をカスタマイズできます。

### 設定例

```json
{
  "world": {
    "distDir": "./dist",
    "title": "サンプルワールド",
    "description": "React Three FiberとRapierで作られたサンプルワールドです",
    "thumbnailPath": "thumbnail.png",
    "buildCommand": "npm run build",
    "ignore": [
      "**/.DS_Store",
      "**/Thumbs.db",
      "**/*.js.map",
      "**/.gitkeep",
      "**/index.html"
    ]
  }
}
```

### 設定項目

- `distDir` (必須): アップロードするビルド済みファイルが格納されているディレクトリ
- `title` (任意): ワールドのタイトル（プロンプトのデフォルト値になります）
- `description` (任意): ワールドの説明（プロンプトのデフォルト値になります）
- `thumbnailPath` (任意): `distDir`内のサムネイル画像の相対パス（例: `thumbnail.png`）
- `buildCommand` (任意): アップロード前に自動実行するビルドコマンド
- `ignore` (任意): アップロード時に除外するファイルパターン（glob形式）

---
# Tips

## R3Fでアニメーションする時はuseRef + useFrameを使う

### useStateが遅くなる条件
- コンポーネント関数内にCPU負荷の高いJavaScript処理がある場合
- 毎フレーム`setState`を呼んでいる場合

### useRefを使うべき理由
- 再レンダリングが発生しない - コンポーネント関数が再実行されない
- Three.jsオブジェクトを直接操作できる - useFrame内でrefを使って直接更新
- 意図が明確 - アニメーション値はReactの状態管理の対象ではない


### ベストプラクティス

```tsx
// Good
const meshRef = useRef();
useFrame(() => {
  meshRef.current.rotation.y += 0.01;
});

// Bad
const [rotation, setRotation] = useState(0);
useFrame(() => {
  setRotation((prev) => prev + 0.01);
});
```

R3Fでアニメーションする時は、`useRef` + `useFrame`のパターンを使いましょう。

