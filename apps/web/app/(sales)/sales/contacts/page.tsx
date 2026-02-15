'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  Loader2,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Users,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  message: string | null;
  interested_plan: string | null;
  created_at: string;
  read_at: string | null;
  responded_at: string | null;
}

export default function SalesContactsPage() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch('/api/sales/contacts');
        const data = await res.json();
        setContacts(data.contacts || []);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const handleConvert = async (contactId: string) => {
    setConvertingId(contactId);
    setMessage(null);

    try {
      const res = await fetch(`/api/sales/contacts/${contactId}/convert`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to convert');
      }

      setMessage({ type: 'success', text: `Converted to lead: ${data.lead.business_name}` });
      // Mark as responded in local state
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, responded_at: new Date().toISOString() } : c
        )
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to convert contact',
      });
    } finally {
      setConvertingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Mail className="w-8 h-8 text-tastelanc-accent" />
          Contact Inquiries
        </h1>
        <p className="text-gray-400 mt-1">Website inquiries from potential restaurant partners</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {message.text}
        </div>
      )}

      {contacts.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No inquiries yet</h3>
          <p className="text-gray-400">Contact form submissions will appear here</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card key={contact.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-white">
                      {contact.business_name || contact.name}
                    </h3>
                    {contact.interested_plan && (
                      <Badge className="bg-lancaster-gold/20 text-lancaster-gold">
                        {contact.interested_plan}
                      </Badge>
                    )}
                    {contact.responded_at && (
                      <Badge className="bg-green-500/20 text-green-400">Converted</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400 mb-2">
                    <span>{contact.name}</span>
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-white">
                      <Mail className="w-3 h-3" /> {contact.email}
                    </a>
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-white">
                        <Phone className="w-3 h-3" /> {contact.phone}
                      </a>
                    )}
                    <span className="text-gray-600">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {contact.message && (
                    <p className="text-sm text-gray-500">
                      <MessageSquare className="w-3 h-3 inline mr-1" />
                      {contact.message}
                    </p>
                  )}
                </div>

                {!contact.responded_at && (
                  <button
                    onClick={() => handleConvert(contact.id)}
                    disabled={convertingId === contact.id}
                    className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors flex-shrink-0"
                  >
                    {convertingId === contact.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        Convert to Lead
                      </>
                    )}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
