FROM openpolicyagent/opa:latest

# Copy policies
COPY policies/ /policies/

# Copy country data at build time (baked into container)
# This demonstrates build-time data loading vs runtime API calls
# OPA will automatically load JSON files from the data directory
COPY policies/data/dnc_countries.json /data.json

# Expose the standard OPA port
EXPOSE 8181

# Start OPA with policies and build-time data
# The data.json file will be available as data.countries
CMD ["run", "--server", "--addr=0.0.0.0:8181", "--set=decision_logs.console=true", "/policies", "/data.json"]
