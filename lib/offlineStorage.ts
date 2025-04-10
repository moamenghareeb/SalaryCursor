import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { logger } from './logger';

const DB_NAME = 'salarycursor-offline';
const DB_VERSION = 1;

interface OfflineStore {
  id?: number;
  key: string;
  value: any;
  timestamp: number;
  synced: boolean;
}

interface OfflineMutation {
  id?: number;
  url: string;
  method: string;
  body: any;
  timestamp: number;
  retries: number;
}

interface OfflineDB extends DBSchema {
  data: {
    key: number;
    value: OfflineStore;
    indexes: { 'by-key': string };
  };
  mutations: {
    key: number;
    value: OfflineMutation;
  };
}

class OfflineStorage {
  private db: IDBPDatabase<OfflineDB> | null = null;

  async init() {
    try {
      this.db = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
        upgrade(db: IDBPDatabase<OfflineDB>) {
          // Create stores
          if (!db.objectStoreNames.contains('data')) {
            const store = db.createObjectStore('data', { keyPath: 'id', autoIncrement: true });
            store.createIndex('by-key', 'key');
          }
          if (!db.objectStoreNames.contains('mutations')) {
            db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
          }
        },
      });
      logger.info('Offline storage initialized');
    } catch (error) {
      logger.error('Failed to initialize offline storage:', error);
      throw error;
    }
  }

  async set(key: string, value: any) {
    if (!this.db) await this.init();
    
    try {
      const tx = this.db!.transaction('data', 'readwrite');
      const store = tx.objectStore('data');
      
      const item: OfflineStore = {
        key,
        value,
        timestamp: Date.now(),
        synced: false
      };
      
      await store.put(item);
      await tx.done;
      
      logger.debug(`Stored offline data for key: ${key}`);
    } catch (error) {
      logger.error(`Failed to store offline data for key: ${key}`, error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    if (!this.db) await this.init();
    
    try {
      const tx = this.db!.transaction('data', 'readonly');
      const store = tx.objectStore('data');
      const index = store.index('by-key');
      
      const items = await index.getAll(key);
      return items[0]?.value;
    } catch (error) {
      logger.error(`Failed to retrieve offline data for key: ${key}`, error);
      throw error;
    }
  }

  async queueMutation(mutation: { url: string; method: string; body: any }) {
    if (!this.db) await this.init();
    
    try {
      const tx = this.db!.transaction('mutations', 'readwrite');
      const store = tx.objectStore('mutations');
      
      const mutationToStore: OfflineMutation = {
        ...mutation,
        timestamp: Date.now(),
        retries: 0
      };
      
      await store.add(mutationToStore);
      await tx.done;
      logger.debug('Queued mutation for offline sync');
    } catch (error) {
      logger.error('Failed to queue mutation:', error);
      throw error;
    }
  }

  async processMutationQueue() {
    if (!this.db) await this.init();
    
    try {
      const tx = this.db!.transaction('mutations', 'readwrite');
      const store = tx.objectStore('mutations');
      const mutations = await store.getAll();
      
      for (const mutation of mutations) {
        try {
          const response = await fetch(mutation.url, {
            method: mutation.method,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(mutation.body)
          });
          
          if (response.ok) {
            await store.delete(mutation.id!);
            logger.info(`Successfully processed queued mutation ${mutation.id}`);
          } else {
            mutation.retries++;
            if (mutation.retries >= 3) {
              await store.delete(mutation.id!);
              logger.warn(`Discarding failed mutation after 3 retries: ${mutation.id}`);
            } else {
              await store.put(mutation);
              logger.warn(`Mutation ${mutation.id} failed, will retry (attempt ${mutation.retries}/3)`);
            }
          }
        } catch (error) {
          logger.error(`Error processing mutation ${mutation.id}:`, error);
        }
      }
      
      await tx.done;
    } catch (error) {
      logger.error('Failed to process mutation queue:', error);
      throw error;
    }
  }

  async clearOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000) { // Default 7 days
    if (!this.db) await this.init();
    
    try {
      const tx = this.db!.transaction('data', 'readwrite');
      const store = tx.objectStore('data');
      const items = await store.getAll();
      
      const now = Date.now();
      for (const item of items) {
        if (now - item.timestamp > maxAge) {
          await store.delete(item.id!);
        }
      }
      
      await tx.done;
      logger.info('Cleared old offline data');
    } catch (error) {
      logger.error('Failed to clear old data:', error);
      throw error;
    }
  }
}

export const offlineStorage = new OfflineStorage(); 