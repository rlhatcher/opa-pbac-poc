package policies.dnc

import rego.v1

# Default decision: do not contact unless explicitly allowed
default can_contact := false

# Main decision rule: Allow contacting only if ALL DNC checks pass
can_contact if {
	input_is_valid
	not employed_by_dnc_company
	not located_in_dnc_country
	not opted_out_by_preference
}

# Comprehensive input validation with detailed error reporting
input_is_valid if {
	count(input_validation_errors) == 0
}

# Input validation using Rego best practices
# Validates required fields and their types efficiently

# Expert validation
input_validation_errors contains error if {
	not input.expert
	error := "missing expert data"
}

input_validation_errors contains error if {
	input.expert
	not input.expert.id
	error := "missing expert.id"
}

input_validation_errors contains error if {
	input.expert
	not input.expert.current_company_id
	error := "missing expert.current_company_id"
}

input_validation_errors contains error if {
	input.expert
	not input.expert.country_id
	error := "missing expert.country_id"
}

# Type validation - only when fields are present
input_validation_errors contains error if {
	input.expert.id
	not is_string(input.expert.id)
	error := "expert.id must be a string"
}

input_validation_errors contains error if {
	input.expert.current_company_id
	not is_string(input.expert.current_company_id)
	error := "expert.current_company_id must be a string"
}

input_validation_errors contains error if {
	input.expert.country_id
	not is_string(input.expert.country_id)
	error := "expert.country_id must be a string"
}

# Project validation
input_validation_errors contains error if {
	not input.project
	error := "missing project data"
}

input_validation_errors contains error if {
	input.project
	not input.project.type
	error := "missing project.type"
}

input_validation_errors contains error if {
	input.project
	not input.project.id
	error := "missing project.id"
}

# Project type validation - only when fields are present
input_validation_errors contains error if {
	input.project.type
	not is_string(input.project.type)
	error := "project.type must be a string"
}

input_validation_errors contains error if {
	input.project.id
	not is_string(input.project.id)
	error := "project.id must be a string"
}

# 1. Check if expert is employed by a DNC company
employed_by_dnc_company if {
	input.expert.current_company_id
	_company_exists_in_dnc_list
}

# Helper: Check if company exists in DNC list with error handling
_company_exists_in_dnc_list if {
	data.companies
	data.companies[input.expert.current_company_id]
}

# 2. Check if expert is located in a DNC country
# Uses build-time data (baked into container)
located_in_dnc_country if {
	input.expert.country_id
	_country_exists_in_dnc_list
}

# Helper: Check if country exists in DNC list with error handling
_country_exists_in_dnc_list if {
	data.countries
	data.countries[input.expert.country_id]
}

# 3. Check expert preferences from external service
opted_out_by_preference if {
	input.expert.id
	input.project.type
	_expert_opted_out_via_api
}

# Helper: Check if expert opted out via API with proper error handling
_expert_opted_out_via_api if {
	# Make HTTP call to preferences service
	response := http.send({
		"method": "GET",
		"url": sprintf("%s/experts/%s/preferences", [preferences_service_url, input.expert.id]),
		"headers": {
			"Content-Type": "application/json",
			"Authorization": sprintf("Bearer %s", [preferences_service_token]),
		},
		"timeout": preferences_service_timeout,
		"raise_error": false, # Don't raise errors, handle them gracefully
	})

	# Check if response is successful and project type is in exclusions
	response.status_code == 200
	input.project.type in response.body.exclusions
}

# Helper: Get preferences service URL from data or environment
default preferences_service_url := "http://preferences-service:3002"

preferences_service_url := data.config.config.preferences_service_url

# Helper: Get preferences service token from data
default preferences_service_token := "mock-token"

preferences_service_token := data.config.config.preferences_service_token

# Helper: Get preferences service timeout from data
default preferences_service_timeout := "5s"

preferences_service_timeout := data.config.config.preferences_service_timeout

# Collect all reasons why contact is not allowed
rejection_reasons contains "invalid_input" if {
	not input_is_valid
}

rejection_reasons contains "company_restriction" if {
	employed_by_dnc_company
}

rejection_reasons contains "country_restriction" if {
	located_in_dnc_country
}

rejection_reasons contains "expert_preference" if {
	opted_out_by_preference
}

# Company details for auditing (if blocked by company)
blocked_company := data.companies[input.expert.current_company_id] if {
	employed_by_dnc_company
}

# Country details for auditing (if blocked by country)
# Uses build-time data (baked into container)
blocked_country := data.countries[input.expert.country_id] if {
	located_in_dnc_country
}

# Comprehensive decision details for auditing and debugging
decision_details := {
	"can_contact": can_contact,
	"input_valid": input_is_valid,
	"validation_errors": input_validation_errors,
	"rejection_reasons": rejection_reasons,
	"blocked_company": blocked_company,
	"blocked_country": blocked_country,
	"timestamp": time.now_ns(),
	"policy_version": "1.1.0",
}
