<template>
  <div class="left div_any01">
    <!-- 饼图 -->
    <div class="div_any_child">
      <div class="div_any_title">
        <img src="/images/title_1.png"/>
        运行节点总数
      </div>
      <div ref="pieChartRef" class="p_chart"></div>
    </div>

    <!-- 柱状图 -->
    <div class="div_any_child">
      <div class="div_any_title">
        <img src="/images/title_2.png"/>
        风险节点分类
      </div>
      <div ref="barChartRef" class="p_chart"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import { getCharts } from '@/api'

const pieChartRef = ref(null)
const barChartRef = ref(null)

onMounted(async () => {
  const pie = echarts.init(pieChartRef.value)
  const bar = echarts.init(barChartRef.value)

  try {
    const { pie: pieData, bar: barData } = await getCharts()

    // 设置饼图
    pie.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item'
      },
      legend: {
        bottom: '0%',
        textStyle: { color: '#fff' }
      },
      series: [
        {
          name: '节点状态',
          type: 'pie',
          radius: '65%',
          center: ['50%', '50%'],
          data: pieData,
          label: { color: '#fff' }
        }
      ]
    })

    // 设置柱状图
    bar.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: ['低风险', '中风险', '高风险'],
        axisLine: { lineStyle: { color: '#fff' } },
        axisLabel: { color: '#fff' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#fff' } },
        splitLine: { lineStyle: { color: '#555' } },
        axisLabel: { color: '#fff' }
      },
      series: [
        {
          data: barData,
          type: 'bar',
          itemStyle: {
            color: function (params) {
              return ['#25f3e6', '#ff9900', '#ff4e4e'][params.dataIndex]
            }
          }
        }
      ]
    })
  } catch (error) {
    console.error('获取图表数据失败:', error)
  }

  // 窗口大小变化时自适应图表
  window.addEventListener('resize', () => {
    pie.resize()
    bar.resize()
  })
})
</script>

<style scoped>
/* 样式主要继承 common.css，.p_chart 保证尺寸 */
</style>