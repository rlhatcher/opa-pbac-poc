import { Badge } from '../ui/badge'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

type StatusType = 'online' | 'offline' | 'connecting' | 'error'

interface StatusBadgeProps {
  status: StatusType
  label?: string
  showIcon?: boolean
}

export function StatusBadge({ status, label, showIcon = true }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          text: label || 'Online',
          className: 'text-primary-foreground'
        }
      case 'offline':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          text: label || 'Offline',
          className: 'text-destructive-foreground'
        }
      case 'connecting':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          text: label || 'Connecting',
          className: 'text-secondary-foreground'
        }
      case 'error':
        return {
          variant: 'destructive' as const,
          icon: AlertCircle,
          text: label || 'Error',
          className: 'text-destructive-foreground'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={config.className}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.text}
    </Badge>
  )
}
