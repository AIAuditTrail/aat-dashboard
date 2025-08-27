<template>
  <!--顶部-->
  <div class="con left">
    <TopHeader />
    <OverviewStats :stats="stats.data" :loading="stats.loading" />

    <div class="div_any">
      <!-- 左侧图表 -->
      <ChartsPanel :stats="stats.data" :loading="stats.loading" />

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
            <MapMode v-if="mode === 'map'" :provinces="stats.data?.provinces" @province-selected="handleProvinceSelected" />
            <NodeMode v-if="mode === 'node'" :nodes="nodes.data" :loading="nodes.loading" :error="nodes.error" @node-selected="handleNodeSelected" />
            <ListMode v-if="mode === 'list'" :nodes="nodes.data" :loading="nodes.loading" :error="nodes.error" @node-selected="handleNodeSelected" />
          </div>
        </div>
      </div>

      <!-- 节点右侧详情栏 -->
      <NodeSidebar :node-id="selectedNodeId" :province="selectedProvince" :stats="stats.data" />
    </div>

    <!-- 独立的警报滚动区 -->
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, watch } from 'vue'
import MapMode from '@/components/modes/MapMode.vue'
import NodeMode from '@/components/modes/NodeMode.vue'
import ListMode from '@/components/modes/ListMode.vue'
import NodeSidebar from '@/components/NodeSidebar.vue'
import TopHeader from '@/components/TopHeader.vue'
import OverviewStats from '@/components/OverviewStats.vue'
import ChartsPanel from '@/components/ChartsPanel.vue'
import { getStatsOverview, getNodes } from '@/api'

const mode = ref('map')

const stats = reactive({ data: null, loading: true, error: null })
const nodes = reactive({ data: [], loading: true, error: null })
const selectedNodeId = ref(null)
const selectedProvince = ref(null)

async function fetchStats() {
  try {
    stats.loading = true
    const rawData = await getStatsOverview({ tz: 'Asia/Shanghai', includeResolved: true })
    
    if (rawData) {
      // Process data to add any top-level stats needed by child components
      const totalNodes = rawData.provinces.reduce((sum, p) => sum + p.total_nodes, 0);

      stats.data = {
        ...rawData, // Keep original structured data
        total_nodes: totalNodes, // Add calculated total
      };
    } else {
      stats.data = null; // Handle case where API returns null
    }

  } catch (err) {
    stats.error = err
    stats.data = null;
  } finally {
    stats.loading = false
  }
}

async function fetchNodes() {
  try {
    nodes.loading = true
    nodes.data = await getNodes({}) // Simplified for now
  } catch (err) {
    nodes.error = err
  } finally {
    nodes.loading = false
  }
}

function handleNodeSelected(nodeId) {
  selectedNodeId.value = nodeId
  selectedProvince.value = null // Clear province on node selection
}

function handleProvinceSelected(province) {
  selectedProvince.value = province
  selectedNodeId.value = null // Clear node on province selection
}

onMounted(() => {
  fetchStats()
  fetchNodes()
})
</script>

<style scoped>
@import '../assets/common.css';

.con {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.div_any {
  display: flex;
  flex-grow: 1;
  align-items: stretch;
  min-height: 0;
}

/* ... existing styles ... */
.tab-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  background-color: #0f1f2d;
  border-bottom: 1px solid #3a4a5c;
}

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
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn.active {
  background-color: #2f4f75;
  border-color: #2f4f75;
}

.div_any02 {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.div_any02 > .div_any_child {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.tab-container {
  flex-shrink: 0;
}
.chart-container {
  flex-grow: 1;
  width: 100%;
  padding: 10px 1.25%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
