<template>
  <div class="div_any01 sidebar-container">
    <!-- Details Section -->
    <div class="div_any_child detail-section">
      <div class="div_any_title">{{ title }}</div>
      <div v-if="loading" class="sidebar-content">
        <div class="loading-skeleton"></div>
      </div>
      <div v-else-if="error" class="sidebar-content error-message">Failed to load...</div>
      
      <div v-else-if="displayMode !== 'none'" class="sidebar-content">
        <div v-if="displayMode === 'trajectory' && trajectoryViewMode === 'riskList'" class="risk-node-list-container">
          <div v-if="isNodeListLoading" class="loading-skeleton" style="height: 100%;"></div>
          <div v-else-if="riskyNodes.length > 0" class="risk-node-list">
            <div
              v-for="node in riskyNodes"
              :key="node.node_id || node.id"
              class="risk-node-item"
              @click="$emit('node-selected', node.node_id || node.id)"
            >
              <span class="node-name">{{ node.name }}</span>
              <span class="node-risk" :style="{ color: getRiskColor(node.risk_level ?? node.runtime_level) }">
                Level {{ node.risk_level ?? node.runtime_level }}
              </span>
            </div>
          </div>
          <div v-else class="placeholder">
            <p>No risky nodes (level > 1) found in this trajectory.</p>
          </div>
        </div>
        <div v-else class="details-grid">
          <template v-for="detail in details" :key="detail.label">
            <div class="detail-item" :class="{ 'description': detail.isDescription }">
              <span class="label">{{ detail.label }}:</span>
              <span class="value" :class="detail.class || ''">{{ detail.value }}</span>
            </div>
          </template>
        </div>
        
        <div v-if="displayMode === 'node'" class="actions">
          <button class="action-btn" @click="showReportModal = true">Report Risk</button>
          <button class="action-btn" @click="handleShowRiskList">Risk List</button>
          <button class="action-btn" @click="handleContentAudit">Content Audit</button>
          <button class="action-btn" @click="handleSecurityAudit">Security Audit</button>
          <button class="action-btn" @click="handleUpdateContent">Update Content</button>
        </div>
        <div v-if="displayMode === 'trajectory'" class="actions">
          <button class="action-btn" @click="$emit('view-trajectory-graph', props.trajectory)">View Topology</button>
          <button class="action-btn" @click="handleTrajectoryAudit">
            {{ trajectoryViewMode === 'details' ? 'Audit' : 'Back to Details' }}
          </button>
        </div>
      </div>
      
      <div v-else class="sidebar-content placeholder">
        <p>Select a node, province, or trajectory to see details.</p>
      </div>
    </div>

    <!-- Real-time Alerts -->
    <div class="div_any_child alert-section">
      <div class="div_any_title">Real-time Alerts</div>
      <div class="alert-container">
        <Vue3Marquee v-if="alerts.length > 0" :vertical="true" :clone="true" :duration="20">
          <div v-for="(alert, index) in alerts" :key="index" class="alert-line" :class="getAlertClass(alert)">
            {{ formatAlertMessage(alert) }}
          </div>
        </Vue3Marquee>
        <div v-else class="sidebar-content placeholder">
            <p>No real-time alerts.</p>
        </div>
      </div>
    </div>
    
    <ReportRiskModal
      :show="showReportModal"
      :node-id="props.nodeId"
      :node-name="node?.name"
      @close="showReportModal = false"
      @submit="handleReportSubmit"
    />
    
    <RiskListModal
      :show="showRiskListModal"
      :node-id="props.nodeId"
      :node-name="node?.name"
      @close="showRiskListModal = false"
    />

    <ContentAuditModal
      :show="showContentAuditModal"
      :node-id="props.nodeId"
      :node-name="node?.name"
      :trajectory-id="selectedTrajectoryForAction?.id"
      @close="showContentAuditModal = false"
      @data-updated="$emit('data-updated')"
    />

    <SecurityAuditModal
      :show="showSecurityAuditModal"
      :node-id="props.nodeId"
      :node-name="node?.name"
      @close="showSecurityAuditModal = false"
    />
    <UpdateContentModal
      :show="showUpdateContentModal"
      :trajectory-id="selectedTrajectoryForAction?.id"
      :node-id="props.nodeId"
      :node-name="node?.name"
      @close="showUpdateContentModal = false"
      @content-updated="$emit('data-updated')"
    />
    <SelectTrajectoryModal
      :show="showSelectTrajectoryModal"
      :node-id="props.nodeId"
      @close="showSelectTrajectoryModal = false"
      @trajectory-selected="handleTrajectorySelectedForAction"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { getNodeDetails, createAlert, getAlerts, getTrajectoryGraph, auditTrajectory } from '@/api'
import ReportRiskModal from './ReportRiskModal.vue'
import RiskListModal from './RiskListModal.vue' // Import the new modal
import SecurityAuditModal from './SecurityAuditModal.vue';
import ContentAuditModal from './ContentAuditModal.vue';
import UpdateContentModal from './UpdateContentModal.vue';
import SelectTrajectoryModal from './SelectTrajectoryModal.vue';
import { Vue3Marquee } from 'vue3-marquee'

