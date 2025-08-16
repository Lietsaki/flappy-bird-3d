import bird_skins from '../../public/character_data/bird_skins.json'

const HIGHEST_SCORE = 'highest_score'
const UNLOCKED_SKINS = 'skins'
const LAST_SELECTED_SKIN = 'last_selected_skin'

const getHighestScore = () => {
  try {
    const score = Number(localStorage.getItem(HIGHEST_SCORE))
    if (typeof score === 'number' && !Number.isNaN(score)) return score
    return 0
  } catch (error) {
    console.error(error)
    console.warn('Could not fetch highest score')
    return 0
  }
}

const saveHighestScore = (score: number) => {
  try {
    const highest = getHighestScore()

    if (highest && highest >= score) return

    localStorage.setItem(HIGHEST_SCORE, score.toString())
  } catch (error) {
    console.error(error)
    console.warn('Could not save score')
  }
}

const isSkinUnlocked = (skin_id: string) => {
  if (skin_id === bird_skins[0].id) return true

  try {
    const unlocked_skins = localStorage.getItem(UNLOCKED_SKINS)
    if (!unlocked_skins) return false

    return unlocked_skins.split(',').includes(skin_id)
  } catch (error) {
    console.error(error)
    console.warn('Could not check unlocked skins')
    return false
  }
}

const unlockSkin = (unlocked_skin_id: string) => {
  try {
    const unlocked_skins = localStorage.getItem(UNLOCKED_SKINS)
    const unlocked_skins_arr = unlocked_skins?.split(',') || []

    unlocked_skins_arr.push(unlocked_skin_id)

    localStorage.setItem(UNLOCKED_SKINS, unlocked_skins_arr.toString())
  } catch (error) {
    console.error(error)
    console.warn('Could not save skin unlock')
  }
}

const getLastSelectedSkin = () => {
  try {
    const current_skin = localStorage.getItem(LAST_SELECTED_SKIN)
    if (!current_skin) return bird_skins[0].id

    const skin_data = bird_skins.find((skin) => skin.id === current_skin)

    if (!skin_data || !isSkinUnlocked(skin_data.id)) {
      localStorage.setItem(UNLOCKED_SKINS, [].toString())
      return bird_skins[0].id
    }

    return current_skin
  } catch (error) {
    console.error(error)
    console.warn('Could not get current skin')
    return bird_skins[0].id
  }
}

const saveLastSelectedSkin = (skin_id: string) => {
  try {
    const skin_data = bird_skins.find((skin) => skin.id === skin_id)

    if (!skin_data || !isSkinUnlocked(skin_data.id)) {
      localStorage.setItem(UNLOCKED_SKINS, [].toString())
      return
    }

    localStorage.setItem(LAST_SELECTED_SKIN, skin_id)
  } catch (error) {
    console.error(error)
    console.warn('Could not save current skin')
  }
}

export {
  getHighestScore,
  saveHighestScore,
  isSkinUnlocked,
  unlockSkin,
  getLastSelectedSkin,
  saveLastSelectedSkin
}
