<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { getOrder, saveOrder } from '../db';
import { validateEndpoint, endpointText, endpointChanged, kindLabel } from '../orderRules';
import type { MoveOrder, OrderEndpoint } from '../types';

const route = useRoute();
const order = ref<MoveOrder | null>(null);

const editing = ref(false);
const editFrom = ref<OrderEndpoint>({ kind: 'home', address: '' });
const editTo = ref<OrderEndpoint>({ kind: 'home', address: '' });
const errors = ref<string[]>([]);

const history = computed(() =>
  order.value ? [...order.value.revisions].sort((a, b) => b.version - a.version) : [],
);

async function load() {
  order.value = await getOrder(route.params.id as string);
}

function startEdit() {
  if (!order.value || order.value.status === 'void') return;
  editFrom.value = { ...order.value.from };
  editTo.value = { ...order.value.to };
  errors.value = [];
  editing.value = true;
}

async function saveEdit() {
  if (!order.value) return;
  errors.value = [
    ...validateEndpoint(editFrom.value, '出发地址'),
    ...validateEndpoint(editTo.value, '目的地址'),
  ];
  if (errors.value.length > 0) return;
  const changed =
    endpointChanged(editFrom.value, order.value.from) ||
    endpointChanged(editTo.value, order.value.to);
  if (!changed) {
    errors.value = ['地址没有变化，无需生成新版本'];
    return;
  }
  // 把当前地址存为历史快照，版本号 +1，单号保持不变
  order.value.revisions.push({
    version: order.value.version,
    from: { ...order.value.from },
    to: { ...order.value.to },
    changedAt: Date.now(),
  });
  order.value.version += 1;
  order.value.from = { ...editFrom.value };
  order.value.to = { ...editTo.value };
  order.value.updatedAt = Date.now();
  await saveOrder(order.value);
  editing.value = false;
}

async function voidOrder() {
  if (!order.value || order.value.status === 'void') return;
  if (!confirm(`确定作废单号 ${order.value.orderNo}？作废后该单号不会再被使用。`)) return;
  order.value.status = 'void';
  order.value.updatedAt = Date.now();
  await saveOrder(order.value);
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN');
}

onMounted(load);
</script>

<template>
  <div v-if="order">
    <div class="header">
      <router-link to="/orders" class="back">←</router-link>
      <h1>工单详情</h1>
    </div>
    <div class="page">
      <div class="card" style="text-align:center;">
        <div style="font-size:24px;font-weight:800;">{{ order.orderNo }}</div>
        <div style="margin-top:6px;display:flex;justify-content:center;gap:8px;">
          <span class="badge badge-info">第 V{{ order.version }} 版</span>
          <span v-if="order.status === 'void'" class="badge badge-danger">已作废</span>
        </div>
      </div>

      <div class="card">
        <div style="font-weight:700;margin-bottom:8px;">地址信息</div>
        <div style="font-size:14px;margin-bottom:6px;">
          <span style="color:var(--text-secondary);">出发（{{ kindLabel(order.from.kind) }}）：</span>
          {{ endpointText(order.from) }}
        </div>
        <div style="font-size:14px;">
          <span style="color:var(--text-secondary);">目的（{{ kindLabel(order.to.kind) }}）：</span>
          {{ endpointText(order.to) }}
        </div>
      </div>

      <div class="card">
        <div style="font-weight:700;margin-bottom:8px;">联系与日期</div>
        <div style="font-size:14px;margin-bottom:6px;">
          <span style="color:var(--text-secondary);">联系人：</span>{{ order.contactName || '未填' }}
        </div>
        <div style="font-size:14px;margin-bottom:6px;">
          <span style="color:var(--text-secondary);">电话：</span>{{ order.contactPhone }}
        </div>
        <div style="font-size:14px;margin-bottom:6px;">
          <span style="color:var(--text-secondary);">搬家日期：</span>{{ order.moveDate }}
        </div>
        <div v-if="order.note" style="font-size:14px;">
          <span style="color:var(--text-secondary);">备注：</span>{{ order.note }}
        </div>
      </div>

      <div v-if="history.length > 0" class="card">
        <div style="font-weight:700;margin-bottom:8px;">历史版本（改地址记录）</div>
        <div v-for="rev in history" :key="rev.version" style="border-top:1px solid var(--border);padding-top:8px;margin-top:8px;">
          <div style="font-size:13px;font-weight:700;">
            <span class="badge">V{{ rev.version }}</span>
            <span style="color:var(--text-secondary);font-weight:400;margin-left:6px;">{{ fmtTime(rev.changedAt) }} 被替换</span>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">
            出发：{{ endpointText(rev.from) }}
          </div>
          <div style="font-size:13px;color:var(--text-secondary);">
            目的：{{ endpointText(rev.to) }}
          </div>
        </div>
      </div>

      <template v-if="order.status === 'active'">
        <div v-if="!editing" class="toolbar no-print">
          <button class="btn" @click="startEdit">修改地址（新版本）</button>
          <button class="btn btn-danger" @click="voidOrder">作废此单</button>
        </div>

        <template v-else>
          <div v-if="errors.length > 0" class="card" style="border-color:var(--danger);">
            <div v-for="(e, i) in errors" :key="i" style="font-size:14px;color:var(--danger);margin-top:4px;">
              · {{ e }}
            </div>
          </div>
          <div class="card">
            <label class="label">出发地址类型</label>
            <select v-model="editFrom.kind" class="select">
              <option value="home">住宅</option>
              <option value="office">写字楼</option>
            </select>
            <label class="label" style="margin-top:10px;">出发地址</label>
            <input v-model="editFrom.address" class="input" />
            <template v-if="editFrom.kind === 'office'">
              <div class="grid-2" style="margin-top:10px;">
                <div>
                  <label class="label">楼层</label>
                  <input v-model="editFrom.floor" class="input" placeholder="例如：12层" />
                </div>
                <div>
                  <label class="label">门牌号</label>
                  <input v-model="editFrom.room" class="input" placeholder="例如：1208室" />
                </div>
              </div>
            </template>
          </div>
          <div class="card">
            <label class="label">目的地址类型</label>
            <select v-model="editTo.kind" class="select">
              <option value="home">住宅</option>
              <option value="office">写字楼</option>
            </select>
            <label class="label" style="margin-top:10px;">目的地址</label>
            <input v-model="editTo.address" class="input" />
            <template v-if="editTo.kind === 'office'">
              <div class="grid-2" style="margin-top:10px;">
                <div>
                  <label class="label">楼层</label>
                  <input v-model="editTo.floor" class="input" placeholder="例如：3层" />
                </div>
                <div>
                  <label class="label">门牌号</label>
                  <input v-model="editTo.room" class="input" placeholder="例如：301室" />
                </div>
              </div>
            </template>
          </div>
          <div class="toolbar no-print">
            <button class="btn" @click="saveEdit">保存为 V{{ order.version + 1 }}</button>
            <button class="btn btn-secondary" @click="editing = false">取消</button>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
