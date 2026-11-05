import React, { useState } from 'react';
import {
  X,
  Code2,
  Play,
  Copy,
  Check,
  Download,
  Terminal,
  Bug,
  Sparkles,
  ArrowRightLeft,
  Database,
  FileCode,
  Send,
  Loader2,
  RefreshCw,
  Eye,
  Layers,
} from 'lucide-react';

interface CodeLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat?: (code: string, language: string, title: string) => void;
  initialCode?: string;
  initialLanguage?: string;
}

type CodeTab = 'sandbox' | 'generator' | 'debugger' | 'translator' | 'sql';

const SAMPLE_SANDBOX_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 24px;
      background: #09090b;
      color: #f4f4f5;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 24px;
      width: 320px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.4);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    h2 { margin: 0 0 8px 0; font-size: 20px; color: #fff; }
    p { color: #a1a1aa; font-size: 13px; margin-bottom: 20px; }
    .counter {
      font-size: 48px;
      font-weight: 800;
      color: #6366f1;
      margin-bottom: 16px;
      font-variant-numeric: tabular-nums;
    }
    .btn-group { display: flex; gap: 8px; justify-content: center; }
    button {
      background: #27272a;
      color: #fff;
      border: 1px solid #3f3f46;
      padding: 10px 18px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
    }
    button:hover { background: #6366f1; border-color: #6366f1; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Vexo Live Sandbox</div>
    <h2>Interactive Counter</h2>
    <p>Live DOM rendering with real-time state updates.</p>
    <div class="counter" id="count">0</div>
    <div class="btn-group">
      <button onclick="update(-1)">-1</button>
      <button onclick="update(0)">Reset</button>
      <button onclick="update(1)">+1</button>
    </div>
  </div>
  <script>
    let val = 0;
    function update(delta) {
      if (delta === 0) val = 0;
      else val += delta;
      document.getElementById('count').innerText = val;
    }
  </script>
</body>
</html>`;

export const CodeLabModal: React.FC<CodeLabModalProps> = ({
  isOpen,
  onClose,
  onInsertToChat,
  initialCode,
  initialLanguage,
}) => {
  const [activeTab, setActiveTab] = useState<CodeTab>('sandbox');

  // Sandbox state
  const [sandboxCode, setSandboxCode] = useState(initialCode || SAMPLE_SANDBOX_HTML);
  const [sandboxPreviewKey, setSandboxPreviewKey] = useState(0);

  // Generator state
  const [genPrompt, setGenPrompt] = useState('');
  const [genLang, setGenLang] = useState('typescript');
  const [genResult, setGenResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Debugger state
  const [bugCode, setBugCode] = useState('');
  const [bugDiagnosis, setBugDiagnosis] = useState('');
  const [isDebugging, setIsDebugging] = useState(false);

  // Translator state
  const [sourceCode, setSourceCode] = useState('');
  const [fromLang, setFromLang] = useState('python');
  const [toLang, setToLang] = useState('typescript');
  const [translatedCode, setTranslatedCode] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // SQL Studio state
  const [sqlRequirement, setSqlRequirement] = useState('');
  const [sqlResult, setSqlResult] = useState('');
  const [isGeneratingSql, setIsGeneratingSql] = useState(false);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 1. Code Generator API Call
  const handleGenerateCode = async () => {
    if (!genPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Write complete, production-ready, strictly typed ${genLang} code for: ${genPrompt}. Include comments, type definitions, and error handling. Do not omit any code.`,
            },
          ],
        }),
      });
      const data = await res.json();
      setGenResult(data.content || '// No code output returned.');
    } catch {
      setGenResult('// Failed to generate code. Please check server connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Bug Finder API Call
  const handleDebugCode = async () => {
    if (!bugCode.trim() || isDebugging) return;
    setIsDebugging(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Analyze this code for bugs, logic errors, security vulnerabilities, and edge cases. Provide the exact fix and corrected code block:\n\n\`\`\`\n${bugCode}\n\`\`\``,
            },
          ],
        }),
      });
      const data = await res.json();
      setBugDiagnosis(data.content || 'No issues found.');
    } catch {
      setBugDiagnosis('Error communicating with Vexo Debugger.');
    } finally {
      setIsDebugging(false);
    }
  };

  // 3. Code Translator API Call
  const handleTranslateCode = async () => {
    if (!sourceCode.trim() || isTranslating) return;
    setIsTranslating(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Convert this ${fromLang} code into idiomatic, modern ${toLang}. Maintain exact semantics, proper error handling, and language best practices:\n\n\`\`\`${fromLang}\n${sourceCode}\n\`\`\``,
            },
          ],
        }),
      });
      const data = await res.json();
      setTranslatedCode(data.content || '// Translation failed.');
    } catch {
      setTranslatedCode('// Error translating code.');
    } finally {
      setIsTranslating(false);
    }
  };

  // 4. SQL Schema Studio API Call
  const handleGenerateSql = async () => {
    if (!sqlRequirement.trim() || isGeneratingSql) return;
    setIsGeneratingSql(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Design a normalized PostgreSQL relational database schema for: ${sqlRequirement}. Include CREATE TABLE statements with primary keys, foreign key constraints, indexes for query performance, and sample queries.`,
            },
          ],
        }),
      });
      const data = await res.json();
      setSqlResult(data.content || '-- No SQL generated.');
    } catch {
      setSqlResult('-- Error generating schema.');
    } finally {
      setIsGeneratingSql(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Top Header */}
        <div className="px-6 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Code2 size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>Vexo Developer Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Code & Live Preview
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Interactive sandboxing, code generation, debugging & translation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-6 pt-2.5 border-b border-zinc-800 bg-zinc-950/80 overflow-x-auto text-xs font-medium">
          {[
            { id: 'sandbox', label: 'Interactive Sandbox & Runner', icon: Play },
            { id: 'generator', label: 'Code Architect & Generator', icon: FileCode },
            { id: 'debugger', label: 'Bug Finder & Linter', icon: Bug },
            { id: 'translator', label: 'Code Translator', icon: ArrowRightLeft },
            { id: 'sql', label: 'SQL & Database Architect', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CodeTab)}
                className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950">
          {/* TAB 1: Live Sandbox & Runner */}
          {activeTab === 'sandbox' && (
            <div className="h-full flex flex-col space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-2 font-medium">
                  <Play size={14} className="text-emerald-400" />
                  <span>Edit HTML/CSS/JS and view the live interactive rendering:</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSandboxPreviewKey((k) => k + 1)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Rerun Sandbox</span>
                  </button>
                  <button
                    onClick={() => handleCopy(sandboxCode)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy Code'}</span>
                  </button>
                  <button
                    onClick={() => handleDownload(sandboxCode, 'index.html')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download (.html)</span>
                  </button>
                </div>
              </div>

              {/* Split Editor and Preview */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[460px]">
                {/* Code Editor */}
                <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/90 overflow-hidden shadow-inner">
                  <div className="px-4 py-2 bg-zinc-850 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <span>index.html (Source)</span>
                    <span className="text-[11px] text-zinc-500">{sandboxCode.length} chars</span>
                  </div>
                  <textarea
                    value={sandboxCode}
                    onChange={(e) => setSandboxCode(e.target.value)}
                    className="flex-1 p-4 bg-zinc-950 text-zinc-200 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-emerald-500/30"
                    spellCheck={false}
                  />
                </div>

                {/* Live Preview Iframe */}
                <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/90 overflow-hidden shadow-2xl">
                  <div className="px-4 py-2 bg-zinc-850 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Live Interactive Sandbox</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">Sandboxed Environment</span>
                  </div>
                  <iframe
                    key={sandboxPreviewKey}
                    title="Vexo Live Preview"
                    srcDoc={sandboxCode}
                    sandbox="allow-scripts allow-modals allow-forms"
                    className="flex-1 w-full h-full bg-zinc-950 border-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Code Generator */}
          {activeTab === 'generator' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Select Language & Architecture
                  </label>
                  <select
                    value={genLang}
                    onChange={(e) => setGenLang(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python 3.12</option>
                    <option value="react">React (TSX)</option>
                    <option value="nextjs">Next.js App Router</option>
                    <option value="nodejs">Node.js Express</option>
                    <option value="rust">Rust</option>
                    <option value="golang">Go</option>
                    <option value="html">HTML5 / Tailwind</option>
                    <option value="sql">PostgreSQL / SQL</option>
                  </select>
                </div>

                <div className="relative">
                  <textarea
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    placeholder="Describe the software, script, algorithm, or component you want Vexo to build..."
                    rows={3}
                    className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none font-sans"
                  />
                  <button
                    onClick={handleGenerateCode}
                    disabled={!genPrompt.trim() || isGenerating}
                    className="absolute bottom-3 right-3 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    <span>{isGenerating ? 'Writing Code...' : 'Generate Code'}</span>
                  </button>
                </div>
              </div>

              {genResult && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden shadow-2xl">
                  <div className="px-4 py-2.5 bg-zinc-850 border-b border-zinc-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-400 font-semibold">{genLang.toUpperCase()} OUTPUT</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(genResult)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => handleDownload(genResult, `vexo-code.${genLang === 'python' ? 'py' : genLang === 'rust' ? 'rs' : 'ts'}`)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </button>
                      {onInsertToChat && (
                        <button
                          onClick={() => {
                            onInsertToChat(genResult, genLang, genPrompt);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Send size={12} />
                          <span>Insert to Chat</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto whitespace-pre-wrap max-h-[360px]">
                    <code>{genResult}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Bug Finder & Linter */}
          {activeTab === 'debugger' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Bug size={14} className="text-red-400" />
                  <span>Paste Code to Diagnose & Fix</span>
                </label>
                <textarea
                  value={bugCode}
                  onChange={(e) => setBugCode(e.target.value)}
                  placeholder="Paste buggy code or error stacktrace here..."
                  rows={6}
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-y"
                  spellCheck={false}
                />
                <button
                  onClick={handleDebugCode}
                  disabled={!bugCode.trim() || isDebugging}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isDebugging ? <Loader2 size={14} className="animate-spin" /> : <Bug size={14} />}
                  <span>{isDebugging ? 'Diagnosing Bugs...' : 'Find & Fix Vulnerabilities'}</span>
                </button>
              </div>

              {bugDiagnosis && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Vexo Diagnostic Report & Patched Code
                  </h3>
                  <div className="text-xs text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {bugDiagnosis}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Code Translator */}
          {activeTab === 'translator' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">From</label>
                  <select
                    value={fromLang}
                    onChange={(e) => setFromLang(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 cursor-pointer"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="rust">Rust</option>
                    <option value="golang">Go</option>
                  </select>
                </div>
                <ArrowRightLeft size={16} className="text-zinc-500 mt-5" />
                <div className="flex-1">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">To</label>
                  <select
                    value={toLang}
                    onChange={(e) => setToLang(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 cursor-pointer"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="rust">Rust</option>
                    <option value="golang">Go</option>
                    <option value="javascript">JavaScript</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <textarea
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  placeholder={`Paste ${fromLang} code here...`}
                  rows={8}
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono focus:outline-none resize-none"
                  spellCheck={false}
                />
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 overflow-y-auto max-h-[240px]">
                  {translatedCode ? (
                    <pre className="text-xs font-mono text-zinc-200 whitespace-pre-wrap">
                      <code>{translatedCode}</code>
                    </pre>
                  ) : (
                    <span className="text-xs text-zinc-500 font-mono">Translated code will appear here...</span>
                  )}
                </div>
              </div>

              <button
                onClick={handleTranslateCode}
                disabled={!sourceCode.trim() || isTranslating}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
                <span>{isTranslating ? 'Translating Syntax...' : `Translate to ${toLang}`}</span>
              </button>
            </div>
          )}

          {/* TAB 5: SQL Studio */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Database size={14} className="text-cyan-400" />
                  <span>Database Requirements</span>
                </label>
                <textarea
                  value={sqlRequirement}
                  onChange={(e) => setSqlRequirement(e.target.value)}
                  placeholder="Describe your data model (e.g. 'E-commerce platform with users, orders, items, inventory reservation, and payment ledger')..."
                  rows={3}
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none font-sans"
                />
                <button
                  onClick={handleGenerateSql}
                  disabled={!sqlRequirement.trim() || isGeneratingSql}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingSql ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                  <span>{isGeneratingSql ? 'Architecting Schema...' : 'Generate Schema & Queries'}</span>
                </button>
              </div>

              {sqlResult && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                      PostgreSQL DDL & Indexing Strategy
                    </h3>
                    <button
                      onClick={() => handleCopy(sqlResult)}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copied ? 'Copied' : 'Copy SQL'}</span>
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-zinc-200 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    <code>{sqlResult}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
