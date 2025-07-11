package policies

default allow := false

# Allow if user is accessing their own data
allow if {
	input.method == "GET"
	input.path = ["user", input.user_id]
	input.token.payload.sub == input.user_id
}

# Allow if user has "admin" role
allow if {
	"admin" in input.token.payload.roles
}
