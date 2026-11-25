/**
 * 通用多模态工具服务。
 * 网页搜索/抓取走免费通道；语音识别与合成走硅基流动免费通道。
 * 不绑定任何单一模型厂商官方工具端点。
 */
import { peiZhi } from "../配置.js";
import { duoMoTaiPeiZhi } from "./多模态配置.js";

type SouSuoGongJu = "ddg" | "bing";
type SouSuoJieGuo = { title: string; url: string; snippet: string; source: string };
type SouSuoFanHui = {
  cheng_gong: boolean;
  gong_ju: SouSuoGongJu;
  cha_xun: string;
  jie_guo: SouSuoJieGuo[];
  lai_yuan: "mian_fei";
  cuo_wu?: string;
};
type ZhuaQuFanHui = {
  cheng_gong: boolean;
  url: string;
  biao_ti: string;
  nei_rong: string;
  jie_qu: boolean;
  lai_yuan: "mian_fei";
  cuo_wu?: string;
};
type OcrFanHui = {
  cheng_gong: boolean;
  wen_jian_ming: string;
  wen_ben: string;
  ye_shu?: number;
  hao_miao?: number;
  lai_yuan: "wei_pei_zhi";
  cuo_wu?: string;
};

function qingLiWenBen(zhi: unknown, zuiDa: number): string {
  return String(zhi || "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, zuiDa);
}

function guiYiSouSuoGongJu(gongJu: unknown): SouSuoGongJu {
  return String(gongJu || "ddg").trim().toLowerCase() === "bing" ? "bing" : "ddg";
}

function bianMaCanShu(zhi: Record<string, string>): string {
  return Object.entries(zhi)
    .map(([jian, zhiXiang]) => `${encodeURIComponent(jian)}=${encodeURIComponent(zhiXiang)}`)
    .join("&");
}

function jieMaHtmlShiTi(wenBen: string): string {
  return wenBen
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const ma = Number(n);
      return Number.isFinite(ma) ? String.fromCodePoint(ma) : "";
    });
}

function tiQuHtmlBiaoTi(html: string): string {
  const piPei = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return qingLiWenBen(jieMaHtmlShiTi(piPei?.[1] || ""), 200);
}

function tiQuHtmlWenBen(html: string): string {
  const quDiao = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header|footer)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return qingLiWenBen(jieMaHtmlShiTi(quDiao), 12000);
}

async function mianFeiSouSuo(chaXun: string, gongJu: SouSuoGongJu, shuLiang: number): Promise<SouSuoJieGuo[]> {
  if (gongJu === "bing") {
    const url = `https://cn.bing.com/search?${bianMaCanShu({ q: chaXun, enseach: "1" })}`;
    const xiangYing = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml"
      },
      signal: AbortSignal.timeout(12000)
    });
    if (!xiangYing.ok) throw new Error(`Bing 搜索失败: ${xiangYing.status}`);
    const html = await xiangYing.text();
    const kuai: SouSuoJieGuo[] = [];
    const li = html.match(/<li class="b_algo"[\s\S]*?<\/li>/g) || [];
    for (const item of li) {
      const href = item.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"/i)?.[1] || "";
      const title = qingLiWenBen(jieMaHtmlShiTi(item.match(/<h2[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] || ""), 160);
      const snippet = qingLiWenBen(jieMaHtmlShiTi(item.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ""), 280);
      if (!href || !title) continue;
      kuai.push({ title, url: href, snippet, source: "bing" });
      if (kuai.length >= shuLiang) break;
    }
    return kuai;
  }

  const url = `https://html.duckduckgo.com/html/?${bianMaCanShu({ q: chaXun })}`;
  const xiangYing = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
    },
    body: bianMaCanShu({ q: chaXun, b: "" }),
    signal: AbortSignal.timeout(12000)
  });
  if (!xiangYing.ok) throw new Error(`DDG 搜索失败: ${xiangYing.status}`);
  const html = await xiangYing.text();
  const kuai: SouSuoJieGuo[] = [];
  const jieGuo = html.match(/<div[^>]+class="[^"]*result[^"]*"[\s\S]*?<\/div>\s*<\/div>/g) || [];
  for (const item of jieGuo) {
    const href = item.match(/class="result__a"[^>]+href="([^"]+)"/i)?.[1] || "";
    const title = qingLiWenBen(jieMaHtmlShiTi(item.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/i)?.[1] || ""), 160);
    const snippet = qingLiWenBen(jieMaHtmlShiTi(item.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i)?.[1] || item.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || ""), 280);
    if (!href || !title) continue;
    const zhenUrl = href.startsWith("//duckduckgo.com/l/?") ? (() => { try { return new URL(`https:${href}`).searchParams.get("uddg") || href; } catch { return href; } })() : href;
    kuai.push({ title, url: zhenUrl, snippet, source: "ddg" });
    if (kuai.length >= shuLiang) break;
  }
  return kuai;
}

