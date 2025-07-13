declare module 'swagger-ui-react' {
  import { ComponentType } from 'react'

  interface SwaggerUIProps {
    spec?: object | string
    url?: string
    requestInterceptor?: (request: any) => any
    responseInterceptor?: (response: any) => any
    [key: string]: any
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>
  export default SwaggerUI
}
