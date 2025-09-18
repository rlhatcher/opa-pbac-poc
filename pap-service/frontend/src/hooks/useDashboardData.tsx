import { useState, useEffect, useCallback } from 'react'

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

export function useDashboardData(papServiceUrl: string) {
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

  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Fetch initial data
  const fetchDashboardData = useCallback(async () => {
    try {
      // Only show loading spinner on initial load, not on auto-refresh
      if (isInitialLoad) {
        setIsLoading(true)
      }
      const response = await fetch(`${papServiceUrl}/api/dashboard-data`)
      if (response.ok) {
        const data = await response.json()
        // Only update if data has actually changed to prevent unnecessary re-renders
        setDashboardData((prev) => {
          const hasChanged =
            JSON.stringify(prev.pdpLogs) !== JSON.stringify(data.pdpLogs) ||
            JSON.stringify(prev.appLogs) !== JSON.stringify(data.appLogs) ||
            JSON.stringify(prev.pipData) !== JSON.stringify(data.pipData)

          return hasChanged ? data : prev
        })
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      if (isInitialLoad) {
        setIsLoading(false)
        setIsInitialLoad(false)
      }
    }
  }, [papServiceUrl, isInitialLoad])

  // Update data handlers for real-time updates
  const handlePdpLog = useCallback((logEntry: any) => {
    setDashboardData((prev) => ({
      ...prev,
      pdpLogs: [logEntry, ...prev.pdpLogs.slice(0, 99)] // Keep last 100
    }))
  }, [])

  const handlePepRequest = useCallback((requestEntry: any) => {
    setDashboardData((prev) => ({
      ...prev,
      pepRequests: [requestEntry, ...prev.pepRequests.slice(0, 49)] // Keep last 50
    }))
  }, [])

  const handleDashboardUpdate = useCallback((data: DashboardData) => {
    setDashboardData(data)
  }, [])

  // Clear logs function
  const clearLogs = useCallback(
    (logType: 'pepRequests' | 'pdpLogs' | 'appLogs') => {
      setDashboardData((prev) => ({
        ...prev,
        [logType]: []
      }))
    },
    []
  )

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return {
    dashboardData,
    isLoading,
    fetchDashboardData,
    handlePdpLog,
    handlePepRequest,
    handleDashboardUpdate,
    clearLogs,
    setDashboardData
  }
}
