'use client';

import { useState, useCallback, useEffect } from 'react';
import { Percent, DollarSign, Gift, Ticket, Tag } from 'lucide-react';
import { Button } from '@/components/ui';
import StepWizard from './StepWizard';
import WizardStep from './WizardStep';
import TemplateSelector from './TemplateSelector';
import DaySelector from './DaySelector';
import TimeRangePicker from './TimeRangePicker';
import SuccessCelebration from './SuccessCelebration';
import SpecialImageUpload from './SpecialImageUpload';
import { CouponFormData, Template, formatTimeDisplay } from './types';

const COUPON_TEMPLATES: Template<Partial<CouponFormData>>[] = [
  {
    id: 'percent_off',
    name: '% Off',
    description: 'Percentage discount',
    icon: Percent,
    defaults: {
      title: '',
      discount_type: 'percent_off',
      discount_value: '10',
    },
  },
  {
    id: 'dollar_off',
    name: '$ Off',
    description: 'Dollar amount off',
    icon: DollarSign,
    defaults: {
      title: '',
      discount_type: 'dollar_off',
      discount_value: '5',
    },
  },
  {
    id: 'bogo',
    name: 'BOGO',
    description: 'Buy one, get one',
    icon: Gift,
    defaults: {
      title: 'Buy One Get One Free',
      description: 'Buy any entree, get the second free',
      discount_type: 'bogo',
    },
  },
  {
    id: 'free_item',
    name: 'Free Item',
    description: 'Complimentary item',
    icon: Ticket,
    defaults: {
      title: '',
      description: 'Free with any purchase',
      discount_type: 'free_item',
    },
  },
];

const INITIAL_FORM_DATA: CouponFormData = {
  title: '',
  description: '',
  discount_type: 'percent_off',
  discount_value: '',
  original_price: '',
  days_of_week: [],
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  start_time: '',
  end_time: '',
  max_claims_total: '',
  max_claims_per_user: '1',
  image_url: undefined,
};

function formatDiscountDisplay(data: CouponFormData): string {
  switch (data.discount_type) {
    case 'percent_off':
      return data.discount_value ? `${data.discount_value}% Off` : '% Off';
    case 'dollar_off':
      return data.discount_value ? `$${data.discount_value} Off` : '$ Off';
    case 'bogo':
      return 'Buy One Get One';
    case 'free_item':
      return 'Free Item';
    case 'custom':
      return 'Custom Deal';
    default:
      return '';
  }
}

interface CouponWizardProps {
  restaurantId: string;
  onClose: () => void;
  onSubmit: (data: CouponFormData) => Promise<void>;
}

