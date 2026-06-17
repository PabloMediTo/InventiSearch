import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../types";

interface Props {
  message: Message;
  onEdit?: (id: string, newContent: string) => void;
  onRegenerate?: (id: string) => void;
  isLast?: boolean;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ChatMessage({ message, onEdit, onRegenerate, isLast }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleEditSubmit() {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== message.content && onEdit) {
      onEdit(message.id, trimmed);
    }
    setEditing(false);
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    }
    if (e.key === "Escape") {
      setEditing(false);
      setEditText(message.content);
    }
  }

  return (
    <div className={`message ${isUser ? "message-user" : "message-assistant"}`}>
      <div className="message-content">
        {editing ? (
          <div className="message-edit">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              autoFocus
            />
            <div className="message-edit-actions">
              <button onClick={handleEditSubmit} className="edit-save">Save</button>
              <button onClick={() => { setEditing(false); setEditText(message.content); }} className="edit-cancel">Cancel</button>
            </div>
          </div>
        ) : isUser ? (
          <p>{message.content}</p>
        ) : message.content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        ) : (
          <div className="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        )}
      </div>

      {!editing && message.content && (
        <div className="message-meta">
          <span className="message-time">{timeAgo(message.timestamp)}</span>
          <div className="message-actions">
            {isUser && onEdit && (
              <button
                className="action-btn"
                onClick={() => setEditing(true)}
                aria-label="Edit message"
                title="Edit"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            {!isUser && (
              <button
                className="action-btn"
                onClick={handleCopy}
                aria-label="Copy message"
                title={copied ? "Copied!" : "Copy"}
              >
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            )}
            {!isUser && isLast && onRegenerate && (
              <button
                className="action-btn"
                onClick={() => onRegenerate(message.id)}
                aria-label="Regenerate response"
                title="Regenerate"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
