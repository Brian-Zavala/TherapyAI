/**
 * Intelligent Recurring Session Engine
 * Handles sophisticated recurring session scheduling with user preferences and conflict detection
 */

import { prisma } from '@/lib/prisma-optimized';
import { Logger } from './logging';
import { CalendarIntegrationService } from './calendar-integration';
import { z } from 'zod';

// Recurring pattern schema
const RecurringPatternSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'custom']),
  interval: z.number().default(1),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0=Sunday, 6=Saturday
  dayOfMonth: z.number().min(1).max(31).optional(),
  endType: z.enum(['never', 'after_count', 'on_date']),
  endCount: z.number().optional(),
  endDate: z.date().optional(),
  timeZone: z.string().default('UTC'),
  skipHolidays: z.boolean().default(false),
  skipWeekends: z.boolean().default(false),
  preferredTimeSlots: z.array(z.object({
    startTime: z.string(), // HH:MM format
    endTime: z.string(),
    dayOfWeek: z.number().min(0).max(6).optional()
  })).optional()
});

export type RecurringPattern = z.infer<typeof RecurringPatternSchema>;

// Session template schema
const SessionTemplateSchema = z.object({
  duration: z.number().default(60),
  theme: z.string().default('AI Therapy Session'),
  notes: z.string().optional(),
  therapyType: z.string().default('couple'),
  assistantId: z.string().optional(),
  autoConfirm: z.boolean().default(true),
  allowRescheduling: z.boolean().default(true),
  reminderSettings: z.object({
    enabled: z.boolean().default(true),
    timings: z.array(z.string()).default(['24_hours', '1_hour'])
  }).optional()
});

export type SessionTemplate = z.infer<typeof SessionTemplateSchema>;

// Recurring session series schema
const RecurringSeriesSchema = z.object({
  id: z.string(),
  userId: z.string(),
  pattern: RecurringPatternSchema,
  template: SessionTemplateSchema,
  status: z.enum(['active', 'paused', 'completed', 'cancelled']),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastGenerated: z.date().optional(),
  nextDue: z.date().optional(),
  totalSessions: z.number().default(0),
  completedSessions: z.number().default(0),
  metadata: z.record(z.any()).optional()
});

export type RecurringSeries = z.infer<typeof RecurringSeriesSchema>;

export class RecurringSessionEngine {
  private logger: Logger;
  private calendarService: CalendarIntegrationService;

  constructor() {
    this.logger = new Logger('RecurringSessionEngine');
    this.calendarService = new CalendarIntegrationService();
  }

