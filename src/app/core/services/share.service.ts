import { Injectable } from '@angular/core';
import { Match } from '../models/match.interface';
import data from '../../../assets/data.json';

const VERSION = 1;
const MATCH_COUNT = 104;
const FIELDS_PER_MATCH = 6;
const BITS_PER_VALUE = 5;
const NULL_SENTINEL = 31;

const SCORE_FIELDS: (keyof Match)[] = [
  'homeScore', 'awayScore',
  'extraTimeHomeScore', 'extraTimeAwayScore',
  'penaltyHomeScore', 'penaltyAwayScore'
];

@Injectable({
  providedIn: 'root'
})
export class ShareService {

  async encode(matches: Match[]): Promise<string | null> {
    try {
      const sorted = [...matches].sort((a, b) => a.id - b.id);
      const totalValues = MATCH_COUNT * FIELDS_PER_MATCH;
      const totalBits = totalValues * BITS_PER_VALUE;
      const totalBytes = Math.ceil(totalBits / 8);
      const buffer = new Uint8Array(1 + totalBytes); // 1 byte version + data

      buffer[0] = VERSION;

      let bitOffset = 0;
      for (let i = 0; i < MATCH_COUNT; i++) {
        const match = sorted[i];
        for (const field of SCORE_FIELDS) {
          const value = match[field] as number | null;
          const packed = value === null || value === undefined ? NULL_SENTINEL : value;
          this.writeBits(buffer, 8 + bitOffset, BITS_PER_VALUE, packed);
          bitOffset += BITS_PER_VALUE;
        }
      }

      const compressed = await this.gzipCompress(buffer);
      return this.toBase64Url(compressed);
    } catch {
      return null;
    }
  }

  async decode(encoded: string): Promise<Match[] | null> {
    try {
      const compressed = this.fromBase64Url(encoded);
      const buffer = await this.gzipDecompress(compressed);

      if (buffer[0] !== VERSION) return null;

      const totalValues = MATCH_COUNT * FIELDS_PER_MATCH;
      const expectedBytes = 1 + Math.ceil(totalValues * BITS_PER_VALUE / 8);
      if (buffer.length < expectedBytes) return null;

      const baseMatches: Match[] = JSON.parse(JSON.stringify(data.matches));
      const sorted = baseMatches.sort((a, b) => a.id - b.id);

      let bitOffset = 0;
      for (let i = 0; i < MATCH_COUNT; i++) {
        for (const field of SCORE_FIELDS) {
          const packed = this.readBits(buffer, 8 + bitOffset, BITS_PER_VALUE);
          (sorted[i] as any)[field] = packed === NULL_SENTINEL ? null : packed;
          bitOffset += BITS_PER_VALUE;
        }
      }

      return sorted;
    } catch {
      return null;
    }
  }

  private writeBits(buffer: Uint8Array, bitOffset: number, numBits: number, value: number): void {
    for (let i = numBits - 1; i >= 0; i--) {
      const bit = (value >> i) & 1;
      const byteIndex = Math.floor(bitOffset / 8);
      const bitIndex = 7 - (bitOffset % 8);
      if (bit) {
        buffer[byteIndex] |= (1 << bitIndex);
      }
      bitOffset++;
    }
  }

  private readBits(buffer: Uint8Array, bitOffset: number, numBits: number): number {
    let value = 0;
    for (let i = 0; i < numBits; i++) {
      const byteIndex = Math.floor(bitOffset / 8);
      const bitIndex = 7 - (bitOffset % 8);
      const bit = (buffer[byteIndex] >> bitIndex) & 1;
      value = (value << 1) | bit;
      bitOffset++;
    }
    return value;
  }

  private async gzipCompress(data: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'));
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  private async gzipDecompress(data: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'));
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  private toBase64Url(data: Uint8Array): string {
    let binary = '';
    for (const byte of data) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private fromBase64Url(str: string): Uint8Array {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
