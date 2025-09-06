<template>
  <div class="trace-container">
    <div class="navbar">
      <router-link to="/" class="nav-link">Back to Home</router-link>
      <h1 class="page-title">Risk Tracing</h1>
    </div>

    <div v-if="loading" class="status-message">Loading trace data...</div>
    <div v-else-if="error" class="status-message error">
      Failed to load: {{ error.message || error }}
    </div>

    <div v-else-if="alertDetails" class="trace-content-grid">
      <!-- Left Panel -->
      <div class="left-panel">
        <div class="panel summary-panel">
          <h3>Trace Summary</h3>
          <p class="summary-description">{{ alertDetails.description }}</p>
        </div>

        <div class="panel alert-details-panel">
          <h3>Risk Details</h3>
          <div class="details-content">
            <div class="detail-grid">
              <div><strong>Node Name:</strong> <span>{{ alertDetails.node?.name }}</span></div>
              <div><strong>Risk Level:</strong> <span :class="`level-${alertDetails.level}`">{{
                  alertDetails.level
                }}</span></div>
              <div><strong>Status:</strong> <span>{{ alertDetails.status }}</span></div>
              <div><strong>Time:</strong> <span>{{ new Date(alertDetails.created_at).toLocaleString() }}</span></div>
              <div class="full-width-detail">
                <strong>Reporting Node Info:</strong>
                <p>This risk was reported by the {{ alertDetails.node?.name }} node, located in {{ alertDetails.node?.province }}.</p>
              </div>
            </div>
          </div>

          <div class="panel-actions">
            <button @click="startTraceAndAnimation" :disabled="isPlaying || !isChartReady">
              {{ isPlaying ? 'Tracing...' : 'Start Risk Trace' }}
            </button>
            <button @click="resetAnimation" :disabled="!isChartReady">Reset Animation</button>
          </div>
        </div>
      </div>

      <!-- Right Panel -->
      <div class="right-panel">
        <div class="panel animation-panel" ref="chartRef"></div>
      </div>
    </div>
    
    <!-- Node Detail Modal -->
    <div v-if="isNodeDetailVisible" class="modal-overlay" @click="isNodeDetailVisible = false">
      <div class="modal-content" @click.stop>
        <h3 v-if="selectedNodeDetails">{{ selectedNodeDetails.name }}</h3>
        <h3 v-else>Loading...</h3>
        <div v-if="isNodeDetailLoading" class="status-message">Loading node details...</div>
        <div v-else-if="selectedNodeDetails" class="details-content">
          <div class="detail-grid">
            <div><strong>ID:</strong> <span>{{ selectedNodeDetails.id }}</span></div>
            <div><strong>Province:</strong> <span>{{ selectedNodeDetails.province }}</span></div>
            <div><strong>Static Level:</strong> <span>{{ selectedNodeDetails.static_level }}</span></div>
            <div><strong>Runtime Level:</strong> <span>{{ selectedNodeDetails.runtime_level }}</span></div>
            <div><strong>Effective Level:</strong> <span>{{ selectedNodeDetails.effective_level }}</span></div>
            <div><strong>Trajectories:</strong> <span>{{ selectedNodeDetails.trajectory_count }}</span></div>
            <div class="full-width-detail"><strong>Created At:</strong> <span>{{ new Date(selectedNodeDetails.created_at).toLocaleString() }}</span></div>
            <div class="full-width-detail"><strong>Updated At:</strong> <span>{{ new Date(selectedNodeDetails.updated_at).toLocaleString() }}</span></div>
          </div>
          <div class="panel-actions">
            <button @click="isNodeDetailVisible = false">Close</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, shallowRef, nextTick} from 'vue';
import {useRoute} from 'vue-router';
import {runTrace, getAlertDetails, getTraceRun, getNodeDetails} from '@/api';

import * as echarts from 'echarts/core';
import {GraphChart} from 'echarts/charts';
import {CanvasRenderer} from 'echarts/renderers';
import {TitleComponent, TooltipComponent, LegendComponent} from 'echarts/components';

