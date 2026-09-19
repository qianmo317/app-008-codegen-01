import type { OrderEndpoint } from './types';

export type OrderDraft = {
  from: OrderEndpoint;
  to: OrderEndpoint;
  contactPhone: string;
};

const MOBILE_RE = /^1[3-9]\d{9}$/;
const LANDLINE_RE = /^0\d{2,3}-?\d{7,8}$/;

export function isValidPhone(phone: string): boolean {
  const s = phone.trim().replace(/\s+/g, '');
  return MOBILE_RE.test(s) || LANDLINE_RE.test(s);
}

// 判断地址是否只写了城市，例如 "杭州"、"北京市"、"浙江省杭州市"
export function isCityOnlyAddress(address: string): boolean {
  let s = address.trim().replace(/\s+/g, '');
  if (!s) return false;
  // 没有任何区/路/号等明细信息的，视为只写了城市
  if (!/[区县路街道镇乡村号栋座楼层室园苑城里弄巷0-9０-９]/.test(s)) return true;
  s = s.replace(/^[一-龥]{2,4}(省|自治区|特别行政区)/, '');
  s = s.replace(/^(北京|上海|天津|重庆)市?/, '');
  s = s.replace(/^[一-龥]{2,8}?(市|地区|盟|自治州)/, '');
  return s.length === 0;
}

export function validateEndpoint(ep: OrderEndpoint, label: string): string[] {
  const errors: string[] = [];
  const addr = ep.address.trim();
  if (!addr) {
    errors.push(`请填写${label}`);
    return errors;
  }
  if (isCityOnlyAddress(addr)) {
    errors.push(`${label}只写了城市，请补全区、街道、小区/楼栋等详细信息`);
  }
  if (ep.kind === 'office') {
    if (!ep.floor?.trim()) errors.push(`${label}是写字楼，请填写楼层`);
    if (!ep.room?.trim()) errors.push(`${label}是写字楼，请填写门牌号`);
  }
  return errors;
}

// 开单前校验：出发地址、目的地址、联系人电话必须填全
export function validateOrderDraft(draft: OrderDraft): string[] {
  const errors: string[] = [];
  errors.push(...validateEndpoint(draft.from, '出发地址'));
  errors.push(...validateEndpoint(draft.to, '目的地址'));
  if (!draft.contactPhone.trim()) {
    errors.push('请填写联系人电话');
  } else if (!isValidPhone(draft.contactPhone)) {
    errors.push('联系人电话格式不正确（请填写手机号或带区号的座机号）');
  }
  return errors;
}

export function kindLabel(kind: OrderEndpoint['kind']): string {
  return kind === 'office' ? '写字楼' : '住宅';
}

export function endpointText(ep: OrderEndpoint): string {
  let text = ep.address.trim();
  const extra = [ep.floor?.trim(), ep.room?.trim()].filter(Boolean).join(' ');
  if (extra) text += ` ${extra}`;
  return text;
}

export function endpointChanged(a: OrderEndpoint, b: OrderEndpoint): boolean {
  return (
    a.kind !== b.kind ||
    a.address.trim() !== b.address.trim() ||
    (a.floor ?? '').trim() !== (b.floor ?? '').trim() ||
    (a.room ?? '').trim() !== (b.room ?? '').trim()
  );
}
