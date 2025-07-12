#!/bin/bash

# OPA PBAC POC - Dependency Installation Script
# This script installs all dependencies after cleanup or fresh clone

set -e  # Exit on any error

echo "🔧 Installing OPA PBAC POC Dependencies..."
echo "=========================================="

# Function to check if directory exists and install
install_deps() {
    local dir=$1
    local name=$2
    
    if [ -d "$dir" ]; then
        echo "📦 Installing $name dependencies..."
        cd "$dir"
        npm install
        cd - > /dev/null
        echo "✅ $name dependencies installed"
    else
        echo "⚠️  Directory $dir not found, skipping $name"
    fi
}

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📍 Project root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# Install dependencies in order
echo ""
echo "🚀 Installing all project dependencies..."
echo ""

# 1. SAM App Lambda Functions
install_deps "sam-app/opa-poc" "SAM Lambda Functions"

# 2. SAM App (Playwright tests)
install_deps "sam-app" "SAM App Tests"

# 3. Mock Services (Preferences API)
install_deps "mock-services" "Mock Services"

# 4. PAP Service Backend
install_deps "pap-service" "PAP Service Backend"

# 5. PAP Service Frontend
install_deps "pap-service/frontend" "PAP Service Frontend"

echo ""
echo "🎉 All dependencies installed successfully!"
echo ""
echo "📋 Summary:"
echo "  ✅ SAM Lambda Functions (jsonwebtoken, node-fetch, @playwright/test)"
echo "  ✅ SAM App Tests (@playwright/test, jsonwebtoken)"
echo "  ✅ Mock Services (express, swagger-ui-express, js-yaml)"
echo "  ✅ PAP Service Backend (express, socket.io, axios, cors, tail)"
echo "  ✅ PAP Service Frontend (React, Vite, Tailwind, shadcn/ui)"
echo ""
echo "🚀 Ready to run: ./setup.sh"
