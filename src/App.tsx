import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'

import InteractUI from './components/UI/InteractUI'
import NewYork from './components/NewYork'
import Bird from './components/Bird'
import DebugGui from './components/debug/DebugGui'
import { useEffect, useState } from 'react'

const CameraManagement = () => {
  const [zoom, setZoom] = useState(26)
  const [cameraPosition, setCameraPosition] = useState<THREE.Vector3Tuple>([-25, 13, 0])

  const { size } = useThree()

  useEffect(() => {
    const base_ratio = { h: 1100, z: 26 }

    setZoom(base_ratio.z * (size.height / base_ratio.h))

    if (size.width < 600) {
      setCameraPosition([-28, 13, 0])
    }
  }, [size])

  return (
    <OrthographicCamera
      makeDefault
      near={-100}
      far={200}
      zoom={zoom}
      position={cameraPosition}
    ></OrthographicCamera>
  )
}

const App = () => {
  return (
    <>
      <Canvas gl={{ toneMapping: THREE.LinearToneMapping, antialias: true }}>
        <CameraManagement />
        <DebugGui />
        <NewYork />
        <Bird />
      </Canvas>

      <InteractUI />
    </>
  )
}

export default App
