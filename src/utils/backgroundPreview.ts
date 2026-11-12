// ─── Curated High-Definition Backdrop Library & Matcher ─────────────────────

export const BACKDROP_PHOTO_MAP: { keywords: string[]; id: string }[] = [
  { keywords: ['terracotta', 'clay', 'warm wall', 'brick', 'earthen', 'adobe', 'rustic wall', 'orange wall'], id: '1596178065887-1198b6148b2b' },
  { keywords: ['rainforest', 'jungle', 'canopy', 'amazon', 'palm', 'greenery', 'tropical leaves', 'botanical'], id: '1511497584788-87676104235f' },
  { keywords: ['indigo', 'navy', 'dark blue', 'matte studio', 'deep blue', 'midnight', 'denim'], id: '1550684848-fac1c5b4e853' },
  { keywords: ['hibiscus', 'flower', 'garden', 'blossom', 'floral', 'bloom', 'petal', 'rose'], id: '1508746829417-e6f548d8d6ed' },
  { keywords: ['studio', 'soft white', 'clean wall', 'minimalist', 'empty room', 'interior'], id: '1553356084-58ef4a67b2a7' },
  { keywords: ['grey', 'gray', 'concrete wall', 'cement', 'neutral', 'slate'], id: '1618005182384-a83a8bd57fbe' },
  { keywords: ['marble', 'granite', 'stone', 'quartz', 'luxury surface', 'countertop'], id: '1558618666-fcd25c85cd64' },
  { keywords: ['beige', 'sand', 'linen', 'warm texture', 'plaster', 'cream'], id: '1507003211169-0a1dd7228f2d' },
  { keywords: ['dark', 'black concrete', 'charcoal', 'shadow', 'night'], id: '1604076913837-52ab5629fde9' },
  { keywords: ['wood', 'timber', 'wooden', 'plank', 'oak', 'rustic'], id: '1473186578172-c141e6798cf4' },
  { keywords: ['forest', 'pine', 'nature', 'woods', 'evergreen', 'trees'], id: '1441974231531-c6227db76b6e' },
  { keywords: ['mist', 'mountain', 'fog', 'alpine', 'haze', 'peaks'], id: '1506905925346-21bda4d32df4' },
  { keywords: ['sky', 'clouds', 'sunny', 'sunlit', 'daylight', 'azure'], id: '1500534314209-a25ddb2bd429' },
  { keywords: ['autumn', 'leaves', 'fall', 'orange leaves', 'maple'], id: '1448375240586-882707db888b' },
  { keywords: ['meadow', 'grass', 'field', 'pasture', 'lawn', 'sunlit meadow'], id: '1469474968028-56623f02e42e' },
  { keywords: ['beach', 'sea', 'ocean', 'coast', 'shore', 'tropical sand', 'water'], id: '1507525428034-b723cf961d3e' },
  { keywords: ['sunset', 'sunrise', 'dusk', 'golden hour', 'horizon', 'dawn'], id: '1470770841072-f978cf4d019e' },
  { keywords: ['purple', 'violet', 'magenta', 'fluid', 'abstract purple'], id: '1557672172-298e090bd0f1' },
  { keywords: ['blue swirl', 'fluid blue', 'wave', 'acrylic', 'liquid'], id: '1567359781514-3b964e2b04d6' },
  { keywords: ['starry', 'space', 'galaxy', 'cosmos', 'night sky', 'stars'], id: '1519681393784-d120267933ba' },
  { keywords: ['bokeh', 'lights', 'blur', 'glimmer', 'sparkle'], id: '1550684376-ef124803565e' },
  { keywords: ['gold', 'golden', 'amber', 'warm glow', 'shimmer'], id: '1543158181-e6f9f6712055' },
  { keywords: ['city', 'skyline', 'urban', 'metropolis', 'downtown', 'architecture'], id: '1477959858617-67f85cf4f1df' },
  { keywords: ['street', 'neon', 'cyberpunk', 'night city', 'glow'], id: '1513635269975-59663e0ac1ad' },
  { keywords: ['office', 'interior', 'workspace', 'architectural', 'desk'], id: '1497366216548-37526070297c' },
  { keywords: ['snow', 'winter', 'frost', 'ice', 'white cold'], id: '1418985991508-e47386d96a71' },
  { keywords: ['gradient', 'pink', 'smooth', 'pastel', 'vibrant', 'color'], id: '1579546929518-9e396f3cc809' },
]

export const BACKDROP_FALLBACK_POOL = [
  '1553356084-58ef4a67b2a7',
  '1596178065887-1198b6148b2b',
  '1511497584788-87676104235f',
  '1550684848-fac1c5b4e853',
  '1508746829417-e6f548d8d6ed',
  '1618005182384-a83a8bd57fbe',
  '1558618666-fcd25c85cd64',
  '1507003211169-0a1dd7228f2d',
  '1441974231531-c6227db76b6e',
  '1506905925346-21bda4d32df4',
  '1507525428034-b723cf961d3e',
  '1579546929518-9e396f3cc809',
  '1557672172-298e090bd0f1',
  '1470770841072-f978cf4d019e',
  '1513635269975-59663e0ac1ad',
  '1497366216548-37526070297c',
]

// ─── Background Preview Helper ──────────────────────────────────────────────

export const getBackgroundPreviewUrls = (suggestion: string) => {
  const isColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(suggestion.trim())
  if (isColor) {
    return {
      isColor: true,
      color: suggestion.trim(),
      thumbUrl: null,
      fullUrl: null,
    }
  }

  const cleanPrompt = suggestion.replace(/^\d+[.\-)]\s*/, '').replace(/["']/g, '').toLowerCase().trim()

  let matchedPhotoId: string | null = null
  for (const item of BACKDROP_PHOTO_MAP) {
    if (item.keywords.some(kw => cleanPrompt.includes(kw))) {
      matchedPhotoId = item.id
      break
    }
  }

  if (!matchedPhotoId) {
    let hash = 0
    for (let i = 0; i < cleanPrompt.length; i++) {
      hash = ((hash << 5) - hash) + cleanPrompt.charCodeAt(i)
      hash |= 0
    }
    const idx = Math.abs(hash) % BACKDROP_FALLBACK_POOL.length
    matchedPhotoId = BACKDROP_FALLBACK_POOL[idx]
  }

  return {
    isColor: false,
    color: null,
    thumbUrl: `https://images.unsplash.com/photo-${matchedPhotoId}?w=400&h=280&fit=crop&q=80&auto=format`,
    fullUrl: `https://images.unsplash.com/photo-${matchedPhotoId}?w=1200&h=900&fit=crop&q=85&auto=format`,
  }
}

