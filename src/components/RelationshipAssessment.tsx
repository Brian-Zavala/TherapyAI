'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'

type Question = {
  id: number
  text: string
  category: 'communication' | 'trust' | 'intimacy' | 'conflict'
}

type AssessmentResult = {
  category: string
  average: number
}

type RelationshipAssessmentProps = {
  onResultsSubmit?: (results: AssessmentResult[]) => void
  onClose?: () => void
}

const CATEGORY_META: Record<string, { label: string; color: string; bar: string }> = {
  communication: { label: 'Communication', color: 'text-blue-400',   bar: 'bg-blue-500'   },
  conflict:      { label: 'Conflict',       color: 'text-orange-400', bar: 'bg-orange-500' },
  intimacy:      { label: 'Intimacy',       color: 'text-pink-400',   bar: 'bg-pink-500'   },
  trust:         { label: 'Trust',          color: 'text-emerald-400',bar: 'bg-emerald-500'},
}

const ANSWER_LABELS = ['Strongly\nDisagree', 'Disagree', 'Neutral', 'Agree', 'Strongly\nAgree']

export default function RelationshipAssessment({ onResultsSubmit, onClose }: RelationshipAssessmentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [isCompleted, setIsCompleted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)

  const questions: Question[] = [
    { id: 1,  text: "We communicate openly about our feelings",                    category: 'communication' },
    { id: 2,  text: "I feel heard and understood when I speak",                    category: 'communication' },
    { id: 3,  text: "We can discuss difficult topics without significant tension", category: 'communication' },
    { id: 4,  text: "We make decisions together through effective communication",  category: 'communication' },
    { id: 5,  text: "We express appreciation and gratitude to each other regularly", category: 'communication' },
    { id: 6,  text: "We resolve conflicts without lasting resentment",             category: 'conflict' },
    { id: 7,  text: "We can disagree respectfully without it damaging our relationship", category: 'conflict' },
    { id: 8,  text: "We find compromises that work for both of us",                category: 'conflict' },
    { id: 9,  text: "We avoid blaming each other when discussing problems",        category: 'conflict' },
    { id: 10, text: "We can repair our relationship quickly after arguments",      category: 'conflict' },
    { id: 11, text: "I feel emotionally connected to my partner",                  category: 'intimacy' },
    { id: 12, text: "We regularly show affection toward each other",               category: 'intimacy' },
    { id: 13, text: "We make time to nurture our relationship",                    category: 'intimacy' },
    { id: 14, text: "I feel comfortable being vulnerable with my partner",         category: 'intimacy' },
    { id: 15, text: "We maintain a satisfying level of physical intimacy",         category: 'intimacy' },
    { id: 16, text: "I trust my partner completely",                               category: 'trust' },
    { id: 17, text: "My partner follows through on commitments",                   category: 'trust' },
    { id: 18, text: "I feel secure in our relationship",                           category: 'trust' },
    { id: 19, text: "We are honest with each other, even when it's difficult",     category: 'trust' },
    { id: 20, text: "I can rely on my partner for support when needed",            category: 'trust' },
  ]

  const handleAnswer = (value: number) => {
    const updated = { ...answers, [questions[currentQuestion].id]: value }
    setAnswers(updated)
    setDirection(1)

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setIsCompleted(true)
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setDirection(-1)
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const reset = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setIsCompleted(false)
    setSaveSuccess(false)
    setDirection(1)
  }

  const calculateResults = (): AssessmentResult[] => {
    const totals: Record<string, { score: number; count: number }> = {
      communication: { score: 0, count: 0 },
      trust:         { score: 0, count: 0 },
      intimacy:      { score: 0, count: 0 },
      conflict:      { score: 0, count: 0 },
    }
    questions.forEach(q => {
      if (answers[q.id] !== undefined) {
        totals[q.category].score += answers[q.id]
        totals[q.category].count += 1
      }
    })
    return Object.entries(totals).map(([category, data]) => ({
      category,
      average: data.count > 0 ? data.score / data.count : 0,
    }))
  }

  const saveResults = async () => {
    setIsSaving(true)
    try {
      const results = calculateResults()
      const assessmentData = {
        date: new Date().toISOString(),
        results: results.reduce((acc, item) => {
          acc[`${item.category}Score`] = Math.round(item.average * 20)
          return acc
        }, {} as Record<string, number>),
      }
      try {
        const response = await fetch('/api/dashboard/save-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assessmentData),
        })
        if (!response.ok) console.warn('Assessment API returned non-200:', response.status)
      } catch (apiError) {
        console.warn('Error calling assessment API:', apiError)
      }
      setSaveSuccess(true)
      if (onResultsSubmit) onResultsSubmit(results)
    } catch (error) {
      console.error('Error saving assessment results:', error)
      if (onResultsSubmit) {
        try { onResultsSubmit(calculateResults()) } catch (e) { console.error(e) }
      }
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (isCompleted && Object.keys(answers).length === questions.length) {
      saveResults()
    }
  }, [isCompleted])

  const progress = (currentQuestion / questions.length) * 100
  const currentQ = questions[currentQuestion]
  const meta = CATEGORY_META[currentQ?.category]

  const scoreColor = (avg: number) => {
    if (avg >= 4) return 'bg-emerald-500'
    if (avg >= 3) return 'bg-blue-500'
    if (avg >= 2) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-4">
      {!isCompleted ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-1.5">
              <span className={`text-xs font-semibold uppercase tracking-wider ${meta.color}`}>
                {meta.label}
              </span>
              <span className="text-xs text-white/50">{currentQuestion + 1} / {questions.length}</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-1.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`q-${currentQ.id}`}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -30 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <p className="text-sm sm:text-base font-normal text-white/90 leading-relaxed">
                {currentQ.text}
              </p>

              {/* Answer buttons — vertical on mobile, 5-col on sm+ */}
              <div className="flex flex-col sm:grid sm:grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((value) => {
                  const isSelected = answers[currentQ.id] === value
                  const label = ANSWER_LABELS[value - 1].replace('\n', ' ')
                  return (
                    <motion.button
                      key={`q${currentQ.id}-v${value}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAnswer(value)}
                      className={`cursor-pointer flex sm:flex-col items-center sm:justify-center gap-3 sm:gap-1 px-3 sm:px-1 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px] sm:min-h-[72px] ${
                        isSelected
                          ? 'bg-blue-500/30 border-blue-400/80 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                          : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <span className={`text-base sm:text-lg font-bold leading-none flex-shrink-0 w-6 sm:w-auto text-center ${isSelected ? 'text-blue-300' : 'text-white/40'}`}>
                        {value}
                      </span>
                      <span className="text-xs sm:text-[10px] text-left sm:text-center leading-snug">
                        {label}
                      </span>
                    </motion.button>
                  )
                })}
              </div>

              {/* Scale hint — hidden on mobile since labels are visible */}
              <div className="hidden sm:flex justify-between text-[10px] text-white/30 px-0.5">
                <span>← Not at all</span>
                <span>Very much →</span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Back button */}
          {currentQuestion > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleBack}
              className="cursor-pointer mt-4 flex items-center gap-1.5 text-xs sm:text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Previous question
            </motion.button>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          {isSaving ? (
            <div className="text-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="mx-auto w-10 h-10 border-4 border-white/20 border-t-blue-500 rounded-full mb-4"
              />
              <p className="text-blue-400 font-medium">Saving your assessment...</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              {/* Success header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-xs sm:text-sm md:text-base">Assessment complete</h3>
                  <p className="text-[10px] sm:text-xs md:text-sm text-white/60">Your results will personalize your sessions</p>
                </div>
              </div>

              {/* Results bars */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                {calculateResults().map((result, i) => {
                  const m = CATEGORY_META[result.category]
                  const pct = Math.round((result.average / 5) * 100)
                  return (
                    <div key={result.category}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs sm:text-sm font-medium ${m.color}`}>{m.label}</span>
                        <span className="text-xs text-white/60">{result.average.toFixed(1)} / 5</span>
                      </div>
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, delay: i * 0.1 }}
                          className={`h-2 rounded-full ${scoreColor(result.average)}`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Actions */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={reset}
                className="cursor-pointer w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 text-white/70 hover:text-white rounded-xl text-sm transition-all"
              >
                Retake Assessment
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )
}
