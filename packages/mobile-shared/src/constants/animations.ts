/**
 * Animation Constants
 *
 * Standardized animation timings for consistent onboarding experience.
 * Based on OnboardingVotingBadgesScreen (the "gold standard").
 */

import { Easing } from 'react-native-reanimated';

// Stagger delays for sequential element reveals
export const stagger = {
  short: 100, // Fast items (list items, badges)
  medium: 150, // Standard items (cards, features)
  long: 200, // Emphasized items (headlines, CTAs)
};

// Duration for various animation types
export const duration = {
  instant: 150,
  fast: 300,
  normal: 400,
  slow: 600,
  entrance: 500,
  exit: 300,
};

// Spring physics for bouncy, natural feel
export const spring = {
  // Gentle spring for UI elements
  gentle: {
    damping: 20,
    stiffness: 100,
    mass: 1,
  },
  // Standard spring for most animations
  default: {
    damping: 15,
    stiffness: 100,
    mass: 1,
  },
  // Bouncy spring for emphasis
  bouncy: {
    damping: 12,
    stiffness: 100,
    mass: 1,
  },
  // Snappy spring for quick feedback
  snappy: {
    damping: 20,
    stiffness: 200,
    mass: 0.8,
  },
};

// Progressive reveal delays (for sequential content sections)
export const reveal = {
  header: 0, // Immediately
  content: 200, // After header settles
  items: 400, // After content appears
  button: 800, // After all content visible
  celebration: 1200, // After button for confetti/effects
};

// Easing functions for smooth animations
export const easing = {
  // Standard deceleration (enter)
  enter: Easing.out(Easing.cubic),
  // Standard acceleration (exit)
  exit: Easing.in(Easing.cubic),
  // Smooth both ways
  inOut: Easing.inOut(Easing.cubic),
  // Bouncy overshoot
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  // Linear for continuous animations
  linear: Easing.linear,
};

// Glow/pulse animation timings
export const pulse = {
  duration: 800, // One pulse cycle
  repeatCount: 3, // Default pulse repeats
  glowOpacityMin: 0.3,
  glowOpacityMax: 0.6,
};

// Transform values for entrance animations
export const transforms = {
  slideDistance: 30, // translateY distance for slide-in
  scaleFrom: 0.8, // Starting scale for scale-in
  scaleTo: 1, // Ending scale
  rotateEntrance: 180, // Degrees for spin-in effect
};

// Pre-configured animation configs
export const animationConfigs = {
  // Fade + slide up entrance
  fadeSlideUp: {
    opacity: { from: 0, to: 1 },
    translateY: { from: transforms.slideDistance, to: 0 },
    duration: duration.entrance,
    easing: easing.enter,
  },
  // Scale + fade entrance
  scaleFade: {
    opacity: { from: 0, to: 1 },
    scale: { from: transforms.scaleFrom, to: transforms.scaleTo },
    spring: spring.default,
  },
  // Spin + scale entrance (for badges/icons)
  spinScale: {
    scale: { from: 0.6, to: 1 },
    rotate: { from: transforms.rotateEntrance, to: 0 },
    spring: spring.bouncy,
  },
  // Gold glow pulse
  goldGlow: {
    opacity: { min: pulse.glowOpacityMin, max: pulse.glowOpacityMax },
    duration: pulse.duration,
    repeatCount: pulse.repeatCount,
  },
};
