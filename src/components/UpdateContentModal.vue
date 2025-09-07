<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <h3 class="modal-title">Update Content for Node "{{ nodeName }}"</h3>

      <div v-if="loading" class="status-placeholder">Loading content...</div>
      <div v-else-if="error" class="status-placeholder error">{{ error }}</div>

      <div v-else class="content-editor">
        <textarea v-model="content" placeholder="Enter new output content..."></textarea>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="close">Cancel</button>
        <button type="button" class="btn-primary" @click="submit" :disabled="submitting">
          {{ submitting ? 'Updating...' : 'Update Content' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { getNodeOutput, updateNodeOutput } from '@/api';

const props = defineProps({
  show: Boolean,
  trajectoryId: String,
  nodeId: String,
  nodeName: String,
});

const emit = defineEmits(['close', 'content-updated']);

const loading = ref(false);
const submitting = ref(false);
const error = ref(null);
const content = ref('');

async function fetchContent() {
  if (!props.trajectoryId || !props.nodeId) return;

  loading.value = true;
  error.value = null;
  try {
    const result = await getNodeOutput(props.trajectoryId, props.nodeId);
    content.value = result?.output_content || '';
  } catch (err) {
    console.error(`Failed to fetch content for node ${props.nodeId}:`, err);
    error.value = 'Failed to load content.';
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!props.trajectoryId || !props.nodeId) return;

  submitting.value = true;
  error.value = null;
  try {
    await updateNodeOutput(props.trajectoryId, props.nodeId, { output_content: content.value });
    emit('content-updated');
    close();
  } catch (err) {
    console.error(`Failed to update content for node ${props.nodeId}:`, err);
    error.value = 'Failed to update content.';
  } finally {
    submitting.value = false;
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    fetchContent();
  } else {
    content.value = '';
    error.value = null;
  }
});

const close = () => {
  if (!submitting.value) {
    emit('close');
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex; justify-content: center; align-items: center; z-index: 1001;
}
.modal-content {
  background-color: #1e2a38; padding: 25px; border-radius: 8px;
  width: 600px; color: #fff; display: flex; flex-direction: column;
  max-height: 80vh;
}
.modal-title { margin-top: 0; margin-bottom: 20px; }

.content-editor {
  flex-grow: 1;
  display: flex;
}
textarea {
  width: 100%;
  height: 200px;
  background-color: #2a3a4a;
  color: #fff;
  border: 1px solid #3a4a5c;
  border-radius: 4px;
  padding: 10px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

.modal-actions {
  display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #3a4a5c;
}
.btn-primary, .btn-secondary {
  padding: 8px 15px; border-radius: 4px; border: none; cursor: pointer;
}
.btn-primary { background-color: #2f4f75; color: #fff; }
.btn-secondary { background-color: #3a4a5c; color: #fff; }
.btn-primary:disabled { background-color: #555; cursor: not-allowed; }

.status-placeholder {
  text-align: center; padding: 40px 20px; color: #aaa;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.error { color: #ff6b6b; }
</style>
