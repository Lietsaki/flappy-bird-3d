import { atom } from 'jotai'
import * as dat from 'lil-gui'
import type { BoundingBoxesMap } from '../types/general_types'

const SHOW_HELPERS = true
const showHelpersAtom = atom(SHOW_HELPERS)

const guiAtom = atom(SHOW_HELPERS ? new dat.GUI({ closeFolders: false }) : null)
const boundingBoxesMapAtom = atom<BoundingBoxesMap | null>(null)

export { showHelpersAtom, guiAtom, boundingBoxesMapAtom }
