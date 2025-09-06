// src/api/index.js

const API_BASE_URL = '/api';

// Helper function to handle fetch requests
async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();
        
        if (!responseText) {
            console.warn(`[API] Received empty response for endpoint: ${endpoint}`);
            return null;
        }

        return JSON.parse(responseText);

    } catch (error) {
        console.error(`API request error for endpoint ${endpoint}: ${error.message}`);
        throw error;
    }
}

// 1. Stats API
export const getStatsOverview = (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stats/overview?${query}`);
};

export const getStatsProvinces = () => {
    return request('/stats/provinces');
};

// 2. Nodes API
export const getNodes = (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/nodes?${query}`);
};

export const getNodeDetails = (id) => {
    return request(`/nodes/${id}`);
};

export const getNeighbors = (id) => {
    return request(`/nodes/${id}/neighbors`);
};

export const getNodeTrajectories = (id) => {
    return request(`/nodes/${id}/trajectories`);
};

// 3. Trajectories API
export const getTrajectories = () => {
    return request('/trajectories');
};

export const getTrajectoryGraph = (id) => {
    return request(`/trajectories/${id}/graph`);
};

export const injectRiskToTrajectory = (id) => {
    return request(`/trajectories/${id}/inject-risk`, { method: 'POST' });
};

export const auditTrajectory = (id) => {
    return request(`/trajectories/${id}/audit`, { method: 'POST' });
};

export const getTrajectoryTransactions = (id) => {
    return request(`/trajectories/${id}/transactions`);
};

// 4. Alerts API
export const getAlerts = (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/alerts?${query}`);
};

export const createAlert = (data) => {
    return request('/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
};

export const getAlertDetails = (id) => {
    return request(`/alerts/${id}`);
};

// 5. Trace API
export const runTrace = (data) => {
    return request('/trace/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
};

export const getTraceRun = (id) => {
    return request(`/trace/runs/${id}`);
};

// 6. Audit API
export const applyAudit = (data) => {
    return request('/audit/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
};

// 7. Seed API (for development)
export const resetSeedData = () => {
    return request('/seed/reset', { method: 'POST' });
};

// 8. Trajectory Node Content API
export const getNodeOutput = (trajectoryId, nodeId) => {
    return request(`/trajectories/${trajectoryId}/nodes/${nodeId}/outputs`);
};

export const updateNodeOutput = (trajectoryId, nodeId, data) => {
    return request(`/trajectories/${trajectoryId}/nodes/${nodeId}/outputs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
};
