export type ModelId = 'vexo-4-omni' | 'vexo-reasoning' | 'vexo-fast';

export type ThemeType = 'dark' | 'midnight' | 'slate' | 'light' | 'cyberpunk';

export type ResponseTone = 'balanced' | 'concise' | 'detailed' | 'creative' | 'technical';

export type ReasoningDepth = 'low' | 'medium' | 'high';

export interface WebSource {
  title: string;
  url: string;
  domain: string;
}

export interface MessageImage {
  data: string; // base64 without prefix
  mimeType: string;
  previewUrl: string;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  aspectRatio: string;
  createdAt: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  image?: MessageImage;
  generatedImage?: GeneratedImage;
  sources?: WebSource[];
  searchQueries?: string[];
  reasoning?: string;
  isGenerating?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: ModelId;
  pinned?: boolean;
  messages: Message[];
}

export interface UserSettings {
  userName: string;
  userRole: string;
  customInstructions: string;
  responseTone: ResponseTone;
  theme: ThemeType;
  autoSpeak: boolean;
  voiceName: string;
  speechRate: number;
  speechPitch: number;
  reasoningDepth: ReasoningDepth;
  defaultWebSearch: boolean;
  soundEffects: boolean;
  fontSize: 'sm' | 'base' | 'lg';
}

export interface SyncState {
  syncCode: string;
  lastSyncedAt: number | null;
  isSyncing: boolean;
  connectedTabs: number;
}
