#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform float u_Time;
uniform vec2 u_screenSize;

float offset[5];
float weight[5];

void main()
{	
	offset[0] = 0.0; offset[1] = 1.3846153846; offset[2] = 3.2307692308;
	weight[0] = 0.2270270270; weight[1] =  0.3162162162; weight[2] = 0.0702702703;

	//offset[0] = 0.0; offset[1] = 1.0; offset[2] = 2.0; offset[3] = 3.0; offset[4] = 4.0;
	//weight[0] = 0.2270270270; weight[1] =  0.1945945946; weight[2] = 0.1216216216; weight[3] = 0.0540540541; weight[4] = 0.0162162162;

	//offset[0] = 0.00000000;    offset[1] = 1.41176471;    offset[2] = 3.29411765;    offset[3] = 5.17647059;    offset[4] = 7.05882353;
	//weight[0] = 0.19638062;    weight[1] = 0.29675293;    weight[2] = 0.09442139;    weight[3] = 0.01037598;    weight[4] = 0.00025940;

	out_Col = texture( u_frame, fs_UV ) * weight[0];
    for (int i=1; i<3; i++)
	{
        out_Col += texture( u_frame, ( vec2(fs_UV)+vec2(0.0, offset[i] / u_screenSize.y) )) * weight[i];
        out_Col += texture( u_frame, ( vec2(fs_UV)-vec2(0.0, offset[i] / u_screenSize.y) )) * weight[i];
    }	

	out_Col = clamp(out_Col, 0.0, 1.0);
	out_Col.w = 1.0;
}