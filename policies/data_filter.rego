package document_filter

# This rule defines the OpenSearch query DSL fragment for filtering documents.
# It will be used with OPA's Compile API.
#
# Default to a filter that matches nothing (deny by default).
# This is crucial for security.
default query_filter = {
    "match_none": {}
}

# Admins can see all documents.
# The filter will be an empty 'must' array within a 'bool' query,
# effectively returning all documents.
query_filter = {
    "bool": {
        "must": []
    }
} if {
    input.user.roles[_] == "admin"
}

# Employees can only see documents in their department OR documents they own.
# This generates a 'bool' query with 'must' and 'should' clauses.
query_filter = {
    "bool": {
        "must": [
            # Ensure the document belongs to the specified library
            {"term": {"library_id": input.library_id}}
        ],
        "should": [
            {"term": {"department": input.user.department}},
            {"term": {"owner_id": input.user.id}}
        ],
        "minimum_should_match": 1 # At least one 'should' condition must match
    }
} if {
    input.user.roles[_] == "employee"
    # Ensure department and id are provided for employees
    input.user.department
    input.user.id
}

# Add other roles or conditions as needed
# For example, a manager might see all documents in their team's departments
# query_filter = {
#     "bool": {
#         "must": [
#             {"term": {"library_id": input.library_id}},
#             {"term": {"department.keyword": input.user.department}}
#         ]
#     }
# } {
#     input.user.roles[_] == "manager"
#     input.user.department
# }
