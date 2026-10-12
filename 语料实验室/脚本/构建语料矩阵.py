# -*- coding: utf-8 -*-
"""
第 0 步：语料矩阵（不是单个语料）—— v2

⚠️ v1 的 P0 缺陷（本版修复）：
  把源一视同仁地混进一个池子 ⇒ NaturalConv（众包书面体）占了 72%，
  而它句句完整、句句带句号、句句附和，恰恰就是 AI 味本身。
  拿它建「真人基线」等于把 AI 推向 AI 味。

v2 的做法：**先体检、再准入**（见 体检语料源.py），并以最接近本项目形态的
微信私聊为主口径做**分层配额**，不让微博系淹没私聊形态。

准入判据（阈值来自实测分布里的巨大空档，不是拍脑袋）：
  带句号率 > 30%      → 书面众包体，剔除（真实源最高 10.1%，众包最低 59.9%）
  起手附和率 > 20%    → 捧哏体，剔除（真实源最高 12.2%，众包最低 22.4%）

纳入：一对一、连续互聊（允许你两句我三句）、相邻轮相关。
排除：话题跳跃+长间隔、单向讲述、心理学标签集、模型生成数据。

产出（语料矩阵/）：
  全部对.jsonl      每条一个「真人 B 侧应答对」
  分场景/<场景>.jsonl
  统计.md
"""

import io
import json
import os
import re
import gzip
from collections import defaultdict, Counter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YUAN = os.path.join(BASE, '原始语料')
XIN = os.path.join(YUAN, '新增')
OUT = os.path.join(BASE, '语料矩阵')
os.makedirs(os.path.join(OUT, '分场景'), exist_ok=True)

# ---- 准入判据阈值（来自 体检语料源.py 的实测分布空档）----
YU_ZHI_JU_HAO = 0.30
YU_ZHI_FU_HE = 0.20
# 众包/知识播报源：直接剔除并留据
TI_CHU_YUAN = {'NaturalConv', 'KdConv'}

# ---- 分层配额：主口径 = 最接近本项目形态的源 ----
PEI_E = [
    ('微信私聊-林桐宇', 0.40),
    ('微信私聊-叁北', 0.20),
    ('豆瓣-多轮', 0.15),
    ('LCCC-微博', 0.15),
    ('PersonalDialog', 0.10),
]


def 去空格(s: str) -> str:
    return re.sub(r'\s+', '', s).strip()


# ⚠️ 内容安全过滤走 `安全词表.py` 这个**单一真源**，不准在这里抄第二份。
#   第一版就是把词表内联在过滤里、自检又抄一份，结果两边一起漏了 `jj`，
#   实测「砸过后小jj正好可以变成大jj」进了矩阵，自检还报「残留 0」。
try:
    from 安全词表 import 是违规
except ImportError:  # 允许直接双击运行
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from 安全词表 import 是违规


def 是垃圾文本(s: str) -> bool:
    if not s:
        return True
    t = s.strip()
    if t in ('None', 'null', 'NULL', 'nan', '无'):
        return True
    if 'http://' in t or 'https://' in t or 'url' in t.lower():
        return True
    if re.search(r'【[^】]{2,}】', t):
        return True
    if re.search(r'(应聘|招聘|投递|简历|内推|岗位)', t) and len(t) > 40:
        return True
    if 是违规(t):
        return True
    return False


# ---------------------------------------------------------------- 装载

def 装载_微信林桐宇():
    会话 = []
    见过 = set()
    for f in (os.path.join(YUAN, '微信真实私聊语料_1763条.jsonl'),
              os.path.join(XIN, 'Personal_Wechat_Msg_clean.jsonl')):
        if not os.path.exists(f):
            continue
        for line in io.open(f, encoding='utf-8'):
            line = line.strip()
            if not line:
                continue
            msgs = [m for m in json.loads(line).get('messages', [])
                    if m.get('role') in ('user', 'assistant')]
            if len(msgs) < 2:
                continue
            k = json.dumps(msgs, ensure_ascii=False)
            if k in 见过:
                continue
            见过.add(k)
            会话.append([('A' if m['role'] == 'user' else 'B', (m.get('content') or '').strip())
                         for m in msgs])
    return 会话


