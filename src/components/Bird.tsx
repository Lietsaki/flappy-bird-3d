import { useGLTF, useAnimations } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { SceneChild } from '../types/general_types'
import { useAtom } from 'jotai'
import { playingAtom, showHelpersAtom } from '../store/store'
import { useFrame, useThree } from '@react-three/fiber'

const GLIDING_ANIMATION_TOP = 18
const GLIDING_ANIMATION_BOTTOM = 17.5

const BIRD_ANIMATION_SPEEDMAP: { [key: string]: number } = {
  bird_flap: 1,
  bird_hurt_1: 1,
  bird_blink: 1,
  bird_idle: 1.5
}

const Bird = () => {
  const bird_model = useGLTF('/models/bird.glb')
  const animations = useAnimations(bird_model.animations, bird_model.scene)

  const [currentAction, setCurrentAction] = useState<THREE.AnimationAction>()
  const [sceneChild, setSceneChild] = useState<SceneChild>()

  const bird_body = useRef<THREE.Object3D | null>(null)
  const bird_helper = useRef<THREE.Box3Helper | null>(null)
  const collision_bbox = useRef(new THREE.Box3())
  const gliding_up = useRef(true)

  const [showHelpers] = useAtom(showHelpersAtom)
  const [playing] = useAtom(playingAtom)

  const { scene } = useThree()

  useEffect(() => {
    if (sceneChild) return

    const bird_rig = bird_model.scene.children.find((child) => child.name === 'bird_rig')!
    const bird_bbox = bird_model.scene.children.find((child) => child.name === 'bird_bbox')!

    bird_body.current = bird_bbox

    const INITIAL_POSITION = new THREE.Vector3(-30, 18, 13)
    bird_body.current.position.copy(INITIAL_POSITION)

    // NOTE: When rigs are added to a primitive, they're "taken" out of their original model.
    // So, if you log bird_model.scene.children you'll see that bird_rig is missing.
    setSceneChild({
      object: bird_rig,
      element: <primitive object={bird_rig} key={bird_rig.id} />
    })

    const idle_action = animations.actions.bird_idle!.play()
    idle_action.timeScale = BIRD_ANIMATION_SPEEDMAP.bird_idle
    setCurrentAction(idle_action)

    collision_bbox.current.setFromObject(bird_body.current)

    if (showHelpers) {
      bird_helper.current = new THREE.Box3Helper(collision_bbox.current, 0xff0000)
      scene.add(bird_helper.current)
    }
  }, [bird_model, sceneChild, animations, showHelpers, scene])

  useFrame((_state, delta) => {
    if (!sceneChild || !bird_body.current) return
    sceneChild.object.position.copy(bird_body.current.position)
    collision_bbox.current.setFromObject(bird_body.current)

    const safeDelta = Math.min(delta, 0.01)

    if (!playing) {
      const gliding_vel = 0.6

      if (gliding_up.current) {
        bird_body.current.position.y += gliding_vel * safeDelta

        if (bird_body.current.position.y >= GLIDING_ANIMATION_TOP) {
          gliding_up.current = false
        }
      } else {
        bird_body.current.position.y -= gliding_vel * safeDelta

        if (bird_body.current.position.y <= GLIDING_ANIMATION_BOTTOM) {
          gliding_up.current = true
        }
      }
    }
  })

  if (!sceneChild) return null

  return sceneChild.element
}

export default Bird
