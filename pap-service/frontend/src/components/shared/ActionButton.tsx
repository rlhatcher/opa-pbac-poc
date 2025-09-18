import { Button } from '../ui/button'
import type { LucideProps } from 'lucide-react'

interface ActionButtonProps {
  icon: React.ComponentType<LucideProps>
  label: string
  onClick: () => void
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
  loading?: boolean
}

export function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'outline',
  size = 'sm',
  disabled = false,
  loading = false
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
    >
      <Icon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      {label}
    </Button>
  )
}