def 装载_微信叁北():
    会话 = []
    for f in (os.path.join(XIN, 'wechat-zl_dev.json'), os.path.join(XIN, 'wechat-zl_train.json')):
        if not os.path.exists(f):
            continue
        for d in json.load(io.open(f, encoding='utf-8')):
            msgs = [m for m in d.get('conversations', [])
                    if m.get('role') in ('user', 'assistant')]
            if len(msgs) < 2:
                continue
            会话.append([('A' if m['role'] == 'user' else 'B', (m.get('content') or '').strip())
                         for m in msgs])
    return 会话


def 装载_豆瓣():
    """`label \\t 句1 \\t ... \\t 句N`，只取 label=1 正样本；按 A/B 交替还原，末句=B。"""
    会话 = []
    f = os.path.join(XIN, '豆瓣_test.txt')
    if not os.path.exists(f):
        return 会话
    for line in io.open(f, encoding='utf-8', errors='replace'):
        line = line.rstrip('\n')
        if not line.strip():
            continue
        p = line.split('\t')
        if len(p) < 3 or p[0] != '1':
            continue
        ju = [去空格(x) for x in p[1:]]
        if len(ju) < 2:
            continue
        会话.append([('A' if i % 2 == 0 else 'B', t) for i, t in enumerate(ju)])
    return 会话


def 装载_lccc():
    会话 = []
    f = os.path.join(XIN, 'LCCC_base_valid.jsonl.gz')
    if not os.path.exists(f):
        return 会话
    for line in gzip.open(f, 'rt', encoding='utf-8'):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        if isinstance(d, list) and len(d) >= 2:
            会话.append([('A' if i % 2 == 0 else 'B', 去空格(str(t))) for i, t in enumerate(d)])
    return 会话


def 装载_personaldialog():
    会话 = []
    for f in (os.path.join(YUAN, 'PersonalDialog_dev_random.jsonl.gz'),
              os.path.join(YUAN, 'PersonalDialog_test_random.jsonl.gz')):
        if not os.path.exists(f):
            continue
        for line in gzip.open(f, 'rt', encoding='utf-8'):
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            dialog, uid = d.get('dialog') or [], d.get('uid') or []
            if len(dialog) < 2 or len(uid) < len(dialog):
                continue
            zuiHou = uid[len(dialog) - 1]
            A_uid = 1 - zuiHou if zuiHou in (0, 1) else 0
            会话.append([('A' if uid[i] == A_uid else 'B',
                          去空格(' '.join(u) if isinstance(u, list) else str(u)))
                         for i, u in enumerate(dialog)])
    return 会话


# ---------------------------------------------------------------- 抽对 + 过滤

CHANG_DU_SHANG_XIAN = 60
TING_YONG = set('的了是我你他她它在有和就不都也很要会这那个什么吗呢吧啊哈嗯哦呀啦嘛诶哇一二三不没好')


def 内容词(s):
    return set(ch for ch in s if ch not in TING_YONG and not ch.isspace() and not ch.isdigit())


def 抽对(会话列表, 来源, qiDian):
    for xi, lun in enumerate(会话列表):
        for i, (sp, wen) in enumerate(lun):
            if sp != 'B' or i == 0:
                continue
            j = i - 1
            while j >= 0 and lun[j][0] != 'A':
                j -= 1
            if j < 0:
                continue
            yield {
                '来源': 来源,
                '会话号': f'{来源}#{qiDian + xi}',
                '前文': [f'{s}: {t}' for s, t in lun[:j]],
                '触发输入': lun[j][1],
                '真人原文': wen,
            }


