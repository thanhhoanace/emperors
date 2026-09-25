// Display names (Vietnamese) for the characters of the 219 scenario, for the HUD only.
// Source: docs/product/characters.md (tables and reserve lists); tests/runtime.test.mjs keeps the two in step and checks
// that every character in data/scenario/characters.json, gates.json and the RuntimeEvent fixtures has a name.
(function (root) {
  const NAMES = {
    // Tào
    cao_cao: 'Tào Tháo', cao_pi: 'Tào Phi', cao_ren: 'Tào Nhân', zhang_he: 'Trương Hợp', xiahou_dun: 'Hạ Hầu Đôn',
    zhang_liao: 'Trương Liêu', zang_ba: 'Tang Bá', li_dian: 'Lý Điển', xu_huang: 'Từ Hoảng', yue_jin: 'Nhạc Tiến', sima_yi: 'Tư Mã Ý',
    // Thục
    liu_bei: 'Lưu Bị', guan_yu: 'Quan Vũ', wei_yan: 'Ngụy Diên', liu_shan: 'Lưu Thiện',
    zhuge_liang: 'Gia Cát Lượng', zhang_fei: 'Trương Phi', zhao_yun: 'Triệu Vân', huang_zhong: 'Hoàng Trung',
    // Ngô
    sun_quan: 'Tôn Quyền', lu_meng: 'Lã Mông', sun_deng: 'Tôn Đăng', lu_xun: 'Lục Tốn', gan_ning: 'Cam Ninh', zhu_ran: 'Chu Nhiên', ling_tong: 'Lăng Thống',
    // bốn hoàng đế xuyên không
    qin_shihuang: 'Tần Thủy Hoàng', li_shimin: 'Lý Thế Dân', liu_che: 'Hán Vũ Đế', zhu_yuanzhang: 'Chu Nguyên Chương',
    // trung lập
    gongsun_kang: 'Công Tôn Khang', yong_kai: 'Ung Khải', shi_xie: 'Sĩ Nhiếp',
  };
  const NO_NAME = 'Vô danh'; // docs/product/events.md: a missing actor is "no_name"
  const api = { NAMES, NO_NAME, name: (id) => (id && NAMES[id]) || NO_NAME };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WorldNames = api;
})(typeof window !== 'undefined' ? window : globalThis);
