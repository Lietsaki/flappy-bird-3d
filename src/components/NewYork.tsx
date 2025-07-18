import { useGLTF } from '@react-three/drei'
import type { SceneChild, PlatformSlice, BoundingBoxesMap } from '../types/general_types'
import { useCallback, useEffect, useState } from 'react'

import { useRef } from 'react'
import * as THREE from 'three'
import { Object3D } from 'three'
import { useHelper } from '@react-three/drei'

import { useAtom } from 'jotai'
import { boundingBoxesMapAtom, guiAtom } from '../store/store'
import { useFrame, useThree } from '@react-three/fiber'
import { showHelpersAtom } from '../store/store'

const DISTANCE_BETWEEN_PIPES = 16.02
const BBOX_COLLISION_COLOR = 'yellow'
const BBOX_SENSOR_COLOR = 'crimson'
const LOOP_TRIGGER = -150

const NewYork = () => {
  const model = useGLTF('/models/ny_scene.glb')
  const [sceneChildren, setSceneChildren] = useState<SceneChild[]>([])
  const platformSlices = useRef<PlatformSlice[]>([])
  const [dlightPosition] = useState(new THREE.Vector3(5, 15, 15))

  const [gui] = useAtom(guiAtom)
  const [showHelpers] = useAtom(showHelpersAtom)
  const [bbMap, setBbMap] = useAtom(boundingBoxesMapAtom)

  const { scene } = useThree()

  const aux_vec3_1 = useRef(new THREE.Vector3())
  const directional_light_ref = useRef<THREE.DirectionalLight>(null)

  // This typing error doesn't affect us
  useHelper(directional_light_ref, THREE.DirectionalLightHelper, 1, 'red')

  const addBboxes = useCallback(
    (objects: THREE.Object3D[]) => {
      const boundingBoxesMap: BoundingBoxesMap = {}

      for (const obj of objects) {
        const { name } = obj
        const bbox = new THREE.Box3().setFromObject(obj)

        boundingBoxesMap[name] = {
          name,
          bbox,
          type: 'collision'
        }

        if (showHelpers) {
          const boxHelper = new THREE.Box3Helper(bbox, BBOX_COLLISION_COLOR)
          const helperName = `helper_${name}`
          boxHelper.name = helperName

          const helper = scene.getObjectByName(helperName)
          if (helper) scene.remove(helper)

          scene.add(boxHelper)
        }
      }

      // Add a sensor between pipes
      const pipes = Object.values(boundingBoxesMap).filter((obj) => obj.name.includes('pipe'))

      for (let i = 0; i < pipes.length; i += 2) {
        const bottom_pipe = pipes[i]
        const top_pipe = pipes[i + 1]
        const pipes_number = bottom_pipe.name.split('_')[2]
        const name = `sensor_pipes_${pipes_number}`

        const bbox = new THREE.Box3(
          new THREE.Vector3(bottom_pipe.bbox.min.x, bottom_pipe.bbox.max.y, bottom_pipe.bbox.min.z),
          new THREE.Vector3(bottom_pipe.bbox.max.x, top_pipe.bbox.min.y, bottom_pipe.bbox.max.z)
        )

        bbox.min.x += 1
        bbox.max.x -= 1
        bbox.min.z += 1
        bbox.max.z -= 1

        boundingBoxesMap[name] = {
          name,
          bbox,
          type: 'sensor'
        }

        if (showHelpers) {
          const boxHelper = new THREE.Box3Helper(bbox, BBOX_SENSOR_COLOR)
          const helperName = `helper_${name}`
          boxHelper.name = helperName

          const helper = scene.getObjectByName(helperName)
          if (helper) scene.remove(helper)

          scene.add(boxHelper)
        }
      }

      return boundingBoxesMap
    },
    [scene, showHelpers]
  )

  // 1) Populate scene children & setup first slice
  useEffect(() => {
    // SET MIN FILTER IN THE TEXTURES THAT REQUIRE IT
    const NYC_material = model.materials.nyc_material as THREE.MeshStandardMaterial
    NYC_material.map!.minFilter = THREE.LinearFilter

    if (sceneChildren.length) return
    let boundingBoxesMap: BoundingBoxesMap = {}

    const first_pipe = model.scene.children.find((child) => child.name === 'pipe_bottom_0')
    const first_floor_platform = model.scene.children.find((child) => child.name === 'floor_platform_0')
    const first_top_pipe_preexisting = model.scene.children.find((child) => child.name === 'pipe_top_0')

    if (!first_pipe || !first_floor_platform || first_top_pipe_preexisting) return

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

    const first_slice_objects = [first_floor_platform, first_pipe, first_top_pipe, third_pipe, fourth_pipe]
    boundingBoxesMap = addBboxes(first_slice_objects)

    model.scene.add(first_top_pipe, third_pipe, fourth_pipe)
    platformSlices.current.push({
      pipes: [first_pipe, first_top_pipe, third_pipe, fourth_pipe],
      terrain: first_floor_platform
    })

    const processedSceneChildren = model.scene.children.map((child) => {
      return {
        object: child,
        element: <primitive object={child} key={child.id} />
      }
    })

    setBbMap(boundingBoxesMap)
    setSceneChildren(processedSceneChildren)
  }, [sceneChildren, model, scene, setBbMap, showHelpers, addBboxes])

  const addPlatform = useCallback(
    (
      side: 'left' | 'right',
      amount = 1
    ): { updatedBbMap: BoundingBoxesMap; updatedSceneChildren: SceneChild[] } | null => {
      if (amount < 1) return null
      const new_platform_objects: Object3D[] = []
      const platforms = platformSlices.current

      for (let i = amount; i > 0; i--) {
        const previous_platform_i = side === 'left' ? 0 : platforms.length - 1
        const previous_platform = platforms[previous_platform_i]

        const new_terrain = previous_platform.terrain.clone()
        const new_terrain_number = Number(new_terrain.name.split('_')[2]) + (side === 'left' ? -1 : 1)
        const new_terrain_name = new_terrain.name.split('_')

        new_terrain_name.splice(2, 1, new_terrain_number + '')
        new_terrain.name = new_terrain_name.join('_')

        const terrain_bbox = new THREE.Box3().setFromObject(new_terrain)

        // Calculate terrain length: This is equivalent to bbox.max.x - bbox.min.x
        const terrain_length = terrain_bbox.getSize(aux_vec3_1.current)

        // The "gap" between terrains is a visual artifact, add a little offset to seal it.
        const DISTANCE_BETWEEN_TERRAINS = terrain_length.x - 0.02
        new_terrain.position.x += side === 'left' ? -DISTANCE_BETWEEN_TERRAINS : DISTANCE_BETWEEN_TERRAINS

        const previous_pipes = previous_platform.pipes
        const negative_previous_pipe = previous_pipes[0].name.includes('-')
        let last_pipe = side === 'left' && !negative_previous_pipe ? previous_pipes[0] : previous_pipes[3]
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

        const new_platform: PlatformSlice = {
          terrain: new_terrain,
          pipes: new_pipes
        }

        if (side === 'left') {
          platformSlices.current.unshift(new_platform)
        } else {
          platformSlices.current.push(new_platform)
        }

        new_platform_objects.push(new_terrain, ...new_pipes)
      }

      // =========================== Bounding Boxes =========================== //

      const bounding_boxes_map = addBboxes(new_platform_objects)

      const new_scene_children = new_platform_objects.map((object) => {
        return {
          object,
          element: <primitive object={object} key={object.id} />
        }
      })

      // ================================================================ //

      return {
        updatedBbMap: bounding_boxes_map,
        updatedSceneChildren: new_scene_children
      }
    },
    [addBboxes]
  )

  const movePlatformToFront = useCallback(
    (platform: PlatformSlice) => {
      if (platformSlices.current.length < 2) return

      const last_platform = platformSlices.current[platformSlices.current.length - 1]
      const last_terrain_bbox = new THREE.Box3().setFromObject(last_platform.terrain)
      const distance_between_terrains = last_terrain_bbox.getSize(aux_vec3_1.current).x - 0.01

      platform.terrain.position.x = last_platform.terrain.position.x + distance_between_terrains
      platform.terrain.name = last_platform.terrain.name

      let last_pipe = last_platform.pipes[3]

      for (let i = 0; i < platform.pipes.length; i++) {
        const pipe = platform.pipes[i]
        pipe.name = last_platform.pipes[i].name
        pipe.position.x = last_pipe.position.x + DISTANCE_BETWEEN_PIPES

        if (i % 2 !== 0) {
          last_pipe = pipe
        }
      }

      platformSlices.current = platformSlices.current.filter((platformSlice) => platformSlice !== platform)
      platformSlices.current.push(platform)

      // Update the number of previous platforms
      for (let i = platformSlices.current.length - 2; i >= 0; i--) {
        const platform = platformSlices.current[i]
        const new_terrain_name = platform.terrain.name.split('_')
        const current_number = Number(new_terrain_name[2])

        new_terrain_name.splice(2, 1, current_number - 1 + '')
        platform.terrain.name = new_terrain_name.join('_')

        for (const pipe of platform.pipes) {
          const new_pipe_name = pipe.name.split('_')
          const current_number = Number(new_pipe_name[2])

          new_pipe_name.splice(2, 1, current_number - 2 + '')
          pipe.name = new_pipe_name.join('_')
        }
      }

      const platform_slice_objects = platformSlices.current
        .map((slice) => [slice.terrain, ...slice.pipes])
        .flat()

      const boundingBoxesMap = addBboxes(platform_slice_objects)
      setBbMap(boundingBoxesMap)
    },
    [addBboxes, setBbMap]
  )

  // 2) Setup all slices
  useEffect(() => {
    if (platformSlices.current.length !== 1 || !sceneChildren.length) return

    const updatedPlatforms1 = addPlatform('left', 4)!
    const updatedPlatforms2 = addPlatform('right', 5)!

    setBbMap({ ...bbMap, ...updatedPlatforms1.updatedBbMap, ...updatedPlatforms2.updatedBbMap })
    setSceneChildren([
      ...updatedPlatforms1.updatedSceneChildren,
      ...sceneChildren,
      ...updatedPlatforms2.updatedSceneChildren
    ])
  }, [addPlatform, bbMap, sceneChildren, setBbMap])

  // 3) GUI
  useEffect(() => {
    if (!gui) return

    const platformsFolder = gui.addFolder('Game Platforms')

    const platformFunctions = {
      addPlatformLeft: () => {
        const updatedPlatforms = addPlatform('left')!
        setBbMap({ ...bbMap, ...updatedPlatforms.updatedBbMap })
        setSceneChildren([...updatedPlatforms.updatedSceneChildren, ...sceneChildren])
      },
      addPlatformRight: () => {
        const updatedPlatforms = addPlatform('right')!
        setBbMap({ ...bbMap, ...updatedPlatforms.updatedBbMap })
        setSceneChildren([...sceneChildren, ...updatedPlatforms.updatedSceneChildren])
      },
      moveLastPlatformToFront: () => {
        movePlatformToFront(platformSlices.current[0])
      }
    }
    platformsFolder.add(platformFunctions, 'addPlatformLeft')
    platformsFolder.add(platformFunctions, 'addPlatformRight')
    platformsFolder.add(platformFunctions, 'moveLastPlatformToFront')

    const guiLightFolder = gui.addFolder('Directional Light')
    guiLightFolder.add(dlightPosition, 'x').min(-80).max(80).step(0.01).name('positionX')
    guiLightFolder.add(dlightPosition, 'y').min(-80).max(80).step(0.01).name('positionY')
    guiLightFolder.add(dlightPosition, 'z').min(-80).max(80).step(0.01).name('positionZ')

    return () => {
      guiLightFolder.destroy()
      platformsFolder.destroy()
    }
  }, [dlightPosition, gui, addPlatform, movePlatformToFront, setBbMap, bbMap, sceneChildren])

  const renderScene = () => {
    return sceneChildren.map((child) => child.element)
  }

  const updateBboxes = (obj: THREE.Object3D) => {
    if (!bbMap) return

    bbMap[obj.name].bbox.setFromObject(obj)
  }

  const updateSensors = (pipes: THREE.Object3D[]) => {
    if (!bbMap) return

    for (let i = 0; i < pipes.length; i += 2) {
      const bottom_pipe = bbMap[pipes[i].name]
      const top_pipe = bbMap[pipes[i + 1].name]
      const pipes_number = bottom_pipe.name.split('_')[2]
      const name = `sensor_pipes_${pipes_number}`

      const bbox = bbMap[name].bbox

      bbox.set(
        new THREE.Vector3(bottom_pipe.bbox.min.x, bottom_pipe.bbox.max.y, bottom_pipe.bbox.min.z),
        new THREE.Vector3(bottom_pipe.bbox.max.x, top_pipe.bbox.min.y, bottom_pipe.bbox.max.z)
      )

      bbox.min.x += 1
      bbox.max.x -= 1
      bbox.min.z += 1
      bbox.max.z -= 1

      bbMap[name] = {
        name,
        bbox,
        type: 'sensor'
      }
    }
  }

  useFrame((_state, delta) => {
    if (!bbMap) return

    if (directional_light_ref.current) {
      directional_light_ref.current.position.copy(dlightPosition)
    }

    const safeDelta = Math.min(delta, 0.01)

    const game_vel = 3 * safeDelta

    for (const platform of platformSlices.current) {
      if (!bbMap[platform.terrain.name]) continue

      platform.terrain.position.x -= game_vel
      updateBboxes(platform.terrain)

      platform.pipes.forEach((pipe) => {
        pipe.position.x -= game_vel
        updateBboxes(pipe)
      })

      updateSensors(platform.pipes)

      if (platform.terrain.position.x < LOOP_TRIGGER) {
        movePlatformToFront(platform)
      }
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
