import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  Unlock,
  Plus, 
  Search, 
  Trash2, 
  User,
  X,
  ArrowLeft,
  Edit3,
  FileText,
  CheckSquare,
  Check,
  Download,
  Upload,
  Settings,
  AlertCircle,
  ShieldCheck,
  Archive,
  Clock,
  ChevronDown,
  Bell,
  BellRing,
  CloudUpload,
  Link,
  FolderSync,
  Pencil,
  Webhook,
  KeyRound,
  ArrowRight,
  Eye,
  EyeOff,
  RotateCcw,
  MailCheck,
  Key,
  Mail
} from 'lucide-react';
import { 
  getAllEncryptedNotes, 
  saveEncryptedNote, 
  deleteEncryptedNote, 
  EncryptedNoteRow,
  getAllEncryptedTodos,
  saveEncryptedTodo,
  deleteEncryptedTodo,
  EncryptedTodoRow
} from './db/database';
import { encryptText, decryptText } from './security/crypto';
import { 
  saveGoogleDriveFolderLink, 
  getSavedGoogleDriveFolderLink, 
  uploadDirectToGoogleDrive,
  saveGoogleDriveWebhookUrl,
  getSavedGoogleDriveWebhookUrl
} from './cloud/gdrive';

interface DecryptedNote {
  id?: number;
  title: string;
  content: string;
  categoryTag: string;
  isSensitive: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

type TodoPriority = 'urgent' | 'important' | 'neutral' | 'if_time';

interface DecryptedTodo {
  id?: number;
  title: string;
  completed: boolean;
  isArchived?: boolean;
  priority: TodoPriority;
  dueDate?: string;
  createdAt: number;
  updatedAt: number;
}

const priorityConfig: Record<TodoPriority, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.15)' },
  important: { label: 'Important', color: '#FF6B00', bg: 'rgba(255, 107, 0, 0.15)' },
  neutral: { label: 'Neutral', color: '#007AFF', bg: 'rgba(0, 122, 255, 0.15)' },
  if_time: { label: 'Someday', color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' }
};

