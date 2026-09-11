import apiClient from './apiClient'

// ── Similarity Search ────────────────────────────────────────────────────────

export interface SimilarityResult {
  image_id: string
  filename: string
  score: number
  download_url: string
}

export interface SimilaritySearchResponse {
  query_image_id: string
  total_indexed: number
  results: SimilarityResult[]
}

export interface IndexImageResponse {
  image_id: string
  filename: string
  total_indexed: number
  message: string
}

// ── Categorization ────────────────────────────────────────────────────────────

export interface CategorizationResponse {
  image_id: string
  filename: string
  category: string
  confidence: number
  scores: Record<string, number>
  method: string
}

// ── Duplicate Detection ───────────────────────────────────────────────────────

export interface DuplicateMatch {
  image_id: string
  filename: string
  duplicate_type: 'exact' | 'resized' | 'cropped' | 'similar'
  hamming_distance: number
  download_url: string
}

export interface DuplicateCheckResponse {
  query_image_id: string
  has_duplicates: boolean
  total_found: number
  duplicates: DuplicateMatch[]
  query_md5: string
  query_phash: string
}

export interface IndexForDuplicatesResponse {
  image_id: string
  filename: string
  md5: string
  message: string
}

// ── Service ────────────────────────────────────────────────────────────────────

export const mlService = {
  // Similarity
  async indexForSimilarity(
    file: File,
    imageId = '',
    downloadUrl = '',
  ): Promise<IndexImageResponse> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('image_id', imageId)
    fd.append('download_url', downloadUrl)
    const { data } = await apiClient.post<IndexImageResponse>('/api/ml/similarity/index', fd)
    return data
  },

  async searchSimilar(file: File, topK = 10): Promise<SimilaritySearchResponse> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('top_k', String(topK))
    const { data } = await apiClient.post<SimilaritySearchResponse>('/api/ml/similarity/search', fd)
    return data
  },

  async getSimilarityCount(): Promise<{ total_indexed: number }> {
    const { data } = await apiClient.get<{ user_id: string; total_indexed: number }>(
      '/api/ml/similarity/count',
    )
    return data
  },

  // Categorization
  async categorize(file: File): Promise<CategorizationResponse> {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await apiClient.post<CategorizationResponse>('/api/ml/categorize', fd)
    return data
  },

  // Duplicates
  async indexForDuplicates(
    file: File,
    imageId = '',
    downloadUrl = '',
  ): Promise<IndexForDuplicatesResponse> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('image_id', imageId)
    fd.append('download_url', downloadUrl)
    const { data } = await apiClient.post<IndexForDuplicatesResponse>(
      '/api/ml/duplicates/index',
      fd,
    )
    return data
  },

  async checkDuplicates(file: File): Promise<DuplicateCheckResponse> {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await apiClient.post<DuplicateCheckResponse>('/api/ml/duplicates/check', fd)
    return data
  },
}
