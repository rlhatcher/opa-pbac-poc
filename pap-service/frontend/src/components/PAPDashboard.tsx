import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { PEPInterface } from './quadrants/PEPInterface'
import { PDPLogs } from './quadrants/PDPLogs'
import { PIPDataManager } from './quadrants/PIPDataManager'
import { AppLogs } from './quadrants/AppLogs'
import {
  Shield,
  Activity,
  Database,
  Terminal,
  CheckCircle,
  XCircle,
  Maximize2,
  Minimize2,
  Trash2,
  Pause,
  Play,
  BarChart3,
  Settings,
  Bell,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  Info,
  Zap
} from 'lucide-react'

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
  const [expandedPanels, setExpandedPanels] = useState<{
    [key: string]: boolean
  }>({
    pep: false,
    pdp: false,
    pip: false,
    app: false
  })
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [viewMode, setViewMode] = useState<'grid' | 'tabs' | 'focus'>('grid')

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

    // Check service status initially and then every 30 seconds
    checkServiceStatus()
    const healthCheckInterval = setInterval(checkServiceStatus, 30000)

    return () => {
      socketConnection.disconnect()
      clearInterval(healthCheckInterval)
    }
  }, [])

  const checkServiceStatus = async () => {
    const services = [
      { key: 'opa', url: '/api/health/opa', name: 'OPA (PDP)' },
      {
        key: 'preferences',
        url: '/api/health/preferences',
        name: 'Preferences (PIP)'
      },
      { key: 'sam', url: '/api/health/sam', name: 'SAM Local (PEP)' }
    ]

    const statusChecks = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const response = await fetch(service.url, {
            method: 'GET',
            headers: {
              Accept: 'application/json'
            }
          })
          const data = await response.json()
          const isHealthy = response.ok && data.status === 'healthy'
          return {
            key: service.key,
            status: isHealthy,
            name: service.name,
            data
          }
        } catch (error) {
          console.warn(`Health check failed for ${service.name}:`, error)
          return { key: service.key, status: false, name: service.name, error }
        }
      })
    )

    const newStatus = { ...serviceStatus }
    statusChecks.forEach((result) => {
      if (result.status === 'fulfilled') {
        newStatus[result.value.key as keyof ServiceStatus] = result.value.status
        if (!result.value.status) {
          console.warn(
            `Service ${result.value.name} is unhealthy:`,
            result.value.data || result.value.error
          )
        }
      }
    })
    setServiceStatus(newStatus)
  }

  const togglePanel = (panel: string) => {
    setExpandedPanels((prev) => ({
      ...prev,
      [panel]: !prev[panel]
    }))
  }

  const clearLogs = (logType: 'pepRequests' | 'pdpLogs' | 'appLogs') => {
    setDashboardData((prev) => ({
      ...prev,
      [logType]: []
    }))
  }

  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => !prev)
  }

  return (
    <div className='min-h-screen bg-background'>
      {/* Modern Header */}
      <header className='border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50'>
        <div className='container mx-auto px-6 py-4'>
          <div className='flex items-center justify-between'>
            {/* Brand & Title */}
            <div className='flex items-center space-x-4'>
              <div className='flex items-center space-x-3'>
                <div className='p-2 bg-primary/10 rounded-lg'>
                  <Shield className='h-6 w-6 text-primary' />
                </div>
                <div>
                  <h1 className='text-xl font-semibold'>PBAC Dashboard</h1>
                  <p className='text-xs text-muted-foreground'>
                    Policy Administration Point
                  </p>
                </div>
              </div>
            </div>

            {/* System Status & Controls */}
            <div className='flex items-center space-x-4'>
              {/* System Health Overview */}
              <div className='flex items-center space-x-2'>
                <div className='flex items-center space-x-1'>
                  <div
                    className={`h-2 w-2 rounded-full ${
                      Object.values(serviceStatus).every(Boolean)
                        ? 'bg-green-500'
                        : Object.values(serviceStatus).some(Boolean)
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <span className='text-xs text-muted-foreground'>
                    {Object.values(serviceStatus).filter(Boolean).length}/3
                    Services
                  </span>
                </div>
              </div>

              {/* Service Status Cards */}
              <div className='flex space-x-1'>
                <Badge
                  variant={serviceStatus.opa ? 'default' : 'destructive'}
                  className='cursor-pointer hover:opacity-80 transition-opacity'
                  onClick={() => window.open('http://localhost:8181', '_blank')}
                >
                  <Shield className='h-3 w-3 mr-1' />
                  PDP
                </Badge>

                <Badge
                  variant={
                    serviceStatus.preferences ? 'default' : 'destructive'
                  }
                  className='cursor-pointer hover:opacity-80 transition-opacity'
                  onClick={() => window.open('http://localhost:3002', '_blank')}
                >
                  <Database className='h-3 w-3 mr-1' />
                  PIP
                </Badge>

                <Badge
                  variant={serviceStatus.sam ? 'default' : 'destructive'}
                  className='cursor-pointer hover:opacity-80 transition-opacity'
                  onClick={() => window.open('http://localhost:3000', '_blank')}
                >
                  <Activity className='h-3 w-3 mr-1' />
                  PEP
                </Badge>
              </div>

              {/* Dashboard Controls */}
              <div className='flex items-center space-x-1'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() =>
                    setViewMode(viewMode === 'grid' ? 'tabs' : 'grid')
                  }
                  title='Toggle view mode'
                >
                  <BarChart3 className='h-4 w-4' />
                </Button>

                <Button
                  variant='ghost'
                  size='sm'
                  onClick={checkServiceStatus}
                  title='Refresh all services'
                >
                  <RefreshCw className='h-4 w-4' />
                </Button>

                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => toggleAutoRefresh()}
                  title={
                    autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'
                  }
                >
                  {autoRefresh ? (
                    <Pause className='h-4 w-4' />
                  ) : (
                    <Play className='h-4 w-4' />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Dashboard Content */}
      <main className='container mx-auto p-6 flex-1'>
        {viewMode === 'grid' ? (
          /* Grid Layout */
          <div className='grid grid-cols-1 xl:grid-cols-2 gap-6 h-full max-h-[calc(100vh-200px)]'>
            {/* Primary Action Panel - PEP Interface */}
            <Card className='flex flex-col'>
              <CardHeader className='flex-shrink-0 pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='flex items-center space-x-2 text-lg'>
                    <div className='p-1.5 bg-orange-100 rounded-md'>
                      <Zap className='h-4 w-4 text-orange-600' />
                    </div>
                    <span>Policy Testing</span>
                  </CardTitle>
                  <Badge variant='outline' className='text-xs'>
                    PEP Interface
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className='flex-1 min-h-0 p-4'>
                <PEPInterface socket={socket} />
              </CardContent>
            </Card>

            {/* Monitoring Panel - Logs & Data */}
            <div className='flex flex-col space-y-6'>
              {/* PDP Logs */}
              <Card className='flex-1'>
                <CardHeader className='flex-shrink-0 pb-2'>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='flex items-center space-x-2 text-base'>
                      <div className='p-1.5 bg-blue-100 rounded-md'>
                        <Shield className='h-4 w-4 text-blue-600' />
                      </div>
                      <span>Decision Logs</span>
                    </CardTitle>
                    <div className='flex gap-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => clearLogs('pdpLogs')}
                        title='Clear logs'
                      >
                        <Trash2 className='h-3 w-3' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => togglePanel('pdp')}
                        title='Expand panel'
                      >
                        <Maximize2 className='h-3 w-3' />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='flex-1 min-h-0 p-2'>
                  <ScrollArea className='h-[200px]'>
                    <PDPLogs logs={dashboardData.pdpLogs} />
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* App Logs */}
              <Card className='flex-1'>
                <CardHeader className='flex-shrink-0 pb-2'>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='flex items-center space-x-2 text-base'>
                      <div className='p-1.5 bg-purple-100 rounded-md'>
                        <Terminal className='h-4 w-4 text-purple-600' />
                      </div>
                      <span>Application Logs</span>
                    </CardTitle>
                    <div className='flex gap-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => clearLogs('appLogs')}
                        title='Clear logs'
                      >
                        <Trash2 className='h-3 w-3' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => togglePanel('app')}
                        title='Expand panel'
                      >
                        <Maximize2 className='h-3 w-3' />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='flex-1 min-h-0 p-2'>
                  <ScrollArea className='h-[200px]'>
                    <AppLogs logs={dashboardData.appLogs} />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Data Management Panel - Full Width */}
            <Card className='xl:col-span-2 flex flex-col'>
              <CardHeader className='flex-shrink-0 pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='flex items-center space-x-2 text-lg'>
                    <div className='p-1.5 bg-green-100 rounded-md'>
                      <Database className='h-4 w-4 text-green-600' />
                    </div>
                    <span>Policy Data Management</span>
                  </CardTitle>
                  <Badge variant='outline' className='text-xs'>
                    PIP Interface
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className='flex-1 min-h-0 p-4'>
                <PIPDataManager data={dashboardData.pipData} socket={socket} />
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Tabbed Layout */
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='h-full'
          >
            <TabsList className='grid w-full grid-cols-4 mb-6'>
              <TabsTrigger
                value='testing'
                className='flex items-center space-x-2'
              >
                <Zap className='h-4 w-4' />
                <span>Testing</span>
              </TabsTrigger>
              <TabsTrigger
                value='decisions'
                className='flex items-center space-x-2'
              >
                <Shield className='h-4 w-4' />
                <span>Decisions</span>
              </TabsTrigger>
              <TabsTrigger value='data' className='flex items-center space-x-2'>
                <Database className='h-4 w-4' />
                <span>Data</span>
              </TabsTrigger>
              <TabsTrigger value='logs' className='flex items-center space-x-2'>
                <Terminal className='h-4 w-4' />
                <span>Logs</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value='testing' className='h-[calc(100vh-280px)]'>
              <Card className='h-full'>
                <CardContent className='h-full p-6'>
                  <PEPInterface socket={socket} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='decisions' className='h-[calc(100vh-280px)]'>
              <Card className='h-full'>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <CardTitle>Policy Decision Logs</CardTitle>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => clearLogs('pdpLogs')}
                    >
                      <Trash2 className='h-4 w-4 mr-2' />
                      Clear Logs
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className='h-full p-4'>
                  <ScrollArea className='h-full'>
                    <PDPLogs logs={dashboardData.pdpLogs} />
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='data' className='h-[calc(100vh-280px)]'>
              <Card className='h-full'>
                <CardContent className='h-full p-6'>
                  <PIPDataManager
                    data={dashboardData.pipData}
                    socket={socket}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='logs' className='h-[calc(100vh-280px)]'>
              <Card className='h-full'>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <CardTitle>Application Logs</CardTitle>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => clearLogs('appLogs')}
                    >
                      <Trash2 className='h-4 w-4 mr-2' />
                      Clear Logs
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className='h-full p-4'>
                  <ScrollArea className='h-full'>
                    <AppLogs logs={dashboardData.appLogs} />
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}
