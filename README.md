# OPA + DNC Policy POC

A proof-of-concept demonstrating an AWS API Gateway custom authorizer that calls a dockerized Open Policy Agent (OPA) server for "Do Not Contact" (DNC) policy enforcement.

## Overview

This POC demonstrates two policy systems:

### 1. DNC (Do Not Contact) Policy

Checks three data sources to determine if an expert can be contacted:

- **Company Restrictions** - Runtime data loaded via API calls
- **Country Restrictions** - Build-time data baked into OPA container
- **Expert Preferences** - External service calls via HTTP API

### 2. Lambda Authorizer Policy

JWT-based access control for API endpoints:

- **User Access** - Users can access their own data
- **Admin Access** - Admins can access any data

## Architecture

```text
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Gateway   │───▶│ Lambda Authorizer│───▶│  OPA Server     │
│                 │    │                  │    │  :8181          │
└─────────────────┘    └──────────────────┘    └─────────┬───────┘
                                                         │
                       ┌─────────────────────────────────┼─────────────────┐
                       │                                 ▼                 │
                       │                    ┌─────────────────────┐        │
                       │                    │   DNC Policy        │        │
                       │                    │   Authorization     │        │
                       │                    │   Policy            │        │
                       │                    └─────────┬───────────┘        │
                       │                              │                    │
                       │              ┌───────────────┼───────────────┐    │
                       │              ▼               ▼               ▼    │
                       │    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
                       │    │ Company     │ │ Country     │ │ Preferences ││
                       │    │ Data        │ │ Data        │ │ Service     ││
                       │    │ (Runtime)   │ │ (Build-time)│ │ :3002       ││
                       │    └─────────────┘ └─────────────┘ └─────────────┘│
                       │                                                   │
                       └───────────────────────────────────────────────────┘
                                              OPA Container

┌─────────────────────────────────────────────────────────────────────────────┐
│                            Supporting Services                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ Preferences API │    │   Swagger UI    │    │  SAM Local      │          │
│  │ (Express.js)    │    │   :3003         │    │  API: :3000     │          │
│  │ Static Mock     │    │                 │    │  Lambda: :3001  │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

One command to set up everything

```bash
./setup.sh
```

This will:

- Start OPA server and Preferences service (static mock + Swagger UI)
- Load DNC data automatically
- Test the policy integration
- Show you what's available

## What You Get

### Services Running

- **OPA Server**: `http://localhost:8181`
- **Preferences Service**: `http://localhost:3002` (static mock API)
- **Swagger UI**: `http://localhost:3003` (interactive API documentation)

### Test Commands

```bash
# Test DNC policy
curl -X POST http://localhost:8181/v1/data/policies/dnc/can_contact \
  -H "Content-Type: application/json" \
  -d '{"input":{"expert":{"id":"expert_999"},"project":{"type":"pharmaceuticals"}}}'

# Test preferences service
curl -H "Authorization: Bearer mock-token" http://localhost:3002/experts/expert_999/preferences

# Run comprehensive tests
cd sam-app && npx playwright test dnc-policy.spec.js
```

## Key Features

✅ **Static Mock Service** - Predictable API responses with Swagger UI documentation
✅ **Complete Policy Testing** - 18 test cases covering all scenarios
✅ **Real HTTP Integration** - OPA calls external preferences service
✅ **Docker Compose Setup** - Everything containerized
✅ **Comprehensive Documentation** - OpenAPI spec with examples
✅ **Multiple Data Loading Patterns** - Demonstrates build-time vs runtime data

## Data Loading Approaches

This POC demonstrates **three different data loading patterns**:

### 🏗️ **Build-time Data (Countries)**

- Country restrictions are **baked into the OPA container** at build time
- Data is immutable and version-controlled with the container image
- Best for: Static reference data, compliance rules, configuration

### 🔄 **Runtime Data (Companies)**

- Company restrictions are **loaded via API calls** at runtime
- Data can be updated without rebuilding containers
- Best for: Dynamic business data, frequently changing rules

### 🌐 **External Service Data (Preferences)**

- Expert preferences are **fetched from external service** on each policy evaluation
- Real-time data with no local caching
- Best for: User preferences, real-time decisions, external system integration

## Example Results

```bash
# Expert with pharmaceutical exclusions - BLOCKED
{"result": false}

# Same expert with technology project - ALLOWED
{"result": true}
```

## Project Structure

```text
├── setup.sh                    # One-command setup
├── docker-compose.yml          # OPA + Preferences service
├── opa/
│   └── Dockerfile              # Custom OPA image with build-time data
├── policies/
│   ├── dnc/
│   │   └── dnc.rego            # DNC policy rules
│   ├── authz/
│   │   └── authz.rego          # Lambda authorizer policy rules
│   └── data/                   # Runtime data (companies, config)
├── mock-services/
│   └── preferences-api.yaml    # OpenAPI specification
├── sam-app/                    # Lambda authorizer (optional)
└── scripts/
    └── load-dnc-data.sh        # Runtime data loading utility
```

## Stop Services

```bash
docker-compose down
```

## Development

The POC uses:

- **OPA** for policy engine
- **Express.js + Swagger UI** for static API mocking and documentation
- **Playwright** for comprehensive testing
- **Docker Compose** for service orchestration

For detailed documentation, see:

- [DNC Policy Details](policies/README.md)
- [Preferences Service API](mock-services/README.md)
- [SAM Lambda Setup](sam-app/README.md)
