import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { getResponse } from "../adapter/productChatAdapter";
import type { Message, Conversation } from "../types";
import logoDark from "../assets/logo-dark.svg";
import logoLight from "../assets/logo-light.svg";

const STORAGE_KEY = "chat-conversations";
const ACTIVE_KEY = "chat-active-conversation";

const ALL_SUGGESTIONS = [
  "Have we sold Human IL-6 ELISA Kit before?",
  "Was BIO-ELI-150 offered before?",
  "Have we ever quoted PCR Plate 96-Well Skirted?",
  "Have we sold an ELISA kit for human interleukin 6?",
  "Did we ever offer a 96-well PCR plate?",
  "Have we sold a nucleic acid extraction platform?",
  "Do we have any history for SKU BIO-PCR-101?",
  "Was BIO-MOL-210 ever quoted?",
  "Find all offers containing BIO-PLA-096.",
  "Which products from Gilson have been offered?",
  "Have we sold any PerkinElmer products?",
  "Show me offers with products from Musterfirma Lab.",
  "Was NeuroDetect X200 Analysis Kit offered in 2024?",
  "Which products were offered in 2021?",
  "Have we quoted ViralDetect Pro 384 Kit after 2023?",
  "What quantity of Human IL-6 ELISA Kit was offered in MF-2021-0001?",
  "What was the unit price for Automated PurePrep 96 Extraction System in offer MF-2021-0001?",
  "What was the total offer amount in MF-2021-0002?",
  "Have we sold Apple MacBook Pro before?",
  "Have we offered Tesla Model 3 batteries?",
  "Was BIO-XYZ-999 ever quoted?",
  "Have we sold Human IL6 Elisa Kitt?",
  "Do we have anything like Quant Studio PCR platform?",
  "Have we quoted nasopharyngeal swab kits?",
  "Have we sold PCR kits?",
  "Which extraction kits have we offered?",
  "Do we have products for pathogen detection?",
  "Have we sold Real-Time PCR SARS-CoV-2 Kit before? Answer only with source PDF, offer number, SKU and quote date.",
  "List all evidence for StemGrow Plus Cell Culture Reagent and include offer numbers.",
  "Find all offers containing PCR Plate 96-Well Skirted.",
  "Have we offered products from PerkinElmer?",
  "Have we sold BIO-XYZ-999 before?",
];

