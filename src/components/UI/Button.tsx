import styles from 'styles/components/Button.module.scss'

const { btn_bg, btn_content } = styles

type ButtonProps = {
  text: string
  onClick: () => void
}

const Button = ({ text, onClick }: ButtonProps) => {
  return (
    <button className={btn_bg} onClick={onClick}>
      <div className={btn_content}>
        <span>{text}</span>
      </div>
    </button>
  )
}

export default Button
