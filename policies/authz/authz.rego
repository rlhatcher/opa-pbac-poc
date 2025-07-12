package policies.authz

import rego.v1

# Default decision: deny access unless explicitly allowed
default allow := false

# Allow access if user is accessing their own data
allow if {
	input.method in ["GET", "PUT", "PATCH"]
	count(input.path) >= 2
	input.path[0] == "user"
	input.path[1] == input.token.payload.sub
}

# Allow access if user has admin role
allow if {
	"admin" in input.token.payload.roles
}
