import bird_skins from '../../public/character_data/bird_skins.json'

const HIGHEST_SCORE = 'highest_score'
const UNLOCKED_SKINS = 'skins'

const getHighestScore = () => {
  try {
    const score = Number(localStorage.getItem(HIGHEST_SCORE))
    if (typeof score === 'number' && !Number.isNaN(score)) return score
  } catch (error) {
    console.error(error)
    console.warn('Could fetch highest score')
    return 0
  }
}

const saveHighestScore = (score: number) => {
  try {
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

export { getHighestScore, saveHighestScore, isSkinUnlocked, unlockSkin }
