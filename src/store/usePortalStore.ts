import { create } from 'zustand';
import { type ConnectedWallet, type User } from '@privy-io/react-auth';
import type { Project } from '../lib/mantleProjects';
import { type LanguageKey } from '../lib/translations';

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

export interface ChainStats {
  tvl: string;
  chainTvl: string;
  tvlChange: string;
  chainTvlChange: string;
  blockNumber: string;
  gasPrice: string;
  tps: string;
  activeUsers24h: string;
}

interface PortalState {
  activeInterface: 'discovery' | 'dapp';
  activeCategory: string;
  selectedProject: Project | null;
  messages: ChatMessage[];
  wallets: ConnectedWallet[];
  user: User | null;
  theme: 'light' | 'dark';
  isChatOpen: boolean;
  language: LanguageKey;
  chainStats: ChainStats;
  userBalance: string;
  chatInputQueue: string | null;
  setPortalState: (state: Partial<PortalState>) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearHistory: () => void;
  toggleTheme: () => void;
  toggleChat: () => void;
  setLanguage: (lang: LanguageKey) => void;
}

export const usePortalStore = create<PortalState>((set) => ({
  activeInterface: 'discovery',
  activeCategory: 'all',
  selectedProject: null,
  language: 'en',
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
  theme: 'dark',
  isChatOpen: false,
  userBalance: '0.00',
  chatInputQueue: null,
  chainStats: {
    tvl: '$4.38B',
    chainTvl: '$338.5M',
    tvlChange: '+2.4%',
    chainTvlChange: '+1.5%',
    blockNumber: '68,241,509',
    gasPrice: '0.05 Gwei',
    tps: '12.4',
    activeUsers24h: '48,242',
  },

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

  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),

  toggleChat: () =>
    set((state) => ({
      isChatOpen: !state.isChatOpen,
    })),

  setLanguage: (lang) =>
    set(() => ({
      language: lang,
    })),
}));
