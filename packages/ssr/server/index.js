import express from "express";
import { createApp } from "../client/main.js";
import { renderToString } from "vue/server-renderer";

const server = express();

server.use(express.static("./client"));

// server.use((req, res, next) => {
//     console.log("req", req);
//     next();
// });

server.get("/", (req, res) => {
    const app = createApp();
    renderToString(app).then(html => {
        console.log("html", html);
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Vue SSR Example</title>
                    <script type="importmap">
                        {
                            "imports": {
                                "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js"
                            }
                        }
                    </script>
                </head>
                <body>
                <div id="app">${html}</div>
                <script type="module" src="/client.js"></script>
                </body>
            </html>
        `);
    });
});

server.listen(3000, () => {
    console.log("server start: 3000...");
});
