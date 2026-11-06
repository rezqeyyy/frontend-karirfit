import type { ExplainResponse, ExtractResponse, Lang, Model, Profile, RecommendResponse } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, body === undefined ? { cache: "no-store" } : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, `Cannot reach the server at ${API_URL}`);
  }
  if (!res.ok) throw new ApiError(res.status, `${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  model: () => request<Model>("/api/model"),
  extractSkills: (text: string) => request<ExtractResponse>("/api/extract-skills", { text }),
  recommend: (profile: Profile, session: string, consent: boolean, opts: { alpha?: number; includeAll?: boolean } = {}) =>
    request<RecommendResponse>("/api/recommend", {
      profile, session, consent, alpha: opts.alpha ?? null, include_all: opts.includeAll ?? true,
    }),
  explain: (profile: Profile, career: string, lang: Lang, session: string, consent: boolean, alpha?: number) =>
    request<ExplainResponse>("/api/explain", { profile, career, lang, session, consent, alpha: alpha ?? null }),
  rate: (session: string, career: string, rating: number) =>
    request<{ ok: boolean }>("/api/rating", { session, career, rating }),
};
