/**
 * Import your project's historical knowledge into MCP memory
 * Run this ONCE to capture all past learnings
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Historical knowledge to import
const projectHistory = {
  entities: [
    {
      name: "HistoricalBugs",
      entityType: "BugHistory",
      observations: [
        // Add your past bugs here
        "Bug: Infinite re-renders in TherapyButton - Fixed by using refs for callbacks",
        "Bug: VAPI 400 errors on session start - Fixed by supporting inline assistant configs",
        "Bug: Session timer drift - Fixed by rate-limiting sync to active conversations only",
        "Bug: Duplicate session recovery - Fixed by checking conversation time not wall clock",
        "Bug: Modal z-index issues - Fixed by using React Portals",
        "Bug: Database connection fails - Must use .env not .env.local",
        "Bug: Rate limiting loops - Fixed with exponential backoff",
        // Add more of your bugs here...
      ]
    },
    {
      name: "ProjectMilestones", 
      entityType: "Timeline",
      observations: [
        "2024-11: Started project with monolithic TherapyButton.tsx (4,431 lines)",
        "2024-12: Refactored into 11 focused hooks",
        "2024-12: Implemented session recovery system",
        "2024-12: Added real-time metrics with Supabase",
        "2024-12: Fixed VAPI authentication timing issues",
        // Add your milestones here...
      ]
    },
    {
      name: "LessonsLearned",
      entityType: "Knowledge",
      observations: [
        "Always use refs for timer callbacks in React hooks",
        "VAPI requires HTTPS even in development (use mkcert)",
        "Supabase real-time needs explicit table permissions",
        "Session state should sync via broadcast not database polling",
        "Feature flags essential for gradual refactoring",
        // Add your lessons here...
      ]
    }
  ]
};

// Extract git history for bugs/fixes
function extractGitHistory() {
  console.log('📚 Extracting git commit history...');
  
  try {
    // Get commits with "fix" or "bug" in message
    const bugFixes = execSync(
      `git log --grep="fix\\|bug" --pretty=format:"%s|%ad|%h" --date=short -50`,
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);
    
    const observations = bugFixes.map(line => {
      const [message, date, hash] = line.split('|');
      return `${date}: ${message} (${hash})`;
    });
    
    return observations;
  } catch (error) {
    console.error('Failed to extract git history:', error.message);
    return [];
  }
}

// Extract error patterns from code
function findErrorPatterns() {
  console.log('🔍 Searching for error handling patterns...');
  
  const patterns = [];
  const searchPaths = ['src/hooks', 'src/components', 'src/lib'];
  
  searchPaths.forEach(dir => {
    try {
      const files = execSync(
        `find ${dir} -name "*.ts" -o -name "*.tsx" | xargs grep -l "catch\\|error" | head -20`,
        { encoding: 'utf8' }
      ).trim().split('\n').filter(Boolean);
      
      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        // Extract error messages
        const errorMatches = content.match(/Error\(['"]([^'"]+)['"]\)/g);
        if (errorMatches) {
          errorMatches.forEach(match => {
            const msg = match.match(/Error\(['"]([^'"]+)['"]\)/)?.[1];
            if (msg) patterns.push(`Error in ${path.basename(file)}: "${msg}"`);
          });
        }
      });
    } catch (error) {
      // Ignore errors
    }
  });
  
  return patterns.slice(0, 10); // Top 10 patterns
}

// Extract README and docs
function extractDocumentation() {
  console.log('📖 Extracting documentation insights...');
  
  const docs = [];
  const docFiles = ['README.md', 'CLAUDE.md', 'docs/*.md'];
  
  docFiles.forEach(pattern => {
    try {
      const files = execSync(`find . -name "${pattern}" -type f`, { encoding: 'utf8' })
        .trim().split('\n').filter(Boolean);
      
      files.forEach(file => {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          // Extract headers
          const headers = content.match(/^##+ (.+)$/gm);
          if (headers) {
            headers.slice(0, 5).forEach(header => {
              docs.push(`${path.basename(file)}: ${header.replace(/^#+\s*/, '')}`);
            });
          }
        }
      });
    } catch (error) {
      // Ignore
    }
  });
  
  return docs;
}

// Main import function
async function importProjectHistory() {
  console.log('🚀 Starting project history import...\n');
  
  // Add git history
  const gitHistory = extractGitHistory();
  if (gitHistory.length > 0) {
    projectHistory.entities.push({
      name: "GitBugFixes",
      entityType: "VersionControl",
      observations: gitHistory
    });
  }
  
  // Add error patterns
  const errorPatterns = findErrorPatterns();
  if (errorPatterns.length > 0) {
    projectHistory.entities.push({
      name: "ErrorPatterns",
      entityType: "CodePatterns",
      observations: errorPatterns
    });
  }
  
  // Add documentation
  const docs = extractDocumentation();
  if (docs.length > 0) {
    projectHistory.entities.push({
      name: "Documentation",
      entityType: "Knowledge",
      observations: docs
    });
  }
  
  // Save to file for review
  const outputPath = 'project-history-import.json';
  fs.writeFileSync(outputPath, JSON.stringify(projectHistory, null, 2));
  
  console.log(`\n✅ Project history prepared!`);
  console.log(`📄 Review the import at: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Entities to import: ${projectHistory.entities.length}`);
  console.log(`   - Total observations: ${projectHistory.entities.reduce((sum, e) => sum + e.observations.length, 0)}`);
  console.log(`\n🎯 Next steps:`);
  console.log(`   1. Review and edit ${outputPath}`);
  console.log(`   2. Add any missing bugs, lessons, or milestones`);
  console.log(`   3. Run: node scripts/import-to-mcp.js`);
}

// Run import
importProjectHistory().catch(console.error);