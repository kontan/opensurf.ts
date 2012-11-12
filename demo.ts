/// <reference path="jquery.d.ts" />
/// <reference path="opensurf.ts" />

module OpenSURFDemo{




    $(()=>{
        var canvas:HTMLCanvasElement = <HTMLCanvasElement>document.querySelector('#canvas');
        var g:CanvasRenderingContext2D = canvas.getContext('2d');
        var img:HTMLImageElement;

        function setImage(url:string):void{
            img = new Image();
            img.addEventListener('load', ()=>{
                canvas.width  = img.width;
                canvas.height = img.height;                
                g.drawImage(img, 0, 0);
                $('#startBtn').removeAttr("disabled");
            });
            img.src = url; 
            $('#startBtn').attr("disabled", "disabled");
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
            g.drawImage(img, 0, 0);
            var iimg = opensurf.IntegralImage.FromImage(img);
            var worker:Worker = new Worker('opensurf.js');
            var ipts:opensurf.IPoint[] = [];

            var listener = (data)=>{
                if(data.type === "point"){
                    paintIPoint(data.value);
                }else if(data.type === "describe"){
                    //g.drawImage(img, 0, 0);
                    listener = (data)=>{
                        if(data.type === "describe"){
                            var ipt:opensurf.IPoint = data.value;
                            paintIPointDescribe(ipt);
                            ipts.push(ipt);
                        }else if(data.type === "finish"){
                            var ipts:opensurf.IPoint[] = data.value;
                        }
                    };
                    listener(data);
                }
            };

            worker.addEventListener('message', (e:any)=>{
                listener(e.data);
            }, false);

            worker.postMessage({"type":"image", "value":iimg.serialize()});
        }

        $('#startBtn').click(()=>{
                
            startWorker();
            return;


            if(img && img.complete){
                var startTime:Date = new Date();

                var iimg:opensurf.IntegralImage;
                var ipts;
                var fromImageTime:string, getIpointsTime:string, decribeTime:string;
                var totalTime = measureTime(()=>{

                    // Create Integral Image
                    iimg = opensurf.deserializeIntegralImage(parsed);

                    // Extract the interest points
                    getIpointsTime = measureTime(()=>{
                        ipts = opensurf.FastHessian.getIpoints(0.0002, 5, 2, iimg);
                    });

                    // Describe the interest points
                    decribeTime = measureTime(()=>{
                        opensurf.SurfDescriptor.DecribeInterestPoints(ipts, false, false, iimg);
                    });

                });

                $('#message').text(
                    "points:" + ipts.length +  
                    " fromImage:"  + fromImageTime  + "sec." +
                    " getIpoints:" + getIpointsTime + "sec." +
                    " decribe:"    + decribeTime    + "sec." +
                    " total:"      + totalTime      + "sec."
                );

                // Draw points on the image
                PaintSURF(img, ipts);

                //startWorker();
            }
        });    

        setImage("yamada.png");
    });
} 
