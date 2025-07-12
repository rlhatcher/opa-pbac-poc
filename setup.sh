#!/bin/bash

# OPA + Lambda Authorizer POC - Complete End-to-End Setup
set -e

echo "🚀 OPA + Lambda Authorizer POC - Complete Setup"

# Colors for output
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
./scripts/load-dnc-data.sh || echo -e "${YELLOW}⚠️  Data loading had issues, continuing...${NC}"

# Step 4: Build SAM application
echo -e "${BLUE}🔨 Building SAM application...${NC}"
cd sam-app
sam build

# Step 5: Set dummy AWS credentials for local testing
echo -e "${BLUE}🔑 Setting up local AWS credentials...${NC}"
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy
export AWS_DEFAULT_REGION=us-east-1

# Step 6: Start SAM local services
echo -e "${BLUE}🚀 Starting SAM local API...${NC}"
sam local start-api --port 3000 --skip-pull-image --warm-containers EAGER &
SAM_API_PID=$!

echo -e "${BLUE}🚀 Starting SAM local Lambda...${NC}"
sam local start-lambda --port 3001 --skip-pull-image --warm-containers EAGER &
SAM_LAMBDA_PID=$!

# Step 7: Check SAM services
check_service "http://localhost:3000" "SAM Local API"
check_service "http://localhost:3001/2015-03-31/functions" "SAM Local Lambda"

cd ..

# Step 8: Run comprehensive tests
echo -e "${BLUE}🧪 Running comprehensive tests...${NC}"
cd sam-app

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

cd ..

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
echo "  curl -X POST http://localhost:8181/v1/data/policies/allow \\"
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
echo -e "${GREEN}🚀 Complete End-to-End POC Ready!${NC}"
echo -e "${GREEN}✅ OPA Server + Policies${NC}"
echo -e "${GREEN}✅ Mock Services + Documentation${NC}"
echo -e "${GREEN}✅ Lambda Authorizer Integration${NC}"
echo -e "${GREEN}✅ Comprehensive Test Suite${NC}"

# Keep script running to maintain SAM services
echo ""
echo "Press Ctrl+C to stop all services..."
trap "echo 'Stopping services...'; kill $SAM_API_PID $SAM_LAMBDA_PID 2>/dev/null || true; docker-compose down; exit" INT
wait $SAM_API_PID
