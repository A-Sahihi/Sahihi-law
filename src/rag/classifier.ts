/**
 * @license
 * موتور تشخیص موضوع و هدف حقوقی (Legal Intent & Domain Classifier)
 * تفکیک دقیق حوزه‌های تخصصی حقوقی ایران جهت جلوگیری از بازیابی استنادات نامرتبط
 */

import type { CaseContext } from '../types/legal.ts';
import { normalizePersianText } from './retriever.ts';

export type LegalDomain =
  | 'cheque_promissory'   // چک و سفته و اسناد تجاری
  | 'lease_tenancy'       // روابط موجر و مستأجر و تخلیه
  | 'family'              // حقوق خانواده، مهریه، نفقه، حضانت
  | 'labor_insurance'     // حقوق کار و تأمین اجتماعی
  | 'criminal'            // مسائل کیفری (کلاهبرداری، خیانت در امانت)
  | 'contracts_debt'      // قراردادها، تعهدات، خسارت تأخیر تأدیه
  | 'ambiguous_debt'      // سؤال مبهم درباره مطالبه طلب (نیاز به اطلاعات تکمیلی)
  | 'out_of_scope';       // خارج از محدوده پایگاه منابع معتبر سامانه

export interface LegalIntentResult {
  primaryDomain: LegalDomain;
  domainLabel: string;
  confidence: number;
  isAmbiguous: boolean;
  isOutOfScope: boolean;
  clarifyingQuestions?: string[];
  allowedCategories: string[];
  forbiddenCategories: string[];
  explanation: string;
}

/** الگوهای تشخیص پرسش‌های مبهم درباره مطالبه طلب */
const AMBIGUOUS_DEBT_PATTERNS = [
  /^مطالبه\s+طلب$/,
  /^طلب\s+دارم$/,
  /^چطور\s+(می\s*توانم\s+)?طلبم\s*(رو|را)\s*(بگیرم|وصول\s*کنم|پس\s*بگیرم)/,
  /^چگونه\s+طلبم\s*را\s*(وصول\s*کنم|مطالبه\s*کنم|بگیرم)/,
  /^از\s+کسی\s+طلبکارم/,
  /^از\s+کسی\s+طلب\s+دارم/,
  /^بدهکار\s+پولم\s*(رو|را)\s*نمی\s*دهد/,
  /^پولم\s*(رو|را)\s*نمی\s*دهد/,
  /^می\s*خواهم\s+پولم\s*(رو|را)\s*پس\s*بگیرم/,
  /^برای\s+گرفتن\s+طلبم\s+چکار\s+کنم/
];

/** الگوهای تشخیص پرسش‌های خارج از دامنه (Out of Scope) */
const OUT_OF_SCOPE_KEYWORDS = [
  'بیت کوین', 'ارز دیجیتال', 'رمزارز', 'کریپتو', 'ماینینگ', 'بلاکچین',
  'گمرک', 'ترخیص کالا', 'قاچاق کالا', 'تعرفه گمرکی', 'اظهارنامه گمرکی',
  'ثبت اختراع', 'پتنت', 'علائم تجاری بین المللی', 'کپی رایت بین المللی',
  'دریانوردی', 'کشتی رانی', 'حقوق دریایی', 'حمل دریایی',
  'پروانه ساخت', 'کمیسیون ماده ۱۰۰', 'شهرداری منطقه', 'جواز ساخت',
  'سربازی', 'نظام وظیفه', 'معافیت پزشکی', 'کسری خدمت',
  'ویزا', 'پناهندگی', 'اقامت کانادا', 'اقامت اروپا', 'مهاجرت کاری'
];

