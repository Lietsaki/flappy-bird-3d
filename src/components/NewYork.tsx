import { useGLTF } from '@react-three/drei'
import type { SceneChild, PlatformSlice, BoundingBoxesMap } from '../types/general_types'
import { useCallback, useEffect, useState } from 'react'

import { useRef } from 'react'
import * as THREE from 'three'
import { Object3D } from 'three'
// import { useHelper } from '@react-three/drei'

import { useAtom } from 'jotai'
import {
  boundingBoxesMapAtom,
  firstScoreReadySensorAtom,
  gameOverAtom,
  guiAtom,
  lastPassedPipesAtom,
  pipesStateAtom,
  playingAtom,
  restartingGameAtom
} from '../store/store'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { showHelpersAtom } from '../store/store'
import { getRandomNumber } from '../helpers/helper_functions'

const TOTAL_PLATFORMS = 7
const DISTANCE_BETWEEN_PIPES = 16.02
const PIPES_Y_OFFSET = 20
const BBOX_COLLISION_COLOR = 'yellow'
const BBOX_SENSOR_COLOR = 'crimson'
const LOOP_TRIGGER = -150
const TERRAINS_OFFSET = 0.04

const NewYork = () => {
  const model = useGLTF('/models/ny_scene.glb')
  const bg_texture = useLoader(THREE.TextureLoader, '/backgrounds/bg_texture.png')

  const [sceneChildren, setSceneChildren] = useState<SceneChild[]>([])
  const platformSlices = useRef<PlatformSlice[]>([])
  const [dlightPosition] = useState(new THREE.Vector3(5, 15, 15))

  const [gui] = useAtom(guiAtom)
  const [showHelpers] = useAtom(showHelpersAtom)
  const [bbMap, setBbMap] = useAtom(boundingBoxesMapAtom)
  const [playing, setPlaying] = useAtom(playingAtom)
  const [lastPassedPipes] = useAtom(lastPassedPipesAtom)
  const [pipesState, setPipesState] = useAtom(pipesStateAtom)
  const [, setFirstScoreReadySensor] = useAtom(firstScoreReadySensorAtom)
  const [gameOver] = useAtom(gameOverAtom)
  const [restartingGame, setRestartingGame] = useAtom(restartingGameAtom)

  const { scene, clock } = useThree()

  const aux_vec3_1 = useRef(new THREE.Vector3())
  const base_bottom_pipe_y = useRef(0)
  const base_top_pipe_y = useRef(0)
  const directional_light_ref = useRef<THREE.DirectionalLight>(null)

  // This typing error doesn't affect us
  // useHelper(directional_light_ref, THREE.DirectionalLightHelper, 1, 'red')

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
    bg_texture.colorSpace = THREE.SRGBColorSpace
    bg_texture.needsUpdate = true
    scene.background = bg_texture

    // SET MIN FILTER IN THE TEXTURES THAT REQUIRE IT
    const NYC_material = model.materials.nyc_material as THREE.MeshStandardMaterial
    NYC_material.map!.minFilter = THREE.LinearFilter

    if (sceneChildren.length) return
    let boundingBoxesMap: BoundingBoxesMap = {}

    const first_pipe = model.scene.children.find((child) => child.name === 'pipe_bottom_0')
    const first_floor_platform = model.scene.children.find((child) => child.name === 'floor_platform_0')
    const first_top_pipe_preexisting = model.scene.children.find((child) => child.name === 'pipe_top_0')

    if (!first_pipe || !first_floor_platform || first_top_pipe_preexisting) return

    // Offset the first platform to the left so there is no visible empty space
    first_floor_platform.position.x -= 40
    first_pipe.position.x -= 40

    const first_top_pipe = first_pipe.clone()
    first_top_pipe.name = 'pipe_top_0'
    first_top_pipe.position.y = 30
    first_top_pipe.rotation.z = Math.PI
    first_top_pipe.rotation.y = Math.PI

    base_bottom_pipe_y.current = first_pipe.position.y
    base_top_pipe_y.current = first_top_pipe.position.y

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
      child.userData.baseY = child.position.y
      child.userData.phase = Math.random() * Math.PI * 2

      return {
        object: child,
        element: <primitive object={child} key={child.id} />
      }
    })

    setBbMap(boundingBoxesMap)
    setSceneChildren(processedSceneChildren)
  }, [sceneChildren, model, scene, setBbMap, showHelpers, addBboxes, bg_texture])

  const addOffsetsToPlatform = (platform: PlatformSlice, applyOffsetsMap = [true, true]) => {
    const pair_1_offset = getRandomNumber(4, 6)
    const negative_1 = Math.random() > 0.5

    const pair_2_offset = getRandomNumber(4, 6)
    let negative_2 = Math.random() > 0.5

    const MIN_OFFSET = 1

    while (Math.abs(pair_2_offset - pair_1_offset) < MIN_OFFSET && negative_1 === negative_2) {
      negative_2 = !negative_2
    }

    const pipes_1_offset = negative_1 ? -pair_1_offset : pair_1_offset
    const pipes_2_offset = negative_2 ? -pair_2_offset : pair_2_offset

    platform.pipe_y_targets = [
      applyOffsetsMap[0] ? base_bottom_pipe_y.current + pipes_1_offset : 0,
      applyOffsetsMap[0] ? base_top_pipe_y.current + pipes_1_offset : 0,
      applyOffsetsMap[1] ? base_bottom_pipe_y.current + pipes_2_offset : 0,
      applyOffsetsMap[1] ? base_top_pipe_y.current + pipes_2_offset : 0
    ]
  }

  const addPlatform = useCallback(
    (amount = 1): { updatedBbMap: BoundingBoxesMap; updatedSceneChildren: SceneChild[] } | null => {
      if (amount < 1) return null
      const new_platform_objects: Object3D[] = []
      const platforms = platformSlices.current

      for (let i = amount; i > 0; i--) {
        const previous_platform_i = platforms.length - 1
        const previous_platform = platforms[previous_platform_i]

        const new_terrain = previous_platform.terrain.clone()
        const new_terrain_number = Number(new_terrain.name.split('_')[2]) + 1
        const new_terrain_name = new_terrain.name.split('_')

        new_terrain_name.splice(2, 1, new_terrain_number + '')
        new_terrain.name = new_terrain_name.join('_')

        const terrain_bbox = new THREE.Box3().setFromObject(new_terrain)

        // Calculate terrain length: This is equivalent to bbox.max.x - bbox.min.x
        const terrain_length = terrain_bbox.getSize(aux_vec3_1.current)

        // The "gap" between terrains is a visual artifact, add a little offset to seal it.
        const DISTANCE_BETWEEN_TERRAINS = terrain_length.x - TERRAINS_OFFSET
        new_terrain.position.x += DISTANCE_BETWEEN_TERRAINS

        const previous_pipes = previous_platform.pipes
        let last_pipe = previous_pipes[3]
        let current_pipe_number = Number(last_pipe.name.split('_')[2]) + 1

        const new_pipes = previous_platform.pipes.map((pipe, i) => {
          const new_pipe = pipe.clone()

          const new_pipe_name = new_pipe.name.split('_')
          new_pipe_name.splice(2, 1, current_pipe_number + '')
          new_pipe.name = new_pipe_name.join('_')

          new_pipe.position.x = last_pipe.position.x
          new_pipe.position.x += DISTANCE_BETWEEN_PIPES

          if (i % 2 !== 0) {
            current_pipe_number += 1
            last_pipe = new_pipe
          }

          return new_pipe
        }) as [Object3D, Object3D, Object3D, Object3D]

        const new_platform: PlatformSlice = {
          terrain: new_terrain,
          pipes: new_pipes
        }

        platformSlices.current.push(new_platform)
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
      const distance_between_terrains = last_terrain_bbox.getSize(aux_vec3_1.current).x - TERRAINS_OFFSET

      platform.terrain.position.x = last_platform.terrain.position.x + distance_between_terrains

      let last_pipe = last_platform.pipes[3]

      for (let i = 0; i < platform.pipes.length; i++) {
        const pipe = platform.pipes[i]
        pipe.position.x = last_pipe.position.x + DISTANCE_BETWEEN_PIPES

        if (i % 2 !== 0) {
          last_pipe = pipe
        }
      }

      if (pipesState === 'playing') {
        addOffsetsToPlatform(platform)
      }

      platformSlices.current = platformSlices.current.filter((platformSlice) => platformSlice !== platform)
      platformSlices.current.push(platform)

      const platform_slice_objects = platformSlices.current
        .map((slice) => [slice.terrain, ...slice.pipes])
        .flat()

      const boundingBoxesMap = addBboxes(platform_slice_objects)
      setBbMap(boundingBoxesMap)
    },
    [addBboxes, pipesState, setBbMap]
  )

  // 2) Setup all slices
  useEffect(() => {
    if (platformSlices.current.length !== 1 || !sceneChildren.length) return

    const updatedPlatforms = addPlatform(TOTAL_PLATFORMS - 1)!
    setBbMap({ ...bbMap, ...updatedPlatforms.updatedBbMap })
    setSceneChildren([...sceneChildren, ...updatedPlatforms.updatedSceneChildren])
  }, [addPlatform, bbMap, sceneChildren, setBbMap])

  // 3) Trigger pipes opening when we start playing
  useEffect(() => {
    if (!playing || !platformSlices.current.length || pipesState !== 'idle') return

    // Find the index of the platform with the last passsed pipes, then use the one before.
    // This is because we want to see the "waterfall" effect starting in the last passed pipe
    // It's too abrupt to see it start in the pipe following the last one we passed.
    const passed_pipes_number = lastPassedPipes.split('_')[2]
    let penultimate_platform_i =
      platformSlices.current.findIndex((platform) => {
        return platform.pipes.find((pipe) => pipe.name.split('_')[2] === passed_pipes_number)
      }) - 1

    // Add a target Y to all pipes before, the following pipes will
    // receive their target in rearrangePipe.
    while (penultimate_platform_i >= 0) {
      const pipes = platformSlices.current[penultimate_platform_i].pipes
      platformSlices.current[penultimate_platform_i].pipe_y_targets = [
        pipes[0].position.y - PIPES_Y_OFFSET,
        pipes[1].position.y + PIPES_Y_OFFSET,
        pipes[2].position.y - PIPES_Y_OFFSET,
        pipes[3].position.y + PIPES_Y_OFFSET
      ]

      penultimate_platform_i--
    }

    setPipesState('opening')
  }, [lastPassedPipes, pipesState, playing, setPipesState])

  // 4) Set pipes playing offset
  useEffect(() => {
    if (
      !playing ||
      !platformSlices.current.length ||
      platformSlices.current.some((platform) => platform.pipe_y_targets) ||
      pipesState !== 'rearranging'
    ) {
      return
    }

    const passed_pipes_number = lastPassedPipes.split('_')[2]

    // Make sure to always leave a distance of 1 pipe between the player
    // and the next pipe when starting a game
    let passed_last_pipe = false

    const last_passed_platform_i = platformSlices.current.findIndex((platform) => {
      const pipe_i = platform.pipes.findIndex((pipe) => pipe.name.split('_')[2] === passed_pipes_number)
      if (pipe_i > 1) passed_last_pipe = true
      return pipe_i > -1
    })

    const next_platform_i = last_passed_platform_i + 1

    const next_first_sensor_number =
      platformSlices.current[next_platform_i].pipes[passed_last_pipe ? 2 : 0].name.split('_')[2]
    const first_score_ready_sensor = `sensor_pipes_${next_first_sensor_number}`

    for (let i = next_platform_i; i < platformSlices.current.length; i++) {
      if (i === next_platform_i && passed_last_pipe) {
        addOffsetsToPlatform(platformSlices.current[i], [false, true])
        continue
      }
      addOffsetsToPlatform(platformSlices.current[i])
    }

    setFirstScoreReadySensor({ name: first_score_ready_sensor, passed: false })
    setPipesState('playing')
  }, [lastPassedPipes, pipesState, playing, setFirstScoreReadySensor, setPipesState])

  // 5) GUI
  useEffect(() => {
    if (!gui) return

    const platformsFolder = gui.addFolder('Game Platforms')

    const platformFunctions = {
      addPlatform: () => {
        const updatedPlatforms = addPlatform()!
        setBbMap({ ...bbMap, ...updatedPlatforms.updatedBbMap })
        setSceneChildren([...sceneChildren, ...updatedPlatforms.updatedSceneChildren])
      },
      moveLastPlatformToFront: () => {
        movePlatformToFront(platformSlices.current[0])
      },
      startPlaying: () => {
        setTimeout(() => {
          setPlaying(true)
        }, 400)
      }
    }
    platformsFolder.add(platformFunctions, 'addPlatform')
    platformsFolder.add(platformFunctions, 'moveLastPlatformToFront')
    platformsFolder.add(platformFunctions, 'startPlaying')

    const guiLightFolder = gui.addFolder('Directional Light')
    guiLightFolder.add(dlightPosition, 'x').min(-80).max(80).step(0.01).name('positionX')
    guiLightFolder.add(dlightPosition, 'y').min(-80).max(80).step(0.01).name('positionY')
    guiLightFolder.add(dlightPosition, 'z').min(-80).max(80).step(0.01).name('positionZ')

    return () => {
      guiLightFolder.destroy()
      platformsFolder.destroy()
    }
  }, [dlightPosition, gui, addPlatform, movePlatformToFront, setBbMap, bbMap, sceneChildren, setPlaying])

  // 6) Restart game
  useEffect(() => {
    if (!restartingGame) return

    for (const platform of platformSlices.current) {
      platform.pipe_y_targets = [
        base_bottom_pipe_y.current,
        base_top_pipe_y.current,
        base_bottom_pipe_y.current,
        base_top_pipe_y.current
      ]
    }

    setPipesState('rearranging')
  }, [restartingGame, setPipesState])

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

  const rearrangePipe = (
    platform: PlatformSlice,
    pipe: Object3D,
    pipe_i: number,
    platform_i: number,
    pipes_y_vel: number
  ) => {
    if (!platform.pipe_y_targets?.[pipe_i]) return

    const pipe_y_target = platform.pipe_y_targets[pipe_i]
    const pipe_y = pipe.position.y
    const pipe_target_offset = 0.2

    const reached_target =
      pipe_y_target > pipe.position.y
        ? pipe.position.y >= pipe_y_target - pipe_target_offset
        : pipe.position.y <= pipe_y_target + pipe_target_offset

    if (pipe_y_target && !reached_target) {
      if (pipe_y_target > pipe_y) {
        pipe.position.y += pipes_y_vel

        // (only in opening mode) Set Y targets in the next pipes to get a "waterfall"
        // effect when the current pipe is about to reach its target.
        if (pipe_y > pipe_y_target * 0.75 && pipesState === 'opening') {
          const next_platform = platformSlices.current[platform_i + 1]

          if (platform.pipe_y_targets?.[2] === 0) {
            platform.pipe_y_targets[2] = platform.pipes[2].position.y - PIPES_Y_OFFSET
            platform.pipe_y_targets[3] = platform.pipes[3].position.y + PIPES_Y_OFFSET
          } else if (pipe_i === 3 && next_platform && !next_platform.pipe_y_targets) {
            next_platform.pipe_y_targets = [
              next_platform.pipes[0].position.y - PIPES_Y_OFFSET,
              next_platform.pipes[1].position.y + PIPES_Y_OFFSET,
              0,
              0
            ]
          }
        }
      }

      if (pipe_y_target < pipe_y) {
        pipe.position.y -= pipes_y_vel
      }
    } else if (reached_target) {
      platform.pipe_y_targets[pipe_i] = 0
    }

    if (platform.pipe_y_targets?.every((item) => item === 0)) {
      delete platform.pipe_y_targets
    }
  }

  const updatebackground = (delta: number) => {
    const generic_buildings = model.scene.children.filter((child) =>
      child.name.includes('generic_buildings_group')
    )
    const special_buildings = model.scene.children.filter((child) => child.name.includes('sp_'))
    const bg_clouds = model.scene.children.filter((child) => child.name.includes('bg_clouds'))
    const owtc_clouds = model.scene.children.filter((child) => child.name.includes('owtc_clouds'))
    const empire_state_clouds = model.scene.children.filter((child) =>
      child.name.includes('empire_state_clouds')
    )
    const central_park_clouds = model.scene.children.filter((child) =>
      child.name.includes('central_park_clouds')
    )
    const brooklyn_clouds = model.scene.children.filter((child) => child.name.includes('brooklyn_clouds'))
    const chrysler_clouds = model.scene.children.filter((child) => child.name.includes('chrysler_clouds'))
    const cloud_discs = model.scene.children.filter((child) => child.name.includes('cloud_disc'))
    const bushes = model.scene.children.find((child) => child.name === 'bushes') as THREE.Object3D

    const generic_buildings_vel = (playing ? 0.2 : 0.1) * delta
    const special_buildings_vel = (playing ? 0.3 : 0.2) * delta
    const bush_vel = (playing ? 1 : 0.5) * delta

    const BUILDINGS_LOOP_TRIGGER = LOOP_TRIGGER + 30
    const BUILDINGS_RESTART_POSITION = 15

    const BUSH_LOOP_TRIGGER = LOOP_TRIGGER - 50
    const BUSH_RESTART_POSITION = 20

    for (const building of generic_buildings) {
      building.position.x -= generic_buildings_vel

      if (building.position.x < BUILDINGS_LOOP_TRIGGER) {
        building.position.x = BUILDINGS_RESTART_POSITION
      }
    }

    for (const building of special_buildings) {
      building.position.x -= special_buildings_vel

      if (building.position.x < BUILDINGS_LOOP_TRIGGER) {
        building.position.x = BUILDINGS_RESTART_POSITION
      }
    }

    for (const cloud of bg_clouds) {
      const bg_clouds_vel = (playing ? getRandomNumber(0.5, 0.9) : getRandomNumber(0.2, 0.5)) * delta
      cloud.position.x -= bg_clouds_vel
      cloud.position.y = cloud.userData.baseY + Math.cos(clock.getElapsedTime() + cloud.userData.phase) * 0.12

      if (cloud.position.x < BUILDINGS_LOOP_TRIGGER) {
        cloud.position.x = BUILDINGS_RESTART_POSITION
      }
    }

    for (const cloud of owtc_clouds) {
      const owtc_clouds_vel = (playing ? getRandomNumber(0.3, 0.35) : getRandomNumber(0.2, 0.25)) * delta
      cloud.position.x -= owtc_clouds_vel
      cloud.position.y = cloud.userData.baseY + Math.cos(clock.getElapsedTime() + cloud.userData.phase) * 0.2

      if (cloud.position.x < BUILDINGS_LOOP_TRIGGER) {
        cloud.position.x = BUILDINGS_RESTART_POSITION
      }
    }

    for (const cloud of empire_state_clouds) {
      const empire_state_clouds_vel =
        (playing ? getRandomNumber(0.3, 0.35) : getRandomNumber(0.2, 0.25)) * delta
      cloud.position.x -= empire_state_clouds_vel
      cloud.position.y = cloud.userData.baseY + Math.cos(clock.getElapsedTime() + cloud.userData.phase) * 0.2

      if (cloud.position.x < BUILDINGS_LOOP_TRIGGER) {
        cloud.position.x = BUILDINGS_RESTART_POSITION
      }
    }

    for (const cloud of central_park_clouds) {
      const central_park_clouds_vel =
        (playing ? getRandomNumber(0.3, 0.35) : getRandomNumber(0.2, 0.25)) * delta
      cloud.position.x -= central_park_clouds_vel
      cloud.position.y = cloud.userData.baseY + Math.cos(clock.getElapsedTime() + cloud.userData.phase) * 0.2

      if (cloud.position.x < BUILDINGS_LOOP_TRIGGER) {
        cloud.position.x = BUILDINGS_RESTART_POSITION
      }
    }

    for (const cloud of brooklyn_clouds) {
      const brooklyn_clouds_vel = (playing ? getRandomNumber(0.3, 0.35) : getRandomNumber(0.2, 0.25)) * delta
      cloud.position.x -= brooklyn_clouds_vel
      cloud.position.y = cloud.userData.baseY + Math.cos(clock.getElapsedTime() + cloud.userData.phase) * 0.2

      if (cloud.position.x < BUILDINGS_LOOP_TRIGGER) {
        cloud.position.x = BUILDINGS_RESTART_POSITION
      }
    }

    for (const cloud of chrysler_clouds) {
      const chrysler_clouds_vel = (playing ? getRandomNumber(0.3, 0.35) : getRandomNumber(0.2, 0.25)) * delta
      cloud.position.x -= chrysler_clouds_vel
      cloud.position.y = cloud.userData.baseY + Math.cos(clock.getElapsedTime() + cloud.userData.phase) * 0.2

      if (cloud.position.x < BUILDINGS_LOOP_TRIGGER) {
        cloud.position.x = BUILDINGS_RESTART_POSITION
      }
    }

    for (const disc of cloud_discs) {
      disc.rotation.y += 0.002 * delta * disc.userData.phase
    }

    bushes.position.x -= bush_vel

    if (bushes.position.x < BUSH_LOOP_TRIGGER) {
      bushes.position.x = BUSH_RESTART_POSITION
    }
  }

  useFrame((_state, delta) => {
    if (directional_light_ref.current) {
      directional_light_ref.current.position.copy(dlightPosition)
    }

    if (!bbMap || gameOver) return

    const safe_delta = Math.min(delta, 0.1)

    const game_vel = (playing ? 9 : 3) * safe_delta
    const pipes_y_vel = 40 * safe_delta

    for (let i = 0; i < platformSlices.current.length; i++) {
      const platform = platformSlices.current[i]
      if (!bbMap[platform.terrain.name]) continue

      platform.terrain.position.x -= game_vel
      updateBboxes(platform.terrain)

      platform.pipes.forEach((pipe, pipe_i) => {
        pipe.position.x -= game_vel
        updateBboxes(pipe)
        rearrangePipe(platform, pipe, pipe_i, i, pipes_y_vel)
      })

      updateSensors(platform.pipes)

      if (platform.terrain.position.x < LOOP_TRIGGER) {
        movePlatformToFront(platform)
      }
    }

    if (pipesState === 'opening' && platformSlices.current.every((platform) => !platform.pipe_y_targets)) {
      setPipesState('rearranging')
    }

    if (
      pipesState === 'rearranging' &&
      restartingGame &&
      platformSlices.current.every((platform) => !platform.pipe_y_targets)
    ) {
      setPipesState('idle')
      setRestartingGame(false)
    }

    updatebackground(safe_delta)
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
