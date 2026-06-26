/**
 * 起名生成与测名评估引擎
 * 依赖：CHAR_DB, BaziEngine, SangGeEngine
 */
var NamingEngine = (function() {

  var WX_CN = {metal:"金",water:"水",wood:"木",fire:"火",earth:"土"};

  // 近年高频网红字/组合（避开用）
  var POPULAR_CHARS = ['梓','涵','轩','浩','宇','然','辰','睿','泽','昊','逸','晨','彤','怡','欣','妍','希','诺','墨','一','子','萱','桐','楠','煜','烨','熙','雨','梦','佳','琪','鑫','源','博','涛','杰','伟','强','芳','敏','丽','娜','静','娟','霞'];

  // 风格标签映射
  var STYLE_TAGS = {
    nature: ['自然','山水','天象','植物','季节','动物'],
    poetry: ['诗经','楚辞','论语','唐诗','宋词','道家','禅意','诗意','典故'],
    simple: ['简约','简洁','纯净'],
    wise: ['智慧','睿智','思辨','通达','明理','才学'],
    neutral: [], // 中性由性别过滤处理
    classical: ['古典','文雅','书香','典故','诗经','楚辞','道家','禅意'],
    modern: ['清新','简约','现代','开阔','明亮'],
    parent: [] // 父母名承接单独处理
  };

  /**
   * 根据八字喜用 + 偏好筛选候选字
   */
  function getCandidateChars(xiyong, preferences) {
    var prefs = preferences || {};
    var xi = xiyong.xi; // 喜用五行数组

    // 分析父母名中的字（如果提供）
    var parentChars = analyzeParentNames(prefs.fatherName, prefs.motherName);

    var candidates = CHAR_DB.filter(function(ch) {
      // 排除姓氏
      if (ch.t && ch.t.indexOf('姓氏') >= 0) return false;
      // 必须是喜用神五行
      if (xi.indexOf(ch.w) === -1) return false;
      // 性别过滤
      if (prefs.gender === 'male' && ch.g === 'female') return false;
      if (prefs.gender === 'female' && ch.g === 'male') return false;
      // 独体字偏好
      if (prefs.preferDuti && !ch.d) return false;
      // 最大笔画限制
      if (prefs.maxStrokes && ch.s > prefs.maxStrokes) return false;
      // 避开网红字
      if (prefs.noPopular && POPULAR_CHARS.indexOf(ch.c) !== -1) return false;
      return true;
    });

    // 父母名承接：父母名字中的喜用字优先
    if (prefs.style && prefs.style.indexOf('parent') !== -1 && parentChars.length > 0) {
      candidates.sort(function(a, b) {
        var aIsParent = parentChars.indexOf(a.c) !== -1 ? 1 : 0;
        var bIsParent = parentChars.indexOf(b.c) !== -1 ? 1 : 0;
        if (aIsParent !== bIsParent) return bIsParent - aIsParent;
        if (a.d && !b.d) return -1;
        if (!a.d && b.d) return 1;
        return a.s - b.s;
      });
    } else {
      // 排序：独体字优先，笔画少优先
      candidates.sort(function(a, b) {
        if (a.d && !b.d) return -1;
        if (!a.d && b.d) return 1;
        return a.s - b.s;
      });
    }

    return candidates;
  }

  /**
   * 分析父母名，返回可用的字（去重，排除姓氏，保留喜用神五行）
   */
  function analyzeParentNames(fatherName, motherName) {
    var chars = [];
    var names = [fatherName || '', motherName || ''];
    names.forEach(function(name) {
      if (!name) return;
      // 去掉第一个字（通常是姓），保留名中的字
      var ming = name.substring(1);
      for (var i = 0; i < ming.length; i++) {
        if (chars.indexOf(ming[i]) === -1) chars.push(ming[i]);
      }
    });
    return chars;
  }

  /**
   * 生成名字
   * @param {string} surname - 姓氏
   * @param {object} xiyong - 喜用神结果
   * @param {object} preferences - 偏好 {gender, preferDuti, maxStrokes, avoidChars, nameLength}
   * @returns 名字候选列表
   */
  function generateNames(surname, xiyong, preferences) {
    var prefs = preferences || {};
    var nameLength = prefs.nameLength || 2; // 默认双字名
    var avoidChars = prefs.avoidChars || '';
    var minScore = prefs.minScore || 50;

    var candidates = getCandidateChars(xiyong, prefs);

    // 过滤避讳字
    candidates = candidates.filter(function(ch) {
      return avoidChars.indexOf(ch.c) === -1;
    });

    var results = [];

    if (nameLength === 1) {
      // 单字名
      candidates.forEach(function(ch) {
        var sangge = SangGeEngine.calc(surname, [ch.c]);
        if (sangge && sangge.totalScore >= minScore) {
          results.push(buildNameResult(surname, [ch], sangge, xiyong, prefs));
        }
      });
    } else {
      // 双字名：组合两个字
      // 限制组合数量，取前40个候选字
      var pool = candidates.slice(0, 50);
      for (var i = 0; i < pool.length; i++) {
        for (var j = 0; j < pool.length; j++) {
          if (i === j) continue;
          var c1 = pool[i], c2 = pool[j];
          // 避免重复字
          if (c1.c === c2.c) continue;
          // 喜用神匹配：两个字至少有一个是第一喜用
          var firstXi = xiyong.xi[0];
          if (c1.w !== firstXi && c2.w !== firstXi) continue;

          var sangge = SangGeEngine.calc(surname, [c1.c, c2.c]);
          if (sangge && sangge.totalScore >= minScore) {
            results.push(buildNameResult(surname, [c1, c2], sangge, xiyong, prefs));
          }
        }
      }
    }

    // 去重（按名字字符串）
    var seen = {};
    results = results.filter(function(r) {
      if (seen[r.fullName]) return false;
      seen[r.fullName] = true;
      return true;
    });

    // 按综合分排序
    results.sort(function(a, b) {
      return b.totalScore - a.totalScore;
    });

    return results;
  }

  function buildNameResult(surname, charObjs, sangge, xiyong, preferences) {
    var nameStr = charObjs.map(function(c) { return c.c; }).join('');
    var fullName = surname + nameStr;
    var pinyin = charObjs.map(function(c) { return c.p; }).join(' ');

    // 五行匹配分析
    var wxMatch = analyzeWXMatch(charObjs, xiyong);

    // 意境评分（基于标签）
    var yijingScore = analyzeYijing(charObjs);

    // 风格偏好评分
    var styleScore = analyzeStyle(charObjs, preferences);

    // 父母名承接评分
    var parentScore = analyzeParentConnection(charObjs, preferences);

    // 综合评分 = 三才五格(55%) + 五行匹配(25%) + 意境(10%) + 风格(5%) + 父母承接(5%)
    var totalScore = Math.round(
      sangge.totalScore * 0.55 +
      wxMatch.score * 100 * 0.25 +
      yijingScore * 0.10 +
      styleScore * 0.05 +
      parentScore * 0.05
    );

    return {
      surname: surname,
      nameChars: charObjs,
      nameStr: nameStr,
      fullName: fullName,
      pinyin: pinyin,
      sangge: sangge,
      wxMatch: wxMatch,
      yijingScore: yijingScore,
      totalScore: Math.max(0, Math.min(100, totalScore)),
      wuxing: charObjs.map(function(c) { return WX_CN[c.w]; }).join('+'),
      meaning: charObjs.map(function(c) { return c.m; }).join('；'),
      tags: collectTags(charObjs)
    };
  }

  function analyzeWXMatch(charObjs, xiyong) {
    var score = 0;
    var xi = xiyong.xi;
    var ji = xiyong.ji;

    charObjs.forEach(function(c) {
      if (xi.indexOf(c.w) !== -1) score += 0.5;
      if (xi[0] === c.w) score += 0.2; // 第一喜用加分
      if (ji.indexOf(c.w) !== -1) score -= 0.3;
    });

    // 金水相生等组合加成
    if (charObjs.length === 2) {
      var w1 = charObjs[0].w, w2 = charObjs[1].w;
      if (BaziEngine.SHENG[w1] === w2 || BaziEngine.SHENG[w2] === w1) {
        score += 0.2;
      }
    }

    score = Math.max(0, Math.min(1, score));
    return {
      score: score,
      level: score >= 0.7 ? 'good' : (score >= 0.4 ? 'ok' : 'normal'),
      desc: charObjs.map(function(c) {
        var isXi = xi.indexOf(c.w) !== -1;
        var isJi = ji.indexOf(c.w) !== -1;
        if (isXi) return c.c + '(' + WX_CN[c.w] + ',喜用)';
        if (isJi) return c.c + '(' + WX_CN[c.w] + ',忌神)';
        return c.c + '(' + WX_CN[c.w] + ')';
      }).join(' ')
    };
  }

  function analyzeYijing(charObjs) {
    var allTags = [];
    charObjs.forEach(function(c) {
      if (c.t) allTags = allTags.concat(c.t);
    });
    // 有意境标签加分
    var yijingTags = ['自然','开阔','简约','诗意','深邃','光明','清澈','宁静','坚韧','文雅','道家','禅意','纯净'];
    var score = 50;
    allTags.forEach(function(t) {
      if (yijingTags.indexOf(t) !== -1) score += 8;
    });
    // 独体字加分
    charObjs.forEach(function(c) {
      if (c.d) score += 5;
    });
    return Math.min(100, score);
  }

  /**
   * 风格偏好评分
   */
  function analyzeStyle(charObjs, preferences) {
    var prefs = preferences || {};
    var style = prefs.style || [];
    if (style.length === 0) return 50;

    var allTags = [];
    charObjs.forEach(function(c) { if (c.t) allTags = allTags.concat(c.t); });

    var score = 40;
    style.forEach(function(s) {
      var tags = STYLE_TAGS[s] || [];
      if (s === 'simple') {
        // 简单大方：独体字+笔画少加分
        charObjs.forEach(function(c) {
          if (c.d) score += 8;
          if (c.s <= 8) score += 4;
        });
      } else if (s === 'neutral') {
        // 中性独立：性别为 neutral 的字加分
        charObjs.forEach(function(c) {
          if (c.g === 'neutral') score += 8;
        });
      } else if (s === 'parent') {
        // 父母名承接在 analyzeParentConnection 中单独计算
      } else {
        tags.forEach(function(tag) {
          if (allTags.indexOf(tag) !== -1) score += 10;
        });
      }
    });
    return Math.min(100, score);
  }

  /**
   * 父母名承接评分
   */
  function analyzeParentConnection(charObjs, preferences) {
    var prefs = preferences || {};
    if (prefs.style.indexOf('parent') === -1) return 50;
    var parentChars = analyzeParentNames(prefs.fatherName, prefs.motherName);
    if (parentChars.length === 0) return 50;

    var score = 40;
    charObjs.forEach(function(c) {
      if (parentChars.indexOf(c.c) !== -1) {
        score += 30; // 直接使用父母名字中的字
      }
    });
    return Math.min(100, score);
  }

  function collectTags(charObjs) {
    var tags = [];
    charObjs.forEach(function(c) {
      if (c.d) tags.push('独体字');
      if (c.t) c.t.forEach(function(t) { if (tags.indexOf(t) === -1) tags.push(t); });
    });
    return tags;
  }

  /**
   * 评估用户给定的名字
   */
  function evaluateName(surname, nameStr, xiyong) {
    var nameChars = nameStr.split('');
    var charObjs = nameChars.map(function(ch) {
      return findChar(ch);
    });

    // 检查是否找到
    var notFound = [];
    charObjs = charObjs.map(function(obj, i) {
      if (!obj) {
        notFound.push(nameChars[i]);
        return { c: nameChars[i], p: '?', w: 'unknown', s: SangGeEngine.getKangxiStrokes(nameChars[i]), d: false, m: '未收录', g: 'neutral', t: [] };
      }
      return obj;
    });

    // 三才五格
    var sangge = SangGeEngine.calc(surname, nameChars);

    // 五行匹配
    var wxMatch = analyzeWXMatch(charObjs, xiyong);

    // 意境评分
    var yijingScore = analyzeYijing(charObjs);

    // 综合评分
    var totalScore = Math.round(
      (sangge ? sangge.totalScore : 50) * 0.6 +
      wxMatch.score * 100 * 0.25 +
      yijingScore * 0.15
    );

    // 生成改进建议
    var suggestions = generateSuggestions(charObjs, sangge, xiyong, surname, nameStr);

    return {
      surname: surname,
      nameStr: nameStr,
      fullName: surname + nameStr,
      charObjs: charObjs,
      sangge: sangge,
      wxMatch: wxMatch,
      yijingScore: yijingScore,
      totalScore: Math.max(0, Math.min(100, totalScore)),
      notFound: notFound,
      suggestions: suggestions,
      wuxing: charObjs.map(function(c) { return WX_CN[c.w] || '?'; }).join('+'),
      meaning: charObjs.map(function(c) { return c.m; }).join('；')
    };
  }

  function generateSuggestions(charObjs, sangge, xiyong, surname, nameStr) {
    var suggestions = [];
    var xi = xiyong.xi;
    var ji = xiyong.ji;

    // 1. 五行匹配建议
    charObjs.forEach(function(c, i) {
      if (ji.indexOf(c.w) !== -1) {
        suggestions.push({
          type: 'warning',
          msg: '「' + c.c + '」五行属' + WX_CN[c.w] + '，为忌神，不利于命局平衡。'
        });
      } else if (xi.indexOf(c.w) !== -1) {
        suggestions.push({
          type: 'good',
          msg: '「' + c.c + '」五行属' + WX_CN[c.w] + '，为喜用神，补益命局。'
        });
      }
    });

    // 2. 三才五格建议
    if (sangge) {
      if (sangge.sanCai.level === 'bad') {
        suggestions.push({
          type: 'warning',
          msg: '三才配置为「' + sangge.sanCai.detail + '」，五行相克，运势受阻。'
        });
      } else if (sangge.sanCai.level === 'good') {
        suggestions.push({
          type: 'good',
          msg: '三才配置为「' + sangge.sanCai.detail + '」，五行相生，运势顺遂。'
        });
      }

      if (sangge.zongGe.shuli.score < 0) {
        suggestions.push({
          type: 'warning',
          msg: '总格' + sangge.zongGe.num + '（' + sangge.zongGe.shuli.luck + '）主中晚年运，此数不吉。'
        });
      }
      if (sangge.renGe.shuli.score < 0) {
        suggestions.push({
          type: 'warning',
          msg: '人格' + sangge.renGe.num + '（' + sangge.renGe.shuli.luck + '）主性格主运，此数不吉。'
        });
      }
    }

    // 3. 替代建议：如果某个字不好，推荐同位置更好的字
    if (suggestions.filter(function(s) { return s.type === 'warning'; }).length > 0) {
      var altNames = generateAltNames(surname, charObjs, xiyong);
      if (altNames.length > 0) {
        suggestions.push({
          type: 'suggestion',
          msg: '推荐替代名字：',
          alternatives: altNames
        });
      }
    }

    return suggestions;
  }

  function generateAltNames(surname, originalChars, xiyong) {
    var xi = xiyong.xi;
    var alts = [];

    // 对每个位置，尝试替换为喜用神的字
    for (var pos = 0; pos < originalChars.length; pos++) {
      var origChar = originalChars[pos];
      // 如果当前字不是喜用神，找替代
      if (xi.indexOf(origChar.w) === -1 || xiyong.ji.indexOf(origChar.w) !== -1) {
        // 找同位置喜用神的字
        var replacements = CHAR_DB.filter(function(ch) {
          return xi.indexOf(ch.w) !== -1 &&
                 ch.t.indexOf('姓氏') === -1 &&
                 ch.c !== origChar.c &&
                 (ch.d || origChar.s > 8); // 优先独体字
        }).sort(function(a, b) {
          if (a.d && !b.d) return -1;
          if (!a.d && b.d) return 1;
          return a.s - b.s;
        }).slice(0, 5);

        replacements.forEach(function(rep) {
          var newChars = originalChars.slice();
          newChars[pos] = rep;
          var newNameStr = newChars.map(function(c) { return c.c; }).join('');
          var sg = SangGeEngine.calc(surname, newChars.map(function(c) { return c.c; }));
          if (sg && sg.totalScore >= 65) {
            alts.push({
              name: surname + newNameStr,
              charObjs: newChars,
              sangge: sg,
              wuxing: newChars.map(function(c) { return WX_CN[c.w]; }).join('+'),
              score: sg.totalScore
            });
          }
        });
      }
    }

    // 去重并取前5个
    var seen = {};
    alts = alts.filter(function(a) {
      if (seen[a.name]) return false;
      seen[a.name] = true;
      return true;
    }).sort(function(a, b) { return b.score - a.score; }).slice(0, 5);

    return alts;
  }

  function findChar(ch) {
    for (var i = 0; i < CHAR_DB.length; i++) {
      if (CHAR_DB[i].c === ch) return CHAR_DB[i];
    }
    return null;
  }

  return {
    generateNames: generateNames,
    evaluateName: evaluateName,
    getCandidateChars: getCandidateChars,
    findChar: findChar,
    WX_CN: WX_CN
  };
})();
