import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, Link2, Trash2 } from 'lucide-react';
import type { WishlistItem } from '../db/types';
import { createWishlistItem, updateWishlistItem } from '../db/repositories';
import { compressImageFile } from '../lib/images';
import { formatMoneyInput, parseMoneyInput } from '../lib/money';
import { useFeedback } from '../context/Feedback';
import { CuanMark } from './Mascot';
import { Button, IconButton } from './ui/Button';
import { Field, MoneyInput, TextArea, TextInput } from './ui/Field';
import { Modal } from './ui/Modal';

export function WishlistForm({
  open,
  onClose,
  item = null,
}: {
  open: boolean;
  onClose: () => void;
  item?: WishlistItem | null;
}) {
  if (!open) return null;
  return <WishlistDialog onClose={onClose} item={item} />;
}

function WishlistDialog({
  onClose,
  item = null,
}: {
  onClose: () => void;
  item?: WishlistItem | null;
}) {
  const { toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(item?.name ?? '');
  const [priceText, setPriceText] = useState(
    item ? formatMoneyInput(String(item.price)) : '',
  );
  const [planText, setPlanText] = useState(
    item?.monthly_plan ? formatMoneyInput(String(item.monthly_plan)) : '',
  );
  const [link, setLink] = useState(item?.link ?? '');
  const [note, setNote] = useState(item?.note ?? '');
  const [image, setImage] = useState<string | null>(item?.image ?? null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editing = item !== null;

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setCompressing(true);
    setError(null);
    try {
      const dataUrl = await compressImageFile(file);
      setImage(dataUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal memproses gambar.');
    } finally {
      setCompressing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nama barang tidak boleh kosong.');
      return;
    }
    const price = parseMoneyInput(priceText);
    if (price <= 0) {
      setError('Harga barang harus lebih dari nol.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const payload = {
        name,
        price,
        image,
        link: link.trim() ? link.trim() : null,
        note: note.trim() ? note.trim() : null,
        monthly_plan: parseMoneyInput(planText),
      };
      if (item?.id) {
        await updateWishlistItem(undefined, item.id, payload);
        toast('Wishlist diperbarui.');
      } else {
        await createWishlistItem(undefined, payload);
        toast('Wishlist ditambahkan. Masa tunggu 7 hari dimulai.');
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan wishlist.');
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Ubah wishlist' : 'Tambah wishlist'}
      subtitle={
        editing
          ? 'Perbarui detail barang impianmu.'
          : 'Tulis barang impian, atur targetnya, lalu tunggu 7 hari sebelum membeli.'
      }
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSave()}
            disabled={busy || compressing}
          >
            {busy ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Simpan wishlist'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Foto barang" hint="Opsional. Foto dikompres dan disimpan di perangkat ini.">
          <div className="image-picker">
            <div className="image-picker__preview">
              {image ? (
                <img src={image} alt={`Foto ${name || 'barang wishlist'}`} />
              ) : (
                <CuanMark />
              )}
            </div>
            <div className="image-picker__body">
              <div className="row row--wrap">
                <Button
                  size="sm"
                  icon={<ImagePlus />}
                  onClick={() => fileRef.current?.click()}
                  disabled={compressing}
                >
                  {compressing ? 'Memproses...' : image ? 'Ganti foto' : 'Pilih foto'}
                </Button>
                {image ? (
                  <IconButton
                    label="Hapus foto"
                    size="sm"
                    variant="pink"
                    onClick={() => setImage(null)}
                  >
                    <Trash2 />
                  </IconButton>
                ) : null}
              </div>
              <span>JPG, PNG, atau WEBP. Maksimal 25 MB, otomatis diperkecil.</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="file-input"
              aria-label="Pilih foto barang"
              onChange={(event) => void handleImage(event)}
            />
          </div>
        </Field>

        <Field label="Nama barang" required htmlFor="wishlist-name">
          <TextInput
            id="wishlist-name"
            value={name}
            maxLength={120}
            placeholder="Contoh: Headphone nirkabel"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field label="Harga" required htmlFor="wishlist-price">
          <MoneyInput
            id="wishlist-price"
            value={priceText}
            onValueChange={setPriceText}
            large
          />
        </Field>

        <Field
          label="Rencana tabungan per bulan"
          htmlFor="wishlist-plan"
          hint="Opsional. Dipakai untuk memperkirakan kapan target tercapai."
        >
          <MoneyInput
            id="wishlist-plan"
            value={planText}
            onValueChange={setPlanText}
            placeholder="0"
          />
        </Field>

        <Field label="Tautan toko" htmlFor="wishlist-link" hint="Opsional. Akan dibuka di tab baru.">
          <div className="input-with-icon">
            <Link2 aria-hidden="true" />
            <TextInput
              id="wishlist-link"
              type="url"
              value={link}
              maxLength={500}
              placeholder="https://..."
              onChange={(event) => setLink(event.target.value)}
            />
          </div>
        </Field>

        <Field label="Catatan" htmlFor="wishlist-note" hint="Opsional. Contoh: warna hitam, ukuran L.">
          <TextArea
            id="wishlist-note"
            value={note}
            maxLength={500}
            placeholder="Detail barang impianmu..."
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        {error ? <div className="error-box">{error}</div> : null}
      </div>
    </Modal>
  );
}
