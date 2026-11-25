import { Router } from "express";
import { prisma } from "../db.js";
import { verifyToken, AuthRequest } from "../middleware/认证.js";
import { wenJianShangChuan, shiPinShangChuan } from "../middleware/上传.js";
import { tiQuYinPin, tiQuShiPinYuanYinPin } from "./语音转写.js";
import { ocrShiBieWenJian, shiBieYuYin } from "../services/多模态工具.js";

const router = Router();
router.use(verifyToken);

router.post("/zhuan-xie", wenJianShangChuan.single("file"), async (req: AuthRequest, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: "缺少音频文件" });
      return;
    }

    const yuYinJieGuo = await shiBieYuYin({
      wen_jian_ming: file.originalname || "audio.wav",
      base64: file.buffer.toString("base64"),
      mime: file.mimetype || "audio/wav"
    });
    if (yuYinJieGuo.cheng_gong && yuYinJieGuo.wen_ben) {
      res.json({
        success: true,
        data: {
          wen_ben: yuYinJieGuo.wen_ben,
          gong_ju: "asr_transcribe",
          lai_yuan: yuYinJieGuo.lai_yuan
        }
      });
      return;
    }

    const jieGuo = await tiQuYinPin(file.buffer, file.originalname || "audio.wav");
    if (!jieGuo.chengGong || !jieGuo.wenBen) {
      res.status(502).json({ success: false, message: jieGuo.cuoWu || yuYinJieGuo.cuo_wu || "语音转写失败" });
      return;
    }

    res.json({ success: true, data: { wen_ben: jieGuo.wenBen } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "语音转写失败";
    res.status(500).json({ success: false, message });
  }
});

router.post("/shi-pin-zhuan-xie", shiPinShangChuan.single("file"), async (req: AuthRequest, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: "缺少视频文件" });
      return;
    }

    const { yinPinBuffer, wenJianMing } = await tiQuShiPinYuanYinPin(file.buffer, file.originalname || "video.mp4");
    const yuYinJieGuo = await shiBieYuYin({
      wen_jian_ming: wenJianMing,
      base64: yinPinBuffer.toString("base64"),
      mime: "audio/wav"
    });
    if (yuYinJieGuo.cheng_gong && yuYinJieGuo.wen_ben) {
      res.json({
        success: true,
        data: {
          wen_ben: yuYinJieGuo.wen_ben,
          gong_ju: "asr_transcribe",
          lai_yuan: yuYinJieGuo.lai_yuan
        }
      });
      return;
    }

    const jieGuo = await tiQuYinPin(yinPinBuffer, wenJianMing);
    if (!jieGuo.chengGong || !jieGuo.wenBen) {
      res.status(502).json({ success: false, message: jieGuo.cuoWu || yuYinJieGuo.cuo_wu || "视频语音转写失败" });
      return;
    }

    res.json({ success: true, data: { wen_ben: jieGuo.wenBen } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "视频语音转写失败";
    res.status(500).json({ success: false, message });
  }
});

router.get("/pei-zhi", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { voiceEnabled: true, voiceReplyMode: true, voiceAutoPlay: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "用户不存在" });
      return;
    }

    res.json({
      success: true,
      data: {
        voice_enabled: user.voiceEnabled,
        voice_reply_mode: user.voiceReplyMode,
        voice_auto_play: user.voiceAutoPlay,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "获取语音配置失败" });
  }
});

router.put("/pei-zhi", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { voice_enabled, voice_reply_mode, voice_auto_play } = req.body;

    const updateData: any = {};
    if (typeof voice_enabled === "boolean") updateData.voiceEnabled = voice_enabled;
    if (["auto", "manual", "off"].includes(voice_reply_mode)) {
      updateData.voiceReplyMode = voice_reply_mode;
    }
    if (typeof voice_auto_play === "boolean") updateData.voiceAutoPlay = voice_auto_play;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { voiceEnabled: true, voiceReplyMode: true, voiceAutoPlay: true },
    });

    res.json({
      success: true,
      data: {
        voice_enabled: user.voiceEnabled,
        voice_reply_mode: user.voiceReplyMode,
        voice_auto_play: user.voiceAutoPlay,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "更新语音配置失败" });
  }
});

export default router;