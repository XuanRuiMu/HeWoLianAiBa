    var wuSkyOn = true, wuSkyI = 1, wuSkyMesh = null, wuSkyU = null, wuSkyNight = 0, wuSkyErr = null, wuSkyTickN = 0, wuSkyDistOn = false, wuSkySig = null;
    var WU_AUR_GLSL = "varying vec3 vWuDir;\nuniform sampler2D uWuNoise;\nuniform float uWuT;\nuniform float uWuAur;\nuniform float uWuInt;\nuniform float uWuAlt;\nfloat wuSampleAuroraNoise(vec2 p){\nvec2 noiseUV=p/20.0+0.5;\nvec4 noise=texture2D(uWuNoise,noiseUV);\nfloat shortStep=1.667;\nfloat longStep=5.0;\nfloat totalCycle=shortStep*3.0+longStep;\nfloat t=mod(uWuT,totalCycle);\nfloat n0,n1,blend;\nif(t<shortStep){n0=noise.r;n1=noise.g;blend=t/shortStep;}\nelse if(t<shortStep*2.0){n0=noise.g;n1=noise.b;blend=(t-shortStep)/shortStep;}\nelse if(t<shortStep*3.0){n0=noise.b;n1=noise.a;blend=(t-shortStep*2.0)/shortStep;}\nelse{n0=noise.a;n1=noise.r;blend=(t-shortStep*3.0)/longStep;}\nreturn mix(n0,n1,blend);}\nfloat wuHash21(in vec2 n){return fract(sin(dot(n,vec2(12.9898,4.1414)))*43758.5453);}\nvec4 wuAurora(vec3 ro,vec3 rd){\nvec4 col=vec4(0.0);\nvec4 avgCol=vec4(0.0);\nfloat stepSize=50.0/32.0;\nfor(float i=0.0;i<32.0;i++){\nfloat baseIdx=i*stepSize;\nfloat jitter=wuHash21(gl_FragCoord.xy+vec2(i*13.37,0.0))*stepSize;\nfloat idx=baseIdx+mod(jitter,stepSize);\nfloat of=0.006*wuHash21(gl_FragCoord.xy)*smoothstep(0.0,15.0,idx);\nfloat pt=((uWuAlt+pow(idx,1.4)*0.002)-ro.y)/(rd.y*2.0+0.4);\npt-=of;\nvec3 bpos=ro+pt*rd;\nvec2 p=bpos.zx;\nfloat rzt=wuSampleAuroraNoise(p);\nvec4 col2=vec4(0.0,0.0,0.0,rzt);\ncol2.rgb=(sin(1.0-vec3(2.15,-0.5,1.2)+idx*0.043)*0.5+0.5)*rzt;\navgCol=mix(avgCol,col2,0.5);\ncol+=avgCol*exp2(-idx*0.065-2.5)*smoothstep(0.0,5.0,idx)*stepSize;\n}\ncol*=clamp(rd.y*15.0+0.4,0.0,1.0);\nreturn col*1.8;}\nvec3 wuAuroraColor(vec3 rd){\nfloat horizonFade=smoothstep(0.0,0.15,rd.y);\nif(horizonFade<=0.0){return vec3(0.0);}\nvec4 aur=wuAurora(vec3(0.0),rd);\nreturn aur.rgb*uWuInt*aur.a*uWuAur*horizonFade;}\n";
