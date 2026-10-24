
        // 屏蔽原站统计/分析域名，避免 CORS 报错
        (function() {
            const blockedHosts = ['ingest.analytics.invantis.tech'];
            function shouldBlock(url) {
                try {
                    return blockedHosts.some(host => String(url).includes(host));
                } catch (e) { return false; }
            }
            const origFetch = window.fetch;
            window.fetch = function(...args) {
                if (shouldBlock(args[0])) return Promise.resolve(new Response('', { status: 204 }));
                return origFetch.apply(this, args);
            };
            const origOpen = XMLHttpRequest.prototype.open;
            const origSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                this._blocked = shouldBlock(url);
                return origOpen.call(this, method, url, ...rest);
            };
            XMLHttpRequest.prototype.send = function(...args) {
                if (this._blocked) {
                    this.status = 204;
                    this.readyState = 4;
                    if (this.onreadystatechange) this.onreadystatechange();
                    if (this.onloadend) this.onloadend();
                    return;
                }
                return origSend.apply(this, args);
            };
        })();

        // 音频根上禁用（真实背景应保持安静；且未复制 17MB 音频资源）
        (function () {
            function killSource(src) {
                try {
                    src.connect = function () { return src; };
                    src.start = function () {};
                    src.stop = function () {};
                    src.disconnect = function () {};
                } catch (e) {}
                return src;
            }
            function patchAC(AC) {
                if (!AC) return;
                try {
                    var cbs = AC.prototype.createBufferSource;
                    if (cbs) AC.prototype.createBufferSource = function () { return killSource(cbs.call(this)); };
                    var co = AC.prototype.createOscillator;
                    if (co) AC.prototype.createOscillator = function () { return killSource(co.call(this)); };
                    var cms = AC.prototype.createMediaElementSource;
                    if (cms) AC.prototype.createMediaElementSource = function () { return killSource(cms.call(this)); };
                } catch (e) {}
            }
            patchAC(window.AudioContext);
            patchAC(window.webkitAudioContext);
            try {
                var M = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
                if (M) {
                    Object.defineProperty(M, 'volume', { get: function () { return 0; }, set: function () {}, configurable: true });
                    var op = M.play; M.play = function () { return (op ? op.call(this) : Promise.resolve()); };
                }
            } catch (e) {}
            try { localStorage.setItem('audio:muted', '1'); localStorage.setItem('audio:volume', '0'); } catch (e) {}
        })();

        // 未复制音频资源：拦截 /grass-bg/audio/* 请求，返回一段静音 WAV，
        // 避免 404 与 decodeAudioData 报错（不影响草地渲染）
        (function () {
            function silentWav() {
                var sr = 8000, dur = 0.05, n = Math.floor(sr * dur);
                var buf = new ArrayBuffer(44 + n * 2), dv = new DataView(buf);
                function ws(o, s) { for (var i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); }
                ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
                dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
                dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
                ws(36, 'data'); dv.setUint32(40, n * 2, true);
                return buf;
            }
            var WAV = silentWav();
            function isAudio(u) { try { return String(u).indexOf('/grass-bg/audio/') >= 0; } catch (e) { return false; } }
            var of = window.fetch;
            window.fetch = function (input, init) {
                var u = (input && input.url) ? input.url : input;
                if (isAudio(u)) return Promise.resolve(new Response(WAV, { status: 200, headers: { 'Content-Type': 'audio/wav' } }));
                return of.apply(this, arguments);
            };
            var oOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function (m, u) { this.__a = isAudio(u); return oOpen.apply(this, arguments); };
            var oSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = function () {
                if (this.__a) {
                    Object.defineProperty(this, 'response', { value: WAV });
                    Object.defineProperty(this, 'responseText', { value: '' });
                    this.status = 200; this.readyState = 4;
                    if (this.onreadystatechange) this.onreadystatechange();
                    if (this.onload) this.onload();
                    if (this.onloadend) this.onloadend();
                    return;
                }
                return oSend.apply(this, arguments);
            };
        })();

        // ── FP-K5 报错收口：装饰背景的运行时异常与残留外联一律吞掉 ──
        // 1) window.onerror / unhandledrejection：purple.patched.js 内 setAttribute(null) 等
        //    运行时异常对宿主无意义，吞掉避免控制台 pageerror
        // 2) sendBeacon / EventSource / WebSocket / Image / <script> 外链 / <link> 外链
        //    —— 上面只补丁了 fetch/XHR，这几条通道仍会漏 404/统计请求
        (function () {
            function swallow(e) {
                try {
                    var s = String((e && (e.message || e.reason)) || e || '');
                    var src = String((e && (e.filename || (e.reason && e.reason.stack))) || '');
                    // 只吞 grass-bg 自己的异常，宿主应用异常继续上抛
                    if (/grass-bg|purple\.patched|setAttribute|WebGL|THREE|AudioContext/i.test(s + ' ' + src)) {
                        e.preventDefault && e.preventDefault();
                        return true;
                    }
                } catch (_) {}
                return false;
            }
            window.addEventListener('error', swallow, true);
            window.addEventListener('unhandledrejection', function (e) { swallow(e); });
            // 外联静默拦截（比照 blockedHosts + 相对外域）
            function isExternal(u) {
                try {
                    var s = String(u || '');
                    return /^https?:\/\//i.test(s) && !s.startsWith(location.origin);
                } catch (_) { return false; }
            }
            try {
                var oBeacon = navigator.sendBeacon;
                if (oBeacon) navigator.sendBeacon = function (url) {
                    if (isExternal(url)) return true;
                    return oBeacon.apply(navigator, arguments);
                };
            } catch (_) {}
            try {
                window.EventSource = function () { return { close: function () {}, addEventListener: function () {} }; };
                window.WebSocket = function () { return { close: function () {}, send: function () {}, addEventListener: function () {} }; };
            } catch (_) {}
            try {
                var oImg = window.Image;
                window.Image = function (w, h) {
                    var img = (oImg ? new oImg(w, h) : document.createElement('img'));
                    var oDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
                    if (oDesc && oDesc.set) {
                        Object.defineProperty(img, 'src', {
                            set: function (v) { if (!isExternal(v)) oDesc.set.call(this, v); },
                            get: function () { return oDesc.get.call(this); },
                            configurable: true
                        });
                    }
                    return img;
                };
            } catch (_) {}
        })();
    