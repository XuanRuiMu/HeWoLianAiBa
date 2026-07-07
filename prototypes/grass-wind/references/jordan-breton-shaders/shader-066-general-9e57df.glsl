uniform sampler2D map;uniform samplerCube envMap;uniform vec3 color;uniform float envMapIntensity;uniform float roughness;uniform float metalness;uniform float ambientIntensity;uniform float lightIntensity;uniform float envMapMaxMip;
#ifdef USE_TRIPLANAR
uniform float triplanarScale;uniform float triplanarSharpness;
#endif
varying vec3 vNormal;varying vec3 vWorldNormal;varying vec3 vWorldPos;varying vec3 vViewPosition;
#include <common>
#include <uv_pars_fragment>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#ifdef USE_TRIPLANAR
vec4 sampleTriplanar(sampler2D tex,vec3 worldPos,vec3 normal){vec3 blend=abs(normal);blend=pow(blend,vec3(triplanarSharpness));blend/=(blend.x+blend.y+blend.z);vec4 xProj=texture2D(tex,worldPos.yz*triplanarScale);vec4 yProj=texture2D(tex,worldPos.xz*triplanarScale);vec4 zProj=texture2D(tex,worldPos.xy*triplanarScale);return xProj*blend.x+yProj*blend.y+zProj*blend.z;}
#endif
float distributionGGX(float NdotH,float alpha){float a2=alpha*alpha;float denom=NdotH*NdotH*(a2-1.0)+1.0;return a2/(PI*denom*denom);}float visibilityGGX(float NdotV,float NdotL,float alpha){float a2=alpha*alpha;float GGXV=NdotL*sqrt(NdotV*NdotV*(1.0-a2)+a2);float GGXL=NdotV*sqrt(NdotL*NdotL*(1.0-a2)+a2);return 0.5/(GGXV+GGXL+0.0001);}vec3 fresnelSchlick(float cosTheta,vec3 f0){return f0+(1.0-f0)*pow(1.0-cosTheta,5.0);}vec3 fresnelSchlickRoughness(float cosTheta,vec3 f0,float r){vec3 f90=max(vec3(1.0-r),f0);return f0+(f90-f0)*pow(1.0-cosTheta,5.0);}void main(){
#ifdef USE_FLAT_SHADING
vec3 worldNormal=normalize(cross(dFdx(vWorldPos),dFdy(vWorldPos)));vec3 viewNormal=normalize(cross(dFdx(-vViewPosition),dFdy(-vViewPosition)));
#else
vec3 worldNormal=normalize(vWorldNormal);vec3 viewNormal=normalize(vNormal);
#endif
vec3 baseColor=color;
#ifdef USE_TRIPLANAR
vec4 sampledDiffuseColor=sampleTriplanar(map,vWorldPos,worldNormal);baseColor*=sampledDiffuseColor.rgb;
#elif defined(USE_MAP)
vec4 sampledDiffuseColor=texture2D(map,vMapUv);baseColor*=sampledDiffuseColor.rgb;
#endif
vec3 f0=mix(vec3(0.04),baseColor,metalness);float alpha=roughness*roughness;vec3 viewDirView=normalize(vViewPosition);float NdotV=clamp(dot(viewNormal,viewDirView),0.0,1.0);vec3 viewDirWorld=normalize(cameraPosition-vWorldPos);vec3 totalDiffuseLight=vec3(0.0);vec3 totalSpecularLight=vec3(0.0);
#if NUM_DIR_LIGHTS > 0
#pragma unroll_loop_start
for(int i=0;i<NUM_DIR_LIGHTS;i++){vec3 L=normalize(directionalLights[i].direction);float NdotL=clamp(dot(viewNormal,L),0.0,1.0);float shadow=1.0;
#ifdef USE_SHADOWMAP
DirectionalLightShadow directionalShadow=directionalLightShadows[i];float shadowNdotL=dot(worldNormal,L);float slopeBias=clamp(0.005*tan(acos(clamp(shadowNdotL,0.001,1.0))),0.0,0.02);vec4 biasedShadowCoord=vDirectionalShadowCoord[i];biasedShadowCoord.z-=slopeBias;shadow=getShadow(directionalShadowMap[i],directionalShadow.shadowMapSize,directionalShadow.shadowIntensity,directionalShadow.shadowBias,directionalShadow.shadowRadius,biasedShadowCoord);
#endif
shadow=max(shadow,0.35);vec3 radiance=directionalLights[i].color*shadow;vec3 H=normalize(L+viewDirView);float NdotH=clamp(dot(viewNormal,H),0.0,1.0);float HdotV=clamp(dot(H,viewDirView),0.0,1.0);float D=distributionGGX(NdotH,alpha);float V=visibilityGGX(NdotV,NdotL,alpha);vec3 F=fresnelSchlickRoughness(HdotV,f0,roughness);vec3 specular=D*V*F;vec3 kD=(1.0-F)*(1.0-metalness);totalDiffuseLight+=kD*radiance*NdotL;totalSpecularLight+=specular*radiance*NdotL;}
#pragma unroll_loop_end
#endif
#if NUM_POINT_LIGHTS > 0
vec3 viewPos=-vViewPosition;for(int i=0;i<NUM_POINT_LIGHTS;i++){vec3 L=normalize(pointLights[i].position-viewPos);float dist=length(pointLights[i].position-viewPos);float attenuation=1.0;if(pointLights[i].distance>0.0&&pointLights[i].decay>0.0){attenuation=pow(clamp(1.0-dist/pointLights[i].distance,0.0,1.0),pointLights[i].decay);}else{attenuation=1.0/(dist*dist);}float NdotL=clamp(dot(viewNormal,L),0.0,1.0);vec3 radiance=pointLights[i].color*attenuation;vec3 H=normalize(L+viewDirView);float NdotH=clamp(dot(viewNormal,H),0.0,1.0);float HdotV=clamp(dot(H,viewDirView),0.0,1.0);float D=distributionGGX(NdotH,alpha);float V=visibilityGGX(NdotV,NdotL,alpha);vec3 F=fresnelSchlickRoughness(HdotV,f0,roughness);vec3 specular=D*V*F;vec3 kD=(1.0-F)*(1.0-metalness);totalDiffuseLight+=kD*radiance*NdotL;totalSpecularLight+=specular*radiance*NdotL;}
#endif
vec3 envNormalDir=vec3(worldNormal.x,-worldNormal.y,worldNormal.z);float diffuseMipLevel=envMapMaxMip*0.7;vec3 envIrradiance=textureLod(envMap,envNormalDir,diffuseMipLevel).rgb;float worldNdotV=clamp(dot(worldNormal,viewDirWorld),0.0,1.0);vec3 ambientF=fresnelSchlickRoughness(worldNdotV,f0,roughness);vec3 ambientKd=(1.0-ambientF)*(1.0-metalness);vec3 ambient=ambientKd*envIrradiance*envMapIntensity*ambientIntensity;vec3 envSpecular=vec3(0.0);if(roughness<0.99){vec3 reflectDir=reflect(-viewDirWorld,worldNormal);reflectDir.y=-reflectDir.y;float specularMipLevel=roughness*roughness*envMapMaxMip;vec3 envReflection=textureLod(envMap,reflectDir,specularMipLevel).rgb;float reflectivity=1.0-roughness;envSpecular=envReflection*ambientF*reflectivity*envMapIntensity;}vec3 finalColor=baseColor*(totalDiffuseLight*lightIntensity+ambient)+totalSpecularLight*lightIntensity+envSpecular;gl_FragColor=vec4(finalColor,1.0);
#include <colorspace_fragment>
}