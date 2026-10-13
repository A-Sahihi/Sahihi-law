/**
 * @license
 * موتور استنتاج حقوقی آفلاین / کلاینت برای دستیار حقوقی «صحیحی»
 * این ماژول بر پایه پایگاه اسناد قوانین رسمی جمهوری اسلامی ایران و بدون دخالت مدل زبانی (LLM)
 * با قواعد ساختاریافته و تضمین تفکیک قطعی حوزه‌های تخصصی فعالیت می‌کند.
 */

import { INITIAL_LEGAL_ARTICLES, knowledgeBase } from '../rag/knowledgeBase.ts';
import type { LegalArticle, CaseContext, VerifiedCitation } from '../types/legal.ts';
import { retrieveRelevantArticles, detectLegalIntent } from '../rag/retriever.ts';
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
  legalDomain: string;
  engineType: 'local_rule_based';
}

/** ساخت متن ساختاریافته حقوقی آفلاین بر مبنای قوانین واقعی RAG و تطبیق دامنه تخصصی */
export function generateLocalLegalAdvice(
  userQuery: string,
  caseContext?: CaseContext
): LocalChatResponse {
  // ۱. تشخیص پیشین و قطعی موضوع، هدف حقوقی کاربر و قواعد مرزبندی
  const intent = detectLegalIntent(userQuery, caseContext);

  // ۲. بازیابی مرتبط‌ترین مواد از پایگاه اسناد رسمی با فیلتر حوزه‌های ممنوعه
  const searchResults = retrieveRelevantArticles(userQuery, caseContext, 4);
  const relevantArticles = searchResults.map((r) => r.article);

  // آماده‌سازی کارت‌های منابع معتبر
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
  const categoryTitle = caseContext?.legalCategory?.title || intent.domainLabel;
  const currentStatus = caseContext?.formAnswers?.['current_status'] || 'در حال بررسی';
  const totalDbArticles = knowledgeBase.getAllArticles().length;

  let replyText = `سلام ${userName}. اطلاعات پرونده شما در موضوع «${categoryTitle}» و وضعیت «${currentStatus}» مورد ارزیابی قرار گرفت.\n\n`;

  // سناریوی الف: پرسش خارج از حیطه پایگاه منابع معتبر سامانه (Out of Scope)
  if (intent.isOutOfScope) {
    replyText += `### ⚠️ اعلام محدودیت پایگاه دانش تخصصی:\n`;
    replyText += `${intent.explanation}\n\n`;
    replyText += `پایگاه داده سامانه حقوقی «صحیحی» در نسخه فعلی شامل ${totalDbArticles} ماده و مقرره کلیدی از قوانین مصوب حقوقی (شامل قانون صدور چک، قانون مدنی، قانون روابط موجر و مستأجر، قانون کار، قانون تجارت و قانون حمایت خانواده) است.\n\n`;
    replyText += `📌 **پرهیز از جعل یا استناد ساختگی:** جهت رعایت امانت حرفه‌ای و صحت حقوقی، سامانه از ارائه شماره ماده غیراختصاصی یا استناد ساختگی خودداری می‌نماید.\n\n`;
    replyText += `### اقدامات پیشنهادی:\n`;
    replyText += `• جهت بررسی تخصصی این موضوع، به **سامانه ملی قوانین و مقررات جمهوری اسلامی ایران (qavanin.ir)** مراجعه فرمایید.\n`;
    replyText += `• توصیه می‌شود با وکیل پایه‌یک دادگستری متخصص در این حوزه مشورت نمایید.\n\n`;
    replyText += `---\n`;
    replyText += `ℹ️ *وضعیت موتور پردازش:* موتور استنتاج محلی کلاینت (قواعد قطعی پایگاه قوانین بدون دخالت هوش مصنوعی زبانی).`;

    return {
      reply: replyText,
      sources: [],
      citations: [],
      isOfflineMode: true,
      legalDomain: intent.primaryDomain,
      engineType: 'local_rule_based'
    };
  }

  // سناریوی ب: سؤال مبهم درباره مطالبه طلب بدون مشخص بودن سند یا ارکان دِین
  if (intent.isAmbiguous) {
    replyText += `### ۱. ارزیابی اولیه و نیاز به اطلاعات تکمیلی:\n`;
    replyText += `درخواست شما مبنی بر مطالبه طلب مورد بررسی قرار گرفت؛ اما با توجه به اینکه نوع سند اثباتی و منشأ بدهی مشخص نشده است، اطلاعات پرونده برای نتیجه‌گیری قطعی حقوقی و تعیین مرجع صالح کافی نمی‌باشد.\n\n`;

    replyText += `### ۲. سؤالات تکمیلی ضروری جهت ادامه راهنمایی:\n`;
    replyText += `لطفاً جهت راهنمایی دقیق، به موارد زیر پاسخ دهید:\n`;
    if (intent.clarifyingQuestions) {
      intent.clarifyingQuestions.forEach((q, idx) => {
        replyText += `  ${idx + 1}. **${q}**\n`;
      });
    }
    replyText += `\n`;

    if (relevantArticles.length > 0) {
      replyText += `### ۳. مستند قانونی معتبر حاکم بر مطالبه دیون نقد:\n`;
      for (const art of relevantArticles) {
        replyText += `📌 **${art.lawTitle} - ${art.articleNumber} (${art.title}):**\n`;
        replyText += `> ${art.content}\n`;
        if (art.notes && art.notes.length > 0) {
          replyText += `*نکته اجرایی و تبصره:* ${art.notes.join(' ')}\n`;
        }
        replyText += `*(وضعیت اعتبار: ${art.validityStatusLabel} · مرجع رسمی: ${art.officialSource})*\n\n`;
      }
    }

    replyText += `### ۴. گام عملی فوری پیشنهادی:\n`;
    replyText += `• چنانچه طلب شما مستند به سند تجاری نیست، گام نخست قانونی، تنظیم و ارسال **«اظهارنامه رسمی»** از طریق دفاتر خدمات الکترونیک قضایی است تا تاریخ مطالبه به‌طور رسمی ثبت گردیده و خسارت تأخیر تأدیه از آن تاریخ محاسبه شود.\n\n`;
    replyText += `---\n`;
    replyText += `ℹ️ *شفافیت پردازش:* پاسخ از طریق موتور استنتاج محلی کلاینت (Rule-based) بدون دخالت مدل زبانی (LLM) تولید شده است.`;

    const citations = verifyCitations(replyText, relevantArticles);
    return {
      reply: replyText,
      sources: safeSources,
      citations,
      isOfflineMode: true,
      legalDomain: intent.primaryDomain,
      engineType: 'local_rule_based'
    };
  }

  // سناریوی ج: پرسش مرتبط و دارای مستندات قانونی مشخص در حوزه تخصصی
  if (relevantArticles.length > 0) {
    const primary = relevantArticles[0];

    replyText += `### ۱. خلاصه راهنمایی و ارزیابی اولیه:\n`;
    replyText += `بر اساس داده‌های پرونده، حوزه حقوقی شما **«${intent.domainLabel}»** تشخیص داده شد و مستندات مستقیماً از قوانین رسمی جمهوری اسلامی ایران استخراج گردیدند. مهم‌ترین مستند حاکم، **${primary.lawTitle}** و به ویژه **${primary.articleNumber} (${primary.title})** می‌باشد.\n\n`;

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

    // ارزیابی تفکیک‌شده و دقیق مراجع صالح بر اساس حوزه تخصصی تشخیص‌داده‌شده
    if (intent.primaryDomain === 'cheque_promissory') {
      replyText += `• **اقدامات فوری در حوزه چک و اسناد تجاری:**\n`;
      replyText += `  - **اجراییه مستقیم دادگاه (ماده ۲۳ اصلاحی ۱۳۹۷):** در صورت ثبت چک در سامانه صیاد و عدم قید عبارات تضمینی یا مشروط در متن آن، بدون نیاز به دادرسی ماهوی طولانی، می‌توانید مستقیماً از طریق دادگاه حقوقی تقاضای صدور اجراییه نمایید.\n`;
      replyText += `  - **مسدودی حساب‌ها (ماده ۵ مکرر):** ظرف ۲۴ ساعت از ثبت گواهینامه عدم پرداخت در سامانه بانک مرکزی، کلیه حساب‌های بانکی صادرکننده در تمامی بانک‌ها به میزان کسری چک مسدود می‌گردد.\n`;
      replyText += `  - **شکایت کیفری (ماده ۱۱):** چنانچه قصد شکایت کیفری دارید، باید ظرف ۶ ماه از تاریخ سررسید به بانک مراجعه کرده و ظرف ۶ ماه از صدور گواهی عدم پرداخت، شکایت کیفری را در دادسرا ثبت کنید.\n`;
      replyText += `  - **سفته (مواد ۲۸۰ و ۳۰۷ تجارت):** جهت حفظ مسئولیت تضامنی ظهرنویسان و ضامنان سفته، انجام «واخواست عدم تأدیه» ظرف ۱۰ روز کاری از تاریخ سررسید الزامی است.\n`;
      replyText += `  - **نکته وضعیت مذاکره و توافق:** در صورت توافق، تنظیم صورت‌جلسه کتبی رسمی یا اقرارنامه با ذکر شماره صیادی چک و تعیین سررسید جدید الزامی است تا حقوق قانونی زایل نگردد.\n`;
    } else if (intent.primaryDomain === 'lease_tenancy') {
      replyText += `• **تفکیک مراجع صالح در دعاوی تخلیه و اجاره:**\n`;
      replyText += `  - **قراردادهای با سند رسمی:** منحصراً دوایر اجرای ثبت اسناد و املاک محل ملک صالح به رسیدگی و صدور اجراییه تخلیه هستند.\n`;
      replyText += `  - **دستور تخلیه فوری (ماده ۲ و ۳ قانون ۱۳۷۶):** در صورت وجود قرارداد عادی در دو نسخه با امضای دو شاهد معتمد و انقضای مدت، مرجع قضایی صالح (دادگاه صلح یا مرجع قضایی ذی‌صلاح طبق قانون جدید شوراها مصوب ۱۴۰۲) ظرف یک هفته «دستور تخلیه فوری» بدون دادرسی ماهوی صادر می‌نماید.\n`;
      replyText += `  - **حکم تخلیه ترافعی:** در صورت فقدان شرایط فوری (مانند عدم امضای دو شاهد، ادعای تمدید شفاهی یا شمول قانون ۱۳۵۶ و سرقفلی)، رسیدگی نیازمند دادخواست «حکم تخلیه» و دادرسی ماهوی در دادگاه عمومی حقوقی است.\n`;
      replyText += `  - **الزام تودیع ودیعه (ماده ۴):** پیش از اجرای تخلیه، موجر مکلف است مبلغ ودیعه را به حساب صندوق دادگستری واریز نماید.\n`;
    } else if (intent.primaryDomain === 'labor_insurance') {
      replyText += `• **اقدامات در حوزه کار و تأمین اجتماعی:**\n`;
      replyText += `  - **مرجع صالح رسیدگی:** هیئت تشخیص و سپس هیئت حل اختلاف اداره تعاون، کار و رفاه اجتماعی محل کارگاه.\n`;
      replyText += `  - **تکلیف قطعی بیمه (ماده ۱۴۸ کار):** پرداخت حق بیمه قانوناً آمره است و هرگونه توافق مبنی بر عدم واریز بیمه یا دریافت نقدی به جای بیمه باطل و بی‌اثر است.\n`;
      replyText += `  - **حق سنوات (ماده ۲۴ کار):** به ازای هر سال سابقه کار، یک ماه آخرین حقوق ثابت (مزد ثابت) باید به عنوان مزایای پایان کار پرداخت شود.\n`;
    } else if (intent.primaryDomain === 'family') {
      replyText += `• **اقدامات در حوزه حقوق خانواده:**\n`;
      replyText += `  - **مرجع صالح مهریه:** مطالبه مهریه دارای سند رسمی بدواً از طریق دوایر اجرای ثبت اسناد رسمی انجام شده و در صورت عدم دستیابی به اموال، از طریق دادگاه خانواده پیگیری می‌شود.\n`;
      replyText += `  - **سقف ۱۱۰ سکه (ماده ۲۲ حمایت خانواده):** ضمانت اجرای حبس و جلب منحصراً تا ۱۱۰ سکه بهار آزادی یا معادل ریالی آن اعمال می‌گردد؛ مازاد بر آن منوط به اثبات ملائت مالی زوج است.\n`;
      replyText += `  - **محاسبه به نرخ روز (ماده ۱۰۸۲ مدنی):** مهریه وجه رایج بر اساس شاخص بهای سالانه بانک مرکزی تعدیل می‌گردد.\n`;
      replyText += `  - **حضانت فرزندان (ماده ۱۱۶۹ مدنی):** اولویت حضانت تا ۷ سالگی با مادر و پس از آن با پدر است؛ در صورت اختلاف، مصلحت طفل ملاک رأی دادگاه خواهد بود.\n`;
    } else if (intent.primaryDomain === 'criminal') {
      replyText += `• **اقدامات در مراجع کیفری:**\n`;
      replyText += `  - **مرجع صالح:** دادسرای عمومی و انقلاب حوزه قضایی محل وقوع جرم.\n`;
      replyText += `  - **کلاهبرداری (ماده ۱ تشدید):** اثبات مانور متقلبانه، فریب مالباخته و بردن مال ضروری است؛ صرف عدم پرداخت وجه دِین، جرم کلاهبرداری محسوب نمی‌شود.\n`;
      replyText += `  - **خیانت در امانت (ماده ۶۷۴ مجازات):** لزوم اثبات سپردن مال و امانی بودن آن به متهم، و اقدام وی به تصاحب، اتلاف، استعمال یا مفقود کردن مال به ضرر مالک.\n`;
    } else {
      replyText += `• **اقدامات عمومی مطالبات و قراردادها:**\n`;
      replyText += `  - **ارسال اظهارنامه رسمی:** ارسال اخطار رسمی از طریق دفاتر خدمات الکترونیک قضایی جهت اثبات موعد و ابلاغ اراده.\n`;
      replyText += `  - **تأمین خواسته فوری:** درخواست توقیف اموال بدهکار پیش از ابلاغ دادخواست، در صورت وجود اسناد معتبر تجاری یا قرارداد رسمی.\n`;
    }

    replyText += `\n### ۴. مواعد و هشدارهای مهم حقوقی:\n`;
    replyText += `• به مواعد قانونی واخواست، مرور زمان، اعتراض به آراء و انقضای قراردادها دقت ویژه داشته باشید.\n`;
    replyText += `• کلیه مستندات، فیش‌های واریزی، پیامک‌ها و قراردادها را به‌طور مستند جمع‌آوری فرمایید.\n\n`;
    replyText += `⚠️ *تذکر قانونی و شفافیت سامانه:*\n`;
    replyText += `این تحلیل بر مبنای قوانین رسمی جمهوری اسلامی ایران و با استفاده از **موتور استنتاج محلی قواعد حقوقی (Rule-Based Offline Engine)** تولید شده است. به دلیل عدم وابستگی به سرور در حالت آفلاین، این پاسخ بر پایه قواعد ثابت و مواد مصوب بوده و بدون دخالت مدل هوش مصنوعی زبانی (LLM) ارائه شده است. مشاوره با وکیل پایه‌یک دادگستری برای اقدامات دادگاهی توصیه می‌گردد.`;
  } else {
    replyText += `پرسش شما دریافت شد، اما برای کلیدواژه‌های ارائه‌شده ماده مستقیمی در بانک قوانین فوری سامانه (${totalDbArticles} ماده مصوب) یافت نشد.\n\n`;
    replyText += `جهت بازیابی دقیق‌ترین مستندات قانونی، پیشنهاد می‌شود پرسش خود را با کلیدواژه‌های رسمی مانند «اجراییه چک صیادی»، «دستور تخلیه ملک»، «خسارت تأخیر تأدیه»، «بیمه کارگر» یا «مهریه» مطرح فرمایید.`;
  }

  const citations = verifyCitations(replyText, relevantArticles);

  return {
    reply: replyText,
    sources: safeSources,
    citations,
    isOfflineMode: true,
    legalDomain: intent.primaryDomain,
    engineType: 'local_rule_based'
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
