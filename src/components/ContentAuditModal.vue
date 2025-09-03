<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <h3 class="modal-title">为 "{{ nodeName }}" 进行内容审计</h3>
      <form @submit.prevent="handleSubmit">
        <!-- Step 1: Select Trajectory -->
        <div class="form-group">
          <label for="trajectoryId">选择轨迹 (Trajectory)</label>
          <select id="trajectoryId" v-model="selectedTrajectoryId" :disabled="loadingTrajectories" @change="handleTrajectoryChange">
            <option value="" disabled>
              {{ loadingTrajectories ? '加载轨迹中...' : '请选择一个轨迹' }}
            </option>
            <option v-for="traj in trajectories" :key="traj.id" :value="traj.id">
              {{ traj.title }}
            </option>
          </select>
        </div>

        <!-- Step 2: Edit Content -->
        <div class="form-group">
          <label for="outputContent">节点输出内容</label>
          <div v-if="loadingContent" class="loading-placeholder">正在加载内容...</div>
          <textarea 
            v-else 
            id="outputContent" 
            v-model="form.output_content" 
            :disabled="!selectedTrajectoryId || submitting"
            placeholder="选择轨迹后，将在此处显示和编辑内容..."
            rows="8"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="close" :disabled="submitting">取消</button>
          <button type="submit" class="btn-primary" :disabled="!selectedTrajectoryId || submitting">
            {{ submitting ? '提交中...' : '确认修改' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { getNodeTrajectories, getNodeOutput, updateNodeOutput } from '@/api';

const props = defineProps({
  show: Boolean,
  nodeId: String,
  nodeName: String,
});

const emit = defineEmits(['close', 'data-updated']);

const trajectories = ref([]);
const selectedTrajectoryId = ref('');
const loadingTrajectories = ref(false);
const loadingContent = ref(false);
const submitting = ref(false);

const form = reactive({
  output_content: '',
});

const fetchTrajectories = async (nodeId) => {
  if (!nodeId) return;
  loadingTrajectories.value = true;
  try {
    trajectories.value = await getNodeTrajectories(nodeId) || [];
  } catch (err) {
    console.error(`Failed to fetch trajectories for node ${nodeId}:`, err);
    trajectories.value = [];
    alert('获取轨迹列表失败！');
  } finally {
    loadingTrajectories.value = false;
  }
};

const handleTrajectoryChange = async () => {
  if (!selectedTrajectoryId.value) {
    form.output_content = '';
    return;
  }
  loadingContent.value = true;
  try {
    const response = await getNodeOutput(selectedTrajectoryId.value, props.nodeId);
    form.output_content = response?.output_content || '';
  } catch (err) {
    console.error(`Failed to fetch content for node ${props.nodeId} in trajectory ${selectedTrajectoryId.value}:`, err);
    form.output_content = '内容加载失败。';
    alert('获取节点内容失败！');
  } finally {
    loadingContent.value = false;
  }
};

const handleSubmit = async () => {
  if (!selectedTrajectoryId.value) {
    alert('请先选择一个轨迹。');
    return;
  }
  submitting.value = true;
  try {
    const response = await updateNodeOutput(selectedTrajectoryId.value, props.nodeId, form);
    if (response.riskLevelElevated) {
      alert('内容包含敏感信息，风险等级已自动提升！');
    } else {
      alert('内容更新成功。');
    }
    emit('data-updated');
    close();
  } catch (err) {
    console.error('Failed to update content:', err);
    alert('内容更新失败！');
  } finally {
    submitting.value = false;
  }
};

const resetState = () => {
  trajectories.value = [];
  selectedTrajectoryId.value = '';
  form.output_content = '';
  loadingTrajectories.value = false;
  loadingContent.value = false;
  submitting.value = false;
};

const close = () => {
  resetState();
  emit('close');
};

watch(() => props.show, (newVal) => {
  if (newVal && props.nodeId) {
    fetchTrajectories(props.nodeId);
  } else {
    resetState();
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex; justify-content: center; align-items: center; z-index: 1000;
}
.modal-content {
  background-color: #1e2a38; padding: 25px; border-radius: 8px;
  width: 500px; color: #fff; display: flex; flex-direction: column;
}
.modal-title { margin-top: 0; margin-bottom: 20px; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; color: #aaa; }
.form-group input, .form-group textarea, .form-group select {
  width: 100%; padding: 8px; background-color: #0f1f2d;
  border: 1px solid #3a4a5c; color: #fff; border-radius: 4px;
}
.loading-placeholder {
  height: 120px;
  background-color: #0f1f2d;
  border: 1px solid #3a4a5c;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #aaa;
}
textarea { resize: vertical; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-primary, .btn-secondary {
  padding: 8px 15px; border-radius: 4px; border: none; cursor: pointer;
}
.btn-primary { background-color: #2f4f75; color: #fff; }
.btn-secondary { background-color: #3a4a5c; color: #fff; }
button:disabled { background-color: #555; cursor: not-allowed; }
</style>