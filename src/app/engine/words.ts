const WORDS = [
  'time', 'people', 'way', 'day', 'world', 'life', 'hand', 'part', 'child', 'place',
  'work', 'week', 'case', 'point', 'number', 'group', 'problem', 'house', 'water', 'room',
  'money', 'story', 'month', 'book', 'night', 'study', 'school', 'family', 'city', 'door',
  'health', 'person', 'history', 'result', 'change', 'morning', 'reason', 'moment', 'air', 'teacher',
  'force', 'idea', 'light', 'music', 'friend', 'market', 'garden', 'bridge', 'window', 'planet',
  'simple', 'quick', 'strong', 'bright', 'silent', 'gentle', 'steady', 'honest', 'curious', 'ready',
];

export function generateText(count: number): string {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(WORDS[Math.floor(Math.random() * WORDS.length)]!);
  }
  return out.join(' ');
}