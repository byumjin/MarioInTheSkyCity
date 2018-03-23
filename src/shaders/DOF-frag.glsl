#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform sampler2D u_frame2;
uniform sampler2D u_depthMap;

uniform mat4 u_InvProj;

uniform float u_Time;
uniform vec2 u_screenSize;
uniform vec4 u_DofParams;

float ComputeDepthBlur(float depth)
{
	float f;

	if (depth < u_DofParams.y)
	{
		f = (u_DofParams.y - depth) / (u_DofParams.y - u_DofParams.x);
	}
	else
	{
		f = (depth - u_DofParams.y) / (u_DofParams.z - u_DofParams.y);
		f *= u_DofParams.w;
	}

	f *= f;

	return clamp(f, 0.0, 1.0);
}

void main()
{	
	vec2 UV = vec2(fs_UV.x, 1.0 - fs_UV.y);

	vec4 sceneColor = texture(u_frame, UV);	
	vec4 blurredColor = texture(u_frame2, UV);	

	float depth = texture(u_depthMap, fs_UV).w;

	vec4 pos_VS = vec4(fs_UV.x * 2.0 - 1.0, (1.0 - fs_UV.y) * 2.0 - 1.0 , depth, 1.0);
	pos_VS = u_InvProj * pos_VS;
	pos_VS /= pos_VS.w;
	
	float d = ComputeDepthBlur(-pos_VS.z);	

	out_Col =  mix(sceneColor, blurredColor, d);
	out_Col.w = 1.0;
}