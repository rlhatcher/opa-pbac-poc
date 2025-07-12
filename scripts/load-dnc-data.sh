#!/bin/bash

# Script to load DNC data into OPA
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root directory (parent of scripts)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔄 Loading DNC data into OPA..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# OPA endpoint
OPA_URL="http://localhost:8181"

# Function to check if OPA is running
check_opa() {
    if ! curl -s "$OPA_URL/health" > /dev/null 2>&1; then
        echo -e "${RED}❌ OPA is not running on $OPA_URL${NC}"
        echo "Please start OPA first with: docker-compose up opa"
        exit 1
    fi
    echo -e "${GREEN}✅ OPA is running${NC}"
}

# Function to load data into OPA
load_data() {
    local data_file=$1
    local data_path=$2
    
    echo -e "${YELLOW}📤 Loading $data_file into $data_path...${NC}"
    
    if [ ! -f "$data_file" ]; then
        echo -e "${RED}❌ File not found: $data_file${NC}"
        return 1
    fi
    
    response=$(curl -s -w "%{http_code}" -X PUT \
        "$OPA_URL/v1/data/$data_path" \
        -H "Content-Type: application/json" \
        -d @"$data_file")
    
    http_code="${response: -3}"
    
    if [ "$http_code" = "204" ]; then
        echo -e "${GREEN}✅ Successfully loaded $data_file${NC}"
    else
        echo -e "${RED}❌ Failed to load $data_file (HTTP $http_code)${NC}"
        return 1
    fi
}

# Function to verify data was loaded
verify_data() {
    local data_path=$1
    local description=$2
    
    echo -e "${YELLOW}🔍 Verifying $description...${NC}"
    
    response=$(curl -s "$OPA_URL/v1/data/$data_path")
    
    if echo "$response" | jq -e '.result' > /dev/null 2>&1; then
        count=$(echo "$response" | jq '.result | length')
        echo -e "${GREEN}✅ $description verified ($count items)${NC}"
    else
        echo -e "${RED}❌ Failed to verify $description${NC}"
        return 1
    fi
}

# Main execution
echo "🚀 Starting DNC data loading process..."

# Check if OPA is running
check_opa

# Load DNC companies data (runtime data via API)
echo -e "${YELLOW}📦 Loading companies data at runtime...${NC}"
load_data "$PROJECT_ROOT/policies/data/dnc_companies.json" "data"

echo -e "${YELLOW}ℹ️  Country data is baked into OPA container at build time${NC}"

# Load configuration data
load_data "$PROJECT_ROOT/policies/data/config.json" "config"

# Verify the data was loaded correctly
echo ""
echo "🔍 Verifying loaded data..."
verify_data "data/companies" "DNC Companies (Runtime)"

# Check build-time countries data (available at root level)
echo "🔍 Verifying DNC Countries (Build-time)..."
COUNTRIES_COUNT=$(curl -s "$OPA_URL/v1/data/countries" | jq -r '.result | length // 0')
if [ "$COUNTRIES_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ DNC Countries (Build-time) verified ($COUNTRIES_COUNT items)${NC}"
else
    echo -e "${RED}❌ Failed to verify DNC Countries (Build-time)${NC}"
fi

verify_data "config" "Configuration"

# Test the policy with a sample input
echo ""
echo "🧪 Testing DNC policy with sample data..."

# Test case 1: Should allow contact
test_input_allow='{
  "input": {
    "expert": {
      "id": "expert_123",
      "current_company_id": "comp_999",
      "country_id": "US"
    },
    "project": {
      "id": "proj_456", 
      "type": "technology"
    }
  }
}'

echo -e "${YELLOW}Testing allowed contact...${NC}"
result=$(curl -s -X POST "$OPA_URL/v1/data/policies/dnc/can_contact" \
    -H "Content-Type: application/json" \
    -d "$test_input_allow")

if echo "$result" | jq -e '.result == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Allow test passed${NC}"
else
    echo -e "${RED}❌ Allow test failed${NC}"
    echo "Result: $result"
fi

# Test case 2: Should block contact (DNC company)
test_input_block='{
  "input": {
    "expert": {
      "id": "expert_456",
      "current_company_id": "comp_001",
      "country_id": "US"
    },
    "project": {
      "id": "proj_789",
      "type": "financial_services"
    }
  }
}'

echo -e "${YELLOW}Testing blocked contact (DNC company)...${NC}"
result=$(curl -s -X POST "$OPA_URL/v1/data/policies/dnc/can_contact" \
    -H "Content-Type: application/json" \
    -d "$test_input_block")

if echo "$result" | jq -e '.result == false' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Block test passed${NC}"
else
    echo -e "${RED}❌ Block test failed${NC}"
    echo "Result: $result"
fi

echo ""
echo -e "${GREEN}🎉 DNC data loading and testing completed!${NC}"
echo ""
echo "Available endpoints:"
echo "  📊 Policy Decision: POST $OPA_URL/v1/data/policies/dnc/can_contact"
echo "  🏢 DNC Companies: GET $OPA_URL/v1/data/dnc/companies"
echo "  🌍 DNC Countries: GET $OPA_URL/v1/data/dnc/countries"
echo "  ⚙️  Configuration: GET $OPA_URL/v1/data/config"
