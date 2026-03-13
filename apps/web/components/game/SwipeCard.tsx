'use client';

import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { type SwipeQuestion } from '@/lib/game/types';
import { QuestionCard } from './QuestionCard';

const SWIPE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;

interface SwipeCardProps {
  question: SwipeQuestion;
  index: number;
  total: number;
  onSwipe: (answer: boolean) => void;
  isTop: boolean;
}

export function SwipeCard({ question, index, total, onSwipe, isTop }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const trueOpacity = useTransform(x, [0, 80], [0, 1]);
  const falseOpacity = useTransform(x, [-80, 0], [1, 0]);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > VELOCITY_THRESHOLD) {
      // Swiped right = TRUE, left = FALSE
      onSwipe(offset.x > 0);
    }
  }

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        zIndex: isTop ? 10 : 5,
        scale: isTop ? 1 : 0.95,
        opacity: isTop ? 1 : 0.5,
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={isTop ? handleDragEnd : undefined}
      initial={isTop ? { scale: 0.95, opacity: 0 } : false}
      animate={isTop ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0.5 }}
      exit={{
        x: x.get() > 0 ? 500 : -500,
        rotate: x.get() > 0 ? 30 : -30,
        opacity: 0,
        transition: { duration: 0.3 },
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Card */}
      <div className="w-[85vw] max-w-sm aspect-[3/4] rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden">
        {/* Background image */}
        {question.imageUrl ? (
          <>
            <img
              src={question.imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
          </>
        ) : (
          <div className="absolute inset-0 bg-tastelanc-card" />
        )}

        {/* TRUE indicator */}
        {isTop && (
          <motion.div
            className="absolute top-8 left-6 z-20 border-4 border-green-500 rounded-lg px-4 py-2 -rotate-12 bg-black/40 backdrop-blur-sm"
            style={{ opacity: trueOpacity }}
          >
            <span className="text-green-500 font-black text-2xl tracking-wider">TRUE</span>
          </motion.div>
        )}

        {/* FALSE indicator */}
        {isTop && (
          <motion.div
            className="absolute top-8 right-6 z-20 border-4 border-red-500 rounded-lg px-4 py-2 rotate-12 bg-black/40 backdrop-blur-sm"
            style={{ opacity: falseOpacity }}
          >
            <span className="text-red-500 font-black text-2xl tracking-wider">FALSE</span>
          </motion.div>
        )}

        {/* Content */}
        <div className="relative z-10 h-full">
          <QuestionCard
            statement={question.statement}
            restaurantName={question.restaurantName}
            category={question.category}
            index={index}
            total={total}
          />
        </div>
      </div>
    </motion.div>
  );
}
