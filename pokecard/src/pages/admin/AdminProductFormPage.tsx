import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { ArrowLeft, Plus, X, Save, Upload, Link } from 'lucide-react';
import styles from './AdminProductFormPage.module.css';

interface Variant {
  id?: string;
  name: string;
  language: string;
  edition: string;
  priceCents: number;
  stock: number;
  sku: string;
  isActive: boolean;
}

interface Image {
  id?: string;
  url: string;
  altText: string;
  position: number;
  isUploading?: boolean;
}

export function AdminProductFormPage() {
  const { productId } = useParams();
  const isEditing = !!productId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: '',
    description: '',
  });

  const [variants, setVariants] = useState<Variant[]>([
    {
      name: '',
      language: '',
      edition: '',
      priceCents: 0,
      stock: 0,
      sku: '',
      isActive: true,
    },
  ]);

  const [images, setImages] = useState<Image[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    if (isEditing) {
      loadProduct();
    }
  }, [user, authLoading, productId]);

  async function loadProduct() {
    if (!token || !productId) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      const product = data.products.find((p: any) => p.id === productId);

      if (!product) {
        navigate('/admin/products');
        return;
      }

      setFormData({
        name: product.name,
        slug: product.slug,
        category: product.category,
        description: product.description || '',
      });

      setVariants(product.variants || []);
      setImages(product.images || [{ url: '', altText: '', position: 0 }]);
    } catch (err: Error) {
      console.error('Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  }

  function addVariant() {
    setVariants([
      ...variants,
      {
        name: '',
        language: '',
        edition: '',
        priceCents: 0,
        stock: 0,
        sku: '',
        isActive: true,
      },
    ]);
  }

  function removeVariant(index: number) {
    setVariants(variants.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, field: keyof Variant, value: any) {
    setVariants(variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  }

  function addImage() {
    setImages([...images, { url: '', altText: '', position: images.length }]);
  }

  function removeImage(index: number) {
    setImages(images.filter((_, i) => i !== index));
  }

  function updateImage(index: number, field: keyof Image, value: string) {
    setImages(
      images.map((img, i) =>
        i === index ? { ...img, [field]: field === 'position' ? parseInt(value) || 0 : value } : img
      )
    );
  }

  // Upload d'images
  async function uploadImages(files: FileList | File[]) {
    if (!token) return;

    setUploadError(null);
    const fileArray = Array.from(files);

    // Vérifier les types de fichiers (par extension ET type MIME)
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    const invalidFiles = fileArray.filter((f) => {
      const ext = f.name.toLowerCase().substring(f.name.lastIndexOf('.'));
      const isValidExt = allowedExtensions.includes(ext);
      const isValidType = allowedTypes.includes(f.type) || f.type.startsWith('image/');
      return !isValidExt && !isValidType;
    });

    if (invalidFiles.length > 0) {
      setUploadError(
        `Fichiers non supportés: ${invalidFiles.map((f) => f.name).join(', ')}. Utilisez JPG, PNG, GIF ou WebP.`
      );
      return;
    }

    // Ajouter des placeholders pour les images en cours d'upload
    const placeholders = fileArray.map((_, i) => ({
      url: '',
      altText: '',
      position: images.length + i,
      isUploading: true,
    }));
    setImages([...images, ...placeholders]);

    try {
      const formData = new FormData();
      fileArray.forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch(`${API_BASE}/admin/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'upload");
      }

      const data = await response.json();

      // Remplacer les placeholders par les vraies images
      setImages((prev) => {
        const withoutPlaceholders = prev.filter((img) => !img.isUploading);
        const newImages = data.images.map((img: any, i: number) => ({
          url: img.url,
          altText: '',
          position: withoutPlaceholders.length + i,
        }));
        return [...withoutPlaceholders, ...newImages];
      });
    } catch (err: Error) {
      console.error('Upload error:', err);
      setUploadError(err.message);
      // Retirer les placeholders en cas d'erreur
      setImages((prev) => prev.filter((img) => !img.isUploading));
    }
  }

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        uploadImages(files);
      }
    },
    [token, images]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadImages(files);
    }
    // Reset input pour permettre de resélectionner le même fichier
    e.target.value = '';
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...formData,
        variants: variants.filter((v) => v.name && v.priceCents > 0),
        images: images.filter((img) => img.url),
      };

      const url = isEditing
        ? `${API_BASE}/admin/products/${productId}`
        : `${API_BASE}/admin/products`;

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      navigate('/admin/products');
    } catch (err: Error) {
      console.error('Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || (isEditing && loading)) {
    return (
      <AdminLayout>
        <div className={styles.loading}>Chargement...</div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) return null;

  return (
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => navigate('/admin/products')} className={styles.backButton}>
            <ArrowLeft size={20} />
            Retour
          </button>
          <h1>{isEditing ? 'Modifier le produit' : 'Nouveau produit'}</h1>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Informations de base */}
          <div className={styles.section}>
            <h2>Informations de base</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Nom du produit *</label>
                <input type="text" value={formData.name} onChange={handleNameChange} required />
              </div>
              <div className={styles.formGroup}>
                <label>Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                  placeholder="nom-du-produit"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Catégorie *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">Sélectionner...</option>
                  <option value="Pokémon">Pokémon</option>
                  <option value="One Piece">One Piece</option>
                  <option value="Accessoires">Accessoires</option>
                  <option value="Protections">Protections</option>
                </select>
              </div>
              <div className={styles.formGroupFull}>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Images</h2>
              <div className={styles.imageModeToggle}>
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`${styles.modeButton} ${imageMode === 'upload' ? styles.active : ''}`}
                >
                  <Upload size={16} />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`${styles.modeButton} ${imageMode === 'url' ? styles.active : ''}`}
                >
                  <Link size={16} />
                  URL
                </button>
              </div>
            </div>

            {uploadError && <div className={styles.uploadError}>{uploadError}</div>}

            {imageMode === 'upload' ? (
              <>
                {/* Zone de drop */}
                <div
                  className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handleFileSelect}
                    className={styles.hiddenInput}
                  />
                  <Upload size={48} className={styles.dropIcon} />
                  <p className={styles.dropText}>Glissez-déposez vos images ici</p>
                  <p className={styles.dropSubtext}>
                    ou cliquez pour parcourir (JPG, PNG, GIF, WebP - 5Mo max)
                  </p>
                </div>

                {/* Aperçu des images */}
                {images.length > 0 && (
                  <div className={styles.imagePreviewGrid}>
                    {images.map((image, index) => (
                      <div key={index} className={styles.imagePreviewCard}>
                        {image.isUploading ? (
                          <div className={styles.uploadingPlaceholder}>
                            <div className={styles.spinner}></div>
                            <span>Upload...</span>
                          </div>
                        ) : (
                          <>
                            <img
                              src={
                                image.url.startsWith('/')
                                  ? `http://localhost:8080${image.url}`
                                  : image.url
                              }
                              alt={image.altText || `Image ${index + 1}`}
                              className={styles.previewImage}
                            />
                            <div className={styles.imageOverlay}>
                              <input
                                type="text"
                                value={image.altText}
                                onChange={(e) => updateImage(index, 'altText', e.target.value)}
                                placeholder="Texte alternatif"
                                className={styles.altTextInput}
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className={styles.removeImageButton}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Mode URL */}
                <button type="button" onClick={addImage} className={styles.addButton}>
                  <Plus size={16} />
                  Ajouter une image par URL
                </button>
                {images.map((image, index) => (
                  <div key={index} className={styles.imageRow}>
                    <div className={styles.formGroup}>
                      <label>URL de l'image</label>
                      <input
                        type="url"
                        value={image.url}
                        onChange={(e) => updateImage(index, 'url', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Texte alternatif</label>
                      <input
                        type="text"
                        value={image.altText}
                        onChange={(e) => updateImage(index, 'altText', e.target.value)}
                      />
                    </div>
                    {image.url && (
                      <img src={image.url} alt="Aperçu" className={styles.urlPreview} />
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className={styles.removeButton}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Variantes */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Variantes</h2>
              <button type="button" onClick={addVariant} className={styles.addButton}>
                <Plus size={16} />
                Ajouter une variante
              </button>
            </div>
            {variants.map((variant, index) => (
              <div key={index} className={styles.variantCard}>
                <div className={styles.variantHeader}>
                  <h3>Variante {index + 1}</h3>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className={styles.removeButton}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Nom *</label>
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => updateVariant(index, 'name', e.target.value)}
                      required
                      placeholder="Français"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Langue</label>
                    <input
                      type="text"
                      value={variant.language}
                      onChange={(e) => updateVariant(index, 'language', e.target.value)}
                      placeholder="Français"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Édition</label>
                    <input
                      type="text"
                      value={variant.edition}
                      onChange={(e) => updateVariant(index, 'edition', e.target.value)}
                      placeholder="1ère édition"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Prix (centimes) *</label>
                    <input
                      type="number"
                      value={variant.priceCents}
                      onChange={(e) =>
                        updateVariant(index, 'priceCents', parseInt(e.target.value) || 0)
                      }
                      required
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Stock *</label>
                    <input
                      type="number"
                      value={variant.stock}
                      onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value) || 0)}
                      required
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>SKU</label>
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>
                    <input
                      type="checkbox"
                      checked={variant.isActive}
                      onChange={(e) => updateVariant(index, 'isActive', e.target.checked)}
                    />
                    Actif
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className={styles.cancelButton}
            >
              Annuler
            </button>
            <button type="submit" disabled={loading} className={styles.submitButton}>
              <Save size={16} />
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
