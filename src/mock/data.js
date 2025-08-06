// src/mock/data.js

export const overviewData = {
    lowTotal: 1235,
    lowMonth: 5,
    midTotal: 123,
    midMonth: 6,
    highTotal: 12,
    highMonth: 7
}

export const chartsData = {
    pie: [
        { value: 50, name: '运行中' },
        { value: 10, name: '维护中' },
        { value: 5, name: '已下线' }
    ],
    bar: [235, 666, 123] // 低 中 高 风险节点
}

const provinces = ['广东', '北京', '上海', '浙江', '江苏', '山东', '四川', '重庆', '福建', '湖南']


export const nodesData = Array.from({ length: 30 }, (_, i) => {
    const risk = Math.ceil(Math.random() * 100)
    return {
        id: i,
        name: `节点 ${i + 1}`,
        geo: provinces[i % provinces.length],  // ✅ 使用真实省份名
        desc: `这是节点 ${i + 1} 的描述`,
        risk
    }
})

export const alertData = [
    '【高危】节点 12 在 10:23 检测到异常流量！',
    '【中危】节点 3 在 10:25 存在频繁请求行为',
    '【高危】节点 8 尝试访问受限区域',
    '【低危】节点 15 风险等级上升',
    '【中危】节点 21 存在潜在外联请求',
    '【高危】节点 5 触发多个异常警报',
    '【中危】节点 17 出现配置篡改痕迹'
]