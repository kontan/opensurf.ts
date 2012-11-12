var OpenSURFDemo;
(function (OpenSURFDemo) {
    $(function () {
        var canvas = document.querySelector('#canvas');
        var g = canvas.getContext('2d');
        var img;
        function setImage(url) {
            $('#startBtn').attr("disabled", "disabled");
            $('#message').text("Loading the image...");
            img = new Image();
            img.addEventListener('load', function () {
                canvas.width = img.width;
                canvas.height = img.height;
                g.drawImage(img, 0, 0);
                $('#startBtn').removeAttr("disabled");
                $('#image_description').text("size:" + img.width + "x" + img.height);
                $('#message').text("Ready.");
            });
            img.src = url;
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
            try  {
                $('#message').text("Processing...");
                g.drawImage(img, 0, 0);
                var iimg = opensurf.IntegralImage.FromImage(img);
                var worker = new Worker('opensurf.js');
                var ipts = [];
                var start = new Date().getTime();
                function timespan() {
                    var result = ((new Date().getTime() - start) * 0.001).toFixed(2) + "sec.";
                    start = new Date().getTime();
                    return result;
                }
                var totalStart = new Date().getTime();
                var listener = function (data) {
                    var createWorker = timespan();
                    listener = function (data) {
                        if(data.type === "point") {
                            paintIPoint(data.value);
                        } else {
                            if(data.type === "describe") {
                                var getPoints = timespan();
                                listener = function (data) {
                                    if(data.type === "describe") {
                                        var ipt = data.value;
                                        paintIPointDescribe(ipt);
                                        ipts.push(ipt);
                                    } else {
                                        if(data.type === "finish") {
                                            var describe = timespan();
                                            $('#message').text("points:" + ipts.length + " createWorker:" + createWorker + " getPoints:" + getPoints + " describe:" + describe + " total:" + ((new Date().getTime() - totalStart) * 0.001).toFixed(2) + "sec.");
                                        } else {
                                            throw new Error("Unexpected message");
                                        }
                                    }
                                };
                                listener(data);
                            } else {
                                throw new Error("Unexpected message");
                            }
                        }
                    };
                    listener(data);
                };
                worker.addEventListener('message', function (e) {
                    if(e.data.type === "log") {
                        console.log(e.data.value);
                    } else {
                        listener(e.data);
                    }
                }, false);
                worker.postMessage({
                    "type": "image",
                    "value": iimg.serialize()
                });
            } catch (e) {
                $('#message').text("ERROR: " + e.toString() + " / " + e.message);
            }
        }
        function executeSynchronous() {
            g.drawImage(img, 0, 0);
            var totalStart = new Date().getTime();
            var iimg;
            var createIntegralImage = measureTime(function () {
                iimg = opensurf.IntegralImage.FromImage(img);
            });
            var ipts;
            var getPoints = measureTime(function () {
                ipts = opensurf.FastHessian.getIpoints(0.0002, 5, 2, iimg, function (p) {
                    paintIPoint(p);
                }, function (text) {
                    console.log(text);
                });
            });
            var describe = measureTime(function () {
                opensurf.SurfDescriptor.DecribeInterestPoints(ipts, false, false, iimg, function (p, t) {
                    paintIPointDescribe(p);
                });
            });
            $('#message').text("points:" + ipts.length + " createIntegralImage:" + createIntegralImage + "sec." + " getPoints:" + getPoints + "sec." + " describe:" + describe + "sec." + " total:" + ((new Date().getTime() - totalStart) * 0.001).toFixed(2) + "sec.");
        }
        $('#startBtn').click(function () {
            startWorker();
        });
        $('#startBtn_sync').click(function () {
            executeSynchronous();
        });
        $('#load_button').click(function () {
            setImage($("#url_text").val());
        });
        $('a.sample').click(function (e) {
            var url = $(e.target).attr("href");
            $("#url_text").val(url);
            setImage(url);
            e.preventDefault();
        });
        setImage($("#url_text").val());
    });
})(OpenSURFDemo || (OpenSURFDemo = {}));

//@ sourceMappingURL=demo.js.map
