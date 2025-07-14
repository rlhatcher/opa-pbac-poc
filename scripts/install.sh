#!/bin/bash

# OPA PBAC POC - Dependency Installation Script
# This script installs all dependencies after cleanup or fresh clone

set -e  # Exit on any error

echo "🔧 Installing OPA PBAC POC Dependencies..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_info "Project root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# Step 1: Create .env file from defaults
echo ""
print_info "Step 1: Setting up environment configuration..."

if [ ! -f ".env" ]; then
    if [ -f "scripts/defaults.env" ]; then
        print_info "Creating .env from defaults.env..."
        cp scripts/defaults.env .env
        print_status ".env file created from defaults"
    else
        print_error "scripts/defaults.env not found!"
        exit 1
    fi
else
    print_warning ".env file already exists, skipping creation"
fi

# Step 2: Check prerequisites
echo ""
print_info "Step 2: Checking prerequisites..."

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"

    # Check if Node.js version is 18+
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_error "Node.js 18+ required, found: $NODE_VERSION"
        exit 1
    fi
else
    print_error "Node.js not found. Please install Node.js 18+ and try again."
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    print_status "npm found: $NPM_VERSION"
else
    print_error "npm not found. Please install npm and try again."
    exit 1
fi

# Check Docker
if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version)
        print_status "Docker found and running: $DOCKER_VERSION"
    else
        print_error "Docker found but not running. Please start Docker and try again."
        exit 1
    fi
else
    print_warning "Docker not found. Docker is required for OPA and mock services."
    print_info "Please install Docker Desktop and try again."
fi

# Check AWS SAM CLI (optional but recommended)
if command -v sam >/dev/null 2>&1; then
    SAM_VERSION=$(sam --version)
    print_status "AWS SAM CLI found: $SAM_VERSION"
else
    print_warning "AWS SAM CLI not found (optional for Lambda testing)"
    print_info "Install from: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html"
fi

# Function to check if directory exists and install
install_deps() {
    local dir=$1
    local name=$2
    local extra_flags=$3

    if [ -d "$dir" ]; then
        print_info "Installing $name dependencies..."
        cd "$dir"
        if [ -n "$extra_flags" ]; then
            npm install $extra_flags
        else
            npm install
        fi
        cd - > /dev/null
        print_status "$name dependencies installed"
    else
        print_warning "Directory $dir not found, skipping $name"
    fi
}

# Step 3: Install dependencies in order
echo ""
print_info "Step 3: Installing all project dependencies..."
echo ""

# 1. SAM App Lambda Functions
install_deps "sam-app/opa-poc" "SAM Lambda Functions"

# 2. SAM App (Playwright tests)
install_deps "sam-app" "SAM App Tests"

# 3. Mock Services (Preferences API)
install_deps "mock-services" "Mock Services"

# 4. PAP Service Backend
install_deps "pap-service" "PAP Service Backend"

# 5. PAP Service Frontend (needs legacy peer deps for React compatibility)
install_deps "pap-service/frontend" "PAP Service Frontend" "--legacy-peer-deps"

# Step 4: Install Playwright browsers
echo ""
print_info "Step 4: Installing Playwright browsers..."

if [ -d "sam-app" ]; then
    cd sam-app
    if [ -d "node_modules" ]; then
        print_info "Installing Playwright browsers for testing..."
        npx playwright install
        print_status "Playwright browsers installed"
    else
        print_warning "SAM app dependencies not found, skipping Playwright browser installation"
    fi
    cd - > /dev/null
fi

# Step 5: Validate installation
echo ""
print_info "Step 5: Validating installation..."

# Check if all node_modules directories exist
dirs_to_check=(
    "sam-app/opa-poc/node_modules"
    "sam-app/node_modules"
    "mock-services/node_modules"
    "pap-service/node_modules"
    "pap-service/frontend/node_modules"
)

all_good=true
for dir in "${dirs_to_check[@]}"; do
    if [ -d "$dir" ]; then
        print_status "Dependencies installed: $dir"
    else
        print_error "Missing dependencies: $dir"
        all_good=false
    fi
done

echo ""
if [ "$all_good" = true ]; then
    print_status "All dependencies installed successfully!"
    echo ""
    echo "📋 Installation Summary:"
    echo "  ✅ Environment file (.env) created from defaults"
    echo "  ✅ SAM Lambda Functions (jsonwebtoken, node-fetch)"
    echo "  ✅ SAM App Tests (@playwright/test, jsonwebtoken)"
    echo "  ✅ Mock Services (express, swagger-ui-express, js-yaml)"
    echo "  ✅ PAP Service Backend (express, socket.io, axios, cors, tail)"
    echo "  ✅ PAP Service Frontend (React, Vite, Tailwind, shadcn/ui)"
    echo "  ✅ Playwright browsers for testing"
    echo ""
    print_status "Ready to run: ./setup.sh"
    echo ""
    print_info "Next steps:"
    echo "  1. Review .env file if needed: nano .env"
    echo "  2. Start all services: ./setup.sh"
    echo "  3. Or run environment setup first: ./scripts/setup-env.sh"
else
    print_error "Some dependencies failed to install. Please check the errors above."
    exit 1
fi
