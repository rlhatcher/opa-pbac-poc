import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { ModeToggle } from './mode-toggle'
import { SwaggerUIComponent } from './SwaggerUIComponent'
import { JsonEditor } from './JsonEditor'
import { PEPInterface } from './quadrants/PEPInterface'
import { PDPLogs } from './quadrants/PDPLogs'
import { PIPDataManager } from './quadrants/PIPDataManager'
import { AppLogs } from './quadrants/AppLogs'
import { SimpleMetrics } from './SimpleMetrics'
import {
  Shield,
  Database,
  Terminal,
  Settings,
  RefreshCw,
  Zap,
  Home,
  Menu,
  X,
  Pause,
  Play,
  Trash2,
  FileText
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
    companies: any
    countries: any
    preferences: any
  }
  appLogs: any[]
}

export function ModernDashboard() {
  // Get PAP service URL from environment variables, fallback to localhost for development
  const papServiceUrl =
    import.meta.env.VITE_PAP_SERVICE_URL || 'http://localhost:3004'

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
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentPage, setCurrentPage] = useState('testing')
  const [openApiSpecs, setOpenApiSpecs] = useState<{
    preferences: object | null
    policies: object | null
  }>({
    preferences: null,
    policies: null
  })
  const [serviceLogs, setServiceLogs] = useState({
    pdp: [], // OPA policy decision logs
    pip: [], // Preferences service logs
    pep: [], // Application lambda logs
    auth: [] // Auth lambda logs
  })

  const [serviceMetrics, setServiceMetrics] = useState({
    pdp: {
      lastActivity: 'No activity',
      count: 0,
      allows: 0,
      denys: 0,
      status: 'idle'
    },
    pip: {
      lastActivity: 'No activity',
      count: 0,
      allows: 0,
      denys: 0,
      status: 'idle'
    },
    pep: {
      lastActivity: 'No activity',
      count: 0,
      allows: 0,
      denys: 0,
      status: 'idle'
    },
    auth: {
      lastActivity: 'No activity',
      count: 0,
      allows: 0,
      denys: 0,
      status: 'idle'
    }
  })

  // Track flash animations for tiles
  const [flashStates, setFlashStates] = useState({
    auth: null, // null, 'allow', or 'deny'
    pdp: null,
    pip: null,
    pep: null
  })

  const sidebarItems = [
    { id: 'testing', label: 'Policy Testing', icon: Zap },
    { id: 'decisions', label: 'Decisions', icon: Shield },
    { id: 'data', label: 'Data Management', icon: Database },
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'documentation', label: 'Documentation', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  // Health check function
  const checkServiceStatus = useCallback(async () => {
    const services = [
      {
        key: 'opa',
        url: `${papServiceUrl}/api/health/opa`,
        name: 'OPA (PDP)'
      },
      {
        key: 'preferences',
        url: `${papServiceUrl}/api/health/preferences`,
        name: 'Preferences (PIP)'
      },
      {
        key: 'sam',
        url: `${papServiceUrl}/api/health/sam`,
        name: 'SAM Local (PEP)'
      }
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
          return {
            key: service.key,
            status: false,
            name: service.name,
            error
          }
        }
      })
    )

    setServiceStatus((prevStatus) => {
      const newStatus = { ...prevStatus }
      statusChecks.forEach((result) => {
        if (result.status === 'fulfilled') {
          newStatus[result.value.key as keyof ServiceStatus] =
            result.value.status
          if (!result.value.status) {
            console.warn(
              `Service ${result.value.name} is unhealthy:`,
              result.value.data || result.value.error
            )
          }
        }
      })
      return newStatus
    })
  }, [papServiceUrl])

  // Socket connection and data fetching
  useEffect(() => {
    const socketConnection = io(papServiceUrl)
    setSocket(socketConnection)

    socketConnection.on('dashboard-update', (data) => {
      setDashboardData(data)
    })

    // Listen for real-time PDP log updates
    socketConnection.on('pdp-log', (logEntry) => {
      setDashboardData((prev) => ({
        ...prev,
        pdpLogs: [logEntry, ...prev.pdpLogs.slice(0, 99)] // Keep last 100
      }))
    })

    // Listen for real-time PEP request updates
    socketConnection.on('pep-request', (requestEntry) => {
      setDashboardData((prev) => ({
        ...prev,
        pepRequests: [requestEntry, ...prev.pepRequests.slice(0, 49)] // Keep last 50
      }))
    })

    // Initial data fetch from the correct backend port
    fetch(`${papServiceUrl}/api/dashboard-data`)
      .then((res) => res.json())
      .then((data) => setDashboardData(data))
      .catch((err) => console.error('Failed to fetch dashboard data:', err))

    // Check service status initially and then every 30 seconds
    checkServiceStatus()
    const healthCheckInterval = setInterval(checkServiceStatus, 30000)

    return () => {
      socketConnection.off('dashboard-update')
      socketConnection.off('pdp-log')
      socketConnection.off('pep-request')
      socketConnection.disconnect()
      clearInterval(healthCheckInterval)
    }
  }, [papServiceUrl])

  // Load OpenAPI specifications
  useEffect(() => {
    const loadOpenApiSpecs = async () => {
      try {
        // Import js-yaml
        const { load } = await import('js-yaml')

        // Load preferences API spec
        const preferencesResponse = await fetch('/preferences-api.yaml')
        if (!preferencesResponse.ok) {
          throw new Error(
            `Failed to fetch preferences API spec: ${preferencesResponse.status}`
          )
        }
        const preferencesText = await preferencesResponse.text()

        // Load policies API spec
        const policiesResponse = await fetch('/policies-api.yaml')
        if (!policiesResponse.ok) {
          throw new Error(
            `Failed to fetch policies API spec: ${policiesResponse.status}`
          )
        }
        const policiesText = await policiesResponse.text()

        // Parse YAML specs and validate
        const preferencesSpec = load(preferencesText) as any
        const policiesSpec = load(policiesText) as any

        // Validate that specs have required fields
        if (!preferencesSpec?.openapi && !preferencesSpec?.swagger) {
          console.error(
            'Preferences spec missing version field:',
            preferencesSpec
          )
        }
        if (!policiesSpec?.openapi && !policiesSpec?.swagger) {
          console.error('Policies spec missing version field:', policiesSpec)
        }

        console.log('Loaded preferences spec:', preferencesSpec)
        console.log('Loaded policies spec:', policiesSpec)

        setOpenApiSpecs({
          preferences: preferencesSpec,
          policies: policiesSpec
        })
      } catch (error) {
        console.error('Failed to load OpenAPI specs:', error)
      }
    }

    loadOpenApiSpecs()
  }, [])

  // Update service logs and metrics when dashboard data changes
  useEffect(() => {
    updateServiceMetrics()
  }, [dashboardData.pdpLogs, dashboardData.appLogs])

  // Auto-refresh dashboard data to catch updates from direct OPA calls (like Playwright tests)
  useEffect(() => {
    if (!autoRefresh) return

    const refreshInterval = setInterval(async () => {
      try {
        const response = await fetch(`${papServiceUrl}/api/dashboard-data`)
        if (response.ok) {
          const data = await response.json()
          // Update data (socket events handle real-time updates, this is backup)
          setDashboardData((prev) => {
            // Only update if data has actually changed
            if (JSON.stringify(prev) !== JSON.stringify(data)) {
              return data
            }
            return prev
          })
        }
      } catch (error) {
        console.warn('Auto-refresh failed:', error)
      }
    }, 2000) // Poll every 2 seconds as backup to socket events

    return () => clearInterval(refreshInterval)
  }, [autoRefresh, papServiceUrl])

  const clearLogs = (logType: 'pepRequests' | 'pdpLogs' | 'appLogs') => {
    setDashboardData((prev) => ({
      ...prev,
      [logType]: []
    }))
  }

  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => !prev)
  }

  // Function to trigger flash animation
  const triggerFlash = (service: string, type: 'allow' | 'deny') => {
    setFlashStates((prev) => ({ ...prev, [service]: type }))
    // Clear flash after animation duration
    setTimeout(() => {
      setFlashStates((prev) => ({ ...prev, [service]: null }))
    }, 600) // 600ms flash duration
  }

  // Function to get flash classes for cards
  const getFlashClasses = (service: string) => {
    const flashType = flashStates[service as keyof typeof flashStates]
    if (!flashType) return ''

    const baseClasses = 'transition-all duration-300 animate-pulse'
    if (flashType === 'allow') {
      return `${baseClasses} ring-2 ring-primary bg-primary/10 border-primary/30`
    } else {
      return `${baseClasses} ring-2 ring-destructive bg-destructive/10 border-destructive/30`
    }
  }

  const updateServiceMetrics = () => {
    // Store previous metrics for comparison
    const prevMetrics = { ...serviceMetrics }
    // Analyze Auth logs - look for authorization-related logs
    const allAuthLogs = dashboardData.pdpLogs.filter(
      (log) => log.policy?.includes('authz') || log.message?.includes('auth')
    )
    const authLogs = allAuthLogs.slice(0, 5) // For display purposes

    // Analyze DNC logs - business logic policies (needed for gateway activity)
    const allDncLogs = dashboardData.pdpLogs.filter((log) =>
      log.policy?.includes('dnc')
    )
    const dncLogs = allDncLogs.slice(0, 5) // For display purposes

    const lastAuthLog = authLogs[0]
    const lastDncLog = dncLogs[0]

    // Show most recent activity from either auth or DNC (both go through gateway)
    const mostRecentGatewayLog =
      lastAuthLog && lastDncLog
        ? new Date(lastAuthLog.timestamp) > new Date(lastDncLog.timestamp)
          ? lastAuthLog
          : lastDncLog
        : lastAuthLog || lastDncLog

    const authActivity = mostRecentGatewayLog
      ? mostRecentGatewayLog.policy?.includes('dnc')
        ? `${mostRecentGatewayLog.decision} - DNC via gateway`
        : `${mostRecentGatewayLog.decision} - ${
            mostRecentGatewayLog.input?.method || 'auth'
          } via gateway`
      : 'No gateway activity'

    const authAllows = allAuthLogs.filter(
      (log) => log.decision === 'ALLOW'
    ).length
    const authDenys = allAuthLogs.filter(
      (log) => log.decision === 'DENY'
    ).length

    const dncActivity = lastDncLog
      ? `${lastDncLog.decision} - DNC policy`
      : 'No DNC activity'

    const dncAllows = allDncLogs.filter(
      (log) => log.decision === 'ALLOW'
    ).length
    const dncDenys = allDncLogs.filter((log) => log.decision === 'DENY').length

    // Analyze PIP (Preferences) logs - look for preference service calls
    const pipLogs = dashboardData.pdpLogs
      .filter(
        (log) =>
          log.full_result?.preferences_service_url ||
          log.message?.includes('preference')
      )
      .slice(0, 5)
    const lastPipLog = pipLogs[0]
    const pipActivity = lastPipLog
      ? 'Preference lookup completed'
      : 'No preference queries'

    // Analyze PEP (Application) logs
    const pepLogs = dashboardData.appLogs.slice(0, 5)
    const lastPepLog = pepLogs[0]
    const pepActivity = lastPepLog
      ? lastPepLog.message?.substring(0, 50) + '...'
      : 'No application activity'

    setServiceLogs({
      pdp: dncLogs,
      pip: pipLogs,
      pep: pepLogs,
      auth: authLogs
    })

    const newMetrics = {
      pdp: {
        lastActivity: dncActivity,
        count: allDncLogs.length, // Use full count, not sliced
        allows: dncAllows,
        denys: dncDenys,
        status: lastDncLog ? 'active' : 'idle'
      },
      pip: {
        lastActivity: pipActivity,
        count: pipLogs.length,
        allows: 0, // PIP doesn't have allow/deny
        denys: 0,
        status: lastPipLog ? 'active' : 'idle'
      },
      pep: {
        lastActivity: pepActivity,
        count: dashboardData.appLogs.length,
        allows: 0, // PEP doesn't have allow/deny
        denys: 0,
        status: lastPepLog ? 'active' : 'idle'
      },
      auth: {
        lastActivity: authActivity,
        count: allAuthLogs.length + allDncLogs.length, // Gateway handles both auth + DNC
        allows: authAllows + dncAllows, // Total allows through gateway
        denys: authDenys + dncDenys, // Total denys through gateway
        status: lastAuthLog || lastDncLog ? 'active' : 'idle'
      }
    }

    // Detect changes and trigger flash animations
    if (newMetrics.auth.allows > prevMetrics.auth.allows) {
      triggerFlash('auth', 'allow')
    } else if (newMetrics.auth.denys > prevMetrics.auth.denys) {
      triggerFlash('auth', 'deny')
    }

    if (newMetrics.pdp.allows > prevMetrics.pdp.allows) {
      triggerFlash('pdp', 'allow')
    } else if (newMetrics.pdp.denys > prevMetrics.pdp.denys) {
      triggerFlash('pdp', 'deny')
    }

    if (newMetrics.pip.count > prevMetrics.pip.count) {
      triggerFlash('pip', 'allow') // PIP queries are always "successful"
    }

    if (newMetrics.pep.count > prevMetrics.pep.count) {
      triggerFlash('pep', 'allow') // PEP requests are always "successful"
    }

    setServiceMetrics(newMetrics)
  }

  return (
    <div className='flex h-screen bg-background'>
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } transition-all duration-300 border-r border-sidebar-border bg-sidebar`}
      >
        <div className='flex h-full flex-col'>
          {/* Logo */}
          <div className='flex h-16 items-center border-b border-sidebar-border px-4'>
            <div className='flex items-center space-x-2'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary'>
                <Shield className='h-4 w-4 text-sidebar-primary-foreground' />
              </div>
              {sidebarOpen && (
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
          </div>

          {/* Navigation */}
          <nav className='flex-1 space-y-1 p-2'>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={`w-full flex items-center justify-start px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                } ${!sidebarOpen && 'px-2'}`}
                onClick={() => setCurrentPage(item.id)}
              >
                <item.icon className='h-4 w-4' />
                {sidebarOpen && <span className='ml-2'>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Service Status */}
          {sidebarOpen && (
            <div className='border-t border-sidebar-border p-4'>
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium text-sidebar-foreground/70'>
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
                    <span className='text-sidebar-foreground'>OPA (PDP)</span>
                    <Badge
                      variant='default'
                      className={`h-4 text-xs ${
                        serviceStatus.opa
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {serviceStatus.opa ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <div className='flex items-center justify-between text-xs'>
                    <span className='text-sidebar-foreground'>
                      Preferences (PIP)
                    </span>
                    <Badge
                      variant='default'
                      className={`h-4 text-xs ${
                        serviceStatus.preferences
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {serviceStatus.preferences ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <div className='flex items-center justify-between text-xs'>
                    <span className='text-sidebar-foreground'>
                      SAM Local (PEP)
                    </span>
                    <Badge
                      variant='default'
                      className={`h-4 text-xs ${
                        serviceStatus.sam
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
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
        <header className='h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
          <div className='flex h-full items-center justify-between px-6'>
            <div className='flex items-center space-x-4'>
              <h1 className='text-xl font-semibold text-foreground'>
                {sidebarItems.find((item) => item.id === currentPage)?.label ||
                  'Dashboard'}
              </h1>
            </div>

            <div className='flex items-center space-x-2'>
              <Button variant='outline' size='sm' onClick={checkServiceStatus}>
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

              <ModeToggle />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className='flex-1 overflow-auto p-6'>
          {/* Persistent Metrics - Always Visible */}
          <div className='mb-6'>
            {/* All Policy Metrics in Single Row */}
            <h3 className='text-sm font-medium text-muted-foreground mb-3 flex items-center'>
              <Shield className='h-4 w-4 mr-2' />
              Policy Decision Monitoring
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
              {/* Auth Lambda - Gateway Authorization */}
              <Card className={`${getFlashClasses('auth')}`}>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground flex items-center'>
                    <Settings className='h-4 w-4 mr-2 text-primary' />
                    API Gateway
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-lg font-bold mb-1'>
                    {serviceMetrics.auth.count} decisions
                  </div>
                  <div className='flex space-x-2 mb-2'>
                    <Badge
                      variant='default'
                      className='text-xs bg-green-600 text-white hover:bg-green-700'
                    >
                      {serviceMetrics.auth.allows} Allow
                    </Badge>
                    <Badge variant='destructive' className='text-xs'>
                      {serviceMetrics.auth.denys} Deny
                    </Badge>
                  </div>
                  <div className='text-[10px] text-muted-foreground mb-1 truncate'>
                    {serviceMetrics.auth.lastActivity}
                  </div>
                  <Badge
                    variant={
                      serviceMetrics.auth.status === 'active'
                        ? 'default'
                        : 'secondary'
                    }
                    className='text-[10px] px-1 py-0'
                  >
                    {serviceMetrics.auth.status === 'active'
                      ? 'Active'
                      : 'Idle'}
                  </Badge>
                </CardContent>
              </Card>

              {/* Auth Policy Engine */}
              <Card className={`${getFlashClasses('auth')}`}>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground flex items-center'>
                    <Shield className='h-4 w-4 mr-2 text-primary' />
                    Authorization Policies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-lg font-bold mb-1'>
                    {serviceMetrics.auth.count} decisions
                  </div>
                  <div className='flex space-x-2 mb-2'>
                    <Badge
                      variant='default'
                      className='text-xs bg-green-600 text-white hover:bg-green-700'
                    >
                      {serviceMetrics.auth.allows} Allow
                    </Badge>
                    <Badge variant='destructive' className='text-xs'>
                      {serviceMetrics.auth.denys} Deny
                    </Badge>
                  </div>
                  <div className='text-xs text-muted-foreground mb-2 truncate'>
                    Automatic access control
                  </div>
                  <Badge
                    variant={
                      serviceMetrics.auth.status === 'active'
                        ? 'default'
                        : 'secondary'
                    }
                    className='text-xs'
                  >
                    {serviceMetrics.auth.status === 'active'
                      ? 'Protecting'
                      : 'Idle'}
                  </Badge>
                </CardContent>
              </Card>
              {/* Continue with Business Logic cards in same grid */}
              {/* DNC Policy Engine */}
              <Card className={`${getFlashClasses('pdp')}`}>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground flex items-center'>
                    <Terminal className='h-4 w-4 mr-2 text-primary' />
                    DNC Policy Engine
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-lg font-bold mb-1'>
                    {serviceMetrics.pdp.count} decisions
                  </div>
                  <div className='flex space-x-2 mb-2'>
                    <Badge
                      variant='default'
                      className='text-xs bg-green-600 text-white hover:bg-green-700'
                    >
                      {serviceMetrics.pdp.allows} Allow
                    </Badge>
                    <Badge variant='destructive' className='text-xs'>
                      {serviceMetrics.pdp.denys} Deny
                    </Badge>
                  </div>
                  <div className='text-xs text-muted-foreground mb-2 truncate'>
                    {serviceMetrics.pdp.lastActivity}
                  </div>
                  <Badge
                    variant={
                      serviceMetrics.pdp.status === 'active'
                        ? 'default'
                        : 'secondary'
                    }
                    className='text-xs'
                  >
                    {serviceMetrics.pdp.status === 'active' ? 'Active' : 'Idle'}
                  </Badge>
                </CardContent>
              </Card>

              {/* Data Services (PIP) */}
              <Card className={`${getFlashClasses('pip')}`}>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground flex items-center'>
                    <Database className='h-4 w-4 mr-2 text-primary' />
                    Data Services (PIP)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-lg font-bold mb-1'>
                    {serviceMetrics.pip.count} queries
                  </div>
                  <div className='text-xs text-muted-foreground mb-2 truncate'>
                    {serviceMetrics.pip.lastActivity}
                  </div>
                  <Badge
                    variant={
                      serviceMetrics.pip.status === 'active'
                        ? 'default'
                        : 'secondary'
                    }
                    className='text-xs'
                  >
                    {serviceMetrics.pip.status === 'active' ? 'Active' : 'Idle'}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Page-Specific Content */}

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
                      <h3 className='text-sm font-medium'>
                        Service Health Check
                      </h3>
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

          {currentPage === 'documentation' && (
            <div className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center space-x-2'>
                    <FileText className='h-5 w-5 text-primary' />
                    <span>API Documentation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue='preferences' className='w-full'>
                    <TabsList className='grid w-full grid-cols-2'>
                      <TabsTrigger value='preferences'>
                        Preferences Service
                      </TabsTrigger>
                      <TabsTrigger value='policies'>DNC Policy API</TabsTrigger>
                    </TabsList>

                    <TabsContent value='preferences' className='mt-6'>
                      {openApiSpecs.preferences ? (
                        <SwaggerUIComponent
                          spec={openApiSpecs.preferences}
                          title='Preferences Service API'
                        />
                      ) : (
                        <div className='text-center py-8'>
                          <p className='text-muted-foreground'>
                            Loading Preferences Service API documentation...
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value='policies' className='mt-6'>
                      {openApiSpecs.policies ? (
                        <SwaggerUIComponent
                          spec={openApiSpecs.policies}
                          title='DNC Policy API'
                        />
                      ) : (
                        <div className='text-center py-8'>
                          <p className='text-muted-foreground'>
                            Loading DNC Policy API documentation...
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  <div className='mt-6 p-4 bg-muted rounded-lg'>
                    <h4 className='font-medium text-foreground mb-2'>
                      API Documentation Overview
                    </h4>
                    <p className='text-sm text-muted-foreground'>
                      This section provides interactive API documentation for
                      the PBAC system services. Use the embedded Swagger UI
                      interfaces to explore endpoints, test requests, and
                      understand the API schemas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
