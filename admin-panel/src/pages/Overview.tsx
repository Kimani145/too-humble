import React, { useEffect, useState } from 'react';
import {
  Users,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { DashboardStats, HomeFeedPost, CommunityPost } from '../types';

export default function Overview(): React.JSX.Element {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalClients: 0,
    totalAdmins: 0,
    totalPosts: 0,
    flaggedPosts: 0,
    totalFeedItems: 0,
    totalDonations: 0,
    successfulAmount: 0,
  });
  const [recentFeed, setRecentFeed] = useState<HomeFeedPost[]>([]);
  const [recentCommunity, setRecentCommunity] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [
        profilesRes,
        adminProfilesRes,
        postsRes,
        flaggedPostsRes,
        feedRes,
        ledgerSuccessRes,
        recentFeedRes,
        recentCommunityRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('community_posts').select('*', { count: 'exact', head: true }),
        supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('is_flagged', true),
        supabase.from('home_feed').select('*', { count: 'exact', head: true }),
        supabase.from('monetization_ledger').select('amount, currency').eq('status', 'success'),
        supabase.from('home_feed').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('community_posts').select('*, profiles(full_name, avatar_url)').order('created_at', { ascending: false }).limit(5),
      ]);

      const totalUsers = profilesRes.count ?? 0;
      const totalAdmins = adminProfilesRes.count ?? 0;
      const totalClients = Math.max(0, totalUsers - totalAdmins);
      const totalPosts = postsRes.count ?? 0;
      const flaggedPosts = flaggedPostsRes.count ?? 0;
      const totalFeedItems = feedRes.count ?? 0;

      const successfulLedger = ledgerSuccessRes.data ?? [];
      const totalDonations = successfulLedger.length;
      const successfulAmount = successfulLedger.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

      setStats({
        totalUsers,
        totalClients,
        totalAdmins,
        totalPosts,
        flaggedPosts,
        totalFeedItems,
        totalDonations,
        successfulAmount,
      });

      setRecentFeed((recentFeedRes.data ?? []) as HomeFeedPost[]);
      setRecentCommunity((recentCommunityRes.data ?? []) as CommunityPost[]);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeBadge = (type: string): React.JSX.Element => {
    switch (type) {
      case 'quote':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
            Quote
          </span>
        );
      case 'verse':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            Verse
          </span>
        );
      case 'video':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
            Video
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time telemetry and management metrics</p>
        </div>
        <button
          onClick={fetchOverviewData}
          disabled={isLoading}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
        >
          <TrendingUp size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Total Users */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Total Users</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.totalClients} clients • {stats.totalAdmins} admins
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        {/* Flagged Posts */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Flagged Posts</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.flaggedPosts}</div>
            <div className="text-xs text-gray-400 mt-1">
              Out of {stats.totalPosts} community posts
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Feed Items */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Feed Items</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalFeedItems}</div>
            <div className="text-xs text-gray-400 mt-1">Published home feed posts</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText size={24} />
          </div>
        </div>

        {/* Donations */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Total Donations</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {stats.successfulAmount.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.totalDonations} successful transactions
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Home Feed Items */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Recent Feed Posts</h2>
            <span className="text-xs text-gray-400">Latest 5</span>
          </div>

          {recentFeed.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">No feed posts found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentFeed.map((post) => (
                <div key={post.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(post.content_type)}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {post.title}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    ❤️ {post.reaction_count || 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Community Posts */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Recent Community Posts</h2>
            <span className="text-xs text-gray-400">Latest 5</span>
          </div>

          {recentCommunity.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">No community posts found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentCommunity.map((post) => (
                <div key={post.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {post.profiles?.full_name || 'Anonymous User'}
                      </span>
                      {post.is_flagged ? (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                          Flagged
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                          Clean
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {post.caption || <span className="italic text-gray-400">No caption</span>}
                    </div>
                  </div>
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt="post"
                      className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
