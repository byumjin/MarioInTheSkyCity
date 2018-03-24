import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import Drawable from './Drawable';
import Texture from './Texture';
import {gl} from '../../globals';

var activeProgram: WebGLProgram = null;

export class Shader {
  shader: WebGLShader;

  constructor(type: number, source: string) {
    this.shader = gl.createShader(type);
    gl.shaderSource(this.shader, source);
    gl.compileShader(this.shader);

    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(this.shader);
    }
  }
};

class ShaderProgram {
  prog: WebGLProgram;

  attrPos: number;
  attrNor: number;
  attrCol: number;
  attrUV: number;
  attrTranslate: number;
  unifModel: WebGLUniformLocation;
  unifModelInvTr: WebGLUniformLocation;
  
  unifViewProj: WebGLUniformLocation;
  unifshadowViewProj: WebGLUniformLocation;
  unifinvViewProj: WebGLUniformLocation;
  unifView: WebGLUniformLocation;
  unifProj: WebGLUniformLocation;
  unifInvProj : WebGLUniformLocation;

  unifColor: WebGLUniformLocation;
  unifTime: WebGLUniformLocation;
  unifDofParams : WebGLUniformLocation;
  unifAspectRatio : WebGLUniformLocation;
  unifCameraPos : WebGLUniformLocation;

  unifDepthMap: WebGLUniformLocation;
  unifEnvMap: WebGLUniformLocation;

  unifTexUnits: Map<string, WebGLUniformLocation>;

  unifscreenSize : WebGLUniformLocation;
  unifbufferSize : WebGLUniformLocation;
  
  unifTemperature : WebGLUniformLocation;
  unifToneMapping : WebGLUniformLocation;
  unifHBAOInfo : WebGLUniformLocation;

  unifShadowMap : WebGLUniformLocation;

  unifLightColor : WebGLUniformLocation;
  unifLightDir : WebGLUniformLocation;

  unifGodrayInfo : WebGLUniformLocation;
  unifLightPos : WebGLUniformLocation;

  constructor(shaders: Array<Shader>) {
    this.prog = gl.createProgram();

    for (let shader of shaders) {
      gl.attachShader(this.prog, shader.shader);
    }
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(this.prog);
    }

    this.attrPos = gl.getAttribLocation(this.prog, "vs_Pos");
    this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
    this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");
    this.attrUV = gl.getAttribLocation(this.prog, "vs_UV");
    this.attrTranslate = gl.getAttribLocation(this.prog, "vs_Translate");
    this.unifModel = gl.getUniformLocation(this.prog, "u_Model");
    this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
    this.unifViewProj = gl.getUniformLocation(this.prog, "u_ViewProj");
    this.unifshadowViewProj = gl.getUniformLocation(this.prog, "u_shadowViewProj");
    this.unifinvViewProj = gl.getUniformLocation(this.prog, "u_invViewProj");
    this.unifView = gl.getUniformLocation(this.prog, "u_View");
    this.unifProj = gl.getUniformLocation(this.prog, "u_Proj");
    this.unifInvProj = gl.getUniformLocation(this.prog, "u_InvProj");
    this.unifColor = gl.getUniformLocation(this.prog, "u_Color");
    this.unifTime = gl.getUniformLocation(this.prog, "u_Time");
    this.unifDepthMap = gl.getUniformLocation(this.prog, "u_depthMap");
    this.unifEnvMap =  gl.getUniformLocation(this.prog, "u_envMap");
    this.unifAspectRatio = gl.getUniformLocation(this.prog, "u_AspectRatio");
    this.unifCameraPos = gl.getUniformLocation(this.prog, "u_CamPos");


    this.unifLightColor  = gl.getUniformLocation(this.prog, "u_LightColor");
    this.unifLightDir  = gl.getUniformLocation(this.prog, "u_LightDir");

    this.unifShadowMap = gl.getUniformLocation(this.prog, "u_shadowMap");


    this.unifDofParams = gl.getUniformLocation(this.prog, "u_DofParams");

    this.unifscreenSize = gl.getUniformLocation(this.prog, "u_screenSize");
    this.unifbufferSize = gl.getUniformLocation(this.prog, "u_bufferSize");

