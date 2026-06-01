import { create } from 'zustand';
import { type ConnectedWallet, type User } from '@privy-io/react-auth';
import type { Project } from '../lib/mantleProjects';

export interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'tool';
  text: string;
  timestamp: Date;
  toolCall?: {
    name: string;
    status: 'running' | 'done' | 'error';
    input?: any;
    result?: any;
  };
}

interface PortalState {
  activeInterface: 'discovery' | 'dapp';
  activeCategory: string;
  selectedProject: Project | null;
  messages: ChatMessage[];
  wallets: ConnectedWallet[];
  user: User | null;
  setPortalState: (state: Partial<PortalState>) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearHistory: () => void;
}

export const usePortalStore = create<PortalState>((set) => ({
  activeInterface: 'discovery',
  activeCategory: 'all',
  selectedProject: null,
  messages: [
    {
      id: 'initial',
      type: 'agent',
      text: "Welcome to ELTNAM! 👋 I'm your autonomous guide agent. I can help you search, explore, bridge, and transact across 242 projects. Ask me anything to get started!",
      timestamp: new Date(),
    },
  ],
  wallets: [],
  user: null,

  setPortalState: (state) => set((prev) => ({ ...prev, ...state })),

  addMessage: (msg) => {
    const id = Math.random().toString(36).substring(7);
    const newMsg: ChatMessage = {
      ...msg,
      id,
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMsg],
    }));
    return id;
  },

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  clearHistory: () =>
    set(() => ({
      messages: [
        {
          id: 'initial',
          type: 'agent',
          text: "Let's start fresh! How can I help you explore Mantle today?",
          timestamp: new Date(),
        },
      ],
    })),
}));
