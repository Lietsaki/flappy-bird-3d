import { atom } from 'jotai'
import * as dat from 'lil-gui'

const SHOW_HELPERS = true
const showHelpersAtom = atom(SHOW_HELPERS)

const guiAtom = atom(SHOW_HELPERS ? new dat.GUI({ closeFolders: false }) : null)

export { showHelpersAtom, guiAtom }
