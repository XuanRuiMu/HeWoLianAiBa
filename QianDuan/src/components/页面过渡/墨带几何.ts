  const 默认波浪 = {
    前缘: [
      { 幅: 0.03, 长: 0.5 },
      { 幅: 0.014, 长: 0.26 },
      { 幅: 0.006, 长: 0.13 }
    ],
    分界: [
      { 幅: 0.018, 长: 0.55 },
      { 幅: 0.008, 长: 0.24 }
    ],
    相位: { 甲: 1.7, 乙: 4.4, 丙: 2.9, 甲乙: 2.4, 乙丙: 5.1 },
    边距: 0.016,
    压缝: 1.2,
    步长: 24,
    外扩: 800,
    框余: 400,
    覆盖余量: 320,
    隐藏余量: 320,
    加长: 400
  };

  const 默认锚 = {
    甲乙: { 起点: { x比例: 0, y比例: 0.725 }, 终点: { x比例: 0.4833, y比例: 0 } },
    乙丙: { 起点: { x比例: 0.682, y比例: 1 }, 终点: { x比例: 0.863, y比例: 0 } }
  };

  const 夹 = (值) => Math.min(1, Math.max(0, 值));
  const 包络 = (值) => Math.pow(Math.sin(Math.PI * 夹(值)), 0.85);
  const 尖 = (值, 中, 宽) => Math.exp(-Math.pow((值 - 中) / 宽, 2));

  const 散 = (种) => {
    const 数 = Math.sin(种 * 127.1 + 311.7) * 43758.5453;
    return 数 - Math.floor(数);
  };

  const 噪 = (值) => {
    const 整 = Math.floor(值);
    const 余 = 值 - 整;
    const 缓 = 余 * 余 * (3 - 2 * 余);
    return 散(整) * (1 - 缓) + 散(整 + 1) * 缓;
  };

  const 分形噪 = (值) => 噪(值) * 0.55 + 噪(值 * 2.17) * 0.28 + 噪(值 * 4.63) * 0.12 + 噪(值 * 9.11) * 0.05;

  const 笔意 = (t, 名, 弦长, 波浪, 对角) => {
    const 相 = 波浪.相位[名];
    const 包 = Math.pow(Math.sin(Math.PI * 夹(t)), 0.62);
    const 弧 = 0.0075 * Math.sin(t * Math.PI * 1.2 + 相 * 0.7);
    const 手 = (分形噪(t * 7.3 + 相) - 0.5) * 0.011;
    const 毫 = (分形噪(t * 46 + 相 * 3) - 0.5) * 0.0032;
    return (弧 + 手 + 毫) * 包 * 对角;
  };

  const 毛边 = (v, 相位, 对角) => {
    return ((分形噪(v * 0.028 + 相位) - 0.5) * 0.0032 +
      (分形噪(v * 0.075 + 相位 * 2) - 0.5) * 0.0014) * 对角;
  };

  const 分量 = (色) => {
    const 数 = parseInt(色.slice(1), 16);
    return [(数 >> 16) & 255, (数 >> 8) & 255, 数 & 255];
  };

  const 调色 = (色, 倍) => {
    return "rgb(" + 分量(色).map((值) => Math.min(255, Math.round(值 * 倍))).join(",") + ")";
  };

  const 取分量串 = (色) => 分量(色).join(",");

  const 柳叶笔头 = (v, t, 相位, 波浪, 对角) => {
    const u = 夹(t);
    const 肚 = Math.pow(Math.sin(Math.PI * u), 1.25);
    const 偏 = 0.78 + 0.22 * u;
    const 出锋 = 0.024 * 尖(u, 0.93, 0.042);
    const 起锋 = 0.012 * 尖(u, 0.11, 0.055);
    return (0.075 * 肚 * 偏 + 出锋 + 起锋) * 对角;
  };

  const 方案表 = {
    现状: {
      标题: "现在的样子",
      说明: "保留作对照：边是大幅波浪，笔头是不规则尖角",
      幅: 0.055,
      细步: 8,
      分界步长: 24,
      毛边: false,
      笔头: (v, t, 相位, 波浪, 对角) => {
        let 值 = 0;
        波浪.前缘.forEach((波, 序) => {
          const 包 = 0.72 + 0.28 * Math.sin(t * 6.7 + 相位 * 1.7 + 序 * 2.3);
          值 += 波.幅 * 包 * Math.sin(v / (波.长 * 对角) * Math.PI * 2 + 相位 + 序 * 1.31);
        });
        return 值 * 对角;
      },
      分界: (t, 名, 弦长, 波浪, 对角) => {
        let 值 = 0;
        波浪.分界.forEach((波, 序) => {
          const 包 = 0.75 + 0.25 * Math.sin(t * 5.3 + 波浪.相位[名] * 2.1 + 序 * 2.7);
          值 += 波.幅 * 包 * Math.sin((t * 弦长) / (波.长 * 对角) * Math.PI * 2 + 波浪.相位[名] + 序 * 1.7);
        });
        return 值 * 对角 * 包络(t);
      }
    },
    斜锋: {
      标题: "侧锋直扫",
      说明: "笔头像毛笔斜着入纸一刀切过去",
      幅: 0.066,
      细步: 6,
      分界步长: 6,
      毛边: true,
      笔头: (v, t, 相位, 波浪, 对角) => {
        const u = 夹(t);
        const 斜 = (u - 0.5) * 2;
        const 微弧 = Math.sin(Math.PI * u);
        return (0.058 * 斜 + 0.007 * 微弧) * 对角;
      },
      分界: (t, 名, 弦长, 波浪, 对角) => 笔意(t, 名, 弦长, 波浪, 对角)
    },
    直边: {
      标题: "直边版",
      说明: "长边是尺子画的直线，笔头是柳叶，没有墨迹质感",
      幅: 0.086,
      细步: 8,
      分界步长: 24,
      毛边: false,
      笔头: 柳叶笔头,
      分界: () => 0
    },
    柳叶: {
      标题: "露锋柳叶",
      说明: "中间是饱满笔肚，两端收成笔锋，还带一小段出锋",
      幅: 0.086,
      细步: 6,
      分界步长: 6,
      毛边: true,
      笔头: 柳叶笔头,
      分界: (t, 名, 弦长, 波浪, 对角) => 笔意(t, 名, 弦长, 波浪, 对角)
    },
    圆肚: {
      标题: "藏锋圆肚",
      说明: "圆钝饱满的笔肚，起笔处有一记顿点",
      幅: 0.09,
      细步: 6,
      分界步长: 6,
      毛边: true,
      笔头: (v, t, 相位, 波浪, 对角) => {
        const u = 夹(t);
        const 距 = 2 * u - 1;
        const 圆 = Math.sqrt(Math.max(0, 1 - 距 * 距));
        const 移 = 0.86 + 0.14 * u;
        const 顿 = 0.019 * 尖(u, 0.09, 0.075);
        const 收 = 0.013 * 尖(u, 0.95, 0.035);
        return (0.078 * 圆 * 移 + 顿 + 收) * 对角;
      },
      分界: (t, 名, 弦长, 波浪, 对角) => 笔意(t, 名, 弦长, 波浪, 对角)
    },
    散毫: {
      标题: "散毫飞白",
      说明: "笔头散成几缕笔锋，笔身飞白最重",
      幅: 0.096,
      细步: 4,
      分界步长: 5,
      毛边: true,
      笔头: (v, t, 相位, 波浪, 对角) => {
        const u = 夹(t);
        const 距 = 2 * u - 1;
        const 圆 = Math.sqrt(Math.max(0, 1 - 距 * 距));
        const 峰位 = [0.2, 0.5, 0.81];
        const 峰强 = [0.018, 0.024, 0.016];
        let 分 = 0;
        峰位.forEach((中, 序) => { 分 += 峰强[序] * 尖(u, 中, 0.052); });
        const 毛 = 0.0013 * Math.sin(v * 0.11 + 相位 * 3) + 0.0007 * Math.sin(v * 0.23 + 1.7);
        return (0.062 * 圆 + 分 + 毛) * 对角;
      },
      分界: (t, 名, 弦长, 波浪, 对角) => {
        const 更毛 = 0.0006 * 对角 * Math.sin(t * 弦长 * 0.032 + 波浪.相位[名]) * 包络(t);
        return 笔意(t, 名, 弦长, 波浪, 对角) + 更毛;
      }
    }
  };

  function 数串(p) {
    return p[0].toFixed(2) + " " + p[1].toFixed(2);
  }

  function 取两端(定, 宽, 高) {
    if (定.起点 && 定.终点) {
      return [
        [宽 * 定.起点.x比例, 高 * 定.起点.y比例],
        [宽 * 定.终点.x比例, 高 * 定.终点.y比例]
      ];
    }
    return [[0, 高 * 定.左y比例], [宽 * 定.顶x比例, 0]];
  }

  function 边序(p, 宽, 高) {
    const x = Math.min(宽, Math.max(0, p[0]));
    const y = Math.min(高, Math.max(0, p[1]));
    const 距 = [Math.abs(p[1]), Math.abs(p[0] - 宽), Math.abs(p[1] - 高), Math.abs(p[0])];
    const 最小 = Math.min(...距);
    if (最小 === 距[0]) return x;
    if (最小 === 距[1]) return 宽 + y;
    if (最小 === 距[2]) return 宽 + 高 + (宽 - x);
    return 2 * 宽 + 高 + (高 - y);
  }

  function 沿边中点(a, b, 宽, 高) {
    const 周长 = 2 * (宽 + 高);
    const ua = 边序(a, 宽, 高);
    const ub = 边序(b, 宽, 高);
    const 顺 = (ub - ua + 周长) % 周长;
    const 逆 = (ua - ub + 周长) % 周长;
    const 角表 = [
      { u: 0, p: [0, 0] },
      { u: 宽, p: [宽, 0] },
      { u: 宽 + 高, p: [宽, 高] },
      { u: 2 * 宽 + 高, p: [0, 高] },
      { u: 周长, p: [0, 0] }
    ];
    if (顺 <= 逆) {
      return 角表.filter((c) => c.u > ua + 1e-6 && c.u < ua + 顺 - 1e-6).map((c) => c.p);
    }
    return 角表.filter((c) => c.u < ua - 1e-6 && c.u > ua - 逆 + 1e-6).map((c) => c.p).reverse();
  }

  function 光滑段(点) {
    let 串 = "";
    const n = 点.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = 点[Math.max(0, i - 1)];
      const p1 = 点[i];
      const p2 = 点[i + 1];
      const p3 = 点[Math.min(n - 1, i + 2)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      串 += "C" + c1x.toFixed(2) + " " + c1y.toFixed(2) + " " + c2x.toFixed(2) + " " + c2y.toFixed(2) + " " + p2[0].toFixed(2) + " " + p2[1].toFixed(2);
    }
    return 串;
  }

  function 采贝塞尔(控点, 每) {
    const 点 = [];
    for (const 段 of 控点) {
      for (let i = 0; i <= 每; i++) {
        const t = i / 每;
        const mt = 1 - t;
        const a = mt * mt * mt;
        const b = 3 * mt * mt * t;
        const c = 3 * mt * t * t;
        const d = t * t * t;
        点.push([
          a * 段[0][0] + b * 段[1][0] + c * 段[2][0] + d * 段[3][0],
          a * 段[0][1] + b * 段[1][1] + c * 段[2][1] + d * 段[3][1]
        ]);
      }
    }
    return 点;
  }

  function 曲线控制(点串) {
    const 出 = [];
    const n = 点串.length - 1;
    for (let i = 0; i < n; i++) {
      const p0 = 点串[Math.max(0, i - 1)];
      const p1 = 点串[i];
      const p2 = 点串[i + 1];
      const p3 = 点串[Math.min(n, i + 2)];
      出.push([
        p1,
        [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
        [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
        p2
      ]);
    }
    return 出;
  }

  function 地块多边形(键, 甲乙, 乙丙, 宽, 高, 缝) {
    const 平移 = (点串, 法, 倍) => 点串.map((p) => [p[0] + 法[0] * 倍, p[1] + 法[1] * 倍]);
    const 折线 = (a, b, 分) => {
      const 出 = [];
      for (let i = 0; i <= 分; i++) {
        const t = i / 分;
        出.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
      return 出;
    };
    const 连边 = (a, b, 分) => {
      const 站 = [a].concat(沿边中点(a, b, 宽, 高), [b]);
      const 出 = [];
      for (let i = 0; i < 站.length - 1; i++) 出.push(...折线(站[i], 站[i + 1], 分));
      return 出;
    };
    if (键 === "甲") {
      const 点 = 采贝塞尔(曲线控制(平移(甲乙.点, 甲乙.法, 缝).reverse()), 6);
      return 连边([0, 0], 点[0], 8).concat(点.slice(1), 连边(点[点.length - 1], [0, 0], 8).slice(1));
    }
    if (键 === "乙") {
      const 上点 = 采贝塞尔(曲线控制(甲乙.点), 6);
      const 下点 = 采贝塞尔(曲线控制(乙丙.点.slice().reverse()), 6);
      return 上点.concat(
        连边(上点[上点.length - 1], 下点[0], 8).slice(1),
        下点.slice(1),
        连边(下点[下点.length - 1], 上点[0], 8).slice(1)
      );
    }
    const 点 = 采贝塞尔(曲线控制(平移(乙丙.点, 乙丙.法, -缝).reverse()), 6);
    return 点.concat(
      连边(点[点.length - 1], [宽, 高], 8).slice(1),
      连边([宽, 高], 点[0], 8).slice(1)
    );
  }

  function 建全部(宽, 高, 造型参数) {
    const 波浪 = Object.assign({}, 默认波浪, 造型参数 && 造型参数.波浪);
    波浪.前缘 = (造型参数 && 造型参数.波浪 && 造型参数.波浪.前缘) || 默认波浪.前缘;
    波浪.分界 = (造型参数 && 造型参数.波浪 && 造型参数.波浪.分界) || 默认波浪.分界;
    波浪.相位 = Object.assign({}, 默认波浪.相位, 造型参数 && 造型参数.波浪 && 造型参数.波浪.相位);
    const 锚 = Object.assign({}, 默认锚, 造型参数 && 造型参数.锚);
    const 方案名 = (造型参数 && 造型参数.方案) || "柳叶";
    const 方案 = 方案表[方案名] || 方案表.柳叶;
    const 段表 = (造型参数 && 造型参数.段) || [
      { 键: "甲", 方向: 1, 层: 2, 色: { 辉: "#f2c6d4", 起: "#2e1420", 止: "#5e2a44" } },
      { 键: "乙", 方向: 1, 层: 1, 色: { 辉: "#ffdfcf", 起: "#a34260", 止: "#eb9caa" } },
      { 键: "丙", 方向: -1, 层: 3, 色: { 辉: "#e8b3c2", 起: "#1f0a12", 止: "#7c2e48" } }
    ];

    const 对角 = Math.sqrt(宽 * 宽 + 高 * 高);
    const 轴 = { x: 宽 / 对角, y: -高 / 对角 };
    const 垂 = { x: -轴.y, y: 轴.x };
    const 波总幅 = 方案.幅 * 对角;
    const 边距 = 波总幅 * 1.35 + 波浪.边距 * 对角;
    const v跨 = 垂.x * 宽 + 垂.y * 高;
    const 尺度 = 对角 / 1700;
    const 外扩 = 波浪.外扩 * 尺度;
    const 框余 = 波浪.框余 * 尺度;

    function 采前缘(键, 轴向量) {
      const 点 = [];
      const s表 = [];
      const 细步 = 方案.细步;
      for (let v = -外扩; v <= v跨 + 外扩; v += 细步) {
        let s = 方案.笔头(v, v / v跨, 波浪.相位[键], 波浪, 对角, v跨);
        if (方案.毛边) s += 毛边(v, 波浪.相位[键], 对角);
        点.push([垂.x * v + 轴向量.x * s, 垂.y * v + 轴向量.y * s]);
        s表.push({ v, s });
      }
      return { 点, s表 };
    }

    function 分界波(t, 名, 弦长) {
      return 方案.分界(t, 名, 弦长, 波浪, 对角);
    }

    function 采分界(名) {
      const 两端 = 取两端(锚[名], 宽, 高);
      const dx = 两端[1][0] - 两端[0][0];
      const dy = 两端[1][1] - 两端[0][1];
      const 弦长 = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / 弦长;
      const ny = dx / 弦长;
      const n = Math.max(14, Math.round(弦长 / 方案.分界步长));
      const 点 = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const 偏 = 分界波(t, 名, 弦长);
        点.push([两端[0][0] + dx * t + nx * 偏, 两端[0][1] + dy * t + ny * 偏]);
      }
      return { 点, 法: [nx, ny], 弦长, 两端 };
    }

    function 地块路径(键, 甲乙, 乙丙) {
      const 缝 = 波浪.压缝;
      const 连 = (a, b) => 沿边中点(a, b, 宽, 高).map((p) => "L" + 数串(p)).join("");
      if (键 === "甲") {
        const 曲 = 甲乙.点.map((p) => [p[0] + 甲乙.法[0] * 缝, p[1] + 甲乙.法[1] * 缝]).reverse();
        return "M0 0" + 连([0, 0], 曲[0]) + "L" + 数串(曲[0]) + 光滑段(曲) + 连(曲[曲.length - 1], [0, 0]) + "Z";
      }
      if (键 === "乙") {
        const 曲A = 甲乙.点;
        const 曲D = 乙丙.点.slice().reverse();
        return "M" + 数串(曲A[0]) + 光滑段(曲A) +
          连(曲A[曲A.length - 1], 曲D[0]) + "L" + 数串(曲D[0]) + 光滑段(曲D) +
          连(曲D[曲D.length - 1], 曲A[0]) + "Z";
      }
      const 曲D = 乙丙.点.map((p) => [p[0] - 乙丙.法[0] * 缝, p[1] - 乙丙.法[1] * 缝]).reverse();
      return "M" + 数串(曲D[0]) + 光滑段(曲D) +
        连(曲D[曲D.length - 1], [宽, 高]) + "L" + 数串([宽, 高]) +
        连([宽, 高], 曲D[0]) + "Z";
    }

    const 甲乙 = 采分界("甲乙");
    const 乙丙 = 采分界("乙丙");
    const 段结果 = [];

    段表.forEach((配置) => {
      const ax = 轴.x * 配置.方向;
      const ay = 轴.y * 配置.方向;
      const 轴向量 = { x: ax, y: ay };
      const 地块线 = 地块多边形(配置.键, 甲乙, 乙丙, 宽, 高, 波浪.压缝);
      const 边样本 = 地块线;

      let amin = Infinity;
      let amax = -Infinity;
      let 质心x = 0;
      let 质心y = 0;
      边样本.forEach((p) => {
        const a = p[0] * ax + p[1] * ay;
        if (a < amin) amin = a;
        if (a > amax) amax = a;
        质心x += p[0];
        质心y += p[1];
      });
      质心x /= 边样本.length;
      质心y /= 边样本.length;

      const B = amax - amin + 2 * 边距 + 波浪.加长 * 尺度;

      const 采 = 采前缘(配置.键, 轴向量);
      const 前缘点 = 采.点;
      const 全点 = 前缘点.concat(前缘点.map((p) => [p[0] + ax * B, p[1] + ay * B]));

      let minx = Infinity;
      let miny = Infinity;
      let maxx = -Infinity;
      let maxy = -Infinity;
      全点.forEach((p) => {
        if (p[0] < minx) minx = p[0];
        if (p[0] > maxx) maxx = p[0];
        if (p[1] < miny) miny = p[1];
        if (p[1] > maxy) maxy = p[1];
      });

      const 盒 = {
        x: minx - 框余,
        y: miny - 框余,
        w: maxx - minx + 框余 * 2,
        h: maxy - miny + 框余 * 2
      };

      const 局2 = 前缘点.map((p) => [p[0] - 盒.x, p[1] - 盒.y]);
      const 局1 = 局2.map((p) => [p[0] + ax * B, p[1] + ay * B]);
      const 尾沿 = 局1;
      const 绸带路径 = "M" + 数串(局2[0]) + 光滑段(局2) + "L" + 数串(尾沿[尾沿.length - 1]) + 光滑段(尾沿.slice().reverse()) + "Z";

      let 地umin = Infinity;
      let 地umax = -Infinity;
      地块线.forEach((p) => {
        const u = p[0] * ax + p[1] * ay;
        if (u < 地umin) 地umin = u;
        if (u > 地umax) 地umax = u;
      });

      const 前缘u低 = Math.min(...前缘点.map((p) => p[0] * ax + p[1] * ay));
      const 前缘u高 = Math.max(...前缘点.map((p) => p[0] * ax + p[1] * ay));
      const 余 = 8;
      const 定盖k = 地umin - 前缘u高 - 余;
      const 定隐k = 地umax - 前缘u低 + 余;

      const aLen = 盒.w * Math.abs(ax) + 盒.h * Math.abs(ay);
      const a中 = ax * (盒.x + 盒.w / 2) + ay * (盒.y + 盒.h / 2);
      const 占比 = (a) => ((a - (a中 - aLen / 2)) / aLen) * 100;
      const 身起 = B - (amax - amin);
      const 身止 = B;
      const 角度 = (Math.atan2(ax, -ay) * 180) / Math.PI;
      const 色 = 配置.色;

      const 焦 = 调色(色.起, 0.82);
      const 淡 = 调色(色.止, 1.35);
      const 渐变串 = "linear-gradient(" + 角度.toFixed(2) + "deg, " +
        色.辉 + " " + 占比(0).toFixed(2) + "%, " +
        焦 + " " + 占比(身起 * 0.22).toFixed(2) + "%, " +
        色.起 + " " + 占比(身起 * 0.62).toFixed(2) + "%, " +
        色.止 + " " + 占比(身止).toFixed(2) + "%, " +
        淡 + " " + 占比(B * 0.94).toFixed(2) + "%, " +
        色.辉 + " " + 占比(B).toFixed(2) + "%)";

      段结果.push({
        配置,
        键: 配置.键,
        方向: 配置.方向,
        层: 配置.层,
        色: 配置.色,
        地块路径: 地块路径(配置.键, 甲乙, 乙丙),
        轮廓点: 地块线,
        绸带路径,
        盒,
        轴向量,
        amin,
        amax,
        B,
        盖k: 定盖k,
        隐k: 定隐k,
        隐: { x: ax * 定隐k, y: ay * 定隐k },
        盖: { x: ax * 定盖k, y: ay * 定盖k },
        质心u: 质心x * 轴.x + 质心y * 轴.y,
        渐变串,
        角度,
        深串: 分量(色.起).map((值) => Math.round(值 * 0.75)).join(","),
        浅串: 取分量串(色.辉),
        前缘剖面: 采.s表.filter((项) => 项.v >= 0 && 项.v <= v跨).map((项) => ({ 比: 项.v / v跨, 偏: 项.s / 对角 })),
        地umin,
        地umax
      });
    });

    const 升序 = 段结果.map((段, 序) => ({ 序, u: 段.质心u })).sort((a, b) => a.u - b.u);
    const 入场次序 = [升序[0].序, 升序[2].序, 升序[1].序];
    const 退场次序 = [升序[1].序, 升序[2].序, 升序[0].序];

    return {
      宽,
      高,
      对角,
      轴,
      垂,
      波总幅,
      边距,
      v跨,
      分界: { 甲乙, 乙丙 },
      段: 段结果,
      入场次序,
      退场次序,
      波浪参数: 波浪,
      锚,
      方案名,
      方案
    };
  }

export { 建全部, 默认波浪, 默认锚, 方案表 };
