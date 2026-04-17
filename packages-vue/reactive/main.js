const bucket = new WeakMap();
// 用一个全局变量存储被注册的副作用函数
let activeEffect;
const effectStack = []; // effect 栈
// effect 函数用于注册副作用函数

/**
 *
 * @param {() => void} fn
 * @param {{scheduler?: (fn: () => void) => void; lazy?: boolean}} [options]
 * @returns
 */
export function effect(fn, options = {}) {
    const effectFn = () => {
        cleanup(effectFn);
        // 当调用 effect 注册副作用函数时，将副作用函数 fn 赋值给 activeEffect
        activeEffect = effectFn;
        effectStack.push(effectFn);
        // 执行副作用函数
        const res = fn();
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
        return res;
    };
    // 将 options 挂载到 effectFn 上
    effectFn.options = options;
    // 用于存储副作用函数相关的依赖集合
    effectFn.deps = [];
    if(!options.lazy) {
        effectFn();
    }
    // 立即执行副作用函数
    return effectFn;
}

const TriggerType = {
    SET: "SET",
    ADD: "ADD",
    DELETE: "DELETE",
};

/**
 * @template T
 * @param {T} data
 * @returns {T}
 */
export function reactive(data) {
    // const ITERATE_KEY = Symbol();
    return new Proxy(data, {
        get(target, key, receiver) {
            track(target, key);
            return Reflect.get(target, key, receiver);
        },
        set(target, key, value, receiver) {
            const oldValue = target[key];
            const type = Object.prototype.hasOwnProperty.call(target, key) ? TriggerType.SET : TriggerType.ADD;
            const res = Reflect.set(target, key, value, receiver);
            // eslint-disable-next-line no-self-compare
            if(oldValue !== value && (oldValue === oldValue || value === value)) {
                trigger(target, key, type);
            }
            return res;
        },
        has(target, key) {
            track(target, key);
            return Reflect.has(target, key);
        },
        ownKeys(target) {
            // track(target, ITERATE_KEY);
            return Reflect.ownKeys(target);
        },
        deleteProperty(target, key) {
            const hadKey = Object.prototype.hasOwnProperty.call(target, key);
            const res = Reflect.deleteProperty(target, key);
            if(hadKey && res) {
                trigger(target, key, TriggerType.DELETE);
            }
            return res;
        },
    });
}

/**
 * @template T
 * @param {() => T} getter
 * @returns {{value: T}}
 */
export function computed(getter) {
    let value;
    let dirty = true; // 是否需要重新计算
    const effectFn = effect(getter, {
        scheduler() {
            dirty = true;
            // eslint-disable-next-line no-use-before-define
            trigger(obj, "value");
        },
        lazy: true,
    });
    const obj = {
        get value() {
            if(dirty) {
                value = effectFn();
                dirty = false;
            }
            track(obj, "value");
            return value;
        },
    };
    return obj;
}

/**
 * @template T
 * @param {T} source
 * @param {(newValue: T, oldValue: T, onCleanup: (fn: () => void) => void) => void} cb
 * @param {{flush?: "pre" | "post"; immediate?: boolean}} [options]
 */
export function watch(source, cb, options = {}) {
    let getter;
    if(typeof source === "function") {
        getter = source;
    } else {
        getter = () => traverse(source);
    }
    let oldValue, newValue;

    let cleanup;
    function onCleanup(fn) {
        cleanup = fn;
    }

    const job = () => {
        // eslint-disable-next-line no-use-before-define
        newValue = effectFn();
        if(cleanup) {
            cleanup();
        }
        cb(newValue, oldValue, onCleanup);
        oldValue = newValue;
    };
    const effectFn = effect(() => getter(), {
        lazy: true,
        scheduler: () => {
            if(options.flush === "post") {
                const p = Promise.resolve();
                p.then(job);
            } else {
                job();
            }
        },
    });
    if(options.immediate) {
        job();
    } else {
        oldValue = effectFn();
    }
}

function traverse(value, seen = new Set()) {
    if(typeof value !== "object" || value === null || seen.has(value)) return;
    seen.add(value);
    for(const k in value) {
        traverse(value[k], seen);
    }
    return value;
}

// 清除副作用函数与依赖集合之间的关系
function cleanup(effectFn) {
    for(let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i];
        deps.delete(effectFn);
    }
    effectFn.deps.length = 0;
}

// track 函数用于追踪变化的属性与副作用函数之间的关系
function track(target, key) {
    if(!activeEffect) return target[key];
    let depsMap = bucket.get(target);
    if(!depsMap) {
        bucket.set(target, (depsMap = new Map()));
    }
    let deps = depsMap.get(key);
    if(!deps) {
        depsMap.set(key, (deps = new Set()));
    }
    deps.add(activeEffect);
    activeEffect.deps.push(deps);
}

// trigger 函数用于触发副作用函数的执行
function trigger(target, key, type) {
    const depsMap = bucket.get(target);
    if(!depsMap) return;
    const effects = depsMap.get(key);
    const effectsToRun = new Set();
    effects && effects.forEach(effectFn => {
        if(effectFn !== activeEffect) {
            effectsToRun.add(effectFn);
        }
    });
    // if(type === TriggerType.ADD || type === TriggerType.DELETE) {
    //     const iterateEffects = depsMap.get(ITERATE_KEY);
    //     iterateEffects && iterateEffects.forEach(effectFn => {
    //         if(effectFn !== activeEffect) {
    //             effectsToRun.add(effectFn);
    //         }
    //     });
    // }
    effectsToRun.forEach(effectFn => {
        if(effectFn.options.scheduler) {
            effectFn.options.scheduler(effectFn);
        } else {
            //  默认情况下直接执行副作用函数
            effectFn();
        }
    });
}
