var caman = {};

(function () {
	var dom_ready = function (callback) {
		if (document.readyState === "complete") {
			return setTimeout(callback, 1);
		}
		
		if (document.addEventListener) {
			window.addEventListener( "load", callback, false);
		} else if (document.attachEvent) {
			window.attachEvent("onload", callback);
		}
	};
	
	caman.init = function (url, canvas_id, ready_callback) {
		var img, image_ready;
			
		image_ready = function (image, canvas_id) {
			var manip, canvas;
			
			if (canvas_id.substr(0, 1) === '#') {
				canvas = document.getElementById(canvas_id.substr(1));
				manip = caman.manip.load(image, canvas);
				ready_callback.call(manip);
			} else if (canvas.substr(0, 1) === '.') { // class support
				
			}
		};
		
		img = document.createElement('img');
		img.src = url;
		img.onload = function () {
			dom_ready(function () {
				image_ready(img, canvas_id);
			});
		};

	};
	
	caman.manip = (function () {
		var canvases = [];
		
		return {
			load: function (image, canvas) {
				var cxt, image_data, pixel_data;
				
				canvas.width = image.width;
				canvas.height = image.height;
				
				cxt = canvas.getContext('2d');
				cxt.drawImage(image, 0, 0);
				
				image_data = cxt.getImageData(0, 0, image.width, image.height);
				pixel_data = image_data.data;
				
				canvases.push(canvas);
				
				return {
					width: function () {
						return image.width;
					},
					
					height: function () {
						return image.height;
					},
					
					pixels: function () {
						return pixel_data;
					},
					
					pixel_loop: function (callback) {
						var i, n = pixel_data.length,
							res;
						
						for (i = 0; i < n; i += 4) {
							res = callback({r: pixel_data[i], g: pixel_data[i+1], b: pixel_data[i+2], a: pixel_data[i+3]});
							pixel_data[i] = res.r;
							pixel_data[i+1] = res.g;
							pixel_data[i+2] = res.b;
							pixel_data[i+3] = res.a;
						}
					},
					
					brightness: function (adjust) {							
						adjust = Math.floor(255 * (adjust / 100));
						
						this.pixel_loop(function (rgba) {
							rgba.r += adjust;
							rgba.g += adjust;
							rgba.b += adjust;
							
							return rgba;
						});
						
						cxt.putImageData(image_data, 0, 0);
					},
					
					saturation: function (adjust) {
						var i, j,
							n = pixel_data.length,
							max, diff;
							
						adjust *= -1;
						
						for (i = 0; i < n; i +=4) {
							max = Math.max(pixel_data[i], pixel_data[i+1], pixel_data[i+2]);
							
							for (j = 0; j < 3; j++) {
								if (pixel_data[i+j] === max) {
									continue;
								}
								
								diff = max - pixel_data[i+j];
								pixel_data[i+j] += Math.ceil(diff * (adjust / 100));
							}
						}
						
						cxt.putImageData(image_data, 0, 0);
					},
					
					contrast: function (adjust) {
						var contrast, chan;
						
						contrast = Math.pow((100 + adjust) / 100, 2);
						
						this.pixel_loop(function (rgba) {							
							for (chan in rgba) {
								if (rgba.hasOwnProperty(chan)) {
									rgba[chan] /= 255;
									rgba[chan] -= 0.5;
									rgba[chan] *= contrast;
									rgba[chan] += 0.5;
									rgba[chan] *= 255;
									if (rgba[chan] > 255) {
										rgba[chan] = 255;
									} else if (rgba[chan] < 0) {
										rgba[chan] = 0;
									}
								}
							}
							
							return rgba;
						});
						
						cxt.putImageData(image_data, 0, 0);
					},
					
					hue: function (adjust) {
						var hsv, rgb, h;
						
						this.pixel_loop(function (rgba) {
							hsv = caman.util.rgb_to_hsv(rgba.r, rgba.g, rgba.b);
							h = hsv.h * 100;
							h += Math.abs(adjust);
							h = h % 100;
							h /= 100;
							hsv.h = h;
							
							rgb = caman.util.hsv_to_rgb(hsv.h, hsv.s, hsv.v);
							
							return {r: rgb.r, g: rgb.g, b: rgb.b, a: rgba.a};
						});
						
						cxt.putImageData(image_data, 0, 0);
					},
					
					colorize: function (r, g, b, adjust) {
						var diff;
						this.pixel_loop(function (rgba) {
							rgba.r -= (rgba.r - r) * (adjust / 100);
							rgba.g -= (rgba.g - g) * (adjust / 100);
							rgba.b -= (rgba.b - b) * (adjust / 100);
							
							return rgba;
						});
						
						cxt.putImageData(image_data, 0, 0);
					}
				};
			}
		};
		
	}());
	
	caman.util = (function () {
		// color conversion formulas slightly modified from
		// http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
		
		return {
			/**
			 * Converts an RGB color value to HSL. Conversion formula
			 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
			 * Assumes r, g, and b are contained in the set [0, 255] and
			 * returns h, s, and l in the set [0, 1].
			 *
			 * @param   Number  r       The red color value
			 * @param   Number  g       The green color value
			 * @param   Number  b       The blue color value
			 * @return  Array           The HSL representation
			 */
			rgb_to_hsl: function (r, g, b) {
			    r /= 255, g /= 255, b /= 255;
			    var max = Math.max(r, g, b), min = Math.min(r, g, b);
			    var h, s, l = (max + min) / 2;
			
			    if(max == min){
			        h = s = 0; // achromatic
			    }else{
			        var d = max - min;
			        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			        switch(max){
			            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			            case g: h = (b - r) / d + 2; break;
			            case b: h = (r - g) / d + 4; break;
			        }
			        h /= 6;
			    }
			
			    return {h: h, s: s, l: l};
			},

			/**
			 * Converts an HSL color value to RGB. Conversion formula
			 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
			 * Assumes h, s, and l are contained in the set [0, 1] and
			 * returns r, g, and b in the set [0, 255].
			 *
			 * @param   Number  h       The hue
			 * @param   Number  s       The saturation
			 * @param   Number  l       The lightness
			 * @return  Array           The RGB representation
			 */
			hsl_to_rgb: function (h, s, l){
			    var r, g, b;
			
			    if(s == 0){
			        r = g = b = l; // achromatic
			    } else {
			        function hue2rgb(p, q, t){
			            if(t < 0) t += 1;
			            if(t > 1) t -= 1;
			            if(t < 1/6) return p + (q - p) * 6 * t;
			            if(t < 1/2) return q;
			            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
			            return p;
			        }
			
			        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			        var p = 2 * l - q;
			        r = hue2rgb(p, q, h + 1/3);
			        g = hue2rgb(p, q, h);
			        b = hue2rgb(p, q, h - 1/3);
			    }
			
			    return {r: r * 255, g: g * 255, b: b * 255};
			},

			/**
			 * Converts an RGB color value to HSV. Conversion formula
			 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
			 * Assumes r, g, and b are contained in the set [0, 255] and
			 * returns h, s, and v in the set [0, 1].
			 *
			 * @param   Number  r       The red color value
			 * @param   Number  g       The green color value
			 * @param   Number  b       The blue color value
			 * @return  Array           The HSV representation
			 */
			rgb_to_hsv: function (r, g, b){
			    r = r/255, g = g/255, b = b/255;
			    var max = Math.max(r, g, b), min = Math.min(r, g, b);
			    var h, s, v = max;
			
			    var d = max - min;
			    s = max == 0 ? 0 : d / max;
			
			    if(max == min){
			        h = 0; // achromatic
			    } else {
			        switch(max){
			            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			            case g: h = (b - r) / d + 2; break;
			            case b: h = (r - g) / d + 4; break;
			        }
			        h /= 6;
			    }
			
			    return {h: h, s: s, v: v};
			},

			/**
			 * Converts an HSV color value to RGB. Conversion formula
			 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
			 * Assumes h, s, and v are contained in the set [0, 1] and
			 * returns r, g, and b in the set [0, 255].
			 *
			 * @param   Number  h       The hue
			 * @param   Number  s       The saturation
			 * @param   Number  v       The value
			 * @return  Array           The RGB representation
			 */
			hsv_to_rgb: function (h, s, v){
			    var r, g, b;
			
			    var i = Math.floor(h * 6);
			    var f = h * 6 - i;
			    var p = v * (1 - s);
			    var q = v * (1 - f * s);
			    var t = v * (1 - (1 - f) * s);
			
			    switch(i % 6){
			        case 0: r = v, g = t, b = p; break;
			        case 1: r = q, g = v, b = p; break;
			        case 2: r = p, g = v, b = t; break;
			        case 3: r = p, g = q, b = v; break;
			        case 4: r = t, g = p, b = v; break;
			        case 5: r = v, g = p, b = q; break;
			    }
			
			    return {r: r * 255, g: g * 255, b: b * 255};
			}
		};
	}());
	
}());