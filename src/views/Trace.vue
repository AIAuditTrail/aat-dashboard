<template>
  <div class="trace-container">
    <div class="navbar">
      <router-link to="/" class="nav-link">返回首页</router-link>
      <h1 class="page-title">风险溯源</h1>
    </div>

    <div v-if="loading" class="status-message">正在加载风险详情...</div>
    <div v-else-if="error" class="status-message error">
      加载失败: {{ error.message }}
    </div>

    <div v-else-if="alertDetails" class="trace-content-grid">
      <!-- Left Panel -->
      <div class="left-panel">
        <div class="panel summary-panel">
          <h3>溯源摘要</h3>
          <p class="summary-description">{{ alertDetails.description }}</p>
        </div>
        <div class="panel alert-details-panel">
          <h3>风险详情</h3>
          <div class="details-content">
            <div class="detail-grid">
              <div><strong>节点名称:</strong> <span>{{ alertDetails.node.name }}</span></div>
              <div><strong>风险等级:</strong> <span :class="`level-${alertDetails.level}`">{{ alertDetails.level }}</span></div>
              <div><strong>状态:</strong> <span>{{ alertDetails.status }}</span></div>
              <div><strong>时间:</strong> <span>{{ new Date(alertDetails.created_at).toLocaleString() }}</span></div>
              <div class="full-width-detail"><strong>上报节点信息:</strong> <p>位于 {{ alertDetails.node.province }} 的 {{ alertDetails.node.name }} 节点上报了此风险。</p></div>
            </div>
          </div>
          <div class="panel-actions">
            <button @click="startTraceAndAnimation" :disabled="isPlaying || !isChartReady">
              {{ isPlaying ? '溯源中...' : '风险溯源' }}
            </button>
            <button @click="resetAnimation" :disabled="!isChartReady || !traceData">重置动画</button>
          </div>
        </div>
      </div>

      <!-- Right Panel -->
      <div class="right-panel">
        <div class="panel animation-panel" ref="chartRef">
          <!-- ECharts visualization will be rendered here -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { runTrace, getAlertDetails } from '@/api';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';

echarts.use([GraphChart, CanvasRenderer, TitleComponent, TooltipComponent, LegendComponent]);

const route = useRoute();
const alertId = ref(route.params.alert_id);

const traceData = ref(null);
const alertDetails = ref(null);
const loading = ref(true);
const error = ref(null);
const chartRef = ref(null);
const chartInstance = shallowRef(null);
const isPlaying = ref(false); // Represents "is tracing or animating"
const isChartReady = ref(false);
let animationTimer = null;
let currentChartNodes = [];

const DEFAULT_NODE_STYLE = { color: '#4a90e2', size: 30 };

