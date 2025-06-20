#!/bin/bash
# Fix .bashrc syntax errors from memory setup

echo "🔧 Fixing .bashrc syntax errors..."

# Remove the broken memory capture section
sed -i '/# MCP Memory Auto-Capture/,/^fi$/d' ~/.bashrc

# Add the correct version
cat >> ~/.bashrc << 'EOF'

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

# Hook into bash prompt
if [[ -z "$PROMPT_COMMAND" ]]; then
    PROMPT_COMMAND="capture_to_mcp_memory"
else
    PROMPT_COMMAND="$PROMPT_COMMAND; capture_to_mcp_memory"
fi
EOF

# Ensure memory search is sourced
if ! grep -q "mcp-memory-search" ~/.bashrc 2>/dev/null; then
    echo "" >> ~/.bashrc
    echo "# MCP Memory Search" >> ~/.bashrc
    echo "[ -f ~/.mcp-memory-search ] && source ~/.mcp-memory-search" >> ~/.bashrc
fi

echo "✅ Fixed .bashrc! Now run: source ~/.bashrc"