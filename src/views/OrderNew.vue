<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { nextOrderNo, saveOrder } from '../db';
import { uid, todayStr } from '../utils';
import { validateOrderDraft } from '../orderRules';
import type { MoveOrder, OrderEndpoint } from '../types';

const router = useRouter();

function emptyEndpoint(): OrderEndpoint {
  return { kind: 'home', address: '', floor: '', room: '' };
}

const from = ref<OrderEndpoint>(emptyEndpoint());
const to = ref<OrderEndpoint>(emptyEndpoint());
const contactName = ref('');
const contactPhone = ref('');
const moveDate = ref(todayStr());
const note = ref('');
const errors = ref<string[]>([]);
const saving = ref(false);

async function submit() {
  errors.value = validateOrderDraft({
    from: from.value,
    to: to.value,
    contactPhone: contactPhone.value,
  });
  if (errors.value.length > 0) return;
  if (saving.value) return;
  saving.value = true;
  try {
    // 单号按开单当天的 年份+月份+流水 生成
    const orderNo = await nextOrderNo(todayStr());
    const order: MoveOrder = {
      id: uid(),
      orderNo,
      version: 1,
      from: { ...from.value },
      to: { ...to.value },
      contactName: contactName.value.trim() || undefined,
      contactPhone: contactPhone.value.trim(),
      moveDate: moveDate.value,
      note: note.value.trim() || undefined,
      status: 'active',
      revisions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveOrder(order);
    router.push(`/orders/${order.id}`);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <div class="header">
      <router-link to="/orders" class="back">←</router-link>
      <h1>开新单</h1>
    </div>
    <div class="page">
      <div v-if="errors.length > 0" class="card" style="border-color:var(--danger);">
        <div style="font-weight:700;color:var(--danger);margin-bottom:6px;">开单前请补全以下信息</div>
        <div v-for="(e, i) in errors" :key="i" style="font-size:14px;color:var(--danger);margin-top:4px;">
          · {{ e }}
        </div>
      </div>

      <div class="card">
        <label class="label">出发地址类型</label>
        <select v-model="from.kind" class="select">
          <option value="home">住宅</option>
          <option value="office">写字楼</option>
        </select>
        <label class="label" style="margin-top:10px;">出发地址</label>
        <input v-model="from.address" class="input" placeholder="区、街道、小区/楼栋，例如：朝阳区建国路88号" />
        <template v-if="from.kind === 'office'">
          <div class="grid-2" style="margin-top:10px;">
            <div>
              <label class="label">楼层</label>
              <input v-model="from.floor" class="input" placeholder="例如：12层" />
            </div>
            <div>
              <label class="label">门牌号</label>
              <input v-model="from.room" class="input" placeholder="例如：1208室" />
            </div>
          </div>
        </template>
      </div>

      <div class="card">
        <label class="label">目的地址类型</label>
        <select v-model="to.kind" class="select">
          <option value="home">住宅</option>
          <option value="office">写字楼</option>
        </select>
        <label class="label" style="margin-top:10px;">目的地址</label>
        <input v-model="to.address" class="input" placeholder="区、街道、小区/楼栋，例如：海淀区中关村大街1号" />
        <template v-if="to.kind === 'office'">
          <div class="grid-2" style="margin-top:10px;">
            <div>
              <label class="label">楼层</label>
              <input v-model="to.floor" class="input" placeholder="例如：3层" />
            </div>
            <div>
              <label class="label">门牌号</label>
              <input v-model="to.room" class="input" placeholder="例如：301室" />
            </div>
          </div>
        </template>
      </div>

      <div class="card">
        <label class="label">联系人（选填）</label>
        <input v-model="contactName" class="input" placeholder="例如：王先生" />
        <label class="label" style="margin-top:10px;">联系人电话</label>
        <input v-model="contactPhone" class="input" type="tel" placeholder="手机号或座机号" />
      </div>

      <div class="card">
        <label class="label">搬家日期</label>
        <input v-model="moveDate" type="date" class="input" />
        <label class="label" style="margin-top:10px;">备注（选填）</label>
        <textarea v-model="note" class="textarea" rows="2"></textarea>
      </div>

      <button class="btn btn-block" :disabled="saving" @click="submit">
        {{ saving ? '开单中…' : '校验并开单' }}
      </button>
    </div>
  </div>
</template>
