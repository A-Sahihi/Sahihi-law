/**
 * @license
 * موتور بازیابی اسناد حقوقی ایران (Legal RAG Retriever)
 * جست‌وجوی ترکیبی معنایی، کلیدواژه‌ای و تطبیق دامنه تخصصی با تفکیک قطعی موضوعات
 */

import type { LegalArticle, RetrievalResult, CaseContext } from '../types/legal.ts';
import { knowledgeBase } from './knowledgeBase.ts';
import { detectLegalIntent, LegalIntentResult } from './classifier.ts';

/** نرمال‌سازی نویسه‌ها و حروف عربی/فارسی */
export function normalizePersianText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u200C\u200D]/g, ' ') // تبدیل نیم‌فاصله به فاصله
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ةۀ]/g, 'ه')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ی')
    .replace(/[\u064B-\u065F\u0670]/g, '') // حذف اعراب و تنوین
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776)) // ارقام فارسی به انگلیسی
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)) // ارقام عربی به انگلیسی
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?،؛«»"']/g, ' ')
    .toLowerCase()
    .trim();
}

/** ایست‌واژه‌های زبان فارسی و عبارات مکالمه‌ای و تعارفی */
const PERSIAN_STOP_WORDS = new Set([
  'و', 'در', 'به', 'از', 'که', 'این', 'را', 'با', 'است', 'برای', 'آن', 'یک', 'خود',
  'تا', 'کرد', 'بر', 'طرف', 'نیز', 'یا', 'اما', 'هم', 'شد', 'کند', 'می', 'نمی',
  'دارد', 'باید', 'شود', 'شده', 'بود', 'اگر', 'هر', 'چه', 'پس', 'چون', 'بین',
  'ما', 'شما', 'او', 'آنها', 'من', 'دیگر', 'همین', 'چنین', 'کدام',
  // واژه‌های تعارفی و آغازین که نباید تطابق کاذب حقوقی ایجاد کنند
  'سلام', 'درود', 'خسته', 'نباشید', 'صبح', 'عصر', 'شب', 'بخیر', 'لطفا', 'لطفاً',
  'خواهش', 'ممنون', 'تشکر', 'چکار', 'کنم', 'کنیم', 'هستیم', 'باشم', 'باشد',
  'دارم', 'داریم', 'هست', 'نیست', 'آیا', 'چطور', 'چگونه', 'کجا', 'چرا',
  'راهنمایی', 'بفرمایید', 'کمک', 'فرمایید', 'عرض', 'ادب', 'احترام'
]);

/** استخراج کلمات کلیدی مفید و فیلتر ایست‌واژه‌ها */
export function extractLegalTokens(text: string): string[] {
  const normalized = normalizePersianText(text);
  const words = normalized.split(/\s+/).filter((w) => w.length > 1);
  return words.filter((w) => !PERSIAN_STOP_WORDS.has(w));
}

/** بررسی تطابق دقیق یک کلمه به عنوان واژه کامل، نه زیررشته تصادفی */
function containsExactWord(targetText: string, word: string): boolean {
  if (!targetText || !word) return false;
  // تقسیم به کلمات مجزا جهت جلوگیری از خطای تطابق سلام با اسلامی
  const words = targetText.split(/\s+/);
  return words.includes(word);
}

/**
 * بازیابی دقیق و تفکیک‌شده اسناد حقوقی با تضمین عدم نشت قوانین نامرتبط
 */
