
				uniform sampler2D uSceneTexture;
				uniform sampler2D uAuroraTexture;
				uniform sampler2D uDepthTexture;
				uniform float uCameraNear;
				uniform float uCameraFar;
				varying vec2 vUv;

				float linearizeDepth(float depth) {
					return uCameraNear * uCameraFar / (uCameraFar - depth * (uCameraFar - uCameraNear));
				}

				void main() {
					vec4 scene = texture2D(uSceneTexture, vUv);
					vec4 aurora = texture2D(uAuroraTexture, vUv);

					// Full-resolution depth masking to avoid fringe artifacts
					float depth = texture2D(uDepthTexture, vUv).x;
					float linearDepth = linearizeDepth(depth);

					// Only show aurora where depth is at far plane (sky)
					float depthFadeStart = uCameraFar * 0.95;
					float depthFadeEnd = uCameraFar * 0.995;
					float depthMask = smoothstep(depthFadeStart, depthFadeEnd, linearDepth);

					// Additive blend with depth mask
					vec3 finalColor = scene.rgb + aurora.rgb * aurora.a * depthMask;
					gl_FragColor = vec4(finalColor, 1.0);
				}
			