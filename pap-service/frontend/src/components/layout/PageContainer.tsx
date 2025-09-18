import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main className={cn('flex-1 overflow-auto p-6', className)}>
      {children}
    </main>
  )
}
