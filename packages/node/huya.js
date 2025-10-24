import fetch from "node-fetch";
import crypto from "crypto";
import { parse } from "querystring";

async function getRealUrl(roomId) {
    try {
        const roomUrl = `https://mp.huya.com/cache.php?m=Live&do=profileRoom&roomid={${roomId}}`;
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
        };

        const resp = await fetch(roomUrl, { headers });
        const text = await resp.text();
        console.log("text", text);
    } catch (e) {
        console.error(e);
        return "直播间不存在";
    }
}

// 示例调用
const roomId = process.argv[2] || "660000"; // 在命令行传房间号
getRealUrl(roomId).then(res => {
    console.log("真实地址：", JSON.stringify(res, null, 2));
});
