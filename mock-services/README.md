# Expert Preferences Service (OpenAPI + Prism Mock)

An OpenAPI-driven mock service for testing the DNC (Do Not Contact) policy using Stoplight Prism.

## Overview

This service uses the OpenAPI 3.0 specification to automatically generate a mock REST API for managing expert preferences. Instead of manually coding a mock server, we leverage the OpenAPI spec itself to provide realistic responses, validation, and documentation.

## Features

- ✅ **OpenAPI 3.0 Specification** - Single source of truth for API contract
- ✅ **Prism Mock Server** - Automatic mock generation from OpenAPI spec
- ✅ **Dynamic Responses** - Generates realistic data based on schema
- ✅ **Request Validation** - Automatic validation against OpenAPI spec
- ✅ **Multiple Modes** - Static examples, dynamic generation, or validation mode
- ✅ **Zero Code** - No manual mock implementation needed
- ✅ **Docker Support** - Containerized for easy deployment

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start all services (OPA + Preferences Service)
docker-compose up

# The service will be available at http://localhost:3002
```

### Option 2: Local Development

```bash
cd mock-services

# Install Prism globally (one-time setup)
npm install -g @stoplight/prism-cli

# Start the service
npm start                    # Dynamic mode (recommended)

# Or use Prism directly
prism mock preferences-api.yaml --port 3002 --dynamic
```

## API Documentation

### Base URL

- Local: `http://localhost:3002`
- Docker: `http://preferences-service:3002`

### Authentication

All endpoints (except `/health` and `/project-types`) require a Bearer token:

```bash
Authorization: Bearer mock-token
```

### Endpoints

#### Health Check

```bash
GET /health
```

#### Get Expert Preferences

```bash
GET /preferences/{expertId}
Authorization: Bearer mock-token
```

#### Update Expert Preferences

```bash
PUT /preferences/{expertId}
Authorization: Bearer mock-token
Content-Type: application/json

{
  "exclusions": ["pharmaceuticals", "healthcare"],
  "contact_allowed": true,
  "notes": "Optional notes"
}
```

#### Get Project Types

```bash
GET /project-types
```

## Mock Data

The service comes pre-loaded with test data for these experts:

| Expert ID    | Exclusions                                           | Contact Allowed | Notes                                  |
| ------------ | ---------------------------------------------------- | --------------- | -------------------------------------- |
| `expert_123` | `[]`                                                 | `true`          | Open to all project types              |
| `expert_456` | `["pharmaceuticals", "healthcare"]`                  | `true`          | Avoiding healthcare projects           |
| `expert_789` | `["financial_services", "banking"]`                  | `true`          | Currently engaged in competing project |
| `expert_999` | `["pharmaceuticals", "healthcare", "biotechnology"]` | `true`          | Temporarily unavailable                |
| `expert_555` | `["*"]`                                              | `false`         | On sabbatical - no contact             |
| `expert_000` | `["technology", "software"]`                         | `true`          | Focusing on non-tech projects          |

## Testing

### Run Test Suite

```bash
# Make sure service is running first
npm start

# In another terminal
npm test
```

### Manual Testing Examples

```bash
# Health check
curl http://localhost:3002/health

# Get expert preferences
curl -H "Authorization: Bearer mock-token" \
     http://localhost:3002/preferences/expert_999

# Update preferences
curl -X PUT \
     -H "Authorization: Bearer mock-token" \
     -H "Content-Type: application/json" \
     -d '{"exclusions":["technology"],"contact_allowed":true}' \
     http://localhost:3002/preferences/expert_test

# Get project types
curl http://localhost:3002/project-types
```

## Integration with DNC Policy

The OPA DNC policy calls this service to check expert preferences:

```rego
# In policies/dnc.rego
opted_out_by_preference if {
    response := http.send({
        "method": "GET",
        "url": sprintf("%s/preferences/%s", [preferences_service_url, input.expert.id]),
        "headers": {
            "Authorization": sprintf("Bearer %s", [preferences_service_token])
        }
    })

    response.status_code == 200
    response.body.exclusions[_] == input.project.type
}
```

## OpenAPI Specification

The complete API specification is available in `preferences-api.yaml`. You can:

1. **View in Swagger UI**: Use any OpenAPI viewer
2. **Generate Client Code**: Use swagger-codegen or openapi-generator
3. **Validate Requests**: Use the spec for request/response validation

## Error Handling

The service returns structured error responses:

```json
{
  "error": "EXPERT_NOT_FOUND",
  "message": "Expert with ID 'expert_999' not found",
  "timestamp": "2024-07-11T22:30:00Z"
}
```

Common error codes:

- `UNAUTHORIZED` - Missing or invalid auth token
- `EXPERT_NOT_FOUND` - Expert ID not found
- `INVALID_EXPERT_ID` - Expert ID format invalid
- `INVALID_REQUEST` - Request body validation failed
- `INTERNAL_SERVER_ERROR` - Unexpected server error

## Development

### Adding New Mock Data

Edit the `mockPreferences` object in `preferences-service.js`:

```javascript
const mockPreferences = {
  expert_new: {
    expert_id: 'expert_new',
    exclusions: ['automotive'],
    last_updated: '2024-07-11T22:30:00Z',
    preferences_version: 1,
    contact_allowed: true,
    notes: 'New expert with automotive exclusion'
  }
}
```

### Extending the API

1. Update the OpenAPI spec in `preferences-api.yaml`
2. Implement the endpoint in `preferences-service.js`
3. Add tests in `test-service.js`

## Monitoring

The service includes:

- Health check endpoint (`/health`)
- Request logging to console
- Docker health checks
- Structured error responses

## Production Considerations

This is a **mock service** for testing. For production:

1. Replace with real database
2. Implement proper authentication/authorization
3. Add rate limiting
4. Add comprehensive logging and monitoring
5. Implement data validation and sanitization
6. Add caching for performance
7. Implement proper error handling and recovery
