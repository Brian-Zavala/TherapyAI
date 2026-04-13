'use client'

export default function CommunicationTechniques() {
  return (
    <div className="max-w-3xl mx-auto pt-20 sm:pt-24 px-4">
      <h1 className="text-2xl font-bold mb-6">Effective Communication Techniques</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Listening</h2>
        
        <p className="mb-4">
          Active listening is about fully concentrating on what is being said rather than just passively "hearing" the message of the speaker. It involves all the senses and requires the listener to fully engage with the speaker.
        </p>
        
        <h3 className="font-medium text-lg mt-6 mb-3">How to Practice Active Listening:</h3>
        
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Give your full attention to your partner when they're speaking</li>
          <li>Avoid interrupting or planning your response while they're still talking</li>
          <li>Demonstrate that you're listening through body language (nodding, eye contact)</li>
          <li>Ask clarifying questions to ensure you understand</li>
          <li>Paraphrase what you heard to confirm understanding: "What I'm hearing is..."</li>
        </ul>
        
        <div className="bg-blue-50 p-4 rounded-md mt-6">
          <h4 className="font-medium mb-2">Practice Exercise</h4>
          <p>
            Take turns with your partner discussing a non-controversial topic for 3 minutes each. The listener should not interrupt and should use only non-verbal cues to show they're listening. Afterward, the listener summarizes what they heard before switching roles.
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Using "I" Statements</h2>
        
        <p className="mb-4">
          "I" statements help you express feelings without blaming your partner or making them defensive. They focus on your experience rather than your partner's behavior.
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-red-50 p-3 rounded-md">
            <h4 className="font-medium text-red-700 mb-2">Instead of saying:</h4>
            <p>"You never listen to me when I talk about my day."</p>
          </div>
          <div className="bg-green-50 p-3 rounded-md">
            <h4 className="font-medium text-green-700 mb-2">Try saying:</h4>
            <p>"I feel unimportant when I don't get a response after sharing about my day."</p>
          </div>
        </div>
        
        <h3 className="font-medium text-lg mt-6 mb-3">Components of an Effective "I" Statement:</h3>
        
        <ol className="list-decimal pl-6 space-y-2">
          <li>Express your feelings: "I feel..."</li>
          <li>Describe the behavior objectively: "...when [specific situation]..."</li>
          <li>Explain the impact: "...because..."</li>
          <li>State what you need: "I would appreciate it if..."</li>
        </ol>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Setting Healthy Boundaries</h2>
        
        <p className="mb-4">
          Boundaries are the limits and rules we set for ourselves within relationships. Clear boundaries are essential for healthy communication and mutual respect.
        </p>
        
        <h3 className="font-medium text-lg mt-4 mb-3">Steps to Set Healthy Boundaries:</h3>
        
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li>Identify your limits: What behaviors are unacceptable to you?</li>
          <li>Be direct, clear, and specific about your boundaries</li>
          <li>Use calm, firm language without apologizing for having boundaries</li>
          <li>Listen to your partner's response and be willing to discuss compromises</li>
          <li>Be consistent in maintaining your boundaries</li>
        </ul>
        
        <div className="bg-yellow-50 p-4 rounded-md mt-6">
          <h4 className="font-medium mb-2">Remember</h4>
          <p>
            Setting boundaries isn't selfish—it's necessary for maintaining your emotional health and the health of your relationship. Healthy boundaries allow both partners to feel safe and respected.
          </p>
        </div>
      </div>
    </div>
  )
}