  /**
   * Create intelligent recurring session series based on user preferences
   */
  public async createRecurringSeries(
    userId: string,
    baseSession: any,
    userPreferences: any
  ): Promise<RecurringSeries> {
    try {
      // Parse user preferences into intelligent recurring pattern
      const pattern = await this.buildIntelligentPattern(userId, baseSession, userPreferences);
      
      // Create session template from base session
      const template: SessionTemplate = {
        duration: baseSession.duration,
        theme: baseSession.theme,
        notes: baseSession.notes,
        therapyType: userPreferences.therapyType || 'couple',
        assistantId: baseSession.assistantId,
        autoConfirm: true,
        allowRescheduling: true,
        reminderSettings: {
          enabled: true,
          timings: this.parseReminderTimings(userPreferences.reminderTiming)
        }
      };

      // Create recurring series
      const series: RecurringSeries = {
        id: `series_${userId}_${Date.now()}`,
        userId,
        pattern,
        template,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        totalSessions: 0,
        completedSessions: 0,
        metadata: {
          originalSessionId: baseSession.id,
          userPreferences,
          intelligentGeneration: true
        }
      };

      // Store series in database
      await this.storeRecurringSeries(series);

      // Generate initial batch of sessions
      await this.generateUpcomingSessions(series, 8); // Generate next 8 sessions

      this.logger.info(`Created recurring series ${series.id} for user ${userId}`);
      return series;
      
    } catch (error) {
      this.logger.error(`Failed to create recurring series for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Generate upcoming sessions for all active recurring series
   */
  public async generateUpcomingSessions(
    series: RecurringSeries,
    lookAheadWeeks: number = 8
  ): Promise<{
    generated: number;
    skipped: number;
    conflicts: number;
    errors: Array<{ date: Date; error: string }>;
  }> {
    const results = {
      generated: 0,
      skipped: 0,
      conflicts: 0,
      errors: [] as Array<{ date: Date; error: string }>
    };

    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (lookAheadWeeks * 7));

      // Get potential session dates based on pattern
      const potentialDates = this.calculateRecurringDates(
        series.pattern,
        series.lastGenerated || series.createdAt,
        endDate
      );

      // Check for conflicts and generate sessions
      for (const date of potentialDates) {
        try {
          // Check if session already exists
          const existingSession = await this.findExistingSession(series.userId, date, series.template.duration);
          if (existingSession) {
            results.skipped++;
            continue;
          }

          // Check for calendar conflicts
          const conflicts = await this.calendarService.detectConflicts(
            series.userId,
            {
              title: series.template.theme,
              startTime: date,
              endTime: new Date(date.getTime() + (series.template.duration * 60 * 1000)),
              timeZone: series.pattern.timeZone
            }
          );

          if (conflicts.hasConflict) {
            // Try to find alternative time slot
            const alternativeSlot = await this.findAlternativeTimeSlot(
              series.userId,
              date,
              series.template.duration,
              series.pattern
            );

            if (alternativeSlot) {
              date.setTime(alternativeSlot.getTime());
            } else {
              results.conflicts++;
              this.logger.warn(`Conflict detected for session on ${date.toISOString()}, no alternative found`);
              continue;
            }
          }

          // Generate session
          const session = await this.generateSingleSession(series, date);
          results.generated++;

          // Update calendar if integrated
          try {
            await this.calendarService.createCalendarEvent(
              series.userId,
              {
                title: series.template.theme,
                description: `Recurring therapy session\n\nSeries: ${series.id}\nNotes: ${series.template.notes || 'No additional notes'}`,
                startTime: date,
                endTime: new Date(date.getTime() + (series.template.duration * 60 * 1000)),
                timeZone: series.pattern.timeZone,
                reminders: series.template.reminderSettings?.timings.map(timing => ({
                  method: 'email' as const,
                  minutes: this.convertTimingToMinutes(timing)
                }))
              }
            );
          } catch (calendarError) {
            this.logger.warn(`Failed to create calendar event for session ${session.id}:`, calendarError);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push({ date, error: errorMessage });
          this.logger.error(`Failed to generate session for ${date.toISOString()}:`, error);
        }
      }

      // Update series metadata
      await this.updateSeriesMetadata(series.id, {
        lastGenerated: new Date(),
        totalSessions: series.totalSessions + results.generated,
        nextDue: this.calculateNextDueDate(series.pattern, endDate)
      });

      this.logger.info(`Session generation complete for series ${series.id}:`, results);
      return results;
      
    } catch (error) {
      this.logger.error(`Failed to generate upcoming sessions for series ${series.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle session completion and update recurring series
   */
  public async handleSessionCompletion(sessionId: string): Promise<void> {
    try {
      // Find if this session belongs to a recurring series
      const series = await this.findSeriesBySessionId(sessionId);
      if (!series) return;

      // Update series completion count
      await this.updateSeriesMetadata(series.id, {
        completedSessions: series.completedSessions + 1,
        updatedAt: new Date()
      });

      // Check if series should be completed
      if (series.pattern.endType === 'after_count' && 
          series.pattern.endCount && 
          series.completedSessions + 1 >= series.pattern.endCount) {
        
        await this.completeSeries(series.id);
        this.logger.info(`Recurring series ${series.id} completed after ${series.completedSessions + 1} sessions`);
      }

      // Adaptive scheduling: Adjust future sessions based on completion patterns
      await this.adaptiveSchedulingAdjustment(series, sessionId);
      
    } catch (error) {
      this.logger.error(`Failed to handle session completion for ${sessionId}:`, error);
    }
  }

  /**
   * Pause/resume recurring series
   */
  public async pauseSeries(seriesId: string, reason?: string): Promise<void> {
    try {
      await this.updateSeriesStatus(seriesId, 'paused', { reason, pausedAt: new Date() });
      
      // Cancel future pending sessions
      await this.cancelFutureSessions(seriesId, new Date());
      
      this.logger.info(`Recurring series ${seriesId} paused`);
    } catch (error) {
      this.logger.error(`Failed to pause series ${seriesId}:`, error);
      throw error;
    }
  }

  public async resumeSeries(seriesId: string): Promise<void> {
    try {
      const series = await this.getSeriesById(seriesId);
      if (!series) throw new Error(`Series ${seriesId} not found`);

      await this.updateSeriesStatus(seriesId, 'active', { resumedAt: new Date() });
      
      // Regenerate future sessions
      await this.generateUpcomingSessions(series);
      
      this.logger.info(`Recurring series ${seriesId} resumed`);
    } catch (error) {
      this.logger.error(`Failed to resume series ${seriesId}:`, error);
      throw error;
    }
  }

  /**
   * Intelligent pattern building based on user preferences
   */
  private async buildIntelligentPattern(
    userId: string,
    baseSession: any,
    userPreferences: any
  ): Promise<RecurringPattern> {
    // Get user's historical session data for intelligent recommendations
    const sessionHistory = await this.getUserSessionHistory(userId);
    
    // Parse user preferences
    const frequency = this.mapFrequencyPreference(userPreferences.sessionFrequency);
    const preferredDays = this.parsePreferredDays(userPreferences.preferredDays);
    const sessionTime = this.parseSessionTime(userPreferences.sessionPreference);

    // Build intelligent pattern
    const pattern: RecurringPattern = {
      frequency,
      interval: 1,
      daysOfWeek: preferredDays,
      endType: userPreferences.recurringSession === 'no' ? 'after_count' : 'never',
      endCount: userPreferences.recurringSession === 'no' ? 4 : undefined, // Generate 4 sessions by default
      timeZone: this.detectUserTimeZone(userId),
      skipHolidays: true,
      skipWeekends: frequency !== 'daily' && !this.hasWeekendPreference(preferredDays),
      preferredTimeSlots: [{
        startTime: sessionTime,
        endTime: this.addMinutesToTime(sessionTime, baseSession.duration)
      }]
    };

    // Intelligent adjustments based on history
    if (sessionHistory.length > 0) {
      pattern.interval = this.calculateOptimalInterval(sessionHistory, frequency);
      pattern.preferredTimeSlots = this.optimizeTimeSlots(sessionHistory, pattern.preferredTimeSlots!);
    }

    return pattern;
  }

  /**
   * Calculate recurring dates based on pattern
   */
  private calculateRecurringDates(
    pattern: RecurringPattern,
    startDate: Date,
    endDate: Date
  ): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(startDate);

    // Ensure we start from the next occurrence
    currentDate = this.findNextOccurrence(currentDate, pattern);

    while (currentDate <= endDate) {
      // Check if date matches pattern criteria
      if (this.dateMatchesPattern(currentDate, pattern)) {
        // Apply time from preferred slots
        const timeSlot = this.selectOptimalTimeSlot(currentDate, pattern.preferredTimeSlots || []);
        if (timeSlot) {
          const sessionDate = new Date(currentDate);
          const [hours, minutes] = timeSlot.startTime.split(':').map(Number);
          sessionDate.setHours(hours, minutes, 0, 0);
          
          dates.push(sessionDate);
        }
      }

      // Move to next potential date
      currentDate = this.getNextDateByFrequency(currentDate, pattern);
    }

    return dates;
  }

  /**
   * Adaptive scheduling adjustment based on completion patterns
   */
  private async adaptiveSchedulingAdjustment(series: RecurringSeries, completedSessionId: string): Promise<void> {
    try {
      // Analyze completion patterns
      const recentSessions = await this.getRecentSeriesSessions(series.id, 5);
      
      // Calculate average completion time vs scheduled time
      const completionDelays = recentSessions
        .filter(s => s.completedAt)
        .map(s => {
          const scheduled = new Date(s.date).getTime();
          const completed = new Date(s.completedAt!).getTime();
          return (completed - scheduled) / (1000 * 60); // Minutes delay
        });

      if (completionDelays.length >= 3) {
        const avgDelay = completionDelays.reduce((a, b) => a + b, 0) / completionDelays.length;
        
        // If user consistently completes sessions late, suggest later times
        if (avgDelay > 30) { // More than 30 minutes average delay
          await this.suggestTimeAdjustment(series.id, avgDelay);
        }
      }

      // Check for cancellation patterns
      const cancellationRate = await this.calculateCancellationRate(series.id);
      if (cancellationRate > 0.3) { // More than 30% cancellation rate
        await this.suggestFrequencyAdjustment(series.id, 'reduce');
      }
      
    } catch (error) {
      this.logger.error(`Failed adaptive scheduling adjustment for series ${series.id}:`, error);
    }
  }

  /**
   * Find alternative time slot when conflicts occur
   */
  private async findAlternativeTimeSlot(
    userId: string,
    originalDate: Date,
    duration: number,
    pattern: RecurringPattern
  ): Promise<Date | null> {
    const alternatives: Date[] = [];
    
    // Try same day, different times
    for (const timeSlot of pattern.preferredTimeSlots || []) {
      const altDate = new Date(originalDate);
      const [hours, minutes] = timeSlot.startTime.split(':').map(Number);
      altDate.setHours(hours, minutes, 0, 0);
      
      if (Math.abs(altDate.getTime() - originalDate.getTime()) > 30 * 60 * 1000) { // Different by at least 30 minutes
        alternatives.push(altDate);
      }
    }

    // Try adjacent days with same time
    for (let dayOffset of [-1, 1, -2, 2]) {
      const altDate = new Date(originalDate);
      altDate.setDate(altDate.getDate() + dayOffset);
      
      if (this.dateMatchesPattern(altDate, pattern)) {
        alternatives.push(altDate);
      }
    }

    // Check each alternative for conflicts
    for (const altDate of alternatives) {
      const conflicts = await this.calendarService.detectConflicts(
        userId,
        {
          title: 'Alternative Session Check',
          startTime: altDate,
          endTime: new Date(altDate.getTime() + (duration * 60 * 1000)),
          timeZone: pattern.timeZone
        }
      );

      if (!conflicts.hasConflict) {
        return altDate;
      }
    }

    return null;
  }

  /**
   * Helper methods
   */
  private mapFrequencyPreference(preference: string): RecurringPattern['frequency'] {
    switch (preference?.toLowerCase()) {
      case 'daily': return 'daily';
      case 'weekly': return 'weekly';
      case 'every two weeks': 
      case 'biweekly': return 'biweekly';
      case 'monthly': return 'monthly';
      default: return 'weekly';
    }
  }

  private parsePreferredDays(preferredDays: string[] | null): number[] {
    if (!preferredDays) return [1, 2, 3, 4, 5]; // Monday-Friday default

    const dayMapping: Record<string, number> = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    return preferredDays
      .map(day => dayMapping[day.toLowerCase()])
      .filter(day => day !== undefined);
  }

  private parseSessionTime(preference: string | null): string {
    switch (preference?.toLowerCase()) {
      case 'morning': return '09:00';
      case 'afternoon': return '14:00';
      case 'evening': return '18:00';
      default: return '10:00';
    }
  }

  private parseReminderTimings(reminderTiming: string | null): string[] {
    switch (reminderTiming) {
      case '24 hours before': return ['24_hours'];
      case '48 hours before': return ['48_hours'];
      case '1 week before': return ['1_week'];
      case 'Both 24 hours and 1 hour before': return ['24_hours', '1_hour'];
      default: return ['24_hours', '1_hour'];
    }
  }

  private convertTimingToMinutes(timing: string): number {
    switch (timing) {
      case '1_week': return 7 * 24 * 60;
      case '48_hours': return 48 * 60;
      case '24_hours': return 24 * 60;
      case '1_hour': return 60;
      default: return 60;
    }
  }

  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  private dateMatchesPattern(date: Date, pattern: RecurringPattern): boolean {
    // Check day of week
    if (pattern.daysOfWeek && !pattern.daysOfWeek.includes(date.getDay())) {
      return false;
    }

    // Check weekend skipping
    if (pattern.skipWeekends && (date.getDay() === 0 || date.getDay() === 6)) {
      return false;
    }

    // TODO: Add holiday checking if skipHolidays is true

    return true;
  }

  private findNextOccurrence(date: Date, pattern: RecurringPattern): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1); // Start from next day
    return nextDate;
  }

  private getNextDateByFrequency(date: Date, pattern: RecurringPattern): Date {
    const nextDate = new Date(date);
    
    switch (pattern.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + pattern.interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * pattern.interval));
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + (14 * pattern.interval));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + pattern.interval);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 7); // Default to weekly
    }
    
    return nextDate;
  }

  private selectOptimalTimeSlot(date: Date, timeSlots: Array<{ startTime: string; endTime: string; dayOfWeek?: number }>): { startTime: string; endTime: string } | null {
    // Filter by day of week if specified
    const relevantSlots = timeSlots.filter(slot => 
      !slot.dayOfWeek || slot.dayOfWeek === date.getDay()
    );

    if (relevantSlots.length === 0) return timeSlots[0] || null;
    
    // TODO: Add more sophisticated slot selection logic based on availability
    return relevantSlots[0];
  }

  // Database operations (simplified - would need proper implementation)
  private async storeRecurringSeries(series: RecurringSeries): Promise<void> {
    // Store in recurring_series table
    await prisma.$executeRaw`
      INSERT INTO recurring_series (
        id, user_id, pattern, template, status, created_at, updated_at, metadata
      ) VALUES (
        ${series.id}, ${series.userId}, ${JSON.stringify(series.pattern)},
        ${JSON.stringify(series.template)}, ${series.status}, ${series.createdAt},
        ${series.updatedAt}, ${JSON.stringify(series.metadata)}
      )
    `;
  }

  private async generateSingleSession(series: RecurringSeries, date: Date): Promise<any> {
    return await prisma.session.create({
      data: {
        userId: series.userId,
        date,
        duration: series.template.duration,
        theme: series.template.theme,
        notes: `${series.template.notes || ''}\n\nRecurring series: ${series.id}`,
        status: 'SCHEDULED',
        assistantId: series.template.assistantId,
        // Add series reference
        metadata: {
          recurringSeriesId: series.id,
          generatedAt: new Date().toISOString()
        }
      }
    });
  }

  private async findExistingSession(userId: string, date: Date, duration: number): Promise<any> {
    const startWindow = new Date(date.getTime() - 30 * 60 * 1000); // 30 minutes before
    const endWindow = new Date(date.getTime() + 30 * 60 * 1000); // 30 minutes after

    return await prisma.session.findFirst({
      where: {
        userId,
        date: {
          gte: startWindow,
          lte: endWindow
        },
        status: {
          not: 'cancelled'
        }
      }
    });
  }

  private async getUserSessionHistory(userId: string): Promise<any[]> {
    return await prisma.session.findMany({
      where: {
        userId,
        status: 'completed'
      },
      orderBy: { date: 'desc' },
      take: 10
    });
  }

  private detectUserTimeZone(userId: string): string {
    // TODO: Implement timezone detection from user profile or browser
    return 'UTC';
  }

  private hasWeekendPreference(preferredDays: number[]): boolean {
    return preferredDays.includes(0) || preferredDays.includes(6); // Sunday or Saturday
  }

  private calculateOptimalInterval(sessionHistory: any[], frequency: string): number {
    // Analyze session completion patterns to suggest optimal intervals
    // TODO: Implement intelligent interval calculation
    return 1;
  }

  private optimizeTimeSlots(sessionHistory: any[], currentSlots: any[]): any[] {
    // Analyze historical session completion times to optimize future slots
    // TODO: Implement time slot optimization
    return currentSlots;
  }

  private async updateSeriesMetadata(seriesId: string, updates: Partial<RecurringSeries>): Promise<void> {
    await prisma.$executeRaw`
      UPDATE recurring_series 
      SET 
        last_generated = ${updates.lastGenerated || null},
        total_sessions = ${updates.totalSessions || null},
        completed_sessions = ${updates.completedSessions || null},
        next_due = ${updates.nextDue || null},
        updated_at = NOW()
      WHERE id = ${seriesId}
    `;
  }

  private calculateNextDueDate(pattern: RecurringPattern, fromDate: Date): Date {
    return this.getNextDateByFrequency(fromDate, pattern);
  }

  private async findSeriesBySessionId(sessionId: string): Promise<RecurringSeries | null> {
    // TODO: Implement lookup via session metadata or dedicated table
    return null;
  }

  private async completeSeries(seriesId: string): Promise<void> {
    await this.updateSeriesStatus(seriesId, 'completed', { completedAt: new Date() });
  }

  private async updateSeriesStatus(
    seriesId: string, 
    status: RecurringSeries['status'], 
    metadata: any
  ): Promise<void> {
    await prisma.$executeRaw`
      UPDATE recurring_series 
      SET 
        status = ${status},
        metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(metadata)}::jsonb,
        updated_at = NOW()
      WHERE id = ${seriesId}
    `;
  }

  private async cancelFutureSessions(seriesId: string, fromDate: Date): Promise<void> {
    // Cancel all future sessions belonging to this series
    await prisma.$executeRaw`
      UPDATE sessions 
      SET status = 'CANCELLED', updated_at = NOW()
      WHERE JSON_EXTRACT(metadata, '$.recurringSeriesId') = ${seriesId}
      AND date > ${fromDate}
      AND status = 'SCHEDULED'
    `;
  }

  private async getSeriesById(seriesId: string): Promise<RecurringSeries | null> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT * FROM recurring_series WHERE id = ${seriesId}
      `;
      
      if (result.length === 0) return null;
      
      const row = result[0];
      return {
        id: row.id,
        userId: row.user_id,
        pattern: JSON.parse(row.pattern),
        template: JSON.parse(row.template),
        status: row.status,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastGenerated: row.last_generated ? new Date(row.last_generated) : undefined,
        nextDue: row.next_due ? new Date(row.next_due) : undefined,
        totalSessions: row.total_sessions || 0,
        completedSessions: row.completed_sessions || 0,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
    } catch (error) {
      this.logger.error(`Failed to get series ${seriesId}:`, error);
      return null;
    }
  }

  private async getRecentSeriesSessions(seriesId: string, limit: number): Promise<any[]> {
    return await prisma.$queryRaw<any[]>`
      SELECT * FROM sessions 
      WHERE JSON_EXTRACT(metadata, '$.recurringSeriesId') = ${seriesId}
      ORDER BY date DESC 
      LIMIT ${limit}
    `;
  }

  private async suggestTimeAdjustment(seriesId: string, avgDelay: number): Promise<void> {
    // TODO: Implement intelligent time adjustment suggestions
    this.logger.info(`Suggesting time adjustment for series ${seriesId}: ${avgDelay} minutes delay`);
  }

  private async calculateCancellationRate(seriesId: string): Promise<number> {
    const results = await prisma.$queryRaw<[{ total: number; cancelled: number }]>`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
      FROM sessions 
      WHERE JSON_EXTRACT(metadata, '$.recurringSeriesId') = ${seriesId}
    `;
    
    const { total, cancelled } = results[0];
    return total > 0 ? cancelled / total : 0;
  }

  private async suggestFrequencyAdjustment(seriesId: string, adjustment: 'increase' | 'reduce'): Promise<void> {
    // TODO: Implement intelligent frequency adjustment suggestions
    this.logger.info(`Suggesting frequency ${adjustment} for series ${seriesId}`);
  }
}