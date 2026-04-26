"use client";

import React from "react";
import {
  IconChevronDown,
  IconChevronLeft,
} from "../../Icons";

const IconImage = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const IconList = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const IconPlus = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

type ArticleEditorModalProps = {
  isOpen: boolean;
  lastSaved: string | null;
  newArticleCover: string | null;
  newArticleTitle: string;
  newArticleContent: string;
  isArticleUploading: boolean;
  articleTextareaRef: React.RefObject<any>;
  onClose: () => void;
  onSaveDraft: () => void;
  onOpenPublishSettings: () => void;
  onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onOpenElementMenu: () => void;
  onOpenHeadingMenu: () => void;
  onOpenAlignmentMenu: () => void;
  onOpenListMenu: () => void;
  children?: React.ReactNode;
};

export const ArticleEditorModal: React.FC<ArticleEditorModalProps> = ({
  isOpen,
  lastSaved,
  newArticleCover,
  newArticleTitle,
  newArticleContent,
  isArticleUploading,
  articleTextareaRef,
  onClose,
  onSaveDraft,
  onOpenPublishSettings,
  onCoverUpload,
  onTitleChange,
  onContentChange,
  onOpenElementMenu,
  onOpenHeadingMenu,
  onOpenAlignmentMenu,
  onOpenListMenu,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#121212] z-[1000] flex flex-col animate-fade-in">
      <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800/50">
        <button onClick={onClose} className="p-2 -ml-2 text-white hover:opacity-80 transition-opacity shrink-0">
          <IconChevronLeft />
        </button>
        <div className="flex items-center gap-4 text-sm font-bold text-zinc-400">
          {lastSaved && <span className="text-[10px] font-normal hidden sm:inline">{lastSaved} 保存済</span>}
          <button onClick={onSaveDraft} className="hover:text-white transition-colors hidden sm:block">下書き保存</button>
          <button onClick={onOpenPublishSettings} className="text-white hover:text-[#1DB954] transition-colors ml-1 px-4 py-1.5 bg-[#1DB954]/20 text-[#1DB954] font-bold rounded-full border border-[#1DB954]/50">公開設定</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 relative">
        <div className="relative mb-2">
          {newArticleCover ? (
            <div className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden group border border-zinc-800">
              <img src={newArticleCover} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <label className="cursor-pointer px-4 py-2 bg-black/80 rounded-full text-xs font-bold text-white hover:bg-zinc-800 border border-zinc-700 transition-colors flex items-center gap-2">
                  <IconImage /> 表紙を変更
                  <input type="file" accept="image/*" onChange={onCoverUpload} className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <label className="w-16 h-16 border-2 border-zinc-700 border-dashed rounded-2xl flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:border-zinc-500 hover:text-white transition-colors cursor-pointer group">
              {isArticleUploading ? (
                <div className="w-6 h-6 border-2 border-zinc-500 border-t-[#1DB954] rounded-full animate-spin"></div>
              ) : (
                <div className="flex flex-col items-center gap-1 group-hover:scale-110 transition-transform">
                  <IconImage />
                  <span className="text-[8px] font-bold">表紙追加</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={onCoverUpload} disabled={isArticleUploading} className="hidden" />
            </label>
          )}
        </div>
        <textarea
          placeholder="タイトル"
          value={newArticleTitle}
          onChange={e => onTitleChange(e.target.value)}
          className="w-full bg-transparent text-3xl font-black text-white focus:outline-none resize-none overflow-hidden placeholder-zinc-600"
          rows={1}
          style={{ minHeight: '1.5em' }}
        />
        <div
          ref={articleTextareaRef}
          contentEditable
          suppressContentEditableWarning
          onInput={e => onContentChange(e.currentTarget.innerHTML)}
          className="w-full flex-1 bg-transparent text-base text-zinc-300 focus:outline-none outline-none leading-relaxed empty:before:content-['ご自由にお書きください。'] empty:before:text-zinc-600 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-white [&_h3]:mt-4 [&_h3]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:my-2 [&_li]:mb-1 [&_hr]:my-6 [&_hr]:border-zinc-700 [&_.quote-text:empty]:before:content-['ここに引用文を入力...'] [&_.quote-text:empty]:before:text-zinc-500 [&_.quote-source:empty]:before:content-['出典を入力'] [&_.quote-source:empty]:before:text-zinc-600"
          style={{ minHeight: '200px' }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const selection = window.getSelection();
              if (!selection || selection.rangeCount === 0) return;
              const node = selection.focusNode;
              let isInsideList = false;
              let curr: Node | null = node;
              while (curr && curr !== articleTextareaRef.current) {
                if (curr.nodeName === 'LI') { isInsideList = true; break; }
                curr = curr.parentNode;
              }
              if (!isInsideList && node && node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || '';
                if (selection.focusOffset !== text.length) return;
                const bulletMatch = text.match(/^([・\-*])\s(.*)$/);
                const numberMatch = text.match(/^(\d+)\.\s(.*)$/);
                const isEmptyBullet = /^([・\-*])\s$/.test(text) || /^(\d+)\.\s$/.test(text);
                if (isEmptyBullet) {
                  e.preventDefault();
                  const range = document.createRange();
                  range.selectNodeContents(node);
                  selection.removeAllRanges();
                  selection.addRange(range);
                  document.execCommand('delete', false, '');
                  document.execCommand('insertHTML', false, '<br/><br/>');
                  return;
                }
                if (bulletMatch) {
                  e.preventDefault();
                  document.execCommand('insertHTML', false, '<br/>' + bulletMatch[1] + ' ');
                } else if (numberMatch) {
                  e.preventDefault();
                  document.execCommand('insertHTML', false, '<br/>' + (parseInt(numberMatch[1]) + 1) + '. ');
                }
              }
            }
          }}
        />
      </div>
      <div className="px-4 py-2 flex justify-end">
        <span className="bg-zinc-800/80 text-zinc-400 text-[10px] px-3 py-1 rounded-full font-bold">
          {newArticleContent.replace(/<[^>]*>/g, '').length}文字
        </span>
      </div>
      <div className="border-t border-zinc-800/80 bg-[#1c1c1e] px-2 py-3 flex items-center gap-4 overflow-x-auto scrollbar-hide relative z-40">
        <button onClick={onOpenElementMenu} className="p-2 text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0"><IconPlus /></button>
        <button onMouseDown={e => { e.preventDefault(); document.execCommand('bold', false, ''); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0 font-bold" title="太字">B</button>
        <button onMouseDown={e => { e.preventDefault(); document.execCommand('strikeThrough', false, ''); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0 font-bold line-through" title="取り消し線">S</button>
        <button onMouseDown={e => { e.preventDefault(); onOpenHeadingMenu(); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0 font-bold text-lg leading-none" title="見出し">T</button>
        <button onMouseDown={e => { e.preventDefault(); onOpenAlignmentMenu(); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0" title="配置">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="18" x2="19" y2="18"></line></svg>
        </button>
        <button onMouseDown={e => { e.preventDefault(); onOpenListMenu(); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0" title="リスト">
          <IconList />
        </button>
        <div className="w-px h-5 bg-zinc-700 shrink-0 mx-1"></div>
        <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0 flex gap-1">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          <IconChevronDown />
        </button>
      </div>
      {children}
    </div>
  );
};
