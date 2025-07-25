#!/bin/bash

# Setup script for data-filter functionality
set -e

echo "Setting up data-filter functionality..."

# Navigate to data-filter directory
cd data-filter

# Install dependencies
echo "Installing dependencies..."
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

echo "Data-filter setup complete!"
echo ""
echo "To use the data-filter functionality:"
echo "1. Start the services: docker-compose up opa opensearch"
echo "2. Initialize OpenSearch: cd data-filter && npm run init-opensearch"
echo "3. Run the demo: cd data-filter && npm start"
