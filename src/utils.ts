import QRCode from 'qrcode';
import type { MoveTask, BoxStatus, AddressInfo } from './types';

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------- 单号 ----------

export function localDateKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// 单号 = 前缀 + 年月日 + 当日流水，如 MV20260919-003
export function formatOrderNo(dateKey: string, seq: number): string {
  return `MV${dateKey}-${String(seq).padStart(3, '0')}`;
}

// ---------- 开单校验 ----------

export function validatePhone(raw: string): string | null {
  const phone = raw.trim().replace(/[\s-]/g, '');
  if (!phone) return '请填写联系电话';
  if (/^1[3-9]\d{9}$/.test(phone)) return null; // 手机号
  if (/^0\d{9,11}$/.test(phone)) return null; // 座机：区号 + 号码
  return '联系电话格式不正确（手机号 11 位，或区号+座机号）';
}

// 详细地址里应出现的“落地”信息：数字/字母或街道、门牌类关键字
const ADDRESS_DETAIL_SIGNALS =
  /[0-9０-９A-Za-z]|路|街|巷|弄|号|栋|幢|座|楼|村|屯|小区|苑|园|院|大厦|广场|中心|大道|镇|乡|单元|室|层|坊|里|胡同/;

// 只写了城市/区县、没有任何街道门牌信息的地址一律拦住
export function isAddressTooVague(detail: string): boolean {
  const s = detail.trim();
  if (s.length < 4) return true;
  return !ADDRESS_DETAIL_SIGNALS.test(s);
}

export function looksLikeOffice(detail: string): boolean {
  return /写字楼|大厦|办公楼|商务楼|商务中心|SOHO|soho|总部|园区|产业园/.test(detail);
}

// 写字楼（手动勾选或地址关键字识别）必须带楼层与门牌
export function needsFloorUnit(addr: AddressInfo): boolean {
  return addr.isOffice || looksLikeOffice(addr.detail);
}

export function validateAddress(addr: AddressInfo, label: string): string | null {
  const detail = addr.detail.trim();
  if (!detail) return `请填写${label}`;
  if (isAddressTooVague(detail)) {
    return `${label}只写到了城市/区县，请补充街道、小区、门牌等详细信息`;
  }
  if (needsFloorUnit(addr)) {
    if (!addr.floor?.trim()) return `${label}是写字楼，请填写楼层`;
    if (!addr.unit?.trim()) return `${label}是写字楼，请填写门牌号`;
  }
  return null;
}

export function validateOrderForm(input: {
  contactPhone: string;
  fromAddress: AddressInfo;
  toAddress: AddressInfo;
}): string[] {
  const errors: string[] = [];
  const phoneErr = validatePhone(input.contactPhone);
  if (phoneErr) errors.push(phoneErr);
  const fromErr = validateAddress(input.fromAddress, '出发地址');
  if (fromErr) errors.push(fromErr);
  const toErr = validateAddress(input.toAddress, '目的地址');
  if (toErr) errors.push(toErr);
  return errors;
}

// 组合展示用地址：详细地址 +（楼层 门牌）
export function composeAddress(addr: AddressInfo): string {
  const detail = addr.detail.trim();
  const floor = addr.floor?.trim();
  const unit = addr.unit?.trim();
  if (!floor && !unit) return detail;
  const parts: string[] = [];
  if (floor) parts.push(`${floor.replace(/[层楼]$/, '')}层`);
  if (unit) parts.push(unit);
  return `${detail}（${parts.join(' ')}）`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function generateBoxCode(task: MoveTask, roomTo: string): string {
  const prefix = roomTo.charAt(0).toUpperCase();
  const sameRoomBoxes = task.boxes.filter((b) => b.roomTo === roomTo);
  const seq = sameRoomBoxes.length + 1;
  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

export async function generateQRDataURL(taskId: string, code: string): Promise<string> {
  const text = `movedoc://${taskId}/${code}`;
  return QRCode.toDataURL(text, { width: 256, margin: 2 });
}

export function compressImage(file: File, maxLongEdge = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const longEdge = Math.max(width, height);
      if (longEdge > maxLongEdge) {
        const ratio = maxLongEdge / longEdge;
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export function vibrateShort(): void {
  if (navigator.vibrate) navigator.vibrate(50);
}

export function playBeep(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // ignore
  }
}

export function parseQRContent(text: string): { taskId?: string; code?: string } {
  const match = text.match(/^movedoc:\/\/([^/]+)\/(.+)$/);
  if (!match) return {};
  return { taskId: match[1], code: match[2] };
}

export function statusColor(status: BoxStatus): string {
  switch (status) {
    case 'packed':
      return '#9ca3af';
    case 'loaded':
      return '#3b82f6';
    case 'arrived':
      return '#22c55e';
    case 'unpacked':
      return '#10b981';
    case 'damaged':
      return '#ef4444';
    case 'missing':
      return '#f59e0b';
    default:
      return '#9ca3af';
  }
}

export function statusLabel(status: BoxStatus): string {
  const map: Record<BoxStatus, string> = {
    packed: '待打包',
    loaded: '已装车',
    arrived: '已到达',
    unpacked: '已拆箱',
    damaged: '破损',
    missing: '缺失',
  };
  return map[status];
}

export function estimateVehicle(boxCount: number, avgVolumeM3 = 0.08): { vehicle: string; suggestion: string } {
  const totalVolume = boxCount * avgVolumeM3;
  if (totalVolume <= 8) return { vehicle: '面包车/小型货车', suggestion: '建议选用 4.2m 厢式货车或面包车' };
  if (totalVolume <= 18) return { vehicle: '中型货车', suggestion: '建议选用 6.8m 厢式货车' };
  return { vehicle: '大型货车/多车', suggestion: '箱数较多，建议选用 9.6m 货车或分多车运输' };
}

export function roomProgress(task: MoveTask, room: string): { total: number; unpacked: number; damaged: number } {
  const boxes = task.boxes.filter((b) => b.roomTo === room);
  return {
    total: boxes.length,
    unpacked: boxes.filter((b) => b.status === 'unpacked').length,
    damaged: boxes.filter((b) => b.status === 'damaged').length,
  };
}
