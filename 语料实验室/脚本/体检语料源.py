# -*- coding: utf-8 -*-
"""
源级形态体检 —— 第 0 步的**准入判据**。

背景（上一版矩阵的 P0 缺陷）：把 5 个源混进一个池子后，NaturalConv 占了 72%。
但它是**众包写手按话题提示写出来的**，B 侧句句完整、句句带句号、句句附和——
那恰恰就是 AI 味本身。拿它建「真人基线」等于把 AI 推向 AI 味。
所以源不能一视同仁地进池子，必须先体检、再定准入。

做法：以**微信真实私聊**为锚（本项目目标形态），量化每个源的 B 侧语域指标。
判据不拍脑袋：先看全部分布，再用「与锚的偏离倍数」定阈值。

指标（全部算在 B 侧真人回复上）：
  字数中位 / 带句号比例 / 起手附和比例 / 带问号比例 / 平均字数
"""

import io
import json
import os
import re
import gzip
import statistics as st
from collections import Counter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YUAN = os.path.join(BASE, '原始语料')
XIN = os.path.join(YUAN, '新增')

# 众包"捧哏"起手式
FU_HE = re.compile(r'^(是啊|对啊|是的|嗯|确实|哈哈|好的|没错|当然|哦|真的|就是|行吧|可以|明白)')
# 句号：书面完整句的标志
JU_HAO = re.compile(r'[。．]')


def 去空格(s):
    return re.sub(r'\s+', '', s).strip()


def 源_微信林桐宇():
    B = []
    for f in (os.path.join(YUAN, '微信真实私聊语料_1763条.jsonl'),
              os.path.join(XIN, 'Personal_Wechat_Msg_clean.jsonl')):
        if not os.path.exists(f):
            continue
        for line in io.open(f, encoding='utf-8'):
            line = line.strip()
            if not line:
                continue
            for m in json.loads(line).get('messages', []):
                if m.get('role') == 'assistant':
                    B.append((m.get('content') or '').strip())
    return B


def 源_微信叁北():
    B = []
    for f in (os.path.join(XIN, 'wechat-zl_dev.json'), os.path.join(XIN, 'wechat-zl_train.json')):
        if not os.path.exists(f):
            continue
        for d in json.load(io.open(f, encoding='utf-8')):
            for m in d.get('conversations', []):
                if m.get('role') == 'assistant':
                    B.append((m.get('content') or '').strip())
    return B


def 源_naturalconv():
    B = []
    f = os.path.join(YUAN, 'NaturalConv_dialog_release.json')
    if os.path.exists(f):
        for d in json.load(io.open(f, encoding='utf-8')):
            c = d.get('content') or []
            for i, t in enumerate(c):
                if i % 2 == 1:
                    B.append(str(t).strip())
    return B


def 源_personaldialog():
    B = []
    for f in (os.path.join(YUAN, 'PersonalDialog_dev_random.jsonl.gz'),
              os.path.join(YUAN, 'PersonalDialog_test_random.jsonl.gz')):
        if not os.path.exists(f):
            continue
        for line in gzip.open(f, 'rt', encoding='utf-8'):
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            dialog = d.get('dialog') or []
            uid = d.get('uid') or []
            if len(dialog) < 2 or len(uid) < len(dialog):
                continue
            zuiHou = uid[len(dialog) - 1]
            for i, u in enumerate(dialog):
                if uid[i] == zuiHou:
                    B.append(去空格(' '.join(u) if isinstance(u, list) else str(u)))
    return B


def 源_lccc():
    B = []
    f = os.path.join(XIN, 'LCCC_base_valid.jsonl.gz')
    if os.path.exists(f):
        for line in gzip.open(f, 'rt', encoding='utf-8'):
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            if isinstance(d, list):
                for i, t in enumerate(d):
                    if i % 2 == 1:
                        B.append(去空格(str(t)))
    return B


def 源_豆瓣():
    """豆瓣多轮：`label \\t 句1 \\t ... \\t 句N`，只取 label=1 的正样本，末句=真人回复。"""
    B = []
    f = os.path.join(XIN, '豆瓣_test.txt')
    if os.path.exists(f):
        for line in io.open(f, encoding='utf-8', errors='replace'):
            line = line.rstrip('\n')
            if not line.strip():
                continue
            p = line.split('\t')
            if len(p) < 3 or p[0] != '1':
                continue
            B.append(去空格(p[-1]))
    return B


def 源_kdconv():
    B = []
    f = os.path.join(XIN, 'KdConv_film_train.json')
    if os.path.exists(f):
        for d in json.load(io.open(f, encoding='utf-8')):
            msgs = d.get('messages') or []
            for i, m in enumerate(msgs):
                if i % 2 == 1:
                    B.append(str(m.get('message') or '').strip())
    return B


def 指标(B):
    if not B:
        return None
    n = len(B)
    chang = [len(x) for x in B]
    return {
        'n': n,
        '字数中位': st.median(chang),
        '字数均值': round(st.mean(chang), 1),
        '带句号': round(sum(1 for x in B if JU_HAO.search(x)) / n, 4),
        '起手附和': round(sum(1 for x in B if FU_HE.match(x)) / n, 4),
        '带问号': round(sum(1 for x in B if '？' in x or '?' in x) / n, 4),
    }


YUAN_BIAO = [
    ('微信私聊-林桐宇', 源_微信林桐宇, '锚：真实微信私聊，本项目目标形态'),
    ('微信私聊-叁北', 源_微信叁北, '真实微信私聊（第二个人）'),
    ('豆瓣-多轮', 源_豆瓣, '真实豆瓣情感/生活论坛爬取（多人讨论，形态近似连续互聊）'),
    ('LCCC-微博', 源_lccc, '真实微博留言互动，清洗严格'),
    ('PersonalDialog', 源_personaldialog, '真实微博私聊/评论'),
    ('NaturalConv', 源_naturalconv, '众包：按话题提示写出来的对话'),
    ('KdConv', 源_kdconv, '众包：知识驱动，B 侧在念百科'),
]

if __name__ == '__main__':
    jieGuo = []
    print(f'{"源":<18}{"n":>8}{"字数中位":>8}{"字数均值":>9}{"带句号":>8}{"起手附和":>9}{"带问号":>8}')
    print('-' * 70)
    for ming, fn, _ in YUAN_BIAO:
        m = 指标(fn())
        if not m:
            continue
        jieGuo.append((ming, m))
        print(f'{ming:<18}{m["n"]:>8}{m["字数中位"]:>8}{m["字数均值"]:>9}'
              f'{m["带句号"]*100:>7.1f}%{m["起手附和"]*100:>8.1f}%{m["带问号"]*100:>7.1f}%')

    json.dump({k: v for k, v in jieGuo},
              io.open(os.path.join(BASE, '语料矩阵', '源体检.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print('\n已写入 语料矩阵/源体检.json')
