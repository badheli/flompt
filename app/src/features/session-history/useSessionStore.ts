import { create } from 'zustand'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string | null
}

export interface Session {
  id: string
  platform: string
  title: string
  messages: Message[]
  created_at: string
}

interface SessionState {
  isOpen: boolean
  sessions: Session[]
  expandedId: string | null
  setOpen: (open: boolean) => void
  toggleExpand: (id: string) => void
  loadSessions: () => Promise<void>
  deleteSession: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const API_BASE = '/api/conversations'

export const useSessionStore = create<SessionState>((set, get) => ({
  isOpen: false,
  sessions: [],
  expandedId: null,
  setOpen: (open) => set({ isOpen: open }),
  toggleExpand: (id) => set((s) => ({ expandedId: s.expandedId === id ? null : id })),
  loadSessions: async () => {
    const res = await fetch(API_BASE)
    if (res.ok) {
      const data: Session[] = await res.json()
      set({ sessions: data })
    }
  },
  deleteSession: async (id) => {
    await fetch(`${API_BASE}/${id}`, { method: 'DELETE' })
    set((s) => ({ sessions: s.sessions.filter((c) => c.id !== id) }))
  },
  refresh: () => get().loadSessions(),
}))
