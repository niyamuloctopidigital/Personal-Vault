import { useState, useRef } from 'react';
import { Plus, Eye, EyeOff, Copy, Edit, Trash2, LogOut, Activity, HardDrive, Search, Lock, Folder, FolderPlus, ChevronRight, Key, Shield, Home, ArrowLeft, CreditCard } from 'lucide-react';
import { PasswordEntry, CardEntry, Folder as FolderType } from '../types/vault';
import { generateSecurePassword } from '../utils/crypto';
import { ToastContainer, Toast } from './Toast';
import { RecoveryCodes } from './RecoveryCodes';
import { regenerateRecoveryCodes, getUnusedCodeCount } from '../utils/recoveryCodes';

interface PasswordManagerProps {
  passwords: PasswordEntry[];
  cards: CardEntry[];
  folders: FolderType[];
  userId: string;
  onAddPassword: (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'>) => void;
  onUpdatePassword: (id: string, entry: Partial<PasswordEntry>) => void;
  onDeletePassword: (id: string) => void;
  onViewPassword: (id: string) => void;
  onAddCard: (entry: Omit<CardEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateCard: (id: string, entry: Partial<CardEntry>) => void;
  onDeleteCard: (id: string) => void;
  onAddFolder: (folder: Omit<FolderType, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateFolder: (id: string, folder: Partial<FolderType>) => void;
  onDeleteFolder: (id: string) => void;
  onLogout: () => void;
  onShowLogs: () => void;
  onShowDevices: () => void;
}

const FOLDER_COLORS = [
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Green', value: 'bg-green-500' },
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Yellow', value: 'bg-yellow-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Indigo', value: 'bg-indigo-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Teal', value: 'bg-teal-500' },
  { name: 'Cyan', value: 'bg-cyan-500' },
];

export function PasswordManager({
  passwords,
  cards,
  folders,
  userId,
  onAddPassword,
  onUpdatePassword,
  onDeletePassword,
  onViewPassword,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
  onLogout,
  onShowLogs,
  onShowDevices,
}: PasswordManagerProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'passwords' | 'cards'>('passwords');
  const [showAddPasswordForm, setShowAddPasswordForm] = useState(false);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [showAddFolderForm, setShowAddFolderForm] = useState(false);
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const clickTimerRef = useRef<number | null>(null);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const [passwordFormData, setPasswordFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    folderId: null as string | null,
  });

  const [cardFormData, setCardFormData] = useState({
    cardName: '',
    cardHolder: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardType: 'credit' as 'credit' | 'debit' | 'prepaid',
    company: '',
    billingAddress: '',
    notes: '',
    folderId: null as string | null,
  });

  const [folderFormData, setFolderFormData] = useState({
    name: '',
    description: '',
    color: 'bg-blue-500',
    parentId: null as string | null,
  });

  const resetPasswordForm = () => {
    const defaultFolderId = currentFolderId || (selectedFolderId === 'unfiled' ? null : selectedFolderId);
    setPasswordFormData({ title: '', username: '', password: '', url: '', notes: '', folderId: defaultFolderId });
    setShowAddPasswordForm(false);
    setEditingPasswordId(null);
  };

  const resetCardForm = () => {
    const defaultFolderId = currentFolderId || (selectedFolderId === 'unfiled' ? null : selectedFolderId);
    setCardFormData({ cardName: '', cardHolder: '', cardNumber: '', expiryMonth: '', expiryYear: '', cvv: '', cardType: 'credit', company: '', billingAddress: '', notes: '', folderId: defaultFolderId });
    setShowAddCardForm(false);
    setEditingCardId(null);
  };

  const resetFolderForm = () => {
    setFolderFormData({ name: '', description: '', color: 'bg-blue-500', parentId: currentFolderId });
    setShowAddFolderForm(false);
    setEditingFolderId(null);
  };

  const getFolderPath = (folderId: string | null): FolderType[] => {
    if (!folderId) return [];
    const path: FolderType[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (!folder) break;
      path.unshift(folder);
      currentId = folder.parentId ?? null;
    }

    return path;
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedFolderId(null);
    setFolderSearchQuery('');
  };

  const handleFolderClick = (folderId: string) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    clickTimerRef.current = window.setTimeout(() => {
      setSelectedFolderId(folderId);
      clickTimerRef.current = null;
    }, 200);
  };

  const handleFolderDoubleClick = (folderId: string) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    navigateToFolder(folderId);
  };

