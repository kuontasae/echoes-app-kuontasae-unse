"use client";

import React from "react";
import {
  IconComment,
  IconHeart,
  IconShareExternal,
  IconVerified,
} from "../../Icons";
import type { User } from "../../types";

const IconArticle = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M2 15h10"></path><path d="M2 18h10"></path><path d="M2 21h10"></path></svg>;
const IconEdit = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconEdit2 = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

type ArticleTabMode = 'global' | 'trend' | 'following' | 'liked' | 'my_posts' | 'drafts';

type ArticleListSectionProps = {
  articleTabMode: ArticleTabMode;
  displayArticles: any[];
  draftArticles: any[];
  myProfileId: string;
  labels: {
    articles: string;
    trend: string;
    global: string;
    following: string;
    liked: string;
    mine: string;
    drafts: string;
  };
  onChangeTab: (mode: ArticleTabMode) => void;
  onOpenWriter: () => void;
  onOpenArticle: (article: any) => void;
  onOpenAuthor: (author: User) => void;
  onOpenDraft: (draft: any) => void;
  onDeleteDraft: (draftId: string) => void;
  onToggleArticleLike: (articleId: string) => void;
  onStartEditingArticle: (article: any) => void;
  onDeleteArticle: (articleId: string) => void;
  onShareArticle: (article: any) => void;
};

export const ArticleListSection: React.FC<ArticleListSectionProps> = ({
  articleTabMode,
  displayArticles,
  draftArticles,
  myProfileId,
  labels,
  onChangeTab,
  onOpenWriter,
  onOpenArticle,
  onOpenAuthor,
  onOpenDraft,
  onDeleteDraft,
  onToggleArticleLike,
  onStartEditingArticle,
  onDeleteArticle,
  onShareArticle,
}) => (
	  <div className="mt-6 animate-fade-in px-2 pb-10">
	    <div className="flex justify-between items-center mb-6 px-2">
	      <h2 className="text-2xl font-black tracking-tight">{labels.articles}</h2>
	      <button onClick={onOpenWriter} className="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
	        <IconEdit />
	      </button>
	    </div>
	    <div className="flex gap-6 mb-6 px-3 border-b border-zinc-900 overflow-x-auto scrollbar-hide">
	      <button onClick={() => onChangeTab('trend')} className={`pb-2 text-sm font-bold whitespace-nowrap transition-colors ${articleTabMode === 'trend' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>{labels.trend}</button>
	      <button onClick={() => onChangeTab('global')} className={`pb-2 text-sm font-bold whitespace-nowrap transition-colors ${articleTabMode === 'global' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>{labels.global}</button>
	      <button onClick={() => onChangeTab('following')} className={`pb-2 text-sm font-bold whitespace-nowrap transition-colors ${articleTabMode === 'following' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>{labels.following}</button>
	      <button onClick={() => onChangeTab('liked')} className={`pb-2 text-sm font-bold whitespace-nowrap transition-colors ${articleTabMode === 'liked' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>{labels.liked}</button>
	      <button onClick={() => onChangeTab('my_posts')} className={`pb-2 text-sm font-bold whitespace-nowrap transition-colors ${articleTabMode === 'my_posts' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>{labels.mine}</button>
	      <button onClick={() => onChangeTab('drafts')} className={`pb-2 text-sm font-bold whitespace-nowrap transition-colors ${articleTabMode === 'drafts' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}>{labels.drafts}</button>
	    </div>
    {articleTabMode === 'drafts' ? (
      <div className="flex flex-col gap-5">
        {draftArticles.length > 0 ? draftArticles.map((draft) => (
          <div key={draft.id} onClick={() => onOpenDraft(draft)} className="bg-[#1c1c1e] rounded-2xl p-5 shadow-lg border border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition-colors border-l-4 border-l-[#1DB954] relative group">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-[17px] text-white truncate pr-10">{draft.title || "無題の下書き"}</h3>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 px-2 py-1 rounded-md shrink-0">{draft.date}</span>
            </div>
            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{draft.content.replace(/<[^>]*>/g, '') || "本文がありません"}</p>
            <button onClick={(e) => {
              e.stopPropagation();
              onDeleteDraft(draft.id);
            }} className="absolute top-4 right-4 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <IconTrash />
            </button>
          </div>
        )) : (
          <div className="py-20 text-center text-zinc-500">
            <IconEdit2 />
            <p className="text-sm font-bold mt-4">保存された下書きはありません</p>
          </div>
        )}
      </div>
    ) : (
      <div className="flex flex-col gap-5">
        {displayArticles.length > 0 ? displayArticles.map((article) => (
          <div key={article.id} className="bg-[#1c1c1e] rounded-2xl overflow-hidden shadow-lg border border-zinc-800 relative group transition-colors">
            <div className="cursor-pointer flex flex-col" onClick={() => onOpenArticle(article)}>
              <img src={article.coverUrl} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="p-5 relative bg-[#1c1c1e]">
                <h3 className="font-bold text-[17px] mb-2 leading-snug">{article.title}</h3>
                <p className="text-xs text-zinc-400 mb-4 line-clamp-2 leading-relaxed">{article.content.replace(/<[^>]*>/g, '')}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
                  <div className="flex items-center gap-2" onClick={(e) => { e.stopPropagation(); onOpenAuthor(article.author); }}>
                    <img src={article.author.avatar} className="w-6 h-6 rounded-full object-cover border border-zinc-700" />
                    <span className="text-[11px] font-bold text-white flex items-center gap-1">
                      {article.author.name} {article.author.isVerified && <IconVerified />}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-zinc-400">
                    <button onClick={(e) => { e.stopPropagation(); onToggleArticleLike(article.id); }} className={`flex items-center gap-1 text-[11px] font-bold ${article.isLiked ? 'text-[#1DB954]' : 'hover:text-white'}`}>
                      <IconHeart filled={article.isLiked} /> {article.likes}
                    </button>
                    <span className="flex items-center gap-1 text-[11px] font-bold"><IconComment /> {article.comments.length}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); onShareArticle(article); }} className="w-8 h-8 rounded-full bg-black/60 text-zinc-400 hover:text-white hover:bg-black flex items-center justify-center transition-colors" title="シェア"><IconShareExternal /></button>
              {article.author.id === myProfileId && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onStartEditingArticle(article); }} className="w-8 h-8 rounded-full bg-black/60 text-zinc-400 hover:text-white hover:bg-black flex items-center justify-center transition-colors" title="編集"><IconEdit2 /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteArticle(article.id); }} className="w-8 h-8 rounded-full bg-black/60 text-zinc-400 hover:text-red-400 hover:bg-black flex items-center justify-center transition-colors" title="削除"><IconTrash /></button>
                </>
              )}
            </div>
          </div>
        )) : (
          <div className="py-20 text-center text-zinc-500">
            <IconArticle />
            <p className="text-sm font-bold mt-4">記事がありません</p>
          </div>
        )}
      </div>
    )}
  </div>
);
