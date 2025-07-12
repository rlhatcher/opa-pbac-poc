# OPA Lambda Authorizer POC

This directory contains the AWS SAM application for the OPA-based Lambda authorizer proof-of-concept.

## Overview

The SAM application demonstrates how to integrate Open Policy Agent (OPA) with AWS API Gateway custom authorizers. It includes:

- **Lambda Authorizer Function** - Custom authorizer that calls OPA for policy decisions
- **JWT Token Validation** - Decodes and validates JWT tokens
- **Policy Integration** - Calls OPA server for authorization decisions
- **Comprehensive Testing** - Playwright-based end-to-end tests

## Architecture

```
API Gateway → Lambda Authorizer → OPA Server → Policy Decision
     ↓              ↓                ↓              ↓
  Request      JWT Decode      Policy Query    Allow/Deny
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- AWS SAM CLI
- Docker (for OPA server)

### One Command Setup

```bash
# From project root - this does everything!
./setup.sh
```

This single command will:

- Start OPA server and Preferences service
- Build and start SAM Local API and Lambda services
- Load all test data
- Run comprehensive tests
- Show you what's available

### Manual Testing (after setup.sh)

```bash
# All services are already running, just test them:

# Test OPA authorization policy
curl -X POST http://localhost:8181/v1/data/policies/authz/allow \
  -H "Content-Type: application/json" \
  -d '{"input":{"method":"GET","path":["user","alice"],"token":{"payload":{"sub":"alice","roles":["user"]}}}}'

# Test preferences service
curl -H "Authorization: Bearer mock-token" http://localhost:3002/experts/expert_999/preferences

# Run tests again
cd sam-app && npx playwright test
```

## Components

### Lambda Authorizer (`opa-poc/app.mjs`)

The main authorizer function that:

1. **Extracts JWT token** from Authorization header
2. **Decodes JWT payload** (no signature verification in POC)
3. **Builds OPA input** from request context
4. **Calls OPA server** for policy decision
5. **Returns IAM policy** (Allow/Deny) to API Gateway

### Policy Builder (`opa-poc/policyBuilder.js`)

Utility for generating IAM policy documents:

```javascript
buildPolicy('Allow', 'arn:aws:execute-api:*', 'user123')
```

### Template Configuration (`template.yaml`)

SAM template defining:

- Lambda function configuration
- API Gateway integration
- Environment variables
- IAM permissions

## Testing

### Test Structure

- **`tests/e2e/dnc-policy.spec.js`** - DNC policy integration tests
- **`tests/e2e/opa-authorizer.spec.js`** - Lambda authorizer tests

### Test Scenarios

#### Authorization Tests

- ✅ User accessing own data → Allow
- ✅ User accessing other user's data → Deny
- ✅ Admin accessing any data → Allow
- ✅ Invalid/missing JWT → Deny

#### DNC Policy Tests

- ✅ Expert with no restrictions → Allow contact
- ✅ Expert in DNC company → Block contact
- ✅ Expert in DNC country → Block contact
- ✅ Expert with preference exclusions → Block contact
- ✅ Invalid input data → Block contact

### Manual Testing

```bash
# Test OPA directly
curl -X POST http://localhost:8181/v1/data/policies/authz/allow \
  -H "Content-Type: application/json" \
  -d '{"input": {"method": "GET", "path": ["user", "alice"], "token": {"payload": {"sub": "alice", "roles": ["user"]}}}}'

# Test Lambda authorizer (requires SAM local)
curl -X GET http://localhost:3000/user/alice \
  -H "Authorization: Bearer <jwt-token>"
```

## Configuration

### Environment Variables

- `OPA_URL` - OPA server endpoint (default: http://localhost:8181)
- `NODE_ENV` - Environment (development/production)

### OPA Integration

The authorizer calls OPA's authorization policy at:

```
POST http://localhost:8181/v1/data/policies/authz/allow
```

With input format:

```json
{
  "input": {
    "method": "GET",
    "path": ["user", "alice"],
    "token": {
      "payload": {
        "sub": "alice",
        "roles": ["user"]
      }
    }
  }
}
```

## Development

### Local Development Workflow

For POC development, always use the integrated setup:

```bash
# Single command for complete environment
./setup.sh
```

This replaces the need for manual service management. The script handles:

- Docker services (OPA + Preferences)
- SAM build and local services
- Data loading and testing

### Adding New Tests

1. Create test files in `tests/e2e/`
2. Use Playwright for HTTP testing
3. Generate JWT tokens with different payloads
4. Test both OPA direct calls and Lambda integration

### Debugging

- **SAM logs**: `sam logs -n OpaAuthorizerFunction --stack-name sam-app`
- **Local debugging**: Use `--debug-port 5858` with SAM local
- **OPA debugging**: Check `docker-compose logs opa`

## Deployment

### Local Testing (POC)

```bash
# Use the integrated setup script
./setup.sh
```

### AWS Deployment (Production)

```bash
sam build
sam deploy --guided
```

## Troubleshooting

- **Setup script fails**: Check prerequisites (Node.js 18+, SAM CLI, Docker)
- **Services not responding**: Run `./setup.sh` again to restart everything
- **Port conflicts**: Ensure ports 3000, 3001, 8181, 3002, 3003 are available
- **Tests failing**: All services should be running after `./setup.sh`
- **JWT errors**: Check token format and payload structure

## Production Considerations

This is a **proof-of-concept**. For production:

1. **JWT Signature Verification** - Validate JWT signatures
2. **Error Handling** - Comprehensive error handling and logging
3. **Performance** - Connection pooling, caching, timeouts
4. **Security** - Input validation, rate limiting
5. **Monitoring** - CloudWatch metrics, distributed tracing
6. **High Availability** - Multi-AZ OPA deployment
