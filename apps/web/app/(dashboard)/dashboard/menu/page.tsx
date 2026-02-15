'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, GripVertical, UtensilsCrossed, Loader2, X, Link2, Image, FileText, Check, AlertCircle } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useRestaurant } from '@/contexts/RestaurantContext';
import TierGate from '@/components/TierGate';

// Types for URL import
interface ParsedMenuItem {
  name: string;
  description?: string;
  price?: number | null;
  price_description?: string;
  dietary_flags?: string[];
}

interface ParsedSection {
  name: string;
  description?: string;
  items: ParsedMenuItem[];
}

interface ParsedMenuData {
  sections: ParsedSection[];
  source_url?: string;
  source_type?: string;
  stats: {
    sections_count: number;
    items_count: number;
  };
}

interface MenuItem {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  price: number | null;
  price_description: string | null;
  is_available: boolean;
  is_featured: boolean;
  dietary_flags: string[];
  display_order: number;
}

interface MenuSection {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  display_order: number;
  menu_items: MenuItem[];
}

interface Menu {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  menu_sections: MenuSection[];
}

const DIETARY_FLAGS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten-Free' },
  { value: 'dairy-free', label: 'Dairy-Free' },
  { value: 'nut-free', label: 'Nut-Free' },
  { value: 'spicy', label: 'Spicy' },
];

