import { Canvas } from '@react-three/fiber'

import InteractUI from './components/UI/InteractUI'
import NewYork from './components/NewYork'
import DebugGui from './components/debug/DebugGui'

const App = () => {
  return (
    <>
      <Canvas
        camera={{
          fov: 45,
          near: 0.1,
          far: 300
        }}
      >
        <NewYork />
        <DebugGui />
      </Canvas>

      <InteractUI />
    </>
  )
}

export default App
