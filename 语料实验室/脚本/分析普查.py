# -*- coding: utf-8 -*-
"""
第 3 步：病灶分层分析。

⚠️ 本脚本只做**候选标记**，不做结论。判据是逐句读（行为基线.md），
   脚本的价值是把「该读哪些条」挑出来，并给出可复核的量化旁证（只作退化检测，不作优化目标）。

标记的可疑病灶（对应 行为基线.md 第四节的反模式）：
  连环追问 / 长篇安慰 / 三段式 / 复述对方 / 编造信息 / 每轮推进 / 自我播报
外加形态指标：条数、字数、问号、句号、与真人行为类别的落差。
"""

import io
import json
import os
import re
import glob
import statistics as st
from collections import defaultdict, Counter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JI_LU = os.path.join(BASE, '实测记录')

WEN_HAO = re.compile(r'[？?]')


def 判嫌疑(zhenRenLei, aiHeBing, chuFa):
    """返回可疑病灶标签列表。宁可多标，由人复核。"""
    biao = []
    tiao = aiHeBing.split(' / ') if aiHeBing else []
    if sum(1 for t in tiao if WEN_HAO.search(t)) >= 1 and zhenRenLei != '追问一句':
        biao.append('追问')
    if sum(1 for t in tiao if WEN_HAO.search(t)) >= 2:
        biao.append('连环追问')
    if len(aiHeBing) >= 40 and zhenRenLei in ('短反应', '极短共情', '收住'):
        biao.append('长度失衡')
    if len(tiao) >= 2 and zhenRenLei in ('短反应', '极短共情', '收住', '给具体信息', '答自己'):
        biao.append('条数偏多')
    if re.search(r'(心疼|抱抱|辛苦了|别太累|会好起来的|要不要我|我陪你|加油哦|注意身体)', aiHeBing):
        biao.append('长篇安慰')
    if re.search(r'(听起来|感觉你|是不是因为|我能理解|我懂你)', aiHeBing):
        biao.append('复述对方')
    if len(tiao) >= 3:
        biao.append('三段式嫌疑')
    return biao


def main():
    jiLu = []
    for f in sorted(glob.glob(os.path.join(JI_LU, '*.jsonl'))):
        for l in io.open(f, encoding='utf-8'):
            l = l.strip()
            if not l:
                continue
            try:
                jiLu.append(json.loads(l))
            except Exception:
                continue
    if not jiLu:
        print('没有实测记录')
        return
    youXiao = [r for r in jiLu if not r.get('报错') and r.get('AI合并')]
    kong = [r for r in jiLu if r.get('报错')]
    print(f'总记录 {len(jiLu)}｜有效 {len(youXiao)}｜报错/空 {len(kong)}')
    if kong:
        print('  报错分布:', dict(Counter(r.get('报错') for r in kong)))

    # 行为类别一致性（真人类别 vs AI 是否需要人工判定，这里只给形态旁证）
    ziShu = [len(r['AI合并']) for r in youXiao]
    tiaoShu = [len(r['AI输出']) for r in youXiao]
    wenHao = sum(1 for r in youXiao if WEN_HAO.search(r['AI合并']))
    zhenRenZi = [len(r['真人原文']) for r in youXiao]
    zhenRenWen = sum(1 for r in youXiao if WEN_HAO.search(r['真人原文']))

    print(f'\n形态（只作退化检测，不作优化目标）：')
    print(f'  字数  AI 中位 {st.median(ziShu)} / 均 {st.mean(ziShu):.1f}   ｜真人 中位 {st.median(zhenRenZi)} / 均 {st.mean(zhenRenZi):.1f}')
    print(f'  条数  AI 中位 {st.median(tiaoShu)} / 均 {st.mean(tiaoShu):.1f}   ｜真人 中位 {st.median([1]*len(youXiao))}（语料为逐句对照）')
    print(f'  带问号 AI {wenHao}/{len(youXiao)} = {wenHao/len(youXiao):.1%}   ｜真人 {zhenRenWen}/{len(youXiao)} = {zhenRenWen/len(youXiao):.1%}')

    # 逐场景
    print('\n按场景：')
    anChang = defaultdict(list)
    for r in youXiao:
        anChang[r['场景']].append(r)
    for c in sorted(anChang):
        rs = anChang[c]
        w = sum(1 for r in rs if WEN_HAO.search(r['AI合并']))
        zw = sum(1 for r in rs if WEN_HAO.search(r['真人原文']))
        print(f'  {c:<8} n={len(rs):>2}  AI带问号 {w}/{len(rs)}  真人带问号 {zw}/{len(rs)}   '
              f'AI字数中位 {st.median([len(r["AI合并"]) for r in rs]):>3}  真人 {st.median([len(r["真人原文"]) for r in rs]):>3}')

    # 可疑病灶
    print('\n可疑病灶逐条（需人工复核，判据是行为基线.md）：')
    zong = Counter()
    for r in youXiao:
        biao = 判嫌疑(r.get('真人行为类别'), r['AI合并'], r.get('触发输入'))
        if not biao:
            continue
        for b in biao:
            zong[b] += 1
        print(f"  [{r['探针号']}] 真人类别={r.get('真人行为类别')}  嫌疑={','.join(biao)}")
        print(f"     A「{r['触发输入'][:44]}」")
        print(f"     真人「{r['真人原文'][:44]}」")
        print(f"     AI 「{r['AI合并'][:70]}」")
    print('\n病灶计数:', dict(zong.most_common()))


if __name__ == '__main__':
    main()
