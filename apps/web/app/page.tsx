'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Sparkles,
  MapPin,
  Star,
  Zap,
  ChevronRight,
  ChevronLeft,
  Check,
  Smartphone,
  Bell,
  ArrowRight,
  Trophy,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Footer from '@/components/layout/Footer';
import RosieChatBubble from '@/components/chat/RosieChatBubble';
import { useRosieChat } from '@/lib/contexts/RosieChatContext';
import { MessageCircle } from 'lucide-react';
import { NavDownloadLink, HeaderDownloadButton } from '@/components/ui';


// App preview screens
const APP_SCREENS = [
  { title: "Tonight's Picks", description: 'The best of what\'s happening right now' },
  { title: 'Trending Right Now', description: 'What everyone\'s talking about tonight' },
  { title: 'Your Favorites', description: 'Your go-to spots, always ready' },
  { title: 'Nearby Spots', description: 'Great options close to you' },
  { title: 'Local Challenges', description: 'Fun ways to explore and earn' },
];

export default function HomePage() {
  const { openChat } = useRosieChat();

  // Carousel state
  const [activeScreen, setActiveScreen] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Tonight section rotating features
  const [activeFeature, setActiveFeature] = useState(0);
  const [featurePaused, setFeaturePaused] = useState(false);
  const featurePauseTimeout = useRef<NodeJS.Timeout | null>(null);

  // Hero background cycling state
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [firstImageReady, setFirstImageReady] = useState(false);

  // Your Lancaster map pins
  const [activePin, setActivePin] = useState<number | null>(null);

  // Navigate to a specific screen
  const goToScreen = useCallback((index: number) => {
    if (index >= 0 && index < APP_SCREENS.length) {
      setActiveScreen(index);
      setHasInteracted(true);
      setShowNudge(false);
    }
  }, []);

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && activeScreen < APP_SCREENS.length - 1) {
        // Swipe left - go to next
        goToScreen(activeScreen + 1);
      } else if (diff < 0 && activeScreen > 0) {
        // Swipe right - go to previous
        goToScreen(activeScreen - 1);
      }
    }
  };

  // Intersection Observer for nudge animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasInteracted) {
            // Trigger first nudge after a short delay
            setTimeout(() => {
              if (!hasInteracted) setShowNudge(true);
            }, 1000);

            // Trigger reminder nudge after 8 seconds if no interaction
            setTimeout(() => {
              if (!hasInteracted) {
                setShowNudge(false);
                setTimeout(() => setShowNudge(true), 100);
              }
            }, 8000);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (carouselRef.current) {
      observer.observe(carouselRef.current);
    }

    return () => observer.disconnect();
  }, [hasInteracted]);

  // Fetch restaurant hero images
  useEffect(() => {
    const fetchHeroImages = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('restaurants')
        .select('cover_image_url')
        .not('cover_image_url', 'is', null)
        .eq('is_active', true)
        .limit(15);

      if (error || !data || data.length === 0) return;

      const urls = data
        .map((r) => r.cover_image_url)
        .filter((url): url is string => url !== null);

      // Shuffle for variety on each visit
      for (let i = urls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [urls[i], urls[j]] = [urls[j], urls[i]];
      }

      setHeroImages(urls);
    };

    fetchHeroImages();
  }, []);

  // Preload initial hero images
  useEffect(() => {
    if (heroImages.length === 0) return;

    const img = new window.Image();
    img.src = heroImages[0];
    img.onload = () => setFirstImageReady(true);

    // Preload second image too
    if (heroImages.length > 1) {
      const img2 = new window.Image();
      img2.src = heroImages[1];
    }
  }, [heroImages]);

  // Cycle hero background images
  useEffect(() => {
    if (heroImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => {
        const nextIndex = (prev + 1) % heroImages.length;
        // Preload the image after next
        const preloadIndex = (nextIndex + 1) % heroImages.length;
        const img = new window.Image();
        img.src = heroImages[preloadIndex];
        return nextIndex;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [heroImages]);

  // Tonight section feature rotation (2.5s interval)
  useEffect(() => {
    if (featurePaused) return;

    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4);
    }, 2500);

    return () => clearInterval(interval);
  }, [featurePaused]);

  // Handle feature navigation with pause
  const goToFeature = useCallback((index: number) => {
    setActiveFeature(index);
    setFeaturePaused(true);

    // Clear existing timeout
    if (featurePauseTimeout.current) {
      clearTimeout(featurePauseTimeout.current);
    }

    // Resume after 5 seconds of inactivity
    featurePauseTimeout.current = setTimeout(() => {
      setFeaturePaused(false);
    }, 5000);
  }, []);

  return (
    <main className="min-h-screen bg-tastelanc-bg">
      {/* Header */}
      <header className="border-b border-tastelanc-surface-light sticky top-0 bg-tastelanc-bg/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/tastelanc_new_dark.png"
              alt="TasteLanc"
              width={220}
              height={80}
              className="h-12 md:h-16 w-auto"
              priority
            />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/blog" className="text-gray-300 hover:text-white transition-colors">
              Blog
            </Link>
            <a href="#tonight" className="text-gray-300 hover:text-white transition-colors">
              Features
            </a>
            <a href="#app-preview" className="text-gray-300 hover:text-white transition-colors">
              App Preview
            </a>
            <NavDownloadLink />
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden md:inline-block text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <HeaderDownloadButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {/* Restaurant images with crossfade */}
          {/* Initial image from The Fridge (paid restaurant) - shows immediately */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
            style={{
              backgroundImage: `url('https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/restaurants/ffbb8eb2-bd67-4c4d-bd23-f7c0f6f34030/cover.jpg')`,
              opacity: heroImages.length > 0 && firstImageReady ? 0 : 1,
            }}
          />
          {/* Restaurant images with crossfade */}
          {heroImages.length > 0 && firstImageReady && (
            heroImages.map((url, index) => (
              <div
                key={url}
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
                style={{
                  backgroundImage: `url('${url}')`,
                  opacity: index === currentImageIndex ? 1 : 0,
                }}
              />
            ))
          )}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent pointer-events-none" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Animated Logo */}
          <div className="mb-8">
            <div className="relative mx-auto h-[160px] w-[160px] md:h-[190px] md:w-[190px]">
              <div className="absolute inset-0 rounded-full bg-black/70 blur-3xl" />
              <Image
                src="/images/tastelanc_new_dark.png"
                alt="TasteLanc"
                width={220}
                height={220}
                className="relative w-40 h-40 md:w-48 md:h-48 mx-auto object-contain animate-logo"
              />
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-6 leading-tight hero-text-glow">
            Discover Lancaster&apos;s
            <span className="text-tastelanc-accent block hero-highlight-shadow">Dining & Nightlife</span>
          </h1>

          <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto hero-subtext-shadow">
            The ultimate app for finding happy hours, live events, and the best deals at restaurants and bars in Lancaster, PA.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a
              href="https://apps.apple.com/us/app/tastelanc/id6755852717"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-tastelanc-accent/25"
            >
              <Smartphone className="w-5 h-5" />
              Download for iOS
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.tastelanc.app"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-green-600/25"
            >
              <Smartphone className="w-5 h-5" />
              Download for Android
            </a>
          </div>
          <p className="text-gray-400 text-sm">Available on iOS and Android</p>
        </div>
      </section>

      {/* Rosie AI Section - First and Featured */}
      <section id="rosie" className="py-20 px-4 bg-gradient-to-b from-tastelanc-surface to-purple-950/20">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Layout - Side by Side */}
          <div className="md:hidden">
            <div className="flex items-start gap-4 mb-6">
              {/* Rosie Avatar - Mobile */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl scale-150" />
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500/30 shadow-xl shadow-purple-500/20">
                  <video
                    src="/images/rosie_dark_animated.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              {/* Header - Mobile */}
              <div className="flex-1 pt-2">
                <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-3 py-1 mb-2">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span className="text-purple-400 font-medium text-xs">AI-Powered</span>
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Meet <span className="text-purple-400">Rosie</span>
                </h3>
              </div>
            </div>
            <p className="text-lg text-gray-300 mb-6">
              Your personal Lancaster dining and nightlife expert. Ask Rosie anything about restaurants, happy hours, events, and the best places to eat and drink.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Natural conversation - just ask like you would a friend',
                'Personalized recommendations based on your mood',
                'Real-time info on happy hours and events',
                'Knows Lancaster\'s dining scene inside and out',
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-purple-400" />
                  </div>
                  <span className="text-gray-400 text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={openChat}
              className="w-full inline-flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-6 py-4 rounded-lg transition-all shadow-lg shadow-purple-500/25"
            >
              <MessageCircle className="w-5 h-5" />
              Chat with Rosie Now
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-gray-500 text-sm mt-3 text-center">Free to try - no sign up required</p>

            {/* Additional Rosie benefits - Mobile */}
            <div className="mt-6 pt-6 border-t border-purple-500/20">
              <div className="grid grid-cols-1 gap-3">
                {[
                  'Helps you decide where to go — without endless scrolling',
                  'Suggests plans that actually fit your mood',
                  'Surfaces hidden gems locals love',
                  'Makes exploring Lancaster feel effortless',
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-400 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Layout - Original */}
          <div className="hidden md:grid md:grid-cols-2 gap-12 items-center">
            {/* Rosie Visual */}
            <div className="relative flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-3xl scale-150" />
                <div className="relative w-80 h-80 rounded-full overflow-hidden border-4 border-purple-500/30 shadow-2xl shadow-purple-500/20">
                  <video
                    src="/images/rosie_dark_animated.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Rosie Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-2 mb-6">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400 font-medium text-sm">AI-Powered Assistant</span>
              </div>
              <h3 className="text-4xl font-bold text-white mb-4">
                Meet <span className="text-purple-400">Rosie</span>
              </h3>
              <p className="text-xl text-gray-300 mb-6">
                Your personal Lancaster dining and nightlife expert. Ask Rosie anything about restaurants, happy hours, events, and the best places to eat and drink.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Natural conversation - just ask like you would a friend',
                  'Personalized recommendations based on your mood',
                  'Real-time info on happy hours and events',
                  'Knows Lancaster\'s dining scene inside and out',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-gray-400">{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={openChat}
                className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-4 rounded-lg transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
              >
                <MessageCircle className="w-5 h-5" />
                Chat with Rosie Now
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-gray-500 text-sm mt-3">Free to try - no sign up required</p>

              {/* Additional Rosie benefits */}
              <div className="mt-8 pt-8 border-t border-purple-500/20">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    'Helps you decide where to go — without endless scrolling',
                    'Suggests plans that actually fit your mood',
                    'Surfaces hidden gems locals love',
                    'Makes exploring Lancaster feel effortless',
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-400 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Authority Section - do not alter other homepage content */}
      <section className="max-w-5xl mx-auto px-4 py-12 text-white">
        <h2 className="text-3xl font-bold mb-3">Lancaster’s #1 Food & Nightlife App.</h2>
        <p className="text-gray-300">
          TasteLanc is the most comprehensive guide for restaurants, events, specials, and nightlife — powered by Rosie,
          Lancaster’s first AI dining companion. The app gives you even more with real-time alerts, personalized picks,
          and exclusive insights.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <a
            href="https://apps.apple.com/us/app/tastelanc/id6755852717"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-tastelanc-accent text-white rounded-lg font-semibold"
          >
            Download for iOS
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.tastelanc.app"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold"
          >
            Download for Android
          </a>
        </div>
      </section>

      {/* Find What's Good Tonight Section */}
      <section id="tonight" className="py-20 px-4 bg-gradient-to-b from-tastelanc-bg to-tastelanc-surface relative overflow-hidden">
        {/* Ambient glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-tastelanc-accent/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-2 mb-6">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 font-medium text-sm">Live & Updated</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Find What&apos;s Good Tonight
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              A smarter way to explore Lancaster — from after-work drinks to late-night plans. Everything happening right now, in one place that actually feels alive.
            </p>
          </div>

          {/* Rotating Feature Display */}
          <div className="max-w-2xl mx-auto">
            {/* Feature Cards Container */}
            <div className="relative h-[140px] sm:h-[120px]">
              {[
                { icon: Clock, title: 'Happy Hours', text: "Tonight's best happy hours curated across the city" },
                { icon: Calendar, title: 'Live Events', text: 'Live music, trivia, DJs, and pop-ups happening right now' },
                { icon: Sparkles, title: 'Specials', text: "One-night specials you'd normally hear about too late" },
                { icon: MapPin, title: 'Discover', text: "Quick filters for neighborhood, vibe, and what you're in the mood for" },
              ].map((item, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-500 ease-out ${
                    index === activeFeature
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-tastelanc-card/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-orange-500/30 shadow-lg shadow-orange-500/10">
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-orange-500/20 flex items-center justify-center flex-shrink-0 ${
                      index === activeFeature ? 'animate-pulse' : ''
                    }`}>
                      <item.icon className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400" />
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="text-lg sm:text-xl font-bold text-orange-400 mb-1">{item.title}</h3>
                      <p className="text-gray-300 text-base sm:text-lg leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Dots */}
            <div className="flex justify-center gap-3 mt-8">
              {[0, 1, 2, 3].map((index) => (
                <button
                  key={index}
                  onClick={() => goToFeature(index)}
                  className={`rounded-full transition-all duration-300 ${
                    index === activeFeature
                      ? 'w-8 h-3 bg-orange-500'
                      : 'w-3 h-3 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Go to feature ${index + 1}`}
                />
              ))}
            </div>

            {/* Arrow Navigation */}
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => goToFeature((activeFeature - 1 + 4) % 4)}
                className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
                aria-label="Previous feature"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => goToFeature((activeFeature + 1) % 4)}
                className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
                aria-label="Next feature"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="text-center mt-10">
            <a
              href="#app-preview"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-tastelanc-accent hover:from-orange-600 hover:to-tastelanc-accent-hover text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-orange-500/25"
            >
              See the App
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Your Lancaster, Your Way Section - Interactive Map */}
      <section id="personalized" className="py-20 px-4 bg-tastelanc-surface">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-lancaster-gold/20 border border-lancaster-gold/30 rounded-full px-4 py-2 mb-6">
              <MapPin className="w-4 h-4 text-lancaster-gold" />
              <span className="text-lancaster-gold font-medium text-sm">Location-Aware</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Your Lancaster, Your Way
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              TasteLanc learns what you like and makes the city feel smaller, closer, and easier to enjoy. Tap a pin to see how we connect you to Lancaster.
            </p>
          </div>

          {/* Interactive Map - Desktop */}
          <div className="hidden md:block">
            <div className="relative max-w-3xl mx-auto aspect-[16/10] bg-gradient-to-br from-tastelanc-card via-tastelanc-surface to-tastelanc-card rounded-2xl border border-lancaster-gold/20 overflow-hidden">
              {/* Map Grid Pattern */}
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D4AF37" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* "Lancaster" label */}
              <div className="absolute top-4 left-4 text-lancaster-gold/40 text-sm font-medium tracking-wider uppercase">
                Lancaster, PA
              </div>

              {/* Feature Pins */}
              {[
                { icon: MapPin, label: 'Nearby', desc: 'Great options close to you — wherever you are', x: '15%', y: '30%' },
                { icon: Star, label: 'Favorites', desc: 'Your go-to spots, always one tap away', x: '75%', y: '25%' },
                { icon: Zap, label: 'For You', desc: 'Picks that match your taste — instantly', x: '45%', y: '45%' },
                { icon: Bell, label: 'Alerts', desc: 'Helpful nudges when something worth knowing pops up', x: '25%', y: '70%' },
                { icon: Trophy, label: 'Vote', desc: "Vote for Lancaster's Best and influence the spotlight", x: '70%', y: '65%' },
              ].map((pin, index) => (
                <div
                  key={index}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ left: pin.x, top: pin.y }}
                >
                  {/* Pin Button */}
                  <button
                    onClick={() => setActivePin(activePin === index ? null : index)}
                    className={`relative group transition-all duration-300 ${
                      activePin === index ? 'scale-110' : 'hover:scale-110'
                    }`}
                  >
                    {/* Pulse ring */}
                    <div className={`absolute inset-0 rounded-full bg-lancaster-gold/30 ${
                      activePin === index ? 'animate-ping' : 'group-hover:animate-ping'
                    }`} style={{ animationDuration: '2s' }} />

                    {/* Pin circle */}
                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      activePin === index
                        ? 'bg-lancaster-gold text-black shadow-lg shadow-lancaster-gold/50'
                        : 'bg-tastelanc-card border-2 border-lancaster-gold/50 text-lancaster-gold hover:bg-lancaster-gold hover:text-black'
                    }`}>
                      <pin.icon className="w-5 h-5" />
                    </div>
                  </button>

                  {/* Expanded Info Card */}
                  <div className={`absolute left-1/2 -translate-x-1/2 mt-2 w-64 transition-all duration-300 ${
                    activePin === index
                      ? 'opacity-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 -translate-y-2 pointer-events-none'
                  }`}>
                    <div className="bg-tastelanc-card border border-lancaster-gold/30 rounded-xl p-4 shadow-xl">
                      <h4 className="font-bold text-lancaster-gold mb-1">{pin.label}</h4>
                      <p className="text-gray-300 text-sm">{pin.desc}</p>
                    </div>
                    {/* Arrow pointing up */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-tastelanc-card border-l border-t border-lancaster-gold/30 transform rotate-45" />
                  </div>
                </div>
              ))}

              {/* Decorative roads/paths */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
                <path d="M 0 200 Q 200 180 400 200 T 800 180" fill="none" stroke="#D4AF37" strokeWidth="2" strokeDasharray="8 4" />
                <path d="M 300 0 Q 320 150 280 300 T 320 400" fill="none" stroke="#D4AF37" strokeWidth="2" strokeDasharray="8 4" />
              </svg>
            </div>

            <p className="text-center text-gray-500 text-sm mt-4">Click a pin to learn more</p>
          </div>

          {/* Mobile Layout - Stacked Cards */}
          <div className="md:hidden space-y-4">
            {[
              { icon: MapPin, label: 'Nearby', desc: 'Great options close to you — wherever you are' },
              { icon: Star, label: 'Favorites', desc: 'Your go-to spots, always one tap away' },
              { icon: Zap, label: 'For You', desc: 'Picks that match your taste — instantly' },
              { icon: Bell, label: 'Alerts', desc: 'Helpful nudges when something worth knowing pops up' },
              { icon: Trophy, label: 'Vote', desc: "Vote for Lancaster's Best and influence the spotlight" },
            ].map((item, index) => (
              <button
                key={index}
                onClick={() => setActivePin(activePin === index ? null : index)}
                className={`w-full text-left transition-all duration-300 ${
                  activePin === index ? 'scale-[1.02]' : ''
                }`}
              >
                <div className={`flex items-center gap-4 rounded-xl p-4 border transition-all ${
                  activePin === index
                    ? 'bg-lancaster-gold/10 border-lancaster-gold/50'
                    : 'bg-tastelanc-card/50 border-lancaster-gold/10'
                }`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    activePin === index
                      ? 'bg-lancaster-gold text-black'
                      : 'bg-lancaster-gold/20 text-lancaster-gold'
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{item.label}</h4>
                    <p className={`text-sm transition-all ${
                      activePin === index ? 'text-gray-300' : 'text-gray-500'
                    }`}>{item.desc}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-lancaster-gold transition-transform ${
                    activePin === index ? 'rotate-90' : ''
                  }`} />
                </div>
              </button>
            ))}
          </div>

          <div className="text-center mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://apps.apple.com/us/app/tastelanc/id6755852717"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-bold px-8 py-4 rounded-xl transition-all"
            >
              <Smartphone className="w-5 h-5" />
              Download for iOS
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.tastelanc.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-xl transition-all"
            >
              <Smartphone className="w-5 h-5" />
              Download for Android
            </a>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section id="app-preview" className="py-20 px-4 bg-tastelanc-bg" ref={carouselRef}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              See the App in Action
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              A quick look at what makes TasteLanc feel effortless — fast picks, live happenings, and an interface built for going out, not reading about going out.
            </p>
          </div>

          {/* Carousel Container */}
          <div className="flex items-center justify-center gap-4 md:gap-8">
            {/* Left Arrow */}
            <button
              onClick={() => goToScreen(activeScreen - 1)}
              className={`p-2 rounded-full transition-all duration-300 ${
                activeScreen > 0
                  ? 'text-white/30 hover:text-white/60 hover:bg-white/10 cursor-pointer'
                  : 'text-transparent cursor-default'
              }`}
              disabled={activeScreen === 0}
              aria-label="Previous screen"
            >
              <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
            </button>

            {/* iPhone Mockup */}
            <div
              className="relative w-[280px] md:w-[320px]"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* iPhone Frame */}
              <div className="bg-[#1a1a1a] rounded-[3rem] p-[3px] shadow-2xl">
                {/* iPhone Inner Bezel */}
                <div className="bg-black rounded-[2.8rem] p-[10px] relative">
                  {/* Side Button (right) */}
                  <div className="absolute -right-[2px] top-28 w-[3px] h-12 bg-[#2a2a2a] rounded-l-sm" />
                  {/* Volume Buttons (left) */}
                  <div className="absolute -left-[2px] top-24 w-[3px] h-8 bg-[#2a2a2a] rounded-r-sm" />
                  <div className="absolute -left-[2px] top-36 w-[3px] h-8 bg-[#2a2a2a] rounded-r-sm" />
                  {/* Silent Switch */}
                  <div className="absolute -left-[2px] top-16 w-[3px] h-5 bg-[#2a2a2a] rounded-r-sm" />

                  {/* Screen */}
                  <div className="bg-black rounded-[2.4rem] aspect-[9/19.5] relative overflow-hidden">
                    {/* Dynamic Island */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90px] h-[28px] bg-black rounded-full z-20" />

                    {/* Screen Content with slide animation */}
                    <div
                      className={`absolute inset-0 transition-transform duration-300 ease-out ${
                        showNudge ? 'animate-swipe-hint' : ''
                      }`}
                    >
                      {/* All screens in a horizontal strip */}
                      <div
                        className="flex h-full transition-transform duration-300 ease-out"
                        style={{ transform: `translateX(-${activeScreen * 100}%)` }}
                      >
                        {APP_SCREENS.map((screen, index) => (
                          <div key={screen.title} className="w-full h-full flex-shrink-0 relative">
                            <Image
                              src={
                                index === 0
                                  ? '/images/demo_discover_screen.png'
                                  : index === 1
                                  ? '/images/demo_hh_events_screen.png'
                                  : index === 2
                                  ? '/images/demo_rewards_screen.png'
                                  : index === 3
                                  ? '/images/demo_rosie_screen.png'
                                  : '/images/demo_vote_screen.png'
                              }
                              alt={screen.title}
                              fill
                              className="object-cover"
                              sizes="320px"
                              priority={index === 0}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Home Indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-white/30 rounded-full z-20" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Arrow */}
            <button
              onClick={() => goToScreen(activeScreen + 1)}
              className={`p-2 rounded-full transition-all duration-300 ${
                activeScreen < APP_SCREENS.length - 1
                  ? 'text-white/30 hover:text-white/60 hover:bg-white/10 cursor-pointer'
                  : 'text-transparent cursor-default'
              }`}
              disabled={activeScreen === APP_SCREENS.length - 1}
              aria-label="Next screen"
            >
              <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
            </button>
          </div>

          {/* Screen Title & Description */}
          <div className="text-center mt-8">
            <h3 className="text-2xl font-semibold text-white mb-2">
              {APP_SCREENS[activeScreen].title}
            </h3>
            <p className="text-gray-400 text-lg max-w-md mx-auto">
              {APP_SCREENS[activeScreen].description}
            </p>
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center gap-3 mt-6">
            {APP_SCREENS.map((screen, index) => (
              <button
                key={screen.title}
                onClick={() => goToScreen(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === activeScreen
                    ? 'w-3 h-3 bg-tastelanc-accent'
                    : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Go to ${screen.title}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-tastelanc-surface">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How TasteLanc Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Download the App',
                description: 'Get TasteLanc from the App Store or Google Play.',
              },
              {
                step: '2',
                title: 'Explore Lancaster',
                description: 'Browse happy hours, events, and specials at local spots.',
              },
              {
                step: '3',
                title: 'Save & Get Notified',
                description: 'Favorite places and get alerts when deals go live.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-tastelanc-accent rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-tastelanc-accent to-tastelanc-accent-hover rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative">
              <Zap className="w-12 h-12 text-white mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
                TasteLanc is<span className="block sm:inline"> Now Live!</span>
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
                Download the app now and discover Lancaster&apos;s best dining and nightlife.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://apps.apple.com/us/app/tastelanc/id6755852717"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-tastelanc-accent font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2 text-lg"
                >
                  Download for iOS
                  <ChevronRight className="w-5 h-5" />
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.tastelanc.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-green-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2 text-lg"
                >
                  Download for Android
                  <ChevronRight className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Businesses Section */}
      <section className="py-20 px-4 bg-tastelanc-surface">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-tastelanc-accent text-sm font-semibold uppercase tracking-wider">
            Local Business Partners
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mt-2 mb-6">
            Own a Restaurant or Bar<span className="block sm:inline"> in Lancaster?</span>
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            We&apos;re building something special for the Lancaster food and drink scene.
            If you&apos;re interested in being part of it, we&apos;d love to hear from you.
          </p>

          <div className="bg-tastelanc-card rounded-2xl p-8 md:p-10 max-w-xl mx-auto">
            <div className="w-16 h-16 bg-tastelanc-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Star className="w-8 h-8 text-tastelanc-accent" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Partner With TasteLanc
            </h3>
            <p className="text-gray-400 mb-6">
              Join a growing community of local establishments connecting with new customers every day.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Get in Touch
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Rosie Chat Widget */}
      <RosieChatBubble />
    </main>
  );
}
