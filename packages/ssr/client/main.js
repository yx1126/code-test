import { createSSRApp } from "vue";

export function createApp() {
    const app = createSSRApp({
        data: () => ({ count: 1 }),
        template: `<button @click="onClick">{{ count }}</button>`,
        methods: {
            onClick() {
                this.count++;
                console.log(this.count);
            },
        },
    });
    return app;
}
