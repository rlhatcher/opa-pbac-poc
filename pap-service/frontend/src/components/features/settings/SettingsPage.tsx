import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { AutoRefreshToggle } from './AutoRefreshToggle'
import { HealthCheckPanel } from './HealthCheckPanel'

interface SettingsPageProps {
  autoRefresh: boolean
  onToggleAutoRefresh: () => void
  onHealthCheck: () => void
}

export function SettingsPage({
  autoRefresh,
  onToggleAutoRefresh,
  onHealthCheck
}: SettingsPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <AutoRefreshToggle
            enabled={autoRefresh}
            onToggle={onToggleAutoRefresh}
          />
          <HealthCheckPanel onCheck={onHealthCheck} />
        </div>
      </CardContent>
    </Card>
  )
}
