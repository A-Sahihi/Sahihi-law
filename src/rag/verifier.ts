/**
 * @license
 * اعتبارسنجی ارجاعات حقوقی و منابع (Citation Verifier)
 * تطبیق استنادات با پایگاه داده معتبر و جلوگیری از ارجاعات ساختگی
 */

import { LegalArticle, VerifiedCitation } from '../types/legal.ts';
import { knowledgeBase } from './knowledgeBase.ts';
import { normalizePersianText } from './retriever.ts';

export function verifyCitations(
  responseContent: string,
  retrievedArticles: LegalArticle[]
): VerifiedCitation[] {
  const citations: VerifiedCitation[] = [];
  const normalizedResponse = normalizePersianText(responseContent);

  // تمام اسناد پایگاه دانش
  const allArticles = knowledgeBase.getAllArticles();

  // ۱. بررسی مقالات بازیابی‌شده که شماره آن‌ها صراحتاً در متن پاسخ ذکر شده است
  for (const article of retrievedArticles) {
    const normArticleNum = normalizePersianText(article.articleNumber);
    const isNumMentioned = normalizedResponse.includes(normArticleNum);

    if (isNumMentioned) {
      citations.push({
        articleId: article.id,
        lawTitle: article.lawTitle,
        articleNumber: article.articleNumber,
        status: 'verified',
        statusLabel: 'تأییدشده و منطبق با پایگاه قوانین رسمی',
        officialUrl: article.officialUrl,
        excerpt: `${article.title} - ${article.content.substring(0, 160)}...`
      });
    }
  }

  // ۲. استخراج الگوهای ماده قانونی از متن پاسخ (مثلاً «ماده ۲۳»، «ماده ۵ مکرر»، «ماده ۳»)
  // و تطبیق با پایگاه داده واقعی جهت جلوگیری از جعل ماده توسط مدل
  const articleMatches = responseContent.match(/ماده\s+([۰-۹0-9]+(?:\s+مکرر)?)/gu);

  if (articleMatches) {
    for (const match of articleMatches) {
      const cleanMatch = match.trim();
      const normMatch = normalizePersianText(cleanMatch);

      // بررسی اینکه آیا قبلاً از طریق مقالات بازیابی‌شده اضافه شده یا خیر
      const alreadyAdded = citations.some(
        (c) => normalizePersianText(c.articleNumber) === normMatch
      );
      if (alreadyAdded) continue;

      // جست‌وجو ابتدا در مقالات بازیابی‌شده، سپس در کل پایگاه داده
      const foundInRetrieved = retrievedArticles.find(
        (a) => normalizePersianText(a.articleNumber) === normMatch
      );
      const foundInDb = foundInRetrieved || allArticles.find(
        (a) => normalizePersianText(a.articleNumber) === normMatch
      );

      if (foundInDb) {
        citations.push({
          articleId: foundInDb.id,
          lawTitle: foundInDb.lawTitle,
          articleNumber: foundInDb.articleNumber,
          status: 'verified',
          statusLabel: 'تأییدشده و منطبق با پایگاه قوانین رسمی',
          officialUrl: foundInDb.officialUrl,
          excerpt: `${foundInDb.title} - ${foundInDb.content.substring(0, 160)}...`
        });
      } else {
        // ماده ذکر شده در پایگاه منابع رسمی پروژه موجود نیست -> برچسب تأییدنشده
        citations.push({
          articleId: `unverified_${cleanMatch}`,
          lawTitle: 'منبع نامشخص در پایگاه رسمی',
          articleNumber: cleanMatch,
          status: 'unverified',
          statusLabel: 'نیاز به بررسی و استعلام تکمیلی',
          officialUrl: 'https://qavanin.ir',
          excerpt: `مستند قانونی متناظر با «${cleanMatch}» نیاز به بررسی و استعلام تکمیلی در مراجع رسمی یا روزنامه رسمی دارد.`
        });
      }
    }
  }

  // اگر هیچ ماده خاصی ذکر نشده بود ولی مقالات معتبری بازیابی شده بودند، مهم‌ترین منبع بازیابی‌شده را به عنوان مستند مرتبط ارائه می‌دهیم
  if (citations.length === 0 && retrievedArticles.length > 0) {
    const topArticle = retrievedArticles[0];
    citations.push({
      articleId: topArticle.id,
      lawTitle: topArticle.lawTitle,
      articleNumber: topArticle.articleNumber,
      status: 'partially_verified',
      statusLabel: 'مستند مرتبط با موضوع پرونده',
      officialUrl: topArticle.officialUrl,
      excerpt: `${topArticle.title} - ${topArticle.content.substring(0, 160)}...`
    });
  }

  return citations;
}
