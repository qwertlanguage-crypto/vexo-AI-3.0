import React, { useState } from 'react';
import {
  X,
  Music,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Sparkles,
  Volume2,
  Mic2,
  Sliders,
  Send,
  Loader2,
  Disc3,
  ListMusic,
  Heart,
  Share2,
} from 'lucide-react';
import { speechManager } from '../utils/speech';

interface SongStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat?: (content: string) => void;
}

interface SongRecord {
  id: string;
  title: string;
  genre: string;
  tempo: string;
  key: string;
  lyrics: string;
  chords: string;
  notes: string;
  instrumentation: string[];
}

const PRESET_STYLES = [
  { id: 'synthwave', name: 'Cyberpunk Synthwave', desc: '80s analog arpeggiators & neon synth leads', tempo: '118 BPM', key: 'D Minor' },
  { id: 'lofi', name: 'Lo-Fi Chill Hop', desc: 'Warm vinyl crackle, Rhodes piano & mellow 7th chords', tempo: '84 BPM', key: 'F# Major' },
  { id: 'pop', name: 'Cinematic Electro-Pop', desc: 'Modern soaring hooks, vocal chops & sub drops', tempo: '124 BPM', key: 'A Minor' },
  { id: 'acoustic', name: 'Acoustic Indie Folk', desc: 'Fingerpicked acoustic guitar, subtle strings & warm harmonies', tempo: '96 BPM', key: 'G Major' },
  { id: 'rock', name: 'Alternative Modern Rock', desc: 'Driving bass riffs, distorted guitars & punchy drum kit', tempo: '135 BPM', key: 'E Minor' },
];