const trajectoryViewMode = ref('details');
const riskyNodes = ref([]);
const isNodeListLoading = ref(false);

// New state for trajectory selection flow
const showSelectTrajectoryModal = ref(false);
const actionToPerform = ref(''); // 'contentAudit' or 'updateContent'
const selectedTrajectoryForAction = ref(null);

const getRiskColor = (level) => {
  const colors = {
    1: '#62f49c', 2: '#f4e562', 3: '#ff9900', 4: '#ff4e4e', 5: '#b30000',
  };
  return colors[level] || '#b8c2cc';
};

const props = defineProps({
  nodeId: String,
  province: Object,
  trajectory: Object,
})

const emit = defineEmits(['data-updated', 'view-trajectory-graph', 'node-selected']);

const node = ref(null)
const loading = ref(false)
const error = ref(null)
const showReportModal = ref(false)
const showRiskListModal = ref(false) // State for the new modal
const showSecurityAuditModal = ref(false)
const showContentAuditModal = ref(false)
const showUpdateContentModal = ref(false)
const router = useRouter()
const alerts = ref([])
let pollingInterval = null

const levelClass = computed(() => {
    if (!node.value) return '';
    const risk = node.value.runtime_level || 0;
    if (risk > 0 && risk <= 5) return `level-${risk}`;
    return '';
});

const displayMode = computed(() => {
  if (props.nodeId && node.value) return 'node';
  if (props.province) return 'province';
  if (props.trajectory) return 'trajectory';
  return 'none';
})

const title = computed(() => {
  if (displayMode.value === 'node') return 'Node Details'
  if (displayMode.value === 'province') return 'Province Details'
  if (displayMode.value === 'trajectory') {
    return trajectoryViewMode.value === 'details' ? 'Trajectory Details' : 'Risk Nodes';
  }
  return 'Details'
})

const provinceNameMap = {
    'Anhui': 'Anhui', 'Beijing': 'Beijing', 'Chongqing': 'Chongqing', 'Fujian': 'Fujian', 'Gansu': 'Gansu',
    'Guangdong': 'Guangdong', 'Guangxi': 'Guangxi', 'Guizhou': 'Guizhou', 'Hainan': 'Hainan', 'Hebei': 'Hebei',
    'Heilongjiang': 'Heilongjiang', 'Henan': 'Henan', 'Hubei': 'Hubei', 'Hunan': 'Hunan', 'Inner Mongolia': 'Inner Mongolia',
    'Jiangsu': 'Jiangsu', 'Jiangxi': 'Jiangxi', 'Jilin': 'Jilin', 'Liaoning': 'Liaoning', 'Ningxia': 'Ningxia',
    'Qinghai': 'Qinghai', 'Shaanxi': 'Shaanxi', 'Shandong': 'Shandong', 'Shanghai': 'Shanghai', 'Shanxi': 'Shanxi',
    'Sichuan': 'Sichuan', 'Tianjin': 'Tianjin', 'Tibet': 'Tibet', 'Xinjiang': 'Xinjiang', 'Yunnan': 'Yunnan', 'Zhejiang': 'Zhejiang'
};

const details = computed(() => {
  if (displayMode.value === 'node') {
    const risk = node.value.runtime_level || 0;
    return [
      { label: 'Name', value: node.value.name },
      { label: 'Risk', value: risk, class: `level ${levelClass.value}` },
      { label: 'Location', value: node.value.province },
    ]
  }
  if (displayMode.value === 'province') {
    return [
      { label: 'Province', value: provinceNameMap[props.province.province] || props.province.province },
      { label: 'Total Nodes', value: props.province.total_nodes },
      { label: 'High-Risk Nodes', value: props.province.high_risk_nodes_count },
      { label: 'Resolved Alerts', value: props.province.resolved_alerts_count }
    ]
  }
  if (displayMode.value === 'trajectory') {
    return [
      { label: 'ID', value: props.trajectory.id },
      { label: 'Title', value: props.trajectory.title },
      { label: 'Transaction Count', value: props.trajectory.transaction_count },
      { label: 'Created At', value: new Date(props.trajectory.created_at).toLocaleString() },
    ]
  }
  return []
})

const levelTextMap = { 5: 'High', 4: 'Medium-High', 3: 'Medium', 2: 'Low', 1: 'Very Low' }

const formatAlertMessage = (alert) => {
  const levelText = levelTextMap[alert.level] || 'Unknown';
  const time = new Date(alert.created_at).toLocaleTimeString('en-US', { hour12: false });
  const nodeName = alert.node?.name || 'Unknown Node';
  return `[${levelText}] Anomaly detected at node ${nodeName} at ${time}`;
}

const getAlertClass = (alert) => {
    if (alert.level >= 4) return 'level-high';
    if (alert.level === 3) return 'level-medium';
    return 'level-low';
}

const fetchAlerts = async () => {
    try {
        const newAlerts = await getAlerts({ resolved: false, limit: 20 });
        alerts.value = newAlerts || [];
    } catch (err) {
        console.error("Failed to fetch alerts:", err);
        alerts.value = [];
    }
};

