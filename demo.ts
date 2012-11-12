/// <reference path="jquery.d.ts" />
/// <reference path="opensurf.ts" />

module OpenSURFDemo{




    $(()=>{
        var canvas:HTMLCanvasElement = <HTMLCanvasElement>document.querySelector('#canvas');
        var g:CanvasRenderingContext2D = canvas.getContext('2d');
        var img:HTMLImageElement;

        function setImage(url:string):void{
            $('#startBtn').attr("disabled", "disabled");
            $('#message').text("Loading the image...");
            img = new Image();
            img.addEventListener('load', ()=>{
                canvas.width  = img.width;
                canvas.height = img.height;                
                g.drawImage(img, 0, 0);
                $('#startBtn').removeAttr("disabled");
                $('#image_description').text("size:" + img.width + "x" + img.height);
                $('#message').text("Ready.");
            });
            img.src = url;
        }


        function PaintSURF(img:HTMLImageElement, ipts:opensurf.IPoint[]):void{
            ipts.forEach((ip:opensurf.IPoint)=>{
                paintIPoint(ip);
            });
        }

        function paintIPoint(ip:opensurf.IPoint):void{
            var S:number = 2 * Math.floor(2.5 * ip.scale);
            var R:number = S / 2;
            var ptRx:number = R * Math.cos(ip.orientation);
            var ptRy:number = R * Math.sin(ip.orientation);

            g.strokeStyle = ip.laplacian > 0 ? "blue" : "red";
            g.beginPath();
            g.arc(ip.x, ip.y, R, 0, 10);
            g.stroke();
        }

        function paintIPointDescribe(ip:opensurf.IPoint):void{
            var S:number = 2 * Math.floor(2.5 * ip.scale);
            var R:number = S / 2;
            var ptRx:number = R * Math.cos(ip.orientation);
            var ptRy:number = R * Math.sin(ip.orientation);

            g.strokeStyle = "rgb(0, 255, 0)";
            //g.lineWidth = 3;
            g.beginPath();
            g.moveTo(ip.x, ip.y);
            g.lineTo(ip.x + ptRx, ip.y + ptRy);
            g.stroke();
        }

        function measureTime(func:()=>void):string{
            var startTime:Date = new Date();
            func();
            var time:string = ((new Date().getTime() - startTime.getTime()) * 0.001).toFixed(2);
            return time;
        }

        function startWorker(){
            try{
                $('#message').text("Processing...");
                g.drawImage(img, 0, 0);
                var iimg = opensurf.IntegralImage.FromImage(img);
                var worker:Worker = new Worker('opensurf.js');
                var ipts:opensurf.IPoint[] = [];

                var start = new Date().getTime();
                function timespan():string{
                    var result = ((new Date().getTime() - start) * 0.001).toFixed(2) + "sec.";
                    start = new Date().getTime();
                    return result;
                }

                var totalStart = new Date().getTime();

                var listener = (data)=>{
                    var createWorker = timespan();
                    listener = (data)=>{
                        if(data.type === "point"){
                            paintIPoint(data.value);
                        }else if(data.type === "describe"){
                            //g.drawImage(img, 0, 0);
                            var getPoints = timespan();
                            listener = (data)=>{
                                if(data.type === "describe"){
                                    var ipt:opensurf.IPoint = data.value;
                                    paintIPointDescribe(ipt);
                                    ipts.push(ipt);
                                }else if(data.type === "finish"){
                                    //var ipts:opensurf.IPoint[] = data.value;
                                    var describe = timespan();
                                    $('#message').text(
                                        "points:" + ipts.length + 
                                        " createWorker:" + createWorker +
                                        " getPoints:"    + getPoints +
                                        " describe:"     + describe + 
                                        " total:" + ((new Date().getTime() - totalStart) * 0.001).toFixed(2) + "sec."
                                    );
                                }else{
                                    throw new Error("Unexpected message");
                                }
                            };
                            listener(data);

                        }else{
                            throw new Error("Unexpected message");
                        }
                    };
                    listener(data);
                };

                worker.addEventListener('message', (e:any)=>{
                    if(e.data.type === "log"){
                        console.log(e.data.value);
                    }else{
                        listener(e.data);
                    }
                }, false);

                worker.postMessage({"type":"image", "value":iimg.serialize()});
            }catch(e){
                $('#message').text("ERROR: " + e.toString() + " / " + e.message);
            }
        }

        function executeSynchronous(){
            g.drawImage(img, 0, 0);

            var totalStart:number = new Date().getTime();

            var iimg;
            var createIntegralImage:string = measureTime(()=>{
                iimg = opensurf.IntegralImage.FromImage(img);
            });

            var ipts:opensurf.IPoint[];
            var getPoints:string = measureTime(()=>{
                ipts = opensurf.FastHessian.getIpoints(0.0002, 5, 2, iimg, (p:opensurf.IPoint)=>{
                    paintIPoint(p);
                }, (text:string)=>{
                    console.log(text);
                });
            });

            // Describe the interest points
            var describe:string = measureTime(()=>{
                opensurf.SurfDescriptor.DecribeInterestPoints(ipts, false, false, iimg, (p:opensurf.IPoint,t:number)=>{
                    paintIPointDescribe(p);
                });
            }); 

            $('#message').text(
                "points:" + ipts.length + 
                " createIntegralImage:" + createIntegralImage + "sec." + 
                " getPoints:"    + getPoints + "sec." +
                " describe:"     + describe + "sec." +
                " total:" + ((new Date().getTime() - totalStart) * 0.001).toFixed(2) + "sec."
            );
        }

        $('#startBtn').click(()=>{
            startWorker();
        });    
        $('#startBtn_sync').click(()=>{
            executeSynchronous();
        });
        $('#load_button').click(()=>{
            setImage($("#url_text").val());
        });
        $('a.sample').click((e:JQueryEventObject)=>{
            var url = $(e.target).attr("href");
            $("#url_text").val(url);
            setImage(url);
            e.preventDefault();
        });
        setImage($("#url_text").val());
    });
} 
