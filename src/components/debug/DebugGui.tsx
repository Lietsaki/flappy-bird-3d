import { OrbitControls } from '@react-three/drei'
import { Stats } from '@react-three/drei'
import { showHelpersAtom } from '../../store/store'
import { useAtom } from 'jotai'
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { guiAtom } from '../../store/store'

const DebugGui = () => {
  const { camera } = useThree()
  const [showHelpers] = useAtom(showHelpersAtom)
  const [gui] = useAtom(guiAtom)

  useEffect(() => {
    if (!gui) return

    const guiCameraFolder = gui.addFolder('Camera')
    const range = Math.PI

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

    // OrbitControls takes hold of the camera and do not allow to change the rotation programatically.
    // Comment the orbit controls and this will work, but it's more useful to keep it, at least that way we can
    // see the rotation values change when manipulated by the orbit controls.
    // NOTE: For rotation, use PI as the range values, since PI represents half of a rotation in a circle, however, to tweak the camera
    // We need smaller values, so I'm going with 0.5
    guiCameraFolder.add(camera.rotation, 'x').min(-range).max(range).step(0.01).name('rotationX').listen()
    guiCameraFolder.add(camera.rotation, 'y').min(-range).max(range).step(0.01).name('rotationY').listen()
    guiCameraFolder.add(camera.rotation, 'z').min(-range).max(range).step(0.01).name('rotationZ').listen()

    return () => {
      guiCameraFolder.destroy()
    }
  }, [camera, gui])

  if (!showHelpers) return null

  return (
    <>
      <Stats showPanel={0} className="stats" />
      <OrbitControls />
    </>
  )
}

export default DebugGui
