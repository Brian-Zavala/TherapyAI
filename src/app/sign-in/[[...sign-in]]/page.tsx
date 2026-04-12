import { SignIn } from '@clerk/nextjs'
import { Spotlight } from '@/components/ui/spotlight-new'

export default function Page() {
  return (
    <div className="h-screen bg-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-blue-900/20" />
      <Spotlight />
      <div className="relative z-10 h-full flex items-center justify-center p-4 py-8 overflow-y-auto">
        <SignIn
          appearance={{
            variables: {
              colorBackground: '#ffffff',
              colorText: '#0f172a',
              colorTextSecondary: '#475569',
              colorInputBackground: '#f8fafc',
              colorInputText: '#0f172a',
              colorPrimary: '#3b82f6',
              colorTextOnPrimaryBackground: '#ffffff',
            },
            elements: {
              card: 'shadow-2xl',
              headerTitle: { color: '#0f172a' },
              headerSubtitle: { color: '#475569' },
              socialButtonsBlockButton: { color: '#0f172a', borderColor: '#e2e8f0' },
              socialButtonsBlockButtonText: { color: '#0f172a' },
              dividerText: { color: '#64748b' },
              formFieldLabel: { color: '#334155' },
              footerActionText: { color: '#475569' },
              footerActionLink: { color: '#3b82f6' },
            },
          }}
        />
      </div>
    </div>
  )
}
