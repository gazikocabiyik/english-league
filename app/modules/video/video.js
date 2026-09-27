// Video + anlama: sorular sınıf seviyesine göre, yoksa A2.
export function videoQuestions(video, level) {
  const q = video?.questions ?? {};
  return q[level] ?? q.A2 ?? [];
}
