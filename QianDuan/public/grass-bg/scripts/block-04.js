
        // 自动进入真实草地背景：资源加载完（Start 按钮带 .show）后点击，触发 intro 相机过渡。
        // 点击后 bundle 会给 .loading 加 .loaded（已被 CSS 隐藏）；并加硬兜底强制进入。
        (function () {
            var clicked = false;
            function hideLoading() {
                var l = document.querySelector('.loading');
                if (l) l.style.display = 'none';
            }
            function tryStart() {
                if (clicked) return;
                var btn = document.querySelector('.loading button');
                var circle = document.querySelector('.loading .circle-container');
                if (!circle) { setTimeout(tryStart, 200); return; }
                // 引擎就绪（window.__dcm 存在）或 Start 按钮带 .show 时即可揭示，不再死等按钮
                var ready = (btn && btn.classList.contains('show')) || window.__dcm;
                if (!ready) { setTimeout(tryStart, 200); return; }
                clicked = true;
                try { circle.click(); } catch (e) {}
                // 兜底：点击后若 loading 仍可见则强制隐藏
                setTimeout(function () {
                    var l = document.querySelector('.loading');
                    if (l && getComputedStyle(l).display !== 'none') hideLoading();
                }, 1200);
            }
            window.addEventListener('load', function () { setTimeout(tryStart, 400); });
            // 硬兜底：12s 仍卡在 loading 也强制进入（背景只是晚点到）
            setTimeout(function () {
                if (clicked) return;
                var circle = document.querySelector('.loading .circle-container');
                if (circle) { try { circle.click(); } catch (e) {} }
                hideLoading();
            }, 12000);
        })();
    