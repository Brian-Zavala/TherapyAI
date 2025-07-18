export interface Session {
    id: string;
    userId: string;
    date: string;
    duration: number; // in minutes
    theme: string;
    notes?: string;
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'ACTIVE' | 'PAUSED' | 'TERMINATED' | 'ABANDONED' | 'TECHNICAL_ISSUE';
  }
  
  export interface CommunicationMetric {
    category: string;
    value: number;
    description: string;
  }
  
  export interface ProgressDataPoint {
    date: string;
    closenessScore: number;
    communicationScore: number;
  }