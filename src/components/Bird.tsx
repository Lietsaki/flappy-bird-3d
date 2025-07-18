import { useGLTF, useAnimations } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { SceneChild } from '../types/general_types'
import { useAtom } from 'jotai'
import { playingAtom, showHelpersAtom } from '../store/store'
import { useFrame, useThree } from '@react-three/fiber'

const Bird = () => {
  const bird_model = useGLTF('/models/bird.glb')
  const animations = useAnimations(bird_model.animations, bird_model.scene)

  const [currentAction, setCurrentAction] = useState<THREE.AnimationAction>()
  const [sceneChild, setSceneChild] = useState<SceneChild>()

  const bird_body = useRef<THREE.Object3D | null>(null)
  const bird_helper = useRef<THREE.Box3Helper | null>(null)
  const collision_bbox = useRef(new THREE.Box3())

  const [showHelpers] = useAtom(showHelpersAtom)
  const [playing] = useAtom(playingAtom)

  const { scene } = useThree()

  useEffect(() => {
    if (sceneChild) return

    const bird_rig = bird_model.scene.children.find((child) => child.name === 'bird_rig')!
    bird_body.current = bird_rig

    const INITIAL_POSITION = new THREE.Vector3(-30, 18, 13)
    bird_rig.position.copy(INITIAL_POSITION)

    // NOTE: When rigs are added to a primitive, they're "taken" out of their original model.
    // So, if you log bird_model.scene.children you'll see that bird_rig is missing.
    setSceneChild({
      object: bird_rig,
      element: <primitive object={bird_rig} key={bird_rig.id} />
    })

    setCurrentAction(animations.actions.bird_idle!.play())

    collision_bbox.current.setFromObject(bird_body.current)

    if (showHelpers) {
      bird_helper.current = new THREE.Box3Helper(collision_bbox.current, 0xff0000)
      scene.add(bird_helper.current)
    }
  }, [bird_model, sceneChild, animations, showHelpers, scene])

  useFrame(() => {
    if (!sceneChild) return
  })

  if (!sceneChild) return null

  return sceneChild.element
}

export default Bird
