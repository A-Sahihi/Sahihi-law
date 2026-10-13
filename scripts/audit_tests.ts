/**
 * اسکریپت آزمون ممیزی واقعی سامانه حقوقی هوشمند ایران
 */
import { resolveGeminiModelName, parseGeminiError } from '../src/services/geminiService.ts';
import { knowledgeBase } from '../src/rag/knowledgeBase.ts';
import { retrieveRelevantArticles } from '../src/rag/retriever.ts';
import { verifyCitations } from '../src/rag/verifier.ts';
import { CaseContext } from '../src/types/legal.ts';

console.log('================================================================');
console.log('گزارش ممیزی فنی و حقوقی سامانه دستیار حقوقی هوشمند ایران');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// آزمون ۱: بررسی شناسه مدل و سازوکار پالایش ورودی
// -----------------------------------------------------------------------------
console.log('--- آزمون ۱: شناسه مدل و سازگاری با API رسمی گوگل ---');
const defaultModel = resolveGeminiModelName();
console.log(`مدل پیش‌فرض انتخاب‌شده: ${defaultModel}`);
const isModelValid = defaultModel === 'gemini-3.8-flash';
console.log(`نتیجه آزمون مدل: ${isModelValid ? 'تأییدشده' : 'نامعتبر'}\n`);

// -----------------------------------------------------------------------------
// آزمون ۲: بررسی خطاهای احراز هویت، سقف سهمیه و سازوکار Fallback
// -----------------------------------------------------------------------------
console.log('--- آزمون ۲: تفکیک خطاهای احراز هویت، سقف سهمیه و Fallback ---');
const authErr = parseGeminiError({ status: 401, message: 'API_KEY_INVALID' });
const quotaErr = parseGeminiError({ status: 429, message: 'RESOURCE_EXHAUSTED' });
const notFoundErr = parseGeminiError({ status: 404, message: 'models/invalid is not found' });

console.log(`پیام خطای احراز هویت: ${authErr}`);
console.log(`پیام خطای سقف سهمیه: ${quotaErr}`);
console.log(`پیام خطای مدل ناموجود: ${notFoundErr}`);
const fallbackSafety =
  authErr.includes('احراز هویت') &&
  quotaErr.includes('Quota') &&
  notFoundErr.includes('شناسه مدل');
console.log(`نتیجه آزمون عدم پنهان‌سازی خطاها: ${fallbackSafety ? 'تأییدشده' : 'نامعتبر'}\n`);

// -----------------------------------------------------------------------------
// آزمون ۳: تطبیق مواد قانون صدور چک (مواد ۲۳، ۵ مکرر، ۲۱ مکرر و ۱۱)
// -----------------------------------------------------------------------------
console.log('--- آزمون ۳: تطبیق اسناد و مواد قانون صدور چک با متن رسمی ---');
const checkArticles = knowledgeBase.getAllArticles().filter((a) => a.lawId.startsWith('law_cheque'));

const art23 = checkArticles.find((a) => a.articleNumber === 'ماده ۲۳');
const art5bis = checkArticles.find((a) => a.articleNumber === 'ماده ۵ مکرر');
const art21bis = checkArticles.find((a) => a.articleNumber === 'ماده ۲۱ مکرر');
const art11 = checkArticles.find((a) => a.articleNumber === 'ماده ۱۱');

console.log(`ماده ۲۳ موجود: ${Boolean(art23)} | صدور اجراییه مستقیم دادگاه: ${art23?.content.includes('بدون رسیدگی ماهوی')}`);
console.log(`ماده ۵ مکرر موجود: ${Boolean(art5bis)} | مسدودی ۲۴ ساعته حساب‌ها: ${art5bis?.content.includes('بیست و چهار ساعت')}`);
console.log(`ماده ۲۱ مکرر موجود: ${Boolean(art21bis)} | ثبت سامانه صیاد: ${art21bis?.content.includes('سامانه صیاد')}`);
console.log(`ماده ۱۱ موجود: ${Boolean(art11)} | مواعد ۶ ماهه کیفری: ${art11?.content.includes('شش ماه')}`);

const chequeContext: CaseContext = {
  userName: 'علی رضایی',
  personType: 'حقیقی',
  legalCategory: { id: 'cheque_promissory', title: 'چک و سفته', desc: '' },
  formAnswers: {
    role: 'دارنده چک یا سفته (طلبکار)',
    doc_type: 'چک صیادی بنفش (ثبت‌شده در سامانه صیاد)',
    dispute_subject: 'وصول وجه و صدور اجراییه مستقیم',
    current_status: 'گواهی عدم پرداخت از بانک دریافت کرده‌ام'
  },
  caseSummary: 'چک صیادی ۵۰۰ میلیون تومانی برگشت خورده و گواهی عدم پرداخت با کد رهگیری دارم.'
};