echarts.use([GraphChart, CanvasRenderer, TitleComponent, TooltipComponent, LegendComponent]);

/* ---------- Basic State ---------- */
const route = useRoute();
const alertId = ref(String(route.params.alert_id || ''));
const traceRunId = ref(String(route.query.trace_run_id || ''));


const alertDetails = ref(null);
const traceData = ref(null);
const loading = ref(true);
const error = ref(null);

const chartRef = ref(null);
const chart = shallowRef(null);
const isChartReady = ref(false);
const isPlaying = ref(false);

let resizeObserver = null;
let animationTimer = null;

// Node Detail Modal State
const selectedNodeDetails = ref(null);
const isNodeDetailVisible = ref(false);
const isNodeDetailLoading = ref(false);

// Runtime Snapshot
let nodeList = [];   // echarts data
let linkList = [];   // echarts links
let nodeState = new Map(); // id -> {color, size}

const DEFAULT_NODE = {color: '#4a90e2', size: 30};
const COLORS = {GREEN: '#62f49c', RED: '#ff6b6b', YELLOW: '#f4e562', SOURCE: '#ff4e4e'};
const LABEL_STYLE = {
  show: true,
  formatter: '{b}',
  color: '#fff',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  padding: [3, 5],
  borderRadius: 3
};

/* ---------- Node Click Handler ---------- */
async function handleNodeClick(params) {
  if (params.dataType === 'node') {
    const nodeId = params.data.id;
    if (!nodeId) return;

    isNodeDetailLoading.value = true;
    isNodeDetailVisible.value = true;
    selectedNodeDetails.value = null;

    try {
      const details = await getNodeDetails(nodeId);
      selectedNodeDetails.value = details;
    } catch (e) {
      console.error(`Failed to get details for node ${nodeId}:`, e);
      selectedNodeDetails.value = { name: `Error loading details for node ${nodeId}` };
    } finally {
      isNodeDetailLoading.value = false;
    }
  }
}

/* ---------- Data Loading ---------- */
async function loadInitialData() {
  try {
    loading.value = true;

    // Prioritize loading history via trace_run_id
    if (traceRunId.value) {
      const res = await getTraceRun(traceRunId.value);
      if (!res) throw new Error('Could not fetch the specified trace record');
      traceData.value = res;

      // History may not contain full alert details, so fetch them separately
      if (res.alert_id) {
        alertDetails.value = await getAlertDetails(res.alert_id);
      } else {
        // Construct minimal details if even alert_id is missing
        alertDetails.value = {
          description: `Replaying trace record ${traceRunId.value}`,
          node: {},
        };
      }
      return; // Return directly, wait for auto-play
    }

    // Otherwise, load basic info via alert_id
    if (alertId.value) {
      const res = await getAlertDetails(alertId.value);
      if (!res) throw new Error('Could not fetch alert details');
      alertDetails.value = res;
      return;
    }

    throw new Error('Missing alert_id or trace_run_id');

  } catch (e) {
    error.value = e;
  } finally {
    loading.value = false;
  }
}


