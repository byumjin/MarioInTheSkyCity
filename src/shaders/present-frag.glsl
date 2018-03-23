#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform float u_Time;


void main() {
	
	out_Col = texture(u_frame, fs_UV);
}
