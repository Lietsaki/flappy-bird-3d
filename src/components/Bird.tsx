import { useGLTF, useAnimations, SpriteAnimator } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { BirdAnimationName, SceneChild } from '../types/general_types'
import { useAtom } from 'jotai'
import {
  boundingBoxesMapAtom,
  firstScoreReadySensorAtom,
  gameOverAtom,
  lastPassedPipesAtom,
  pipesStateAtom,
  playingAtom,
  restartingGameAtom,
  scoreAtom,
  showHelpersAtom
} from '../store/store'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { getRandomNumber } from '../helpers/helper_functions'

const GLIDING_ANIMATION_TOP = 18
const GLIDING_ANIMATION_BOTTOM = 17.5
const FRAME_GRAVITY = 8
const JUMP_DECIMATE_POWER = 50 // how fast we are pulled down
const JUMP_POWER = 28 // how fast we go up
const FALLING_BIRD_ROTATION_LIMIT = -1.3
const ACTIVATE_FALLING_ANIMATION_ROTATION_LIMIT = -0.7

const GAME_OVER_CAMERA_ROTATIONS = {
  X: {
    min: -0.08,
    max: 0.09
  },
  Y: {
    min: -0.2,
    max: 0.2
  }
}

const INITIAL_POSITION = new THREE.Vector3(-30, GLIDING_ANIMATION_BOTTOM, 13.5)

const BIRD_ANIMATION_SPEEDMAP: { [key: string]: number } = {
  bird_flap: 1,
  bird_hurt_1: 1,
  bird_falling: 1,
  bird_idle: 1.5
}