/* ---------- Parse layout_matrix (v1.5.0+) ---------- */
function parseLayoutMatrix(layout_matrix = {}) {
    const nodes = [];
    if (!layout_matrix?.rows?.length) {
        return { nodes: [] };
    }

    const allNodesFlat = [];
    let minTime = Infinity;
    let maxTime = -Infinity;
    const Y_SPACING = 250;
    const X_PADDING = 50;
    const X_JITTER = 40; // Horizontal offset for overlapping nodes

    layout_matrix.rows.forEach((row, rowIndex) => {
        row.slices.forEach(slice => {
            slice.nodes.forEach(node => {
                const timestamp = new Date(node.time).getTime();
                if (timestamp < minTime) minTime = timestamp;
                if (timestamp > maxTime) maxTime = timestamp;
                allNodesFlat.push({
                    id: node.node_id,
                    name: node.name,
                    time: timestamp,
                    y: rowIndex * Y_SPACING,
                    x: 0 // Will be calculated later
                });
            });
        });
    });
    
    if (allNodesFlat.length === 0) return { nodes: [] };
    
    const timeRange = (maxTime - minTime) > 0 ? (maxTime - minTime) : 1;
    const VIRTUAL_WIDTH = allNodesFlat.length > 1 ? (allNodesFlat.length * 150) : 500;

    // Calculate initial X positions
    allNodesFlat.forEach(nodeInfo => {
        const xRatio = (nodeInfo.time - minTime) / timeRange;
        nodeInfo.x = X_PADDING + xRatio * (VIRTUAL_WIDTH - 2 * X_PADDING);
    });

    // Collision detection and avoidance
    const coordMap = new Map();
    allNodesFlat.forEach(nodeInfo => {
        const key = `${nodeInfo.x.toFixed(2)},${nodeInfo.y.toFixed(2)}`;
        if (!coordMap.has(key)) {
            coordMap.set(key, []);
        }
        coordMap.get(key).push(nodeInfo);
    });

    coordMap.forEach((collidingNodes) => {
        if (collidingNodes.length > 1) {
            const groupWidth = (collidingNodes.length - 1) * X_JITTER;
            const startX = collidingNodes[0].x - groupWidth / 2;
            collidingNodes.forEach((node, index) => {
                node.x = startX + index * X_JITTER;
            });
        }
    });

    // Final nodes list for ECharts
    allNodesFlat.forEach(nodeInfo => {
        nodes.push({
            id: String(nodeInfo.id),
            name: nodeInfo.name,
            x: nodeInfo.x,
            y: nodeInfo.y
        });
    });

    return { nodes };
}

/* ---------- Extract Links from Steps ---------- */
function linksFromSteps(steps = []) {
  const set = new Set();
  const links = [];
  steps.forEach(s => {
    const a = s?.from_node_id, b = s?.to_node_id;
    if (a && b) {
      const key = `${a}|${b}`;
      if (!set.has(key)) {
        set.add(key);
        links.push({source: String(a), target: String(b)});
      }
    }
  });
  return links;
}

/* ---------- Core: Render Trace Data ---------- */
function renderTrace(data) {
  if (!data) return false;

  // According to the new documentation, parse directly from layout_matrix and root-level edges field
  const { nodes } = parseLayoutMatrix(data.layout_matrix || {});

  // The new API prioritizes using the root-level `edges` field and converts keys
  let links;
  if (data.edges && data.edges.length > 0) {
    links = data.edges.map(e => ({ source: String(e.from), target: String(e.to) }));
  } else {
    // Retained for compatibility with old data or data without edges
    links = linksFromSteps(data.playback_steps || []);
  }
  
  if (!nodes || nodes.length === 0) {
    const errorMsg = "Error: Could not parse valid node layout from trace data.";
    console.error(errorMsg, "Received layout_matrix:", data.layout_matrix);
    alert(errorMsg);
    return false;
  }

  renderStatic(nodes, links);
  return true;
}

/* ---------- Initialize Chart ---------- */
async function initChart() {
  if (!chartRef.value) return;
  if (chart.value) chart.value.dispose();

  chart.value = echarts.init(chartRef.value);
  chart.value.on('click', handleNodeClick);
  chart.value.setOption({
    title: {text: 'Risk Propagation Path', left: 'center', top: 'top', textStyle: {color: '#fff'}},
    tooltip: {},
    series: [{
      type: 'graph',
      layout: 'none',
      data: [],
      links: [],
      roam: true,
      label: LABEL_STYLE,
      emphasis: {focus: 'adjacency', label: {position: 'right', show: true}},
      lineStyle: {color: 'source', curveness: 0.3}
    }]
  });

  // Initial single-point fallback: see the reporting node upon entering the page
  if (alertDetails.value) {
    const n = alertDetails.value.node || {};
    const singleId = alertDetails.value.node_id ?? n.id ?? alertDetails.value?.id ?? n?.node_id;
    if (singleId) {
      renderStatic([{id: String(singleId), name: n.name ?? String(singleId), x: 0, y: 0}], []);
    }
  }

  await nextTick();
  chart.value?.resize();
  isChartReady.value = true;

  if (!resizeObserver) resizeObserver = new ResizeObserver(() => chart.value?.resize?.());
  if (chartRef.value) resizeObserver.observe(chartRef.value);
}

