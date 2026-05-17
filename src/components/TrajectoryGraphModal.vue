<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h3>轨迹拓扑：{{ safeTitle }}</h3>
          <p>Trajectory ID：<code>{{ trajectoryId || '待接轨迹编号' }}</code></p>
        </div>
        <div class="header-actions">
          <button class="btn" @click="toggleLayout" :disabled="loading">{{ layoutMode === 'dag' ? '力导布局' : '分层布局' }}</button>
          <button class="btn" @click="fetchData" :disabled="loading">刷新</button>
        </div>
      </div>

      <div v-if="error" class="status-placeholder error">轨迹图加载失败。</div>
      <div v-else class="graph-layout">
        <div v-if="loading" class="loading-mask">正在加载轨迹图...</div>
        <div ref="chartRef" class="chart-area"></div>
        <aside class="detail-panel">
          <div class="panel-block">
            <h4>审计对象</h4>
            <div class="kv"><span>轨迹标题</span><code>{{ safeTitle }}</code></div>
            <div class="kv"><span>Trajectory ID</span><code>{{ trajectoryId || '待接轨迹编号' }}</code></div>
            <div class="kv"><span>节点数量</span><code>{{ graphRaw.nodes.length }}</code></div>
            <div class="kv"><span>交互边数</span><code>{{ graphRaw.edges.length }}</code></div>
          </div>

          <div v-if="selectedNode" class="panel-block">
            <h4>智能体身份档案</h4>
            <div class="kv"><span>名称</span><code>{{ selectedNode.name }}</code></div>
            <div class="kv"><span>DID</span><code>{{ identity.did }}</code></div>
            <div class="kv"><span>VC 状态</span><code>{{ identity.vcStatus }}</code></div>
            <div class="kv"><span>责任主体</span><code>{{ identity.owner }}</code></div>
            <div class="kv"><span>能力范围</span><code>{{ identity.capability }}</code></div>
          </div>

          <div v-else-if="selectedEvidence" class="panel-block">
            <h4>交互证据摘要</h4>
            <div class="kv"><span>调用方</span><code>{{ selectedEvidence.caller }}</code></div>
            <div class="kv"><span>被调用方</span><code>{{ selectedEvidence.callee }}</code></div>
            <div class="kv"><span>交互类型</span><code>{{ selectedEvidence.actionType }}</code></div>
            <div class="kv"><span>证据哈希</span><code>{{ selectedEvidence.interactionHash }}</code></div>
            <div class="kv"><span>时间戳</span><code>{{ selectedEvidence.timestamp }}</code></div>
            <p class="note">{{ selectedEvidence.status }}</p>
          </div>
        </aside>
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { getTrajectoryGraph } from '@/api';
import { buildEvidenceRecord, buildIdentityProfile } from '@/utils/auditDisplay';

const props = defineProps({
  show: { type: Boolean, default: false },
  trajectoryId: { type: String, default: '' },
  trajectoryTitle: { type: String, default: '' },
});

const emit = defineEmits(['close']);

const chartRef = ref(null);
const graphRaw = ref({ nodes: [], edges: [] });
const selectedNode = ref(null);
const selectedEvidence = ref(null);
const loading = ref(false);
const error = ref(null);
const layoutMode = ref('dag');
let chart = null;

const safeTitle = computed(() => props.trajectoryTitle || '未命名轨迹');
const identity = computed(() => buildIdentityProfile(selectedNode.value || {}));

function getRiskColor(level) {
  const risk = Number(level || 0);
  if (risk >= 9) return '#b30000';
  if (risk >= 7) return '#ff4e4e';
  if (risk >= 5) return '#ff9900';
  if (risk >= 3) return '#f4e562';
  return '#62f49c';
}

function normalize() {
  const nodes = (graphRaw.value.nodes || []).map((node) => {
    const risk = (node.static_level ?? 0) + (node.runtime_level ?? node.risk_level ?? 0);
    return {
      id: String(node.id ?? node.node_id ?? node.name),
      name: node.name || String(node.id ?? node.node_id),
      risk,
      symbolSize: Math.min(68, 30 + risk * 4),
      itemStyle: { color: getRiskColor(risk) },
      label: {
        show: true,
        color: '#fff',
        position: 'bottom',
        formatter: ({ name }) => name && name.length > 14 ? `${name.slice(0, 13)}...` : name,
      },
      raw: node,
    };
  });
  const edges = (graphRaw.value.edges || []).map((edge, index) => ({
    source: String(edge.from ?? edge.source ?? edge.u ?? edge[0]),
    target: String(edge.to ?? edge.target ?? edge.v ?? edge[1]),
    evidence: buildEvidenceRecord(edge, props.trajectoryId, index),
    lineStyle: { color: '#9aa4af', width: 1.5, curveness: 0.12 },
  }));
  return { nodes, edges };
}

