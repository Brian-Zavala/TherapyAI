// @ts-nocheck
/**
 * Therapy Insights Generator
 * Analyzes all available metrics and data to generate personalized,
 * actionable insights and recommendations for users
 */

import { prisma } from '@/lib/prisma-optimized';

export interface TherapyInsight {
  id: string;
  category: 'communication' | 'emotional' | 'behavioral' | 'mental-health' | 'relationship' | 'progress';
  title: string;
  description: string;
  actionItems: string[];
  priority: 'high' | 'medium' | 'low';
  basedOn: string[]; // What data points this insight is based on
  mentalHealthTips?: string[];
  resources?: {
    title: string;
    description: string;
    type: 'exercise' | 'article' | 'technique' | 'practice';
  }[];
  timeframe?: 'immediate' | 'this-week' | 'this-month';
  celebrationType?: 'improvement' | 'milestone' | 'consistency';
}

export interface ComprehensiveInsights {
  insights: TherapyInsight[];
  summary: {
    overallProgress: 'excellent' | 'good' | 'moderate' | 'needs-attention';
    topStrengths: string[];
    focusAreas: string[];
    weeklyGoals: string[];
  };
  trends: {
    communication: 'improving' | 'stable' | 'declining';
    emotional: 'improving' | 'stable' | 'declining';
    consistency: 'excellent' | 'good' | 'needs-improvement';
  };
  personalizedTips: {
    daily: string[];
    weekly: string[];
    exercises: string[];
  };
}

export class TherapyInsightsGenerator {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async generateComprehensiveInsights(): Promise<ComprehensiveInsights> {
    // Fetch all relevant data
    const [
      progressData,
      communicationMetrics,
      sessions,
      userProfile,
      assessments,
      transcriptAnalysis
    ] = await Promise.all([
      this.getProgressData(),
      this.getCommunicationMetrics(),
      this.getSessionData(),
      this.getUserProfile(),
      this.getAssessmentData(),
      this.getTranscriptAnalysis()
    ]);

    // Generate insights from each data source
    const insights: TherapyInsight[] = [];
    
    // Communication Insights
    insights.push(...this.generateCommunicationInsights(communicationMetrics, transcriptAnalysis));
    
    // Progress Insights
    insights.push(...this.generateProgressInsights(progressData));
    
    // Session Pattern Insights
    insights.push(...this.generateSessionPatternInsights(sessions));
    
    // Emotional Connection Insights
    insights.push(...this.generateEmotionalInsights(progressData, communicationMetrics));
    
    // Mental Health & Self-Care Insights
    insights.push(...this.generateMentalHealthInsights(userProfile, sessions, progressData));
    
    // Relationship Enhancement Insights
    insights.push(...this.generateRelationshipInsights(assessments, progressData, communicationMetrics));

    // Sort by priority
    insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Generate summary and trends
    const summary = this.generateSummary(insights, progressData, sessions);
    const trends = this.analyzeTrends(progressData, communicationMetrics, sessions);
    const personalizedTips = this.generatePersonalizedTips(insights, userProfile, progressData);

    return {
      insights: insights.slice(0, 10), // Top 10 most relevant insights
      summary,
      trends,
      personalizedTips
    };
  }

