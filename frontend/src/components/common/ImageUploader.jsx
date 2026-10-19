import React, { useState, useRef } from 'react';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImageUploader({
  _selectedImage,
  previewUrl,
  onImageSelected,
  onImageRemoved,
  sampleImageUrl = null,
  sampleLabel = 'Load Demo Image',
  label = 'Upload food image',
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

  const validateAndProcessFile = (file) => {
    setErrorMessage(null);

    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorMessage('Unsupported format. Please select a JPEG, PNG, or WEBP image.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is 10MB.`);
      return;
    }

    const preview = URL.createObjectURL(file);
    onImageSelected(file, preview);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    validateAndProcessFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    validateAndProcessFile(file);
  };

  const handleLoadSample = (e) => {
    e.stopPropagation();
    if (sampleImageUrl) {
      setErrorMessage(null);
      onImageSelected(null, sampleImageUrl);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrorMessage(null);
    onImageRemoved();
  };

  return (
    <div style={{ width: '100%' }}>
      {previewUrl ? (
        <div style={{ textAlign: 'center' }}>
          <div className="preview-wrapper">
            <img src={previewUrl} alt="Selected food preview" className="preview-image" />
            <button
              type="button"
              className="preview-remove-btn"
              onClick={handleRemove}
              title="Remove image"
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
          <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              🔄 Change Photo
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleRemove}
            >
              🗑️ Clear
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`upload-container ${isDragOver ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label={label}
        >
          <div className="upload-icon-circle" aria-hidden="true">
            📷
          </div>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            Drop meal photo here, or <span style={{ color: 'var(--green-primary)', textDecoration: 'underline' }}>browse</span>
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Supports JPEG, PNG, or WEBP (up to 10 MB). Images are sanitized before AI vision inference.
          </p>

          {sampleImageUrl && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleLoadSample}
            >
              💡 {sampleLabel}
            </button>
          )}
        </div>
      )}

      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Error alert if validation failed */}
      {errorMessage && (
        <div className="alert-component error" style={{ marginTop: '0.85rem' }} role="alert">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
