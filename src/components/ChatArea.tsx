import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Sparkles,
  Send,
  Paperclip,
  Globe,
  Mic,
  MicOff,
  Image as ImageIcon,
  Download,
  Share2,
  ChevronDown,
  Cpu,
  Zap,
  Layers,
  StopCircle,
  X,
  Compass,
  Code,
  Palette,
  Search,
  Code2,
  Music,
} from 'lucide-react';
import { Conversation, Message, ModelId, UserSettings, MessageImage } from '../types';
import { ChatMessage } from './ChatMessage';
import { exportConversationToMarkdown, exportConversationToText } from '../utils/export';
import { speechManager } from '../utils/speech';

interface ChatAreaProps {
  conversation: Conversation | null;
  settings: UserSettings;
  isGenerating: boolean;
  generatingStatusText: string;
  onSendMessage: (text: string, image?: MessageImage, forceWebSearch?: boolean) => void;
  onRegenerate: () => void;
  onEditMessage: (id: string, newContent: string) => void;
  onOpenVoiceMode: () => void;
  onOpenImageStudio: () => void;
  onOpenCodeLab: () => void;
  onOpenSongStudio: () => void;
  onOpenSidebar: () => void;
  onChangeModel: (model: ModelId) => void;
  onOpenImageLightbox: (url: string, prompt: string) => void;
  onOpenCodeInSandbox?: (code: string, language: string) => void;
}

