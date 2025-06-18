#!/usr/bin/env node

/**
 * Monitor API calls to detect excessive database queries
 * Run this alongside your development server to track API call patterns
 */

const chalk = require('chalk');

// Configuration
const API_ROUTES_TO_MONITOR = [
  '/api/sessions/',
  '/api/conversation/',
  '/api/vapi/',
];

const RATE_THRESHOLD = {
  calls_per_second: 2,
  window_seconds: 5,
};

// Tracking state
const apiCallTracking = new Map();

// ANSI escape codes for cursor control
const CLEAR_LINE = '\x1b[2K';
const MOVE_UP = '\x1b[1A';

function trackApiCall(route, timestamp) {
  if (!apiCallTracking.has(route)) {
    apiCallTracking.set(route, []);
  }
  
  const calls = apiCallTracking.get(route);
  calls.push(timestamp);
  
  // Keep only calls within the window
  const windowStart = timestamp - (RATE_THRESHOLD.window_seconds * 1000);
  const recentCalls = calls.filter(t => t > windowStart);
  apiCallTracking.set(route, recentCalls);
  
  return recentCalls.length;
}

function analyzeCallRate(route) {
  const calls = apiCallTracking.get(route) || [];
  const now = Date.now();
  const windowStart = now - (RATE_THRESHOLD.window_seconds * 1000);
  const recentCalls = calls.filter(t => t > windowStart);
  
  const callsPerSecond = recentCalls.length / RATE_THRESHOLD.window_seconds;
  const isExcessive = callsPerSecond > RATE_THRESHOLD.calls_per_second;
  
  return {
    totalCalls: recentCalls.length,
    callsPerSecond: callsPerSecond.toFixed(2),
    isExcessive,
  };
}

function displayStats() {
  console.clear();
  console.log(chalk.bold.cyan('🔍 API Call Monitor\n'));
  console.log(chalk.gray(`Monitoring for excessive calls (>${RATE_THRESHOLD.calls_per_second}/sec over ${RATE_THRESHOLD.window_seconds}s window)\n`));
  
  let hasExcessiveCalls = false;
  
  API_ROUTES_TO_MONITOR.forEach(route => {
    const stats = analyzeCallRate(route);
    const statusIcon = stats.isExcessive ? '🚨' : '✅';
    const color = stats.isExcessive ? chalk.red : chalk.green;
    
    if (stats.isExcessive) hasExcessiveCalls = true;
    
    console.log(
      `${statusIcon} ${chalk.bold(route)}\n` +
      `   Calls: ${color(stats.totalCalls)} in last ${RATE_THRESHOLD.window_seconds}s | ` +
      `Rate: ${color(stats.callsPerSecond)}/sec`
    );
    
    if (stats.isExcessive) {
      console.log(chalk.yellow(`   ⚠️  Excessive API calls detected!`));
    }
    console.log();
  });
  
  if (hasExcessiveCalls) {
    console.log(chalk.bgRed.white.bold('\n ⚠️  PERFORMANCE WARNING: Excessive API calls detected! '));
    console.log(chalk.yellow('This may indicate:'));
    console.log(chalk.yellow('- Missing effect dependency optimization'));
    console.log(chalk.yellow('- Infinite re-render loops'));
    console.log(chalk.yellow('- Missing debouncing/throttling'));
  }
  
  console.log(chalk.gray('\nPress Ctrl+C to exit'));
}

// Mock function to simulate monitoring (replace with actual log parsing)
function simulateApiCall() {
  // In a real implementation, this would parse Next.js logs or use a middleware
  const routes = API_ROUTES_TO_MONITOR;
  const route = routes[Math.floor(Math.random() * routes.length)];
  
  // Simulate different patterns
  const patterns = [
    () => { // Normal pattern
      if (Math.random() < 0.1) {
        trackApiCall(route, Date.now());
      }
    },
    () => { // Burst pattern (simulating the issue)
      if (Math.random() < 0.8 && route.includes('/sessions/')) {
        trackApiCall(route, Date.now());
      }
    }
  ];
  
  // Use burst pattern 30% of the time to simulate the issue
  const pattern = Math.random() < 0.3 ? patterns[1] : patterns[0];
  pattern();
}

// Update display periodically
setInterval(displayStats, 1000);

// Simulate API calls (replace with actual monitoring)
setInterval(simulateApiCall, 100);

console.log(chalk.cyan('Starting API call monitor...\n'));
console.log(chalk.gray('This is a simulation. In production, integrate with your logging system.\n'));

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nShutting down monitor...'));
  process.exit(0);
});