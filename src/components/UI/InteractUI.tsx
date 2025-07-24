import styles from 'styles/components/InteractUI.module.scss'
import Button from './Button'

const { interact_ui, right_area, game_title_area, start_message, main_menu, game_title } = styles

const InteractUI = () => {
  const getMenu = () => {
    return (
      <div className={main_menu}>
        <Button text="Leaderboard" onClick={() => ''} />
        <Button text="Select bird" onClick={goToSelectBird} />
      </div>
    )
  }

  const goToSelectBird = () => {
    return ''
  }

  const getStartMessage = () => {
    return <span>Press space or click to play</span>
  }

  return (
    <div className={interact_ui}>
      <div className={right_area}>
        <div className={game_title_area}>
          <div className={game_title}>Flappy Bird</div>
        </div>

        {getMenu()}
      </div>

      <div className={start_message}>{getStartMessage()}</div>
    </div>
  )
}

export default InteractUI
