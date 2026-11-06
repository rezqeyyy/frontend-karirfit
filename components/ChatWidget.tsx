"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { ChatTurn } from "@/lib/types";
import { useApp } from "./AppProvider";

const KEY = "karirfit:v1:chat";

/** Floating career assistant (Groq via FastAPI /api/chat). It receives the user's answers and the
 *  career they are looking at, so its answers are grounded in their computed results. */
export function ChatWidget({ career }: { career: string | null }) {
  const { t, lang, profile, session, consent, health } = useApp();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { try { setTurns(JSON.parse(sessionStorage.getItem(KEY) || "[]")); } catch { /* ignore */ } }, []);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(turns.slice(-30))); } catch { /* ignore */ }
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, open]);

  if (health && health.chat === false) return null;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next: ChatTurn[] = [...turns, { role: "user", content: q }];
    setTurns(next); setInput(""); setBusy(true); setErr(null);
    try {
      const r = await api.chat(next, profile, career, lang, session, consent);
      setTurns([...next, { role: "assistant", content: r.reply }]);
    } catch (e) {
      setErr(t.chat_error + (e as Error).message);
    }
    setBusy(false);
  };
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); send(input); };

  if (!open) {
    return <button className="chat-fab" onClick={() => setOpen(true)} aria-label={t.chat_open}>💬 {t.chat_open}</button>;
  }
  return (
    <aside className="chat" aria-label={t.chat_title}>
      <header>
        <strong>{t.chat_title}</strong>
        <button className="linkbtn" onClick={() => setOpen(false)}>{t.chat_close}</button>
      </header>
      <div className="chat-body">
        {turns.length === 0 && (
          <div className="chat-empty">
            <p>{t.chat_intro}</p>
            {t.chat_suggestions.map(sug => <button key={sug} className="chip" onClick={() => send(sug)}>{sug}</button>)}
          </div>
        )}
        {turns.map((m, i) => <div key={i} className={"msg " + m.role}>{m.content}</div>)}
        {busy && <div className="msg assistant pending">{t.chat_thinking}</div>}
        {err && <p className="notice error">{err}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={t.chat_placeholder} maxLength={1000} aria-label={t.chat_placeholder} />
        <button className="btn primary" disabled={busy || !input.trim()}>{t.chat_send}</button>
      </form>
      <p className="fine">{t.chat_disclaimer}</p>
    </aside>
  );
}
