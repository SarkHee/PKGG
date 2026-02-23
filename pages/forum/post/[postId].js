import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../../components/layout/Header';

function DeleteModal({ type, onConfirm, onCancel, loading, error }) {
  const [password, setPassword] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {type === 'post' ? '게시글 삭제' : '댓글 삭제'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          작성 시 입력한 비밀번호를 입력하세요.<br />
          삭제 후 복구할 수 없습니다.
        </p>
        {error && <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-300"
          onKeyDown={(e) => e.key === 'Enter' && onConfirm(password)}
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            취소
          </button>
          <button
            onClick={() => onConfirm(password)}
            disabled={loading || !password}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? '삭제 중...' : '삭제'}
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

function formatContent(content) {
  return content.split('\n').map((line, i) => {
    // 이미지 마크다운: ![alt](url)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      return (
        <div key={i} className="my-3">
          <img
            src={imgMatch[2]}
            alt={imgMatch[1] || '이미지'}
            className="max-w-full rounded-xl border border-gray-200 shadow-sm"
            style={{ maxHeight: '500px', objectFit: 'contain' }}
          />
        </div>
      );
    }
    return line.trim() ? (
      <p key={i} className="mb-2 text-gray-800 leading-relaxed">{line}</p>
    ) : (
      <div key={i} className="mb-2" />
    );
  });
}

export default function PostDetail() {
  const router = useRouter();
  const { postId } = router.query;

  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyForm, setReplyForm] = useState({ content: '', author: '', password: '' });
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [deleteModal, setDeleteModal] = useState(null); // { type: 'post' | 'reply', id }
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (postId) fetchPost();
  }, [postId]);

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
    if (!replyForm.content.trim()) { setReplyError('내용을 입력해주세요.'); return; }
    if (!replyForm.author.trim()) { setReplyError('닉네임을 입력해주세요.'); return; }
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
          password: replyForm.password || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReplies((prev) => [...prev, data.reply]);
        setReplyForm({ content: '', author: '', password: '' });
        setPost((p) => p ? { ...p, replyCount: (p.replyCount || 0) + 1 } : p);
      } else {
        setReplyError(data.error || '댓글 작성에 실패했습니다.');
      }
    } catch {
      setReplyError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmittingReply(false);
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
        setDeleteError(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      setDeleteError('네트워크 오류가 발생했습니다.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">게시글을 불러오는 중...</p>
          </div>
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">게시글을 찾을 수 없습니다</h2>
            <Link href="/forum" className="text-blue-500 hover:underline text-sm">포럼으로 돌아가기</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{post.title} | PK.GG 커뮤니티</title>
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

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* 브레드크럼 */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/forum" className="hover:text-blue-600">포럼</Link>
            <span>›</span>
            <Link href={`/forum/category/${post.categoryId}`} className="hover:text-blue-600">
              {post.category?.name}
            </Link>
            <span>›</span>
            <span className="text-gray-800 truncate max-w-[200px]">{post.title}</span>
          </nav>

          {/* 게시글 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{post.category?.icon}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                  {post.category?.name}
                </span>
                {post.isPinned && (
                  <span className="text-xs bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full">📌 공지</span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{post.title}</h1>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {post.author?.[0]?.toUpperCase()}
                    </span>
                    <span className="font-medium text-gray-700">{post.author}</span>
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
                    삭제
                  </button>
                )}
              </div>
            </div>

            {/* 본문 */}
            <div className="px-6 py-6 text-sm leading-7 min-h-[100px]">
              {formatContent(post.content)}
            </div>
          </div>

          {/* 댓글 섹션 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-base">댓글 {replies.length}개</h2>
            </div>

            {/* 댓글 목록 */}
            <div className="divide-y divide-gray-50">
              {replies.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  첫 번째 댓글을 남겨보세요
                </div>
              ) : (
                replies.map((reply) => (
                  <div key={reply.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {reply.author?.[0]?.toUpperCase()}
                        </span>
                        <span className="font-semibold text-gray-800 text-sm">{reply.author}</span>
                        <span className="text-xs text-gray-400">{formatDate(reply.createdAt)}</span>
                      </div>
                      <button
                        onClick={() => setDeleteModal({ type: 'reply', id: reply.id })}
                        className="text-xs text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        삭제
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed ml-9 whitespace-pre-wrap">{reply.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* 댓글 작성 폼 */}
            <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">댓글 작성</h3>
              {replyError && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {replyError}
                </div>
              )}
              <form onSubmit={handleSubmitReply} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={replyForm.author}
                    onChange={(e) => setReplyForm((p) => ({ ...p, author: e.target.value }))}
                    placeholder="닉네임 *"
                    maxLength={20}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                  />
                  <input
                    type="password"
                    value={replyForm.password}
                    onChange={(e) => setReplyForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="삭제 비밀번호 (선택)"
                    maxLength={30}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                  />
                </div>
                <div className="flex gap-3">
                  <textarea
                    value={replyForm.content}
                    onChange={(e) => setReplyForm((p) => ({ ...p, content: e.target.value }))}
                    placeholder="댓글을 입력하세요..."
                    rows={3}
                    maxLength={1000}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none bg-white"
                  />
                  <button
                    type="submit"
                    disabled={submittingReply}
                    className="px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition-colors self-end"
                  >
                    {submittingReply ? '작성 중...' : '작성'}
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
              ← 목록으로
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
