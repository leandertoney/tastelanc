import { createClient } from '@/lib/supabase/server';
import { Card, Badge } from '@/components/ui';
import { Mail, Phone, Building2, Calendar, MessageSquare } from 'lucide-react';
import MarkAsReadButton from './MarkAsReadButton';

async function getContacts() {
  const supabase = await createClient();

  const { data: contacts, error } = await supabase
    .from('contact_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contacts:', error);
    return [];
  }

  return contacts || [];
}

export default async function AdminContactsPage() {
  const contacts = await getContacts();
  const unreadCount = contacts.filter((c) => !c.read_at).length;

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Contact Submissions</h1>
        <p className="text-gray-400 mt-1 text-sm md:text-base">
          {contacts.length} total{unreadCount > 0 && ` (${unreadCount} unread)`}
        </p>
      </div>

      {contacts.length === 0 ? (
        <Card className="p-8 md:p-12 text-center">
          <MessageSquare className="w-10 h-10 md:w-12 md:h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-base md:text-lg font-medium text-white mb-2">No contacts yet</h3>
          <p className="text-gray-400 text-sm md:text-base">
            When restaurants submit the contact form, their inquiries will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              className={`p-4 md:p-6 ${!contact.read_at ? 'ring-1 ring-tastelanc-accent/50' : ''}`}
            >
              {/* Header - Stack on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-tastelanc-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-tastelanc-accent font-semibold">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{contact.name}</h3>
                      {!contact.read_at && (
                        <Badge variant="accent" className="text-xs">New</Badge>
                      )}
                    </div>
                    {contact.business_name && (
                      <p className="text-gray-400 text-sm flex items-center gap-1 truncate">
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{contact.business_name}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {contact.interested_plan && (
                    <Badge variant="gold" className="capitalize text-xs">
                      {contact.interested_plan}
                    </Badge>
                  )}
                  <span className="text-gray-500 text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(contact.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: 'America/New_York',
                    })}
                  </span>
                </div>
              </div>

              {/* Contact Info - Stack on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mb-4 text-sm">
                <a
                  href={`mailto:${contact.email}`}
                  className="text-gray-400 hover:text-white flex items-center gap-1 truncate"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </a>
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    {contact.phone}
                  </a>
                )}
              </div>

              {/* Message */}
              <div className="bg-tastelanc-surface-light/50 rounded-lg p-3 md:p-4 mb-4">
                <p className="text-gray-300 whitespace-pre-wrap text-sm md:text-base">{contact.message}</p>
              </div>

              {/* Footer - Stack on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-gray-500">
                  {contact.read_at && (
                    <span>Read {new Date(contact.read_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'America/New_York',
                    })}</span>
                  )}
                  {contact.responded_at && (
                    <span className="ml-3">
                      Responded {new Date(contact.responded_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'America/New_York',
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!contact.read_at && (
                    <MarkAsReadButton contactId={contact.id} />
                  )}
                  <a
                    href={`mailto:${contact.email}?subject=RE: TasteLanc Partnership Inquiry`}
                    className="text-sm text-tastelanc-accent hover:underline"
                  >
                    Reply
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