export async function souSuoWangYe(can: {
  cha_xun: string;
  gong_ju?: "ddg" | "bing" | string;
  shu_liang?: number;
}): Promise<SouSuoFanHui> {
  const chaXun = qingLiWenBen(can.cha_xun, 240);
  const gongJu = guiYiSouSuoGongJu(can.gong_ju);
  const shuLiang = Math.max(1, Math.min(10, Math.floor(Number(can.shu_liang) || 5)));
  if (!chaXun) {
    return { cheng_gong: false, gong_ju: gongJu, cha_xun: chaXun, jie_guo: [], lai_yuan: "mian_fei", cuo_wu: "缺少 cha_xun" };
  }
  try {
    const jieGuo = await mianFeiSouSuo(chaXun, gongJu, shuLiang);
    if (jieGuo.length > 0) {
      return { cheng_gong: true, gong_ju: gongJu, cha_xun: chaXun, jie_guo: jieGuo, lai_yuan: "mian_fei" };
    }
  } catch (cuoWu) {
    return {
      cheng_gong: false,
      gong_ju: gongJu,
      cha_xun: chaXun,
      jie_guo: [],
      lai_yuan: "mian_fei",
      cuo_wu: cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
    };
  }
  return { cheng_gong: false, gong_ju: gongJu, cha_xun: chaXun, jie_guo: [], lai_yuan: "mian_fei", cuo_wu: "免费搜索未返回结果" };
}

export async function zhuaQuWangYe(can: { url: string; zui_da_zi_fu?: number }): Promise<ZhuaQuFanHui> {
  const muBiao = String(can.url || "").trim();
  const zuiDa = Math.max(500, Math.min(20000, Math.floor(Number(can.zui_da_zi_fu) || 6000)));
  if (!muBiao) {
    return { cheng_gong: false, url: muBiao, biao_ti: "", nei_rong: "", jie_qu: false, lai_yuan: "mian_fei", cuo_wu: "缺少 url" };
  }
  let urlDuiXiang: URL;
  try {
    urlDuiXiang = new URL(muBiao);
  } catch {
    return { cheng_gong: false, url: muBiao, biao_ti: "", nei_rong: "", jie_qu: false, lai_yuan: "mian_fei", cuo_wu: "url 格式无效" };
  }
  if (!["http:", "https:"].includes(urlDuiXiang.protocol)) {
    return { cheng_gong: false, url: muBiao, biao_ti: "", nei_rong: "", jie_qu: false, lai_yuan: "mian_fei", cuo_wu: "仅支持 http/https" };
  }
  try {
    const xiangYing = await fetch(urlDuiXiang.toString(), {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8"
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow"
    });
    if (!xiangYing.ok) throw new Error(`抓取失败: ${xiangYing.status}`);
    const leiXing = String(xiangYing.headers.get("content-type") || "").toLowerCase();
    const yuanShi = await xiangYing.text();
    const biaoTi = leiXing.includes("html") ? tiQuHtmlBiaoTi(yuanShi) : "";
    const neiRongQuan = leiXing.includes("html") ? tiQuHtmlWenBen(yuanShi) : qingLiWenBen(yuanShi, 12000);
    const neiRong = neiRongQuan.slice(0, zuiDa);
    return {
      cheng_gong: Boolean(neiRong),
      url: urlDuiXiang.toString(),
      biao_ti: biaoTi,
      nei_rong: neiRong,
      jie_qu: neiRongQuan.length > neiRong.length,
      lai_yuan: "mian_fei",
      cuo_wu: neiRong ? undefined : "页面未提取到正文"
    };
  } catch (cuoWu) {
    return {
      cheng_gong: false,
      url: muBiao,
      biao_ti: "",
      nei_rong: "",
      jie_qu: false,
      lai_yuan: "mian_fei",
      cuo_wu: cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
    };
  }
}

export async function ocrShiBieWenJian(can: { wen_jian_ming: string; base64: string; mime: string }): Promise<OcrFanHui> {
  const wenJianMing = qingLiWenBen(can.wen_jian_ming, 120) || "file";
  return {
    cheng_gong: false,
    wen_jian_ming: wenJianMing,
    wen_ben: "",
    lai_yuan: "wei_pei_zhi",
    cuo_wu: "OCR 未配置可用通道"
  };
}

