import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Sliders,
  Volume2,
  Moon,
  Sparkles,
  Save,
  Check,
  RotateCcw,
  Bot,
  Brain,
  Globe,
  Palette,
} from 'lucide-react';
import { UserSettings, ThemeType, ResponseTone, ReasoningDepth } from '../types';
import { speechManager } from '../utils/speech';
import { DEFAULT_SETTINGS } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
}

type TabType = 'general' | 'persona' | 'voice' | 'theme' | 'intelligence';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [form, setForm] = useState<UserSettings>(settings);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [savedAlert, setSavedAlert] = useState(false);

  useEffect(() => {
    setForm(settings);
    setAvailableVoices(speechManager.getVoices());
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleChange = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSaveSettings(form);
    setSavedAlert(true);
    setTimeout(() => {
      setSavedAlert(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    setForm(DEFAULT_SETTINGS);
  };

  const THEMES: Array<{ id: ThemeType; label: string; desc: string; colors: string }> = [
    { id: 'dark', label: 'Dark Nebula', desc: 'Standard deep zinc with indigo glow', colors: 'bg-zinc-950 border-zinc-800 text-indigo-400' },
    { id: 'midnight', label: 'Midnight OLED', desc: 'True #000000 black for OLED screens', colors: 'bg-black border-zinc-900 text-purple-400' },
    { id: 'slate', label: 'Slate Cyan', desc: 'Deep navy steel with cyan highlights', colors: 'bg-slate-950 border-slate-800 text-cyan-400' },
    { id: 'cyberpunk', label: 'Cyberpunk', desc: 'Futuristic purple & neon teal theme', colors: 'bg-purple-950/60 border-purple-800 text-pink-400' },
    { id: 'light', label: 'Pristine Light', desc: 'Crisp minimal modern bright theme', colors: 'bg-zinc-100 border-zinc-300 text-zinc-900' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-white">Vexo-AI Preferences</h2>
              <p className="text-xs text-zinc-400">Configure persona, intelligence, audio & appearance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-zinc-800/80 overflow-x-auto text-xs font-medium">
          {[
            { id: 'general', label: 'Profile', icon: User },
            { id: 'persona', label: 'Instructions', icon: Bot },
            { id: 'intelligence', label: 'Intelligence', icon: Brain },
            { id: 'voice', label: 'Voice & Audio', icon: Volume2 },
            { id: 'theme', label: 'Themes & UI', icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Your Name / Handle
                </label>
                <input
                  type="text"
                  value={form.userName}
                  onChange={(e) => handleChange('userName', e.target.value)}
                  placeholder="How should Vexo address you?"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Role / Specialty
                </label>
                <input
                  type="text"
                  value={form.userRole}
                  onChange={(e) => handleChange('userRole', e.target.value)}
                  placeholder="e.g. Senior Software Architect, Novelist, Researcher"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Response Style & Tone
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'balanced', label: 'Balanced', desc: 'Natural & versatile' },
                    { id: 'concise', label: 'Concise', desc: 'Direct & bulleted' },
                    { id: 'detailed', label: 'Deep Dive', desc: 'Exhaustive & nuanced' },
                    { id: 'creative', label: 'Creative', desc: 'Evocative & imaginative' },
                    { id: 'technical', label: 'Technical', desc: 'Code & architectural' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleChange('responseTone', t.id as ResponseTone)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        form.responseTone === t.id
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/40'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <p className="text-xs font-semibold text-zinc-200">{t.label}</p>
                      <p className="text-[11px] text-zinc-500">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Persona & Custom Instructions */}
          {activeTab === 'persona' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Custom Persona Instructions</span>
                  <span className="text-[11px] text-zinc-500 normal-case">Injected into system context</span>
                </label>
                <textarea
                  value={form.customInstructions}
                  onChange={(e) => handleChange('customInstructions', e.target.value)}
                  placeholder="Tell Vexo how you want it to behave. Examples:
- 'Always write code using modern TypeScript with strict typing'
- 'Keep explanations brief without conversational fluff'
- 'Adopt an encouraging, witty mentor tone'
- 'Explain math formulas step by step with intuition first'"
                  rows={6}
                  className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm leading-relaxed"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
                <Sparkles size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>
                  These custom instructions persist across all conversations and are synchronized across your paired devices.
                </span>
              </div>
            </div>
          )}

          {/* Intelligence & Web Search */}
          {activeTab === 'intelligence' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Vexo Reasoning Depth
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'low', label: 'Speed Priority', desc: 'Minimal latency' },
                    { id: 'medium', label: 'Balanced Reasoning', desc: 'Recommended default' },
                    { id: 'high', label: 'Deep Thinking Chain', desc: 'Maximum logic proof' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => handleChange('reasoningDepth', lvl.id as ReasoningDepth)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        form.reasoningDepth === lvl.id
                          ? 'bg-purple-600/15 border-purple-500 text-purple-300 ring-1 ring-purple-500/40'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <p className="text-xs font-semibold text-zinc-200">{lvl.label}</p>
                      <p className="text-[11px] text-zinc-500">{lvl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-indigo-400" />
                    <span className="text-xs font-semibold text-zinc-200">
                      Real-time Web Search by Default
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Automatically ground answers with live web crawling for current events, news, and technical docs
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.defaultWebSearch}
                  onChange={(e) => handleChange('defaultWebSearch', e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="space-y-0.5 pr-4">
                  <span className="text-xs font-semibold text-zinc-200">
                    Interface Audio Effects
                  </span>
                  <p className="text-[11px] text-zinc-500">
                    Play gentle futuristic sound feedback when sending and receiving responses
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.soundEffects}
                  onChange={(e) => handleChange('soundEffects', e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Voice & Audio Tab */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Voice Persona
                </label>
                <select
                  value={form.voiceName}
                  onChange={(e) => handleChange('voiceName', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm cursor-pointer"
                >
                  <option value="">Default Vexo Natural Voice</option>
                  {availableVoices
                    .filter((v) => v.lang.startsWith('en'))
                    .map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-300">
                  <span>Speech Rate</span>
                  <span className="font-mono text-indigo-400">{form.speechRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.05"
                  value={form.speechRate}
                  onChange={(e) => handleChange('speechRate', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 mt-2">
                <div className="space-y-0.5 pr-4">
                  <span className="text-xs font-semibold text-zinc-200">
                    Auto-Speak Replies
                  </span>
                  <p className="text-[11px] text-zinc-500">
                    Automatically read assistant answers aloud after generation completes
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.autoSpeak}
                  onChange={(e) => handleChange('autoSpeak', e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Themes Tab */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Select Visual Theme
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEMES.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => handleChange('theme', th.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      form.theme === th.id
                        ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-zinc-900'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-sm text-zinc-100">{th.label}</span>
                      <span className={`w-3 h-3 rounded-full ${th.colors}`} />
                    </div>
                    <p className="text-xs text-zinc-400">{th.desc}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Chat Font Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sm', label: 'Compact' },
                    { id: 'base', label: 'Default' },
                    { id: 'lg', label: 'Large' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleChange('fontSize', f.id as any)}
                      className={`py-2 rounded-xl border text-xs font-medium cursor-pointer ${
                        form.fontSize === f.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              {savedAlert ? (
                <>
                  <Check size={14} className="text-emerald-300" />
                  <span>Preferences Saved!</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Preferences</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