/* ---------- Render Static Graph ---------- */
function renderStatic(nodes, links) {
  nodeList = nodes.map(n => ({
    id: n.id, name: n.name, x: n.x, y: n.y,
    symbolSize: DEFAULT_NODE.size,
    itemStyle: {color: DEFAULT_NODE.color},
    label: LABEL_STYLE
  }));
  linkList = links.map(l => ({
    source: String(l.source), target: String(l.target),
    lineStyle: {color: '#aaa', width: 2}
  }));
  nodeState = new Map(nodeList.map(n => [n.id, {color: DEFAULT_NODE.color, size: DEFAULT_NODE.size}]));

  chart.value?.setOption({
    series: [{
      type: 'graph',
      layout: 'none',
      data: nodeList,
      links: linkList,
      roam: true,
      label: LABEL_STYLE,
      emphasis: {focus: 'adjacency', label: {position: 'right', show: true}},
      lineStyle: {color: 'source', curveness: 0.3}
    }]
  }, {notMerge: true, lazyUpdate: false});
}

/* ---------- Animation Playback ---------- */
function playSteps(steps, source_node_id) {
  return new Promise((resolve) => {
    if (!steps?.length) {
      isPlaying.value = false;
      resolve();
      return;
    }

    let idx = 0;
    const apply = (id, color, size = 40) => {
      const s = nodeState.get(id);
      if (s) {
        s.color = color;
        s.size = size;
      }
    };
    const flush = () => {
      const data = nodeList.map(n => ({
        ...n,
        symbolSize: nodeState.get(n.id)?.size ?? n.symbolSize,
        itemStyle: {color: nodeState.get(n.id)?.color ?? n.itemStyle?.color}
      }));
      chart.value?.setOption({
        series: [{
          type: 'graph',
          layout: 'none',
          data,
          links: linkList,
          roam: true,
          label: LABEL_STYLE,
          emphasis: {focus: 'adjacency', label: {position: 'right', show: true}},
          lineStyle: {color: 'source', curveness: 0.3}
        }]
      }, {notMerge: true});
    };

    clearInterval(animationTimer);
    isPlaying.value = true;

    animationTimer = setInterval(() => {
      if (idx >= steps.length) {
        if (source_node_id) apply(String(source_node_id), COLORS.SOURCE, 50);
        flush();
        clearInterval(animationTimer);
        animationTimer = null;
        isPlaying.value = false;
        resolve(); // Resolve promise when animation ends
        return;
      }

      const step = steps[idx];
      const action = String(step.action || '').toLowerCase();

      if (action === 'inspect' || action === 'inspect_node') {
        if (step.node_id) apply(String(step.node_id), COLORS.YELLOW, 40);
      } else if (action === 'mark' || action === 'mark_node') {
        const state = String(step.state || '').toUpperCase();
        const c = state === 'GREEN' ? COLORS.GREEN : COLORS.RED;
        if (step.node_id) apply(String(step.node_id), c, 40);
      } else if (action === 'cutoff' || action === 'cut_off' || action === 'risk_cutoff') {
        (step.effects?.mark_green ?? step.effects?.markGreen ?? []).forEach(id => apply(String(id), COLORS.GREEN, 40));
        (step.effects?.mark_red ?? step.effects?.markRed ?? []).forEach(id => apply(String(id), COLORS.RED, 45));
      } else if (action === 'finalize' || action === 'finish' || action === 'end') {
        if (step.source_node_id) apply(String(step.source_node_id), COLORS.SOURCE, 50);
      }

      flush();
      idx += 1;
    }, 800);
  });
}

