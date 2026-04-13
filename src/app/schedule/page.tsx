import { Suspense } from 'react'
import ScheduleClient from './ScheduleClient'

export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-400 border-t-transparent" />
      </div>
    }>
      <ScheduleClient />
    </Suspense>
  )
}