/**
 * @license
 * سرویس ارتباط امن با مدل هوش مصنوعی Gemini (سمت سرور)
 * استفاده از SDK رسمی @google/genai و معماری RAG
 */

import { GoogleGenAI } from '@google/genai';
import { LegalArticle, CaseContext, ChatMessage } from '../types/legal.ts';

// ساخت کلاینت Gemini با رعایت هدر توصیه‌شده
const apiKey = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

/**
 * بازیابی و اعتبارسنجی نام مدل Gemini
 * جلوگیری از مقادیر نامعتبر محیطی مانند '1'، 'true' یا مقادیر عددی اشتباه
 * مدل پیش‌فرض رسمی و معتبر: gemini-3.8-flash
 */
export function resolveGeminiModelName(): string {
  const envModel = process.env.GEMINI_MODEL?.trim();

  // بررسی معتبر بودن مقدار متغیر محیطی
  if (
    envModel &&
    envModel !== '1' &&
    envModel !== 'true' &&
    envModel !== '0' &&
    (envModel.startsWith('gemini-') || envModel.startsWith('models/gemini-'))
  ) {
    return envModel.replace(/^models\//, '');
  }

  // مدل پیش‌فرض رسمی، سریع و پایدار (کاهش تأخیر و جلوگیری از بار سنگین 503)
  return 'gemini-3.5-flash';
}

/**
 * مدل‌های جایگزین سریع در صورت بار ترافیکی یا خطای موقت مدل اصلی
 */
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];

/**
 * پاکسازی امن پیام‌های خطا و جلوگیری از نشت کلید یا آدرس‌های داخلی
 */
export function sanitizeErrorMessage(rawMsg: string): string {
  if (!rawMsg) return '';
  return rawMsg
    .replace(/AIza[0-9A-Za-z\-_]{35}/g, '[کلید محرمانه]')
    .replace(/(?:key|token|api_key|apiKey|secret)=[a-zA-Z0-9_\-]+/gi, 'key=[محافظت‌شده]')
    .replace(/https?:\/\/[^\s]+/g, '[آدرس سرور سرویس‌دهنده]')
    .trim();
}

/**
 * تبدیل خطاهای مختلف Gemini به پیام‌های شفاف و محترمانه فارسی بدون نشت اطلاعات حساس
 */
export function parseGeminiError(error: any): string {
  const msg = String(error?.message || '');
  const status = error?.status || error?.statusCode;

  if (
    msg.includes('API key not valid') ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('PERMISSION_DENIED') ||
    status === 401 ||
    status === 403
  ) {
    return 'ارتباط با سامانه هوشمند در حال حاضر برقرار نیست. لطفاً دقایقی دیگر مجدداً تلاش فرمایید.';
  }

  if (
    msg.includes('is not found for API version') ||
    msg.includes('not supported for generateContent') ||
    msg.includes('NOT_FOUND') ||
    status === 404
  ) {
    return 'در پردازش هوشمند خطایی رخ داد. لطفاً پرسش خود را دوباره ارسال فرمایید.';
  }

  if (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    status === 429
  ) {
    return 'سامانه در حال حاضر با حجم بالای مراجعات روبرو است. لطفاً چند لحظه بعد مجدداً امتحان فرمایید.';
  }

  if (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    status === 503
  ) {
    return 'سامانه به دلیل ترافیک بالا با تأخیر موقت مواجه شد. لطفاً چند لحظه بعد مجدداً امتحان فرمایید.';
  }

  if (
    msg.includes('fetch failed') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ENOTFOUND')
  ) {
    return 'اختلال در اتصال به شبکه رخ داد. لطفاً اتصال اینترنت خود را بررسی نموده و مجدداً تلاش فرمایید.';
  }

  return 'در پردازش درخواست حقوقی مشکلی پیش آمد. لطفاً چند لحظه دیگر دوباره تلاش نمایید.';
}

