import jwt from 'jsonwebtoken'

export const lambdaHandler = async (event, context) => {
  console.log('🚀 Backend Lambda invoked - Authorization was successful!')
  
  // Log comprehensive request information
  const logData = {
    timestamp: new Date().toISOString(),
    requestId: context.awsRequestId,
    functionName: context.functionName,
    functionVersion: context.functionVersion,
    remainingTimeInMillis: context.getRemainingTimeInMillis(),
    
    // API Gateway Event Details
    httpMethod: event.httpMethod,
    path: event.path,
    resource: event.resource,
    stage: event.requestContext?.stage,
    apiId: event.requestContext?.apiId,
    requestId: event.requestContext?.requestId,
    requestTime: event.requestContext?.requestTime,
    requestTimeEpoch: event.requestContext?.requestTimeEpoch,
    
    // Headers (sanitized)
    headers: {
      ...event.headers,
      authorization: event.headers?.authorization ? '[REDACTED]' : undefined
    },
    
    // Query parameters
    queryStringParameters: event.queryStringParameters,
    pathParameters: event.pathParameters,
    
    // Request body
    body: event.body,
    isBase64Encoded: event.isBase64Encoded,
    
    // Client information
    sourceIp: event.requestContext?.identity?.sourceIp,
    userAgent: event.requestContext?.identity?.userAgent,
    
    // Authorization context (passed from authorizer)
    principalId: event.requestContext?.authorizer?.principalId,
    authorizerClaims: event.requestContext?.authorizer?.claims,
    
    // Environment info
    environment: process.env.NODE_ENV,
    region: process.env.AWS_REGION,
  }
  
  // Extract and decode JWT if present
  const authHeader = event.headers?.Authorization || event.headers?.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '')
      const decoded = jwt.decode(token, { complete: true })
      
      logData.jwt = {
        header: decoded?.header,
        payload: {
          ...decoded?.payload,
          // Don't log sensitive fields in production
          iat: decoded?.payload?.iat,
          exp: decoded?.payload?.exp,
          sub: decoded?.payload?.sub,
          roles: decoded?.payload?.roles,
          // Add any other non-sensitive claims you want to log
        }
      }
      
      console.log('🔐 JWT Token decoded successfully')
    } catch (error) {
      console.error('❌ Failed to decode JWT:', error.message)
      logData.jwtError = error.message
    }
  }
  
  // Log all the collected information
  console.log('📊 Request Details:', JSON.stringify(logData, null, 2))
  
  // Simulate some business logic
  const businessLogic = {
    userId: logData.jwt?.payload?.sub || 'unknown',
    action: `${event.httpMethod} ${event.path}`,
    timestamp: logData.timestamp,
    authorized: true,
    processingTime: Date.now()
  }
  
  console.log('💼 Business Logic Executed:', JSON.stringify(businessLogic, null, 2))
  
  // Return successful response
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Request-ID': context.awsRequestId,
      'X-Function-Name': context.functionName
    },
    body: JSON.stringify({
      message: 'Request processed successfully',
      data: {
        userId: businessLogic.userId,
        action: businessLogic.action,
        timestamp: businessLogic.timestamp,
        requestId: context.awsRequestId
      },
      // Include some of the logged data in response for debugging
      debug: process.env.NODE_ENV === 'development' ? {
        path: event.path,
        method: event.httpMethod,
        stage: event.requestContext?.stage,
        sourceIp: logData.sourceIp
      } : undefined
    })
  }
  
  console.log('✅ Response prepared:', JSON.stringify(response, null, 2))
  
  return response
}
