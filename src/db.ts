import type { MoveTask, Box, OrderNoRecord } from './types';
import { localDateKey, formatOrderNo } from './utils';

const DB_NAME = 'MovingBoxTracker';
const DB_VERSION = 2;
const STORE_TASKS = 'tasks';
const STORE_META = 'meta'; // 每日流水计数器：{ key: 'seq:20260919', value: 3 }
const STORE_ORDER_NOS = 'orderNos'; // 单号登记表，废号永久留痕

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TASKS)) {
        db.createObjectStore(STORE_TASKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_ORDER_NOS)) {
        db.createObjectStore(STORE_ORDER_NOS, { keyPath: 'orderNo' });
      }
      // v1 -> v2：给存量任务补发单号、初始化地址版本
      if (event.oldVersion < 2) {
        const tx = (event.target as IDBOpenDBRequest).transaction;
        if (!tx) return;
        const tasksStore = tx.objectStore(STORE_TASKS);
        const metaStore = tx.objectStore(STORE_META);
        const orderNosStore = tx.objectStore(STORE_ORDER_NOS);
        const counters: Record<string, number> = {};
        tasksStore.openCursor().onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cursor) return;
          const t = cursor.value as MoveTask;
          if (!t.orderNo) {
            const created = typeof t.createdAt === 'number' ? t.createdAt : Date.now();
            const dk = localDateKey(created);
            const seq = (counters[dk] ?? 0) + 1;
            counters[dk] = seq;
            const orderNo = formatOrderNo(dk, seq);
            const fromAddress = t.fromAddress ?? { detail: t.from ?? '', isOffice: false };
            const toAddress = t.toAddress ?? { detail: t.to ?? '', isOffice: false };
            cursor.update({
              ...t,
              orderNo,
              status: 'active',
              addressVersion: 1,
              contactName: t.contactName ?? '',
              contactPhone: t.contactPhone ?? '',
              fromAddress,
              toAddress,
              addressHistory: [{ version: 1, from: fromAddress, to: toAddress, changedAt: created }],
              createdAt: created,
            });
            metaStore.put({ key: `seq:${dk}`, value: seq });
            orderNosStore.put({ orderNo, taskId: t.id, status: 'active', issuedAt: created });
          }
          cursor.continue();
        };
      }
    };
  });
}

export async function getAllTasks(): Promise<MoveTask[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TASKS, 'readonly');
    const store = tx.objectStore(STORE_TASKS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as MoveTask[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getTask(id: string): Promise<MoveTask | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TASKS, 'readonly');
    const store = tx.objectStore(STORE_TASKS);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as MoveTask) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTask(task: MoveTask): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TASKS, 'readwrite');
    const store = tx.objectStore(STORE_TASKS);
    const req = store.put(task);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// 开单：在同一个事务里递增当日流水、登记单号、写入任务，
// 保证同一天内单号连续不重复，也不会出现“号发出去了单子没存上”的跳号
export async function createTask(task: Omit<MoveTask, 'orderNo' | 'createdAt'>): Promise<MoveTask> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TASKS, STORE_META, STORE_ORDER_NOS], 'readwrite');
    const metaStore = tx.objectStore(STORE_META);
    const now = Date.now();
    const seqKey = `seq:${localDateKey(now)}`;
    const getReq = metaStore.get(seqKey);
    getReq.onsuccess = () => {
      const seq = ((getReq.result?.value as number) || 0) + 1;
      const orderNo = formatOrderNo(localDateKey(now), seq);
      metaStore.put({ key: seqKey, value: seq });
      const record: OrderNoRecord = { orderNo, taskId: task.id, status: 'active', issuedAt: now };
      tx.objectStore(STORE_ORDER_NOS).put(record);
      const full: MoveTask = { ...task, orderNo, createdAt: now };
      tx.objectStore(STORE_TASKS).put(full);
      tx.oncomplete = () => resolve(full);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// 作废：任务标记为已作废，单号在登记表里标记为 void，永不释放复用
export async function voidTask(id: string, reason: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TASKS, STORE_ORDER_NOS], 'readwrite');
    const tasksStore = tx.objectStore(STORE_TASKS);
    const getReq = tasksStore.get(id);
    getReq.onsuccess = () => {
      const task = getReq.result as MoveTask | undefined;
      if (!task) {
        tx.abort();
        reject(new Error('Task not found'));
        return;
      }
      const now = Date.now();
      task.status = 'void';
      task.voidedAt = now;
      task.voidReason = reason;
      tasksStore.put(task);
      const orderNosStore = tx.objectStore(STORE_ORDER_NOS);
      const noReq = orderNosStore.get(task.orderNo);
      noReq.onsuccess = () => {
        const record = noReq.result as OrderNoRecord | undefined;
        if (record) {
          record.status = 'void';
          record.voidedAt = now;
          orderNosStore.put(record);
        }
      };
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function deleteTask(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TASKS, 'readwrite');
    const store = tx.objectStore(STORE_TASKS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function addBox(taskId: string, box: Box): Promise<void> {
  const task = await getTask(taskId);
  if (!task) throw new Error('Task not found');
  task.boxes.push(box);
  await saveTask(task);
}

export async function updateBox(taskId: string, box: Box): Promise<void> {
  const task = await getTask(taskId);
  if (!task) throw new Error('Task not found');
  const idx = task.boxes.findIndex((b) => b.id === box.id);
  if (idx === -1) throw new Error('Box not found');
  task.boxes[idx] = box;
  await saveTask(task);
}

export async function deleteBox(taskId: string, boxId: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) throw new Error('Task not found');
  task.boxes = task.boxes.filter((b) => b.id !== boxId);
  await saveTask(task);
}
