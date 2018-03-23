#version 300 es
precision highp float;

#define EPSILON 1e-10


uniform sampler2D u_frame;
uniform float u_Temperature;
uniform float u_ToneMapping;

float bloomCalculation(float x, float A, float B, float C, float D, float E, float F)
{
	return clamp((x/(A/x-C/B)-D/E) / pow(x/(A/x-B)-D/F+E*F, 0.001), 0.0, 1.0);
}

float gamma = 2.2;

vec3 linearToneMapping(vec3 color)
{
	float exposure = 1.;
	color = clamp(exposure * color, 0., 1.);
	color = pow(color, vec3(1. / gamma));
	return color;
}

vec3 simpleReinhardToneMapping(vec3 color)
{
	float exposure = 1.5;
	color *= exposure/(1. + color / exposure);
	color = pow(color, vec3(1. / gamma));
	return color;
}

vec3 lumaBasedReinhardToneMapping(vec3 color)
{
	float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
	float toneMappedLuma = luma / (1. + luma);
	color *= toneMappedLuma / luma;
	color = pow(color, vec3(1. / gamma));
	return color;
}

vec3 whitePreservingLumaBasedReinhardToneMapping(vec3 color)
{
	float white = 2.;
	float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
	float toneMappedLuma = luma * (1. + luma / (white*white)) / (1. + luma);
	color *= toneMappedLuma / luma;
	color = pow(color, vec3(1. / gamma));
	return color;
}

vec3 RomBinDaHouseToneMapping(vec3 color)
{
    color = exp( -1.0 / ( 2.72*color + 0.15 ) );
	color = pow(color, vec3(1. / gamma));
	return color;
}

vec3 filmicToneMapping(vec3 color)
{
	color = max(vec3(0.), color - vec3(0.004));
	color = (color * (6.2 * color + .5)) / (color * (6.2 * color + 1.7) + 0.06);
	return color;
}

vec3 ColorTemperatureToRGB(float temperatureInKelvins)
{
	vec3 retColor;
	
    temperatureInKelvins = clamp(temperatureInKelvins, 1000.0, 40000.0) / 100.0;
    
    if (temperatureInKelvins <= 66.0)
    {
        retColor.r = 1.0;
        retColor.g = clamp(0.39008157876901960784 * log(temperatureInKelvins) - 0.63184144378862745098, 0.0, 1.0);
    }
    else
    {
    	float t = temperatureInKelvins - 60.0;
        retColor.r = clamp(1.29293618606274509804 * pow(t, -0.1332047592), 0.0, 1.0);
        retColor.g = clamp(1.12989086089529411765 * pow(t, -0.0755148492), 0.0, 1.0);
    }
    
    if (temperatureInKelvins >= 66.0)
        retColor.b = 1.0;
    else if(temperatureInKelvins <= 19.0)
        retColor.b = 0.0;
    else
        retColor.b = clamp(0.54320678911019607843 * log(temperatureInKelvins - 10.0) - 1.19625408914, 0.0, 1.0);

    return retColor;
}

vec3 HUEtoRGB(float H)
{
    float R = abs(H * 6.0 - 3.0) - 1.0;
    float G = 2.0 - abs(H * 6.0 - 2.0);
    float B = 2.0 - abs(H * 6.0 - 4.0);
    return clamp(vec3(R,G,B), 0.0, 1.0);
}

vec3 HSLtoRGB(in vec3 HSL)
{
    vec3 RGB = HUEtoRGB(HSL.x);
    float C = (1.0 - abs(2.0 * HSL.z - 1.0)) * HSL.y;
    return (RGB - 0.5) * C + vec3(HSL.z);
}
 
vec3 RGBtoHCV(vec3 RGB)
{
    // Based on work by Sam Hocevar and Emil Persson
    vec4 P = (RGB.g < RGB.b) ? vec4(RGB.bg, -1.0, 2.0/3.0) : vec4(RGB.gb, 0.0, -1.0/3.0);
    vec4 Q = (RGB.r < P.x) ? vec4(P.xyw, RGB.r) : vec4(RGB.r, P.yzx);
    float C = Q.x - min(Q.w, Q.y);
    float H = abs((Q.w - Q.y) / (6.0 * C + EPSILON) + Q.z);
    return vec3(H, C, Q.x);
}

vec3 RGBtoHSL(vec3 RGB)
{
    vec3 HCV = RGBtoHCV(RGB);
    float L = HCV.z - HCV.y * 0.5;
    float S = HCV.y / (1.0 - abs(L * 2.0 - 1.0) + EPSILON);
    return vec3(HCV.x, S, L);
}

in vec2 fs_UV;
out vec4 out_Col;


void main()
 {
	vec2 UV = vec2(fs_UV.x, 1.0 - fs_UV.y);

	vec3 toneMappedColor = texture(u_frame, UV).xyz * ColorTemperatureToRGB(u_Temperature);

	if(u_ToneMapping < 0.5)
	{
		out_Col =  vec4(texture(u_frame, UV).xyz, 1.0);
	}
	else if(u_ToneMapping < 1.5)
	{
		out_Col = vec4( linearToneMapping(toneMappedColor), 1.0);
	}
	else if(u_ToneMapping < 2.5)
	{
		out_Col = vec4( simpleReinhardToneMapping(toneMappedColor), 1.0);
	}
	else if(u_ToneMapping < 3.5)
	{
		out_Col = vec4( lumaBasedReinhardToneMapping(toneMappedColor), 1.0);
	}
	else if(u_ToneMapping < 4.5)
	{
		out_Col = vec4( whitePreservingLumaBasedReinhardToneMapping(toneMappedColor), 1.0);
	}
	else if(u_ToneMapping < 5.5)
	{
		out_Col = vec4( RomBinDaHouseToneMapping(toneMappedColor), 1.0);
	}
	else if(u_ToneMapping < 6.5)
	{
		out_Col = vec4( filmicToneMapping(toneMappedColor), 1.0);
	}
}