export const SongStudioModal: React.FC<SongStudioModalProps> = ({
  isOpen,
  onClose,
  onInsertToChat,
}) => {
  const [songIdea, setSongIdea] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(PRESET_STYLES[0]);
  const [mood, setMood] = useState('atmospheric, evocative, deeply emotional');
  const [includeChords, setIncludeChords] = useState(true);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [activeSong, setActiveSong] = useState<SongRecord | null>(null);
  const [isPlayingSynth, setIsPlayingSynth] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Web Audio synthetic chord arpeggio player
  const playMusicalChords = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Simple pentatonic/synth progression notes
      const notes = [
        [220.0, 261.63, 329.63, 392.0], // Am7
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [261.63, 329.63, 392.0, 523.25], // Cmaj7
        [196.0, 246.94, 293.66, 392.0],  // G
      ];

      setIsPlayingSynth(true);
      let step = 0;
      const interval = setInterval(() => {
        if (step >= notes.length * 2) {
          clearInterval(interval);
          setIsPlayingSynth(false);
          return;
        }

        const chord = notes[step % notes.length];
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = selectedStyle.id === 'synthwave' ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);

          gain.gain.setValueAtTime(0.04, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime + i * 0.06);
          osc.stop(ctx.currentTime + 1.4);
        });

        step++;
      }, 700);
    } catch (e) {
      console.error(e);
      setIsPlayingSynth(false);
    }
  };

  const handleComposeSong = async () => {
    if (!songIdea.trim() && !selectedStyle) return;
    setIsSynthesizing(true);
    try {
      const prompt = `Compose a complete, masterfully crafted song including full structure (Verse 1, Pre-Chorus, Chorus, Verse 2, Bridge, Outro), chord progressions, vocal melody guidance, and instrumentation arrangement.
Theme/Concept: "${songIdea.trim() || 'A luminous futuristic metropolis at midnight under neon rainfall'}"
Genre: ${selectedStyle.name} (${selectedStyle.desc})
Tempo: ${selectedStyle.tempo}
Key: ${selectedStyle.key}
Mood: ${mood}
Include guitar/piano chord markers above lyrics: ${includeChords ? 'YES' : 'NO'}.

Format the response cleanly with markdown headers, chord brackets, and production notes.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await res.json();
      const content = data.content || '';

      const generatedTitle =
        content.match(/^#\s+(.+)$/m)?.[1]?.replace(/["*]/g, '') ||
        songIdea.substring(0, 30) ||
        `${selectedStyle.name} Anthem`;

      setActiveSong({
        id: `song-${Date.now()}`,
        title: generatedTitle,
        genre: selectedStyle.name,
        tempo: selectedStyle.tempo,
        key: selectedStyle.key,
        lyrics: content,
        chords: includeChords ? 'Chords Embedded in Score' : 'Standard Melody Track',
        notes: `Composed via Vexo Audio Harmonic Engine • 44.1kHz Synthetic Acoustics`,
        instrumentation: [
          selectedStyle.id === 'synthwave' ? 'Analog Synthesizer' : 'Acoustic Piano',
          'Rhythm Percussion Drum Machine',
          'Harmonic Sub Bass',
          'Vocal Harmony Lead',
        ],
      });
    } catch (err) {
      console.error('Song synthesis error:', err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (song: SongRecord) => {
    const text = `# ${song.title}\nGenre: ${song.genre} | Tempo: ${song.tempo} | Key: ${song.key}\n\n${song.lyrics}`;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.title.toLowerCase().replace(/\s+/g, '-')}-score.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReadLyricsAloud = () => {
    if (!activeSong) return;
    speechManager.speak(activeSong.lyrics, { rate: 0.95 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Music size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>Vexo Song & Audio Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  Sing & Compose
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Compose original lyrics, harmonic chords, melodies & acoustic chord previews
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Studio Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950 space-y-6">
          {/* Top Idea Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                <span>Song Concept, Story or Catchphrase</span>
              </label>
              <span className="text-[11px] text-zinc-500">Full verse, chorus & chord progressions</span>
            </div>
            <textarea
              value={songIdea}
              onChange={(e) => setSongIdea(e.target.value)}
              placeholder="e.g. A retro-futuristic love song about two explorers racing across planetary rings before sunrise..."
              rows={2}
              className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none font-sans"
            />
          </div>

          {/* Style & Genre Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Musical Genre & Sonic Palette
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {PRESET_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedStyle.id === style.id
                      ? 'bg-rose-500/15 border-rose-500/50 shadow-md shadow-rose-500/10'
                      : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-zinc-200">{style.name}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{style.tempo}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{style.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeChords}
                  onChange={(e) => setIncludeChords(e.target.checked)}
                  className="rounded border-zinc-700 text-rose-500 focus:ring-rose-500"
                />
                <span>Include chord tabs [C, G, Am, F]</span>
              </label>
            </div>

            <button
              onClick={handleComposeSong}
              disabled={isSynthesizing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/30 disabled:opacity-50 cursor-pointer transition-all"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Composing Harmonies...</span>
                </>
              ) : (
                <>
                  <Mic2 size={15} />
                  <span>Compose Original Song</span>
                </>
              )}
            </button>
          </div>

          {/* Composed Song Output Card */}
          {activeSong && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-2xl overflow-hidden mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Song Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-850 via-zinc-900 to-zinc-850 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Disc3 size={18} className="text-rose-400 animate-spin [animation-duration:8s]" />
                    <h3 className="font-bold text-base text-white">{activeSong.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                    <span className="text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {activeSong.genre}
                    </span>
                    <span>• {activeSong.tempo}</span>
                    <span>• Key of {activeSong.key}</span>
                  </div>
                </div>

                {/* Audio Preview Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={playMusicalChords}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isPlayingSynth
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    }`}
                    title="Play synthetic chord progression audio"
                  >
                    {isPlayingSynth ? <Pause size={13} /> : <Play size={13} />}
                    <span>{isPlayingSynth ? 'Playing Harmonies...' : 'Play Chord Preview'}</span>
                  </button>

                  <button
                    onClick={handleReadLyricsAloud}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Recite lyrics with voice engine"
                  >
                    <Volume2 size={15} />
                  </button>

                  <button
                    onClick={() => handleCopy(activeSong.lyrics)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy full score"
                  >
                    {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                  </button>

                  <button
                    onClick={() => handleDownload(activeSong)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Download chord score (.md)"
                  >
                    <Download size={15} />
                  </button>

                  {onInsertToChat && (
                    <button
                      onClick={() => {
                        onInsertToChat(activeSong.lyrics);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 cursor-pointer"
                    >
                      <Send size={13} />
                      <span>Send to Chat</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Instrumentation tags */}
              <div className="px-5 py-2.5 bg-zinc-950/60 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto text-xs text-zinc-400">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Arrangement:</span>
                {activeSong.instrumentation.map((inst, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-zinc-800/60 border border-zinc-700 text-[11px] text-zinc-300 whitespace-nowrap"
                  >
                    {inst}
                  </span>
                ))}
              </div>

              {/* Song Score Display */}
              <div className="p-5 max-h-[380px] overflow-y-auto bg-zinc-950 text-xs sm:text-sm font-mono text-zinc-200 leading-relaxed whitespace-pre-wrap selection:bg-rose-500/30">
                {activeSong.lyrics}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
