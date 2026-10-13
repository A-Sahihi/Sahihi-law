/**
 * @license
 * انواع داده‌های سامانه حقوقی هوشمند ایران و پایگاه دانش RAG
 */

export type ValidityStatus = 'in_force' | 'amended' | 'repealed';

export interface LegalArticle {
  id: string;
  lawId: string;
  lawTitle: string;
  category: string;
  articleNumber: string;
  title: string;
  content: string;
  notes?: string[];
  approvalDate: string;
  effectiveDate?: string;
  validityStatus: ValidityStatus;
  validityStatusLabel: string;
  officialSource: string;
  officialUrl: string;
  lastVerifiedDate: string;
  keywords: string[];
}

export interface CaseContext {
  userName: string;
  personType: 'حقیقی' | 'حقوقی' | string;
  legalCategory: {
    id: string;
    title: string;
    desc: string;
  } | null;
  formAnswers: Record<string, string>;
  caseSummary: string;
}

export interface RetrievalResult {
  article: LegalArticle;
  relevanceScore: number;
  matchedKeywords: string[];
}

export interface VerifiedCitation {
  articleId: string;
  lawTitle: string;
  articleNumber: string;
  status: 'verified' | 'partially_verified' | 'unverified';
  statusLabel: string;
  officialUrl: string;
  excerpt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: LegalArticle[];
  citations?: VerifiedCitation[];
  confidence?: 'high' | 'medium' | 'preliminary';
}

export interface ChatSession {
  sessionId: string;
  createdAt: number;
  lastActiveAt: number;
  caseContext: CaseContext;
  messages: ChatMessage[];
}

export interface IngestDocumentPayload {
  lawTitle: string;
  category: string;
  articles: Array<{
    articleNumber: string;
    title: string;
    content: string;
    notes?: string[];
    approvalDate: string;
    effectiveDate?: string;
    validityStatus?: ValidityStatus;
    officialSource?: string;
    officialUrl: string;
    keywords?: string[];
  }>;
}