export default function MenuPage() {
  const { restaurant, buildApiUrl } = useRestaurant();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Tab state - tracks active section per menu
  const [activeTabByMenu, setActiveTabByMenu] = useState<Record<string, string>>({});

  // Get active section ID for a menu, defaulting to first section
  const getActiveSection = (menuId: string, sections: MenuSection[]) => {
    const sorted = [...sections].sort((a, b) => a.display_order - b.display_order);
    if (activeTabByMenu[menuId] && sorted.some(s => s.id === activeTabByMenu[menuId])) {
      return activeTabByMenu[menuId];
    }
    return sorted[0]?.id || '';
  };

  // Set active tab for a menu
  const setActiveTab = (menuId: string, sectionId: string) => {
    setActiveTabByMenu(prev => ({ ...prev, [menuId]: sectionId }));
  };

  // Modal states
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddSection, setShowAddSection] = useState<string | null>(null); // menu ID
  const [showAddItem, setShowAddItem] = useState<string | null>(null); // section ID
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [editingSection, setEditingSection] = useState<MenuSection | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form states
  const [newMenu, setNewMenu] = useState({ name: '', description: '' });
  const [newSection, setNewSection] = useState({ name: '', description: '' });
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    price_description: '',
    dietary_flags: [] as string[],
    is_featured: false,
  });

  // URL Import states
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [parsedMenu, setParsedMenu] = useState<ParsedMenuData | null>(null);
  const [importMenuName, setImportMenuName] = useState('Imported Menu');

  // Image Import states
  const [showImageImport, setShowImageImport] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // PDF Import states
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Fetch menus on mount
  useEffect(() => {
    if (restaurant?.id) {
      fetchMenus();
    }
  }, [restaurant?.id]);

  const fetchMenus = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/dashboard/menus'));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch menus');
      }

      setMenus(data.menus || []);
    } catch (err) {
      console.error('Error fetching menus:', err);
      setError(err instanceof Error ? err.message : 'Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  // Menu CRUD
  const handleCreateMenu = async () => {
    if (!newMenu.name.trim()) return;
    setSaving(true);

    try {
      const response = await fetch(buildApiUrl('/api/dashboard/menus'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMenu.name,
          description: newMenu.description || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create menu');
      }

      await fetchMenus();
      setShowAddMenu(false);
      setNewMenu({ name: '', description: '' });
    } catch (err) {
      console.error('Error creating menu:', err);
      setError(err instanceof Error ? err.message : 'Failed to create menu');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMenu = async () => {
    if (!editingMenu) return;
    setSaving(true);

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/menus/${editingMenu.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingMenu.name,
          description: editingMenu.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update menu');
      }

      await fetchMenus();
      setEditingMenu(null);
    } catch (err) {
      console.error('Error updating menu:', err);
      setError(err instanceof Error ? err.message : 'Failed to update menu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (!confirm('Are you sure you want to delete this menu? All sections and items will be deleted.')) return;

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/menus/${menuId}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete menu');
      }

      setMenus((prev) => prev.filter((m) => m.id !== menuId));
    } catch (err) {
      console.error('Error deleting menu:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete menu');
    }
  };

  // Section CRUD
  const handleCreateSection = async (menuId: string) => {
    if (!newSection.name.trim()) return;
    setSaving(true);

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/menus/${menuId}/sections`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSection.name,
          description: newSection.description || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create section');
      }

      await fetchMenus();
      // Auto-switch to the newly created section
      if (data.section?.id) {
        setActiveTab(menuId, data.section.id);
      }
      setShowAddSection(null);
      setNewSection({ name: '', description: '' });
    } catch (err) {
      console.error('Error creating section:', err);
      setError(err instanceof Error ? err.message : 'Failed to create section');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSection = async () => {
    if (!editingSection) return;
    setSaving(true);

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/menus/sections/${editingSection.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingSection.name,
          description: editingSection.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update section');
      }

      await fetchMenus();
      setEditingSection(null);
    } catch (err) {
      console.error('Error updating section:', err);
      setError(err instanceof Error ? err.message : 'Failed to update section');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId: string, menuId: string) => {
    if (!confirm('Are you sure you want to delete this section? All items will be deleted.')) return;

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/menus/sections/${sectionId}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete section');
      }

      // Clear active tab if the deleted section was active (will auto-fallback to first section)
      if (activeTabByMenu[menuId] === sectionId) {
        setActiveTabByMenu(prev => {
          const newState = { ...prev };
          delete newState[menuId];
          return newState;
        });
      }

      await fetchMenus();
    } catch (err) {
      console.error('Error deleting section:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete section');
    }
  };

  // Item CRUD
  const handleCreateItem = async (sectionId: string) => {
    if (!newItem.name.trim()) return;
    setSaving(true);

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/menus/sections/${sectionId}/items`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem.name,
          description: newItem.description || null,
          price: newItem.price ? parseFloat(newItem.price) : null,
          price_description: newItem.price_description || null,
          is_featured: newItem.is_featured,
          dietary_flags: newItem.dietary_flags,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create item');
      }

      await fetchMenus();
      setShowAddItem(null);
      setNewItem({ name: '', description: '', price: '', price_description: '', dietary_flags: [], is_featured: false });
    } catch (err) {
      console.error('Error creating item:', err);
      setError(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    setSaving(true);

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/menus/items/${editingItem.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingItem.name,
          description: editingItem.description,
          price: editingItem.price,
          price_description: editingItem.price_description,
          is_featured: editingItem.is_featured,
          dietary_flags: editingItem.dietary_flags,
          is_available: editingItem.is_available,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update item');
      }

      await fetchMenus();
      setEditingItem(null);
    } catch (err) {
      console.error('Error updating item:', err);
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(buildApiUrl(`/api/dashboard/menus/items/${itemId}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete item');
      }

      await fetchMenus();
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  // URL Import handlers
  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/dashboard/menus/import/url'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          response.status === 504
            ? 'The request timed out. This URL may take too long to process. Try using image or PDF import instead.'
            : `Server error (${response.status}). Try using image or PDF import instead.`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import menu');
      }

      setParsedMenu(data);
    } catch (err) {
      console.error('Error importing menu:', err);
      setError(err instanceof Error ? err.message : 'Failed to import menu');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveImportedMenu = async () => {
    if (!parsedMenu) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/dashboard/menus'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: importMenuName,
          description: `Imported from ${parsedMenu.source_url}`,
          sections: parsedMenu.sections.map((section) => ({
            name: section.name,
            description: section.description,
            items: section.items.map((item) => ({
              name: item.name,
              description: item.description,
              price: item.price,
              price_description: item.price_description,
              dietary_flags: item.dietary_flags || [],
            })),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save menu');
      }

      await fetchMenus();
      // Reset import state
      setShowUrlImport(false);
      setImportUrl('');
      setParsedMenu(null);
      setImportMenuName('Imported Menu');
    } catch (err) {
      console.error('Error saving imported menu:', err);
      setError(err instanceof Error ? err.message : 'Failed to save menu');
    } finally {
      setSaving(false);
    }
  };

  const cancelUrlImport = () => {
    setShowUrlImport(false);
    setImportUrl('');
    setParsedMenu(null);
    setImportMenuName('Imported Menu');
  };

  // Image Import handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Maximum size is 10MB.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageImport = async () => {
    if (!imageFile) return;
    setImporting(true);
    setError(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const response = await fetch(buildApiUrl('/api/dashboard/menus/import/image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mimeType: imageFile.type
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import menu from image');
      }

      setParsedMenu(data);
    } catch (err) {
      console.error('Error importing menu from image:', err);
      setError(err instanceof Error ? err.message : 'Failed to import menu from image');
    } finally {
      setImporting(false);
    }
  };

  const cancelImageImport = () => {
    setShowImageImport(false);
    setImageFile(null);
    setImagePreview(null);
    setParsedMenu(null);
    setImportMenuName('Imported Menu');
  };

  // PDF Import handlers
  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError('PDF too large. Maximum size is 20MB.');
      return;
    }

    setPdfFile(file);
  };

  const handlePdfImport = async () => {
    if (!pdfFile) return;
    setImporting(true);
    setError(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfFile);
      });

      const response = await fetch(buildApiUrl('/api/dashboard/menus/import/pdf'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import menu from PDF');
      }

      setParsedMenu(data);
    } catch (err) {
      console.error('Error importing menu from PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to import menu from PDF');
    } finally {
      setImporting(false);
    }
  };

  const cancelPdfImport = () => {
    setShowPdfImport(false);
    setPdfFile(null);
    setParsedMenu(null);
    setImportMenuName('Imported Menu');
  };

  // Generic save for any import method
  const handleSaveImportedMenuGeneric = async () => {
    if (!parsedMenu) return;
    setSaving(true);
    setError(null);

    try {
      const description = parsedMenu.source_url
        ? `Imported from ${parsedMenu.source_url}`
        : parsedMenu.source_type
          ? `Imported from ${parsedMenu.source_type}`
          : 'Imported menu';

      const response = await fetch(buildApiUrl('/api/dashboard/menus'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: importMenuName,
          description,
          sections: parsedMenu.sections.map((section) => ({
            name: section.name,
            description: section.description,
            items: section.items.map((item) => ({
              name: item.name,
              description: item.description,
              price: item.price,
              price_description: item.price_description,
              dietary_flags: item.dietary_flags || [],
            })),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save menu');
      }

      await fetchMenus();
      // Reset all import states
      setShowUrlImport(false);
      setShowImageImport(false);
      setShowPdfImport(false);
      setImportUrl('');
      setImageFile(null);
      setImagePreview(null);
      setPdfFile(null);
      setParsedMenu(null);
      setImportMenuName('Imported Menu');
    } catch (err) {
      console.error('Error saving imported menu:', err);
      setError(err instanceof Error ? err.message : 'Failed to save menu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-tastelanc-accent animate-spin" />
      </div>
    );
  }

  return (
    <TierGate
      requiredTier="premium"
      feature="Menu Management"
      description="Upgrade to Premium to add and manage your restaurant's full menu, making it easy for customers to see what you offer."
    >
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <UtensilsCrossed className="w-6 h-6" />
              Menu Management
            </h2>
            <p className="text-gray-400 mt-1">Manage your restaurant&apos;s menus and items</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddMenu(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Menu
            </Button>
            <Button variant="secondary" onClick={() => setShowUrlImport(true)}>
              <Link2 className="w-4 h-4 mr-2" />
              URL
            </Button>
            <Button variant="secondary" onClick={() => setShowImageImport(true)}>
              <Image className="w-4 h-4 mr-2" />
              Image
            </Button>
            <Button variant="secondary" onClick={() => setShowPdfImport(true)}>
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Add Menu Modal */}
        {showAddMenu && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Create New Menu</h3>
              <button onClick={() => setShowAddMenu(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Menu Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Main Menu, Lunch Menu, Drinks"
                  value={newMenu.name}
                  onChange={(e) => setNewMenu({ ...newMenu, name: e.target.value })}
                  className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description (optional)</label>
                <input
                  type="text"
                  placeholder="Brief description of this menu"
                  value={newMenu.description}
                  onChange={(e) => setNewMenu({ ...newMenu, description: e.target.value })}
                  className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateMenu} disabled={saving || !newMenu.name.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Menu
                </Button>
                <Button variant="secondary" onClick={() => setShowAddMenu(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Edit Menu Modal */}
        {editingMenu && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Edit Menu</h3>
              <button onClick={() => setEditingMenu(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Menu Name *</label>
                <input
                  type="text"
                  value={editingMenu.name}
                  onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })}
                  className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={editingMenu.description || ''}
                  onChange={(e) => setEditingMenu({ ...editingMenu, description: e.target.value })}
                  className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateMenu} disabled={saving || !editingMenu.name.trim()}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
                <Button variant="secondary" onClick={() => setEditingMenu(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Edit Section Modal */}
        {editingSection && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Edit Section</h3>
              <button onClick={() => setEditingSection(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Section Name *</label>
                <input
                  type="text"
                  value={editingSection.name}
                  onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                  className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={editingSection.description || ''}
                  onChange={(e) => setEditingSection({ ...editingSection, description: e.target.value })}
                  className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateSection} disabled={saving || !editingSection.name.trim()}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
                <Button variant="secondary" onClick={() => setEditingSection(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Edit Item Modal */}
        {editingItem && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Edit Menu Item</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Item Name *</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingItem.price ?? ''}
                    onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Price Description (e.g., &quot;Market Price&quot;)</label>
                <input
                  type="text"
                  value={editingItem.price_description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, price_description: e.target.value })}
                  className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Dietary Information</label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_FLAGS.map((flag) => (
                    <label key={flag.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingItem.dietary_flags.includes(flag.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingItem({ ...editingItem, dietary_flags: [...editingItem.dietary_flags, flag.value] });
                          } else {
                            setEditingItem({ ...editingItem, dietary_flags: editingItem.dietary_flags.filter((f) => f !== flag.value) });
                          }
                        }}
                        className="rounded border-gray-600 bg-tastelanc-surface text-tastelanc-accent focus:ring-tastelanc-accent"
                      />
                      <span className="text-sm text-gray-300">{flag.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.is_featured}
                    onChange={(e) => setEditingItem({ ...editingItem, is_featured: e.target.checked })}
                    className="rounded border-gray-600 bg-tastelanc-surface text-tastelanc-accent focus:ring-tastelanc-accent"
                  />
                  <span className="text-sm text-gray-300">Featured Item</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.is_available}
                    onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                    className="rounded border-gray-600 bg-tastelanc-surface text-tastelanc-accent focus:ring-tastelanc-accent"
                  />
                  <span className="text-sm text-gray-300">Available</span>
                </label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateItem} disabled={saving || !editingItem.name.trim()}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
                <Button variant="secondary" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Menu List */}
        {menus.map((menu) => (
          <Card key={menu.id} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white">{menu.name}</h3>
                {menu.description && <p className="text-gray-400 text-sm">{menu.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditingMenu(menu)}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowAddSection(menu.id)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Section
                </Button>
                <button onClick={() => handleDeleteMenu(menu.id)} className="text-gray-400 hover:text-red-400 p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add Section Form */}
            {showAddSection === menu.id && (
              <div className="mb-6 p-4 bg-tastelanc-surface/50 rounded-lg">
                <h4 className="text-white font-medium mb-3">Add New Section</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Section name (e.g., Appetizers, Entrees)"
                    value={newSection.name}
                    onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                    className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newSection.description}
                    onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                    className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleCreateSection(menu.id)} disabled={saving || !newSection.name.trim()}>
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Add Section
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setShowAddSection(null);
                        setNewSection({ name: '', description: '' });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Section Tabs */}
            {menu.menu_sections.length > 0 && (
              <div
                className="border-b border-tastelanc-surface-light mb-6 overflow-x-auto"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="flex items-center min-w-max">
                  {[...menu.menu_sections]
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((section) => {
                      const isActive = getActiveSection(menu.id, menu.menu_sections) === section.id;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveTab(menu.id, section.id)}
                          className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                            isActive
                              ? 'text-white border-tastelanc-accent'
                              : 'text-gray-400 border-transparent hover:text-white hover:border-tastelanc-surface-light'
                          }`}
                        >
                          {section.name}
                          <span className={`ml-2 text-xs ${isActive ? 'text-tastelanc-accent' : 'opacity-60'}`}>
                            ({section.menu_items.length})
                          </span>
                        </button>
                      );
                    })}
                  <button
                    onClick={() => setShowAddSection(menu.id)}
                    className="px-3 py-3 text-gray-400 hover:text-white transition-colors"
                    title="Add Section"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Active Section Content */}
            <div className="space-y-6">
              {menu.menu_sections
                .filter((section) => section.id === getActiveSection(menu.id, menu.menu_sections))
                .map((section) => (
                <div key={section.id} className="border border-tastelanc-surface-light rounded-lg">
                  <div className="flex items-center justify-between p-4 bg-tastelanc-surface rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
                      <h4 className="font-medium text-white">{section.name}</h4>
                      <Badge>{section.menu_items.length} items</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingSection(section)} className="text-gray-400 hover:text-white">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteSection(section.id, menu.id)} className="text-gray-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-tastelanc-surface-light">
                    {section.menu_items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-4 hover:bg-tastelanc-surface/50 ${!item.is_available ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium">{item.name}</p>
                              {item.is_featured && <Badge variant="accent">Featured</Badge>}
                              {!item.is_available && <Badge>Unavailable</Badge>}
                            </div>
                            {item.description && <p className="text-gray-400 text-sm">{item.description}</p>}
                            {item.dietary_flags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {item.dietary_flags.map((flag) => (
                                  <Badge key={flag} className="text-xs">
                                    {flag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {item.price !== null && <span className="text-gray-300">${item.price.toFixed(2)}</span>}
                          {item.price_description && !item.price && (
                            <span className="text-gray-400 text-sm">{item.price_description}</span>
                          )}
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEditingItem(item)} className="text-gray-400 hover:text-white">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Item Form */}
                    {showAddItem === section.id ? (
                      <div className="p-4 bg-tastelanc-surface/30">
                        <div className="grid gap-4 mb-4">
                          <div className="grid grid-cols-2 gap-4">
                            <input
                              type="text"
                              placeholder="Item name *"
                              value={newItem.name}
                              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                              className="px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                            />
                            <input
                              type="number"
                              placeholder="Price"
                              value={newItem.price}
                              onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                              step="0.01"
                              min="0"
                              className="px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            value={newItem.description}
                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                            className="px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                          />
                          <div className="flex flex-wrap gap-3">
                            {DIETARY_FLAGS.map((flag) => (
                              <label key={flag.value} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newItem.dietary_flags.includes(flag.value)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewItem({ ...newItem, dietary_flags: [...newItem.dietary_flags, flag.value] });
                                    } else {
                                      setNewItem({ ...newItem, dietary_flags: newItem.dietary_flags.filter((f) => f !== flag.value) });
                                    }
                                  }}
                                  className="rounded border-gray-600 bg-tastelanc-surface text-tastelanc-accent focus:ring-tastelanc-accent"
                                />
                                <span className="text-sm text-gray-300">{flag.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleCreateItem(section.id)} disabled={saving || !newItem.name.trim()}>
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Add Item
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setShowAddItem(null);
                              setNewItem({ name: '', description: '', price: '', price_description: '', dietary_flags: [], is_featured: false });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddItem(section.id)}
                        className="w-full p-4 text-left text-gray-400 hover:text-white hover:bg-tastelanc-surface/50 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Item
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {menu.menu_sections.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>No sections yet. Add a section to start adding menu items.</p>
                </div>
              )}
            </div>
          </Card>
        ))}

        {/* URL Import Modal */}
        {showUrlImport && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Import Menu from URL
              </h3>
              <button onClick={cancelUrlImport} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!parsedMenu ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Menu URL</label>
                  <input
                    type="url"
                    placeholder="https://yourrestaurant.com/menu"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                  <p className="text-gray-500 text-sm mt-1">
                    Paste a link to your restaurant&apos;s online menu page
                  </p>
                </div>
                {importing && (
                  <div className="p-3 bg-tastelanc-surface/50 rounded-lg">
                    <div className="flex items-center gap-2 text-tastelanc-accent mb-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">Scanning page for menus...</span>
                    </div>
                    <p className="text-gray-500 text-xs">
                      Checking page text, images, embedded menus, and linked PDFs simultaneously. This may take up to 30 seconds.
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleUrlImport} disabled={importing || !importUrl.trim()}>
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing Menu...
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4 mr-2" />
                        Import Menu
                      </>
                    )}
                  </Button>
                  <Button variant="secondary" onClick={cancelUrlImport} disabled={importing}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Import Preview */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Menu imported!</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    We found {parsedMenu.stats.sections_count} sections with {parsedMenu.stats.items_count} items
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Menu Name</label>
                  <input
                    type="text"
                    value={importMenuName}
                    onChange={(e) => setImportMenuName(e.target.value)}
                    className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>

                {/* Preview sections */}
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {parsedMenu.sections.map((section, sIdx) => (
                    <div key={sIdx} className="border border-tastelanc-surface-light rounded-lg">
                      <div className="p-3 bg-tastelanc-surface rounded-t-lg">
                        <h4 className="font-medium text-white">{section.name}</h4>
                        {section.description && (
                          <p className="text-gray-400 text-sm">{section.description}</p>
                        )}
                      </div>
                      <div className="divide-y divide-tastelanc-surface-light">
                        {section.items.map((item, iIdx) => (
                          <div key={iIdx} className="p-3 flex justify-between items-start">
                            <div>
                              <p className="text-white">{item.name}</p>
                              {item.description && (
                                <p className="text-gray-400 text-sm">{item.description}</p>
                              )}
                              {item.dietary_flags && item.dietary_flags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {item.dietary_flags.map((flag) => (
                                    <Badge key={flag} className="text-xs">{flag}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-gray-300">
                              {item.price !== null && item.price !== undefined
                                ? `$${item.price.toFixed(2)}`
                                : item.price_description || ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <p className="text-yellow-400 text-sm">
                    Review the imported items above. You can edit any details after saving.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveImportedMenu} disabled={saving || !importMenuName.trim()}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Save Menu
                      </>
                    )}
                  </Button>
                  <Button variant="secondary" onClick={() => setParsedMenu(null)}>
                    Try Different URL
                  </Button>
                  <Button variant="secondary" onClick={cancelUrlImport}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Image Import Modal */}
        {showImageImport && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Image className="w-5 h-5" />
                Import Menu from Image
              </h3>
              <button onClick={cancelImageImport} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!parsedMenu ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Menu Image</label>
                  <div className="border-2 border-dashed border-tastelanc-surface-light rounded-lg p-6 text-center">
                    {imagePreview ? (
                      <div className="space-y-4">
                        <img
                          src={imagePreview}
                          alt="Menu preview"
                          className="max-h-64 mx-auto rounded-lg"
                        />
                        <p className="text-gray-400 text-sm">{imageFile?.name}</p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                        >
                          Choose Different Image
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Image className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                        <p className="text-gray-300 mb-1">Click to upload a menu image</p>
                        <p className="text-gray-500 text-sm">JPEG, PNG, GIF, or WebP (max 10MB)</p>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleImageImport} disabled={importing || !imageFile}>
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing Image...
                      </>
                    ) : (
                      <>
                        <Image className="w-4 h-4 mr-2" />
                        Import Menu
                      </>
                    )}
                  </Button>
                  <Button variant="secondary" onClick={cancelImageImport}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Import Preview */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Menu imported!</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    We found {parsedMenu.stats.sections_count} sections with {parsedMenu.stats.items_count} items
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Menu Name</label>
                  <input
                    type="text"
                    value={importMenuName}
                    onChange={(e) => setImportMenuName(e.target.value)}
                    className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>

                {/* Preview sections */}
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {parsedMenu.sections.map((section, sIdx) => (
                    <div key={sIdx} className="border border-tastelanc-surface-light rounded-lg">
                      <div className="p-3 bg-tastelanc-surface rounded-t-lg">
                        <h4 className="font-medium text-white">{section.name}</h4>
                        {section.description && (
                          <p className="text-gray-400 text-sm">{section.description}</p>
                        )}
                      </div>
                      <div className="divide-y divide-tastelanc-surface-light">
                        {section.items.map((item, iIdx) => (
                          <div key={iIdx} className="p-3 flex justify-between items-start">
                            <div>
                              <p className="text-white">{item.name}</p>
                              {item.description && (
                                <p className="text-gray-400 text-sm">{item.description}</p>
                              )}
                              {item.dietary_flags && item.dietary_flags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {item.dietary_flags.map((flag) => (
                                    <Badge key={flag} className="text-xs">{flag}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-gray-300">
                              {item.price !== null && item.price !== undefined
                                ? `$${item.price.toFixed(2)}`
                                : item.price_description || ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <p className="text-yellow-400 text-sm">
                    Review the imported items above. You can edit any details after saving.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveImportedMenuGeneric} disabled={saving || !importMenuName.trim()}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Save Menu
                      </>
                    )}
                  </Button>
                  <Button variant="secondary" onClick={() => setParsedMenu(null)}>
                    Try Different Image
                  </Button>
                  <Button variant="secondary" onClick={cancelImageImport}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* PDF Import Modal */}
        {showPdfImport && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Import Menu from PDF
              </h3>
              <button onClick={cancelPdfImport} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!parsedMenu ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Menu PDF</label>
                  <div className="border-2 border-dashed border-tastelanc-surface-light rounded-lg p-6 text-center">
                    {pdfFile ? (
                      <div className="space-y-4">
                        <FileText className="w-12 h-12 text-tastelanc-accent mx-auto" />
                        <p className="text-gray-300">{pdfFile.name}</p>
                        <p className="text-gray-500 text-sm">
                          {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPdfFile(null)}
                        >
                          Choose Different File
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                        <p className="text-gray-300 mb-1">Click to upload a menu PDF</p>
                        <p className="text-gray-500 text-sm">PDF files only (max 20MB)</p>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handlePdfSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handlePdfImport} disabled={importing || !pdfFile}>
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing PDF...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Import Menu
                      </>
                    )}
                  </Button>
                  <Button variant="secondary" onClick={cancelPdfImport}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Import Preview */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Menu imported!</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    We found {parsedMenu.stats.sections_count} sections with {parsedMenu.stats.items_count} items
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Menu Name</label>
                  <input
                    type="text"
                    value={importMenuName}
                    onChange={(e) => setImportMenuName(e.target.value)}
                    className="w-full px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>

                {/* Preview sections */}
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {parsedMenu.sections.map((section, sIdx) => (
                    <div key={sIdx} className="border border-tastelanc-surface-light rounded-lg">
                      <div className="p-3 bg-tastelanc-surface rounded-t-lg">
                        <h4 className="font-medium text-white">{section.name}</h4>
                        {section.description && (
                          <p className="text-gray-400 text-sm">{section.description}</p>
                        )}
                      </div>
                      <div className="divide-y divide-tastelanc-surface-light">
                        {section.items.map((item, iIdx) => (
                          <div key={iIdx} className="p-3 flex justify-between items-start">
                            <div>
                              <p className="text-white">{item.name}</p>
                              {item.description && (
                                <p className="text-gray-400 text-sm">{item.description}</p>
                              )}
                              {item.dietary_flags && item.dietary_flags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {item.dietary_flags.map((flag) => (
                                    <Badge key={flag} className="text-xs">{flag}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-gray-300">
                              {item.price !== null && item.price !== undefined
                                ? `$${item.price.toFixed(2)}`
                                : item.price_description || ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <p className="text-yellow-400 text-sm">
                    Review the imported items above. You can edit any details after saving.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveImportedMenuGeneric} disabled={saving || !importMenuName.trim()}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Save Menu
                      </>
                    )}
                  </Button>
                  <Button variant="secondary" onClick={() => setParsedMenu(null)}>
                    Try Different PDF
                  </Button>
                  <Button variant="secondary" onClick={cancelPdfImport}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {menus.length === 0 && !showAddMenu && !showUrlImport && !showImageImport && !showPdfImport && (
          <Card className="p-12 text-center">
            <UtensilsCrossed className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No menus yet</h3>
            <p className="text-gray-400 mb-6">Create your first menu to start adding items</p>
            <div className="flex flex-col items-center gap-4">
              <Button onClick={() => setShowAddMenu(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Menu Manually
              </Button>
              <div className="text-gray-500 text-sm">or import from</div>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={() => setShowUrlImport(true)}>
                  <Link2 className="w-4 h-4 mr-2" />
                  URL
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowImageImport(true)}>
                  <Image className="w-4 h-4 mr-2" />
                  Image
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowPdfImport(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </TierGate>
  );
}
