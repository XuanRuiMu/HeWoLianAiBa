#!/usr/bin/env node
/**
 * 真实通关测试：20-50轮完整游戏 + 数据变化记录
 * 使用 Node.js + socket.io-client 直接测试后端 API
 */

import fetch from 'node-fetch';
import { io } from 'socket.io-client';
import fs from 'fs';
import path from 'path';

const MAX_ROUNDS = 50;
const MIN_ROUNDS = 20;
const testMessages = [
  "你好呀！今天天气真不错呢",
  "你平时喜欢做什么呀？",
  "我也喜欢看电影，特别是科幻片",
  "最近有什么开心的事吗？",
  "听起来很有趣呢",
  "我也觉得我们很聊得来",
  "你最喜欢的食物是什么？",
  "周末通常怎么度过？",
  "有什么梦想想要实现吗？",
  "聊得真开心，不想结束呢",
  "你的性格真好，很容易相处",
  "感觉我们很有共同语言",
  "能不能多聊聊你的兴趣爱好？",
  "我也想更了解你一些",
  "今天聊得很愉快",
  "你对我印象怎么样？",
  "我想我们可以做很好的朋友",
  "你的眼神里有光",
  "和你聊天很放松",
  "希望我们能一直这样聊下去",
  "你是个很特别的人",
  "谢谢你陪我聊天",
  "今天真的很快乐",
  "希望明天还能见到你",
  "晚安，做个好梦",
  "明天见吧",
  "期待我们的下次见面",
  "你是我见过最有趣的人",
  "每次和你聊天都很放松",
  "你的笑容真好看",
  "想一直和你在一起",
  "你让我感到很安心",
  "我们很合拍呢",
  "好像认识很久了",
  "这种感觉真好",
  "不想和你分开",
  "你对我来说很重要",
  "想保护你一辈子",
  "愿意给我一个机会吗？",
  "我喜欢你，做我女朋友吧",
];

const existingPhone = '13819038169';
const testCode = '123456';
const socketUrl = 'http://localhost:3000';

interface GameStateSnapshot {
  round: number;
  timestamp: string;
  userMessage: string;
  aiResponse: string;
  haoGanDu: any;
  challengeInfo: any;
  gameEnded: boolean;
  endReason: string | null;
}

async function loginAndGetToken(): Promise<string> {
  const res = await fetch('http://localhost:5173/api/认证/登录', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shou_ji_hao: '13819038169', mi_ma: '123456', ip: '127.0.0.1' })
  });
  const loginResult = await res.json();
  
  if (!loginResult.cheng_gong) {
    throw new Error(`登录失败: ${loginResult.ti_shi}`);
  }
  return loginResult.shu_ju.令牌;
}

async function startChallenge(token: string): Promise<{ jiao_se_id: string }> {
  const res = await fetch('http://localhost:5173/api/挑战/开始', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ wan_jia_xing_bie: '男', dui_xiang_xing_bie: '女' })
  });
  const result = await res.json();
  
  if (!result.cheng_gong) {
    throw new Error(`开始挑战失败: ${result.ti_shi}`);
  }
  return { jiao_se_id: result.shu_ju?.角色ID || result.shu_ju?.id };
}

