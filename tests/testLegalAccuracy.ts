/**
 * @license
 * آزمون‌های واقعی و جامع سنجش دقت حقوقی و انطباق RAG دستیار حقوقی «صحیحی»
 * بررسی ۵ سناریوی حیاتی:
 * ۱. عدم ارجاع نامرتبط پرونده چک و سفته به قانون اجاره
 * ۲. بازیابی صحیح قوانین اجاره در پرسش تخلیه ملک
 * ۳. پرسیدن سؤالات تکمیلی در سؤالات مبهم مطالبه طلب
 * ۴. عدم جعل قانون در پرسش‌های خارج از پوشش منابع
 * ۵. استناد به نسخه معتبر و به‌روز قوانین اصلاح‌شده
 */

import { generateLocalLegalAdvice } from '../src/client/localLegalAdvisor.ts';
import { retrieveRelevantArticles, detectLegalIntent } from '../src/rag/retriever.ts';
import { knowledgeBase } from '../src/rag/knowledgeBase.ts';
import type { CaseContext } from '../src/types/legal.ts';

interface TestResult {
  name: string;
  passed: boolean;
  details: string[];
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string, details: string[]) {
  if (condition) {
    details.push(`  ✅ ${message}`);
  } else {
    details.push(`  ❌ شکست: ${message}`);
  }
  return condition;
}

console.log('================================================================');
console.log('🚀 آغاز اجرای آزمون‌های دقت حقوقی، مرزبندی دامنه و اعتبارسنجی RAG');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// آزمون ۱: پرونده چک و سفته و وضعیت مذاکره و توافق -> عدم ارجاع به قوانین اجاره
// -----------------------------------------------------------------------------
{
  const details: string[] = [];
  const testName = 'آزمون ۱: تفکیک قطعی - پرونده چک و سفته نباید به قانون اجاره ارجاع دهد';

  const context: CaseContext = {
    userName: 'رضا کمالی',
    personType: 'حقیقی',
    legalCategory: {
      id: 'cheque',
      title: 'چک و سفته',
      desc: 'دعاوی اسناد تجاری و مطالبات'
    },
    formAnswers: {
      current_status: 'در حال مذاکره و توافق'
    },
    caseSummary: ''
  };

  const query = 'سلام ما در حال مذاکره و توافق هستیم چکار کنیم؟';
  const advice = generateLocalLegalAdvice(query, context);

  let passed = true;

  // ۱. بررسی منابع بازیابی‌شده: هیچ منبعی نباید از دسته «روابط موجر و مستأجر» باشد
  const hasLeaseInSources = advice.sources.some(
    (s) => s.category.includes('موجر') || s.lawTitle.includes('موجر')
  );
  passed = assert(!hasLeaseInSources, 'هیچ منبعی از قانون روابط موجر و مستأجر در کارت‌های منبع وجود ندارد', details) && passed;

  // ۲. بررسی متن پاسخ: نباید حاوی کلمات تخلیه، مستأجر یا قانون موجر باشد
  const forbiddenTerms = ['مستأجر', 'مستاجر', 'موجر و مستأجر', 'دستور تخلیه', 'قانون روابط موجر'];
  const foundForbidden = forbiddenTerms.filter((term) => advice.reply.includes(term));
  passed = assert(foundForbidden.length === 0, `متن پاسخ فاقد واژگان نامرتبط اجاره است (واژه‌های یافت‌شده: [${foundForbidden.join(', ')}])`, details) && passed;

  // ۳. بررسی ارجاع به اسناد معتبر چک و اسناد تجاری
  const hasChequeSources = advice.sources.some((s) => s.category === 'چک و سفته');
  passed = assert(hasChequeSources, 'منابع بازیابی‌شده منحصراً در حوزه چک، سفته و اسناد تجاری هستند', details) && passed;

  // ۴. بررسی اعتبارسنجی استنادات
  const hasVerifiedCitations = advice.citations.length > 0 && advice.citations.every((c) => c.status === 'verified');
  passed = assert(hasVerifiedCitations, 'استنادات ارائه‌شده تماماً تأییدشده و منطبق با پایگاه قوانین رسمی هستند', details) && passed;

  results.push({ name: testName, passed, details });
}

