import { useState } from 'react';
import {
  Globe,
  Send,
  MessageCircle,
  Apple,
  Mail,
  Smartphone,
  Wallet,
  ChevronRight,
  RefreshCw,
  Shield,
  type LucideIcon,
} from 'lucide-react';

interface AuthMethod {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

const AUTH_METHODS: AuthMethod[] = [
  { id: 'google', label: 'Google', icon: Globe, color: '#4285F4' },
  { id: 'twitter', label: 'X / Twitter', icon: Send, color: '#000000' },
  { id: 'discord', label: 'Discord', icon: MessageCircle, color: '#5865F2' },
  { id: 'apple', label: 'Apple', icon: Apple, color: '#1a1a1a' },
  { id: 'email', label: 'Email', icon: Mail, color: '#0369A1' },
  { id: 'sms', label: 'Phone', icon: Smartphone, color: '#10B981' },
  { id: 'wallet', label: 'Existing Wallet', icon: Wallet, color: '#8B5CF6' },
];

interface LoginScreenProps {
  onLogin: (method: string) => Promise<void>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loadingMethod, setLoadingMethod] = useState<string | null>(null);

  const handleLogin = async (method: string) => {
    setLoadingMethod(method);
    try {
      await onLogin(method);
    } catch (e) {
      console.error('[Mantle Portal] Login error:', e);
    } finally {
      setLoadingMethod(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="text-center">
        <h2 className="text-2xl font-black text-white mb-1">Create your account</h2>
        <p className="text-sm text-slate-400">Sign in to get a secure wallet instantly.</p>
      </div>

      <div className="space-y-2">
        {AUTH_METHODS.map((method) => {
          const Icon = method.icon;
          const isLoading = loadingMethod === method.id;
          return (
            <button
              key={method.id}
              onClick={() => handleLogin(method.id)}
              disabled={!!loadingMethod}
              className="w-full flex items-center gap-4 p-3.5 bg-slate-900/50 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900/80 rounded-xl transition group disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: method.color + '22' }}
              >
                {isLoading ? (
                  <RefreshCw size={17} className="animate-spin text-blue-400" />
                ) : (
                  <Icon size={17} style={{ color: method.color }} />
                )}
              </div>
              <span className="font-semibold text-sm text-white">Continue with {method.label}</span>
              <ChevronRight size={15} className="ml-auto text-slate-600 group-hover:text-slate-400 transition" />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-600 pt-1 justify-center">
        <Shield size={13} className="text-emerald-600 flex-shrink-0" />
        <span>Your account is non-custodial and secure.</span>
      </div>
    </div>
  );
}
