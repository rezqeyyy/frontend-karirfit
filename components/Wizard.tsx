"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Grade, Level } from "@/lib/types";
import { useApp } from "./AppProvider";
import { ServerError } from "./Header";

const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];
const GRADES: Grade[] = ["A", "B", "C", "D", "E"];

export function Wizard() {
  const { t, model, answers } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [warn, setWarn] = useState(false);

  const goto = (n: number) => {
    if (n > 1 && !answers.interests.length) { setWarn(true); return; }
    setWarn(false); setStep(n); window.scrollTo({ top: 0 });
  };
  const next = () => (step < 5 ? goto(step + 1) : answers.interests.length ? router.push("/hasil") : setWarn(true));

  if (!model) return <ServerError />;

  return (
    <section className="wizard">
      <ol className="progress" aria-label="Steps">
        {t.steps.map((name, i) => {
          const n = i + 1;
          return (
            <li key={n} className={n < step ? "done" : n === step ? "now" : ""} aria-current={n === step ? "step" : undefined}>
              <button onClick={() => goto(n)}><b>{n}</b><span>{name}</span></button>
            </li>
          );
        })}
      </ol>

      {step === 1 && <StepInterests />}
      {step === 2 && <StepSkills />}
      {step === 3 && <StepExperience />}
      {step === 4 && <StepCourses />}
      {step === 5 && <StepSummary />}

      {warn && <p className="notice" role="alert">{t.need_interest}</p>}

      <nav className="wiz-nav">
        <button className="btn ghost" style={{ visibility: step === 1 ? "hidden" : "visible" }} onClick={() => goto(step - 1)}>{t.back}</button>
        <button className="btn primary" onClick={next}>{step === 5 ? t.see : t.next}</button>
      </nav>
    </section>
  );
}

function StepHead({ title, hint }: { title: string; hint: string }) {
  return (<><h2>{title}</h2><p className="hint">{hint}</p></>);
}