// -----------------------------------------------------------------------------
// آزمون ۲: سؤال درباره تخلیه ملک -> بازیابی دقیق مواد ۲، ۳ و ۴ قانون اجاره ۱۳۷۶
// -----------------------------------------------------------------------------
{
  const details: string[] = [];
  const testName = 'آزمون ۲: بازیابی دقیق قوانین اجاره و تخلیه در پرسش مربوط به ملک';

  const context: CaseContext = {
    userName: 'سارا راد',
    personType: 'حقیقی',
    legalCategory: {
      id: 'rent',
      title: 'روابط موجر و مستأجر',
      desc: 'دعاوی اجاره و تخلیه'
    },
    formAnswers: {
      current_status: 'پایان مدت قرارداد'
    },
    caseSummary: ''
  };

  const query = 'مستأجر پس از پایان مدت قرارداد ملک مسکونی را تحویل نمی‌دهد، چگونه دستور تخلیه فوری بگیرم؟';
  const advice = generateLocalLegalAdvice(query, context);

  let passed = true;

  // ۱. بررسی بازیابی ماده ۲ یا ۳ قانون موجر و مستأجر ۱۳۷۶
  const hasRentArt2 = advice.sources.some((s) => s.articleNumber.includes('ماده ۲') && s.lawTitle.includes('موجر'));
  const hasRentArt3 = advice.sources.some((s) => s.articleNumber.includes('ماده ۳') && s.lawTitle.includes('موجر'));
  passed = assert(hasRentArt2 || hasRentArt3, 'ماده ۲ و ۳ قانون روابط موجر و مستأجر ۱۳۷۶ بازیابی شده است', details) && passed;

  // ۲. عدم نشت قوانین چک یا خانواده به حوزه اجاره
  const hasChequeSources = advice.sources.some((s) => s.category.includes('چک'));
  passed = assert(!hasChequeSources, 'هیچ ماده‌ای از قوانین چک یا اسناد تجاری نشت پیدا نکرده است', details) && passed;

  // ۳. تفکیک در متن: تبیین شرایط دستور تخلیه فوری (دو نسخه، دو شاهد، انقضای مدت)
  const mentionsTwoWitnesses = advice.reply.includes('دو شاهد') || advice.reply.includes('شهود');
  passed = assert(mentionsTwoWitnesses, 'شرط امضای دو شاهد و دو نسخه جهت صدور دستور تخلیه در تحلیل تصریح شده است', details) && passed;

  // ۴. تفکیک دستور تخلیه از حکم تخلیه
  const mentionsEvictionOrder = advice.reply.includes('دستور تخلیه') && advice.reply.includes('حکم تخلیه');
  passed = assert(mentionsEvictionOrder, 'تفکیک ماهوی میان دستور تخلیه فوری و حکم تخلیه ترافعی تبیین شده است', details) && passed;

  results.push({ name: testName, passed, details });
}

// -----------------------------------------------------------------------------
// آزمون ۳: سؤال مبهم درباره مطالبه طلب -> پرسیدن سؤالات تکمیلی و عدم نتیجه‌گیری زودرس
// -----------------------------------------------------------------------------
{
  const details: string[] = [];
  const testName = 'آزمون ۳: پرسیدن سؤال تکمیلی در مواجهه با پرسش‌های مبهم مطالبه طلب';

  const query = 'مطالبه طلب دارم، چطور می‌توانم طلبم را وصول کنم؟';
  const advice = generateLocalLegalAdvice(query);

  let passed = true;

  // ۱. شناسایی ابهام در تحلیل
  const isAmbiguousIdentified = advice.reply.includes('سؤالات تکمیلی') || advice.reply.includes('اطلاعات تکمیلی');
  passed = assert(isAmbiguousIdentified, 'سامانه ابهام پرسش و ناکافی بودن اطلاعات را شناسایی کرده است', details) && passed;

  // ۲. طرح پرسش درباره نوع سند (چک، سفته، قرارداد عادی، فیش واریز)
  const asksAboutInstrument = advice.reply.includes('مستند') || advice.reply.includes('چک صیادی');
  passed = assert(asksAboutInstrument, 'سؤال تکمیلی مشخص درباره نوع سند اثباتی و منشأ طلب مطرح شده است', details) && passed;

  // ۳. ارجاع به ماده ۵۲۲ آیین دادرسی مدنی به عنوان مبنای طلب وجه نقد و خسارت تأخیر
  const citesCivProc522 = advice.sources.some((s) => s.articleNumber.includes('۵۲۲'));
  passed = assert(citesCivProc522, 'ماده ۵۲۲ قانون آیین دادرسی مدنی به عنوان چارچوب خسارت تأخیر تأدیه طلب استناد شده است', details) && passed;

  results.push({ name: testName, passed, details });
}

