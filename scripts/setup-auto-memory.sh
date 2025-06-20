#!/bin/bash
# Setup script for automatic memory capture

echo "🧠 Setting up MCP Memory Auto-Capture..."

# Detect shell
if [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
    SHELL_NAME="bash"
elif [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
    SHELL_NAME="zsh"
else
    echo "❌ Unsupported shell. Only bash and zsh are supported."
    exit 1
fi

echo "📝 Detected shell: $SHELL_NAME"

# Create memory capture function
MEMORY_FUNCTION='
# MCP Memory Auto-Capture
capture_to_mcp_memory() {
    local last_cmd="$(history 1 | sed "s/^[ ]*[0-9]*[ ]*//")"
    local exit_code="$?"
    
    # Skip if command is too short or trivial
    if [[ ${#last_cmd} -lt 5 ]] || [[ "$last_cmd" =~ ^(ls|cd|pwd|clear|echo|history)$ ]]; then
        return
    fi
    
    # Skip if localhost is not running
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        return
    fi
    
    # Send to memory API (background process)
    {
        curl -s -X POST "http://localhost:3000/api/memory/cli" \
            -H "Content-Type: application/json" \
            -d "{
                \"command\": \"$last_cmd\",
                \"exitCode\": $exit_code,
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"cwd\": \"$(pwd)\"
            }" > /dev/null 2>&1
    } &
}

# Hook into shell prompt
if [[ -n "$BASH_VERSION" ]]; then
    if [[ -z "$PROMPT_COMMAND" ]]; then
        PROMPT_COMMAND="capture_to_mcp_memory"
    else
        PROMPT_COMMAND="$PROMPT_COMMAND; capture_to_mcp_memory"
    fi
elif [[ -n "$ZSH_VERSION" ]]; then
    precmd_functions+=(capture_to_mcp_memory)
fi
'

# Check if already installed
if grep -q "capture_to_mcp_memory" "$SHELL_RC" 2>/dev/null; then
    echo "⚠️  Memory capture already installed in $SHELL_RC"
    echo "   To reinstall, remove the MCP Memory Auto-Capture section first."
else
    # Add to shell RC file
    echo "" >> "$SHELL_RC"
    echo "$MEMORY_FUNCTION" >> "$SHELL_RC"
    echo "✅ Added memory capture to $SHELL_RC"
fi

# Create completion script for memory search
cat > "$HOME/.mcp-memory-search" << 'EOF'
# MCP Memory Search Function
msearch() {
    if [ -z "$1" ]; then
        echo "Usage: msearch <query>"
        echo "Example: msearch 'npm install'"
        return 1
    fi
    
    local query=$(echo "$1" | sed 's/ /%20/g')
    local result=$(curl -s "http://localhost:3000/api/memory?query=$query")
    
    if command -v jq > /dev/null 2>&1; then
        echo "$result" | jq -r '.memories[]? | "📝 \(.name) (score: \(.relevanceScore))\n   \(.observations | join("\n   "))\n"'
    else
        echo "$result"
    fi
}

# Alias for quick memory search
alias ms=msearch
EOF

# Add search function to shell RC
if ! grep -q "mcp-memory-search" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# MCP Memory Search" >> "$SHELL_RC"
    echo "[ -f ~/.mcp-memory-search ] && source ~/.mcp-memory-search" >> "$SHELL_RC"
    echo "✅ Added memory search function (use 'msearch' or 'ms' command)"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📌 Next steps:"
echo "   1. Reload your shell: source $SHELL_RC"
echo "   2. Make sure your Next.js app is running on localhost:3000"
echo "   3. Try some commands:"
echo "      npm install axios"
echo "      git status"
echo "      prisma generate"
echo "   4. Search your memory:"
echo "      msearch npm"
echo "      ms 'git status'"
echo ""
echo "💡 Tips:"
echo "   - Commands are captured automatically in the background"
echo "   - Only non-trivial commands (>5 chars) are saved"
echo "   - Memory is stored in .mcp-memory.json"
echo "   - Use 'msearch' or 'ms' to search your command history"

# Make the script executable
chmod +x "$0"