/// <reference path="sylvester/src/matrix.d.ts" />
module opensurf{
	export class IPoint{
		constructor(){
			this.orientation = 0;
		}

		/// <summary>
		/// Coordinates of the detected interest point
		/// </summary>
		x:number;
		y:number;

		/// <summary>
		/// Detected scale
		/// </summary>
		scale:number;

		/// <summary>
		/// Response of the detected feature (strength)
		/// </summary>
		response:number;

		/// <summary>
		/// Orientation measured anti-clockwise from +ve x-axis
		/// </summary>
		orientation:number;

		/// <summary>
		/// Sign of laplacian for fast matching purposes
		/// </summary>
		laplacian:number;

		/// <summary>
		/// Descriptor vector
		/// </summary>
		descriptorLength:number;
		descriptor:Float64Array = null;
		SetDescriptorLength(size:number):void{
			this.descriptorLength = size;
			this.descriptor = new Float64Array(size);
		}
	}

	class Color{
		constructor(private R:number, private G:number, private B:number){
		}
	}

	export class IntegralImage{
		static cR:number = 0.2989;
		static cG:number = 0.5870;
		static cB:number = 0.1140;

		matrix:Sylvester.Matrix;

		getPixel(y:number, x:number):number{
			return this.matrix.elements[y][x];
		}
		setPixel(y:number, x:number, value:number):void{
			this.matrix.elements[y][x] = value;
		}

		constructor(public width:number, public height:number, elems?:Sylvester.Matrix){
			this.matrix = elems ? elems : Sylvester.Matrix.Zero(height, width);
		}

		static FromImage(image:HTMLImageElement):IntegralImage{
			// get pixeldata
			var canvas:HTMLCanvasElement = <HTMLCanvasElement>document.createElement('canvas');
			canvas.width  = image.width;
			canvas.height = image.height;
			var g:CanvasRenderingContext2D = canvas.getContext('2d');
			g.drawImage(image, 0, 0);
			var imageData:ImageData = g.getImageData(0, 0, canvas.width, canvas.height);

			var pic:IntegralImage = new IntegralImage(image.width, image.height);
			var rowsum:number = 0;
			for(var x:number = 0; x < image.width; x++){
				var i:number = 4 * (imageData.width * 0 + x);
				rowsum += (IntegralImage.cR * imageData.data[i] + IntegralImage.cG * imageData.data[i+1] + IntegralImage.cB * imageData.data[i+2]) / 255;
				pic.setPixel(0, x, rowsum);
			}
			for (var y:number = 1; y < image.height; y++){
				rowsum = 0;
				for (var x:number = 0; x < image.width; x++){
					var i:number = 4 * (imageData.width * y + x);
					rowsum += (cR * imageData.data[i] + cG * imageData.data[i+1] + cB * imageData.data[i+2]) / 255;

					// integral image is rowsum + value above        
					pic.setPixel(y, x, rowsum + pic.getPixel(y - 1, x));
				}
			}

			return pic;
		}


		BoxIntegral(row:number, col:number, rows:number, cols:number):number{
			// The subtraction by one for row/col is because row/col is inclusive.
			var r1:number = Math.min(row, this.height) - 1;
			var c1:number = Math.min(col, this.width) - 1;
			var r2:number = Math.min(row + rows, this.height) - 1;
			var c2:number = Math.min(col + cols, this.width) - 1;

			var A:number = 0, B:number = 0, C:number = 0, D:number = 0;
			if (r1 >= 0 && c1 >= 0) A = this.matrix.elements[r1][c1];
			if (r1 >= 0 && c2 >= 0) B = this.matrix.elements[r1][c2];
			if (r2 >= 0 && c1 >= 0) C = this.matrix.elements[r2][c1];
			if (r2 >= 0 && c2 >= 0) D = this.matrix.elements[r2][c2];

			return Math.max(0, A - B - C + D);
		}

		/// <summary>
		/// Get Haar Wavelet X repsonse
		/// </summary>
		/// <param name="row"></param>
		/// <param name="column"></param>
		/// <param name="size"></param>
		/// <returns></returns>
		HaarX(row:number, column:number, size:number):number{
			return this.BoxIntegral(row - size / 2, column, size, size / 2)
			 - 1 * this.BoxIntegral(row - size / 2, column - size / 2, size, size / 2);
		}