  private generateCommunicationInsights(metrics: any[], transcripts: any): TherapyInsight[] {
    const insights: TherapyInsight[] = [];
    
    if (metrics.length === 0) return insights;

    const latestMetrics = metrics[0];
    // Map communicationMetric fields to communication concepts
    const avgClarity = metrics.reduce((sum, m) => sum + (m.clarity || 50), 0) / metrics.length;
    const avgEmpathy = metrics.reduce((sum, m) => sum + (m.empathy || 50), 0) / metrics.length;
    const avgExpression = metrics.reduce((sum, m) => sum + (m.expression || 50), 0) / metrics.length;

    // Low clarity insight
    if (avgClarity < 70) {
      insights.push({
        id: 'comm-clarity',
        category: 'communication',
        title: 'Enhance Communication Clarity',
        description: `Your communication clarity score averages ${Math.round(avgClarity)}%. Clear communication is the foundation of healthy relationships.`,
        actionItems: [
          'Use "I feel" statements instead of "you always/never"',
          'Pause and organize thoughts before speaking in heated moments',
          'Ask "What I heard you say is... Is that correct?" to verify understanding',
          'Practice the STOP technique: Stop, Take a breath, Observe your feelings, Proceed mindfully'
        ],
        priority: 'high',
        basedOn: ['Communication clarity scores across sessions'],
        mentalHealthTips: [
          'Journaling before difficult conversations can help clarify your thoughts',
          'Practice mindful breathing to stay centered during discussions'
        ],
        resources: [{
          title: 'Active Listening Exercise',
          description: 'A 5-minute daily practice where partners take turns speaking for 2 minutes while the other listens without interrupting',
          type: 'exercise'
        }],
        timeframe: 'immediate'
      });
    }

    // High empathy celebration
    if (avgEmpathy > 80) {
      insights.push({
        id: 'comm-empathy-strength',
        category: 'communication',
        title: 'Empathy is Your Superpower!',
        description: `Your empathy score of ${Math.round(avgEmpathy)}% shows exceptional emotional attunement. This is a relationship strength to build upon.`,
        actionItems: [
          'Model empathetic responses for your partner',
          'Share how empathy has helped in specific situations',
          'Use your empathy to navigate difficult conversations',
          'Teach empathy techniques to family members'
        ],
        priority: 'low',
        basedOn: ['High empathy scores consistently'],
        celebrationType: 'improvement',
        timeframe: 'this-week'
      });
    }

    // Expression needs improvement
    if (avgExpression < 60) {
      insights.push({
        id: 'comm-expression',
        category: 'communication',
        title: 'Express Your Needs More Clearly',
        description: 'Your sessions show hesitation in expressing personal needs. This is common but can lead to resentment over time.',
        actionItems: [
          'Write down your needs before conversations',
          'Practice expressing one small need daily',
          'Use the format: "I need [specific action] because [reason]"',
          'Start with low-stakes requests to build confidence'
        ],
        priority: 'medium',
        basedOn: ['Expression scores in communication metrics'],
        mentalHealthTips: [
          'Remember: Your needs are valid and deserve to be heard',
          'Self-advocacy is a form of self-care, not selfishness'
        ],
        timeframe: 'this-week'
      });
    }

    return insights;
  }

  private generateProgressInsights(progressData: any[]): TherapyInsight[] {
    const insights: TherapyInsight[] = [];
    
    if (progressData.length < 2) return insights;

    // Calculate trends
    const recentData = progressData.slice(-5);
    const closenessImprovement = recentData[recentData.length - 1].closenessScore - recentData[0].closenessScore;
    const commImprovement = recentData[recentData.length - 1].communicationScore - recentData[0].communicationScore;

    // Significant improvement
    if (closenessImprovement > 10) {
      insights.push({
        id: 'progress-closeness',
        category: 'progress',
        title: '🎉 Emotional Connection Breakthrough!',
        description: `Your emotional closeness has improved by ${Math.round(closenessImprovement)}% recently. This shows your efforts are creating real change.`,
        actionItems: [
          'Continue daily appreciation practices',
          'Schedule weekly quality time without distractions',
          'Share what specific actions have helped you feel closer',
          'Document this progress in a gratitude journal'
        ],
        priority: 'medium',
        basedOn: ['Closeness score improvements'],
        celebrationType: 'improvement',
        mentalHealthTips: [
          'Celebrate small wins - they compound into major transformations',
          'Share this success with your partner to reinforce positive patterns'
        ]
      });
    }

    // Stagnation insight
    if (Math.abs(closenessImprovement) < 2 && Math.abs(commImprovement) < 2 && progressData.length > 5) {
      insights.push({
        id: 'progress-plateau',
        category: 'behavioral',
        title: 'Break Through the Plateau',
        description: 'Your progress has plateaued recently. This is normal and often precedes breakthroughs.',
        actionItems: [
          'Try a new communication exercise this week',
          'Discuss with your partner what might be holding you back',
          'Consider addressing a topic you\'ve been avoiding',
          'Mix up your routine with a surprise date or activity'
        ],
        priority: 'high',
        basedOn: ['Stable scores over multiple sessions'],
        resources: [{
          title: 'The 36 Questions Exercise',
          description: 'Scientifically designed questions to deepen intimacy and break routine',
          type: 'exercise'
        }],
        timeframe: 'immediate'
      });
    }

    return insights;
  }

