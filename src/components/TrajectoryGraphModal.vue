<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="header-row">
        <h3 class="modal-title">
          Trajectory Graph: “{{ safeTitle }}”
          <span v-if="layoutMode==='dag'" class="layout-badge">DAG</span>
          <span v-else class="layout-badge">Force</span>
        </h3>
        <div class="header-actions">
          <button class="btn" @click="toggleLayout" :disabled="loading">
            Switch Layout: {{ layoutMode === 'dag' ? 'Force' : 'DAG' }}
          </button>
          <button class="btn" @click="refresh" :disabled="loading">Refresh</button>
        </div>
      </div>

      <div v-if="loading" class="status-placeholder">Loading graph...</div>
      <div v-else-if="error" class="status-placeholder error">Failed to load graph.</div>

      <div v-else class="graph-container">
        <div ref="chartRef" class="chart-area"></div>

        <div class="sidebar">
          <div class="actions-panel">
            <button @click="handleInjectAuditableRisk" :disabled="isActionInProgress">Inject Auditable Risk</button>
            <button @click="handleAudit" :disabled="isActionInProgress">Perform Content Audit</button>
          </div>

          <div v-if="selectedNode" class="details-panel">
            <h4>Node Details</h4>
            <div class="kv"><span>ID</span><code>{{ selectedNode.id }}</code></div>
            <div class="kv"><span>Name</span><code>{{ selectedNode.name }}</code></div>
            <div class="kv"><span>Type</span><code>{{ selectedNode.type || '—' }}</code></div>
            <div class="kv"><span>Risk Level</span><code
                :style="{color:getRiskColor(selectedNode.risk_level)}">{{ selectedNode.risk_level ?? '—' }}</code></div>
            <div class="kv"><span>In/Out Degree</span><code>{{ selectedNode.__inDegree ?? 0 }} /
              {{ selectedNode.__outDegree ?? 0 }}</code></div>
          </div>

          <div v-if="injectedNodeId" class="notice">
            Auditable risk has been injected into node <strong>{{ injectedNodeId }}</strong>.
          </div>

          <div class="legend">
            <h4>Legend</h4>
            <div class="legend-row"><i class="dot low"></i> Low</div>
            <div class="legend-row"><i class="dot mid"></i> Medium</div>
            <div class="legend-row"><i class="dot midhi"></i> Medium-High</div>
            <div class="legend-row"><i class="dot high"></i> High</div>
            <div class="legend-row"><i class="dot crit"></i> Critical</div>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, watch, onMounted, onBeforeUnmount, computed, nextTick} from 'vue';
import * as echarts from 'echarts';
import {getTrajectoryGraph, injectRiskToTrajectory, auditTrajectory, updateNodeOutput} from '@/api';

const props = defineProps({
  show: {type: Boolean, default: false},
  trajectoryId: {type: String, default: ''},
  trajectoryTitle: {type: String, default: ''},
});

const emit = defineEmits(['close']);

const chartRef = ref(null);
let chart = null;

const loading = ref(false);
const error = ref(null);
const isActionInProgress = ref(false);

const selectedNode = ref(null);
const injectedNodeId = ref(null);

const layoutMode = ref('dag'); // 'dag' | 'force'
const graphRaw = ref({nodes: [], edges: []});

const safeTitle = computed(() => props.trajectoryTitle || props.trajectoryId || 'Untitled');

const getRiskColor = (level) => {
  const colors = {
    1: '#62f49c',    // Low
    2: '#f4e562',    // Medium
    3: '#ff9900',    // Medium-High
    4: '#ff4e4e',    // High
    5: '#b30000',    // Critical
  };
  return colors[level] || '#b8c2cc';
};

