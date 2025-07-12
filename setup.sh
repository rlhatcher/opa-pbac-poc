#!/bin/bash

# OPA + Lambda Authorizer POC - Complete End-to-End Setup
set -e

echo "🚀 OPA + Lambda Authorizer POC - Complete Setup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    local url=$1
    local service_name=$2
    local max_attempts=15
    local attempt=1

    echo "⏳ Waiting for $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name ready${NC}"
            return 0
        fi
        sleep 2
        ((attempt++))
    done
    
    echo -e "${YELLOW}⚠️  $service_name not ready, continuing...${NC}"
    return 1
}

# Step 1: Start Docker services
echo -e "${BLUE}📦 Starting Docker services...${NC}"
docker-compose up -d

# Step 2: Check Docker services
check_service "http://localhost:8181/health" "OPA Server"
check_service "http://localhost:3002/project-types" "Preferences Service"
check_service "http://localhost:3003/" "Swagger UI"

# Step 3: Load DNC data
echo -e "${BLUE}📊 Loading DNC data...${NC}"
if ! ./scripts/load-dnc-data.sh; then
    echo -e "${YELLOW}⚠️  Data loading failed - some DNC tests may fail${NC}"
    echo -e "${YELLOW}    Check scripts/load-dnc-data.sh for details${NC}"
fi

# Step 4: Build SAM application
echo -e "${BLUE}🔨 Building SAM application...${NC}"
cd sam-app
if ! sam build; then
    echo -e "${RED}❌ SAM build failed${NC}"
    echo "Please check the SAM application configuration and try again"
    exit 1
fi
echo -e "${GREEN}✅ SAM application built successfully${NC}"

# Step 5: Set dummy AWS credentials for local testing
echo -e "${BLUE}🔑 Setting up local AWS credentials...${NC}"
unset AWS_PROFILE
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy
export AWS_DEFAULT_REGION=us-east-1

# Step 6: Clean up any existing SAM processes and containers
echo -e "${BLUE}🧹 Cleaning up existing SAM processes and containers...${NC}"

# Kill any existing SAM processes
pkill -f "sam local start" 2>/dev/null || true

# Clean up Lambda containers (including versioned tags)
docker ps -q --filter "ancestor=public.ecr.aws/lambda/nodejs" | xargs -r docker stop 2>/dev/null || true
docker ps -aq --filter "ancestor=public.ecr.aws/lambda/nodejs" | xargs -r docker rm 2>/dev/null || true

# Also clean up containers with versioned nodejs images (more comprehensive)
docker ps -q | xargs -r docker inspect --format '{{.Id}} {{.Config.Image}}' 2>/dev/null | grep "public.ecr.aws/lambda/nodejs" | cut -d' ' -f1 | xargs -r docker stop 2>/dev/null || true
docker ps -aq | xargs -r docker inspect --format '{{.Id}} {{.Config.Image}}' 2>/dev/null | grep "public.ecr.aws/lambda/nodejs" | cut -d' ' -f1 | xargs -r docker rm 2>/dev/null || true

# Alternative: Stop and remove all containers with lambda nodejs images
docker stop $(docker ps -q --filter "ancestor=public.ecr.aws/lambda/nodejs:20-rapid-arm64") 2>/dev/null || true
docker rm $(docker ps -aq --filter "ancestor=public.ecr.aws/lambda/nodejs:20-rapid-arm64") 2>/dev/null || true

# Wait a moment for cleanup to complete
sleep 2

# Step 7: Start SAM local services
echo -e "${BLUE}🚀 Starting SAM local API...${NC}"
sam local start-api --port 3000 --skip-pull-image &
SAM_API_PID=$!

echo -e "${BLUE}🚀 Starting SAM local Lambda...${NC}"
sam local start-lambda --port 3001 --skip-pull-image &
SAM_LAMBDA_PID=$!

# Step 8: Check SAM services
check_service "http://localhost:3000" "SAM Local API"
check_service "http://localhost:3001/2015-03-31/functions" "SAM Local Lambda"

# Step 9: Run comprehensive tests
echo -e "${BLUE}🧪 Running comprehensive tests...${NC}"

