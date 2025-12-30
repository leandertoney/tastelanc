/**
 * Blog Content Accuracy Verification System
 *
 * Validates AI-generated blog content against the restaurant database
 * to ensure 98%+ accuracy before publishing.
 */

export interface VerificationIssue {
  type: 'invalid_restaurant' | 'broken_link' | 'missing_link' | 'name_mismatch' | 'invalid_image';
  severity: 'error' | 'warning';
  description: string;
  location?: string;
}

export interface VerificationResult {
  passed: boolean;
  accuracy: number; // 0-100
  issues: VerificationIssue[];
  stats: {
    totalLinks: number;
    validLinks: number;
    totalImages: number;
    validImages: number;
    restaurantsMentioned: number;
    restaurantsLinked: number;
  };
}

interface RestaurantContext {
  name: string;
  slug: string;
  coverImageUrl?: string;
}

/**
 * Verifies blog content accuracy against the restaurant database
 */
export function verifyBlogContent(
  bodyHtml: string,
  restaurants: RestaurantContext[]
): VerificationResult {
  const issues: VerificationIssue[] = [];
  const slugSet = new Set(restaurants.map((r) => r.slug.toLowerCase()));
  const nameToSlug = new Map(restaurants.map((r) => [r.name.toLowerCase(), r.slug]));
  const slugToName = new Map(restaurants.map((r) => [r.slug.toLowerCase(), r.name]));
  const slugToImage = new Map(
    restaurants.filter((r) => r.coverImageUrl).map((r) => [r.slug.toLowerCase(), r.coverImageUrl])
  );

  // 1. Extract and validate all restaurant links
  const linkRegex = /<a[^>]*href="\/restaurants\/([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  const links = Array.from(bodyHtml.matchAll(linkRegex));
  let validLinks = 0;

  for (const [fullMatch, slug, displayName] of links) {
    const normalizedSlug = slug.toLowerCase();

    if (!slugSet.has(normalizedSlug)) {
      issues.push({
        type: 'invalid_restaurant',
        severity: 'error',
        description: `Restaurant slug "${slug}" not found in database`,
        location: fullMatch.substring(0, 100),
      });
    } else {
      validLinks++;

      // Check if display name matches database name (warning only)
      const dbName = slugToName.get(normalizedSlug);
      if (dbName && dbName.toLowerCase() !== displayName.toLowerCase().trim()) {
        issues.push({
          type: 'name_mismatch',
          severity: 'warning',
          description: `Display name "${displayName}" doesn't match DB name "${dbName}"`,
          location: fullMatch.substring(0, 100),
        });
      }
    }
  }

  // 2. Extract and validate images
  const imageRegex = /<img[^>]*src="([^"]+)"[^>]*>/gi;
  const images = Array.from(bodyHtml.matchAll(imageRegex));
  let validImages = 0;

  for (const [fullMatch, src] of images) {
    // Check if it's a Supabase storage URL or a valid external URL
    if (
      src.includes('supabase.co/storage') ||
      src.startsWith('https://') ||
      src.startsWith('http://')
    ) {
      validImages++;
    } else if (src.startsWith('/')) {
      // Local path - might be valid
      validImages++;
    } else {
      issues.push({
        type: 'invalid_image',
        severity: 'warning',
        description: `Potentially invalid image URL: ${src.substring(0, 50)}`,
        location: fullMatch.substring(0, 100),
      });
    }
  }

  // 3. Find restaurant names mentioned but NOT linked (more forgiving approach)
  // Only check for exact name matches that are clearly restaurant mentions
  let restaurantsMentioned = 0;
  let restaurantsLinked = links.length;

  // Build a list of linked restaurant names
  const linkedNames = new Set(links.map(([, , name]) => name.toLowerCase().trim()));

  // Check for unlinked mentions (only for restaurants with distinctive names)
  for (const restaurant of restaurants) {
    // Skip very short or generic names that might have false positives
    if (restaurant.name.length < 5) continue;

    // Use word boundaries to avoid false positives
    const namePattern = new RegExp(`\\b${escapeRegex(restaurant.name)}\\b`, 'gi');
    const mentions = bodyHtml.match(namePattern) || [];

    if (mentions.length > 0) {
      restaurantsMentioned++;

      // Check if any mention is NOT within an <a> tag
      for (const mention of mentions) {
        const mentionIndex = bodyHtml.indexOf(mention);
        if (mentionIndex === -1) continue;

        // Simple check: see if this mention is inside a link
        const beforeText = bodyHtml.substring(Math.max(0, mentionIndex - 100), mentionIndex);
        const afterText = bodyHtml.substring(
          mentionIndex,
          Math.min(bodyHtml.length, mentionIndex + mention.length + 50)
        );

        // If we find an opening <a without a closing </a> before the mention, it's linked
        const isInLink =
          beforeText.includes('<a ') &&
          !beforeText.substring(beforeText.lastIndexOf('<a ')).includes('</a>');

        if (!isInLink && !linkedNames.has(restaurant.name.toLowerCase())) {
          issues.push({
            type: 'missing_link',
            severity: 'warning',
            description: `"${restaurant.name}" is mentioned but not linked`,
          });
          break; // Only report once per restaurant
        }
      }
    }
  }

  // 4. Calculate accuracy score
  // Errors: -10 points each
  // Warnings: -2 points each
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const accuracy = Math.max(0, 100 - errorCount * 10 - warningCount * 2);

  return {
    passed: accuracy >= 98 && errorCount === 0,
    accuracy,
    issues,
    stats: {
      totalLinks: links.length,
      validLinks,
      totalImages: images.length,
      validImages,
      restaurantsMentioned,
      restaurantsLinked,
    },
  };
}

/**
 * Formats verification result for logging
 */
export function formatVerificationResult(result: VerificationResult): string {
  const lines: string[] = [];

  lines.push(`\n📊 ACCURACY REPORT`);
  lines.push(`━`.repeat(40));
  lines.push(`Accuracy Score: ${result.accuracy}% ${result.passed ? '✅' : '❌'}`);
  lines.push(``);
  lines.push(`Stats:`);
  lines.push(`  • Restaurant links: ${result.stats.validLinks}/${result.stats.totalLinks} valid`);
  lines.push(`  • Images: ${result.stats.validImages}/${result.stats.totalImages} valid`);
  lines.push(`  • Restaurants mentioned: ${result.stats.restaurantsMentioned}`);
  lines.push(`  • Restaurants linked: ${result.stats.restaurantsLinked}`);

  if (result.issues.length > 0) {
    lines.push(``);
    lines.push(`Issues (${result.issues.length}):`);

    const errors = result.issues.filter((i) => i.severity === 'error');
    const warnings = result.issues.filter((i) => i.severity === 'warning');

    if (errors.length > 0) {
      lines.push(`  ❌ Errors (${errors.length}):`);
      errors.forEach((e) => lines.push(`     • ${e.description}`));
    }

    if (warnings.length > 0) {
      lines.push(`  ⚠️  Warnings (${warnings.length}):`);
      warnings.slice(0, 5).forEach((w) => lines.push(`     • ${w.description}`));
      if (warnings.length > 5) {
        lines.push(`     ... and ${warnings.length - 5} more`);
      }
    }
  } else {
    lines.push(``);
    lines.push(`✨ No issues found!`);
  }

  lines.push(`━`.repeat(40));

  return lines.join('\n');
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
