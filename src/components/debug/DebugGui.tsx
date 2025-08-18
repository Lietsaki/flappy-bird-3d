// import { OrbitControls } from '@react-three/drei'
import { Stats } from '@react-three/drei'
import { showHelpersAtom } from '../../store/store'
import { useAtom } from 'jotai'
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { guiAtom } from '../../store/store'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

const DebugGui = () => {
  const { camera } = useThree()
  const [showHelpers] = useAtom(showHelpersAtom)
  const [gui] = useAtom(guiAtom)
  const controlsRef = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    if (!gui) return

    // ===================================== CAMERA POSITION ===================================== //

    const guiCameraFolder = gui.addFolder('Camera')
    guiCameraFolder.add(camera.position, 'x').min(-60).max(60).step(0.01).name('positionX').listen()
    guiCameraFolder.add(camera.position, 'y').min(-60).max(60).step(0.01).name('positionY').listen()
    guiCameraFolder.add(camera.position, 'z').min(-60).max(60).step(0.01).name('positionZ').listen()
    guiCameraFolder
      .add(camera, 'zoom')
      .min(-60)
      .max(60)
      .step(0.01)
      .name('zoom')
      .listen()
      .onChange(() => {
        camera.updateProjectionMatrix()
      })

    // ===================================== CAMERA ROTATION ===================================== //

    // OrbitControls takes hold of the camera and does not allow to change the rotation programatically.
    // Comment the orbit controls and this will work, but it's more useful to keep 'em, at least that way we can
    // see the rotation values change when manipulated by the orbit controls.
    // NOTE: For rotation, use PI as the range values, since PI represents half of a rotation in a circle, however, to tweak the camera
    // We need smaller values, so I'm going with 0.5
    const range = Math.PI
    guiCameraFolder.add(camera.rotation, 'x').min(-range).max(range).step(0.01).name('rotationX').listen()
    guiCameraFolder.add(camera.rotation, 'y').min(-range).max(range).step(0.01).name('rotationY').listen()
    guiCameraFolder.add(camera.rotation, 'z').min(-range).max(range).step(0.01).name('rotationZ').listen()

    // ===================================== CONTROLS TARGET ===================================== //

    const controlsTargetFolder = controlsRef.current ? gui.addFolder('Controls Target') : null

    if (controlsTargetFolder && controlsRef.current) {
      controlsTargetFolder
        .add(controlsRef.current.target, 'x')
        .min(-60)
        .max(60)
        .step(0.01)
        .name('controlsTargetX')
        .listen()

      controlsTargetFolder
        .add(controlsRef.current.target, 'y')
        .min(-60)
        .max(60)
        .step(0.01)
        .name('controlsTargetY')
        .listen()

      controlsTargetFolder
        .add(controlsRef.current.target, 'z')
        .min(-60)
        .max(60)
        .step(0.01)
        .name('controlsTargetZ')
        .listen()
    }

    return () => {
      guiCameraFolder.destroy()
      controlsTargetFolder?.destroy()
    }
  }, [camera, gui])

  if (!showHelpers) return null

  return (
    <>
      <Stats showPanel={0} className="stats" />
      {/* <OrbitControls ref={controlsRef} /> */}
    </>
  )
}

export default DebugGui
