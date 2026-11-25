import { Router, Request, Response } from "express";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import { randomUUID } from "crypto";
import { prisma } from "../数据库";
import { verifyToken, AuthRequest } from "../middleware/认证";
import { biaoQingShangChuan, tuPianShangChuan, yinPinShangChuan, shiPinShangChuan, wenJianShangChuan } from "../middleware/上传";
import { peiZhi as quanJuPeiZhi } from "../config";
import { huoQuSuoLueTuDiZhi, shiFouShiPin, shiFouTuPian, shiFouYinPin } from "../services/媒体存储";
import { huoQuYongHuSheZhi } from "../services/用户设置";
import { shiBieShiPin, huoQuShiPinZhuangTai } from "../services/视频理解";
import { huoQuDuiHuaZhuCeCuoWuXiangQing } from "../services/对话注册诊断";
import { huoQuFriendship } from "../services/关系";
import { heBingPromptKuai, gouJianPromptKuai } from "../services/提示词分层";
import { fanYiQingQiuWenBen, fanYiQingQiuCuoWu, shiFouFanYiFuWuCuoWu } from "../services/翻译";
import { fanYiHuiFuWenBen } from "../services/消息翻译";
import { ocrShiBieWenJian, shiBieYuYin, souSuoWangYe, zhuaQuWangYe } from "../services/多模态工具.js";

const router = Router();
router.use(verifyToken);

const TU_PIAN_GE_SHI = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const YIN_PIN_GE_SHI = new Set(["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac", "audio/webm", "audio/flac"]);
const SHI_PIN_GE_SHI = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const WEN_JIAN_GE_SHI = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const WEN_JIAN_TUO_ZHAN = new Set([".pdf", ".doc", ".docx", ".txt", ".md", ".markdown", ".csv", ".xls", ".xlsx"]);
const WEN_DANG_MIME = new Set(["application/pdf", "text/plain", "text/markdown"]);
const WEN_DANG_TUO_ZHAN = new Set([".pdf", ".txt", ".md", ".markdown"]);
const LIN_SHI_WEN_JIAN_ZUI_DA_CUN_HUO_MS = 24 * 60 * 60 * 1000;

function huoQuWenJianTuoZhan(wenJianMing?: string): string {
  return path.extname(String(wenJianMing || "")).toLowerCase();
}

function shiFouYunXuWenJian(mimeLeiXing: string, wenJianMing?: string): boolean {
  const guiFanMime = String(mimeLeiXing || "").toLowerCase();
  const tuoZhan = huoQuWenJianTuoZhan(wenJianMing);
  if (WEN_JIAN_GE_SHI.has(guiFanMime)) return true;
  return WEN_JIAN_TUO_ZHAN.has(tuoZhan);
}

function shiFouWenDang(mimeLeiXing: string, wenJianMing?: string): boolean {
  const guiFanMime = String(mimeLeiXing || "").toLowerCase();
  const tuoZhan = huoQuWenJianTuoZhan(wenJianMing);
  return WEN_DANG_MIME.has(guiFanMime) || WEN_DANG_TUO_ZHAN.has(tuoZhan);
}

function shiFouWenBenWenDang(mimeLeiXing: string, wenJianMing?: string): boolean {
  const guiFanMime = String(mimeLeiXing || "").toLowerCase();
  const tuoZhan = huoQuWenJianTuoZhan(wenJianMing);
  return guiFanMime.startsWith("text/") || [".txt", ".md", ".markdown", ".csv"].includes(tuoZhan);
}

function shiFouPdfWenDang(mimeLeiXing: string, wenJianMing?: string): boolean {
  const guiFanMime = String(mimeLeiXing || "").toLowerCase();
  const tuoZhan = huoQuWenJianTuoZhan(wenJianMing);
  return guiFanMime === "application/pdf" || tuoZhan === ".pdf";
}

function anQuanWenJianMing(wenJianMing?: string): string {
  return path.basename(String(wenJianMing || "file")).replace(/[^\w.\u4e00-\u9fa5-]+/g, "_").slice(0, 120) || "file";
}

function huoQuLinShiMuLu(): string {
  return path.join(os.tmpdir(), "ai_lian_ai_lin_shi");
}