# Install dependencies if needed
if [ ! -d "opa-poc/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd opa-poc
    npm install
    cd ..
fi

# Run all tests
echo "Running all Playwright tests..."
npx playwright test --reporter=list

# Step 9: Show what's available
echo ""
echo -e "${GREEN}🎉 Complete POC Setup Finished!${NC}"
echo ""
echo -e "${BLUE}Available services:${NC}"
echo "  📊 OPA Server: http://localhost:8181"
echo "  🎭 Preferences Service: http://localhost:3002"
echo "  📖 Swagger UI: http://localhost:3003"
echo "  🌐 SAM Local API: http://localhost:3000"
echo "  🔧 SAM Local Lambda: http://localhost:3001"
echo ""
echo -e "${BLUE}Quick tests:${NC}"
echo "  # Test DNC policy"
echo "  curl -X POST http://localhost:8181/v1/data/policies/dnc/can_contact \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"input\":{\"expert\":{\"id\":\"expert_999\"},\"project\":{\"type\":\"pharmaceuticals\"}}}'"
echo ""
echo "  # Test authorization policy"
echo "  curl -X POST http://localhost:8181/v1/data/policies/authz/allow \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"input\":{\"method\":\"GET\",\"path\":[\"user\",\"alice\"],\"token\":{\"payload\":{\"sub\":\"alice\",\"roles\":[\"user\"]}}}}'"
echo ""
echo "  # Test preferences service"
echo "  curl -H 'Authorization: Bearer mock-token' http://localhost:3002/preferences/expert_999"
echo ""
echo "  # Run all tests again"
echo "  cd sam-app && npx playwright test"
echo ""
echo -e "${BLUE}To stop all services:${NC}"
echo "  kill $SAM_API_PID $SAM_LAMBDA_PID 2>/dev/null || true"
echo "  docker-compose down"
echo ""
echo -e "${BLUE}To check running processes:${NC}"
echo "  # Check SAM processes:"
echo "  ps aux | grep 'sam local'"
echo "  # Check Lambda containers:"
echo "  docker ps --filter 'ancestor=public.ecr.aws/lambda/nodejs'"
echo ""
echo -e "${GREEN}🚀 Complete End-to-End POC Ready!${NC}"
echo -e "${GREEN}✅ OPA Server + Policies${NC}"
echo -e "${GREEN}✅ Mock Services + Documentation${NC}"
echo -e "${GREEN}✅ Lambda Authorizer Integration${NC}"
echo -e "${GREEN}✅ Comprehensive Test Suite${NC}"

# Function to show current process status
show_process_status() {
    echo -e "${BLUE}📊 Current Process Status:${NC}"
    echo "SAM Processes:"
    ps aux | grep "sam local" | grep -v grep || echo "  No SAM processes found"
    echo ""
    echo "Lambda Containers:"
    # Show containers with exact filter
    docker ps --filter "ancestor=public.ecr.aws/lambda/nodejs" --format "table {{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null
    # Also show any containers with versioned nodejs images
    docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep "public.ecr.aws/lambda/nodejs" 2>/dev/null || echo "  No Lambda containers found"
    echo ""
}

cleanup() {
    echo
    echo "🛑 Stopping services..."

    # Show status before cleanup
    show_process_status

    # Kill SAM processes
    if [ -n "$SAM_API_PID" ]; then
        if kill $SAM_API_PID 2>/dev/null; then
            echo "✅ SAM API process stopped"
        else
            echo "⚠️  SAM API process may have already stopped"
        fi
    fi

    if [ -n "$SAM_LAMBDA_PID" ]; then
        if kill $SAM_LAMBDA_PID 2>/dev/null; then
            echo "✅ SAM Lambda process stopped"
        else
            echo "⚠️  SAM Lambda process may have already stopped"
        fi
    fi

    # Fallback: kill any remaining sam local processes
    pkill -f "sam local start" 2>/dev/null || true

    # Clean up Lambda containers created by SAM
    echo "🧹 Cleaning up Lambda containers..."
    docker ps -q --filter "ancestor=public.ecr.aws/lambda/nodejs" | xargs -r docker stop 2>/dev/null || true
    docker ps -aq --filter "ancestor=public.ecr.aws/lambda/nodejs" | xargs -r docker rm 2>/dev/null || true

    # Also clean up containers with versioned nodejs images (more comprehensive)
    docker ps -q | xargs -r docker inspect --format '{{.Id}} {{.Config.Image}}' 2>/dev/null | grep "public.ecr.aws/lambda/nodejs" | cut -d' ' -f1 | xargs -r docker stop 2>/dev/null || true
    docker ps -aq | xargs -r docker inspect --format '{{.Id}} {{.Config.Image}}' 2>/dev/null | grep "public.ecr.aws/lambda/nodejs" | cut -d' ' -f1 | xargs -r docker rm 2>/dev/null || true

    # Alternative: Stop and remove all containers with lambda nodejs images
    docker stop $(docker ps -q --filter "ancestor=public.ecr.aws/lambda/nodejs:20-rapid-arm64") 2>/dev/null || true
    docker rm $(docker ps -aq --filter "ancestor=public.ecr.aws/lambda/nodejs:20-rapid-arm64") 2>/dev/null || true

    # Stop Docker services (go back to root directory first)
    cd ..
    if docker-compose down; then
        echo "✅ Docker services stopped"
    else
        echo "⚠️  Failed to stop Docker services"
    fi

    # Show final status after cleanup
    echo ""
    echo "🔍 Final Status Check:"
    show_process_status

    echo "🏁 Cleanup complete"
    exit
}

trap cleanup INT

# Wait for user interrupt (Ctrl+C) to stop services
echo "Press Ctrl+C to stop all services..."

# Keep the script running until interrupted
while kill -0 $SAM_API_PID 2>/dev/null && kill -0 $SAM_LAMBDA_PID 2>/dev/null; do
    sleep 1
done

# If we get here, one of the processes has died
echo "⚠️  One of the SAM processes has stopped unexpectedly"
cleanup
