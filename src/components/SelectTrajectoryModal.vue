<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <h3 class="modal-title">Select a Trajectory</h3>
      <div v-if="loading" class="status-placeholder">Loading trajectories...</div>
      <div v-else-if="error" class="status-placeholder error">Failed to load trajectories.</div>
      <div v-else-if="trajectories.length === 0" class="status-placeholder">This node is not part of any trajectory.</div>
      <div v-else class="trajectory-list">
        <div
          v-for="traj in trajectories"
          :key="traj.id"
          class="trajectory-item"
          @click="selectTrajectory(traj)"
        >
          <div class="traj-title">{{ traj.title || 'Untitled Trajectory' }}</div>
          <div class="traj-id">ID: {{ traj.id }}</div>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="close">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { getNodeTrajectories } from '@/api';

const props = defineProps({
  show: Boolean,
  nodeId: String,
});

const emit = defineEmits(['close', 'trajectory-selected']);

const loading = ref(false);
const error = ref(null);
const trajectories = ref([]);

async function fetchTrajectories() {
  if (!props.nodeId) return;
  loading.value = true;
  error.value = null;
  try {
    const result = await getNodeTrajectories(props.nodeId);
    trajectories.value = result || [];
  } catch (err) {
    console.error(`Failed to fetch trajectories for node ${props.nodeId}:`, err);
    error.value = err;
  } finally {
    loading.value = false;
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    fetchTrajectories();
  } else {
    trajectories.value = [];
    error.value = null;
  }
});

function selectTrajectory(trajectory) {
  emit('trajectory-selected', trajectory);
  close();
}

const close = () => {
  emit('close');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex; justify-content: center; align-items: center; z-index: 1002; /* Higher z-index */
}
.modal-content {
  background-color: #1e2a38; padding: 25px; border-radius: 8px;
  width: 500px; color: #fff; display: flex; flex-direction: column;
  max-height: 70vh;
}
.modal-title { margin-top: 0; margin-bottom: 20px; }

.trajectory-list {
  overflow-y: auto;
  border-top: 1px solid #3a4a5c;
  border-bottom: 1px solid #3a4a5c;
}
.trajectory-item {
  padding: 12px 15px;
  border-bottom: 1px solid #2a3a4a;
  cursor: pointer;
  transition: background-color 0.2s;
}
.trajectory-item:last-child {
  border-bottom: none;
}
.trajectory-item:hover {
  background-color: #2a3a4a;
}
.traj-title {
  font-weight: bold;
  color: #e5e7eb;
}
.traj-id {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.modal-actions {
  display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;
}
.btn-secondary {
  padding: 8px 15px; border-radius: 4px; border: none; cursor: pointer;
  background-color: #3a4a5c; color: #fff;
}
.status-placeholder {
  text-align: center; padding: 40px 20px; color: #aaa;
}
.error { color: #ff6b6b; }
</style>
