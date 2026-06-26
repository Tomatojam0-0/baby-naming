/**
 * 八字排盘与喜用神推断引擎
 * 依赖：lunar-javascript 库
 */
var BaziEngine = (function() {

  // 天干五行
  var GAN_WUXING = {
    "甲":"wood","乙":"wood","丙":"fire","丁":"fire","戊":"earth",
    "己":"earth","庚":"metal","辛":"metal","壬":"water","癸":"water"
  };

  // 地支五行
  var ZHI_WUXING = {
    "子":"water","丑":"earth","寅":"wood","卯":"wood","辰":"earth",
    "巳":"fire","午":"fire","未":"earth","申":"metal","酉":"metal",
    "戌":"earth","亥":"water"
  };

  // 五行中文名
  var WX_CN = {metal:"金",water:"水",wood:"木",fire:"火",earth:"土"};
  var WX_COLOR = {metal:"#888",water:"#3a6ea5",wood:"#6b9a5c",fire:"#c44a3c",earth:"#b8860b"};

  // 五行相生：金生水，水生木，木生火，火生土，土生金
  var SHENG = {metal:"water",water:"wood",wood:"fire",fire:"earth",earth:"metal"};
  // 五行相克：金克木，木克土，土克水，水克火，火克金
  var KE = {metal:"wood",wood:"earth",earth:"water",water:"fire",fire:"metal"};

  /**
   * 排八字
   * @param {Date} date - 出生日期
   * @param {number} gender - 1=男, 0=女
   * @param {number} sect - 1=早子时(23-24归次日), 2=晚子时(23-24归当日)
   */
  function paipan(date, gender, sect) {
    if (!sect) sect = 2;
    var Solar = (typeof require !== 'undefined') ? require('lunar-javascript').Solar : window.Solar;
    var solar = Solar.fromDate(date);
    var lunar = solar.getLunar();
    var bazi = lunar.getEightChar();
    if (sect === 1) bazi.setSect(1);

    var yearGZ = bazi.getYear();   // 丙午
    var monthGZ = bazi.getMonth(); // 乙未
    var dayGZ = bazi.getDay();     // 己丑
    var hourGZ = bazi.getTime();   // 庚午

    var yearGan = bazi.getYearGan();
    var yearZhi = bazi.getYearZhi();
    var monthGan = bazi.getMonthGan();
    var monthZhi = bazi.getMonthZhi();
    var dayGan = bazi.getDayGan();
    var dayZhi = bazi.getDayZhi();
    var hourGan = bazi.getTimeGan();
    var hourZhi = bazi.getTimeZhi();

    // 十神
    var yearSS = bazi.getYearShiShenGan();
    var monthSS = bazi.getMonthShiShenGan();
    var hourSS = bazi.getTimeShiShenGan();

    // 藏干
    var yearHide = bazi.getYearHideGan();
    var monthHide = bazi.getMonthHideGan();
    var dayHide = bazi.getDayHideGan();
    var hourHide = bazi.getTimeHideGan();

    // 纳音
    var yearNY = bazi.getYearNaYin();
    var monthNY = bazi.getMonthNaYin();
    var dayNY = bazi.getDayNaYin();
    var hourNY = bazi.getTimeNaYin();

    // 胎元、命宫、身宫
    var taiYuan = bazi.getTaiYuan();
    var mingGong = bazi.getMingGong();
    var shenGong = bazi.getShenGong();

    // 大运
    var yun = bazi.getYun(gender || 1);
    var startAge = yun.getStartYear();
    var startMonth = yun.getStartMonth();
    var daYun = yun.getDaYun().slice(0, 9).map(function(d) {
      return {
        ganzhi: d.getGanZhi(),
        startAge: d.getStartAge(),
        startYear: d.getStartYear(),
        gan: d.getGanZhi() ? d.getGanZhi()[0] : '',
        zhi: d.getGanZhi() ? d.getGanZhi()[1] : ''
      };
    });

    // 五行统计（天干+地支主气）
    var wxCount = {metal:0, water:0, wood:0, fire:0, earth:0};
    countWX(wxCount, yearGan, yearZhi);
    countWX(wxCount, monthGan, monthZhi);
    countWX(wxCount, dayGan, dayZhi);
    countWX(wxCount, hourGan, hourZhi);

    // 藏干五行统计（辅助）
    var hideWX = {metal:0, water:0, wood:0, fire:0, earth:0};
    [yearHide, monthHide, dayHide, hourHide].forEach(function(hide) {
      hide.forEach(function(g) { if (GAN_WUXING[g]) hideWX[GAN_WUXING[g]]++; });
    });

    // 日主五行
    var dayMasterWX = GAN_WUXING[dayGan];

    // 喜用神推断
    var xiyong = analyzeXiYong(dayMasterWX, wxCount, hideWX, monthZhi);

    return {
      date: date,
      gender: gender,
      solarStr: solar.getYear() + '-' + pad(solar.getMonth()) + '-' + pad(solar.getDay()) + ' ' + pad(solar.getHour()) + ':' + pad(solar.getMinute()),
      lunarStr: lunar.getYearInChinese() + '年' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese() + '日',
      animal: lunar.getYearShengXiao(),
      pillars: {
        year: {gz: yearGZ, gan: yearGan, zhi: yearZhi, ganWX: GAN_WUXING[yearGan], zhiWX: ZHI_WUXING[yearZhi], shishen: yearSS, hide: yearHide, nayin: yearNY},
        month: {gz: monthGZ, gan: monthGan, zhi: monthZhi, ganWX: GAN_WUXING[monthGan], zhiWX: ZHI_WUXING[monthZhi], shishen: monthSS, hide: monthHide, nayin: monthNY},
        day: {gz: dayGZ, gan: dayGan, zhi: dayZhi, ganWX: GAN_WUXING[dayGan], zhiWX: ZHI_WUXING[dayZhi], shishen: '日主', hide: dayHide, nayin: dayNY},
        hour: {gz: hourGZ, gan: hourGan, zhi: hourZhi, ganWX: GAN_WUXING[hourGan], zhiWX: ZHI_WUXING[hourZhi], shishen: hourSS, hide: hourHide, nayin: hourNY}
      },
      dayMaster: dayGan,
      dayMasterWX: dayMasterWX,
      taiYuan: taiYuan,
      mingGong: mingGong,
      shenGong: shenGong,
      wxCount: wxCount,
      hideWX: hideWX,
      xiyong: xiyong,
      daYun: daYun,
      startAge: startAge,
      startMonth: startMonth
    };
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function countWX(map, gan, zhi) {
    if (GAN_WUXING[gan]) map[GAN_WUXING[gan]]++;
    if (ZHI_WUXING[zhi]) map[ZHI_WUXING[zhi]]++;
  }

  /**
   * 喜用神推断（简化版规则引擎）
   * 1. 判断日主强弱
   * 2. 根据强弱确定喜用
   */
  function analyzeXiYong(dayMasterWX, wxCount, hideWX, monthZhi) {
    var monthWX = ZHI_WUXING[monthZhi];
    var total = 8; // 4柱8字

    // 日主力量评估：日主本身 + 同类五行（生我者+同我者）
    var sameWX = dayMasterWX; // 同我
    var shengMeWX = getKeyByValue(SHENG, dayMasterWX); // 生我者
    var myStrength = wxCount[dayMasterWX] + (hideWX[dayMasterWX] * 0.5);
    var shengMeStrength = wxCount[shengMeWX] + (hideWX[shengMeWX] * 0.5);
    var totalStrength = myStrength + shengMeStrength;

    // 生我者+同我者 vs 克我者+我克者+我生者
    var keMeWX = getKeyByValue(KE, dayMasterWX); // 克我者
    var woKeWX = KE[dayMasterWX]; // 我克者
    var woShengWX = SHENG[dayMasterWX]; // 我生者

    var opposingStrength = wxCount[keMeWX] + wxCount[woKeWX] + wxCount[woShengWX];

    var isStrong = totalStrength >= opposingStrength;
    var isVeryStrong = totalStrength >= opposingStrength * 1.5;
    var isVeryWeak = totalStrength <= opposingStrength * 0.6;

    var xi = []; // 喜用神
    var ji = []; // 忌神
    var reason = '';

    if (isVeryStrong) {
      // 身旺：喜克泄耗
      // 我生者（泄秀）、我克者（财星）、克我者（官杀）
      xi.push(woShengWX); // 泄秀
      xi.push(woKeWX);    // 财星
      xi.push(keMeWX);    // 官杀
      ji.push(sameWX);    // 忌同类
      ji.push(shengMeWX); // 忌生我
      reason = '日主偏旺，宜泄秀生财、官杀制身。';
    } else if (isStrong) {
      // 身偏旺：喜泄耗
      xi.push(woShengWX);
      xi.push(woKeWX);
      ji.push(sameWX);
      ji.push(shengMeWX);
      reason = '日主略旺，宜泄秀耗气。';
    } else if (isVeryWeak) {
      // 身弱：喜生扶
      xi.push(shengMeWX); // 印星生我
      xi.push(sameWX);    // 比劫助我
      ji.push(woShengWX); // 忌泄
      ji.push(woKeWX);    // 忌耗
      ji.push(keMeWX);    // 忌克
      reason = '日主偏弱，宜印星生扶、比劫助力。';
    } else {
      // 身弱或中和偏弱：喜生扶
      xi.push(shengMeWX);
      xi.push(sameWX);
      ji.push(woShengWX);
      ji.push(keMeWX);
      reason = '日主中和偏弱，宜生扶助身。';
    }

    // 特殊：调候判断——火过旺或水过旺需要调候
    if (wxCount.fire >= 3 || (wxCount.fire >= 2 && hideWX.fire >= 2)) {
      // 火炎需水调候
      if (xi.indexOf('water') === -1) xi.unshift('water');
      ji.push('fire');
      reason += ' 火炎土燥，急需水调候。';
    }
    if (wxCount.water >= 3 || (wxCount.water >= 2 && hideWX.water >= 2)) {
      if (xi.indexOf('fire') === -1) xi.unshift('fire');
      ji.push('water');
      reason += ' 水寒过重，需火暖局。';
    }

    // 去重
    xi = unique(xi);
    ji = unique(ji);

    // 从喜用中移除忌神
    xi = xi.filter(function(x) { return ji.indexOf(x) === -1; });

    return {
      xi: xi,
      ji: ji,
      isStrong: isStrong,
      isVeryStrong: isVeryStrong,
      isVeryWeak: isVeryWeak,
      dayMasterWX: dayMasterWX,
      shengMeWX: shengMeWX,
      sameWX: sameWX,
      woShengWX: woShengWX,
      woKeWX: woKeWX,
      keMeWX: keMeWX,
      reason: reason,
      strength: isVeryStrong ? '身旺' : (isStrong ? '身偏旺' : (isVeryWeak ? '身弱' : '中和偏弱'))
    };
  }

  function getKeyByValue(obj, val) {
    for (var k in obj) { if (obj[k] === val) return k; }
    return null;
  }

  function unique(arr) {
    return arr.filter(function(v, i) { return arr.indexOf(v) === i; });
  }

  // 五行生克查询
  function getRelation(wx1, wx2) {
    if (wx1 === wx2) return '比和';
    if (SHENG[wx1] === wx2) return '相生';
    if (KE[wx1] === wx2) return '相克';
    if (SHENG[wx2] === wx1) return '被生';
    if (KE[wx2] === wx1) return '被克';
    return '无关';
  }

  return {
    paipan: paipan,
    analyzeXiYong: analyzeXiYong,
    GAN_WUXING: GAN_WUXING,
    ZHI_WUXING: ZHI_WUXING,
    WX_CN: WX_CN,
    WX_COLOR: WX_COLOR,
    SHENG: SHENG,
    KE: KE,
    getRelation: getRelation
  };
})();
