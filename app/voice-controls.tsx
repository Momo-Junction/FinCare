"use client";

import { useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export default function VoiceControls({ open, pending, answer, onTranscript }: {
  open: boolean; pending: boolean; answer?: string; onTranscript: (text: string) => void;
}) {
  const [microphone, setMicrophone] = useState<"idle" | "starting" | "listening" | "stopping">("idle");
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState("");
  const [canSpeak, setCanSpeak] = useState(false);
  const activeRecognition = useRef<Recognition | null>(null);
  const activeSpeech = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setCanSpeak("speechSynthesis" in window);
    setMicrophone("idle");
    setSpeaking(false);
    return () => {
      const recognition = activeRecognition.current;
      if (recognition) {
        recognition.onresult = recognition.onerror = recognition.onend = recognition.onstart = null;
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
      if (microphone === "starting") activeRecognition.current.abort();
      else activeRecognition.current.stop();
      setMicrophone("stopping");
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
    recognition.onstart = () => setMicrophone("listening");
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript.trim();
      if (transcript) {
        onTranscript(transcript);
        setNotice("Check the text before sending.");
      }
    };
    recognition.onerror = ({ error }) => {
      if (error === "aborted") return;
      if (error === "not-allowed" || error === "service-not-allowed") {
        setNotice("Allow microphone access in your browser or type your question.");
      } else if (error === "audio-capture") {
        setNotice("No microphone was found. Check your device or type your question.");
      } else if (error === "network") {
        setNotice("The browser’s dictation service couldn’t connect. Try again or type your question.");
      } else {
        setNotice("I couldn’t hear any words. Try again or type your question.");
      }
    };
    recognition.onend = () => {
      activeRecognition.current = null;
      setMicrophone("idle");
    };
    try {
      activeRecognition.current = recognition;
      setMicrophone("starting");
      recognition.start();
    } catch {
      activeRecognition.current = null;
      setMicrophone("idle");
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
      <button type="button" className="min-h-11 px-1 py-1 text-blue-800" disabled={pending || speaking || microphone === "stopping"} onClick={dictate}>
        {microphone === "idle" ? "Use microphone" : microphone === "starting" ? "Cancel microphone" : "Stop listening"}
      </button>
      {canSpeak && answer && <button type="button" className="min-h-11 px-1 py-1 text-blue-800" disabled={pending || microphone !== "idle"} onClick={readAnswer}>
        {speaking ? "Stop reading" : "Read last answer"}
      </button>}
    </div>
    <p role="status">{notice || ({
      idle: "", starting: "Waiting for the microphone…", listening: "Listening in English…", stopping: "Finishing dictation…",
    })[microphone]}</p>
  </div>;
}
