export type SearchStatus = "success" | "empty" | "error";

export type SourceType = "official" | "student_experience" | "faq";

export type SearchAnswer = {
  summary: string;
  confidence: "high" | "medium" | "low";
};

export type SearchSource = {
  id: string;
  title: string;
  type: SourceType;
  site: string;
  excerpt: string;
  highlights: string[];
  url: string | null;
  score?: number;
};

export type SearchResponse = {
  status: SearchStatus;
  query: string;
  answer: SearchAnswer | null;
  sources: SearchSource[];
  relatedQuestions: string[];
  errorMessage: string | null;
};
