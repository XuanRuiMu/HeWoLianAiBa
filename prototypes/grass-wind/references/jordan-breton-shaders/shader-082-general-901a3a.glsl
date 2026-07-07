#include <fog_pars_fragment>
uniform float uTime;uniform vec3 uLightDirection;uniform vec3 uFoamShadowColor;uniform vec3 uFoamColor;varying vec3 vNormal;void main(){vec3 color=uFoamColor;vec3 shadowColor=uFoamShadowColor;vec3 normal=normalize(vNormal);vec3 lightColor=vec3(1.0,1.0,1.0);float NdotL=dot(normalize(vNormal),normalize(uLightDirection));float lightIntensity=smoothstep(0.1,0.12,NdotL);vec3 directionalLight=lightColor*lightIntensity;vec3 dark=1.0-directionalLight;gl_FragColor=vec4(color*directionalLight+dark*shadowColor,1.0);
#include <fog_fragment>
}