export async function shiBieYuYin(can: {
  wen_jian_ming: string;
  base64: string;
  mime: string;
  yu_yan?: string;
}): Promise<{ cheng_gong: boolean; wen_ben: string; lai_yuan: "gui_ji_liu_dong" | "shi_bai"; cuo_wu?: string }> {
  const moTai = duoMoTaiPeiZhi();
  const guiJi = moTai.guiJiLiuDong;
  if (!guiJi.apiKey) {
    return { cheng_gong: false, wen_ben: "", lai_yuan: "shi_bai", cuo_wu: "未配置语音识别通道" };
  }
  const base64 = String(can.base64 || "").trim();
  if (!base64) return { cheng_gong: false, wen_ben: "", lai_yuan: "shi_bai", cuo_wu: "缺少音频 base64" };
  try {
    const erJinZhi = Buffer.from(base64, "base64");
    const biaoDan = new FormData();
    biaoDan.append("model", guiJi.asrModel);
    biaoDan.append("file", new Blob([erJinZhi], { type: can.mime || "audio/wav" }), can.wen_jian_ming || "audio.wav");
    if (can.yu_yan) biaoDan.append("language", String(can.yu_yan));
    const xiangYing = await fetch(`${guiJi.baseUrl.replace(/\/+$/, "")}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${guiJi.apiKey}` },
      body: biaoDan,
      signal: AbortSignal.timeout(guiJi.chaoShiMs)
    });
    if (!xiangYing.ok) throw new Error(`语音识别失败: ${xiangYing.status} ${await xiangYing.text().catch(() => "")}`);
    const shuJu = await xiangYing.json() as { text?: unknown };
    const wenBen = qingLiWenBen(shuJu?.text, 12000);
    if (!wenBen) throw new Error("语音识别返回空文本");
    return { cheng_gong: true, wen_ben: wenBen, lai_yuan: "gui_ji_liu_dong" };
  } catch (cuoWu) {
    return { cheng_gong: false, wen_ben: "", lai_yuan: "shi_bai", cuo_wu: cuoWu instanceof Error ? cuoWu.message : String(cuoWu) };
  }
}

export async function heChengYuYin(can: {
  wen_ben: string;
  ge_shi?: string;
  yin_se?: string;
  yu_su?: number;
}): Promise<{ cheng_gong: boolean; mime: string; base64: string; lai_yuan: "gui_ji_liu_dong" | "shi_bai"; cuo_wu?: string }> {
  const wenBen = qingLiWenBen(can.wen_ben, 4000);
  if (!wenBen) return { cheng_gong: false, mime: "audio/mpeg", base64: "", lai_yuan: "shi_bai", cuo_wu: "缺少 wen_ben" };
  const moTai = duoMoTaiPeiZhi();
  const guiJi = moTai.guiJiLiuDong;
  const yinSe = qingLiWenBen(can.yin_se, 180) || guiJi.ttsVoice;
  const geShi = ["mp3", "wav", "opus", "pcm"].includes(String(can.ge_shi || guiJi.ttsFormat).toLowerCase())
    ? String(can.ge_shi || guiJi.ttsFormat).toLowerCase()
    : guiJi.ttsFormat;
  if (!guiJi.apiKey) {
    return { cheng_gong: false, mime: "audio/mpeg", base64: "", lai_yuan: "shi_bai", cuo_wu: "未配置语音合成通道" };
  }
  try {
    const xiangYing = await fetch(`${guiJi.baseUrl.replace(/\/+$/, "")}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${guiJi.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: guiJi.ttsModel,
        input: wenBen,
        voice: yinSe,
        response_format: geShi,
        speed: Math.max(0.5, Math.min(2, Number(can.yu_su) || 1))
      }),
      signal: AbortSignal.timeout(guiJi.chaoShiMs)
    });
    if (!xiangYing.ok) throw new Error(`语音合成失败: ${xiangYing.status} ${await xiangYing.text().catch(() => "")}`);
    const shuZu = Buffer.from(await xiangYing.arrayBuffer());
    if (shuZu.length <= 0) throw new Error("语音合成返回空音频");
    const mime = geShi === "wav" ? "audio/wav" : geShi === "opus" ? "audio/opus" : geShi === "pcm" ? "audio/pcm" : "audio/mpeg";
    return { cheng_gong: true, mime, base64: shuZu.toString("base64"), lai_yuan: "gui_ji_liu_dong" };
  } catch (cuoWu) {
    return { cheng_gong: false, mime: "audio/mpeg", base64: "", lai_yuan: "shi_bai", cuo_wu: cuoWu instanceof Error ? cuoWu.message : String(cuoWu) };
  }
}