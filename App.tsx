import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Plus, 
  MessageSquare, 
  Sparkles, 
  Send, 
  Mic, 
  Image as ImageIcon, 
  ChevronLeft, 
  MoreVertical,
  X,
  Code2,
  History,
  FileCode,
  Play,
  Trash2,
  Edit2,
  FolderOpen,
  Check,
  Download,
  ExternalLink,
  Copy,
  Zap,
  Cpu,
  Monitor
} from 'lucide-react';
import { streamResponse } from './services/gemini';
import { Message, ViewState, ChatSession } from './types';

// --- Helper Functions ---

const extractCode = (text: string): { language: string, code: string } | null => {
  // Regex to match a complete block
  const completeMatch = text.match(/```(\w*)\n([\s\S]*?)```/);
  if (completeMatch) {
    return {
      language: completeMatch[1] || 'html',
      code: completeMatch[2]
    };
  }
  
  // Regex to match an OPEN block (streaming state)
  const openMatch = text.match(/```(\w*)\n([\s\S]*)$/);
  if (openMatch) {
     return {
      language: openMatch[1] || 'html',
      code: openMatch[2]
    };
  }

  return null;
};

// --- Components ---

// 1. Sidebar Component
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onSelectSession: (session: ChatSession) => void;
  activeSessionId: string | null;
  onNewChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  sessions, 
  onSelectSession, 
  activeSessionId,
  onNewChat
}) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Drawer */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#131314]/95 backdrop-blur-xl border-r border-[#444746]/50 transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:w-64 lg:block flex flex-col shadow-2xl lg:shadow-none`}>
        <div className="p-4 flex items-center justify-between border-b border-[#444746]/50">
          <h2 className="text-lg font-semibold text-[#E3E3E3] flex items-center gap-2 tracking-tight">
            <div className="relative">
              <Sparkles className="w-5 h-5 text-[#A8C7FA]" />
              <div className="absolute inset-0 bg-[#A8C7FA] blur-md opacity-40"></div>
            </div>
            AI Studio
          </h2>
          <button onClick={onClose} className="lg:hidden text-[#C4C7C5] hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4">
          <button 
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="group w-full flex items-center gap-3 bg-[#1E1F20] hover:bg-[#2D2E2F] text-[#A8C7FA] transition-all px-4 py-3 rounded-xl text-sm font-medium border border-[#444746]/50 hover:border-[#A8C7FA]/50 hover:shadow-[0_0_15px_rgba(168,199,250,0.1)]"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            <span className="text-[#E3E3E3]">New Project</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <div className="text-[10px] font-bold text-[#8E918F] px-4 py-2 uppercase tracking-widest opacity-70">Library</div>
          {sessions.length === 0 && (
            <div className="px-4 py-8 text-center">
               <p className="text-[#8E918F] text-sm italic opacity-50">Your projects will appear here.</p>
            </div>
          )}
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => {
                onSelectSession(session);
                if (window.innerWidth < 1024) onClose();
              }}
              className={`group w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm transition-all duration-200 ${activeSessionId === session.id ? 'bg-[#004A77]/40 border border-[#A8C7FA]/20 text-[#A8C7FA]' : 'text-[#C4C7C5] hover:bg-[#2D2E2F]/50 border border-transparent'}`}
            >
              <MessageSquare className={`w-4 h-4 flex-shrink-0 transition-colors ${activeSessionId === session.id ? 'text-[#A8C7FA]' : 'text-[#8E918F] group-hover:text-[#E3E3E3]'}`} />
              <span className="truncate font-medium">{session.title}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// 2. Chat Bubble Component
const ChatBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  const isThinking = message.isStreaming && message.text.length === 0;
  
  // Custom splitting logic to handle open code blocks gracefully
  const parts = message.text.split(/(```[\s\S]*?```|```[\s\S]*$)/g);

  return (
    <div className={`flex w-full mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[95%] md:max-w-[85%] flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${isUser ? 'bg-[#2D2E2F] border border-[#444746]' : 'bg-gradient-to-br from-[#0B57D0] to-[#1E1F20] border border-[#A8C7FA]/20'}`}>
          {isUser ? (
            <span className="text-xs font-bold text-[#E3E3E3]">You</span>
          ) : (
             <Sparkles className={`w-5 h-5 text-[#A8C7FA] ${message.isStreaming ? 'animate-pulse' : ''}`} />
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col gap-1 w-full ${isUser ? 'items-end' : 'items-start'}`}>
          <div className="text-xs text-[#8E918F] font-medium mb-1 flex items-center gap-2">
            {isUser ? 'User' : (
              <>
                <span className="text-[#A8C7FA] font-semibold tracking-wide">CLAUDE 3.5</span>
                <span className="text-[10px] bg-[#0B57D0]/30 text-[#A8C7FA] px-1.5 py-0.5 rounded border border-[#A8C7FA]/20">TURBO</span>
              </>
            )}
          </div>
          
          <div className={`text-[15px] leading-relaxed w-full ${isUser ? 'text-[#E3E3E3]' : 'text-[#E3E3E3]'}`}>
            
            {isThinking && (
              <div className="flex items-center gap-3 py-3 px-4 bg-[#1E1F20] rounded-xl border border-[#444746]/50 w-fit">
                 <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-[#A8C7FA] rounded-full animate-[bounce_1s_infinite_0ms]"></div>
                    <div className="w-2 h-2 bg-[#A8C7FA] rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                    <div className="w-2 h-2 bg-[#A8C7FA] rounded-full animate-[bounce_1s_infinite_400ms]"></div>
                </div>
                <span className="text-sm text-[#8E918F] animate-pulse font-medium">Analyzing & Coding...</span>
              </div>
            )}

            {!isThinking && parts.map((part, index) => {
               // Check if it's a code block (closed or open)
               if (part.startsWith('```')) {
                 const isClosed = part.endsWith('```');
                 // Extract language
                 const firstLineBreak = part.indexOf('\n');
                 const lang = firstLineBreak > 3 ? part.slice(3, firstLineBreak).trim() : 'code';
                 // Extract code content
                 let code = part.slice(firstLineBreak + 1);
                 if (isClosed) code = code.slice(0, -3);

                 return (
                   <div key={index} className="my-4 rounded-xl overflow-hidden border border-[#444746] bg-[#1E1F20] shadow-2xl relative group transition-all duration-300">
                     {/* Header */}
                     <div className="flex items-center justify-between px-4 py-2.5 bg-[#2D2E2F]/50 backdrop-blur-sm border-b border-[#444746]/50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                          <div className="w-px h-4 bg-[#444746] mx-1"></div>
                          <FileCode className="w-4 h-4 text-[#A8C7FA]" />
                          <span className="text-xs text-[#E3E3E3] font-mono font-medium opacity-80">
                            {lang || 'html'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#8E918F] font-mono flex items-center gap-1.5">
                          {!isClosed && message.isStreaming ? (
                             <span className="flex items-center gap-1.5 text-[#A8C7FA]">
                                 <span className="w-1.5 h-1.5 rounded-full bg-[#A8C7FA] animate-pulse"></span> Streaming
                             </span>
                          ) : (
                             <><Check className="w-3 h-3" /> Complete</>
                          )}
                        </span>
                     </div>
                     {/* Code Body */}
                     <div className="relative">
                        <pre className="p-5 overflow-x-auto text-sm font-mono text-[#E3E3E3] bg-[#0b0c0d] leading-6 tab-4">
                          <code>{code}</code>
                          {/* Blinking cursor for open blocks */}
                          {!isClosed && message.isStreaming && (
                            <span className="inline-block w-2.5 h-5 bg-[#A8C7FA] ml-1 align-text-bottom animate-pulse"></span>
                          )}
                        </pre>
                     </div>
                   </div>
                 );
               }
               // Regular text
               return <span key={index} className="whitespace-pre-wrap">{part}</span>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. Code View Component
const CodeView: React.FC<{ code: string | null }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!code) {
     return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#8E918F] bg-[#131314]">
        <div className="p-4 rounded-full bg-[#1E1F20] mb-4 shadow-inner">
           <Code2 className="w-12 h-12 opacity-20" />
        </div>
        <p className="font-medium">No code generated yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0b0c0d] h-full w-full relative flex flex-col overflow-hidden">
       <div className="flex items-center justify-between px-4 py-3 bg-[#1E1F20] border-b border-[#444746]/50">
         <span className="text-sm text-[#A8C7FA] font-mono flex items-center gap-2">
            <FileCode className="w-4 h-4" /> index.html
         </span>
         <button 
           onClick={handleCopy}
           className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2D2E2F] hover:bg-[#3C3D3F] text-xs text-[#E3E3E3] transition-colors border border-[#444746]"
         >
           {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
           {copied ? 'Copied' : 'Copy Code'}
         </button>
       </div>
       <pre className="flex-1 p-6 overflow-auto text-sm font-mono text-[#E3E3E3] leading-relaxed">
         <code>{code}</code>
       </pre>
    </div>
  );
};

// 4. Preview Pane Component
const PreviewPane: React.FC<{ code: string | null }> = ({ code }) => {
  const [key, setKey] = useState(0);

  const handleReload = () => setKey(prev => prev + 1);

  const handleDownload = () => {
    if (!code) return;
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenNewWindow = () => {
     if (!code) return;
     const w = window.open('', '_blank');
     if (w) {
       w.document.write(code);
       w.document.close();
     }
  };

  if (!code) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#8E918F] bg-[#131314]">
        <div className="p-6 rounded-2xl bg-[#1E1F20] border border-[#444746]/50 mb-6 shadow-2xl">
            <Monitor className="w-16 h-16 opacity-20" />
        </div>
        <p className="text-lg font-medium text-[#E3E3E3] mb-2">Ready to Preview</p>
        <p className="text-sm opacity-50">Generated applications will run here automatically.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white h-full w-full relative group">
       <iframe 
         key={key}
         title="Preview"
         className="w-full h-full border-none"
         srcDoc={code}
         sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
       />
       
       {/* Floating Control Bar */}
       <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#1E1F20]/90 backdrop-blur-md p-1.5 rounded-full shadow-2xl border border-[#444746]/50 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <button 
            onClick={handleReload}
            className="p-2 hover:bg-[#2D2E2F] text-[#E3E3E3] rounded-full transition-colors tooltip"
            title="Reload"
          >
            <History className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-[#444746] mx-1"></div>
          <button 
            onClick={handleDownload}
            className="p-2 hover:bg-[#2D2E2F] text-[#E3E3E3] rounded-full transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
           <button 
            onClick={handleOpenNewWindow}
            className="p-2 hover:bg-[#2D2E2F] text-[#E3E3E3] rounded-full transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
       </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [activeTab, setActiveTab] = useState<'CHAT' | 'PREVIEW' | 'CODE'>('CHAT');
  const [inputText, setInputText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const selectedModel = 'claude-3.5-sonnet-turbo';

  // --- PERSISTENCE: Load initial state from LocalStorage ---
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('gemini_clone_sessions');
        return saved ? JSON.parse(saved) : [];
      }
      return [];
    } catch (e) {
      console.error("Failed to load sessions:", e);
      return [];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // --- PERSISTENCE: Save state to LocalStorage ---
  useEffect(() => {
    try {
       localStorage.setItem('gemini_clone_sessions', JSON.stringify(sessions));
    } catch (e) {
       console.error("Failed to save sessions:", e);
    }
  }, [sessions]);

  // Focus ref
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Derived state
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // Extract latest code for preview
  const lastModelMessage = [...messages].reverse().find(m => m.role === 'model');
  const extracted = lastModelMessage ? extractCode(lastModelMessage.text) : null;
  const previewCode = extracted ? extracted.code : null;

  // Auto-switch to preview if code is generated and we are not currently streaming
  useEffect(() => {
    if (previewCode && !isLoading && activeTab === 'CHAT' && messages.length > 2) {
       // Optional auto-switch logic, kept manual for better UX based on recent feedback
    }
  }, [previewCode, isLoading]);

  // Scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current && activeTab === 'CHAT') {
       // Only scroll if near bottom or if loading
       chatContainerRef.current.scrollTo({
         top: chatContainerRef.current.scrollHeight,
         behavior: 'smooth'
       });
    }
  }, [messages.length, messages[messages.length-1]?.text?.length, activeTab]);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateNewChat = () => {
    setView(ViewState.HOME);
    setActiveTab('CHAT');
    setCurrentSessionId(null);
    setInputText('');
    setSidebarOpen(false);
    setMenuOpen(false);
  };

  const handleDeleteSession = () => {
    if (currentSessionId && window.confirm("Delete this project permanently?")) {
       setSessions(prev => prev.filter(s => s.id !== currentSessionId));
       handleCreateNewChat();
    }
  };

  const handleRenameSession = () => {
    if (!currentSessionId) return;
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;
    
    const newTitle = window.prompt("Project Name:", session.title);
    if (newTitle && newTitle.trim()) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, title: newTitle.trim() } : s
      ));
    }
    setMenuOpen(false);
  };

  const startChat = async (initialPrompt: string) => {
    if (!initialPrompt.trim()) return;

    const newSessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: newSessionId,
      title: initialPrompt.slice(0, 30) + (initialPrompt.length > 30 ? '...' : ''),
      model: selectedModel,
      messages: [{
        id: Date.now().toString(),
        role: 'user',
        text: initialPrompt,
        timestamp: Date.now()
      }],
      createdAt: Date.now()
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setView(ViewState.CHAT);
    setInputText('');
    setIsLoading(true);

    setSessions(prev => prev.map(s => {
      if (s.id === newSessionId) {
        return {
          ...s,
          messages: [...s.messages, {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: '',
            timestamp: Date.now(),
            isStreaming: true
          }]
        };
      }
      return s;
    }));

    try {
      let fullText = "";
      for await (const chunk of streamResponse(selectedModel, initialPrompt, [])) {
        fullText += chunk;
        setSessions(prev => prev.map(s => {
          if (s.id === newSessionId) {
            const msgs = [...s.messages];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg.role === 'model') {
              lastMsg.text = fullText;
            }
            return { ...s, messages: msgs };
          }
          return s;
        }));
      }
    } finally {
      setIsLoading(false);
      setSessions(prev => prev.map(s => {
        if (s.id === newSessionId) {
           const msgs = [...s.messages];
           const lastMsg = msgs[msgs.length - 1];
           lastMsg.isStreaming = false;
           return { ...s, messages: msgs };
        }
        return s;
      }));
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentSessionId) return;

    const userMsgText = inputText;
    setInputText('');
    setIsLoading(true);

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, {
            id: Date.now().toString(),
            role: 'user',
            text: userMsgText,
            timestamp: Date.now()
          }]
        };
      }
      return s;
    }));

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: '',
            timestamp: Date.now(),
            isStreaming: true
          }]
        };
      }
      return s;
    }));

    const currentHistory = sessions.find(s => s.id === currentSessionId)?.messages || [];
    // Only send the last 10 messages to avoid context bloat which causes truncation
    const historyForApi = currentHistory.slice(0, -1).slice(-10); 

    try {
      let fullText = "";
      for await (const chunk of streamResponse(selectedModel, userMsgText, historyForApi)) {
        fullText += chunk;
        setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
            const msgs = [...s.messages];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg.role === 'model') {
              lastMsg.text = fullText;
            }
            return { ...s, messages: msgs };
          }
          return s;
        }));
      }
    } finally {
      setIsLoading(false);
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
           const msgs = [...s.messages];
           const lastMsg = msgs[msgs.length - 1];
           lastMsg.isStreaming = false;
           return { ...s, messages: msgs };
        }
        return s;
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (view === ViewState.HOME) {
        startChat(inputText);
      } else {
        handleSendMessage();
      }
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <div className="flex h-screen bg-[#131314] text-[#E3E3E3] overflow-hidden font-sans selection:bg-[#A8C7FA]/30 selection:text-[#E3E3E3]">
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        sessions={sessions}
        onSelectSession={(s) => {
          setCurrentSessionId(s.id);
          setView(ViewState.CHAT);
          setActiveTab('CHAT');
        }}
        activeSessionId={currentSessionId}
        onNewChat={handleCreateNewChat}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative w-full transition-all">
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-[#444746]/50 shrink-0 bg-[#131314]/80 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-[#2D2E2F] rounded-full lg:hidden transition-colors">
              <Menu className="w-6 h-6 text-[#8E918F]" />
            </button>
            
            {view === ViewState.CHAT && (
              <button onClick={handleCreateNewChat} className="p-2 hover:bg-[#2D2E2F] rounded-full transition-colors group">
                <ChevronLeft className="w-6 h-6 text-[#8E918F] group-hover:text-[#E3E3E3]" />
              </button>
            )}

            <h1 className="text-lg font-medium truncate max-w-[150px] sm:max-w-md text-[#E3E3E3] tracking-tight">
              {view === ViewState.HOME ? 'New Project' : (currentSession?.title || 'Untitled Project')}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            
            {/* Model Info */}
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1E1F20] border border-[#444746]/50 text-xs font-medium text-[#E3E3E3] shadow-sm">
                 <span className="text-[#A8C7FA] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-current" /> 
                    <span className="tracking-wide">CLAUDE 3.5</span>
                 </span>
                 <div className="w-px h-3 bg-[#444746]"></div>
                 <span className="text-[#8E918F]">TURBO</span>
             </div>

            <button className="p-2 text-[#8E918F] hover:text-[#E3E3E3] hover:bg-[#2D2E2F] rounded-full hidden sm:block transition-colors">
              <History className="w-5 h-5" />
            </button>
            
            {/* The "Three Dots" Menu */}
            <div className="relative" ref={menuRef}>
              <button 
                 onClick={() => setMenuOpen(!menuOpen)}
                 className={`p-2 rounded-full transition-colors ${menuOpen ? 'bg-[#2D2E2F] text-[#E3E3E3]' : 'text-[#8E918F] hover:text-[#E3E3E3] hover:bg-[#2D2E2F]'}`}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1E1F20]/95 backdrop-blur-xl border border-[#444746] rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-200">
                   <button 
                     onClick={() => { setSidebarOpen(true); setMenuOpen(false); }}
                     className="w-full text-left px-4 py-2.5 text-sm text-[#E3E3E3] hover:bg-[#A8C7FA]/10 flex items-center gap-3 transition-colors"
                   >
                     <FolderOpen className="w-4 h-4 text-[#A8C7FA]" />
                     My Library
                   </button>
                   {view === ViewState.CHAT && (
                     <>
                        <div className="h-px bg-[#444746]/50 my-1.5 mx-2"></div>
                        <button 
                          onClick={handleRenameSession}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#E3E3E3] hover:bg-[#A8C7FA]/10 flex items-center gap-3 transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-[#8E918F]" />
                          Rename
                        </button>
                        <button 
                          onClick={handleDeleteSession}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                     </>
                   )}
                </div>
              )}
            </div>

             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#A8C7FA] to-[#0B57D0] flex items-center justify-center text-white text-[10px] font-bold ml-1 shadow-[0_0_10px_rgba(168,199,250,0.3)]">
              AI
            </div>
          </div>
        </header>

        {/* View Content */}
        {view === ViewState.HOME ? (
          /* HOME VIEW */
          <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
             {/* Background Gradients */}
             <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
               <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-[#0B57D0] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-pulse"></div>
               <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-[#A8C7FA] rounded-full mix-blend-screen filter blur-[100px] opacity-5"></div>
             </div>

            <div className="w-full max-w-3xl flex flex-col gap-10 -mt-20 z-10">
              <div className="space-y-4 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2D2E2F]/50 border border-[#444746]/50 backdrop-blur-sm w-fit mx-auto sm:mx-0">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A8C7FA] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A8C7FA]"></span>
                    </span>
                    <span className="text-xs font-medium text-[#C4C7C5] tracking-wide">SYSTEM ONLINE</span>
                </div>
                <h2 className="text-5xl md:text-6xl font-light tracking-tighter text-white leading-[1.1]">
                  Build fast with <br/>
                  <span className="bg-gradient-to-r from-[#A8C7FA] via-[#669DF6] to-[#0B57D0] text-transparent bg-clip-text font-semibold">Claude Turbo</span>
                </h2>
                <p className="text-[#8E918F] text-xl max-w-lg mx-auto sm:mx-0 font-light leading-relaxed">
                  Generate full-stack web apps in seconds. <br/> Free, unlimited, and optimized for code.
                </p>
              </div>
              
              <div className="bg-[#1E1F20]/80 backdrop-blur-xl border border-[#444746] rounded-3xl p-2 shadow-2xl focus-within:ring-2 focus-within:ring-[#A8C7FA]/50 transition-all duration-300 transform hover:scale-[1.01]">
                <div className="px-4 py-3">
                    <textarea
                        ref={inputRef}
                        value={inputText}
                        onChange={handleInputResize}
                        onKeyDown={handleKeyDown}
                        placeholder="Build a landing page for a coffee shop..."
                        className="w-full bg-transparent text-xl text-[#E3E3E3] placeholder-[#8E918F]/40 resize-none outline-none max-h-40 overflow-y-auto leading-relaxed"
                        rows={1}
                        style={{minHeight: '44px'}}
                    />
                </div>
                <div className="flex justify-between items-center px-2 pb-2">
                  <div className="flex gap-1">
                    <button className="p-2.5 rounded-full hover:bg-[#2D2E2F] text-[#8E918F] transition-colors tooltip" title="Add Image">
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2.5 rounded-full hover:bg-[#2D2E2F] text-[#8E918F] transition-colors tooltip" title="Voice Input">
                      <Mic className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                     <button 
                      onClick={() => startChat(inputText)}
                      disabled={!inputText.trim()}
                      className={`px-6 py-2.5 rounded-full font-medium transition-all duration-200 flex items-center gap-2 ${inputText.trim() ? 'bg-[#E3E3E3] text-[#1E1F20] hover:bg-white shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]' : 'bg-[#2D2E2F] text-[#8E918F] cursor-not-allowed'}`}
                     >
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        ) : (
          /* CHAT VIEW */
          <main className="flex-1 flex flex-col relative h-full overflow-hidden bg-[#0b0c0d]">
            
            {/* Chat / Preview Container */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
              {activeTab === 'CHAT' ? (
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar"
                >
                  <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-start pb-48">
                    {messages.length === 0 && !isLoading && (
                      <div className="flex flex-col items-center justify-center flex-1 h-full text-center opacity-40 mt-20 animate-in fade-in duration-700">
                         <div className="w-20 h-20 bg-[#1E1F20] rounded-full flex items-center justify-center mb-6 shadow-inner">
                             <Cpu className="w-10 h-10 text-[#8E918F]" />
                         </div>
                         <p className="text-lg">Waiting for instructions...</p>
                      </div>
                    )}

                    {messages.map((msg) => (
                      <ChatBubble key={msg.id} message={msg} />
                    ))}
                  </div>
                </div>
              ) : activeTab === 'PREVIEW' ? (
                <PreviewPane code={previewCode} />
              ) : (
                <CodeView code={previewCode} />
              )}
            </div>

            {/* Bottom Input Area (Overlay) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#131314] via-[#131314] to-transparent pb-6 z-20">
              <div className="max-w-3xl mx-auto bg-[#1E1F20]/90 backdrop-blur-xl border border-[#444746]/70 rounded-3xl p-2 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all focus-within:border-[#A8C7FA]/30">
                 <div className="px-4 py-2">
                   <textarea
                      value={inputText}
                      onChange={handleInputResize}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask for changes or new features..."
                      className="w-full bg-transparent text-base text-[#E3E3E3] placeholder-[#8E918F]/50 resize-none outline-none max-h-32 overflow-y-auto"
                      rows={1}
                      style={{ height: 'auto', minHeight: '24px' }}
                    />
                 </div>
                 <div className="flex justify-between items-center px-2 pb-1">
                    <div className="flex gap-2">
                        <button className="p-2 rounded-full hover:bg-[#2D2E2F] text-[#8E918F] transition-colors" title="Attach">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                          onClick={handleSendMessage}
                          disabled={!inputText.trim() || isLoading}
                          className={`p-2 rounded-full transition-all duration-300 ${inputText.trim() ? 'bg-[#A8C7FA] text-[#1E1F20] rotate-0 scale-100' : 'bg-[#2D2E2F] text-[#8E918F] rotate-0 scale-90'}`}
                       >
                          <div className="w-6 h-6 flex items-center justify-center">
                             <Send className="w-4 h-4 ml-0.5" />
                          </div>
                       </button>
                    </div>
                 </div>
              </div>
              
              {/* Toggle Chat/Preview */}
              <div className="max-w-3xl mx-auto flex justify-center items-center mt-4">
                  <div className="bg-[#1E1F20]/90 backdrop-blur-md border border-[#444746]/50 rounded-full p-1 flex items-center shadow-lg">
                     <button 
                       onClick={() => setActiveTab('CHAT')}
                       className={`px-5 py-2 rounded-full text-xs font-semibold transition-all duration-300 ${activeTab === 'CHAT' ? 'bg-[#2D2E2F] text-[#E3E3E3] shadow-sm' : 'text-[#8E918F] hover:text-[#E3E3E3]'}`}
                     >
                       Chat
                     </button>
                     <button 
                       onClick={() => setActiveTab('PREVIEW')}
                       className={`px-5 py-2 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-2 ${activeTab === 'PREVIEW' ? 'bg-[#2D2E2F] text-[#E3E3E3] shadow-sm' : 'text-[#8E918F] hover:text-[#E3E3E3]'}`}
                     >
                       <Play className="w-3 h-3 fill-current" />
                       Preview
                     </button>
                     <button 
                       onClick={() => setActiveTab('CODE')}
                       className={`px-5 py-2 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-2 ${activeTab === 'CODE' ? 'bg-[#2D2E2F] text-[#E3E3E3] shadow-sm' : 'text-[#8E918F] hover:text-[#E3E3E3]'}`}
                     >
                       <Code2 className="w-3 h-3" />
                       Code
                     </button>
                  </div>
              </div>
            </div>

          </main>
        )}
      </div>
    </div>
  );
}