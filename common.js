// 学生页和老师页共用：读取作业、判分、和后台通信
(function () {
  const C = window.HW_CONFIG || {};
  const DEMO = !C.API_URL;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // 作业内容用班级口令加密，在浏览器里解开
  async function decrypt(enc, code) {
    const b = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: b(enc.salt), iterations: enc.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b(enc.iv) }, key, b(enc.data));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  async function loadLesson(id, code) {
    if (!/^[\w-]+$/.test(id)) throw new Error("作业编号不正确");
    const r = await fetch("lessons/" + id + ".json", { cache: "no-cache" });
    if (!r.ok) throw new Error("找不到这份作业（" + id + "）");
    const raw = await r.json();
    let lesson;
    try {
      lesson = await decrypt(raw.enc, String(code || "").trim().toUpperCase());
    } catch (e) {
      const err = new Error("班级口令不对 · Mã lớp không đúng");
      err.badCode = true;
      throw err;
    }
    return { lesson, key: lesson.key };
  }
  const CODE_KEY = "hw_class_code";
  const getCode = () => store(CODE_KEY) || "";
  const setCode = (c) => store(CODE_KEY, c ? String(c).trim().toUpperCase() : null);

  // 比较前统一格式：去掉空格和标点，全角转半角，“儿”化忽略
  function norm(s) {
    return String(s || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s　，。、？！,.?!；;：:“”"'‘’…（）()《》<>\-—_·~～]/g, "")
      .replace(/儿/g, "");
  }
  const hasAny = (a, group) => group.some((w) => a.includes(norm(w)));

  // 结果：right 对 / wrong 错 / pending 等老师批改
  function gradeUnit(spec, value) {
    if (!spec) return { status: "pending" };
    const v = value == null ? "" : String(value).trim();
    if ("answer" in spec) {
      if (!v) return { status: "wrong", reason: "未作答" };
      return v === spec.answer ? { status: "right" } : { status: "wrong" };
    }
    const a = norm(v);
    if (!a) return { status: "wrong", reason: "未作答" };
    if (spec.require && !spec.require.every((g) => hasAny(a, g))) {
      return { status: "wrong", reason: "没有用到“" + spec.require.map((g) => g.join(" / ")).join("”和“") + "”" };
    }
    if (spec.accept && spec.accept.some((x) => norm(x) === a)) return { status: "right" };
    if (spec.strict) return { status: "wrong" };
    if (spec.hit && spec.hit.every((g) => hasAny(a, g)) && !(spec.miss && hasAny(a, spec.miss))) {
      return { status: "right" };
    }
    return { status: "pending" };
  }

  function gradeAll(lesson, key, answers) {
    const res = {};
    const count = { right: 0, wrong: 0, pending: 0 };
    for (const u of lesson.units) {
      const r = gradeUnit(key[u.id], answers[u.id]);
      res[u.id] = r;
      count[r.status]++;
    }
    return { res, count };
  }

  function answerText(spec) {
    if (!spec) return "";
    if (spec.show) return spec.show;
    if (spec.accept && spec.accept.length) return spec.accept.join(" / ");
    return spec.ref || "";
  }

  // ---- 后台通信 ----
  const DEMO_STORE = "hw_demo_store";
  function demoLoad() {
    try { return JSON.parse(localStorage.getItem(DEMO_STORE)) || { subs: [], marks: [] }; }
    catch (e) { return { subs: [], marks: [] }; }
  }
  function demoSave(d) {
    try { localStorage.setItem(DEMO_STORE, JSON.stringify(d)); } catch (e) { /* 忽略 */ }
  }

  async function call(body) {
    if (DEMO) {
      const d = demoLoad();
      if (body.action === "submit") {
        const id = Math.random().toString(36).slice(2, 10);
        d.subs.push({ id, time: new Date().toISOString(), lesson: body.lesson, student: body.student, answers: body.answers });
        demoSave(d);
        return { ok: true, id };
      }
      if (body.action === "list") {
        return { ok: true, subs: d.subs.filter((s) => s.lesson === body.lesson), marks: d.marks };
      }
      if (body.action === "mark") {
        d.marks.push({ id: body.id, unit: body.unit, result: body.result, time: new Date().toISOString() });
        demoSave(d);
        return { ok: true };
      }
      return { ok: false, error: "未知操作" };
    }
    // 用 text/plain 发送，避免浏览器跨域预检；Apps Script 会照常读取
    const r = await fetch(C.API_URL, { method: "POST", body: JSON.stringify(body) });
    if (!r.ok) throw new Error("网络错误（" + r.status + "）");
    return r.json();
  }

  function store(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k));
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }

  function fmtTime(t) {
    const d = new Date(t);
    if (isNaN(d)) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  window.HW = { C, DEMO, esc, loadLesson, getCode, setCode, gradeUnit, gradeAll, answerText, call, store, fmtTime };
})();
