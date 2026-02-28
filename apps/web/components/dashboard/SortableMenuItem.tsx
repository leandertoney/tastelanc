'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui';

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

interface SortableMenuItemProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
}

export default function SortableMenuItem({ item, onEdit, onDelete }: SortableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 hover:bg-tastelanc-surface/50 ${!item.is_available ? 'opacity-50' : ''} ${isDragging ? 'bg-tastelanc-surface shadow-lg rounded-lg' : ''}`}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="touch-none text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
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
          <button onClick={() => onEdit(item)} className="text-gray-400 hover:text-white">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(item.id)} className="text-gray-400 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
