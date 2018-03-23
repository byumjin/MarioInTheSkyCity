#version 300 es
precision highp float;

in vec4 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_Col;
in vec2 fs_UV;

out vec4 out_Color; 

uniform mat4 u_Model;
uniform mat4 u_ViewProj;

float LinearDepth(float d)
{
	float f= 1000.0;
	float n = 0.1;
	return (2.0 * n) / (f + n - d * (f - n));
}

void main() {   

    vec4 POS = u_ViewProj * u_Model * vec4(fs_Pos.xyz, 1.0);

    out_Color = POS;
    //out_Color.z = -out_Color.z;
}
