import { useState, useEffect, useRef } from 'react'
import { Download, Save, User, Bot } from 'lucide-react'
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
  const seenRef = useRef(new Set<string>())

  useEffect(() => {
    if (!isExtension) return
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'FLOMPT_PLATFORM_INFO' && e.data.pageUrl) {
        setPageUrl(e.data.pageUrl)
      }
      if (e.data?.type === 'FLOMPT_MESSAGES_RESULT' && Array.isArray(e.data.messages)) {
        const incoming: Message[] = e.data.messages
        const fresh = incoming.filter(m => !seenRef.current.has(msgHash(m)))
        fresh.forEach(m => seenRef.current.add(msgHash(m)))
        if (fresh.length > 0) {
          setMessages(prev => [...prev, ...fresh])
        }
        setSaved(false)
        if (e.data.pageUrl) setPageUrl(e.data.pageUrl)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const handleFetch = () => {
    if (!isExtension) return
    window.parent.postMessage({ type: 'FLOMPT_FETCH_MESSAGES' }, '*')
  }

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
              <button className="btn btn-primary" onClick={handleFetch}>
                <Download size={14} /> Fetch
              </button>
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