async function qingLiGuoQiLinShiWenJian(muLu: string, zuiDaCunHuoMs = LIN_SHI_WEN_JIAN_ZUI_DA_CUN_HUO_MS): Promise<void> {
  const muQian = Date.now();
  let tiaoMu: Array<import("fs").Dirent> = [];
  try {
    tiaoMu = await fs.readdir(muLu, { withFileTypes: true });
  } catch {
    return;
  }
  await Promise.all(tiaoMu.map(async (xiangMu) => {
    if (!xiangMu.isFile()) return;
    const wenJianLuJing = path.join(muLu, xiangMu.name);
    try {
      const xinXi = await fs.stat(wenJianLuJing);
      if (muQian - xinXi.mtimeMs <= zuiDaCunHuoMs) return;
      await fs.unlink(wenJianLuJing);
    } catch {
      // 忽略单个临时文件清理失败
    }
  }));
}

async function xieRuLinShiWenJian(buffer: Buffer, wenJianMing: string): Promise<string> {
  const muLu = huoQuLinShiMuLu();
  await fs.mkdir(muLu, { recursive: true });
  await qingLiGuoQiLinShiWenJian(muLu).catch(() => null);
  const luJing = path.join(muLu, `${Date.now()}-${randomUUID()}-${anQuanWenJianMing(wenJianMing)}`);
  await fs.writeFile(luJing, buffer);
  return luJing;
}

function jiSuanShiJiChaoShi(peiZhiChaoShi: number, kaiShiShiJian: number): number {
  const yiYongShi = Date.now() - kaiShiShiJian;
  return Math.max(3000, peiZhiChaoShi - yiYongShi);
}