def 过滤(dui):
    a, b = dui['触发输入'].strip(), dui['真人原文'].strip()
    if 是垃圾文本(a) or 是垃圾文本(b):
        return False
    # ⚠️ 前文也必须查：第一版只查了 A/B 两侧，自检扫出 63 处残留全部来自前文
    #   （群公告推广、色情片段等都藏在上下文里）。前文脏 ⇒ 整条丢，不能只丢两侧。
    for q in dui['前文']:
        if 是违规(q.split(': ', 1)[-1]):
            return False
    if not (1 <= len(a) <= CHANG_DU_SHANG_XIAN):
        return False
    if not (1 <= len(b) <= CHANG_DU_SHANG_XIAN):
        return False
    # 单向讲述
    if b.count('。') >= 3 and len(b) >= 35:
        return False
    if a.count('。') >= 3 and len(a) >= 35:
        return False
    # 话题跳跃：两侧内容词各 ≥4 却零重叠
    ca, cb = 内容词(a), 内容词(b)
    if len(ca) >= 4 and len(cb) >= 4 and not (ca & cb):
        return False
    if dui['前文']:
        cz = 内容词(dui['前文'][-1].split(': ', 1)[-1])
        if len(cz) >= 4 and len(ca) >= 4 and not (cz & ca) and len(a) >= 8:
            return False
    return True


# ---------------------------------------------------------------- 场景分类
# 按 A 侧触发输入的言语行为分，与来源无关；自上而下首次命中、互斥。

