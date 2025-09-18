import fetch from 'node-fetch'

const OPA_ENDPOINT =
  process.env.OPA_ENDPOINT || 'http://host.docker.internal:8181'

const PAP_ENDPOINT =
  process.env.PAP_ENDPOINT || 'http://host.docker.internal:3004'

// Function to log decisions to PAP service
async function logToPAPService(source, policyPath, input, result, metadata) {
  try {
    await fetch(`${PAP_ENDPOINT}/api/log/gateway-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        policyPath,
        input,
        result,
        decisionId: `${source}-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        metadata
      })
    })
  } catch (error) {
    // Don't throw - logging failures shouldn't break the proxy
    console.log('⚠️ PAP service logging failed:', error.message)
  }
}

export const lambdaHandler = async (event, context) => {
  console.log('🔗 OPA Proxy Lambda invoked - Authorization was successful!')
  console.log('📝 Request path:', event.path)
  console.log('📝 Request method:', event.httpMethod)
  console.log('📝 Request body:', event.body)

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    }
  }

  // Handle health check (authorized by policy exemption)
  if (event.path === '/health') {
    console.log('🏥 Health check endpoint - returning service status')
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'healthy',
        service: 'sam-local-api',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      })
    }
  }

  try {
    // Extract the policy path from the API Gateway path
    // Convert /policies/dnc/can_contact -> /v1/data/policies/dnc/can_contact
    const policyPath = event.path.replace('/policies/', '/v1/data/policies/')
    const opaUrl = `${OPA_ENDPOINT}${policyPath}`

    console.log('🎯 Proxying to OPA URL:', opaUrl)

    // Forward the request to OPA
    const opaResponse = await fetch(opaUrl, {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        // Forward any relevant headers
        ...(event.headers['content-type'] && {
          'Content-Type': event.headers['content-type']
        }),
        ...(event.headers['Content-Type'] && {
          'Content-Type': event.headers['Content-Type']
        })
      },
      body: event.body
    })

    console.log('📥 OPA response status:', opaResponse.status)

    // Get the response from OPA
    const opaResult = await opaResponse.json()
    console.log('✅ OPA response:', JSON.stringify(opaResult, null, 2))

    // Log decision to PAP service (async, don't wait) - disabled for local development
    // if (event.body) {
    //   try {
    //     const requestBody = JSON.parse(event.body)
    //     const policyPath = event.path.replace('/', '')
    //     logToPAPService(
    //       'opa-proxy',
    //       policyPath,
    //       requestBody.input,
    //       opaResult.result,
    //       {
    //         path: event.path,
    //         method: event.httpMethod,
    //         requestId: context.awsRequestId
    //       }
    //     ).catch((err) => console.log('⚠️ PAP logging failed:', err.message))
    //   } catch (parseError) {
    //     console.log(
    //       '⚠️ Could not parse request body for logging:',
    //       parseError.message
    //     )
    //   }
    // }

    // Return the OPA response with proper CORS headers
    return {
      statusCode: opaResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'X-Request-ID': context.awsRequestId,
        'X-Function-Name': context.functionName,
        'X-OPA-URL': opaUrl
      },
      body: JSON.stringify(opaResult)
    }
  } catch (error) {
    console.error('❌ OPA Proxy error:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Request-ID': context.awsRequestId,
        'X-Function-Name': context.functionName
      },
      body: JSON.stringify({
        error: 'OPA Proxy Error',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: context.awsRequestId
      })
    }
  }
}