/** کلیدواژه‌های اختصاصی هر حوزه حقوقی */
const DOMAIN_KEYWORDS = {
  cheque_promissory: [
    'چک', 'صیاد', 'صیادی', 'سفته', 'برات', 'واخواست', 'ظهرنویس', 'ظهرنویسی',
    'بلامحل', 'برگشت چک', 'مسدودی حساب', 'کد رهگیری صیاد', 'اجراییه مستقیم',
    'ماده ۲۳', 'ماده ۵ مکرر', 'ماده ۲۱ مکرر', 'ماده ۱۱ چک', 'ماده ۳۰۷', 'ماده ۲۸۰',
    'دسته چک', 'چک بنفش', 'فته طلب', 'دارنده چک', 'گواهی عدم پرداخت'
  ],
  lease_tenancy: [
    'اجاره', 'موجر', 'مستاجر', 'مستأجر', 'تخلیه', 'دستور تخلیه', 'حکم تخلیه',
    'ودیعه', 'پول پیش', 'اجاره بها', 'مال الاجاره', 'سرقفلی', 'کسب و پیشه',
    'اماکن تجاری', 'اماکن مسکونی', 'ماده ۲ موجر', 'ماده ۳ موجر', 'ماده ۴ موجر',
    'قانون ۷۶', 'قانون ۱۳۷۶', 'قانون ۵۶', 'قانون ۱۳۵۶', 'تمدید اجاره', 'انقضای مدت'
  ],
  family: [
    'مهریه', 'مهر', 'زوجه', 'زوج', 'طلاق', 'نفقه', 'حضانت', 'فرزند مشترک',
    '۱۱۰ سکه', 'سکه بهار آزادی', 'ماده ۱۰۸۲', 'ماده ۱۱۶۹', 'ماده ۲۲ حمایت خانواده',
    'نرخ روز مهریه', 'اجرت المثل', 'تمکین', 'عدم تمکین', 'جهیزیه', 'عسر و حرج'
  ],
  labor_insurance: [
    'کارگر', 'کارفرما', 'اداره کار', 'بیمه کارگر', 'حق بیمه', 'تامین اجتماعی',
    'سنوات', 'حق سنوات', 'پایان کار', 'ماده ۱۴۸', 'ماده ۲۴ کار', 'اخراج کارگر',
    'عیدی', 'پاداش', 'مرخصی استحقاقی', 'حوادث ناشی از کار', 'هیئت تشخیص'
  ],
  criminal: [
    'کلاهبرداری', 'خیانت در امانت', 'مانور متقلبانه', 'بردن مال غیر',
    'ماده ۱ تشدید', 'ماده ۶۷۴', 'رد مال', 'جرم کیفری', 'دادسرا',
    'شکواییه', 'تحصیل مال نامشروع', 'چک امانی', 'امانت'
  ]
};

/**
 * تشخیص دقیق موضوع و هدف حقوقی کاربر
 */
