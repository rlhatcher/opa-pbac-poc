import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'
import { buildPolicy } from './policyBuilder.js'

const OPA_ENDPOINT =
  process.env.OPA_ENDPOINT || 'http://host.docker.internal:8181'
const OPA_URL = `${OPA_ENDPOINT}/v1/data/policies/authz/allow`

export const lambdaHandler = async (event) => {
  console.log('🔐 Lambda Authorizer invoked')
  console.log('📝 Request path:', event.path)
  console.log('📝 Request method:', event.httpMethod)

  // Policy-based exemption: Health checks don't require authentication
  if (event.path === '/health') {
    console.log(
      '🏥 Health check endpoint - allowing without authentication (policy exemption)'
    )
    return buildPolicy('Allow', event.methodArn, 'health-check-service')
  }

  // For all other endpoints, require authentication and authorization
  const token = event.headers?.authorization?.replace('Bearer ', '')

  if (!token) {
    console.log('❌ No authorization token provided for protected endpoint')
    return buildPolicy('Deny', event.methodArn, 'anonymous')
  }

  try {
    const decoded = jwt.decode(token, { complete: true })

    if (!decoded || !decoded.payload) {
      console.log('❌ Invalid JWT token structure')
      return buildPolicy('Deny', event.methodArn, 'invalid-token')
    }

    const input = {
      method: event.httpMethod,
      path: event.path.replace(/^\//, '').split('/'),
      token: { payload: decoded.payload },
      user_id: decoded.payload.sub
    }

    console.log('📤 Calling OPA for authorization decision')
    const opaRes = await fetch(OPA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    })

    if (!opaRes.ok) {
      console.log('❌ OPA request failed:', opaRes.status)
      return buildPolicy('Deny', event.methodArn, decoded.payload.sub)
    }

    const { result } = await opaRes.json()
    const policyEffect = result === true ? 'Allow' : 'Deny'

    console.log(
      `📋 OPA decision: ${policyEffect} for user ${decoded.payload.sub}`
    )
    return buildPolicy(policyEffect, event.methodArn, decoded.payload.sub)
  } catch (error) {
    console.log('❌ Authorization error:', error.message)
    return buildPolicy('Deny', event.methodArn, 'error')
  }
}