  private generateSessionPatternInsights(sessions: any[]): TherapyInsight[] {
    const insights: TherapyInsight[] = [];
    
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const recentSessions = completedSessions.filter(s => new Date(s.startTime) > lastMonth);

    // Consistency insight
    if (recentSessions.length >= 4) {
      insights.push({
        id: 'pattern-consistency',
        category: 'behavioral',
        title: 'Excellent Therapy Consistency!',
        description: `You've completed ${recentSessions.length} sessions this month. Consistency is key to lasting change.`,
        actionItems: [
          'Keep your current schedule - it\'s working!',
          'Prepare discussion topics before each session',
          'Track your mood before and after sessions',
          'Share consistency wins with your support network'
        ],
        priority: 'low',
        basedOn: ['Session frequency data'],
        celebrationType: 'consistency',
        mentalHealthTips: [
          'Routine creates safety in relationships',
          'Your commitment is already 80% of the success'
        ]
      });
    }

    // Session timing patterns
    const sessionTimes = completedSessions.map(s => new Date(s.date).getHours());
    const avgTime = sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length;
    
    if (avgTime > 20) { // Evening sessions
      insights.push({
        id: 'pattern-timing',
        category: 'mental-health',
        title: 'Optimize Your Session Timing',
        description: 'Your evening sessions might be affected by daily fatigue. Consider earlier times for clearer communication.',
        actionItems: [
          'Try one morning or afternoon session',
          'Avoid heavy meals before sessions',
          'Do 5 minutes of energizing breathing before starting',
          'Keep a session energy journal to find your optimal time'
        ],
        priority: 'low',
        basedOn: ['Session timing analysis'],
        timeframe: 'this-month'
      });
    }

    return insights;
  }

  private generateEmotionalInsights(progressData: any[], communicationMetrics: any[]): TherapyInsight[] {
    const insights: TherapyInsight[] = [];
    
    // Analyze emotional patterns
    const recentProgress = progressData.slice(-3);
    const avgCloseness = recentProgress.reduce((sum, p) => sum + p.closenessScore, 0) / recentProgress.length;
    
    if (avgCloseness < 60) {
      insights.push({
        id: 'emotional-distance',
        category: 'emotional',
        title: 'Rebuild Emotional Intimacy',
        description: 'Emotional distance is common during challenging times. Small, consistent efforts can bridge this gap.',
        actionItems: [
          'Share one vulnerable thought daily with your partner',
          'Implement a 6-second hug ritual (releases oxytocin)',
          'Create a "no phones" hour each evening for connection',
          'Practice eye contact during conversations',
          'Express gratitude for three specific things daily'
        ],
        priority: 'high',
        basedOn: ['Low emotional closeness scores'],
        mentalHealthTips: [
          'Vulnerability is the birthplace of intimacy',
          'Physical touch releases bonding hormones',
          'Start small - consistency matters more than intensity'
        ],
        resources: [{
          title: 'Daily Connection Ritual',
          description: 'A 10-minute evening practice: 5 minutes sharing highlights, 5 minutes appreciations',
          type: 'practice'
        }],
        timeframe: 'immediate'
      });
    }

    return insights;
  }

