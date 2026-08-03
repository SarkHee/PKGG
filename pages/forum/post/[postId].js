import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../../components/layout/Header';
import { useT } from '../../../utils/i18n';

function DeleteModal({ type, onConfirm, onCancel, loading, error }) {
  const { t } = useT();
  const [password, setPassword] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          {type === 'post' ? t('fpost.delete_post_title') : t('fpost.delete_reply_title')}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {t('fpost.delete_desc1')}<br />
          {t('fpost.delete_desc2')}
        </p>
        {error && <p className="mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2.5">{error}</p>}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('fpost.password_placeholder')}
          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          onKeyDown={(e) => e.key === 'Enter' && onConfirm(password)}
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {t('form.cancel')}
          </button>
          <button
            onClick={() => onConfirm(password)}
            disabled={loading || !password}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? t('fpost.deleting') : t('fpost.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatContent(content, t) {
  return content.split('\n').map((line, i) => {
    // 이미지 마크다운: ![alt](url)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      return (
        <div key={i} className="my-4 -mx-6">
          <img
            src={imgMatch[2]}
            alt={imgMatch[1] || t('fpost.image_alt')}
            className="w-full block"
            style={{ objectFit: 'cover' }}
          />
        </div>
      );
    }
    return line.trim() ? (
      <p key={i} className="mb-2 text-gray-800 dark:text-gray-200 leading-relaxed">{line}</p>
    ) : (
      <div key={i} className="mb-2" />
    );
  });
}

