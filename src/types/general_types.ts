import { Object3D } from 'three'

export interface SceneChild {
  element: React.JSX.Element
  object: Object3D
}

export interface PlatformSlice {
  terrain: Object3D
  pipes: [Object3D, Object3D, Object3D, Object3D]
}
