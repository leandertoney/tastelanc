'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface FavoriteButtonProps {
  restaurantId: string;
  className?: string;
}

export default function FavoriteButton({ restaurantId, className = '' }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      setIsLoggedIn(!!user);

      if (user) {
        try {
          const response = await fetch(`/api/favorites?restaurant_id=${restaurantId}`);
          const data = await response.json();
          setIsFavorited(data.isFavorited);
        } catch (error) {
          console.error('Error checking favorite status:', error);
        }
      }
      setIsLoading(false);
    };

    checkStatus();
  }, [restaurantId]);

  const toggleFavorite = async () => {
    if (!isLoggedIn) {
      // Redirect to login
      window.location.href = `/login?redirect=/restaurants/${restaurantId}`;
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorited) {
        await fetch(`/api/favorites?restaurant_id=${restaurantId}`, {
          method: 'DELETE',
        });
        setIsFavorited(false);
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurant_id: restaurantId }),
        });
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }

    setIsLoading(false);
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`p-2 rounded-full transition-all ${
        isFavorited
          ? 'bg-red-500 text-white'
          : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20'
      } ${isLoading ? 'opacity-50' : ''} ${className}`}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`}
      />
    </button>
  );
}
