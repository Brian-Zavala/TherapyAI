import { SignUp } from '@clerk/nextjs'
import { Spotlight } from '@/components/ui/spotlight-new'

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-900 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-blue-900/20" />
      <Spotlight />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-8">
        <SignUp />
      </div>
    </div>
  )
}
