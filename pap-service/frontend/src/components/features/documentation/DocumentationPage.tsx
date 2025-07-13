import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { SwaggerUIComponent } from '../../SwaggerUIComponent'
import { LoadingState } from '../../shared/LoadingState'
import { FileText } from 'lucide-react'

interface DocumentationPageProps {
  openApiSpecs: {
    preferences: object | null
    policies: string | object | null
  }
}

export function DocumentationPage({ openApiSpecs }: DocumentationPageProps) {
  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center space-x-2'>
            <FileText className='h-5 w-5 text-primary' />
            <span>API Documentation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='preferences' className='w-full'>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='preferences'>Preferences Service</TabsTrigger>
              <TabsTrigger value='policies'>DNC Policy API</TabsTrigger>
            </TabsList>

            <TabsContent value='preferences' className='mt-6'>
              {openApiSpecs.preferences ? (
                <SwaggerUIComponent
                  spec={openApiSpecs.preferences}
                  title='Preferences Service API'
                />
              ) : (
                <LoadingState message='Loading Preferences Service API documentation...' />
              )}
            </TabsContent>

            <TabsContent value='policies' className='mt-6'>
              {openApiSpecs.policies ? (
                <SwaggerUIComponent
                  spec={openApiSpecs.policies}
                  title='DNC Policy API'
                />
              ) : (
                <LoadingState message='Loading DNC Policy API documentation...' />
              )}
            </TabsContent>
          </Tabs>

          <div className='mt-6 p-4 bg-muted rounded-lg'>
            <h4 className='font-medium text-foreground mb-2'>
              API Documentation Overview
            </h4>
            <p className='text-sm text-muted-foreground'>
              This section provides interactive API documentation for the PBAC
              system services. Use the embedded Swagger UI interfaces to explore
              endpoints, test requests, and understand the API schemas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
