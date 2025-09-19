# OPA PBAC Proof of Concept

A comprehensive proof-of-concept demonstrating Policy-Based Access Control (PBAC) using Open Policy Agent (OPA) with AWS API Gateway custom authorizers and a complete monitoring dashboard.

## 📚 Documentation Index

- **[Policy Documentation](docs/policies.md)** - DNC and authorization policy details
- **[SAM Application](docs/sam-app.md)** - Lambda authorizer, backend services, and testing
- **[Mock Services](docs/mock-services.md)** - Expert preferences API and Swagger UI
- **[PAP Dashboard](docs/pap-dashboard.md)** - Policy administration interface and monitoring
- **[Installation Guide](docs/installation.md)** - Dependency installation script

## Overview

This POC demonstrates a complete PBAC architecture with two distinct policy systems and comprehensive monitoring capabilities:

### 1. DNC (Do Not Contact) Policy

A business logic policy that evaluates multiple data sources to determine if an expert can be contacted for a project:

- **Input Validation** - Validates required fields and project types against known constants
- **Company Restrictions** - Runtime data loaded via API calls
- **Country Restrictions** - Build-time data baked into OPA container
- **Expert Preferences** - External service calls via HTTP API

### 2. Authorization Policy

JWT-based access control for API Gateway endpoints with role-based authorization:

- **User Access Control** - Users can only access their own data (`/user/{user_id}` where `user_id` matches JWT subject)
- **Admin Override** - Users with `admin` role can access any resource
- **Method Validation** - Supports GET, PUT, PATCH operations
- **Path-based Authorization** - Validates URL path structure and ownership
- **JWT Token Processing** - Decodes and validates JWT payload for user identity and roles

### 3. Policy Administration Point (PAP)

A comprehensive dashboard providing real-time monitoring and management:

- **PEP Interface** - Interactive policy testing forms
- **PDP Monitoring** - Real-time OPA decision logs
- **PIP Data Management** - Policy data source management
- **Application Logs** - Backend service monitoring

## Architecture

The system demonstrates two distinct OPA policy use cases:

1. **API Gateway Authorization** - JWT-based access control using `authz.rego`
2. **Business Logic Policies** - DNC (Do Not Contact) rules using `dnc.rego`

```text
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   API Gateway   │─────▶│ Lambda Authorizer│─────▶│   OPA Server    │
│                 │      │                  │      │     :8181       │
└─────────┬───────┘      └──────────────────┘      └─────────┬───────┘
          │                                        ┌─────────┘
          │                                        │
          │              ┌─────────────────────────┼─────────────────────────┐
          │              │                         ▼                         │
          │              │               ┌─────────────────────┐             │
          ▼              │               │    DNC Policy       │             │
┌─────────────────┐      │               │   Authorization     │             │
│ Lambda Backend  │      │               │      Policy         │             │
│                 │      │               └─────────┬───────────┘             │
└─────────────────┘      │                         │                         │
                         │         ┌───────────────┼───────────────┐         │
                         │         ▼               ▼               ▼         │
                         │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
                         │  │   Company   │ │   Country   │ │ Preferences │  │
                         │  │    Data     │ │    Data     │ │   Service   │  │
                         │  │ (Runtime)   │ │(Build-time) │ │    :3002    │  │
                         │  └─────────────┘ └─────────────┘ └─────────────┘  │
                         │                                                   │
                         └───────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            Supporting Services                              │
├─────────────────────────────────────────────────────────────────────────────┤
│   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐     │
│   │ Preferences API │      │   Swagger UI    │      │   SAM Local     │     │
│   │  (Express.js)   │      │     :3003       │      │  API: :3000     │     │
│   │  Static Mock    │      │                 │      │ Lambda: :3001   │     │
│   └─────────────────┘      └─────────────────┘      └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        PAP Dashboard (:5177)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│   ┌─────────────────┬─────────────────┐                                     │
│   │   Q1: PEP       │   Q2: PDP       │  PEP = Policy Enforcement Point    │
│   │ Policy Testing  │ Decision Logs   │  PDP = Policy Decision Point       │
│   │ • DNC Forms     │ • OPA Logs      │  PIP = Policy Information Point    │
│   │ • Auth Forms    │ • Real-time     │  PAP = Policy Administration Point │
│   ├─────────────────┼─────────────────┤                                     │
│   │   Q3: PIP       │   Q4: App       │                                     │
│   │ Data Management │ Service Logs    │                                     │
│   │ • Companies     │ • Lambda Logs   │                                     │
│   │ • Countries     │ • Auth Events   │                                     │
│   └─────────────────┴─────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js v20.19+ and npm
- Docker and Docker Compose
- AWS SAM CLI (optional, for Lambda testing)
  - [Install the AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

### One Command Setup

```bash
./setup.sh
```

or for local development

```bash
nvm use
sam --version
PAP_DEV_MODE=true ./setup.sh
```

This command will:

- Start OPA server and Preferences service (static mock + Swagger UI)
- Build and start SAM Local API and Lambda services
- Start PAP dashboard for monitoring and management
- Load DNC data automatically
- Run comprehensive tests
- Show you what's available

## What You Get

### Services Running

- **PDP** OPA Server: `http://localhost:8181` - Policy engine
- **PIP** Preferences Service: `http://localhost:3002` - Static mock API
- **PAP** Dashboard: `http://localhost:5177` - Policy administration interface
- **PEP** SAM Local API: `http://localhost:3000` - API Gateway simulation
- **Services** SAM Local Lambda: `http://localhost:3001` - Application services
- **Swagger UI**: `http://localhost:3003` - Interactive API documentation

