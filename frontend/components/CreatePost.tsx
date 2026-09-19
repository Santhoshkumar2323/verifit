"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

import {
  createPost,
  getApiErrorMessage,
  uploadPostImage,
  type CreatePostPayload,
} from "../lib/api";

interface CreatePostProps {
  onPublished?: () => void;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function CreatePost({ onPublished }: CreatePostProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  const [publishing, setPublishing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Prevent duplicate submissions from rapid clicks.
  const publishLock = useRef(false);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("");
    setImageFile(null);
    setImageUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setSuccess(null);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setError("Please select a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setError("Image must be 10 MB or smaller.");
      return;
    }

    setImageFile(file);
    setImageUrl("");
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePublish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (publishLock.current) {
      return;
    }

    setError(null);
    setSuccess(null);

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const trimmedCategory = category.trim();

    if (trimmedTitle.length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }

    if (trimmedContent.length < 10) {
      setError("Content must be at least 10 characters.");
      return;
    }

    // Lock synchronously before the first await.
    publishLock.current = true;
    setPublishing(true);

    try {
      let uploadedImageUrl = imageUrl;

      if (imageFile) {
        setUploadingImage(true);

        try {
          const uploadResult = await uploadPostImage(imageFile);
          uploadedImageUrl = uploadResult.url;
          setImageUrl(uploadResult.url);
        } finally {
          setUploadingImage(false);
        }
      }

      const payload: CreatePostPayload = {
        title: trimmedTitle,
        content: trimmedContent,
        category: trimmedCategory || undefined,
        image_url: uploadedImageUrl || undefined,
      };

      await createPost(payload);

      resetForm();
      setSuccess("Post published successfully.");

      onPublished?.();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setPublishing(false);
      setUploadingImage(false);
      publishLock.current = false;
    }
  };

  const isBusy = publishing || uploadingImage;

  return (
    <section className="rounded-2xl border border-[#DDE5E1] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[#182321]">
          Create a post
        </h2>

        <p className="mt-1 text-sm text-[#66736F]">
          Share a claim, insight, or health-related discussion with the
          community.
        </p>
      </div>

      <form onSubmit={handlePublish} className="space-y-4">
        <div>
          <label
            htmlFor="post-title"
            className="mb-1.5 block text-sm font-medium text-[#182321]"
          >
            Title
          </label>

          <input
            id="post-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What do you want to discuss?"
            disabled={isBusy}
            className="w-full rounded-xl border border-[#DDE5E1] bg-white px-4 py-3 text-sm text-[#182321] outline-none transition focus:border-[#227A50] focus:ring-2 focus:ring-[#227A50]/10 disabled:cursor-not-allowed disabled:bg-[#F6F8F7]"
          />
        </div>

        <div>
          <label
            htmlFor="post-content"
            className="mb-1.5 block text-sm font-medium text-[#182321]"
          >
            Content
          </label>

          <textarea
            id="post-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write your post..."
            rows={5}
            disabled={isBusy}
            className="w-full resize-none rounded-xl border border-[#DDE5E1] bg-white px-4 py-3 text-sm text-[#182321] outline-none transition focus:border-[#227A50] focus:ring-2 focus:ring-[#227A50]/10 disabled:cursor-not-allowed disabled:bg-[#F6F8F7]"
          />
        </div>

        <div>
          <label
            htmlFor="post-category"
            className="mb-1.5 block text-sm font-medium text-[#182321]"
          >
            Category
          </label>

          <input
            id="post-category"
            type="text"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="e.g. Nutrition, Fitness, Health"
            disabled={isBusy}
            className="w-full rounded-xl border border-[#DDE5E1] bg-white px-4 py-3 text-sm text-[#182321] outline-none transition focus:border-[#227A50] focus:ring-2 focus:ring-[#227A50]/10 disabled:cursor-not-allowed disabled:bg-[#F6F8F7]"
          />
        </div>

        <div>
          <label
            htmlFor="post-image"
            className="mb-1.5 block text-sm font-medium text-[#182321]"
          >
            Image
          </label>

          <input
            ref={fileInputRef}
            id="post-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            disabled={isBusy}
            className="block w-full cursor-pointer rounded-xl border border-[#DDE5E1] bg-white text-sm text-[#66736F] file:mr-4 file:border-0 file:bg-[#E7F4ED] file:px-4 file:py-3 file:font-medium file:text-[#227A50] hover:file:bg-[#DCEFE5] disabled:cursor-not-allowed disabled:opacity-60"
          />

          <p className="mt-1.5 text-xs text-[#66736F]">
            JPEG, PNG, or WebP · Maximum 10 MB
          </p>
        </div>

        {imagePreviewUrl && imageFile && (
          <div className="overflow-hidden rounded-2xl border border-[#DDE5E1] bg-[#F6F8F7]">
            <div className="relative">
              <img
                src={imagePreviewUrl}
                alt="Selected post image preview"
                className="max-h-80 w-full object-cover"
              />
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#182321]">
                  {imageFile.name}
                </p>

                <p className="text-xs text-[#66736F]">
                  {(imageFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>

              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isBusy}
                className="shrink-0 rounded-lg border border-[#DDE5E1] px-3 py-2 text-xs font-medium text-[#66736F] transition hover:border-[#C94B4B] hover:text-[#C94B4B] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {uploadingImage && (
          <div className="rounded-xl border border-[#DDE5E1] bg-[#F6F8F7] px-4 py-3 text-sm text-[#66736F]">
            Uploading image...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#E8C7C7] bg-[#FFF5F5] px-4 py-3 text-sm text-[#C94B4B]"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-[#C9E5D5] bg-[#E7F4ED] px-4 py-3 text-sm text-[#185C3B]"
          >
            {success}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={resetForm}
            disabled={isBusy}
            className="rounded-xl border border-[#DDE5E1] px-4 py-2.5 text-sm font-medium text-[#66736F] transition hover:border-[#227A50] hover:text-[#227A50] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>

          <button
            type="submit"
            disabled={isBusy}
            className="rounded-xl bg-[#227A50] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#185C3B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadingImage
              ? "Uploading..."
              : publishing
                ? "Publishing..."
                : "Publish post"}
          </button>
        </div>
      </form>
    </section>
  );
}