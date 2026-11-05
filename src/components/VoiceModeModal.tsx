import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2, Sparkles, AlertCircle, MessageSquare } from 'lucide-react';
import { speechManager } from '../utils/speech';
import { UserSettings } from '../types';

interface VoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSendMessage: (text: string) => Promise<string | null>;
}

export const VoiceModeModal: React.FC<VoiceModeModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSendMessage,
}) => {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastAiResponse, setLastAiResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(true);

  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    if (isOpen) {
      startListeningLoop();
    } else {
      cleanupVoice();
    }
    return () => cleanupVoice();
  }, [isOpen]);

  const cleanupVoice = () => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    speechManager.stopListening();
    speechManager.stopSpeaking();
    setStatus('idle');
    setTranscript('');
  };

  const startListeningLoop = () => {
    if (isMuted) return;
    setErrorMessage(null);
    setStatus('listening');
    setTranscript('');
    finalTranscriptRef.current = '';

    const supported = speechManager.startListening(
      (text, isFinal) => {
        setTranscript(text);
        if (text) {
          finalTranscriptRef.current = text;
        }

        // If user pauses for 1.6s after speaking, automatically submit!
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (text.trim().length > 1) {
          silenceTimeoutRef.current = setTimeout(() => {
            handleUserTurnFinished(finalTranscriptRef.current);
          }, 1600);
        }
      },
      (err) => {
        console.warn('Voice recognition notice:', err);
        if (err === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser.');
          setStatus('idle');
        }
      },
      () => {
        // Recognition ended
        if (finalTranscriptRef.current.trim().length > 1 && status === 'listening') {
          handleUserTurnFinished(finalTranscriptRef.current);
        }
      }
    );

    if (!supported) {
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      setStatus('idle');
    }
  };

  const handleUserTurnFinished = async (spokenText: string) => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    speechManager.stopListening();

    const query = spokenText.trim();
    if (!query) {
      setStatus('listening');
      startListeningLoop();
      return;
    }

    setStatus('thinking');

    try {
      const response = await onSendMessage(query);
      if (response) {
        setLastAiResponse(response);
        setStatus('speaking');
        speechManager.speak(response, {
          voiceName: settings.voiceName,
          rate: settings.speechRate,
          pitch: settings.speechPitch,
          onStart: () => setStatus('speaking'),
          onEnd: () => {
            // Automatically loop back to listening for hands-free dialogue!
            setStatus('listening');
            startListeningLoop();
          },
          onError: () => {
            setStatus('listening');
            startListeningLoop();
          },
        });
      } else {
        setStatus('listening');
        startListeningLoop();
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error processing speech turn.');
      setStatus('idle');
    }
  };

  const handleInterrupt = () => {
    speechManager.stopSpeaking();
    speechManager.stopListening();
    startListeningLoop();
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      startListeningLoop();
    } else {
      setIsMuted(true);
      cleanupVoice();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-zinc-950/95 backdrop-blur-2xl text-white p-6 sm:p-10 select-none animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-base sm:text-lg tracking-tight">Vexo Live Voice</h2>
            <p className="text-xs text-zinc-400">Continuous Hands-Free Neural Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`p-2.5 rounded-full border transition-all cursor-pointer ${
              showTranscript
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Toggle transcript"
          >
            <MessageSquare size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Close voice mode"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Visualizer Orb */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto w-full max-w-md text-center">
        {errorMessage ? (
          <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm max-w-sm space-y-2">
            <AlertCircle size={24} className="mx-auto text-red-400" />
            <p className="font-medium">{errorMessage}</p>
            <button
              onClick={startListeningLoop}
              className="mt-3 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-xs font-semibold cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            {/* Outer pulsating rings */}
            <div
              className={`absolute rounded-full transition-all duration-700 pointer-events-none ${
                status === 'speaking'
                  ? 'w-72 h-72 sm:w-80 sm:h-80 bg-indigo-500/20 blur-3xl animate-pulse'
                  : status === 'listening'
                  ? 'w-64 h-64 sm:w-72 sm:h-72 bg-purple-500/20 blur-2xl animate-ping [animation-duration:3s]'
                  : status === 'thinking'
                  ? 'w-64 h-64 bg-pink-500/25 blur-3xl'
                  : 'w-48 h-48 bg-zinc-800/40 blur-xl'
              }`}
            />

            {/* Glowing Orb */}
            <div
              onClick={status === 'speaking' ? handleInterrupt : undefined}
              className={`relative z-10 w-40 h-40 sm:w-48 sm:h-48 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 cursor-pointer ${
                status === 'speaking'
                  ? 'bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 scale-110 shadow-indigo-500/40 ring-4 ring-indigo-400/40 animate-pulse'
                  : status === 'listening'
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-800 scale-100 shadow-purple-600/30 ring-2 ring-purple-400/30'
                  : status === 'thinking'
                  ? 'bg-gradient-to-tr from-purple-700 via-pink-600 to-amber-500 scale-95 animate-spin [animation-duration:4s]'
                  : 'bg-zinc-800 scale-90'
              }`}
            >
              {status === 'speaking' ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-6 bg-white rounded-full animate-soundwave"></span>
                  <span className="w-1.5 h-12 bg-white rounded-full animate-soundwave [animation-delay:0.15s]"></span>
                  <span className="w-1.5 h-16 bg-white rounded-full animate-soundwave [animation-delay:0.3s]"></span>
                  <span className="w-1.5 h-10 bg-white rounded-full animate-soundwave [animation-delay:0.45s]"></span>
                  <span className="w-1.5 h-5 bg-white rounded-full animate-soundwave [animation-delay:0.6s]"></span>
                </div>
              ) : status === 'listening' ? (
                <Mic size={44} className="text-white drop-shadow-md animate-pulse" />
              ) : status === 'thinking' ? (
                <Sparkles size={40} className="text-white drop-shadow-md" />
              ) : (
                <MicOff size={40} className="text-zinc-400" />
              )}
            </div>
          </div>
        )}

        {/* Live Status Label */}
        <div className="mt-8 space-y-1.5">
          <p className="text-base sm:text-lg font-medium text-zinc-100">
            {status === 'listening'
              ? transcript
                ? `"${transcript}"`
                : 'Listening to your voice...'
              : status === 'thinking'
              ? 'Vexo is reasoning...'
              : status === 'speaking'
              ? 'Vexo is speaking (tap orb to interrupt)'
              : 'Voice Mode Paused'}
          </p>
          <p className="text-xs text-zinc-500">
            {status === 'speaking'
              ? 'Tap anywhere on the orb to interrupt'
              : 'Speak naturally, Vexo will respond when you pause'}
          </p>
        </div>
      </div>

      {/* Bottom Live Transcript Sheet */}
      {showTranscript && (transcript || lastAiResponse) && (
        <div className="w-full max-w-2xl bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 mb-6 backdrop-blur-md max-h-36 overflow-y-auto space-y-2 text-xs">
          {transcript && (
            <div className="flex gap-2">
              <span className="font-semibold text-zinc-400 flex-shrink-0">You:</span>
              <span className="text-zinc-200">{transcript}</span>
            </div>
          )}
          {lastAiResponse && (
            <div className="flex gap-2">
              <span className="font-semibold text-indigo-400 flex-shrink-0">Vexo:</span>
              <span className="text-zinc-300 line-clamp-3">{lastAiResponse}</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Controls */}
      <div className="w-full max-w-md flex items-center justify-center gap-4 z-10 pb-4">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full border transition-all cursor-pointer ${
            isMuted
              ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        <button
          onClick={onClose}
          className="px-6 py-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-all shadow-lg shadow-red-600/30 cursor-pointer"
        >
          End Voice Session
        </button>
      </div>
    </div>
  );
};
