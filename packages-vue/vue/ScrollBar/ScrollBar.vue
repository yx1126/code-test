<script>
function isObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
}
function isNumber(value) {
    return typeof value === "number";
}

let originalOnSelectStart;
let stopResizeObserver;

function useResizeObserver(el, fn, options) {
    if(!window.ResizeObserver) return () => void 0;
    const resizeObserver = new ResizeObserver(fn);
    resizeObserver.observe(el, options);
    return () => {
        resizeObserver.unobserve(el);
        resizeObserver.disconnect();
    };
}

export default {
    name: "ScrollBar",
    props: {
        // 高度
        height: { type: Number },
        // 最大高度
        maxHeight: { type: Number },
        // 原生滚动条
        native: { type: Boolean, default: false },
        // 滚动条总是显示
        always: { type: Boolean, default: false },
        // 滑块最小值
        minSize: { type: Number, default: 20 },
        // 横向滚动
        xScrollable: { type: Boolean, default: false },
        isResize: { type: Boolean, default: false },
    },
    emits: ["scroll"],
    data() {
        return {
            isExistScroll: false,
            thumbSize: 0,
            scrollSize: 0,
            thumbScrollSize: 0,
            translateXY: 0,
        };
    },
    watch: {
        height: "onPropsWatchHandler",
        maxHeight: "onPropsWatchHandler",
        minSize: "onPropsWatchHandler",
        xScrollable: "onPropsWatchHandler",
        isResize: {
            handler(resize) {
                if(!this.xScrollable) return;
                this.$nextTick(() => {
                    if(resize) {
                        stopResizeObserver?.();
                    } else {
                        stopResizeObserver = useResizeObserver(this.$refs["scrollViewRef"], () => this.init());
                    }
                });
            },
            immediate: true,
        },
    },
    created() {
        if(!this.native) {
            this.$nextTick(this.init);
        }
    },
    updated() {
        this.init();
    },
    beforeUnmount() {
        stopResizeObserver?.();
    },
    methods: {
        onPropsWatchHandler() {
            if(this.native) return;
            this.$nextTick(this.init);
        },
        scrollTo(x, y) {
            if(isObject(x)) {
                this.$refs["scrollViewRef"].scrollTo(x);
            } else if(isNumber(x) && isNumber(y)) {
                this.$refs["scrollViewRef"].scrollTo(x, y);
            }
        },
        onScroll(e) {
            const target = e.target;
            const { xScrollable, scrollSize, thumbScrollSize } = this;
            // 计算滑块滚动距离
            this.translateXY = target[xScrollable ? "scrollLeft" : "scrollTop"] / scrollSize * thumbScrollSize;
            this.$emit("scroll", e);
        },
        onMousedown(event) {
            event.stopPropagation();
            // 禁止鼠标 middle right 点击
            if(event.ctrlKey || [1, 2].includes(event.button)) return;
            window.getSelection()?.removeAllRanges();
            event.stopImmediatePropagation();
            originalOnSelectStart = document.onselectstart;
            document.onselectstart = () => false;

            // const thumb = props.xScrollable ? horizontalThumbRef.value : verticalThumbRef.value;

            // 鼠标点击时滑块Y轴默认偏移量
            let translateXY = 0;
            const transform = getComputedStyle(this.$refs["thumbRef"])["transform"];
            if(transform !== "none") {
                const list = (transform.match(/\((.+)\)/)[1] || "").split(",");
                translateXY = Number(list[list.length - (this.xScrollable ? 2 : 1)]);
            }
            const onMousemove = e => {
                const { xScrollable: isX, thumbScrollSize, scrollSize } = this;
                const xy = (isX ? e.clientX - event.clientX : e.clientY - event.clientY) + translateXY;
                const moveXY = xy < 0 ? 0 : xy > thumbScrollSize ? thumbScrollSize : xy;
                this.$refs["scrollViewRef"][isX ? "scrollLeft" : "scrollTop"] = moveXY / thumbScrollSize * scrollSize;
            };

            function onMousemup() {
                document.removeEventListener("mousemove", onMousemove);
                document.removeEventListener("mouseup", onMousemup);
                if(document.onselectstart !== originalOnSelectStart) {
                    document.onselectstart = originalOnSelectStart;
                }
            }
            document.addEventListener("mousemove", onMousemove);
            document.addEventListener("mouseup", onMousemup);
        },
        init() {
            if(!this.$refs["scrollViewRef"]) return;
            const { xScrollable: isX } = this;
            const { offsetWidth: ow, offsetHeight: oh, scrollWidth: sw, scrollHeight: sh, parentNode } = this.$refs["scrollViewRef"];
            const { offsetWidth: pow, offsetHeight: poh } = parentNode;
            this.isExistScroll = isX ? sw > pow : sh > poh;
            this.thumbSize = Math.max(isX ? ow ** 2 / sw : oh ** 2 / sh, this.minSize);
            this.scrollSize = isX ? sw - ow : sh - oh;
            this.thumbScrollSize = (isX ? ow : oh) - this.thumbSize;
        },
    },
};
</script>

<template>
    <div :class="['scroll-bar', { 'is-hover': !always }]">
        <div
            ref="scrollViewRef"
            :class="[
                'scroll-bar__view',
                { 'scroll-bar__view--hidden-default': !native }
            ]"
            :style="{
                height: height ? height + 'px' : height,
                maxHeight: maxHeight ? maxHeight + 'px' : maxHeight,
            }"
            @scroll="onScroll"
        >
            <slot />
        </div>
        <template v-if="!native && isExistScroll">
            <div :class="['scroll-bar__bar', xScrollable ? 'is-horizontal' : 'is-vertical']">
                <div
                    ref="thumbRef"
                    class="scroll-bar__thumb"
                    :style="{
                        transform: `translate${xScrollable ? 'X' : 'Y'}(${translateXY}px)`,
                        [xScrollable ? 'width' : 'height']: thumbSize + 'px'
                    }"
                    @mousedown="onMousedown"
                />
            </div>
        </template>
    </div>
</template>

<style lang="scss" scoped>
.scroll-bar {
    position: relative;
    overflow: hidden;
    &.is-hover {
        .scroll-bar__thumb {
            display: none;
        }
        &:active,
        &:hover {
            .scroll-bar__thumb {
                display: block;
            }
        }
    }
    &__view {
        overflow: auto;
        &.scroll-bar__view--hidden-default {
            -ms-overflow-style: none;
            scrollbar-width: none !important;
            &::-webkit-scrollbar {
                width: 0 !important;
                display: none !important;
            }
        }
    }
    &__bar {
        position: absolute;
        &.is-horizontal {
            left: 0;
            bottom: 2px;
            width: 100%;
            height: 6px;
            .scroll-bar__thumb {
                height: 100%;
            }
        }
        &.is-vertical {
            width: 6px;
            height: 100%;
            right: 2px;
            top: 0;
            .scroll-bar__thumb {
                width: 100%;
            }
        }
    }
    &__thumb {
        border-radius: 5px;
        background-color: #909399;
        cursor: pointer;
        opacity: 0.3;
        transition: all 0s;
        &:hover {
            background-color: #909399;
            opacity: 0.5;
        }
    }
}
</style>
