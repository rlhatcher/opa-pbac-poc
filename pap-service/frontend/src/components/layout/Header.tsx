import type { ReactNode } from 'react'
import { Button } from '../ui/button'
import { ModeToggle } from '../mode-toggle'
import { RefreshCw } from 'lucide-react'

interface HeaderProps {
  title: string
  actions?: ReactNode
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function Header({
  title,
  actions,
  onRefresh,
  isRefreshing
}: HeaderProps) {
  return (
    <header className='h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='flex h-full items-center justify-between px-6'>
        <div className='flex items-center space-x-4'>
          <h1 className='text-xl font-semibold text-foreground'>{title}</h1>
        </div>

        <div className='flex items-center space-x-2'>
          {onRefresh && (
            <Button
              variant='outline'
              size='sm'
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          )}
          {actions}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
