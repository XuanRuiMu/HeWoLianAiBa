# -*- coding: utf-8 -*-
"""FP-K1c批3：扫描 frontend/src 下全部 .vue 的间距族声明裸长度（0/auto/百分比/var() 除外）。"""
import re, glob, os, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

间距族 = r"(?:-(?:webkit|moz|ms|o)-)?(?:margin|padding|gap|row-gap|column-gap|grid-gap|grid-row-gap|grid-column-gap)(?:-[a-z]+)*"
长度 = re.compile(r"\d+(?:\.\d+)?(?:px|rem|em|pt|cm|mm|in|pc|q|ch|ex|lh|rlh|vi|vb|vmin|vmax|svh|lvh|dvh|cqw|cqh|cqi|cqb|cqmin|cqmax)\b", re.I)


def 剥函数片段(源):
    出 = ""
    i = 0
    while i < len(源):
        头 = re.match(r"(var|env)\s*\(", 源[i:])
        if 头:
            深度 = 0
            j = i + len(头.group(0)) - 1
            while j < len(源):
                if 源[j] == "(":
                    深度 += 1
                elif 源[j] == ")":
                    深度 -= 1
                    if 深度 == 0:
                        break
                j += 1
            内 = 源[i + len(头.group(0)) : j]
            深 = 0
            逗 = -1
            for k, c in enumerate(内):
                if c == "(":
                    深 += 1
                elif c == ")":
                    深 -= 1
                elif c == "," and 深 == 0:
                    逗 = k
                    break
            if 逗 >= 0:
                出 += 剥函数片段(内[逗 + 1 :])
            i = j + 1
            continue
        出 += 源[i]
        i += 1
    return 出


def 裸长度(值):
    残 = 剥函数片段(值)
    for m in 长度.finditer(残):
        数值 = float(re.match(r"\d+(?:\.\d+)?", m.group(0)).group(0))
        if 数值 != 0:
            return m.group(0)
    return None


def 主():
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "frontend", "src"))
    结果 = {}
    for 路径 in sorted(glob.glob("**/*.vue", recursive=True)):
        with open(路径, encoding="utf8") as f:
            源 = f.read()
        块们 = re.findall(r"<style[^>]*>([\s\S]*?)</style>", 源)
        样式 = re.sub(r"/\*[\s\S]*?\*/", "", "\n".join(块们))
        违规 = []
        for 规则 in re.finditer(r"([^{}]+)\{([^{}]*)\}", 样式):
            for 声明 in re.finditer(r"(?:^|;)\s*([a-zA-Z-]+)\s*:\s*([^;]+)", 规则.group(2)):
                属性 = 声明.group(1).lower()
                if re.fullmatch(间距族, 属性):
                    裸 = 裸长度(声明.group(2).strip())
                    if 裸:
                        违规.append((属性, 声明.group(2).strip()[:70], 裸, 规则.group(1).strip()[:50]))
        if 违规:
            结果[路径] = 违规

    for 路径 in sorted(结果, key=lambda k: -len(结果[k])):
        print(f"{len(结果[路径]):3d}  {路径}")
    print("---")
    print(f"TOTAL files: {len(结果)}, TOTAL hits: {sum(len(v) for v in 结果.values())}")
    print()
    # 详细输出
    for 路径 in sorted(结果, key=lambda k: -len(结果[k])):
        print(f"===== {路径} =====")
        for 属性, 值, 裸, 选择器 in 结果[路径]:
            print(f"  {属性}: {值}   [裸={裸}]  <{选择器}>")


if __name__ == "__main__":
    主()
