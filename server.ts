/**
 * @license
 * دستیار حقوقی هوشمند ایران - سرور اصلی Full-Stack (Express + RAG + Gemini AI)
 */

import express, { Request, Response } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { ChatSession, CaseContext } from './src/types/legal.ts';
import { knowledgeBase } from './src/rag/knowledgeBase.ts';
import { retrieveRelevantArticles } from './src/rag/retriever.ts';
import { verifyCitations } from './src/rag/verifier.ts';
import {
  generateLegalResponse,
  generateLegalResponseStream,
  resolveGeminiModelName
} from './src/services/geminiService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// تنظیمات امنیتی هدرها
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// تنظیمات میانی پایه
app.use(express.json({ limit: '500kb' }));

// مدیریت نشست‌ها در حافظه موقت (In-Memory Session Store)
const sessions = new Map<string, ChatSession>();

// الگوی معتبر و امن برای شناسه نشست
const SESSION_ID_REGEX = /^[a-zA-Z0-9_\-]{8,64}$/;

// محدودیت نرخ درخواست‌ها (Rate Limiter ساده در حافظه برای جلوگیری از اسپم)
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const limitData = rateLimits.get(clientId);

  if (!limitData || now > limitData.resetTime) {
    rateLimits.set(clientId, { count: 1, resetTime: now + 60 * 1000 });
    return true;
  }

  if (limitData.count >= 25) {
    return false;
  }

  limitData.count++;
  return true;
}

// پاکسازی خودکار نشست‌های قدیمی پس از ۱۲ ساعت
setInterval(() => {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const [id, session] of sessions.entries()) {
    if (session.lastActiveAt < cutoff) {
      sessions.delete(id);
    }
  }
}, 30 * 60 * 1000);

// ============================================================================
// API ENDPOINTS
// ============================================================================

/** ۱. بررسی سلامت و تنظیمات */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    brand: 'صحیحی',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: resolveGeminiModelName(),
    knowledgeBaseStats: knowledgeBase.getStats(),
    timestamp: new Date().toISOString()
  });
});

/** ۲. دریافت آمار و فهرست منابع حقوقی پایگاه دانش */
app.get('/api/sources', (_req: Request, res: Response) => {
  const allArticles = knowledgeBase.getAllArticles();
  res.json({
    stats: knowledgeBase.getStats(),
    sources: allArticles.map((a) => ({
      id: a.id,
      lawTitle: a.lawTitle,
      category: a.category,
      articleNumber: a.articleNumber,
      title: a.title,
      validityStatus: a.validityStatusLabel,
      officialSource: a.officialSource,
      officialUrl: a.officialUrl,
      lastVerifiedDate: a.lastVerifiedDate
    }))
  });
});

/** ۳. افزودن یا به‌روزرسانی اسناد حقوقی جدید (محافظت‌شده با کلید مدیریت) */
app.post('/api/sources/ingest', (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'] || req.headers['authorization'];
    const expectedKey = process.env.ADMIN_SECRET_KEY;

    // محافظت در برابر دسترسی غیرمجاز و تزریق به پایگاه قوانین
    if (!expectedKey || adminKey !== expectedKey) {
      res.status(403).json({ error: 'دسترسی غیرمجاز: برای ثبت یا اصلاح اسناد حقوقی نیاز به کلید مدیریت معتبر است.' });
      return;
    }

    const payload = req.body;
    if (!payload.lawTitle || !payload.category || !Array.isArray(payload.articles)) {
      res.status(400).json({ error: 'فرمت داده‌های ورودی نامعتبر است. عنوان قانون، دسته‌بندی و لیست مواد الزامی است.' });
      return;
    }

    const result = knowledgeBase.ingestDocument(payload);
    res.json({
      success: true,
      message: 'اسناد حقوقی با موفقیت ثبت و نمایه‌سازی شدند.',
      ...result,
      currentStats: knowledgeBase.getStats()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'خطای داخلی در ثبت اسناد حقوقی' });
  }
});