/** 简单的拓扑分层 DAG 布局（Kahn + 最长路层数），将每层节点等间距排布 */
const buildDagLayout = (nodes, edges, padding = {x: 120, y: 100}) => {
  const id2node = new Map(nodes.map(n => [String(n.id), n]));
  const inDeg = new Map(nodes.map(n => [String(n.id), 0]));
  const outDeg = new Map(nodes.map(n => [String(n.id), 0]));
  const g = new Map(nodes.map(n => [String(n.id), []]));

  edges.forEach(e => {
    const u = String(e.from ?? e.source ?? e.u ?? e[0]);
    const v = String(e.to ?? e.target ?? e.v ?? e[1]);
    if (!g.has(u)) g.set(u, []);
    g.get(u).push(v);
    inDeg.set(v, (inDeg.get(v) ?? 0) + 1);
    outDeg.set(u, (outDeg.get(u) ?? 0) + 1);
  });

  nodes.forEach(n => {
    n.__inDegree = inDeg.get(String(n.id)) ?? 0;
    n.__outDegree = outDeg.get(String(n.id)) ?? 0;
  });

  // Kahn 拓扑 + 计算层次
  const queue = [];
  const level = new Map();
  nodes.forEach(n => {
    const id = String(n.id);
    if ((inDeg.get(id) ?? 0) === 0) {
      queue.push(id);
      level.set(id, 0);
    }
  });

  while (queue.length) {
    const u = queue.shift();
    const lu = level.get(u) ?? 0;
    (g.get(u) ?? []).forEach(v => {
      // 最长路径层
      level.set(v, Math.max(level.get(v) ?? 0, lu + 1));
      inDeg.set(v, (inDeg.get(v) ?? 0) - 1);
      if ((inDeg.get(v) ?? 0) === 0) queue.push(v);
    });
  }

  // 按层分组
  const layers = [];
  nodes.forEach(n => {
    const lv = level.get(String(n.id)) ?? 0;
    if (!layers[lv]) layers[lv] = [];
    layers[lv].push(n);
  });

  // 坐标分配（layout: 'none'）
  const layerWidth = padding.x * 2;
  const colGap = 220;
  const rowGapBase = padding.y;

  layers.forEach((arr, col) => {
    const rowGap = Math.max(rowGapBase, 90);
    arr.forEach((n, i) => {
      n.x = col * colGap + layerWidth;
      n.y = i * rowGap + rowGapBase;
      n.fixed = true; // 固定在该位置
    });
  });

  return nodes;
};

const buildForceOption = (nodes, edges) => {
  // 计算度数决定大小
  const deg = new Map(nodes.map(n => [String(n.id), 0]));
  edges.forEach(e => {
    const s = String(e.from ?? e.source);
    const t = String(e.to ?? e.target);
    deg.set(s, (deg.get(s) ?? 0) + 1);
    deg.set(t, (deg.get(t) ?? 0) + 1);
  });

  const data = nodes.map(n => {
    const d = Math.max(1, deg.get(String(n.id)) ?? 1);
    const risk = n.risk_level ?? 0;
    const size = Math.min(72, 28 + Math.sqrt(d) * 6 + (risk ? risk * 2 : 0));
    return {
      id: String(n.id),
      name: n.name || String(n.id),
      value: n.type || '',
      symbolSize: size,
      itemStyle: {color: getRiskColor(risk)},
      label: {
        show: true,
        formatter: n.name?.length > 16 ? n.name.slice(0, 15) + '…' : n.name || String(n.id),
        overflow: 'truncate',
        color: '#e5e7eb'
      },
      // 保留原始数据以供点击时展示
      ...n
    };
  });

  const links = edges.map(e => ({
    source: String(e.from ?? e.source),
    target: String(e.to ?? e.target),
    lineStyle: {curveness: 0.2},
  }));

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (p.dataType === 'node') {
          const d = p.data;
          return [
            `<div><strong>${d.name || d.id}</strong></div>`,
            `<div>ID: ${d.id}</div>`,
            `<div>Type: ${d.type ?? '—'}</div>`,
            `<div>Risk: <span style="color:${getRiskColor(d.risk_level)}">${d.risk_level ?? '—'}</span></div>`
          ].join('');
        }
        return '';
      }
    },
    toolbox: {
      show: true,
      feature: {
        restore: {show: true},
        saveAsImage: {show: true}
      },
      right: 10
    },
    animationDuration: 500,
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      data,
      links,
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: 10,
      force: {
        repulsion: 420,
        edgeLength: 120,
        gravity: 0.06
      },
      lineStyle: {color: '#9aa4af', width: 1.2, opacity: 0.9},
      emphasis: {focus: 'adjacency'},
      label: {fontSize: 12}
    }]
  };
};

