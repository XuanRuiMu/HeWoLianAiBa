
import io
p = r"D:\xuanr\Desktop\玄锐暮工作区\和我恋爱吧/背景实验室/lab-a-base/positioner.html"
src = io.open(p, encoding="utf-8").read()
def rep(a, b, cnt=1):
    global src
    assert src.count(a) == cnt, (a[:60], src.count(a))
    src = src.replace(a, b)

rep("uniform float uWuAlt;", "uniform float uWuAlt;\nuniform float uWuStarOn;")
rep("return on * smoothstep(0.30, 0.0, d) * tw * fade;", "return on * smoothstep(0.30, 0.0, d) * tw * fade * uWuStarOn;")
rep("pow(0.5 + 0.5 * sin(uu * 5.0 + t * 0.35), 10.0)", "pow(0.5 + 0.5 * sin(uu * 5.0 + t * 0.35), 6.0)")
rep("pow(0.5 + 0.5 * sin(uu * 9.5 - t * 0.22 + warp2 * 1.7), 16.0)", "pow(0.5 + 0.5 * sin(uu * 9.5 - t * 0.22 + warp2 * 1.7), 9.0)")
rep("pow(0.5 + 0.5 * sin(uu * 17.0 + t * 0.12 + warp * 2.3), 22.0)", "pow(0.5 + 0.5 * sin(uu * 17.0 + t * 0.12 + warp * 2.3), 13.0)")
rep("return col * amt * 0.42 * uWuInt * uWuAur;", "return col * amt * 0.58 * uWuInt * uWuAur;")
rep("uAlt: { value: 0.8 }, uNoise: { value: nz } };", "uAlt: { value: 0.8 }, uStar: { value: 1 }, uNoise: { value: nz } };")
rep("sh.uniforms.uWuAlt = wuSkyU.uAlt;", "sh.uniforms.uWuAlt = wuSkyU.uAlt;\n          sh.uniforms.uWuStarOn = wuSkyU.uStar;")
rep("window.__wuSkyMesh = wuSkyMesh;", "window.__wuSkyMesh = wuSkyMesh;\n        window.__wuSkyU = wuSkyU;\n        window.__wuSkyStars = function (v) { wuSkyU.uStar.value = v ? 1 : 0; return wuSkyU.uStar.value; };")
io.open(p, "w", encoding="utf-8", newline="").write(src)
print("ok", len(src))
