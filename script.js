/**
 * @license
 * دستیار حقوقی هوشمند ایران - منطق فرانت‌اند (JavaScript خالص)
 * طراحی و پیاده‌سازی بر اساس قوانین جمهوری اسلامی ایران
 */

// ============================================================================
// ۱. داده‌های پایه و موضوعات حقوقی
// ============================================================================

const LEGAL_CATEGORIES = [
  {
    id: 'cheque_promissory',
    title: 'چک و سفته',
    desc: 'چک‌های صیادی، برگشت زدن، توقیف اموال، ظهرنویسی، واخواست و مطالبه وجه سفته',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>`,
    priorityPerson: ['حقیقی', 'حقوقی']
  },
  {
    id: 'landlord_tenant',
    title: 'روابط موجر و مستأجر',
    desc: 'دستور و حکم تخلیه، استرداد ودیعه، تعدیل اجاره‌بها، تعمیرات اساسی و قراردادها',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    priorityPerson: ['حقیقی', 'حقوقی']
  },
  {
    id: 'contracts',
    title: 'قراردادها و تعهدات',
    desc: 'فسخ و بطلان قرارداد، الزام به ایفای تعهد، خسارت تأخیر تأدیه و شرایط فسخ',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    priorityPerson: ['حقیقی', 'حقوقی']
  },
  {
    id: 'family_law',
    title: 'حقوق خانواده',
    desc: 'مهریه، نفقه، حضانت فرزندان، تمکین، طلاق و شروط دوازده‌گانه ضمن عقد نکاح',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    priorityPerson: ['حقیقی']
  },
  {
    id: 'inheritance_wills',
    title: 'ارث و وصیت',
    desc: 'انحصار وراثت، تقسیم ترکه، سهم‌الارث طبقات، وصیت‌نامه رسمی و تحریر ترکه',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 12h10M7 17h6"/></svg>`,
    priorityPerson: ['حقیقی']
  },
  {
    id: 'labor_social_security',
    title: 'حقوق کار و تأمین اجتماعی',
    desc: 'شکایات اداره کار، سنوات و عیدی، بیمه اجباری، اخراج و حوادث ناشی از کار',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    priorityPerson: ['حقیقی', 'حقوقی']
  },
  {
    id: 'criminal_matters',
    title: 'مسائل کیفری',
    desc: 'کلاهبرداری، خیانت در امانت، سرقت، تهدید و توهین، ضرب و جرح و جعل اسناد',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    priorityPerson: ['حقیقی', 'حقوقی']
  },
  {
    id: 'real_estate',
    title: 'مسائل ملکی',
    desc: 'الزام به تنظیم سند رسمی، تصرف عدوانی، خلع ید، افراز و دستور فروش ملک مشاع',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    priorityPerson: ['حقیقی', 'حقوقی']
  },
  {
    id: 'corporate_business',
    title: 'امور شرکت‌ها و کسب‌وکارها',
    desc: 'ثبت تغییرات، مسئولیت مدیران، انحلال و ورشکستگی، دعاوی شرکا و اساسنامه',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="22.01"/><line x1="15" y1="22" x2="15" y2="22.01"/><line x1="9" y1="18" x2="9" y2="18.01"/><line x1="15" y1="18" x2="15" y2="18.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/></svg>`,
    priorityPerson: ['حقوقی']
  },
  {
    id: 'tax_affairs',
    title: 'امور مالیاتی',
    desc: 'اعتراض به برگ تشخیص، معافیت‌ها، مالیات مشاغل، ارزش افزوده و هیئت‌های حل اختلاف',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/></svg>`,
    priorityPerson: ['حقوقی', 'حقیقی']
  },
  {
    id: 'banking_finance',
    title: 'امور بانکی',
    desc: 'تسهیلات و وام‌ها، سود غیرمتعارف، جرایم دیرکرد، ضمانت‌نامه‌ها و مزایده وثایق',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="5 6 12 3 19 6"/><line x1="4" y1="10" x2="4" y2="21"/><line x1="20" y1="10" x2="20" y2="21"/><line x1="8" y1="14" x2="8" y2="17"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="16" y1="14" x2="16" y2="17"/></svg>`,
    priorityPerson: ['حقیقی', 'حقوقی']
  },
  {
    id: 'other_matters',
    title: 'سایر مسائل حقوقی',
    desc: 'دعاوی اداری، دیوان عدالت اداری، داوری، امور ثبت احوال و شوراهای حل اختلاف',
    iconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    priorityPerson: ['حقیقی', 'حقوقی']
  }
];

