<template>
  <!--顶部-->
  <div class="con left">
    <TopHeader />
    <OverviewStats />

    <div class="div_any">
      <!-- 左侧图表 -->
      <ChartsPanel />

      <!-- 模式切换区域 -->
      <div class="div_any02 left">
        <div class="div_any_child div_height">
          <!-- 模式按钮 -->
          <div class="tab-container">
            <button class="tab-btn" :class="{ active: mode === 'map' }" @click="mode = 'map'">地图模式</button>
            <button class="tab-btn" :class="{ active: mode === 'node' }" @click="mode = 'node'">节点模式</button>
            <button class="tab-btn" :class="{ active: mode === 'list' }" @click="mode = 'list'">列表模式</button>
          </div>

          <!-- 图表展示区域 -->
          <div class="chart-container">
            <MapMode v-if="mode === 'map'" />
            <NodeMode v-if="mode === 'node'" />
            <ListMode v-if="mode === 'list'" />
          </div>
        </div>
      </div>

      <!-- 节点右侧详情栏 -->
      <NodeSidebar />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MapMode from '@/components/modes/MapMode.vue'
import NodeMode from '@/components/modes/NodeMode.vue'
import ListMode from '@/components/modes/ListMode.vue'
import NodeSidebar from '@/components/NodeSidebar.vue'
import TopHeader from '@/components/TopHeader.vue'
import OverviewStats from '@/components/OverviewStats.vue'
import ChartsPanel from '@/components/ChartsPanel.vue'

const mode = ref('map')
</script>

<style scoped>
@import '../assets/common.css';

/* 模式切换按钮容器 */
.tab-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  background-color: #0f1f2d;
  border-bottom: 1px solid #3a4a5c;
}

/* 模式按钮样式 */
.tab-btn {
  padding: 6px 16px;
  min-width: 80px;
  height: 32px;
  line-height: 32px;
  font-size: 14px;
  background-color: #1e2a38;
  color: #fff;
  border: 1px solid #3a4a5c;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn.active {
  background-color: #2f4f75;
  border-color: #2f4f75;
}

/* 图表区域，避免按钮遮挡 */
.chart-container {
  width: 97.5%;
  height: calc(95% - 50px); /* 减去按钮高度 */
  display: inline-block;
  padding-left: 1.25%;
  padding-top: 10px;
  box-sizing: border-box;
}
</style>