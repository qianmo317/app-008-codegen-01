<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAllTasks, deleteTask, voidTask } from '../db';
import type { MoveTask } from '../types';

const router = useRouter();
const tasks = ref<MoveTask[]>([]);

async function load() {
  const all = await getAllTasks();
  // 未作废的排前面，作废的沉底
  tasks.value = all.sort((a, b) => {
    if ((a.status === 'void') !== (b.status === 'void')) return a.status === 'void' ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
}

async function voidOne(t: MoveTask) {
  if (!confirm(`确定作废单号 ${t.orderNo}？\n作废后该单号不可恢复、也不会再被使用。`)) return;
  const reason = prompt('作废原因（可留空）') ?? '';
  await voidTask(t.id, reason.trim());
  await load();
}

async function remove(t: MoveTask) {
  if (!confirm(`确定删除该任务？${t.orderNo ? `\n单号 ${t.orderNo} 已作废，删除后该号也不会再被使用。` : ''}`)) return;
  await deleteTask(t.id);
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <div class="header">
      <h1>搬家打包追踪器</h1>
    </div>
    <div class="page">
      <button class="btn btn-block" @click="router.push('/new')">+ 新建搬家任务</button>
      <div v-if="tasks.length === 0" class="empty">暂无任务，点击上方按钮新建</div>
      <div
        v-for="t in tasks"
        :key="t.id"
        class="card"
        :style="t.status === 'void' ? 'opacity:0.55;' : ''"
        @click="router.push(`/task/${t.id}`)"
      >
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="mono" style="font-weight:700;font-size:15px;">{{ t.orderNo || '未编号' }}</span>
              <span class="badge badge-version">第{{ t.addressVersion || 1 }}版</span>
              <span v-if="t.status === 'void'" class="badge badge-void">已作废</span>
            </div>
            <div style="font-weight:600;font-size:14px;margin-top:4px;">{{ t.title }}</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;overflow:hidden;text-overflow:ellipsis;">
              {{ t.from }} → {{ t.to }} · {{ t.date }} · {{ t.boxes.length }} 箱
            </div>
          </div>
          <button
            v-if="t.status !== 'void' && t.orderNo"
            class="btn btn-danger no-print"
            style="padding:8px 12px;font-size:13px;flex-shrink:0;"
            @click.stop="voidOne(t)"
          >作废</button>
          <button
            v-else
            class="btn btn-secondary no-print"
            style="padding:8px 12px;font-size:13px;flex-shrink:0;"
            @click.stop="remove(t)"
          >删除</button>
        </div>
      </div>
    </div>
  </div>
</template>