const Bird = () => {
  const bird_model = useGLTF('/models/bird.glb')
  const animations = useAnimations(bird_model.animations, bird_model.scene)

  const [currentAction, setCurrentAction] = useState<THREE.AnimationAction>()
  const [sceneChild, setSceneChild] = useState<SceneChild>()
  const [showingImpact, setShowingImpact] = useState(false)

  const bird_body = useRef<THREE.Object3D | null>(null)
  const bird_helper = useRef<THREE.Box3Helper | null>(null)
  const collision_bbox = useRef(new THREE.Box3())
  const jump_velocity = useRef(new THREE.Vector3())
  const just_flapped_timeout = useRef<NodeJS.Timeout | null>(null)
  const rotation_tween = useRef<gsap.core.Tween | null>(null)
  const camera_target_rotation = useRef<{ x: number; y: number } | null>(null)

  const [showHelpers] = useAtom(showHelpersAtom)
  const [bbMap] = useAtom(boundingBoxesMapAtom)

  const [pipesState] = useAtom(pipesStateAtom)
  const [firstScoreReadySensor, setFirstScoreReadySensor] = useAtom(firstScoreReadySensorAtom)
  const [lastPassedPipes, setLastPassedPipes] = useAtom(lastPassedPipesAtom)
  const [playing, setPlaying] = useAtom(playingAtom)
  const [gameOver, setGameOver] = useAtom(gameOverAtom)
  const [score, setScore] = useAtom(scoreAtom)
  const [restartingGame] = useAtom(restartingGameAtom)

  const { scene, camera } = useThree()

  const changeAction = useCallback(
    (animation_name: BirdAnimationName, play_once?: boolean, fadeDuration = 0.1) => {
      const currentClip = currentAction?.getClip()

      if (currentAction && currentClip && currentClip.name === animation_name) {
        currentAction.time = 0
        return
      }

      if (currentAction && currentClip && currentClip.name !== animation_name) {
        currentAction.fadeOut(fadeDuration)

        const animation = animations.actions[animation_name]!.reset().fadeIn(fadeDuration)
        if (play_once) animation.loop = THREE.LoopOnce
        animation.timeScale = BIRD_ANIMATION_SPEEDMAP[animation_name]

        setCurrentAction(animation.play())
      }
    },
    [currentAction, animations]
  )
  const wingFlap = useCallback(() => {
    if (!sceneChild || gameOver) return
    if (!playing) setPlaying(true)

    jump_velocity.current.y = JUMP_POWER
    sceneChild.object.rotation.z = 0.5
    changeAction('bird_flap')

    if (rotation_tween.current) rotation_tween.current.pause()
    if (just_flapped_timeout.current) clearTimeout(just_flapped_timeout.current)

    just_flapped_timeout.current = setTimeout(() => {
      just_flapped_timeout.current = null
    }, 500)
  }, [changeAction, gameOver, playing, sceneChild, setPlaying])

  // 1) Load model and start idle animation
  useEffect(() => {
    if (sceneChild) return

    const bird_rig = bird_model.scene.children.find((child) => child.name === 'bird_rig')!
    const bird_bbox = bird_model.scene.children.find((child) => child.name === 'bird_bbox')!

    bird_body.current = bird_bbox

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

    const handleMousedown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName !== 'CANVAS') return
      wingFlap()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMousedown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMousedown)
    }
  }, [wingFlap])

  // 3) Setup gliding animation when not playing
  useEffect(() => {
    if (!bird_body.current || gameOver) return
    let tween: gsap.core.Tween

    if (!playing) {
      tween = gsap.to(bird_body.current.position, {
        y: GLIDING_ANIMATION_TOP,
        duration: 0.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      })
    }

    if (playing && currentAction?.getClip().name === 'bird_idle') {
      changeAction('bird_flap')
    }

    return () => {
      if (tween) tween.kill()
    }
  }, [changeAction, currentAction, gameOver, playing])

  // 4) Restart game logic
  useEffect(() => {
    if (!bird_body.current || !sceneChild || !restartingGame || playing) return

    bird_body.current.position.copy(INITIAL_POSITION)
    sceneChild.object.rotation.set(0, 0, 0, 'XYZ')
    changeAction('bird_idle')

    camera_target_rotation.current = { x: 0, y: 0 }

    setGameOver(false)
    setScore(0)
  }, [restartingGame, changeAction, sceneChild, setGameOver, setScore, playing])

  const getImpactSprite = () => {
    if (!bird_body.current || !showingImpact) return null
    const { x, y } = bird_body.current.position

    return (
      <SpriteAnimator
        position={[x, y, 20]}
        startFrame={0}
        scale={3}
        asSprite={true}
        fps={30}
        textureImageURL={'/sprites/impact.png'}
        textureDataURL={'/sprites/impact.json'}
        onEnd={() => setShowingImpact(false)}
      />
    )
  }

  const setupCameraRotation = () => {
    const { X, Y } = GAME_OVER_CAMERA_ROTATIONS
    camera_target_rotation.current = { x: getRandomNumber(X.min, X.max), y: getRandomNumber(Y.min, Y.max) }
  }

  useFrame((_state, delta) => {
    if (!sceneChild || !bird_body.current) return
    const safeDelta = Math.min(delta, 0.01)

    sceneChild.object.position.copy(bird_body.current.position)
    const updated_bird_bbox = collision_bbox.current.setFromObject(bird_body.current)

    if (camera_target_rotation.current) {
      const { x, y } = camera_target_rotation.current
      camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, x, 0.05)
      camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, y, 0.05)
    }

    // 1) Check for collisions
    for (const bb_key in bbMap) {
      const { type, bbox, name } = bbMap[bb_key]

      const intersection = updated_bird_bbox.intersectsBox(bbox)

      if (intersection) {
        if (type === 'collision' && playing && pipesState === 'playing') {
          setPlaying(false)
          setGameOver(true)
          setShowingImpact(true)
          changeAction('bird_hurt_1', false, 0.001)
          setupCameraRotation()
        } else if (type === 'sensor') {
          setLastPassedPipes(name)

          if (
            playing &&
            pipesState === 'playing' &&
            (firstScoreReadySensor.passed || firstScoreReadySensor.name === name)
          ) {
            if (firstScoreReadySensor.name === name && !firstScoreReadySensor.passed) {
              setFirstScoreReadySensor({ ...firstScoreReadySensor, passed: true })
            }

            // Add only 1 point per passed pipe
            // (otherwise we'd add points as long as we're in a sensor)
            if (name !== lastPassedPipes) {
              setScore(score + 1)
            }
          }
        }
      }
    }

    if (playing) {
      // 2) Apply gravity to the bird
      bird_body.current.position.y -= FRAME_GRAVITY * safeDelta

      // 3) Rotate the bird forward as it falls. Also, animate it after a certain threshold
      if (sceneChild.object.rotation.z > FALLING_BIRD_ROTATION_LIMIT && !just_flapped_timeout.current) {
        if (sceneChild.object.rotation.z < ACTIVATE_FALLING_ANIMATION_ROTATION_LIMIT) {
          changeAction('bird_falling')
        }

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

  return (
    <>
      {sceneChild.element}
      {getImpactSprite()}
    </>
  )
}

export default Bird
