import io
base = r"D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧"
p = base + "/背景实验室/lab-a-base/positioner.html"
src = io.open(p, encoding="utf-8").read()
row = "    <div class=\"row\"><label>昼夜</label><button class=\"btn\" id=\"btnTheme\" style=\"margin:0;flex:0 0 auto;padding:4px 10px\">\U0001F319 \u591c\u665a</button><span class=\"val\" id=\"themeV\">\u767d\u5929</span></div>\n"
a1 = "    <div class=\"row\"><label>\u6781\u5149</label>"
assert src.count(a1) == 1, ("a1", src.count(a1))
src = src.replace(a1, row + a1)
js = """
  var nightOn = false;
  function applyTheme(dark) {
    nightOn = !!dark;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.getElementById("themeV").textContent = dark ? "夜晚" : "白天";
    document.getElementById("btnTheme").textContent = dark ? "🌙 夜晚" : "☀ 白天";
  }
  document.getElementById("btnTheme").addEventListener("click", function () {
    applyTheme(!nightOn);
    toast(nightOn ? "已切到夜晚" : "已切到白天");
  });
  if (!document.documentElement.getAttribute("data-theme")) applyTheme(false); else applyTheme(document.documentElement.getAttribute("data-theme") === "dark");
"""
a3 = "  var auroraOn = true, distShow = false;"
assert src.count(a3) == 1, ("a3", src.count(a3))
src = src.replace(a3, js + a3)
io.open(p, "w", encoding="utf-8", newline="").write(src)
print("ok", len(src))