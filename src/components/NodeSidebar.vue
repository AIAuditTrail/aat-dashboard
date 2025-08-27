<template>
  <div class="div_any01 sidebar-container">
    <!-- 详情区域 -->
    <div class="div_any_child detail-section">
      <div class="div_any_title">{{ title }}</div>
      <div v-if="loading" class="sidebar-content">
        <div class="loading-skeleton"></div>
      </div>
      <div v-else-if="error" class="sidebar-content error-message">加载失败...</div>
      
      <div v-else-if="displayMode !== 'none'" class="sidebar-content details-grid">
        <template v-for="detail in details" :key="detail.label">
          <div class="detail-item" :class="{ 'description': detail.isDescription }">
            <span class="label">{{ detail.label }}:</span>
            <span class="value" :class="detail.class || ''">{{ detail.value }}</span>
          </div>
        </template>
        
        <div v-if="displayMode === 'node'" class="actions">
          <button class="action-btn" @click="showReportModal = true">上报风险</button>
          <button class="action-btn" @click="handleShowRiskList">风险列表</button>
          <button class="action-btn" @click="handleSecurityAudit">安全审计</button>
        </div>
      </div>
      
      <div v-else class="sidebar-content placeholder">
        <p>请在左侧选择一个节点或省份以查看详细信息。</p>
      </div>
    </div>

    <!-- 实时警报 -->
    <div class="div_any_child alert-section">
      <div class="div_any_title">实时警报</div>
      <div class="alert-container">
        <Vue3Marquee v-if="alerts.length > 0" :vertical="true" :clone="true" :duration="20">
          <div v-for="(alert, index) in alerts" :key="index" class="alert-line" :class="getAlertClass(alert)">
            {{ formatAlertMessage(alert) }}
          </div>
        </Vue3Marquee>
        <div v-else class="sidebar-content placeholder">
            <p>暂无实时警报。</p>
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

    <SecurityAuditModal
      :show="showSecurityAuditModal"
      :node-id="props.nodeId"
      :node-name="node?.name"
      @close="showSecurityAuditModal = false"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { getNodeDetails, createAlert, getAlerts } from '@/api'
import ReportRiskModal from './ReportRiskModal.vue'
import RiskListModal from './RiskListModal.vue' // Import the new modal
import SecurityAuditModal from './SecurityAuditModal.vue';
import { Vue3Marquee } from 'vue3-marquee'

const props = defineProps({
  nodeId: String,
  province: Object,
})

const node = ref(null)
const loading = ref(false)
const error = ref(null)
const showReportModal = ref(false)
const showRiskListModal = ref(false) // State for the new modal
const showSecurityAuditModal = ref(false)
const router = useRouter()
const alerts = ref([])
let pollingInterval = null

const levelClass = computed(() => {
    if (!node.value) return '';
    const level = node.value.effective_level;
    if (level === 5) return 'level-high';
    if (level === 4) return 'level-medium-high';
    if (level === 3) return 'level-medium';
    return 'level-low';
});

const displayMode = computed(() => {
  if (props.nodeId && node.value) return 'node';
  if (props.province) return 'province';
  return 'none';
})

const title = computed(() => {
  if (displayMode.value === 'node') return '节点详情'
  if (displayMode.value === 'province') return '省份详情'
  return '详情'
})

const provinceNameMap = {
    'Anhui': '安徽', 'Beijing': '北京', 'Chongqing': '重庆', 'Fujian': '福建', 'Gansu': '甘肃',
    'Guangdong': '广东', 'Guangxi': '广西', 'Guizhou': '贵州', 'Hainan': '海南', 'Hebei': '河北',
    'Heilongjiang': '黑龙江', 'Henan': '河南', 'Hubei': '湖北', 'Hunan': '湖南', 'Inner Mongolia': '内蒙古',
    'Jiangsu': '江苏', 'Jiangxi': '江西', 'Jilin': '吉林', 'Liaoning': '辽宁', 'Ningxia': '宁夏',
    'Qinghai': '青海', 'Shaanxi': '陕西', 'Shandong': '山东', 'Shanghai': '上海', 'Shanxi': '山西',
    'Sichuan': '四川', 'Tianjin': '天津', 'Tibet': '西藏', 'Xinjiang': '新疆', 'Yunnan': '云南', 'Zhejiang': '浙江'
};

const details = computed(() => {
  if (displayMode.value === 'node') {
    return [
      { label: '名称', value: node.value.name },
      { label: '风险等级', value: node.value.effective_level, class: `level ${levelClass.value}` },
      { label: '地理位置', value: node.value.province },
      { label: '描述', value: `这是节点 ${node.value.name} 的描述`, isDescription: true }
    ]
  }
  if (displayMode.value === 'province') {
    return [
      { label: '省份', value: provinceNameMap[props.province.province] || props.province.province },
      { label: '节点总数', value: props.province.total_nodes },
      { label: '高危节点', value: props.province.high_risk_nodes },
      { label: '已解决警报', value: props.province.resolved_alerts_count }
    ]
  }
  return []
})

const levelTextMap = { 5: '高危', 4: '较高', 3: '中危', 2: '较低', 1: '低危' }

const formatAlertMessage = (alert) => {
  const levelText = levelTextMap[alert.level] || '未知';
  const time = new Date(alert.created_at).toLocaleTimeString('it-IT');
  const nodeName = alert.node?.name || '未知节点';
  return `【${levelText}】节点 ${nodeName} 在 ${time} 检测到异常`;
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
    if(confirm(`风险上报成功! Alert ID: ${response.alert_id}\n\n是否立即跳转到溯源页面?`)) {
      router.push({ name: 'Trace', params: { alert_id: response.alert_id } });
    }
    await fetchAlerts();
  } catch (err) {
    alert('风险上报失败!');
  }
}

onMounted(() => {
    fetchAlerts();
    pollingInterval = setInterval(fetchAlerts, 5000);
});

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
.detail-section, .alert-section {
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
.level-high { background-color: #ff4e4e; }
.level-medium-high { background-color: #ff9900; }
.level-medium { background-color: #f4e562; color: #333; }
.level-low { background-color: #62f49c; color: #333; }
.actions { 
  margin-top: 20px; 
  display: flex;
  gap: 10px;
}
.action-btn { 
  flex: 1;
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
</style>
