#include <common>
#include <uv_pars_vertex>
#include <lights_pars_begin>
#include <shadowmap_pars_vertex>
varying vec3 vNormal;varying vec3 vWorldNormal;varying vec3 vWorldPos;varying vec3 vViewPosition;void main(){
#include <uv_vertex>
#include <beginnormal_vertex>
#include <defaultnormal_vertex>
#include <begin_vertex>
#include <worldpos_vertex>
vNormal=transformedNormal;vWorldNormal=normalize((modelMatrix*vec4(normal,0.0)).xyz);vWorldPos=(modelMatrix*vec4(position,1.0)).xyz;vec4 mvPosition=modelViewMatrix*vec4(position,1.0);vViewPosition=-mvPosition.xyz;
#include <shadowmap_vertex>
gl_Position=projectionMatrix*mvPosition;}