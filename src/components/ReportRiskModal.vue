<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <h3 class="modal-title">为 "{{ nodeName }}" 上报风险</h3>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="trajectoryId">轨迹 (Trajectory)</label>
          <select id="trajectoryId" v-model="form.trajectory_id" required>
            <option v-if="trajectories.length === 0" value="" disabled>加载轨迹中...</option>
            <option v-for="traj in trajectories" :key="traj.id" :value="traj.id">
              {{ traj.title }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="level">风险等级 (1-5)</label>
          <input id="level" v-model.number="form.level" type="number" min="1" max="5" required>
        </div>
        <div class="form-group">
          <label for="description">风险描述</label>
          <textarea id="description" v-model="form.description" required placeholder="请详细描述风险情况..."></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="close">取消</button>
          <button type="submit" class="btn-primary" :disabled="submitting">
            {{ submitting ? '提交中...' : '确认上报' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { getTrajectories } from '@/api'

const props = defineProps({
  show: Boolean,
  nodeId: String,
  nodeName: String,
})

const emit = defineEmits(['close', 'submit'])

const submitting = ref(false)
const trajectories = ref([])
const form = reactive({
  trajectory_id: '',
  level: 5,
  description: '',
})

const fetchTrajectories = async () => {
  try {
    const data = await getTrajectories();
    trajectories.value = data || [];
    if (trajectories.value.length > 0 && !form.trajectory_id) {
      form.trajectory_id = trajectories.value[0].id;
    }
  } catch (err) {
    console.error("Failed to fetch trajectories:", err);
    trajectories.value = [];
  }
};

watch(() => props.show, (newVal) => {
  if (newVal) {
    fetchTrajectories();
  } else {
    // Reset form state when modal closes
    trajectories.value = [];
    form.trajectory_id = '';
  }
});

const close = () => {
  emit('close')
}

const handleSubmit = async () => {
  if (!form.trajectory_id) {
    alert('请选择一个轨迹。');
    return;
  }
  submitting.value = true
  try {
    const payload = {
      node_id: props.nodeId,
      ...form,
    }
    emit('submit', payload)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background-color: #1e2a38;
  padding: 25px;
  border-radius: 8px;
  width: 400px;
  color: #fff;
}
.modal-title {
  margin-top: 0;
  margin-bottom: 20px;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #aaa;
}
.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  background-color: #0f1f2d;
  border: 1px solid #3a4a5c;
  color: #fff;
  border-radius: 4px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
.btn-primary, .btn-secondary {
  padding: 8px 15px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}
.btn-primary {
  background-color: #2f4f75;
  color: #fff;
}
.btn-secondary {
  background-color: #3a4a5c;
  color: #fff;
}
</style>
