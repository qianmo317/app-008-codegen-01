<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createTask } from '../db';
import { uid, todayStr, validateOrderForm, composeAddress } from '../utils';
import type { AddressInfo } from '../types';
import AddressFields from '../components/AddressFields.vue';

const router = useRouter();
const title = ref('');
const contactName = ref('');
const contactPhone = ref('');
const fromAddress = ref<AddressInfo>({ detail: '', isOffice: false, floor: '', unit: '' });
const toAddress = ref<AddressInfo>({ detail: '', isOffice: false, floor: '', unit: '' });
const date = ref(todayStr());
const roomsText = ref('卧室,客厅,厨房,卫生间');
const errors = ref<string[]>([]);
const submitting = ref(false);

async function submit() {
  errors.value = [];
  if (!title.value.trim()) errors.value.push('请填写任务名称');
  errors.value.push(
    ...validateOrderForm({
      contactPhone: contactPhone.value,
      fromAddress: fromAddress.value,
      toAddress: toAddress.value,
    }),
  );
  if (errors.value.length > 0) return;

  submitting.value = true;
  try {
    const rooms = roomsText.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    const task = await createTask({
      id: uid(),
      status: 'active',
      addressVersion: 1,
      addressHistory: [{ version: 1, from: fromAddress.value, to: toAddress.value, changedAt: Date.now() }],
      contactName: contactName.value.trim(),
      contactPhone: contactPhone.value.trim(),
      title: title.value.trim(),
      from: composeAddress(fromAddress.value),
      to: composeAddress(toAddress.value),
      fromAddress: fromAddress.value,
      toAddress: toAddress.value,
      date: date.value,
      rooms,
      boxes: [],
    });
    router.push(`/task/${task.id}`);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <div class="header">
      <router-link to="/" class="back">←</router-link>
      <h1>新建搬家任务</h1>
    </div>
    <div class="page">
      <div v-if="errors.length" class="error-box">
        <div v-for="(e, i) in errors" :key="i">· {{ e }}</div>
      </div>
      <div class="card">
        <label class="label">任务名称 *</label>
        <input v-model="title" class="input" placeholder="例如：2024年9月搬家" />
      </div>
      <div class="grid-2">
        <div class="card">
          <label class="label">联系人</label>
          <input v-model="contactName" class="input" placeholder="选填" />
        </div>
        <div class="card">
          <label class="label">联系电话 *</label>
          <input v-model="contactPhone" class="input" type="tel" placeholder="手机号或座机" />
        </div>
      </div>
      <AddressFields v-model="fromAddress" label="出发地址 *" />
      <AddressFields v-model="toAddress" label="目的地址 *" />
      <div class="card">
        <label class="label">搬家日期</label>
        <input v-model="date" type="date" class="input" />
      </div>
      <div class="card">
        <label class="label">房间清单（用逗号分隔）</label>
        <input v-model="roomsText" class="input" />
      </div>
      <button class="btn btn-block" :disabled="submitting" @click="submit">开单</button>
    </div>
  </div>
</template>
