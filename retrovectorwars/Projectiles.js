/*

	PROJECTILES CLASS

	Handles animation, and collision detection of lasers
	Rendered as GL_LINES

*/
'use strict';
function Projectiles(definition)
{
	// DEFAULTS
	this.maxCount=1000;
	this.timeToLive=1.5;
	this.nextItem=0;
	this.targets=[];
	
	//this.material = new THREE.LineBasicMaterial({ color:0x00ff00, linewidth:3, vertexColors: false, fog:true });

	var particles_vs=[
		//"attribute vec4 customColor;",
		"varying vec4 vColor;",
		"void main() {",
		"	vColor = vec4(0.0,1.0,0.0,0.5);",
		"	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
		"	gl_PointSize = 10.0; //( 300.0 / length( mvPosition.xyz ) );",
		"	gl_Position = projectionMatrix * mvPosition;",
		"}"
	].join("\n");

	var particles_fs=[
		"varying vec4 vColor;",
		"void main() {",
		"	gl_FragColor = vColor ; //* texture2D( texture, gl_PointCoord );",
		"}"
	].join("\n");

	this.attributes={
		//customColor: { type: 'v4', value: [] } 
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
		linewidth:2,
		depthTest:true,
		depthWrite:true,
		transparent:true
	});

	this.scene=null;
	this.terrain=null;
	this.onCollision=null;

	// PARSE DEFINITION
	for(var index in definition) {
		if(definition.hasOwnProperty(index)) this[index]=definition[index];
	}

	this.elements=[];
	
	this.geometry = new THREE.Geometry();
	for(var i=0; i<this.maxCount*2; i++) this.geometry.vertices.push(new THREE.Vector3(0,0,0))
	this.geometry.dynamic=true;

	this.mesh = new THREE.Line( this.geometry, this.material, THREE.LinePieces);
	this.scene.add(this.mesh);
}

Projectiles.prototype.fire=function(owner)
{
	var lateral=owner.lateral.multiplyScalar(30);

	var projectile=
	{
		owner: owner,
		position: owner.position.clone().add(lateral),
		direction: owner.direction.clone(),
		speed: 40000,
		time: 0,
		ID: this.nextItem
	}
	this.elements.push(projectile);
	this.nextItem=(this.nextItem+1) % (this.maxCount);
	
	var projectile=
	{
		owner: owner,
		position: owner.position.clone().sub(lateral),
		direction: owner.direction.clone(),
		speed: 40000,
		time: 0,
		ID: this.nextItem
	}
	this.elements.push(projectile);
	this.nextItem=(this.nextItem+1) % (this.maxCount);

	
}

Projectiles.prototype.addTarget=function(target) 
{
	this.targets.push(target);
}

Projectiles.prototype.removeTarget=function(target) 
{
	for(var i=0; i<this.targets.length; i++) if (this.targets[i]===target) { this.targets.splice(i--,1); break; }
}

Projectiles.prototype.testCollisions=function(collidableMeshList,position,direction,speed)
{
	// RAY IN DIRECTION OF MOTION
	var ray = new THREE.Raycaster( position, direction );	
	// TEST THESE 9 TILES AGAINST THE RAY FOR COLLISIONS
	var collisionResults = ray.intersectObjects( collidableMeshList );
	if ( collisionResults.length > 0  ) {
		//console.log('collision',collisionResults)
		return collisionResults;
	}
	return null;
}

Projectiles.prototype.update=function(delta)
{
	for(var i=0; i<this.elements.length; i++)
	{
		var factor=this.elements[i].speed*delta;
		var vx=this.elements[i].direction.x*factor;
		var vy=this.elements[i].direction.y*factor;
		var vz=this.elements[i].direction.z*factor;

		var ID2=this.elements[i].ID*2;

		this.mesh.geometry.vertices[ID2].copy(this.elements[i].position);
		
		// UPDATE POSITION
		this.elements[i].position.x+=vx
		this.elements[i].position.y+=vy
		this.elements[i].position.z+=vz
		
		this.mesh.geometry.vertices[ID2+1].copy(this.elements[i].position);			
		
		// get terrain collision tiles
		var collidableMeshList=[];//this.terrain.getCollisionTiles(this.elements[i].position);
		// add targets
		for(var j=0; j<this.targets.length; j++) if (! this.targets[j].isDead) collidableMeshList.push(this.targets[j].mesh);
		// test collisions	
		var collisions=this.testCollisions(collidableMeshList,this.elements[i].position,this.elements[i].direction,this.elements[i].speed)
		if(collisions && collisions[0].distance<this.elements[i].speed*delta) {
			// dispatch event
			if (this.onCollision) this.onCollision(this.elements[i],collisions[0]);
			this.elements[i].time=this.timeToLive;
		}					
		// time to live
		this.elements[i].time+=delta;
		if (this.elements[i].time>this.timeToLive) {
			this.mesh.geometry.vertices[ID2].set(0,0,0)
			this.mesh.geometry.vertices[ID2+1].set(0,0,0)
			this.elements.splice(i--,1);
		} 
	}	
	//this.mesh.geometry.computeLineDistances();
	//this.mesh.geometry.lineDistancesNeedUpdate=true;
	this.mesh.geometry.verticesNeedUpdate=true;
}