// پیکربندی فیلدهای فرم پویای هر موضوع
const CATEGORY_FORM_CONFIGS = {
  // ۱. چک و سفته
  cheque_promissory: [
    {
      id: 'role',
      label: 'نقش شما در مسئله:',
      required: true,
      options: [
        'دارنده چک یا سفته (طلبکار)',
        'صادرکننده چک یا سفته (بدهکار)',
        'ضامن یا ظهرنویس سند',
        'شخص دیگر یا شخص ثالث'
      ]
    },
    {
      id: 'doc_type',
      label: 'نوع سند مورد اختلاف:',
      required: true,
      options: [
        'چک صیادی بنفش (ثبت‌شده در سامانه صیاد)',
        'چک صیادی بنفش (ثبت‌نشده در سامانه صیاد)',
        'چک قدیمی غیراصلاح‌شده',
        'سفته عادی کاغذی',
        'سفته الکترونیک بانکی',
        'مطمئن نیستم'
      ]
    },
    {
      id: 'dispute_subject',
      label: 'موضوع دقیق اختلاف یا خواسته:',
      required: true,
      options: [
        'وصول وجه و صدور اجراییه مستقیم',
        'برگشت خوردن چک و مسدودی حساب‌ها',
        'مطالبه وجه از ضامن یا صادرکننده',
        'اختلاف درباره منشأ و قرارداد پایه چک',
        'استرداد لاشه چک یا اثبات امانی بودن',
        'سایر موارد'
      ]
    },
    {
      id: 'current_status',
      label: 'وضعیت فعلی اقدام‌ها:',
      required: true,
      options: [
        'هنوز هیچ اقدام قانونی انجام نداده‌ام',
        'گواهی عدم پرداخت از بانک دریافت کرده‌ام',
        'اظهارنامه رسمی ارسال یا دریافت شده است',
        'پرونده در اجرای ثبت یا دادگاه تشکیل شده است',
        'در حال مذاکره و توافق هستیم',
        'وضعیت دقیق را نمی‌دانم'
      ]
    }
  ],

  // ۲. روابط موجر و مستأجر
  landlord_tenant: [
    {
      id: 'role',
      label: 'نقش شما:',
      required: true,
      options: [
        'موجر (اجاره‌دهنده)',
        'مستأجر (اجاره‌کننده)',
        'مالک ملک',
        'شخص دیگر'
      ]
    },
    {
      id: 'dispute_subject',
      label: 'موضوع اصلی اختلاف:',
      required: true,
      options: [
        'تخلیه ملک به دلیل پایان مدت یا عدم پرداخت',
        'عدم استرداد ودیعه (پول پیش) توسط موجر',
        'عدم پرداخت اجاره‌بها توسط مستأجر',
        'تعمیرات اساسی و هزینه‌های نگهداری ملک',
        'تمدید اجاره و اختلاف در افزایش اجاره‌بها',
        'اختلاف درباره مفاد قرارداد یا خسارت وارده',
        'سایر موارد'
      ]
    },
    {
      id: 'contract_status',
      label: 'وضعیت قرارداد اجاره:',
      required: true,
      options: [
        'قرارداد کتبی رسمی (دفتر اسناد رسمی)',
        'قرارداد املاک با کد رهگیری و امضای دو شاهد',
        'قرارداد عادی دستی بدون شهود',
        'توافق شفاهی داشته‌ایم',
        'وضعیت مشخص نیست'
      ]
    },
    {
      id: 'current_status',
      label: 'وضعیت فعلی پرونده:',
      required: true,
      options: [
        'هنوز هیچ اقدام قانونی نکرده‌ام',
        'اخطار یا اظهارنامه رسمی ارسال یا دریافت شده است',
        'دادخواست یا درخواست دستور تخلیه ثبت شده است',
        'پرونده در شورای حل اختلاف در حال رسیدگی است',
        'وضعیت دیگری دارم'
      ]
    }
  ],

  // ۳. قراردادها و تعهدات
  contracts: [
    {
      id: 'role',
      label: 'نقش شما در قرارداد:',
      required: true,
      options: [
        'خریدار یا متعهدله',
        'فروشنده یا متعهد',
        'کارفرما یا پیمانکار',
        'طرف اول قرارداد',
        'طرف دوم قرارداد'
      ]
    },
    {
      id: 'dispute_subject',
      label: 'موضوع دقیق اختلاف:',
      required: true,
      options: [
        'الزام طرف مقابل به انجام تعهدات',
        'فسخ قرارداد به دلیل تخلف از شروط',
        'مطالبه خسارت تأخیر در اجرای تعهد (وجه التزام)',
        'بطلان یا انفساخ خودبه‌خود قرارداد',
        'عدم تحویل موضوع معامله یا کالا',
        'سایر موارد'
      ]
    },
    {
      id: 'contract_status',
      label: 'شکل و رسمیت قرارداد:',
      required: true,
      options: [
        'قرارداد کتبی رسمی با مهر و امضا',
        'قرارداد عادی کتبی',
        'فاکتور یا پیش‌فاکتور مکتوب',
        'توافق در پیام‌رسان‌ها یا ایمیل',
        'توافق کاملاً شفاهی'
      ]
    },
    {
      id: 'current_status',
      label: 'وضعیت فعلی:',
      required: true,
      options: [
        'هنوز اقدامی انجام نشده و در مرحله مذاکره هستیم',
        'اظهارنامه رسمی ارسال کرده‌ام',
        'دادخواست در مراجع قضایی ثبت شده است',
        'موضوع به داور ارجاع شده است',
        'وضعیت مشخص نیست'
      ]
    }
  ],

  // سایر موضوعات (قالب استاندارد هوشمند)
  default_template: [
    {
      id: 'role',
      label: 'نقش شما در این مسئله:',
      required: true,
      options: [
        'خواهان یا شاکی (شروع‌کننده ادعا)',
        'خوانده یا متهم (طرف مقابل دعوا)',
        'ذی‌نفع یا شخص ثالث',
        'شخص دیگر'
      ]
    },
    {
      id: 'dispute_subject',
      label: 'موضوع دقیق اختلاف:',
      required: true,
      options: [
        'مطالبه حقوق مالی یا قانونی',
        'رفع تصرف یا ابطال اقدام طرف مقابل',
        'جبران خسارت و زیان وارده',
        'رسیدگی به شکایت و صدور حکم قضایی',
        'تفسیر یا شفاف‌سازی وضعیت قانونی',
        'سایر موارد'
      ]
    },
    {
      id: 'evidence_status',
      label: 'مدارک و مستندات در دسترس شما:',
      required: true,
      options: [
        'اسناد رسمی و ثبتی معتبر در اختیار دارم',
        'قرارداد یا اسناد عادی کتبی دارم',
        'رسیدهای مالی، واریز وجه یا پرینت بانکی دارم',
        'پیام‌های مکتوب، ایمیل یا شهادت شهود دارم',
        'مدرک مکتوب در اختیار ندارم'
      ]
    },
    {
      id: 'current_status',
      label: 'وضعیت فعلی پرونده:',
      required: true,
      options: [
        'هنوز هیچ اقدام قانونی انجام نداده‌ام',
        'اظهارنامه رسمی ابلاغ شده است',
        'پرونده در کلانتری، شورا یا دادسرا ثبت شده است',
        'حکم بدوی صادر شده و در مرحله تجدیدنظر است',
        'در حال صلح و سازش خارج از دادگاه هستیم',
        'وضعیت مشخص نیست'
      ]
    }
  ]
};

// ============================================================================
// ۲. مدیریت مرکزی وضعیت برنامه (Central App State)
// ============================================================================

const appState = {
  currentStep: 1,
  sessionId: (typeof crypto !== 'undefined' && crypto.randomUUID ? 'sess_' + crypto.randomUUID().replace(/-/g, '') : 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10)),
  userName: '',
  personType: '',
  legalCategory: null,
  formAnswers: {},
  caseSummary: '',
  isConfirmed: false,
  chatMessages: [],
  isProcessing: false,
  activeAbortController: null,
  hasApiKey: true
};

// ============================================================================
// ۳. توابع کمکی (Utility Functions)
// ============================================================================

/** تبدیل اعداد انگلیسی به فارسی */
function toPersianDigits(input) {
  if (input === null || input === undefined) return '';
  const str = String(input);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

/** دریافت زمان کنونی به وقت محلی به همراه ارقام فارسی */
function getPersianTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return toPersianDigits(`${hours}:${minutes}`);
}

/** پاکسازی و دریافت ورودی امن برای جلوگیری از تزریق */
function sanitizeText(text) {
  if (!text) return '';
  return text.trim();
}

// ============================================================================
// ۴. منطق جابه‌جایی و پیشرفت بین مراحل (Step Navigation)
// ============================================================================

