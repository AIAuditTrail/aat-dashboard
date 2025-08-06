import {createApp} from 'vue'
import App from './App.vue'
import router from './router'
import './assets/common.css'  // 保留你的旧样式
import './assets/base.css'    // 如有额外基础样式
import './assets/main.css'    // 原Vite模板的，可以后续精简或删除

createApp(App)
    .use(router)
    .mount('#app')
