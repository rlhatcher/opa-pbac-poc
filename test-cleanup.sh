#!/bin/bash

# Test script to verify Lambda container cleanup
set -e

echo "🧪 Testing Lambda Container Cleanup"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to show current Lambda containers
show_lambda_containers() {
    echo -e "${YELLOW}Current Lambda containers:${NC}"
    docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep "public.ecr.aws/lambda/nodejs" 2>/dev/null || echo "  No Lambda containers found"
    echo ""
}

# Function to clean up Lambda containers (same as in setup.sh)
cleanup_lambda_containers() {
    echo -e "${YELLOW}🧹 Cleaning up Lambda containers...${NC}"
    
    # Clean up Lambda containers (including versioned tags)
    docker ps -q --filter "ancestor=public.ecr.aws/lambda/nodejs" | xargs -r docker stop 2>/dev/null || true
    docker ps -aq --filter "ancestor=public.ecr.aws/lambda/nodejs" | xargs -r docker rm 2>/dev/null || true
    
    # Also clean up containers with versioned nodejs images (more comprehensive)
    docker ps -q | xargs -r docker inspect --format '{{.Id}} {{.Config.Image}}' 2>/dev/null | grep "public.ecr.aws/lambda/nodejs" | cut -d' ' -f1 | xargs -r docker stop 2>/dev/null || true
    docker ps -aq | xargs -r docker inspect --format '{{.Id}} {{.Config.Image}}' 2>/dev/null | grep "public.ecr.aws/lambda/nodejs" | cut -d' ' -f1 | xargs -r docker rm 2>/dev/null || true
    
    # Alternative: Stop and remove all containers with lambda nodejs images
    docker stop $(docker ps -q --filter "ancestor=public.ecr.aws/lambda/nodejs:20-rapid-arm64") 2>/dev/null || true
    docker rm $(docker ps -aq --filter "ancestor=public.ecr.aws/lambda/nodejs:20-rapid-arm64") 2>/dev/null || true
    
    echo -e "${GREEN}✅ Lambda container cleanup completed${NC}"
}

# Show containers before cleanup
echo "BEFORE cleanup:"
show_lambda_containers

# Run cleanup
cleanup_lambda_containers

# Show containers after cleanup
echo "AFTER cleanup:"
show_lambda_containers

echo -e "${GREEN}🎉 Cleanup test completed!${NC}"
