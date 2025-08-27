/**
 * 用法：
 *   ts-node script.ts input.csv > output.csv
 * 或
 *   tsc script.ts --lib ES2020,DOM --target ES2020 && node script.js input.csv > output.csv
 */

import * as fs from "fs";

const provinces = [
    "北京","天津","上海","重庆","河北","山西","辽宁","吉林","黑龙江",
    "江苏","浙江","安徽","福建","江西","山东","河南","湖北","湖南",
    "广东","海南","四川","贵州","云南","陕西","甘肃","青海","台湾",
    "内蒙古","广西","西藏","宁夏","新疆","香港","澳门"
];

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// 同一 txHash -> 同一十进制字符串
const txMap = new Map<string, string>();

function hexTxToDecimalString(txHash: string): string {
    const key = txHash.toLowerCase();
    const cached = txMap.get(key);
    if (cached) return cached;

    // 兼容是否带 0x 前缀
    const hex = key.startsWith("0x") ? key.slice(2) : key;

    // 使用 BigInt 保证任意长度哈希的精度
    // 对空值/非法值做一下兜底
    const dec = hex && /^[0-9a-f]+$/i.test(hex)
        ? BigInt("0x" + hex).toString(10)
        : "";

    txMap.set(key, dec);
    return dec;
}

// 读取输入
const inputPath = process.argv[2];
const raw = inputPath ? fs.readFileSync(inputPath, "utf-8") : fs.readFileSync(0, "utf-8"); // 0 = stdin

// 简单 CSV 解析（本场景字段无逗号、无引号时足够）
const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
if (lines.length === 0) {
    process.stdout.write("");
    process.exit(0);
}

// 解析表头，定位列索引
const header = lines[0].split(",");
const colFrom = header.indexOf("from");
const colTo = header.indexOf("to");
const colTx = header.indexOf("txHash");
const colBlock = header.indexOf("blockNumber");

if (colFrom === -1 || colTo === -1 || colTx === -1) {
    throw new Error("CSV 缺少必须的列：from / to / txHash");
}

// 输出新的表头（去掉 blockNumber，新增 geo）
const newHeader = ["from", "to", "txHash", "geo"];
process.stdout.write(newHeader.join(",") + "\n");

// 处理每一行
for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",");

    // 取原列值
    const from = row[colFrom] ?? "";
    const to = row[colTo] ?? "";
    const txHex = row[colTx] ?? "";
    // 忽略 blockNumber：不读取、不输出

    // 转换 txHash 为十进制字符串
    const txDec = hexTxToDecimalString(txHex);

    // 随机一个省份
    const geo = pickRandom(provinces);

    const outRow = [from, to, txDec, geo];
    process.stdout.write(outRow.join(",") + "\n");
}