import { atom } from 'jotai'
import * as dat from 'lil-gui'
import type { BoundingBoxesMap, PipesState, ScoreReadySensor } from '../types/general_types'

const SHOW_HELPERS = true
const showHelpersAtom = atom(SHOW_HELPERS)

const guiAtom = atom(SHOW_HELPERS ? new dat.GUI({ closeFolders: false }) : null)
const boundingBoxesMapAtom = atom<BoundingBoxesMap | null>(null)

const lastPassedPipesAtom = atom<string>('sensor_pipes_3')

const playingAtom = atom(false)
const pipesStateAtom = atom<PipesState>('idle')
const firstScoreReadySensorAtom = atom<ScoreReadySensor>({ name: '', passed: false })
const gameOverAtom = atom(false)
const restartingGameAtom = atom(false)

const scoreAtom = atom(0)

export {
  showHelpersAtom,
  guiAtom,
  boundingBoxesMapAtom,
  playingAtom,
  gameOverAtom,
  scoreAtom,
  lastPassedPipesAtom,
  pipesStateAtom,
  firstScoreReadySensorAtom,
  restartingGameAtom
}
