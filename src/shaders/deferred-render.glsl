#version 300 es
precision highp float;

#define EPS 0.0001
#define PI 3.1415926535897932384626422832795028841971
#define TwoPi 6.28318530717958647692
#define InvPi 0.31830988618379067154
#define Inv2Pi 0.15915494309189533577
#define Inv4Pi 0.07957747154594766788

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_gb0;
uniform sampler2D u_gb1;
uniform sampler2D u_gb2;

uniform sampler2D u_depthMap;
uniform sampler2D u_envMap;
uniform sampler2D u_shadowMap;

uniform float u_Time;

uniform mat4 u_View;
uniform mat4 u_Proj;
uniform mat4 u_ViewProj;
uniform mat4 u_shadowViewProj;

uniform mat4 u_invViewProj;
uniform vec3 u_CamPos;   
uniform vec4 u_DofParams;

uniform vec4 u_LightColor;
uniform vec4 u_LightDir;

vec2 LightingFunGGX_FV(float dotLH, float roughness)
{
	float alpha = roughness*roughness;

	//F
	float F_a, F_b;
	float dotLH5 = pow(clamp(1.0f - dotLH, 0.0f, 1.0f), 5.0f);
	F_a = 1.0f;
	F_b = dotLH5;

	//V
	float vis;
	float k = alpha * 0.5f;
	float k2 = k*k;
	float invK2 = 1.0f - k2;
	vis = 1.0f/(dotLH*dotLH*invK2 + k2);

	return vec2((F_a - F_b)*vis, F_b*vis);
}

float LightingFuncGGX_D(float dotNH, float roughness)
{
	float alpha = roughness*roughness;
	float alphaSqr = alpha*alpha;
	float denom = dotNH * dotNH * (alphaSqr - 1.0f) + 1.0f;

	return alphaSqr / (PI*denom*denom);
}

vec3 GGX_Spec(vec3 Normal, vec3 HalfVec, float Roughness, vec3 BaseColor, vec3 SpecularColor, vec2 paraFV)
{
	float NoH = clamp(dot(Normal, HalfVec), 0.0, 1.0);

	float D = LightingFuncGGX_D(NoH * NoH * NoH * NoH, Roughness);
	vec2 FV_helper = paraFV;

	vec3 F0 = SpecularColor;
	vec3 FV = F0*FV_helper.x + vec3(FV_helper.y, FV_helper.y, FV_helper.y);
	
	return D * FV;
}



float LinearDepth(float d)
{
	float f= u_DofParams.w*0.1;
	float n = u_DofParams.x;
	return (2.0 * n) / (f + n - d * (f - n));
}

float SphericalTheta(vec3 v)
{
	return acos(clamp(v.y, -1.0f, 1.0f));
}

float SphericalPhi(vec3 v)
{
	float p = atan(v.z , v.x);
	return (p < 0.0f) ? (p + TwoPi) : p;
}

vec2 getEnvMapUV(vec3 reflectionVec)
{
    return vec2(SphericalPhi(reflectionVec) * Inv2Pi, SphericalTheta(reflectionVec) * InvPi);
}


void main() { 

	vec4 normal_WS = texture(u_gb0, fs_UV);

	float depth = normal_WS.w;

	vec2 ndc = vec2(fs_UV.x * 2.0 - 1.0, fs_UV.y*2.0 - 1.0);
	vec4 worldPos =  u_invViewProj* vec4(ndc, depth, 1.0);
	worldPos /= worldPos.w;

	
	vec4 shadowPos = u_shadowViewProj * worldPos;
	//shadowPos /= shadowPos.w;

	float shadowDepth = texture(u_shadowMap, vec2((shadowPos.x + 1.0) * 0.5, ( shadowPos.y + 1.0) * 0.5 )).z;
	

	//out_Col = shadowPos;
	//out_Col = texture(u_shadowMap, vec2(fs_UV.x, 1.0 - fs_UV.y) );
	//return;

	//BackGround
	if(depth >= 1.0)
	{
		vec3 reflecVec = normalize(worldPos.xyz - u_CamPos.xyz);
		out_Col = texture( u_envMap, getEnvMapUV(reflecVec) );
	}
	else
	{
		
		
		
		
		
		

		//vec4 LightInfo = vec4( normalize(vec3(10.0, 7.0, 5.0)), 1.0);

		// read from GBuffers
		vec4 specular = texture(u_gb1, fs_UV);
		vec4 albedo = texture(u_gb2, fs_UV);

		

		vec3 lightColor = vec3(1.0, 1.0, 1.0);

		float diffuseTerm = dot(normal_WS.xyz, u_LightDir.xyz);
		diffuseTerm = clamp(diffuseTerm, 0.0, 1.0);

		if(albedo.w < 0.5)
		{
			vec4 diffuseColor = vec4(albedo.xyz, 1.0);

			vec3 viewVec = normalize(u_CamPos.xyz - worldPos.xyz);
			vec3 halfVec = viewVec + u_LightDir.xyz;
			halfVec = normalize(halfVec);
			float LoH = clamp(dot( u_LightDir.xyz, halfVec ), 0.0, 1.0);

			vec3 specularTerm = vec3(0.0);
			vec3 SpecularColor = specular.xyz;
			float Roughness = specular.w;
			float energyConservation = 1.0 - Roughness;

			specularTerm = GGX_Spec(normal_WS.xyz, halfVec, Roughness, diffuseColor.xyz, SpecularColor, LightingFunGGX_FV(LoH, Roughness)) *energyConservation;

			//specularTerm = clamp(specularTerm, 0.0, 2.0);

			float ambientTerm = 0.1;

			vec4 pbrColor = vec4( (diffuseColor.rgb + SpecularColor * specularTerm) * (diffuseTerm + ambientTerm), diffuseColor.a);
				
			out_Col = pbrColor;	

			//shadow		
			if(shadowDepth < shadowPos.z - 0.0005)
			{
				out_Col.xyz *= 0.6;
			}	
		}
		//emissive
		else
		{
			out_Col = vec4(albedo.xyz * 1.5, 1.0);

			//shadow		
			if(shadowDepth < shadowPos.z - 0.0005)
			{
				out_Col.xyz *= 0.8;
			}
		}

		

		out_Col.xyz *= lightColor;

		vec4 fogColor = vec4( 0.02, 0.01, 0.02, 1.0);
		
		
		//Height Fog
		float alpha = clamp( (worldPos.y + 40.0) * 0.025, 0.0, 1.0);
		out_Col = mix(fogColor, out_Col, alpha);
		
		
	}


	
	out_Col.w = 1.0;
	
}