const MASTER_PASSWORD_STORAGE_KEY = 'secure_vault_master_passcode';
const IS_REGISTERED_STORAGE_KEY = 'secure_vault_is_registered';
const REGISTERED_EMAIL_STORAGE_KEY = 'secure_vault_registered_email';

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<'notes' | 'todos'>('notes');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Password-Only Authentication State
  const [registeredEmail, setRegisteredEmail] = useState<string>(
    () => localStorage.getItem(REGISTERED_EMAIL_STORAGE_KEY) || ''
  );
  const [masterPassword, setMasterPassword] = useState<string>(
    () => localStorage.getItem(MASTER_PASSWORD_STORAGE_KEY) || ''
  );
  const [isRegistered, setIsRegistered] = useState<boolean>(
    () => Boolean(
      localStorage.getItem(IS_REGISTERED_STORAGE_KEY) === 'true' &&
      localStorage.getItem(MASTER_PASSWORD_STORAGE_KEY)
    )
  );

  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regEmailInput, setRegEmailInput] = useState('');
  const [regError, setRegError] = useState('');

  // Lock Screen State
  const [enteredPassword, setEnteredPassword] = useState('');
  const [lockError, setLockError] = useState('');

  // Settings State
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [passwordChangeStatus, setPasswordChangeStatus] = useState('');
  const [isPasswordSavedFeedback, setIsPasswordSavedFeedback] = useState(false);

  // Notes & Todo State
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('Personal');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<DecryptedNote>>({
    title: '',
    content: '',
    categoryTag: 'Personal',
    isSensitive: false
  });
  const [selectedNoteForView, setSelectedNoteForView] = useState<DecryptedNote | null>(null);

  const [todos, setTodos] = useState<DecryptedTodo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState<string>('');
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>('important');
  const [newTodoDueDate, setNewTodoDueDate] = useState<string>('');
  const [todoError, setTodoError] = useState<string>('');

  const [notifiedTaskIds, setNotifiedTaskIds] = useState<Record<number, boolean>>({});
  const [activeToastAlert, setActiveToastAlert] = useState<string>('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // GDrive Config
  const savedFolderLink = getSavedGoogleDriveFolderLink();
  const savedWebhookUrl = getSavedGoogleDriveWebhookUrl();
  const [gdriveLinkInput, setGdriveLinkInput] = useState<string>(savedFolderLink);
  const [gdriveWebhookInput, setGdriveWebhookInput] = useState<string>(savedWebhookUrl);
  const [isEditingGDriveConfig, setIsEditingGDriveConfig] = useState(false);
  const [isLinkSavedFeedback, setIsLinkSavedFeedback] = useState(false);
  const [isSyncingGDrive, setIsSyncingGDrive] = useState(false);

  const hasUnsavedConfigChanges = 
    gdriveLinkInput.trim() !== savedFolderLink.trim() || 
    gdriveWebhookInput.trim() !== savedWebhookUrl.trim();

  const dateInputRef = useRef<HTMLInputElement>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryAuthenticated, setIsHistoryAuthenticated] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string>('');



  // ────────────────── REGISTRATION PROCESS (PASSWORD-ONLY) ──────────────────
  const handleCreateVaultPassword = () => {
    setRegError('');
    if (!regPassword.trim() || regPassword.length < 4) {
      setRegError('Vault Password must be at least 4 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    // Save registration credentials
    localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, regPassword.trim());
    localStorage.setItem(IS_REGISTERED_STORAGE_KEY, 'true');
    if (regEmailInput.trim()) {
      localStorage.setItem(REGISTERED_EMAIL_STORAGE_KEY, regEmailInput.trim());
      setRegisteredEmail(regEmailInput.trim());
    }

    setMasterPassword(regPassword.trim());
    setIsRegistered(true);

    // Unlock vault directly
    setIsUnlocked(true);
    setLockError('');
    setActiveToastAlert('Vault created successfully! Welcome to SecureVault.');
  };

  // ────────────────── LOGIN HANDLER (PASSWORD-ONLY) ──────────────────
  const handleLoginPasswordStepSubmit = () => {
    setLockError('');
    if (enteredPassword.trim() === masterPassword.trim()) {
      setIsUnlocked(true);
      setEnteredPassword('');
      setLockError('');
    } else {
      setLockError('Incorrect Vault Password. Please try again.');
    }
  };


  useEffect(() => {
    if (isUnlocked) {
      loadNotes();
      loadTodos();
    }
  }, [isUnlocked]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkTaskDeadlineNotifications(todos);
    }, 10000);

    return () => clearInterval(interval);
  }, [isUnlocked, todos, notifiedTaskIds]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsUnlocked(false);
        setIsHistoryAuthenticated(false);
        setShowHistoryView(false);
        setLockError('');
        setEnteredPassword('');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleChangeMasterPassword = () => {
    if (!newPasswordInput.trim() && !newEmailInput.trim()) {
      setPasswordChangeStatus('Please enter new details to update.');
      return;
    }
    if (newPasswordInput.trim()) {
      localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, newPasswordInput.trim());
      setMasterPassword(newPasswordInput.trim());
    }
    if (newEmailInput.trim() && newEmailInput.includes('@')) {
      localStorage.setItem(REGISTERED_EMAIL_STORAGE_KEY, newEmailInput.trim());
      setRegisteredEmail(newEmailInput.trim());
    }

    setNewPasswordInput('');
    setNewEmailInput('');
    setIsEditingPassword(false);
    setIsPasswordSavedFeedback(true);
    setPasswordChangeStatus('Account credentials updated successfully ✓');

    setTimeout(() => {
      setIsPasswordSavedFeedback(false);
      setPasswordChangeStatus('');
    }, 3000);
  };

  const handleResetAccount = () => {
    localStorage.removeItem(IS_REGISTERED_STORAGE_KEY);
    localStorage.removeItem(MASTER_PASSWORD_STORAGE_KEY);
    localStorage.removeItem(REGISTERED_EMAIL_STORAGE_KEY);
    setIsRegistered(false);
    setIsUnlocked(false);
    setRegisteredEmail('');
    setMasterPassword('');
    setRegEmailInput('');
    setRegPassword('');
    setRegConfirmPassword('');
    setEnteredPassword('');
    setLockError('');
    setRegError('');
  };

  const handleRequestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          setActiveToastAlert('Deadline Notifications Enabled! You will be alerted when tasks are due.');
          setTimeout(() => setActiveToastAlert(''), 4000);
        } else {
          setActiveToastAlert('Notification permission was blocked in browser settings.');
          setTimeout(() => setActiveToastAlert(''), 4000);
        }
      } catch (e) {
        console.error('Failed to request notification permission:', e);
      }
    }
  };

  const checkTaskDeadlineNotifications = (tasks: DecryptedTodo[]) => {
    const nowStr = new Date().toISOString().slice(0, 16);

    tasks.forEach(task => {
      if (!task.completed && task.dueDate && task.id) {
        const formattedDueDate = task.dueDate.slice(0, 16);
        
        if (formattedDueDate <= nowStr && !notifiedTaskIds[task.id]) {
          setNotifiedTaskIds(prev => ({ ...prev, [task.id!]: true }));

          const alertMessage = `Task Deadline Due: "${task.title}"`;
          setActiveToastAlert(alertMessage);

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('Task Deadline Due!', {
                body: alertMessage,
                icon: '/vite.svg',
                tag: `task-${task.id}`
              });
            } catch (e) {
              console.error('System Notification error:', e);
            }
          }
        }
      }
    });
  };

  const loadNotes = async () => {
    try {
      const encryptedRows = await getAllEncryptedNotes();
      const decrypted = await Promise.all(
        encryptedRows.map(async (row) => {
          const title = await decryptText({ ciphertextBase64: row.encryptedTitle, ivBase64: row.titleIv });
          const content = await decryptText({ ciphertextBase64: row.encryptedContent, ivBase64: row.contentIv });
          return {
            id: row.id,
            title,
            content,
            categoryTag: row.categoryTag,
            isSensitive: row.isSensitive,
            isArchived: row.isArchived || false,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          };
        })
      );
      setNotes(decrypted);

      if (selectedNoteForView) {
        const updated = decrypted.find(n => n.id === selectedNoteForView.id);
        if (updated) setSelectedNoteForView(updated);
      }
    } catch (e) {
      console.error('Failed to load notes:', e);
    }
  };

  const loadTodos = async () => {
    try {
      const encryptedRows = await getAllEncryptedTodos();
      const decrypted = await Promise.all(
        encryptedRows.map(async (row) => {
          const title = await decryptText({ ciphertextBase64: row.encryptedTitle, ivBase64: row.titleIv });
          return {
            id: row.id,
            title,
            completed: row.completed,
            isArchived: row.isArchived || row.completed || false,
            priority: (row.priority as TodoPriority) || 'important',
            dueDate: row.dueDate,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          };
        })
      );
      setTodos(decrypted);
      checkTaskDeadlineNotifications(decrypted);
    } catch (e) {
      console.error('Failed to load todos:', e);
    }
  };

  const handleSaveNote = async () => {
    setSaveError('');
    if (!editingNote.title && !editingNote.content) {
      setSaveError('Please enter a title or content.');
      return;
    }

    try {
      const encryptedTitle = await encryptText(editingNote.title || 'Untitled Note');
      const encryptedContent = await encryptText(editingNote.content || '');

      const row: EncryptedNoteRow = {
        encryptedTitle: encryptedTitle.ciphertextBase64,
        titleIv: encryptedTitle.ivBase64,
        encryptedContent: encryptedContent.ciphertextBase64,
        contentIv: encryptedContent.ivBase64,
        categoryTag: editingNote.categoryTag || 'Personal',
        isSensitive: editingNote.isSensitive || false,
        isArchived: editingNote.isArchived || false,
        createdAt: editingNote.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      if (editingNote.id !== undefined) {
        row.id = editingNote.id;
      }

      await saveEncryptedNote(row);

      if (gdriveLinkInput) {
        saveGoogleDriveFolderLink(gdriveLinkInput);
      }

      setIsEditorOpen(false);
      setEditingNote({ title: '', content: '', categoryTag: 'Personal', isSensitive: false });
      await loadNotes();
    } catch (err: any) {
      console.error('Error saving note:', err);
      setSaveError(err?.message || 'Failed to save note.');
    }
  };

  const handleArchiveNote = async (note: DecryptedNote) => {
    try {
      const encryptedTitle = await encryptText(note.title);
      const encryptedContent = await encryptText(note.content);

      const row: EncryptedNoteRow = {
        id: note.id,
        encryptedTitle: encryptedTitle.ciphertextBase64,
        titleIv: encryptedTitle.ivBase64,
        encryptedContent: encryptedContent.ciphertextBase64,
        contentIv: encryptedContent.ivBase64,
        categoryTag: note.categoryTag,
        isSensitive: note.isSensitive,
        isArchived: true,
        createdAt: note.createdAt,
        updatedAt: Date.now()
      };

      await saveEncryptedNote(row);
      if (selectedNoteForView?.id === note.id) {
        setSelectedNoteForView(null);
      }
      await loadNotes();
    } catch (e) {
      console.error('Failed to archive note:', e);
    }
  };

  const handleRestoreNote = async (note: DecryptedNote) => {
    try {
      const encryptedTitle = await encryptText(note.title);
      const encryptedContent = await encryptText(note.content);

      const row: EncryptedNoteRow = {
        id: note.id,
        encryptedTitle: encryptedTitle.ciphertextBase64,
        titleIv: encryptedTitle.ivBase64,
        encryptedContent: encryptedContent.ciphertextBase64,
        contentIv: encryptedContent.ivBase64,
        categoryTag: note.categoryTag,
        isSensitive: note.isSensitive,
        isArchived: false,
        createdAt: note.createdAt,
        updatedAt: Date.now()
      };

      await saveEncryptedNote(row);
      await loadNotes();
    } catch (e) {
      console.error('Failed to restore note:', e);
    }
  };

  const handlePermanentDeleteNote = async (id?: number) => {
    if (!id) return;
    try {
      await deleteEncryptedNote(id);
      await loadNotes();
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  const handleSaveTodo = async () => {
    setTodoError('');
    if (!newTodoTitle.trim()) {
      setTodoError('Please enter a task title.');
      return;
    }

    try {
      const encryptedTitle = await encryptText(newTodoTitle.trim());
      const row: EncryptedTodoRow = {
        encryptedTitle: encryptedTitle.ciphertextBase64,
        titleIv: encryptedTitle.ivBase64,
        completed: false,
        isArchived: false,
        priority: newTodoPriority,
        dueDate: newTodoDueDate || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await saveEncryptedTodo(row);
      setNewTodoTitle('');
      setNewTodoDueDate('');
      await loadTodos();
    } catch (err: any) {
      console.error('Error saving todo:', err);
      setTodoError('Failed to save todo.');
    }
  };

  const handleToggleTodo = async (todo: DecryptedTodo) => {
    try {
      const encryptedTitle = await encryptText(todo.title);
      const row: EncryptedTodoRow = {
        id: todo.id,
        encryptedTitle: encryptedTitle.ciphertextBase64,
        titleIv: encryptedTitle.ivBase64,
        completed: !todo.completed,
        isArchived: !todo.completed,
        priority: todo.priority,
        dueDate: todo.dueDate,
        createdAt: todo.createdAt,
        updatedAt: Date.now()
      };

      await saveEncryptedTodo(row);
      await loadTodos();
    } catch (e) {
      console.error('Failed to toggle todo:', e);
    }
  };

  const handleRestoreTodo = async (todo: DecryptedTodo) => {
    try {
      const encryptedTitle = await encryptText(todo.title);
      const row: EncryptedTodoRow = {
        id: todo.id,
        encryptedTitle: encryptedTitle.ciphertextBase64,
        titleIv: encryptedTitle.ivBase64,
        completed: false,
        isArchived: false,
        priority: todo.priority,
        dueDate: todo.dueDate,
        createdAt: todo.createdAt,
        updatedAt: Date.now()
      };

      await saveEncryptedTodo(row);
      await loadTodos();
    } catch (e) {
      console.error('Failed to restore todo:', e);
    }
  };

  const handlePermanentDeleteTodo = async (id?: number) => {
    if (!id) return;
    try {
      await deleteEncryptedTodo(id);
      await loadTodos();
    } catch (e) {
      console.error('Failed to delete todo:', e);
    }
  };

  const openDatePicker = () => {
    if (dateInputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch (e) {
        dateInputRef.current.focus();
      }
    }
  };

  const formatDueDateDisplay = (rawDueDate?: string) => {
    if (!rawDueDate) return null;
    try {
      const d = new Date(rawDueDate);
      if (isNaN(d.getTime())) return rawDueDate;
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return rawDueDate;
    }
  };

  const handleSaveGDriveConfig = () => {
    saveGoogleDriveFolderLink(gdriveLinkInput);
    saveGoogleDriveWebhookUrl(gdriveWebhookInput);

    setIsLinkSavedFeedback(true);
    setIsEditingGDriveConfig(false);
    setBackupStatus('Google Drive Webhook settings saved successfully!');
    setActiveToastAlert('Settings Saved Successfully ✓');
    
    setTimeout(() => {
      setIsLinkSavedFeedback(false);
      setActiveToastAlert('');
    }, 2500);
  };

  const handleSyncAllNotesToGDrive = async () => {
    setIsSyncingGDrive(true);
    setBackupStatus('Connecting to Google Drive Webhook...');

    try {
      const encryptedNotes = await getAllEncryptedNotes();
      const encryptedTodos = await getAllEncryptedTodos();

      if (encryptedNotes.length === 0 && encryptedTodos.length === 0) {
        setBackupStatus('No notes or tasks available to upload.');
        setIsSyncingGDrive(false);
        return;
      }

      const filename = `vault_backup_notes_${Date.now()}.json`;

      const gdrivePayload = {
        app: 'SecureVaultNotesPWA',
        uploadedAt: new Date().toISOString(),
        notesCount: encryptedNotes.length,
        todosCount: encryptedTodos.length,
        notes: encryptedNotes,
        todos: encryptedTodos
      };

      const payloadJson = JSON.stringify(gdrivePayload, null, 2);

      const result = await uploadDirectToGoogleDrive({
        folderUrlOrId: gdriveLinkInput,
        webhookUrl: gdriveWebhookInput,
        filename,
        payloadJson
      });

      setBackupStatus(result.message);
      setActiveToastAlert(result.message);
      setTimeout(() => setActiveToastAlert(''), 5000);
    } catch (e: any) {
      console.error('Google Drive Webhook sync error:', e);
      setBackupStatus(`Google Drive Webhook upload failed: ${e?.message || 'Error'}`);
    } finally {
      setIsSyncingGDrive(false);
    }
  };

  const handleOpenHistoryWithAuth = async () => {
    setIsHistoryAuthenticated(true);
    setShowHistoryView(true);
  };

  const handleExportBackup = async () => {
    try {
      const encryptedNotes = await getAllEncryptedNotes();
      const encryptedTodos = await getAllEncryptedTodos();

      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        notes: encryptedNotes,
        todos: encryptedTodos
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `secure_vault_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatus('Encrypted backup downloaded successfully.');
    } catch (e) {
      console.error('Export failed:', e);
      setBackupStatus('Export failed.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const imported = JSON.parse(text);

        if (Array.isArray(imported.notes)) {
          for (const n of imported.notes) {
            delete n.id;
            await saveEncryptedNote(n);
          }
        }
        if (Array.isArray(imported.todos)) {
          for (const t of imported.todos) {
            delete t.id;
            await saveEncryptedTodo(t);
          }
        }

        await loadNotes();
        await loadTodos();
        setBackupStatus('Backup imported successfully!');
      } catch (err) {
        console.error('Import failed:', err);
        setBackupStatus('Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const noteCategories = ['Personal', 'Passwords', 'Private Keys'];

  const activeNotes = notes.filter(n => !n.isArchived);
  const archivedNotes = notes.filter(n => n.isArchived);

  const activeTodos = todos.filter(t => !t.isArchived && !t.completed);
  const archivedTodos = todos.filter(t => t.isArchived || t.completed);

  const filteredNotes = activeNotes.filter((n) => {
    const matchesTag = n.categoryTag === selectedTag;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  // ────────────────── REGISTRATION PROCESS (PASSWORD-ONLY) ──────────────────
  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* DISMISSABLE TOAST NOTIFICATION BANNER */}
        <AnimatePresence>
          {activeToastAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 pointer-events-auto"
            >
              <div className="bg-[#FF6B00] text-white p-3.5 rounded-card shadow-2xl flex items-center justify-between border border-white/20">
                <div className="flex items-center gap-3 flex-1 pr-2">
                  <BellRing className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-semibold leading-tight">{activeToastAlert}</p>
                </div>
                <button
                  onClick={() => setActiveToastAlert('')}
                  className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 shrink-0"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-sm bg-[#1C1C1E] border border-[#2C2C2E] rounded-card p-6 flex flex-col items-center text-center shadow-2xl relative z-10">
          <div className="w-14 h-14 rounded-full bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] mb-4 border border-[#FF6B00]/30">
            <ShieldCheck className="w-8 h-8 stroke-[2]" />
          </div>

          <h1 className="text-xl font-bold mb-1 tracking-tight text-white">Create Vault Password</h1>
          <p className="text-xs text-[#8E8E93] mb-6">
            Set a master password to encrypt and secure your private notes & tasks.
          </p>

          {regError && (
            <div className="bg-[#FF3B30]/15 border border-[#FF3B30]/30 rounded-xl p-2.5 mb-4 text-xs text-[#FF3B30] w-full text-left">
              {regError}
            </div>
          )}

          <div className="w-full flex flex-col gap-3">
            <div className="relative w-full">
              <input
                type={showPasswordText ? 'text' : 'password'}
                placeholder="Set Vault Password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-black border border-[#2C2C2E] rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-[#636366] focus:outline-none focus:border-[#FF6B00]"
              />
              <button
                type="button"
                onClick={() => setShowPasswordText(!showPasswordText)}
                className="absolute right-3 top-3.5 text-[#8E8E93] hover:text-white"
              >
                {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative w-full">
              <input
                type={showPasswordText ? 'text' : 'password'}
                placeholder="Confirm Vault Password"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateVaultPassword()}
                className="w-full bg-black border border-[#2C2C2E] rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-[#636366] focus:outline-none focus:border-[#FF6B00]"
              />
              <button
                type="button"
                onClick={() => setShowPasswordText(!showPasswordText)}
                className="absolute right-3 top-3.5 text-[#8E8E93] hover:text-white"
              >
                {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={handleCreateVaultPassword}
              className="w-full bg-[#FF6B00] hover:bg-[#E66000] active:scale-[0.98] transition-all text-white font-semibold py-3.5 rounded-pill shadow-md flex items-center justify-center gap-2 text-sm mt-2"
            >
              <Key className="w-4 h-4" />
              Create Account & Unlock Vault
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────── LOCK SCREEN (PASSWORD-ONLY RETURNING USER) ──────────────────
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* DISMISSABLE TOAST NOTIFICATION BANNER */}
        <AnimatePresence>
          {activeToastAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 pointer-events-auto"
            >
              <div className="bg-[#FF6B00] text-white p-3.5 rounded-card shadow-2xl flex items-center justify-between border border-white/20">
                <div className="flex items-center gap-3 flex-1 pr-2">
                  <BellRing className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-semibold leading-tight">{activeToastAlert}</p>
                </div>
                <button
                  onClick={() => setActiveToastAlert('')}
                  className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 shrink-0"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-sm bg-[#1C1C1E] border border-[#2C2C2E] rounded-card p-6 flex flex-col items-center text-center shadow-2xl relative z-10">
          <div className="w-14 h-14 rounded-full bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] mb-4 border border-[#FF6B00]/30">
            <Lock className="w-7 h-7 stroke-[2]" />
          </div>

          <h1 className="text-xl font-bold mb-1 tracking-tight text-white">Enter Vault Password</h1>
          <p className="text-xs text-[#8E8E93] leading-relaxed mb-6">
            Enter your secret password to unlock your vault session.
          </p>

          {lockError && (
            <div className="bg-[#FF3B30]/15 border border-[#FF3B30]/30 rounded-xl p-2.5 mb-4 text-xs text-[#FF3B30] w-full text-left">
              {lockError}
            </div>
          )}

          <div className="relative w-full mb-4">
            <input
              type={showPasswordText ? 'text' : 'password'}
              placeholder="Enter Vault Password"
              value={enteredPassword}
              onChange={(e) => setEnteredPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoginPasswordStepSubmit()}
              className="w-full bg-black border border-[#2C2C2E] rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-[#636366] focus:outline-none focus:border-[#FF6B00]"
            />
            <button
              type="button"
              onClick={() => setShowPasswordText(!showPasswordText)}
              className="absolute right-3 top-3.5 text-[#8E8E93] hover:text-white"
            >
              {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleLoginPasswordStepSubmit}
            className="w-full bg-[#FF6B00] hover:bg-[#E66000] active:scale-[0.98] transition-all text-white font-semibold py-3.5 rounded-pill shadow-md flex items-center justify-center gap-2 text-sm"
          >
            <Unlock className="w-4 h-4" />
            Unlock & Enter Vault
          </button>

          <button
            onClick={handleResetAccount}
            className="text-[11px] text-[#8E8E93] hover:text-[#FF6B00] mt-5 transition-colors"
          >
            Reset App Storage / Re-Register Account
          </button>
        </div>
      </div>
    );
  }

  // DEDICATED NOTE DETAIL VIEW SCREEN
  if (selectedNoteForView) {
    return (
      <div className="min-h-screen bg-black text-white p-4 max-w-md mx-auto font-sans flex flex-col justify-between">
        <div>
          <header className="flex items-center justify-between pt-2 pb-4 border-b border-[#2C2C2E]">
            <button 
              onClick={() => setSelectedNoteForView(null)}
              className="w-9 h-9 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold text-[#FF6B00] bg-[#FF6B00]/15 px-3 py-1 rounded-pill">
              {selectedNoteForView.categoryTag}
            </span>
            <button
              onClick={() => handleArchiveNote(selectedNoteForView)}
              className="w-9 h-9 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-[#FF3B30]"
              title="Archive Note"
            >
              <Archive className="w-4.5 h-4.5" />
            </button>
          </header>

          <div className="my-6">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
              {selectedNoteForView.title}
            </h1>
            <p className="text-xs text-[#8E8E93]">
              Last updated: {new Date(selectedNoteForView.updatedAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-card p-5 min-h-[220px]">
            <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
              {selectedNoteForView.content}
            </p>
          </div>
        </div>

        <div className="pt-6 pb-4 flex items-center gap-3">
          <button
            onClick={() => {
              setEditingNote(selectedNoteForView);
              setIsEditorOpen(true);
            }}
            className="flex-1 bg-white hover:bg-gray-100 text-black font-semibold py-3.5 rounded-pill shadow-lg flex items-center justify-center gap-2 text-sm"
          >
            <Edit3 className="w-4 h-4" />
            Edit Note
          </button>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-md mx-auto pb-32 font-sans relative">
      {/* DISMISSABLE TOAST NOTIFICATION BANNER */}
      <AnimatePresence>
        {activeToastAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50 pointer-events-auto"
          >
            <div className="bg-[#FF6B00] text-white p-3.5 rounded-card shadow-2xl flex items-center justify-between border border-white/20">
              <div className="flex items-center gap-3 flex-1 pr-2">
                <BellRing className="w-5 h-5 shrink-0" />
                <p className="text-xs font-semibold leading-tight">{activeToastAlert}</p>
              </div>
              <button
                onClick={() => setActiveToastAlert('')}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 shrink-0"
                title="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] border border-[#FF6B00]/30 font-bold text-xs uppercase">
            {registeredEmail ? registeredEmail[0] : <User className="w-5 h-5" />}
          </div>
          <span className="text-sm font-medium text-[#8E8E93]">My Secure Vault</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAllNotesToGDrive}
            disabled={isSyncingGDrive}
            className="w-9 h-9 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#FF6B00] hover:text-white disabled:opacity-50"
            title="Upload Directly to Google Drive Webhook"
          >
            <FolderSync className={`w-4.5 h-4.5 ${isSyncingGDrive ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white"
            title="Settings & Security"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
              setIsUnlocked(false);
            }}
            className="w-9 h-9 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white"
            title="Lock App"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="my-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {activeNavTab === 'notes' ? 'My Notes' : 'To-Do Tasks'}
        </h1>
      </div>

      {/* NOTES TAB */}
      {activeNavTab === 'notes' && (
        <div>
          <div className="relative my-4">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#636366]" />
            <input 
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-card pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#636366] focus:outline-none focus:border-[#FF6B00] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar my-4 py-1">
            {noteCategories.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-pill text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedTag === tag 
                    ? 'bg-[#FF6B00] text-white shadow-sm' 
                    : 'bg-[#1C1C1E] text-white border border-[#2C2C2E] hover:bg-[#252528]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <AnimatePresence>
              {filteredNotes.map((note) => {
                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedNoteForView(note)}
                    className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-card p-4 flex flex-col justify-between min-h-[140px] cursor-pointer hover:border-[#FF6B00]/60 transition-all active:scale-[0.98]"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[11px] font-medium text-[#FF6B00] bg-[#FF6B00]/15 px-2 py-0.5 rounded-md">
                          {note.categoryTag}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveNote(note);
                          }}
                          className="text-[#636366] hover:text-[#FF3B30] p-0.5"
                          title="Archive Note"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h3 className="font-semibold text-sm text-white mb-1 leading-snug line-clamp-1">
                        {note.title}
                      </h3>

                      <p className="text-xs text-[#8E8E93] leading-relaxed line-clamp-2">
                        {note.isSensitive ? '••••••••••••' : note.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#2C2C2E]/60">
                      <span className="text-[10px] text-[#636366]">
                        {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      {note.isSensitive && (
                        <span className="text-[10px] text-[#FF6B00] font-medium">
                          Sensitive
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filteredNotes.length === 0 && (
            <div className="text-center py-16 text-[#636366]">
              <p className="text-sm font-medium text-[#8E8E93]">No {selectedTag} notes</p>
              <p className="text-xs mt-1">Tap 'Add Note' below to create one.</p>
            </div>
          )}

          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-10">
            <button
              onClick={() => {
                setSaveError('');
                setEditingNote({ title: '', content: '', categoryTag: selectedTag, isSensitive: false });
                setIsEditorOpen(true);
              }}
              className="w-full bg-white hover:bg-gray-100 text-black font-semibold py-3.5 rounded-pill shadow-lg flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add Note
            </button>
          </div>
        </div>
      )}

      {/* TO-DO TAB */}
      {activeNavTab === 'todos' && (
        <div className="mt-2 w-full overflow-hidden">
          {notificationPermission !== 'granted' && (
            <div className="bg-[#1C1C1E] border border-[#FF6B00]/40 rounded-card p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#FF6B00] shrink-0" />
                <span className="text-xs text-white font-medium">Enable task deadline notifications</span>
              </div>
              <button
                onClick={handleRequestNotificationPermission}
                className="bg-[#FF6B00] hover:bg-[#E66000] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm"
              >
                Enable
              </button>
            </div>
          )}

          {todoError && (
            <div className="bg-[#FF3B30]/15 border border-[#FF3B30]/30 rounded-xl p-2.5 mb-3 text-xs text-[#FF3B30] flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {todoError}
            </div>
          )}

          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-card p-3.5 flex flex-col gap-3 mb-4 w-full">
            <input 
              type="text"
              placeholder="Add a new task title..."
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTodo()}
              className="w-full bg-black border border-[#2C2C2E] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#636366] focus:outline-none focus:border-[#FF6B00]"
            />
            
            <div className="grid grid-cols-3 gap-2 w-full">
              <div 
                onClick={openDatePicker}
                className="bg-black border border-[#2C2C2E] hover:border-[#FF6B00] rounded-xl px-2 py-2 flex items-center justify-center gap-1.5 cursor-pointer relative transition-colors"
                title="Select Task Deadline Date & Time"
              >
                <Clock className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                <span className="text-[10px] font-medium text-white truncate">
                  {newTodoDueDate ? formatDueDateDisplay(newTodoDueDate) : 'Date & Time'}
                </span>
                <input 
                  ref={dateInputRef}
                  type="datetime-local"
                  value={newTodoDueDate}
                  onChange={(e) => setNewTodoDueDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>

              <div className="relative w-full">
                <select
                  value={newTodoPriority}
                  onChange={(e: any) => setNewTodoPriority(e.target.value)}
                  className="w-full bg-black border border-[#2C2C2E] text-[10px] text-white font-medium rounded-xl px-2 py-2.5 focus:outline-none cursor-pointer text-center appearance-none"
                >
                  <option value="urgent" className="text-left">🔴 Urgent</option>
                  <option value="important" className="text-left">🟠 Important</option>
                  <option value="neutral" className="text-left">🔵 Neutral</option>
                  <option value="if_time" className="text-left">🟢 Someday</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#8E8E93] absolute right-2 top-3 pointer-events-none" />
              </div>

              <button
                onClick={handleSaveTodo}
                className="bg-[#FF6B00] hover:bg-[#E66000] text-white py-2 rounded-xl text-[11px] font-semibold shadow-md active:scale-95 transition-all w-full flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Add
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            <AnimatePresence>
              {activeTodos.map((todo) => {
                const config = priorityConfig[todo.priority] || priorityConfig.important;
                const nowIso = new Date().toISOString().slice(0, 16);
                const isDueSoonOrOverdue = todo.dueDate && todo.dueDate.slice(0, 16) <= nowIso;

                return (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-card p-3.5 flex items-center justify-between group"
                  >
                    <div 
                      onClick={() => handleToggleTodo(todo)}
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-md border border-[#3A3A3C] bg-black flex items-center justify-center hover:border-[#FF6B00]">
                        <Check className="w-3.5 h-3.5 stroke-[3] text-transparent hover:text-[#FF6B00]" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">
                            {todo.title}
                          </span>
                          <span 
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: config.color, backgroundColor: config.bg }}
                          >
                            {config.label}
                          </span>
                        </div>

                        {todo.dueDate && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-[#8E8E93]" />
                            <span className={`text-[10px] font-medium ${
                              isDueSoonOrOverdue ? 'text-[#FF3B30]' : 'text-[#8E8E93]'
                            }`}>
                              Due: {formatDueDateDisplay(todo.dueDate)} {isDueSoonOrOverdue ? '(Due Now)' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleTodo(todo)}
                      className="text-xs text-[#FF6B00] bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 px-2.5 py-1 rounded-lg font-medium"
                    >
                      Done
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {activeTodos.length === 0 && (
            <div className="text-center py-16 text-[#636366]">
              <p className="text-sm font-medium text-[#8E8E93]">No active tasks</p>
              <p className="text-xs mt-1">Add a task above. Finished tasks move to History.</p>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#1C1C1E]/95 backdrop-blur-md border-t border-[#2C2C2E] px-6 py-2.5 flex items-center justify-around z-40">
        <button
          onClick={() => setActiveNavTab('notes')}
          className={`flex flex-col items-center gap-1 py-1 px-8 rounded-xl transition-all ${
            activeNavTab === 'notes' ? 'text-[#FF6B00]' : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[11px] font-semibold">Notes</span>
        </button>

        <button
          onClick={() => setActiveNavTab('todos')}
          className={`flex flex-col items-center gap-1 py-1 px-8 rounded-xl transition-all ${
            activeNavTab === 'todos' ? 'text-[#FF6B00]' : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          <span className="text-[11px] font-semibold">To-Do</span>
        </button>
      </nav>

      {/* Note Editor Modal */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-card w-full max-w-sm p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">
                  {editingNote.id ? 'Edit Note' : 'Add Encrypted Note'}
                </h2>
                <button 
                  onClick={() => setIsEditorOpen(false)}
                  className="text-[#8E8E93] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {saveError && (
                <div className="bg-[#FF3B30]/15 border border-[#FF3B30]/30 rounded-xl p-2.5 mb-3 text-xs text-[#FF3B30]">
                  {saveError}
                </div>
              )}

              <input
                type="text"
                placeholder="Note Title"
                value={editingNote.title || ''}
                onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                className="w-full bg-black border border-[#2C2C2E] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#636366] mb-3 focus:outline-none focus:border-[#FF6B00]"
              />

              <textarea
                placeholder="Write passwords, private text, or sensitive notes..."
                value={editingNote.content || ''}
                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                rows={4}
                className="w-full bg-black border border-[#2C2C2E] rounded-xl p-3.5 text-sm text-white placeholder-[#636366] mb-3 focus:outline-none focus:border-[#FF6B00] resize-none"
              />

              <div className="flex items-center justify-between mb-3">
                <select
                  value={editingNote.categoryTag}
                  onChange={(e) => setEditingNote({ ...editingNote, categoryTag: e.target.value })}
                  className="bg-black border border-[#2C2C2E] text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF6B00]"
                >
                  <option value="Personal">Personal</option>
                  <option value="Passwords">Passwords</option>
                  <option value="Private Keys">Private Keys</option>
                </select>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8E8E93]">
                  <input
                    type="checkbox"
                    checked={editingNote.isSensitive}
                    onChange={(e) => setEditingNote({ ...editingNote, isSensitive: e.target.checked })}
                    className="accent-[#FF6B00] w-4 h-4 rounded"
                  />
                  Mask as Sensitive
                </label>
              </div>

              {editingNote.categoryTag === 'Passwords' && (
                <div className="mb-4 pt-2 border-t border-[#2C2C2E]">
                  <label className="text-[11px] font-semibold text-[#FF6B00] flex items-center gap-1.5 mb-1.5">
                    <Link className="w-3.5 h-3.5" />
                    Optional GDrive Folder Link
                  </label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={gdriveLinkInput}
                    onChange={(e) => setGdriveLinkInput(e.target.value)}
                    className="w-full bg-black border border-[#2C2C2E] rounded-xl px-3 py-2 text-xs text-white placeholder-[#636366] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="flex-1 py-2.5 rounded-pill border border-[#2C2C2E] text-[#8E8E93] text-xs font-semibold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="flex-1 py-2.5 rounded-pill bg-[#FF6B00] hover:bg-[#E66000] text-white text-xs font-semibold shadow-md"
                >
                  Save Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-card w-full max-w-sm p-5 shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#FF6B00]" />
                  Settings & Security Architecture
                </h2>
                <button 
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setShowHistoryView(false);
                    setIsHistoryAuthenticated(false);
                    setBackupStatus('');
                  }}
                  className="text-[#8E8E93] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {backupStatus && (
                <div className="bg-[#FF6B00]/15 border border-[#FF6B00]/30 rounded-xl p-2.5 mb-4 text-xs text-[#FF6B00] leading-relaxed">
                  {backupStatus}
                </div>
              )}

              {!showHistoryView ? (
                <div className="flex flex-col gap-3">
                  <div className="bg-black border border-[#2C2C2E] rounded-xl p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-[#FF6B00]" />
                        Vault Password & Gmail
                      </label>
                      <button
                        onClick={() => setIsEditingPassword(!isEditingPassword)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          isEditingPassword 
                            ? 'bg-[#FF6B00] text-white' 
                            : 'bg-[#1C1C1E] border border-[#2C2C2E] text-[#8E8E93] hover:text-white'
                        }`}
                        title="Edit Account Details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-[#8E8E93]">
                      Registered Email: <span className="text-white font-medium">{registeredEmail || 'Not set'}</span>
                    </p>

                    {passwordChangeStatus && (
                      <span className="text-[11px] text-[#34C759] font-medium">
                        {passwordChangeStatus}
                      </span>
                    )}

                    {isEditingPassword && (
                      <div className="flex flex-col gap-2">
                        <input
                          type="email"
                          placeholder="Update Email / Gmail"
                          value={newEmailInput}
                          onChange={(e) => setNewEmailInput(e.target.value)}
                          className="bg-[#1C1C1E] border border-[#FF6B00] rounded-lg px-3 py-2 text-xs text-white placeholder-[#636366] focus:outline-none"
                        />

                        <input
                          type="password"
                          placeholder="New Vault Password"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          className="bg-[#1C1C1E] border border-[#FF6B00] rounded-lg px-3 py-2 text-xs text-white placeholder-[#636366] focus:outline-none"
                        />

                        <button
                          onClick={handleChangeMasterPassword}
                          className={`w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                            isPasswordSavedFeedback
                              ? 'bg-[#34C759] text-white'
                              : 'bg-[#FF6B00] hover:bg-[#E66000] text-white active:scale-95'
                          }`}
                        >
                          {isPasswordSavedFeedback ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              Updated ✓
                            </>
                          ) : (
                            'Save Account Updates'
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-black border border-[#2C2C2E] rounded-xl p-3.5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#FF6B00] flex items-center gap-1.5">
                        <Webhook className="w-4 h-4 text-[#FF6B00]" />
                        Google Drive Webhook Integration
                      </label>
                      <button
                        onClick={() => setIsEditingGDriveConfig(!isEditingGDriveConfig)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          isEditingGDriveConfig 
                            ? 'bg-[#FF6B00] text-white' 
                            : 'bg-[#1C1C1E] border border-[#2C2C2E] text-[#8E8E93] hover:text-white'
                        }`}
                        title="Edit Settings"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-[#8E8E93] flex items-center gap-1.5">
                        <Link className="w-3.5 h-3.5 text-[#FF6B00]" />
                        Google Drive Folder Link
                      </label>
                      <input
                        type="text"
                        disabled={!isEditingGDriveConfig}
                        placeholder="https://drive.google.com/drive/folders/..."
                        value={gdriveLinkInput}
                        onChange={(e) => setGdriveLinkInput(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 text-xs text-white placeholder-[#636366] transition-colors ${
                          isEditingGDriveConfig 
                            ? 'bg-[#1C1C1E] border-[#FF6B00] focus:outline-none' 
                            : 'bg-[#141416] border-[#2C2C2E] opacity-75 cursor-not-allowed'
                        }`}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-[#8E8E93] flex items-center gap-1.5">
                        <Webhook className="w-3.5 h-3.5 text-[#FF6B00]" />
                        Apps Script Webhook URL
                      </label>
                      <input
                        type="text"
                        disabled={!isEditingGDriveConfig}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={gdriveWebhookInput}
                        onChange={(e) => setGdriveWebhookInput(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 text-xs text-white placeholder-[#636366] transition-colors ${
                          isEditingGDriveConfig 
                            ? 'bg-[#1C1C1E] border-[#FF6B00] focus:outline-none' 
                            : 'bg-[#141416] border-[#2C2C2E] opacity-75 cursor-not-allowed'
                        }`}
                      />
                    </div>

                    <AnimatePresence>
                      {(isEditingGDriveConfig || hasUnsavedConfigChanges) && (
                        <motion.button
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          onClick={handleSaveGDriveConfig}
                          className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-md ${
                            isLinkSavedFeedback
                              ? 'bg-[#34C759] text-white'
                              : 'bg-[#FF6B00] hover:bg-[#E66000] text-white active:scale-95'
                          }`}
                        >
                          {isLinkSavedFeedback ? (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" />
                              Saved ✓
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={handleSyncAllNotesToGDrive}
                    disabled={isSyncingGDrive}
                    className="w-full bg-[#FF6B00] hover:bg-[#E66000] text-white py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-md disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <FolderSync className={`w-4.5 h-4.5 text-white ${isSyncingGDrive ? 'animate-spin' : ''}`} />
                      <span>Sync ALL Notes to Google Drive</span>
                    </div>
                    <CloudUpload className="w-4 h-4 text-white" />
                  </button>

                  <button
                    onClick={handleOpenHistoryWithAuth}
                    className="w-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-between border border-[#3A3A3C]"
                  >
                    <div className="flex items-center gap-2">
                      <Archive className="w-4 h-4 text-[#FF6B00]" />
                      <span>Archive & Trash History</span>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-[#8E8E93]" />
                  </button>

                  <button
                    onClick={handleExportBackup}
                    className="w-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-between border border-[#3A3A3C]"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-[#FF6B00]" />
                      <span>Download Full JSON Backup</span>
                    </div>
                  </button>

                  <label className="w-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-between border border-[#3A3A3C] cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#FF6B00]" />
                      <span>Import Full JSON Backup</span>
                    </div>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleImportBackup} 
                      className="hidden" 
                    />
                  </label>

                  <button
                    onClick={handleResetAccount}
                    className="w-full bg-[#FF3B30]/15 hover:bg-[#FF3B30]/25 text-[#FF3B30] py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-between border border-[#FF3B30]/30 transition-colors mt-2"
                  >
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-[#FF3B30]" />
                      <span>Reset Vault & Create New Account</span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2C2C2E]">
                    <span className="text-xs font-bold text-[#FF6B00]">Authenticated Archive History</span>
                    <button 
                      onClick={() => setShowHistoryView(false)}
                      className="text-[#8E8E93] text-xs hover:text-white"
                    >
                      Back to Settings
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Archived Notes ({archivedNotes.length})
                    </h4>
                    <div className="flex flex-col gap-2">
                      {archivedNotes.map((note) => (
                        <div key={note.id} className="bg-black border border-[#2C2C2E] rounded-xl p-3 flex items-center justify-between">
                          <span className="text-xs font-medium text-white truncate max-w-[150px]">{note.title}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleRestoreNote(note)}
                              className="text-[10px] text-[#34C759] bg-[#34C759]/10 px-2 py-1 rounded-md font-medium"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDeleteNote(note.id)}
                              className="text-[#636366] hover:text-[#FF3B30] p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {archivedNotes.length === 0 && <p className="text-xs text-[#636366]">No archived notes.</p>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Finished Tasks ({archivedTodos.length})
                    </h4>
                    <div className="flex flex-col gap-2">
                      {archivedTodos.map((todo) => (
                        <div key={todo.id} className="bg-black border border-[#2C2C2E] rounded-xl p-3 flex items-center justify-between">
                          <span className="text-xs text-[#8E8E93] line-through truncate max-w-[150px]">{todo.title}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleRestoreTodo(todo)}
                              className="text-[10px] text-[#34C759] bg-[#34C759]/10 px-2 py-1 rounded-md font-medium"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDeleteTodo(todo.id)}
                              className="text-[#636366] hover:text-[#FF3B30] p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {archivedTodos.length === 0 && <p className="text-xs text-[#636366]">No finished task history.</p>}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 mt-4 border-t border-[#2C2C2E] flex justify-end">
                <button
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setShowHistoryView(false);
                    setIsHistoryAuthenticated(false);
                    setBackupStatus('');
                  }}
                  className="py-2 px-4 rounded-pill border border-[#2C2C2E] text-xs text-[#8E8E93] hover:text-white"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
