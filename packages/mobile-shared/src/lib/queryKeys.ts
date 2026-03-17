// Query keys for type safety and consistency
export const queryKeys = {
  restaurants: {
    all: ['restaurants'] as const,
    list: (category?: string) => ['restaurants', 'list', category] as const,
    detail: (id: string) => ['restaurants', 'detail', id] as const,
    search: (query: string, category?: string) => ['restaurants', 'search', query, category] as const,
    recommendations: ['restaurants', 'recommendations'] as const,
  },
  happyHours: {
    all: ['happyHours'] as const,
    byRestaurant: (restaurantId: string) => ['happyHours', restaurantId] as const,
  },
  specials: {
    all: ['specials'] as const,
    byRestaurant: (restaurantId: string) => ['specials', restaurantId] as const,
    today: ['specials', 'today'] as const,
  },
  events: {
    all: ['events'] as const,
    byRestaurant: (restaurantId: string) => ['events', restaurantId] as const,
    upcoming: ['events', 'upcoming'] as const,
  },
  hours: {
    byRestaurant: (restaurantId: string) => ['hours', restaurantId] as const,
  },
  openStatus: {
    today: (dayOfWeek: string) => ['openStatus', dayOfWeek] as const,
  },
  favorites: ['favorites'] as const,
  user: {
    preferences: ['user', 'preferences'] as const,
    subscription: ['user', 'subscription'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
  },
  itineraries: {
    all: ['itineraries'] as const,
    detail: (id: string) => ['itineraries', 'detail', id] as const,
  },
  blog: {
    all: ['blog'] as const,
    list: ['blog', 'list'] as const,
    detail: (slug: string) => ['blog', 'detail', slug] as const,
  },
  sales: {
    inbox: (search?: string, filter?: string, inbox?: string) => ['sales', 'inbox', search, filter, inbox] as const,
    thread: (email: string) => ['sales', 'thread', email] as const,
    senderIdentity: ['sales', 'senderIdentity'] as const,
    unreadCount: ['sales', 'unreadCount'] as const,
    leads: (status?: string, search?: string, page?: number) => ['sales', 'leads', status, search, page] as const,
    leadDetail: (id: string) => ['sales', 'lead', id] as const,
  },
  visits: {
    all: (userId: string) => ['visits', userId] as const,
    list: (userId: string, limit?: number) => ['visits', userId, 'list', limit] as const,
    counts: (userId: string) => ['visits', userId, 'counts'] as const,
    recent: (userId: string, days?: number) => ['visits', userId, 'recent', days] as const,
  },
  rewards: {
    balance: (userId: string) => ['rewards', 'balance', userId] as const,
    history: (userId: string) => ['rewards', 'history', userId] as const,
  },
  wishlist: ['wishlist'] as const,
  socialProof: {
    platform: ['socialProof', 'platform'] as const,
    personal: (userId: string) => ['socialProof', 'personal', userId] as const,
    restaurant: (restaurantId: string) => ['socialProof', 'restaurant', restaurantId] as const,
    trending: ['socialProof', 'trending'] as const,
  },
  coupons: {
    all: ['coupons'] as const,
    active: (marketId?: string | null) => ['coupons', 'active', marketId] as const,
    list: (marketId?: string | null) => ['coupons', 'list', marketId] as const,
    byRestaurant: (restaurantId: string) => ['coupons', restaurantId] as const,
    myClaims: ['coupons', 'myClaims'] as const,
  },
  ads: {
    active: ['ads', 'active'] as const,
  },
  recommendations: {
    byRestaurant: (restaurantId: string) => ['recommendations', 'restaurant', restaurantId] as const,
    byUser: (userId: string) => ['recommendations', 'user', userId] as const,
    trending: (marketId?: string) => ['recommendations', 'trending', marketId] as const,
    likes: (userId: string) => ['recommendations', 'likes', userId] as const,
    reviewerStats: (userId: string) => ['recommendations', 'reviewerStats', userId] as const,
  },
  notifications: {
    enabled: ['notifications', 'enabled'] as const,
  },
  promoCard: {
    visible: (promoId: string) => ['promoCard', promoId] as const,
  },
};