const chequeRetrieval = retrieveRelevantArticles(
  'چک صیادی برگشت خورده چگونه اجراییه مستقیم بگیرم و حساب مسدود کنم؟ ماده ۲۳ و ۵ مکرر',
  chequeContext,
  4
);
console.log('مواد بازیابی‌شده برای چک صیادی:');
chequeRetrieval.forEach((r) => console.log(` - ${r.article.articleNumber}: ${r.article.title} (امتیاز: ${r.relevanceScore})`));
console.log('');

// -----------------------------------------------------------------------------
// آزمون ۴: تطبیق قانون روابط موجر و مستأجر ۱۳۷۶ و مراجع صالح
// -----------------------------------------------------------------------------
console.log('--- آزمون ۴: تطبیق تخلیه ملک، شرایط دستور تخلیه و مراجع صالح ---');
const rentArticles = knowledgeBase.getAllArticles().filter((a) => a.lawId === 'law_landlord_1376');
const rentArt2 = rentArticles.find((a) => a.articleNumber === 'ماده ۲');
const rentArt3 = rentArticles.find((a) => a.articleNumber === 'ماده ۳');
const rentArt4 = rentArticles.find((a) => a.articleNumber === 'ماده ۴');

console.log(`ماده ۲ (شرط دو شاهد و مدت): ${Boolean(rentArt2)} | متن رسمی: ${rentArt2?.content.includes('دو نفر افراد مورد اعتماد')}`);
console.log(`ماده ۳ (متن رسمی بدون تحمیل شورا): ${rentArt3?.content.includes('به دستور مقام قضایی در مرجع قضایی') && !rentArt3?.content.includes('(شورای حل اختلاف')}`);
console.log(`ماده ۴ (تودیع ودیعه قبل از تخلیه): ${Boolean(rentArt4)} | متن رسمی: ${rentArt4?.content.includes('استرداد سند یا وجه مذکور به مستأجر و یا سپردن آن به دایره اجرا')}`);

const rentContext: CaseContext = {
  userName: 'مریم حسینی',
  personType: 'حقیقی',
  legalCategory: { id: 'landlord_tenant', title: 'روابط موجر و مستأجر', desc: '' },
  formAnswers: {
    role: 'موجر (اجاره‌دهنده)',
    contract_status: 'قرارداد املاک با کد رهگیری و امضای دو شاهد',
    dispute_subject: 'تخلیه ملک به دلیل پایان مدت یا عدم پرداخت',
    current_status: 'هنوز هیچ اقدام قانونی نکرده‌ام'
  },
  caseSummary: 'مدت قرارداد اجاره مسکونی به پایان رسیده و دو شاهد هم امضا کرده‌اند. مستأجر تخلیه نمی‌کند.'
};

const rentRetrieval = retrieveRelevantArticles(
  'مدت اجاره تمام شده و قرارداد دو شاهد دارد، شرایط دستور تخلیه فوری و مرجع صالح چیست؟',
  rentContext,
  4
);
console.log('مواد بازیابی‌شده برای تخلیه ملک:');
rentRetrieval.forEach((r) => console.log(` - ${r.article.articleNumber}: ${r.article.title} (امتیاز: ${r.relevanceScore})`));
console.log('');

// -----------------------------------------------------------------------------
// آزمون ۵ و ۶: اعتبارسنجی ارجاعات و تفکیک ارجاع جعلی از معتبر
// -----------------------------------------------------------------------------
console.log('--- آزمون ۵ و ۶: اعتبارسنجی ارجاعات و تشخیص ارجاعات جعلی ---');
const simulatedResponseWithFakeArticle = `
بر اساس ماده ۲۳ قانون صدور چک می‌توانید اجراییه مستقیم بگیرید.
همچنین بر اساس ماده ۵ مکرر حساب‌های بانکی مسدود می‌شود.
ضمناً طبق ماده ۹۹۹ قانون چک مجازات اضافی اعمال می‌گردد!
`;

const verifiedCitations = verifyCitations(
  simulatedResponseWithFakeArticle,
  chequeRetrieval.map((r) => r.article)
);

console.log('نتایج اعتبارسنجی استنادات:');
verifiedCitations.forEach((c) => {
  console.log(` - ${c.articleNumber} [${c.lawTitle}]: ${c.status} (${c.statusLabel})`);
});

const fakeDetected = verifiedCitations.some((c) => c.articleNumber === 'ماده ۹۹۹' && c.status === 'unverified');
const realVerified = verifiedCitations.some((c) => c.articleNumber === 'ماده ۲۳' && c.status === 'verified');

console.log(`\nتشخیص ماده جعلی ۹۹۹ به عنوان unverified: ${fakeDetected ? 'تأییدشده' : 'ناموفق'}`);
console.log(`تأیید ماده واقعی ۲۳ به عنوان verified: ${realVerified ? 'تأییدشده' : 'ناموفق'}`);
console.log('================================================================');
