import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <section className="text-center py-16 max-w-3xl">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">Strengthen Your Relationship</h1>
        <p className="text-xl text-gray-600 mb-8">
          Connect with our AI therapists for guidance and support in your relationship journey.
        </p>
        <Link href="/auth/register" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition">
          Get Started
        </Link>
      </section>
      
      <section className="grid md:grid-cols-3 gap-8 max-w-5xl my-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-3">Private Sessions</h3>
          <p className="text-gray-600">Connect with an AI therapist from the comfort of your home.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-3">24/7 Availability</h3>
          <p className="text-gray-600">Get help whenever you need it - any time, any day.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-3">Proven Techniques</h3>
          <p className="text-gray-600">Our AI is trained in evidence-based therapeutic approaches.</p>
        </div>
      </section>
    </div>
  )
}
