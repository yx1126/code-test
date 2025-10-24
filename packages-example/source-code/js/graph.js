function getOptions(options) {
    return Object.assign({
        step: 0.05,
        readonly: false,
        center: false,
    }, options);
}

class Mitt {
    events = new Map();

    constructor() {}

    emit(name, ...args) {
        const list = this.events.get(name) || [];
        list.forEach(fn => {
            fn.apply(null, args);
        });
    }

    on(name, fn) {
        if(this.events.has(name)) {
            const list = this.events.get(name);
            if(list.indexOf(fn) === -1) {
                list.push(fn);
            }
        } else {
            this.events.set(name, [fn]);
        }
    }

    once(name, fn) {
        const func = (...args) => {
            fn.apply(null, args);
            this.off(name, func);
        };
        this.on(name, func);
    }

    off(name, fn) {
        const list = this.events.get(name) || [];
        if(list.indexOf(fn) !== -1) {
            list.splice(list.indexOf(fn), 1);
        }
    }
}

class Graph {
    rootNode; // 渲染根节点
    scale = 1; // 缩放
    transformX = 0; // x轴偏移
    transformY = 0; // y轴偏移
    options; // 配置
    image = null; // 图片
    pointList = []; // 坐标列表
    markImage = null; // 坐标图片
    markHigtImage = null; // 高亮坐标图片
    __IS_MOVE_EVENT = false;// 是否是拖动事件

    constructor(el, options) {
        this.$el = el;
        this.registerMitt();
        this.options = getOptions(options);
        this.init();
        this.initEvent();
        this.drawImage();
    }

    refresh() {
        this.pointList = [];
        this.drawImage();
    }

    registerMitt() {
        const mitt = new Mitt();
        this.MITT = mitt;
        ["emit", "on", "off", "once"].forEach(name => {
            this[`$${name}`] = mitt[name].bind(mitt);
        });
    }

    clear() {
        const { _canvas: canvas } = this;
        canvas.setAttribute("width", canvas.getAttribute("width"));
    }

    clearChilds() {
        const { rootNode } = this;
        rootNode.childNodes.forEach(item => {
            rootNode.removeChild(item);
        });
    }

    zoomCenter() {
        const { width: imageWidth, height: imageHeight } = this.image;
        const { width: canvasWidth, height: canvasHeight } = this.target.getBoundingClientRect();
        const scaleX = canvasWidth / imageWidth;
        const scaleY = canvasHeight / imageHeight;
        const scale = Math.min(scaleX, scaleY);
        if(scale < 1) {
            this.scale = scale;
        }
        const scaledImageWidth = imageWidth * this.scale;
        const scaledImageHeight = imageHeight * this.scale;
        this.transformX = (canvasWidth - scaledImageWidth) / 2;
        this.transformY = (canvasHeight - scaledImageHeight) / 2;
        this.drawImage();
    }

    init() {
        const { $el: el } = this;
        const targetWrapper = typeof el === "string" ? document.querySelector(el) : el;
        const targetRect = targetWrapper.getBoundingClientRect();
        const target = document.createElement("div");
        target.style.width = targetRect.width + "px";
        target.style.height = targetRect.height + "px";
        target.style.overflow = "hidden";
        target.style.position = "relative";
        this.rootNode = targetWrapper;
        this.target = target;
        this.clearChilds();
        const canvas = document.createElement("canvas");
        canvas.setAttribute("width", targetRect.width);
        canvas.setAttribute("height", targetRect.height);
        const ctx = canvas.getContext("2d");
        this._canvas = canvas;
        this._ctx = ctx;
        target.appendChild(canvas);
        targetWrapper.appendChild(target);
    }

    initEvent() {
        const { _canvas: canvas, options } = this;
        canvas.addEventListener("mousedown", e => {
            if(options.readonly) return;
            if(e.button === 0) { // 鼠标左键
                this.onMouseLeftEvent(e);
                this.$emit("mousedown", e);
            } else if(e.button === 2) { // 鼠标右键
                this.onMouseRightEvent(e);
            }
        });
        canvas.addEventListener("wheel", e => {
            this.$emit("wheel", e);
            this.onMouseWheel(e);
        });
        canvas.addEventListener("contextmenu", e => e.preventDefault());
    }

    onMouseWheel(e) {
        const { options, _ctx: ctx, scale } = this;
        const { minScale, maxScale, step } = options;
        e.preventDefault();
        const preScale = scale;
        if(e.deltaY > 0) {
            this.scale = Math.max(minScale || step, scale - step);
        } else {
            this.scale = Math.min(maxScale || 2, scale + step);
        }
        const { e: eOffsetX, f: fOffsetY } = ctx.getTransform();
        this.transformX = e.offsetX - ((e.offsetX - eOffsetX) * this.scale) / preScale;
        this.transformY = e.offsetY - ((e.offsetY - fOffsetY) * this.scale) / preScale;
        this.drawImage();
    }

