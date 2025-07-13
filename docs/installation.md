# Installation Guide

This guide covers the installation and setup process for the OPA PBAC Proof of Concept.

## Quick Start

The simplest way to get everything running is with the one-command setup:

```bash
./setup.sh
```

This script will:

- Install all dependencies
- Start OPA server and Preferences service (static mock + Swagger UI)
- Build and start SAM Local API and Lambda services
- Start PAP dashboard for monitoring and management
- Load DNC data automatically
- Run comprehensive tests
- Show you what's available

## Prerequisites

Before running the setup script, ensure you have:

- **Node.js 18+** and npm
- **AWS SAM CLI** - [Installation Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- **Docker** - For OPA server and containerized services
- **Git** - For cloning the repository

## Manual Installation

If you prefer to install dependencies manually, you can use the dedicated installation script:

```bash
./scripts/install.sh
```

This script installs:

- Node.js dependencies for all services
- Playwright browsers for testing
- AWS SAM CLI (if not already installed)
- Docker dependencies

## Services After Installation

Once setup is complete, you'll have these services running:

- **PDP** OPA Server: `http://localhost:8181` - Policy engine
- **PIP** Preferences Service: `http://localhost:3002` - Static mock API
- **PAP** Dashboard: `http://localhost:5177` - Policy administration interface
- **PEP** SAM Local API: `http://localhost:3000` - API Gateway simulation
- **Services** SAM Local Lambda: `http://localhost:3001` - Application services
- **Swagger UI**: `http://localhost:3003` - Interactive API documentation

## Verification

After installation, verify everything is working:

```bash
# Test OPA server
curl http://localhost:8181/health

# Test preferences service
curl http://localhost:3002/health

# Test SAM Local API
curl http://localhost:3000/health

# Test PAP dashboard
curl http://localhost:5177/health
```

## Troubleshooting

### Common Issues

- **Port conflicts**: Ensure ports 3000, 3001, 3002, 3003, 5177, 8181 are available
- **Docker not running**: Start Docker Desktop or Docker daemon
- **SAM CLI missing**: Install AWS SAM CLI following the official guide
- **Node.js version**: Ensure you're using Node.js 18 or later

### Reset Everything

If you encounter issues, you can reset and restart:

```bash
# Stop all services
docker-compose down

# Clean up SAM processes
pkill -f "sam local"

# Restart everything
./setup.sh
```

## Development Setup

For development work, you may want to start services individually:

```bash
# Start OPA and preferences service
docker-compose up -d

# Start SAM Local API (in one terminal)
cd sam-app && sam local start-api --port 3000

# Start SAM Local Lambda (in another terminal)
cd sam-app && sam local start-lambda --port 3001

# Start PAP dashboard (in another terminal)
cd pap-service && npm run dev
```

## Next Steps

After installation, see:

- **[Quick Start Guide](quick-start.md)** - Basic usage and testing
- **[Policy Documentation](policies.md)** - Understanding the policies
- **[SAM Application](sam-app.md)** - Lambda authorizer details
- **[PAP Dashboard](pap-dashboard.md)** - Dashboard usage guide
