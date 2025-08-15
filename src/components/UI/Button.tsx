import styles from 'styles/components/Button.module.scss'

const { btn_bg, btn_content, btn_selected } = styles

type ButtonProps = {
  text: string
  onClick: () => void
  css_class?: string
  aria_label?: string
  disabled?: boolean
  is_selected?: boolean
}

const Button = ({ text, onClick, css_class, aria_label, disabled, is_selected }: ButtonProps) => {
  return (
    <button
      className={`${btn_bg} ${is_selected ? btn_selected : ''} ${css_class || ''}`}
      onClick={onClick}
      aria-label={aria_label}
      disabled={disabled}
    >
      <div className={btn_content}>
        <span>{text}</span>
      </div>
    </button>
  )
}

export default Button
