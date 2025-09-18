import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { ScrollArea } from '../../ui/scroll-area'
import { ActionButton } from '../../shared/ActionButton'
import { PDPLogs } from '../../quadrants/PDPLogs'
import { Trash2 } from 'lucide-react'

interface DecisionsPageProps {
  logs: any[]
  onClearLogs: () => void
}

export function DecisionsPage({ logs, onClearLogs }: DecisionsPageProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Policy Decision Logs</CardTitle>
          <ActionButton
            icon={Trash2}
            label="Clear Logs"
            onClick={onClearLogs}
            variant="outline"
          />
        </div>
      </CardHeader>
      <CardContent className="h-full p-4">
        <ScrollArea className="h-full">
          <PDPLogs logs={logs} />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
