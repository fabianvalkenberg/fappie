"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type Mode = "email" | "calendar";

export default function AppPage() {
  const [mode, setMode] = useState<Mode>("email");
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setResult("");
    setCopied(false);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, notes, mode }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data.result);
    } else {
      setResult("Er is een fout opgetreden. Probeer opnieuw.");
    }
    setLoading(false);
  };

  const handleCopyOutput = async () => {
    if (!result) return;

    // Convert plain text to HTML with Aptos 12px for Outlook compatibility
    const htmlContent = result
      .split("\n")
      .map((line) =>
        line.trim() === ""
          ? '<p style="font-family: Aptos, Calibri, sans-serif; font-size: 12pt; margin: 0;">&nbsp;</p>'
          : `<p style="font-family: Aptos, Calibri, sans-serif; font-size: 12pt; margin: 0;">${line}</p>`
      )
      .join("");

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([htmlContent], { type: "text/html" }),
          "text/plain": new Blob([result], { type: "text/plain" }),
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback to plain text copy
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with mode switch */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Fappie</h1>
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setMode("email")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "email"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              E-mail
            </button>
            <button
              onClick={() => setMode("calendar")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "calendar"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="transcript" className="mb-2 block">
                Transcript
              </Label>
              <Textarea
                id="transcript"
                placeholder="Plak hier je transcript..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="min-h-[300px] resize-y"
              />
            </div>
            <div>
              <Label htmlFor="notes" className="mb-2 block">
                Extra opmerkingen{" "}
                <span className="text-muted-foreground font-normal">
                  (optioneel)
                </span>
              </Label>
              <Textarea
                id="notes"
                placeholder="Eventuele extra instructies of opmerkingen..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] resize-y"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading || !transcript.trim()}
              className="w-full"
            >
              {loading
                ? "Genereren..."
                : mode === "email"
                  ? "Genereer e-mail"
                  : "Genereer agenda-uitnodiging"}
            </Button>
          </div>

          {/* Right: Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Resultaat</Label>
              {result && (
                <span className="text-sm text-muted-foreground">
                  {copied ? "Gekopieerd!" : "Klik om te kopiëren"}
                </span>
              )}
            </div>
            <Card
              className={`min-h-[440px] cursor-pointer transition-colors ${
                result
                  ? "hover:border-primary/50"
                  : "border-dashed"
              } ${copied ? "border-green-500" : ""}`}
              onClick={handleCopyOutput}
            >
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="text-muted-foreground">Genereren...</div>
                  </div>
                ) : result ? (
                  <div
                    ref={outputRef}
                    className="whitespace-pre-wrap"
                    style={{
                      fontFamily: "Aptos, Calibri, sans-serif",
                      fontSize: "12pt",
                      lineHeight: "1.5",
                    }}
                  >
                    {result}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <p className="text-muted-foreground text-sm">
                      Het resultaat verschijnt hier...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
