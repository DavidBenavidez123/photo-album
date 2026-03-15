import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 60
const startTime = performance.now()

function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 14,
      z: (Math.random() - 0.5) * 6 - 2,
      scale: Math.random() * 0.08 + 0.02,
      speedX: (Math.random() - 0.5) * 0.003,
      speedY: Math.random() * 0.002 + 0.001,
      phase: Math.random() * Math.PI * 2,
      driftFreq: Math.random() * 0.3 + 0.1,
    }))
  }, [])

  useFrame(() => {
    const t = (performance.now() - startTime) / 1000

    particles.forEach((p, i) => {
      p.x += p.speedX + Math.sin(t * p.driftFreq + p.phase) * 0.002
      p.y += p.speedY

      // Wrap around when particles drift off screen
      if (p.y > 8) p.y = -8
      if (p.x > 12) p.x = -12
      if (p.x < -12) p.x = 12

      dummy.position.set(p.x, p.y, p.z)
      // Gentle pulsing scale
      const pulse = 1 + Math.sin(t * 0.5 + p.phase) * 0.3
      const s = p.scale * pulse
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial
        color="#000000"
        transparent
        opacity={0.04}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

export default function ParticlesBackground() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.7 }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Particles />
      </Canvas>
    </div>
  )
}
