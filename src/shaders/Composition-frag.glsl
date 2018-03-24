#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame; // SceneImage
uniform sampler2D u_frame2; // Bloom
uniform sampler2D u_depthMap; // Godray;

uniform float u_Time;
uniform vec4 u_LightColor;

uniform vec4 u_LightDir; //x : uGhosts, y : uGhostDispersal, z : uDistortion, w : u_intensity

float fade(vec2 UV)
{
	vec2 NDC = UV * 2.0 - vec2(1.0);

	return clamp( 1.0 - max( pow( NDC.y * NDC.y, 4.0) , pow( NDC.x * NDC.x, 4.0)) , 0.0, 1.0); 
}

vec4 textureDistorted(sampler2D tex, sampler2D tex2, vec2 texcoord, vec2 direction, vec3 distortion)
  {
    return vec4
      (
        texture(tex, texcoord + direction * distortion.r).r + texture(tex2, texcoord + direction * distortion.r).r * 0.3,
        texture(tex, texcoord + direction * distortion.g).g + texture(tex2, texcoord + direction * distortion.g).g * 0.3,
        texture(tex, texcoord + direction * distortion.b).b + texture(tex2, texcoord + direction * distortion.b).b * 0.3,
        0.0
      ) * fade(texcoord);
  }



vec4 getLensFlare()
{

  vec2 texcoord = fs_UV;
  texcoord.y = 1.0 - texcoord.y;

  vec3 distortion = vec3( -u_LightColor.x * u_LightDir.z, 0.0,  u_LightColor.y * u_LightDir.z);
  
  // ghost vector to image centre:
  vec2 ghostVec = (vec2(0.5, 0.5) - texcoord) * u_LightDir.y;
  
  vec3 direction = normalize(vec3(ghostVec, 0.0));
  // sample ghosts:  
  vec4 result = vec4(0,0,0,0);
  vec4 ghost = vec4(0, 0, 0, 0);
  
  for (int i = 0; i < int(u_LightDir.x); ++i)
  {
    vec2 offset = fract(texcoord + ghostVec * float(i));
    ghost += textureDistorted(u_frame2, u_depthMap, offset, direction.xy, distortion);
  }

  float weightLens = length(vec2(0.5, 0.5) - texcoord) / length(vec2(0.5, 0.5));
  weightLens = pow( clamp(1.0 - clamp(weightLens, 0.0, 1.0), 0.0, 1.0), 3.0);
  weightLens *= 2.0;
  ghost *= weightLens;
  
  result += ghost;
  result *= 3.0;

  //fade
  result *= fade(texcoord);

  
  

  return result * u_LightDir.w;
}

void main()
{	
	vec4 uScale = vec4(0.75);
	vec4 uBias = vec4(-1.0);

  vec2 UV_SS = vec2(fs_UV.x, 1.0 - fs_UV.y);

	out_Col = texture(u_frame, UV_SS);

	if(u_LightColor.z > 0.5) //Bloom
		out_Col += texture(u_frame2, UV_SS);

	if(u_LightColor.w > 0.5) //Lens
		out_Col += getLensFlare();
  
  if(u_Time > 0.0) // Godray
    out_Col += texture(u_depthMap, UV_SS);
  

	out_Col.w = 1.0;
}