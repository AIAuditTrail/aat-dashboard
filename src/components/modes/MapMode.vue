<template>
  <div ref="chartContainer" style="width: 100%; height: 100%"></div>
</template>

<script setup>
import { onMounted, ref, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { getNodes } from '@/api'

const chartContainer = ref(null)  // ✅ 需要定义
let chartInstance = null

function aggregateToMap(nodes) {
  const mapData = {}

  nodes.forEach(node => {
    const region = node.geo || '未知'
    if (!mapData[region]) {
      mapData[region] = { totalRisk: 0, count: 0 }
    }
    mapData[region].totalRisk += node.risk
    mapData[region].count += 1
  })

  return Object.entries(mapData).map(([region, { totalRisk, count }]) => ({
    name: region,
    value: +(totalRisk / count).toFixed(2)  // ✅ 平均风险值
  }))
}

onMounted(async () => {
  const mapJson = await fetch('/maps/china.json').then(res => res.json())
  echarts.registerMap('china', mapJson)

  const nodes = await getNodes()   // ✅ 你之前可能漏了这行
  const seriesData = aggregateToMap(nodes)
  const values = seriesData.map(d => d.value)
  const maxValue = Math.max(...values)

  chartInstance = echarts.init(chartContainer.value)
  chartInstance.setOption({
    backgroundColor: '#001f3f',
    tooltip: { trigger: 'item', formatter: '{b}<br/>风险指数: {c}' },
    visualMap: {
      min: 0,
      max: Math.ceil(maxValue),
      left: 'left',
      bottom: '5%',
      text: ['风险高', '风险低'],
      calculable: true,
      inRange: { color: ['#50a3ba', '#eac736', '#d94e5d'] },
      textStyle: { color: '#fff' }
    },
    series: [{
      name: '风险指数',
      type: 'map',
      map: 'china',
      roam: true,
      label: { show: true, color: '#ffffff' },
      itemStyle: {
        areaColor: '#003366',
        borderColor: '#0ba3b0'
      },
      emphasis: {
        itemStyle: { areaColor: '#2a333d' }
      },
      data: seriesData
    }]
  })

  chartInstance.on('click', (params) => {
    const detailBox = document.getElementById('nodeDetailBox')
    if (detailBox) {
      const value = typeof params.value === 'number' ? params.value : 0
      detailBox.innerHTML = `
        <p><strong>地区：</strong>${params.name}</p>
        <p><strong>高风险节点数：</strong>${value}</p>
        <p><strong>节点数量：</strong>${value}</p>
      `
    }
  })

  window.addEventListener('resize', chartInstance.resize)
})

onBeforeUnmount(() => {
  if (chartInstance) {
    window.removeEventListener('resize', chartInstance.resize)
    chartInstance.dispose()
  }
})
</script>
