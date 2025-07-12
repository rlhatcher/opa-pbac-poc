import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'

const OPA_ENDPOINT =
  process.env.OPA_ENDPOINT || 'http://host.docker.internal:8181'

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
    region: process.env.AWS_REGION
  }

  // Extract and decode JWT if present
  const authHeader =
    event.headers?.Authorization || event.headers?.authorization
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
          roles: decoded?.payload?.roles
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

  // Handle different types of requests
  let businessLogic = {
    userId: logData.jwt?.payload?.sub || 'unknown',
    action: `${event.httpMethod} ${event.path}`,
    timestamp: logData.timestamp,
    authorized: true,
    processingTime: Date.now()
  }

  // Check if this is a DNC policy request
  if (event.path.includes('/dnc/') || event.path.includes('dnc')) {
    try {
      console.log('🛡️ Processing DNC policy request')
      console.log('📝 Request path:', event.path)
      console.log('📝 Request body:', event.body)

      // Parse the request body for DNC data
      const requestBody = event.body ? JSON.parse(event.body) : {}
      const { expert, project } = requestBody

      console.log('📝 Parsed expert:', expert)
      console.log('📝 Parsed project:', project)

      if (expert && project) {
        // Call OPA for DNC policy evaluation
        const opaUrl = `${OPA_ENDPOINT}/v1/data/policies/dnc/can_contact`
        const opaPayload = { input: { expert, project } }

        console.log('🔗 Calling OPA at:', opaUrl)
        console.log('📤 OPA payload:', JSON.stringify(opaPayload, null, 2))

        const opaResponse = await fetch(opaUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opaPayload)
        })

        console.log('📥 OPA response status:', opaResponse.status)

        if (opaResponse.ok) {
          const opaResult = await opaResponse.json()
          console.log(
            '✅ DNC Policy result:',
            JSON.stringify(opaResult, null, 2)
          )

          businessLogic.dncPolicyResult = opaResult
          businessLogic.policyType = 'dnc'
          businessLogic.policyDecision = opaResult.result ? 'ALLOW' : 'DENY'
        } else {
          const errorText = await opaResponse.text()
          console.error(
            '❌ OPA DNC policy call failed:',
            opaResponse.status,
            errorText
          )
          businessLogic.error = `OPA call failed: ${opaResponse.status} - ${errorText}`
        }
      } else {
        console.error('❌ Invalid DNC request body:', requestBody)
        businessLogic.error =
          'Invalid request body for DNC policy - missing expert or project'
      }
    } catch (error) {
      console.error('❌ DNC policy processing error:', error)
      businessLogic.error = error.message
    }
  }

  console.log(
    '💼 Business Logic Executed:',
    JSON.stringify(businessLogic, null, 2)
  )

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
      message: businessLogic.error
        ? 'Request failed'
        : 'Request processed successfully',
      data: {
        userId: businessLogic.userId,
        action: businessLogic.action,
        timestamp: businessLogic.timestamp,
        requestId: context.awsRequestId,
        // Include DNC policy result if available
        ...(businessLogic.dncPolicyResult && {
          policyResult: businessLogic.dncPolicyResult,
          policyType: businessLogic.policyType,
          policyDecision: businessLogic.policyDecision,
          allowed: businessLogic.dncPolicyResult.result
        }),
        ...(businessLogic.error && { error: businessLogic.error })
      },
      // Include some of the logged data in response for debugging
      debug:
        process.env.NODE_ENV === 'development'
          ? {
              path: event.path,
              method: event.httpMethod,
              stage: event.requestContext?.stage,
              sourceIp: logData.sourceIp
            }
          : undefined
    })
  }

  console.log('✅ Response prepared:', JSON.stringify(response, null, 2))

  return response
}
