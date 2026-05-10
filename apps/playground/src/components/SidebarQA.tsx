import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { generateContentStream } from '../services/aiService';
import { cn } from '../lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SidebarQAProps {
  documentText: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SidebarQA({ documentText, isOpen, onClose }: SidebarQAProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'initial', role: 'assistant', content: '你好！我是 AI 助手。你可以就这篇文档向我提问，或者让我总结全文。' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    const newMsgId = Date.now().toString();
    
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: userMsg },
      { id: newMsgId, role: 'assistant', content: '' }
    ]);
    
    setIsLoading(true);

    try {
      const prompt = `Here is the document context:\n\n---\n${documentText}\n---\n\nUser Question: ${userMsg}`;
      const stream = await generateContentStream(prompt, {
        systemInstruction: "You are a helpful AI assistant. Answer the user's questions strictly based on the provided document context. If the answer is not in the document, politely say so. Answer in the same language as the user's question.",
        usePro: true,
      });

      let fullText = '';
      for await (const chunk of stream) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages(prev => prev.map(msg => 
            msg.id === newMsgId ? { ...msg, content: fullText } : msg
          ));
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(msg => 
        msg.id === newMsgId ? { ...msg, content: 'Sorry, I encountered an error answering that.' } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = () => {
    setInput('请一句话总结这篇文档的内容。');
    setTimeout(() => {
      document.getElementById('qa-submit-btn')?.click();
    }, 10);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[85vw] sm:max-w-md lg:max-w-md flex flex-col p-0 gap-0 border-l border-slate-200">
        <SheetHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between bg-slate-50/50 space-y-0 text-left">
          <SheetTitle className="font-semibold text-slate-800 flex items-center tracking-tight text-sm">
            <Bot className="w-4 h-4 mr-2 text-slate-700" />
            Document Q&A
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm", 
                msg.role === 'assistant' ? "bg-slate-50 text-slate-700 border border-slate-200" : "bg-white text-slate-600 border border-slate-200"
              )}>
                {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={cn("px-4 py-2.5 rounded-2xl max-w-[80%] text-[13px] leading-relaxed shadow-sm", 
                msg.role === 'user' 
                  ? "bg-slate-900 text-white rounded-tr-sm" 
                  : "bg-white text-slate-800 rounded-tl-sm whitespace-pre-wrap border border-slate-200"
              )}>
                {msg.content || (msg.role === 'assistant' && isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> : '')}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-white border-t border-slate-100 flex justify-center">
          <button 
            onClick={handleSummarize}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 px-4 py-2 rounded-full transition-colors flex items-center"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> 一键总结全文 (Summarize)
          </button>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-white border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 rounded-2xl px-4 py-2 text-sm text-slate-800 outline-none transition-all shadow-sm"
            />
            <button
              id="qa-submit-btn"
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-slate-800 shadow-sm text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
