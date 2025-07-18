import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'

import InteractUI from './components/UI/InteractUI'
import NewYork from './components/NewYork'
import Bird from './components/Bird'
import DebugGui from './components/debug/DebugGui'

const App = () => {
  return (
    <>
      <Canvas gl={{ toneMapping: THREE.LinearToneMapping, antialias: true }}>
        <OrthographicCamera
          makeDefault
          near={-100}
          far={200}
          zoom={26}
          position={[-25, 13, 0]}
        ></OrthographicCamera>

        <DebugGui />
        <NewYork />
        <Bird />
      </Canvas>

      <InteractUI />
    </>
  )
}

export default App
