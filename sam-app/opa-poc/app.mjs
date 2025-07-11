import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'
import { buildPolicy } from './policyBuilder.js'

const OPA_ENDPOINT =
  process.env.OPA_ENDPOINT || 'http://host.docker.internal:8181'
const OPA_URL = `${OPA_ENDPOINT}/v1/data/policies/allow`

export const lambdaHandler = async (event) => {
  const token = event.headers?.authorization?.replace('Bearer ', '')

  const decoded = jwt.decode(token, { complete: true })

  const input = {
    method: event.httpMethod,
    path: event.path.replace(/^\//, '').split('/'),
    token: { payload: decoded.payload },
    user_id: decoded.payload.sub
  }

  const opaRes = await fetch(OPA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input })
  })

  const { result } = await opaRes.json()

  const policyEffect = result === true ? 'Allow' : 'Deny'

  return buildPolicy(policyEffect, event.methodArn, decoded.payload.sub)
}
