/**
 * Pagination utilities for MCP endpoints
 */

interface PaginationResult<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Apply pagination to an array of items
 */
export function paginateItems<T>(
  items: T[],
  cursor: string | null,
  pageSize: number = 10
): PaginationResult<T> {
  // Default pageSize if not provided or invalid
  pageSize = Number(pageSize) || 10;
  
  // Ensure pageSize is reasonable
  if (pageSize < 1) pageSize = 10;
  if (pageSize > 100) pageSize = 100;

  // If no items, return empty result with no cursor
  if (!items || items.length === 0) {
    return {
      items: [],
      nextCursor: null
    };
  }

  let startIndex = 0;
  
  // If cursor is provided, decode it to get the start index
  if (cursor) {
    try {
      const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
      startIndex = parseInt(decodedCursor, 10);
      
      // Validate the start index
      if (isNaN(startIndex) || startIndex < 0) {
        startIndex = 0;
      }
    } catch (error) {
      // If cursor is invalid, start from the beginning
      startIndex = 0;
    }
  }

  // Get the items for the current page
  const endIndex = Math.min(startIndex + pageSize, items.length);
  const paginatedItems = items.slice(startIndex, endIndex);

  // Generate the next cursor if there are more items
  let nextCursor: string | null = null;
  if (endIndex < items.length) {
    nextCursor = Buffer.from(endIndex.toString(), 'utf-8').toString('base64');
  }

  return {
    items: paginatedItems,
    nextCursor
  };
}
