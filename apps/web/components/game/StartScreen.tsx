'use client';

import { motion } from 'framer-motion';
import { BRAND } from '@/config/market';

interface StartScreenProps {
  onStart: () => void;
  loading: boolean;
}

export function StartScreen({ onStart, loading }: StartScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-tastelanc-accent">
          {BRAND.name}
        </h2>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight mb-4"
      >
        How well do you know{' '}
        <span className="text-tastelanc-accent">{BRAND.countyShort}&apos;s</span>{' '}
        food scene?
      </motion.h1>

      {/* Instructions */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-white/50 text-lg mb-10"
      >
        Swipe right for <span className="text-green-400 font-semibold">TRUE</span>, left for{' '}
        <span className="text-red-400 font-semibold">FALSE</span>
      </motion.p>

      {/* Swipe hint animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-10"
      >
        <motion.div
          animate={{ x: [0, 30, 0, -30, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-2xl bg-tastelanc-card border border-white/10 flex items-center justify-center"
        >
          <span className="text-2xl">👆</span>
        </motion.div>
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        disabled={loading}
        className="bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-bold text-lg px-10 py-4 rounded-full transition-colors disabled:opacity-50"
      >
        {loading ? 'Loading...' : "Let's Play"}
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-white/30 text-sm mt-3"
      >
        10 quick rounds
      </motion.p>
    </div>
  );
}
