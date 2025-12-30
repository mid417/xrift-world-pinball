import { RigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import { Mesh } from 'three'
import { COLORS, WORLD_CONFIG } from './constants'
import { Skybox } from '@xrift/world-components'
import { Pinball } from './components/Pinball'

export interface WorldProps {
    position?: [number, number, number]
    scale?: number
}

export const World: React.FC<WorldProps> = ({ position = [0, 0, 0], scale = 1 }) => {
    const groundRef = useRef<Mesh>(null)
    const worldSize = WORLD_CONFIG.size * scale

    return (
        <group position={position} scale={scale}>
            <Skybox topColor={0x333333} bottomColor={0x888888} />


            {/* 照明設定 */}
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[5, 15, 10]}
                intensity={1}
                castShadow
                shadow-mapSize-width={256}
                shadow-mapSize-height={256}
                shadow-camera-far={50}
                shadow-camera-left={-15}
                shadow-camera-right={15}
                shadow-camera-top={15}
                shadow-camera-bottom={-15}
                shadow-bias={-0.0005}
            />

            {/* 地面 */}
            <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
                <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[worldSize, worldSize]} />
                <meshLambertMaterial color={COLORS.ground} />
                </mesh>
            </RigidBody>

            {/* 箱 */}
            {/* <RigidBody type="fixed" colliders="hull" restitution={0} friction={0}>
                <mesh position={[0 * scale, 1 * scale, -10 * scale]} castShadow>
                <boxGeometry args={[2 * scale, 2 * scale, 2 * scale]} />
                <meshLambertMaterial color={COLORS.decorations.box} />
                </mesh>
            </RigidBody> */}

            {/* ピンボールゲーム */}
            <Pinball />
        </group>
    )
}
