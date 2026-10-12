# -*- coding: utf-8 -*-
"""
第 1 步用：按场景跨会话抽样，dump 出来给人逐句读、归纳「行为类别」。

⚠️ 跨会话是硬约束（交接文档）：每场景取样必须轮取、单会话 ≤2 条。
   第一版「每场景取前 20 条」实测全部来自同 1 个会话，真人行为分布被单个
   说话人带偏，报告数字全部作废重算。
"""
import io
import json
import os
import sys
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEI_CHANG_JING = int(sys.argv[2]) if len(sys.argv) > 2 else 18
DAN_HUI_HUA_SHANG_XIAN = 2

changJing = sys.argv[1].split(',') if len(sys.argv) > 1 and sys.argv[1] != 'all' else None

dui = [json.loads(l) for l in io.open(os.path.join(BASE, '语料矩阵', '全部对.jsonl'), encoding='utf-8')]
fen = defaultdict(list)
for d in dui:
    fen[d['场景']].append(d)

# ⚠️ 分层配额：主口径 = 微信真实私聊（最接近本项目形态）。
#   只做「跨会话」不做「跨来源」会被单一来源带偏——实测第一版 16 条全是 LCCC，
#   与交接文档警告的会话选择偏差是同一类错误，只是维度换成了来源。
PEI_E = [
    ('微信私聊-林桐宇', 0.40),
    ('微信私聊-叁北', 0.20),
    ('豆瓣-多轮', 0.15),
    ('LCCC-微博', 0.15),
    ('PersonalDialog', 0.10),
]


def 源内跨会话轮取(ds, shuLiang):
    """在一个来源的候选里跨会话轮取，单会话 ≤ DAN_HUI_HUA_SHANG_XIAN。"""
    tong = defaultdict(list)
    for d in ds:
        tong[d['会话号']].append(d)
    yong = defaultdict(int)
    xuan = []
    huiHua = sorted(tong.keys())
    i = 0
    while len(xuan) < shuLiang:
        jinZhan = False
        for h in huiHua:
            if len(xuan) >= shuLiang:
                break
            if yong[h] >= DAN_HUI_HUA_SHANG_XIAN or i >= len(tong[h]):
                continue
            xuan.append(tong[h][i])
            yong[h] += 1
            jinZhan = True
        if not jinZhan:
            break
        i += 1
    return xuan


for 场景 in sorted(fen):
    if changJing and 场景 not in changJing:
        continue
    ds = fen[场景]
    # 1) 按来源配额分配
    anYuan = defaultdict(list)
    for d in ds:
        anYuan[d['来源']].append(d)
    muBiao = min(MEI_CHANG_JING, len(ds))
    na = defaultdict(int)
    for 来源, zhanBi in PEI_E:
        na[来源] = min(int(muBiao * zhanBi), len(anYuan.get(来源, [])))
    cha = muBiao - sum(na.values())
    if cha > 0:  # 不足的由还有余量的源按配额顺序补
        for 来源, _ in PEI_E:
            if cha <= 0:
                break
            bu = min(cha, len(anYuan.get(来源, [])) - na[来源])
            na[来源] += bu
            cha -= bu
    # 2) 各来源内跨会话轮取
    xuan = []
    for 来源, shu in na.items():
        if shu > 0:
            xuan.extend(源内跨会话轮取(anYuan[来源], shu))
    hui = len({x['会话号'] for x in xuan})
    yuan = len({x['来源'] for x in xuan})
    print(f'\n########## {场景}（{len(ds)} 条池，取 {len(xuan)} 条，跨 {hui} 会话 / {yuan} 来源）##########')
    for n, x in enumerate(xuan, 1):
        qian = ' ⏎ '.join(x['前文'][-2:]) if x['前文'] else ''
        print(f'{n:>2}. A「{x["触发输入"]}」')
        if qian:
            print(f'     前文: {qian}')
        print(f'     真人→「{x["真人原文"]}」  〔{x["来源"]}〕')
