(function () {
  var 减少动态 = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var 甲 = document.querySelector('[data-ye="甲"]');
  var 乙 = document.querySelector('[data-ye="乙"]');
  var 阶段 = document.querySelector('[data-jieduan]');
  var 按钮 = document.querySelector('[data-zidong]');
  var 当前甲 = true;
  var 演示中 = false;

  var 揭示器 = new window.Revealer({
    nmbLayers: 3,
    bgcolor: ['#1b1440', '#4a2f7a', '#c9a96a'],
    effect: 'xiemu',
    onStart: function () {},
    onEnd: function () {},
  });

  function 换页() {
    当前甲 = !当前甲;
    甲.hidden = !当前甲;
    乙.hidden = 当前甲;
  }

  function 播一段(方向, 文案) {
    return new Promise(function (resolve) {
      阶段.textContent = 文案;
      if (减少动态) {
        换页();
        resolve();
        return;
      }
      揭示器.reveal(方向, 750, function () {
        换页();
      });
      var 等待 = setInterval(function () {
        if (!揭示器.isAnimating) {
          clearInterval(等待);
          resolve();
        }
      }, 60);
    });
  }

  async function 完整演示() {
    if (演示中) return;
    演示中 = true;
    按钮.disabled = true;
    await 播一段('cornertopleft', '① 左上先覆');
    await 播一段('cornerbottomright', '② 右下接力');
    await 播一段('top', '③ 中间与其他收尾');
    阶段.textContent = '完成 · 可再播';
    演示中 = false;
    按钮.disabled = false;
  }

  按钮.addEventListener('click', 完整演示);
  setTimeout(完整演示, 600);
})();