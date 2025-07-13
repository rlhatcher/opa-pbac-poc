import { useEffect, useRef } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

interface SwaggerUIComponentProps {
  spec: object | string
  title?: string
}

export function SwaggerUIComponent({ spec, title }: SwaggerUIComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Validate spec before rendering
  if (!spec || (typeof spec === 'object' && Object.keys(spec).length === 0)) {
    return (
      <div className='text-center py-8'>
        <p className='text-muted-foreground'>No API specification available</p>
      </div>
    )
  }

  // Check if spec has required version field
  const hasValidVersion = (spec as any)?.openapi || (spec as any)?.swagger
  if (!hasValidVersion) {
    return (
      <div className='text-center py-8 text-red-600'>
        <p>Invalid API specification: Missing version field</p>
        <p className='text-sm mt-2'>
          Spec must have either "openapi" or "swagger" version field
        </p>
        <pre className='text-xs mt-2 bg-gray-100 p-2 rounded max-w-md mx-auto overflow-auto'>
          {JSON.stringify(spec, null, 2).substring(0, 200)}...
        </pre>
      </div>
    )
  }

  return (
    <div ref={containerRef} className='swagger-ui-container'>
      {title && (
        <h3 className='text-lg font-semibold mb-4 text-foreground'>{title}</h3>
      )}
      <div className='border rounded-lg overflow-hidden bg-background'>
        <div className='swagger-ui-wrapper'>
          <SwaggerUI
            spec={spec}
            docExpansion='list'
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            displayOperationId={false}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={true}
            requestInterceptor={(request) => {
              // Add any custom headers or modifications here
              return request
            }}
            responseInterceptor={(response) => {
              // Handle responses here if needed
              return response
            }}
          />
        </div>
      </div>

      <style jsx>{`
        .swagger-ui-wrapper .swagger-ui {
          font-family: inherit;
        }
        .swagger-ui-wrapper .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui-wrapper .swagger-ui .info {
          margin: 20px 0;
        }
      `}</style>
    </div>
  )
}
