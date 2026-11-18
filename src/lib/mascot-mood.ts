export type MascotMood = 'netral' | 'sleepy' | 'angry' | 'worried' | 'cheering' | 'happy';

export interface MascotMoodInput {
  /** Data masih dimuat, sehingga ekspresi belum bisa diputuskan. */
  loading?: boolean;
  /** Jumlah transaksi pada bulan yang sedang dilihat. */
  count: number;
  /** Saldo bulan ini (pemasukan dikurangi pengeluaran). */
  balance: number;
  /** Total pemasukan bulan ini. */
  income: number;
  /** Total pengeluaran bulan ini. */
  expense: number;
  /** Pemakaian anggaran bulan ini dalam persen. */
  budgetPercent: number;
  /** Jumlah target tabungan yang sudah tercapai atau selesai diambil reward-nya. */
  savingsAchieved: number;
}

export interface MascotMoodResult {
  mood: MascotMood;
  /** Kalimat singkat yang tampil di balon ucapan Beranda. */
  speech: string;
  /** Label untuk pembaca layar saat maskot tidak dekoratif. */
  label: string;
}

/**
 * Menentukan ekspresi Cuan dari kondisi keuangan bulan yang sedang dilihat.
 * Urutan prioritas penting: kondisi buruk menang di atas kondisi baik.
 */
export function resolveMascotMood(input: MascotMoodInput): MascotMoodResult {
  if (input.loading) {
    return {
      mood: 'netral',
      speech: 'Menyiapkan catatan keuanganmu...',
      label: 'Maskot Cuan sedang menyiapkan catatan',
    };
  }

  if (input.count === 0) {
    return {
      mood: 'sleepy',
      speech: 'Belum ada catatan bulan ini. Yuk mulai dari pengeluaran kecil hari ini.',
      label: 'Maskot Cuan mengantuk karena belum ada catatan',
    };
  }

  if (input.balance < 0 || input.budgetPercent >= 100) {
    return {
      mood: 'angry',
      speech: 'Waduh, saldo minus atau anggaran jebol. Rem pengeluaran dulu, yuk!',
      label: 'Maskot Cuan marah karena keuangan memburuk',
    };
  }

  if (
    (input.budgetPercent >= 80 && input.budgetPercent < 100) ||
    (input.expense > 0 && input.income === 0)
  ) {
    return {
      mood: 'worried',
      speech: 'Hampir mepet ya. Coba cek anggaran sebentar.',
      label: 'Maskot Cuan khawatir karena anggaran hampir penuh',
    };
  }

  if (input.savingsAchieved > 0) {
    return {
      mood: 'cheering',
      speech: 'Target tabungan tercapai! Mantap!',
      label: 'Maskot Cuan bersorak karena target tabungan tercapai',
    };
  }

  if (input.balance > 0 && input.count >= 8) {
    return {
      mood: 'happy',
      speech: 'Rajin sekali mencatat! Cuan tetap aman dan terkendali.',
      label: 'Maskot Cuan senang karena catatan rapi',
    };
  }

  return {
    mood: 'happy',
    speech: 'Cuan aman! Sedikit lagi rapi. Terus catat supaya makin jelas.',
    label: 'Maskot Cuan tersenyum senang',
  };
}
