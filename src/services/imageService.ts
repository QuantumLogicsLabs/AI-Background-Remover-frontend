import apiClient from './apiClient'
import type {
  ImageAnalysis,
  CaptionStyle,
  CaptionsResponse,
  BackgroundSuggestionsResponse,
  AdvancedAnalysis,
  BatchAdvancedAnalysisResponse,
} from '../types'

export const imageService = {
  async analyze(file: File): Promise<ImageAnalysis> {
    const formData = new FormData()
    formData.append('file', file)
    // Do NOT set Content-Type manually — axios auto-sets multipart/form-data
    // with the correct boundary. Overriding it drops the boundary.
    const { data } = await apiClient.post<ImageAnalysis>('/api/image/analyze', formData)
    return data
  },

  async generateCaptions(file: File, style: CaptionStyle = 'casual'): Promise<CaptionsResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('style', style)
    const { data } = await apiClient.post<CaptionsResponse>('/api/image/captions', formData)
    return data
  },

  async getSuggestions(file: File): Promise<BackgroundSuggestionsResponse> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<BackgroundSuggestionsResponse>('/api/image/suggestions', formData)
    return data
  },

  async analyzeAdvanced(file: File): Promise<AdvancedAnalysis> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<AdvancedAnalysis>('/api/image/analyze-advanced', formData)
    return data
  },

  async analyzeAdvancedBatch(files: File[]): Promise<BatchAdvancedAnalysisResponse> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    const { data } = await apiClient.post<BatchAdvancedAnalysisResponse>('/api/image/analyze-advanced-batch', formData)
    return data
  },
}
