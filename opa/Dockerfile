FROM openpolicyagent/opa:latest

# Copy policies
COPY policies/ /policies/

# Copy country data at build time (baked into container)
# This demonstrates build-time data loading vs runtime API calls
# OPA will automatically load JSON files from the data directory
COPY policies/data/dnc_countries.json /data.json

# Copy schema file for data validation
COPY policies/schemas/data.json /schemas.json

# Expose the standard OPA port
EXPOSE 8181

# Start OPA with policies, build-time data, schema, and file-based decision logging
# The data.json file will be available as data.countries
# The schemas.json file will be available as data.schemas
# Decision logs will be written to /logs/decisions.jsonl
CMD ["run", "--server", "--addr=0.0.0.0:8181", "--set=decision_logs.console=true", "--set=decision_logs.service=file", "--set=services.file.url=file:///logs/decisions.jsonl", "/policies", "/data.json", "/schemas.json"]
