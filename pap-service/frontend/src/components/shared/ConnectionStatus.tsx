import { Badge } from '../ui/badge'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

type ConnectionState = 'connected' | 'disconnected' | 'connecting'

interface ConnectionStatusProps {
  status: ConnectionState
  service?: string
}

export function ConnectionStatus({ status, service = 'OPA' }: ConnectionStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-primary" />
      case 'connecting':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-destructive" />
    }
  }

  const getStatusVariant = () => {
    switch (status) {
      case 'connected':
        return 'default' as const
      case 'connecting':
        return 'secondary' as const
      case 'disconnected':
        return 'destructive' as const
    }
  }

  return (
    <Badge variant={getStatusVariant()}>
      {getStatusIcon()}
      <span className="ml-1">{service} {status}</span>
    </Badge>
  )
}
