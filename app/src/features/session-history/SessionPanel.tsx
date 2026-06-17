import { useEffect, useState } from 'react'
import { X, MessageSquare, Trash2, Clock, Search } from 'lucide-react'
import { useSessionStore, type Session } from './useSessionStore'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function SessionPanel() {
  const { isOpen, sessions, setOpen, selectSession, loadSessions, deleteSession } = useSessionStore()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isOpen) loadSessions()
  }, [isOpen])

  const q = search.toLowerCase()
  const filtered = q ? sessions.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.platform.toLowerCase().includes(q)
  ) : sessions

  if (!isOpen) return null

  return (
    <>
      <div className="debugger-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className="version-panel" role="dialog" aria-label="Session History" aria-modal="true">
        <div className="debugger-header">
          <div className="debugger-brand">
            <MessageSquare size={15} />
            <span className="debugger-title">Session History</span>
          </div>
          <button className="ide-close-btn" onClick={() => setOpen(false)} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="memory-search">
          <Search size={13} className="memory-search-icon" />
          <input
            className="memory-search-input"
            placeholder="Search sessions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="version-list">
          {sessions.length === 0 ? (
            <div className="debugger-empty">No sessions yet.</div>
          ) : filtered.length === 0 ? (
            <div className="debugger-empty">No sessions match "{search}"</div>
          ) : (
            filtered.map((s: Session) => (
              <div key={s.id} className="version-item" style={{ cursor: 'pointer' }} onClick={() => { selectSession(s); setOpen(false) }}>
                <div className="version-item-header">
                  <span className="version-item-label">{s.title || 'Untitled'}</span>
                  <span className="version-item-time"><Clock size={10} /> {timeAgo(s.created_at)}</span>
                </div>
                <span className="version-item-tokens">
                  {s.platform} · {s.messages.length} messages
                </span>
                <div className="version-item-actions">
                  <button
                    className="ide-action-btn ide-action-btn--danger"
                    title="Delete"
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
