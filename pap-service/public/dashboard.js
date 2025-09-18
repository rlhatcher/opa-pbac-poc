// Dashboard JavaScript for OPA PAP Service
class PAPDashboard {
  constructor() {
    this.socket = io()
    this.initializeEventListeners()
    this.initializeWebSocket()
    this.checkServiceStatus()
    this.loadInitialData()
    this.initializeSwaggerUI()
  }

  initializeEventListeners() {
    // Q1: PEP Interface forms
    document.getElementById('dnc-form').addEventListener('submit', (e) => {
      e.preventDefault()
      this.testDNCPolicy()
    })

    document.getElementById('authz-form').addEventListener('submit', (e) => {
      e.preventDefault()
      this.testAuthzPolicy()
    })

    // Auto-scroll checkboxes
    document
      .getElementById('auto-scroll-pdp')
      .addEventListener('change', (e) => {
        this.autoScrollPDP = e.target.checked
      })

    document
      .getElementById('auto-scroll-app')
      .addEventListener('change', (e) => {
        this.autoScrollApp = e.target.checked
      })
  }

  initializeWebSocket() {
    this.socket.on('connect', () => {
      console.log('Connected to PAP service')
      this.updateConnectionStatus(true)
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from PAP service')
      this.updateConnectionStatus(false)
    })

    this.socket.on('initial-data', (data) => {
      this.loadDashboardData(data)
    })

    this.socket.on('pep-request', (data) => {
      this.addPEPRequest(data)
    })

    this.socket.on('pdp-log', (data) => {
      this.addPDPLog(data)
    })

    this.socket.on('pip-data-update', (data) => {
      this.updatePIPData(data)
    })

    this.socket.on('app-log', (data) => {
      this.addAppLog(data)
    })
  }

  async checkServiceStatus() {
    const services = [
      { id: 'opa-status', url: 'http://localhost:8181/health', name: 'OPA' },
      {
        id: 'preferences-status',
        url: 'http://localhost:3002/health',
        name: 'Preferences'
      },
      { id: 'sam-status', url: 'http://localhost:3000', name: 'SAM Local' }
    ]

    for (const service of services) {
      try {
        const response = await fetch(service.url, { mode: 'no-cors' })
        this.updateServiceStatus(service.id, true)
      } catch (error) {
        this.updateServiceStatus(service.id, false)
      }
    }
  }

  updateServiceStatus(elementId, isOnline) {
    const element = document.getElementById(elementId)
    const span = element.querySelector('span')

    element.className = `status ${isOnline ? 'online' : 'offline'}`
    span.textContent = isOnline ? 'Online' : 'Offline'
  }

  updateConnectionStatus(connected) {
    // Update UI to show connection status
    const header = document.querySelector('header h1')
    if (connected) {
      header.style.opacity = '1'
    } else {
      header.style.opacity = '0.7'
    }
  }

  async loadInitialData() {
    try {
      // Load PIP data
      const pipResponse = await fetch('/api/pip/data')
      const pipData = await pipResponse.json()
      this.displayPIPData(pipData)

      // Load logs
      const [pdpResponse, appResponse] = await Promise.all([
        fetch('/api/pdp/logs'),
        fetch('/api/app/logs')
      ])

      const pdpLogs = await pdpResponse.json()
      const appLogs = await appResponse.json()

      this.displayPDPLogs(pdpLogs)
      this.displayAppLogs(appLogs)
    } catch (error) {
      console.error('Failed to load initial data:', error)
    }
  }

  loadDashboardData(data) {
    this.displayPIPData(data.pipData)
    this.displayPDPLogs(data.pdpLogs)
    this.displayAppLogs(data.appLogs)
  }

