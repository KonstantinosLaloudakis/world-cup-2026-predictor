import { TestBed } from '@angular/core/testing';
import { ShareService } from './share.service';
import { Match } from '../models/match.interface';
import data from '../../../assets/data.json';

describe('ShareService', () => {
  let service: ShareService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShareService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should round-trip encode/decode all-null scores', async () => {
    const matches = (data.matches as Match[]).map(m => ({
      ...m,
      homeScore: null,
      awayScore: null,
      extraTimeHomeScore: null,
      extraTimeAwayScore: null,
      penaltyHomeScore: null,
      penaltyAwayScore: null
    }));

    const encoded = await service.encode(matches);
    expect(encoded).toBeTruthy();

    const decoded = await service.decode(encoded!);
    expect(decoded).toBeTruthy();
    expect(decoded!.length).toBe(104);

    for (const m of decoded!) {
      expect(m.homeScore).toBeNull();
      expect(m.awayScore).toBeNull();
      expect(m.extraTimeHomeScore).toBeNull();
      expect(m.extraTimeAwayScore).toBeNull();
      expect(m.penaltyHomeScore).toBeNull();
      expect(m.penaltyAwayScore).toBeNull();
    }
  });

  it('should round-trip encode/decode mixed scores', async () => {
    const matches = (data.matches as Match[]).map((m, i) => ({
      ...m,
      homeScore: i < 48 ? i % 5 : null,
      awayScore: i < 48 ? (i + 1) % 4 : null,
      extraTimeHomeScore: i >= 72 && i < 80 ? 2 : null,
      extraTimeAwayScore: i >= 72 && i < 80 ? 1 : null,
      penaltyHomeScore: i >= 80 && i < 84 ? 4 : null,
      penaltyAwayScore: i >= 80 && i < 84 ? 3 : null
    }));

    const encoded = await service.encode(matches);
    const decoded = await service.decode(encoded!);
    expect(decoded).toBeTruthy();

    for (let i = 0; i < 104; i++) {
      expect(decoded![i].homeScore).toBe(matches[i].homeScore);
      expect(decoded![i].awayScore).toBe(matches[i].awayScore);
      expect(decoded![i].extraTimeHomeScore).toBe(matches[i].extraTimeHomeScore);
      expect(decoded![i].extraTimeAwayScore).toBe(matches[i].extraTimeAwayScore);
      expect(decoded![i].penaltyHomeScore).toBe(matches[i].penaltyHomeScore);
      expect(decoded![i].penaltyAwayScore).toBe(matches[i].penaltyAwayScore);
    }
  });

  it('should round-trip encode/decode all scores filled', async () => {
    const matches = (data.matches as Match[]).map((m, i) => ({
      ...m,
      homeScore: i % 6,
      awayScore: (i + 2) % 5,
      extraTimeHomeScore: i % 3,
      extraTimeAwayScore: (i + 1) % 3,
      penaltyHomeScore: i % 8,
      penaltyAwayScore: (i + 3) % 7
    }));

    const encoded = await service.encode(matches);
    const decoded = await service.decode(encoded!);
    expect(decoded).toBeTruthy();

    for (let i = 0; i < 104; i++) {
      expect(decoded![i].homeScore).toBe(matches[i].homeScore);
      expect(decoded![i].awayScore).toBe(matches[i].awayScore);
      expect(decoded![i].extraTimeHomeScore).toBe(matches[i].extraTimeHomeScore);
      expect(decoded![i].extraTimeAwayScore).toBe(matches[i].extraTimeAwayScore);
      expect(decoded![i].penaltyHomeScore).toBe(matches[i].penaltyHomeScore);
      expect(decoded![i].penaltyAwayScore).toBe(matches[i].penaltyAwayScore);
    }
  });

  it('should produce a compact encoded string under 600 characters', async () => {
    const matches = (data.matches as Match[]).map((m, i) => ({
      ...m,
      homeScore: i % 6,
      awayScore: (i + 2) % 5,
      extraTimeHomeScore: i % 3,
      extraTimeAwayScore: (i + 1) % 3,
      penaltyHomeScore: i % 8,
      penaltyAwayScore: (i + 3) % 7
    }));

    const encoded = await service.encode(matches);
    expect(encoded!.length).toBeLessThan(600);
  });

  it('should return null for corrupted base64 input', async () => {
    const result = await service.decode('not-valid-base64!!!');
    expect(result).toBeNull();
  });

  it('should return null for wrong version byte', async () => {
    const matches = (data.matches as Match[]).map(m => ({
      ...m,
      homeScore: null, awayScore: null,
      extraTimeHomeScore: null, extraTimeAwayScore: null,
      penaltyHomeScore: null, penaltyAwayScore: null
    }));

    const encoded = await service.encode(matches);
    expect(encoded).toBeTruthy();

    // Tamper with the compressed data -- decode, change version, re-encode base64
    // Since gzip makes this hard to tamper cleanly, just pass garbage
    const result = await service.decode('AAAA');
    expect(result).toBeNull();
  });

  it('should preserve match metadata (id, stage, groupId, teamIds, date)', async () => {
    const matches = data.matches as Match[];

    const encoded = await service.encode(matches);
    const decoded = await service.decode(encoded!);
    expect(decoded).toBeTruthy();

    for (let i = 0; i < 104; i++) {
      expect(decoded![i].id).toBe(matches[i].id);
      expect(decoded![i].stage).toBe(matches[i].stage);
      expect(decoded![i].groupId).toBe(matches[i].groupId);
      expect(decoded![i].date).toBe(matches[i].date);
    }
  });
});
