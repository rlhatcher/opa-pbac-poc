import { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Trash2, Pause, Play, Filter } from 'lucide-react'

interface LogEntry {
  timestamp: string
  level?: string
  message: string
  source?: string
}

interface AppLogsProps {
  logs: LogEntry[]
}

export function AppLogs({ logs }: AppLogsProps) {
  const [autoScroll, setAutoScroll] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [filter, setFilter] = useState<string>('')
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

  const getLogLevelColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return 'text-red-400'
      case 'warn':
      case 'warning':
        return 'text-yellow-400'
      case 'info':
        return 'text-blue-400'
      case 'debug':
        return 'text-gray-400'
      case 'success':
        return 'text-green-400'
      default:
        return 'text-gray-300'
    }
  }

  const getSourceColor = (source?: string) => {
    switch (source?.toLowerCase()) {
      case 'authorizer-function':
      case 'lambda-authorizer':
        return 'text-orange-400'
      case 'backend-lambda':
      case 'lambda-backend':
        return 'text-purple-400'
      case 'api-gateway':
        return 'text-cyan-400'
      default:
        return 'text-gray-400'
    }
  }

  const filteredLogs = logs.filter(log => {
    if (!filter) return true
    return (
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.source?.toLowerCase().includes(filter.toLowerCase()) ||
      log.level?.toLowerCase().includes(filter.toLowerCase())
    )
  })

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePause}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2 py-1 text-sm border rounded"
            />
          </div>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <span>Auto-scroll</span>
          </label>
        </div>
      </div>

      {/* Log Display */}
      <div className="flex-1 bg-black rounded-md overflow-hidden">
        <ScrollArea className="h-full">
          <div ref={scrollRef} className="p-4 font-mono text-sm space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-green-400">
                {filter ? 'No logs match the filter...' : 'Waiting for application logs...'}
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={`flex flex-wrap items-start space-x-2 ${
                    index === 0 ? 'animate-pulse' : ''
                  }`}
                >
                  <span className="text-gray-500 text-xs">
                    [{formatTimestamp(log.timestamp)}]
                  </span>
                  
                  {log.source && (
                    <span className={`text-xs font-medium ${getSourceColor(log.source)}`}>
                      {log.source}
                    </span>
                  )}
                  
                  {log.level && (
                    <span className={`text-xs font-semibold ${getLogLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                  )}
                  
                  <span className="text-gray-300 text-xs flex-1">
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Status Bar */}
      <div className="mt-2 text-xs text-muted-foreground flex justify-between">
        <span>
          {filteredLogs.length} of {logs.length} log entries
          {filter && ` (filtered by "${filter}")`}
        </span>
        <span>{isPaused ? 'Paused' : 'Live'}</span>
      </div>
    </div>
  )
}