function wuTri(x) {
  var f = x - Math.floor(x);
  return Math.min(0.49, Math.max(0.01, Math.abs(f - 0.5)));
}
function wuRot2(x, y, a) {
  var c = Math.cos(a), s = Math.sin(a);
  return [c * x - s * y, s * x + c * y];
}
function wuTriNoiseRaw(px, py, time) {
  var z = 1.8, z2 = 2.5, rz = 0.0;
  var r0 = wuRot2(px, py, px * 0.06);
  var p = [r0[0], r0[1]];
  var bp = [p[0], p[1]];
  for (var i = 0; i < 5; i++) {
    var ta = wuTri(bp[0] * 1.85), tb = wuTri(bp[1] * 1.85);
    var dg = [(ta + tb) * 0.75, wuTri(bp[1] * 1.85 + ta) * 0.75];
    dg = wuRot2(dg[0], dg[1], time * 0.2);
    p[0] -= dg[0] / z2;
    p[1] -= dg[1] / z2;
    bp[0] *= 1.3; bp[1] *= 1.3;
    z2 *= 0.45; z *= 0.42;
    var k = 1.21 + (rz - 1.0) * 0.02;
    p[0] *= k; p[1] *= k;
    rz += wuTri(p[0] + wuTri(p[1])) * z;
    var m = [0.95534 * p[0] - 0.29552 * p[1], 0.29552 * p[0] + 0.95534 * p[1]];
    var r1 = wuRot2(m[0], m[1], -1.0);
    p[0] = r1[0]; p[1] = r1[1];
  }
  return rz;
}
function wuTriNoise(px, py, time) {
  var rz = wuTriNoiseRaw(px, py, time);
  return Math.min(0.55, Math.max(0.0, 1.0 / Math.pow(Math.max(1e-6, rz) * 29.0, 1.3)));
}
function wuBakeAuroraNoise(size) {
  var cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  var cx = cv.getContext('2d');
  var img = cx.createImageData(size, size);
  var d = img.data, x, y, i4;
  for (y = 0; y < size; y++) {
    for (x = 0; x < size; x++) {
      var u = (x + 0.5) / size, v = (y + 0.5) / size;
      var px = (u - 0.5) * 20.0, py = (v - 0.5) * 20.0;
      i4 = (y * size + x) * 4;
      d[i4] = Math.round(wuTriNoise(px, py, 0.0) / 0.55 * 255);
      d[i4 + 1] = Math.round(wuTriNoise(px, py, 2.5) / 0.55 * 255);
      d[i4 + 2] = Math.round(wuTriNoise(px, py, 5.0) / 0.55 * 255);
      d[i4 + 3] = Math.round(wuTriNoise(px, py, 7.5) / 0.55 * 255);
    }
  }
  cx.putImageData(img, 0, 0);
  return cv;
}
    function wuSkyLightSig() {
      try {
        var mi = scene.getObjectByName('main-island');
        var u = mi && mi.material && mi.material.uniforms;
        var g = u && u.uGrassLightColor && u.uGrassLightColor.value;
        var li = (u && u.lightIntensity && u.lightIntensity.value) || 1;
        if (g) return [g.r * li, g.g * li, g.b * li];
      } catch (eL) { window.__wuSkyErr = String(eL && eL.message || eL); }
      return null;
    }
    function wuSkyBuild() {
      if (wuSkyMesh) return true;
      var TH = window.__THREE;
      if (!TH || !TH.Mesh || !TH.MeshBasicMaterial || !TH.CanvasTexture) return false;
      var skySrc = scene.getObjectByName('AnimeSky');
      if (!skySrc || !skySrc.geometry) return false;
      try {
        var nz = new TH.CanvasTexture(wuBakeAuroraNoise(256));
        nz.colorSpace = '';
        nz.needsUpdate = true;
        window.__wuSkyNoise = nz;
        wuSkyU = { uAmt: { value: 0 }, uT: { value: 0 }, uInt: { value: 1 }, uAlt: { value: 0.8 }, uNoise: { value: nz } };
        var mat = new TH.MeshBasicMaterial({ color: 0xffffff, side: 1, transparent: true, depthWrite: false, depthTest: true, blending: 2, fog: false });
        mat.onBeforeCompile = function (sh) {
          sh.uniforms.uWuNoise = wuSkyU.uNoise;
          sh.uniforms.uWuT = wuSkyU.uT;
          sh.uniforms.uWuAur = wuSkyU.uAmt;
          sh.uniforms.uWuInt = wuSkyU.uInt;
          sh.uniforms.uWuAlt = wuSkyU.uAlt;
          sh.vertexShader = 'varying vec3 vWuDir;\n' + sh.vertexShader;
          sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWuDir = normalize( ( modelMatrix * vec4( transformed, 1.0 ) ).xyz - cameraPosition );');
          sh.fragmentShader = WU_AUR_GLSL + sh.fragmentShader;
          sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'gl_FragColor = vec4( wuAuroraColor( normalize( vWuDir ) ), 1.0 );');
        };
        wuSkyMesh = new TH.Mesh(skySrc.geometry, mat);
        wuSkyMesh.name = 'wu-sky-aurora';
        wuSkyMesh.frustumCulled = false;
        wuSkyMesh.renderOrder = 5;
        wuSkyMesh.visible = false;
        wuSkyMesh.position.copy(skySrc.position);
        wuSkyMesh.quaternion.copy(skySrc.quaternion);
        wuSkyMesh.scale.copy(skySrc.scale).multiplyScalar(0.985);
        scene.add(wuSkyMesh);
        window.__wuSkyMesh = wuSkyMesh;
        return true;
      } catch (eA) {
        wuSkyErr = String(eA && eA.message || eA);
        window.__wuSkyErr = wuSkyErr;
        return false;
      }
    }
    function wuSkyDistant(show) {
      var n = 0;
      try {
        scene.traverse(function (o) {
          var nm = o && o.name;
          if (!nm || nm.indexOf('Distant') !== 0) return;
          o.visible = !!show;
          n++;
        });
      } catch (eD2) { window.__wuSkyErr = String(eD2 && eD2.message || eD2); }
      return n;
    }
    function wuSkyTick() {
      if (!wuSkyBuild()) return;
      wuSkyTickN++;
      var sig = wuSkyLightSig();
      if (sig) wuSkySig = sig;
      var night = wuSkyNight;
      if (wuSkySig) {
        var dn = (wuSkySig[2] - wuSkySig[0]) / (wuSkySig[2] + wuSkySig[0] + 1e-3);
        night = Math.min(1, Math.max(0, (dn + 0.20) / 0.45));
      }
      if (!wuSkyOn) night = 0;
      wuSkyNight += (night - wuSkyNight) * 0.05;
      wuSkyU.uAmt.value = wuSkyNight;
      wuSkyU.uInt.value = wuSkyI;
      if (wuSkyNight > 0.004) wuSkyU.uT.value = wuSkyU.uT.value + 0.016;
      wuSkyMesh.visible = wuSkyNight > 0.004;
      if ((wuSkyTickN % 30) === 1) wuSkyDistant(wuSkyDistOn);
    }