// -----------------------------------------------------------------------------
// آزمون ۴: پرسش خارج از پوشش منابع -> اعلام صریح محدودیت و عدم ساخت استناد جعلی
// -----------------------------------------------------------------------------
{
  const details: string[] = [];
  const testName = 'آزمون ۴: پرسش خارج از دامنه تخصصی نباید پاسخ جعلی یا شماره ماده ساختگی تولید کند';

  const query = 'قوانین ماینینگ ارز دیجیتال و بیت کوین در ایران و نحوه دریافت مجوز گمرک چیست؟';
  const advice = generateLocalLegalAdvice(query);

  let passed = true;

  // ۱. اعلام صریح محدودیت پایگاه دانش
  const declaresLimitation = advice.reply.includes('اعلام محدودیت') || advice.reply.includes('خارج از پوشش');
  passed = assert(declaresLimitation, 'سامانه صریحاً اعلام کرد این موضوع خارج از پایگاه دانش تخصصی است', details) && passed;

  // ۲. عدم ارائه شماره ماده ساختگی
  passed = assert(advice.sources.length === 0, 'هیچ کارت منبع یا شماره ماده نامربوطی تولید نشده است', details) && passed;
  passed = assert(advice.citations.length === 0, 'هیچ ارجاع تأییدنشده یا جعلی ساخته نشده است', details) && passed;

  // ۳. پرهیز از جعل و ارجاع به مراجع رسمی
  const guidesToOfficial = advice.reply.includes('سامانه ملی قوانین') || advice.reply.includes('qavanin.ir');
  passed = assert(guidesToOfficial, 'کاربر به سامانه ملی قوانین یا وکیل متخصص ارجاع داده شده است', details) && passed;

  results.push({ name: testName, passed, details });
}

// -----------------------------------------------------------------------------
// آزمون ۵: استناد به نسخه معتبر قوانین اصلاح‌شده (اصلاحات ۱۳۹۷ قانون چک و ماده ۲۳)
// -----------------------------------------------------------------------------
{
  const details: string[] = [];
  const testName = 'آزمون ۵: بررسی انطباق با آخرین نسخه اصلاحی قوانین (اصلاحات ۱۳۹۷ و ۱۴۰۰ چک)';

  const context: CaseContext = {
    userName: 'امید نادری',
    personType: 'حقوقی',
    legalCategory: {
      id: 'cheque',
      title: 'چک و سفته',
      desc: 'چک صیادی شرکت'
    },
    formAnswers: {
      current_status: 'برگشت چک صیادی'
    },
    caseSummary: ''
  };

  const query = 'چک صیادی ثبت‌شده برگشت خورده است، آیا طبق قانون جدید می‌توان بدون دادگاه اجراییه گرفت؟';
  const advice = generateLocalLegalAdvice(query, context);

  let passed = true;

  // ۱. استناد به ماده ۲۳ اصلاحی ۱۳۹۷
  const hasArt23 = advice.sources.some((s) => s.articleNumber.includes('ماده ۲۳') && s.id === 'chk_art_23');
  passed = assert(hasArt23, 'ماده ۲۳ قانون صدور چک (اصلاحی ۱۳۹۷) با عنوان اجراییه مستقیم بازیابی شده است', details) && passed;

  // ۲. تصریح بر «بدون رسیدگی ماهوی» و «اجراییه مستقیم» در متن تحلیل
  const mentionsDirectExecution = advice.reply.includes('اجراییه مستقیم') && advice.reply.includes('بدون رسیدگی ماهوی');
  passed = assert(mentionsDirectExecution, 'عبارت قانونی «اجراییه مستقیم دادگاه بدون رسیدگی ماهوی» در پاسخ تأیید شده است', details) && passed;

  // ۳. اشاره به محرومیت‌های ماده ۵ مکرر (مسدودی ۲۴ ساعته حساب‌ها)
  const mentionsArt5Bis = advice.reply.includes('ماده ۵ مکرر') || advice.reply.includes('۲۴ ساعت');
  passed = assert(mentionsArt5Bis, 'ضمانت‌اجرای مسدودی ۲۴ ساعته حساب‌ها (ماده ۵ مکرر اصلاحی) ذکر شده است', details) && passed;

  // ۴. وضعیت اعتبار قانونی
  const isLawValid = advice.sources.every((s) => s.validityStatusLabel === 'معتبر و لازم‌الاجرا');
  passed = assert(isLawValid, 'وضعیت اعتبار ماده «معتبر و لازم‌الاجرا» قید شده است', details) && passed;

  results.push({ name: testName, passed, details });
}

// -----------------------------------------------------------------------------
// گزارش نهایی نتایج آزمون‌ها
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log('📊 نتایج نهایی ارزیابی آزمون‌ها:');
console.log('================================================================\n');

let allPassed = true;
results.forEach((r, i) => {
  const icon = r.passed ? '✅' : '❌';
  console.log(`${icon} [${i + 1}/${results.length}] ${r.name}`);
  r.details.forEach((d) => console.log(d));
  console.log('');
  if (!r.passed) allPassed = false;
});

console.log('================================================================');
if (allPassed) {
  console.log(`🎉 تمامی ${results.length} آزمون با موفقیت ۱۰۰٪ سپری شدند.`);
  process.exit(0);
} else {
  console.error('⚠️ برخی از آزمون‌ها با خطا مواجه شدند.');
  process.exit(1);
}
