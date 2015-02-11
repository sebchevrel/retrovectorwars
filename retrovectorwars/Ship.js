/*
	
	SHIP CLASS (PLAYER & ENNEMIES)

*/
'use strict';
function Ship(definition) 
{
	// DEFAULTS
	this.position 			= 	new THREE.Vector3(0,0,0);		// position
	this.direction 			=	new THREE.Vector3(0,0,0);		// normalized direction
	this.velocity 			=	new THREE.Vector3(0,0,0);		// direction * speed * delta
	this.avoidVector 		=	new THREE.Vector3(0,0,0);
	this.avgPosition 		=	new THREE.Vector3(0,10000,0);

	this.targetPitch 		=	0;
	this.targetRoll 		=	0;
	this.targetTurnSpeed 	=	0;
	this.targetSpeed 		=	0;

	this.heading 			=	0;
	this.pitch 				=	0;
	this.roll 				=	0;
	
	this.turnSpeed 			=	0;
	this.speed 				=	0;
		
	this.geometry 			= 	new THREE.CubeGeometry( 200, 100, 600 );
	this.material 			= 	new THREE.MeshPhongMaterial({color:0xffffff,shading:THREE.FlatShading})
	this.scene 				=	null;
	
	this.projectiles		=	null;

	this.fireID 			=	null;
	this.isFiring 			=	false;
	this.hitPoints 			=	10;
	this.score 				=	100;
	this.kills				=	0;
	this.isDead				=	false;

	this.target 			= 	null;
	this.mode 				=	0;
	this.headingFactor		=	10;
	this.velocityFactor		=	20;

	this.timeOut 			=	0;

	this.time 				= 	0;
	this.isHit 				= 	false;
	this.timeLastFired 		= 	0;

	
	// PARSE DEFINITION
	for(var index in definition) {
		if(definition.hasOwnProperty(index)) this[index]=definition[index];
	}

	// CREATE AND ADD MODEL
	if(this.scene && this.geometry && this.material) {
		this.mesh=new THREE.Mesh(this.geometry,this.material);
		if(this.name) this.mesh.name=this.name;
		this.mesh.ship=this;
		this.scene.add(this.mesh);
	} else {
		this.mesh=null;
	}
}

Ship.prototype.think=function (delta) 
{
	// PICK NEW TARGET IF NOT FIRED IN 2 MINUTES
	if ( (this.time-this.timeLastFired) > 120 || (this.target && this.target.isDead) ) {
		this.pickTarget();
	}

	var targetVector;
	if (this.target) {
		targetVector=this.target.position.clone().sub(this.position);
		targetDistance= targetVector.length();
		targetVector.add(this.target.velocity.clone().multiplyScalar(targetDistance*this.velocityFactor));
	}
	else {
		targetVector=this.avgPosition.clone().sub(this.position).add(this.avgVelocity.clone().multiplyScalar(1000));
	}

	// TARGET VECTOR AND DOT PRODUCT
	var targetDistance= targetVector.length();
	var targetNorm= targetVector.clone().divideScalar(targetDistance);
	var targetDot= targetNorm.dot(this.direction);
	
	// ADD AVOIDANCE TO TARGET
	targetVector.add(this.avoidVector);
	//this.position.add(this.avoidVector.multiplyScalar(0.01));

	if(this.timeOut<this.time) {
	
		// DETERMINE TURNING SPEED
		var headingToTarget=Math.atan2(targetVector.z,targetVector.x);
		var headingDifference=(headingToTarget-this.heading);
		while(headingDifference>Math.PI) headingDifference-=Math.PI*2;
		while(headingDifference<-Math.PI) headingDifference+=Math.PI*2;
		var absHeadingDiff=Math.abs(headingDifference);
		
		if (targetDot>0 || targetDistance>3000) { // he's in front, track him
			if (Math.random()<0.0001) {
				this.targetTurnSpeed=-this.targetTurnSpeed*0.75;
				this.timeOut=this.time+0.5+Math.random()*2.5;
			}
			else this.targetTurnSpeed=Math.min(1,Math.max(-1,headingDifference*this.headingFactor));	
		} else { // he's behind, keep turning the same direction
			if(Math.random()<0.001) {
				this.targetTurnSpeed=-this.targetTurnSpeed*0.75;
				this.timeOut=this.time+0.5+Math.random()*2.5;
			}
			else {
				//this.targetTurnSpeed=Math.min(1,Math.max(-1,this.targetTurnSpeed*100));	
				this.targetTurnSpeed=Math.min(1,Math.max(-1,-headingDifference*this.headingFactor));	
			}
		}

		// DETERMINE PITCH
		var pitchToTarget=Math.atan2(targetVector.y,targetVector.x);
		this.targetPitch=Math.max(-Math.PI,Math.min(Math.PI,pitchToTarget*0.020));
		this.targetRoll=this.targetTurnSpeed*Math.PI/2;

	}

	// FIRE CONTROL
	var minDot=0.9995;//1-100/targetDistance;
	if (this.target && targetDot>minDot && targetDistance<60000 && ! this.isFiring ) {
		this.isFiring=true;
		if(this.fireID) clearInterval(this.fireID);
		var that=this;
		this.timeLastFired=this.time;
		that.projectiles.fire(that)
		this.fireID=setInterval(function() { that.projectiles.fire(that) },150);
	}
	else {
		this.isFiring=false;
		if(this.fireID) clearInterval(this.fireID);
	}
}



