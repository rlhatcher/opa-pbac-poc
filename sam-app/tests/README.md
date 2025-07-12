# End-to-End Testing with Playwright

This directory contains Playwright-based end-to-end tests for the OPA Lambda Authorizer POC.

## Test Structure

- **`e2e/dnc-policy.spec.js`** - DNC policy test suite covering:

  - Direct OPA policy testing
  - DNC policy scenarios (company, country, preferences blocking)
  - Input validation and error handling

- **`e2e/opa-authorizer.spec.js`** - Lambda authorizer test suite covering:
  - Direct OPA authorization policy testing
  - Lambda authorizer integration testing
  - JWT-based access control scenarios

## Quick Start

### Integrated POC Testing

```bash
# From project root - this runs everything including tests
./setup.sh
```

The setup script automatically:

- Starts all services (OPA, Preferences, SAM Local)
- Installs dependencies and Playwright browsers
- Runs comprehensive test suite
- Shows results and available services

### Manual Test Runs (after setup.sh)

```bash
# From sam-app directory
cd sam-app

# Run all tests again
npx playwright test

# Run with interactive UI
npx playwright test --ui

# Run specific test file
npx playwright test dnc-policy.spec.js
```

## Test Scenarios

### OPA Policy Tests (Direct)

- ✅ User accessing own data → Allow
- ✅ User accessing other user's data → Deny
- ✅ Admin accessing any data → Allow

### Lambda Authorizer Tests (Integration)

- ✅ Valid JWT + own data → Allow policy
- ✅ Valid JWT + other user's data → Deny policy
- ✅ Admin JWT + any data → Allow policy

## Test JWT Tokens

The tests use dynamically generated JWT tokens with different payloads:

```javascript
// Regular user
{ sub: 'alice', roles: ['user'] }

// Admin user
{ sub: 'admin', roles: ['admin'] }

// Other user
{ sub: 'bob', roles: ['user'] }
```

## Manual Testing

You can also test manually using the generated tokens:

```bash
# Test OPA directly
curl -X POST http://localhost:8181/v1/data/policies/authz/allow \
  -H "Content-Type: application/json" \
  -d '{"input": {"method": "GET", "path": ["user", "alice"], "token": {"payload": {"sub": "alice", "roles": ["user"]}}, "user_id": "alice"}}'

# Test Lambda authorizer
curl -X POST http://localhost:3000/2015-03-31/functions/function/invocations \
  -H "Content-Type: application/json" \
  -d '{"headers": {"authorization": "Bearer <jwt-token>"}, "httpMethod": "GET", "path": "/user/alice", "methodArn": "arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/user/alice"}'
```

## Troubleshooting

- **Setup script fails**: Check prerequisites and run `./setup.sh` again
- **Services not responding**: Restart with `./setup.sh` from project root
- **Test failures**: Run with `--headed` flag to see browser interactions
- **Port conflicts**: Ensure ports 3000, 3001, 8181, 3002, 3003 are available
- **Playwright issues**: Run `npx playwright install` to reinstall browsers
