import fetch from 'node-fetch'

const OPA_ENDPOINT =
  process.env.OPA_ENDPOINT || 'http://host.docker.internal:8181'

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
