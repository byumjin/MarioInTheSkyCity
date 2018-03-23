#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Color;

uniform sampler2D u_frame; 
uniform sampler2D u_frame2; //ShadowMap
uniform sampler2D u_depthMap;

uniform mat4 u_shadowViewProj;
uniform mat4 u_invViewProj;

uniform vec2 u_screenSize;

// Render R, G, and B channels individually
void main() {

    vec4 normal_WS = texture(u_frame, fs_UV);
    out_Color = vec4(fs_UV, 0.0, 1.0);// normal_WS;
    return;

	float depth = normal_WS.w;

    vec2 ndc = vec2(fs_UV.x * 2.0 - 1.0, fs_UV.y*2.0 - 1.0);
	vec4 worldPos =  u_invViewProj* vec4(ndc, depth, 1.0);
	worldPos /= worldPos.w;

	//out_Color = texture(u_frame, fs_UV);
	//return;

}
