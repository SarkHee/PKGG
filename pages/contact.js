import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/layout/Header';
import { useT } from '../utils/i18n';

export default function ContactPage() {
  const { t } = useT();
  const TOPICS = [
    { id: 'bug',     label: t('contact.topic.bug'),     icon: '🐛' },
    { id: 'feature', label: t('contact.topic.feature'), icon: '💡' },
    { id: 'data',    label: t('contact.topic.data'),    icon: '📊' },
    { id: 'forum',   label: t('contact.topic.forum'),   icon: '🚨' },
    { id: 'other',   label: t('contact.topic.other'),   icon: '📬' },
  ];
  const TOPIC_HINTS = {
    bug: t('contact.hint.bug'),
    data: t('contact.hint.data'),
    forum: t('contact.hint.forum'),
    feature: t('contact.hint.feature'),
    other: t('contact.hint.other'),
  };
  const [topic,    setTopic]    = useState('');
  const [message,  setMessage]  = useState('');
  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic)              return setError(t('contact.topic_required'));
    if (message.trim().length < 5) return setError(t('contact.content_min'));
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, message, email }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
      } else {
        setError(data.error || t('contact.send_failed'));
      }
    } catch {
      setError(t('contact.network_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('contact.title')}</title>
        <meta name="description" content={t('contact.meta_desc')} />
      </Head>
      <Header />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">

          <div>
            <Link href="/" className="text-sm text-blue-600 hover:underline mb-3 inline-block">
              {t('contact.back_home')}
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('contact.heading')}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('contact.subheading')}</p>
          </div>

          {done ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-green-200 dark:border-green-800 p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{t('contact.done_title')}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('contact.done_desc')}</div>
              <button
                onClick={() => { setDone(false); setTopic(''); setMessage(''); setEmail(''); }}
                className="mt-5 px-5 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                {t('contact.more_inquiry')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
              {/* 문의 유형 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('contact.topic_label')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TOPICS.map((tp) => (
                    <button
                      key={tp.id}
                      type="button"
                      onClick={() => setTopic(tp.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        topic === tp.id
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-semibold'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span>{tp.icon}</span>
                      <span>{tp.label}</span>
                    </button>
                  ))}
                </div>
                {topic && TOPIC_HINTS[topic] && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{TOPIC_HINTS[topic]}</p>
                )}
              </div>

              {/* 내용 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('contact.content_label')}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder={t('contact.content_placeholder')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>

              {/* 이메일 (선택) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('contact.email_label')} <span className="text-gray-400 dark:text-gray-500 font-normal">{t('contact.optional')}</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-400"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {loading ? t('contact.sending') : t('contact.send')}
              </button>
            </form>
          )}

          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('contact.response_title')}</p>
            <p>
              {t('contact.response_desc')}
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
