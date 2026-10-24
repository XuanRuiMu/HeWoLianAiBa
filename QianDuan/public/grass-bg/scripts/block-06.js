
        /* 缓慢移除滤镜、露出真实金色草地背景：
           原生 reveal 被 swarmReady 卡死（生产环境 swarm 永不就绪），故在此手动触发完整 reveal：
           - revealMesh.startReveal() 让卷须/描边辉光（uRevealProgress）0→1 淡出；
           - postProcessing.startReveal() 让 line-glow 水体揭示（uProgress）0→1 淡出；
           两者淡出后即露出底层真实金色草地。开场滤镜为紫色（bundle 中 lineGlowColor/glowColor=#b07be0），
           随 reveal 渐隐，并非改色。引擎就绪(__dcm)且 reveal 方法可用后再延时触发，硬兜底 15s。 */
        (function () {
            var done = false, scheduled = false;
            function ready() {
                var e = window.__experience;
                return !!(e && e.revealMesh && e.revealMesh.startReveal &&
                          e.postProcessing && e.postProcessing.startReveal);
            }
            function fire() {
                if (done || !ready()) return;
                try {
                    window.__experience.revealMesh.startReveal();
                    window.__experience.postProcessing.startReveal();
                } catch (e) { scheduled = false; return; }
                done = true;
            }
            function loop() {
                if (done || scheduled) return;
                if (window.__dcm && ready()) { scheduled = true; setTimeout(fire, 2000); }
                else setTimeout(loop, 300);
            }
            loop();
            setTimeout(function () { if (!done) fire(); }, 15000);
        })();
    