#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform float u_Time;

uniform sampler2D u_depthMap;
uniform vec2 u_screenSize;

uniform mat4 u_InvProj;

//#extension GL_OES_standard_derivatives : enable
//uniform sampler2D u_colorTexture;
uniform sampler2D u_randomTexture;

uniform vec4 HBAOinfo; // u_intensity, u_bias, u_lenCap, u_stepSize

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

	vec2 ScreenToView(vec2 uv)
	{
		return vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y)*2.0 - 1.0));
	}
           
    //Reconstruct Normal from View position
	vec3 GetNormal(vec3 posInCamera)
	{
		vec3 d1 = dFdx(posInCamera);
		vec3 d2 = dFdy(posInCamera); 
		return normalize(cross(d1, d2));
	}

    void main(void)
    {     
	 
     float depth = texture(u_depthMap, fs_UV).w;

	//out_Col = vec4(depth);
	// return;

     vec4 posInCamera = u_InvProj * vec4(ScreenToView(fs_UV), depth, 1.0);
     posInCamera = posInCamera / posInCamera.w;
     vec3 normalInCamera = GetNormal(posInCamera.xyz);
           
     float AO = 0.0;
     vec2 sampleDirection = vec2(1.0, 0.0);
     float gapAngle = 90.0;

     // DegreeToRadian
     gapAngle *= 0.01745329252;

     // RandomNoise
    // vec2 noiseMapSize = vec2(256.0, 256.0); 
    // vec2 noiseScale = vec2(czm_viewport.z /  noiseMapSize.x, czm_viewport.w / noiseMapSize.y); 
     float randomVal = rand(fs_UV);//0.0;//clamp(texture(u_randomTexture, fs_UV*noiseScale).x, 0.0, 1.0); 

     //Loop for each direction
     for (int i = 0; i < 4; i++)
     {
      float newgapAngle = gapAngle * (float(i) + randomVal);
      float cosVal = cos(newgapAngle);
      float sinVal = sin(newgapAngle);

      //Rotate Sampling Direction
      vec2 rotatedSampleDirection = vec2(cosVal * sampleDirection.x - sinVal * sampleDirection.y, sinVal * sampleDirection.x + cosVal * sampleDirection.y);
      float localAO = 0.0;
      float localStepSize = HBAOinfo.w;

      //Loop for each step
      for (int j = 0; j < 6; j++)
      {
        vec2 directionWithStep = vec2(rotatedSampleDirection.x * localStepSize * (1.0 / u_screenSize.x), rotatedSampleDirection.y * localStepSize * (1.0 / u_screenSize.y));
        vec2 newCoords = directionWithStep + fs_UV; 
        
		//Exception Handling
        if(newCoords.x > 1.0 || newCoords.y > 1.0 || newCoords.x < 0.0 || newCoords.y < 0.0)
          break;

          float stepDepthInfo = texture(u_depthMap, newCoords).w;
          vec4 stepPosInCamera = u_InvProj * vec4(ScreenToView(newCoords), stepDepthInfo, 1.0);
          stepPosInCamera = stepPosInCamera / stepPosInCamera.w; 
          vec3 diffVec = stepPosInCamera.xyz - posInCamera.xyz; 
          float len = length(diffVec);
         
          if(len <= HBAOinfo.z)
          {
          	float dotVal = clamp(dot(normalInCamera, normalize(diffVec)), 0.0, 1.0 );
            float weight = len / HBAOinfo.z;
            weight = 1.0 - weight*weight;

            if(dotVal < HBAOinfo.y)
            dotVal = 0.0;

            localAO = max(localAO, dotVal * weight);
            localStepSize += HBAOinfo.w;
           }
           else
           	break;
      }
      AO += localAO;
    }

    AO /= float(4);
    AO = 1.0 - clamp(AO, 0.0, 1.0);
    AO = pow(AO, HBAOinfo.x);
            
   
	out_Col = vec4(texture(u_frame, vec2(fs_UV.x, 1.0 - fs_UV.y)).xyz * AO, 1.0);
    
   }