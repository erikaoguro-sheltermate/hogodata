// className 結合ヘルパー（clsx相当の最小実装）
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
