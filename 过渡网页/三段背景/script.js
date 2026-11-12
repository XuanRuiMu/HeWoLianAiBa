document.addEventListener("DOMContentLoaded", () => {
  const 带子 = document.querySelectorAll(".col-strip");
  const 甲页 = document.getElementById("viewA");
  const 乙页 = document.getElementById("viewB");
  const 去乙 = document.getElementById("btnToB");
  const 去甲 = document.getElementById("btnToA");
  const 节奏 = {
    入场时长: 0.7,
    入场间隔: 0.32,
    铺满停留: 0.66,
    换页时机: 0.45,
    退场时长: 0.7,
    退场间隔: 0.28,
    新页显现时长: 0.5,
    新页显现错开: 0.08,
  };
  let 演示中 = false;

  function 取方向(带) {
    return 带.getAttribute("data-dir") === "down" ? -100 : 100;
  }

  function 归位() {
    带子.forEach(带 => gsap.set(带, { yPercent: 取方向(带) }));
  }

  function 播放(旧页, 新页) {
    if (演示中) return;
    演示中 = true;
    归位();
    const 入场结束 = 节奏.入场时长 + 节奏.入场间隔 * (带子.length - 1);
    const 退场起点 = 入场结束 + 节奏.铺满停留;
    const 时间线 = gsap.timeline({ onComplete: () => { 演示中 = false; } });

    带子.forEach((带, 序) => {
      时间线.to(带, {
        yPercent: 0,
        duration: 节奏.入场时长,
        ease: "power3.inOut"
      }, 序 * 节奏.入场间隔);
    });

    时间线.add(() => {
      旧页.classList.add("is-hidden");
      新页.classList.remove("is-hidden");
      gsap.set(新页.children, { y: 25, opacity: 0 });
    }, 入场结束 + 节奏.铺满停留 * 节奏.换页时机);

    带子.forEach((带, 序) => {
      时间线.to(带, {
        yPercent: -取方向(带),
        duration: 节奏.退场时长,
        ease: "power3.inOut"
      }, 退场起点 + 序 * 节奏.退场间隔);
    });

    时间线.to(新页.children, {
      y: 0,
      opacity: 1,
      duration: 节奏.新页显现时长,
      stagger: 节奏.新页显现错开,
      ease: "power2.out"
    }, 退场起点 + 节奏.退场间隔);
  }

  归位();
  去乙.addEventListener("click", () => 播放(甲页, 乙页));
  去甲.addEventListener("click", () => 播放(乙页, 甲页));
});
