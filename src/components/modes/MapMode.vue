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

// Create a reverse map for universal English label display
const chineseToEnglishMap = Object.fromEntries(
  Object.entries(provinceNameMap).map(([english, chinese]) => [chinese, english])
);

const processMapData = (provincesData) => {
  if (!provincesData) return [];
  return provincesData.map(p => {
    let riskNodesCount = 0;
    if (p.by_level) {
      // Risk nodes are levels > 2 (medium and high risk)
      riskNodesCount = Object.entries(p.by_level).reduce((sum, [level, count]) => {
        if (parseInt(level, 10) > 2) {
          return sum + count;
        }
        return sum;
      }, 0);
    }
    return {
      name: provinceNameMap[p.province] || p.province,
      englishName: p.province,
      value: riskNodesCount,
      total_nodes: p.total_nodes || 0,
      risk_nodes_count: riskNodesCount
    };
  });
}

const updateChart = () => {
  if (!chartInstance || !props.provinces || !chartRef.value) return;
  const { width, height } = chartRef.value.getBoundingClientRect();
  if (width === 0 || height === 0) return;

  const seriesData = processMapData(props.provinces);

  // Dynamically calculate the max value for the visual map range
  const maxRiskNodesCount = seriesData.length > 0
    ? Math.max(...seriesData.map(p => p.value || 0))
    : 1; // Default to 1 to avoid a 0-0 range if no data

  chartInstance.setOption({
    visualMap: {
      min: 0,
      max: maxRiskNodesCount,
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
        if (params.componentType === 'series' && params.seriesType === 'map' && params.data) {
          const englishName = params.data.englishName;
          const provinceData = props.provinces.find(p => p.province === englishName);
          if (provinceData) {
            emit('province-selected', provinceData);
          }
        }
      });

      chartInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            const cleanName = params.name.replace(/省|市|自治区|特别行政区|壮族|回族|维吾尔/g, '');
            const englishName = chineseToEnglishMap[cleanName] || params.name;
            if (params.data) {
              return `${englishName}<br/>Risk Nodes: ${params.data.risk_nodes_count}<br/>Total Nodes: ${params.data.total_nodes}`;
            }
            return `${englishName}<br/>No data available`;
          }
        },
        visualMap: {
          left: 'left', bottom: '5%',
          text: ['High', 'Low'], calculable: true,
          inRange: { color: ['#62f49c', '#f4e562', '#ff4e4e'] },
          textStyle: { color: '#fff' }
        },
        series: [{
          name: 'Average Risk', type: 'map', map: 'china', roam: true,
          label: {
            show: true,
            color: '#ffffff',
            formatter: (params) => {
              // Clean the geoJSON name and then map to English
              const cleanName = params.name.replace(/省|市|自治区|特别行政区|壮族|回族|维吾尔/g, '');
              return chineseToEnglishMap[cleanName] || params.name;
            }
          },
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
