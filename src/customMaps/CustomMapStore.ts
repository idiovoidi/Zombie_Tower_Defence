import { pickJsonFileText } from './pickJsonFile';
import { type CustomMapDocument, createEmptyCustomMapDocument } from './types';
import { assertValidCustomMap, validateCustomMap } from './validateCustomMap';

const STORAGE_KEY = 'ztd_custom_maps_v1';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // SSR / restricted environments
  }
  return null;
}

/**
 * Persist and share custom maps via localStorage + JSON export/import.
 */
export class CustomMapStore {
  private storage: StorageLike | null;

  constructor(storage: StorageLike | null = getDefaultStorage()) {
    this.storage = storage;
  }

  public list(): CustomMapDocument[] {
    return Object.values(this.readAll()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public get(id: string): CustomMapDocument | undefined {
    return this.readAll()[id];
  }

  public save(doc: CustomMapDocument): CustomMapDocument {
    assertValidCustomMap(doc);
    const toSave: CustomMapDocument = {
      ...doc,
      updatedAt: new Date().toISOString(),
    };
    const all = this.readAll();
    all[toSave.id] = toSave;
    this.writeAll(all);
    return toSave;
  }

  public delete(id: string): boolean {
    const all = this.readAll();
    if (!(id in all)) {
      return false;
    }
    delete all[id];
    this.writeAll(all);
    return true;
  }

  public serialize(doc: CustomMapDocument): string {
    assertValidCustomMap(doc);
    return `${JSON.stringify(doc, null, 2)}\n`;
  }

  public parse(json: string): CustomMapDocument {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON');
    }
    assertValidCustomMap(parsed);
    return parsed;
  }

  /**
   * Import JSON text. Optionally assign a new id to avoid collisions.
   */
  public importFromJson(json: string, options?: { newId?: boolean }): CustomMapDocument {
    const parsed = this.parse(json);
    const doc = options?.newId
      ? {
          ...parsed,
          id: createEmptyCustomMapDocument().id,
          updatedAt: new Date().toISOString(),
        }
      : parsed;
    return this.save(doc);
  }

  /**
   * Trigger a browser file download for sharing.
   */
  public exportToFile(doc: CustomMapDocument, filename?: string): void {
    const text = this.serialize(doc);
    const safeName = (
      filename ?? `${doc.name.replace(/[^\w-]+/g, '_') || 'custom_map'}.json`
    ).replace(/\s+/g, '_');

    if (typeof document === 'undefined') {
      return;
    }

    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeName.endsWith('.json') ? safeName : `${safeName}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  /**
   * Open a file picker and return the parsed/saved document, or null if cancelled.
   */
  public async importFromFilePicker(options?: {
    newId?: boolean;
  }): Promise<CustomMapDocument | null> {
    const text = await pickJsonFileText();
    return text === null ? null : this.importFromJson(text, options);
  }

  public tryParse(
    json: string
  ): { ok: true; doc: CustomMapDocument } | { ok: false; errors: string[] } {
    try {
      const parsed = JSON.parse(json) as unknown;
      const result = validateCustomMap(parsed);
      if (!result.valid) {
        return { ok: false, errors: result.errors };
      }
      return { ok: true, doc: parsed as CustomMapDocument };
    } catch {
      return { ok: false, errors: ['Invalid JSON'] };
    }
  }

  private readAll(): Record<string, CustomMapDocument> {
    if (!this.storage) {
      return {};
    }
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {};
      }
      const out: Record<string, CustomMapDocument> = {};
      for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
        const check = validateCustomMap(value);
        if (check.valid) {
          out[id] = value as CustomMapDocument;
        }
      }
      return out;
    } catch {
      return {};
    }
  }

  private writeAll(all: Record<string, CustomMapDocument>): void {
    if (!this.storage) {
      return;
    }
    this.storage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}

export const customMapStore = new CustomMapStore();
