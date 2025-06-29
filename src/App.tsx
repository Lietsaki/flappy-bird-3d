import { useState } from 'react'
import InteractUI from './components/UI/InteractUI'

import { Canvas } from '@react-three/fiber'

const App = () => {
  return (
    <>
      <Canvas
        camera={{
          fov: 45,
          near: 0.1,
          far: 200
        }}
      ></Canvas>

      <InteractUI />
    </>
  )
}

export default App