GUAN_JIAN_ZI = [
    ('被问自己', [
        r'你在(干嘛|干吗|哪|哪儿|哪里|做什么|忙什么|干什么)',
        r'你(是|叫)什么', r'你(多大了|多大|几岁|多少岁)', r'你(是|在)哪(个|里|儿)',
        r'你(做|干)什么(工作|的)', r'你(哪个|什么)学校', r'你(什么|哪个)专业',
        r'你(住|在)哪', r'你(有没有|有没)(男|女|对象)', r'你是谁', r'你多高',
        r'你(现在|平时)(都|在)?(干|做|忙)', r'你(老家|家)哪', r'你(在上学|上班|工作了)',
    ]),
    ('情感暧昧', [
        r'想你', r'喜欢你', r'我想你', r'在干嘛呢', r'陪我', r'抱抱', r'爱你',
        r'心动', r'在一起', r'做我(男|女)朋', r'晚安(呀|哦|啦|宝)', r'有点想',
        r'梦见你', r'想见你', r'好想', r'(喜欢|中意)我吗', r'我们(算|是)什么',
    ]),
    ('邀约聚会', [
        r'一起(去|吃|玩|看|打|喝|走|逛|学|做)', r'(去|来|吃|玩|看)吗[？?]?$',
        r'要不要(一起|去|来)', r'约(吗|不|个)', r'聚(一|个)?(下|会)',
        r'出来(玩|吃|坐坐|走走)', r'(明天|周末|晚上|下午|今晚).{0,4}(有空|一起|出来|去)',
        r'来我家', r'去你家', r'(有空|有时间)吗',
    ]),
    ('叮嘱关心', [
        r'(早点|记得|注意|小心|别太|多喝|少抽|少喝|按时|好好)',
        r'照顾好', r'加油', r'辛苦(了|啦)', r'身体(要|第一|还好)', r'别(熬|累|撑)',
        r'多(穿|休息|睡)', r'(吃|喝)了(没|吗)', r'睡了(没|吗)', r'别(忘|丢)',
        r'保重', r'慢慢来', r'别(着急|急)', r'怎么又', r'还不睡',
    ]),
    ('情绪倾诉', [
        r'(烦|烦死|好烦|崩溃|难受|难过|生气|委屈|哭|想哭|焦虑|压力大|压抑|绝望|emo|丧)',
        r'(累|累死|好累|太累了|不想动|没劲|没意思|摆烂|破防)',
        r'(倒霉|气死|无语|吐了|醉了|裂开|寄了|麻了|傻眼|绷不住)',
        r'不开心', r'心情不好', r'好丧', r'(又|被)(骂|说|坑|甩|鸽|拒)', r'不想活',
    ]),
    ('求助提问', [
        r'(怎么|如何|咋|怎样)(做|弄|办|搞|选|说|写|处理)', r'怎么办', r'帮我',
        r'(能|可以|能不能|可不可以)(帮|给|发|告诉|推荐)', r'有没有(什么)?(推荐|好)',
        r'哪里(有|能|买|可以)', r'求(推荐|助|帮忙)', r'问一下', r'请问',
        r'(教|告诉)我', r'啥(意思|情况)', r'(是不是|该不该|要不要)(我)?(去做|去)',
        # 实测漏网的求知型疑问（如「你知道这期录的什么时候播不」→ 真人「不知道」）
        r'你知道', r'是什么', r'(能不能|可不可以|行不行|可以吗)',
        r'(谁|哪个).{0,4}(知道|有)', r'求.{0,3}(推荐|助|资源|链接)',
    ]),
    ('玩笑互怼', [
        r'(哈哈|哈哈哈|233|笑死|笑不活|绝了|离谱|服了|牛啊)', r'(菜|笨|傻|蠢|憨|废物|垃圾|屑)',
        r'(滚|闭嘴|你行|你配|至于吗|就这|真的假的|你怕是|怕不是)', r'(毒|损|怼|嘲|阴阳)',
        r'(不是吧|不会吧|何至于|你在逗我|逗我玩|骗人|吹牛|吹吧)', r'(狗|猪|菜鸡|菜狗)',
        r'你(又|咋|怎么)又', r'(装|装什么|装啥)', r'(切|呵|嘁)',
    ]),
    ('事务对接', [
        r'(几点|什么时候|几号|周几|改天|明天|后天|下午|上午|晚上|中午).{0,6}(见|去|来|到|走|开|发|打|给|有空|方便)',
        r'(地址|位置|地点|门牌|楼|房间|哪栋|怎么走)', r'发(我|你|一下|个|到)', r'给(我|你)',
        r'(确认|安排|定了|改(一下|个|到)|取消|推迟|延期|挪)', r'(收到|好的收到|已收到)',
        r'(转|打)(钱|账|款)', r'在吗$', r'在不在$', r'(填|写|签|交|报)(个|一下|表|单)',
    ]),
    ('观点讨论', [
        r'(觉得|认为|感觉|以为)', r'其实', r'为什么(会|不|要|能)',
        r'(应该|不该|必须|要不要)(这样|这么|那么)', r'(道理|逻辑|本质上|客观|主观|立场|意义|价值|利弊|矛盾)',
        r'(我(不|倒)觉得|换个角度|反过来说|话说回来)', r'(你(说|觉得).{0,6}(对|不对|是|不是))',
        r'(不是.{0,4}吗|怎么能|哪有)',
    ]),
    ('寒暄报备', [
        r'^(早|早上好|早安|中午好|下午好|晚上好|晚安|嗨|哈喽|hello|hi|你好|在吗|在不在)[。！!~]?$',
        r'我(到|回|出|下|上)(了|家|门|班|课|车)', r'(睡了|起床|起了|醒来|刚醒|还没睡|熬夜)',
        r'(吃饭|吃了吗|吃过了|要吃|去吃|在吃|刚吃|吃完)', r'(上班|下班|上课|下课|放学|开会|加班)中?[。！!]?$',
        r'(回来|出去|到家|到了|走了|出发)', r'(在忙|忙着|有空|闲着|没事干)', r'我(先|要)睡',
    ]),
    # ⚠️ 抽查打回过一版：裸的「我哥/我朋友」会把「我哥已经无视你了」这类日常分享吸进来，
    #   必须要求**第三方事件语境**（听说/八卦/居然/最近）才算吃瓜。
    ('吃瓜分享', [
        r'(听说了?吗|你知道吗|你听说|刷到|看到.{0,4}(新闻|视频|帖子|热搜|微博))',
        r'(瓜|八卦|塌房|爆料|热搜|上热搜|出事|翻车|上新闻|被抓|被骂)',
        r'(网上|群里|群里有人|有人说|网友)说',
        r'我(朋友|同学|同事|室友|姐|哥|妈|爸|老师).{0,14}(说|又|居然|竟然|昨天|前天|最近|刚)',
        r'(他们|他|她)(俩|两个|之间)',
        r'(真的假的|不会吧|假的吧|离谱吧|这也行)',
    ]),
    # 同样打回过：裸的「满分/通过/完成」会把「啊是满分是1000分」吸进来，
    #   必须是**自己或对方达成了一件事**。
    ('成果分享', [
        r'(我|你).{0,8}(考上了|上岸了?|拿到了|拿下了|搞定了|通过了|过了|做完了|写完了|成功了|录取了|赢了|中了)',
        r'^(牛|厉害|强|太强|绝了|可以啊|猛)(啊|哦|呀|了|！|!)?[。]?$',
        r'(成绩|分数|绩点|offer|录取通知|第一名)(出来|出来啦|公布|下来了|到手)?',
    ]),
    # A 只回了个气声（「嗷嗷嗷」「对」「嗯呢」）—— 检验 AI 会不会硬凑的绝佳探针
    ('应声接话', [
        r'^[嗯哦啊哈嘿诶哎嗷呗咯噢emmmhhxswl6661234笑哭绝牛强好是对不没呀嘛啦嘚]{1,4}'
        r'[。！!~～\s,，、？?xdswl]*$',
        r'^(确实|也对|也是|好吧|嗯呢|嗯嗯|哦哦|哈哈|嘿嘿|诶嘛|好家伙|笑死|绝了|真的|真的吗|为啥|然后呢)[。！!~～\s,，、？?]*$',
    ]),
    ('日常分享', [
        r'(我|今天|昨天|刚才|刚刚|现在|这会儿|待会)',
    ]),
]
BIAN_YI = [(ming, [re.compile(p) for p in ps]) for ming, ps in GUAN_JIAN_ZI]


