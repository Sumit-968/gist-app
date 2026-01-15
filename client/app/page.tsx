"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, FileText, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  const handleGenerate = async () => {
    if (!url) return;
    setIsLoading(true);
    setNotes("");
    setStatus("fetching");

    try {
      // DYNAMIC URL: Uses environment variable if live, otherwise localhost
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      
      const response = await fetch(`${apiUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert("Error: " + data.detail);
        setIsLoading(false);
        return;
      }

      setNotes(data.markdown);
      setStatus("done");
      
    } catch (error) {
      console.error(error);
      alert("Failed to connect to server. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-white px-4 py-12 text-slate-950 relative overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-50/80 blur-[120px] rounded-full pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-50/80 blur-[120px] rounded-full pointer-events-none mix-blend-multiply" />

      {/* Navbar */}
      <nav className="absolute top-8 left-8">
        <h1 className="text-xl font-bold tracking-tighter text-slate-900">Gist.</h1>
      </nav>

      <div className="z-10 w-full max-w-3xl space-y-10 text-center">
        
        {/* Header */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
            Powered by Gemini 2.5 Flash
          </div>
          
          <h1 className="text-5xl font-bold tracking-tighter sm:text-7xl text-slate-950 text-balance leading-[1.1]">
            Skip the video. <br />
            Keep the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">knowledge.</span>
          </h1>
        </div>

        {/* Input Card */}
        <Card className="p-2 bg-white/60 border-slate-200/60 backdrop-blur-xl shadow-lg transition-all">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              placeholder="Paste YouTube Link..." 
              className="bg-transparent border-transparent text-slate-900 placeholder:text-slate-400 h-14 text-lg focus-visible:ring-0 px-4"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button 
              size="lg" 
              className="h-14 px-8 bg-slate-950 text-white hover:bg-slate-800 font-semibold text-base transition-all rounded-lg"
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {status === "fetching" ? "Reading..." : "Thinking..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Generate <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </Card>

        {/* ---------------- RESULT SECTION ---------------- */}
        {notes && (
          <div className="mt-12 text-left animate-in fade-in slide-in-from-bottom-8 duration-700 w-full">
             <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <article className="prose prose-slate prose-lg max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6 pb-2 border-b border-slate-100" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4 flex items-center gap-2" {...props} />,
                      p: ({node, ...props}) => <p className="text-slate-600 leading-7 mb-4" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 mb-6 text-slate-600" {...props} />,
                      li: ({node, ...props}) => <li className="pl-2" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-slate-500 my-6" {...props} />,
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto my-8 rounded-lg border border-slate-200">
                          <table className="min-w-full divide-y divide-slate-200" {...props} />
                        </div>
                      ),
                      thead: ({node, ...props}) => <thead className="bg-slate-50" {...props} />,
                      tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-200 bg-white" {...props} />,
                      tr: ({node, ...props}) => <tr className="transition-colors hover:bg-slate-50/50" {...props} />,
                      th: ({node, ...props}) => <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap" {...props} />,
                      td: ({node, ...props}) => <td className="px-6 py-4 text-sm text-slate-600 align-top leading-relaxed min-w-[200px]" {...props} />,
                    }}
                  >
                    {notes}
                  </ReactMarkdown>
                </article>
             </div>
             
             {/* Action Buttons */}
             <div className="flex justify-center gap-4 mt-8 pb-12">
                <Button variant="outline" onClick={() => window.print()}>
                   Export to PDF
                </Button>
                <Button variant="ghost" onClick={() => {setNotes(""); setUrl("");}}>
                   Generate Another
                </Button>
             </div>
          </div>
        )}
      </div>
    </main>
  );
}