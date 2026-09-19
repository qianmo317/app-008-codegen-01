<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getTask, saveTask } from '../db';
import { validateOrderForm, composeAddress } from '../utils';
import type { MoveTask, AddressInfo } from '../types';
import AddressFields from '../components/AddressFields.vue';

const route = useRoute();
const router = useRouter();
const task = ref<MoveTask | null>(null);
const title = ref('');
const contactName = ref('');
const contactPhone = ref('');
const fromAddress = ref<AddressInfo>({ detail: '', isOffice: false, floor: '', unit: '' });
const toAddress = ref<AddressInfo>({ detail: '', isOffice: false, floor: '', unit: '' });
const errors = ref<string[]>([]);

async function load() {
  const t = await getTask(route.params.id as string);
  if (!t) {
    router.replace('/');
    return;
  }
  if (t.status === 'void') {
    alert('该单已作废，不能再修改');
    router.replace(`/task/${t.id}`);
    return;
  }
  task.value = t;
  title.value = t.title;
  contactName.value = t.contactName;
  contactPhone.value = t.contactPhone;
  fromAddress.value = { ...t.fromAddress };
  toAddress.value = { ...t.toAddress };
}

async function submit() {
  if (!task.value) return;
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

  const t = task.value;
  const addressChanged =
    JSON.stringify(fromAddress.value) !== JSON.stringify(t.fromAddress) ||
    JSON.stringify(toAddress.value) !== JSON.stringify(t.toAddress);

  const updated: MoveTask = {
    ...t,
    title: title.value.trim(),
    contactName: contactName.value.trim(),
    contactPhone: contactPhone.value.trim(),
    fromAddress: fromAddress.value,
    toAddress: toAddress.value,
    from: composeAddress(fromAddress.value),
    to: composeAddress(toAddress.value),
  };
  // 地址有变动才升版本，并留一版快照
  if (addressChanged) {
    updated.addressVersion = t.addressVersion + 1;
    updated.addressHistory = [
      ...t.addressHistory,
      { version: updated.addressVersion, from: fromAddress.value, to: toAddress.value, changedAt: Date.now() },
    ];
  }
  await saveTask(updated);
  router.push(`/task/${t.id}`);
}

onMounted(load);
</script>

<template>
  <div v-if="task">
    <div class="header">
      <router-link :to="`/task/${task.id}`" class="back">←</router-link>
      <h1>修改单据 {{ task.orderNo }}</h1>
    </div>
    <div class="page">
      <div class="card" style="font-size:13px;color:var(--text-secondary);">
        当前为第 {{ task.addressVersion }} 版地址；保存时若地址有变动，会自动生成新版本并保留历史。
      </div>
      <div v-if="errors.length" class="error-box">
        <div v-for="(e, i) in errors" :key="i">· {{ e }}</div>
      </div>
      <div class="card">
        <label class="label">任务名称 *</label>
        <input v-model="title" class="input" />
      </div>
      <div class="grid-2">
        <div class="card">
          <label class="label">联系人</label>
          <input v-model="contactName" class="input" placeholder="选填" />
        </div>
        <div class="card">
          <label class="label">联系电话 *</label>
          <input v-model="contactPhone" class="input" type="tel" />
        </div>
      </div>
      <AddressFields v-model="fromAddress" label="出发地址 *" />
      <AddressFields v-model="toAddress" label="目的地址 *" />
      <button class="btn btn-block" @click="submit">保存修改</button>
    </div>
  </div>
</template>
