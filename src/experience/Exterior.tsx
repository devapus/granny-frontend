import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, ExtrudeGeometry, Shape, type Group } from 'three'
import { DOOR, HOUSE } from './layout'
import type { Quality, SceneRefsRef } from './sceneRefs'
import { getWood } from './textures'

const C = {
  wall: '#e6dcc7',
  trim: '#f5f0e3',
  roof: '#5b4a3b',
  roofRidge: '#463829',
  stone: '#bfae92',
  porch: '#a98d6c',
  glass: '#f8dfa2',
  brass: '#c2a263',
  ground: '#9aa282',
  path: '#d9cfb8',
  trunk: '#6d5339',
  leafA: '#7d8a62',
  leafB: '#6a7955',
}

// Triangular gable fill (front/back), extruded along z.
const GABLE_SHAPE = (() => {
  const s = new Shape()
  s.moveTo(-HOUSE.halfW + 0.15, 0)
  s.lineTo(HOUSE.halfW - 0.15, 0)
  s.lineTo(0, HOUSE.roofRise + 0.05)
  s.closePath()
  return s
})()
const GABLE_GEOMETRY = new ExtrudeGeometry(GABLE_SHAPE, { depth: HOUSE.halfD * 2 - 0.3, bevelEnabled: false })

const ROOF_ANGLE = Math.atan2(HOUSE.roofRise, HOUSE.halfW)
const ROOF_LEN = Math.hypot(HOUSE.roofRise, HOUSE.halfW) + 0.6
const ROOF_CX = 2.8
const ROOF_CY = HOUSE.wallH + HOUSE.roofRise - ROOF_CX * Math.tan(ROOF_ANGLE) + 0.1 / Math.cos(ROOF_ANGLE)

function Box({
  pos,
  size,
  color,
  rot,
  emissive,
  shadow = true,
  rough = 0.9,
}: {
  pos: [number, number, number]
  size: [number, number, number]
  color: string
  rot?: [number, number, number]
  emissive?: string
  shadow?: boolean
  rough?: number
}) {
  return (
    <mesh position={pos} rotation={rot} castShadow={shadow} receiveShadow={shadow}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? 1 : 0} />
    </mesh>
  )
}

function Window({ pos, rotY = 0 }: { pos: [number, number, number]; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Box pos={[0, 0, 0]} size={[1.8, 1.4, 0.1]} color={C.trim} shadow={false} />
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[1.55, 1.15, 0.04]} />
        <meshStandardMaterial color={C.glass} emissive={C.glass} emissiveIntensity={0.55} roughness={0.3} />
      </mesh>
      <Box pos={[0, 0, 0.09]} size={[0.06, 1.15, 0.03]} color={C.trim} shadow={false} />
      <Box pos={[0, 0, 0.09]} size={[1.55, 0.06, 0.03]} color={C.trim} shadow={false} />
      <Box pos={[0, -0.76, 0.1]} size={[2, 0.1, 0.22]} color={C.trim} shadow={false} />
    </group>
  )
}

function Tree({ x, z, s = 1, tone = 0 }: { x: number; z: number; s?: number; tone?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 2.2, 7]} />
        <meshStandardMaterial color={C.trunk} roughness={1} />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow>
        <icosahedronGeometry args={[1.9, 0]} />
        <meshStandardMaterial color={tone ? C.leafB : C.leafA} roughness={1} flatShading />
      </mesh>
      <mesh position={[0.6, 4.2, 0.2]} castShadow>
        <icosahedronGeometry args={[1.25, 0]} />
        <meshStandardMaterial color={tone ? C.leafA : C.leafB} roughness={1} flatShading />
      </mesh>
    </group>
  )
}

function Bush({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <mesh position={[x, 0.45 * s, z]} scale={[s * 1.2, s * 0.9, s]} castShadow>
      <icosahedronGeometry args={[0.7, 1]} />
      <meshStandardMaterial color={C.leafB} roughness={1} flatShading />
    </mesh>
  )
}

const TREES: { x: number; z: number; s: number; tone: number }[] = [
  { x: -9, z: -2, s: 1.1, tone: 0 },
  { x: 9.5, z: -3, s: 1.2, tone: 1 },
  { x: -12.5, z: 7, s: 1.0, tone: 1 },
  { x: 13.5, z: 8, s: 1.15, tone: 0 },
  { x: -7, z: -12, s: 1.3, tone: 1 },
  { x: 6, z: -13, s: 1.25, tone: 0 },
  { x: -19, z: -7, s: 1.2, tone: 0 },
  { x: 20, z: -6, s: 1.3, tone: 1 },
]

