import { describe, expect, it } from 'vitest';
import { resolveMascotMood, type MascotMoodInput } from './mascot-mood';

function input(overrides: Partial<MascotMoodInput> = {}): MascotMoodInput {
  return {
    count: 3,
    balance: 500000,
    income: 1000000,
    expense: 500000,
    budgetPercent: 40,
    savingsAchieved: 0,
    ...overrides,
  };
}

describe('resolveMascotMood', () => {
  it('memakai netral saat data masih dimuat', () => {
    expect(resolveMascotMood(input({ loading: true, count: 0 })).mood).toBe('netral');
  });

  it('mengantuk saat belum ada transaksi', () => {
    const result = resolveMascotMood(input({ count: 0, balance: 0, income: 0, expense: 0 }));
    expect(result.mood).toBe('sleepy');
    expect(result.speech).toContain('Belum ada catatan');
  });

  it('marah saat saldo minus meski target tabungan tercapai', () => {
    const result = resolveMascotMood(input({ balance: -100000, savingsAchieved: 2 }));
    expect(result.mood).toBe('angry');
  });

  it('marah saat anggaran tembus 100%', () => {
    expect(resolveMascotMood(input({ budgetPercent: 100 })).mood).toBe('angry');
    expect(resolveMascotMood(input({ budgetPercent: 140 })).mood).toBe('angry');
  });

  it('khawatir saat anggaran 80-99%', () => {
    expect(resolveMascotMood(input({ budgetPercent: 80 })).mood).toBe('worried');
    expect(resolveMascotMood(input({ budgetPercent: 99 })).mood).toBe('worried');
  });

  it('khawatir saat ada pengeluaran tetapi belum ada pemasukan', () => {
    expect(resolveMascotMood(input({ income: 0, balance: 0 })).mood).toBe('worried');
  });

  it('bersorak saat target tabungan tercapai dan kondisi aman', () => {
    const result = resolveMascotMood(input({ savingsAchieved: 1 }));
    expect(result.mood).toBe('cheering');
    expect(result.speech).toContain('Target tabungan');
  });

  it('senang saat rajin mencatat dan saldo positif', () => {
    const result = resolveMascotMood(input({ count: 8 }));
    expect(result.mood).toBe('happy');
    expect(result.speech).toContain('Rajin');
  });

  it('senang biasa pada kondisi aman lainnya', () => {
    const result = resolveMascotMood(input());
    expect(result.mood).toBe('happy');
    expect(result.speech).toContain('Cuan aman');
  });
});
