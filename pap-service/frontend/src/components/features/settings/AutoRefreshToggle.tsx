import { Button } from '../../ui/button'

interface AutoRefreshToggleProps {
  enabled: boolean
  onToggle: () => void
}

export function AutoRefreshToggle({ enabled, onToggle }: AutoRefreshToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium">Auto Refresh</h3>
        <p className="text-xs text-muted-foreground">
          Automatically refresh service status and logs
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onToggle}>
        {enabled ? 'Enabled' : 'Disabled'}
      </Button>
    </div>
  )
}
