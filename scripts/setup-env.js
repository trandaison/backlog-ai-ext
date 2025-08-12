#!/usr/bin/env node

/**
 * Setup script for development environment
 * Creates .env file if it doesn't exist
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from .env.example');
    console.log('📝 Please edit .env file and add your GA4 credentials');
  } else {
    const envContent = `# Google Analytics 4 Configuration
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=your-api-secret-here
`;
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file');
    console.log('📝 Please edit .env file and add your GA4 credentials');
  }
} else {
  console.log('ℹ️  .env file already exists');
}
