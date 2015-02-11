/*

	PARTICLE SYSTEM CLASS
	Manages particles for impacts, hits and explosions

*/
'use strict';
function Particles(definition) 
{
	// DEFAULTS
	this.maxCount=1000;
	this.timeToLive=3;
	this.nextItem=0;

	this.perImpact=5;
	this.perHit=10;
	this.perExplosion=50;
	
	var particles_vs=[
		"attribute float size;",
		"attribute vec4 customColor;",
		"varying vec4 vColor;",
		"void main() {",
		"	vColor = customColor;",
		"	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
		"	gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );",
		"	gl_Position = projectionMatrix * mvPosition;",
		"}"
	].join("\n");

	var particles_fs=[
		//"uniform sampler2D texture;",
		"varying vec4 vColor;",
		"void main() {",
		"	gl_FragColor = vColor ;//* texture2D( texture, gl_PointCoord );",
		"}"
	].join("\n");

	this.attributes={
		size: {type: 'f', value: []},
		customColor: { type: 'v4', value: [] } 
	};

	this.uniforms={	
		//texture:   { type: "t", value: null } 
	}

	
	this.material=new THREE.ShaderMaterial({
		uniforms: this.uniforms,
		attributes: this.attributes,
		vertexShader: particles_vs,
		fragmentShader: particles_fs,
		blending:THREE.NormalBlending,
		depthTest:true,
		depthWrite:false,
		transparent:true
	});
	
	this.elements=[];
	
	// PARSE DEFINITION
	for(var index in definition) {
		if(definition.hasOwnProperty(index)) this[index]=definition[index];
	}

	this.geometry = new THREE.Geometry();
	for(var i=0; i<this.maxCount; i++) 
	{
		this.geometry.vertices.push(new THREE.Vector3(0,0,0))
	}
	this.geometry.dynamic=true;

	this.mesh = new THREE.ParticleSystem( this.geometry, this.material);
	this.mesh.dynamic=true;
	
	this.colors=this.attributes.customColor.value;
	this.sizes=this.attributes.size.value;
	
	for(var i=0; i<this.maxCount; i++) 
	{
		this.colors[i]=new THREE.Vector4(1,1,1,1);
		this.sizes[i]=100;
	}
	
	this.scene.add(this.mesh);
}

Particles.prototype.IMPACT=0;
Particles.prototype.EXPLOSION=1;


Particles.prototype.createImpact=function(position) 
{
	for(var i=0; i<this.perImpact; i++) 
	{
		var pitch=Math.random()*Math.PI;
		var heading=Math.random()*Math.PI*2;
		var velocity=new THREE.Vector3(Math.cos(pitch)*Math.cos(heading),Math.sin(pitch),Math.cos(pitch)*Math.sin(heading));	

		this.elements.push({
			ID: this.nextItem,
			position: position.clone(),
			velocity: velocity.multiplyScalar(2000),
			type: Particles.IMPACT,
			time:0
		});
		
		var val=Math.random();
		this.colors[this.nextItem].set(val*0.5,val,val*0.5,1);
		this.sizes[this.nextItem]=100;

		this.nextItem=(this.nextItem+1) % this.maxCount;
	}
}

Particles.prototype.createHit=function(position,color) 
{
	if (color===undefined) color={r:1,g:1,b:1,a:1}

	for(var i=0; i<this.perHit; i++) 
	{
		var pitch=Math.random()*Math.PI*2;
		var heading=Math.random()*Math.PI*2;
		var velocity=new THREE.Vector3(Math.cos(pitch)*Math.cos(heading),Math.sin(pitch),Math.cos(pitch)*Math.sin(heading));	

		this.elements.push({
			ID: this.nextItem,
			position: position.clone(),
			velocity: velocity.multiplyScalar(2000),
			type: Particles.IMPACT,
			time:0
		});
		
		var val=Math.random();
		this.colors[this.nextItem].set(color.r*val,color.g*val,color.b*val,color.a);
		this.sizes[this.nextItem]=100;

		this.nextItem=(this.nextItem+1) % this.maxCount;
	}
}

Particles.prototype.createExplosion=function(position,color) 
{
	if (color===undefined) color={r:1,g:1,b:1,a:1}

	for(var i=0; i<this.perExplosion; i++) 
	{
		var pitch=Math.random()*Math.PI*2;
		var heading=Math.random()*Math.PI*2;
		var velocity=new THREE.Vector3(Math.cos(pitch)*Math.cos(heading),Math.sin(pitch),Math.cos(pitch)*Math.sin(heading));	

		this.elements.push({
			ID: this.nextItem,
			position: position.clone(),
			velocity: velocity.multiplyScalar(2000),
			type: Particles.EXPLOSION,
			time:0
		});
		var val=Math.random();
		this.colors[this.nextItem].set(color.r*val,color.g*val,color.b*val,color.a);
		this.sizes[this.nextItem]=400;

		this.nextItem=(this.nextItem+1) % this.maxCount;
	}
}
	
Particles.prototype.update=function(delta) 
{
	var gravity=3000*delta;
	for(var i=0; i<this.elements.length; i++) {
		var el=this.elements[i];
		if (el.time>=0) {
			var t=el.time/this.timeToLive;
			var t1=1-t;
			
			this.mesh.geometry.vertices[el.ID].copy(el.position);	
			
			this.colors[el.ID].w=t1;
			
			// update position
			el.position.add(el.velocity.clone().multiplyScalar(delta));
			
			switch(el.type) {
				case Particles.IMPACT:
					el.velocity.y-=gravity;
					break;
				case Particles.EXPLOSION:
					this.colors[el.ID].r=1;
					this.colors[el.ID].g=1-t;
					this.colors[el.ID].b=1-t*2;
					this.sizes[el.ID]=t*10;	
					break;
			}
			
		}
		el.time+=delta;			
		if (el.time>this.timeToLive) {
			this.mesh.geometry.vertices[el.ID].set(0,0,0);
			this.colors[el.ID].w=0;
			this.elements.splice(i--,1);
		}
	}
	this.attributes.customColor.needsUpdate = true;
	this.attributes.size.needsUpdate = true;
	this.mesh.geometry.verticesNeedUpdate=true;		
}