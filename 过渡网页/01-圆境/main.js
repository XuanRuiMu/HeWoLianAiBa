(function () {
  var 根 = document.body;
  var 加载层 = document.getElementById("loader");
  var 数字 = document.querySelector("[data-progress]");
  var 进度条 = document.querySelector("[data-progress-bar]");
  var 重播按钮 = document.querySelector("[data-replay]");
  var 减少动态 = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var 总时长 = 减少动态 ? 700 : 4200;
  var 进度帧 = 0;
  var 结束定时 = 0;
  var 加载器 = new SVGLoader(加载层, {
    speedIn: 减少动态 ? 1 : 760,
    easingIn: mina.easeinout,
    speedOut: 减少动态 ? 1 : 680,
    easingOut: mina.easeinout,
  });

  function 格式化(v) {
    return String(Math.max(0, Math.min(100, Math.round(v)))).padStart(2, "0");
  }

  function 停止计时() {
    if (进度帧) cancelAnimationFrame(进度帧);
    if (结束定时) clearTimeout(结束定时);
    进度帧 = 0;
    结束定时 = 0;
  }

  function 开始演示() {
    停止计时();
    根.classList.remove("is-ready", "is-hiding");
    根.classList.add("is-loading");
    数字.textContent = "00";
    进度条.style.transform = "scaleX(0)";
    加载器.show();
    var 起点 = performance.now();
    var 进度上限 = 总时长 - (减少动态 ? 80 : 620);

    function 推进(当前) {
      var 比例 = Math.min(1, (当前 - 起点) / 进度上限);
      var 缓动 = 1 - Math.pow(1 - 比例, 4);
      var 数值 = 缓动 * 100;
      数字.textContent = 格式化(数值);
      进度条.style.transform = "scaleX(" + (数值 / 100).toFixed(4) + ")";
      if (比例 < 1) 进度帧 = requestAnimationFrame(推进);
    }

    进度帧 = requestAnimationFrame(推进);
    结束定时 = setTimeout(function () {
      数字.textContent = "100";
      进度条.style.transform = "scaleX(1)";
      根.classList.add("is-hiding");
      加载器.hide();
      根.classList.remove("is-loading");
      setTimeout(
        function () {
          根.classList.add("is-ready");
        },
        减少动态 ? 0 : 180,
      );
      setTimeout(
        function () {
          根.classList.remove("is-hiding");
        },
        减少动态 ? 0 : 700,
      );
    }, 总时长);
  }

  重播按钮.addEventListener("click", 开始演示);
  window.addEventListener("pagehide", 停止计时);
  开始演示();
})();
