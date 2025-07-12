const express = require('express')
const fs = require('fs')
const path = require('path')
const swaggerUi = require('swagger-ui-express')
const yaml = require('js-yaml')

const app = express()
const port = 3002

// Load static preferences data
const preferencesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'static-preferences.json'), 'utf8')
)

// Load OpenAPI spec for Swagger UI
const openApiSpec = yaml.load(
  fs.readFileSync(path.join(__dirname, 'preferences-api.yaml'), 'utf8')
)

// Middleware for JSON parsing
app.use(express.json())

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  )
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  next()
})

// Swagger UI setup
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Expert Preferences API',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      tryItOutEnabled: true,
      requestInterceptor: (req) => {
        // Auto-add the mock token for try-it-out
        if (!req.headers.Authorization) {
          req.headers.Authorization = 'Bearer mock-token'
        }
        return req
      }
    }
  })
)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'preferences-api' })
})

// Get expert preferences
app.get('/preferences/:expertId', (req, res) => {
  const { expertId } = req.params

  // Simple auth check
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.substring(7)
  if (token !== 'mock-token') {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Return static data for known experts
  if (preferencesData[expertId]) {
    return res.json(preferencesData[expertId])
  }

  // Return 404 for unknown experts
  res.status(404).json({
    error: 'Expert not found',
    expert_id: expertId
  })
})

// List all project types (for reference)
app.get('/project-types', (req, res) => {
  res.json({
    project_types: [
      'financial_services',
      'healthcare',
      'technology',
      'manufacturing',
      'energy',
      'telecommunications',
      'automotive',
      'aerospace',
      'pharmaceuticals',
      'consulting'
    ]
  })
})

// Serve OpenAPI spec for Swagger UI
app.get('/api-spec', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.json(openApiSpec)
})

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(
    `🎭 Preferences API mock server running on http://0.0.0.0:${port}`
  )
  console.log(
    `📋 Available experts: ${Object.keys(preferencesData).join(', ')}`
  )
  console.log(`📖 Swagger UI: http://localhost:${port}/api-docs`)
  console.log(`🔍 Try the API directly with static examples!`)
})
