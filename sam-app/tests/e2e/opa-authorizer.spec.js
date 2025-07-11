import { test, expect } from '@playwright/test'
import jwt from 'jsonwebtoken'

// Test JWT tokens for different scenarios
const createTestJWT = (payload) => {
  return jwt.sign(payload, 'test-secret', {
    algorithm: 'HS256',
    expiresIn: '1h',
    header: { typ: 'JWT', alg: 'HS256' }
  })
}

const testTokens = {
  validUser: createTestJWT({
    sub: 'alice',
    roles: ['user'],
    iat: Math.floor(Date.now() / 1000)
  }),
  adminUser: createTestJWT({
    sub: 'admin',
    roles: ['admin'],
    iat: Math.floor(Date.now() / 1000)
  }),
  otherUser: createTestJWT({
    sub: 'bob',
    roles: ['user'],
    iat: Math.floor(Date.now() / 1000)
  })
}

test.describe('OPA Policy Engine Tests', () => {
  test.use({ baseURL: 'http://localhost:8181' })

  test('should allow access for user accessing own data', async ({
    request
  }) => {
    const input = {
      method: 'GET',
      path: ['user', 'alice'],
      token: { payload: { sub: 'alice', roles: ['user'] } },
      user_id: 'alice'
    }

    const response = await request.post('/v1/data/policies/allow', {
      data: { input }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.result).toBe(true)
  })

  test('should deny access for user accessing other user data', async ({
    request
  }) => {
    const input = {
      method: 'GET',
      path: ['user', 'alice'],
      token: { payload: { sub: 'bob', roles: ['user'] } },
      user_id: 'bob'
    }

    const response = await request.post('/v1/data/policies/allow', {
      data: { input }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.result).toBe(false)
  })

  test('should allow access for admin user', async ({ request }) => {
    const input = {
      method: 'GET',
      path: ['user', 'alice'],
      token: { payload: { sub: 'admin', roles: ['admin'] } },
      user_id: 'admin'
    }

    const response = await request.post('/v1/data/policies/allow', {
      data: { input }
    })

    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    expect(result.result).toBe(true)
  })
})

test.describe('Lambda Authorizer Tests', () => {
  test.use({ baseURL: 'http://localhost:3001' })

  test('should return Allow policy for valid user accessing own data', async ({
    request
  }) => {
    const authEvent = {
      type: 'REQUEST',
      methodArn:
        'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/user/alice',
      headers: {
        authorization: `Bearer ${testTokens.validUser}`
      },
      httpMethod: 'GET',
      path: '/user/alice'
    }

    const response = await request.post(
      '/2015-03-31/functions/AuthorizerFunction/invocations',
      {
        data: authEvent
      }
    )

    expect(response.ok()).toBeTruthy()
    const result = await response.json()

    expect(result).toHaveProperty('principalId', 'alice')
    expect(result).toHaveProperty('policyDocument')
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow')
  })

  test('should return Deny policy for user accessing other user data', async ({
    request
  }) => {
    const authEvent = {
      type: 'REQUEST',
      methodArn:
        'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/user/alice',
      headers: {
        authorization: `Bearer ${testTokens.otherUser}`
      },
      httpMethod: 'GET',
      path: '/user/alice'
    }

    const response = await request.post(
      '/2015-03-31/functions/AuthorizerFunction/invocations',
      {
        data: authEvent
      }
    )

    expect(response.ok()).toBeTruthy()
    const result = await response.json()

    expect(result).toHaveProperty('principalId', 'bob')
    expect(result).toHaveProperty('policyDocument')
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny')
  })

  test('should return Allow policy for admin user', async ({ request }) => {
    const authEvent = {
      type: 'REQUEST',
      methodArn:
        'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/user/alice',
      headers: {
        authorization: `Bearer ${testTokens.adminUser}`
      },
      httpMethod: 'GET',
      path: '/user/alice'
    }

    const response = await request.post(
      '/2015-03-31/functions/AuthorizerFunction/invocations',
      {
        data: authEvent
      }
    )

    expect(response.ok()).toBeTruthy()
    const result = await response.json()

    expect(result).toHaveProperty('principalId', 'admin')
    expect(result).toHaveProperty('policyDocument')
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow')
  })
})
