import {mat4, vec2,vec4, vec3} from 'gl-matrix';
import Drawable from './Drawable';
import Camera from '../../Camera';
import {gl} from '../../globals';
import {gParticleInfoBufferSize} from '../../globals';
import {gShadowMapSize} from '../../globals';
import ShaderProgram, {Shader} from './ShaderProgram';
import PostProcess from './PostProcess'
import Square from '../../geometry/Square';
import { Texture } from './Texture';


class OpenGLRenderer {
  Horizontal_DOF : number = 2.0;
  Vertical_DOF : number = 2.0;
  Horizontal : number = 4.0;
  Vertical : number = 4.0;
  gBuffer: WebGLFramebuffer; // framebuffer for deferred rendering

  gbTargets: WebGLTexture[]; // references to different 4-channel outputs of the gbuffer
                             // Note that the constructor of OpenGLRenderer initializes
                             // gbTargets[0] to store 32-bit values, while the rest
                             // of the array stores 8-bit values. You can modify
                             // this if you want more 32-bit storage.

  depthTexture: WebGLTexture; // You don't need to interact with this, it's just
                              // so the OpenGL pipeline can do depth sorting
  shadowDepthTexture: WebGLTexture; // You don't need to interact with this, it's just
                              // so the OpenGL pipeline can do depth sorting

  // post-processing buffers pre-tonemapping (32-bit color)
  post32Buffers: WebGLFramebuffer[];
  post32Targets: WebGLTexture[];

  // post-processing buffers post-tonemapping (8-bit color)
  post8Buffers: WebGLFramebuffer[];
  post8Targets: WebGLTexture[];

  // post processing shader lists, try to limit the number for performance reasons
  post8Passes: PostProcess[];
  post32Passes: PostProcess[];

  currentTime: number; // timer number to apply to all drawing shaders

  // the shader that renders from the gbuffers into the postbuffers
  deferredShader :  PostProcess = new PostProcess(
    new Shader(gl.FRAGMENT_SHADER, require('../../shaders/deferred-render.glsl')), "deferred", 0
    );

  // shader that maps 32-bit color to 8-bit color
  tonemapPass : PostProcess = new PostProcess(
    new Shader(gl.FRAGMENT_SHADER, require('../../shaders/tonemap-frag.glsl')), "tonemap", 0
    );


  add8BitPass(pass: PostProcess) {
    this.post8Passes.push(pass);
  }


  add32BitPass(pass: PostProcess) {
    this.post32Passes.push(pass);
  }


  constructor(public canvas: HTMLCanvasElement) {
    this.currentTime = 0.0;
    this.gbTargets = [undefined, undefined, undefined];
    this.post8Buffers = [undefined, undefined, undefined, undefined];
    this.post8Targets = [undefined, undefined, undefined, undefined];
    this.post8Passes = [];

    this.post32Buffers = [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined];
    this.post32Targets = [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined];
    this.post32Passes = [];

    // TODO: these are placeholder post shaders, replace them with something good
    this.add8BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/present-frag.glsl')), "present", 0));

    this.add8BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/stateDot-frag.glsl')), "stateDot", 1));
    this.add8BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/point-frag.glsl')), "point", 2));

    this.add8BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/examplePost2-frag.glsl')), "oil painting", 0));




    this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/Blur_DOF_Horizontal-frag.glsl')), "DOFblurH", 0));  // 0
    this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/Blur_DOF_Vertical-frag.glsl')), "DOFblurv", 0)); //1


    this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/DOF-frag.glsl')), "DOF", 0)); // 2

    this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/bloom-frag.glsl')), "ExtractHighlight", 0)); // 3
    this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/Blur_Horizontal-frag.glsl')), "blurH", 0)); // 4
    this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/Blur_Vertical-frag.glsl')), "blurv", 0)); // 5
    this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/Composition-frag.glsl')), "Comp", 0)); // 6

    this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/HBAO.glsl')), "HBAO", 0)); // 7

    //this.add32BitPass(new PostProcess(new Shader(gl.FRAGMENT_SHADER, require('../../shaders/LensFlare.glsl')), "LensFlare", 0)); // 8


    if (!gl.getExtension("OES_texture_float_linear")) {
      console.error("OES_texture_float_linear not available");
    }

    if (!gl.getExtension("EXT_color_buffer_float")) {
      console.error("FLOAT color buffer not available");
    }

    var gb0loc = gl.getUniformLocation(this.deferredShader.prog, "u_gb0");
    var gb1loc = gl.getUniformLocation(this.deferredShader.prog, "u_gb1");
    var gb2loc = gl.getUniformLocation(this.deferredShader.prog, "u_gb2");

    this.deferredShader.use();
    gl.uniform1i(gb0loc, 0);
    gl.uniform1i(gb1loc, 1);
    gl.uniform1i(gb2loc, 2);
  }


