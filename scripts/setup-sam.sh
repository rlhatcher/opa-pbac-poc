#!/bin/bash

# SAM CLI Setup and AWS Configuration Script
# Automates SAM CLI installation and AWS credential setup

set -e

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

print_header() {
    echo -e "${BLUE}🔧 $1${NC}"
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos" ;;
        Linux*)     echo "linux" ;;
        CYGWIN*|MINGW*|MSYS*) echo "windows" ;;
        *)          echo "unknown" ;;
    esac
}

# Check if SAM CLI is installed
check_sam_cli() {
    if command -v sam &> /dev/null; then
        local version=$(sam --version 2>/dev/null | head -n1)
        print_status "SAM CLI already installed: $version"
        return 0
    else
        return 1
    fi
}

# Install SAM CLI based on OS
install_sam_cli() {
    local os=$(detect_os)
    print_header "Installing SAM CLI for $os..."
    
    case $os in
        "macos")
            if command -v brew &> /dev/null; then
                print_info "Installing SAM CLI via Homebrew..."
                brew tap aws/tap
                brew install aws-sam-cli
            else
                print_warning "Homebrew not found. Installing via pip..."
                pip3 install aws-sam-cli
            fi
            ;;
        "linux")
            print_info "Installing SAM CLI via pip..."
            pip3 install aws-sam-cli
            ;;
        "windows")
            print_error "Windows detected. Please install SAM CLI manually:"
            print_info "Download from: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install-windows.html"
            exit 1
            ;;
        *)
            print_error "Unsupported OS. Please install SAM CLI manually:"
            print_info "See: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html"
            exit 1
            ;;
    esac
}

# Check AWS credentials
check_aws_credentials() {
    if aws sts get-caller-identity &> /dev/null; then
        local identity=$(aws sts get-caller-identity --output text --query 'Account')
        print_status "AWS credentials configured (Account: $identity)"
        return 0
    else
        return 1
    fi
}

# Setup AWS credentials interactively
setup_aws_credentials() {
    print_header "Setting up AWS credentials..."
    
    # Check if user wants to use existing credentials
    if [ -f "$HOME/.aws/credentials" ] || [ -f "$HOME/.aws/config" ]; then
        print_warning "Existing AWS configuration found."
        read -p "Do you want to reconfigure AWS credentials? (y/N): " reconfigure
        if [[ ! $reconfigure =~ ^[Yy]$ ]]; then
            print_info "Keeping existing AWS configuration"
            return 0
        fi
    fi
    
    echo ""
    print_info "AWS credentials are required for SAM local development."
    print_info "You can use temporary credentials or create a test profile."
    echo ""
    
    # Option 1: Use aws configure
    read -p "Do you want to configure AWS credentials now? (Y/n): " configure_now
    if [[ $configure_now =~ ^[Nn]$ ]]; then
        print_warning "Skipping AWS configuration. You can run 'aws configure' later."
        return 0
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_warning "AWS CLI not found. Installing..."
        local os=$(detect_os)
        case $os in
            "macos")
                if command -v brew &> /dev/null; then
                    brew install awscli
                else
                    print_error "Please install AWS CLI manually: https://aws.amazon.com/cli/"
                    exit 1
                fi
                ;;
            "linux")
                curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
                unzip awscliv2.zip
                sudo ./aws/install
                rm -rf awscliv2.zip aws/
                ;;
            *)
                print_error "Please install AWS CLI manually: https://aws.amazon.com/cli/"
                exit 1
                ;;
        esac
    fi
    
    # Run aws configure
    print_info "Running 'aws configure'..."
    print_info "You can use dummy values for local development:"
    print_info "  Access Key ID: test"
    print_info "  Secret Access Key: test"
    print_info "  Region: us-east-1"
    print_info "  Output format: json"
    echo ""
    
    aws configure
}

# Create local AWS credentials for testing
create_test_credentials() {
    print_header "Creating test AWS credentials for local development..."
    
    mkdir -p "$HOME/.aws"
    
    # Create credentials file
    cat > "$HOME/.aws/credentials" << EOF
[default]
aws_access_key_id = test
aws_secret_access_key = test
EOF
    
    # Create config file
    cat > "$HOME/.aws/config" << EOF
[default]
region = us-east-1
output = json
EOF
    
    print_status "Test AWS credentials created"
    print_warning "These are dummy credentials for local SAM development only"
}

# Main execution
main() {
    local auto_mode=false
    if [ "${1:-}" = "--auto" ]; then
        auto_mode=true
        print_header "SAM CLI and AWS Setup (Automated Mode)"
    else
        print_header "SAM CLI and AWS Setup Automation"
    fi
    echo ""

    # Check if SAM CLI is installed
    if ! check_sam_cli; then
        if [ "$auto_mode" = "true" ]; then
            print_info "Auto mode: Installing SAM CLI..."
            install_sam_cli
            print_status "SAM CLI installation completed"
        else
            read -p "SAM CLI not found. Install it now? (Y/n): " install_sam
            if [[ ! $install_sam =~ ^[Nn]$ ]]; then
                install_sam_cli
                print_status "SAM CLI installation completed"
            else
                print_warning "SAM CLI installation skipped"
                exit 1
            fi
        fi
    fi
    
    # Check AWS credentials
    if ! check_aws_credentials; then
        if [ "$auto_mode" = "true" ]; then
            print_info "Auto mode: Creating dummy AWS credentials for local testing..."
            create_test_credentials
        else
            print_warning "AWS credentials not configured or invalid"
            echo ""
            echo "Choose an option:"
            echo "1) Configure real AWS credentials (aws configure)"
            echo "2) Create dummy credentials for local testing"
            echo "3) Skip AWS configuration"
            echo ""
            read -p "Enter choice (1-3): " aws_choice

            case $aws_choice in
                1)
                    setup_aws_credentials
                    ;;
                2)
                    create_test_credentials
                    ;;
                3)
                    print_warning "AWS configuration skipped"
                    print_info "You may need to configure AWS credentials later for SAM to work"
                    ;;
                *)
                    print_error "Invalid choice"
                    exit 1
                    ;;
            esac
        fi
    fi
    
    # Verify final setup
    echo ""
    print_header "Verifying setup..."
    
    if command -v sam &> /dev/null; then
        print_status "SAM CLI: $(sam --version | head -n1)"
    else
        print_error "SAM CLI verification failed"
        exit 1
    fi
    
    if aws sts get-caller-identity &> /dev/null 2>&1; then
        print_status "AWS credentials: Configured"
    else
        print_warning "AWS credentials: Not configured or invalid"
        print_info "SAM local development may not work without valid credentials"
    fi
    
    echo ""
    print_status "SAM setup completed!"
    print_info "You can now run the full setup: ./setup.sh"
}

# Run main function
main "$@"
