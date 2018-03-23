#version 300 es
precision highp float;


uniform vec2 u_bufferSize;

in vec4 fs_Col;
in vec4 fs_Pos;
in vec2 fs_UV;

out vec4 out_Color;

void main()
{   
    out_Color = fs_Col;
    out_Color.w = 1.0;
}
