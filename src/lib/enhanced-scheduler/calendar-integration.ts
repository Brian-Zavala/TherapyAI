// Stub for calendar integration - to be implemented
export class CalendarIntegrationService {
  async checkConflicts(_userId: string, _startTime: Date, _endTime: Date) {
    return { hasConflicts: false, conflicts: [] }
  }

  async syncSession(_sessionId: string, _userId: string) {
    // No-op until calendar integration is implemented
  }
}

export const calendarIntegrationService = new CalendarIntegrationService()
