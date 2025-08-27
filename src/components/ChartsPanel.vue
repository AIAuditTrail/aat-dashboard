<template>
  <div class="div_any01">
    <div v-if="loading" class="loading-skeleton">
      <div class="div_any_child skeleton-item"></div>
      <div class="div_any_child skeleton-item"></div>
    </div>
    <div v-else-if="stats" class="charts-container">
      <!-- 饼图 -->
      <div class="div_any_child">
        <div class="div_any_title">
          <img src="/images/title_1.png"/>
          运行节点总数：{{ stats.total_nodes || 0 }}
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
     <div v-else class="error-message">
      图表数据加载失败...
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  stats: {
    type: Object,
    default: () => null
  },
  loading: {
    type: Boolean,
    default: true
  }
})

const pieChartRef = ref(null)
const barChartRef = ref(null)

let pieChart = null
let barChart = null

const updateCharts = (statsData) => {
  if (!statsData || !statsData.node_levels || !pieChartRef.value || !barChartRef.value) return
  
  if (!pieChart) {
    pieChart = echarts.init(pieChartRef.value)
  }
  if (!barChart) {
    barChart = echarts.init(barChartRef.value)
  }

  const pieData = Object.entries(statsData.node_levels.by_level).map(([level, value]) => ({
    name: `风险等级 ${level}`,
    value,
  }));

  const barData = Object.values(statsData.node_levels.by_level);

  pieChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: {
      bottom: '0%',
      textStyle: { color: '#fff' }
    },
    series: [{
      name: '节点等级',
      type: 'pie',
      radius: '65%',
      center: ['50%', '50%'],
      data: pieData,
      label: { color: '#fff' }
    }]
  })

  barChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['等级 1', '等级 2', '等级 3', '等级 4', '等级 5'],
      axisLine: { lineStyle: { color: '#fff' } },
      axisLabel: { color: '#fff' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#fff' } },
      splitLine: { lineStyle: { color: '#555' } },
      axisLabel: { color: '#fff' }
    },
    series: [{
      data: barData,
      type: 'bar',
      itemStyle: {
        color: (params) => ['#25f3e6', '#62f49c', '#f4e562', '#ff9900', '#ff4e4e'][params.dataIndex]
      }
    }]
  })
}

const resizeCharts = () => {
  pieChart?.resize()
  barChart?.resize()
}

onMounted(() => {
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  pieChart?.dispose()
  barChart?.dispose()
})


watch(() => props.stats, (newStats) => {
  if (!props.loading && newStats) {
     nextTick(() => {
        updateCharts(newStats)
     });
  }
}, { immediate: true, deep: true })

</script>

<style scoped>
/* 样式主要继承 common.css，.p_chart 保证尺寸 */
.charts-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}
.charts-container > .div_any_child {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.p_chart {
  flex-grow: 1;
}
.loading-skeleton {
  display: flex;
  width: 100%;
}
.skeleton-item {
  flex: 1;
  height: 200px;
  background-color: #2a3a4a;
  border-radius: 4px;
  margin: 10px;
  animation: pulse 1.5s infinite ease-in-out;
}
.error-message {
  color: #ff6b6b;
  text-align: center;
  width: 100%;
  padding: 20px;
}
@keyframes pulse {
  0% { background-color: #2a3a4a; }
  50% { background-color: #3a4a5a; }
  100% { background-color: #2a3a4a; }
}
</style>
