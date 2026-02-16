'use client';

import { useState, useRef, useEffect } from 'react';
import { BRAND } from '@/config/market';
import { Smartphone, ChevronRight, X } from 'lucide-react';

const IOS_URL = BRAND.appStoreUrls.ios;
const ANDROID_URL = BRAND.appStoreUrls.android;
const HAS_APP = !!(IOS_URL || ANDROID_URL);

interface DownloadButtonsProps {
  variant?: 'full' | 'compact' | 'single';
  className?: string;
  showIcon?: boolean;
}

// Full variant: Shows both iOS and Android buttons side by side
// Compact variant: Shows a single "Download" button that opens a dropdown
// Single variant: Shows a single "Download App" button that opens a modal

export function DownloadButtons({ variant = 'full', className = '', showIcon = true }: DownloadButtonsProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!HAS_APP) {
    return (
      <div className={`text-gray-400 text-sm font-medium ${className}`}>
        {BRAND.name} App — Coming Soon
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
        <a
          href={IOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {showIcon && <Smartphone className="w-5 h-5" />}
          Download for iOS
        </a>
        <a
          href={ANDROID_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {showIcon && <Smartphone className="w-5 h-5" />}
          Download for Android
        </a>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          {showIcon && <Smartphone className="w-4 h-4" />}
          Download App
          <ChevronRight className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-90' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute top-full mt-2 right-0 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg shadow-xl z-50 overflow-hidden min-w-[200px]">
            <a
              href={IOS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 text-white hover:bg-tastelanc-accent transition-colors"
              onClick={() => setShowDropdown(false)}
            >
              Download for iOS
            </a>
            <a
              href={ANDROID_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 text-white hover:bg-green-600 transition-colors border-t border-tastelanc-surface-light"
              onClick={() => setShowDropdown(false)}
            >
              Download for Android
            </a>
          </div>
        )}
      </div>
    );
  }

  // Single variant with modal
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${className}`}
      >
        {showIcon && <Smartphone className="w-4 h-4" />}
        Download App
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-tastelanc-surface rounded-2xl max-w-sm w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2 text-center">Download {BRAND.name}</h3>
            <p className="text-gray-400 text-sm mb-6 text-center">Choose your platform</p>

            <div className="space-y-3">
              <a
                href={IOS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-6 py-4 rounded-lg transition-colors text-center"
                onClick={() => setShowModal(false)}
              >
                Download for iOS
              </a>
              <a
                href={ANDROID_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-4 rounded-lg transition-colors text-center"
                onClick={() => setShowModal(false)}
              >
                Download for Android
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Header-specific download button for navigation
export function HeaderDownloadButton() {
  return <DownloadButtons variant="compact" showIcon={false} />;
}

// Nav link style for header navigation
export function NavDownloadLink({ className = '' }: { className?: string }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!HAS_APP) return null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="text-lancaster-gold hover:text-yellow-400 transition-colors flex items-center gap-1 font-medium"
      >
        Download App
        <ChevronRight className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-90' : ''}`} />
      </button>

      {showDropdown && (
        <div className="absolute top-full mt-2 right-0 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg shadow-xl z-50 overflow-hidden min-w-[180px]">
          {IOS_URL && (
            <a
              href={IOS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 text-white hover:bg-tastelanc-accent transition-colors text-sm"
              onClick={() => setShowDropdown(false)}
            >
              iOS (App Store)
            </a>
          )}
          {ANDROID_URL && (
            <a
              href={ANDROID_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`block px-4 py-3 text-white hover:bg-green-600 transition-colors text-sm ${IOS_URL ? 'border-t border-tastelanc-surface-light' : ''}`}
              onClick={() => setShowDropdown(false)}
            >
              Android (Google Play)
            </a>
          )}
        </div>
      )}
    </div>
  );
}
