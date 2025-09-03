<template>
  <div class="con_div">
    <div v-if="loading" class="loading-skeleton">
      <div v-for="i in 3" :key="i" class="con_div_text left">
        <div class="con_div_text01 left"><div class="skeleton-item"></div></div>
        <div class="con_div_text01 right"><div class="skeleton-item"></div></div>
      </div>
    </div>
    <template v-else-if="stats">
      <div class="con_div_text left">
        <div class="con_div_text01 left">
          <img src="/images/info_1.png" class="left text01_img" alt="总低风险节点图标"  />
          <div class="left text01_div">
            <p>总低风险节点数</p>
            <p>{{ lowRiskTotal }}</p>
          </div>
        </div>
        <div class="con_div_text01 right">
          <img src="/images/info_2.png" class="left text01_img" />
          <div class="left text01_div">
            <p>今日新增低风险</p>
            <p>{{ lowRiskToday }}</p>
          </div>
        </div>
      </div>
      <div class="con_div_text left">
        <div class="con_div_text01 left">
          <img src="/images/info_3.png" class="left text01_img" />
          <div class="left text01_div">
            <p>总中风险节点数</p>
            <p class="sky">{{ midRiskTotal }}</p>
          </div>
        </div>
        <div class="con_div_text01 right">
          <img src="/images/info_4.png" class="left text01_img" />
          <div class="left text01_div">
            <p>今日新增中风险</p>
            <p class="sky">{{ midRiskToday }}</p>
          </div>
        </div>
      </div>
      <div class="con_div_text left">
        <div class="con_div_text01 left">
          <img src="/images/info_5.png" class="left text01_img" />
          <div class="left text01_div">
            <p>总高风险节点数</p>
            <p class="org">{{ highRiskTotal }}</p>
          </div>
        </div>
        <div class="con_div_text01 right">
          <img src="/images/info_6.png" class="left text01_img" />
          <div class="left text01_div">
            <p>今日新增高风险</p>
            <p class="org">{{ highRiskToday }}</p>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="error-message">
      数据加载失败...
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stats: {
    type: Object,
    default: () => null
  },
  loading: {
    type: Boolean,
    default: true
  }
})

const LOW_RISK_THRESHOLD = 4; // Levels 1-4
const MID_RISK_THRESHOLD = 7; // Levels 5-7

const sumCountsByLevel = (data, thresholdFn) => {
  if (!data) return 0;
  return Object.entries(data).reduce((acc, [level, count]) => {
    if (thresholdFn(parseInt(level, 10))) {
      return acc + count;
    }
    return acc;
  }, 0);
};

const lowRiskTotal = computed(() => sumCountsByLevel(props.stats?.node_levels?.by_level, level => level <= LOW_RISK_THRESHOLD));
const lowRiskToday = computed(() => sumCountsByLevel(props.stats?.alerts?.today_by_level, level => level <= LOW_RISK_THRESHOLD));

const midRiskTotal = computed(() => sumCountsByLevel(props.stats?.node_levels?.by_level, level => level > LOW_RISK_THRESHOLD && level <= MID_RISK_THRESHOLD));
const midRiskToday = computed(() => sumCountsByLevel(props.stats?.alerts?.today_by_level, level => level > LOW_RISK_THRESHOLD && level <= MID_RISK_THRESHOLD));

const highRiskTotal = computed(() => sumCountsByLevel(props.stats?.node_levels?.by_level, level => level > MID_RISK_THRESHOLD));
const highRiskToday = computed(() => sumCountsByLevel(props.stats?.alerts?.today_by_level, level => level > MID_RISK_THRESHOLD));
</script>

<style scoped>
/* 样式由 common.css 提供，无需重复写 */
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
