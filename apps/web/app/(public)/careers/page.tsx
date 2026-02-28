'use client';

import { useState, useEffect } from 'react';
import { Send, MapPin, Clock, DollarSign, Users, Megaphone, Handshake, ChevronDown, ChevronUp, Briefcase, ArrowRight } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { BRAND } from '@/config/market';
import ApplicationForm from '@/components/careers/ApplicationForm';

interface MarketLink {
  slug: string;
  city_name: string;
  state: string;
  brand_name: string | null;
}

export default function CareersPage() {
  const [expandedRole, setExpandedRole] = useState<string | null>('rpm');
  const [otherMarkets, setOtherMarkets] = useState<MarketLink[]>([]);

  // Fetch other market careers pages
  useEffect(() => {
    fetch('/api/careers/markets')
      .then(res => res.ok ? res.json() : { markets: [] })
      .then(data => setOtherMarkets(data.markets || []))
      .catch(() => {});
  }, []);

  return (
    <div className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="accent" className="mb-4">We&apos;re Hiring</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Join the {BRAND.name} Team
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Help us connect {BRAND.countyShort}&apos;s best restaurants with the community. We&apos;re looking for passionate, self-motivated people who love the local food scene.
          </p>
        </div>

        {/* Open Position */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Open Positions</h2>

          <Card className="overflow-hidden">
            {/* Role Header */}
            <button
              onClick={() => setExpandedRole(expandedRole === 'rpm' ? null : 'rpm')}
              className="w-full p-6 flex items-center justify-between text-left hover:bg-tastelanc-surface-light/50 transition-colors"
            >
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">Restaurant Partnership Manager</h3>
                <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {BRAND.countyShort}, {BRAND.state} &mdash; In Person
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" /> Commission-Based
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Flexible Schedule
                  </span>
                </div>
              </div>
              {expandedRole === 'rpm' ? (
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </button>

            {/* Expanded Job Details */}
            {expandedRole === 'rpm' && (
              <div className="px-6 pb-6 border-t border-tastelanc-surface-light">
                <div className="pt-6 space-y-8">
                  {/* Summary */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">About the Role</h4>
                    <p className="text-gray-400 leading-relaxed">
                      We are seeking a dynamic and proactive Restaurant Partnership Manager to lead the development and management of strategic partnerships with restaurant clients. In this role, you will drive growth by fostering strong relationships, identifying new business opportunities, and ensuring seamless collaboration between our organization and partner restaurants.
                    </p>
                    <p className="text-gray-400 leading-relaxed mt-3">
                      The Restaurant Partnership Manager is responsible for building relationships with local restaurants, onboarding them onto the {BRAND.name} platform, and helping them leverage the app to drive real foot traffic, visibility, and repeat customers. This is a relationship-first role, not traditional ad sales. You&apos;ll work directly with owners and managers to position {BRAND.name} as a long-term marketing partner.
                    </p>
                  </div>

                  {/* Key Responsibilities */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-tastelanc-accent" />
                      Key Responsibilities
                    </h4>
                    <ul className="space-y-2 text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="text-tastelanc-accent mt-1">&#10003;</span>
                        Identify and engage local restaurants, bars, caf&eacute;s, and hospitality venues
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tastelanc-accent mt-1">&#10003;</span>
                        Pitch {BRAND.name}&apos;s value proposition in person, by phone, and at community events
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tastelanc-accent mt-1">&#10003;</span>
                        Onboard new restaurant partners and guide them through setup (specials, happy hours, events, promotions)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tastelanc-accent mt-1">&#10003;</span>
                        Build long-term relationships to encourage renewals, upgrades, and sponsorships
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tastelanc-accent mt-1">&#10003;</span>
                        Represent {BRAND.name} at local events, festivals, and networking opportunities
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-tastelanc-accent mt-1">&#10003;</span>
                        Track outreach, signed partners, and commission earnings
                      </li>
                    </ul>
                  </div>

                  {/* Skills Grid */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-tastelanc-accent" />
                      Key Skills &amp; Competencies
                    </h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-tastelanc-surface rounded-lg p-4">
                        <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Handshake className="w-4 h-4 text-lancaster-gold" />
                          Relationship &amp; Communication
                        </h5>
                        <ul className="space-y-1.5 text-sm text-gray-400">
                          <li>Build trust quickly with restaurant owners and managers</li>
                          <li>Strong verbal communication (in-person, phone, casual meetings)</li>
                          <li>Active listening to understand each restaurant&apos;s goals</li>
                          <li>Comfortable explaining value without sounding &quot;salesy&quot;</li>
                        </ul>
                      </div>

                      <div className="bg-tastelanc-surface rounded-lg p-4">
                        <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Megaphone className="w-4 h-4 text-lancaster-gold" />
                          Hospitality &amp; Local Market
                        </h5>
                        <ul className="space-y-1.5 text-sm text-gray-400">
                          <li>Understanding of restaurant operations and promotions</li>
                          <li>Familiarity with the local food, bar, and nightlife scene</li>
                          <li>Awareness of seasonal trends, events, and foot-traffic drivers</li>
                          <li>Comfortable using mobile apps and basic CRM tools</li>
                        </ul>
                      </div>

                      <div className="bg-tastelanc-surface rounded-lg p-4">
                        <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-lancaster-gold" />
                          Sales &amp; Organization
                        </h5>
                        <ul className="space-y-1.5 text-sm text-gray-400">
                          <li>Confident presenting offerings and closing deals</li>
                          <li>Ability to overcome objections and handle follow-ups</li>
                          <li>Comfortable working toward commission-based income</li>
                          <li>Skilled at positioning partnerships as win-win opportunities</li>
                        </ul>
                      </div>

                      <div className="bg-tastelanc-surface rounded-lg p-4">
                        <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-lancaster-gold" />
                          Self-Management
                        </h5>
                        <ul className="space-y-1.5 text-sm text-gray-400">
                          <li>Manage outreach, follow-ups, and onboarding steps</li>
                          <li>Consistent communication with partners after signup</li>
                          <li>Comfortable tracking progress, commissions, and renewals</li>
                          <li>Strong time management with minimal oversight</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Compensation */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-tastelanc-accent" />
                      Compensation &amp; Benefits
                    </h4>
                    <div className="bg-tastelanc-surface rounded-lg p-4 space-y-3 text-gray-400">
                      <p>
                        This is a <span className="text-white font-medium">100% commission-based role</span> with no cap on earnings. Income is directly tied to performance, with the flexibility to earn based on your effort, consistency, and results.
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">&#10003;</span>
                          Earnings driven by restaurant sign-ups, subscriptions, renewals, and sponsorships
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">&#10003;</span>
                          No ceiling on commissions &mdash; high performers can build recurring income
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">&#10003;</span>
                          Fast sales cycles allow for quicker payouts
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">&#10003;</span>
                          Flexible schedule
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">&#10003;</span>
                          People with a criminal record are encouraged to apply
                        </li>
                      </ul>
                      <p className="text-sm pt-2 border-t border-tastelanc-surface-light">
                        This role offers true upside for someone who wants flexibility, autonomy, and direct control over their earning potential.
                      </p>
                    </div>
                  </div>

                  {/* CTA to Apply */}
                  <div className="pt-2">
                    <a
                      href="#apply"
                      className="inline-flex items-center gap-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                    >
                      <Send className="w-5 h-5" />
                      Apply Now
                    </a>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Application Form */}
        <div id="apply" className="scroll-mt-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Apply Now</h2>
            <p className="text-gray-400">
              Interested in joining our team? Fill out the form below and we&apos;ll be in touch.
            </p>
          </div>

          <ApplicationForm
            position="Restaurant Partnership Manager"
            brandName={BRAND.name}
          />
        </div>

        {/* Opportunities in Other Markets */}
        {otherMarkets.length > 0 && (
          <div className="mt-16 pt-12 border-t border-tastelanc-surface-light">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Opportunities in Other Markets</h2>
              <p className="text-gray-400">
                We&apos;re expanding! Check out openings in these markets.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherMarkets.map((market) => (
                <a
                  key={market.slug}
                  href={`/careers/${market.slug}`}
                  className="group block bg-tastelanc-surface hover:bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-xl p-5 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-white group-hover:text-tastelanc-accent transition-colors">
                    {market.brand_name || `Taste${market.city_name}`}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {market.city_name}, {market.state}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-tastelanc-accent mt-3">
                    View Openings <ArrowRight className="w-4 h-4" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
