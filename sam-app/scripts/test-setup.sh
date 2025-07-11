#!/bin/bash

# Test setup script for OPA + Lambda Authorizer POC
set -e

echo "🚀 Setting up OPA + Lambda Authorizer Test Environment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - $service_name not ready yet..."
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Step 1: Start OPA server
echo "📦 Starting OPA server..."
cd ..
docker-compose up -d opa
cd sam-app

# Step 2: Check OPA is running
check_service "http://localhost:8181/health" "OPA Server"

# Step 3: Build SAM application
echo "🔨 Building SAM application..."
sam build

# Step 4: Set dummy AWS credentials for local testing
echo "🔑 Setting up local AWS credentials..."
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy
export AWS_DEFAULT_REGION=us-east-1

# Step 5: Start SAM local API (for full integration testing)
echo "🚀 Starting SAM local API..."
sam local start-api --port 3000 --skip-pull-image --warm-containers EAGER &
SAM_API_PID=$!

# Step 6: Start SAM local Lambda (for authorizer testing)
echo "🚀 Starting SAM local Lambda..."
sam local start-lambda --port 3001 --skip-pull-image --warm-containers EAGER &
SAM_LAMBDA_PID=$!

# Step 7: Check SAM services are running
check_service "http://localhost:3000" "SAM Local API"
check_service "http://localhost:3001/2015-03-31/functions" "SAM Local Lambda"

# Step 8: Install dependencies and Playwright
echo "📦 Installing dependencies..."
cd opa-poc
npm install

echo "🎭 Setting up Playwright..."
npm run test:setup
cd ..

echo -e "${GREEN}🎉 Test environment is ready!${NC}"
echo ""
echo "Available services:"
echo "  📊 OPA Server: http://localhost:8181"
echo "  🌐 SAM Local API: http://localhost:3000"
echo "  🔧 SAM Local Lambda: http://localhost:3001"
echo ""
echo "To run tests:"
echo "  npm run test:e2e              # Run all E2E tests"
echo "  npm run test:e2e:ui           # Run tests with UI"
echo ""
echo "To test backend function:"
echo "  curl -H 'Authorization: Bearer <jwt>' http://localhost:3000/user/alice"
echo ""
echo "To stop services:"
echo "  kill $SAM_API_PID $SAM_LAMBDA_PID  # Stop SAM services"
echo "  docker-compose down           # Stop OPA"

# Keep script running to maintain SAM services
echo "Press Ctrl+C to stop all services..."
trap "echo 'Stopping services...'; kill $SAM_API_PID $SAM_LAMBDA_PID 2>/dev/null; cd ..; docker-compose down; exit" INT
wait $SAM_API_PID
