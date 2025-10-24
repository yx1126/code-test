import { debounce, type DebouncedFunc } from 'lodash-es';
import { ref, onBeforeMount, type Ref } from "vue"

export interface BaseAxiosResponse<T = any> {
    code: number;
    data: T;
    message: string;
    type?: string;
    [key: string]: any;
}


function isFn<T extends Function>(val: unknown): val is T {
    return typeof val === 'function';
}


type User = {
    username: string;
    password: string;
}

function userList() {
    return new Promise<BaseAxiosResponse<User[]>>(() => {

    })
}

const { } = useRequest(userList, [])

const { } = useRequest({
    request: userList,
    default: [],
})



type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type Request<T, D extends any[]> = (...args: D) => Promise<BaseAxiosResponse<T>>;

type DefValue<T> = T extends Array<infer V> ? V[] : T extends object ? DeepPartial<T> : T;

export interface RequestOptions<T, D extends any[]> {
    request: Request<T, D>;
    default: DefValue<T>;
    formatter?: (data: T) => any;
    immediate?: boolean;
    delay?: number;
    afterRequest?: (data: T, res: BaseAxiosResponse<T>) => void;
}

export interface UseRequest<T, R extends (...args: any) => any> {
    loading: Ref<boolean>;
    data: Ref<T>;
    query: (...querys: Parameters<R>) => Promise<void>;
    queryOnce: (...querys: Parameters<R>) => Promise<void>;
    queryLazy: DebouncedFunc<(...querys: Parameters<R>) => Promise<void>>;
}

export function useRequest<T, D extends any[] = any[]>(options: RequestOptions<T, D>): UseRequest<T, RequestOptions<T, D>['request']>;
export function useRequest<T, D extends any[] = any[]>(request: Request<T, D>, defaultValue: DefValue<T>): UseRequest<T, Request<T, D>>;
export function useRequest<T, D extends any[] = any[]>(
    request: Request<T, D>,
    defaultValue: DefValue<T>,
    immediate: boolean
): UseRequest<T, Request<T, D>>;
export function useRequest<T, D extends any[]>(options: RequestOptions<T, D> | Request<T, D>, defaultValue?: T, immediate?: boolean) {
    const defOptions = isFn(options) ? ({ request: options, default: defaultValue, immediate: immediate ?? true } as RequestOptions<T, D>) : options;

    if (!Object.hasOwn(defOptions, 'default')) {
        throw new Error('[useRequest/options]: The default field cannot be empty');
    }

    const loading = ref(false);
    const data = ref(defOptions.default);
    const isFirst = ref(true);

    // 立即执行
    onBeforeMount(() => {
        const { immediate } = defOptions;
        if (immediate) {
            query();
        }
    });

    async function queryOnce(...args: any) {
        if (isFirst.value) {
            isFirst.value = false;
            await query(...args);
        }
    }

    async function query(...query: any) {
        try {
            loading.value = true;
            const { request, formatter, afterRequest } = defOptions;
            const res = await request(...query);
            const reqData: unknown = formatter ? formatter(res.data) : res.data;
            data.value = reqData;
            afterRequest?.(data.value, res);
        } catch (error: any) {
            // eslint-disable-next-line no-console
            console.error(error);
        } finally {
            loading.value = false;
        }
    }

    return {
        loading,
        data,
        query,
        queryLazy: debounce(query, defOptions.delay),
        queryOnce,
    };
}
