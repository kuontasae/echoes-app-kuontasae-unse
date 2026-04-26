"use client";

import React from "react";
import DOMPurify from "isomorphic-dompurify";
import {
  IconChevronLeft,
  IconComment,
  IconHeart,
  IconLock,
  IconLockSetting,
  IconShareExternal,
  IconVerified,
} from "../../Icons";
import type { User } from "../../types";

type ArticleDetailModalProps = {
  article: any;
  myProfile: User;
  currentUserId?: string;
  hasPurchasedArticle?: boolean;
  articleCommentInput: string;
  onClose: () => void;
  onOpenAuthor: (author: User) => void;
  onOpenCoinCharge: () => void;
  onUnlockArticle: (article: any) => void;
  onSendGift: (amount: number) => void;
  onToggleArticleLike: (articleId: string) => void;
  onSubmitArticleComment: (e?: React.FormEvent) => void;
  onArticleCommentInputChange: (value: string) => void;
};

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({
  article: viewingArticle,
  myProfile,
  currentUserId,
  hasPurchasedArticle,
  articleCommentInput,
  onClose,
  onOpenAuthor,
  onOpenCoinCharge,
  onUnlockArticle,
  onSendGift,
  onToggleArticleLike,
  onSubmitArticleComment,
  onArticleCommentInputChange,
}) => (
  <div className="fixed inset-0 bg-black z-[950] flex flex-col animate-fade-in overflow-y-auto">
    <div className="relative w-full h-[40vh] flex-shrink-0">
      <img src={viewingArticle.coverUrl} className="w-full h-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black"></div>
      <button onClick={onClose} className="absolute top-4 left-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors z-10"><IconChevronLeft /></button>
    </div>
    <div className="px-6 py-8 relative z-10 -mt-10 bg-black rounded-t-[32px] flex-1">
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{viewingArticle.date} • {viewingArticle.readTime}</span>
        <button className="text-zinc-400 hover:text-white"><IconShareExternal /></button>
      </div>
      <h1 className="text-2xl font-black text-white leading-snug mb-8">{viewingArticle.title}</h1>
      <div className="flex items-center justify-between mb-8 pb-8 border-b border-zinc-900 cursor-pointer" onClick={() => onOpenAuthor(viewingArticle.author)}>
        <div className="flex items-center gap-3">
          <img src={viewingArticle.author.avatar} className="w-10 h-10 rounded-full object-cover border border-zinc-800" />
          <div>
            <p className="font-bold text-sm text-white flex items-center gap-1">{viewingArticle.author.name} {viewingArticle.author.isVerified && <IconVerified />}</p>
            <p className="text-[10px] text-zinc-500">@{viewingArticle.author.handle}</p>
          </div>
        </div>
        <button className="px-4 py-1.5 border border-zinc-700 rounded-full text-[10px] font-bold text-white hover:bg-zinc-800 transition-colors">Follow</button>
      </div>
      <div className="text-sm text-zinc-300 leading-loose whitespace-pre-wrap mb-12 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-white [&_h3]:mt-4 [&_h3]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:my-2 [&_li]:mb-1 [&_hr]:my-6 [&_hr]:border-zinc-700">
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingArticle.content) }} />
        {viewingArticle.price > 0 && (
          <div className="mt-8 relative">
            {hasPurchasedArticle || viewingArticle.author.id === currentUserId ? (
              <div className="border-t border-[#1DB954]/30 pt-6 mt-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-6 text-[#1DB954] font-bold text-xs bg-[#1DB954]/10 w-fit px-4 py-2 rounded-full border border-[#1DB954]/20 shadow-sm">
                  <IconLockSetting />
                  <span>有料コンテンツをアンロックしました</span>
                </div>
                <div className="text-sm text-zinc-300 leading-loose whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingArticle.premium_content || "") }} />
              </div>
            ) : (
              <div className="border-t border-zinc-800 pt-6 mt-6 relative overflow-hidden rounded-3xl">
                <div className="filter blur-md opacity-30 select-none pointer-events-none h-[320px] overflow-hidden">
                  <p>ここに有料限定のテキストが入ります。ライブの裏話や、特別なセットリストの解説、個人的な音楽の考察などが読めるようになります。アーティストの活動を支援するために、ぜひコインを使って続きを読んでみてください。応援がクリエイターの力になります...</p>
                  <br/>
                  <p>さらに深い音楽の話や、ここでしか見られない特別なコンテンツをお楽しみください。あなたのサポートが、次の素晴らしい作品を生み出す原動力となります。</p>
                  <br/>
                  <p>Echoesで新しい音楽の発見を。</p>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent p-6 text-center z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(250,204,21,0.2)] mb-4 border border-yellow-300/50">
                    <IconLock />
                  </div>
                  <p className="text-white font-black text-xl mb-2 tracking-tight">この続きは有料コンテンツです</p>
                  <div className="flex flex-col items-center gap-3 mb-8 w-full max-w-[260px] mt-4">
                    <div className="w-full flex items-center justify-between bg-[#1c1c1e] border border-zinc-800 px-5 py-3.5 rounded-2xl shadow-inner">
                      <span className="text-xs font-bold text-zinc-400">記事の価格</span>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-sm">
                          <span className="text-[9px] font-black leading-none mt-[0.5px]">C</span>
                        </div>
                        <span className="text-xl font-black text-white leading-none">{viewingArticle.price}</span>
                      </div>
                    </div>
                    <div className="w-full flex items-center justify-between bg-transparent border border-zinc-800 px-5 py-3 rounded-xl cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={onOpenCoinCharge}>
                      <span className="text-[10px] font-bold text-zinc-500">現在の所持コイン</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-sm">
                          <span className="text-[8px] font-black leading-none mt-[0.5px]">C</span>
                        </div>
                        <span className="text-sm font-bold text-zinc-300 leading-none">{(myProfile as any).coin_balance || 0}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUnlockArticle(viewingArticle)}
                    className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black py-4 px-10 rounded-full shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 w-full max-w-[280px] text-sm"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    記事をアンロック
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-zinc-900 pt-8 pb-12">
        {viewingArticle.author.id !== currentUserId && (
          <div className="bg-[#121212] border border-zinc-800 rounded-[24px] p-6 mb-10 flex flex-col items-center shadow-lg animate-fade-in">
            <h3 className="font-black text-lg text-white mb-2 tracking-tight">クリエイターをサポート</h3>
            <p className="text-xs text-zinc-400 mb-6 text-center leading-relaxed">この記事が気に入ったら、コインを贈って応援しよう！<br/>あなたのサポートが次の作品の原動力になります。</p>
            <div className="flex gap-3 w-full justify-center">
              {[100, 500, 1000].map(amount => (
                <button key={amount} onClick={() => onSendGift(amount)} className="flex flex-col items-center justify-center p-3 w-[80px] sm:w-[100px] bg-black border border-zinc-800 rounded-2xl hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group active:scale-95 shadow-sm">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-black shadow-md mb-2 group-hover:scale-110 transition-transform">
                    <span className="text-sm sm:text-base font-black mt-0.5">C</span>
                  </div>
                  <span className="font-black text-sm sm:text-base text-white">{amount}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-6 mb-8">
          <button onClick={() => onToggleArticleLike(viewingArticle.id)} className={`flex items-center gap-2 font-bold ${viewingArticle.isLiked ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'}`}>
            <IconHeart filled={viewingArticle.isLiked} /> {viewingArticle.likes} Likes
          </button>
          <div className="flex items-center gap-2 font-bold text-zinc-400"><IconComment /> {viewingArticle.comments.length} Comments</div>
        </div>
        {viewingArticle.comments.length > 0 && (
          <div className="flex flex-col gap-5 mb-8">
            {viewingArticle.comments.map((c: any) => (
              <div key={c.id} className="flex gap-3">
                <img src={c.user.avatar} className="w-8 h-8 rounded-full object-cover border border-zinc-800 shrink-0" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{c.user.name}</span>
                    <span className="text-[10px] text-zinc-500">@{c.user.handle}</span>
                  </div>
                  <p className="text-sm text-zinc-300 mt-1 leading-snug">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={onSubmitArticleComment} className="flex gap-3 items-center mb-8">
          <img src={myProfile.avatar} className="w-8 h-8 rounded-full object-cover shrink-0" />
          <div className="flex-1 bg-[#1c1c1e] rounded-full px-4 py-2 flex items-center border border-zinc-800 focus-within:border-zinc-600 transition-colors">
            <input type="text" placeholder="感想を書く..." value={articleCommentInput} onChange={e => onArticleCommentInputChange(e.target.value)} className="w-full bg-transparent text-xs text-white focus:outline-none" />
            <button type="submit" className="text-[10px] font-bold text-black bg-white px-3 py-1 rounded-full ml-2 shrink-0">Post</button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
