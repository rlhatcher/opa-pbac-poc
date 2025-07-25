#!/bin/bash

# Setup Validation Script
# Validates that all components are properly installed and running

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_header() {
    echo -e "${PURPLE}🔍 $1${NC}"
}

# Validation counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Run a validation check
validate() {
    local check_name=$1
    local command=$2
    local required=${3:-true}
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if eval "$command" > /dev/null 2>&1; then
        print_status "$check_name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        if [ "$required" = "true" ]; then
            print_error "$check_name"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            print_warning "$check_name (optional)"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        fi
        return 1
    fi
}

# Validate service endpoint
validate_endpoint() {
    local service_name=$1
    local url=$2
    local required=${3:-true}
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if curl -s "$url" > /dev/null 2>&1; then
        print_status "$service_name is responding at $url"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        if [ "$required" = "true" ]; then
            print_error "$service_name is not responding at $url"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            print_warning "$service_name is not responding at $url (optional)"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        fi
        return 1
    fi
}

# Main validation
main() {
    print_header "OPA PBAC POC - Setup Validation"
    echo ""
    print_info "Validating installation and service status..."

    # Ensure we're in the right directory
    if [ ! -f "package.json" ] && [ -f "../package.json" ]; then
        print_info "Changing to project root directory..."
        cd ..
    fi

    print_info "Current directory: $(pwd)"
    echo ""
    
    # Prerequisites validation
    print_header "Prerequisites"
    validate "Node.js 18+" "node --version | grep -E 'v(1[8-9]|[2-9][0-9])'"
    validate "npm" "npm --version"
    validate "Docker" "docker --version"
    validate "Docker running" "docker info"
    validate "jq (for config parsing)" "command -v jq" false
    echo ""
    
    # File structure validation
    print_header "Project Structure"
    validate "docker-compose.yml exists" "[ -f docker-compose.yml ]"
    validate ".env file exists" "[ -f .env ]"
    validate "policies directory exists" "[ -d policies ]"
    validate "sam-app directory exists" "[ -d sam-app ]"
    validate "pap-service directory exists" "[ -d pap-service ]"
    validate "mock-services directory exists" "[ -d mock-services ]"
    validate "scripts directory exists" "[ -d scripts ]"
    echo ""
    
    # Dependencies validation
    print_header "Dependencies"
    validate "SAM app dependencies" "[ -d sam-app/node_modules ]"
    validate "Mock services dependencies" "[ -d mock-services/node_modules ]"
    validate "PAP service dependencies" "[ -d pap-service/node_modules ]"
    validate "PAP frontend dependencies" "[ -d pap-service/frontend/node_modules ]"
    echo ""
    
    # Docker containers validation
    print_header "Docker Containers"
    validate "OPA container running" "docker ps | grep opa-pbac-poc-opa"
    validate "Preferences service container" "docker ps | grep opa-pbac-poc-preferences-service"
    validate "PAP service container" "docker ps | grep opa-pbac-poc-pap-service"
    validate "Swagger UI container" "docker ps | grep opa-pbac-poc-swagger-ui"
    echo ""
    
    # Service endpoints validation
    print_header "Service Endpoints"
    validate_endpoint "OPA Server" "http://localhost:8181/health"
    validate_endpoint "Preferences API" "http://localhost:3002/health"
    validate_endpoint "PAP Dashboard" "http://localhost:3004"
    validate_endpoint "Swagger UI" "http://localhost:3003"
    validate_endpoint "SAM API Gateway" "http://localhost:3000" false
    validate_endpoint "SAM Lambda" "http://localhost:3001" false
    echo ""
    
    # OPA data validation
    print_header "OPA Data"
    validate "DNC Companies data" "curl -s http://localhost:8181/v1/data/data/companies | grep -q 'decision_id'"
    validate "DNC Countries data" "curl -s http://localhost:8181/v1/data/countries | grep -q 'decision_id'"
    validate "Configuration data" "curl -s http://localhost:8181/v1/data/config | grep -q 'decision_id'"
    echo ""
    
    # Policy testing
    print_header "Policy Testing"
    local test_payload='{"input": {"expert": {"company": "TestCorp", "country": "US"}}}'
    validate "Policy decision endpoint" "curl -s -X POST http://localhost:8181/v1/data/policies/dnc/can_contact -H 'Content-Type: application/json' -d '$test_payload' | grep -q 'decision_id'"
    echo ""
    
    # Optional tools validation
    print_header "Optional Tools"
    validate "SAM CLI" "command -v sam" false
    validate "AWS CLI" "command -v aws" false
    validate "AWS credentials" "aws sts get-caller-identity" false
    echo ""
    
    # Summary
    print_header "Validation Summary"
    echo "=================="
    echo "Total Checks:     $TOTAL_CHECKS"
    echo "✅ Passed:        $PASSED_CHECKS"
    echo "❌ Failed:        $FAILED_CHECKS"
    echo "⚠️  Warnings:      $WARNING_CHECKS"
    echo ""
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        print_status "All critical validations passed!"
        echo ""
        print_info "🎉 Your OPA PBAC POC setup is working correctly!"
        echo ""
        echo "📊 Available Services:"
        echo "• OPA Policy Server:     http://localhost:8181"
        echo "• Preferences API:       http://localhost:3002"
        echo "• PAP Dashboard:         http://localhost:3004"
        echo "• API Documentation:     http://localhost:3003"
        
        if [ $WARNING_CHECKS -gt 0 ]; then
            echo ""
            print_warning "Some optional components are not available:"
            print_info "• SAM CLI and AWS tools are optional for Lambda development"
            print_info "• Run './scripts/setup-sam.sh' to install them"
        fi
        
        echo ""
        print_info "🧪 Quick test command:"
        echo "curl -X POST http://localhost:8181/v1/data/policies/dnc/can_contact \\"
        echo "  -H 'Content-Type: application/json' \\"
        echo "  -d '{\"input\": {\"expert\": {\"company\": \"TestCorp\", \"country\": \"US\"}}}'"
        
        exit 0
    else
        print_error "Setup validation failed!"
        echo ""
        print_info "🔧 Troubleshooting steps:"
        echo "1. Check if Docker is running: docker info"
        echo "2. Restart services: docker-compose restart"
        echo "3. Rebuild containers: docker-compose build --no-cache"
        echo "4. Re-run setup: ./scripts/auto-setup.sh --yes"
        echo ""
        print_info "📖 For more help, see SETUP.md"
        
        exit 1
    fi
}

# Run main function
main "$@"
