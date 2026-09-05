import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface EncryptedNoteRow {
  id?: number;
  encryptedTitle: string;
  titleIv: string;
  encryptedContent: string;
  contentIv: string;
  categoryTag: string;
  isSensitive: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface EncryptedTodoRow {
  id?: number;
  encryptedTitle: string;
  titleIv: string;
  completed: boolean;
  isArchived?: boolean;
  priority: 'urgent' | 'important' | 'neutral' | 'if_time';
  dueDate?: string; // YYYY-MM-DDTHH:mm
  createdAt: number;
  updatedAt: number;
}

interface VaultDBSchema extends DBSchema {
  encrypted_notes: {
    key: number;
    value: EncryptedNoteRow;
    indexes: { 'by-tag': string; 'by-updated': number };
  };
  encrypted_todos: {
    key: number;
    value: EncryptedTodoRow;
    indexes: { 'by-completed': number; 'by-updated': number };
  };
}

let dbPromise: Promise<IDBPDatabase<VaultDBSchema>> | null = null;

export function getDatabase() {
  if (!dbPromise) {
    dbPromise = openDB<VaultDBSchema>('secure_vault_notes_db', 7, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('encrypted_notes')) {
          const store = db.createObjectStore('encrypted_notes', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by-tag', 'categoryTag');
          store.createIndex('by-updated', 'updatedAt');
        }

        if (!db.objectStoreNames.contains('encrypted_todos')) {
          const todoStore = db.createObjectStore('encrypted_todos', {
            keyPath: 'id',
            autoIncrement: true,
          });
          todoStore.createIndex('by-completed', 'completed');
          todoStore.createIndex('by-updated', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllEncryptedNotes(): Promise<EncryptedNoteRow[]> {
  const db = await getDatabase();
  return db.getAllFromIndex('encrypted_notes', 'by-updated');
}

export async function saveEncryptedNote(note: EncryptedNoteRow): Promise<number> {
  const db = await getDatabase();
  const payload = { ...note };
  if (payload.id === undefined) {
    delete payload.id;
    return db.add('encrypted_notes', payload as EncryptedNoteRow);
  }
  return db.put('encrypted_notes', payload as EncryptedNoteRow);
}

export async function deleteEncryptedNote(id: number): Promise<void> {
  const db = await getDatabase();
  return db.delete('encrypted_notes', id);
}

export async function getAllEncryptedTodos(): Promise<EncryptedTodoRow[]> {
  const db = await getDatabase();
  return db.getAllFromIndex('encrypted_todos', 'by-updated');
}

export async function saveEncryptedTodo(todo: EncryptedTodoRow): Promise<number> {
  const db = await getDatabase();
  const payload = { ...todo };
  if (payload.id === undefined) {
    delete payload.id;
    return db.add('encrypted_todos', payload as EncryptedTodoRow);
  }
  return db.put('encrypted_todos', payload as EncryptedTodoRow);
}

export async function deleteEncryptedTodo(id: number): Promise<void> {
  const db = await getDatabase();
  return db.delete('encrypted_todos', id);
}