export function detectLegalIntent(
  query: string,
  context?: CaseContext
): LegalIntentResult {
  const normQuery = normalizePersianText(query);

  // ۱. بررسی موضوعات خارج از محدوده منابع معتبر سامانه (Out of Scope)
  for (const kw of OUT_OF_SCOPE_KEYWORDS) {
    const normKw = normalizePersianText(kw);
    if (normQuery.includes(normKw)) {
      return {
        primaryDomain: 'out_of_scope',
        domainLabel: 'خارج از محدوده پایگاه قوانین سامانه',
        confidence: 0.95,
        isAmbiguous: false,
        isOutOfScope: true,
        allowedCategories: [],
        forbiddenCategories: [
          'چک و سفته', 'روابط موجر و مستأجر', 'حقوق خانواده',
          'حقوق کار و تأمین اجتماعی', 'مسائل کیفری', 'قراردادها و تعهدات'
        ],
        explanation: `موضوع پرسش مرتبط با «${kw}» بوده که خارج از پایگاه قوانین رسمی مصوب ثبت‌شده در سامانه «صحیحی» است.`
      };
    }
  }

  // ۲. بررسی سؤالات مبهم درباره مطالبه طلب بدون مشخص بودن سند یا ماهیت
  // اگر کاربر به صراحت نگوید چک، سفته، قرارداد، اجاره و فقط بگوید «طلب دارم / چطور طلبم را بگیرم»
  const hasSpecificInstrument = [
    'چک', 'سفته', 'قرارداد', 'اجاره', 'ودیعه', 'مهریه', 'سنوات',
    'بیمه', 'فاکتور', 'رسید', 'رسید دستی', 'دست نویس', 'اظهارنامه',
    'تضمین', 'کلاهبرداری', 'امانت'
  ].some((inst) => normQuery.includes(inst));

  const isAmbiguousQueryPattern = AMBIGUOUS_DEBT_PATTERNS.some((pattern) =>
    pattern.test(normQuery.trim())
  );

  const isGenericShortDebt =
    !hasSpecificInstrument &&
    (normQuery.includes('مطالبه طلب') ||
      (normQuery.includes('طلب') && normQuery.length < 35 && !normQuery.includes('موجر')));

  if (isAmbiguousQueryPattern || isGenericShortDebt) {
    return {
      primaryDomain: 'ambiguous_debt',
      domainLabel: 'مطالبه طلب (نیاز به مشخص‌سازی مستند و ادله)',
      confidence: 0.9,
      isAmbiguous: true,
      isOutOfScope: false,
      clarifyingQuestions: [
        'مستند و مدرک طلب شما چیست؟ (چک صیادی بنفش، سفته واخواست‌شده، قرارداد رسمی/عادی، فاکتور معتبر، رسید دستی یا فیش واریز بانکی؟)',
        'آیا موعد سررسید پرداخت بدهی فرا رسیده است یا طلب عندالمطالبه می‌باشد؟',
        'آیا تاکنون «اظهارنامه رسمی» از طریق دفاتر خدمات الکترونیک قضایی برای بدهکار ارسال نموده‌اید؟',
        'آیا از وضعیت مالی بدهکار و وجود اموال رسمی جهت درخواست «تأمین خواسته و توقیف اموال» اطلاع دارید؟'
      ],
      allowedCategories: ['قراردادها و تعهدات'],
      forbiddenCategories: [
        'روابط موجر و مستأجر', 'حقوق خانواده', 'حقوق کار و تأمین اجتماعی'
      ],
      explanation: 'پرسش مطرح‌شده فاقد اطلاعات کافی درباره منشأ دین و مستندات اثباتی است و نیازمند پرسیدن سؤالات تکمیلی می‌باشد.'
    };
  }

  // ۳. بررسی هدف مستقیم در متن پرسش بر اساس کلیدواژه‌های اختصاصی
  const scores: Record<LegalDomain, number> = {
    cheque_promissory: 0,
    lease_tenancy: 0,
    family: 0,
    labor_insurance: 0,
    criminal: 0,
    contracts_debt: 0,
    ambiguous_debt: 0,
    out_of_scope: 0
  };

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const kw of keywords) {
      const normKw = normalizePersianText(kw);
      if (normQuery.includes(normKw)) {
        scores[domain as LegalDomain] += 3;
      }
    }
  }

  // کلیدواژه‌های قراردادها و تعهدات عمومی
  const contractKeywords = [
    'قرارداد', 'توافق', 'تعهد', 'ماده ۱۰', 'ماده ۲۳۰', 'وجه التزام',
    'خسارت تاخیر', 'خسارت تأخیر تأدیه', 'شاخص تورم', 'بانک مرکزی',
    'ماده ۵۲۲', 'اظهارنامه رسمی', 'دین'
  ];
  for (const kw of contractKeywords) {
    const normKw = normalizePersianText(kw);
    if (normQuery.includes(normKw)) {
      scores.contracts_debt += 2;
    }
  }

  // ۴. ادغام زمینه پرونده (CaseContext)
  // در صورتی که پرسش کاربر کوتاه یا پیگیری مرحله‌ای باشد (مانند "در حال مذاکره و توافق هستیم چکار کنم؟")
  // زمینه پرونده نقش جهت‌دهنده و قطعی دارد.
  if (context?.legalCategory?.title) {
    const catTitle = normalizePersianText(context.legalCategory.title);
    const catId = context.legalCategory.id || '';

    if (catId === 'cheque' || catTitle.includes('چک') || catTitle.includes('سفته')) {
      scores.cheque_promissory += 6;
    } else if (catId === 'rent' || catTitle.includes('موجر') || catTitle.includes('اجاره')) {
      scores.lease_tenancy += 6;
    } else if (catId === 'family' || catTitle.includes('خانواده') || catTitle.includes('مهریه')) {
      scores.family += 6;
    } else if (catId === 'labor' || catTitle.includes('کار') || catTitle.includes('بیمه')) {
      scores.labor_insurance += 6;
    } else if (catId === 'crime' || catTitle.includes('کیفر')) {
      scores.criminal += 6;
    } else if (catId === 'contract' || catTitle.includes('قرارداد')) {
      scores.contracts_debt += 6;
    }
  }

  // پیدا کردن حوزه‌ای با بیشترین امتیاز
  let maxScore = 0;
  let detectedDomain: LegalDomain = 'contracts_debt';

  const candidateDomains: LegalDomain[] = [
    'cheque_promissory', 'lease_tenancy', 'family',
    'labor_insurance', 'criminal', 'contracts_debt'
  ];

  for (const d of candidateDomains) {
    if (scores[d] > maxScore) {
      maxScore = scores[d];
      detectedDomain = d;
    }
  }

  // در صورتی که کاربر مشخصاً در پرونده چک و سفته است، ولی کلماتی مانند «توافق» دارد،
  // حوزه چک و سفته باید بدون تردید حفظ شود.
  if (
    context?.legalCategory?.title?.includes('چک') ||
    context?.legalCategory?.id === 'cheque'
  ) {
    // اگر پرسش صراحتاً درباره تخلیه ملک یا مهریه نباشد، حوزه الزاماً چک و سفته است
    const mentionsLeaseExplicitly = ['تخلیه', 'موجر', 'مستاجر', 'مستأجر'].some((w) =>
      normQuery.includes(w)
    );
    if (!mentionsLeaseExplicitly) {
      detectedDomain = 'cheque_promissory';
    }
  } else if (
    context?.legalCategory?.title?.includes('موجر') ||
    context?.legalCategory?.id === 'rent'
  ) {
    const mentionsChequeExplicitly = ['چک برگشتی', 'صیاد', 'واخواست'].some((w) =>
      normQuery.includes(w)
    );
    if (!mentionsChequeExplicitly) {
      detectedDomain = 'lease_tenancy';
    }
  }

  // ۵. اعمال قواعد تفکیک و محافظت از مرزهای حقوقی (Guardrails)
  switch (detectedDomain) {
    case 'cheque_promissory':
      return {
        primaryDomain: 'cheque_promissory',
        domainLabel: 'چک، سفته و اسناد تجاری',
        confidence: Math.min(1.0, 0.7 + maxScore * 0.05),
        isAmbiguous: false,
        isOutOfScope: false,
        allowedCategories: ['چک و سفته', 'قراردادها و تعهدات'],
        forbiddenCategories: [
          'روابط موجر و مستأجر',
          'حقوق خانواده',
          'حقوق کار و تأمین اجتماعی'
        ],
        explanation: 'موضوع پرونده ناظر بر اسناد تجاری (چک و سفته) است؛ هرگونه استناد به قوانین اجاره یا خانواده اکیداً نامرتبط و ممنوع است.'
      };

    case 'lease_tenancy':
      return {
        primaryDomain: 'lease_tenancy',
        domainLabel: 'روابط موجر و مستأجر و تخلیه ملک',
        confidence: Math.min(1.0, 0.7 + maxScore * 0.05),
        isAmbiguous: false,
        isOutOfScope: false,
        allowedCategories: ['روابط موجر و مستأجر', 'قراردادها و تعهدات'],
        forbiddenCategories: [
          'چک و سفته',
          'حقوق خانواده',
          'حقوق کار و تأمین اجتماعی',
          'مسائل کیفری'
        ],
        explanation: 'موضوع پرونده ناظر بر روابط موجر و مستأجر، دستور تخلیه و اجاره‌بها می‌باشد.'
      };

    case 'family':
      return {
        primaryDomain: 'family',
        domainLabel: 'حقوق خانواده، مهریه و حضانت',
        confidence: Math.min(1.0, 0.7 + maxScore * 0.05),
        isAmbiguous: false,
        isOutOfScope: false,
        allowedCategories: ['حقوق خانواده', 'قراردادها و تعهدات'],
        forbiddenCategories: [
          'روابط موجر و مستأجر',
          'چک و سفته',
          'حقوق کار و تأمین اجتماعی'
        ],
        explanation: 'موضوع پرونده ناظر بر حقوق خانواده، مهریه، نفقه و حضانت فرزندان است.'
      };

    case 'labor_insurance':
      return {
        primaryDomain: 'labor_insurance',
        domainLabel: 'حقوق کار و تأمین اجتماعی',
        confidence: Math.min(1.0, 0.7 + maxScore * 0.05),
        isAmbiguous: false,
        isOutOfScope: false,
        allowedCategories: ['حقوق کار و تأمین اجتماعی'],
        forbiddenCategories: [
          'روابط موجر و مستأجر',
          'حقوق خانواده',
          'چک و سفته'
        ],
        explanation: 'موضوع پرونده ناظر بر روابط کارگری و کارفرمایی، بیمه اجباری و سنوات پایان کار است.'
      };

    case 'criminal':
      return {
        primaryDomain: 'criminal',
        domainLabel: 'مسائل کیفری (کلاهبرداری و خیانت در امانت)',
        confidence: Math.min(1.0, 0.7 + maxScore * 0.05),
        isAmbiguous: false,
        isOutOfScope: false,
        allowedCategories: ['مسائل کیفری'],
        forbiddenCategories: [
          'روابط موجر و مستأجر',
          'حقوق خانواده',
          'حقوق کار و تأمین اجتماعی'
        ],
        explanation: 'موضوع پرونده جنبه کیفری داشته و ناظر بر تحقق ارکان مادی و معنوی جرایم مالی است.'
      };

    default:
      return {
        primaryDomain: 'contracts_debt',
        domainLabel: 'قراردادها، تعهدات و مطالبات مالی',
        confidence: 0.65,
        isAmbiguous: false,
        isOutOfScope: false,
        allowedCategories: ['قراردادها و تعهدات'],
        forbiddenCategories: [
          'روابط موجر و مستأجر',
          'حقوق خانواده',
          'حقوق کار و تأمین اجتماعی'
        ],
        explanation: 'موضوع پرونده مربوط به اصول کلی قراردادها و تعهدات مالی و جبران خسارت است.'
      };
  }
}
