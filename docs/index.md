# OPA PBAC Proof of Concept

A comprehensive proof-of-concept demonstrating Policy-Based Access Control (PBAC) using Open Policy Agent (OPA) with AWS API Gateway custom authorizers and a complete monitoring dashboard.

## 📚 Documentation Index

- **[Policy Documentation](policies.md)** - DNC and authorization policy details
- **[SAM Application](sam-app.md)** - Lambda authorizer, backend services, and testing
- **[Mock Services](mock-services.md)** - Expert preferences API and Swagger UI
- **[PAP Dashboard](pap-dashboard.md)** - Policy administration interface and monitoring
- **[Installation Guide](installation.md)** - Dependency installation script

## Overview

This POC demonstrates a complete PBAC architecture with two distinct policy systems and comprehensive monitoring capabilities:

### 1. DNC (Do Not Contact) Policy

A business logic policy that evaluates multiple data sources to determine if an expert can be contacted for a project:

- **Input Validation** - Validates required fields and project types against known constants
- **Company Restrictions** - Runtime data loaded via API calls
- **Country Restrictions** - Build-time data baked into OPA container
- **Expert Preferences** - External service calls via HTTP API

### 2. Authorization Policy

JWT-based access control for API Gateway endpoints with role-based authorization:

- **User Access Control** - Users can only access their own data (`/user/{user_id}` where `user_id` matches JWT subject)
- **Admin Override** - Users with `admin` role can access any resource
- **Method Validation** - Supports GET, PUT, PATCH operations
- **Path-based Authorization** - Validates URL path structure and ownership
- **JWT Token Processing** - Decodes and validates JWT payload for user identity and roles

### 3. Policy Administration Point (PAP)

A comprehensive dashboard providing real-time monitoring and management:

- **PEP Interface** - Interactive policy testing forms
- **PDP Monitoring** - Real-time OPA decision logs
- **PIP Data Management** - Policy data source management
- **Application Logs** - Backend service monitoring

## Architecture

The system demonstrates two distinct OPA policy use cases:

1. **API Gateway Authorization** - JWT-based access control using `authz.rego`
2. **Business Logic Policies** - DNC (Do Not Contact) rules using `dnc.rego`

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

┌─────────────────────────────────────────────────────────────────────────────┐
│                        PAP Dashboard (:5177)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│   ┌─────────────────┬─────────────────┐                                     │
│   │   Q1: PEP       │   Q2: PDP       │  PEP = Policy Enforcement Point    │
│   │ Policy Testing  │ Decision Logs   │  PDP = Policy Decision Point       │
│   │ • DNC Forms     │ • OPA Logs      │  PIP = Policy Information Point    │
│   │ • Auth Forms    │ • Real-time     │  PAP = Policy Administration Point │
│   ├─────────────────┼─────────────────┤                                     │
│   │   Q3: PIP       │   Q4: App       │                                     │
│   │ Data Management │ Service Logs    │                                     │
│   │ • Companies     │ • Lambda Logs   │                                     │
│   │ • Countries     │ • Auth Events   │                                     │
│   └─────────────────┴─────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

See the [Quick Start Guide](quick-start.md) for detailed setup instructions.

```bash
./setup.sh
```

## Key Features

- **Static Mock Service** - Predictable API responses with Swagger UI documentation
- **Complete Policy Testing** - 30 test cases covering all scenarios
- **Real HTTP Integration** - OPA calls external preferences service
- **Docker Compose Setup** - Everything containerized
- **Comprehensive Documentation** - OpenAPI spec with examples
- **Multiple Data Loading Patterns** - Demonstrates 4 different data loading approaches
- **Build-time Constants** - Hardcoded validation sets for optimal performance
- **Modern OPA Syntax** - Uses latest Rego v1 with `import rego.v1`
- **Enhanced Validation** - Project type validation catches input errors early
- **Real-time Monitoring** - Live policy decision logs and system monitoring
- **Interactive Dashboard** - Complete PAP interface for policy management
