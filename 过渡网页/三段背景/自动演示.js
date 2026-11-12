const 配置 = {
  自动播放延迟: 500,
  单次演示时长: 4200,
  甲视图标识: "viewA",
  至乙按钮标识: "btnToB",
  至甲按钮标识: "btnToA",
  重播按钮标识: "replayBtn",
  隐藏类名: "is-hidden",
  演示中透明度: 0.4,
  空闲透明度: 1
};

const 甲视图 = document.getElementById(配置.甲视图标识);
const 至乙按钮 = document.getElementById(配置.至乙按钮标识);
const 至甲按钮 = document.getElementById(配置.至甲按钮标识);
const 重播按钮 = document.getElementById(配置.重播按钮标识);

let 演示中 = false;

function 锁定() {
  演示中 = true;
  重播按钮.disabled = true;
  重播按钮.style.opacity = 配置.演示中透明度;
}

function 解锁() {
  演示中 = false;
  重播按钮.disabled = false;
  重播按钮.style.opacity = 配置.空闲透明度;
}

function 播放一次() {
  if (演示中) return;
  锁定();
  const 目标按钮 = 甲视图.classList.contains(配置.隐藏类名) ? 至甲按钮 : 至乙按钮;
  目标按钮.click();
  window.setTimeout(解锁, 配置.单次演示时长);
}

window.addEventListener("load", () => window.setTimeout(播放一次, 配置.自动播放延迟), { once: true });
重播按钮.addEventListener("click", 播放一次);
