<template>
  <div class="con_div">
    <div class="con_div_text left">
      <div class="con_div_text01 left">
        <img src="/images/info_1.png" class="left text01_img" alt="总低风险警报图标"  />
        <div class="left text01_div">
          <p>总低风险警报数</p>
          <p>{{ stats.lowTotal }}</p>
        </div>
      </div>
      <div class="con_div_text01 right">
        <img src="/images/info_2.png" class="left text01_img" />
        <div class="left text01_div">
          <p>当月低风险警报数</p>
          <p>{{ stats.lowMonth }}</p>
        </div>
      </div>
    </div>
    <div class="con_div_text left">
      <div class="con_div_text01 left">
        <img src="/images/info_3.png" class="left text01_img" />
        <div class="left text01_div">
          <p>总中风险警报数</p>
          <p class="sky">{{stats.midTotal}}</p>
        </div>
      </div>
      <div class="con_div_text01 right">
        <img src="/images/info_4.png" class="left text01_img" />
        <div class="left text01_div">
          <p>当月中风险警报数</p>
          <p class="sky">{{ stats.midMonth }}</p>
        </div>
      </div>
    </div>
    <div class="con_div_text left">
      <div class="con_div_text01 left">
        <img src="/images/info_5.png" class="left text01_img" />
        <div class="left text01_div">
          <p>总高风险警报数</p>
          <p class="org">{{ stats.highTotal }}</p>
        </div>
      </div>
      <div class="con_div_text01 right">
        <img src="/images/info_6.png" class="left text01_img" />
        <div class="left text01_div">
          <p>当月高风险警报数</p>
          <p class="org">{{ stats.highMonth }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getOverview } from '@/api'

const stats = ref({
  lowTotal: 0, lowMonth: 0,
  midTotal: 0, midMonth: 0,
  highTotal: 0, highMonth: 0
})

onMounted(async () => {
  stats.value = await getOverview()
})
</script>

<style scoped>
/* 样式由 common.css 提供，无需重复写 */
</style>