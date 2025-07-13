import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import { Shield, Menu, X } from 'lucide-react'
import type { LucideProps } from 'lucide-react'

interface SidebarItem {
  id: string
  label: string
  icon: React.ComponentType<LucideProps>
}

interface ServiceStatus {
  opa: boolean
  preferences: boolean
  sam: boolean
}

interface SidebarProps {
  items: SidebarItem[]
  currentPage: string
  onPageChange: (pageId: string) => void
  serviceStatus: ServiceStatus
  isOpen?: boolean
  onToggle?: () => void
}

export function Sidebar({
  items,
  currentPage,
  onPageChange,
  serviceStatus,
  isOpen = true,
  onToggle
}: SidebarProps) {
  return (
    <div
      className={cn(
        'flex flex-col border-r border-border bg-sidebar transition-all duration-300',
        isOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo & Toggle */}
      <div className='flex h-16 items-center border-b border-sidebar-border px-4'>
        <div className='flex items-center space-x-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary'>
            <Shield className='h-4 w-4 text-sidebar-primary-foreground' />
          </div>
          {isOpen && (
            <div className='flex flex-col'>
              <span className='text-sm font-semibold text-sidebar-foreground'>
                PBAC
              </span>
              <span className='text-xs text-sidebar-foreground/70'>
                Dashboard
              </span>
            </div>
          )}
        </div>
        {onToggle && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onToggle}
            className='ml-auto'
          >
            {isOpen ? <X className='h-4 w-4' /> : <Menu className='h-4 w-4' />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className='flex-1 space-y-1 p-2'>
        {items.map((item) => (
          <Button
            key={item.id}
            variant={currentPage === item.id ? 'default' : 'ghost'}
            className={cn('w-full justify-start', !isOpen && 'px-2')}
            onClick={() => onPageChange(item.id)}
          >
            <item.icon className='h-4 w-4' />
            {isOpen && <span className='ml-2'>{item.label}</span>}
          </Button>
        ))}
      </nav>

      {/* Service Status */}
      {isOpen && (
        <div className='border-t border-sidebar-border p-4'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-medium text-sidebar-foreground/70'>
                Services
              </span>
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  Object.values(serviceStatus).every(Boolean)
                    ? 'bg-primary'
                    : 'bg-destructive'
                )}
              />
            </div>
            <div className='space-y-1'>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-sidebar-foreground/60'>OPA</span>
                <Badge
                  variant={serviceStatus.opa ? 'default' : 'destructive'}
                  className='h-4 text-xs'
                >
                  {serviceStatus.opa ? 'Up' : 'Down'}
                </Badge>
              </div>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-sidebar-foreground/60'>Preferences</span>
                <Badge
                  variant={
                    serviceStatus.preferences ? 'default' : 'destructive'
                  }
                  className='h-4 text-xs'
                >
                  {serviceStatus.preferences ? 'Up' : 'Down'}
                </Badge>
              </div>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-sidebar-foreground/60'>SAM</span>
                <Badge
                  variant={serviceStatus.sam ? 'default' : 'destructive'}
                  className='h-4 text-xs'
                >
                  {serviceStatus.sam ? 'Up' : 'Down'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