  private generateMentalHealthInsights(userProfile: any, sessions: any[], progressData: any[]): TherapyInsight[] {
    const insights: TherapyInsight[] = [];
    
    // Stress management based on concerns
    if (userProfile?.currentConcerns?.includes('stress') || userProfile?.currentConcerns?.includes('anxiety')) {
      insights.push({
        id: 'mh-stress',
        category: 'mental-health',
        title: 'Stress is Affecting Your Relationship',
        description: 'High stress levels can create tension and miscommunication. Managing stress together strengthens bonds.',
        actionItems: [
          'Practice couples meditation 10 minutes daily',
          'Take evening walks together (movement + connection)',
          'Create a "worry window" - 15 minutes to discuss stressors',
          'Learn and practice progressive muscle relaxation together',
          'Establish a calming bedtime routine'
        ],
        priority: 'high',
        basedOn: ['User indicated stress/anxiety concerns'],
        mentalHealthTips: [
          'Stress is contagious - but so is calm',
          'Co-regulation: Your calm nervous system helps regulate your partner\'s',
          'Exercise together releases endorphins and strengthens partnership'
        ],
        resources: [{
          title: 'Box Breathing Technique',
          description: 'Breathe in 4, hold 4, out 4, hold 4. Repeat 4 times. Do together during tense moments.',
          type: 'technique'
        }],
        timeframe: 'immediate'
      });
    }

    // Self-care reminder
    const avgProgress = progressData.reduce((sum, p) => sum + p.communicationScore, 0) / progressData.length;
    if (avgProgress < 70) {
      insights.push({
        id: 'mh-selfcare',
        category: 'mental-health',
        title: 'Prioritize Individual Self-Care',
        description: 'You can\'t pour from an empty cup. Individual wellness strengthens relationship health.',
        actionItems: [
          'Schedule "me time" without guilt',
          'Identify three personal stress-relief activities',
          'Communicate self-care needs to your partner',
          'Support each other\'s individual growth',
          'Practice saying "I need a break" when overwhelmed'
        ],
        priority: 'medium',
        basedOn: ['Overall communication patterns suggesting burnout'],
        mentalHealthTips: [
          'Self-care isn\'t selfish - it\'s necessary for sustainable relationships',
          'Model healthy boundaries for your family',
          'Rest is productive for emotional regulation'
        ],
        timeframe: 'this-week'
      });
    }

    return insights;
  }

  private generateRelationshipInsights(assessments: any[], progressData: any[], communicationMetrics: any[]): TherapyInsight[] {
    const insights: TherapyInsight[] = [];
    
    // Conflict resolution patterns (using respect metric)
    const avgRespect = communicationMetrics.reduce((sum, m) => sum + (m.respect || 50), 0) / communicationMetrics.length;
    
    if (avgRespect < 65) {
      insights.push({
        id: 'rel-conflict',
        category: 'relationship',
        title: 'Transform Conflict into Connection',
        description: 'Your conflict resolution could be more respectful. Healthy conflict actually strengthens relationships.',
        actionItems: [
          'Implement a 24-hour pause rule for big decisions',
          'Use "time-outs" when emotions run high',
          'Focus on the problem, not the person',
          'Find one thing to agree on in every disagreement',
          'End conflicts with affection, even if unresolved'
        ],
        priority: 'high',
        basedOn: ['Respect scores during conflicts'],
        mentalHealthTips: [
          'Conflict is inevitable; harm is optional',
          'The goal isn\'t to win, but to understand',
          'Repair attempts matter more than perfect communication'
        ],
        resources: [{
          title: 'Fair Fighting Rules',
          description: 'Establish ground rules: No name-calling, stay present-focused, one issue at a time',
          type: 'technique'
        }],
        timeframe: 'immediate'
      });
    }

    // Trust building
    if (assessments.some(a => a.trustScore < 70)) {
      insights.push({
        id: 'rel-trust',
        category: 'relationship',
        title: 'Rebuild Trust Through Consistency',
        description: 'Trust is built in drops and lost in buckets. Small, consistent actions rebuild it fastest.',
        actionItems: [
          'Follow through on all promises, no matter how small',
          'Share your daily schedule openly',
          'Admit mistakes quickly and fully',
          'Create transparency rituals (phone sharing, calendar sync)',
          'Celebrate trust victories together'
        ],
        priority: 'high',
        basedOn: ['Trust assessment scores'],
        mentalHealthTips: [
          'Trust yourself to handle whatever comes',
          'Healing happens at the speed of trust',
          'Vulnerability accelerates trust building'
        ],
        timeframe: 'this-month'
      });
    }

    return insights;
  }

