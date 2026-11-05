/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Obfuscated creator contact/PIX key so it is never stored or rendered in plaintext
const OBFUSCATED_CREATOR_KEY = [
  97, 108, 101, 120, 46, 118, 105, 101, 105, 114, 97, 46, 49, 50, 51, 64,
  104, 111, 116, 109, 97, 105, 108, 46, 99, 111, 109,
];

export function getProtectedCreatorKey(): string {
  return String.fromCharCode(...OBFUSCATED_CREATOR_KEY);
}

export function getMaskedCreatorKey(): string {
  return 'al••••••••••@hotmail.com';
}

export function getMaskedCreatorName(): string {
  return 'Equipe MeuTreino Pro';
}
