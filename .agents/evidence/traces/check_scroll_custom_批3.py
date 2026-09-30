# -*- coding: utf-8 -*-
import re, glob, os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'frontend', 'src'))

print('=== 滚动容器 padding-top ===')
for p in sorted(glob.glob('**/*.vue', recursive=True)):
    src = open(p, encoding='utf8').read()
    styles = '\n'.join(re.findall(r'<style[^>]*>([\s\S]*?)</style>', src))
    styles = re.sub(r'/\*[\s\S]*?\*/', '', styles)
    for rule in re.finditer(r'([^{}]+)\{([^{}]*)\}', styles):
        sel = rule.group(1).strip()[:50]
        body = rule.group(2)
        is_scroll = False
        for d in re.finditer(r'(?:^|;)\s*(overflow(?:-x|-y)?)\s*:\s*([^;]+)', body):
            if re.search(r'auto|scroll', d.group(2), re.I):
                is_scroll = True
        if is_scroll:
            pt = ''
            for d in re.finditer(r'(?:^|;)\s*(padding-top|padding|padding-block-start|padding-block)\s*:\s*([^;]+)', body):
                pt = d.group(1) + ': ' + d.group(2).strip()[:60]
            print(f'  {p}  [{sel}]  {pt if pt else "(none)"}')

print()
print('=== 局部自定义属性含裸px ===')
for p in sorted(glob.glob('**/*.vue', recursive=True)):
    src = open(p, encoding='utf8').read()
    styles = '\n'.join(re.findall(r'<style[^>]*>([\s\S]*?)</style>', src))
    styles = re.sub(r'/\*[\s\S]*?\*/', '', styles)
    for m in re.finditer(r'(--[a-zA-Z0-9-]+)\s*:\s*([^;{}]+)', styles):
        name = m.group(1)
        val = m.group(2).strip()
        for lm in re.finditer(r'(-?\d+(?:\.\d+)?)px\b', val):
            num = float(lm.group(1))
            if num != 0:
                # check if it's inside var() - if so skip
                before = val[:lm.start()]
                if 'var(' in before and before.rfind('var(') > before.rfind(')'):
                    continue
                print(f'  {p}  {name}: {val[:60]}')
                break
