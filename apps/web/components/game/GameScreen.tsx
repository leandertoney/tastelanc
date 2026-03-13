'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { type SwipeQuestion, type GamePhase } from '@/lib/game/types';
import { StartScreen } from './StartScreen';
import { SwipeCard } from './SwipeCard';
import { ResultScreen } from './ResultScreen';
import { ProgressBar } from './ProgressBar';

export function GameScreen() {
  const [phase, setPhase] = useState<GamePhase>('start');
  const [questions, setQuestions] = useState<SwipeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/play/questions');
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        setAnswers([]);
        setPhase('playing');
      }
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStart = useCallback(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleSwipe = useCallback(
    (userSaidTrue: boolean) => {
      const question = questions[currentIndex];
      if (!question || showFeedback) return;

      const isCorrect = userSaidTrue === question.answer;
      const newAnswers = [...answers, isCorrect];

      // Show feedback briefly
      setShowFeedback({ correct: isCorrect, explanation: question.explanation });

      setTimeout(() => {
        setAnswers(newAnswers);
        setShowFeedback(null);

        if (currentIndex + 1 >= questions.length) {
          setPhase('result');
        } else {
          setCurrentIndex((prev) => prev + 1);
        }
      }, 1500);
    },
    [questions, currentIndex, answers, showFeedback]
  );

  const handlePlayAgain = useCallback(() => {
    setPhase('start');
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
  }, []);

  if (phase === 'start') {
    return <StartScreen onStart={handleStart} loading={loading} />;
  }

  if (phase === 'result') {
    const score = answers.filter(Boolean).length;
    return <ResultScreen score={score} total={questions.length} onPlayAgain={handlePlayAgain} />;
  }

  // Playing phase
  const currentQuestion = questions[currentIndex];
  const nextQuestion = questions[currentIndex + 1];

  return (
    <div className="flex flex-col min-h-[100dvh] px-4 pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <ProgressBar total={questions.length} current={currentIndex} answers={answers} />
      </div>

      {/* Score */}
      <div className="text-right mb-2">
        <span className="text-white/40 text-sm">
          {answers.filter(Boolean).length}/{answers.length} correct
        </span>
      </div>

      {/* Card stack */}
      <div className="flex-1 relative">
        <AnimatePresence mode="popLayout">
          {/* Next card (behind) */}
          {nextQuestion && (
            <SwipeCard
              key={nextQuestion.id}
              question={nextQuestion}
              index={currentIndex + 1}
              total={questions.length}
              onSwipe={() => {}}
              isTop={false}
            />
          )}

          {/* Current card (top) */}
          {currentQuestion && (
            <SwipeCard
              key={currentQuestion.id}
              question={currentQuestion}
              index={currentIndex}
              total={questions.length}
              onSwipe={handleSwipe}
              isTop={true}
            />
          )}
        </AnimatePresence>

        {/* Feedback overlay */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 left-0 right-0 flex justify-center z-30 px-4"
            >
              <div
                className={`px-6 py-3 rounded-2xl backdrop-blur-sm ${
                  showFeedback.correct
                    ? 'bg-green-500/20 border border-green-500/40'
                    : 'bg-red-500/20 border border-red-500/40'
                }`}
              >
                <p className={`font-bold text-sm ${showFeedback.correct ? 'text-green-400' : 'text-red-400'}`}>
                  {showFeedback.correct ? 'Correct!' : 'Wrong!'}
                </p>
                <p className="text-white/70 text-xs mt-1">{showFeedback.explanation}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Button alternatives */}
      <div className="flex gap-4 justify-center mt-4">
        <button
          onClick={() => handleSwipe(false)}
          disabled={!!showFeedback}
          className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center text-red-400 font-bold text-xs hover:bg-red-500/30 transition-colors disabled:opacity-30"
        >
          FALSE
        </button>
        <button
          onClick={() => handleSwipe(true)}
          disabled={!!showFeedback}
          className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center text-green-400 font-bold text-xs hover:bg-green-500/30 transition-colors disabled:opacity-30"
        >
          TRUE
        </button>
      </div>
    </div>
  );
}
