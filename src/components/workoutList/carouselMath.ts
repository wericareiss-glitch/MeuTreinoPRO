/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function computeTargetScrollLeft(params: {
  targetIdx: number;
  containerWidth: number;
  itemWidth: number;
  itemCount: number;
}): number {
  const { targetIdx, containerWidth, itemWidth, itemCount } = params;
  if (itemCount <= 1 || itemWidth <= 0) return 0;

  const clampedIdx = Math.max(0, Math.min(itemCount - 1, targetIdx));
  const maxScrollLeft = Math.max(0, itemCount * itemWidth - containerWidth);
  const centeredLeft = clampedIdx * itemWidth - (containerWidth - itemWidth) / 2;

  return Math.max(0, Math.min(maxScrollLeft, centeredLeft));
}

export function computeCenteredCardIndex(params: {
  scrollLeft: number;
  containerWidth: number;
  itemWidth: number;
  itemCount: number;
}): number {
  const { scrollLeft, containerWidth, itemWidth, itemCount } = params;
  if (itemCount <= 1 || itemWidth <= 0) return 0;

  const maxScrollLeft = Math.max(0, itemCount * itemWidth - containerWidth);
  if (scrollLeft <= 4) return 0;
  if (maxScrollLeft > 0 && scrollLeft >= maxScrollLeft - 4) return itemCount - 1;

  const viewportCenter = scrollLeft + containerWidth / 2;
  const centeredIdx = Math.round((viewportCenter - itemWidth / 2) / itemWidth);
  return Math.max(0, Math.min(itemCount - 1, centeredIdx));
}
