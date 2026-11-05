import React, { useState, useEffect, useCallback } from 'react';
import {
  loadConversations,
  saveConversations,
  loadSettings,
  saveSettings,
  getOrCreateSyncCode,
  syncChannel,
} from './utils/storage';
import {
  Conversation,
  Message,
  ModelId,
  UserSettings,
  GeneratedImage,
  MessageImage,
} from './types';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { VoiceModeModal } from './components/VoiceModeModal';
import { ImageStudioModal } from './components/ImageStudioModal';
import { SyncModal } from './components/SyncModal';
import { SettingsModal } from './components/SettingsModal';
import { ImageLightbox } from './components/ImageLightbox';
import { CodeLabModal } from './components/CodeLabModal';
import { SongStudioModal } from './components/SongStudioModal';
import { playSound, speechManager } from './utils/speech';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const list = loadConversations();
    return list.length > 0 ? list[0].id : null;
  });
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [syncCode] = useState<string>(() => getOrCreateSyncCode());

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatusText, setGeneratingStatusText] = useState('Vexo is thinking...');

  // Modals state
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isCodeLabOpen, setIsCodeLabOpen] = useState(false);
  const [isSongStudioOpen, setIsSongStudioOpen] = useState(false);
  const [codeLabInitialCode, setCodeLabInitialCode] = useState<string | undefined>(undefined);
  const [codeLabInitialLang, setCodeLabInitialLang] = useState<string | undefined>(undefined);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<{ url: string; prompt: string } | null>(null);

  useEffect(() => {
    const channel = syncChannel;
    if (!channel) return;

    const handleBroadcast = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'CONVERSATIONS_UPDATED') {
        setConversations(event.data.payload);
      } else if (event.data.type === 'SETTINGS_UPDATED') {
        setSettings(event.data.payload);
      }
    };

    channel.addEventListener('message', handleBroadcast);
    return () => {
      channel.removeEventListener('message', handleBroadcast);
    };
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + K to start new conversation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleNewConversation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conversations]);

  // Persist conversations
  const updateConversations = useCallback(
    (newConvs: Conversation[]) => {
      setConversations(newConvs);
      saveConversations(newConvs);
    },
    []
  );

  // Persist settings
  const updateSettings = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  // Active conversation getter
  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  // 1. Create New Conversation
  const handleNewConversation = () => {
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: 'vexo-4-omni',
      messages: [],
    };
    const updated = [newConv, ...conversations];
    updateConversations(updated);
    setActiveId(newId);
  };

  // 2. Select conversation
  const handleSelectConversation = (id: string) => {
    setActiveId(id);
  };

  // 3. Delete conversation
  const handleDeleteConversation = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    updateConversations(updated);
    if (activeId === id) {
      setActiveId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // 4. Toggle Pin
  const handleTogglePin = (id: string) => {
    const updated = conversations.map((c) =>
      c.id === id ? { ...c, pinned: !c.pinned } : c
    );
    updateConversations(updated);
  };

  // 5. Rename conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    const updated = conversations.map((c) =>
      c.id === id ? { ...c, title: newTitle } : c
    );
    updateConversations(updated);
  };

  // 6. Change active model
  const handleChangeModel = (model: ModelId) => {
    if (!activeId) return;
    const updated = conversations.map((c) =>
      c.id === activeId ? { ...c, model } : c
    );
    updateConversations(updated);
  };

  // 7. Send Message Handler
  const handleSendMessage = async (
    text: string,
    image?: MessageImage,
    forceWebSearch?: boolean
  ): Promise<string | null> => {
    let convId = activeId;

    // Ensure conversation ID exists
    if (!convId || !conversations.some((c) => c.id === convId)) {
      convId = `conv-${Date.now()}`;
      setActiveId(convId);
      const newConv: Conversation = {
        id: convId,
        title: text.substring(0, 38) || (image ? 'Image Analysis' : 'New Conversation'),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: 'vexo-4-omni',
        messages: [],
      };
      setConversations((prev) => {
        const next = [newConv, ...prev.filter((c) => c.id !== convId)];
        saveConversations(next);
        return next;
      });
    }

    // Play send sound
    if (settings.soundEffects) {
      playSound('send');
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      image,
    };

    // Append user message using functional state
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === convId);
      if (idx === -1) {
        const fresh: Conversation = {
          id: convId,
          title: text.substring(0, 38) || 'New Conversation',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model: 'vexo-4-omni',
          messages: [userMessage],
        };
        const next = [fresh, ...prev];
        saveConversations(next);
        return next;
      }
      const target = prev[idx];
      const isFirst = target.messages.length === 0;
      const updated: Conversation = {
        ...target,
        title: isFirst ? (text.substring(0, 38) || 'New Conversation') : target.title,
        updatedAt: Date.now(),
        messages: [...target.messages, userMessage],
      };
      const next = [...prev];
      next[idx] = updated;
      saveConversations(next);
      return next;
    });

    setIsGenerating(true);

    // Detect if prompt is asking to generate an image
    const isImageRequest =
      /^(generate|create|render|draw|make)\s+(an?\s+)?(image|picture|photo|artwork|drawing|painting)/i.test(
        text.trim()
      );

    if (isImageRequest) {
      setGeneratingStatusText('Vexo Vision is rendering generative artwork...');
      try {
        const cleanPrompt = text
          .replace(/^(generate|create|render|draw|make)\s+(an?\s+)?(image|picture|photo|artwork|drawing|painting)\s+(of\s+)?/i, '')
          .trim();

        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: cleanPrompt || text, aspectRatio: '1:1' }),
        });

        const imgData = await imgRes.json();
        if (!imgRes.ok) throw new Error(imgData.error || 'Failed to generate image');

        const assistantMsg: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `I've created this artwork with Vexo Vision based on your request: *"${cleanPrompt || text}"*. You can view it full screen or download the high-resolution render.`,
          timestamp: Date.now(),
          generatedImage: {
            url: imgData.imageUrl,
            prompt: cleanPrompt || text,
            aspectRatio: '1:1',
            createdAt: Date.now(),
          },
        };

        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === convId);
          if (idx === -1) return prev;
          const target = prev[idx];
          const updated = {
            ...target,
            updatedAt: Date.now(),
            messages: [...target.messages, assistantMsg],
          };
          const next = [...prev];
          next[idx] = updated;
          saveConversations(next);
          return next;
        });

        if (settings.soundEffects) playSound('receive');
        return assistantMsg.content;
      } catch (err: any) {
        console.error('Image generation error:', err);
      }
    }

    const shouldUseWebSearch =
      forceWebSearch !== undefined ? forceWebSearch : settings.defaultWebSearch;

    if (shouldUseWebSearch) {
      setGeneratingStatusText('Vexo is browsing the live web & synthesizing sources...');
    } else {
      setGeneratingStatusText('Vexo Neural Core is reasoning...');
    }

    try {
      let personaInstruction = settings.customInstructions || '';
      if (settings.userName) {
        personaInstruction += `\nUser's name: ${settings.userName}.`;
      }
      if (settings.userRole) {
        personaInstruction += `\nUser's role: ${settings.userRole}.`;
      }
      if (settings.responseTone) {
        personaInstruction += `\nPreferred response style: ${settings.responseTone}.`;
      }

      // Read current messages from conversation
      const currentMsgs = conversations.find((c) => c.id === convId)?.messages || [];
      const messagesPayload = [...currentMsgs, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
        image: m.image
          ? { data: m.image.data, mimeType: m.image.mimeType }
          : undefined,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesPayload,
          systemPrompt: personaInstruction,
          enableWebSearch: shouldUseWebSearch,
          reasoningDepth: settings.reasoningDepth,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate response from Vexo.');
      }

      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
        sources: data.sources || [],
        searchQueries: data.searchQueries || [],
      };

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === convId);
        if (idx === -1) return prev;
        const target = prev[idx];
        const updated = {
          ...target,
          updatedAt: Date.now(),
          messages: [...target.messages, assistantMsg],
        };
        const next = [...prev];
        next[idx] = updated;
        saveConversations(next);
        return next;
      });

      if (settings.soundEffects) {
        playSound('receive');
      }

      if (settings.autoSpeak && !isVoiceModeOpen) {
        speechManager.speak(data.content, {
          voiceName: settings.voiceName,
          rate: settings.speechRate,
          pitch: settings.speechPitch,
        });
      }

      return data.content;
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `**Vexo System Notice:** ${error?.message || 'Unable to complete request. Please verify connection and settings.'}`,
        timestamp: Date.now(),
      };

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === convId);
        if (idx === -1) return prev;
        const target = prev[idx];
        const updated = {
          ...target,
          updatedAt: Date.now(),
          messages: [...target.messages, errorMsg],
        };
        const next = [...prev];
        next[idx] = updated;
        saveConversations(next);
        return next;
      });

      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // 8. Regenerate Last Assistant Message
  const handleRegenerate = async () => {
    if (!activeConversation || activeConversation.messages.length < 2 || isGenerating) return;

    const msgs = [...activeConversation.messages];
    if (msgs[msgs.length - 1].role === 'assistant') {
      msgs.pop();
    }

    const lastUserMsg = msgs[msgs.length - 1];
    if (!lastUserMsg || lastUserMsg.role !== 'user') return;

    const priorMessages = msgs.slice(0, -1);
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === activeConversation.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...prev[idx], messages: priorMessages };
      saveConversations(next);
      return next;
    });

    await handleSendMessage(lastUserMsg.content, lastUserMsg.image);
  };

  // 9. Edit Message
  const handleEditMessage = async (id: string, newContent: string) => {
    if (!activeConversation || isGenerating) return;

    const msgIndex = activeConversation.messages.findIndex((m) => m.id === id);
    if (msgIndex === -1) return;

    const trimmed = activeConversation.messages.slice(0, msgIndex);
    const existingMsg = activeConversation.messages[msgIndex];

    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === activeConversation.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...prev[idx], messages: trimmed };
      saveConversations(next);
      return next;
    });

    await handleSendMessage(newContent, existingMsg.image);
  };

  // 10. Insert Image from Studio into Current Chat
  const handleInsertStudioImage = (img: GeneratedImage) => {
    if (!activeConversation) handleNewConversation();

    const assistantMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Here is the artwork created in Vexo Vision: *"${img.prompt}"*`,
      timestamp: Date.now(),
      generatedImage: img,
    };

    if (activeConversation) {
      const updated = {
        ...activeConversation,
        updatedAt: Date.now(),
        messages: [...activeConversation.messages, assistantMsg],
      };
      updateConversations(
        conversations.map((c) => (c.id === activeConversation.id ? updated : c))
      );
    }
  };

  // 11. Open code block directly in Interactive Sandbox
  const handleOpenCodeInSandbox = (code: string, language: string) => {
    setCodeLabInitialCode(code);
    setCodeLabInitialLang(language);
    setIsCodeLabOpen(true);
  };

  // 12. Insert generated code from Code Lab into current active chat
  const handleInsertCodeToChat = (code: string, language: string, title: string) => {
    if (!activeConversation) handleNewConversation();

    const assistantMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `### ${title || 'Generated Code'}\n\nHere is the production-ready code generated in Vexo Developer Studio:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      timestamp: Date.now(),
    };

    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === activeId);
      if (idx === -1) return prev;
      const target = prev[idx];
      const updated = {
        ...target,
        updatedAt: Date.now(),
        messages: [...target.messages, assistantMsg],
      };
      const next = [...prev];
      next[idx] = updated;
      saveConversations(next);
      return next;
    });
  };

  // 13. Restore Data from Sync or File
  const handleRestoreData = (newConvs: Conversation[], newSettings: UserSettings) => {
    updateConversations(newConvs);
    updateSettings(newSettings);
    if (newConvs.length > 0) {
      setActiveId(newConvs[0].id);
    }
  };

  // Theme styling classes
  const themeClasses = {
    dark: 'bg-zinc-950 text-zinc-100',
    midnight: 'bg-black text-zinc-100',
    slate: 'bg-slate-950 text-slate-100',
    cyberpunk: 'bg-[#0d0718] text-purple-100',
    light: 'bg-zinc-50 text-zinc-900',
  }[settings.theme] || 'bg-zinc-950 text-zinc-100';

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${themeClasses}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        settings={settings}
        syncCode={syncCode}
        isOpen={isSidebarMobileOpen}
        onCloseMobile={() => setIsSidebarMobileOpen(false)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onTogglePin={handleTogglePin}
        onRenameConversation={handleRenameConversation}
        onOpenImageStudio={() => setIsImageStudioOpen(true)}
        onOpenVoiceMode={() => setIsVoiceModeOpen(true)}
        onOpenCodeLab={() => {
          setCodeLabInitialCode(undefined);
          setCodeLabInitialLang(undefined);
          setIsCodeLabOpen(true);
        }}
        onOpenSongStudio={() => setIsSongStudioOpen(true)}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Chat Area */}
      <ChatArea
        conversation={activeConversation}
        settings={settings}
        isGenerating={isGenerating}
        generatingStatusText={generatingStatusText}
        onSendMessage={handleSendMessage}
        onRegenerate={handleRegenerate}
        onEditMessage={handleEditMessage}
        onOpenVoiceMode={() => setIsVoiceModeOpen(true)}
        onOpenImageStudio={() => setIsImageStudioOpen(true)}
        onOpenCodeLab={() => {
          setCodeLabInitialCode(undefined);
          setCodeLabInitialLang(undefined);
          setIsCodeLabOpen(true);
        }}
        onOpenSongStudio={() => setIsSongStudioOpen(true)}
        onOpenSidebar={() => setIsSidebarMobileOpen(true)}
        onChangeModel={handleChangeModel}
        onOpenImageLightbox={(url, prompt) => setLightboxData({ url, prompt })}
        onOpenCodeInSandbox={handleOpenCodeInSandbox}
      />

      {/* Fullscreen Hands-Free Voice Mode Modal */}
      <VoiceModeModal
        isOpen={isVoiceModeOpen}
        onClose={() => setIsVoiceModeOpen(false)}
        settings={settings}
        onSendMessage={handleSendMessage}
      />

      {/* Vexo Vision Image Studio Modal */}
      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        onInsertToChat={handleInsertStudioImage}
        onOpenLightbox={(url, prompt) => setLightboxData({ url, prompt })}
      />

      {/* Vexo Developer Studio & Sandbox Modal */}
      <CodeLabModal
        isOpen={isCodeLabOpen}
        onClose={() => setIsCodeLabOpen(false)}
        onInsertToChat={handleInsertCodeToChat}
        initialCode={codeLabInitialCode}
        initialLanguage={codeLabInitialLang}
      />

      {/* Vexo Sing & Song Studio Modal */}
      <SongStudioModal
        isOpen={isSongStudioOpen}
        onClose={() => setIsSongStudioOpen(false)}
        onInsertToChat={(content) => {
          if (!activeConversation) handleNewConversation();
          const assistantMsg: Message = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content,
            timestamp: Date.now(),
          };
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === activeId);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              updatedAt: Date.now(),
              messages: [...next[idx].messages, assistantMsg],
            };
            saveConversations(next);
            return next;
          });
        }}
      />

      {/* Cross-Platform Device Sync Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncCode={syncCode}
        conversations={conversations}
        settings={settings}
        onRestoreData={handleRestoreData}
      />

      {/* User Preferences & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={updateSettings}
      />

      {/* Fullscreen Image Lightbox */}
      <ImageLightbox
        isOpen={!!lightboxData}
        imageUrl={lightboxData?.url || ''}
        prompt={lightboxData?.prompt || ''}
        onClose={() => setLightboxData(null)}
      />
    </div>
  );
}
