<template>
  <div ref="chartEl" style="width: 100%; height: 100%;"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getNodes } from '@/api'

const chartEl = ref(null)
let chartInstance = null

// 风险值在 1~100 之间（或可以根据实际情况设置最大值）
function getColorByRisk(risk, min = 1, max = 100) {
  // 0（绿） → 120°，100（红） → 0°
  const hue = Math.max(0, 120 - ((risk - min) / (max - min)) * 120)
  return `hsl(${hue}, 100%, 50%)`
}

// 生命周期钩子必须 setup 顶层注册
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler)
  if (chartInstance && !chartInstance.isDisposed()) {
    chartInstance.dispose()
  }
})

// resize handler 也必须在顶层定义
const resizeHandler = () => {
  if (chartInstance && !chartInstance.isDisposed()) {
    chartInstance.resize()
  }
}

onMounted(async () => {
  await nextTick()

  if (!chartEl.value) return

  const nodes = await getNodes()

  const oldInstance = echarts.getInstanceByDom(chartEl.value)
  if (oldInstance && !oldInstance.isDisposed()) {
    oldInstance.dispose()
  }

  chartInstance = echarts.init(chartEl.value)

  // const colors = ['#00ff00', '#99cc00', '#ffff00', '#ff9900', '#ff0000']
  const echartsNodes = nodes.map(node => ({
    ...node,
    x: Math.random() * 800,
    y: Math.random() * 600,
    symbolSize: 40,
    itemStyle: {
      color: getColorByRisk(node.risk)
    },
    draggable: true
  }))

  chartInstance.setOption({
    backgroundColor: '#081832',
    tooltip: {
      formatter: params =>
          `${params.data.name}<br>风险等级：${params.data.risk}<br>位置：${params.data.geo}`
    },
    animation: true,
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        label: { show: true, color: '#ffffff' },
        force: { repulsion: 200, gravity: 0.1, edgeLength: 50 },
        data: echartsNodes
      }
    ]
  })

  chartInstance.on('click', params => {
    const data = params.data
    const detailBox = document.getElementById('nodeDetailBox')
    if (detailBox) {
      detailBox.innerHTML = `
        <p><strong>名称：</strong>${data.name}</p>
        <p><strong>风险等级：</strong>${data.risk}</p>
        <p><strong>地理位置：</strong>${data.geo}</p>
        <p><strong>描述：</strong>${data.desc}</p>
      `
    }
  })

  // add listener AFTER chartInstance created
  window.addEventListener('resize', resizeHandler)
})
</script>

<style scoped>
/* optional */
</style>