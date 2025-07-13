# Policies API

The Policies API provides endpoints for managing and evaluating policies in the OPA PBAC system.

## Overview

This API allows you to:
- Evaluate DNC (Do Not Contact) policies
- Check authorization policies
- Retrieve policy decisions with detailed reasoning

## Interactive API Documentation

<swagger-ui src="policies-api.yaml"/>

## Key Endpoints

### Policy Evaluation
- **POST /policies/dnc/evaluate** - Evaluate DNC policy for an expert
- **POST /policies/authz/evaluate** - Evaluate authorization policy

### Policy Management
- **GET /policies** - List available policies
- **GET /policies/{id}** - Get specific policy details

## Authentication

All API endpoints require proper authentication headers as specified in the OpenAPI specification above.

## Error Handling

The API returns standard HTTP status codes and detailed error messages in JSON format for troubleshooting policy evaluation issues.
