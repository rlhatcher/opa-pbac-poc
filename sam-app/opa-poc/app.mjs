import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'
import { buildPolicy } from './policyBuilder.js'

const OPA_ENDPOINT =
  process.env.OPA_ENDPOINT || 'http://host.docker.internal:8181'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const AUTHZ_URL = `${OPA_ENDPOINT}/v1/data/policies/authz/allow`

// PAP logging disabled for local development

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
    // Verify JWT token signature and decode payload
    const decoded = jwt.verify(token, JWT_SECRET, { complete: true })

    if (!decoded || !decoded.payload) {
      console.log('❌ Invalid JWT token structure after verification')
      return buildPolicy('Deny', event.methodArn, 'invalid-token')
    }

    const input = {
      method: event.httpMethod,
      path: event.path.replace(/^\//, '').split('/'),
      token: { payload: decoded.payload },
      user_id: decoded.payload.sub
    }

    console.log('📤 Calling OPA for authorization decision')
    const opaRes = await fetch(AUTHZ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    })

    if (!opaRes.ok) {
      console.log('❌ OPA request failed:', opaRes.status)
      return buildPolicy('Deny', event.methodArn, decoded.payload.sub)
    }

    const opaResponse = await opaRes.json()
    const result = opaResponse.result
    const policyEffect = result === true ? 'Allow' : 'Deny'

    console.log(
      `📋 OPA decision: ${policyEffect} for user ${decoded.payload.sub}`
    )

    return buildPolicy(policyEffect, event.methodArn, decoded.payload.sub)
  } catch (error) {
    // Handle JWT verification errors specifically
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ JWT signature verification failed:', error.message)
      return buildPolicy('Deny', event.methodArn, 'invalid-signature')
    } else if (error.name === 'TokenExpiredError') {
      console.log('❌ JWT token has expired:', error.message)
      return buildPolicy('Deny', event.methodArn, 'expired-token')
    } else if (error.name === 'NotBeforeError') {
      console.log('❌ JWT token not active yet:', error.message)
      return buildPolicy('Deny', event.methodArn, 'token-not-active')
    } else {
      console.log('❌ Authorization error:', error.message)
    }

    // Log authorization error to PAP service - temporarily disabled
    // logToPAPService(
    //   'authorizer',
    //   'policies/authz',
    //   { error: error.message },
    //   false,
    //   {
    //     methodArn: event.methodArn,
    //     path: event.path,
    //     method: event.httpMethod,
    //     decision: 'Deny',
    //     errorType: 'authorization_error'
    //   }
    // ).catch((err) => console.log('⚠️ PAP logging failed:', err.message))

    return buildPolicy('Deny', event.methodArn, 'error')
  }
}
