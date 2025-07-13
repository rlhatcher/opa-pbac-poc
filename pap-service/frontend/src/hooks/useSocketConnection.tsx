import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketConnectionProps {
  url: string
  onPdpLog?: (log: any) => void
  onPepRequest?: (request: any) => void
  onDashboardUpdate?: (data: any) => void
  enabled?: boolean
}

export function useSocketConnection({
  url,
  onPdpLog,
  onPepRequest,
  onDashboardUpdate,
  enabled = true
}: UseSocketConnectionProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Use refs to store the latest callback functions without causing re-renders
  const onPdpLogRef = useRef(onPdpLog)
  const onPepRequestRef = useRef(onPepRequest)
  const onDashboardUpdateRef = useRef(onDashboardUpdate)

  // Update refs when callbacks change
  useEffect(() => {
    onPdpLogRef.current = onPdpLog
    onPepRequestRef.current = onPepRequest
    onDashboardUpdateRef.current = onDashboardUpdate
  }, [onPdpLog, onPepRequest, onDashboardUpdate])

  useEffect(() => {
    if (!enabled) {
      setSocket(null)
      setIsConnected(false)
      return
    }

    const socketConnection = io(url)
    setSocket(socketConnection)

    // Connection events
    socketConnection.on('connect', () => {
      setIsConnected(true)
    })

    socketConnection.on('disconnect', () => {
      setIsConnected(false)
    })

    // Data events - use refs to avoid dependency issues
    socketConnection.on('dashboard-update', (data) => {
      if (onDashboardUpdateRef.current) {
        onDashboardUpdateRef.current(data)
      }
    })

    socketConnection.on('pdp-log', (log) => {
      if (onPdpLogRef.current) {
        onPdpLogRef.current(log)
      }
    })

    socketConnection.on('pep-request', (request) => {
      if (onPepRequestRef.current) {
        onPepRequestRef.current(request)
      }
    })

    return () => {
      socketConnection.off('connect')
      socketConnection.off('disconnect')
      socketConnection.off('dashboard-update')
      socketConnection.off('pdp-log')
      socketConnection.off('pep-request')
      socketConnection.disconnect()
    }
  }, [url, enabled]) // Depend on both URL and enabled state

  return {
    socket,
    isConnected
  }
}
