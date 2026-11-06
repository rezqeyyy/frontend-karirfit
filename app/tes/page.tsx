"use client";

import { useApp } from "@/components/AppProvider";
import { Wizard } from "@/components/Wizard";

export default function TestPage() {
  const { hydrated } = useApp();
  // wait for saved answers to load so the wizard does not flash empty
  return hydrated ? <Wizard /> : null;
}
