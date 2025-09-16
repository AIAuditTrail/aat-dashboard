<template>
  <!--Top-->
  <div class="con left">
    <TopHeader />
    <OverviewStats :nodes="nodes.data" :alerts="stats.data?.alerts?.unresolved" :loading="stats.loading || nodes.loading" />

    <div class="div_any">
      <!-- Left Chart -->
      <ChartsPanel :nodes="nodes.data" :loading="nodes.loading" />

      <!-- Mode Toggle Area -->
      <div class="div_any02 left">
        <div class="div_any_child div_height">
          <!-- Mode Buttons -->
          <div class="tab-container">
                        <button class="tab-btn" :class="{ active: mode === 'node' }" @click="mode = 'node'">Node Mode</button>
            <button class="tab-btn" :class="{ active: mode === 'list' }" @click="mode = 'list'">List Mode</button>
            <button class="tab-btn" :class="{ active: mode === 'trajectory' }" @click="mode = 'trajectory'">Trajectory Mode</button>
          </div>

          <!-- Chart Display Area -->
          <div class="chart-container">
                        <NodeMode v-if="mode === 'node'" :nodes="nodes.data" :loading="nodes.loading" :error="nodes.error" @node-selected="handleNodeSelected" />
            <ListMode v-if="mode === 'list'" :nodes="nodes.data" :loading="nodes.loading" :error="nodes.error" @node-selected="handleNodeSelected" />
            <TrajectoryMode v-if="mode === 'trajectory'" :trajectories="trajectories.data" :loading="trajectories.loading" :error="trajectories.error" @trajectory-selected="handleTrajectorySelected" />
          </div>
        </div>
      </div>

      <!-- Node Details Sidebar -->
      <NodeSidebar 
        :node-id="selectedNodeId" 
        :province="selectedProvince" 
        :trajectory="selectedTrajectory" 
        :stats="stats.data" 
        @data-updated="refreshData"
        @view-trajectory-graph="handleViewTrajectoryGraph"
        @node-selected="handleNodeSelected"
      />
    </div>

    <!-- Independent Alert Scrolling Area -->
    <TrajectoryGraphModal
      :show="showTrajectoryModal"
      :trajectory-id="selectedTrajectory?.id"
      :trajectory-title="selectedTrajectory?.title"
      @close="showTrajectoryModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, watch } from 'vue'
import MapMode from '@/components/modes/MapMode.vue'
import NodeMode from '@/components/modes/NodeMode.vue'
import ListMode from '@/components/modes/ListMode.vue'
import TrajectoryMode from '@/components/modes/TrajectoryMode.vue'
import NodeSidebar from '@/components/NodeSidebar.vue'
import TopHeader from '@/components/TopHeader.vue'
import OverviewStats from '@/components/OverviewStats.vue'
import ChartsPanel from '@/components/ChartsPanel.vue'
import TrajectoryGraphModal from '@/components/TrajectoryGraphModal.vue'
import { getStatsOverview, getNodes, getTrajectories } from '@/api'

const mode = ref('node')

const stats = reactive({ data: null, loading: true, error: null })
const nodes = reactive({ data: [], loading: true, error: null })
const trajectories = reactive({ data: [], loading: true, error: null })
const selectedNodeId = ref(null)
const selectedProvince = ref(null)
const selectedTrajectory = ref(null)
const showTrajectoryModal = ref(false)

async function fetchStats(isRefresh = false) {
  try {
    if (!isRefresh) stats.loading = true
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
    if (!isRefresh) stats.loading = false
  }
}

async function fetchNodes(isRefresh = false) {
  try {
    if (!isRefresh) nodes.loading = true
    nodes.data = await getNodes({}) // Simplified for now
  } catch (err) {
    nodes.error = err
  } finally {
    if (!isRefresh) nodes.loading = false
  }
}

async function fetchTrajectories(isRefresh = false) {
  try {
    if (!isRefresh) trajectories.loading = true
    trajectories.data = await getTrajectories() || []
  } catch (err) {
    trajectories.error = err
  } finally {
    if (!isRefresh) trajectories.loading = false
  }
}

async function fetchData() {
  await Promise.all([fetchStats(false), fetchNodes(false), fetchTrajectories(false)]);
}

async function refreshData() {
  await Promise.all([fetchStats(true), fetchNodes(true), fetchTrajectories(true)]);
}

function handleNodeSelected(nodeId) {
  selectedNodeId.value = nodeId
  selectedProvince.value = null // Clear province on node selection
  selectedTrajectory.value = null
}

function handleProvinceSelected(province) {
  selectedProvince.value = province
  selectedNodeId.value = null // Clear node on province selection
  selectedTrajectory.value = null
}

function handleTrajectorySelected(trajectory) {
  selectedTrajectory.value = trajectory
  selectedNodeId.value = null
  selectedProvince.value = null
}

function handleViewTrajectoryGraph(trajectory) {
  selectedTrajectory.value = trajectory;
  showTrajectoryModal.value = true;
}

onMounted(() => {
  fetchData();
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
