# Quick Start Guide

Get the OPA PBAC POC up and running in minutes.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- AWS SAM CLI (optional, for Lambda testing)

## One Command Setup

```bash
./setup.sh
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

## Next Steps

- Explore the [PAP Dashboard](http://localhost:5177) for interactive policy testing
- Review [Policy Documentation](policies/index.md) for detailed policy rules
- Check [API Reference](api/opa.md) for endpoint documentation
- See [Development Guide](development/setup.md) for advanced configuration

## Troubleshooting

### Common Issues

1. **Port conflicts** - Ensure ports 3000, 3001, 3002, 3003, 5177, 8181 are available
2. **Docker issues** - Make sure Docker is running and has sufficient resources
3. **Node.js version** - Requires Node.js 18 or higher

### Getting Help

- Check service status in the PAP Dashboard
- Review logs with `docker-compose logs`
- Run tests to verify functionality: `cd sam-app && npx playwright test`

## Stop Services

```bash
docker-compose down
```
