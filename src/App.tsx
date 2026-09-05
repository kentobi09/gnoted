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
  Mail,
  MoreVertical
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
  important: { label: 'Important', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  neutral: { label: 'Neutral', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
  if_time: { label: 'Someday', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' }
};

const MASTER_PASSWORD_STORAGE_KEY = 'secure_vault_master_passcode';
const IS_REGISTERED_STORAGE_KEY = 'secure_vault_is_registered';
const REGISTERED_EMAIL_STORAGE_KEY = 'secure_vault_registered_email';
const TARGET_SHAPE_STORAGE_KEY = 'secure_vault_target_shape';
const TARGET_TAPS_STORAGE_KEY = 'secure_vault_target_taps';
const TARGET_SEQUENCE_STORAGE_KEY = 'secure_vault_target_shape_sequence';

interface ShapeDefinition {
  id: string;
  label: string;
  color: string;
  shape: string;
}

const AVAILABLE_SHAPES: ShapeDefinition[] = [
  { id: 'blue_circle', label: 'Blue Circle', color: '#3B82F6', shape: 'circle' },
  { id: 'rose_crescent', label: 'Rose Crescent', color: '#F43F5E', shape: 'crescent' },
  { id: 'gold_star', label: 'Gold Star', color: '#F59E0B', shape: 'star' },
  { id: 'purple_hexagon', label: 'Purple Hexagon', color: '#A855F7', shape: 'hexagon' },
  { id: 'orange_pentagon', label: 'Amber Pentagon', color: '#F59E0B', shape: 'pentagon' },
  { id: 'green_square', label: 'Green Square', color: '#10B981', shape: 'square' },
  { id: 'red_triangle', label: 'Red Triangle', color: '#EF4444', shape: 'triangle' },
  { id: 'yellow_diamond', label: 'Yellow Diamond', color: '#FBBF24', shape: 'diamond' },
  { id: 'teal_octagon', label: 'Teal Octagon', color: '#14B8A6', shape: 'octagon' },
  { id: 'pink_heart', label: 'Pink Heart', color: '#EC4899', shape: 'heart' },
  { id: 'cyan_oval', label: 'Cyan Oval', color: '#06B6D4', shape: 'oval' },
  { id: 'mint_cross', label: 'Mint Cross', color: '#34D399', shape: 'cross' }
];

function ShapeIcon({ shape, color, className = "w-6 h-6" }: { shape: string; color: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      {shape === 'circle' && <circle cx="50" cy="50" r="42" fill={color} />}
      {shape === 'square' && <rect x="10" y="10" width="80" height="80" rx="16" fill={color} />}
      {shape === 'triangle' && <polygon points="50,8 92,88 8,88" fill={color} />}
      {shape === 'diamond' && <polygon points="50,8 92,50 50,92 8,50" fill={color} />}
      {shape === 'hexagon' && <polygon points="50,5 92,25 92,75 50,95 8,75 8,25" fill={color} />}
      {shape === 'star' && <polygon points="50,4 63,35 96,38 72,60 79,93 50,75 21,93 28,60 4,38 37,35" fill={color} />}
      {shape === 'pentagon' && <polygon points="50,5 95,37 78,91 22,91 5,37" fill={color} />}
      {shape === 'octagon' && <polygon points="30,8 70,8 92,30 92,70 70,92 30,92 8,70 8,30" fill={color} />}
      {shape === 'heart' && <path d="M50 88 C20 60 5 40 15 20 C25 5 45 15 50 25 C55 15 75 5 85 20 C95 40 80 60 50 88 Z" fill={color} />}
      {shape === 'oval' && <ellipse cx="50" cy="50" rx="44" ry="28" fill={color} />}
      {shape === 'cross' && <path d="M36 8 H64 V36 H92 V64 H64 V92 H36 V64 H8 V36 H36 Z" fill={color} />}
      {shape === 'crescent' && <path d="M50 8 A42 42 0 1 0 92 50 A32 32 0 1 1 50 8 Z" fill={color} />}
    </svg>
  );
}

function ToastNotificationBanner({ 
  message, 
  onClose 
}: { 
  message: string; 
  onClose: () => void 
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.8}
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.x) > 60 || Math.abs(info.velocity.x) > 250) {
              onClose();
            }
          }}
          className="fixed top-4 left-4 right-4 max-w-md mx-auto z-[9999] pointer-events-auto touch-pan-x cursor-grab active:cursor-grabbing select-none"
        >
          <div className="bg-[#F59E0B] text-black p-3.5 px-4 rounded-2xl shadow-xl shadow-[#F59E0B]/20 flex items-center justify-between border border-[#FBBF24]/50 backdrop-blur-md">
            <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
              <BellRing className="w-5 h-5 shrink-0 text-black" />
              <p className="text-xs font-bold leading-snug break-words text-black">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="text-black/80 hover:text-black p-1.5 rounded-full hover:bg-black/10 shrink-0 transition-colors"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CustomDropdown<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Select...'
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (val: T) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#08080A] border border-[#27272A] hover:border-[#F59E0B] text-xs text-white rounded-xl px-3 py-2.5 flex items-center justify-between focus:outline-none transition-colors"
      >
        <span className="flex items-center gap-2 truncate font-medium">
          {selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-[#F59E0B]' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 bg-[#14151B] border border-[#27272A] rounded-xl shadow-2xl z-[99] overflow-hidden py-1"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors ${
                  opt.value === value
                    ? 'bg-[#F59E0B]/15 text-[#F59E0B] font-semibold'
                    : 'text-zinc-200 hover:bg-white/5 font-normal'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {opt.icon}
                  {opt.label}
                </span>
                {opt.value === value && <Check className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<'notes' | 'todos'>('notes');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Password & Verification Shape State
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

  const [targetShapeSequence, setTargetShapeSequence] = useState<string[]>(() => {
    const saved = localStorage.getItem(TARGET_SEQUENCE_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    const oldShape = localStorage.getItem(TARGET_SHAPE_STORAGE_KEY) || 'orange_pentagon';
    const oldTaps = parseInt(localStorage.getItem(TARGET_TAPS_STORAGE_KEY) || '5', 10);
    return Array(oldTaps).fill(oldShape);
  });

  // Registration State
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShapeSequence, setRegShapeSequence] = useState<string[]>([]);
  const [regError, setRegError] = useState('');

  // Lock Screen & Shape Challenge State
  const [enteredPassword, setEnteredPassword] = useState('');
  const [lockError, setLockError] = useState('');
  const [isPasswordPassed, setIsPasswordPassed] = useState(false);
  const [enteredShapeSequence, setEnteredShapeSequence] = useState<string[]>([]);
  const [shapeRotations, setShapeRotations] = useState<Record<string, number>>({});

  // Settings State
  const [isEditingPassword, setIsEditingPassword] = useState(true);
  const [newPasswordInput, setNewPasswordInput] = useState('');
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
  const [isBbqMenuOpen, setIsBbqMenuOpen] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const [todos, setTodos] = useState<DecryptedTodo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState<string>('');
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>('important');
  const [newTodoDueDate, setNewTodoDueDate] = useState<string>('');
  const [todoError, setTodoError] = useState<string>('');

  const [notifiedTaskIds, setNotifiedTaskIds] = useState<Record<number, boolean>>({});
  const [activeToastAlert, setActiveToastAlert] = useState<string>('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    () => (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default')
  );

  const dateInputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    }
  };

  // Google Drive Config State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gdriveLinkInput, setGdriveLinkInput] = useState<string>(
    () => getSavedGoogleDriveFolderLink() || ''
  );
  const [gdriveWebhookInput, setGdriveWebhookInput] = useState<string>(
    () => getSavedGoogleDriveWebhookUrl() || ''
  );
  const [isEditingGDriveConfig, setIsEditingGDriveConfig] = useState(false);
  const [isSyncingGDrive, setIsSyncingGDrive] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [isLinkSavedFeedback, setIsLinkSavedFeedback] = useState(false);

  // History Security Auth State
  const [showHistoryView, setShowHistoryView] = useState(false);

  // Initial load
  useEffect(() => {
    if (isUnlocked) {
      loadNotes();
      loadTodos();
    }
  }, [isUnlocked]);

  // Request browser notification permissions on demand
  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          setActiveToastAlert('Deadline notifications enabled successfully.');
        } else if (perm === 'denied') {
          setActiveToastAlert('Notification permission was blocked in settings.');
        }
      } catch (err) {
        console.error('Notification permission error:', err);
        setActiveToastAlert('Notification request failed or not supported.');
      }
    } else {
      setActiveToastAlert('Notifications API is not supported on this browser/device.');
    }
  };

  // Check upcoming/overdue tasks every 10 seconds for notifications & toast banner
  useEffect(() => {
    if (!isUnlocked || todos.length === 0) return;

    const interval = setInterval(() => {
      const nowMs = Date.now();
      todos.forEach((todo) => {
        if (todo.completed || todo.isArchived || !todo.dueDate || !todo.id) return;

        const dueMs = new Date(todo.dueDate).getTime();
        if (isNaN(dueMs)) return;

        const diffMinutes = (dueMs - nowMs) / (1000 * 60);

        if (diffMinutes <= 15 && diffMinutes >= -120 && !notifiedTaskIds[todo.id]) {
          const alertMsg = `Task Reminder: "${todo.title}" is due ${
            diffMinutes < 0 ? 'now or overdue' : `in ${Math.round(diffMinutes)} minutes`
          }!`;

          setActiveToastAlert(alertMsg);

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('GNOTED Task Reminder', {
                body: alertMsg,
                icon: '/icon-192.png'
              });
            } catch (e) {
              console.error('Browser notification error:', e);
            }
          }

          setNotifiedTaskIds((prev) => ({ ...prev, [todo.id!]: true }));
        }
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [isUnlocked, todos, notifiedTaskIds]);

  const loadNotes = async () => {
    try {
      const encryptedRows = await getAllEncryptedNotes();
      const decrypted: DecryptedNote[] = [];

      for (const row of encryptedRows) {
        try {
          const decryptedTitle = await decryptText({
            ciphertextBase64: row.encryptedTitle,
            ivBase64: row.titleIv
          });
          const decryptedContent = await decryptText({
            ciphertextBase64: row.encryptedContent,
            ivBase64: row.contentIv
          });
          decrypted.push({
            id: row.id,
            title: decryptedTitle,
            content: decryptedContent,
            categoryTag: row.categoryTag || 'Personal',
            isSensitive: row.isSensitive,
            isArchived: row.isArchived,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          });
        } catch (e) {
          console.error(`Failed to decrypt note #${row.id}`, e);
        }
      }

      decrypted.sort((a, b) => b.updatedAt - a.updatedAt);
      setNotes(decrypted);
    } catch (err) {
      console.error('Error loading notes:', err);
    }
  };

  const loadTodos = async () => {
    try {
      const encryptedRows = await getAllEncryptedTodos();
      const decrypted: DecryptedTodo[] = [];

      for (const row of encryptedRows) {
        try {
          const decryptedTitle = await decryptText({
            ciphertextBase64: row.encryptedTitle,
            ivBase64: row.titleIv
          });
          decrypted.push({
            id: row.id,
            title: decryptedTitle,
            completed: row.completed,
            isArchived: row.isArchived,
            priority: row.priority || 'important',
            dueDate: row.dueDate,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          });
        } catch (e) {
          console.error(`Failed to decrypt todo #${row.id}`, e);
        }
      }

      decrypted.sort((a, b) => b.createdAt - a.createdAt);
      setTodos(decrypted);
    } catch (err) {
      console.error('Error loading todos:', err);
    }
  };

  // Password Registration Handler
  const handleCreateVaultPassword = () => {
    setRegError('');
    if (!regPassword) {
      setRegError('Passcode cannot be empty.');
      return;
    }
    if (regPassword.length < 4) {
      setRegError('Passcode must be at least 4 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passcodes do not match.');
      return;
    }
    if (regShapeSequence.length < 2) {
      setRegError('Please tap at least 2 shapes below to create your secret entry pattern.');
      return;
    }

    localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, regPassword);
    localStorage.setItem(IS_REGISTERED_STORAGE_KEY, 'true');
    localStorage.setItem(TARGET_SEQUENCE_STORAGE_KEY, JSON.stringify(regShapeSequence));

    setMasterPassword(regPassword);
    setTargetShapeSequence(regShapeSequence);
    setIsRegistered(true);
    setIsUnlocked(true);
  };

  // Login Handler (Password Step)
  const handleLoginPasswordStepSubmit = () => {
    setLockError('');
    const storedMaster = localStorage.getItem(MASTER_PASSWORD_STORAGE_KEY);
    if (!storedMaster || enteredPassword !== storedMaster) {
      setLockError('Incorrect passcode.');
      return;
    }

    setMasterPassword(enteredPassword);
    setIsPasswordPassed(true);
    setEnteredPassword('');
    setEnteredShapeSequence([]);
  };

  // Shape Tap Handler for Stealth Lock Screen
  const handleShapeClick = (shapeId: string) => {
    setShapeRotations((prev) => ({
      ...prev,
      [shapeId]: (prev[shapeId] || 0) + 360
    }));

    const nextEntered = [...enteredShapeSequence, shapeId];
    const expectedShape = targetShapeSequence[enteredShapeSequence.length];

    if (shapeId === expectedShape) {
      setEnteredShapeSequence(nextEntered);

      if (nextEntered.length === targetShapeSequence.length) {
        setIsUnlocked(true);
        setIsPasswordPassed(false);
        setEnteredShapeSequence([]);
      }
    } else {
      if (shapeId === targetShapeSequence[0]) {
        setEnteredShapeSequence([shapeId]);
      } else {
        setEnteredShapeSequence([]);
      }
    }
  };

  const handleSaveSecuritySettings = () => {
    setPasswordChangeStatus('');

    if (newPasswordInput) {
      if (newPasswordInput.length < 4) {
        setPasswordChangeStatus('New passcode must be at least 4 characters.');
        return;
      }

      localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, newPasswordInput);
      setMasterPassword(newPasswordInput);
      setNewPasswordInput('');
    }

    if (regShapeSequence.length >= 2) {
      localStorage.setItem(TARGET_SEQUENCE_STORAGE_KEY, JSON.stringify(regShapeSequence));
      setTargetShapeSequence(regShapeSequence);
    }

    setIsPasswordSavedFeedback(true);
    setTimeout(() => {
      setIsPasswordSavedFeedback(false);
      setIsEditingPassword(false);
    }, 1500);
  };

  const handleSaveNote = async () => {
    if (!editingNote.title?.trim() || !editingNote.content?.trim()) {
      setSaveError('Please provide both a title and content.');
      return;
    }

    try {
      const encTitle = await encryptText(editingNote.title.trim());
      const encContent = await encryptText(editingNote.content.trim());
      const now = Date.now();

      const noteToSave: EncryptedNoteRow = {
        id: editingNote.id,
        encryptedTitle: encTitle.ciphertextBase64,
        titleIv: encTitle.ivBase64,
        encryptedContent: encContent.ciphertextBase64,
        contentIv: encContent.ivBase64,
        categoryTag: editingNote.categoryTag || 'Personal',
        isSensitive: editingNote.categoryTag === 'Passwords' || editingNote.categoryTag === 'Private Keys' || Boolean(editingNote.isSensitive),
        isArchived: Boolean(editingNote.isArchived),
        createdAt: editingNote.createdAt || now,
        updatedAt: now
      };

      await saveEncryptedNote(noteToSave);
      await loadNotes();
      setIsEditorOpen(false);
      setEditingNote({ title: '', content: '', categoryTag: 'Personal', isSensitive: false });
      setSaveError('');
    } catch (err) {
      console.error('Save note error:', err);
      setSaveError('Failed to encrypt and save note.');
    }
  };

  const handleInlineUpdateNote = async (updatedNote: DecryptedNote) => {
    setSelectedNoteForView(updatedNote);
    setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));

    if (!updatedNote.id) return;
    try {
      const encTitle = await encryptText(updatedNote.title || 'Untitled Note');
      const encContent = await encryptText(updatedNote.content || '');
      const now = Date.now();

      await saveEncryptedNote({
        id: updatedNote.id,
        encryptedTitle: encTitle.ciphertextBase64,
        titleIv: encTitle.ivBase64,
        encryptedContent: encContent.ciphertextBase64,
        contentIv: encContent.ivBase64,
        categoryTag: updatedNote.categoryTag,
        isSensitive: updatedNote.categoryTag === 'Passwords' || updatedNote.categoryTag === 'Private Keys' || Boolean(updatedNote.isSensitive),
        isArchived: Boolean(updatedNote.isArchived),
        createdAt: updatedNote.createdAt,
        updatedAt: now
      });
    } catch (err) {
      console.error('Failed to inline update note:', err);
    }
  };

  const handleArchiveNote = async (note: DecryptedNote) => {
    if (!note.id) return;
    try {
      const encTitle = await encryptText(note.title);
      const encContent = await encryptText(note.content);

      await saveEncryptedNote({
        id: note.id,
        encryptedTitle: encTitle.ciphertextBase64,
        titleIv: encTitle.ivBase64,
        encryptedContent: encContent.ciphertextBase64,
        contentIv: encContent.ivBase64,
        categoryTag: note.categoryTag,
        isSensitive: note.isSensitive,
        isArchived: true,
        createdAt: note.createdAt,
        updatedAt: Date.now()
      });

      if (selectedNoteForView?.id === note.id) {
        setSelectedNoteForView(null);
      }

      await loadNotes();
    } catch (err) {
      console.error('Archive note error:', err);
    }
  };

  const handleRestoreNote = async (note: DecryptedNote) => {
    if (!note.id) return;
    try {
      const encTitle = await encryptText(note.title);
      const encContent = await encryptText(note.content);

      await saveEncryptedNote({
        id: note.id,
        encryptedTitle: encTitle.ciphertextBase64,
        titleIv: encTitle.ivBase64,
        encryptedContent: encContent.ciphertextBase64,
        contentIv: encContent.ivBase64,
        categoryTag: note.categoryTag,
        isSensitive: note.isSensitive,
        isArchived: false,
        createdAt: note.createdAt,
        updatedAt: Date.now()
      });

      await loadNotes();
    } catch (err) {
      console.error('Restore note error:', err);
    }
  };

  const handlePermanentDeleteNote = async (id?: number) => {
    if (!id) return;
    try {
      await deleteEncryptedNote(id);
      await loadNotes();
    } catch (err) {
      console.error('Delete note error:', err);
    }
  };

  const handleSaveTodo = async () => {
    setTodoError('');
    if (!newTodoTitle.trim()) {
      setTodoError('Please enter a task title.');
      return;
    }

    try {
      const encTitle = await encryptText(newTodoTitle.trim());
      const now = Date.now();

      const todoToSave: EncryptedTodoRow = {
        encryptedTitle: encTitle.ciphertextBase64,
        titleIv: encTitle.ivBase64,
        completed: false,
        isArchived: false,
        priority: newTodoPriority,
        dueDate: newTodoDueDate || undefined,
        createdAt: now,
        updatedAt: now
      };

      await saveEncryptedTodo(todoToSave);
      setNewTodoTitle('');
      setNewTodoDueDate('');
      setNewTodoPriority('important');
      await loadTodos();
    } catch (err) {
      console.error('Save todo error:', err);
      setTodoError('Failed to encrypt and save task.');
    }
  };

  const handleToggleTodo = async (todo: DecryptedTodo) => {
    if (!todo.id) return;
    try {
      const encTitle = await encryptText(todo.title);

      await saveEncryptedTodo({
        id: todo.id,
        encryptedTitle: encTitle.ciphertextBase64,
        titleIv: encTitle.ivBase64,
        completed: !todo.completed,
        isArchived: !todo.completed,
        priority: todo.priority,
        dueDate: todo.dueDate,
        createdAt: todo.createdAt,
        updatedAt: Date.now()
      });

      await loadTodos();
    } catch (err) {
      console.error('Toggle todo error:', err);
    }
  };

  const handleRestoreTodo = async (todo: DecryptedTodo) => {
    if (!todo.id) return;
    try {
      const encTitle = await encryptText(todo.title);

      await saveEncryptedTodo({
        id: todo.id,
        encryptedTitle: encTitle.ciphertextBase64,
        titleIv: encTitle.ivBase64,
        completed: false,
        isArchived: false,
        priority: todo.priority,
        dueDate: todo.dueDate,
        createdAt: todo.createdAt,
        updatedAt: Date.now()
      });

      await loadTodos();
    } catch (err) {
      console.error('Restore todo error:', err);
    }
  };

  const handlePermanentDeleteTodo = async (id?: number) => {
    if (!id) return;
    try {
      await deleteEncryptedTodo(id);
      await loadTodos();
    } catch (err) {
      console.error('Delete todo error:', err);
    }
  };

  const handleSaveGDriveConfig = () => {
    saveGoogleDriveFolderLink(gdriveLinkInput);
    saveGoogleDriveWebhookUrl(gdriveWebhookInput);
    setIsLinkSavedFeedback(true);
    setTimeout(() => {
      setIsLinkSavedFeedback(false);
      setIsEditingGDriveConfig(false);
    }, 1500);
  };

  const handleSyncAllNotesToGDrive = async () => {
    setBackupStatus('');
    setIsSyncingGDrive(true);
    try {
      const activeNotesList = notes.filter((n) => !n.isArchived);
      if (activeNotesList.length === 0) {
        setBackupStatus('No active notes to sync.');
        setIsSyncingGDrive(false);
        return;
      }

      const res = await uploadDirectToGoogleDrive({
        filename: `gnoted_sync_${Date.now()}.json`,
        payloadJson: JSON.stringify(activeNotesList, null, 2)
      });

      setBackupStatus(res.message);
    } catch (e: any) {
      console.error('Sync error:', e);
      setBackupStatus(`Sync error: ${e?.message || 'Unknown failure'}`);
    } finally {
      setIsSyncingGDrive(false);
    }
  };

  const handleOpenHistoryWithAuth = () => {
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
      a.download = `gnoted_backup_${Date.now()}.json`;
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

  const formatDueDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // ────────────────── REGISTRATION PROCESS ──────────────────
  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-[#08080A] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        <ToastNotificationBanner 
          message={activeToastAlert} 
          onClose={() => setActiveToastAlert('')} 
        />

        <div className="w-full max-w-sm bg-[#111216] border border-[#27272A] rounded-2xl p-6 flex flex-col items-center text-center shadow-2xl relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#111216] flex items-center justify-center mb-4 border border-[#F59E0B]/30 p-1.5 shadow-lg">
            <img src="/logo.png" alt="GNOTED Logo" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-xl font-bold mb-6 tracking-widest text-white uppercase">GNOTED</h1>

          {regError && (
            <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/25 rounded-xl p-2.5 mb-4 text-xs text-[#FF3B30] w-full text-left">
              {regError}
            </div>
          )}

          <div className="w-full flex flex-col gap-3">
            <div className="relative w-full">
              <input
                type={showPasswordText ? 'text' : 'password'}
                placeholder="Passcode"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-[#08080A] border border-[#27272A] rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#F59E0B]"
              />
              <button
                type="button"
                onClick={() => setShowPasswordText(!showPasswordText)}
                className="absolute right-3 top-3.5 text-zinc-400 hover:text-white"
              >
                {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative w-full">
              <input
                type={showPasswordText ? 'text' : 'password'}
                placeholder="Confirm passcode"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateVaultPassword()}
                className="w-full bg-[#08080A] border border-[#27272A] rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#F59E0B]"
              />
              <button
                type="button"
                onClick={() => setShowPasswordText(!showPasswordText)}
                className="absolute right-3 top-3.5 text-zinc-400 hover:text-white"
              >
                {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="w-full text-left mt-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Secret Shape Combination:
                </label>
                {regShapeSequence.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRegShapeSequence([])}
                    className="text-[10px] text-[#F59E0B] hover:underline flex items-center gap-1 font-medium"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>

              {/* DEMO SEQUENCE PREVIEW BAR */}
              <div className="bg-[#08080A] border border-[#27272A] rounded-xl p-2 mb-2.5 min-h-[44px] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {regShapeSequence.length === 0 ? (
                  <span className="text-[11px] text-zinc-500 italic px-1">
                    Tap shapes below to demo your secret entry combination pattern (min 2)...
                  </span>
                ) : (
                  regShapeSequence.map((shapeId, idx) => {
                    const shapeDef = AVAILABLE_SHAPES.find((s) => s.id === shapeId);
                    if (!shapeDef) return null;
                    return (
                      <div
                        key={idx}
                        className="bg-[#111216] border border-[#F59E0B]/50 px-2 py-1 rounded-lg flex items-center gap-1.5 shrink-0 shadow-sm"
                      >
                        <span className="text-[9px] font-bold text-[#F59E0B]">{idx + 1}.</span>
                        <ShapeIcon shape={shapeDef.shape} color={shapeDef.color} className="w-4 h-4" />
                        <span className="text-[10px] font-medium text-white">{shapeDef.label.split(' ')[0]}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* SHAPE SELECTION GRID */}
              <div className="grid grid-cols-4 gap-2 bg-[#08080A] p-2.5 rounded-xl border border-[#27272A]">
                {AVAILABLE_SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setRegShapeSequence((prev) => [...prev, s.id])}
                    className="flex flex-col items-center justify-center p-2 rounded-lg border border-[#27272A] hover:border-[#F59E0B] bg-[#111216] active:scale-95 transition-all"
                  >
                    <ShapeIcon shape={s.shape} color={s.color} className="w-6 h-6" />
                    <span className="text-[9px] text-zinc-400 mt-1 truncate max-w-full leading-tight">
                      {s.label.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateVaultPassword}
              className="w-full bg-[#F59E0B] hover:bg-[#D97706] active:scale-[0.98] transition-all text-black font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm mt-2"
            >
              <Key className="w-4 h-4 text-black" />
              Create Account & Enter GNOTED
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────── ABSTRACT ART WALLPAPER SCREEN (STEALTH PATTERN GATE) ──────────────────
  if (!isUnlocked && isPasswordPassed) {
    const wallpaperShapes = [
      { id: 'blue_circle', color: '#3B82F6', shape: 'circle', top: '10%', left: '12%', size: 76, rotate: 0, opacity: 0.85 },
      { id: 'rose_crescent', color: '#F43F5E', shape: 'crescent', top: '18%', left: '72%', size: 88, rotate: -35, opacity: 0.8 },
      { id: 'gold_star', color: '#F59E0B', shape: 'star', top: '14%', left: '44%', size: 64, rotate: 24, opacity: 0.9 },
      { id: 'purple_hexagon', color: '#A855F7', shape: 'hexagon', top: '40%', left: '16%', size: 94, rotate: -18, opacity: 0.85 },
      { id: 'orange_pentagon', color: '#F59E0B', shape: 'pentagon', top: '46%', left: '60%', size: 100, rotate: 12, opacity: 0.95 },
      { id: 'green_square', color: '#10B981', shape: 'square', top: '30%', left: '80%', size: 70, rotate: 38, opacity: 0.8 },
      { id: 'red_triangle', color: '#EF4444', shape: 'triangle', top: '66%', left: '10%', size: 92, rotate: -22, opacity: 0.85 },
      { id: 'yellow_diamond', color: '#FBBF24', shape: 'diamond', top: '76%', left: '42%', size: 78, rotate: 15, opacity: 0.9 },
      { id: 'teal_octagon', color: '#14B8A6', shape: 'octagon', top: '80%', left: '78%', size: 74, rotate: -12, opacity: 0.85 },
      { id: 'pink_heart', color: '#EC4899', shape: 'heart', top: '34%', left: '38%', size: 68, rotate: 18, opacity: 0.8 },
      { id: 'cyan_oval', color: '#06B6D4', shape: 'oval', top: '60%', left: '72%', size: 84, rotate: -40, opacity: 0.85 },
      { id: 'mint_cross', color: '#34D399', shape: 'cross', top: '72%', left: '26%', size: 70, rotate: 28, opacity: 0.8 }
    ];

    return (
      <div className="fixed inset-0 w-full h-full bg-gradient-to-b from-[#08080A] via-[#0E0F14] to-[#040405] overflow-hidden select-none z-50 font-sans">
        <ToastNotificationBanner 
          message={activeToastAlert} 
          onClose={() => setActiveToastAlert('')} 
        />

        <div className="relative w-full h-full max-w-md mx-auto">
          {wallpaperShapes.map((item) => {
            const currentRotation = item.rotate + (shapeRotations[item.id] || 0);
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.85 }}
                animate={{ rotate: currentRotation }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                onClick={() => handleShapeClick(item.id)}
                style={{
                  position: 'absolute',
                  top: item.top,
                  left: item.left,
                  width: `${item.size}px`,
                  height: `${item.size}px`,
                  opacity: item.opacity
                }}
                className="flex items-center justify-center outline-none border-none bg-transparent cursor-pointer transition-transform focus:outline-none"
              >
                <ShapeIcon shape={item.shape} color={item.color} className="w-full h-full filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]" />
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // ────────────────── LOCK SCREEN ──────────────────
  if (!isUnlocked && !isPasswordPassed) {
    return (
      <div className="min-h-screen bg-[#08080A] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        <ToastNotificationBanner 
          message={activeToastAlert} 
          onClose={() => setActiveToastAlert('')} 
        />

        <div className="w-full max-w-sm bg-[#111216] border border-[#27272A] rounded-2xl p-6 flex flex-col items-center text-center shadow-2xl relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#111216] flex items-center justify-center mb-4 border border-[#F59E0B]/30 p-1.5 shadow-lg">
            <img src="/logo.png" alt="GNOTED Logo" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-xl font-bold mb-6 tracking-widest text-white uppercase">GNOTED</h1>

          {lockError && (
            <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/25 rounded-xl p-2.5 mb-4 text-xs text-[#FF3B30] w-full text-left">
              {lockError}
            </div>
          )}

          <div className="relative w-full mb-4">
            <input
              type={showPasswordText ? 'text' : 'password'}
              placeholder="Enter passcode"
              value={enteredPassword}
              onChange={(e) => setEnteredPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoginPasswordStepSubmit()}
              className="w-full bg-[#08080A] border border-[#27272A] rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#F59E0B]"
            />
            <button
              type="button"
              onClick={() => setShowPasswordText(!showPasswordText)}
              className="absolute right-3 top-3.5 text-zinc-400 hover:text-white"
            >
              {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleLoginPasswordStepSubmit}
            className="w-full bg-[#F59E0B] hover:bg-[#D97706] active:scale-[0.98] transition-all text-black font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm"
          >
            <Unlock className="w-4 h-4 text-black" />
            Unlock
          </button>
        </div>
      </div>
    );
  }

  // DEDICATED NOTE DETAIL VIEW SCREEN
  if (selectedNoteForView) {
    return (
      <div className="fixed inset-0 bg-[#08080A] z-50 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 300) {
              setSelectedNoteForView(null);
              setIsBbqMenuOpen(false);
            }
          }}
          className="min-h-screen bg-[#08080A] text-white p-4 max-w-md mx-auto font-sans flex flex-col justify-between relative touch-pan-y"
        >
          <div className="flex flex-col flex-1">
            <header className="flex items-center justify-between pt-2 pb-4 border-b border-[#27272A] relative">
              <button 
                onClick={() => {
                  setSelectedNoteForView(null);
                  setIsBbqMenuOpen(false);
                }}
                className="w-9 h-9 rounded-full bg-[#111216] border border-[#27272A] flex items-center justify-center text-zinc-400 hover:text-white"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <span className="text-xs font-bold text-[#F59E0B] bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-3 py-1 rounded-pill">
                {selectedNoteForView.categoryTag}
              </span>

              {/* BBQ Icon Button */}
              <button
                onClick={() => setIsBbqMenuOpen(!isBbqMenuOpen)}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                  isBbqMenuOpen
                    ? 'bg-[#F59E0B] text-black border-[#F59E0B]'
                    : 'bg-[#111216] border-[#27272A] text-zinc-400 hover:text-white'
                }`}
                title="More Options (BBQ Menu)"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* BBQ MENU POPUP */}
              <AnimatePresence>
                {isBbqMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-48 bg-[#18181B] border border-[#27272A] rounded-xl py-1.5 shadow-2xl z-50 flex flex-col"
                  >
                    {noteCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          handleInlineUpdateNote({
                            ...selectedNoteForView,
                            categoryTag: cat,
                            isSensitive: cat === 'Passwords' || cat === 'Private Keys'
                          });
                          setIsBbqMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                          selectedNoteForView.categoryTag === cat
                            ? 'text-[#F59E0B] font-semibold bg-white/5'
                            : 'text-zinc-200 hover:bg-white/5 font-normal'
                        }`}
                      >
                        <span>{cat}</span>
                        {selectedNoteForView.categoryTag === cat && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                        )}
                      </button>
                    ))}

                    <div className="border-t border-[#27272A] my-1" />

                    <button
                      onClick={() => {
                        setIsBbqMenuOpen(false);
                        setShowDeleteConfirmModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Note</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </header>

            {/* FULL SCREEN INLINE EDITABLE NOTE */}
            <div className="my-4 flex flex-col gap-2 flex-1">
              <input
                type="text"
                value={selectedNoteForView.title}
                onChange={(e) => handleInlineUpdateNote({ ...selectedNoteForView, title: e.target.value })}
                placeholder="Note Title..."
                className="w-full bg-transparent border-none text-2xl font-bold text-white focus:outline-none placeholder-zinc-600 tracking-tight"
              />

              <p className="text-[11px] text-zinc-500 mb-2">
                Last updated: {new Date(selectedNoteForView.updatedAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>

              <textarea
                value={selectedNoteForView.content}
                onChange={(e) => handleInlineUpdateNote({ ...selectedNoteForView, content: e.target.value })}
                placeholder="Type your note content here..."
                className="w-full flex-1 min-h-[350px] bg-transparent border-none text-sm text-white focus:outline-none resize-none leading-relaxed placeholder-zinc-600"
              />
            </div>
          </div>

          {/* DELETE CONFIRMATION MODAL */}
          <AnimatePresence>
            {showDeleteConfirmModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[99]">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-[#111216] border border-[#27272A] rounded-2xl w-full max-w-sm p-5 shadow-2xl text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-[#FF3B30]/15 border border-[#FF3B30]/30 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-[#FF3B30]" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Delete Note?</h3>
                  <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
                    Are you sure you want to delete <span className="text-white font-semibold">"{selectedNoteForView.title}"</span>? This action cannot be undone.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className="flex-1 py-2.5 rounded-pill border border-[#27272A] text-zinc-400 text-xs font-semibold hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await handlePermanentDeleteNote(selectedNoteForView.id);
                        setShowDeleteConfirmModal(false);
                        setSelectedNoteForView(null);
                      }}
                      className="flex-1 py-2.5 rounded-pill bg-[#FF3B30] hover:bg-[#D32F2F] text-white text-xs font-bold shadow-md"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="min-h-screen bg-[#08080A] text-white p-4 max-w-md mx-auto pb-32 font-sans relative">
      <ToastNotificationBanner 
        message={activeToastAlert} 
        onClose={() => setActiveToastAlert('')} 
      />

      <header className="flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#111216] flex items-center justify-center border border-[#F59E0B]/30 p-0.5 overflow-hidden shadow-sm">
            <img src="/logo.png" alt="GNOTED Logo" className="w-full h-full object-cover rounded-full" />
          </div>
          <span className="text-base font-bold tracking-wider text-white">GNOTED</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAllNotesToGDrive}
            disabled={isSyncingGDrive}
            className="w-9 h-9 rounded-full bg-[#111216] border border-[#27272A] flex items-center justify-center text-[#F59E0B] hover:text-white disabled:opacity-50 transition-colors"
            title="Upload Directly to Google Drive Webhook"
          >
            <FolderSync className={`w-4.5 h-4.5 ${isSyncingGDrive ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 rounded-full bg-[#111216] border border-[#27272A] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            title="Settings & Security"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {activeNavTab === 'todos' && (
        <div className="my-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">To-Do Tasks</h1>
        </div>
      )}

      {/* NOTES TAB */}
      {activeNavTab === 'notes' && (
        <div>
          <div className="relative my-4">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111216] border border-[#27272A] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#F59E0B] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar my-4 py-1">
            {noteCategories.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-pill text-xs font-bold whitespace-nowrap transition-all ${
                  selectedTag === tag 
                    ? 'bg-[#F59E0B] text-black shadow-md shadow-[#F59E0B]/20' 
                    : 'bg-[#111216] text-white border border-[#27272A] hover:bg-[#1A1B22]'
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
                    className="bg-[#111216] border border-[#27272A] rounded-2xl p-4 flex flex-col justify-between min-h-[140px] cursor-pointer hover:border-[#F59E0B]/60 transition-all active:scale-[0.98]"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[11px] font-medium text-[#F59E0B] bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2 py-0.5 rounded-md">
                          {note.categoryTag}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveNote(note);
                          }}
                          className="text-zinc-500 hover:text-[#FF3B30] p-0.5"
                          title="Archive Note"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h3 className="font-semibold text-sm text-white mb-1 leading-snug line-clamp-1">
                        {note.title}
                      </h3>

                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                        {note.isSensitive ? '••••••••••••' : note.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#27272A]">
                      <span className="text-[10px] text-zinc-500">
                        {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      {note.isSensitive && (
                        <span className="text-[10px] text-[#F59E0B] font-medium">
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
            <div className="text-center py-16 text-zinc-500">
              <p className="text-sm font-medium text-zinc-400">No {selectedTag} notes</p>
              <p className="text-xs mt-1">Tap 'Add Note' below to create one.</p>
            </div>
          )}

          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-10">
            <button
              onClick={() => {
                setSaveError('');
                const initTag = selectedTag || 'Personal';
                setEditingNote({ 
                  title: '', 
                  content: '', 
                  categoryTag: initTag, 
                  isSensitive: initTag === 'Passwords' || initTag === 'Private Keys' 
                });
                setIsEditorOpen(true);
              }}
              className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold py-3.5 rounded-pill shadow-xl shadow-[#F59E0B]/25 flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5] text-black" />
              Add Note
            </button>
          </div>
        </div>
      )}

      {/* TO-DO TAB */}
      {activeNavTab === 'todos' && (
        <div className="mt-2 w-full overflow-hidden">
          {notificationPermission !== 'granted' && (
            <div className="bg-[#111216] border border-[#F59E0B]/40 rounded-2xl p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span className="text-xs text-white font-medium">Enable task deadline notifications</span>
              </div>
              <button
                onClick={handleRequestNotificationPermission}
                className="bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm"
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

          <div className="bg-[#111216] border border-[#27272A] rounded-2xl p-3.5 flex flex-col gap-3 mb-4 w-full">
            <input 
              type="text"
              placeholder="Add a new task title..."
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTodo()}
              className="w-full bg-[#08080A] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#F59E0B]"
            />
            
            <div className="grid grid-cols-3 gap-2 w-full items-center">
              <div 
                onClick={openDatePicker}
                className="bg-[#08080A] border border-[#27272A] hover:border-[#F59E0B] rounded-xl px-2.5 py-2.5 flex items-center justify-center gap-1.5 cursor-pointer relative transition-colors"
                title="Select Task Deadline Date & Time"
              >
                <Clock className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                <span className="text-xs font-medium text-white truncate">
                  {newTodoDueDate ? formatDueDateDisplay(newTodoDueDate) : 'Deadline'}
                </span>
                <input 
                  ref={dateInputRef}
                  type="datetime-local"
                  value={newTodoDueDate}
                  onChange={(e) => setNewTodoDueDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>

              <CustomDropdown
                value={newTodoPriority}
                options={[
                  { value: 'urgent', label: '🔴 Urgent' },
                  { value: 'important', label: '🟡 Important' },
                  { value: 'neutral', label: '🔵 Neutral' },
                  { value: 'if_time', label: '🟢 Someday' }
                ]}
                onChange={(val) => setNewTodoPriority(val as TodoPriority)}
              />

              <button
                onClick={handleSaveTodo}
                className="bg-[#F59E0B] hover:bg-[#D97706] text-black py-2.5 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all w-full flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4 stroke-[2.5] text-black" />
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
                    className="bg-[#111216] border border-[#27272A] rounded-2xl p-3.5 flex items-center justify-between group"
                  >
                    <div 
                      onClick={() => handleToggleTodo(todo)}
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-md border border-[#27272A] bg-[#08080A] flex items-center justify-center hover:border-[#F59E0B]">
                        <Check className="w-3.5 h-3.5 stroke-[3] text-transparent hover:text-[#F59E0B]" />
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
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span className={`text-[10px] font-medium ${
                              isDueSoonOrOverdue ? 'text-[#FF3B30]' : 'text-zinc-400'
                            }`}>
                              Due: {formatDueDateDisplay(todo.dueDate)} {isDueSoonOrOverdue ? '(Due Now)' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleTodo(todo)}
                      className="text-xs text-[#F59E0B] bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 px-2.5 py-1 rounded-lg font-medium"
                    >
                      Done
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {activeTodos.length === 0 && (
            <div className="text-center py-16 text-zinc-500">
              <p className="text-sm font-medium text-zinc-400">No active tasks</p>
              <p className="text-xs mt-1">Add a task above. Finished tasks move to History.</p>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#08080A]/95 backdrop-blur-md border-t border-[#27272A] px-6 py-2.5 flex items-center justify-around z-40">
        <button
          onClick={() => setActiveNavTab('notes')}
          className={`flex flex-col items-center gap-1 py-1 px-8 rounded-xl transition-all ${
            activeNavTab === 'notes' ? 'text-[#F59E0B]' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[11px] font-semibold">Notes</span>
        </button>

        <button
          onClick={() => setActiveNavTab('todos')}
          className={`flex flex-col items-center gap-1 py-1 px-8 rounded-xl transition-all ${
            activeNavTab === 'todos' ? 'text-[#F59E0B]' : 'text-zinc-400 hover:text-white'
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
              className="bg-[#111216] border border-[#27272A] rounded-2xl w-full max-w-sm p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">
                  {editingNote.id ? 'Edit Note' : 'Add Encrypted Note'}
                </h2>
                <button 
                  onClick={() => setIsEditorOpen(false)}
                  className="text-zinc-400 hover:text-white"
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
                className="w-full bg-[#08080A] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 mb-3 focus:outline-none focus:border-[#F59E0B]"
              />

              <textarea
                placeholder="Write passwords, private text, or sensitive notes..."
                value={editingNote.content || ''}
                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                rows={4}
                className="w-full bg-[#08080A] border border-[#27272A] rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 mb-3 focus:outline-none focus:border-[#F59E0B] resize-none"
              />

              <div className="mb-4">
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
                  Category Tag:
                </label>
                <CustomDropdown
                  value={editingNote.categoryTag || 'Personal'}
                  options={[
                    { value: 'Personal', label: 'Personal' },
                    { value: 'Passwords', label: 'Passwords' },
                    { value: 'Private Keys', label: 'Private Keys' }
                  ]}
                  onChange={(val) => setEditingNote({
                    ...editingNote,
                    categoryTag: val,
                    isSensitive: val === 'Passwords' || val === 'Private Keys'
                  })}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="flex-1 py-2.5 rounded-pill border border-[#27272A] text-zinc-400 text-xs font-semibold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="flex-1 py-2.5 rounded-pill bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs font-bold shadow-md"
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
              className="bg-[#111216] border border-[#27272A] rounded-2xl w-full max-w-sm p-5 shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#F59E0B]" />
                  Settings
                </h2>
                <button 
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setShowHistoryView(false);
                    setBackupStatus('');
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {backupStatus && (
                <div className="bg-[#F59E0B]/15 border border-[#F59E0B]/30 rounded-xl p-2.5 mb-4 text-xs text-[#F59E0B] leading-relaxed">
                  {backupStatus}
                </div>
              )}

              {!showHistoryView ? (
                <div className="flex flex-col gap-4">
                  {/* SECTION 1: SECURITY & PASSCODE */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B] mb-1.5 px-0.5">
                      Security & Passcode
                    </h3>
                    <div className="bg-[#08080A] border border-[#27272A] rounded-xl p-3.5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <KeyRound className="w-4 h-4 text-[#F59E0B]" />
                          GNOTED Security & Verification
                        </label>
                        <button
                          onClick={() => setIsEditingPassword(!isEditingPassword)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            isEditingPassword 
                              ? 'bg-[#F59E0B] text-black font-bold' 
                              : 'bg-[#111216] border border-[#27272A] text-zinc-400 hover:text-white'
                          }`}
                          title={isEditingPassword ? 'Collapse Settings' : 'Edit Security Settings'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* EXPANDED EDIT DETAILS FORM */}
                      {isEditingPassword && (
                        <div className="flex flex-col gap-3 pt-2.5 border-t border-[#27272A]">
                          {passwordChangeStatus && (
                            <span className={`text-[11px] font-medium ${passwordChangeStatus.includes('must be') ? 'text-[#FF3B30]' : 'text-[#10B981]'}`}>
                              {passwordChangeStatus}
                            </span>
                          )}

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold text-zinc-400">
                              Update Passcode:
                            </label>
                            <input
                              type="password"
                              placeholder="New passcode"
                              value={newPasswordInput}
                              onChange={(e) => setNewPasswordInput(e.target.value)}
                              className="bg-[#111216] border border-[#F59E0B] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-zinc-400">
                                Update Shape Combination Pattern:
                              </label>
                              {regShapeSequence.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setRegShapeSequence([])}
                                  className="text-[10px] text-[#F59E0B] hover:underline flex items-center gap-1 font-medium"
                                >
                                  <RotateCcw className="w-3 h-3" /> Clear
                                </button>
                              )}
                            </div>

                            <div className="bg-[#111216] border border-[#27272A] rounded-xl p-2 min-h-[40px] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                              {(regShapeSequence.length > 0 ? regShapeSequence : targetShapeSequence).map((shapeId, idx) => {
                                const shapeDef = AVAILABLE_SHAPES.find((s) => s.id === shapeId);
                                if (!shapeDef) return null;
                                return (
                                  <div
                                    key={idx}
                                    className="bg-[#08080A] border border-[#F59E0B]/50 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0"
                                  >
                                    <span className="text-[9px] font-bold text-[#F59E0B]">{idx + 1}.</span>
                                    <ShapeIcon shape={shapeDef.shape} color={shapeDef.color} className="w-3.5 h-3.5" />
                                    <span className="text-[10px] text-white">{shapeDef.label.split(' ')[0]}</span>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-4 gap-1.5 bg-[#111216] p-2 rounded-xl border border-[#27272A]">
                              {AVAILABLE_SHAPES.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setRegShapeSequence((prev) => [...prev, s.id])}
                                  className="flex flex-col items-center justify-center p-1.5 rounded-lg border border-[#27272A] hover:border-[#F59E0B] bg-[#08080A] active:scale-95 transition-all"
                                >
                                  <ShapeIcon shape={s.shape} color={s.color} className="w-5 h-5" />
                                  <span className="text-[8px] text-zinc-400 mt-0.5 truncate max-w-full">
                                    {s.label.split(' ')[0]}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={handleSaveSecuritySettings}
                            className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 mt-1 ${
                              isPasswordSavedFeedback
                                ? 'bg-[#10B981] text-white'
                                : 'bg-[#F59E0B] hover:bg-[#D97706] text-black active:scale-95'
                            }`}
                          >
                            {isPasswordSavedFeedback ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                Saved ✓
                              </>
                            ) : (
                              'Save Security Settings'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 2: CLOUD & SYNC */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B] mb-1.5 px-0.5">
                      Cloud & Integration
                    </h3>
                    <div className="bg-[#08080A] border border-[#27272A] rounded-xl p-3.5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Webhook className="w-4 h-4 text-[#F59E0B]" />
                          Google Drive Webhook Integration
                        </label>
                        <button
                          onClick={() => setIsEditingGDriveConfig(!isEditingGDriveConfig)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            isEditingGDriveConfig 
                              ? 'bg-[#F59E0B] text-black font-bold' 
                              : 'bg-[#111216] border border-[#27272A] text-zinc-400 hover:text-white'
                          }`}
                          title={isEditingGDriveConfig ? 'Collapse Settings' : 'Edit Integration Links'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isEditingGDriveConfig && (
                        <div className="flex flex-col gap-3 pt-2.5 border-t border-[#27272A]">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                              <Link className="w-3.5 h-3.5 text-[#F59E0B]" />
                              Google Drive Folder Link
                            </label>
                            <input
                              type="text"
                              placeholder="https://drive.google.com/drive/folders/..."
                              value={gdriveLinkInput}
                              onChange={(e) => setGdriveLinkInput(e.target.value)}
                              className="bg-[#111216] border border-[#F59E0B] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                              <Webhook className="w-3.5 h-3.5 text-[#F59E0B]" />
                              Apps Script Webhook URL
                            </label>
                            <input
                              type="text"
                              placeholder="https://script.google.com/macros/s/.../exec"
                              value={gdriveWebhookInput}
                              onChange={(e) => setGdriveWebhookInput(e.target.value)}
                              className="bg-[#111216] border border-[#F59E0B] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                            />
                          </div>

                          <button
                            onClick={handleSaveGDriveConfig}
                            className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${
                              isLinkSavedFeedback
                                ? 'bg-[#10B981] text-white'
                                : 'bg-[#F59E0B] hover:bg-[#D97706] text-black active:scale-95'
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
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSyncAllNotesToGDrive}
                      disabled={isSyncingGDrive}
                      className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-between shadow-md disabled:opacity-50 mt-2 transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2">
                        <FolderSync className={`w-4.5 h-4.5 text-black ${isSyncingGDrive ? 'animate-spin' : ''}`} />
                        <span>Sync ALL Notes to Google Drive</span>
                      </div>
                      <CloudUpload className="w-4 h-4 text-black" />
                    </button>
                  </div>

                  {/* SECTION 3: DATA & HISTORY */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B] mb-1.5 px-0.5">
                      Data & History
                    </h3>
                    <div className="bg-[#08080A] border border-[#27272A] rounded-xl overflow-hidden divide-y divide-[#27272A]">
                      <button
                        onClick={handleOpenHistoryWithAuth}
                        className="w-full p-3.5 text-white text-xs font-semibold flex items-center justify-between hover:bg-[#111216] transition-all active:bg-[#1A1B22]"
                      >
                        <div className="flex items-center gap-2.5">
                          <Archive className="w-4 h-4 text-[#F59E0B]" />
                          <span>Archive & Trash History</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <span className="text-[10px] font-normal">{archivedNotes.length + archivedTodos.length} items</span>
                          <Lock className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                      </button>

                      <button
                        onClick={handleExportBackup}
                        className="w-full p-3.5 text-white text-xs font-semibold flex items-center justify-between hover:bg-[#111216] transition-all active:bg-[#1A1B22]"
                      >
                        <div className="flex items-center gap-2.5">
                          <Download className="w-4 h-4 text-[#F59E0B]" />
                          <span>Export JSON Backup</span>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-zinc-400" />
                      </button>

                      <label className="w-full p-3.5 text-white text-xs font-semibold flex items-center justify-between hover:bg-[#111216] transition-all active:bg-[#1A1B22] cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Upload className="w-4 h-4 text-[#F59E0B]" />
                          <span>Import JSON Backup</span>
                        </div>
                        <input 
                          type="file" 
                          accept=".json" 
                          onChange={handleImportBackup} 
                          className="hidden" 
                        />
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-zinc-400" />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                    <span className="text-xs font-bold text-[#F59E0B]">Authenticated Archive History</span>
                    <button 
                      onClick={() => setShowHistoryView(false)}
                      className="text-zinc-400 text-xs hover:text-white"
                    >
                      Back to Settings
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Archived Notes ({archivedNotes.length})
                    </h4>
                    <div className="flex flex-col gap-2">
                      {archivedNotes.map((note) => (
                        <div key={note.id} className="bg-[#08080A] border border-[#27272A] rounded-xl p-3 flex items-center justify-between">
                          <span className="text-xs font-medium text-white truncate max-w-[150px]">{note.title}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleRestoreNote(note)}
                              className="text-[10px] text-[#10B981] bg-[#10B981]/15 px-2 py-1 rounded-md font-medium"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDeleteNote(note.id)}
                              className="text-zinc-500 hover:text-[#FF3B30] p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {archivedNotes.length === 0 && <p className="text-xs text-zinc-500">No archived notes.</p>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Finished Tasks ({archivedTodos.length})
                    </h4>
                    <div className="flex flex-col gap-2">
                      {archivedTodos.map((todo) => (
                        <div key={todo.id} className="bg-[#08080A] border border-[#27272A] rounded-xl p-3 flex items-center justify-between">
                          <span className="text-xs text-zinc-400 line-through truncate max-w-[150px]">{todo.title}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleRestoreTodo(todo)}
                              className="text-[10px] text-[#10B981] bg-[#10B981]/15 px-2 py-1 rounded-md font-medium"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDeleteTodo(todo.id)}
                              className="text-zinc-500 hover:text-[#FF3B30] p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {archivedTodos.length === 0 && <p className="text-xs text-zinc-500">No finished task history.</p>}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 mt-4 border-t border-[#27272A] flex justify-end">
                <button
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setShowHistoryView(false);
                    setBackupStatus('');
                  }}
                  className="py-2 px-4 rounded-pill border border-[#27272A] text-xs text-zinc-400 hover:text-white"
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