  const handleRegenerateCodesClick = () => {
    setShowRegenerateConfirm(true);
  };

  const handleGenerateRecoveryCodes = async () => {
    setShowRegenerateConfirm(false);
    setGeneratingCodes(true);
    try {
      const codes = await regenerateRecoveryCodes(userId);
      if (codes) {
        setRecoveryCodes(codes);
        showToast('Recovery codes generated successfully', 'success');
      } else {
        showToast('Failed to generate recovery codes', 'error');
      }
    } catch (error) {
      showToast('Failed to generate recovery codes', 'error');
    } finally {
      setGeneratingCodes(false);
    }
  };

  const handleRecoveryCodesComplete = () => {
    setRecoveryCodes([]);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordFormData.title || !passwordFormData.password) {
      showToast('Title and password are required', 'error');
      return;
    }

    if (editingPasswordId) {
      onUpdatePassword(editingPasswordId, passwordFormData);
      showToast('Password updated successfully', 'success');
    } else {
      onAddPassword(passwordFormData);
      showToast('Password added successfully', 'success');
    }

    resetPasswordForm();
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardFormData.cardName || !cardFormData.cardNumber || !cardFormData.cvv) {
      showToast('Card name, number, and CVV are required', 'error');
      return;
    }

    if (!cardFormData.expiryMonth || !cardFormData.expiryYear) {
      showToast('Expiry date is required', 'error');
      return;
    }

    if (editingCardId) {
      onUpdateCard(editingCardId, cardFormData);
      showToast('Card updated successfully', 'success');
    } else {
      onAddCard(cardFormData);
      showToast('Card added successfully', 'success');
    }

    resetCardForm();
  };

  const handleEditCard = (card: CardEntry) => {
    setCardFormData({
      cardName: card.cardName,
      cardHolder: card.cardHolder,
      cardNumber: card.cardNumber,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cvv: card.cvv,
      cardType: card.cardType,
      company: card.company,
      billingAddress: card.billingAddress || '',
      notes: card.notes || '',
      folderId: card.folderId,
    });
    setEditingCardId(card.id);
    setShowAddCardForm(true);
  };

  const handleDeleteCardClick = (id: string) => {
    if (confirm('Are you sure you want to delete this card?')) {
      onDeleteCard(id);
      showToast('Card deleted successfully', 'success');
    }
  };

  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!folderFormData.name) {
      showToast('Folder name is required', 'error');
      return;
    }

    if (editingFolderId) {
      onUpdateFolder(editingFolderId, folderFormData);
      showToast('Folder updated successfully', 'success');
    } else {
      onAddFolder(folderFormData);
      showToast('Folder created successfully', 'success');
    }

    resetFolderForm();
  };

  const handleEditPassword = (entry: PasswordEntry) => {
    setPasswordFormData({
      title: entry.title,
      username: entry.username,
      password: entry.password,
      url: entry.url || '',
      notes: entry.notes || '',
      folderId: entry.folderId,
    });
    setEditingPasswordId(entry.id);
    setShowAddPasswordForm(true);
  };

  const handleEditFolder = (folder: FolderType) => {
    setFolderFormData({
      name: folder.name,
      description: folder.description || '',
      color: folder.color,
      parentId: folder.parentId,
    });
    setEditingFolderId(folder.id);
    setShowAddFolderForm(true);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        onViewPassword(id);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied`, 'success');
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const generatePassword = () => {
    const newPassword = generateSecurePassword(24);
    setPasswordFormData(prev => ({ ...prev, password: newPassword }));
  };

  const filteredPasswords = passwords.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.url?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFolder = true;

    if (selectedFolderId === null && currentFolderId !== null) {
      matchesFolder = p.folderId === currentFolderId;
    } else if (selectedFolderId === null) {
      matchesFolder = true;
    } else if (selectedFolderId === 'unfiled') {
      matchesFolder = p.folderId === null;
    } else {
      matchesFolder = p.folderId === selectedFolderId;
    }

    return matchesSearch && matchesFolder;
  });

  const filteredCards = cards.filter(c => {
    const matchesSearch = c.cardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cardHolder.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFolder = true;

    if (selectedFolderId === null && currentFolderId !== null) {
      matchesFolder = c.folderId === currentFolderId;
    } else if (selectedFolderId === null) {
      matchesFolder = true;
    } else if (selectedFolderId === 'unfiled') {
      matchesFolder = c.folderId === null;
    } else {
      matchesFolder = c.folderId === selectedFolderId;
    }

    return matchesSearch && matchesFolder;
  });

  const unfiledPasswords = passwords.filter(p => p.folderId === null);
  const unfiledCards = cards.filter(c => c.folderId === null);
  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const currentFolder = folders.find(f => f.id === currentFolderId);
  const folderPath = getFolderPath(currentFolderId);

  const filteredFolders = folders.filter(f => {
    const matchesParent = (f.parentId ?? null) === currentFolderId;
    const matchesSearch = f.name.toLowerCase().includes(folderSearchQuery.toLowerCase()) ||
      f.description?.toLowerCase().includes(folderSearchQuery.toLowerCase());
    return matchesParent && matchesSearch;
  });

  if (recoveryCodes.length > 0) {
    return <RecoveryCodes codes={recoveryCodes} onComplete={handleRecoveryCodesComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <div className="w-64 border-r border-gray-200 fixed left-0 top-0 h-screen bg-white shadow-sm p-6 overflow-y-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Vault</h1>
            </div>

            <div className="space-y-1">
              <button
                onClick={onShowLogs}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Activity className="w-5 h-5" />
                <span className="text-sm font-medium">Activity Logs</span>
              </button>
              <button
                onClick={onShowDevices}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <HardDrive className="w-5 h-5" />
                <span className="text-sm font-medium">Devices</span>
              </button>
              <button
                onClick={handleRegenerateCodesClick}
                disabled={generatingCodes}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Key className="w-5 h-5" />
                <span className="text-sm font-medium">{generatingCodes ? 'Generating...' : 'Recovery Codes'}</span>
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Lock Vault</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 ml-64 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {currentFolder ? currentFolder.name : selectedFolder ? selectedFolder.name : selectedFolderId === 'unfiled' ? 'Unfiled Items' : 'All Items'}
                  </h1>
                  {(currentFolder?.description || selectedFolder?.description) && (
                    <p className="text-gray-600 mt-1 text-sm">{currentFolder?.description || selectedFolder?.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('passwords')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      viewMode === 'passwords' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Key className="w-4 h-4" />
                    <span className="font-medium">Passwords</span>
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="font-medium">Cards</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  const defaultFolderId = currentFolderId || (selectedFolderId === 'unfiled' ? null : selectedFolderId);
                  if (viewMode === 'passwords') {
                    setPasswordFormData(prev => ({ ...prev, folderId: defaultFolderId }));
                    setShowAddPasswordForm(true);
                  } else {
                    setCardFormData(prev => ({ ...prev, folderId: defaultFolderId }));
                    setShowAddCardForm(true);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
              >
                <Plus className="w-5 h-5" />
                {viewMode === 'passwords' ? 'Add Password' : 'Add Card'}
              </button>
            </div>

            <div className="mb-6 flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search passwords..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-gray-900">Folders</h2>
                  {currentFolderId && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <button
                        onClick={() => navigateToFolder(null)}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        <Home className="w-4 h-4" />
                      </button>
                      {folderPath.map((folder, index) => (
                        <div key={folder.id} className="flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <button
                            onClick={() => navigateToFolder(folder.id)}
                            className="hover:text-blue-600 transition-colors font-medium"
                          >
                            {folder.name}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {currentFolderId && (
                    <button
                      onClick={() => navigateToFolder(currentFolder?.parentId ?? null)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setFolderFormData(prev => ({ ...prev, parentId: currentFolderId }));
                      setShowAddFolderForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                  >
                    <FolderPlus className="w-5 h-5" />
                    New Folder
                  </button>
                </div>
              </div>

              <div className="mb-5 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={folderSearchQuery}
                  onChange={(e) => setFolderSearchQuery(e.target.value)}
                  placeholder="Search folders..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {!currentFolderId && (
                  <>
                    <button
                      onClick={() => setSelectedFolderId(null)}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                        selectedFolderId === null
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <Lock className={`w-8 h-8 mb-2 ${selectedFolderId === null ? 'text-blue-600' : 'text-gray-600'}`} />
                      <span className={`text-sm font-medium ${selectedFolderId === null ? 'text-blue-600' : 'text-gray-900'}`}>All</span>
                      <span className={`text-xs mt-1 ${selectedFolderId === null ? 'text-blue-600' : 'text-gray-500'}`}>{passwords.length} items</span>
                    </button>
                    <button
                      onClick={() => setSelectedFolderId('unfiled')}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                        selectedFolderId === 'unfiled'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <Folder className={`w-8 h-8 mb-2 ${selectedFolderId === 'unfiled' ? 'text-blue-600' : 'text-gray-600'}`} />
                      <span className={`text-sm font-medium ${selectedFolderId === 'unfiled' ? 'text-blue-600' : 'text-gray-900'}`}>Unfiled</span>
                      <span className={`text-xs mt-1 ${selectedFolderId === 'unfiled' ? 'text-blue-600' : 'text-gray-500'}`}>{unfiledPasswords.length} items</span>
                    </button>
                  </>
                )}
                {filteredFolders.map(folder => {
                  const folderPasswords = passwords.filter(p => p.folderId === folder.id);
                  const folderCards = cards.filter(c => c.folderId === folder.id);
                  const totalItems = folderPasswords.length + folderCards.length;
                  const subfolderCount = folders.filter(f => (f.parentId ?? null) === folder.id).length;
                  return (
                    <div
                      key={folder.id}
                      className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all group ${
                        selectedFolderId === folder.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <button
                        onClick={() => handleFolderClick(folder.id)}
                        onDoubleClick={() => handleFolderDoubleClick(folder.id)}
                        className="flex flex-col items-center w-full"
                      >
                        <div className={`w-8 h-8 rounded-full ${folder.color} mb-2 flex items-center justify-center`}>
                          <Folder className={`w-5 h-5 ${selectedFolderId === folder.id ? 'text-white' : 'text-white/80'}`} />
                        </div>
                        <span className={`text-sm font-medium text-center ${selectedFolderId === folder.id ? 'text-blue-600' : 'text-gray-900'}`}>{folder.name}</span>
                        <span className={`text-xs mt-1 ${selectedFolderId === folder.id ? 'text-blue-600' : 'text-gray-500'}`}>
                          {totalItems} items{subfolderCount > 0 && ` • ${subfolderCount} folders`}
                        </span>
                      </button>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigateToFolder(folder.id)}
                          className="p-1 rounded bg-white shadow-sm hover:bg-blue-50"
                          title="Open folder"
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleEditFolder(folder)}
                          className="p-1 rounded bg-white shadow-sm hover:bg-gray-100"
                          title="Edit folder"
                        >
                          <Edit className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {viewMode === 'passwords' ? (
                filteredPasswords.length === 0 ? (
                  <div className="col-span-full bg-white rounded-lg p-12 text-center border border-gray-200 shadow-sm">
                    <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">
                      {searchQuery ? 'No passwords found' : 'No passwords in this folder yet'}
                    </p>
                  </div>
                ) : (
                  filteredPasswords.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-md group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-base font-semibold text-gray-900 truncate flex-1">{entry.title}</h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditPassword(entry)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this password?')) {
                              onDeletePassword(entry.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs w-16 flex-shrink-0">Username</span>
                        <span className="text-gray-900 truncate flex-1">{entry.username}</span>
                        <button
                          onClick={() => copyToClipboard(entry.username, 'Username')}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs w-16 flex-shrink-0">Password</span>
                        <span className="text-gray-900 font-mono text-xs flex-1">
                          {visiblePasswords.has(entry.id) ? entry.password : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(entry.id)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          {visiblePasswords.has(entry.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(entry.password, 'Password')}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {entry.url && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs w-16 flex-shrink-0">URL</span>
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 truncate flex-1 text-xs"
                          >
                            {entry.url}
                          </a>
                        </div>
                      )}

                      {entry.notes && (
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-gray-600 text-xs line-clamp-2">{entry.notes}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 text-xs text-gray-400">
                        <span>Viewed {entry.viewCount}x</span>
                        <span>•</span>
                        <span>{new Date(entry.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  ))
                )
              ) : (
                filteredCards.length === 0 ? (
                  <div className="col-span-full bg-white rounded-lg p-12 text-center border border-gray-200 shadow-sm">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">
                      {searchQuery ? 'No cards found' : 'No cards in this folder yet'}
                    </p>
                  </div>
                ) : (
                  filteredCards.map((card) => (
                    <div
                      key={card.id}
                      className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-md group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-base font-semibold text-gray-900 truncate flex-1">{card.cardName}</h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditCard(card)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCardClick(card.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs w-20 flex-shrink-0">Card Holder</span>
                          <span className="text-gray-900 truncate flex-1">{card.cardHolder}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs w-20 flex-shrink-0">Card Number</span>
                          <span className="text-gray-900 font-mono text-xs flex-1">
                            {visibleCards.has(card.id) ? card.cardNumber : '•••• •••• •••• ' + card.cardNumber.slice(-4)}
                          </span>
                          <button
                            onClick={() => {
                              setVisibleCards(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(card.id)) {
                                  newSet.delete(card.id);
                                } else {
                                  newSet.add(card.id);
                                }
                                return newSet;
                              });
                            }}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            {visibleCards.has(card.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(card.cardNumber, 'Card number')}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs w-20 flex-shrink-0">Expiry</span>
                          <span className="text-gray-900 text-xs">{card.expiryMonth}/{card.expiryYear}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs w-20 flex-shrink-0">CVV</span>
                          <span className="text-gray-900 font-mono text-xs flex-1">
                            {visibleCards.has(card.id) ? card.cvv : '•••'}
                          </span>
                          <button
                            onClick={() => copyToClipboard(card.cvv, 'CVV')}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs w-20 flex-shrink-0">Type</span>
                          <span className="text-gray-900 text-xs capitalize">{card.cardType}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-900 text-xs">{card.company}</span>
                        </div>

                        {card.billingAddress && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs w-20 flex-shrink-0">Address</span>
                            <span className="text-gray-900 text-xs truncate flex-1">{card.billingAddress}</span>
                          </div>
                        )}

                        {card.notes && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-gray-600 text-xs line-clamp-2">{card.notes}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 text-xs text-gray-400">
                          <span>{new Date(card.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddPasswordForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              {editingPasswordId ? 'Edit Password' : 'Add New Password'}
            </h2>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Folder</label>
                <select
                  value={passwordFormData.folderId || ''}
                  onChange={(e) => setPasswordFormData(prev => ({ ...prev, folderId: e.target.value || null }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Unfiled</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                  type="text"
                  value={passwordFormData.title}
                  onChange={(e) => setPasswordFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Gmail Account"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username / Email</label>
                <input
                  type="text"
                  value={passwordFormData.username}
                  onChange={(e) => setPasswordFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="username@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={passwordFormData.password}
                    onChange={(e) => setPasswordFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Website URL</label>
                <input
                  type="text"
                  value={passwordFormData.url}
                  onChange={(e) => setPasswordFormData(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={passwordFormData.notes}
                  onChange={(e) => setPasswordFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  {editingPasswordId ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={resetPasswordForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCardForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              {editingCardId ? 'Edit Card' : 'Add New Card'}
            </h2>

            <form onSubmit={handleCardSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Folder</label>
                <select
                  value={cardFormData.folderId || ''}
                  onChange={(e) => setCardFormData(prev => ({ ...prev, folderId: e.target.value || null }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Unfiled</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Name</label>
                <input
                  type="text"
                  value={cardFormData.cardName}
                  onChange={(e) => setCardFormData(prev => ({ ...prev, cardName: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Personal Visa"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Holder Name</label>
                <input
                  type="text"
                  value={cardFormData.cardHolder}
                  onChange={(e) => setCardFormData(prev => ({ ...prev, cardHolder: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Number</label>
                <input
                  type="text"
                  value={cardFormData.cardNumber}
                  onChange={(e) => setCardFormData(prev => ({ ...prev, cardNumber: e.target.value.replace(/\s/g, '') }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Month</label>
                  <input
                    type="text"
                    value={cardFormData.expiryMonth}
                    onChange={(e) => setCardFormData(prev => ({ ...prev, expiryMonth: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="MM"
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Year</label>
                  <input
                    type="text"
                    value={cardFormData.expiryYear}
                    onChange={(e) => setCardFormData(prev => ({ ...prev, expiryYear: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="YYYY"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">CVV</label>
                <input
                  type="text"
                  value={cardFormData.cvv}
                  onChange={(e) => setCardFormData(prev => ({ ...prev, cvv: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="123"
                  maxLength={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Type</label>
                <select
                  value={cardFormData.cardType}
                  onChange={(e) => setCardFormData(prev => ({ ...prev, cardType: e.target.value as 'credit' | 'debit' | 'prepaid' }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="credit">Credit Card</option>
                  <option value="debit">Debit Card</option>
                  <option value="prepaid">Prepaid Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Company</label>
                <input
                  type="text"
                  value={cardFormData.company}
                  onChange={(e) => setCardFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Visa, Mastercard, Amex"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Billing Address (Optional)</label>
                <textarea
                  value={cardFormData.billingAddress}
                  onChange={(e) => setCardFormData(prev => ({ ...prev, billingAddress: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Street, City, State, ZIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
                <textarea
                  value={cardFormData.notes}
                  onChange={(e) => setCardFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  {editingCardId ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={resetCardForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddFolderForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              {editingFolderId ? 'Edit Folder' : 'Create New Folder'}
            </h2>

            <form onSubmit={handleFolderSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Folder Name</label>
                <input
                  type="text"
                  value={folderFormData.name}
                  onChange={(e) => setFolderFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Client ABC, Personal, Work"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (Optional)</label>
                <input
                  type="text"
                  value={folderFormData.description}
                  onChange={(e) => setFolderFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {FOLDER_COLORS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFolderFormData(prev => ({ ...prev, color: color.value }))}
                      className={`w-full aspect-square rounded-lg ${color.value} ${
                        folderFormData.color === color.value
                          ? 'ring-2 ring-blue-600 ring-offset-2'
                          : 'opacity-70 hover:opacity-100'
                      } transition-all`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  {editingFolderId ? 'Update' : 'Create'}
                </button>
                {editingFolderId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this folder? Passwords will be moved to Unfiled.')) {
                        onDeleteFolder(editingFolderId);
                        resetFolderForm();
                      }
                    }}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetFolderForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRegenerateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mx-auto mb-4">
              <Key className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
              Regenerate Recovery Codes?
            </h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-900 text-sm mb-2">
                <strong>Warning:</strong> This will generate a new set of recovery codes.
              </p>
              <ul className="text-amber-800 text-sm space-y-1 ml-4">
                <li>• All previous unused recovery codes will be invalidated</li>
                <li>• You will need to save the new codes securely</li>
                <li>• This action cannot be undone</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateRecoveryCodes}
                disabled={generatingCodes}
                className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
              >
                {generatingCodes ? 'Generating...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
