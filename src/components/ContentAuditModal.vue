<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <h3 class="modal-title">Content Audit for "{{ nodeName }}"</h3>
      <p class="trajectory-info">Trajectory ID: <strong>{{ trajectoryId || 'N/A' }}</strong></p>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="outputContent">Node Output Content</label>
          <div v-if="loadingContent" class="loading-placeholder">Loading content...</div>
          <textarea 
            v-else 
            id="outputContent" 
            v-model="form.output_content" 
            :disabled="!trajectoryId || submitting"
            placeholder="Content will be loaded once a trajectory is selected."
            rows="8"
          ></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="close" :disabled="submitting">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="!trajectoryId || submitting">
            {{ submitting ? 'Submitting...' : 'Update & Audit' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { getNodeOutput, updateNodeOutput, auditTrajectory } from '@/api';

const props = defineProps({
  show: Boolean,
  nodeId: String,
  nodeName: String,
  trajectoryId: String, // Added trajectoryId as a prop
});

const emit = defineEmits(['close', 'data-updated']);

const loadingContent = ref(false);
const submitting = ref(false);

const form = reactive({
  output_content: '',
});

const fetchContent = async () => {
  if (!props.trajectoryId || !props.nodeId) {
    form.output_content = '';
    return;
  }
  loadingContent.value = true;
  try {
    const response = await getNodeOutput(props.trajectoryId, props.nodeId);
    form.output_content = response?.output_content || '';
  } catch (err) {
    console.error(`Failed to fetch content for node ${props.nodeId} in trajectory ${props.trajectoryId}:`, err);
    form.output_content = 'Failed to load content.';
    alert('Failed to fetch node content!');
  } finally {
    loadingContent.value = false;
  }
};

const handleSubmit = async () => {
  if (!props.trajectoryId) {
    alert('Trajectory not selected.');
    return;
  }
  submitting.value = true;
  try {
    // First, update the content
    await updateNodeOutput(props.trajectoryId, props.nodeId, form);
    
    // Then, trigger the audit on the whole trajectory
    const auditResult = await auditTrajectory(props.trajectoryId);
    
    alert(auditResult.summary || 'Content updated and audit completed!');
    
    emit('data-updated');
    close();
  } catch (err) {
    console.error('Failed to update content or run audit:', err);
    alert('An error occurred during the process.');
  } finally {
    submitting.value = false;
  }
};

const resetState = () => {
  form.output_content = '';
  loadingContent.value = false;
  submitting.value = false;
};

const close = () => {
  resetState();
  emit('close');
};

watch(() => props.show, (newVal) => {
  if (newVal) {
    fetchContent();
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