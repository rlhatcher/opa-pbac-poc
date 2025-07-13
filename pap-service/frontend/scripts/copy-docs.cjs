#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Source and destination paths
const docsDir = path.join(__dirname, '../../../docs')
const publicDir = path.join(__dirname, '../public/docs')
const rootReadme = path.join(__dirname, '../../../README.md')
const publicReadme = path.join(__dirname, '../public/README.md')

// Create docs directory in public if it doesn't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.md') ||
        entry.name.endsWith('.css') ||
        entry.name.endsWith('.yaml') ||
        entry.name.endsWith('.yml'))
    ) {
      fs.copyFileSync(srcPath, destPath)
      console.log(`Copied: ${entry.name}`)
    }
  }
}

// Copy all docs
console.log('Copying documentation files...')
copyDir(docsDir, publicDir)

// Copy root README
fs.copyFileSync(rootReadme, publicReadme)
console.log('Copied: README.md')

// Create a docs index file
const docsIndex = {
  nav: [
    { title: 'Home', file: 'docs/index.md' },
    { title: 'Quick Start', file: 'docs/quick-start.md' },
    {
      title: 'Architecture',
      children: [
        { title: 'Overview', file: 'docs/architecture/overview.md' },
        { title: 'XACML Components', file: 'docs/architecture/xacml.md' },
        { title: 'Data Flow', file: 'docs/architecture/data-flow.md' }
      ]
    },
    {
      title: 'Policies',
      children: [
        { title: 'Overview', file: 'docs/policies/index.md' },
        { title: 'DNC Policy', file: 'docs/policies/dnc.md' },
        { title: 'Authorization Policy', file: 'docs/policies/authz.md' },
        { title: 'Testing', file: 'docs/policies/testing.md' }
      ]
    },
    {
      title: 'Services',
      children: [
        { title: 'SAM Application', file: 'docs/services/sam-app.md' },
        { title: 'Mock Services', file: 'docs/services/mock-services.md' },
        { title: 'PAP Dashboard', file: 'docs/services/pap-dashboard.md' }
      ]
    },
    {
      title: 'Development',
      children: [
        { title: 'Setup', file: 'docs/development/setup.md' },
        { title: 'Testing', file: 'docs/development/testing.md' },
        { title: 'Deployment', file: 'docs/development/deployment.md' }
      ]
    },
    {
      title: 'API Reference',
      children: [
        { title: 'Policies API', file: 'docs/api/policies.md' },
        { title: 'Preferences API', file: 'docs/api/preferences.md' },
        { title: 'OPA Endpoints', file: 'docs/api/opa.md' },
        { title: 'PAP API', file: 'docs/api/pap.md' }
      ]
    }
  ]
}

fs.writeFileSync(
  path.join(publicDir, 'index.json'),
  JSON.stringify(docsIndex, null, 2)
)

console.log('Documentation copy complete!')
console.log(`Total files copied to: ${publicDir}`)
