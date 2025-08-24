/**
 * API endpoint for capturing CLI commands automatically
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveConversationToMemory } from '@/lib/services/mcp-memory-context';

export async function POST(req: NextRequest) {
  try {
    const { command, exitCode, timestamp, cwd, output } = await req.json();
    
    // Only save important commands
    const importantPatterns = [
      'npm install', 'npm run', 'git', 'prisma', 
      'build', 'deploy', 'test', 'fix'
    ];
    
    const isImportant = importantPatterns.some(pattern => 
      command.toLowerCase().includes(pattern)
    );
    
    if (!isImportant) {
      return NextResponse.json({ 
        success: true, 
        message: 'Command not important enough to save' 
      });
    }
    
    // Extract command type
    const commandType = command.split(' ')[0];
    const tags = [];
    
    if (command.includes('git')) tags.push('Git');
    if (command.includes('npm')) tags.push('NPM');
    if (command.includes('prisma')) tags.push('Database');
    if (command.includes('test')) tags.push('Testing');
    if (command.includes('build')) tags.push('Build');
    
    // Save to memory
    await saveConversationToMemory(
      `cli_${Date.now()}`,
      [
        `Command: ${command}`,
        `Directory: ${cwd}`,
        `Exit Code: ${exitCode}`,
        `Timestamp: ${timestamp}`,
        output ? `Output Preview: ${output.substring(0, 200)}...` : ''
      ].filter(Boolean),
      ['DevWorkflow', ...tags]
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Command saved to memory'
    });
    
  } catch (error) {
    console.error('[CLI Memory] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save command' },
      { status: 500 }
    );
  }
}