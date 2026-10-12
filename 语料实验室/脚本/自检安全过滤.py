# -*- coding: utf-8 -*-
"""
安全过滤自检。

⚠️ 第一版的教训：自检脚本自己抄了一份词表，与正式过滤共享同一个漏洞
   （漏 `jj`）⇒ 矩阵里躺着「砸过后小jj正好可以变成大jj」，自检却报「残留 0」。
   **守卫与被测共用一份漏网实现，等于没有守卫。**

所以本自检做三件事：
  1. 判据自测：喂几条**已知违规**样例，确认词表抓得住（防止词表沉默失效）；
  2. 正式路径自测：确认 `构建语料矩阵.是垃圾文本` 真的调的是 `安全词表`，
     不是另一份内联实现（用「往词表里塞一个哨兵词」的方式验证，不是靠肉眼）；
  3. 矩阵扫描：用 `安全词表` 重扫落盘结果，报告残留。
"""

import io
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import 安全词表  # noqa: E402
import 构建语料矩阵 as JZ  # noqa: E402

# 1) 判据自测：这些必须被判违规
YANG_LI = [
    ('色情-自慰', '小学四年级的女生可以自慰吗'),
    ('色情-jj（第一版漏网的那个）', '砸过后小jj正好可以变成大jj'),
    ('色情-摸胸', '我现在还不会最多摸摸胸擦'),
    ('色情-胸围', '这个解读应该问百度你就直接理解为b杯就好了'),
    ('广告-群号', '公关交流豆瓣pr群5群号121434788'),
    ('广告-选购', '天然水晶手链url物美价廉欢迎选购'),
]
# 这些必须**不**被判违规（防过度过滤）
YIN_XING = [
    ('正常-牛逼', 'wokkkkk牛逼我也想来'),
    ('正常-吃饭', '我今天想去吃内蒙羊杂面 了。'),
    ('正常-作息', '我最近在实习呜呜呜忙'),
    ('正常-问路', '菜菜这个在哪个位置啊'),
]

print('== 1. 判据自测（已知违规必须命中）==')
si = 0
for ming, wen in YANG_LI:
    if not 安全词表.是违规(wen):
        si += 1
        print(f'  ✗ {ming}：「{wen}」没被拦住')
    else:
        print(f'  ✓ {ming} → {安全词表.命中项(wen)}')

print('\n== 2. 误伤自测（正常表达必须放行）==')
for ming, wen in YIN_XING:
    if 安全词表.是违规(wen):
        si += 1
        print(f'  ✗ {ming}：「{wen}」被误伤 → {安全词表.命中项(wen)}')
    else:
        print(f'  ✓ {ming} 放行')

print('\n== 3. 正式路径是否真的用了安全词表==')
# ⚠️ 第一版哨兵做法是「往正则 pattern 字符串尾部拼一个词」，但词表改成 f-string 拼接后
#    pattern 结尾不再是 `)`，拼接静默失效 ⇒ 哨兵永远命中不了，报假警。
#   改用**身份判断**：正式路径里那个函数对象必须就是 `安全词表.是违规` 本身。
tong_yi = (getattr(JZ, '是违规', None) is 安全词表.是违规)
mo_kuai = getattr(getattr(JZ, '是违规', None), '__module__', None)
if tong_yi and mo_kuai == '安全词表':
    print(f'  ✓ 正式路径的 是违规 就是 安全词表.是违规（__module__={mo_kuai}）')
else:
    si += 1
    print(f'  ✗ 正式路径用的是另一份实现（is同一={tong_yi}, __module__={mo_kuai}）⇒ 守卫形同虚设')

print('\n== 4. 矩阵扫描（残留检查）==')
f = os.path.join(BASE, '语料矩阵', '全部对.jsonl')
if not os.path.exists(f):
    print('  ⚠️ 矩阵不存在，跳过')
else:
    dui = [json.loads(l) for l in io.open(f, encoding='utf-8')]
    can = []
    for d in dui:
        for chang in ('触发输入', '真人原文'):
            for ci in 安全词表.命中词(d[chang]):
                can.append((ci, d['场景'], d[chang][:50]))
        for q in d.get('前文', []):
            for ci in 安全词表.命中词(q):
                can.append((ci, d['场景'], q[:50]))
    print(f'  扫描 {len(dui)} 条，残留 {len(can)} 处')
    # 按命中词聚合，一眼看出是**真报**还是**误报**（误报会集中在某个词上）
    ju = {}
    for ci, chang, wen in can:
        ju.setdefault(ci, []).append((chang, wen))
    for ci in sorted(ju, key=lambda k: -len(ju[k])):
        print(f'    [{len(ju[ci])}×] {ci}  例：{ju[ci][0][1]}')
    if can:
        si += 1

print(f'\n自检结论：{"有 " + str(si) + " 项未通过" if si else "全部通过"}')
sys.exit(1 if si else 0)
