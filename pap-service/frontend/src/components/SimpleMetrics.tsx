import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Database,
  Activity
} from 'lucide-react'

interface MetricsData {
  totalRequests: number
  allowedRequests: number
  deniedRequests: number
  avgResponseTime: number
  uptime: number
}

interface ServiceStatus {
  opa: boolean
  preferences: boolean
  sam: boolean
}

interface SimpleMetricsProps {
  metrics: MetricsData
  logs: any[]
  serviceStatus: ServiceStatus
}

export function SimpleMetrics({
  metrics,
  logs,
  serviceStatus
}: SimpleMetricsProps) {
  const allowRate =
    metrics.totalRequests > 0
      ? ((metrics.allowedRequests / metrics.totalRequests) * 100).toFixed(1)
      : '0'

  const recentLogs = logs.slice(-10)
  const recentAllowed = recentLogs.filter((log) => log.result === true).length
  const recentDenied = recentLogs.length - recentAllowed

  // Helper function to get badge props based on service status
  const getServiceBadge = (isOnline: boolean) => ({
    variant: (isOnline ? 'default' : 'destructive') as
      | 'default'
      | 'destructive',
    text: isOnline ? 'Online' : 'Offline',
    className: isOnline ? 'bg-green-600 text-white hover:bg-green-700' : ''
  })

  return (
    <div className='space-y-6'>
      {/* Key Metrics Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{metrics.totalRequests}</div>
            <div className='flex items-center mt-2'>
              <Badge variant='secondary' className='text-xs'>
                <TrendingUp className='h-3 w-3 mr-1' />
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              Allow Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{allowRate}%</div>
            <div className='flex items-center mt-2'>
              <Badge variant='secondary' className='text-xs'>
                <TrendingUp className='h-3 w-3 mr-1' />
                Good
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {metrics.avgResponseTime}ms
            </div>
            <div className='flex items-center mt-2'>
              <Badge variant='secondary' className='text-xs'>
                <TrendingDown className='h-3 w-3 mr-1' />
                Fast
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              System Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {metrics.uptime.toFixed(1)}%
            </div>
            <div className='flex items-center mt-2'>
              <Badge variant='secondary' className='text-xs'>
                <Minus className='h-3 w-3 mr-1' />
                Stable
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <Shield className='h-5 w-5 text-primary' />
              <span>Recent Policy Decisions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div className='flex justify-between items-center'>
                <span className='text-sm text-muted-foreground'>
                  Last 10 requests
                </span>
                <div className='flex space-x-2'>
                  <Badge variant='default'>{recentAllowed} Allowed</Badge>
                  <Badge variant='destructive'>{recentDenied} Denied</Badge>
                </div>
              </div>
              <div className='w-full bg-muted rounded-full h-2'>
                <div
                  className='bg-primary h-2 rounded-full'
                  style={{
                    width: `${
                      recentLogs.length > 0
                        ? (recentAllowed / recentLogs.length) * 100
                        : 0
                    }%`
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <Activity className='h-5 w-5 text-primary' />
              <span>Service Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div className='flex justify-between items-center'>
                <div className='flex items-center space-x-2'>
                  <Shield className='h-4 w-4 text-primary' />
                  <span className='text-sm'>OPA (PDP)</span>
                </div>
                <Badge
                  variant={getServiceBadge(serviceStatus.opa).variant}
                  className={getServiceBadge(serviceStatus.opa).className}
                >
                  {getServiceBadge(serviceStatus.opa).text}
                </Badge>
              </div>
              <div className='flex justify-between items-center'>
                <div className='flex items-center space-x-2'>
                  <Database className='h-4 w-4 text-primary' />
                  <span className='text-sm'>Preferences (PIP)</span>
                </div>
                <Badge
                  variant={getServiceBadge(serviceStatus.preferences).variant}
                  className={
                    getServiceBadge(serviceStatus.preferences).className
                  }
                >
                  {getServiceBadge(serviceStatus.preferences).text}
                </Badge>
              </div>
              <div className='flex justify-between items-center'>
                <div className='flex items-center space-x-2'>
                  <Activity className='h-4 w-4 text-primary' />
                  <span className='text-sm'>SAM Local (PEP)</span>
                </div>
                <Badge
                  variant={getServiceBadge(serviceStatus.sam).variant}
                  className={getServiceBadge(serviceStatus.sam).className}
                >
                  {getServiceBadge(serviceStatus.sam).text}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