const buildDagOption = (nodes, edges) => {
  const laid = buildDagLayout([...nodes], edges);
  const data = laid.map(n => {
    const risk = n.risk_level ?? 0;
    const size = Math.min(72, 28 + (n.__inDegree + n.__outDegree) * 4 + (risk ? risk * 2 : 0));
    return {
      id: String(n.id),
      name: n.name || String(n.id),
      value: n.type || '',
      x: n.x, y: n.y,
      fixed: true,
      symbolSize: size,
      itemStyle: {color: getRiskColor(risk)},
      label: {
        show: true,
        formatter: n.name?.length > 16 ? n.name.slice(0, 15) + '…' : n.name || String(n.id),
        overflow: 'truncate',
        color: '#e5e7eb'
      },
      ...n
    };
  });

  const links = edges.map(e => ({
    source: String(e.from ?? e.source),
    target: String(e.to ?? e.target),
    lineStyle: {curveness: 0.15},
  }));

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (p.dataType === 'node') {
          const d = p.data;
          return [
            `<div><strong>${d.name || d.id}</strong></div>`,
            `<div>ID: ${d.id}</div>`,
            `<div>Type: ${d.type ?? '—'}</div>`,
            `<div>Risk: <span style="color:${getRiskColor(d.risk_level)}">${d.risk_level ?? '—'}</span></div>`
          ].join('');
        }
        return '';
      }
    },
    toolbox: {
      show: true,
      feature: {
        restore: {show: true},
        saveAsImage: {show: true}
      },
      right: 10
    },
    animationDuration: 300,
    series: [{
      type: 'graph',
      layout: 'none',   // 使用我们计算的 x/y
      roam: true,
      draggable: false,
      data,
      links,
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: 10,
      lineStyle: {color: '#9aa4af', width: 1.2, opacity: 0.95},
      emphasis: {focus: 'adjacency'},
      label: {fontSize: 12}
    }]
  };
};

const renderChart = () => {
  if (!chartRef.value) return;
  if (chart) chart.dispose();
  chart = echarts.init(chartRef.value);

  const nodes = (graphRaw.value.nodes || []).map(n => ({
    id: String(n.id ?? n.node_id ?? n.name ?? Math.random().toString(36).slice(2)),
    name: n.name || String(n.id ?? n.node_id),
    type: n.type,
    risk_level: n.risk_level ?? n.riskLevel ?? n.runtime_level ?? 0,
  }));

  const edges = (graphRaw.value.edges || []).map(e => ({
    from: String(e.from ?? e.source ?? e.u ?? e[0]),
    to: String(e.to ?? e.target ?? e.v ?? e[1]),
  }));

  const option = layoutMode.value === 'dag'
      ? buildDagOption(nodes, edges)
      : buildForceOption(nodes, edges);

  chart.setOption(option);

  chart.off('click');
  chart.on('click', (params) => {
    if (params.dataType === 'node') {
      selectedNode.value = params.data;
    }
  });
};

const fetchDataAndRender = async () => {
  if (!props.trajectoryId) return;
  loading.value = true;
  error.value = null;
  selectedNode.value = null;
  injectedNodeId.value = null;
  try {
    const graphData = await getTrajectoryGraph(props.trajectoryId);
    graphRaw.value = {
      nodes: Array.isArray(graphData?.nodes) ? graphData.nodes : [],
      edges: Array.isArray(graphData?.edges) ? graphData.edges : [],
    };
    await nextTick();
    requestAnimationFrame(() => {
      if (chartRef.value) {
        renderChart();
      }
    });
  } catch (err) {
    console.error('[GraphModal] load error:', err);
    error.value = err;
  } finally {
    loading.value = false;
  }
};

