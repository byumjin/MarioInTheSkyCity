#version 300 es
precision highp float;

in vec4 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_Col;
in vec2 fs_UV;

out vec4 fragColor[3]; // The data in the ith index of this array of outputs
                       // is passed to the ith index of OpenGLRenderer's
                       // gbTargets array, which is an array of textures.
                       // This lets us output different types of data,
                       // such as albedo, normal, and position, as
                       // separate images from a single render pass.

uniform sampler2D tex_Color;
uniform sampler2D tex_Specular;
uniform sampler2D tex_Normal;

uniform mat4 u_Model;
uniform mat4 u_ViewProj;

vec3 applyNormalMap(vec3 geomnor, vec3 normap) {
    
    vec3 up = normalize(vec3(0.001, 1, 0.001));
    vec3 surftan = normalize(cross(geomnor, up));
    vec3 surfbinor = cross(geomnor, surftan);
    return normalize(normap.y * surftan + normap.x * surfbinor + normap.z * geomnor);
}

void main() {
    // TODO: pass proper data into gbuffers
    // Presently, the provided shader passes "nothing" to the first
    // two gbuffers and basic color to the third.

    vec4 POS = u_ViewProj * u_Model * fs_Pos;
    POS /= POS.w;

    vec2 flipUV = vec2(fs_UV.x, 1.0 - fs_UV.y);

    vec4 Albedo = texture(tex_Color, flipUV);
    vec4 Specular = texture(tex_Specular, flipUV);
    vec4 Normal = texture(tex_Normal, flipUV);

    vec3 Normal_WS = applyNormalMap(fs_Nor.xyz, normalize(Normal.xyz * 2.0 - vec3(1.0)));

    // if using textures, inverse gamma correct
    vec3 col = pow(Albedo.xyz, vec3(2.2));

    fragColor[0] = vec4(Normal_WS.xyz, clamp(POS.z, 0.0, 1.0));    //Normal, Depth
    fragColor[1] = vec4(Specular.xyz, Specular.w);  //Specular, Roughness
    fragColor[2] = vec4(col.xyz, Albedo.w);      //Albedo, Opacity
    //fragColor[2] = fs_Pos;      //Albedo, Opacity
}
