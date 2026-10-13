/**
 * @license
 * موتور بازیابی اسناد حقوقی ایران (Legal RAG Retriever)
 * جست‌وجوی ترکیبی معنایی و کلیدواژه‌ای با نرمال‌سازی زبان فارسی
 */

import { LegalArticle, RetrievalResult, CaseContext } from '../types/legal.ts';
import { knowledgeBase } from './knowledgeBase.ts';

/** نرمال‌سازی نویسه‌ها و حروف عربی/فارسی */
export function normalizePersianText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u200C\u200D]/g, ' ') // نیم‌فاصله‌ها به فاصله
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ةۀ]/g, 'ه')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ی')
    .replace(/[\u064B-\u065F\u0670]/g, '') // حذف اعراب (تنوین، تشدید، حرکات)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776)) // تبدیل ارقام فارسی به انگلیسی
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)) // تبدیل ارقام عربی به انگلیسی
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?،؛«»"']/g, ' ')
    .toLowerCase()
    .trim();
}

/** استخراج کلمات کلیدی مفید (حذف ایست‌واژه‌های رایج) */
const PERSIAN_STOP_WORDS = new Set([
  'و', 'در', 'به', 'از', 'که', 'این', 'را', 'با', 'است', 'برای', 'آن', 'یک', 'خود',
  'تا', 'کرد', 'بر', 'طرف', 'نیز', 'یا', 'اما', 'هم', 'شد', 'کند', 'می', 'نمی',
  'دارد', 'باید', 'شود', 'شده', 'بود', 'اگر', 'هر', 'چه', 'پس', 'چون', 'بین',
  'ما', 'شما', 'او', 'آنها', 'من', 'دیگر', 'همین', 'چنین', 'کدام'
]);

export function extractLegalTokens(text: string): string[] {
  const normalized = normalizePersianText(text);
  const words = normalized.split(/\s+/).filter((w) => w.length > 1);
  return words.filter((w) => !PERSIAN_STOP_WORDS.has(w));
}

/** محاسبه میزان شباهت و امتیاز ارتباط مقاله با پرسش کاربر */
export function retrieveRelevantArticles(
  query: string,
  context?: CaseContext,
  limit: number = 4
): RetrievalResult[] {
  const allArticles = knowledgeBase.getAllArticles();
  const queryTokens = extractLegalTokens(query);

  // اضافه کردن کلمات کلیدی از فیلدهای زمینه پرونده در صورت وجود
  const contextTokens: string[] = [];
  if (context) {
    if (context.legalCategory?.title) {
      contextTokens.push(...extractLegalTokens(context.legalCategory.title));
    }
    if (context.caseSummary) {
      contextTokens.push(...extractLegalTokens(context.caseSummary));
    }
    if (context.formAnswers) {
      for (const val of Object.values(context.formAnswers)) {
        if (typeof val === 'string') {
          contextTokens.push(...extractLegalTokens(val));
        }
      }
    }
  }

  const normalizedQuery = normalizePersianText(query);
  const results: RetrievalResult[] = [];

  for (const article of allArticles) {
    let score = 0;
    const matched: Set<string> = new Set();

    const normalizedTitle = normalizePersianText(article.title);
    const normalizedContent = normalizePersianText(article.content);
    const normalizedArticleNum = normalizePersianText(article.articleNumber);
    const normalizedLawTitle = normalizePersianText(article.lawTitle);
    const normalizedCategory = normalizePersianText(article.category);

    // ۱. بررسی تطابق شماره ماده (بسیار پراهمیت - مثلاً کاربر بگوید ماده ۲۳ یا ماده ۵ مکرر)
    if (normalizedArticleNum && normalizedQuery.includes(normalizedArticleNum)) {
      score += 15.0;
      matched.add(article.articleNumber);
    }

    // ۲. تطابق دسته‌بندی موضوعی با زمینه پرونده
    if (context?.legalCategory?.title) {
      const normCatContext = normalizePersianText(context.legalCategory.title);
      if (normalizedCategory.includes(normCatContext) || normCatContext.includes(normalizedCategory)) {
        score += 3.5;
      }
    }

    // ۳. تطابق کلیدواژه‌های اصلی مقاله با پرسش کاربر
    for (const kw of article.keywords) {
      const normKw = normalizePersianText(kw);
      if (normalizedQuery.includes(normKw)) {
        score += 4.0;
        matched.add(kw);
      }
    }

    // ۴. تطابق توکن‌های پرسش با متن و عنوان ماده
    for (const token of queryTokens) {
      if (normalizedTitle.includes(token)) {
        score += 2.5;
        matched.add(token);
      } else if (normalizedContent.includes(token)) {
        score += 1.0;
        matched.add(token);
      } else if (normalizedLawTitle.includes(token)) {
        score += 1.5;
        matched.add(token);
      }
    }

    // ۵. انطباق با زمینه پرونده (امتیاز نرم)
    for (const token of contextTokens) {
      if (normalizedContent.includes(token) || normalizedTitle.includes(token)) {
        score += 0.4;
      }
    }

    // فقط مقالات با امتیاز مثبت را در نظر می‌گیریم
    if (score > 1.5) {
      results.push({
        article,
        relevanceScore: Math.round(score * 10) / 10,
        matchedKeywords: Array.from(matched)
      });
    }
  }

  // مرتب‌سازی نزولی بر اساس امتیاز ارتباط
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return results.slice(0, limit);
}
