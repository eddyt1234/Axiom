import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

// ─── Quote Card ───────────────────────────────────────────────────────────────

function QuoteCard({ quote, liked, likeCount, commentCount, onLike, onWriterClick, onCommentClick }) {
  return (
    <div style={s.card}>
      <p style={s.quoteText}>"{quote.text}"</p>
      <div style={s.cardFooter}>
        <button style={s.writerBtn} onClick={() => onWriterClick && onWriterClick(quote.writers)}>
          <span style={s.dash}>—</span> {quote.writers?.name}
          {quote.source && <span style={s.source}>, {quote.source}</span>}
        </button>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <button style={{ ...s.iconBtn, color: "#4a3e2a" }} onClick={() => onCommentClick(quote)}>
            ◎{commentCount > 0 ? ` ${commentCount}` : ""}
          </button>
          <button style={{ ...s.iconBtn, color: liked ? "#c8a96e" : "#4a3e2a" }} onClick={() => onLike(quote.id)}>
            {liked ? "♥" : "♡"}{likeCount > 0 ? ` ${likeCount}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Writer Card ──────────────────────────────────────────────────────────────

function WriterCard({ writer, following, onFollow, onClick }) {
  return (
    <div style={s.writerCard}>
      <div style={s.avatar} onClick={() => onClick(writer)}>{writer.name[0]}</div>
      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onClick(writer)}>
        <p style={s.writerName}>{writer.name}</p>
        <p style={s.writerMeta}>{writer.category} · {writer.born}–{writer.died || "present"}</p>
      </div>
      <button
        style={{ ...s.pill, background: following ? "transparent" : "#c8a96e", color: following ? "#c8a96e" : "#13100d", border: "1px solid #c8a96e" }}
        onClick={() => onFollow(writer.id)}
      >
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({ page, setPage }) {
  const tabs = [
    { id: "feed", label: "Feed", icon: "⊞" },
    { id: "search", label: "Search", icon: "◎" },
    { id: "profile", label: "Profile", icon: "◯" },
  ];
  return (
    <div style={s.nav}>
      {tabs.map(t => (
        <button key={t.id} style={{ ...s.navBtn, color: page === t.id ? "#c8a96e" : "#4a3e2a" }} onClick={() => setPage(t.id)}>
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span style={{ fontSize: 10, letterSpacing: "0.06em" }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Auth Page ────────────────────────────────────────────────────────────────

function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        if (!username.trim()) throw new Error("Please enter a username");
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").insert({ id: data.user.id, username: username.trim() });
          if (profileError && !profileError.message.includes("duplicate")) throw profileError;
          onAuth(data.user);
        } else {
          setError("Check your email to confirm your account, then sign in.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.user);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={s.authWrap}>
      <div style={s.authBox}>
        <h1 style={s.authLogo}>Axiom</h1>
        <p style={s.authTagline}>Wisdom worth reading.</p>
        <div style={s.toggle}>
          {["login", "signup"].map(m => (
            <button key={m} style={{ ...s.toggleBtn, background: mode === m ? "#c8a96e" : "transparent", color: mode === m ? "#13100d" : "#6b5e45" }} onClick={() => { setMode(m); setError(""); }}>
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
        {mode === "signup" && <input style={s.input} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />}
        <input style={s.input} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={s.input} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        {error && <p style={s.error}>{error}</p>}
        <button style={s.submitBtn} onClick={submit} disabled={loading}>{loading ? "…" : mode === "login" ? "Sign in" : "Create account"}</button>
      </div>
    </div>
  );
}

// ─── Comments Page ────────────────────────────────────────────────────────────

function CommentsPage({ quote, userId, onBack }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); // { id, username }
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => { loadComments(); }, [quote.id]);

  async function loadComments() {
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(username)")
      .eq("quote_id", quote.id)
      .order("created_at", { ascending: true });
    setComments(data || []);
    setLoading(false);
  }

  async function submit() {
    if (!text.trim()) return;
    const { data, error } = await supabase
      .from("comments")
      .insert({ quote_id: quote.id, user_id: userId, parent_id: replyingTo?.id || null, text: text.trim() })
      .select("*, profiles(username)");
    if (!error && data?.[0]) {
      setComments(prev => [...prev, data[0]]);
      setText("");
      setReplyingTo(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  async function deleteComment(commentId) {
    await supabase.from("comments").delete().eq("id", commentId).eq("user_id", userId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  }

  const topLevel = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }

  function CommentItem({ comment, depth }) {
    const replies = getReplies(comment.id);
    const isOwn = comment.user_id === userId;
    return (
      <div style={{ marginLeft: depth > 0 ? 20 : 0, marginBottom: 8 }}>
        <div style={{ ...s.commentCard, borderLeft: depth > 0 ? "2px solid #2a2218" : "none", paddingLeft: depth > 0 ? 14 : 0, background: "transparent", border: "none" }}>
          <div style={s.commentHeader}>
            <span style={s.commentUser}>@{comment.profiles?.username}</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={s.commentTime}>{timeAgo(comment.created_at)}</span>
              {isOwn && (
                <button style={s.deleteBtn} onClick={() => deleteComment(comment.id)}>×</button>
              )}
            </div>
          </div>
          <p style={s.commentText}>{comment.text}</p>
          <button
            style={{ ...s.replyBtn, color: replyingTo?.id === comment.id ? "#c8a96e" : "#4a3e2a" }}
            onClick={() => setReplyingTo(replyingTo?.id === comment.id ? null : { id: comment.id, username: comment.profiles?.username })}
          >
            {replyingTo?.id === comment.id ? "Cancel" : "Reply"}
          </button>
        </div>
        {replies.map(r => <CommentItem key={r.id} comment={r} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <div style={{ ...s.page, paddingBottom: 130 }}>
      {/* Header with quote */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <div style={{ ...s.card, marginBottom: 0 }}>
          <p style={{ ...s.quoteText, fontSize: 16, marginBottom: 10 }}>"{quote.text}"</p>
          <p style={{ color: "#c8a96e", fontSize: 13 }}>— {quote.writers?.name}</p>
        </div>
      </div>

      {/* Comments list */}
      <div style={{ padding: "16px 24px" }}>
        {loading && <p style={s.empty}>Loading…</p>}
        {!loading && comments.length === 0 && (
          <p style={s.empty}>No comments yet.<br />Start the discussion below.</p>
        )}
        {topLevel.map(c => <CommentItem key={c.id} comment={c} depth={0} />)}
        <div ref={bottomRef} />
      </div>

      {/* Fixed input at bottom */}
      <div style={s.commentInputWrap}>
        {replyingTo && (
          <div style={s.replyBanner}>
            <span>Replying to <span style={{ color: "#c8a96e" }}>@{replyingTo.username}</span></span>
            <button style={s.cancelReply} onClick={() => setReplyingTo(null)}>×</button>
          </div>
        )}
        <div style={s.commentRow}>
          <input
            style={s.commentInput}
            placeholder={replyingTo ? `Reply to @${replyingTo.username}…` : "Add a comment…"}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            autoFocus
          />
          <button style={{ ...s.sendBtn, opacity: text.trim() ? 1 : 0.4 }} onClick={submit}>→</button>
        </div>
      </div>
    </div>
  );
}

// ─── Feed Page ────────────────────────────────────────────────────────────────

function FeedPage({ userId, onWriterClick, onCommentClick }) {
  const [quotes, setQuotes] = useState([]);
  const [likes, setLikes] = useState(new Set());
  const [likeCounts, setLikeCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [followingAny, setFollowingAny] = useState(false);

  useEffect(() => { load(); }, [userId]);

  async function load() {
    setLoading(true);
    const { data: follows } = await supabase.from("follows").select("writer_id").eq("user_id", userId);
    const ids = follows?.map(f => f.writer_id) || [];
    setFollowingAny(ids.length > 0);

    let q = supabase.from("quotes").select("*, writers(id, name, category)").order("id", { ascending: false }).limit(60);
    if (ids.length > 0) q = q.in("writer_id", ids);
    const { data: quotesData } = await q;
    setQuotes(quotesData || []);

    const { data: myLikes } = await supabase.from("likes").select("quote_id").eq("user_id", userId);
    setLikes(new Set(myLikes?.map(l => l.quote_id) || []));

    const { data: allLikes } = await supabase.from("likes").select("quote_id");
    const lc = {};
    allLikes?.forEach(l => { lc[l.quote_id] = (lc[l.quote_id] || 0) + 1; });
    setLikeCounts(lc);

    const { data: allComments } = await supabase.from("comments").select("quote_id");
    const cc = {};
    allComments?.forEach(c => { cc[c.quote_id] = (cc[c.quote_id] || 0) + 1; });
    setCommentCounts(cc);

    setLoading(false);
  }

  async function toggleLike(quoteId) {
    const isLiked = likes.has(quoteId);
    if (isLiked) {
      await supabase.from("likes").delete().eq("user_id", userId).eq("quote_id", quoteId);
      setLikes(p => { const n = new Set(p); n.delete(quoteId); return n; });
      setLikeCounts(p => ({ ...p, [quoteId]: Math.max((p[quoteId] || 1) - 1, 0) }));
    } else {
      await supabase.from("likes").insert({ user_id: userId, quote_id: quoteId });
      setLikes(p => new Set([...p, quoteId]));
      setLikeCounts(p => ({ ...p, [quoteId]: (p[quoteId] || 0) + 1 }));
    }
  }

  if (loading) return <div style={s.loading}>Loading your feed…</div>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.logo}>Axiom</h1>
        {!followingAny && <p style={s.hint}>Follow writers on the Search tab to curate your feed ↓</p>}
      </div>
      <div style={s.feed}>
        {quotes.length === 0 && <p style={s.empty}>No quotes yet — follow some writers to get started.</p>}
        {quotes.map(q => (
          <QuoteCard
            key={q.id} quote={q}
            liked={likes.has(q.id)} likeCount={likeCounts[q.id] || 0}
            commentCount={commentCounts[q.id] || 0}
            onLike={toggleLike} onWriterClick={onWriterClick} onCommentClick={onCommentClick}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Search Page ──────────────────────────────────────────────────────────────

function SearchPage({ userId, onWriterClick }) {
  const [query, setQuery] = useState("");
  const [writers, setWriters] = useState([]);
  const [follows, setFollows] = useState(new Set());

  useEffect(() => { loadAll(); }, [userId]);

  async function loadAll() {
    const { data: w } = await supabase.from("writers").select("*").order("name");
    setWriters(w || []);
    const { data: f } = await supabase.from("follows").select("writer_id").eq("user_id", userId);
    setFollows(new Set(f?.map(x => x.writer_id) || []));
  }

  async function search(q) {
    setQuery(q);
    const { data } = q.trim()
      ? await supabase.from("writers").select("*").ilike("name", `%${q}%`).order("name")
      : await supabase.from("writers").select("*").order("name");
    setWriters(data || []);
  }

  async function toggleFollow(writerId) {
    if (follows.has(writerId)) {
      await supabase.from("follows").delete().eq("user_id", userId).eq("writer_id", writerId);
      setFollows(p => { const n = new Set(p); n.delete(writerId); return n; });
    } else {
      await supabase.from("follows").insert({ user_id: userId, writer_id: writerId });
      setFollows(p => new Set([...p, writerId]));
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.pageTitle}>Discover</h2>
        <input style={s.searchInput} placeholder="Search writers and thinkers…" value={query} onChange={e => search(e.target.value)} />
      </div>
      <div style={s.feed}>
        {writers.map(w => (
          <WriterCard key={w.id} writer={w} following={follows.has(w.id)} onFollow={toggleFollow} onClick={onWriterClick} />
        ))}
      </div>
    </div>
  );
}

// ─── Writer Page ──────────────────────────────────────────────────────────────

function WriterPage({ writer, userId, onBack, onCommentClick }) {
  const [quotes, setQuotes] = useState([]);
  const [likes, setLikes] = useState(new Set());
  const [likeCounts, setLikeCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [following, setFollowing] = useState(false);

  useEffect(() => { load(); }, [writer.id]);

  async function load() {
    const { data: q } = await supabase.from("quotes").select("*, writers(id, name)").eq("writer_id", writer.id).order("id");
    setQuotes(q || []);
    const { data: f } = await supabase.from("follows").select("writer_id").eq("user_id", userId).eq("writer_id", writer.id);
    setFollowing(f?.length > 0);
    const { data: l } = await supabase.from("likes").select("quote_id").eq("user_id", userId);
    setLikes(new Set(l?.map(x => x.quote_id) || []));
    const { data: all } = await supabase.from("likes").select("quote_id");
    const lc = {};
    all?.forEach(x => { lc[x.quote_id] = (lc[x.quote_id] || 0) + 1; });
    setLikeCounts(lc);
    const { data: allC } = await supabase.from("comments").select("quote_id");
    const cc = {};
    allC?.forEach(x => { cc[x.quote_id] = (cc[x.quote_id] || 0) + 1; });
    setCommentCounts(cc);
  }

  async function toggleFollow() {
    if (following) {
      await supabase.from("follows").delete().eq("user_id", userId).eq("writer_id", writer.id);
    } else {
      await supabase.from("follows").insert({ user_id: userId, writer_id: writer.id });
    }
    setFollowing(!following);
  }

  async function toggleLike(quoteId) {
    const isLiked = likes.has(quoteId);
    if (isLiked) {
      await supabase.from("likes").delete().eq("user_id", userId).eq("quote_id", quoteId);
      setLikes(p => { const n = new Set(p); n.delete(quoteId); return n; });
      setLikeCounts(p => ({ ...p, [quoteId]: Math.max((p[quoteId] || 1) - 1, 0) }));
    } else {
      await supabase.from("likes").insert({ user_id: userId, quote_id: quoteId });
      setLikes(p => new Set([...p, quoteId]));
      setLikeCounts(p => ({ ...p, [quoteId]: (p[quoteId] || 0) + 1 }));
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <div style={s.writerHero}>
          <div style={s.avatarLg}>{writer.name[0]}</div>
          <div style={{ flex: 1 }}>
            <h2 style={s.writerNameLg}>{writer.name}</h2>
            <p style={s.writerMeta}>{writer.category} · {writer.born}–{writer.died || "present"}</p>
            {writer.bio && <p style={s.writerBio}>{writer.bio}</p>}
          </div>
          <button style={{ ...s.pill, background: following ? "transparent" : "#c8a96e", color: following ? "#c8a96e" : "#13100d", border: "1px solid #c8a96e" }} onClick={toggleFollow}>
            {following ? "Following" : "Follow"}
          </button>
        </div>
      </div>
      <div style={s.feed}>
        {quotes.map(q => (
          <QuoteCard key={q.id} quote={q} liked={likes.has(q.id)} likeCount={likeCounts[q.id] || 0}
            commentCount={commentCounts[q.id] || 0} onLike={toggleLike} onWriterClick={() => {}} onCommentClick={onCommentClick} />
        ))}
      </div>
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

function ProfilePage({ userId, onSignOut, onWriterClick }) {
  const [profile, setProfile] = useState(null);
  const [liked, setLiked] = useState([]);
  const [following, setFollowing] = useState([]);
  const [tab, setTab] = useState("liked");

  useEffect(() => { load(); }, [userId]);

  async function load() {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(p);
    const { data: l } = await supabase.from("likes").select("quotes(id, text, source, writers(name))").eq("user_id", userId);
    setLiked(l?.map(x => x.quotes).filter(Boolean) || []);
    const { data: f } = await supabase.from("follows").select("writers(id, name, category, born, died)").eq("user_id", userId);
    setFollowing(f?.map(x => x.writers).filter(Boolean) || []);
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.writerHero}>
          <div style={s.avatarLg}>{(profile?.username || "?")[0].toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <h2 style={s.writerNameLg}>{profile?.username}</h2>
            <p style={s.writerMeta}>{following.length} following · {liked.length} liked</p>
          </div>
          <button style={s.signOutBtn} onClick={onSignOut}>Sign out</button>
        </div>
        <div style={s.tabRow}>
          {["liked", "following"].map(t => (
            <button key={t} style={{ ...s.tabBtn, color: tab === t ? "#c8a96e" : "#4a3e2a", borderBottom: tab === t ? "2px solid #c8a96e" : "2px solid transparent" }} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div style={s.feed}>
        {tab === "liked" && liked.length === 0 && <p style={s.empty}>No liked quotes yet — heart some quotes on your feed.</p>}
        {tab === "liked" && liked.map((q, i) => (
          <div key={i} style={s.card}>
            <p style={s.quoteText}>"{q.text}"</p>
            <p style={{ ...s.writerMeta, marginTop: 12 }}>— {q.writers?.name}{q.source ? `, ${q.source}` : ""}</p>
          </div>
        ))}
        {tab === "following" && following.length === 0 && <p style={s.empty}>Not following anyone yet — discover writers on the Search tab.</p>}
        {tab === "following" && following.map(w => (
          <div key={w.id} style={s.writerCard} onClick={() => onWriterClick(w)}>
            <div style={s.avatar}>{w.name[0]}</div>
            <div>
              <p style={s.writerName}>{w.name}</p>
              <p style={s.writerMeta}>{w.category} · {w.born}–{w.died || "present"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page: { paddingBottom: 80, minHeight: "100vh", background: "#13100d" },
  header: { position: "sticky", top: 0, background: "#13100d", zIndex: 10, padding: "20px 24px 0", borderBottom: "1px solid #1e1a14" },
  feed: { padding: "16px 24px" },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "70vh", color: "#c8a96e", fontFamily: "'DM Serif Display', serif", fontSize: 20, background: "#13100d" },
  empty: { color: "#4a3e2a", textAlign: "center", padding: "48px 0", fontSize: 14, lineHeight: 1.8 },

  authWrap: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24, background: "#13100d" },
  authBox: { width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 },
  authLogo: { fontFamily: "'DM Serif Display', serif", fontSize: 58, color: "#f0e6d0", textAlign: "center" },
  authTagline: { color: "#4a3e2a", textAlign: "center", fontSize: 14, marginBottom: 20 },
  toggle: { display: "flex", background: "#1d1810", border: "1px solid #2a2218", borderRadius: 10, padding: 3, gap: 2, marginBottom: 4 },
  toggleBtn: { flex: 1, border: "none", borderRadius: 7, padding: "9px 0", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  input: { background: "#1d1810", border: "1px solid #2a2218", borderRadius: 10, padding: "14px 16px", color: "#e8dcc8", fontSize: 15, fontFamily: "'DM Sans', sans-serif", width: "100%" },
  error: { color: "#a06060", fontSize: 13 },
  submitBtn: { background: "#c8a96e", border: "none", color: "#13100d", borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 4 },

  card: { background: "#1a1610", border: "1px solid #1e1a14", borderRadius: 14, padding: "24px 20px", marginBottom: 10 },
  quoteText: { fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#f0e6d0", lineHeight: 1.65, marginBottom: 18, fontStyle: "italic" },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  writerBtn: { background: "transparent", border: "none", color: "#c8a96e", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left", padding: 0 },
  dash: { color: "#4a3e2a" },
  source: { color: "#4a3e2a" },
  iconBtn: { background: "transparent", border: "none", fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "color 0.15s", flexShrink: 0 },

  writerCard: { display: "flex", alignItems: "center", gap: 14, background: "#1a1610", border: "1px solid #1e1a14", borderRadius: 14, padding: "16px 18px", marginBottom: 10, cursor: "pointer" },
  avatar: { width: 46, height: 46, borderRadius: "50%", background: "#2a2218", border: "1px solid #3d3020", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#c8a96e", flexShrink: 0 },
  avatarLg: { width: 58, height: 58, borderRadius: "50%", background: "#2a2218", border: "1px solid #3d3020", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Serif Display', serif", fontSize: 28, color: "#c8a96e", flexShrink: 0 },
  writerName: { color: "#e8dcc8", fontSize: 15, fontWeight: 500, marginBottom: 3 },
  writerNameLg: { fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#f0e6d0", marginBottom: 4 },
  writerMeta: { color: "#4a3e2a", fontSize: 12 },
  writerBio: { color: "#7a6e5a", fontSize: 13, marginTop: 8, lineHeight: 1.6 },
  writerHero: { display: "flex", gap: 16, alignItems: "flex-start", paddingBottom: 20, flexWrap: "wrap" },
  pill: { borderRadius: 20, padding: "7px 18px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 },
  signOutBtn: { background: "transparent", border: "1px solid #2a2218", color: "#4a3e2a", borderRadius: 20, padding: "7px 16px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginLeft: "auto", flexShrink: 0 },
  backBtn: { background: "transparent", border: "none", color: "#c8a96e", fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 16, padding: 0 },

  nav: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#13100d", borderTop: "1px solid #1e1a14", display: "flex", padding: "8px 0 16px", zIndex: 100 },
  navBtn: { flex: 1, background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "'DM Sans', sans-serif", transition: "color 0.15s" },

  logo: { fontFamily: "'DM Serif Display', serif", fontSize: 30, color: "#f0e6d0", marginBottom: 8 },
  pageTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 30, color: "#f0e6d0", marginBottom: 14 },
  hint: { color: "#4a3e2a", fontSize: 12, marginBottom: 12 },
  searchInput: { width: "100%", background: "#1a1610", border: "1px solid #1e1a14", borderRadius: 10, padding: "12px 16px", color: "#e8dcc8", fontSize: 15, fontFamily: "'DM Sans', sans-serif", marginBottom: 16 },
  tabRow: { display: "flex" },
  tabBtn: { flex: 1, background: "transparent", border: "none", borderBottom: "2px solid transparent", padding: "12px 0", fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },

  // Comments
  commentCard: { marginBottom: 4 },
  commentHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  commentUser: { color: "#c8a96e", fontSize: 13, fontWeight: 500 },
  commentTime: { color: "#3a3020", fontSize: 11 },
  commentText: { color: "#c8b89a", fontSize: 14, lineHeight: 1.6, marginBottom: 6 },
  replyBtn: { background: "transparent", border: "none", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0 },
  deleteBtn: { background: "transparent", border: "none", color: "#3a3020", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 },
  commentInputWrap: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#13100d", borderTop: "1px solid #1e1a14", padding: "10px 16px 24px", zIndex: 100 },
  replyBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#6b5e45", marginBottom: 8 },
  cancelReply: { background: "transparent", border: "none", color: "#6b5e45", fontSize: 18, cursor: "pointer", lineHeight: 1 },
  commentRow: { display: "flex", gap: 10, alignItems: "center" },
  commentInput: { flex: 1, background: "#1a1610", border: "1px solid #2a2218", borderRadius: 22, padding: "11px 18px", color: "#e8dcc8", fontSize: 14, fontFamily: "'DM Sans', sans-serif" },
  sendBtn: { background: "#c8a96e", border: "none", color: "#13100d", width: 40, height: 40, borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "opacity 0.15s" },
};

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("feed");
  const [selectedWriter, setSelectedWriter] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [prevPage, setPrevPage] = useState("feed");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const openWriter = (writer) => { setSelectedWriter(writer); setPage("writer"); };
  const openComments = (quote) => { setSelectedQuote(quote); setPrevPage(page); setPage("comments"); };
  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setPage("feed"); };

  if (loading) return <div style={s.loading}>Loading…</div>;
  if (!user) return <AuthPage onAuth={setUser} />;

  const showNav = page !== "writer" && page !== "comments";

  return (
    <div style={{ background: "#13100d", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #13100d; }
        input { outline: none; }
        input::placeholder { color: #3a3020; }
      `}</style>

      {page === "feed" && <FeedPage userId={user.id} onWriterClick={openWriter} onCommentClick={openComments} />}
      {page === "search" && <SearchPage userId={user.id} onWriterClick={openWriter} />}
      {page === "profile" && <ProfilePage userId={user.id} onSignOut={signOut} onWriterClick={openWriter} />}
      {page === "writer" && selectedWriter && <WriterPage writer={selectedWriter} userId={user.id} onBack={() => setPage("feed")} onCommentClick={openComments} />}
      {page === "comments" && selectedQuote && <CommentsPage quote={selectedQuote} userId={user.id} onBack={() => setPage(prevPage)} />}

      {showNav && <BottomNav page={page} setPage={setPage} />}
    </div>
  );
}
