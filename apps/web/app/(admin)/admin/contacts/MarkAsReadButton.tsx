'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function MarkAsReadButton({ contactId }: { contactId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleMarkAsRead = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ read_at: new Date().toISOString() })
        .eq('id', contactId);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error('Error marking as read:', error);
      alert('Failed to mark as read');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleMarkAsRead}
      disabled={isLoading}
      className="text-sm text-gray-400 hover:text-white flex items-center gap-1 disabled:opacity-50"
    >
      <Check className="w-4 h-4" />
      {isLoading ? 'Marking...' : 'Mark as Read'}
    </button>
  );
}
