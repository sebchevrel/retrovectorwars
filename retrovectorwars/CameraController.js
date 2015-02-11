/*

	CAMERA CONTROL
	Directly controls the three.js camera object to animate camera modes

*/
'use strict';
function CameraController(definition) 
{
	// DEFAULTS
	this.subject=null;
	this.target=null;
	this.mode=1;
	this.camera=null;
	this.simulation=null;

	this.isAnimating=false;
	this.animationStart=0;
	this.animationDuration=1;

	this.chaseHover=500;

	this.chaseDistance=1000;
	this.chaseAzimuth=Math.PI/8;
	this.chaseHeading=Math.PI/8;

	this.time=0;

	// PARSE DEFINITION
	for(var index in definition) {
		if(definition.hasOwnProperty(index)) this[index]=definition[index];
	}

	this.camera.direction=new THREE.Vector3(0,0,0);
}

CameraController.FIRST_PERSON=	1; // from subject perspective
CameraController.CHASE_CAM=		2; // looking behind target in its direction
CameraController.GOD_CAM=		3; // looking down at everything

CameraController.prototype.update=function(delta)
{
	this.time+=delta;

	switch(this.mode) {

		case CameraController.FIRST_PERSON:

			this.camera.position.copy(this.subject.position)
			//this.camera.position.add(new THREE.Vector3(0,0,0));
			this.camera.up.copy(this.subject.up);
			this.camera.target=this.subject.direction.clone().add(this.camera.position);	
			this.camera.direction=this.subject.direction.clone();
			this.camera.lookAt(this.camera.target);
			break;

		case CameraController.CHASE_CAM:

			this.camera.position.copy(this.target.position)
			var offset=this.target.direction.clone().multiplyScalar(this.chaseDistance);
			if(this.chaseHover) {
				offset.x+=Math.sin(this.time*0.31)*this.chaseHover;
				offset.y+=Math.sin(this.time*0.24+1)*this.chaseHover;
				offset.z+=Math.sin(this.time*0.18+2)*this.chaseHover;
			}
			this.camera.position.sub(offset);
			this.camera.up.set(0,1,0);
			this.camera.target=this.target.position.clone();
			this.camera.direction=this.target.direction.clone();
			this.camera.lookAt(this.camera.target);
			break;

		case CameraController.GOD_CAM:

			var avgPosition=new THREE.Vector3(0,0,0);
			if (this.target.isDead==true) {
				avgPosition=this.simulation.avgPosition.clone();
			} else avgPosition.copy(this.target.position);
			
			avgPosition.y=30000;

			this.camera.position.copy(avgPosition);
			this.camera.up.set(0,1,0);
			this.camera.direction.set(0,-1,0);
			this.camera.lookAt(new THREE.Vector3(avgPosition.x,0,avgPosition.z));
			break;


	}
}

CameraController.prototype.animateTo=function(duration,definition)
{
	// PARSE DEFINITION
	for(var index in definition) {
		if(definition.hasOwnProperty(index)) this[index]=definition[index];
	}	
	this.isAnimating=true;
	this.animationStart=this.time;
	this.animationDuration=duration;
}


CameraController.prototype.cutTo=function(definition)
{
	// PARSE DEFINITION
	for(var index in definition) {
		if(definition.hasOwnProperty(index)) this[index]=definition[index];
	}
	this.isAnimating=false;	
}