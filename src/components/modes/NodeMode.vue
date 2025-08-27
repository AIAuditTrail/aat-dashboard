<template>
  <div class="node-mode-container">
    <div v-if="loading" class="loading-skeleton"></div>
    <div v-else-if="error" class="error-message">节点数据加载失败...</div>
    <div v-else ref="chartRef" style="width: 100%; height: 100%;"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  nodes: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: true
  },
  error: {
    type: Object,
    default: null
  }
})

const chartRef = ref(null)
let chartInstance = null

const emit = defineEmits(['node-selected'])

const riskLevelColors = {
  1: '#62f49c', 2: '#25f3e6', 3: '#f4e562', 4: '#ff9900', 5: '#ff4e4e',
};

const sortedNodes = computed(() => {
  return [...props.nodes].sort((a, b) => {
    return b.effective_level - a.effective_level || a.name.localeCompare(b.name)
  })
})

const updateChart = () => {
  if (!chartInstance || !chartRef.value) return;

  const { width, height } = chartRef.value.getBoundingClientRect();
  if (width === 0 || height === 0) return;

  const chartData = sortedNodes.value.map((node) => ({
    id: node.id,
    name: node.name,
    value: node.effective_level,
    symbolSize: 30 + node.effective_level * 5,
    itemStyle: {
      color: riskLevelColors[node.effective_level] || '#ccc',
    },
  }));
  
  chartInstance.setOption({
    series: [{ data: chartData }]
  });
};

const resizeHandler = () => chartInstance?.resize();

onMounted(() => {
    if (chartRef.value) {
        chartInstance = echarts.init(chartRef.value);

        chartInstance.setOption({
            backgroundColor: 'transparent',
            tooltip: {
                formatter: ({ data }) => `${data.name}<br/>风险等级: ${data.value}`
            },
            series: [{
                type: 'graph',
                layout: 'force',
                roam: true,
                force: {
                    repulsion: 150, // Controls distance between nodes
                    gravity: 0.1,   // Pulls nodes towards the center
                    friction: 0.6
                },
                label: {
                    show: true,
                    position: 'bottom',
                    color: '#fff',
                    formatter: '{b}'
                },
                data: [], // Initially empty
            }]
        });

        chartInstance.on('click', (params) => {
            if (params.dataType === 'node') {
                emit('node-selected', params.data.id);
            }
        });
        
        if (!props.loading && props.nodes.length) {
            updateChart();
        }

        window.addEventListener('resize', resizeHandler);
    }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler);
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});

watch(() => props.nodes, () => {
  if (chartInstance) {
    updateChart();
  }
}, { deep: true });
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
