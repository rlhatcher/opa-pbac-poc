import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import type { LucideProps } from 'lucide-react'

interface MetricCardProps {
  title: string
  icon: React.ComponentType<LucideProps>
  count: number
  allows: number
  denys: number
  status: 'active' | 'idle'
  lastActivity: string
  flashState?: 'allow' | 'deny' | null
  hideDecisions?: boolean
}

export function MetricCard({
  title,
  icon: Icon,
  count,
  allows,
  denys,
  status,
  lastActivity,
  flashState,
  hideDecisions = false
}: MetricCardProps) {
  const getFlashClasses = () => {
    if (!flashState) return ''

    return flashState === 'allow'
      ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 transition-colors duration-500'
      : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800 transition-colors duration-500'
  }

  return (
    <Card className={cn('transition-all duration-300', getFlashClasses())}>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium text-muted-foreground flex items-center'>
          <Icon className='h-4 w-4 mr-2 text-primary' />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-2'>
          {/* Count */}
          <div className='text-lg font-bold'>
            {count} {count === 1 ? 'request' : 'requests'}
          </div>

          {/* Allow/Deny counts */}
          {!hideDecisions && (
            <div className='flex items-center space-x-2 text-xs'>
              <Badge
                variant='default'
                className='bg-green-600 text-white hover:bg-green-700 font-semibold'
              >
                ✓ {allows} Allow
              </Badge>
              <Badge
                variant='destructive'
                className='bg-red-600 text-white hover:bg-red-700 font-semibold'
              >
                ✗ {denys} Deny
              </Badge>
            </div>
          )}

          {/* Last Activity */}
          <div className='text-xs text-muted-foreground truncate'>
            {lastActivity}
          </div>

          {/* Status */}
          <Badge
            variant={status === 'active' ? 'default' : 'secondary'}
            className='text-xs'
          >
            {status === 'active' ? 'Active' : 'Idle'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
