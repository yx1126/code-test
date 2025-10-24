// douyu.js
import axios from "axios";
import crypto from "crypto";
import vm from "vm";
import fs from "node:fs";

class DouYu {
    constructor(rid) {
        this.rid = rid;
        this.did = "10000000000000000000000000001501";
        this.t10 = String(Math.floor(Date.now() / 1000));
        this.t13 = String(Date.now());

        this.s = axios.create({
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
            },
        });

        this.resHtml = "";
    }

    md5(data) {
        return crypto.createHash("md5").update(data).digest("hex");
    }

    async init() {
        // 获取真实 rid
        const res = await this.s.get(`https://m.douyu.com/${this.rid}`);
        this.resHtml = res.data;
        const m = res.data.match(/rid":(\d{1,8}),"vipId/);
        if(!m) throw new Error("房间号错误");
        fs.writeFileSync("./douyu.html", this.resHtml);
        this.rid = m[1];
    }

    async getPre() {
        const url = `https://playweb.douyucdn.cn/lapi/live/hlsH5Preview/${this.rid}`;
        const data = new URLSearchParams({
            rid: this.rid,
            did: this.did,
        });
        const auth = this.md5(this.rid + this.t13);
        const headers = {
            rid: this.rid,
            time: this.t13,
            auth,
        };
        const res = await this.s.post(url, data, { headers });
        return res.data.error;
    }

    async getDid() {
        let did = "10000000000000000000000000001501";
        const url = `https://passport.douyu.com/lapi/did/api/get?client_id=25&_=${this.t13}&callback=axiosJsonpCallback1`;
        try {
            const res = await this.s.get(url, {
                headers: { referer: "https://m.douyu.com/" },
            });
            console.log("res ------->", res.data);
            const m = res.data.match(/axiosJsonpCallback1\((.*)\)/);
            if(m) {
                const json = JSON.parse(m[1]);
                if(json.error === 0 && json.data.did) {
                    did = json.data.did;
                }
            }
        } catch (e) {
            console.error(e);
        }
        return did;
    }

    async getJs() {
        const match = this.resHtml.match(/(function ub98484234.*)\s(var.*)/);
        if(!match) throw new Error("未找到签名函数");
        const func_ub9 = match[0].replace(/eval.*;}/, "strc;}");
        let sandbox = {};
        vm.createContext(sandbox);
        vm.runInContext(func_ub9, sandbox);
        const res1 = sandbox.ub98484234();

        const v = res1.match(/v=(\d+)/)[1];
        const rb = this.md5(this.rid + this.did + this.t10 + v);

        const func_sign = res1
            .replace(/return rt;}\);?/, "return rt;}")
            .replace("(function (", "function sign(")
            .replace("CryptoJS.MD5\(cb\)\.toString\(\)", `"${rb}"`);

        sandbox = {};
        vm.createContext(sandbox);
        vm.runInContext(func_sign, sandbox);
        let params = sandbox.sign(this.rid, this.did, this.t10);
        params += `&ver=22107261&rid=${this.rid}&rate=-1`;

        const url = "https://m.douyu.com/api/room/ratestream";
        const resp = await this.s.post(url + "?" + params);
        return resp.data;
    }

    async getRealUrl() {
        const error = await this.getPre();
        if(error === 102) throw new Error("房间不存在");
        if(error === 104) throw new Error("房间未开播");

        const realUrl = {};
        try {
            const data = await this.getJs();
            if(data?.data?.url) {
                realUrl.m3u8 = data.data.url;
            }
        } catch (e) {
            console.error("解析失败:", e);
        }
        return realUrl;
    }
}

// CLI
const rid = process.argv[2];
if(!rid) {
    console.log("用法: node douyu.js <房间号>");
    process.exit(1);
}

(async () => {
    try {
        const dy = new DouYu(rid);
        await dy.init();
        dy.did = await dy.getDid();
        const urls = await dy.getRealUrl();
        console.log(JSON.stringify(urls, null, 2));
    } catch (err) {
        console.error(err);
    }
})();
