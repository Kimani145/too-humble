import React, { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { HomeFeedPost, ContentType } from '../types';

export default function Content(): React.JSX.Element {
  const [posts, setPosts] = useState<HomeFeedPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<HomeFeedPost | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Form State
  const [contentType, setContentType] = useState<ContentType>('quote');
  const [title, setTitle] = useState<string>('');
  const [bodyText, setBodyText] = useState<string>('');
  const [authorReference, setAuthorReference] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('home_feed')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts((data ?? []) as HomeFeedPost[]);
    } catch (err) {
      console.error('Failed to fetch home feed posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = (): void => {
    setIsCreating(true);
    setSelected(null);
    setContentType('quote');
    setTitle('');
    setBodyText('');
    setAuthorReference('');
    setMediaUrl('');
    setFormError(null);
    setShowForm(true);
  };

  const handleOpenEdit = (post: HomeFeedPost): void => {
    setIsCreating(false);
    setSelected(post);
    setContentType(post.content_type);
    setTitle(post.title);
    setBodyText(post.body_text || '');
    setAuthorReference(post.author_reference || '');
    setMediaUrl(post.media_url || '');
    setFormError(null);
    setShowForm(true);
  };

  const handleCloseForm = (): void => {
    setShowForm(false);
    setSelected(null);
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        content_type: contentType,
        title: title.trim(),
        body_text: bodyText.trim() || null,
        author_reference: authorReference.trim() || 'Too Humble',
        media_url: mediaUrl.trim() || null,
      };

      if (isCreating) {
        const { error } = await supabase.from('home_feed').insert(payload);
        if (error) throw error;
      } else if (selected) {
        const { error } = await supabase
          .from('home_feed')
          .update(payload)
          .eq('id', selected.id);
        if (error) throw error;
      }

      await fetchPosts();
      handleCloseForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save post.';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('home_feed').delete().eq('id', id);
      if (error) throw error;
      setDeleteConfirm(null);
      await fetchPosts();
    } catch (err) {
      console.error('Failed to delete post:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateRelative = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays} days ago`;
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeBadge = (type: ContentType): React.JSX.Element => {
    switch (type) {
      case 'quote':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
            Quote
          </span>
        );
      case 'verse':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            Verse
          </span>
        );
      case 'video':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
            Video
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, edit, and organize home feed inspirations
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition"
        >
          <Plus size={18} />
          <span>New Post</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Author Ref</th>
                <th className="px-6 py-4">Reactions</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Loading content...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No home feed items published yet.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <React.Fragment key={post.id}>
                    <tr className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">{getTypeBadge(post.content_type)}</td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-semibold text-gray-900 truncate" title={post.title}>
                          {post.title}
                        </div>
                        {post.body_text ? (
                          <div className="text-xs text-gray-500 truncate mt-0.5" title={post.body_text}>
                            {post.body_text}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-xs font-medium">
                        {post.author_reference || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                        ❤️ {post.reaction_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDateRelative(post.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(post)}
                          className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                          title="Edit post"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(post.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete post"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>

                    {/* Inline Delete Confirmation */}
                    {deleteConfirm === post.id ? (
                      <tr className="bg-red-50/80 border-y border-red-100">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-red-800">
                              Permanently delete "{post.title.slice(0, 40)}..."?
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDelete(post.id)}
                                disabled={isDeleting}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-xs font-semibold transition"
                              >
                                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={isDeleting}
                                className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Backdrop & Panel */}
      {showForm ? (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={handleCloseForm}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-gray-100 flex flex-col justify-between">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {isCreating ? 'Create New Post' : 'Edit Post'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isCreating
                      ? 'Add inspiring content to the public home feed.'
                      : 'Update content parameters and references.'}
                  </p>
                </div>
                <button
                  onClick={handleCloseForm}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
                {formError ? (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                    {formError}
                  </div>
                ) : null}

                {/* Content Type Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Content Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['quote', 'verse', 'video'] as ContentType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setContentType(type)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize border transition ${
                          contentType === type
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider" htmlFor="title">
                      Title *
                    </label>
                    <span className="text-xs text-gray-400">{title.length}/255</span>
                  </div>
                  <input
                    id="title"
                    type="text"
                    required
                    maxLength={255}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter post title..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm outline-none transition"
                  />
                </div>

                {/* Body Text */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider" htmlFor="bodyText">
                    Body Text (Optional)
                  </label>
                  <textarea
                    id="bodyText"
                    rows={4}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="Enter full scripture text or quote details..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm outline-none transition resize-none"
                  />
                </div>

                {/* Author Reference */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider" htmlFor="authorRef">
                      Author Reference
                    </label>
                    <span className="text-xs text-gray-400">{authorReference.length}/150</span>
                  </div>
                  <input
                    id="authorRef"
                    type="text"
                    maxLength={150}
                    value={authorReference}
                    onChange={(e) => setAuthorReference(e.target.value)}
                    placeholder="e.g. John 3:16 or C.S. Lewis"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm outline-none transition"
                  />
                </div>

                {/* Media URL */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider" htmlFor="mediaUrl">
                    Media URL (Optional)
                  </label>
                  <div className="relative">
                    <input
                      id="mediaUrl"
                      type="url"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm outline-none transition pr-9"
                    />
                    {mediaUrl ? (
                      <a
                        href={mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2.5 top-3 text-gray-400 hover:text-brand-600"
                        title="Open URL in new tab"
                      >
                        <ExternalLink size={16} />
                      </a>
                    ) : null}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    disabled={isSaving}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
                  >
                    {isSaving ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    <span>{isSaving ? 'Saving...' : isCreating ? 'Publish Post' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
