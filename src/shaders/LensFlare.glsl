#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 FragColor;

uniform sampler2D u_frame; 

uniform vec2 u_screenSize;

vec4 textureDistorted(sampler2D tex, vec2 texcoord,  vec2 direction, // direction of distortion
              vec3 distortion)
  {
    return vec4
      (
		texture(tex, texcoord + direction * distortion.r).r,
		texture(tex, texcoord + direction * distortion.g).g,
		texture(tex, texcoord + direction * distortion.b).b,
        0.0
      );
  }
  
void main()
{
 
  const int uGhosts = 2; // number of ghost samples
  float uGhostDispersal = 0.5; // dispersion factor
  float uDistortion = 4.0;
  const float u_intensity = 5.0;
  vec2 texcoord = fs_UV;
	//	texcoord.y = 1.0 - texcoord.y;

  vec3 distortion = vec3(-u_screenSize.x * uDistortion, 0.0, u_screenSize.x * uDistortion);
  
  // ghost vector to image centre:
  vec2 ghostVec = (vec2(0.5, 0.5) - texcoord) * uGhostDispersal;
  
  vec3 direction = normalize(vec3(ghostVec, 0.0));
  // sample ghosts:  
  vec4 result = vec4(0,0,0,0);
  vec4 ghost = vec4(0, 0, 0, 0);
  
  for (int i = 0; i < uGhosts; ++i)
  {
    vec2 offset = fract(texcoord + ghostVec * float(i));
    ghost += textureDistorted(u_frame, offset, direction.xy, distortion);
  }

  float weightLens = length(vec2(0.5, 0.5) - texcoord) / length(vec2(0.5, 0.5));
  weightLens = pow( clamp(1.0 - clamp(weightLens, 0.0, 1.0), 0.0, 1.0), 3.0);
  weightLens *= 2.0;
  ghost *= weightLens;
  // sample halo:
  float uHaloWidth = 0.4;
  vec2 haloVec = normalize(ghostVec) * uHaloWidth;
  float weight = length(vec2(0.5, 0.5) - fract(texcoord + haloVec)) / length(vec2(0.5, 0.5));
  
  weight = pow(1.0 - clamp(weight, 0.0, 1.0), 20.0);
  result = textureDistorted(u_frame, texcoord + haloVec, direction.xy, distortion) *weight;
  result *= 5.0;
  result += ghost;
    
 
  FragColor = result * u_intensity;
}