		/// <summary>
		/// Get Haar Wavelet Y repsonse
		/// </summary>
		/// <param name="row"></param>
		/// <param name="column"></param>
		/// <param name="size"></param>
		/// <returns></returns>
		HaarY(row:number, column:number, size:number):number{
			return this.BoxIntegral(row, column - size / 2, size / 2, size)
			 - 1 * this.BoxIntegral(row - size / 2, column - size / 2, size / 2, size);
		}

		serialize():any{
			return {
				width: this.width,
				height: this.height,
				elements: this.matrix.elements
			};
		}
	}

	export function deserializeIntegralImage(obj:any):IntegralImage{
		return new IntegralImage(obj.width, obj.height, Sylvester.Matrix.create(obj.elements));
	}


	export class SurfDescriptor{

		/// <summary>
		/// Gaussian distribution with sigma = 2.5.  Used as a fast lookup
		/// </summary>
		gauss25:number[][] = [
			[0.02350693969273,0.01849121369071,0.01239503121241,0.00708015417522,0.00344628101733,0.00142945847484,0.00050524879060],
			[0.02169964028389,0.01706954162243,0.01144205592615,0.00653580605408,0.00318131834134,0.00131955648461,0.00046640341759],
			[0.01706954162243,0.01342737701584,0.00900063997939,0.00514124713667,0.00250251364222,0.00103799989504,0.00036688592278],
			[0.01144205592615,0.00900063997939,0.00603330940534,0.00344628101733,0.00167748505986,0.00069579213743,0.00024593098864],
			[0.00653580605408,0.00514124713667,0.00344628101733,0.00196854695367,0.00095819467066,0.00039744277546,0.00014047800980],
			[0.00318131834134,0.00250251364222,0.00167748505986,0.00095819467066,0.00046640341759,0.00019345616757,0.00006837798818],
			[0.00131955648461,0.00103799989504,0.00069579213743,0.00039744277546,0.00019345616757,0.00008024231247,0.00002836202103]
		];

		/// <summary>
		/// The integral image which is being used
		/// </summary>
		img:IntegralImage;

		/// <summary>
		/// Static one-call do it all function
		/// </summary>
		/// <param name="img"></param>
		/// <param name="ipts"></param>
		/// <param name="extended"></param>
		/// <param name="upright"></param>
		static DecribeInterestPoints(ipts:IPoint[], upright:bool, extended:bool, img:IntegralImage, progress?:(p:IPoint,t:number)=>void):void{
			var des:SurfDescriptor = new SurfDescriptor();
			des.DescribeInterestPoints(ipts, upright, extended, img, progress);
		}


		/// <summary>
		/// Build descriptor vector for each interest point in the supplied list
		/// </summary>
		/// <param name="img"></param>
		/// <param name="ipts"></param>
		/// <param name="upright"></param>
		DescribeInterestPoints(ipts:IPoint[], upright:bool, extended:bool, img:IntegralImage, progress?:(p:IPoint,t:number)=>void):void{
			if (ipts.length == 0) return;
			this.img = img;

			ipts.forEach((ip:IPoint, i:number)=>{
				// determine descriptor size
				if (extended) ip.descriptorLength = 128;
				else ip.descriptorLength = 64;

				// if we want rotation invariance get the orientation
				if (!upright) this.GetOrientation(ip);

				// Extract SURF descriptor
				this.GetDescriptor(ip, upright, extended);

				if(progress){
					progress(ip, i / ipts.length);
				}
			});
		}

