import React, { useState, useRef, useEffect, useCallback } from 'react'
import DOMPurify from 'dompurify'
import type { Message, ChatResponse, ImageAnalysis, CaptionStyle } from '../types'
import { chatService } from '../services/chatService'
import { favoriteService } from '../services/favoriteService'
import { imageService } from '../services/imageService'
import { useActiveImage } from '../contexts/ActiveImageContext'
import { useLocation } from 'react-router-dom'

// ─── Mode Types ───────────────────────────────────────────────────────────────

type Mode = 'chat' | 'analysis' | 'suggestions' | 'captions' | 'history'

type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

interface ChatbotWidgetProps {
  position?: Position
}

const MAX_CHARS = 2000

// ─── Conversation History Persistence ────────────────────────────────────────

const HISTORY_STORAGE_KEY = 'chatbot_conversation_history'
const MAX_STORED_SESSIONS = 30

interface StoredSession {
  id: string                // unique session id
  conversationId: string | null
  messages: Message[]
  startedAt: number         // epoch ms of first message
  updatedAt: number         // epoch ms of last message
  preview: string           // first user message, truncated
}

function loadStoredSessions(): StoredSession[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSession[]) : []
  } catch { return [] }
}

function saveSession(session: StoredSession) {
  try {
    const all = loadStoredSessions()
    const idx = all.findIndex(s => s.id === session.id)
    if (idx >= 0) all[idx] = session
    else all.unshift(session)
    // keep only the most recent MAX_STORED_SESSIONS
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(all.slice(0, MAX_STORED_SESSIONS)))
  } catch { /* storage full — fail silently */ }
}

function deleteStoredSession(id: string) {
  try {
    const all = loadStoredSessions().filter(s => s.id !== id)
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}

function clearAllStoredSessions() {
  try { localStorage.removeItem(HISTORY_STORAGE_KEY) } catch { /* ignore */ }
}

// ─── Smart Conversation Helpers ────────────────────────────────────────────

const TOPIC_KEYWORDS: Record<string, string[]> = {
  background: ['background', 'backdrop', 'bg'],
  lighting: ['light', 'lighting', 'bright', 'dark', 'shadow', 'exposure'],
  crop: ['crop', 'frame', 'composition', 'aspect', 'ratio', 'align', 'center'],
  quality: ['quality', 'resolution', 'sharp', 'blur', 'detail', 'pixelat'],
  caption: ['caption', 'write', 'copy', 'description'],
}

function detectTopic(text: string): string {
  const lower = text.toLowerCase()
  for (const topic in TOPIC_KEYWORDS) {
    if (TOPIC_KEYWORDS[topic].some(w => lower.includes(w))) return topic
  }
  return 'general'
}

function detectIntent(text: string): string {
  const lower = text.toLowerCase().trim()
  if (/^(hi|hello|hey|salam|assalam)/.test(lower)) return 'greeting'
  if (lower.endsWith('?') || /^(what|how|why|can|should|is|are|do|does)\b/.test(lower)) return 'question'
  if (/^(make|remove|change|crop|enhance|replace|add|write|generate|suggest)\b/.test(lower)) return 'request'
  if (/(good|bad|great|love|hate|thanks|thank you)/.test(lower)) return 'feedback'
  return 'other'
}

const FOLLOWUP_MAP: Record<string, string[]> = {
  background: ['Suggest another background', 'Make it more minimal'],
  lighting: ['How to fix uneven lighting?', 'Suggest a brighter tone'],
  crop: ['Try a square crop', 'Center the subject better'],
  quality: ['How to improve sharpness?', 'Upscale this image'],
  caption: ['Write a shorter caption', 'Make it more playful'],
  general: ['What should I do next?', 'Any quick improvements?'],
}

function buildFollowUps(topic?: string): string[] {
  return FOLLOWUP_MAP[topic || 'general'] || FOLLOWUP_MAP.general
}

function buildHistoryContext(messages: Message[], maxTurns: number = 3): string {
  if (messages.length === 0) return ''
  const recent = messages.slice(-maxTurns * 2)
  const lines = recent.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
  return `Previous conversation:\n${lines.join('\n')}\n\n`
}

// ─── Error Types ───────────────────────────────────────────────────────────────

type ErrorType = 'auth' | 'rate_limit' | 'timeout' | 'network' | 'generic'

interface ErrorInfo {
  type: ErrorType
  message: string
  retryable: boolean
  timestamp: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TypingDots = () => (
  <div className="flex gap-1 items-center px-4 py-3">
    {[0, 1, 2].map((i) => (
      <span key={i} className="w-1.5 h-1.5 rounded-full bg-magenta animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }} />
    ))}
  </div>
)

const getErrorInfo = (error: any): ErrorInfo => {
  const message = error.response?.data?.detail || error.message || 'An unexpected error occurred'
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('authentication') || lowerMessage.includes('api key')) {
    return {
      type: 'auth',
      message: 'AI service authentication failed. Please check your API key configuration.',
      retryable: false,
      timestamp: Date.now()
    }
  }
  if (lowerMessage.includes('rate limit')) {
    return {
      type: 'rate_limit',
      message: 'AI service rate limit exceeded. Please wait a moment and try again.',
      retryable: true,
      timestamp: Date.now()
    }
  }
  if (lowerMessage.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'AI service timed out. Please check your connection and try again.',
      retryable: true,
      timestamp: Date.now()
    }
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return {
      type: 'network',
      message: 'Network error. Please check your internet connection and try again.',
      retryable: true,
      timestamp: Date.now()
    }
  }

  return {
    type: 'generic',
    message: message || 'An unexpected error occurred. Please try again.',
    retryable: true,
    timestamp: Date.now()
  }
}

