const shortId = (value = '') => String(value).replace(/-/g, '').slice(0, 12) || 'unknown';

export function stableDisplayHash(seed = '') {
  let hash = 0;
  const text = String(seed);
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function buildIdentityProfile(node = {}) {
  const id = String(node.id ?? node.node_id ?? node.name ?? 'unknown');
  const risk = (node.static_level ?? 0) + (node.runtime_level ?? node.risk_level ?? 0);
  return {
    did: `did:aat:sui:${shortId(id)}`,
    vcStatus: risk >= 9 ? '需复核' : '有效',
    issuer: 'CA-监管审计节点',
    owner: node.province ? `${node.province} 责任单位` : '责任主体待核验',
    capability: node.type || 'AI安全监管/工具调用审计',
    version: `v1.${Math.max(0, risk)}`,
  };
}

export function buildEvidenceRecord(edge = {}, trajectoryId = '', index = 0) {
  const from = edge.from ?? edge.source ?? edge.u ?? edge[0] ?? 'unknown';
  const to = edge.to ?? edge.target ?? edge.v ?? edge[1] ?? 'unknown';
  const seed = `${trajectoryId}|${from}|${to}|${index}`;
  return {
    trajectoryId: trajectoryId || '待接轨迹编号',
    caller: String(from),
    callee: String(to),
    actionType: 'agent_call',
    interactionHash: `0x${stableDisplayHash(seed)}${stableDisplayHash(`${seed}:proof`)}`,
    timestamp: '待接链上事件时间戳',
    status: '证据摘要用于审计展示，正式证据以链上 InteractionEvent 为准'
  };
}
