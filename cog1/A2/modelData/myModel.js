/**
 * 3D Data Store for a model.
 * Missing properties/arrays (commented out)
 * are mixed in from data module.
 *  
 * @namespace cog1.data
 * @module cube
 */
 define(["exports", "data"], function(exports, data) {
	"use strict";

	/**
	 * Create an instance of the model defined in this module.
	 * 
	 * @parameter object with fields:
	 * @parameter scale is the edge length of the cube.
	 * @returns instance of this model.
	 */
	 exports.create = function(parameter) {
		
		if(parameter) {
			var scale = parameter.scale;
			var textureURL = parameter.textureURL;
			// Each face shows a different area of the given texture (e.g, a dice).
			var sixFacesTexture = parameter.sixFacesTexture;
		}
		// Set default values if parameter is undefined.
		if(scale == undefined){
			scale = 200;
		}
		if(textureURL == undefined){
			textureURL = "";
		}
		if(sixFacesTexture == undefined){
			sixFacesTexture = false;
		}

		var instance = {};
		instance.vertices = [
			[-0.2,-0.2, 0.2], //0
			[ 0.01,-0.2, 0.2], //1
			[ 0.01,-0.2,-0.2], //2
			[-0.2,-0.2,-0.2], //3

			[-0.2,0.2, 0.2], //4
			[ 0.01,0.2, 0.2], //5
			[ 0.01,0.2,-0.2], //6
			[-0.2,0.2,-0.2], //7

			[0.2,-0.2, 0.2], //8 = 0
			[ 0.45,-0.2, 0.2], //9 = 1
			[ 0.45,-0.2,-0.2], //10 = 2
			[0.2,-0.2,-0.2], //11 = 3
				
			[0.2,0.2, 0.2], //12 = 4
			[ 0.45,0.2, 0.2], //13 =5
			[ 0.45,0.2,-0.2], //14 =6
			[0.2,0.2,-0.2], //15 =7
		];

		instance.polygonVertices = [
			[3,2,1,0],
			[4,5,6,7],
			[4,0,1,5],
			[1,2,6,5],
			[6,2,3,7],
			[3,0,4,7]

			[11,10,9,8],
			[12,13,14,15],
			[12,8,9,13],
			[9,10,14,13],
			[14,10,11,15],
			[11,8,12,15]
		];	

		instance.polygonColors = [2,8,2,8,2,8,2,8,2,8,2,8];

		if( ! sixFacesTexture){
	        // Use default texture coordinates.
			// instance.textureCoord = [];	
			// For order of corners of faces, see polygonVertices.
			instance.polygonTextureCoord = [
				[1,2,3,0],
				[1,2,3,0],
				[1,0,3,2],
				[3,0,1,2],
				[3,0,1,2],
				[3,0,1,2]

				[9,10,11,8],
				[9,10,11,8],
				[9,8,11,10],
				[11,8,9,10],
				[11,8,9,10],
				[11,8,9,10]
			];
		} else {
			// BEGIN exercise Cube-Dice-Texture
			
			// Order 0 to 16 form bottom-left to top-right
			// line by line, indices in spatial order:
			instance.textureCoord = [];
			// ...

			// Use textureCoord in order given for textureCoord.
			// The order of corners of faces must fit the one given in polygonVertices.
			// Match orientation of face given for polygonVertices.
			// D=bottom/down, U=top/up, F=front, R=right, B=back, L=left
			// The mapping is explained on the texture image.
			// instance.polygonTextureCoord = [ ....];

			// END exercise Cube-Dice-Texture			
		}
		
		instance.textureURL = textureURL;

		data.applyScale.call(instance, scale);
		return instance;		
	};
});