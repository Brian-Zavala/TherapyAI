# MCP Memory System - Quick Start

## Does It Automatically Memorize CLI Commands?

**No, not by default.** You need to set it up first.

## Quick Setup (2 minutes)

```bash
# 1. Run the setup script
./scripts/setup-auto-memory.sh

# 2. Reload your shell
source ~/.bashrc  # or source ~/.zshrc

# 3. That's it! Now your commands are auto-captured
```

## How It Works

### Automatic Capture (after setup):
```bash
npm install axios        # ✅ Auto-saved to memory
git commit -m "fix"      # ✅ Auto-saved to memory
prisma db push          # ✅ Auto-saved to memory
ls                      # ❌ Ignored (too trivial)
cd /home                # ❌ Ignored (too trivial)
```

### Search Your Memory:
```bash
# After setup, you can search
msearch npm        # Shows all npm commands you've run
ms "git commit"    # Shows all git commits
ms error          # Shows commands related to errors
```

## Current Logic Status

### ✅ **Working:**
- Mock memory system with pre-populated data
- API endpoints for saving/searching
- Demo UI at `/demo/memory-chat`
- Shell integration script (after setup)

### ❌ **Not Automatic (requires setup):**
- CLI command capture (run setup script)
- Claude conversation capture (not implemented)
- VS Code integration (manual setup needed)

### 🔧 **Production-Ready Components:**
- Memory storage format
- Search and relevance scoring
- API routes
- React hooks

## For Production Use

1. **Replace mock data with real MCP server:**
   ```bash
   npm install @modelcontextprotocol/sdk
   # Use /api/memory/production instead of /api/memory
   ```

2. **Enable auto-capture:**
   ```bash
   ./scripts/setup-auto-memory.sh
   source ~/.bashrc
   ```

3. **Start capturing:**
   - Your CLI commands will be saved automatically
   - Search with `msearch <query>`
   - Important conversations saved via API

## The Truth

- **Without setup**: Nothing is captured automatically
- **With setup**: CLI commands are captured in background
- **Claude conversations**: Still manual (no auto-save yet)
- **Memory persistence**: Works perfectly (.mcp-memory.json)

Run the setup script and your CLI commands will be memorized automatically!