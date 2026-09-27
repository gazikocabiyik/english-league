const tests = [];
export function test(name, fn) { tests.push({ name, fn }); }
export function eq(a, b, msg = '') {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x !== y) throw new Error(`${msg} beklenen ${y}, gelen ${x}`);
}
export function ok(v, msg = 'doğru bekleniyordu') { if (!v) throw new Error(msg); }
export function throws(fn, msg = 'hata bekleniyordu') {
  try { fn(); } catch { return; }
  throw new Error(msg);
}
export async function run(log = console.log) {
  let fail = 0;
  for (const t of tests) {
    try { await t.fn(); log(`ok   ${t.name}`); }
    catch (e) { fail++; log(`FAIL ${t.name}: ${e.message}`); }
  }
  log(`${tests.length - fail}/${tests.length} geçti`);
  return fail;
}
