<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <h3 class="modal-title">对节点 "{{ nodeName }}" 进行安全审计</h3>

      <div v-if="loading" class="loading-placeholder">正在加载审计预览...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>

      <!-- Step 1: Audit Preview -->
      <div v-if="!auditResult && !loading" class="audit-preview">
        <div class="source-node-section">
          <h4>源节点</h4>
          <p><strong>{{ sourceNode?.name }}</strong> (当前风险等级: {{ sourceNode?.runtime_level }})</p>
          <p class="target-level-info">审计将把所有符合条件的邻居节点的风险等级提升至 <strong>{{ targetNeighborLevel }}</strong>。</p>
        </div>
        <div class="neighbors-section">
          <h4>邻居节点 ({{ neighbors.length }})</h4>
          <ul v-if="neighbors.length > 0" class="neighbor-list">
            <li v-for="neighbor in neighbors" :key="neighbor.id" class="neighbor-item">
              <span>{{ neighbor.name }}</span>
              <span :class="`level-text-${getRiskLevelClass(neighbor.effective_level)}`">
                (当前: {{ neighbor.effective_level }})
              </span>
              <span v-if="neighbor.effective_level < targetNeighborLevel" class="level-update-indicator">
                &rarr; {{ targetNeighborLevel }}
              </span>
            </li>
          </ul>
          <p v-else>该节点没有邻居。</p>
        </div>
      </div>

      <!-- Step 2: Audit Result -->
      <div v-if="auditResult" class="audit-result">
        <h4>审计完成</h4>
        <p class="summary-message">{{ auditResult.summary }}</p>
        <div v-if="auditResult.updated_neighbors.length > 0" class="neighbors-section">
          <h5>已更新的邻居</h5>
          <ul class="neighbor-list">
            <li v-for="neighbor in auditResult.updated_neighbors" :key="neighbor.node_id" class="neighbor-item updated">
              <span>{{ neighbor.name }}</span>
              <span>{{ neighbor.old_level }} &rarr; <strong>{{ neighbor.new_level }}</strong></span>
            </li>
          </ul>
        </div>
         <div v-if="auditResult.unchanged_neighbors.length > 0" class="neighbors-section">
          <h5>未改变的邻居</h5>
          <ul class="neighbor-list">
            <li v-for="neighbor in auditResult.unchanged_neighbors" :key="neighbor.node_id" class="neighbor-item unchanged">
              <span>{{ neighbor.name }}</span>
              <span>(等级 {{ neighbor.current_level }} &ge; {{ targetNeighborLevel }})</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="close">
          {{ auditResult ? '关闭' : '取消' }}
        </button>
        <button v-if="!auditResult" type="button" class="btn-primary" @click="executeAudit" :disabled="submitting">
          {{ submitting ? '审计中...' : '确认审计' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { getNodeDetails, getNeighbors, applyAudit } from '@/api';

const props = defineProps({
  show: Boolean,
  nodeId: String,
  nodeName: String,
});

const emit = defineEmits(['close']);

const loading = ref(false);
const submitting = ref(false);
const error = ref(null);
const sourceNode = ref(null);
const neighbors = ref([]);
const auditResult = ref(null);

const targetNeighborLevel = computed(() => {
  if (!sourceNode.value) return '-';
  return Math.max(1, sourceNode.value.runtime_level - 1);
});


const fetchAuditPreview = async () => {
  if (!props.nodeId) return;

  loading.value = true;
  error.value = null;
  sourceNode.value = null;
  neighbors.value = [];
  auditResult.value = null;

  try {
    const [nodeDetails, nodeNeighbors] = await Promise.all([
      getNodeDetails(props.nodeId),
      getNeighbors(props.nodeId),
    ]);

    if (!nodeDetails) {
      throw new Error("源节点未找到。");
    }

    sourceNode.value = nodeDetails;
    neighbors.value = nodeNeighbors || [];
  } catch (err) {
    console.error(`Failed to fetch audit preview for node ${props.nodeId}:`, err);
    error.value = err.message || "加载审计预览失败。";
  } finally {
    loading.value = false;
  }
};

const executeAudit = async () => {
  submitting.value = true;
  error.value = null;
  try {
    const result = await applyAudit({ source_node_id: props.nodeId });
    auditResult.value = result;
  } catch (err) {
     console.error(`Failed to apply audit for node ${props.nodeId}:`, err);
    error.value = err.message || "执行审计失败。";
  } finally {
    submitting.value = false;
  }
};

watch(() => props.show, (newVal) => {
  if (newVal) {
    fetchAuditPreview();
  } else {
    // Reset state when modal is hidden
    auditResult.value = null;
  }
});

const getRiskLevelClass = (level) => {
  if (level >= 4) return 'high';
  if (level === 3) return 'medium';
  return 'low';
};

const close = () => {
  emit('close');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex; justify-content: center; align-items: center; z-index: 1000;
}
.modal-content {
  background-color: #1e2a38; padding: 25px; border-radius: 8px;
  width: 500px; color: #fff; display: flex; flex-direction: column;
  max-height: 80vh;
}
.modal-title { margin-top: 0; margin-bottom: 20px; }

.audit-preview, .audit-result {
    overflow-y: auto;
    padding-right: 15px;
}

.source-node-section, .neighbors-section {
    background-color: #2a3a4a;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 15px;
}
.source-node-section h4, .neighbors-section h4, .neighbors-section h5 {
    margin-top: 0;
    margin-bottom: 10px;
    border-bottom: 1px solid #3a4a5c;
    padding-bottom: 8px;
}
.target-level-info {
    font-size: 0.9em;
    color: #a0c8ff;
    background-color: #2f4f75;
    padding: 8px;
    border-radius: 4px;
    margin-top: 10px;
}

.neighbor-list {
    list-style: none;
    padding: 0;
    margin: 0;
}
.neighbor-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #3a4a5c;
}
.neighbor-item:last-child {
    border-bottom: none;
}
.level-text-high { color: #ff6b6b; }
.level-text-medium { color: #f4e562; }
.level-text-low { color: #62f49c; }
.level-update-indicator {
    font-weight: bold;
    color: #62f49c;
}
.neighbor-item.updated { color: #62f49c; }
.neighbor-item.unchanged { color: #aaa; }


.summary-message {
    background-color: #2f4f75;
    padding: 12px;
    border-radius: 4px;
    font-weight: bold;
    margin-bottom: 20px;
}

.modal-actions {
  display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;
  border-top: 1px solid #3a4a5c;
  padding-top: 20px;
}
.btn-primary, .btn-secondary {
  padding: 8px 15px; border-radius: 4px; border: none; cursor: pointer;
}
.btn-primary { background-color: #2f4f75; color: #fff; }
.btn-secondary { background-color: #3a4a5c; color: #fff; }
.btn-primary:disabled { background-color: #555; cursor: not-allowed; }

.loading-placeholder, .error-message {
  text-align: center; padding: 40px 20px; color: #aaa;
}
.error-message { color: #ff6b6b; }
</style>
