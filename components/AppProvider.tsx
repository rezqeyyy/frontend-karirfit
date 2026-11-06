"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, API_URL } from "@/lib/api";
import { DICTS, type Dict } from "@/lib/i18n";
import type { Answers, Career, Health, Lang, Model, Profile } from "@/lib/types";

const EMPTY: Answers = { interests: [], skills: {}, experience: "", expSkills: [], expPhrases: {}, courses: {}, target: "", consent: false };
const KEY = "karirfit:v1";

function readStore<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(`${KEY}:${key}`); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function writeStore(key: string, value: unknown) {
  try { localStorage.setItem(`${KEY}:${key}`, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

interface Ctx {
  lang: Lang; setLang: (l: Lang) => void; t: Dict;
  model: Model | null; modelError: string | null; reloadModel: () => void; waking: boolean;
  health: Health | null;
  answers: Answers; update: (patch: Partial<Answers> | ((a: Answers) => Partial<Answers>)) => void; reset: () => void;
  hydrated: boolean; session: string;
  profile: Profile;
  careerName: (c: Pick<Career, "name_en" | "name_id">) => string;
  skillName: (id: string) => string;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState("anon");
  const [model, setModel] = useState<Model | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [waking, setWaking] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);

  // restore from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    setLangState(readStore<Lang>("lang", "id"));
    setAnswers({ ...EMPTY, ...readStore<Partial<Answers>>("answers", {}) });
    let s = readStore<string>("session", "");
    if (!s) { s = Math.random().toString(36).slice(2, 10); writeStore("session", s); }
    setSession(s);
    setHydrated(true);
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const loadModel = useCallback(() => {
    // A sleeping free-tier backend (e.g. Render) needs up to ~1 minute to wake up and may fail the
    // first requests: show a notice after 4 s and retry every 10 s for about 2 minutes.
    setModelError(null);
    let cancelled = false;
    const timer = setTimeout(() => !cancelled && setWaking(true), 4000);
    const attempt = (n: number) => {
      api.model()
        .then(m => {
          if (cancelled) return;
          setModel(m); setWaking(false); clearTimeout(timer);
          api.health().then(h => !cancelled && setHealth(h)).catch(() => {});
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          if (n < 12) { setWaking(true); setTimeout(() => attempt(n + 1), 10000); return; }
          clearTimeout(timer); setWaking(false);
          setModelError(e instanceof ApiError ? e.message : String(e));
        });
    };
    attempt(1);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);
  useEffect(() => loadModel(), [loadModel]);

  const setLang = useCallback((l: Lang) => { setLangState(l); writeStore("lang", l); }, []);
  const update = useCallback<Ctx["update"]>(patch => {
    setAnswers(prev => {
      const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
      writeStore("answers", next);
      return next;
    });
  }, []);
  const reset = useCallback(() => { setAnswers(EMPTY); writeStore("answers", EMPTY); }, []);

  const value = useMemo<Ctx>(() => {
    const skillNames = Object.fromEntries((model?.skills ?? []).map(s => [s.id, s.name]));
    return {
      lang, setLang, t: DICTS[lang],
      model, modelError: modelError && DICTS[lang].err_server(API_URL), reloadModel: loadModel, waking, health,
      answers, update, reset, hydrated, session,
      profile: {
        courses: answers.courses, skills: answers.skills, experience_skills: answers.expSkills,
        interests: answers.interests, target_career: answers.target || null,
      },
      careerName: c => (lang === "id" ? c.name_id : c.name_en),
      skillName: id => skillNames[id] ?? id,
    };
  }, [lang, setLang, model, modelError, loadModel, waking, health, answers, update, reset, hydrated, session]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
