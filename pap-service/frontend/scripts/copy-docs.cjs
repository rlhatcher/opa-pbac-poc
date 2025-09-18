#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Source and destination paths
const siteDir = path.join(__dirname, '../../../site')
const publicDir = path.join(__dirname, '../public')
const rootReadme = path.join(__dirname, '../../../README.md')
const publicReadme = path.join(__dirname, '../public/README.md')

// Create public directory if it doesn't exist
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

    // Skip search-related files and directories
    if (
      entry.name.startsWith('lunr.') ||
      entry.name.includes('search.') ||
      entry.name === 'search_index.json' ||
      entry.name === 'tinyseg.js' ||
      entry.name === 'wordcut.js' ||
      entry.name === 'lunr' ||
      entry.name === 'search' ||
      entry.name === 'workers'
    ) {
      console.log(`Skipped: ${entry.name} (search-related)`)
      continue
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath)
      console.log(`Copied: ${entry.name}`)
    }
  }
}

// Copy mkdocs site
console.log('Copying mkdocs site...')
copyDir(siteDir, publicDir)

// Copy root README
fs.copyFileSync(rootReadme, publicReadme)
console.log('Copied: README.md')

console.log('Documentation copy complete!')
console.log(`Total files copied to: ${publicDir}`)
