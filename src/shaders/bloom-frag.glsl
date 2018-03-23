#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;

uniform float u_Time;
uniform vec2 u_screenSize;

void main()
{	
	vec4 uScale = vec4(2.5);
	vec4 uBias = vec4(-1.2);
	vec4 sceneColor = texture(u_frame, vec2(fs_UV.x, 1.0 - fs_UV.y));

	out_Col = max(vec4(0.0), pow( smoothstep(vec4(0.0), vec4(1.25), sceneColor), vec4(4.0))) * uScale;
	
	out_Col.w = 1.0;
}