### Test Commands

```bash
# Test DNC policy directly
curl -X POST http://localhost:8181/v1/data/policies/dnc/can_contact \
  -H "Content-Type: application/json" \
  -d '{"input":{"expert":{"id":"expert_999"},"project":{"type":"pharmaceuticals"}}}'

# Test preferences service
curl -H "Authorization: Bearer mock-token" http://localhost:3002/experts/expert_999/preferences

# Test via API Gateway
curl -X POST http://localhost:3000/policies/dnc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"input":{"expert":{"id":"expert_999"},"project":{"type":"pharmaceuticals"}}}'

# Run comprehensive tests
cd sam-app && npx playwright test
```

## Authorization System

The POC demonstrates a complete JWT-based authorization system using OPA policies:

### Lambda Authorizer Flow

1. **API Gateway** receives request with `Authorization: Bearer <jwt-token>` header
2. **Lambda Authorizer** extracts and decodes the JWT token
3. **OPA Query** - Authorizer calls OPA with request context and user claims
4. **Policy Decision** - OPA evaluates authorization rules and returns allow/deny
5. **IAM Policy** - Authorizer returns IAM policy document to API Gateway

### Authorization Rules

The `authz.rego` policy implements these access controls:

```bash
# Test user accessing own data (ALLOWED)
curl -X POST http://localhost:8181/v1/data/policies/authz/allow \
  -H "Content-Type: application/json" \
  -d '{"input": {"method": "GET", "path": ["user", "alice"], "token": {"payload": {"sub": "alice", "roles": ["user"]}}}}'

# Test admin accessing any data (ALLOWED)
curl -X POST http://localhost:8181/v1/data/policies/authz/allow \
  -H "Content-Type: application/json" \
  -d '{"input": {"method": "GET", "path": ["user", "bob"], "token": {"payload": {"sub": "admin", "roles": ["admin"]}}}}'

# Test user accessing other user's data (DENIED)
curl -X POST http://localhost:8181/v1/data/policies/authz/allow \
  -H "Content-Type: application/json" \
  -d '{"input": {"method": "GET", "path": ["user", "bob"], "token": {"payload": {"sub": "alice", "roles": ["user"]}}}}'
```

### JWT Token Format

The system expects JWT tokens with this payload structure:

```json
{
  "sub": "alice", // User identifier
  "roles": ["user"], // User roles (user, admin)
  "iat": 1640995200, // Issued at timestamp
  "exp": 1641081600 // Expiration timestamp
}
```

## Key Features

- **Static Mock Service** - Predictable API responses with Swagger UI documentation
- **Complete Policy Testing** - 30 test cases covering all scenarios
- **Real HTTP Integration** - OPA calls external preferences service
- **Docker Compose Setup** - Everything containerized
- **Comprehensive Documentation** - OpenAPI spec with examples
- **Multiple Data Loading Patterns** - Demonstrates 4 different data loading approaches
- **Build-time Constants** - Hardcoded validation sets for optimal performance
- **Modern OPA Syntax** - Uses latest Rego v1 with `import rego.v1`
- **Enhanced Validation** - Project type validation catches input errors early
- **Real-time Monitoring** - Live policy decision logs and system monitoring
- **Interactive Dashboard** - Complete PAP interface for policy management

## Data Loading Approaches

This POC demonstrates **four different data loading patterns**:

### 🔧 **Build-time Constants (Hardcoded)**

- Project types and known project types are **hardcoded as constants** in the policy
- Provides fastest performance and best static analysis support
- Best for: Known enumeration values, validation constants, reference data

```rego
known_project_types := {"financial_services", "healthcare", "technology", ...}
```