/** Sky dome: soft, warm daylight gradient (no HDR download needed). */
export function Sky() {
  return (
    <mesh scale={[1, 1, 1]} renderOrder={-1}>
      <sphereGeometry args={[95, 24, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        fog={false}
        uniforms={{}}
        vertexShader={`varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
        fragmentShader={`varying vec3 vPos; void main(){
          float h = clamp(normalize(vPos).y, 0.0, 1.0);
          vec3 horizon = vec3(0.945, 0.906, 0.808);
          vec3 mid = vec3(0.835, 0.867, 0.835);
          vec3 top = vec3(0.64, 0.745, 0.78);
          vec3 c = mix(horizon, mid, smoothstep(0.0, 0.25, h));
          c = mix(c, top, smoothstep(0.2, 0.9, h));
          gl_FragColor = vec4(c, 1.0);
        }`}
      />
    </mesh>
  )
}

/** Procedural exterior: walls, gabled roof, door (animated), windows, porch, garden. */
export function Exterior({ refs, quality }: { refs: SceneRefsRef; quality: Quality }) {
  const doorRef = useRef<Group>(null)
  const woodDoor = getWood('#7a5636', 1, 1, 4, 3)
  const high = quality === 'high'

  useFrame(() => {
    if (doorRef.current) doorRef.current.rotation.y = refs.current.door.angle
  })

  const wallZ = HOUSE.frontZ - 0.15
  const sideWidth = HOUSE.halfW - DOOR.width / 2

  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <circleGeometry args={[80, 48]} />
        <meshStandardMaterial color={C.ground} roughness={1} />
      </mesh>
      {/* stepping-stone path */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[Math.sin(i * 1.7) * 0.18, 0.02, 7.1 + i * 1.5]} rotation={[-Math.PI / 2, 0, Math.sin(i) * 0.3]} receiveShadow>
          <circleGeometry args={[0.62, 7]} />
          <meshStandardMaterial color={C.path} roughness={1} />
        </mesh>
      ))}

      {/* walls */}
      <Box pos={[-(DOOR.width / 2 + sideWidth / 2), HOUSE.wallH / 2, wallZ]} size={[sideWidth, HOUSE.wallH, 0.3]} color={C.wall} />
      <Box pos={[DOOR.width / 2 + sideWidth / 2, HOUSE.wallH / 2, wallZ]} size={[sideWidth, HOUSE.wallH, 0.3]} color={C.wall} />
      <Box pos={[0, (DOOR.height + HOUSE.wallH) / 2, wallZ]} size={[DOOR.width, HOUSE.wallH - DOOR.height, 0.3]} color={C.wall} />
      <Box pos={[-HOUSE.halfW + 0.15, HOUSE.wallH / 2, 0]} size={[0.3, HOUSE.wallH, HOUSE.halfD * 2]} color={C.wall} />
      <Box pos={[HOUSE.halfW - 0.15, HOUSE.wallH / 2, 0]} size={[0.3, HOUSE.wallH, HOUSE.halfD * 2]} color={C.wall} />
      <Box pos={[0, HOUSE.wallH / 2, -HOUSE.halfD + 0.15]} size={[HOUSE.halfW * 2, HOUSE.wallH, 0.3]} color={C.wall} />
      {/* plinth */}
      <Box pos={[0, 0.15, 0]} size={[HOUSE.halfW * 2 + 0.2, 0.3, HOUSE.halfD * 2 + 0.2]} color={C.stone} />

      {/* gables */}
      <mesh geometry={GABLE_GEOMETRY} position={[0, HOUSE.wallH, -HOUSE.halfD + 0.15]} castShadow receiveShadow>
        <meshStandardMaterial color={C.wall} roughness={0.9} />
      </mesh>

      {/* roof */}
      {[-1, 1].map((side) => (
        <Box
          key={side}
          pos={[side * ROOF_CX, ROOF_CY, 0]}
          size={[ROOF_LEN, 0.18, HOUSE.halfD * 2 + 0.9]}
          rot={[0, 0, -side * ROOF_ANGLE]}
          color={C.roof}
          rough={0.8}
        />
      ))}
      <Box pos={[0, HOUSE.wallH + HOUSE.roofRise + 0.2, 0]} size={[0.4, 0.14, HOUSE.halfD * 2 + 0.95]} color={C.roofRidge} />
      <Box pos={[-2.9, 5.1, -1.6]} size={[0.75, 1.9, 0.75]} color="#b9a78d" />
      <Box pos={[-2.9, 6.1, -1.6]} size={[0.95, 0.14, 0.95]} color="#a8957a" />

      {/* windows */}
      <Window pos={[-3.3, 1.95, HOUSE.frontZ + 0.02]} />
      <Window pos={[3.3, 1.95, HOUSE.frontZ + 0.02]} />
      <Window pos={[HOUSE.halfW + 0.02, 1.95, 0]} rotY={Math.PI / 2} />
      <Window pos={[-HOUSE.halfW - 0.02, 1.95, 0]} rotY={-Math.PI / 2} />
      <Window pos={[0, 4.5, HOUSE.frontZ - 0.1]} />

      {/* door frame + door */}
      <Box pos={[-DOOR.width / 2 - 0.08, DOOR.height / 2, HOUSE.frontZ + 0.04]} size={[0.16, DOOR.height + 0.1, 0.34]} color={C.trim} shadow={false} />
      <Box pos={[DOOR.width / 2 + 0.08, DOOR.height / 2, HOUSE.frontZ + 0.04]} size={[0.16, DOOR.height + 0.1, 0.34]} color={C.trim} shadow={false} />
      <Box pos={[0, DOOR.height + 0.06, HOUSE.frontZ + 0.04]} size={[DOOR.width + 0.32, 0.16, 0.34]} color={C.trim} shadow={false} />
      <group ref={doorRef} position={[DOOR.hingeX, 0, HOUSE.frontZ - 0.02]}>
        <mesh position={[DOOR.width / 2, DOOR.height / 2, 0]} castShadow>
          <boxGeometry args={[DOOR.width, DOOR.height, 0.08]} />
          <meshStandardMaterial map={woodDoor} roughness={0.7} />
        </mesh>
        {[0.6, 1.8].map((y) => (
          <mesh key={y} position={[DOOR.width / 2, y, 0.05]}>
            <boxGeometry args={[0.9, 0.8, 0.02]} />
            <meshStandardMaterial color="#6a4a2b" roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[DOOR.width - 0.14, 1.1, 0.08]}>
          <sphereGeometry args={[0.05, 12, 8]} />
          <meshStandardMaterial color={C.brass} metalness={0.6} roughness={0.35} />
        </mesh>
      </group>

      {/* porch */}
      <Box pos={[0, 0.14, HOUSE.frontZ + 1.2]} size={[4.8, 0.28, 2.4]} color={C.porch} rough={0.8} />
      <Box pos={[0, 0.07, HOUSE.frontZ + 2.65]} size={[2.6, 0.14, 0.55]} color={C.stone} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 2.1, 1.75, HOUSE.frontZ + 2.0]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 3.0, 12]} />
          <meshStandardMaterial color={C.trim} roughness={0.8} />
        </mesh>
      ))}
      <Box pos={[0, 3.35, HOUSE.frontZ + 1.2]} size={[5.2, 0.16, 2.9]} color={C.roof} rot={[0.07, 0, 0]} rough={0.8} />
      {/* door lanterns */}
      {[-1.25, 1.25].map((x) => (
        <group key={x} position={[x, 1.9, HOUSE.frontZ + 0.3]}>
          <Box pos={[0, 0, 0]} size={[0.14, 0.26, 0.14]} color="#4b3a2a" shadow={false} />
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.1, 0.2, 0.1]} />
            <meshStandardMaterial color="#ffe6a8" emissive="#ffd88a" emissiveIntensity={1.4} />
          </mesh>
        </group>
      ))}
      {/* planters */}
      {[-1.7, 1.7].map((x) => (
        <group key={x} position={[x, 0.28, HOUSE.frontZ + 0.8]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.25, 0.2, 0.4, 10]} />
            <meshStandardMaterial color="#8d7a63" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.6, 0]} scale={[1, 0.8, 1]}>
            <icosahedronGeometry args={[0.32, 1]} />
            <meshStandardMaterial color={C.leafA} roughness={1} flatShading />
          </mesh>
        </group>
      ))}

      {/* garden */}
      <Bush x={-4.3} z={5.2} s={1.1} />
      <Bush x={4.3} z={5.0} s={1.2} />
      <Bush x={-5.6} z={1.5} />
      <Bush x={5.7} z={-1} s={0.9} />
      {(high ? TREES : TREES.slice(0, 4)).map((t, i) => (
        <Tree key={i} {...t} />
      ))}
    </group>
  )
}
