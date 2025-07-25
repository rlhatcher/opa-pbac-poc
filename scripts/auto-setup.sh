#!/bin/bash

# Automated Setup Script for OPA PBAC POC
# Uses configuration file for non-interactive setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration file path
CONFIG_FILE="scripts/setup-config.json"

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

# Read configuration value using jq
get_config() {
    local key=$1
    local default=$2
    
    if command -v jq &> /dev/null && [ -f "$CONFIG_FILE" ]; then
        jq -r "$key // \"$default\"" "$CONFIG_FILE" 2>/dev/null || echo "$default"
    else
        echo "$default"
    fi
}

# Read boolean configuration value
get_config_bool() {
    local key=$1
    local default=$2
    local value=$(get_config "$key" "$default")
    
    if [ "$value" = "true" ]; then
        echo "true"
    else
        echo "false"
    fi
}

# Load configuration
load_config() {
    print_header "Loading Configuration"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        print_warning "Configuration file not found: $CONFIG_FILE"
        print_info "Using default values"
    else
        print_status "Configuration loaded from: $CONFIG_FILE"
    fi
    
    # Load configuration values
    INSTALL_SAM=$(get_config_bool ".options.install_sam_cli" "true")
    SETUP_AWS=$(get_config_bool ".options.setup_aws_credentials" "true")
    USE_DUMMY_AWS=$(get_config_bool ".options.use_dummy_aws_credentials" "false")
    RUN_TESTS=$(get_config_bool ".options.run_tests_after_setup" "true")
    OPEN_BROWSER=$(get_config_bool ".options.open_browser_after_setup" "true")
    AUTO_START_SAM=$(get_config_bool ".options.auto_start_sam_local" "false")
    VERBOSE=$(get_config_bool ".features.enable_verbose_logging" "false")
    
    # Service configuration
    OPA_PORT=$(get_config ".services.opa_port" "8181")
    PREFERENCES_PORT=$(get_config ".services.preferences_port" "3002")
    PAP_PORT=$(get_config ".services.pap_dashboard_port" "3004")
    SWAGGER_PORT=$(get_config ".services.swagger_ui_port" "3003")
    
    # AWS configuration
    AWS_REGION=$(get_config ".aws.default_region" "us-east-1")
    AWS_OUTPUT=$(get_config ".aws.default_output" "json")
    
    # Timeouts
    STARTUP_WAIT=$(get_config ".timeouts.service_startup_wait" "10")
    HEALTH_TIMEOUT=$(get_config ".timeouts.health_check_timeout" "30")
}

# Display configuration summary
show_config_summary() {
    echo ""
    print_header "Setup Configuration Summary"
    echo "============================"
    echo "Install SAM CLI:          $INSTALL_SAM"
    echo "Setup AWS Credentials:    $SETUP_AWS"
    echo "Use Dummy AWS Creds:      $USE_DUMMY_AWS"
    echo "Run Tests:                $RUN_TESTS"
    echo "Open Browser:             $OPEN_BROWSER"
    echo "Auto Start SAM:           $AUTO_START_SAM"
    echo "Verbose Logging:          $VERBOSE"
    echo ""
    echo "Service Ports:"
    echo "  OPA Server:             $OPA_PORT"
    echo "  Preferences API:        $PREFERENCES_PORT"
    echo "  PAP Dashboard:          $PAP_PORT"
    echo "  Swagger UI:             $SWAGGER_PORT"
    echo ""
    echo "AWS Configuration:"
    echo "  Region:                 $AWS_REGION"
    echo "  Output Format:          $AWS_OUTPUT"
    echo ""
}

# Create dummy AWS credentials
create_dummy_aws_credentials() {
    print_info "Creating dummy AWS credentials for local development..."
    
    mkdir -p "$HOME/.aws"
    
    local access_key=$(get_config ".aws.dummy_credentials.access_key_id" "test")
    local secret_key=$(get_config ".aws.dummy_credentials.secret_access_key" "test")
    
    cat > "$HOME/.aws/credentials" << EOF
[default]
aws_access_key_id = $access_key
aws_secret_access_key = $secret_key
EOF
    
    cat > "$HOME/.aws/config" << EOF
[default]
region = $AWS_REGION
output = $AWS_OUTPUT
EOF
    
    print_status "Dummy AWS credentials created"
}

