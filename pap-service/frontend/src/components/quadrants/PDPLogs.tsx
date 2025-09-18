import { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Trash2, Pause, Play } from 'lucide-react'

interface LogEntry {
  timestamp: string
  decision?: string
  policy?: string
  input?: any
  result?: boolean
  message?: string
  level?: string
}

interface PDPLogsProps {
  logs: LogEntry[]
}

export function PDPLogs({ logs }: PDPLogsProps) {
  const [autoScroll, setAutoScroll] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && !isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [logs, autoScroll, isPaused])

  const clearLogs = () => {
    // This would need to be implemented to actually clear logs
    console.log('Clear logs requested')
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getLogLevelColor = (level?: string, result?: boolean) => {
    if (result !== undefined) {
      return result ? 'text-primary' : 'text-destructive'
    }

    switch (level?.toLowerCase()) {
      case 'error':
        return 'text-destructive'
      case 'warning':
        return 'text-primary'
      case 'success':
        return 'text-primary'
      case 'info':
      default:
        return 'text-foreground'
    }
  }

  return (
    <div className='h-full flex flex-col'>
      {/* Controls */}
      <div className='flex items-center justify-between mb-4 pb-2 border-b'>
        <div className='flex items-center space-x-2'>
          <Button variant='outline' size='sm' onClick={togglePause}>
            {isPaused ? (
              <Play className='h-4 w-4' />
            ) : (
              <Pause className='h-4 w-4' />
            )}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant='outline' size='sm' onClick={clearLogs}>
            <Trash2 className='h-4 w-4' />
            Clear
          </Button>
        </div>
        <div className='flex items-center space-x-2'>
          <label className='flex items-center space-x-2 text-sm'>
            <input
              type='checkbox'
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className='rounded'
            />
            <span>Auto-scroll</span>
          </label>
        </div>
      </div>

      {/* Log Display */}
      <div className='flex-1 bg-background border rounded-md overflow-hidden'>
        <ScrollArea className='h-full'>
          <div ref={scrollRef} className='p-4 font-mono text-sm space-y-1'>
            {logs.length === 0 ? (
              <div className='text-primary'>
                Waiting for OPA decision logs...
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex flex-wrap items-start space-x-2 ${
                    index === 0 ? 'animate-pulse' : ''
                  }`}
                >
                  <span className='text-muted-foreground text-xs'>
                    [{formatTimestamp(log.timestamp)}]
                  </span>

                  {log.policy && (
                    <span className='text-secondary-foreground text-xs'>
                      {log.policy}
                    </span>
                  )}

                  <span
                    className={`text-xs font-semibold ${getLogLevelColor(
                      log.level,
                      log.result
                    )}`}
                  >
                    {log.decision ||
                      (log.result !== undefined
                        ? log.result
                          ? 'ALLOW'
                          : 'DENY'
                        : 'LOG')}
                  </span>

                  {log.message && (
                    <span className='text-muted-foreground text-xs flex-1'>
                      {log.message}
                    </span>
                  )}

                  {log.input && (
                    <div className='w-full mt-1 ml-4'>
                      <span className='text-muted-foreground text-xs'>
                        Input: {JSON.stringify(log.input, null, 0)}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Status Bar */}
      <div className='mt-2 text-xs text-muted-foreground flex justify-between'>
        <span>{logs.length} log entries</span>
        <span>{isPaused ? 'Paused' : 'Live'}</span>
      </div>
    </div>
  )
}
