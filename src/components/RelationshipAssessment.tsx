'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

type Question = {
  id: number
  text: string
  category: 'communication' | 'trust' | 'intimacy' | 'conflict'
}

type AssessmentResult = {
  category: string
  average: number
}

// Props for the component to allow external components to access the results
type RelationshipAssessmentProps = {
  onResultsSubmit?: (results: AssessmentResult[]) => void
  onClose?: () => void
}

export default function RelationshipAssessment({ onResultsSubmit, onClose }: RelationshipAssessmentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [isCompleted, setIsCompleted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
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
    setSaveSuccess(false)
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
  
  // Function to save assessment results to the database
  const saveResults = async () => {
    setIsSaving(true)
    
    try {
      const results = calculateResults()
      
      // Convert results to the format expected by the API
      const assessmentData = {
        date: new Date().toISOString(),
        results: results.reduce((acc, item) => {
          acc[`${item.category}Score`] = Math.round(item.average * 20) // Scale to 0-100
          return acc
        }, {} as Record<string, number>)
      }
      
      // Save to database
      const response = await fetch('/api/dashboard/save-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assessmentData),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save assessment results')
      }
      
      setSaveSuccess(true)
      
      // If parent component provided a callback, send results to it
      if (onResultsSubmit) {
        onResultsSubmit(results)
      }
    } catch (error) {
      console.error('Error saving assessment results:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  // Effect to save results when completed
  useEffect(() => {
    if (isCompleted && Object.keys(answers).length === questions.length) {
      // Auto-save when all questions are answered
      saveResults()
    }
  }, [isCompleted])
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Relationship Assessment</h2>
      
      {!isCompleted ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <motion.div 
                className="h-2 bg-purple-600 rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${(currentQuestion / questions.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              ></motion.div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{currentQuestion + 1} of {questions.length}</p>
          </div>
          
          <motion.p 
            key={currentQuestion}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 font-medium text-gray-800"
          >
            {questions[currentQuestion].text}
          </motion.p>
          
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(value => (
              <motion.button
                key={value}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * value }}
                whileHover={{ scale: 1.05, backgroundColor: '#F9FAFB' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAnswer(value)}
                className="py-2 px-2 sm:px-1 md:px-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                style={{ 
                  transform: 'none',
                  minHeight: '44px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <span className="text-sm sm:text-xs md:text-sm">
                  {value === 1 && 'Strongly Disagree'}
                  {value === 2 && 'Disagree'}
                  {value === 3 && 'Neutral'}
                  {value === 4 && 'Agree'}
                  {value === 5 && 'Strongly Agree'}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {isSaving ? (
            <div className="text-center py-4">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="mx-auto w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full"
              ></motion.div>
              <p className="mt-4 text-purple-600 font-medium">Saving your assessment...</p>
            </div>
          ) : saveSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-medium text-lg text-green-700 mb-2">Assessment Saved!</h3>
              <p className="text-sm text-gray-600 mb-4">
                Your assessment has been saved and will be used to personalize your therapy experience.
              </p>
              <div className="space-y-4 mt-6 mb-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm text-gray-700">Your Assessment Results</h4>
                {calculateResults().map(result => (
                  <div key={result.category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="capitalize text-sm">{result.category}</span>
                      <span className="text-sm font-medium">{result.average.toFixed(1)}/5</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(result.average / 5) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="h-2 bg-purple-600 rounded-full" 
                      ></motion.div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onClose && onClose()}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 text-sm"
                >
                  Close
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={reset}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm"
                >
                  Take New Assessment
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <>
              <h3 className="font-medium mb-4">Your Assessment Results</h3>
              
              <div className="space-y-4 mb-6">
                {calculateResults().map(result => (
                  <div key={result.category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="capitalize">{result.category}</span>
                      <span className="text-sm">{result.average.toFixed(1)}/5</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(result.average / 5) * 100}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-2 bg-purple-600 rounded-full" 
                      ></motion.div>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Based on your responses, consider focusing on the areas with lower scores
                for potential growth in your relationship.
              </p>
              
              <div className="flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={saveResults}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm"
                >
                  Save Results
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={reset}
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium px-4 py-2"
                >
                  Take Again
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}