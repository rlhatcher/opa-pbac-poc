import { useState } from 'react'
import { Socket } from 'socket.io-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { RefreshCw, Plus, Save } from 'lucide-react'
import { Badge } from '../ui/badge'

interface PIPData {
  companies: Record<string, any>
  countries: Record<string, any>
  preferences: Record<string, any>
}

interface PIPDataManagerProps {
  data: PIPData
  socket: Socket | null
}

export function PIPDataManager({ data, socket }: PIPDataManagerProps) {
  const [editingData, setEditingData] = useState<PIPData>(data)
  const [isLoading, setIsLoading] = useState(false)

  const refreshData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/pip/data')
      const newData = await response.json()
      setEditingData(newData)
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveCompanies = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/pip/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingData.companies)
      })

      if (response.ok) {
        console.log('Companies data saved successfully')
      }
    } catch (error) {
      console.error('Failed to save companies data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveCountries = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/pip/countries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingData.countries)
      })

      if (response.ok) {
        console.log('Countries data saved successfully')
      }
    } catch (error) {
      console.error('Failed to save countries data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addCompany = () => {
    const name = prompt('Enter company name:')
    if (name) {
      const id = `comp_${Date.now()}`
      setEditingData((prev) => ({
        ...prev,
        companies: {
          ...prev.companies,
          [id]: { name, id, dnc: true }
        }
      }))
    }
  }

  const addCountry = () => {
    const code = prompt('Enter country code (e.g., CN):')
    const name = prompt('Enter country name:')
    if (code && name) {
      setEditingData((prev) => ({
        ...prev,
        countries: {
          ...prev.countries,
          [code]: { code, name, sanctioned: true }
        }
      }))
    }
  }

  return (
    <div className='h-full flex flex-col'>
      <Tabs defaultValue='companies' className='flex-1 flex flex-col'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='companies'>Companies</TabsTrigger>
          <TabsTrigger value='countries'>Countries</TabsTrigger>
          <TabsTrigger value='preferences'>Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value='companies' className='flex-1 mt-4'>
          <Card className='h-full'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>DNC Companies</CardTitle>
                <div className='flex space-x-2'>
                  <Button variant='outline' size='sm' onClick={addCompany}>
                    <Plus className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={saveCompanies}
                    disabled={isLoading}
                  >
                    <Save className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={refreshData}
                    disabled={isLoading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className='h-full overflow-auto'>
              <pre className='text-xs bg-muted p-4 rounded-md overflow-auto h-full'>
                {JSON.stringify(editingData.companies, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='countries' className='flex-1 mt-4'>
          <Card className='h-full'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>DNC Countries</CardTitle>
                <div className='flex space-x-2'>
                  <Button variant='outline' size='sm' onClick={addCountry}>
                    <Plus className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={saveCountries}
                    disabled={isLoading}
                  >
                    <Save className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={refreshData}
                    disabled={isLoading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className='h-full overflow-auto'>
              <pre className='text-xs bg-muted p-4 rounded-md overflow-auto h-full'>
                {JSON.stringify(editingData.countries, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='preferences' className='flex-1 mt-4'>
          <Card className='h-full'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>Expert Preferences</CardTitle>
                <div className='flex space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={refreshData}
                    disabled={isLoading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className='h-full overflow-auto'>
              <div className='text-sm text-muted-foreground mb-4'>
                Expert preferences are managed via the Preferences API service.
                <br />
                <a
                  href='http://localhost:3002'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-primary hover:underline'
                >
                  Open Preferences Service →
                </a>
              </div>
              <pre className='text-xs bg-muted p-4 rounded-md overflow-auto h-full'>
                {JSON.stringify(editingData.preferences, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
