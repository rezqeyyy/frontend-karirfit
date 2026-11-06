"use client";

import Link from "next/link";
import { useApp } from "./AppProvider";
import type { Lang } from "@/lib/types";

export function Header() {
  const { lang, setLang, user, signOut, t } = useApp();
  return (
    <header className="top">
      <Link className="brand" href="/" aria-label="KarirFit">Karir<b>Fit</b></Link>
      <nav className="top-nav">
        {user ? (
          <>
            <span className="who">{t.hello(user.name || user.email)}</span>
            <Link href="/riwayat">{t.nav_history}</Link>
            <button className="linkbtn" onClick={() => signOut()}>{t.nav_logout}</button>
          </>
        ) : <Link href="/masuk">{t.nav_login}</Link>}
        <div className="lang" role="group" aria-label="Language">
          {(["id", "en"] as Lang[]).map(l => (
            <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
          ))}
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  const { t } = useApp();
  return <footer className="foot"><p>{t.footer}</p></footer>;
}

export function ServerError() {
  const { modelError, reloadModel, waking, t } = useApp();
  if (waking) return <p className="notice" role="status">{t.waking}</p>;
  if (!modelError) return null;
  return (
    <div className="notice error" role="alert">
      <p>{modelError}</p>
      <button className="btn" onClick={reloadModel}>{t.retry}</button>
    </div>
  );
}
