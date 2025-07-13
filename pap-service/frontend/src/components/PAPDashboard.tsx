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
import { SimpleMetrics } from './SimpleMetrics'
import {
  Shield,
  Activity,
  Database,
  Terminal,
  BarChart3,
  Settings,
  Bell,
  Search,
  RefreshCw,
  Zap,
  Home,
  Users,
  FileText,
  Menu,
  X,
  Pause,
  Play,
  Trash2,
  Maximize2
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    allowedRequests: 0,
    deniedRequests: 0,
    avgResponseTime: 0,
    uptime: 100
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

    // Check service status initially and then every 30 seconds
    checkServiceStatus()
    const healthCheckInterval = setInterval(checkServiceStatus, 30000)

    return () => {
      socketConnection.disconnect()
      clearInterval(healthCheckInterval)
    }
  }, [])

  // Update metrics when dashboard data changes
  useEffect(() => {
    updateMetrics()
  }, [dashboardData.pdpLogs, serviceStatus])

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

  const updateMetrics = () => {
    const totalRequests = dashboardData.pdpLogs.length
    const allowedRequests = dashboardData.pdpLogs.filter(
      (log) => log.result === true
    ).length
    const deniedRequests = totalRequests - allowedRequests

    setMetrics({
      totalRequests,
      allowedRequests,
      deniedRequests,
      avgResponseTime: Math.floor(Math.random() * 50) + 10, // Simulated
      uptime: (Object.values(serviceStatus).filter(Boolean).length / 3) * 100
    })
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'testing', label: 'Policy Testing', icon: Zap },
    { id: 'decisions', label: 'Decisions', icon: Shield },
    { id: 'data', label: 'Data Management', icon: Database },
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  return (
    <div className='flex h-screen bg-background'>
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } transition-all duration-300 border-r bg-card/50`}
      >
        <div className='flex h-full flex-col'>
          {/* Logo */}
          <div className='flex h-16 items-center border-b px-4'>
            <div className='flex items-center space-x-2'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary'>
                <Shield className='h-4 w-4 text-primary-foreground' />
              </div>
              {sidebarOpen && (
                <div className='flex flex-col'>
                  <span className='text-sm font-semibold'>PBAC</span>
                  <span className='text-xs text-muted-foreground'>
                    Dashboard
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className='flex-1 space-y-1 p-2'>
            {sidebarItems.map((item) => (
              <Button
                key={item.id}
                variant={currentPage === item.id ? 'secondary' : 'ghost'}
                className={`w-full justify-start ${!sidebarOpen && 'px-2'}`}
                onClick={() => setCurrentPage(item.id)}
              >
                <item.icon className='h-4 w-4' />
                {sidebarOpen && <span className='ml-2'>{item.label}</span>}
              </Button>
            ))}
          </nav>

          {/* Service Status */}
          {sidebarOpen && (
            <div className='border-t p-4'>
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium text-muted-foreground'>
                    Services
                  </span>
                  <div
                    className={`h-2 w-2 rounded-full ${
                      Object.values(serviceStatus).every(Boolean)
                        ? 'bg-primary'
                        : Object.values(serviceStatus).some(Boolean)
                        ? 'bg-muted-foreground'
                        : 'bg-destructive'
                    }`}
                  />
                </div>
                <div className='space-y-1'>
                  <div className='flex items-center justify-between text-xs'>
                    <span>OPA (PDP)</span>
                    <Badge
                      variant={serviceStatus.opa ? 'default' : 'destructive'}
                      className='h-4 text-xs'
                    >
                      {serviceStatus.opa ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <div className='flex items-center justify-between text-xs'>
                    <span>Preferences (PIP)</span>
                    <Badge
                      variant={
                        serviceStatus.preferences ? 'default' : 'destructive'
                      }
                      className='h-4 text-xs'
                    >
                      {serviceStatus.preferences ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <div className='flex items-center justify-between text-xs'>
                    <span>SAM Local (PEP)</span>
                    <Badge
                      variant={serviceStatus.sam ? 'default' : 'destructive'}
                      className='h-4 text-xs'
                    >
                      {serviceStatus.sam ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toggle Button */}
          <div className='border-t p-2'>
            <Button
              variant='ghost'
              size='sm'
              className='w-full'
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className='h-4 w-4' />
              ) : (
                <Menu className='h-4 w-4' />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Top Header */}
        <header className='h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
          <div className='flex h-full items-center justify-between px-6'>
            <div className='flex items-center space-x-4'>
              <h1 className='text-xl font-semibold'>
                {sidebarItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
              </h1>
            </div>

            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={checkServiceStatus}
              >
                <RefreshCw className='h-4 w-4 mr-2' />
                Refresh
              </Button>

              <Button
                variant='outline'
                size='sm'
                onClick={() => toggleAutoRefresh()}
              >
                {autoRefresh ? (
                  <>
                    <Pause className='h-4 w-4 mr-2' />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className='h-4 w-4 mr-2' />
                    Resume
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className='flex-1 overflow-auto p-6'>
          {currentPage === 'dashboard' && (
            <SimpleMetrics metrics={metrics} logs={dashboardData.pdpLogs} />
          )}

          {currentPage === 'testing' && (
            <Card className='h-full'>
              <CardContent className='h-full p-6'>
                <PEPInterface socket={socket} />
              </CardContent>
            </Card>
          )}

          {currentPage === 'decisions' && (
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
          )}

          {currentPage === 'data' && (
            <Card className='h-full'>
              <CardContent className='h-full p-6'>
                <PIPDataManager data={dashboardData.pipData} socket={socket} />
              </CardContent>
            </Card>
          )}

          {currentPage === 'logs' && (
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
          )}

          {currentPage === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-sm font-medium'>Auto Refresh</h3>
                      <p className='text-xs text-muted-foreground'>
                        Automatically refresh service status and logs
                      </p>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => toggleAutoRefresh()}
                    >
                      {autoRefresh ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-sm font-medium'>Service Health Check</h3>
                      <p className='text-xs text-muted-foreground'>
                        Check the status of all PBAC services
                      </p>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={checkServiceStatus}
                    >
                      Check Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
            <Card className='flex flex-col'>
              <CardHeader className='flex-shrink-0 pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='flex items-center space-x-2 text-lg'>
                    <div className='p-1.5 bg-muted rounded-md'>
                      <Zap className='h-4 w-4 text-muted-foreground' />
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
                      <div className='p-1.5 bg-muted rounded-md'>
                        <Shield className='h-4 w-4 text-muted-foreground' />
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
                      <div className='p-1.5 bg-muted rounded-md'>
                        <Terminal className='h-4 w-4 text-muted-foreground' />
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
                    <div className='p-1.5 bg-muted rounded-md'>
                      <Database className='h-4 w-4 text-primary' />
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
            <TabsList className='grid w-full grid-cols-5 mb-6'>
              <TabsTrigger
                value='overview'
                className='flex items-center space-x-2'
              >
                <BarChart3 className='h-4 w-4' />
                <span>Overview</span>
              </TabsTrigger>
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

            <TabsContent value='overview' className='h-[calc(100vh-280px)]'>
              <div className='h-full overflow-auto'>
                <SimpleMetrics metrics={metrics} logs={dashboardData.pdpLogs} />
              </div>
            </TabsContent>

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
