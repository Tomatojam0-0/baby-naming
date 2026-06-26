/**
 * 三才五格数理评分引擎
 * 基于康熙笔画计算天格/人格/地格/外格/总格
 * 81数理吉凶 + 三才配置吉凶
 */
var SangGeEngine = (function() {

  // 81数理吉凶表（1-81）
  // 吉=1, 凶=-1, 半吉=0.5
  var SHULI = {
    1:1, 2:-1, 3:1, 4:-1, 5:1, 6:1, 7:1, 8:1, 9:-1, 10:-1,
    11:1, 12:-1, 13:1, 14:-1, 15:1, 16:1, 17:1, 18:1, 19:-1, 20:-1,
    21:1, 22:-1, 23:1, 24:1, 25:1, 26:0.5, 27:0.5, 28:-1, 29:1, 30:0.5,
    31:1, 32:1, 33:1, 34:-1, 35:0.5, 36:-1, 37:1, 38:0.5, 39:1, 40:0.5,
    41:1, 42:0.5, 43:0.5, 44:-1, 45:1, 46:-1, 47:1, 48:1, 49:-1, 50:0.5,
    51:0.5, 52:1, 53:0.5, 54:-1, 55:0.5, 56:-1, 57:1, 58:0.5, 59:-1, 60:-1,
    61:1, 62:-1, 63:1, 64:-1, 65:1, 66:-1, 67:1, 68:1, 69:-1, 70:-1,
    71:0.5, 72:-1, 73:1, 74:-1, 75:0.5, 76:-1, 77:0.5, 78:-1, 79:-1, 80:0.5,
    81:1
  };

  // 数理含义
  var SHULI_NAME = {
    1:"太极之数", 3:"进取如意", 5:"福禄长寿", 6:"安稳余庆", 7:"刚毅果断",
    8:"意志坚强", 11:"稳健吉顺", 13:"春日牡丹", 15:"福寿双全", 16:"厚重载德",
    17:"排除万难", 18:"有志竟成", 21:"明月光照", 23:"旭日东升", 24:"家门余庆",
    25:"英俊刚毅", 29:"泉舟顺展", 31:"春日花开", 32:"宝马金鞍", 33:"升天之数",
    35:"高楼望月", 37:"猛虎出林", 39:"富贵繁荣", 41:"纯阳独秀", 45:"顺风扬帆",
    47:"点铁成金", 48:"青松志士", 52:"先见之明", 57:"寒雪青松", 58:"晚行遇灯",
    61:"牡丹芙蓉", 63:"万物化育", 65:"富贵至荣", 67:"通达畅明", 68:"兴国利民",
    73:"志高力微", 75:"退后则安", 81:"万物回春"
  };

  // 数理尾数→五行：1,2=木; 3,4=火; 5,6=土; 7,8=金; 9,0=水
  function numToWX(n) {
    var last = n % 10;
    if (last === 1 || last === 2) return 'wood';
    if (last === 3 || last === 4) return 'fire';
    if (last === 5 || last === 6) return 'earth';
    if (last === 7 || last === 8) return 'metal';
    return 'water'; // 9, 0
  }

  // 三才配置吉凶表（天格五行→人格五行→地格五行）
  // 简化判断：相生为吉，相克为凶
  var SHENG = {metal:"water",water:"wood",wood:"fire",fire:"earth",earth:"metal"};
  var KE = {metal:"wood",wood:"earth",earth:"water",water:"fire",fire:"metal"};

  function evalSanCai(tianWX, renWX, diWX) {
    // 天格→人格：相生为吉
    var tr = getWXRelation(tianWX, renWX);
    // 人格→地格：相生为吉
    var rd = getWXRelation(renWX, diWX);
    // 天格→地格
    var td = getWXRelation(tianWX, diWX);

    var score = 0;
    var detail = [];

    if (tr === 'sheng' || tr === 'tong') { score += 1; detail.push('天→人 ' + (tr === 'sheng' ? '相生' : '比和')); }
    else if (tr === 'ke') { score -= 1; detail.push('天→人 相克'); }

    if (rd === 'sheng' || rd === 'tong') { score += 1; detail.push('人→地 ' + (rd === 'sheng' ? '相生' : '比和')); }
    else if (rd === 'ke') { score -= 1; detail.push('人→地 相克'); }

    if (td === 'sheng' || td === 'tong') { score += 0.5; }

    var level = 'bad';
    if (score >= 2) level = 'good';
    else if (score >= 1) level = 'ok';
    else if (score >= 0) level = 'normal';

    return { score: score, level: level, detail: detail.join('，'),
             tianWX: tianWX, renWX: renWX, diWX: diWX };
  }

  function getWXRelation(w1, w2) {
    if (w1 === w2) return 'tong';
    if (SHENG[w1] === w2) return 'sheng';
    if (KE[w1] === w2) return 'ke';
    return 'wuguan';
  }

  /**
   * 计算三才五格
   * @param {string} surname - 姓氏（单字或多字）
   * @param {string[]} nameChars - 名字字符数组
   * @returns 五格数理结果
   */
  function calc(surname, nameChars) {
    var surnameStrokes = surname.split('').map(function(ch) {
      return getKangxiStrokes(ch);
    });
    var nameStrokes = nameChars.map(function(ch) {
      return getKangxiStrokes(ch);
    });

    var surnameSum = surnameStrokes.reduce(function(a,b){return a+b;}, 0);
    var nameSum = nameStrokes.reduce(function(a,b){return a+b;}, 0);

    // 五格计算
    var tianGe, renGe, diGe, waiGe, zongGe;

    if (nameChars.length === 1) {
      // 单名
      tianGe = surnameSum + 1;
      renGe = surnameSum + nameStrokes[0];
      diGe = nameStrokes[0] + 1;
      zongGe = surnameSum + nameSum;
      waiGe = zongGe - renGe + 1;
    } else if (nameChars.length === 2) {
      // 双名
      tianGe = surnameSum + 1;
      renGe = surnameSum + nameStrokes[0];
      diGe = nameStrokes[0] + nameStrokes[1];
      zongGe = surnameSum + nameSum;
      waiGe = nameStrokes[1] + 1;
    } else {
      return null; // 暂不支持3字以上名
    }

    // 取81数理
    tianGe = fix81(tianGe);
    renGe = fix81(renGe);
    diGe = fix81(diGe);
    waiGe = fix81(waiGe);
    zongGe = fix81(zongGe);

    // 三才五行
    var tianWX = numToWX(tianGe);
    var renWX = numToWX(renGe);
    var diWX = numToWX(diGe);

    var sanCai = evalSanCai(tianWX, renWX, diWX);

    // 数理吉凶
    var tianLi = getShuli(tianGe);
    var renLi = getShuli(renGe);
    var diLi = getShuli(diGe);
    var waiLi = getShuli(waiGe);
    var zongLi = getShuli(zongGe);

    // 总评分（人格权重最大）
    var totalScore = 0;
    totalScore += renLi.score * 35; // 人格主运，权重35%
    totalScore += zongLi.score * 30; // 总格后运，权重30%
    totalScore += diLi.score * 20; // 地格前运，权重20%
    totalScore += (tianLi.score + waiLi.score) * 7.5; // 天格+外格各7.5%
    totalScore += sanCai.score * 10; // 三才配置加成

    // 归一化到0-100
    totalScore = Math.round(Math.max(0, Math.min(100, totalScore + 50)));

    return {
      surname: surname,
      nameChars: nameChars,
      surnameStrokes: surnameStrokes,
      nameStrokes: nameStrokes,
      tianGe: { num: tianGe, wx: tianWX, shuli: tianLi },
      renGe: { num: renGe, wx: renWX, shuli: renLi },
      diGe: { num: diGe, wx: diWX, shuli: diLi },
      waiGe: { num: waiGe, wx: numToWX(waiGe), shuli: waiLi },
      zongGe: { num: zongGe, wx: numToWX(zongGe), shuli: zongLi },
      sanCai: sanCai,
      totalScore: totalScore,
      level: totalScore >= 80 ? 'good' : (totalScore >= 60 ? 'ok' : (totalScore >= 40 ? 'normal' : 'bad'))
    };
  }

  function fix81(n) {
    if (n > 81) n = n % 80 + 1;
    if (n < 1) n = 1;
    return n;
  }

  function getShuli(n) {
    var score = SHULI[n] || 0;
    var name = SHULI_NAME[n] || '';
    return {
      num: n,
      score: score,
      luck: score > 0 ? '吉' : (score < 0 ? '凶' : (score === 0.5 ? '半吉' : '平')),
      name: name
    };
  }

  // 从字符库获取康熙笔画
  var _strokeCache = {};
  function getKangxiStrokes(ch) {
    if (_strokeCache[ch]) return _strokeCache[ch];
    if (typeof CHAR_DB !== 'undefined') {
      for (var i = 0; i < CHAR_DB.length; i++) {
        if (CHAR_DB[i].c === ch) {
          _strokeCache[ch] = CHAR_DB[i].s;
          return CHAR_DB[i].s;
        }
      }
    }
    // 默认：尝试用码表估算（不精确，仅兜底）
    _strokeCache[ch] = 10;
    return 10;
  }

  return {
    calc: calc,
    getKangxiStrokes: getKangxiStrokes,
    numToWX: numToWX,
    evalSanCai: evalSanCai,
    SHULI: SHULI,
    SHULI_NAME: SHULI_NAME
  };
})();
