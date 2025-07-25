# OPA + DNC Policy POC

A proof-of-concept demonstrating an AWS API Gateway custom authorizer that calls a dockerized Open Policy Agent (OPA) server for "Do Not Contact" (DNC) policy enforcement.

## Overview

This POC demonstrates three policy systems:

### 1. DNC (Do Not Contact) Policy

Checks multiple data sources to determine if an expert can be contacted:

- **Input Validation** - Validates required fields and project types against known constants
- **Company Restrictions** - Runtime data loaded via API calls
- **Country Restrictions** - Build-time data baked into OPA container
- **Expert Preferences** - External service calls via HTTP API

**Enhanced Features:**

- Built-in project type validation against known constants
- Comprehensive input validation with helpful error messages

### 2. Lambda Authorizer Policy

JWT-based access control for API Gateway endpoints with role-based authorization:

- **User Access Control** - Users can only access their own data (`/user/{user_id}` where `user_id` matches JWT subject)
- **Admin Override** - Users with `admin` role can access any resource
- **Method Validation** - Supports GET, PUT, PATCH operations
- **Path-based Authorization** - Validates URL path structure and ownership
- **JWT Token Processing** - Decodes and validates JWT payload for user identity and roles

### 3. Data Filtering Policy

OpenSearch/Elasticsearch document filtering based on user roles and attributes:

- **Role-based Access** - Admins see all documents, employees see department-specific content
- **Attribute-based Filtering** - Documents filtered by department, ownership, and library access
- **OpenSearch Integration** - Generates OpenSearch DSL queries for efficient data filtering
- **Secure by Default** - Denies access unless explicitly allowed by policy rules

**Key Features:**

- Dynamic query generation based on user context
- Department-based document access control
- Document ownership validation
- Library-scoped access control
- Fail-safe deny-by-default security model

## Architecture

The system demonstrates three distinct OPA policy use cases:

1. **API Gateway Authorization** - JWT-based access control using `authz.rego`
2. **Business Logic Policies** - DNC (Do Not Contact) rules using `dnc.rego`
3. **Data Filtering** - OpenSearch document filtering using `data_filter.rego`

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

✅ **Static Mock Service** - Predictable API responses with Swagger UI documentation
✅ **Complete Policy Testing** - 30 test cases covering all scenarios
✅ **Real HTTP Integration** - OPA calls external preferences service
✅ **Docker Compose Setup** - Everything containerized
✅ **Comprehensive Documentation** - OpenAPI spec with examples
✅ **Multiple Data Loading Patterns** - Demonstrates 4 different data loading approaches
✅ **Build-time Constants** - Hardcoded validation sets for optimal performance
✅ **Modern OPA Syntax** - Uses latest Rego v1 with `import rego.v1`
✅ **Enhanced Validation** - Project type validation catches input errors early

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
├── docker-compose.yml          # OPA + Preferences service
├── opa/
│   └── Dockerfile              # Custom OPA image with build-time data
├── policies/
│   ├── dnc/
│   │   └── dnc.rego            # DNC policy rules
│   ├── authz/
│   │   └── authz.rego          # Lambda authorizer policy rules
│   ├── data_filter.rego        # Data filtering policy for OpenSearch
│   └── data/                   # Runtime data (companies, config)
├── mock-services/
│   └── preferences-api.yaml    # OpenAPI specification
├── sam-app/                    # Lambda authorizer (optional)
├── data-filter/                # Data filtering demo application
│   ├── src/
│   │   ├── app.ts              # Main demo application
│   │   └── init-opensearch.ts  # OpenSearch initialization
│   ├── package.json            # Dependencies for data filtering
│   └── tsconfig.json           # TypeScript configuration
└── scripts/
    ├── load-dnc-data.sh        # Runtime data loading utility
    └── setup-data-filter.sh    # Data filter setup script
```

## Data Filtering Demo

The data-filter functionality demonstrates how OPA can generate OpenSearch/Elasticsearch queries for document filtering based on user roles and attributes.

### Setup Data Filtering

```bash
# Setup the data-filter demo
./scripts/setup-data-filter.sh

# Start OPA and OpenSearch services
docker-compose up opa opensearch
```

### Initialize OpenSearch with Sample Data

```bash
cd data-filter
npm run init-opensearch
```

### Run the Data Filtering Demo

```bash
cd data-filter
npm start
```

The demo will show how different users (admin, employees from different departments) see different sets of documents based on the OPA policy rules.

**Example Output:**

- **Admin users** see all documents
- **Sales employees** see sales department documents + their own documents
- **Marketing employees** see marketing department documents + their own documents
- **Guest users** see no documents (denied by default)

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