    this.unifTemperature = gl.getUniformLocation(this.prog, "u_Temperature");
    this.unifToneMapping = gl.getUniformLocation(this.prog, "u_ToneMapping");
    this.unifHBAOInfo = gl.getUniformLocation(this.prog, "HBAOinfo");

    this.unifGodrayInfo = gl.getUniformLocation(this.prog, "u_godRayInfo");
    this.unifLightPos = gl.getUniformLocation(this.prog, "u_lightPos");
    

    this.unifTexUnits = new Map<string, WebGLUniformLocation>();
  }

  setupTexUnits(handleNames: Array<string>) {
    for (let handle of handleNames) {
      var location = gl.getUniformLocation(this.prog, handle);
      if (location !== -1) {
        this.unifTexUnits.set(handle, location);
      } else {
        console.log("Could not find handle for texture named: \'" + handle + "\'!");
      }
    }
  }

  // Bind the given Texture to the given texture unit
  bindTexToUnit(handleName: string, tex: Texture, unit: number) {
    this.use();
    var location = this.unifTexUnits.get(handleName);
    if (location !== undefined) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      tex.bindTex();
      gl.uniform1i(location, unit);
    } else {
      console.log("Texture with handle name: \'" + handleName + "\' was not found");
    }
  }

  use() {
    if (activeProgram !== this.prog) {
      gl.useProgram(this.prog);
      activeProgram = this.prog;
    }
  }

  setModelMatrix(model: mat4) {
    this.use();
    if (this.unifModel !== -1) {
      gl.uniformMatrix4fv(this.unifModel, false, model);
    }

    if (this.unifModelInvTr !== -1) {
      let modelinvtr: mat4 = mat4.create();
      mat4.transpose(modelinvtr, model);
      mat4.invert(modelinvtr, modelinvtr);
      gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
    }
  }

  setViewProjMatrix(vp: mat4) {
    this.use();
    if (this.unifViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifViewProj, false, vp);
    }
  }

  setShadowViewProjMatrix(vp: mat4) {
    this.use();
    if (this.unifshadowViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifshadowViewProj, false, vp);
    }
  }


  setinvViewProjMatrix(vp: mat4) {
    this.use();
    if (this.unifinvViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifinvViewProj, false, vp);
    }
  }

  setViewMatrix(vp: mat4) {
    this.use();
    if (this.unifView !== -1) {
      gl.uniformMatrix4fv(this.unifView, false, vp);
    }
  }

  setProjMatrix(vp: mat4) {
    this.use();
    if (this.unifProj !== -1) {
      gl.uniformMatrix4fv(this.unifProj, false, vp);
    }
  }

  setInvProjMatrix(vp: mat4) {
    this.use();
    if (this.unifInvProj !== -1) {
      gl.uniformMatrix4fv(this.unifInvProj, false, vp);
    }
  }


  
  setGeometryColor(color: vec4) {
    this.use();
    if (this.unifColor !== -1) {
      gl.uniform4fv(this.unifColor, color);
    }
  }

  setLightColor(color: vec4) {
    this.use();
    if (this.unifLightColor !== -1) {
      gl.uniform4fv(this.unifLightColor, color);
    }
  }

  setLightDir(color: vec4) {
    this.use();
    if (this.unifLightDir !== -1) {
      gl.uniform4fv(this.unifLightDir, color);
    }
  }

  setCameraPos(pos: vec3) {
    this.use();
    if (this.unifCameraPos !== -1) {
      gl.uniform3fv(this.unifCameraPos, pos);
    }
  }

  setTime(t: number) {
    this.use();
    if (this.unifTime !== -1) {
      gl.uniform1f(this.unifTime, t);
    }
  }

  setAspectRatio(t: number) {
    this.use();
    if (this.unifAspectRatio !== -1) {
      gl.uniform1f(this.unifAspectRatio, t);
    }
  }

  setTemperature(t: number) {
    this.use();
    if (this.unifTemperature !== -1) {
      gl.uniform1f(this.unifTemperature, t);
    }
  }

  setToneMapping(t: number) {
    this.use();
    if (this.unifToneMapping !== -1) {
      gl.uniform1f(this.unifToneMapping, t);
    }
  }

  setDofParams(t: vec4) {
    this.use();
    if (this.unifDofParams !== -1) {
      gl.uniform4fv(this.unifDofParams, t);
    }
  }

  setDepthMap(texture: WebGLTexture)
  {
    this.use();
    if (this.unifDepthMap != -1) {
  
      gl.uniform1i(this.unifDepthMap, 3);  
  
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, texture);  
    }
  }

  setGodrayInfo(v : vec4)
  {
    this.use();
    if (this.unifGodrayInfo != -1) {
      gl.uniform4fv(this.unifGodrayInfo, v);
    }
  }

  setLightPos(v : vec4)
  {
    this.use();
    if (this.unifLightPos != -1) {
      gl.uniform4fv(this.unifLightPos, v);
    }
  }

  setHBAOInfo(v : vec4)
  {
    this.use();
    if (this.unifHBAOInfo != -1) {
      //console.log("!");
      gl.uniform4fv(this.unifHBAOInfo, v);
    }
  }

  setEnvMap(texture: WebGLTexture)
  {
    this.use();
    if (this.unifEnvMap != -1) {
  
      gl.uniform1i(this.unifEnvMap, 4);  
  
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, texture);  
    }
  }

  setShadowMap(texture: WebGLTexture)
  {
    this.use();
    if (this.unifShadowMap != -1) {
  
      gl.uniform1i(this.unifShadowMap, 5);  
  
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, texture);  
    }
  }  

  setScreenSize(size: vec2) {
		this.use();
		if (this.unifscreenSize !== -1) {
		  gl.uniform2fv(this.unifscreenSize, size);
		}
	  }

	  setBufferSize(size: vec2) {
		this.use();
		if (this.unifbufferSize !== -1) {

		  gl.uniform2fv(this.unifbufferSize, size);
		}
	  }

  draw(d: Drawable) {
    this.use();

    if (this.attrPos != -1 && d.bindPos()) {
      gl.enableVertexAttribArray(this.attrPos);
      gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrPos, 0);
    }

    if (this.attrNor != -1 && d.bindNor()) {
      gl.enableVertexAttribArray(this.attrNor);
      gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrNor, 0);
    }

    if (this.attrCol != -1 && d.bindCol()) {
      gl.enableVertexAttribArray(this.attrCol);
      gl.vertexAttribPointer(this.attrCol, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrCol, 0);
    }

    if (this.attrUV != -1 && d.bindUV()) {
      gl.enableVertexAttribArray(this.attrUV);
      gl.vertexAttribPointer(this.attrUV, 2, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrUV, 0);
    }

    d.bindIdx();
    gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);

    if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
    if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
    if (this.attrCol != -1) gl.disableVertexAttribArray(this.attrCol);
    if (this.attrUV != -1) gl.disableVertexAttribArray(this.attrUV);
  }

  drawInstnace(d: Drawable) {
    this.use();

   
    if (this.attrPos != -1 && d.bindPos()) {
      
      gl.enableVertexAttribArray(this.attrPos);
      gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrPos, 0); // Advance 1 index in pos VBO for each vertex
    }

    if (this.attrNor != -1 && d.bindNor()) {

      
      gl.enableVertexAttribArray(this.attrNor);
      gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrNor, 0);
    }
   
    if (this.attrCol != -1 && d.bindCol()) {
      
      gl.enableVertexAttribArray(this.attrCol);
      gl.vertexAttribPointer(this.attrCol, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrCol, 1); // Advance 1 index in col VBO for each drawn instance
    }

    if (this.attrUV != -1 && d.bindUV()) {

      
      gl.enableVertexAttribArray(this.attrUV);
      gl.vertexAttribPointer(this.attrUV, 2, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrUV, 0);
    }
    
    if (this.attrTranslate != -1 && d.bindTranslate()) {
      
      gl.enableVertexAttribArray(this.attrTranslate);
      gl.vertexAttribPointer(this.attrTranslate, 3, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrTranslate, 1); // Advance 1 index in translate VBO for each drawn instance
    }
    
    d.bindIdx();
    gl.drawElementsInstanced(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0, d.numInstances);

    if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
    if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
    if (this.attrCol != -1) gl.disableVertexAttribArray(this.attrCol);
    if (this.attrUV != -1) gl.disableVertexAttribArray(this.attrUV);
    if (this.attrTranslate != -1) gl.disableVertexAttribArray(this.attrTranslate);
  }
};

export default ShaderProgram;
