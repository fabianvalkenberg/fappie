"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

      // Store the full JSON response as the assistant message for API context
      const fullResponse = JSON.stringify({
        title: data.title,
        body: data.body,
        chat: data.chat,
      });
      setApiMessages([
        ...newApiMessages,
        { role: "assistant", content: fullResponse },
      ]);

      // Show chat message in the conversation
      if (data.chat) {
        setChatMessages([
          ...newChatMessages,
          { role: "assistant", content: data.chat },
        ]);
      }

      // Update the output panel
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="ml-2"
              >
                Nieuw gesprek
              </Button>
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
          {/* Left: Chat */}
          <div className="flex flex-col h-full min-h-0">
            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl p-4 mb-3 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-muted-foreground text-sm text-center mt-8">
                  Plak een transcript om te beginnen...
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-white text-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-3 py-2 text-sm text-muted-foreground">
                    Genereren...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 flex gap-2">
              <Textarea
                ref={textareaRef}
                placeholder={
                  chatMessages.length === 0
                    ? "Plak hier je transcript..."
                    : "Typ een opmerking of antwoord..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px] max-h-[200px] resize-none rounded-2xl"
                rows={3}
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="shrink-0 self-end rounded-2xl"
              >
                Verstuur
              </Button>
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
