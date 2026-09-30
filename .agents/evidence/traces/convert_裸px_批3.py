# -*- coding: utf-8 -*-
"""
FP-K1c批3：把 frontend/src 下全部 .vue 间距族声明中的裸长度替换为令牌/calc。
"""
import re, glob, os, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

间距族正则 = re.compile(
    r"^(?:-(?:webkit|moz|ms|o)-)?"
    r"(?:margin|padding|gap|row-gap|column-gap|grid-gap|grid-row-gap|grid-column-gap|scroll-margin|scroll-padding)"
    r"(?:-[a-z]+)*$"
)
长度正则 = re.compile(r"(-?\d+(?:\.\d+)?)(px)\b", re.I)

直映 = {
    '1px': 'var(--jiange-1)', '2px': 'var(--jiange-2)', '3px': 'var(--jiange-3)',
    '4px': 'var(--jiange-4)', '5px': 'var(--jiange-5)', '6px': 'var(--jiange-6)',
    '7px': 'var(--jiange-7)', '8px': 'var(--jiange-xiao)', '9px': 'var(--jiange-9)',
    '10px': 'var(--jiange-10)', '11px': 'var(--jiange-11)', '12px': 'var(--jiange-12)',
    '13px': 'var(--jiange-13)', '15px': 'var(--jiange-15)', '16px': 'var(--jiange-zhong)',
    '24px': 'var(--jiange-da)', '76px': 'var(--biaoqian-lan-gao-du)',
}
calc组合 = {
    '14px': ('calc(var(--jiange-12) + var(--jiange-2))', 'var(--jiange-12) + var(--jiange-2)'),
    '18px': ('calc(var(--jiange-zhong) + var(--jiange-2))', 'var(--jiange-zhong) + var(--jiange-2)'),
    '20px': ('calc(var(--jiange-zhong) + var(--jiange-4))', 'var(--jiange-zhong) + var(--jiange-4)'),
    '22px': ('calc(var(--jiange-zhong) + var(--jiange-6))', 'var(--jiange-zhong) + var(--jiange-6)'),
    '26px': ('calc(var(--jiange-da) + var(--jiange-2))', 'var(--jiange-da) + var(--jiange-2)'),
    '28px': ('calc(var(--jiange-da) + var(--jiange-4))', 'var(--jiange-da) + var(--jiange-4)'),
    '32px': ('calc(var(--jiange-da) + var(--jiange-xiao))', 'var(--jiange-da) + var(--jiange-xiao)'),
    '40px': ('calc(var(--jiange-da) + var(--jiange-zhong))', 'var(--jiange-da) + var(--jiange-zhong)'),
    '48px': ('calc(var(--jiange-da) * 2)', 'var(--jiange-da) * 2'),
    '50px': ('calc(var(--jiange-da) * 2 + var(--jiange-2))', 'var(--jiange-da) * 2 + var(--jiange-2)'),
    '60px': ('calc(var(--jiange-da) * 2 + var(--jiange-12))', 'var(--jiange-da) * 2 + var(--jiange-12)'),
}


def 判断在calc内(值, 位置):
    深度 = 0
    for i in range(位置 - 1, -1, -1):
        c = 值[i]
        if c == ')':
            深度 += 1
        elif c == '(':
            if 深度 == 0:
                前 = 值[:i].rstrip()
                return 前.lower().endswith('calc')
            深度 -= 1
    return False


def 替换值(值):
    计数 = 0
    结果 = ''
    位置 = 0
    for m in 长度正则.finditer(值):
        数值 = float(m.group(1))
        if 数值 == 0:
            continue
        键 = f"{abs(数值):g}px"
        是负 = 数值 < 0
        在calc = 判断在calc内(值, m.start())
        if 键 in 直映:
            token = 直映[键]
            替 = f'{token} * -1' if 是负 and 在calc else (f'calc({token} * -1)' if 是负 else token)
        elif 键 in calc组合:
            完整, 展开 = calc组合[键]
            if 是负:
                替 = f'({展开}) * -1' if 在calc else f'calc({完整} * -1)'
            else:
                替 = 展开 if 在calc else 完整
        else:
            print(f'  !! 未映射: {键} in "{值}"')
            continue
        结果 += 值[位置:m.start()] + 替
        位置 = m.end()
        计数 += 1
    结果 += 值[位置:]
    return 结果, 计数


def 处理文件(路径):
    with open(路径, encoding='utf8') as f:
        源 = f.read()
    总替换 = 0

    def 替换声明(m):
        nonlocal 总替换
        属性 = m.group(1).lower()
        if not 间距族正则.fullmatch(属性):
            return m.group(0)
        新值, n = 替换值(m.group(2))
        if n == 0:
            return m.group(0)
        总替换 += n
        return f'{m.group(1)}: {新值}'

    def 替换风格块(m):
        非注释 = re.sub(r'/\*[\s\S]*?\*/', lambda c: c.group(0), m.group(2))
        # 只在非注释部分替换：按注释切段
        段们 = []
        位 = 0
        for cm in re.finditer(r'/\*[\s\S]*?\*/', 非注释):
            if cm.start() > 位:
                段们.append(re.sub(r'([a-zA-Z-]+)\s*:\s*([^;{}]+)', 替换声明, 非注释[位:cm.start()]))
            段们.append(cm.group(0))
            位 = cm.end()
        if 位 < len(非注释):
            段们.append(re.sub(r'([a-zA-Z-]+)\s*:\s*([^;{}]+)', 替换声明, 非注释[位:]))
        return m.group(1) + ''.join(段们) + m.group(3)

    新源 = re.sub(r'(<style[^>]*>)([\s\S]*?)(</style>)', 替换风格块, 源)
    if 总替换 > 0:
        with open(路径, 'w', encoding='utf8', newline='') as f:
            f.write(新源)
    return 总替换


def 主():
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'frontend', 'src'))
    总 = 0
    文件数 = 0
    for 路径 in sorted(glob.glob('**/*.vue', recursive=True)):
        n = 处理文件(路径)
        if n:
            print(f'{n:3d} 处  {路径}')
            总 += n
            文件数 += 1
    print(f'--- 合计: {文件数} 文件, {总} 处替换')


if __name__ == '__main__':
    主()
