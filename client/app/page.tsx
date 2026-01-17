// React Component - page.tsx (additions and modifications)

"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowRight, Copy, Check, Loader2, AlertCircle, Sparkles, Download, Sun, Moon, ChevronDown, Star, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type NoteMode = "cornell" | "dev" | "summary";

interface ModeOption {
  value: NoteMode;
  label: string;
  icon: string;
  description: string;
}

interface RateLimitInfo {
  remaining: number;
  limit: number;
  used?: number;
  reset_at?: string;
  reset_in_hours?: number;
}

interface FeedbackModalState {
  isOpen: boolean;
  rating: number;
  comment: string;
  email: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "cornell",
    label: "Study Mode",
    icon: "📚",
    description: "Cornell-style notes for learning"
  },
  {
    value: "dev",
    label: "Dev Mode",
    icon: "💻",
    description: "Code snippets & implementation steps"
  },
  {
    value: "summary",
    label: "Summary Mode",
    icon: "⚡",
    description: "Quick overview & key points"
  }
];

export default function GistApp() {
  const { theme, toggleTheme, mounted } = useTheme();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [selectedMode, setSelectedMode] = useState<NoteMode>("cornell");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // New state for rate limiting and feedback
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackModalState>({
    isOpen: false,
    rating: 0,
    comment: "",
    email: ""
  });
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch rate limit info on mount
  useEffect(() => {
    fetchRateLimitInfo();
  }, []);

  const fetchRateLimitInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/rate-limit-info`);
      const data = await response.json();
      setRateLimitInfo(data.rate_limit);
      setIsRateLimited(data.is_limited);
    } catch (err) {
      console.error("Failed to fetch rate limit info:", err);
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGenerate = async () => {
    if (!url.trim()) return;
    
    // Check rate limit before making request
    if (isRateLimited) {
      setError("Free trial limit reached. Please try again after 24 hours or upgrade to paid plan.");
      return;
    }

    if (!rateLimitInfo || rateLimitInfo.remaining <= 0) {
      setError("No free requests remaining. Please upgrade to continue.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    setNotes("");
    setFeedbackSuccess(false);

    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url: url.trim(),
          mode: selectedMode 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle different error types
        if (response.status === 429) {
          setIsRateLimited(true);
          setError(data.detail?.message || "Rate limit exceeded");
        } else if (response.status === 400) {
          const errorMsg = typeof data.detail === 'string' ? data.detail : 
                          data.detail?.message || "Invalid request";
          setError(errorMsg);
        } else {
          const errorMsg = typeof data.detail === 'string' ? data.detail : "Failed to generate notes";
          setError(errorMsg);
        }
        return;
      }

      if (typeof data.markdown === 'string') {
        setNotes(data.markdown);
      } else {
        setError("Invalid response format from server");
        return;
      }
      
      // Update rate limit info
      if (data.rate_limit) {
        setRateLimitInfo(data.rate_limit);
        setIsRateLimited(false);
      }

      // Refresh rate limit info
      fetchRateLimitInfo();
      
      // Auto-open feedback modal after successful generation
      setTimeout(() => {
        setFeedback(prev => ({ ...prev, isOpen: true }));
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (feedback.rating === 0) {
      alert("Please provide a rating");
      return;
    }

    setFeedbackSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: feedback.rating,
          comment: feedback.comment,
          mode_used: selectedMode,
          email: feedback.email
        }),
      });

      if (response.ok) {
        setFeedbackSuccess(true);
        setTimeout(() => {
          setFeedback({
            isOpen: false,
            rating: 0,
            comment: "",
            email: ""
          });
          setFeedbackSuccess(false);
        }, 2000);
      }
    } catch (err) {
      alert("Failed to submit feedback");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const decodeHtmlEntities = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const parseMarkdown = (text: string): React.ReactNode[] => {
    if (!text || typeof text !== 'string') return [];

    let decoded = decodeHtmlEntities(text);

    decoded = decoded
      .replace(/ÃƒÆ'Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬/g, 'ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬')
      .replace(/ÃƒÆ'Ã‚Â°Ãƒâ€¦Ã‚Â¸"/g, 'ÃƒÂ°Ã…Â¸"')
      .replace(/ÃƒÆ'Ã‚Â°Ãƒâ€¦Ã‚Â¸"'/g, 'ÃƒÂ°Ã…Â¸"Ã…Â¡')
      .replace(/ÃƒÆ'Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â§ /g, 'ÃƒÂ°Ã…Â¸Ã‚Â§ ')
      .replace(/ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢/g, 'ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢')
      .replace(/ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬"/g, 'ÃƒÂ¢Ã¢â€šÂ¬"')
      .replace(/ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢/g, "'")
      .replace(/ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦"/g, '"')
      .replace(/ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬/g, '"')
      .replace(/ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©/g, 'Ãƒâ€šÃ‚Â©');

    const lines = decoded.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    let h1Count = 0;
    let h2Count = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) {
        i++;
        continue;
      }

      // Code block detection
      if (line.trim().startsWith('```')) {
        const codeLines = [];
        const language = line.trim().slice(3).trim();
        i++;
        
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // Skip closing ```

        elements.push(
          <div key={`code-${i}`} className="my-6 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            {language && (
              <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 text-xs font-mono text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                {language}
              </div>
            )}
            <pre className="bg-slate-50 dark:bg-slate-900/50 p-4 overflow-x-auto">
              <code className="text-sm font-mono text-slate-800 dark:text-slate-200">
                {codeLines.join('\n')}
              </code>
            </pre>
          </div>
        );
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const content = headingMatch[2].replace(/\*\*/g, '').trim();
        
        if (level === 1) h1Count++;
        if (level === 2) h2Count++;

        const breakClass = (level === 1 && h1Count > 1) || (level === 2 && h2Count > 1)
          ? 'print:break-before-page'
          : '';

        const headingClasses = {
          1: `text-4xl font-bold mt-10 mb-6 ${breakClass}`,
          2: `text-2xl font-bold mt-8 mb-5 ${breakClass}`,
          3: 'text-xl font-bold mt-6 mb-4',
          4: 'text-lg font-bold mt-4 mb-3',
          5: 'text-base font-bold mt-3 mb-2',
          6: 'text-sm font-bold mt-2 mb-2',
        };

        elements.push(
          <div key={`h${level}-${i}`} className={`${headingClasses[level as keyof typeof headingClasses]} text-slate-900 dark:text-slate-50 flex items-center gap-2`}>
            {content}
          </div>
        );
        i++;
        continue;
      }

      if (line.trim().startsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }

        const rows = tableLines
          .filter(row => row.trim())
          .map(row => 
            row
              .split('|')
              .map(cell => cell.trim())
              .filter(cell => cell && cell !== '---' && !cell.match(/^-+$/))
          );

        if (rows.length > 0) {
          const [headerRow, ...bodyRows] = rows;

          const renderCellContent = (content: string) => {
            const parts = content.split(/<br\s*\/?>/i);
            return (
              <div className="space-y-2">
                {parts.map((part, idx) => (
                  <div key={idx} className="text-sm leading-relaxed">
                    <span dangerouslySetInnerHTML={{ 
                      __html: part
                        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-slate-50">$1</strong>')
                        .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    }} />
                  </div>
                ))}
              </div>
            );
          };

          elements.push(
            <div key={`table-${i}`} className="my-8 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm print:break-inside-avoid print:border-0 print:shadow-none">
              <table className="w-full border-collapse text-slate-700 dark:text-slate-300">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700">
                    {headerRow.map((header, idx) => (
                      <th 
                        key={idx} 
                        className="px-5 py-3 text-left text-sm font-bold text-slate-900 dark:text-slate-50 border-r border-slate-200 dark:border-slate-800 last:border-r-0 bg-slate-100 dark:bg-slate-900"
                        style={{ width: idx === 0 ? '30%' : '70%' }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      {row.map((cell, cellIdx) => (
                        <td 
                          key={cellIdx} 
                          className={`px-5 py-4 align-top border-r border-slate-200 dark:border-slate-800 last:border-r-0 ${
                            cellIdx === 0 ? 'font-medium text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-slate-900 w-1/3' : 'w-2/3'
                          }`}
                        >
                          {renderCellContent(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        continue;
      }

      const ulMatch = line.match(/^[\*\-]\s+(.+)$/);
      const olMatch = line.match(/^\d+\.\s+(.+)$/);

      if (ulMatch || olMatch) {
        const listItems = [];
        const isOrdered = !!olMatch;

        while (i < lines.length) {
          const currentLine = lines[i];
          const itemMatch = currentLine.match(/^[\*\-]\s+(.+)$/) || currentLine.match(/^\d+\.\s+(.+)$/);
          
          if (!itemMatch) break;
          
          let content = itemMatch[1];
          const subLines = [content];
          
          i++;
          while (i < lines.length && lines[i].match(/^\s{2,}/) && !lines[i].match(/^[\*\-\d]/)) {
            subLines.push(lines[i].trim());
            i++;
          }

          listItems.push(subLines.join(' '));
        }

        const ListTag = isOrdered ? 'ol' : 'ul';

        elements.push(
          <ListTag key={`list-${i}`} className={`my-4 ${isOrdered ? 'list-decimal list-inside space-y-2' : 'list-disc list-inside space-y-2'} text-slate-700 dark:text-slate-300 print:break-inside-avoid`}>
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed ml-2">
                <span dangerouslySetInnerHTML={{ 
                  __html: item
                    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-slate-50">$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/`(.+?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
                }} />
              </li>
            ))}
          </ListTag>
        );
        continue;
      }

      let content = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-slate-50">$1</strong>')
                         .replace(/\*(.+?)\*/g, '<em>$1</em>')
                         .replace(/__(.+?)__/g, '<strong class="font-semibold text-slate-900 dark:text-slate-50">$1</strong>')
                         .replace(/_(.+?)_/g, '<em>$1</em>')
                         .replace(/`(.+?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

      elements.push(
        <p key={`p-${i}`} className="text-slate-700 dark:text-slate-300 text-base leading-relaxed mb-4">
          <span dangerouslySetInnerHTML={{ __html: content }} />
        </p>
      );
      i++;
    }

    return elements;
  };

  const selectedModeOption = MODE_OPTIONS.find(m => m.value === selectedMode) || MODE_OPTIONS[0];

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <style>{`
        @media print {
          @page { margin: 2cm; }
        }
      `}</style>

      {/* Feedback Modal */}
      {feedback.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
          <Card className="max-w-md w-full p-6 shadow-xl">
            {feedbackSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="flex justify-center">
                  <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4">
                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold">Thank you!</h3>
                <p className="text-sm text-muted-foreground">Your feedback helps us improve Gist.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">How was your experience?</h3>
                  <button
                    onClick={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Rating Stars */}
                <div className="flex gap-2 justify-center py-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= feedback.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Comment */}
                <textarea
                  placeholder="Any comments? (optional)"
                  value={feedback.comment}
                  onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full h-24 px-3 py-2 border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#ff6600]/50"
                />

                {/* Email */}
                <Input
                  type="email"
                  placeholder="Email (optional)"
                  value={feedback.email}
                  onChange={(e) => setFeedback(prev => ({ ...prev, email: e.target.value }))}
                />

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={feedbackSubmitting || feedback.rating === 0}
                  className="w-full bg-[#ff6600] hover:bg-[#ff6600]/90"
                >
                  {feedbackSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Rate Limit Banner
      {rateLimitInfo && (
        <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl print:hidden">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {isRateLimited ? (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Free trial limit reached</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium">{rateLimitInfo.remaining}/{rateLimitInfo.limit}</span>
                  <span>free requests left</span>
                </div>
              )}
            </div>
            
            {isRateLimited && rateLimitInfo.reset_in_hours && (
              <span className="text-muted-foreground">
                Resets in {rateLimitInfo.reset_in_hours} hours
              </span>
            )}
          </div>
        </div>
      )} */}

      {/* Ambient Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden print:hidden">
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 bg-[#ff6600]/5 rounded-full blur-3xl"
          style={{
            transform: `translateY(${scrollY * 0.2}px) scale(${1 + scrollY * 0.0005})`
          }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#ff6600]/3 rounded-full blur-3xl"
          style={{
            transform: `translateY(${-scrollY * 0.15}px)`
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl print:hidden transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-[#ff6600]/20 blur-md rounded-lg" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff6600]">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
              <span className="text-xl font-semibold tracking-tight text-foreground">gist</span>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme} 
              className="rounded-full"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Error Alert with Rate Limit Info */}
      {error && (
        <div className="container mx-auto px-4 mt-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="font-medium text-sm text-red-900 dark:text-red-200">Error</div>
              <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
              {error.includes("too long") && (
                <div className="text-xs text-red-700 dark:text-red-400 mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                  💡 Free trial supports videos up to 1 hour. Upgrade to process longer videos.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 sm:px-6">
        {!notes ? (
          <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 sm:py-20">
            <div className="max-w-2xl mx-auto w-full space-y-12 sm:space-y-16">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 
                    className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] sm:leading-[1.05] md:leading-[1] text-foreground"
                    style={{
                      transform: `translateY(${scrollY * -0.1}px)`,
                      transition: 'transform 0.1s ease-out'
                    }}
                  >
                    <span className="block">
                      turn any
                    </span>
                    <span className="block text-[#ff6600]">
                      youtube video
                    </span>
                    <span className="block">
                      into notes
                    </span>
                  </h1>
                </div>
                
                <p 
                  className="text-lg sm:text-xl text-muted-foreground max-w-md leading-relaxed"
                  style={{
                    transform: `translateY(${scrollY * -0.05}px)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  paste a link. choose your style. get comprehensive notes.
                  powered by ai. simple as that.
                </p>
              </div>

              <div className="space-y-6">
                <Card className="p-4 sm:p-6 md:p-8 shadow-none border border-border">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                      <Input
                        ref={inputRef}
                        type="url"
                        placeholder="paste youtube url here"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleGenerate()}
                        className="h-14 text-base px-4"
                        disabled={isLoading}
                      />
                      
                      <div className="flex gap-3">
                        {/* Mode Selector Dropdown */}
                        <div ref={dropdownRef} className="relative flex-1">
                          <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={isLoading}
                            className="w-full h-14 px-4 flex items-center justify-between gap-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <div className="flex items-center gap-2 text-left">
                              <span className="text-lg">{selectedModeOption.icon}</span>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{selectedModeOption.label}</span>
                                <span className="text-xs text-muted-foreground hidden sm:block">{selectedModeOption.description}</span>
                              </div>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950 dark:bg-slate-900 border border-border rounded-lg shadow-lg overflow-hidden z-50">
                              {MODE_OPTIONS.map((mode) => (
                                <button
                                  key={mode.value}
                                  onClick={() => {
                                    setSelectedMode(mode.value);
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors border-b border-border last:border-b-0 ${
                                    selectedMode === mode.value ? 'bg-[#ff6600]/20 border-l-4 border-l-[#ff6600]' : ''
                                  }`}
                                >
                                  <span className="text-xl">{mode.icon}</span>
                                  <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium">{mode.label}</span>
                                    <span className="text-xs text-muted-foreground">{mode.description}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={handleGenerate}
                          disabled={!url.trim() || isLoading}
                          size="lg"
                          className="h-14 px-6 text-base font-medium bg-[#ff6600] hover:bg-[#ff6600]/90 flex-shrink-0"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span className="hidden sm:inline">generating</span>
                            </>
                          ) : (
                            <>
                              <span className="hidden sm:inline">generate</span>
                              <ArrowRight className="w-5 h-5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {rateLimitInfo && (
                      <div className="text-xs text-muted-foreground text-center">
                        {rateLimitInfo.remaining}/{rateLimitInfo.limit} free requests remaining
                      </div>
                    )}

                    {error && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <div className="font-medium text-sm text-red-900 dark:text-red-200">error</div>
                          <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
                  {[
                    { number: "< 90s", label: "average time" },
                    { number: "3 modes", label: "note styles" },
                    { number: "100+", label: "videos processed" }
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-background p-4 sm:p-6 text-center">
                      <div className="text-xl sm:text-2xl font-bold tracking-tight mb-1 text-foreground">{stat.number}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 sm:pt-8 space-y-6 sm:space-y-8">
                <div>
                  <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-medium">
                    how it works
                  </h2>
                </div>
                
                <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
                  {[
                    { step: "01", title: "paste url", desc: "any youtube video link" },
                    { step: "02", title: "choose mode", desc: "study, dev, or summary" },
                    { step: "03", title: "get notes", desc: "structured & ready to use" }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-3">
                      <div className="text-4xl font-bold text-[#ff6600]">{item.step}</div>
                      <div>
                        <div className="font-semibold text-foreground mb-1">{item.title}</div>
                        <div className="text-sm text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 sm:py-12 max-w-4xl mx-auto">
            <div className="sticky top-24 z-40 mb-8 print:hidden">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 rounded-xl border border-slate-200/60 bg-white/80 dark:bg-slate-900/80 p-2 shadow-sm backdrop-blur-xl">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNotes("");
                    setUrl("");
                    setError("");
                  }}
                  className="w-full justify-start text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 sm:w-auto"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  New Note
                </Button>

                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className={`flex-1 sm:flex-none ${
                      copied
                        ? "bg-[#ff6600]/10 text-[#ff6600]"
                        : "text-slate-500 hover:bg-[#ff6600]/10 hover:text-[#ff6600]"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="flex-1 border-slate-200 bg-transparent text-slate-700 hover:border-[#ff6600] hover:bg-transparent hover:text-[#ff6600] dark:border-slate-700 dark:text-slate-300 sm:flex-none"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </div>

            <Card className="p-4 sm:p-6 md:p-12 lg:p-16 shadow-sm border border-border bg-white dark:bg-slate-950 print:shadow-none print:border-none print:p-0 print:bg-white dark:print:bg-white">
              <article id="notes-content" className="max-w-none">
                {typeof notes === 'string' ? parseMarkdown(notes) : <div className="text-red-500">Error: Invalid notes format</div>}
              </article>
            </Card>
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-16 sm:mt-24 py-8 sm:py-12 print:hidden transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="text-sm text-muted-foreground">
              © 2026 gist. built with care.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}