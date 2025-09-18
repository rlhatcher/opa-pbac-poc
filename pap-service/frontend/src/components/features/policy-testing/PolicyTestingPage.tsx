import { Card, CardContent } from '../../ui/card'
import { PEPInterface } from '../../quadrants/PEPInterface'
import { Socket } from 'socket.io-client'

interface PolicyTestingPageProps {
  socket: Socket | null
}

export function PolicyTestingPage({ socket }: PolicyTestingPageProps) {
  return (
    <Card className="h-full">
      <CardContent className="h-full p-6">
        <PEPInterface socket={socket} />
      </CardContent>
    </Card>
  )
}
