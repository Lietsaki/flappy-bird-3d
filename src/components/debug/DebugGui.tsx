import { OrbitControls } from '@react-three/drei'
import { Stats } from '@react-three/drei'
import { showHelpersAtom } from '../../store/store'
import { useAtom } from 'jotai'

const DebugGui = () => {
  const [showHelpers] = useAtom(showHelpersAtom)

  if (!showHelpers) return null

  return (
    <>
      <Stats showPanel={0} className="stats" />
      <OrbitControls />
    </>
  )
}

export default DebugGui
