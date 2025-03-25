'use client'

import { useState } from 'react'

type Question = {
  id: number
  text: string
  category: 'communication' | 'trust' | 'intimacy' | 'conflict'
}

export default function RelationshipAssessment() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [isCompleted, setIsCompleted] = useState(false)
  
  const questions: Question[] = [
    { id: 1, text: "We communicate openly about our feelings", category: 'communication' },
    { id: 2, text: "We resolve conflicts without lasting resentment", category: 'conflict' },
    { id: 3, text: "I feel emotionally connected to my partner", category: 'intimacy' },
    { id: 4, text: "I trust my partner completely", category: 'trust' },
    { id: 5, text: "We make decisions together", category: 'communication' }
  ]
  
  const handleAnswer = (value: number) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: value })
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setIsCompleted(true)
    }
  }
  
  const reset = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setIsCompleted(false)
  }
  
  // Calculate scores by category
  const calculateResults = () => {
    const results: Record<string, { score: number, count: number }> = {
      communication: { score: 0, count: 0 },
      trust: { score: 0, count: 0 },
      intimacy: { score: 0, count: 0 },
      conflict: { score: 0, count: 0 }
    }
    
    questions.forEach(question => {
      if (answers[question.id] !== undefined) {
        results[question.category].score += answers[question.id]
        results[question.category].count += 1
      }
    })
    
    return Object.entries(results).map(([category, data]) => ({
      category,
      average: data.count > 0 ? data.score / data.count : 0
    }))
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Relationship Assessment</h2>
      
      {!isCompleted ? (
        <div>
          <div className="mb-6">
            <div className="h-2 w-full bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-blue-600 rounded-full" 
                style={{ width: `${(currentQuestion / questions.length) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{currentQuestion + 1} of {questions.length}</p>
          </div>
          
          <p className="mb-4 font-medium">{questions[currentQuestion].text}</p>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            {[1, 2, 3, 4, 5].map(value => (
              <button
                key={value}
                onClick={() => handleAnswer(value)}
                className="py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition"
              >
                {value === 1 ? 'Strongly Disagree' :
                 value === 2 ? 'Disagree' :
                 value === 3 ? 'Neutral' :
                 value === 4 ? 'Agree' :
                 'Strongly Agree'}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h3 className="font-medium mb-4">Your Assessment Results</h3>
          
          <div className="space-y-4 mb-6">
            {calculateResults().map(result => (
              <div key={result.category}>
                <div className="flex justify-between items-center mb-1">
                  <span className="capitalize">{result.category}</span>
                  <span className="text-sm">{result.average.toFixed(1)}/5</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-blue-600 rounded-full" 
                    style={{ width: `${(result.average / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Based on your responses, consider focusing on the areas with lower scores
            for potential growth in your relationship.
          </p>
          
          <button
            onClick={reset}
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            Take Assessment Again
          </button>
        </div>
      )}
    </div>
  )
}