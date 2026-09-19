<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { getAllOrders } from '../db';
import { endpointText } from '../orderRules';
import type { MoveOrder } from '../types';

const router = useRouter();
const orders = ref<MoveOrder[]>([]);

const sorted = computed(() =>
  [...orders.value].sort((a, b) => b.createdAt - a.createdAt),
);

async function load() {
  orders.value = await getAllOrders();
}

onMounted(load);
</script>

<template>
  <div>
    <div class="header">
      <router-link to="/" class="back">←</router-link>
      <h1>搬家工单</h1>
    </div>
    <div class="page">
      <button class="btn btn-block" @click="router.push('/orders/new')">+ 开新单</button>
      <div v-if="sorted.length === 0" class="empty">暂无工单，点击上方按钮开单</div>
      <div v-for="o in sorted" :key="o.id" class="card" style="cursor:pointer;margin-top:12px;" @click="router.push(`/orders/${o.id}`)">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-weight:800;font-size:16px;">{{ o.orderNo }}</span>
          <span class="badge badge-info">V{{ o.version }}</span>
          <span v-if="o.status === 'void'" class="badge badge-danger">已作废</span>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);margin-top:6px;">
          {{ endpointText(o.from) }} → {{ endpointText(o.to) }}
        </div>
        <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">
          {{ o.contactName || '联系人未填' }} · {{ o.contactPhone }} · {{ o.moveDate }}
        </div>
      </div>
    </div>
  </div>
</template>
