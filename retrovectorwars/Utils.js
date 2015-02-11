/*

	UTILITIES

*/
'use strict';

Math.seed = 6;

Math.seededRandom = function(min, max) {
    max = max || 1;
    min = min || 0;
    Math.seed = (Math.seed * 9301 + 49297) % 233280;
    var rnd = Math.seed / 233280; 
    return min + rnd * (max - min);
}

var GLUtils={

	compileShader: function(vertex,fragment) 
	{
		var program  = gl.createProgram();
		
		var shader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(shader, vertex);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0) console.error(gl.getShaderInfoLog(shader));
		gl.attachShader(program, shader);

		shader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(shader, fragment);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0) console.error(gl.getShaderInfoLog(shader));
		gl.attachShader(program, shader);
		
		gl.linkProgram(program);

		return program;	
	}

}
