import { useGLTF } from '@react-three/drei'
import type { SceneChild } from '../types/general_types'
import { useEffect, useState } from 'react'

import { useRef } from 'react'
import * as THREE from 'three'
import { useHelper } from '@react-three/drei'

const NewYork = () => {
  const model = useGLTF('/models/ny_scene.glb')
  const [sceneChildren, setSceneChildren] = useState<SceneChild[]>([])

  const directional_light_ref = useRef<THREE.DirectionalLight>(null)

  // This typing error doesn't affect us
  useHelper(directional_light_ref, THREE.DirectionalLightHelper, 1, 'red')

  useEffect(() => {
    console.log('Model loaded!')
    console.log(model)
  }, [model])

  const getModel = () => {
    if (model) return <primitive object={model.scene} />
    return null
  }

  return (
    <>
      {getModel()}

      <directionalLight
        ref={directional_light_ref}
        castShadow={false}
        position={[5, 15, 15]}
        intensity={2}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={10}
        shadow-camera-top={10}
        shadow-camera-right={10}
        shadow-camera-bottom={-10}
        shadow-camera-left={-10}
      />
      <ambientLight intensity={1.5} color={'#fff'} />
    </>
  )
}

export default NewYork