/* ---------- Click to Trace ---------- */
async function startTraceAndAnimation() {
  if (isPlaying.value) return;
  try {
    isPlaying.value = true;
    // Explicitly clear the chart to remove the initial placeholder node
    chart.value?.setOption({ series: [{ type: 'graph', data: [], links: [] }] }, { notMerge: true });
    
    const res = await runTrace({ alert_id: String(alertId.value) });
    if (!res) throw new Error('Trace API returned no response');
    traceData.value = res;

    if (renderTrace(res)) {
      await nextTick();
      await playSteps(res.playback_steps || [], res.source_node_id);
      
      // Animation is complete. User can now inspect the final graph state.
    }
  } catch (e) {
    console.error(e);
    alert(e?.message || String(e));
  } finally {
    isPlaying.value = false;
  }
}

/* ---------- Reset ---------- */
function resetAnimation() {
  clearInterval(animationTimer);
  animationTimer = null;
  isPlaying.value = false;

  if (traceData.value) {
    renderTrace(traceData.value);
  } else if (alertDetails.value) {
    const n = alertDetails.value.node || {};
    const singleId = alertDetails.value.node_id ?? n.id ?? alertDetails.value?.id ?? n?.node_id;
    if (singleId) renderStatic([{ id: String(singleId), name: n.name ?? String(singleId), x: 0, y: 0 }], []);
  }
}

/* ---------- Lifecycle ---------- */
onMounted(async () => {
  await loadInitialData();
  await nextTick();
  await initChart();

  if (traceData.value) {
    if (renderTrace(traceData.value)) {
        await nextTick();
        playSteps(traceData.value.playback_steps || [], traceData.value.source_node_id);
    }
  }

  if (!resizeObserver) resizeObserver = new ResizeObserver(() => chart.value?.resize?.());
  if (chartRef.value) resizeObserver.observe(chartRef.value);
});

onBeforeUnmount(() => {
  if (resizeObserver && chartRef.value) {
    try {
      resizeObserver.unobserve(chartRef.value);
    } catch {
    }
  }
  resizeObserver = null;
  clearInterval(animationTimer);
  animationTimer = null;
  chart.value?.dispose?.();
});
</script>

<style scoped>
.trace-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #081832;
  color: #fff;
}

.navbar {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background: #1e2a38;
  flex-shrink: 0;
}

.page-title {
  margin: 0 auto;
  font-size: 1.5em;
}

.nav-link {
  color: #4a90e2;
  text-decoration: none;
  font-size: 1em;
}

.status-message {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2em;
}

.error {
  color: #ff6b6b;
}

.trace-content-grid {
  flex-grow: 1;
  display: grid;
  grid-template-columns:350px 1fr;
  gap: 20px;
  padding: 20px;
  min-height: 0;
}

.left-panel, .right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
}

.panel {
  background: #1e2a38;
  border-radius: 6px;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.summary-panel {
  flex-shrink: 0;
}

.summary-description {
  font-size: 1.1em;
  color: #eee;
}

.alert-details-panel {
  flex-grow: 1;
  min-height: 0;
}

.details-content {
  flex-grow: 1;
  overflow-y: auto;
}

.animation-panel {
  flex-grow: 1;
  padding: 10px;
  min-height: 420px;
}

.panel-actions {
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid #3a4a5c;
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #3a4a5c;
  padding-bottom: 10px;
  flex-shrink: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns:auto 1fr;
  gap: 10px 15px;
  align-items: center;
}

.detail-grid strong {
  color: #aaa;
}

.detail-grid .full-width-detail {
  grid-column: 1 / -1;
  align-items: start;
}

.detail-grid p {
  margin: 0;
}

button {
  padding: 8px 15px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  background: #2f4f75;
  color: #fff;
}

button:disabled {
  background: #555;
  cursor: not-allowed;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #1e2a38;
  padding: 20px;
  border-radius: 8px;
  width: 500px;
  color: #fff;
  border: 1px solid #4a5a6c;
}

.modal-content .panel-actions {
  justify-content: flex-end;
}
</style>
