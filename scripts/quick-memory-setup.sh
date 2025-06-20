#!/bin/bash
# Quick setup to start capturing everything NOW

echo "🧠 MCP Memory Quick Setup"
echo "========================"
echo ""

# 1. Import existing project history
echo "📚 Step 1: Importing your project history..."
if [ -f "scripts/import-project-history.js" ]; then
    node scripts/import-project-history.js
    echo "✅ Project history extracted"
else
    echo "❌ import-project-history.js not found"
fi

# 2. Setup shell command capture
echo ""
echo "🐚 Step 2: Setting up shell command capture..."
if [ -f "scripts/setup-auto-memory.sh" ]; then
    ./scripts/setup-auto-memory.sh
    echo "✅ Shell capture configured"
else
    echo "❌ setup-auto-memory.sh not found"
fi

# 3. Create git hook for commit capture
echo ""
echo "📝 Step 3: Setting up git commit capture..."
mkdir -p .git/hooks

cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash
# Auto-capture git commits to MCP memory

# Skip if no server running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    exit 0
fi

commit_msg=$(git log -1 --pretty=%B | head -1)
commit_hash=$(git rev-parse --short HEAD)
branch=$(git branch --show-current)

# Send to memory in background
{
    curl -s -X POST http://localhost:3000/api/memory/cli \
        -H "Content-Type: application/json" \
        -d "{
            \"command\": \"git commit -m \\\"$commit_msg\\\"\",
            \"exitCode\": 0,
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"cwd\": \"$(pwd)\",
            \"output\": \"[$branch $commit_hash] $commit_msg\"
        }" > /dev/null 2>&1
} &
EOF

chmod +x .git/hooks/post-commit
echo "✅ Git hooks installed"

# 4. Create error capture helper
echo ""
echo "🚨 Step 4: Creating error capture helper..."
cat > capture-error.sh << 'EOF'
#!/bin/bash
# Usage: ./capture-error.sh "Error message" "Solution"

if [ $# -lt 2 ]; then
    echo "Usage: ./capture-error.sh \"Error message\" \"Solution\""
    exit 1
fi

error="$1"
solution="$2"

curl -X POST http://localhost:3000/api/memory \
    -H "Content-Type: application/json" \
    -d "{
        \"conversationId\": \"manual_error_$(date +%s)\",
        \"summary\": [
            \"Error: $error\",
            \"Solution: $solution\",
            \"Date: $(date)\",
            \"Directory: $(pwd)\"
        ],
        \"relatedEntities\": [\"CommonIssues\", \"Solutions\"]
    }"

echo "✅ Error and solution saved to memory"
EOF

chmod +x capture-error.sh
echo "✅ Error capture helper created"

# 5. Create session capture helper
echo ""
echo "💬 Step 5: Creating session capture helper..."
cat > save-session.sh << 'EOF'
#!/bin/bash
# Usage: ./save-session.sh "What you learned/did"

if [ $# -lt 1 ]; then
    echo "Usage: ./save-session.sh \"What you learned/did today\""
    exit 1
fi

summary="$1"

curl -X POST http://localhost:3000/api/memory \
    -H "Content-Type: application/json" \
    -d "{
        \"conversationId\": \"dev_session_$(date +%s)\",
        \"summary\": [
            \"Summary: $summary\",
            \"Date: $(date)\",
            \"Working on: $(basename $(pwd))\"
        ],
        \"relatedEntities\": [\"DevWorkflow\", \"LessonsLearned\"]
    }"

echo "✅ Session saved to memory"
EOF

chmod +x save-session.sh
echo "✅ Session capture helper created"

# 6. Show summary
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📌 What's now being captured:"
echo "   ✅ Shell commands (after you source your shell)"
echo "   ✅ Git commits (automatically)"
echo "   ✅ Manual error capture (use ./capture-error.sh)"
echo "   ✅ Dev session notes (use ./save-session.sh)"
echo ""
echo "🚀 Quick commands:"
echo "   source ~/.bashrc        # Activate shell capture"
echo "   msearch 'npm'          # Search your command history"
echo "   ./capture-error.sh \"error\" \"solution\"  # Save an error/fix"
echo "   ./save-session.sh \"what you did\"       # Save session notes"
echo ""
echo "📝 Don't forget to:"
echo "   1. Review project-history-import.json and add missing items"
echo "   2. Source your shell: source ~/.bashrc"
echo "   3. Keep your Next.js app running on localhost:3000"
echo ""
echo "💡 Pro tip: Add to your daily workflow:"
echo "   - Start of day: ./save-session.sh \"Working on: X feature\""
echo "   - Hit an error: ./capture-error.sh \"error\" \"how I fixed it\""
echo "   - End of day: ./save-session.sh \"Completed: X, Y, Z\""