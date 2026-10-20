import { useRef, useState } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Vector3, type Group } from 'three'
import type { OriginRect } from '../components/TributeReader'
import type { PublicTribute } from '../lib/api/schemas'
import { usePlaqueTexture } from './textures'

export const PLAQUE_SIZE = { w: 1.8, h: 2.443 }

/**
 * A tribute plaque on a wall: wooden frame + a canvas face (photo or monogram, name,
 * relationship, preview, "Read more"). Clicking/tapping opens the reading window; keyboard users
 * use the "On this wall" list in the 2D chrome.
 */
export function Plaque({
  tribute,
  position,
  rotationY,
  onOpen,
}: {
  tribute: PublicTribute | null
  position: [number, number, number]
  rotationY: number
  onOpen?: (tribute: PublicTribute, origin: OriginRect) => void
}) {
  const texture = usePlaqueTexture(tribute)
  const group = useRef<Group>(null)
  const [hover, setHover] = useState(false)
  const camera = useThree((s) => s.camera)
  const dom = useThree((s) => s.gl.domElement)
  const interactive = Boolean(tribute && onOpen)

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!tribute || !onOpen || !group.current) return
    if (e.delta > 8) return // was a drag/swipe, not a tap
    e.stopPropagation()
    const rect = dom.getBoundingClientRect()
    const xs: number[] = []
    const ys: number[] = []
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      const v = new Vector3((sx * PLAQUE_SIZE.w) / 2, (sy * PLAQUE_SIZE.h) / 2, 0.1)
      group.current.localToWorld(v)
      v.project(camera)
      xs.push(rect.left + ((v.x + 1) / 2) * rect.width)
      ys.push(rect.top + ((1 - v.y) / 2) * rect.height)
    }
    const x = Math.min(...xs)
    const y = Math.min(...ys)
    onOpen(tribute, { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y })
  }

  return (
    <group
      ref={group}
      position={position}
      rotation={[0, rotationY, 0]}
      scale={hover && interactive ? 1.025 : 1}
      onClick={click}
      onPointerOver={(e) => {
        if (!interactive) return
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
    >
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[PLAQUE_SIZE.w + 0.2, PLAQUE_SIZE.h + 0.2, 0.1]} />
        <meshStandardMaterial color="#6b4f33" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0, 0.102]}>
        <planeGeometry args={[PLAQUE_SIZE.w, PLAQUE_SIZE.h]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}
