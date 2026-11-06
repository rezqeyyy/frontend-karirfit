"use client";

import { useApp } from "@/components/AppProvider";
import { ServerError } from "@/components/Header";
import { Results } from "@/components/Results";

export default function ResultsPage() {
  const { hydrated, model } = useApp();
  if (!hydrated) return null;
  if (!model) return <ServerError />;
  return <Results />;
}
