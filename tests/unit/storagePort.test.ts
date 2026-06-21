import { describe, expect, test } from 'vitest';
import { GameService } from '../../src/application/GameService';
import { LocalStoragePort } from '../../src/infrastructure/storage/StoragePort';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('LocalStoragePort', () => {
  test('saves and loads GameState as JSON', () => {
    const storage = new MemoryStorage();
    const port = new LocalStoragePort(storage);
    const state = GameService.newGame(123);

    port.save('slot-a', state);

    expect(port.load('slot-a')).toEqual(state);
  });

  test('load returns null for empty slot', () => {
    const port = new LocalStoragePort(new MemoryStorage());
    expect(port.load('missing')).toBeNull();
  });
});
