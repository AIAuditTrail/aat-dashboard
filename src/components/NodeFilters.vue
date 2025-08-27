<template>
  <div class="filters-container">
    <div class="filter-group">
      <input 
        type="text" 
        placeholder="搜索节点名称..." 
        :value="filters.keyword"
        @input="updateFilter('keyword', $event.target.value)" 
        class="filter-input"
      />
    </div>
    <div class="filter-group">
      <select 
        :value="filters.province"
        @change="updateFilter('province', $event.target.value)" 
        class="filter-select"
      >
        <option value="">所有省份</option>
        <!-- Province options will be populated dynamically -->
        <option v-for="province in provinces" :key="province" :value="province">{{ province }}</option>
      </select>
    </div>
    <div class="filter-group">
      <select 
        :value="filters.level"
        @change="updateFilter('level', $event.target.value)"
        class="filter-select"
      >
        <option value="">所有风险等级</option>
        <option v-for="level in 5" :key="level" :value="level">风险等级 {{ level }}</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  filters: {
    type: Object,
    required: true,
    default: () => ({ keyword: '', province: '', level: '' })
  },
  provinces: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:filters']);

const updateFilter = (key, value) => {
  emit('update:filters', { ...props.filters, [key]: value });
};
</script>

<style scoped>
.filters-container {
  display: flex;
  gap: 15px;
  padding: 10px 20px;
  background-color: #1e2a38;
  border-radius: 4px;
  margin-bottom: 10px;
}
.filter-group {
  display: flex;
  flex-direction: column;
}
.filter-input, .filter-select {
  padding: 8px;
  background-color: #0f1f2d;
  border: 1px solid #3a4a5c;
  color: #fff;
  border-radius: 4px;
}
</style>