  private generateSummary(insights: TherapyInsight[], progressData: any[], sessions: any[]) {
    const hasHighPriorityInsights = insights.some(i => i.priority === 'high');
    const hasCelebrations = insights.some(i => i.celebrationType);
    
    let overallProgress: ComprehensiveInsights['summary']['overallProgress'] = 'moderate';
    if (hasCelebrations && !hasHighPriorityInsights) overallProgress = 'excellent';
    else if (hasCelebrations) overallProgress = 'good';
    else if (hasHighPriorityInsights) overallProgress = 'needs-attention';

    const topStrengths = insights
      .filter(i => i.celebrationType)
      .map(i => i.title.replace('🎉 ', '').replace('!', ''))
      .slice(0, 3);

    const focusAreas = insights
      .filter(i => i.priority === 'high')
      .map(i => i.title)
      .slice(0, 3);

    const weeklyGoals = insights
      .filter(i => i.timeframe === 'immediate' || i.timeframe === 'this-week')
      .flatMap(i => i.actionItems.slice(0, 1))
      .slice(0, 4);

    return {
      overallProgress,
      topStrengths: topStrengths.length > 0 ? topStrengths : ['Commitment to therapy', 'Willingness to grow'],
      focusAreas: focusAreas.length > 0 ? focusAreas : ['Continue your journey'],
      weeklyGoals: weeklyGoals.length > 0 ? weeklyGoals : ['Attend your next session', 'Practice one new technique']
    };
  }

  private analyzeTrends(progressData: any[], communicationMetrics: any[], sessions: any[]) {
    const recentProgress = progressData.slice(-5);
    const olderProgress = progressData.slice(-10, -5);
    
    let communicationTrend: ComprehensiveInsights['trends']['communication'] = 'stable';
    let emotionalTrend: ComprehensiveInsights['trends']['emotional'] = 'stable';
    
    if (recentProgress.length > 0 && olderProgress.length > 0) {
      const recentCommAvg = recentProgress.reduce((sum, p) => sum + p.communicationScore, 0) / recentProgress.length;
      const olderCommAvg = olderProgress.reduce((sum, p) => sum + p.communicationScore, 0) / olderProgress.length;
      
      if (recentCommAvg > olderCommAvg + 5) communicationTrend = 'improving';
      else if (recentCommAvg < olderCommAvg - 5) communicationTrend = 'declining';
      
      const recentEmotionalAvg = recentProgress.reduce((sum, p) => sum + p.closenessScore, 0) / recentProgress.length;
      const olderEmotionalAvg = olderProgress.reduce((sum, p) => sum + p.closenessScore, 0) / olderProgress.length;
      
      if (recentEmotionalAvg > olderEmotionalAvg + 5) emotionalTrend = 'improving';
      else if (recentEmotionalAvg < olderEmotionalAvg - 5) emotionalTrend = 'declining';
    }

    const completedSessions = sessions.filter(s => s.status === 'completed');
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const recentSessions = completedSessions.filter(s => new Date(s.startTime) > lastMonth);
    
    let consistency: ComprehensiveInsights['trends']['consistency'] = 'needs-improvement';
    if (recentSessions.length >= 4) consistency = 'excellent';
    else if (recentSessions.length >= 2) consistency = 'good';

    return {
      communication: communicationTrend,
      emotional: emotionalTrend,
      consistency
    };
  }

  private generatePersonalizedTips(insights: TherapyInsight[], userProfile: any, progressData: any[]) {
    const daily: string[] = [];
    const weekly: string[] = [];
    const exercises: string[] = [];

    // Daily tips based on insights
    if (insights.some(i => i.id === 'comm-clarity')) {
      daily.push('Practice one "I feel" statement today');
    }
    if (insights.some(i => i.id === 'emotional-distance')) {
      daily.push('Share one appreciation before bed');
    }
    daily.push('Take three deep breaths before responding in tense moments');
    daily.push('Notice and acknowledge your partner\'s efforts');

    // Weekly tips
    weekly.push('Schedule one hour of quality time without devices');
    weekly.push('Have a relationship check-in conversation');
    weekly.push('Try one new communication technique from your insights');
    weekly.push('Practice gratitude journaling about your relationship');

    // Exercises based on weak areas
    const avgComm = progressData.reduce((sum, p) => sum + p.communicationScore, 0) / progressData.length;
    if (avgComm < 70) {
      exercises.push('Mirror Exercise: Repeat back what you hear before responding');
    }
    
    const avgCloseness = progressData.reduce((sum, p) => sum + p.closenessScore, 0) / progressData.length;
    if (avgCloseness < 70) {
      exercises.push('Soul Gazing: 4 minutes of silent eye contact to build intimacy');
    }
    
    exercises.push('Weekly Appreciation Ritual: Share 5 things you appreciate about each other');
    exercises.push('Stress-Reducing Breathwork: Practice together when tensions arise');

    return {
      daily: daily.slice(0, 3),
      weekly: weekly.slice(0, 3),
      exercises: exercises.slice(0, 3)
    };
  }

