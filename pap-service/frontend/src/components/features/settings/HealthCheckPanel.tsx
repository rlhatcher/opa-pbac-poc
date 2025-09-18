import { Button } from '../../ui/button'

interface HealthCheckPanelProps {
  onCheck: () => void
}

export function HealthCheckPanel({ onCheck }: HealthCheckPanelProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium">Service Health Check</h3>
        <p className="text-xs text-muted-foreground">
          Check the status of all PBAC services
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onCheck}>
        Check Now
      </Button>
    </div>
  )
}
