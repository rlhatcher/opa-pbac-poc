# 🚀 OPA PBAC POC - Complete Setup Guide

This guide provides multiple ways to set up the OPA Policy-Based Access Control (PBAC) Proof of Concept, from simple automated setup to manual step-by-step installation.

## 📋 Prerequisites

- **Node.js 18+** and npm
- **Docker Desktop** (running)
- **Available Ports**: 3000, 3001, 3002, 3003, 3004, 8181
- **Optional**: AWS SAM CLI (for Lambda testing)

## 🎯 Quick Start Options

### Option 1: Fully Automated Setup (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd opa-pbac-poc

# Run automated setup with default configuration
./scripts/auto-setup.sh --yes
```

### Option 2: Interactive Complete Setup

```bash
# Clone the repository
git clone <repo-url>
cd opa-pbac-poc

# Run interactive setup with user prompts
./scripts/complete-setup.sh
```

### Option 3: Step-by-Step Manual Setup

```bash
# 1. Install dependencies and create environment
./scripts/install.sh

# 2. Set up SAM CLI and AWS credentials (optional)
./scripts/setup-sam.sh

# 3. Start Docker services and load data
./setup.sh
```

## ⚙️ Configuration Options

### Automated Setup Configuration

Edit `scripts/setup-config.json` to customize the automated setup:

```json
{
  "options": {
    "install_sam_cli": true, // Install SAM CLI automatically
    "setup_aws_credentials": true, // Set up AWS credentials
    "use_dummy_aws_credentials": false, // Use dummy creds for local dev
    "run_tests_after_setup": true, // Run integration tests
    "open_browser_after_setup": true, // Open dashboard in browser
    "auto_start_sam_local": false // Start SAM local services
  },
  "aws": {
    "default_region": "us-east-1",
    "default_output": "json"
  },
  "services": {
    "opa_port": 8181,
    "preferences_port": 3002,
    "pap_dashboard_port": 3004,
    "swagger_ui_port": 3003
  }
}
```

### Environment Configuration

The setup automatically creates a `.env` file from `scripts/defaults.env`. You can customize it:

```bash
# Edit environment variables
cp scripts/defaults.env .env
# Modify .env as needed
```

## 📊 What Gets Installed

### Dependencies (All Directories)

- ✅ **SAM Lambda Functions**: `sam-app/opa-poc/` (jsonwebtoken, node-fetch)
- ✅ **SAM App Tests**: `sam-app/` (@playwright/test, jsonwebtoken)
- ✅ **Mock Services**: `mock-services/` (express, swagger-ui-express)
- ✅ **PAP Service Backend**: `pap-service/` (express, socket.io, axios)
- ✅ **PAP Service Frontend**: `pap-service/frontend/` (React, Vite, Tailwind)
- ✅ **Playwright Browsers**: For end-to-end testing

### Docker Services

- ✅ **OPA Server** (port 8181) - Policy Decision Point
- ✅ **Preferences Service** (port 3002) - Mock API
- ✅ **PAP Dashboard** (port 3004) - Policy Administration
- ✅ **Swagger UI** (port 3003) - API Documentation

### Optional Components

- ⚡ **AWS SAM CLI** - For Lambda local development
- 🔧 **AWS Credentials** - For SAM local testing
- 🧪 **Integration Tests** - Playwright-based testing

## 🎉 After Setup

### Available Services

Once setup is complete, you'll have access to:

| Service                 | URL                   | Description               |
| ----------------------- | --------------------- | ------------------------- |
| 🔐 OPA Policy Server    | http://localhost:8181 | Policy decisions and data |
| 📋 Preferences API      | http://localhost:3002 | Mock preferences service  |
| 🎛️ PAP Dashboard        | http://localhost:3004 | Policy administration UI  |
| 📚 API Documentation    | http://localhost:3003 | Swagger UI for APIs       |
| 🔧 SAM API Gateway      | http://localhost:3000 | Lambda API (when started) |
| ⚡ SAM Lambda Functions | http://localhost:3001 | Direct Lambda access      |

### Quick Test Commands

```bash
# Test OPA policy decision
curl -X POST http://localhost:8181/v1/data/policies/dnc/can_contact \
  -H 'Content-Type: application/json' \
  -d '{"input": {"expert": {"company": "TestCorp", "country": "US"}}}'

# View DNC companies
curl http://localhost:8181/v1/data/dnc/companies

# Check service health
curl http://localhost:3002/health
curl http://localhost:3004
```

### Starting SAM Local Development

If SAM CLI was installed:

```bash
# Start SAM API Gateway
cd sam-app
sam local start-api --port 3000

# In another terminal, start Lambda functions
sam local start-lambda --port 3001
```

## 🔧 Troubleshooting

### Common Issues

**Port Conflicts**

```bash
# Check what's using ports
lsof -i :8181
lsof -i :3002
lsof -i :3004

# Stop conflicting services
docker-compose down
```

**Docker Issues**

```bash
# Rebuild containers
docker-compose build --no-cache

# Clean Docker system
docker system prune -f
```

**SAM CLI Issues**

```bash
# Reinstall SAM CLI
./scripts/setup-sam.sh

# Check SAM version
sam --version
```

**AWS Credentials**

```bash
# Create dummy credentials for local testing
./scripts/setup-sam.sh
# Choose option 2 for dummy credentials
```

### Reset Everything

```bash
# Stop all services
docker-compose down

# Clean up
rm -rf node_modules */node_modules
rm .env pap-service/.env pap-service/frontend/.env

# Start fresh
./scripts/auto-setup.sh --yes
```

## 📁 Script Reference

| Script                      | Purpose                           | Usage                             |
| --------------------------- | --------------------------------- | --------------------------------- |
| `scripts/install.sh`        | Install dependencies, create .env | `./scripts/install.sh`            |
| `scripts/setup-sam.sh`      | Install SAM CLI, setup AWS        | `./scripts/setup-sam.sh [--auto]` |
| `scripts/auto-setup.sh`     | Fully automated setup             | `./scripts/auto-setup.sh [--yes]` |
| `scripts/complete-setup.sh` | Interactive complete setup        | `./scripts/complete-setup.sh`     |
| `setup.sh`                  | Start Docker services             | `./setup.sh`                      |

## 🎯 Development Workflow

### For Policy Development

1. Edit policies in `policies/`
2. Rebuild OPA container: `docker-compose build opa`
3. Restart: `docker-compose restart opa`

### For Frontend Development

1. Start services: `./scripts/auto-setup.sh`
2. Develop frontend: `cd pap-service/frontend && npm run dev`
3. Backend auto-reloads via nodemon

### For Lambda Development

1. Ensure SAM CLI is installed
2. Start SAM local: `cd sam-app && sam local start-api`
3. Test Lambda functions locally

## 📖 Additional Documentation

- **Project Overview**: `README.md`
- **API Documentation**: http://localhost:3003 (Swagger UI)
- **Policy Documentation**: `docs/policies/`
- **Architecture**: `docs/architecture/`

---

**Need Help?** Check the troubleshooting section above or review the individual script documentation.
