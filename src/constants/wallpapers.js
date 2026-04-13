const RAILWAY_URL = 'https://clarity-app-production-e136.up.railway.app'

export const WALLPAPERS = [
  {
    id: 'none',
    name: 'None',
    emoji: '⬛',
    isPro: false,
    uri: null,
    thumb: null,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    isPro: false,
    uri: `${RAILWAY_URL}/video/ocean.mp4`,
    thumb: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200',
  },
  {
    id: 'waterfall',
    name: 'Waterfall',
    emoji: '💧',
    isPro: false,
    uri: `${RAILWAY_URL}/video/waterfall.mp4`,
    thumb: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=200',
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌿',
    isPro: true,
    uri: `${RAILWAY_URL}/video/forest.mp4`,
    thumb: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200',
  },
  {
    id: 'rain',
    name: 'Rain',
    emoji: '🌧️',
    isPro: true,
    uri: `${RAILWAY_URL}/video/rain.mp4`,
    thumb: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=200',
  },
]