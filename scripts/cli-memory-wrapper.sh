#!/bin/bash
# CLI Memory Wrapper - Captures commands and saves to MCP memory
# Add this to your shell profile to automatically capture commands

# Function to capture and save commands
capture_command() {
    local cmd="$1"
    local exit_code="$2"
    local output="$3"
    
    # Only capture non-trivial commands
    if [[ ${#cmd} -gt 5 ]] && [[ ! "$cmd" =~ ^(ls|cd|pwd|echo|clear)$ ]]; then
        # Send to your API endpoint
        curl -s -X POST "http://localhost:3000/api/memory/cli" \
            -H "Content-Type: application/json" \
            -d "{
                \"command\": \"$cmd\",
                \"exitCode\": $exit_code,
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"cwd\": \"$(pwd)\"
            }" > /dev/null 2>&1 &
    fi
}

# Wrapper function for commands
memory_wrapper() {
    local cmd="$@"
    local output
    local exit_code
    
    # Execute command and capture output
    output=$(eval "$cmd" 2>&1)
    exit_code=$?
    
    # Display output
    echo "$output"
    
    # Capture to memory
    capture_command "$cmd" "$exit_code" "$output"
    
    return $exit_code
}

# Alias common commands
alias npm="memory_wrapper npm"
alias git="memory_wrapper git"
alias prisma="memory_wrapper prisma"
alias yarn="memory_wrapper yarn"
alias pnpm="memory_wrapper pnpm"

# Capture all commands via PROMPT_COMMAND (bash) or precmd (zsh)
if [[ -n "$BASH_VERSION" ]]; then
    PROMPT_COMMAND='capture_command "$(history 1 | sed "s/^[ ]*[0-9]*[ ]*//")" "$?" ""'
elif [[ -n "$ZSH_VERSION" ]]; then
    precmd() {
        capture_command "$(fc -ln -1)" "$?" ""
    }
fi