/** ساخت پرامپت سیستمی تخصصی بر اساس قوانین جمهوری اسلامی ایران و زمینه پرونده */
function buildSystemInstruction(caseContext?: CaseContext, sources: LegalArticle[] = []): string {
  let contextSnippet = '';
  if (caseContext) {
    contextSnippet = `
اطلاعات پرونده و مشخصات کاربر:
- نام متقاضی: ${caseContext.userName || 'کاربر'}
- نوع شخصیت: ${caseContext.personType || 'نامشخص'}
- موضوع حقوقی پرونده: ${caseContext.legalCategory?.title || 'عمومی'} (${caseContext.legalCategory?.desc || ''})
- جزئیات فرم:
${Object.entries(caseContext.formAnswers || {})
  .map(([k, v]) => `  * ${k}: ${v}`)
  .join('\n')}
${caseContext.caseSummary ? `- شرح اولیه ثبت‌شده توسط کاربر: ${caseContext.caseSummary}` : ''}
`;
  }

  let sourcesSnippet = '';
  if (sources.length > 0) {
    sourcesSnippet = `
منابع و مواد قانونی بازیابی‌شده از پایگاه رسمی قوانین ایران (RAG Context):
${sources
  .map(
    (s, idx) => `
[منبع شماره ${idx + 1}]
عنوان سند: ${s.lawTitle}
شماره ماده: ${s.articleNumber}
عنوان بخش: ${s.title}
متن رسمی ماده:
${s.content}
${s.notes && s.notes.length > 0 ? `تبصره‌ها:\n${s.notes.join('\n')}` : ''}
وضعیت اعتبار: ${s.validityStatusLabel} (مرجع رسمی: ${s.officialSource})
`
  )
  .join('\n-------------------------\n')}
`;
  } else {
    sourcesSnippet = `
در پایگاه محلی، منبع ماده قانونی مستقیمی برای این پرسش دقیق یافت نشد. صریحاً اعلام کنید که استناد به ماده خاصی ثبت نشده است و از ابداع شماره ماده خودداری فرمایید.
`;
  }

  return `شما دستیار حقوقی هوشمند ایران با نام رسمی «صحیحی» هستید؛ مشاور هوشمند، دقیق و منضبط در حوزه قوانین و مقررات جمهوری اسلامی ایران.

هدف شما: ارائه راهنمایی اولیه، شفاف، کاربردی و مستند بر اساس قوانین ایران با حفظ امانت و صحت حقوقی.

${contextSnippet}

${sourcesSnippet}

دستورالعمل‌های حیاتی و الزامی:
۱. عدم جعل ماده قانونی: اکیداً و تحت هیچ شرایطی ماده قانونی، شماره رأی، تبصره یا نقل‌قول ساختگی اختراع نکنید. فقط در صورتی به مواد قانونی استناد کنید که در منابع مستند فوق ذکر شده باشند. اگر موضوع خارج از منابع است، صریحاً اعلام کنید که در پایگاه قوانین ثبت نشده است.
۲. مرزبندی موضوعی و انزوای دامنه (Domain Isolation):
   - در پرونده‌های «چک و سفته»، اکیداً و تحت هیچ عنوان به قوانین اجاره یا روابط موجر و مستأجر استناد نکنید مگر آنکه کاربر صریحاً در پرسش خود موضوع تخلیه ملک را مطرح کرده باشد.
   - هر موضوع صرفاً باید با قوانین تخصصی همان حوزه تحلیل شود.
۳. سؤالات تکمیلی در موارد مبهم:
   - چنانچه کاربر صرفاً عبارات کلی مانند «مطالبه طلب دارم» یا «چطور پولم را بگیرم» مطرح نمود و نوع مدرک مشخص نبود، پیش از هر نتیجه‌گیری قطعی، سؤالات تکمیلی بپرسید (نوع سند: چک، سفته، قرارداد عادی، فاکتور، رسید یا توافق شفاهی؛ حلول سررسید؛ ارسال اظهارنامه رسمی؛ وضعیت تمکن مالی بدهکار).
۴. مراجع صالح و دقت در تخلیه:
   - هرگز شورای حل اختلاف را به صورت خودکار یا تنها مرجع صالح فرض نکنید.
   - در قراردادهای دارای سند رسمی: مرجع منحصراً «دوایر اجرای ثبت اسناد و املاک» است.
   - در قراردادهای عادی مشمول قانون ۱۳۷۶: مرجع قضایی صالح (با توجه به قانون جدید شوراها و تأسیس دادگاه‌های صلح مصوب ۱۴۰۲، دادگاه صلح یا مرجع قضایی صالح)؛ و در صورت وجود سرقفلی، حق کسب و پیشه یا شمول قانون ۱۳۵۶ منحصراً «دادگاه عمومی حقوقی» صالح است.
   - تفکیک قطعی میان «دستور تخلیه» (فوری ظرف یک هفته بدون دادرسی ماهوی، مشروط به جمع شرایط ماده ۲ از جمله انقضای مدت و امضای دو شاهد) و «حکم تخلیه» (ترافعی، دادرسی کامل و قابل اعتراض) را تصریح نمایید.
۵. دقت در مقررات چک صیادی بر اساس آخرین اصلاحات ۱۳۹۷ و ۱۴۰۰:
   - ماده ۲۳: صدور اجراییه مستقیم دادگاه حقوقی علیه صادرکننده بدون رسیدگی ماهوی مشروط به عدم قید تضمین و شرط و داشتن کد رهگیری صیاد.
   - ماده ۵ مکرر: محرومیت‌های بانکی چهارگانه و انسداد وجوه کلیه حساب‌ها به میزان کسری چک پس از ۲۴ ساعت.
   - ماده ۲۱ مکرر: الزام ثبت و تأیید در سامانه صیاد و بی‌اعتباری تجاری چک ثبت‌نشده.
   - ماده ۱۱: مواعد ۶ ماهه مرور زمان شکایت کیفری چک بلامحل.
۶. زمینه پرونده: پاسخ را با شرایط خاص پرونده کاربر تطبیق دهید و نام او را در ابتدای پاسخ محترمانه قید کنید.
۷. تفکیک ارکان: بین متن قانون، تحلیل حقوقی و پیشنهاد عملی تفاوت قائل شوید.
۸. پرهیز از تضمین نتیجه: هرگز ادعای موفقیت قطعی یا پیروزی در دادگاه نداشته باشید؛ رویه قضایی و مدارک طرف مقابل بر نتیجه مؤثر است.
۹. قالب پاسخ: پاسخ را به زبان فارسی روان، رسا و با عناوین بخش‌های مشخص به شرح زیر تنظیم کنید:
   - **خلاصه راهنمایی**: پاسخ مستقیم و کوتاه به پرسش
   - **تحلیل حقوقی و انطباق با پرونده**: بررسی وضعیت حقوقی کاربر
   - **مستندات قانونی معتبر**: ذکر مواد قانونی برگرفته از منابع بالا به همراه عنوان دقیق
   - **اقدامات پیشنهادی بعدی و مراجع صالح**: مراحل عملی و مراجع قضایی یا ثبتی مربوطه
   - **مواعد و هشدارهای مهم**: مهلت‌های قانونی و نکات فوریتی
   - **تذکر قانونی**: یادآوری اینکه این راهنمایی جایگزین وکیل دادگستری نیست.`;
}