const STARTER_PROMPTS = [
  {
    category: 'Real-Time Web Search',
    icon: Globe,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    prompt: 'What are the most significant technology and AI breakthroughs announced this week?',
    desc: 'Verify latest real-time web sources',
    useWeb: true,
  },
  {
    category: 'Vexo Generative Vision',
    icon: Palette,
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    prompt: 'Create a stunning artwork of a bioluminescent underwater observatory inside an ancient coral reef, 8k cinematic 35mm',
    desc: 'Synthesize generative visual art',
    isImage: true,
  },
  {
    category: 'Software Architecture',
    icon: Code,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    prompt: 'Design a scalable event-driven distributed cache in TypeScript with Redis pub/sub and Raft consensus',
    desc: 'Production-ready code & patterns',
  },
  {
    category: 'Deep Reasoning Proofs',
    icon: Cpu,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    prompt: 'Break down the P vs NP problem, current barrier results (relativization, natural proofs), and why it remains unsolved',
    desc: 'Step-by-step rigorous analysis',
  },
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  settings,
  isGenerating,
  generatingStatusText,
  onSendMessage,
  onRegenerate,
  onEditMessage,
  onOpenVoiceMode,
  onOpenImageStudio,
  onOpenCodeLab,
  onOpenSongStudio,
  onOpenSidebar,
  onChangeModel,
  onOpenImageLightbox,
  onOpenCodeInSandbox,
}) => {
  const [inputText, setInputText] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(settings.defaultWebSearch);
  const [attachedImage, setAttachedImage] = useState<MessageImage | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, isGenerating]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  const handleSend = () => {
    if ((!inputText.trim() && !attachedImage) || isGenerating) return;

    onSendMessage(inputText.trim(), attachedImage || undefined, webSearchEnabled);
    setInputText('');
    setAttachedImage(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPEG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const base64Data = dataUrl.split(',')[1];
      setAttachedImage({
        data: base64Data,
        mimeType: file.type,
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleRecording = () => {
    if (isRecording) {
      speechManager.stopListening();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      const supported = speechManager.startListening(
        (text, isFinal) => {
          setInputText((prev) => (isFinal ? `${prev} ${text}`.trim() : prev ? `${prev.split(' ')[0]} ${text}` : text));
        },
        () => setIsRecording(false),
        () => setIsRecording(false)
      );
      if (!supported) {
        setIsRecording(false);
        alert('Speech recognition is not available in this browser.');
      }
    }
  };

  const currentModel = conversation?.model || 'vexo-4-omni';

  const MODEL_META = {
    'vexo-4-omni': {
      name: 'Vexo 4.0 Omni',
      desc: 'Multimodal, coding & real-time search',
      icon: Sparkles,
      color: 'text-indigo-400',
    },
    'vexo-reasoning': {
      name: 'Vexo Ultra Reasoning',
      desc: 'Deep multi-step thinking proofs',
      icon: Cpu,
      color: 'text-purple-400',
    },
    'vexo-fast': {
      name: 'Vexo Fast 3.5',
      desc: 'Instant low-latency responses',
      icon: Zap,
      color: 'text-amber-400',
    },
  }[currentModel];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden relative">
      {/* Top Header */}
      <header className="h-14 px-4 sm:px-6 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Open menu"
          >
            <Menu size={18} />
          </button>

          {/* Model Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
            >
              <MODEL_META.icon size={14} className={MODEL_META.color} />
              <span>{MODEL_META.name}</span>
              <ChevronDown size={13} className="text-zinc-500" />
            </button>

            {showModelMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowModelMenu(false)}
                />
                <div className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 z-40 space-y-1">
                  {[
                    { id: 'vexo-4-omni', name: 'Vexo 4.0 Omni', desc: 'Flagship multimodal & web search', icon: Sparkles, color: 'text-indigo-400' },
                    { id: 'vexo-reasoning', name: 'Vexo Ultra Reasoning', desc: 'Deep mathematical & logic proofs', icon: Cpu, color: 'text-purple-400' },
                    { id: 'vexo-fast', name: 'Vexo Fast 3.5', desc: 'Ultra-low latency instant Q&A', icon: Zap, color: 'text-amber-400' },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          onChangeModel(m.id as ModelId);
                          setShowModelMenu(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left flex items-start gap-2.5 transition-colors cursor-pointer ${
                          currentModel === m.id
                            ? 'bg-indigo-600/15 border border-indigo-500/40 text-white'
                            : 'hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <Icon size={16} className={`${m.color} mt-0.5 flex-shrink-0`} />
                        <div>
                          <p className="text-xs font-semibold text-zinc-100">{m.name}</p>
                          <p className="text-[11px] text-zinc-400">{m.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Live Voice Mode Launcher */}
          <button
            onClick={onOpenVoiceMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            title="Start hands-free Live Voice mode"
          >
            <Mic size={14} className="animate-pulse" />
            <span className="hidden sm:inline">Live Voice</span>
          </button>

          {/* Code Lab Developer Studio Button */}
          <button
            onClick={onOpenCodeLab}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-400 text-xs font-medium transition-colors cursor-pointer"
            title="Open Vexo Developer Studio (Code, Sandbox, Debugger)"
          >
            <Code2 size={15} className="text-emerald-400" />
            <span className="hidden md:inline">Code Lab</span>
          </button>

          {/* Song Studio & Sing Button */}
          <button
            onClick={onOpenSongStudio}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
            title="Sing & Song Studio (Lyrics, Melodies & Harmonies)"
          >
            <Music size={15} className="text-rose-400" />
            <span className="hidden md:inline">Sing Studio</span>
          </button>

          {/* Image Studio Quick Button */}
          <button
            onClick={onOpenImageStudio}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-pink-400 transition-colors cursor-pointer"
            title="Open Vexo Vision Image Studio"
          >
            <ImageIcon size={16} />
          </button>

          {/* Export Chat Dropdown */}
          {conversation && conversation.messages.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Export conversation"
              >
                <Download size={16} />
              </button>

              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl p-1 z-40 text-xs">
                    <button
                      onClick={() => {
                        exportConversationToMarkdown(conversation);
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Export Markdown (.md)
                    </button>
                    <button
                      onClick={() => {
                        exportConversationToText(conversation);
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Export Plain Text (.txt)
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Chat Scroll Area */}
      <div className="flex-1 overflow-y-auto">
        {!conversation || conversation.messages.length === 0 ? (
          /* Empty State Welcome Screen */
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center min-h-[70vh] text-center select-none">
            {/* Glowing Hero Emblem */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30 ring-4 ring-white/10 animate-pulse">
                <Sparkles size={40} />
              </div>
              <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full -z-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">vexo-Ai</span>
            </h2>
            <p className="text-sm text-zinc-400 max-w-md mb-8">
              Your next-generation multimodal companion with real-time web browsing, generative vision, hands-free voice, and deep reasoning.
            </p>

            {/* Starter Prompts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {STARTER_PROMPTS.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (card.isImage) {
                        onOpenImageStudio();
                      } else {
                        onSendMessage(card.prompt, undefined, card.useWeb ?? webSearchEnabled);
                      }
                    }}
                    className="p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-850/90 border border-zinc-800/80 hover:border-indigo-500/40 transition-all group cursor-pointer shadow-sm hover:shadow-indigo-500/10 flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className={`p-1.5 rounded-lg border ${card.color}`}>
                        <Icon size={14} />
                      </div>
                      <span className="text-xs font-semibold text-zinc-300">
                        {card.category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors line-clamp-2">
                      "{card.prompt}"
                    </p>
                    <span className="text-[10px] text-zinc-500 mt-2 font-mono">
                      {card.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Message List */
          <div className="divide-y divide-white/[0.02]">
            {conversation.messages.map((msg, index) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                userName={settings.userName}
                isLastAssistant={
                  msg.role === 'assistant' &&
                  index === conversation.messages.length - 1
                }
                onRegenerate={onRegenerate}
                onEditMessage={onEditMessage}
                onOpenImageLightbox={onOpenImageLightbox}
                onOpenCodeInSandbox={onOpenCodeInSandbox}
              />
            ))}

            {/* Live Thinking / Generation Status */}
            {isGenerating && (
              <div className="py-6 bg-zinc-900/20 border-t border-white/[0.02]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md animate-pulse">
                    <Sparkles size={16} />
                  </div>
                  <div className="space-y-2 pt-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-indigo-400">
                        {generatingStatusText || 'Vexo is reasoning...'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </span>
                    </div>
                    <div className="w-48 h-2 rounded-full bg-zinc-800 animate-shimmer"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-6" />
          </div>
        )}
      </div>

      {/* Input Bar Area */}
      <div className="p-3 sm:p-5 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent z-20">
        <div className="max-w-4xl mx-auto">
          {/* Image upload preview badge */}
          {attachedImage && (
            <div className="mb-2 inline-flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 shadow-md">
              <img
                src={attachedImage.previewUrl}
                alt="Upload preview"
                className="w-8 h-8 rounded-lg object-cover"
              />
              <span className="text-[11px] truncate max-w-xs font-medium">
                Image Attached for Analysis
              </span>
              <button
                onClick={() => setAttachedImage(null)}
                className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Main Input Container */}
          <div className="relative rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, upload images, or generate art..."
              rows={1}
              className="w-full px-4 pt-3.5 pb-12 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none leading-relaxed"
            />

            {/* Bottom Actions Row inside Input Box */}
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {/* Upload Image for Vision */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  title="Attach image for vision analysis"
                >
                  <Paperclip size={17} />
                </button>

                {/* Real-time Web Search Toggle */}
                <button
                  onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    webSearchEnabled
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
                  }`}
                  title={webSearchEnabled ? 'Real-time Web Search ON' : 'Real-time Web Search OFF'}
                >
                  <Globe size={15} className={webSearchEnabled ? 'text-indigo-400' : ''} />
                  <span className="hidden sm:inline">Web Search</span>
                </button>

                {/* Image Studio Shortcut */}
                <button
                  onClick={onOpenImageStudio}
                  className="p-2 rounded-xl text-zinc-400 hover:text-pink-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  title="Create with Vexo Vision Studio"
                >
                  <ImageIcon size={17} />
                </button>

                {/* Code Lab Shortcut */}
                <button
                  onClick={onOpenCodeLab}
                  className="p-2 rounded-xl text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  title="Open Vexo Developer Studio & Sandbox"
                >
                  <Code2 size={17} />
                </button>

                {/* Sing & Music Studio Shortcut */}
                <button
                  onClick={onOpenSongStudio}
                  className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  title="Open Vexo Sing & Song Studio"
                >
                  <Music size={17} />
                </button>
              </div>

              {/* Right: Mic & Send Buttons */}
              <div className="flex items-center gap-2">
                {/* Speech Dictation */}
                <button
                  onClick={toggleRecording}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isRecording
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
                  }`}
                  title={isRecording ? 'Listening (click to stop)' : 'Voice-to-Text dictation'}
                >
                  <Mic size={17} />
                </button>

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={(!inputText.trim() && !attachedImage) || isGenerating}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <Send size={15} />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-zinc-500 text-center mt-2 font-mono">
            vexo-Ai Neural Core v4.9 • Multimodal Autonomous System
          </p>
        </div>
      </div>
    </div>
  );
};
