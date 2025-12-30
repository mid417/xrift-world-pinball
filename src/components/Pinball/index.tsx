import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Interactable, useInstanceState } from '@xrift/world-components'
import * as THREE from 'three'

// ボールの初期位置・リスポーン位置
const BALL_INITIAL_POSITION: [number, number, number] = [1, 1.9, -4]
// フリッパーの初期角度
const LEFT_FLIPPER_REST_ANGLE = -Math.PI / 8
const RIGHT_FLIPPER_REST_ANGLE = Math.PI / 8
// フリッパーのスイング角度（押した時の回転量）
const FLIPPER_SWING_ANGLE = Math.PI / 6
// フリッパーの反発係数（静止時と動作時）
const FLIPPER_REST_RESTITUTION = 3.0
const FLIPPER_ACTIVE_RESTITUTION = FLIPPER_REST_RESTITUTION * 2
interface PinballState {
  ballPosition: [number, number, number]
  ballVelocity: [number, number, number]
  leftFlipperRotation: number
  rightFlipperRotation: number
  score: number
  ballOwnerId: string | null // ボールの物理演算を担当するユーザーID
  lastUpdateTime: number
}

export const Pinball = () => {
  const ballRef = useRef<RapierRigidBody>(null)
  const leftFlipperRef = useRef<RapierRigidBody>(null)
  const rightFlipperRef = useRef<RapierRigidBody>(null)
  const leftRestitutionRef = useRef(FLIPPER_REST_RESTITUTION)
  const rightRestitutionRef = useRef(FLIPPER_REST_RESTITUTION)
  const lastUpdateTime = useRef(0)
  const myId = useRef(`player-${Math.random().toString(36).substr(2, 9)}`)

  // ゲーム状態を全ユーザー間で同期
  const [gameState, setGameState] = useInstanceState<PinballState>('pinball-game', {
    ballPosition: BALL_INITIAL_POSITION,
    ballVelocity: [0, 0, 0],
    leftFlipperRotation: LEFT_FLIPPER_REST_ANGLE,
    rightFlipperRotation: RIGHT_FLIPPER_REST_ANGLE,
    score: 0,
    ballOwnerId: null,
    lastUpdateTime: Date.now(),
  })

  const isOwner = gameState.ballOwnerId === myId.current

  // 初期位置にボールを配置
  useEffect(() => {
    if (ballRef.current) {
      ballRef.current.setTranslation(
        { x: gameState.ballPosition[0], y: gameState.ballPosition[1], z: gameState.ballPosition[2] },
        true
      )
      ballRef.current.setLinvel(
        { x: gameState.ballVelocity[0], y: gameState.ballVelocity[1], z: gameState.ballVelocity[2] },
        true
      )
    }
  }, [])

  // gameStateのボール位置が変更されたら反映（オーナー以外）
  useEffect(() => {
    if (ballRef.current && !isOwner) {
      ballRef.current.setTranslation(
        { x: gameState.ballPosition[0], y: gameState.ballPosition[1], z: gameState.ballPosition[2] },
        true
      )
      ballRef.current.setLinvel(
        { x: gameState.ballVelocity[0], y: gameState.ballVelocity[1], z: gameState.ballVelocity[2] },
        true
      )
    }
  }, [gameState.ballPosition, gameState.lastUpdateTime, isOwner])

  // ボールの位置と速度を定期的に同期（オーナーのみ）
  useFrame(() => {
    if (ballRef.current && isOwner) {
      const pos = ballRef.current.translation()
      const vel = ballRef.current.linvel()

      const now = Date.now()
      // 0.05秒ごとに同期（パフォーマンス最適化）
      if (now - lastUpdateTime.current > 50) {
        setGameState(prev => ({
          ...prev,
          ballPosition: [pos.x, pos.y, pos.z],
          ballVelocity: [vel.x, vel.y, vel.z],
          lastUpdateTime: now,
        }))
        lastUpdateTime.current = now
      }

      // ボールが落ちたらリセット＆オーナー解放
      if (pos.z > 3 || pos.y < 0) {
        ballRef.current.setTranslation({ x: BALL_INITIAL_POSITION[0], y: BALL_INITIAL_POSITION[1], z: BALL_INITIAL_POSITION[2] }, true)
        ballRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ballRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
        setGameState(prev => ({
          ...prev,
          ballOwnerId: null,
          ballPosition: BALL_INITIAL_POSITION,
          ballVelocity: [0, 0, 0],
        }))
      }
    }

    // フリッパーのアニメーション
    if (leftFlipperRef.current) {
      const currentRot = leftFlipperRef.current.rotation()
      const euler = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion(currentRot.x, currentRot.y, currentRot.z, currentRot.w)
      )
      const targetY = gameState.leftFlipperRotation
      const newY = euler.y + (targetY - euler.y) * 0.3
      leftFlipperRef.current.setRotation(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, newY, 0)),
        true
      )

      // 動作中は反発係数を倍にする
      const isMoving = Math.abs(targetY - newY) > 0.01
      const targetRestitution = isMoving ? FLIPPER_ACTIVE_RESTITUTION : FLIPPER_REST_RESTITUTION
      const collider = leftFlipperRef.current.collider(0)
      if (collider && leftRestitutionRef.current !== targetRestitution) {
        collider.setRestitution(targetRestitution)
        leftRestitutionRef.current = targetRestitution
      }
    }

    if (rightFlipperRef.current) {
      const currentRot = rightFlipperRef.current.rotation()
      const euler = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion(currentRot.x, currentRot.y, currentRot.z, currentRot.w)
      )
      const targetY = gameState.rightFlipperRotation
      const newY = euler.y + (targetY - euler.y) * 0.3
      rightFlipperRef.current.setRotation(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, newY, 0)),
        true
      )

      const isMoving = Math.abs(targetY - newY) > 0.01
      const targetRestitution = isMoving ? FLIPPER_ACTIVE_RESTITUTION : FLIPPER_REST_RESTITUTION
      const collider = rightFlipperRef.current.collider(0)
      if (collider && rightRestitutionRef.current !== targetRestitution) {
        collider.setRestitution(targetRestitution)
        rightRestitutionRef.current = targetRestitution
      }
    }
  })

  // 左フリッパー操作
  const handleLeftFlipperDown = () => {
    // フリッパーを押した人がボールのオーナーになる
    setGameState(prev => ({
      ...prev,
      leftFlipperRotation: LEFT_FLIPPER_REST_ANGLE + FLIPPER_SWING_ANGLE,
      ballOwnerId: myId.current,
    }))

    // 0.2秒後に自動で戻る
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        leftFlipperRotation: LEFT_FLIPPER_REST_ANGLE,
      }))
    }, 200)
  }

  // 右フリッパー操作
  const handleRightFlipperDown = () => {
    // フリッパーを押した人がボールのオーナーになる
    setGameState(prev => ({
      ...prev,
      rightFlipperRotation: RIGHT_FLIPPER_REST_ANGLE - FLIPPER_SWING_ANGLE,
      ballOwnerId: myId.current,
    }))

    // 0.2秒後に自動で戻る
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        rightFlipperRotation: RIGHT_FLIPPER_REST_ANGLE,
      }))
    }, 200)
  }

  return (
    <group position={[0, 0, -4]}>
      {/* 背面の壁（奥） - 高さを半分に */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 1.25, -3]} receiveShadow castShadow>
          <boxGeometry args={[6, 2.5, 0.2]} />
          <meshStandardMaterial color="#d8d8d8" />
        </mesh>
      </RigidBody>

      {/* 左の壁 - 高さを半分に */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-3, 1.25, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.2, 2.5, 6]} />
          <meshStandardMaterial color="#d8d8d8" />
        </mesh>
      </RigidBody>

      {/* 右の壁 - 高さを半分に */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[3, 1.25, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.2, 2.5, 6]} />
          <meshStandardMaterial color="#d8d8d8" />
        </mesh>
      </RigidBody>

      {/* 床（傾斜） - Z軸に沿って手前に傾斜（高さを半分に合わせてY=1.25へ） */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0.8} friction={0.2} position={[0, 1.25, 0]}>
        <mesh rotation={[0.15, 0, 0]} receiveShadow>
          <boxGeometry args={[5.8, 0.2, 6]} />
          <meshStandardMaterial color="#119370" />
        </mesh>
      </RigidBody>

      {/* ボールのガイド */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-2.34, 0.99, 1.31]} rotation={[0.19198621771937618, 0.6283185307179586, 8.576944553888227e-18]} receiveShadow castShadow>
          <boxGeometry args={[0.2, 1, 2]} />
          <meshStandardMaterial color="#d8d8d8" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[2.38, 1, 1.32]} rotation={[0.20943951023931962, -0.6283185307179586, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.2, 1, 2]} />
          <meshStandardMaterial color="#d8d8d8" />
        </mesh>
      </RigidBody>



      {/* ボール */}
      <RigidBody
        ref={ballRef}
        colliders="ball"
        restitution={0.9}
        friction={0.1}
        mass={1}
        linearDamping={0.1}
        angularDamping={0.5}
        type={isOwner ? 'dynamic' : 'kinematicPosition'}
        position={BALL_INITIAL_POSITION}
      >
        <mesh castShadow>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial color="#ff3333" metalness={0.8} roughness={0.2} />
        </mesh>
      </RigidBody>

      {/* 左フリッパー */}
      <Interactable
        id="left-flipper"
        onInteract={handleLeftFlipperDown}
        interactionText="左フリッパー"
      >
        <RigidBody
          ref={leftFlipperRef}
          type="kinematicPosition"
          colliders="cuboid"
          restitution={4}
          friction={0.8}
          position={[-1.5, 1.4, 2.5]}
          rotation={[0, Math.PI / 8, 0]}
        >
          <mesh castShadow position={[0.42, -0.210000047683716, 0]}>
            <boxGeometry args={[1.2, 0.2, 0.4]} />
            <meshStandardMaterial color="#3366ff" />
          </mesh>
        </RigidBody>
      </Interactable>

      {/* 右フリッパー */}
      <Interactable
        id="right-flipper"
        onInteract={handleRightFlipperDown}
        interactionText="右フリッパー"
      >
        <RigidBody
          ref={rightFlipperRef}
          type="kinematicPosition"
          colliders="cuboid"
          restitution={4}
          friction={0.8}
          position={[1.5, 1.4, 2.5]}
          rotation={[0, -Math.PI / 8, 0]}
        >
          <mesh castShadow position={[-0.36, -0.220000047683716, -0.0000911925470123975]}>
            <boxGeometry args={[1.2, 0.2, 0.4]} />
            <meshStandardMaterial color="#3366ff" />
          </mesh>
        </RigidBody>
      </Interactable>

      {/* スコア表示（3Dテキストの代わりに簡易表示） - 壁の高さに追従 */}
      <mesh position={[0, 2.6, -2.9]}>
        <boxGeometry args={[2, 0.5, 0.1]} />
        <meshStandardMaterial color="#ffaa00" />
      </mesh>

      {/* バンパー（得点要素） - 床上に合わせて下げる */}
      <RigidBody type="fixed" colliders="ball" restitution={2}>
        {/* 半径0.3、床上面1.25+0.1=1.35 → 中心は約1.65 */}
        <mesh position={[0, 1.75, -1.67]} castShadow>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color="#ffaa00" />
        </mesh>
      </RigidBody>
    </group>
  )
}