/** تغییر مرحله فعال */
function setStep(stepNumber) {
  appState.currentStep = stepNumber;

  // ۱. به‌روزرسانی نمایش بخش‌های محتوا
  for (let i = 1; i <= 6; i++) {
    const section = document.getElementById(`step-${i}`);
    if (section) {
      if (i === stepNumber) {
        section.style.display = i === 6 ? 'block' : 'block';
        section.classList.add('active');
      } else {
        section.style.display = 'none';
        section.classList.remove('active');
      }
    }
  }

  // ۲. مدیریت نوار پیشرفت بالا
  const progressWrapper = document.getElementById('steps-progress-wrapper');
  const headerResetBtn = document.getElementById('btn-header-reset');
  const progressTrack = document.getElementById('progress-track');

  if (stepNumber >= 1 && stepNumber <= 5) {
    if (progressWrapper) progressWrapper.style.display = 'block';
    if (headerResetBtn) headerResetBtn.style.display = stepNumber > 1 ? 'inline-flex' : 'none';

    // درصد پیشرفت نوار
    const percent = ((stepNumber - 1) / 4) * 100;
    if (progressTrack) {
      progressTrack.style.setProperty('--progress-percent', `${percent}%`);
    }

    // به‌روزرسانی گره‌های مراحل
    const stepNodes = document.querySelectorAll('.step-node');
    stepNodes.forEach((node) => {
      const stepIndex = parseInt(node.getAttribute('data-step') || '1', 10);
      node.classList.remove('active', 'completed');
      if (stepIndex === stepNumber) {
        node.classList.add('active');
      } else if (stepIndex < stepNumber) {
        node.classList.add('completed');
      }
    });
  } else {
    // در مرحله ۶ (چت) نوار پیشرفت مخفی می‌شود تا تمام تمرکز روی محیط گفت‌وگو باشد
    if (progressWrapper) progressWrapper.style.display = 'none';
    if (headerResetBtn) headerResetBtn.style.display = 'none';
  }

  // اسکرول نرم به بالای صفحه
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // اجرای منطق اختصاصی مرحله
  if (stepNumber === 4) {
    renderDynamicForm();
  } else if (stepNumber === 5) {
    renderSummarySheet();
  } else if (stepNumber === 6) {
    initChatInterface();
  }
}

// ============================================================================
// ۵. پیاده‌سازی مرحله ۱: اعتبارسنجی نام و شروع فرایند
// ============================================================================

function setupStep1() {
  const nameInput = document.getElementById('input-user-name');
  const startBtn = document.getElementById('btn-start-flow');
  const errorMsg = document.getElementById('step1-name-error');

  function handleStart() {
    if (!nameInput) return;
    const rawVal = nameInput.value.trim();

    if (!rawVal || rawVal.length < 2) {
      if (errorMsg) {
        errorMsg.textContent = 'لطفاً نام یا نام تجاری معتبر (حداقل ۲ حرف) وارد نمایید.';
        errorMsg.style.display = 'flex';
      }
      nameInput.focus();
      return;
    }

    // ذخیره در وضعیت
    appState.userName = rawVal;
    if (errorMsg) errorMsg.style.display = 'none';

    // به‌روزرسانی نشانگر نام کاربر در هدر
    const userBadge = document.getElementById('header-user-badge');
    const headerUserName = document.getElementById('header-user-name');
    if (headerUserName) headerUserName.textContent = appState.userName;
    if (userBadge) userBadge.style.display = 'inline-flex';

    // رفتن به مرحله ۲
    setStep(2);
  }

  if (startBtn) {
    startBtn.addEventListener('click', handleStart);
  }

  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleStart();
      }
    });

    nameInput.addEventListener('input', () => {
      if (errorMsg && errorMsg.style.display !== 'none') {
        errorMsg.style.display = 'none';
      }
    });
  }
}

// ============================================================================
// ۶. پیاده‌سازی مرحله ۲: تعیین نوع شخصیت (حقیقی / حقوقی)
// ============================================================================

function setupStep2() {
  const cardIndividual = document.getElementById('card-person-individual');
  const cardLegal = document.getElementById('card-person-legal');
  const nextBtn = document.getElementById('btn-to-step3');
  const backBtn = document.getElementById('btn-back-to-step1');

  function selectPersonType(type) {
    appState.personType = type;

    if (cardIndividual && cardLegal) {
      if (type === 'حقیقی') {
        cardIndividual.classList.add('selected');
        cardIndividual.setAttribute('aria-checked', 'true');
        cardLegal.classList.remove('selected');
        cardLegal.setAttribute('aria-checked', 'false');
      } else {
        cardLegal.classList.add('selected');
        cardLegal.setAttribute('aria-checked', 'true');
        cardIndividual.classList.remove('selected');
        cardIndividual.setAttribute('aria-checked', 'false');
      }
    }

    if (nextBtn) {
      nextBtn.disabled = false;
    }
  }

  if (cardIndividual) {
    cardIndividual.addEventListener('click', () => selectPersonType('حقیقی'));
    cardIndividual.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectPersonType('حقیقی');
      }
    });
  }

  if (cardLegal) {
    cardLegal.addEventListener('click', () => selectPersonType('حقوقی'));
    cardLegal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectPersonType('حقوقی');
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (appState.personType) {
        setStep(3);
        renderCategories();
      }
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      setStep(1);
    });
  }
}

// ============================================================================
// ۷. پیاده‌سازی مرحله ۳: انتخاب موضوع حقوقی
// ============================================================================

