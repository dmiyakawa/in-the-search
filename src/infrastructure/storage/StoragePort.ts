import type { GameState } from '../../application/state';

export interface StoragePort {
  save(slot: string, state: GameState): void;
  load(slot: string): GameState | null;
}

export class LocalStoragePort implements StoragePort {
  constructor(private readonly storage: Storage = localStorage) {}

  save(slot: string, state: GameState): void {
    this.storage.setItem(slot, JSON.stringify(state));
  }

  load(slot: string): GameState | null {
    const raw = this.storage.getItem(slot);
    return raw === null ? null : (JSON.parse(raw) as GameState);
  }
}
