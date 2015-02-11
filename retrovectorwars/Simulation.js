/*
	
	SIMULATION CLASS

*/
'use strict';
function Simulation(definition) 
{
	this.objects=[];
		
	this.avgPosition=new THREE.Vector3();
	
	this.clanAvgPos={};
	this.clanAvgVel={};
	this.clanAvgCount={};

	// PARSE DEFINITION
	for(var index in definition) {
		if(definition.hasOwnProperty(index)) this[index]=definition[index];
	}
}

Simulation.prototype.resetDemo=function()
{
	this.player.kill();
	for(var i=0; i<this.objects.length;i++)
	{
		if (this.objects[i]!=this.player) this.objects[i].spawn();
	}
}

Simulation.prototype.resetGame=function()
{
	for(var i=0; i<this.objects.length;i++)
	{
		if (this.objects[i]!=this.player) this.objects[i].spawn();
	}

	// start position at average of own clan
	
	this.player.position.copy(this.avgPosition);	
	this.player.position.y=20000;
	this.player.targetPitch=0;
	this.player.targetHeading=0;
	this.player.targetRoll=0;
	this.player.targetTurnSpeed=0;
	this.player.speed=3000;
	this.player.hitPoints=20;
	this.player.isDead=false;
	this.player.mesh.visible=true;

	
}

Simulation.prototype.update=function(delta) 
{
	// do the average positions & set up tiles
	this.avgPosition.set(0,0,0);
	var count=0;
	this.clanAvgPos={};
	this.clanAvgVel={};
	this.clanAvgCount={};

	for(var i=0; i<this.objects.length; i++) 
	{
		if (this.objects[i].isDead) continue;
		// global average position of all ships
		this.avgPosition.add(this.objects[i].position);
		count++;
		// avg position for each clan
		if(this.clanAvgPos.hasOwnProperty(this.objects[i].clan))
		{
			this.clanAvgPos[this.objects[i].clan].add(this.objects[i].position);
			this.clanAvgVel[this.objects[i].clan].add(this.objects[i].velocity);
			this.clanAvgCount[this.objects[i].clan]++;
		} else {
			this.clanAvgPos[this.objects[i].clan]=this.objects[i].position.clone();
			this.clanAvgVel[this.objects[i].clan]=this.objects[i].velocity.clone();
			this.clanAvgCount[this.objects[i].clan]=1;
		}
		// reset the avoid vector
		this.objects[i].avoidVector.set(0,0,0);
	}
	// divide totals by count (avg)
	this.avgPosition.divideScalar(count); 
	for(var i in this.clanAvgPos) if(this.clanAvgPos.hasOwnProperty(i)) {
		this.clanAvgPos[i].divideScalar(this.clanAvgCount[i]);
		this.clanAvgVel[i].divideScalar(this.clanAvgCount[i]);
	}
	

	// do avoidance vector
	var vector,distance;
	for(var i=0; i<this.objects.length; i++) 
	{
		if (this.objects[i].isDead) continue;
		for(var j=i+1; j<this.objects.length; j++) 
		{
			if (this.objects[j].isDead) continue;
			vector=this.objects[i].position.clone().sub(this.objects[j].position);
			distance=vector.lengthSq();
			vector.multiplyScalar(100000/distance);
			this.objects[i].avoidVector.add(vector);
			this.objects[j].avoidVector.sub(vector);	
		}
	}
	

	// update the objects
	for(var i=0; i<this.objects.length; i++) 
	{
		if (this.objects[i].isDead) continue;
		
		this.objects[i].avgVelocity=this.clanAvgVel[this.objects[i].clan];
		this.objects[i].avgVelocity.y=0;
		this.objects[i].avgPosition=this.clanAvgPos[this.objects[i].clan];
		
		this.objects[i].update(delta);
		
		// DO COLLISION DETECTION
		var collidableMeshList=[];
		if(this.terrain) collidableMeshList=this.terrain.getCollisionTiles(this.objects[i].position);
		for(var j=0; j<this.objects.length; j++) {
			if (i!=j && ! this.objects[j].isDead) 
				collidableMeshList.push(this.objects[j].mesh)
		}
	
		// CREATE RAYS FOR DIFFERENT PARTS
		var wingVector=this.objects[i].lateral.clone().multiplyScalar(325);
		var rays=[
			// main axis
			{ pos: this.objects[i].position, direction: this.objects[i].direction, distance: this.objects[i].speed*delta }, 
			// wings
			{ pos: this.objects[i].position.clone().add(wingVector), direction: this.objects[i].direction, distance: this.objects[i].speed*delta }, 
			{ pos: this.objects[i].position.clone().sub(wingVector), direction: this.objects[i].direction, distance: this.objects[i].speed*delta }, 
			// up
			{ pos: this.objects[i].position.clone, direction: this.objects[i].up, distance: 100 }

		];

		var ray = new THREE.Raycaster();		
		var collisions;
		for(var j=0; j<rays.length; j++) {
			ray.set(rays[j].pos,rays[j].direction);
			collisions=ray.intersectObjects( collidableMeshList );
			if (collisions.length) {
				 if (collisions[0].distance<=rays[j].distance) 
				 	this.onCollision(this.objects[i],collisions[0])
			}
		}
		
	}
}

Simulation.prototype.getRandomActiveShip=function()
{
	var availableShips=[];
	for(var i=0; i<this.objects.length; i++) {
		if(! this.objects[i].isDead) availableShips.push(this.objects[i]);
	}
	if(availableShips.length) return availableShips[Math.floor(Math.random()*availableShips.length)];
	else return null;
}

Simulation.prototype.getAvailableTargets=function(object)
{
	var availableTargets=[];
	for(var i=0; i<this.objects.length; i++) {
		if(this.objects[i]!=object) {
			if(this.objects[i].clan!=object.clan) {
				if(! this.objects[i].isDead) {
					availableTargets.push(this.objects[i]);
				}
			}
		}
	}
	return availableTargets;
}

Simulation.prototype.addChild=function(object)
{
	object.simulation=this;
	this.objects.push(object);
}

Simulation.prototype.removeChild=function(object)
{
	for(var i=0; i<this.objects.length; i++) if(this.objects[i]===object) { this.objects.splice(i,1); break; }
}