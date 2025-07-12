# PAP Service - Policy Administration Point

A comprehensive dashboard for managing and monitoring the OPA PBAC (Policy-Based Access Control) system. The PAP service provides a 4-quadrant interface that demonstrates all components of the XACML architecture.

## Overview

The PAP (Policy Administration Point) service completes the XACML architecture by providing:

- **Policy Testing Interface** - Interactive forms to test policies
- **Real-time Monitoring** - Live logs from OPA and application services  
- **Data Management** - Interface to modify policy data sources
- **Comprehensive Visualization** - Complete view of the PBAC system

## Architecture Mapping

This service demonstrates the complete XACML architecture:

```
┌─────────────────┬─────────────────┐
│   Q1: PEP       │   Q2: PDP       │
│ Policy Enforce  │ Policy Decision │
│ • Test Forms    │ • OPA Logs      │
│ • API Calls     │ • Decisions     │
├─────────────────┼─────────────────┤
│   Q3: PIP       │   Q4: App       │
│ Policy Info     │ Application     │
│ • Data Mgmt     │ • Lambda Logs   │
│ • CRUD Ops      │ • Auth Events   │
└─────────────────┴─────────────────┘
```

## Features

### Q1: PEP Interface (Policy Enforcement Point)
- **DNC Policy Testing** - Test "Do Not Contact" policy with expert/project data
- **Authorization Testing** - Test JWT-based authorization policies
- **Interactive Forms** - Easy parameter input and response display
- **Real-time Results** - Immediate policy evaluation results

### Q2: PDP Logs (Policy Decision Point)
- **OPA Decision Logs** - Real-time stream of policy decisions
- **Policy Traces** - Detailed evaluation information
- **Auto-scroll** - Automatic log scrolling for live monitoring
- **Log Filtering** - Clear and manage log display

### Q3: PIP Data Management (Policy Information Point)
- **Companies Data** - Manage DNC company restrictions
- **Countries Data** - Manage DNC country restrictions  
- **Preferences Data** - Manage expert preferences
- **Real-time Updates** - Live data synchronization

### Q4: Application Service Logs
- **Lambda Logs** - Backend lambda function logs
- **Authorization Events** - API Gateway authorization events
- **Request Monitoring** - Track all system requests
- **Error Tracking** - Monitor system errors and issues

## Quick Start

1. **Install Dependencies**
   ```bash
   cd pap-service
   npm install
   ```

2. **Start the Service**
   ```bash
   npm start
   ```

3. **Access Dashboard**
   ```
   http://localhost:3004
   ```

## Configuration

The service connects to these external services:

- **OPA Server**: `http://localhost:8181`
- **Preferences API**: `http://localhost:3002`
- **SAM Local API**: `http://localhost:3000`
- **SAM Local Lambda**: `http://localhost:3001`

Environment variables:
```bash
PORT=3004
OPA_URL=http://localhost:8181
PREFERENCES_URL=http://localhost:3002
SAM_API_URL=http://localhost:3000
SAM_LAMBDA_URL=http://localhost:3001
```

## API Endpoints

### PEP Interface
- `POST /api/pep/test-dnc` - Test DNC policy
- `POST /api/pep/test-authz` - Test authorization policy

### PDP Monitoring  
- `GET /api/pdp/logs` - Get policy decision logs

### PIP Data Management
- `GET /api/pip/data` - Get all policy data
- `PUT /api/pip/companies` - Update companies data
- `PUT /api/pip/countries` - Update countries data

### Application Logs
- `GET /api/app/logs` - Get application logs

## WebSocket Events

Real-time updates via WebSocket:

- `pep-request` - New policy test request
- `pdp-log` - New OPA decision log
- `pip-data-update` - Policy data update
- `app-log` - New application log

## Usage Examples

### Test DNC Policy
```javascript
// Via API
fetch('/api/pep/test-dnc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    expert: {
      id: "expert_123",
      current_company_id: "comp_456", 
      country_id: "US"
    },
    project: {
      type: "technology"
    }
  })
})
```

### Test Authorization Policy
```javascript
// Via API
fetch('/api/pep/test-authz', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    method: "GET",
    path: ["user", "alice"],
    token: {
      payload: {
        sub: "alice",
        roles: ["user"]
      }
    }
  })
})
```

## Development

### Start in Development Mode
```bash
npm run dev
```

### File Structure
```
pap-service/
├── server.js              # Express server with WebSocket
├── package.json           # Dependencies and scripts
├── public/
│   ├── index.html         # 4-quadrant dashboard
│   ├── styles.css         # Dashboard styling
│   └── dashboard.js       # Frontend JavaScript
└── README.md             # This file
```

## Integration

The PAP service integrates with the existing OPA PBAC POC:

1. **Automatic Discovery** - Detects running services
2. **Real-time Sync** - Live updates from all components
3. **Policy Testing** - Direct integration with OPA policies
4. **Data Management** - CRUD operations on policy data

## Troubleshooting

### Service Status
The dashboard shows connection status for all services:
- **OPA**: Green = Online, Red = Offline
- **Preferences**: Green = Online, Red = Offline  
- **SAM Local**: Green = Online, Red = Offline

### Common Issues
1. **Services not detected** - Ensure all services are running on expected ports
2. **WebSocket disconnection** - Check network connectivity and service health
3. **Policy test failures** - Verify OPA server is running and policies are loaded

## Next Steps

Future enhancements:
- Policy editing interface
- Advanced log filtering and search
- Data export/import functionality
- Policy performance metrics
- Multi-environment support