  // Data fetching methods
  private async getProgressData() {
    return prisma.progressTracking.findMany({
      where: { userId: this.userId },
      orderBy: { date: 'desc' },
      take: 20
    });
  }

  private async getCommunicationMetrics() {
    const sessions = await prisma.session.findMany({
      where: { userId: this.userId, status: 'COMPLETED' },
      select: { id: true },
      orderBy: { startTime: 'desc' },
      take: 10
    });

    const metrics = await prisma.communicationMetric.findMany({
      where: { sessionId: { in: sessions.map(s => s.id) } },
      orderBy: { timestamp: 'desc' }
    });

    return metrics;
  }

  private async getSessionData() {
    return prisma.session.findMany({
      where: { userId: this.userId },
      orderBy: { startTime: 'desc' },
      take: 30
    });
  }

  private async getUserProfile() {
    const user = await prisma.user.findUnique({
      where: { id: this.userId },
      include: { profile: true }
    });
    return user?.profile;
  }

  private async getAssessmentData() {
    // This would fetch assessment data if stored separately
    // For now, returning empty array as assessments are in progress tracking
    return [];
  }

  private async getTranscriptAnalysis() {
    // Get aggregated transcript analysis
    const recentSessions = await prisma.session.findMany({
      where: { userId: this.userId, status: 'COMPLETED' },
      select: { id: true },
      orderBy: { startTime: 'desc' },
      take: 5
    });

    // In the future, this would include sentiment analysis
    // For now, return basic structure
    return {
      sessionCount: recentSessions.length,
      avgSentiment: 'neutral'
    };
  }
}

// Export the function that the route expects
export async function generateTherapyInsights({ 
  userId, 
  sessions, 
  userProfile 
}: { 
  sessions?: any; 
  userProfile?: any; 
  userId: string 
}): Promise<ComprehensiveInsights> {
  // If we have pre-fetched data, use it directly instead of querying again
  const generator = new TherapyInsightsGenerator(userId);
  
  // Override the internal data fetching methods if data is provided
  if (sessions || userProfile) {
    const progressData = await generator['getProgressData']();
    const communicationMetrics = sessions?.flatMap((s: any) => s.communicationMetrics || []) || [];
    const assessments = await generator['getAssessmentData']();
    const transcriptAnalysis = {
      sessionCount: sessions?.length || 0,
      avgSentiment: 'neutral'
    };
    
    // Generate insights using the provided data
    const insights: TherapyInsight[] = [];
    
    // Use the private methods but with our data
    insights.push(...generator['generateCommunicationInsights'](communicationMetrics, transcriptAnalysis));
    insights.push(...generator['generateProgressInsights'](progressData));
    insights.push(...generator['generateSessionPatternInsights'](sessions || []));
    insights.push(...generator['generateEmotionalInsights'](progressData, communicationMetrics));
    insights.push(...generator['generateMentalHealthInsights'](userProfile, sessions || [], progressData));
    insights.push(...generator['generateRelationshipInsights'](assessments, progressData, communicationMetrics));
    
    // Sort by priority
    insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    // Generate summary and trends
    const summary = generator['generateSummary'](insights, progressData, sessions || []);
    const trends = generator['analyzeTrends'](progressData, communicationMetrics, sessions || []);
    const personalizedTips = generator['generatePersonalizedTips'](insights, userProfile, progressData);
    
    return {
      insights: insights.slice(0, 10),
      summary,
      trends,
      personalizedTips
    };
  }
  
  // Fall back to original implementation if no data provided
  return generator.generateComprehensiveInsights();
}