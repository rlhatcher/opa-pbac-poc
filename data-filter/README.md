# Data Filtering with OPA and OpenSearch

This directory contains a demonstration of using Open Policy Agent (OPA) to generate OpenSearch/Elasticsearch queries for document filtering based on user roles and attributes.

## Overview

The data filtering system demonstrates:

- **Role-based Access Control**: Different user roles see different sets of documents
- **Attribute-based Filtering**: Documents are filtered by department, ownership, and library access
- **Dynamic Query Generation**: OPA generates OpenSearch DSL queries based on user context
- **Secure by Default**: Access is denied unless explicitly allowed by policy rules

## Architecture

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───▶│   OPA Server    │───▶│  OpenSearch     │
│                 │    │   :8181         │    │   :9200         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────▼────────┐             │
         │              │ data_filter.rego│             │
         │              │ Policy Rules    │             │
         │              └─────────────────┘             │
         │                                              │
         └──────────────────────────────────────────────┘
                    Generated OpenSearch Query
```

## Policy Rules

The `data_filter.rego` policy implements the following access control rules:

### Admin Users
- **Access**: All documents
- **Query**: Empty `must` array (returns everything)

### Employee Users
- **Access**: Documents in their department OR documents they own
- **Query**: Boolean query with department and ownership filters
- **Requirements**: Must have `department` and `id` attributes

### Default (Guest/Unknown)
- **Access**: No documents
- **Query**: `match_none` (returns nothing)

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Build TypeScript**:
   ```bash
   npm run build
   ```

3. **Start Services** (from project root):
   ```bash
   docker-compose up opa opensearch
   ```

4. **Initialize OpenSearch**:
   ```bash
   npm run init-opensearch
   ```

5. **Run Demo**:
   ```bash
   npm start
   ```

## Sample Data

The initialization script creates sample documents with the following structure:

```json
{
  "id": 1,
  "name": "Document Name",
  "content": "Document content...",
  "owner_id": "user_id",
  "department": "sales|marketing|IT|HR",
  "library_id": "library-123"
}
```

## Demo Users

The demo tests the following user scenarios:

- **Admin User**: `admin_user` with role `["admin"]` - sees all documents
- **Alice (Sales)**: `alice` with role `["employee"]`, department `"sales"` - sees sales docs + owned docs
- **Bob (Marketing)**: `bob` with role `["employee"]`, department `"marketing"` - sees marketing docs + owned docs
- **Guest User**: `guest_user` with role `["guest"]` - sees no documents

## Expected Results

When you run the demo, you should see:

1. **Admin User**: 6 documents (all documents in library-123)
2. **Alice (Sales)**: 2 documents (sales department documents)
3. **Bob (Marketing)**: 1 document (marketing department document)
4. **Guest User**: 0 documents (access denied)

## Configuration

Key configuration values in `src/app.ts`:

- `OPA_URL`: OPA server endpoint (default: http://localhost:8181)
- `OPENSEARCH_URL`: OpenSearch endpoint (default: http://localhost:9200)
- `OPENSEARCH_INDEX`: Index name (default: "documents")
- `OPENSEARCH_USERNAME/PASSWORD`: Authentication credentials

## Troubleshooting

### OPA Connection Issues
- Ensure OPA is running: `docker-compose up opa`
- Check OPA logs: `docker-compose logs opa`
- Verify policy is loaded: `curl http://localhost:8181/v1/data/document_filter`

### OpenSearch Connection Issues
- Ensure OpenSearch is running: `docker-compose up opensearch`
- Check OpenSearch health: `curl http://localhost:9200/_cluster/health`
- Verify index exists: `curl http://localhost:9200/documents/_mapping`

### No Results Returned
- Check if sample data was loaded: `npm run init-opensearch`
- Verify documents exist: `curl http://localhost:9200/documents/_search`
- Check OPA policy evaluation: Review console output for generated queries
