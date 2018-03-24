#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform vec4 u_godRayInfo; //x : exposure, y : decay, z : density, w : weight
uniform vec4 u_lightPos;

const int NUM_SAMPLES = 100;


void main() {

	vec2 lightPos_SS = (u_lightPos/u_lightPos.w).xy;

	lightPos_SS.x = (lightPos_SS.x + 1.0) * 0.5;
	lightPos_SS.y = (lightPos_SS.y + 1.0) * 0.5;
	
	vec2 deltaTextCoord = vec2( fs_UV - lightPos_SS.xy );
    vec2 textCoo = fs_UV;

	    
	deltaTextCoord *= 1.0 /  float(NUM_SAMPLES) * u_godRayInfo.z;
    
	float illuminationDecay = 1.0;	
	
    for(int i=0; i < NUM_SAMPLES ; i++)
    {
        textCoo -= deltaTextCoord;
        vec4 color = texture(u_frame, textCoo );
			
        color *= illuminationDecay * u_godRayInfo.w;
        out_Col += color;
        illuminationDecay *= u_godRayInfo.y;
    }

    out_Col *= u_godRayInfo.x * 0.5;
}
