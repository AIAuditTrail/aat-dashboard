import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Trace from '../views/Trace.vue'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/trace/:alert_id',
        name: 'Trace',
        component: Trace,
        props: true
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
