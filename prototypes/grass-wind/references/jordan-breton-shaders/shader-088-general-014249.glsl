
	precision highp float;
	varying vec2 vUv;
	uniform sampler2D tSource;
	void main() {
		gl_FragColor = texture2D(tSource, vUv);
	}
