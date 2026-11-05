import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Sparkles,
  Pin,
  PinOff,
  Trash2,
  Edit3,
  Check,
  X,
  Share2,
  Settings,
  Image as ImageIcon,
  Mic,
  FileText,
  Download,
  ChevronRight,
  Radio,
  Code2,
  Music,
} from 'lucide-react';
import { Conversation, UserSettings } from '../types';
import { exportConversationToMarkdown } from '../utils/export';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  settings: UserSettings;
  syncCode: string;
  isOpen: boolean;
  onCloseMobile: () => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onTogglePin: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onOpenImageStudio: () => void;
  onOpenVoiceMode: () => void;
  onOpenCodeLab: () => void;
  onOpenSongStudio: () => void;
  onOpenSync: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  settings,
  syncCode,
  isOpen,
  onCloseMobile,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onTogglePin,
  onRenameConversation,
  onOpenImageStudio,
  onOpenVoiceMode,
  onOpenCodeLab,
  onOpenSongStudio,
  onOpenSync,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedList = filtered.filter((c) => c.pinned);
  const recentList = filtered.filter((c) => !c.pinned);

  const handleStartRename = (e: React.MouseEvent, c: Conversation) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 sm:w-80 flex flex-col bg-zinc-950 border-r border-zinc-800/80 transition-transform duration-300 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand & New Chat */}
        <div className="p-4 border-b border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Sparkles size={17} />
              </div>
              <div>
                <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  <span>vexo-Ai</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                    v4.9
                  </span>
                </h1>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <X size={18} />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewConversation();
              onCloseMobile();
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-xs flex items-center justify-between shadow-lg shadow-indigo-600/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} className="transition-transform group-hover:rotate-90 duration-200" />
              <span>New Conversation</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-white/15 text-white/90 font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Quick Tool Launchers */}
          <div className="grid grid-cols-4 gap-1 pt-1">
            <button
              onClick={() => {
                onOpenImageStudio();
                onCloseMobile();
              }}
              className="px-1.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-medium text-zinc-300 hover:text-white flex flex-col items-center gap-1 transition-all cursor-pointer group"
              title="Vexo Vision Studio"
            >
              <ImageIcon size={14} className="text-pink-400 group-hover:scale-110 transition-transform" />
              <span className="truncate">Vision</span>
            </button>

            <button
              onClick={() => {
                onOpenVoiceMode();
                onCloseMobile();
              }}
              className="px-1.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-medium text-zinc-300 hover:text-white flex flex-col items-center gap-1 transition-all cursor-pointer group"
              title="Hands-free Live Voice"
            >
              <Mic size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="truncate">Voice</span>
            </button>

            <button
              onClick={() => {
                onOpenCodeLab();
                onCloseMobile();
              }}
              className="px-1.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-medium text-zinc-300 hover:text-white flex flex-col items-center gap-1 transition-all cursor-pointer group"
              title="Code Lab & Live Sandbox"
            >
              <Code2 size={14} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="truncate">Code</span>
            </button>

            <button
              onClick={() => {
                onOpenSongStudio();
                onCloseMobile();
              }}
              className="px-1.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-medium text-zinc-300 hover:text-white flex flex-col items-center gap-1 transition-all cursor-pointer group"
              title="Sing & Song Studio (Lyrics, Melodies & Harmonies)"
            >
              <Music size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="truncate">Sing</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-zinc-800/60">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Pinned Chats */}
          {pinnedList.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Pin size={11} className="text-indigo-400" />
                <span>Pinned</span>
              </div>
              {pinnedList.map((c) => renderItem(c))}
            </div>
          )}

          {/* Recent Chats */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Recent Conversations ({recentList.length})
            </div>
            {recentList.length === 0 && pinnedList.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs space-y-1">
                <MessageSquare size={24} className="mx-auto opacity-40 mb-2" />
                <p>No conversations yet</p>
                <p className="text-[11px]">Start a chat to experience Vexo</p>
              </div>
            ) : (
              recentList.map((c) => renderItem(c))
            )}
          </div>
        </div>

        {/* Bottom Section: Sync & User Profile */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/90 space-y-2">
          {/* Cross-Platform Sync Status button */}
          <button
            onClick={onOpenSync}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Share2 size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
              <div className="text-left min-w-0">
                <p className="font-medium text-zinc-200 truncate">Device Sync</p>
                <p className="text-[10px] text-zinc-500 font-mono">{syncCode}</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <Radio size={8} className="animate-pulse" />
              Sync Active
            </span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="w-full px-3 py-2 rounded-xl hover:bg-zinc-900 text-xs text-zinc-300 flex items-center justify-between transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 flex items-center justify-center text-[11px] font-semibold text-white">
                {settings.userName ? settings.userName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left">
                <p className="font-medium text-zinc-200 leading-tight">
                  {settings.userName || 'Explorer'}
                </p>
                <p className="text-[10px] text-zinc-500">Preferences & Themes</p>
              </div>
            </div>
            <Settings size={15} className="text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          </button>
        </div>
      </aside>
    </>
  );

  function renderItem(c: Conversation) {
    const isActive = activeId === c.id;
    const isEditingThis = editingId === c.id;

    return (
      <div
        key={c.id}
        onClick={() => {
          if (!isEditingThis) {
            onSelectConversation(c.id);
            onCloseMobile();
          }
        }}
        className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
          isActive
            ? 'bg-zinc-850/90 text-white font-medium border border-indigo-500/40 shadow-sm'
            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <MessageSquare
            size={14}
            className={`flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`}
          />
          {isEditingThis ? (
            <input
              type="text"
              value={editTitle}
              autoFocus
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename(e as any, c.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-800 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white w-full focus:outline-none"
            />
          ) : (
            <span className="truncate">{c.title}</span>
          )}
        </div>

        {/* Action icons on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditingThis ? (
            <button
              onClick={(e) => handleSaveRename(e, c.id)}
              className="p-1 rounded hover:bg-zinc-700 text-emerald-400"
              title="Save"
            >
              <Check size={12} />
            </button>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(c.id);
                }}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 transition-colors"
                title={c.pinned ? 'Unpin' : 'Pin to top'}
              >
                {c.pinned ? <PinOff size={12} /> : <Pin size={12} />}
              </button>
              <button
                onClick={(e) => handleStartRename(e, c)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Rename"
              >
                <Edit3 size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportConversationToMarkdown(c);
                }}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Export Markdown"
              >
                <Download size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(c.id);
                }}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
};
