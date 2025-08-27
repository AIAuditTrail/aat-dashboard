<template>
  <div class="list-mode-container">
    <div v-if="loading" class="loading-skeleton">
      <div v-for="i in 10" :key="i" class="skeleton-row"></div>
    </div>
    <div v-else-if="error" class="error-message">
      节点列表加载失败...
    </div>
    <table v-else class="nodes-table">
      <thead>
        <tr>
          <th>节点名</th>
          <th>风险等级</th>
          <th>地理位置</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="node in sortedNodes"
          :key="node.id"
          :class="['node-row', getRowClass(node.effective_level)]"
          @click="onNodeSelect(node)"
        >
          <td>{{ node.name }}</td>
          <td>
            <span class="level-indicator">{{ node.effective_level }}</span>
          </td>
          <td>{{ node.province }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  nodes: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: true
  },
  error: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['node-selected'])

const sortedNodes = computed(() => {
  return [...props.nodes].sort((a, b) => {
    return b.effective_level - a.effective_level || a.name.localeCompare(b.name)
  })
})

const getRowClass = (level) => {
  if (level === 5) return 'level-high'
  if (level === 4) return 'level-medium-high'
  if (level === 3) return 'level-medium'
  return 'level-low'
}

const onNodeSelect = (node) => {
  emit('node-selected', node.id)
}
</script>

<style scoped>
.list-mode-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: #0f1f2d;
  flex: 1;
  min-height: 0;
}
.nodes-table {
  width: 100%;
  border-collapse: collapse;
  color: #fff;
}
.nodes-table th,
.nodes-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #1e2a38;
}
.nodes-table th {
  background-color: #1e2a38;
  font-weight: bold;
}
.node-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.node-row:hover {
  background-color: #2a3a4a;
}
.level-indicator {
  font-weight: bold;
}
.level-high { border-left: 4px solid #ff4e4e; }
.level-medium-high { border-left: 4px solid #ff9900; }
.level-medium { border-left: 4px solid #f4e562; }
.level-low { border-left: 4px solid #62f49c; }

.loading-skeleton { padding: 10px; }
.skeleton-row {
  height: 45px;
  background-color: #2a3a4a;
  margin-bottom: 5px;
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;
}
.error-message {
  color: #ff6b6b;
  text-align: center;
  padding: 20px;
}
@keyframes pulse {
  0% { background-color: #2a3a4a; }
  50% { background-color: #3a4a5a; }
  100% { background-color: #2a3a4a; }
}
</style>
