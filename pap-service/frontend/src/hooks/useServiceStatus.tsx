import { useState, useCallback } from 'react'

interface ServiceStatus {
  opa: boolean
  preferences: boolean
  sam: boolean
}

export function useServiceStatus(papServiceUrl: string) {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    opa: false,
    preferences: false,
    sam: false
  })

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
            headers: { 'Content-Type': 'application/json' }
          })
          const data = await response.json()
          return {
            key: service.key,
            status: response.ok && data.status === 'healthy',
            name: service.name,
            data
          }
        } catch (error) {
          return {
            key: service.key,
            status: false,
            name: service.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )

    setServiceStatus((prevStatus) => {
      const newStatus = { ...prevStatus }
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
      return newStatus
    })
  }, [papServiceUrl])

  return {
    serviceStatus,
    checkServiceStatus
  }
}
