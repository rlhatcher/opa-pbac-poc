import { useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  Copy,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'

interface PEPInterfaceProps {
  socket: Socket | null
}

interface PolicyResponse {
  timestamp: string
  request: {
    expert?: {
      id: string
      current_company_id?: string
      country_id?: string
    }
    project?: {
      id: string
      type: string
    }
    method?: string
    path?: string[]
    token?: {
      payload: {
        sub: string
        roles: string[]
      }
    }
  }
  response?: {
    decision_id?: string
    result: boolean
    message?: string
    reasons?: string[]
    blocked_company?: string
    blocked_country?: string
    validation_errors?: string[]
    located_in_dnc_country?: boolean
  }
  error?: string
  type:
    | 'dnc-policy'
    | 'authz-policy'
    | 'dnc-policy-error'
    | 'authz-policy-error'
  decision?: 'ALLOW' | 'DENY'
}

export function PEPInterface({ socket }: PEPInterfaceProps) {
  const [latestResponse, setLatestResponse] = useState<PolicyResponse | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  // const [requestHistory, setRequestHistory] = useState<any[]>([]) // TODO: Add history UI
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('disconnected')

  // WebSocket integration for real-time updates
  useEffect(() => {
    if (socket) {
      setConnectionStatus('connected')

      // Listen for PEP request responses
      socket.on('pep-request', (data) => {
        setLatestResponse(data)
        // setRequestHistory((prev) => [data, ...prev.slice(0, 9)]) // Keep last 10
      })

      socket.on('connect', () => setConnectionStatus('connected'))
      socket.on('disconnect', () => setConnectionStatus('disconnected'))
      socket.on('connecting', () => setConnectionStatus('connecting'))

      return () => {
        socket.off('pep-request')
        socket.off('connect')
        socket.off('disconnect')
        socket.off('connecting')
      }
    } else {
      setConnectionStatus('disconnected')
    }
  }, [socket])

  const testDNCPolicy = async (formData: FormData) => {
    setIsLoading(true)

    const expert = {
      id: formData.get('expertId') as string,
      current_company_id: (formData.get('companyId') as string) || undefined,
      country_id: (formData.get('countryId') as string) || undefined
    }

    const project = {
      id: (formData.get('projectId') as string) || `proj_${Date.now()}`,
      type: formData.get('projectType') as string
    }

    try {
      // Call PAP service DNC endpoint directly (API Gateway has issues)
      const baseUrl =
        import.meta.env.VITE_PAP_SERVICE_URL ||
        window.location.origin.replace(':5173', ':3004')
      const response = await fetch(`${baseUrl}/api/pep/test-dnc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expert, project })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const papResult = await response.json()

      // Extract comprehensive policy result from PAP service response
      const policyResult = papResult.response.result || papResult.response
      const canContact = policyResult.can_contact
      const dncReasons = policyResult.dnc_reasons || []
      const decisionId = papResult.timestamp

      // Format the result - include details only for DENY decisions
      const result: PolicyResponse = {
        timestamp: new Date().toISOString(),
        request: { expert, project },
        response: canContact
          ? {
              // ALLOW: Simple response
              decision_id: decisionId,
              result: canContact,
              message: 'Contact allowed - no DNC restrictions found'
            }
          : {
              // DENY: Comprehensive details with reasons
              decision_id: decisionId,
              result: canContact,
              reasons: dncReasons,
              ...(policyResult.blocked_company && {
                blocked_company: policyResult.blocked_company
              }),
              ...(policyResult.blocked_country && {
                blocked_country: policyResult.blocked_country
              }),
              ...(policyResult.input_validation_errors && {
                validation_errors: policyResult.input_validation_errors
              }),
              ...(policyResult.located_in_dnc_country !== undefined && {
                located_in_dnc_country: policyResult.located_in_dnc_country
              })
            },
        type: 'dnc-policy',
        decision: canContact ? 'ALLOW' : 'DENY'
      }

      setLatestResponse(result)

      // Add to history if not already added via WebSocket
      if (!socket) {
        // setRequestHistory((prev) => [result, ...prev.slice(0, 9)])
      }
    } catch (error) {
      const errorResult: PolicyResponse = {
        timestamp: new Date().toISOString(),
        request: { expert, project },
        error: (error as Error).message,
        type: 'dnc-policy-error'
      }
      setLatestResponse(errorResult)

      // Add to history if not already added via WebSocket
      if (!socket) {
        // setRequestHistory((prev) => [errorResult, ...prev.slice(0, 9)])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const testAuthzPolicy = async (formData: FormData) => {
    setIsLoading(true)

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

    try {
      // Call PAP service authorization endpoint directly (API Gateway has issues)
      const baseUrl =
        import.meta.env.VITE_PAP_SERVICE_URL ||
        window.location.origin.replace(':5173', ':3004')
      const response = await fetch(`${baseUrl}/api/pep/test-authz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method, path, token })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const papResult = await response.json()

      // Format the result from PAP service response
      const result: PolicyResponse = {
        timestamp: papResult.timestamp,
        request: { method, path, token },
        response: papResult.response,
        type: 'authz-policy',
        decision: papResult.response.result ? 'ALLOW' : 'DENY'
      }

      setLatestResponse(result)

      // Add to history if not already added via WebSocket
      if (!socket) {
        // setRequestHistory((prev) => [result, ...prev.slice(0, 9)])
      }
    } catch (error) {
      const errorResult: PolicyResponse = {
        timestamp: new Date().toISOString(),
        request: { method, path, token },
        error: (error as Error).message,
        type: 'authz-policy-error'
      }
      setLatestResponse(errorResult)

      // Add to history if not already added via WebSocket
      if (!socket) {
        // setRequestHistory((prev) => [errorResult, ...prev.slice(0, 9)])
      }
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

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className='h-4 w-4 text-primary' />
      case 'connecting':
        return <Clock className='h-4 w-4 text-muted-foreground' />
      case 'disconnected':
        return <XCircle className='h-4 w-4 text-destructive' />
    }
  }

  const getResultIcon = (result: PolicyResponse) => {
    if (result?.error) {
      return <XCircle className='h-4 w-4 text-destructive' />
    }
    if (result?.response?.result === true) {
      return <CheckCircle className='h-4 w-4 text-primary' />
    }
    if (result?.response?.result === false) {
      return <XCircle className='h-4 w-4 text-destructive' />
    }
    return <AlertTriangle className='h-4 w-4 text-muted-foreground' />
  }

  return (
    <div className='h-full flex flex-col'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <h3 className='text-lg font-semibold'>PEP Interface</h3>
          <Badge
            variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
          >
            {getStatusIcon()}
            <span className='ml-1'>OPA {connectionStatus}</span>
          </Badge>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={clearResponse}>
            <RotateCcw className='h-4 w-4 mr-2' />
            Clear
          </Button>
        </div>
      </div>
      <div className='flex-1 flex flex-col gap-4'>
        {/* Policy Test Forms */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* DNC Policy Form */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>DNC Policy Test</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <div className='space-y-2'>
                    <Label htmlFor='companyId'>Company ID</Label>
                    <Input
                      id='companyId'
                      name='companyId'
                      defaultValue='comp_456'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='projectId'>Project ID</Label>
                    <Input
                      id='projectId'
                      name='projectId'
                      defaultValue='proj_123'
                    />
                  </div>
                </div>
                <div className='grid grid-cols-1 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='projectType'>Project Type</Label>
                    <select
                      id='projectType'
                      name='projectType'
                      className='w-full px-3 py-2 border border-input rounded-md bg-background'
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
            </CardContent>
          </Card>

          {/* Authorization Policy Form */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>
                Authorization Policy Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  testAuthzPolicy(new FormData(e.currentTarget))
                }}
                className='space-y-4'
              >
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='method'>HTTP Method</Label>
                    <select
                      id='method'
                      name='method'
                      className='w-full px-3 py-2 border border-input rounded-md bg-background'
                      required
                    >
                      <option value='GET'>GET</option>
                      <option value='PUT'>PUT</option>
                      <option value='PATCH'>PATCH</option>
                    </select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='path'>Path</Label>
                    <Input
                      id='path'
                      name='path'
                      defaultValue='user,alice'
                      required
                    />
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='subject'>User Subject</Label>
                    <Input
                      id='subject'
                      name='subject'
                      defaultValue='alice'
                      required
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='roles'>User Roles</Label>
                    <Input
                      id='roles'
                      name='roles'
                      defaultValue='user'
                      placeholder='comma-separated'
                    />
                  </div>
                </div>
                <Button type='submit' disabled={isLoading} className='w-full'>
                  {isLoading ? 'Testing...' : 'Test Authorization'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Response Window */}
        <Card className='flex-1 min-h-0'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <CardTitle className='text-base'>Policy Response</CardTitle>
                {latestResponse && getResultIcon(latestResponse)}
              </div>
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
          <CardContent className='flex-1 overflow-auto'>
            {latestResponse ? (
              <pre className='text-xs bg-muted p-4 rounded-md overflow-auto h-full'>
                {JSON.stringify(latestResponse, null, 2)}
              </pre>
            ) : (
              <div className='flex items-center justify-center h-full text-muted-foreground'>
                <p className='text-sm'>
                  No policy tests yet. Use the forms above to test policies.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
