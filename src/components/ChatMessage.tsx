import React, { useState } from 'react';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  Maximize2,
  Sparkles,
  Cpu,
  Edit2,
  CheckCheck,
  X,
} from 'lucide-react';
import { Message, WebSource } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { speechManager } from '../utils/speech';

interface ChatMessageProps {
  message: Message;
  userName: string;
  isLastAssistant: boolean;
  onRegenerate?: () => void;
  onEditMessage?: (id: string, newContent: string) => void;
  onOpenImageLightbox?: (url: string, prompt: string) => void;
  onOpenCodeInSandbox?: (code: string, language: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  userName,
  isLastAssistant,
  onRegenerate,
  onEditMessage,
  onOpenImageLightbox,
  onOpenCodeInSandbox,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const [showThinking, setShowThinking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      speechManager.stopSpeaking();
      setIsSpeaking(false);
    } else {
      speechManager.speak(message.content, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEditMessage) {
      onEditMessage(message.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleDownloadImage = (url: string, prompt: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `vexo-${prompt.substring(0, 20).replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`py-5 transition-colors ${
        isUser
          ? 'bg-transparent'
          : 'bg-zinc-900/30 border-y border-white/[0.03]'
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-4 sm:gap-5">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 flex items-center justify-center text-xs font-semibold text-white shadow-sm ring-1 ring-white/10">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 ring-1 ring-white/20">
              <Sparkles size={16} className="text-white animate-pulse" />
            </div>
          )}
        </div>

        {/* Content body */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header info */}
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-200">
                {isUser ? userName || 'You' : 'Vexo-AI'}
              </span>
              {!isUser && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Neural v4.9
                </span>
              )}
              <span className="text-zinc-500">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Quick action buttons on hover */}
            <div className="flex items-center gap-1 opacity-80 sm:opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
              {isUser && !isEditing && onEditMessage && (
                <button
                  onClick={() => {
                    setEditContent(message.content);
                    setIsEditing(true);
                  }}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  title="Edit message"
                >
                  <Edit2 size={13} />
                </button>
              )}
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Copy text"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* User uploaded image preview */}
          {message.image && (
            <div className="rounded-xl overflow-hidden border border-zinc-800 max-w-sm my-2 shadow-lg">
              <img
                src={message.image.previewUrl}
                alt="User upload"
                className="w-full h-auto object-cover max-h-80"
              />
            </div>
          )}

          {/* Real-time Web Search Grounding Card */}
          {message.sources && message.sources.length > 0 && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 my-2 backdrop-blur-sm">
              <button
                onClick={() => setShowSources(!showSources)}
                className="w-full flex items-center justify-between text-xs font-medium text-indigo-300 hover:text-indigo-200 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-indigo-400" />
                  <span>
                    Vexo Live Web Search • {message.sources.length} sources consulted
                  </span>
                </div>
                {showSources ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showSources && (
                <div className="mt-3 space-y-2">
                  {message.searchQueries && message.searchQueries.length > 0 && (
                    <div className="text-[11px] text-zinc-400 flex flex-wrap gap-1.5 items-center">
                      <span className="text-zinc-500">Queries:</span>
                      {message.searchQueries.map((q, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-white/5"
                        >
                          "{q}"
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {message.sources.map((source: WebSource, sIdx: number) => (
                      <a
                        key={sIdx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2.5 p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 hover:border-indigo-500/30 transition-all group/link"
                      >
                        <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-zinc-400 uppercase">
                          {source.domain.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-200 truncate group-hover/link:text-indigo-300 transition-colors">
                            {source.title}
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate flex items-center gap-1">
                            {source.domain}
                            <ExternalLink size={10} className="opacity-60" />
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reasoning / Thinking Drawer */}
          {message.reasoning && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 my-2">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-300 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-purple-400" />
                  <span className="font-mono">Vexo Deep Reasoning Chain</span>
                </div>
                {showThinking ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showThinking && (
                <div className="mt-2.5 pt-2.5 border-t border-zinc-800/60 text-xs text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap">
                  {message.reasoning}
                </div>
              )}
            </div>
          )}

          {/* Message Content / Edit Mode */}
          {isEditing ? (
            <div className="space-y-2 mt-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-3 rounded-xl bg-zinc-800 border border-indigo-500/40 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y min-h-[90px]"
                rows={3}
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCheck size={13} />
                  Save & Submit
                </button>
              </div>
            </div>
          ) : (
            message.content && (
              <MarkdownRenderer
                content={message.content}
                onOpenSandbox={onOpenCodeInSandbox}
              />
            )
          )}

          {/* Generated Artwork (Vexo Vision) */}
          {message.generatedImage && (
            <div className="my-4 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/80 shadow-2xl max-w-lg group">
              <div className="relative aspect-square sm:aspect-auto overflow-hidden bg-zinc-900">
                <img
                  src={message.generatedImage.url}
                  alt={message.generatedImage.prompt}
                  className="w-full h-auto object-cover max-h-[500px] transition-transform duration-500 group-hover:scale-[1.02] cursor-pointer"
                  onClick={() =>
                    onOpenImageLightbox &&
                    onOpenImageLightbox(
                      message.generatedImage!.url,
                      message.generatedImage!.prompt
                    )
                  }
                />
                <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() =>
                      onOpenImageLightbox &&
                      onOpenImageLightbox(
                        message.generatedImage!.url,
                        message.generatedImage!.prompt
                      )
                    }
                    className="p-2 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-md cursor-pointer transition-colors"
                    title="Fullscreen preview"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadImage(
                        message.generatedImage!.url,
                        message.generatedImage!.prompt
                      )
                    }
                    className="p-2 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-md cursor-pointer transition-colors"
                    title="Download high-res PNG"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex-1 min-w-0 pr-3">
                  <span className="text-zinc-400 font-medium">Prompt: </span>
                  <span className="text-zinc-200 italic">
                    "{message.generatedImage.prompt}"
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/20 text-indigo-300 flex-shrink-0">
                  {message.generatedImage.aspectRatio}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons footer for Assistant */}
          {!isUser && (
            <div className="pt-2 flex items-center gap-2 text-xs text-zinc-500">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-zinc-800/80 hover:text-zinc-300 transition-all cursor-pointer"
                title="Copy response"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSpeak}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-pointer ${
                  isSpeaking
                    ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                    : 'hover:bg-zinc-800/80 hover:text-zinc-300'
                }`}
                title={isSpeaking ? 'Stop speaking' : 'Read out loud'}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX size={13} className="text-indigo-400" />
                    <span>Stop</span>
                    <span className="flex items-center gap-0.5 ml-1">
                      <span className="w-1 h-2 bg-indigo-400 rounded-full animate-soundwave"></span>
                      <span className="w-1 h-3 bg-indigo-400 rounded-full animate-soundwave [animation-delay:0.2s]"></span>
                      <span className="w-1 h-1.5 bg-indigo-400 rounded-full animate-soundwave [animation-delay:0.4s]"></span>
                    </span>
                  </>
                ) : (
                  <>
                    <Volume2 size={13} />
                    <span>Listen</span>
                  </>
                )}
              </button>

              {isLastAssistant && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-zinc-800/80 hover:text-zinc-300 transition-all cursor-pointer"
                  title="Regenerate response"
                >
                  <RotateCcw size={13} />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
