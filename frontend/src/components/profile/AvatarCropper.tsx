import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { apiUrl } from "../../lib/auth-client";

type AvatarCropperProps = {
  onSaved: (image: string) => void;
};

async function cropToJpeg(imageSrc: string, crop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unavailable");
  }
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = url;
  });
}

export function AvatarCropper({ onSaved }: AvatarCropperProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback(async (_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
    if (!src) return;
    try {
      const next = await cropToJpeg(src, areaPixels);
      setPreview(next);
    } catch {
      setPreview(null);
    }
  }, [src]);

  function onFile(file: File | null) {
    setError(null);
    if (!file) return;
    if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
      setError("Please choose a JPEG image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSrc(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!src || !croppedArea) return;
    setBusy(true);
    setError(null);
    try {
      const image = await cropToJpeg(src, croppedArea);
      const response = await fetch(`${apiUrl}/me/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      onSaved(image);
      setSrc(null);
      setPreview(null);
    } catch {
      setError("Could not save avatar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <label className="ghost-btn file-btn">
        Choose JPEG photo
        <input
          type="file"
          accept="image/jpeg"
          className="visually-hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {src ? (
        <div className="crop-stage">
          <div className="crop-area">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          {preview ? (
            <div className="crop-preview">
              <p className="muted">Preview</p>
              <img src={preview} alt="Crop preview" />
            </div>
          ) : null}
          <label className="muted" htmlFor="zoom">
            Zoom
          </label>
          <input
            id="zoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <button className="primary-btn" type="button" disabled={busy} onClick={() => void save()}>
            Save photo
          </button>
        </div>
      ) : null}
      {error ? <p className="banner">{error}</p> : null}
    </div>
  );
}
