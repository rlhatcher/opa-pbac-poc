import { useState, useEffect, useCallback } from 'react'

interface ServiceMetrics {
  lastActivity: string
  count: number
  allows: number
  denys: number
  status: 'active' | 'idle'
}

interface MetricsData {
  apiGateway: ServiceMetrics
  authorizerLambda: ServiceMetrics
  opa: ServiceMetrics
  dncService: ServiceMetrics
}

interface FlashStates {
  apiGateway: 'allow' | 'deny' | null
  authorizerLambda: 'allow' | 'deny' | null
  opa: 'allow' | 'deny' | null
  dncService: 'allow' | 'deny' | null
}

interface DashboardData {
  pdpLogs: any[]
  appLogs: any[]
}

interface ServiceStatus {
  opa: boolean
  preferences: boolean
  sam: boolean
}

export function useMetrics(
  dashboardData: DashboardData,
  serviceStatus?: ServiceStatus
) {
  const [serviceMetrics, setServiceMetrics] = useState<MetricsData>({
    apiGateway: {
      lastActivity: 'No activity',
      count: 0,
      allows: 0,
      denys: 0,
      status: 'idle'
    },
    authorizerLambda: {
      lastActivity: 'No activity',
      count: 0,
      allows: 0,
      denys: 0,
      status: 'idle'
    },
    opa: {
      lastActivity: 'No activity',
      count: 0,
      allows: 0,
      denys: 0,
      status: 'idle'
    },
    dncService: {
      lastActivity: 'No activity',
      count: 0,
      allows: 0,
      denys: 0,
      status: 'idle'
    }
  })

  const [flashStates, setFlashStates] = useState<FlashStates>({
    apiGateway: null,
    authorizerLambda: null,
    opa: null,
    dncService: null
  })

  // Trigger flash animation
  const triggerFlash = useCallback(
    (service: keyof FlashStates, type: 'allow' | 'deny') => {
      setFlashStates((prev) => ({ ...prev, [service]: type }))
      setTimeout(() => {
        setFlashStates((prev) => ({ ...prev, [service]: null }))
      }, 500) // Reduced from 1000ms to 500ms for less intrusive flashing
    },
    []
  )

  // Update service metrics
  const updateServiceMetrics = useCallback(() => {
    // Store previous metrics for comparison
    setServiceMetrics((prevMetrics) => {
      // Analyze Auth logs - look for authorization-related logs
      // First, separate DNC logs (more specific filter)
      const allDncLogs = dashboardData.pdpLogs.filter(
        (log) =>
          log.policy?.includes('dnc') || log.policy?.includes('policies.dnc')
      )

      // Then, auth logs (excluding DNC logs to prevent overlap)
      const allAuthLogs = dashboardData.pdpLogs.filter(
        (log) =>
          (log.policy?.includes('authz') || log.message?.includes('auth')) &&
          !(log.policy?.includes('dnc') || log.policy?.includes('policies.dnc'))
      )

      const lastAuthLog = allAuthLogs[0]
      const lastDncLog = allDncLogs[0]

      const authActivity = lastAuthLog
        ? `${lastAuthLog.decision} - Authorization`
        : 'No authorization activity'

      const authAllows = allAuthLogs.filter(
        (log) => log.decision?.toUpperCase() === 'ALLOW'
      ).length
      const authDenys = allAuthLogs.filter(
        (log) => log.decision?.toUpperCase() === 'DENY'
      ).length

      const dncActivity = lastDncLog
        ? `${lastDncLog.result?.can_contact ? 'ALLOW' : 'DENY'} - DNC policy`
        : 'No DNC activity'

      const dncAllowLogs = allDncLogs.filter(
        (log) => log.result?.can_contact === true
      )
      const dncDenyLogs = allDncLogs.filter(
        (log) => log.result?.can_contact === false
      )

      const dncAllows = dncAllowLogs.length
      const dncDenys = dncDenyLogs.length

      // Note: PIP and PEP analysis removed as they're not part of the core SAM/Lambda/OPA architecture

      const newMetrics = {
        apiGateway: {
          lastActivity: 'API Gateway requests',
          count: allAuthLogs.length + allDncLogs.length,
          allows: authAllows + dncAllows,
          denys: authDenys + dncDenys,
          status: lastAuthLog || lastDncLog ? 'active' : 'idle'
        },
        authorizerLambda: {
          lastActivity: authActivity,
          count: allAuthLogs.length,
          allows: authAllows,
          denys: authDenys,
          status: lastAuthLog ? 'active' : 'idle'
        },
        opa: {
          lastActivity: 'OPA policy evaluations',
          count: allAuthLogs.length + allDncLogs.length,
          allows: authAllows + dncAllows,
          denys: authDenys + dncDenys,
          status: serviceStatus?.opa ? 'active' : 'idle'
        },
        dncService: {
          lastActivity: dncActivity,
          count: allDncLogs.length,
          allows: dncAllows,
          denys: dncDenys,
          status: lastDncLog ? 'active' : 'idle'
        }
      } as MetricsData

      // Detect changes and trigger flash animations
      if (newMetrics.apiGateway.allows > prevMetrics.apiGateway.allows) {
        triggerFlash('apiGateway', 'allow')
      } else if (newMetrics.apiGateway.denys > prevMetrics.apiGateway.denys) {
        triggerFlash('apiGateway', 'deny')
      }

      if (
        newMetrics.authorizerLambda.allows > prevMetrics.authorizerLambda.allows
      ) {
        triggerFlash('authorizerLambda', 'allow')
      } else if (
        newMetrics.authorizerLambda.denys > prevMetrics.authorizerLambda.denys
      ) {
        triggerFlash('authorizerLambda', 'deny')
      }

      if (newMetrics.opa.allows > prevMetrics.opa.allows) {
        triggerFlash('opa', 'allow')
      } else if (newMetrics.opa.denys > prevMetrics.opa.denys) {
        triggerFlash('opa', 'deny')
      }

      if (newMetrics.dncService.allows > prevMetrics.dncService.allows) {
        triggerFlash('dncService', 'allow')
      } else if (newMetrics.dncService.denys > prevMetrics.dncService.denys) {
        triggerFlash('dncService', 'deny')
      }

      return newMetrics
    })
  }, [dashboardData.pdpLogs, dashboardData.appLogs, triggerFlash])

  // Update metrics when data changes
  useEffect(() => {
    updateServiceMetrics()
  }, [updateServiceMetrics])

  return {
    serviceMetrics,
    flashStates,
    updateServiceMetrics
  }
}
