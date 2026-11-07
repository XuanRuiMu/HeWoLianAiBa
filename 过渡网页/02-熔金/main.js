(function () {
  var 根 = document.body;
  var 数字 = document.querySelector("[data-progress]");
  var 进度条 = document.querySelector("[data-progress-bar]");
  var 圆环 = document.querySelector("[data-meter]");
  var 重播按钮 = document.querySelector("[data-replay]");
  var 减少动态 = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var 总时长 = 减少动态 ? 650 : 4600;
  var 帧 = 0;
  var 完成定时 = 0;
  var 复位定时 = 0;

  function 格式化(v) {
    return String(Math.max(0, Math.min(100, Math.round(v)))).padStart(3, "0");
  }

  function 停止计时() {
    if (帧) cancelAnimationFrame(帧);
    if (完成定时) clearTimeout(完成定时);
    if (复位定时) clearTimeout(复位定时);
    帧 = 0;
    完成定时 = 0;
    复位定时 = 0;
  }

  function 开始演示() {
    停止计时();
    根.classList.add("is-resetting");
    根.classList.remove("is-ready", "is-hiding");
    根.classList.add("is-loading");
    数字.textContent = "000";
    进度条.style.transform = "scaleX(0)";
    圆环.style.setProperty("--jin-du", "0deg");
    void 根.offsetWidth;
    根.classList.remove("is-resetting");
    var 起点 = performance.now();
    var 进度上限 = 总时长 - (减少动态 ? 80 : 560);

    function 推进(当前) {
      var 比例 = Math.min(1, (当前 - 起点) / 进度上限);
      var 缓动 = 1 - Math.pow(1 - 比例, 5);
      var 数值 = 缓动 * 100;
      数字.textContent = 格式化(数值);
      进度条.style.transform = "scaleX(" + (数值 / 100).toFixed(4) + ")";
      圆环.style.setProperty("--jin-du", (数值 * 3.6).toFixed(2) + "deg");
      if (比例 < 1) 帧 = requestAnimationFrame(推进);
    }

    帧 = requestAnimationFrame(推进);
    完成定时 = setTimeout(function () {
      数字.textContent = "100";
      进度条.style.transform = "scaleX(1)";
      圆环.style.setProperty("--jin-du", "360deg");
      根.classList.add("is-hiding");
      根.classList.remove("is-loading");
      复位定时 = setTimeout(
        function () {
          根.classList.add("is-ready");
        },
        减少动态 ? 0 : 260,
      );
    }, 总时长);
  }

  重播按钮.addEventListener("click", 开始演示);
  window.addEventListener("pagehide", 停止计时);
  开始演示();
})();
