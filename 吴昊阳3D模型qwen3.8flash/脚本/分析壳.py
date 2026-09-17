# -*- coding: utf-8 -*-
import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
d = json.load(open("证据/FP-01-壳.json", encoding="utf-8"))
sh = d["shells"]
tot = sum(s["n"] for s in sh)
print("shells", len(sh), "total_verts", tot)
sh.sort(key=lambda s:-s["n"])
print("--- top 30 shells by vert count (n, center, min, max) ---")
for s in sh[:30]:
    c=s["center"]; mn=s["min"]; mx=s["max"]
    print(f'id{s["id"]:>4} n={s["n"]:>6} c=({c[0]:+.2f},{c[1]:+.2f},{c[2]:+.2f}) z=[{mn[2]:+.2f},{mx[2]:+.2f}] x=[{mn[0]:+.2f},{mx[0]:+.2f}] y=[{mn[1]:+.2f},{mx[1]:+.2f}]')
big = [s for s in sh if s["n"]>=500]
print("shells>=500v:", len(big), "cover verts:", sum(s["n"] for s in big))
