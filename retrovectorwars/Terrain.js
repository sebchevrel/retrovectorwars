
/*
		TERRAIN CLASS
*/
'use strict';
function Terrain(definition) 
{
	this.tileRange	=7;		// how many tiles away from camera we look
	this.gridSize	=500;	// the size of one square
	this.tileSize 	=10000;	// the size of a tile (must be multiple of grid size)
	this.maxHeight 	=10000;	// maximum terrain height
	
	// optimizations
	this.tileSizeHalf=this.tileSize/2;
	this.tileSizeDouble=this.tileSize*2;
	// three.js 
	this.material=null;
	this.geometry=null;
	this.scene=null;
	// holds the tiles
	this.tiles={};
	this.tileCache={};
	
	// PARSE DEFINITION
	for(var index in definition) {
		if(definition.hasOwnProperty(index)) this[index]=definition[index];
	}
}

Terrain.perlin=new ImprovedNoise();

Terrain.prototype.getCollisionTiles=function(position) 
{	
	// ADD ALL TILES ONE AWAY FROM PLAYER TO COLLIDABLE LIST
	var tile_x=Math.floor((position.x ) / this.tileSize);
	var tile_z=Math.floor((position.z ) / this.tileSize);
	var start_x=tile_x-1;
	var end_x=start_x+2;
	var start_z=tile_z-1;
	var end_z=start_z+2;

	var collidableMeshList=[];
	for(var z=start_z;z<=end_z;z++) 
	{
		for(var x=start_x; x<=end_x; x++) 
		{	
			var tileID=x+'x'+z;
			if (this.tiles.hasOwnProperty(tileID)) collidableMeshList.push(this.tiles[tileID].mesh);
		}
	}

	return collidableMeshList;
}

Terrain.prototype.update=function(camera) 
{
	// GET TILE FOR PLAYER POSITION 
	var player_tile_x=Math.floor((camera.position.x ) / this.tileSize);
	var player_tile_z=Math.floor((camera.position.z ) / this.tileSize);
	// WE'RE TESTING ALL THE TILES AROUND IT
	var start_x=player_tile_x-this.tileRange;
	var end_x=start_x+this.tileRange*2;
	var start_z=player_tile_z-this.tileRange;
	var end_z=start_z+this.tileRange*2;
	var visible_tiles={};	
	// LIST ALL TILES THAT ARE IN THE VIEW
	for(var z=start_z;z<=end_z;z++) 
	{
		for(var x=start_x; x<=end_x; x++) 
		{				
			var tileID=x+'x'+z;
			var tilePos=new THREE.Vector3(x*this.tileSize+this.tileSizeHalf-camera.position.x, -camera.position.y, z*this.tileSize+this.tileSizeHalf-camera.position.z )
			var distance=tilePos.length();
			tilePos.divideScalar(distance)
			var dot=tilePos.dot(camera.direction);			
			// DOT PRODUCT AND DISTANCE DETERMINES VIEW
			if ( (dot>-0.4 && distance<70000) || distance<this.tileSizeDouble ) {
				visible_tiles[tileID]=1;
				if (! this.tiles.hasOwnProperty(tileID))  this.createTile(x,z);		
			}				
		}
	}
	// REMOVE TILES THAT ARE NOT VISIBLE
	for(var a in this.tiles) if (this.tiles.hasOwnProperty(a) && ! visible_tiles.hasOwnProperty(a)) this.removeTile(a);
}

Terrain.prototype.getHeight=function(x,z) 
{
	return(Math.sin(x*0.00015)*Math.cos(z*0.00013)*this.maxHeight)
	//return(Math.sin( 0.00000005*(x*x+z*z))*this.maxHeight*0.2 ) 
//*
	//return ( Terrain.perlin.noise(Math.abs(x+10000)/10000,100,Math.abs(z+10000)/10000)*5000)
	return Math.max(-this.maxHeight,0+
		Math.sin(x*0.000031-4)*
		Math.sin(x*0.00027)*
		Math.sin((x)*0.0000051+2)*
		Math.sin(z*0.000051+1)*
		Math.sin(z*0.0000091-1)*
		Math.sin(z*0.00031+2)*
		this.maxHeight +
		Terrain.perlin.noise(Math.abs(x+10000)/10000,100,Math.abs(z+10000)/10000)*5000
	);
	//*/

	// PERLIN TERRAIN
	var octaves=5;
	var ratio=3;
	var height=0;
	var quality=200
	var step=500;
	var flatBottom=-1000
	var flatTop=8000;
	
	var ax=Math.abs(x);
	var az=Math.abs(z);

	for(var i=0; i<octaves; i++) {
		height+= Terrain.perlin.noise( ax/quality, 100 , az/quality ) * quality*0.5
		quality*=ratio;
	}
	return Math.floor(Math.min(flatTop,Math.max(flatBottom,height)-flatBottom)/step)*step;
}

Terrain.prototype.createTile=function(tile_x,tile_z) 
{
	var tile_id=tile_x+'x'+tile_z;

	if(this.tileCache[tile_id]) {
		this.tiles[tile_id]=this.tileCache[tile_id];
		this.scene.add(this.tiles[tile_id].mesh);
		return;
	}

	var x_start	=	tile_x*this.tileSize;
	var x_end	=	x_start+this.tileSize;
	var z_start	=	tile_z*this.tileSize;
	var z_end	=	z_start+this.tileSize;

	var tileGeometry=new THREE.Geometry();
	var ROW_SIZE=Math.floor(this.tileSize/this.gridSize)+1;
	var index=0;

	for(var z=z_start; z<=z_end; z+=this.gridSize) 
	{
		for(var x=x_start; x<=x_end; x+=this.gridSize)
		{
			var y=this.getHeight(x,z);
			tileGeometry.vertices.push(new THREE.Vector3(x,y,z));	
			if (z>z_start && x>x_start) 
			{
				tileGeometry.faces.push(new THREE.Face3(index-ROW_SIZE,index,index-1) )
				tileGeometry.faceVertexUvs[ 0 ].push( [ new THREE.Vector2(0,0) , new THREE.Vector2(1,0), new THREE.Vector2(1,1) ] );
				tileGeometry.faces.push(new THREE.Face3(index-1,index-1-ROW_SIZE,index-ROW_SIZE) )
				tileGeometry.faceVertexUvs[ 0 ].push( [ new THREE.Vector2(1,1) , new THREE.Vector2(0,1), new THREE.Vector2(0,0) ] );
			}
			index++;
		}
	}
	tileGeometry.computeBoundingSphere();
	tileGeometry.computeFaceNormals();
	//tileGeometry.computeVertexNormals();	
	
	var tile={
		mesh:new THREE.Mesh(tileGeometry,this.material)
	};
	
	tile.mesh.name='tile'+tile_x+'x'+tile_z;

	this.tiles[tile_x+'x'+tile_z]=tile;				
	this.scene.add( tile.mesh );
}

Terrain.prototype.removeTile=function(tile_id) 
{
	this.scene.remove(this.tiles[tile_id].mesh);
	this.tileCache[tile_id]=this.tiles[tile_id];
	delete this.tiles[tile_id];
	/*
	this.tiles[tile_id].mesh.geometry.dispose();
	delete this.tiles[tile_id];
	*/
}