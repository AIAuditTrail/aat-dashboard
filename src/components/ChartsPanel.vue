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
          运行节点总数：{{ totalNodes }}
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
import { onMounted, onBeforeUnmount, ref, watch, nextTick, computed } from 'vue'
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
let isLegendListenerAttached = false;

const totalNodes = computed(() => {
  if (!props.stats || !props.stats.node_levels || !props.stats.node_levels.by_level) return 0;
  return Object.values(props.stats.node_levels.by_level).reduce((sum, count) => sum + count, 0);
});

const updateCharts = (statsData) => {
  if (!statsData || !statsData.node_levels || !pieChartRef.value || !barChartRef.value) return;

  if (!pieChart) pieChart = echarts.init(pieChartRef.value);
  if (!barChart) {
    barChart = echarts.init(barChartRef.value);
    isLegendListenerAttached = false;
  }
  
  if (isLegendListenerAttached) {
    barChart.off('legendselectchanged');
  }

  const { by_level } = statsData.node_levels;
  const allLevels = Object.keys(by_level).map(Number).sort((a, b) => a - b);

  const pieData = allLevels.map(level => ({
    name: `风险等级 ${level}`,
    value: by_level[level],
  }));

  pieChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: { show: false },
    series: [{
      name: '节点等级',
      type: 'pie',
      radius: '65%',
      center: ['50%', '45%'],
      data: pieData,
      label: { color: '#fff' }
    }]
  }, true);

  const initialXAxisData = allLevels.map(level => `等级 ${level}`);
  const initialBarSeries = allLevels.map(level => ({
    name: `等级 ${level}`,
    type: 'bar',
    data: initialXAxisData.map(axisLabel => (axisLabel === `等级 ${level}` ? by_level[level] : 0)),
    itemStyle: { color: getRiskColor(level) }
  }));

  barChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const relevantParam = params.find(p => p.value > 0);
        if (relevantParam) return `${relevantParam.seriesName}<br/>节点数: ${relevantParam.value}`;
        if (params.length > 0) return `${params[0].axisValue}<br/>节点数: 0`;
        return '无数据';
      }
    },
    legend: {
      type: 'scroll',
      bottom: '2%',
      textStyle: { color: '#fff' },
      selectedMode: 'multiple'
    },
    xAxis: {
      type: 'category',
      data: initialXAxisData,
      axisLine: { lineStyle: { color: '#fff' } },
      axisLabel: { color: '#fff' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#fff' } },
      splitLine: { lineStyle: { color: '#555' } },
      axisLabel: { color: '#fff' }
    },
    series: initialBarSeries
  }, true);

  barChart.on('legendselectchanged', (params) => {
    const { by_level: current_by_level } = props.stats.node_levels;
    const { selected } = params;

    const selectedLevels = Object.entries(selected)
      .filter(([, isSelected]) => isSelected)
      .map(([name]) => parseInt(name.replace('等级 ', ''), 10))
      .sort((a, b) => a - b);

    const newXAxisData = selectedLevels.map(level => `等级 ${level}`);
    const newBarSeries = selectedLevels.map(level => ({
      name: `等级 ${level}`,
      type: 'bar',
      data: newXAxisData.map(axisLabel => (axisLabel === `等级 ${level}` ? current_by_level[level] || 0 : 0)),
      itemStyle: { color: getRiskColor(level) }
    }));

    barChart.setOption({
      xAxis: { data: newXAxisData },
      series: newBarSeries
    });
  });
  isLegendListenerAttached = true;
};

const getRiskColor = (level) => {
  if (level >= 9) return '#b30000'; // Critical
  if (level >= 7) return '#ff4e4e'; // High
  if (level >= 5) return '#ff9900'; // Medium-High
  if (level >= 3) return '#f4e562'; // Medium
  return '#62f49c'; // Low
};

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