function applyDagLayout(nodes, edges) {
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const graph = new Map(nodes.map((node) => [node.id, []]));
  edges.forEach((edge) => {
    graph.get(edge.source)?.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
  });

  const queue = nodes.filter((node) => (indegree.get(node.id) || 0) === 0).map((node) => node.id);
  const level = new Map(queue.map((id) => [id, 0]));
  while (queue.length) {
    const id = queue.shift();
    for (const next of graph.get(id) || []) {
      level.set(next, Math.max(level.get(next) || 0, (level.get(id) || 0) + 1));
      indegree.set(next, (indegree.get(next) || 0) - 1);
      if ((indegree.get(next) || 0) === 0) queue.push(next);
    }
  }

  const layers = new Map();
  nodes.forEach((node) => {
    const key = level.get(node.id) || 0;
    if (!layers.has(key)) layers.set(key, []);
    layers.get(key).push(node);
  });
  for (const [col, layerNodes] of layers) {
    layerNodes.forEach((node, row) => {
      node.x = 120 + col * 210;
      node.y = 90 + row * 120 + (col % 2) * 80;
      node.fixed = true;
    });
  }
  return nodes;
}

function renderChart() {
  if (!chartRef.value) return;
  const { nodes, edges } = normalize();
  if (chart) {
    chart.dispose();
  }
  chart = echarts.init(chartRef.value);
  const data = layoutMode.value === 'dag' ? applyDagLayout(nodes, edges) : nodes;
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    series: [{
      type: 'graph',
      layout: layoutMode.value === 'dag' ? 'none' : 'force',
      roam: true,
      draggable: layoutMode.value !== 'dag',
      data,
      links: edges,
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: 8,
      force: { repulsion: 360, edgeLength: 120, gravity: 0.06 },
      emphasis: { focus: 'adjacency' },
    }]
  }, true);
  chart.off('click');
  chart.on('click', (params) => {
    if (params.dataType === 'node') {
      selectedEvidence.value = null;
      selectedNode.value = { ...params.data.raw, id: params.data.id, name: params.data.name, risk_level: params.data.risk };
    } else if (params.dataType === 'edge') {
      selectedNode.value = null;
      selectedEvidence.value = params.data.evidence;
    }
  });
}

async function fetchData() {
  if (!props.trajectoryId) return;
  loading.value = true;
  error.value = null;
  selectedNode.value = null;
  selectedEvidence.value = null;
  try {
    const data = await getTrajectoryGraph(props.trajectoryId);
    graphRaw.value = {
      nodes: Array.isArray(data?.nodes) ? data.nodes : [],
      edges: Array.isArray(data?.edges) ? data.edges : [],
    };
    loading.value = false;
    await nextTick();
    renderChart();
  } catch (err) {
    console.error('Failed to load trajectory graph:', err);
    error.value = err;
    loading.value = false;
  }
}

function toggleLayout() {
  layoutMode.value = layoutMode.value === 'dag' ? 'force' : 'dag';
  renderChart();
}

function close() {
  emit('close');
}

watch(() => props.show, async (visible) => {
  if (visible) {
    await nextTick();
    fetchData();
  } else if (chart) {
    chart.dispose();
    chart = null;
  }
});

onBeforeUnmount(() => {
  chart?.dispose();
  chart = null;
});
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.72);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal-content {
  width: min(1180px, 94vw);
  height: min(760px, 88vh);
  background: #1e2a38;
  color: #fff;
  border-radius: 8px;
  border: 1px solid #3a4a5c;
  display: flex;
  flex-direction: column;
  padding: 18px;
}
.modal-header, .modal-actions {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  flex-shrink: 0;
}
.modal-header h3 { margin: 0 0 6px; }
.modal-header p { margin: 0; color: #9ca3af; }
code { color: #a0c8ff; word-break: break-all; }
.header-actions, .modal-actions { gap: 10px; }
.graph-layout {
  position: relative;
  flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 320px; gap: 14px; margin-top: 14px;
}
.loading-mask {
  position: absolute;
  inset: 0 334px 0 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 31, 45, 0.78);
  color: #d7e7f7;
  border-radius: 6px;
}
.chart-area {
  min-height: 0;
  background: #0f1f2d;
  border: 1px solid #3a4a5c;
  border-radius: 6px;
}
.detail-panel { min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.panel-block {
  background: #0f1f2d;
  border: 1px solid #3a4a5c;
  border-radius: 6px;
  padding: 12px;
}
.panel-block h4 { margin: 0 0 10px; color: #e5e7eb; }
.panel-block p { margin: 0; color: #b8c2cc; line-height: 1.5; }
.kv { display: grid; grid-template-columns: 76px 1fr; gap: 8px; align-items: start; margin-bottom: 8px; }
.kv span { color: #9ca3af; }
.note { margin-top: 10px !important; color: #f4e562 !important; font-size: 12px; }
.btn, .btn-secondary {
  padding: 8px 14px; border: none; border-radius: 4px; cursor: pointer; color: #fff;
}
.btn { background: #2f4f75; }
.btn-secondary { background: #3a4a5c; margin-left: auto; }
.status-placeholder { flex: 1; display: flex; align-items: center; justify-content: center; color: #aaa; }
.error { color: #ff6b6b; }
</style>
