"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { pct } from "@/lib/i18n";
import type { CareerResult, ExplainResponse, RecommendResponse } from "@/lib/types";
import { useApp } from "./AppProvider";

export function Results() {
  const { t, answers, profile, session, model } = useApp();
  const [data, setData] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const profileKey = JSON.stringify(profile);
  useEffect(() => {
    if (!answers.interests.length) return;
    let alive = true;
    setError(null);
    api.recommend(profile, session, answers.consent)
      .then(r => {
        if (!alive) return;
        setData(r);
        setCurrent(c => c ?? (answers.target || r.primary[0]?.career || null));
      })
      .catch(e => alive && setError(String((e as Error).message)));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey, session]);

  if (!answers.interests.length) {
    return (
      <section className="empty">
        <p>{t.r_empty}</p>
        <Link className="btn primary" href="/tes">{t.start}</Link>
      </section>
    );
  }
  if (error) return <p className="notice error" role="alert">{error}</p>;
  if (!data) return <p className="loading">{t.r_loading}</p>;

  const all = data.all ?? [...data.primary, ...data.alternative];
  const selected = all.find(r => r.career === current) ?? data.primary[0];

  return (
    <section className="results">
      <div className="res-head">
        <h2>{t.r_title}</h2>
        <div className="res-actions">
          <Link className="btn ghost" href="/tes">{t.r_edit}</Link>
          <button className="btn ghost" onClick={() => setShowAll(v => !v)}>{showAll ? t.r_less : t.r_all}</button>
        </div>
      </div>

      <div className="res-grid">
        <div className="ranking">
          {showAll ? (
            <RankList title={t.r_all_title} items={all} current={selected.career} onPick={setCurrent} />
          ) : (
            <>
              <RankList title={t.r_primary} hint={t.r_primary_hint} items={data.primary} current={selected.career} onPick={setCurrent} />
              <RankList title={t.r_alt} hint={t.r_alt_hint} items={data.alternative} current={selected.career} onPick={setCurrent} />
            </>
          )}
        </div>
        <CareerDetail key={selected.career} result={selected} />
      </div>

      <details className="how">
        <summary>{t.how_title}</summary>
        <p>{t.how_p1}</p>
        <p>{t.how_p2}</p>
        <p className="fine">{String(model?.demand_source ?? "").includes("measured")
            ? t.demand_measured(model?.data_label || "job-ad data", model?.n_ads_train)
            : t.demand_seed}</p>
      </details>
    </section>
  );
}

function RankList({ title, hint, items, current, onPick }: {
  title: string; hint?: string; items: CareerResult[]; current: string; onPick: (id: string) => void;
}) {
  const { careerName } = useApp();
  return (
    <>
      <h3>{title}</h3>
      {hint && <p className="hint small">{hint}</p>}
      <ol className="rank">
        {items.map((r, i) => (
          <li key={r.career}>
            <button aria-current={r.career === current} onClick={() => onPick(r.career)}>
              <span className="pos">{i + 1}</span>
              <span className="nm">{careerName(r)}</span>
              <span className="sc">{Math.round(r.fit)}</span>
              <span className="bar"><i style={{ width: `${Math.max(2, r.fit)}%` }} /></span>
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

const RATINGS_KEY = "karirfit:v1:ratings";

function CareerDetail({ result: r }: { result: CareerResult }) {
  const { t, lang, profile, session, answers, careerName, skillName } = useApp();
  const [exp, setExp] = useState<ExplainResponse | null>(null);
  const [expErr, setExpErr] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    try { setRating((JSON.parse(localStorage.getItem(RATINGS_KEY) || "{}") as Record<string, number>)[r.career] ?? null); } catch { /* ignore */ }
  }, [r.career]);

  useEffect(() => {
    let alive = true;
    setExp(null); setExpErr(null);
    api.explain(profile, r.career, lang, session, answers.consent)
      .then(x => alive && setExp(x))
      .catch(e => alive && setExpErr(String((e as Error).message)));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.career, lang]);

  const rate = (n: number) => {
    setRating(n);
    try {
      const all = JSON.parse(localStorage.getItem(RATINGS_KEY) || "{}") as Record<string, number>;
      localStorage.setItem(RATINGS_KEY, JSON.stringify({ ...all, [r.career]: n }));
    } catch { /* ignore */ }
    api.rate(session, r.career, n).catch(() => {});
  };

  const rows = [
    ...r.matched.map(x => ({ ...x, ok: true as const })),
    ...r.gaps.map(x => ({ ...x, ok: false as const, evidence: undefined })),
  ].sort((a, b) => b.weight - a.weight);

  return (
    <article className="detail" aria-live="polite">
      {answers.target === r.career && <p className="notice">{t.target_badge}</p>}
      <h3>{careerName(r)}</h3>
      <div className="bigscore">{Math.round(r.fit)}<small> / 100</small></div>
      <div className="score-line">
        <span>{t.comp}: <strong>{pct(r.K)}</strong></span>
        <span>{t.interest}: <strong>{r.M ? t.yes : t.no}</strong></span>
      </div>

      <h4>{t.skills_tbl}</h4>
      <table className="tbl">
        <thead><tr><th>{t.th_skill}</th><th className="dem">{t.th_demand}</th><th>{t.th_status}</th></tr></thead>
        <tbody>
          {rows.map(x => (
            <tr key={x.skill}>
              <td>
                {skillName(x.skill)}
                {x.evidence && (
                  <div className="ev">
                    {t.src[x.evidence.source]}
                    {x.evidence.source === "self" ? `: ${t.lv[x.evidence.detail as keyof typeof t.lv] ?? x.evidence.detail}`
                      : x.evidence.source === "course" ? `: ${x.evidence.detail}` : ""}
                  </div>
                )}
              </td>
              <td className="dem"><span>{t.demand_of(pct(x.demand))}</span><div className="bar"><i style={{ width: `${x.demand * 100}%` }} /></div></td>
              <td><span className={"tag " + (x.ok ? "ok" : "gap")}>{x.ok ? t.have : t.gap}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4>{t.explain}</h4>
      <div className="explain">{exp ? exp.text : expErr ?? t.loading}</div>
      {exp && (
        <div className="meta">
          {exp.mode === "template" ? t.via_template : t.via_llm(exp.model)}
          {exp.notice && <div className="notice">{exp.notice}</div>}
          {exp.passages.length > 0 && (
            <div className="sources">
              <strong>{t.sources}:</strong>
              {exp.passages.map(p => <div key={p.id}>[{p.id}] {p.source}</div>)}
            </div>
          )}
        </div>
      )}

      <div className="rate">
        <span>{t.rate_q}</span>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} aria-pressed={rating === n} aria-label={String(n)} onClick={() => rate(n)}>{n}</button>
        ))}
        {rating && <span>{t.rated}</span>}
      </div>
    </article>
  );
}
