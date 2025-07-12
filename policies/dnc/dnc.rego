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

# Input validation
input_is_valid if {
	# Validate expert data
	input.expert.id
	input.expert.current_company_id
	input.expert.country_id

	# Validate project data
	input.project.type
	input.project.id
}

# 1. Check if expert is employed by a DNC company
employed_by_dnc_company if {
	input.expert.current_company_id
	dnc_companies := data.data.companies
	dnc_companies[input.expert.current_company_id]
}

# 2. Check if expert is located in a DNC country
# Uses build-time data (baked into container)
located_in_dnc_country if {
	input.expert.country_id
	dnc_countries := data.countries
	dnc_countries[input.expert.country_id]
}

# 3. Check expert preferences from external service
opted_out_by_preference if {
	input.expert.id
	input.project.type

	# Make HTTP call to preferences service
	response := http.send({
		"method": "GET",
		"url": sprintf("%s/preferences/%s", [preferences_service_url, input.expert.id]),
		"headers": {
			"Content-Type": "application/json",
			"Authorization": sprintf("Bearer %s", [preferences_service_token]),
		},
		"timeout": "5s",
	})

	# Check if response is successful and contains exclusions
	response.status_code == 200

	# Check if project type is in exclusions
	input.project.type in response.body.exclusions
}

# Helper: Get preferences service URL from data or environment
default preferences_service_url := "http://preferences-service:3002"

preferences_service_url := data.config.config.preferences_service_url

# Helper: Get preferences service token from data
default preferences_service_token := "mock-token"

preferences_service_token := data.config.config.preferences_service_token

# Collect all reasons why contact is not allowed
dnc_reasons contains "invalid_input" if {
	not input_is_valid
}

dnc_reasons contains "dnc_company" if {
	employed_by_dnc_company
}

dnc_reasons contains "dnc_country" if {
	located_in_dnc_country
}

dnc_reasons contains "expert_preference" if {
	opted_out_by_preference
}

# Company details for auditing (if blocked by company)
blocked_company := data.data.companies[input.expert.current_company_id] if {
	employed_by_dnc_company
}

# Country details for auditing (if blocked by country)
# Uses build-time data (baked into container)
blocked_country := data.countries[input.expert.country_id] if {
	located_in_dnc_country
}
