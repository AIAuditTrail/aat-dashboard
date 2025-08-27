// 安装依赖：
// npm install moralis @moralisweb3/evm-utils

import Moralis from 'moralis';
import fs from 'fs';

async function exportUsdtTransfers() {
    await Moralis.start({
        apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImZjNWQzNDFjLWMyNWMtNGE4Mi04YmViLTc0Njk4MWEyYjQyYSIsIm9yZ0lkIjoiNDYzNzUyIiwidXNlcklkIjoiNDc3MTA3IiwidHlwZUlkIjoiMDMzOWYxZjgtODYyOS00NmU2LTkwYzEtMWM0MDU4NzlmNjVlIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTQ1NjgwNjYsImV4cCI6NDkxMDMyODA2Nn0.ybytz0FlHNbhn0rzWogJa-HEdmy_gZodWlu7f_7HDKY',
    });

    // USDT 合约地址
    const tokenAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const chain = "0x1";

const limit = 100;       // 每页请求 50 条
let cursor: string | undefined = undefined;
const maxRows = 10000;    // 最多存储 100 条记录
const rows = ['from,to,txHash,blockNumber'];
let count = 0;

    do {
        const response = await Moralis.EvmApi.token.getTokenTransfers({
            chain,
            address: tokenAddress,
            limit,
            cursor,
            order: 'DESC',
        });
        const data = response.toJSON();

        for (const tx of data.result) {
            rows.push(`${tx.from_address},${tx.to_address},${tx.transaction_hash},${tx.block_number}`);
            if (++count >= maxRows) break;
        }

        cursor = data.cursor;
        if (count >= maxRows) break;
    } while (cursor);

    fs.writeFileSync('usdt_transfers.csv', rows.join('\n'), 'utf-8');
    console.log('导出完成，保存为 usdt_transfers.csv');
}

exportUsdtTransfers().catch(console.error);