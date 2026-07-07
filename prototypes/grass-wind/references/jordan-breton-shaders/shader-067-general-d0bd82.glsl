#include <fog_pars_vertex>
uniform float uTime;uniform float uSize;varying vec2 vUv;void main(){vUv=uv;float index=1.0;float size=uSize;float time=uTime*2.0;float flapTime=radians(sin(time*4.0-length(position.xy)/size*2.0+index*2.0)*45.0+30.0);float hovering=cos(uTime*2.0+index*3.0)*size/16.0;vec3 updatePosition=vec3(cos(flapTime)*position.x,position.y+hovering,sin(flapTime)*abs(position.x)+hovering);vec4 mvPosition=modelViewMatrix*vec4(updatePosition,1.0);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}