import { useState } from 'react'
import { Socket } from 'socket.io-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Copy, RotateCcw } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'

interface PEPInterfaceProps {
  socket: Socket | null
}

export function PEPInterface({ socket }: PEPInterfaceProps) {
  const [latestResponse, setLatestResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testDNCPolicy = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const expert = {
        id: formData.get('expertId') as string,
        current_company_id: (formData.get('companyId') as string) || undefined,
        country_id: (formData.get('countryId') as string) || undefined
      }

      const project = {
        type: formData.get('projectType') as string
      }

      const response = await fetch('/api/pep/test-dnc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expert, project })
      })

      const result = await response.json()
      setLatestResponse(result)
    } catch (error) {
      setLatestResponse({ error: (error as Error).message })
    } finally {
      setIsLoading(false)
    }
  }

  const testAuthzPolicy = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const method = formData.get('method') as string
      const path = (formData.get('path') as string)
        .split(',')
        .map((s) => s.trim())
      const roles = (formData.get('roles') as string)
        .split(',')
        .map((s) => s.trim())
        .filter((r) => r)

      const token = {
        payload: {
          sub: formData.get('subject') as string,
          roles: roles
        }
      }

      const response = await fetch('/api/pep/test-authz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, path, token })
      })

      const result = await response.json()
      setLatestResponse(result)
    } catch (error) {
      setLatestResponse({ error: (error as Error).message })
    } finally {
      setIsLoading(false)
    }
  }

  const copyResponse = () => {
    if (latestResponse) {
      navigator.clipboard.writeText(JSON.stringify(latestResponse, null, 2))
    }
  }

  const clearResponse = () => {
    setLatestResponse(null)
  }

  return (
    <div className='h-full flex flex-col'>
      <Tabs defaultValue='api-docs' className='flex-1 flex flex-col'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='api-docs'>API Docs</TabsTrigger>
          <TabsTrigger value='quick-test'>Quick Test</TabsTrigger>
          <TabsTrigger value='response'>Response</TabsTrigger>
        </TabsList>

        <TabsContent value='api-docs' className='flex-1 mt-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>
                Policy API Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div>
                  <h4 className='font-semibold mb-2'>DNC Policy Endpoint</h4>
                  <code className='text-sm bg-muted p-2 rounded block'>
                    POST /v1/data/policies/dnc/can_contact
                  </code>
                  <p className='text-sm text-muted-foreground mt-2'>
                    Evaluates whether an expert can be contacted for a project
                    based on DNC restrictions.
                  </p>
                </div>
                <div>
                  <h4 className='font-semibold mb-2'>
                    Authorization Policy Endpoint
                  </h4>
                  <code className='text-sm bg-muted p-2 rounded block'>
                    POST /v1/data/policies/authz/allow
                  </code>
                  <p className='text-sm text-muted-foreground mt-2'>
                    Evaluates API access permissions based on JWT token and
                    request context.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='quick-test' className='flex-1 mt-4'>
          <Tabs defaultValue='dnc' className='h-full'>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='dnc'>DNC Policy</TabsTrigger>
              <TabsTrigger value='authz'>Authorization</TabsTrigger>
            </TabsList>

            <TabsContent value='dnc' className='mt-4'>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  testDNCPolicy(new FormData(e.currentTarget))
                }}
                className='space-y-4'
              >
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='expertId'>Expert ID</Label>
                    <Input
                      id='expertId'
                      name='expertId'
                      defaultValue='expert_123'
                      required
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='countryId'>Country ID</Label>
                    <Input id='countryId' name='countryId' defaultValue='US' />
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='text-sm font-medium'>Company ID</label>
                    <input
                      name='companyId'
                      defaultValue='comp_456'
                      className='w-full mt-1 px-3 py-2 border rounded-md'
                    />
                  </div>
                  <div>
                    <label className='text-sm font-medium'>Project Type</label>
                    <select
                      name='projectType'
                      className='w-full mt-1 px-3 py-2 border rounded-md'
                      required
                    >
                      <option value='technology'>Technology</option>
                      <option value='financial_services'>
                        Financial Services
                      </option>
                      <option value='healthcare'>Healthcare</option>
                      <option value='pharmaceuticals'>Pharmaceuticals</option>
                      <option value='manufacturing'>Manufacturing</option>
                    </select>
                  </div>
                </div>
                <Button type='submit' disabled={isLoading} className='w-full'>
                  {isLoading ? 'Testing...' : 'Test DNC Policy'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value='authz' className='mt-4'>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  testAuthzPolicy(new FormData(e.currentTarget))
                }}
                className='space-y-4'
              >
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='text-sm font-medium'>HTTP Method</label>
                    <select
                      name='method'
                      className='w-full mt-1 px-3 py-2 border rounded-md'
                      required
                    >
                      <option value='GET'>GET</option>
                      <option value='PUT'>PUT</option>
                      <option value='PATCH'>PATCH</option>
                    </select>
                  </div>
                  <div>
                    <label className='text-sm font-medium'>Path</label>
                    <input
                      name='path'
                      defaultValue='user,alice'
                      className='w-full mt-1 px-3 py-2 border rounded-md'
                      required
                    />
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='text-sm font-medium'>User Subject</label>
                    <input
                      name='subject'
                      defaultValue='alice'
                      className='w-full mt-1 px-3 py-2 border rounded-md'
                      required
                    />
                  </div>
                  <div>
                    <label className='text-sm font-medium'>User Roles</label>
                    <input
                      name='roles'
                      defaultValue='user'
                      placeholder='comma-separated'
                      className='w-full mt-1 px-3 py-2 border rounded-md'
                    />
                  </div>
                </div>
                <Button type='submit' disabled={isLoading} className='w-full'>
                  {isLoading ? 'Testing...' : 'Test Authorization'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value='response' className='flex-1 mt-4'>
          <Card className='h-full'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>Latest Response</CardTitle>
                <div className='flex space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={copyResponse}
                    disabled={!latestResponse}
                  >
                    <Copy className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={clearResponse}
                    disabled={!latestResponse}
                  >
                    <RotateCcw className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className='h-full overflow-auto'>
              {latestResponse ? (
                <pre className='text-xs bg-muted p-4 rounded-md overflow-auto'>
                  {JSON.stringify(latestResponse, null, 2)}
                </pre>
              ) : (
                <p className='text-muted-foreground text-sm'>
                  No requests yet...
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
