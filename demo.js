var OpenSURFDemo;
(function (OpenSURFDemo) {
    $(function () {
        var canvas = document.querySelector('#canvas');
        var g = canvas.getContext('2d');
        var img;
        function setImage(url) {
            img = new Image();
            img.addEventListener('load', function () {
                canvas.width = img.width;
                canvas.height = img.height;
                g.drawImage(img, 0, 0);
                $('#startBtn').removeAttr("disabled");
            });
            img.src = url;
            $('#startBtn').attr("disabled", "disabled");
        }
        function PaintSURF(img, ipts) {
            ipts.forEach(function (ip) {
                paintIPoint(ip);
            });
        }
        function paintIPoint(ip) {
            var S = 2 * Math.floor(2.5 * ip.scale);
            var R = S / 2;
            var ptRx = R * Math.cos(ip.orientation);
            var ptRy = R * Math.sin(ip.orientation);
            g.strokeStyle = ip.laplacian > 0 ? "blue" : "red";
            g.beginPath();
            g.arc(ip.x, ip.y, R, 0, 10);
            g.stroke();
        }
        function paintIPointDescribe(ip) {
            var S = 2 * Math.floor(2.5 * ip.scale);
            var R = S / 2;
            var ptRx = R * Math.cos(ip.orientation);
            var ptRy = R * Math.sin(ip.orientation);
            g.strokeStyle = "rgb(0, 255, 0)";
            g.beginPath();
            g.moveTo(ip.x, ip.y);
            g.lineTo(ip.x + ptRx, ip.y + ptRy);
            g.stroke();
        }
        function measureTime(func) {
            var startTime = new Date();
            func();
            var time = ((new Date().getTime() - startTime.getTime()) * 0.001).toFixed(2);
            return time;
        }
        function startWorker() {
            g.drawImage(img, 0, 0);
            var iimg = opensurf.IntegralImage.FromImage(img);
            var worker = new Worker('opensurf.js');
            var ipts = [];
            var listener = function (data) {
                if(data.type === "point") {
                    paintIPoint(data.value);
                } else {
                    if(data.type === "describe") {
                        listener = function (data) {
                            if(data.type === "describe") {
                                var ipt = data.value;
                                paintIPointDescribe(ipt);
                                ipts.push(ipt);
                            } else {
                                if(data.type === "finish") {
                                    var ipts = data.value;
                                }
                            }
                        };
                        listener(data);
                    }
                }
            };
            worker.addEventListener('message', function (e) {
                listener(e.data);
            }, false);
            worker.postMessage({
                "type": "image",
                "value": iimg.serialize()
            });
        }
        $('#startBtn').click(function () {
            startWorker();
            return;
            if(img && img.complete) {
                var startTime = new Date();
                var iimg;
                var ipts;
                var fromImageTime;
                var getIpointsTime;
                var decribeTime;

                var totalTime = measureTime(function () {
                    iimg = opensurf.deserializeIntegralImage(parsed);
                    getIpointsTime = measureTime(function () {
                        ipts = opensurf.FastHessian.getIpoints(0.0002, 5, 2, iimg);
                    });
                    decribeTime = measureTime(function () {
                        opensurf.SurfDescriptor.DecribeInterestPoints(ipts, false, false, iimg);
                    });
                });
                $('#message').text("points:" + ipts.length + " fromImage:" + fromImageTime + "sec." + " getIpoints:" + getIpointsTime + "sec." + " decribe:" + decribeTime + "sec." + " total:" + totalTime + "sec.");
                PaintSURF(img, ipts);
            }
        });
        setImage("yamada.png");
    });
})(OpenSURFDemo || (OpenSURFDemo = {}));

//@ sourceMappingURL=demo.js.map
