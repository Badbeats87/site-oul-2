#!/usr/bin/env node

/**
 * Sync HTML files from src/public/admin/ to src/public/pages/admin/
 * This ensures both URL paths (/admin/ and /pages/admin/) serve identical content
 * Run this script before committing changes to admin HTML files
 */

const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, '../src/public/admin');
const pagesAdminDir = path.join(__dirname, '../src/public/pages/admin');

// Ensure pages/admin directory exists
if (!fs.existsSync(pagesAdminDir)) {
  fs.mkdirSync(pagesAdminDir, { recursive: true });
  console.log(`Created directory: ${pagesAdminDir}`);
}

// Get all HTML files from admin directory
const files = fs.readdirSync(adminDir).filter(file => file.endsWith('.html'));

let synced = 0;
let errors = 0;

files.forEach(file => {
  const sourcePath = path.join(adminDir, file);
  const destPath = path.join(pagesAdminDir, file);
  
  try {
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destPath, content, 'utf8');
    console.log(`✅ Synced: ${file}`);
    synced++;
  } catch (error) {
    console.error(`❌ Error syncing ${file}: ${error.message}`);
    errors++;
  }
});

console.log(`\nSync complete: ${synced} files synced${errors > 0 ? `, ${errors} errors` : ''}`);
process.exit(errors > 0 ? 1 : 0);
