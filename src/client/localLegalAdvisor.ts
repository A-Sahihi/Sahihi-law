/**
 * @license
 * موتور استنتاج حقوقی آفلاین / کلاینت برای دستیار حقوقی «صحیحی»
 * این ماژول پایگاه قوانین و موتور RAG را در فرانت‌اند اجرا می‌کند تا در محیط‌های استاتیک
 * مانند GitHub Pages یا زمان قطعی موقت سرور، کاربر هرگز با خطای بن‌بست مواجه نشود.
 */

import { INITIAL_LEGAL_ARTICLES } from '../rag/knowledgeBase.ts';
import { LegalArticle, CaseContext, VerifiedCitation } from '../types/legal.ts';
import { retrieveRelevantArticles } from '../rag/retriever.ts';
import { verifyCitations } from '../rag/verifier.ts';

export interface LocalChatResponse {
  reply: string;
  sources: Array<{
    id: string;
    lawTitle: string;
    category: string;
    articleNumber: string;
    title: string;
    validityStatusLabel: string;
    officialSource: string;
    officialUrl: string;
    lastVerifiedDate: string;
  }>;
  citations: VerifiedCitation[];
  isOfflineMode: boolean;
}

/** ساخت متن ساختاریافته حقوقی آفلاین بر مبنای قوانین واقعی RAG */
export function generateLocalLegalAdvice(
  userQuery: string,
  caseContext?: CaseContext
): LocalChatResponse {
  // ۱. بازیابی مرتبط‌ترین مواد از پایگاه ۴۰ ماده‌ای قوانین
  const searchResults = retrieveRelevantArticles(userQuery, caseContext, 4);
  const relevantArticles = searchResults.map((r) => r.article);

  // ۲. آماده‌سازی ساختار منابع برای نمایش کارت‌های منبع
  const safeSources = relevantArticles.map((s) => ({
    id: s.id,
    lawTitle: s.lawTitle,
    category: s.category,
    articleNumber: s.articleNumber,
    title: s.title,
    validityStatusLabel: s.validityStatusLabel,
    officialSource: s.officialSource,
    officialUrl: s.officialUrl,
    lastVerifiedDate: s.lastVerifiedDate
  }));

  const userName = caseContext?.userName?.trim() || 'کاربر گرامی';
  const categoryTitle = caseContext?.legalCategory?.title || 'حقوقی';
  const currentStatus = caseContext?.formAnswers?.['current_status'] || 'در حال بررسی';

  let replyText = `سلام ${userName}. اطلاعات پرونده شما در موضوع «${categoryTitle}» و وضعیت «${currentStatus}» مورد ارزیابی قرار گرفت.\n\n`;

  if (relevantArticles.length > 0) {
    const primary = relevantArticles[0];

    replyText += `### ۱. خلاصه راهنمایی و ارزیابی اولیه:\n`;
    replyText += `بر اساس داده‌های ارائه‌شده و مستندات رسمی قوانین جمهوری اسلامی ایران، موضوع شما مرتبط با **${primary.lawTitle}** و به ویژه **${primary.articleNumber} (${primary.title})** می‌باشد.\n\n`;

    replyText += `### ۲. مستندات قانونی رسمی منطبق با پرونده:\n`;
    for (const art of relevantArticles) {
      replyText += `📌 **${art.lawTitle} - ${art.articleNumber} (${art.title}):**\n`;
      replyText += `> ${art.content}\n`;
      if (art.notes && art.notes.length > 0) {
        replyText += `*نکته اجرایی و تبصره:* ${art.notes.join(' ')}\n`;
      }
      replyText += `*(وضعیت اعتبار: ${art.validityStatusLabel} · مرجع رسمی: ${art.officialSource})*\n\n`;
    }

    replyText += `### ۳. مراجع صالح و اقدامات پیشنهادی بعدی:\n`;
    // تشخیص تخصصی مرجع صالح بر اساس موضوع پرونده
    if (categoryTitle.includes('موجر') || userQuery.includes('تخلیه') || userQuery.includes('اجاره')) {
      replyText += `• **تفکیک مرجع صالح:**\n`;
      replyText += `  - چنانچه قرارداد اجاره دارای سند رسمی ثبتی باشد: منحصراً دوایر اجرای ثبت اسناد و املاک محل ملک صالح به رسیدگی و صدور اجراییه تخلیه هستند.\n`;
      replyText += `  - چنانچه قرارداد عادی و دارای شرایط ماده ۲ قانون ۱۳۷۶ (دو نسخه و امضای حداقل دو شاهد) باشد: مرجع قضایی صالح (دادگاه صلح یا شعبه قضایی ذی‌صلاح) ظرف یک هفته «دستور تخلیه» فوری صادر می‌کند.\n`;
      replyText += `  - در صورت فقدان شرایط فوری، املاک تجاری دارای سرقفلی یا شمول قانون ۱۳۵۶: صرفاً از طریق «دادگاه عمومی حقوقی» باید دعوای «حکم تخلیه» اقامه گردد.\n`;
      replyText += `• **الزام تودیع ودیعه:** پیش از اجرای هرگونه تخلیه، موجر مکلف است مبلغ ودیعه (پول پیش) را به حساب صندوق سپرده دادگستری واریز نماید (ماده ۴ قانون ۱۳۷۶).\n`;
    } else if (categoryTitle.includes('چک') || userQuery.includes('چک') || userQuery.includes('سفته')) {
      replyText += `• **اقدامات فوری چک:**\n`;
      replyText += `  - بر اساس ماده ۲۳ اصلاحی قانون صدور چک، در صورت ثبت در سامانه صیاد و عدم قید شرط یا تضمین، می‌توانید مستقیماً از طریق دادگاه حقوقی تقاضای صدور «اجراییه مستقیم» نمایید بدون آنکه نیاز به دادرسی ماهوی طولانی باشد.\n`;
      replyText += `  - ظرف ۲۴ ساعت از صدور گواهینامه عدم پرداخت، کلیه حساب‌های بانکی صادرکننده به میزان مبلغ چک مسدود می‌گردد (ماده ۵ مکرر).\n`;
      replyText += `  - برای شکایت کیفری چک بلامحل، مهلت ۶ ماهه از تاریخ سررسید برای مراجعه به بانک و ۶ ماه از تاریخ گواهی عدم پرداخت برای ثبت شکایت در دادسرا الزامی است (ماده ۱۱).\n`;
    } else if (categoryTitle.includes('کار') || userQuery.includes('بیمه') || userQuery.includes('کارگر')) {
      replyText += `• **مرجع صالح:** هیئت تشخیص و حل اختلاف اداره تعاون، کار و رفاه اجتماعی محل کارگاه.\n`;
      replyText += `• **الزام بیمه:** ماده ۱۴۸ قانون کار آمره بوده و هرگونه توافق مبنی بر عدم پرداخت بیمه باطل است.\n`;
    } else if (categoryTitle.includes('خانواده') || userQuery.includes('مهریه') || userQuery.includes('طلاق')) {
      replyText += `• **مرجع صالح:** دادگاه خانواده محل اقامت زوجه یا زوج؛ وصول مهریه ابتدا از طریق دایره اجرای ثبت اسناد رسمی انجام می‌شود.\n`;
      replyText += `• **سقف قانونی:** سقف اجرای حبس و جلب مهریه طبق ماده ۲۲ قانون حمایت خانواده، ۱۱۰ سکه تمام بهار آزادی یا معادل ریالی آن است.\n`;
    } else {
      replyText += `• جهت ثبت و پیگیری هرگونه دادخواست، به یکی از دفاتر خدمات الکترونیک قضایی مراجعه فرمایید.\n`;
      replyText += `• قبل از هر اقدام ترافعی، در صورت لزوم ارسال «اظهارنامه رسمی» جهت اثبات مطالبه حق و تاریخ مطالبه توصیه می‌شود.\n`;
    }

    replyText += `\n### ۴. هشدارها و مواعد قانونی مهم:\n`;
    replyText += `• به مواعد قانونی ثبت اعتراض، واخواست و مرور زمان دقت ویژه داشته باشید.\n`;
    replyText += `• مدارک و مستندات خود شامل قراردادها، فیش‌های واریزی و مکاتبات را به‌طور کامل جمع‌آوری و منظم نمایید.\n\n`;
    replyText += `⚠️ *تذکر قانونی:* این تحلیل بر مبنای قوانین رسمی ثبت‌شده در سامانه تولید شده است و به عنوان راهنمایی اولیه تلقی می‌شود. جهت اتخاذ تصمیم نهایی و حضور در مراجع قضایی، مشورت با وکیل پایه‌یک دادگستری توصیه می‌گردد.`;
  } else {
    replyText += `پرسش شما دریافت شد، اما برای کلیدواژه‌های ارائه‌شده ماده مستقیمی در بانک قوانین فوری یافت نشد.\n\n`;
    replyText += `پیشنهاد می‌شود پرسش خود را با ذکر نام یکی از موضوعات معین (مانند «تخلیه ملک»، «چک صیادی»، «مهریه»، «سفته»، «خسارت تأخیر تأدیه» یا «بیمه کارگر») شفاف‌تر بیان فرمایید تا متن دقیق قوانین استخراج گردد.`;
  }

  const citations = verifyCitations(replyText, relevantArticles);

  return {
    reply: replyText,
    sources: safeSources,
    citations,
    isOfflineMode: true
  };
}

/** دریافت کلیه مقالات جهت نمایش در مدال قوانین کلاینت */
export function getLocalArticlesCatalog() {
  return INITIAL_LEGAL_ARTICLES.map((a) => ({
    id: a.id,
    lawTitle: a.lawTitle,
    category: a.category,
    articleNumber: a.articleNumber,
    title: a.title,
    validityStatus: a.validityStatusLabel,
    officialSource: a.officialSource,
    officialUrl: a.officialUrl,
    lastVerifiedDate: a.lastVerifiedDate
  }));
}
