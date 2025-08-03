import { atom } from 'jotai'
import * as dat from 'lil-gui'
import type { BoundingBoxesMap, PipesState } from '../types/general_types'

const SHOW_HELPERS = true
const showHelpersAtom = atom(SHOW_HELPERS)

const guiAtom = atom(SHOW_HELPERS ? new dat.GUI({ closeFolders: false }) : null)
const boundingBoxesMapAtom = atom<BoundingBoxesMap | null>(null)

const lastPassedPipesAtom = atom<string>('sensor_pipes_3')

const playingAtom = atom(false)
const pipesStateAtom = atom<PipesState>('idle')
const gameJustEndedAtom = atom(false)

const scoreAtom = atom(0)

export {
  showHelpersAtom,
  guiAtom,
  boundingBoxesMapAtom,
  playingAtom,
  gameJustEndedAtom,
  scoreAtom,
  lastPassedPipesAtom,
  pipesStateAtom
}
