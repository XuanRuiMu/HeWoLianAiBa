(function () {
  var 减少动态 = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var 棋幕 = document.querySelector('[data-qimu]');
  var 甲 = document.querySelector('[data-ye="甲"]');
  var 乙 = document.querySelector('[data-ye="乙"]');
  var 阶段 = document.querySelector('[data-jieduan]');
  var 按钮 = document.querySelector('[data-bofang]');
  var 列数 = 8;
  var 行数 = 5;
  var 心比 = 38 / 36;
  var 心路 =
    'M16 29C16 29 2 19.6 2 11.5 2 6.3 6.2 2.4 11 2.4c3 0 5 2.2 5 2.2s2-2.2 5-2.2c4.8 0 9 3.9 9 9.1C30 19.6 16 29 16 29z';
  var 格底 = [
    ['#1b1440', '#241a3d'],
    ['#2c1f5e', '#1b1440'],
    ['#4a2f7a', '#2c1f5e'],
    ['#331338', '#1b1440'],
  ];
  var 心色 = [
    ['#ff9ebc', '#ff6b9d'],
    ['#ff6b9d', '#c9184a'],
    ['#f6d5c0', '#e8a87c'],
    ['#b06ab3', '#6a3f8f'],
  ];
  var 心图们 = null;
  var 格们 = [];
  var 当前甲 = true;
  var 演示中 = false;

  var 入幕起点 = [0, 0.07, 0.14];
  var 入幕时长 = 0.3;
  var 入幕错开 = 0.012;
  var 换页停顿 = 0.04;
  var 退幕起点 = [0, 0.045, 0.09];
  var 退幕时长 = 0.2;
  var 退幕错开 = 0.008;

  gsap.config({ force3D: true });

  function 造心图(起色, 终色) {
    var 边 = 256;
    var 画 = document.createElement('canvas');
    画.width = 边;
    画.height = Math.round(边 / 心比);
    var 笔 = 画.getContext('2d');
    var 比 = 边 / 32;
    笔.scale(比, 比);
    var 渐 = 笔.createLinearGradient(6, 2, 26, 30);
    渐.addColorStop(0, 起色);
    渐.addColorStop(1, 终色);
    笔.fillStyle = 渐;
    笔.fill(new Path2D(心路));
    return 画.toDataURL('image/png');
  }

  function 备色() {
    if (心图们) return;
    心图们 = 心色.map(function (对) {
      return 造心图(对[0], 对[1]);
    });
  }

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
        var 底 = 格底[(行 * 2 + 列) % 格底.length];
        格.style.backgroundImage =
          'linear-gradient(150deg, ' + 底[0] + ', ' + 底[1] + ')';

        var 心 = document.createElement('span');
        心.className = '愛心';
        心.style.backgroundImage =
          'url(' + 心图们[(行 + 列 * 2) % 心图们.length] + ')';
        心.style.setProperty('--pian', (((行 * 7 + 列 * 13) % 9) - 4) + 'deg');
        格.appendChild(心);

        棋幕.appendChild(格);
        格们.push(格);
      }
    }
    棋幕.style.gridTemplateColumns = 'repeat(' + 列数 + ', 1fr)';
    棋幕.style.gridTemplateRows = 'repeat(' + 行数 + ', 1fr)';
    gsap.set(格们, { scale: 0, transformOrigin: 'center center', force3D: true });
  }

  function 取组(组号) {
    return 格们
      .filter(function (格) {
        return Number(格.dataset.zu) === 组号;
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
    [0, 1, 2].forEach(function (组号) {
      时间线.to(
        取组(组号),
        {
          scale: 1,
          duration: 减少动态 ? 0.01 : 入幕时长,
          ease: 'back.out(1.5)',
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
          scale: 0,
          duration: 减少动态 ? 0.01 : 退幕时长,
          ease: 'power2.in',
          stagger: { each: 减少动态 ? 0 : 退幕错开 },
          force3D: true,
        },
        退幕起点[组号],
      );
    });
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
  建棋格();
  var 改尺定时 = 0;
  window.addEventListener('resize', function () {
    clearTimeout(改尺定时);
    改尺定时 = setTimeout(function () {
      if (演示中) return;
      建棋格();
    }, 180);
  });
  按钮.addEventListener('click', 完整演示);
  setTimeout(完整演示, 400);
})();
