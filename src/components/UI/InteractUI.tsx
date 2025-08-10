import styles from 'styles/components/InteractUI.module.scss'
import Button from './Button'
import { gameOverAtom, playingAtom, scoreAtom } from '../../store/store'
import { useAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { wait } from '../../helpers/helper_functions'

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
  game_over_buttons
} = styles

const InteractUI = () => {
  const [playing] = useAtom(playingAtom)
  const [gameOver] = useAtom(gameOverAtom)
  const [showingUI, setShowingUI] = useState(true)
  const [uiExiting, setUIExiting] = useState(false)

  const [score] = useAtom(scoreAtom)

  const [gameOverTextEntering, setGameOverTextEntering] = useState(false)
  const [gameOverTextExiting, setGameOverTextExiting] = useState(false)
  const [showingGameOverModal, setShowingGameOverModal] = useState(false)

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

  useEffect(() => {
    if (!gameOver) return

    const animateGameOverText = async () => {
      await wait(500)
      setGameOverTextEntering(true)

      await wait(1300)
      setGameOverTextExiting(true)
      setShowingGameOverModal(true)
      setGameOverTextEntering(false)

      await wait(500)
      setGameOverTextExiting(false)
    }

    animateGameOverText()
  }, [gameOver])

  const goToSelectBird = () => {
    return ''
  }

  const restartGame = () => {
    console.log('restartGame')
  }

  const backToMenu = () => {
    console.log('backToMenu')
  }

  const getMenu = () => {
    return (
      <div className={main_menu}>
        <Button text="Leaderboard" onClick={() => ''} />
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
      </div>
    )
  }

  const getStartMessage = () => {
    if (!showingUI) return null
    const exiting_class = uiExiting ? exiting_start_message : ''

    return <span className={exiting_class}>Press space or click to play</span>
  }

  const getScoreText = () => {
    if (!playing) return null

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
                <div className={game_over_modal_number}>1</div>
              </div>
            </div>
          </div>

          <div className={game_over_buttons}>
            <Button text="Restart" onClick={restartGame} />
            <Button text="Main menu" onClick={backToMenu} />
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

      <div className={start_message}>{getStartMessage()}</div>
    </div>
  )
}

export default InteractUI
