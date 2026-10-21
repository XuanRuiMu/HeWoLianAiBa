
import io
p = r"D:\xuanr\Desktop\玄锐暮工作区\和我恋爱吧/背景实验室/lab-a-base/positioner.html"
src = io.open(p, encoding="utf-8").read()
a = "sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'gl_FragColor = vec4( wuAuroraColor( normalize( vWuDir ) ), 1.0 );');"
assert src.count(a) == 1, ("frag", src.count(a))
b = ("sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',"
     " 'vec3 wuD = normalize( vWuDir );\\n' +"
     " 'gl_FragColor = vec4( wuAuroraColor( wuD ) + wuSkyFill( wuD, uWuAur ), 1.0 );');")
src = src.replace(a, b)
io.open(p, "w", encoding="utf-8", newline="").write(src)
print("ok", len(src))
