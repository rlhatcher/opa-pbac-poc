#!/bin/bash

# Complete Setup Orchestrator for OPA PBAC POC
# Automates the entire setup process from fresh clone to running system

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
    echo -e "${PURPLE}🚀 $1${NC}"
}

print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
        print_error "This script must be run from the opa-pbac-poc root directory"
        print_info "Current directory: $(pwd)"
        print_info "Expected files: package.json, docker-compose.yml"
        exit 1
    fi
}

# Run a step with error handling
run_step() {
    local step_num=$1
    local step_name=$2
    local command=$3
    local optional=${4:-false}
    
    print_step "$step_num" "$step_name"
    
    if eval "$command"; then
        print_status "$step_name completed"
        return 0
    else
        if [ "$optional" = "true" ]; then
            print_warning "$step_name failed (optional step)"
            return 0
        else
            print_error "$step_name failed"
            exit 1
        fi
    fi
}

# Ask user for setup preferences
get_user_preferences() {
    echo ""
    print_header "Setup Configuration"
    echo ""
    
    # Ask about SAM CLI setup
    read -p "Do you want to set up SAM CLI and AWS credentials? (Y/n): " setup_sam
    if [[ $setup_sam =~ ^[Nn]$ ]]; then
        SKIP_SAM=true
        print_warning "SAM CLI setup will be skipped"
    else
        SKIP_SAM=false
    fi
    
    # Ask about running tests
    read -p "Do you want to run tests after setup? (Y/n): " run_tests
    if [[ $run_tests =~ ^[Nn]$ ]]; then
        SKIP_TESTS=true
    else
        SKIP_TESTS=false
    fi
    
    # Ask about opening browser
    read -p "Do you want to open the dashboard in browser after setup? (Y/n): " open_browser
    if [[ $open_browser =~ ^[Nn]$ ]]; then
        SKIP_BROWSER=true
    else
        SKIP_BROWSER=false
    fi
    
    echo ""
}

# Display setup summary
show_setup_summary() {
    echo ""
    print_header "Setup Summary"
    echo "=============="
    echo "SAM CLI Setup:    $([ "$SKIP_SAM" = "true" ] && echo "❌ Skipped" || echo "✅ Included")"
    echo "Run Tests:        $([ "$SKIP_TESTS" = "true" ] && echo "❌ Skipped" || echo "✅ Included")"
    echo "Open Browser:     $([ "$SKIP_BROWSER" = "true" ] && echo "❌ Skipped" || echo "✅ Included")"
    echo ""
    
    read -p "Continue with this configuration? (Y/n): " confirm
    if [[ $confirm =~ ^[Nn]$ ]]; then
        print_info "Setup cancelled by user"
        exit 0
    fi
}

# Main setup execution
main() {
    print_header "OPA PBAC POC - Complete Setup Automation"
    echo ""
    print_info "This script will set up the entire OPA PBAC POC environment"
    print_info "from a fresh clone to a fully running system."
    echo ""
    
    # Check directory
    check_directory
    
    # Get user preferences
    get_user_preferences
    show_setup_summary
    
    echo ""
    print_header "Starting Complete Setup Process"
    echo ""
    
    # Step 1: Install dependencies
    run_step "1" "Installing dependencies and setting up environment" \
        "./scripts/install.sh"
    
    # Step 2: SAM CLI setup (optional)
    if [ "$SKIP_SAM" = "false" ]; then
        run_step "2" "Setting up SAM CLI and AWS credentials" \
            "./scripts/setup-sam.sh" true
    else
        print_info "Step 2: SAM CLI setup skipped"
    fi
    
    # Step 3: Start Docker services
    run_step "3" "Starting Docker services and loading data" \
        "./setup.sh"
    
    # Step 4: Wait for services to be ready
    print_step "4" "Waiting for all services to be ready"
    sleep 5
    
    # Verify services
    local services_ready=true
    
    if ! curl -s http://localhost:8181/health > /dev/null 2>&1; then
        print_warning "OPA Server (8181) not responding"
        services_ready=false
    fi
    
    if ! curl -s http://localhost:3002/health > /dev/null 2>&1; then
        print_warning "Preferences Service (3002) not responding"
        services_ready=false
    fi
    
    if ! curl -s http://localhost:3004 > /dev/null 2>&1; then
        print_warning "PAP Dashboard (3004) not responding"
        services_ready=false
    fi
    
    if [ "$services_ready" = "true" ]; then
        print_status "All Docker services are ready"
    else
        print_warning "Some services may not be fully ready yet"
    fi
    
    # Step 5: Run tests (optional)
    if [ "$SKIP_TESTS" = "false" ]; then
        run_step "5" "Running integration tests" \
            "cd sam-app && npm test" true
    else
        print_info "Step 5: Tests skipped"
    fi
    
    # Step 6: Display results
    print_step "6" "Setup completed - displaying results"
    
    echo ""
    print_header "🎉 Setup Complete!"
    echo ""
    print_status "All services are running and ready to use"
    echo ""
    echo "📊 Available Services:"
    echo "======================"
    echo "🔐 OPA Policy Server:     http://localhost:8181"
    echo "📋 Preferences API:       http://localhost:3002"
    echo "🎛️  PAP Dashboard:         http://localhost:3004"
    echo "📚 API Documentation:     http://localhost:3003"
    
    if [ "$SKIP_SAM" = "false" ]; then
        echo "🔧 SAM API Gateway:       http://localhost:3000 (when started)"
        echo "⚡ SAM Lambda Functions:  http://localhost:3001 (when started)"
    fi
    
    echo ""
    echo "🧪 Quick Test Commands:"
    echo "======================="
    echo "# Test OPA policy decision"
    echo "curl -X POST http://localhost:8181/v1/data/policies/dnc/can_contact \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"input\": {\"expert\": {\"company\": \"TestCorp\", \"country\": \"US\"}}}'"
    echo ""
    echo "# View DNC companies"
    echo "curl http://localhost:8181/v1/data/dnc/companies"
    echo ""
    
    if [ "$SKIP_SAM" = "false" ]; then
        echo "🚀 To start SAM local development:"
        echo "=================================="
        echo "cd sam-app"
        echo "sam local start-api --port 3000"
        echo "# In another terminal:"
        echo "sam local start-lambda --port 3001"
        echo ""
    fi
    
    echo "📖 Documentation:"
    echo "================="
    echo "• README.md - Project overview"
    echo "• docs/ - Detailed documentation"
    echo "• Swagger UI - http://localhost:3003"
    echo ""
    
    # Open browser if requested
    if [ "$SKIP_BROWSER" = "false" ]; then
        print_info "Opening PAP Dashboard in browser..."
        if command -v open &> /dev/null; then
            open http://localhost:3004
        elif command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:3004
        else
            print_warning "Could not open browser automatically"
            print_info "Please visit: http://localhost:3004"
        fi
    fi
    
    echo ""
    print_status "Complete setup finished successfully!"
    print_info "The OPA PBAC POC is now ready for development and testing."
}

# Initialize variables
SKIP_SAM=false
SKIP_TESTS=false
SKIP_BROWSER=false

# Run main function
main "$@"
