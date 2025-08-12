export function truncate(content: string, limit = 200, ellipsis = '...') {
  if (content.length > limit) {
    return content.slice(0, limit) + ellipsis;
  }
  return content;
}