const handleInjectAuditableRisk = async () => {
  isActionInProgress.value = true;
  try {
    // 找一个名字包含 Merger 的节点，若无则用出度最大的节点
    const all = (graphRaw.value.nodes || []);
    let target = all.find(n => (n.name || '').includes('Merger'));
    if (!target) {
      // 计算出度
      const out = new Map();
      (graphRaw.value.edges || []).forEach(e => {
        const u = String(e.from ?? e.source);
        out.set(u, (out.get(u) ?? 0) + 1);
      });
      target = all.map(n => ({n, d: out.get(String(n.id ?? n.node_id)) ?? 0}))
          .sort((a, b) => b.d - a.d)[0]?.n || all[0];
    }
    if (!target) {
      alert('No injectable node found in the trajectory.');
      return;
    }

    injectedNodeId.value = String(target.id ?? target.node_id);
    const payload = {output_content: "This report contains plagiarism and violates our policy."};
    await updateNodeOutput(props.trajectoryId, injectedNodeId.value, payload);
    await injectRiskToTrajectory(props.trajectoryId, {node_id: injectedNodeId.value, reason: 'Plagiarism suspected'});
  } catch (e) {
    console.error(e);
    alert('Injection failed, please check the console.');
  } finally {
    isActionInProgress.value = false;
  }
};

const handleAudit = async () => {
  isActionInProgress.value = true;
  try {
    await auditTrajectory(props.trajectoryId);
    setTimeout(() => fetchDataAndRender(), 500);
  } catch (e) {
    console.error(e);
    alert('Audit failed, please check the console.');
  } finally {
    isActionInProgress.value = false;
  }
};

const toggleLayout = async () => {
  layoutMode.value = layoutMode.value === 'dag' ? 'force' : 'dag';
  await nextTick();
  renderChart();
};

const refresh = async () => {
  await fetchDataAndRender();
};

const close = () => {
  emit('close');
};

const handleResize = () => {
  if (chart) chart.resize();
};

watch(() => props.show, async (v) => {
  if (v) {
    await fetchDataAndRender();
    window.addEventListener('resize', handleResize);
  } else {
    if (chart) {
      chart.dispose();
      chart = null;
    }
    window.removeEventListener('resize', handleResize);
  }
});

watch(() => props.trajectoryId, async (v) => {
  if (props.show && v) await fetchDataAndRender();
});

onMounted(() => {
  if (props.show && props.trajectoryId) fetchDataAndRender();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (chart) {
    chart.dispose();
    chart = null;
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 92vw;
  max-width: 1400px;
  height: 82vh;
  background: #1f2937;
  color: #e5e7eb;
  border: 1px solid #374151;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.layout-badge {
  margin-left: 8px;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #374151;
  color: #cbd5e1;
  border: 1px solid #4b5563;
}

.header-actions .btn {
  margin-left: 8px;
}

.graph-container {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 12px;
}

.chart-area {
  width: 100%;
  height: 100%;
  background: #111827;
  border: 1px solid #374151;
  border-radius: 8px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.actions-panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.actions-panel button {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #475569;
  background: #334155;
  color: #e2e8f0;
  cursor: pointer;
}

.actions-panel button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.details-panel, .legend, .notice {
  background: #111827;
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 10px;
}

.details-panel h4, .legend h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #cbd5e1;
}

.kv {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 3px 0;
}

.kv span {
  color: #9ca3af;
}

.kv code {
  color: #e5e7eb;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #cbd5e1;
  padding: 2px 0;
}

.legend-row .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.legend-row .dot.low {
  background: #62f49c;
}

.legend-row .dot.mid {
  background: #f4e562;
}

.legend-row .dot.midhi {
  background: #ff9900;
}

.legend-row .dot.high {
  background: #ff4e4e;
}

.legend-row .dot.crit {
  background: #b30000;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.btn, .btn-secondary {
  padding: 8px 12px;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn {
  background: #2563eb;
}

.btn-secondary {
  background: #3a4a5c;
}

.status-placeholder {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #aaa;
}

.error {
  color: #ff6b6b;
}
</style>
