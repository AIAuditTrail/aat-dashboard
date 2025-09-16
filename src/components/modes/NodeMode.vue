<template>
  <div class="node-mode-container">
    <div v-if="loading" class="loading-skeleton"></div>
    <div v-else-if="error" class="error-message">节点数据加载失败...</div>
    <div v-else ref="chartRef" style="width: 100%; height: 100%;"></div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, computed, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  loading: { type: Boolean, default: true },
  error: { type: Object, default: null }
})

const emit = defineEmits(['node-selected'])
const chartRef = ref(null)
let chartInstance = null

const getRiskColor = (level) => {
  const colors = { 1: '#62f49c', 2: '#f4e562', 3: '#ff9900', 4: '#ff4e4e', 5: '#b30000' };
  return colors[level] || '#ccc';
};

const sortedNodes = computed(() => {
  return [...props.nodes].sort((a, b) => (b.runtime_level || 0) - (a.runtime_level || 0) || a.name.localeCompare(b.name))
})

const updateChart = () => {
  if (!chartInstance) return;
  const chartData = sortedNodes.value.map((node) => ({
    id: node.id,
    name: node.name,
    value: node.runtime_level || 0,
    symbolSize: 30 + (node.runtime_level || 0) * 5,
    itemStyle: { color: getRiskColor(node.runtime_level) || '#ccc' },
  }));
  chartInstance.setOption({ series: [{ data: chartData }] });
  chartInstance.resize();
};

const resizeHandler = () => chartInstance?.resize();

watch(chartRef, (newEl) => {
  if (newEl && !chartInstance) {
    chartInstance = echarts.init(newEl);
    chartInstance.setOption({
      backgroundColor: 'transparent',
      tooltip: { formatter: ({ data }) => `${data.name}<br/>Risk Level: ${data.value}` },
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        force: { repulsion: 150, gravity: 0.1, friction: 0.6 },
        label: { show: true, position: 'bottom', color: '#fff', formatter: '{b}' },
        data: [],
      }]
    });
    chartInstance.on('click', (params) => {
      if (params.dataType === 'node') emit('node-selected', params.data.id);
    });
    window.addEventListener('resize', resizeHandler);

    if (props.nodes.length > 0) {
      updateChart();
    }
  }
});

watch(() => props.nodes, (newNodes) => {
  if (chartInstance && newNodes.length > 0) {
    updateChart();
  }
}, { deep: true });

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler);
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});
</script>

<style scoped>
.node-mode-container {
  width: 100%;
  height: 100%;
}
.loading-skeleton {
  width: 100%;
  height: 100%;
  background-color: #2a3a4a;
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;
}
.error-message {
  color: #ff6b6b;
  text-align: center;
  padding-top: 50px;
}
@keyframes pulse {
  0% { background-color: #2a3a4a; }
  50% { background-color: #3a4a5a; }
  100% { background-color: #2a3a4a; }
}
</style>
