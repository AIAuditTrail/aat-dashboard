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
          <img src="/images/info_1.png" class="left text01_img" alt="总低风险警报图标"  />
          <div class="left text01_div">
            <p>总低风险警报数</p>
            <p>{{ lowRiskTotal }}</p>
          </div>
        </div>
        <div class="con_div_text01 right">
          <img src="/images/info_2.png" class="left text01_img" />
          <div class="left text01_div">
            <p>当月低风险警报数</p>
            <p>{{ lowRiskMonth }}</p>
          </div>
        </div>
      </div>
      <div class="con_div_text left">
        <div class="con_div_text01 left">
          <img src="/images/info_3.png" class="left text01_img" />
          <div class="left text01_div">
            <p>总中风险警报数</p>
            <p class="sky">{{ midRiskTotal }}</p>
          </div>
        </div>
        <div class="con_div_text01 right">
          <img src="/images/info_4.png" class="left text01_img" />
          <div class="left text01_div">
            <p>当月中风险警报数</p>
            <p class="sky">{{ midRiskMonth }}</p>
          </div>
        </div>
      </div>
      <div class="con_div_text left">
        <div class="con_div_text01 left">
          <img src="/images/info_5.png" class="left text01_img" />
          <div class="left text01_div">
            <p>总高风险警报数</p>
            <p class="org">{{ highRiskTotal }}</p>
          </div>
        </div>
        <div class="con_div_text01 right">
          <img src="/images/info_6.png" class="left text01_img" />
          <div class="left text01_div">
            <p>当月高风险警报数</p>
            <p class="org">{{ highRiskMonth }}</p>
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

const lowRiskTotal = computed(() => (props.stats?.alerts?.total_by_level['1'] || 0) + (props.stats?.alerts?.total_by_level['2'] || 0))
const lowRiskMonth = computed(() => (props.stats?.alerts?.month_by_level['1'] || 0) + (props.stats?.alerts?.month_by_level['2'] || 0))

const midRiskTotal = computed(() => props.stats?.alerts?.total_by_level['3'] || 0)
const midRiskMonth = computed(() => props.stats?.alerts?.month_by_level['3'] || 0)

const highRiskTotal = computed(() => (props.stats?.alerts?.total_by_level['4'] || 0) + (props.stats?.alerts?.total_by_level['5'] || 0))
const highRiskMonth = computed(() => (props.stats?.alerts?.month_by_level['4'] || 0) + (props.stats?.alerts?.month_by_level['5'] || 0))
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
