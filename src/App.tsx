import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'

import InteractUI from './components/UI/InteractUI'
import NewYork from './components/NewYork'
import DebugGui from './components/debug/DebugGui'

const App = () => {
  return (
    <>
      <Canvas gl={{ toneMapping: THREE.LinearToneMapping, antialias: true }}>
        <OrthographicCamera
          makeDefault
          near={-100}
          far={200}
          zoom={50}
          position={[-44, 7, 0]}
        ></OrthographicCamera>

        <DebugGui />
        <NewYork />
      </Canvas>

      <InteractUI />
    </>
  )
}

export default App