		/// <summary>
		/// Determine dominant orientation for InterestPoint
		/// </summary>
		/// <param name="ip"></param>
		GetOrientation(ip:IPoint):void{
			var Responses:number = 109;
			var resX:Float64Array = new Float64Array(Responses);
			var resY:Float64Array = new Float64Array(Responses);
			var Ang:Float64Array  = new Float64Array(Responses);
			var idx:number = 0;
			var id:number[] = [ 6, 5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 6 ];

			// Get rounded InterestPoint data
			var X:number = Math.round(ip.x);
			var Y:number = Math.round(ip.y);
			var S:number = Math.round(ip.scale);

			// calculate haar responses for points within radius of 6*scale
			for (var i:number = -6; i <= 6; ++i){
				for (var j:number = -6; j <= 6; ++j){
					if (i * i + j * j < 36){
						var gauss:number = this.gauss25[id[i + 6]][id[j + 6]];
						resX[idx] = gauss * this.img.HaarX(Y + j * S, X + i * S, 4 * S);
						resY[idx] = gauss * this.img.HaarY(Y + j * S, X + i * S, 4 * S);
						Ang[idx] = this.GetAngle(resX[idx], resY[idx]);
						++idx;
					}
				}
			}

			// calculate the dominant direction 
			var sumX:number, sumY:number, max:number = 0, orientation:number = 0;
			var ang1:number, ang2:number;
			var pi:number = Math.PI;

			// loop slides pi/3 window around feature point
			for (ang1 = 0; ang1 < 2 * pi; ang1 += 0.15){
				ang2 = (ang1 + pi / 3 > 2 * pi ? ang1 - 5 * pi / 3 : ang1 + pi / 3);
				sumX = sumY = 0;

				for (var k:number = 0; k < Responses; ++k){
					// determine whether the point is within the window
					if (ang1 < ang2 && ang1 < Ang[k] && Ang[k] < ang2){
						sumX += resX[k];
						sumY += resY[k];
					}else if (ang2 < ang1 && ((Ang[k] > 0 && Ang[k] < ang2) || (Ang[k] > ang1 && Ang[k] < pi))){
						sumX += resX[k];
						sumY += resY[k];
					}
				}

				// if the vector produced from this window is longer than all 
				// previous vectors then this forms the new dominant direction
				if (sumX * sumX + sumY * sumY > max){
					// store largest orientation
					max = sumX * sumX + sumY * sumY;
					orientation = this.GetAngle(sumX, sumY);
				}
			}

			// assign orientation of the dominant response vector
			ip.orientation = orientation;
		}


		/// <summary>
		/// Construct descriptor vector for this interest point
		/// </summary>
		/// <param name="bUpright"></param>
		GetDescriptor(ip:IPoint, bUpright:bool, bExtended:bool):void{
			var sample_x:number, sample_y:number, count:number = 0;
			var i:number = 0, ix:number = 0, j:number = 0, jx:number = 0, xs:number = 0, ys:number = 0;
			var dx:number, dy:number, mdx:number, mdy:number, co:number, si:number;
			var dx_yn:number, mdx_yn:number, dy_xn:number, mdy_xn:number;
			var gauss_s1:number = 0, gauss_s2:number = 0;
			var rx:number = 0, ry:number = 0, rrx:number = 0, rry:number = 0, len:number = 0;
			var cx:number = -0.5, cy:number = 0; //Subregion centers for the 4x4 gaussian weighting

			// Get rounded InterestPoint data
			var X:number = Math.round(ip.x);
			var Y:number = Math.round(ip.y);
			var S:number = Math.round(ip.scale);

			// Allocate descriptor memory
			ip.SetDescriptorLength(64);

			if (bUpright){
				co = 1;
				si = 0;
			}else{
				co = Math.cos(ip.orientation);
				si = Math.sin(ip.orientation);
			}

			//Calculate descriptor for this interest point
			i = -8;
			while (i < 12){
				j = -8;
				i = i - 4;

				cx += 1;
				cy = -0.5;

				while (j < 12){
					cy += 1;

					j = j - 4;

					ix = i + 5;
					jx = j + 5;

					dx = dy = mdx = mdy = 0f;
					dx_yn = mdx_yn = dy_xn = mdy_xn = 0f;

					xs = Math.round(X + (-jx * S * si + ix * S * co));
					ys = Math.round(Y + (jx * S * co + ix * S * si));

					// zero the responses
					dx = dy = mdx = mdy = 0f;
					dx_yn = mdx_yn = dy_xn = mdy_xn = 0f;

					for (var k:number = i; k < i + 9; ++k){
						for (var l:number = j; l < j + 9; ++l){
							//Get coords of sample point on the rotated axis
							sample_x = Math.round(X + (-l * S * si + k * S * co));
							sample_y = Math.round(Y + (l * S * co + k * S * si));

							//Get the gaussian weighted x and y responses
							gauss_s1 = this.Gaussian(xs - sample_x, ys - sample_y, 2.5 * S);
							rx = this.img.HaarX(sample_y, sample_x, 2 * S);
							ry = this.img.HaarY(sample_y, sample_x, 2 * S);

							//Get the gaussian weighted x and y responses on rotated axis
							rrx = gauss_s1 * (-rx * si + ry * co);
							rry = gauss_s1 * (rx * co + ry * si);


							if (bExtended){
								// split x responses for different signs of y
								if (rry >= 0){
									dx += rrx;
									mdx += Math.abs(rrx);
								}else{
									dx_yn += rrx;
									mdx_yn += Math.abs(rrx);
								}

								// split y responses for different signs of x
								if (rrx >= 0){
									dy += rry;
									mdy += Math.abs(rry);
								}else{
									dy_xn += rry;
									mdy_xn += Math.abs(rry);
								}
							}else{
								dx += rrx;
								dy += rry;
								mdx += Math.abs(rrx);
								mdy += Math.abs(rry);
							}
						}
					}

					//Add the values to the descriptor vector
					gauss_s2 = this.Gaussian(cx - 2, cy - 2, 1.5);

					ip.descriptor[count++] = dx * gauss_s2;
					ip.descriptor[count++] = dy * gauss_s2;
					ip.descriptor[count++] = mdx * gauss_s2;
					ip.descriptor[count++] = mdy * gauss_s2;

					// add the extended components
					if (bExtended){
						ip.descriptor[count++] = dx_yn * gauss_s2;
						ip.descriptor[count++] = dy_xn * gauss_s2;
						ip.descriptor[count++] = mdx_yn * gauss_s2;
						ip.descriptor[count++] = mdy_xn * gauss_s2;
					}

					len += (dx * dx + dy * dy + mdx * mdx + mdy * mdy
					+ dx_yn + dy_xn + mdx_yn + mdy_xn) * gauss_s2 * gauss_s2;

					j += 9;
				}
				i += 9;
			}

			//Convert to Unit Vector
			len = Math.sqrt(len);
			if (len > 0){
				for (var d:number = 0; d < ip.descriptorLength; ++d){
					ip.descriptor[d] /= len;
				}
			}
		}


