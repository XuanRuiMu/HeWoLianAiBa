(function () {
  var 减少动态 = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var 心層 = document.querySelector('[data-xinceng]');
  var 幕布 = document.querySelector('[data-mubu]');
  var 甲 = document.querySelector('[data-ye="甲"]');
  var 乙 = document.querySelector('[data-ye="乙"]');
  var 阶段 = document.querySelector('[data-jieduan]');
  var 按钮 = document.querySelector('[data-bofang]');
  var 色票 = [
    ['#ff9ebc', '#ff6b9d'],
    ['#ff6b9d', '#c9184a'],
    ['#f6d5c0', '#e8a87c'],
    ['#b06ab3', '#6a3f8f'],
  ];
  var 心比 = 38 / 36;
  var 心路 =
    'M16 29C16 29 2 19.6 2 11.5 2 6.3 6.2 2.4 11 2.4c3 0 5 2.2 5 2.2s2-2.2 5-2.2c4.8 0 9 3.9 9 9.1C30 19.6 16 29 16 29z';
  var 心图们 = null;

  function 造心图(起色, 终色) {
    var 边 = 512;
    var 画 = document.createElement('canvas');
    画.width = 边;
    画.height = Math.round(边 / 心比);
    var 笔 = 画.getContext('2d');
    var 比 = 边 / 32;
    笔.scale(比, 比);
    var 渐 = 笔.createLinearGradient(0, 0, 19, 30);
    渐.addColorStop(0, 起色);
    渐.addColorStop(1, 终色);
    笔.fillStyle = 渐;
    笔.fill(new Path2D(心路));
    return 画.toDataURL('image/png');
  }

  function 备色() {
    if (心图们) return;
    心图们 = 色票.map(function (对) {
      return 造心图(对[0], 对[1]);
    });
  }

  var 入幕起点 = [0, 0.1, 0.2];
  var 入幕时长 = 0.42;
  var 入幕错开 = 0.022;
  var 换页停顿 = 0.05;
  var 退幕起点 = [0, 0.07, 0.14];
  var 退幕时长 = 0.28;
  var 退幕错开 = 0.012;

  var 心们 = [];
  var 当前甲 = true;
  var 演示中 = false;

  gsap.config({ force3D: true });

  function 建心() {
    var 宽 = window.innerWidth;
    var 高 = window.innerHeight;
    var 尺寸 = Math.max(196, Math.min(380, Math.min(宽, 高) * 0.42));
    var 列距 = 尺寸 * 0.9;
    var 行距 = 尺寸 * 0.93;
    var 列数 = Math.max(2, Math.ceil(宽 / 列距) + 1);
    var 行数 = Math.max(2, Math.ceil(高 / 行距) + 1);
    var 左起 = 宽 / 2 - ((列数 - 1) * 列距) / 2;
    var 上起 = 高 / 2 - ((行数 - 1) * 行距) / 2;

    心層.innerHTML = '';
    心们 = [];
    for (var 行 = 0; 行 < 行数; 行 += 1) {
      for (var 列 = 0; 列 < 列数; 列 += 1) {
        var 心 = document.createElement('span');
        心.className = '愛心';
        var 中心X = 左起 + 列 * 列距;
        var 中心Y = 上起 + 行 * 行距;
        var 比X = 中心X / 宽;
        var 比Y = 中心Y / 高;
        var 距左上 = 比X + 比Y;
        var 距右下 = 2 - 距左上;
        var 距中 = Math.abs(比X - 0.5) + Math.abs(比Y - 0.5);
        var 组 = 距左上 <= 0.78 ? 0 : 距右下 <= 0.78 ? 1 : 2;
        心.dataset.zu = 组;
        心.dataset.xu = 组 === 0 ? 距左上 : 组 === 1 ? 距右下 : 距中;
        心.dataset.偏 = ((行 * 7 + 列 * 13) % 9) - 4;
        心.style.left = 中心X - 尺寸 / 2 + 'px';
        心.style.top = 中心Y - 尺寸 / 心比 / 2 + 'px';
        心.style.width = 尺寸 + 'px';
        心.style.height = 尺寸 / 心比 + 'px';
        心.style.backgroundImage =
          'url(' + 心图们[(行 + 列 * 2 + 组) % 心图们.length] + ')';
        心層.appendChild(心);
        心们.push(心);
      }
    }
    gsap.set(心们, {
      scale: 0.24,
      opacity: 0,
      rotate: function (i, 元) {
        return Number(元.dataset.偏) * 2.4;
      },
      transformOrigin: '50% 54%',
      force3D: true,
    });
    gsap.set(幕布, { opacity: 0 });
  }

  function 取组(组号) {
    return 心们
      .filter(function (心) {
        return Number(心.dataset.zu) === 组号;
      })
      .sort(function (a, b) {
        return Number(a.dataset.xu) - Number(b.dataset.xu);
      });
  }

  function 换页() {
    当前甲 = !当前甲;
    甲.hidden = !当前甲;
    乙.hidden = 当前甲;
  }

  function 入幕() {
    var 时间线 = gsap.timeline();
    时间线.to(
      幕布,
      { opacity: 1, duration: 减少动态 ? 0.01 : 0.54, ease: 'power2.inOut' },
      0.06,
    );
    [0, 1, 2].forEach(function (组号) {
      时间线.to(
        取组(组号),
        {
          scale: 1,
          opacity: 1,
          rotate: 0,
          duration: 减少动态 ? 0.01 : 入幕时长,
          ease: 'power3.out',
          stagger: { each: 减少动态 ? 0 : 入幕错开 },
          force3D: true,
        },
        入幕起点[组号],
      );
    });
    return 时间线;
  }

  function 退幕() {
    var 时间线 = gsap.timeline();
    [0, 1, 2].forEach(function (组号) {
      时间线.to(
        取组(组号),
        {
          scale: 0.2,
          opacity: 0,
          duration: 减少动态 ? 0.01 : 退幕时长,
          ease: 'power2.in',
          stagger: { each: 减少动态 ? 0 : 退幕错开 },
          force3D: true,
        },
        退幕起点[组号],
      );
    });
    时间线.to(
      幕布,
      { opacity: 0, duration: 减少动态 ? 0.01 : 0.36, ease: 'power2.out' },
      0.1,
    );
    return 时间线;
  }

  function 完整演示() {
    if (演示中) return;
    演示中 = true;
    按钮.disabled = true;
    var 起 = performance.now();
    阶段.textContent = '① 左上 → ② 右下 → ③ 中间';
    var 入场 = 入幕();
    入场.eventCallback('onComplete', function () {
      gsap.delayedCall(减少动态 ? 0 : 换页停顿, function () {
        换页();
        阶段.textContent = '退幕交还画面';
        var 出场 = 退幕();
        出场.eventCallback('onComplete', function () {
          var 用时 = ((performance.now() - 起) / 1000).toFixed(2);
          document.documentElement.dataset.zongShiChang = 用时;
          阶段.textContent = '完成 · 共 ' + 用时 + ' 秒 · 可再播';
          演示中 = false;
          按钮.disabled = false;
        });
      });
    });
  }

  备色();
  建心();
  var 改尺定时 = 0;
  window.addEventListener('resize', function () {
    clearTimeout(改尺定时);
    改尺定时 = setTimeout(function () {
      if (演示中) return;
      建心();
    }, 200);
  });
  按钮.addEventListener('click', 完整演示);
  setTimeout(完整演示, 450);
})();