function pickRandomSuggestions(): string[] {
  const shuffled = [...ALL_SUGGESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function loadConversations(): Conversation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveConversations(conversations: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

function getInitialTheme(): "light" | "dark" {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function generateTitle(text: string): string {
  return text.length > 30 ? text.slice(0, 30) + "…" : text;
}

export function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => localStorage.getItem("sidebar-open") === "true"
  );
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const [suggestions] = useState<string[]>(pickRandomSuggestions);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;
  const messages = useMemo(() => activeConversation?.messages ?? [], [activeConversation]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("sidebar-open", String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (activeId) {
      localStorage.setItem(ACTIVE_KEY, activeId);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }, [activeId]);

  const updateMessages = useCallback((convId: string, updater: (msgs: Message[]) => Message[]) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, messages: updater(c.messages), updatedAt: Date.now() } : c
      )
    );
  }, []);

  async function streamResponse(convId: string, assistantId: string, messagesForContext: Message[]) {
    const lastUserMsg = messagesForContext.filter((m) => m.role === "user").pop();
    const text = lastUserMsg?.content || "";
    const responseText = await getResponse(text, messagesForContext);

    const chunkSize = 8;
    for (let i = 0; i < responseText.length; i += chunkSize) {
      const chunk = responseText.slice(0, i + chunkSize);
      updateMessages(convId, (msgs) =>
        msgs.map((m) => (m.id === assistantId ? { ...m, content: chunk } : m))
      );
      await new Promise((r) => setTimeout(r, 10));
    }

    updateMessages(convId, (msgs) =>
      msgs.map((m) =>
        m.id === assistantId ? { ...m, content: responseText } : m
      )
    );
    setIsStreaming(false);
  }

  async function handleSend(text: string) {
    const now = Date.now();
    const userMessage: Message = {
      id: `user-${now}`,
      role: "user",
      content: text,
      timestamp: now,
    };

    let convId = activeId;

    if (!convId) {
      // Create new conversation
      convId = `conv-${now}`;
      const newConv: Conversation = {
        id: convId,
        title: generateTitle(text),
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(convId);
    }

    const assistantId = `assistant-${now}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: now,
    };

    updateMessages(convId, (msgs) => [...msgs, userMessage, assistantMessage]);
    setIsStreaming(true);

    const contextMessages = [...messages, userMessage];
    await streamResponse(convId, assistantId, contextMessages);
  }

  async function handleEdit(messageId: string, newContent: string) {
    if (!activeId) return;

    // Find the message index and truncate everything after it
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const now = Date.now();
    const editedMessage: Message = {
      ...messages[msgIndex],
      content: newContent,
      timestamp: now,
    };

    const truncated = [...messages.slice(0, msgIndex), editedMessage];
    const assistantId = `assistant-${now}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: now,
    };

    updateMessages(activeId, () => [...truncated, assistantMessage]);
    setIsStreaming(true);

    await streamResponse(activeId, assistantId, truncated);
  }

  async function handleRegenerate(messageId: string) {
    if (!activeId) return;

    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const now = Date.now();
    const assistantId = `assistant-${now}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: now,
    };

    // Keep everything before this assistant message
    const contextMessages = messages.slice(0, msgIndex);
    updateMessages(activeId, () => [...contextMessages, assistantMessage]);
    setIsStreaming(true);

    await streamResponse(activeId, assistantId, contextMessages);
  }

  function handleNewChat() {
    setActiveId(null);
    setSidebarOpen(false);
  }

  function handleSelectConversation(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
  }

  function handleDeleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  const lastAssistantIndex = messages.length - 1;
  const lastAssistantId = messages[lastAssistantIndex]?.role === "assistant"
    ? messages[lastAssistantIndex].id
    : null;

  return (
    <div className="chat-layout">
      {/* Sidebar overlay for closing on mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <nav
        className={`chat-sidebar ${sidebarOpen ? "open" : ""}`}
        aria-label="Conversation history"
        role="navigation"
      >
        <div className="sidebar-header">
          {sidebarOpen ? (
            <>
              <div className="sidebar-brand">
                <img src={theme === "dark" ? logoDark : logoLight} alt="IntelliSearch" className="sidebar-logo" />
                <span className="sidebar-brand-name">
                  <span className="brand-first">Intelli</span><span className="brand-second">Search</span>
                </span>
              </div>
              <button
                className="sidebar-close-btn"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
              </button>
            </>
          ) : (
            <button
              className="sidebar-logo-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <img src={theme === "dark" ? logoDark : logoLight} alt="IntelliSearch" className="sidebar-logo sidebar-logo-default" />
              <svg className="sidebar-logo-hover" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
          )}
        </div>
        {sidebarOpen && (
          <>
            <div className="sidebar-new-chat">
              <button className="new-chat-btn" onClick={handleNewChat} aria-label="Start new conversation">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                New chat
              </button>
            </div>
            <ul className="sidebar-list" role="list">
              {conversations.length > 0 && (
                <li className="sidebar-section-label">Recent</li>
              )}
              {conversations.map((conv) => (
                <li
                  key={conv.id}
                  className={`sidebar-item ${conv.id === activeId ? "active" : ""}`}
                  onClick={() => handleSelectConversation(conv.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSelectConversation(conv.id); }}
                  role="button"
                  tabIndex={0}
                  aria-current={conv.id === activeId ? "true" : undefined}
                  aria-label={`Conversation: ${conv.title}`}
                >
                  <span className="sidebar-item-title">{conv.title}</span>
                  <button
                    className="sidebar-item-delete"
                    onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                    aria-label={`Delete conversation: ${conv.title}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </li>
              ))}
              {conversations.length === 0 && (
                <li className="sidebar-empty" role="listitem">No conversations yet</li>
              )}
            </ul>
          </>
        )}
      </nav>

      {/* Main chat */}
      <main className="chat-container" aria-label="Chat">
        <header className="chat-header">
          <div className="chat-header-left">
            <h1>{activeConversation?.title || ""}</h1>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </header>
        <div
          className="chat-messages"
          role="log"
          aria-label="Messages"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onEdit={handleEdit}
              onRegenerate={handleRegenerate}
              isLast={msg.id === lastAssistantId}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className={`chat-input-section ${messages.length === 0 ? "chat-input-section--centered" : ""}`}>
          {messages.length === 0 && <h2 className="chat-greeting">What can I help with?</h2>}
          <ChatInput onSend={handleSend} disabled={isStreaming} />
          {messages.length === 0 && (
            <div className="chat-suggestions" role="group" aria-label="Suggested questions">
              {suggestions.map((q) => (
                <button key={q} onClick={() => handleSend(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Screen reader announcements */}
        <div aria-live="assertive" className="sr-only">
          {isStreaming ? "Assistant is typing..." : ""}
        </div>
      </main>
    </div>
  );
}
