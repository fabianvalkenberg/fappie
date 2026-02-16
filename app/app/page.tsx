"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";

type Mode = "email" | "calendar";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface OutputData {
  title: string;
  body: string;
}

export default function AppPage() {
  const [mode, setMode] = useState<Mode>("email");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [output, setOutput] = useState<OutputData | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const newChatMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: trimmed },
    ];
    const newApiMessages = [
      ...apiMessages,
      { role: "user" as const, content: trimmed },
    ];

    setChatMessages(newChatMessages);
    setApiMessages(newApiMessages);
    setInput("");
    setLoading(true);
    setCopiedTitle(false);
    setCopiedBody(false);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newApiMessages, mode }),
    });

    if (res.ok) {
      const data = await res.json();

      const fullResponse = JSON.stringify({
        title: data.title,
        body: data.body,
        chat: data.chat,
      });
      setApiMessages([
        ...newApiMessages,
        { role: "assistant", content: fullResponse },
      ]);

      if (data.chat) {
        setChatMessages([
          ...newChatMessages,
          { role: "assistant", content: data.chat },
        ]);
      }

      if (data.title || data.body) {
        setOutput({ title: data.title, body: data.body });
      }
    } else {
      setChatMessages([
        ...newChatMessages,
        {
          role: "assistant",
          content: "Er is een fout opgetreden. Probeer opnieuw.",
        },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setChatMessages([]);
    setApiMessages([]);
    setOutput(null);
    setInput("");
    setCopiedTitle(false);
    setCopiedBody(false);
  };

  const markdownToOutlookHtml = useCallback((md: string): string => {
    const fontStyle =
      "font-family: Aptos, Calibri, sans-serif; font-size: 12pt; margin: 0; padding: 0;";

    const lines = md.split("\n");
    const htmlLines: string[] = [];

    for (const line of lines) {
      if (line.trim() === "") {
        htmlLines.push(`<p style="${fontStyle}">&nbsp;</p>`);
        continue;
      }

      let processed = line.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

      if (processed.match(/^[-*]\s/)) {
        processed = processed.replace(/^[-*]\s/, "");
        htmlLines.push(
          `<p style="${fontStyle}; padding-left: 20px;">\u2022 ${processed}</p>`
        );
      } else if (processed.match(/^\d+\.\s/)) {
        htmlLines.push(
          `<p style="${fontStyle}; padding-left: 20px;">${processed}</p>`
        );
      } else {
        htmlLines.push(`<p style="${fontStyle}">${processed}</p>`);
      }
    }

    return htmlLines.join("");
  }, []);

  const handleCopyTitle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!output?.title) return;

    try {
      await navigator.clipboard.writeText(output.title);
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyBody = async () => {
    if (!output?.body) return;

    const htmlContent = markdownToOutlookHtml(output.body);

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([htmlContent], { type: "text/html" }),
          "text/plain": new Blob([output.body], { type: "text/plain" }),
        }),
      ]);
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    } catch {
      await navigator.clipboard.writeText(output.body);
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header with logo and mode switch */}
      <div className="shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center relative">
          <div className="absolute left-4 flex items-center gap-2">
            <Image src="/logo.svg" alt="Fappie" width={80} height={27} />
            {chatMessages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="ml-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Nieuw gesprek
              </button>
            )}
          </div>
          <div className="flex bg-white/60 rounded-full p-1">
            <button
              onClick={() => {
                setMode("email");
                handleNewChat();
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                mode === "email"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              E-mail
            </button>
            <button
              onClick={() => {
                setMode("calendar");
                handleNewChat();
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                mode === "calendar"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Left: Chat (Claude-style) */}
          <div className="flex flex-col h-full min-h-0">
            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 mb-3 space-y-5">
              {chatMessages.length === 0 && (
                <p className="text-muted-foreground text-sm text-center mt-8">
                  Plak een transcript om te beginnen...
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-[#f4f0e8] rounded-3xl px-4 py-3 text-sm text-foreground">
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-foreground leading-relaxed pl-1">
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="pl-1">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input (Claude-style: textarea with send button inside) */}
            <div className="shrink-0 relative">
              <textarea
                ref={textareaRef}
                placeholder={
                  chatMessages.length === 0
                    ? "Plak hier je transcript..."
                    : "Typ een opmerking of antwoord..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full min-h-[56px] max-h-[200px] resize-none rounded-3xl border border-border bg-white px-4 py-3.5 pr-14 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                rows={1}
                style={{
                  height: "auto",
                  overflow: input.split("\n").length > 4 ? "auto" : "hidden",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height =
                    Math.min(target.scrollHeight, 200) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="absolute right-2.5 bottom-2.5 w-9 h-9 rounded-full bg-[#e07d3a] hover:bg-[#c96a2e] disabled:bg-muted disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-white"
                >
                  <path
                    d="M8 14V2M8 2L3 7M8 2L13 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: Output */}
          <div className="flex flex-col h-full min-h-0 gap-3">
            {/* Title bar */}
            {output?.title && (
              <div
                className={`shrink-0 bg-white rounded-2xl shadow-sm px-6 py-4 cursor-pointer transition-all hover:shadow-md ${
                  copiedTitle ? "ring-2 ring-green-500" : ""
                }`}
                onClick={handleCopyTitle}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className="font-semibold text-foreground"
                    style={{
                      fontFamily: "Aptos, Calibri, sans-serif",
                      fontSize: "12pt",
                    }}
                  >
                    {output.title}
                  </h2>
                  <span className="text-xs text-muted-foreground ml-3 shrink-0">
                    {copiedTitle ? "\u2705" : "kopieer titel"}
                  </span>
                </div>
              </div>
            )}

            {/* Body */}
            <div
              className={`flex-1 min-h-0 overflow-y-auto cursor-pointer transition-all bg-white rounded-2xl shadow-sm p-8 ${
                output?.body ? "hover:shadow-md" : ""
              } ${copiedBody ? "ring-2 ring-green-500" : ""}`}
              onClick={handleCopyBody}
            >
              {output?.body ? (
                <div className="relative">
                  <span className="absolute top-0 right-0 text-xs text-muted-foreground">
                    {copiedBody
                      ? "\u2705 Gekopieerd!"
                      : "Klik om te kopi\u00ebren"}
                  </span>
                  <div
                    className="prose prose-sm max-w-none"
                    style={{
                      fontFamily: "Aptos, Calibri, sans-serif",
                      fontSize: "12pt",
                      lineHeight: "1.5",
                    }}
                  >
                    <ReactMarkdown>{output.body}</ReactMarkdown>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
