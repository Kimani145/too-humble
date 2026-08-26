import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Trash2,
  Clock,
  Filter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CommunityPost } from '../types';

type FilterTab = 'all' | 'flagged' | 'clean';

export default function Moderation(): React.JSX.Element {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunityPosts();
  }, []);

  const fetchCommunityPosts = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*, profiles(full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPosts((data ?? []) as CommunityPost[]);
    } catch (err) {
      console.error('Failed to fetch community posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFlag = async (id: string, currentFlag: boolean): Promise<void> => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('community_posts')
        .update({ is_flagged: !currentFlag })
        .eq('id', id);

      if (error) throw error;
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_flagged: !currentFlag } : p))
      );
    } catch (err) {
      console.error('Failed to toggle flag:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete post:', err);
    } finally {
      setProcessingId(null);
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

  const getInitials = (name?: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const filteredPosts = posts.filter((post) => {
    if (filterTab === 'flagged') return post.is_flagged;
    if (filterTab === 'clean') return !post.is_flagged;
    return true;
  });

  const flaggedCount = posts.filter((p) => p.is_flagged).length;
  const cleanCount = posts.length - flaggedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Moderation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review, moderate, and delete user-submitted community posts
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center bg-gray-200/80 p-1 rounded-xl gap-1 self-start sm:self-auto">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({posts.length})
          </button>
          <button
            onClick={() => setFilterTab('flagged')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filterTab === 'flagged'
                ? 'bg-white text-red-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Flagged ({flaggedCount})</span>
          </button>
          <button
            onClick={() => setFilterTab('clean')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filterTab === 'clean'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Clean ({cleanCount})</span>
          </button>
        </div>
      </div>

      {/* Moderation Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4">Caption</th>
                <th className="px-6 py-4">Image</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Loading community posts...
                  </td>
                </tr>
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <Filter size={32} className="text-gray-300 mb-2" />
                      <span>No posts match the selected filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <React.Fragment key={post.id}>
                    <tr className="hover:bg-gray-50 transition">
                      {/* Author */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {post.profiles?.avatar_url ? (
                            <img
                              src={post.profiles.avatar_url}
                              alt={post.profiles.full_name}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                              {getInitials(post.profiles?.full_name)}
                            </div>
                          )}
                          <div className="font-semibold text-gray-900 text-xs">
                            {post.profiles?.full_name || 'Anonymous User'}
                          </div>
                        </div>
                      </td>

                      {/* Caption */}
                      <td className="px-6 py-4 max-w-sm">
                        <div className="text-gray-700 line-clamp-2 text-xs">
                          {post.caption ? (
                            post.caption
                          ) : (
                            <span className="italic text-gray-400">No caption</span>
                          )}
                        </div>
                        {post.file_size_kb ? (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {Math.round(post.file_size_kb)} KB
                          </div>
                        ) : null}
                      </td>

                      {/* Image */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {post.image_url ? (
                          <img
                            src={post.image_url}
                            alt="post upload"
                            onClick={() => setPreviewImage(post.image_url)}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80 transition"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Flagged Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {post.is_flagged ? (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 inline-flex items-center gap-1">
                            <AlertTriangle size={12} />
                            <span>Flagged</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 inline-flex items-center gap-1">
                            <CheckCircle size={12} />
                            <span>Clean</span>
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDateRelative(post.created_at)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        {post.is_flagged ? (
                          <button
                            onClick={() => handleToggleFlag(post.id, true)}
                            disabled={processingId === post.id}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Unflag post"
                          >
                            <CheckCircle size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleFlag(post.id, false)}
                            disabled={processingId === post.id}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Flag post"
                          >
                            <AlertTriangle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(post.id)}
                          disabled={processingId === post.id}
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
                              Permanently remove this community post and its image?
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDelete(post.id)}
                                disabled={processingId === post.id}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-xs font-semibold transition"
                              >
                                {processingId === post.id ? 'Deleting...' : 'Yes, Delete'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={processingId === post.id}
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

      {/* Lightbox Modal */}
      {previewImage ? (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="preview"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