    // 判断左边点点击事件
    _IS_POINT_CLICK(e) {
        return this.pointList.find(item => {
            const width = item.point.width;
            const height = item.point.height;
            return this.isPathInMark(e.offsetX, e.offsetY, item.x - width / 2, item.y - height, width, height);
        });
    }

    onMouseLeftEvent(dEvent) {
        const { _canvas: canvas, _ctx: ctx } = this;
        // x 轴距离 y 轴距离
        const { e: offsetX, f: offsetY } = ctx.getTransform();
        const onMousemove = event => {
            this.__IS_MOVE_EVENT = true;
            this.$emit("move", event);
            this.transformX = (offsetX + (event.offsetX - dEvent.offsetX));
            this.transformY = (offsetY + (event.offsetY - dEvent.offsetY));
            this.drawImage();
        };
        const onMouseup = e => {
            this.$emit("mouseup", e);
            if(!this.__IS_MOVE_EVENT) {
                this.$emit("click", e);
                // 坐标点点击
                const isPathInMark = this._IS_POINT_CLICK(e);
                if(isPathInMark) {
                    this.$emit("point", e, {
                        data: isPathInMark,
                        offsetX: this.transformX + (+isPathInMark.x * this.scale),
                        offsetY: this.transformY + (+isPathInMark.y * this.scale),
                    });
                }
            }
            this.__IS_MOVE_EVENT = false;
            canvas.removeEventListener("mousemove", onMousemove);
            canvas.removeEventListener("mouseup", onMouseup);
        };
        canvas.addEventListener("mousemove", onMousemove);
        canvas.addEventListener("mouseup", onMouseup);
        canvas.addEventListener("mouseleave", onMouseup);
    }

    onMouseRightEvent(e) {
        const { image } = this;
        if(!image) return;
        // 判断是否在图片内点击
        if(this.isPathInMark(e.offsetX, e.offsetY, 0, 0, image.width, image.height)) {
            // 判断是否点击 坐标点
            const isPathInMark = this._IS_POINT_CLICK(e);
            if(!isPathInMark) {
                this.$emit("contextmenu", e, this.transformPoint(e.offsetX, e.offsetY));
            }
        }
    }

    drawImage() {
        const { _ctx: ctx, transformX, transformY, scale, image, options } = this;
        if(!options.url) return;
        this.clear();
        ctx.setTransform(scale, 0, 0, scale, transformX, transformY);
        if(image) {
            ctx.drawImage(image, 0, 0);
            this.pointList.forEach(item => {
                this.addMark(item);
            });
        } else {
            this.image = new Image();
            this.image.src = options.url;
            this.image.onload = () => {
                ctx.drawImage(this.image, 0, 0);
                if(options.center) {
                    this.zoomCenter();
                }
            };
            // this.image.onerror = (e) => {}
        }
    }

    /**
     *
     * @param offsetX   鼠标x轴坐标
     * @param offsetY   鼠标y轴坐标
     * @param x         目标x轴坐标
     * @param y         目标y轴坐标
     * @param width     目标宽度
     * @param height    目标高度
     * @returns
     */
    isPathInMark(offsetX, offsetY, x, y, width, height) {
        const point = this.transformPoint(offsetX, offsetY);
        if(point.x >= x && point.x <= (x + width) && point.y >= y && point.y <= (y + height)) {
            return true;
        }
        return false;
    }

    transformPoint(x, y) {
        // 获取当前变换矩阵
        const transform = this._ctx.getTransform();

        // 计算逆变换矩阵
        const inverseTransform = transform.invertSelf();

        // 使用逆变换矩阵来变换点坐标
        const transformedPoint = new DOMPoint(x, y).matrixTransform(inverseTransform);

        return { x: transformedPoint.x, y: transformedPoint.y };
    }

    addMark(data) {
        const { _ctx: ctx, scale } = this;
        const markWidth = 27 / scale, markHeight = 31.8 / scale;
        data.point = {
            width: markWidth,
            height: markHeight,
            xAxis: data.x - markWidth / 2,
            yAxis: data.y - markHeight + 5 / scale,
        };
        const markImageKey = data.highlight ? "markHigtImage" : "markImage";
        if(this[markImageKey]) {
            ctx.drawImage(this[markImageKey], data.point.xAxis, data.point.yAxis, data.point.width, data.point.height);
        } else {
            const image = new Image();
            image.src = data.highlight ? require("@/assets/views/mark-origin.png") : require("@/assets/views/mark-red.png");
            image.onload = () => {
                this[markImageKey] = image;
                ctx.drawImage(this[markImageKey], data.point.xAxis, data.point.yAxis, data.point.width, data.point.height);
            };
        }
        // 测试标记
        // this._ctx.beginPath();
        // this._ctx.arc(x, y, 5 / this.scale, 0, 2 * Math.PI, false);
        // this._ctx.fillStyle = "red"; // 设置点的颜色
        // this._ctx.fill();
        // this._ctx.closePath();
    }

    point(data) {
        const isHas = this.pointList.find(item => item.x === data.x && item.y === data.y);
        if(isHas) return;
        this.pointList.push(data);
        this.addMark(data);
    }
}
