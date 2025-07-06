import { useGLTF } from '@react-three/drei'
import type { SceneChild } from '../types/general_types'
import { useEffect, useState } from 'react'

import { useRef } from 'react'
import * as THREE from 'three'
import { useHelper } from '@react-three/drei'

import { useAtom } from 'jotai'
import { guiAtom } from '../store/store'
import { useFrame } from '@react-three/fiber'

const NewYork = () => {
  const model = useGLTF('/models/ny_scene.glb')
  const [sceneChildren, setSceneChildren] = useState<SceneChild[]>([])
  const [dlightPosition] = useState(new THREE.Vector3(5, 15, 15))
  const [gui] = useAtom(guiAtom)

  const directional_light_ref = useRef<THREE.DirectionalLight>(null)

  // This typing error doesn't affect us
  useHelper(directional_light_ref, THREE.DirectionalLightHelper, 1, 'red')

  useEffect(() => {
    if (!gui) return

    const guiLightFolder = gui.addFolder('Directional Light')
    guiLightFolder.add(dlightPosition, 'x').min(-80).max(80).step(0.01).name('positionX')
    guiLightFolder.add(dlightPosition, 'y').min(-80).max(80).step(0.01).name('positionY')
    guiLightFolder.add(dlightPosition, 'z').min(-80).max(80).step(0.01).name('positionZ')

    return () => {
      guiLightFolder.destroy()
    }
  }, [dlightPosition, gui])

  useFrame(() => {
    if (directional_light_ref.current) {
      directional_light_ref.current.position.copy(dlightPosition)
    }
  })

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
        position={dlightPosition}
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
