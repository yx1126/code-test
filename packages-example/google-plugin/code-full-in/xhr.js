(function(xhr, callback = []) {
    if(!Array.isArray(callback)) {
        callback = [];
    }
    const XHR = xhr.prototype;
    const open = XHR.open;
    const send = XHR.send;

    // 对open进行patch 获取url和method
    XHR.open = function(method, url) {
        this._method = method;
        this._url = url;
        return open.apply(this, arguments);
    };
    // 同send进行patch 获取responseData.
    XHR.send = function() {
        this.addEventListener("load", function() {
            const myUrl = this._url ? this._url.toLowerCase() : this._url;
            console.log(myUrl);
            if(myUrl) {
                if(this.responseType != "blob" && this.responseText) {
                    try {
                        callback.forEach(cb => {
                            cb({ url: this._url, response: this.responseText });
                        });
                    } catch (err) {
                        console.log(err);
                    }
                }
            }
        });
        return send.apply(this, arguments);
    };
})(XMLHttpRequest, window.onResponse);
