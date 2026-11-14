"use client";

import { useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};

export default function VoiceControls({ open, pending, answer, onTranscript }: {
  open: boolean; pending: boolean; answer?: string; onTranscript: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState("");
  const [canSpeak, setCanSpeak] = useState(false);
  const activeRecognition = useRef<Recognition | null>(null);
  const activeSpeech = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setCanSpeak("speechSynthesis" in window);
    setListening(false);
    setSpeaking(false);
    return () => {
      const recognition = activeRecognition.current;
      if (recognition) {
        recognition.onresult = recognition.onerror = recognition.onend = null;
        recognition.abort();
        activeRecognition.current = null;
      }
      if (activeSpeech.current) {
        activeSpeech.current.onend = activeSpeech.current.onerror = null;
        window.speechSynthesis.cancel();
        activeSpeech.current = null;
      }
    };
  }, [open, pending, answer]);

  function dictate() {
    setNotice("");
    if (activeRecognition.current) {
      activeRecognition.current.abort();
      return;
    }
    const browser = window as Window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const SpeechRecognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice("This browser doesn’t support dictation. You can type your question.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-GB";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript.trim();
      if (transcript) onTranscript(transcript);
    };
    recognition.onerror = ({ error }) => {
      if (error !== "aborted") setNotice(error === "not-allowed"
        ? "Allow microphone access or type your question."
        : "I couldn’t hear that. Try again or type your question.");
    };
    recognition.onend = () => {
      activeRecognition.current = null;
      setListening(false);
    };
    try {
      recognition.start();
      activeRecognition.current = recognition;
      setListening(true);
    } catch {
      setNotice("The microphone couldn’t start. You can type your question.");
    }
  }

  function readAnswer() {
    if (activeSpeech.current) {
      window.speechSynthesis.cancel();
      activeSpeech.current = null;
      setSpeaking(false);
      return;
    }
    if (!answer) return;
    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.lang = "en-GB";
    utterance.rate = 0.95;
    utterance.onend = utterance.onerror = () => {
      if (activeSpeech.current !== utterance) return;
      activeSpeech.current = null;
      setSpeaking(false);
    };
    activeSpeech.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return <div className="mt-2 text-xs text-slate-600">
    <div className="flex flex-wrap gap-x-4">
      <button type="button" className="min-h-11 px-1 py-1 text-blue-800" disabled={pending || speaking} onClick={dictate}>
        {listening ? "Stop listening" : "Use microphone"}
      </button>
      {canSpeak && answer && <button type="button" className="min-h-11 px-1 py-1 text-blue-800" disabled={pending || listening} onClick={readAnswer}>
        {speaking ? "Stop reading" : "Read last answer"}
      </button>}
    </div>
    <p role="status">{listening ? "Listening in English. Review the text before sending." : notice}</p>
  </div>;
}