function renderCategories(filterQuery = '') {
  const grid = document.getElementById('categories-grid');
  const countBadge = document.getElementById('category-count-badge');
  const nextBtn = document.getElementById('btn-to-step4');
  if (!grid) return;

  grid.innerHTML = '';
  const query = filterQuery.trim().toLowerCase();

  const filtered = LEGAL_CATEGORIES.filter((cat) => {
    if (!query) return true;
    return cat.title.toLowerCase().includes(query) || cat.desc.toLowerCase().includes(query);
  });

  if (countBadge) {
    countBadge.textContent = `${toPersianDigits(filtered.length)} موضوع فعال`;
  }

  if (filtered.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'empty-search-notice';
    emptyNotice.style.gridColumn = '1 / -1';
    emptyNotice.style.textAlign = 'center';
    emptyNotice.style.padding = '40px 20px';
    emptyNotice.style.color = 'var(--text-muted)';
    emptyNotice.textContent = 'موضوعی متناسب با عبارت جست‌وجو شده یافت نشد. می‌توانید از گزینه «سایر مسائل حقوقی» استفاده کنید.';
    grid.appendChild(emptyNotice);
    return;
  }

  filtered.forEach((category) => {
    const isSelected = appState.legalCategory && appState.legalCategory.id === category.id;

    const card = document.createElement('div');
    card.className = `category-card ${isSelected ? 'selected' : ''}`;
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      <div class="category-card-top">
        <div class="category-icon-box" aria-hidden="true">
          ${category.iconSvg}
        </div>
        <div class="category-select-check" aria-hidden="true">
          ✓
        </div>
      </div>
      <h3 class="category-card-title">${category.title}</h3>
      <p class="category-card-desc">${category.desc}</p>
    `;

    function chooseCategory() {
      // اگر موضوع تغییر کرده، پاسخ‌های فیلدهای ناسازگار پاک شوند
      if (appState.legalCategory && appState.legalCategory.id !== category.id) {
        appState.formAnswers = {};
      }
      appState.legalCategory = category;

      // به‌روزرسانی وضعیت کارت‌ها
      const allCards = grid.querySelectorAll('.category-card');
      allCards.forEach((c) => {
        c.classList.remove('selected');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-checked', 'true');

      if (nextBtn) {
        nextBtn.disabled = false;
      }
    }

    card.addEventListener('click', chooseCategory);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        chooseCategory();
      }
    });

    grid.appendChild(card);
  });

  if (nextBtn) {
    nextBtn.disabled = !appState.legalCategory;
  }
}

function setupStep3() {
  const searchInput = document.getElementById('category-search-input');
  const nextBtn = document.getElementById('btn-to-step4');
  const backBtn = document.getElementById('btn-back-to-step2');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const target = e.target;
      renderCategories(target.value);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (appState.legalCategory) {
        setStep(4);
      }
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      setStep(2);
    });
  }
}

// ============================================================================
// ۸. پیاده‌سازی مرحله ۴: فرم پویای دریافت جزئیات
// ============================================================================

function renderDynamicForm() {
  const wrapper = document.getElementById('dynamic-fields-wrapper');
  const categoryBadge = document.getElementById('step4-category-badge');
  const titleEl = document.getElementById('step4-title');
  const errorBanner = document.getElementById('step4-error-banner');

  if (!wrapper || !appState.legalCategory) return;
  wrapper.innerHTML = '';
  if (errorBanner) errorBanner.style.display = 'none';

  // به‌روزرسانی عنوان و برچسب متناسب با موضوع
  if (categoryBadge) {
    categoryBadge.textContent = `موضوع انتخابی: ${appState.legalCategory.title}`;
  }
  if (titleEl) {
    titleEl.textContent = `جزئیات مسئله ${appState.legalCategory.title}`;
  }

  // انتخاب تنظیمات فرم متناسب با موضوع
  const config = CATEGORY_FORM_CONFIGS[appState.legalCategory.id] || CATEGORY_FORM_CONFIGS.default_template;

  // ساخت فیلدهای گزینه‌ای
  config.forEach((field) => {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'form-field-group';
    fieldGroup.setAttribute('data-field-id', field.id);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'form-field-title';
    titleWrap.innerHTML = `
      <span>${field.label}</span>
      ${field.required ? '<span class="label-required">*</span>' : ''}
    `;
    fieldGroup.appendChild(titleWrap);

    const chipsGrid = document.createElement('div');
    chipsGrid.className = 'option-chips-grid';
    chipsGrid.setAttribute('role', 'radiogroup');
    chipsGrid.setAttribute('aria-label', field.label);

    const currentSavedValue = appState.formAnswers[field.id] || '';

    field.options.forEach((opt) => {
      const isSelected = currentSavedValue === opt;
      const chip = document.createElement('div');
      chip.className = `option-chip ${isSelected ? 'selected' : ''}`;
      chip.setAttribute('role', 'radio');
      chip.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      chip.setAttribute('tabindex', '0');

      chip.innerHTML = `
        <span class="option-chip-radio" aria-hidden="true"></span>
        <span class="option-chip-text">${opt}</span>
      `;

      function selectOption() {
        appState.formAnswers[field.id] = opt;
        const allInGroup = chipsGrid.querySelectorAll('.option-chip');
        allInGroup.forEach((c) => {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        chip.classList.add('selected');
        chip.setAttribute('aria-checked', 'true');

        // مخفی‌سازی پیام خطای فرم در صورت انتخاب
        if (errorBanner) errorBanner.style.display = 'none';
      }

      chip.addEventListener('click', selectOption);
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectOption();
        }
      });

      chipsGrid.appendChild(chip);
    });

    fieldGroup.appendChild(chipsGrid);
    wrapper.appendChild(fieldGroup);
  });

  // فیلد شرح مختصر مسئله (اختیاری)
  const descGroup = document.createElement('div');
  descGroup.className = 'form-field-group';
  descGroup.innerHTML = `
    <div class="form-field-title">
      <span>شرح مختصر مسئله (اختیاری):</span>
    </div>
    <p class="form-field-desc">اگر نکته، تاریخ یا توضیح خاصی وجود دارد که به شناخت دقیق‌تر وضعیت کمک می‌کند، در اینجا بنویسید:</p>
  `;

  const textarea = document.createElement('textarea');
  textarea.className = 'form-textarea';
  textarea.id = 'input-case-description';
  textarea.placeholder = 'مثلاً: چک صیادی به مبلغ ۵۰ میلیون تومان در تاریخ ۱۴۰۲/۰۹/۱۵ سررسید شده و پس از ثبت گواهی عدم پرداخت، صادرکننده از پاسخگویی خودداری می‌کند...';
  textarea.maxLength = 1500;
  textarea.value = appState.caseSummary || '';

  textarea.addEventListener('input', (e) => {
    const target = e.target;
    appState.caseSummary = target.value;
  });

  descGroup.appendChild(textarea);
  wrapper.appendChild(descGroup);
}

function setupStep4() {
  const form = document.getElementById('details-form');
  const backBtn = document.getElementById('btn-back-to-step3');
  const errorBanner = document.getElementById('step4-error-banner');
  const errorText = document.getElementById('step4-error-text');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const config = (appState.legalCategory && CATEGORY_FORM_CONFIGS[appState.legalCategory.id]) || CATEGORY_FORM_CONFIGS.default_template;
      let hasError = false;
      let firstMissingLabel = '';

      for (const field of config) {
        if (field.required && !appState.formAnswers[field.id]) {
          hasError = true;
          firstMissingLabel = field.label;
          break;
        }
      }

      if (hasError) {
        if (errorBanner && errorText) {
          errorText.textContent = `لطفاً گزینه مربوط به «${firstMissingLabel.replace(':', '')}» را انتخاب فرمایید.`;
          errorBanner.style.display = 'flex';
        }
        return;
      }

      if (errorBanner) errorBanner.style.display = 'none';

      // رفتن به مرحله ۵
      setStep(5);
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      setStep(3);
    });
  }
}

// ============================================================================
// ۹. پیاده‌سازی مرحله ۵: مرور و تأیید اطلاعات
// ============================================================================

function renderSummarySheet() {
  const nameEl = document.getElementById('summary-user-name');
  const personEl = document.getElementById('summary-person-type');
  const categoryEl = document.getElementById('summary-legal-category');
  const answersContainer = document.getElementById('summary-answers-container');
  const descBox = document.getElementById('summary-desc-box');
  const descText = document.getElementById('summary-desc-text');

  if (nameEl) nameEl.textContent = appState.userName || '-';
  if (personEl) personEl.textContent = appState.personType ? `شخص ${appState.personType}` : '-';
  if (categoryEl) categoryEl.textContent = appState.legalCategory ? appState.legalCategory.title : '-';

  if (answersContainer && appState.legalCategory) {
    answersContainer.innerHTML = '';
    const config = CATEGORY_FORM_CONFIGS[appState.legalCategory.id] || CATEGORY_FORM_CONFIGS.default_template;

    config.forEach((field) => {
      const answerVal = appState.formAnswers[field.id] || 'ثبت نشده';

      const card = document.createElement('div');
      card.className = 'summary-answer-card';

      const qTitle = document.createElement('span');
      qTitle.className = 'summary-question-title';
      qTitle.textContent = field.label;

      const qAns = document.createElement('strong');
      qAns.className = 'summary-question-answer';
      qAns.textContent = answerVal;

      card.appendChild(qTitle);
      card.appendChild(qAns);
      answersContainer.appendChild(card);
    });
  }

  if (descBox && descText) {
    if (appState.caseSummary && appState.caseSummary.trim()) {
      descText.textContent = appState.caseSummary.trim();
      descBox.style.display = 'flex';
    } else {
      descBox.style.display = 'none';
    }
  }
}

function setupStep5() {
  const editBtn = document.getElementById('btn-edit-details');
  const confirmBtn = document.getElementById('btn-confirm-to-chat');

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      setStep(4);
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      appState.isConfirmed = true;
      setStep(6);
    });
  }
}

// ============================================================================
// ۱۰. پیاده‌سازی مرحله ۶: محیط گفت‌وگوی هوشمند (Smart Legal Chat + RAG)
// ============================================================================

/** قالب‌بندی متون غنی و نشانه‌گذاری مارک‌داون به ساختار HTML تمیز و امن */
function formatLegalMarkdown(rawText) {
  if (!rawText) return '';

  // ۱. فرار امن از تگ‌های خطرناک HTML
  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const safe = escapeHtml(rawText);

  // ۲. تبدیل عنوان‌ها (**عنوان:** یا ### عنوان)
  let formatted = safe.replace(/^(?:###|##|\*\*)\s*(.+?)(?:\*\*|:)?$/gm, '<h4>$1</h4>');

  // ۳. تبدیل بولت‌ها (- آیتم یا * آیتم)
  formatted = formatted.replace(/^[\*\-]\s+(.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>(\n|$)(\s*))+/g, (match) => `<ul>${match}</ul>`);

  // ۴. تبدیل عبارات ضخیم و مهم
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // ۵. تبدیل خطوط جدید به پاراگراف
  const paragraphs = formatted
    .split(/\n{2,}/)
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h4>') || trimmed.startsWith('<ul>')) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  return `<div class="legal-reply-content">${paragraphs}</div>`;
}

function renderSourcesCallout(bubble, sources) {
  if (!sources || sources.length === 0) return;
  const sourcesBox = document.createElement('div');
  sourcesBox.className = 'sources-callout-wrap';

  sourcesBox.innerHTML = `
    <div class="sources-callout-header">
      <span>📚 مستندات قانونی استخراج‌شده از پایگاه قوانین رسمی:</span>
      <span class="sources-sync-tag">تاریخ بررسی: ۱۴۰۳/۰۸/۱۵</span>
    </div>
    <div class="source-cards-list"></div>
  `;

  const listContainer = sourcesBox.querySelector('.source-cards-list');

  sources.forEach((s) => {
    const itemCard = document.createElement('div');
    itemCard.className = 'source-item-card';

    const isAmended = s.validityStatusLabel?.includes('اصلاح');
    const pillClass = isAmended ? 'amended' : 'in-force';

    itemCard.innerHTML = `
      <div class="source-card-top-row">
        <span class="source-article-badge">
          <span>⚖️</span>
          <span>${s.articleNumber}: ${s.title || ''}</span>
        </span>
        <span class="source-validity-pill ${pillClass}">
          ${s.validityStatusLabel || 'معتبر و لازم‌الاجرا'}
        </span>
      </div>
      <span class="source-law-title">${s.lawTitle}</span>
      <div class="source-card-bottom-row">
        <span>مرجع: ${s.officialSource || 'سامانه ملی قوانین'}</span>
        <a href="${s.officialUrl}" target="_blank" rel="noopener noreferrer" class="source-link-btn">
          <span>مشاهده سند رسمی</span>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      </div>
    `;

    listContainer.appendChild(itemCard);
  });

  bubble.appendChild(sourcesBox);
}

function renderActionsBar(bubble, text, isError = false) {
  const actionsBar = document.createElement('div');
  actionsBar.className = 'message-actions-bar';

  // دکمه کپی متن
  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn-msg-action';
  copyBtn.type = 'button';
  copyBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    <span>کپی پاسخ</span>
  `;

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>کپی شد!</span>
      `;
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>کپی پاسخ</span>
        `;
      }, 2200);
    } catch (e) {
      // نادیده گرفتن خطا
    }
  });

  actionsBar.appendChild(copyBtn);

  if (isError) {
    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn-msg-action';
    retryBtn.type = 'button';
    retryBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M23 4v6h-6"></path>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
      </svg>
      <span>تلاش مجدد</span>
    `;

    retryBtn.addEventListener('click', () => {
      const lastUserMsg = [...appState.chatMessages].reverse().find((m) => m.sender === 'user');
      if (lastUserMsg) {
        handleUserMessageSubmit(lastUserMsg.text);
      }
    });

    actionsBar.appendChild(retryBtn);
  }

  bubble.appendChild(actionsBar);
}

function createStreamingAssistantMessage() {
  const messagesContainer = document.getElementById('chat-messages-container');
  const scrollArea = document.getElementById('chat-scroll-area');
  if (!messagesContainer) return null;

  const timeStr = getPersianTime();
  const row = document.createElement('div');
  row.className = 'chat-message-row assistant';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M6 8l6-3 6 3M3 14l3-6 3 6M15 14l3-6 3 6M3 14a3 3 0 0 0 6 0M15 14a3 3 0 0 0 6 0"/></svg>`;

  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.className = 'message-bubble-wrapper';

  const badge = document.createElement('span');
  badge.className = 'message-badge-tag';
  badge.textContent = 'پاسخ مستند بر اساس قوانین ایران';
  bubbleWrapper.appendChild(badge);

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = '<span class="streaming-cursor">▋</span>';
  bubbleWrapper.appendChild(bubble);

  const timeEl = document.createElement('span');
  timeEl.className = 'message-time';
  timeEl.textContent = timeStr;
  bubbleWrapper.appendChild(timeEl);

  row.appendChild(avatar);
  row.appendChild(bubbleWrapper);
  messagesContainer.appendChild(row);

  if (scrollArea) {
    scrollArea.scrollTop = scrollArea.scrollHeight;
  }

  let fullText = '';
  let sources = [];

  return {
    updateChunk(chunk) {
      fullText += chunk;
      bubble.innerHTML = formatLegalMarkdown(fullText) + '<span class="streaming-cursor">▋</span>';
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    },
    setSources(newSources) {
      sources = newSources || [];
    },
    finish(citations = []) {
      bubble.innerHTML = formatLegalMarkdown(fullText);
      if (sources && sources.length > 0) {
        renderSourcesCallout(bubble, sources);
      }
      renderActionsBar(bubble, fullText, false);

      appState.chatMessages.push({
        sender: 'assistant',
        text: fullText,
        sources,
        citations,
        time: timeStr,
        timestamp: Date.now()
      });

      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    },
    getText() {
      return fullText;
    },
    remove() {
      row.remove();
    }
  };
}

