<template>
  <div class="right div_any01">
    <!-- 详情区域 -->
    <div class="div_any_child">
      <div class="div_any_title">详情</div>
      <div id="nodeDetailBox" style="padding: 20px; color: white;"></div>
    </div>

    <!-- 实时警报 -->
    <div class="div_any_child" style="margin-top: 10px;">
      <div class="div_any_title" style="margin-bottom: 12px;">实时警报</div>
      <div class="alert-container">
        <Vue3Marquee
            :vertical="true"
            :clone="true"
            :loop="0"
            :pause-on-hover="true"
            :duration="scrollDuration"
            class="alert-box"
        >
          <div
              v-for="(alert, index) in alerts"
              :key="index"
              class="alert-line"
          >
            {{ alert }}
          </div>
        </Vue3Marquee>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Vue3Marquee } from 'vue3-marquee'
import { getAlerts } from "@/api/index.js"

const alerts = ref([
  // 初始占位数据，可选
  '【加载中】正在获取最新警报数据...'
])

// 设置滚动速度，根据数量调整
const scrollDuration = computed(() => {
  const base = 12
  const min = 6
  const max = 20
  const t = 20 - alerts.value.length
  return Math.min(max, Math.max(min, base + t * 0.5))
})

// 每10秒新增一条模拟数据
function startAlertAppend() {
  setInterval(() => {
    const now = new Date()
    const timeStr = now.toLocaleTimeString()
    const fakeId = Math.floor(Math.random() * 30) + 1
    // const newAlert = `【模拟警报】节点 ${fakeId} 于 ${timeStr} 触发未知异常行为`
    // alerts.value.push(newAlert)
    if (alerts.value.length > 20) alerts.value.shift()
  }, 10000)
}

onMounted(async () => {
  try {
    const baseAlerts = await getAlerts()
    alerts.value = baseAlerts
  } catch (e) {
    alerts.value = ['⚠️ 获取警报数据失败，请检查网络或接口']
    console.error('获取警报数据失败', e)
  }

  startAlertAppend()
})
</script>

<style scoped>
.alert-container {
  height: 300px;
  overflow: hidden;
  background: #0f1f2d;
  border: 1px solid #3a4a5c;
  padding: 10px;
  box-sizing: border-box;
  width: 90%;
  margin: 20px auto 0 auto;
  border-radius: 6px;
}

.alert-box {
  font-size: 14px;
  display: flex;
  flex-direction: column;
}

.alert-line {
  height: 28px;
  line-height: 28px;
  white-space: nowrap;
  color: #ff6666;
  text-align: left; /* 明确左对齐 */
  width: 100%;
}
</style>