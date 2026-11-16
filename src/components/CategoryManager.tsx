import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { TransactionType } from '../db/types';
import {
  countTransactionsByCategory,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../db/repositories';
import { CATEGORY_COLORS } from '../db/defaults';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useFeedback } from '../context/Feedback';
import { Button, IconButton } from './ui/Button';
import { Field, SegmentedControl, TextInput } from './ui/Field';
import { Modal } from './ui/Modal';

interface EditorState {
  id: number | null;
  name: string;
  color: string;
}

export function CategoryManager() {
  const { confirm, toast } = useFeedback();
  const [type, setType] = useState<TransactionType>('expense');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const categoriesQuery = useLiveQuery(() => listCategories(undefined, type), [type], []);
  const usageQuery = useLiveQuery(() => countTransactionsByCategory(), [], {});
  const categories = categoriesQuery.data;
  const usage = usageQuery.data;

  const openCreate = () => {
    setError(null);
    setEditor({ id: null, name: '', color: CATEGORY_COLORS[0] });
  };

  const handleSave = async () => {
    if (!editor) return;
    if (!editor.name.trim()) {
      setError('Nama kategori tidak boleh kosong.');
      return;
    }
    setBusy(true);
    try {
      if (editor.id === null) {
        await createCategory(undefined, {
          name: editor.name,
          type,
          color: editor.color,
        });
        toast('Kategori ditambahkan.');
      } else {
        await updateCategory(undefined, editor.id, {
          name: editor.name,
          color: editor.color,
        });
        toast('Kategori diperbarui.');
      }
      setEditor(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan kategori.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const used = usage[id] ?? 0;
    const ok = await confirm({
      title: `Hapus kategori "${name}"?`,
      message:
        used > 0
          ? `Kategori ini dipakai di ${used} transaksi. Transaksi tetap tersimpan, tetapi menjadi "Tanpa kategori".`
          : 'Kategori ini belum dipakai di transaksi mana pun.',
      confirmLabel: 'Hapus kategori',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteCategory(undefined, id);
      toast('Kategori dihapus.');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal menghapus kategori.', 'error');
    }
  };

  return (
    <div className="stack stack--sm">
      <SegmentedControl
        label="Jenis kategori"
        value={type}
        onChange={(next) => setType(next)}
        options={[
          { value: 'expense', label: 'Pengeluaran', tone: 'expense' },
          { value: 'income', label: 'Pemasukan', tone: 'income' },
        ]}
      />

      <div className="category-list">
        {categories.length === 0 ? (
          <p className="muted small">Belum ada kategori. Tambahkan satu untuk mulai merapikan catatan.</p>
        ) : (
          categories.map((category) => (
            <div className="category-row" key={category.id}>
              <span
                className="category-row__dot"
                style={{ background: category.color }}
                aria-hidden="true"
              />
              <span className="category-row__name">{category.name}</span>
              <span className="category-row__count">
                {usage[category.id ?? 0] ?? 0} transaksi
              </span>
              <IconButton
                label={`Ubah kategori ${category.name}`}
                size="sm"
                onClick={() => {
                  setError(null);
                  setEditor({
                    id: category.id ?? null,
                    name: category.name,
                    color: category.color,
                  });
                }}
              >
                <Pencil />
              </IconButton>
              <IconButton
                label={`Hapus kategori ${category.name}`}
                size="sm"
                variant="pink"
                onClick={() => void handleDelete(category.id!, category.name)}
              >
                <Trash2 />
              </IconButton>
            </div>
          ))
        )}
      </div>

      <Button variant="mint" size="sm" icon={<Plus />} onClick={openCreate}>
        Tambah kategori
      </Button>

      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.id === null ? 'Tambah kategori' : 'Ubah kategori'}
        subtitle={
          editor?.id === null
            ? `Kategori baru untuk ${type === 'income' ? 'pemasukan' : 'pengeluaran'}.`
            : 'Ubah nama atau warna kategori.'
        }
        size="sm"
        footer={
          <>
            <Button onClick={() => setEditor(null)} disabled={busy}>
              Batal
            </Button>
            <Button variant="primary" onClick={() => void handleSave()} disabled={busy}>
              {busy ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </>
        }
      >
        {editor ? (
          <div className="form-grid">
            <Field label="Nama kategori" required htmlFor="category-name">
              <TextInput
                id="category-name"
                value={editor.name}
                maxLength={40}
                autoFocus
                onChange={(event) =>
                  setEditor((current) => (current ? { ...current, name: event.target.value } : current))
                }
              />
            </Field>
            <Field label="Warna">
              <div className="color-picker">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch ${editor.color === color ? 'selected' : ''}`.trim()}
                    style={{ background: color }}
                    aria-label={`Pilih warna ${color}`}
                    aria-pressed={editor.color === color}
                    onClick={() =>
                      setEditor((current) => (current ? { ...current, color } : current))
                    }
                  />
                ))}
              </div>
            </Field>
            {error ? <div className="error-box">{error}</div> : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
