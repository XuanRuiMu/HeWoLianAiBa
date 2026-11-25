import { prisma } from "../数据库";
import { AsyncLocalStorage } from "node:async_hooks";
import { lianWangSouSuo, peiZhiLianWangSouSuo, tiQuBiaoTi } from "./联网搜索";
import { peiZhiDuoMoTai } from "./多模态配置";
import { ocrShiBieWenJian, shiBieYuYin, souSuoWangYe, zhuaQuWangYe } from "./多模态工具.js";

export type GongJuMing = "web_search" | "web_fetch" | "ocr_extract" | "asr_transcribe" | "vision_analyze";

export type GongJuTiaoJian = {
  gong_ju: GongJuMing;
  qi_yong: boolean;
  yuan_yin: string;
  can_shu?: Record<string, unknown>;
};

type GongJuJiLu = {
  gong_ju: GongJuMing;
  cheng_gong: boolean;
  hao_miao: number;
  zhai_yao: string;
  shu_ju?: unknown;
};

const yunXuMing: GongJuMing[] = ["web_search", "web_fetch", "ocr_extract", "asr_transcribe", "vision_analyze"];
const GONG_JU_TIMEOUT_MS = Math.max(3000, Number(process.env.AI_TOOL_TIMEOUT_MS || 12000));
const GONG_JU_HUAN_CUN_TTL_MS = Math.max(30_000, Number(process.env.AI_TOOL_CACHE_TTL_MS || 10 * 60 * 1000));
const GONG_JU_HUAN_CUN_ZUI_DA = Math.max(20, Number(process.env.AI_TOOL_CACHE_MAX || 200));
const GONG_JU_KUAI_ZHAO_ZUI_DA = 1200;
const gongJuHuanCun = new Map<string, { dao_qi: number; zhi: unknown }>();

type AnQuanShangXiaWen = {
  userId?: string;
  userName?: string;
  roleId?: string;
  roleName?: string;
};
const anQuanShangXiaWen = new AsyncLocalStorage<AnQuanShangXiaWen>();

export function zaiAnQuanShangXiaWenYunXing<T>(can: AnQuanShangXiaWen, fn: () => Promise<T>): Promise<T> {
  return anQuanShangXiaWen.run(can, fn);
}

function dangQianAnQuan(): AnQuanShangXiaWen {
  return anQuanShangXiaWen.getStore() || {};
}

