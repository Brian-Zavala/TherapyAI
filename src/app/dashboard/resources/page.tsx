'use client'

import Link from 'next/link'

type Resource = {
  id: string
  title: string
  description: string
  type: 'article' | 'video' | 'exercise'
  url?: string
}

export default function Resources() {
  // In a real app, these would be fetched from a database
  const resources: Resource[] = [
    {
      id: '1',
      title: 'Effective Communication Techniques',
      description: 'Learn proven methods to improve how you express your needs and listen to your partner.',
      type: 'article',
      url: '/resources/communication-techniques'
    },
    {
      id: '2',
      title: 'Conflict Resolution Workbook',
      description: 'A step-by-step guide to resolving conflicts in a healthy, constructive way.',
      type: 'exercise',
      url: '/resources/conflict-workbook'
    },
    {
      id: '3',
      title: 'Building Emotional Intimacy',
      description: 'Exercises to deepen your emotional connection and foster greater intimacy.',
      type: 'exercise',
      url: '/resources/emotional-intimacy'
    },
    {
      id: '4',
      title: 'The Five Love Languages',
      description: 'Understand how you and your partner express and receive love differently.',
      type: 'article',
      url: '/resources/love-languages'
    }
  ]
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Relationship Resources</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {resources.map(resource => (
          <div key={resource.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start mb-3">
              <div className={`rounded-full w-8 h-8 flex items-center justify-center mr-3 ${
                resource.type === 'article' ? 'bg-blue-100 text-blue-600' :
                resource.type === 'video' ? 'bg-red-100 text-red-600' :
                'bg-green-100 text-green-600'
              }`}>
                {resource.type === 'article' ? '📝' :
                 resource.type === 'video' ? '🎥' : '✏️'}
              </div>
              <h3 className="text-lg font-semibold">{resource.title}</h3>
            </div>
            <p className="text-gray-600 mb-4">{resource.description}</p>
            <Link href={resource.url || '#'} className="text-blue-600 hover:underline text-sm font-medium">
              View Resource →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}