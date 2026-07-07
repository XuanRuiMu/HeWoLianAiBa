varying vec3 vGrassColor;
#include <fog_pars_fragment>
void main(){gl_FragColor=vec4(vGrassColor,1.0);
#include <fog_fragment>
#include <tonemapping_fragment>
#include <colorspace_fragment>
}