function qingLi(zhi: unknown, zuiDa = 800): string {
  return String(zhi || "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, zuiDa);
}

function httpWangZhi(zhi: unknown): string {
  const wen = String(zhi || "").trim();
  if (!/^https?:\/\//i.test(wen)) return "";
  try {
    const u = new URL(wen);
    if (!["http:", "https:"].includes(u.protocol)) return "";
    return u.toString();
  } catch {
    return "";
  }
}

function huanCunJian(gongJu: GongJuMing, can: Record<string, unknown>): string {
  return `${gongJu}:${JSON.stringify(can)}`;
}

function duHuanCun<T>(jian: string): T | null {
  const xiang = gongJuHuanCun.get(jian);
  if (!xiang) return null;
  if (xiang.dao_qi <= Date.now()) {
    gongJuHuanCun.delete(jian);
    return null;
  }
  return xiang.zhi as T;
}

function xieHuanCun(jian: string, zhi: unknown): void {
  if (gongJuHuanCun.size >= GONG_JU_HUAN_CUN_ZUI_DA) {
    const tou = gongJuHuanCun.keys().next().value;
    if (tou) gongJuHuanCun.delete(tou);
  }
  gongJuHuanCun.set(jian, { dao_qi: Date.now() + GONG_JU_HUAN_CUN_TTL_MS, zhi });
}

async function daiChaoShi<T>(gongZuo: Promise<T>, gongJu: GongJuMing): Promise<T> {
  let jiShi: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      gongZuo,
      new Promise<T>((_, ju) => {
        jiShi = setTimeout(() => ju(new Error(`工具 ${gongJu} 超时(${GONG_JU_TIMEOUT_MS}ms)`)), GONG_JU_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (jiShi) clearTimeout(jiShi);
  }
}

async function jiLuGongJu(jiLu: GongJuJiLu, can: Record<string, unknown>): Promise<void> {
  const anQuan = dangQianAnQuan();
  try {
    await prisma.xiTongRiZhi.create({
      data: {
        userId: anQuan.userId,
        userName: anQuan.userName,
        action: `tool.${jiLu.gong_ju}`,
        module: "ai_tool",
        targetType: anQuan.roleId ? "role" : "tool",
        targetId: anQuan.roleId || jiLu.gong_ju,
        targetName: anQuan.roleName || jiLu.gong_ju,
        result: jiLu.cheng_gong ? "ok" : "fail",
        detail: JSON.stringify({
          gong_ju: jiLu.gong_ju,
          cheng_gong: jiLu.cheng_gong,
          hao_miao: jiLu.hao_miao,
          zhai_yao: jiLu.zhai_yao.slice(0, 300),
          can_shu: can,
          kuai_zhao: qingLi(JSON.stringify(jiLu.shu_ju ?? ""), GONG_JU_KUAI_ZHAO_ZUI_DA)
        }).slice(0, 4000)
      }
    });
  } catch {
    // 工具审计失败不阻断主流程
  }
}

function zhaiYaoJieGuo(jieGuo: SouSuoJieGuoHua): string {
  return jieGuo.tiao_mu
    .slice(0, 3)
    .map((t, i) => `${i + 1}. ${t.biao_ti}${t.lai_yuan ? ` (${t.lai_yuan})` : ""}`)
    .join("；")
    .slice(0, 500);
}

export type SouSuoJieGuoHua = {
  cheng_gong: boolean;
  gong_ju: GongJuMing;
  tiao_mu: Array<{ biao_ti: string; lian_jie: string; nei_rong: string; lai_yuan?: string }>;
  yuan_shi?: unknown;
  cuo_wu?: string;
};

function guiYiGongJuMing(zhi: unknown): GongJuMing | null {
  const ming = String(zhi || "").trim().toLowerCase();
  if (yunXuMing.includes(ming as GongJuMing)) return ming as GongJuMing;
  return null;
}

function congWenBenTiQuWangZhi(wenBen: string): string[] {
  const piPei = String(wenBen || "").match(/https?:\/\/[^\s)\]>"']+/gi) || [];
  const jieGuo: string[] = [];
  for (const url of piPei) {
    const heFa = httpWangZhi(url);
    if (heFa && !jieGuo.includes(heFa)) jieGuo.push(heFa);
    if (jieGuo.length >= 2) break;
  }
  return jieGuo;
}

export function tuiDuanGongJuTiaoJian(can: {
  userMessage: string;
  fuJian?: Array<{ mime: string; url?: string; name?: string }>;
  kaiQiLianWang?: boolean;
}): GongJuTiaoJian[] {
  const wenBen = qingLi(can.userMessage, 1200);
  const fuJian = Array.isArray(can.fuJian) ? can.fuJian : [];
  const wangZhi = congWenBenTiQuWangZhi(wenBen);
  const yaoSouSuo = Boolean(can.kaiQiLianWang) || /最新|今天|现在|新闻|热搜|天气|股价|汇率|价格|几点|什么时候|哪里买|官网|链接|来源|搜索|查一下|帮我找/i.test(wenBen);
  const yaoZhuaQu = wangZhi.length > 0;
  const yaoOcr = fuJian.some((f) => /image\//i.test(String(f.mime || "")) || /\.(png|jpe?g|webp|bmp|gif|pdf)$/i.test(String(f.name || "")));
  const yaoAsr = fuJian.some((f) => /audio\//i.test(String(f.mime || "")) || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(String(f.name || "")));
  const yaoShiJue = fuJian.some((f) => /image\//i.test(String(f.mime || "")));

  const tiaoJian: GongJuTiaoJian[] = [];
  if (yaoSouSuo) {
    tiaoJian.push({
      gong_ju: "web_search",
      qi_yong: true,
      yuan_yin: can.kaiQiLianWang ? "用户开启联网或问题需要外部信息" : "问题包含时效/查找意图",
      can_shu: { cha_xun: wenBen.slice(0, 120), gong_ju: "ddg", shu_liang: 5 }
    });
  }
  if (yaoZhuaQu) {
    tiaoJian.push({
      gong_ju: "web_fetch",
      qi_yong: true,
      yuan_yin: "用户消息包含可抓取链接",
      can_shu: { url: wangZhi[0], zui_da_zi_fu: 4000 }
    });
  }
  if (yaoOcr) {
    tiaoJian.push({ gong_ju: "ocr_extract", qi_yong: true, yuan_yin: "检测到图片或PDF附件，可能需要提取文字" });
  }
  if (yaoAsr) {
    tiaoJian.push({ gong_ju: "asr_transcribe", qi_yong: true, yuan_yin: "检测到音频附件，可能需要转写" });
  }
  if (yaoShiJue) {
    tiaoJian.push({ gong_ju: "vision_analyze", qi_yong: true, yuan_yin: "检测到图片附件，可能需要视觉理解" });
  }
  return tiaoJian.slice(0, 4);
}

export async function zhiXingGongJuMingLing(can: {
  ming_ling: string;
  can_shu?: Record<string, unknown>;
}): Promise<SouSuoJieGuoHua> {
  const gongJu = guiYiGongJuMing(can.ming_ling);
  const canShu = (can.can_shu && typeof can.can_shu === "object") ? can.can_shu : {};
  if (!gongJu) {
    return { cheng_gong: false, gong_ju: "web_search", tiao_mu: [], cuo_wu: `不支持的工具: ${qingLi(can.ming_ling, 60)}` };
  }

  const kaiShi = Date.now();
  const huanCunKey = huanCunJian(gongJu, canShu);
  const huanCun = duHuanCun<SouSuoJieGuoHua>(huanCunKey);
  if (huanCun) {
    void jiLuGongJu({ gong_ju: gongJu, cheng_gong: huanCun.cheng_gong, hao_miao: 0, zhai_yao: `[缓存] ${zhaiYaoJieGuo(huanCun)}`, shu_ju: huanCun.yuan_shi }, canShu);
    return huanCun;
  }

  try {
    const jieGuo = await daiChaoShi(zhiXingGongJuNeiBu(gongJu, canShu), gongJu);
    xieHuanCun(huanCunKey, jieGuo);
    void jiLuGongJu({ gong_ju: gongJu, cheng_gong: jieGuo.cheng_gong, hao_miao: Date.now() - kaiShi, zhai_yao: zhaiYaoJieGuo(jieGuo), shu_ju: jieGuo.yuan_shi }, canShu);
    return jieGuo;
  } catch (cuoWu) {
    const shiBai: SouSuoJieGuoHua = {
      cheng_gong: false,
      gong_ju: gongJu,
      tiao_mu: [],
      cuo_wu: cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
    };
    void jiLuGongJu({ gong_ju: gongJu, cheng_gong: false, hao_miao: Date.now() - kaiShi, zhai_yao: shiBai.cuo_wu || "失败", shu_ju: shiBai }, canShu);
    return shiBai;
  }
}

async function zhiXingGongJuNeiBu(gongJu: GongJuMing, canShu: Record<string, unknown>): Promise<SouSuoJieGuoHua> {
  if (gongJu === "web_search") {
    const chaXun = qingLi(canShu.cha_xun, 240);
    const shuLiang = Math.max(1, Math.min(10, Math.floor(Number(canShu.shu_liang) || 5)));
    const gongJuCanShu = String(canShu.gong_ju || "ddg");
    const jieGuo = await souSuoWangYe({ cha_xun: chaXun, gong_ju: gongJuCanShu, shu_liang: shuLiang });
    if (jieGuo.cheng_gong && jieGuo.jie_guo.length > 0) {
      return {
        cheng_gong: true,
        gong_ju: "web_search",
        tiao_mu: jieGuo.jie_guo.map((x) => ({ biao_ti: x.title, lian_jie: x.url, nei_rong: x.snippet, lai_yuan: x.source || jieGuo.lai_yuan })),
        yuan_shi: jieGuo
      };
    }
    const peiZhi = peiZhiLianWangSouSuo();
    if (peiZhi.qiYong) {
      const jiu = await lianWangSouSuo(chaXun, shuLiang);
      return {
        cheng_gong: jiu.chengGong && jiu.tiaoMu.length > 0,
        gong_ju: "web_search",
        tiao_mu: jiu.tiaoMu.map((t) => ({ biao_ti: t.biaoTi, lian_jie: t.lianJie, nei_rong: t.neiRong, lai_yuan: t.laiYuan })),
        yuan_shi: { xin: jieGuo, jiu },
        cuo_wu: jiu.chengGong ? undefined : (jiu.cuoWu || jieGuo.cuo_wu)
      };
    }
    return { cheng_gong: false, gong_ju: "web_search", tiao_mu: [], yuan_shi: jieGuo, cuo_wu: jieGuo.cuo_wu || "搜索失败" };
  }

  if (gongJu === "web_fetch") {
    const url = httpWangZhi(canShu.url);
    if (!url) return { cheng_gong: false, gong_ju: "web_fetch", tiao_mu: [], cuo_wu: "缺少合法 url" };
    const jieGuo = await zhuaQuWangYe({ url, zui_da_zi_fu: Math.floor(Number(canShu.zui_da_zi_fu) || 4000) });
    return {
      cheng_gong: jieGuo.cheng_gong,
      gong_ju: "web_fetch",
      tiao_mu: jieGuo.cheng_gong ? [{ biao_ti: jieGuo.biao_ti || tiQuBiaoTi(jieGuo.url), lian_jie: jieGuo.url, nei_rong: jieGuo.nei_rong, lai_yuan: jieGuo.lai_yuan }] : [],
      yuan_shi: jieGuo,
      cuo_wu: jieGuo.cuo_wu
    };
  }

  if (gongJu === "ocr_extract") {
    const jieGuo = await ocrShiBieWenJian({
      wen_jian_ming: qingLi(canShu.wen_jian_ming, 120) || "file",
      base64: String(canShu.base64 || ""),
      mime: qingLi(canShu.mime, 120) || "application/octet-stream"
    });
    return {
      cheng_gong: jieGuo.cheng_gong,
      gong_ju: "ocr_extract",
      tiao_mu: jieGuo.cheng_gong ? [{ biao_ti: jieGuo.wen_jian_ming, lian_jie: "", nei_rong: jieGuo.wen_ben, lai_yuan: jieGuo.lai_yuan }] : [],
      yuan_shi: jieGuo,
      cuo_wu: jieGuo.cuo_wu
    };
  }

  if (gongJu === "asr_transcribe") {
    const jieGuo = await shiBieYuYin({
      wen_jian_ming: qingLi(canShu.wen_jian_ming, 120) || "audio.wav",
      base64: String(canShu.base64 || ""),
      mime: qingLi(canShu.mime, 120) || "audio/wav",
      yu_yan: qingLi(canShu.yu_yan, 20) || undefined
    });
    return {
      cheng_gong: jieGuo.cheng_gong,
      gong_ju: "asr_transcribe",
      tiao_mu: jieGuo.cheng_gong ? [{ biao_ti: "语音转写", lian_jie: "", nei_rong: jieGuo.wen_ben, lai_yuan: jieGuo.lai_yuan }] : [],
      yuan_shi: jieGuo,
      cuo_wu: jieGuo.cuo_wu
    };
  }

  const miaoShu = qingLi(canShu.miao_shu || canShu.nei_rong, 1200);
  const chengGong = Boolean(miaoShu);
  return {
    cheng_gong: chengGong,
    gong_ju: "vision_analyze",
    tiao_mu: chengGong ? [{ biao_ti: "视觉分析", lian_jie: "", nei_rong: miaoShu, lai_yuan: "vision" }] : [],
    yuan_shi: { miao_shu: miaoShu },
    cuo_wu: chengGong ? undefined : "缺少视觉描述"
  };
}

export function geShiHuaGongJuJieGuo(jieGuo: SouSuoJieGuoHua): string {
  if (!jieGuo.cheng_gong || jieGuo.tiao_mu.length === 0) {
    return `工具 ${jieGuo.gong_ju} 未获得可用结果${jieGuo.cuo_wu ? `：${qingLi(jieGuo.cuo_wu, 120)}` : ""}`;
  }
  return jieGuo.tiao_mu
    .slice(0, 5)
    .map((t, i) => {
      const tou = `${i + 1}. ${qingLi(t.biao_ti, 80) || "结果"}`;
      const lian = t.lian_jie ? `\n链接: ${t.lian_jie}` : "";
      const nei = t.nei_rong ? `\n内容: ${qingLi(t.nei_rong, 320)}` : "";
      return `${tou}${lian}${nei}`;
    })
    .join("\n\n")
    .slice(0, 1800);
}