const handleShowRiskList = () => {
  showRiskListModal.value = true;
};

const handleSecurityAudit = () => {
  showSecurityAuditModal.value = true;
};

watch(() => props.nodeId, async (newNodeId) => {
  if (newNodeId) {
    try {
      loading.value = true;
      node.value = await getNodeDetails(newNodeId);
      error.value = null;
    } catch (err) {
      error.value = err;
      node.value = null;
    } finally {
      loading.value = false;
    }
  } else {
    node.value = null;
    error.value = null;
  }
}, { immediate: true })

const handleReportSubmit = async (payload) => {
  try {
    const response = await createAlert(payload);
    showReportModal.value = false;
    if(confirm(`Risk reported successfully! Alert ID: ${response.alert_id}\n\nProceed to trace page now?`)) {
      router.push({ name: 'Trace', params: { alert_id: response.alert_id } });
    }
    await fetchAlerts();
  } catch (err) {
    alert('Failed to report risk!');
  }
}

const handleContentAudit = () => {
  actionToPerform.value = 'contentAudit';
  showSelectTrajectoryModal.value = true;
};

const handleUpdateContent = () => {
  actionToPerform.value = 'updateContent';
  showSelectTrajectoryModal.value = true;
};

const handleTrajectorySelectedForAction = (trajectory) => {
  selectedTrajectoryForAction.value = trajectory;
  showSelectTrajectoryModal.value = false;

  if (actionToPerform.value === 'contentAudit') {
    showContentAuditModal.value = true;
  } else if (actionToPerform.value === 'updateContent') {
    showUpdateContentModal.value = true;
  }
};

onMounted(() => {
    fetchAlerts();
    pollingInterval = setInterval(fetchAlerts, 5000);
});

const handleTrajectoryAudit = async () => {
  if (trajectoryViewMode.value === 'details') {
    if (!props.trajectory?.id) return;
    isNodeListLoading.value = true;
    try {
      // Perform a comprehensive content audit on the trajectory first
      await auditTrajectory(props.trajectory.id);

      const graphData = await getTrajectoryGraph(props.trajectory.id);
      riskyNodes.value = (graphData.nodes || [])
        .filter(n => (n.risk_level ?? n.runtime_level ?? 0) > 1)
        .sort((a, b) => (b.risk_level ?? b.runtime_level ?? 0) - (a.risk_level ?? a.runtime_level ?? 0));
    } catch (e) {
      console.error("Failed to get trajectory nodes", e);
      riskyNodes.value = [];
    } finally {
      isNodeListLoading.value = false;
      trajectoryViewMode.value = 'riskList';
    }
  } else {
    trajectoryViewMode.value = 'details';
  }
};

watch(() => props.trajectory, () => {
  trajectoryViewMode.value = 'details';
  riskyNodes.value = [];
}, { deep: true });

onBeforeUnmount(() => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
});
</script>

<style scoped>
.sidebar-container { 
  display: flex;
  flex-direction: column;
  height: 100%;
}
.detail-section {
  flex: 2; /* Give more space to details */
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.alert-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.alert-section {
  margin-top: 20px;
}
.alert-container {
  flex-grow: 1;
  overflow: hidden;
  padding: 10px 0;
}
.sidebar-content { padding: 20px; color: #fff; }
.placeholder p { text-align: center; color: #888; }
.details-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
.detail-item { display: flex; justify-content: space-between; align-items: flex-start; }
.detail-item.description { flex-direction: column; align-items: flex-start; }
.label { color: #aaa; flex-shrink: 0; margin-right: 10px; }
.value { font-weight: bold; text-align: right; }
.level { padding: 2px 6px; border-radius: 4px; color: #fff; }
.level-1 { background-color: #62f49c; color: #333; }
.level-2 { background-color: #f4e562; color: #333; }
.level-3 { background-color: #ff9900; }
.level-4 { background-color: #ff4e4e; }
.level-5 { background-color: #b30000; }
.actions { 
  margin-top: 20px; 
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.action-btn { 
  width: 100%; 
  padding: 10px; 
  background-color: #2f4f75; 
  border: none; 
  color: #fff; 
  border-radius: 4px; 
  cursor: pointer; 
}
.loading-skeleton { height: 150px; background-color: #2a3a4a; animation: pulse 1.5s infinite; }

.alert-line {
  display: flex;
  justify-content: flex-start;
  width: 100%;
  padding: 4px 10px;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background-color: transparent !important;
  text-align: left;
}
.alert-line.level-high { color: #ff6b6b; }
.alert-line.level-medium { color: #f4e562; }
.alert-line.level-low { color: #62f49c; }

@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

.risk-node-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.risk-node-list {
  overflow-y: auto;
  flex-grow: 1;
}
.risk-node-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 5px;
  border-bottom: 1px solid #2a3a4a;
  cursor: pointer;
  transition: background-color 0.2s;
}
.risk-node-item:hover {
  background-color: #2a3a4a;
}
.risk-node-item .node-name {
  color: #e5e7eb;
}
.risk-node-item .node-risk {
  font-weight: bold;
}
</style>