		/// <summary>
		/// Get the angle formed by the vector [x,y]
		/// </summary>
		/// <param name="X"></param>
		/// <param name="Y"></param>
		/// <returns></returns>
		GetAngle(X:number, Y:number):number{
			if (X >= 0 && Y >= 0)
				return Math.atan(Y / X);
			else if (X < 0 && Y >= 0)
				return Math.PI - Math.atan(-Y / X);
			else if (X < 0 && Y < 0)
				return Math.PI + Math.atan(Y / X);
			else if (X >= 0 && Y < 0)
				return 2 * Math.PI - Math.atan(-Y / X);

			return 0;
		}


		/// <summary>
		/// Get the value of the gaussian with std dev sigma
		/// at the point (x,y)
		/// </summary>
		/// <param name="x"></param>
		/// <param name="y"></param>
		/// <param name="sig"></param>
		/// <returns></returns>
		Gaussian(x:number, y:number, sig:number):number{
			var pi:number = Math.PI;
			return (1 / (2 * pi * sig * sig)) * Math.exp(-(x * x + y * y) / (2.0 * sig * sig));
		}
	} // SurfDescriptor



 	class ResponseLayer{
		public responses:Float64Array;
		public laplacian:Float64Array;

		constructor(public width:number, public height:number, public step:number, public filter:number){
			this.responses = new Float64Array(width * height);
			this.laplacian = new Float64Array(width * height);
		}

		public getLaplacian(row:number, column:number, src?:ResponseLayer):number{
			if(src !== undefined){
				var scale:number = this.width / src.width;
				return this.laplacian[(scale * row) * this.width + (scale * column)];
			}else{
				return this.laplacian[row * this.width + column];
			}

		}

		public getResponse(row:number, column:number, src?:ResponseLayer):number{
			if(src !== undefined){
				var scale:number = this.width / src.width;
				return this.responses[(scale * row) * this.width + (scale * column)];
			}else{
				return this.responses[row * this.width + column];					
			}
		}
	}

	export class FastHessian{

		/// <summary>
		/// Reponse Layer 
		/// </summary>
		


		/// <summary>
		/// Static one-call do it all method
		/// </summary>
		/// <param name="thresh"></param>
		/// <param name="octaves"></param>
		/// <param name="init_sample"></param>
		/// <param name="img"></param>
		/// <returns></returns>
		public static getIpoints(thresh:number, octaves:number,init_sample:number, img:IntegralImage, observer?:(p:IPoint)=>void, logger?:(text:string)=>void):IPoint[]{
			var fh:FastHessian = new FastHessian(thresh, octaves, init_sample, img);
			return fh.getIpoints(observer, logger);
		}


