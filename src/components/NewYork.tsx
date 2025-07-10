import { useGLTF } from '@react-three/drei'
import type { SceneChild, PlatformSlice } from '../types/general_types'
import { useCallback, useEffect, useState } from 'react'

import { useRef } from 'react'
import * as THREE from 'three'
import { Object3D } from 'three'
import { useHelper } from '@react-three/drei'

import { useAtom } from 'jotai'
import { guiAtom } from '../store/store'
import { useFrame, useThree } from '@react-three/fiber'

const DISTANCE_BETWEEN_PIPES = 14

const NewYork = () => {
  const model = useGLTF('/models/ny_scene.glb')
  const [sceneChildren, setSceneChildren] = useState<SceneChild[]>([])
  const platformSlices = useRef<PlatformSlice[]>([])
  const [dlightPosition] = useState(new THREE.Vector3(5, 15, 15))
  const [gui] = useAtom(guiAtom)
  const { scene } = useThree()

  const directional_light_ref = useRef<THREE.DirectionalLight>(null)

  // This typing error doesn't affect us
  useHelper(directional_light_ref, THREE.DirectionalLightHelper, 1, 'red')

  // Populate scene children
  useEffect(() => {
    // SET MIN FILTER IN THE TEXTURES THAT REQUIRE IT
    const NYC_material = model.materials.nyc_material as THREE.MeshStandardMaterial
    NYC_material.map!.minFilter = THREE.LinearFilter

    if (sceneChildren.length) return

    const setupFirstSlice = () => {
      const first_pipe = model.scene.children.find((child) => child.name === 'pipe_bottom_0')
      const first_floor_platform = model.scene.children.find((child) => child.name === 'floor_platform_0')
      if (!first_pipe || !first_floor_platform) return

      const first_top_pipe = first_pipe.clone()
      first_top_pipe.name = 'pipe_top_0'
      first_top_pipe.position.y = 30
      first_top_pipe.rotation.z = Math.PI
      first_top_pipe.rotation.y = Math.PI

      const third_pipe = first_pipe.clone()
      third_pipe.name = 'pipe_bottom_1'
      third_pipe.position.x += DISTANCE_BETWEEN_PIPES

      const fourth_pipe = first_top_pipe.clone()
      fourth_pipe.name = 'pipe_top_1'
      fourth_pipe.position.x += DISTANCE_BETWEEN_PIPES

      model.scene.children.push(first_top_pipe, third_pipe, fourth_pipe)
      platformSlices.current.push({
        pipes: [first_pipe, first_top_pipe, third_pipe, fourth_pipe],
        terrain: first_floor_platform
      })
    }

    setupFirstSlice()

    const processedSceneChildren = model.scene.children.map((child) => {
      return {
        object: child,
        element: <primitive object={child} key={child.id} />
      }
    })

    setSceneChildren(processedSceneChildren)
  }, [sceneChildren, model, scene.children])

  const addPlatform = useCallback(
    (side: 'left' | 'right') => {
      const platforms = platformSlices.current

      const previous_platform_i = side === 'left' ? 0 : platforms.length - 1
      const previous_platform = platforms[previous_platform_i]

      const new_terrain = previous_platform.terrain.clone()
      const new_terrain_name = new_terrain.name.split('_')
      new_terrain_name.splice(2, 1, previous_platform_i + '')
      new_terrain.name = new_terrain_name.join('_')

      const DISTANCE_BETWEEN_TERRAINS = 35
      new_terrain.position.x += side === 'left' ? -DISTANCE_BETWEEN_TERRAINS : DISTANCE_BETWEEN_TERRAINS

      const previous_pipes = previous_platform.pipes
      let last_pipe = side === 'left' ? previous_pipes[0] : previous_pipes[3]
      let current_pipe_number = Number(last_pipe.name.split('_')[2]) + (side === 'left' ? -1 : 1)

      const new_pipes = previous_platform.pipes.map((pipe, i) => {
        const new_pipe = pipe.clone()

        const new_pipe_name = new_pipe.name.split('_')
        new_pipe_name.splice(2, 1, current_pipe_number + '')
        new_pipe.name = new_pipe_name.join('_')

        new_pipe.position.x = last_pipe.position.x
        new_pipe.position.x += side === 'left' ? -DISTANCE_BETWEEN_PIPES : DISTANCE_BETWEEN_PIPES

        if (i % 2 !== 0) {
          current_pipe_number += side === 'left' ? -1 : 1
          last_pipe = new_pipe
        }

        return new_pipe
      }) as [Object3D, Object3D, Object3D, Object3D]

      if (side === 'left') new_pipes.reverse()

      const new_platform: PlatformSlice = {
        terrain: new_terrain,
        pipes: new_pipes
      }

      if (side === 'left') {
        platformSlices.current.unshift(new_platform)
      } else {
        platformSlices.current.push(new_platform)
      }

      const new_scene_children = [new_terrain, ...new_pipes].map((object) => {
        return {
          object,
          element: <primitive object={object} key={object.id} />
        }
      })

      setSceneChildren([...sceneChildren, ...new_scene_children])
      scene.children.push(new_terrain, ...new_pipes)
    },
    [scene, sceneChildren]
  )

  // GUI
  useEffect(() => {
    if (!gui) return

    const platformsFolder = gui.addFolder('Game Platforms')

    const platformFunctions = {
      addPlatformLeft: () => {
        addPlatform('left')
      },
      addPlatformRight: () => {
        addPlatform('right')
      }
    }
    platformsFolder.add(platformFunctions, 'addPlatformLeft')
    platformsFolder.add(platformFunctions, 'addPlatformRight')

    const guiLightFolder = gui.addFolder('Directional Light')
    guiLightFolder.add(dlightPosition, 'x').min(-80).max(80).step(0.01).name('positionX')
    guiLightFolder.add(dlightPosition, 'y').min(-80).max(80).step(0.01).name('positionY')
    guiLightFolder.add(dlightPosition, 'z').min(-80).max(80).step(0.01).name('positionZ')

    return () => {
      guiLightFolder.destroy()
      platformsFolder.destroy()
    }
  }, [dlightPosition, gui, addPlatform])

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
