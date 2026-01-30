'use client';

import { useState, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  Music,
  Mic2,
  Laugh,
  Upload,
  Loader2,
  Check,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  DollarSign,
} from 'lucide-react';
import { Card } from '@/components/ui';

interface PromoterEventWizardProps {
  selfPromoterId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const EVENT_TYPES = [
  { id: 'live_music', label: 'Live Music', icon: Music, description: 'Band, solo artist, etc.' },
  { id: 'dj', label: 'DJ Night', icon: Music, description: 'DJ set, dance night' },
  { id: 'karaoke', label: 'Karaoke', icon: Mic2, description: 'Karaoke night' },
  { id: 'comedy', label: 'Comedy', icon: Laugh, description: 'Stand-up, comedy show' },
];

export default function PromoterEventWizard({
  selfPromoterId,
  onClose,
  onSuccess,
}: PromoterEventWizardProps) {
  const [step, setStep] = useState(1);

  // Form state
  const [eventType, setEventType] = useState('live_music');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('');
  const [coverCharge, setCoverCharge] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/dashboard/promoter/events/upload?self_promoter_id=${selfPromoterId}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { url } = await res.json();
      setImageUrl(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch(`/api/dashboard/promoter/events?self_promoter_id=${selfPromoterId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          event_type: eventType,
          event_date: eventDate,
          start_time: startTime,
          end_time: endTime || null,
          cover_charge: coverCharge || null,
          image_url: imageUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create event');
      }

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedStep1 = eventType !== '';
  const canProceedStep2 = name.trim() !== '' && eventDate !== '' && startTime !== '';
  const canProceedStep3 = imageUrl !== '';

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-tastelanc-surface rounded-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-tastelanc-surface-light bg-tastelanc-surface">
          <h2 className="text-lg font-semibold text-white">Create Event</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {showSuccess ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Event Created!</h3>
            <p className="text-gray-400">Your event is now live</p>
          </div>
        ) : (
          <>
            {/* Step Indicator */}
            <div className="flex items-center gap-2 p-4 border-b border-tastelanc-surface-light">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      s < step
                        ? 'bg-green-500 text-white'
                        : s === step
                        ? 'bg-purple-500 text-white'
                        : 'bg-tastelanc-surface-light text-gray-500'
                    }`}
                  >
                    {s < step ? <Check className="w-3 h-3" /> : s}
                  </div>
                  {s < 4 && (
                    <div className={`flex-1 h-px ${s < step ? 'bg-green-500' : 'bg-tastelanc-surface-light'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="p-4">
              {/* Step 1: Event Type */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-1">What type of event?</h3>
                    <p className="text-gray-400 text-sm">Select the category that best fits</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {EVENT_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isSelected = eventType === type.id;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setEventType(type.id)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-tastelanc-surface-light hover:border-gray-600'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-purple-400' : 'text-gray-400'}`} />
                          <p className="text-white font-medium text-sm">{type.label}</p>
                          <p className="text-gray-500 text-xs">{type.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                    className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step 2: Event Details */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-1">Event Details</h3>
                    <p className="text-gray-400 text-sm">Tell us about your event</p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Event Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Friday Night Live"
                      className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What should people expect?"
                      rows={3}
                      className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Date *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          min={today}
                          className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Start Time *</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">End Time</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Cover Charge</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="number"
                          value={coverCharge}
                          onChange={(e) => setCoverCharge(e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!canProceedStep2}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Event Flyer */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-1">Event Flyer *</h3>
                    <p className="text-gray-400 text-sm">Upload your event image/flyer</p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {imageUrl ? (
                    <div className="relative">
                      <img
                        src={imageUrl}
                        alt="Event flyer"
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setImageUrl('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full aspect-square border-2 border-dashed border-tastelanc-surface-light hover:border-purple-500 rounded-lg flex flex-col items-center justify-center gap-3 transition-colors"
                    >
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <Upload className="w-8 h-8 text-purple-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-white font-medium">Upload Event Flyer</p>
                            <p className="text-gray-500 text-sm">JPEG, PNG or WebP • Max 5MB</p>
                          </div>
                        </>
                      )}
                    </button>
                  )}

                  {uploadError && (
                    <p className="text-red-400 text-sm">{uploadError}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      disabled={!canProceedStep3}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Review
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-1">Review Your Event</h3>
                    <p className="text-gray-400 text-sm">Make sure everything looks good</p>
                  </div>

                  <Card className="p-4">
                    <div className="flex gap-4">
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt={name}
                          className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold truncate">{name}</h4>
                        <p className="text-purple-400 text-sm capitalize">{eventType.replace('_', ' ')}</p>
                        <p className="text-gray-400 text-sm mt-1">
                          {eventDate && new Date(eventDate + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {startTime}{endTime && ` - ${endTime}`}
                          {coverCharge && ` • $${coverCharge} cover`}
                        </p>
                      </div>
                    </div>
                    {description && (
                      <p className="text-gray-400 text-sm mt-3 line-clamp-2">{description}</p>
                    )}
                  </Card>

                  {submitError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm">
                      {submitError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(3)}
                      disabled={isSubmitting}
                      className="flex-1 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Create Event
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
