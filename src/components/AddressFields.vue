<script setup lang="ts">
import { computed } from 'vue';
import { looksLikeOffice, needsFloorUnit } from '../utils';
import type { AddressInfo } from '../types';

const props = defineProps<{ label: string; modelValue: AddressInfo }>();
const emit = defineEmits<{ 'update:modelValue': [AddressInfo] }>();

const office = computed(() => needsFloorUnit(props.modelValue));

function update(patch: Partial<AddressInfo>) {
  emit('update:modelValue', { ...props.modelValue, ...patch });
}

function onDetail(e: Event) {
  const detail = (e.target as HTMLInputElement).value;
  // 地址里出现大厦/写字楼等关键字时自动勾选“写字楼”
  update(looksLikeOffice(detail) ? { detail, isOffice: true } : { detail });
}
</script>

<template>
  <div class="card">
    <label class="label">{{ label }}</label>
    <input
      :value="modelValue.detail"
      class="input"
      placeholder="省市区 + 街道/小区/门牌，只写城市会被拦截"
      @input="onDetail"
    />
    <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:14px;cursor:pointer;">
      <input
        type="checkbox"
        :checked="modelValue.isOffice"
        @change="update({ isOffice: ($event.target as HTMLInputElement).checked })"
      />
      写字楼 / 办公场所
    </label>
    <div v-if="office" class="grid-2" style="margin-top:10px;">
      <div>
        <label class="label">楼层 *</label>
        <input
          :value="modelValue.floor"
          class="input"
          placeholder="如 15 或 B1"
          @input="update({ floor: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div>
        <label class="label">门牌号 *</label>
        <input
          :value="modelValue.unit"
          class="input"
          placeholder="如 1501室"
          @input="update({ unit: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>
  </div>
</template>
