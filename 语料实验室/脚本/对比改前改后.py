# -*- coding: utf-8 -*-
"""
第 3、4 步：受控对照。

⚠️ 受控的前提是**同一批人设**：两条臂读同一个 `人设快照.json`。
   只固定 Math.random 无效——shengChengJiaoSe 里有随机抽样，必须整个人设落盘快照。

⚠️ 量化指标只作**退化检测**，判据仍然是逐句读（行为基线.md）。
   这里把「同探针号的两臂输出」并排列出来，供人逐条判行为类别是否落在真人的集合里。
"""

import io
import json
import os
import re
import glob
import statistics as st

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JI_LU = os.path.join(BASE, '实测记录')
WEN_HAO = re.compile(r'[？?]')


def du(HouZhui):
    """
    ⚠️ 踩过的坑：`glob('*.jsonl')` 会把 `*_改后.jsonl` 也匹配进来，
       而两臂探针号相同 ⇒ 改后记录**覆盖**改前记录，两臂看起来逐字相同，
       差点被误判成「改动没生效」。改前臂必须**显式排除**改后文件。
    """
    chu = {}
    for f in sorted(glob.glob(os.path.join(JI_LU, '*.jsonl'))):
        ming = os.path.basename(f)
        if ming.startswith('_'):
            continue
        youHouZhui = ming.endswith(f'{HouZhui}.jsonl') if HouZhui else False
        # 改前臂：文件名不带任何已知后缀；改后臂：文件名必须带该后缀
        if HouZhui:
            if not youHouZhui:
                continue
        else:
            if ming.endswith('_改后.jsonl'):
                continue
        for l in io.open(f, encoding='utf-8'):
            l = l.strip()
            if not l:
                continue
            try:
                r = json.loads(l)
            except Exception:
                continue
            # 同一探针号若有多条（中断续跑会产生重复），取**最后一条**
            chu[r['探针号']] = r
    return chu


def main():
    qian = du('')
    hou = du('_改后')
    gong = sorted(set(qian) & set(hou))
    print(f'改前 {len(qian)} 条｜改后 {len(hou)} 条｜可对 {len(gong)} 条')

    def zhi(ji, chang):
        rs = [ji[k] for k in gong if not ji[k].get('报错') and ji[k].get('AI合并')]
        if not rs:
            return 0, 0.0, 0
        zi = st.median([len(r['AI合并']) for r in rs])
        tiao = st.median([len(r['AI输出']) for r in rs])
        wen = sum(1 for r in rs if WEN_HAO.search(r['AI合并'])) / len(rs)
        return zi, wen, tiao

    zq, wq, tq = zhi(qian, '改前')
    zh, wh, th = zhi(hou, '改后')
    zhen = [qian[k]['真人原文'] for k in gong]
    print(f"\n{'':<10}{'字数中位':>9}{'带问号':>9}{'条数中位':>9}")
    print(f"{'真人':<10}{st.median([len(x) for x in zhen]):>9}"
          f"{sum(1 for x in zhen if WEN_HAO.search(x))/len(zhen):>8.1%}{1:>9}")
    print(f"{'改前':<10}{zq:>9}{wq:>8.1%}{tq:>9}")
    print(f"{'改后':<10}{zh:>9}{wh:>8.1%}{th:>9}")

    print('\n逐条（判据：AI 是否落进 行为基线.md 里该场景的真人类别集合）：')
    for k in gong:
        a, b = qian[k], hou[k]
        print(f"\n[{k}] 真人类别={a.get('真人行为类别')}")
        print(f"  A  「{a['触发输入'][:46]}」")
        print(f"  真人「{a['真人原文'][:46]}」")
        print(f"  改前「{a.get('AI合并','')[:70]}」")
        print(f"  改后「{b.get('AI合并','')[:70]}」")


if __name__ == '__main__':
    main()
