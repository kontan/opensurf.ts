addEventListener('message', function (e) {
    var data = e.data;
    if(data.type === "image") {
        var iimg = data.value;
        var ipts = opensurf.FastHessian.getIpoints(0.0002, 5, 2, iimg);
        opensurf.SurfDescriptor.DecribeInterestPoints(ipts, false, false, iimg, function (p, t) {
            postMessage({
                "type": "point",
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
//@ sourceMappingURL=worker.js.map
