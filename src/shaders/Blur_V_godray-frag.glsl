#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform vec2 u_screenSize;

float offset[5];
float weight[5];

void main()
{	
	offset[0] = 0.0; offset[1] = 1.3846153846; offset[2] = 3.2307692308;
	weight[0] = 0.2270270270; weight[1] =  0.3162162162; weight[2] = 0.0702702703;

	float totalWeight = weight[0];
	out_Col = texture( u_frame, fs_UV )* weight[0];

    for (int i=1; i<3; i++)
	{
		vec2 localUV = fs_UV + vec2( 0.0, offset[i]  / u_screenSize.y);

		out_Col += texture( u_frame, localUV)* weight[i];
		totalWeight += weight[i];
		
		localUV = fs_UV - vec2( 0.0, offset[i]  / u_screenSize.y);

		out_Col += texture( u_frame, localUV)* weight[i];
		totalWeight += weight[i];
		 
    }

	out_Col /= totalWeight;

	out_Col = clamp(out_Col, 0.0, 1.0);
	out_Col.w = 1.0;
}