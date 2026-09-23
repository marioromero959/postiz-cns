/** Maps API English metric labels → i18n keys (Spanish in locales/es). */
export const ANALYTICS_LABEL_KEYS: Record<string, string> = {
  'Page Impressions': 'analytics_page_impressions',
  'Posts Engagement': 'analytics_posts_engagement',
  'Page followers': 'analytics_page_followers',
  'Media views': 'analytics_media_views',
  Followers: 'analytics_followers',
  Following: 'analytics_following',
  'Follower Count': 'analytics_followers',
  'Total Likes': 'analytics_total_likes',
  Videos: 'analytics_videos',
  Views: 'analytics_views',
  Likes: 'analytics_likes',
  Comments: 'analytics_comments',
  Shares: 'analytics_shares',
  Saves: 'analytics_saves',
  Replies: 'analytics_replies',
  Reach: 'analytics_reach',
  Impressions: 'analytics_impressions',
  Engagement: 'analytics_engagement',
  'Pin Clicks': 'analytics_pin_clicks',
  'Pin click rate': 'analytics_pin_click_rate',
  'Outbound Clicks': 'analytics_outbound_clicks',
  Retweets: 'analytics_retweets',
  Quotes: 'analytics_quotes',
  Bookmarks: 'analytics_bookmarks',
  'Estimated Minutes Watched': 'analytics_estimated_minutes_watched',
  'Average View Duration': 'analytics_average_view_duration',
  'Average View Percentage': 'analytics_average_view_percentage',
  'Subscribers Gained': 'analytics_subscribers_gained',
  'Subscribers Lost': 'analytics_subscribers_lost',
  Favorites: 'analytics_favorites',
  'Recent Likes': 'analytics_recent_likes',
  'Recent Comments': 'analytics_recent_comments',
  'Recent Shares': 'analytics_recent_shares',
  follower_count: 'analytics_followers',
  reach: 'analytics_reach',
  likes: 'analytics_likes',
  views: 'analytics_views',
  comments: 'analytics_comments',
  shares: 'analytics_shares',
  saves: 'analytics_saves',
  replies: 'analytics_replies',
};

export function translateAnalyticsLabel(
  label: string,
  t: (key: string, fallback: string) => string
): string {
  const key =
    ANALYTICS_LABEL_KEYS[label] || ANALYTICS_LABEL_KEYS[label.trim()];
  if (key) {
    return t(key, label);
  }
  const normalized = label.replace(/_/g, ' ');
  const key2 = ANALYTICS_LABEL_KEYS[normalized];
  if (key2) return t(key2, normalized);
  return label;
}