function PartyContent({ content }) {
  const { t } = useT();
  const MODE_LABELS     = { squad: t('fpost.mode.squad'), 'squad-fpp': t('fpost.mode.squad_fpp'), duo: t('fpost.mode.duo'), 'duo-fpp': t('fpost.mode.duo_fpp'), solo: t('fpost.mode.solo') };
  const PLAYTIME_LABELS = { morning: t('fpost.playtime.morning'), afternoon: t('fpost.playtime.afternoon'), evening: t('fpost.playtime.evening'), midnight: t('fpost.playtime.midnight'), anytime: t('fpost.playtime.anytime') };
  const MIC_LABELS      = { required: t('fpost.mic.required'), preferred: t('fpost.mic.preferred'), not_required: t('fpost.mic.not_required') };

  let p = null;
  try { const d = JSON.parse(content); if (d?.__party) p = d; } catch {}
  if (!p) return formatContent(content, t);

  const mmrText = (p.mmrMin || p.mmrMax)
    ? `MMR ${p.mmrMin || 0} ~ ${p.mmrMax || t('fpost.mmr_unlimited')}`
    : null;

  return (
    <div className="space-y-4">
      {/* 배지 행 */}
      <div className="flex flex-wrap gap-2">
        {p.mode && (
          <span className="text-sm font-bold px-3 py-1.5 rounded-full bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            {MODE_LABELS[p.mode] || p.mode}
          </span>
        )}
        {p.server && (
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full border ${p.server === 'steam' ? 'bg-blue-500/15 text-blue-500 border-blue-400/30' : 'bg-yellow-500/15 text-yellow-500 border-yellow-400/30'}`}>
            {p.server === 'steam' ? '🎮 Steam' : '🟡 Kakao'}
          </span>
        )}
        {p.slotsNeeded > 0 && (
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30">
            👥 {t('fpost.slots_recruit').replace('{n}', p.slotsNeeded)}
          </span>
        )}
        {p.mic && (
          <span className="text-sm px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {MIC_LABELS[p.mic] || p.mic}
          </span>
        )}
        {p.playtime && (
          <span className="text-sm px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {PLAYTIME_LABELS[p.playtime] || p.playtime}
          </span>
        )}
        {mmrText && (
          <span className="text-sm px-3 py-1.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-400/30">
            📊 {mmrText}
          </span>
        )}
      </div>

      {/* 설명 */}
      {p.description && (
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{p.description}</p>
        </div>
      )}
    </div>
  );
}

export default function PostDetail() {
  const router = useRouter();
  const { t } = useT();
  const { postId } = router.query;
  const { data: session } = useSession();

  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkedNickname, setLinkedNickname] = useState(null);
  const [replyForm, setReplyForm] = useState({ content: '', author: '', password: '' });
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [deleteModal, setDeleteModal] = useState(null); // { type: 'post' | 'reply', id }
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    if (postId) fetchPost();
  }, [postId]);

  useEffect(() => {
    if (!session?.user?.googleId) return;
    fetch('/api/user/me').then((r) => r.json()).then((d) => {
      const user = d.user;
      const mainAcc = user?.pubgAccounts?.find((a) => a.id === user.mainAccountId);
      const nick = mainAcc?.nickname;
      if (nick) { setLinkedNickname(nick); setReplyForm((prev) => ({ ...prev, author: nick })); }
    }).catch(() => {});
  }, [session]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const [postRes, repliesRes] = await Promise.all([
        fetch(`/api/forum/posts?postId=${postId}`),
        fetch(`/api/forum/replies?postId=${postId}`),
      ]);
      if (postRes.ok) {
        const data = await postRes.json();
        setPost(data.post || null);
      }
      if (repliesRes.ok) {
        const data = await repliesRes.json();
        setReplies(data.replies || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyForm.author.trim()) { setReplyError(t('fpost.nickname_required')); return; }
    if (!replyForm.password.trim()) { setReplyError(t('fpost.password_required')); return; }
    if (replyForm.password.length < 4) { setReplyError(t('fpost.password_min')); return; }
    if (!replyForm.content.trim()) { setReplyError(t('fpost.content_required')); return; }
    setSubmittingReply(true);
    setReplyError('');
    try {
      const res = await fetch('/api/forum/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: parseInt(postId),
          content: replyForm.content,
          author: replyForm.author,
          password: replyForm.password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReplies((prev) => [...prev, data.reply]);
        setReplyForm({ content: '', author: '', password: '' });
        setPost((p) => p ? { ...p, replyCount: (p.replyCount || 0) + 1 } : p);
      } else {
        setReplyError(data.error || t('fpost.reply_failed'));
      }
    } catch {
      setReplyError(t('fpost.network_error'));
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleLike = async () => {
    if (!session?.user) {
      alert(t('fpost.login_required_alert'));
      return;
    }
    if (likeLoading || !post) return;
    setLikeLoading(true);
    const prevLiked = post.likedByMe;
    const prevCount = post.likes;
    // 낙관적 업데이트
    setPost((p) => p ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? p.likes - 1 : p.likes + 1 } : p);
    try {
      const res = await fetch(`/api/forum/likes?postId=${postId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPost((p) => p ? { ...p, likedByMe: data.liked, likes: data.likeCount } : p);
      } else {
        setPost((p) => p ? { ...p, likedByMe: prevLiked, likes: prevCount } : p);
        alert(data.error || t('fpost.request_failed'));
      }
    } catch {
      setPost((p) => p ? { ...p, likedByMe: prevLiked, likes: prevCount } : p);
      alert(t('fpost.network_error'));
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDelete = async (password) => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const isPost = deleteModal.type === 'post';
      const res = await fetch(isPost ? '/api/forum/posts' : '/api/forum/replies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isPost
            ? { postId: parseInt(postId), password }
            : { replyId: deleteModal.id, password }
        ),
      });
      const data = await res.json();
      if (res.ok) {
        if (isPost) {
          router.push('/forum');
        } else {
          setReplies((prev) => prev.filter((r) => r.id !== deleteModal.id));
          setPost((p) => p ? { ...p, replyCount: Math.max(0, (p.replyCount || 1) - 1) } : p);
          setDeleteModal(null);
        }
      } else {
        setDeleteError(data.error || t('fpost.delete_failed'));
      }
    } catch {
      setDeleteError(t('fpost.network_error'));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">{t('fpost.loading_post')}</p>
          </div>
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('fpost.post_not_found')}</h2>
            <Link href="/forum" className="text-blue-500 hover:underline text-sm">{t('fpost.back_to_forum')}</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{post.title} {t('fpost.title_suffix')}</title>
        <meta name="description" content={post.content?.substring(0, 160)} />
      </Head>
      <Header />

      {deleteModal && (
        <DeleteModal
          type={deleteModal.type}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteModal(null); setDeleteError(''); }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* 브레드크럼 */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/forum" className="hover:text-blue-600">{t('forum.breadcrumb_forum')}</Link>
            <span>›</span>
            <Link href={`/forum/category/${post.categoryId}`} className="hover:text-blue-600">
              {post.category?.name}
            </Link>
            <span>›</span>
            <span className="text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{post.title}</span>
          </nav>

          {/* 게시글 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{post.category?.icon}</span>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full font-medium">
                  {post.category?.name}
                </span>
                {post.isPinned && (
                  <span className="text-xs bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full">{t('fpost.pinned')}</span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">{post.title}</h1>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {post.author?.[0]?.toUpperCase()}
                    </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{post.author}</span>
                  </span>
                  <span className="hidden sm:inline">{formatDate(post.createdAt)}</span>
                  <span>👁 {post.views}</span>
                  <span>💬 {post.replyCount}</span>
                </div>
                {post.hasPassword && (
                  <button
                    onClick={() => setDeleteModal({ type: 'post', id: post.id })}
                    className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {t('fpost.delete')}
                  </button>
                )}
              </div>
            </div>

            {/* 본문 */}
            <div className="px-6 py-6 text-sm leading-7 min-h-[100px]">
              <PartyContent content={post.content} />
            </div>

            {/* 좋아요 */}
            <div className="px-6 pb-5 pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col items-center gap-1.5">
              <button
                onClick={handleToggleLike}
                disabled={likeLoading}
                className={`flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-semibold transition-colors disabled:opacity-60 ${
                  post.likedByMe
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-500'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-red-300 hover:text-red-400'
                }`}
              >
                <span>{post.likedByMe ? '❤️' : '🤍'}</span>
                <span>{t('fpost.likes_prefix').replace('{n}', post.likes ?? 0)}</span>
              </button>
              {!session?.user && (
                <p className="text-xs text-gray-400">{t('fpost.login_to_like')}</p>
              )}
            </div>
          </div>

          {/* 댓글 섹션 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">{t('fpost.reply_count').replace('{n}', replies.length)}</h2>
            </div>

            {/* 댓글 목록 */}
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {replies.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  {t('fpost.first_reply_hint')}
                </div>
              ) : (
                replies.map((reply) => (
                  <div key={reply.id} className="px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {reply.author?.[0]?.toUpperCase()}
                        </span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{reply.author}</span>
                        <span className="text-xs text-gray-400">{formatDate(reply.createdAt)}</span>
                      </div>
                      <button
                        onClick={() => setDeleteModal({ type: 'reply', id: reply.id })}
                        className="text-xs text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        {t('fpost.delete')}
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed ml-9 whitespace-pre-wrap">{reply.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* 댓글 작성 폼 */}
            <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('fpost.reply_write_title')}</h3>
              {replyError && (
                <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  ⚠️ {replyError}
                </div>
              )}
              <form onSubmit={handleSubmitReply} className="space-y-3">
                {/* 닉네임 + 비밀번호 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('form.nickname_label')} <span className="text-red-500">*</span>
                    </label>
                    {linkedNickname ? (
                      <div className="flex items-center gap-2 px-3 py-2 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">{linkedNickname}</span>
                        <span className="text-[11px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">{t('form.linked')}</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={replyForm.author}
                        onChange={(e) => setReplyForm((p) => ({ ...p, author: e.target.value }))}
                        placeholder={t('form.nickname_label')}
                        maxLength={20}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('form.delete_password_label')} <span className="text-red-500">*</span>
                      <span className="font-normal text-gray-400 ml-1">{t('fpost.min_4_chars')}</span>
                    </label>
                    <input
                      type="password"
                      value={replyForm.password}
                      onChange={(e) => setReplyForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder={t('fpost.reply_password_placeholder')}
                      maxLength={30}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>
                {/* 내용 + 작성 버튼 */}
                <div className="flex gap-3">
                  <textarea
                    value={replyForm.content}
                    onChange={(e) => setReplyForm((p) => ({ ...p, content: e.target.value }))}
                    placeholder={t('fpost.content_placeholder')}
                    rows={3}
                    maxLength={1000}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingReply}
                    className="px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition-colors self-end"
                  >
                    {submittingReply ? t('fpost.writing') : t('fpost.write')}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* 뒤로가기 */}
          <div className="mt-4">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              {t('fpost.back_to_list')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