  // Q1: PEP Interface Methods
  async testDNCPolicy() {
    const expert = {
      id: document.getElementById('expert-id').value,
      current_company_id:
        document.getElementById('company-id').value || undefined,
      country_id: document.getElementById('country-id').value || undefined
    }

    const project = {
      type: document.getElementById('project-type').value
    }

    try {
      const response = await fetch('/api/pep/test-dnc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expert, project })
      })

      const result = await response.json()
      this.displayPEPResponse(result)
    } catch (error) {
      this.displayPEPResponse({ error: error.message })
    }
  }

  async testAuthzPolicy() {
    const method = document.getElementById('http-method').value
    const path = document
      .getElementById('request-path')
      .value.split(',')
      .map((s) => s.trim())
    const roles = document
      .getElementById('user-roles')
      .value.split(',')
      .map((s) => s.trim())
      .filter((r) => r)

    const token = {
      payload: {
        sub: document.getElementById('user-subject').value,
        roles: roles
      }
    }

    try {
      const response = await fetch('/api/pep/test-authz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, path, token })
      })

      const result = await response.json()
      this.displayPEPResponse(result)
    } catch (error) {
      this.displayPEPResponse({ error: error.message })
    }
  }

  displayPEPResponse(data) {
    const responseElement = document.getElementById('pep-response')
    responseElement.textContent = JSON.stringify(data, null, 2)

    // Add syntax highlighting
    this.highlightJSON(responseElement)
  }

  addPEPRequest(data) {
    // This could be used to show a history of requests
    console.log('New PEP request:', data)
  }

  // Q2: PDP Logs Methods
  displayPDPLogs(logs) {
    const container = document.getElementById('pdp-logs')
    container.innerHTML = ''

    if (logs.length === 0) {
      container.innerHTML = '<div class="log-entry">No PDP logs yet...</div>'
      return
    }

    logs.forEach((log) => this.addPDPLogEntry(log))
  }

  addPDPLog(log) {
    this.addPDPLogEntry(log, true)
  }

  addPDPLogEntry(log, isNew = false) {
    const container = document.getElementById('pdp-logs')
    const entry = document.createElement('div')
    entry.className = `log-entry ${log.level || 'info'} ${isNew ? 'new' : ''}`

    const timestamp = new Date(log.timestamp).toLocaleTimeString()
    entry.innerHTML = `
            <span style="color: hsl(var(--muted-foreground));">[${timestamp}]</span>
            <span style="color: hsl(var(--primary));">${
              log.policy || 'unknown'
            }</span>
            <span style="color: ${
              log.result ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'
            };">${log.decision || log.result}</span>
            ${log.message ? `<br>${log.message}` : ''}
        `

    container.insertBefore(entry, container.firstChild)

    // Limit log entries
    while (container.children.length > 100) {
      container.removeChild(container.lastChild)
    }

    if (this.autoScrollPDP && isNew) {
      container.scrollTop = 0
    }
  }

  clearPdpLogs() {
    document.getElementById('pdp-logs').innerHTML =
      '<div class="log-entry">Logs cleared...</div>'
  }

  // Q3: PIP Data Management Methods
  displayPIPData(data) {
    this.displayCompaniesData(data.companies || {})
    this.displayCountriesData(data.countries || {})
    this.displayPreferencesData(data.preferences || {})
  }

  displayCompaniesData(companies) {
    const container = document.getElementById('companies-data')
    container.textContent = JSON.stringify(companies, null, 2)
    this.highlightJSON(container)
  }

  displayCountriesData(countries) {
    const container = document.getElementById('countries-data')
    container.textContent = JSON.stringify(countries, null, 2)
    this.highlightJSON(container)
  }

  displayPreferencesData(preferences) {
    const container = document.getElementById('preferences-data')
    container.textContent = JSON.stringify(preferences, null, 2)
    this.highlightJSON(container)
  }

  updatePIPData(update) {
    if (update.type === 'companies') {
      this.displayCompaniesData(update.data)
    } else if (update.type === 'countries') {
      this.displayCountriesData(update.data)
    } else if (update.type === 'preferences') {
      this.displayPreferencesData(update.data)
    }
  }

  async loadPipData() {
    try {
      const response = await fetch('/api/pip/data')
      const data = await response.json()
      this.displayPIPData(data)
    } catch (error) {
      console.error('Failed to load PIP data:', error)
    }
  }

  // Q4: Application Logs Methods
  displayAppLogs(logs) {
    const container = document.getElementById('app-logs')
    container.innerHTML = ''

    if (logs.length === 0) {
      container.innerHTML =
        '<div class="log-entry">No application logs yet...</div>'
      return
    }

    logs.forEach((log) => this.addAppLogEntry(log))
  }

  addAppLog(log) {
    this.addAppLogEntry(log, true)
  }

  addAppLogEntry(log, isNew = false) {
    const container = document.getElementById('app-logs')
    const entry = document.createElement('div')
    entry.className = `log-entry ${(log.level || 'info').toLowerCase()} ${
      isNew ? 'new' : ''
    }`

    const timestamp = new Date(log.timestamp).toLocaleTimeString()
    entry.innerHTML = `
            <span style="color: hsl(var(--muted-foreground));">[${timestamp}]</span>
            <span style="color: hsl(var(--secondary));">${
              log.source || 'app'
            }</span>
            <span style="color: hsl(var(--primary));">${
              log.level || 'INFO'
            }</span>
            ${log.message}
        `

    container.insertBefore(entry, container.firstChild)

    // Limit log entries
    while (container.children.length > 100) {
      container.removeChild(container.lastChild)
    }

    if (this.autoScrollApp && isNew) {
      container.scrollTop = 0
    }
  }

  clearAppLogs() {
    document.getElementById('app-logs').innerHTML =
      '<div class="log-entry">Logs cleared...</div>'
  }

  // Swagger UI Initialization
  initializeSwaggerUI() {
    // Initialize Swagger UI with the policies API spec
    SwaggerUIBundle({
      url: '/policies-api.yaml',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.presets.standalone
      ],
      plugins: [SwaggerUIBundle.plugins.DownloadUrl],
      layout: 'BaseLayout',
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      defaultModelRendering: 'example',
      displayOperationId: false,
      tryItOutEnabled: true,
      requestInterceptor: (request) => {
        // Modify requests to go through our proxy if needed
        if (request.url.includes('/v1/data/policies')) {
          request.url = request.url.replace(
            'http://localhost:8181/v1/data/policies',
            '/api/pep/opa-proxy'
          )
        }
        return request
      },
      responseInterceptor: (response) => {
        // Handle responses and update our response tab
        if (response.body) {
          this.displayPEPResponse(response.body)
          // Switch to response tab to show result
          switchPepTab('response-tab')
        }
        return response
      }
    })
  }

  // Utility Methods
  highlightJSON(element) {
    let content = element.textContent

    // Simple JSON syntax highlighting
    content = content
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1":</span>')
      .replace(/: "([^"]+)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: null/g, ': <span class="json-null">null</span>')

    element.innerHTML = content
  }
}