  setClearColor(r: number, g: number, b: number, a: number) {
    gl.clearColor(r, g, b, a);
  }


  setSize(width: number, height: number) {
    console.log(width, height);
    this.canvas.width = width;
    this.canvas.height = height;

    // --- GBUFFER CREATION START ---
    // refresh the gbuffers
    this.gBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);

    for (let i = 0; i < this.gbTargets.length; i ++) {
      this.gbTargets[i] = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.gbTargets[i]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, this.gbTargets[i], 0);
    }
    // depth attachment
    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);

    var FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
        console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use FBO[0]\n");
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // create the framebuffers for post processing
    for (let i = 0; i < this.post8Buffers.length; i++) {

      // 8 bit buffers have unsigned byte textures of type gl.RGBA8
      this.post8Buffers[i] = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.post8Buffers[i]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

      this.post8Targets[i] = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.post8Targets[i]);

      if(i == 1) // Point
      {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gParticleInfoBufferSize, gParticleInfoBufferSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      else
      {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }

     
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.post8Targets[i], 0);

      FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
        console.error(i + "GL_FRAMEBUFFER_COMPLETE failed, CANNOT use 8 bit FBO\n");
      }
    }

    for (let i = 0; i < this.post32Buffers.length; i++) {
      // 32 bit buffers have float textures of type gl.RGBA32F
      this.post32Buffers[i] = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[i]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

      
      this.post32Targets[i] = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[i]);
      if(i == 0) // for Deferred Result
      {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
      }
      else if(i == 1) // for Blur H DownSampling x2
      {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth/this.Horizontal_DOF, gl.drawingBufferHeight/this.Horizontal_DOF, 0, gl.RGBA, gl.FLOAT, null);
      }
      else if(i == 5) // for Blur H DownSampling x2
      {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth/this.Horizontal, gl.drawingBufferHeight/this.Horizontal, 0, gl.RGBA, gl.FLOAT, null);
      }
      else if(i == 2) // for Blur V DownSampling x4
      {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth/this.Vertical_DOF, gl.drawingBufferHeight/this.Vertical_DOF, 0, gl.RGBA, gl.FLOAT, null);
      }
      else if(i == 6) // for Blur V DownSampling x4
      {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth/this.Vertical, gl.drawingBufferHeight/this.Vertical, 0, gl.RGBA, gl.FLOAT, null);
      }
      else if(i == 10) // for ShadowMap
      {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gShadowMapSize, gShadowMapSize, 0, gl.RGBA, gl.FLOAT, null);       
      }
      else
      {        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
      }

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.post32Targets[i], 0);

      if(i == 10)
      {
         // depth attachment
         this.shadowDepthTexture = gl.createTexture();
         gl.bindTexture(gl.TEXTURE_2D, this.shadowDepthTexture);
         gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
         gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, gShadowMapSize, gShadowMapSize, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
         gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowDepthTexture, 0);
      }

      FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (FBOstatus != gl.FRAMEBUFFER_COMPLETE) {
          console.error(i + "GL_FRAMEBUFFER_COMPLETE failed, CANNOT use 32 bit FBO\n");
        }
      
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }


  updateTime(deltaTime: number, currentTime: number) {
    this.deferredShader.setTime(currentTime);
    for (let pass of this.post8Passes) pass.setTime(currentTime);
    for (let pass of this.post32Passes) pass.setTime(currentTime);
    this.currentTime = currentTime;
  }


  clear() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }


  clearGB() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }


  renderToGBuffer(camera: Camera, gbProg: ShaderProgram, drawables: Array<Drawable>, textures : Array<Array<Texture>>) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.gBuffer);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    //gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    let model = mat4.create();
    
    let view = camera.viewMatrix;
    let proj = camera.projectionMatrix;
    let viewProj = camera.viewProjectionMatrix;

    let color = vec4.fromValues(0.5, 0.5, 0.5, 1);

    mat4.identity(model);
    
    //mat4.rotateY(model, model, this.currentTime * 0.2);

   
    gbProg.setViewProjMatrix(viewProj);
    gbProg.setGeometryColor(color);
    gbProg.setViewMatrix(view);
    gbProg.setProjMatrix(proj);

    gbProg.setTime(this.currentTime);   

    for (var i =0; i< drawables.length ; i++) {

      gbProg.setModelMatrix(drawables[i].modelMat);

      gbProg.setupTexUnits(["tex_Color"]);
      gbProg.bindTexToUnit("tex_Color", textures[i][0], 0);

      gbProg.setupTexUnits(["tex_Specular"]);
      gbProg.bindTexToUnit("tex_Specular", textures[i][1], 1);

      gbProg.setupTexUnits(["tex_Normal"]);
      gbProg.bindTexToUnit("tex_Normal", textures[i][2], 2);

      gbProg.draw(drawables[i]);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  }

  renderShadowMap(camera: Camera, smProg: ShaderProgram, shadowViewProj : mat4, drawables: Array<Drawable>) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[10]);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, gShadowMapSize, gShadowMapSize);
       
    smProg.setViewProjMatrix(shadowViewProj);

    for (var i =0; i< drawables.length ; i++)
    {
      smProg.setModelMatrix(drawables[i].modelMat);  
      smProg.draw(drawables[i]);
    }

    // bind default frame buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    //gl.disable(gl.BLEND);
  }

  

  renderFromGBuffer(camera: Camera, DOF : vec4, envMap : WebGLTexture, shadowViewProjMat : mat4, LColor : vec4, LDir : vec4) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[0]);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let view = camera.viewMatrix;
    let proj = camera.projectionMatrix;
    this.deferredShader.setViewMatrix(view);
    this.deferredShader.setProjMatrix(proj);
    this.deferredShader.setViewProjMatrix(camera.viewProjectionMatrix);
    this.deferredShader.setinvViewProjMatrix(camera.InvViewProjMatrix);
    this.deferredShader.setDofParams(DOF);
    this.deferredShader.setCameraPos( camera.position );

    this.deferredShader.setShadowViewProjMatrix(shadowViewProjMat);

    this.deferredShader.setEnvMap(envMap);
    this.deferredShader.setShadowMap(this.post32Targets[10]);
    this.deferredShader.setLightColor(LColor);
    this.deferredShader.setLightDir(LDir);

    for (let i = 0; i < this.gbTargets.length; i ++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.gbTargets[i]);
    }

    //this.deferredShader.setDepthMap( this.depthTexture /*this.gbTargets[0]*/);

    this.deferredShader.draw();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  renderLensFlare(camera: Camera, shadowViewProjMat : mat4) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[11]);

    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferWidth);
  
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[6]);  //BloomBlurred

    this.post32Passes[8].setScreenSize(vec2.fromValues(this.canvas.width, this.canvas.height));
    this.post32Passes[8].draw();

    // bind default frame buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    //gl.disable(gl.BLEND);
  }

  renderHBAO(camera: Camera, HBAOInfo : vec4) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[9]);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

      //gl.blendFunc(gl.ONE, gl.ZERO);//  gl.DST_ALPHA, gl.ONE_MINUS_DST_ALPHA);
      
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[0]);  

      this.post32Passes[7].setDepthMap(this.gbTargets[0]);
      this.post32Passes[7].setHBAOInfo(HBAOInfo);
      this.post32Passes[7].setInvProjMatrix(camera.invProjectionMatrix);
      

      this.post32Passes[7].setScreenSize(vec2.fromValues(this.canvas.width, this.canvas.height));
      this.post32Passes[7].draw();

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      //gl.disable(gl.BLEND);
  }

  renderBlur_Horizontal(camera: Camera, DOF : vec4, index : number, bHBAO : boolean) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[1]);

      gl.viewport(0, 0, gl.drawingBufferWidth / this.Horizontal_DOF, gl.drawingBufferHeight / this.Horizontal_DOF);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);

      if(index == 0)
      {
        if(!bHBAO)
          gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[0]);
        else
          gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[9]); // Scene with HBAO 
      }
      else
      {
        gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[2]);
      }

      
      this.post32Passes[0].setDofParams(DOF);
      this.post32Passes[0].setDepthMap(this.gbTargets[0]);
      this.post32Passes[0].setScreenSize(vec2.fromValues(this.canvas.width / this.Horizontal_DOF, this.canvas.height / this.Horizontal_DOF));
      this.post32Passes[0].draw();

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  renderBlur_Vertical(camera: Camera, DOF : vec4) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[2]);
    
      gl.viewport(0, 0, gl.drawingBufferWidth / this.Vertical_DOF, gl.drawingBufferHeight / this.Vertical_DOF);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[1]);

      this.post32Passes[1].setDofParams(DOF);
      this.post32Passes[1].setDepthMap(this.gbTargets[0]);
      this.post32Passes[1].setScreenSize(vec2.fromValues(this.canvas.width / this.Vertical_DOF, this.canvas.height / this.Vertical_DOF));
      this.post32Passes[1].draw();

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  renderDOF(camera: Camera, dofParams : vec4, bHBAO : boolean) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[3]);
    
      gl.viewport(0, 0, gl.drawingBufferWidth , gl.drawingBufferHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);

      if(!bHBAO)
        gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[0]);
      else
        gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[9]); // Scene with HBAO

      this.post32Passes[2].setScreenSize(vec2.fromValues(this.canvas.width , this.canvas.height));
      this.post32Passes[2].setFrame2(this.post32Targets[2]);
      this.post32Passes[2].setDepthMap(this.gbTargets[0]);
      this.post32Passes[2].setDofParams(dofParams);
      this.post32Passes[2].setInvProjMatrix(camera.invProjectionMatrix);
      this.post32Passes[2].draw();

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  

  renderBloom(camera: Camera, bHBAO : boolean) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[4]);

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);
     
      gl.activeTexture(gl.TEXTURE0);

      if(!bHBAO)
        gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[0]);
      else
        gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[9]); // Scene with HBAO
      
      this.post32Passes[3].setScreenSize(vec2.fromValues(this.canvas.width, this.canvas.height));
      this.post32Passes[3].draw();

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  renderBBlur_Horizontal(camera: Camera, index : number) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[5]);

      gl.viewport(0, 0, gl.drawingBufferWidth / this.Horizontal, gl.drawingBufferHeight / this.Horizontal);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      
      if(index == 0)
      {
        gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[4]);        
      }
      else
      {
        gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[6]);
      }

      this.post32Passes[4].setScreenSize(vec2.fromValues(this.canvas.width / this.Horizontal, this.canvas.height / this.Horizontal));
        this.post32Passes[4].draw();
     

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  renderBBlur_Vertical(camera: Camera)
   {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[6]);
    
      gl.viewport(0, 0, gl.drawingBufferWidth / this.Vertical, gl.drawingBufferHeight / this.Vertical);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);

      gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[5]);

      this.post32Passes[5].setScreenSize(vec2.fromValues(this.canvas.width / this.Vertical, this.canvas.height / this.Vertical));
      this.post32Passes[5].draw();

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  renderComposition(camera: Camera, DOF : boolean, Bloom : boolean, bHBAO : boolean, bLensFlare : boolean, LensflareInfo : vec4) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[7]);
  
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);

      if(DOF)
        gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[3]); // DOF
      else
      {
        if(!bHBAO)
          gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[0]);
        else
          gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[9]); // Scene with HBAO

      }

       
      this.post32Passes[6].setLightColor( vec4.fromValues(1.0 / this.canvas.width, 1.0 / this.canvas.height, Bloom ? 1.0 : 0.0, bLensFlare ? 1.0 : 0.0));
      this.post32Passes[6].setLightDir(LensflareInfo);
      this.post32Passes[6].setFrame2(this.post32Targets[6]); // Bloom
      //this.post32Passes[6].setDepthMap(this.post32Targets[11]); // Lens Flare
      this.post32Passes[6].draw();

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  

  renderPresent(camera: Camera) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT  | gl.DEPTH_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);

      gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[8]);

      /*
      if(!bHBAO)
        gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[0]);
      else
        gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[9]); // Scene with HBAO
      */

      this.post8Passes[0].setScreenSize(vec2.fromValues(this.canvas.width, this.canvas.height));

      this.post8Passes[0].draw();

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  renderGenerateDots(camera: Camera) {

     gl.bindFramebuffer(gl.FRAMEBUFFER, this.post8Buffers[1]);

      gl.viewport(0, 0, gParticleInfoBufferSize, gParticleInfoBufferSize);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);

      gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[8]);

      //console.log(gParticleInfoBufferSize);

      this.post8Passes[1].setBufferSize(vec2.fromValues(gParticleInfoBufferSize, gParticleInfoBufferSize));     
      this.post8Passes[1].drawInstance();

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  
  renderPointillism(camera: Camera) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.post8Targets[1]);


      //this.post8Passes[2].setFrame2(this.post32Targets[2]);
      this.post8Passes[2].setScreenSize(vec2.fromValues(gl.drawingBufferWidth, gl.drawingBufferHeight));
      this.post8Passes[2].setAspectRatio(this.canvas.width / this.canvas.height);
      this.post8Passes[2].setBufferSize(vec2.fromValues(gParticleInfoBufferSize, gParticleInfoBufferSize));  
      this.post8Passes[2].setTime(this.currentTime);   
      this.post8Passes[2].drawInstance();

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.disable(gl.BLEND);
  }
  


  renderOilPainting(camera: Camera) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT  | gl.DEPTH_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[8]);


      this.post8Passes[3].setScreenSize(vec2.fromValues(this.canvas.width, this.canvas.height));     
      this.post8Passes[3].draw();

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }


  // TODO: pass any info you need as args
  renderPostProcessHDR() {
    // TODO: replace this with your post 32-bit pipeline
    // the loop shows how to swap between frame buffers and textures given a list of processes,
    // but specific shaders (e.g. bloom) need specific info as textures
    let i = 0;
    for (i = 0; i < this.post32Passes.length; i++){
      // Pingpong framebuffers for each pass.
      // In other words, repeatedly flip between storing the output of the
      // current post-process pass in post32Buffers[1] and post32Buffers[0].
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[(i + 1) % 2]);

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // Recall that each frame buffer is associated with a texture that stores
      // the output of a render pass. post32Targets is the array that stores
      // these textures, so we alternate reading from the 0th and 1th textures
      // each frame (the texture we wrote to in our previous render pass).
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[(i) % 2]);

      this.post32Passes[i].draw();

      // bind default frame buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // apply tonemapping
    // TODO: if you significantly change your framework, ensure this doesn't cause bugs!
    // render to the first 8 bit buffer if there is more post, else default buffer
    if (this.post8Passes.length > 0) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.post8Buffers[0]);
    }
    else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    // bound texture is the last one processed before

    gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[Math.max(0, i) % 2]);

    this.tonemapPass.draw();

  }

  renderPostToneMapping( isOn : boolean, Class : number, temperature : number)
  {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.post32Buffers[8]);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    // bound texture is the last one processed before

    gl.bindTexture(gl.TEXTURE_2D, this.post32Targets[7]);

    this.tonemapPass.setToneMapping( isOn ? Class : 0 );
    this.tonemapPass.setTemperature(temperature);
    this.tonemapPass.draw();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }


  // TODO: pass any info you need as args
  renderPostProcessLDR() {
    // TODO: replace this with your post 8-bit pipeline
    // the loop shows how to swap between frame buffers and textures given a list of processes,
    // but specific shaders (e.g. motion blur) need specific info as textures
    for (let i = 0; i < this.post8Passes.length; i++){
      // pingpong framebuffers for each pass
      // if this is the last pass, default is bound
      if (i < this.post8Passes.length - 1) gl.bindFramebuffer(gl.FRAMEBUFFER, this.post8Buffers[(i + 1) % 2]);
      else gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.post8Targets[(i) % 2]);

      this.post8Passes[i].draw();

      // bind default
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

};

export default OpenGLRenderer;
