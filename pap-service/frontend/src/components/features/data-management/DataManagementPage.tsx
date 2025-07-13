import { Card, CardContent } from '../../ui/card'
import { PIPDataManager } from '../../quadrants/PIPDataManager'
import { Socket } from 'socket.io-client'

interface DataManagementPageProps {
  data: {
    companies: any
    countries: any
    preferences: any
  }
  socket: Socket | null
}

export function DataManagementPage({ data, socket }: DataManagementPageProps) {
  return (
    <Card className="h-full">
      <CardContent className="h-full p-6">
        <PIPDataManager data={data} socket={socket} />
      </CardContent>
    </Card>
  )
}
