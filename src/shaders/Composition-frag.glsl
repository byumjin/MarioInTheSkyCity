#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame; // SceneImage
uniform sampler2D u_frame2; // Bloom

uniform float u_Time;
uniform vec4 u_LightColor;

uniform vec4 u_LightDir; //x : uGhosts, y : uGhostDispersal, z : uDistortion, w : u_intensity


vec4 textureDistorted(sampler2D tex, vec2 texcoord, vec2 direction, vec3 distortion)
  {
    return vec4
      (
		texture(tex, texcoord + direction * distortion.r).r,
		texture(tex, texcoord + direction * distortion.g).g,
		texture(tex, texcoord + direction * distortion.b).b,
        0.0
      );
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
    ghost += textureDistorted(u_frame2, offset, direction.xy, distortion);
  }

  float weightLens = length(vec2(0.5, 0.5) - texcoord) / length(vec2(0.5, 0.5));
  weightLens = pow( clamp(1.0 - clamp(weightLens, 0.0, 1.0), 0.0, 1.0), 3.0);
  weightLens *= 2.0;
  ghost *= weightLens;
  

 
  // sample halo:
  /*
  float uHaloWidth = 0.5;
  vec2 haloVec = normalize(ghostVec) * uHaloWidth;
  float weight = length(vec2(0.5, 0.5) - fract(texcoord + haloVec)) / length(vec2(0.5, 0.5));
  
  weight = pow(1.0 - clamp(weight, 0.0, 1.0), 20.0);
  result = textureDistorted(u_frame2, texcoord + haloVec, direction.xy, distortion) *weight;
  */

  result += ghost;
  result *= 3.0;
  
  

  return result * u_LightDir.w;
}

void main()
{	
	vec4 uScale = vec4(0.75);
	vec4 uBias = vec4(-1.0);

	out_Col = texture(u_frame, vec2(fs_UV.x, 1.0 - fs_UV.y));

	if(u_LightColor.z > 0.5) //Bloom
		out_Col += texture(u_frame2, vec2(fs_UV.x, 1.0 - fs_UV.y));

	if(u_LightColor.w > 0.5) //Lens
		out_Col += getLensFlare();

	out_Col.w = 1.0;
}