def 分类(dui):
    a = dui['触发输入'].strip()
    for ming, ps in BIAN_YI:
        for p in ps:
            if p.search(a):
                return ming
    return '日常分享'


# ---------------------------------------------------------------- 主流程

def main():
    全部 = {
        '微信私聊-林桐宇': 装载_微信林桐宇(),
        '微信私聊-叁北': 装载_微信叁北(),
        '豆瓣-多轮': 装载_豆瓣(),
        'LCCC-微博': 装载_lccc(),
        'PersonalDialog': 装载_personaldialog(),
    }
    print('== 会话数 ==')
    for k, v in 全部.items():
        print(f'  {k}: {len(v)}')

    原始对 = []
    for 来源, hs in 全部.items():
        for d in 抽对(hs, 来源, 0):
            原始对.append(d)
    print(f'\n抽到 B 侧应答对：{len(原始对)}')

    见过, 去重后 = set(), []
    for d in 原始对:
        k = json.dumps([d['触发输入'], d['真人原文']], ensure_ascii=False)
        if k in 见过:
            continue
        见过.add(k)
        去重后.append(d)
    print(f'去重后：{len(去重后)}')

    保留 = [d for d in 去重后 if 过滤(d)]
    print(f'过滤后：{len(保留)}')
    for d in 保留:
        d['场景'] = 分类(d)

    统计 = Counter(d['场景'] for d in 保留)
    源统计 = Counter(d['来源'] for d in 保留)
    print('\n按场景：', dict(统计.most_common()))
    print('按来源：', dict(源统计.most_common()))

    # ---- 分层配额：不让微博系淹没私聊形态 ----
    # 每场景按来源配额抽，某源不足则由其他源按剩余配额比例补
    按场景源 = defaultdict(lambda: defaultdict(list))
    for d in 保留:
        按场景源[d['场景']][d['来源']].append(d)

    MU_BIAO_MEI_CHANG_JING = 400
    抽样结果 = []
    for 场景, 源桶 in 按场景源.items():
        zong = sum(len(v) for v in 源桶.values())
        muBiao = min(MU_BIAO_MEI_CHANG_JING, zong)
        na = defaultdict(int)
        for 来源, zhanBi in PEI_E:
            keYong = len(源桶.get(来源, []))
            na[来源] = min(int(muBiao * zhanBi), keYong)
        # 未填满的由还有余量的源补
        cha = muBiao - sum(na.values())
        if cha > 0:
            for 来源, _ in PEI_E:
                if cha <= 0:
                    break
                keYong = len(源桶.get(来源, [])) - na[来源]
                bu = min(cha, keYong)
                na[来源] += bu
                cha -= bu
        for 来源, shu in na.items():
            if shu > 0:
                抽样结果.extend(源桶[来源][:shu])

    print(f'\n分层配额抽样后：{len(抽样结果)}')

    抽样场景 = Counter(d['场景'] for d in 抽样结果)
    抽样源 = Counter(d['来源'] for d in 抽样结果)
    print('抽样按场景：', dict(抽样场景.most_common()))
    print('抽样按来源：', dict(抽样源.most_common()))

    with io.open(os.path.join(OUT, '全部对.jsonl'), 'w', encoding='utf-8') as f:
        for d in 抽样结果:
            f.write(json.dumps(d, ensure_ascii=False) + '\n')

    分场景 = defaultdict(list)
    for d in 抽样结果:
        分场景[d['场景']].append(d)
    for ming, ds in 分场景.items():
        with io.open(os.path.join(OUT, '分场景', f'{ming}.jsonl'), 'w', encoding='utf-8') as f:
            for d in ds:
                f.write(json.dumps(d, ensure_ascii=False) + '\n')

    # ---- 统计.md ----
    ziShu = sorted(len(d['真人原文']) for d in 抽样结果)
    zhongWei = ziShu[len(ziShu) // 2] if ziShu else 0
    L = [
        '# 语料矩阵统计（第 0 步产物 · v2）',
        '',
        '## 为什么有 v2',
        '',
        'v1 把源一视同仁混进一个池子，NaturalConv（众包书面体）占了 72%。',
        '它句句完整、句句带句号、句句附和——那恰恰就是 AI 味本身。',
        '拿它建真人基线，等于把 AI 推向 AI 味。v2 先体检、再准入。',
        '',
        '## 源级准入判据',
        '',
        '| 源 | 会话数 | 字数中位 | 带句号 | 起手附和 | 带问号 | 判定 |',
        '| --- | --- | --- | --- | --- | --- | --- |',
    ]
    try:
        tiJian = json.load(io.open(os.path.join(OUT, '源体检.json'), encoding='utf-8'))
    except Exception:
        tiJian = {}
    for 来源, m in tiJian.items():
        chu = '剔除' if (m['带句号'] > YU_ZHI_JU_HAO or m['起手附和'] > YU_ZHI_FU_HE) else '准入'
        L.append(f'| {来源} | {m["n"]} | {m["字数中位"]} | {m["带句号"]*100:.1f}% | '
                 f'{m["起手附和"]*100:.1f}% | {m["带问号"]*100:.1f}% | **{chu}** |')
    L += [
        '',
        f'阈值：带句号 > {YU_ZHI_JU_HAO:.0%} 或 起手附和 > {YU_ZHI_FU_HE:.0%} → 剔除。',
        '阈值取自实测分布的空档（真实源句号率 0.4%~10.1%，众包 59.9%~72.0%），不是拍脑袋。',
        '',
        '## 分层配额',
        '',
        '主口径 = 微信真实私聊（最接近本项目形态），微博系按配额补，避免淹没私聊形态。',
        '',
    ]
    for 来源, zhanBi in PEI_E:
        L.append(f'- {来源}：{zhanBi:.0%}')
    L += ['', '## 抽样后分布', '', '| 场景 | 条数 | 达标(≥15) |', '| --- | --- | --- |']
    for k, v in 抽样场景.most_common():
        L.append(f'| {k} | {v} | {"✓" if v >= 15 else "✗"} |')
    L += ['', '| 来源 | 条数 |', '| --- | --- |']
    for k, v in 抽样源.most_common():
        L.append(f'| {k} | {v} |')
    L += [
        '',
        f'- 真人原文字数中位：{zhongWei}',
        '',
        '## 纳入 / 排除口径',
        '',
        '纳入：一对一、连续互聊（允许你两句我三句）、相邻轮相关。',
        '',
        '排除：含 URL /【】公告体 / 招聘转发；任一侧 >60 字；一侧含 ≥3 句号且 ≥35 字（单向讲述）；',
        '两侧内容词各 ≥4 却零重叠（话题跳跃）；触发与前文末条零重叠且 ≥8 字（话题跳跃）；',
        '心理学标签集、模型生成数据（本批真实源未出现，众包源已按体检整源剔除）。',
    ]
    with io.open(os.path.join(OUT, '统计.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')
    print(f'\n已写入 {OUT}')


if __name__ == '__main__':
    main()
