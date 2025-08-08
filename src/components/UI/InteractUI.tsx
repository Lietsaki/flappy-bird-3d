import styles from 'styles/components/InteractUI.module.scss'
import Button from './Button'
import { playingAtom } from '../../store/store'
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
  exiting_right_area
} = styles

const InteractUI = () => {
  const [playing] = useAtom(playingAtom)
  const [showingUI, setShowingUI] = useState(true)
  const [uiExiting, setUIExiting] = useState(false)

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

  const goToSelectBird = () => {
    return ''
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

  return (
    <div className={interact_ui}>
      {getRightArea()}

      <div className={start_message}>{getStartMessage()}</div>
    </div>
  )
}

export default InteractUI
