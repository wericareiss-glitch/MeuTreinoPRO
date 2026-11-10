/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gerador de Payload PIX (Padrão EMVCo BR Code do Banco Central do Brasil)
 */

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Cálculo de redundância cíclica CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF)
 * Exigido pelo padrão BACEN BR Code.
 */
function calculateCRC16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPayloadOptions {
  pixKey: string;
  amount?: number;
  merchantName?: string;
  merchantCity?: string;
  txid?: string;
}

/**
 * Monta o payload estático do PIX com valor customizado (PIX Copia e Cola / QR Code)
 */
export function generatePixPayload({
  pixKey,
  amount,
  merchantName = 'MEUTREINO PRO',
  merchantCity = 'SAO PAULO',
  txid = '***',
}: PixPayloadOptions): string {
  // Higienizar parâmetros de acordo com o limite de caracteres do Bacen
  const sanitizedKey = pixKey.trim();
  const sanitizedName = merchantName.trim().slice(0, 25);
  const sanitizedCity = merchantCity.trim().slice(0, 15);
  const sanitizedTxid = (txid || '***').trim().slice(0, 25);

  // 00: Formato do Payload (versão '01')
  const field00 = formatField('00', '01');

  // 26: Merchant Account Information (Arranjo de Pagamento PIX Bacen)
  const gui = formatField('00', 'br.gov.bcb.pix');
  const key = formatField('01', sanitizedKey);
  const field26 = formatField('26', `${gui}${key}`);

  // 52: Merchant Category Code (0000 para uso geral)
  const field52 = formatField('52', '0000');

  // 53: Moeda (986 para BRL Real Brasileiro)
  const field53 = formatField('53', '986');

  // 54: Valor da transação (opcional, formatado com 2 casas decimais)
  let field54 = '';
  if (typeof amount === 'number' && amount > 0 && !isNaN(amount)) {
    const formattedAmount = amount.toFixed(2);
    field54 = formatField('54', formattedAmount);
  }

  // 58: Código do País (BR)
  const field58 = formatField('58', 'BR');

  // 59: Nome do Beneficiário / Merchant
  const field59 = formatField('59', sanitizedName);

  // 60: Cidade do Beneficiário / Merchant
  const field60 = formatField('60', sanitizedCity);

  // 62: Campo adicional de dados (TxID)
  const additionalData = formatField('05', sanitizedTxid);
  const field62 = formatField('62', additionalData);

  // Concatenação de todos os blocos até o campo 63 (CRC16)
  const rawPayload = `${field00}${field26}${field52}${field53}${field54}${field58}${field59}${field60}${field62}6304`;

  // Calcula o CRC16 dos bytes anteriores
  const crc = calculateCRC16(rawPayload);

  return `${rawPayload}${crc}`;
}
