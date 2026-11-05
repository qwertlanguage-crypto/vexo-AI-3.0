import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Download,
  Image as ImageIcon,
  Crop,
  Palette,
  Loader2,
  Maximize2,
  Copy,
  Check,
  Send,
  Lightbulb,
} from 'lucide-react';
import { GeneratedImage } from '../types';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat?: (image: GeneratedImage) => void;
  onOpenLightbox?: (url: string, prompt: string) => void;
}

const STYLE_PRESETS = [
  { id: 'cinematic', label: 'Cinematic 35mm', promptSuffix: ', cinematic lighting, 35mm lens, 8k resolution, photorealistic masterpiece' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', promptSuffix: ', futuristic cyberpunk aesthetics, glowing neon reflections, hyper-detailed, synthwave color palette' },
  { id: 'anime', label: 'Anime & Manga', promptSuffix: ', detailed modern anime aesthetic, Makoto Shinkai style, vibrant colors, expressive lighting' },
  { id: '3d-render', label: '3D Octane Render', promptSuffix: ', octane render, raytracing, Pixar-like quality, smooth soft lighting, volumetric atmosphere' },
  { id: 'fantasy', label: 'Epic Fantasy', promptSuffix: ', high fantasy concept art, intricate mythical details, magical ethereal glow, award-winning illustration' },
  { id: 'minimalist', label: 'Minimalist Clean', promptSuffix: ', minimalist composition, clean geometric lines, pastel tones, elegant architectural aesthetic' },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square (1:1)', desc: 'Social & Avatars' },
  { id: '16:9', label: 'Widescreen (16:9)', desc: 'Landscape & Desktop' },
  { id: '9:16', label: 'Portrait (9:16)', desc: 'Mobile & Stories' },
  { id: '4:3', label: 'Classic (4:3)', desc: 'Standard Photo' },
];

const PROMPT_IDEAS = [
  'A neon-lit cybernetic owl perched on a holographic skyscraper in Tokyo at midnight',
  'An ethereal floating island with crystal waterfalls, illuminated by binary star systems',
  'A cozy retro coffee shop tucked inside an enchanted giant hollow redwood tree',
  'A sleek futuristic sports car crafted from liquid chrome driving through a desert vortex',
  'An ancient mystical library with floating glowing spellbooks and arched glass ceilings',
];

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  onInsertToChat,
  onOpenLightbox,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [recentImages, setRecentImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      let finalPrompt = prompt.trim();
      if (selectedStyle) {
        const style = STYLE_PRESETS.find((s) => s.id === selectedStyle);
        if (style) finalPrompt += style.promptSuffix;
      }

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          aspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      const newImg: GeneratedImage = {
        url: data.imageUrl,
        prompt: prompt.trim(),
        aspectRatio,
        createdAt: Date.now(),
      };

      setCurrentImage(newImg);
      setRecentImages((prev) => [newImg, ...prev]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error creating image with Vexo Vision.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (img: GeneratedImage) => {
    const a = document.createElement('a');
    a.href = img.url;
    a.download = `vexo-art-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = (img: GeneratedImage) => {
    navigator.clipboard.writeText(img.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-white">Vexo Vision Studio</h2>
              <p className="text-xs text-zinc-400">High-fidelity generative visual synthesis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Prompt Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Prompt Description</span>
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe whatever you want Vexo to visualize..."
                rows={3}
                className="w-full p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="absolute bottom-3 right-3 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Rendering...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Generate Artwork</span>
                  </>
                )}
              </button>
            </div>

            {/* Inspiration pills */}
            <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs text-zinc-400 scrollbar-none">
              <Lightbulb size={13} className="text-amber-400 flex-shrink-0" />
              <span className="text-zinc-500 flex-shrink-0">Try:</span>
              {PROMPT_IDEAS.slice(0, 3).map((idea, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(idea)}
                  className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 hover:text-white transition-colors truncate max-w-xs cursor-pointer flex-shrink-0"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          {/* Controls: Aspect Ratio & Styles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Crop size={14} className="text-indigo-400" />
                <span>Aspect Ratio</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      aspectRatio === ratio.id
                        ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-sm ring-1 ring-indigo-500/50'
                        : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <p className="text-xs font-semibold text-zinc-200">{ratio.label}</p>
                    <p className="text-[11px] text-zinc-500">{ratio.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Style Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette size={14} className="text-purple-400" />
                <span>Artistic Style</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() =>
                      setSelectedStyle(selectedStyle === style.id ? null : style.id)
                    }
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedStyle === style.id
                        ? 'bg-purple-600/15 border-purple-500 text-purple-300 shadow-sm ring-1 ring-purple-500/50'
                        : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <p className="text-xs font-semibold text-zinc-200">{style.label}</p>
                    <p className="text-[11px] text-zinc-500">
                      {selectedStyle === style.id ? 'Active' : 'Preset'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Current Generated Image Output */}
          {isGenerating ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <Sparkles size={24} className="text-indigo-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Synthesizing image with Vexo Vision...</p>
                <p className="text-xs text-zinc-500 mt-1">Applying diffusion passes and lighting models</p>
              </div>
            </div>
          ) : currentImage ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden shadow-2xl">
              <div className="relative max-h-[460px] bg-zinc-950 flex items-center justify-center overflow-hidden">
                <img
                  src={currentImage.url}
                  alt={currentImage.prompt}
                  className="max-h-[460px] w-auto object-contain mx-auto"
                />
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-zinc-300 font-medium line-clamp-2">"{currentImage.prompt}"</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                    Ratio: {currentImage.aspectRatio} • {new Date(currentImage.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onOpenLightbox && onOpenLightbox(currentImage.url, currentImage.prompt)
                    }
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Fullscreen Lightbox"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <button
                    onClick={() => handleCopyLink(currentImage)}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy Data URL"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => handleDownload(currentImage)}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Download PNG"
                  >
                    <Download size={14} />
                  </button>
                  {onInsertToChat && (
                    <button
                      onClick={() => {
                        onInsertToChat(currentImage);
                        onClose();
                      }}
                      className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send size={13} />
                      <span>Insert to Chat</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Recent Images Strip */}
          {recentImages.length > 1 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Session Creations ({recentImages.length})
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {recentImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentImage(img)}
                    className={`aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all hover:scale-105 ${
                      currentImage?.url === img.url
                        ? 'border-indigo-500 ring-2 ring-indigo-500/40'
                        : 'border-zinc-800 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