function appendChatMessage(sender, text, sources = [], citations = [], isWelcome = false, isError = false) {
  const messagesContainer = document.getElementById('chat-messages-container');
  const scrollArea = document.getElementById('chat-scroll-area');
  if (!messagesContainer) return;

  const timeStr = getPersianTime();
  const msgObj = {
    sender,
    text,
    sources,
    citations,
    time: timeStr,
    timestamp: Date.now()
  };
  appState.chatMessages.push(msgObj);

  const row = document.createElement('div');
  row.className = `chat-message-row ${sender}`;

  // آیکون آواتار
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  if (sender === 'assistant') {
    avatar.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M6 8l6-3 6 3M3 14l3-6 3 6M15 14l3-6 3 6M3 14a3 3 0 0 0 6 0M15 14a3 3 0 0 0 6 0"/></svg>`;
  } else {
    avatar.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }

  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.className = 'message-bubble-wrapper';

  // برچسب وضعیت در پیام دستیار
  if (sender === 'assistant') {
    const badge = document.createElement('span');
    badge.className = 'message-badge-tag';
    badge.textContent = isWelcome
      ? 'صحیحی · پرونده فعال'
      : isError
      ? 'خطای ارتباط'
      : 'پاسخ مستند بر اساس قوانین ایران';
    bubbleWrapper.appendChild(badge);
  }

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  if (sender === 'user') {
    // پیام کاربر را با textContent نمایش می‌دهیم
    bubble.textContent = text;
  } else {
    // پیام دستیار را با فرمت غنی رندر می‌کنیم
    bubble.innerHTML = formatLegalMarkdown(text);

    // اگر منابع قانونی بازیابی‌شده وجود دارد، کارت‌های منبع را اضافه می‌کنیم
    if (sources && sources.length > 0) {
      renderSourcesCallout(bubble, sources);
    }

    // نوار ابزار پایین پیام (دکمه کپی و در صورت خطا، دکمه تلاش مجدد)
    renderActionsBar(bubble, text, isError);
  }

  const timeEl = document.createElement('span');
  timeEl.className = 'message-time';
  timeEl.textContent = timeStr;
  bubbleWrapper.appendChild(bubble);
  bubbleWrapper.appendChild(timeEl);

  row.appendChild(avatar);
  row.appendChild(bubbleWrapper);
  messagesContainer.appendChild(row);

  // اسکرول نرم به انتها
  if (scrollArea) {
    scrollArea.scrollTop = scrollArea.scrollHeight;
  }
}

