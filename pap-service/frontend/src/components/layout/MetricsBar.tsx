import { MetricCard } from '../shared/MetricCard'
import { Shield, Database, Terminal, Activity } from 'lucide-react'

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

interface MetricsBarProps {
  metrics: MetricsData
  flashStates: FlashStates
}

export function MetricsBar({ metrics, flashStates }: MetricsBarProps) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-b border-border'>
      {/* API Gateway (SAM) */}
      <MetricCard
        title='API Gateway (SAM)'
        icon={Shield}
        count={metrics.apiGateway.count}
        allows={metrics.apiGateway.allows}
        denys={metrics.apiGateway.denys}
        status={metrics.apiGateway.status}
        lastActivity={metrics.apiGateway.lastActivity}
        flashState={flashStates.apiGateway}
      />

      {/* Authorizer Lambda */}
      <MetricCard
        title='Authorizer Lambda'
        icon={Activity}
        count={metrics.authorizerLambda.count}
        allows={metrics.authorizerLambda.allows}
        denys={metrics.authorizerLambda.denys}
        status={metrics.authorizerLambda.status}
        lastActivity={metrics.authorizerLambda.lastActivity}
        flashState={flashStates.authorizerLambda}
      />

      {/* OPA Policy Engine */}
      <MetricCard
        title='OPA Policy Engine'
        icon={Database}
        count={metrics.opa.count}
        allows={metrics.opa.allows}
        denys={metrics.opa.denys}
        status={metrics.opa.status}
        lastActivity={metrics.opa.lastActivity}
        flashState={flashStates.opa}
      />

      {/* DNC Service */}
      <MetricCard
        title='DNC Service'
        icon={Terminal}
        count={metrics.dncService.count}
        allows={metrics.dncService.allows}
        denys={metrics.dncService.denys}
        status={metrics.dncService.status}
        lastActivity={metrics.dncService.lastActivity}
        flashState={flashStates.dncService}
      />
    </div>
  )
}
