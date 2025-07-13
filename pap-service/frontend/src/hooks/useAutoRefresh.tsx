import { useState, useEffect, useCallback } from 'react'

interface UseAutoRefreshProps {
  enabled: boolean
  interval: number
  onRefresh: () => void | Promise<void>
}

export function useAutoRefresh({ enabled, interval, onRefresh }: UseAutoRefreshProps) {
  const [autoRefresh, setAutoRefresh] = useState(enabled)

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev)
  }, [])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    const refreshInterval = setInterval(async () => {
      try {
        await onRefresh()
      } catch (error) {
        console.warn('Auto-refresh failed:', error)
      }
    }, interval)

    return () => clearInterval(refreshInterval)
  }, [autoRefresh, interval, onRefresh])

  return {
    autoRefresh,
    toggleAutoRefresh
  }
}