export default function CouponWizard({ restaurantId, onClose, onSubmit }: CouponWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [formData, setFormData] = useState<CouponFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-close 2s after success unless user clicked "Add Another"
  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => onClose(), 2000);
    return () => clearTimeout(timer);
  }, [isSuccess, onClose]);

  const totalSteps = 3;

  const goNext = useCallback(() => {
    setDirection('forward');
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection('backward');
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleTemplateSelect = (template: Template<Partial<CouponFormData>>) => {
    setFormData({
      ...INITIAL_FORM_DATA,
      ...template.defaults,
    });
    goNext();
  };

  const handleSkipTemplate = () => {
    setFormData({ ...INITIAL_FORM_DATA, discount_type: 'custom' });
    goNext();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(formData);
      setIsSuccess(true);
    } catch (err) {
      console.error('Failed to create coupon:', err);
      setError(err instanceof Error ? err.message : 'Failed to create coupon. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedStep1 = formData.title.trim().length > 0;

  if (isSuccess) {
    return (
      <StepWizard
        currentStep={totalSteps - 1}
        totalSteps={totalSteps}
        title="Coupon Created!"
        onClose={onClose}
      >
        <SuccessCelebration
          title="Coupon Created!"
          subtitle={`${formData.title} is now live`}
          onContinue={onClose}
          onAddAnother={() => {
            setFormData(INITIAL_FORM_DATA);
            setStep(0);
            setIsSuccess(false);
          }}
        />
      </StepWizard>
    );
  }

  return (
    <StepWizard
      currentStep={step}
      totalSteps={totalSteps}
      title={
        step === 0
          ? 'What type of coupon?'
          : step === 1
            ? 'Coupon Details'
            : 'Review'
      }
      subtitle={step === 0 ? 'Pick a template or create your own' : undefined}
      onClose={onClose}
    >
      {/* Step 0: Template Selection */}
      <WizardStep isActive={step === 0} direction={direction}>
        <TemplateSelector
          templates={COUPON_TEMPLATES}
          onSelect={handleTemplateSelect}
          onSkip={handleSkipTemplate}
        />
      </WizardStep>

      {/* Step 1: Details */}
      <WizardStep isActive={step === 1} direction={direction}>
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
              Coupon Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., 50% Off Any Entree"
              className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
              Description / Fine Print
              <span className="text-tastelanc-text-faint font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Valid for dine-in only. Cannot combine with other offers."
              rows={2}
              className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold resize-none"
            />
          </div>

          {/* Discount Type + Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                Discount Type
              </label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as CouponFormData['discount_type'] })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              >
                <option value="percent_off">% Off</option>
                <option value="dollar_off">$ Off</option>
                <option value="bogo">BOGO</option>
                <option value="free_item">Free Item</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {(formData.discount_type === 'percent_off' || formData.discount_type === 'dollar_off') && (
              <div>
                <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                  {formData.discount_type === 'percent_off' ? 'Percentage' : 'Amount'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tastelanc-text-faint">
                    {formData.discount_type === 'percent_off' ? '%' : '$'}
                  </span>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    placeholder="0"
                    step={formData.discount_type === 'dollar_off' ? '0.01' : '1'}
                    className="w-full pl-7 pr-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Days */}
          <div>
            <label className="block text-sm font-medium text-tastelanc-text-secondary mb-3">
              Which days?
              <span className="text-tastelanc-text-faint font-normal ml-1">(leave blank for every day)</span>
            </label>
            <DaySelector
              value={formData.days_of_week}
              onChange={(days) => setFormData({ ...formData, days_of_week: days })}
            />
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
              Time Available
              <span className="text-tastelanc-text-faint font-normal ml-1">(leave blank for all day)</span>
            </label>
            <TimeRangePicker
              startTime={formData.start_time}
              endTime={formData.end_time}
              onStartTimeChange={(time) => setFormData({ ...formData, start_time: time })}
              onEndTimeChange={(time) => setFormData({ ...formData, end_time: time })}
              startLabel="Start Time"
              endLabel="End Time"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                End Date
                <span className="text-tastelanc-text-faint font-normal ml-1">(optional)</span>
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              />
            </div>
          </div>

          {/* Claim Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                Max Total Claims
                <span className="text-tastelanc-text-faint font-normal ml-1">(blank = unlimited)</span>
              </label>
              <input
                type="number"
                value={formData.max_claims_total}
                onChange={(e) => setFormData({ ...formData, max_claims_total: e.target.value })}
                placeholder="Unlimited"
                min="1"
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
                Per User Limit
              </label>
              <input
                type="number"
                value={formData.max_claims_per_user}
                onChange={(e) => setFormData({ ...formData, max_claims_per_user: e.target.value })}
                placeholder="1"
                min="1"
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-tastelanc-text-secondary mb-2">
              Coupon Image
              <span className="text-tastelanc-text-faint font-normal ml-1">(optional)</span>
            </label>
            <SpecialImageUpload
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
              restaurantId={restaurantId}
            />
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={goBack} className="flex-1">
              Back
            </Button>
            <Button onClick={goNext} disabled={!canProceedStep1} className="flex-1">
              Review
            </Button>
          </div>
        </div>
      </WizardStep>

      {/* Step 2: Review */}
      <WizardStep isActive={step === 2} direction={direction}>
        <div className="space-y-6">
          {/* Preview Card */}
          <div className="bg-tastelanc-surface rounded-xl border-2 border-dashed border-tastelanc-accent/30 overflow-hidden">
            {formData.image_url && (
              <div className="aspect-video">
                <img
                  src={formData.image_url}
                  alt={formData.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-5 h-5 text-tastelanc-accent" />
                <h3 className="text-lg font-semibold text-tastelanc-text-primary">{formData.title}</h3>
              </div>
              {formData.description && (
                <p className="text-tastelanc-text-muted text-sm mb-3">{formData.description}</p>
              )}

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-2 py-1 bg-tastelanc-accent/20 text-tastelanc-accent rounded font-semibold">
                  {formatDiscountDisplay(formData)}
                </span>

                {formData.start_time && formData.end_time && (
                  <span className="px-2 py-1 bg-tastelanc-bg rounded text-tastelanc-text-secondary">
                    {formatTimeDisplay(formData.start_time)} - {formatTimeDisplay(formData.end_time)}
                  </span>
                )}
                {!formData.start_time && !formData.end_time && (
                  <span className="px-2 py-1 bg-tastelanc-bg rounded text-tastelanc-text-secondary">
                    All Day
                  </span>
                )}

                {formData.days_of_week.length > 0 ? (
                  formData.days_of_week.map((day) => (
                    <span
                      key={day}
                      className="px-2 py-1 bg-lancaster-gold/20 text-lancaster-gold rounded capitalize"
                    >
                      {day.slice(0, 3)}
                    </span>
                  ))
                ) : (
                  <span className="px-2 py-1 bg-lancaster-gold/20 text-lancaster-gold rounded">
                    Every Day
                  </span>
                )}

                {formData.max_claims_total && (
                  <span className="px-2 py-1 bg-tastelanc-bg rounded text-tastelanc-text-secondary">
                    Limit: {formData.max_claims_total} total
                  </span>
                )}

                <span className="px-2 py-1 bg-tastelanc-bg rounded text-tastelanc-text-secondary">
                  {formData.max_claims_per_user || '1'} per user
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setError(null);
                goBack();
              }}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Coupon'}
            </Button>
          </div>
        </div>
      </WizardStep>
    </StepWizard>
  );
}
