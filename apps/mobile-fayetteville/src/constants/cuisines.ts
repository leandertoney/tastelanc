/**
 * Cuisine-related constants
 * Centralized to avoid duplication across components
 */

import { CuisineType } from '../types/database';

const SUPABASE_URL = 'https://kufcxxynjvyharhtfptd.supabase.co';

/**
 * Static food images for each cuisine type
 * Hosted on Supabase Storage for OTA updateability
 */
export const CUISINE_IMAGES: Record<CuisineType, string> = {
  american_contemporary: `${SUPABASE_URL}/storage/v1/object/public/images/cuisines/american_contemporary.jpg`,
  italian: `${SUPABASE_URL}/storage/v1/object/public/images/cuisines/italian.jpg`,
  mediterranean: `${SUPABASE_URL}/storage/v1/object/public/images/cuisines/mediterranean.jpg`,
  asian: `${SUPABASE_URL}/storage/v1/object/public/images/cuisines/asian.jpg`,
  latin: `${SUPABASE_URL}/storage/v1/object/public/images/cuisines/latin.jpg`,
  seafood: `${SUPABASE_URL}/storage/v1/object/public/images/cuisines/seafood.jpg`,
  steakhouse: `${SUPABASE_URL}/storage/v1/object/public/images/cuisines/steakhouse.jpg`,
  pub_fare: `${SUPABASE_URL}/storage/v1/object/public/images/cuisines/pub_fare.jpg`,
  cafe: `${SUPABASE_URL}/storage/v1/object/public/images/cuisines/cafe.jpg`,
  breakfast: `${SUPABASE_URL}/storage/v1/object/public/images/cuisines/breakfast.jpg`,
  brunch: `${SUPABASE_URL}/storage/v1/object/public/images/cuisines/brunch.jpg`,
  desserts: `${SUPABASE_URL}/storage/v1/object/public/images/cuisines/desserts.jpg`,
};

/**
 * Fallback colors for cuisine category circles
 * Used when image fails to load
 */
export const CUISINE_COLORS: Record<CuisineType, string> = {
  american_contemporary: '#4A90A4',
  italian: '#E74C3C',
  mediterranean: '#27AE60',
  asian: '#F39C12',
  latin: '#E67E22',
  seafood: '#3498DB',
  steakhouse: '#8B4513',
  pub_fare: '#D4A574',
  cafe: '#6F4E37',
  breakfast: '#FFB347',
  brunch: '#FF6B6B',
  desserts: '#DDA0DD',
};

/**
 * Fallback emoji icons for each cuisine type
 * Used when image fails to load
 */
export const CUISINE_EMOJIS: Record<CuisineType, string> = {
  american_contemporary: '🍽️',
  italian: '🍝',
  mediterranean: '🥗',
  asian: '🍜',
  latin: '🌮',
  seafood: '🦞',
  steakhouse: '🥩',
  pub_fare: '🍔',
  cafe: '☕',
  breakfast: '🍳',
  brunch: '🥂',
  desserts: '🍰',
};
