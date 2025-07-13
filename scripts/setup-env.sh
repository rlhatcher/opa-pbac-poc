#!/bin/bash

# Environment Setup Script for OPA PBAC POC
# This script ensures consistent environment configuration across all services

set -e

echo "🔧 Setting up environment configuration..."

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

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found in root directory"
    exit 1
fi

print_status ".env file found"

# Load environment variables
set -a
source .env
set +a

print_status "Environment variables loaded"

# Validate required environment variables
required_vars=(
    "OPA_PORT"
    "PREFERENCES_PORT"
    "PAP_SERVICE_PORT"
    "SAM_API_PORT"
    "SAM_LAMBDA_PORT"
    "OPA_URL_LOCALHOST"
    "OPA_URL_DOCKER"
    "PREFERENCES_URL_LOCALHOST"
    "PREFERENCES_URL_DOCKER"
)

print_info "Validating required environment variables..."

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    else
        print_status "$var = ${!var}"
    fi
done

# Check if PAP service .env exists
if [ ! -f "pap-service/.env" ]; then
    print_warning "PAP service .env file not found, creating from template..."
    cp .env pap-service/.env
    print_status "Created pap-service/.env"
else
    print_status "PAP service .env file exists"
fi

# Check if frontend .env exists
if [ ! -f "pap-service/frontend/.env" ]; then
    print_warning "Frontend .env file not found, creating from template..."
    cat > pap-service/frontend/.env << EOF
# PAP Service Frontend Environment Configuration
VITE_PAP_SERVICE_URL=${PAP_SERVICE_URL_LOCALHOST}
VITE_OPA_ENDPOINT=${OPA_URL_LOCALHOST}
VITE_PREFERENCES_ENDPOINT=${PREFERENCES_URL_LOCALHOST}
VITE_NODE_ENV=${NODE_ENV}
VITE_AUTO_REFRESH=${PAP_AUTO_REFRESH}
VITE_SOCKET_ENABLED=${PAP_SOCKET_ENABLED}
EOF
    print_status "Created pap-service/frontend/.env"
else
    print_status "Frontend .env file exists"
fi

# Validate Docker Compose configuration
print_info "Validating Docker Compose configuration..."

if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running"

# Display configuration summary
echo ""
echo "🎯 Environment Configuration Summary:"
echo "======================================"
echo "OPA Server:           ${OPA_URL_LOCALHOST}"
echo "Preferences Service:  ${PREFERENCES_URL_LOCALHOST}"
echo "PAP Dashboard:        ${PAP_SERVICE_URL_LOCALHOST}"
echo "SAM API:              ${SAM_API_URL_LOCALHOST}"
echo "SAM Lambda:           ${SAM_LAMBDA_URL_LOCALHOST}"
echo "Environment:          ${NODE_ENV}"
echo "Docker Mode:          ${DOCKER_ENV}"
echo ""

print_status "Environment setup complete!"
print_info "You can now run: ./setup.sh"
