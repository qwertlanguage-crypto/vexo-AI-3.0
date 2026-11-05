import React from 'react';
import { X, Download, Copy, Check } from 'lucide-react';

interface ImageLightboxProps {
  isOpen: boolean;
  imageUrl: string;
  prompt: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  imageUrl,
  prompt,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `vexo-artwork-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 backdrop-blur-xl p-4 sm:p-8 select-none animate-in fade-in duration-200"
    >
      {/* Top Header */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl flex items-center justify-between text-white z-10"
      >
        <p className="text-xs text-zinc-300 italic truncate max-w-lg">
          "{prompt}"
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Copy image URL"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
          <button
            onClick={handleDownload}
            className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Download full-resolution image"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Close viewer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Image */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex items-center justify-center max-w-5xl max-h-[82vh] overflow-hidden rounded-2xl shadow-2xl border border-white/10"
      >
        <img
          src={imageUrl}
          alt={prompt}
          className="max-h-[82vh] max-w-full object-contain"
        />
      </div>

      {/* Footer Info */}
      <div className="text-[11px] text-zinc-500 font-mono">
        Vexo Vision Neural Rendering Engine
      </div>
    </div>
  );
};
