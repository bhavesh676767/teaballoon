const getRedditComments = async (subreddit, postId) => {
  try {
    const res = await fetch(`https://www.reddit.com/r/${subreddit}/comments/${postId}.json?sort=top`, {
      headers: { "User-Agent": "TeaBalloonBot/1.0.0" }
    });
    console.log(res.status)
    const data = await res.json();
    let rawComments = data[1].data.children
      .map(child => child.data)
      .filter(c => c.body && c.body.length > 5 && c.body !== "[deleted]" && c.body !== "[removed]");
      
    if (rawComments.length === 0) return [];

    rawComments = rawComments.sort((a, b) => (b.score || 0) - (a.score || 0));
    const highestScore = rawComments[0].score || 0;

    let bestComments = rawComments.filter(c => c.score >= 50 || c.score >= (highestScore * 0.15));

    if (bestComments.length === 0) {
      bestComments = rawComments.slice(0, Math.min(2, rawComments.length));
    }

    return bestComments.slice(0, 6).map(c => c.body);
  } catch (err) {
    console.error("red err", err)
    return [];
  }
}

fetch('https://www.reddit.com/r/confessions/top.json?limit=1').then(r=>r.json()).then(r => {
    const id = r.data.children[0].data.id;
    console.log("Post ID", id);
    getRedditComments("confessions", id).then(console.log);
})
