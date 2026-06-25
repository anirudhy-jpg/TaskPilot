import React, { useState, useRef, useEffect } from "react"
import { Send, Plus, X, FileText, Archive, FileIcon, Image as ImageIcon } from "lucide-react"
import { CHAT_LIMITS } from "../constants"

const showWarningPopup = (message: string) => {
  const toast = document.createElement("div");
  toast.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[10000] bg-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 fade-in duration-300 min-w-[300px] max-w-[400px] cursor-pointer hover:bg-slate-800/80 transition-colors`;
  toast.innerHTML = `
    <div class="flex-1 flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <span class="text-amber-500 font-semibold text-sm">Warning</span>
      </div>
      <p class="text-sm text-slate-300 break-words">${message}</p>
    </div>
  `;
  toast.onclick = () => toast.remove();
  document.body.appendChild(toast);
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%, -10px)";
      toast.style.transition = "all 0.3s ease-out";
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
};

interface MessageInputProps {
  onSend: (content: string, file?: File) => Promise<void>
  disabled: boolean
  disabledReason?: string
  onTypingStart?: () => void
  onTypingStop?: () => void
  isUploading?: boolean
}

export function MessageInput({ onSend, disabled, disabledReason, onTypingStart, onTypingStop, isUploading }: MessageInputProps) {
  const [content, setContent] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastTypingTime = useRef<number>(0)
  const sentTimestamps = useRef<number[]>([])

  const handleSend = () => {
    const trimmedContent = content.trim()
    if ((!trimmedContent && !selectedFile) || disabled || isUploading) return
    
    const now = Date.now()
    sentTimestamps.current = sentTimestamps.current.filter(t => now - t < 5000)
    if (sentTimestamps.current.length >= CHAT_LIMITS.MESSAGES_PER_5_SEC) {
      showWarningPopup(`You are sending messages too fast. Please wait a moment.`)
      return;
    }
    sentTimestamps.current.push(now)
    
    setContent("")
    onTypingStop?.() // Immediately broadcast stop when sending
    
    // Fire and forget, allowing continuous typing
    onSend(trimmedContent, selectedFile || undefined)
    
    setSelectedFile(null)
    setLocalPreview(null)
    
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  const handleTypingThrottle = () => {
    const now = Date.now()
    if (now - lastTypingTime.current > CHAT_LIMITS.TYPING_THROTTLE_MS) {
      onTypingStart?.()
      lastTypingTime.current = now
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    if (newContent.length > CHAT_LIMITS.MAX_MESSAGE_LENGTH) {
      showWarningPopup(`Message cannot exceed ${CHAT_LIMITS.MAX_MESSAGE_LENGTH} characters.`)
      return;
    }
    
    setContent(newContent)
    if (newContent.trim().length > 0) {
      handleTypingThrottle()
    } else {
      onTypingStop?.()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [content])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (file.size > CHAT_LIMITS.MAX_ATTACHMENT_SIZE_BYTES) {
      showWarningPopup(`File size must be less than ${CHAT_LIMITS.MAX_ATTACHMENT_SIZE_MB}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setLocalPreview(url);
    } else {
      setLocalPreview(null);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  const removeFile = () => {
    setSelectedFile(null);
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
  }

  const getFileIcon = (mimeType: string, fileName: string) => {
    if (mimeType === "application/pdf") return <FileText size={24} className="text-red-400" />;
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext && ['zip', 'rar', 'tar', 'gz'].includes(ext)) return <Archive size={24} className="text-amber-500" />;
    return <FileIcon size={24} className="text-blue-400" />;
  }

  return (
    <div className="p-4 sm:p-6 pb-8 bg-transparent shrink-0 z-20 flex flex-col gap-2">
      {/* File Preview Area */}
      {selectedFile && (
        <div className="relative self-start mb-1 group">
          <div className="bg-[#1e2333] border border-slate-700/50 rounded-xl p-2 pr-10 flex items-center gap-3 shadow-lg max-w-sm">
            {localPreview ? (
              <div className="w-12 h-12 rounded-lg bg-black overflow-hidden shrink-0">
                <img src={localPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                {getFileIcon(selectedFile.type, selectedFile.name)}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-slate-200 truncate">{selectedFile.name}</span>
              <span className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
          <button 
            onClick={removeFile}
            className="absolute top-1 right-1 p-1 bg-slate-800 text-slate-400 rounded-full hover:bg-rose-500/20 hover:text-rose-400 transition-colors shadow-sm"
            disabled={isUploading}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="relative flex items-center gap-3 w-full bg-[#121826] border border-slate-800/80 rounded-full p-1.5 shadow-xl transition-all hover:border-slate-700">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          className="hidden" 
          disabled={disabled || isUploading}
        />
        <button 
          className="w-10 h-10 shrink-0 rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 flex items-center justify-center transition-colors outline-none"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
        >
          <Plus size={20} />
        </button>
        
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isUploading}
          placeholder={disabled ? (disabledReason || "This conversation is read-only") : "Type a message..."}
          className="flex-1 bg-transparent border-0 border-transparent text-[15px] text-slate-200 placeholder-slate-500 focus:ring-0 focus:border-transparent focus:outline-none outline-none resize-none max-h-[120px] scrollbar-thin disabled:opacity-50 disabled:cursor-not-allowed py-2.5 px-2"
          rows={1}
        />

        <div className="flex items-center gap-1 shrink-0 pr-1">
          <button
            onClick={handleSend}
            disabled={(!content.trim() && !selectedFile) || disabled || isUploading}
            className="w-10 h-10 ml-1 rounded-full bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 transition-all shadow-md active:scale-95 flex items-center justify-center outline-none"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={18} className="ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