async function getHaoGanDu(token: string, jiao_se_id: string) {
  const res = await fetch(`http://localhost:5173/api/好感度/${jiao_se_id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await res.json();
  
  if (result.cheng_gong) return result.shu_ju;
  return null;
}

async function getChallengeInfo(token: string) {
  const res = await fetch('http://localhost:5173/api/挑战/我的概况', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await res.json();
  
  if (result.cheng_gong) return result.shu_ju.gai_kuang; // 返回概况数组
  return null;
}

async function sendChatMessage(socket: any, jiao_se_id: string, content: string): Promise<void> {
  return new Promise((resolve) => {
    socket.emit('发送消息', { 角色ID: jiao_se_id, 内容: content }, (response: any) => {
      resolve();
    });
  });
}

async function waitForAIResponse(socket: any, timeout: number = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('等待AI回复超时'));
    }, timeout);
    
    socket.once('角色回复', (data: any) => {
      clearTimeout(timer);
      if (data.消息列表 && data.消息列表.length > 0) {
        resolve(data.消息列表[0].内容 || '');
      } else {
        resolve('');
      }
    });
  });
}

async function main() {
  console.log('=== 真实通关测试开始 ===');
  
  const MAX_ROUNDS = 50;
  const MIN_ROUNDS = 20;
  const testMessages = [
    "你好呀！今天天气真不错呢",
    "你平时喜欢做什么呀？",
    "我也喜欢看电影，特别是科幻片",
    "最近有什么开心的事吗？",
    "听起来很有趣呢",
    "我也觉得我们很聊得来",
    "你最喜欢的食物是什么？",
    "周末通常怎么度过？",
    "有什么梦想想要实现吗？",
    "聊得真开心，不想结束呢",
    "你的性格真好，很容易相处",
    "感觉我们很有共同语言",
    "能不能多聊聊你的兴趣爱好？",
    "我也想更了解你一些",
    "今天聊得很愉快",
    "你对我印象怎么样？",
    "我想我们可以做很好的朋友",
    "你的眼神里有光",
    "和你聊天很放松",
    "希望我们能一直这样聊下去",
    "你是个很特别的人",
    "谢谢你陪我聊天",
    "今天真的很快乐",
    "希望明天还能见到你",
    "晚安，做个好梦",
    "明天见吧",
    "期待我们的下次见面",
    "你是我见过最有趣的人",
    "每次和你聊天都很放松",
    "你的笑容真好看",
    "想一直和你在一起",
    "你让我感到很安心",
    "我们很合拍呢",
    "好像认识很久了",
    "这种感觉真好",
    "不想和你分开",
    "你对我来说很重要",
    "想保护你一辈子",
    "愿意给我一个机会吗？",
    "我喜欢你，做我女朋友吧",
  ];

  const existingPhone = '13819038169';
  const testCode = '123456';
  const socketUrl = 'http://localhost:3000';

  interface GameStateSnapshot {
    round: number;
    timestamp: string;
    userMessage: string;
    aiResponse: string;
    haoGanDu: any;
    challengeInfo: any;
    gameEnded: boolean;
    endReason: string | null;
  }

  async function loginAndGetToken(): Promise<string> {
    const res = await fetch('http://localhost:5173/api/认证/登录', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shou_ji_hao: '13819038169', mi_ma: '123456', ip: '127.0.0.1' })
    });
    const loginResult = await res.json();
    
    if (!loginResult.cheng_gong) {
      throw new Error(`登录失败: ${loginResult.ti_shi}`);
    }
    return loginResult.shu_ju.令牌;
  }

  async function startChallenge(token: string): Promise<{ jiao_se_id: string }> {
    const res = await fetch('http://localhost:5173/api/挑战/开始', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ wan_jia_xing_bie: '男', dui_xiang_xing_bie: '女' })
    });
    const result = await res.json();
    
    if (!result.cheng_gong) {
      throw new Error(`开始挑战失败: ${result.ti_shi}`);
    }
    return { jiao_se_id: result.shu_ju?.角色ID || result.shu_ju?.id };
  }

  async function getHaoGanDu(token: string, jiao_se_id: string) {
    const res = await fetch(`http://localhost:5173/api/好感度/${jiao_se_id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    
    if (result.cheng_gong) return result.shu_ju;
    return null;
  }

  async function getChallengeInfo(token: string) {
    const res = await fetch('http://localhost:5173/api/挑战/我的概况', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    
    if (result.cheng_gong) return result.shu_ju.gai_kuang; // 返回概况数组
    return null;
  }

  async function sendChatMessage(socket: any, jiao_se_id: string, content: string): Promise<void> {
    return new Promise((resolve) => {
      socket.emit('发送消息', { 角色ID: jiao_se_id, 内容: content }, (response: any) => {
        resolve();
      });
    });
  }

  async function waitForAIResponse(socket: any, timeout: number = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('等待AI回复超时'));
      }, timeout);
      
      socket.once('角色回复', (data: any) => {
        clearTimeout(timer);
        if (data.消息列表 && data.消息列表.length > 0) {
          resolve(data.消息列表[0].内容 || '');
        } else {
          resolve('');
        }
      });
    });
  }

  async function main() {
    console.log('=== 真实通关测试开始 ===');
    
    const MAX_ROUNDS = 50;
    const MIN_ROUNDS = 20;
    const testMessages = [
      "你好呀！今天天气真不错呢",
      "你平时喜欢做什么呀？",
      "我也喜欢看电影，特别是科幻片",
      "最近有什么开心的事吗？",
      "听起来很有趣呢",
      "我也觉得我们很聊得来",
      "你最喜欢的食物是什么？",
      "周末通常怎么度过？",
      "有什么梦想想要实现吗？",
      "聊得真开心，不想结束呢",
      "你的性格真好，很容易相处",
      "感觉我们很有共同语言",
      "能不能多聊聊你的兴趣爱好？",
      "我也想更了解你一些",
      "今天聊得很愉快",
      "你对我印象怎么样？",
      "我想我们可以做很好的朋友",
      "你的眼神里有光",
      "和你聊天很放松",
      "希望我们能一直这样聊下去",
      "你是个很特别的人",
      "谢谢你陪我聊天",
      "今天真的很快乐",
      "希望明天还能见到你",
      "晚安，做个好梦",
      "明天见吧",
      "期待我们的下次见面",
      "你是我见过最有趣的人",
      "每次和你聊天都很放松",
      "你的笑容真好看",
      "想一直和你在一起",
      "你让我感到很安心",
      "我们很合拍呢",
      "好像认识很久了",
      "这种感觉真好",
      "不想和你分开",
      "你对我来说很重要",
      "想保护你一辈子",
      "愿意给我一个机会吗？",
      "我喜欢你，做我女朋友吧",
    ];

    const existingPhone = '13819038169';
    const testCode = '123456';
    const socketUrl = 'http://localhost:3000';

    interface GameStateSnapshot {
      round: number;
      timestamp: string;
      userMessage: string;
      aiResponse: string;
      haoGanDu: any;
      challengeInfo: any;
      gameEnded: boolean;
      endReason: string | null;
    }

    async function loginAndGetToken(): Promise<string> {
      const res = await fetch('http://localhost:5173/api/认证/登录', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shou_ji_hao: '13819038169', mi_ma: '123456', ip: '127.0.0.1' })
      });
      const loginResult = await res.json();
      
      if (!loginResult.cheng_gong) {
        throw new Error(`登录失败: ${loginResult.ti_shi}`);
      }
      return loginResult.shu_ju.令牌;
    }

    async function startChallenge(token: string): Promise<{ jiao_se_id: string }> {
      const res = await fetch('http://localhost:5173/api/挑战/开始', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ wan_jia_xing_bie: '男', dui_xiang_xing_bie: '女' })
      });
      const result = await res.json();
      
      if (!result.cheng_gong) {
        throw new Error(`开始挑战失败: ${result.ti_shi}`);
      }
      return { jiao_se_id: result.shu_ju?.角色ID || result.shu_ju?.id };
    }

    async function getHaoGanDu(token: string, jiao_se_id: string) {
      const res = await fetch(`http://localhost:5173/api/好感度/${jiao_se_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      
      if (result.cheng_gong) return result.shu_ju;
      return null;
    }

    async function getChallengeInfo(token: string) {
      const res = await fetch('http://localhost:5173/api/挑战/我的概况', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      
      if (result.cheng_gong) return result.shu_ju.gai_kuang; // 返回概况数组
      return null;
    }

    async function sendChatMessage(socket: any, jiao_se_id: string, content: string): Promise<void> {
      return new Promise((resolve) => {
        socket.emit('发送消息', { 角色ID: jiao_se_id, 内容: content }, (response: any) => {
          resolve();
        });
      });
    }

    async function waitForAIResponse(socket: any, timeout: number = 30000): Promise<string> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('等待AI回复超时'));
        }, timeout);
        
        socket.once('角色回复', (data: any) => {
          clearTimeout(timer);
          if (data.消息列表 && data.消息列表.length > 0) {
            resolve(data.消息列表[0].内容 || '');
          } else {
            resolve('');
          }
        });
      });
    }

    async function main() {
      console.log('=== 真实通关测试开始 ===');
      
      const snapshots: any[] = [];
      let round = 0;
      let gameEnded = false;
      let endReason: string | null = null;
      let yong_hu_id: string;
      let jiao_se_id: string;
      let token: string;
      let socket: any = null;

      // 1. 登录获取 token
      console.log('步骤 1: 登录');
      token = await loginAndGetToken();
      console.log('登录成功');

      // 获取用户ID (从登录返回)
      const loginResult = await (await fetch('http://localhost:5173/api/认证/登录', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shou_ji_hao: '13819038169', mi_ma: '123456', ip: '127.0.0.1' })
      })).json();
      
      const yong_hu_id = loginResult.shu_ju.用户.id;
      console.log('用户ID:', yong_hu_id);

      // 2. 开始挑战
      console.log('步骤 2: 开始挑战');
      const challengeResult = await startChallenge(token);
      const jiao_se_id = challengeResult.jiao_se_id;
      console.log('挑战角色ID:', jiao_se_id);

      // 3. 建立 socket 连接
      console.log('步骤 3: 建立 Socket 连接');
      const { io } = await import('socket.io-client');
      const socket = io('http://localhost:3000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', (err: Error) => reject(err));
        setTimeout(() => reject(new Error('Socket连接超时')), 10000);
      });
      console.log('Socket 已连接');

      // 加入聊天房间
      socket.emit('加入聊天', jiao_se_id);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 监听游戏结束事件
      let gameEnded = false;
      let endReason: string | null = null;
      socket.on('游戏事件', (data: any) => {
        console.log('收到游戏事件:', data);
        gameEnded = true;
        endReason = data.lei_xing || data.jie_guo_lei_xing || '未知';
      });

      const snapshots: any[] = [];

      // 初始快照
      const initialHaoGanDu = await getHaoGanDu(token, jiao_se_id);
      const initialChallengeAll = await getChallengeInfo(token);
      // 找到对应组别的挑战信息 (nan_nv)
      const initialChallenge = initialChallengeAll?.find((c: any) => c.zu_bie === 'nan_nv');
      
      const snapshots: any[] = [];
      snapshots.push({
        round: 0,
        timestamp: new Date().toISOString(),
        userMessage: '',
        aiResponse: '游戏开始',
        haoGanDu: initialHaoGanDu,
        challengeInfo: initialChallenge ? {
          ji_fen: initialChallenge.ji_fen || 0,
          sheng_chang: initialChallenge.sheng_chang || 0,
          fu_chang: initialChallenge.fu_chang || 0,
          lian_sheng: initialChallenge.lian_sheng || 0,
          duan_wei: initialChallenge.duan_wei || '青铜'
        } : null,
        gameEnded: false,
        endReason: null
      });

      let round = 0;
      let gameEnded = false;
      let endReason: string | null = null;

      // 2. 进行 20-50 轮对话
      for (round = 1; round <= MAX_ROUNDS && !gameEnded; round++) {
        const userMessage = testMessages[round - 1] || `这是第 ${round} 条消息，继续聊天吧`;
        console.log(`\n=== 第 ${round} 轮 ===`);
        console.log('用户:', userMessage);

        // 记录发送前状态
        const beforeHaoGanDu = await getHaoGanDu(token, jiao_se_id);
        const beforeChallengeAll = await getChallengeInfo(token);
        const beforeChallenge = beforeChallengeAll?.find((c: any) => c.zu_bie === 'nan_nv');

        // 发送消息
        await sendChatMessage(socket, jiao_se_id, userMessage);
        
        // 等待 AI 回复
        let aiResponse = '';
        try {
          aiResponse = await waitForAIResponse(socket, 30000);
          console.log('AI:', aiResponse);
        } catch (e) {
          console.log('等待AI回复超时或错误:', e);
          aiResponse = '[AI无回复]';
        }

        // 等待好感度结算
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 记录回复后状态
        const afterHaoGanDu = await getHaoGanDu(token, jiao_se_id);
        const afterChallengeAll = await getChallengeInfo(token);
        const afterChallenge = afterChallengeAll?.find((c: any) => c.zu_bie === 'nan_nv');

        // 计算变化
        const haoGanDuChange = afterHaoGanDu && beforeHaoGanDu ? {
          xin_ren_du: afterHaoGanDu.xin_ren_du - beforeHaoGanDu.xin_ren_du,
          qin_mi_du: afterHaoGanDu.qin_mi_du - beforeHaoGanDu.qin_mi_du,
          qu_wei_du: afterHaoGanDu.qu_wei_du - beforeHaoGanDu.qu_wei_du,
          guan_huai_du: afterHaoGanDu.guan_huai_du - beforeHaoGanDu.guan_huai_du,
          zong_fen: afterHaoGanDu.zong_fen - beforeHaoGanDu.zong_fen,
        } : null;

        const challengeChange = afterChallenge && beforeChallenge ? {
          ji_fen: (afterChallenge.ji_fen || 0) - (beforeChallenge.ji_fen || 0),
          sheng_chang: (afterChallenge.sheng_chang || 0) - (beforeChallenge.sheng_chang || 0),
          fu_chang: (afterChallenge.fu_chang || 0) - (beforeChallenge.fu_chang || 0),
          lian_sheng: (afterChallenge.lian_sheng || 0) - (beforeChallenge.lian_sheng || 0),
        } : null;

        snapshots.push({
          round,
          timestamp: new Date().toISOString(),
          userMessage,
          aiResponse,
          haoGanDu: afterHaoGanDu,
          challengeInfo: afterChallenge ? {
            ji_fen: afterChallenge.ji_fen || 0,
            sheng_chang: afterChallenge.sheng_chang || 0,
            fu_chang: afterChallenge.fu_chang || 0,
            lian_sheng: afterChallenge.lian_sheng || 0,
            duan_wei: afterChallenge.duan_wei || '青铜'
          } : null,
          gameEnded,
          endReason
        });

        console.log(`第 ${round} 轮完成`);
        console.log('好感度变化:', haoGanDuChange);
        console.log('挑战信息变化:', challengeChange);

        // 检查游戏是否结束
        if (gameEnded) {
          console.log('游戏结束，原因:', endReason);
          break;
        }

        // 如果达到最小轮数且游戏未结束，继续
        if (round >= MIN_ROUNDS && gameEnded) break;
        
        // 轮次间隔
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 如果没自然结束，强制结束
      if (!gameEnded && round >= MAX_ROUNDS) {
        console.log('达到最大轮数，测试结束');
      }

      // 最终快照
      const finalHaoGanDu = await getHaoGanDu(token, jiao_se_id);
      const finalChallengeAll = await getChallengeInfo(token);
      const finalChallenge = finalChallengeAll?.find((c: any) => c.zu_bie === 'nan_nv');
      
      snapshots.push({
        round: round + 1,
        timestamp: new Date().toISOString(),
        userMessage: '',
        aiResponse: '测试结束',
        haoGanDu: finalHaoGanDu,
        challengeInfo: finalChallenge ? {
          ji_fen: finalChallenge.ji_fen || 0,
          sheng_chang: finalChallenge.sheng_chang || 0,
          fu_chang: finalChallenge.fu_chang || 0,
          lian_sheng: finalChallenge.lian_sheng || 0,
          duan_wei: finalChallenge.duan_wei || '青铜'
        } : null,
        gameEnded: true,
        endReason: endReason || '测试达到最大轮数结束'
      });

      // 保存快照到文件
      const fs = require('fs');
      const path = require('path');
      const outputDir = path.join(__dirname, '测试截图');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputFile = path.join(outputDir, `real-play-test-${Date.now()}.json`);
      fs.writeFileSync(outputFile, JSON.stringify({
        testInfo: {
          yong_hu_id,
          jiao_se_id,
          startTime: snapshots[0].timestamp,
          endTime: snapshots[snapshots.length - 1].timestamp,
          totalRounds: round,
          gameEnded,
          endReason,
          minRounds: MIN_ROUNDS,
          maxRounds: MAX_ROUNDS
        },
        snapshots
      }, null, 2);
      
      console.log('\n=== 测试完成 ===');
      console.log('总轮数:', round);
      console.log('游戏结束:', gameEnded);
      console.log('结束原因:', endReason);
      console.log('快照已保存至:', outputFile);

      // 输出关键统计
      const firstSnapshot = snapshots[0];
      const lastSnapshot = snapshots[snapshots.length - 2]; // 最后一个是结束标记
      
      if (lastSnapshot && firstSnapshot) {
        console.log('\n=== 总体变化 ===');
        if (firstSnapshot.haoGanDu && lastSnapshot.haoGanDu) {
          console.log('好感度总分:', firstSnapshot.haoGanDu.zong_fen, '->', lastSnapshot.haoGanDu.zong_fen, 
            '(变化:', lastSnapshot.haoGanDu.zong_fen - firstSnapshot.haoGanDu.zong_fen, ')');
          console.log('关系阶段:', firstSnapshot.haoGanDu.guan_xi_jie_duan, '->', lastSnapshot.haoGanDu.guan_xi_jie_duan);
        }
        if (firstSnapshot.challengeInfo && lastSnapshot.challengeInfo) {
          console.log('挑战积分:', firstSnapshot.challengeInfo.ji_fen, '->', lastSnapshot.challengeInfo.ji_fen,
            '(变化:', lastSnapshot.challengeInfo.ji_fen - firstSnapshot.challengeInfo.ji_fen, ')');
          console.log('段位:', firstSnapshot.challengeInfo.duan_wei, '->', lastSnapshot.challengeInfo.duan_wei);
          console.log('连胜:', firstSnapshot.challengeInfo.lian_sheng, '->', lastSnapshot.challengeInfo.lian_sheng);
        }
      }

      // 关闭 socket
      if (socket) {
        socket.disconnect();
      }

      console.log('\n=== 测试完成 ===');
    }

    main().catch(console.error);
  }

  main().catch(console.error);