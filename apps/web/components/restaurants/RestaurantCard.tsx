import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { Restaurant } from '@/types/database';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="group block bg-tastelanc-card rounded-xl overflow-hidden hover:ring-2 hover:ring-tastelanc-accent transition-all"
    >
      <div className="aspect-[4/3] bg-tastelanc-surface relative">
        {restaurant.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.cover_image_url}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-bold text-tastelanc-surface-light">
              {restaurant.name.charAt(0)}
            </span>
          </div>
        )}
        {restaurant.is_verified && (
          <Badge variant="accent" className="absolute top-2 right-2">
            Verified
          </Badge>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white group-hover:text-tastelanc-accent transition-colors">
          {restaurant.name}
        </h3>
        <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
          <MapPin className="w-3 h-3" />
          {restaurant.city}, {restaurant.state}
        </p>
        {restaurant.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {restaurant.categories.slice(0, 2).map((cat) => (
              <Badge key={cat} variant="default">
                {cat.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
