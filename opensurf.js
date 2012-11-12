var opensurf;
(function (opensurf) {
    var IPoint = (function () {
        function IPoint() {
            this.descriptor = null;
            this.orientation = 0;
        }
        IPoint.prototype.SetDescriptorLength = function (size) {
            this.descriptorLength = size;
            this.descriptor = new Float64Array(size);
        };
        return IPoint;
    })();
    opensurf.IPoint = IPoint;    
    var Color = (function () {
        function Color(R, G, B) {
            this.R = R;
            this.G = G;
            this.B = B;
        }
        return Color;
    })();    
    var IntegralImage = (function () {
        function IntegralImage(width, height, elems) {
            this.width = width;
            this.height = height;
            this.matrix = elems ? elems : Sylvester.Matrix.Zero(height, width);
        }
        IntegralImage.cR = 0.2989;
        IntegralImage.cG = 0.587;
        IntegralImage.cB = 0.114;
        IntegralImage.prototype.getPixel = function (y, x) {
            return this.matrix.elements[y][x];
        };
        IntegralImage.prototype.setPixel = function (y, x, value) {
            this.matrix.elements[y][x] = value;
        };
        IntegralImage.FromImage = function FromImage(image) {
            var canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            var g = canvas.getContext('2d');
            g.drawImage(image, 0, 0);
            var imageData = g.getImageData(0, 0, canvas.width, canvas.height);
            var pic = new IntegralImage(image.width, image.height);
            var rowsum = 0;
            for(var x = 0; x < image.width; x++) {
                var i = 4 * (imageData.width * 0 + x);
                rowsum += (IntegralImage.cR * imageData.data[i] + IntegralImage.cG * imageData.data[i + 1] + IntegralImage.cB * imageData.data[i + 2]) / 255;
                pic.setPixel(0, x, rowsum);
            }
            for(var y = 1; y < image.height; y++) {
                rowsum = 0;
                for(var x = 0; x < image.width; x++) {
                    var i = 4 * (imageData.width * y + x);
                    rowsum += (IntegralImage.cR * imageData.data[i] + IntegralImage.cG * imageData.data[i + 1] + IntegralImage.cB * imageData.data[i + 2]) / 255;
                    pic.setPixel(y, x, rowsum + pic.getPixel(y - 1, x));
                }
            }
            return pic;
        }
        IntegralImage.prototype.BoxIntegral = function (row, col, rows, cols) {
            var r1 = Math.min(row, this.height) - 1;
            var c1 = Math.min(col, this.width) - 1;
            var r2 = Math.min(row + rows, this.height) - 1;
            var c2 = Math.min(col + cols, this.width) - 1;
            var A = 0;
            var B = 0;
            var C = 0;
            var D = 0;

            if(r1 >= 0 && c1 >= 0) {
                A = this.matrix.elements[r1][c1];
            }
            if(r1 >= 0 && c2 >= 0) {
                B = this.matrix.elements[r1][c2];
            }
            if(r2 >= 0 && c1 >= 0) {
                C = this.matrix.elements[r2][c1];
            }
            if(r2 >= 0 && c2 >= 0) {
                D = this.matrix.elements[r2][c2];
            }
            return Math.max(0, A - B - C + D);
        };
        IntegralImage.prototype.HaarX = function (row, column, size) {
            return this.BoxIntegral(row - size / 2, column, size, size / 2) - 1 * this.BoxIntegral(row - size / 2, column - size / 2, size, size / 2);
        };
        IntegralImage.prototype.HaarY = function (row, column, size) {
            return this.BoxIntegral(row, column - size / 2, size / 2, size) - 1 * this.BoxIntegral(row - size / 2, column - size / 2, size / 2, size);
        };
        IntegralImage.prototype.serialize = function () {
            return {
                width: this.width,
                height: this.height,
                elements: this.matrix.elements
            };
        };
        return IntegralImage;
    })();
    opensurf.IntegralImage = IntegralImage;    
    function deserializeIntegralImage(obj) {
        return new IntegralImage(obj.width, obj.height, Sylvester.Matrix.create(obj.elements));
    }
    opensurf.deserializeIntegralImage = deserializeIntegralImage;
    var SurfDescriptor = (function () {
        function SurfDescriptor() {
            this.gauss25 = [
                [
                    0.02350693969273, 
                    0.01849121369071, 
                    0.01239503121241, 
                    0.00708015417522, 
                    0.00344628101733, 
                    0.00142945847484, 
                    0.0005052487906
                ], 
                [
                    0.02169964028389, 
                    0.01706954162243, 
                    0.01144205592615, 
                    0.00653580605408, 
                    0.00318131834134, 
                    0.00131955648461, 
                    0.00046640341759
                ], 
                [
                    0.01706954162243, 
                    0.01342737701584, 
                    0.00900063997939, 
                    0.00514124713667, 
                    0.00250251364222, 
                    0.00103799989504, 
                    0.00036688592278
                ], 
                [
                    0.01144205592615, 
                    0.00900063997939, 
                    0.00603330940534, 
                    0.00344628101733, 
                    0.00167748505986, 
                    0.00069579213743, 
                    0.00024593098864
                ], 
                [
                    0.00653580605408, 
                    0.00514124713667, 
                    0.00344628101733, 
                    0.00196854695367, 
                    0.00095819467066, 
                    0.00039744277546, 
                    0.0001404780098
                ], 
                [
                    0.00318131834134, 
                    0.00250251364222, 
                    0.00167748505986, 
                    0.00095819467066, 
                    0.00046640341759, 
                    0.00019345616757, 
                    0.00006837798818
                ], 
                [
                    0.00131955648461, 
                    0.00103799989504, 
                    0.00069579213743, 
                    0.00039744277546, 
                    0.00019345616757, 
                    0.00008024231247, 
                    0.00002836202103
                ]
            ];
        }
        SurfDescriptor.DecribeInterestPoints = function DecribeInterestPoints(ipts, upright, extended, img, progress) {
            var des = new SurfDescriptor();
            des.DescribeInterestPoints(ipts, upright, extended, img, progress);
        }
        SurfDescriptor.prototype.DescribeInterestPoints = function (ipts, upright, extended, img, progress) {
            var _this = this;
            if(ipts.length == 0) {
                return;
            }
            this.img = img;
            ipts.forEach(function (ip, i) {
                if(extended) {
                    ip.descriptorLength = 128;
                } else {
                    ip.descriptorLength = 64;
                }
                if(!upright) {
                    _this.GetOrientation(ip);
                }
                _this.GetDescriptor(ip, upright, extended);
                if(progress) {
                    progress(ip, i / ipts.length);
                }
            });
        };
        SurfDescriptor.prototype.GetOrientation = function (ip) {
            var Responses = 109;
            var resX = new Float64Array(Responses);
            var resY = new Float64Array(Responses);
            var Ang = new Float64Array(Responses);
            var idx = 0;
            var id = [
                6, 
                5, 
                4, 
                3, 
                2, 
                1, 
                0, 
                1, 
                2, 
                3, 
                4, 
                5, 
                6
            ];
            var X = Math.round(ip.x);
            var Y = Math.round(ip.y);
            var S = Math.round(ip.scale);
            for(var i = -6; i <= 6; ++i) {
                for(var j = -6; j <= 6; ++j) {
                    if(i * i + j * j < 36) {
                        var gauss = this.gauss25[id[i + 6]][id[j + 6]];
                        resX[idx] = gauss * this.img.HaarX(Y + j * S, X + i * S, 4 * S);
                        resY[idx] = gauss * this.img.HaarY(Y + j * S, X + i * S, 4 * S);
                        Ang[idx] = this.GetAngle(resX[idx], resY[idx]);
                        ++idx;
                    }
                }
            }
            var sumX;
            var sumY;
            var max = 0;
            var orientation = 0;

            var ang1;
            var ang2;

            var pi = Math.PI;
            for(ang1 = 0; ang1 < 2 * pi; ang1 += 0.15) {
                ang2 = (ang1 + pi / 3 > 2 * pi ? ang1 - 5 * pi / 3 : ang1 + pi / 3);
                sumX = sumY = 0;
                for(var k = 0; k < Responses; ++k) {
                    if(ang1 < ang2 && ang1 < Ang[k] && Ang[k] < ang2) {
                        sumX += resX[k];
                        sumY += resY[k];
                    } else {
                        if(ang2 < ang1 && ((Ang[k] > 0 && Ang[k] < ang2) || (Ang[k] > ang1 && Ang[k] < pi))) {
                            sumX += resX[k];
                            sumY += resY[k];
                        }
                    }
                }
                if(sumX * sumX + sumY * sumY > max) {
                    max = sumX * sumX + sumY * sumY;
                    orientation = this.GetAngle(sumX, sumY);
                }
            }
            ip.orientation = orientation;
        };
        SurfDescriptor.prototype.GetDescriptor = function (ip, bUpright, bExtended) {
            var sample_x;
            var sample_y;
            var count = 0;

            var i = 0;
            var ix = 0;
            var j = 0;
            var jx = 0;
            var xs = 0;
            var ys = 0;

            var dx;
            var dy;
            var mdx;
            var mdy;
            var co;
            var si;

            var dx_yn;
            var mdx_yn;
            var dy_xn;
            var mdy_xn;

            var gauss_s1 = 0;
            var gauss_s2 = 0;

            var rx = 0;
            var ry = 0;
            var rrx = 0;
            var rry = 0;
            var len = 0;

            var cx = -0.5;
            var cy = 0;

            var X = Math.round(ip.x);
            var Y = Math.round(ip.y);
            var S = Math.round(ip.scale);
            ip.SetDescriptorLength(64);
            if(bUpright) {
                co = 1;
                si = 0;
            } else {
                co = Math.cos(ip.orientation);
                si = Math.sin(ip.orientation);
            }
            i = -8;
            while(i < 12) {
                j = -8;
                i = i - 4;
                cx += 1;
                cy = -0.5;
                while(j < 12) {
                    cy += 1;
                    j = j - 4;
                    ix = i + 5;
                    jx = j + 5;
                    dx = dy = mdx = mdy = 0;
                    dx_yn = mdx_yn = dy_xn = mdy_xn = 0;
                    xs = Math.round(X + (-jx * S * si + ix * S * co));
                    ys = Math.round(Y + (jx * S * co + ix * S * si));
                    dx = dy = mdx = mdy = 0;
                    dx_yn = mdx_yn = dy_xn = mdy_xn = 0;
                    for(var k = i; k < i + 9; ++k) {
                        for(var l = j; l < j + 9; ++l) {
                            sample_x = Math.round(X + (-l * S * si + k * S * co));
                            sample_y = Math.round(Y + (l * S * co + k * S * si));
                            gauss_s1 = this.Gaussian(xs - sample_x, ys - sample_y, 2.5 * S);
                            rx = this.img.HaarX(sample_y, sample_x, 2 * S);
                            ry = this.img.HaarY(sample_y, sample_x, 2 * S);
                            rrx = gauss_s1 * (-rx * si + ry * co);
                            rry = gauss_s1 * (rx * co + ry * si);
                            if(bExtended) {
                                if(rry >= 0) {
                                    dx += rrx;
                                    mdx += Math.abs(rrx);
                                } else {
                                    dx_yn += rrx;
                                    mdx_yn += Math.abs(rrx);
                                }
                                if(rrx >= 0) {
                                    dy += rry;
                                    mdy += Math.abs(rry);
                                } else {
                                    dy_xn += rry;
                                    mdy_xn += Math.abs(rry);
                                }
                            } else {
                                dx += rrx;
                                dy += rry;
                                mdx += Math.abs(rrx);
                                mdy += Math.abs(rry);
                            }
                        }
                    }
                    gauss_s2 = this.Gaussian(cx - 2, cy - 2, 1.5);
                    ip.descriptor[count++] = dx * gauss_s2;
                    ip.descriptor[count++] = dy * gauss_s2;
                    ip.descriptor[count++] = mdx * gauss_s2;
                    ip.descriptor[count++] = mdy * gauss_s2;
                    if(bExtended) {
                        ip.descriptor[count++] = dx_yn * gauss_s2;
                        ip.descriptor[count++] = dy_xn * gauss_s2;
                        ip.descriptor[count++] = mdx_yn * gauss_s2;
                        ip.descriptor[count++] = mdy_xn * gauss_s2;
                    }
                    len += (dx * dx + dy * dy + mdx * mdx + mdy * mdy + dx_yn + dy_xn + mdx_yn + mdy_xn) * gauss_s2 * gauss_s2;
                    j += 9;
                }
                i += 9;
            }
            len = Math.sqrt(len);
            if(len > 0) {
                for(var d = 0; d < ip.descriptorLength; ++d) {
                    ip.descriptor[d] /= len;
                }
            }
        };
        SurfDescriptor.prototype.GetAngle = function (X, Y) {
            if(X >= 0 && Y >= 0) {
                return Math.atan(Y / X);
            } else {
                if(X < 0 && Y >= 0) {
                    return Math.PI - Math.atan(-Y / X);
                } else {
                    if(X < 0 && Y < 0) {
                        return Math.PI + Math.atan(Y / X);
                    } else {
                        if(X >= 0 && Y < 0) {
                            return 2 * Math.PI - Math.atan(-Y / X);
                        }
                    }
                }
            }
            return 0;
        };
        SurfDescriptor.prototype.Gaussian = function (x, y, sig) {
            var pi = Math.PI;
            return (1 / (2 * pi * sig * sig)) * Math.exp(-(x * x + y * y) / (2 * sig * sig));
        };
        return SurfDescriptor;
    })();
    opensurf.SurfDescriptor = SurfDescriptor;    
    var ResponseLayer = (function () {
        function ResponseLayer(width, height, step, filter) {
            this.width = width;
            this.height = height;
            this.step = step;
            this.filter = filter;
            this.responses = new Float64Array(width * height);
            this.laplacian = new Float64Array(width * height);
        }
        ResponseLayer.prototype.getLaplacian = function (row, column, src) {
            if(src !== undefined) {
                var scale = this.width / src.width;
                return this.laplacian[(scale * row) * this.width + (scale * column)];
            } else {
                return this.laplacian[row * this.width + column];
            }
        };
        ResponseLayer.prototype.getResponse = function (row, column, src) {
            if(src !== undefined) {
                var scale = this.width / src.width;
                return this.responses[(scale * row) * this.width + (scale * column)];
            } else {
                return this.responses[row * this.width + column];
            }
        };
        return ResponseLayer;
    })();    
    var FastHessian = (function () {
        function FastHessian(thresh, octaves, init_sample, img) {
            this.thresh = thresh;
            this.octaves = octaves;
            this.init_sample = init_sample;
            this.img = img;
        }
        FastHessian.getIpoints = function getIpoints(thresh, octaves, init_sample, img, observer, logger) {
            var fh = new FastHessian(thresh, octaves, init_sample, img);
            return fh.getIpoints(observer, logger);
        }
        FastHessian.prototype.getIpoints = function (observer, logger) {
            var filter_map = [
                [
                    0, 
                    1, 
                    2, 
                    3
                ], 
                [
                    1, 
                    3, 
                    4, 
                    5
                ], 
                [
                    3, 
                    5, 
                    6, 
                    7
                ], 
                [
                    5, 
                    7, 
                    8, 
                    9
                ], 
                [
                    7, 
                    9, 
                    10, 
                    11
                ]
            ];
            this.ipts = [];
            this.buildResponseMap();
            var b;
            var m;
            var t;

            for(var o = 0; o < this.octaves; ++o) {
                for(var i = 0; i <= 1; ++i) {
                    b = this.responseMap[filter_map[o][i]];
                    m = this.responseMap[filter_map[o][i + 1]];
                    t = this.responseMap[filter_map[o][i + 2]];
                    for(var r = 0; r < t.height; ++r) {
                        for(var c = 0; c < t.width; ++c) {
                            if(this.isExtremum(r, c, t, m, b)) {
                                if(logger) {
                                    logger(this.ipts.length + ": r=" + r + ", c=" + c);
                                }
                                if(this.ipts.length === 417) {
                                    var hoge = 0;
                                }
                                this.interpolateExtremum(r, c, t, m, b, observer);
                            }
                        }
                    }
                }
            }
            return this.ipts;
        };
        FastHessian.prototype.buildResponseMap = function () {
            this.responseMap = [];
            var w = (this.img.width / this.init_sample);
            var h = (this.img.height / this.init_sample);
            var s = (this.init_sample);
            if(this.octaves >= 1) {
                this.responseMap.push(new ResponseLayer(w, h, s, 9));
                this.responseMap.push(new ResponseLayer(w, h, s, 15));
                this.responseMap.push(new ResponseLayer(w, h, s, 21));
                this.responseMap.push(new ResponseLayer(w, h, s, 27));
            }
            if(this.octaves >= 2) {
                this.responseMap.push(new ResponseLayer(w / 2, h / 2, s * 2, 39));
                this.responseMap.push(new ResponseLayer(w / 2, h / 2, s * 2, 51));
            }
            if(this.octaves >= 3) {
                this.responseMap.push(new ResponseLayer(w / 4, h / 4, s * 4, 75));
                this.responseMap.push(new ResponseLayer(w / 4, h / 4, s * 4, 99));
            }
            if(this.octaves >= 4) {
                this.responseMap.push(new ResponseLayer(w / 8, h / 8, s * 8, 147));
                this.responseMap.push(new ResponseLayer(w / 8, h / 8, s * 8, 195));
            }
            if(this.octaves >= 5) {
                this.responseMap.push(new ResponseLayer(w / 16, h / 16, s * 16, 291));
                this.responseMap.push(new ResponseLayer(w / 16, h / 16, s * 16, 387));
            }
            for(var i = 0; i < this.responseMap.length; ++i) {
                this.buildResponseLayer(this.responseMap[i]);
            }
        };
        FastHessian.prototype.buildResponseLayer = function (rl) {
            var step = rl.step;
            var b = (rl.filter - 1) / 2;
            var l = rl.filter / 3;
            var w = rl.filter;
            var inverse_area = 1 / (w * w);
            var Dxx;
            var Dyy;
            var Dxy;

            for(var r, c, ar = 0, index = 0; ar < rl.height; ++ar) {
                for(var ac = 0; ac < rl.width; ++ac , index++) {
                    r = ar * step;
                    c = ac * step;
                    Dxx = this.img.BoxIntegral(r - l + 1, c - b, 2 * l - 1, w) - this.img.BoxIntegral(r - l + 1, c - Math.floor(l / 2), 2 * l - 1, l) * 3;
                    Dyy = this.img.BoxIntegral(r - b, c - l + 1, w, 2 * l - 1) - this.img.BoxIntegral(r - Math.floor(l / 2), c - l + 1, l, 2 * l - 1) * 3;
                    Dxy = +this.img.BoxIntegral(r - l, c + 1, l, l) + this.img.BoxIntegral(r + 1, c - l, l, l) - this.img.BoxIntegral(r - l, c - l, l, l) - this.img.BoxIntegral(r + 1, c + 1, l, l);
                    Dxx *= inverse_area;
                    Dyy *= inverse_area;
                    Dxy *= inverse_area;
                    rl.responses[index] = (Dxx * Dyy - 0.81 * Dxy * Dxy);
                    rl.laplacian[index] = (Dxx + Dyy >= 0 ? 1 : 0);
                }
            }
        };
        FastHessian.prototype.isExtremum = function (r, c, t, m, b) {
            var layerBorder = (t.filter + 1) / (2 * t.step);
            if(r <= layerBorder || r >= t.height - layerBorder || c <= layerBorder || c >= t.width - layerBorder) {
                return false;
            }
            var candidate = m.getResponse(r, c, t);
            if(candidate < this.thresh) {
                return false;
            }
            for(var rr = -1; rr <= 1; ++rr) {
                for(var cc = -1; cc <= 1; ++cc) {
                    if(t.getResponse(r + rr, c + cc) >= candidate || ((rr != 0 || cc != 0) && m.getResponse(r + rr, c + cc, t) >= candidate) || b.getResponse(r + rr, c + cc, t) >= candidate) {
                        return false;
                    }
                }
            }
            return true;
        };
        FastHessian.prototype.interpolateExtremum = function (r, c, t, m, b, observer) {
            var D = Sylvester.Matrix.create(this.BuildDerivative(r, c, t, m, b));
            var H = Sylvester.Matrix.create(this.BuildHessian(r, c, t, m, b));
            var Hi = H.inverse();
            var Of = Hi.map(function (e) {
                return -e;
            }).multiply(D);
            var O = [
                Of.elements[0][0], 
                Of.elements[1][0], 
                Of.elements[2][0]
            ];
            var filterStep = (m.filter - b.filter);
            if(Math.abs(O[0]) < 0.5 && Math.abs(O[1]) < 0.5 && Math.abs(O[2]) < 0.5) {
                var ipt = new IPoint();
                ipt.x = ((c + O[0]) * t.step);
                ipt.y = ((r + O[1]) * t.step);
                ipt.scale = ((0.1333) * (m.filter + O[2] * filterStep));
                ipt.laplacian = Math.floor(m.getLaplacian(r, c, t));
                this.ipts.push(ipt);
                if(observer) {
                    observer(ipt);
                }
            }
        };
        FastHessian.prototype.BuildDerivative = function (r, c, t, m, b) {
            var dx;
            var dy;
            var ds;

            dx = (m.getResponse(r, c + 1, t) - m.getResponse(r, c - 1, t)) / 2;
            dy = (m.getResponse(r + 1, c, t) - m.getResponse(r - 1, c, t)) / 2;
            ds = (t.getResponse(r, c) - b.getResponse(r, c, t)) / 2;
            var D = [
                [
                    dx
                ], 
                [
                    dy
                ], 
                [
                    ds
                ]
            ];
            return D;
        };
        FastHessian.prototype.BuildHessian = function (r, c, t, m, b) {
            var v;
            var dxx;
            var dyy;
            var dss;
            var dxy;
            var dxs;
            var dys;

            v = m.getResponse(r, c, t);
            dxx = m.getResponse(r, c + 1, t) + m.getResponse(r, c - 1, t) - 2 * v;
            dyy = m.getResponse(r + 1, c, t) + m.getResponse(r - 1, c, t) - 2 * v;
            dss = t.getResponse(r, c) + b.getResponse(r, c, t) - 2 * v;
            dxy = (m.getResponse(r + 1, c + 1, t) - m.getResponse(r + 1, c - 1, t) - m.getResponse(r - 1, c + 1, t) + m.getResponse(r - 1, c - 1, t)) / 4;
            dxs = (t.getResponse(r, c + 1) - t.getResponse(r, c - 1) - b.getResponse(r, c + 1, t) + b.getResponse(r, c - 1, t)) / 4;
            dys = (t.getResponse(r + 1, c) - t.getResponse(r - 1, c) - b.getResponse(r + 1, c, t) + b.getResponse(r - 1, c, t)) / 4;
            return [
                [
                    dxx, 
                    dxy, 
                    dxs
                ], 
                [
                    dxy, 
                    dyy, 
                    dys
                ], 
                [
                    dxs, 
                    dys, 
                    dss
                ]
            ];
        };
        return FastHessian;
    })();
    opensurf.FastHessian = FastHessian;    
    addEventListener('message', function (e) {
        importScripts("../sylvester/src/sylvester.js", "../sylvester/src/matrix.js");
        var data = e.data;
        if(data.type === "image") {
            var iimg = deserializeIntegralImage(data.value);
            var ipts = FastHessian.getIpoints(0.0002, 5, 2, iimg, function (p) {
                postMessage({
                    "type": "point",
                    "value": p
                }, undefined);
            }, function (text) {
                postMessage({
                    "type": "log",
                    "value": text
                }, undefined);
            });
            SurfDescriptor.DecribeInterestPoints(ipts, false, false, iimg, function (p, t) {
                postMessage({
                    "type": "describe",
                    "value": p
                }, undefined);
            });
            postMessage({
                "type": "finish",
                "value": ipts
            }, undefined);
        } else {
            throw new Error("Unknown data type: " + data.type);
        }
    });
})(opensurf || (opensurf = {}));

//@ sourceMappingURL=opensurf.js.map
