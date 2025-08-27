<template>
  <div ref="chartRef" style="width: 100%; height: 100%;"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  provinces: {
    type: Array,
    default: () => []
  }
})

const chartRef = ref(null)
let chartInstance = null

const emit = defineEmits(['province-selected'])

const provinceNameMap = {
    'Anhui': '安徽', 'Beijing': '北京', 'Chongqing': '重庆', 'Fujian': '福建', 'Gansu': '甘肃',
    'Guangdong': '广东', 'Guangxi': '广西', 'Guizhou': '贵州', 'Hainan': '海南', 'Hebei': '河北',
    'Heilongjiang': '黑龙江', 'Henan': '河南', 'Hubei': '湖北', 'Hunan': '湖南', 'Inner Mongolia': '内蒙古',
    'Jiangsu': '江苏', 'Jiangxi': '江西', 'Jilin': '吉林', 'Liaoning': '辽宁', 'Ningxia': '宁夏',
    'Qinghai': '青海', 'Shaanxi': '陕西', 'Shandong': '山东', 'Shanghai': '上海', 'Shanxi': '山西',
    'Sichuan': '四川', 'Tianjin': '天津', 'Tibet': '西藏', 'Xinjiang': '新疆', 'Yunnan': '云南', 'Zhejiang': '浙江'
};

const processMapData = (provincesData) => {
  if (!provincesData) return [];
  return provincesData.map(p => ({
    name: provinceNameMap[p.province] || p.province,
    value: p.total_nodes || 0
  }));
}

const updateChart = () => {
  if (!chartInstance || !props.provinces || !chartRef.value) return;
  const { width, height } = chartRef.value.getBoundingClientRect();
  if (width === 0 || height === 0) return;

  const seriesData = processMapData(props.provinces);
  const maxValue = Math.max(...seriesData.map(d => d.value), 0);
  
  chartInstance.setOption({
    visualMap: {
      max: Math.ceil(maxValue) || 1,
    },
    series: [{
      data: seriesData
    }]
  });
};

const resizeHandler = () => chartInstance?.resize();

onMounted(async () => {
  if (chartRef.value) {
    try {
      if (!echarts.getMap('china')) {
        const mapJson = await fetch('/maps/china.json').then(res => res.json());
        echarts.registerMap('china', mapJson);
      }

      chartInstance = echarts.init(chartRef.value);

      chartInstance.on('click', (params) => {
        if (params.componentType === 'series' && params.seriesType === 'map') {
          const provinceName = params.name;
          const provinceData = props.provinces.find(p => provinceNameMap[p.province] === provinceName || p.province === provinceName);
          if (provinceData) {
            emit('province-selected', provinceData);
          }
        }
      });

      chartInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', formatter: '{b}<br/>节点总数: {c}' },
        visualMap: {
          min: 0, max: 1, left: 'left', bottom: '5%',
          text: ['高', '低'], calculable: true,
          inRange: { color: ['#50a3ba', '#eac736', '#d94e5d'] },
          textStyle: { color: '#fff' }
        },
        series: [{
          name: '节点总数', type: 'map', map: 'china', roam: true,
          label: { show: true, color: '#ffffff' },
          itemStyle: { areaColor: '#003366', borderColor: '#0ba3b0' },
          emphasis: { itemStyle: { areaColor: '#2a333d' } },
          data: []
        }]
      });
      
      // If data is already present on mount, update the chart
      if (props.provinces && props.provinces.length > 0) {
        updateChart();
      }

      window.addEventListener('resize', resizeHandler);
    } catch (error) {
      console.error('Failed to initialize chart:', error);
    }
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler);
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});

// Watch for subsequent data changes
watch(() => props.provinces, (newVal) => {
  if (newVal && chartInstance) {
    updateChart();
  }
}, { deep: true });
</script>
