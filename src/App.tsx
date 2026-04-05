import React, { useState, useEffect } from 'react';
import { Logo } from './components/Logo';
import { AboutModal } from './components/AboutModal';
import {
  Search,
  Download,
  Globe,
  Github,
  Linkedin,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileCode,
  Trash2,
  Plus,
  Settings as SettingsIcon,
  X,
  Shield,
  Zap,
  Sparkles,
  Save,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { Platform, Skill, GeneratedSkill, AppSettings, AIProvider } from './types';
import { discoverSkills, synthesizeSkill } from './services/aiService';
import { PLATFORMS, PROVIDERS, DEFAULT_MODELS, APP_METADATA } from './constants';

export default function App() {
  // Form State
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<Platform>('OpenClaw');
  const [extraUrls, setExtraUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [customReferenceUrl, setCustomReferenceUrl] = useState('');
  const [referenceText, setReferenceText] = useState('');

  // App State
  const [isSearching, setIsSearching] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisStep, setSynthesisStep] = useState(0);
  const synthesisSteps = ['Analyzing', 'Structuring', 'Retrieving', 'Compiling'];

  useEffect(() => {
    let interval: any;
    if (isSynthesizing) {
      interval = setInterval(() => {
        setSynthesisStep((prev) => (prev + 1) % synthesisSteps.length);
      }, 1200);
    } else {
      setSynthesisStep(0);
    }
    return () => clearInterval(interval);
  }, [isSynthesizing]);

  const [discoveredSkills, setDiscoveredSkills] = useState<Skill[]>([]);
  const [generatedSkill, setGeneratedSkill] = useState<GeneratedSkill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'definition' | 'instructions' | 'sources'>('definition');
  const [isDiscoveredExpanded, setIsDiscoveredExpanded] = useState(true);
  const [isGeneratedExpanded, setIsGeneratedExpanded] = useState(true);
  const [isSetupExpanded, setIsSetupExpanded] = useState(false);
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('skillgod_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved settings", e);
      }
    }
    return {
      provider: 'Google',
      apiKey: '',
      baseUrl: '',
      discoveryModel: 'gemini-3-flash-preview',
      synthesisModel: 'gemini-3-flash-preview',
      useGoogleSearch: false,
      useUrlContext: true,
      skillLimit: 5,
      firecrawlToken: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('skillgod_settings', JSON.stringify(settings));
  }, [settings]);

  const handleAddUrl = () => {
    if (newUrl && !extraUrls.includes(newUrl)) {
      setExtraUrls([...extraUrls, newUrl]);
      setNewUrl('');
    }
  };

  const handleRemoveUrl = (url: string) => {
    setExtraUrls(extraUrls.filter(u => u !== url));
  };

  const validateSettings = () => {
    const { provider, apiKey, baseUrl } = settings;

    // Ensure we are NOT using any fallback from process.env
    if (provider === 'Google' && !apiKey.trim()) {
      setError("Please provide a Google API key in Settings. Fallback keys are disabled for security.");
      setIsSettingsOpen(true);
      return false;
    }

    if (provider !== 'Ollama' && provider !== 'HuggingFace' && !apiKey.trim()) {
      setError(`Please provide an API key for ${provider} in Settings.`);
      setIsSettingsOpen(true);
      return false;
    }

    // Basic format checks
    if (provider === 'Google' && !apiKey.startsWith('AIza')) {
      setError("Invalid Google API key format. It should start with 'AIza'.");
      setIsSettingsOpen(true);
      return false;
    }

    if (provider === 'OpenAI' && !apiKey.startsWith('sk-')) {
      setError("Invalid OpenAI API key format. It should start with 'sk-'.");
      setIsSettingsOpen(true);
      return false;
    }

    if (provider === 'Anthropic' && !apiKey.startsWith('sk-ant-')) {
      setError("Invalid Anthropic API key format. It should start with 'sk-ant-'.");
      setIsSettingsOpen(true);
      return false;
    }

    if (provider === 'OpenRouter' && !apiKey.startsWith('sk-or-')) {
      setError("Invalid OpenRouter API key format. It should start with 'sk-or-'.");
      setIsSettingsOpen(true);
      return false;
    }

    if ((provider === 'Ollama' || provider === 'Custom') && !baseUrl.trim()) {
      setError(`Please provide a Base URL for ${provider} in Settings.`);
      setIsSettingsOpen(true);
      return false;
    }

    return true;
  };

  const ensureValidUrl = (url: string) => {
    if (!url) return "";
    let cleanUrl = url.trim().replace(/[.,]$/, "");
    try {
      // If it's already a valid URL, return it
      new URL(cleanUrl);
      return cleanUrl;
    } catch (e) {
      // If it's missing protocol, try adding https://
      if (cleanUrl.includes('.') && !cleanUrl.includes(' ') && !cleanUrl.startsWith('http')) {
        return `https://${cleanUrl}`;
      }
      return "";
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;
    if (!validateSettings()) return;

    setIsSearching(true);
    setError(null);
    setGeneratedSkill(null);

    try {
      const results = await discoverSkills(topic, description, extraUrls, settings);
      const sortedResults = [...results].sort((a, b) => a.name.localeCompare(b.name));
      setDiscoveredSkills(sortedResults);

      // If we only have manual skills and there was likely an error (handled in discoverSkills)
      const onlyManual = sortedResults.length > 0 && sortedResults.every(s => s.source === 'user-url');
      if (onlyManual && extraUrls.length > 0) {
        setError('AI search failed, but we found your manual reference URLs. You can still proceed with these.');
      }
    } catch (err: any) {
      if (err.message?.includes("API key")) {
        setError(err.message);
        setIsSettingsOpen(true);
      } else {
        setError(err.message || 'Failed to discover skills. Please check your API key or network.');
      }
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSynthesize = async () => {
    const selected = discoveredSkills.filter(s => s.selected);
    if (selected.length === 0) {
      setError('Please select at least one skill to combine.');
      return;
    }

    if (!validateSettings()) return;

    setIsSynthesizing(true);
    setError(null);

    try {
      const result = await synthesizeSkill(topic, description, platform, selected, settings, referenceText, customReferenceUrl);
      setGeneratedSkill(result);
      setIsDiscoveredExpanded(false);
      setIsGeneratedExpanded(false);
      setIsSetupExpanded(true);
    } catch (err: any) {
      if (err.message?.includes("API key")) {
        setError(err.message);
        setIsSettingsOpen(true);
      } else {
        setError(err.message || 'Failed to synthesize combined skill.');
      }
      console.error(err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const toggleSkill = (id: string) => {
    setDiscoveredSkills(prev => prev.map(s =>
      s.id === id ? { ...s, selected: !s.selected } : s
    ));
  };

  const selectAllSkills = () => {
    setDiscoveredSkills(prev => prev.map(s => ({ ...s, selected: true })));
  };

  const handleDownloadZip = async () => {
    if (!generatedSkill) return;

    const zip = new JSZip();
    const folder = zip.folder("skill");

    if (folder) {
      let fileName = "SKILL.md";
      if (platform === 'Claude') fileName = "skill.json";
      if (platform === 'Antigravity') fileName = "manifest.json";

      folder.file(fileName, generatedSkill.definition);
      folder.file("README.md", generatedSkill.instructions);
      folder.file("sources.json", JSON.stringify({
        topic,
        platform,
        sources: generatedSkill.sources.map(s => ({
          name: s.name,
          url: s.sourceUrl,
          source: s.source
        }))
      }, null, 2));
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${topic.toLowerCase().replace(/\s+/g, '-')}_${platform.toLowerCase()}_skill.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isSetupExpanded) {
      setIsGeneratedExpanded(false);
    }
  }, [isSetupExpanded]);

  useEffect(() => {
    if (isGeneratedExpanded) {
      setIsSetupExpanded(false);
    }
  }, [isGeneratedExpanded]);

  return (
    <div className={cn(
      "min-h-screen flex flex-col font-sans selection:bg-indigo-500/30 transition-colors duration-300",
      theme === 'dark' ? "bg-[#0a0a0a] text-zinc-100" : "bg-zinc-50 text-zinc-900"
    )}>
      {/* Header */}
      <header className={cn(
        "border-b backdrop-blur-xl sticky top-0 z-50 transition-colors",
        theme === 'dark' ? "border-zinc-800/50 bg-black/50" : "border-zinc-200 bg-white/80"
      )}>
        <div className="w-full px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Logo className="w-8 h-8 sm:w-10 h-10" theme={theme} />
            <h1 className={cn(
              "text-lg sm:text-2xl font-bold tracking-tight transition-colors",
              theme === 'dark' ? "text-white" : "text-zinc-900"
            )}>
              {APP_METADATA.NAME}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-10 text-xs sm:text-sm">
            <div className="flex items-center gap-4 sm:gap-8">
              <button
                onClick={() => setIsAboutOpen(true)}
                className={cn(
                  "transition-colors flex items-center gap-1.5 sm:gap-2 font-medium",
                  theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                About
              </button>
              <a
                href="https://deepwiki.com/bhagesh-h/SkillGod"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "transition-colors font-medium",
                  theme === 'dark' ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                Docs
              </a>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={cn(
                  "p-1.5 sm:p-2.5 rounded-lg transition-colors",
                  theme === 'dark' ? "hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400" : "hover:bg-zinc-100 text-zinc-500 hover:text-indigo-600"
                )}
                title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 h-5" /> : <Moon className="w-4 h-4 sm:w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={cn(
                  "p-1.5 sm:p-2.5 rounded-lg transition-colors",
                  theme === 'dark' ? "hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400" : "hover:bg-zinc-100 text-zinc-500 hover:text-indigo-600"
                )}
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4 sm:w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">

          {/* Left Column: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-400" />
                  Define Skill
                </h2>
              </div>

              <form onSubmit={handleSearch} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Skill Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Legal Document Research Assistant"
                    className="w-full bg-zinc-900/30 border border-zinc-800 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Description (Optional)</label>
                  <textarea
                    placeholder="Describe specific requirements..."
                    className="w-full bg-zinc-900/30 border border-zinc-800 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-zinc-700 min-h-[100px] resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Target Platform</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsPlatformOpen(!isPlatformOpen)}
                      className={cn(
                        "w-full border rounded-lg px-4 py-3 text-base text-left flex items-center justify-between focus:outline-none focus:ring-1 transition-all",
                        theme === 'dark'
                          ? "bg-zinc-900/30 border-zinc-800 text-zinc-100 focus:ring-indigo-500/30 focus:border-indigo-500/50"
                          : "bg-white border-zinc-200 text-zinc-900 focus:ring-indigo-500/20 focus:border-indigo-500/40"
                      )}
                    >
                      {platform}
                      <ChevronDown className={cn("w-5 h-5 text-zinc-500 transition-transform duration-200", isPlatformOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {isPlatformOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-[55]"
                            onClick={() => setIsPlatformOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute z-[60] top-full left-0 right-0 mt-1 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-lg overflow-hidden py-1"
                          >
                            {PLATFORMS.map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => {
                                  setPlatform(p);
                                  setIsPlatformOpen(false);
                                }}
                                className={cn(
                                  "w-full px-3 py-1.5 text-sm text-left transition-colors",
                                  platform === p ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                                )}
                              >
                                {p}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {platform === 'Custom' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Target Platform Skill URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/skill-docs"
                      className="w-full bg-zinc-900/30 border border-zinc-800 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all text-zinc-100 placeholder:text-zinc-700"
                      value={customReferenceUrl}
                      onChange={(e) => setCustomReferenceUrl(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Additional URLs</label>
                    {settings.provider !== 'Google' && (
                      <span className="text-[10px] text-indigo-400/70 font-bold uppercase tracking-widest">Recommended for {settings.provider}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://github.com/..."
                      className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleAddUrl}
                      disabled={!newUrl.trim()}
                      className={cn(
                        "px-6 rounded-lg transition-all",
                        newUrl.trim()
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      )}
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                  {extraUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {extraUrls.map(url => (
                        <span key={url} className="bg-zinc-800/30 border border-zinc-800 px-3 py-1 rounded text-xs flex items-center gap-2">
                          <span className="truncate max-w-[150px]">{url}</span>
                          <button onClick={() => handleRemoveUrl(url)} className="text-zinc-600 hover:text-indigo-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Reference Template (Optional)</label>
                  <textarea
                    placeholder="Paste a best-practice skill..."
                    className="w-full bg-zinc-900/30 border border-zinc-800 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-zinc-700 min-h-[80px] resize-none"
                    value={referenceText}
                    onChange={(e) => setReferenceText(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearching || !topic}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white font-bold py-5 rounded-lg transition-all flex items-center justify-center gap-4 group text-base"
                >
                  {isSearching ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      Discover Skills
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </section>
          </div>

          {/* Right Column: Results & Synthesis */}
          <div className="lg:col-span-7 space-y-6">

            {/* Discovered Skills Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsDiscoveredExpanded(!isDiscoveredExpanded)}
                    className="flex items-center gap-2 group"
                  >
                    <h2 className={cn(
                      "text-base sm:text-lg font-semibold flex items-center gap-2",
                      theme === 'dark' ? "text-zinc-100" : "text-zinc-900"
                    )}>
                      <Layers className="w-5 h-5 text-indigo-400" />
                      Discovered Skills
                    </h2>
                    {isDiscoveredExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    )}
                  </button>
                  {discoveredSkills.length > 0 && isDiscoveredExpanded && (
                    <button
                      onClick={selectAllSkills}
                      className={cn(
                        "text-sm font-bold uppercase tracking-wider px-4 py-2 rounded border transition-colors",
                        theme === 'dark'
                          ? "border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                          : "border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
                      )}
                    >
                      Select All
                    </button>
                  )}
                </div>
                {discoveredSkills.length > 0 && (
                  <button
                    onClick={handleSynthesize}
                    disabled={isSynthesizing || discoveredSkills.filter(s => s.selected).length === 0}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-base font-bold px-8 py-4 rounded-lg transition-all flex items-center gap-4 disabled:bg-zinc-800 disabled:text-zinc-600"
                  >
                    {isSynthesizing ? <Loader2 className="w-6 h-6 animate-spin text-indigo-400" /> : <Sparkles className="w-6 h-6" />}
                    {isSynthesizing ? synthesisSteps[synthesisStep] : 'Synthesize'}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {isDiscoveredExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar pb-1">
                      <AnimatePresence mode="popLayout">
                        {discoveredSkills.length === 0 && !isSearching && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border border-dashed border-zinc-800 rounded-xl p-8 text-center space-y-2"
                          >
                            <Globe className="w-6 h-6 text-zinc-700 mx-auto" />
                            <p className="text-zinc-600 text-sm">Enter a topic to start discovering skills.</p>
                          </motion.div>
                        )}

                        {isSearching && (
                          <div className="space-y-2">
                            {[1, 2].map(i => (
                              <div key={i} className="bg-zinc-900/20 border border-zinc-800 rounded-xl p-4 animate-pulse space-y-2">
                                <div className="h-3 bg-zinc-800 rounded w-1/4" />
                                <div className="h-2 bg-zinc-800 rounded w-full" />
                              </div>
                            ))}
                          </div>
                        )}

                        {discoveredSkills.map((skill) => (
                          <motion.div
                            key={skill.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "group relative bg-zinc-900/20 border transition-all rounded-xl p-3.5 cursor-pointer",
                              skill.selected ? "border-indigo-500/30 bg-indigo-500/5" : "border-zinc-800 hover:border-zinc-700"
                            )}
                            onClick={() => toggleSkill(skill.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                                skill.selected ? "bg-indigo-500 border-indigo-500" : "border-zinc-700 group-hover:border-zinc-600"
                              )}>
                                {skill.selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm sm:text-base font-medium text-zinc-200">{skill.name}</h3>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold uppercase tracking-widest px-2 py-1 bg-zinc-800 text-zinc-500 rounded">
                                      {skill.source}
                                    </span>
                                    {ensureValidUrl(skill.sourceUrl) && (
                                      <a
                                        href={ensureValidUrl(skill.sourceUrl)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-zinc-600 hover:text-indigo-400 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink className="w-5 h-5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                                <p className="text-base text-zinc-500 line-clamp-2">
                                  {skill.description}
                                </p>
                                {(skill.tags?.length > 0 || skill.tools?.length > 0) && (
                                  <div className="flex flex-wrap gap-2 pt-2">
                                    {skill.tools?.slice(0, 3).map(tool => (
                                      <span key={tool} className="text-sm px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                                        {tool}
                                      </span>
                                    ))}
                                    {skill.tags?.slice(0, 2).map(tag => (
                                      <span key={tag} className="text-sm px-2 py-1 bg-zinc-800 text-zinc-400 rounded">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Generated Skill Preview Section */}
            {generatedSkill && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pt-6 border-t border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsGeneratedExpanded(!isGeneratedExpanded)}
                    className="flex items-center gap-2 group"
                  >
                    <h2 className={cn(
                      "text-sm sm:text-base font-semibold flex items-center gap-2",
                      theme === 'dark' ? "text-zinc-100" : "text-zinc-900"
                    )}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      {topic || "Generated Skill"}
                    </h2>
                    {isGeneratedExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    )}
                  </button>
                  <button
                    onClick={handleDownloadZip}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-6 py-3 rounded-lg transition-all flex items-center gap-3"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                </div>

                <AnimatePresence>
                  {isGeneratedExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-zinc-900/20 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="flex border-b border-zinc-800">
                          {(['definition', 'instructions', 'sources'] as const).map(tab => (
                            <button
                              key={tab}
                              onClick={() => setActiveTab(tab)}
                              className={cn(
                                "px-5 py-3 text-xs font-medium transition-all relative whitespace-nowrap",
                                activeTab === tab ? "text-white" : "text-zinc-600 hover:text-zinc-400"
                              )}
                            >
                              {tab.charAt(0).toUpperCase() + tab.slice(1)}
                              {activeTab === tab && (
                                <motion.div
                                  layoutId="activeTab"
                                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                                />
                              )}
                            </button>
                          ))}
                        </div>

                        <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                          {activeTab === 'definition' && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-xs text-zinc-600 mb-3">
                                <FileCode className="w-4 h-4" />
                                <span>{platform} Format</span>
                              </div>
                              <div className="prose prose-invert prose-xs max-w-none">
                                <Markdown>{generatedSkill.definition}</Markdown>
                              </div>
                            </div>
                          )}
                          {activeTab === 'instructions' && (
                            <div className="prose prose-invert prose-xs max-w-none">
                              <Markdown>{generatedSkill.instructions}</Markdown>
                            </div>
                          )}
                          {activeTab === 'sources' && (
                            <div className="space-y-2">
                              {generatedSkill.sources.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-3 bg-zinc-800/20 rounded-lg border border-zinc-800">
                                  <span className="text-sm font-medium text-zinc-300">{s.name}</span>
                                  <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline text-sm flex items-center gap-2">
                                    Source <ExternalLink className="w-4 h-4" />
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            )}

            {/* Setup Instructions Section */}
            <AnimatePresence>
              {generatedSkill && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-6 border-t border-zinc-800"
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsSetupExpanded(!isSetupExpanded)}
                      className="flex items-center gap-2 group"
                    >
                      <h2 className={cn(
                        "text-sm sm:text-base font-semibold flex items-center gap-2",
                        theme === 'dark' ? "text-zinc-100" : "text-zinc-900"
                      )}>
                        <Zap className="w-3.5 h-3.5 text-indigo-400" />
                        Setup Instructions
                      </h2>
                      {isSetupExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                      )}
                    </button>
                  </div>

                  <AnimatePresence>
                    {isSetupExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-zinc-900/20 border border-zinc-800 rounded-xl p-5">
                          <div className="prose prose-invert prose-xs max-w-none">
                            <div className="flex items-center gap-2 text-xs text-indigo-400 mb-4 font-bold uppercase tracking-wider">
                              <Zap className="w-4 h-4" />
                              <span>Quick Start Guide</span>
                            </div>
                            <Markdown>{generatedSkill.setupInstructions}</Markdown>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>
              )}
            </AnimatePresence>

            {error && (
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-4 flex items-start gap-3 text-red-400/80">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-md border rounded-2xl overflow-hidden",
                theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-2xl"
              )}
            >
              <div className={cn(
                "p-3 sm:p-4 border-b flex items-center justify-between",
                theme === 'dark' ? "border-zinc-800" : "border-zinc-100"
              )}>
                <h3 className={cn(
                  "text-sm sm:text-base font-semibold flex items-center gap-2",
                  theme === 'dark' ? "text-zinc-100" : "text-zinc-900"
                )}>
                  <SettingsIcon className="w-4 h-4 sm:w-5 h-5 text-indigo-400" />
                  Engine Settings
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className={cn(
                    "p-1.5 sm:p-2 rounded-md transition-colors",
                    theme === 'dark' ? "hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300" : "hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  <X className="w-4 h-4 sm:w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">AI Provider</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProviderOpen(!isProviderOpen)}
                      className={cn(
                        "w-full border rounded-lg px-4 py-3 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-1 transition-all",
                        theme === 'dark'
                          ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:ring-indigo-500/30 focus:border-indigo-500/50"
                          : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-indigo-500/20 focus:border-indigo-500/40"
                      )}
                    >
                      {settings.provider}
                      <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform duration-200", isProviderOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {isProviderOpen && (
                        <>
                          <div className="fixed inset-0 z-[110]" onClick={() => setIsProviderOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className={cn(
                              "absolute z-[120] top-full left-0 right-0 mt-1 border rounded-lg overflow-hidden py-1",
                              theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-xl"
                            )}
                          >
                            {PROVIDERS.map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => {
                                  setSettings({
                                    ...settings,
                                    provider: p,
                                    discoveryModel: DEFAULT_MODELS[p].discovery,
                                    synthesisModel: DEFAULT_MODELS[p].synthesis
                                  });
                                  setIsProviderOpen(false);
                                }}
                                className={cn(
                                  "w-full px-3 py-1.5 text-sm text-left transition-colors",
                                  settings.provider === p
                                    ? "text-indigo-400 bg-indigo-500/10"
                                    : theme === 'dark' ? "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                                )}
                              >
                                {p}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4" />
                      API Key
                    </div>
                    {settings.apiKey && (
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                        (settings.provider === 'Google' && settings.apiKey.startsWith('AIza')) ||
                          (settings.provider === 'OpenAI' && settings.apiKey.startsWith('sk-')) ||
                          (settings.provider === 'Anthropic' && settings.apiKey.startsWith('sk-ant-')) ||
                          (settings.provider === 'OpenRouter' && settings.apiKey.startsWith('sk-or-'))
                          ? "text-green-500 bg-green-500/10"
                          : "text-amber-500 bg-amber-500/10"
                      )}>
                        {(settings.provider === 'Google' && settings.apiKey.startsWith('AIza')) ||
                          (settings.provider === 'OpenAI' && settings.apiKey.startsWith('sk-')) ||
                          (settings.provider === 'Anthropic' && settings.apiKey.startsWith('sk-ant-')) ||
                          (settings.provider === 'OpenRouter' && settings.apiKey.startsWith('sk-or-'))
                          ? "Valid Format" : "Check Format"}
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your API key..."
                    className={cn(
                      "w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all",
                      theme === 'dark'
                        ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-800 focus:ring-indigo-500/30 focus:border-indigo-500/50"
                        : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 focus:ring-indigo-500/20 focus:border-indigo-500/40",
                      settings.apiKey && !(
                        (settings.provider === 'Google' && settings.apiKey.startsWith('AIza')) ||
                        (settings.provider === 'OpenAI' && settings.apiKey.startsWith('sk-')) ||
                        (settings.provider === 'Anthropic' && settings.apiKey.startsWith('sk-ant-')) ||
                        (settings.provider === 'OpenRouter' && settings.apiKey.startsWith('sk-or-')) ||
                        settings.provider === 'Ollama' || settings.provider === 'HuggingFace' || settings.provider === 'Custom'
                      ) && "border-amber-500/50"
                    )}
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Discovery Limit</span>
                    <span className="text-indigo-400 font-mono">{settings.skillLimit} skills</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    className={cn(
                      "w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500",
                      theme === 'dark' ? "bg-zinc-800" : "bg-zinc-200"
                    )}
                    value={settings.skillLimit}
                    onChange={(e) => setSettings({ ...settings, skillLimit: parseInt(e.target.value) })}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600 font-bold uppercase">
                    <span>1</span>
                    <span>25</span>
                    <span>50</span>
                  </div>
                </div>

                {(settings.provider === 'Ollama' || settings.provider === 'Custom') && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Base URL</label>
                    <input
                      type="text"
                      placeholder={settings.provider === 'Ollama' ? "http://localhost:11434" : "https://api.example.com"}
                      className={cn(
                        "w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all",
                        theme === 'dark'
                          ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:ring-indigo-500/30 focus:border-indigo-500/50"
                          : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-indigo-500/20 focus:border-indigo-500/40"
                      )}
                      value={settings.baseUrl}
                      onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Discovery Model</label>
                    <input
                      type="text"
                      className={cn(
                        "w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all",
                        theme === 'dark'
                          ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:ring-indigo-500/30 focus:border-indigo-500/50"
                          : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-indigo-500/20 focus:border-indigo-500/40"
                      )}
                      value={settings.discoveryModel}
                      onChange={(e) => setSettings({ ...settings, discoveryModel: e.target.value })}
                      placeholder="e.g. gpt-4o-mini"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Synthesis Model</label>
                    <input
                      type="text"
                      className={cn(
                        "w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all",
                        theme === 'dark'
                          ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:ring-indigo-500/30 focus:border-indigo-500/50"
                          : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-indigo-500/20 focus:border-indigo-500/40"
                      )}
                      value={settings.synthesisModel}
                      onChange={(e) => setSettings({ ...settings, synthesisModel: e.target.value })}
                      placeholder="e.g. gpt-4o"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      Firecrawl Token
                    </div>
                    {settings.firecrawlToken && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-green-500 bg-green-500/10">
                        Set
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    placeholder="Enter Firecrawl API Key..."
                    className={cn(
                      "w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all",
                      theme === 'dark'
                        ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-800 focus:ring-indigo-500/30 focus:border-indigo-500/50"
                        : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-300 focus:ring-indigo-500/20 focus:border-indigo-500/40"
                    )}
                    value={settings.firecrawlToken || ''}
                    onChange={(e) => setSettings({ ...settings, firecrawlToken: e.target.value })}
                  />
                  <p className="text-[10px] text-zinc-500">
                    Required for web search/scraping with non-Google providers. Get it at <a href="https://firecrawl.dev" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">firecrawl.dev</a>
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Capabilities
                  </label>
                  <div className="space-y-2">
                    <label className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200",
                      (settings.provider === 'Google' || settings.firecrawlToken) ? "cursor-pointer hover:border-zinc-700" : "opacity-50 cursor-not-allowed"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>Web Search Grounding</span>
                            <span className={cn(
                              "text-[9px] font-bold px-2 py-0.5 rounded border",
                              theme === 'dark' ? "bg-zinc-900 text-zinc-600 border-zinc-800" : "bg-white text-zinc-400 border-zinc-200"
                            )}>
                              {settings.provider === 'Google' ? "GOOGLE SEARCH" : "FIRECRAWL"}
                            </span>
                          </div>
                          {settings.provider !== 'Google' && !settings.firecrawlToken && (
                            <span className="text-[10px] text-zinc-500 mt-0.5">Requires Firecrawl Token for {settings.provider}.</span>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        disabled={settings.provider !== 'Google' && !settings.firecrawlToken}
                        className="w-5 h-5 accent-indigo-500"
                        checked={settings.useGoogleSearch && (settings.provider === 'Google' || !!settings.firecrawlToken)}
                        onChange={(e) => setSettings({ ...settings, useGoogleSearch: e.target.checked })}
                      />
                    </label>
                    <label className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:border-zinc-700 transition-colors",
                      theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>URL Context Retrieval</span>
                            <span className={cn(
                              "text-[9px] font-bold px-2 py-0.5 rounded border",
                              theme === 'dark' ? "bg-zinc-900 text-zinc-600 border-zinc-800" : "bg-white text-zinc-400 border-zinc-200"
                            )}>
                              {settings.provider === 'Google' ? "URL CONTEXT" : (settings.firecrawlToken ? "FIRECRAWL" : "PROMPT ONLY")}
                            </span>
                          </div>
                          {settings.provider !== 'Google' && !settings.firecrawlToken && (
                            <span className="text-[10px] text-zinc-500 mt-0.5">URLs will be sent as text only without Firecrawl.</span>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-indigo-500"
                        checked={settings.useUrlContext}
                        onChange={(e) => setSettings({ ...settings, useUrlContext: e.target.checked })}
                      />
                    </label>
                  </div>
                </div>

                <div className={cn(
                  "pt-4 text-center text-[10px] uppercase tracking-widest font-bold",
                  theme === 'dark' ? "text-zinc-600" : "text-zinc-400"
                )}>
                  Settings are auto-saved to local storage
                </div>
              </div>

              <div className={cn(
                "p-4 border-t flex justify-end",
                theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-100"
              )}>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-8 py-3 rounded-lg transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className={cn(
        "w-full px-4 sm:px-8 py-8 sm:py-12 border-t mt-12 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 text-xs sm:text-sm uppercase tracking-widest transition-colors",
        theme === 'dark' ? "border-zinc-800/30 text-zinc-500" : "border-zinc-200 text-zinc-500"
      )}>
        <div className="flex items-center gap-3">
          <span className="font-semibold">© {new Date().getFullYear()} Created by Bhagesh</span>
        </div>
        <div className="flex items-center gap-6 sm:gap-10">
          <a
            href={APP_METADATA.GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "transition-colors flex items-center gap-2 sm:gap-2.5",
              theme === 'dark' ? "hover:text-zinc-300" : "hover:text-zinc-800"
            )}
          >
            <Github className="w-4 h-4 sm:w-5 h-5" />
            GitHub
          </a>
          <a
            href={APP_METADATA.LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "transition-colors flex items-center gap-2 sm:gap-2.5",
              theme === 'dark' ? "hover:text-zinc-300" : "hover:text-zinc-800"
            )}
          >
            <Linkedin className="w-4 h-4 sm:w-5 h-5" />
            LinkedIn
          </a>
        </div>
      </footer>

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        theme={theme}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #18181b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #27272a;
        }
        .prose-xs {
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .prose-xs h1, .prose-xs h2, .prose-xs h3 {
          margin-top: 1.25em;
          margin-bottom: 0.6em;
          font-weight: 600;
          color: #f4f4f5;
        }
        .prose-xs p {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
      `}</style>
    </div>
  );
}
