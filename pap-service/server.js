import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'
import { spawn } from 'child_process'

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

// Health check proxy endpoints (avoid CORS issues)
app.get('/api/health/opa', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:8181/health', {
      timeout: 5000
    })
    res.json({ status: 'healthy', service: 'opa', data: response.data })
  } catch (error) {
    console.warn('OPA health check failed:', error.message)
    res
      .status(503)
      .json({ status: 'unhealthy', service: 'opa', error: error.message })
  }
})

app.get('/api/health/preferences', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3002/health', {
      timeout: 5000
    })
    res.json({ status: 'healthy', service: 'preferences', data: response.data })
  } catch (error) {
    console.warn('Preferences health check failed:', error.message)
    res
      .status(503)
      .json({
        status: 'unhealthy',
        service: 'preferences',
        error: error.message
      })
  }
})

app.get('/api/health/sam', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3000/health', {
      timeout: 5000
    })
    res.json({ status: 'healthy', service: 'sam', data: response.data })
  } catch (error) {
    console.warn('SAM health check failed:', error.message)
    res
      .status(503)
      .json({ status: 'unhealthy', service: 'sam', error: error.message })
  }
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

    // Capture PDP decision log for policy evaluations
    if (opaResponse.data && opaResponse.data.result !== undefined) {
      captureOpaDecisionLog(
        `policies.${opaPath}`,
        req.body.input,
        opaResponse.data.result,
        opaResponse.data.decision_id
      )
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

// Function to capture OPA decision logs
function captureOpaDecisionLog(policyPath, input, result, decisionId) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    decision_id: decisionId,
    policy: policyPath,
    input: input,
    result: result,
    decision: result ? 'ALLOW' : 'DENY',
    level: 'info'
  }

  // Add to PDP logs
  dashboardData.pdpLogs.unshift(logEntry)
  if (dashboardData.pdpLogs.length > 100) dashboardData.pdpLogs.pop()

  // Broadcast to connected clients
  io.emit('pdp-log', logEntry)

  console.log('📊 PDP Decision Log:', JSON.stringify(logEntry, null, 2))
}

// Monitor OPA decision logs from Docker container
function startOpaLogMonitoring() {
  console.log('📊 Starting OPA decision log monitoring via Docker logs...')

  try {
    // Use docker logs to follow OPA container logs
    const dockerLogs = spawn('docker', [
      'logs',
      '--follow',
      '--tail',
      '0', // Only new logs
      'opa-pbac-poc-opa-1'
    ])

    dockerLogs.stdout.on('data', (data) => {
      const lines = data.toString().split('\n')

      lines.forEach((line) => {
        if (line.trim()) {
          try {
            const logEntry = JSON.parse(line)

            // Check if this is a decision log entry
            if (
              logEntry.type === 'openpolicyagent.org/decision_logs' &&
              logEntry.decision_id
            ) {
              // Transform OPA decision log to our format
              const pdpLog = {
                timestamp: logEntry.timestamp || new Date().toISOString(),
                decision_id: logEntry.decision_id,
                policy: logEntry.path || 'unknown',
                input: logEntry.input,
                result: logEntry.result,
                decision: logEntry.result ? 'ALLOW' : 'DENY',
                level: 'info',
                message: `Policy evaluation: ${logEntry.path || 'unknown'}`,
                metrics: logEntry.metrics
              }

              // Add to PDP logs
              dashboardData.pdpLogs.unshift(pdpLog)
              if (dashboardData.pdpLogs.length > 100)
                dashboardData.pdpLogs.pop()

              // Broadcast to connected clients
              io.emit('pdp-log', pdpLog)

              console.log(
                '📊 OPA Decision Log captured:',
                JSON.stringify(pdpLog, null, 2)
              )
            }
          } catch (error) {
            // Not a JSON log entry, ignore
          }
        }
      })
    })

    dockerLogs.stderr.on('data', (data) => {
      // OPA logs come through stderr, process them the same way as stdout
      const lines = data.toString().split('\n')

      lines.forEach((line) => {
        if (line.trim()) {
          try {
            const logEntry = JSON.parse(line)

            // Check if this is a decision log entry
            if (
              logEntry.type === 'openpolicyagent.org/decision_logs' &&
              logEntry.decision_id
            ) {
              // Transform OPA decision log to our format
              const pdpLog = {
                timestamp: logEntry.timestamp || new Date().toISOString(),
                decision_id: logEntry.decision_id,
                policy: logEntry.path || 'unknown',
                input: logEntry.input,
                result: logEntry.result,
                decision: logEntry.result ? 'ALLOW' : 'DENY',
                level: 'info',
                message: `Policy evaluation: ${logEntry.path || 'unknown'}`,
                metrics: logEntry.metrics
              }

              // Add to PDP logs
              dashboardData.pdpLogs.unshift(pdpLog)
              if (dashboardData.pdpLogs.length > 100)
                dashboardData.pdpLogs.pop()

              // Broadcast to connected clients
              io.emit('pdp-log', pdpLog)

              console.log(
                '📊 OPA Decision Log captured:',
                JSON.stringify(pdpLog, null, 2)
              )
            }
          } catch (error) {
            // Not a JSON log entry, ignore
          }
        }
      })
    })

    dockerLogs.on('error', (error) => {
      console.error('❌ Error monitoring Docker logs:', error)
    })

    dockerLogs.on('close', (code) => {
      console.log(`📊 Docker logs process exited with code ${code}`)
    })

    console.log('✅ OPA Docker log monitoring started')
  } catch (error) {
    console.error('❌ Failed to start OPA log monitoring:', error)
    console.log('📝 Will use manual decision logging instead')
  }
}

// Simulate some initial data and periodic updates
function simulateInitialData() {
  // Add some sample app logs
  dashboardData.appLogs.push({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message: 'PAP Service started - monitoring OPA decisions',
    source: 'pap-service'
  })

  // Start monitoring OPA decision logs
  startOpaLogMonitoring()
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
