import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface DashboardLayoutProps {
  children: ReactNode
  className?: string
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <div className='flex h-screen'>{children}</div>
    </div>
  )
}