function shiFouPdfMagic(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

async function tiQuPdfWenBen(buffer: Buffer): Promise<string> {
  if (!shiFouPdfMagic(buffer)) return "";
  let pdfParse: ((data: Buffer) => Promise<{ text?: string }>) | null = null;
  try {
    const moKuai: any = await import("pdf-parse");
    pdfParse = typeof moKuai === "function" ? moKuai : (typeof moKuai?.default === "function" ? moKuai.default : null);
  } catch {
    return "";
  }
  if (!pdfParse) return "";
  try {
    const jieGuo = await pdfParse(buffer);
    return String(jieGuo?.text || "").replace(/\u0000/g, "").trim();
  } catch {
    return "";
  }
}

async function ocrTuPian(base64: string, mime: string): Promise<string> {
  const jieGuo = await ocrShiBieWenJian({ wen_jian_ming: "image", base64, mime });
  return jieGuo.cheng_gong ? String(jieGuo.wen_ben || "").trim() : "";
}

async function ocrPdf(buffer: Buffer): Promise<string> {
  const jieGuo = await ocrShiBieWenJian({
    wen_jian_ming: "document.pdf",
    base64: buffer.toString("base64"),
    mime: "application/pdf"
  });
  return jieGuo.cheng_gong ? String(jieGuo.wen_ben || "").trim() : "";
}

async function shengChengShiPinMiaoShu(canShu: {
  shiPinBuffer: Buffer;
  mime: string;
  wenJianMing?: string;
  fuJiaTiShi?: string;
  gongJuHuiDiao?: (shiJian: "start" | "end", haoMiao?: number, chengGong?: boolean) => void;
}): Promise<{ miaoShu: string; shiBai: boolean; cuoWu?: string }> {
  const linShiLuJing = await xieRuLinShiWenJian(canShu.shiPinBuffer, canShu.wenJianMing || "video.mp4");
  const kaiShi = Date.now();
  canShu.gongJuHuiDiao?.("start");
  try {
    const shiBie = await shiBieShiPin(linShiLuJing, canShu.fuJiaTiShi);
    canShu.gongJuHuiDiao?.("end", Date.now() - kaiShi, shiBie.chengGong);
    if (shiBie.chengGong) {
      return {
        miaoShu: String(shiBie.miaoShu || "").trim(),
        shiBai: false
      };
    }
    return { miaoShu: "", shiBai: true, cuoWu: shiBie.cuoWu || "视频理解失败" };
  } catch (cuoWu) {
    canShu.gongJuHuiDiao?.("end", Date.now() - kaiShi, false);
    return {
      miaoShu: "",
      shiBai: true,
      cuoWu: cuoWu instanceof Error ? cuoWu.message : "视频理解失败"
    };
  } finally {
    await fs.unlink(linShiLuJing).catch(() => null);
  }
}

router.post("/zhuan-xie-yin-pin", yinPinShangChuan.single("file"), async (req: AuthRequest, res) => {
  try {
    const wenJian = req.file;
    if (!wenJian) return res.status(400).json({ success: false, message: "缺少音频文件" });
    if (!shiFouYinPin(wenJian.mimetype) && !YIN_PIN_GE_SHI.has(wenJian.mimetype)) {
      return res.status(400).json({ success: false, message: "不支持的音频格式" });
    }
    const jieGuo = await shiBieYuYin({
      wen_jian_ming: wenJian.originalname || "audio.wav",
      base64: wenJian.buffer.toString("base64"),
      mime: wenJian.mimetype || "audio/wav"
    });
    if (!jieGuo.cheng_gong) {
      return res.status(502).json({ success: false, message: jieGuo.cuo_wu || "语音识别失败" });
    }
    res.json({ success: true, data: { wen_ben: jieGuo.wen_ben, lai_yuan: jieGuo.lai_yuan } });
  } catch (cuoWu) {
    console.error("语音转写失败:", cuoWu);
    res.status(500).json({ success: false, message: "语音转写失败" });
  }
});

router.post("/li-jie-shi-pin", shiPinShangChuan.single("file"), async (req: AuthRequest, res) => {
  try {
    const wenJian = req.file;
    if (!wenJian) return res.status(400).json({ success: false, message: "缺少视频文件" });
    if (!shiFouShiPin(wenJian.mimetype) && !SHI_PIN_GE_SHI.has(wenJian.mimetype)) {
      return res.status(400).json({ success: false, message: "不支持的视频格式" });
    }
    const jieGuo = await shengChengShiPinMiaoShu({
      shiPinBuffer: wenJian.buffer,
      mime: wenJian.mimetype,
      wenJianMing: wenJian.originalname,
      fuJiaTiShi: String(req.body?.ti_shi || "").slice(0, 500)
    });
    if (jieGuo.shiBai) {
      return res.status(502).json({ success: false, message: jieGuo.cuoWu || "视频理解失败" });
    }
    res.json({ success: true, data: { miao_shu: jieGuo.miaoShu } });
  } catch (cuoWu) {
    console.error("视频理解失败:", cuoWu);
    res.status(500).json({ success: false, message: "视频理解失败" });
  }
});

router.post("/ti-qu-wen-ben", tuPianShangChuan.single("file"), async (req: AuthRequest, res) => {
  try {
    const wenJian = req.file;
    if (!wenJian) return res.status(400).json({ success: false, message: "缺少图片文件" });
    if (!shiFouTuPian(wenJian.mimetype) && !TU_PIAN_GE_SHI.has(wenJian.mimetype)) {
      return res.status(400).json({ success: false, message: "不支持的图片格式" });
    }
    const wenBen = await ocrTuPian(wenJian.buffer.toString("base64"), wenJian.mimetype);
    res.json({ success: true, data: { wen_ben: wenBen } });
  } catch (cuoWu) {
    console.error("OCR失败:", cuoWu);
    res.status(500).json({ success: false, message: "图片文字提取失败" });
  }
});

router.post("/wen-jian-ti-qu-wen-ben", wenJianShangChuan.single("file"), async (req: AuthRequest, res) => {
  try {
    const wenJian = req.file;
    if (!wenJian) return res.status(400).json({ success: false, message: "缺少文件" });
    if (!shiFouYunXuWenJian(wenJian.mimetype, wenJian.originalname)) {
      return res.status(400).json({ success: false, message: "不支持的文件格式" });
    }

    if (shiFouTuPian(wenJian.mimetype)) {
      const wenBen = await ocrTuPian(wenJian.buffer.toString("base64"), wenJian.mimetype);
      return res.json({ success: true, data: { wen_ben: wenBen, lai_yuan: "ocr" } });
    }

    if (shiFouWenBenWenDang(wenJian.mimetype, wenJian.originalname)) {
      const wenBen = wenJian.buffer.toString("utf-8").replace(/\u0000/g, "").trim().slice(0, 12000);
      return res.json({ success: true, data: { wen_ben: wenBen, lai_yuan: "text" } });
    }

    if (shiFouPdfWenDang(wenJian.mimetype, wenJian.originalname)) {
      const pdfWenBen = await tiQuPdfWenBen(wenJian.buffer);
      if (pdfWenBen) {
        return res.json({ success: true, data: { wen_ben: pdfWenBen.slice(0, 12000), lai_yuan: "pdf" } });
      }
      const ocrWenBen = await ocrPdf(wenJian.buffer);
      return res.json({ success: true, data: { wen_ben: ocrWenBen.slice(0, 12000), lai_yuan: "ocr" } });
    }

    return res.status(400).json({ success: false, message: "该文件类型暂不支持文本提取" });
  } catch (cuoWu) {
    console.error("文件提取失败:", cuoWu);
    res.status(500).json({ success: false, message: "文件文本提取失败" });
  }
});

router.post("/gong-ju/sou-suo", async (req: AuthRequest, res) => {
  try {
    const chaXun = String(req.body?.cha_xun || "").trim().slice(0, 240);
    if (!chaXun) return res.status(400).json({ success: false, message: "缺少 cha_xun" });
    const shuLiang = Math.max(1, Math.min(10, Math.floor(Number(req.body?.shu_liang) || 5)));
    const gongJu = String(req.body?.gong_ju || "ddg").trim().toLowerCase() === "bing" ? "bing" : "ddg";
    const jieGuo = await souSuoWangYe({ cha_xun: chaXun, gong_ju: gongJu, shu_liang: shuLiang });
    res.json({ success: jieGuo.cheng_gong, data: jieGuo, message: jieGuo.cuo_wu });
  } catch (cuoWu) {
    console.error("搜索失败:", cuoWu);
    res.status(500).json({ success: false, message: "搜索失败" });
  }
});

router.post("/gong-ju/zhua-qu", async (req: AuthRequest, res) => {
  try {
    const url = String(req.body?.url || "").trim();
    if (!url) return res.status(400).json({ success: false, message: "缺少 url" });
    const zuiDa = Math.max(500, Math.min(20000, Math.floor(Number(req.body?.zui_da_zi_fu) || 6000)));
    const jieGuo = await zhuaQuWangYe({ url, zui_da_zi_fu: zuiDa });
    res.json({ success: jieGuo.cheng_gong, data: jieGuo, message: jieGuo.cuo_wu });
  } catch (cuoWu) {
    console.error("抓取失败:", cuoWu);
    res.status(500).json({ success: false, message: "抓取失败" });
  }
});

router.post("/gong-ju/ocr", wenJianShangChuan.single("file"), async (req: AuthRequest, res) => {
  try {
    const wenJian = req.file;
    if (!wenJian) return res.status(400).json({ success: false, message: "缺少文件" });
    const jieGuo = await ocrShiBieWenJian({
      wen_jian_ming: wenJian.originalname || "file",
      base64: wenJian.buffer.toString("base64"),
      mime: wenJian.mimetype || "application/octet-stream"
    });
    res.setHeader("x-gong-ju", "duo-mo-tai-ocr");
    res.json({ success: jieGuo.cheng_gong, data: jieGuo, message: jieGuo.cuo_wu });
  } catch (cuoWu) {
    console.error("OCR失败:", cuoWu);
    res.status(500).json({ success: false, message: "OCR失败" });
  }
});

router.post("/gong-ju/asr", yinPinShangChuan.single("file"), async (req: AuthRequest, res) => {
  try {
    const wenJian = req.file;
    if (!wenJian) return res.status(400).json({ success: false, message: "缺少音频文件" });
    const jieGuo = await shiBieYuYin({
      wen_jian_ming: wenJian.originalname || "audio.wav",
      base64: wenJian.buffer.toString("base64"),
      mime: wenJian.mimetype || "audio/wav",
      yu_yan: String(req.body?.yu_yan || "").trim() || undefined
    });
    res.setHeader("x-gong-ju", "duo-mo-tai-asr");
    res.json({ success: jieGuo.cheng_gong, data: jieGuo, message: jieGuo.cuo_wu });
  } catch (cuoWu) {
    console.error("ASR失败:", cuoWu);
    res.status(500).json({ success: false, message: "ASR失败" });
  }
});

router.post("/gong-ju/tts", async (req: AuthRequest, res) => {
  try {
    const { heChengYuYin } = await import("../services/多模态工具.js");
    const wenBen = String(req.body?.wen_ben || "").trim();
    if (!wenBen) return res.status(400).json({ success: false, message: "缺少 wen_ben" });
    const jieGuo = await heChengYuYin({
      wen_ben: wenBen,
      ge_shi: String(req.body?.ge_shi || "").trim() || undefined,
      yin_se: String(req.body?.yin_se || "").trim() || undefined,
      yu_su: req.body?.yu_su == null ? undefined : Number(req.body.yu_su)
    });
    res.setHeader("x-gong-ju", "duo-mo-tai-tts");
    res.json({ success: jieGuo.cheng_gong, data: jieGuo, message: jieGuo.cuo_wu });
  } catch (cuoWu) {
    console.error("TTS失败:", cuoWu);
    res.status(500).json({ success: false, message: "TTS失败" });
  }
});

export default router;