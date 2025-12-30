'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui';

interface ParsedLead {
  business_name: string;
  contact_name?: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  category?: string;
  notes?: string;
  tags?: string;
}

interface ImportResult {
  imported: number;
  errors?: Array<{ row: number; error: string; email?: string }>;
  skipped?: Array<{ row: number; email: string; reason: string }>;
  totalProcessed: number;
}

export default function ImportBusinessLeadsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = (content: string): ParsedLead[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    // Parse header row
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));

    // Map common header variations
    const headerMap: Record<string, string> = {
      business: 'business_name',
      business_name: 'business_name',
      name: 'business_name',
      company: 'business_name',
      company_name: 'business_name',
      contact: 'contact_name',
      contact_name: 'contact_name',
      email: 'email',
      email_address: 'email',
      phone: 'phone',
      phone_number: 'phone',
      website: 'website',
      url: 'website',
      address: 'address',
      street: 'address',
      street_address: 'address',
      city: 'city',
      state: 'state',
      zip: 'zip_code',
      zip_code: 'zip_code',
      zipcode: 'zip_code',
      postal_code: 'zip_code',
      category: 'category',
      type: 'category',
      notes: 'notes',
      note: 'notes',
      tags: 'tags',
    };

    const normalizedHeaders = headers.map((h) => headerMap[h] || h);

    // Parse data rows
    const leads: ParsedLead[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const leadData: Record<string, string> = {};
      normalizedHeaders.forEach((header, index) => {
        if (values[index]) {
          leadData[header] = values[index].trim();
        }
      });

      // Only include if has required fields
      if (leadData.business_name && leadData.email) {
        const lead: ParsedLead = {
          business_name: leadData.business_name,
          email: leadData.email,
          contact_name: leadData.contact_name,
          phone: leadData.phone,
          website: leadData.website,
          address: leadData.address,
          city: leadData.city,
          state: leadData.state,
          zip_code: leadData.zip_code,
          category: leadData.category,
          notes: leadData.notes,
          tags: leadData.tags,
        };
        leads.push(lead);
      }
    }

    return leads;
  };

  // Parse a single CSV line, handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return values;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    setResult(null);
    setParsedLeads([]);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      setFile(null);
      return;
    }

    setFile(selectedFile);

    // Read and parse file
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const leads = parseCSV(content);
      setParsedLeads(leads);

      if (leads.length === 0) {
        setError('No valid leads found in file. Make sure you have business_name and email columns.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (parsedLeads.length === 0) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/business-leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: parsedLeads }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import leads');
      }

      setResult(data);

      if (data.imported > 0) {
        setTimeout(() => {
          router.push('/admin/business-leads');
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import leads');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = 'business_name,contact_name,email,phone,website,address,city,state,zip_code,category,notes,tags';
    const example = 'Joe\'s Pizza,John Smith,john@joespizza.com,(717) 555-0123,https://joespizza.com,123 Main St,Lancaster,PA,17601,restaurant,Great local spot,downtown';
    const csv = `${headers}\n${example}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business_leads_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFile = () => {
    setFile(null);
    setParsedLeads([]);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/business-leads"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leads
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Upload className="w-8 h-8 text-tastelanc-accent" />
          Import Leads from CSV
        </h1>
      </div>

      {/* Instructions */}
      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-white mb-3">CSV Format Requirements</h2>
        <p className="text-gray-400 text-sm mb-4">
          Your CSV file must include the following columns:
        </p>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="text-white font-medium mb-2">Required Columns:</h3>
            <ul className="space-y-1 text-gray-400">
              <li>• <code className="text-tastelanc-accent">business_name</code> - Business name</li>
              <li>• <code className="text-tastelanc-accent">email</code> - Email address</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">Optional Columns:</h3>
            <ul className="space-y-1 text-gray-400">
              <li>• <code className="text-gray-500">contact_name</code> - Contact person</li>
              <li>• <code className="text-gray-500">phone</code> - Phone number</li>
              <li>• <code className="text-gray-500">website</code> - Website URL</li>
              <li>• <code className="text-gray-500">city, state, zip_code</code></li>
              <li>• <code className="text-gray-500">category</code> - restaurant, bar, cafe, etc.</li>
              <li>• <code className="text-gray-500">notes, tags</code></li>
            </ul>
          </div>
        </div>
        <button
          onClick={downloadTemplate}
          className="mt-4 inline-flex items-center gap-2 text-tastelanc-accent hover:text-tastelanc-accent-hover text-sm"
        >
          <Download className="w-4 h-4" />
          Download Template CSV
        </button>
      </Card>

      {/* Upload Area */}
      <Card className="p-6 mb-6">
        {!file ? (
          <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-tastelanc-surface-light rounded-lg cursor-pointer hover:border-tastelanc-accent transition-colors">
            <FileSpreadsheet className="w-12 h-12 text-gray-500 mb-4" />
            <p className="text-white font-medium mb-1">Click to upload CSV file</p>
            <p className="text-gray-400 text-sm">or drag and drop</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div>
            <div className="flex items-center justify-between p-4 bg-tastelanc-surface-light rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-tastelanc-accent" />
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-gray-400 text-sm">
                    {parsedLeads.length} leads found
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="p-2 hover:bg-tastelanc-surface rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Preview */}
            {parsedLeads.length > 0 && (
              <div className="mb-4">
                <h3 className="text-white font-medium mb-2">Preview (first 5 leads):</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-tastelanc-surface-light">
                        <th className="text-left py-2 px-3 text-gray-400">Business</th>
                        <th className="text-left py-2 px-3 text-gray-400">Contact</th>
                        <th className="text-left py-2 px-3 text-gray-400">Email</th>
                        <th className="text-left py-2 px-3 text-gray-400">City</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedLeads.slice(0, 5).map((lead, i) => (
                        <tr key={i} className="border-b border-tastelanc-surface-light/50">
                          <td className="py-2 px-3 text-white">{lead.business_name}</td>
                          <td className="py-2 px-3 text-gray-300">{lead.contact_name || '-'}</td>
                          <td className="py-2 px-3 text-gray-300">{lead.email}</td>
                          <td className="py-2 px-3 text-gray-300">{lead.city || 'Lancaster'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedLeads.length > 5 && (
                  <p className="text-gray-500 text-sm mt-2">
                    ... and {parsedLeads.length - 5} more leads
                  </p>
                )}
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={isUploading || parsedLeads.length === 0}
              className="w-full bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Import {parsedLeads.length} Leads
                </>
              )}
            </button>
          </div>
        )}
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Import Complete</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{result.imported}</div>
              <div className="text-sm text-gray-400">Imported</div>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">{result.skipped?.length || 0}</div>
              <div className="text-sm text-gray-400">Skipped</div>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{result.errors?.length || 0}</div>
              <div className="text-sm text-gray-400">Errors</div>
            </div>
          </div>

          {result.skipped && result.skipped.length > 0 && (
            <div className="mb-4">
              <h4 className="text-white font-medium mb-2">Skipped (already exist):</h4>
              <div className="text-sm text-gray-400 max-h-32 overflow-y-auto">
                {result.skipped.slice(0, 10).map((s, i) => (
                  <div key={i}>Row {s.row}: {s.email}</div>
                ))}
                {result.skipped.length > 10 && (
                  <div className="text-gray-500">... and {result.skipped.length - 10} more</div>
                )}
              </div>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-white font-medium mb-2">Errors:</h4>
              <div className="text-sm text-red-400 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i}>Row {e.row}: {e.error}</div>
                ))}
              </div>
            </div>
          )}

          <p className="text-gray-400 text-sm">
            Redirecting to leads page...
          </p>
        </Card>
      )}
    </div>
  );
}
