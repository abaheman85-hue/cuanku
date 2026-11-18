import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ExternalLink,
  Gift,
  Info,
  Pencil,
  Plus,
  ShoppingBag,
  Timer,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { WishlistItem } from '../db/types';
import {
  deleteWishlistItem,
  getWishlistTotals,
  listWishlist,
  setWishlistPurchased,
  setWishlistPlan,
  setWishlistSaved,
} from '../db/repositories';
import { dateLabel, toDateKey } from '../lib/dates';
import {
  formatCompactRupiah,
  formatMoneyInput,
  formatRupiah,
  parseMoneyInput,
} from '../lib/money';
import {
  getSavingEstimate,
  getWaitInfo,
  isTargetReached,
  progressPercent,
  type WishlistStatus,
} from '../lib/wishlist';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useFeedback } from '../context/Feedback';
import { Button, IconButton } from '../components/ui/Button';
import { Badge, Card, Chip } from '../components/ui/Card';
import { Field, MoneyInput, SegmentedControl } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { ProgressBar } from '../components/ProgressBar';
import { WishlistForm } from '../components/WishlistForm';
import { SavingsSection } from '../components/SavingsSection';
import { EmptyState, ErrorState, InlineEmpty, LoadingState } from '../components/States';
import { Mascot } from '../components/Mascot';

const EMPTY_TOTALS = { target: 0, saved: 0, remaining: 0, activeCount: 0, purchasedCount: 0 };
const QUICK_FUNDS = [50000, 100000, 250000, 500000];

function statusInfo(item: WishlistItem, now: Date): { status: WishlistStatus; label: string } {
  if (item.purchased === 1) return { status: 'purchased', label: 'Sudah dibeli' };
  const wait = getWaitInfo(item.created_at, now);
  if (wait.waiting) {
    return { status: 'waiting', label: `${wait.remainingDays} hari lagi` };
  }
  return { status: 'ready', label: 'Siap dibeli' };
}

function estimateText(item: WishlistItem, now: Date): string {
  const estimate = getSavingEstimate(item.price, item.saved_amount, item.monthly_plan, now);
  if (estimate.kind === 'done') return 'Dana sudah terkumpul. Tinggal putuskan mau beli atau tidak.';
  if (estimate.kind === 'no-plan') {
    return `Sisa ${formatRupiah(estimate.remaining)}. Atur rencana bulanan untuk melihat perkiraan.`;
  }
  return `Rencana ${formatCompactRupiah(item.monthly_plan)}/bulan • sekitar ${estimate.months} bulan lagi (${estimate.targetLabel}).`;
}

