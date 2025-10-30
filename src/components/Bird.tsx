import { useGLTF, useAnimations, SpriteAnimator, useTexture } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { BirdAnimationName, SceneChild } from '../types/general_types'
import { useAtom } from 'jotai'
import {
  boundingBoxesMapAtom,
  currentSkinAtom,
  firstScoreReadySensorAtom,
  gameOverAtom,
  justUnlockedSkinAtom,
  lastPassedPipesAtom,
  lastScoresAtom,
  pipesStateAtom,
  playingAtom,
  previewingBirdAtom,
  restartingGameAtom,
  scoreAtom,
  selectingBirdAtom,
  showHelpersAtom
} from '../store/store'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { getRandomNumber } from '../helpers/helper_functions'
import bird_skins from '../db/bird_skins.json'
import { isSkinUnlocked, saveHighestScore, unlockSkin } from '../db/localStorage'

const GLIDING_ANIMATION_TOP = 18
const GLIDING_ANIMATION_BOTTOM = 17.5
const FRAME_GRAVITY = 18
const JUMP_DECIMATE_POWER = 70 // how fast we are pulled down
const JUMP_POWER = 38 // how fast we go up
const FALLING_BIRD_ROTATION_LIMIT = -1.3
const ACTIVATE_FALLING_ANIMATION_ROTATION_LIMIT = -0.7
const LAST_SCORES_LENGTH = 2
const BIRD_MAX_Y = 35

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

const BIRD_NON_RESETTABLE_ANIMATIONS: { [key: string]: boolean } = {
  bird_falling: true
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
  const [lastScores, setLastScores] = useAtom(lastScoresAtom)
  const [restartingGame] = useAtom(restartingGameAtom)

  const [selectingBird] = useAtom(selectingBirdAtom)
  const [previewingBird] = useAtom(previewingBirdAtom)
  const [currentSkin] = useAtom(currentSkinAtom)
  const [, setJustUnlockedSkin] = useAtom(justUnlockedSkinAtom)

  const bird_textures = useTexture({
    classic_bird_texture: '/textures/classic_bird_texture.png',
    dragonheart_bird_texture: '/textures/dragonheart_bird_texture.png',
    ghost_bird_texture: '/textures/ghost_bird_texture.png',
    supersonic_bird_texture: '/textures/supersonic_bird_texture.png'
  }) as { [key: string]: THREE.Texture }

  const { scene, camera } = useThree()

  const changeAction = useCallback(
    (animation_name: BirdAnimationName, play_once?: boolean, fade_duration = 0.1) => {
      const currentClip = currentAction?.getClip()

      if (currentAction && currentClip && currentClip.name === animation_name) {
        if (BIRD_NON_RESETTABLE_ANIMATIONS[currentClip.name]) return
        currentAction.reset()
        return
      }

      if (currentAction && currentClip && currentClip.name !== animation_name) {
        const animation = animations.actions[animation_name]!.reset()
        if (play_once) animation.loop = THREE.LoopOnce
        animation.timeScale = BIRD_ANIMATION_SPEEDMAP[animation_name]

        for (const action of Object.values(animations.actions)) {
          if (action && action.isRunning() && action.enabled && action.weight > 0) {
            action.fadeOut(fade_duration)
          }
        }

        setCurrentAction(animation.fadeIn(fade_duration).play())
      }
    },
    [currentAction, animations]
  )

  const wingFlap = useCallback(() => {
    if (!sceneChild || gameOver || selectingBird) return
    if (!playing) setPlaying(true)

    jump_velocity.current.y = JUMP_POWER
    sceneChild.object.rotation.z = 0.5
    changeAction('bird_flap')

    if (rotation_tween.current) rotation_tween.current.pause()
    if (just_flapped_timeout.current) clearTimeout(just_flapped_timeout.current)

    just_flapped_timeout.current = setTimeout(() => {
      just_flapped_timeout.current = null
    }, 500)
  }, [changeAction, gameOver, playing, sceneChild, selectingBird, setPlaying])

  // 1) Load model and start idle animation
  useEffect(() => {
    if (sceneChild) return

    const bird_material = bird_model.materials.bird_material as THREE.MeshStandardMaterial
    bird_material.map!.minFilter = THREE.LinearFilter

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

    return () => {
      if (tween) tween.kill()
    }
  }, [gameOver, playing])

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

  const setTexture = useCallback(
    (skin_id: string) => {
      const texture_obj = bird_skins.find((skin) => skin.id === skin_id)
      if (!texture_obj) return

      const texture_name = `${texture_obj.name.toLowerCase()}_bird_texture`
      const texture = bird_textures[texture_name]

      if (!texture || !sceneChild) return

      texture.colorSpace = THREE.SRGBColorSpace
      texture.flipY = false
      texture.needsUpdate = true
      texture.minFilter = THREE.NearestFilter
      texture.name = texture_name

      const body_mesh = sceneChild.object.children.find((child) => child.name === 'body') as THREE.Mesh
      const bird_material = body_mesh.material as THREE.MeshStandardMaterial

      bird_material.map = texture
    },
    [bird_textures, sceneChild]
  )

  // Change texture
  useEffect(() => {
    if (!previewingBird || playing) return
    setTexture(previewingBird)
  }, [bird_textures, previewingBird, currentSkin, playing, setTexture])

  const getImpactSprite = () => {
    if (!bird_body.current || !showingImpact) return null
    const { x, y } = bird_body.current.position

    // For some reason scale must be larger in prod mode to get the same result
    return (
      <SpriteAnimator
        position={[x, y, 20]}
        startFrame={0}
        scale={process.env.NODE_ENV === 'development' ? 3 : 7}
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

  const unlockBirds = (last_scores: number[]) => {
    for (const skin of bird_skins) {
      if (isSkinUnlocked(skin.id)) continue

      if (score >= skin.unlocks_at && !skin.must_get_score_consecutively) {
        unlockSkin(skin.id)
        setJustUnlockedSkin(skin.id)
        return
      }

      if (
        skin.must_get_score_consecutively &&
        last_scores[last_scores.length - 1] === skin.unlocks_at &&
        last_scores[last_scores.length - 2] === skin.unlocks_at
      ) {
        unlockSkin(skin.id)
        setJustUnlockedSkin(skin.id)
        return
      }
    }
  }

  useFrame((_state, delta) => {
    if (!sceneChild || !bird_body.current) return
    const safe_delta = Math.min(delta, 0.1)

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
        if (type === 'collision' && playing && (pipesState === 'playing' || name.includes('floor'))) {
          setPlaying(false)
          setGameOver(true)
          setShowingImpact(true)
          changeAction('bird_hurt_1', false, 0.2)
          setupCameraRotation()
          saveHighestScore(score)

          const last_scores = [...lastScores, score]
          if (last_scores.length > LAST_SCORES_LENGTH) last_scores.shift()
          setLastScores(last_scores)
          unlockBirds(last_scores)
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
      bird_body.current.position.y -= FRAME_GRAVITY * safe_delta

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
        jump_velocity.current.y -= JUMP_DECIMATE_POWER * safe_delta
      } else {
        jump_velocity.current.y = 0
      }

      // 5) Apply jump velocity
      if (bird_body.current.position.y > BIRD_MAX_Y) return
      bird_body.current.position.y += jump_velocity.current.y * safe_delta
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
