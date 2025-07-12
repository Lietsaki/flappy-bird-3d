import { Box3, Object3D } from 'three'

export interface SceneChild {
  element: React.JSX.Element
  object: Object3D
}

export interface PlatformSlice {
  terrain: Object3D
  pipes: [Object3D, Object3D, Object3D, Object3D]
}

export type BoundingBoxType = 'collision' | 'sensor'

export type BoundingBoxObj = { name: string; bbox: Box3; type: BoundingBoxType }

export interface BoundingBoxesMap {
  [key: string]: BoundingBoxObj
}
