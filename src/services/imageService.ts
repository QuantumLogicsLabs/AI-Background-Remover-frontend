import apiClient from './apiClient'
import type {
  ImageAnalysis,
  CaptionStyle,
  CaptionsResponse,
  BackgroundSuggestionsResponse,
} from '../types'

export const imageService = {
  async analyze(file: File): Promise<ImageAnalysis> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<ImageAnalysis>('/api/image/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },

  async generateCaptions(file: File, style: CaptionStyle = 'casual'): Promise<CaptionsResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('style', style)
    const { data } = await apiClient.post<CaptionsResponse>('/api/image/captions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },

  async getSuggestions(file: File): Promise<BackgroundSuggestionsResponse> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<BackgroundSuggestionsResponse>('/api/image/suggestions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },
}