const ErrorDisplay: React.FC<{ error: ErrorInfo; onRetry?: () => void; onDismiss?: () => void }> = ({ error, onRetry, onDismiss }) => {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'auth':
        return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      case 'rate_limit':
        return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      case 'timeout':
        return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      case 'network':
        return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
      default:
        return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    }
  }

  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <div className="text-danger shrink-0 mt-0.5">{getErrorIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-danger font-medium">{error.message}</p>
          <div className="flex items-center gap-2 mt-2">
            {error.retryable && onRetry && (
              <button onClick={onRetry} className="text-[10px] font-semibold text-danger hover:text-danger/80 underline underline-offset-1">
                Try Again
              </button>
            )}
            {onDismiss && (
              <button onClick={onDismiss} className="text-[10px] text-muted hover:text-primary">
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const formatMessage = (text: string, isUser: boolean) => {
  if (isUser) return <span className="text-white font-medium text-[12px]">{text}</span>

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  html = html.replace(/^###\s+(.*)$/gm, '<h4 class="text-[12px] font-black text-primary mt-2 mb-1">$1</h4>')
  html = html.replace(/^##\s+(.*)$/gm, '<h3 class="text-[13px] font-black text-primary mt-2.5 mb-1">$1</h3>')
  html = html.replace(/^#\s+(.*)$/gm, '<h2 class="text-sm font-black text-primary mt-3 mb-1.5">$1</h2>')

  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<div class="flex gap-2 items-start pl-1 mt-1"><span class="text-magenta/80 mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-magenta"></span><span class="text-secondary">$1</span></div>')

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-primary">$1</strong>')

  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-secondary/90">$1</em>')

  html = html.replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-surface-raised border border-border font-mono text-[10.5px] text-magenta">$1</code>')

  html = html.replace(/\n/g, '<br />')

  const safeHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h2', 'h3', 'h4', 'strong', 'em', 'code', 'div', 'span', 'br'],
    ALLOWED_ATTR: ['class'],
  })

  return <div dangerouslySetInnerHTML={{ __html: safeHtml }} className="space-y-1 text-secondary text-[12px] leading-relaxed" />
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Compact Image Uploader ───────────────────────────────────────────────────

interface MiniUploaderProps {
  file: File | null
  previewUrl: string | null
  onUpload: (f: File) => void
  onRemove: () => void
}

const MiniUploader: React.FC<MiniUploaderProps> = ({ file, previewUrl, onUpload, onRemove }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) onUpload(f)
  }

  if (previewUrl && file) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-surface-raised border border-border rounded-xl">
        <img src={previewUrl} alt="uploaded" className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-primary truncate">{file.name}</p>
          <p className="text-[10px] text-muted">{fmtSize(file.size)}</p>
        </div>
        <button onClick={onRemove}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-all shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex items-center gap-3 px-4 py-3 border border-dashed rounded-xl cursor-pointer transition-all ${
        dragging ? 'border-magenta/60 bg-magenta/5' : 'border-border hover:border-magenta hover:bg-surface-raised'
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-magenta/10 border border-magenta/20 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-magenta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <p className="text-xs font-semibold text-primary">Upload an image</p>
        <p className="text-[10px] text-muted">Click or drag & drop — JPG, PNG, WEBP</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
    </div>
  )
}

// ─── Chat Message Bubble ──────────────────────────────────────────────────────

interface WidgetMessageProps {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string | null
  copied?: boolean
  onCopy?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onResend?: () => void
  onFavorite?: () => void
  favorited?: boolean
  topic?: string
}

const WidgetMessage: React.FC<WidgetMessageProps> = ({ role, content, thinking, copied, onCopy, onEdit, onDelete, onResend, onFavorite, favorited, topic }) => {
  const isUser = role === 'user'
  const [showThinking, setShowThinking] = useState(false)
  return (
    <div className={`group flex gap-2 max-w-[92%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border text-[9px] font-black ${
        isUser ? 'bg-magenta/10 border-magenta/20 text-magenta' : 'bg-teal/10 border-teal/20 text-teal'
      }`}>
        {isUser ? 'U' : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
      </div>
      <div className="flex flex-col gap-1 max-w-full">
        {!isUser && thinking && (
          <div className="rounded-xl border border-border bg-surface-raised overflow-hidden text-[10px]">
            <button onClick={() => setShowThinking(!showThinking)}
              className="flex items-center justify-between w-full px-3 py-1.5 text-secondary hover:text-primary transition-colors font-medium gap-3 bg-surface">
              <span className="flex items-center gap-1">
                <svg className="w-2.5 h-2.5 text-magenta animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {showThinking ? 'Hide thinking' : 'Show thinking'}
              </span>
              <svg className={`w-2.5 h-2.5 transition-transform ${showThinking ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showThinking && (
              <div className="p-2.5 text-secondary border-t border-border bg-surface max-h-28 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {thinking}
              </div>
            )}
          </div>
        )}
        {!isUser && topic && topic !== 'general' && (
          <span className="self-start px-2 py-0.5 rounded-full bg-teal/10 border border-teal/20 text-teal text-[9px] font-bold uppercase tracking-wide">
            {topic}
          </span>
        )}
        <div className="relative">
          <div className={`rounded-2xl px-3 py-2.5 shadow-md ${
            isUser ? 'bg-gradient-brand text-white rounded-tr-none' : 'bg-surface border border-border rounded-tl-none'
          }`}>
            {formatMessage(content, isUser)}
          </div>
          {/* Quick actions — visible on hover */}
          <div className={`absolute top-0 ${isUser ? 'right-full mr-1.5' : 'left-full ml-1.5'} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
            {isUser ? (
              <>
                {onEdit && (
                  <button onClick={onEdit} title="Edit & resend" className="w-5 h-5 rounded-md bg-surface-raised border border-border flex items-center justify-center text-muted hover:text-primary hover:border-magenta/40 transition-all">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828z" /></svg>
                  </button>
                )}
                {onResend && (
                  <button onClick={onResend} title="Resend" className="w-5 h-5 rounded-md bg-surface-raised border border-border flex items-center justify-center text-muted hover:text-primary hover:border-magenta/40 transition-all">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                )}
              </>
            ) : (
              onCopy && (
                <button onClick={onCopy} title="Copy" className="w-5 h-5 rounded-md bg-surface-raised border border-border flex items-center justify-center text-muted hover:text-primary hover:border-magenta/40 transition-all">
                  {copied
                    ? <svg className="w-2.5 h-2.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002-2h2a2 2 0 012 2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  }
                </button>
              )
            )}
            {onFavorite && !isUser && (
              <button onClick={onFavorite} title={favorited ? 'Favorited' : 'Add to favorites'}
                className={`w-5 h-5 rounded-md bg-surface-raised border flex items-center justify-center transition-all ${favorited ? 'text-amber-400 border-amber-400/40' : 'text-muted border-border hover:text-amber-400 hover:border-amber-400/40'}`}>
                <svg className="w-2.5 h-2.5" fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} title="Delete" className="w-5 h-5 rounded-md bg-surface-raised border border-border flex items-center justify-center text-muted hover:text-danger hover:border-danger/40 transition-all">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── Main Widget ──────────────────────────────────────────────────────────────

const SIZE_PRESETS = {
  compact:  { width: 380, height: 560 },
  standard: { width: 480, height: 680 },
  large:    { width: 620, height: 820 },
} as const

type SizeKey = keyof typeof SIZE_PRESETS
const MIN_WIDTH = 340
const MAX_WIDTH = 900
const MIN_HEIGHT = 420
const MAX_HEIGHT_VH = 92

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  position: initialPosition = 'bottom-right',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('chat')
  const [unread, setUnread] = useState(0)

  // Handle custom event to open chatbot in specific mode
  useEffect(() => {
    const handleOpenChatbot = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: Mode }>
      if (customEvent.detail?.mode) {
        setMode(customEvent.detail.mode)
      }
      setIsOpen(true)
      setIsMinimized(false)
    }
    
    window.addEventListener('open-chatbot', handleOpenChatbot)
    return () => {
      window.removeEventListener('open-chatbot', handleOpenChatbot)
    }
  }, [])

  const [position, setPosition] = useState<Position>(initialPosition)
  const [size, setSize] = useState<{ width: number; height: number }>(SIZE_PRESETS.standard)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const [showPositionMenu, setShowPositionMenu] = useState(false)
  const positionMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showPositionMenu) return
    function handler(e: MouseEvent) {
      if (positionMenuRef.current && !positionMenuRef.current.contains(e.target as Node)) {
        setShowPositionMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPositionMenu])

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    resizeStartRef.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height }
    setIsResizing(true)
  }

  useEffect(() => {
    if (!isResizing) return
    const onMove = (e: MouseEvent) => {
      const start = resizeStartRef.current
      if (!start) return
      const growsLeft = position === 'bottom-right' || position === 'top-right'
      const growsUp = position === 'top-right' || position === 'top-left'
      const deltaX = growsLeft ? (start.x - e.clientX) : (e.clientX - start.x)
      const deltaY = growsUp ? (e.clientY - start.y) : (start.y - e.clientY)
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, start.w + deltaX))
      const newHeight = Math.min(window.innerHeight * (MAX_HEIGHT_VH / 100), Math.max(MIN_HEIGHT, start.h + deltaY))
      setSize({ width: newWidth, height: newHeight })
    }
    const onUp = () => { setIsResizing(false); resizeStartRef.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isResizing, position])

  const applySizePreset = (key: SizeKey) => setSize(SIZE_PRESETS[key])

  const { activeFile: contextFile, activePreviewUrl: contextPreviewUrl, setActiveImage } = useActiveImage()
  const [internalFile, setInternalFile] = useState<File | null>(null)
  const [internalPreviewUrl, setInternalPreviewUrl] = useState<string | null>(null)
  const activeFile = contextFile ?? internalFile
  const activePreviewUrl = contextPreviewUrl ?? internalPreviewUrl

  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const [storedSessions, setStoredSessions] = useState<StoredSession[]>([])
  const [historyExpanded, setHistoryExpanded] = useState<string | null>(null)
  const [historySearchQuery, setHistorySearchQuery] = useState('')
  const location = useLocation()
  const currentPath = location.pathname

  const getSuggestionsForPath = (path: string): string[] => {
    switch (path) {
      case '/enhance': return ['How to enhance detail?', 'Color correction tips', 'Is the lighting good?']
      case '/replace-bg': return ['Backdrop ideas', 'Suggest matching color', 'Lighting matching help']
      case '/smart-crop': return ['Rule of thirds advice', 'Best aspect ratio?', 'Is subject centered?']
      case '/batch': return ['Batch workflows', 'Standardize styling', 'Optimizing format']
      case '/history': return ['Analyzing my history', 'Clear history help', 'Download options']
      case '/': default: return ['Suggest a background', 'How should I edit this?', 'Write a caption']
    }
  }

  const getPromptContextForPath = (path: string): string => {
    switch (path) {
      case '/enhance': return 'System context: The user is currently on the Image Enhance page. Focus your advice on image quality, resolution, contrast, detail recovery, color balancing, and sharpening adjustments.'
      case '/replace-bg': return 'System context: The user is currently on the Replace Background page. Focus your advice on background composition, lighting/shadow matching, background color choices, and aesthetic themes.'
      case '/smart-crop': return 'System context: The user is currently on the Smart Crop page. Focus your advice on image composition, rule of thirds, framing, grid alignment, aspect ratios, and centering.'
      case '/batch': return 'System context: The user is currently on the Batch Processing page. Focus your advice on managing high volumes of images, processing queues, scaling, file organization, and bulk standardizations.'
      case '/history': return 'System context: The user is currently on the History page. Focus your advice on organizing past runs, downloading transparent PNG outputs, and managing previous project history logs.'
      case '/': default: return 'System context: The user is currently on the Background Remover home page. Focus your advice on transparency, background separation, edge smoothness, and basic export options.'
    }
  }

  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<ErrorInfo | null>(null)
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set())
  const [showBatch, setShowBatch] = useState(false)
  const [batchFiles, setBatchFiles] = useState<File[]>([])
  const [batchResults, setBatchResults] = useState<{ name: string; status: 'pending' | 'done' | 'error'; summary: string }[]>([])
  const [batchRunning, setBatchRunning] = useState(false)
  const batchFileInputRef = useRef<HTMLInputElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const chatFileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<ErrorInfo | null>(null)

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<ErrorInfo | null>(null)

  const [captions, setCaptions] = useState<string[]>([])
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('casual')
  const [captionsLoading, setCaptionsLoading] = useState(false)
  const [captionsError, setCaptionsError] = useState<ErrorInfo | null>(null)
  const [selectedCaption, setSelectedCaption] = useState<number | null>(null)
  const [copiedCaption, setCopiedCaption] = useState<number | null>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, chatLoading])

  // Persist active session to localStorage whenever messages change
  useEffect(() => {
    if (messages.length === 0) return
    const userMessages = messages.filter(m => m.role === 'user')
    if (userMessages.length === 0) return
    const session: StoredSession = {
      id: sessionIdRef.current,
      conversationId,
      messages,
      startedAt: messages[0].timestamp,
      updatedAt: messages[messages.length - 1].timestamp,
      preview: userMessages[0].content.slice(0, 80),
    }
    saveSession(session)
  }, [messages, conversationId])

  useEffect(() => {
    if (isOpen && mode === 'chat') setTimeout(() => chatInputRef.current?.focus(), 150)
    if (isOpen) setUnread(0)
    // Refresh stored sessions whenever the history tab is opened
    if (isOpen && mode === 'history') setStoredSessions(loadStoredSessions())
  }, [isOpen, mode])

  // Fetch persisted conversation once, the first time the widget is opened.
  useEffect(() => {
    if (!isOpen || historyLoaded) return
    setHistoryLoaded(true)
    // Load all locally stored sessions right away
    setStoredSessions(loadStoredSessions())
    chatService.getHistory()
      .then(res => {
        setConversationId(res.conversation_id)
        if (res.messages.length > 0) {
          const restored: Message[] = res.messages.map((m, i) => ({
            id: `restored-${i}-${Date.now()}`,
            role: m.role,
            content: m.content,
            timestamp: Date.now(),
          }))
          setMessages(restored)
        }
      })
      .catch(() => { /* best-effort: chat still works without restored history */ })
  }, [isOpen, historyLoaded])

  useEffect(() => {
    if (contextFile) { setInternalFile(null); setInternalPreviewUrl(null) }
  }, [contextFile])

  const handleUpload = useCallback((f: File) => {
    const url = URL.createObjectURL(f)
    setInternalFile(f)
    setInternalPreviewUrl(url)
    setAnalysis(null); setSuggestions([]); setCaptions([]); setSelectedCaption(null)
  }, [])

  const handleRemoveImage = () => {
    setInternalFile(null)
    setInternalPreviewUrl(null)
    setActiveImage(null, null)
    setAnalysis(null); setSuggestions([]); setCaptions([]); setSelectedCaption(null)
  }

  const handleChatAttachClick = () => chatFileInputRef.current?.click()
  const handleChatFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f && f.type.startsWith('image/')) handleUpload(f)
    e.target.value = ''
  }

  const sendChat = async (retryMessage: string | null = null) => {
    const text = retryMessage || chatInput.trim()
    if (!text || chatLoading) return
    const topic = detectTopic(text)
    const intent = detectIntent(text)
    const historyContext = buildHistoryContext(messages)
    const userMsg: Message = { id: Date.now() + '-u', role: 'user', content: text, timestamp: Date.now(), topic }
    setMessages(prev => [...prev, userMsg])
    setChatInput('')
    setPendingChatMessage(null)
    setEditingId(null)
    setChatLoading(true); setChatError(null)
    try {
      const routeContext = getPromptContextForPath(currentPath)
      const combinedText = `${routeContext}\n\n${historyContext}User Message (intent: ${intent}): ${text}`
      const backendHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res: ChatResponse = await chatService.sendMessage(combinedText, activeFile, conversationId, backendHistory)
      setConversationId(res.conversation_id)
      const aiMsg: Message = { id: Date.now() + '-a', role: 'assistant', content: res.reply, thinking: res.thinking, timestamp: Date.now(), topic: detectTopic(res.reply) }
      setMessages(prev => [...prev, aiMsg])
      if (!isOpen) setUnread(n => n + 1)
    } catch (e: any) {
      const errorInfo = getErrorInfo(e)
      setChatError(errorInfo)
      setPendingChatMessage(text)
      setMessages(prev => prev.filter(msg => msg.id !== userMsg.id))
    } finally { setChatLoading(false) }
  }

  const retryChat = () => { if (pendingChatMessage) sendChat(pendingChatMessage) }
  const handleClearConversation = async () => {
    try {
      await chatService.clearHistory(conversationId)
    } catch { /* best-effort */ }
    setMessages([])
    setConversationId(null)
    setChatError(null)
    setPendingChatMessage(null)
    // Start a fresh session ID so the next conversation is stored separately
    sessionIdRef.current = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  const handleChatKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() }
  }

  const handleCopyMessage = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(id)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch { /* ignore */ }
  }

  const handleToggleFavorite = async (id: string, content: string) => {
    if (favoritedIds.has(id)) return
    try {
      await favoriteService.create(content, 'chat')
      setFavoritedIds(prev => new Set(prev).add(id))
    } catch { /* ignore */ }
  }

  const handleBatchFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/')).slice(0, 10)
    setBatchFiles(files)
    setBatchResults([])
    e.target.value = ''
  }

  const runBatch = async () => {
    if (batchFiles.length === 0 || batchRunning) return
    setBatchRunning(true)
    setBatchResults(batchFiles.map(f => ({ name: f.name, status: 'pending' as const, summary: '' })))
    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i]
      try {
        let summary = ''
        if (mode === 'analysis') {
          const data = await imageService.analyze(file)
          summary = `${data.subject} — ${data.image_type}`
        } else if (mode === 'suggestions') {
          const data = await imageService.getSuggestions(file)
          summary = data.suggestions.slice(0, 2).join(' | ')
        } else if (mode === 'captions') {
          const data = await imageService.generateCaptions(file, captionStyle)
          summary = data.captions[0] || ''
        }
        setBatchResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'done', summary } : r))
      } catch {
        setBatchResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'error', summary: 'Failed' } : r))
      }
    }
    setBatchRunning(false)
  }

  const toggleBatch = () => {
    setShowBatch(v => !v)
    setBatchFiles([])
    setBatchResults([])
  }

  const handleDeleteMessage = (id: string) => setMessages(prev => prev.filter(m => m.id !== id))

  const handleEditMessage = (id: string, content: string) => {
    const idx = messages.findIndex(m => m.id === id)
    if (idx !== -1) setMessages(prev => prev.slice(0, idx))
    setChatInput(content)
    setEditingId(id)
    setTimeout(() => chatInputRef.current?.focus(), 50)
  }

  const handleResendMessage = (content: string) => sendChat(content)

  const runAnalysis = async () => {
    if (!activeFile || analysisLoading) return
    setAnalysisLoading(true); setAnalysisError(null); setAnalysis(null)
    try {
      const data = await imageService.analyze(activeFile)
      setAnalysis(data)
    } catch (e: any) { setAnalysisError(getErrorInfo(e)) }
    finally { setAnalysisLoading(false) }
  }
  const retryAnalysis = () => runAnalysis()

  const runSuggestions = async () => {
    if (!activeFile || suggestionsLoading) return
    setSuggestionsLoading(true); setSuggestionsError(null); setSuggestions([])
    try {
      const data = await imageService.getSuggestions(activeFile)
      setSuggestions(data.suggestions)
    } catch (e: any) { setSuggestionsError(getErrorInfo(e)) }
    finally { setSuggestionsLoading(false) }
  }
  const retrySuggestions = () => runSuggestions()

  const runCaptions = async (style: CaptionStyle = captionStyle) => {
    if (!activeFile || captionsLoading) return
    setCaptionsLoading(true); setCaptionsError(null); setCaptions([]); setSelectedCaption(null)
    try {
      const data = await imageService.generateCaptions(activeFile, style)
      setCaptions(data.captions)
    } catch (e: any) { setCaptionsError(getErrorInfo(e)) }
    finally { setCaptionsLoading(false) }
  }
  const retryCaptions = () => runCaptions()

  const handleStyleChange = (s: CaptionStyle) => {
    setCaptionStyle(s)
    if (captions.length > 0) runCaptions(s)
  }

  const copyCaption = async (text: string, idx: number) => {
    try { await navigator.clipboard.writeText(text); setCopiedCaption(idx); setTimeout(() => setCopiedCaption(null), 2000) }
    catch { /* ignore */ }
  }

  const isTop = position.startsWith('top')
  const isLeft = position.endsWith('left')
  const panelSideClass = isLeft ? 'left-6' : 'right-6'
  const panelVerticalClass = isTop ? 'top-[5.5rem]' : 'bottom-[5.5rem]'
  const triggerVerticalClass = isTop ? 'top-6' : 'bottom-6'

  const positionOptions: { id: Position; label: string }[] = [
    { id: 'bottom-right', label: 'Bottom Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'top-left', label: 'Top Left' },
  ]

  const modes: { id: Mode; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'chat', label: 'Chat', color: 'indigo', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
    { id: 'analysis', label: 'Analyze', color: 'emerald', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { id: 'suggestions', label: 'Suggest', color: 'amber', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
    { id: 'captions', label: 'Caption', color: 'violet', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg> },
    { id: 'history', label: 'History', color: 'rose', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ]

  const charCount = chatInput.length
  const charPct = charCount / MAX_CHARS
  const charColor = charPct >= 1 ? 'text-danger' : charPct >= 0.9 ? 'text-amber-500' : 'text-muted'

  const renderModeContent = () => {
    if (mode === 'chat') {
      return (
        <div className="flex flex-col flex-1 overflow-hidden">
          {activeFile && (
            <div className="px-3 pt-2 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success/5 border border-success/20 rounded-xl">
                {activePreviewUrl && <img src={activePreviewUrl} alt="" className="w-6 h-6 rounded object-cover" />}
                <p className="text-[10px] text-success font-semibold truncate flex-1">Image context loaded — AI can see your image</p>
                <button onClick={handleRemoveImage} title="Remove image" className="text-success/70 hover:text-danger transition-colors shrink-0">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          )}
          {editingId && (
            <div className="px-3 pt-2 shrink-0">
              <div className="flex items-center justify-between px-3 py-1.5 bg-magenta/5 border border-magenta/20 rounded-xl">
                <p className="text-[10px] text-magenta font-semibold">Editing message — resend to replace it</p>
                <button onClick={() => { setEditingId(null); setChatInput('') }} className="text-magenta/70 hover:text-danger transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-none">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-6">
                <p className="text-xs font-bold text-primary">Start a conversation</p>
                <p className="text-[10px] text-secondary mt-1 leading-relaxed">
                  {activeFile ? 'I can see your image. Ask anything about it!' : 'Upload an image below or ask a general question.'}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                  {getSuggestionsForPath(currentPath).map(chip => (
                    <button key={chip} onClick={() => { setChatInput(chip); chatInputRef.current?.focus() }}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-magenta/10 border border-magenta/20 text-magenta hover:bg-magenta/20 transition-all">
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <WidgetMessage
                    key={msg.id}
                    id={msg.id}
                    role={msg.role}
                    content={msg.content}
                    thinking={msg.thinking}
                    copied={copiedMessageId === msg.id}
                    onCopy={msg.role === 'assistant' ? () => handleCopyMessage(msg.id, msg.content) : undefined}
                    onEdit={msg.role === 'user' ? () => handleEditMessage(msg.id, msg.content) : undefined}
                    onResend={msg.role === 'user' ? () => handleResendMessage(msg.content) : undefined}
                    onDelete={() => handleDeleteMessage(msg.id)}
                    onFavorite={msg.role === 'assistant' ? () => handleToggleFavorite(msg.id, msg.content) : undefined}
                    favorited={favoritedIds.has(msg.id)}
                    topic={msg.topic}
                  />
                ))}
                {chatLoading && (
                  <div className="flex gap-2 mr-auto">
                    <div className="w-6 h-6 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div className="rounded-2xl rounded-tl-none bg-surface-raised border border-border"><TypingDots /></div>
                  </div>
                )}
                {chatError && (
                  <ErrorDisplay error={chatError} onRetry={chatError.retryable ? retryChat : undefined} onDismiss={() => setChatError(null)} />
                )}
                {!chatLoading && !chatError && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                  <div className="flex flex-wrap gap-1.5 pl-8">
                    {buildFollowUps(messages[messages.length - 1].topic).map(chip => (
                      <button key={chip} onClick={() => { setChatInput(chip); chatInputRef.current?.focus() }}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-teal/10 border border-teal/20 text-teal hover:bg-teal/20 transition-all">
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-border bg-surface-raised p-2.5 flex flex-col gap-1.5 shrink-0">
            <div className="flex gap-2 items-end">
              {messages.length > 0 && (
                <button onClick={() => { setMessages([]); setChatError(null); setPendingChatMessage(null); setEditingId(null) }} title="Clear"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-all mb-[1px] shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
              <button onClick={handleChatAttachClick} title="Attach image"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-magenta hover:bg-magenta/10 transition-all mb-[1px] shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              </button>
              <input ref={chatFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleChatFileSelected} />
              <textarea ref={chatInputRef} value={chatInput}
                onChange={e => setChatInput(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={handleChatKey}
                disabled={chatLoading} rows={1} placeholder="Ask something..."
                maxLength={MAX_CHARS}
                className="flex-1 bg-surface border border-border border-r-0 rounded-xl px-3 py-2 text-[12.5px] text-primary placeholder-muted outline-none resize-none focus:border-magenta focus:ring-1 focus:ring-magenta/30 transition-all scrollbar-none"
                style={{ height: '36px', maxHeight: '140px' }}
                onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = '36px'; t.style.height = Math.min(t.scrollHeight, 140) + 'px' }} />
              <button onClick={() => sendChat()} disabled={chatLoading || !chatInput.trim()}
                className="w-9 h-9 rounded-xl bg-magenta hover:bg-magenta/90 text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 shadow-md shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
            <div className="flex justify-end px-1">
              <span className={`text-[9.5px] font-medium tabular-nums ${charColor}`}>{charCount}/{MAX_CHARS}</span>
            </div>
          </div>
        </div>
      )
    }

    if (mode === 'analysis') {
      return (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-3 space-y-2 shrink-0">
            <MiniUploader file={activeFile} previewUrl={activePreviewUrl} onUpload={handleUpload} onRemove={handleRemoveImage} />
            <button onClick={runAnalysis} disabled={!activeFile || analysisLoading}
              className="w-full py-2 rounded-xl bg-teal hover:bg-teal/90 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 shadow-md">
              {analysisLoading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing...</> : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>Run Visual Analysis</>}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 scrollbar-none">
            {analysisError && <ErrorDisplay error={analysisError} onRetry={analysisError.retryable ? retryAnalysis : undefined} onDismiss={() => setAnalysisError(null)} />}
            {analysis && !analysisLoading && (
              <div className="space-y-2">
                {[
                  { label: 'Subject', value: analysis.subject },
                  { label: 'Image Type', value: analysis.image_type },
                  { label: 'Background', value: analysis.background_description },
                  { label: 'Suggested Use', value: analysis.suggested_use },
                ].map(card => (
                  <div key={card.label} className="bg-surface-raised border border-border rounded-xl p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">{card.label}</p>
                    <p className="text-[12px] text-secondary leading-relaxed">{card.value}</p>
                  </div>
                ))}
                {analysis.editing_recommendations.length > 0 && (
                  <div className="bg-surface-raised border border-border rounded-xl p-3 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted">Editing Roadmap</p>
                    {analysis.editing_recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="w-4 h-4 rounded-full bg-magenta/10 border border-magenta/20 text-magenta text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-[11.5px] text-secondary leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!analysis && !analysisLoading && !analysisError && (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <p className="text-[11px] text-muted">{activeFile ? 'Click "Run Visual Analysis" to get AI insights.' : 'Upload an image to get started.'}</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (mode === 'suggestions') {
      return (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-3 space-y-2 shrink-0">
            <MiniUploader file={activeFile} previewUrl={activePreviewUrl} onUpload={handleUpload} onRemove={handleRemoveImage} />
            <button onClick={runSuggestions} disabled={!activeFile || suggestionsLoading}
              className="w-full py-2 rounded-xl bg-magenta hover:bg-magenta/90 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 shadow-md">
              {suggestionsLoading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</> : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>Get Background Suggestions</>}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 scrollbar-none">
            {suggestionsError && <ErrorDisplay error={suggestionsError} onRetry={suggestionsError.retryable ? retrySuggestions : undefined} onDismiss={() => setSuggestionsError(null)} />}
            {suggestions.length > 0 && !suggestionsLoading && (
              <div className="space-y-2">
                {suggestions.map((sug, i) => (
                  <div key={i} className="flex gap-3 items-start bg-surface border border-border hover:border-magenta rounded-xl p-3 transition-all group">
                    <span className="w-5 h-5 rounded-lg bg-magenta/10 border border-magenta/20 text-magenta text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-[12px] text-secondary leading-relaxed group-hover:text-primary transition-colors">{sug}</p>
                  </div>
                ))}
              </div>
            )}
            {suggestions.length === 0 && !suggestionsLoading && !suggestionsError && (
              <div className="h-full flex items-center justify-center py-8">
                <p className="text-[11px] text-muted text-center">{activeFile ? 'Click the button above to get background recommendations.' : 'Upload an image to get started.'}</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (mode === 'captions') {
      const stylesList: { id: CaptionStyle; label: string }[] = [
        { id: 'casual', label: 'Casual' },
        { id: 'instagram', label: 'Instagram' },
        { id: 'professional', label: 'LinkedIn' },
        { id: 'product', label: 'Product' },
        { id: 'marketing', label: 'Ad Copy' },
      ]
      return (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-3 space-y-2 shrink-0">
            <MiniUploader file={activeFile} previewUrl={activePreviewUrl} onUpload={handleUpload} onRemove={handleRemoveImage} />
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {stylesList.map(s => (
                <button key={s.id} onClick={() => handleStyleChange(s.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${captionStyle === s.id ? 'bg-magenta/20 border-magenta/40 text-magenta' : 'bg-surface border border-border text-secondary hover:text-primary hover:border-magenta'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <button onClick={() => runCaptions(captionStyle)} disabled={!activeFile || captionsLoading}
              className="w-full py-2 rounded-xl bg-teal hover:bg-teal/90 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 shadow-md">
              {captionsLoading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Writing captions...</> : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>Generate Captions</>}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 scrollbar-none">
            {captionsError && <ErrorDisplay error={captionsError} onRetry={captionsError.retryable ? retryCaptions : undefined} onDismiss={() => setCaptionsError(null)} />}
            {captions.length > 0 && !captionsLoading && (
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted px-1">Click a caption to copy it</p>
                {captions.map((cap, i) => (
                  <div key={i} onClick={() => setSelectedCaption(i)}
                    className={`rounded-xl border p-3 cursor-pointer transition-all ${selectedCaption === i ? 'border-magenta/40 bg-magenta/5' : 'border-border bg-surface hover:border-border-strong'}`}>
                    <div className="flex items-start gap-2">
                      <span className={`w-4 h-4 rounded shrink-0 flex items-center justify-center text-[9px] font-black border ${selectedCaption === i ? 'bg-magenta border-magenta text-white' : 'bg-surface-raised border-border text-muted'}`}>{i + 1}</span>
                      <p className="text-[11.5px] text-secondary italic leading-relaxed">"{cap}"</p>
                    </div>
                    {selectedCaption === i && (
                      <button onClick={e => { e.stopPropagation(); copyCaption(cap, i) }}
                        className="mt-2 ml-6 px-3 py-1 rounded-lg bg-magenta hover:bg-magenta/90 text-[10px] font-bold text-white flex items-center gap-1.5 transition-all active:scale-95">
                        {copiedCaption === i ? <><svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span className="text-success">Copied!</span></> : <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 00-2 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>Copy</>}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {captions.length === 0 && !captionsLoading && !captionsError && (
              <div className="h-full flex items-center justify-center py-8">
                <p className="text-[11px] text-muted text-center">{activeFile ? 'Pick a style and generate captions.' : 'Upload an image to get started.'}</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (mode === 'history') {
      const allSessions = storedSessions
      const filtered = historySearchQuery.trim()
        ? allSessions.filter(s =>
            s.preview.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
            s.messages.some(m => m.content.toLowerCase().includes(historySearchQuery.toLowerCase()))
          )
        : allSessions

      // Group sessions by date label
      function dateLabel(ts: number): string {
        const d = new Date(ts)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays} days ago`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays < 14 ? '' : 's'} ago`
        return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      }

      // Build grouped list preserving order
      const grouped: { label: string; sessions: StoredSession[] }[] = []
      for (const s of filtered) {
        const lbl = dateLabel(s.updatedAt)
        const existing = grouped.find(g => g.label === lbl)
        if (existing) existing.sessions.push(s)
        else grouped.push({ label: lbl, sessions: [s] })
      }

      const handleRestoreSession = (session: StoredSession) => {
        setMessages(session.messages)
        setConversationId(session.conversationId)
        sessionIdRef.current = session.id
        setMode('chat')
      }

      const handleDeleteSession = (id: string) => {
        deleteStoredSession(id)
        setStoredSessions(loadStoredSessions())
        if (historyExpanded === id) setHistoryExpanded(null)
      }

      const handleClearAll = () => {
        clearAllStoredSessions()
        setStoredSessions([])
        setHistoryExpanded(null)
      }

      return (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="px-3 pt-3 pb-2 shrink-0 flex flex-col gap-2">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input
                type="text"
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-xl text-[12px] text-primary placeholder-muted outline-none focus:border-magenta focus:ring-1 focus:ring-magenta/30 transition-all"
              />
              {historySearchQuery && (
                <button
                  onClick={() => setHistorySearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-danger transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            {/* Stats row */}
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] text-muted font-medium">
                {filtered.length} conversation{filtered.length !== 1 ? 's' : ''}
                {historySearchQuery ? ' found' : ' stored'}
              </span>
              {allSessions.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] font-semibold text-muted hover:text-danger transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4 scrollbar-none">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border flex items-center justify-center">
                  <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-primary">
                    {historySearchQuery ? 'No matches found' : 'No history yet'}
                  </p>
                  <p className="text-[10px] text-muted mt-0.5 max-w-[180px] leading-relaxed">
                    {historySearchQuery
                      ? 'Try a different search term.'
                      : 'Start a chat — your conversations will appear here automatically.'}
                  </p>
                </div>
              </div>
            ) : (
              grouped.map(group => (
                <div key={group.label}>
                  {/* Date group header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-muted">{group.label}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="space-y-1.5">
                    {group.sessions.map(session => {
                      const isExpanded = historyExpanded === session.id
                      const msgCount = session.messages.length
                      const userCount = session.messages.filter(m => m.role === 'user').length
                      const time = new Date(session.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

                      return (
                        <div
                          key={session.id}
                          className="rounded-xl border border-border bg-surface overflow-hidden transition-all"
                        >
                          {/* Session header row — always visible */}
                          <div className="flex items-start gap-2 px-3 py-2.5">
                            {/* Icon */}
                            <div className="w-7 h-7 rounded-lg bg-magenta/10 border border-magenta/20 flex items-center justify-center shrink-0 mt-0.5">
                              <svg className="w-3.5 h-3.5 text-magenta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>

                            {/* Preview text + meta */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold text-primary truncate leading-snug">
                                {session.preview || 'Conversation'}
                              </p>
                              <p className="text-[10px] text-muted mt-0.5">
                                {userCount} message{userCount !== 1 ? 's' : ''} · {msgCount} total · {time}
                              </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Restore / open in chat */}
                              <button
                                onClick={() => handleRestoreSession(session)}
                                title="Restore this conversation"
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-muted hover:text-magenta hover:bg-magenta/10 transition-all"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>

                              {/* Expand / collapse */}
                              <button
                                onClick={() => setHistoryExpanded(isExpanded ? null : session.id)}
                                title={isExpanded ? 'Collapse' : 'View messages'}
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-surface-raised transition-all"
                              >
                                <svg
                                  className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                title="Delete"
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-all"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Expanded message thread */}
                          {isExpanded && (
                            <div className="border-t border-border bg-surface-raised px-3 py-2 space-y-2 max-h-64 overflow-y-auto scrollbar-none">
                              {session.messages.map((msg, idx) => (
                                <div
                                  key={idx}
                                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                  {msg.role === 'assistant' && (
                                    <div className="w-5 h-5 rounded-md bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0 mt-0.5">
                                      <svg className="w-2.5 h-2.5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                  <div
                                    className={`max-w-[78%] rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed ${
                                      msg.role === 'user'
                                        ? 'bg-magenta text-white rounded-tr-none'
                                        : 'bg-surface border border-border text-secondary rounded-tl-none'
                                    }`}
                                  >
                                    {msg.content.length > 200 ? msg.content.slice(0, 200) + '…' : msg.content}
                                  </div>
                                  {msg.role === 'user' && (
                                    <div className="w-5 h-5 rounded-md bg-magenta/10 border border-magenta/20 flex items-center justify-center shrink-0 mt-0.5">
                                      <svg className="w-2.5 h-2.5 text-magenta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {/* Restore CTA at bottom of thread */}
                              <div className="pt-1">
                                <button
                                  onClick={() => handleRestoreSession(session)}
                                  className="w-full py-1.5 rounded-lg bg-magenta/10 border border-magenta/20 text-[10px] font-bold text-magenta hover:bg-magenta/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Continue this conversation
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )
    }

    return null
  }

  const panelWidthStyle: React.CSSProperties = isFullscreen
    ? { width: 'calc(100vw - 24px)', height: 'calc(100vh - 24px)', top: '12px', bottom: '12px', left: isLeft ? '12px' : undefined, right: !isLeft ? '12px' : undefined }
    : {
        width: `${size.width}px`,
        maxWidth: 'calc(100vw - 24px)',
        height: `${size.height}px`,
        maxHeight: 'calc(100vh - 96px)',
        [isTop ? 'top' : 'bottom']: '88px',
        [isLeft ? 'left' : 'right']: '24px',
      }

  // Escape key always closes the widget, even if it somehow renders off-screen.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  return (
    <>
      {isMinimized && isOpen && (
        <button
          onClick={() => setIsMinimized(false)}
          className={`fixed ${panelSideClass} ${triggerVerticalClass} z-[9999] flex items-center gap-2 pl-2 pr-3 py-2 rounded-full bg-surface border border-border shadow-lg hover:shadow-xl transition-all`}
        >
          <span className="w-6 h-6 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </span>
          <span className="text-[11px] font-bold text-primary">AI Assistant</span>
          {unread > 0 && <span className="w-4 h-4 rounded-full bg-danger text-white text-[9px] font-black flex items-center justify-center">{unread}</span>}
        </button>
      )}

      {!isMinimized && (
        <div
          className={`fixed ${isFullscreen ? 'inset-3' : `${panelSideClass} ${panelVerticalClass}`} z-[9999] transition-all duration-300 ease-out ${isOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}`}
          style={isOpen ? panelWidthStyle : undefined}
        >
          <div className="relative flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border bg-surface w-full h-full">
            {!isFullscreen && (
              <div
                onMouseDown={startResize}
                title="Drag to resize"
                className={`absolute ${isTop ? 'bottom-0' : 'top-0'} ${isLeft ? 'right-0' : 'left-0'} w-5 h-5 z-10 flex items-center justify-center cursor-nwse-resize opacity-40 hover:opacity-100 transition-opacity`}
                style={{ cursor: (isLeft === isTop) ? 'nesw-resize' : 'nwse-resize' }}
              >
                <svg className="w-3 h-3 text-muted" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="12" cy="4" r="1.2" /><circle cx="12" cy="8" r="1.2" /><circle cx="12" cy="12" r="1.2" />
                  <circle cx="8" cy="8" r="1.2" /><circle cx="8" cy="12" r="1.2" /><circle cx="4" cy="12" r="1.2" />
                </svg>
              </div>
            )}

            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-sm shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-primary leading-none truncate">AI Assistant</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                    <p className="text-[9px] text-success font-semibold tracking-wide truncate">
                      {activeFile ? `Image loaded · ${activeFile.name.slice(0, 18)}...` : 'Online · Ready'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <div className="relative" ref={positionMenuRef}>
                  <button onClick={() => setShowPositionMenu(v => !v)} title="Move widget"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" /></svg>
                  </button>
                  {showPositionMenu && (
                    <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-border bg-surface shadow-lg z-50 overflow-hidden animate-fade-up">
                      {positionOptions.map(opt => (
                        <button key={opt.id} onClick={() => { setPosition(opt.id); setShowPositionMenu(false) }}
                          className={`w-full text-left px-3 py-1.5 text-[11px] font-medium transition-colors ${position === opt.id ? 'text-magenta bg-magenta/5' : 'text-secondary hover:text-primary hover:bg-surface-raised'}`}>
                          {opt.label}
                        </button>
                      ))}
                      <div className="border-t border-border" />
                      {(Object.keys(SIZE_PRESETS) as SizeKey[]).map(key => (
                        <button key={key} onClick={() => { applySizePreset(key); setShowPositionMenu(false) }}
                          className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-secondary hover:text-primary hover:bg-surface-raised transition-colors capitalize">
                          {key} size
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => setIsMinimized(true)} title="Minimize"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" /></svg>
                </button>

                <button onClick={() => setIsFullscreen(v => !v)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface transition-all">
                  {isFullscreen ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m7 5l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m6-5l5 5m0 0v-4m0 4h-4" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  )}
                </button>

                {mode !== 'chat' && (
                  <button onClick={toggleBatch} title="Batch mode"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${showBatch ? 'text-magenta bg-magenta/10' : 'text-secondary hover:text-primary hover:bg-surface'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 12h16M4 19h16" /></svg>
                  </button>
                )}
                <button onClick={handleClearConversation} title="Clear conversation"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-danger hover:bg-danger/10 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                {activePreviewUrl && <img src={activePreviewUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-border opacity-80 mx-1" />}
                <button onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="flex border-b border-border bg-surface-raised shrink-0">
              {modes.map(m => {
                const isActive = mode === m.id
                return (
                  <button key={m.id} onClick={() => setMode(m.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-bold transition-all border-b-2 ${isActive ? 'border-magenta text-magenta bg-magenta/5' : 'border-transparent text-secondary hover:text-primary hover:bg-surface'}`}>
                    {m.icon}
                    {m.label}
                  </button>
                )
              })}
            </div>

            {showBatch && mode !== 'chat' && (
              <div className="p-3 border-b border-border bg-surface-raised space-y-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => batchFileInputRef.current?.click()}
                    className="flex-1 py-1.5 rounded-lg border border-dashed border-border text-[10px] font-semibold text-secondary hover:text-primary hover:border-magenta transition-all">
                    {batchFiles.length > 0 ? `${batchFiles.length} image(s) selected` : 'Select up to 10 images'}
                  </button>
                  <input ref={batchFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBatchFilesSelected} />
                  <button onClick={runBatch} disabled={batchFiles.length === 0 || batchRunning}
                    className="px-3 py-1.5 rounded-lg bg-magenta hover:bg-magenta/90 text-[10px] font-bold text-white transition-all disabled:opacity-30">
                    {batchRunning ? 'Running...' : 'Run batch'}
                  </button>
                </div>
                {batchResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {batchResults.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <span className={`w-3 h-3 rounded-full shrink-0 flex items-center justify-center ${r.status === 'done' ? 'bg-success/20 text-success' : r.status === 'error' ? 'bg-danger/20 text-danger' : 'bg-muted/20 text-muted animate-pulse'}`} />
                        <span className="font-semibold text-primary shrink-0 max-w-[80px] truncate">{r.name}</span>
                        <span className="text-secondary truncate">{r.summary}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {renderModeContent()}
          </div>
        </div>
      )}

      {(!isOpen || isMinimized) && (
        <button onClick={() => { setIsOpen(o => !o); setIsMinimized(false); setUnread(0) }}
          className={`fixed ${triggerVerticalClass} ${panelSideClass} z-[9999] w-14 h-14 rounded-2xl bg-gradient-brand text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 border border-white/10 transition-all duration-300 ${isMinimized && isOpen ? 'hidden' : ''}`}>
          <div className={`transition-all duration-300 absolute ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <div className={`transition-all duration-300 absolute ${isOpen ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          {unread > 0 && !isOpen && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white text-[10px] font-black flex items-center justify-center border-2 border-surface">
              {unread}
            </span>
          )}
        </button>
      )}
    </>
  )
}

export default ChatbotWidget

// ─── Curated High-Definition Backdrop Library & Matcher ─────────────────────

const BACKDROP_PHOTO_MAP: { keywords: string[]; id: string }[] = [
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

const BACKDROP_FALLBACK_POOL = [
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
