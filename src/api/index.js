// src/api/index.js
import { overviewData, chartsData, nodesData, alertData } from '@/mock/data'

export function getOverview() {
    return Promise.resolve(overviewData)
}

export function getCharts() {
    return Promise.resolve(chartsData)
}

export function getNodes() {
    return Promise.resolve(nodesData)
}

export function getAlerts() {
    return Promise.resolve(alertData)
}