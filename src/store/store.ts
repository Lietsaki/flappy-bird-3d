import { atom } from 'jotai'
import * as dat from 'lil-gui'
import type { BoundingBoxesMap, PipesState, ScoreReadySensor } from '../types/general_types'
import bird_skins from '../../public/character_data/bird_skins.json'

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

const selectingBirdAtom = atom(false)
const previewingBirdAtom = atom(bird_skins[0].id)
const currentSkinAtom = atom(bird_skins[0].id)

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
  restartingGameAtom,
  selectingBirdAtom,
  previewingBirdAtom,
  currentSkinAtom
}
