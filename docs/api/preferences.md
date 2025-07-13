# Preferences API

The Preferences API manages expert preferences and project type restrictions for the DNC policy evaluation.

## Overview

This API provides:
- Expert preference management
- Project type restrictions
- Contact preference settings
- Integration with DNC policy evaluation

## Interactive API Documentation

<swagger-ui src="preferences-api.yaml"/>

## Key Endpoints

### Expert Preferences
- **GET /experts/{expertId}/preferences** - Get expert's contact preferences
- **PUT /experts/{expertId}/preferences** - Update expert preferences
- **GET /experts/{expertId}/projects** - Get expert's project type preferences

### Project Types
- **GET /project-types** - List all available project types
- **GET /project-types/{typeId}** - Get specific project type details

### Preference Validation
- **POST /preferences/validate** - Validate preference settings
- **GET /preferences/defaults** - Get default preference values

## Data Models

The API uses structured data models for:
- Expert profiles
- Project type definitions
- Preference settings
- Contact restrictions

## Integration

This API integrates with the Policies API to provide comprehensive DNC policy evaluation based on expert preferences and project requirements.
