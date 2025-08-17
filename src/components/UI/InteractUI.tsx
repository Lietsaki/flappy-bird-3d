import styles from 'styles/components/InteractUI.module.scss'
import Button from './Button'
import {
  currentSkinAtom,
  gameOverAtom,
  justUnlockedSkinAtom,
  playingAtom,
  previewingBirdAtom,
  restartingGameAtom,
  scoreAtom,
  selectingBirdAtom
} from '../../store/store'
import { useAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { wait } from '../../helpers/helper_functions'
import bird_skins from '../../db/bird_skins.json'
import {
  getLastSelectedSkin,
  getHighestScore,
  isSkinUnlocked,
  saveLastSelectedSkin
} from '../../db/localStorage'

const {
  interact_ui,
  right_area,
  game_title_area,
  start_message,
  main_menu,
  game_title,
  exiting_start_message,
  exiting_right_area,
  central_area,
  score_text,
  game_over_text,
  exit,
  game_over_modal_area,
  game_over_modal_container,
  game_over_modal_bg,

  game_over_modal,
  game_over_modal_text,
  game_over_modal_number,
  game_over_buttons,

  bird_selection_menu,
  birds_list,
  confirm_bird_buttons,
  unlockable_bird_hint,
  unlocked_bird_message
} = styles

const InteractUI = () => {
  const [playing] = useAtom(playingAtom)
  const [gameOver] = useAtom(gameOverAtom)
  const [, setRestartingGame] = useAtom(restartingGameAtom)
  const [showingUI, setShowingUI] = useState(true)
  const [uiExiting, setUIExiting] = useState(false)

  const [score] = useAtom(scoreAtom)

  const [gameOverTextEntering, setGameOverTextEntering] = useState(false)
  const [gameOverTextExiting, setGameOverTextExiting] = useState(false)
  const [showingGameOverModal, setShowingGameOverModal] = useState(false)

  const [selectingBird, setSelectingBird] = useAtom(selectingBirdAtom)
  const [previewingBird, setPreviewingBird] = useAtom(previewingBirdAtom)
  const [currentSkin, setCurrentSkin] = useAtom(currentSkinAtom)
  const [justUnlockedSkin, setJustUnlockedSkin] = useAtom(justUnlockedSkinAtom)

  // 1) Fetch last selected skin from localStorage
  useEffect(() => {
    const current_skin = getLastSelectedSkin()
    setPreviewingBird(current_skin)
    setCurrentSkin(current_skin)
  }, [setCurrentSkin, setPreviewingBird])

  // 2) Manage showing/exiting UI state variables
  useEffect(() => {
    const updateUI = async () => {
      if (playing) {
        setUIExiting(true)
        await wait(900)
        setShowingUI(false)
        setUIExiting(false)
      }
    }

    updateUI()
  }, [playing])

  // 3) Animate game over text
  useEffect(() => {
    if (!gameOver) return

    const animateGameOverText = async () => {
      await wait(500)
      setGameOverTextEntering(true)

      await wait(1300)
      setGameOverTextExiting(true)
      setShowingGameOverModal(true)
      setGameOverTextEntering(false)

      await wait(410)
      setGameOverTextExiting(false)
    }

    animateGameOverText()
  }, [gameOver])

  const goToSelectBird = () => {
    if (playing) return
    setSelectingBird(true)
  }

  const restartGame = () => {
    setRestartingGame(true)
    setShowingGameOverModal(false)
    setShowingUI(true)
    setJustUnlockedSkin('')
  }

  const restartGameAndSelectBird = () => {
    restartGame()
    goToSelectBird()
  }

  const getBirdSelection = () => {
    if (!selectingBird) return null

    const previewBird = (id: string) => {
      setPreviewingBird(id)
    }

    const confirmBird = () => {
      if (!isSkinUnlocked(previewingBird)) return
      setCurrentSkin(previewingBird)
      saveLastSelectedSkin(previewingBird)
      setSelectingBird(false)
    }

    const backToMenu = () => {
      setSelectingBird(false)
      setPreviewingBird(currentSkin)
    }

    return (
      <div className={bird_selection_menu}>
        <div className={birds_list}>
          {bird_skins.map((skin) => {
            return (
              <Button
                key={skin.id}
                text={skin.name}
                onClick={() => previewBird(skin.id)}
                is_selected={previewingBird === skin.id}
              />
            )
          })}
        </div>

        <div className={confirm_bird_buttons}>
          <Button text={'OK'} onClick={confirmBird} disabled={!isSkinUnlocked(previewingBird)} />
          <Button text={'←'} aria_label="back" onClick={backToMenu} />
        </div>
      </div>
    )
  }

  const getMenu = () => {
    if (selectingBird) return null

    return (
      <div className={main_menu}>
        {/* <Button text="Leaderboard" onClick={() => ''} /> */}
        <Button text="Select bird" onClick={goToSelectBird} />
      </div>
    )
  }

  const getRightArea = () => {
    if (!showingUI) return null
    const exiting_class = uiExiting ? exiting_right_area : ''

    return (
      <div className={`${right_area} ${exiting_class}`}>
        <div className={game_title_area}>
          <div className={game_title}>Flappy Bird</div>
        </div>

        {getMenu()}
        {getBirdSelection()}
      </div>
    )
  }

  const getStartMessage = () => {
    if (!showingUI || selectingBird) return null
    const exiting_class = uiExiting ? exiting_start_message : ''

    return (
      <div className={start_message}>
        <span className={exiting_class}>Press space or click to play</span>
      </div>
    )
  }

  const getUnlockableBirdHint = () => {
    if (!selectingBird || isSkinUnlocked(previewingBird)) return null

    const skin_data = bird_skins.find((skin) => skin.id === previewingBird)
    if (!skin_data) return null

    let hint = `Unlocks at ${skin_data.unlocks_at} points`
    if (skin_data.must_get_score_consecutively) hint = `Unlocks by ????`

    return (
      <div className={unlockable_bird_hint}>
        <span>{hint}</span>
      </div>
    )
  }

  const getUnlockedBirdMessage = () => {
    if (!showingGameOverModal || !justUnlockedSkin) return null

    const skin_data = bird_skins.find((skin) => skin.id === justUnlockedSkin)
    if (!skin_data) return null

    return (
      <div className={unlocked_bird_message}>
        <span>{skin_data.name} bird unlocked!</span>
      </div>
    )
  }

  const getScoreText = () => {
    if (!playing || showingUI) return null

    return (
      <div className={central_area}>
        <div className={score_text}>{score}</div>
      </div>
    )
  }

  const getGameOverScreen = () => {
    if (!gameOver) return null

    const getGameOverText = () => {
      if (!gameOverTextEntering && !gameOverTextExiting) return null

      return (
        <div className={gameOverTextExiting ? `${game_over_text} ${exit}` : game_over_text}>
          <div>Game</div>
          <div>Over</div>
        </div>
      )
    }

    const getGameOverModal = () => {
      if (!showingGameOverModal) return null

      return (
        <div className={game_over_modal_area}>
          <div className={game_over_modal_container}>
            <div className={game_over_modal_bg}>
              <div className={game_over_modal}>
                <div className={game_over_modal_text}>Score</div>
                <div className={game_over_modal_number}>{score}</div>

                <div className={game_over_modal_text}>Best</div>
                <div className={game_over_modal_number}>{getHighestScore()}</div>
              </div>
            </div>
          </div>

          <div className={game_over_buttons}>
            <Button text="Restart" onClick={restartGame} />
            <Button text="Select bird" onClick={restartGameAndSelectBird} />
          </div>
        </div>
      )
    }

    return (
      <div className={central_area}>
        {getGameOverText()}
        {getGameOverModal()}
      </div>
    )
  }

  return (
    <div className={interact_ui}>
      {getScoreText()}
      {getGameOverScreen()}
      {getRightArea()}

      {getStartMessage()}
      {getUnlockableBirdHint()}
      {getUnlockedBirdMessage()}
    </div>
  )
}

export default InteractUI
