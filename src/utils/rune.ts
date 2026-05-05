// 24 Elder Futhark runes (U+16A0–U+16FF range)
const RUNES = [
  'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ',
  'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ',
  'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ',
];

export function getCurrentRune(): string {
  const now = new Date();

  // Find the most recent Monday 00:01 local time
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 1, 0, 0); // 12:01 AM

  // If we haven't reached Monday 12:01 AM yet, step back one week
  if (now < monday) {
    monday.setDate(monday.getDate() - 7);
  }

  // Jan 5 1970 was a Monday — use it as a stable epoch
  const EPOCH_MS = new Date(1970, 0, 5, 0, 1, 0, 0).getTime();
  const weekIndex = Math.floor((monday.getTime() - EPOCH_MS) / 604800000);
  return RUNES[((weekIndex % 24) + 24) % 24];
}
