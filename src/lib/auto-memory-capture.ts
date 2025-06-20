/**
 * Automatic Memory Capture System
 * Captures and saves important interactions automatically
 */

import { saveConversationToMemory } from './mcp-memory-context';

interface CommandMemory {
  command: string;
  output?: string;
  context?: string;
  timestamp: Date;
  tags: string[];
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class AutoMemoryCapture {
  private conversationBuffer: ConversationTurn[] = [];
  private commandHistory: CommandMemory[] = [];
  private saveTimer: NodeJS.Timeout | null = null;
  private conversationId: string;
  
  constructor() {
    this.conversationId = `session_${Date.now()}`;
    this.setupAutoSave();
  }
  
  // Capture CLI commands
  captureCommand(command: string, output?: string, context?: string) {
    const cmdMemory: CommandMemory = {
      command,
      output,
      context,
      timestamp: new Date(),
      tags: this.extractCommandTags(command)
    };
    
    this.commandHistory.push(cmdMemory);
    
    // Auto-save important commands
    if (this.isImportantCommand(command)) {
      this.saveCommandToMemory(cmdMemory);
    }
  }
  
  // Capture conversation turns
  captureConversation(role: 'user' | 'assistant', content: string) {
    this.conversationBuffer.push({
      role,
      content,
      timestamp: new Date()
    });
    
    // Reset save timer
    this.scheduleSave();
  }
  
  // Extract tags from commands
  private extractCommandTags(command: string): string[] {
    const tags: string[] = [];
    
    // Git commands
    if (command.includes('git')) tags.push('git', 'version-control');
    if (command.includes('commit')) tags.push('commit');
    if (command.includes('push')) tags.push('deployment');
    
    // NPM commands
    if (command.includes('npm')) tags.push('npm', 'dependencies');
    if (command.includes('install')) tags.push('installation');
    if (command.includes('build')) tags.push('build');
    if (command.includes('dev')) tags.push('development');
    
    // Database commands
    if (command.includes('prisma')) tags.push('database', 'prisma');
    if (command.includes('migrate')) tags.push('migration');
    
    // Testing
    if (command.includes('test')) tags.push('testing');
    if (command.includes('lint')) tags.push('linting');
    if (command.includes('typecheck')) tags.push('typescript');
    
    return tags;
  }
  
  // Determine if command is important enough to save
  private isImportantCommand(command: string): boolean {
    const importantPatterns = [
      'npm install',
      'npm run build',
      'prisma',
      'git commit',
      'git push',
      'deploy',
      'migrate',
      'test',
      'fix',
      'error'
    ];
    
    return importantPatterns.some(pattern => 
      command.toLowerCase().includes(pattern)
    );
  }
  
  // Save command to memory
  private async saveCommandToMemory(cmd: CommandMemory) {
    const summary = [
      `Command: ${cmd.command}`,
      cmd.output ? `Output: ${cmd.output.substring(0, 200)}...` : '',
      cmd.context ? `Context: ${cmd.context}` : '',
      `Tags: ${cmd.tags.join(', ')}`
    ].filter(Boolean);
    
    try {
      await saveConversationToMemory(
        `cmd_${Date.now()}`,
        summary,
        ['DevWorkflow', 'Commands']
      );
    } catch (error) {
      console.error('[AutoMemory] Failed to save command:', error);
    }
  }
  
  // Setup automatic save
  private setupAutoSave() {
    // Save conversation every 5 minutes or when buffer reaches 10 turns
    setInterval(() => {
      if (this.conversationBuffer.length >= 10) {
        this.saveConversation();
      }
    }, 300000); // 5 minutes
  }
  
  // Schedule save with debouncing
  private scheduleSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      if (this.conversationBuffer.length >= 20) {
        this.saveConversation();
      }
    }, 60000); // 1 minute after last activity
  }
  
  // Save conversation to memory
  private async saveConversation() {
    if (this.conversationBuffer.length === 0) return;
    
    // Summarize conversation
    const summary = this.summarizeConversation();
    const topics = this.extractTopics();
    const relatedEntities = this.identifyRelatedEntities();
    
    try {
      await saveConversationToMemory(
        this.conversationId,
        [
          `Topics: ${topics.join(', ')}`,
          ...summary,
          `Commands used: ${this.commandHistory.length}`,
          `Duration: ${this.getConversationDuration()} minutes`
        ],
        relatedEntities
      );
      
      // Clear buffer after successful save
      this.conversationBuffer = [];
      this.commandHistory = [];
      
      // Generate new conversation ID
      this.conversationId = `session_${Date.now()}`;
      
    } catch (error) {
      console.error('[AutoMemory] Failed to save conversation:', error);
    }
  }
  
  // Summarize conversation using key points
  private summarizeConversation(): string[] {
    const summary: string[] = [];
    
    // Find questions and their answers
    for (let i = 0; i < this.conversationBuffer.length - 1; i++) {
      const turn = this.conversationBuffer[i];
      const nextTurn = this.conversationBuffer[i + 1];
      
      if (turn.role === 'user' && nextTurn.role === 'assistant') {
        // Extract key question-answer pairs
        if (this.isImportantExchange(turn.content, nextTurn.content)) {
          summary.push(`Q: ${turn.content.substring(0, 100)}...`);
          summary.push(`A: ${nextTurn.content.substring(0, 200)}...`);
        }
      }
    }
    
    return summary.slice(0, 5); // Keep top 5 exchanges
  }
  
  // Extract main topics from conversation
  private extractTopics(): string[] {
    const allText = this.conversationBuffer
      .map(turn => turn.content)
      .join(' ')
      .toLowerCase();
    
    const topics: Set<string> = new Set();
    
    // Technical topics
    if (allText.includes('vapi')) topics.add('VAPI');
    if (allText.includes('auth')) topics.add('Authentication');
    if (allText.includes('error')) topics.add('Error-Handling');
    if (allText.includes('session')) topics.add('Sessions');
    if (allText.includes('hook')) topics.add('React-Hooks');
    if (allText.includes('memory')) topics.add('MCP-Memory');
    if (allText.includes('database')) topics.add('Database');
    if (allText.includes('deploy')) topics.add('Deployment');
    
    return Array.from(topics);
  }
  
  // Identify related entities in the knowledge graph
  private identifyRelatedEntities(): string[] {
    const entities: Set<string> = new Set();
    const allText = this.conversationBuffer
      .map(turn => turn.content)
      .join(' ')
      .toLowerCase();
    
    // Check for mentions of known entities
    if (allText.includes('hook')) entities.add('RefactoredHooks');
    if (allText.includes('error') || allText.includes('issue')) entities.add('CommonIssues');
    if (allText.includes('config')) entities.add('CriticalConfig');
    if (allText.includes('vapi') || allText.includes('voice')) entities.add('VoiceTherapySessions');
    if (allText.includes('workflow') || allText.includes('command')) entities.add('DevWorkflow');
    
    return Array.from(entities);
  }
  
  // Check if exchange is important
  private isImportantExchange(question: string, answer: string): boolean {
    const importantKeywords = [
      'how', 'why', 'what', 'fix', 'error', 'issue', 'implement',
      'setup', 'configure', 'debug', 'solve', 'work'
    ];
    
    return importantKeywords.some(keyword => 
      question.toLowerCase().includes(keyword)
    );
  }
  
  // Get conversation duration
  private getConversationDuration(): number {
    if (this.conversationBuffer.length < 2) return 0;
    
    const start = this.conversationBuffer[0].timestamp;
    const end = this.conversationBuffer[this.conversationBuffer.length - 1].timestamp;
    
    return Math.round((end.getTime() - start.getTime()) / 60000); // minutes
  }
  
  // Force save current conversation
  async flush() {
    await this.saveConversation();
  }
}

// Global instance
export const autoMemory = new AutoMemoryCapture();