// Tab switching functions

// Q1: PEP Interface main tabs
function switchPepTab(tabId) {
  // Hide all tab contents in Q1
  document.querySelectorAll('#q1-pep .tab-content').forEach((tab) => {
    tab.classList.remove('active')
  })

  // Remove active class from all tab buttons in Q1
  document.querySelectorAll('#q1-pep .tab-button').forEach((btn) => {
    btn.classList.remove('active')
  })

  // Show selected tab
  document.getElementById(tabId).classList.add('active')

  // Activate corresponding button
  document
    .querySelector(`[onclick="switchPepTab('${tabId}')"]`)
    .classList.add('active')
}

// Q1: Quick test sub-tabs
function switchQuickTab(tabId) {
  // Hide all quick tab contents
  document.querySelectorAll('.quick-tab-content').forEach((tab) => {
    tab.classList.remove('active')
  })

  // Remove active class from all quick tab buttons
  document.querySelectorAll('.quick-tab-button').forEach((btn) => {
    btn.classList.remove('active')
  })

  // Show selected tab
  document.getElementById(tabId).classList.add('active')

  // Activate corresponding button
  document
    .querySelector(`[onclick="switchQuickTab('${tabId}')"]`)
    .classList.add('active')
}

// Legacy function for backward compatibility
function switchTab(tabId) {
  switchQuickTab(tabId)
}

function switchPipTab(tabId) {
  // Hide all tab contents in Q3
  document.querySelectorAll('#q3-pip .tab-content').forEach((tab) => {
    tab.classList.remove('active')
  })

  // Remove active class from all tab buttons in Q3
  document.querySelectorAll('#q3-pip .tab-button').forEach((btn) => {
    btn.classList.remove('active')
  })

  // Show selected tab
  document.getElementById(tabId).classList.add('active')

  // Activate corresponding button
  document
    .querySelector(`[onclick="switchPipTab('${tabId}')"]`)
    .classList.add('active')
}

// Global functions for buttons
function clearPdpLogs() {
  dashboard.clearPdpLogs()
}

function clearAppLogs() {
  dashboard.clearAppLogs()
}

function loadPipData() {
  dashboard.loadPipData()
}

function addCompany() {
  const name = prompt('Enter company name:')
  if (name) {
    // TODO: Implement add company functionality
    alert('Add company functionality coming soon!')
  }
}

function addCountry() {
  const code = prompt('Enter country code (e.g., CN):')
  if (code) {
    // TODO: Implement add country functionality
    alert('Add country functionality coming soon!')
  }
}

function addPreference() {
  const expertId = prompt('Enter expert ID:')
  if (expertId) {
    // TODO: Implement add preference functionality
    alert('Add preference functionality coming soon!')
  }
}

function loadPreferences() {
  // TODO: Implement load preferences functionality
  alert('Load preferences functionality coming soon!')
}

function clearResponse() {
  document.getElementById('pep-response').textContent = 'Response cleared...'
}

function copyResponse() {
  const responseText = document.getElementById('pep-response').textContent
  navigator.clipboard
    .writeText(responseText)
    .then(() => {
      // Show brief feedback
      const button = event.target
      const originalText = button.textContent
      button.textContent = 'Copied!'
      setTimeout(() => {
        button.textContent = originalText
      }, 1000)
    })
    .catch((err) => {
      console.error('Failed to copy response:', err)
      alert('Failed to copy response to clipboard')
    })
}

// Initialize dashboard when page loads
let dashboard
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new PAPDashboard()
})