function WishlistCard({
  item,
  now,
  onOpen,
  onBuy,
  onEdit,
  onDelete,
}: {
  item: WishlistItem;
  now: Date;
  onOpen: () => void;
  onBuy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const percent = progressPercent(item.price, item.saved_amount);
  const { status, label } = statusInfo(item, now);
  const done = isTargetReached(item.price, item.saved_amount);
  const tone = status === 'purchased' ? 'lime' : status === 'ready' ? 'mint' : 'yellow';

  return (
    <article className={`wish-card ${status === 'purchased' ? 'wish-card--purchased' : ''}`.trim()}>
      <div className="wish-card__media">
        {item.image ? (
          <img src={item.image} alt={`Foto ${item.name}`} loading="lazy" />
        ) : (
          <span className="wish-card__placeholder" aria-hidden="true">
            <Gift />
          </span>
        )}
        <div className="wish-card__badges">
          <Badge tone={tone}>
            {status === 'waiting' ? <Timer size={12} aria-hidden="true" /> : null}
            {status === 'ready' ? <ShoppingBag size={12} aria-hidden="true" /> : null}
            {label}
          </Badge>
        </div>
      </div>

      <div className="wish-card__body">
        <h3 className="wish-card__title">{item.name}</h3>
        <div className="row row--between row--wrap">
          <span className="wish-card__price">{formatRupiah(item.price)}</span>
          {item.link ? (
            <a
              className="wish-card__link"
              href={item.link}
              target="_blank"
              rel="noreferrer noopener"
            >
              Toko <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : null}
        </div>

        <div className="progress">
          <ProgressBar
            percent={percent}
            done={done}
            label={`Kemajuan tabungan ${item.name}`}
          />
          <div className="progress__meta">
            <span>
              <strong>{formatRupiah(item.saved_amount)}</strong> terkumpul
            </span>
            <span>{Math.round(percent)}%</span>
          </div>
        </div>

        <p className="wish-card__estimate">
          {status === 'purchased'
            ? item.purchased_at
              ? `Dibeli ${dateLabel(item.purchased_at.slice(0, 10))}.`
              : 'Sudah ditandai dibeli.'
            : estimateText(item, now)}
        </p>

        <div className="wish-card__actions">
          <Button
            size="sm"
            variant={status === 'ready' ? 'lime' : 'paper'}
            icon={status === 'ready' ? <ShoppingBag /> : <Info />}
            onClick={status === 'ready' ? onBuy : onOpen}
          >
            {status === 'ready' ? 'Beli sekarang' : 'Lihat detail'}
          </Button>
          {status !== 'purchased' ? (
            <>
              <IconButton label={`Ubah ${item.name}`} size="sm" onClick={onEdit}>
                <Pencil />
              </IconButton>
              <IconButton
                label={`Hapus ${item.name}`}
                size="sm"
                variant="pink"
                onClick={onDelete}
              >
                <Trash2 />
              </IconButton>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function WishlistPage() {
  const { confirm, toast } = useFeedback();
  const [searchParams, setSearchParams] = useSearchParams();
  const [now, setNow] = useState(() => new Date());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [editing, setEditing] = useState<WishlistItem | null>(null);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const addRequested = searchParams.get('tambah') === '1';
  const formOpen = manualFormOpen || addRequested;
  const tab = searchParams.get('tab') === 'tabungan' ? 'tabungan' : 'wishlist';

  const switchTab = (value: 'wishlist' | 'tabungan') => {
    const next = new URLSearchParams(searchParams);
    if (value === 'tabungan') next.set('tab', 'tabungan');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  };

  const [fundsText, setFundsText] = useState('');
  const [planText, setPlanText] = useState('');
  const [fundBusy, setFundBusy] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);

  const wishlistQuery = useLiveQuery(() => listWishlist(), [], []);
  const totalsQuery = useLiveQuery(() => getWishlistTotals(), [], EMPTY_TOTALS);

  const items = wishlistQuery.data;
  const totals = totalsQuery.data;
  const detail = useMemo(
    () => items.find((item) => item.id === detailId) ?? null,
    [items, detailId],
  );

  const active = items.filter((item) => item.purchased === 0);
  const purchased = items.filter((item) => item.purchased === 1);
  const percent = progressPercent(totals.target, totals.saved);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setManualFormOpen(true);
  };

  const openDetail = (item: WishlistItem) => {
    setDetailId(item.id ?? null);
    setFundsText(formatMoneyInput(String(item.saved_amount)));
    setPlanText(item.monthly_plan ? formatMoneyInput(String(item.monthly_plan)) : '');
  };

  const openEdit = (item: WishlistItem) => {
    setDetailId(null);
    setEditing(item);
    setManualFormOpen(true);
  };

  const closeForm = () => {
    setManualFormOpen(false);
    setEditing(null);
    if (addRequested) {
      const next = new URLSearchParams(searchParams);
      next.delete('tambah');
      setSearchParams(next, { replace: true });
    }
  };

  const handleDelete = async (item: WishlistItem) => {
    if (!item.id) return;
    const ok = await confirm({
      title: `Hapus "${item.name}"?`,
      message: 'Item wishlist beserta dana tabungannya akan dihapus permanen.',
      confirmLabel: 'Hapus wishlist',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteWishlistItem(undefined, item.id);
      if (detailId === item.id) setDetailId(null);
      toast('Wishlist dihapus.');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal menghapus wishlist.', 'error');
    }
  };

  const markPurchased = async (item: WishlistItem, value: boolean) => {
    if (!item.id) return;
    try {
      await setWishlistPurchased(undefined, item.id, value);
      if (value) {
        setDetailId(null);
        setCelebrating(item.name);
      } else {
        toast('Wishlist dikembalikan ke daftar aktif.');
      }
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal memperbarui wishlist.', 'error');
    }
  };

  const attemptPurchase = async (item: WishlistItem) => {
    const wait = getWaitInfo(item.created_at, now);
    const remaining = Math.max(0, item.price - item.saved_amount);
    const messages: string[] = [];
    if (wait.waiting) {
      messages.push(`Masa tunggu masih ${wait.remainingDays} hari lagi.`);
    }
    if (remaining > 0) {
      messages.push(`Dana baru terkumpul ${formatRupiah(item.saved_amount)} dari ${formatRupiah(item.price)}.`);
    }
    const ok = await confirm({
      title: 'Yakin mau beli sekarang?',
      message:
        messages.length > 0
          ? `${messages.join(' ')} Keputusan tetap ada di tanganmu.`
          : `Dana untuk "${item.name}" sudah cukup dan masa tunggu selesai.`,
      confirmLabel: 'Ya, beli sekarang',
      cancelLabel: 'Belum',
    });
    if (!ok) return;
    await markPurchased(item, true);
  };

  const saveFunds = async () => {
    if (!detail?.id) return;
    setFundBusy(true);
    const amount = parseMoneyInput(fundsText);
    try {
      await setWishlistSaved(undefined, detail.id, amount);
      setFundsText(formatMoneyInput(String(amount)));
      toast('Dana wishlist diperbarui.');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal menyimpan dana.', 'error');
    } finally {
      setFundBusy(false);
    }
  };

  const savePlan = async () => {
    if (!detail?.id) return;
    setPlanBusy(true);
    const amount = parseMoneyInput(planText);
    try {
      await setWishlistPlan(undefined, detail.id, amount);
      setPlanText(amount ? formatMoneyInput(String(amount)) : '');
      toast('Rencana tabungan diperbarui.');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal menyimpan rencana.', 'error');
    } finally {
      setPlanBusy(false);
    }
  };

  const bumpFunds = (amount: number) => {
    setFundsText(formatMoneyInput(String(parseMoneyInput(fundsText) + amount)));
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <Gift aria-hidden="true" /> Wishlist
          </span>
          <h1 className="page-title">
            {tab === 'wishlist'
              ? 'Barang impian, disiapkan pelan-pelan'
              : 'Tabungan target, diraih pelan-pelan'}
          </h1>
          <p className="page-subtitle">
            {tab === 'wishlist'
              ? 'Simpan target, catat dana yang kamu sisihkan, dan beri jeda 7 hari sebelum membeli.'
              : 'Sisihkan dana untuk tujuan tertentu. Setelah tercapai, ambil reward me time sekali.'}
          </p>
        </div>
        <div className="page-actions">
          {tab === 'wishlist' ? (
            <Button variant="primary" icon={<Plus />} onClick={openCreate}>
              Tambah wishlist
            </Button>
          ) : null}
        </div>
      </header>

      <div className="wishlist-tabs">
        <SegmentedControl
          value={tab}
          onChange={switchTab}
          options={[
            { value: 'wishlist', label: 'Wishlist' },
            { value: 'tabungan', label: 'Tabungan' },
          ]}
          label="Pilih daftar"
        />
      </div>

      {tab === 'tabungan' ? (
        <SavingsSection />
      ) : (
        <>
          {wishlistQuery.error || totalsQuery.error ? (
            <ErrorState message={wishlistQuery.error ?? totalsQuery.error ?? 'Gagal memuat wishlist.'} />
          ) : null}

          <div className="stack">
            <Card className="wishlist-summary">
              <div>
                <span className="eyebrow">
                  <Wallet aria-hidden="true" /> Ringkasan wishlist
                </span>
                <p className="hero__balance" style={{ marginTop: 6 }}>
                  {formatRupiah(totals.remaining)}
                </p>
                <p className="small muted">Sisa dana yang perlu disiapkan untuk semua wishlist aktif.</p>
                <div className="row row--wrap" style={{ marginTop: 10 }}>
                  <Chip tone="paper">{totals.activeCount} aktif</Chip>
                  <Chip tone="lime">{totals.purchasedCount} sudah dibeli</Chip>
                </div>
              </div>
              <div className="stack stack--sm">
                <div className="wishlist-summary__numbers">
                  <div className="wishlist-summary__item">
                    <span>Target</span>
                    <strong>{formatRupiah(totals.target)}</strong>
                  </div>
                  <div className="wishlist-summary__item">
                    <span>Terkumpul</span>
                    <strong>{formatRupiah(totals.saved)}</strong>
                  </div>
                </div>
                <ProgressBar percent={percent} label="Kemajuan total wishlist" />
                <p className="tiny">
                  {Math.round(percent)}% terkumpul • Dana wishlist tidak mengurangi saldo transaksi.
                </p>
              </div>
            </Card>

            {wishlistQuery.loading ? (
              <Card>
                <LoadingState label="Memuat wishlist..." />
              </Card>
            ) : items.length === 0 ? (
              <EmptyState
                title="Wishlist masih kosong"
                message="Tulis barang yang kamu inginkan. Masa tunggu 7 hari membantu menahan pembelian impulsif."
                actionLabel="Tambah wishlist pertama"
                onAction={openCreate}
              />
            ) : (
              <>
                <div>
                  <div className="wishlist-section-head">
                    <h2>Sedang disiapkan</h2>
                    <span className="small muted">{active.length} barang</span>
                  </div>
                  {active.length === 0 ? (
                    <Card dashed>
                      <InlineEmpty>
                        Semua wishlist sudah dibeli. Tambahkan barang baru kapan saja.
                      </InlineEmpty>
                    </Card>
                  ) : (
                    <div className="wishlist-grid">
                      {active.map((item) => (
                        <WishlistCard
                          key={item.id}
                          item={item}
                          now={now}
                          onOpen={() => openDetail(item)}
                          onBuy={() => void attemptPurchase(item)}
                          onEdit={() => openEdit(item)}
                          onDelete={() => void handleDelete(item)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {purchased.length > 0 ? (
                  <div>
                    <div className="wishlist-section-head">
                      <h2>Sudah dibeli</h2>
                      <span className="small muted">{purchased.length} barang</span>
                    </div>
                    <div className="wishlist-grid">
                      {purchased.map((item) => (
                        <WishlistCard
                          key={item.id}
                          item={item}
                          now={now}
                          onOpen={() => openDetail(item)}
                          onBuy={() => void attemptPurchase(item)}
                          onEdit={() => openEdit(item)}
                          onDelete={() => void handleDelete(item)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <Button
            className="fab"
            variant="primary"
            aria-label="Tambah wishlist baru"
            onClick={openCreate}
          >
            <Plus aria-hidden="true" />
          </Button>

          <WishlistForm open={formOpen} onClose={closeForm} item={editing} />

          <Modal
            open={detail !== null}
            onClose={() => setDetailId(null)}
            title={detail?.name}
            subtitle={
              detail
                ? `${formatRupiah(detail.price)} • ${statusInfo(detail, now).label}`
                : undefined
            }
            footer={
              detail ? (
                detail.purchased === 1 ? (
                  <>
                    <Button onClick={() => setDetailId(null)}>Tutup</Button>
                    <Button
                      variant="primary"
                      onClick={() => void markPurchased(detail, false)}
                    >
                      Batalkan status dibeli
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      icon={<Pencil />}
                      onClick={() => {
                        openEdit(detail);
                      }}
                    >
                      Ubah
                    </Button>
                    <Button
                      variant="primary"
                      icon={<ShoppingBag />}
                      onClick={() => void attemptPurchase(detail)}
                    >
                      Beli sekarang
                    </Button>
                  </>
                )
              ) : null
            }
          >
            {detail ? (
              <div className="wish-detail">
                <div className="wish-detail__media">
                  {detail.image ? (
                    <img src={detail.image} alt={`Foto ${detail.name}`} />
                  ) : (
                    <span className="wish-card__placeholder" aria-hidden="true">
                      <Gift />
                    </span>
                  )}
                </div>

                <div className="row row--wrap">
                  <Badge tone={statusInfo(detail, now).status === 'ready' ? 'mint' : 'yellow'}>
                    {statusInfo(detail, now).label}
                  </Badge>
                  {detail.link ? (
                    <a
                      className="wish-card__link"
                      href={detail.link}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Buka toko <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 />}
                    onClick={() => void handleDelete(detail)}
                  >
                    Hapus
                  </Button>
                </div>

                <div className="wish-detail__prices">
                  <div className="wish-detail__price-box">
                    <span>Harga</span>
                    <strong>{formatRupiah(detail.price)}</strong>
                  </div>
                  <div className="wish-detail__price-box">
                    <span>Terkumpul</span>
                    <strong>{formatRupiah(detail.saved_amount)}</strong>
                  </div>
                  <div className="wish-detail__price-box">
                    <span>Sisa</span>
                    <strong>{formatRupiah(Math.max(0, detail.price - detail.saved_amount))}</strong>
                  </div>
                  <div className="wish-detail__price-box">
                    <span>Rencana / bulan</span>
                    <strong>{formatRupiah(detail.monthly_plan)}</strong>
                  </div>
                </div>

                <ProgressBar
                  percent={progressPercent(detail.price, detail.saved_amount)}
                  done={isTargetReached(detail.price, detail.saved_amount)}
                  label={`Kemajuan tabungan ${detail.name}`}
                />

                {detail.purchased === 1 ? (
                  <p className="small muted">
                    {detail.purchased_at
                      ? `Ditandai dibeli pada ${dateLabel(detail.purchased_at.slice(0, 10))}.`
                      : 'Item ini sudah ditandai dibeli.'}
                  </p>
                ) : (
                  <div className="notice">
                    <Timer aria-hidden="true" />
                    <span>
                      {getWaitInfo(detail.created_at, now).waiting
                        ? `Masa tunggu 7 hari: siap dibeli sekitar ${dateLabel(
                            toDateKey(getWaitInfo(detail.created_at, now).readyAt),
                          )}. Kamu tetap boleh membeli lebih awal, tetapi akan ada konfirmasi tambahan.`
                        : 'Masa tunggu sudah selesai. Ambil keputusan dengan tenang sebelum membeli.'}
                    </span>
                  </div>
                )}

                <p className="small muted">{estimateText(detail, now)}</p>

                {detail.note ? (
                  <div>
                    <span className="field__label">Catatan</span>
                    <p className="small">{detail.note}</p>
                  </div>
                ) : null}

                {detail.purchased === 0 ? (
                  <>
                    <div className="stack stack--sm">
                      <Field
                        label="Dana terkumpul"
                        htmlFor="wishlist-funds"
                        hint="Ubah manual sesuai dana yang benar-benar kamu sisihkan."
                      >
                        <MoneyInput
                          id="wishlist-funds"
                          value={fundsText}
                          onValueChange={setFundsText}
                        />
                        <div className="quick-amounts">
                          {QUICK_FUNDS.map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              className="chip"
                              onClick={() => bumpFunds(amount)}
                            >
                              +{formatCompactRupiah(amount)}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Button
                        variant="mint"
                        size="sm"
                        icon={<Wallet />}
                        onClick={() => void saveFunds()}
                        disabled={fundBusy}
                      >
                        {fundBusy ? 'Menyimpan...' : 'Simpan dana'}
                      </Button>
                    </div>

                    <div className="stack stack--sm">
                      <Field
                        label="Rencana tabungan per bulan"
                        htmlFor="wishlist-plan-detail"
                        hint="Dipakai untuk memperkirakan kapan target tercapai."
                      >
                        <MoneyInput
                          id="wishlist-plan-detail"
                          value={planText}
                          onValueChange={setPlanText}
                        />
                      </Field>
                      <Button
                        size="sm"
                        onClick={() => void savePlan()}
                        disabled={planBusy}
                      >
                        {planBusy ? 'Menyimpan...' : 'Simpan rencana'}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </Modal>

          <Modal
            open={celebrating !== null}
            onClose={() => setCelebrating(null)}
            size="sm"
            footer={
              <Button variant="primary" block onClick={() => setCelebrating(null)}>
                Mantap
              </Button>
            }
          >
            <div className="confetti" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="celebrate">
              <Mascot className="celebrate__mascot" decorative />
              <h2>Selamat!</h2>
              <p>
                <strong>{celebrating}</strong> sudah pindah ke bagian &ldquo;Sudah dibeli&rdquo;.
                Semoga bermanfaat, ya!
              </p>
              <p className="tiny muted">
                Dana wishlist tetap terpisah dan tidak mengubah saldo transaksi.
              </p>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
