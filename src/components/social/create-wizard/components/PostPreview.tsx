import { useState } from 'react';
import type { Platform } from '../types';

interface PostPreviewProps {
  platform: Platform;
  imageUrl: string | null;
  caption: string;
  hashtags: string[];
  defaultExpanded?: boolean;
  compact?: boolean; // Use compact view for inline previews
}

// Facebook truncates at ~400 chars, Instagram at ~125 chars, LinkedIn at ~140 chars
const TRUNCATE_LIMITS: Record<Platform, number> = {
  facebook: 400,
  instagram: 125,
  linkedin: 140,
};

// Compact limits for inline previews
const COMPACT_TRUNCATE_LIMITS: Record<Platform, number> = {
  facebook: 150,
  instagram: 80,
  linkedin: 100,
};

export default function PostPreview({
  platform,
  imageUrl,
  caption,
  hashtags,
  defaultExpanded = false,
  compact = false
}: PostPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const fullCaption = hashtags.length > 0
    ? `${caption}\n\n${hashtags.join(' ')}`
    : caption;

  const truncateLimit = compact ? COMPACT_TRUNCATE_LIMITS[platform] : TRUNCATE_LIMITS[platform];
  const shouldTruncate = fullCaption.length > truncateLimit && !isExpanded;

  const displayCaption = shouldTruncate
    ? fullCaption.slice(0, truncateLimit).trim() + '...'
    : fullCaption;

  if (platform === 'facebook') {
    return (
      <div className={`bg-white dark:bg-[#242526] rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${compact ? 'w-full' : 'max-w-[500px] mx-auto'}`}>
        {/* Header */}
        <div className="flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            PH
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[15px] text-gray-900 dark:text-gray-100">Purple Homes</p>
            <div className="flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400">
              <span>Just now</span>
              <span>·</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484-.08.08-.162.158-.242.234-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 1 2.04 4.327Z"/>
              </svg>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/>
            </svg>
          </button>
        </div>

        {/* Caption */}
        <div className="px-3 pb-3">
          <p className="text-[15px] text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
            {displayCaption}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-gray-500 dark:text-gray-400 hover:underline text-[15px] mt-1"
            >
              See more
            </button>
          )}
          {isExpanded && fullCaption.length > truncateLimit && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 dark:text-gray-400 hover:underline text-[15px] mt-1 block"
            >
              See less
            </button>
          )}
        </div>

        {/* Image */}
        {imageUrl && (
          <img src={imageUrl} alt="Post" className="w-full object-contain" />
        )}

        {/* Reactions bar */}
        <div className="flex items-center justify-between px-3 py-2 text-[13px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <span className="w-[18px] h-[18px] rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
                </svg>
              </span>
              <span className="w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                </svg>
              </span>
            </div>
            <span>24</span>
          </div>
          <div className="flex gap-3">
            <span>3 comments</span>
            <span>2 shares</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-around py-1 border-t border-gray-200 dark:border-gray-700">
          <button className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-1 text-gray-600 dark:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span className="text-[15px] font-medium">Like</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-1 text-gray-600 dark:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-[15px] font-medium">Comment</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-1 text-gray-600 dark:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="text-[15px] font-medium">Share</span>
          </button>
        </div>
      </div>
    );
  }

  if (platform === 'instagram') {
    return (
      <div className={`bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 ${compact ? 'w-full' : 'max-w-[470px] mx-auto'}`}>
        {/* Header */}
        <div className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center">
              <div className="w-[26px] h-[26px] rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold">
                PH
              </div>
            </div>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[14px] text-gray-900 dark:text-white">purplehomes</p>
          </div>
          <button className="p-2">
            <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/>
            </svg>
          </button>
        </div>

        {/* Image */}
        {imageUrl && (
          <img src={imageUrl} alt="Post" className="w-full object-contain max-h-[400px]" />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-4">
            <button>
              <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button>
              <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button>
              <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <button>
            <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>

        {/* Likes */}
        <div className="px-3">
          <p className="text-[14px] font-semibold text-gray-900 dark:text-white">127 likes</p>
        </div>

        {/* Caption */}
        <div className="px-3 pb-3 pt-1">
          <p className="text-[14px] text-gray-900 dark:text-white">
            <span className="font-semibold">purplehomes</span>{' '}
            <span className="whitespace-pre-wrap">{displayCaption}</span>
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-gray-400 text-[14px] mt-1"
            >
              more
            </button>
          )}
          {isExpanded && fullCaption.length > truncateLimit && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 text-[14px] mt-1 block"
            >
              less
            </button>
          )}
        </div>

        {/* Comments link */}
        <div className="px-3 pb-2">
          <p className="text-gray-400 text-[14px]">View all 8 comments</p>
        </div>

        {/* Time */}
        <div className="px-3 pb-3">
          <p className="text-gray-400 text-[10px] uppercase tracking-wide">2 hours ago</p>
        </div>
      </div>
    );
  }

  // LinkedIn
  return (
    <div className={`bg-white dark:bg-[#1B1F23] rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${compact ? 'w-full' : 'max-w-[552px] mx-auto'}`}>
      {/* Header */}
      <div className="flex items-start gap-2 p-3">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
          PH
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-gray-900 dark:text-gray-100 hover:text-blue-600 hover:underline cursor-pointer">Purple Homes</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">Real Estate Investment & Brokerage</p>
          <div className="flex items-center gap-1 text-[12px] text-gray-500 dark:text-gray-400">
            <span>2h</span>
            <span>·</span>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484-.08.08-.162.158-.242.234-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 1 2.04 4.327Z"/>
            </svg>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/>
          </svg>
        </button>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-[14px] text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
          {displayCaption}
        </p>
        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-gray-500 dark:text-gray-400 hover:text-blue-600 text-[14px] mt-1"
          >
            ...see more
          </button>
        )}
        {isExpanded && fullCaption.length > truncateLimit && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-500 dark:text-gray-400 hover:text-blue-600 text-[14px] mt-1 block"
          >
            see less
          </button>
        )}
      </div>

      {/* Image */}
      {imageUrl && (
        <img src={imageUrl} alt="Post" className="w-full object-contain" />
      )}

      {/* Reactions bar */}
      <div className="flex items-center justify-between px-3 py-2 text-[12px] text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border border-white">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
              </svg>
            </span>
            <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center border border-white">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            </span>
            <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center border border-white">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
              </svg>
            </span>
          </div>
          <span className="ml-1">48</span>
        </div>
        <div className="flex gap-2">
          <span>5 comments</span>
          <span>·</span>
          <span>2 reposts</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-gray-200 dark:border-gray-700" />

      {/* Action buttons */}
      <div className="flex items-center justify-around py-1">
        <button className="flex items-center justify-center gap-2 py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-1 text-gray-600 dark:text-gray-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span className="text-[12px] font-semibold">Like</span>
        </button>
        <button className="flex items-center justify-center gap-2 py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-1 text-gray-600 dark:text-gray-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[12px] font-semibold">Comment</span>
        </button>
        <button className="flex items-center justify-center gap-2 py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-1 text-gray-600 dark:text-gray-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-[12px] font-semibold">Repost</span>
        </button>
        <button className="flex items-center justify-center gap-2 py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-1 text-gray-600 dark:text-gray-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span className="text-[12px] font-semibold">Send</span>
        </button>
      </div>
    </div>
  );
}