/** بررسی اتصال به سرور و وضعیت مدل هوش مصنوعی */
async function checkBackendHealth() {
  const statusIndicator = document.getElementById('chat-ai-status');
  const statusText = document.getElementById('chat-ai-status-text');

  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      const data = await res.json();
      appState.hasApiKey = data.hasApiKey;

      if (statusIndicator && statusText) {
        if (data.hasApiKey) {
          statusIndicator.className = 'ai-status-indicator';
          statusText.textContent = 'هوش مصنوعی و RAG فعال';
        } else {
          statusIndicator.className = 'ai-status-indicator warning';
          statusText.textContent = 'آماده‌باش (کلید GEMINI_API_KEY در تنظیمات)';
        }
      }
    }
  } catch (e) {
    if (statusIndicator && statusText) {
      statusIndicator.className = 'ai-status-indicator warning';
      statusText.textContent = 'عدم ارتباط با سرور محلی';
    }
  }
}

function initChatInterface() {
  const headerUser = document.getElementById('chat-header-username');
  const headerCat = document.getElementById('chat-header-category');
  const messagesContainer = document.getElementById('chat-messages-container');

  if (headerUser) headerUser.textContent = appState.userName || 'کاربر گرامی';
  if (headerCat) headerCat.textContent = appState.legalCategory ? appState.legalCategory.title : 'عمومی';

  // بررسی وضعیت سلامت سرور و اتصال هوش مصنوعی
  checkBackendHealth();

  // اگر هنوز پیامی ارسال نشده، پیام خوشامدگویی اختصاصی تولید شود
  if (messagesContainer && appState.chatMessages.length === 0) {
    messagesContainer.innerHTML = '';

    const currentStatusAnswer = appState.formAnswers['current_status'] || 'مراحل اولیه بررسی';
    const welcomeMsg = `سلام ${appState.userName} گرامی. اطلاعات اولیه شما درباره پرونده «${appState.legalCategory ? appState.legalCategory.title : 'حقوقی'}» در دستیار حقوقی «صحیحی» ثبت شد.\n\nبر اساس پاسخ‌های شما، در حال حاضر در وضعیت «${currentStatusAnswer}» قرار دارید.\n\nسامانه «صحیحی» اکنون آماده است تا بر پایه قوانین و مقررات جمهوری اسلامی ایران، پرسش‌های شما را تحلیل و مستندسازی کند. می‌توانید پرسش یا ابهام حقوقی خود را مطرح نمایید.`;

    appendChatMessage('assistant', welcomeMsg, [], [], true);
  }
}

function showChatTyping(show, statusText = 'در حال جست‌وجو در قوانین و اعتبارسنجی پاسخ...') {
  const typingRow = document.getElementById('chat-typing-row');
  const textEl = document.getElementById('chat-typing-status-text');
  const scrollArea = document.getElementById('chat-scroll-area');

  if (typingRow) {
    typingRow.style.display = show ? 'flex' : 'none';
  }
  if (textEl && statusText) {
    textEl.textContent = statusText;
  }
  if (show && scrollArea) {
    scrollArea.scrollTop = scrollArea.scrollHeight;
  }
}

