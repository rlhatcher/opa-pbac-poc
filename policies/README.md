# Do Not Contact (DNC) Policy

This directory contains Open Policy Agent (OPA) policies for determining whether an expert can be contacted for a project based on various "Do Not Contact" restrictions.

## Policy Overview

The DNC policy evaluates three main sources of restrictions:

1. **Company Restrictions** - Experts employed by certain companies cannot be contacted
2. **Country Restrictions** - Experts located in certain countries cannot be contacted
3. **Expert Preferences** - Experts can opt out of specific project types via an external API

## Files Structure

```
policies/
├── dnc.rego                    # DNC (Do Not Contact) policy rules
├── authz.rego                  # Lambda authorizer policy rules
└── data/
    ├── dnc_companies.json      # List of restricted companies
    ├── dnc_countries.json      # List of restricted countries
    └── config.json             # Configuration settings
```

## Policy Rules

### DNC Policy (`dnc.rego`)

#### Main Decision Rule: `can_contact`

Returns `true` only if ALL of the following conditions are met:

- Input data is valid (required fields present)
- Expert is NOT employed by a DNC company
- Expert is NOT located in a DNC country
- Expert has NOT opted out of the project type

### Supporting Rules

- `input_is_valid` - Validates required input fields
- `employed_by_dnc_company` - Checks company restrictions
- `located_in_dnc_country` - Checks country restrictions
- `opted_out_by_preference` - Checks expert preferences via HTTP API
- `decision_details` - Provides comprehensive decision information
- `dnc_reasons` - Lists all applicable restriction reasons

### Authorization Policy (`authz.rego`)

#### Main Decision Rule: `allow`

Returns `true` if either of the following conditions are met:

- User is accessing their own data (GET /user/{user_id} where user_id matches JWT sub)
- User has "admin" role in their JWT token

#### Authorization Rules

- User access validation based on JWT subject
- Role-based access control for admin users

## Input Format

```json
{
  "expert": {
    "id": "expert_123",
    "current_company_id": "comp_456",
    "country_id": "US",
    "name": "John Smith"
  },
  "project": {
    "id": "proj_789",
    "type": "technology",
    "title": "Cloud Migration Assessment"
  }
}
```

## Data Sources

### 1. DNC Companies (`data/dnc_companies.json`)

Companies whose employees cannot be contacted:

```json
{
  "companies": {
    "comp_001": {
      "id": "comp_001",
      "name": "Confidential Corp",
      "reason": "Client confidentiality agreement",
      "category": "client_restriction"
    }
  }
}
```

**Categories:**

- `client_restriction` - Client confidentiality agreements
- `competitor` - Direct competitors
- `security_restriction` - Government security clearance required
- `legal_restriction` - Ongoing litigation
- `sanctions` - Trade sanctions

### 2. DNC Countries (`data/dnc_countries.json`)

Countries where experts cannot be contacted:

```json
{
  "countries": {
    "CN": {
      "id": "CN",
      "name": "China",
      "reason": "Export control restrictions",
      "category": "export_control"
    }
  }
}
```

**Categories:**

- `sanctions` - Economic sanctions
- `embargo` - Trade embargos
- `export_control` - Export control restrictions

### 3. Expert Preferences (External API)

The policy makes HTTP calls to a preferences service:

**Endpoint:** `GET /preferences/{expert_id}`

**Response Format:**

```json
{
  "expert_id": "expert_123",
  "exclusions": ["pharmaceuticals", "healthcare"],
  "last_updated": "2024-06-15T10:30:00Z"
}
```

## Usage Examples

### 1. Check if Expert Can Be Contacted

```bash
curl -X POST http://localhost:8181/v1/data/policies/dnc/can_contact \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "expert": {
        "id": "expert_123",
        "current_company_id": "comp_999",
        "country_id": "US"
      },
      "project": {
        "id": "proj_456",
        "type": "technology"
      }
    }
  }'
```

**Response:**

```json
{
  "result": true
}
```

### 2. Get Detailed Decision Information

```bash
curl -X POST http://localhost:8181/v1/data/policies/dnc/decision_details \
  -H "Content-Type: application/json" \
  -d '{...same input...}'
```

**Response:**

```json
{
  "result": {
    "can_contact": true,
    "expert_id": "expert_123",
    "project_id": "proj_456",
    "project_type": "technology",
    "checks": {
      "input_valid": true,
      "employed_by_dnc_company": false,
      "located_in_dnc_country": false,
      "opted_out_by_preference": false
    },
    "dnc_reasons": [],
    "timestamp": 1721602200000000000
  }
}
```

## Setup and Testing

### 1. Start OPA Server

```bash
docker-compose up opa
```

### 2. Load DNC Data

```bash
./scripts/load-dnc-data.sh
```

### 3. Run Tests

```bash
cd sam-app
npx playwright test dnc-policy.spec.js
```

## Configuration

The policy can be configured via `data/config.json`:

```json
{
  "config": {
    "preferences_service_url": "http://preferences-service.local",
    "preferences_service_token": "your-api-token-here",
    "preferences_service_timeout": "5s"
  }
}
```

## Error Handling

The policy handles various error conditions:

- **Invalid Input** - Missing required fields
- **HTTP Failures** - Preferences service unavailable
- **Missing Data** - Company/country not found in data
- **Timeouts** - External service calls timeout after 5s

## Security Considerations

- API tokens are stored in configuration data (not hardcoded)
- HTTP calls include proper authentication headers
- Timeouts prevent hanging requests
- Input validation prevents injection attacks
- Detailed logging for audit trails

## Extending the Policy

To add new restriction types:

1. Add new data source (JSON file or API)
2. Create new rule function (e.g., `blocked_by_new_restriction`)
3. Add to main `can_contact` rule
4. Update `dnc_reasons` collection
5. Add test cases

## Monitoring and Debugging

- Use `decision_details` for comprehensive decision information
- Check `dnc_reasons` for specific restriction causes
- Review `blocked_company` and `blocked_country` for details
- Monitor HTTP call success/failure rates
- Track decision timestamps for audit trails
