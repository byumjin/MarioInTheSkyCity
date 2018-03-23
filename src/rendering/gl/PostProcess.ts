import Texture from './Texture';
import {gl} from '../../globals';
import {gParticleInfoBufferSize} from '../../globals';


import ShaderProgram, {Shader} from './ShaderProgram';
import Drawable from './Drawable';
import Square from '../../geometry/Square';
import {vec2, vec3, vec4, mat4} from 'gl-matrix';

class PostProcess extends ShaderProgram {
	screenQuad: Square;// = undefined; // Quadrangle onto which we draw the frame texture of the last render pass
	unifFrame: WebGLUniformLocation; // The handle of a sampler2D in our shader which samples the texture drawn to the quad
	unifFrame2: WebGLUniformLocation; // The handle of a sampler2D in our shader which samples the texture drawn to the quad

	
	name: string;

	constructor(fragProg: Shader, tag: string = "default", classP : number) {

		if(classP == 0)
		{
			super([new Shader(gl.VERTEX_SHADER, require('../../shaders/screenspace-vert.glsl')),
			fragProg]);

			console.log("classP : " + classP);
		}
		else if(classP == 1)
		{
			super([new Shader(gl.VERTEX_SHADER, require('../../shaders/stateDot-vert.glsl')),
			fragProg]);

			//console.log("classP : " + tag);
		}
		else
		{
			super([new Shader(gl.VERTEX_SHADER, require('../../shaders/particle-vert.glsl')),
			fragProg]);

			//console.log("classP : " + classP);
		}

		

		this.unifFrame = gl.getUniformLocation(this.prog, "u_frame");
		this.unifFrame2 = gl.getUniformLocation(this.prog, "u_frame2");
		
		

		

		this.use();
		this.name = tag;

		console.log(this.name + " is created.");

		// bind texture unit 0 to this location
		gl.uniform1i(this.unifFrame, 0); // gl.TEXTURE0

		//if (PostProcess.screenQuad === undefined)
		//{
			this.screenQuad = new Square(vec3.fromValues(0, 0, 0));
			this.screenQuad.create();

			if(classP == 0)
			{
				this.screenQuad.setColor();
			}
			else
			{
				let offsetsArray = [];
				let colorsArray = [];

				for(let i = 0; i < gParticleInfoBufferSize; i++) {
					for(let j = 0; j < gParticleInfoBufferSize; j++) {

					let xyz : vec3 = vec3.create();
					vec3.normalize(xyz, vec3.fromValues( Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5) );

					var len = Math.random();
					len = Math.sqrt(len);
					
					offsetsArray.push(j);
					offsetsArray.push(i);
					offsetsArray.push(0.5);

					colorsArray.push(Math.random()*2.0 - 1.0);
					colorsArray.push(Math.random()*2.0 - 1.0);
					colorsArray.push(Math.random());

					colorsArray.push( Math.random() + 1.0 ); // dot Size
					}
				}

				let offsets: Float32Array = new Float32Array(offsetsArray);
				let colors: Float32Array = new Float32Array(colorsArray);

				this.screenQuad.setNumInstances(gParticleInfoBufferSize * gParticleInfoBufferSize);
				this.screenQuad.setInstanceVBOs(offsets, colors);

				
			}
		//}

		
	}

	setFrame2(texture: WebGLTexture) {
		this.use();
		if (this.unifFrame2 != -1) {

			gl.uniform1i(this.unifFrame2, 1);

			gl.activeTexture(gl.TEXTURE1);
		    gl.bindTexture(gl.TEXTURE_2D, texture);
		}
	  }

	

  	draw() {
  		super.draw(this.screenQuad);
	  }
	  
	drawInstance() {
		super.drawInstnace(this.screenQuad);

		//console.log(this.name + this.screenQuad.numInstances);
	}

  	getName() : string { return this.name; }

}

export default PostProcess;
