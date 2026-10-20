import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { SpotLight } from 'three'
import type { OriginRect } from '../components/TributeReader'
import type { PublicTribute } from '../lib/api/schemas'
import { BAY, HALL } from './layout'
import { Plaque } from './Plaque'
import type { Station } from './sceneMachine'
import { getWood, useLabelTexture, usePortraitTexture } from './textures'

const C = {
  plaster: '#efe6d3',
  plasterWarm: '#eadfc8',
  wainscot: '#b49775',
  wainscotCap: '#8a6a49',
  frame: '#6b4f33',
  brass: '#c2a263',
  rug: '#b7ab8c',
  rugEdge: '#9c8f6d',
  leaf: '#788560',
}
const FLOOR_TINTS = ['#a07c58', '#9a8260', '#a68a64', '#8d7556']

type V3 = [number, number, number]

function Slab({ pos, size, color, rot, rough = 0.9, map }: { pos: V3; size: V3; color: string; rot?: V3; rough?: number; map?: import('three').Texture }) {
  return (
    <mesh position={pos} rotation={rot}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={map ? '#ffffff' : color} map={map} roughness={rough} />
    </mesh>
  )
}

function Plant({ pos }: { pos: V3 }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.28, 0.2, 0.6, 10]} />
        <meshStandardMaterial color="#8d7a63" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.95, 0]} scale={[1, 1.15, 1]}>
        <icosahedronGeometry args={[0.45, 1]} />
        <meshStandardMaterial color={C.leaf} roughness={1} flatShading />
      </mesh>
      <mesh position={[0.12, 1.4, 0.05]}>
        <icosahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial color="#8a9670" roughness={1} flatShading />
      </mesh>
    </group>
  )
}

function CeilingLamp({ pos }: { pos: V3 }) {
  return (
    <group position={pos}>
      <mesh>
        <cylinderGeometry args={[0.38, 0.38, 0.08, 20]} />
        <meshBasicMaterial color="#fff0cc" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
        <meshStandardMaterial color={C.frame} />
      </mesh>
    </group>
  )
}

/** Wall with an arched-style opening (posts + header) on the plane `z`, spanning ±halfW. */
function ArchWall({ z, halfW, open, openH, height }: { z: number; halfW: number; open: number; openH: number; height: number }) {
  const seg = halfW - open / 2
  return (
    <group>
      <Slab pos={[-(open / 2 + seg / 2), height / 2, z]} size={[seg, height, 0.3]} color={C.plasterWarm} />
      <Slab pos={[open / 2 + seg / 2, height / 2, z]} size={[seg, height, 0.3]} color={C.plasterWarm} />
      <Slab pos={[0, (openH + height) / 2, z]} size={[open, height - openH, 0.3]} color={C.plasterWarm} />
      {/* wood trim around the opening */}
      <Slab pos={[-open / 2 - 0.06, openH / 2, z]} size={[0.12, openH, 0.4]} color={C.wainscotCap} />
      <Slab pos={[open / 2 + 0.06, openH / 2, z]} size={[0.12, openH, 0.4]} color={C.wainscotCap} />
      <Slab pos={[0, openH + 0.06, z]} size={[open + 0.24, 0.12, 0.4]} color={C.wainscotCap} />
    </group>
  )
}

/** Shared room shell: floor, ceiling, side walls with wainscot, entry arch wall. */
function Room({ z, tint, length = BAY.length, height = BAY.height, children }: { z: number; tint: number; length?: number; height?: number; children?: React.ReactNode }) {
  const floor = getWood(FLOOR_TINTS[tint % FLOOR_TINTS.length]!, 3, 2.5, 6, 11 + tint)
  const entryZ = z + length / 2 - 0.3
  const sideLen = length - 0.1
  const sideZ = z - 0.1 / 2 - 0.1
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, z]}>
        <planeGeometry args={[BAY.halfW * 2, length]} />
        <meshStandardMaterial map={floor} roughness={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, z]}>
        <planeGeometry args={[BAY.halfW * 2, length]} />
        <meshStandardMaterial color="#f3ecdc" roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Slab pos={[s * (BAY.halfW + 0.1), height / 2, sideZ]} size={[0.2, height, sideLen]} color={C.plaster} />
          <Slab pos={[s * (BAY.halfW - 0.03), 0.5, sideZ]} size={[0.06, 1.0, sideLen]} color={C.wainscot} rough={0.7} />
          <Slab pos={[s * (BAY.halfW - 0.05), 1.02, sideZ]} size={[0.1, 0.06, sideLen]} color={C.wainscotCap} rough={0.7} />
        </group>
      ))}
      <ArchWall z={entryZ} halfW={BAY.halfW + 0.2} open={2.4} openH={2.8} height={height} />
      {/* rug */}
      <Slab pos={[0, 0.035, z]} size={[4.6, 0.02, 3.4]} color={C.rugEdge} />
      <Slab pos={[0, 0.047, z]} size={[4.3, 0.02, 3.1]} color={C.rug} />
      <CeilingLamp pos={[0, height - 0.05, z]} />
      <Plant pos={[-4.4, 0, z + 3.3]} />
      <Plant pos={[4.4, 0, z - 3.3]} />
      {children}
    </group>
  )
}

