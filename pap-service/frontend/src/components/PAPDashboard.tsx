import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { PEPInterface } from './quadrants/PEPInterface'
import { PDPLogs } from './quadrants/PDPLogs'
import { PIPDataManager } from './quadrants/PIPDataManager'
import { AppLogs } from './quadrants/AppLogs'
import { Shield, Activity, Database, Terminal } from 'lucide-react'

interface ServiceStatus {
  opa: boolean
  preferences: boolean
  sam: boolean
}

interface DashboardData {
  pepRequests: any[]
  pdpLogs: any[]
  pipData: {
    companies: Record<string, any>
    countries: Record<string, any>
    preferences: Record<string, any>
  }
  appLogs: any[]
}

export function PAPDashboard() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    opa: false,
    preferences: false,
    sam: false
  })
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    pepRequests: [],
    pdpLogs: [],
    pipData: {
      companies: {},
      countries: {},
      preferences: {}
    },
    appLogs: []
  })

  useEffect(() => {
    // Initialize WebSocket connection
    const socketConnection = io('http://localhost:3004')
    setSocket(socketConnection)

    // Handle connection events
    socketConnection.on('connect', () => {
      console.log('Connected to PAP service')
    })

    socketConnection.on('disconnect', () => {
      console.log('Disconnected from PAP service')
    })

    socketConnection.on('initial-data', (data: DashboardData) => {
      setDashboardData(data)
    })

    socketConnection.on('pep-request', (data: any) => {
      setDashboardData((prev) => ({
        ...prev,
        pepRequests: [data, ...prev.pepRequests.slice(0, 49)]
      }))
    })

    socketConnection.on('pdp-log', (data: any) => {
      setDashboardData((prev) => ({
        ...prev,
        pdpLogs: [data, ...prev.pdpLogs.slice(0, 99)]
      }))
    })

    socketConnection.on('pip-data-update', (data: any) => {
      setDashboardData((prev) => ({
        ...prev,
        pipData: {
          ...prev.pipData,
          [data.type]: data.data
        }
      }))
    })

    socketConnection.on('app-log', (data: any) => {
      setDashboardData((prev) => ({
        ...prev,
        appLogs: [data, ...prev.appLogs.slice(0, 99)]
      }))
    })

    // Check service status
    checkServiceStatus()

    return () => {
      socketConnection.disconnect()
    }
  }, [])

  const checkServiceStatus = async () => {
    const services = [
      { key: 'opa', url: 'http://localhost:8181/health' },
      { key: 'preferences', url: 'http://localhost:3002/health' },
      { key: 'sam', url: 'http://localhost:3000' }
    ]

    const statusChecks = await Promise.allSettled(
      services.map(async (service) => {
        try {
          await fetch(service.url, { mode: 'no-cors' })
          return { key: service.key, status: true }
        } catch {
          return { key: service.key, status: false }
        }
      })
    )

    const newStatus = { ...serviceStatus }
    statusChecks.forEach((result) => {
      if (result.status === 'fulfilled') {
        newStatus[result.value.key as keyof ServiceStatus] = result.value.status
      }
    })
    setServiceStatus(newStatus)
  }

  return (
    <div className='min-h-screen bg-background'>
      {/* Header */}
      <header className='border-b bg-card'>
        <div className='container mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <Shield className='h-8 w-8 text-primary' />
              <div>
                <h1 className='text-2xl font-bold'>OPA PBAC Dashboard</h1>
                <p className='text-sm text-muted-foreground'>
                  Policy Administration Point (PAP)
                </p>
              </div>
            </div>

            {/* Service Status Indicators */}
            <div className='flex space-x-4'>
              <div className='flex items-center space-x-2'>
                <div
                  className={`h-2 w-2 rounded-full ${
                    serviceStatus.opa ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className='text-sm'>OPA</span>
              </div>
              <div className='flex items-center space-x-2'>
                <div
                  className={`h-2 w-2 rounded-full ${
                    serviceStatus.preferences ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className='text-sm'>Preferences</span>
              </div>
              <div className='flex items-center space-x-2'>
                <div
                  className={`h-2 w-2 rounded-full ${
                    serviceStatus.sam ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className='text-sm'>SAM Local</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className='container mx-auto p-4'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-120px)]'>
          {/* Q1: PEP Interface */}
          <Card className='flex flex-col'>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center space-x-2 text-lg'>
                <Activity className='h-5 w-5 text-orange-500' />
                <span>Q1: PEP Interface</span>
              </CardTitle>
            </CardHeader>
            <CardContent className='flex-1 overflow-hidden'>
              <PEPInterface socket={socket} />
            </CardContent>
          </Card>

          {/* Q2: PDP Logs */}
          <Card className='flex flex-col'>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center space-x-2 text-lg'>
                <Shield className='h-5 w-5 text-blue-500' />
                <span>Q2: PDP Logs</span>
              </CardTitle>
            </CardHeader>
            <CardContent className='flex-1 overflow-hidden'>
              <PDPLogs logs={dashboardData.pdpLogs} />
            </CardContent>
          </Card>

          {/* Q3: PIP Data Manager */}
          <Card className='flex flex-col'>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center space-x-2 text-lg'>
                <Database className='h-5 w-5 text-green-500' />
                <span>Q3: PIP Data Manager</span>
              </CardTitle>
            </CardHeader>
            <CardContent className='flex-1 overflow-hidden'>
              <PIPDataManager data={dashboardData.pipData} socket={socket} />
            </CardContent>
          </Card>

          {/* Q4: Application Logs */}
          <Card className='flex flex-col'>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center space-x-2 text-lg'>
                <Terminal className='h-5 w-5 text-purple-500' />
                <span>Q4: Application Logs</span>
              </CardTitle>
            </CardHeader>
            <CardContent className='flex-1 overflow-hidden'>
              <AppLogs logs={dashboardData.appLogs} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
