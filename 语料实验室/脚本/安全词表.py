# -*- coding: utf-8 -*-
"""
内容安全词表 —— **单一真源**。

⚠️ 为什么单独成一个文件：第一版把词表内联在 `构建语料矩阵.py` 里，
   自检脚本又抄了一份。结果词表里漏了 `jj`（实测「砸过后小jj正好可以变成大jj」
   堂而皇之进了矩阵），而自检用的是同一份漏网词表，照样报「残留 0」。
   ——守卫和被测共用一份漏网实现，等于没有守卫。

⚠️ 所以：正式过滤与自检**必须 import 这里**，不准再抄第二份。
   自检脚本的职责是验证「正式路径真的调了这个文件」，不是复述一遍正则。

词表取明确词，不用单字，避免误伤正常表达。
"""

import re

# ⚠️ 拉丁字母词必须加**字母边界**，否则「have fun」命中 av、「agent」命中 age…。
#   实测第一版没加边界，132 处告警里绝大多数是这类误报。
_L = r'(?<![A-Za-z])'   # 前面不是拉丁字母
_R = r'(?![A-Za-z])'    # 后面不是拉丁字母

SE_QING = re.compile(
    r'(自慰|做爱|性交|色情|淫秽|嫖|妓女|约炮|裸聊|精液|射精|龟头|阴道|阴蒂|黄片|黄网|'
    # ⚠️ 下面这几个是第一版漏掉的：实测豆瓣语料里「砸过后小jj正好可以变成大jj」
    #   「这个掉下来砸掉小jj怎么办」整条通过了过滤
    rf'小\s?jj|大\s?jj|{_L}jj{_R}|鸡巴|屄|'
    # ⚠️ 「处女」「屌」「发情」都是实测误报源：
    #   「处女男/处女座」是星座正常说法；「屌丝」是常见自嘲；「发情侣空间」里含「发情」。
    rf'胸围|罩杯|{_L}[abc]\s?杯{_R}|'
    rf'摸\s{{0,2}}胸|摸胸|揉胸|自摸|打飞机|性爱|性器官|春药|迷奸|强奸|{_L}av{_R}|av女优|'
    r'初夜|处女膜|破处|发情期|情色)',
    re.I)

GUANG_GAO = re.compile(
    r'(加群|群号|二维码|代购|物美价廉|欢迎选购|加微信|加微|加v信|推广|广告|'
    r'优惠券|扫码|私聊我|微信号|招代理|包邮|清仓)')

ZHENG_ZHI = re.compile(r'(习近平|共产党|天安门|法轮功|六四|政治犯|台湾独立|藏独|疆独)')

CI_BIAO = (('色情', SE_QING), ('广告', GUANG_GAO), ('政治', ZHENG_ZHI))


def 是违规(wenBen: str) -> bool:
    if not wenBen:
        return False
    return any(re_.search(wenBen) for _, re_ in CI_BIAO)


def 命中项(wenBen: str):
    """返回命中的类别名，供报告定位。"""
    if not wenBen:
        return []
    return [ming for ming, re_ in CI_BIAO if re_.search(wenBen)]


def 命中词(wenBen: str):
    """返回**具体命中的那个词**——不报出词就没法区分真报和误报。"""
    if not wenBen:
        return []
    chu = []
    for ming, re_ in CI_BIAO:
        for m in re_.finditer(wenBen):
            chu.append(f'{ming}:{m.group(0)}')
    return chu
