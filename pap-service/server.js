import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
})

const PORT = process.env.PORT || 3004

// Configuration for external services
const config = {
  opa: {
    url: process.env.OPA_URL || 'http://localhost:8181',
    decisionsEndpoint: '/v1/data/policies',
    dataEndpoint: '/v1/data'
  },
  preferences: {
    url: process.env.PREFERENCES_URL || 'http://localhost:3002'
  },
  samLocal: {
    apiUrl: process.env.SAM_API_URL || 'http://localhost:3000',
    lambdaUrl: process.env.SAM_LAMBDA_URL || 'http://localhost:3001'
  }
}

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// Store for real-time data
const dashboardData = {
  pepRequests: [],
  pdpLogs: [],
  pipData: {
    companies: {},
    countries: {},
    preferences: {}
  },
  appLogs: []
}

// Routes

// Serve the main dashboard
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'))
  } else {
    res.redirect('http://localhost:5173') // Vite dev server
  }
})

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend', 'dist')))
}

// API Routes for each quadrant

// Q1: PEP Interface - Policy Enforcement Point
app.post('/api/pep/test-dnc', async (req, res) => {
  try {
    const { expert, project } = req.body

    // Call OPA DNC policy
    const opaResponse = await axios.post(
      `${config.opa.url}/v1/data/policies/dnc/can_contact`,
      {
        input: { expert, project }
      }
    )

    const result = {
      timestamp: new Date().toISOString(),
      request: { expert, project },
      response: opaResponse.data,
      type: 'dnc-policy'
    }

    // Store and broadcast
    dashboardData.pepRequests.unshift(result)
    if (dashboardData.pepRequests.length > 50) dashboardData.pepRequests.pop()

    io.emit('pep-request', result)

    res.json(result)
  } catch (error) {
    const errorResult = {
      timestamp: new Date().toISOString(),
      request: req.body,
      error: error.message,
      type: 'dnc-policy-error'
    }

    dashboardData.pepRequests.unshift(errorResult)
    io.emit('pep-request', errorResult)

    res.status(500).json(errorResult)
  }
})

app.post('/api/pep/test-authz', async (req, res) => {
  try {
    const { method, path, token } = req.body

    // Call OPA authz policy
    const opaResponse = await axios.post(
      `${config.opa.url}/v1/data/policies/authz/allow`,
      {
        input: { method, path, token }
      }
    )

    const result = {
      timestamp: new Date().toISOString(),
      request: { method, path, token },
      response: opaResponse.data,
      type: 'authz-policy'
    }

    dashboardData.pepRequests.unshift(result)
    if (dashboardData.pepRequests.length > 50) dashboardData.pepRequests.pop()

    io.emit('pep-request', result)

    res.json(result)
  } catch (error) {
    const errorResult = {
      timestamp: new Date().toISOString(),
      request: req.body,
      error: error.message,
      type: 'authz-policy-error'
    }

    dashboardData.pepRequests.unshift(errorResult)
    io.emit('pep-request', errorResult)

    res.status(500).json(errorResult)
  }
})

// Q2: PDP Logs - Policy Decision Point
app.get('/api/pdp/logs', async (req, res) => {
  res.json(dashboardData.pdpLogs)
})

// Q3: PIP Data Management - Policy Information Point
app.get('/api/pip/data', async (req, res) => {
  try {
    // Fetch current data from OPA
    const [companiesRes, countriesRes] = await Promise.all([
      axios
        .get(`${config.opa.url}/v1/data/companies`)
        .catch(() => ({ data: { result: {} } })),
      axios
        .get(`${config.opa.url}/v1/data/countries`)
        .catch(() => ({ data: { result: {} } }))
    ])

    dashboardData.pipData.companies = companiesRes.data.result || {}
    dashboardData.pipData.countries = countriesRes.data.result || {}

    res.json(dashboardData.pipData)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/pip/companies', async (req, res) => {
  try {
    // Update companies data in OPA
    const response = await axios.put(
      `${config.opa.url}/v1/data/companies`,
      req.body
    )

    dashboardData.pipData.companies = req.body
    io.emit('pip-data-update', { type: 'companies', data: req.body })

    res.json({ success: true, data: req.body })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/pip/countries', async (req, res) => {
  try {
    // Update countries data in OPA
    const response = await axios.put(
      `${config.opa.url}/v1/data/countries`,
      req.body
    )

    dashboardData.pipData.countries = req.body
    io.emit('pip-data-update', { type: 'countries', data: req.body })

    res.json({ success: true, data: req.body })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Q4: Application Service Logs
app.get('/api/app/logs', (req, res) => {
  res.json(dashboardData.appLogs)
})

// OPA Proxy for Swagger UI
app.post('/api/pep/opa-proxy/*', async (req, res) => {
  try {
    const opaPath = req.params[0]
    const opaUrl = `${config.opa.url}/v1/data/policies/${opaPath}`

    const opaResponse = await axios.post(opaUrl, req.body, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const result = {
      timestamp: new Date().toISOString(),
      request: req.body,
      response: opaResponse.data,
      type: `opa-proxy-${opaPath.replace('/', '-')}`
    }

    // Store and broadcast
    dashboardData.pepRequests.unshift(result)
    if (dashboardData.pepRequests.length > 50) dashboardData.pepRequests.pop()

    io.emit('pep-request', result)

    res.json(opaResponse.data)
  } catch (error) {
    const errorResult = {
      timestamp: new Date().toISOString(),
      request: req.body,
      error: error.message,
      type: 'opa-proxy-error'
    }

    dashboardData.pepRequests.unshift(errorResult)
    io.emit('pep-request', errorResult)

    res.status(500).json({ error: error.message })
  }
})

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 PAP Dashboard client connected')

  // Send initial data
  socket.emit('initial-data', dashboardData)

  socket.on('disconnect', () => {
    console.log('🔌 PAP Dashboard client disconnected')
  })
})

// Simulate some initial data and periodic updates
function simulateInitialData() {
  // Add some sample PDP logs
  dashboardData.pdpLogs.push({
    timestamp: new Date().toISOString(),
    decision: 'allow',
    policy: 'policies.authz',
    input: { method: 'GET', path: ['user', 'alice'] },
    result: true
  })

  // Add some sample app logs
  dashboardData.appLogs.push({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message: 'Lambda authorizer started',
    source: 'authorizer-function'
  })
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 PAP Service running on http://localhost:${PORT}`)
  console.log(`📊 Dashboard available at http://localhost:${PORT}`)
  simulateInitialData()
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 PAP Service shutting down...')
  server.close(() => {
    console.log('✅ PAP Service stopped')
  })
})
