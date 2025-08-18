import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'

import InteractUI from './components/UI/InteractUI'
import NewYork from './components/NewYork'
import Bird from './components/Bird'
import DebugGui from './components/debug/DebugGui'
import { useEffect, useRef, useState } from 'react'
import { useAtom } from 'jotai'
import { boundingBoxesMapAtom, selectingBirdAtom } from './store/store'
import { wait } from './helpers/helper_functions'

const BASE_CAMERA_POSITION: THREE.Vector3Tuple = [-25, 13.8, 0]

const CameraManagement = () => {
  const [zoom, setZoom] = useState(26.5)
  const [selectingBird] = useAtom(selectingBirdAtom)

  const camera_target_x = useRef<number | null>(null)

  const { size, camera } = useThree()

  useEffect(() => {
    const base_ratio = { h: 1100, z: 26.5 }

    setZoom(base_ratio.z * (size.height / base_ratio.h))

    if (size.width < 600) {
      if (selectingBird) {
        camera_target_x.current = size.width < 400 ? -23.5 : -24
        return
      }

      camera_target_x.current = -28
    }
  }, [selectingBird, size])

  useFrame(() => {
    if (camera_target_x.current) {
      const offset = 0.2
      const x_target = camera_target_x.current

      const reached_target =
        x_target > camera.position.x
          ? camera.position.x >= x_target - offset
          : camera.position.x <= x_target + offset

      if (reached_target) {
        camera_target_x.current = null
        return
      }

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, camera_target_x.current, 0.05)
    }
  })

  return (
    <OrthographicCamera
      makeDefault
      near={-100}
      far={200}
      zoom={zoom}
      position={BASE_CAMERA_POSITION}
    ></OrthographicCamera>
  )
}

const App = () => {
  const [bbMap] = useAtom(boundingBoxesMapAtom)
  const dot1_ref = useRef<HTMLSpanElement>(null)
  const dot2_ref = useRef<HTMLSpanElement>(null)
  const dot3_ref = useRef<HTMLSpanElement>(null)
  const [loadingScreenDone, setLoadingScreenDone] = useState(false)

  useEffect(() => {
    const animate_dot = 'animate_dot'

    const startDotsAnimation = async () => {
      dot1_ref.current?.classList.add(animate_dot)
      await wait(200)
      dot2_ref.current?.classList.add(animate_dot)
      await wait(200)
      dot3_ref.current?.classList.add(animate_dot)
    }

    const endDotsAnimation = async () => {
      dot1_ref.current?.classList.remove(animate_dot)
      dot2_ref.current?.classList.remove(animate_dot)
      dot3_ref.current?.classList.remove(animate_dot)

      await wait(300)
      setLoadingScreenDone(true)
    }

    if (!bbMap) {
      startDotsAnimation()
    } else {
      endDotsAnimation()
    }
  }, [bbMap])

  const getLoadingScreen = () => {
    if (loadingScreenDone) return null

    return (
      <div className={`loading_screen ${bbMap ? 'exit' : ''}`}>
        <div>
          Loading
          <span ref={dot1_ref}>.</span>
          <span ref={dot2_ref}>.</span>
          <span ref={dot3_ref}>.</span>
        </div>
      </div>
    )
  }

  return (
    <>
      {getLoadingScreen()}
      <Canvas gl={{ toneMapping: THREE.LinearToneMapping, antialias: true }}>
        <CameraManagement />
        <DebugGui />
        <NewYork />
        <Bird />
      </Canvas>

      <InteractUI />
    </>
  )
}

export default App