		/// <summary>
		/// Constructor with parameters
		/// </summary>
		/// <param name="thresh"></param>
		/// <param name="octaves"></param>
		/// <param name="init_sample"></param>
		/// <param name="img"></param>
		constructor(thresh:number, octaves:number, init_sample:number, img:IntegralImage){
			this.thresh = thresh;
			this.octaves = octaves;
			this.init_sample = init_sample;
			this.img = img;
		}


		/// <summary>
		/// These are passed in
		/// </summary>
		private thresh:number;
		private octaves:number;
		private init_sample:number;
		private img:IntegralImage;


		/// <summary>
		/// These get built
		/// </summary>
		private ipts:IPoint[];
		private responseMap:ResponseLayer[];


		/// <summary>
		/// Find the image features and write into vector of features
		/// </summary>
		public getIpoints(observer?:(p:IPoint)=>void, logger?:(text:string)=>void):IPoint[]{
		// filter index map
			var filter_map:number[][] = [[0,1,2,3], [1,3,4,5], [3,5,6,7], [5,7,8,9], [7,9,10,11]];

			// Clear the vector of exisiting ipts
			this.ipts = [];
			
			// Build the response map
			this.buildResponseMap();

			// Get the response layers
			var b:ResponseLayer, m:ResponseLayer, t:ResponseLayer;
			for (var o:number = 0; o < this.octaves; ++o) 
				for (var i:number = 0; i <= 1; ++i){
					b = this.responseMap[filter_map[o][i]];
					m = this.responseMap[filter_map[o][i+1]];
					t = this.responseMap[filter_map[o][i+2]];

					// loop over middle response layer at density of the most 
					// sparse layer (always top), to find maxima across scale and space
					for (var r:number = 0; r < t.height; ++r){
						for (var c:number = 0; c < t.width; ++c){
							if (this.isExtremum(r, c, t, m, b)){
								if(logger){
									logger(this.ipts.length + ": r=" + r + ", c=" + c);									
								}
								if(this.ipts.length === 417){
									var hoge = 0;
								}
								this.interpolateExtremum(r, c, t, m, b, observer);
							}
						}
					}
				}

				return this.ipts;
			}


		/// <summary>
		/// Build map of DoH responses
		/// </summary>
		buildResponseMap():void{
			// Calculate responses for the first 4 octaves:
			// Oct1: 9,  15, 21, 27
			// Oct2: 15, 27, 39, 51
			// Oct3: 27, 51, 75, 99
			// Oct4: 51, 99, 147,195
			// Oct5: 99, 195,291,387

			// Deallocate memory and clear any existing response layers
			this.responseMap = [];

			// Get image attributes
			var w:number = (this.img.width / this.init_sample);
			var h:number = (this.img.height / this.init_sample);
			var s:number = (this.init_sample);

			// Calculate approximated determinant of hessian values
			if (this.octaves >= 1){
				this.responseMap.push(new ResponseLayer(w,   h,   s,   9));
				this.responseMap.push(new ResponseLayer(w, h, s, 15));
				this.responseMap.push(new ResponseLayer(w, h, s, 21));
				this.responseMap.push(new ResponseLayer(w, h, s, 27));
			}

			if (this.octaves >= 2){
				this.responseMap.push(new ResponseLayer(w / 2, h / 2, s * 2, 39));
				this.responseMap.push(new ResponseLayer(w / 2, h / 2, s * 2, 51));
			}

			if (this.octaves >= 3){
				this.responseMap.push(new ResponseLayer(w / 4, h / 4, s * 4, 75));
				this.responseMap.push(new ResponseLayer(w / 4, h / 4, s * 4, 99));
			}

			if (this.octaves >= 4){
				this.responseMap.push(new ResponseLayer(w / 8, h / 8, s * 8, 147));
				this.responseMap.push(new ResponseLayer(w / 8, h / 8, s * 8, 195));
			}

			if (this.octaves >= 5){
				this.responseMap.push(new ResponseLayer(w / 16, h / 16, s * 16, 291));
				this.responseMap.push(new ResponseLayer(w / 16, h / 16, s * 16, 387));
			}

			// Extract responses from the image
			for (var i:number = 0; i < this.responseMap.length; ++i){
				this.buildResponseLayer(this.responseMap[i]);
			}
		}


