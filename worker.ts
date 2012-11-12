/// <reference path="jquery.d.ts" />
/// <reference path="opensurf.ts" />


addEventListener('message', (e:any)=>{
    //postMessage({"text":"hello"}, undefined);

    //throw new Error();

    var data = e.data;
    if(data.type === "image"){
        var iimg:opensurf.IntegralImage = data.value;

        // Extract the interest points
        var ipts:opensurf.IPoint[] = opensurf.FastHessian.getIpoints(0.0002, 5, 2, iimg);

        // Describe the interest points
        opensurf.SurfDescriptor.DecribeInterestPoints(ipts, false, false, iimg, (p:opensurf.IPoint,t:number)=>{
            postMessage({"type":"point", "value":p}, undefined);        
        });

        postMessage({"type":"finish", "value":ipts}, undefined);
    }else{
        throw new Error("Unknown data type: " + data.type);
    }
});