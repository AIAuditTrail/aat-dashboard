<template>
  <div class="div_any01">
    <div v-if="loading" class="loading-skeleton">
      <div class="div_any_child skeleton-item"></div>
      <div class="div_any_child skeleton-item"></div>
    </div>
    <div v-else-if="nodes && nodes.length > 0" class="charts-container">
      <!-- Pie Chart -->
      <div class="div_any_child">
        <div class="div_any_title">
          <img src="/images/title_1.png"/>
          Total Running Nodes: {{ totalNodes }}
        </div>
        <div ref="pieChartRef" class="p_chart"></div>
      </div>

      <!-- Bar Chart -->
      <div class="div_any_child">
        <div class="div_any_title">
          <img src="/images/title_2.png"/>
          Risk Category Breakdown
        </div>
        <div ref="barChartRef" class="p_chart"></div>
      </div>
    </div>
     <div v-else class="error-message">
      Failed to load chart data...
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick, computed } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  nodes: {
    type: Array,
    default: () => []
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

const nodeLevels = computed(() => {
  if (!props.nodes || props.nodes.length === 0) {
    return { by_level: {}, total: 0 };
  }
  const by_level = props.nodes.reduce((acc, node) => {
    const level = node.runtime_level || 0;
    if (level > 0) { // Only count nodes with a risk level
      acc[level] = (acc[level] || 0) + 1;
    }
    return acc;
  }, {});
  const total = props.nodes.length;
  return { by_level, total };
});

const totalNodes = computed(() => nodeLevels.value.total);

const updateCharts = () => {
  if (!nodeLevels.value || !pieChartRef.value || !barChartRef.value) return;

  if (!pieChart) pieChart = echarts.init(pieChartRef.value);
  if (!barChart) {
    barChart = echarts.init(barChartRef.value);
    isLegendListenerAttached = false;
  }
  
  if (isLegendListenerAttached) {
    barChart.off('legendselectchanged');
  }

  const { by_level } = nodeLevels.value;
  const allLevels = Object.keys(by_level).map(Number).sort((a, b) => a - b);

  const pieData = allLevels.map(level => ({
    name: `Risk Level ${level}`,
    value: by_level[level],
  }));

  pieChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: { show: false },
    series: [{
      name: 'Node Level',
      type: 'pie',
      radius: '65%',
      center: ['50%', '45%'],
      data: pieData,
      label: { color: '#fff' }
    }]
  }, true);

  const initialXAxisData = allLevels.map(level => `Level ${level}`);
  const initialBarSeries = allLevels.map(level => ({
    name: `Level ${level}`,
    type: 'bar',
    data: initialXAxisData.map(axisLabel => (axisLabel === `Level ${level}` ? by_level[level] : 0)),
    itemStyle: { color: getRiskColor(level) }
  }));

  barChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const relevantParam = params.find(p => p.value > 0);
        if (relevantParam) return `${relevantParam.seriesName}<br/>Node Count: ${relevantParam.value}`;
        if (params.length > 0) return `${params[0].axisValue}<br/>Node Count: 0`;
        return 'No Data';
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
    const { by_level: current_by_level } = nodeLevels.value;
    const { selected } = params;

    const selectedLevels = Object.entries(selected)
      .filter(([, isSelected]) => isSelected)
      .map(([name]) => parseInt(name.replace('Level ', ''), 10))
      .sort((a, b) => a - b);

    const newXAxisData = selectedLevels.map(level => `Level ${level}`);
    const newBarSeries = selectedLevels.map(level => ({
      name: `Level ${level}`,
      type: 'bar',
      data: newXAxisData.map(axisLabel => (axisLabel === `Level ${level}` ? current_by_level[level] || 0 : 0)),
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
  const colors = {
    1: '#62f49c',    // Low
    2: '#f4e562',    // Medium
    3: '#ff9900',    // Medium-High
    4: '#ff4e4e',    // High
    5: '#b30000',    // Critical
  };
  return colors[level] || '#ccc'; // Default
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


watch(() => props.nodes, (newNodes) => {
  if (!props.loading && newNodes && newNodes.length > 0) {
     nextTick(() => {
        updateCharts();
     });
  }
}, { immediate: true, deep: true })

</script>

<style scoped>
/* Styles are mainly inherited from common.css, .p_chart ensures size */
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
