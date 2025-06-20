// Mock VAPI implementation for demo mode
import { VapiInterface } from './vapi-factory';
import { demoConfig } from '@/config/demo.config';

export class DemoVapi implements VapiInterface {
  private eventHandlers: Map<string, Function[]> = new Map();
  private isActive = false;
  private conversationInterval?: NodeJS.Timeout;
  private currentScenario: any;
  private responseIndex = 0;

  async start(assistantId?: string) {
    console.log('🎭 Starting demo VAPI session');
    this.isActive = true;
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Emit call start event
    this.emit('call-start', {
      type: 'call-start',
      timestamp: new Date().toISOString(),
      assistantId: assistantId || 'demo-assistant'
    });

    // Start simulating conversation
    this.startConversationSimulation();

    return { status: 'connected', mode: 'demo' };
  }

  stop() {
    console.log('🎭 Stopping demo VAPI session');
    this.isActive = false;
    
    if (this.conversationInterval) {
      clearInterval(this.conversationInterval);
    }

    this.emit('call-end', {
      type: 'call-end',
      timestamp: new Date().toISOString(),
      duration: 300 // 5 minutes in seconds
    });

    this.eventHandlers.clear();
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  removeAllListeners() {
    this.eventHandlers.clear();
  }

  send(message: any) {
    console.log('🎭 Demo VAPI received message:', message);
    
    // Simulate processing the user's message
    if (message.type === 'add-message' && message.message) {
      setTimeout(() => {
        this.processUserMessage(message.message.content);
      }, 500);
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in demo event handler for ${event}:`, error);
      }
    });
  }

  private startConversationSimulation() {
    // Emit initial speech events
    setTimeout(() => {
      this.emit('speech-start', {
        type: 'speech-start',
        timestamp: new Date().toISOString()
      });

      // Send greeting
      this.emit('transcript', {
        type: 'transcript',
        transcript: {
          id: 'demo-1',
          assistant: "Hello! I'm here to help you and your partner communicate better. This is a 5-minute demo session. What brings you here today?",
          user: '',
          timestamp: new Date().toISOString()
        }
      });

      this.emit('speech-end', {
        type: 'speech-end',
        timestamp: new Date().toISOString()
      });
    }, 1500);
  }

  private processUserMessage(userMessage: string) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Find matching scenario
    let selectedScenario = demoConfig.mockData.scenarios.find(scenario =>
      scenario.triggers.some(trigger => lowerMessage.includes(trigger))
    );

    if (!selectedScenario) {
      // Use default responses
      const response = demoConfig.mockData.defaultResponses[
        Math.floor(Math.random() * demoConfig.mockData.defaultResponses.length)
      ];
      this.sendAssistantResponse(response);
      return;
    }

    // Use scenario-specific response
    const responses = selectedScenario.responses;
    const response = responses[this.responseIndex % responses.length];
    this.responseIndex++;
    
    this.sendAssistantResponse(response);
  }

  private sendAssistantResponse(response: string) {
    // Simulate thinking time
    setTimeout(() => {
      this.emit('speech-start', {
        type: 'speech-start',
        timestamp: new Date().toISOString()
      });

      // Simulate gradual speech
      const words = response.split(' ');
      let currentText = '';
      
      words.forEach((word, index) => {
        setTimeout(() => {
          currentText += (currentText ? ' ' : '') + word;
          
          this.emit('transcript', {
            type: 'transcript',
            transcript: {
              id: `demo-${Date.now()}`,
              assistant: currentText,
              user: '',
              timestamp: new Date().toISOString()
            }
          });

          if (index === words.length - 1) {
            this.emit('speech-end', {
              type: 'speech-end',
              timestamp: new Date().toISOString()
            });
          }
        }, index * 100); // 100ms per word for natural pacing
      });
    }, demoConfig.mockData.responseDelay);
  }

  // Additional demo-specific methods
  getDemoMetrics() {
    return {
      messagesExchanged: this.responseIndex * 2,
      duration: 300, // seconds
      scenario: this.currentScenario?.name || 'General',
      satisfaction: 4.5
    };
  }
}