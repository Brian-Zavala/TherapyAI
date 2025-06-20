# Setting Up Continuous Memory Capture

## 1. **Git Hooks (Auto-capture commits)**

### `.git/hooks/post-commit`
```bash
#!/bin/bash
# Auto-save commits to memory

commit_msg=$(git log -1 --pretty=%B)
commit_hash=$(git rev-parse HEAD)
changed_files=$(git diff-tree --no-commit-id --name-only -r HEAD)

curl -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"git_commit_${commit_hash:0:7}\",
    \"summary\": [
      \"Commit: $commit_msg\",
      \"Hash: $commit_hash\",
      \"Files: $changed_files\",
      \"Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    ],
    \"relatedEntities\": [\"GitHistory\", \"DevWorkflow\"]
  }" &
```

## 2. **VS Code Tasks (Auto-capture debug sessions)**

### `.vscode/tasks.json`
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Debug with Memory",
      "type": "shell",
      "command": "node",
      "args": ["scripts/capture-debug-session.js", "${file}"],
      "problemMatcher": "$tsc",
      "presentation": {
        "reveal": "always"
      }
    }
  ]
}
```

## 3. **Error Boundary (Auto-capture runtime errors)**

### `src/components/MemoryErrorBoundary.tsx`
```typescript
class MemoryErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Auto-save error to memory
    fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: `error_${Date.now()}`,
        summary: [
          `Error: ${error.message}`,
          `Stack: ${error.stack}`,
          `Component: ${errorInfo.componentStack}`,
          `Time: ${new Date().toISOString()}`
        ],
        relatedEntities: ['RuntimeErrors', 'CommonIssues']
      })
    });
  }
}
```

## 4. **PM2 Process Monitor (Auto-capture crashes)**

### `ecosystem.config.js`
```javascript
module.exports = {
  apps: [{
    name: 'therapy-app',
    script: 'npm',
    args: 'start',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    
    // Auto-save crashes to memory
    min_uptime: '10s',
    max_restarts: 10,
    autorestart: true,
    
    events: {
      restart: function() {
        // Capture restart event
        require('child_process').exec(`
          curl -X POST http://localhost:3000/api/memory -H "Content-Type: application/json" -d '{
            "conversationId": "crash_${Date.now()}",
            "summary": ["App crashed and restarted", "Check logs/err.log"],
            "relatedEntities": ["RuntimeErrors"]
          }'
        `);
      }
    }
  }]
};
```

## 5. **Browser Extension (Capture dev tools errors)**

```javascript
// Chrome extension to capture console errors
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CONSOLE_ERROR') {
    fetch('http://localhost:3000/api/memory', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: `console_error_${Date.now()}`,
        summary: [
          `Console Error: ${request.message}`,
          `URL: ${request.url}`,
          `Line: ${request.line}`
        ],
        relatedEntities: ['BrowserErrors', 'CommonIssues']
      })
    });
  }
});
```

## 6. **Test Runner Integration**

### `jest.config.js`
```javascript
module.exports = {
  reporters: [
    'default',
    ['./scripts/jest-memory-reporter.js', {
      saveFailures: true,
      saveSuccesses: false
    }]
  ]
};
```

## 7. **Cron Job for Daily Summary**

### `scripts/daily-memory-summary.sh`
```bash
#!/bin/bash
# Run daily at midnight

# Summarize today's activity
commits=$(git log --since="1 day ago" --oneline | wc -l)
errors=$(grep -c "ERROR" logs/err.log 2>/dev/null || echo 0)
deployments=$(grep -c "deploy" ~/.bash_history | tail -100 || echo 0)

curl -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"daily_summary_$(date +%Y%m%d)\",
    \"summary\": [
      \"Date: $(date +%Y-%m-%d)\",
      \"Commits: $commits\",
      \"Errors: $errors\",
      \"Deployments: $deployments\"
    ],
    \"relatedEntities\": [\"ProjectMilestones\", \"DevWorkflow\"]
  }"
```

## 8. **The Full Setup Script**

```bash
#!/bin/bash
# setup-all-capture.sh

echo "🚀 Setting up complete memory capture..."

# 1. Shell commands
./scripts/setup-auto-memory.sh

# 2. Git hooks
echo '#!/bin/bash
# ... (post-commit content)
' > .git/hooks/post-commit
chmod +x .git/hooks/post-commit

# 3. VS Code settings
mkdir -p .vscode
echo '{ ... }' > .vscode/tasks.json

# 4. Cron job
(crontab -l 2>/dev/null; echo "0 0 * * * /path/to/daily-memory-summary.sh") | crontab -

echo "✅ All capture systems installed!"
```