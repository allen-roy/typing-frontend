export type Lang = 'javascript' | 'java';
export const LANGS: Lang[] = ['javascript', 'java'];

const SNIPPETS: Record<Lang, string[]> = {
  javascript: [
    [
      'function binarySearch(arr, target) {',
      '  let low = 0;',
      '  let high = arr.length - 1;',
      '  while (low <= high) {',
      '    const mid = Math.floor((low + high) / 2);',
      '    if (arr[mid] === target) return mid;',
      '    if (arr[mid] < target) low = mid + 1;',
      '    else high = mid - 1;',
      '  }',
      '  return -1;',
      '}',
    ].join('\n'),
    [
      'function bubbleSort(arr) {',
      '  for (let i = 0; i < arr.length; i++) {',
      '    for (let j = 0; j < arr.length - i - 1; j++) {',
      '      if (arr[j] > arr[j + 1]) {',
      '        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];',
      '      }',
      '    }',
      '  }',
      '  return arr;',
      '}',
    ].join('\n'),
    [
      'function twoSum(nums, target) {',
      '  const seen = new Map();',
      '  for (let i = 0; i < nums.length; i++) {',
      '    const need = target - nums[i];',
      '    if (seen.has(need)) return [seen.get(need), i];',
      '    seen.set(nums[i], i);',
      '  }',
      '  return [];',
      '}',
    ].join('\n'),
  ],
  java: [
    [
      'public static int binarySearch(int[] arr, int target) {',
      '    int low = 0;',
      '    int high = arr.length - 1;',
      '    while (low <= high) {',
      '        int mid = low + (high - low) / 2;',
      '        if (arr[mid] == target) return mid;',
      '        if (arr[mid] < target) low = mid + 1;',
      '        else high = mid - 1;',
      '    }',
      '    return -1;',
      '}',
    ].join('\n'),
    [
      'public static void bubbleSort(int[] arr) {',
      '    for (int i = 0; i < arr.length; i++) {',
      '        for (int j = 0; j < arr.length - i - 1; j++) {',
      '            if (arr[j] > arr[j + 1]) {',
      '                int temp = arr[j];',
      '                arr[j] = arr[j + 1];',
      '                arr[j + 1] = temp;',
      '            }',
      '        }',
      '    }',
      '}',
    ].join('\n'),
    [
      'public static String reverse(String s) {',
      '    StringBuilder sb = new StringBuilder();',
      '    for (int i = s.length() - 1; i >= 0; i--) {',
      '        sb.append(s.charAt(i));',
      '    }',
      '    return sb.toString();',
      '}',
    ].join('\n'),
  ],
};

export function randomSnippet(lang: Lang): string {
  const list = SNIPPETS[lang];
  return list[Math.floor(Math.random() * list.length)]!;
}