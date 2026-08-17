import apiClient from './apiClient'
import type { ChatResponse } from '../types'

export const chatService = {
  async sendMessage(message: string, file?: File | null): Promise<ChatResponse> {
    const formData = new FormData()
    formData.append('message', message)
    if (file) {
      formData.append('file', file)
    }
    const { data } = await apiClient.post<ChatResponse>('/api/chat', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },
}
