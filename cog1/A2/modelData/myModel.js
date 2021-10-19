/**
 * Empty object for groups in scenegraph.
 * 
 * @namespace cog1.data
 * @module empty
 */
define(["exports", "data"], function(exports, data) {
	"use strict";

	/**
	 * Create an instance of the model defined in this module.
	 * 
	 * @parameter object with fields:
	 * @returns instance of this model.
	 */
	exports.create = function(parameter) {
		
		if(parameter) {
			var scale = parameter.scale;
		}
		// Set default values if parameter is undefined.
		if(scale == undefined){
			scale = 200;
		}

		// Instance of the model to be returned.
		var instance = {};

		instance.vertices = [
			// bottom (y=-1)
			[-1,-1, 1],
			[ 1,-1, 1],
			[ 1,-1,-1],
			[-1,-1,-1],
			// top (y=+1)		
			[-1,1, 1],
			[ 1,1, 1],
			[ 1,1,-1],
			[-1,1,-1],
		];
		instance.polygonVertices = [
			[3,2,1,0],
			[4,5,6,7],
			[4,0,1,5],
			[1,2,6,5],
			[6,2,3,7],
			[3,0,4,7],
			[3,2,1,0],
			[4,5,6,7],
			[4,0,1,5],
			[1,2,6,5],
			[6,2,3,7],
			[3,0,4,7]
		];	
		instance.polygonColors = [6,8];
		
		return instance;		
	};
});