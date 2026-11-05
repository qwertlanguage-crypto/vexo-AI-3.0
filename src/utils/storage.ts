import { Conversation, UserSettings } from '../types';

export const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Explorer',
  userRole: '',
  customInstructions: '',
  responseTone: 'balanced',
  theme: 'dark',
  autoSpeak: false,
  voiceName: '',
  speechRate: 1.0,
  speechPitch: 1.0,
  reasoningDepth: 'medium',
  defaultWebSearch: true,
  soundEffects: true,
  fontSize: 'base',
};

const CONVERSATIONS_KEY = 'vexo_conversations_v1';
const SETTINGS_KEY = 'vexo_settings_v1';
const SYNC_CODE_KEY = 'vexo_sync_code_v1';

// Setup BroadcastChannel for instant real-time sync across multiple tabs
export const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('vexo_channel_sync')
  : null;

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load conversations:', e);
    return [];
  }
}

export function saveConversations(convs: Conversation[], broadcast = true): void {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
    if (broadcast && syncChannel) {
      syncChannel.postMessage({ type: 'CONVERSATIONS_UPDATED', payload: convs });
    }
  } catch (e) {
    console.error('Failed to save conversations:', e);
  }
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings, broadcast = true): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (broadcast && syncChannel) {
      syncChannel.postMessage({ type: 'SETTINGS_UPDATED', payload: settings });
    }
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function getOrCreateSyncCode(): string {
  try {
    let code = localStorage.getItem(SYNC_CODE_KEY);
    if (!code) {
      const randNum = Math.floor(100000 + Math.random() * 900000);
      code = `VX-${randNum}`;
      localStorage.setItem(SYNC_CODE_KEY, code);
    }
    return code;
  } catch {
    return 'VX-773821';
  }
}

export function setSyncCode(code: string): void {
  try {
    localStorage.setItem(SYNC_CODE_KEY, code.toUpperCase().trim());
  } catch (e) {
    console.error('Failed to set sync code:', e);
  }
}

// Push to Cloud Sync
export async function pushToCloudSync(syncCode: string, conversations: Conversation[], settings: UserSettings) {
  const res = await fetch('/api/sync/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ syncCode, conversations, settings }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to push sync data');
  }
  return res.json();
}

// Pull from Cloud Sync
export async function pullFromCloudSync(syncCode: string) {
  const res = await fetch(`/api/sync/pull/${encodeURIComponent(syncCode)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to retrieve sync session');
  }
  return res.json();
}
