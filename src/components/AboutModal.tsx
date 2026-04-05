import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  Sparkles, 
  Globe, 
  Layers, 
  FileCode, 
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Logo } from './Logo';
import { APP_METADATA } from '../constants';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, theme }) => {
  const features = [
    {
      title: "Discovery",
      description: "Locate essential tools for your agents through comprehensive registry and documentation searches.",
      icon: Search,
      color: "text-indigo-400"
    },
    {
      title: "Synthesis",
      description: "Merge multiple capabilities into a single, optimized definition tailored to your specific platform.",
      icon: Sparkles,
      color: "text-amber-400"
    },
    {
      title: "Export",
      description: "Export your configurations for OpenClaw, Claude, Antigravity, or custom environments.",
      icon: Globe,
      color: "text-emerald-400"
    },
    {
      title: "Context Retrieval",
      description: "Extract relevant technical details directly from provided URLs to enhance skill definitions.",
      icon: Layers,
      color: "text-blue-400"
    },
    {
      title: "Standardization",
      description: "Utilize industry-standard templates to ensure consistent and accurate formatting.",
      icon: FileCode,
      color: "text-purple-400"
    },
    {
      title: "Market Insights",
      description: "Stay informed on the latest developments and emerging trends in AI agent technology.",
      icon: Zap,
      color: "text-rose-400"
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col",
              theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
            )}
          >
            {/* Header */}
            <div className={cn(
              "p-6 border-b flex items-center justify-between",
              theme === 'dark' ? "border-zinc-800" : "border-zinc-100"
            )}>
                <div className="flex items-center gap-2 sm:gap-4">
                  <Logo className="w-8 h-8 sm:w-10 h-10" theme={theme} />
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold tracking-tight">About {APP_METADATA.NAME}</h2>
                    <p className={cn(
                      "text-[10px] sm:text-xs uppercase tracking-widest font-medium",
                      theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
                    )}>Advanced AI Integration Platform</p>
                  </div>
                </div>
              <button 
                onClick={onClose}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  theme === 'dark' ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-8 sm:space-y-12">
                {/* Intro */}
                <section className="text-center space-y-3 sm:space-y-4">
                  <h3 className="text-xl sm:text-3xl font-bold">Streamline your AI development workflow.</h3>
                  <p className={cn(
                    "text-sm sm:text-base leading-relaxed",
                    theme === 'dark' ? "text-zinc-400" : "text-zinc-600"
                  )}>
                    {APP_METADATA.NAME} provides a centralized platform to identify, integrate, and deploy AI capabilities. By consolidating fragmented documentation and registries, we enable developers to generate production-ready configurations for their agents with precision and efficiency.
                  </p>
                </section>

                {/* Gallery */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 mb-10">
                    <div className="h-px flex-1 bg-zinc-800/50" />
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">Feature Gallery</h4>
                    <div className="h-px flex-1 bg-zinc-800/50" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((feature, idx) => (
                      <motion.div 
                        key={feature.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "p-5 rounded-xl border transition-all hover:scale-[1.02] group",
                          theme === 'dark' ? "bg-zinc-800/30 border-zinc-800 hover:border-indigo-500/30" : "bg-zinc-50 border-zinc-100 hover:border-indigo-500/30"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors",
                          theme === 'dark' ? "bg-zinc-900" : "bg-white shadow-sm"
                        )}>
                          <feature.icon className={cn("w-5 h-5", feature.color)} />
                        </div>
                        <h5 className="font-bold text-base mb-2">{feature.title}</h5>
                        <p className={cn(
                          "text-sm leading-relaxed",
                          theme === 'dark' ? "text-zinc-500" : "text-zinc-500"
                        )}>
                          {feature.description}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Footer Quote */}
                <section className={cn(
                  "p-4 sm:p-8 rounded-2xl text-center border border-dashed",
                  theme === 'dark' ? "bg-indigo-500/5 border-indigo-500/20" : "bg-indigo-50 border-indigo-200"
                )}>
                  <p className="text-sm sm:text-base font-medium italic text-indigo-400">
                    "Innovation is the synthesis of existing ideas into new possibilities."
                  </p>
                </section>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className={cn(
              "p-6 border-t flex items-center justify-center text-xs uppercase tracking-widest font-bold",
              theme === 'dark' ? "border-zinc-800 bg-zinc-950/50 text-zinc-600" : "border-zinc-100 bg-zinc-50 text-zinc-400"
            )}>
              <span>Version {APP_METADATA.VERSION}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
