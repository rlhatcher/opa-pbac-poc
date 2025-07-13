import { useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table'
import { RefreshCw, Database, Users, Globe } from 'lucide-react'

interface PIPData {
  companies: Record<string, any>
  countries: Record<string, any>
  preferences: Record<string, any>
}

interface PIPDataManagerProps {
  data: PIPData
  socket: Socket | null
}

export function PIPDataManager({
  data: _data,
  socket: _socket
}: PIPDataManagerProps) {
  // Get PAP service URL from environment variables, fallback to localhost for development
  // const papServiceUrl =
  //   import.meta.env.VITE_PAP_SERVICE_URL || 'http://localhost:3004'

  const [editingData, setEditingData] = useState<PIPData>({
    companies: {},
    countries: {},
    preferences: {}
  })
  const [isLoading, setIsLoading] = useState(false)

  // Load data from JSON files on component mount
  useEffect(() => {
    const loadDataFromFiles = async () => {
      setIsLoading(true)
      try {
        // Load companies data
        const companiesResponse = await fetch('/dnc_companies.json')
        const companiesData = await companiesResponse.json()

        // Load countries data
        const countriesResponse = await fetch('/dnc_countries.json')
        const countriesData = await countriesResponse.json()

        // Load preferences data
        const preferencesResponse = await fetch('/static-preferences.json')
        const preferencesData = await preferencesResponse.json()

        setEditingData({
          companies: companiesData.companies || companiesData,
          countries: countriesData.countries || countriesData,
          preferences: preferencesData
        })
      } catch (error) {
        console.error('Failed to load data from files:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDataFromFiles()
  }, [])

  const refreshData = async () => {
    setIsLoading(true)
    try {
      // Reload data from JSON files
      const companiesResponse = await fetch('/dnc_companies.json')
      const companiesData = await companiesResponse.json()

      const countriesResponse = await fetch('/dnc_countries.json')
      const countriesData = await countriesResponse.json()

      const preferencesResponse = await fetch('/static-preferences.json')
      const preferencesData = await preferencesResponse.json()

      setEditingData({
        companies: companiesData.companies || companiesData,
        countries: countriesData.countries || countriesData,
        preferences: preferencesData
      })
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // TODO: Implement save functionality
  // const saveCompanies = async () => {
  //   setIsLoading(true)
  //   try {
  //     // Save to localStorage for now (since we can't write to disk from browser)
  //     localStorage.setItem(
  //       'dnc_companies',
  //       JSON.stringify(editingData.companies)
  //     )
  //     console.log('Companies data saved to localStorage')
  //   } catch (error) {
  //     console.error('Failed to save companies data:', error)
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  // TODO: Implement save functionality
  // const saveCountries = async () => {
  //   setIsLoading(true)
  //   try {
  //     const response = await fetch(`${papServiceUrl}/api/pip/countries`, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(editingData.countries)
  //     })

  //     if (response.ok) {
  //       console.log('Countries data saved successfully')
  //     }
  //   } catch (error) {
  //     console.error('Failed to save countries data:', error)
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  // TODO: Implement add functionality
  // const addCompany = () => {
  //   const name = prompt('Enter company name:')
  //   if (name) {
  //     const id = `comp_${Date.now()}`
  //     setEditingData((prev) => ({
  //       ...prev,
  //       companies: {
  //         ...prev.companies,
  //         [id]: { name, id, dnc: true }
  //       }
  //     }))
  //   }
  // }

  // TODO: Implement add functionality
  // const addCountry = () => {
  //   const code = prompt('Enter country code (e.g., CN):')
  //   const name = prompt('Enter country name:')
  //   if (code && name) {
  //     setEditingData((prev) => ({
  //       ...prev,
  //       countries: {
  //         ...prev.countries,
  //         [code]: { code, name, sanctioned: true }
  //       }
  //     }))
  //   }
  // }

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
                <div className='flex items-center space-x-2'>
                  <Database className='h-5 w-5 text-primary' />
                  <CardTitle>DNC Companies</CardTitle>
                  <Badge variant='outline' className='text-xs'>
                    {Object.keys(editingData.companies).length} companies
                  </Badge>
                </div>
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
              <p className='text-sm text-muted-foreground'>
                Companies that experts should not be contacted about due to
                restrictions
              </p>
            </CardHeader>
            <CardContent className='h-full'>
              <ScrollArea className='h-[400px] w-full'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Added Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(editingData.companies).map(
                      ([id, company]: [string, any]) => (
                        <TableRow key={id}>
                          <TableCell className='font-mono text-xs'>
                            {company.id}
                          </TableCell>
                          <TableCell className='font-medium'>
                            {company.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant='outline' className='text-xs'>
                              {company.category}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-sm text-muted-foreground max-w-xs truncate'>
                            {company.reason}
                          </TableCell>
                          <TableCell className='text-xs text-muted-foreground'>
                            {company.added_date}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='countries' className='flex-1 mt-4'>
          <Card className='h-full'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <Globe className='h-5 w-5 text-primary' />
                  <CardTitle>DNC Countries</CardTitle>
                  <Badge variant='outline' className='text-xs'>
                    {Object.keys(editingData.countries).length} countries
                  </Badge>
                </div>
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
              <p className='text-sm text-muted-foreground'>
                Countries with sanctions or restrictions that prevent expert
                contact
              </p>
            </CardHeader>
            <CardContent className='h-full'>
              <ScrollArea className='h-[400px] w-full'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Added Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(editingData.countries).map(
                      ([id, country]: [string, any]) => (
                        <TableRow key={id}>
                          <TableCell className='font-mono text-xs font-bold'>
                            {country.id}
                          </TableCell>
                          <TableCell className='font-medium'>
                            {country.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant='outline' className='text-xs'>
                              {country.category}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-sm text-muted-foreground max-w-xs truncate'>
                            {country.reason}
                          </TableCell>
                          <TableCell className='text-xs text-muted-foreground'>
                            {country.added_date}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='preferences' className='flex-1 mt-4'>
          <Card className='h-full'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <Users className='h-5 w-5 text-primary' />
                  <CardTitle>Expert Preferences</CardTitle>
                  <Badge variant='outline' className='text-xs'>
                    {Object.keys(editingData.preferences).length} experts
                  </Badge>
                </div>
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
              <p className='text-sm text-muted-foreground'>
                Expert project type preferences fetched from the Preferences API
                service
              </p>
            </CardHeader>
            <CardContent className='h-full'>
              <ScrollArea className='h-[400px] w-full'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expert ID</TableHead>
                      <TableHead>Contact Allowed</TableHead>
                      <TableHead>Exclusions</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(editingData.preferences).map(
                      ([id, expert]: [string, any]) => (
                        <TableRow key={id}>
                          <TableCell className='font-mono text-xs'>
                            {expert.expert_id}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                expert.contact_allowed
                                  ? 'default'
                                  : 'destructive'
                              }
                              className={`text-xs ${
                                expert.contact_allowed
                                  ? 'bg-green-600 hover:bg-green-700'
                                  : ''
                              }`}
                            >
                              {expert.contact_allowed ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-sm'>
                            {expert.exclusions?.length > 0 ? (
                              <div className='flex flex-wrap gap-1'>
                                {expert.exclusions
                                  .slice(0, 2)
                                  .map((exclusion: string, idx: number) => (
                                    <Badge
                                      key={idx}
                                      variant='outline'
                                      className='text-xs'
                                    >
                                      {exclusion === '*' ? 'All' : exclusion}
                                    </Badge>
                                  ))}
                                {expert.exclusions.length > 2 && (
                                  <Badge variant='outline' className='text-xs'>
                                    +{expert.exclusions.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className='text-muted-foreground text-xs'>
                                None
                              </span>
                            )}
                          </TableCell>
                          <TableCell className='text-xs text-muted-foreground'>
                            {expert.last_updated
                              ? new Date(
                                  expert.last_updated
                                ).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell className='text-sm text-muted-foreground max-w-xs truncate'>
                            {expert.notes || 'No notes'}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
