#version 300 es

uniform vec2 u_bufferSize;
uniform float u_Time;
uniform float u_AspectRatio;

in vec4 vs_Pos; // Non-instanced; each particle is the same quad drawn in a different place
in vec4 vs_Col; // An instanced rendering attribute; each particle instance has a different color
in vec2 vs_UV;
in vec3 vs_Translate; // Another instance rendering attribute used to position each quad instance in the scene

out vec4 fs_Col;
out vec4 fs_Pos;
out vec2 fs_UV;

void main()
{
    int y = int(gl_InstanceID / int(u_bufferSize.x));
    int x = gl_InstanceID - y * int(u_bufferSize.x);

    ivec2 index = ivec2(x, y);
    vec2 uv = vec2(float(x) / u_bufferSize.x, float(y) / u_bufferSize.y);
    
    fs_Pos = vs_Pos * vs_Col.w;
    fs_Pos.w = vs_Col.w;
   

    fs_UV = uv;
    fs_UV.y = 1.0 - fs_UV.y;
    
    vec3 offset = vs_Translate;

    vec3 transVpos = vec3(vs_Pos.x / u_AspectRatio, vs_Pos.yz); 

    vec3 billboardPos = offset + transVpos * (((sin(u_Time * 8.0 + vs_Col.z * 6.28 ) + 1.0) * 0.5) + 1.0) + vec3(0.5, 0.5, 0.0) + vec3(vs_Col.xy * 0.6, 0.0);
    gl_Position = vec4( ( (billboardPos.x - 1.5 ) / u_bufferSize.x) * 2.0 - 1.0, ((billboardPos.y) / u_bufferSize.y) * 2.0 - 1.0, 0.5, 1.0);    
}
