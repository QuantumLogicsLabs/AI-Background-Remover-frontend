import apiClient from './apiClient'
import type { ChatResponse, ChatHistoryResponse, ChatHistoryMessage } from '../types'

export const chatService = {
  async sendMessage(
    message: string,
    file?: File | null,
    conversationId?: string | null,
    history?: ChatHistoryMessage[]
  ): Promise<ChatResponse> {
    const formData = new FormData()
    formData.append('message', message)
    if (file) {
      formData.append('file', file)
    }
    if (conversationId) {
      formData.append('conversation_id', conversationId)
    }
    if (history && history.length > 0) {
      formData.append('history', JSON.stringify(history))
    }
    // Do NOT set Content-Type manually — axios auto-sets multipart/form-data
    // with the correct boundary when it detects a FormData body.
    // Manually setting it drops the boundary and causes FastAPI to reject the request.
    const { data } = await apiClient.post<ChatResponse>('/api/chat', formData)
    return data
  },
  async getHistory(conversationId?: string | null): Promise<ChatHistoryResponse> {
    const { data } = await apiClient.get<ChatHistoryResponse>('/api/chat/history', {
      params: conversationId ? { conversation_id: conversationId } : undefined,
    })
    return data
  },
  async clearHistory(conversationId?: string | null): Promise<void> {
    await apiClient.delete('/api/chat/history', {
      params: conversationId ? { conversation_id: conversationId } : undefined,
    })
  },
}
