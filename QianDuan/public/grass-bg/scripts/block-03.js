
        /* 真正删除（从 DOM 移除，而非隐藏）：设置齿轮/面板、声音按钮、360°游览、视角热点。
           以上由 bundle 在事件后创建，用 MutationObserver 出现即删。跳过 .loading 内的 Start 按钮。 */
        (function () {
            var REMOVE = ['.settings-icon', '.settings-panel', '.sound-icon', '.tour-button'];
            function removeSel(sel) {
                var nodes = document.querySelectorAll(sel);
                for (var i = 0; i < nodes.length; i++) {
                    var n = nodes[i];
                    if (n && n.parentNode) { try { n.parentNode.removeChild(n); } catch (e) {} }
                }
            }
            function sweep() {
                for (var s = 0; s < REMOVE.length; s++) removeSel(REMOVE[s]);
                var pts = document.querySelectorAll('.circle-container');
                for (var i = 0; i < pts.length; i++) {
                    var p = pts[i];
                    if (p.closest && p.closest('.loading')) continue;
                    if (p.parentNode) { try { p.parentNode.removeChild(p); } catch (e) {} }
                }
            }
            if (document.readyState !== 'loading') sweep();
            var mo = new MutationObserver(function () { sweep(); });
            mo.observe(document.documentElement, { childList: true, subtree: true });
            var t = setInterval(sweep, 300);
            setTimeout(function () { clearInterval(t); }, 8000);
        })();
    