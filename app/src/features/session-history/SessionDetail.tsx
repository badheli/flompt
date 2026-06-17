import { ArrowLeft, User, Bot } from 'lucide-react'
import { useSessionStore } from './useSessionStore'

export default function SessionDetail() {
  const { selectedSession, selectSession } = useSessionStore()

  if (!selectedSession) return null

  const { title, platform, messages, created_at } = selectedSession
  const date = new Date(created_at).toLocaleDateString()

  return (
    <div className="session-detail block-list-view-cards">
      <div className="block-list-toolbar">
        <div className="block-list-toolbar-left">
          <button className="canvas-ctrl-btn" onClick={() => selectSession(null)} aria-label="Back to sessions">
            <ArrowLeft size={13} />
          </button>
        </div>
        <div className="block-list-toolbar-center">
          <span style={{ fontSize: 12, color: 'var(--text)' }}>{title || 'Untitled'}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>{platform} · {date}</span>
        </div>
        <div className="block-list-toolbar-right" />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((msg, i) => (
          <div key={i} className={`session-msg-card session-msg--${msg.role}`}>
            <span className="session-msg-role">
              {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
              {msg.role === 'user' ? 'You' : 'AI'}
            </span>
            <div className="session-msg-content">{msg.content}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
