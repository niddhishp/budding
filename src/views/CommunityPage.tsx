import { useState } from 'react';
import { communityPosts } from '@/data/developmentalData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageCircle, CheckCircle2,
  ThumbsUp, Share2, Bookmark,
} from 'lucide-react';

const topics = ['All', 'Sleep', 'Emotions', 'Teens', 'Communication', 'Screen Time', 'Siblings'];

export function CommunityPage() {
  const [activeTopic, setActiveTopic] = useState('All');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const filtered = activeTopic === 'All'
    ? communityPosts
    : communityPosts.filter((p) => p.tags.some((t) => t.includes(activeTopic.toLowerCase())));

  const toggleLike = (id: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-slate-850">Community</h1>
        <p className="text-slate-500">Connect with parents. Share experiences. Learn together.</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <button
            key={topic}
            onClick={() => setActiveTopic(topic)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTopic === topic
                ? 'bg-sage text-white'
                : 'bg-white/60 text-slate-600 hover:bg-white'
            }`}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* New Post */}
      <Card className="glass-card p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-white">P</span>
          </div>
          <div className="flex-1">
            <Textarea
              placeholder="Share a question, insight, or parenting moment..."
              className="min-h-[80px] rounded-xl border-slate-200 bg-white/80 resize-none mb-3"
            />
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-0 cursor-pointer hover:bg-slate-200">
                  Question
                </Badge>
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-0 cursor-pointer hover:bg-slate-200">
                  Insight
                </Badge>
              </div>
              <Button size="sm" className="bg-sage hover:bg-sage/90 text-white">
                Post
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Posts */}
      <div className="space-y-4">
        {filtered.map((post) => (
          <Card key={post.id} className="glass-card p-5 hover-lift">
            {/* Author */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center">
                <span className="font-medium text-sage">{post.avatar}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 text-sm">{post.author}</span>
                  {post.verified && (
                    <Badge variant="secondary" className="bg-sage-light text-sage border-0 text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Expert Verified
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(post.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Content */}
            <h3 className="font-medium text-slate-800 mb-2">{post.title}</h3>
            <p className="text-sm text-slate-600 mb-3">{post.content}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-500 border-0 text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => toggleLike(post.id)}
                className={`flex items-center gap-1.5 text-sm ${
                  likedPosts.has(post.id) ? 'text-sage' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
              </button>
              <button
                onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600"
              >
                <MessageCircle className="w-4 h-4" />
                {post.replies}
              </button>
              <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 ml-auto">
                <Bookmark className="w-4 h-4" />
                Save
              </button>
            </div>

            {/* Reply Input */}
            {replyingTo === post.id && (
              <div className="mt-4 flex items-start gap-3">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Share your experience or advice..."
                  className="min-h-[60px] rounded-xl border-slate-200 bg-white/80 resize-none"
                />
                <Button size="sm" className="bg-sage hover:bg-sage/90 text-white mt-1">
                  Reply
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
