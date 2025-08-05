/**
 * Time utility functions for the Backlog AI Extension
 */

/**
 * Safely convert a timestamp to Date object
 */
export function safeTimestampToDate(timestamp: any): Date {
  // If already a Date object and valid
  if (timestamp instanceof Date) {
    if (!isNaN(timestamp.getTime())) {
      return timestamp;
    }
  }

  // If string or number, try to convert
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    // Check if the date is valid
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // If it's an object with a timestamp property (sometimes happens in serialization)
  if (timestamp && typeof timestamp === 'object' && timestamp.timestamp) {
    return safeTimestampToDate(timestamp.timestamp);
  }

  // For invalid timestamps, return an invalid Date object
  // This will naturally display as "Invalid date" in the UI
  return new Date('invalid');
}

/**
 * Format relative time using Intl.RelativeTimeFormat
 */
export function formatRelativeTime(date: Date, locale: string = 'vi-VN'): string {
  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  // Just now (< 1 minute)
  if (diffMinutes < 1) {
    return 'vừa xong';
  }

  // Minutes ago (< 1 hour)
  if (diffHours < 1) {
    return rtf.format(-diffMinutes, 'minute');
  }

  // Hours ago (< 1 day)
  if (diffDays < 1) {
    return rtf.format(-diffHours, 'hour');
  }

  // Days ago (< 7 days)
  if (diffDays < 7) {
    return rtf.format(-diffDays, 'day');
  }

  // For older messages, show date
  if (diffDays < 365) {
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric'
    });
  }

  // For very old messages, show year too
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format full timestamp for tooltip
 */
export function formatFullTimestamp(date: Date, locale: string = 'vi-VN'): string {
  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatDateForFilename(date: Date): string {
  // Format date as YYYYMMDD_HHMM for filenames
  return date.toLocaleString('ja', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/[\/:,]/g, '').replace(/ /g, '_');
}
