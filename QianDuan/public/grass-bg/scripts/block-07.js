
        /* 鼠标划过草地的交互：
           草背景 iframe 设了 pointer-events:none 且压在内容之下，草的 canvas 收不到真实指针事件，
           导致引擎自带的 "bender"（弯曲贴图 brush）从不触发 —— 草对鼠标毫无反应。
           解决：把父页（App.vue）转发来的归一化光标 window.__cursor(-1..1) 还原成画布 client 坐标，
           向引擎 canvas 派发真实 pointermove，引擎 raycaster 会自行 raycast 地形并调用
           bender.onPointerMove(uv, worldPos)，草随光标弯曲；光标停下约 2.5s 后自动回正。
           同时给草/花材质保底 uBendingFactor，确保弯曲可见。 */
        (function () {
            var MAX_BEND = 0.7;
            function boostBending() {
                var exp = window.__experience; if (!exp) return;
                var sc = exp.scene || (exp.engine && exp.engine.scene);
                if (!sc || !sc.traverse) return;
                sc.traverse(function (o) {
                    var m = o.material; if (!m) return;
                    var list = Array.isArray(m) ? m : [m];
                    for (var i = 0; i < list.length; i++) {
                        var u = list[i].uniforms;
                        if (u && u.uBendingFactor && u.uBendingFactor.value < MAX_BEND) {
                            u.uBendingFactor.value = MAX_BEND;
                        }
                    }
                });
            }
            var lastX = null, lastY = null, frame = 0;
            function dispatchMove(c, rect) {
                var clientX = rect.left + (c.x * 0.5 + 0.5) * rect.width;
                var clientY = rect.top + (-c.y * 0.5 + 0.5) * rect.height;
                var ev;
                try {
                    ev = new PointerEvent('pointermove', {
                        clientX: clientX, clientY: clientY, pointerId: 1,
                        pointerType: 'mouse', bubbles: true, cancelable: true, view: window
                    });
                } catch (e) {
                    ev = new MouseEvent('pointermove', { clientX: clientX, clientY: clientY, bubbles: true });
                }
                try { window.__experience.engine.canvas.dispatchEvent(ev); } catch (e2) {}
            }
            function loop() {
                var exp = window.__experience;
                if (exp && exp.engine && exp.engine.canvas) {
                    if ((frame++ % 30) === 0) boostBending();
                    var c = window.__cursor;
                    if (c && (c.x !== lastX || c.y !== lastY)) {
                        lastX = c.x; lastY = c.y;
                        dispatchMove(c, exp.engine.canvas.getBoundingClientRect());
                    }
                }
                requestAnimationFrame(loop);
            }
            (function wait() {
                if (window.__experience && window.__experience.engine && window.__experience.engine.canvas) { loop(); return; }
                setTimeout(wait, 200);
            })();
        })();
    