Ship.prototype.spawn=function() {
	
	this.position.copy(this.avgPosition);
	this.position.x+=Math.random()*50000
	this.position.y+=Math.random()*5000
	this.position.z+=Math.random()*50000;

	this.heading=Math.random()*Math.PI*2;
	var turn=Math.random()*0.25+0.25;
	if (Math.random()>0.5) turn=-turn;
	this.targetTurnSpeed=turn;
	this.targetRoll=turn*Math.PI/4;
	this.speed=3000;
	this.targetPitch=0;
	this.isDead=false;
	this.hitPoints=10;
	this.mesh.visible=true;
	this.pickTarget();
}

Ship.prototype.kill=function() {
	this.speed=0;
	this.targetTurnSpeed=0;
	this.isDead=true;
	this.mesh.visible=false;
}

Ship.prototype.pickTarget=function() {
	var availableTargets=this.simulation.getAvailableTargets(this);
	if (availableTargets.length) this.target=availableTargets[Math.floor(Math.random()*availableTargets.length)];
	else this.target=null;
	this.timeLastFired=this.time;
}

Ship.prototype.update=function (delta) 
{
	if (this.isDead) return;
	if (this.name!='player') this.think(delta);

	this.time+=delta;
	var timestep=this.speed*delta;

	// INTERPOLATE INPUTS
	var interpolateSpeed=0.05;
	this.turnSpeed +=(this.targetTurnSpeed-this.turnSpeed)*interpolateSpeed;
	this.pitch+=(this.targetPitch-this.pitch)*interpolateSpeed;
	this.roll+=(this.targetRoll-this.roll)*0.02;

	// UPDATE HEADING / DIRECTION
	this.heading=(this.heading + this.turnSpeed*delta);
	while(this.heading>Math.PI) this.heading-=Math.PI*2;
	while(this.heading<-Math.PI) this.heading+=Math.PI*2;

	this.direction.set(Math.cos(this.pitch)*Math.cos(this.heading),Math.sin(this.pitch),Math.cos(this.pitch)*Math.sin(this.heading));	

	// UPDATE UP VECTOR FOR ROLL
	this.up= new THREE.Vector3(0,1,0);
	var matrix = new THREE.Matrix4(); matrix.makeRotationAxis( this.direction, this.roll ); 
	this.up.applyMatrix4( matrix );

	this.lateral=this.direction.clone().cross(this.up);
	
	// UPDATE POSITION
	this.velocity.copy(this.direction).multiplyScalar(timestep);
	this.position.add(this.velocity);
	
	// UPDATE MESH
	if (this.mesh) {
		this.mesh.position.copy(this.position);	
		this.mesh.up.copy(this.up);	
		this.mesh.lookAt(this.position.clone().add(this.direction));
	}
}

