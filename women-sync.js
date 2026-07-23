// ============================================================================
// women-sync.js
// [B안] health_index0722.html / index_25_.html(dashboard) 공용 Women 동기화 로직.
// 두 페이지 모두 <script src="/women-sync.js"></script>로 이 파일을 먼저 불러온 뒤 사용한다.
//
// 전제(각 페이지에 이미 정의돼 있어야 함): 전역 변수 BACKEND, 전역 함수 checkReauthStatus(status).
// [수정] todayIso()는 페이지마다 있을 수도 없을 수도 있어 이 파일 자체에서 계산하도록 바꿈
// (index_25_.html에는 이 함수가 없어서 실제로 문제가 발생했었음).
//
// 사용법:
//   syncWomensFromBackend(function(){ /* 동기화 끝난 뒤 화면을 다시 그리는 코드 */ });
//
// 병합 규칙(★ 표시는 판단이 필요해서 임의로 정한 것 — 다르게 원하시면 이 파일만 고치면 됨):
//   - period_start / period_end: 값이 실제로 있는 행에서만 갱신, 없으면 이전 값 유지.
//     (한 날짜에 symptom 전용 SMS 행이 섞여도 period 상태가 false로 안 지워지도록. 이미 한 번
//      겪은 버그를 고친 부분이라 이 규칙은 되도록 그대로 유지 권장.)
//   - mode: 값이 있는 행에서만 갱신(마지막 것이 이김).
//   - symptoms: 그날의 모든 행에서 "이름:점수"를 계속 누적(마지막 행 채택이 아니라 합침).
//   - ovulation: period와 동일하게, 값이 있는 행에서만 true로(한 번 감지되면 유지).
//   - ov_test_result / preg_test_result: ★ "그날 마지막으로 값이 있던 행"을 채택(최신 결과가
//     이전 결과를 덮어씀 — 하루에 결과가 바뀌면 최신 걸 보여주는 게 자연스럽다고 판단).
//   - sex_count / orgasm_count / masturbation_count / morning_sickness_count: ★ 그날 여러 번
//     기록될 수 있는 "횟수" 개념이라 합산(sum)함. condom / sex_time은 "마지막 값" 채택.
//   - morning_sickness_severity: ★ "마지막 값" 채택(그날 안에서 심각도가 바뀌면 최신 걸 표시).
// ============================================================================

function syncWomensFromBackend(onDone) {
  // [수정] todayIso()에 의존하지 않고 이 파일 안에서 직접 계산(health_index0722.html의
  // todayIso()와 동일한 형식 — YYYY-MM-DD, 로컬 타임존).
  var n = new Date();
  var d = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
  fetch(BACKEND + '/api/me/health?date=' + d + '&period=all&tab=womens', { credentials: 'include' })
    .then(function (r) { checkReauthStatus(r.status); return r.ok ? r.json() : null; })
    .then(function (data) {
      var rows = (data && Array.isArray(data.womens)) ? data.womens : [];
      var toBool = function (v) { return v === true || v === 'TRUE' || v === 'true'; };
      var num = function (v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; };

      function blank() {
        return {
          date: '', mode: '', period_start: false, period_end: false, symptoms: {},
          ovulation: false, ov_test_result: '', preg_test_result: '',
          sex_count: 0, orgasm_count: 0, masturbation_count: 0, condom: '', sex_time: '',
          morning_sickness_count: 0, morning_sickness_severity: ''
        };
      }

      var merged = {}; // dateKey -> 위 blank() 형태
      rows.forEach(function (entry) {
        var dateKey = (entry.stamp_date || '').toString().slice(0, 10);
        if (!dateKey) return;
        if (!merged[dateKey]) merged[dateKey] = blank();
        var m = merged[dateKey];
        m.date = dateKey;

        if (entry.mode) m.mode = entry.mode;
        if (toBool(entry.period_start)) m.period_start = true;
        if (toBool(entry.period_end)) m.period_end = true;
        if (toBool(entry.ovulation)) m.ovulation = true;

        if (entry.symptom_severity) {
          (entry.symptom_severity + '').split(',').forEach(function (pair) {
            var parts = pair.split(':');
            var name = (parts[0] || '').trim();
            var sev = parseInt(parts[1]);
            if (name) m.symptoms[name] = isNaN(sev) ? 3 : sev;
          });
        }

        if (entry.ov_test_result)   m.ov_test_result   = entry.ov_test_result;
        if (entry.preg_test_result) m.preg_test_result = entry.preg_test_result;

        if (entry.sex_count)          m.sex_count          += num(entry.sex_count);
        if (entry.orgasm_count)       m.orgasm_count       += num(entry.orgasm_count);
        if (entry.masturbation_count) m.masturbation_count += num(entry.masturbation_count);
        if (entry.condom)             m.condom              = entry.condom;
        if (entry.sex_time)           m.sex_time            = entry.sex_time;

        if (entry.morning_sickness_count)    m.morning_sickness_count    += num(entry.morning_sickness_count);
        if (entry.morning_sickness_severity) m.morning_sickness_severity  = entry.morning_sickness_severity;
      });

      Object.keys(merged).forEach(function (dateKey) {
        var m = merged[dateKey];
        m.mode = m.mode || 'period';
        try { localStorage.setItem('mie_womens_' + dateKey, JSON.stringify(m)); } catch (e) {}
      });
    })
    .catch(function () {})
    .finally(function () { if (typeof onDone === 'function') onDone(); });
}

/**
 * localStorage에 저장된 Women 캐시 객체를 [{label, val}, ...] 배열로 변환 — addHealthRow(icon,label,val)
 * 같은 화면 표시 함수에 그대로 넘겨 쓸 수 있도록 두 페이지가 공용으로 쓰는 포맷터.
 */
function describeWomensCache(womensRaw) {
  var rows = [];
  if (!womensRaw) return rows;

  if (womensRaw.period_start) rows.push({ label: "Women's", val: 'Period Start' });
  if (womensRaw.period_end)   rows.push({ label: "Women's", val: 'Period End' });
  if (womensRaw.ovulation)    rows.push({ label: "Women's", val: 'Ovulation' });

  Object.keys(womensRaw.symptoms || {}).forEach(function (name) {
    rows.push({ label: "Women's", val: name + ' (' + womensRaw.symptoms[name] + '/5)' });
  });

  if (womensRaw.ov_test_result)   rows.push({ label: "Women's", val: 'Ovulation Test: ' + womensRaw.ov_test_result });
  if (womensRaw.preg_test_result) rows.push({ label: "Women's", val: 'Pregnancy Test: ' + womensRaw.preg_test_result });

  if (womensRaw.sex_count) {
    var sexParts = ['Sex x' + womensRaw.sex_count];
    if (womensRaw.condom) sexParts.push('Condom: ' + womensRaw.condom);
    if (womensRaw.orgasm_count) sexParts.push('Orgasm x' + womensRaw.orgasm_count);
    if (womensRaw.masturbation_count) sexParts.push('Masturbation x' + womensRaw.masturbation_count);
    rows.push({ label: "Women's", val: sexParts.join(', ') });
  }

  if (womensRaw.morning_sickness_count || womensRaw.morning_sickness_severity) {
    var msParts = [];
    if (womensRaw.morning_sickness_count) msParts.push('x' + womensRaw.morning_sickness_count);
    if (womensRaw.morning_sickness_severity) msParts.push(womensRaw.morning_sickness_severity);
    rows.push({ label: "Women's", val: 'Morning Sickness ' + msParts.join(' · ') });
  }

  if (!rows.length) rows.push({ label: "Women's", val: womensRaw.note || 'Period day' });
  return rows;
}
