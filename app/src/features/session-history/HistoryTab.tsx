import { useState, useEffect, useRef, useCallback } from 'react'
import { Download, Save, User, Bot, RefreshCw } from 'lucide-react'
import { isExtension } from '@/lib/platform'
import type { Message } from './useSessionStore'

const API_BASE = '/api/conversations'

function msgHash(m: Message): string {
  return `${m.role}:${(m.content || '').slice(0, 200)}`
}

function getCurrentPlatform(): string {
  if (typeof window === 'undefined') return 'unknown'
  const h = window.location.hostname
  if (h.includes('chatgpt.com') || h.includes('openai.com')) return 'chatgpt'
  if (h.includes('claude.ai')) return 'claude'
  if (h.includes('chat.deepseek.com')) return 'deepseek'
  if (h.includes('gemini.google.com')) return 'gemini'
  if (h.includes('aistudio.google.com')) return 'aistudio'
  return h
}

export default function HistoryTab() {
  const [messages, setMessages] = useState<Message[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pageUrl, setPageUrl] = useState<string | null>(null)
  const [autoFetch, setAutoFetch] = useState(false)
  const seenRef = useRef(new Set<string>())
  const seqRef = useRef(0)  // insertion order for each message

  useEffect(() => {
    if (!isExtension) return
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'FLOMPT_PLATFORM_INFO' && e.data.pageUrl) {
        setPageUrl(e.data.pageUrl)
      }
      if (e.data?.type === 'FLOMPT_MESSAGES_RESULT' && Array.isArray(e.data.messages)) {
        const incoming: Message[] = e.data.messages
        const fresh = incoming.filter(m => !seenRef.current.has(msgHash(m)))
        fresh.forEach(m => { seenRef.current.add(msgHash(m)); (m as any).__seq = ++seqRef.current })
        if (fresh.length > 0) {
          setMessages(prev => [...prev, ...fresh].sort((a, b) => ((a as any).__seq || 0) - ((b as any).__seq || 0)))
        }
        setSaved(false)
        if (e.data.pageUrl) setPageUrl(e.data.pageUrl)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const doFetch = useCallback(() => {
    if (!isExtension) return
    window.parent.postMessage({ type: 'FLOMPT_FETCH_MESSAGES' }, '*')
  }, [])

  // Auto-fetch: poll every 2s when toggle is on
  useEffect(() => {
    if (!autoFetch) return
    const id = setInterval(doFetch, 2000)
    return () => clearInterval(id)
  }, [autoFetch, doFetch])

  const handleSave = async () => {
    if (messages.length === 0 || saving) return
    setSaving(true)
    const title = messages.find((m) => m.role === 'user')?.content?.slice(0, 60) || ''

    try {
      await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: getCurrentPlatform(),
          messages,
          title: title + (title.length >= 60 ? '...' : ''),
          page_url: pageUrl,
        }),
      })
      setSaved(true)
    } catch (err) {
      console.error('[flompt] Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="history-tab">
      <div className="block-list-toolbar">
        <div className="block-list-toolbar-actions">
          {isExtension && (
            <>
              <button className="btn btn-primary" onClick={doFetch}>
                <Download size={14} /> Fetch
              </button>
              <button
                className={`btn ${autoFetch ? 'btn-accent' : 'btn-secondary'}`}
                onClick={() => setAutoFetch(v => !v)}
                title={autoFetch ? 'Auto-fetching every 2s' : 'Manual fetch only'}
              >
                <RefreshCw size={14} className={autoFetch ? 'icon-spin' : ''} /> Auto
              </button>
              {autoFetch && <span className="history-saved-hint" style={{ fontSize: 10 }}>{messages.length} msgs</span>}
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || messages.length === 0}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save'}
              </button>
              {saved && <span className="history-saved-hint">Saved</span>}
            </>
          )}
        </div>
      </div>
      <div className="block-list-view-cards">
        {messages.length === 0 ? (
          <p className="session-empty">{isExtension ? 'Click Fetch to extract conversation from this page.' : 'No conversation loaded.'}</p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`session-msg-card session-msg--${msg.role}`}>
              <span className="session-msg-role">
                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                {msg.role === 'user' ? 'You' : 'AI'}
              </span>
              <div className="session-msg-content">{msg.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
