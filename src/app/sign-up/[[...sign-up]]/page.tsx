import { SignUp } from '@clerk/nextjs'
import { Spotlight } from '@/components/ui/spotlight-new'

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-900 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-blue-900/20" />
      <Spotlight />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-8">
        <SignUp
          appearance={{
            variables: {
              colorBackground: '#1e2a3a',
              colorText: '#f1f5f9',
              colorTextSecondary: '#94a3b8',
              colorInputBackground: '#ffffff',
              colorInputText: '#0f172a',
              colorPrimary: '#3b82f6',
            },
            elements: {
              card: 'shadow-2xl border border-white/10',
              headerTitle: 'text-white',
              headerSubtitle: 'text-slate-300',
              socialButtonsBlockButton: 'border border-white/20 text-white hover:bg-white/10',
              socialButtonsBlockButtonText: 'text-white',
              dividerLine: 'bg-white/20',
              dividerText: 'text-slate-400',
              formFieldLabel: 'text-slate-200',
              formFieldInput: 'bg-white text-gray-900 border-gray-300',
              footerActionText: 'text-slate-300',
              footerActionLink: 'text-blue-400 hover:text-blue-300',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-blue-400',
            },
          }}
        />
      </div>
    </div>
  )
}
