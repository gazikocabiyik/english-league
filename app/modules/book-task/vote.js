// True/False takım oylaması: her takım TRUE ya da FALSE işaretler; cevap açılınca doğru bilen bütün takımlar kazanır.
// votes: { takımId: true|false } (işaretlenmeyen takım yok sayılır)
export function scoreVotes(votes, answer) {
  const attempts = Object.entries(votes).map(([teamId, v]) => ({ teamId, ok: v === answer }));
  return { winners: attempts.filter(a => a.ok).map(a => a.teamId), attempts };
}
