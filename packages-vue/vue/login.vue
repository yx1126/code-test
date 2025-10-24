<script>
const userName = "yx";

console.log(userName);
console.log(userName);
console.log(userName);

export default {
    name: "Login11222",
    inject: [],
    props: {
        id: { type: String },
        code: { type: String },
    },
    // this is data
    data() {
        return {
            isShow: true,
            data: [{ name: "14" }],
            form: {
                age: 18,
            },
            body: {},
        };
    },
    created() {
        const a = "124";
        console.log("a", a);
    },
    methods: {
        onClick() {
            const v = "value";
            console.log("onClick", v);
        },
        onTest() {

        },
    },
};
</script>

<template>
    <div class="box-wrapper">
        <div class="title">text</div>
        <el-button type="primary" size="medium" pinia @click="onClick">保存</el-button>
        <div v-if="isShow" :class="body"></div>
    </div>
</template>

<style>
.a {
    color: red;
}
</style>

<style lang="scss">
$color: red;
.a {
    width: 100px;
    color: red;
}
</style>

<style lang="less">
@color: red;
.a {
    width: 100px;
    .b {
        color: @color;
    }
}
</style>
