import styles from 'styles/components/InteractUI.module.scss'

const { interact_ui, right_area, game_title_area, start_message, main_menu, game_title } = styles

const InteractUI = () => {
  const getMenu = () => {
    return (
      <div className={main_menu}>
        <button>
          <span>Leaderboard</span>
        </button>
        <button>
          <span>Select bird</span>
        </button>
      </div>
    )
  }

  const getStartMessage = () => {
    return <div>Press space or click to play</div>
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
