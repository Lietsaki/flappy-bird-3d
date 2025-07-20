import { useGLTF, useAnimations } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { SceneChild } from '../types/general_types'
import { useAtom } from 'jotai'
import {
  boundingBoxesMapAtom,
  gameJustEndedAtom,
  playingAtom,
  scoreAtom,
  showHelpersAtom
} from '../store/store'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'

const GLIDING_ANIMATION_TOP = 18
const GLIDING_ANIMATION_BOTTOM = 17.5
const FRAME_GRAVITY = 8
const JUMP_DECIMATE_POWER = 50 // how fast we are pulled down
const JUMP_POWER = 28 // how fast we go up
const FALLING_BIRD_ROTATION_LIMIT = -1.6

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
  const jump_velocity = useRef(new THREE.Vector3())
  const just_flapped_timeout = useRef<NodeJS.Timeout | null>(null)
  const rotation_tween = useRef<gsap.core.Tween | null>(null)

  const [showHelpers] = useAtom(showHelpersAtom)
  const [bbMap] = useAtom(boundingBoxesMapAtom)

  const [playing, setPlaying] = useAtom(playingAtom)
  const [gameJustEnded, setGameJustEnded] = useAtom(gameJustEndedAtom)
  const [score, setScore] = useAtom(scoreAtom)

  const { scene } = useThree()

  const wingFlap = useCallback(() => {
    if (!playing || !sceneChild) return

    jump_velocity.current.y = JUMP_POWER
    sceneChild.object.rotation.z = 0.5

    if (rotation_tween.current) rotation_tween.current.pause()
    if (just_flapped_timeout.current) clearTimeout(just_flapped_timeout.current)

    just_flapped_timeout.current = setTimeout(() => {
      just_flapped_timeout.current = null
    }, 500)
  }, [playing, sceneChild])

  // 1) Load model and start idle animation
  useEffect(() => {
    if (sceneChild) return

    const bird_rig = bird_model.scene.children.find((child) => child.name === 'bird_rig')!
    const bird_bbox = bird_model.scene.children.find((child) => child.name === 'bird_bbox')!

    bird_body.current = bird_bbox

    const INITIAL_POSITION = new THREE.Vector3(-30, GLIDING_ANIMATION_BOTTOM, 13.5)
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

  // 2) Keyboard and Mouse event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code.toLowerCase() === 'space') wingFlap()
    }

    const handleMousedown = () => {
      wingFlap()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMousedown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMousedown)
    }
  }, [playing, sceneChild, wingFlap])

  useEffect(() => {
    if (!bird_body.current) return
    let tween: gsap.core.Tween

    if (!playing && !gameJustEnded) {
      tween = gsap.to(bird_body.current.position, {
        y: GLIDING_ANIMATION_TOP,
        duration: 0.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      })
    }

    return () => {
      if (tween) tween.kill()
    }
  }, [gameJustEnded, playing])

  useFrame((_state, delta) => {
    if (!sceneChild || !bird_body.current) return
    const safeDelta = Math.min(delta, 0.01)

    sceneChild.object.position.copy(bird_body.current.position)
    const updated_bird_bbox = collision_bbox.current.setFromObject(bird_body.current)

    if (playing) {
      // 1) Apply gravity to the bird
      bird_body.current.position.y -= FRAME_GRAVITY * safeDelta

      // 2) Rotate the bird forward as it falls
      if (sceneChild.object.rotation.z > FALLING_BIRD_ROTATION_LIMIT && !just_flapped_timeout.current) {
        if (!rotation_tween.current) {
          rotation_tween.current = gsap.to(sceneChild.object.rotation, {
            z: FALLING_BIRD_ROTATION_LIMIT,
            duration: 0.5,
            ease: 'sine.in',
            yoyo: true,
            repeat: 0
          })
        } else if (!rotation_tween.current.isActive()) {
          rotation_tween.current.invalidate().restart()
        }
      }

      // 3) Check for collisions
      for (const bb_key in bbMap) {
        const { type, bbox, name } = bbMap[bb_key]

        const intersection = updated_bird_bbox.intersectsBox(bbox)

        if (intersection) {
          if (type === 'collision') {
            setPlaying(false)
            setGameJustEnded(true)
          } else if (type === 'sensor') {
            setScore(score + 1)
          }
        }
      }

      // 4) Decimate jump power with gravity
      if (jump_velocity.current.y > 0) {
        jump_velocity.current.y -= JUMP_DECIMATE_POWER * safeDelta
      } else {
        jump_velocity.current.y = 0
      }

      // 5) Apply jump velocity
      bird_body.current.position.y += jump_velocity.current.y * safeDelta
    }
  })

  if (!sceneChild) return null

  return sceneChild.element
}

export default Bird
