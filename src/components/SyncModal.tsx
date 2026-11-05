import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Smartphone,
  Laptop,
  Download,
  Upload,
  Radio,
  CheckCircle2,
  AlertCircle,
  QrCode,
} from 'lucide-react';
import { Conversation, UserSettings } from '../types';
import { pushToCloudSync, pullFromCloudSync, setSyncCode } from '../utils/storage';
import { exportFullBackup } from '../utils/export';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncCode: string;
  conversations: Conversation[];
  settings: UserSettings;
  onRestoreData: (conversations: Conversation[], settings: UserSettings) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  syncCode,
  conversations,
  settings,
  onRestoreData,
}) => {
  const [copied, setCopied] = useState(false);
  const [remoteCode, setRemoteCode] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePushCurrent = async () => {
    setIsPushing(true);
    setStatusMessage(null);
    try {
      await pushToCloudSync(syncCode, conversations, settings);
      setStatusMessage({
        type: 'success',
        text: `Successfully synced ${conversations.length} chats to cloud code ${syncCode}.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to push cloud sync.',
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handlePairRemote = async () => {
    const code = remoteCode.trim().toUpperCase();
    if (!code) return;

    setIsPulling(true);
    setStatusMessage(null);
    try {
      const result = await pullFromCloudSync(code);
      if (result && result.data) {
        setSyncCode(code);
        onRestoreData(result.data.conversations || [], result.data.settings || settings);
        setStatusMessage({
          type: 'success',
          text: `Paired and synchronized ${result.data.conversations?.length || 0} chats from ${code}!`,
        });
        setRemoteCode('');
      } else {
        throw new Error('No sync data found for this code.');
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Device sync code not found. Make sure the other device pressed "Sync Now".',
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);
        if (parsed.conversations && Array.isArray(parsed.conversations)) {
          onRestoreData(parsed.conversations, parsed.settings || settings);
          setStatusMessage({
            type: 'success',
            text: `Successfully restored ${parsed.conversations.length} conversations from backup file.`,
          });
        } else {
          throw new Error('Invalid backup format.');
        }
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err?.message || 'Failed to parse JSON backup file.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Share2 size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-white">Cross-Platform Sync</h2>
              <p className="text-xs text-zinc-400">Pair devices & sync chats seamlessly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status banner */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 size={16} className="flex-shrink-0" />
              ) : (
                <AlertCircle size={16} className="flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Device Sync Code Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                This Device Sync Code
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium border border-emerald-500/20">
                <Radio size={10} className="animate-pulse" />
                Live Sync Active
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="space-y-0.5">
                <p className="font-mono text-2xl font-bold tracking-widest text-indigo-400">
                  {syncCode}
                </p>
                <p className="text-[11px] text-zinc-500">
                  Enter this code on your phone, tablet, or secondary laptop
                </p>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-zinc-400">
                Push your {conversations.length} chats & settings to the cloud:
              </p>
              <button
                onClick={handlePushCurrent}
                disabled={isPushing}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-2 shadow-md shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={13} className={isPushing ? 'animate-spin' : ''} />
                <span>{isPushing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
          </div>

          {/* Pair with Another Device */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Pair with Another Device
            </span>
            <p className="text-xs text-zinc-400">
              Enter the 6-digit sync code shown on your other device:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. VX-938201"
                value={remoteCode}
                onChange={(e) => setRemoteCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                onClick={handlePairRemote}
                disabled={!remoteCode.trim() || isPulling}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-medium flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={13} className={isPulling ? 'animate-spin' : ''} />
                <span>{isPulling ? 'Pairing...' : 'Connect & Import'}</span>
              </button>
            </div>
          </div>

          {/* Backup & Portability */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Local File Backup & Restore
            </span>
            <p className="text-xs text-zinc-400">
              Store a complete portable JSON snapshot of all your conversations:
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => exportFullBackup(conversations, settings)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download size={14} className="text-indigo-400" />
                <span>Export Full Backup (.json)</span>
              </button>
              <label className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer">
                <Upload size={14} className="text-purple-400" />
                <span>Restore Backup (.json)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
