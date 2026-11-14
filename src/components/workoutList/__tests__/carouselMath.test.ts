/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { computeCenteredCardIndex, computeTargetScrollLeft } from '../carouselMath';

describe('carouselMath', () => {
  it('computes centered scroll positions and resolves back to the same index on mobile widths', () => {
    const containerWidth = 360;
    const itemWidth = 332;
    const itemCount = 4;

    for (let idx = 0; idx < itemCount; idx++) {
      const targetLeft = computeTargetScrollLeft({
        targetIdx: idx,
        containerWidth,
        itemWidth,
        itemCount,
      });
      const resolvedIdx = computeCenteredCardIndex({
        scrollLeft: targetLeft,
        containerWidth,
        itemWidth,
        itemCount,
      });
      expect(resolvedIdx).toBe(idx);
    }
  });

  it('resolves all indices accurately on desktop widths where 2 cards are visible simultaneously', () => {
    const containerWidth = 896;
    const itemWidth = 448;
    const itemCount = 4;

    for (let idx = 0; idx < itemCount; idx++) {
      const targetLeft = computeTargetScrollLeft({
        targetIdx: idx,
        containerWidth,
        itemWidth,
        itemCount,
      });
      const resolvedIdx = computeCenteredCardIndex({
        scrollLeft: targetLeft,
        containerWidth,
        itemWidth,
        itemCount,
      });
      expect(resolvedIdx).toBe(idx);
    }
  });

  it('clamps out-of-range indices and scroll offsets safely', () => {
    expect(
      computeTargetScrollLeft({
        targetIdx: -3,
        containerWidth: 400,
        itemWidth: 372,
        itemCount: 3,
      })
    ).toBe(0);

    expect(
      computeCenteredCardIndex({
        scrollLeft: 9999,
        containerWidth: 400,
        itemWidth: 372,
        itemCount: 3,
      })
    ).toBe(2);
  });
});