const fetchAlertData = async () => {
  try {
    loading.value = true;
    const alertResult = await getAlertDetails(alertId.value);
    if (!alertResult) throw new Error("未能获取警报详情。");
    alertDetails.value = alertResult;
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
};

watch([chartRef, alertDetails], ([newChartRef, newAlertDetails]) => {
  if (newChartRef && newAlertDetails && !chartInstance.value) {
    initChart();
  }
}, { flush: 'post' });

const buildChartData = () => {
  const nodes = [];
  const links = [];

  if (traceData.value && traceData.value.playback_steps && traceData.value.playback_steps.length > 0) {
    const { layout_matrix, playback_steps } = traceData.value;
    for (const nodeId in layout_matrix.nodes) {
      const nodeInfo = layout_matrix.nodes[nodeId];
      nodes.push({
        id: nodeId, name: nodeInfo.name, x: nodeInfo.x, y: -nodeInfo.y,
        symbolSize: DEFAULT_NODE_STYLE.size,
        itemStyle: { color: DEFAULT_NODE_STYLE.color },
        label: { show: true, formatter: '{b}' }
      });
    }
    playback_steps.forEach(step => {
      if (step.from_node_id && step.to_node_id && !links.some(l => l.source === step.from_node_id && l.target === step.to_node_id)) {
        links.push({ source: step.from_node_id, target: step.to_node_id, lineStyle: { color: '#aaa', width: 2 } });
      }
    });
  } else if (alertDetails.value) {
    const alertNode = alertDetails.value.node;
    if (alertNode && alertDetails.value.node_id) {
      nodes.push({
        id: alertDetails.value.node_id,
        name: alertNode.name,
        x: 0,
        y: 0,
        symbolSize: 50,
        itemStyle: { color: '#ff4e4e' },
        label: { show: true, formatter: '{b}' }
      });
    }
  }
  return { nodes, links };
};

const initChart = () => {
  if (!chartRef.value) return;
  isChartReady.value = false;
  const { nodes, links } = buildChartData();
  currentChartNodes = JSON.parse(JSON.stringify(nodes));
  if (chartInstance.value) chartInstance.value.dispose();
  chartInstance.value = echarts.init(chartRef.value);
  const option = {
    title: { text: '风险传播路径', left: 'center', top: 'top', textStyle: { color: '#fff' } },
    tooltip: {},
    series: [{
      type: 'graph', layout: 'none', data: currentChartNodes, links: links,
      roam: true,
      emphasis: { focus: 'adjacency', label: { position: 'right', show: true } },
      lineStyle: { color: 'source', curveness: 0.3 }
    }]
  };
  chartInstance.value.setOption(option);
  isChartReady.value = true;
};

const executeAnimation = () => {
  if (!isChartReady.value) return;

  const { links } = buildChartData();
  let stepIndex = 0;
  let lastHighlightedIds = [];
  const steps = traceData.value.playback_steps;
  if (!steps || steps.length === 0) {
    isPlaying.value = false;
    return;
  }
  
  const executeStep = () => {
    if (stepIndex >= steps.length) {
      isPlaying.value = false;
      clearInterval(animationTimer);
      return;
    }
    const step = steps[stepIndex];
    
    const newNodes = JSON.parse(JSON.stringify(currentChartNodes));
    
    lastHighlightedIds.forEach(nodeId => {
      const node = newNodes.find(n => n.id === nodeId);
      if (node) {
         node.itemStyle.color = DEFAULT_NODE_STYLE.color;
         node.symbolSize = DEFAULT_NODE_STYLE.size;
      }
    });
    lastHighlightedIds = [];

    const updateNodeStyle = (nodeId, color, size) => {
      const node = newNodes.find(n => n.id === nodeId);
      if (node) {
        node.itemStyle.color = color;
        node.symbolSize = size;
        lastHighlightedIds.push(nodeId);
      }
    };
    
    switch (step.action) {
      case 'inspect':
        updateNodeStyle(step.node_id, '#f4e562', 40);
        break;
      case 'mark':
        const color = step.state === 'GREEN' ? '#62f49c' : '#ff6b6b';
        updateNodeStyle(step.node_id, color, 40);
        break;
      case 'cutoff':
        if(step.effects?.mark_red) step.effects.mark_red.forEach(id => updateNodeStyle(id, '#ff6b6b', 40));
        if(step.effects?.mark_green) step.effects.mark_green.forEach(id => updateNodeStyle(id, '#62f49c', 40));
        break;
      case 'finalize':
        updateNodeStyle(step.source_node_id, '#ff4e4e', 50);
        break;
    }
    
    currentChartNodes = newNodes;
    
    chartInstance.value.setOption({
      series: [{
        type: 'graph', layout: 'none', data: newNodes, links: links,
        roam: true,
        emphasis: { focus: 'adjacency', label: { position: 'right', show: true } },
        lineStyle: { color: 'source', curveness: 0.3 }
      }]
    });
    
    stepIndex++;
  };
  
  animationTimer = setInterval(executeStep, 1000);
};

const startTraceAndAnimation = async () => {
  if (isPlaying.value) return;
  isPlaying.value = true;

  try {
    const result = await runTrace({ alert_id: alertId.value });
    if (!result || !result.playback_steps || result.playback_steps.length === 0) {
      alert("溯源完成，但未发现可播放的动画路径。");
      isPlaying.value = false;
      return;
    }
    traceData.value = result;
    
    // Re-initialize the chart with the full graph data, then start the animation
    initChart();
    
    // A small delay to ensure the chart is rendered before starting the animation
    setTimeout(executeAnimation, 100);

  } catch (err) {
    error.value = err;
    isPlaying.value = false; // Reset on error
  }
};

const resetAnimation = (reInit = true) => {
  clearInterval(animationTimer);
  isPlaying.value = false;
  if (reInit) {
    // Reset to the initial single-node view if no trace data, or full graph if trace data exists
    initChart();
  }
};

onMounted(() => {
  fetchAlertData();
  const resizeObserver = new ResizeObserver(() => chartInstance.value?.resize());
  if (chartRef.value) resizeObserver.observe(chartRef.value);
  onBeforeUnmount(() => resizeObserver.disconnect());
});

onBeforeUnmount(() => {
  clearInterval(animationTimer);
  chartInstance.value?.dispose();
});
</script>

<style scoped>
.trace-container {
  display: flex; flex-direction: column; height: 100vh;
  background-color: #081832; color: #fff;
}
.navbar {
  display: flex; align-items: center; padding: 0 20px;
  height: 60px; background-color: #1e2a38; flex-shrink: 0;
}
.page-title { margin: 0 auto; font-size: 1.5em; }
.nav-link { color: #4a90e2; text-decoration: none; font-size: 1em; }
.status-message {
  flex-grow: 1; display: flex; justify-content: center;
  align-items: center; font-size: 1.2em;
}
.error { color: #ff6b6b; }
.trace-content-grid {
  flex-grow: 1; display: grid; grid-template-columns: 350px 1fr;
  gap: 20px; padding: 20px; min-height: 0;
}
.left-panel, .right-panel {
  display: flex; flex-direction: column; gap: 20px; min-height: 0;
}
.panel {
  background-color: #1e2a38; border-radius: 6px; padding: 20px;
  display: flex; flex-direction: column;
}
.summary-panel { flex-shrink: 0; }
.summary-description { font-size: 1.1em; color: #eee; }
.alert-details-panel { flex-grow: 1; min-height: 0; }
.details-content { flex-grow: 1; overflow-y: auto; }
.animation-panel { flex-grow: 1; padding: 10px; }
.diagnostic-panel { background-color: #3e2e2e; border: 1px solid #ff6b6b; flex-shrink: 0; }
.diagnostic-error { color: #ffacac; }
.panel-actions {
  margin-top: auto; padding-top: 20px;
  border-top: 1px solid #3a4a5c;
  display: flex; gap: 10px; flex-shrink: 0;
}
h3 {
  margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #3a4a5c;
  padding-bottom: 10px; flex-shrink: 0;
}
.detail-grid {
  display: grid; grid-template-columns: auto 1fr;
  gap: 10px 15px; align-items: center;
}
.detail-grid strong { color: #aaa; }
.detail-grid .full-width-detail { grid-column: 1 / -1; align-items: start; }
.detail-grid p { margin: 0; }
.level-5, .level-4 { color: #ff6b6b; font-weight: bold; }
.level-3 { color: #f4e562; font-weight: bold; }
.level-2, .level-1 { color: #62f49c; font-weight: bold; }
button {
  padding: 8px 15px; border-radius: 4px; border: none;
  cursor: pointer; background-color: #2f4f75; color: #fff;
}
button:disabled { background-color: #555; cursor: not-allowed; }
</style>
