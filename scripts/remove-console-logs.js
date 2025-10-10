#!/usr/bin/env node

/**
 * Script to remove console.log and console.warn statements
 * Keeps console.error for critical error handling
 */

const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_PROCESS = [
  'app',
  'components',
  'lib',
];

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Directories to skip
const SKIP_DIRS = ['node_modules', '.next', 'dist', 'build', '.git'];

let totalFilesProcessed = 0;
let totalLogsRemoved = 0;
let totalWarnsRemoved = 0;

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return EXTENSIONS.includes(ext);
}

function shouldSkipDirectory(dirName) {
  return SKIP_DIRS.includes(dirName);
}

function removeConsoleLogs(content) {
  let modified = content;
  let logsRemoved = 0;
  let warnsRemoved = 0;

  // Remove console.log statements (various formats)
  const logPatterns = [
    // Single line console.log
    /console\.log\([^)]*\);?\s*\n?/g,
    // Multi-line console.log
    /console\.log\(\s*[^)]*\n[^)]*\);?\s*\n?/g,
  ];

  // Remove console.warn statements
  const warnPatterns = [
    /console\.warn\([^)]*\);?\s*\n?/g,
    /console\.warn\(\s*[^)]*\n[^)]*\);?\s*\n?/g,
  ];

  // Count and remove console.log
  logPatterns.forEach(pattern => {
    const matches = modified.match(pattern);
    if (matches) {
      logsRemoved += matches.length;
      modified = modified.replace(pattern, '');
    }
  });

  // Count and remove console.warn
  warnPatterns.forEach(pattern => {
    const matches = modified.match(pattern);
    if (matches) {
      warnsRemoved += matches.length;
      modified = modified.replace(pattern, '');
    }
  });

  // Clean up excessive blank lines (max 2 consecutive blank lines)
  modified = modified.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return { modified, logsRemoved, warnsRemoved };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { modified, logsRemoved, warnsRemoved } = removeConsoleLogs(content);

    if (logsRemoved > 0 || warnsRemoved > 0) {
      fs.writeFileSync(filePath, modified, 'utf8');
      console.log(`✓ ${filePath}: Removed ${logsRemoved} console.log(s) and ${warnsRemoved} console.warn(s)`);
      totalLogsRemoved += logsRemoved;
      totalWarnsRemoved += warnsRemoved;
    }

    totalFilesProcessed++;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(entry.name)) {
        processDirectory(fullPath);
      }
    } else if (entry.isFile() && shouldProcessFile(fullPath)) {
      processFile(fullPath);
    }
  }
}

function main() {
  console.log('🧹 Starting cleanup of console.log and console.warn statements...\n');
  console.log('Note: console.error statements will be preserved.\n');

  const rootDir = path.resolve(__dirname, '..');

  DIRECTORIES_TO_PROCESS.forEach(dir => {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
      console.log(`Processing directory: ${dir}`);
      processDirectory(fullPath);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ Cleanup completed!');
  console.log('='.repeat(60));
  console.log(`Files processed: ${totalFilesProcessed}`);
  console.log(`console.log statements removed: ${totalLogsRemoved}`);
  console.log(`console.warn statements removed: ${totalWarnsRemoved}`);
  console.log(`Total statements removed: ${totalLogsRemoved + totalWarnsRemoved}`);
  console.log('='.repeat(60));
}

main();
