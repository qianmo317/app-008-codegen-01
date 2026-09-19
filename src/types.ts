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

export type MoveTask = {
  id: string;
  title: string;
  from: string;
  to: string;
  date: string;
  rooms: string[];
  boxes: Box[];
  createdAt: number;
};

export type AddressKind = 'home' | 'office';

export type OrderEndpoint = {
  kind: AddressKind;
  address: string;
  floor?: string; // 写字楼必填：楼层
  room?: string; // 写字楼必填：门牌号
};

export type OrderRevision = {
  version: number; // 该快照对应的版本号
  from: OrderEndpoint;
  to: OrderEndpoint;
  changedAt: number;
};

export type OrderStatus = 'active' | 'void';

export type MoveOrder = {
  id: string;
  orderNo: string; // 单号，例如 202609-0001（年份+月份+流水）
  version: number; // 当前版本，从 1 开始，改过地址会 +1
  from: OrderEndpoint;
  to: OrderEndpoint;
  contactName?: string;
  contactPhone: string;
  moveDate: string;
  note?: string;
  status: OrderStatus;
  revisions: OrderRevision[]; // 历史版本快照（改地址前的旧地址）
  createdAt: number;
  updatedAt: number;
};
