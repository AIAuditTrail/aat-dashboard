<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <!-- Title changes based on view -->
      <h3 class="modal-title">{{ currentView === 'list' ? `节点 "${nodeName}" 的风险列表` : '风险详情' }}</h3>
      
      <div v-if="loading" class="loading-placeholder">正在加载...</div>
      <div v-else-if="error" class="error-message">加载失败。</div>
      <div v-else-if="alerts.length === 0 && currentView === 'list'" class="empty-state">该节点暂无风险记录。</div>
      
      <!-- Main Content Area -->
      <div v-else class="content-container">
        <!-- Risk List View -->
        <div v-if="currentView === 'list'">
          <ul class="risk-list">
            <li v-for="alert in alerts" :key="alert.id" class="risk-item" @click="selectAlert(alert)">
              <span class="level-indicator" :class="`level-${alert.level}`">Lv.{{ alert.level }}</span>
              <span class="description">{{ alert.description }}</span>
              <span class="view-details">查看详情 &rarr;</span>
            </li>
          </ul>
        </div>

        <!-- Risk Detail View -->
        <div v-else-if="currentView === 'detail' && selectedAlert" class="risk-detail">
            <div class="detail-grid">
                <div class="detail-row"><strong>ID:</strong> <span>{{ selectedAlert.id }}</span></div>
                <div class="detail-row"><strong>风险等级:</strong> <span class="level-indicator" :class="`level-${selectedAlert.level}`">{{ selectedAlert.level }}</span></div>
                <div class="detail-row"><strong>状态:</strong> <span>{{ selectedAlert.status }}</span></div>
                <div class="detail-row"><strong>创建时间:</strong> <span>{{ new Date(selectedAlert.created_at).toLocaleString() }}</span></div>
                <div class="detail-row full-width"><strong>描述:</strong> <p>{{ selectedAlert.description }}</p></div>
            </div>
            <div class="detail-actions">
              <button type="button" class="btn-primary" @click="goToTrace(selectedAlert.id, 'alert')">发起新溯源</button>
            </div>
            
            <div v-if="selectedAlert.traceRuns && selectedAlert.traceRuns.length > 0" class="trace-runs-section">
              <h4>历史溯源记录</h4>
              <ul class="trace-run-list">
                <li v-for="run in selectedAlert.traceRuns" :key="run.id" class="trace-run-item">
                  <span>{{ new Date(run.computed_at).toLocaleString() }}</span>
                  <button class="btn-secondary" @click="goToTrace(run.id, 'trace')">回放</button>
                </li>
              </ul>
            </div>
        </div>
      </div>
      
      <!-- Footer Actions -->
      <div class="modal-actions">
        <button v-if="currentView === 'detail'" type="button" class="btn-secondary" @click="backToList">&larr; 返回列表</button>
        <button type="button" class="btn-secondary" @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getAlerts } from '@/api';

const props = defineProps({
  show: Boolean,
  nodeId: String,
  nodeName: String,
});

const emit = defineEmits(['close']);
const router = useRouter();

const alerts = ref([]);
const selectedAlert = ref(null);
const loading = ref(false);
const error = ref(null);
const currentView = ref('list'); // 'list' or 'detail'

const fetchAlertsForNode = async (nodeId) => {
  if (!nodeId) return;
  loading.value = true;
  error.value = null;
  try {
    const fetchedAlerts = await getAlerts({ node_id: nodeId, limit: 100 });
    alerts.value = fetchedAlerts || [];
  } catch (err) {
    console.error(`Failed to fetch alerts for node ${nodeId}:`, err);
    error.value = err;
  } finally {
    loading.value = false;
  }
};

watch(() => props.show, (newVal) => {
  if (newVal && props.nodeId) {
    fetchAlertsForNode(props.nodeId);
  } else {
    alerts.value = [];
    selectedAlert.value = null;
    error.value = null;
    currentView.value = 'list';
  }
});

const selectAlert = (alert) => {
  selectedAlert.value = alert;
  currentView.value = 'detail';
};

const backToList = () => {
  selectedAlert.value = null;
  currentView.value = 'list';
};

const goToTrace = (id, type) => {
  close(); // Close the modal before navigating
  if (type === 'alert') {
    router.push({ name: 'Trace', params: { alert_id: id } });
  } else {
    router.push({ name: 'Trace', query: { trace_run_id: id } });
  }
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
  width: 600px; color: #fff; display: flex; flex-direction: column;
}
.modal-title { margin-top: 0; margin-bottom: 20px; }
.content-container { max-height: 400px; overflow-y: auto; }
.risk-list { list-style: none; padding: 0; margin: 0; }
.risk-item {
  background-color: #2a3a4a;
  padding: 10px 15px;
  margin-bottom: 10px;
  border-radius: 4px;
  cursor: pointer;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 15px;
  align-items: center;
  transition: background-color 0.2s;
}
.risk-item:hover { background-color: #3a4a5a; }
.level-indicator { font-weight: bold; }
.level-5, .level-4 { color: #ff6b6b; }
.level-3 { color: #f4e562; }
.level-2, .level-1 { color: #62f49c; }
.description { text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
.view-details { color: #4a90e2; font-size: 0.9em; }
.risk-detail .detail-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px 20px;
    align-items: center;
}
.risk-detail .detail-row.full-width { grid-column: 1 / -1; }
.risk-detail p { margin: 5px 0 0; }
.detail-actions { margin-top: 20px; }
.trace-runs-section { margin-top: 20px; border-top: 1px solid #3a4a5c; padding-top: 15px; }
.trace-runs-section h4 { margin-top: 0; margin-bottom: 10px; }
.trace-run-list { list-style: none; padding: 0; margin: 0; }
.trace-run-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #3a4a5c; }
.trace-run-item:last-child { border-bottom: none; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-primary, .btn-secondary {
  padding: 8px 15px; border-radius: 4px; border: none; cursor: pointer;
}
.btn-primary { background-color: #2f4f75; color: #fff; }
.btn-secondary { background-color: #3a4a5c; color: #fff; }
.loading-placeholder, .error-message, .empty-state {
  text-align: center; padding: 40px 20px; color: #aaa;
}
</style>