/** ارسال پیام به Backend امن، بازیابی RAG و تولید پاسخ هوش مصنوعی به صورت جریانی (Streaming) */
async function handleUserMessageSubmit(text) {
  const cleanText = sanitizeText(text);
  if (!cleanText || appState.isProcessing) return;

  // ۱. افزودن پیام کاربر به پنجره گفتگو
  appendChatMessage('user', cleanText);

  // ۲. فعال‌سازی کنترل‌ها و وضعیت پردازش
  appState.isProcessing = true;
  const sendBtn = document.getElementById('btn-chat-send');
  const textarea = document.getElementById('chat-textarea');
  if (sendBtn) sendBtn.disabled = true;
  if (textarea) textarea.disabled = true;

  showChatTyping(true, 'در حال بازیابی قوانین و مستندات مرتبط از پایگاه اسناد...');

  // ۳. ایجاد AbortController جهت امکان انصراف
  appState.activeAbortController = new AbortController();

  // تغییر وضعیت متن تایپینگ بعد از ۳۵۰ میلی‌ثانیه برای حس پویایی سیستم
  const stepTimer = setTimeout(() => {
    showChatTyping(true, 'در حال تحلیل حقوقی و اعتبارسنجی ارجاعات قانونی...');
  }, 350);

  let streamHandler = null;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json'
      },
      body: JSON.stringify({
        sessionId: appState.sessionId,
        message: cleanText,
        stream: true,
        caseContext: {
          userName: appState.userName,
          personType: appState.personType,
          legalCategory: appState.legalCategory,
          formAnswers: appState.formAnswers,
          caseSummary: appState.caseSummary
        }
      }),
      signal: appState.activeAbortController.signal
    });

    clearTimeout(stepTimer);

    if (!res.ok) {
      showChatTyping(false);
      const errData = await res.json().catch(() => ({}));
      const errMessage = errData.error || 'خطا در ارتباط با سرور حقوقی';
      appendChatMessage(
        'assistant',
        `⚠️ متأسفانه در پردازش پرسش مشکلی پیش آمد: ${errMessage}\nمی‌توانید دوباره تلاش کنید یا موضوع را به شکل دیگری مطرح نمایید.`,
        [],
        [],
        false,
        true
      );
      return;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream') && res.body) {
      // حالت پاسخ تدریجی (Streaming) برای نمایش آنی به کاربر
      streamHandler = createStreamingAssistantMessage();
      showChatTyping(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let receivedCitations = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;
          let eventType = 'chunk';
          let eventDataStr = '';

          const blockLines = block.split('\n');
          for (const line of blockLines) {
            if (line.startsWith('event: ')) {
              eventType = line.replace('event: ', '').trim();
            } else if (line.startsWith('data: ')) {
              eventDataStr = line.replace('data: ', '').trim();
            }
          }

          if (eventType === 'sources') {
            try {
              const parsed = JSON.parse(eventDataStr);
              if (parsed.sources && streamHandler) {
                streamHandler.setSources(parsed.sources);
              }
            } catch (e) {}
          } else if (eventType === 'chunk') {
            try {
              const parsed = JSON.parse(eventDataStr);
              if (parsed.text && streamHandler) {
                streamHandler.updateChunk(parsed.text);
              }
            } catch (e) {}
          } else if (eventType === 'done') {
            try {
              const parsed = JSON.parse(eventDataStr);
              receivedCitations = parsed.citations || [];
            } catch (e) {}
          } else if (eventType === 'error') {
            try {
              const parsed = JSON.parse(eventDataStr);
              throw new Error(parsed.error || 'خطا در تولید پاسخ');
            } catch (e) {
              throw e;
            }
          }
        }
      }

      if (streamHandler) {
        streamHandler.finish(receivedCitations);
      }
    } else {
      // حالت معمولی JSON
      showChatTyping(false);
      const data = await res.json();
      appendChatMessage('assistant', data.reply, data.sources || [], data.citations || []);
    }
  } catch (err) {
    clearTimeout(stepTimer);
    showChatTyping(false);

    if (streamHandler && !streamHandler.getText()) {
      streamHandler.remove();
      streamHandler = null;
    }

    if (err.name === 'AbortError') {
      appendChatMessage('assistant', 'درخواست پردازش حقوقی توسط شما لغو شد.', [], [], false, false);
    } else {
      appendChatMessage(
        'assistant',
        `⚠️ ${err.message || 'خطای ارتباط با سرور یا قطعی اینترنت رخ داد. لطفاً اتصال خود را بررسی کرده و مجدداً تلاش نمایید.'}`,
        [],
        [],
        false,
        true
      );
    }
  } finally {
    appState.isProcessing = false;
    appState.activeAbortController = null;
    if (sendBtn) sendBtn.disabled = false;
    if (textarea) {
      textarea.disabled = false;
      textarea.focus();
    }
  }
}

function setupStep6() {
  const form = document.getElementById('chat-input-form');
  const textarea = document.getElementById('chat-textarea');
  const quickChips = document.querySelectorAll('.quick-chip');
  const btnSummary = document.getElementById('btn-open-case-summary');
  const btnRestart = document.getElementById('btn-chat-restart');
  const btnSources = document.getElementById('btn-open-legal-sources');
  const btnAbort = document.getElementById('btn-abort-chat-request');

  if (form && textarea) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = textarea.value;
      if (text.trim()) {
        textarea.value = '';
        textarea.style.height = 'auto';
        handleUserMessageSubmit(text);
      }
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = textarea.value;
        if (text.trim()) {
          textarea.value = '';
          textarea.style.height = 'auto';
          handleUserMessageSubmit(text);
        }
      }
    });

    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
    });
  }

  // لغو درخواست در حال پردازش
  if (btnAbort) {
    btnAbort.addEventListener('click', () => {
      if (appState.activeAbortController) {
        appState.activeAbortController.abort();
      }
    });
  }

  // پیشنهادهای سریع پرسش
  quickChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const promptText = chip.getAttribute('data-prompt');
      if (promptText && !appState.isProcessing) {
        handleUserMessageSubmit(promptText);
      }
    });
  });

  // باز کردن خلاصه پرونده
  if (btnSummary) {
    btnSummary.addEventListener('click', () => {
      openSummaryModal();
    });
  }

  // باز کردن بانک قوانین معتبر RAG
  if (btnSources) {
    btnSources.addEventListener('click', () => {
      openLegalSourcesModal();
    });
  }

  // شروع گفت‌وگوی جدید
  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      openResetModal();
    });
  }
}

// ============================================================================
// ۱۱. مدال‌ها (Modals Logic)
// ============================================================================