### 🏗️ **Build-time Data (Container Baked-in)**

- Country restrictions and configuration are **baked into the OPA container** at build time
- Data is immutable and version-controlled with the container image
- Best for: Static reference data, compliance rules, configuration

### 🔄 **Runtime Data (API Loaded)**

- Company restrictions are **loaded via API calls** at runtime
- Data can be updated without rebuilding containers
- Best for: Dynamic business data, frequently changing rules

### 🌐 **External Service Data (Real-time)**

- Expert preferences are **fetched from external service** on each policy evaluation
- Real-time data with no local caching
- Best for: User preferences, real-time decisions, external system integration

## Example Results

```bash
# Expert with pharmaceutical exclusions - BLOCKED
{"result": false}

# Same expert with technology project - ALLOWED
{"result": true}

# Invalid project type - VALIDATION ERROR
{"result": false, "validation_errors": ["project.type 'invalid_type' is not a recognized project type"]}
```

## Testing Both Policy Types

The POC includes comprehensive tests for both authorization and business logic policies:

### Authorization Policy Tests

```bash
# Test authorization policy directly
cd sam-app && npx playwright test opa-authorizer.spec.js

# Test Lambda authorizer integration
cd sam-app && npx playwright test lambda-authorizer.spec.js
```

### DNC Policy Tests

```bash
# Test DNC policy directly
cd sam-app && npx playwright test dnc-policy.spec.js

# Test all policies together
cd sam-app && npx playwright test
```

### Manual Testing Examples

**Authorization Tests:**

```bash
# User accessing own data (should allow)
curl -X POST http://localhost:8181/v1/data/policies/authz/allow \
  -d '{"input": {"method": "GET", "path": ["user", "alice"], "token": {"payload": {"sub": "alice", "roles": ["user"]}}}}'

# Admin accessing any data (should allow)
curl -X POST http://localhost:8181/v1/data/policies/authz/allow \
  -d '{"input": {"method": "GET", "path": ["user", "bob"], "token": {"payload": {"sub": "admin", "roles": ["admin"]}}}}'
```

**DNC Policy Tests:**

```bash
# Expert in sanctioned country (should deny)
curl -X POST http://localhost:8181/v1/data/policies/dnc/can_contact \
  -d '{"input": {"expert": {"id": "expert_123", "country_id": "CN"}, "project": {"type": "technology"}}}'

# Expert with pharmaceutical exclusions (should deny)
curl -X POST http://localhost:8181/v1/data/policies/dnc/can_contact \
  -d '{"input": {"expert": {"id": "expert_999"}, "project": {"type": "pharmaceuticals"}}}'
```

## Enhanced Policy Features

### Input Validation

The policy now includes comprehensive input validation:

```bash
# Test with invalid project type
curl -X POST http://localhost:8181/v1/data/policies/dnc/decision_details \
  -H "Content-Type: application/json" \
  -d '{"input":{"expert":{"id":"expert_123","current_company_id":"acme","country_id":"US"},"project":{"id":"proj_1","type":"invalid_type"}}}'
```

### Build-time Constants

The policy leverages hardcoded constants for optimal performance:

- **Valid Project Types**: `financial_services`, `healthcare`, `technology`, `manufacturing`, `energy`, `telecommunications`, `automotive`, `aerospace`, `pharmaceuticals`, `consulting`

## Project Structure

```text
├── setup.sh                    # One-command setup
├── scripts/
│   ├── install.sh              # Dependency installation
│   └── load-dnc-data.sh        # Runtime data loading utility
├── docker-compose.yml          # OPA + Preferences service
├── opa/
│   └── Dockerfile              # Custom OPA image with build-time data
├── policies/
│   ├── dnc/
│   │   └── dnc.rego            # DNC policy rules
│   ├── authz/
│   │   └── authz.rego          # Authorization policy rules
│   └── data/                   # Runtime data (companies, config)
├── mock-services/
│   ├── server.js               # Express.js mock server
│   ├── preferences-api.yaml    # OpenAPI specification
│   └── static-preferences.json # Test data
├── sam-app/                    # Lambda authorizer and tests
│   ├── opa-poc/                # Lambda functions
│   └── tests/                  # Playwright E2E tests
└── pap-service/                # Policy Administration Point
    ├── server.js               # Backend server
    └── frontend/               # React dashboard
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

- [Policy Documentation](docs/policies.md) - DNC and authorization policy details
- [Preferences Service API](docs/mock-services.md) - Mock service documentation
- [SAM Lambda Setup](docs/sam-app.md) - Lambda authorizer and testing
- [PAP Dashboard](docs/pap-dashboard.md) - Policy administration interface
