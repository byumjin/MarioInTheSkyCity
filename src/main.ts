import {vec3, vec4, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import Mesh from './geometry/Mesh';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import {readTextFile} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Texture from './rendering/gl/Texture';
import {gParticleInfoBufferSize} from './globals';
import Drawable from './rendering/gl/Drawable';
import { rename } from 'fs';

// Define an object with application parameters and button callbacks
const controls = {

  Bloom : true,
  Bloom_Iteration : 16,
  DOF : true,
  Focal_Distance : 35.0,
  DOF_Iteration : 4,

  ToneMapping : true,
  ToneClass : 5,
  Temperature : 7000.0,

  HBAO : true,
  HBAO_Intensity : 1.0,
  HBAO_Bias : 0.31,
  HBAO_Max_Length : 4.0,
  HBAO_StepSize : 2.0,
  Artistic_Effect: 0,

  LensFlare : true,
  Lens_Intensity : 0.1,
  Lens_Ghost : 2,
  Lens_Dispersal : 0.5,
  Lens_Distortion : 27.0,
  
};

let square: Square;
let particleSquare: Square;
// TODO: replace with your scene's stuff

let meshContainer: Array<Drawable> = [];
let textureContainers: Array<Array<Texture>> = [];

let obj0: string;

let backBuildings: string;
let innerBuildings: string;
let BoxLamp: string;
let signs: string;
let trims: string;
let trim_floor: string;
let varanda: string;
let props: string;

let mesh0: Mesh;

let mesh_backBuildings: Mesh;
let mesh_innerBuildings: Mesh;
let mesh_BoxLamp: Mesh;
let mesh_signs: Mesh;
let mesh_trims: Mesh;
let mesh_trim_floor: Mesh;
let mesh_varanda: Mesh;
let mesh_props : Mesh;

let tex0: Texture;
let tex1: Texture;
let tex2: Texture;

let envTexture: Texture;

let texbackBuildings0: Texture;
let texbackBuildings1: Texture;
let texbackBuildings2: Texture;

let texinnerBuildings0: Texture;
let texinnerBuildings1: Texture;
let texinnerBuildings2: Texture;


function play_single_sound() {
  var JukeBox = new AudioContext();
  fetch('./music/09. Dire, Dire Docks.mp3')  
    .then(r=>r.arrayBuffer())
    .then(b=>JukeBox.decodeAudioData(b))
    .then(data=>{
        const audio_buf = JukeBox.createBufferSource();
        audio_buf.buffer = data;
        audio_buf.loop = true;
        audio_buf.connect(JukeBox.destination);
        audio_buf.start(0);
        });

        console.log(`Music On!`);
}

var timer = {
  deltaTime: 0.0,
  startTime: 0.0,
  currentTime: 0.0,
  updateTime: function() {
    var t = Date.now();
    t = (t - timer.startTime) * 0.001;
    timer.deltaTime = t - timer.currentTime;
    timer.currentTime = t;
  },
}

function loadOBJText() {
  obj0 = readTextFile('../resources/obj/wahoo.obj');
  backBuildings = readTextFile('../resources/obj/back_buildings.obj');
  innerBuildings = readTextFile('../resources/obj/innerBuildings.obj');
  BoxLamp = readTextFile('../resources/obj/BoxLamp.obj');
  signs = readTextFile('../resources/obj/signs.obj');
  trims = readTextFile('../resources/obj/trim_stair.obj');
  trim_floor = readTextFile('../resources/obj/trim_floor.obj');
  varanda = readTextFile('../resources/obj/varanda.obj');
  props = readTextFile('../resources/obj/props.obj');
}

function loadScene() {

  envTexture = new Texture('../resources/textures/nsky.png');

  square && square.destroy();
  mesh0 && mesh0.destroy();
  mesh_backBuildings && mesh_backBuildings.destroy();
  mesh_innerBuildings && mesh_innerBuildings.destroy();
  mesh_BoxLamp && mesh_BoxLamp.destroy();
  mesh_signs && mesh_signs.destroy();
  mesh_trims && mesh_trims.destroy();
  mesh_trim_floor && mesh_trim_floor.destroy();
  mesh_varanda && mesh_varanda.destroy();
  mesh_props && mesh_props.destroy();
 
  mesh0 = new Mesh(obj0, vec3.fromValues(0, 0, -10));
  mesh0.create();

  mesh_backBuildings = new Mesh(backBuildings, vec3.fromValues(0, 0, 0));
  mesh_backBuildings.create();

  mesh_innerBuildings = new Mesh(innerBuildings, vec3.fromValues(0, 0, 0));
  mesh_innerBuildings.create();

  mesh_BoxLamp = new Mesh(BoxLamp, vec3.fromValues(0, 0, 0));
  mesh_BoxLamp.create();

  mesh_signs = new Mesh(signs, vec3.fromValues(0, 0, 0));
  mesh_signs.create();

  mesh_trims = new Mesh(trims, vec3.fromValues(0, 0, 0));
  mesh_trims.create();

  mesh_trim_floor = new Mesh(trim_floor, vec3.fromValues(0, 0, 0));
  mesh_trim_floor.create();

  mesh_varanda = new Mesh(varanda, vec3.fromValues(0, 0, 0));
  mesh_varanda.create();

  mesh_props = new Mesh(props, vec3.fromValues(0, 0, 0));
  mesh_props.create();

  meshContainer.push(mesh0);
  
  meshContainer.push(mesh_backBuildings);
  meshContainer.push(mesh_innerBuildings);
  meshContainer.push(mesh_BoxLamp);
  meshContainer.push(mesh_signs);
  meshContainer.push(mesh_trims);
  meshContainer.push(mesh_trim_floor);
  meshContainer.push(mesh_varanda);
  meshContainer.push(mesh_props);

  let tex012 : Array<Texture> = [];
  tex0 = new Texture('../resources/textures/wahoo_Color.png');
  tex1 = new Texture('../resources/textures/wahoo_Spec.png');
  tex2 = new Texture('../resources/textures/wahoo_Norm.png');

  tex012.push(tex0); tex012.push(tex1); tex012.push(tex2);

  textureContainers.push(tex012);


  let texbackBuildings : Array<Texture> = [];
  var texbackBuildings0 = new Texture('../resources/textures/sky_wall_Color.png');
  var texbackBuildings1 = new Texture('../resources/textures/sky_wall_Spec.png');
  var texbackBuildings2 = new Texture('../resources/textures/sky_wall_Normal.png');

  texbackBuildings.push(texbackBuildings0); texbackBuildings.push(texbackBuildings1); texbackBuildings.push(texbackBuildings2);

  textureContainers.push(texbackBuildings);
  textureContainers.push(texbackBuildings);

  //mesh_BoxLamp
  let texBoxLamp : Array<Texture> = [];
  var texBoxLamp0 = new Texture('../resources/textures/sky__props_Color.png');
  var texBoxLamp1 = new Texture('../resources/textures/sky__props_Spec.png');
  var texBoxLamp2 = new Texture('../resources/textures/sky__props_Normal.png');

  texBoxLamp.push(texBoxLamp0); texBoxLamp.push(texBoxLamp1); texBoxLamp.push(texBoxLamp2);
  textureContainers.push(texBoxLamp);

  //mesh_signs
  let texSigns : Array<Texture> = [];
  var texSigns0 = new Texture('../resources/textures/Ads.png');
  var texSigns1 = new Texture('../resources/textures/Ads.png');
  var texSigns2 = new Texture('../resources/textures/normal.png');

  texSigns.push(texSigns0); texSigns.push(texSigns1); texSigns.push(texSigns2);
  textureContainers.push(texSigns);

  //mesh_trims
  let texTrims : Array<Texture> = [];
  var texTrims0 = new Texture('../resources/textures/sky__trims_Color.png');
  var texTrims1 = new Texture('../resources/textures/sky__trims_Spec.png');
  var texTrims2 = new Texture('../resources/textures/sky__trims_Normal.png');

  texTrims.push(texTrims0); texTrims.push(texTrims1); texTrims.push(texTrims2);
  textureContainers.push(texTrims);

  //mesh_trim_floor
  let texTrimsFloor : Array<Texture> = [];
  var texTrimsFloor0 = new Texture('../resources/textures/low_sky_tiles_Color.png');
  var texTrimsFloor1 = new Texture('../resources/textures/low_sky_tiles_Spec.png');
  var texTrimsFloor2 = new Texture('../resources/textures/low_sky_tiles_Normal.png');

  texTrimsFloor.push(texTrimsFloor0); texTrimsFloor.push(texTrimsFloor1); texTrimsFloor.push(texTrimsFloor2);
  textureContainers.push(texTrimsFloor);

  //mesh_varanda  
  textureContainers.push(texbackBuildings);

  //mesh_props
  textureContainers.push(texBoxLamp);
}

function getOrtho(left : number, right : number, top : number, bottom : number, near : number, far : number) : mat4
{
  return mat4.fromValues( 2.0 / (right - left), 0.0, 0.0, 0.0,
                          0.0, 2.0 / (top - bottom), 0.0, 0.0,
                          0.0, 0.0, -2.0 / (far - near), 0.0,
                          -(right + left) / (right - left), -(top + bottom)/(top - bottom), -(far + near) / (far - near), 1.0 );
}

function main() {

  play_single_sound();

  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();

  var HDR = gui.addFolder('HDR');  
  var DOF = HDR.addFolder('DOF');
  DOF.add(controls, 'DOF');
  DOF.add(controls, 'Focal_Distance', 0.0, 500.0).step(1.0);
  DOF.add(controls, 'DOF_Iteration', 0.0, 16.0).step(1.0);

  var BLOOM = HDR.addFolder('Bloom');
  BLOOM.add(controls, 'Bloom');
  BLOOM.add(controls, 'Bloom_Iteration', 0.0, 64.0).step(1.0);

  var LENSFLARE = HDR.addFolder('Lens Flare');
  LENSFLARE.add(controls, 'LensFlare');
  LENSFLARE.add(controls, 'Lens_Intensity', 0.0, 5.0).step(0.1);
  LENSFLARE.add(controls, 'Lens_Ghost', 0.0, 8.0).step(1);
  LENSFLARE.add(controls, 'Lens_Dispersal', 0.0, 2.0).step(0.01);
  LENSFLARE.add(controls, 'Lens_Distortion', 0.0, 200.0).step(0.1);

  var TONEMAPPING = HDR.addFolder('Tone Mapping');
  TONEMAPPING.add(controls, 'ToneMapping');
  TONEMAPPING.add(controls, 'ToneClass', { None: 0, Linear: 1, SimpleReinhard: 2, lumaBased : 3, white : 4, RomBinDaHouse : 5, filmic : 6, Uncharted2 : 7 });
  TONEMAPPING.add(controls, 'Temperature', 0.0, 10000.0).step(10.0);

  var HBAO = gui.addFolder('HBAO');  
  HBAO.add(controls, 'HBAO');
  HBAO.add(controls, 'HBAO_Intensity', 0.0, 8.0).step(0.1);
  HBAO.add(controls, 'HBAO_Bias', 0.0, 2.0).step(0.01);
  HBAO.add(controls, 'HBAO_Max_Length', 0.0, 16.0).step(0.1);
  HBAO.add(controls, 'HBAO_StepSize', 1.0, 4.0).step(0.1);

  HDR.close();

  gui.add(controls, 'Artistic_Effect', { None: 0, Pointilism: 1, Oil_Painting: 2});

  gui.close();
  
  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  var distance = 100.0;
  //let LightDir : vec4 = vec4.fromValues();
  let lightPos : vec3 =  vec3.fromValues(10.0 , 13.0, 5.0);
  
  let lightFocus : vec3 = vec3.fromValues(2.0, 2.0, 0.0);

  let lightDir : vec3 = vec3.create();
  vec3.subtract(lightDir, lightPos, lightFocus);
  vec3.normalize(lightDir, lightDir);

  lightPos = vec3.fromValues(lightDir[0] * distance, lightDir[1] * distance, lightDir[2] * distance);

  let lightUp : vec3 = vec3.fromValues(0.0, 1.0, 0.0);

  var clip = 170.0;

  let orthoMat : mat4 =  getOrtho(-clip + 30.0, clip, -clip + 20.0, clip, 0.1, 1000.0);// mat4.create();
  //mat4.ortho(orthoMat, -clip + 30.0, clip, -clip + 20.0, clip, 0.1, 1000.0);
  
  let lightViewMat : mat4 = mat4.create();

  

  mat4.lookAt(lightViewMat, lightPos, lightFocus, lightUp);

  console.log(lightViewMat);

  let lightViewProjMat : mat4 = mat4.create();
  mat4.multiply(lightViewProjMat, orthoMat, lightViewMat);  

  var LightColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);

  

  var LightDir = vec4.fromValues(lightDir[0], lightDir[1], lightDir[2], 0.0);

  const camera = new Camera(vec3.fromValues(0, 9, 5), vec3.fromValues(0, 9, -10));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);

  const standardDeferred = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/standard-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/standard-frag.glsl')),
    ]);

  const standardShadowMapping = new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/standard-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/shadow.glsl')),
      ]);

  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    timer.updateTime();
    renderer.updateTime(timer.deltaTime, timer.currentTime);

    renderer.clear();
    renderer.clearGB();

    var DOFinfo = vec4.fromValues(camera.near, controls.Focal_Distance, camera.far * camera.far, camera.far*10.0);

    // TODO: pass any arguments you may need for shader passes
    // forward render mesh info into gbuffers
    renderer.renderToGBuffer(camera, standardDeferred, meshContainer, textureContainers );

    //Shadowmap
    renderer.renderShadowMap(camera, standardShadowMapping, lightViewProjMat, meshContainer );

   
    // render from gbuffers into 32-bit color buffer
    renderer.renderFromGBuffer(camera, DOFinfo, envTexture.texture, lightViewProjMat, LightColor, LightDir); // 0

   

    
    //HBAO
    if(controls.HBAO)
      renderer.renderHBAO(camera, vec4.fromValues( controls.HBAO_Intensity, controls.HBAO_Bias, controls.HBAO_Max_Length, controls.HBAO_StepSize));

    //Blur for DOF
    renderer.renderBlur_Horizontal(camera, DOFinfo, 0, controls.HBAO);
    renderer.renderBlur_Vertical(camera, DOFinfo);

    for(var D = 0; D < controls.DOF_Iteration - 1; D++)
    {
      renderer.renderBlur_Horizontal(camera, DOFinfo, 1, controls.HBAO);
      renderer.renderBlur_Vertical(camera, DOFinfo);
    }
     
    renderer.renderDOF(camera, DOFinfo, controls.HBAO);

    //Bloom
    renderer.renderBloom(camera, controls.HBAO);

    //Blur for BLOOM
    renderer.renderBBlur_Horizontal(camera, 0);
    renderer.renderBBlur_Vertical(camera);

    for(var B = 0; B < controls.Bloom_Iteration - 1; B++)
    {
      renderer.renderBBlur_Horizontal(camera, 1);
      renderer.renderBBlur_Vertical(camera);
    }

     // Lens Flare
    //renderer.renderLensFlare(camera, lightViewProjMat);

    renderer.renderComposition(camera, controls.DOF, controls.Bloom, controls.HBAO, controls.LensFlare, vec4.fromValues(controls.Lens_Ghost, controls.Lens_Dispersal, controls.Lens_Distortion, controls.Lens_Intensity));

    //ToneMapping
    renderer.renderPostToneMapping(controls.ToneMapping, controls.ToneClass, controls.Temperature);
    
    if(controls.Artistic_Effect == 0)
    {
      renderer.renderPresent(camera);
    }
    else if(controls.Artistic_Effect == 1)
    {
      renderer.renderGenerateDots(camera);
      renderer.renderPointillism(camera);
     
    }
    else if(controls.Artistic_Effect == 2)
    {
      renderer.renderOilPainting(camera);
    }
    
      

    stats.end();
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}


function setup() {
  timer.startTime = Date.now();
  loadOBJText();
  main();
}

setup();