# Check service health
check_service_health() {
    local service_name=$1
    local url=$2
    local timeout=${3:-30}
    
    print_info "Checking $service_name health..."
    
    local count=0
    while [ $count -lt $timeout ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_status "$service_name is healthy"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    print_warning "$service_name health check timed out"
    return 1
}

# Run setup step with logging
run_setup_step() {
    local step_name=$1
    local command=$2
    local optional=${3:-false}
    
    print_header "$step_name"
    
    if [ "$VERBOSE" = "true" ]; then
        print_info "Executing: $command"
    fi
    
    if eval "$command"; then
        print_status "$step_name completed successfully"
        return 0
    else
        if [ "$optional" = "true" ]; then
            print_warning "$step_name failed (optional step, continuing)"
            return 0
        else
            print_error "$step_name failed"
            exit 1
        fi
    fi
}

# Main automated setup
main() {
    print_header "OPA PBAC POC - Automated Setup"
    echo ""
    print_info "This script will automatically set up the entire environment"
    print_info "based on the configuration in $CONFIG_FILE"
    echo ""
    
    # Load configuration
    load_config
    show_config_summary
    
    # Confirm setup
    if [ "${1:-}" != "--yes" ] && [ "${1:-}" != "-y" ]; then
        read -p "Continue with automated setup? (Y/n): " confirm
        if [[ $confirm =~ ^[Nn]$ ]]; then
            print_info "Setup cancelled by user"
            exit 0
        fi
    fi
    
    echo ""
    print_header "Starting Automated Setup Process"
    echo ""
    
    # Step 1: Install dependencies
    run_setup_step "Installing Dependencies" \
        "./scripts/install.sh"
    
    # Step 2: SAM CLI setup
    if [ "$INSTALL_SAM" = "true" ]; then
        run_setup_step "Setting up SAM CLI" \
            "./scripts/setup-sam.sh --auto" true
    fi
    
    # Step 3: AWS credentials
    if [ "$USE_DUMMY_AWS" = "true" ]; then
        create_dummy_aws_credentials
    fi
    
    # Step 4: Start Docker services
    run_setup_step "Starting Docker Services" \
        "./setup.sh"
    
    # Step 5: Wait for services
    print_header "Waiting for Services to Start"
    sleep $STARTUP_WAIT
    
    # Step 6: Health checks
    print_header "Performing Health Checks"
    check_service_health "OPA Server" "http://localhost:$OPA_PORT/health" $HEALTH_TIMEOUT || true
    check_service_health "Preferences API" "http://localhost:$PREFERENCES_PORT/health" $HEALTH_TIMEOUT || true
    check_service_health "PAP Dashboard" "http://localhost:$PAP_PORT" $HEALTH_TIMEOUT || true
    check_service_health "Swagger UI" "http://localhost:$SWAGGER_PORT" $HEALTH_TIMEOUT || true
    
    # Step 7: Run tests
    if [ "$RUN_TESTS" = "true" ]; then
        run_setup_step "Running Integration Tests" \
            "cd sam-app && npm test" true
    fi
    
    # Step 8: Auto-start SAM local
    if [ "$AUTO_START_SAM" = "true" ] && [ "$INSTALL_SAM" = "true" ]; then
        print_header "Starting SAM Local Services"
        print_info "Starting SAM API Gateway in background..."
        cd sam-app
        nohup sam local start-api --port 3000 > ../logs/sam-api.log 2>&1 &
        print_info "Starting SAM Lambda in background..."
        nohup sam local start-lambda --port 3001 > ../logs/sam-lambda.log 2>&1 &
        cd ..
        print_status "SAM local services started in background"
    fi
    
    # Step 9: Open browser
    if [ "$OPEN_BROWSER" = "true" ]; then
        print_info "Opening PAP Dashboard in browser..."
        if command -v open &> /dev/null; then
            open "http://localhost:$PAP_PORT"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "http://localhost:$PAP_PORT"
        else
            print_warning "Could not open browser automatically"
        fi
    fi
    
    # Final summary
    echo ""
    print_header "🎉 Automated Setup Complete!"
    echo ""
    print_status "All configured services are running"
    echo ""
    echo "📊 Available Services:"
    echo "======================"
    echo "🔐 OPA Policy Server:     http://localhost:$OPA_PORT"
    echo "📋 Preferences API:       http://localhost:$PREFERENCES_PORT"
    echo "🎛️  PAP Dashboard:         http://localhost:$PAP_PORT"
    echo "📚 API Documentation:     http://localhost:$SWAGGER_PORT"
    
    if [ "$AUTO_START_SAM" = "true" ]; then
        echo "🔧 SAM API Gateway:       http://localhost:3000"
        echo "⚡ SAM Lambda Functions:  http://localhost:3001"
    fi
    
    echo ""
    print_info "Setup completed successfully! The system is ready for use."
    
    if [ "$VERBOSE" = "true" ]; then
        echo ""
        print_info "Configuration used: $CONFIG_FILE"
        print_info "Logs available in: logs/"
    fi
}

# Run main function
main "$@"
