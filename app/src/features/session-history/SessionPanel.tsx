import { useEffect } from 'react'
import { X, MessageSquare, Trash2, ChevronDown, ChevronRight, User, Bot } from 'lucide-react'
import { useSessionStore, type Session } from './useSessionStore'
import { Tooltip } from '@/components/ui/tooltip'

function SessionRow({ session, isExpanded, onToggle, onDelete }: {
  session: Session
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const date = new Date(session.created_at).toLocaleDateString()

  return (
    <div className="session-row">
      <div className="session-row-header" onClick={onToggle}>
        <span className="session-row-chevron">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <div className="session-row-info">
          <span className="session-row-title">{session.title || 'Untitled'}</span>
          <span className="session-row-meta">
            {session.platform} · {session.messages.length} messages · {date}
          </span>
        </div>
        <Tooltip content="Delete" side="left">
          <button
            className="btn-icon session-row-delete"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            aria-label="Delete session"
          >
            <Trash2 size={13} />
          </button>
        </Tooltip>
      </div>
      {isExpanded && (
        <div className="session-messages block-list-view-cards">
          {session.messages.map((msg, i) => (
            <div key={i} className={`session-msg-card session-msg--${msg.role}`}>
              <span className="session-msg-role">
                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                {msg.role === 'user' ? 'You' : 'AI'}
              </span>
              <div className="session-msg-content">{msg.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SessionPanel() {
  const { isOpen, sessions, expandedId, setOpen, toggleExpand, loadSessions, deleteSession } = useSessionStore()

  useEffect(() => {
    if (isOpen) loadSessions()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div className="audit-backdrop" onClick={() => setOpen(false)} />
      <aside className="audit-panel" role="dialog" aria-label="Session History">
        <div className="audit-header">
          <div className="audit-brand">
            <MessageSquare size={15} />
            <span className="audit-title">Session History</span>
          </div>
          <button className="ide-close-btn" onClick={() => setOpen(false)} aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <div className="audit-body">
          {sessions.length === 0 ? (
            <p className="session-empty">No sessions yet. Save one from the extension.</p>
          ) : (
            sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                isExpanded={expandedId === s.id}
                onToggle={() => toggleExpand(s.id)}
                onDelete={() => deleteSession(s.id)}
              />
            ))
          )}
        </div>
      </aside>
    </>
  )
}
