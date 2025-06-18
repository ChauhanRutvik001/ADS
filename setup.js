/**
 * Root setup file for AI Quizzer Backend
 * This is used to redirect to the actual setup script in the scripts directory
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('Redirecting to setup script...');

try {
  execSync('node scripts/setup.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Error running setup script:', error);
  process.exit(1);
}
