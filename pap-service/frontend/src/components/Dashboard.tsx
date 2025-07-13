import { useState, useEffect } from 'react'
import { Zap, Shield, Database, Terminal, FileText } from 'lucide-react'

// Layout Components
import { DashboardLayout } from './layout/DashboardLayout'
import { Sidebar } from './layout/Sidebar'
import { Header } from './layout/Header'
import { MetricsBar } from './layout/MetricsBar'
import { PageContainer } from './layout/PageContainer'

// Feature Pages
import { PolicyTestingPage } from './features/policy-testing/PolicyTestingPage'
import { DecisionsPage } from './features/decisions/DecisionsPage'
import { DataManagementPage } from './features/data-management/DataManagementPage'
import { LogsPage } from './features/logs/LogsPage'
import { DocumentationViewer } from './features/documentation/DocumentationViewer'

// Custom Hooks
import { useSocketConnection } from '../hooks/useSocketConnection'
import { useServiceStatus } from '../hooks/useServiceStatus'
import { useDashboardData } from '../hooks/useDashboardData'
import { useMetrics } from '../hooks/useMetrics'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

const sidebarItems = [
  { id: 'testing', label: 'Policy Testing', icon: Zap },
  { id: 'decisions', label: 'Decisions', icon: Shield },
  { id: 'data', label: 'Data Management', icon: Database },
  { id: 'logs', label: 'Logs', icon: Terminal },
  { id: 'documentation', label: 'Documentation', icon: FileText },
  { id: 'api-docs', label: 'API Documentation', icon: FileText }
]

export function Dashboard() {
  // Get PAP service URL from environment variables
  const papServiceUrl =
    import.meta.env.VITE_PAP_SERVICE_URL || 'http://localhost:3004'

  // Local state
  const [currentPage, setCurrentPage] = useState('testing')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Custom hooks
  const { serviceStatus, checkServiceStatus } = useServiceStatus(papServiceUrl)

  const {
    dashboardData,
    isLoading,
    fetchDashboardData,
    handlePdpLog,
    handlePepRequest,
    handleDashboardUpdate,
    clearLogs
  } = useDashboardData(papServiceUrl)

  // Always call the socket hook but conditionally enable it
  const socketEnabled = import.meta.env.VITE_SOCKET_ENABLED === 'true'
  const { socket } = useSocketConnection({
    url: papServiceUrl,
    onPdpLog: handlePdpLog,
    onPepRequest: handlePepRequest,
    onDashboardUpdate: handleDashboardUpdate,
    enabled: socketEnabled
  })

  const { serviceMetrics, flashStates } = useMetrics(
    dashboardData,
    serviceStatus
  )

  // Auto-refresh for dashboard data
  // Reduce refresh frequency when socket is enabled since we get real-time updates
  const refreshInterval = socketEnabled ? 60000 : 30000 // 60s with socket, 30s without
  useAutoRefresh({
    enabled: true,
    interval: refreshInterval,
    onRefresh: async () => {
      // Use the existing fetchDashboardData function for consistency
      await fetchDashboardData()
    }
  })

  // Health check on mount and interval
  useEffect(() => {
    checkServiceStatus()
    const healthCheckInterval = setInterval(checkServiceStatus, 30000)
    return () => clearInterval(healthCheckInterval)
  }, [checkServiceStatus])

  // Get current page title
  const getCurrentPageTitle = () => {
    const item = sidebarItems.find((item) => item.id === currentPage)
    return item?.label || 'Dashboard'
  }

  // Handle clear logs
  const handleClearLogs = (logType: 'pepRequests' | 'pdpLogs' | 'appLogs') => {
    clearLogs(logType)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className='flex items-center justify-center w-full h-full'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
            <p className='text-muted-foreground'>Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Sidebar */}
      <Sidebar
        items={sidebarItems}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        serviceStatus={serviceStatus}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Header */}
        <Header
          title={getCurrentPageTitle()}
          onRefresh={fetchDashboardData}
          isRefreshing={isLoading}
        />

        {/* Metrics Bar */}
        <MetricsBar metrics={serviceMetrics} flashStates={flashStates} />

        {/* Page Content */}
        <PageContainer>
          {currentPage === 'testing' && <PolicyTestingPage socket={socket} />}

          {currentPage === 'decisions' && (
            <DecisionsPage
              logs={dashboardData.pdpLogs}
              onClearLogs={() => handleClearLogs('pdpLogs')}
            />
          )}

          {currentPage === 'data' && (
            <DataManagementPage data={dashboardData.pipData} socket={socket} />
          )}

          {currentPage === 'logs' && (
            <LogsPage
              logs={dashboardData.appLogs}
              onClearLogs={() => handleClearLogs('appLogs')}
            />
          )}

          {currentPage === 'documentation' && <DocumentationViewer />}
        </PageContainer>
      </div>
    </DashboardLayout>
  )
}