/** ۴. پردازش پیام حقوقی و پرسش و پاسخ RAG با پشتیبانی از Streaming و پاسخ بلادرنگ */
app.post('/api/chat', async (req: Request, res: Response) => {
  const reqStartTime = performance.now();
  try {
    const { sessionId, message, caseContext, stream } = req.body;
    const isStreamRequested = stream === true || req.headers.accept?.includes('text/event-stream');

    // ۱. اعتبارسنجی ورودی
    if (!sessionId || typeof sessionId !== 'string' || !SESSION_ID_REGEX.test(sessionId)) {
      res.status(400).json({ error: 'شناسه نشست (sessionId) نامعتبر یا غیرمجاز است.' });
      return;
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'متن پیام نمی‌تواند خالی باشد.' });
      return;
    }

    // پاکسازی کاراکترهای کنترلی مخرب
    const cleanMessage = message.replace(/\0/g, '').trim();
    if (cleanMessage.length > 2000) {
      res.status(400).json({ error: 'طول پیام بیش از حد مجاز است (حداکثر ۲۰۰۰ کاراکتر).' });
      return;
    }

    // ۲. کنترل نرخ درخواست‌ها
    const clientKey = (req.ip || 'ip_unknown') + '_' + sessionId;
    if (!checkRateLimit(clientKey)) {
      res.status(429).json({ error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً یک دقیقه صبور باشید.' });
      return;
    }

    // ۳. مدیریت نشست و زمینه پرونده
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        caseContext: caseContext || {
          userName: 'کاربر',
          personType: 'حقیقی',
          legalCategory: null,
          formAnswers: {},
          caseSummary: ''
        },
        messages: []
      };
      sessions.set(sessionId, session);
    } else {
      session.lastActiveAt = Date.now();
      if (caseContext) {
        session.caseContext = { ...session.caseContext, ...caseContext };
      }
    }

    // ۴. مرحله بازیابی RAG: جست‌وجو در پایگاه اسناد قوانین ایران
    const tRagStart = performance.now();
    const retrievalResults = retrieveRelevantArticles(cleanMessage, session.caseContext, 4);
    const retrievedArticles = retrievalResults.map((r) => r.article);
    const ragDurationMs = Math.round(performance.now() - tRagStart);

    const safeSources = retrievedArticles.map((s) => ({
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

    // ۵. حالت جریانی (Streaming) برای پاسخ‌دهی فوری و به حداقل رساندن تأخیر
    if (isStreamRequested) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      // ارسال فوری منابع بازیابی‌شده بدون فوت وقت
      res.write(`event: sources\ndata: ${JSON.stringify({ sources: safeSources })}\n\n`);

      let fullReply = '';
      const tModelStart = performance.now();

      try {
        const streamGenerator = generateLegalResponseStream(
          cleanMessage,
          session.caseContext,
          session.messages,
          retrievedArticles
        );

        for await (const chunk of streamGenerator) {
          fullReply += chunk;
          res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
        }

        const modelDurationMs = Math.round(performance.now() - tModelStart);
        const tVerifyStart = performance.now();
        const citations = verifyCitations(fullReply, retrievedArticles);
        const verifyDurationMs = Math.round(performance.now() - tVerifyStart);
        const totalDurationMs = Math.round(performance.now() - reqStartTime);

        // ذخیره در تاریخچه نشست
        const userMsg = {
          id: `msg_${Date.now()}_u`,
          role: 'user' as const,
          content: cleanMessage,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        };

        const assistantMsg = {
          id: `msg_${Date.now()}_a`,
          role: 'assistant' as const,
          content: fullReply,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          sources: retrievedArticles,
          citations,
          confidence: (retrievedArticles.length > 0 ? 'high' : 'medium') as 'high' | 'medium'
        };

        session.messages.push(userMsg, assistantMsg);

        // رویداد اتمام پردازش همراه با اعتبارسنجی ارجاعات و آمار زمان‌بندی
        res.write(
          `event: done\ndata: ${JSON.stringify({
            citations,
            confidence: assistantMsg.confidence,
            sessionId,
            sourceSyncDate: '۱۴۰۳/۰۸/۱۵',
            timing: {
              ragMs: ragDurationMs,
              modelMs: modelDurationMs,
              verifyMs: verifyDurationMs,
              totalMs: totalDurationMs
            }
          })}\n\n`
        );
        res.end();
        return;
      } catch (streamErr: any) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: streamErr.message || 'خطا در تولید پاسخ' })}\n\n`);
        res.end();
        return;
      }
    }

    // ۵. حالت معمولی غیراستریم (Standard JSON Response)
    const tModelStart = performance.now();
    const replyText = await generateLegalResponse(
      cleanMessage,
      session.caseContext,
      session.messages,
      retrievedArticles
    );
    const modelDurationMs = Math.round(performance.now() - tModelStart);

    // ۶. اعتبارسنجی ارجاعات و استنادات حقوقی
    const tVerifyStart = performance.now();
    const citations = verifyCitations(replyText, retrievedArticles);
    const verifyDurationMs = Math.round(performance.now() - tVerifyStart);
    const totalDurationMs = Math.round(performance.now() - reqStartTime);

    // ۷. ذخیره در تاریخچه نشست
    const userMsg = {
      id: `msg_${Date.now()}_u`,
      role: 'user' as const,
      content: cleanMessage,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    const assistantMsg = {
      id: `msg_${Date.now()}_a`,
      role: 'assistant' as const,
      content: replyText,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      sources: retrievedArticles,
      citations,
      confidence: (retrievedArticles.length > 0 ? 'high' : 'medium') as 'high' | 'medium'
    };

    session.messages.push(userMsg, assistantMsg);

    // ۸. بازگرداندن پاسخ همراه با منابع معتبر و اطلاعات زمان‌سنجی
    res.json({
      success: true,
      reply: replyText,
      sources: safeSources,
      citations,
      confidence: assistantMsg.confidence,
      sessionId,
      sourceSyncDate: '۱۴۰۳/۰۸/۱۵',
      timing: {
        ragMs: ragDurationMs,
        modelMs: modelDurationMs,
        verifyMs: verifyDurationMs,
        totalMs: totalDurationMs
      }
    });
  } catch (error: any) {
    // خطای امن بدون افشای اسرار
    res.status(500).json({
      error: error?.message || 'خطا در پردازش درخواست حقوقی'
    });
  }
});

/** ۵. بازنشانی گفتگو برای نشست مشخص */
app.post('/api/chat/reset', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId && sessions.has(sessionId)) {
    sessions.delete(sessionId);
  }
  res.json({ success: true, message: 'نشست با موفقیت بازنشانی شد.' });
});

// ============================================================================
// سرو کردن Frontend با Vite در حالت توسعه یا فایلهای استاتیک در حالت تولید
// ============================================================================

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // حل خطای WebSocket در محیط توسعه:
    // در صورتی که DISABLE_HMR فعال باشد، HMR غیرفعال می‌شود تا کلاینت تلاشی برای وب‌سوکت نکند؛
    // و در حالت توسعه، وب‌سوکت مستقیماً به httpServer مشترک متصل می‌گردد.
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled
          ? false
          : {
              server: httpServer
            }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Iran Smart Legal Assistant server running on port ${PORT}`);
  });
}

startServer();
