export type Lang = "id" | "en";
export type Level = "beginner" | "intermediate" | "advanced";
export type Grade = "A" | "B" | "C" | "D" | "E";

export interface Requirement { skill: string; demand: number; weight: number }
export interface Career { id: string; name_en: string; name_id: string; group: "primary" | "alternative"; requirements: Requirement[] }
export interface Interest { id: string; name_en: string; name_id: string; careers: string[] }
export interface Skill { id: string; name: string; category: string; patterns: string[] }
export interface Course { id: string; name_id: string; name_en: string; skills: string[] }

export interface Model {
  version: number;
  demand_source?: string;
  data_label?: string;
  n_ads_train?: number;
  params: { alpha: number; threshold: number; n_careers: number };
  careers: Career[];
  interests: Interest[];
  skills: Skill[];
  courses: Course[];
}

/** Profile sent to POST /api/recommend and /api/explain (backend `Profile`). */
export interface Profile {
  courses: Record<string, Grade>;
  skills: Record<string, Level>;
  experience_skills: string[];
  interests: string[];
  target_career: string | null;
}

export interface Evidence { value: number; source: "course" | "self" | "experience"; detail: string }
export interface CareerResult {
  career: string; name_en: string; name_id: string; group: "primary" | "alternative";
  fit: number; K: number; M: number; rank: number;
  matched: (Requirement & { evidence: Evidence })[];
  gaps: Requirement[];
}
export interface RecommendResponse { primary: CareerResult[]; alternative: CareerResult[]; all?: CareerResult[]; ms?: number }

export interface ExtractedSkill { skill: string; phrase: string }
export interface ExtractResponse { skills: ExtractedSkill[]; model: string }

export interface Passage { id: string; text: string; source: string; score: number }
export interface ExplainResponse {
  career: string; text: string; model: string; mode: "rag" | "llm_no_context" | "template";
  passages: Passage[]; notice?: string; prompt_version: string;
  check?: { cited: string[]; unknown_citations: string[]; supported_ratio: number | null };
}

/** Answers kept in the browser while the user fills the test. */
export interface Answers {
  interests: string[];
  skills: Record<string, Level>;
  experience: string;
  expSkills: string[];
  expPhrases: Record<string, string>;
  courses: Record<string, Grade>;
  target: string;
  consent: boolean;
}
