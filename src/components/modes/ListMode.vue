<!-- src/components/modes/ListMode.vue -->
<template>
  <div id="mapChart" style="width: 100%; height: 100%; overflow-y: auto; padding: 10px;">
    <div id="nodeListBox">
      <div
          v-for="node in nodes"
          :key="node.id"
          class="node-list-item"
          :style="{ padding: '10px', borderBottom: '1px solid #3a4a5c', cursor: 'pointer', color: 'white' }"
          @click="selectNode(node)"
      >
        <strong :style="{ color: getColorByRisk(node.risk) }">{{ node.name }}</strong><br/>
        <span :style="{ color: getColorByRisk(node.risk) }">
          风险等级：{{ node.risk }}　｜　位置：{{ node.geo }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {getNodes} from '@/api'

const riskColors = ['#00ff00', '#99cc00', '#ffff00', '#ff9900', '#ff0000']
const nodes = ref([])

// 风险值在 1~100 之间（或根据实际情况设置最大值）
function getColorByRisk(risk, min = 1, max = 100) {
  // 0（绿） → 120°，100（红） → 0°
  const hue = Math.max(0, 120 - ((risk - min) / (max - min)) * 120)
  return `hsl(${hue}, 100%, 50%)`
}

function selectNode(node) {
  const detailBox = document.getElementById('nodeDetailBox')
  if (detailBox) {
    detailBox.innerHTML = `
      <p><strong>名称：</strong>${node.name}</p>
      <p><strong>风险等级：</strong>${node.risk}</p>
      <p><strong>地理位置：</strong>${node.geo}</p>
      <p><strong>描述：</strong>${node.desc}</p>
    `
  }
}

onMounted(async () => {
  nodes.value = await getNodes()
})
</script>

<style scoped>
/* 可添加样式增强可读性 */
</style>