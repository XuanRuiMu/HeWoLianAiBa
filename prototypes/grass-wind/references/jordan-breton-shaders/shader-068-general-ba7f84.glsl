#include <fog_pars_fragment>
uniform sampler2D uTexture;uniform vec3 uColor;varying vec2 vUv;void main(){vec4 color=texture(uTexture,vUv);float alpha=smoothstep(1.0,0.0,color.r)*color.a;alpha+=color.r;if(alpha<=0.0){discard;}vec4 finalColor=vec4(color.rgb*uColor*50.0,alpha);gl_FragColor=finalColor;
#include <fog_fragment>
}