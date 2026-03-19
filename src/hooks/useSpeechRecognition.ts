"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Minimal Web Speech API typings (not always in tslib) ──────────────────────
interface SRResult {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}
interface SRResultList {
  readonly length: number;
  readonly [n: number]: SRResult;
}
interface SREvent extends Event {
  readonly resultIndex: number;
  readonly results: SRResultList;
}
interface SRErrorEvent extends Event {
  readonly error: string;
}
interface SRInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SRInstance;
    webkitSpeechRecognition?: new () => SRInstance;
  }
}

// ── Public types ──────────────────────────────────────────────────────────────
export type SpeechError =
  | "not-supported"
  | "permission-denied"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "unknown";

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  error: SpeechError | null;
  /** Start dictation. Pass current field text as prefix so it isn't erased. */
  start: (initialText?: string) => void;
  stop: () => void;
  clearError: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
/**
 * Wraps the Web Speech API for fr-FR dictation.
 * Calls `onTranscript` on every interim/final result with the full accumulated text.
 * Nothing is sent to any server — the caller decides what to do with the text.
 */
export function useSpeechRecognition(
  onTranscript: (text: string) => void
): UseSpeechRecognitionReturn {
  const [isSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<SpeechError | null>(null);

  const recognitionRef = useRef<SRInstance | null>(null);
  // Ref-based callback to avoid stale closure inside onresult
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  });

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(
    (initialText = "") => {
      if (!isSupported) {
        setError("not-supported");
        return;
      }

      // Abort any running instance first
      recognitionRef.current?.abort();
      setError(null);

      const SR = (window.SpeechRecognition || window.webkitSpeechRecognition)!;
      const recognition = new SR();
      recognition.lang = "fr-FR";
      recognition.continuous = true;
      recognition.interimResults = true;

      // Accumulates confirmed (final) transcript chunks during this session
      let accumulated = "";

      recognition.onresult = (e: SREvent) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) {
            accumulated += r[0].transcript;
          } else {
            interim += r[0].transcript;
          }
        }
        const prefix = initialText ? initialText.trimEnd() + " " : "";
        onTranscriptRef.current((prefix + accumulated + interim).trim());
      };

      recognition.onerror = (e: SRErrorEvent) => {
        const map: Record<string, SpeechError> = {
          "not-allowed": "permission-denied",
          "permission-denied": "permission-denied",
          "no-speech": "no-speech",
          "audio-capture": "audio-capture",
          network: "network",
        };
        setError(map[e.error] ?? "unknown");
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    },
    [isSupported]
  );

  const clearError = useCallback(() => setError(null), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return { isSupported, isListening, error, start, stop, clearError };
}
