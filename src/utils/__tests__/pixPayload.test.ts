/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { generatePixPayload } from '../pixPayload';

describe('generatePixPayload', () => {
  it('generates a valid PIX payload structure with amount', () => {
    const payload = generatePixPayload({
      pixKey: 'alex.vieira.123@hotmail.com',
      amount: 20,
    });

    expect(payload).toContain('000201');
    expect(payload).toContain('br.gov.bcb.pix');
    expect(payload).toContain('alex.vieira.123@hotmail.com');
    expect(payload).toContain('5303986');
    expect(payload).toContain('540520.00');
    expect(payload).toContain('5802BR');
    expect(payload).toContain('6304');
    // Check that the last 4 characters are hex CRC
    const crc = payload.slice(-4);
    expect(crc).toMatch(/^[0-9A-F]{4}$/);
  });

  it('generates a payload without amount when amount is zero or undefined', () => {
    const payload = generatePixPayload({
      pixKey: 'alex.vieira.123@hotmail.com',
    });

    expect(payload).not.toContain('5405');
    expect(payload.slice(-4)).toMatch(/^[0-9A-F]{4}$/);
  });
});
