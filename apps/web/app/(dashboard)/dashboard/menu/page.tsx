'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical, UtensilsCrossed } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import TierGate from '@/components/TierGate';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number | null;
}

interface MenuSection {
  id: string;
  name: string;
  items: MenuItem[];
}

interface Menu {
  id: string;
  name: string;
  sections: MenuSection[];
}

// Mock data
const initialMenus: Menu[] = [
  {
    id: '1',
    name: 'Main Menu',
    sections: [
      {
        id: 's1',
        name: 'Appetizers',
        items: [
          { id: 'i1', name: 'Wings', description: 'Crispy buffalo wings', price: 12.99 },
          { id: 'i2', name: 'Nachos', description: 'Loaded nachos with all toppings', price: 10.99 },
        ],
      },
      {
        id: 's2',
        name: 'Entrees',
        items: [
          { id: 'i3', name: 'Burger', description: 'Half-pound angus beef burger', price: 14.99 },
          { id: 'i4', name: 'Grilled Salmon', description: 'Fresh Atlantic salmon', price: 22.99 },
        ],
      },
    ],
  },
];

export default function MenuPage() {
  const [menus, setMenus] = useState<Menu[]>(initialMenus);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState<string | null>(null);

  const [newItem, setNewItem] = useState({ name: '', description: '', price: '' });

  const addMenuItem = (sectionId: string) => {
    if (!newItem.name) return;

    setMenus((prev) =>
      prev.map((menu) => ({
        ...menu,
        sections: menu.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                items: [
                  ...section.items,
                  {
                    id: `item-${Date.now()}`,
                    name: newItem.name,
                    description: newItem.description,
                    price: newItem.price ? parseFloat(newItem.price) : null,
                  },
                ],
              }
            : section
        ),
      }))
    );

    setNewItem({ name: '', description: '', price: '' });
    setShowAddItem(null);
  };

  const deleteMenuItem = (sectionId: string, itemId: string) => {
    setMenus((prev) =>
      prev.map((menu) => ({
        ...menu,
        sections: menu.sections.map((section) =>
          section.id === sectionId
            ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
            : section
        ),
      }))
    );
  };

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
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Menu
        </Button>
      </div>

      {menus.map((menu) => (
        <Card key={menu.id} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">{menu.name}</h3>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm">
                <Pencil className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button variant="secondary" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Section
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {menu.sections.map((section) => (
              <div key={section.id} className="border border-tastelanc-surface-light rounded-lg">
                <div className="flex items-center justify-between p-4 bg-tastelanc-surface rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
                    <h4 className="font-medium text-white">{section.name}</h4>
                    <Badge>{section.items.length} items</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-gray-400 hover:text-white">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-tastelanc-surface-light">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 hover:bg-tastelanc-surface/50"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
                        <div>
                          <p className="text-white font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-gray-400 text-sm">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {item.price && (
                          <span className="text-gray-300">${item.price.toFixed(2)}</span>
                        )}
                        <div className="flex items-center gap-2">
                          <button className="text-gray-400 hover:text-white">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteMenuItem(section.id, item.id)}
                            className="text-gray-400 hover:text-red-400"
                          >
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
                        <input
                          type="text"
                          placeholder="Item name"
                          value={newItem.name}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          className="px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                        />
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={newItem.description}
                          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                          className="px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                        />
                        <input
                          type="number"
                          placeholder="Price (optional)"
                          value={newItem.price}
                          onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                          step="0.01"
                          min="0"
                          className="px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => addMenuItem(section.id)}>
                          Add Item
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setShowAddItem(null);
                            setNewItem({ name: '', description: '', price: '' });
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
          </div>
        </Card>
      ))}

      {menus.length === 0 && (
        <Card className="p-12 text-center">
          <UtensilsCrossed className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No menus yet</h3>
          <p className="text-gray-400 mb-4">Create your first menu to start adding items</p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Menu
          </Button>
        </Card>
      )}
    </div>
    </TierGate>
  );
}
