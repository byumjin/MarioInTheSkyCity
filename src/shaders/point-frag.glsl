#version 300 es
precision highp float;

uniform sampler2D u_frame;
uniform float u_AspectRatio;

in vec4 fs_Col;
in vec4 fs_Pos;
in vec2 fs_UV;


layout(location = 0) out vec4 out_Color;

float fade(vec2 UV)
{
	vec2 NDC = UV * 2.0 - vec2(1.0);

	return clamp( 1.0 - max( pow( NDC.y * NDC.y, 4.0) , pow( NDC.x * NDC.x, pow( 4.0, u_AspectRatio ) )) , 0.0, 1.0); 
}

void main()
{    
   float dist;
   
   //BG particles     
   dist = clamp(1.0 - ( length(fs_Pos.xyz / fs_Pos.w)  * 2.0), 0.0, 1.0);
   
   out_Color = dist * texture(u_frame, vec2(fs_UV.x, fs_UV.y)) * 2.0;
   
   //fade Edge

   out_Color *= fade(fs_UV);
   out_Color.w = 1.0;
}
