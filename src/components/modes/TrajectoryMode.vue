<template>
  <div class="list-mode-container">
    <div v-if="loading" class="loading-skeleton">
      <div v-for="i in 10" :key="i" class="skeleton-row"></div>
    </div>
    <div v-else-if="error" class="error-message">
      Failed to load trajectory list...
    </div>
    <table v-else class="nodes-table">
      <thead>
        <tr>
          <th>Trajectory Title</th>
          <th>Created At</th>
          <th>Transaction Count</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="trajectory in trajectories"
          :key="trajectory.id"
          class="node-row"
          @click="onTrajectorySelect(trajectory)"
        >
          <td>{{ trajectory.title }}</td>
          <td>{{ new Date(trajectory.created_at).toLocaleString() }}</td>
          <td>{{ trajectory.transaction_count }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
const emit = defineEmits(['trajectory-selected'])

defineProps({
  trajectories: {
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

const onTrajectorySelect = (trajectory) => {
  emit('trajectory-selected', trajectory)
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
