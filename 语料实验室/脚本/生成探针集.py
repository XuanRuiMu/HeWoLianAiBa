# -*- coding: utf-8 -*-
"""
第 2 步用：生成探针集。

⚠️ 抽样必须**双层约束**（跨会话 + 跨来源），否则行为分布会被单一说话人/单一来源带偏。
   - 单会话 ≤2 条（交接文档硬约束）
   - 按来源配额（主口径微信私聊优先）

候选挑选偏好：真人回复长度落在该场景中位数附近（避免挑到异常长/短的怪样本），
且优先微信私聊形态。最终由人逐条审定行为类别后落盘。
"""

import io
import json
import os
import statistics as st
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEI = 8
DAN_HUI_HUA_SHANG_XIAN = 2
PEI_E = [
    ('微信私聊-林桐宇', 0.40), ('微信私聊-叁北', 0.20), ('豆瓣-多轮', 0.15),
    ('LCCC-微博', 0.15), ('PersonalDialog', 0.10),
]


def 源内跨会话轮取(ds, shu):
    tong = defaultdict(list)
    for d in ds:
        tong[d['会话号']].append(d)
    yong = defaultdict(int)
    xuan = []
    i = 0
    huiHua = sorted(tong.keys())
    while len(xuan) < shu:
        jin = False
        for h in huiHua:
            if len(xuan) >= shu:
                break
            if yong[h] >= DAN_HUI_HUA_SHANG_XIAN or i >= len(tong[h]):
                continue
            xuan.append(tong[h][i]); yong[h] += 1; jin = True
        if not jin:
            break
        i += 1
    return xuan


dui = [json.loads(l) for l in io.open(os.path.join(BASE, '语料矩阵', '全部对.jsonl'), encoding='utf-8')]
fen = defaultdict(list)
for d in dui:
    fen[d['场景']].append(d)

# 场景条件：让这条语料「最有可能发生在本项目」的人设/阶段/情境
CHANG_JING_TIAO_JIAN = {
    '寒暄报备': ('ISFJ', 'nv', 'shuXi', 350, '晚上，随手聊'),
    '日常分享': ('ESFP', 'nv', 'pengYou', 450, '下午，随手聊'),
    '应声接话': ('ISTP', 'nan', 'shuXi', 350, '晚上，随手聊'),
    '玩笑互怼': ('ENTP', 'nan', 'haoYou', 550, '晚上，随手聊'),
    '情绪倾诉': ('INFJ', 'nv', 'haoYou', 550, '深夜，随手聊'),
    '求助提问': ('ENFP', 'nv', 'pengYou', 450, '下午，随手聊'),
    '观点讨论': ('INTJ', 'nan', 'pengYou', 450, '晚上，随手聊'),
    '事务对接': ('ESTJ', 'nan', 'shuXi', 350, '工作日下午'),
    '邀约聚会': ('ESFP', 'nv', 'aiMei', 650, '周五傍晚'),
    '叮嘱关心': ('ISFJ', 'nv', 'haoYou', 550, '晚上，随手聊'),
    '情感暧昧': ('ENFP', 'nv', 'aiMei', 650, '晚上，随手聊'),
    '被问自己': ('INFP', 'nv', 'pengYou', 450, '下午，随手聊'),
    '吃瓜分享': ('ESTP', 'nan', 'pengYou', 450, '晚上，随手聊'),
    '成果分享': ('ESFJ', 'nv', 'pengYou', 450, '下午，随手聊'),
}

tiaoJian = {}
houXuan = {}
for 场景 in sorted(fen):
    ds = fen[场景]
    zhong = st.median([len(d['真人原文']) for d in ds])
    anYuan = defaultdict(list)
    for d in ds:
        anYuan[d['来源']].append(d)
    na = defaultdict(int)
    for 来, zhan in PEI_E:
        na[来] = min(int(MEI * zhan), len(anYuan.get(来, [])))
    cha = MEI - sum(na.values())
    if cha > 0:
        for 来, _ in PEI_E:
            if cha <= 0:
                break
            bu = min(cha, len(anYuan.get(来, [])) - na[来])
            na[来] += bu; cha -= bu
    xuan = []
    for 来, shu in na.items():
        if shu > 0:
            chi = 源内跨会话轮取(anYuan[来], shu)
            # 长度接近该场景中位数的优先（避免怪样本）
            chi.sort(key=lambda d: abs(len(d['真人原文']) - zhong))
            xuan.extend(chi[:shu])
    houXuan[场景] = xuan
    mbti, xb, jd, zf, cj = CHANG_JING_TIAO_JIAN[场景]
    tiaoJian[场景] = {'mbti': mbti, 'xingBie': xb, 'jieDuan': jd, 'zongFen': zf, 'changJing': cj}

    print(f'\n########## {场景}（中位 {zhong} 字｜人设 {mbti}/{xb} 阶段 {jd}）##########')
    for n, d in enumerate(xuan, 1):
        print(f'{场景}-{n:02d}')
        for q in d['前文'][-2:]:
            print(f'    前文 {q}')
        print(f'  A「{d["触发输入"]}」')
        print(f'  真人→「{d["真人原文"]}」〔{d["来源"]}〕')

json.dump(tiaoJian, io.open(os.path.join(BASE, '语料矩阵', '场景条件.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
json.dump({k: [{'触发输入': d['触发输入'], '真人原文': d['真人原文'], '前文': d['前文'],
                '来源': d['来源'], '会话号': d['会话号']} for d in v] for k, v in houXuan.items()},
          io.open(os.path.join(BASE, '语料矩阵', '探针候选.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('\n已写入 语料矩阵/场景条件.json 与 探针候选.json')