function openSummaryModal() {
  const modal = document.getElementById('modal-case-summary');
  const body = document.getElementById('modal-case-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="background: rgba(13, 17, 34, 0.7); padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div style="font-size: 0.85rem; color: var(--text-muted);">متقاضی:</div>
        <div style="font-weight: 700; color: var(--text-main);">${appState.userName || '-'} (شخص ${appState.personType || '-'})</div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">موضوع حقوقی:</div>
        <div style="font-weight: 700; color: var(--color-purple-light);">${appState.legalCategory ? appState.legalCategory.title : '-'}</div>
      </div>
      <div id="modal-answers-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
      ${
        appState.caseSummary
          ? `<div style="background: rgba(13, 17, 34, 0.5); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.82rem; color: var(--text-muted);">شرح مختصر مسئله:</div>
              <p style="font-size: 0.92rem; color: var(--text-main); margin-top: 4px; white-space: pre-wrap;">${appState.caseSummary}</p>
            </div>`
          : ''
      }
    </div>
  `;

  const answersList = body.querySelector('#modal-answers-list');
  if (answersList && appState.legalCategory) {
    const config = CATEGORY_FORM_CONFIGS[appState.legalCategory.id] || CATEGORY_FORM_CONFIGS.default_template;
    config.forEach((f) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.padding = '8px 12px';
      row.style.background = 'rgba(255, 255, 255, 0.02)';
      row.style.borderRadius = 'var(--radius-sm)';
      row.style.border = '1px solid var(--border-subtle)';

      row.innerHTML = `
        <span style="font-size: 0.84rem; color: var(--text-muted);">${f.label}</span>
        <strong style="font-size: 0.88rem; color: var(--text-main);">${appState.formAnswers[f.id] || 'ثبت نشده'}</strong>
      `;
      answersList.appendChild(row);
    });
  }

  modal.style.display = 'flex';
}

function closeSummaryModal() {
  const modal = document.getElementById('modal-case-summary');
  if (modal) modal.style.display = 'none';
}

/** نمایش پایگاه قوانین و اسناد رسمی بارگذاری‌شده در سرور */
async function openLegalSourcesModal() {
  const modal = document.getElementById('modal-legal-sources');
  const container = document.getElementById('sources-list-container');
  if (!modal || !container) return;

  container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">در حال دریافت اطلاعات قوانین از سرور...</div>';
  modal.style.display = 'flex';

  try {
    const res = await fetch('/api/sources');
    if (!res.ok) throw new Error('خطا در دریافت لیست منابع');
    const data = await res.json();

    container.innerHTML = '';

    data.sources.forEach((s) => {
      const card = document.createElement('div');
      card.style.background = 'rgba(13, 17, 34, 0.6)';
      card.style.border = '1px solid var(--border-subtle)';
      card.style.borderRadius = 'var(--radius-sm)';
      card.style.padding = '12px 14px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '6px';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #ffffff; font-size: 0.92rem;">⚖️ ${s.articleNumber}: ${s.title}</strong>
          <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 99px; background: rgba(16, 185, 129, 0.15); color: var(--color-success);">
            ${s.validityStatus}
          </span>
        </div>
        <div style="font-size: 0.82rem; color: var(--text-secondary);">${s.lawTitle}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--text-muted); border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 6px; margin-top: 4px;">
          <span>دسته‌بندی: ${s.category} · آخرین بررسی: ${s.lastVerifiedDate}</span>
          <a href="${s.officialUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--color-purple-light); text-decoration: none; font-weight: 600;">
            مشاهده در سامانه ملی قوانین ↗
          </a>
        </div>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<div style="color: var(--color-error); text-align: center; padding: 16px;">خطا در دریافت فهرست منابع از سرور.</div>';
  }
}

function closeLegalSourcesModal() {
  const modal = document.getElementById('modal-legal-sources');
  if (modal) modal.style.display = 'none';
}

function openResetModal() {
  const modal = document.getElementById('modal-reset-confirm');
  if (modal) modal.style.display = 'flex';
}

function closeResetModal() {
  const modal = document.getElementById('modal-reset-confirm');
  if (modal) modal.style.display = 'none';
}

async function resetEntireApp() {
  // پاکسازی نشست در سرور
  try {
    await fetch('/api/chat/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: appState.sessionId })
    });
  } catch (e) {
    // نادیده گرفتن خطای شبکه در بازنشانی
  }

  appState.currentStep = 1;
  appState.sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  appState.userName = '';
  appState.personType = '';
  appState.legalCategory = null;
  appState.formAnswers = {};
  appState.caseSummary = '';
  appState.isConfirmed = false;
  appState.chatMessages = [];
  appState.isProcessing = false;

  const nameInput = document.getElementById('input-user-name');
  if (nameInput) nameInput.value = '';

  const userBadge = document.getElementById('header-user-badge');
  if (userBadge) userBadge.style.display = 'none';

  const messagesContainer = document.getElementById('chat-messages-container');
  if (messagesContainer) messagesContainer.innerHTML = '';

  closeResetModal();
  closeSummaryModal();
  closeLegalSourcesModal();
  setStep(1);
}

function setupModals() {
  // مدال خلاصه پرونده
  const closeBtn1 = document.getElementById('btn-close-modal-summary');
  const closeBtn2 = document.getElementById('btn-close-modal-summary-action');
  const editFromModal = document.getElementById('btn-modal-edit-case');

  if (closeBtn1) closeBtn1.addEventListener('click', closeSummaryModal);
  if (closeBtn2) closeBtn2.addEventListener('click', closeSummaryModal);
  if (editFromModal) {
    editFromModal.addEventListener('click', () => {
      closeSummaryModal();
      setStep(4);
    });
  }

  // مدال بانک قوانین
  const closeSourcesBtn1 = document.getElementById('btn-close-modal-sources');
  const closeSourcesBtn2 = document.getElementById('btn-close-modal-sources-action');
  if (closeSourcesBtn1) closeSourcesBtn1.addEventListener('click', closeLegalSourcesModal);
  if (closeSourcesBtn2) closeSourcesBtn2.addEventListener('click', closeLegalSourcesModal);

  // مدال شروع مجدد
  const cancelReset = document.getElementById('btn-cancel-reset');
  const confirmReset = document.getElementById('btn-confirm-reset');
  const closeResetX = document.getElementById('btn-close-modal-reset');

  if (cancelReset) cancelReset.addEventListener('click', closeResetModal);
  if (closeResetX) closeResetX.addEventListener('click', closeResetModal);
  if (confirmReset) confirmReset.addEventListener('click', resetEntireApp);

  // دکمه ریست هدر
  const headerResetBtn = document.getElementById('btn-header-reset');
  if (headerResetBtn) {
    headerResetBtn.addEventListener('click', openResetModal);
  }

  // کلید Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSummaryModal();
      closeResetModal();
      closeLegalSourcesModal();
    }
  });

  // بستن با کلیک روی پس‌زمینه
  const modalSummary = document.getElementById('modal-case-summary');
  if (modalSummary) {
    modalSummary.addEventListener('click', (e) => {
      if (e.target === modalSummary) closeSummaryModal();
    });
  }

  const modalSources = document.getElementById('modal-legal-sources');
  if (modalSources) {
    modalSources.addEventListener('click', (e) => {
      if (e.target === modalSources) closeLegalSourcesModal();
    });
  }

  const modalReset = document.getElementById('modal-reset-confirm');
  if (modalReset) {
    modalReset.addEventListener('click', (e) => {
      if (e.target === modalReset) closeResetModal();
    });
  }
}

// ============================================================================
// ۱۲. راه‌اندازی اولیه اپلیکیشن در زمان بارگذاری DOM
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  setupStep1();
  setupStep2();
  setupStep3();
  setupStep4();
  setupStep5();
  setupStep6();
  setupModals();

  // شروع در مرحله اول
  setStep(1);
});