function StepInterests() {
  const { t, model, answers, update, careerName, lang } = useApp();
  const careers = Object.fromEntries(model!.careers.map(c => [c.id, c]));
  const toggle = (id: string) => update(a => ({
    interests: a.interests.includes(id) ? a.interests.filter(x => x !== id) : a.interests.length < 3 ? [...a.interests, id] : a.interests,
  }));
  return (
    <div className="step">
      <StepHead title={t.s1_title} hint={t.s1_hint} />
      <div className="chips interests">
        {model!.interests.map(i => (
          <button key={i.id} className="chip" aria-pressed={answers.interests.includes(i.id)} onClick={() => toggle(i.id)}>
            {lang === "id" ? i.name_id : i.name_en}
            <small>{i.careers.map(c => careerName(careers[c])).join(", ")}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepSkills() {
  const { t, model, answers, update } = useApp();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const cats = useMemo(() => ["all", ...new Set(model!.skills.map(s => s.category))], [model]);
  const list = model!.skills.filter(s => (cat === "all" || s.category === cat) && (!q || s.name.toLowerCase().includes(q.toLowerCase())));
  const setLevel = (id: string, l: Level) => update(a => {
    const skills = { ...a.skills };
    if (skills[id] === l) delete skills[id]; else skills[id] = l;
    return { skills };
  });
  return (
    <div className="step">
      <StepHead title={t.s2_title} hint={t.s2_hint} />
      <div className="skill-tools">
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t.s2_search} aria-label={t.s2_search} />
        <div className="cats" role="tablist">
          {cats.map(c => (
            <button key={c} role="tab" aria-selected={c === cat} onClick={() => setCat(c)}>{c === "all" ? t.all : c}</button>
          ))}
        </div>
      </div>
      <div className="skill-list">
        {list.map(s => {
          const lv = answers.skills[s.id];
          return (
            <div key={s.id} className={"skill" + (lv ? " on" : "")}>
              <span className="nm">{s.name}</span>
              <div className="levels" role="group" aria-label={s.name}>
                {LEVELS.map(l => (
                  <button key={l} aria-pressed={lv === l} onClick={() => setLevel(s.id, l)}>{t.lv[l]}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="picked">{t.picked(Object.keys(answers.skills).length)}</p>
    </div>
  );
}

function StepExperience() {
  const { t, answers, update, skillName } = useApp();
  const [busy, setBusy] = useState(false);
  const [via, setVia] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const extract = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api.extractSkills(answers.experience);
      update({ expSkills: [...new Set(r.skills.map(s => s.skill))], expPhrases: Object.fromEntries(r.skills.map(s => [s.skill, s.phrase])) });
      setVia(r.model);
    } catch (e) {
      setErr(String((e as Error).message));
    } finally { setBusy(false); }
  };
  const remove = (id: string) => update(a => ({ expSkills: a.expSkills.filter(x => x !== id) }));

  return (
    <div className="step">
      <StepHead title={t.s3_title} hint={t.s3_hint} />
      <textarea rows={6} maxLength={1500} value={answers.experience} placeholder={t.s3_placeholder}
        aria-label={t.s3_title} onChange={e => update({ experience: e.target.value })} />
      <div className="row">
        <span className="counter">{answers.experience.length}/1500</span>
        <button className="btn" onClick={extract} disabled={busy || !answers.experience.trim()}>{busy ? t.s3_extracting : t.s3_extract}</button>
      </div>
      {err && <p className="notice error">{err}</p>}
      {answers.expSkills.length > 0 ? (
        <div className="found">
          <h4>{t.s3_found}</h4>
          <p className="hint small">{t.s3_confirm}</p>
          <div className="chips">
            {answers.expSkills.map(id => (
              <button key={id} className="chip" aria-pressed="true" onClick={() => remove(id)}>
                {skillName(id)} ×
                {answers.expPhrases[id] && <q>{answers.expPhrases[id]}</q>}
              </button>
            ))}
          </div>
          {via && <p className="meta">{t.s3_via(via)}</p>}
        </div>
      ) : via && <p className="notice">{t.s3_none}</p>}
    </div>
  );
}

function StepCourses() {
  const { t, model, answers, update, lang } = useApp();
  const setGrade = (id: string, g: string) => update(a => {
    const courses = { ...a.courses };
    if (g) courses[id] = g as Grade; else delete courses[id];
    return { courses };
  });
  return (
    <div className="step">
      <StepHead title={t.s4_title} hint={t.s4_hint} />
      <div className="courses">
        {model!.courses.map(c => {
          const name = lang === "id" ? c.name_id : c.name_en, g = answers.courses[c.id] ?? "";
          return (
            <label key={c.id} className={"course" + (g ? " on" : "")}>
              <span>{name}</span>
              <select value={g} onChange={e => setGrade(c.id, e.target.value)} aria-label={name}>
                <option value="">{t.grade_none}</option>
                {GRADES.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function StepSummary() {
  const { t, model, answers, update, careerName, skillName, lang } = useApp();
  const join = (a: string[]) => (a.length ? a.join(", ") : t.empty);
  const interests = model!.interests.filter(i => answers.interests.includes(i.id)).map(i => (lang === "id" ? i.name_id : i.name_en));
  const courses = model!.courses.filter(c => answers.courses[c.id]).map(c => `${lang === "id" ? c.name_id : c.name_en} (${answers.courses[c.id]})`);
  return (
    <div className="step">
      <StepHead title={t.s5_title} hint={t.s5_hint} />
      <label className="field">
        <span>{t.s5_target}</span>
        <select value={answers.target} onChange={e => update({ target: e.target.value })}>
          <option value="">{t.none}</option>
          {model!.careers.map(c => <option key={c.id} value={c.id}>{careerName(c)}</option>)}
        </select>
      </label>
      <div className="summary">
        <dl>
          <dt>{t.sum_interests}</dt><dd>{join(interests)}</dd>
          <dt>{t.sum_skills}</dt><dd>{join(Object.entries(answers.skills).map(([s, l]) => `${skillName(s)} (${t.lv[l]})`))}</dd>
          <dt>{t.sum_exp}</dt><dd>{join(answers.expSkills.map(skillName))}</dd>
          <dt>{t.sum_courses}</dt><dd>{join(courses)}</dd>
        </dl>
      </div>
      <label className="consent">
        <input type="checkbox" checked={answers.consent} onChange={e => update({ consent: e.target.checked })} />
        <span>{t.consent}</span>
      </label>
    </div>
  );
}
