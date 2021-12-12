/**
 * Rasterization algorithms.
 *
 * The raster module works on the polygon layer.
 *
 * @namespace cog1
 * @module raster
 */
define(["exports", "shader", "framebuffer", "data", "glMatrix"], //
function(exports, shader, framebuffer, data) {
    "use strict";
       
	// Drawing context for canvas.
	// Passed to initialize framebuffer.
	// As raster uses the framebuffer to access the canvas ctx is for debug.
	var ctx;
	// Width and height of the ctx are used for clipping.
	var width;
	var height;

	// Plane equation of polygon.
	var A = 1;
	var B = 1;
	var C = 1;
	var D = 1;
	// Pre-calculate for speed-up.
	// 1 / C.
	var inverseC;
	// A / C.
	var AdivC;

	// For each polygon we store all points from all edges
	// generated by the Bresenham algorithm.
	// They are use for the scanline fill algorithm.
	// After processing a polygon the data structures are reset.
	// The Structure is 2D: one array for every scanline.
	// Thus the array index is the y value.
	// An array-entry is again an object containing the x,z values
	// and for indices and weights for interpolation.
	// See addIntersection().
	var scanlineIntersection = [];

	// Data for bi-linear interpolation. Uses for exchange.
	// Filled on demand from the interpolation functions.
	var interpolationData = {};

	function init(_ctx, _bgColor) {
		ctx = _ctx;
		width = ctx.width;
		height = ctx.height;
		framebuffer.init(ctx, _bgColor);
	}

	/**
	 * Convenience function when start and end points are given as 3D-vectors
	 * and only lines (no filled polygons) are to be drawn.
	 * This is used to, e.g., draw normals, or a grid.
	 *
	 * @parameter st, end: start and end point of line segment.
	 */
	function drawLineBresenhamGivenStartEndPoint(st, end, color) {

		// Convert parameters to integer values.
		// Use (not not ~~) instead of Math.floor() for integer cast and rounding of X-Y values.
		// Leave Z as floating point for comparisons in z-buffer.
		drawLineBresenham(~~st[0], ~~st[1], st[2], ~~end[0], ~~end[1], end[2], color, false);
	}

	/**
	 * Calculate lines with Bresenham algorithm.
	 * Draw points or store intersections of the current edge for scanline,
	 * depending on the fill.
	 *
	 * On a step register only the left most point as an intersection.
	 *
	 * @parameter x,y,z: X-Y Start and end points should be integer values, Z should be floating point for Z-Buffer.
	 * @parameter storeIntersectionForScanlineFill: if false edges are only calculated to be filled with scanline but not drawn.
	 * @parameter [only for fill] edgeStartVertexIndex, edgeEndVertexIndex : Start and end of line segment stored in intersection for interpolation.
	 * @parameter [only for textureing] edgeStartTextureCoord, edgeEndTextureCoord : Texture uv-vectors (not the indices) for edge currently processed.
	 */
	function drawLineBresenham(startX, startY, startZ, endX, endY, endZ, color, storeIntersectionForScanlineFill, edgeStartVertexIndex, edgeEndVertexIndex, edgeStartTextureCoord, edgeEndTextureCoord) {

		// Let endX be larger than startX.
		// In this way on a shared edge between polygons the same left most fragment
		// is stored as intersection and the will never be a gap on a step of the edge.
		if(endX < startX) {
			return drawLineBresenham(endX, endY, endZ, startX, startY, startZ, color, storeIntersectionForScanlineFill, edgeEndVertexIndex, edgeStartVertexIndex, edgeEndTextureCoord, edgeStartTextureCoord);
		}

		if(!storeIntersectionForScanlineFill) {
			// Set rgbaShaded to rgba in case we do not apply shading.
			vec3.set(color.rgba, color.rgbaShaded);
			// set Alpha.
			color.rgbaShaded[3] = color.rgba[3];
		}

		var dX = endX - startX;
		var dY = endY - startY;
		var dXAbs = Math.abs(dX);
		var dYAbs = Math.abs(dY);

		// Determine the direction to step.
		var dXSign = dX >= 0 ? 1 : -1;
		var dYSign = dY >= 0 ? 1 : -1;

		// shorthands for speedup.
		var dXAbs2 = 2 * dXAbs;
		var dYAbs2 = 2 * dYAbs;
		var dXdYdiff2 = 2 * (dXAbs - dYAbs);
		var dYdXdiff2 = 2 * (dYAbs - dXAbs);

		// Decision variable.
		var e;
		// Loop variables.
		var x = startX;
		var y = startY;
		var z = startZ;

		// z is linearly interpolated with delta dz in each step of the driving variable.
		var dz;

		// Prepare bi-linear interpolation for shading and textureing.
		// Interpolated weight in interval [0,1] of the starting- and end-point of the current edge.
		// The weight is the relative distance form the starting point.
		// It is stored with an intersection for interpolation used for shading and textureing.
		// The interpolation step is done in synchronous to the driving variable.
		var interpolationWeight = 0;
		var deltaInterpolationWeight;

		// BEGIN exercise Bresenham
		if (startX === endX && startY === endY) {
			framebuffer.set(startX, startY, startZ, color);
			return;
		  }
	
		  framebuffer.set(x, y, getZ(x, y), color);
	
		  if (dXAbs >= dYAbs) {
			var y1 = y - dYSign;
			e = dXAbs - dYAbs2;
			while (x !== endX) {
			  x += dXSign;
			  if (e > 0) {
				e = e - dYAbs2;
			  } else {
				y += dYSign;
				e += dXdYdiff2;
			  }
			  if (startY !== endY && x !== endX && y !== y1 && y !== startY && y !== endY) {
				addIntersection(x, y, getZ(x, y), interpolationWeight, edgeStartVertexIndex, edgeEndVertexIndex, edgeStartTextureCoord, edgeEndTextureCoord);
			  }
			  framebuffer.set(x, y, getZ(x, y), color);
			  y1 = y;
			}
		  } else {
			e = dYAbs - dXAbs2;
			while (y !== endY) {
			  y += dYSign;
			  if (e > 0) {
				e = e - dXAbs2;
			  } else {
				x += dXSign;
				e += dYdXdiff2;
			  }
	
			  if (storeIntersectionForScanlineFill && y !== endY) {
				addIntersection(x, y, z, interpolationWeight, edgeStartVertexIndex, edgeEndVertexIndex, edgeStartTextureCoord, edgeEndTextureCoord);
			  }
	
			  if (framebuffer.zBufferTest(x, y, z, color)) {
				framebuffer.set(x, y, z, color, false);
			  }
			}
		  }
		}     
		
		// Comment out the next two lines.
		// drawLine(startX, startY, endX, endY, color);
		// return;

		// Skip it, if the line is just a point.


		// Optionally draw start point as is the same
		// as the end point of the previous edge.
		// In any case, do not add an intersection for start point here,
		// this should happen later in the scanline function.


		// Distinction of cases for driving variable.

			// x is driving variable.

						// Do not add intersections for points on horizontal line
						// and not the end point, which is done in scanline.

					//framebuffer.set(x, y, getZ(x, y), color);

			// y is driving variable.

					// Add every intersection as there can be only one per scan line.
					// but not the end point, which is done in scanline.

						//framebuffer.set(x, y, getZ(x, y), color);
		
		// END exercise Bresenham		

	/**
	 * Draw edges of given polygon. See also scanlineFillPolygon().
	 *
	 * @parameter vertices as array from data
	 * @parameter one polygon as 1D-array (one element from polygonVertices, thus one polygon) from data.
	 * @parameter color as defined in data
	 *
	 */
	function scanlineStrokePolygon(vertices, polygon, color) {

		// Loop over vertices/edges in polygon.
		for(var v = 0; v < polygon.length; v++) {

			// Determine start st and end point end of edge.
			var st = vertices[polygon[v]];
			// Connect edge to next or to first vertex to close the polygon.
			var nextVertexIndex = (v < polygon.length - 1) ? v + 1 : 0;
			var end = vertices[polygon[nextVertexIndex]];

			drawLineBresenhamGivenStartEndPoint(st, end, color);
		}
	}

	/**
	 * Called from scanline as preparation.
	 * Call Bresenham an all edges to fill scanlineIntersection data structure.
	 */
	function assembleIntersectionForScanline(vertices, polygon, color, textureCoord, polygonTextureCoord, texture) {

		// Use Math.floor() for integer cast and rounding of X-Y values.
		// Leave Z as floating point for comparisons in z-buffer.
		var currX, currY, currZ, nextX, nextY, nextZ;
		var startPoint, endPoint, lastIndex = 0;

		// Clear data-structure for scanline segments.
		clearIntersections();

		// Calculate the plane in which the polygon lies
		// to determine z-values of intermediate points.
		// Maybe skip polygons that are perpendicular to the screen / xy-plane.
		// The plane calculation can be commented out if bi-linear interpolation is applied.
		if(! calcPlaneEquation(vertices, polygon)) {
			console.log("Skip plane(polygon) is perpendicular to the screen / xy-plane, color: " + color.name);
			return;
		}

		// Sign ()+-1) of derivative of edge.

		// BEGIN exercise Texture
		// BEGIN exercise Scanline
		var currderivative = undefined;
		var lastDerivative = undefined;
		var Polygonlen = polygon.length -1;

      while (!lastDerivative && Polygonlen > -1) {
        startPoint = vertices[polygon[Polygonlen]];
        var PolygonVert = 0;

        if (Polygonlen < polygon.length - 1) {
			PolygonVert = Polygonlen + 1;
        }

        endPoint = vertices[polygon[PolygonVert]];
        lastDerivative = calcDerivative(startPoint[1], endPoint[1]);
		if (derivative + lastDerivative === 0 && derivative !== 0) {
			addIntersection(currX, currY, currZ);
		  }
        Polygonlen--;
      }

      if (!lastDerivative) {
        return;
      }

      for (var v = 0; v < polygon.length; v++) {
        startPoint = vertices[polygon[v]];

        var nextVertexIndex = v < polygon.length - 1 ? v + 1 : 0;
        endPoint = vertices[polygon[nextVertexIndex]];

        currX = Math.floor(startPoint[0]);
        currY = Math.floor(startPoint[1]);
        currZ = startPoint[2];
        nextX = Math.floor(endPoint[0]);
        nextY = Math.floor(endPoint[1]);
        nextZ = endPoint[2];

        drawLineBresenham(currX, currY, currZ, nextX, nextY, nextZ, color, true);

        currderivative = calcDerivative(currY, nextY);

        if (currderivative === 0) {
          continue;
        }

        if (currderivative !== 0) {
			addIntersection(nextX, nextY, nextZ);;

          if (currderivative + lastDerivative === 0) {
            addIntersection(currX, currY, currZ);;
          }
        }
        console.log("currderivative:" + currderivative + " lastDerivative " + lastDerivative);
		console.log("Add end point:" + nextX + ", " + nextY);
        lastDerivative = currderivative;
      }


		// For the start edge we need the last edge with derivative !=0,
		// Pre-calculate the derivatives for last edge !=0 of polygon.

		// Also after the rasterization with floor we need a valid triangle.
		// Thus we check if lastDerivative is defined and return if(!lastDerivative).


		// First raster only the edges and, if requested, store intersections for filling.
		// Loop over vertices/edges in polygon.

			// Determine start and end point of edge.

			// Connect edge to next or to first vertex to close the polygon.


			// Convert parameters to integer values.
			// Use Math.floor() for integer cast and rounding of X-Y values.
			// Leave Z as floating point for comparisons in z-buffer.

			// Set texture coordinate uv-vector/array of the current edge for later interpolation.


			//drawLineBresenham(currX, currY, currZ, nextX, nextY, nextZ, color, true, edgeStartVertexIndex, edgeEndVertexIndex, edgeStartTextureCoord, edgeEndTextureCoord);

			// Calculate current and save last derivative.
			//console.log("derivative:" + derivative + " lastDerivative " + lastDerivative);


			// Skip horizontal edges.


			// Add end point of non horizontal edges.
			//console.log("Add end point:" + nextX + ", " + nextY);


			// Last derivative has to exist, always, also for the first edge.

			// Add start point if edges are non monotonous, Peek point.


			// If current derivative ==0 then keep the last one.

		
		// END exercise Scanline
		// END exercise Texture

	}

	/**
	 * Called once for each scanline before it is processed.
	 * Interpolate: z, weights of corners, texture coordinates.
	 *
	 * @parameter texture: if not null do interpolate UV.
	 */
	function interpolationPrepareScanline(startIntersection, endIntersection, texture) {

		// Start-point for filling on scanline.
		var xStartFill = startIntersection.x;
		// End-point for filling on scanline.
		var xEndFill = endIntersection.x;
		// Start and end for z-interpolated.
		var zStartFill = startIntersection.z;
		var zEndFill = endIntersection.z;

		interpolationData.z = zStartFill;

		// To calculate dz.
		var deltaX = xEndFill - xStartFill;

		// BEGIN exercise Z-Buffer (for interpolation of z)


		

		// Calculate dz for linear interpolation along a scanline.

		// END exercise Z-Buffer

		// BEGIN exercise Shading

		// Interpolation for shader.
		// Bi-linear interpolation. Alternatively use barycentric coordinates.
		// Interpolation weight from one intersection to the next.
		// One weight for each of the four(three) corners/vertices (one corner appears two times) of the polygon,
		// which are involved in a scanline segment, interpolationVertices.
		interpolationData.vertexIndices = [startIntersection.edgeStartVertexIndex, startIntersection.edgeEndVertexIndex, endIntersection.edgeStartVertexIndex, endIntersection.edgeEndVertexIndex];
		// Initial weight for the starting points on a scanline segment.
		var interpolationWeightStart = startIntersection.interpolationWeight;
		var interpolationWeightEnd = endIntersection.interpolationWeight;
		interpolationData.weights = [1 - interpolationWeightStart, interpolationWeightStart, 1 - interpolationWeightEnd, interpolationWeightEnd];

		// The interpolation work on the scanline is done in the shader,
		// as only the specific shader knows what to interpolate.
		interpolationData.shaderPrepareScanline(interpolationData.vertexIndices, interpolationData.weights, deltaX);

		// Variables for interpolation step on scanline.
		interpolationData.weightOnScanline = 0.0;
		interpolationData.deltaWeightOnScanline = 1.0 / (deltaX == 0 ? 1 : deltaX);

		// END exercise Shading

		// BEGIN exercise Texture

		// Reuse the weights calculated for shading.

		// Interpolation of coordinates for texture sampler.
		// Bi-linear interpolation. Alternatively use barycentric coordinates.
		if(texture != null) {
			// Texture coordinates vector: u,v (x,y with origin top left).
			if(!interpolationData.uvVec) {
				interpolationData.uvVec = [];
			}
			if(!interpolationData.uvVecDelta) {
				interpolationData.uvVecDelta = [];
			}
			// Loop u,v texture coordinates vector.

				// Interpolate on first edge.

				// Interpolate on second edge.

				// Delta on scanline.

				// Starting value on scanline.
			}
			
		// END exercise Texture
	}

	/**
	 * Called for each fragment on scanline, thus inside x-loop.
	 * Interpolate: z, weights of corners, texture coordinates.
	 *
	 * @parameter texture: if not null do interpolate UV.
	 */
	function interpolationStepOnScanline(texture) {

		// BEGIN exercise Z-Buffer (for interpolation of z or plane equ)

		// Calculate z for next pixel, i.e. apply dz step.

		// END exercise Z-Buffer


		// BEGIN exercise Shading
		
		// Step interpolation in shader.
		interpolationData.shaderStepOnScanline();

		// Calculate an interpolation weight from 0 to 1 on each scanline segment.
		// interpolationData.weights.forEach(function(scope, index, array) {
		// array[index] += deltaInterpolationWeight[index];
		// });
		interpolationData.weightOnScanline += interpolationData.deltaWeightOnScanline;

		// END exercise Shading

		// BEGIN exercise Texture

		// Stepping interpolation of texture coordinates.
		if(texture != null) {
			// interpolationData.uvVec[0] += interpolationData.uvVecDelta[0];
			// interpolationData.uvVec[1] += interpolationData.uvVecDelta[1];
		}

		// END exercise Texture
	}

	/**
	 * Fill a polygon into the framebuffer.
	 *
	 * Use bi-linear interpolation or plane-equation to determine the z-values.
	 * Use bi-linear interpolation or barycentric coordinates for texture and shading interpolation.
	 * Be aware of rasterization errors (floor) when calculating derivatives and dz.
	 *
	 * @parameter vertices as array from data
	 * @parameter one polygon as 1D-array (one element from polygonVertices, thus one polygon) from data.
	 * @parameter color as defined in data
	 * @parameter fill or stroke outline
	 * @parameter textureCoord only useful when texturing is implemented an applied.
	 * @parameter polygonTextureCoord for current polygon as 1D-array (one element from polygonTextureCoord) from data.
	 * @parameter texture object for sampling, set to null to skip texturing.
	 */
	function scanlineFillPolygon(vertices, polygon, color, textureCoord, polygonTextureCoord, texture) {

		var horizontalClippingTest;
		var zTest;

		// Raster the edges.
		assembleIntersectionForScanline(vertices, polygon, color, textureCoord, polygonTextureCoord, texture);

		// Use the shader/shading-function that is set for this polygon.
		// Store function reference outside the loops for speed.
		// Only useful if light an shading is applied.
		var shadingFunction = shader.getShadingFunction();

		// Store shader function pointer for interpolation shorthands.
		interpolationData.shaderPrepareScanline = shader.getInterpolationPrepareScanlineFunction();
		interpolationData.shaderStepOnScanline = shader.getInterpolationStepOnScanlineFunction();

		// BEGIN exercise Scanline
		for (let y = 0; y < height; y++) {
			if (!scanlineIntersection[y]) {
			  continue;
			}

			scanlineIntersection[y].sort((a, b) => a.x - b.x);
	
			for (var i = 0; i < scanlineIntersection[y].length - 1; i += 2) {
			  const x1 = scanlineIntersection[y][i];
			  const x2 = scanlineIntersection[y][i + 1];
	
			  for (var x = x1.x; x <= x2.x; x++) {
				var z = getZ(x, y);
				framebuffer.set(x, y, getZ(x, y), color);
				interpolationStepOnScanline(texture);
			  }
			}
		  }
		// Fill polygon line by line using the scanline algorithm.
		// Loop over non empty scan lines.


			// // Do (or skip) some safety check.
			// if ((line.length < 2) || (line.length % 2)) {
			// console.log("Error in number of intersection (" + line.length + ") in line: " + y);
			// }
			
			// Order intersection in scanline.

			
			// Loop over intersections in pairs of two.


				// Calculate interpolation variables for current scanline.
				// Necessary for z-buffer, shading and texturing.


				// Fill line section inside polygon, loop x.


					// Set z shorthand.


					// Do horizontal clipping test (true if passed).
					//horizontalClippingTest = (x >= 0) && (x < width);
					
					// Do a z-buffer test.
					// to skip the shaderFunction if it is not needed.
					// This is not perfect as we still shade fragments
					// that will not survive the frame, because
					// the z-buffer is not fully build up.
					// The Solution would be to use deferred-rendering.
					// The z-Buffer Test could also be skipped, if
					// there is only one convex model and we already do back-face culling.
					// if(horizontalClippingTest) {
						// zTest = framebuffer.zBufferTest(x, y, z, color);
					// }
					// // Fill (and shade) fragment it passed all tests.
					// if(zTest && horizontalClippingTest) {
						// // Get color from texture.
						// if(texture != null) {
							// texture.sample(interpolationData.uvVec, color);
						// }
						// shadingFunction(color, interpolationData.weightOnScanline);
// 
						// // framebuffer.set without z-Test and dirty rectangle adjust.
// 
					// }
					
					// Step interpolation variables on current scanline.
					// Even failing the z-buffer test we have to perform the interpolation step.
					// Necessary for z-buffer, shading and texturing.
					// interpolationStepOnScanline(texture);

			// End of loop over x for one scanline segment between two intersections.
			// End of loop over intersections on one scanline.
		 // End of loop over all scanlines.
				
		// END exercise Scanline
	}

	/**
	 * Calculate the derivative (only the sign) of a polygon edge.
	 * @ return +-1 or 0.
	 */
	function calcDerivative(currY, nextY) {
		// y axis from top to bottom.
		if(currY < nextY) {
			return -1;
		} else if(currY > nextY) {
			return +1;
		} else {
			return 0;
		}
	}

	/**
	 * Calculate and set the module variables, A,B,C,D and AdivC.
	 *
	 * @parameter vertices as array from data
	 * @parameter polygon as array (1D=one polygon) of from data.
	 * @parameter normal:
	 * the transformed normal may not fit to transformed vertices,
	 * because the normal does not undergo perspective transformation.
	 * Thus it has to be re-calculated.
	 * In this case pass null or nothing as normal parameter.
	 *
	 * @ return true if plane is in not perpendicular to xy-plane.
	 */
	function calcPlaneEquation(vertices, polygon, normal) {

		// Epsilon to check C against zero.
		var epsilon = 0.001;

		if(!normal) {
			normal = [];
			data.calculateNormalForPolygon(vertices, polygon, normal);
		}

		// Assign parameters for plane equation.
		A = normal[0];
		B = normal[1];
		C = normal[2];

		// check C against zero.
		if(Math.abs(C) < epsilon) {
			return false;
		}

		// START exercise Z-Buffer

        //zTest = framebuffer.zBufferTest(x, y, z, color);

		// Project first vertex (could be any) on normal.
		// The result is the distance D of polygon plane to origin.

		// // Check result, applying the plane equation to the original polygon vertices.
		for(var i = 0; i < polygon.length; i++) {
		    var p = polygon[i];
		    var x = vertices[p][0];
		    var y = vertices[p][1];
		    var z = vertices[p][2];
		    var zCalc = getZ(x, y);
            
			D = -(A * x + B * y + C * z);

		if(Math.abs(z - zCalc) > 0.001) {
		    console.log("Check failed  z "+z+" = "+zCalc);
		    console.log("Plane: A=" + A + " B=" + B + " C=" + C + " D=" + D);
		 }
		}

		// END exercise Z-Buffer

		return true;
	}

	/**
	 * Call for new frame.
	 */
	function clearIntersections() {
		scanlineIntersection = [];
	}

	/**
	 * Add (edge-)points from bresenham to scanlines.
	 * @parameter interpolationWeight runs from 0 to 1 from start to end Vertex.
	 * @parameter edgeStartVertexIndex, edgeEndVertexIndex :
	 *  Start and end of line segment stored in intersection for interpolation.
	 * @parameter [only for textureing] edgeStartTextureCoord,
	 *  edgeEndTextureCoord : Texture uv-vectors (not the indices) for edge currently processed.
	 */
	function addIntersection(x, y, z, interpolationWeight, edgeStartVertexIndex, edgeEndVertexIndex, edgeStartTextureCoord, edgeEndTextureCoord) {
		// Do some hacked  (vertical) clipping.
		// Points out of y-range are on no scanline and can be ignored.
		// Horizontal clipping is done in scanline to ensure correct interpolation.
		if(y < 0 || y >= height) {
			return;
		}

		// Check if this is the first point on scanline to initialize array.
		if(scanlineIntersection[y] == undefined) {
			scanlineIntersection[y] = [];
		}

		// Each intersection is an object, an array is not significantly faster.
		scanlineIntersection[y].push({
			x : x,
			z : z,
			edgeStartVertexIndex : edgeStartVertexIndex,
			edgeEndVertexIndex : edgeEndVertexIndex,
			edgeStartTextureCoord : edgeStartTextureCoord,
			edgeEndTextureCoord : edgeEndTextureCoord,
			interpolationWeight : interpolationWeight
		});
		
		// Dirty rect has to be adjusted here, as no points are set
		// in framebuffer when edges are drawn (bresenham) and also not during scanline.
		// We have to take care the x is not out of range.
		if(x < 0 ) {
			x = 0;
		}
		if(x >= width)
		{
			x = width-1;
		}
		framebuffer.adjustDirtyRectangle(x, y);
	}

	/**
	 * Calculate the z-value for any point on
	 * the polygon currently processed.
	 */
	function getZ(x, y) {
		// We assume that the plane equation is up-to-date
		// with the current polygon.
		var z = -(A * x + B * y + D) * inverseC;

		// Take this check out for speed.
		// Or when the implemetation in not yet complete, i.e. scanline is not implemented.
		//if(!isFinite(z)) {
			//console.log("z isNaN or not isFinite for (x,y): " + x + " , " + y);
		//}

		return z;
	}

	/**
	 * For Debug
	 */
	function drawLine(startX, startY, endX, endY, color) {
		var colorname = Object.keys(color)[0];
		ctx.fillStyle = colorname;
		ctx.strokeStyle = colorname;
		ctx.beginPath();
		ctx.moveTo(startX, startY);
		ctx.lineTo(endX, endY);
		//ctx.closePath();
		ctx.stroke();
	}

	// Public API.
	exports.init = init;
	exports.drawLineBresenhamGivenStartEndPoint = drawLineBresenhamGivenStartEndPoint;
	exports.scanlineStrokePolygon = scanlineStrokePolygon;
	exports.scanlineFillPolygon = scanlineFillPolygon;
});
