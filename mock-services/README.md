# Expert Preferences Service (Static Mock + Swagger UI)

A static mock service for testing the DNC (Do Not Contact) policy with built-in Swagger UI documentation.

## Overview

This service provides a static mock REST API for managing expert preferences using Express.js with pre-loaded test data. It includes integrated Swagger UI for interactive API documentation and testing, making it easy to understand and test the DNC policy integration.

## Features

- ✅ **OpenAPI 3.0 Specification** - Single source of truth for API contract
- ✅ **Static Mock Server** - Express.js server with predictable test data
- ✅ **Integrated Swagger UI** - Interactive API documentation at `/api-docs`
- ✅ **Pre-loaded Test Data** - Static expert preferences for consistent testing
- ✅ **CORS Support** - Cross-origin requests enabled for browser testing
- ✅ **Docker Support** - Containerized for easy deployment
- ✅ **Health Checks** - Built-in health monitoring endpoints

## Quick Start

### Integrated POC Setup (Recommended)

```bash
# From project root - starts everything including this service
./setup.sh
```

This single command starts:

- OPA server
- Preferences service (this service)
- Swagger UI
- SAM Local API and Lambda
- Runs all tests

Services will be available at:

- **Preferences API**: <http://localhost:3002>
- **Swagger UI**: <http://localhost:3003>
- **Local Swagger UI**: <http://localhost:3002/api-docs>

### Standalone Development (Optional)

```bash
cd mock-services

# Install dependencies
npm install

# Start just this service
npm start

# Available at: http://localhost:3002
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
GET /experts/{expertId}/preferences
Authorization: Bearer mock-token
```

#### Get Project Types (Public)

```bash
GET /project-types
```

#### Documentation Endpoints

```bash
GET /api-docs          # Swagger UI interface
GET /api-spec          # OpenAPI specification JSON
```

## Mock Data

The service comes pre-loaded with test data for these experts:

| Expert ID    | Exclusions                          | Contact Allowed | Notes                                  |
| ------------ | ----------------------------------- | --------------- | -------------------------------------- |
| `expert_123` | `[]`                                | `true`          | Open to all project types              |
| `expert_456` | `["technology", "software"]`        | `true`          | Focusing on non-tech projects          |
| `expert_789` | `["financial_services", "banking"]` | `true`          | Currently engaged in competing project |
| `expert_999` | `["pharmaceuticals", "healthcare"]` | `true`          | Temporarily unavailable                |
| `expert_555` | `["*"]`                             | `false`         | On sabbatical - no contact             |

## Testing

### Manual Testing Examples

```bash
# Health check
curl http://localhost:3002/health

# Get expert preferences
curl -H "Authorization: Bearer mock-token" \
     http://localhost:3002/experts/expert_999/preferences

# Get project types (no auth required)
curl http://localhost:3002/project-types

# Test with Swagger UI
open http://localhost:3002/api-docs
```

### Integration Testing

The service is tested as part of the DNC policy integration:

```bash
# From project root
./setup.sh                           # Start all services
cd sam-app && npx playwright test    # Run comprehensive tests
```

## Integration with DNC Policy

The OPA DNC policy calls this service to check expert preferences:

```rego
# In policies/dnc/dnc.rego
opted_out_by_preference if {
    response := http.send({
        "method": "GET",
        "url": sprintf("%s/experts/%s/preferences", [preferences_service_url, input.expert.id]),
        "headers": {
            "Authorization": sprintf("Bearer %s", [preferences_service_token])
        }
    })

    response.status_code == 200
    input.project.type in response.body.exclusions
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

Edit the `static-preferences.json` file:

```json
{
  "expert_new": {
    "expert_id": "expert_new",
    "exclusions": ["automotive"],
    "last_updated": "2024-07-11T22:30:00Z",
    "preferences_version": 1,
    "contact_allowed": true,
    "notes": "New expert with automotive exclusion"
  }
}
```

### Extending the API

1. Update the OpenAPI spec in `preferences-api.yaml`
2. Implement the endpoint in `server.js`
3. Test with Swagger UI at `/api-docs`

## Monitoring

The service includes:

- Health check endpoint (`/health`)
- Request logging to console
- Docker health checks
- Structured error responses
- Swagger UI for interactive testing

## Production Considerations

This is a **mock service** for testing. For production:

1. Replace with real database
2. Implement proper authentication/authorization
3. Add rate limiting
4. Add comprehensive logging and monitoring
5. Implement data validation and sanitization
6. Add caching for performance
7. Implement proper error handling and recovery
