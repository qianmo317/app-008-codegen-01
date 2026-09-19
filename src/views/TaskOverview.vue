<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getTask, voidTask } from '../db';
import { estimateVehicle, roomProgress, statusColor, statusLabel, composeAddress, formatDateTime } from '../utils';
import type { MoveTask } from '../types';

const route = useRoute();
const router = useRouter();
const task = ref<MoveTask | null>(null);
const showHistory = ref(false);

const stats = computed(() => {
  if (!task.value) return { total: 0, loaded: 0, unpacked: 0, damaged: 0 };
  const boxes = task.value.boxes;
  return {
    total: boxes.length,
    loaded: boxes.filter((b) => b.status === 'loaded').length,
    unpacked: boxes.filter((b) => b.status === 'unpacked').length,
    damaged: boxes.filter((b) => b.status === 'damaged').length,
  };
});

const vehicle = computed(() => {
  if (!task.value || task.value.boxes.length === 0) return null;
  return estimateVehicle(task.value.boxes.length);
});

const roomStats = computed(() => {
  if (!task.value) return [];
  return task.value.rooms.map((r) => ({ room: r, ...roomProgress(task.value!, r) }));
});

const historyDesc = computed(() => {
  if (!task.value) return [];
  return [...(task.value.addressHistory || [])].sort((a, b) => b.version - a.version);
});

async function load() {
  task.value = await getTask(route.params.id as string);
}

async function voidThis() {
  if (!task.value) return;
  if (!confirm(`确定作废单号 ${task.value.orderNo}？\n作废后该单号不可恢复、也不会再被使用。`)) return;
  const reason = prompt('作废原因（可留空）') ?? '';
  await voidTask(task.value.id, reason.trim());
  await load();
}

onMounted(load);
</script>

<template>
  <div v-if="task">
    <div class="header">
      <router-link to="/" class="back">←</router-link>
      <h1>{{ task.title }}</h1>
    </div>
    <div class="page">
      <div v-if="task.status === 'void'" class="void-banner">
        本单已作废{{ task.voidReason ? `：${task.voidReason}` : '' }}，单号 {{ task.orderNo }} 不会再被使用
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="mono" style="font-weight:800;font-size:18px;">{{ task.orderNo }}</span>
          <span class="badge badge-version">第{{ task.addressVersion }}版</span>
          <span v-if="task.status === 'void'" class="badge badge-void">已作废</span>
        </div>
        <div style="font-size:14px;margin-top:10px;">
          <div>联系人：{{ task.contactName || '—' }} · {{ task.contactPhone || '未留电话' }}</div>
          <div style="margin-top:6px;">出发：{{ task.from }}</div>
          <div style="margin-top:4px;">目的：{{ task.to }}</div>
          <div style="margin-top:4px;color:var(--text-secondary);font-size:13px;">搬家日期：{{ task.date }}</div>
        </div>
        <div v-if="task.status !== 'void'" class="no-print" style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn btn-secondary" style="padding:8px 14px;font-size:14px;" @click="router.push(`/task/${task.id}/edit`)">修改信息/地址</button>
          <button class="btn btn-danger" style="padding:8px 14px;font-size:14px;" @click="voidThis">作废单据</button>
        </div>
      </div>

      <div v-if="historyDesc.length" class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" @click="showHistory = !showHistory">
          <span style="font-weight:700;">地址版本历史（{{ historyDesc.length }} 版）</span>
          <span style="color:var(--text-secondary);">{{ showHistory ? '▲' : '▼' }}</span>
        </div>
        <div v-if="showHistory" style="margin-top:10px;">
          <div v-for="h in historyDesc" :key="h.version" style="padding:8px 0;border-top:1px solid var(--border);font-size:13px;">
            <div style="font-weight:600;">
              第{{ h.version }}版
              <span v-if="h.version === task.addressVersion" class="badge badge-version">当前</span>
              <span style="color:var(--text-secondary);font-weight:400;margin-left:6px;">{{ formatDateTime(h.changedAt) }}</span>
            </div>
            <div style="margin-top:4px;color:var(--text-secondary);">
              {{ composeAddress(h.from) }} → {{ composeAddress(h.to) }}
            </div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card" style="text-align:center;">
          <div style="font-size:28px;font-weight:800;">{{ stats.total }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">总箱数</div>
        </div>
        <div class="card" style="text-align:center;">
          <div style="font-size:28px;font-weight:800;color:var(--info);">{{ stats.loaded }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">已装车</div>
        </div>
        <div class="card" style="text-align:center;">
          <div style="font-size:28px;font-weight:800;color:var(--success);">{{ stats.unpacked }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">已拆箱</div>
        </div>
        <div class="card" style="text-align:center;">
          <div style="font-size:28px;font-weight:800;color:var(--danger);">{{ stats.damaged }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">破损</div>
        </div>
      </div>

      <div v-if="vehicle" class="card">
        <div style="font-weight:700;">车型建议</div>
        <div style="font-size:14px;color:var(--text-secondary);margin-top:4px;">
          {{ vehicle.vehicle }} · {{ vehicle.suggestion }}
        </div>
      </div>

      <div class="card">
        <div style="font-weight:700;margin-bottom:8px;">拆箱进度</div>
        <div v-for="rs in roomStats" :key="rs.room" style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:14px;">
            <span>{{ rs.room }}</span>
            <span>{{ rs.unpacked }}/{{ rs.total }}</span>
          </div>
          <div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden;margin-top:4px;">
            <div :style="{width: rs.total ? `${(rs.unpacked/rs.total)*100}%` : '0%', height:'100%', background:'var(--success)', borderRadius:'999px'}"></div>
          </div>
        </div>
      </div>

      <div v-if="task.status !== 'void'" class="toolbar no-print">
        <button class="btn" @click="router.push(`/task/${task.id}/register`)">封箱登记</button>
        <button class="btn" @click="router.push(`/task/${task.id}/scan`)">扫码查箱</button>
        <button class="btn" @click="router.push(`/task/${task.id}/check`)">卸货核对</button>
        <button class="btn" @click="router.push(`/task/${task.id}/labels`)">标签打印</button>
      </div>

      <div class="card">
        <div style="font-weight:700;margin-bottom:8px;">最近封箱</div>
        <div v-if="task.boxes.length === 0" class="empty" style="padding:12px 0;">还没有箱子，去封箱登记吧</div>
        <div v-for="b in [...task.boxes].reverse().slice(0,10)" :key="b.id" class="card" @click="router.push(`/task/${task.id}/box/${b.code}`)" style="display:flex;align-items:center;gap:10px;cursor:pointer;">
          <span class="status-dot" :style="{background: statusColor(b.status)}"></span>
          <div style="flex:1;">
            <div style="font-weight:700;">{{ b.code }}</div>
            <div style="font-size:12px;color:var(--text-secondary);">{{ b.roomTo }} · {{ b.tags.join(', ') || '无标签' }}</div>
          </div>
          <span style="font-size:12px;color:var(--text-secondary);">{{ statusLabel(b.status) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
