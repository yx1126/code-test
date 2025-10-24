// @ts-check
import { defineEslint } from "@yx1126/lint-config";

export default defineEslint({
    css: true,
    vue: {
        typescript: false,
        sfcBlocks: {
            blocks: {
                customBlocks: true,
            },
        },
        blockLang: {
            i18n: {
                lang: ["yaml", "json"],
                allowNoLang: true,
            },
            style: {
                lang: ["scss", "sass", "less"],
                allowNoLang: true,
            },
            script: {
                lang: ["js", "ts", "jsx", "tsx"],
                allowNoLang: true,
            },
        },
        rules: {
            "vue/block-order": [
                "error",
                {
                    order: ["script", "template", "style", "i18n"],
                },
            ],
        },
    },
    rules: {
        // 自定义块问题
        "@stylistic/eol-last": "off",
        "no-console": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "no-unused-vars": "off",
    },
    ignore: [
        "packages-lib/",
        "packages/ts/**/*.js",
        "packages/ts/**/*.js.map",
        "packages-example/source-code/js",
        "packages-example/fileExtensions",
        "packages-css/scss/**/*.css",
        "packages-css/scss/**/*.css.map",
        "packages-css/sass/**/*.css",
        "packages-css/scass/**/*.css.map",
    ],
    flatESLintConfig: [{
        files: ["**/*.vue"],
        rules: {
            "@typescript-eslint/no-unsafe-unary-minus": "off",
        },
    }],
});
