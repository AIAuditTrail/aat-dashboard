<template>
  <div class="con_div">
    <div v-if="loading" class="loading-skeleton">
      <div v-for="i in 3" :key="i" class="con_div_text left">
        <div class="con_div_text01 left"><div class="skeleton-item"></div></div>
        <div class="con_div_text01 right"><div class="skeleton-item"></div></div>
      </div>
    </div>
    <template v-else-if="nodes">
      <div class="con_div_text left">
        <div class="con_div_text01 left">
          <img src="/images/info_1.png" class="left text01_img" alt="Total Low-Risk Nodes"  />
          <div class="left text01_div">
            <p>Total Low-Risk Nodes</p>
            <p>{{ lowRiskTotal }}</p>
          </div>
        </div>
        <div class="con_div_text01 right">
          <img src="/images/info_2.png" class="left text01_img" />
          <div class="left text01_div">
            <p>New Low-Risk Alerts Today</p>
            <p>{{ lowRiskToday }}</p>
          </div>
        </div>
      </div>
      <div class="con_div_text left">
        <div class="con_div_text01 left">
          <img src="/images/info_3.png" class="left text01_img" />
          <div class="left text01_div">
            <p>Total Mid-Risk Nodes</p>
            <p class="sky">{{ midRiskTotal }}</p>
          </div>
        </div>
        <div class="con_div_text01 right">
          <img src="/images/info_4.png" class="left text01_img" />
          <div class="left text01_div">
            <p>New Mid-Risk Alerts Today</p>
            <p class="sky">{{ midRiskToday }}</p>
          </div>
        </div>
      </div>
      <div class="con_div_text left">
        <div class="con_div_text01 left">
          <img src="/images/info_5.png" class="left text01_img" />
          <div class="left text01_div">
            <p>Total High-Risk Nodes</p>
            <p class="org">{{ highRiskTotal }}</p>
          </div>
        </div>
        <div class="con_div_text01 right">
          <img src="/images/info_6.png" class="left text01_img" />
          <div class="left text01_div">
            <p>New High-Risk Alerts Today</p>
            <p class="org">{{ highRiskToday }}</p>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="error-message">
      Failed to load data...
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  nodes: {
    type: Array,
    default: () => []
  },
  alerts: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: true
  }
})

const LOW_RISK_THRESHOLD = 2; // Levels 1-2
const MID_RISK_THRESHOLD = 3; // Level 3

const getNodesByRisk = (riskFn) => {
  if (!props.nodes) return 0;
  return props.nodes.filter(node => riskFn(node.runtime_level || 0)).length;
}

const getAlertsByRisk = (riskFn) => {
  if (!props.alerts) return 0;
  // Assuming alert level is consistent with node runtime_level
  return props.alerts.filter(alert => riskFn(alert.level || 0)).length;
}

const lowRiskTotal = computed(() => getNodesByRisk(level => level > 0 && level <= LOW_RISK_THRESHOLD));
const midRiskTotal = computed(() => getNodesByRisk(level => level === MID_RISK_THRESHOLD));
const highRiskTotal = computed(() => getNodesByRisk(level => level > MID_RISK_THRESHOLD));

// Assuming we only want to count today's alerts. Since we don't have that info directly,
// we will count all unresolved alerts as "today's alerts" for now.
const lowRiskToday = computed(() => getAlertsByRisk(level => level > 0 && level <= LOW_RISK_THRESHOLD));
const midRiskToday = computed(() => getAlertsByRisk(level => level === MID_RISK_THRESHOLD));
const highRiskToday = computed(() => getAlertsByRisk(level => level > MID_RISK_THRESHOLD));
</script>

<style scoped>
/* Styles are provided by common.css, no need to duplicate */
.loading-skeleton {
  width: 100%;
  display: flex;
}
.skeleton-item {
  width: 150px;
  height: 60px;
  background-color: #2a3a4a;
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;
}
.error-message {
  color: #ff6b6b;
  text-align: center;
  width: 100%;
  padding: 20px;
}
@keyframes pulse {
  0% { background-color: #2a3a4a; }
  50% { background-color: #3a4a5a; }
  100% { background-color: #2a3a4a; }
}
</style>
