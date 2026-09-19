export type BoxStatus = 'packed' | 'loaded' | 'arrived' | 'unpacked' | 'damaged' | 'missing';

export type Box = {
  id: string;
  code: string; // e.g. A-014
  roomFrom: string;
  roomTo: string;
  tags: string[];
  fragile: boolean;
  liquid: boolean;
  photo?: string; // compressed dataURL
  weightKg?: number;
  status: BoxStatus;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type AddressInfo = {
  detail: string; // 详细地址（省市区+街道门牌）
  isOffice: boolean; // 是否写字楼/办公场所
  floor?: string; // 楼层（写字楼必填）
  unit?: string; // 门牌号（写字楼必填）
};

export type AddressRevision = {
  version: number;
  from: AddressInfo;
  to: AddressInfo;
  changedAt: number;
};

export type TaskStatus = 'active' | 'void';

export type MoveTask = {
  id: string;
  orderNo: string; // 单号，如 MV20260919-003
  status: TaskStatus;
  addressVersion: number; // 当前地址版本，从 1 开始
  addressHistory: AddressRevision[]; // 每次改地址追加一条
  contactName: string;
  contactPhone: string;
  title: string;
  from: string; // 组合后的展示地址
  to: string;
  fromAddress: AddressInfo;
  toAddress: AddressInfo;
  date: string;
  rooms: string[];
  boxes: Box[];
  createdAt: number;
  voidedAt?: number;
  voidReason?: string;
};

// 单号登记表：所有发出去的号（含作废）都留痕，废号永不复用
export type OrderNoRecord = {
  orderNo: string;
  taskId: string;
  status: TaskStatus;
  issuedAt: number;
  voidedAt?: number;
};