/** One category wall: room + label + plaques on the left or right wall. */
export function Bay({
  station,
  onOpen,
}: {
  station: Station
  onOpen: (tribute: PublicTribute, origin: OriginRect) => void
}) {
  const left = station.side === 'left'
  const wallX = left ? -BAY.halfW + 0.04 : BAY.halfW - 0.04
  const n = Math.max(1, station.tributes.length)
  const label = useLabelTexture(
    station.categoryName,
    station.pageCount > 1 ? `Wall ${station.page} of ${station.pageCount}` : station.tributes.length ? 'Tributes' : 'Waiting for memories',
  )
  const zFor = (k: number) =>
    left ? station.z + ((n - 1) / 2 - k) * BAY.plaqueSpacing : station.z + (k - (n - 1) / 2) * BAY.plaqueSpacing

  return (
    <Room z={station.z} tint={station.categoryIndex}>
      <mesh position={[wallX, 3.2, station.z]} rotation={[0, left ? Math.PI / 2 : -Math.PI / 2, 0]}>
        <planeGeometry args={[2.6, 0.65]} />
        <meshBasicMaterial map={label} toneMapped={false} />
      </mesh>
      {station.tributes.length === 0 ? (
        <Plaque tribute={null} position={[wallX, BAY.plaqueY, station.z]} rotationY={left ? Math.PI / 2 : -Math.PI / 2} />
      ) : (
        station.tributes.map((t, k) => (
          <Plaque
            key={t.id}
            tribute={t}
            position={[wallX, BAY.plaqueY, zFor(k)]}
            rotationY={left ? Math.PI / 2 : -Math.PI / 2}
            onOpen={onOpen}
          />
        ))
      )}
    </Room>
  )
}

function PortraitFrame({ name, url, pos, rotY, scale = 1 }: { name: string; url: string | null; pos: V3; rotY: number; scale?: number }) {
  const tex = usePortraitTexture(name, url)
  return (
    <group position={pos} rotation={[0, rotY, 0]} scale={scale}>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[1.95, 2.4, 0.1]} />
        <meshStandardMaterial color={C.frame} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.103]}>
        <boxGeometry args={[1.7, 2.15, 0.02]} />
        <meshStandardMaterial color="#d8c8a2" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.116]}>
        <planeGeometry args={[1.5, 1.875]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* brass picture light */}
      <mesh position={[0, 1.38, 0.14]}>
        <boxGeometry args={[0.7, 0.05, 0.14]} />
        <meshStandardMaterial color={C.brass} metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  )
}

