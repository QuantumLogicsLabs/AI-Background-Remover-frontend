// ── Chat ────────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string | null
  action?: any
  timestamp: number
  topic?: string
}

export interface ChatResponse {
  reply: string
  thinking?: string | null
  action?: any
}

// ── Image Analysis ───────────────────────────────────────────────────────────

export interface ImageAnalysis {
  subject: string
  image_type: string
  background_description: string
  suggested_use: string
  editing_recommendations: string[]
  quality_score?: number
  quality_rating?: string
  edge_score?: number
  lighting_score?: number
  sharpness_score?: number
  isolation_score?: number
  color_palette?: ColorPaletteItem[]
}

// ── Caption ──────────────────────────────────────────────────────────────────

export type CaptionStyle =
  | 'instagram'
  | 'professional'
  | 'product'
  | 'marketing'
  | 'casual'

export interface CaptionResponse {
  caption: string
  style: CaptionStyle
}

export interface CaptionsResponse {
  captions: string[]
  style: CaptionStyle
}

// ── Background Suggestions ───────────────────────────────────────────────────

export interface BackgroundSuggestionsResponse {
  suggestions: string[]
}

// ── Favorites ─────────────────────────────────────────────────────────────

export interface Favorite {
  favorite_id: string
  user_id: string
  content: string
  source: 'chat' | 'caption' | 'suggestion'
  created_at: string
}

// ── Advanced Analysis ──────────────────────────────────────────────────────────

export interface DetectedObject {
  label: string
  box_2d: [number, number, number, number]
  confidence: number
}

export interface ColorPaletteItem {
  hex: string
  name: string
  percentage: number
  text_color: string
  use_case: string
}

export interface StyleTransferRecommendation {
  style: string
  description: string
  prompts: string
}

export interface CompositionAnalysis {
  rule_of_thirds: string
  leading_lines: string
  balance: string
  crop_recommendation: string
}

export interface OptimalEnhancementSettings {
  brightness: number
  contrast: number
  saturation: number
  sharpness: number
  denoise: boolean
  auto_wb: boolean
  denoise_strength: number
}

export interface SuggestedCropSettings {
  aspect_ratio: string
  padding_pct: number
}

export interface AdvancedAnalysis {
  object_detection: DetectedObject[]
  color_palette: ColorPaletteItem[]
  style_transfer: StyleTransferRecommendation[]
  composition: CompositionAnalysis
  suggested_backgrounds: string[]
  optimal_enhancement: OptimalEnhancementSettings
  suggested_crop: SuggestedCropSettings
  suggested_filename: string
}

export interface BatchAdvancedAnalysisItem {
  filename: string
  status: 'success' | 'error'
  analysis?: AdvancedAnalysis
  error?: string
}

export interface BatchAdvancedAnalysisResponse {
  results: BatchAdvancedAnalysisItem[]
}
