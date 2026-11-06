"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { ServerError } from "@/components/Header";

export default function Home() {
  const { t, model, answers, hydrated } = useApp();
  const started = hydrated && answers.interests.length > 0;
  return (
    <section className="intro">
      <h1>{t.hero_title}</h1>
      <p className="lead">{t.hero_lead}</p>
      <ServerError />
      <div className="intro-actions">
        <Link className="btn primary big" href="/tes">{started ? t.continue_test : t.start}</Link>
      </div>
      <ul className="facts">
        <li><strong>{model?.careers.length ?? 15}</strong><span>{t.fact_careers}</span></li>
        <li><strong>{model?.skills.length ?? "…"}</strong><span>{t.fact_skills}</span></li>
        <li><strong>5</strong><span>{t.fact_minutes}</span></li>
      </ul>
      <p className="fine">{t.hero_fine}</p>
    </section>
  );
}