export function retrieveRelevantArticles(
  query: string,
  context?: CaseContext,
  limit: number = 4
): RetrievalResult[] {
  // ۱. مرحله حیاتی: تشخیص موضوع و هدف حقوقی کاربر و قواعد انزوای حوزه (Domain Isolation)
  const intent: LegalIntentResult = detectLegalIntent(query, context);

  // اگر پرسش خارج از حیطه پایگاه منابع معتبر باشد، هیچ سندی بازگردانده نمی‌شود
  // تا از هرگونه جعل استناد یا تطابق ساختگی جلوگیری شود.
  if (intent.isOutOfScope) {
    return [];
  }

  const allArticles = knowledgeBase.getAllArticles();
  const queryTokens = extractLegalTokens(query);
  const normalizedQuery = normalizePersianText(query);

  // اگر پرسش مبهم باشد (مثلاً صرفاً «مطالبه طلب»)، ماده ۵۲۲ آیین دادرسی مدنی را به عنوان مبنای طلب وجه نقد بازیابی می‌کنیم
  if (intent.isAmbiguous) {
    const civProc522 = allArticles.find((a) => a.id === 'civ_proc_522');
    if (civProc522) {
      return [
        {
          article: civProc522,
          relevanceScore: 10.0,
          matchedKeywords: ['مطالبه طلب', 'ماده ۵۲۲', 'شاخص تورم']
        }
      ];
    }
  }

  const results: RetrievalResult[] = [];

  for (const article of allArticles) {
    // ۲. فیلتر مطلق و آهنین: آیا دسته این مقاله در لیست دسته‌های اکیداً ممنوع این پرونده است؟
    // برای مثال: اگر پرونده چک و سفته است، دسته «روابط موجر و مستأجر» اکیداً مسدود است.
    if (intent.forbiddenCategories.includes(article.category)) {
      continue;
    }

    let score = 0;
    const matched: Set<string> = new Set();

    const normalizedTitle = normalizePersianText(article.title);
    const normalizedContent = normalizePersianText(article.content);
    const normalizedArticleNum = normalizePersianText(article.articleNumber);
    const normalizedLawTitle = normalizePersianText(article.lawTitle);

    // ۳. انطباق شماره ماده (بسیار پراهمیت - استناد صریح به شماره ماده)
    if (normalizedArticleNum && containsExactWord(normalizedQuery, normalizedArticleNum)) {
      score += 20.0;
      matched.add(article.articleNumber);
    } else if (normalizedArticleNum && normalizedQuery.includes(normalizedArticleNum)) {
      // تطابق زیررشته‌ای فقط برای شماره‌های مکرر یا خاص
      score += 15.0;
      matched.add(article.articleNumber);
    }

    // ۴. تطابق دسته مقاله با دسته‌های مجاز حوزه تشخیص‌داده‌شده
    if (intent.allowedCategories.includes(article.category)) {
      if (article.category === 'چک و سفته' && intent.primaryDomain === 'cheque_promissory') {
        score += 8.0;
      } else if (article.category === 'روابط موجر و مستأجر' && intent.primaryDomain === 'lease_tenancy') {
        score += 8.0;
      } else if (article.category === 'حقوق خانواده' && intent.primaryDomain === 'family') {
        score += 8.0;
      } else if (article.category === 'حقوق کار و تأمین اجتماعی' && intent.primaryDomain === 'labor_insurance') {
        score += 8.0;
      } else if (article.category === 'مسائل کیفری' && intent.primaryDomain === 'criminal') {
        score += 8.0;
      } else {
        score += 3.0;
      }
    }

    // ۵. تطابق کلیدواژه‌های اصلی مقاله با پرسش کاربر (کلمات تخصصی)
    for (const kw of article.keywords) {
      const normKw = normalizePersianText(kw);
      if (containsExactWord(normalizedQuery, normKw) || normalizedQuery.includes(normKw)) {
        score += 5.0;
        matched.add(kw);
      }
    }

    // ۶. تطابق توکن‌های پرسش کاربر با عنوان و متن ماده با بررسی کلمه کامل
    for (const token of queryTokens) {
      if (containsExactWord(normalizedTitle, token)) {
        score += 4.0;
        matched.add(token);
      } else if (containsExactWord(normalizedContent, token)) {
        score += 1.5;
        matched.add(token);
      } else if (containsExactWord(normalizedLawTitle, token)) {
        score += 2.0;
        matched.add(token);
      }
    }

    // ۷. تطابق با زمینه پرونده کاربر در فرم (وضعیت، پاسخ‌های فرم)
    if (context?.formAnswers) {
      for (const val of Object.values(context.formAnswers)) {
        if (typeof val === 'string') {
          const valTokens = extractLegalTokens(val);
          for (const vt of valTokens) {
            // تطابق کلمات وضعیت در متن یا عنوان ماده با ضریب ملایم
            if (containsExactWord(normalizedTitle, vt)) {
              score += 1.0;
            } else if (containsExactWord(normalizedContent, vt)) {
              score += 0.5;
            }
          }
        }
      }
    }

    // آستانه ورود: تنها مقالاتی با ارتباط قطعی و امتیاز بالاتر از آستانه مجاز هستند
    if (score >= 4.0) {
      results.push({
        article,
        relevanceScore: Math.round(score * 10) / 10,
        matchedKeywords: Array.from(matched)
      });
    }
  }

  // مرتب‌سازی نزولی بر اساس امتیاز ارتباط حقوقی واقعی
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return results.slice(0, limit);
}

export { detectLegalIntent };