		/// <summary>
		/// Build Responses for a given ResponseLayer
		/// </summary>
		/// <param name="rl"></param>
		private buildResponseLayer(rl:ResponseLayer):void{
			var step:number = rl.step;                      // step size for this filter
			var b:number = (rl.filter - 1) / 2;             // border for this filter
			var l:number = rl.filter / 3;                   // lobe for this filter (filter size / 3)
			var w:number = rl.filter;                       // filter size
			var inverse_area:number = 1 / (w * w);       // normalisation factor
			var Dxx:number, Dyy:number, Dxy:number;

			for (var r:number, c:number, ar:number = 0, index = 0; ar < rl.height; ++ar){
				for (var ac:number = 0; ac < rl.width; ++ac, index++){
					// get the image coordinates
					r = ar * step;
					c = ac * step;

					// Compute response components
					Dxx = this.img.BoxIntegral(r - l + 1,             c - b,                 2 * l - 1, w        )
					    - this.img.BoxIntegral(r - l + 1,             c - Math.floor(l / 2), 2 * l - 1, l        ) * 3;
					Dyy = this.img.BoxIntegral(r - b,                 c - l + 1,  w,         2 * l - 1           )
					    - this.img.BoxIntegral(r - Math.floor(l / 2), c - l + 1, l,          2 * l - 1           ) * 3;
					Dxy = + this.img.BoxIntegral(r - l, c + 1, l, l)
					      + this.img.BoxIntegral(r + 1, c - l, l, l)
					      - this.img.BoxIntegral(r - l, c - l, l, l)
					      - this.img.BoxIntegral(r + 1, c + 1, l, l);

					// Normalise the filter responses with respect to their size
					Dxx *= inverse_area;
					Dyy *= inverse_area;
					Dxy *= inverse_area;

					// Get the determinant of hessian response & laplacian sign
					rl.responses[index] = (Dxx * Dyy - 0.81 * Dxy * Dxy);
					rl.laplacian[index] = (Dxx + Dyy >= 0 ? 1 : 0);
				}
			}
		}


		/// <summary>
		/// Test whether the point r,c in the middle layer is extremum in 3x3x3 neighbourhood
		/// </summary>
		/// <param name="r">Row to be tested</param>
		/// <param name="c">Column to be tested</param>
		/// <param name="t">Top ReponseLayer</param>
		/// <param name="m">Middle ReponseLayer</param>
		/// <param name="b">Bottome ReponseLayer</param>
		/// <returns></returns>
		isExtremum(r:number, c:number, t:ResponseLayer, m:ResponseLayer, b:ResponseLayer):bool{
			// bounds check
			var layerBorder:number = (t.filter + 1) / (2 * t.step);
			if (r <= layerBorder || r >= t.height - layerBorder || c <= layerBorder || c >= t.width - layerBorder)
				return false;

			// check the candidate point in the middle layer is above thresh 
			var candidate:number = m.getResponse(r, c, t);
			if (candidate < this.thresh)
				return false;

			for (var rr:number = -1; rr <= 1; ++rr){
				for (var cc:number = -1; cc <= 1; ++cc){
					// if any response in 3x3x3 is greater candidate not maximum
					if (t.getResponse(r + rr, c + cc) >= candidate ||
						((rr != 0 || cc != 0) && m.getResponse(r + rr, c + cc, t) >= candidate) ||
						b.getResponse(r + rr, c + cc, t) >= candidate)
					{
						return false;
					}
				}
			}

			return true;
		}


		/// <summary>
		/// Interpolate scale-space extrema to subpixel accuracy to form an image feature
		/// </summary>
		/// <param name="r"></param>
		/// <param name="c"></param>
		/// <param name="t"></param>
		/// <param name="m"></param>
		/// <param name="b"></param>
		interpolateExtremum(r:number, c:number, t:ResponseLayer, m:ResponseLayer, b:ResponseLayer, observer?:(p:IPoint)=>void):void{
			var D:Sylvester.Matrix = Sylvester.Matrix.create(this.BuildDerivative(r, c, t, m, b));
			var H:Sylvester.Matrix = Sylvester.Matrix.create(this.BuildHessian(r, c, t, m, b));
			var Hi:Sylvester.Matrix = H.inverse();
			var Of:Sylvester.Matrix  = Hi.map(e=>-e).multiply(D);

			// get the offsets from the interpolation
			var O:number[] = [ 
				Of.elements[0][0], 
				Of.elements[1][0], 
				Of.elements[2][0]
			];

			// get the step distance between filters
			var filterStep:number = (m.filter - b.filter);

			// If point is sufficiently close to the actual extremum
			if (Math.abs(O[0]) < 0.5 && Math.abs(O[1]) < 0.5 && Math.abs(O[2]) < 0.5){
				var ipt:IPoint = new IPoint();
				ipt.x = ((c + O[0]) * t.step);
				ipt.y = ((r + O[1]) * t.step);
				ipt.scale = ((0.1333) * (m.filter + O[2] * filterStep));
				ipt.laplacian = Math.floor(m.getLaplacian(r,c,t));
				this.ipts.push(ipt);
				if(observer){
					observer(ipt);
				}
			}
		}