function buildContents(
  userQuery: string,
  history: ChatMessage[] = []
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const formattedContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  // آخرین چند نوبت گفتگو برای حفظ زمینه بدون سنگین کردن زمینه
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    if (msg.role === 'user') {
      formattedContents.push({ role: 'user', parts: [{ text: msg.content }] });
    } else if (msg.role === 'assistant') {
      formattedContents.push({ role: 'model', parts: [{ text: msg.content }] });
    }
  }

  // پیام جدید کاربر
  formattedContents.push({
    role: 'user',
    parts: [{ text: userQuery }]
  });

  return formattedContents;
}

/**
 * تولید پاسخ کامل با پشتیبانی از مدل‌های پرسرعت و بازیابی خودکار در صورت خطا
 */
export async function generateLegalResponse(
  userQuery: string,
  caseContext?: CaseContext,
  history: ChatMessage[] = [],
  sources: LegalArticle[] = []
): Promise<string> {
  const currentApiKey = process.env.GEMINI_API_KEY;
  if (!currentApiKey) {
    return `کاربر گرامی، ارتباط با سرویس هوشمند موقتاً برقرار نیست. در حال حاضر می‌توانید مواد و مستندات قانونی استخراج‌شده مرتبط با پرونده را در بخش منابع مشاهده فرمایید.`;
  }

  const primaryModel = resolveGeminiModelName();
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];
  const systemInstruction = buildSystemInstruction(caseContext, sources);
  const formattedContents = buildContents(userQuery, history);

  let lastError: any = null;

  for (const modelToRun of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelToRun,
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.25,
          topP: 0.95
        }
      });

      const replyText = response.text;
      if (replyText && replyText.trim()) {
        return replyText.trim();
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || '');
      // اگر خطای بار ترافیکی 503 یا عدم دسترسی بود، فوراً مدل بعدی آزمایش شود
      if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('not found') || err?.status === 503) {
        continue;
      }
      // اگر خطای اعتبارسنجی کلید یا سقف مجاز بود، مدل بعدی هم همان را خواهد داشت
      if (errMsg.includes('API key') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        throw new Error(parseGeminiError(err));
      }
    }
  }

  if (lastError) {
    throw new Error(parseGeminiError(lastError));
  }

  return 'پاسخی از مدل هوش مصنوعی دریافت نشد. لطفاً پرسش خود را دوباره مطرح فرمایید.';
}

/**
 * تولید پاسخ تدریجی (Streaming) برای نمایش آنی و کاهش چشمگیر زمان انتظار کاربر (TTFB)
 */
export async function* generateLegalResponseStream(
  userQuery: string,
  caseContext?: CaseContext,
  history: ChatMessage[] = [],
  sources: LegalArticle[] = []
): AsyncGenerator<string, void, unknown> {
  const currentApiKey = process.env.GEMINI_API_KEY;
  if (!currentApiKey) {
    yield `کاربر گرامی، ارتباط با سرویس هوشمند موقتاً برقرار نیست. لطفاً دقایقی دیگر مجدداً تلاش فرمایید.`;
    return;
  }

  const primaryModel = resolveGeminiModelName();
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];
  const systemInstruction = buildSystemInstruction(caseContext, sources);
  const formattedContents = buildContents(userQuery, history);

  let success = false;
  let lastError: any = null;

  for (const modelToRun of modelsToTry) {
    try {
      const responseStream = await ai.models.generateContentStream({
        model: modelToRun,
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.25,
          topP: 0.95
        }
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield chunk.text;
          success = true;
        }
      }

      if (success) {
        return;
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || '');
      if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('not found') || err?.status === 503) {
        continue;
      }
      if (errMsg.includes('API key') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        throw new Error(parseGeminiError(err));
      }
    }
  }

  if (lastError) {
    throw new Error(parseGeminiError(lastError));
  }
}
