import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-tastelanc-surface-light rounded',
        className
      )}
    />
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="bg-tastelanc-card rounded-xl overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function HappyHourCardSkeleton() {
  return (
    <div className="bg-tastelanc-card rounded-lg p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
