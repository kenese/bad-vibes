import { CollectionService } from "./collectionService";

class CollectionManager {
  private instances = new Map<string, { service: CollectionService; lastAccess: number }>();
  private readonly MAX_INSTANCES = 10;
  private readonly TTL = 1000 * 60 * 30; // 30 minutes

  constructor() {
    // Cleanup interval
    setInterval(() => this.cleanup(), 1000 * 60 * 5);
  }

  getService(userId: string, filePath: string): CollectionService {
    const existing = this.instances.get(userId);
    if (existing) {
      existing.lastAccess = Date.now();
      return existing.service;
    }

    const service = new CollectionService(userId, filePath);
    this.instances.set(userId, { service, lastAccess: Date.now() });

    if (this.instances.size > this.MAX_INSTANCES) {
      this.evictOldest();
    }

    return service;
  }

  async setFromMemory(userId: string, xmlContent: string): Promise<void> {
    const service = new CollectionService(userId, `memory:${userId}`);
    await service.loadFromXml(xmlContent);
    this.instances.set(userId, { service, lastAccess: Date.now() });
    
    if (this.instances.size > this.MAX_INSTANCES) {
      this.evictOldest();
    }
  }

  invalidate(userId: string) {
    this.instances.delete(userId);
  }

  hasMemoryInstance(userId: string): boolean {
    const existing = this.instances.get(userId);
    return !!existing;
  }

  getBlobPathname(userId: string): string {
    return `collections/${userId}/collection.nml`;
  }

  private evictOldest() {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.instances.entries()) {
      if (value.lastAccess < oldestTime) {
        oldestTime = value.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.instances.delete(oldestKey);
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.instances.entries()) {
      if (now - value.lastAccess > this.TTL) {
        this.instances.delete(key);
      }
    }
  }
}

export const collectionManager = new CollectionManager();
