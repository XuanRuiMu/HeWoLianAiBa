(function () {
  var 减少动态 = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var 棋幕 = document.querySelector('[data-qimu]');
  var 甲 = document.querySelector('[data-ye="甲"]');
  var 乙 = document.querySelector('[data-ye="乙"]');
  var 阶段 = document.querySelector('[data-jieduan]');
  var 按钮 = document.querySelector('[data-bofang]');
  var 列数 = 8;
  var 行数 = 5;
  var 当前甲 = true;
  var 演示中 = false;
  var 格们 = [];

  var 色板 = ['#1b1440', '#2c1f5e', '#4a2f7a', '#c9a96a'];

  function 建棋格() {
    棋幕.innerHTML = '';
    格们 = [];
    for (var 行 = 0; 行 < 行数; 行 += 1) {
      for (var 列 = 0; 列 < 列数; 列 += 1) {
        var 格 = document.createElement('div');
        格.className = '棋格';
        var 距左上 = 行 + 列;
        var 距右下 = 行数 - 1 - 行 + (列数 - 1 - 列);
        var 距中 = Math.abs(行 - (行数 - 1) / 2) + Math.abs(列 - (列数 - 1) / 2);
        var 组;
        if (距左上 <= 3) 组 = 0;
        else if (距右下 <= 3) 组 = 1;
        else 组 = 2;
        格.dataset.zu = 组;
        格.dataset.xu = 组 === 0 ? 距左上 : 组 === 1 ? 距右下 : 距中;
        格.style.background = 色板[(行 + 列) % 色板.length];
        棋幕.appendChild(格);
        格们.push(格);
      }
    }
    棋幕.style.gridTemplateColumns = 'repeat(' + 列数 + ', 1fr)';
    棋幕.style.gridTemplateRows = 'repeat(' + 行数 + ', 1fr)';
    gsap.set(格们, { scale: 0, transformOrigin: 'center center' });
  }

  function 换页() {
    当前甲 = !当前甲;
    甲.hidden = !当前甲;
    乙.hidden = 当前甲;
  }

  function 按组序(入幕) {
    var 时间线 = gsap.timeline();
    [0, 1, 2].forEach(function (组号, 组序) {
      var 本组 = 格们.filter(function (格) {
        return Number(格.dataset.zu) === 组号;
      });
      本组.sort(function (a, b) {
        return Number(a.dataset.xu) - Number(b.dataset.xu);
      });
      时间线.to(
        本组,
        {
          scale: 入幕 ? 1.03 : 0,
          duration: 减少动态 ? 0.01 : 0.55,
          stagger: 减少动态 ? 0 : 0.045,
          ease: 'power3.inOut',
        },
        组序 * (减少动态 ? 0.02 : 0.42),
      );
    });
    return 时间线;
  }

  async function 完整演示() {
    if (演示中) return;
    演示中 = true;
    按钮.disabled = true;
    阶段.textContent = '① 左上 → ② 右下 → ③ 中间';
    var 入幕 = 按组序(true);
    await 入幕.then();
    换页();
    阶段.textContent = '退幕交还画面';
    var 出幕 = 按组序(false);
    await 出幕.then();
    阶段.textContent = '完成 · 可再播';
    演示中 = false;
    按钮.disabled = false;
  }

  建棋格();
  window.addEventListener('resize', 建棋格);
  按钮.addEventListener('click', 完整演示);
  setTimeout(完整演示, 600);
})();