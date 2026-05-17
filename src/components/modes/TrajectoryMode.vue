<template>
  <div class="trajectory-mode-container">
    <div v-if="loading" class="loading-skeleton">
      <div v-for="i in 8" :key="i" class="skeleton-row"></div>
    </div>
    <div v-else-if="error" class="error-message">轨迹列表加载失败...</div>
    <table v-else class="trajectory-table">
      <thead>
        <tr>
          <th>任务轨迹</th>
          <th>Trajectory ID</th>
          <th>交互次数</th>
          <th>创建时间</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="trajectory in trajectories"
          :key="trajectory.id"
          class="trajectory-row"
          @click="$emit('trajectory-selected', trajectory)"
        >
          <td>{{ trajectory.title || '未命名轨迹' }}</td>
          <td><code>{{ trajectory.id }}</code></td>
          <td>{{ trajectory.transaction_count ?? 0 }}</td>
          <td>{{ formatTime(trajectory.created_at) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  trajectories: { type: Array, default: () => [] },
  loading: { type: Boolean, default: true },
  error: { type: Object, default: null }
});

defineEmits(['trajectory-selected']);

function formatTime(value) {
  if (!value) return '待接时间字段';
  return new Date(value).toLocaleString();
}
</script>

<style scoped>
.trajectory-mode-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: #0f1f2d;
  flex: 1;
  min-height: 0;
}
.trajectory-table {
  width: 100%;
  border-collapse: collapse;
  color: #fff;
  table-layout: fixed;
}
.trajectory-table th,
.trajectory-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid #1e2a38;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trajectory-table th {
  background-color: #1e2a38;
  font-weight: bold;
}
.trajectory-table code {
  color: #a0c8ff;
  font-size: 12px;
}
.trajectory-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.trajectory-row:hover {
  background-color: #2a3a4a;
}
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
