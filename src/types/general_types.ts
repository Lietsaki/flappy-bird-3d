import { Box3, Object3D } from 'three'

export interface SceneChild {
  element: React.JSX.Element
  object: Object3D
}

export interface PlatformSlice {
  terrain: Object3D
  pipes: [Object3D, Object3D, Object3D, Object3D]
  pipe_y_targets?: [number, number, number, number]
}

export type BoundingBoxType = 'collision' | 'sensor'

export type BoundingBoxObj = { name: string; bbox: Box3; type: BoundingBoxType }

export interface BoundingBoxesMap {
  [key: string]: BoundingBoxObj
}

export type BirdAnimationName = 'bird_flap' | 'bird_hurt_1' | 'bird_falling' | 'bird_idle'

export type PipesState = 'idle' | 'rearranging' | 'playing'
