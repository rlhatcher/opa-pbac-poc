package policies.dnc

import rego.v1

companies := data.companies # DNC companies data loaded at runtime via API
countries := data.countries # DNC countries: CN, IR, KP, RU, SY, BY
config := data.config # Service configuration and constants

known_project_types := {
	"financial_services", "healthcare", "technology", "manufacturing",
	"energy", "telecommunications", "automotive", "aerospace",
	"pharmaceuticals", "consulting",
}

# Top-level decision: can contact if input valid and no blocks
default can_contact := false

can_contact if {
	input_is_valid
	not employed_by_dnc_company
	not located_in_dnc_country
	not opted_out_by_preference
}

# 1. Check if expert is employed by a DNC company
employed_by_dnc_company if {
	input.expert.current_company_id
	_company_exists_in_dnc_list
}

# Helper: Check if company exists in DNC list with error handling
_company_exists_in_dnc_list if {
	companies
	companies[input.expert.current_company_id]
}

# 2. Check if expert is located in a DNC country
located_in_dnc_country if {
	input.expert.country_id
	_country_exists_in_dnc_list
}

# Helper: Check if country exists in DNC list with error handling
_country_exists_in_dnc_list if {
	countries
	countries[input.expert.country_id]
}

# 3. Check expert preferences from external service
opted_out_by_preference if {
	input.expert.id
	input.project.type
	_expert_opted_out_via_api
}

# Helper: Check if expert opted out via API with proper error handling
_expert_opted_out_via_api if {
	response := http.send({
		"method": "GET",
		"url": sprintf("%s/experts/%s/preferences", [preferences_service_url, input.expert.id]),
		"headers": {
			"Content-Type": "application/json",
			"Authorization": sprintf("Bearer %s", [preferences_service_token]),
		},
		"timeout": preferences_service_timeout,
		"raise_error": false,
	})

	response.status_code == 200
	input.project.type in response.body.exclusions
}

# Helper: Get preferences service URL from data or environment
default preferences_service_url := "http://preferences-service:3002"

# Use build-time config if available, otherwise fall back to default
preferences_service_url := config.config.preferences_service_url

# Helper: Get preferences service token from data
default preferences_service_token := "mock-token"

# Use build-time config if available, otherwise fall back to default
preferences_service_token := config.config.preferences_service_token

# Helper: Get preferences service timeout from data
default preferences_service_timeout := "5s"

# Use build-time config if available, otherwise fall back to default
preferences_service_timeout := config.config.preferences_service_timeout

# Collect all reasons why contact is not allowed
rejection_reasons contains reason if {
	reason == "invalid_input"
	not input_is_valid
}

rejection_reasons contains reason if {
	reason == "company_restriction"
	employed_by_dnc_company
}

rejection_reasons contains reason if {
	reason == "country_restriction"
	located_in_dnc_country
}

rejection_reasons contains reason if {
	reason == "expert_preference"
	opted_out_by_preference
}

# Company details for auditing (if blocked by company)
blocked_company := companies[input.expert.current_company_id] if {
	employed_by_dnc_company
}

# Country details for auditing (if blocked by country)
blocked_country := countries[input.expert.country_id] if {
	located_in_dnc_country
}

# Comprehensive decision details for auditing and debugging
decision_details := {
	"can_contact": can_contact,
	"input_valid": input_is_valid,
	"validation_errors": input_validation_errors,
	"rejection_reasons": [r | rejection_reasons[r]],
	"blocked_company": blocked_company,
	"blocked_country": blocked_country,
	"timestamp": time.now_ns(),
	"policy_version": "1.1.0",
}

# ============================================================================
# INPUT VALIDATION RULES
# ============================================================================

# Input is valid if no validation errors
input_is_valid if {
	count(input_validation_errors) == 0
}

# Consolidated input validation for expert
input_validation_errors contains msg if {
	some f in ["id", "current_company_id", "country_id"] # Required expert fields
	not input.expert[f]
	msg := sprintf("expert.%s is required", [f])
}

input_validation_errors contains msg if {
	some f in ["id", "current_company_id", "country_id"] # Required expert fields
	v := input.expert[f]
	not is_string(v)
	msg := sprintf("expert.%s must be a string", [f])
}

# Consolidated input validation for project
input_validation_errors contains msg if {
	some f in ["id", "type"] # Required project fields
	not input.project[f]
	msg := sprintf("project.%s is required", [f])
}

input_validation_errors contains msg if {
	some f in ["id", "type"] # Required project fields
	v := input.project[f]
	not is_string(v)
	msg := sprintf("project.%s must be a string", [f])
}

# Additional validation: check if project type is known (helps catch typos)
input_validation_errors contains msg if {
	is_string(input.project.type)
	not input.project.type in known_project_types
	msg := sprintf("project.type '%s' is not a recognized project type", [input.project.type])
}