		/// <summary>
		/// Build Matrix of First Order Scale-Space derivatives
		/// </summary>
		/// <param name="octave"></param>
		/// <param name="interval"></param>
		/// <param name="row"></param>
		/// <param name="column"></param>
		/// <returns>3x1 Matrix of Derivatives</returns>
		private BuildDerivative(r:number, c:number, t:ResponseLayer, m:ResponseLayer, b:ResponseLayer):number[][]{
			var dx:number, dy:number, ds:number;

			dx = (m.getResponse(r, c + 1, t) - m.getResponse(r, c - 1, t)) / 2;
			dy = (m.getResponse(r + 1, c, t) - m.getResponse(r - 1, c, t)) / 2;
			ds = (t.getResponse(r, c) - b.getResponse(r, c, t)) / 2;

			var D:number[][] = [ [ dx ], [ dy ], [ ds ] ];
			return D;
		}


		/// <summary>
		/// Build Hessian Matrix 
		/// </summary>
		/// <param name="octave"></param>
		/// <param name="interval"></param>
		/// <param name="row"></param>
		/// <param name="column"></param>
		/// <returns>3x3 Matrix of Second Order Derivatives</returns>
		private BuildHessian(r:number, c:number, t:ResponseLayer, m:ResponseLayer, b:ResponseLayer):number[][]{
			var v:number, dxx:number, dyy:number, dss:number, dxy:number, dxs:number, dys:number;

			v = m.getResponse(r, c, t);
			dxx = m.getResponse(r, c + 1, t) + m.getResponse(r, c - 1, t) - 2 * v;
			dyy = m.getResponse(r + 1, c, t) + m.getResponse(r - 1, c, t) - 2 * v;
			dss = t.getResponse(r, c) + b.getResponse(r, c, t) - 2 * v;
			dxy = (m.getResponse(r + 1, c + 1, t) - m.getResponse(r + 1, c - 1, t) -
			m.getResponse(r - 1, c + 1, t) + m.getResponse(r - 1, c - 1, t)) / 4;
			dxs = (t.getResponse(r, c + 1) - t.getResponse(r, c - 1) -
			b.getResponse(r, c + 1, t) + b.getResponse(r, c - 1, t)) / 4;
			dys = (t.getResponse(r + 1, c) - t.getResponse(r - 1, c) -
			b.getResponse(r + 1, c, t) + b.getResponse(r - 1, c, t)) / 4;

			return [
				[dxx, dxy, dxs],
				[dxy, dyy, dys],
				[dxs, dys, dss]
			];
		}
	}


	addEventListener('message', (e:any)=>{
		importScripts("../sylvester/src/sylvester.js", "../sylvester/src/matrix.js");

	    var data = e.data;
	    if(data.type === "image"){
	        var iimg:IntegralImage = deserializeIntegralImage(data.value);

	        // Extract the interest points
	        var ipts:IPoint[] = FastHessian.getIpoints(0.0002, 5, 2, iimg, (p:IPoint)=>{
	        	postMessage({"type":"point", "value":p}, undefined);  
	        }, (text:string)=>{
	        	postMessage({"type":"log", "value":text}, undefined);
	        });

	        // Describe the interest points
	        SurfDescriptor.DecribeInterestPoints(ipts, false, false, iimg, (p:IPoint,t:number)=>{
	            postMessage({"type":"describe", "value":p}, undefined);        
	        });

	        postMessage({"type":"finish", "value":ipts}, undefined);
	    }else{
	        throw new Error("Unknown data type: " + data.type);
	    }
	});
}