function Candle({ pos }: { pos: V3 }) {
  const flame = useRef<import('three').Mesh>(null)
  useFrame(({ clock }) => {
    if (flame.current) {
      const t = clock.elapsedTime
      flame.current.scale.setScalar(1 + Math.sin(t * 9 + pos[2] * 7) * 0.08 + Math.sin(t * 5.3) * 0.05)
    }
  })
  return (
    <group position={pos}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.2, 10]} />
        <meshStandardMaterial color="#f3ead6" roughness={0.8} />
      </mesh>
      <mesh ref={flame} position={[0, 0.25, 0]} scale={[0.6, 1, 0.6]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#ffd98a" toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * Hall / memorial room: warm interior, the portrait frame with a subtly breathing picture light,
 * an offering table, and a doorway down the gallery axis (back wall).
 */
export function Hall({ name, portraitUrl }: { name: string; portraitUrl: string | null }) {
  const spot = useRef<SpotLight>(null)
  const floor = getWood('#9d7a56', 2.4, 2.4, 6, 5)
  const len = HALL.frontZ - HALL.backZ
  const midZ = (HALL.frontZ + HALL.backZ) / 2
  const h = HALL.height

  useFrame(({ clock }) => {
    if (spot.current) {
      const t = clock.elapsedTime
      spot.current.intensity = 55 * (1 + 0.05 * Math.sin(t * 0.9) + 0.025 * Math.sin(t * 2.1))
    }
  })

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, midZ]}>
        <planeGeometry args={[HALL.halfW * 2, len]} />
        <meshStandardMaterial map={floor} roughness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, h, midZ]}>
        <planeGeometry args={[HALL.halfW * 2, len]} />
        <meshStandardMaterial color="#f3ecdc" roughness={1} />
      </mesh>
      {/* side walls + wainscot */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Slab pos={[s * (HALL.halfW + 0.1), h / 2, midZ]} size={[0.2, h, len]} color={C.plaster} />
          <Slab pos={[s * (HALL.halfW - 0.03), 0.5, midZ]} size={[0.06, 1.0, len]} color={C.wainscot} rough={0.7} />
          <Slab pos={[s * (HALL.halfW - 0.05), 1.02, midZ]} size={[0.1, 0.06, len]} color={C.wainscotCap} rough={0.7} />
        </group>
      ))}
      {/* front wall (door) and back wall (gallery doorway) */}
      <ArchWall z={HALL.frontZ + 0.15} halfW={HALL.halfW + 0.2} open={1.4} openH={2.4} height={h} />
      <ArchWall z={HALL.backZ - 0.15} halfW={HALL.halfW + 0.2} open={2.2} openH={2.8} height={h} />
      {/* runner rug */}
      <Slab pos={[0, 0.035, midZ]} size={[2.4, 0.02, len - 0.8]} color={C.rugEdge} />
      <Slab pos={[0, 0.047, midZ]} size={[2.1, 0.02, len - 1.1]} color={C.rug} />

      {/* window glow panels on the right wall */}
      {[-2.2, 1.6].map((z) => (
        <group key={z} position={[HALL.halfW - 0.04, 1.9, z]} rotation={[0, -Math.PI / 2, 0]}>
          <Slab pos={[0, 0, 0]} size={[1.5, 1.7, 0.06]} color="#8a6a49" />
          <mesh position={[0, 0, 0.04]}>
            <planeGeometry args={[1.3, 1.5]} />
            <meshBasicMaterial color="#fdebbd" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* portrait on the left wall, facing +x */}
      <PortraitFrame name={name} url={portraitUrl} pos={[-HALL.halfW + 0.02, HALL.portraitY, HALL.portraitZ]} rotY={Math.PI / 2} />
      <spotLight ref={spot} position={[-HALL.halfW + 1.4, 3.15, HALL.portraitZ]} angle={0.55} penumbra={0.9} decay={1.6} distance={9} color="#ffe2a8" intensity={55}>
        <object3D attach="target" position={[-1.45, -1.25, 0]} />
      </spotLight>

      {/* offering table */}
      <group position={[-HALL.halfW + 0.35, 0, HALL.portraitZ]}>
        <Slab pos={[0, 0.78, 0]} size={[0.5, 0.06, 1.7]} color="#7a5636" rough={0.6} />
        {[-0.75, 0.75].map((z) =>
          [-0.18, 0.18].map((x) => (
            <Slab key={`${z}${x}`} pos={[x, 0.37, z]} size={[0.05, 0.74, 0.05]} color="#6b4a2d" />
          )),
        )}
        <Candle pos={[0.02, 0.81, -0.55]} />
        <Candle pos={[0.0, 0.81, 0.6]} />
        <mesh position={[0.02, 1.0, 0.0]}>
          <cylinderGeometry args={[0.07, 0.1, 0.36, 12]} />
          <meshStandardMaterial color="#d8d3c2" roughness={0.4} />
        </mesh>
        {[
          [0, 1.28, 0],
          [0.07, 1.22, 0.07],
          [-0.06, 1.24, -0.06],
          [0.03, 1.33, -0.08],
        ].map((p, i) => (
          <mesh key={i} position={p as V3}>
            <icosahedronGeometry args={[0.1, 1]} />
            <meshStandardMaterial color={i % 2 ? '#f1e8d4' : '#c9c5a2'} roughness={1} flatShading />
          </mesh>
        ))}
      </group>
      <Plant pos={[HALL.halfW - 0.5, 0, HALL.frontZ - 0.6]} />
      <Plant pos={[-HALL.halfW + 0.5, 0, HALL.backZ + 0.6]} />
      <CeilingLamp pos={[0, h - 0.05, midZ + 1.5]} />
    </group>
  )
}

/** Closing room at the end of the gallery. */
export function FinalRoom({ z, name, portraitUrl, tint }: { z: number; name: string; portraitUrl: string | null; tint: number }) {
  const label = useLabelTexture('With love', 'Thank you for remembering')
  return (
    <Room z={z} tint={tint}>
      <Slab pos={[0, BAY.height / 2, z - BAY.length / 2 - 0.1]} size={[BAY.halfW * 2 + 0.4, BAY.height, 0.2]} color={C.plaster} />
      <Slab pos={[0, 0.5, z - BAY.length / 2 + 0.03]} size={[BAY.halfW * 2, 1.0, 0.06]} color={C.wainscot} rough={0.7} />
      <PortraitFrame name={name} url={portraitUrl} pos={[0, 1.95, z - BAY.length / 2 + 0.02]} rotY={0} scale={1.1} />
      <mesh position={[0, 3.2, z - BAY.length / 2 + 0.04]}>
        <planeGeometry args={[2.6, 0.65]} />
        <meshBasicMaterial map={label} toneMapped={false} />
      </mesh>
      {/* guest table */}
      <Slab pos={[0, 0.78, z - BAY.length / 2 + 0.7]} size={[2.2, 0.06, 0.6]} color="#7a5636" rough={0.6} />
      {[-1, 1].map((s) => (
        <Slab key={s} pos={[s * 0.95, 0.37, z - BAY.length / 2 + 0.7]} size={[0.06, 0.74, 0.5]} color="#6b4a2d" />
      ))}
      <Candle pos={[-0.6, 0.81, z - BAY.length / 2 + 0.7]} />
      <Candle pos={[0.6, 0.81, z - BAY.length / 2 + 0.7]} />
    </Room>
  )
}
