import { useGLTF } from '@react-three/drei'
import type { SceneChild, PlatformSlice } from '../types/general_types'
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
  const platformSlices = useRef<PlatformSlice[]>([])
  const [dlightPosition] = useState(new THREE.Vector3(5, 15, 15))
  const [gui] = useAtom(guiAtom)

  const directional_light_ref = useRef<THREE.DirectionalLight>(null)

  // This typing error doesn't affect us
  useHelper(directional_light_ref, THREE.DirectionalLightHelper, 1, 'red')

  // Populate scene children
  useEffect(() => {
    // SET MIN FILTER IN THE TEXTURES THAT REQUIRE IT
    const NYC_material = model.materials.nyc_material as THREE.MeshStandardMaterial
    NYC_material.map!.minFilter = THREE.LinearFilter

    if (sceneChildren.length) return
    const { scene } = model

    const setupFirstSlice = () => {
      const first_pipe = scene.children.find((child) => child.name === 'pipe_bottom_0')
      const first_floor_platform = scene.children.find((child) => child.name === 'floor_platform_0')
      if (!first_pipe || !first_floor_platform) return

      const first_top_pipe = first_pipe.clone()
      first_top_pipe.name = 'pipe_top_0'
      first_top_pipe.position.y = 30
      first_top_pipe.rotation.z = Math.PI
      first_top_pipe.rotation.y = Math.PI

      const third_pipe = first_pipe.clone()
      third_pipe.name = 'pipe_bottom_1'
      third_pipe.position.x += 14

      const fourth_pipe = first_top_pipe.clone()
      fourth_pipe.name = 'pipe_top_1'
      fourth_pipe.position.x += 14

      scene.children.push(first_top_pipe, third_pipe, fourth_pipe)
      platformSlices.current.push({
        pipes: [first_pipe, first_top_pipe, third_pipe, fourth_pipe],
        terrain: first_floor_platform
      })
    }

    setupFirstSlice()

    const processedSceneChildren = scene.children.map((child) => {
      return {
        object: child,
        element: <primitive object={child} key={child.id} />
      }
    })

    setSceneChildren(processedSceneChildren)
  }, [sceneChildren, model])

  // GUI
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

  const renderScene = () => {
    return sceneChildren.map((child) => child.element)
  }

  useFrame(() => {
    if (directional_light_ref.current) {
      directional_light_ref.current.position.copy(dlightPosition)
    }
  })

  return (
    <>
      {renderScene()}

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
